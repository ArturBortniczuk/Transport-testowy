// src/app/spedycja/components/SpedycjaForm.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { Calendar, Search, X, Info, Truck, PlusCircle, LinkIcon, DollarSign, Copy, Route } from 'lucide-react'

export default function SpedycjaForm({ onSubmit, onCancel, initialData, isResponse, isEditing, isCopying }) {
  const [selectedLocation, setSelectedLocation] = useState(initialData?.location || '')
  const [users, setUsers] = useState([])
  const [constructions, setConstructions] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedConstructions, setSelectedConstructions] = useState([])
  const [totalPrice, setTotalPrice] = useState(initialData?.response?.deliveryPrice || 0)
  const [currentUser, setCurrentUser] = useState({
    email: '',
    name: ''
  })
  const [distance, setDistance] = useState(initialData?.distanceKm || 0)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)
  
  // Nowe stany dla autokompletacji
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  // Nowe stany dla daty dostawy
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState('')
  const [newDeliveryDate, setNewDeliveryDate] = useState('')
  const [changeDeliveryDate, setChangeDeliveryDate] = useState(false)
  
  // Nowe stany dla opisu towaru
  const [showGoodsDescription, setShowGoodsDescription] = useState(false)
  const [goodsDescription, setGoodsDescription] = useState({
    description: initialData?.goodsDescription?.description || '',
    weight: initialData?.goodsDescription?.weight || ''
  })
  
  // STANY DLA ZAAWANSOWANEGO SYSTEMU ŁĄCZENIA TRANSPORTÓW
  const [transportsToMerge, setTransportsToMerge] = useState([])
  const [costDistribution, setCostDistribution] = useState({})
  const [availableTransports, setAvailableTransports] = useState([])
  const [showMergeSection, setShowMergeSection] = useState(false)
  const [routeConfiguration, setRouteConfiguration] = useState({})
  const [routeOrder, setRouteOrder] = useState([])
  const [calculatedRouteDistance, setCalculatedRouteDistance] = useState(0)
  
  // Stałe dla magazynów
  const MAGAZYNY = {
    bialystok: { 
      lat: 53.1325, 
      lng: 23.1688, 
      nazwa: 'Magazyn Białystok',
      adres: {
        firma: 'Grupa Eltron Sp. z o.o.',
        ulica: 'ul. Wysockiego 69B',
        kod: '15-169',
        miasto: 'Białystok'
      },
      kolor: '#0000FF'
    },
    zielonka: { 
      lat: 52.3125, 
      lng: 21.1390, 
      nazwa: 'Magazyn Zielonka',
      adres: {
        firma: 'Grupa Eltron Sp. z o.o.',
        ulica: 'ul. Krótka 2',
        kod: '05-220',
        miasto: 'Zielonka'
      },
      kolor: '#FF0000'
    }
  };

  // Funkcja pomocnicza do formatowania trasy
  const getTransportRoute = (transport) => {
    const start = transport.location === 'Odbiory własne' && transport.producerAddress 
      ? transport.producerAddress.city 
      : transport.location.replace('Magazyn ', '')
    
    const end = transport.delivery?.city || 'Brak danych'
    
    return `${start} → ${end}`
  }

  // FUNKCJE DLA ZAAWANSOWANEGO ŁĄCZENIA TRANSPORTÓW

  // 1. POPRAWKA domyślnej konfiguracji - oba checkboxy domyślnie zaznaczone
  const handleAddTransportToMerge = (transportId) => {
    const transport = availableTransports.find(t => t.id === parseInt(transportId));
    if (transport && !transportsToMerge.find(t => t.id === transport.id)) {
      
      // POPRAWIONA konfiguracja - oba checkboxy domyślnie TRUE
      const defaultConfig = {
        useLoading: true,     // załadunek domyślnie TAK
        useUnloading: true,   // POPRAWKA: rozładunek też domyślnie TAK
        loadingOrder: transportsToMerge.length + 2, // kolejny załadunek po głównym
        unloadingOrder: transportsToMerge.length + 2 // POPRAWKA: kolejny rozładunek
      };
      
      const newTransport = {
        ...transport,
        ...defaultConfig
      };
      
      setTransportsToMerge([...transportsToMerge, newTransport]);
      
      // Ustaw domyślną konfigurację trasy
      setRouteConfiguration({
        ...routeConfiguration,
        [transport.id]: defaultConfig
      });
    }
  };

  // Usuwanie transportu z połączenia
  const handleRemoveTransportFromMerge = (transportId) => {
    setTransportsToMerge(transportsToMerge.filter(t => t.id !== transportId));
    const newCostDistribution = { ...costDistribution };
    delete newCostDistribution[transportId];
    setCostDistribution(newCostDistribution);
    
    // Usuń też konfigurację trasy
    const newRouteConfiguration = { ...routeConfiguration };
    delete newRouteConfiguration[transportId];
    setRouteConfiguration(newRouteConfiguration);
  };

  // Aktualizacja konfiguracji trasy
  const handleRouteConfigurationChange = (transportId, field, value) => {
    setRouteConfiguration({
      ...routeConfiguration,
      [transportId]: {
        ...routeConfiguration[transportId],
        [field]: value
      }
    });
    
    // Aktualizuj też transport w liście
    setTransportsToMerge(transportsToMerge.map(t => 
      t.id === transportId 
        ? { ...t, [field]: value }
        : t
    ));
  };

  // Zmiana podziału kosztów
  const handleCostDistributionChange = (transportId, cost) => {
    setCostDistribution({
      ...costDistribution,
      [transportId]: cost
    });
  };

  // FUNKCJE POMOCNICZE dla konfiguracji trasy
  const getLocationCoords = (transport) => {
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      return transport.producerAddress;
    } else if (transport.location === 'Magazyn Białystok') {
      return { city: 'Białystok', lat: 53.1325, lng: 23.1688 };
    } else if (transport.location === 'Magazyn Zielonka') {
      return { city: 'Zielonka', lat: 52.3125, lng: 21.1390 };
    }
    return null;
  };

  const getDeliveryCoords = (transport) => {
    return transport.delivery;
  };

  // PRAWDZIWE OBLICZANIE ODLEGŁOŚCI Z GOOGLE MAPS API
  const calculateRealRouteDistance = async (routePoints) => {
    if (routePoints.length < 2) return 0;
    
    try {
      setIsCalculatingDistance(true);
      
      // Przygotuj waypoints dla Google Maps
      const origin = await getGoogleCoordinatesFromPoint(routePoints[0]);
      const destination = await getGoogleCoordinatesFromPoint(routePoints[routePoints.length - 1]);
      
      const waypoints = [];
      
      // Dodaj środkowe punkty jako waypoints
      for (let i = 1; i < routePoints.length - 1; i++) {
        const waypointCoords = await getGoogleCoordinatesFromPoint(routePoints[i]);
        if (waypointCoords) {
          waypoints.push(`${waypointCoords.lat},${waypointCoords.lng}`);
        }
      }
      
      if (!origin || !destination) {
        throw new Error('Nie można uzyskać współrzędnych punktów trasy');
      }
      
      // Wywołanie Google Maps Distance Matrix API z waypoints
      const waypointsParam = waypoints.length > 0 ? waypoints.join('|') : '';
      
      let totalDistance = 0;
      
      if (waypoints.length === 0) {
        // Prosta trasa bez waypoints
        const distance = await calculateDistanceSegment(
          `${origin.lat},${origin.lng}`, 
          `${destination.lat},${destination.lng}`
        );
        totalDistance = distance;
      } else {
        // Trasa z waypoints - oblicz segment po segmencie
        let currentPoint = `${origin.lat},${origin.lng}`;
        
        // Origin do pierwszego waypoint
        for (const waypoint of waypoints) {
          const segmentDistance = await calculateDistanceSegment(currentPoint, waypoint);
          totalDistance += segmentDistance;
          currentPoint = waypoint;
        }
        
        // Ostatni waypoint do destination
        const finalDistance = await calculateDistanceSegment(
          currentPoint, 
          `${destination.lat},${destination.lng}`
        );
        totalDistance += finalDistance;
      }
      
      console.log(`Rzeczywista odległość trasy (Google Maps): ${totalDistance} km`);
      setCalculatedRouteDistance(totalDistance);
      return totalDistance;
      
    } catch (error) {
      console.error('Błąd obliczania rzeczywistej odległości:', error);
      return 0;
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Obliczanie odległości między dwoma punktami przez Google Maps
  const calculateDistanceSegment = async (origin, destination) => {
    try {
      const url = `/api/distance?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Żądanie API nie powiodło się ze statusem: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && 
          data.rows && 
          data.rows[0] && 
          data.rows[0].elements && 
          data.rows[0].elements[0] && 
          data.rows[0].elements[0].status === 'OK') {
        
        const distanceKm = Math.round(data.rows[0].elements[0].distance.value / 1000);
        return distanceKm;
      }
      
      throw new Error('Nieprawidłowa odpowiedź API');
    } catch (error) {
      console.error('Błąd obliczania segmentu odległości:', error);
      return 0;
    }
  };

  // Pobieranie współrzędnych z punktu trasy
  const getGoogleCoordinatesFromPoint = async (routePoint) => {
    try {
      if (routePoint.location && routePoint.location.lat && routePoint.location.lng) {
        return {
          lat: routePoint.location.lat,
          lng: routePoint.location.lng
        };
      }
      
      // Jeśli nie ma współrzędnych, spróbuj geokodować
      let address = '';
      
      if (routePoint.address === 'Magazyn Białystok') {
        return { lat: 53.1325, lng: 23.1688 };
      } else if (routePoint.address === 'Magazyn Zielonka') {
        return { lat: 52.3125, lng: 21.1390 };
      } else if (routePoint.location && routePoint.location.city) {
        address = `${routePoint.location.city}, ${routePoint.location.postalCode || ''}, ${routePoint.location.street || ''}`;
      } else {
        address = routePoint.description.replace('Załadunek: ', '').replace('Rozładunek: ', '');
      }
      
      return await getGoogleCoordinates(address);
      
    } catch (error) {
      console.error('Błąd pobierania współrzędnych punktu:', error);
      return null;
    }
  };

  // Obliczanie rzeczywistej trasy z konfiguracji
  const calculateMergedRoute = () => {
    if (transportsToMerge.length === 0) return { distance: distance, points: [] };
    
    const allPoints = [];
    
    // Dodaj główny transport - zawsze pierwszy załadunek
    const mainLoading = {
      type: 'loading',
      transportId: 'main',
      order: 1,
      location: getLocationCoords(initialData || { location: selectedLocation, producerAddress: null }),
      description: `Załadunek główny: ${selectedLocation}`,
      address: selectedLocation
    };
    
    allPoints.push(mainLoading);
    
    // Dodaj punkty z dołączanych transportów według konfiguracji
    transportsToMerge.forEach(transport => {
      const config = routeConfiguration[transport.id] || {};
      
      if (config.useLoading) {
        allPoints.push({
          type: 'loading',
          transportId: transport.id,
          order: config.loadingOrder || 999,
          location: getLocationCoords(transport),
          description: `Załadunek: ${transport.location}`,
          address: transport.location
        });
      }
      
      if (config.useUnloading) {
        allPoints.push({
          type: 'unloading',
          transportId: transport.id,
          order: config.unloadingOrder || 999,
          location: getDeliveryCoords(transport),
          description: `Rozładunek: ${transport.delivery?.city || 'Nie podano'}`,
          address: transport.delivery ? 
            `${transport.delivery.city}, ${transport.delivery.postalCode}, ${transport.delivery.street}` :
            'Brak adresu'
        });
      }
    });
    
    // Główny rozładunek - zawsze ostatni
    const mainUnloading = {
      type: 'unloading',
      transportId: 'main',
      order: 1000, // zawsze na końcu
      location: null, // będzie uzupełnione z formularza
      description: 'Rozładunek główny',
      address: 'Adres dostawy głównej'
    };
    
    allPoints.push(mainUnloading);
    
    // Sortuj punkty według kolejności
    const sortedPoints = allPoints.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      // Przy tej samej kolejności, załadunek przed rozładunkiem
      if (a.type === 'loading' && b.type === 'unloading') return -1;
      if (a.type === 'unloading' && b.type === 'loading') return 1;
      return 0;
    });
    
    return { 
      points: sortedPoints, 
      estimatedDistance: calculatedRouteDistance || 0
    };
  };

  // Generowanie linku do Google Maps z sekwencyjną trasą
  const generateGoogleMapsLinkForMerged = () => {
    const routeInfo = calculateMergedRoute();
    
    if (routeInfo.points.length < 2) return '';
    
    const waypoints = [];
    let origin = '';
    let destination = '';
    
    // Pierwszy punkt to origin
    const firstPoint = routeInfo.points[0];
    if (firstPoint.address === 'Magazyn Białystok') {
      origin = 'Białystok';
    } else if (firstPoint.address === 'Magazyn Zielonka') {
      origin = 'Zielonka';
    } else if (firstPoint.location && firstPoint.location.city) {
      origin = `${firstPoint.location.city}, ${firstPoint.location.postalCode || ''}, ${firstPoint.location.street || ''}`;
    }
    
    // Środkowe punkty to waypoints
    for (let i = 1; i < routeInfo.points.length - 1; i++) {
      const point = routeInfo.points[i];
      let waypointAddress = '';
      
      if (point.address === 'Magazyn Białystok') {
        waypointAddress = 'Białystok';
      } else if (point.address === 'Magazyn Zielonka') {
        waypointAddress = 'Zielonka';
      } else if (point.location && point.location.city) {
        waypointAddress = `${point.location.city}, ${point.location.postalCode || ''}, ${point.location.street || ''}`;
      }
      
      if (waypointAddress) {
        waypoints.push(waypointAddress);
      }
    }
    
    // Destination z formularza
    const deliveryCity = document.querySelector('input[name="deliveryCity"]')?.value || '';
    const deliveryPostalCode = document.querySelector('input[name="deliveryPostalCode"]')?.value || '';
    const deliveryStreet = document.querySelector('input[name="deliveryStreet"]')?.value || '';
    
    if (deliveryCity && deliveryPostalCode) {
      destination = `${deliveryCity}, ${deliveryPostalCode}, ${deliveryStreet}`;
    }
    
    if (!origin || !destination) return '';
    
    // Buduj URL
    const waypointsParam = waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
    
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;
  };

  // Oblicz pozostałą kwotę dla głównego transportu
  const getMainTransportCost = () => {
    const distributedCosts = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
    return Math.max(0, totalPrice - distributedCosts);
  };

  // Klasy dla przycisków
  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2",
    selected: "px-4 py-2 bg-blue-500 text-white rounded-md",
    unselected: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50",
    toggle: "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors",
    toggleActive: "px-4 py-2 bg-blue-100 border border-blue-400 text-blue-700 rounded-md font-medium"
  }
  
  // Funkcja do geokodowania adresu
  async function getGoogleCoordinates(addressString) {
    try {
      const query = encodeURIComponent(addressString + ', Poland');
      
      // Użyj Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }
      
      throw new Error('Nie znaleziono lokalizacji');
    } catch (error) {
      console.error('Błąd geokodowania Google:', error);
      throw error;
    }
  }
  
  // Funkcja do obliczania odległości
  async function calculateDistance(originLat, originLng, destinationLat, destinationLng) {
    try {
      // Używamy własnego endpointu proxy zamiast bezpośredniego wywołania API Google
      const url = `/api/distance?origins=${originLat},${originLng}&destinations=${destinationLat},${destinationLng}`;
      
      console.log('Wywołuję endpoint proxy:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Żądanie API nie powiodło się ze statusem: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Odpowiedź API:', data);
      
      if (data.status === 'OK' && 
          data.rows && 
          data.rows[0] && 
          data.rows[0].elements && 
          data.rows[0].elements[0] && 
          data.rows[0].elements[0].status === 'OK') {
        
        const distance = Math.round(data.rows[0].elements[0].distance.value / 1000);
        console.log(`Rzeczywista odległość drogowa: ${distance} km`);
        return distance;
      }
      
      throw new Error('Nieprawidłowa odpowiedź API');
    } catch (error) {
      console.error('Błąd obliczania odległości:', error);
      
      // Obliczanie dystansu w linii prostej z korektą
      const straightLineDistance = calculateStraightLineDistance(
        originLat, originLng, destinationLat, destinationLng
      );
      
      // Dodaj 30% do odległości w linii prostej aby przybliżyć odległość drogową
      return Math.round(straightLineDistance * 1.3);
    }
  }
  
  // Pomocnicza funkcja do obliczania odległości w linii prostej
  function calculateStraightLineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Promień Ziemi w km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Odległość w km
  }
  
  // Funkcja do obliczania odległości trasy
  const calculateRouteDistance = async (fromLocation, toLocation) => {
    try {
      setIsCalculatingDistance(true);
      let originLat, originLng, destLat, destLng;
      
      // Ustal współrzędne punktu początkowego
      if (fromLocation === 'Odbiory własne') {
        const producerCity = document.querySelector('input[name="producerCity"]').value;
        const producerPostalCode = document.querySelector('input[name="producerPostalCode"]').value;
        const producerStreet = document.querySelector('input[name="producerStreet"]').value;
        
        if (!producerCity || !producerPostalCode) {
          alert('Wprowadź dane adresowe punktu odbioru');
          setIsCalculatingDistance(false);
          return 0;
        }
        
        const originCoords = await getGoogleCoordinates(`${producerCity}, ${producerPostalCode}, ${producerStreet}`);
        originLat = originCoords.lat;
        originLng = originCoords.lng;
      } else {
        // Użyj współrzędnych magazynu
        const warehouseKey = fromLocation === 'Magazyn Białystok' ? 'bialystok' : 'zielonka';
        originLat = MAGAZYNY[warehouseKey].lat;
        originLng = MAGAZYNY[warehouseKey].lng;
      }
      
      // Ustal współrzędne punktu docelowego
      const destCity = document.querySelector('input[name="deliveryCity"]').value;
      const destPostalCode = document.querySelector('input[name="deliveryPostalCode"]').value;
      const destStreet = document.querySelector('input[name="deliveryStreet"]').value;
      
      if (!destCity || !destPostalCode) {
        alert('Wprowadź dane adresowe dostawy');
        setIsCalculatingDistance(false);
        return 0;
      }
      
      const destCoords = await getGoogleCoordinates(`${destCity}, ${destPostalCode}, ${destStreet}`);
      destLat = destCoords.lat;
      destLng = destCoords.lng;
      
      // Oblicz odległość między punktami
      const distanceKm = await calculateDistance(originLat, originLng, destLat, destLng);
      setDistance(distanceKm);
      setIsCalculatingDistance(false);
      return distanceKm;
    } catch (error) {
      console.error('Błąd obliczania odległości:', error);
      setIsCalculatingDistance(false);
      return 0;
    }
  };
  
  // Formatowanie daty do wyświetlania
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };
  
  // Handle user search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };
  
  // Funkcja obsługująca zmianę w opisie towaru
  const handleGoodsDescriptionChange = (e) => {
    const { name, value } = e.target;
    setGoodsDescription(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Pobierz listę użytkowników, budów i dane bieżącego użytkownika
  useEffect(() => {
    // Pobierz dane bieżącego użytkownika
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setCurrentUser({
            email: data.user.email || '',
            name: data.user.name || '',
            mpk: data.user.mpk || ''
          });
          
          // Pre-select the current user
          if (!isEditing && !initialData) {
            setSelectedUser({
              email: data.user.email,
              name: data.user.name,
              mpk: data.user.mpk || ''
            });
          }
        }
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
      }
    };

    // Pobierz listę wszystkich użytkowników
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/list');
        const data = await response.json();
        
        // Map the data to a consistent format
        const formattedUsers = data.map(user => ({
          email: user.email,
          name: user.name,
          mpk: user.mpk || '',
          type: 'user'
        }));
        
        setUsers(formattedUsers);
      } catch (error) {
        console.error('Błąd pobierania listy użytkowników:', error);
      }
    };
    
    // Pobierz listę budów
    const fetchConstructions = async () => {
      try {
        const response = await fetch('/api/constructions');
        const data = await response.json();
        
        if (data.constructions) {
          const formattedConstructions = data.constructions.map(construction => ({
            id: construction.id,
            name: construction.name,
            mpk: construction.mpk || '',
            type: 'construction'
          }));
          
          setConstructions(formattedConstructions);
        }
      } catch (error) {
        console.error('Błąd pobierania listy budów:', error);
      }
    };
    
    // Pobierz dostępne transporty do łączenia (dla isResponse)
    const fetchAvailableTransports = async () => {
      if (!isResponse) return;
      
      try {
        const response = await fetch('/api/spedycje?status=new');
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.spedycje) {
            // Filtruj, żeby nie pokazywać bieżącego transportu i już połączonych
            const filteredTransports = data.spedycje.filter(t => 
              t.id !== (initialData?.id || 0) && 
              t.status === 'new' &&
              !t.merged_transports && // nie pokazuj już połączonych
              (!t.response || Object.keys(t.response).length === 0) // nie pokazuj z odpowiedziami
            );
            setAvailableTransports(filteredTransports);
          }
        }
      } catch (error) {
        console.error('Błąd pobierania dostępnych transportów:', error);
      }
    };

    fetchCurrentUser();
    fetchUsers();
    fetchConstructions();
    fetchAvailableTransports();
  }, [isEditing, initialData, isResponse]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Ustawianie początkowych danych formularza
  useEffect(() => {
    if (initialData) {
      setSelectedLocation(initialData.location || '');
      setDistance(initialData.distanceKm || 0);
      
      // Ustaw cenę całkowitą
      if (initialData.response?.deliveryPrice) {
        setTotalPrice(initialData.response.deliveryPrice);
      }
      
      // Ustaw opis towaru, jeśli istnieje
      if (initialData.goodsDescription) {
        setGoodsDescription({
          description: initialData.goodsDescription.description || '',
          weight: initialData.goodsDescription.weight || ''
        });
        setShowGoodsDescription(true);
      }
      
      if (isResponse) {
        // Dla formularza odpowiedzi
        if (initialData.deliveryDate) {
          setOriginalDeliveryDate(initialData.deliveryDate);
          setNewDeliveryDate(initialData.deliveryDate);
        }
      } else if (isEditing) {
        // Dla trybu edycji
        if (initialData.responsibleEmail) {
          const responsibleUser = users.find(u => u.email === initialData.responsibleEmail);
          if (responsibleUser) {
            setSelectedUser(responsibleUser);
            setSearchTerm(responsibleUser.name);
          }
        }
        
        // Ustaw budowy, jeśli są powiązane
        if (initialData.responsibleConstructions && initialData.responsibleConstructions.length > 0) {
          setSelectedConstructions(initialData.responsibleConstructions);
        }
      }
    }
  }, [initialData, isResponse, isEditing, users, constructions]);
  
  // Filter users and constructions based on search term
  const filteredItems = [...users, ...constructions].filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.mpk && item.mpk.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle user or construction selection from dropdown
  const handleSelectItem = (item) => {
    if (item.type === 'user') {
      setSelectedUser(item);
      setSelectedConstructions([]);
    } else if (item.type === 'construction') {
      setSelectedConstructions([item]);
      setSelectedUser(null);
    }
    setSearchTerm(item.name);
    setIsDropdownOpen(false);
  };
  
  // Add a construction to selection
  const handleAddConstruction = (construction) => {
    // Sprawdź czy budowa nie jest już wybrana
    if (selectedConstructions.some(c => c.id === construction.id)) {
      return;
    }
    
    setSelectedConstructions(prev => [...prev, construction]);
    setSelectedUser(null);
  };
  
  // Remove a construction from selection
  const handleRemoveConstruction = (constructionId) => {
    setSelectedConstructions(prev => prev.filter(c => c.id !== constructionId));
  };

  // FUNKCJA OBLICZANIA RZECZYWISTEJ TRASY DLA POŁĄCZONYCH TRANSPORTÓW
  const handleCalculateMergedRouteDistance = async () => {
    if (transportsToMerge.length === 0) {
      alert('Dodaj transporty do połączenia, aby obliczyć trasę');
      return;
    }

    const routeInfo = calculateMergedRoute();
    
    if (routeInfo.points.length < 2) {
      alert('Nie można obliczyć trasy - brak wystarczających punktów');
      return;
    }

    try {
      // Uzupełnij główny rozładunek z formularza
      const lastPoint = routeInfo.points[routeInfo.points.length - 1];
      const deliveryCity = document.querySelector('input[name="deliveryCity"]')?.value;
      const deliveryPostalCode = document.querySelector('input[name="deliveryPostalCode"]')?.value;
      const deliveryStreet = document.querySelector('input[name="deliveryStreet"]')?.value;
      
      if (!deliveryCity || !deliveryPostalCode) {
        alert('Wypełnij adres dostawy, aby obliczyć trasę');
        return;
      }
      
      lastPoint.location = {
        city: deliveryCity,
        postalCode: deliveryPostalCode,
        street: deliveryStreet
      };
      lastPoint.address = `${deliveryCity}, ${deliveryPostalCode}, ${deliveryStreet}`;
      
      const realDistance = await calculateRealRouteDistance(routeInfo.points);
      console.log('Obliczona rzeczywista odległość trasy:', realDistance);
      
    } catch (error) {
      console.error('Błąd obliczania trasy:', error);
      alert('Wystąpił błąd podczas obliczania trasy');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Na początku funkcji handleSubmit, dodaj:
    if (isCopying) {
      // Tryb kopiowania - traktuj jak nowe zamówienie
      if (!selectedUser && selectedConstructions.length === 0) {
        alert('Wybierz osobę lub budowę odpowiedzialną za zlecenie');
        return;
      }
      
      // Oblicz odległość dla skopiowanego zamówienia
      let routeDistance = distance;
      if (routeDistance === 0) {
        try {
          routeDistance = await calculateRouteDistance(selectedLocation, 'destination');
          console.log('Obliczona odległość dla kopii:', routeDistance);
        } catch (error) {
          console.error('Błąd obliczania odległości:', error);
        }
      }
      
      const data = {
        location: selectedLocation,
        documents: formData.get('documents'),
        clientName: formData.get('clientName') || '',
        producerAddress: selectedLocation === 'Odbiory własne' ? {
          city: formData.get('producerCity'),
          postalCode: formData.get('producerPostalCode'),
          street: formData.get('producerStreet'),
          pinLocation: formData.get('producerPinLocation')
        } : null,
        delivery: {
          city: formData.get('deliveryCity'),
          postalCode: formData.get('deliveryPostalCode'),
          street: formData.get('deliveryStreet'),
          pinLocation: formData.get('deliveryPinLocation')
        },
        loadingContact: formData.get('loadingContact'),
        unloadingContact: formData.get('unloadingContact'),
        deliveryDate: formData.get('deliveryDate'),
        distanceKm: routeDistance,
        notes: formData.get('notes'),
        createdBy: currentUser.name,
        createdByEmail: currentUser.email,
        responsiblePerson: selectedUser ? selectedUser.name : null,
        responsibleEmail: selectedUser ? selectedUser.email : null,
        mpk: selectedUser ? selectedUser.mpk || '' : '',
        responsibleConstructions: selectedConstructions.length > 0 ? selectedConstructions : null,
        goodsDescription: showGoodsDescription ? goodsDescription : null
      };
      
      console.log('Zapisywanie skopiowanego zamówienia:', data);
      onSubmit(data);
      onCancel();
      return;
    }

    if (isResponse) {
      console.log('Odpowiedź na zamówienie, dane początkowe:', initialData);
      // Wykorzystaj odległość z oryginalnego zamówienia lub obliczoną dla połączonych
      const distanceKm = calculatedRouteDistance > 0 ? calculatedRouteDistance : (initialData.distanceKm || 0);
      console.log('Odległość używana do obliczeń:', distanceKm);
                     
      const totalDeliveryPrice = Number(totalPrice);
      const pricePerKm = distanceKm > 0 ? (totalDeliveryPrice / distanceKm).toFixed(2) : 0;
      
      console.log('Obliczenia:', {
        totalDeliveryPrice,
        distanceKm,
        pricePerKm
      });
      
      // Przygotuj dane odpowiedzi
      const responseData = {
        driverName: formData.get('driverName'),
        driverSurname: formData.get('driverSurname'),
        driverPhone: formData.get('driverPhone'),
        vehicleNumber: formData.get('vehicleNumber'),
        deliveryPrice: totalDeliveryPrice,
        distanceKm: Number(distanceKm),
        pricePerKm: Number(pricePerKm),
        adminNotes: formData.get('adminNotes')
      };
      
      // Jeśli data dostawy została zmieniona, dodaj ją do odpowiedzi
      if (changeDeliveryDate && newDeliveryDate !== originalDeliveryDate) {
        responseData.newDeliveryDate = newDeliveryDate;
        responseData.originalDeliveryDate = originalDeliveryDate;
        responseData.dateChanged = true;
      }
      
      // Dodaj dane o transportach do połączenia z konfiguracją trasy
      if (transportsToMerge.length > 0) {
        responseData.transportsToMerge = transportsToMerge;
        responseData.costDistribution = costDistribution;
        responseData.routeConfiguration = routeConfiguration;
        
        // Oblicz rzeczywistą odległość z konfiguracji trasy
        const routeInfo = calculateMergedRoute();
        
        // Uzupełnij główny rozładunek z formularza
        const lastPoint = routeInfo.points[routeInfo.points.length - 1];
        const deliveryCity = formData.get('deliveryCity');
        const deliveryPostalCode = formData.get('deliveryPostalCode');
        const deliveryStreet = formData.get('deliveryStreet');
        
        lastPoint.location = {
          city: deliveryCity,
          postalCode: deliveryPostalCode,
          street: deliveryStreet
        };
        lastPoint.address = `${deliveryCity}, ${deliveryPostalCode}, ${deliveryStreet}`;
        
        responseData.routePoints = routeInfo.points;
        responseData.realRouteDistance = calculatedRouteDistance || 0;
      }
      
      onSubmit(initialData.id, responseData);
    } else if (isEditing) {
      // Formularz edycji
      if (!selectedUser && selectedConstructions.length === 0) {
        alert('Wybierz osobę lub budowę odpowiedzialną za zlecenie');
        return;
      }
      
      console.log('Edycja zamówienia, dane początkowe:', initialData);
      
      // Oblicz odległość, jeśli jeszcze nie obliczona
      let routeDistance = distance;
      if (routeDistance === 0) {
        try {
          routeDistance = await calculateRouteDistance(selectedLocation, 'destination');
          console.log('Obliczona odległość:', routeDistance);
        } catch (error) {
          console.error('Błąd obliczania odległości:', error);
        }
      }
      
      const editedData = {
        location: selectedLocation,
        documents: formData.get('documents'),
        clientName: formData.get('clientName') || '',
        producerAddress: selectedLocation === 'Odbiory własne' ? {
          city: formData.get('producerCity'),
          postalCode: formData.get('producerPostalCode'),
          street: formData.get('producerStreet'),
          pinLocation: formData.get('producerPinLocation')
        } : null,
        delivery: {
          city: formData.get('deliveryCity'),
          postalCode: formData.get('deliveryPostalCode'),
          street: formData.get('deliveryStreet'),
          pinLocation: formData.get('deliveryPinLocation')
        },
        loadingContact: formData.get('loadingContact'),
        unloadingContact: formData.get('unloadingContact'),
        deliveryDate: formData.get('deliveryDate'),
        distanceKm: routeDistance,
        notes: formData.get('notes'),
        // Aktualizacja informacji o osobie odpowiedzialnej
        responsiblePerson: selectedUser ? selectedUser.name : null,
        responsibleEmail: selectedUser ? selectedUser.email : null,
        mpk: selectedUser ? selectedUser.mpk || '' : '',
        // Jeśli wybrane budowy, dodaj je
        responsibleConstructions: selectedConstructions.length > 0 ? selectedConstructions : null,
        // Jeśli jest opis towaru, dodaj go
        goodsDescription: showGoodsDescription ? goodsDescription : null,
        // Zachowaj informacje o osobie tworzącej
        createdBy: initialData.createdBy,
        createdByEmail: initialData.createdByEmail
      };
      
      console.log('Dane edycji do zapisania:', editedData);
      onSubmit(initialData.id, editedData);
    } else {
      // Nowe zamówienie
      if (!selectedUser && selectedConstructions.length === 0) {
        alert('Wybierz osobę lub budowę odpowiedzialną za zlecenie');
        return;
      }
      
      // Najpierw oblicz odległość, jeśli jeszcze nie obliczona
      let routeDistance = distance;
      if (routeDistance === 0) {
        try {
          routeDistance = await calculateRouteDistance(selectedLocation, 'destination');
          console.log('Obliczona odległość:', routeDistance);
        } catch (error) {
          console.error('Błąd obliczania odległości:', error);
        }
      }
      
      // Dodaj logs do debugowania
      console.log('Przygotowanie danych zamówienia do zapisania:');
      console.log('Odległość:', routeDistance);
      
      const data = {
        location: selectedLocation,
        documents: formData.get('documents'),
        clientName: formData.get('clientName') || '',
        producerAddress: selectedLocation === 'Odbiory własne' ? {
          city: formData.get('producerCity'),
          postalCode: formData.get('producerPostalCode'),
          street: formData.get('producerStreet'),
          pinLocation: formData.get('producerPinLocation')
        } : null,
        delivery: {
          city: formData.get('deliveryCity'),
          postalCode: formData.get('deliveryPostalCode'),
          street: formData.get('deliveryStreet'),
          pinLocation: formData.get('deliveryPinLocation')
        },
        loadingContact: formData.get('loadingContact'),
        unloadingContact: formData.get('unloadingContact'),
        deliveryDate: formData.get('deliveryDate'),
        distanceKm: routeDistance,
        notes: formData.get('notes'),
        // Dodajemy informacje o użytkowniku dodającym i odpowiedzialnym
        createdBy: currentUser.name,
        createdByEmail: currentUser.email,
        // Informacje o osobie odpowiedzialnej
        responsiblePerson: selectedUser ? selectedUser.name : null,
        responsibleEmail: selectedUser ? selectedUser.email : null,
        mpk: selectedUser ? selectedUser.mpk || '' : '',
        // Jeśli wybrane budowy, dodaj je
        responsibleConstructions: selectedConstructions.length > 0 ? selectedConstructions : null,
        // Jeśli jest opis towaru, dodaj go
        goodsDescription: showGoodsDescription ? goodsDescription : null
      };
      
      console.log('Dane zamówienia do zapisania:', data);
      
      onSubmit(data);
    }
    
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {isResponse ? 'Odpowiedź na zamówienie spedycji' : 
           isEditing ? 'Edycja zamówienia spedycji' : 
           isCopying ? 'Nowe zamówienie (skopiowane)' :
           'Nowe zamówienie spedycji'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className={buttonClasses.outline}
        >
          Anuluj
        </button>
      </div>

      {isCopying && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center text-amber-700">
            <Copy size={18} className="mr-2" />
            <div>
              <div className="font-medium">Kopiowanie zamówienia</div>
              <div className="text-sm text-amber-600 mt-1">
                Skopiowano dane z zamówienia {initialData?.originalOrderNumber}. 
                Zmodyfikuj potrzebne pola i zapisz jako nowe zamówienie.
              </div>
            </div>
          </div>
        </div>
      )}

      {isResponse ? (
        // Formularz odpowiedzi
        <>
          {/* Sekcja daty dostawy */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Calendar size={20} className="mr-2 text-blue-600" />
                <div>
                  <span className="font-medium">Podana data dostawy:</span>
                  <span className="ml-2">{formatDateForDisplay(originalDeliveryDate)}</span>
                </div>
              </div>
              <button
                type="button"
                className={changeDeliveryDate ? buttonClasses.toggleActive : buttonClasses.toggle}
                onClick={() => setChangeDeliveryDate(!changeDeliveryDate)}
              >
                {changeDeliveryDate ? 'Anuluj zmianę daty' : 'Zmienić datę dostawy?'}
              </button>
            </div>
            
            {changeDeliveryDate && (
              <div className="mt-3 pl-8">
                <label className="block text-sm font-medium mb-1">Nowa data dostawy</label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Imię kierowcy</label>
              <input
                name="driverName"
                type="text"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nazwisko kierowcy</label>
              <input
                name="driverSurname"
                type="text"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telefon do kierowcy</label>
              <input
                name="driverPhone"
                type="tel"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numery auta</label>
              <input
                name="vehicleNumber"
                type="text"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cena całkowita transportu
              </label>
              <input
                name="totalPrice"
                type="number"
                className="w-full p-2 border rounded-md"
                value={totalPrice}
                onChange={(e) => setTotalPrice(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Odległość</label>
              <input
                name="distanceKm"
                type="number"
                className="w-full p-2 border rounded-md bg-gray-100"
                value={calculatedRouteDistance > 0 ? calculatedRouteDistance : (initialData.distanceKm || 0)}
                readOnly
              />
            </div>
          </div>
          
          {/* SEKCJA: Zaawansowane łączenie transportów z konfiguracją tras */}
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <LinkIcon size={20} className="mr-2 text-blue-600" />
                Połącz z innymi transportami (zaawansowane)
              </h3>
              <button
                type="button"
                className={showMergeSection ? buttonClasses.toggleActive : buttonClasses.toggle}
                onClick={() => setShowMergeSection(!showMergeSection)}
              >
                {showMergeSection ? 'Ukryj łączenie' : 'Pokaż łączenie'}
              </button>
            </div>
            
            {showMergeSection && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Wybierz transporty do połączenia:
                  </label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                      const transportId = e.target.value;
                      if (transportId) {
                        handleAddTransportToMerge(transportId);
                        e.target.value = '';
                      }
                    }}
                    value=""
                  >
                    <option value="">Wybierz transport do połączenia...</option>
                    {availableTransports
                      .filter(t => !transportsToMerge.find(tm => tm.id === t.id))
                      .map(transport => (
                        <option key={transport.id} value={transport.id}>
                          {transport.orderNumber || transport.id} - {getTransportRoute(transport)} (MPK: {transport.mpk})
                        </option>
                      ))
                    }
                  </select>
                </div>

                {transportsToMerge.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-blue-700">Konfiguracja trasy:</h4>
                    
                    {/* Główny transport */}
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <div className="font-semibold text-blue-800 mb-2">
                        GŁÓWNY: {initialData?.orderNumber || 'Nowy'} (MPK: {initialData?.mpk || 'Brak'})
                      </div>
                      <div className="text-sm text-gray-600">
                        🟢 Załadunek: {selectedLocation} (kolejność: 1)
                      </div>
                      <div className="text-sm text-gray-600">
                        🔴 Rozładunek: Miejsce dostawy (kolejność: ostatnia)
                      </div>
                      <div className="text-sm font-medium text-green-700 mt-2">
                        Koszt: {getMainTransportCost().toFixed(2)} PLN
                      </div>
                    </div>
                    
                    {/* Transporty do połączenia z konfiguracją */}
                    {transportsToMerge.map((transport, index) => {
                      const config = routeConfiguration[transport.id] || {};
                      return (
                        <div key={transport.id} className="p-3 bg-white rounded border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-medium">{transport.orderNumber || transport.id}</div>
                              <div className="text-sm text-gray-600">{getTransportRoute(transport)} (MPK: {transport.mpk})</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTransportFromMerge(transport.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* Konfiguracja miejsc - POPRAWIONA */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="bg-green-50 p-2 rounded">
                              <div className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  checked={config.useLoading !== false} // domyślnie true
                                  onChange={(e) => handleRouteConfigurationChange(transport.id, 'useLoading', e.target.checked)}
                                  className="mr-2"
                                />
                                <label className="text-sm font-medium text-green-700">Użyj załadunek</label>
                              </div>
                              {config.useLoading !== false && (
                                <div>
                                  <label className="text-xs text-gray-600">Kolejność załadunku:</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={config.loadingOrder || index + 2}
                                    onChange={(e) => handleRouteConfigurationChange(transport.id, 'loadingOrder', parseInt(e.target.value))}
                                    className="w-full p-1 border rounded text-sm mt-1"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    📍 {transport.location.replace('Magazyn ', '')}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-red-50 p-2 rounded">
                              <div className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  checked={config.useUnloading !== false} // POPRAWKA: domyślnie true zamiast false
                                  onChange={(e) => handleRouteConfigurationChange(transport.id, 'useUnloading', e.target.checked)}
                                  className="mr-2"
                                />
                                <label className="text-sm font-medium text-red-700">Użyj rozładunek</label>
                              </div>
                              {config.useUnloading !== false && (
                                <div>
                                  <label className="text-xs text-gray-600">Kolejność rozładunku:</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={config.unloadingOrder || index + 2}
                                    onChange={(e) => handleRouteConfigurationChange(transport.id, 'unloadingOrder', parseInt(e.target.value))}
                                    className="w-full p-1 border rounded text-sm mt-1"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    📍 {transport.delivery?.city || 'Brak danych'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Koszt */}
                          <div className="flex items-center space-x-2">
                            <DollarSign size={14} className="text-gray-500" />
                            <input
                              type="number"
                              placeholder="Koszt PLN"
                              className="w-24 p-1 border rounded text-sm"
                              value={costDistribution[transport.id] || ''}
                              onChange={(e) => handleCostDistributionChange(transport.id, e.target.value)}
                            />
                            <span className="text-sm text-gray-600">PLN</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    // 2. POPRAWKA w sekcji podglądu trasy - usuń zbędne przyciski i uprość opisy
                    {/* SEKCJA PODGLĄDU SEKWENCYJNEJ TRASY - POPRAWIONA */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-blue-700 mb-3 flex items-center">
                        <Route size={18} className="mr-2" />
                        Podgląd sekwencyjnej trasy:
                      </h4>
                      {(() => {
                        const routeInfo = calculateMergedRoute();
                        const sortedPoints = routeInfo.points.sort((a, b) => {
                          if (a.order !== b.order) return a.order - b.order;
                          if (a.type === 'loading' && b.type === 'unloading') return -1;
                          if (a.type === 'unloading' && b.type === 'loading') return 1;
                          return 0;
                        });
                    
                        return (
                          <div className="space-y-2">
                            {sortedPoints.map((point, index) => {
                              // POPRAWKA: Uprość opisy - usuń "główny", używaj nazw miejscowości
                              let locationName = '';
                              if (point.transportId === 'main') {
                                if (point.type === 'loading') {
                                  locationName = selectedLocation.replace('Magazyn ', '');
                                } else {
                                  // Dla rozładunku głównego - pobierz miasto z formularza
                                  const deliveryCity = document.querySelector('input[name="deliveryCity"]')?.value || 'Miejsce dostawy';
                                  locationName = deliveryCity;
                                }
                              } else {
                                if (point.type === 'loading') {
                                  const transport = transportsToMerge.find(t => t.id === point.transportId);
                                  locationName = transport ? transport.location.replace('Magazyn ', '') : 'Nieznane';
                                } else {
                                  const transport = transportsToMerge.find(t => t.id === point.transportId);
                                  locationName = transport?.delivery?.city || 'Brak danych';
                                }
                              }
                    
                              return (
                                <div key={`${point.transportId}-${point.type}-${index}`} className="flex items-center">
                                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-3">
                                    {index + 1}
                                  </span>
                                  <span className={`mr-2 ${point.type === 'loading' ? 'text-green-600' : 'text-red-600'}`}>
                                    {point.type === 'loading' ? '🟢 Załadunek' : '🔴 Rozładunek'}
                                  </span>
                                  <span className="font-medium">{locationName}</span>
                                  {point.transportId !== 'main' && (
                                    <span className="ml-2 text-sm text-purple-600">Transport #{point.transportId}</span>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* USUŃ sekcję z przyciskami "Oblicz rzeczywistą odległość" i "Zobacz trasę na Google Maps" */}
                            
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3">
                              <div className="text-sm text-amber-700 font-medium mb-1">Cena całkowita: {(() => {
                                const mainCost = getMainTransportCost();
                                const additionalCosts = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
                                return (mainCost + additionalCosts).toFixed(2);
                              })()} PLN</div>
                              <div className="text-sm text-amber-600">
                                Przydzielone do innych: {Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0).toFixed(2)} PLN
                              </div>
                              <div className="text-sm text-amber-600">
                                Pozostaje dla głównego: {(() => {
                                  const mainCost = getMainTransportCost();
                                  const additionalCosts = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
                                  return (mainCost + additionalCosts - additionalCosts).toFixed(2);
                                })()} PLN
                              </div>
                              <div className="text-xs text-amber-600 mt-2">
                                <strong>Uwaga:</strong> Po zapisaniu odpowiedzi transporty zostaną połączone według skonfigurowanej trasy. 
                                Oryginalne transporty z listy zostaną usunięte.
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Uwagi do transportu</label>
            <textarea
              name="adminNotes"
              className="w-full p-2 border rounded-md"
              rows={3}
            />
          </div>
        </>
      ) : (
        <>
          {/* Reszta formularza (dla nowych zamówień i edycji) */}
          <div>
            <label className="block text-sm font-medium mb-1">Miejsce załadunku</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={selectedLocation === 'Magazyn Białystok' ? buttonClasses.selected : buttonClasses.unselected}
                onClick={() => setSelectedLocation('Magazyn Białystok')}
              >
                Magazyn Białystok
              </button>
              <button
                type="button"
                className={selectedLocation === 'Magazyn Zielonka' ? buttonClasses.selected : buttonClasses.unselected}
                onClick={() => setSelectedLocation('Magazyn Zielonka')}
              >
                Magazyn Zielonka
              </button>
              <button
                type="button"
                className={selectedLocation === 'Odbiory własne' ? buttonClasses.selected : buttonClasses.unselected}
                onClick={() => setSelectedLocation('Odbiory własne')}
              >
                Odbiory własne
              </button>
            </div>
          </div>

          {selectedLocation === 'Odbiory własne' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Adres punktu odbioru</h3>
              
              {/* Nazwa firmy w punkcie odbioru - nowe pole */}
              <div>
                <label className="block text-sm font-medium mb-1">Nazwa firmy (punkt odbioru)</label>
                <input
                  name="sourceClientName"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  defaultValue={initialData?.sourceClientName || ''}
                  placeholder="Nazwa firmy lub osoby w punkcie odbioru"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Miasto</label>
                  <input
                    name="producerCity"
                    type="text"
                    className="w-full p-2 border rounded-md"
                    defaultValue={initialData?.producerAddress?.city || ''}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kod pocztowy</label>
                  <input
                    name="producerPostalCode"
                    type="text"
                    className="w-full p-2 border rounded-md"
                    defaultValue={initialData?.producerAddress?.postalCode || ''}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Ulica i numer</label>
                <input
                  name="producerStreet"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  defaultValue={initialData?.producerAddress?.street || ''}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Lokalizacja na mapie (opcjonalnie)
                </label>
                <input
                  name="producerPinLocation"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  defaultValue={initialData?.producerAddress?.pinLocation || ''}
                  placeholder="Link do pineski na mapie"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Numery dokumentów</label>
            <input
              name="documents"
              type="text"
              className="w-full p-2 border rounded-md"
              defaultValue={initialData?.documents || ''}
              required
            />
          </div>
          
          {/* Towar - zmodyfikowany wygląd przycisku */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Towar</label>
              <button
                type="button"
                className={showGoodsDescription ? buttonClasses.selected : buttonClasses.unselected}
                onClick={() => setShowGoodsDescription(!showGoodsDescription)}
              >
                {showGoodsDescription ? 'Ukryj opis towaru' : 'Opisz towar'}
              </button>
            </div>
            
            {showGoodsDescription && (
              <div className="p-4 border border-blue-100 rounded-md bg-blue-50 mt-2 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Opis towaru</label>
                  <textarea
                    name="description"
                    value={goodsDescription.description}
                    onChange={handleGoodsDescriptionChange}
                    className="w-full p-2 border rounded-md"
                    rows={2}
                    placeholder="Opis przewożonego towaru..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Waga towaru</label>
                  <input
                    name="weight"
                    type="text"
                    value={goodsDescription.weight}
                    onChange={handleGoodsDescriptionChange}
                    className="w-full p-2 border rounded-md"
                    placeholder="np. 1500 kg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Adres dostawy z dodanym polem nazwy klienta na początku */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Adres dostawy</h3>
            
            {/* Nazwa klienta przeniesiona do sekcji adresu dostawy */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nazwa firmy/klienta
              </label>
              <input
                name="clientName"
                type="text"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.clientName || ''}
                placeholder="Nazwa firmy lub odbiorcy"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Miasto</label>
                <input
                  name="deliveryCity"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  defaultValue={initialData?.delivery?.city || ''}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kod pocztowy</label>
                <input
                  name="deliveryPostalCode"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  defaultValue={initialData?.delivery?.postalCode || ''}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ulica i numer</label>
              <input
                name="deliveryStreet"
                type="text"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.delivery?.street || ''}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Lokalizacja na mapie (opcjonalnie)
              </label>
              <input
                name="deliveryPinLocation"
                type="text"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.delivery?.pinLocation || ''}
                placeholder="Link do pineski na mapie"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data dostawy</label>
            <input
              name="deliveryDate"
              type="date"
              className="w-full p-2 border rounded-md"
              defaultValue={initialData?.deliveryDate || ''}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telefon na załadunek</label>
              <input
                name="loadingContact"
                type="tel"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.loadingContact || ''}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon na rozładunek</label>
              <input
                name="unloadingContact"
                type="tel"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.unloadingContact || ''}
                required
              />
            </div>
          </div>

          {/* Nowy komponent wyboru użytkownika lub budowy z autouzupełnianiem */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Osoba odpowiedzialna / budowa / numer MPK
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center relative">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onClick={() => setIsDropdownOpen(true)}
                    placeholder="Wyszukaj osobę odpowiedzialną lub budowę..."
                    className="w-full p-2 pl-10 border rounded-md"
                    required
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <Search size={18} />
                  </div>
                </div>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedUser(null);
                      setSelectedConstructions([]);
                    }}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.length > 0 ? (
                    <>
                      {/* Osoby */}
                      {filteredItems.filter(item => item.type === 'user').length > 0 && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
                          Osoby
                        </div>
                      )}
                      {filteredItems
                        .filter(item => item.type === 'user')
                        .map((user) => (
                          <div
                            key={user.email}
                            onClick={() => handleSelectItem(user)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                          >
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>{user.email}</span>
                              {user.mpk && <span className="text-blue-600">MPK: {user.mpk}</span>}
                            </div>
                          </div>
                        ))
                      }
                      
                      {/* Budowy */}
                      {filteredItems.filter(item => item.type === 'construction').length > 0 && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
                          Budowy
                        </div>
                      )}
                      {filteredItems
                        .filter(item => item.type === 'construction')
                        .map((construction) => (
                          <div
                            key={construction.id}
                            onClick={() => handleSelectItem(construction)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">{construction.name}</div>
                            <div className="text-sm text-gray-600">
                              MPK: <span className="text-blue-600">{construction.mpk}</span>
                            </div>
                          </div>
                        ))
                      }
                    </>
                  ) : (
                    <div className="p-2 text-gray-500">Brak wyników</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Wyświetlanie wybranej osoby/budowy */}
            {selectedUser && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">Wybrana osoba:</span> {selectedUser.name}
                  </div>
                  {selectedUser.mpk && (
                    <div>
                      <span className="font-medium">MPK:</span> {selectedUser.mpk}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Wyświetlanie wybranych budów */}
            {selectedConstructions.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-100">
                <h4 className="font-medium text-sm mb-2">Wybrane budowy:</h4>
                <div className="space-y-2">
                  {selectedConstructions.map(construction => (
                    <div key={construction.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{construction.name}</span>
                        <span className="ml-2 text-gray-600">MPK: {construction.mpk}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveConstruction(construction.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Uwagi</label>
            <textarea
              name="notes"
              className="w-full p-2 border rounded-md"
              rows={3}
              defaultValue={initialData?.notes || ''}
              placeholder="Dodatkowe informacje..."
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => calculateRouteDistance(selectedLocation, 'destination')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mb-2"
              disabled={isCalculatingDistance}
            >
              {isCalculatingDistance ? 'Obliczanie...' : 'Oblicz odległość trasy'}
            </button>
            
            {distance > 0 && (
              <div className="text-center text-green-700 bg-green-50 p-2 rounded-md">
                Odległość trasy: <strong>{distance} km</strong>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className={buttonClasses.primary}
        >
          {isResponse ? 'Zapisz odpowiedź' : 
           isEditing ? 'Zapisz zmiany' : 
           isCopying ? 'Zapisz jako nowe zamówienie' :
           'Dodaj zamówienie'}
        </button>
      </div>
    </form>
  )
}
