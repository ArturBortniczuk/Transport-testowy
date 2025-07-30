// src/app/spedycja/components/SpedycjaList.js
import React, { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { generateCMR } from '@/lib/utils/generateCMR'
import { Truck, Package, MapPin, Phone, FileText, Calendar, DollarSign, User, Clipboard, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Edit, Pencil, Building, ShoppingBag, Weight, Bot, Link as LinkIcon, Unlink, Copy } from 'lucide-react'
import MultiTransportResponseForm from './MultiTransportResponseForm'

export default function SpedycjaList({ 
  zamowienia, 
  showArchive, 
  isAdmin, 
  onResponse, 
  onMarkAsCompleted, 
  onCreateOrder, 
  canSendOrder,
  onEdit,
  onCopy,
  currentUserEmail,
  fetchSpedycje,
  showOperationMessage
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [showMultiResponseForm, setShowMultiResponseForm] = useState(false)

  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2",
    success: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2",
    danger: "px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
  }

  // NOWA FUNKCJA: Funkcja obsługi odpowiedzi zbiorczej na wiele transportów
  const handleMultiTransportResponse = async (responseData) => {
    try {
      console.log('📤 SpedycjaList: Otrzymałem dane odpowiedzi:', responseData)
      
      const payload = {
        transportIds: responseData.selectedTransports,
        routeSequence: responseData.routeSequence,
        driverInfo: responseData.driverInfo,
        totalPrice: responseData.totalPrice,
        priceBreakdown: responseData.priceBreakdown,
        transportDate: responseData.transportDate,
        notes: responseData.notes,
        cargoDescription: responseData.cargoDescription,
        totalWeight: responseData.totalWeight,
        totalDistance: responseData.totalDistance,
        isMerged: responseData.isMerged
      }
      
      console.log('📋 SpedycjaList: Wysyłam do API:', JSON.stringify(payload, null, 2))
      
      const response = await fetch('/api/spedycje/multi-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      console.log('📡 SpedycjaList: Odpowiedź API status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ SpedycjaList: Błąd odpowiedzi API:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ SpedycjaList: Sukces API:', data)
      
      if (data.success) {
        const message = `Odpowiedź została pomyślnie zapisana dla ${responseData.selectedTransports.length} transport${responseData.selectedTransports.length > 1 ? 'ów' : 'u'}`
        showOperationMessage(message, 'success')
        setShowMultiResponseForm(false)
        
        // Wywołaj fetchSpedycje jeśli istnieje
        if (typeof fetchSpedycje === 'function') {
          await fetchSpedycje()
        } else {
          console.log('⚠️ fetchSpedycje nie jest funkcją, odświeżam stronę')
          window.location.reload()
        }
      } else {
        throw new Error(data.error || 'Nieznany błąd API')
      }
    } catch (error) {
      console.error('❌ SpedycjaList: Błąd odpowiedzi zbiorczej:', error)
      const errorMessage = error.message || 'Wystąpił nieoczekiwany błąd'
      showOperationMessage('Wystąpił błąd podczas zapisywania odpowiedzi: ' + errorMessage, 'error')
    }
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
      return zamowienie.producerAddress.city || 'Brak miasta';
    } else if (zamowienie.location === 'Magazyn Białystok') {
      return 'Białystok';
    } else if (zamowienie.location === 'Magazyn Zielonka') {
      return 'Zielonka';
    }
    return zamowienie.location || 'Nie podano';
  }
  
  const getDeliveryCity = (zamowienie) => {
    return zamowienie.delivery?.city || '';
  }

  // Funkcja pomocnicza do określania nazwy firmy załadunku
  const getLoadingCompanyName = (transport) => {
    if (transport.location === 'Odbiory własne') {
      return transport.sourceClientName || transport.clientName || (transport.producerAddress?.city || 'Brak miasta');
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

  // Sprawdza czy transport jest połączony
  const isMergedTransport = (zamowienie) => {
    return zamowienie.merged_transports && zamowienie.response?.isMerged;
  };

  // Pobiera dane o połączonych transportach
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

  // NOWA FUNKCJA: Pobieranie wszystkich miast rozładunku
  const getAllUnloadingCities = (zamowienie) => {
    const cities = new Set();
    cities.add(getDeliveryCity(zamowienie));
    
    const mergedData = getMergedTransportsData(zamowienie);
    if (mergedData && mergedData.originalTransports) {
      mergedData.originalTransports.forEach(transport => {
        if (transport && transport.delivery_data) {
          try {
            const deliveryData = typeof transport.delivery_data === 'string' 
              ? JSON.parse(transport.delivery_data) 
              : transport.delivery_data;
            if (deliveryData && deliveryData.city) {
              cities.add(deliveryData.city);
            }
          } catch (error) {
            console.error('Błąd parsowania danych dostawy:', error);
          }
        }
      });
    }
    
    return Array.from(cities).filter(city => city && city !== 'Nie podano');
  };

  // NOWA FUNKCJA: Pobieranie wszystkich numerów MPK
  const getAllMPKNumbers = (zamowienie) => {
    const mpkNumbers = new Set();
    if (zamowienie.mpk) mpkNumbers.add(zamowienie.mpk);
    
    const mergedData = getMergedTransportsData(zamowienie);
    if (mergedData && mergedData.originalTransports) {
      mergedData.originalTransports.forEach(transport => {
        if (transport && transport.mpk) {
          mpkNumbers.add(transport.mpk);
        }
      });
    }
    
    return Array.from(mpkNumbers);
  };

  // NOWA FUNKCJA: Tworzenie sekwencji trasy
  const createRouteSequence = (zamowienie) => {
    const sequence = [];
    const mergedData = getMergedTransportsData(zamowienie);
    
    // Główny załadunek
    sequence.push({
      type: 'loading',
      city: getLoadingCity(zamowienie),
      company: getLoadingCompanyName(zamowienie),
      mpk: zamowienie.mpk
    });

    // Dodatkowe punkty z połączonych transportów
    if (mergedData && mergedData.originalTransports) {
      mergedData.originalTransports.forEach((transport) => {
        if (!transport) return;
        
        // Dodaj załadunek jeśli różni się od głównego
        let loadingCity = '';
        if (transport.location === 'Magazyn Białystok') {
          loadingCity = 'Białystok';
        } else if (transport.location === 'Magazyn Zielonka') {
          loadingCity = 'Zielonka';
        } else if (transport.location === 'Odbiory własne' && transport.location_data) {
          try {
            const locationData = typeof transport.location_data === 'string' 
              ? JSON.parse(transport.location_data) 
              : transport.location_data;
            loadingCity = locationData?.city || '';
          } catch (error) {
            console.error('Błąd parsowania danych lokalizacji:', error);
          }
        }
        
        if (loadingCity && loadingCity !== getLoadingCity(zamowienie)) {
          sequence.push({
            type: 'loading',
            city: loadingCity,
            company: getLoadingCompanyName(transport),
            mpk: transport.mpk
          });
        }
      });
    }

    // Główny rozładunek (zawsze ostatni)
    sequence.push({
      type: 'unloading',
      city: getDeliveryCity(zamowienie),
      company: getUnloadingCompanyName(zamowienie)
    });

    return sequence;
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

  // Generowanie linku z zapisanych punktów trasy
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

  // Pobieranie adresu z punktu trasy
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

  // Rekonstrukcja trasy z danych połączonych transportów (fallback)
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
      // Dla połączonych transportów - pokaż wszystkie miasta rozładunku
      const allCities = getAllUnloadingCities(zamowienie);
      const mainRoute = `${getLoadingCity(zamowienie)} → ${allCities.join(', ')}`;
      
      return {
        text: mainRoute,
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

  // Obsługa rozłączania transportów
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
  
  const renderMergedTransportsInfo = (transport) => {
    const mergedData = getMergedTransportsData(transport);
    if (!mergedData) return null;
    
    // Funkcja pomocnicza do formatowania nazwy firmy z danych transportu
    const getTransportLoadingCompany = (transportData) => {
      if (!transportData) return 'Nie podano';
      
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
      if (!transportData) return 'Nie podano';
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
        
        if (parsed && (parsed.city || parsed.postalCode || parsed.street)) {
          return `${parsed.city || ''}, ${parsed.postalCode || ''}, ${parsed.street || ''}`.replace(/^,\s*|,\s*$/g, '');
        }
      } catch (error) {
        console.error('Błąd parsowania adresu:', error);
      }
      
      return 'Brak danych';
    };
    
    // Sprawdź czy mergedData.originalTransports istnieje i jest tablicą
    if (!mergedData.originalTransports || !Array.isArray(mergedData.originalTransports)) {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700">
            Błąd: Nieprawidłowe dane połączonych transportów
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-medium text-purple-700 mb-3 flex items-center">
          <LinkIcon size={18} className="mr-2" />
          Szczegóły realizacji ({mergedData.originalTransports.length + 1} tras)
        </h4>
        
        <div className="space-y-4">
          {/* Transport podstawowy */}
          <div className="p-4 bg-white rounded border-l-4 border-purple-400">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-purple-800 text-lg">
                  {transport.orderNumber || transport.id}
                </div>
                <div className="text-sm text-gray-600">
                  MPK: {transport.mpk || 'Brak'}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-green-700 font-medium text-lg">
                  <DollarSign size={18} className="mr-1" />
                  {(mergedData.mainTransportCost || 0).toFixed(2)} PLN
                </div>
                <div className="text-xs text-gray-500">
                  {mergedData.costBreakdown?.mainTransport?.distance || 0} km
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Podzielone koszty
                </div>
              </div>
            </div>
            
            {/* Szczegóły transportu podstawowego */}
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
                    {transport.loadingContact || 'Brak'}
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
                    {transport.unloadingContact || 'Brak'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Połączone transporty */}
          {mergedData.originalTransports.map((originalTransport, index) => {
            // Sprawdź czy originalTransport nie jest null lub undefined
            if (!originalTransport) {
              return (
                <div key={`error-${index}`} className="p-4 bg-red-50 rounded border border-red-200">
                  <div className="text-red-700">Błąd: Brakujące dane transportu #{index + 1}</div>
                </div>
              );
            }
            
            return (
              <div key={originalTransport.id || `transport-${index}`} className="p-4 bg-white rounded border-l-4 border-gray-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-800">
                      {originalTransport.orderNumber || `Transport ${originalTransport.id || index + 1}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      MPK: {originalTransport.mpk || 'Brak'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Odp: {originalTransport.responsiblePerson || 'Brak'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-700 font-medium">
                      <DollarSign size={16} className="mr-1" />
                      {(originalTransport.costAssigned || 0).toFixed(2)} PLN
                    </div>
                    <div className="text-xs text-gray-500">
                      {originalTransport.distance || 0} km
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      Podzielone koszty
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
                        {originalTransport.loading_contact || 'Brak'}
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
                        {originalTransport.unloading_contact || 'Brak'}
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
            );
          })}
          
          {/* Podsumowanie finansowe */}
          <div className="pt-3 border-t border-purple-200 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <DollarSign size={16} className="mr-1" />
              Dane finansowe (łączne)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-blue-700 font-medium">Łączna odległość:</div>
                <div className="text-blue-900 font-semibold">{mergedData.totalDistance || 0} km</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Łączny koszt:</div>
                <div className="text-blue-900 font-semibold">{transport.response?.deliveryPrice || 0} PLN</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Koszt za km:</div>
                <div className="text-blue-900 font-semibold">
                  {mergedData.totalDistance > 0 ? ((transport.response?.deliveryPrice || 0) / mergedData.totalDistance).toFixed(2) : '0.00'} PLN/km
                </div>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-blue-600">
              Połączono {mergedData.mergedAt ? format(new Date(mergedData.mergedAt), 'dd.MM.yyyy HH:mm', { locale: pl }) : 'brak daty'} przez {mergedData.mergedBy || 'Nieznany'}
            </div>
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

  // Filtruj zamówienia na podstawie showArchive
  const filteredSpedycje = zamowienia.filter(zamowienie => {
    if (showArchive) {
      return zamowienie.status === 'completed' || zamowienie.status === 'responded';
    } else {
      return zamowienie.status === 'new';
    }
  });

  return (
    <div>
      {/* ZMIENIONY NAGŁÓWEK z przyciskiem odpowiedzi zbiorczej */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {showArchive ? 'Archiwum zapytań spedycyjnych' : 'Nowe zapytania spedycyjne'}
        </h1>
        
        {/* Nowy przycisk odpowiedzi zbiorczej - tylko dla nowych zapytań */}
        {!showArchive && filteredSpedycje.length > 0 && (
          <button
            onClick={() => setShowMultiResponseForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Truck size={20} />
            Odpowiedz
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
              {filteredSpedycje.length}
            </span>
          </button>
        )}
      </div>

      <div className="divide-y">
        {filteredSpedycje.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {showArchive ? 'Brak zamówień w archiwum' : 'Brak nowych zamówień'}
            </p>
          </div>
        ) : (
          filteredSpedycje.map((zamowienie) => {
            const statusInfo = getStatusLabel(zamowienie);
            const dateChanged = isDeliveryDateChanged(zamowienie);
            const displayDate = getActualDeliveryDate(zamowienie);
            const canEdit = canBeEdited(zamowienie) && (isAdmin || isCreatedByCurrentUser(zamowienie));
            const isMerged = isMergedTransport(zamowienie);
            const displayRoute = getDisplayRoute(zamowienie);
            
            // Pobierz wszystkie miasta rozładunku i numery MPK dla nagłówka
            const allUnloadingCities = getAllUnloadingCities(zamowienie);
            const allMPKNumbers = getAllMPKNumbers(zamowienie);
            const routeSequence = createRouteSequence(zamowienie);
            
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
                    <div className="flex-1">
                      <h3 className="font-medium flex items-center mb-2">
                        <span className={isMerged ? "text-purple-600 font-semibold" : ""}>
                          {zamowienie.orderNumber || `Transport #${zamowienie.id}`}
                        </span>
                        {zamowienie.clientName && (
                          <span className="ml-2 text-sm text-gray-600">
                            ({zamowienie.clientName})
                          </span>
                        )}
                        {isMerged && (
                          <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                            <LinkIcon size={12} className="mr-1" />
                            Transport połączony
                          </span>
                        )}
                      </h3>
                      
                      {/* Sekwencja trasy przed rozwinięciem */}
                      <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center flex-wrap gap-2">
                          {routeSequence.map((point, index) => (
                            <React.Fragment key={index}>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  point.type === 'loading' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-xs font-medium text-gray-700">
                                  {point.city}
                                  {point.mpk && (
                                    <span className="text-xs text-gray-500 ml-1">({point.mpk})</span>
                                  )}
                                </span>
                              </div>
                              {index < routeSequence.length - 1 && (
                                <div className="text-gray-400 text-xs">→</div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar size={14} className="mr-2" />
                          Data: 
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
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FileText size={14} className="mr-2" />
                          MPK: {allMPKNumbers.join(', ') || 'Brak'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin size={14} className="mr-2" />
                          Rozładunek: {allUnloadingCities.join(', ')}
                        </div>
                      </div>
                      
                      {/* Wyświetl informację o budowach */}
                      {zamowienie.responsibleConstructions && zamowienie.responsibleConstructions.length > 0 && (
                        <div className="flex items-center mt-2">
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
                    {/* Przycisk kopiowania - dla wszystkich użytkowników */}
                    <button 
                      type="button"
                      className={buttonClasses.outline}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopy(zamowienie)
                      }}
                    >
                      <Copy size={16} />
                      Kopiuj
                    </button>
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
                              {/* Przycisk zlecenia transportowego */}
                              {zamowienie.response && !showArchive && canSendOrder && (
                                <button 
                                  type="button"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
                                  onClick={() => onCreateOrder(zamowienie)}
                                >
                                  <Truck size={18} className="mr-2" />
                                  Stwórz zlecenie transportowe
                                </button>
                              )}

                              {/* Przycisk rozłączania dla adminów */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleUnmergeTransport(zamowienie.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
                                >
                                  <Unlink size={18} className="mr-2" />
                                  Rozłącz transporty
                                </button>
                              )}
                              
                              {/* Link do Google Maps */}
                              {generateGoogleMapsLink(zamowienie) && (
                                <a 
                                  href={generateGoogleMapsLink(zamowienie)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium text-base"
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
                            </div>
                          </div>
                        );
                      } else {
                        // DLA NORMALNYCH TRANSPORTÓW - pokaż standardowe szczegóły (bez zmian)
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
          })
        )}
      </div>

      {/* NOWY MODAL odpowiedzi zbiorczej */}
      {showMultiResponseForm && (
        <MultiTransportResponseForm
          availableTransports={filteredSpedycje}
          onClose={() => setShowMultiResponseForm(false)}
          onSubmit={handleMultiTransportResponse}
        />
      )}
    </div>
  )
}
