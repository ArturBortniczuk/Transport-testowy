import React, { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { generateCMR } from '@/lib/utils/generateCMR'
import { Truck, Package, MapPin, Phone, FileText, Calendar, DollarSign, User, Clipboard, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Edit, Pencil, Building, ShoppingBag, Weight, Bot, Link as LinkIcon, Unlink, Copy } from 'lucide-react'

export default function SpedycjaList({ 
  zamowienia, 
  showArchive, 
  isAdmin, 
  onResponse, 
  onMarkAsCompleted, 
  onCreateOrder, 
  canSendOrder,
  onEdit,
  currentUserEmail
}) {
  const [expandedId, setExpandedId] = useState(null)

  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2",
    success: "px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2",
    danger: "px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.city}, ${address.postalCode}, ${address.street}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: pl });
    } catch (error) {
      console.error("Błąd formatowania daty:", error, dateString);
      return 'Nieprawidłowa data';
    }
  }
  
  const getLoadingCity = (zamowienie) => {
    if (zamowienie.location === 'Odbiory własne' && zamowienie.producerAddress) {
      return zamowienie.producerAddress.city || '';
    } else if (zamowienie.location === 'Magazyn Białystok') {
      return 'Białystok';
    } else if (zamowienie.location === 'Magazyn Zielonka') {
      return 'Zielonka';
    }
    return '';
  }
  
  const getDeliveryCity = (zamowienie) => {
    return zamowienie.delivery?.city || '';
  }

  // Funkcja pomocnicza do określania nazwy firmy załadunku
  const getLoadingCompanyName = (transport) => {
    if (transport.location === 'Odbiory własne') {
      return transport.sourceClientName || transport.clientName || 'Odbiory własne';
    } else if (transport.location === 'Magazyn Białystok') {
      return 'Grupa Eltron Sp. z o.o.';
    } else if (transport.location === 'Magazyn Zielonka') {
      return 'Grupa Eltron Sp. z o.o.';
    }
    return transport.location || 'Nie podano';
  }

  // Funkcja pomocnicza do określania nazwy firmy rozładunku
  const getUnloadingCompanyName = (transport) => {
    return transport.clientName || 'Nie podano';
  }

  // NOWA FUNKCJA: Sprawdza czy transport jest połączony
  const isMergedTransport = (zamowienie) => {
    return zamowienie.merged_transports && zamowienie.response?.isMerged;
  };

  // NOWA FUNKCJA: Pobiera dane o połączonych transportach
  const getMergedTransportsData = (zamowienie) => {
    if (!isMergedTransport(zamowienie)) return null;
    
    try {
      const mergedData = zamowienie.merged_transports;
      const costBreakdown = zamowienie.response?.costBreakdown;
      
      return {
        originalTransports: mergedData.originalTransports || [],
        totalDistance: mergedData.totalDistance || 0,
        mainTransportCost: mergedData.mainTransportCost || 0,
        totalMergedCost: mergedData.totalMergedCost || 0,
        costBreakdown: costBreakdown,
        mergedAt: mergedData.mergedAt,
        mergedBy: mergedData.mergedBy
      };
    } catch (error) {
      console.error('Błąd parsowania danych połączonych transportów:', error);
      return null;
    }
  };

  // Funkcja do generowania linku do Google Maps - ZAKTUALIZOWANA
const generateGoogleMapsLink = (transport) => {
  const isMerged = isMergedTransport(transport);
  
  if (!isMerged) {
    // Dla normalnego transportu - stara logika
    let origin = '';
    let destination = '';
    
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      const addr = transport.producerAddress;
      origin = `${addr.city},${addr.postalCode},${addr.street || ''}`;
    } else if (transport.location === 'Magazyn Białystok') {
      origin = 'Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      origin = 'Zielonka';
    }
    
    if (transport.delivery) {
      const addr = transport.delivery;
      destination = `${addr.city},${addr.postalCode},${addr.street || ''}`;
    }
    
    if (!origin || !destination) return '';
    
    origin = encodeURIComponent(origin);
    destination = encodeURIComponent(destination);
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }
  
  // NOWA LOGIKA: Dla transportu połączonego - sekwencyjna trasa
  const mergedData = getMergedTransportsData(transport);
  if (!mergedData) return '';
  
  try {
    // Rekonstrukcja trasy z danych response
    const routePoints = transport.response?.routePoints;
    
    if (routePoints && routePoints.length > 1) {
      // Użyj zapisanych punktów trasy
      return generateMapsLinkFromRoutePoints(routePoints);
    }
    
    // Fallback - rekonstruuj trasę z danych transportów
    return reconstructRouteFromMergedData(transport, mergedData);
    
  } catch (error) {
    console.error('Błąd generowania linku Maps dla połączonego transportu:', error);
    return '';
  }
};

// NOWA FUNKCJA: Generowanie linku z zapisanych punktów trasy
const generateMapsLinkFromRoutePoints = (routePoints) => {
  if (routePoints.length < 2) return '';
  
  let origin = '';
  let destination = '';
  const waypoints = [];
  
  // Pierwszy punkt to origin
  const firstPoint = routePoints[0];
  origin = getAddressFromRoutePoint(firstPoint);
  
  // Ostatni punkt to destination  
  const lastPoint = routePoints[routePoints.length - 1];
  destination = getAddressFromRoutePoint(lastPoint);
  
  // Środkowe punkty to waypoints
  for (let i = 1; i < routePoints.length - 1; i++) {
    const waypointAddress = getAddressFromRoutePoint(routePoints[i]);
    if (waypointAddress) {
      waypoints.push(waypointAddress);
    }
  }
  
  if (!origin || !destination) return '';
  
  const waypointsParam = waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
  
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;
};

// NOWA FUNKCJA: Pobieranie adresu z punktu trasy
const getAddressFromRoutePoint = (routePoint) => {
  if (!routePoint || !routePoint.location) return '';
  
  // Jeśli to magazyn
  if (routePoint.description.includes('Magazyn Białystok') || routePoint.address === 'Magazyn Białystok') {
    return 'Białystok';
  }
  if (routePoint.description.includes('Magazyn Zielonka') || routePoint.address === 'Magazyn Zielonka') {
    return 'Zielonka';
  }
  
  // Jeśli mamy współrzędne w location
  const loc = routePoint.location;
  if (loc.city) {
    return `${loc.city}, ${loc.postalCode || ''}, ${loc.street || ''}`;
  }
  
  // Fallback - użyj description
  return routePoint.description.replace('Załadunek: ', '').replace('Rozładunek: ', '');
};

// NOWA FUNKCJA: Rekonstrukcja trasy z danych połączonych transportów (fallback)
const reconstructRouteFromMergedData = (mainTransport, mergedData) => {
  const points = [];
  
  // Główny załadunek
  if (mainTransport.location === 'Magazyn Białystok') {
    points.push('Białystok');
  } else if (mainTransport.location === 'Magazyn Zielonka') {
    points.push('Zielonka');
  } else if (mainTransport.location === 'Odbiory własne' && mainTransport.producerAddress) {
    const addr = mainTransport.producerAddress;
    points.push(`${addr.city}, ${addr.postalCode}, ${addr.street || ''}`);
  }
  
  // Dodatkowe załadunki z połączonych transportów
  mergedData.originalTransports.forEach(transport => {
    try {
      let locationData = transport.location_data;
      if (typeof locationData === 'string') {
        locationData = JSON.parse(locationData);
      }
      
      if (transport.location === 'Magazyn Białystok') {
        points.push('Białystok');
      } else if (transport.location === 'Magazyn Zielonka') {
        points.push('Zielonka');
      } else if (transport.location === 'Odbiory własne' && locationData) {
        points.push(`${locationData.city}, ${locationData.postalCode}, ${locationData.street || ''}`);
      }
    } catch (error) {
      console.error('Błąd parsowania danych lokalizacji:', error);
    }
  });
  
  // Główny rozładunek (zawsze ostatni)
  if (mainTransport.delivery) {
    const addr = mainTransport.delivery;
    points.push(`${addr.city}, ${addr.postalCode}, ${addr.street || ''}`);
  }
  
  if (points.length < 2) return '';
  
  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1);
  
  const waypointsParam = waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
  
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;
};

  // NOWA FUNKCJA: Generuje wyświetlaną trasę dla połączonych transportów
  const getDisplayRoute = (zamowienie) => {
    const mergedData = getMergedTransportsData(zamowienie);
    
    if (mergedData) {
      // Dla połączonych transportów - pokaż trasę głównego + info o dodatkowych
      const mainRoute = `${getLoadingCity(zamowienie)} → ${getDeliveryCity(zamowienie)}`;
      const additionalCount = mergedData.originalTransports.length;
      
      return {
        text: `${mainRoute} (+${additionalCount} tras)`,
        distance: mergedData.totalDistance,
        isMerged: true,
        additionalRoutes: mergedData.originalTransports.map(t => t.route)
      };
    }
    
    // Dla normalnych transportów
    return {
      text: `${getLoadingCity(zamowienie)} → ${getDeliveryCity(zamowienie)}`,
      distance: zamowienie.distanceKm || 0,
      isMerged: false
    };
  };

  // NOWA FUNKCJA: Obsługa rozłączania transportów
  const handleUnmergeTransport = async (transportId) => {
    if (!confirm('Czy na pewno chcesz rozłączyć ten transport? Wszystkie połączone transporty zostaną przywrócone jako osobne zlecenia.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/spedycje/unmerge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transportId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        // Odśwież stronę lub wywołaj funkcję odświeżania listy
        window.location.reload();
      } else {
        alert('Błąd rozłączania transportu: ' + data.error);
      }
    } catch (error) {
      console.error('Błąd rozłączania transportu:', error);
      alert('Wystąpił błąd podczas rozłączania transportu');
    }
  };

  // Funkcja do określania statusu zamówienia
  const getStatusLabel = (zamowienie) => {
    if (zamowienie.status === 'completed') {
      return { 
        label: 'Zakończone', 
        className: 'bg-green-100 text-green-800 border border-green-300',
        icon: <Clipboard size={16} className="mr-1" />
      };
    } else if (zamowienie.response && Object.keys(zamowienie.response).length > 0) {
      if (isMergedTransport(zamowienie)) {
        return { 
          label: 'Transport połączony', 
          className: 'bg-purple-100 text-purple-800 border border-purple-300',
          icon: <LinkIcon size={16} className="mr-1" />
        };
      } else {
        return { 
          label: 'Odpowiedziane', 
          className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
          icon: <Truck size={16} className="mr-1" />
        };
      }
    } else {
      return { 
        label: 'Nowe', 
        className: 'bg-blue-100 text-blue-800 border border-blue-300',
        icon: <Package size={16} className="mr-1" />
      };
    }
  }

  // Funkcja sprawdzająca czy data dostawy została zmieniona
  const isDeliveryDateChanged = (zamowienie) => {
    return zamowienie.response && 
           zamowienie.response.dateChanged === true && 
           zamowienie.response.newDeliveryDate;
  }

  // Funkcja pobierająca aktualną datę dostawy (oryginalną lub zmienioną)
  const getActualDeliveryDate = (zamowienie) => {
    if (isDeliveryDateChanged(zamowienie)) {
      return zamowienie.response.newDeliveryDate;
    }
    return zamowienie.deliveryDate;
  }

  // Sprawdza, czy bieżący użytkownik jest twórcą zamówienia
  const isCreatedByCurrentUser = (zamowienie) => {
    return zamowienie.createdByEmail === currentUserEmail;
  }

  // Sprawdza, czy zamówienie może być edytowane
  const canBeEdited = (zamowienie) => {
    // Nie można edytować połączonych transportów
    if (isMergedTransport(zamowienie)) {
      return false;
    }
    
    // Tylko nowe zamówienia bez odpowiedzi mogą być edytowane
    return zamowienie.status === 'new' && 
           (!zamowienie.response || Object.keys(zamowienie.response).length === 0);
  }
  
  // ZAKTUALIZOWANA FUNKCJA: Renderuje szczegółowe info o połączonych transportach
  const renderMergedTransportsInfo = (transport) => {
    const mergedData = getMergedTransportsData(transport);
    if (!mergedData) return null;
    
    // Funkcja pomocnicza do formatowania nazwy firmy z danych transportu
    const getTransportLoadingCompany = (transportData) => {
      if (transportData.location === 'Odbiory własne') {
        return transportData.sourceClientName || transportData.client_name || 'Odbiory własne';
      } else if (transportData.location === 'Magazyn Białystok') {
        return 'Grupa Eltron Sp. z o.o.';
      } else if (transportData.location === 'Magazyn Zielonka') {
        return 'Grupa Eltron Sp. z o.o.';
      }
      return transportData.location || 'Nie podano';
    };
    
    const getTransportUnloadingCompany = (transportData) => {
      return transportData.client_name || 'Nie podano';
    };
    
    // Funkcja do formatowania adresu z raw danych
    const formatRawAddress = (addressData) => {
      if (!addressData) return 'Brak danych';
      
      try {
        let parsed = addressData;
        if (typeof addressData === 'string') {
          parsed = JSON.parse(addressData);
        }
        
        if (parsed.city || parsed.postalCode || parsed.street) {
          return `${parsed.city || ''}, ${parsed.postalCode || ''}, ${parsed.street || ''}`.replace(/^,\s*|,\s*$/g, '');
        }
      } catch (error) {
        console.error('Błąd parsowania adresu:', error);
      }
      
      return 'Brak danych';
    };
    
    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-medium text-purple-700 mb-3 flex items-center">
          <LinkIcon size={18} className="mr-2" />
          Transport połączony ({mergedData.originalTransports.length + 1} tras)
        </h4>
        
        <div className="space-y-4">
          {/* Główny transport */}
          <div className="p-4 bg-white rounded border-l-4 border-purple-400">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-purple-800 text-lg">
                  GŁÓWNY: {transport.orderNumber || transport.id}
                </div>
                <div className="text-sm text-gray-600">
                  MPK: {transport.mpk}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-green-700 font-medium text-lg">
                  <DollarSign size={18} className="mr-1" />
                  {mergedData.mainTransportCost.toFixed(2)} PLN
                </div>
                <div className="text-xs text-gray-500">
                  {mergedData.costBreakdown?.mainTransport?.distance || 0} km
                </div>
              </div>
            </div>
            
            {/* Szczegóły głównego transportu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-purple-100">
              <div>
                <h5 className="font-medium text-purple-700 mb-2 flex items-center">
                  <MapPin size={14} className="mr-1" />
                  Załadunek
                </h5>
                <div className="text-sm">
                  <div className="font-medium">{getLoadingCompanyName(transport)}</div>
                  <div className="text-gray-600">
                    {transport.location === 'Odbiory własne' && transport.producerAddress 
                      ? formatAddress(transport.producerAddress)
                      : transport.location}
                  </div>
                  <div className="text-gray-500 flex items-center mt-1">
                    <Phone size={12} className="mr-1" />
                    {transport.loadingContact}
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-purple-700 mb-2 flex items-center">
                  <MapPin size={14} className="mr-1" />
                  Rozładunek
                </h5>
                <div className="text-sm">
                  <div className="font-medium">{getUnloadingCompanyName(transport)}</div>
                  <div className="text-gray-600">{formatAddress(transport.delivery)}</div>
                  <div className="text-gray-500 flex items-center mt-1">
                    <Phone size={12} className="mr-1" />
                    {transport.unloadingContact}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Połączone transporty */}
          {mergedData.originalTransports.map((originalTransport, index) => (
            <div key={originalTransport.id} className="p-4 bg-white rounded border-l-4 border-gray-300">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-gray-800">
                    {index + 2}. {originalTransport.orderNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    MPK: {originalTransport.mpk}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Odp: {originalTransport.responsiblePerson || 'Brak'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-700 font-medium">
                    <DollarSign size={16} className="mr-1" />
                    {originalTransport.costAssigned.toFixed(2)} PLN
                  </div>
                  <div className="text-xs text-gray-500">
                    {originalTransport.distance || 0} km
                  </div>
                </div>
              </div>
              
              {/* Szczegóły połączonego transportu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin size={14} className="mr-1" />
                    Załadunek
                  </h5>
                  <div className="text-sm">
                    <div className="font-medium">{getTransportLoadingCompany(originalTransport)}</div>
                    <div className="text-gray-600">
                      {originalTransport.location === 'Odbiory własne' 
                        ? formatRawAddress(originalTransport.location_data)
                        : originalTransport.location}
                    </div>
                    <div className="text-gray-500 flex items-center mt-1">
                      <Phone size={12} className="mr-1" />
                      {originalTransport.loading_contact}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin size={14} className="mr-1" />
                    Rozładunek
                  </h5>
                  <div className="text-sm">
                    <div className="font-medium">{getTransportUnloadingCompany(originalTransport)}</div>
                    <div className="text-gray-600">{formatRawAddress(originalTransport.delivery_data)}</div>
                    <div className="text-gray-500 flex items-center mt-1">
                      <Phone size={12} className="mr-1" />
                      {originalTransport.unloading_contact}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dodatkowe informacje */}
              {originalTransport.documents && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">Dokumenty:</span> {originalTransport.documents}
                </div>
              )}
            </div>
          ))}
          
          {/* Podsumowanie */}
          <div className="pt-3 border-t border-purple-200 bg-purple-25">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-purple-700">Łączna odległość:</span>
                <span className="ml-2 text-purple-800 font-semibold">{mergedData.totalDistance} km</span>
              </div>
              <div>
                <span className="font-medium text-purple-700">Łączny koszt:</span>
                <span className="ml-2 text-purple-800 font-semibold">{transport.response?.deliveryPrice} PLN</span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-purple-600">
              Połączono {format(new Date(mergedData.mergedAt), 'dd.MM.yyyy HH:mm', { locale: pl })} przez {mergedData.mergedBy}
            </div>
            
            {/* Przycisk rozłączania dla adminów */}
            {isAdmin && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleUnmergeTransport(transport.id)}
                  className={buttonClasses.danger}
                >
                  <Unlink size={16} />
                  Rozłącz transporty
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Renderuje info o odpowiedzialnych budowach
  const renderResponsibleConstructions = (transport) => {
    if (!transport.responsibleConstructions || !transport.responsibleConstructions.length) return null;
    
    return (
      <div className="mt-2">
        <div className="font-medium text-sm">Budowy:</div>
        <div className="flex flex-wrap gap-2 mt-1">
          {transport.responsibleConstructions.map(construction => (
            <div key={construction.id} className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs flex items-center">
              <Building size={12} className="mr-1" />
              {construction.name}
              <span className="ml-1 text-green-600">({construction.mpk})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Renderuje info o towarze
  const renderGoodsInfo = (transport) => {
    if (!transport.goodsDescription) return null;
    
    return (
      <div className="mt-3 bg-blue-50 p-2 rounded-md border border-blue-100">
        <div className="flex items-center text-blue-700 font-medium">
          <ShoppingBag size={14} className="mr-1" />
          Towar
        </div>
        {transport.goodsDescription.description && (
          <p className="text-sm mt-1">{transport.goodsDescription.description}</p>
        )}
        {transport.goodsDescription.weight && (
          <p className="text-sm flex items-center mt-1">
            <Weight size={12} className="mr-1" />
            Waga: {transport.goodsDescription.weight}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="divide-y">
      {zamowienia
        .filter(z => showArchive ? z.status === 'completed' : z.status === 'new')
        .map((zamowienie) => {
          const statusInfo = getStatusLabel(zamowienie);
          const dateChanged = isDeliveryDateChanged(zamowienie);
          const displayDate = getActualDeliveryDate(zamowienie);
          const canEdit = canBeEdited(zamowienie) && (isAdmin || isCreatedByCurrentUser(zamowienie));
          const isMerged = isMergedTransport(zamowienie);
          const displayRoute = getDisplayRoute(zamowienie);
          
          return (
            <div key={zamowienie.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div 
                onClick={() => setExpandedId(expandedId === zamowienie.id ? null : zamowienie.id)}
                className="flex justify-between items-start cursor-pointer"
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-blue-700 ${
                      isMerged ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {isMerged ? <LinkIcon size={18} /> : <Truck size={18} />}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center">
                      <span className={displayRoute.isMerged ? "text-purple-600 font-semibold" : ""}>
                        {displayRoute.text}
                      </span>
                      {zamowienie.clientName && (
                        <span className="ml-2 text-sm text-gray-600">
                          ({zamowienie.clientName})
                        </span>
                      )}
                      {displayRoute.isMerged && (
                        <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                          <LinkIcon size={12} className="mr-1" />
                          {displayRoute.distance} km łącznie
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Calendar size={14} className="mr-1" />
                      Data dostawy: 
                      {dateChanged ? (
                        <span className="ml-1 flex items-center">
                          <span className="line-through text-gray-400">{formatDate(zamowienie.deliveryDate)}</span>
                          <ArrowRight size={12} className="mx-1 text-yellow-500" />
                          <span className="bg-yellow-50 px-1.5 py-0.5 rounded text-yellow-700 font-medium">
                            {formatDate(displayDate)}
                          </span>
                        </span>
                      ) : (
                        <span className="ml-1">{formatDate(displayDate)}</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <FileText size={14} className="mr-1" />
                      {zamowienie.orderNumber && <span className="font-medium mr-2">{zamowienie.orderNumber}</span>}
                      MPK: {zamowienie.mpk}
                    </p>
                    
                    {/* Wyświetl informację o budowach */}
                    {zamowienie.responsibleConstructions && zamowienie.responsibleConstructions.length > 0 && (
                      <div className="flex items-center mt-1">
                        <Building size={14} className="mr-1 text-green-600" />
                        <span className="text-sm text-green-600">
                          Budowa: {zamowienie.responsibleConstructions[0].name}
                          {zamowienie.responsibleConstructions.length > 1 && ` +${zamowienie.responsibleConstructions.length - 1}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center ${statusInfo.className}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                  
                  {expandedId === zamowienie.id ? (
                    <button 
                      className="p-1 rounded-full hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(null)
                      }}
                    >
                      <ChevronUp size={20} />
                    </button>
                  ) : (
                    <button 
                      className="p-1 rounded-full hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(zamowienie.id)
                      }}
                    >
                      <ChevronDown size={20} />
                    </button>
                  )}
                  
                  {/* Przycisk edycji - widoczny dla twórcy lub admina (ale nie dla połączonych) */}
                  {canEdit && (
                    <button 
                      type="button"
                      className={buttonClasses.outline}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(zamowienie)
                      }}
                    >
                      <Pencil size={16} />
                      Edytuj
                    </button>
                  )}
                  
                  {/* Przyciski admina - odpowiadanie i oznaczanie jako zrealizowane */}
                  {isAdmin && zamowienie.status === 'new' && (
                    <>
                      {/* Pokaż przycisk "Odpowiedz" tylko jeśli NIE MA odpowiedzi i NIE JEST połączony */}
                      {(!zamowienie.response || Object.keys(zamowienie.response).length === 0) && !isMerged && (
                        <button 
                          type="button"
                          className={buttonClasses.outline}
                          onClick={(e) => {
                            e.stopPropagation()
                            onResponse(zamowienie)
                          }}
                        >
                          <Clipboard size={16} />
                          Odpowiedz
                        </button>
                      )}
                      
                      {/* Pokaż przycisk "Edytuj odpowiedź" tylko jeśli JUŻ MA odpowiedź i NIE JEST połączony */}
                      {(zamowienie.response && Object.keys(zamowienie.response).length > 0) && !isMerged && (
                        <button 
                          type="button"
                          className={buttonClasses.outline}
                          onClick={(e) => {
                            e.stopPropagation()
                            onResponse(zamowienie)
                          }}
                        >
                          <Edit size={16} />
                          Edytuj odpowiedź
                        </button>
                      )}
                      
                      <button 
                        type="button"
                        className={buttonClasses.success}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Czy na pewno chcesz oznaczyć to zlecenie jako zrealizowane?')) {
                            onMarkAsCompleted(zamowienie.id)
                          }
                        }}
                      >
                        <Truck size={16} />
                        Zrealizowane
                      </button>
                      {/* Przycisk kopiowania - dla wszystkich użytkowników */}
                      <button 
                        type="button"
                        className="px-3 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopy(zamowienie)
                        }}
                      >
                        <Copy size={16} />
                        Kopiuj
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === zamowienie.id && (
                <div className="mt-6 pl-4 border-l-4 border-blue-200 animate-fadeIn">
                  {/* WARUNEK: Sprawdź czy to transport połączony */}
                  {(() => {
                    const isMerged = isMergedTransport(zamowienie);
                    
                    if (isMerged) {
                      // DLA POŁĄCZONYCH TRANSPORTÓW - pokaż tylko sekcję połączonych tras
                      return (
                        <div>
                          {/* Informacja o transporcie połączonym */}
                          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-medium text-purple-700 mb-2 flex items-center">
                              <LinkIcon size={18} className="mr-2" />
                              Transport połączony - szczegóły tras
                            </h4>
                            <p className="text-sm text-purple-600">
                              Ten transport zawiera {getMergedTransportsData(zamowienie)?.originalTransports.length + 1} tras realizowanych w jednym kursie.
                              Szczegółowe informacje o wszystkich trasach znajdują się poniżej.
                            </p>
                          </div>

                          {/* Sekcja informacji o połączonych transportach */}
                          {renderMergedTransportsInfo(zamowienie)}

                          {/* Sekcja z uwagami - jeśli są */}
                          {(zamowienie.notes || zamowienie.response?.adminNotes) && (
                            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                                <FileText size={18} className="mr-2" />
                                Uwagi
                              </h4>
                              {zamowienie.notes && (
                                <div className="mb-2">
                                  <span className="font-medium text-gray-700">Uwagi zlecenia:</span>
                                  <p className="text-gray-900 mt-1">{zamowienie.notes}</p>
                                </div>
                              )}
                              {zamowienie.response?.adminNotes && (
                                <div>
                                  <span className="font-medium text-gray-700">Uwagi przewoźnika:</span>
                                  <p className="text-gray-900 mt-1">{zamowienie.response.adminNotes}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Szczegóły realizacji dla połączonych transportów */}
                          {zamowienie.response && (
                            <div className="mt-4 p-5 rounded-lg border shadow-sm bg-purple-50 border-purple-200">
                              <h4 className="font-medium mb-3 pb-2 border-b border-purple-300 flex items-center text-purple-800">
                                <LinkIcon size={18} className="mr-2" />
                                Szczegóły realizacji (transport połączony)
                              </h4>
                              
                              {zamowienie.response.completedManually ? (
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-100 flex items-center">
                                  <Clipboard size={18} className="mr-2" />
                                  Zamówienie zostało ręcznie oznaczone jako zrealizowane.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Informacje o przewoźniku */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-blue-600">
                                      <User size={14} className="mr-1" />
                                      Dane przewoźnika
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Kierowca:</span> {zamowienie.response.driverName} {zamowienie.response.driverSurname}</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Telefon:</span> {zamowienie.response.driverPhone}</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Numery auta:</span> {zamowienie.response.vehicleNumber}</p>
                                  </div>
                                  
                                  {/* Informacje o kosztach */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-green-600">
                                      <DollarSign size={14} className="mr-1" />
                                      Dane finansowe (łącznie)
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Cena całkowita:</span> 
                                      <span className="bg-green-50 px-2 py-0.5 rounded ml-1">
                                        {zamowienie.response.deliveryPrice} PLN
                                      </span>
                                    </p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Odległość łączna:</span> 
                                      <span className="bg-blue-50 px-2 py-0.5 rounded ml-1">
                                        {displayRoute.distance} km (trasa połączona)
                                      </span>
                                    </p>
                                    {(() => {
                                      const totalDistance = displayRoute.distance;
                                      if (totalDistance > 0 && zamowienie.response.deliveryPrice > 0) {
                                        return (
                                          <p className="text-sm mb-1.5"><span className="font-medium">Koszt za km:</span> 
                                            <span className="bg-green-50 px-2 py-0.5 rounded ml-1">
                                              {(zamowienie.response.deliveryPrice / totalDistance).toFixed(2)} PLN/km
                                            </span>
                                          </p>
                                        );
                                      }
                                      return null;
                                    })()}
                                    
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <p className="text-xs text-purple-600">
                                        Koszt podzielony między {getMergedTransportsData(zamowienie)?.originalTransports.length + 1} transporty
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Informacje o realizacji */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-purple-600">
                                      <Calendar size={14} className="mr-1" />
                                      Informacje o realizacji
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Data odpowiedzi:</span> {formatDate(zamowienie.completedAt || zamowienie.createdAt)}</p>
                                    
                                    <div className="bg-purple-50 p-2 rounded-md border border-purple-100 mt-2 mb-1.5">
                                      <p className="text-xs font-medium text-purple-800 flex items-center">
                                        <LinkIcon size={12} className="mr-1" />
                                        Transport połączony
                                      </p>
                                      <p className="text-xs text-purple-600 mt-1">
                                        {getMergedTransportsData(zamowienie)?.originalTransports.length} transportów dodatkowo
                                      </p>
                                    </div>
                                    
                                    {zamowienie.response.dateChanged && (
                                      <div className="bg-yellow-50 p-2 rounded-md border border-yellow-100 mt-2 mb-1.5">
                                        <p className="text-sm font-medium text-yellow-800">Zmieniono datę dostawy:</p>
                                        <p className="text-xs flex justify-between mt-1">
                                          <span>Z: <span className="line-through">{formatDate(zamowienie.response.originalDeliveryDate)}</span></span>
                                          <span>→</span>
                                          <span>Na: <span className="font-medium">{formatDate(zamowienie.response.newDeliveryDate)}</span></span>
                                        </p>
                                      </div>
                                    )}
                                    
                                    {zamowienie.response.adminNotes && (
                                      <p className="text-sm"><span className="font-medium">Uwagi:</span> {zamowienie.response.adminNotes}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Przyciski akcji */}
                          <div className="mt-5 flex justify-center space-x-4">
                            {/* Link do Google Maps */}
                            {generateGoogleMapsLink(zamowienie) && (
                              <a 
                                href={generateGoogleMapsLink(zamowienie)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MapPin size={18} className="mr-2" />
                                Zobacz trasę na Google Maps
                              </a>
                            )}
                            
                            {/* Przycisk CMR */}
                            <button 
                              type="button"
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
                              onClick={() => generateCMR(zamowienie)}
                            >
                              <FileText size={18} className="mr-2" />
                              Generuj list przewozowy CMR
                            </button>
                            
                            {/* Przycisk zlecenia transportowego */}
                            {zamowienie.response && !showArchive && canSendOrder && (
                              <button 
                                type="button"
                                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
                                onClick={() => onCreateOrder(zamowienie)}
                              >
                                <Truck size={18} className="mr-2" />
                                Stwórz zlecenie transportowe
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // DLA NORMALNYCH TRANSPORTÓW - pokaż standardowe szczegóły
                      return (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            {/* Sekcja 1: Dane zamówienia i zamawiającego */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <h4 className="font-medium mb-3 pb-2 border-b flex items-center text-blue-700">
                                <FileText size={18} className="mr-2" />
                                Dane zamówienia
                              </h4>
                              <p className="text-sm mb-2"><span className="font-medium">Numer zamówienia:</span> {zamowienie.orderNumber || '-'}</p>
                              <p className="text-sm mb-2"><span className="font-medium">MPK:</span> {zamowienie.mpk}</p>
                              <p className="text-sm mb-2"><span className="font-medium">Osoba dodająca:</span> {zamowienie.createdBy || zamowienie.requestedBy}</p>
                              <p className="text-sm mb-2"><span className="font-medium">Osoba odpowiedzialna:</span> {zamowienie.responsiblePerson || zamowienie.createdBy || zamowienie.requestedBy}</p>
                              <p className="text-sm mb-2"><span className="font-medium">Dokumenty:</span> {zamowienie.documents}</p>
                              
                              {/* Dodana informacja o nazwie klienta/odbiorcy */}
                              {zamowienie.clientName && (
                                <p className="text-sm mb-2"><span className="font-medium">Nazwa klienta/odbiorcy:</span> {zamowienie.clientName}</p>
                              )}
                              
                              {/* Informacje o budowach */}
                              {renderResponsibleConstructions(zamowienie)}
                              
                              {/* Informacja o towarze */}
                              {renderGoodsInfo(zamowienie)}
                            </div>

                            {/* Sekcja 2: Szczegóły załadunku/dostawy */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <h4 className="font-medium mb-3 pb-2 border-b flex items-center text-green-700">
                                <MapPin size={18} className="mr-2" />
                                Szczegóły załadunku
                              </h4>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Firma:</div>
                                <div className="text-sm">{getLoadingCompanyName(zamowienie)}</div>
                              </div>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Adres:</div>
                                <div className="text-sm">
                                  {zamowienie.location === 'Odbiory własne' ? (
                                    formatAddress(zamowienie.producerAddress)
                                  ) : (
                                    zamowienie.location
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3 flex items-center">
                                <Phone size={14} className="mr-1" />
                                Kontakt: {zamowienie.loadingContact}
                              </p>
                              
                              <h4 className="font-medium mt-5 mb-3 pb-2 border-b flex items-center text-orange-700">
                                <MapPin size={18} className="mr-2" />
                                Szczegóły dostawy
                              </h4>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Firma:</div>
                                <div className="text-sm">{getUnloadingCompanyName(zamowienie)}</div>
                              </div>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Adres:</div>
                                <div className="text-sm">{formatAddress(zamowienie.delivery)}</div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3 flex items-center">
                                <Phone size={14} className="mr-1" />
                                Kontakt: {zamowienie.unloadingContact}
                              </p>
                              
                              {/* Link do Google Maps */}
                              {generateGoogleMapsLink(zamowienie) && (
                                <div className="mt-4">
                                  <a 
                                    href={generateGoogleMapsLink(zamowienie)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-md flex items-center w-fit transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MapPin size={16} className="mr-2" />
                                    Zobacz trasę na Google Maps
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Sekcja 3: Informacje o transporcie */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <h4 className="font-medium mb-3 pb-2 border-b flex items-center text-purple-700">
                                <Truck size={18} className="mr-2" />
                                Informacje o transporcie
                              </h4>
                              
                              {/* Data dostawy z wyróżnieniem, jeśli zmieniona */}
                              <div className="text-sm mb-2">
                                <div className="flex items-center">
                                  <Calendar size={14} className="mr-2 text-gray-500" />
                                  <span className="font-medium">Data dostawy:</span>
                                </div>
                                
                                {dateChanged ? (
                                  <div className="ml-7 mt-1 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                                    <div className="flex items-center text-yellow-800">
                                      <AlertCircle size={14} className="mr-1" />
                                      <span className="font-medium">Uwaga: Data została zmieniona!</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                      <span className="text-gray-500">Data pierwotna:</span>
                                      <span className="ml-1 line-through text-gray-500">{formatDate(zamowienie.deliveryDate)}</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                      <span className="text-gray-800 font-medium">Data aktualna:</span>
                                      <span className="ml-1 font-medium text-green-700">{formatDate(zamowienie.response.newDeliveryDate)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="ml-7 mt-1">
                                    {formatDate(zamowienie.deliveryDate)}
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-sm mb-2 flex items-center">
                                <Calendar size={14} className="mr-2 text-gray-500" />
                                <span className="font-medium">Data dodania:</span> {formatDate(zamowienie.createdAt)}
                              </p>
                              
                              <p className="text-sm mb-2 flex items-center">
                                <MapPin size={14} className="mr-2 text-gray-500" />
                                <span className="font-medium">Odległość:</span> 
                                <span className="bg-blue-50 px-2 py-0.5 rounded ml-1 font-medium">
                                  {displayRoute.distance} km
                                </span>
                              </p>
                              
                              {zamowienie.response && zamowienie.response.deliveryPrice && (
                                <>
                                  <p className="text-sm mb-2 flex items-center">
                                    <DollarSign size={14} className="mr-2 text-gray-500" />
                                    <span className="font-medium">Cena transportu:</span> 
                                    <span className="bg-green-50 px-2 py-0.5 rounded ml-1 font-medium">
                                      {zamowienie.response.deliveryPrice} PLN
                                    </span>
                                  </p>
                                  <p className="text-sm mb-2 flex items-center">
                                    <DollarSign size={14} className="mr-2 text-gray-500" />
                                    <span className="font-medium">Cena za km:</span> 
                                    <span className="bg-green-50 px-2 py-0.5 rounded ml-1 font-medium">
                                      {(() => {
                                        const totalDistance = displayRoute.distance;
                                        return totalDistance > 0 
                                          ? (zamowienie.response.deliveryPrice / totalDistance).toFixed(2)
                                          : '0.00';
                                      })()} PLN/km
                                    </span>
                                  </p>
                                </>
                              )}
                              
                              {zamowienie.notes && (
                                <div className="mt-3 bg-gray-50 p-2 rounded-md">
                                  <p className="text-sm"><span className="font-medium">Uwagi:</span> {zamowienie.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {canEdit && (
                            <div className="mt-4 flex justify-end">
                              <button 
                                type="button"
                                className={buttonClasses.primary}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(zamowienie)
                                }}
                              >
                                <Pencil size={16} />
                                Edytuj zamówienie
                              </button>
                            </div>
                          )}

                          {zamowienie.response && (
                            <div className="mt-4 p-5 rounded-lg border shadow-sm bg-gray-50 border-gray-200">
                              <h4 className="font-medium mb-3 pb-2 border-b border-gray-200 flex items-center text-gray-800">
                                <Truck size={18} className="mr-2" />
                                Szczegóły realizacji
                              </h4>
                              
                              {zamowienie.response.completedManually ? (
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-100 flex items-center">
                                  <Clipboard size={18} className="mr-2" />
                                  Zamówienie zostało ręcznie oznaczone jako zrealizowane.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Informacje o przewoźniku */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-blue-600">
                                      <User size={14} className="mr-1" />
                                      Dane przewoźnika
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Kierowca:</span> {zamowienie.response.driverName} {zamowienie.response.driverSurname}</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Telefon:</span> {zamowienie.response.driverPhone}</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Numery auta:</span> {zamowienie.response.vehicleNumber}</p>
                                  </div>
                                  
                                  {/* Informacje o kosztach */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-green-600">
                                      <DollarSign size={14} className="mr-1" />
                                      Dane finansowe
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Cena całkowita:</span> 
                                      <span className="bg-green-50 px-2 py-0.5 rounded ml-1">
                                        {zamowienie.response.deliveryPrice} PLN
                                      </span>
                                    </p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Odległość całkowita:</span> 
                                      {`${displayRoute.distance} km`}
                                    </p>
                                    {(() => {
                                      const totalDistance = displayRoute.distance;
                                      
                                      if (totalDistance > 0 && zamowienie.response.deliveryPrice > 0) {
                                        return (
                                          <p className="text-sm mb-1.5"><span className="font-medium">Koszt za km:</span> 
                                            <span className="bg-green-50 px-2 py-0.5 rounded ml-1">
                                              {(zamowienie.response.deliveryPrice / totalDistance).toFixed(2)} PLN/km
                                            </span>
                                          </p>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  
                                  {/* Informacje o realizacji */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-purple-600">
                                      <Calendar size={14} className="mr-1" />
                                      Informacje o realizacji
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Data odpowiedzi:</span> {formatDate(zamowienie.completedAt || zamowienie.createdAt)}</p>
                                    
                                    {zamowienie.response.dateChanged && (
                                      <div className="bg-yellow-50 p-2 rounded-md border border-yellow-100 mt-2 mb-1.5">
                                        <p className="text-sm font-medium text-yellow-800">Zmieniono datę dostawy:</p>
                                        <p className="text-xs flex justify-between mt-1">
                                          <span>Z: <span className="line-through">{formatDate(zamowienie.response.originalDeliveryDate)}</span></span>
                                          <span>→</span>
                                          <span>Na: <span className="font-medium">{formatDate(zamowienie.response.newDeliveryDate)}</span></span>
                                        </p>
                                      </div>
                                    )}
                                    
                                    {zamowienie.response.adminNotes && (
                                      <p className="text-sm"><span className="font-medium">Uwagi:</span> {zamowienie.response.adminNotes}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="mt-5 flex space-x-3">
                                <button 
                                  type="button"
                                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                                  onClick={() => generateCMR(zamowienie)}
                                >
                                  <FileText size={16} />
                                  Generuj CMR
                                </button>
                                {zamowienie.response && !showArchive && canSendOrder && (
                                  <button 
                                    type="button"
                                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
                                    onClick={() => onCreateOrder(zamowienie)}
                                  >
                                    <Truck size={16} />
                                    Stwórz zlecenie transportowe
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          );
        })}
    </div>
  )
}
