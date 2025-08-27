import React from 'react';
import { 
  Truck, 
  MapPin, 
  FileText, 
  Users, 
  Calculator, 
  Route,
  DollarSign
} from 'lucide-react';

const MergedTransportSummary = ({ transport, mergedData }) => {
  if (!transport) {
    return null;
  }

  // Funkcja do pobrania właściwych danych transportu (głównego lub obecnego)
  const getEffectiveTransportData = () => {
    // Dla połączonych transportów zawsze używaj obecnego transportu
    // bo dane o całej grupie powinny być w każdym z połączonych transportów
    return transport;
  };

  // Funkcja do pobierania wszystkich danych transportów (zarówno głównego jak i połączonych)
  const getAllTransportsData = () => {
    const allTransports = [];
    const addedIds = new Set(); // Śledź już dodane transporty
    
    console.log('=== DEBUG getAllTransportsData ===');
    console.log('Obecny transport:', transport);
    
    // ZAWSZE dodaj obecny transport jako pierwszy
    const currentTransportData = {
      id: transport.id,
      orderNumber: transport.order_number,
      mpk: transport.mpk,
      documents: transport.documents,
      clientName: transport.client_name,
      responsiblePerson: transport.responsible_person,
      location: transport.location,
      delivery_data: transport.delivery_data,
      route: getTransportRoute(transport),
      distance_km: transport.distance_km,
      distanceKm: transport.distanceKm
    };
    
    allTransports.push(currentTransportData);
    addedIds.add(transport.id);
    console.log('Dodano obecny transport:', currentTransportData);

    // 1. Sprawdź response_data (najważniejsze źródło danych)
    if (transport.response_data) {
      try {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        console.log('Response_data:', responseData);
        
        // Sprawdź różne możliwe struktury danych
        let originalTransports = null;
        
        if (responseData.originalTransports) {
          originalTransports = responseData.originalTransports;
        } else if (responseData.transports) {
          originalTransports = responseData.transports;
        } else if (responseData.mergedTransports) {
          originalTransports = responseData.mergedTransports;
        }
        
        console.log('Original transports z response_data:', originalTransports);
        
        if (originalTransports && Array.isArray(originalTransports)) {
          originalTransports.forEach(originalTransport => {
            if (!addedIds.has(originalTransport.id)) {
              const transportData = {
                id: originalTransport.id,
                orderNumber: originalTransport.orderNumber || originalTransport.order_number,
                mpk: originalTransport.mpk,
                documents: originalTransport.documents,
                clientName: originalTransport.clientName || originalTransport.client_name,
                responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
                location: originalTransport.location,
                delivery_data: originalTransport.delivery_data,
                route: originalTransport.route || getTransportRoute(originalTransport),
                distance_km: originalTransport.distance_km || originalTransport.distanceKm,
                distanceKm: originalTransport.distanceKm || originalTransport.distance_km
              };
              allTransports.push(transportData);
              addedIds.add(originalTransport.id);
              console.log('Dodano transport z response_data:', transportData);
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania response_data:', e);
      }
    }

    // 2. Sprawdź merged_transports (backup)
    if (transport.merged_transports) {
      try {
        const mergedTransportsData = typeof transport.merged_transports === 'string' 
          ? JSON.parse(transport.merged_transports) 
          : transport.merged_transports;
        
        console.log('Merged_transports data:', mergedTransportsData);
        
        if (mergedTransportsData.originalTransports && Array.isArray(mergedTransportsData.originalTransports)) {
          mergedTransportsData.originalTransports.forEach(originalTransport => {
            if (!addedIds.has(originalTransport.id)) {
              const transportData = {
                id: originalTransport.id,
                orderNumber: originalTransport.orderNumber || originalTransport.order_number,
                mpk: originalTransport.mpk,
                documents: originalTransport.documents,
                clientName: originalTransport.clientName || originalTransport.client_name,
                responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
                location: originalTransport.location,
                delivery_data: originalTransport.delivery_data,
                route: originalTransport.route,
                distance_km: originalTransport.distance_km || originalTransport.distanceKm,
                distanceKm: originalTransport.distanceKm || originalTransport.distance_km
              };
              allTransports.push(transportData);
              addedIds.add(originalTransport.id);
              console.log('Dodano transport z merged_transports:', transportData);
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania merged_transports:', e);
      }
    }

    // 3. Sprawdź mergedData przekazane z rodzica
    if (mergedData?.originalTransports && Array.isArray(mergedData.originalTransports)) {
      console.log('MergedData originalTransports:', mergedData.originalTransports);
      mergedData.originalTransports.forEach(originalTransport => {
        if (!addedIds.has(originalTransport.id)) {
          const transportData = {
            id: originalTransport.id,
            orderNumber: originalTransport.orderNumber || originalTransport.order_number,
            mpk: originalTransport.mpk,
            documents: originalTransport.documents,
            clientName: originalTransport.clientName || originalTransport.client_name,
            responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
            location: originalTransport.location,
            delivery_data: originalTransport.delivery_data,
            route: originalTransport.route,
            distance_km: originalTransport.distance_km || originalTransport.distanceKm,
            distanceKm: originalTransport.distanceKm || originalTransport.distance_km
          };
          allTransports.push(transportData);
          addedIds.add(originalTransport.id);
          console.log('Dodano transport z mergedData:', transportData);
        }
      });
    }

    console.log('=== FINALNE WSZYSTKIE TRANSPORTY ===');
    console.log(`Znaleziono ${allTransports.length} transportów:`, allTransports);
    
    return allTransports;
  };

  // Funkcja pomocnicza do formatowania trasy - NAPRAWIONA
  const getTransportRoute = (transportItem) => {
    if (!transportItem) return 'Brak danych';
    
    console.log(`=== getTransportRoute dla transport ${transportItem.id} ===`);
    console.log('Transport data:', transportItem);
    
    let start = 'Brak danych';
    let end = 'Brak danych';
    
    // Określ punkt początkowy
    if (transportItem.location === 'Odbiory własne' && transportItem.producerAddress) {
      start = transportItem.producerAddress.city || transportItem.producerAddress;
    } else if (transportItem.location) {
      start = transportItem.location.replace('Magazyn ', '');
    }
    
    // Określ punkt końcowy
    if (transportItem.delivery_data) {
      try {
        const deliveryData = typeof transportItem.delivery_data === 'string' 
          ? JSON.parse(transportItem.delivery_data) 
          : transportItem.delivery_data;
        end = deliveryData.city || deliveryData.address || 'Brak danych';
      } catch (e) {
        console.log('Błąd parsowania delivery_data:', e);
      }
    } else if (transportItem.delivery) {
      end = transportItem.delivery.city || transportItem.delivery.address || 'Brak danych';
    }
    
    const route = `${start} → ${end}`;
    console.log(`Wygenerowana trasa: "${route}"`);
    return route;
  };

  // Funkcja do zbierania wszystkich unikalnych wartości z pola
  const collectUniqueValues = (field) => {
    const values = new Set();
    const allTransports = getAllTransportsData();
    
    allTransports.forEach(transportData => {
      if (transportData[field]) {
        values.add(transportData[field]);
      }
    });
    
    return Array.from(values).filter(Boolean);
  };

  // Funkcja do zbierania wszystkich odpowiedzialnych osób
  const collectAllResponsible = () => {
    const allTransports = getAllTransportsData();
    const responsible = new Set();
    
    console.log('=== DEBUG collectAllResponsible ===');
    console.log('Wszystkie transporty do sprawdzenia:', allTransports);
    
    allTransports.forEach(transportData => {
      console.log(`Transport ${transportData.id}:`, {
        responsiblePerson: transportData.responsiblePerson,
        createdBy: transportData.createdBy,
        responsible_person: transportData.responsible_person,
        created_by: transportData.created_by,
        wszystkieDane: transportData
      });
      
      // Sprawdź różne możliwe pola z osobami odpowiedzialnymi
      if (transportData.responsiblePerson && transportData.responsiblePerson.trim()) {
        responsible.add(transportData.responsiblePerson.trim());
        console.log('✅ Dodano responsiblePerson:', transportData.responsiblePerson);
      }
      
      // Backup - sprawdź inne możliwe pola
      if (transportData.responsible_person && transportData.responsible_person.trim()) {
        responsible.add(transportData.responsible_person.trim());
        console.log('✅ Dodano responsible_person:', transportData.responsible_person);
      }
      
      if (transportData.createdBy && transportData.createdBy.trim()) {
        responsible.add(transportData.createdBy.trim());
        console.log('✅ Dodano createdBy:', transportData.createdBy);
      }
      
      if (transportData.created_by && transportData.created_by.trim()) {
        responsible.add(transportData.created_by.trim());
        console.log('✅ Dodano created_by:', transportData.created_by);
      }
      
      // Sprawdź też w oryginalnych danych z bazy
      if (!responsible.size && transportData.responsibleEmail) {
        // Spróbuj wyciągnąć imię z email
        const emailName = transportData.responsibleEmail.split('@')[0];
        if (emailName) {
          responsible.add(emailName);
          console.log('✅ Dodano z emaila:', emailName);
        }
      }
    });
    
    const result = Array.from(responsible).filter(Boolean);
    console.log('🎯 Finalne osoby odpowiedzialne:', result);
    
    // Jeśli nadal brak, spróbuj z oryginalnego transportu
    if (result.length === 0) {
      console.log('⚠️ Brak osób odpowiedzialnych, sprawdzam oryginalny transport...');
      if (transport.responsible_person) {
        result.push(transport.responsible_person);
        console.log('✅ Dodano z oryginalnego transport.responsible_person:', transport.responsible_person);
      }
      if (transport.created_by) {
        result.push(transport.created_by);
        console.log('✅ Dodano z oryginalnego transport.created_by:', transport.created_by);
      }
    }
    
    return result;
  };

  // Funkcja do zbierania tras - NAPRAWIONA
  const getAllRoutes = () => {
    const allTransports = getAllTransportsData();
    console.log('=== DEBUG getAllRoutes ===');
    console.log('Wszystkie transporty dla tras:', allTransports);
    
    const routes = allTransports.map(transportData => {
      const route = transportData.route || getTransportRoute(transportData) || 'Nie podano';
      console.log(`Transport ${transportData.id}: trasa "${route}"`);
      
      return {
        id: transportData.id,
        orderNumber: transportData.orderNumber,
        route: route,
        mpk: transportData.mpk
      };
    });
    
    console.log('🎯 Finalne trasy:', routes);
    return routes;
  };

  // NOWA FUNKCJA: Oblicz łączną odległość wszystkich transportów
  const getRealDistance = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG getRealDistance ===');
      console.log('Transport ID:', transport.id);
      console.log('Effective transport ID:', effectiveTransport.id);
      
      // 1. Sprawdź w response_data czy jest już obliczona łączna odległość
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        console.log('Response_data dla odległości:', responseData);
        
        // Sprawdź różne pola z obliczoną odległością trasy
        if (responseData.realRouteDistance && responseData.realRouteDistance > 0) {
          console.log('✅ Zwracam realRouteDistance:', responseData.realRouteDistance);
          return responseData.realRouteDistance;
        }
        if (responseData.totalDistance && responseData.totalDistance > 0) {
          console.log('✅ Zwracam totalDistance:', responseData.totalDistance);
          return responseData.totalDistance;
        }
        if (responseData.distance && responseData.distance > 0) {
          console.log('✅ Zwracam distance:', responseData.distance);
          return responseData.distance;
        }
      }
      
      // 2. Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalDistance && mergedData.totalDistance > 0) {
        console.log('✅ Zwracam mergedData.totalDistance:', mergedData.totalDistance);
        return mergedData.totalDistance;
      }
      
      // 3. Jeśli nie ma obliczonej odległości, spróbuj zsumować odległości poszczególnych transportów
      const allTransports = getAllTransportsData();
      let totalDistance = 0;
      let foundAnyDistance = false;
      
      console.log('Próbuję zsumować odległości z transportów:', allTransports.length);
      
      allTransports.forEach(transportData => {
        const distance = transportData.distance_km || transportData.distanceKm || 0;
        console.log(`Transport ${transportData.id}: odległość ${distance} km`);
        if (distance > 0) {
          totalDistance += parseFloat(distance) || 0;
          foundAnyDistance = true;
        }
      });
      
      if (foundAnyDistance && totalDistance > 0) {
        console.log('✅ Zsumowano odległości transportów:', totalDistance);
        return Math.round(totalDistance);
      }
      
      console.log('❌ Nie znaleziono żadnej odległości, zwracam 0');
      return 0;
    } catch (e) {
      console.error('❌ Błąd pobierania odległości:', e);
      return 0;
    }
  };

  // NOWA FUNKCJA: Oblicz łączną wartość wszystkich transportów
  const getTotalValue = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG getTotalValue ===');
      console.log('Transport ID:', transport.id);
      console.log('Effective transport ID:', effectiveTransport.id);
      
      // 1. Sprawdź w response_data czy jest już obliczona łączna wartość
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        console.log('Response data dla wartości:', responseData);
        
        // Sprawdź różne pola z obliczoną wartością
        if (responseData.totalDeliveryPrice && responseData.totalDeliveryPrice > 0) {
          console.log('✅ Zwracam totalDeliveryPrice:', responseData.totalDeliveryPrice);
          return responseData.totalDeliveryPrice;
        }
        if (responseData.totalPrice && responseData.totalPrice > 0) {
          console.log('✅ Zwracam totalPrice:', responseData.totalPrice);
          return responseData.totalPrice;
        }
        if (responseData.deliveryPrice && responseData.deliveryPrice > 0) {
          console.log('✅ Zwracam deliveryPrice:', responseData.deliveryPrice);
          return responseData.deliveryPrice;
        }
      }
      
      // 2. Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalValue && mergedData.totalValue > 0) {
        console.log('✅ Zwracam mergedData.totalValue:', mergedData.totalValue);
        return mergedData.totalValue;
      }
      
      // 3. Sprawdź w merged_transports
      if (effectiveTransport.merged_transports) {
        const mergedTransportsData = typeof effectiveTransport.merged_transports === 'string' 
          ? JSON.parse(effectiveTransport.merged_transports) 
          : effectiveTransport.merged_transports;
        if (mergedTransportsData?.totalMergedCost && mergedTransportsData.totalMergedCost > 0) {
          console.log('✅ Zwracam totalMergedCost:', mergedTransportsData.totalMergedCost);
          return mergedTransportsData.totalMergedCost;
        }
        if (mergedTransportsData?.totalValue && mergedTransportsData.totalValue > 0) {
          console.log('✅ Zwracam merged totalValue:', mergedTransportsData.totalValue);
          return mergedTransportsData.totalValue;
        }
      }
      
      // 4. Sprawdź w response (stary format)
      if (effectiveTransport.response?.deliveryPrice && effectiveTransport.response.deliveryPrice > 0) {
        console.log('✅ Zwracam response.deliveryPrice:', effectiveTransport.response.deliveryPrice);
        return effectiveTransport.response.deliveryPrice;
      }
      
      console.log('❌ Nie znaleziono wartości, zwracam 0');
      return 0;
    } catch (e) {
      console.error('❌ Błąd pobierania wartości:', e);
      return 0;
    }
  };

  // Sprawdź czy to transport połączony
  const isConnectedTransport = () => {
    console.log('=== DEBUG isConnectedTransport ===');
    
    // 1. Sprawdź najpierw flagę w response_data
    try {
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        console.log('Response_data dla sprawdzenia połączenia:', responseData);
        
        if (responseData.isMerged === true) {
          console.log('✅ Transport połączony - flaga isMerged');
          return true;
        }
      }
    } catch (e) {
      console.error('Błąd sprawdzania response_data:', e);
    }
    
    // 2. Sprawdź czy jest merged_transports
    if (transport.merged_transports) {
      console.log('✅ Transport połączony - ma merged_transports');
      return true;
    }
    
    // 3. Sprawdź inne flagi
    if (transport.is_merged === true || transport.isMerged === true) {
      console.log('✅ Transport połączony - flaga is_merged/isMerged');
      return true;
    }
    
    // 4. Sprawdź liczbę transportów
    const allTransports = getAllTransportsData();
    const isConnected = allTransports.length > 1;
    console.log(`Liczba transportów: ${allTransports.length}, połączony: ${isConnected}`);
    
    return isConnected;
  };

  // Jeśli to nie transport połączony, nie wyświetlaj komponentu
  if (!isConnectedTransport()) {
    return null;
  }

  // Pobieranie danych z debugowaniem
  const allMPKs = collectUniqueValues('mpk');
  const allDocuments = collectUniqueValues('documents');
  const allClients = collectUniqueValues('clientName');
  const allResponsible = collectAllResponsible();
  const allRoutes = getAllRoutes();
  const realDistance = getRealDistance();
  const totalValue = getTotalValue();

  console.log('=== FINALNE DANE DO WYŚWIETLENIA ===');
  console.log('Odległość (realDistance):', realDistance);
  console.log('Wartość (totalValue):', totalValue);
  console.log('Liczba tras (allRoutes):', allRoutes.length);
  console.log('Liczba odpowiedzialnych (allResponsible):', allResponsible.length);
  console.log('Wszystkie trasy:', allRoutes);
  console.log('Wszystkie odpowiedzialni:', allResponsible);

  return (
    <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <Route size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-purple-800">
              Transport Połączony
            </h3>
            <p className="text-purple-600 text-sm">
              {allRoutes.length} tras w jednym zleceniu
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-800">
            {realDistance > 0 ? `${realDistance} km` : 'Brak danych'}
          </div>
          <p className="text-purple-600 text-sm">Łączna odległość</p>
        </div>
      </div>

      {/* Główne informacje w kafelkach */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Łączna wartość */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-green-600" />
            <h4 className="font-semibold text-gray-800">Łączna wartość</h4>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {totalValue > 0 ? `${totalValue.toLocaleString()} PLN` : 'Brak danych'}
          </div>
        </div>

        {/* Klienci */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-600" />
            <h4 className="font-semibold text-gray-800">Klienci ({allClients.length})</h4>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {allClients.map((client, index) => (
              <div key={index} className="text-sm text-gray-700 border-l-2 border-blue-200 pl-2">
                {client}
              </div>
            ))}
            {allClients.length === 0 && (
              <div className="text-sm text-gray-400">Brak danych</div>
            )}
          </div>
        </div>

        {/* Dokumenty */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-orange-600" />
            <h4 className="font-semibold text-gray-800">Dokumenty ({allDocuments.length})</h4>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {allDocuments.map((doc, index) => (
              <div key={index} className="text-sm text-gray-700 border-l-2 border-orange-200 pl-2">
                {doc}
              </div>
            ))}
            {allDocuments.length === 0 && (
              <div className="text-sm text-gray-400">Brak danych</div>
            )}
          </div>
        </div>

        {/* Odpowiedzialni */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Odpowiedzialni ({allResponsible.length})</h4>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {allResponsible.map((person, index) => (
              <div key={index} className="text-sm text-gray-700 border-l-2 border-purple-200 pl-2">
                {person}
              </div>
            ))}
            {allResponsible.length === 0 && (
              <div className="text-sm text-gray-400">Brak danych</div>
            )}
          </div>
        </div>
      </div>

      {/* Lista tras */}
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin size={18} className="text-purple-600" />
          Wszystkie trasy w zleceniu
        </h4>
        <div className="space-y-2">
          {allRoutes.map((route, index) => (
            <div key={route.id} className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{route.route}</div>
                  <div className="text-xs text-gray-500">Zlecenie: {route.orderNumber}</div>
                </div>
              </div>
              {route.mpk && (
                <div className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                  MPK: {route.mpk}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default MergedTransportSummary;