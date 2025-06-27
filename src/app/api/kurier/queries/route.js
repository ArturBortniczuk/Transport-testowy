// src/app/api/kurier/queries/route.js
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

// Funkcja sprawdzająca uprawnienia do zapytań kurierskich
const checkKurierQueryPermissions = async (userId) => {
  const user = await db('users')
    .where('email', userId)
    .select('role', 'permissions')
    .first();

  if (!user) return { canAdd: false, canApprove: false, canViewAll: false };

  let permissions = {};
  try {
    if (user.permissions) {
      permissions = JSON.parse(user.permissions);
    }
  } catch (error) {
    console.error('Błąd parsowania uprawnień:', error);
  }

  const isAdmin = user.role === 'admin';
  const kurierPerms = permissions.kurier?.queries || {};

  return {
    canAdd: isAdmin || kurierPerms.add !== false, // Domyślnie każdy może dodawać
    canApprove: isAdmin || kurierPerms.approve === true,
    canViewAll: isAdmin || kurierPerms.viewAll === true,
    canView: isAdmin || kurierPerms.view !== false // Domyślnie każdy może przeglądać swoje
  };
};

// GET - Pobierz zapytania kurierskie
export async function GET(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    
    if (!permissions.canView) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do przeglądania zapytań' 
      }, { status: 403 });
    }

    // Sprawdź parametry URL
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';
    const typeFilter = searchParams.get('type');

    let query = db('kurier_queries');

    // Jeśli nie ma uprawnień do przeglądania wszystkich, pokaż tylko swoje
    if (!permissions.canViewAll) {
      query = query.where('created_by_email', userId);
    }

    // Filtrowanie według statusu
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        query = query.where('status', 'new');
      } else if (statusFilter === 'processed') {
        query = query.whereIn('status', ['approved', 'rejected']);
      } else {
        query = query.where('status', statusFilter);
      }
    }

    // Filtrowanie według typu
    if (typeFilter && typeFilter !== 'all') {
      query = query.where('query_type', typeFilter);
    }

    // Pobierz zapytania, sortowane od najnowszych
    const queries = await query.orderBy('created_at', 'desc');

    return NextResponse.json({ 
      success: true, 
      queries: queries || [],
      permissions: permissions
    });
  } catch (error) {
    console.error('Error fetching kurier queries:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Dodaj nowe zapytanie kurierskie
export async function POST(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    
    if (!permissions.canAdd) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do dodawania zapytań' 
      }, { status: 403 });
    }

    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('name')
      .first();

    const queryData = await request.json();
    console.log('Otrzymane dane zapytania kurierskiego:', queryData);

    // Przygotuj dane do zapisania
    const dataToSave = {
      status: 'new',
      created_by_email: userId,
      created_by_name: user?.name || userId,
      
      // Podstawowe dane
      query_type: queryData.queryType,
      priority: queryData.priority || 'normal',
      description: queryData.description,
      
      // Lokalizacja
      address: queryData.address,
      city: queryData.city,
      postal_code: queryData.postalCode,
      contact_person: queryData.contactPerson,
      contact_phone: queryData.contactPhone,
      contact_email: queryData.contactEmail,
      
      // Szczegóły przesyłki
      package_type: queryData.packageType,
      weight: queryData.weight ? parseFloat(queryData.weight) : null,
      dimensions: queryData.dimensions,
      quantity: queryData.quantity ? parseInt(queryData.quantity) : 1,
      content_description: queryData.contentDescription,
      
      // Preferencje czasowe
      preferred_date: queryData.preferredDate,
      preferred_time: queryData.preferredTime,
      is_urgent: queryData.isUrgent || false,
      
      // Dane finansowe
      payment_method: queryData.paymentMethod,
      estimated_cost: queryData.estimatedCost ? parseFloat(queryData.estimatedCost) : null,
      cost_notes: queryData.costNotes,
      
      // Dodatkowe informacje
      special_instructions: queryData.specialInstructions,
      
      created_at: db.fn.now()
    };

    console.log('Dane zapytania do zapisania:', dataToSave);

    // Zapisz do bazy danych
    const [id] = await db('kurier_queries').insert(dataToSave).returning('id');

    return NextResponse.json({ 
      success: true, 
      id: id,
      message: 'Zapytanie kurierskie zostało dodane i oczekuje na akceptację'
    });
  } catch (error) {
    console.error('Error adding kurier query:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT - Aktualizuj zapytanie (akceptuj/odrzuć)
export async function PUT(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    const updateData = await request.json();

    // Sprawdź czy próbuje akceptować/odrzucić zapytanie
    if (updateData.action === 'approve' || updateData.action === 'reject') {
      if (!permissions.canApprove) {
        return NextResponse.json({ 
          success: false, 
          error: 'Brak uprawnień do akceptowania zapytań' 
        }, { status: 403 });
      }

      const queryId = updateData.queryId;
      const newStatus = updateData.action === 'approve' ? 'approved' : 'rejected';
      
      // Pobierz istniejące zapytanie
      const existingQuery = await db('kurier_queries')
        .where('id', queryId)
        .first();

      if (!existingQuery) {
        return NextResponse.json({ 
          success: false, 
          error: 'Zapytanie nie znalezione' 
        }, { status: 404 });
      }

      if (existingQuery.status !== 'new') {
        return NextResponse.json({ 
          success: false, 
          error: 'Zapytanie zostało już przetworzone' 
        }, { status: 400 });
      }

      // Aktualizuj status
      const updated = await db('kurier_queries')
        .where('id', queryId)
        .update({
          status: newStatus,
          processed_by: userId,
          processed_at: db.fn.now(),
          processing_notes: updateData.notes || '',
          internal_notes: updateData.internalNotes || '',
          updated_at: db.fn.now()
        });

      if (updated === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Nie udało się zaktualizować zapytania' 
        }, { status: 500 });
      }

      // Jeśli zaakceptowano i ma być automatycznie wysłane do DHL
      if (newStatus === 'approved' && updateData.autoCreateShipment) {
        try {
          // Konwertuj zapytanie na zamówienie DHL
          const shipmentResult = await convertQueryToShipment(queryId, userId);
          
          if (shipmentResult.success) {
            // Zapisz dane DHL w zapytaniu
            await db('kurier_queries')
              .where('id', queryId)
              .update({
                dhl_data: JSON.stringify(shipmentResult.dhlData),
                updated_at: db.fn.now()
              });
          }
        } catch (dhlError) {
          console.error('Błąd automatycznego tworzenia przesyłki DHL:', dhlError);
          // Nie przerywaj procesu - zapytanie zostało zaakceptowane
        }
      }

      return NextResponse.json({ 
        success: true,
        message: newStatus === 'approved' 
          ? 'Zapytanie zostało zaakceptowane' 
          : 'Zapytanie zostało odrzucone',
        status: newStatus
      });
    }

    // Inne aktualizacje (edycja przez właściciela)
    const queryId = updateData.queryId;
    
    // Sprawdź czy użytkownik może edytować to zapytanie
    const query = await db('kurier_queries')
      .where('id', queryId)
      .first();

    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zapytanie nie znalezione' 
      }, { status: 404 });
    }

    // Tylko właściciel może edytować swoje zapytania (chyba że admin)
    if (query.created_by_email !== userId && !permissions.canViewAll) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do edycji tego zapytania' 
      }, { status: 403 });
    }

    // Nie można edytować już przetworzonych zapytań
    if (query.status !== 'new') {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie można edytować już przetworzonych zapytań' 
      }, { status: 400 });
    }

    // Aktualizuj zapytanie
    const updated = await db('kurier_queries')
      .where('id', queryId)
      .update({
        ...updateData.changes,
        updated_at: db.fn.now()
      });

    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie udało się zaktualizować zapytania' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Zapytanie zostało zaktualizowane'
    });
  } catch (error) {
    console.error('Error updating kurier query:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Funkcja pomocnicza do konwersji zapytania na przesyłkę DHL
async function convertQueryToShipment(queryId, userId) {
  try {
    // Pobierz dane zapytania
    const query = await db('kurier_queries')
      .where('id', queryId)
      .first();

    if (!query) {
      throw new Error('Zapytanie nie znalezione');
    }

    // Konwertuj zapytanie na format zamówienia DHL
    const shipmentData = {
      id: `QUERY_${queryId}`,
      recipient_name: query.contact_person,
      recipient_address: `${query.address}, ${query.postal_code} ${query.city}`,
      recipient_phone: query.contact_phone,
      package_description: `${query.content_description} | Waga: ${query.weight}kg | Wymiary: ${query.dimensions} | Typ: ${query.package_type}`,
      notes: JSON.stringify({
        typZlecenia: 'zapytanie_klienta',
        nadawca: {
          typ: 'firma',
          nazwa: 'Grupa Eltron Sp. z o.o.',
          adres: 'ul. Wysockiego 69B, 15169 Białystok',
          kontakt: 'Magazyn Białystok',
          telefon: '857152705',
          email: 'bialystok@grupaeltron.pl'
        },
        odbiorca: {
          typ: 'klient',
          email: query.contact_email,
          kontakt: query.contact_person
        },
        przesylka: {
          opis: query.description,
          uwagi: query.special_instructions,
          typ: query.package_type,
          waga: query.weight,
          wymiary: query.dimensions,
          priorytet: query.priority
        },
        zapytanie: {
          id: queryId,
          utworzoneBy: query.created_by_email,
          akceptowaneBy: userId,
          dataPreferowana: query.preferred_date,
          czasPreferowany: query.preferred_time
        }
      })
    };

    // Wyślij do DHL
    const { default: DHLApiService } = await import('@/app/services/dhl-api');
    const dhlResult = await DHLApiService.createShipment(shipmentData);

    if (dhlResult.success) {
      return {
        success: true,
        dhlData: {
          shipmentNumber: dhlResult.shipmentNumber,
          trackingNumber: dhlResult.trackingNumber,
          labelUrl: dhlResult.labelUrl,
          cost: dhlResult.cost,
          sentAt: new Date().toISOString(),
          sentBy: userId
        }
      };
    } else {
      throw new Error(dhlResult.error);
    }
  } catch (error) {
    console.error('Błąd konwersji zapytania na przesyłkę:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
