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

  // FUNKCJA: Obsługa odpowiedzi zbiorczej na wiele transportów
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
        isMerged: responseData.selectedTransports.length > 1
      }

      console.log('📋 SpedycjaList: Wysyłam payload:', payload)

      const response = await fetch('/api/spedycje/multi-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('📨 SpedycjaList: Odpowiedź z API:', data)

      if (data.success) {
        const transportCount = responseData.selectedTransports.length
        const message = transportCount > 1 
          ? `Pomyślnie zapisano odpowiedź łączącą ${transportCount} transport${transportCount === 2 ? 'y' : transportCount > 4 ? 'ów' : 'y'}`
          : `Pomyślnie zapisano odpowiedź na transport`
        
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

  // FUNKCJE POMOCNICZE
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
    return 'Nie podano';
  }

  // Funkcja pomocnicza do określania miasta rozładunku
  const getUnloadingCity = (transport) => {
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return deliveryData.city || 'Nie podano'      
      } catch (e) {
        return 'Nie podano'
      }
    }
    return transport.delivery?.city || 'Nie podano'
  }

  // Funkcja pomocnicza do określania nazwy firmy rozładunku
  const getUnloadingCompanyName = (transport) => {
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return deliveryData.company || 'Nie podano'
      } catch (e) {
        return 'Nie podano'
      }
    }
    return transport.delivery?.company || transport.clientName || 'Nie podano'
  }

  // Funkcja do sprawdzania czy transport jest już połączony
  const isMergedTransport = (zamowienie) => {
    try {
      const responseData = zamowienie.response_data ? JSON.parse(zamowienie.response_data) : null;
      return responseData && responseData.isMerged === true;
    } catch (e) {
      return false;
    }
  }

  // Funkcja do pobierania danych połączonych transportów
  const getMergedTransportsData = (transport) => {
    try {
      if (!transport.response_data) return null;
      
      const responseData = JSON.parse(transport.response_data);
      if (!responseData.isMerged) return null;
      
      return responseData;
    } catch (error) {
      console.error('Błąd parsowania danych połączonych transportów:', error);
      return null;
    }
  }

  // Funkcja pomocnicza do sprawdzania czy można edytować zamówienie
  const canBeEdited = (zamowienie) => {
    // Nie można edytować jeśli jest zrealizowane/w archiwum
    if (showArchive || zamowienie.status !== 'new') return false;
    
    // Nie można edytować jeśli jest połączone z innymi
    if (isMergedTransport(zamowienie)) return false;
    
    return true;
  }

  // Funkcja pomocnicza do sprawdzania czy zamówienie zostało utworzone przez aktualnego użytkownika
  const isCreatedByCurrentUser = (zamowienie) => {
    return zamowienie.createdByEmail === currentUserEmail;
  }

  // Funkcja do pobierania statusu zamówienia
  const getStatusLabel = (zamowienie) => {
    if (zamowienie.status === 'completed') {
      return { 
        text: 'Zrealizowane', 
        class: 'bg-green-100 text-green-800',
        icon: <Clipboard size={16} className="mr-1" />
      };
    } else if (zamowienie.response || zamowienie.response_data) {
      if (isMergedTransport(zamowienie)) {
        return { 
          text: 'Transport połączony', 
          class: 'bg-purple-100 text-purple-800',
          icon: <LinkIcon size={16} className="mr-1" />
        };
      } else {
        return { 
          text: 'Odpowiedziano', 
          class: 'bg-blue-100 text-blue-800',
          icon: <Truck size={16} className="mr-1" />
        };
      }
    } else {
      return { 
        text: 'Nowe', 
        class: 'bg-yellow-100 text-yellow-800',
        icon: <Package size={16} className="mr-1" />
      };
    }
  }

  // Funkcja do sprawdzenia czy data dostawy została zmieniona
  const isDeliveryDateChanged = (zamowienie) => {
    try {
      if (!zamowienie.response_data) return false;
      
      const responseData = JSON.parse(zamowienie.response_data);
      const originalDate = new Date(zamowienie.deliveryDate).toDateString();
      const responseDate = new Date(responseData.transportDate).toDateString();
      
      return originalDate !== responseDate;
    } catch (e) {
      return false;
    }
  }

  // Funkcja do pobrania aktualnej daty dostawy (z odpowiedzi lub oryginalna)
  const getActualDeliveryDate = (zamowienie) => {
    try {
      if (zamowienie.response_data) {
        const responseData = JSON.parse(zamowienie.response_data);
        if (responseData.transportDate) {
          return responseData.transportDate;
        }
      }
    } catch (e) {
      // Jeśli błąd parsowania, użyj oryginalnej daty
    }
    
    return zamowienie.deliveryDate;
  }

  // Funkcja do tworzenia trasy wyświetlanej w nagłówku
  const getDisplayRoute = (zamowienie) => {
    const loadingCity = getLoadingCity(zamowienie);
    const deliveryCity = getDeliveryCity(zamowienie);
    return `${loadingCity} → ${deliveryCity}`;
  }

  // Funkcja do pobierania wszystkich miast rozładunku (dla połączonych transportów)
  const getAllUnloadingCities = (zamowienie) => {
    try {
      if (!zamowienie.response_data) return [getDeliveryCity(zamowienie)];
      
      const responseData = JSON.parse(zamowienie.response_data);
      if (responseData.routeSequence && Array.isArray(responseData.routeSequence)) {
        const unloadingCities = responseData.routeSequence
          .filter(point => point.type === 'unloading')
          .map(point => point.city);
        return unloadingCities.length > 0 ? unloadingCities : [getDeliveryCity(zamowienie)];
      }
    } catch (e) {
      console.error('Błąd parsowania danych trasy:', e);
    }
    
    return [getDeliveryCity(zamowienie)];
  }

  // Funkcja do pobierania wszystkich numerów MPK
  const getAllMPKNumbers = (zamowienie) => {
    try {
      if (!zamowienie.response_data) return [zamowienie.mpk].filter(Boolean);
      
      const responseData = JSON.parse(zamowienie.response_data);
      if (responseData.routeSequence && Array.isArray(responseData.routeSequence)) {
        const mpkNumbers = responseData.routeSequence
          .map(point => point.mpk)
          .filter(Boolean);
        return mpkNumbers.length > 0 ? mpkNumbers : [zamowienie.mpk].filter(Boolean);
      }
    } catch (e) {
      console.error('Błąd parsowania numerów MPK:', e);
    }
    
    return [zamowienie.mpk].filter(Boolean);
  }

  // Funkcja do tworzenia sekwencji trasy dla połączonych transportów
  const createRouteSequence = (zamowienie) => {
    try {
      if (!zamowienie.response_data) return [];
      
      const responseData = JSON.parse(zamowienie.response_data);
      if (responseData.routeSequence && Array.isArray(responseData.routeSequence)) {
        return responseData.routeSequence;
      }
    } catch (e) {
      console.error('Błąd tworzenia sekwencji trasy:', e);
    }
    
    return [];
  }

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
        showOperationMessage(data.message || 'Transport został pomyślnie rozłączony', 'success');
        fetchSpedycje();
      } else {
        throw new Error(data.error || 'Błąd rozłączania transportu');
      }
    } catch (error) {
      console.error('Błąd rozłączania transportu:', error);
      showOperationMessage('Wystąpił błąd podczas rozłączania transportu: ' + error.message, 'error');
    }
  };

  // Funkcja do renderowania informacji o połączonych transportach
  const renderMergedTransportInfo = (zamowienie) => {
    const routeSequence = createRouteSequence(zamowienie);
    
    if (routeSequence.length === 0) {
      return <div className="text-gray-500">Brak danych o trasie połączonego transportu</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-purple-700 flex items-center gap-2">
            <LinkIcon size={18} />
            Trasa połączonego transportu
          </h4>
          {isAdmin && (
            <button
              onClick={() => handleUnmergeTransport(zamowienie.id)}
              className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
            >
              <Unlink size={14} />
              Rozłącz
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {routeSequence.map((point, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  point.type === 'loading' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {index + 1}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="font-medium">
                  {point.type === 'loading' ? '📦 Załadunek' : '🚛 Rozładunek'} - {point.company}
                </div>
                <div className="text-sm text-gray-600">
                  {point.address}
                </div>
                {point.mpk && (
                  <div className="text-xs text-blue-600">MPK: {point.mpk}</div>
                )}
              </div>
              
              {index < routeSequence.length - 1 && (
                <div className="flex-shrink-0 text-gray-400">
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Renderuje info o odpowiedzialnych budowach
  const renderResponsibleConstructions = (transport) => {
    if (!transport.responsibleConstructions || !transport.responsibleConstructions.length) return null;
    
    return (
      <div className="mt-2">
        <div className="font-medium text-sm text-gray-700">Budowy:</div>
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
  }
  
  // Renderuje info o towarze
  const renderGoodsInfo = (transport) => {
    if (!transport.goodsDescription) return null;
    
    return (
      <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center text-blue-700 font-medium mb-2">
          <ShoppingBag size={14} className="mr-1" />
          Opis towaru
        </div>
        {transport.goodsDescription.description && (
          <p className="text-sm text-gray-700 mb-1">{transport.goodsDescription.description}</p>
        )}
        {transport.goodsDescription.weight && (
          <p className="text-sm flex items-center text-gray-700">
            <Weight size={12} className="mr-1" />
            Waga: {transport.goodsDescription.weight}
          </p>
        )}
      </div>
    );
  }

  // Generuje link do Google Maps
  const generateGoogleMapsLink = (zamowienie) => {
    const origin = getLoadingCity(zamowienie);
    const destination = getDeliveryCity(zamowienie);
    
    if (!origin || !destination) return '#';
    
    const waypoints = [];
    const routeSequence = createRouteSequence(zamowienie);
    
    if (routeSequence.length > 2) {
      // Dla połączonych transportów - dodaj punkty pośrednie
      const intermediate = routeSequence.slice(1, -1); // Pomijamy pierwszy i ostatni punkt
      waypoints.push(...intermediate.map(point => point.address));
    }
    
    const waypointsParam = waypoints.length > 0 
      ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
    
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;
  }

  // Filtruj zamówienia na podstawie trybu archiwum
  const filteredSpedycje = zamowienia.filter(zamowienie => {
    if (showArchive) {
      return zamowienie.status === 'completed';
    } else {
      return zamowienie.status === 'new';
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {showArchive ? 'Archiwum zapytań spedycyjnych' : 'Nowe zapytania spedycyjne'}
        </h1>
        
        {/* Przycisk odpowiedzi zbiorczej - tylko dla nowych zapytań */}
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
                        <span className={isMerged ? 'text-purple-700' : 'text-gray-900'}>
                          {isMerged ? 'Transport połączony' : displayRoute}
                        </span>
                        {dateChanged && (
                          <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                            Data zmieniona
                          </span>
                        )}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(displayDate)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.class}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Building size={14} />
                            {isMerged ? allUnloadingCities.join(', ') : zamowienie.clientName}
                          </span>
                          {(isMerged ? allMPKNumbers : [zamowienie.mpk].filter(Boolean)).length > 0 && (
                            <span className="flex items-center gap-1">
                              <ShoppingBag size={14} />
                              MPK: {(isMerged ? allMPKNumbers : [zamowienie.mpk].filter(Boolean)).join(', ')}
                            </span>
                          )}
                        </div>
                        
                        {zamowienie.responsiblePerson && (
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            {zamowienie.responsiblePerson}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
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
                    
                    {/* Przyciski admina - tylko oznaczanie jako zrealizowane */}
                    {isAdmin && zamowienie.status === 'new' && (
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
                            {renderMergedTransportInfo(zamowienie)}
                            
                            {/* Informacje o odpowiedzi */}
                            {zamowienie.response_data && (
                              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-700 mb-3">Szczegóły odpowiedzi</h4>
                                {(() => {
                                  try {
                                    const responseData = JSON.parse(zamowienie.response_data);
                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <strong>Kierowca:</strong> {responseData.driverInfo?.name || 'Nie podano'}
                                        </div>
                                        <div>
                                          <strong>Telefon:</strong> {responseData.driverInfo?.phone || 'Nie podano'}
                                        </div>
                                        <div>
                                          <strong>Pojazd:</strong> {responseData.driverInfo?.vehicleNumber || 'Nie podano'}
                                        </div>
                                        <div>
                                          <strong>Cena całkowita:</strong> {responseData.totalPrice || 'Nie podano'} PLN
                                        </div>
                                        <div>
                                          <strong>Data transportu:</strong> {formatDate(responseData.transportDate)}
                                        </div>
                                        {responseData.totalDistance && (
                                          <div>
                                            <strong>Odległość:</strong> {responseData.totalDistance} km
                                          </div>
                                        )}
                                        {responseData.totalWeight && (
                                          <div>
                                            <strong>Waga:</strong> {responseData.totalWeight} kg
                                          </div>
                                        )}
                                        {responseData.notes && (
                                          <div className="md:col-span-2">
                                            <strong>Uwagi:</strong> {responseData.notes}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } catch (e) {
                                    return <div className="text-red-600">Błąd wyświetlania danych odpowiedzi</div>;
                                  }
                                })()}
                              </div>
                            )}

                            {/* CMR i zlecenie transportowe */}
                            <div className="mt-6 flex gap-3">
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
                        );
                      } else {
                        // DLA NORMALNYCH TRANSPORTÓW - pokaż standardowe szczegóły
                        return (
                          <div className="space-y-6">
                            {/* Podstawowe informacje */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                  <MapPin size={18} className="text-green-600" />
                                  Załadunek
                                </h4>
                                <div className="text-sm space-y-2">
                                  <div><strong>Lokalizacja:</strong> {zamowienie.location}</div>
                                  {zamowienie.location === 'Odbiory własne' && zamowienie.producerAddress && (
                                    <div><strong>Adres:</strong> {formatAddress(zamowienie.producerAddress)}</div>
                                  )}
                                  {zamowienie.loadingContact && (
                                    <div><strong>Kontakt:</strong> {zamowienie.loadingContact}</div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                  <MapPin size={18} className="text-red-600" />
                                  Rozładunek
                                </h4>
                                <div className="text-sm space-y-2">
                                  <div><strong>Klient:</strong> {zamowienie.clientName}</div>
                                  <div><strong>Adres:</strong> {formatAddress(zamowienie.delivery)}</div>
                                  {zamowienie.unloadingContact && (
                                    <div><strong>Kontakt:</strong> {zamowienie.unloadingContact}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Dodatkowe informacje */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-blue-600" />
                                <div>
                                  <div className="text-xs text-gray-600">Data dostawy</div>
                                  <div className="font-medium">{formatDate(zamowienie.deliveryDate)}</div>
                                </div>
                              </div>
                              
                              {zamowienie.mpk && (
                                <div className="flex items-center gap-2">
                                  <ShoppingBag size={16} className="text-purple-600" />
                                  <div>
                                    <div className="text-xs text-gray-600">MPK</div>
                                    <div className="font-medium">{zamowienie.mpk}</div>
                                  </div>
                                </div>
                              )}
                              
                              {zamowienie.responsiblePerson && (
                                <div className="flex items-center gap-2">
                                  <User size={16} className="text-green-600" />
                                  <div>
                                    <div className="text-xs text-gray-600">Odpowiedzialny</div>
                                    <div className="font-medium">{zamowienie.responsiblePerson}</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Budowy */}
                            {renderResponsibleConstructions(zamowienie)}

                            {/* Dokumenty i uwagi */}
                            {(zamowienie.documents || zamowienie.notes) && (
                              <div className="space-y-3">
                                {zamowienie.documents && (
                                  <div>
                                    <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                      <FileText size={16} />
                                      Dokumenty
                                    </h5>
                                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                                      {zamowienie.documents}
                                    </p>
                                  </div>
                                )}
                                
                                {zamowienie.notes && (
                                  <div>
                                    <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                      <AlertCircle size={16} />
                                      Uwagi
                                    </h5>
                                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                                      {zamowienie.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Opis towarów */}
                            {renderGoodsInfo(zamowienie)}

                            {/* Informacje o odpowiedzi */}
                            {(zamowienie.response || zamowienie.response_data) && (
                              <div className="p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-700 mb-3">Szczegóły odpowiedzi</h4>
                                {(() => {
                                  try {
                                    // Sprawdź czy są dane w response_data (nowy format)
                                    if (zamowienie.response_data) {
                                      const responseData = JSON.parse(zamowienie.response_data);
                                      return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <strong>Kierowca:</strong> {responseData.driverInfo?.name || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Telefon:</strong> {responseData.driverInfo?.phone || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Pojazd:</strong> {responseData.driverInfo?.vehicleNumber || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Cena:</strong> {responseData.totalPrice || 'Nie podano'} PLN
                                          </div>
                                          <div>
                                            <strong>Data transportu:</strong> {formatDate(responseData.transportDate)}
                                          </div>
                                          {responseData.totalDistance && (
                                            <div>
                                              <strong>Odległość:</strong> {responseData.totalDistance} km
                                            </div>
                                          )}
                                          {responseData.totalWeight && (
                                            <div>
                                              <strong>Waga:</strong> {responseData.totalWeight} kg
                                            </div>
                                          )}
                                          {responseData.notes && (
                                            <div className="md:col-span-2">
                                              <strong>Uwagi:</strong> {responseData.notes}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    // Fallback dla starych danych w response
                                    else if (zamowienie.response) {
                                      const response = typeof zamowienie.response === 'string' 
                                        ? JSON.parse(zamowienie.response) 
                                        : zamowienie.response;
                                      return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <strong>Kierowca:</strong> {response.driver || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Telefon:</strong> {response.phone || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Pojazd:</strong> {response.vehicle || 'Nie podano'}
                                          </div>
                                          <div>
                                            <strong>Cena:</strong> {response.price || 'Nie podano'} PLN
                                          </div>
                                          <div>
                                            <strong>Data transportu:</strong> {formatDate(response.date)}
                                          </div>
                                          {response.distanceKm && (
                                            <div>
                                              <strong>Odległość:</strong> {response.distanceKm} km
                                            </div>
                                          )}
                                          {response.notes && (
                                            <div className="md:col-span-2">
                                              <strong>Uwagi:</strong> {response.notes}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  } catch (e) {
                                    return <div className="text-red-600">Błąd wyświetlania danych odpowiedzi</div>;
                                  }
                                })()}
                              </div>
                            )}

                            {/* Przyciski akcji */}
                            <div className="flex gap-3 pt-4 border-t">
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
                              <a
                                href={generateGoogleMapsLink(zamowienie)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                              >
                                <MapPin size={16} />
                                Google Maps
                              </a>
                            </div>
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

      {/* MODAL odpowiedzi zbiorczej */}
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
