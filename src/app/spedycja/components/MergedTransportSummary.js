// src/app/spedycja/components/MergedTransportSummary.js
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

const MergedTransportSummary = ({ transport, mergedData, allTransports }) => {
  if (!transport) {
    return null;
  }

  // UKIERUNKOWANE DEBUGOWANIE - sprawdźmy co mają transporty dodatkowe
  const debugTransportData = () => {
    console.log('🐛 === UKIERUNKOWANE DEBUG ===');
    console.log('🐛 Transport ID:', transport.id);
    console.log('🐛 Response_data:', transport.response_data);
    console.log('🐛 Merged_transports:', transport.merged_transports);  
    console.log('🐛 MergedData z props:', mergedData);
    console.log('🐛 AllTransports z props:', allTransports);
    
    if (transport.response_data) {
      try {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        console.log('🐛 Parsed response_data:', responseData);
        console.log('🐛 originalTransports w response_data:', responseData.originalTransports);
        console.log('🐛 mainTransportId:', responseData.mainTransportId);
        console.log('🐛 isSecondaryMerged:', responseData.isSecondaryMerged);
      } catch (e) {
        console.log('🐛 Błąd parsowania response_data:', e);
      }
    }
    
    if (transport.merged_transports) {
      try {
        const mergedTransportsData = typeof transport.merged_transports === 'string' 
          ? JSON.parse(transport.merged_transports) 
          : transport.merged_transports;
        console.log('🐛 Parsed merged_transports:', mergedTransportsData);
        console.log('🐛 originalTransports w merged_transports:', mergedTransportsData.originalTransports);
        console.log('🐛 mainTransportId:', mergedTransportsData.mainTransportId);
        console.log('🐛 isSecondary:', mergedTransportsData.isSecondary);
      } catch (e) {
        console.log('🐛 Błąd parsowania merged_transports:', e);
      }
    }
  };
  
  // Wywołaj debug
  debugTransportData();

  // FUNKCJA: Pobierz dane głównego transportu jeśli obecny jest dodatkowy
  const getMainTransportData = () => {
    // Sprawdź czy to transport dodatkowy
    let mainTransportId = null;
    
    if (transport.response_data) {
      try {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        if (responseData.isSecondaryMerged && responseData.mainTransportId) {
          mainTransportId = responseData.mainTransportId;
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (!mainTransportId && transport.merged_transports) {
      try {
        const mergedTransportsData = typeof transport.merged_transports === 'string' 
          ? JSON.parse(transport.merged_transports) 
          : transport.merged_transports;
        
        if (mergedTransportsData.isSecondary && mergedTransportsData.mainTransportId) {
          mainTransportId = mergedTransportsData.mainTransportId;
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Jeśli nie ma ID głównego transportu, zwróć null
    if (!mainTransportId) {
      return null;
    }
    
    console.log('🔍 Szukam głównego transportu o ID:', mainTransportId);
    
    // Znajdź główny transport na liście allTransports
    if (allTransports && Array.isArray(allTransports)) {
      const mainTransport = allTransports.find(t => t.id === mainTransportId);
      if (mainTransport) {
        console.log('✅ Znaleziono główny transport:', mainTransport);
        return mainTransport;
      }
    }
    
    console.log('❌ Nie znaleziono głównego transportu');
    return null;
  };

  // Funkcja do pobrania wszystkich danych transportów (zarówno głównego jak i połączonych)
  const getAllTransportsData = () => {
    const allTransports = [];
    const addedIds = new Set(); // Śledź już dodane transporty
    
    // Sprawdź czy to transport dodatkowy i pobierz dane głównego
    const mainTransport = getMainTransportData();
    let effectiveMergedData = mergedData;
    
    if (mainTransport) {
      console.log('🔄 Transport dodatkowy - używam danych z głównego transportu');
      
      // Jeśli główny transport ma pełne mergedData, użyj ich
      // To powinno być przekazane przez komponent rodzica, ale na razie spróbujmy
      // Będziemy musieli sprawdzić czy główny transport ma pełne dane
    }
    
    // ZAWSZE dodaj obecny transport jako pierwszy
    const currentTransportData = {
      id: transport.id,
      orderNumber: transport.order_number || transport.orderNumber,
      mpk: transport.mpk,
      documents: transport.documents,
      clientName: transport.client_name || transport.clientName,
      responsiblePerson: transport.responsible_person || transport.responsiblePerson,
      location: transport.location,
      delivery_data: transport.delivery_data,
      route: getTransportRoute(transport),
      distance_km: transport.distance_km,
      distanceKm: transport.distanceKm
    };
    
    allTransports.push(currentTransportData);
    addedIds.add(transport.id);

    // 1. Sprawdź mergedData przekazane z rodzica (najważniejsze źródło)
    if (effectiveMergedData?.originalTransports && Array.isArray(effectiveMergedData.originalTransports) && effectiveMergedData.originalTransports.length > 0) {
      console.log('✅ Używam pełnych danych z mergedData:', effectiveMergedData.originalTransports);
      effectiveMergedData.originalTransports.forEach(originalTransport => {
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
        }
      });
    } else {
      console.log('⚠️ MergedData są puste, sprawdzam inne źródła...');
      
      // 2. Sprawdź response_data (backup)
      if (transport.response_data) {
        try {
          const responseData = typeof transport.response_data === 'string' 
            ? JSON.parse(transport.response_data) 
            : transport.response_data;
          
          if (responseData.originalTransports && Array.isArray(responseData.originalTransports)) {
            responseData.originalTransports.forEach(originalTransport => {
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
              }
            });
          }
        } catch (e) {
          console.error('Błąd parsowania response_data:', e);
        }
      }
      
      // 3. Sprawdź merged_transports (backup)
      if (transport.merged_transports) {
        try {
          const mergedTransportsData = typeof transport.merged_transports === 'string' 
            ? JSON.parse(transport.merged_transports) 
            : transport.merged_transports;
          
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
              }
            });
          }
        } catch (e) {
          console.error('Błąd parsowania merged_transports:', e);
        }
      }
    }

    console.log(`🐛 Finalne transporty (${allTransports.length}):`, allTransports.map(t => `ID: ${t.id}, Order: ${t.orderNumber}`));
    
    return allTransports;
  };

  // Funkcja do pobrania właściwych danych transportu (głównego lub obecnego)  
  const getEffectiveTransportData = () => {
    // Dla połączonych transportów zawsze używaj obecnego transportu
    // bo dane o całej grupie powinny być w każdym z połączonych transportów
    return transport;
  };

  // Funkcja pomocnicza do formatowania trasy - UPROSZCZONA
  const getTransportRoute = (transportItem) => {
    if (!transportItem) return 'Brak danych';
    
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
        // ignore
      }
    } else if (transportItem.delivery) {
      end = transportItem.delivery.city || transportItem.delivery.address || 'Brak danych';
    }
    
    return `${start} → ${end}`;
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

  // Funkcja do zbierania wszystkich odpowiedzialnych osób - UPROSZCZONA
  const collectAllResponsible = () => {
    const allTransports = getAllTransportsData();
    const responsible = new Set();
    
    allTransports.forEach(transportData => {
      // Sprawdź różne możliwe pola z osobami odpowiedzialnymi
      if (transportData.responsiblePerson && transportData.responsiblePerson.trim()) {
        responsible.add(transportData.responsiblePerson.trim());
      }
      if (transportData.responsible_person && transportData.responsible_person.trim()) {
        responsible.add(transportData.responsible_person.trim());
      }
      if (transportData.createdBy && transportData.createdBy.trim()) {
        responsible.add(transportData.createdBy.trim());
      }
      if (transportData.created_by && transportData.created_by.trim()) {
        responsible.add(transportData.created_by.trim());
      }
    });
    
    const result = Array.from(responsible).filter(Boolean);
    
    // Jeśli nadal brak, spróbuj z oryginalnego transportu
    if (result.length === 0) {
      if (transport.responsible_person) {
        result.push(transport.responsible_person);
      }
      if (transport.created_by) {
        result.push(transport.created_by);
      }
    }
    
    return result;
  };

  // Funkcja do zbierania tras - UPROSZCZONA
  const getAllRoutes = () => {
    const allTransports = getAllTransportsData();
    
    const routes = allTransports.map(transportData => {
      const route = transportData.route || getTransportRoute(transportData);
      return route;
    }).filter(route => route && route !== 'Brak danych');
    
    return routes;
  };

  // NOWA FUNKCJA: Oblicz rzeczywistą odległość trasy - Z WSPARCIEM DLA TRANSPORTÓW DODATKOWYCH
  const getRealDistance = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      // Jeśli to transport dodatkowy, sprawdź czy mamy dane głównego transportu
      const mainTransport = getMainTransportData();
      if (mainTransport) {
        console.log('🔄 Transport dodatkowy - sprawdzam odległość z głównego transportu');
      }
      
      // 1. Sprawdź w mergedData przekazanych z rodzica (najważniejsze dla głównego transportu)
      if (mergedData?.totalDistance && mergedData.totalDistance > 0) {
        console.log('✅ Zwracam mergedData.totalDistance:', mergedData.totalDistance);
        return mergedData.totalDistance;
      }
      
      // 2. Sprawdź w response_data czy jest już obliczona odległość trasy
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        // Sprawdź różne pola z obliczoną odległością trasy
        if (responseData.realRouteDistance && responseData.realRouteDistance > 0) {
          return responseData.realRouteDistance;
        }
        if (responseData.totalDistance && responseData.totalDistance > 0) {
          return responseData.totalDistance;
        }
        if (responseData.distance && responseData.distance > 0) {
          return responseData.distance;
        }
      }
      
      // 3. Jeśli nie ma obliczonej odległości, spróbuj zsumować odległości poszczególnych transportów
      const allTransports = getAllTransportsData();
      let totalDistance = 0;
      let foundAnyDistance = false;
      
      allTransports.forEach(transportData => {
        const distance = transportData.distance_km || transportData.distanceKm || 0;
        if (distance > 0) {
          totalDistance += parseFloat(distance) || 0;
          foundAnyDistance = true;
        }
      });
      
      if (foundAnyDistance && totalDistance > 0) {
        return Math.round(totalDistance);
      }
      
      return 0;
    } catch (e) {
      console.error('❌ Błąd pobierania odległości:', e);
      return 0;
    }
  };

  // NOWA FUNKCJA: Oblicz łączną wartość wszystkich transportów - Z WSPARCIEM DLA TRANSPORTÓW DODATKOWYCH
  const getTotalValue = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      // Jeśli to transport dodatkowy, sprawdź czy mamy dane głównego transportu
      const mainTransport = getMainTransportData();
      if (mainTransport) {
        console.log('🔄 Transport dodatkowy - sprawdzam wartość z głównego transportu');
      }
      
      // 1. Sprawdź w mergedData przekazanych z rodzica (najważniejsze dla głównego transportu)
      if (mergedData?.totalValue && mergedData.totalValue > 0) {
        console.log('✅ Zwracam mergedData.totalValue:', mergedData.totalValue);
        return mergedData.totalValue;
      }
      
      // 2. Sprawdź w response_data czy jest już obliczona łączna wartość
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        // Sprawdź różne pola z obliczoną wartością
        if (responseData.totalDeliveryPrice && responseData.totalDeliveryPrice > 0) {
          return responseData.totalDeliveryPrice;
        }
        if (responseData.totalPrice && responseData.totalPrice > 0) {
          return responseData.totalPrice;
        }
        if (responseData.deliveryPrice && responseData.deliveryPrice > 0) {
          return responseData.deliveryPrice;
        }
      }
      
      // 3. Sprawdź w merged_transports
      if (effectiveTransport.merged_transports) {
        const mergedTransportsData = typeof effectiveTransport.merged_transports === 'string' 
          ? JSON.parse(effectiveTransport.merged_transports) 
          : effectiveTransport.merged_transports;
        if (mergedTransportsData?.totalMergedCost && mergedTransportsData.totalMergedCost > 0) {
          return mergedTransportsData.totalMergedCost;
        }
        if (mergedTransportsData?.totalValue && mergedTransportsData.totalValue > 0) {
          return mergedTransportsData.totalValue;
        }
      }
      
      // 4. Sprawdź w response (stary format)
      if (effectiveTransport.response?.deliveryPrice && effectiveTransport.response.deliveryPrice > 0) {
        return effectiveTransport.response.deliveryPrice;
      }
      
      return 0;
    } catch (e) {
      console.error('❌ Błąd pobierania wartości:', e);
      return 0;
    }
  };

  // Sprawdź czy to transport połączony - UPROSZCZONE
  const isConnectedTransport = () => {
    // 1. Sprawdź najpierw flagę w response_data
    try {
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        if (responseData.isMerged === true) {
          return true;
        }
      }
    } catch (e) {
      console.error('Błąd sprawdzania response_data:', e);
    }
    
    // 2. Sprawdź czy jest merged_transports
    if (transport.merged_transports) {
      return true;
    }
    
    // 3. Sprawdź inne flagi
    if (transport.is_merged === true || transport.isMerged === true) {
      return true;
    }
    
    // 4. Sprawdź liczbę transportów
    const allTransports = getAllTransportsData();
    return allTransports.length > 1;
  };

  // Jeśli to nie transport połączony, nie wyświetlaj komponentu
  if (!isConnectedTransport()) {
    return null;
  }

  // Pobieranie danych
  const allMPKs = collectUniqueValues('mpk');
  const allDocuments = collectUniqueValues('documents');
  const allClients = collectUniqueValues('clientName');
  const allResponsible = collectAllResponsible();
  const allRoutes = getAllRoutes();
  const realDistance = getRealDistance();
  const totalValue = getTotalValue();

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
            {totalValue > 0 ? `${totalValue} PLN` : 'Brak danych'}
          </div>
        </div>

        {/* Klienci */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-600" />
            <h4 className="font-semibold text-gray-800">Klienci ({allClients.length})</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {allClients.slice(0, 2).map((client, idx) => (
              <div key={idx} className="truncate">{client}</div>
            ))}
            {allClients.length > 2 && (
              <div className="text-xs text-gray-500">...i {allClients.length - 2} więcej</div>
            )}
          </div>
        </div>

        {/* Dokumenty */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-orange-600" />
            <h4 className="font-semibold text-gray-800">Dokumenty ({allDocuments.length})</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {allDocuments.slice(0, 2).map((doc, idx) => (
              <div key={idx} className="truncate">{doc}</div>
            ))}
            {allDocuments.length > 2 && (
              <div className="text-xs text-gray-500">...i {allDocuments.length - 2} więcej</div>
            )}
          </div>
        </div>

        {/* Odpowiedzialni */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-indigo-600" />
            <h4 className="font-semibold text-gray-800">Odpowiedzialni ({allResponsible.length})</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {allResponsible.slice(0, 2).map((person, idx) => (
              <div key={idx} className="truncate">{person}</div>
            ))}
            {allResponsible.length > 2 && (
              <div className="text-xs text-gray-500">...i {allResponsible.length - 2} więcej</div>
            )}
          </div>
        </div>
      </div>

      {/* Sekwencja trasy */}
      <div className="bg-white rounded-lg p-4 border border-purple-100 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={18} className="text-purple-600" />
          <h4 className="font-semibold text-gray-800">Sekwencja trasy</h4>
        </div>
        <div className="space-y-2">
          {allRoutes.map((route, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
              <div className="bg-purple-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                {idx + 1}
              </div>
              <span className="text-sm font-medium text-gray-700">{route}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Numery zleceń */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Numery połączonych zleceń:</h4>
        <div className="flex flex-wrap gap-2">
          {collectUniqueValues('orderNumber').map((orderNum, idx) => (
            <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              {orderNum}
            </span>
          ))}
        </div>
      </div>

      {/* Podsumowanie */}
      <div className="mt-4 text-sm text-purple-700 bg-purple-100 p-3 rounded-md">
        <strong>Informacja:</strong> To zlecenie obejmuje {allRoutes.length} połączonych transportów. 
        Wszystkie szczegóły tras i punktów dostawy są wyświetlone powyżej.
      </div>
    </div>
  );
};

export default MergedTransportSummary;