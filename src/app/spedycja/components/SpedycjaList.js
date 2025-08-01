// src/app/spedycja/components/SpedycjaList.js
import React, { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { generateCMR } from '@/lib/utils/generateCMR'
import { Truck, Package, MapPin, Phone, FileText, Calendar, DollarSign, User, Clipboard, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Edit, Pencil, Building, ShoppingBag, Weight, Bot, Link as LinkIcon, Unlink, Copy, ExternalLink, CheckCircle, Clock } from 'lucide-react'
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

  // Funkcja do pobierania odległości z odpowiedzi
  const getDistanceFromResponse = (transport) => {
    try {
      // Sprawdź response_data
      if (transport.response_data) {
        const responseData = typeof transport.response_data === 'string' 
          ? JSON.parse(transport.response_data) 
          : transport.response_data;
        
        // Sprawdź różne pola odległości w odpowiedzi
        if (responseData.distance) return responseData.distance;
        if (responseData.totalDistance) return responseData.totalDistance;
        if (responseData.distanceKm) return responseData.distanceKm;
      }
    } catch (e) {
      console.error('Błąd parsowania response_data dla odległości:', e);
    }
    
    // Sprawdź bezpośrednie pole distance_km z bazy
    if (transport.distanceKm && transport.distanceKm > 0) {
      return transport.distanceKm;
    }
    
    // Sprawdź alternatywne nazwy pól
    if (transport.distance_km && transport.distance_km > 0) {
      return transport.distance_km;
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
              availableTransports={filteredSpedycje}
              onSubmit={handleMultiTransportResponse}
              onClose={() => setShowMultiResponseForm(false)}
            />
          </div>
        </div>
      )}

      {/* Lista transportów w formie tabeli */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredSpedycje.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">
              {showArchive ? 'Brak zamówień w archiwum' : 'Brak nowych zamówień'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trasa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Firmy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numer/MPK
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpedycje.map((zamowienie) => {
                  const statusInfo = getStatusInfo(zamowienie);
                  const responsibleInfo = getResponsiblePersonInfo(zamowienie);
                  const isMerged = isMergedTransport(zamowienie);
                  const distance = getDistanceFromResponse(zamowienie);
                  
                  return (
                    <React.Fragment key={zamowienie.id}>
                      {/* Główny wiersz */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* Trasa */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Truck size={16} className="text-blue-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {getLoadingCity(zamowienie)} → {getDeliveryCity(zamowienie)}
                              </div>
                              {isMerged && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 mt-1">
                                  <LinkIcon size={10} className="mr-1" />
                                  Połączony
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Firmy */}
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {getLoadingCompanyName(zamowienie)}
                            </div>
                            <div className="text-gray-500">
                              → {getUnloadingCompanyName(zamowienie)}
                            </div>
                          </div>
                        </td>
                        
                        {/* Daty */}
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-900">
                              <Clock size={12} />
                              <span>Dodano: {formatDate(zamowienie.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar size={12} />
                              <span>Dostawa: {formatDate(zamowienie.deliveryDate)}</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Numer/MPK */}
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-900">
                              <FileText size={12} />
                              <span>{zamowienie.orderNumber || 'Brak numeru'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clipboard size={12} />
                              <span>MPK: {responsibleInfo.mpk || 'Brak'}</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </td>
                        
                        {/* Akcje */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {/* Przycisk rozwijania */}
                            <button
                              onClick={() => setExpandedId(expandedId === zamowienie.id ? null : zamowienie.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Rozwiń szczegóły"
                            >
                              {expandedId === zamowienie.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            
                            {/* Przycisk edycji */}
                            {canEdit(zamowienie) && zamowienie.status !== 'completed' && (
                              <button
                                onClick={() => onEdit(zamowienie)}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edytuj"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            
                            {/* Przycisk oznaczania jako zrealizowane */}
                            {isAdmin && zamowienie.status === 'responded' && (
                              <button
                                onClick={() => onMarkAsCompleted(zamowienie.id)}
                                className="p-1 text-green-600 hover:text-green-800 transition-colors"
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
                          <td colSpan="6" className="px-4 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              
                              {/* Sekcja 1: Informacje podstawowe */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">
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
                                      <span className="text-gray-500">Odpowiedzialny:</span>
                                      <span className="ml-1 text-gray-900 font-medium">
                                        {responsibleInfo.name}
                                      </span>
                                      {responsibleInfo.mpk && (
                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                          MPK: {responsibleInfo.mpk}
                                        </span>
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
                                  
                                  {distance && (
                                    <div className="flex items-start gap-1">
                                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-gray-500">Odległość:</span>
                                        <span className="ml-1 text-gray-900 font-medium">
                                          {distance} km
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
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
                                </div>
                              </div>
                              
                              {/* Sekcja 2: Adresy */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">
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
                              
                              {/* Sekcja 3: Dodatkowe informacje */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">
                                  Dodatkowe informacje
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                  {zamowienie.notes && (
                                    <div>
                                      <div className="text-gray-500 mb-1">Uwagi:</div>
                                      <div className="text-gray-900">{zamowienie.notes}</div>
                                    </div>
                                  )}
                                  
                                  {zamowienie.documents && (
                                    <div>
                                      <div className="text-gray-500 mb-1">Dokumenty:</div>
                                      <div className="text-gray-900">{zamowienie.documents}</div>
                                    </div>
                                  )}
                                  
                                  {/* Informacje o odpowiedzi jeśli istnieją */}
                                  {zamowienie.response && (
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
                                              <span className="text-gray-600">Cena:</span>
                                              <span className="ml-1 font-bold text-green-700">
                                                {zamowienie.response.deliveryPrice} PLN
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                        {zamowienie.response.notes && (
                                          <div className="mt-2 pt-2 border-t border-green-200">
                                            <span className="text-gray-600">Uwagi:</span>
                                            <div className="mt-1 text-sm text-gray-700">
                                              {zamowienie.response.notes}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
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
