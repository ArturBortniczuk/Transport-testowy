// src/app/spedycja/components/TransportOrderForm.js
'use client'
import { useState, useEffect } from 'react'
import { Calendar, Info, Truck, FileText, MapPin, DollarSign, LinkIcon, Building, ShoppingBag, Weight } from 'lucide-react'
import MergedTransportSummary from './MergedTransportSummary' // NOWY IMPORT

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
      // NAJPIERW: Sprawdź merged_transports (główne źródło danych)
      if (zamowienie.merged_transports) {
        const mergedTransports = typeof zamowienie.merged_transports === 'string' 
          ? JSON.parse(zamowienie.merged_transports) 
          : zamowienie.merged_transports;
        
        if (mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
          // Agreguj dane z originalTransports
          let allOrderNumbers = [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];
          let allMpks = zamowienie.mpk ? [zamowienie.mpk] : [];
          let allDocuments = zamowienie.documents ? [zamowienie.documents] : [];
          let allClients = zamowienie.clientName ? [zamowienie.clientName] : [];
          let totalPrice = 0;
          let totalWeight = 0;
          let totalDistance = 0;
          let cargoDescription = '';

          // POPRAWIONE AGREGOWANIE DANYCH Z response_data
          try {
            const responseData = zamowienie.response_data 
              ? (typeof zamowienie.response_data === 'string' 
                 ? JSON.parse(zamowienie.response_data) 
                 : zamowienie.response_data)
              : {};

            totalPrice = responseData.deliveryPrice || responseData.totalPrice || 0;
            totalDistance = responseData.realRouteDistance || responseData.totalDistance || zamowienie.distance_km || 0;
            cargoDescription = responseData.cargoDescription || '';
            totalWeight = responseData.totalWeight || 0;
          } catch (e) {
            console.error('Błąd parsowania response_data w getMergedData:', e);
          }

          // Dodaj dane z połączonych transportów
          mergedTransports.originalTransports.forEach(transport => {
            if (typeof transport === 'object') {
              if (transport.orderNumber) allOrderNumbers.push(transport.orderNumber);
              if (transport.mpk) allMpks.push(transport.mpk);
              if (transport.documents) allDocuments.push(transport.documents);
              if (transport.clientName) allClients.push(transport.clientName);
            }
          });

          // Usuń duplikaty
          allOrderNumbers = [...new Set(allOrderNumbers)];
          allMpks = [...new Set(allMpks)];
          allDocuments = [...new Set(allDocuments.filter(Boolean))];
          allClients = [...new Set(allClients.filter(Boolean))];

          return {
            ...mergedTransports,
            allOrderNumbers,
            allMpks,
            allDocuments,
            allClients,
            totalPrice,
            totalWeight,
            totalDistance,
            cargoDescription,
            transportCount: mergedTransports.originalTransports.length + 1 // POPRAWKA: +1 za główny transport
          };
        }
      }
      
      // DRUGIE: Sprawdź response_data.mergedTransports
      if (zamowienie?.response_data) {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        if (responseData.mergedTransports && responseData.mergedTransports.originalTransports) {
          return {
            ...responseData.mergedTransports,
            // Już przekazane dane
            totalPrice: responseData.deliveryPrice || responseData.totalPrice || 0,
            totalDistance: responseData.realRouteDistance || responseData.totalDistance || 0,
            cargoDescription: responseData.cargoDescription || '',
            totalWeight: responseData.totalWeight || 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Błąd pobierania danych połączonych transportów:', error);
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
          
          <div className="bg-white rounded-lg p-4 border">
            <MergedTransportSummary 
              transport={zamowienie}
              mergedData={mergedData}
              allTransports={null}
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
      
      {/* ROZSZERZONE Podsumowanie zlecenia */}
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
                : [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id]
              ).map((orderNum, index) => (
                <div key={index} className="ml-4 text-sm bg-white px-2 py-1 rounded border">
                  {index + 1}. {orderNum}
                </div>
              ))}
            </div>
          </div>

          {/* ROZSZERZONE INFORMACJE dla połączonych transportów */}
          {isMergedTransport && aggregatedMergedData && (
            <>
              {/* Wszystkie MPK */}
              {aggregatedMergedData.allMpks && aggregatedMergedData.allMpks.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">MPK:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {aggregatedMergedData.allMpks.map((mpk, index) => (
                      <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                        {mpk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Wszystkie dokumenty */}
              {aggregatedMergedData.allDocuments && aggregatedMergedData.allDocuments.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Dokumenty:</span>
                  <div className="mt-1 space-y-1">
                    {aggregatedMergedData.allDocuments.map((doc, index) => (
                      <div key={index} className="ml-4 text-sm bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wszyscy klienci */}
              {aggregatedMergedData.allClients && aggregatedMergedData.allClients.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Klienci:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {aggregatedMergedData.allClients.map((client, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs">
                        {client}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Informacje finansowe i dystans */}
              <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-gray-100 rounded-md">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Łączna cena</div>
                  <div className="font-bold text-green-600">
                    {aggregatedMergedData.totalPrice ? `${aggregatedMergedData.totalPrice.toFixed(2)} PLN` : 'Do ustalenia'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Łączna waga</div>
                  <div className="font-bold text-blue-600">
                    {aggregatedMergedData.totalWeight ? `${aggregatedMergedData.totalWeight} kg` : 'Do ustalenia'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Odległość</div>
                  <div className="font-bold text-orange-600">
                    {aggregatedMergedData.totalDistance ? `${aggregatedMergedData.totalDistance} km` : 'Do ustalenia'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Podstawowe informacje - również dla normalnych transportów */}
          {!isMergedTransport && (
            <>
              <div>
                <span className="font-medium text-gray-700">MPK:</span>
                <div className="mt-1">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                    {zamowienie.mpk || 'Nie podano'}
                  </span>
                </div>
              </div>

              {zamowienie.documents && (
                <div>
                  <span className="font-medium text-gray-700">Dokumenty:</span>
                  <div className="mt-1 text-sm bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                    {zamowienie.documents}
                  </div>
                </div>
              )}

              {zamowienie.clientName && (
                <div>
                  <span className="font-medium text-gray-700">Klient:</span>
                  <div className="mt-1">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs">
                      {zamowienie.clientName}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Informacje o trasie i odległości */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {isMergedTransport && (
                <p><span className="font-medium">Typ zlecenia:</span> <span className="text-purple-600 font-semibold">Transport łączony</span></p>
              )}
              <p><span className="font-medium">Łączna odległość:</span> {
                (() => {
                  if (calculatedRouteDistance > 0) {
                    return calculatedRouteDistance;
                  }
                  
                  if (isMergedTransport && aggregatedMergedData?.totalDistance) {
                    return aggregatedMergedData.totalDistance;
                  }
                  
                  const distance = getRouteDistanceFromData();
                  return distance || zamowienie.distanceKm || zamowienie.distance_km || 0;
                })()
              } km</p>
              <p><span className="font-medium">Wartość transportu:</span> {
                isMergedTransport && aggregatedMergedData?.totalPrice 
                  ? `${aggregatedMergedData.totalPrice.toFixed(2)} PLN`
                  : (() => {
                      try {
                        const responseData = zamowienie?.response_data 
                          ? (typeof zamowienie.response_data === 'string' 
                             ? JSON.parse(zamowienie.response_data) 
                             : zamowienie.response_data)
                          : {};
                        const price = responseData.deliveryPrice || 0;
                        return price > 0 ? `${price.toFixed(2)} PLN` : 'Do ustalenia';
                      } catch (error) {
                        return 'Do ustalenia';
                      }
                    })()
              }</p>
            </div>
            
            <div className="space-y-2">
              {isMergedTransport && (
                <p><span className="font-medium">Liczba transportów:</span> {aggregatedMergedData?.transportCount || 1}</p>
              )}
              {!isMergedTransport && (
                <p><span className="font-medium">Trasa:</span> {getTransportRoute(zamowienie)}</p>
              )}
              
              {/* Podstawowe informacje o adresach */}
              <div className="text-sm text-gray-600">
                <div><span className="font-medium">Załadunek:</span> {
                  zamowienie.location === 'Odbiory własne' && zamowienie.producerAddress 
                    ? formatAddress(zamowienie.producerAddress)
                    : (zamowienie.location || 'Nie podano')
                }</div>
                <div><span className="font-medium">Rozładunek:</span> {
                  zamowienie.delivery_data 
                    ? formatAddress(JSON.parse(zamowienie.delivery_data))
                    : (zamowienie.delivery ? formatAddress(zamowienie.delivery) : 'Nie podano')
                }</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Przyciski akcji */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          disabled={isSubmitting}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Wysyłanie...
            </>
          ) : (
            <>
              <FileText size={16} />
              Wyślij zlecenie
            </>
          )}
        </button>
      </div>
    </form>
  )
}