import React from 'react';
import { Route, Truck, MapPin } from 'lucide-react';

const TransportConnectionBadge = ({ transport }) => {
  // Sprawdź czy transport jest połączony
  const isMerged = () => {
    try {
      const responseData = transport.response_data ? 
        (typeof transport.response_data === 'string' ? JSON.parse(transport.response_data) : transport.response_data) 
        : null;
      return responseData?.isMerged || transport.is_merged || transport.isMerged || false;
    } catch (e) {
      return false;
    }
  };

  // Pobierz liczbę połączonych transportów
  const getConnectedCount = () => {
    try {
      if (transport.merged_transports) {
        const mergedData = typeof transport.merged_transports === 'string' 
          ? JSON.parse(transport.merged_transports) 
          : transport.merged_transports;
        return mergedData?.originalTransports?.length || 0;
      }
      
      // Sprawdź w response_data
      const responseData = transport.response_data ? 
        (typeof transport.response_data === 'string' ? JSON.parse(transport.response_data) : transport.response_data) 
        : null;
      return responseData?.mergedTransportsCount || 0;
    } catch (e) {
      return 0;
    }
  };

  // Pobierz odległość rzeczywistą trasy
  const getRealDistance = () => {
    try {
      const responseData = transport.response_data ? 
        (typeof transport.response_data === 'string' ? JSON.parse(transport.response_data) : transport.response_data) 
        : null;
      return responseData?.realRouteDistance || responseData?.totalDistance || null;
    } catch (e) {
      return null;
    }
  };

  const merged = isMerged();
  const connectedCount = getConnectedCount();
  const realDistance = getRealDistance();

  if (!merged) {
    return null;
  }

  const totalTransports = connectedCount + 1; // +1 dla głównego transportu

  return (
    <div className="flex flex-col gap-1">
      {/* Główny badge połączenia */}
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
          <Route size={12} />
          <span>Połączony</span>
          <span className="bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full text-xs font-bold">
            {totalTransports}
          </span>
        </div>
        
        {/* Badge z rzeczywistą odległością */}
        {realDistance && realDistance > 0 && (
          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <MapPin size={10} />
            <span>{realDistance} km</span>
          </div>
        )}
      </div>
      
      {/* Dodatkowe informacje w kompaktowej formie */}
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Truck size={10} />
        <span>{totalTransports} tras w jednym zleceniu</span>
        {realDistance && (
          <span className="text-green-600 ml-1">(optymalizowana trasa)</span>
        )}
      </div>
    </div>
  );
};

export default TransportConnectionBadge;