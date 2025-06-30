// src/app/kurier/components/AdvancedComponents.js
// 🚀 MEGA ADVANCED COMPONENTS SYSTEM - Najzaawansowsze komponenty React dla systemu kurierskiego
'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  Package, Truck, MapPin, Clock, CheckCircle, AlertCircle, Download, 
  Eye, RefreshCw, Calculator, Shield, CreditCard, Globe, Star, Target,
  TrendingUp, BarChart3, PieChart, Activity, Zap, Award, Users, Timer,
  Hash, Percent, DollarSign, Calendar, Filter, Search, Upload, FileDown,
  Bell, Settings, Map, Route, Navigation, Compass, Gauge, Wifi, WifiOff,
  PlayCircle, PauseCircle, StopCircle, FastForward, Rewind, SkipForward,
  Volume2, VolumeX, Monitor, Smartphone, Tablet, Printer, QrCode, Scan,
  Copy, Share, ExternalLink, Bookmark, Heart, ThumbsUp, MessageSquare,
  Send, Mail, Phone, User, Building, Home, Car, Plane, Ship, Train
} from 'lucide-react'

// ============================================================================
// 🎯 REAL-TIME TRACKING COMPONENT
// ============================================================================
export function RealTimeTrackingWidget({ shipmentNumber, refreshInterval = 30000 }) {
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isLive, setIsLive] = useState(true)
  const intervalRef = useRef(null)

  const fetchTrackingData = useCallback(async () => {
    if (!shipmentNumber) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/kurier/tracking/${shipmentNumber}`)
      const data = await response.json()
      
      if (data.success) {
        setTrackingData(data)
        setError(null)
        setLastUpdate(new Date())
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }, [shipmentNumber])

  useEffect(() => {
    fetchTrackingData()
    
    if (isLive && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTrackingData, refreshInterval)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchTrackingData, isLive, refreshInterval])

  const toggleLiveUpdates = () => {
    setIsLive(!isLive)
    if (!isLive) {
      fetchTrackingData()
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return 'text-green-600 bg-green-100'
      case 'IN_TRANSIT': return 'text-blue-600 bg-blue-100'
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      case 'EXCEPTION': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return <CheckCircle className="w-4 h-4" />
      case 'IN_TRANSIT': return <Truck className="w-4 h-4" />
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'EXCEPTION': return <AlertCircle className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  if (loading && !trackingData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 font-medium">Błąd śledzenia</span>
          </div>
          <button
            onClick={fetchTrackingData}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Ponów
          </button>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="font-semibold">Śledzenie na żywo</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleLiveUpdates}
              className={`flex items-center px-2 py-1 rounded text-xs ${
                isLive ? 'bg-green-500' : 'bg-gray-500'
              }`}
            >
              {isLive ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isLive ? 'LIVE' : 'OFF'}
            </button>
            <button
              onClick={fetchTrackingData}
              disabled={loading}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-1 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-1">#{shipmentNumber}</p>
      </div>

      {/* Status */}
      {trackingData && (
        <div className="p-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.status)}`}>
            {getStatusIcon(trackingData.status)}
            <span className="ml-2">{trackingData.status || 'Nieznany'}</span>
          </div>
          
          {/* Last update */}
          {lastUpdate && (
            <p className="text-gray-500 text-xs mt-2">
              Ostatnia aktualizacja: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
          
          {/* Events timeline */}
          {trackingData.events && trackingData.events.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Historia przesyłki</h4>
              <div className="space-y-3">
                {trackingData.events.slice(0, 3).map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-gray-900">{event.description}</p>
                      <p className="text-xs text-gray-500">{event.date} • {event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Estimated delivery */}
          {trackingData.estimatedDelivery && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-900">
                  Szacowana dostawa: {new Date(trackingData.estimatedDelivery).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 💰 REAL-TIME PRICING CALCULATOR
// ============================================================================
export function PricingCalculatorWidget({ onPriceCalculated }) {
  const [formData, setFormData] = useState({
    fromPostalCode: '',
    toPostalCode: '',
    service: 'AH',
    packages: [{ weight: '', length: '', width: '', height: '', quantity: 1 }]
  })
  const [pricing, setPricing] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')

  const calculatePrice = async () => {
    if (!formData.fromPostalCode || !formData.toPostalCode) {
      setError('Wprowadź kody pocztowe')
      return
    }

    if (!formData.packages[0].weight) {
      setError('Wprowadź wagę paczki')
      return
    }

    setCalculating(true)
    setError('')

    try {
      const response = await fetch('/api/kurier/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipper: { postalCode: formData.fromPostalCode },
          receiver: { postalCode: formData.toPostalCode },
          service: { product: formData.service },
          pieceList: formData.packages.map(pkg => ({
            weight: parseFloat(pkg.weight),
            length: parseInt(pkg.length) || 10,
            width: parseInt(pkg.width) || 10,
            height: parseInt(pkg.height) || 10,
            quantity: pkg.quantity
          }))
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPricing(data.pricing)
        onPriceCalculated?.(data.pricing)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Błąd podczas kalkulacji ceny')
    } finally {
      setCalculating(false)
    }
  }

  const addPackage = () => {
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, { weight: '', length: '', width: '', height: '', quantity: 1 }]
    }))
  }

  const removePackage = (index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }))
  }

  const updatePackage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => i === index ? { ...pkg, [field]: value } : pkg)
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Calculator className="w-6 h-6 text-green-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Kalkulator cen DHL</h3>
      </div>

      {/* Route */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kod pocztowy nadawcy
          </label>
          <input
            type="text"
            value={formData.fromPostalCode}
            onChange={(e) => setFormData(prev => ({ ...prev, fromPostalCode: e.target.value }))}
            placeholder="15-123"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kod pocztowy odbiorcy
          </label>
          <input
            type="text"
            value={formData.toPostalCode}
            onChange={(e) => setFormData(prev => ({ ...prev, toPostalCode: e.target.value }))}
            placeholder="00-123"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Service */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Usługa DHL
        </label>
        <select
          value={formData.service}
          onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="AH">DHL Domestic</option>
          <option value="09">DHL Domestic 9</option>
          <option value="12">DHL Domestic 12</option>
          <option value="SP">DHL ServicePoint</option>
        </select>
      </div>

      {/* Packages */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Paczki</label>
          <button
            type="button"
            onClick={addPackage}
            className="text-green-600 hover:text-green-800 text-sm flex items-center"
          >
            <Package className="w-4 h-4 mr-1" />
            Dodaj paczkę
          </button>
        </div>
        
        {formData.packages.map((pkg, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Paczka #{index + 1}</span>
              {formData.packages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePackage(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Usuń
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Waga (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pkg.weight}
                  onChange={(e) => updatePackage(index, 'weight', e.target.value)}
                  placeholder="1.0"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Dł. (cm)</label>
                <input
                  type="number"
                  value={pkg.length}
                  onChange={(e) => updatePackage(index, 'length', e.target.value)}
                  placeholder="20"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Szer. (cm)</label>
                <input
                  type="number"
                  value={pkg.width}
                  onChange={(e) => updatePackage(index, 'width', e.target.value)}
                  placeholder="15"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Wys. (cm)</label>
                <input
                  type="number"
                  value={pkg.height}
                  onChange={(e) => updatePackage(index, 'height', e.target.value)}
                  placeholder="10"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ilość</label>
                <input
                  type="number"
                  min="1"
                  value={pkg.quantity}
                  onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calculate button */}
      <button
        onClick={calculatePrice}
        disabled={calculating}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center"
      >
        {calculating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Obliczam...
          </>
        ) : (
          <>
            <Calculator className="w-4 h-4 mr-2" />
            Oblicz cenę
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Pricing result */}
      {pricing && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-green-900">Cena przesyłki</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">
                {pricing.totalPrice} {pricing.currency}
              </div>
              {pricing.netPrice && (
                <div className="text-sm text-green-600">
                  netto: {pricing.netPrice} {pricing.currency}
                </div>
              )}
            </div>
          </div>
          
          {pricing.breakdown && (
            <div className="mt-3 text-sm text-green-700">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(pricing.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span>{value} {pricing.currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {pricing.transitTime && (
            <div className="mt-2 text-sm text-green-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Czas dostawy: {pricing.transitTime}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 🏷️ LABEL MANAGER COMPONENT
// ============================================================================
export function LabelManagerWidget({ shipmentIds = [], onLabelsGenerated }) {
  const [selectedShipments, setSelectedShipments] = useState(new Set())
  const [selectedLabelTypes, setSelectedLabelTypes] = useState(new Set(['BLP']))
  const [generating, setGenerating] = useState(false)
  const [labels, setLabels] = useState([])
  const [error, setError] = useState('')

  const labelTypes = [
    { id: 'BLP', name: 'Etykieta BLP (PDF)', description: 'Standardowa etykieta PDF' },
    { id: 'ZBLP', name: 'Etykieta ZBLP (ZPL)', description: 'Dla drukarek Zebra' },
    { id: 'ZBLP300', name: 'Etykieta ZBLP300 (ZPL)', description: 'Zebra 300 DPI' },
    { id: 'LP', name: 'List przewozowy (PDF)', description: 'Pełny list przewozowy' }
  ]

  const toggleShipmentSelection = (shipmentId) => {
    const newSelected = new Set(selectedShipments)
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId)
    } else {
      newSelected.add(shipmentId)
    }
    setSelectedShipments(newSelected)
  }

  const toggleLabelType = (labelType) => {
    const newSelected = new Set(selectedLabelTypes)
    if (newSelected.has(labelType)) {
      newSelected.delete(labelType)
    } else {
      newSelected.add(labelType)
    }
    setSelectedLabelTypes(newSelected)
  }

  const selectAllShipments = () => {
    if (selectedShipments.size === shipmentIds.length) {
      setSelectedShipments(new Set())
    } else {
      setSelectedShipments(new Set(shipmentIds))
    }
  }

  const generateLabels = async () => {
    if (selectedShipments.size === 0) {
      setError('Wybierz przesyłki')
      return
    }

    if (selectedLabelTypes.size === 0) {
      setError('Wybierz typy etykiet')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/kurier/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: Array.from(selectedShipments),
          labelTypes: Array.from(selectedLabelTypes)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setLabels(data.labels)
        onLabelsGenerated?.(data.labels)
        
        // Auto-download pierwszej etykiety
        if (data.labels.length > 0) {
          const firstLabel = data.labels[0]
          window.open(firstLabel.downloadUrl, '_blank')
        }
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Błąd podczas generowania etykiet')
    } finally {
      setGenerating(false)
    }
  }

  const downloadLabel = (label) => {
    window.open(label.downloadUrl, '_blank')
  }

  const downloadAllLabels = () => {
    labels.forEach(label => {
      setTimeout(() => downloadLabel(label), 100)
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Printer className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Menedżer etykiet</h3>
        </div>
        {labels.length > 0 && (
          <button
            onClick={downloadAllLabels}
            className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
          >
            <Download className="w-4 h-4 mr-1" />
            Pobierz wszystkie
          </button>
        )}
      </div>

      {/* Shipment selection */}
      {shipmentIds.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Przesyłki ({selectedShipments.size}/{shipmentIds.length})
            </label>
            <button
              onClick={selectAllShipments}
              className="text-purple-600 hover:text-purple-800 text-sm"
            >
              {selectedShipments.size === shipmentIds.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </button>
          </div>
          
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
            {shipmentIds.map((shipmentId, index) => (
              <label key={shipmentId} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedShipments.has(shipmentId)}
                  onChange={() => toggleShipmentSelection(shipmentId)}
                  className="mr-3 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">#{shipmentId}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Label type selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Typy etykiet ({selectedLabelTypes.size})
        </label>
        
        <div className="space-y-2">
          {labelTypes.map((labelType) => (
            <label key={labelType.id} className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLabelTypes.has(labelType.id)}
                onChange={() => toggleLabelType(labelType.id)}
                className="mt-1 mr-3 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{labelType.name}</div>
                <div className="text-sm text-gray-500">{labelType.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generateLabels}
        disabled={generating || selectedShipments.size === 0 || selectedLabelTypes.size === 0}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center mb-4"
      >
        {generating ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Generuję etykiety...
          </>
        ) : (
          <>
            <Printer className="w-5 h-5 mr-2" />
            Generuj etykiety
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Generated labels */}
      {labels.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Wygenerowane etykiety</h4>
          
          {labels.map((label, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <QrCode className="w-5 h-5 text-gray-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">
                    {label.labelType} - #{label.shipmentId}
                  </div>
                  <div className="text-sm text-gray-500">
                    {label.size ? `${(label.size / 1024).toFixed(1)} KB` : ''} • 
                    {new Date(label.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadLabel(label)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Pobierz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 🚚 COURIER BOOKING WIDGET
// ============================================================================
export function CourierBookingWidget({ shipmentIds = [], onCourierBooked }) {
  const [bookingData, setBookingData] = useState({
    pickupDate: '',
    pickupTimeFrom: '09:00',
    pickupTimeTo: '17:00',
    additionalInfo: '',
    courierWithLabel: false
  })
  const [availableSlots, setAvailableSlots] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Sprawdź dostępne terminy
  const checkAvailability = async (date) => {
    if (!date) return
    
    setCheckingAvailability(true)
    try {
      const response = await fetch(`/api/kurier/courier/availability?date=${date}&postalCode=15123`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableSlots(data.slots || [])
      }
    } catch (err) {
      console.error('Error checking availability:', err)
    } finally {
      setCheckingAvailability(false)
    }
  }

  useEffect(() => {
    if (bookingData.pickupDate) {
      checkAvailability(bookingData.pickupDate)
    }
  }, [bookingData.pickupDate])

  const bookCourier = async () => {
    if (!bookingData.pickupDate || !bookingData.pickupTimeFrom || !bookingData.pickupTimeTo) {
      setError('Uzupełnij wszystkie wymagane pola')
      return
    }

    setBooking(true)
    setError('')
    setSuccess('')

    try {
      const requestData = {
        ...bookingData,
        shipmentIds: shipmentIds.length > 0 ? shipmentIds : undefined
      }

      const response = await fetch('/api/kurier/courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Kurier zamówiony! Numer zamówienia: ${data.orderIds?.join(', ')}`)
        onCourierBooked?.(data)
        
        // Reset form
        setBookingData({
          pickupDate: '',
          pickupTimeFrom: '09:00',
          pickupTimeTo: '17:00',
          additionalInfo: '',
          courierWithLabel: false
        })
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Błąd podczas zamawiania kuriera')
    } finally {
      setBooking(false)
    }
  }

  // Generuj dostępne daty (dziś + 7 dni)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  const timeSlots = [
    { from: '08:00', to: '12:00', label: 'Rano (08:00-12:00)' },
    { from: '12:00', to: '16:00', label: 'Popołudnie (12:00-16:00)' },
    { from: '16:00', to: '18:00', label: 'Wieczór (16:00-18:00)' },
    { from: '09:00', to: '17:00', label: 'Cały dzień (09:00-17:00)' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Truck className="w-6 h-6 text-orange-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Zamów kuriera DHL</h3>
      </div>

      {shipmentIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <Package className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-blue-800 text-sm">
              Kurier dla {shipmentIds.length} przesyłek: {shipmentIds.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Date selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data odbioru <span className="text-red-500">*</span>
        </label>
        <select
          value={bookingData.pickupDate}
          onChange={(e) => setBookingData(prev => ({ ...prev, pickupDate: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">Wybierz datę</option>
          {getAvailableDates().map(date => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Time selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Przedział czasowy <span className="text-red-500">*</span>
        </label>
        
        {checkingAvailability ? (
          <div className="p-3 text-center text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Sprawdzam dostępność...
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map((slot, index) => (
              <label key={index} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="timeSlot"
                  checked={bookingData.pickupTimeFrom === slot.from && bookingData.pickupTimeTo === slot.to}
                  onChange={() => setBookingData(prev => ({
                    ...prev,
                    pickupTimeFrom: slot.from,
                    pickupTimeTo: slot.to
                  }))}
                  className="mr-3 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-gray-700">{slot.label}</span>
                {availableSlots.some(s => s.from === slot.from && s.to === slot.to && !s.available) && (
                  <span className="ml-2 text-xs text-red-500">(niedostępne)</span>
                )}
              </label>
            ))}
          </div>
        )}

        {/* Custom time */}
        <div className="mt-3 p-3 border border-gray-200 rounded-lg">
          <label className="flex items-center mb-2">
            <input
              type="radio"
              name="timeSlot"
              checked={!timeSlots.some(slot => 
                bookingData.pickupTimeFrom === slot.from && bookingData.pickupTimeTo === slot.to
              )}
              onChange={() => {}}
              className="mr-2 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-gray-700 text-sm">Niestandardowy czas</span>
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Od</label>
              <input
                type="time"
                value={bookingData.pickupTimeFrom}
                onChange={(e) => setBookingData(prev => ({ ...prev, pickupTimeFrom: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Do</label>
              <input
                type="time"
                value={bookingData.pickupTimeTo}
                onChange={(e) => setBookingData(prev => ({ ...prev, pickupTimeTo: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional options */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dodatkowe informacje
        </label>
        <textarea
          value={bookingData.additionalInfo}
          onChange={(e) => setBookingData(prev => ({ ...prev, additionalInfo: e.target.value }))}
          placeholder="Informacje dla kuriera (opcjonalne)"
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div className="mb-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={bookingData.courierWithLabel}
            onChange={(e) => setBookingData(prev => ({ ...prev, courierWithLabel: e.target.checked }))}
            className="mr-3 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-gray-700">Kurier ma przyjechać z etykietą</span>
        </label>
      </div>

      {/* Book button */}
      <button
        onClick={bookCourier}
        disabled={booking || !bookingData.pickupDate}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center"
      >
        {booking ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Zamawianie kuriera...
          </>
        ) : (
          <>
            <Truck className="w-5 h-5 mr-2" />
            Zamów kuriera DHL
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 📊 BULK OPERATIONS PANEL
// ============================================================================
export function BulkOperationsPanel({ selectedShipments = [], onOperationComplete }) {
  const [operation, setOperation] = useState('')
  const [operationData, setOperationData] = useState({})
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const operations = [
    { 
      id: 'track', 
      name: 'Śledź przesyłki', 
      icon: MapPin, 
      color: 'blue',
      description: 'Sprawdź aktualny status wszystkich wybranych przesyłek'
    },
    { 
      id: 'get_labels', 
      name: 'Pobierz etykiety', 
      icon: Printer, 
      color: 'purple',
      description: 'Wygeneruj i pobierz etykiety dla wybranych przesyłek'
    },
    { 
      id: 'book_courier', 
      name: 'Zamów kuriera', 
      icon: Truck, 
      color: 'orange',
      description: 'Zamów kuriera DHL dla wszystkich wybranych przesyłek'
    },
    { 
      id: 'sync_status', 
      name: 'Synchronizuj status', 
      icon: RefreshCw, 
      color: 'green',
      description: 'Zsynchronizuj statusy z systemem DHL'
    },
    { 
      id: 'delete', 
      name: 'Usuń przesyłki', 
      icon: AlertCircle, 
      color: 'red',
      description: 'Usuń wybrane przesyłki z systemu DHL (NIEODWRACALNE)'
    }
  ]

  const executeOperation = async () => {
    if (!operation || selectedShipments.length === 0) {
      setError('Wybierz operację i przesyłki')
      return
    }

    setProcessing(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('/api/kurier/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: operation,
          shipmentIds: selectedShipments,
          ...operationData
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResults(data)
        onOperationComplete?.(data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Błąd podczas wykonywania operacji')
    } finally {
      setProcessing(false)
    }
  }

  const getOperationColor = (op) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[op.color] || colors.blue
  }

  if (selectedShipments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Operacje masowe</h3>
          <p>Wybierz przesyłki aby wykonać operacje masowe</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Target className="w-6 h-6 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Operacje masowe ({selectedShipments.length} przesyłek)
        </h3>
      </div>

      {/* Operation selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Wybierz operację
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {operations.map((op) => {
            const IconComponent = op.icon
            return (
              <label 
                key={op.id} 
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  operation === op.id 
                    ? getOperationColor(op) 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="operation"
                  value={op.id}
                  checked={operation === op.id}
                  onChange={(e) => setOperation(e.target.value)}
                  className="mt-1 sr-only"
                />
                <IconComponent className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{op.name}</div>
                  <div className="text-sm opacity-75 mt-1">{op.description}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Operation-specific options */}
      {operation === 'get_labels' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Typy etykiet do pobrania
          </label>
          <div className="space-y-2">
            {['BLP', 'ZBLP', 'LP'].map(labelType => (
              <label key={labelType} className="flex items-center">
                <input
                  type="checkbox"
                  checked={operationData.labelTypes?.includes(labelType)}
                  onChange={(e) => {
                    const labelTypes = operationData.labelTypes || []
                    if (e.target.checked) {
                      setOperationData(prev => ({
                        ...prev,
                        labelTypes: [...labelTypes, labelType]
                      }))
                    } else {
                      setOperationData(prev => ({
                        ...prev,
                        labelTypes: labelTypes.filter(t => t !== labelType)
                      }))
                    }
                  }}
                  className="mr-2 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{labelType}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {operation === 'book_courier' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data odbioru
              </label>
              <input
                type="date"
                value={operationData.pickupDate || ''}
                onChange={(e) => setOperationData(prev => ({ ...prev, pickupDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Przedział czasowy
              </label>
              <div className="flex space-x-2">
                <input
                  type="time"
                  value={operationData.pickupTimeFrom || '09:00'}
                  onChange={(e) => setOperationData(prev => ({ ...prev, pickupTimeFrom: e.target.value }))}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="time"
                  value={operationData.pickupTimeTo || '17:00'}
                  onChange={(e) => setOperationData(prev => ({ ...prev, pickupTimeTo: e.target.value }))}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {operation === 'delete' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <div className="font-medium text-red-900">Uwaga!</div>
              <div className="text-red-700 text-sm">
                Usunięcie przesyłek z DHL jest nieodwracalne. Upewnij się, że chcesz kontynuować.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={executeOperation}
        disabled={processing || !operation}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center mb-4"
      >
        {processing ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Wykonuję operację...
          </>
        ) : (
          <>
            <Target className="w-5 h-5 mr-2" />
            Wykonaj operację
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="font-medium text-green-900">Operacja zakończona</span>
            </div>
            <div className="text-sm text-green-700">
              {results.successCount}/{results.totalProcessed} pomyślnych
            </div>
          </div>
          
          <p className="text-green-700 text-sm mb-3">{results.summary}</p>
          
          {results.failureCount > 0 && (
            <div className="mt-3">
              <details className="text-sm">
                <summary className="text-red-700 cursor-pointer">
                  Błędy ({results.failureCount})
                </summary>
                <div className="mt-2 space-y-1">
                  {results.results?.filter(r => !r.success).map((result, index) => (
                    <div key={index} className="text-red-600">
                      #{result.shipmentId}: {result.error}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 📈 ANALYTICS DASHBOARD WIDGET
// ============================================================================
export function AnalyticsDashboardWidget({ dateRange = 30 }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Symulacja danych analitycznych
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setAnalytics({
        overview: {
          totalShipments: 1247,
          totalCost: 45670.50,
          averageCost: 36.65,
          deliveryRate: 98.2,
          avgDeliveryTime: 2.3
        },
        trends: {
          shipmentsGrowth: 15.3,
          costGrowth: -8.7,
          deliveryTimeImprovement: 12.1
        },
        services: [
          { name: 'DHL Domestic', count: 856, percentage: 68.7, avgCost: 32.50 },
          { name: 'DHL Domestic 9', count: 234, percentage: 18.8, avgCost: 45.20 },
          { name: 'DHL Domestic 12', count: 98, percentage: 7.9, avgCost: 52.10 },
          { name: 'ServicePoint', count: 59, percentage: 4.7, avgCost: 28.90 }
        ],
        topDestinations: [
          { city: 'Warszawa', count: 324, percentage: 26.0 },
          { city: 'Kraków', count: 187, percentage: 15.0 },
          { city: 'Gdańsk', count: 142, percentage: 11.4 },
          { city: 'Wrocław', count: 98, percentage: 7.9 },
          { city: 'Poznań', count: 89, percentage: 7.1 }
        ]
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Przegląd', icon: BarChart3 },
    { id: 'services', name: 'Usługi', icon: PieChart },
    { id: 'destinations', name: 'Destynacje', icon: MapPin },
    { id: 'trends', name: 'Trendy', icon: TrendingUp }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="w-6 h-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h3>
          </div>
          <div className="text-sm text-gray-500">
            Ostatnie {dateRange} dni
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-1" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">Przesyłki</span>
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {analytics.overview.totalShipments.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  +{analytics.trends.shipmentsGrowth}% vs poprzedni okres
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">Łączny koszt</span>
                </div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  {analytics.overview.totalCost.toLocaleString()} zł
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {analytics.trends.costGrowth}% vs poprzedni okres
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Calculator className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">Średni koszt</span>
                </div>
                <div className="text-2xl font-bold text-purple-700 mt-1">
                  {analytics.overview.averageCost.toFixed(2)} zł
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-sm font-medium text-orange-900">Dostarczone</span>
                </div>
                <div className="text-2xl font-bold text-orange-700 mt-1">
                  {analytics.overview.deliveryRate}%
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-900">Śr. czas dostawy</span>
                </div>
                <div className="text-2xl font-bold text-indigo-700 mt-1">
                  {analytics.overview.avgDeliveryTime} dni
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  -{analytics.trends.deliveryTimeImprovement}% lepiej
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Rozkład usług DHL</h4>
            <div className="space-y-4">
              {analytics.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center flex-1">
                    <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: `hsl(${index * 90}, 70%, 50%)` }}></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500">{service.count} przesyłek • Średnio {service.avgCost} zł</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{service.percentage}%</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${service.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'destinations' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Top destynacje</h4>
            <div className="space-y-3">
              {analytics.topDestinations.map((destination, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{destination.city}</div>
                      <div className="text-sm text-gray-500">{destination.count} przesyłek</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{destination.percentage}%</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${destination.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Trendy i zmiany</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">+{analytics.trends.shipmentsGrowth}%</div>
                <div className="text-sm text-green-600">Wzrost liczby przesyłek</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2 transform rotate-180" />
                <div className="text-2xl font-bold text-blue-700">{analytics.trends.costGrowth}%</div>
                <div className="text-sm text-blue-600">Zmiana kosztów</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Timer className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">-{analytics.trends.deliveryTimeImprovement}%</div>
                <div className="text-sm text-purple-600">Poprawa czasu dostawy</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export all components
export default {
  RealTimeTrackingWidget,
  PricingCalculatorWidget,
  LabelManagerWidget,
  CourierBookingWidget,
  BulkOperationsPanel,
  AnalyticsDashboardWidget
}
