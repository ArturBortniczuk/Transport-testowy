// src/app/api/spedycje/complete/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  const session = await db('sessions')
    .where('token', authToken)
    .whereRaw('expires_at > NOW()')
    .select('user_id')
    .first();
  
  return session?.user_id;
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
    
    // Sprawdzamy czy użytkownik ma uprawnienia
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name', 'permissions', 'is_admin')
      .first();
    
    // Sprawdź uprawnienia użytkownika
    let permissions = {};
    let isAdmin = false;
    
    // Sprawdź czy użytkownik jest adminem
    if (user) {
      isAdmin = user.is_admin === true || 
                user.is_admin === 1 || 
                user.is_admin === 't' || 
                user.is_admin === 'TRUE' ||
                user.is_admin === 'true' ||
                user.role === 'admin';
      
      // Próba parsowania uprawnień jeśli są w formie stringa
      try {
        if (user.permissions && typeof user.permissions === 'string') {
          permissions = JSON.parse(user.permissions);
        } else if (user.permissions) {
          permissions = user.permissions;
        }
      } catch (e) {
        console.error('Błąd parsowania uprawnień:', e);
      }
    }
    
    // Sprawdź czy użytkownik ma uprawnienie do oznaczania jako zrealizowane
    const canMarkAsCompleted = isAdmin || permissions?.transport?.markAsCompleted === true;
    
    if (!canMarkAsCompleted) {
      console.log('Brak uprawnień do oznaczania jako zrealizowane:', { 
        userId,
        isAdmin,
        permissions
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do oznaczania zleceń jako zrealizowane' 
      }, { status: 403 });
    }
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie podano ID zlecenia' 
      }, { status: 400 });
    }
    
    // Pobierz bieżące dane zlecenia, aby zachować istniejącą odpowiedź
    const currentSpedycja = await db('spedycje')
      .where('id', id)
      .first();
    
    if (!currentSpedycja) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono zlecenia spedycji o podanym ID' 
      }, { status: 404 });
    }
    
    // Przygotuj dane odpowiedzi
    let responseData = {
      completedManually: true,
      completedBy: user.name || userId,
      completedAt: new Date().toISOString()
    };
    
    // Jeśli zlecenie już ma odpowiedź, zachowaj jej dane
    if (currentSpedycja.response_data) {
      try {
        const existingResponseData = JSON.parse(currentSpedycja.response_data);
        // Zachowaj istniejące dane i dodaj informacje o ręcznym zakończeniu
        responseData = {
          ...existingResponseData,
          completedManually: true,
          completedBy: user.name || userId,
          completedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error parsing existing response data:', error);
        // Jeśli wystąpi błąd podczas parsowania, użyjemy domyślnych danych
      }
    }
    
    console.log('Aktualizacja zlecenia z ID:', id);
    console.log('Dane odpowiedzi do zapisania:', responseData);
    
    // Aktualizujemy rekord w bazie
    const updated = await db('spedycje')
      .where('id', id)
      .update({
        status: 'completed',
        response_data: JSON.stringify(responseData),
        completed_at: db.fn.now(),
        completed_by: userId
      });
    
    // Jeśli to transport łączony, musimy również utworzyć osobne rekordy w archiwum dla każdego z połączonych transportów
    if (currentSpedycja.is_merged && currentSpedycja.merged_transports) {
      try {
        const mergedData = JSON.parse(currentSpedycja.merged_transports);
        console.log('Transport łączony - tworzenie rekordów archiwum dla połączonych transportów:', mergedData);
        
        // Utwórz osobne rekordy archiwalne dla każdego z połączonych transportów
        if (mergedData.originalTransports && Array.isArray(mergedData.originalTransports)) {
          for (const originalTransport of mergedData.originalTransports) {
            // Przygotuj dane dla rekordu archiwalnego
            const archiveData = {
              status: 'completed',
              order_number: originalTransport.orderNumber,
              created_by: currentSpedycja.created_by,
              created_by_email: currentSpedycja.created_by_email,
              responsible_person: originalTransport.responsiblePerson || currentSpedycja.responsible_person,
              mpk: originalTransport.mpk,
              location: originalTransport.location,
              location_data: originalTransport.location_data,
              delivery_data: originalTransport.delivery_data,
              loading_contact: originalTransport.loading_contact,
              unloading_contact: originalTransport.unloading_contact,
              delivery_date: originalTransport.delivery_date,
              documents: originalTransport.documents,
              notes: originalTransport.notes,
              client_name: originalTransport.client_name,
              goods_description: originalTransport.goods_description,
              responsible_constructions: originalTransport.responsible_constructions,
              distance_km: originalTransport.distance || 0,
              // Dane o cenie i odpowiedzi - używamy podzielonej ceny
              response_data: JSON.stringify({
                ...responseData,
                deliveryPrice: originalTransport.costAssigned,
                originalMainTransportId: id,
                isFromMergedTransport: true,
                mergedTransportDate: new Date().toISOString()
              }),
              completed_at: db.fn.now(),
              completed_by: userId,
              created_at: currentSpedycja.created_at,
              // Oznacz jako pochodzący z łączonego transportu
              is_merged: false, // To jest pojedynczy rekord z łączonego transportu
              transport_type: currentSpedycja.transport_type,
              vehicle_type: currentSpedycja.vehicle_type
            };
            
            console.log('Tworzenie rekordu archiwum dla transportu:', originalTransport.id, archiveData);
            
            // Wstaw rekord do archiwum
            await db('spedycje').insert(archiveData);
          }
          
          console.log(`Utworzono ${mergedData.originalTransports.length} rekordów archiwum dla połączonych transportów`);
        }
      } catch (error) {
        console.error('Błąd tworzenia rekordów archiwum dla połączonych transportów:', error);
        // Nie przerywamy procesu - główny transport został już zakończony
      }
    }
    
    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie udało się zaktualizować zlecenia spedycji' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Zlecenie zostało pomyślnie oznaczone jako zrealizowane'
    });
  } catch (error) {
    console.error('Error completing spedycja:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
