'use client'
import React, { useState, useEffect, Fragment } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { generateCMR } from '@/lib/utils/generateCMR'
import { 
  ChevronLeft, ChevronRight, FileText, Download, Search, Truck, Package, 
  MapPin, Phone, Calendar, DollarSign, User, Clipboard, ArrowRight, 
  ChevronDown, ChevronUp, AlertCircle, Building, ShoppingBag, Weight, 
  Mail, Hash, Clock, CheckCircle, Printer, ExternalLink, Eye, Users,
  Route, Target, Fuel, Timer, Star, Info, Edit, Trash2
} from 'lucide-react'

export default function ArchiwumSpedycjiPage() {
  // Stany podstawowe
  const [archiwum, setArchiwum] = useState([])
  const [filteredArchiwum, setFilteredArchiwum] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)
  
  // Stany UI
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Stany filtrów
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [mpkFilter, setMpkFilter] = useState('')
  const [orderNumberFilter, setOrderNumberFilter] = useState('')
  const [transportTypeFilter, setTransportTypeFilter] = useState('all')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')
  const [mergedFilter, setMergedFilter] = useState('all')
  const [drumsFilter, setDrumsFilter] = useState('all')
  const [mergedOriginFilter, setMergedOriginFilter] = useState('all')
  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [clientNameFilter, setClientNameFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [cityFromFilter, setCityFromFilter] = useState('')
  const [cityToFilter, setCityToFilter] = useState('')
  const [priceMinFilter, setPriceMinFilter] = useState('')
  const [priceMaxFilter, setPriceMaxFilter] = useState('')
  const [distanceMinFilter, setDistanceMinFilter] = useState('')
  const [distanceMaxFilter, setDistanceMaxFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Opcje filtrów
  const [mpkOptions, setMpkOptions] = useState([])
  
  // Lista dostępnych lat i miesięcy
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: 'all', label: 'Wszystkie miesiące' },
    { value: '0', label: 'Styczeń' },
    { value: '1', label: 'Luty' },
    { value: '2', label: 'Marzec' },
    { value: '3', label: 'Kwiecień' },
    { value: '4', label: 'Maj' },
    { value: '5', label: 'Czerwiec' },
    { value: '6', label: 'Lipiec' },
    { value: '7', label: 'Sierpień' },
    { value: '8', label: 'Wrzesień' },
    { value: '9', label: 'Październik' },
    { value: '10', label: 'Listopad' },
    { value: '11', label: 'Grudzień' }
  ]

  // Style dla input i select
  const selectStyles = "block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  const inputStyles = "block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"

  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2",
    success: "px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2",
    danger: "px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
  }

  // Hook efektów
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/check-admin')
        const data = await response.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Błąd sprawdzania uprawnień administratora:', error)
        setIsAdmin(false)
      }
    }

    checkAdmin()
    fetchArchiveData()
  }, [])

  // Pobierz dane archiwum z API
  const fetchArchiveData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📦 Pobieranie danych archiwum spedycji...')
      const response = await fetch('/api/spedycje?status=completed')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          console.log('✅ Pobrane dane z API:', data.spedycje?.length || 0, 'transportów')
          const transporty = data.spedycje || []
          
          // Sortuj od najnowszych (completed_at lub created_at)
          const sortedTransports = transporty.sort((a, b) => {
            const dateA = new Date(a.completed_at || a.created_at)
            const dateB = new Date(b.completed_at || b.created_at)
            return dateB - dateA
          })
          
          setArchiwum(sortedTransports)
          
          // Zbierz unikalne wartości MPK dla filtra
          const uniqueMpks = [...new Set(sortedTransports.map(item => getCurrentMPK(item)).filter(Boolean))]
          setMpkOptions(uniqueMpks.sort())
          
          // Zastosuj filtry początkowe
          applyFilters(sortedTransports)
        } else {
          throw new Error(data.error || 'Błąd pobierania danych')
        }
      } else {
        throw new Error(`Problem z API: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Błąd pobierania archiwum:', error)
      setError('Wystąpił błąd podczas pobierania danych archiwum spedycji')
      setArchiwum([])
      setFilteredArchiwum([])
    } finally {
      setLoading(false)
    }
  }

  // Funkcje pomocnicze do parsowania danych
  const safeParseJSON = (jsonString, fallback = {}) => {
    if (!jsonString) return fallback
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    } catch (error) {
      console.error('Błąd parsowania JSON:', error)
      return fallback
    }
  }

  // Pobierz aktualne MPK
  const getCurrentMPK = (transport) => {
    if (transport.mpk) return transport.mpk

    // Sprawdź w danych odpowiedzi
    const responseData = safeParseJSON(transport.response_data)
    if (responseData.mpk) return responseData.mpk

    // Sprawdź w danych zamówienia
    const orderData = safeParseJSON(transport.order_data)
    if (orderData.mpk) return orderData.mpk

    return 'Brak MPK'
  }

  // Pobierz miasto załadunku
  const getLoadingCity = (transport) => {
    // Sprawdź lokalizację podstawową
    if (transport.location) {
      if (transport.location === 'Magazyn Białystok' || transport.location === 'bialystok') {
        return 'Białystok'
      } else if (transport.location === 'Magazyn Zielonka' || transport.location === 'zielonka') {
        return 'Zielonka'
      }
      return transport.location
    }

    // Sprawdź w location_data
    const locationData = safeParseJSON(transport.location_data)
    if (locationData.city) return locationData.city
    if (locationData.address) return locationData.address

    return 'Brak danych'
  }

  // Pobierz miasto dostawy
  const getDeliveryCity = (transport) => {
    // Sprawdź w delivery_data
    const deliveryData = safeParseJSON(transport.delivery_data)
    if (deliveryData.city) return deliveryData.city
    if (deliveryData.address) return deliveryData.address

    // Sprawdź w response_data
    const responseData = safeParseJSON(transport.response_data)
    if (responseData.deliveryCity) return responseData.deliveryCity
    if (responseData.cityTo) return responseData.cityTo

    return 'Brak danych'
  }

  // Pobierz informacje o kliencie
  const getClientInfo = (transport) => {
    if (transport.client_name) return transport.client_name

    const responseData = safeParseJSON(transport.response_data)
    if (responseData.clientName) return responseData.clientName

    const orderData = safeParseJSON(transport.order_data)
    if (orderData.clientName) return orderData.clientName

    return 'Brak danych'
  }

  // Pobierz opis towaru
  const getGoodsDescription = (transport) => {
    if (transport.goods_description) return transport.goods_description

    const orderData = safeParseJSON(transport.order_data)
    if (orderData.towar) return orderData.towar

    const responseData = safeParseJSON(transport.response_data)
    if (responseData.goodsDescription) return responseData.goodsDescription
    if (responseData.cargoDescription) return responseData.cargoDescription

    return 'Brak opisu'
  }

  // Pobierz informacje o kierowcy
  const getDriverInfo = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    
    const name = responseData.driverName || ''
    const surname = responseData.driverSurname || ''
    const phone = responseData.driverPhone || ''
    
    const fullName = `${name} ${surname}`.trim()
    
    return {
      name: fullName || 'Nieznany kierowca',
      phone: phone || 'Brak telefonu'
    }
  }

  // Pobierz informacje o pojeździe
  const getVehicleInfo = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    
    return {
      number: responseData.vehicleNumber || 'Brak numeru',
      type: responseData.vehicleType || 'Nieznany typ'
    }
  }

  // Pobierz cenę transportu
  const getTransportPrice = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    
    const price = responseData.deliveryPrice || responseData.price || 0
    return parseFloat(price) || 0
  }

  // Pobierz odległość
  const getTransportDistance = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    
    return responseData.distance || responseData.distanceKm || transport.distance_km || 0
  }

  // Sprawdź czy transport jest połączony
  const isMergedTransport = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    return responseData.isMerged || responseData.isFromMergedTransport || false
  }

  // Sprawdź czy to transport bębnów
  const isDrumsTransport = (transport) => {
    const responseData = safeParseJSON(transport.response_data)
    return responseData.transportType === 'opakowaniowy'
  }

  // Formatuj datę
  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: pl })
    } catch (error) {
      return 'Nieprawidłowa data'
    }
  }

  // Formatuj datę krótko
  const formatDateShort = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: pl })
    } catch (error) {
      return 'Nieprawidłowa data'
    }
  }

  // Oblicz cenę za kilometr
  const calculatePricePerKm = (price, distance) => {
    if (!price || !distance || distance === 0) return 0
    return (price / distance).toFixed(2)
  }

  // Funkcja filtrująca transporty
  const applyFilters = (transports) => {
    if (!transports || transports.length === 0) {
      setFilteredArchiwum([])
      return
    }
    
    const filtered = transports.filter(transport => {
      // Filtr roku i miesiąca
      const date = new Date(transport.completed_at || transport.created_at)
      const transportYear = date.getFullYear()
      
      if (transportYear !== parseInt(selectedYear)) {
        return false
      }
      
      if (selectedMonth !== 'all') {
        const transportMonth = date.getMonth()
        if (transportMonth !== parseInt(selectedMonth)) {
          return false
        }
      }
      
      // Filtr MPK
      if (mpkFilter) {
        const currentMPK = getCurrentMPK(transport)
        if (!currentMPK.toLowerCase().includes(mpkFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr numeru zamówienia
      if (orderNumberFilter) {
        const orderNumber = transport.order_number || ''
        if (!orderNumber.toLowerCase().includes(orderNumberFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr typu transportu
      if (transportTypeFilter && transportTypeFilter !== 'all') {
        const responseData = safeParseJSON(transport.response_data)
        const transportType = responseData.transportType || 'standard'
        if (transportType !== transportTypeFilter) {
          return false
        }
      }
      
      // Filtr typu pojazdu
      if (vehicleTypeFilter && vehicleTypeFilter !== 'all') {
        const vehicleInfo = getVehicleInfo(transport)
        if (!vehicleInfo.type.toLowerCase().includes(vehicleTypeFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr transportu łączonego
      if (mergedFilter && mergedFilter !== 'all') {
        const isMerged = isMergedTransport(transport)
        if ((mergedFilter === 'merged' && !isMerged) || (mergedFilter === 'single' && isMerged)) {
          return false
        }
      }
      
      // Filtr transportu bębnów
      if (drumsFilter && drumsFilter !== 'all') {
        const isDrums = isDrumsTransport(transport)
        if ((drumsFilter === 'drums' && !isDrums) || (drumsFilter === 'normal' && isDrums)) {
          return false
        }
      }
      
      // Filtr nazwy kierowcy
      if (driverNameFilter) {
        const driverInfo = getDriverInfo(transport)
        if (!driverInfo.name.toLowerCase().includes(driverNameFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr nazwy klienta
      if (clientNameFilter) {
        const clientInfo = getClientInfo(transport)
        if (!clientInfo.toLowerCase().includes(clientNameFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr osoby tworzącej
      if (createdByFilter) {
        const creator = transport.created_by || ''
        if (!creator.toLowerCase().includes(createdByFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr miasta załadunku
      if (cityFromFilter) {
        const fromCity = getLoadingCity(transport)
        if (!fromCity.toLowerCase().includes(cityFromFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr miasta dostawy
      if (cityToFilter) {
        const toCity = getDeliveryCity(transport)
        if (!toCity.toLowerCase().includes(cityToFilter.toLowerCase())) {
          return false
        }
      }
      
      // Filtr ceny (min)
      if (priceMinFilter) {
        const price = getTransportPrice(transport)
        if (price < parseFloat(priceMinFilter)) {
          return false
        }
      }
      
      // Filtr ceny (max)
      if (priceMaxFilter) {
        const price = getTransportPrice(transport)
        if (price > parseFloat(priceMaxFilter)) {
          return false
        }
      }
      
      // Filtr odległości (min)
      if (distanceMinFilter) {
        const distance = getTransportDistance(transport)
        if (distance < parseFloat(distanceMinFilter)) {
          return false
        }
      }
      
      // Filtr odległości (max)
      if (distanceMaxFilter) {
        const distance = getTransportDistance(transport)
        if (distance > parseFloat(distanceMaxFilter)) {
          return false
        }
      }
      
      return true
    })
    
    setFilteredArchiwum(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Obsługa zmiany filtrów
  useEffect(() => {
    applyFilters(archiwum)
  }, [
    selectedYear, selectedMonth, mpkFilter, orderNumberFilter, transportTypeFilter, 
    vehicleTypeFilter, mergedFilter, drumsFilter, mergedOriginFilter, driverNameFilter, 
    clientNameFilter, createdByFilter, cityFromFilter, cityToFilter, priceMinFilter, 
    priceMaxFilter, distanceMinFilter, distanceMaxFilter, archiwum
  ])

  // Paginacja
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredArchiwum.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredArchiwum.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Funkcja eksportująca dane
  const exportData = () => {
    if (filteredArchiwum.length === 0) {
      alert('Brak danych do eksportu')
      return
    }
    
    const dataToExport = filteredArchiwum.map(transport => {
      const driverInfo = getDriverInfo(transport)
      const vehicleInfo = getVehicleInfo(transport)
      const price = getTransportPrice(transport)
      const distance = getTransportDistance(transport)
      const pricePerKm = calculatePricePerKm(price, distance)
      
      return {
        'Numer zamówienia': transport.order_number || '',
        'Data zlecenia': formatDateShort(transport.created_at),
        'Data realizacji': formatDateShort(transport.completed_at),
        'Trasa': `${getLoadingCity(transport)} → ${getDeliveryCity(transport)}`,
        'MPK': getCurrentMPK(transport),
        'Klient': getClientInfo(transport),
        'Towar': getGoodsDescription(transport),
        'Kierowca': driverInfo.name,
        'Telefon kierowcy': driverInfo.phone,
        'Pojazd': `${vehicleInfo.number} (${vehicleInfo.type})`,
        'Cena (PLN)': price.toFixed(2),
        'Odległość (km)': distance,
        'Cena za km (PLN)': pricePerKm,
        'Typ transportu': isDrumsTransport(transport) ? 'Bębny' : 'Standardowy',
        'Transport łączony': isMergedTransport(transport) ? 'Tak' : 'Nie',
        'Osoba dodająca': transport.created_by || '',
        'Dokumenty': transport.documents || '',
        'Uwagi': transport.notes || ''
      }
    })

    if (exportFormat === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Archiwum Spedycji')
      XLSX.writeFile(wb, `archiwum_spedycji_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } else {
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `archiwum_spedycji_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
    }
  }

  // Funkcja usuwania transportu
  const handleDeleteTransport = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten transport? Ta operacja jest nieodwracalna.')) {
      return
    }
    
    try {
      setDeleteStatus({ type: 'loading', message: 'Usuwanie transportu...' })
      
      const response = await fetch(`/api/spedycje?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        const updatedArchiwum = archiwum.filter(transport => transport.id !== id)
        setArchiwum(updatedArchiwum)
        applyFilters(updatedArchiwum)
        
        setDeleteStatus({ type: 'success', message: 'Transport został usunięty' })
        
        setTimeout(() => setDeleteStatus(null), 3000)
      } else {
        setDeleteStatus({ type: 'error', message: data.error || 'Nie udało się usunąć transportu' })
      }
    } catch (error) {
      console.error('Błąd usuwania transportu:', error)
      setDeleteStatus({ type: 'error', message: 'Wystąpił błąd podczas usuwania transportu' })
    }
  }

  // Generuj CMR
  const handleGenerateCMR = async (transport) => {
    try {
      console.log('Generowanie CMR dla transportu:', transport.id)
      const pdfBlob = await generateCMR(transport)
      
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `CMR_${transport.order_number || transport.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      link.click()
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Błąd generowania CMR:', error)
      alert('Wystąpił błąd podczas generowania dokumentu CMR')
    }
  }

  // Rozwiń/zwiń szczegóły transportu
  const toggleExpandTransport = (transportId) => {
    setExpandedRowId(expandedRowId === transportId ? null : transportId)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie archiwum spedycji...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-medium">Wystąpił błąd</p>
        <p>{error}</p>
        <button 
          onClick={fetchArchiveData}
          className={buttonClasses.primary + " mt-4 mx-auto"}
        >
          Spróbuj ponownie
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Archiwum Spedycji
        </h1>
        <p className="text-gray-600">
          Przeglądaj i zarządzaj zrealizowanymi zleceniami spedycyjnymi
        </p>
      </div>

      {/* Status usuwania */}
      {deleteStatus && (
        <div className={`mb-4 p-4 rounded-lg ${
          deleteStatus.type === 'success' ? 'bg-green-50 text-green-800' :
          deleteStatus.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {deleteStatus.message}
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-8 bg-white rounded-lg shadow">
        {/* Header z przyciskiem rozwijania i przyciskami akcji */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center">
                <Search size={20} className="mr-2" />
                Filtry wyszukiwania
              </h2>
              <p className="text-sm text-gray-600">
                {showAdvancedFilters 
                  ? `Aktywnych filtrów: ${[selectedYear, selectedMonth, mpkFilter, orderNumberFilter, transportTypeFilter, vehicleTypeFilter, mergedFilter, drumsFilter, mergedOriginFilter, driverNameFilter, clientNameFilter, createdByFilter, cityFromFilter, cityToFilter, priceMinFilter, priceMaxFilter, distanceMinFilter, distanceMaxFilter].filter(v => v && v !== 'all' && v !== currentYear).length}`
                  : "Kliknij aby rozwinąć wszystkie dostępne filtry"
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
                />
                {showAdvancedFilters ? 'Zwiń filtry' : 'Rozwiń filtry'}
              </button>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Eksportuj
              </button>
            </div>
          </div>
        </div>
        
        {/* Panel filtrów - pokazuje się tylko gdy showAdvancedFilters = true */}
        {showAdvancedFilters && (
          <div className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* ROK I MIESIĄC - Podstawowe filtry zawsze na górze */}
              <div>
                <label htmlFor="yearFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Rok
                </label>
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className={selectStyles}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="monthFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Miesiąc
                </label>
                <select
                  id="monthFilter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={selectStyles}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              
              {/* MPK FILTER */}
              <div>
                <label htmlFor="mpkFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  MPK
                </label>
                <div className="relative">
                  <input
                    id="mpkFilter"
                    type="text"
                    value={mpkFilter}
                    onChange={(e) => setMpkFilter(e.target.value)}
                    placeholder="Szukaj po MPK"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* ORDER NUMBER FILTER */}
              <div>
                <label htmlFor="orderNumberFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Numer zamówienia
                </label>
                <div className="relative">
                  <input
                    id="orderNumberFilter"
                    type="text"
                    value={orderNumberFilter}
                    onChange={(e) => setOrderNumberFilter(e.target.value)}
                    placeholder="Filtruj po numerze"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* TYP TRANSPORTU */}
              <div>
                <label htmlFor="transportTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Typ transportu
                </label>
                <select
                  id="transportTypeFilter"
                  value={transportTypeFilter}
                  onChange={(e) => setTransportTypeFilter(e.target.value)}
                  className={selectStyles}
                >
                  <option value="all">Wszystkie</option>
                  <option value="standard">Standardowy</option>
                  <option value="opakowaniowy">Opakowaniowy</option>
                  <option value="srodowiskowy">Środowiskowy</option>
                </select>
              </div>
              
              {/* Transport łączony */}
              <div>
                <label htmlFor="mergedFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Typ łączenia
                </label>
                <select
                  id="mergedFilter"
                  value={mergedFilter}
                  onChange={(e) => setMergedFilter(e.target.value)}
                  className={selectStyles}
                >
                  <option value="all">Wszystkie</option>
                  <option value="merged">Łączone</option>
                  <option value="single">Pojedyncze</option>
                </select>
              </div>
              
              {/* Transport bębnów */}
              <div>
                <label htmlFor="drumsFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Transport bębnów
                </label>
                <select
                  id="drumsFilter"
                  value={drumsFilter}
                  onChange={(e) => setDrumsFilter(e.target.value)}
                  className={selectStyles}
                >
                  <option value="all">Wszystkie</option>
                  <option value="drums">Bębny</option>
                  <option value="normal">Zwykły</option>
                </select>
              </div>
              
              {/* Typ pojazdu */}
              <div>
                <label htmlFor="vehicleTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Typ pojazdu
                </label>
                <select
                  id="vehicleTypeFilter"
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className={selectStyles}
                >
                  <option value="all">Wszystkie</option>
                  <option value="tir">TIR</option>
                  <option value="bus">Bus</option>
                  <option value="truck">Ciężarówka</option>
                  <option value="van">Dostawczy</option>
                </select>
              </div>
              
              {/* Nazwa kierowcy */}
              <div>
                <label htmlFor="driverNameFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Kierowca
                </label>
                <div className="relative">
                  <input
                    id="driverNameFilter"
                    type="text"
                    value={driverNameFilter}
                    onChange={(e) => setDriverNameFilter(e.target.value)}
                    placeholder="Imię i nazwisko"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Nazwa klienta */}
              <div>
                <label htmlFor="clientNameFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Klient
                </label>
                <div className="relative">
                  <input
                    id="clientNameFilter"
                    type="text"
                    value={clientNameFilter}
                    onChange={(e) => setClientNameFilter(e.target.value)}
                    placeholder="Nazwa klienta"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Building size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Osoba tworząca */}
              <div>
                <label htmlFor="createdByFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Utworzone przez
                </label>
                <div className="relative">
                  <input
                    id="createdByFilter"
                    type="text"
                    value={createdByFilter}
                    onChange={(e) => setCreatedByFilter(e.target.value)}
                    placeholder="Osoba tworząca"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Miasto źródłowe */}
              <div>
                <label htmlFor="cityFromFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Miasto załadunku
                </label>
                <div className="relative">
                  <input
                    id="cityFromFilter"
                    type="text"
                    value={cityFromFilter}
                    onChange={(e) => setCityFromFilter(e.target.value)}
                    placeholder="Skąd"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MapPin size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Miasto docelowe */}
              <div>
                <label htmlFor="cityToFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Miasto dostawy
                </label>
                <div className="relative">
                  <input
                    id="cityToFilter"
                    type="text"
                    value={cityToFilter}
                    onChange={(e) => setCityToFilter(e.target.value)}
                    placeholder="Dokąd"
                    className={inputStyles}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MapPin size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Cena min */}
              <div>
                <label htmlFor="priceMinFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Cena od (PLN)
                </label>
                <div className="relative">
                  <input
                    id="priceMinFilter"
                    type="number"
                    value={priceMinFilter}
                    onChange={(e) => setPriceMinFilter(e.target.value)}
                    placeholder="0"
                    className={inputStyles}
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <DollarSign size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Cena max */}
              <div>
                <label htmlFor="priceMaxFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Cena do (PLN)
                </label>
                <div className="relative">
                  <input
                    id="priceMaxFilter"
                    type="number"
                    value={priceMaxFilter}
                    onChange={(e) => setPriceMaxFilter(e.target.value)}
                    placeholder="9999"
                    className={inputStyles}
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <DollarSign size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Odległość min */}
              <div>
                <label htmlFor="distanceMinFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Odległość od (km)
                </label>
                <div className="relative">
                  <input
                    id="distanceMinFilter"
                    type="number"
                    value={distanceMinFilter}
                    onChange={(e) => setDistanceMinFilter(e.target.value)}
                    placeholder="0"
                    className={inputStyles}
                    min="0"
                    step="1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Route size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Odległość max */}
              <div>
                <label htmlFor="distanceMaxFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Odległość do (km)
                </label>
                <div className="relative">
                  <input
                    id="distanceMaxFilter"
                    type="number"
                    value={distanceMaxFilter}
                    onChange={(e) => setDistanceMaxFilter(e.target.value)}
                    placeholder="2000"
                    className={inputStyles}
                    min="0"
                    step="1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Route size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Przycisk czyszczenia filtrów */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Znaleziono <strong>{filteredArchiwum.length}</strong> z {archiwum.length} transportów
              </div>
              <button
                onClick={() => {
                  // Resetuj wszystkie filtry oprócz roku
                  setSelectedMonth('all')
                  setMpkFilter('')
                  setOrderNumberFilter('')
                  setTransportTypeFilter('all')
                  setVehicleTypeFilter('all')
                  setMergedFilter('all')
                  setDrumsFilter('all')
                  setMergedOriginFilter('all')
                  setDriverNameFilter('')
                  setClientNameFilter('')
                  setCreatedByFilter('')
                  setCityFromFilter('')
                  setCityToFilter('')
                  setPriceMinFilter('')
                  setPriceMaxFilter('')
                  setDistanceMinFilter('')
                  setDistanceMaxFilter('')
                }}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Wyczyść filtry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela transportów */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trasa & MPK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kierowca & Pojazd
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cennik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">Brak transportów w archiwum</p>
                    <p className="text-sm">Spróbuj zmienić filtry lub sprawdź czy są jakieś zrealizowane transporty</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((transport) => (
                  <Fragment key={transport.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                              <Truck className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              #{transport.order_number || transport.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDateShort(transport.completed_at)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {getClientInfo(transport)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            {getLoadingCity(transport)} → {getDeliveryCity(transport)}
                          </div>
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {getCurrentMPK(transport)}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <User className="h-4 w-4 text-gray-400 mr-1" />
                            {getDriverInfo(transport).name}
                          </div>
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-600">
                              {getVehicleInfo(transport).number}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                            <span className="font-medium">{getTransportPrice(transport).toFixed(2)} PLN</span>
                          </div>
                          <div className="flex items-center">
                            <Route className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-600">
                              {getTransportDistance(transport)} km
                              {getTransportDistance(transport) > 0 && (
                                <span className="ml-1">
                                  ({calculatePricePerKm(getTransportPrice(transport), getTransportDistance(transport))} PLN/km)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Zrealizowany
                          </span>
                          {isMergedTransport(transport) && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              <Users className="w-3 h-3 mr-1" />
                              Łączony
                            </span>
                          )}
                          {isDrumsTransport(transport) && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              <Package className="w-3 h-3 mr-1" />
                              Bębny
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleExpandTransport(transport.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Szczegóły"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleGenerateCMR(transport)}
                            className="text-green-600 hover:text-green-900"
                            title="Generuj CMR"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTransport(transport.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Usuń"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Rozwinięte szczegóły */}
                    {expandedRowId === transport.id && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Informacje podstawowe */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-900 border-b pb-2">Informacje podstawowe</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">Data zlecenia:</span>
                                  <span className="ml-1 font-medium">{formatDate(transport.created_at)}</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                  <span className="text-gray-600">Data realizacji:</span>
                                  <span className="ml-1 font-medium">{formatDate(transport.completed_at)}</span>
                                </div>
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">Utworzone przez:</span>
                                  <span className="ml-1 font-medium">{transport.created_by || 'Brak danych'}</span>
                                </div>
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">Zrealizowane przez:</span>
                                  <span className="ml-1 font-medium">{transport.completed_by || 'Automatycznie'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Szczegóły transportu */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-900 border-b pb-2">Szczegóły transportu</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start">
                                  <Package className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                  <div>
                                    <span className="text-gray-600">Towar:</span>
                                    <p className="ml-1 font-medium">{getGoodsDescription(transport)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">Telefon kierowcy:</span>
                                  <span className="ml-1 font-medium">{getDriverInfo(transport).phone}</span>
                                </div>
                                <div className="flex items-center">
                                  <Truck className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">Typ pojazdu:</span>
                                  <span className="ml-1 font-medium">{getVehicleInfo(transport).type}</span>
                                </div>
                                {transport.documents && (
                                  <div className="flex items-start">
                                    <FileText className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <span className="text-gray-600">Dokumenty:</span>
                                      <p className="ml-1 font-medium">{transport.documents}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Kontakty i uwagi */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-900 border-b pb-2">Kontakty i uwagi</h4>
                              <div className="space-y-2 text-sm">
                                {transport.loading_contact && (
                                  <div className="flex items-start">
                                    <Phone className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <span className="text-gray-600">Kontakt załadunek:</span>
                                      <p className="ml-1 font-medium">{transport.loading_contact}</p>
                                    </div>
                                  </div>
                                )}
                                {transport.unloading_contact && (
                                  <div className="flex items-start">
                                    <Phone className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <span className="text-gray-600">Kontakt rozładunek:</span>
                                      <p className="ml-1 font-medium">{transport.unloading_contact}</p>
                                    </div>
                                  </div>
                                )}
                                {transport.notes && (
                                  <div className="flex items-start">
                                    <Clipboard className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <span className="text-gray-600">Uwagi:</span>
                                      <p className="ml-1 font-medium">{transport.notes}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Link do mapy */}
                                <div className="flex items-center mt-4">
                                  <a
                                    href={`https://www.google.com/maps/dir/${encodeURIComponent(getLoadingCity(transport))}/${encodeURIComponent(getDeliveryCity(transport))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Otwórz w Google Maps
                                  </a>
                                </div>
                              </div>
                            </div>
                            
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Wyświetlanie <span className="font-medium">{indexOfFirstItem + 1}</span> do{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, filteredArchiwum.length)}</span> z{' '}
                <span className="font-medium">{filteredArchiwum.length}</span> wyników
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}