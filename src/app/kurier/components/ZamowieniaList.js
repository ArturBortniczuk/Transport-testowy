// src/app/kurier/components/ZamowieniaList.js
// 🚀 MEGA ZAMÓWIENIA LIST - Zaawansowana lista z tracking, etykietami i full funkcjonalnością
'use client'
import { useState, useEffect } from 'react'
import { 
  ChevronDown, ChevronUp, Package, User, Building2, MapPin, Phone, Mail, 
  Clock, CheckCircle, AlertCircle, Truck, RefreshCw, Download, Printer,
  Eye, Edit, Trash2, Calendar, DollarSign, Shield, CreditCard, Globe,
  ExternalLink, Copy, QrCode, FileText, Archive, Star, Filter,
  TrendingUp, BarChart3, Target, Award, Zap, Camera, Headphones
} from 'lucide-react'

export default function ZamowieniaList({ 
  zamowienia, 
  onZatwierdz, 
  onUsun, 
  userRole, 
  canApprove, 
  loading, 
  onRefresh, 
  processingOrders = new Set(),
  isArchive = false 
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(null)
  const [labelGenerating, setLabelGenerating] = useState(new Set())
  const [courierBooking, setCourierBooking] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(new Set())
  const [bulkActions, setBulkActions] = useState(false)
  const [priceCalculating, setPriceCalculating] = useState(new Set())
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)

  // Bulk selection
  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const selectAllOrders = () => {
    if (selectedOrders.size === zamowienia.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(zamowienia.map(z => z.id)))
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nie podano'
    return new Date(dateString).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status, notes = {}) => {
    const dhlStatus = notes.dhl?.status
    const courierInfo = notes.courier
    
    switch(status) {
      case 'new':
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">Nowe</span>
            {courierInfo && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                🚚 Kurier zamówiony
              </span>
            )}
          </div>
        )
      case 'approved':
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">Zatwierdzone</span>
            {dhlStatus === 'sent_to_dhl' && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                📤 W DHL
              </span>
            )}
          </div>
        )
      case 'sent':
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">Wysłane</span>
            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              📍 W trasie
            </span>
          </div>
        )
      case 'delivered':
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">Dostarczone</span>
            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              ✅ Odebrane
            </span>
          </div>
        )
      default:
        return <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const parseNotes = (notesString) => {
    try {
      return JSON.parse(notesString || '{}')
    } catch (error) {
      return {}
    }
  }

  const getServiceName = (productCode) => {
    const services = {
      'AH': 'Przesyłka krajowa',
      '09': 'Domestic Express 9',
      '12': 'Domestic Express 12',
      'DW': 'Doręczenie wieczorne',
      'SP': 'Doręczenie do punktu',
      'EK': 'Connect',
      'PI': 'International',
      'PR': 'Premium',
      'CP': 'Connect Plus',
      'CM': 'Connect Plus Pallet'
    }
    return services[productCode] || productCode
  }

  // Real-time tracking refresh
  const handleTrackingRefresh = async (trackingNumber) => {
    try {
      setTrackingLoading(trackingNumber)
      
      const response = await fetch(`/api/kurier/tracking/${trackingNumber}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Status śledzenia odświeżony!\nStatus: ${data.status}`)
        if (onRefresh) {
          onRefresh()
        }
      } else {
        alert('Błąd odświeżania statusu: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd odświeżania trackingu:', error)
      alert('Wystąpił błąd podczas odświeżania statusu')
    } finally {
      setTrackingLoading(null)
    }
  }

  // Generate labels
  const handleGenerateLabels = async (zamowienieId, labelTypes = ['BLP']) => {
    try {
      setLabelGenerating(prev => new Set([...prev, zamowienieId]))
      
      // Znajdź zamówienie i sprawdź czy ma DHL shipment number
      const zamowienie = zamowienia.find(z => z.id === zamowienieId)
      if (!zamowienie) {
        alert('Nie znaleziono zamówienia')
        return
      }

      const notes = parseNotes(zamowienie.notes)
      if (!notes.dhl?.shipmentNumber) {
        alert('To zamówienie nie ma jeszcze numeru przesyłki DHL')
        return
      }
      
      const response = await fetch('/api/kurier/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentIds: [notes.dhl.shipmentNumber],
          labelTypes: labelTypes
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Automatically download the first label
        if (data.labels && data.labels.length > 0) {
          const label = data.labels[0]
          // Create download URL for the label
          const downloadUrl = `/api/kurier/labels/download/${notes.dhl.shipmentNumber}/${labelTypes[0]}`
          window.open(downloadUrl, '_blank')
        }
        
        alert(`Wygenerowano ${data.labels.length} etykiet!`)
      } else {
        alert('Błąd generowania etykiet: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd generowania etykiet:', error)
      alert('Wystąpił błąd podczas generowania etykiet')
    } finally {
      setLabelGenerating(prev => {
        const newSet = new Set(prev)
        newSet.delete(zamowienieId)
        return newSet
      })
    }
  }

  // Book courier for shipment
  const handleBookCourier = async (zamowienieId) => {
    try {
      setCourierBooking(zamowienieId)
      
      // Znajdź zamówienie i sprawdź czy ma DHL shipment number
      const zamowienie = zamowienia.find(z => z.id === zamowienieId)
      if (!zamowienie) {
        alert('Nie znaleziono zamówienia')
        return
      }

      const notes = parseNotes(zamowienie.notes)
      if (!notes.dhl?.shipmentNumber) {
        alert('To zamówienie nie ma jeszcze numeru przesyłki DHL')
        return
      }
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const pickupDate = tomorrow.toISOString().split('T')[0]
      
      const response = await fetch('/api/kurier/courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentIds: [notes.dhl.shipmentNumber],
          pickupDate: pickupDate,
          pickupTimeFrom: '10:00',
          pickupTimeTo: '16:00',
          additionalInfo: 'Zamówienie kuriera z systemu',
          courierWithLabel: false
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Kurier zamówiony!\nNumer zlecenia: ${data.orderIds.join(', ')}`)
        if (onRefresh) {
          onRefresh()
        }
      } else {
        alert('Błąd zamawiania kuriera: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd zamawiania kuriera:', error)
      alert('Wystąpił błąd podczas zamawiania kuriera')
    } finally {
      setCourierBooking(null)
    }
  }

  // Calculate real-time price
  const handleCalculatePrice = async (zamowienieId) => {
    try {
      setPriceCalculating(prev => new Set([...prev, zamowienieId]))
      
      const zamowienie = zamowienia.find(z => z.id === zamowienieId)
      if (!zamowienie) return
      
      const notes = parseNotes(zamowienie.notes)
      
      // Przygotuj dane do kalkulacji
      const priceRequest = {
        shipper: {
          country: 'PL',
          name: notes.nadawca?.nazwa || 'Grupa Eltron',
          postalCode: notes.nadawca?.adres?.split(',')[1]?.trim().replace(/[^\d]/g, '') || '15169',
          city: notes.nadawca?.adres?.split(',')[2]?.trim() || 'Białystok',
          street: notes.nadawca?.adres?.split(',')[0]?.trim() || 'Wysockiego',
          houseNumber: '69B'
        },
        receiver: {
          country: 'PL',
          addressType: 'B',
          name: zamowienie.recipient_name,
          postalCode: zamowienie.recipient_address.match(/\d{2}-?\d{3}/)?.[0]?.replace(/[^\d]/g, '') || '00001',
          city: zamowienie.recipient_address.split(',')[1]?.trim() || 'Warszawa',
          street: zamowienie.recipient_address.split(',')[0]?.trim() || 'Testowa',
          houseNumber: '1'
        },
        service: {
          product: notes.uslugaDHL || 'AH',
          deliveryEvening: false,
          insurance: false,
          collectOnDelivery: false
        },
        pieceList: [{
          type: 'PACKAGE',
          weight: parseFloat(notes.przesylka?.waga) || 1,
          width: parseInt(notes.przesylka?.wymiary?.szerokosc) || 10,
          height: parseInt(notes.przesylka?.wymiary?.wysokosc) || 10,
          length: parseInt(notes.przesylka?.wymiary?.dlugosc) || 10,
          quantity: 1
        }]
      }
      
      const response = await fetch('/api/kurier/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(priceRequest),
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`💰 Aktualna cena przesyłki:\n\nNetto: ${data.price} PLN\nBrutto: ${data.breakdown?.totalGross || 'N/A'} PLN\nDopłata paliwowa: ${data.fuelSurcharge}%`)
      } else {
        alert('Błąd kalkulacji ceny: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd kalkulacji ceny:', error)
      alert('Wystąpił błąd podczas kalkulacji ceny')
    } finally {
      setPriceCalculating(prev => {
        const newSet = new Set(prev)
        newSet.delete(zamowienieId)
        return newSet
      })
    }
  }

  // Bulk actions
  const handleBulkLabels = async () => {
    if (selectedOrders.size === 0) return
    
    try {
      // Zbierz shipment numbers z wybranych zamówień
      const shipmentNumbers = []
      const errors = []
      
      for (const orderId of selectedOrders) {
        const zamowienie = zamowienia.find(z => z.id === orderId)
        if (zamowienie) {
          const notes = parseNotes(zamowienie.notes)
          if (notes.dhl?.shipmentNumber) {
            shipmentNumbers.push(notes.dhl.shipmentNumber)
          } else {
            errors.push(`Zamówienie ${orderId} nie ma numeru DHL`)
          }
        }
      }
      
      if (errors.length > 0) {
        alert(`Błędy:\n${errors.join('\n')}`)
        return
      }
      
      if (shipmentNumbers.length === 0) {
        alert('Brak zamówień z numerami DHL do pobrania etykiet')
        return
      }
      
      const response = await fetch('/api/kurier/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentIds: shipmentNumbers,
          labelTypes: ['BLP', 'LP']
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Try to download as ZIP if supported
        try {
          const zipResponse = await fetch('/api/kurier/labels/download/bulk/zip', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shipmentIds: shipmentNumbers,
              labelTypes: ['BLP', 'LP']
            }),
          })
          
          if (zipResponse.ok) {
            const blob = await zipResponse.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `DHL_Labels_Bulk_${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          } else {
            // Fallback to individual downloads
            data.labels.forEach((label, index) => {
              setTimeout(() => {
                const downloadUrl = `/api/kurier/labels/download/${label.shipmentId}/${label.labelType}`
                window.open(downloadUrl, '_blank')
              }, index * 500) // Delay between downloads
            })
          }
        } catch (zipError) {
          console.warn('ZIP download failed, falling back to individual downloads')
          // Fallback to individual downloads
          data.labels.forEach((label, index) => {
            setTimeout(() => {
              const downloadUrl = `/api/kurier/labels/download/${label.shipmentId}/${label.labelType}`
              window.open(downloadUrl, '_blank')
            }, index * 500)
          })
        }
        
        alert(`Wygenerowano etykiety dla ${selectedOrders.size} zamówień!`)
        setSelectedOrders(new Set())
      } else {
        alert('Błąd generowania etykiet: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd bulk labels:', error)
      alert('Wystąpił błąd podczas generowania etykiet')
    }
  }

  const handleZatwierdzClick = (zamowienieId) => {
    if (processingOrders.has(zamowienieId)) {
      console.warn(`⚠️ Zamówienie ${zamowienieId} jest już przetwarzane`);
      return;
    }

    if (confirm('Czy na pewno chcesz zatwierdzić to zamówienie i wysłać do DHL?')) {
      onZatwierdz(zamowienieId);
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Skopiowano do schowka!')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Skopiowano do schowka!')
    })
  }

  if (loading && zamowienia.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie zamówień...</span>
        </div>
      </div>
    )
  }

  if (zamowienia.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg">
            {isArchive ? 'Brak zamówień w archiwum' : 'Brak aktywnych zamówień kuriera'}
          </p>
          <p className="text-sm mt-2">
            {isArchive ? 'Wszystkie zatwierdzone zamówienia pojawią się tutaj' : 'Dodaj pierwsze zamówienie korzystając z przycisku powyżej'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              🚀 {isArchive ? 'Archiwum' : 'Aktywne'} zamówienia kuriera ({zamowienia.length})
            </h2>
            <div className="flex items-center space-x-4 mt-2 text-blue-100 text-sm">
              <div className="flex items-center">
                <Package size={16} className="mr-1" />
                <span>{zamowienia.length} zamówień</span>
              </div>
              {selectedOrders.size > 0 && (
                <div className="flex items-center">
                  <CheckCircle size={16} className="mr-1" />
                  <span>{selectedOrders.size} zaznaczonych</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isArchive && (
              <>
                {/* Bulk Actions */}
                {selectedOrders.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBulkLabels}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1 text-sm"
                    >
                      <Download size={16} />
                      <span>Etykiety ({selectedOrders.size})</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedOrders(new Set())}
                      className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    >
                      Anuluj
                    </button>
                  </div>
                )}
                
                {/* Select All */}
                <button
                  onClick={selectAllOrders}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1 text-sm"
                >
                  <CheckCircle size={16} />
                  <span>{selectedOrders.size === zamowienia.length ? 'Odznacz' : 'Zaznacz'} wszystkie</span>
                </button>
              </>
            )}
            
            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-1 text-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Odśwież</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {zamowienia.map((zamowienie) => {
          const notes = parseNotes(zamowienie.notes)
          const nadawca = notes.nadawca || {}
          const odbiorca = notes.odbiorca || {}
          const przesylka = notes.przesylka || {}
          const isProcessing = processingOrders.has(zamowienie.id)
          const isSelected = selectedOrders.has(zamowienie.id)

          return (
            <div 
              key={zamowienie.id}
              className={`border rounded-lg overflow-hidden transition-all ${
                isProcessing ? 'bg-blue-50 border-blue-200' : ''
              } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            >
              {/* Enhanced Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {/* Checkbox for selection */}
                  {!isArchive && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(zamowienie.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="form-checkbox text-blue-600 rounded"
                    />
                  )}
                  
                  <Package className="text-blue-600" />
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span>{zamowienie.recipient_name}</span>
                      {notes.dhl?.trackingNumber && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(notes.dhl.trackingNumber)
                          }}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          📦 {notes.dhl.trackingNumber}
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center space-x-3">
                      <span>{zamowienie.magazine_source} → {zamowienie.recipient_phone}</span>
                      {notes.uslugaDHL && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                          {getServiceName(notes.uslugaDHL)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center space-x-4">
                      <span>ID: {zamowienie.id}</span>
                      <span>Utworzono: {formatDate(zamowienie.created_at)}</span>
                      {przesylka.waga && (
                        <span>Waga: {przesylka.waga}kg</span>
                      )}
                    </div>
                    {isProcessing && (
                      <div className="text-xs text-blue-600 font-medium flex items-center mt-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                        Przetwarzanie...
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Price Calculator */}
                    {!isArchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCalculatePrice(zamowienie.id)
                        }}
                        disabled={priceCalculating.has(zamowienie.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Oblicz cenę"
                      >
                        {priceCalculating.has(zamowienie.id) ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <DollarSign size={16} />
                        )}
                      </button>
                    )}
                    
                    {/* Generate Labels */}
                    {(zamowienie.status === 'sent' || zamowienie.status === 'delivered') && notes.dhl?.shipmentNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateLabels(zamowienie.id, ['BLP'])
                        }}
                        disabled={labelGenerating.has(zamowienie.id)}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Pobierz etykiety"
                      >
                        {labelGenerating.has(zamowienie.id) ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                    )}
                    
                    {/* Book Courier */}
                    {!isArchive && zamowienie.status === 'sent' && !notes.courier && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookCourier(zamowienie.id)
                        }}
                        disabled={courierBooking === zamowienie.id}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Zamów kuriera"
                      >
                        {courierBooking === zamowienie.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Truck size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Status & Icons */}
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(zamowienie.status, notes)}
                    
                    {/* Service Icons */}
                    <div className="flex items-center space-x-1">
                      {notes.dhl && (
                        <div className="flex items-center space-x-1">
                          <Truck className={`w-4 h-4 ${
                            notes.dhl.status === 'sent_to_dhl' ? 'text-blue-600' :
                            notes.dhl.status === 'failed' ? 'text-red-600' :
                            'text-yellow-600'
                          }`} />
                          
                          {notes.dhl.trackingNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTrackingRefresh(notes.dhl.trackingNumber)
                              }}
                              disabled={trackingLoading === notes.dhl.trackingNumber}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              title="Odśwież tracking"
                            >
                              {trackingLoading === notes.dhl.trackingNumber ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Eye size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {notes.courier && (
                        <span className="text-green-600" title="Kurier zamówiony">
                          <Calendar size={16} />
                        </span>
                      )}
                      
                      {notes.uslugiDodatkowe?.ubezpieczenie && (
                        <span className="text-purple-600" title="Ubezpieczone">
                          <Shield size={16} />
                        </span>
                      )}
                      
                      {notes.uslugiDodatkowe?.pobranie && (
                        <span className="text-orange-600" title="Pobranie">
                          <CreditCard size={16} />
                        </span>
                      )}
                      
                      {notes.daneMiedzynarodowe?.typOdprawy && (
                        <span className="text-blue-600" title="Międzynarodowe">
                          <Globe size={16} />
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand/Collapse */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(zamowienie.id)
                    }}
                    className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {expandedId === zamowienie.id ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === zamowienie.id && (
                <div className="p-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sender */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                        Nadawca
                      </h4>
                      <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                        <div className="flex items-center text-sm">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="font-medium">{nadawca.nazwa || 'Nie podano'}</span>
                          <span className="ml-2 text-xs text-gray-500">({nadawca.typ})</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.adres || 'Nie podano'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.kontakt || 'Nie podano'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.telefon || 'Nie podano'}</span>
                          {nadawca.telefon && (
                            <button
                              onClick={() => copyToClipboard(nadawca.telefon)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.email || 'Nie podano'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Receiver */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-green-600" />
                        Odbiorca
                      </h4>
                      <div className="space-y-2 bg-green-50 p-3 rounded-md">
                        <div className="flex items-center text-sm">
                          {odbiorca.typ === 'osoba' ? 
                            <User className="w-4 h-4 mr-2 text-gray-400" /> : 
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          }
                          <span className="font-medium">{zamowienie.recipient_name}</span>
                          <span className="ml-2 text-xs text-gray-500">({odbiorca.typ})</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{zamowienie.recipient_address}</span>
                          <button
                            onClick={() => copyToClipboard(zamowienie.recipient_address)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{zamowienie.recipient_phone}</span>
                          <button
                            onClick={() => copyToClipboard(zamowienie.recipient_phone)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{odbiorca.email || 'Nie podano'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Package Details */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-purple-600" />
                        Szczegóły przesyłki
                      </h4>
                      <div className="bg-purple-50 p-4 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Zawartość:</span>
                              <p className="mt-1 text-gray-900">{zamowienie.package_description.split(' | ')[0]}</p>
                            </div>
                            
                            {przesylka.wymiary && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Wymiary (cm):</span>
                                <div className="mt-1 flex items-center space-x-2">
                                  <span className="bg-white px-2 py-1 rounded text-xs">
                                    D: {przesylka.wymiary.dlugosc}
                                  </span>
                                  <span className="bg-white px-2 py-1 rounded text-xs">
                                    S: {przesylka.wymiary.szerokosc}
                                  </span>
                                  <span className="bg-white px-2 py-1 rounded text-xs">
                                    W: {przesylka.wymiary.wysokosc}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {przesylka.waga && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Waga:</span>
                                <span className="ml-2 bg-white px-2 py-1 rounded text-xs font-bold">
                                  {przesylka.waga} kg
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Magazyn nadawczy:</span>
                              <p className="mt-1 text-gray-900 capitalize">{zamowienie.magazine_source?.replace('_', ' ')}</p>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Utworzone przez:</span>
                              <p className="mt-1 text-gray-900">{zamowienie.created_by_email}</p>
                            </div>
                            {przesylka.mpk && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">MPK:</span>
                                <p className="mt-1 text-gray-900 font-mono">{przesylka.mpk}</p>
                              </div>
                            )}
                            {notes.typZlecenia && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Typ zlecenia:</span>
                                <p className="mt-1 text-gray-900 capitalize">{notes.typZlecenia.replace('_', ' ')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {przesylka.uwagi && (
                          <div className="mt-4 pt-3 border-t border-purple-200">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Uwagi:</span>
                              <p className="mt-1 text-gray-900 bg-white p-3 rounded border">{przesylka.uwagi}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approval Info */}
                    {zamowienie.status === 'approved' && zamowienie.completed_at && (
                      <div className="md:col-span-2">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                          <div className="flex items-center text-sm text-green-800">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Zatwierdzone przez:</span>
                            <span className="ml-2">{zamowienie.completed_by}</span>
                            <span className="ml-4">w dniu:</span>
                            <span className="ml-2">{formatDate(zamowienie.completed_at)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced DHL Info */}
                    {notes.dhl && (
                      <div className="md:col-span-2">
                        <div className={`border p-4 rounded-md ${
                          notes.dhl.status === 'sent_to_dhl' ? 'bg-blue-50 border-blue-200' :
                          notes.dhl.status === 'failed' ? 'bg-red-50 border-red-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <Truck className="w-5 h-5 mr-2" />
                              <span className="font-medium">Status DHL WebAPI2</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {notes.dhl.trackingNumber && (
                                <button
                                  onClick={() => handleTrackingRefresh(notes.dhl.trackingNumber)}
                                  disabled={trackingLoading === notes.dhl.trackingNumber}
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${trackingLoading === notes.dhl.trackingNumber ? 'animate-spin' : ''}`} />
                                  <span>{trackingLoading === notes.dhl.trackingNumber ? 'Odświeżanie...' : 'Odśwież tracking'}</span>
                                </button>
                              )}
                              
                              {notes.dhl.shipmentNumber && (
                                <button
                                  onClick={() => handleGenerateLabels(zamowienie.id, ['BLP', 'LP'])}
                                  disabled={labelGenerating.has(zamowienie.id)}
                                  className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                                >
                                  <Download className={`w-3 h-3 ${labelGenerating.has(zamowienie.id) ? 'animate-spin' : ''}`} />
                                  <span>Etykiety</span>
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {notes.dhl.status === 'sent_to_dhl' && (
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded">
                                  <span className="font-medium text-gray-700">Nr przesyłki DHL:</span>
                                  <div className="flex items-center mt-1">
                                    <span className="font-mono text-blue-700">{notes.dhl.shipmentNumber}</span>
                                    <button
                                      onClick={() => copyToClipboard(notes.dhl.shipmentNumber)}
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <span className="font-medium text-gray-700">Nr śledzenia:</span>
                                  <div className="flex items-center mt-1">
                                    <span className="font-mono text-blue-700">{notes.dhl.trackingNumber}</span>
                                    <button
                                      onClick={() => copyToClipboard(notes.dhl.trackingNumber)}
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <a
                                      href={`https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${notes.dhl.trackingNumber}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                              
                              {notes.dhl.cost && (
                                <div className="bg-white p-3 rounded">
                                  <span className="font-medium text-gray-700">Koszt przesyłki:</span>
                                  <span className="ml-2 text-green-600 font-bold">{notes.dhl.cost} PLN</span>
                                </div>
                              )}
                              
                              <div className="bg-white p-3 rounded">
                                <span className="font-medium text-gray-700">Wysłano do DHL:</span>
                                <div className="mt-1">
                                  <span className="text-gray-600">{formatDate(notes.dhl.sentAt)} przez {notes.dhl.sentBy}</span>
                                </div>
                              </div>
                              
                              {notes.dhl.trackingStatus && (
                                <div className="bg-white p-3 rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">Status śledzenia:</span>
                                    <span className="text-blue-700 font-medium">{notes.dhl.trackingStatus}</span>
                                  </div>
                                  {notes.dhl.lastTracked && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Sprawdzono: {formatDate(notes.dhl.lastTracked)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {notes.dhl.estimatedDelivery && (
                                <div className="bg-white p-3 rounded">
                                  <span className="font-medium text-gray-700">Przewidywana dostawa:</span>
                                  <span className="ml-2 text-purple-600 font-medium">{formatDate(notes.dhl.estimatedDelivery)}</span>
                                </div>
                              )}

                              {notes.dhl.trackingEvents && notes.dhl.trackingEvents.length > 0 && (
                                <div className="bg-white p-3 rounded">
                                  <span className="font-medium text-gray-700">Ostatnie zdarzenia:</span>
                                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                                    {notes.dhl.trackingEvents.slice(0, 3).map((event, index) => (
                                      <div key={index} className="bg-gray-50 p-2 rounded border text-xs">
                                        <div className="font-medium">{event.status || event.description}</div>
                                        <div className="text-gray-500">{formatDate(event.timestamp || event.date)}</div>
                                        {event.location && <div className="text-gray-600">{event.location}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {notes.dhl.status === 'failed' && (
                            <div className="text-sm text-red-700 bg-white p-3 rounded">
                              <span className="font-medium">Błąd wysyłki DHL:</span>
                              <p className="mt-1">{notes.dhl.error}</p>
                              <p className="text-xs text-red-600 mt-1">
                                Próba: {formatDate(notes.dhl.attemptedAt)} przez {notes.dhl.attemptedBy}
                              </p>
                            </div>
                          )}
                          
                          {notes.dhl.status === 'error' && (
                            <div className="text-sm text-yellow-700 bg-white p-3 rounded">
                              <span className="font-medium">Problem z integracją DHL:</span>
                              <p className="mt-1">{notes.dhl.error}</p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Spróbuj ponownie lub skontaktuj się z administratorem
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Courier Info */}
                    {notes.courier && (
                      <div className="md:col-span-2">
                        <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <Calendar className="w-5 h-5 mr-2 text-green-600" />
                              <span className="font-medium text-green-900">Kurier zamówiony</span>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Status: {notes.courier.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded">
                              <span className="font-medium text-gray-700">Numery zleceń DHL:</span>
                              <div className="mt-1">
                                {notes.courier.orderIds.map((orderId, index) => (
                                  <div key={index} className="font-mono text-green-700">{orderId}</div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="bg-white p-3 rounded">
                              <span className="font-medium text-gray-700">Zamówiony:</span>
                              <div className="mt-1 text-gray-600">
                                {formatDate(notes.courier.bookedAt)} przez {notes.courier.bookedBy}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Action Buttons */}
                  {zamowienie.status === 'new' && (
                    <div className="mt-6 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        {/* Advanced Actions Toggle */}
                        <button
                          onClick={() => setShowAdvancedActions(!showAdvancedActions)}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-1"
                        >
                          <Eye size={16} />
                          <span>{showAdvancedActions ? 'Ukryj' : 'Pokaż'} zaawansowane</span>
                        </button>
                        
                        {showAdvancedActions && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCalculatePrice(zamowienie.id)}
                              disabled={priceCalculating.has(zamowienie.id)}
                              className="px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors flex items-center space-x-1"
                            >
                              {priceCalculating.has(zamowienie.id) ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <DollarSign size={16} />
                              )}
                              <span>Oblicz cenę</span>
                            </button>
                            
                            <button
                              onClick={() => copyToClipboard(JSON.stringify({
                                id: zamowienie.id,
                                recipient: zamowienie.recipient_name,
                                address: zamowienie.recipient_address,
                                phone: zamowienie.recipient_phone,
                                content: zamowienie.package_description.split(' | ')[0]
                              }, null, 2))}
                              className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors flex items-center space-x-1"
                            >
                              <Copy size={16} />
                              <span>Kopiuj dane</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          onClick={() => onUsun(zamowienie.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <Trash2 size={16} />
                          <span>Usuń</span>
                        </button>
                        
                        {canApprove && (
                          <button
                            onClick={() => handleZatwierdzClick(zamowienie.id)}
                            disabled={isProcessing}
                            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-md hover:from-green-700 hover:to-green-800 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            {isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                <span>Przetwarzanie...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} className="mr-2" />
                                <span>🚀 Zatwierdź i wyślij do DHL</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Messages */}
                  {zamowienie.status === 'approved' && !notes.dhl && (
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center text-sm text-blue-800">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Zamówienie zostało zatwierdzone. Oczekiwanie na wysyłkę do DHL...</span>
                      </div>
                    </div>
                  )}

                  {(zamowienie.status === 'sent' || zamowienie.status === 'delivered') && notes.dhl && notes.dhl.status === 'sent_to_dhl' && (
                    <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center text-sm text-green-800">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>
                          {zamowienie.status === 'delivered' 
                            ? '🎉 Przesyłka została dostarczona do odbiorcy!' 
                            : '📦 Przesyłka została przekazana do DHL i jest w trasie.'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
