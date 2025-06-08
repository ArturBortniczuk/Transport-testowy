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

export async function POST(request) {
  try {
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Sprawdzamy czy użytkownik ma uprawnienia administracyjne
    const user = await db('users')
      .where('email', userId)
      .select('role', 'permissions', 'is_admin', 'name')
      .first();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Użytkownik nie znaleziony' 
      }, { status: 404 });
    }
    
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień administratora do rozłączania transportów' 
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { transportId } = body;
    
    if (!transportId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie podano ID transportu do rozłączenia' 
      }, { status: 400 });
    }
    
    console.log('Rozpoczynam rozłączanie transportu ID:', transportId);
    
    // Pobierz transport z danymi o merge
    const mergedTransport = await db('spedycje').where('id', transportId).first();
    
    if (!mergedTransport) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono transportu o podanym ID' 
      }, { status: 404 });
    }
    
    if (!mergedTransport.merged_transports) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie jest połączony z innymi transportami' 
      }, { status: 400 });
    }
    
    let mergedData;
    try {
      mergedData = JSON.parse(mergedTransport.merged_transports);
    } catch (error) {
      console.error('Błąd parsowania danych merged_transports:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowe dane połączonych transportów' 
      }, { status: 400 });
    }
    
    if (!mergedData.originalTransports || mergedData.originalTransports.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak danych o oryginalnych transportach do przywrócenia' 
      }, { status: 400 });
    }
    
    console.log('Przywracam transporty:', mergedData.originalTransports.map(t => ({ id: t.id, orderNumber: t.orderNumber })));
    
    // Generowanie nowych numerów zamówień dla przywracanych transportów
    const generateNewOrderNumber = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
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
    };
    
    await db.transaction(async (trx) => {
      const restoredTransports = [];
      
      // Przywróć oryginalne transporty
      for (const originalTransport of mergedData.originalTransports) {
        const newOrderNumber = await generateNewOrderNumber();
        
        const restoredTransportData = {
          // Przywróć wszystkie oryginalne dane
          order_number: newOrderNumber, // Nowy numer zamówienia
          status: 'new', // Przywróć jako nowe
          created_by: originalTransport.createdBy || mergedTransport.created_by,
          created_by_email: originalTransport.createdByEmail || mergedTransport.created_by_email,
          responsible_person: originalTransport.responsiblePerson,
          responsible_email: originalTransport.responsibleEmail || mergedTransport.responsible_email,
          mpk: originalTransport.mpk,
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
          created_at: db.fn.now(),
          response_data: null, // Usuń odpowiedź
          completed_at: null,
          completed_by: null,
          merged_transports: null // Usuń dane o połączeniu
        };
        
        console.log('Przywracam transport:', { 
          originalId: originalTransport.id, 
          newOrderNumber,
          mpk: originalTransport.mpk 
        });
        
        const [newId] = await trx('spedycje').insert(restoredTransportData).returning('id');
        
        restoredTransports.push({
          originalId: originalTransport.id,
          newId: newId,
          orderNumber: newOrderNumber,
          mpk: originalTransport.mpk
        });
      }
      
      // Zaktualizuj główny transport - usuń dane merge i zaktualizuj odpowiedź
      let originalResponseData = {};
      
      try {
        if (mergedTransport.response_data) {
          originalResponseData = JSON.parse(mergedTransport.response_data);
        }
      } catch (error) {
        console.error('Błąd parsowania response_data:', error);
      }
      
      const updatedResponseData = {
        ...originalResponseData,
        isMerged: false,
        unmergedAt: new Date().toISOString(),
        unmergedBy: user.name,
        // Przywróć oryginalną cenę głównego transportu
        deliveryPrice: mergedData.mainTransportCost || originalResponseData.deliveryPrice,
        // Przywróć oryginalną odległość głównego transportu (jeśli dostępna)
        distanceKm: originalResponseData.costBreakdown?.mainTransport?.distance || mergedTransport.distance_km
      };
      
      await trx('spedycje').where('id', transportId).update({
        merged_transports: null,
        response_data: JSON.stringify(updatedResponseData),
        // Przywróć oryginalną odległość głównego transportu
        distance_km: originalResponseData.costBreakdown?.mainTransport?.distance || mergedTransport.distance_km,
        // Dodaj notatkę o rozłączeniu
        notes: (mergedTransport.notes || '') + 
               `\n\n[ROZŁĄCZONO]: Rozłączono ${mergedData.originalTransports.length} transportów. ` +
               `Wykonano przez ${user.name} w dniu ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL')}.`
      });
      
      console.log('Rozłączanie zakończone pomyślnie');
      console.log('Przywrócone transporty:', restoredTransports);
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Pomyślnie rozłączono transport. Przywrócono ${mergedData.originalTransports.length} transportów jako nowe zlecenia.`,
      restoredCount: mergedData.originalTransports.length
    });
  } catch (error) {
    console.error('Error unmerging transports:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Wystąpił błąd podczas rozłączania transportów'
    }, { status: 500 });
  }
}
