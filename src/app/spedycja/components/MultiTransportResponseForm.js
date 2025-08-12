// src/app/spedycja/components/MultiTransportResponseForm.js
'use client'
import { useState, useEffect } from 'react'
import { X, Check, Package, MapPin, ArrowUp, ArrowDown, Truck, Calculator, Calendar, User, Phone, Hash, FileText, Weight, RefreshCw, DollarSign, AlertTriangle, CheckCircle2, Route, Building, Clock } from 'lucide-react'

export default function MultiTransportResponseForm({ 
  availableTransports = [], 
  onClose, 
  onSubmit 
}) {
  // Stan formularza
  const [selectedTransports, setSelectedTransports] = useState([])
  const [transportOptions, setTransportOptions] = useState({}) // Czy brać załadunek/rozładunek
  const [routeSequence, setRouteSequence] = useState([])
  const [driverInfo, setDriverInfo] = useState({
    name: '',
    phone: '',
    vehicleNumber: ''
  })
  const [totalPrice, setTotalPrice] = useState('')
  const [priceBreakdown, setPriceBreakdown] = useState({})
  const [transportDate, setTransportDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [cargoDescription, setCargoDescription] = useState('')
  const [totalWeight, setTotalWeight] = useState('')
  const [totalDistance, setTotalDistance] = useState(0)
  const [isUpdatingDistance, setIsUpdatingDistance] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [goodsPrice, setGoodsPrice] = useState('')

  // NOWE POLA - Rodzaj pojazdu i rodzaj transportu
  const [vehicleType, setVehicleType] = useState('')
  const [transportType, setTransportType] = useState('')

  // Opcje rodzaju pojazdu
  const vehicleTypes = [
    { value: 'bus', label: 'Bus' },
    { value: 'solowka', label: 'Solówka' },
    { value: 'zestaw', label: 'Zestaw' },
    { value: 'platforma', label: 'Platforma' },
    { value: 'hds', label: 'HDS' }
  ]

  // Opcje rodzaju transportu
  const transportTypes = [
    { value: 'opakowaniowy', label: 'Transport opakowaniowy' },
    { value: 'towarow', label: 'Transport towarów' }
  ]

  // Automatyczne generowanie sekwencji trasy po wyborze transportów
  useEffect(() => {
    if (selectedTransports.length > 0) {
      generateRouteSequence()
    } else {
      setRouteSequence([])
    }
  }, [selectedTransports, transportOptions])

  // Automatyczne wypełnienie równomiernego podziału gdy zmienia się liczba transportów
  useEffect(() => {
    if (selectedTransports.length > 1 && totalPrice && Object.keys(priceBreakdown).length === 0) {
      distributeCostsEvenly()
    }
  }, [selectedTransports.length, totalPrice])

  // Funkcje pomocnicze do pobierania danych z transportów
  const getLoadingCity = (transport) => {
    if (transport.location === 'Magazyn Białystok') return 'Białystok'
    if (transport.location === 'Magazyn Zielonka') return 'Zielonka'
    if (transport.location === 'Odbiory własne' && transport.location_data) {
      try {
        const locationData = typeof transport.location_data === 'string' 
          ? JSON.parse(transport.location_data) 
          : transport.location_data
        return locationData.city || 'Nie podano'
      } catch (e) {
        return 'Nie podano'
      }
    }
    return 'Nie podano'
  }

  const getLoadingCompany = (transport) => {
    if (transport.location === 'Magazyn Białystok' || transport.location === 'Magazyn Zielonka') {
      return 'Grupa Eltron Sp. z o.o.'
    }
    if (transport.location === 'Odbiory własne' && transport.location_data) {
      try {
        const locationData = typeof transport.location_data === 'string' 
          ? JSON.parse(transport.location_data) 
          : transport.location_data
        return locationData.company || 'Nie podano'
      } catch (e) {
        return 'Nie podano'
      }
    }
    return 'Nie podano'
  }

  const getLoadingAddress = (transport) => {
    if (transport.location === 'Magazyn Białystok') {
      return 'Białystok, 15-169, ul. Wysockiego 69B'
    }
    if (transport.location === 'Magazyn Zielonka') {
      return 'Zielonka, 05-220, ul. Żeglarska 1'
    }
    if (transport.location === 'Odbiory własne' && transport.location_data) {
      try {
        const locationData = typeof transport.location_data === 'string' 
          ? JSON.parse(transport.location_data) 
          : transport.location_data
        return `${locationData.city || ''}, ${locationData.postalCode || ''}, ${locationData.street || ''}`.replace(/^,\s*|,\s*$/g, '')
      } catch (e) {
        return 'Nie podano'
      }
    }
    return 'Nie podano'
  }

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

  const getUnloadingCompany = (transport) => {
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return deliveryData.company || transport.clientName || 'Nie podano'
      } catch (e) {
        return transport.clientName || 'Nie podano'
      }
    }
    return transport.clientName || 'Nie podano'
  }

  const getUnloadingAddress = (transport) => {
    if (transport.delivery_data) {
      try {
        const deliveryData = typeof transport.delivery_data === 'string' 
          ? JSON.parse(transport.delivery_data) 
          : transport.delivery_data
        return `${deliveryData.city || ''}, ${deliveryData.postalCode || ''}, ${deliveryData.street || ''}`.replace(/^,\s*|,\s*$/g, '')
      } catch (e) {
        return 'Nie podano'
      }
    }
    if (transport.delivery) {
      return `${transport.delivery.city || ''}, ${transport.delivery.postalCode || ''}, ${transport.delivery.street || ''}`.replace(/^,\s*|,\s*$/g, '')
    }
    return 'Nie podano'
  }

  // Obsługa wyboru transportów
  const handleTransportToggle = (transport) => {
    const isSelected = selectedTransports.find(t => t.id === transport.id)
    
    if (isSelected) {
      // Usuń transport
      const newSelected = selectedTransports.filter(t => t.id !== transport.id)
      setSelectedTransports(newSelected)
      
      // Usuń z podziału kosztów
      const newBreakdown = { ...priceBreakdown }
      delete newBreakdown[transport.id]
      setPriceBreakdown(newBreakdown)
      
      // Usuń z opcji transportu
      const newOptions = { ...transportOptions }
      delete newOptions[transport.id]
      setTransportOptions(newOptions)
    } else {
      // Dodaj transport
      setSelectedTransports([...selectedTransports, transport])
      
      // Domyślne opcje - oba punkty
      setTransportOptions(prev => ({
        ...prev,
        [transport.id]: { loading: true, unloading: true }
      }))
    }
    
    // Wyczyść błędy przy zmianie wyboru
    setErrors(prev => ({ ...prev, transports: null }))
  }

  // Obsługa opcji transportu (załadunek/rozładunek) - umożliwia optymalizację trasy
  const handleTransportOptionToggle = (transportId, option) => {
    setTransportOptions(prev => {
      const currentOptions = prev[transportId] || { loading: true, unloading: true }
      const newValue = !currentOptions[option]
      const newOptions = {
        ...currentOptions,
        [option]: newValue
      }
      
      // Jeśli obie opcje zostały odznaczone, usuń transport z wybranych
      if (!newOptions.loading && !newOptions.unloading) {
        console.log(`🚫 Transport ${transportId} usunięty - brak wybranych opcji trasy`)
        
        // Usuń transport z selectedTransports
        setSelectedTransports(current => current.filter(t => t.id !== transportId))
        
        // Usuń z podziału kosztów
        setPriceBreakdown(current => {
          const newBreakdown = { ...current }
          delete newBreakdown[transportId]
          return newBreakdown
        })
        
        // Usuń z opcji transportu
        const newTransportOptions = { ...prev }
        delete newTransportOptions[transportId]
        return newTransportOptions
      }
      
      return {
        ...prev,
        [transportId]: newOptions
      }
    })
  }

  // Generowanie sekwencji trasy - tylko uwzględnione punkty
  const generateRouteSequence = () => {
    const sequence = []
    
    // Dodaj punkty na podstawie wybranych transportów i opcji "Uwzględnij"
    selectedTransports.forEach(transport => {
      const options = transportOptions[transport.id] || { loading: true, unloading: true }
      
      // Dodaj załadunek tylko jeśli jest uwzględniony
      if (options.loading) {
        sequence.push({
          id: `${transport.id}-loading`,
          transportId: transport.id,
          type: 'loading',
          city: getLoadingCity(transport),
          company: getLoadingCompany(transport),
          address: getLoadingAddress(transport),
          transport
        })
      }
      
      // Dodaj rozładunek tylko jeśli jest uwzględniony
      if (options.unloading) {
        sequence.push({
          id: `${transport.id}-unloading`,
          transportId: transport.id,
          type: 'unloading',
          city: getUnloadingCity(transport),
          company: getUnloadingCompany(transport),
          address: getUnloadingAddress(transport),
          transport
        })
      }
    })
    
    console.log('🗺️ Wygenerowano sekwencję trasy z', sequence.length, 'punktów')
    setRouteSequence(sequence)
  }

  // Przesunięcie punktu w sekwencji
  const moveSequencePoint = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === routeSequence.length - 1)
    ) {
      return
    }
    
    const newSequence = [...routeSequence]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    ;[newSequence[index], newSequence[targetIndex]] = [newSequence[targetIndex], newSequence[index]]
    
    setRouteSequence(newSequence)
  }

  // Obsługa zmiany podziału kosztów
  const handlePriceBreakdownChange = (transportId, value) => {
    const numericValue = parseFloat(value) || 0
    setPriceBreakdown(prev => ({
      ...prev,
      [transportId]: numericValue
    }))
  }

  // Równomierne rozłożenie kosztów z poprawką zaokrągleń
  const distributeCostsEvenly = () => {
    if (!totalPrice || selectedTransports.length === 0) return
    
    const totalPriceNum = parseFloat(totalPrice)
    const transportCount = selectedTransports.length
    const basePrice = Math.floor((totalPriceNum * 100) / transportCount) / 100 // Zaokrąglij w dół do 2 miejsc
    const remainder = totalPriceNum - (basePrice * transportCount)
    
    const newBreakdown = {}
    
    selectedTransports.forEach((transport, index) => {
      // Przydziel podstawową kwotę plus ewentualną resztę do pierwszego transportu
      const price = index === 0 ? basePrice + remainder : basePrice
      newBreakdown[transport.id] = parseFloat(price.toFixed(2))
    })
    
    // Sprawdź czy suma jest prawidłowa
    const sum = Object.values(newBreakdown).reduce((acc, val) => acc + val, 0)
    console.log(`💰 Podział kosztów: cena całkowita ${totalPriceNum}, suma podziału ${sum.toFixed(2)}`)
    
    setPriceBreakdown(newBreakdown)
  }

  // Obliczanie sumy przypisanych kosztów
  const getTotalAssignedCost = () => {
    return Object.values(priceBreakdown).reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0)
  }

  // Obliczanie łącznej odległości na podstawie rzeczywistej sekwencji trasy
  const calculateTotalDistance = async () => {
    if (routeSequence.length < 2) {
      setTotalDistance(0)
      setUpdateMessage('Za mało punktów w trasie')
      setTimeout(() => setUpdateMessage(''), 2000)
      return
    }
    
    setIsUpdatingDistance(true)
    setUpdateMessage(`Obliczam odległość dla ${routeSequence.length} punktów trasy...`)
    
    try {
      // Przygotuj współrzędne dla każdego punktu w aktualnej sekwencji
      const waypoints = []
      
      for (const point of routeSequence) {
        let coords = null
        
        // Pobierz współrzędne na podstawie miasta i typu punktu
        if (point.city === 'Białystok') {
          coords = { lat: 53.1325, lng: 23.1688 }
        } else if (point.city === 'Zielonka') {
          coords = { lat: 52.3125, lng: 21.1390 }
        } else {
          // Dla innych miast spróbuj geokodowania
          try {
            const address = point.address.includes(',') ? 
              `${point.city}, ${point.address.split(',').slice(1).join(',').trim()}, Poland` : 
              `${point.city}, Poland`
              
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            )
            const data = await response.json()
            
            if (data.status === 'OK' && data.results?.[0]) {
              coords = data.results[0].geometry.location
            }
          } catch (e) {
            console.warn(`Geokodowanie nie powiodło się dla ${point.city}`)
          }
        }
        
        if (coords) {
          waypoints.push(coords)
        }
      }
      
      if (waypoints.length >= 2) {
        // Oblicz odległość jako sumę odcinków między kolejnymi punktami
        let totalDistance = 0
        
        for (let i = 0; i < waypoints.length - 1; i++) {
          const origin = waypoints[i]
          const destination = waypoints[i + 1]
          
          try {
            const response = await fetch(`/api/distance?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}`)
            const data = await response.json()
            
            if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
              totalDistance += Math.round(data.rows[0].elements[0].distance.value / 1000)
            } else {
              // Fallback: użyj wzoru haversine
              const dist = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng)
              totalDistance += Math.round(dist)
            }
          } catch (e) {
            // Fallback: użyj wzoru haversine
            const dist = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng)
            totalDistance += Math.round(dist)
          }
        }
        
        setTotalDistance(totalDistance)
        setUpdateMessage(`Obliczono trasę: ${totalDistance} km (${routeSequence.length} punktów)`)
      } else {
        throw new Error('Nie udało się uzyskać współrzędnych punktów')
      }
      
      setTimeout(() => setUpdateMessage(''), 3000)
    } catch (error) {
      console.error('Błąd obliczania odległości:', error)
      
      // Fallback - prosta estymacja na podstawie liczby punktów
      const estimatedDistance = Math.round(routeSequence.length * 60 + Math.random() * 100)
      setTotalDistance(estimatedDistance)
      setUpdateMessage(`Estymowana odległość: ${estimatedDistance} km (błąd API)`)
      
      setTimeout(() => setUpdateMessage(''), 3000)
    } finally {
      setIsUpdatingDistance(false)
    }
  }
  
  // Pomocnicza funkcja obliczania odległości haversine
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // promień ziemi w km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance * 1.2; // dodaj 20% na rzeczywiste drogi
  }

  // Walidacja formularza
  const validateForm = () => {
    const newErrors = {}
    
    if (selectedTransports.length === 0) {
      newErrors.transports = 'Wybierz co najmniej jeden transport'
    }
    
    if (!driverInfo.name.trim()) {
      newErrors.driverName = 'Podaj imię i nazwisko kierowcy'
    }
    
    if (!driverInfo.phone.trim()) {
      newErrors.driverPhone = 'Podaj numer telefonu kierowcy'
    }
    
    if (!totalPrice || parseFloat(totalPrice) <= 0) {
      newErrors.totalPrice = 'Podaj cenę transportu'
    }
    
    if (!transportDate) {
      newErrors.transportDate = 'Podaj datę transportu'
    }

    // Walidacja nowych pól
    if (!vehicleType) {
      newErrors.vehicleType = 'Wybierz rodzaj pojazdu'
    }

    if (!transportType) {
      newErrors.transportType = 'Wybierz rodzaj transportu'
    }

    // Walidacja podziału kosztów dla wielu transportów
    if (selectedTransports.length > 1) {
      const totalAssigned = getTotalAssignedCost()
      const totalPriceNum = parseFloat(totalPrice) || 0
      
      if (Math.abs(totalAssigned - totalPriceNum) > 0.01) {
        newErrors.priceBreakdown = `Suma przypisanych kosztów (${totalAssigned.toFixed(2)} PLN) musi być równa łącznej cenie (${totalPriceNum.toFixed(2)} PLN)`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Obsługa wysyłania formularza
  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }
    
    const responseData = {
      selectedTransports: selectedTransports.map(t => t.id),
      routeSequence: routeSequence,
      driverInfo: driverInfo,
      totalPrice: parseFloat(totalPrice),
      priceBreakdown: Object.keys(priceBreakdown).length > 0 ? priceBreakdown : null,
      transportDate,
      notes,
      cargoDescription,
      totalWeight: totalWeight ? parseFloat(totalWeight) : null,
      totalDistance,
      isMerged: selectedTransports.length > 1,
      goodsPrice: goodsPrice ? parseFloat(goodsPrice) : null,
      // NOWE POLA
      vehicleType,
      transportType
    }

    console.log('📋 Dane do wysłania:', JSON.stringify(responseData, null, 2))
    
    try {
      onSubmit(responseData)
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania:', error)
      setErrors({ submit: 'Wystąpił błąd podczas wysyłania: ' + error.message })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* NAGŁÓWEK */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Odpowiedź na zapytania spedycyjne</h2>
              <p className="text-green-100 text-sm">Wybierz transporty i przygotuj kompleksową odpowiedź</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* GŁÓWNA ZAWARTOŚĆ */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
            
            {/* LEWA KOLUMNA - Wybór transportów */}
            <div className="space-y-6">
              
              {/* Lista dostępnych transportów */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package size={20} />
                    Dostępne transporty ({availableTransports.length})
                  </h3>
                  {selectedTransports.length > 0 && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Wybrano: {selectedTransports.length}
                    </span>
                  )}
                </div>
                
                {errors.transports && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {errors.transports}
                  </div>
                )}
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {availableTransports.map((transport) => {
                    const isSelected = selectedTransports.find(t => t.id === transport.id)
                    const options = transportOptions[transport.id] || { loading: true, unloading: true }
                    
                    return (
                      <div 
                        key={transport.id} 
                        className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-green-300 bg-green-50 shadow-md' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => handleTransportToggle(transport)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                              <span className="font-medium text-gray-900">
                                {getLoadingCity(transport)} → {getUnloadingCity(transport)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-1">
                                <Building size={12} />
                                <span>{getLoadingCompany(transport)} → {getUnloadingCompany(transport)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin size={12} />
                                <span>{getLoadingAddress(transport)} → {getUnloadingAddress(transport)}</span>
                              </div>
                              {transport.orderNumber && (
                                <div className="flex items-center gap-1">
                                  <Hash size={12} />
                                  <span>Nr zamówienia: {transport.orderNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Opcje transportu */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-700 font-medium">Uwzględnij:</span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={options.loading || false}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleTransportOptionToggle(transport.id, 'loading')
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span>Załadunek</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={options.unloading || false}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleTransportOptionToggle(transport.id, 'unloading')
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span>Rozładunek</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Sekwencja trasy */}
              {routeSequence.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Route size={20} />
                      Sekwencja trasy ({routeSequence.length} punktów)
                    </h3>
                    <button
                      onClick={calculateTotalDistance}
                      disabled={isUpdatingDistance}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {isUpdatingDistance ? <RefreshCw size={16} className="animate-spin" /> : <Calculator size={16} />}
                      Oblicz odległość
                    </button>
                  </div>
                  
                  {updateMessage && (
                    <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg text-blue-800 text-sm">
                      {updateMessage}
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {routeSequence.map((point, index) => (
                      <div key={point.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveSequencePoint(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveSequencePoint(index, 'down')}
                            disabled={index === routeSequence.length - 1}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {point.type === 'loading' ? '📦 Załadunek' : '🏢 Rozładunek'} - {point.city}
                          </div>
                          <div className="text-sm text-gray-600">{point.company}</div>
                          <div className="text-xs text-gray-500">{point.address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* PRAWA KOLUMNA - Szczegóły odpowiedzi */}
            <div className="space-y-6">
              
              {/* Informacje o kierowcy */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={20} />
                  Informacje o kierowcy
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Imię i nazwisko kierowcy *
                    </label>
                    <input
                      type="text"
                      value={driverInfo.name}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.driverName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Jan Kowalski"
                    />
                    {errors.driverName && <p className="mt-1 text-sm text-red-600">{errors.driverName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numer telefonu kierowcy *
                    </label>
                    <input
                      type="tel"
                      value={driverInfo.phone}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.driverPhone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+48 123 456 789"
                    />
                    {errors.driverPhone && <p className="mt-1 text-sm text-red-600">{errors.driverPhone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numer rejestracyjny pojazdu
                    </label>
                    <input
                      type="text"
                      value={driverInfo.vehicleNumber}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ABC 1234"
                    />
                  </div>
                </div>
              </div>

              {/* NOWA SEKCJA - Rodzaj pojazdu i transportu */}
              <div className="bg-yellow-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck size={20} />
                  Rodzaj pojazdu i transportu
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rodzaj pojazdu *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicleTypes.map((type) => (
                        <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vehicleType"
                            value={type.value}
                            checked={vehicleType === type.value}
                            onChange={(e) => setVehicleType(e.target.value)}
                            className="border-gray-300"
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.vehicleType && <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rodzaj transportu *
                    </label>
                    <div className="space-y-2">
                      {transportTypes.map((type) => (
                        <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="transportType"
                            value={type.value}
                            checked={transportType === type.value}
                            onChange={(e) => setTransportType(e.target.value)}
                            className="border-gray-300"
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.transportType && <p className="mt-1 text-sm text-red-600">{errors.transportType}</p>}
                  </div>
                </div>
              </div>
              
              {/* Podział kosztów - tylko dla wielu transportów */}
              {selectedTransports.length > 1 && (
                <div className="bg-orange-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calculator size={20} />
                      Podział kosztów ({selectedTransports.length} transportów)
                    </h3>
                    <button
                      onClick={distributeCostsEvenly}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                      type="button"
                    >
                      <RefreshCw size={16} />
                      Rozłóż równomiernie
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedTransports.map((transport) => (
                      <div key={transport.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {getLoadingCity(transport)} → {getUnloadingCity(transport)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {transport.orderNumber || `Transport ${transport.id}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={priceBreakdown[transport.id] || ''}
                            onChange={(e) => handlePriceBreakdownChange(transport.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            placeholder="0.00"
                          />
                          <span className="text-sm text-gray-600">PLN</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Podsumowanie podziału */}
                    <div className="pt-3 border-t border-orange-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Suma przypisanych kosztów:</span>
                        <span className={`font-medium ${getTotalAssignedCost() === parseFloat(totalPrice || 0) ? 'text-green-600' : 'text-red-600'}`}>
                          {getTotalAssignedCost().toFixed(2)} PLN
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Łączna cena transportu:</span>
                        <span className="font-medium text-gray-900">{parseFloat(totalPrice || 0).toFixed(2)} PLN</span>
                      </div>
                      {Math.abs(getTotalAssignedCost() - parseFloat(totalPrice || 0)) > 0.01 && (
                        <div className="flex items-center justify-between text-sm text-red-600 mt-1">
                          <span>Różnica:</span>
                          <span className="font-medium">{(parseFloat(totalPrice || 0) - getTotalAssignedCost()).toFixed(2)} PLN</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Błąd walidacji podziału kosztów */}
                  {errors.priceBreakdown && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {errors.priceBreakdown}
                    </div>
                  )}
                </div>
              )}

              {/* Szczegóły transportu */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Szczegóły transportu
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Łączna cena transportu (PLN) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.totalPrice ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1500.00"
                    />
                    {errors.totalPrice && <p className="mt-1 text-sm text-red-600">{errors.totalPrice}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cena towaru (PLN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={goodsPrice}
                      onChange={(e) => setGoodsPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5000.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">Wartość przewożonego towaru (opcjonalne)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data transportu *
                    </label>
                    <input
                      type="date"
                      value={transportDate}
                      onChange={(e) => setTransportDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.transportDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.transportDate && <p className="mt-1 text-sm text-red-600">{errors.transportDate}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Łączna waga (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={totalWeight}
                      onChange={(e) => setTotalWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1500.5"
                    />
                  </div>
                  
                  {totalDistance > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Łączna odległość
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                        {totalDistance} km
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opis ładunku
                    </label>
                    <textarea
                      value={cargoDescription}
                      onChange={(e) => setCargoDescription(e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Opis transportowanego ładunku..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uwagi dodatkowe
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Dodatkowe informacje o transporcie..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* STOPKA Z PRZYCISKAMI */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">
            {selectedTransports.length > 0 ? (
              <span>Wybrano {selectedTransports.length} transport{selectedTransports.length === 1 ? '' : selectedTransports.length < 5 ? 'y' : 'ów'}</span>
            ) : (
              <span>Wybierz transporty aby kontynuować</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedTransports.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={20} />
              Wyślij odpowiedź
            </button>
          </div>
        </div>
        
        {/* Błąd wysyłania */}
        {errors.submit && (
          <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              <span className="font-medium">Błąd wysyłania</span>
            </div>
            <p className="mt-1 text-sm">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  )
}
