// src/app/api/spedycje/unmerge/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  try {
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first();
    
    return session?.user_id;
  } catch (error) {
    console.error('Błąd weryfikacji sesji:', error);
    return null;
  }
};

// POPRAWIONA FUNKCJA: Generowanie sekwencyjnych numerów zamówień dla rozdzielanych transportów
const generateOrderNumbersForUnmerge = async (count) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  try {
    // Pobierz ostatni numer zamówienia z tego miesiąca i roku
    const lastOrderQuery = await db('spedycje')
      .whereRaw('EXTRACT(MONTH FROM created_at) = ?', [month])
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .orderBy('id', 'desc')
      .first();
    
    let startOrderNumber = 1;
    if (lastOrderQuery && lastOrderQuery.order_number) {
      const lastOrderMatch = lastOrderQuery.order_number.match(/^(\d+)\/\d+\/\d+$/);
      if (lastOrderMatch) {
        startOrderNumber = parseInt(lastOrderMatch[1], 10) + 1;
      }
    }
    
    // Generuj tablicę numerów - każdy kolejny o 1 większy
    const orderNumbers = [];
    for (let i = 0; i < count; i++) {
      const orderNumber = startOrderNumber + i;
      const formattedNumber = `${orderNumber.toString().padStart(4, '0')}/${month}/${year}`;
      orderNumbers.push(formattedNumber);
    }
    
    return orderNumbers;
  } catch (error) {
    console.error('Błąd generowania numerów zamówień:', error);
    // Fallback - użyj timestamp z incremental
    const baseTimestamp = Date.now();
    const orderNumbers = [];
    for (let i = 0; i < count; i++) {
      orderNumbers.push(`${baseTimestamp + i}/${month}/${year}`);
    }
    return orderNumbers;
  }
};

export async function POST(request) {
  try {
    console.log('=== ROZPOCZYNAM ROZŁĄCZANIE TRANSPORTÓW ===');
    
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      console.log('Brak autoryzacji');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    console.log('Użytkownik autoryzowany:', userId);
    
    // Sprawdzamy czy użytkownik ma uprawnienia administracyjne
    const user = await db('users')
      .where('email', userId)
      .select('role', 'permissions', 'is_admin', 'name')
      .first();
    
    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return NextResponse.json({ 
        success: false, 
        error: 'Użytkownik nie znaleziony' 
      }, { status: 404 });
    }
    
    console.log('Dane użytkownika:', user);
    
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
    
    if (!isAdmin) {
      console.log('Brak uprawnień administratora');
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień administratora do rozłączania transportów' 
      }, { status: 403 });
    }
    
    // Pobierz dane z żądania
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Błąd parsowania JSON z żądania:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowe dane żądania' 
      }, { status: 400 });
    }
    
    const { transportId } = body;
    console.log('ID transportu do rozłączenia:', transportId);
    
    if (!transportId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie podano ID transportu do rozłączenia' 
      }, { status: 400 });
    }
    
    // Pobierz transport z danymi o merge
    const mergedTransport = await db('spedycje').where('id', transportId).first();
    
    if (!mergedTransport) {
      console.log('Transport nie znaleziony:', transportId);
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono transportu o podanym ID' 
      }, { status: 404 });
    }
    
    console.log('Znaleziono transport:', mergedTransport.order_number);
    
    if (!mergedTransport.merged_transports) {
      console.log('Transport nie jest połączony');
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie jest połączony z innymi transportami' 
      }, { status: 400 });
    }
    
    let mergedData;
    try {
      mergedData = typeof mergedTransport.merged_transports === 'string' 
        ? JSON.parse(mergedTransport.merged_transports) 
        : mergedTransport.merged_transports;
      console.log('Dane połączonych transportów:', mergedData);
    } catch (error) {
      console.error('Błąd parsowania danych merged_transports:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowe dane połączonych transportów' 
      }, { status: 400 });
    }
    
    if (!mergedData.originalTransports || mergedData.originalTransports.length === 0) {
      console.log('Brak oryginalnych transportów do przywrócenia');
      return NextResponse.json({ 
        success: false, 
        error: 'Brak danych o oryginalnych transportach do przywrócenia' 
      }, { status: 400 });
    }
    
    console.log('Liczba transportów do przywrócenia:', mergedData.originalTransports.length);
    
    // POPRAWKA: Wygeneruj wszystkie numery zamówień naraz
    const orderNumbers = await generateOrderNumbersForUnmerge(mergedData.originalTransports.length);
    console.log('Wygenerowane numery zamówień:', orderNumbers);
    
    // GŁÓWNA OPERACJA ROZŁĄCZANIA W TRANSAKCJI
    try {
      await db.transaction(async (trx) => {
        console.log('=== ROZPOCZYNAM TRANSAKCJĘ ROZŁĄCZANIA ===');
        
        const restoredTransports = [];
        
        // Przywróć oryginalne transporty - JEDEN PO DRUGIM z unikalnym numerem
        for (let i = 0; i < mergedData.originalTransports.length; i++) {
          const originalTransport = mergedData.originalTransports[i];
          const newOrderNumber = orderNumbers[i]; // Każdy transport dostaje unikalny numer
          
          console.log(`Przywracam transport ${i + 1}/${mergedData.originalTransports.length}:`, originalTransport.id, 'z numerem:', newOrderNumber);
          
          const restoredTransportData = {
            order_number: newOrderNumber,
            status: 'new',
            created_by: originalTransport.createdBy || mergedTransport.created_by,
            created_by_email: originalTransport.createdByEmail || mergedTransport.created_by_email,
            responsible_person: originalTransport.responsiblePerson,
            responsible_email: originalTransport.responsibleEmail || mergedTransport.responsible_email,
            mpk: originalTransport.mpk || '',
            location: originalTransport.location,
            location_data: originalTransport.location_data,
            delivery_data: originalTransport.delivery_data,
            loading_contact: originalTransport.loading_contact,
            unloading_contact: originalTransport.unloading_contact,
            delivery_date: originalTransport.delivery_date,
            documents: originalTransport.documents,
            notes: (originalTransport.notes || '') + 
                  `\n\n[ROZŁĄCZONO]: Transport był wcześniej połączony z ${mergedTransport.order_number}. ` +
                  `Rozłączono przez ${user.name} w dniu ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL')}.`,
            distance_km: originalTransport.distance_km || 0,
            client_name: originalTransport.clientName || '',
            goods_description: originalTransport.goods_description,
            responsible_constructions: originalTransport.responsible_constructions,
            created_at: db.fn.now(),
            merged_transports: null
          };
          
          console.log('Dane przywracanego transportu:', restoredTransportData);
          
          try {
            // Wstaw przywrócony transport do bazy
            const [insertedId] = await trx('spedycje')
              .insert(restoredTransportData)
              .returning('id');
            
            restoredTransports.push({
              id: insertedId,
              orderNumber: newOrderNumber,
              originalId: originalTransport.id
            });
            
            console.log('Przywrócono transport z ID:', insertedId, 'i numerem zamówienia:', newOrderNumber);
          } catch (insertError) {
            console.error('Błąd wstawiania transportu:', insertError);
            throw insertError;
          }
        }
        
        // Zaktualizuj główny transport - zamiast usuwania, oznacz jako rozłączony
        try {
          await trx('spedycje')
            .where('id', transportId)
            .update({
              status: 'unmerged',
              notes: (mergedTransport.notes || '') + 
                     `\n\n[ROZŁĄCZONO]: Transport został rozłączony na ${mergedData.originalTransports.length} osobnych zleceń. ` +
                     `Wykonano przez ${user.name} w dniu ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL')}.`,
              merged_transports: null
            });
          
          console.log('Zaktualizowano główny transport - oznaczono jako rozłączony');
          
        } catch (updateError) {
          console.error('Błąd aktualizacji głównego transportu:', updateError);
          throw updateError;
        }
        
        console.log('=== TRANSAKCJA ZAKOŃCZONA POMYŚLNIE ===');
        console.log('Przywrócone transporty:', restoredTransports);
      });
      
      return NextResponse.json({ 
        success: true,
        message: `Pomyślnie rozłączono transport. Przywrócono ${mergedData.originalTransports.length} transportów jako nowe zlecenia z numerami: ${orderNumbers.join(', ')}.`,
        restoredCount: mergedData.originalTransports.length,
        orderNumbers: orderNumbers
      });
      
    } catch (transactionError) {
      console.error('Błąd w transakcji rozłączania:', transactionError);
      return NextResponse.json({ 
        success: false, 
        error: `Błąd podczas rozłączania transportów: ${transactionError.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('=== OGÓLNY BŁĄD ROZŁĄCZANIA ===', error);
    return NextResponse.json({ 
      success: false, 
      error: `Wystąpił błąd podczas rozłączania transportów: ${error.message}`
    }, { status: 500 });
  }
}
