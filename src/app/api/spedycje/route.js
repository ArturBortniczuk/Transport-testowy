// src/app/api/spedycje/route.js
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

// Pobieranie wszystkich spedycji
export async function GET(request) {
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
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Sprawdź czy tabela istnieje, jeśli nie - utwórz ją
    const tableExists = await db.schema.hasTable('spedycje');
    if (!tableExists) {
      await db.schema.createTable('spedycje', table => {
        table.increments('id').primary();
        table.string('status').defaultTo('new');
        table.string('order_number');
        table.string('created_by');
        table.string('created_by_email');
        table.string('responsible_person');
        table.string('responsible_email');
        table.string('mpk');
        table.string('location');
        table.text('location_data');
        table.text('delivery_data');
        table.string('loading_contact');
        table.string('unloading_contact');
        table.date('delivery_date');
        table.string('documents');
        table.text('notes');
        table.text('response_data');
        table.string('completed_by');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('completed_at');
        table.integer('distance_km');
        table.string('client_name');
        table.text('goods_description');
        table.text('responsible_constructions');
        // NOWA KOLUMNA dla połączonych transportów
        table.text('merged_transports');
      });
    }
    
    // Sprawdzanie i dodawanie nowych kolumn, jeśli nie istnieją
    const hasOrderNumberColumn = await db.schema.hasColumn('spedycje', 'order_number');
    if (!hasOrderNumberColumn) {
      await db.schema.table('spedycje', table => {
        table.string('order_number');
      });
    }
    
    const hasDistanceColumn = await db.schema.hasColumn('spedycje', 'distance_km');
    if (!hasDistanceColumn) {
      await db.schema.table('spedycje', table => {
        table.integer('distance_km');
      });
    }

    const hasOrderSentColumn = await db.schema.hasColumn('spedycje', 'order_sent');
    if (!hasOrderSentColumn) {
      await db.schema.table('spedycje', table => {
        table.boolean('order_sent').defaultTo(false);
        table.timestamp('order_sent_at');
        table.string('order_sent_by');
        table.string('order_recipient');
        table.text('order_data');
      });
    }
    
    // Sprawdź nowe kolumny
    const hasClientNameColumn = await db.schema.hasColumn('spedycje', 'client_name');
    if (!hasClientNameColumn) {
      await db.schema.table('spedycje', table => {
        table.string('client_name');
      });
    }
    
    const hasGoodsDescriptionColumn = await db.schema.hasColumn('spedycje', 'goods_description');
    if (!hasGoodsDescriptionColumn) {
      await db.schema.table('spedycje', table => {
        table.text('goods_description');
      });
    }
    
    const hasResponsibleConstructionsColumn = await db.schema.hasColumn('spedycje', 'responsible_constructions');
    if (!hasResponsibleConstructionsColumn) {
      await db.schema.table('spedycje', table => {
        table.text('responsible_constructions');
      });
    }
    
    // NOWA KOLUMNA dla połączonych transportów
    const hasMergedTransportsColumn = await db.schema.hasColumn('spedycje', 'merged_transports');
    if (!hasMergedTransportsColumn) {
      await db.schema.table('spedycje', table => {
        table.text('merged_transports');
      });
    }
    
    // Budujemy zapytanie
    let query = db('spedycje');
    
    // Filtrujemy po statusie jeśli podany
    if (status) {
      query = query.where('status', status);
    }
    
    // Sortujemy od najnowszych
    query = query.orderBy('created_at', 'desc');
    
    // Wykonaj zapytanie
    const spedycje = await query;
    
    // Przetwarzamy dane przed wysłaniem (parsowanie JSONa)
    const processedData = spedycje.map(item => {
      try {
        // Parsowanie danych JSON
        if (item.location_data) {
          item.location_data = JSON.parse(item.location_data);
        }
        if (item.delivery_data) {
          item.delivery_data = JSON.parse(item.delivery_data);
        }
        if (item.response_data) {
          item.response_data = JSON.parse(item.response_data);
        }
        if (item.goods_description) {
          item.goods_description = JSON.parse(item.goods_description);
        }
        if (item.responsible_constructions) {
          item.responsible_constructions = JSON.parse(item.responsible_constructions);
        }
        // NOWE: Parsowanie danych o połączonych transportach
        if (item.merged_transports) {
          item.merged_transports = JSON.parse(item.merged_transports);
        }
      } catch (e) {
        console.error('Error parsing JSON data in spedycje:', e);
      }
      
      // Konwertuj nazwy pól z bazy danych na nazwy używane przez front-end
      return {
        ...item,
        id: item.id,
        status: item.status,
        orderNumber: item.order_number,
        createdBy: item.created_by,
        createdByEmail: item.created_by_email,
        responsiblePerson: item.responsible_person,
        responsibleEmail: item.responsible_email,
        mpk: item.mpk,
        location: item.location,
        producerAddress: item.location_data,
        delivery: item.delivery_data,
        loadingContact: item.loading_contact,
        unloadingContact: item.unloading_contact,
        deliveryDate: item.delivery_date,
        documents: item.documents,
        notes: item.notes,
        response: item.response_data,
        completedBy: item.completed_by,
        createdAt: item.created_at,
        completedAt: item.completed_at,
        distanceKm: item.distance_km,
        clientName: item.client_name,
        goodsDescription: item.goods_description,
        responsibleConstructions: item.responsible_constructions,
        // NOWE: Dodaj dane o połączonych transportach
        merged_transports: item.merged_transports
      };
    });
    
    return NextResponse.json({ 
      success: true, 
      spedycje: processedData || []
    });
  } catch (error) {
    console.error('Error fetching spedycje:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Dodawanie nowego zlecenia spedycji
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
    
    const spedycjaData = await request.json();
    console.log('Otrzymane dane spedycji:', spedycjaData);
    
    // Sprawdzamy czy użytkownik ma uprawnienia
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name', 'permissions', 'is_admin')
      .first();
    
    // Pobierz uprawnienia użytkownika
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
    }

    // Sprawdź czy użytkownik ma uprawnienie do dodawania spedycji
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
    const canAddSpedycja = isAdmin || permissions?.spedycja?.add === true;

    if (!canAddSpedycja) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do dodawania spedycji' 
      }, { status: 403 });
    }
    
    // Generowanie numeru zamówienia
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Pobierz ostatni numer zamówienia z tego miesiąca i roku
    const lastOrderQuery = await db('spedycje')
      .whereRaw('EXTRACT(MONTH FROM created_at) = ?', [month])
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .orderBy('id', 'desc')
      .first();
    
    // Ustal numer dla nowego zamówienia
    let orderNumber = 1;
    if (lastOrderQuery && lastOrderQuery.order_number) {
      const lastOrderMatch = lastOrderQuery.order_number.match(/^(\d+)\/\d+\/\d+$/);
      if (lastOrderMatch) {
        orderNumber = parseInt(lastOrderMatch[1], 10) + 1;
      }
    }
    
    // Sformatuj numer zamówienia
    const formattedOrderNumber = `${orderNumber.toString().padStart(4, '0')}/${month}/${year}`;
    
    // Przygotowanie danych do zapisania
    let goodsDescriptionJson = null;
    if (spedycjaData.goodsDescription) {
      goodsDescriptionJson = JSON.stringify(spedycjaData.goodsDescription);
    }
    
    let responsibleConstructionsJson = null;
    if (spedycjaData.responsibleConstructions && spedycjaData.responsibleConstructions.length > 0) {
      responsibleConstructionsJson = JSON.stringify(spedycjaData.responsibleConstructions);
    }
    
    // Przygotowujemy dane do zapisania
    const dataToSave = {
      status: 'new',
      order_number: formattedOrderNumber,
      created_by: user.name,
      created_by_email: userId,
      responsible_person: spedycjaData.responsiblePerson || user.name,
      responsible_email: spedycjaData.responsibleEmail || userId,
      mpk: spedycjaData.mpk,
      location: spedycjaData.location,
      location_data: spedycjaData.producerAddress ? JSON.stringify(spedycjaData.producerAddress) : null,
      delivery_data: spedycjaData.delivery ? JSON.stringify(spedycjaData.delivery) : null,
      loading_contact: spedycjaData.loadingContact,
      unloading_contact: spedycjaData.unloadingContact,
      delivery_date: spedycjaData.deliveryDate,
      documents: spedycjaData.documents,
      notes: spedycjaData.notes,
      distance_km: spedycjaData.distanceKm || 0,
      client_name: spedycjaData.clientName || '',
      goods_description: goodsDescriptionJson,
      responsible_constructions: responsibleConstructionsJson,
      created_at: db.fn.now(),
      // NOWE: Inicjalizacja pola merged_transports jako null
      merged_transports: null
    };
    
    console.log('Dane do zapisania w bazie:', dataToSave);
    
    // Zapisujemy do bazy danych
    const [id] = await db('spedycje').insert(dataToSave).returning('id');
    
    return NextResponse.json({ 
      success: true, 
      id: id
    });
  } catch (error) {
    console.error('Error adding spedycja:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// NOWA FUNKCJA: Funkcja pomocnicza do pobierania trasy transportu
const getTransportRoute = (transport) => {
  let start = '';
  let end = '';
  
  // Ustal punkt startowy
  if (transport.location === 'Odbiory własne' && transport.location_data) {
    try {
      const locationData = typeof transport.location_data === 'string' 
        ? JSON.parse(transport.location_data) 
        : transport.location_data;
      start = locationData.city || 'Odbiory własne';
    } catch (e) {
      start = 'Odbiory własne';
    }
  } else if (transport.location === 'Magazyn Białystok') {
    start = 'Białystok';
  } else if (transport.location === 'Magazyn Zielonka') {
    start = 'Zielonka';
  } else {
    start = transport.location || 'Brak danych';
  }
  
  // Ustal punkt końcowy
  if (transport.delivery_data) {
    try {
      const deliveryData = typeof transport.delivery_data === 'string' 
        ? JSON.parse(transport.delivery_data) 
        : transport.delivery_data;
      end = deliveryData.city || 'Brak danych';
    } catch (e) {
      end = 'Brak danych';
    }
  }
  
  return `${start} → ${end}`;
};

// NOWA FUNKCJA: Mergowanie transportów
const mergeTransports = async (mainTransportId, transportsToMerge, costDistribution, responseData, userId) => {
  console.log('Mergowanie transportów:', { 
    mainTransportId, 
    transportsToMerge: transportsToMerge.map(t => t.id), 
    costDistribution 
  });
  
  // Pobierz główny transport
  const mainTransport = await db('spedycje').where('id', mainTransportId).first();
  if (!mainTransport) throw new Error('Nie znaleziono głównego transportu');

  // Pobierz transporty do połączenia
  const mergeTransportIds = transportsToMerge.map(t => t.id);
  const mergeTransportsData = await db('spedycje')
    .whereIn('id', mergeTransportIds)
    .select('*');

  if (mergeTransportsData.length !== mergeTransportIds.length) {
    throw new Error('Nie znaleziono wszystkich transportów do połączenia');
  }

  // Oblicz całkowitą odległość
  const mainDistance = mainTransport.distance_km || 0;
  const mergeDistances = mergeTransportsData.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const totalDistance = mainDistance + mergeDistances;

  // Oblicz koszt głównego transportu
  const totalDistributedCost = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
  const mainTransportCost = responseData.deliveryPrice - totalDistributedCost;

  // Przygotuj dane połączonego transportu
  const mergedData = {
    originalTransports: mergeTransportsData.map(t => ({
      id: t.id,
      orderNumber: t.order_number,
      mpk: t.mpk,
      route: getTransportRoute(t),
      responsiblePerson: t.responsible_person,
      costAssigned: parseFloat(costDistribution[t.id] || 0),
      distance: t.distance_km || 0,
      // Zachowaj wszystkie ważne dane
      location: t.location,
      location_data: t.location_data,
      delivery_data: t.delivery_data,
      documents: t.documents,
      notes: t.notes,
      loading_contact: t.loading_contact,
      unloading_contact: t.unloading_contact,
      delivery_date: t.delivery_date,
      client_name: t.client_name,
      goods_description: t.goods_description,
      responsible_constructions: t.responsible_constructions
    })),
    totalMergedCost: totalDistributedCost,
    mergedAt: new Date().toISOString(),
    mergedBy: userId,
    mainTransportCost: mainTransportCost,
    totalDistance: totalDistance
  };

  // Przygotuj zaktualizowaną odpowiedź
  const updatedResponseData = {
    ...responseData,
    isMerged: true,
    mergedTransportsCount: transportsToMerge.length,
    totalDistance: totalDistance,
    costBreakdown: {
      mainTransport: {
        id: mainTransportId,
        mpk: mainTransport.mpk,
        cost: mainTransportCost,
        distance: mainDistance
      },
      mergedTransports: transportsToMerge.map(t => {
        const originalTransport = mergeTransportsData.find(mt => mt.id === t.id);
        return {
          id: t.id,
          mpk: originalTransport?.mpk || '',
          cost: parseFloat(costDistribution[t.id] || 0),
          distance: originalTransport?.distance_km || 0
        };
      })
    }
  };

  // Wykonaj transakcję: usuń stare transporty i zaktualizuj główny
  await db.transaction(async (trx) => {
    // Usuń transporty do połączenia
    await trx('spedycje').whereIn('id', mergeTransportIds).del();
    
    // Zaktualizuj główny transport
    await trx('spedycje').where('id', mainTransportId).update({
      merged_transports: JSON.stringify(mergedData),
      response_data: JSON.stringify(updatedResponseData),
      // Zaktualizuj odległość na całkowitą
      distance_km: totalDistance
    });
  });

  console.log('Transporty zostały pomyślnie połączone');
  return {
    mergedCount: transportsToMerge.length,
    totalDistance: totalDistance,
    totalCost: responseData.deliveryPrice
  };
};

// Aktualizacja spedycji (odpowiedź) - ZMODYFIKOWANA dla mergowania
export async function PUT(request) {
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
    
    const { id, transportsToMerge, costDistribution, ...responseData } = await request.json();
    console.log('Otrzymane dane odpowiedzi:', { 
      id, 
      hasTransportsToMerge: !!(transportsToMerge && transportsToMerge.length > 0),
      transportsCount: transportsToMerge?.length || 0,
      responseData 
    });
    
    // Sprawdzamy czy użytkownik ma uprawnienia
    const user = await db('users')
      .where('email', userId)
      .select('role', 'permissions', 'is_admin')
      .first();
    
    // Pobierz uprawnienia użytkownika
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
    }

    // Sprawdź czy użytkownik ma uprawnienie do odpowiadania na spedycje
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
    const canRespondToSpedycja = isAdmin || permissions?.spedycja?.respond === true;

    if (!canRespondToSpedycja) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do odpowiadania na zlecenia spedycji' 
      }, { status: 403 });
    }
    
    // NOWE: Jeśli są transporty do połączenia, wykonaj merge
    if (transportsToMerge && transportsToMerge.length > 0) {
      console.log('Rozpoczynam mergowanie transportów...');
      
      try {
        const mergeResult = await mergeTransports(id, transportsToMerge, costDistribution, responseData, userId);
        
        return NextResponse.json({ 
          success: true,
          message: `Transport został połączony z ${mergeResult.mergedCount} innymi transportami. Łączna odległość: ${mergeResult.totalDistance} km, koszt: ${mergeResult.totalCost} PLN.`
        });
      } catch (mergeError) {
        console.error('Błąd podczas mergowania transportów:', mergeError);
        return NextResponse.json({ 
          success: false, 
          error: `Błąd łączenia transportów: ${mergeError.message}` 
        }, { status: 500 });
      }
    }
    
    // Standardowa logika dla normalnych odpowiedzi (bez mergowania)
    console.log('Zapisuję standardową odpowiedź...');
    
    // Przygotowujemy dane odpowiedzi
    const updateData = {
      response_data: JSON.stringify(responseData)
    };
    
    // Jeśli odległość jest podana w odpowiedzi, zapiszmy ją również bezpośrednio
    if (responseData.distanceKm) {
      updateData.distance_km = responseData.distanceKm;
    }
    
    console.log('Dane odpowiedzi do zapisania:', updateData);
    
    // Aktualizujemy rekord w bazie
    const updated = await db('spedycje')
      .where('id', id)
      .update(updateData);
    
    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono zlecenia spedycji o podanym ID' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Zapisano odpowiedź'
    });
  } catch (error) {
    console.error('Error updating spedycja:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Usuwanie zlecenia spedycji (tylko admin)
export async function DELETE(request) {
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
    
    // Sprawdzamy czy użytkownik jest administratorem
    const isAdmin = await db('users')
      .where('email', userId)
      .where('is_admin', true)
      .first();
    
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień administratora' 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie podano ID zlecenia' 
      }, { status: 400 });
    }
    
    // Usuwamy rekord z bazy
    const deleted = await db('spedycje')
      .where('id', id)
      .del();
    
    if (deleted === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono zlecenia o podanym ID' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('Error deleting spedycja:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
