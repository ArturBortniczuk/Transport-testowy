import React from 'react';
import { 
  Truck, 
  MapPin, 
  FileText, 
  Users, 
  Calculator, 
  Route,
  Hash,
  DollarSign
} from 'lucide-react';

const MergedTransportSummary = ({ transport, mergedData }) => {
  if (!transport) {
    return null;
  }

  // Funkcja do pobrania właściwych danych transportu (głównego lub obecnego)
  const getEffectiveTransportData = () => {
    // Sprawdź czy to transport dodatkowy
    if (transport.response_data) {
      const responseData = typeof transport.response_data === 'string' 
        ? JSON.parse(transport.response_data) 
        : transport.response_data;
      
      if (responseData.isSecondaryMerged && mainTransportData) {
        // Użyj danych z głównego transportu
        return mainTransportData;
      }
    }
    
    // Użyj danych obecnego transportu (transport główny lub brak danych głównego)
    return transport;
  };

  // Funkcja do pobierania wszystkich danych transportów (zarówno głównego jak i połączonych)
  const getAllTransportsData = () => {
    const allTransports = [];
    
    // ZAWSZE dodaj główny transport
    allTransports.push({
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
    });

    // Sprawdź różne źródła danych o połączonych transportach
    
    // 1. Dane z response_data (nowy format)
    if (transport.response_data) {
      try {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        // Sprawdź czy są oryginalne transporty w response_data
        if (responseData.originalTransports && Array.isArray(responseData.originalTransports)) {
          responseData.originalTransports.forEach(originalTransport => {
            if (!allTransports.find(t => t.id === originalTransport.id)) {
              allTransports.push({
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
              });
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania response_data:', e);
      }
    }

    // 2. Dane z mergedData (przekazane z rodzica)
    if (mergedData?.originalTransports && Array.isArray(mergedData.originalTransports)) {
      mergedData.originalTransports.forEach(originalTransport => {
        // Sprawdź czy ten transport nie został już dodany
        if (!allTransports.find(t => t.id === originalTransport.id)) {
          allTransports.push({
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
          });
        }
      });
    }

    // 3. Dane z merged_transports (stary format)
    if (transport.merged_transports) {
      try {
        const mergedTransportsData = typeof transport.merged_transports === 'string' 
          ? JSON.parse(transport.merged_transports) 
          : transport.merged_transports;
        
        if (mergedTransportsData.originalTransports && Array.isArray(mergedTransportsData.originalTransports)) {
          mergedTransportsData.originalTransports.forEach(originalTransport => {
            // Sprawdź czy ten transport nie został już dodany
            if (!allTransports.find(t => t.id === originalTransport.id)) {
              allTransports.push({
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
              });
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania merged_transports:', e);
      }
    }

    return allTransports;
  };

  // Funkcja pomocnicza do formatowania trasy
  const getTransportRoute = (transportItem) => {
    if (!transportItem) return '';
    
    const start = transportItem.location === 'Odbiory własne' && transportItem.producerAddress 
      ? transportItem.producerAddress.city 
      : (transportItem.location || '').replace('Magazyn ', '');
    
    const end = transportItem.delivery?.city || transportItem.delivery_data?.city || 'Brak danych';
    
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

  // Funkcja do zbierania wszystkich odpowiedzialnych osób
  const collectAllResponsible = () => {
    const allTransports = getAllTransportsData();
    const responsible = new Set();
    
    allTransports.forEach(transportData => {
      if (transportData.responsiblePerson) {
        responsible.add(transportData.responsiblePerson);
      }
    });
    
    return Array.from(responsible).filter(Boolean);
  };

  // Funkcja do zbierania tras
  const getAllRoutes = () => {
    const allTransports = getAllTransportsData();
    return allTransports.map(transportData => ({
      id: transportData.id,
      orderNumber: transportData.orderNumber,
      route: transportData.route || 'Nie podano',
      mpk: transportData.mpk
    }));
  };

  // NOWA FUNKCJA: Oblicz łączną odległość wszystkich transportów
  const getRealDistance = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG ODLEGŁOŚĆ ===');
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
          console.log('Zwracam realRouteDistance:', responseData.realRouteDistance);
          return responseData.realRouteDistance;
        }
        if (responseData.totalDistance && responseData.totalDistance > 0) {
          console.log('Zwracam totalDistance:', responseData.totalDistance);
          return responseData.totalDistance;
        }
        if (responseData.distance && responseData.distance > 0) {
          console.log('Zwracam distance:', responseData.distance);
          return responseData.distance;
        }
      }
      
      // 2. Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalDistance && mergedData.totalDistance > 0) {
        console.log('Zwracam mergedData.totalDistance:', mergedData.totalDistance);
        return mergedData.totalDistance;
      }
      
      // 3. Jeśli nie ma obliczonej odległości, spróbuj zsumować odległości poszczególnych transportów
      const allTransports = getAllTransportsData();
      let totalDistance = 0;
      
      console.log('Wszystkie transporty do sumowania odległości:', allTransports);
      
      allTransports.forEach(transportData => {
        const distance = transportData.distance_km || transportData.distanceKm || 0;
        console.log(`Transport ${transportData.id}: odległość ${distance} km`);
        totalDistance += parseFloat(distance) || 0;
      });
      
      if (totalDistance > 0) {
        console.log('Zsumowano odległości transportów:', totalDistance);
        return Math.round(totalDistance);
      }
      
      console.log('Nie znaleziono odległości, zwracam 0');
      return 0;
    } catch (e) {
      console.error('Błąd pobierania odległości:', e);
      return 0;
    }
  };

  // NOWA FUNKCJA: Oblicz łączną wartość wszystkich transportów
  const getTotalValue = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG WARTOŚĆ ===');
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
          console.log('Zwracam totalDeliveryPrice:', responseData.totalDeliveryPrice);
          return responseData.totalDeliveryPrice;
        }
        if (responseData.totalPrice && responseData.totalPrice > 0) {
          console.log('Zwracam totalPrice:', responseData.totalPrice);
          return responseData.totalPrice;
        }
        if (responseData.deliveryPrice && responseData.deliveryPrice > 0) {
          console.log('Zwracam deliveryPrice:', responseData.deliveryPrice);
          return responseData.deliveryPrice;
        }
      }
      
      // 2. Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalValue && mergedData.totalValue > 0) {
        console.log('Zwracam mergedData.totalValue:', mergedData.totalValue);
        return mergedData.totalValue;
      }
      
      // 3. Sprawdź w merged_transports
      if (effectiveTransport.merged_transports) {
        const mergedTransportsData = typeof effectiveTransport.merged_transports === 'string' 
          ? JSON.parse(effectiveTransport.merged_transports) 
          : effectiveTransport.merged_transports;
        if (mergedTransportsData?.totalMergedCost && mergedTransportsData.totalMergedCost > 0) {
          console.log('Zwracam totalMergedCost:', mergedTransportsData.totalMergedCost);
          return mergedTransportsData.totalMergedCost;
        }
        if (mergedTransportsData?.totalValue && mergedTransportsData.totalValue > 0) {
          console.log('Zwracam merged totalValue:', mergedTransportsData.totalValue);
          return mergedTransportsData.totalValue;
        }
      }
      
      // 4. Sprawdź w response (stary format)
      if (effectiveTransport.response?.deliveryPrice && effectiveTransport.response.deliveryPrice > 0) {
        console.log('Zwracam response.deliveryPrice:', effectiveTransport.response.deliveryPrice);
        return effectiveTransport.response.deliveryPrice;
      }
      
      console.log('Nie znaleziono wartości, zwracam 0');
      return 0;
    } catch (e) {
      console.error('Błąd pobierania wartości:', e);
      return 0;
    }
  };

  // Sprawdź czy to transport połączony
  const isConnectedTransport = () => {
    const allTransports = getAllTransportsData();
    return allTransports.length > 1; // Jeśli mamy więcej niż główny transport
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
            {totalValue > 0 ? `${totalValue.toLocaleString()} PLN` : 'Brak danych'}
          </div>
        </div>

        {/* Liczba klientów */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-600" />
            <h4 className="font-semibold text-gray-800">Klienci</h4>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {allClients.length}
          </div>
          <div className="text-xs text-gray-500">
            {allClients.slice(0, 2).join(', ')}
            {allClients.length > 2 && '...'}
          </div>
        </div>

        {/* Dokumenty */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-orange-600" />
            <h4 className="font-semibold text-gray-800">Dokumenty</h4>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {allDocuments.length}
          </div>
          <div className="text-xs text-gray-500">
            {allDocuments.slice(0, 2).join(', ')}
            {allDocuments.length > 2 && '...'}
          </div>
        </div>

        {/* MPK */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">MPK</h4>
          </div>
          <div className="text-sm font-bold text-purple-600">
            {allMPKs.slice(0, 3).join(', ')}
            {allMPKs.length > 3 && '...'}
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

      {/* Odpowiedzialni */}
      {allResponsible.length > 0 && (
        <div className="mt-4 bg-white rounded-lg p-4 border border-purple-100">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Users size={18} className="text-purple-600" />
            Osoby odpowiedzialne
          </h4>
          <div className="flex flex-wrap gap-2">
            {allResponsible.map((person, index) => (
              <div key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                {person}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MergedTransportSummary;