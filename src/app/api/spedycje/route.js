// src/app/api/spedycje/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

const getLocationDisplayName = (transport, locationData = null) => {
  if (transport.location === 'Odbiory własne') {
    if (locationData) {
      const data = typeof locationData === 'string' ? JSON.parse(locationData) : locationData;
      return data.city || 'Brak miasta';
    }
    if (transport.producerAddress) {
      return transport.producerAddress.city || 'Brak miasta';
    }
    return 'Brak danych lokalizacji';
  } else if (transport.location === 'Magazyn Białystok') {
    return 'Białystok';
  } else if (transport.location === 'Magazyn Zielonka') {
    return 'Zielonka';
  }
  return transport.location;
};


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

// NOWA FUNKCJA: Generowanie punktów trasy z konfiguracji
const generateRoutePointsFromConfiguration = (mainTransport, transportsToMerge, routeConfiguration) => {
  console.log('=== GENEROWANIE PUNKTÓW TRASY ===');
  console.log('Główny transport:', mainTransport.id);
  console.log('Transporty do połączenia:', transportsToMerge.map(t => t.id));
  console.log('Konfiguracja tras:', routeConfiguration);
  
  const allPoints = [];
  
  // Główny załadunek (zawsze pierwszy)
  const mainLoadingPoint = {
    type: 'loading',
    transportId: 'main',
    order: 1,
    location: getTransportLocationCoords(mainTransport),
    description: `Załadunek główny: ${mainTransport.location === 'Odbiory własne' && mainTransport.producerAddress ? mainTransport.producerAddress.city : (mainTransport.location === 'Magazyn Białystok' ? 'Białystok' : (mainTransport.location === 'Magazyn Zielonka' ? 'Zielonka' : mainTransport.location))}`,
    address: mainTransport.location
  };
  
  allPoints.push(mainLoadingPoint);
  console.log('Dodano główny załadunek:', mainLoadingPoint);
  
  // Dodaj punkty z konfiguracji
  transportsToMerge.forEach(transport => {
    const config = routeConfiguration[transport.id] || {};
    console.log(`Przetwarzam transport ${transport.id}, konfiguracja:`, config);
    
    if (config.useLoading) {
      const loadingPoint = {
        type: 'loading',
        transportId: transport.id,
        order: config.loadingOrder || 999,
        location: getTransportLocationCoords(transport),
        description: `Załadunek: ${transport.location === 'Odbiory własne' && transport.location_data ? (typeof transport.location_data === 'string' ? JSON.parse(transport.location_data).city : transport.location_data.city) : (transport.location === 'Magazyn Białystok' ? 'Białystok' : (transport.location === 'Magazyn Zielonka' ? 'Zielonka' : transport.location))}`,
        address: transport.location
      };
      allPoints.push(loadingPoint);
      console.log('Dodano załadunek:', loadingPoint);
    }
    
    if (config.useUnloading) {
      const unloadingPoint = {
        type: 'unloading',
        transportId: transport.id,
        order: config.unloadingOrder || 999,
        location: getTransportDeliveryCoords(transport),
        description: `Rozładunek: ${transport.delivery?.city || 'Nie podano'}`,
        address: transport.delivery ? 
          `${transport.delivery.city}, ${transport.delivery.postalCode}, ${transport.delivery.street}` :
          'Brak adresu'
      };
      allPoints.push(unloadingPoint);
      console.log('Dodano rozładunek:', unloadingPoint);
    }
  });
  
  // Główny rozładunek (zawsze ostatni)
  const mainUnloadingPoint = {
    type: 'unloading',
    transportId: 'main',
    order: 15,
    location: getTransportDeliveryCoords(mainTransport),
    description: 'Rozładunek główny',
    address: mainTransport.delivery ? 
      `${mainTransport.delivery.city}, ${mainTransport.delivery.postalCode}, ${mainTransport.delivery.street}` :
      'Adres dostawy głównej'
  };
  
  allPoints.push(mainUnloadingPoint);
  console.log('Dodano główny rozładunek:', mainUnloadingPoint);
  
  const sortedPoints = allPoints.sort((a, b) => a.order - b.order);

  
  console.log('Posortowane punkty trasy:', sortedPoints.map(p => ({
    order: p.order,
    type: p.type,
    transportId: p.transportId,
    description: p.description
  })));
  
  return sortedPoints;
};

// FUNKCJE POMOCNICZE dla współrzędnych
const getTransportLocationCoords = (transport) => {
  try {
    if (transport.location === 'Odbiory własne') {
      // Spróbuj sparsować producerAddress
      let producerAddress = transport.producerAddress;
      if (typeof producerAddress === 'string') {
        producerAddress = JSON.parse(producerAddress);
      }
      return producerAddress;
    } else if (transport.location === 'Magazyn Białystok') {
      return { city: 'Białystok', lat: 53.1325, lng: 23.1688 };
    } else if (transport.location === 'Magazyn Zielonka') {
      return { city: 'Zielonka', lat: 52.3125, lng: 21.1390 };
    }
    return null;
  } catch (error) {
    console.error('Błąd pobierania współrzędnych lokalizacji:', error);
    return null;
  }
};

const getTransportDeliveryCoords = (transport) => {
  try {
    let delivery = transport.delivery;
    if (typeof delivery === 'string') {
      delivery = JSON.parse(delivery);
    }
    return delivery;
  } catch (error) {
    console.error('Błąd pobierania współrzędnych dostawy:', error);
    return null;
  }
};

// NOWA FUNKCJA: Obliczanie rzeczywistej odległości sekwencyjnej przez Google Maps API
const calculateSequentialRouteDistance = async (routePoints) => {
  if (routePoints.length < 2) return 0;
  
  console.log('=== OBLICZANIE RZECZYWISTEJ ODLEGŁOŚCI ===');
  console.log('Liczba punktów trasy:', routePoints.length);
  
  try {
    let totalDistance = 0;
    
    for (let i = 0; i < routePoints.length - 1; i++) {
      const currentPoint = routePoints[i];
      const nextPoint = routePoints[i + 1];
      
      console.log(`Segment ${i + 1}: ${currentPoint.description} → ${nextPoint.description}`);
      
      if (currentPoint.location && nextPoint.location) {
        // Pobierz współrzędne lub użyj istniejących
        const originCoords = await getOrCalculateCoordinates(currentPoint);
        const destCoords = await getOrCalculateCoordinates(nextPoint);
        
        if (originCoords && destCoords) {
          const segmentDistance = await calculateGoogleMapsDistance(originCoords, destCoords);
          totalDistance += segmentDistance;
          console.log(`Segment ${i + 1} odległość: ${segmentDistance} km`);
        }
      }
    }
    
    console.log(`Łączna odległość rzeczywista: ${totalDistance} km`);
    return totalDistance;
    
  } catch (error) {
    console.error('Błąd obliczania rzeczywistej odległości:', error);
    // Fallback do przybliżonej odległości
    return calculateApproximateRouteDistance(routePoints);
  }
};

// NOWA FUNKCJA: Pobieranie lub obliczanie współrzędnych punktu
const getOrCalculateCoordinates = async (point) => {
  try {
    // Jeśli punkt ma już współrzędne, użyj ich
    if (point.location && point.location.lat && point.location.lng) {
      return {
        lat: point.location.lat,
        lng: point.location.lng
      };
    }
    
    // Jeśli to magazyn, użyj stałych współrzędnych
    if (point.address === 'Magazyn Białystok') {
      return { lat: 53.1325, lng: 23.1688 };
    } else if (point.address === 'Magazyn Zielonka') {
      return { lat: 52.3125, lng: 21.1390 };
    }
    
    // Jeśli punkt ma adres, spróbuj go geokodować
    if (point.location && point.location.city) {
      return await geocodeAddress(point.location);
    }
    
    return null;
    
  } catch (error) {
    console.error('Błąd pobierania współrzędnych punktu:', error);
    return null;
  }
};

// NOWA FUNKCJA: Geokodowanie adresu przez Google Maps
const geocodeAddress = async (addressObj) => {
  try {
    const address = `${addressObj.city}, ${addressObj.postalCode || ''}, ${addressObj.street || ''}, Poland`;
    const query = encodeURIComponent(address);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    throw new Error('Nie znaleziono lokalizacji');
    
  } catch (error) {
    console.error('Błąd geokodowania:', error);
    return null;
  }
};

// NOWA FUNKCJA: Obliczanie odległości przez Google Maps Distance Matrix API
const calculateGoogleMapsDistance = async (origin, destination) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && 
        data.rows && 
        data.rows[0] && 
        data.rows[0].elements && 
        data.rows[0].elements[0] && 
        data.rows[0].elements[0].status === 'OK') {
      
      const distanceKm = Math.round(data.rows[0].elements[0].distance.value / 1000);
      return distanceKm;
    }
    
    throw new Error('Nieprawidłowa odpowiedź Google Maps API');
    
  } catch (error) {
    console.error('Błąd Google Maps Distance Matrix:', error);
    // Fallback do obliczenia w linii prostej
    return calculateStraightLineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  }
};

// FUNKCJA FALLBACK: Przybliżona odległość (w linii prostej + współczynnik)
const calculateApproximateRouteDistance = (routePoints) => {
  let totalDistance = 0;
  
  for (let i = 0; i < routePoints.length - 1; i++) {
    const currentPoint = routePoints[i];
    const nextPoint = routePoints[i + 1];
    
    if (currentPoint.location && nextPoint.location && 
        currentPoint.location.lat && currentPoint.location.lng &&
        nextPoint.location && nextPoint.location.lat && nextPoint.location.lng) {
      
      const segmentDistance = calculateStraightLineDistance(
        currentPoint.location.lat, 
        currentPoint.location.lng,
        nextPoint.location.lat, 
        nextPoint.location.lng
      );
      
      totalDistance += segmentDistance;
    }
  }
  
  // Przybliżenie trasy drogowej (współczynnik 1.3)
  return Math.round(totalDistance * 1.3);
};

// Pomocnicza funkcja do obliczania odległości w linii prostej
const calculateStraightLineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Promień Ziemi w km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Odległość w km
};

// POPRAWIONA FUNKCJA mergeTransports z zapisywaniem punktów trasy
const mergeTransports = async (mainTransportId, transportsToMerge, costDistribution, responseData, userId) => {
  console.log('=== MERGOWANIE TRANSPORTÓW Z KONFIGURACJĄ TRASY ===');
  console.log('Główny transport ID:', mainTransportId);
  console.log('Transporty do połączenia:', transportsToMerge.map(t => t.id));
  console.log('Podział kosztów:', costDistribution);
  console.log('Konfiguracja tras:', responseData.routeConfiguration);
  
  // Pobierz główny transport
  const mainTransport = await db('spedycje').where('id', mainTransportId).first();
  if (!mainTransport) throw new Error('Nie znaleziono głównego transportu');

  // Parsuj dane JSON głównego transportu
  try {
    if (mainTransport.location_data) {
      mainTransport.producerAddress = JSON.parse(mainTransport.location_data);
    }
    if (mainTransport.delivery_data) {
      mainTransport.delivery = JSON.parse(mainTransport.delivery_data);
    }
  } catch (error) {
    console.error('Błąd parsowania danych głównego transportu:', error);
  }

  // Pobierz transporty do połączenia
  const mergeTransportIds = transportsToMerge.map(t => t.id);
  const mergeTransportsData = await db('spedycje')
    .whereIn('id', mergeTransportIds)
    .select('*');

  if (mergeTransportsData.length !== mergeTransportIds.length) {
    throw new Error('Nie znaleziono wszystkich transportów do połączenia');
  }

  // Parsuj dane JSON transportów do połączenia
  const processedMergeTransports = mergeTransportsData.map(transport => {
    try {
      const processed = { ...transport };
      if (transport.location_data) {
        processed.producerAddress = JSON.parse(transport.location_data);
      }
      if (transport.delivery_data) {
        processed.delivery = JSON.parse(transport.delivery_data);
      }
      return processed;
    } catch (error) {
      console.error('Błąd parsowania danych transportu:', transport.id, error);
      return transport;
    }
  });

  // NOWE: Generuj punkty trasy z konfiguracji
  const routePoints = generateRoutePointsFromConfiguration(
    mainTransport, 
    processedMergeTransports, 
    responseData.routeConfiguration || {}
  );

  // Oblicz rzeczywistą odległość sekwencyjną przez Google Maps
  const realRouteDistance = await calculateSequentialRouteDistance(routePoints);

  // Oblicz koszt głównego transportu
  const totalDistributedCost = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
  const mainTransportCost = responseData.deliveryPrice - totalDistributedCost;

  // Funkcja pomocnicza do formatowania trasy
  const getTransportRoute = (transport) => {
    const start = transport.location === 'Odbiory własne' && transport.producerAddress 
      ? transport.producerAddress.city 
      : transport.location.replace('Magazyn ', '')
    
    const end = transport.delivery?.city || 'Brak danych'
    
    return `${start} → ${end}`
  };

  // Przygotuj dane połączonego transportu
  const mergedData = {
    originalTransports: processedMergeTransports.map(t => ({
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
    totalDistance: realRouteDistance, // Użyj rzeczywistej odległości
    routeConfiguration: responseData.routeConfiguration || {},
    routePointsCount: routePoints.length
  };

  // Przygotuj zaktualizowaną odpowiedź z punktami trasy
  const updatedResponseData = {
    ...responseData,
    isMerged: true,
    mergedTransportsCount: transportsToMerge.length,
    totalDistance: realRouteDistance,
    realRouteDistance: realRouteDistance, // Dodatkowe pole
    routePoints: routePoints, // NOWE: Zapisz punkty trasy
    costBreakdown: {
      mainTransport: {
        id: mainTransportId,
        mpk: mainTransport.mpk,
        cost: mainTransportCost,
        distance: mainTransport.distance_km || 0
      },
      mergedTransports: transportsToMerge.map(t => {
        const originalTransport = processedMergeTransports.find(mt => mt.id === t.id);
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
    
    // Zaktualizuj główny transport z punktami trasy
    await trx('spedycje').where('id', mainTransportId).update({
      merged_transports: JSON.stringify(mergedData),
      response_data: JSON.stringify(updatedResponseData),
      // Zaktualizuj odległość na rzeczywistą sekwencyjną
      distance_km: realRouteDistance,
      // Oznacz jako transport łączony
      is_merged: true,
      // Ustaw typ pojazdu i transport na podstawie odpowiedzi
      vehicle_type: responseData.vehicleType || null,
      transport_type: responseData.transportType || 'standard'
    });
  });

  console.log('=== MERGOWANIE ZAKOŃCZONE POMYŚLNIE ===');
  console.log(`Połączono ${transportsToMerge.length} transportów`);
  console.log(`Wygenerowano ${routePoints.length} punktów trasy`);
  console.log(`Rzeczywista odległość: ${realRouteDistance} km`);
  
  return {
    mergedCount: transportsToMerge.length,
    totalDistance: realRouteDistance,
    totalCost: responseData.deliveryPrice,
    routePointsCount: routePoints.length
  };
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
        // KOLUMNA dla połączonych transportów
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
    
    // KOLUMNA dla połączonych transportów
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
      if (status.includes(',')) {
        // Obsługa wielu statusów oddzielonych przecinkiem
        const statusArray = status.split(',').map(s => s.trim());
        query = query.whereIn('status', statusArray);
      } else {
        // Pojedynczy status
        query = query.where('status', status);
      }
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
        // Parsowanie danych o połączonych transportach
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
        // Dodaj dane o połączonych transportach
        merged_transports: item.merged_transports,
        // Dodaj nowe pola
        vehicleType: item.vehicle_type,
        transportType: item.transport_type,
        isMerged: item.is_merged,
        isDrumsTransport: item.is_drums_transport
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
      // Inicjalizacja pola merged_transports jako null
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

// Aktualizacja spedycji (odpowiedź) - ZMODYFIKOWANA dla mergowania z Google Maps
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
    console.log('=== OTRZYMANE DANE ODPOWIEDZI ===');
    console.log('ID:', id);
    console.log('Transporty do połączenia:', transportsToMerge?.length || 0);
    console.log('Podział kosztów:', costDistribution);
    console.log('Dane odpowiedzi:', responseData);
    
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
    
    // JEŚLI SĄ TRANSPORTY DO POŁĄCZENIA, WYKONAJ MERGE Z GOOGLE MAPS
    if (transportsToMerge && transportsToMerge.length > 0) {
      console.log('=== ROZPOCZYNAM MERGOWANIE Z GOOGLE MAPS ===');
      
      try {
        const mergeResult = await mergeTransports(id, transportsToMerge, costDistribution, responseData, userId);
        
        return NextResponse.json({ 
          success: true,
          message: `Transport został połączony z ${mergeResult.mergedCount} innymi transportami. ` +
                   `Wygenerowano ${mergeResult.routePointsCount} punktów trasy. ` +
                   `Rzeczywista odległość: ${mergeResult.totalDistance} km, koszt: ${mergeResult.totalCost} PLN.`
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
    console.log('=== ZAPISUJĘ STANDARDOWĄ ODPOWIEDŹ ===');
    
    // Przygotowujemy dane odpowiedzi
    const updateData = {
      response_data: JSON.stringify(responseData)
    };
    
    // Jeśli odległość jest podana w odpowiedzi, zapiszmy ją również bezpośrednio
    if (responseData.distanceKm) {
      updateData.distance_km = responseData.distanceKm;
    }
    
    // Dodaj informacje o typie pojazdu i transporcie
    if (responseData.vehicleType) {
      updateData.vehicle_type = responseData.vehicleType;
    }
    
    if (responseData.transportType) {
      updateData.transport_type = responseData.transportType;
    }
    
    // Oznacz czy to transport bębnów
    if (responseData.isDrumsTransport !== undefined) {
      updateData.is_drums_transport = responseData.isDrumsTransport;
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
