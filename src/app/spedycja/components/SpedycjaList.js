// src/app/spedycja/components/SpedycjaList.js
import React, { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { generateCMR } from '@/lib/utils/generateCMR'
import { Truck, Package, MapPin, Phone, FileText, Calendar, DollarSign, User, Clipboard, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Edit, Pencil, Building, ShoppingBag, Weight, Bot, Link as LinkIcon, Unlink, Copy, ExternalLink } from 'lucide-react'
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
    success: "px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2",
    danger: "px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
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
  
  // Funkcja pomocnicza do określania adresu załadunku
  const getLoadingAddress = (transport) => {
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      return formatAddress(transport.producerAddress);
    } else if (transport.location === 'Magazyn Białystok') {
      return 'ul. Wysockiego 69B, 15-169 Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      return 'ul. Krótka 2, 05-220 Zielonka';
    }
    return transport.location || 'Nie podano';
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

  // Funkcja pomocnicza do określania adresu rozładunku
  const getUnloadingAddress = (transport) => {
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return formatAddress(deliveryData) || 'Nie podano'
      } catch (e) {
        return 'Nie podano'
      }
    }
    return formatAddress(transport.delivery) || 'Nie podano'
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
    if (showArchive || zamowienie.status === 'completed') return false;
    
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
    } else if (zamowienie.status === 'responded' || zamowienie.response_data) {
      if (isMergedTransport(zamowienie)) {
        return { 
          text: 'Transport połączony', 
          class: 'bg-purple-100 text-purple-800',
          icon: <LinkIcon size={16} className="mr-1" />
        };
      } else {
        return { 
          text: 'Odpowiedziano', 
          class: 'bg-yellow-100 text-yellow-800',
          icon: <FileText size={16} className="mr-1" />
        };
      }
    } else {
      return { 
        text: 'Nowe', 
        class: 'bg-blue-100 text-blue-800',
        icon: <Package size={16} className="mr-1" />
      };
    }
  }

  // Funkcja do sprawdzenia czy data dostawy została zmieniona
  const isDeliveryDateChanged = (zamowienie) => {
    try {
      if (!zamowienie.response_data) return false;
      
      const responseData = JSON.parse(zamowienie.response_data);
      if (!responseData.newDeliveryDate) return false;
      
      const originalDate = new Date(zamowienie.delivery_date).toDateString();
      const newDate = new Date(responseData.newDeliveryDate).toDateString();
      
      return originalDate !== newDate;
    } catch (e) {
      return false;
    }
  }

  // Funkcja do pobrania aktualnej daty dostawy (z odpowiedzi lub oryginalna)
  const getActualDeliveryDate = (zamowienie) => {
    try {
      if (zamowienie.response_data) {
        const responseData = JSON.parse(zamowienie.response_data);
        if (responseData.newDeliveryDate) {
          return responseData.newDeliveryDate;
        }
      }
    } catch (e) {
      // Jeśli błąd parsowania, użyj oryginalnej daty
    }
    
    return zamowienie.delivery_date;
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
  const generateGoogleMapsLink = (origin, destination, waypoints = []) => {
    const waypointsParam = waypoints.length > 0 
      ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
    
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;
  }

  // Filtruj zamówienia na podstawie trybu archiwum - POPRAWIONE
  const filteredSpedycje = zamowienia.filter(zamowienie => {
    if (showArchive) {
      return zamowienie.status === 'completed';
    } else {
      return zamowienie.status === 'new' || zamowienie.status === 'responded';
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

      {/* Modal odpowiedzi zbiorczej */}
      {showMultiResponseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <MultiTransportResponseForm
              transports={filteredSpedycje}
              onSubmit={handleMultiTransportResponse}
              onClose={() => setShowMultiResponseForm(false)}
            />
          </div>
        </div>
      )}

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
                  className="cursor-pointer"
                >
                  {/* Nagłówek transportu */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Truck size={20} className="text-blue-600 flex-shrink-0" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {displayRoute}
                          </h3>
                        </div>
                        
                        {isMerged && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            <LinkIcon size={12} className="mr-1" />
                            Transport połączony
                          </span>
                        )}
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Data dostawy: {formatDate(displayDate)}</span>
                          {dateChanged && (
                            <span className="ml-1 text-orange-500 font-medium">(zmieniona)</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          <span>Numer: {zamowienie.order_number || 'Brak numeru'}</span>
                        </div>
                        
                        {allMPKNumbers.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Clipboard size={14} />
                            <span>MPK: {allMPKNumbers.join(', ')}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{zamowienie.createdByName || 'Nie podano'}</span>
                        </div>
                      </div>
                      
                      {/* Dodatkowe info dla połączonych transportów */}
                      {isMerged && allUnloadingCities.length > 1 && (
                        <div className="mt-2 text-sm text-purple-600">
                          <span className="font-medium">Miasta rozładunku:</span> {allUnloadingCities.join(' → ')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {/* Przyciski akcji */}
                      <div className="flex items-center gap-1">
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
                        
                        {/* Przyciski admina - tylko oznaczanie jako zrealizowane - POPRAWIONE */}
                        {isAdmin && (zamowienie.status === 'new' || zamowienie.status === 'responded') && (
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
                            <Package size={16} />
                            Zrealizowane
                          </button>
                        )}

                        {/* Przycisk tworzenia zlecenia - tylko dla adminów z odpowiedzią */}
                        {isAdmin && canSendOrder && zamowienie.response_data && (
                          <button 
                            type="button"
                            className={buttonClasses.primary}
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateOrder(zamowienie)
                            }}
                          >
                            <FileText size={16} />
                            Stwórz zlecenie
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rozwinięte szczegóły */}
                {expandedId === zamowienie.id && (
                  <div className="mt-4 space-y-6 border-t pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Dane zamówienia */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                          <FileText size={18} className="text-blue-600" />
                          Dane zamówienia
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Numer zamówienia:</span> {zamowienie.order_number || 'Brak numeru'}</div>
                          <div><span className="font-medium">MPK:</span> {zamowienie.mpk || 'Brak MPK'}</div>
                          <div><span className="font-medium">Osoba dodająca:</span> {zamowienie.createdByName || 'Nie podano'}</div>
                          <div><span className="font-medium">Osoba odpowiedzialna:</span> {zamowienie.responsiblePerson || 'Nie podano'}</div>
                          <div><span className="font-medium">Dokumenty:</span> {zamowienie.documents || 'Brak dokumentów'}</div>
                          <div><span className="font-medium">Nazwa klienta/odbiorcy:</span> {zamowienie.clientName || 'Nie podano'}</div>
                        </div>
                        
                        {/* Towar */}
                        {zamowienie.cargo && (
                          <div className="mt-4 p-3 bg-white rounded border">
                            <h4 className="flex items-center gap-1 font-medium text-gray-700 mb-2">
                              <ShoppingBag size={16} />
                              Towar
                            </h4>
                            <div className="text-sm">
                              <div>{zamowienie.cargo}</div>
                              {zamowienie.weight && (
                                <div className="flex items-center gap-1 mt-1 text-gray-600">
                                  <Weight size={14} />
                                  Waga: {zamowienie.weight}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Renderuj budowy */}
                        {renderResponsibleConstructions(zamowienie)}
                        
                        {/* Renderuj info o towarze */}
                        {renderGoodsInfo(zamowienie)}
                      </div>

                      {/* Szczegóły załadunku i dostawy */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                          <MapPin size={18} className="text-green-600" />
                          Szczegóły załadunku
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Miejsce:</span> {getLoadingCompanyName(zamowienie)}</div>
                          <div><span className="font-medium">Adres:</span> {getLoadingAddress(zamowienie)}</div>
                          {zamowienie.producerAddress?.contact && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              <span className="font-medium">Kontakt:</span> {zamowienie.producerAddress.contact}
                            </div>
                          )}
                        </div>

                        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3 mt-4">
                          <MapPin size={18} className="text-red-600" />
                          Szczegóły dostawy
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Firma:</span> {getUnloadingCompanyName(zamowienie)}</div>
                          <div><span className="font-medium">Adres:</span> {getUnloadingAddress(zamowienie)}</div>
                          {zamowienie.delivery?.contact && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              <span className="font-medium">Kontakt:</span> {zamowienie.delivery.contact}
                            </div>
                          )}
                        </div>

                        {/* Link do Google Maps */}
                        <div className="mt-4">
                          <a
                            href={generateGoogleMapsLink(
                              getLoadingAddress(zamowienie),
                              getUnloadingAddress(zamowienie)
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink size={14} />
                            Zobacz trasę na Google Maps
                          </a>
                        </div>
                      </div>

                      {/* Informacje o transporcie */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                          <Truck size={18} className="text-purple-600" />
                          Informacje o transporcie
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Data dostawy:</span> {formatDate(displayDate)}</div>
                          <div><span className="font-medium">Data dodania:</span> {formatDate(zamowienie.created_at)}</div>
                          {zamowienie.transport_price && (
                            <>
                              <div><span className="font-medium">Odległość:</span> {zamowienie.total_distance || 'Nie podano'} km</div>
                              <div><span className="font-medium">Cena transportu:</span> {zamowienie.transport_price} PLN</div>
                              <div><span className="font-medium">Cena za km:</span> {zamowienie.transport_price && zamowienie.total_distance 
                                ? (zamowienie.transport_price / zamowienie.total_distance).toFixed(2) 
                                : 'Nie podano'} PLN/km</div>
                            </>
                          )}
                          {zamowienie.notes && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                              <strong>Uwagi:</strong> {zamowienie.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Szczegóły realizacji - tylko jeśli transport ma odpowiedź */}
                    {zamowienie.response_data && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                          <User size={18} className="text-gray-600" />
                          Szczegóły realizacji
                        </h3>
                        
                        {(() => {
                          try {
                            const responseData = JSON.parse(zamowienie.response_data);
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Dane przewoźnika */}
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Dane przewoźnika</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Kierowca:</span> {responseData.driverName || 'Nie podano'}</div>
                                    <div className="flex items-center gap-1">
                                      <Phone size={14} />
                                      {responseData.driverPhone || 'Brak telefonu'}
                                    </div>
                                    <div><span className="font-medium">Numery auta:</span> {responseData.vehicleNumber || 'Nie podano'}</div>
                                  </div>
                                </div>
                                
                                {/* Dane finansowe */}
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Dane finansowe</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Cena całkowita:</span> {responseData.deliveryPrice || 0} PLN</div>
                                    <div><span className="font-medium">Odległość całkowita:</span> {responseData.distance || zamowienie.total_distance || 'Nie podano'} km</div>
                                    <div><span className="font-medium">Koszt za km:</span> {responseData.deliveryPrice && responseData.distance 
                                      ? (responseData.deliveryPrice / responseData.distance).toFixed(2) 
                                      : 'Nie podano'} PLN/km</div>
                                  </div>
                                </div>
                                
                                {/* Informacje o realizacji */}
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Informacje o realizacji</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Data odpowiedzi:</span> {responseData.respondedAt ? formatDate(responseData.respondedAt) : formatDate(zamowienie.responded_at)}</div>
                                    {responseData.notes && (
                                      <div><span className="font-medium">Uwagi:</span> {responseData.notes}</div>
                                    )}
                                    {responseData.completedAt && (
                                      <div><span className="font-medium">Data ukończenia:</span> {formatDate(responseData.completedAt)}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (e) {
                            return <div className="text-red-600 text-sm">Błąd odczytu danych odpowiedzi</div>;
                          }
                        })()}

                        {/* Informacje o połączonych transportach */}
                        {isMerged && (
                          <div className="mt-4">
                            {renderMergedTransportInfo(zamowienie)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
