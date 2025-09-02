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
      return `${zamowienie.producerAddress.city}, ${zamowienie.producerAddress.postalCode || ''}, ${zamowienie.producerAddress.street || ''}`;
    }
    return null;
  };
  
  const getMainDeliveryAddress = () => {
    if (zamowienie.delivery) {
      return `${zamowienie.delivery.city}, ${zamowienie.delivery.postalCode || ''}, ${zamowienie.delivery.street || ''}`;
    }
    return null;
  };
  
  const getTransportDeliveryAddress = (transport) => {
    if (transport.delivery) {
      return `${transport.delivery.city}, ${transport.delivery.postalCode || ''}, ${transport.delivery.street || ''}`;
    }
    return null;
  };
  
  // State dla rzeczywistej odległości
  const [calculatedRouteDistance, setCalculatedRouteDistance] = useState(0);
  
  // Funkcja do obliczania rzeczywistej odległości trasy (tylko jeśli brak danych)
  const calculateRouteDistance = async () => {
    // Najpierw sprawdź czy mamy już dane
    const existingDistance = getRouteDistanceFromData();
    if (existingDistance > 0) {
      return existingDistance;
    }
    
    if (!isMergedTransport) {
      return zamowienie.distanceKm || 0;
    }

    // Jeśli mamy routeSequence, użyj jej
    const routeSequence = mergedData?.routeSequence;
    if (routeSequence && routeSequence.length >= 2) {
      try {
        // Przygotuj punkty trasy w odpowiedniej kolejności
        const waypoints = [];
        
        for (const point of routeSequence) {
          let address = '';
          
          if (point.type === 'loading') {
            if (point.address === 'Magazyn Białystok') {
              address = 'Białystok, Wysockiego 69B';
            } else if (point.address === 'Magazyn Zielonka') {
              address = 'Zielonka, Krótka 2';
            } else if (point.location) {
              address = `${point.location.city}, ${point.location.postalCode || ''}, ${point.location.street || ''}`;
            } else {
              address = point.description;
            }
          } else {
            // rozładunek
            if (point.location) {
              address = `${point.location.city}, ${point.location.postalCode || ''}, ${point.location.street || ''}`;
            } else {
              address = point.description;
            }
          }
          
          if (address) {
            waypoints.push(address);
          }
        }

        if (waypoints.length < 2) {
          return zamowienie.distanceKm || 0;
        }

        // Użyj Google Maps API do obliczenia odległości przez wszystkie punkty
        const origin = waypoints[0];
        const destination = waypoints[waypoints.length - 1];
        const waypointsParam = waypoints.slice(1, -1).map(wp => encodeURIComponent(wp)).join('|');
        
        const url = `/api/distance?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}${waypointsParam ? `&waypoints=${waypointsParam}` : ''}`;
          
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
          const distanceKm = Math.round(data.rows[0].elements[0].distance.value / 1000);
          return distanceKm;
        }
      } catch (error) {
        console.error('Błąd obliczania odległości z routeSequence:', error);
      }
    }
    
    // Jeśli nie ma routeSequence, oblicz na podstawie rzeczywistych transportów
    if (mergedTransportsDetails.length > 0) {
      try {
        const waypoints = [];
        
        // Główny transport - załadunek
        const mainLoadingAddress = getMainLoadingAddress();
        if (mainLoadingAddress) {
          waypoints.push(mainLoadingAddress);
        }
        
        // Dodaj wszystkie punkty rozładunku z połączonych transportów
        mergedTransportsDetails.forEach(transport => {
          const deliveryAddress = getTransportDeliveryAddress(transport);
          if (deliveryAddress) {
            waypoints.push(deliveryAddress);
          }
        });
        
        // Główny transport - rozładunek (na końcu)
        const mainDeliveryAddress = getMainDeliveryAddress();
        if (mainDeliveryAddress) {
          waypoints.push(mainDeliveryAddress);
        }
        
        if (waypoints.length >= 2) {
          const origin = waypoints[0];
          const destination = waypoints[waypoints.length - 1];
          const waypointsParam = waypoints.slice(1, -1).map(wp => encodeURIComponent(wp)).join('|');
          
          const url = `/api/distance?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}${waypointsParam ? `&waypoints=${waypointsParam}` : ''}`;
      
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
            const distanceKm = Math.round(data.rows[0].elements[0].distance.value / 1000);
            return distanceKm;
          }
          
          // Fallback - sumuj odległości między kolejnymi punktami
          let totalDistance = 0;
          for (let i = 0; i < waypoints.length - 1; i++) {
            try {
              const segmentUrl = `/api/distance?origins=${encodeURIComponent(waypoints[i])}&destinations=${encodeURIComponent(waypoints[i + 1])}`;
              const segmentResponse = await fetch(segmentUrl);
              const segmentData = await segmentResponse.json();
              
              if (segmentData.status === 'OK' && segmentData.rows && segmentData.rows[0] && segmentData.rows[0].elements && segmentData.rows[0].elements[0]) {
                totalDistance += Math.round(segmentData.rows[0].elements[0].distance.value / 1000);
              }
            } catch (segmentError) {
              console.warn(`Błąd obliczania segmentu ${i}: ${segmentError.message}`);
            }
          }
          
          if (totalDistance > 0) {
            return totalDistance;
          }
        }
      } catch (error) {
        console.error('Błąd obliczania odległości na podstawie transportów:', error);
      }
    }
    
    // Ostateczny fallback
    return zamowienie.distanceKm || 0;
  };
  
  // Oblicz odległość przy załadowaniu komponentu
  useEffect(() => {
    const calculateDistance = async () => {
      if (isMergedTransport) {
        // Najpierw spróbuj pobrać istniejące dane
        const existingDistance = getRouteDistanceFromData();
        if (existingDistance > 0) {
          setCalculatedRouteDistance(existingDistance);
        } else if (mergedData?.routeSequence?.length > 0 || mergedTransportsDetails.length > 0) {
          // Tylko jeśli brak danych, oblicz rzeczywistą odległość
          const distance = await calculateRouteDistance();
          setCalculatedRouteDistance(distance);
        }
      } else {
        setCalculatedRouteDistance(zamowienie.distanceKm || 0);
      }
    };
    
    calculateDistance();
  }, [isMergedTransport, mergedTransportsDetails.length]); 
  
  // Automatyczne wypełnianie towaru i wagi
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
        mergedTransportsData: mergedData
      }
      
      await onSubmit(orderData)
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania zlecenia')
    } finally {
      setIsSubmitting(false)
    }
  }
  
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
          
          {/* DEBUG CONSOLE LOGS */}
          {console.log('🔍 DEBUG TransportOrderForm:')}
          {console.log('🔍 isMergedTransport:', isMergedTransport)}
          {console.log('🔍 mergedData:', mergedData)}
          {console.log('🔍 mergedTransportsDetails:', mergedTransportsDetails)}
          {console.log('🔍 aggregatedMergedData:', aggregatedMergedData)}
          
          <div className="bg-white rounded-lg p-4 border">
            <MergedTransportSummary 
              transport={zamowienie}
              mergedData={mergedData}
              allTransports={mergedTransportsDetails}
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
            type="datetime-local"
            value={formData.dataZaladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data rozładunku</label>
          <input
            name="dataRozladunku"
            type="datetime-local"
            value={formData.dataRozladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
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
            <option value="7 dni">7 dni</option>
            <option value="14 dni">14 dni</option>
            <option value="21 dni">21 dni</option>
            <option value="30 dni">30 dni</option>
            <option value="60 dni">60 dni</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email odbiorcy</label>
          <input
            name="emailOdbiorcy"
            type="email"
            value={formData.emailOdbiorcy}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="email@przewoznik.pl"
          />
        </div>
      </div>
      
      {/* POPRAWIONE Podsumowanie zlecenia */}
      <div className="mt-6 bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium mb-4 flex items-center">
          <FileText size={18} className="mr-2 text-blue-600" />
          Podsumowanie zlecenia
        </h3>
        
        <div className="space-y-4">
          {/* POPRAWIONE Numery zleceń - w oddzielnych liniach */}
          <div>
            <span className="font-medium text-gray-700">Numery zleceń:</span>
            <div className="mt-1 space-y-1">
              {(isMergedTransport && aggregatedMergedData?.allOrderNumbers 
                ? aggregatedMergedData.allOrderNumbers 
                : [zamowienie.orderNumber || zamowienie.id]
              ).map((orderNum, index) => (
                <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                  {index + 1}. {orderNum}
                </div>
              ))}
            </div>
          </div>

          {/* POPRAWIONE MPK - w oddzielnych liniach */}
          <div>
            <span className="font-medium text-gray-700">MPK:</span>
            <div className="mt-1 space-y-1">
              {(isMergedTransport && aggregatedMergedData?.allMpks 
                ? aggregatedMergedData.allMpks 
                : [zamowienie.mpk].filter(Boolean)
              ).map((mpk, index) => (
                <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                  {index + 1}. {mpk}
                </div>
              ))}
            </div>
          </div>

          {/* POPRAWIONE Dokumenty - w oddzielnych liniach */}
          <div>
            <span className="font-medium text-gray-700">Dokumenty:</span>
            <div className="mt-1 space-y-1">
              {(isMergedTransport && aggregatedMergedData?.allDocuments 
                ? aggregatedMergedData.allDocuments 
                : [zamowienie.documents].filter(Boolean)
              ).map((doc, index) => (
                <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                  {index + 1}. {doc}
                </div>
              ))}
            </div>
          </div>

          {/* POPRAWIONE Klienci - w oddzielnych liniach */}
          {((zamowienie.clientName) || (isMergedTransport && aggregatedMergedData?.allClients?.length > 0)) && (
            <div>
              <span className="font-medium text-gray-700">Klienci:</span>
              <div className="mt-1 space-y-1">
                {(isMergedTransport && aggregatedMergedData?.allClients 
                  ? aggregatedMergedData.allClients 
                  : [zamowienie.clientName].filter(Boolean)
                ).map((client, index) => (
                  <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                    {index + 1}. {client}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POPRAWIONE Podsumowanie danych */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {isMergedTransport && (
                <p><span className="font-medium">Typ zlecenia:</span> <span className="text-purple-600 font-semibold">Transport łączony</span></p>
              )}
              <p><span className="font-medium">Łączna odległość:</span> {
                (() => {
                  // POPRAWKA: Używaj właściwej hierarchii danych
                  if (calculatedRouteDistance > 0) {
                    return calculatedRouteDistance;
                  }
                  
                  if (isMergedTransport && aggregatedMergedData?.totalDistance) {
                    return aggregatedMergedData.totalDistance;
                  }
                  
                  // Dla zwykłego transportu
                  const distance = getRouteDistanceFromData();
                  return distance || 0;
                })()
              } km</p>
              <p><span className="font-medium">Wartość transportu:</span> {
                isMergedTransport && aggregatedMergedData?.totalPrice 
                  ? aggregatedMergedData.totalPrice 
                  : (() => {
                      try {
                        const responseData = zamowienie?.response_data 
                          ? (typeof zamowienie.response_data === 'string' 
                             ? JSON.parse(zamowienie.response_data) 
                             : zamowienie.response_data)
                          : {};
                        return responseData.deliveryPrice || 0;
                      } catch (error) {
                        return 0;
                      }
                    })()
              } PLN</p>
            </div>
            
            <div className="space-y-2">
              {isMergedTransport && (
                <p><span className="font-medium">Liczba transportów:</span> {aggregatedMergedData?.transportCount || 1}</p>
              )}
              {!isMergedTransport && (
                <p><span className="font-medium">Trasa:</span> {getTransportRoute(zamowienie)}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* UPROSZCZONE Szczegóły tras dla transportu połączonego */}
        {isMergedTransport && mergedData && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="font-bold text-sm mb-2 text-gray-800">Szczegóły wszystkich tras:</h4>
            
            {mergedData?.routeSequence && mergedData.routeSequence.length > 0 ? (
              /* Wyświetl sekwencję trasy - UPROSZCZONE */
              <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                  <MapPin size={16} className="mr-2" />
                  Sekwencja trasy ({mergedData.routeSequence.length} punktów)
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mergedData.routeSequence.map((point, index) => (
                    <div key={point.id || index} className="flex items-start gap-3 p-2 bg-white rounded border">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {point.type === 'loading' ? 'Załadunek' : 'Rozładunek'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {point.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {point.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Szczegóły trasy nie są dostępne
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Przyciski */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileText size={18} />
          {isSubmitting ? 'Wysyłanie...' : 'Wyślij zlecenie'}
        </button>
      </div>
    </form>
  );
}