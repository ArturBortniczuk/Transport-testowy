// src/app/spedycja/components/TransportOrderForm.js
'use client'
import { useState, useEffect } from 'react'
import { Calendar, Info, Truck, FileText, MapPin, DollarSign, LinkIcon, Building, ShoppingBag, Weight } from 'lucide-react'

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
    
    console.log('DEBUG getMergedData - zamowienie:', zamowienie);
    console.log('DEBUG merged_transports:', zamowienie.merged_transports);
    console.log('DEBUG response_data:', zamowienie.response_data);
    
    try {
      // NAJPIERW: Sprawdź merged_transports (to jest główne źródło danych)
      if (zamowienie.merged_transports) {
        const mergedTransports = typeof zamowienie.merged_transports === 'string' 
          ? JSON.parse(zamowienie.merged_transports) 
          : zamowienie.merged_transports;
        
        console.log('DEBUG parsed merged_transports:', mergedTransports);
        
        if (mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
          console.log('DEBUG originalTransports count:', mergedTransports.originalTransports.length);
          
          // Agreguj dane z originalTransports
          let allOrderNumbers = [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];
          let allMpks = zamowienie.mpk ? [zamowienie.mpk] : [];
          let allDocuments = zamowienie.documents ? [zamowienie.documents] : [];
          let allClients = (zamowienie.clientName || zamowienie.client_name) ? [zamowienie.clientName || zamowienie.client_name] : [];
          let allCargoDescriptions = [];
          let totalWeight = 0;
          let totalPrice = mergedTransports.mainTransportCost || 0;
          
          mergedTransports.originalTransports.forEach((transport, index) => {
            console.log(`DEBUG Transport ${index + 1}:`, transport);
            
            if (transport.orderNumber) allOrderNumbers.push(transport.orderNumber);
            if (transport.mpk) allMpks.push(transport.mpk);
            if (transport.documents) allDocuments.push(transport.documents);
            if (transport.clientName) allClients.push(transport.clientName);
            if (transport.costAssigned) totalPrice += parseFloat(transport.costAssigned);
          });
          
          console.log('DEBUG WYNIK z merged_transports:');
          console.log('  - allOrderNumbers:', allOrderNumbers);
          console.log('  - allMpks:', allMpks);
          console.log('  - allDocuments:', allDocuments);
          console.log('  - totalPrice:', totalPrice);
          
          return {
            originalTransports: mergedTransports.originalTransports,
            costBreakdown: mergedTransports.costBreakdown || null,
            routeSequence: [], // Brak routeSequence w starym formacie
            totalDistance: mergedTransports.totalDistance || 0,
            totalMergedCost: mergedTransports.totalMergedCost || 0,
            mainTransportCost: mergedTransports.mainTransportCost || 0,
            // Agregowane dane
            allOrderNumbers: [...new Set(allOrderNumbers)],
            allMpks: [...new Set(allMpks.filter(mpk => mpk && mpk !== ''))],
            allDocuments: [...new Set(allDocuments.filter(doc => doc && doc !== '' && doc !== 'undefined'))],
            allClients: [...new Set(allClients.filter(client => client && client !== ''))],
            totalPrice: totalPrice.toFixed(2)
          };
        }
      }
      
      // DRUGIE: Sprawdź response_data dla nowego formatu z routeSequence
      if (zamowienie.response_data) {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data;
        
        console.log('DEBUG parsed response_data:', responseData);
        
        if (responseData.routeSequence && Array.isArray(responseData.routeSequence)) {
          console.log('DEBUG routeSequence count:', responseData.routeSequence.length);
          
          // Wyciągnij unikalne transporty z routeSequence
          const transportMap = new Map();
          let allOrderNumbers = [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];
          let allMpks = zamowienie.mpk ? [zamowienie.mpk] : [];
          let allDocuments = zamowienie.documents ? [zamowienie.documents] : [];
          let allClients = (zamowienie.clientName || zamowienie.client_name) ? [zamowienie.clientName || zamowienie.client_name] : [];
          
          responseData.routeSequence.forEach(point => {
            if (point.transport && point.transportId && point.transportId !== zamowienie.id) {
              const transport = {
                id: point.transportId,
                orderNumber: point.transport.orderNumber || point.transport.order_number,
                mpk: point.transport.mpk,
                documents: point.transport.documents,
                clientName: point.transport.clientName || point.transport.client_name,
                costAssigned: responseData.costBreakdown?.[point.transportId] || 0
              };
              
              transportMap.set(point.transportId, transport);
              
              // Agreguj dane
              if (transport.orderNumber) allOrderNumbers.push(transport.orderNumber);
              if (transport.mpk) allMpks.push(transport.mpk);
              if (transport.documents) allDocuments.push(transport.documents);
              if (transport.clientName) allClients.push(transport.clientName);
            }
          });
          
          console.log('DEBUG WYNIK z routeSequence:');
          console.log('  - allOrderNumbers:', allOrderNumbers);
          console.log('  - allMpks:', allMpks);
          console.log('  - allDocuments:', allDocuments);
          
          return {
            originalTransports: Array.from(transportMap.values()),
            routeSequence: responseData.routeSequence,
            totalDistance: responseData.realRouteDistance || responseData.totalDistance || 0,
            totalMergedCost: responseData.totalMergedCost || 0,
            mainTransportCost: responseData.deliveryPrice || 0,
            // Agregowane dane
            allOrderNumbers: [...new Set(allOrderNumbers)],
            allMpks: [...new Set(allMpks.filter(mpk => mpk && mpk !== ''))],
            allDocuments: [...new Set(allDocuments.filter(doc => doc && doc !== '' && doc !== 'undefined'))],
            allClients: [...new Set(allClients.filter(client => client && client !== ''))],
            totalPrice: (parseFloat(responseData.deliveryPrice || 0) + parseFloat(responseData.totalMergedCost || 0)).toFixed(2)
          };
        }
      }
      
      console.log('DEBUG - nie znaleziono prawidłowych danych');
      return null;
    } catch (error) {
      console.error('Błąd parsowania danych połączonych transportów:', error)
      return null
    }
  }
  
  // Pobierz dane o połączonych transportach
  const mergedData = isMergedTransport ? getMergedData() : null
  
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
  }, [isMergedTransport]); // Zależność tylko od stanu połączenia
  
// POPRAWIONA FUNKCJA agregująca dane ze wszystkich połączonych transportów
  const getAggregatedMergedData = () => {
    if (!isMergedTransport || !mergedData) return null;
    
    try {
      console.log('🔍 DEBUG getAggregatedMergedData - mergedData:', mergedData);
      
      // Użyj danych z mergedData
      const baseData = mergedData;
      
      // Dane głównego transportu - ZAWSZE dodaj jako pierwsze
      let allOrderNumbers = [zamowienie.orderNumber || zamowienie.order_number || zamowienie.id];
      let allMpks = zamowienie.mpk ? [zamowienie.mpk] : [];
      let allDocuments = zamowienie.documents ? [zamowienie.documents] : [];
      let allClients = (zamowienie.clientName || zamowienie.client_name) ? [zamowienie.clientName || zamowienie.client_name] : [];
      let allCargoDescriptions = [];
      let totalWeight = 0;
      let totalPrice = 0;
      
      console.log('🔍 Główny transport - orderNumber:', zamowienie.orderNumber || zamowienie.order_number || zamowienie.id);
      console.log('🔍 Główny transport - mpk:', zamowienie.mpk);
      console.log('🔍 Główny transport - documents:', zamowienie.documents);
      
      // Dodaj dane z głównego transportu
      if (zamowienie.goodsDescription?.description) {
        allCargoDescriptions.push(zamowienie.goodsDescription.description);
      }
      if (zamowienie.goodsDescription?.weight) {
        totalWeight += parseFloat(zamowienie.goodsDescription.weight) || 0;
      }
      
      // Cena głównego transportu
      if (baseData.mainTransportCost) {
        totalPrice += parseFloat(baseData.mainTransportCost);
      } else if (zamowienie.response?.deliveryPrice) {
        totalPrice += parseFloat(zamowienie.response.deliveryPrice);
      }
      
      // Agreguj dane z połączonych transportów z mergedData.originalTransports
      if (baseData.originalTransports && Array.isArray(baseData.originalTransports)) {
        console.log('🔍 Połączone transporty count:', baseData.originalTransports.length);
        
        baseData.originalTransports.forEach((transport, index) => {
          console.log(`🔍 Transport ${index + 1}:`, {
            id: transport.id,
            orderNumber: transport.orderNumber,
            mpk: transport.mpk,
            documents: transport.documents,
            clientName: transport.clientName
          });
          
          if (transport.orderNumber) allOrderNumbers.push(transport.orderNumber);
          if (transport.mpk) allMpks.push(transport.mpk);  // BEZ FILTROWANIA - wszystkie MPK
          if (transport.documents) allDocuments.push(transport.documents);
          if (transport.clientName) allClients.push(transport.clientName);
          
          // Pobierz dane o towarze jeśli są dostępne
          if (transport.goodsDescription) {
            allCargoDescriptions.push(transport.goodsDescription);
          }
          if (transport.weight) {
            totalWeight += parseFloat(transport.weight) || 0;
          }
          
          // Dodaj koszt przypisany do tego transportu
          if (transport.costAssigned) {
            totalPrice += parseFloat(transport.costAssigned);
          }
        });
      }
      
      // Jeśli mamy totalMergedCost, użyj go zamiast sumowania
      if (baseData.totalMergedCost && baseData.mainTransportCost) {
        totalPrice = parseFloat(baseData.totalMergedCost) + parseFloat(baseData.mainTransportCost);
      }
      
      console.log('🔍 WYNIK agregacji:');
      console.log('  - allOrderNumbers:', allOrderNumbers);
      console.log('  - allMpks:', allMpks);
      console.log('  - allDocuments:', allDocuments);
      console.log('  - totalPrice:', totalPrice);
      
      return {
        ...baseData,
        allOrderNumbers: [...new Set(allOrderNumbers)], // usuń duplikaty ale zachowaj wszystkie
        allMpks: [...new Set(allMpks.filter(mpk => mpk && mpk !== ''))], // usuń tylko puste, zostaw 000-000-000
        allDocuments: [...new Set(allDocuments.filter(doc => doc && doc !== '' && doc !== 'undefined'))],
        allClients: [...new Set(allClients.filter(client => client && client !== ''))],
        cargoDescription: allCargoDescriptions.filter(desc => desc).join(', ') || baseData.cargoDescription || '',
        totalWeight: totalWeight > 0 ? totalWeight : (baseData.totalWeight || 0),
        totalPrice: totalPrice > 0 ? totalPrice.toFixed(2) : '0.00',
        originalTransports: baseData.originalTransports || []
      };
    } catch (error) {
      console.error('❌ Błąd agregacji danych połączonych transportów:', error);
      return null;
    }
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
        
        // 1. Sprawdź realRouteDistance
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
        
        // Punkty trasy przygotowane
        
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
        }
      } catch (error) {
        console.error('Błąd obliczania odległości na podstawie transportów:', error);
      }
    }
    
    // Ostateczny fallback
    return zamowienie.distanceKm || 0;
  };
  
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
  }, [isMergedTransport, mergedTransportsDetails.length]); // Uproszczone dependencies
  
  // Automatyczne wypełnienie danych dla połączonych transportów
  useEffect(() => {
    if (isMergedTransport && mergedData) {
      const aggregated = getAggregatedMergedData();
      if (aggregated) {
        setFormData(prev => ({
          ...prev,
          towar: aggregated.cargoDescription || prev.towar,
          waga: aggregated.totalWeight ? aggregated.totalWeight.toString() : prev.waga
        }))
      }
    }
  }, [isMergedTransport, mergedTransportsDetails.length]) // Uproszczone dependencies
  
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
      
      {/* Informacje o zleceniu */}
      <div className="mt-6 bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium mb-3 flex items-center">
          <FileText size={18} className="mr-2 text-blue-600" />
          Podsumowanie zlecenia
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-medium">Numery zleceń:</span> {
              isMergedTransport && aggregatedMergedData?.allOrderNumbers 
                ? aggregatedMergedData.allOrderNumbers.join(', ')
                : (zamowienie.orderNumber || zamowienie.id)
            }</p>
            <p><span className="font-medium">MPK:</span> {
              isMergedTransport && aggregatedMergedData?.allMpks 
                ? aggregatedMergedData.allMpks.filter(mpk => mpk).join(', ')
                : zamowienie.mpk
            }</p>
            <p><span className="font-medium">Dokumenty:</span> {
              isMergedTransport && aggregatedMergedData?.allDocuments 
                ? aggregatedMergedData.allDocuments.filter(doc => doc).join(', ')
                : zamowienie.documents
            }</p>
            {(zamowienie.clientName || (isMergedTransport && aggregatedMergedData?.allClients?.length > 0)) && (
              <p><span className="font-medium">Klienci:</span> {
                isMergedTransport && aggregatedMergedData?.allClients 
                  ? aggregatedMergedData.allClients.filter(client => client).join(', ')
                  : zamowienie.clientName
              }</p>
            )}
            {isMergedTransport && aggregatedMergedData?.cargoDescription && (
              <p><span className="font-medium">Opis ładunku:</span> {aggregatedMergedData?.cargoDescription}</p>
            )}
          </div>
          
          <div>
            {!isMergedTransport && (
              <p><span className="font-medium">Trasa:</span> {getTransportRoute(zamowienie)}</p>
            )}
            {isMergedTransport && (
              <p><span className="font-medium">Typ zlecenia:</span> <span className="text-purple-600 font-semibold">Transport łączony</span></p>
            )}
            <p><span className="font-medium">Łączna odległość:</span> {
              (() => {
                // Używaj nowej funkcji getRouteDistanceFromData
                const distance = calculatedRouteDistance > 0 ? calculatedRouteDistance : getRouteDistanceFromData();
                return distance || 0;
              })()
            } km {isMergedTransport && (calculatedRouteDistance > 0 || getRouteDistanceFromData() > 0) && (
              <span className="text-green-600 text-xs">(rzeczywista trasa)</span>
            )}</p>
            <p><span className="font-medium">Wartość transportu:</span> {
              isMergedTransport && aggregatedMergedData?.totalPrice 
                ? aggregatedMergedData.totalPrice 
                : (zamowienie.response?.deliveryPrice || 0)
            } PLN</p>
            {isMergedTransport && (
              <p><span className="font-medium">Liczba połączonych transportów:</span> {aggregatedMergedData?.originalTransports?.length || 1}</p>
            )}
            {isMergedTransport && aggregatedMergedData?.totalWeight && (
              <p><span className="font-medium">Łączna waga:</span> {aggregatedMergedData.totalWeight} kg</p>
            )}
          </div>
        </div>
        
        {/* Szczegóły tras dla transportu połączonego */}
        {isMergedTransport && aggregatedMergedData && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="font-bold text-sm mb-2 text-gray-800">Szczegóły wszystkich tras:</h4>
            
            {mergedData?.routeSequence && mergedData.routeSequence.length > 0 ? (
              /* Wyświetl sekwencję trasy */
              <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                  <MapPin size={16} className="mr-2" />
                  Kompletna sekwencja trasy (automatycznie wygenerowana)
                </h5>
                <div className="space-y-2">
                  {mergedData.routeSequence.map((point, index) => (
                    <div key={point.id} className="flex items-start gap-3 p-2 bg-white rounded border">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {point.type === 'loading' ? '📦 Załadunek' : '🏢 Rozładunek'} - {point.city}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>{point.company}</strong>
                        </div>
                        <div className="text-xs text-gray-500">
                          {point.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Podsumowanie trasy */}
                <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Łączna odległość trasy:</span>
                    <span className="ml-2 font-medium text-blue-700">{
                      (() => {
                        const distance = calculatedRouteDistance > 0 ? calculatedRouteDistance : getRouteDistanceFromData();
                        return distance || 0;
                      })()
                    } km {(calculatedRouteDistance > 0 || getRouteDistanceFromData() > 0) && (
                      <span className="text-green-500 text-xs">(rzeczywista)</span>
                    )}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Liczba transportów:</span>
                    <span className="ml-2 font-medium text-blue-700">{aggregatedMergedData.originalTransports?.length || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Punktów w trasie:</span>
                    <span className="ml-2 font-medium text-blue-700">{mergedData.routeSequence.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Łączne koszty:</span>
                    <span className="ml-2 font-medium text-blue-700">{zamowienie.response?.deliveryPrice || 0} PLN</span>
                  </div>
                  {aggregatedMergedData.cargoDescription && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Rodzaj ładunku:</span>
                      <span className="ml-2 font-medium text-blue-700">{aggregatedMergedData.cargoDescription}</span>
                    </div>
                  )}
                  {aggregatedMergedData.totalWeight && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Łączna waga:</span>
                      <span className="ml-2 font-medium text-blue-700">{aggregatedMergedData.totalWeight} kg</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Fallback - stary sposób wyświetlania */
              <div>
                <div className="mb-2 p-2 bg-white rounded border border-purple-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">GŁÓWNA: {zamowienie.orderNumber}</span>
                      <div className="text-xs text-gray-600 mt-1">
                        Załadunek: {zamowienie.location === 'Odbiory własne' 
                          ? formatAddress(zamowienie.producerAddress) 
                          : zamowienie.location}
                      </div>
                      <div className="text-xs text-gray-600">
                        Rozładunek: {formatAddress(zamowienie.delivery)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-green-600">
                        {aggregatedMergedData.costBreakdown?.[zamowienie.id] || 0} PLN
                      </div>
                      <div className="text-xs text-gray-500">
                        MPK: {zamowienie.mpk}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Pozostałe transporty */}
                {aggregatedMergedData.originalTransports && aggregatedMergedData.originalTransports.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Transporty połączone:</strong> {aggregatedMergedData.originalTransports.map(t => t.orderNumber || t.id).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            console.log('Zamykanie formularza zlecenia transportowego');
            if (onCancel) {
              onCancel();
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Zamknij
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Truck size={16} />
          {isSubmitting ? 'Wysyłanie...' : 'Wyślij zlecenie'}
        </button>
      </div>
    </form>
  )
}
