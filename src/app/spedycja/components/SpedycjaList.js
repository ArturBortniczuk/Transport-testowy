// src/app/spedycja/components/SpedycjaList.js
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
  onCopy,
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

  // POPRAWIONA FUNKCJA: Generuje wyświetlaną trasę dla połączonych transportów
  const getDisplayRoute = (zamowienie) => {
    const mergedData = getMergedTransportsData(zamowienie);
    
    if (mergedData) {
      // Zbierz wszystkie miasta rozładunku
      const allUnloadingCities = [];
      const allMPKs = [];
      
      // Dodaj główny transport
      if (zamowienie.delivery?.city && !allUnloadingCities.includes(zamowienie.delivery.city)) {
        allUnloadingCities.push(zamowienie.delivery.city);
      }
      if (zamowienie.mpk && !allMPKs.includes(zamowienie.mpk)) {
        allMPKs.push(zamowienie.mpk);
      }
      
      // Dodaj z połączonych transportów
      mergedData.originalTransports.forEach(originalTransport => {
        let unloadingCity;
        try {
          unloadingCity = originalTransport.delivery_data?.city || 
                         (typeof originalTransport.delivery_data === 'string' ? 
                          JSON.parse(originalTransport.delivery_data || '{}').city : null);
        } catch (error) {
          console.error('Błąd parsowania delivery_data:', error);
          unloadingCity = null;
        }
        
        if (unloadingCity && !allUnloadingCities.includes(unloadingCity)) {
          allUnloadingCities.push(unloadingCity);
        }
        
        if (originalTransport.mpk && !allMPKs.includes(originalTransport.mpk)) {
          allMPKs.push(originalTransport.mpk);
        }
      });

      // Utwórz czytelny opis trasy
      const mainLoadingCity = getLoadingCity(zamowienie);
      const unloadingText = allUnloadingCities.length > 3 
        ? `${allUnloadingCities.slice(0, 3).join(', ')} (+${allUnloadingCities.length - 3} więcej)`
        : allUnloadingCities.join(', ');
      
      return {
        text: `${mainLoadingCity} → ${unloadingText}`,
        distance: mergedData.totalDistance,
        isMerged: true,
        allCities: allUnloadingCities,
        allMPKs: allMPKs,
        additionalInfo: `${mergedData.originalTransports.length + 1} tras, MPK: ${allMPKs.join(', ')}`
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
    }

    // Funkcja pomocnicza do formatowania nazwy firmy rozładunku
    const getTransportUnloadingCompany = (transportData) => {
      return transportData.client_name || transportData.clientName || 'Nie podano';
    }

    // Zbierz wszystkie miasta rozładunku i numery MPK
    const allUnloadingCities = [];
    const allMPKs = [];
    
    // Dodaj główny transport
    if (transport.delivery?.city && !allUnloadingCities.includes(transport.delivery.city)) {
      allUnloadingCities.push(transport.delivery.city);
    }
    if (transport.mpk && !allMPKs.includes(transport.mpk)) {
      allMPKs.push(transport.mpk);
    }
    
    // Dodaj z połączonych transportów
    mergedData.originalTransports.forEach(originalTransport => {
      let unloadingCity;
      try {
        unloadingCity = originalTransport.delivery_data?.city || 
                       (typeof originalTransport.delivery_data === 'string' ? 
                        JSON.parse(originalTransport.delivery_data || '{}').city : null);
      } catch (error) {
        console.error('Błąd parsowania delivery_data:', error);
        unloadingCity = null;
      }
      
      if (unloadingCity && !allUnloadingCities.includes(unloadingCity)) {
        allUnloadingCities.push(unloadingCity);
      }
      
      if (originalTransport.mpk && !allMPKs.includes(originalTransport.mpk)) {
        allMPKs.push(originalTransport.mpk);
      }
    });

    // Utwórz faktyczną sekwencję tras (nie załadunek-rozładunek, ale chronologiczną)
    const createRouteSequence = () => {
      const sequence = [];
      
      // Rozpocznij od głównego załadunku
      sequence.push({
        type: 'loading',
        city: getLoadingCity(transport),
        company: getLoadingCompanyName(transport),
        address: transport.location === 'Odbiory własne' && transport.producerAddress 
          ? formatAddress(transport.producerAddress)
          : transport.location,
        contact: transport.loading_contact,
        transportId: 'main',
        mpk: transport.mpk
      });

      // Dodaj punkty z połączonych transportów (w kolejności logicznej)
      mergedData.originalTransports.forEach((originalTransport, index) => {
        // Załadunek (jeśli różny od głównego)
        let loadingCity;
        try {
          loadingCity = originalTransport.location === 'Odbiory własne' && originalTransport.location_data
            ? JSON.parse(originalTransport.location_data || '{}').city
            : originalTransport.location?.replace('Magazyn ', '');
        } catch (error) {
          console.error('Błąd parsowania location_data:', error);
          loadingCity = originalTransport.location?.replace('Magazyn ', '');
        }
        
        const mainLoadingCity = getLoadingCity(transport);
        
        if (loadingCity && loadingCity !== mainLoadingCity) {
          sequence.push({
            type: 'loading',
            city: loadingCity,
            company: getTransportLoadingCompany(originalTransport),
            address: originalTransport.location,
            contact: originalTransport.loading_contact,
            transportId: originalTransport.id,
            mpk: originalTransport.mpk
          });
        }

        // Rozładunek
        let deliveryData;
        try {
          deliveryData = originalTransport.delivery_data 
            ? (typeof originalTransport.delivery_data === 'string' 
               ? JSON.parse(originalTransport.delivery_data) 
               : originalTransport.delivery_data)
            : null;
        } catch (error) {
          console.error('Błąd parsowania delivery_data:', error);
          deliveryData = null;
        }

        if (deliveryData) {
          sequence.push({
            type: 'unloading',
            city: deliveryData.city,
            company: getTransportUnloadingCompany(originalTransport),
            address: formatAddress(deliveryData),
            contact: originalTransport.unloading_contact,
            transportId: originalTransport.id,
            mpk: originalTransport.mpk
          });
        }
      });

      // Zakończ głównym rozładunkiem
      sequence.push({
        type: 'unloading',
        city: getDeliveryCity(transport),
        company: getUnloadingCompanyName(transport),
        address: formatAddress(transport.delivery),
        contact: transport.unloading_contact,
        transportId: 'main',
        mpk: transport.mpk
      });

      return sequence;
    };

    const routeSequence = createRouteSequence();

    return (
      <div className="space-y-6">
        {/* Podsumowanie transportu */}
        <div className="bg-white rounded-lg border border-purple-200 p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-purple-700 text-lg">
                Transport: {getLoadingCity(transport)} → {allUnloadingCities.join(', ')}
              </h4>
              <div className="text-sm text-gray-600 mt-1 space-y-1">
                <div>
                  <span className="font-medium">Miasta rozładunku:</span> {allUnloadingCities.join(', ')}
                </div>
                <div>
                  <span className="font-medium">Numery MPK:</span> {allMPKs.join(', ')}
                </div>
                <div>
                  <span className="font-medium">Łączny dystans:</span> {mergedData.totalDistance} km
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-green-700 font-medium text-lg">
                <DollarSign size={18} className="mr-1" />
                {(mergedData.totalMergedCost || 0).toFixed(2)} PLN
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Koszt rozłożony między transporty
              </div>
            </div>
          </div>
        </div>

        {/* Sekwencja trasy */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-700 mb-4 flex items-center">
            <MapPin size={18} className="mr-2" />
            Sekwencja trasy
          </h4>
          
          <div className="space-y-3">
            {routeSequence.map((point, index) => (
              <div key={`${point.transportId}-${point.type}-${index}`} className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-sm mr-3 mt-1">
                  {index + 1}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                      point.type === 'loading' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {point.type === 'loading' ? 'Załadunek' : 'Rozładunek'}
                    </span>
                    
                    {point.mpk && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium mr-2">
                        MPK: {point.mpk}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1">
                    <div className="font-medium text-gray-800">{point.company}</div>
                    <div className="text-sm text-gray-600">{point.address}</div>
                    {point.contact && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone size={12} className="mr-1" />
                        {point.contact}
                      </div>
                    )}
                  </div>
                </div>
                
                {index < routeSequence.length - 1 && (
                  <div className="flex-shrink-0 ml-2 mt-6">
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Szczegóły kosztów - kompaktowo */}
        {mergedData.costBreakdown && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <DollarSign size={18} className="mr-2" />
              Podział kosztów
            </h4>
            
            <div className="text-sm space-y-2">
              {/* Główny transport */}
              <div className="flex justify-between">
                <span>Transport (MPK: {transport.mpk})</span>
                <span className="font-medium">{(mergedData.costBreakdown.mainTransport?.cost || 0).toFixed(2)} PLN</span>
              </div>
              
              {/* Połączone transporty */}
              {mergedData.costBreakdown.mergedTransports?.map(t => (
                <div key={t.id} className="flex justify-between">
                  <span>Transport MPK: {t.mpk}</span>
                  <span className="font-medium">{(t.cost || 0).toFixed(2)} PLN</span>
                </div>
              ))}
              
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>Łącznie:</span>
                <span>{(mergedData.totalMergedCost || 0).toFixed(2)} PLN</span>
              </div>
            </div>
          </div>
        )}

        {/* Informacje o połączeniu */}
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="text-sm text-purple-700">
            <div className="font-medium mb-1">Informacje o połączeniu</div>
            <div>Połączono: {mergedData.mergedAt ? 
              format(new Date(mergedData.mergedAt), 'dd.MM.yyyy HH:mm', { locale: pl }) : 'brak daty'} przez {mergedData.mergedBy || 'Nieznany'}
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

  // Funkcja do generowania linku do Google Maps
  const generateGoogleMapsLink = (transport) => {
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
                          {displayRoute.additionalInfo}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Calendar size={14} className="mr-1" />
                      Data dostawy: 
                      {dateChanged ? (
                        <span className="ml-1">
                          <span className="line-through text-gray-400">{formatDate(zamowienie.deliveryDate)}</span>
                          <span className="ml-2 text-orange-600 font-medium">{formatDate(displayDate)}</span>
                        </span>
                      ) : (
                        <span className="ml-1">{formatDate(displayDate)}</span>
                      )}
                    </p>
                    
                    {/* Dodatkowe informacje dla transportu połączonego */}
                    {displayRoute.isMerged && (
                      <div className="text-xs text-purple-600 mt-1 flex items-center">
                        <MapPin size={12} className="mr-1" />
                        {displayRoute.distance} km łącznie • {displayRoute.allCities.length} {displayRoute.allCities.length === 1 ? 'miasto' : displayRoute.allCities.length < 5 ? 'miasta' : 'miast'} rozładunku
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${statusInfo.className}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>
                  
                  {!showArchive && (
                    <div className="flex items-center space-x-2">
                      {canEdit && (
                        <button 
                          type="button"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(zamowienie)
                          }}
                          title="Edytuj zamówienie"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      
                      {(isAdmin || isCreatedByCurrentUser(zamowienie)) && (
                        <button 
                          type="button"
                          className="text-gray-400 hover:text-green-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCopy(zamowienie)
                          }}
                          title="Kopiuj zamówienie"
                        >
                          <Copy size={18} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="text-gray-400">
                    {expandedId === zamowienie.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
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
                                  
                                  {/* Informacje o kosztach - ukryte dla połączonych */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-green-600">
                                      <DollarSign size={14} className="mr-1" />
                                      Dane finansowe
                                    </h5>
                                    <p className="text-sm mb-1.5">Szczegóły kosztów znajdują się w sekcji "Podział kosztów" powyżej</p>
                                  </div>
                                  
                                  {/* Informacje o trasie */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-purple-600">
                                      <MapPin size={14} className="mr-1" />
                                      Trasa
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Dystans:</span> {zamowienie.response.totalDistance || 0} km</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Liczba tras:</span> {getMergedTransportsData(zamowienie)?.originalTransports.length + 1}</p>
                                    {generateGoogleMapsLink(zamowienie) && (
                                      <a 
                                        href={generateGoogleMapsLink(zamowienie)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        <MapPin size={12} className="mr-1" />
                                        Zobacz trasę w Google Maps
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Przyciski akcji */}
                          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                            {statusInfo.label !== 'Zakończone' && (
                              <>
                                {/* Przyciski dla transportu z odpowiedzią */}
                                {(zamowienie.response && Object.keys(zamowienie.response).length > 0) && (
                                  <>
                                    <button 
                                      type="button"
                                      className={buttonClasses.success}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onCreateOrder(zamowienie)
                                      }}
                                    >
                                      <FileText size={16} />
                                      Stwórz zlecenie transportowe
                                    </button>
                                    
                                    {/* Przycisk rozłączania transportów - tylko dla adminów i tylko dla połączonych */}
                                    {isAdmin && isMerged && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (confirm('Czy na pewno chcesz rozłączyć ten transport? Wszystkie połączone transporty zostaną przywrócone jako osobne zlecenia.')) {
                                            handleUnmergeTransport(zamowienie.id)
                                          }
                                        }}
                                        className={buttonClasses.success}
                                        style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                                      >
                                        <Unlink size={16} />
                                        Rozłącz transporty
                                      </button>
                                    )}
                                  </>
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
                                  {zamowienie.location === 'Odbiory własne' ?
                                    formatAddress(zamowienie.producerAddress) :
                                    zamowienie.location
                                  }
                                </div>
                              </div>
                              {zamowienie.loadingContact && (
                                <div className="mb-2">
                                  <div className="font-medium text-sm text-gray-700">Kontakt:</div>
                                  <div className="text-sm flex items-center">
                                    <Phone size={12} className="mr-1" />
                                    {zamowienie.loadingContact}
                                  </div>
                                </div>
                              )}
                              
                              <hr className="my-3" />
                              
                              <h5 className="font-medium mb-2 text-red-700">Szczegóły rozładunku</h5>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Firma:</div>
                                <div className="text-sm">{getUnloadingCompanyName(zamowienie)}</div>
                              </div>
                              <div className="mb-2">
                                <div className="font-medium text-sm text-gray-700">Adres:</div>
                                <div className="text-sm">{formatAddress(zamowienie.delivery)}</div>
                              </div>
                              {zamowienie.unloadingContact && (
                                <div className="mb-2">
                                  <div className="font-medium text-sm text-gray-700">Kontakt:</div>
                                  <div className="text-sm flex items-center">
                                    <Phone size={12} className="mr-1" />
                                    {zamowienie.unloadingContact}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sekcja 3: Status i odpowiedź */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <h4 className="font-medium mb-3 pb-2 border-b flex items-center text-orange-700">
                                <AlertCircle size={18} className="mr-2" />
                                Status zlecenia
                              </h4>
                              <div className="mb-3">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                                  {statusInfo.icon}
                                  {statusInfo.label}
                                </div>
                              </div>
                              
                              {/* Informacje o odpowiedzi */}
                              {zamowienie.response && Object.keys(zamowienie.response).length > 0 ? (
                                <div className="space-y-2">
                                  <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                    <div className="text-green-800 font-medium text-sm mb-1">Odpowiedź została udzielona</div>
                                    <div className="text-green-700 text-xs">
                                      Sprawdź szczegóły realizacji poniżej
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <div className="text-blue-800 font-medium text-sm mb-1">Oczekuje na odpowiedź</div>
                                    <div className="text-blue-700 text-xs">
                                      Zlecenie zostało utworzone i oczekuje na odpowiedź przewoźnika
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

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

                          {/* Szczegóły realizacji dla normalnych transportów */}
                          {zamowienie.response && (
                            <div className="mt-4 p-5 rounded-lg border shadow-sm bg-green-50 border-green-200">
                              <h4 className="font-medium mb-3 pb-2 border-b border-green-300 flex items-center text-green-800">
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
                                    <p className="text-sm mb-1.5"><span className="font-medium">Cena dostawy:</span> {zamowienie.response.deliveryPrice} PLN</p>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Termin płatności:</span> {zamowienie.response.paymentTerm}</p>
                                  </div>
                                  
                                  {/* Informacje o trasie */}
                                  <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-medium mb-2 pb-1 border-b flex items-center text-purple-600">
                                      <MapPin size={14} className="mr-1" />
                                      Trasa
                                    </h5>
                                    <p className="text-sm mb-1.5"><span className="font-medium">Dystans:</span> {zamowienie.distanceKm || zamowienie.response.distance || 0} km</p>
                                    {generateGoogleMapsLink(zamowienie) && (
                                      <a 
                                        href={generateGoogleMapsLink(zamowienie)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        <MapPin size={12} className="mr-1" />
                                        Zobacz trasę w Google Maps
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Przyciski akcji */}
                          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                            {statusInfo.label !== 'Zakończone' && (
                              <>
                                {(!zamowienie.response || Object.keys(zamowienie.response).length === 0) && !isMerged && (
                                  <button 
                                    type="button"
                                    className={buttonClasses.primary}
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
                                
                                {/* Przyciski dla transportu z odpowiedzią */}
                                {(zamowienie.response && Object.keys(zamowienie.response).length > 0) && (
                                  <button 
                                    type="button"
                                    className={buttonClasses.success}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onCreateOrder(zamowienie)
                                    }}
                                  >
                                    <FileText size={16} />
                                    Stwórz zlecenie transportowe
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
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
