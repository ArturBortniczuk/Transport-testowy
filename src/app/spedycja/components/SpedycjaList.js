// src/app/spedycja/components/SpedycjaList.js
import React, { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import MergedTransportSummary from './MergedTransportSummary'
import TransportConnectionBadge from './TransportConnectionBadge'
import { generateCMR } from '@/lib/utils/generateCMR'
import { Truck, Package, MapPin, Phone, FileText, Calendar, DollarSign, User, Clipboard, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Edit, Pencil, Building, ShoppingBag, Weight, Bot, Link as LinkIcon, Unlink, Copy, ExternalLink, CheckCircle, Clock, Container } from 'lucide-react'
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
        isMerged: responseData.selectedTransports.length > 1,
        // NOWE POLA
        vehicleType: responseData.vehicleType,
        transportType: responseData.transportType
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
    return `${address.city || ''}, ${address.postalCode || ''}, ${address.street || ''}`.replace(/^,\s*|,\s*$/g, '')
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
      // Sprawdź czy są dane w location_data
      if (transport.location_data || transport.producerAddress) {
        const locationData = transport.location_data || transport.producerAddress;
        return locationData.company || transport.clientName || 'Nie podano';
      }
      return transport.sourceClientName || transport.clientName || 'Nie podano';
    } else if (transport.location === 'Magazyn Białystok') {
      return 'Grupa Eltron Sp. z o.o.';
    } else if (transport.location === 'Magazyn Zielonka') {
      return 'Grupa Eltron Sp. z o.o.';
    }
    return 'Nie podano';
  }
  
  // Funkcja pomocnicza do określania nazwy firmy rozładunku
  const getUnloadingCompanyName = (transport) => {
    // Sprawdź delivery_data (JSON) - priorytet 1
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        if (deliveryData.company && deliveryData.company.trim()) {
          return deliveryData.company.trim();
        }
      } catch (e) {
        console.error('Błąd parsowania delivery_data:', e)
      }
    }
    
    // Sprawdź standardowe pole delivery.company - priorytet 2
    if (transport.delivery && transport.delivery.company && transport.delivery.company.trim()) {
      return transport.delivery.company.trim();
    }
    
    // Sprawdź clientName - priorytet 3
    if (transport.clientName && transport.clientName.trim()) {
      return transport.clientName.trim();
    }
    
    // Ostatnia opcja - sprawdź czy w delivery_data jest nazwa miasta jako firma
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        if (deliveryData.city && deliveryData.city.trim()) {
          return `Klient w ${deliveryData.city.trim()}`;
        }
      } catch (e) {
        // Ignore error
      }
    }
    
    // Fallback do miasta z delivery
    if (transport.delivery && transport.delivery.city) {
      return `Klient w ${transport.delivery.city}`;
    }
    
    return 'Nie podano'
  }
  
  // Funkcja pomocnicza do określania adresu załadunku
  const getLoadingAddress = (transport) => {
    if (transport.location === 'Odbiory własne' && (transport.producerAddress || transport.location_data)) {
      const locationData = transport.producerAddress || transport.location_data;
      return formatAddress(locationData);
    } else if (transport.location === 'Magazyn Białystok') {
      return 'ul. Wysockiego 69B, 15-169 Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      return 'ul. Krótka 2, 05-220 Zielonka';
    }
    return transport.location || 'Nie podano';
  }

  // Funkcja pomocnicza do określania adresu rozładunku
  const getUnloadingAddress = (transport) => {
    // Sprawdź delivery_data (JSON)
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return formatAddress(deliveryData) || 'Nie podano'
      } catch (e) {
        console.error('Błąd parsowania delivery_data:', e)
      }
    }
    
    // Sprawdź standardowe pole delivery
    if (transport.delivery) {
      return formatAddress(transport.delivery) || 'Nie podano'
    }
    
    return 'Nie podano'
  }

  // Funkcja do sprawdzania czy transport jest już połączony
  const isMergedTransport = (zamowienie) => {
    try {
      const responseData = zamowienie.response_data ? 
        (typeof zamowienie.response_data === 'string' ? JSON.parse(zamowienie.response_data) : zamowienie.response_data) 
        : null;
      return responseData?.isMerged || false;
    } catch (e) {
      return false;
    }
  }

  // Funkcja do pobierania informacji o osobie odpowiedzialnej
  const getResponsiblePersonInfo = (transport) => {
    // Jeśli jest osoba odpowiedzialna
    if (transport.responsiblePerson) {
      return {
        name: transport.responsiblePerson,
        mpk: transport.mpk || transport.responsible_mpk || '', // Sprawdź różne pola MPK
        email: transport.responsibleEmail || ''
      };
    }
    
    // Fallback do osoby tworzącej
    return {
      name: transport.createdBy || 'Nie podano',
      mpk: transport.mpk || transport.created_by_mpk || '', // Sprawdź MPK osoby tworzącej
      email: transport.createdByEmail || ''
    };
  }

  // Funkcja do pobierania odległości transportu - zwraca obiekt z podstawową i łączną odległością
  const getTransportDistance = (transport) => {
    let baseDistance = null; // Podstawowa odległość punktu do punktu
    let routeDistance = null; // Rzeczywista odległość całej trasy (dla połączonych)

    // 1. Pobierz podstawową odległość z pól bazy danych
    if (transport.distanceKm && transport.distanceKm > 0) {
      baseDistance = transport.distanceKm;
    } else if (transport.distance_km && transport.distance_km > 0) {
      baseDistance = transport.distance_km;
    }

    // 2. Sprawdź response_data dla wszystkich transportów (nie tylko połączonych)
    try {
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        // Dla transportów połączonych szukaj odległości trasy
        if (transport.is_merged || transport.isMerged || responseData.isMerged) {
          if (responseData.realRouteDistance) {
            routeDistance = responseData.realRouteDistance;
          } else if (responseData.totalDistance) {
            routeDistance = responseData.totalDistance;
          }
        }
        
        // Dla wszystkich transportów - sprawdź czy nie ma lepszej odległości podstawowej
        if (!baseDistance && responseData.distance && responseData.distance > 0) {
          baseDistance = responseData.distance;
        }
        if (!baseDistance && responseData.distanceKm && responseData.distanceKm > 0) {
          baseDistance = responseData.distanceKm;
        }
      }
    } catch (e) {
      console.error('Błąd parsowania response_data dla odległości:', e);
    }

    return {
      base: baseDistance,
      route: routeDistance,
      isMerged: transport.is_merged || transport.isMerged || false
    };
  }

  // Funkcja do wyświetlania odległości w głównej kolumnie tabeli
  const renderDistanceColumn = (distanceData) => {
    if (!distanceData.base && !distanceData.route) {
      return null;
    }

    if (distanceData.isMerged && distanceData.route && distanceData.base) {
      // Transport połączony - pokaż format: "📍 335 km | 630 km trasa"
      return (
        <div className="text-xs text-gray-500 mt-1">
          📍 {distanceData.base} km | <span className="font-semibold text-green-600">{distanceData.route} km trasa</span>
        </div>
      );
    } else if (distanceData.route) {
      return (
        <div className="text-xs text-gray-500 mt-1">
          📏 <span className="font-semibold text-green-600">{distanceData.route} km</span>
        </div>
      );
    } else if (distanceData.base) {
      return (
        <div className="text-xs text-gray-500 mt-1">
          📏 {distanceData.base} km
        </div>
      );
    }

    return null;
  }

  // Funkcja do wyświetlania odległości w rozwinięciu (szczegółowym widoku)
  const renderDistanceDetails = (distanceData) => {
    if (!distanceData.base && !distanceData.route) {
      return null;
    }

    if (distanceData.isMerged && distanceData.route && distanceData.base) {
      // Transport połączony - pokaż obie odległości
      return (
        <div className="flex items-start gap-1">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-gray-500">Odległość:</span>
            <div className="ml-1">
              <div className="text-gray-900 font-medium">{distanceData.base} km (bezpośrednia)</div>
              <div className="text-green-600 font-bold">{distanceData.route} km (rzeczywista trasa)</div>
            </div>
          </div>
        </div>
      );
    } else if (distanceData.route) {
      return (
        <div className="flex items-start gap-1">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-gray-500">Odległość:</span>
            <span className="ml-1 text-green-600 font-bold">
              {distanceData.route} km (rzeczywista trasa)
            </span>
          </div>
        </div>
      );
    } else if (distanceData.base) {
      return (
        <div className="flex items-start gap-1">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-gray-500">Odległość:</span>
            <span className="ml-1 text-gray-900 font-medium">
              {distanceData.base} km
            </span>
          </div>
        </div>
      );
    }

    return null;
  }


  // Funkcja do pobierania statusu transportu
  const getStatusInfo = (transport) => {
    switch (transport.status) {
      case 'new':
        return {
          text: 'Nowe',
          class: 'bg-blue-100 text-blue-800 border border-blue-200',
          icon: <AlertCircle size={12} />
        };
      case 'responded':
        return {
          text: 'Odpowiedziane',
          class: 'bg-green-100 text-green-800 border border-green-200',
          icon: <CheckCircle size={12} />
        };
      case 'completed':
        return {
          text: 'Zrealizowane',
          class: 'bg-gray-100 text-gray-800 border border-gray-200',
          icon: <CheckCircle size={12} />
        };
      default:
        return {
          text: transport.status || 'Nieznany',
          class: 'bg-gray-100 text-gray-800 border border-gray-200',
          icon: <AlertCircle size={12} />
        };
    }
  }

  // Funkcja do sprawdzania czy można edytować
  const canEdit = (transport) => {
    if (!transport) return false;
    
    // Admin może edytować wszystko
    if (isAdmin) return true;
    
    // Twórca może edytować swoje transporty
    if (transport.createdByEmail === currentUserEmail) return true;
    
    // Osoba odpowiedzialna może edytować przypisane transporty
    if (transport.responsibleEmail === currentUserEmail) return true;
    
    return false;
  }

  // Funkcja do tworzenia route display
  const getDisplayRoute = (transport) => {
    const loadingCity = getLoadingCity(transport);
    const deliveryCity = getDeliveryCity(transport);
    return `${loadingCity} → ${deliveryCity}`;
  }

  // Funkcja do pobierania odpowiedniej ikony na podstawie typu transportu
  const getTransportIcon = (transport) => {
    try {
      // Sprawdź response_data dla typu transportu
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        if (responseData.transportType === 'opakowaniowy') {
          return { icon: Container, color: 'text-orange-600', bgColor: 'bg-orange-100' };
        }
      }
      
      // Sprawdź standardowe pole response
      if (transport.response?.transportType === 'opakowaniowy') {
        return { icon: Container, color: 'text-orange-600', bgColor: 'bg-orange-100' };
      }
      
      // Domyślna ikona ciężarówki
      return { icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } catch (e) {
      return { icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
  }

  // Funkcja do generowania URL Google Maps z pełną trasą
  const generateGoogleMapsUrl = (transport) => {
    try {
      // Sprawdź czy to transport połączony z sekwencją trasy
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        if (responseData?.isMerged && responseData?.routeSequence && responseData.routeSequence.length > 0) {
          // Użyj sekwencji trasy dla połączonych transportów
          const sequence = responseData.routeSequence;
          
          if (sequence.length === 1) {
            // Jeden punkt - użyj podstawowej trasy
            const point = sequence[0];
            return `https://www.google.com/maps/search/${encodeURIComponent(point.city)}`;
          } else if (sequence.length === 2) {
            // Dwa punkty - bezpośrednia trasa
            const start = sequence[0];
            const end = sequence[sequence.length - 1];
            return `https://www.google.com/maps/dir/${encodeURIComponent(start.city)}/${encodeURIComponent(end.city)}`;
          } else {
            // Wiele punktów - użyj waypoints
            const start = sequence[0];
            const end = sequence[sequence.length - 1];
            const waypoints = sequence.slice(1, -1); // Wszystkie punkty między pierwszym a ostatnim
            
            let url = `https://www.google.com/maps/dir/${encodeURIComponent(start.city)}`;
            
            // Dodaj waypoints
            waypoints.forEach(point => {
              url += `/${encodeURIComponent(point.city)}`;
            });
            
            // Dodaj punkt końcowy
            url += `/${encodeURIComponent(end.city)}`;
            
            return url;
          }
        }
      }
      
      // Fallback dla pojedynczych transportów lub bez sekwencji
      const startCity = getLoadingCity(transport);
      const endCity = getDeliveryCity(transport);
      return `https://www.google.com/maps/dir/${encodeURIComponent(startCity)}/${encodeURIComponent(endCity)}`;
    } catch (e) {
      console.error('Błąd generowania URL Google Maps:', e);
      // Fallback
      const startCity = getLoadingCity(transport);
      const endCity = getDeliveryCity(transport);
      return `https://www.google.com/maps/dir/${encodeURIComponent(startCity)}/${encodeURIComponent(endCity)}`;
    }
  }

  // Filtruj zamówienia na podstawie trybu archiwum
  const filteredSpedycje = zamowienia.filter(zamowienie => {
    if (showArchive) {
      return zamowienie.status === 'completed';
    } else {
      return zamowienie.status === 'new' || zamowienie.status === 'responded';
    }
  });

  return (
    <div className="w-full max-w-none mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {showArchive ? 'Archiwum zapytań spedycyjnych' : 'Nowe zapytania spedycyjne'}
        </h1>
        
        {/* Przycisk odpowiedzi zbiorczej - tylko dla osób z uprawnieniami i nowych zapytań */}
        {!showArchive && filteredSpedycje.filter(s => s.status === 'new').length > 0 && isAdmin && (
          <button
            onClick={() => setShowMultiResponseForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Truck size={20} />
            Odpowiedz
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
              {filteredSpedycje.filter(s => s.status === 'new').length}
            </span>
          </button>
        )}
      </div>

      {/* Modal odpowiedzi zbiorczej */}
      {showMultiResponseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <MultiTransportResponseForm
              availableTransports={filteredSpedycje.filter(transport => transport.status === 'new')}
              onSubmit={handleMultiTransportResponse}
              onClose={() => setShowMultiResponseForm(false)}
            />
          </div>
        </div>
      )}

      {/* Lista transportów w formie tabeli z ulepszoną stylistyką */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {filteredSpedycje.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Package size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {showArchive ? 'Brak zamówień w archiwum' : 'Brak nowych zamówień'}
            </h3>
            <p className="text-gray-600 mb-6">
              {showArchive 
                ? 'Nie ma jeszcze zrealizowanych zamówień spedycyjnych.' 
                : 'Gdy pojawią się nowe zapytania spedycyjne, zobaczysz je tutaj.'
              }
            </p>
            {!showArchive && (
              <button
                onClick={onCreateOrder}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Package size={20} className="mr-2" />
                Dodaj nowe zamówienie
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-blue-600" />
                      Trasa
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-green-600" />
                      Firmy
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-purple-600" />
                      Daty
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-orange-600" />
                      Numer/MPK
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-yellow-600" />
                      Status
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-indigo-600" />
                      Akcje
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpedycje.map((zamowienie) => {
                  const statusInfo = getStatusInfo(zamowienie);
                  const responsibleInfo = getResponsiblePersonInfo(zamowienie);
                  const isMerged = isMergedTransport(zamowienie);
                  const distanceData = getTransportDistance(zamowienie);
                  
                  return (
                    <React.Fragment key={zamowienie.id}>
                      {/* Główny wiersz */}
                      <tr className="hover:bg-blue-50 transition-colors border-l-4 border-l-transparent hover:border-l-blue-400">
                        {/* Trasa */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const iconInfo = getTransportIcon(zamowienie);
                              const IconComponent = iconInfo.icon;
                              return (
                                <div className={`${iconInfo.bgColor} rounded-lg p-2`}>
                                  <IconComponent size={16} className={iconInfo.color} />
                                </div>
                              );
                            })()}
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {getLoadingCity(zamowienie)} → {getDeliveryCity(zamowienie)}
                              </div>
                              {/* Badge dla transportów połączonych */}
                              <TransportConnectionBadge transport={zamowienie} />
                              {renderDistanceColumn(distanceData)}
                            </div>
                          </div>
                        </td>
                        
                        {/* Firmy */}
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building size={12} className="text-green-600 flex-shrink-0" />
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {getLoadingCompanyName(zamowienie)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                              <div className="text-gray-600 text-sm truncate">
                                {getUnloadingCompanyName(zamowienie)}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Daty */}
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-blue-600 flex-shrink-0" />
                              <span className="text-sm text-gray-900">
                                {formatDate(zamowienie.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-purple-600 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {formatDate(zamowienie.deliveryDate)}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Numer/MPK */}
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText size={12} className="text-orange-600 flex-shrink-0" />
                              <span className="text-sm font-mono text-gray-900">
                                {zamowienie.orderNumber || 'Brak numeru'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clipboard size={12} className="text-indigo-600 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {responsibleInfo.mpk || 'Brak MPK'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.class} shadow-sm`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </td>
                        
                        {/* Akcje */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1">
                            {/* Przycisk rozwijania */}
                            <button
                              onClick={() => setExpandedId(expandedId === zamowienie.id ? null : zamowienie.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                expandedId === zamowienie.id 
                                  ? 'bg-blue-100 text-blue-600' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Rozwiń szczegóły"
                            >
                              {expandedId === zamowienie.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            
                            {/* Przycisk edycji */}
                            {canEdit(zamowienie) && zamowienie.status !== 'completed' && (
                              <button
                                onClick={() => onEdit(zamowienie)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edytuj"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            
                            {/* Przycisk oznaczania jako zrealizowane */}
                            {isAdmin && zamowienie.status === 'responded' && (
                              <button
                                onClick={() => onMarkAsCompleted(zamowienie.id)}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                                title="Oznacz jako zrealizowane"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Rozwinięte szczegóły */}
                      {expandedId === zamowienie.id && (
                        <tr>
                          <td colSpan="6" className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-400">
                            {/* Panel podsumowania transportów połączonych */}
                            {isMergedTransport(zamowienie) && zamowienie.merged_transports && (
                              <MergedTransportSummary 
                                transport={zamowienie} 
                                mergedData={typeof zamowienie.merged_transports === 'string' 
                                  ? JSON.parse(zamowienie.merged_transports) 
                                  : zamowienie.merged_transports
                                } 
                              />
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                              
                              {/* Sekcja 1: Informacje podstawowe */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                                <h4 className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2 mb-3 flex items-center gap-2">
                                  <User size={16} className="text-blue-600" />
                                  Informacje podstawowe
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-1">
                                    <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="text-gray-500">Zgłosił:</span>
                                      <span className="ml-1 text-gray-900 font-medium">
                                        {zamowienie.createdBy || 'Nie podano'}
                                      </span>
                                      {zamowienie.createdByEmail && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {zamowienie.createdByEmail}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-1">
                                    <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div>
                                        <span className="text-gray-500">Odpowiedzialny:</span>
                                        <span className="ml-1 text-gray-900 font-medium">
                                          {responsibleInfo.name}
                                        </span>
                                      </div>
                                      {responsibleInfo.mpk && (
                                        <div className="mt-1">
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                            MPK: {responsibleInfo.mpk}
                                          </span>
                                        </div>
                                      )}
                                      {responsibleInfo.email && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {responsibleInfo.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-1">
                                    <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="text-gray-500">Data utworzenia:</span>
                                      <span className="ml-1 text-gray-900">
                                        {formatDate(zamowienie.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {renderDistanceDetails(distanceData)}
                                  
                                  {zamowienie.orderNumber && (
                                    <div className="flex items-start gap-1">
                                      <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-gray-500">Numer zamówienia:</span>
                                        <span className="ml-1 text-gray-900 font-mono">
                                          {zamowienie.orderNumber}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {zamowienie.documents && (
                                    <div className="flex items-start gap-1">
                                      <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-gray-500">Dokumenty:</span>
                                        <span className="ml-1 text-gray-900">
                                          {zamowienie.documents}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {zamowienie.notes && (
                                    <div className="flex items-start gap-1">
                                      <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-gray-500">Uwagi:</span>
                                        <div className="ml-1 text-gray-900 text-sm">
                                          {zamowienie.notes}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Sekcja 2: Adresy */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
                                <h4 className="text-sm font-bold text-green-900 border-b border-green-200 pb-2 mb-3 flex items-center gap-2">
                                  <MapPin size={16} className="text-green-600" />
                                  Szczegóły adresów
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-gray-500 mb-1">📦 Załadunek:</div>
                                    <div className="text-gray-900 font-medium">{getLoadingCompanyName(zamowienie)}</div>
                                    <div className="text-gray-600">{getLoadingAddress(zamowienie)}</div>
                                  </div>
                                  
                                  <div>
                                    <div className="text-gray-500 mb-1">🏢 Rozładunek:</div>
                                    <div className="text-gray-900 font-medium">{getUnloadingCompanyName(zamowienie)}</div>
                                    <div className="text-gray-600">{getUnloadingAddress(zamowienie)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Sekcja 3: Odpowiedź */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                                <h4 className="text-sm font-bold text-purple-900 border-b border-purple-200 pb-2 mb-3 flex items-center gap-2">
                                  <CheckCircle size={16} className="text-purple-600" />
                                  Odpowiedź spedycyjna
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                  {/* Informacje o odpowiedzi jeśli istnieją */}
                                  {zamowienie.response ? (
                                    <div>
                                      <div className="text-gray-500 mb-2 font-medium">Odpowiedź spedycyjna:</div>
                                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                                        {zamowienie.response.driverName && (
                                          <div className="flex items-center gap-2">
                                            <User size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Kierowca:</span>
                                              <span className="ml-1 font-medium">{zamowienie.response.driverName}</span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.driverPhone && (
                                          <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Tel:</span>
                                              <span className="ml-1 font-mono">{zamowienie.response.driverPhone}</span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.vehicleNumber && (
                                          <div className="flex items-center gap-2">
                                            <Truck size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Pojazd:</span>
                                              <span className="ml-1 font-mono">{zamowienie.response.vehicleNumber}</span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.vehicleType && (
                                          <div className="flex items-center gap-2">
                                            <Truck size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Rodzaj pojazdu:</span>
                                              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                {zamowienie.response.vehicleType}
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.transportType && (
                                          <div className="flex items-center gap-2">
                                            <Package size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Rodzaj transportu:</span>
                                              <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                                {zamowienie.response.transportType}
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.deliveryPrice && (
                                          <div className="flex items-center gap-2">
                                            <DollarSign size={12} className="text-green-600" />
                                            <span className="text-sm">
                                              <span className="text-gray-600">Cena transportu:</span>
                                              <span className="ml-1 font-bold text-green-700">
                                                {zamowienie.response.deliveryPrice} PLN
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                        {(() => {
                                          try {
                                            const responseData = zamowienie.response_data ? 
                                              (typeof zamowienie.response_data === 'string' ? 
                                                JSON.parse(zamowienie.response_data) : 
                                                zamowienie.response_data) : null;
                                            
                                            const goodsPrice = responseData?.goodsPrice || zamowienie.response?.goodsPrice;
                                            
                                            return goodsPrice && (
                                              <div className="flex items-center gap-2">
                                                <Package size={12} className="text-blue-600" />
                                                <span className="text-sm">
                                                  <span className="text-gray-600">Cena towaru:</span>
                                                  <span className="ml-1 font-bold text-blue-700">
                                                    {goodsPrice} PLN
                                                  </span>
                                                </span>
                                              </div>
                                            );
                                          } catch (e) {
                                            return null;
                                          }
                                        })()}
                                        {zamowienie.response.notes && (
                                          <div className="mt-2 pt-2 border-t border-green-200">
                                            <span className="text-gray-600">Uwagi przewoźnika:</span>
                                            <div className="mt-1 text-sm text-gray-700">
                                              {zamowienie.response.notes}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Dodatkowe informacje z response_data jeśli istnieją */}
                                        {(() => {
                                          try {
                                            const responseData = zamowienie.response_data ? 
                                              (typeof zamowienie.response_data === 'string' ? 
                                                JSON.parse(zamowienie.response_data) : 
                                                zamowienie.response_data) : null;
                                            
                                            return responseData && (
                                              <div className="mt-2 pt-2 border-t border-green-200">
                                                {responseData.notes && responseData.notes !== zamowienie.response?.notes && (
                                                  <div className="mb-2">
                                                    <span className="text-gray-600">Notatki odpowiadającego:</span>
                                                    <div className="mt-1 text-sm text-gray-700">
                                                      {responseData.notes}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {responseData.cargoDescription && (
                                                  <div className="mb-2">
                                                    <span className="text-gray-600">Opis ładunku:</span>
                                                    <div className="mt-1 text-sm text-gray-700">
                                                      {responseData.cargoDescription}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {responseData.totalWeight && (
                                                  <div className="mb-2">
                                                    <span className="text-gray-600">Łączna waga:</span>
                                                    <div className="mt-1 text-sm text-gray-700">
                                                      {responseData.totalWeight} kg
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {responseData.isMerged && (
                                                  <div className="mb-2">
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                                      <LinkIcon size={10} className="mr-1" />
                                                      Transport połączony
                                                      {responseData.isMainMerged && ' (główny)'}
                                                      {responseData.isSecondaryMerged && ` (z ${responseData.mainTransportId})`}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          } catch (e) {
                                            return null;
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                                        <Clock size={24} className="text-gray-400" />
                                      </div>
                                      <div className="text-gray-500 text-sm">
                                        Oczekuje na odpowiedź
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Sekcja 4: Akcje - przyciski działań */}
                              {zamowienie.response && (
                                <div className="col-span-full bg-white rounded-lg p-4 shadow-sm border border-orange-200">
                                  <h4 className="text-sm font-bold text-orange-900 border-b border-orange-200 pb-2 mb-4 flex items-center gap-2">
                                    <Truck size={16} className="text-orange-600" />
                                    Działania
                                  </h4>
                                  
                                  <div className="flex flex-wrap gap-3">
                                    {/* Przycisk Google Maps */}
                                    <button
                                      onClick={() => {
                                        const url = generateGoogleMapsUrl(zamowienie)
                                        window.open(url, '_blank')
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                      <MapPin size={16} />
                                      Zobacz trasę w Google Maps
                                      {isMergedTransport(zamowienie) && (
                                        <span className="ml-1 px-1 py-0.5 bg-blue-500 rounded text-xs">
                                          PEŁNA TRASA
                                        </span>
                                      )}
                                    </button>
                                    
                                    {/* Przycisk generowania CMR */}
                                    <button
                                      onClick={() => {
                                        try {
                                          generateCMR(zamowienie)
                                        } catch (error) {
                                          console.error('Błąd generowania CMR:', error)
                                          alert('Wystąpił błąd podczas generowania CMR')
                                        }
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                      <FileText size={16} />
                                      Generuj CMR
                                    </button>
                                    
                                    {/* Przycisk tworzenia zlecenia transportowego */}
                                    {canSendOrder && (
                                      <button
                                        onClick={() => onCreateOrder(zamowienie)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                      >
                                        <Clipboard size={16} />
                                        Stwórz zlecenie transportowe
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}