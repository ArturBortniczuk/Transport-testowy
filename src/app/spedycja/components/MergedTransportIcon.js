import React from 'react';
import { Route } from 'lucide-react';

const MergedTransportIcon = ({ transport, size = 16, showCount = true }) => {
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

  const merged = isMerged();
  const connectedCount = getConnectedCount();

  if (!merged) {
    return null;
  }

  const totalTransports = connectedCount + 1; // +1 dla głównego transportu

  return (
    <div 
      className="inline-flex items-center gap-1 text-purple-600" 
      title={`Transport połączony (${totalTransports} tras)`}
    >
      <Route size={size} />
      {showCount && (
        <span className="text-xs font-bold bg-purple-100 text-purple-800 px-1 rounded">
          {totalTransports}
        </span>
      )}
    </div>
  );
};

export default MergedTransportIcon;