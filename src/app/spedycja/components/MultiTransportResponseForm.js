// src/app/spedycja/components/MultiTransportResponseForm.js
'use client'
import { useState, useEffect } from 'react'
import { X, Check, Package, MapPin, ArrowUp, ArrowDown, Truck, Calculator, Calendar, User, Phone, Hash, FileText, Weight } from 'lucide-react'
import { KIEROWCY } from '../../kalendarz/constants'

export default function MultiTransportResponseForm({ 
  availableTransports = [], 
  onClose, 
  onSubmit 
}) {
  // Stan formularza
  const [selectedTransports, setSelectedTransports] = useState([])
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
    } else {
      // Dodaj transport
      setSelectedTransports([...selectedTransports, transport])
    }
  }

  // Aktualizuj sekwencję trasy gdy zmienią się wybrane transporty
  useEffect(() => {
    if (selectedTransports.length === 0) {
      setRouteSequence([])
      setTotalDistance(0)
      return
    }

    const newSequence = []
    let distance = 0

    selectedTransports.forEach(transport => {
      // Punkt załadunku
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

      // Punkt rozładunku
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

      newSequence.push(loadingPoint, unloadingPoint)
      
      // Dodaj odległość (jeśli dostępna)
      if (transport.distanceKm || transport.distance_km) {
        distance += parseFloat(transport.distanceKm || transport.distance_km || 0)
      }
    })

    setRouteSequence(newSequence)
    setTotalDistance(distance)
  }, [selectedTransports])

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
    return 'Nie podano'
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

  // Obsługa podziału kosztów
  const handlePriceBreakdownChange = (transportId, value) => {
    setPriceBreakdown(prev => ({
      ...prev,
      [transportId]: parseFloat(value) || 0
    }))
  }

  // Sprawdzenie czy suma podziału kosztów jest prawidłowa
  const isBreakdownValid = () => {
    const total = parseFloat(totalPrice) || 0
    const sum = Object.values(priceBreakdown).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.abs(total - sum) < 0.01 // Tolerancja dla zaokrągleń
  }

  // Wybór kierowcy z listy
  const handleDriverSelect = (kierowca) => {
    setDriverInfo({
      name: kierowca.name,
      phone: kierowca.phone,
      vehicleNumber: kierowca.vehicle || ''
    })
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
    if (!isFormValid()) return

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

    onSubmit(responseData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransports.find(t => t.id === transport.id)
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTransportToggle(transport)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTransports.find(t => t.id === transport.id) !== undefined}
                          onChange={() => {}} // Obsługiwane przez onClick div-a
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Podgląd trasy */}
              {routeSequence.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Sekwencja trasy</h3>
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
              
              {/* Dane kierowcy */}
              <div>
                <h3 className="text-lg font-medium mb-4">Dane kierowcy i pojazdu</h3>
                
                {/* Szybki wybór kierowcy */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybierz kierowcę z listy (opcjonalnie)
                  </label>
                  <select
                    onChange={(e) => {
                      const kierowca = KIEROWCY.find(k => k.name === e.target.value)
                      if (kierowca) handleDriverSelect(kierowca)
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Wybierz kierowcę --</option>
                    {KIEROWCY.map(kierowca => (
                      <option key={kierowca.name} value={kierowca.name}>
                        {kierowca.name} - {kierowca.phone}
                      </option>
                    ))}
                  </select>
                </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Podział kosztów między transporty *
                    </label>
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
