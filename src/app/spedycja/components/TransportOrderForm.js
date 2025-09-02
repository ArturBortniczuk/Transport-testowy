// src/app/spedycja/components/TransportOrderForm.js
'use client'
import { useState, useEffect } from 'react'
import { Calendar, Info, Truck, FileText, MapPin, DollarSign, LinkIcon, Building, ShoppingBag, Weight } from 'lucide-react'
import MergedTransportSummary from './MergedTransportSummary'

export default function TransportOrderForm({ onSubmit, onCancel, zamowienie }) {
  const [formData, setFormData] = useState({
    towar: '',
    terminPlatnosci: '30 dni',
    waga: '',
    dataZaladunku: '',
    dataRozladunku: '',
    emailOdbiorcy: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  // Sprawdź czy transport jest połączony
  const isMergedTransport = (() => {
    // Sprawdź response_data
    if (zamowienie?.response_data) {
      try {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data
        return responseData?.isMerged || false
      } catch (e) {
        console.error('Błąd parsowania response_data:', e)
      }
    }
    
    // Fallback do starych pól
    return zamowienie?.merged_transports && zamowienie?.response?.isMerged
  })()

  // POPRAWIONA FUNKCJA pobierająca dane o połączonych transportach
  const getMergedData = () => {
    if (!isMergedTransport) return null
    
    try {
      console.log('🔍 getMergedData: Sprawdzam dane dla transportu', zamowienie.id);
      
      // NAJPIERW: Sprawdź response_data (główne źródło danych)
      if (zamowienie?.response_data) {
        console.log('🔍 getMergedData: Mam response_data');
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        console.log('🔍 getMergedData: Parsed response_data:', responseData);
        
        // POPRAWKA: Sprawdź mergedTransportIds zamiast originalTransports
        if (responseData.mergedTransportIds && Array.isArray(responseData.mergedTransportIds) && responseData.mergedTransportIds.length > 0) {
          console.log('✅ getMergedData: Znaleziono mergedTransportIds:', responseData.mergedTransportIds);
          
          // Utwórz dane używając mergedTransportIds
          let allOrderNumbers = [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];
          let allMpks = zamowienie.mpk ? [zamowienie.mpk] : [];
          let allDocuments = zamowienie.documents ? [zamowienie.documents] : [];
          let allClients = zamowienie.clientName ? [zamowienie.clientName] : [];
          
          // Utwórz originalTransports z mergedTransportIds (na potrzeby kompatybilności)
          const originalTransports = responseData.mergedTransportIds.map(id => ({ id }));
          
          return {
            originalTransports: originalTransports,
            routeSequence: responseData.routeSequence || [],
            mergedTransportIds: responseData.mergedTransportIds,
            allOrderNumbers,
            allMpks,
            allDocuments,
            allClients,
            totalPrice: responseData.totalDeliveryPrice || responseData.deliveryPrice || 0,
            totalWeight: responseData.totalWeight || 0,
            totalDistance: responseData.distance || 0,
            cargoDescription: responseData.cargoDescription || '',
            transportCount: responseData.mergedTransportIds.length, // Liczba wszystkich transportów
            isMainMerged: responseData.isMainMerged || false
          };
        }
      }
      
      // DRUGIE: Sprawdź merged_transports
      if (zamowienie.merged_transports) {
        console.log('🔍 getMergedData: Sprawdzam merged_transports');
        const mergedTransports = typeof zamowienie.merged_transports === 'string' 
          ? JSON.parse(zamowienie.merged_transports) 
          : zamowienie.merged_transports;
        
        console.log('🔍 getMergedData: Parsed merged_transports:', mergedTransports);
        
        // POPRAWKA: Sprawdź mergedTransportIds w merged_transports
        if (mergedTransports.mergedTransportIds && Array.isArray(mergedTransports.mergedTransportIds)) {
          console.log('✅ getMergedData: Znaleziono mergedTransportIds w merged_transports:', mergedTransports.mergedTransportIds);
          
          const originalTransports = mergedTransports.mergedTransportIds.map(id => ({ id }));
          
          return {
            originalTransports: originalTransports,
            mergedTransportIds: mergedTransports.mergedTransportIds,
            allOrderNumbers: [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id],
            allMpks: zamowienie.mpk ? [zamowienie.mpk] : [],
            allDocuments: zamowienie.documents ? [zamowienie.documents] : [],
            allClients: zamowienie.clientName ? [zamowienie.clientName] : [],
            totalPrice: 0,
            totalWeight: 0,
            totalDistance: 0,
            cargoDescription: '',
            transportCount: mergedTransports.mergedTransportIds.length,
            isMain: mergedTransports.isMain || false
          };
        }
      }
      
      console.log('❌ getMergedData: Nie znaleziono danych o połączonych transportach');
      return null;
    } catch (error) {
      console.error('❌ getMergedData: Błąd pobierania danych połączonych transportów:', error);
      return null;
    }
  };

  const mergedData = getMergedData()
  
  // State dla szczegółów połączonych transportów
  const [mergedTransportsDetails, setMergedTransportsDetails] = useState([]);
  const [isLoadingMergedDetails, setIsLoadingMergedDetails] = useState(false);
  
  // Funkcja do pobierania szczegółów połączonych transportów
  const fetchMergedTransportsDetails = async () => {
    if (!isMergedTransport || !mergedData?.originalTransports?.length) {
      return;
    }
    
    setIsLoadingMergedDetails(true);
    
    try {
      const transportIds = mergedData.originalTransports;
      
      const transportPromises = transportIds.map(async (transportId) => {
        if (typeof transportId === 'object' && transportId.id) {
          // Jeśli to już obiekt z danymi, użyj go
          return transportId;
        }
        
        // Pobierz szczegóły z API
        const response = await fetch(`/api/spedycje/${transportId}`);
        if (response.ok) {
          const data = await response.json();
          return data.spedycja;
        }
        return null;
      });
      
      const details = await Promise.all(transportPromises);
      const validDetails = details.filter(detail => detail !== null);
      setMergedTransportsDetails(validDetails);
    } catch (error) {
      console.error('Błąd pobierania szczegółów transportów:', error);
    } finally {
      setIsLoadingMergedDetails(false);
    }
  };
  
  // Pobierz szczegóły połączonych transportów  
  useEffect(() => {
    if (isMergedTransport && mergedData?.originalTransports?.length > 0) {
      fetchMergedTransportsDetails();
    }
  }, [isMergedTransport]); 
  
  // FUNKCJA agregująca dane - używa getMergedData()
  const getAggregatedMergedData = () => {
    if (!isMergedTransport || !mergedData) return null;
    
    // mergedData już zawiera wszystko co potrzebujemy z getMergedData()
    return mergedData;
  };
  
  // Memoizuj zagregowane dane
  const [aggregatedMergedData, setAggregatedMergedData] = useState(null);
  
  // Zaktualizuj zagregowane dane gdy zmieni się mergedTransportsDetails
  useEffect(() => {
    if (isMergedTransport) {
      const aggregated = getAggregatedMergedData();
      setAggregatedMergedData(aggregated);
    } else {
      setAggregatedMergedData(null);
    }
  }, [isMergedTransport, mergedTransportsDetails]);
  
  // Funkcja do pobierania odległości trasy z wykorzystaniem istniejących danych
  const getRouteDistanceFromData = () => {
    // NAJPIERW: Sprawdź czy mamy już obliczoną odległość w response_data
    try {
      if (zamowienie?.response_data) {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        // POPRAWKA: Sprawdź realRouteDistance jako pierwszą opcję
        if (responseData.realRouteDistance && responseData.realRouteDistance > 0) {
          return responseData.realRouteDistance;
        }
        
        // 2. Sprawdź totalDistance
        if (responseData.totalDistance && responseData.totalDistance > 0) {
          return responseData.totalDistance;
        }
        
        // 3. Sprawdź distance
        if (responseData.distance && responseData.distance > 0) {
          return responseData.distance;
        }
      }
    } catch (e) {
      console.error('Błąd parsowania response_data dla odległości:', e);
    }
    
    // DRUGIE: Sprawdź starsze pola w response
    if (zamowienie?.response?.totalDistance && zamowienie.response.totalDistance > 0) {
      return zamowienie.response.totalDistance;
    }
    if (zamowienie?.response?.mergedRouteDistance && zamowienie.response.mergedRouteDistance > 0) {
      return zamowienie.response.mergedRouteDistance;
    }
    
    // TRZECIE: Sprawdź mergedData
    if (mergedData?.totalDistance && mergedData.totalDistance > 0) {
      return mergedData.totalDistance;
    }
    
    // OSTATNIE: Fallback do podstawowej odległości
    return zamowienie.distanceKm || zamowienie.distance_km || 0;
  }
  
  // Funkcje pomocnicze do pobierania adresów
  const getMainLoadingAddress = () => {
    if (zamowienie.location === 'Magazyn Białystok') {
      return 'Białystok, Wysockiego 69B';
    } else if (zamowienie.location === 'Magazyn Zielonka') {
      return 'Zielonka, Krótka 2';
    } else if (zamowienie.location === 'Odbiory własne' && zamowienie.producerAddress) {
      return `${zamowienie.producerAddress.city}, ${zamowienie.producerAddress.postalCode || ''}, ${zamowienie.producerAddress.street || ''}`.replace(/^,\s*|,\s*$/g, '');
    } else {
      return zamowienie.location || 'Brak danych';
    }
  };

  const getDeliveryAddress = () => {
    try {
      if (zamowienie.delivery_data) {
        const deliveryData = typeof zamowienie.delivery_data === 'string' 
          ? JSON.parse(zamowienie.delivery_data) 
          : zamowienie.delivery_data;
        return `${deliveryData.city || ''}, ${deliveryData.postalCode || ''}, ${deliveryData.street || ''}`.replace(/^,\s*|,\s*$/g, '');
      }
    } catch (e) {
      console.error('Błąd parsowania delivery_data:', e);
    }
    return zamowienie.delivery?.city || 'Brak danych';
  };

  // NOWA FUNKCJA - pobieranie danych towaru z response_data
  const getGoodsDataFromResponse = () => {
    try {
      if (zamowienie?.response_data) {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        return {
          description: responseData.cargoDescription || responseData.goodsDescription || '',
          weight: responseData.totalWeight || responseData.weight || ''
        };
      }
      
      if (zamowienie?.goodsDescription) {
        return {
          description: zamowienie.goodsDescription.description || '',
          weight: zamowienie.goodsDescription.weight || ''
        };
      }
      
      return { description: '', weight: '' };
    } catch (error) {
      console.error('Błąd pobierania danych towaru:', error);
      return { description: '', weight: '' };
    }
  };

  // Funkcja formatująca trasę transportu
  const getTransportRoute = (transport) => {
    let start;
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      start = transport.producerAddress.city || 'Brak miasta';
    } else if (transport.location === 'Magazyn Białystok') {
      start = 'Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      start = 'Zielonka';
    } else {
      start = transport.location?.replace('Magazyn ', '') || 'Nie podano';
    }
    
    const end = transport.delivery?.city || 'Brak danych'
    
    return `${start} → ${end}`
  }
  
  // Funkcja formatująca adres
  const formatAddress = (address) => {
    if (!address) return 'Brak danych'
    if (typeof address === 'string') return address
    return `${address.city || ''}, ${address.postalCode || ''}, ${address.street || ''}`.replace(/^,\s*|,\s*$/g, '')
  }

  // ===== FUNKCJE DO POBIERANIA DANYCH O POŁĄCZONYCH TRANSPORTACH =====
  
  // Funkcja do pobrania wszystkich danych transportów
  const getAllTransportsData = () => {
    const allTransports = [];
    const addedIds = new Set();
    
    // ZAWSZE dodaj obecny transport jako pierwszy
    const currentTransportData = {
      id: zamowienie.id,
      orderNumber: zamowienie.order_number || zamowienie.orderNumber,
      mpk: zamowienie.mpk,
      documents: zamowienie.documents,
      clientName: zamowienie.client_name || zamowienie.clientName,
      responsiblePerson: zamowienie.responsible_person || zamowienie.responsiblePerson,
      location: zamowienie.location,
      delivery_data: zamowienie.delivery_data,
      route: getTransportRoute(zamowienie),
      distance_km: zamowienie.distance_km,
      distanceKm: zamowienie.distanceKm
    };
    
    allTransports.push(currentTransportData);
    addedIds.add(zamowienie.id);

    // Sprawdź response_data
    if (zamowienie.response_data) {
      try {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        if (responseData.originalTransports && Array.isArray(responseData.originalTransports)) {
          responseData.originalTransports.forEach(originalTransport => {
            if (!addedIds.has(originalTransport.id)) {
              const transportData = {
                id: originalTransport.id,
                orderNumber: originalTransport.orderNumber || originalTransport.order_number,
                mpk: originalTransport.mpk,
                documents: originalTransport.documents,
                clientName: originalTransport.clientName || originalTransport.client_name,
                responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
                location: originalTransport.location,
                delivery_data: originalTransport.delivery_data,
                route: originalTransport.route,
                distance_km: originalTransport.distance_km || originalTransport.distanceKm,
                distanceKm: originalTransport.distanceKm || originalTransport.distance_km
              };
              allTransports.push(transportData);
              addedIds.add(originalTransport.id);
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania response_data:', e);
      }
    }
    
    // Sprawdź merged_transports (backup)
    if (zamowienie.merged_transports) {
      try {
        const mergedTransportsData = typeof zamowienie.merged_transports === 'string' 
          ? JSON.parse(zamowienie.merged_transports) 
          : zamowienie.merged_transports;
        
        if (mergedTransportsData.originalTransports && Array.isArray(mergedTransportsData.originalTransports)) {
          mergedTransportsData.originalTransports.forEach(originalTransport => {
            if (!addedIds.has(originalTransport.id)) {
              const transportData = {
                id: originalTransport.id,
                orderNumber: originalTransport.orderNumber || originalTransport.order_number,
                mpk: originalTransport.mpk,
                documents: originalTransport.documents,
                clientName: originalTransport.clientName || originalTransport.client_name,
                responsiblePerson: originalTransport.responsiblePerson || originalTransport.responsible_person,
                location: originalTransport.location,
                delivery_data: originalTransport.delivery_data,
                route: originalTransport.route,
                distance_km: originalTransport.distance_km || originalTransport.distanceKm,
                distanceKm: originalTransport.distanceKm || originalTransport.distance_km
              };
              allTransports.push(transportData);
              addedIds.add(originalTransport.id);
            }
          });
        }
      } catch (e) {
        console.error('Błąd parsowania merged_transports:', e);
      }
    }
    
    return allTransports;
  };

  // Funkcja do zbierania wszystkich unikalnych wartości z pola
  const collectUniqueValues = (field) => {
    const values = new Set();
    const allTransports = getAllTransportsData();
    
    allTransports.forEach(transportData => {
      if (transportData[field]) {
        values.add(transportData[field]);
      }
    });
    
    return Array.from(values).filter(Boolean);
  };

  // Funkcja do zbierania wszystkich odpowiedzialnych osób
  const collectAllResponsible = () => {
    const allTransports = getAllTransportsData();
    const responsible = new Set();
    
    allTransports.forEach(transportData => {
      if (transportData.responsiblePerson && transportData.responsiblePerson.trim()) {
        responsible.add(transportData.responsiblePerson.trim());
      }
      if (transportData.responsible_person && transportData.responsible_person.trim()) {
        responsible.add(transportData.responsible_person.trim());
      }
    });
    
    const result = Array.from(responsible).filter(Boolean);
    
    // Jeśli nadal brak, spróbuj z oryginalnego transportu
    if (result.length === 0) {
      if (zamowienie.responsible_person) {
        result.push(zamowienie.responsible_person);
      }
      if (zamowienie.created_by) {
        result.push(zamowienie.created_by);
      }
    }
    
    return result;
  };

  // Funkcja do zbierania tras
  const getAllRoutes = () => {
    const allTransports = getAllTransportsData();
    
    return allTransports.map(transportData => {
      return transportData.route || getTransportRoute(transportData);
    }).filter(route => route && route !== 'Brak danych');
  };

  // ZDEFINIUJ WSZYSTKIE ZMIENNE
  const allMPKs = isMergedTransport ? collectUniqueValues('mpk') : [zamowienie.mpk].filter(Boolean);
  const allDocuments = isMergedTransport ? collectUniqueValues('documents') : [zamowienie.documents].filter(Boolean);
  const allClients = isMergedTransport ? collectUniqueValues('clientName') : [zamowienie.clientName || zamowienie.client_name].filter(Boolean);
  const allResponsible = isMergedTransport ? collectAllResponsible() : [zamowienie.responsible_person || zamowienie.responsiblePerson].filter(Boolean);
  const allRoutes = isMergedTransport ? getAllRoutes() : [getTransportRoute(zamowienie)];
  const allOrderNumbers = isMergedTransport ? collectUniqueValues('orderNumber') : [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];

  // Automatyczne wypełnienie danych z response_data
  useEffect(() => {
    const goodsData = getGoodsDataFromResponse();
    
    setFormData(prev => ({
      ...prev,
      towar: goodsData.description || prev.towar,
      waga: goodsData.weight ? goodsData.weight.toString() : prev.waga
    }));
  }, [zamowienie]);
  
  // Automatyczne wypełnienie danych dla połączonych transportów
  useEffect(() => {
    if (isMergedTransport && aggregatedMergedData) {
      setFormData(prev => ({
        ...prev,
        towar: aggregatedMergedData.cargoDescription || prev.towar,
        waga: aggregatedMergedData.totalWeight ? aggregatedMergedData.totalWeight.toString() : prev.waga
      }));
    }
  }, [isMergedTransport, aggregatedMergedData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Przygotuj dane zlecenia - automatycznie uwzględnij wszystkie miejsca z połączonego transportu
      const orderData = {
        spedycjaId: zamowienie.id,
        ...formData,
        // Dodaj informację o tym czy to transport połączony
        isMerged: isMergedTransport,
        mergedTransportsData: aggregatedMergedData
      }
      
      await onSubmit(orderData)
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania zlecenia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Stwórz zlecenie transportowe</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* NOWA SEKCJA: Szczegółowe informacje o połączonych transportach */}
      {isMergedTransport && (
        <div className="mt-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center mb-4">
            <LinkIcon size={20} className="mr-2 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Transport Połączony</h3>
            {aggregatedMergedData?.transportCount && (
              <span className="ml-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                {aggregatedMergedData.transportCount} tras
              </span>
            )}
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <MergedTransportSummary 
              transport={zamowienie}
              mergedData={null}
              allTransports={[]}
            />
          </div>
          
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-3 rounded-md">
            <strong>Informacja:</strong> To zlecenie obejmuje {aggregatedMergedData?.transportCount || 1} połączonych transportów. 
            Wszystkie szczegóły tras i punktów dostawy są wyświetlone powyżej.
          </div>
        </div>
      )}

      {/* Podstawowe dane zlecenia */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Rodzaj towaru</label>
          <input
            name="towar"
            type="text"
            value={formData.towar}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="Opisz przewożony towar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Waga towaru</label>
          <input
            name="waga"
            type="text"
            value={formData.waga}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="np. 2500 kg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data załadunku</label>
          <input
            name="dataZaladunku"
            type="date"
            value={formData.dataZaladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data rozładunku</label>
          <input
            name="dataRozladunku"
            type="date"
            value={formData.dataRozladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Termin płatności</label>
          <select
            name="terminPlatnosci"
            value={formData.terminPlatnosci}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="14 dni">14 dni</option>
            <option value="30 dni">30 dni</option>
            <option value="60 dni">60 dni</option>
            <option value="Natychmiastowa">Natychmiastowa</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email odbiorcy (opcjonalnie)</label>
          <input
            name="emailOdbiorcy"
            type="email"
            value={formData.emailOdbiorcy}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Informacje o transporcie */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Info className="text-blue-500" size={20} />
          Informacje o transporcie
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Numer zlecenia:</span>
            <span className="ml-2 text-gray-900">{zamowienie.orderNumber || zamowienie.id}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">MPK:</span>
            <span className="ml-2 text-gray-900">{zamowienie.mpk || 'Brak'}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Punkt załadunku:</span>
            <span className="ml-2 text-gray-900">{getMainLoadingAddress()}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Punkt rozładunku:</span>
            <span className="ml-2 text-gray-900">{getDeliveryAddress()}</span>
          </div>

          <div>
            <span className="font-medium text-gray-700">Trasa:</span>
            <span className="ml-2 text-gray-900">{getTransportRoute(zamowienie)}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Odpowiedzialny:</span>
            <span className="ml-2 text-gray-900">{zamowienie.responsiblePerson || 'Brak'}</span>
          </div>

          {/* Dodatkowe informacje dla połączonych transportów */}
          {isMergedTransport && aggregatedMergedData && (
            <>
              <div className="col-span-2 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Typ zlecenia:</span>
                    <span className="ml-2 text-purple-600 font-semibold">Transport łączony</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Łączna odległość:</span>
                    <span className="ml-2 text-gray-900">{aggregatedMergedData.totalDistance} km</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Liczba tras:</span>
                    <span className="ml-2 text-gray-900">{aggregatedMergedData.transportCount}</span>
                  </div>
                </div>
              </div>

              {/* POPRAWIONE Szczegóły połączonych transportów - WSZYSTKIE DANE */}
              <div className="col-span-2 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Szczegóły połączonych transportów:</h4>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* WSZYSTKIE Numery zleceń */}
                  <div>
                    <span className="font-medium text-gray-700">Numery zleceń ({allOrderNumbers.length}):</span>
                    <div className="mt-1 space-y-1">
                      {allOrderNumbers.map((orderNum, index) => (
                        <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                          {index + 1}. {orderNum}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WSZYSTKIE MPK */}
                  <div>
                    <span className="font-medium text-gray-700">MPK ({allMPKs.length}):</span>
                    <div className="mt-1 space-y-1">
                      {allMPKs.map((mpk, index) => (
                        <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                          {index + 1}. {mpk}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WSZYSTKIE Dokumenty */}
                  <div>
                    <span className="font-medium text-gray-700">Dokumenty ({allDocuments.length}):</span>
                    <div className="mt-1 space-y-1">
                      {allDocuments.map((doc, index) => (
                        <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                          {index + 1}. {doc}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WSZYSCY Klienci */}
                  {allClients.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Klienci ({allClients.length}):</span>
                      <div className="mt-1 space-y-1">
                        {allClients.map((client, index) => (
                          <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                            {index + 1}. {client}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WSZYSCY Odpowiedzialni */}
                  {allResponsible.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Odpowiedzialni ({allResponsible.length}):</span>
                      <div className="mt-1 space-y-1">
                        {allResponsible.map((person, index) => (
                          <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                            {index + 1}. {person}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WSZYSTKIE Trasy */}
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Sekwencja trasy ({allRoutes.length}):</span>
                    <div className="mt-1 space-y-2">
                      {allRoutes.map((route, index) => (
                        <div key={index} className="ml-4 text-sm bg-white px-3 py-2 rounded border flex items-center gap-2">
                          <span className="bg-purple-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          {route}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Numery połączonych zleceń - jak w MergedTransportSummary */}
                {isMergedTransport && allOrderNumbers.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Numery połączonych zleceń:</h4>
                      <div className="flex flex-wrap gap-2">
                        {allOrderNumbers.map((orderNum, idx) => (
                          <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {orderNum}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Przyciski akcji */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Wysyłanie...' : 'Stwórz zlecenie transportowe'}
        </button>
      </div>
    </form>
  )
}