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

  // Automatyczne generowanie sekwencji trasy po wyborze transportów
  useEffect(() => {
    if (selectedTransports.length > 0) {
      generateRouteSequence()
    } else {
      setRouteSequence([])
    }
  }, [selectedTransports, transportOptions])

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

  // Obsługa opcji transportu (załadunek/rozładunek)
  const handleTransportOptionToggle = (transportId, option) => {
    setTransportOptions(prev => ({
      ...prev,
      [transportId]: {
        ...prev[transportId],
        [option]: !prev[transportId]?.[option]
      }
    }))
  }

  // Generowanie sekwencji trasy
  const generateRouteSequence = () => {
    const sequence = []
    
    selectedTransports.forEach(transport => {
      const options = transportOptions[transport.id] || { loading: true, unloading: true }
      
      // Punkt załadunku
      if (options.loading) {
        sequence.push({
          id: `${transport.id}-loading`,
          transportId: transport.id,
          type: 'loading',
          city: getLoadingCity(transport),
          company: getLoadingCompany(transport),
          address: getLoadingAddress(transport),
          mpk: transport.mpk || '',
          orderNumber: transport.orderNumber || `#${transport.id}`
        })
      }
      
      // Punkt rozładunku
      if (options.unloading) {
        sequence.push({
          id: `${transport.id}-unloading`,
          transportId: transport.id,
          type: 'unloading',
          city: getUnloadingCity(transport),
          company: getUnloadingCompany(transport),
          address: getUnloadingAddress(transport),
          mpk: transport.mpk || '',
          orderNumber: transport.orderNumber || `#${transport.id}`
        })
      }
    })
    
    setRouteSequence(sequence)
  }

  // Zmiana kolejności w sekwencji trasy
  const moveRoutePoint = (index, direction) => {
    const newSequence = [...routeSequence]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < newSequence.length) {
      const temp = newSequence[index]
      newSequence[index] = newSequence[targetIndex]
      newSequence[targetIndex] = temp
      setRouteSequence(newSequence)
    }
  }

  // Aktualizacja odległości z Google Maps
  const updateRouteDistance = async () => {
    if (routeSequence.length < 2) {
      setUpdateMessage('⚠ Potrzeba co najmniej 2 punktów do obliczenia trasy')
      setTimeout(() => setUpdateMessage(''), 3000)
      return
    }

    setIsUpdatingDistance(true)
    setUpdateMessage('🔄 Obliczam odległość...')

    try {
      const waypoints = routeSequence.map(point => point.address)
      const response = await fetch('/api/calculate-route-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints })
      })

      const result = await response.json()

      if (result.success) {
        setTotalDistance(result.totalDistance)
        setUpdateMessage(`✅ Zaktualizowano: ${result.totalDistance} km`)
        setTimeout(() => setUpdateMessage(''), 5000)
      } else {
        throw new Error(result.error || 'Błąd obliczania odległości')
      }
    } catch (error) {
      console.error('Błąd aktualizacji odległości:', error)
      setUpdateMessage('⚠ Błąd obliczania odległości')
      setTimeout(() => setUpdateMessage(''), 5000)
    } finally {
      setIsUpdatingDistance(false)
    }
  }

  // Równy podział kosztów
  const distributeEvenly = () => {
    const total = parseFloat(totalPrice) || 0
    const count = selectedTransports.length
    
    if (count === 0) return
    
    const evenAmount = Math.round((total / count) * 100) / 100
    const newBreakdown = {}
    
    selectedTransports.forEach((transport, index) => {
      if (index === count - 1) {
        // Ostatni transport dostaje resztę żeby suma się zgadzała
        const sum = Object.values(newBreakdown).reduce((acc, val) => acc + val, 0)
        newBreakdown[transport.id] = Math.round((total - sum) * 100) / 100
      } else {
        newBreakdown[transport.id] = evenAmount
      }
    })
    
    setPriceBreakdown(newBreakdown)
    setErrors(prev => ({ ...prev, priceBreakdown: null }))
  }

  // Sprawdzenie czy suma podziału kosztów jest prawidłowa
  const isBreakdownValid = () => {
    if (selectedTransports.length <= 1) return true
    
    const total = parseFloat(totalPrice) || 0
    const sum = Object.values(priceBreakdown).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.abs(total - sum) < 0.01 // Tolerancja dla zaokrągleń
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
      newErrors.totalPrice = 'Podaj prawidłową cenę całkowitą'
    }
    
    if (!transportDate) {
      newErrors.transportDate = 'Wybierz datę transportu'
    }
    
    if (selectedTransports.length > 1 && !isBreakdownValid()) {
      newErrors.priceBreakdown = 'Suma podziału kosztów musi równać się cenie całkowitej'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Obsługa wysłania formularza
  const handleSubmit = () => {
    console.log('📤 Wysyłanie formularza...')
    
    if (!validateForm()) {
      console.log('❌ Formularz zawiera błędy')
      return
    }

    console.log('✅ Formularz prawidłowy, przygotowuję dane...')

    const responseData = {
      selectedTransports: selectedTransports.map(t => t.id),
      routeSequence,
      driverInfo,
      totalPrice: parseFloat(totalPrice),
      priceBreakdown: selectedTransports.length > 1 ? priceBreakdown : null,
      transportDate,
      notes,
      cargoDescription,
      totalWeight: totalWeight ? parseFloat(totalWeight) : null,
      totalDistance,
      isMerged: selectedTransports.length > 1
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
                    Dostępne transporty
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {availableTransports.length} dostępnych
                  </span>
                </div>
                
                {errors.transports && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {errors.transports}
                  </div>
                )}

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {availableTransports.map(transport => {
                    const isSelected = selectedTransports.find(t => t.id === transport.id)
                    return (
                      <div
                        key={transport.id}
                        className={`p-4 border-2 rounded-xl transition-all cursor-pointer hover:shadow-md ${
                          isSelected
                            ? 'border-green-500 bg-green-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleTransportToggle(transport)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {getLoadingCity(transport)} → {getUnloadingCity(transport)}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <Building size={14} />
                                    {transport.clientName}
                                  </span>
                                  {transport.mpk && (
                                    <span className="flex items-center gap-1">
                                      <Hash size={14} />
                                      {transport.mpk}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  {new Date(transport.deliveryDate).toLocaleDateString('pl-PL')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Opcje załadunku/rozładunku */}
                        {isSelected && (
                          <div className="mt-4 pt-3 border-t border-green-200">
                            <div className="text-xs text-gray-600 mb-2">Wybierz punkty do uwzględnienia:</div>
                            <div className="flex gap-4">
                              <label className="flex items-center text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={transportOptions[transport.id]?.loading || false}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleTransportOptionToggle(transport.id, 'loading')
                                  }}
                                  className="mr-2 w-4 h-4 text-green-600 rounded"
                                />
                                <span className="text-green-700 font-medium">📦 Załadunek</span>
                              </label>
                              <label className="flex items-center text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={transportOptions[transport.id]?.unloading || false}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleTransportOptionToggle(transport.id, 'unloading')
                                  }}
                                  className="mr-2 w-4 h-4 text-red-600 rounded"
                                />
                                <span className="text-red-700 font-medium">🚛 Rozładunek</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Podgląd trasy */}
              {routeSequence.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                      <Route size={20} />
                      Sekwencja trasy
                    </h3>
                    <div className="flex items-center gap-3">
                      {updateMessage && (
                        <div className={`text-sm px-3 py-1 rounded-full border animate-pulse ${
                          updateMessage.includes('⚠') 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : updateMessage.includes('✅')
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {updateMessage}
                        </div>
                      )}
                      <button
                        onClick={updateRouteDistance}
                        disabled={isUpdatingDistance}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <RefreshCw size={14} className={isUpdatingDistance ? 'animate-spin' : ''} />
                        Aktualizuj odległość
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {routeSequence.map((point, index) => (
                      <div
                        key={point.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-200"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          point.type === 'loading' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {point.type === 'loading' ? '📦 Załadunek' : '🚛 Rozładunek'} - {point.company}
                          </div>
                          <div className="text-xs text-gray-600">
                            {point.address}
                          </div>
                          {point.mpk && (
                            <div className="text-xs text-blue-600 font-medium">MPK: {point.mpk}</div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveRoutePoint(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveRoutePoint(index, 'down')}
                            disabled={index === routeSequence.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totalDistance > 0 && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800 font-medium">
                        <MapPin size={16} />
                        Całkowita odległość: <span className="font-bold">{totalDistance} km</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRAWA KOLUMNA - Dane odpowiedzi */}
            <div className="space-y-6">
              
              {/* Dane kierowcy */}
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <User size={20} />
                  Dane kierowcy i pojazdu
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imię i nazwisko kierowcy *
                    </label>
                    <input
                      type="text"
                      value={driverInfo.name}
                      onChange={(e) => {
                        setDriverInfo(prev => ({ ...prev, name: e.target.value }))
                        setErrors(prev => ({ ...prev, driverName: null }))
                      }}
                      className={`w-full p-3 border rounded-lg transition-colors ${
                        errors.driverName ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'
                      }`}
                      placeholder="Jan Kowalski"
                    />
                    {errors.driverName && (
                      <p className="text-red-600 text-sm mt-1">{errors.driverName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={driverInfo.phone}
                      onChange={(e) => {
                        setDriverInfo(prev => ({ ...prev, phone: e.target.value }))
                        setErrors(prev => ({ ...prev, driverPhone: null }))
                      }}
                      className={`w-full p-3 border rounded-lg transition-colors ${
                        errors.driverPhone ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'
                      }`}
                      placeholder="+48 123 456 789"
                    />
                    {errors.driverPhone && (
                      <p className="text-red-600 text-sm mt-1">{errors.driverPhone}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numer pojazdu
                    </label>
                    <input
                      type="text"
                      value={driverInfo.vehicleNumber}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 transition-colors"
                      placeholder="ABC 12345"
                    />
                  </div>
                </div>
              </div>

              {/* Dane finansowe */}
              <div className="bg-yellow-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Dane finansowe
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cena całkowita (PLN) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(e) => {
                        setTotalPrice(e.target.value)
                        setErrors(prev => ({ ...prev, totalPrice: null }))
                      }}
                      className={`w-full p-3 border rounded-lg transition-colors ${
                        errors.totalPrice ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-yellow-500'
                      }`}
                      placeholder="1500.00"
                    />
                    {errors.totalPrice && (
                      <p className="text-red-600 text-sm mt-1">{errors.totalPrice}</p>
                    )}
                  </div>

                  {/* Podział kosztów dla wielu transportów */}
                  {selectedTransports.length > 1 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                          Podział kosztów między transporty
                        </label>
                        <button
                          onClick={distributeEvenly}
                          className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          <Calculator size={14} className="inline mr-1" />
                          Równo
                        </button>
                      </div>
                      
                      {errors.priceBreakdown && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                          <AlertTriangle size={16} />
                          {errors.priceBreakdown}
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedTransports.map(transport => (
                          <div key={transport.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {getLoadingCity(transport)} → {getUnloadingCity(transport)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {transport.clientName}
                              </div>
                            </div>
                            <div className="w-32">
                              <input
                                type="number"
                                step="0.01"
                                value={priceBreakdown[transport.id] || ''}
                                onChange={(e) => {
                                  setPriceBreakdown(prev => ({
                                    ...prev,
                                    [transport.id]: e.target.value
                                  }))
                                  setErrors(prev => ({ ...prev, priceBreakdown: null }))
                                }}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <span className="text-sm text-gray-600">PLN</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span>Suma podziału:</span>
                          <span className={`font-bold ${
                            isBreakdownValid() ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {Object.values(priceBreakdown).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} PLN
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dodatkowe informacje */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Dodatkowe informacje
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data transportu *
                    </label>
                    <input
                      type="date"
                      value={transportDate}
                      onChange={(e) => {
                        setTransportDate(e.target.value)
                        setErrors(prev => ({ ...prev, transportDate: null }))
                      }}
                      className={`w-full p-3 border rounded-lg transition-colors ${
                        errors.transportDate ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-gray-500'
                      }`}
                    />
                    {errors.transportDate && (
                      <p className="text-red-600 text-sm mt-1">{errors.transportDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Całkowita waga (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalWeight}
                      onChange={(e) => setTotalWeight(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 transition-colors"
                      placeholder="1500.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opis ładunku
                    </label>
                    <textarea
                      value={cargoDescription}
                      onChange={(e) => setCargoDescription(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 transition-colors"
                      rows="3"
                      placeholder="Szczegółowy opis przewożonego ładunku..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Uwagi dodatkowe
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 transition-colors"
                      rows="3"
                      placeholder="Dodatkowe uwagi do transportu..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STOPKA Z PRZYCISKAMI */}
        <div className="bg-gray-50 border-t p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedTransports.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={16} className="text-green-600" />
                Wybrano <span className="font-bold text-green-600">{selectedTransports.length}</span> 
                transport{selectedTransports.length > 1 ? (selectedTransports.length > 4 ? 'ów' : 'y') : ''}
              </div>
            )}
            
            {errors.submit && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {errors.submit}
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedTransports.length === 0}
              className={`px-8 py-3 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                selectedTransports.length > 0
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check size={18} />
              Wyślij odpowiedź
              {selectedTransports.length > 0 && (
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs ml-1">
                  {selectedTransports.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
