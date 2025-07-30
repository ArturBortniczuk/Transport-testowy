// src/app/spedycja/components/MultiTransportResponseForm.js
'use client'
import { useState, useEffect } from 'react'
import { X, Check, Package, MapPin, ArrowUp, ArrowDown, Truck, Calculator, Calendar, User, Phone, Hash, FileText, Weight, RefreshCw, DollarSign, Zap } from 'lucide-react'

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

  // Aktualizuj sekwencję trasy gdy zmienią się wybrane transporty lub opcje
  useEffect(() => {
    if (selectedTransports.length === 0) {
      setRouteSequence([])
      return
    }

    const newSequence = []

    selectedTransports.forEach(transport => {
      const options = transportOptions[transport.id] || { loading: true, unloading: true }
      
      // Punkt załadunku (jeśli wybrany)
      if (options.loading) {
        const loadingPoint = {
          id: `loading_${transport.id}`,
          transportId: transport.id,
          type: 'loading',
          city: getLoadingCity(transport),
          company: getLoadingCompany(transport),
          mpk: transport.mpk,
          contact: transport.loading_contact,
          address: getLoadingAddress(transport)
        }
        newSequence.push(loadingPoint)
      }

      // Punkt rozładunku (jeśli wybrany)
      if (options.unloading) {
        const unloadingPoint = {
          id: `unloading_${transport.id}`,
          transportId: transport.id,
          type: 'unloading',
          city: getUnloadingCity(transport),
          company: transport.clientName || 'Nie podano',
          mpk: transport.mpk,
          contact: transport.unloading_contact,
          address: getUnloadingAddress(transport)
        }
        newSequence.push(unloadingPoint)
      }
    })

    setRouteSequence(newSequence)
  }, [selectedTransports, transportOptions])

  // Pomocnicze funkcje do pobierania danych transportu
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
    return transport.location || 'Nie podano'
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

  // Zmiana kolejności w sekwencji trasy
  const moveRoutePoint = (index, direction) => {
    const newSequence = [...routeSequence]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < newSequence.length) {
      [newSequence[index], newSequence[targetIndex]] = [newSequence[targetIndex], newSequence[index]]
      setRouteSequence(newSequence)
    }
  }

  // Aktualizacja odległości trasy
  const updateRouteDistance = async () => {
    console.log('🔄 Aktualizuję odległość trasy...')
    console.log('Sekwencja trasy:', routeSequence)
    
    if (routeSequence.length < 2) {
      console.log('❌ Za mało punktów w trasie')
      setTotalDistance(0)
      return
    }

    setIsUpdatingDistance(true)
    
    try {
      // Mapa odległości między polskimi miastami (w km)
      const cityDistances = {
        // Z Białegostoku
        'Białystok-Warszawa': 200,
        'Białystok-Lipno': 300,
        'Białystok-Zielonka': 200,
        'Białystok-Bydgoszcz': 280,
        'Białystok-Wrocław': 520,
        'Białystok-Kraków': 400,
        'Białystok-Gdańsk': 280,
        'Białystok-Poznań': 350,
        'Białystok-Lublin': 180,
        'Białystok-Olsztyn': 120,
        
        // Z Warszawy/Zielonki
        'Warszawa-Lipno': 120,
        'Warszawa-Bydgoszcz': 180,
        'Warszawa-Wrocław': 350,
        'Warszawa-Kraków': 300,
        'Warszawa-Gdańsk': 350,
        'Warszawa-Poznań': 280,
        'Warszawa-Lublin': 170,
        'Zielonka-Lipno': 100,
        'Zielonka-Bydgoszcz': 160,
        'Zielonka-Wrocław': 330,
        'Zielonka-Kraków': 280,
        'Zielonka-Gdańsk': 330,
        'Zielonka-Poznań': 260,
        'Zielonka-Lublin': 150,
        
        // Z Lipna
        'Lipno-Bydgoszcz': 90,
        'Lipno-Wrocław': 280,
        'Lipno-Kraków': 350,
        'Lipno-Gdańsk': 200,
        'Lipno-Poznań': 180,
        'Lipno-Toruń': 70,
        'Lipno-Płock': 80,
        
        // Z Bydgoszczy
        'Bydgoszcz-Wrocław': 200,
        'Bydgoszcz-Kraków': 400,
        'Bydgoszcz-Gdańsk': 160,
        'Bydgoszcz-Poznań': 120,
        'Bydgoszcz-Toruń': 50,
        
        // Z Wrocławia
        'Wrocław-Kraków': 250,
        'Wrocław-Poznań': 180,
        'Wrocław-Opole': 80,
        'Wrocław-Kielce': 250,
        
        // Z Krakowa
        'Kraków-Katowice': 80,
        'Kraków-Kielce': 100,
        'Kraków-Tarnów': 80,
        'Kraków-Rzeszów': 160,
        
        // Z Gdańska
        'Gdańsk-Olsztyn': 150,
        'Gdańsk-Słupsk': 120,
        'Gdańsk-Elbląg': 60,
        
        // Z Poznania
        'Poznań-Konin': 90,
        'Poznań-Kalisz': 100,
        'Poznań-Piła': 90,
        
        // Inne połączenia
        'Katowice-Opole': 60,
        'Lublin-Kielce': 120,
        'Olsztyn-Elbląg': 80,
        'Toruń-Płock': 120,
        
        // Dodatkowe miasta z Mazowsza
        'Wysokie Mazowieckie-Białystok': 50,
        'Wysokie Mazowieckie-Warszawa': 150,
        'Ostrołęka-Białystok': 90,
        'Ostrołęka-Warszawa': 120,
        'Mława-Warszawa': 120,
        'Płock-Warszawa': 110,
        'Ciechanów-Warszawa': 80,
        'Siedlce-Warszawa': 90,
        'Radom-Warszawa': 100,
        'Pruszków-Warszawa': 20,
        'Legionowo-Warszawa': 25
      }
      
      // Funkcja do obliczania odległości między dwoma miastami
      const getDistanceBetweenCities = (city1, city2) => {
        if (city1 === city2) return 0
        
        // Normalizuj nazwy miast (usuń białe znaki, zmień na małe litery)
        const normalizeCity = (city) => {
          return city.toLowerCase().trim()
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        }
        
        const normalCity1 = normalizeCity(city1)
        const normalCity2 = normalizeCity(city2)
        
        // Sprawdź bezpośrednie połączenie
        const key1 = `${city1}-${city2}`
        const key2 = `${city2}-${city1}`
        
        if (cityDistances[key1]) return cityDistances[key1]
        if (cityDistances[key2]) return cityDistances[key2]
        
        // Sprawdź z znormalizowanymi nazwami
        const normalKey1 = `${normalCity1}-${normalCity2}`
        const normalKey2 = `${normalCity2}-${normalCity1}`
        
        // Znajdź pasujące klucze w słowniku
        for (const [key, distance] of Object.entries(cityDistances)) {
          const [keyCity1, keyCity2] = key.toLowerCase().split('-')
          if ((keyCity1.includes(normalCity1) && keyCity2.includes(normalCity2)) ||
              (keyCity1.includes(normalCity2) && keyCity2.includes(normalCity1))) {
            return distance
          }
        }
        
        // Sprawdź czy to są miasta z tego samego regionu (krótka odległość)
        const mazowieckie = ['warszawa', 'zielonka', 'pruszków', 'legionowo', 'płock', 'ciechanów', 'siedlce', 'radom', 'mława', 'ostrołęka']
        const podlaskie = ['białystok', 'wysokie mazowieckie', 'augustów', 'suwałki', 'łomża']
        const pomorskie = ['gdańsk', 'słupsk', 'elbląg', 'gdynia', 'sopot']
        
        const isInSameRegion = (city1, city2, region) => {
          return region.some(r => normalCity1.includes(r)) && region.some(r => normalCity2.includes(r))
        }
        
        if (isInSameRegion(normalCity1, normalCity2, mazowieckie)) return 80
        if (isInSameRegion(normalCity1, normalCity2, podlaskie)) return 60
        if (isInSameRegion(normalCity1, normalCity2, pomorskie)) return 50
        
        // Fallback - estymacja na podstawie długości nazw i pierwszych liter
        const baseDist = Math.abs(city1.length - city2.length) * 15 + 150
        const letterDiff = Math.abs(city1.charCodeAt(0) - city2.charCodeAt(0)) * 3
        
        return Math.min(baseDist + letterDiff, 600) // max 600km
      }
      
      let totalDist = 0
      
      // Kalkuluj odległość sekwencyjnie między kolejnymi punktami
      for (let i = 0; i < routeSequence.length - 1; i++) {
        const currentPoint = routeSequence[i]
        const nextPoint = routeSequence[i + 1]
        
        const segmentDistance = getDistanceBetweenCities(currentPoint.city, nextPoint.city)
        totalDist += segmentDistance
        
        console.log(`📍 ${currentPoint.city} → ${nextPoint.city}: ${segmentDistance} km`)
      }
      
      // Dodaj niewielką korektę dla typu punktów (załadunek/rozładunek w tym samym mieście)
      let sameLocationPenalty = 0
      for (let i = 0; i < routeSequence.length - 1; i++) {
        const current = routeSequence[i]
        const next = routeSequence[i + 1]
        
        // Jeśli to są różne typy punktów w tym samym mieście
        if (current.city === next.city && current.type !== next.type) {
          sameLocationPenalty += 5 // 5km na poruszanie się po mieście
        }
      }
      
      totalDist += sameLocationPenalty
      
      // Zaokrąglij do pełnych kilometrów
      const finalDistance = Math.round(totalDist)
      console.log('✅ Finalna odległość:', finalDistance, 'km')
      console.log('📊 Szczegółowa trasa:')
      for (let i = 0; i < routeSequence.length - 1; i++) {
        const current = routeSequence[i]
        const next = routeSequence[i + 1]
        const distance = getDistanceBetweenCities(current.city, next.city)
        console.log(`   ${current.type} ${current.city} → ${next.type} ${next.city}: ${distance} km`)
      }
      console.log(`   Korekta za poruszanie w miastach: ${sameLocationPenalty} km`)
      console.log(`   ŁĄCZNA ODLEGŁOŚĆ: ${finalDistance} km`)
      
      setTotalDistance(finalDistance)
      
      // Pokaż subtelny komunikat o aktualizacji
      setUpdateMessage(`✓ Odległość zaktualizowana: ${finalDistance} km`)
      setTimeout(() => setUpdateMessage(''), 4000)
      
    } catch (error) {
      console.error('❌ Błąd kalkulacji odległości:', error)
      setUpdateMessage('⚠ Błąd aktualizacji odległości')
      setTimeout(() => setUpdateMessage(''), 3000)
    } finally {
      setIsUpdatingDistance(false)
    }
  }

  // Inicjalne wyliczenie odległości (tylko przy wyborze transportów)
  useEffect(() => {
    if (selectedTransports.length > 0 && routeSequence.length >= 2) {
      // Podstawowa kalkulacja przy pierwszym załadowaniu
      let initialDistance = 0
      selectedTransports.forEach(transport => {
        const distance = transport.distanceKm || transport.distance_km || 0
        initialDistance += parseFloat(distance)
      })
      setTotalDistance(Math.round(initialDistance))
    } else {
      setTotalDistance(0)
    }
  }, [selectedTransports])

  // Obsługa podziału kosztów
  const handlePriceBreakdownChange = (transportId, value) => {
    setPriceBreakdown(prev => ({
      ...prev,
      [transportId]: parseFloat(value) || 0
    }))
  }

  // Podział kosztów po równo
  const divideCostsEvenly = () => {
    const total = parseFloat(totalPrice) || 0
    const count = selectedTransports.length
    
    if (count === 0) return
    
    const evenAmount = Math.round((total / count) * 100) / 100 // Zaokrąglij do 2 miejsc
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
  }

  // Sprawdzenie czy suma podziału kosztów jest prawidłowa
  const isBreakdownValid = () => {
    const total = parseFloat(totalPrice) || 0
    const sum = Object.values(priceBreakdown).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.abs(total - sum) < 0.01 // Tolerancja dla zaokrągleń
  }

  // Walidacja formularza
  const isFormValid = () => {
    return (
      selectedTransports.length > 0 &&
      driverInfo.name.trim() &&
      driverInfo.phone.trim() &&
      totalPrice &&
      transportDate &&
      (selectedTransports.length === 1 || isBreakdownValid())
    )
  }

  // Obsługa wysłania formularza
  const handleSubmit = () => {
    console.log('📤 Wysyłanie formularza...')
    
    if (!isFormValid()) {
      console.log('❌ Formularz nie jest prawidłowy')
      alert('Proszę wypełnić wszystkie wymagane pola')
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
      alert('Wystąpił błąd podczas wysyłania: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Nagłówek */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Odpowiedź na zapytania spedycyjne</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Lewa kolumna - Wybór transportów */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Wybierz transporty do połączenia</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {availableTransports.map(transport => (
                    <div
                      key={transport.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedTransports.find(t => t.id === transport.id)
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTransports.find(t => t.id === transport.id) !== undefined}
                          onChange={() => handleTransportToggle(transport)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package size={16} className="text-blue-600" />
                            <span className="font-medium">
                              {transport.orderNumber || `Transport #${transport.id}`}
                            </span>
                            {transport.mpk && (
                              <span className="text-sm text-gray-600">({transport.mpk})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-green-600" />
                              <span>{getLoadingCity(transport)} → {getUnloadingCity(transport)}</span>
                            </div>
                            {(transport.distanceKm || transport.distance_km) && (
                              <div className="mt-1 text-xs">
                                Odległość: {transport.distanceKm || transport.distance_km} km
                              </div>
                            )}
                          </div>
                          
                          {/* Opcje wyboru punktów dla wybranego transportu */}
                          {selectedTransports.find(t => t.id === transport.id) && (
                            <div className="mt-3 p-2 bg-blue-50 rounded border">
                              <div className="text-xs font-medium text-blue-800 mb-2">Które punkty dodać do trasy:</div>
                              <div className="flex gap-4">
                                <label className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    checked={transportOptions[transport.id]?.loading || false}
                                    onChange={() => handleTransportOptionToggle(transport.id, 'loading')}
                                    className="mr-1"
                                  />
                                  <span className="text-green-600">⬆ Załadunek</span>
                                </label>
                                <label className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    checked={transportOptions[transport.id]?.unloading || false}
                                    onChange={() => handleTransportOptionToggle(transport.id, 'unloading')}
                                    className="mr-1"
                                  />
                                  <span className="text-red-600">⬇ Rozładunek</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Podgląd trasy */}
              {routeSequence.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Sekwencja trasy</h3>
                    <div className="flex items-center gap-3">
                      {updateMessage && (
                        <div className={`text-sm px-3 py-1 rounded-full border animate-pulse ${
                          updateMessage.includes('⚠') 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : 'bg-green-100 text-green-700 border-green-200'
                        }`}>
                          {updateMessage}
                        </div>
                      )}
                      <button
                        onClick={updateRouteDistance}
                        disabled={isUpdatingDistance}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        <RefreshCw size={14} className={isUpdatingDistance ? 'animate-spin' : ''} />
                        Aktualizuj odległość
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {routeSequence.map((point, index) => (
                      <div
                        key={point.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          point.type === 'loading' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {point.type === 'loading' ? 'Załadunek' : 'Rozładunek'} - {point.city}
                          </div>
                          <div className="text-xs text-gray-600">
                            {point.company}
                            {point.mpk && ` (${point.mpk})`}
                          </div>
                        </div>

                        {/* Strzałki do zmiany kolejności */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveRoutePoint(index, 'up')}
                            disabled={index === 0}
                            className={`p-1 rounded ${
                              index === 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveRoutePoint(index, 'down')}
                            disabled={index === routeSequence.length - 1}
                            className={`p-1 rounded ${
                              index === routeSequence.length - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totalDistance > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Łączna odległość: {totalDistance.toFixed(1)} km</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prawa kolumna - Dane odpowiedzi */}
            <div className="space-y-6">
              
              {/* Dane kierowcy - bez wyboru z listy */}
              <div>
                <h3 className="text-lg font-medium mb-4">Dane kierowcy i pojazdu</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User size={16} className="inline mr-2" />
                      Imię i nazwisko kierowcy *
                    </label>
                    <input
                      type="text"
                      value={driverInfo.name}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Jan Kowalski"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone size={16} className="inline mr-2" />
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={driverInfo.phone}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="+48 123 456 789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Hash size={16} className="inline mr-2" />
                      Numer pojazdu
                    </label>
                    <input
                      type="text"
                      value={driverInfo.vehicleNumber}
                      onChange={(e) => setDriverInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="WB 12345"
                    />
                  </div>
                </div>
              </div>

              {/* Cena i podział kosztów */}
              <div>
                <h3 className="text-lg font-medium mb-4">Cena transportu</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calculator size={16} className="inline mr-2" />
                    Łączna cena transportu (PLN) *
                  </label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="1000"
                  />
                </div>

                {/* Podział kosztów dla połączonych transportów */}
                {selectedTransports.length > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Podział kosztów między transporty *
                      </label>
                      <button
                        onClick={divideCostsEvenly}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        <Zap size={14} />
                        Podziel po równo
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedTransports.map(transport => (
                        <div key={transport.id} className="flex items-center gap-3">
                          <span className="text-sm w-40 truncate">
                            {transport.orderNumber || `Transport #${transport.id}`}
                          </span>
                          <input
                            type="number"
                            value={priceBreakdown[transport.id] || ''}
                            onChange={(e) => handlePriceBreakdownChange(transport.id, e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-600">PLN</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Sprawdzenie sumy */}
                    {totalPrice && (
                      <div className={`mt-2 text-sm ${
                        isBreakdownValid() ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Suma podziału: {Object.values(priceBreakdown).reduce((acc, val) => acc + (parseFloat(val) || 0), 0).toFixed(2)} PLN
                        {isBreakdownValid() ? ' ✓' : ` (powinno być ${totalPrice} PLN)`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Data transportu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Data transportu *
                </label>
                <input
                  type="date"
                  value={transportDate}
                  onChange={(e) => setTransportDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Opis towaru */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package size={16} className="inline mr-2" />
                  Opis towaru
                </label>
                <textarea
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg h-20 resize-none"
                  placeholder="Opis przewożonego towaru..."
                />
              </div>

              {/* Waga */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Weight size={16} className="inline mr-2" />
                  Łączna waga (kg)
                </label>
                <input
                  type="number"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="1000"
                />
              </div>

              {/* Uwagi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-2" />
                  Uwagi
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg h-20 resize-none"
                  placeholder="Dodatkowe informacje..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stopka */}
        <div className="border-t p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedTransports.length > 0 && (
              <span>Wybrano {selectedTransports.length} transport{selectedTransports.length > 1 ? 'ów' : ''}</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isFormValid()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check size={16} />
              Wyślij odpowiedź
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
