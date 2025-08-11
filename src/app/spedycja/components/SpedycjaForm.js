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
  
  // Stan dla kolejności głównego rozładunku
  const [mainUnloadingOrder, setMainUnloadingOrder] = useState(15);
  const [transportsToMerge, setTransportsToMerge] = useState([])
  const [costDistribution, setCostDistribution] = useState({})
  const [availableTransports, setAvailableTransports] = useState([])
  const [showMergeSection, setShowMergeSection] = useState(false)
  const [routeConfiguration, setRouteConfiguration] = useState({})
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

  // Klasy dla przycisków
  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2",
    selected: "px-4 py-2 bg-blue-500 text-white rounded-md",
    unselected: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50",
    toggle: "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors",
    toggleActive: "px-4 py-2 bg-blue-100 border border-blue-400 text-blue-700 rounded-md font-medium",
    orderButton: "px-2 py-1 text-sm border rounded hover:bg-gray-50 transition-colors",
    orderButtonActive: "px-2 py-1 text-sm border bg-blue-500 text-white rounded font-medium",
    orderButtonDisabled: "px-2 py-1 text-sm border rounded bg-gray-100 text-gray-400 cursor-not-allowed"
  };

  // NOWE FUNKCJE POMOCNICZE DLA INTELIGENTNEGO SYSTEMU KOLEJNOŚCI:

  // 1. Obliczanie całkowitej liczby punktów w trasie
  const getTotalRoutePointsCount = () => {
    let totalPoints = 2; // Główny transport (załadunek + rozładunek)
    
    transportsToMerge.forEach(transport => {
      const config = routeConfiguration[transport.id] || {};
      if (config.useLoading) totalPoints++;
      if (config.useUnloading) totalPoints++;
    });
    
    return totalPoints;
  };

  // 2. Pobieranie wszystkich zajętych pozycji
  const getOccupiedPositions = (excludeTransportId = null, excludeType = null) => {
    const occupied = new Set();
    
    // Główny załadunek zawsze na pozycji 1
    occupied.add(1);
    
    // Główny rozładunek
    if (mainUnloadingOrder && !(excludeTransportId === 'main' && excludeType === 'unloading')) {
      occupied.add(mainUnloadingOrder);
    }
    
    // Dodatkowe transporty
    transportsToMerge.forEach(transport => {
      const config = routeConfiguration[transport.id] || {};
      
      if (config.useLoading && config.loadingOrder && 
          !(excludeTransportId === transport.id && excludeType === 'loading')) {
        occupied.add(config.loadingOrder);
      }
      
      if (config.useUnloading && config.unloadingOrder && 
          !(excludeTransportId === transport.id && excludeType === 'unloading')) {
        occupied.add(config.unloadingOrder);
      }
    });
    
    return occupied;
  };

  // 3. Sprawdzanie czy pozycja jest dostępna
  const isPositionAvailable = (position, transportId, type) => {
    const occupiedPositions = getOccupiedPositions(transportId, type);
    return !occupiedPositions.has(position);
  };

  // 4. Znajdowania następnej dostępnej pozycji
  const getNextAvailablePosition = (transportId, type) => {
    const totalPoints = getTotalRoutePointsCount();
    const occupiedPositions = getOccupiedPositions(transportId, type);
    
    for (let i = 1; i <= totalPoints; i++) {
      if (!occupiedPositions.has(i)) {
        return i;
      }
    }
    return totalPoints; // Fallback
  };

  // 5. Renderowanie przycisków kolejności
  const renderOrderButtons = (transportId, type, currentOrder) => {
    const totalPoints = getTotalRoutePointsCount();
    
    return Array.from({ length: totalPoints }, (_, i) => i + 1).map(num => {
      const isAvailable = isPositionAvailable(num, transportId, type);
      const isSelected = num === currentOrder;
      
      return (
        <button
          key={num}
          type="button"
          disabled={!isAvailable && !isSelected}
          className={
            isSelected 
              ? buttonClasses.orderButtonActive 
              : isAvailable 
                ? buttonClasses.orderButton 
                : buttonClasses.orderButtonDisabled
          }
          onClick={() => handleRouteConfigurationChange(transportId, type === 'loading' ? 'loadingOrder' : 'unloadingOrder', num)}
          style={{ marginLeft: '4px' }}
          title={!isAvailable && !isSelected ? 'Pozycja zajęta' : ''}
        >
          {num}
        </button>
      );
    });
  };

  // Funkcja pomocnicza do formatowania trasy
  const getTransportRoute = (transport) => {
    const start = transport.location === 'Odbiory własne' && transport.producerAddress 
      ? transport.producerAddress.city 
      : transport.location.replace('Magazyn ', '')
    
    const end = transport.delivery?.city || 'Brak danych'
    
    return `${start} → ${end}`
  }

  // Funkcja pomocnicza do wyświetlania nazwy lokalizacji
  const getLocationDisplayName = (transport) => {
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      return transport.producerAddress.city || 'Brak miasta';
    } else if (transport.location === 'Magazyn Białystok') {
      return 'Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      return 'Zielonka';
    }
    return transport.location;
  };

  // FUNKCJE DLA ZAAWANSOWANEGO ŁĄCZENIA TRANSPORTÓW

  const handleAddTransportToMerge = (transportId) => {
    const transport = availableTransports.find(t => t.id === parseInt(transportId));
    if (transport && !transportsToMerge.find(t => t.id === transport.id)) {
      
      // Automatycznie znajdź dostępne pozycje
      const loadingOrder = getNextAvailablePosition(transport.id, 'loading');
      const unloadingOrder = getNextAvailablePosition(transport.id, 'unloading');
      
      const defaultConfig = {
        useLoading: false,
        useUnloading: true,
        loadingOrder: loadingOrder,
        unloadingOrder: unloadingOrder
      };
      
      const newTransport = {
        ...transport,
        ...defaultConfig
      };
      
      setTransportsToMerge([...transportsToMerge, newTransport]);
      
      setRouteConfiguration({
        ...routeConfiguration,
        [transport.id]: defaultConfig
      });
    }
  };

  const handleRemoveTransportFromMerge = (transportId) => {
    setTransportsToMerge(transportsToMerge.filter(t => t.id !== transportId));
    const newCostDistribution = { ...costDistribution };
    delete newCostDistribution[transportId];
    setCostDistribution(newCostDistribution);
    
    const newRouteConfiguration = { ...routeConfiguration };
    delete newRouteConfiguration[transportId];
    setRouteConfiguration(newRouteConfiguration);
  };

  const handleRouteConfigurationChange = (transportId, field, value) => {
    // Walidacja - sprawdź czy pozycja jest dostępna
    if (field.includes('Order')) {
      const type = field.includes('loading') ? 'loading' : 'unloading';
      if (!isPositionAvailable(value, transportId, type)) {
        console.warn(`Pozycja ${value} jest już zajęta!`);
        return; // Nie pozwól na zmianę
      }
    }
    
    setRouteConfiguration({
      ...routeConfiguration,
      [transportId]: {
        ...routeConfiguration[transportId],
        [field]: value
      }
    });
    
    setTransportsToMerge(transportsToMerge.map(t => 
      t.id === transportId 
        ? { ...t, [field]: value }
        : t
    ));
  };

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

  // Pobieranie współrzędnych z punktu trasy
  const getGoogleCoordinatesFromPoint = async (routePoint) => {
    try {
      if (routePoint.location && routePoint.location.lat && routePoint.location.lng) {
        return {
          lat: routePoint.location.lat,
          lng: routePoint.location.lng
        };
      }
      
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
    
    // Główny załadunek - zawsze pierwszy
    const mainLoading = {
      type: 'loading',
      transportId: 'main',
      order: 1,
      location: getLocationCoords(initialData || { location: selectedLocation, producerAddress: null }),
      description: getLocationDisplayName({ location: selectedLocation, producerAddress: initialData?.producerAddress }),
      address: selectedLocation
    };
    
    allPoints.push(mainLoading);
    
    // Dodaj punkty z dołączanych transportów
    transportsToMerge.forEach(transport => {
      const config = routeConfiguration[transport.id] || {};
      
      if (config.useLoading) {
        allPoints.push({
          type: 'loading',
          transportId: transport.id,
          order: config.loadingOrder,
          location: getLocationCoords(transport),
          description: getLocationDisplayName(transport),
          address: transport.location
        });
      }
      
      if (config.useUnloading) {
        allPoints.push({
          type: 'unloading',
          transportId: transport.id,
          order: config.unloadingOrder,
          location: getDeliveryCoords(transport),
          description: transport.delivery?.city || 'Nie podano',
          address: transport.delivery ? 
            `${transport.delivery.city}, ${transport.delivery.postalCode}, ${transport.delivery.street}` :
            'Brak adresu'
        });
      }
    });
    
    // Główny rozładunek
    const deliveryCity = document.querySelector('input[name="deliveryCity"]')?.value || initialData?.delivery?.city || 'Miejsce dostawy';
    const mainUnloading = {
      type: 'unloading',
      transportId: 'main',
      order: mainUnloadingOrder || 15,
      location: null,
      description: deliveryCity,
      address: 'Adres dostawy głównej'
    };
    
    allPoints.push(mainUnloading);
    
    // Sortuj punkty TYLKO według kolejności
    const sortedPoints = allPoints.sort((a, b) => a.order - b.order);
    
    return { 
      points: sortedPoints, 
      estimatedDistance: calculatedRouteDistance || 0
    };
  };

  // Oblicz pozostałą kwotę dla głównego transportu
  const getMainTransportCost = () => {
    const distributedCosts = Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);
    return Math.max(0, totalPrice - distributedCosts);
  };

  // Funkcja do geokodowania adresu
  async function getGoogleCoordinates(addressString) {
    try {
      const query = encodeURIComponent(addressString + ', Poland');
      
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
  
  // Funkcja do obliczania odległości z poprawną obsługą błędów
  async function calculateDistance(originLat, originLng, destinationLat, destinationLng) {
    try {
      // Sprawdź czy współrzędne są poprawne
      if (!originLat || !originLng || !destinationLat || !destinationLng) {
        throw new Error('Nieprawidłowe współrzędne');
      }
      
      const url = `/api/distance?origins=${originLat},${originLng}&destinations=${destinationLat},${destinationLng}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
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
        
        const distance = Math.round(data.rows[0].elements[0].distance.value / 1000);
        console.log(`✅ Obliczono odległość: ${distance} km`);
        return distance;
      }
      
      // Jeśli API nie zwróciło prawidłowej odpowiedzi, użyj estymacji
      console.warn('API Maps nie zwróciło prawidłowej odpowiedzi, używam estymacji');
      const estDistance = Math.round(calculateEstimatedDistance(originLat, originLng, destinationLat, destinationLng));
      return estDistance;
      
    } catch (error) {
      console.error('Błąd obliczania odległości:', error);
      
      // Fallback do estymacji na podstawie współrzędnych
      try {
        const estDistance = Math.round(calculateEstimatedDistance(originLat, originLng, destinationLat, destinationLng));
        console.log(`📏 Użyto estymacji odległości: ${estDistance} km`);
        return estDistance;
      } catch (estError) {
        console.error('Błąd estymacji odległości:', estError);
        throw new Error('Nie udało się obliczyć odległości');
      }
    }
  }
  
  // Funkcja pomocnicza do estymacji odległości na podstawie współrzędnych (wzór haversine)
  function calculateEstimatedDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Promień Ziemi w kilometrach
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Dodaj 15% na rzeczywiste drogi (estymacja)
    return distance * 1.15;
  }

  // Obliczanie odległości
  const handleCalculateDistance = async () => {
    try {
      setIsCalculatingDistance(true);
      
      let originLat, originLng, destLat, destLng;
      
      if (selectedLocation === 'Odbiory własne') {
        const producerCity = document.querySelector('input[name="producerCity"]').value;
        const producerPostalCode = document.querySelector('input[name="producerPostalCode"]').value;
        const producerStreet = document.querySelector('input[name="producerStreet"]').value;
        
        if (!producerCity || !producerPostalCode) {
          alert('Wprowadź dane adresowe producenta');
          setIsCalculatingDistance(false);
          return 0;
        }
        
        const originCoords = await getGoogleCoordinates(`${producerCity}, ${producerPostalCode}, ${producerStreet}`);
        originLat = originCoords.lat;
        originLng = originCoords.lng;
      } else {
        const warehouseKey = selectedLocation === 'Magazyn Białystok' ? 'bialystok' : 'zielonka';
        originLat = MAGAZYNY[warehouseKey].lat;
        originLng = MAGAZYNY[warehouseKey].lng;
      }
      
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
  
  const handleGoodsDescriptionChange = (e) => {
    const { name, value } = e.target;
    setGoodsDescription(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Pobierz listę użytkowników, budów i dane bieżącego użytkownika
  useEffect(() => {
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
        }
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        // ZMIANA: używaj /api/users/list zamiast /api/users
        const response = await fetch('/api/users/list');
        const data = await response.json();
        
        // Dodaj log żeby sprawdzić czy MPK się ładuje
        console.log('📋 Załadowani użytkownicy:', data);
        if (data && data.length > 0) {
          console.log('📋 Przykład użytkownika z MPK:', data[0]);
        }
        
        setUsers(data);
      } catch (error) {
        console.error('Błąd pobierania użytkowników:', error);
      }
    };
    const fetchConstructions = async () => {
      try {
        const response = await fetch('/api/constructions');
        if (response.ok) {
          const data = await response.json();
          setConstructions(data);
        }
      } catch (error) {
        console.error('Błąd pobierania budów:', error);
      }
    };
    
    const fetchAvailableTransports = async () => {
      try {
        const response = await fetch('/api/spedycje?status=new');
        if (response.ok) {
          const data = await response.json();
          const allTransports = data.spedycje || [];
          
          // Filtruj transporty dostępne do łączenia
          const filteredTransports = allTransports.filter(transport => {
            // Wykluczaj aktualnie edytowany transport
            if (isEditing && initialData && transport.id === initialData.id) {
              return false;
            }
            // Wykluczaj transporty które już mają odpowiedź
            if (transport.status !== 'new') {
              return false;
            }
            return true;
          });
          
          if (filteredTransports.length > 0) {
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
      
      if (initialData.response?.deliveryPrice) {
        setTotalPrice(initialData.response.deliveryPrice);
      }
      
      if (initialData.goodsDescription) {
        setGoodsDescription({
          description: initialData.goodsDescription.description || '',
          weight: initialData.goodsDescription.weight || ''
        });
        setShowGoodsDescription(true);
      }
      
      if (isResponse) {
        if (initialData.deliveryDate) {
          setOriginalDeliveryDate(initialData.deliveryDate);
          setNewDeliveryDate(initialData.deliveryDate);
        }
      } else if (isEditing) {
        if (initialData.responsibleEmail) {
          const responsibleUser = users.find(u => u.email === initialData.responsibleEmail);
          if (responsibleUser) {
            setSelectedUser(responsibleUser);
            setSearchTerm(responsibleUser.name);
          }
        }
        
        if (initialData.responsibleConstructions && initialData.responsibleConstructions.length > 0) {
          setSelectedConstructions(initialData.responsibleConstructions);
        }
      }
    }
  }, [initialData, users, isResponse, isEditing]);

  // Filtrowanie użytkowników na podstawie wyszukiwanego terminu
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    let newDistance = distance;
    
    // Oblicz odległość jeśli nie została obliczona
    if ((!isResponse && !isEditing) || distance === 0) {
      newDistance = await handleCalculateDistance();
    }
    
    if (isResponse) {
      const responseData = {
        driverName: formData.get('driverName') || '',
        driverSurname: formData.get('driverSurname') || '',
        driverPhone: formData.get('driverPhone') || '',
        vehicleNumber: formData.get('vehicleNumber') || '',
        deliveryPrice: parseFloat(formData.get('deliveryPrice')) || 0,
        distance: newDistance,
        deliveryDate: changeDeliveryDate ? newDeliveryDate : originalDeliveryDate,
        adminNotes: formData.get('adminNotes') || '',
        goodsDescription: showGoodsDescription ? goodsDescription.description : '',
        // Dodaj dane o połączonych transportach
        transportsToMerge: transportsToMerge,
        costDistribution: costDistribution,
        routeConfiguration: routeConfiguration,
        mergedRouteDistance: calculatedRouteDistance,
        totalPrice: totalPrice
      };
      
      onSubmit(initialData.id, responseData);
    } else {
      const data = {
        location: selectedLocation,
        producerAddress: selectedLocation === 'Odbiory własne' ? {
          company: formData.get('producerCompany'),
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
        clientName: formData.get('clientName'),
        loadingContact: formData.get('loadingContact'),
        unloadingContact: formData.get('unloadingContact'),
        deliveryDate: formData.get('deliveryDate'),
        documents: formData.get('documents'),
        notes: formData.get('notes'),
        distanceKm: newDistance,
        createdBy: currentUser.name,
        createdByEmail: currentUser.email,
        responsiblePerson: selectedUser ? selectedUser.name : null,
        responsibleEmail: selectedUser ? selectedUser.email : null,
        mpk: selectedUser ? selectedUser.mpk || '' : '',
        responsibleConstructions: selectedConstructions.length > 0 ? selectedConstructions : null,
        goodsDescription: showGoodsDescription ? goodsDescription : null
      };
      
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
        <>
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
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Nowa data dostawy</label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            )}
          </div>

          {/* SEKCJA ŁĄCZENIA TRANSPORTÓW - TYLKO W TRYBIE ODPOWIEDZI */}
          {!isEditing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center">
                  <LinkIcon size={20} className="mr-2 text-blue-600" />
                  Łączenie transportów
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
                      
                      <div className="p-3 bg-blue-50 rounded border border-blue-200 mb-4">
                        <div className="font-medium text-blue-700 mb-2">
                          GŁÓWNY: {initialData?.orderNumber || 'Nowy'} (MPK: {initialData?.mpk || 'Brak'})
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          🟢 Załadunek: {getLocationDisplayName({ location: initialData?.location, producerAddress: initialData?.producerAddress })}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          🔴 Rozładunek: {initialData?.delivery?.city || 'Miejsce dostawy'}
                          <div className="mt-2">
                            Kolejność rozładunku:
                            {renderOrderButtons('main', 'unloading', mainUnloadingOrder)}
                          </div>
                        </div>
                        <div className="text-sm text-green-600">
                          Koszt główny: {getMainTransportCost().toFixed(2)} PLN
                        </div>
                      </div>

                      {transportsToMerge.map((transport, index) => {
                        const config = routeConfiguration[transport.id] || {};
                        return (
                          <div key={transport.id} className="p-4 border rounded-lg bg-white">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="font-medium mb-1">
                                  {transport.orderNumber} - {getTransportRoute(transport)}
                                </div>
                                <div className="text-sm text-gray-600">MPK: {transport.mpk}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTransportFromMerge(transport.id)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="bg-green-50 p-2 rounded">
                                <div className="flex items-center mb-2">
                                  <input
                                    type="checkbox"
                                    checked={config.useLoading !== false}
                                    onChange={(e) => handleRouteConfigurationChange(transport.id, 'useLoading', e.target.checked)}
                                    className="mr-2"
                                  />
                                  <label className="text-sm font-medium text-green-700">Użyj załadunek</label>
                                </div>
                                {config.useLoading !== false && (
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">📍 {getLocationDisplayName(transport)}</div>
                                    <div>
                                      Kolejność:
                                      {renderOrderButtons(transport.id, 'loading', config.loadingOrder)}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="bg-red-50 p-2 rounded">
                                <div className="flex items-center mb-2">
                                  <input
                                    type="checkbox"
                                    checked={config.useUnloading !== false}
                                    onChange={(e) => handleRouteConfigurationChange(transport.id, 'useUnloading', e.target.checked)}
                                    className="mr-2"
                                  />
                                  <label className="text-sm font-medium text-red-700">Użyj rozładunek</label>
                                </div>
                                {config.useUnloading !== false && (
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">📍 {transport.delivery?.city || 'Brak danych'}</div>
                                    <div>
                                      Kolejność:
                                      {renderOrderButtons(transport.id, 'unloading', config.unloadingOrder)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
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
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-blue-700 mb-3 flex items-center">
                          <Route size={18} className="mr-2" />
                          Podgląd trasy:
                        </h4>
                        {(() => {
                          const routeInfo = calculateMergedRoute();
                          const sortedPoints = routeInfo.points;
                      
                          return (
                            <div className="space-y-2">
                              {sortedPoints.map((point, index) => (
                                <div key={`${point.transportId}-${point.type}-${index}`} className="flex items-center">
                                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-3">
                                    {point.order}
                                  </span>
                                  <span className={`mr-2 ${point.type === 'loading' ? 'text-green-600' : 'text-red-600'}`}>
                                    {point.type === 'loading' ? '🟢 Załadunek' : '🔴 Rozładunek'}
                                  </span>
                                  <span className="font-medium">{point.description}</span>
                                  {point.transportId !== 'main' && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      (Transport #{point.transportId})
                                    </span>
                                  )}
                                </div>
                              ))}
                              
                              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <div className="text-sm font-medium text-yellow-700">
                                  Cena całkowita: {totalPrice.toFixed(2)} PLN
                                </div>
                                <div className="text-xs text-yellow-600 mt-1">
                                  Przydzielono: {Object.values(costDistribution).reduce((sum, cost) => sum + parseFloat(cost || 0), 0).toFixed(2)} PLN
                                  | Pozostaje dla głównego: {getMainTransportCost().toFixed(2)} PLN
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
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dane przewoźnika</h3>
            
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
                <label className="block text-sm font-medium mb-1">Telefon kierowcy</label>
                <input
                  name="driverPhone"
                  type="tel"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numer pojazdu</label>
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
                <label className="block text-sm font-medium mb-1">Cena transportu (PLN)</label>
                <input
                  name="deliveryPrice"
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded-md"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Odległość (km)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-md bg-gray-50"
                  value={distance}
                  readOnly
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Opis towaru</label>
                <button
                  type="button"
                  className={showGoodsDescription ? buttonClasses.selected : buttonClasses.unselected}
                  onClick={() => setShowGoodsDescription(!showGoodsDescription)}
                >
                  {showGoodsDescription ? 'Ukryj opis towaru' : 'Opisz towar'}
                </button>
              </div>
              
              {showGoodsDescription && (
                <div className="p-4 border border-blue-100 rounded-md bg-blue-50 mt-2">
                  <textarea
                    name="goodsDescription"
                    value={goodsDescription.description}
                    onChange={handleGoodsDescriptionChange}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    placeholder="Opis przewożonego towaru..."
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Uwagi administratora</label>
              <textarea
                name="adminNotes"
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Dodatkowe informacje lub uwagi..."
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Źródło załadunku</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="location"
                  value="Magazyn Białystok"
                  checked={selectedLocation === 'Magazyn Białystok'}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="mr-2"
                />
                Magazyn Białystok
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="location"
                  value="Magazyn Zielonka"
                  checked={selectedLocation === 'Magazyn Zielonka'}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="mr-2"
                />
                Magazyn Zielonka
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="location"
                  value="Odbiory własne"
                  checked={selectedLocation === 'Odbiory własne'}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="mr-2"
                />
                Odbiory własne
              </label>
            </div>

            {selectedLocation === 'Odbiory własne' && (
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-4">
                <h4 className="font-medium">Adres producenta</h4>
                <div>
                  <label className="block text-sm font-medium mb-1">Nazwa firmy producenta</label>
                  <input
                    name="producerCompany"
                    type="text"
                    className="w-full p-2 border rounded-md"
                    defaultValue={initialData?.producerAddress?.company || ''}
                    placeholder="Nazwa firmy producenta"
                    required
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
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Adres dostawy</h3>
            
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kontakt załadunek</label>
              <input
                name="loadingContact"
                type="text"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.loadingContact || ''}
                placeholder="Telefon/email do kontaktu przy załadunku"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kontakt rozładunek</label>
              <input
                name="unloadingContact"
                type="text"
                className="w-full p-2 border rounded-md"
                defaultValue={initialData?.unloadingContact || ''}
                placeholder="Telefon/email do kontaktu przy rozładunku"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center">
                Odległość (km)
                <button
                  type="button"
                  onClick={handleCalculateDistance}
                  disabled={isCalculatingDistance}
                  className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isCalculatingDistance ? 'Obliczam...' : 'Oblicz'}
                </button>
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md bg-gray-50"
                value={distance}
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Uwagi</label>
            <textarea
              name="notes"
              className="w-full p-2 border rounded-md"
              rows={3}
              defaultValue={initialData?.notes || ''}
              placeholder="Dodatkowe informacje lub uwagi..."
            />
          </div>

          {!isResponse && !isEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Osoba odpowiedzialna</h3>
              
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-1">
                  Wyszukaj użytkownika
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-2 pl-8 border rounded-md"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Szukaj po imieniu lub email..."
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  <Search size={16} className="absolute left-2 top-3 text-gray-400" />
                </div>
                
                {isDropdownOpen && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <div
                        key={user.email}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchTerm(user.name);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.mpk && (
                          <div className="text-sm text-blue-600">MPK: {user.mpk}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="font-medium text-green-800">Wybrano: {selectedUser.name}</div>
                  <div className="text-sm text-green-600">{selectedUser.email}</div>
                  {selectedUser.mpk && (
                    <div className="text-sm text-green-600">MPK: {selectedUser.mpk}</div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchTerm('');
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Usuń wybór
                  </button>
                </div>
              )}

              {constructions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Wybierz budowy (opcjonalne)
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {constructions.map(construction => (
                      <label key={construction.id || construction.name} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedConstructions.some(c => 
                            (c.id && c.id === construction.id) || c.name === construction.name
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConstructions([...selectedConstructions, construction]);
                            } else {
                              setSelectedConstructions(selectedConstructions.filter(c => 
                                (c.id && c.id !== construction.id) && c.name !== construction.name
                              ));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{construction.name}</span>
                      </label>
                    ))}
                  </div>
                  
                  {selectedConstructions.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-sm font-medium text-blue-800 mb-1">Wybrane budowy:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedConstructions.map((construction, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {construction.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className={buttonClasses.outline}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className={buttonClasses.primary}
        >
          {isResponse ? 'Wyślij odpowiedź' : isEditing ? 'Zapisz zmiany' : 'Dodaj zamówienie'}
        </button>
      </div>
    </form>
  );
}
