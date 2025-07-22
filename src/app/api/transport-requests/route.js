// src/app/api/transport-requests/route.js - NAPRAWIONA WERSJA
import { NextResponse } from 'next/server';

// Dynamiczny import bazy danych
let db;
try {
  db = (await import('@/database/db')).default;
} catch (error) {
  console.error('Błąd importu bazy danych:', error);
}

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken || !db) {
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
    console.error('Błąd walidacji sesji:', error);
    return null;
  }
};

// Funkcja do tworzenia tabeli transport_requests
const ensureTableExists = async () => {
  try {
    if (!db) {
      throw new Error('Baza danych nie jest dostępna');
    }

    const tableExists = await db.schema.hasTable('transport_requests');
    if (!tableExists) {
      console.log('Tworzenie tabeli transport_requests...');
      
      await db.schema.createTable('transport_requests', table => {
        table.increments('id').primary();
        table.string('status').defaultTo('pending'); // pending, approved, rejected
        table.string('requester_email').notNullable();
        table.string('requester_name').notNullable();
        table.string('destination_city').notNullable();
        table.string('postal_code');
        table.string('street');
        table.date('delivery_date').notNullable();
        table.string('mpk');
        table.text('justification'); // uzasadnienie wniosku
        table.string('client_name');
        table.string('contact_person');
        table.string('contact_phone');
        table.text('notes'); // dodatkowe uwagi
        table.string('approved_by');
        table.timestamp('approved_at');
        table.string('rejection_reason');
        table.integer('transport_id'); // ID transportu po akceptacji
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      
      console.log('Tabela transport_requests została utworzona');
    }
    
    return true;
  } catch (error) {
    console.error('Błąd tworzenia tabeli transport_requests:', error);
    return false;
  }
};

// GET - Pobieranie wniosków transportowych
export async function GET(request) {
  try {
    console.log('=== START GET /api/transport-requests ===');
    
    if (!db) {
      console.error('Baza danych nie jest dostępna');
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd połączenia z bazą danych' 
      }, { status: 500 });
    }

    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    console.log('AuthToken:', authToken ? 'Present' : 'Missing');
    
    const userId = await validateSession(authToken);
    console.log('UserId:', userId);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Upewnij się, że tabela istnieje
    const tableReady = await ensureTableExists();
    if (!tableReady) {
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd inicjalizacji tabeli' 
      }, { status: 500 });
    }

    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name', 'permissions')
      .first();

    console.log('User data:', user);

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Parsuj uprawnienia
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
      permissions = {};
    }

    const isAdmin = user.role === 'admin';
    const isMagazyn = user.role === 'magazyn' || user.role?.startsWith('magazyn_');
    const canViewAll = isAdmin || isMagazyn || permissions?.transport_requests?.approve === true;

    console.log('User permissions:', { isAdmin, isMagazyn, canViewAll });

    let query = db('transport_requests');

    // Jeśli nie ma uprawnień do przeglądania wszystkich, pokaż tylko własne wnioski
    if (!canViewAll) {
      query = query.where('requester_email', userId);
    }

    // Parametry filtrowania z URL
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Filtruj po statusie
    if (status && status !== 'all') {
      query = query.where('status', status);
    }

    // Filtruj po datach
    if (dateFrom) {
      query = query.where('delivery_date', '>=', dateFrom);
    }
    if (dateTo) {
      query = query.where('delivery_date', '<=', dateTo);
    }

    // Sortuj od najnowszych
    query = query.orderBy('created_at', 'desc');

    const requests = await query;
    console.log('Pobrano wniosków:', requests.length);

    return NextResponse.json({ 
      success: true, 
      requests: requests || [],
      canViewAll,
      userRole: user.role
    });

  } catch (error) {
    console.error('Error in GET /api/transport-requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera: ' + error.message 
    }, { status: 500 });
  }
}

// POST - Dodawanie nowego wniosku transportowego
export async function POST(request) {
  try {
    console.log('=== START POST /api/transport-requests ===');
    
    if (!db) {
      console.error('Baza danych nie jest dostępna');
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd połączenia z bazą danych' 
      }, { status: 500 });
    }

    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Upewnij się, że tabela istnieje
    const tableReady = await ensureTableExists();
    if (!tableReady) {
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd inicjalizacji tabeli' 
      }, { status: 500 });
    }

    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name', 'permissions')
      .first();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Sprawdź uprawnienia do dodawania wniosków
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
      permissions = {};
    }

    const isAdmin = user.role === 'admin';
    const isHandlowiec = user.role === 'handlowiec';
    const canAddRequests = isAdmin || isHandlowiec || permissions?.transport_requests?.add === true;

    console.log('Permission check:', { isAdmin, isHandlowiec, canAddRequests });

    if (!canAddRequests) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do składania wniosków transportowych' 
      }, { status: 403 });
    }

    const requestData = await request.json();
    console.log('Request data:', requestData);

    // Walidacja wymaganych pól
    const requiredFields = ['destination_city', 'delivery_date', 'justification'];
    for (const field of requiredFields) {
      if (!requestData[field]) {
        return NextResponse.json({ 
          success: false, 
          error: `Pole ${field} jest wymagane` 
        }, { status: 400 });
      }
    }

    // Sprawdź czy data dostawy nie jest w przeszłości
    const deliveryDate = new Date(requestData.delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deliveryDate < today) {
      return NextResponse.json({ 
        success: false, 
        error: 'Data dostawy nie może być w przeszłości' 
      }, { status: 400 });
    }

    // Przygotuj dane do zapisania
    const newRequest = {
      status: 'pending',
      requester_email: userId,
      requester_name: user.name || userId,
      destination_city: requestData.destination_city,
      postal_code: requestData.postal_code || null,
      street: requestData.street || null,
      delivery_date: requestData.delivery_date,
      mpk: requestData.mpk || null,
      justification: requestData.justification,
      client_name: requestData.client_name || null,
      contact_person: requestData.contact_person || null,
      contact_phone: requestData.contact_phone || null,
      notes: requestData.notes || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('Inserting request:', newRequest);

    // Zapisz wniosek do bazy
    const [insertedId] = await db('transport_requests').insert(newRequest);

    console.log(`Utworzono wniosek transportowy ID: ${insertedId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Wniosek transportowy został złożony',
      requestId: insertedId
    });

  } catch (error) {
    console.error('Error in POST /api/transport-requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera: ' + error.message 
    }, { status: 500 });
  }
}

// PUT - Aktualizacja wniosku (akceptacja/odrzucenie lub edycja)
export async function PUT(request) {
  try {
    console.log('=== START PUT /api/transport-requests ===');
    
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd połączenia z bazą danych' 
      }, { status: 500 });
    }

    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Upewnij się, że tabela istnieje
    const tableReady = await ensureTableExists();
    if (!tableReady) {
      return NextResponse.json({ 
        success: false, 
        error: 'Błąd inicjalizacji tabeli' 
      }, { status: 500 });
    }

    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name', 'permissions')
      .first();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    const updateData = await request.json();
    const { requestId, action, ...data } = updateData;
    
    console.log('Update data:', { requestId, action });

    if (!requestId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID wniosku jest wymagane' 
      }, { status: 400 });
    }

    // Pobierz istniejący wniosek
    const existingRequest = await db('transport_requests')
      .where('id', requestId)
      .first();

    if (!existingRequest) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono wniosku' 
      }, { status: 404 });
    }

    // Parsuj uprawnienia
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
      permissions = {};
    }

    const isAdmin = user.role === 'admin';
    const isMagazyn = user.role === 'magazyn' || user.role?.startsWith('magazyn_');
    const canApprove = isAdmin || isMagazyn || permissions?.transport_requests?.approve === true;
    const isOwner = existingRequest.requester_email === userId;

    // Obsługa różnych akcji
    switch (action) {
      case 'approve':
        if (!canApprove) {
          return NextResponse.json({ 
            success: false, 
            error: 'Brak uprawnień do akceptowania wniosków' 
          }, { status: 403 });
        }

        // Sprawdź czy tabela transports istnieje
        const transportsTableExists = await db.schema.hasTable('transports');
        if (!transportsTableExists) {
          return NextResponse.json({ 
            success: false, 
            error: 'Tabela transportów nie istnieje' 
          }, { status: 500 });
        }

        // Akceptuj wniosek i utwórz transport
        const approvedData = {
          status: 'approved',
          approved_by: user.name || userId,
          approved_at: new Date(),
          updated_at: new Date()
        };

        await db('transport_requests')
          .where('id', requestId)
          .update(approvedData);

        // Utwórz transport na podstawie wniosku
        const newTransport = {
          source_warehouse: 'bialystok', // Domyślne źródło
          destination_city: existingRequest.destination_city,
          postal_code: existingRequest.postal_code,
          street: existingRequest.street,
          delivery_date: existingRequest.delivery_date,
          mpk: existingRequest.mpk,
          client_name: existingRequest.client_name,
          requester_name: existingRequest.requester_name,
          requester_email: existingRequest.requester_email,
          status: 'active',
          notes: `Utworzony z wniosku #${requestId}. ${existingRequest.notes || ''}`.trim()
        };

        const [transportId] = await db('transports').insert(newTransport);

        // Zaktualizuj wniosek o ID utworzonego transportu
        await db('transport_requests')
          .where('id', requestId)
          .update({ transport_id: transportId });

        console.log(`Zaakceptowano wniosek ${requestId}, utworzono transport ${transportId}`);

        return NextResponse.json({ 
          success: true, 
          message: 'Wniosek został zaakceptowany i dodany do kalendarza',
          transportId
        });

      case 'reject':
        if (!canApprove) {
          return NextResponse.json({ 
            success: false, 
            error: 'Brak uprawnień do odrzucania wniosków' 
          }, { status: 403 });
        }

        const rejectedData = {
          status: 'rejected',
          approved_by: user.name || userId,
          approved_at: new Date(),
          rejection_reason: data.rejection_reason || 'Brak uzasadnienia',
          updated_at: new Date()
        };

        await db('transport_requests')
          .where('id', requestId)
          .update(rejectedData);

        console.log(`Odrzucono wniosek ${requestId}`);

        return NextResponse.json({ 
          success: true, 
          message: 'Wniosek został odrzucony'
        });

      case 'edit':
        // Tylko właściciel może edytować swój wniosek (i tylko w statusie pending)
        if (!isOwner) {
          return NextResponse.json({ 
            success: false, 
            error: 'Możesz edytować tylko własne wnioski' 
          }, { status: 403 });
        }

        if (existingRequest.status !== 'pending') {
          return NextResponse.json({ 
            success: false, 
            error: 'Można edytować tylko wnioski w statusie oczekiwania' 
          }, { status: 400 });
        }

        // Przygotuj dane do aktualizacji
        const editData = {
          ...data,
          updated_at: new Date()
        };

        // Usuń pola, które nie mogą być edytowane
        delete editData.status;
        delete editData.requester_email;
        delete editData.requester_name;
        delete editData.approved_by;
        delete editData.approved_at;
        delete editData.transport_id;
        delete editData.action;
        delete editData.requestId;

        await db('transport_requests')
          .where('id', requestId)
          .update(editData);

        console.log(`Zaktualizowano wniosek ${requestId}`);

        return NextResponse.json({ 
          success: true, 
          message: 'Wniosek został zaktualizowany'
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Nieznana akcja' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in PUT /api/transport-requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera: ' + error.message 
    }, { status: 500 });
  }
}
