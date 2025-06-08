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

// Funkcja do generowania nowego numeru zamówienia - PRZENOSZONA NA ZEWNĄTRZ
const generateNewOrderNumber = async () => {
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
    
    let orderNumber = 1;
    if (lastOrderQuery && lastOrderQuery.order_number) {
      const lastOrderMatch = lastOrderQuery.order_number.match(/^(\d+)\/\d+\/\d+$/);
      if (lastOrderMatch) {
        orderNumber = parseInt(lastOrderMatch[1], 10) + 1;
      }
    }
    
    return `${orderNumber.toString().padStart(4, '0')}/${month}/${year}`;
  } catch (error) {
    console.error('Błąd generowania numeru zamówienia:', error);
    // Fallback - użyj timestamp
    return `${Date.now()}/${month}/${year}`;
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
      mergedData = JSON.parse(mergedTransport.merged_transports);
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
    
    // GŁÓWNA OPERACJA ROZŁĄCZANIA W TRANSAKCJI
    try {
      await db.transaction(async (trx) => {
        console.log('=== ROZPOCZYNAM TRANSAKCJĘ ROZŁĄCZANIA ===');
        
        const restoredTransports = [];
        
        // Przywróć oryginalne transporty - JEDEN PO DRUGIM
        for (let i = 0; i < mergedData.originalTransports.length; i++) {
          const originalTransport = mergedData.originalTransports[i];
          console.log(`Przywracam transport ${i + 1}/${mergedData.originalTransports.length}:`, originalTransport.id);
          
          try {
            // Generuj nowy numer zamówienia
            const newOrderNumber = await generateNewOrderNumber();
            console.log('Wygenerowany numer zamówienia:', newOrderNumber);
            
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
              distance_km: originalTransport.distance || 0,
              client_name: originalTransport.client_name,
              goods_description: originalTransport.goods_description,
              responsible_constructions: originalTransport.responsible_constructions,
              created_at: trx.fn.now(),
              response_data: null,
              completed_at: null,
              completed_by: null,
              merged_transports: null
            };
            
            console.log('Dane do wstawienia:', {
              order_number: restoredTransportData.order_number,
              mpk: restoredTransportData.mpk,
              location: restoredTransportData.location
            });
            
            // Wstaw transport
            const [newId] = await trx('spedycje').insert(restoredTransportData).returning('id');
            console.log('Utworzono transport z ID:', newId);
            
            restoredTransports.push({
              originalId: originalTransport.id,
              newId: newId,
              orderNumber: newOrderNumber,
              mpk: originalTransport.mpk
            });
            
          } catch (transportError) {
            console.error(`Błąd przywracania transportu ${i + 1}:`, transportError);
            throw transportError; // Przerwij transakcję
          }
        }
        
        console.log('Przywrócone transporty:', restoredTransports);
        
        // Zaktualizuj główny transport
        try {
          let originalResponseData = {};
          
          if (mergedTransport.response_data) {
            try {
              originalResponseData = JSON.parse(mergedTransport.response_data);
            } catch (parseError) {
              console.error('Błąd parsowania response_data:', parseError);
            }
          }
          
          const updatedResponseData = {
            ...originalResponseData,
            isMerged: false,
            unmergedAt: new Date().toISOString(),
            unmergedBy: user.name,
            deliveryPrice: mergedData.mainTransportCost || originalResponseData.deliveryPrice,
            distanceKm: originalResponseData.costBreakdown?.mainTransport?.distance || mergedTransport.distance_km
          };
          
          await trx('spedycje').where('id', transportId).update({
            merged_transports: null,
            response_data: JSON.stringify(updatedResponseData),
            distance_km: originalResponseData.costBreakdown?.mainTransport?.distance || mergedTransport.distance_km,
            notes: (mergedTransport.notes || '') + 
                   `\n\n[ROZŁĄCZONO]: Rozłączono ${mergedData.originalTransports.length} transportów. ` +
                   `Wykonano przez ${user.name} w dniu ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL')}.`
          });
          
          console.log('Zaktualizowano główny transport');
          
        } catch (updateError) {
          console.error('Błąd aktualizacji głównego transportu:', updateError);
          throw updateError;
        }
        
        console.log('=== TRANSAKCJA ZAKOŃCZONA POMYŚLNIE ===');
      });
      
      return NextResponse.json({ 
        success: true,
        message: `Pomyślnie rozłączono transport. Przywrócono ${mergedData.originalTransports.length} transportów jako nowe zlecenia.`,
        restoredCount: mergedData.originalTransports.length
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
