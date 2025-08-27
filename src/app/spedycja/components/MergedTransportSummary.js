import React from 'react';
import { 
  Truck, 
  MapPin, 
  FileText, 
  Users, 
  Calculator, 
  Route,
  Hash
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
      route: getTransportRoute(transport)
    });

    // Sprawdź różne źródła danych o połączonych transportach
    
    // 1. Dane z response_data (nowy format)
    if (transport.response_data) {
      try {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        // Jeśli mamy routeSequence, wyciągnij z niego transporty
        if (responseData.routeSequence && Array.isArray(responseData.routeSequence)) {
          const uniqueTransportIds = new Set();
          
          responseData.routeSequence.forEach(point => {
            if (point.transportId && point.transport && !uniqueTransportIds.has(point.transportId)) {
              uniqueTransportIds.add(point.transportId);
              
              // Dodaj tylko jeśli to nie główny transport
              if (point.transportId !== transport.id) {
                allTransports.push({
                  id: point.transportId,
                  orderNumber: point.transport.orderNumber,
                  mpk: point.transport.mpk,
                  documents: point.transport.documents,
                  clientName: point.transport.clientName || point.transport.client_name,
                  responsiblePerson: point.transport.responsiblePerson || point.transport.responsible_person,
                  location: point.transport.location,
                  delivery_data: point.transport.delivery || point.transport.delivery_data,
                  route: `${point.transport.location?.replace('Magazyn ', '') || point.city} → ${point.transport.delivery?.city || point.transport.delivery_data?.city || ''}`
                });
              }
            }
          });
        }
        
        // Alternatywnie, jeśli mamy mergedTransportIds z dodatkowymi danymi
        else if (responseData.mergedTransportIds && Array.isArray(responseData.mergedTransportIds)) {
          responseData.mergedTransportIds.forEach(transportData => {
            if (transportData && typeof transportData === 'object' && transportData.id !== transport.id) {
              allTransports.push({
                id: transportData.id,
                orderNumber: transportData.orderNumber,
                mpk: transportData.mpk,
                documents: transportData.documents,
                clientName: transportData.clientName || transportData.client_name,
                responsiblePerson: transportData.responsiblePerson || transportData.responsible_person,
                location: transportData.location,
                delivery_data: transportData.delivery || transportData.delivery_data,
                route: transportData.route || `${transportData.location?.replace('Magazyn ', '') || ''} → ${transportData.delivery?.city || transportData.delivery_data?.city || ''}`
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
            orderNumber: originalTransport.orderNumber,
            mpk: originalTransport.mpk,
            documents: originalTransport.documents,
            clientName: originalTransport.clientName || originalTransport.client_name,
            responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
            location: originalTransport.location,
            delivery_data: originalTransport.delivery_data,
            route: originalTransport.route
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
                orderNumber: originalTransport.orderNumber,
                mpk: originalTransport.mpk,
                documents: originalTransport.documents,
                clientName: originalTransport.clientName || originalTransport.client_name,
                responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
                location: originalTransport.location,
                delivery_data: originalTransport.delivery_data,
                route: originalTransport.route
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

  // Oblicz odległość rzeczywistą
  const getRealDistance = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG ODLEGŁOŚĆ ===');
      console.log('Transport ID:', transport.id);
      console.log('Effective transport ID:', effectiveTransport.id);
      console.log('Is loading main transport:', isLoadingMainTransport);
      
      // Sprawdź w response_data
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        console.log('Effective response_data:', responseData);
        console.log('distance:', responseData.distance);
        console.log('realRouteDistance:', responseData.realRouteDistance);
        console.log('totalDistance:', responseData.totalDistance);
        
        // Użyj danych z efektywnego transportu (głównego dla transportu dodatkowego)
        if (responseData.distance) {
          console.log('Zwracam distance:', responseData.distance);
          return responseData.distance;
        }
        if (responseData.realRouteDistance) {
          console.log('Zwracam realRouteDistance:', responseData.realRouteDistance);
          return responseData.realRouteDistance;
        }
        if (responseData.totalDistance) {
          console.log('Zwracam totalDistance:', responseData.totalDistance);
          return responseData.totalDistance;
        }
      }
      
      // Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalDistance) {
        console.log('Zwracam mergedData.totalDistance:', mergedData.totalDistance);
        return mergedData.totalDistance;
      }
      
      // Sprawdź w merged_transports
      if (effectiveTransport.merged_transports) {
        const mergedTransportsData = typeof effectiveTransport.merged_transports === 'string' 
          ? JSON.parse(effectiveTransport.merged_transports) 
          : effectiveTransport.merged_transports;
        console.log('merged_transports data:', mergedTransportsData);
        if (mergedTransportsData?.totalDistance) {
          console.log('Zwracam merged_transports totalDistance:', mergedTransportsData.totalDistance);
          return mergedTransportsData.totalDistance;
        }
      }
      
      // Sprawdź podstawowe pola odległości transportu
      if (effectiveTransport.distance_km) {
        console.log('Zwracam distance_km:', effectiveTransport.distance_km);
        return effectiveTransport.distance_km;
      }
      if (effectiveTransport.distanceKm) {
        console.log('Zwracam distanceKm:', effectiveTransport.distanceKm);
        return effectiveTransport.distanceKm;
      }
      
      console.log('Nie znaleziono odległości, zwracam 0');
      return 0;
    } catch (e) {
      console.error('Błąd pobierania odległości:', e);
      return 0;
    }
  };

  // Oblicz łączną wartość transportu
  const getTotalValue = () => {
    try {
      const effectiveTransport = getEffectiveTransportData();
      
      console.log('=== DEBUG WARTOŚĆ ===');
      console.log('Transport ID:', transport.id);
      console.log('Effective transport ID:', effectiveTransport.id);
      
      // Sprawdź w response_data
      if (effectiveTransport.response_data) {
        const responseData = typeof effectiveTransport.response_data === 'string' 
          ? JSON.parse(effectiveTransport.response_data) 
          : effectiveTransport.response_data;
        
        console.log('Effective response data dla wartości:', responseData);
        console.log('totalDeliveryPrice:', responseData.totalDeliveryPrice);
        console.log('totalPrice:', responseData.totalPrice);
        console.log('deliveryPrice:', responseData.deliveryPrice);
        
        // Użyj danych z efektywnego transportu (głównego dla transportu dodatkowego)
        if (responseData.totalDeliveryPrice) {
          console.log('Zwracam totalDeliveryPrice:', responseData.totalDeliveryPrice);
          return responseData.totalDeliveryPrice;
        }
        if (responseData.totalPrice) {
          console.log('Zwracam totalPrice:', responseData.totalPrice);
          return responseData.totalPrice;
        }
        if (responseData.deliveryPrice) {
          console.log('Zwracam deliveryPrice:', responseData.deliveryPrice);
          return responseData.deliveryPrice;
        }
      }
      
      // Sprawdź w mergedData przekazanych z rodzica
      if (mergedData?.totalValue) {
        console.log('Zwracam mergedData.totalValue:', mergedData.totalValue);
        return mergedData.totalValue;
      }
      
      // Sprawdź w merged_transports
      if (effectiveTransport.merged_transports) {
        const mergedTransportsData = typeof effectiveTransport.merged_transports === 'string' 
          ? JSON.parse(effectiveTransport.merged_transports) 
          : effectiveTransport.merged_transports;
        if (mergedTransportsData?.totalMergedCost) {
          console.log('Zwracam totalMergedCost:', mergedTransportsData.totalMergedCost);
          return mergedTransportsData.totalMergedCost;
        }
        if (mergedTransportsData?.totalValue) {
          console.log('Zwracam merged totalValue:', mergedTransportsData.totalValue);
          return mergedTransportsData.totalValue;
        }
      }
      
      // Sprawdź w response (stary format)
      if (effectiveTransport.response?.deliveryPrice) {
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
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-800">
            {realDistance > 0 ? `${realDistance} km` : 'Brak danych'}
          </div>
          <div className="text-sm text-purple-600">rzeczywista trasa</div>
        </div>
      </div>

      {/* Siatka z podsumowaniem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Dokumenty */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Dokumenty</h4>
          </div>
          <div className="space-y-1">
            {allDocuments.length > 0 ? (
              allDocuments.map((doc, index) => (
                <div key={index} className="text-sm bg-gray-50 px-2 py-1 rounded border">
                  {doc}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">Brak danych</div>
            )}
          </div>
        </div>

        {/* Klienci */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Klienci</h4>
          </div>
          <div className="space-y-1">
            {allClients.length > 0 ? (
              allClients.map((client, index) => (
                <div key={index} className="text-sm bg-gray-50 px-2 py-1 rounded border">
                  {client}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">Brak danych</div>
            )}
          </div>
        </div>

        {/* Wartość i Szczegóły transportu */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Podsumowanie</h4>
          </div>
          <div className="space-y-3">
            {/* Wartość finansowa */}
            <div>
              <div className="text-2xl font-bold text-green-600">
                {totalValue > 0 ? `${totalValue.toLocaleString()} PLN` : 'Brak danych'}
              </div>
              <div className="text-xs text-gray-500">łączna wartość transportu</div>
            </div>
            
            {/* Szczegóły */}
            <div className="pt-2 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tras połączonych:</span>
                <span className="font-medium">{allRoutes.length}</span>
              </div>
              
              {/* Wszyscy odpowiedzialni */}
              <div>
                <span className="text-gray-600">Odpowiedzialni:</span>
                <div className="mt-1 space-y-1">
                  {allResponsible.length > 0 ? (
                    allResponsible.map((person, index) => (
                      <div key={index} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border">
                        {person}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">Brak danych</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Szczegółowe trasy */}
      <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-purple-600" />
          <h4 className="font-semibold text-gray-800">Wszystkie trasy w zleceniu</h4>
        </div>
        <div className="space-y-2">
          {allRoutes.map((routeItem, index) => (
            <div 
              key={routeItem.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded border"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{routeItem.route}</div>
                  <div className="text-xs text-gray-500">Nr: {routeItem.orderNumber}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {routeItem.mpk && `MPK: ${routeItem.mpk}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MergedTransportSummary;