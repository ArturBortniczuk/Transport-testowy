import React from 'react';
import { 
  Truck, 
  MapPin, 
  FileText, 
  Users, 
  Package, 
  Calculator, 
  Route,
  Clock,
  Building,
  Hash
} from 'lucide-react';

const MergedTransportSummary = ({ transport, mergedData }) => {
  if (!transport || !mergedData || !mergedData.originalTransports) {
    return null;
  }

  // Funkcja do zbierania wszystkich unikalnych wartości z pola
  const collectUniqueValues = (field) => {
    const values = new Set();
    
    // Główny transport
    if (transport[field]) {
      values.add(transport[field]);
    }
    
    // Transporty połączone
    mergedData.originalTransports.forEach(originalTransport => {
      if (originalTransport[field]) {
        values.add(originalTransport[field]);
      }
    });
    
    return Array.from(values).filter(Boolean);
  };

  // Funkcja do zbierania tras
  const getAllRoutes = () => {
    const routes = [];
    
    // Jeśli mamy routeSequence z response_data, użyj tego
    if (mergedData.routeSequence) {
      const uniqueTransports = new Map();
      
      // Zbierz unikalne transporty z ich punktami
      mergedData.routeSequence.forEach(point => {
        if (!uniqueTransports.has(point.transportId)) {
          uniqueTransports.set(point.transportId, {
            id: point.transportId,
            orderNumber: point.transport.orderNumber,
            mpk: point.transport.mpk,
            loading: null,
            unloading: null
          });
        }
        
        const transportData = uniqueTransports.get(point.transportId);
        if (point.type === 'loading') {
          transportData.loading = point.city;
        } else if (point.type === 'unloading') {
          transportData.unloading = point.city;
        }
      });
      
      // Przekształć na trasy
      uniqueTransports.forEach(transportData => {
        if (transportData.loading && transportData.unloading) {
          routes.push({
            id: transportData.id,
            orderNumber: transportData.orderNumber,
            route: `${transportData.loading} → ${transportData.unloading}`,
            mpk: transportData.mpk
          });
        }
      });
      
      return routes;
    }
    
    // Fallback do starej metody
    if (mergedData.originalTransports) {
      return mergedData.originalTransports.map(t => ({
        id: t.id,
        orderNumber: t.orderNumber,
        route: t.route || 'Nie podano',
        mpk: t.mpk
      }));
    }
    
    return routes;
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

  // Pobieranie danych
  const allMPKs = collectUniqueValues('mpk');
  const allDocuments = collectUniqueValues('documents');
  const allClients = collectUniqueValues('clientName');
  const allRoutes = getAllRoutes();
  
  // Oblicz odległość rzeczywistą
  const getRealDistance = () => {
    try {
      const responseData = typeof transport.response_data === 'string' 
        ? JSON.parse(transport.response_data) 
        : transport.response_data;
      
      // Sprawdź różne pola odległości
      return responseData?.distance || responseData?.realRouteDistance || responseData?.totalDistance || mergedData?.totalDistance || 0;
    } catch (e) {
      return 0;
    }
  };

  // Oblicz łączną wartość transportu
  const getTotalValue = () => {
    try {
      const responseData = typeof transport.response_data === 'string' 
        ? JSON.parse(transport.response_data) 
        : transport.response_data;
      
      // Użyj totalDeliveryPrice zamiast deliveryPrice
      return responseData?.totalDeliveryPrice || mergedData?.totalValue || responseData?.deliveryPrice || 0;
    } catch (e) {
      return 0;
    }
  };

  const realDistance = getRealDistance();
  const totalValue = getTotalValue();
  const totalTransports = 1 + (mergedData.originalTransports?.length || 0);

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
              {totalTransports} tras w jednym zleceniu
            </p>
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
        
        {/* MPK */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Numery MPK</h4>
          </div>
          <div className="space-y-1">
            {allMPKs.length > 0 ? (
              allMPKs.map((mpk, index) => (
                <div key={index} className="text-sm bg-gray-50 px-2 py-1 rounded border">
                  {mpk}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">Brak danych</div>
            )}
          </div>
        </div>

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

        {/* Wartość transportu */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Wartość</h4>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {totalValue > 0 ? `${totalValue.toLocaleString()} PLN` : 'Brak danych'}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Status</h4>
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            transport.status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : transport.status === 'new'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {transport.status === 'completed' ? 'Zrealizowane' : 
             transport.status === 'new' ? 'Nowe' : transport.status}
          </div>
        </div>

        {/* Informacje dodatkowe */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-purple-600" />
            <h4 className="font-semibold text-gray-800">Szczegóły</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div>Tras połączonych: <span className="font-medium">{mergedData.originalTransports.length}</span></div>
            <div>Główny nr: <span className="font-medium">{transport.orderNumber}</span></div>
            {transport.responsiblePerson && (
              <div>Odpowiedzialny: <span className="font-medium">{transport.responsiblePerson}</span></div>
            )}
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