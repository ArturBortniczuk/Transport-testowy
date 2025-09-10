// src/app/archiwum-spedycji/page.js
'use client'
import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Download, Search, Filter, Calendar, Truck, Package,
  MapPin, Phone, User, Building, FileText, Clock,
  DollarSign, AlertCircle, CheckCircle, XCircle,
  Users, Hash, Mail, Star, Info, Loader2,
  Package2, Weight, CreditCard, UserCheck,
  Navigation, Building2, PhoneCall, StickyNote,
  CalendarClock, CalendarCheck, CalendarPlus
} from 'lucide-react'

export default function ArchiwumSpedycjiPage() {
  // Stan główny
  const [archiwum, setArchiwum] = useState([])
  const [filteredArchiwum, setFilteredArchiwum] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  
  // Paginacja
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Filtry
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    city: '',
    driver: '',
    responsible: '',
    mpk: '',
    orderNumber: '',
    hasResponse: 'all',
    transportType: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Statystyki
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    totalDistance: 0,
    totalCost: 0,
    avgCost: 0
  })

  // Pobieranie danych z istniejącego API
  useEffect(() => {
    fetchArchiwum()
  }, [])

  const fetchArchiwum = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Używamy istniejącego endpointu /api/spedycje
      const response = await fetch('/api/spedycje')
      const data = await response.json()
      
      if (data.success) {
        console.log('Pobrane dane:', data.spedycje)
        // Filtrujemy tylko zakończone zlecenia (z response_data)
        const allSpedycje = data.spedycje || []
        setArchiwum(allSpedycje)
        setFilteredArchiwum(allSpedycje)
        calculateStats(allSpedycje)
      } else {
        setError(data.error || 'Błąd pobierania danych')
      }
    } catch (error) {
      console.error('Błąd pobierania archiwum:', error)
      setError('Wystąpił błąd podczas pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  // Obliczanie statystyk
  const calculateStats = (data) => {
    const completed = data.filter(item => {
      const response = parseJSON(item.response_data)
      return response && Object.keys(response).length > 0
    }).length
    const pending = data.length - completed
    
    let totalDistance = 0
    let totalCost = 0
    let costCount = 0
    
    data.forEach(item => {
      const response = parseJSON(item.response_data)
      if (response && Object.keys(response).length > 0) {
        if (response.distanceKm) totalDistance += parseFloat(response.distanceKm) || 0
        if (response.totalPrice || response.deliveryPrice) {
          const price = parseFloat(response.totalPrice || response.deliveryPrice) || 0
          totalCost += price
          if (price > 0) costCount++
        }
      }
      // Dodaj również distance_km jeśli istnieje
      if (item.distance_km) {
        totalDistance += parseFloat(item.distance_km) || 0
      }
    })
    
    setStats({
      total: data.length,
      completed,
      pending,
      totalDistance: Math.round(totalDistance),
      totalCost: Math.round(totalCost * 100) / 100,
      avgCost: costCount > 0 ? Math.round((totalCost / costCount) * 100) / 100 : 0
    })
  }

  // Pomocnicze funkcje parsowania
  const parseJSON = (data) => {
    if (!data) return null
    if (typeof data === 'object') return data
    if (data === '{}' || data === 'null') return null
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }

  // Filtrowanie danych
  useEffect(() => {
    let filtered = [...archiwum]
    
    // Wyszukiwanie tekstowe
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        const orderNumber = item.order_number || ''
        const mpk = item.mpk || ''
        const responsible = item.responsible_person || ''
        const createdBy = item.created_by_email || ''
        const location = parseJSON(item.location_data)
        const delivery = parseJSON(item.delivery_data)
        const response = parseJSON(item.response_data)
        
        return (
          orderNumber.toLowerCase().includes(query) ||
          mpk.toLowerCase().includes(query) ||
          responsible.toLowerCase().includes(query) ||
          createdBy.toLowerCase().includes(query) ||
          location?.city?.toLowerCase().includes(query) ||
          location?.company?.toLowerCase().includes(query) ||
          delivery?.city?.toLowerCase().includes(query) ||
          delivery?.constructionName?.toLowerCase().includes(query) ||
          response?.driverInfo?.name?.toLowerCase().includes(query) ||
          response?.vehicleInfo?.plates?.toLowerCase().includes(query)
        )
      })
    }
    
    // Filtry zaawansowane
    // Data od
    if (filters.dateFrom) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= new Date(filters.dateFrom)
      })
    }
    
    // Data do
    if (filters.dateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at)
        const endDate = new Date(filters.dateTo)
        endDate.setHours(23, 59, 59)
        return itemDate <= endDate
      })
    }
    
    // Status
    if (filters.status !== 'all') {
      if (filters.status === 'completed') {
        filtered = filtered.filter(item => {
          const response = parseJSON(item.response_data)
          return response && Object.keys(response).length > 0
        })
      } else if (filters.status === 'pending') {
        filtered = filtered.filter(item => {
          const response = parseJSON(item.response_data)
          return !response || Object.keys(response).length === 0
        })
      }
    }
    
    // Miasto
    if (filters.city) {
      const cityQuery = filters.city.toLowerCase()
      filtered = filtered.filter(item => {
        const location = parseJSON(item.location_data)
        const delivery = parseJSON(item.delivery_data)
        return (
          location?.city?.toLowerCase().includes(cityQuery) ||
          delivery?.city?.toLowerCase().includes(cityQuery)
        )
      })
    }
    
    // Kierowca
    if (filters.driver) {
      const driverQuery = filters.driver.toLowerCase()
      filtered = filtered.filter(item => {
        const response = parseJSON(item.response_data)
        return response?.driverInfo?.name?.toLowerCase().includes(driverQuery) ||
               response?.driver?.name?.toLowerCase().includes(driverQuery)
      })
    }
    
    // Osoba odpowiedzialna
    if (filters.responsible) {
      const responsibleQuery = filters.responsible.toLowerCase()
      filtered = filtered.filter(item => 
        item.responsible_person?.toLowerCase().includes(responsibleQuery)
      )
    }
    
    // MPK
    if (filters.mpk) {
      filtered = filtered.filter(item => 
        item.mpk?.toLowerCase().includes(filters.mpk.toLowerCase())
      )
    }
    
    // Numer zamówienia
    if (filters.orderNumber) {
      filtered = filtered.filter(item => 
        item.order_number?.toLowerCase().includes(filters.orderNumber.toLowerCase())
      )
    }
    
    // Czy ma odpowiedź
    if (filters.hasResponse !== 'all') {
      if (filters.hasResponse === 'yes') {
        filtered = filtered.filter(item => {
          const response = parseJSON(item.response_data)
          return response && Object.keys(response).length > 0
        })
      } else {
        filtered = filtered.filter(item => {
          const response = parseJSON(item.response_data)
          return !response || Object.keys(response).length === 0
        })
      }
    }
    
    // Typ transportu
    if (filters.transportType !== 'all') {
      filtered = filtered.filter(item => {
        const response = parseJSON(item.response_data)
        const merged = parseJSON(item.merged_transports)
        
        if (filters.transportType === 'merged') {
          return item.is_merged || merged?.isMerged || response?.isMerged
        } else if (filters.transportType === 'drums') {
          return item.is_drums_transport || response?.isDrumsTransport
        } else {
          return !item.is_merged && !item.is_drums_transport && !merged?.isMerged && !response?.isMerged && !response?.isDrumsTransport
        }
      })
    }
    
    // Sortowanie - najnowsze najpierw
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    setFilteredArchiwum(filtered)
    setCurrentPage(1)
  }, [archiwum, searchQuery, filters])

  // Resetowanie filtrów
  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      city: '',
      driver: '',
      responsible: '',
      mpk: '',
      orderNumber: '',
      hasResponse: 'all',
      transportType: 'all'
    })
    setSearchQuery('')
  }

  // Eksport do Excel
  const handleExport = () => {
    if (filteredArchiwum.length === 0) {
      alert('Brak danych do eksportu')
      return
    }
    
    const dataToExport = filteredArchiwum.map(item => {
      const location = parseJSON(item.location_data)
      const delivery = parseJSON(item.delivery_data)
      const response = parseJSON(item.response_data)
      const goods = parseJSON(item.goods_description)
      
      return {
        'Numer zamówienia': item.order_number || '',
        'MPK': item.mpk || '',
        'Data utworzenia': format(new Date(item.created_at), 'dd.MM.yyyy HH:mm'),
        'Data dostawy': item.delivery_date ? format(new Date(item.delivery_date), 'dd.MM.yyyy') : '',
        'Miejsce załadunku': location?.company || item.location || '',
        'Miasto załadunku': location?.city || '',
        'Adres załadunku': location ? `${location.street || ''}, ${location.postalCode || ''}` : '',
        'Miejsce rozładunku': delivery?.constructionName || '',
        'Miasto rozładunku': delivery?.city || '',
        'Adres rozładunku': delivery ? `${delivery.street || ''}, ${delivery.postalCode || ''}` : '',
        'Kierowca': response?.driverInfo?.name || response?.driver?.name || '',
        'Telefon kierowcy': response?.driverInfo?.phone || response?.driver?.phone || '',
        'Numer rejestracyjny': response?.vehicleInfo?.plates || response?.vehicle?.plates || '',
        'Rodzaj pojazdu': response?.vehicleInfo?.model || response?.vehicle?.model || item.vehicle_type || '',
        'Typ transportu': item.transport_type || '',
        'Rodzaj towaru': goods?.type || '',
        'Opis towaru': typeof goods === 'string' ? goods : (goods?.description || ''),
        'Waga (kg)': goods?.weight || '',
        'Cena towaru': goods?.value || '',
        'Cena transportu': response?.totalPrice || response?.deliveryPrice || '',
        'Odległość (km)': response?.distanceKm || item.distance_km || '',
        'Dokumenty': item.documents || '',
        'Uwagi': item.notes || '',
        'Osoba odpowiedzialna': item.responsible_person || '',
        'Utworzone przez': item.created_by_email || '',
        'Status': response && Object.keys(response).length > 0 ? 'Zrealizowane' : 'Oczekuje'
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Archiwum Spedycji')
    
    // Ustawienie szerokości kolumn
    const colWidths = [
      { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, 
      { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, 
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, 
      { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, 
      { wch: 20 }, { wch: 12 }
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `archiwum_spedycji_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`)
  }

  // Rozwijanie/zwijanie wiersza
  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Formatowanie daty
  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: pl })
    } catch {
      return 'Nieprawidłowa data'
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: pl })
    } catch {
      return 'Nieprawidłowa data'
    }
  }

  // Formatowanie ceny
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Brak'
    return `${parseFloat(price).toFixed(2)} PLN`
  }

  // Pobieranie informacji o lokalizacji
  const getLocationInfo = (item) => {
    if (item.location === 'Odbiory własne') {
      const location = parseJSON(item.location_data)
      return {
        company: location?.company || 'Nie podano',
        city: location?.city || 'Nie podano'
      }
    }
    return {
      company: item.location || 'Nie podano',
      city: item.location?.replace('Magazyn ', '') || 'Nie podano'
    }
  }

  const getDeliveryInfo = (item) => {
    const delivery = parseJSON(item.delivery_data)
    return {
      company: delivery?.constructionName || 'Nie podano',
      city: delivery?.city || 'Nie podano'
    }
  }

  // Pobieranie badge'a statusu
  const getStatusBadge = (item) => {
    const response = parseJSON(item.response_data)
    if (response && Object.keys(response).length > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Zrealizowane
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock size={12} className="mr-1" />
        Oczekuje
      </span>
    )
  }

  // Pobieranie badge'a typu transportu
  const getTransportTypeBadge = (item) => {
    const badges = []
    const response = parseJSON(item.response_data)
    const merged = parseJSON(item.merged_transports)
    
    if (item.is_merged || merged?.isMerged || response?.isMerged) {
      badges.push(
        <span key="merged" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
          <Users size={12} className="mr-1" />
          Łączony
        </span>
      )
    }
    
    if (item.is_drums_transport || response?.isDrumsTransport) {
      badges.push(
        <span key="drums" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1">
          <Package2 size={12} className="mr-1" />
          Bębny
        </span>
      )
    }
    
    if (item.transport_type === 'express' || response?.transportType === 'express') {
      badges.push(
        <span key="express" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Truck size={12} className="mr-1" />
          Express
        </span>
      )
    }
    
    return badges.length > 0 ? badges : null
  }

  // Paginacja
  const totalPages = Math.ceil(filteredArchiwum.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredArchiwum.slice(startIndex, endIndex)

  // Renderowanie szczegółów rozszerzonego wiersza
  const renderExpandedDetails = (item) => {
    const location = parseJSON(item.location_data)
    const delivery = parseJSON(item.delivery_data)
    const response = parseJSON(item.response_data)
    const goods = parseJSON(item.goods_description)
    const merged = parseJSON(item.merged_transports)
    
    return (
      <tr>
        <td colSpan="8" className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Dane zamówienia */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <FileText size={16} className="mr-2 text-blue-600" />
                Dane zamówienia
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Numer zamówienia:</span>
                  <span className="font-medium">{item.order_number || 'Brak'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MPK:</span>
                  <span className="font-medium">{item.mpk || 'Brak'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dokumenty:</span>
                  <span className="font-medium">{item.documents || 'Brak'}</span>
                </div>
              </div>
            </div>

            {/* Dane przewoźnika */}
            {response && Object.keys(response).length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Truck size={16} className="mr-2 text-green-600" />
                  Dane przewoźnika
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kierowca:</span>
                    <span className="font-medium">
                      {response.driverInfo?.name || response.driver?.name || 'Nie przypisano'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="font-medium">
                      {response.driverInfo?.phone || response.driver?.phone || 'Brak'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Numer auta:</span>
                    <span className="font-medium">
                      {response.vehicleInfo?.plates || response.vehicle?.plates || 'Brak'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rodzaj pojazdu:</span>
                    <span className="font-medium">
                      {response.vehicleInfo?.model || response.vehicle?.model || response.vehicleType || item.vehicle_type || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Dane o towarze */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Package size={16} className="mr-2 text-purple-600" />
                Dane o towarze
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rodzaj towaru:</span>
                  <span className="font-medium">{goods?.type || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Opakowania/Towar:</span>
                  <span className="font-medium">{goods?.packaging || 'Brak'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Opis:</span>
                  <p className="font-medium mt-1">
                    {typeof goods === 'string' ? goods : (goods?.description || item.goods_description || 'Brak opisu')}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waga:</span>
                  <span className="font-medium">{goods?.weight ? `${goods.weight} kg` : 'Brak'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wartość towaru:</span>
                  <span className="font-medium">{formatPrice(goods?.value)}</span>
                </div>
              </div>
            </div>

            {/* Osoby odpowiedzialne */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <UserCheck size={16} className="mr-2 text-orange-600" />
                Osoby odpowiedzialne
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dodane przez:</span>
                  <span className="font-medium">{item.created_by_email || 'Brak'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Osoba odpowiedzialna:</span>
                  <span className="font-medium">{item.responsible_person || 'Brak'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Numer MPK:</span>
                  <span className="font-medium">{item.mpk || 'Brak'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Uwagi zamówienia:</span>
                  <p className="font-medium mt-1">{item.notes || 'Brak uwag'}</p>
                </div>
              </div>
            </div>

            {/* Daty */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Calendar size={16} className="mr-2 text-red-600" />
                Daty
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Data utworzenia:</span>
                  <span className="font-medium">{formatDateTime(item.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data dostawy:</span>
                  <span className="font-medium">{formatDate(item.delivery_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data zakończenia:</span>
                  <span className="font-medium">
                    {item.completed_at ? formatDateTime(item.completed_at) : 'Nie zakończono'}
                  </span>
                </div>
              </div>
            </div>

            {/* Miejsce załadunku */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <MapPin size={16} className="mr-2 text-cyan-600" />
                Miejsce załadunku
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Nazwa firmy:</span>
                  <p className="font-medium">{location?.company || item.location || 'Brak'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Adres:</span>
                  <p className="font-medium">
                    {location ? `${location.street || ''}, ${location.postalCode || ''} ${location.city || ''}` : 'Brak adresu'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kontakt:</span>
                  <span className="font-medium">{item.loading_contact || location?.contact || 'Brak'}</span>
                </div>
              </div>
            </div>

            {/* Miejsce rozładunku */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Navigation size={16} className="mr-2 text-indigo-600" />
                Miejsce rozładunku
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Nazwa firmy:</span>
                  <p className="font-medium">{delivery?.constructionName || 'Brak'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Adres:</span>
                  <p className="font-medium">
                    {delivery ? `${delivery.street || ''}, ${delivery.postalCode || ''} ${delivery.city || ''}` : 'Brak adresu'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kontakt:</span>
                  <span className="font-medium">{item.unloading_contact || delivery?.contact || 'Brak'}</span>
                </div>
              </div>
            </div>

            {/* Informacje o kosztach i dystansie */}
            {response && Object.keys(response).length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <DollarSign size={16} className="mr-2 text-green-600" />
                  Koszty i dystans
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cena transportu:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(response.totalPrice || response.deliveryPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Odległość:</span>
                    <span className="font-medium">
                      {response.distanceKm || item.distance_km ? `${response.distanceKm || item.distance_km} km` : 'Brak'}
                    </span>
                  </div>
                  {response.priceBreakdown && (
                    <div>
                      <span className="text-gray-600">Szczegóły ceny:</span>
                      <p className="font-medium mt-1 text-xs">{response.priceBreakdown}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informacje o transporcie łączonym */}
            {(merged?.isMerged || response?.isMerged) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Users size={16} className="mr-2" />
                  Transport łączony
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Liczba tras:</span>
                    <span className="font-medium">
                      {merged?.transportCount || response?.selectedTransports?.length || 2}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Łączna odległość:</span>
                    <span className="font-medium">
                      {merged?.totalDistance || response?.totalDistance ? 
                        `${merged?.totalDistance || response?.totalDistance} km` : 'Brak'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Data połączenia:</span>
                    <span className="font-medium">
                      {formatDateTime(merged?.mergedAt || response?.mergedAt || item.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // Główny render
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie archiwum spedycji...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 text-center">{error}</p>
          <button 
            onClick={fetchArchiwum}
            className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Nagłówek */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Package size={32} className="mr-3 text-blue-600" />
                Archiwum Spedycji
              </h1>
              <p className="text-gray-600 mt-2">
                Przeglądaj i zarządzaj historią zleceń transportowych
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={20} />
                Eksportuj do Excel
              </button>
              <button
                onClick={fetchArchiwum}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Loader2 size={20} />
                Odśwież
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Wszystkie</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Zrealizowane</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Oczekujące</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Łączny dystans</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalDistance} km</p>
              </div>
              <Navigation className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Łączny koszt</p>
                <p className="text-xl font-bold text-indigo-600">{stats.totalCost} PLN</p>
              </div>
              <DollarSign className="text-indigo-600" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Średni koszt</p>
                <p className="text-xl font-bold text-cyan-600">{stats.avgCost} PLN</p>
              </div>
              <CreditCard className="text-cyan-600" size={24} />
            </div>
          </div>
        </div>

        {/* Sekcja wyszukiwania i filtrów */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Pasek wyszukiwania */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po numerze zamówienia, MPK, mieście, kierowcy..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={20} />
              {showFilters ? 'Ukryj filtry' : 'Pokaż filtry'}
            </button>
            {(searchQuery || Object.values(filters).some(v => v && v !== 'all')) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XCircle size={20} />
                Wyczyść filtry
              </button>
            )}
          </div>

          {/* Rozwinięte filtry */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data od</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Wszystkie</option>
                  <option value="completed">Zrealizowane</option>
                  <option value="pending">Oczekujące</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                  placeholder="Wpisz miasto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kierowca</label>
                <input
                  type="text"
                  value={filters.driver}
                  onChange={(e) => setFilters({...filters, driver: e.target.value})}
                  placeholder="Imię kierowcy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Osoba odpowiedzialna</label>
                <input
                  type="text"
                  value={filters.responsible}
                  onChange={(e) => setFilters({...filters, responsible: e.target.value})}
                  placeholder="Osoba odpowiedzialna..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MPK</label>
                <input
                  type="text"
                  value={filters.mpk}
                  onChange={(e) => setFilters({...filters, mpk: e.target.value})}
                  placeholder="Numer MPK..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nr zamówienia</label>
                <input
                  type="text"
                  value={filters.orderNumber}
                  onChange={(e) => setFilters({...filters, orderNumber: e.target.value})}
                  placeholder="Numer zamówienia..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ma odpowiedź</label>
                <select
                  value={filters.hasResponse}
                  onChange={(e) => setFilters({...filters, hasResponse: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Wszystkie</option>
                  <option value="yes">Tak</option>
                  <option value="no">Nie</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ transportu</label>
                <select
                  value={filters.transportType}
                  onChange={(e) => setFilters({...filters, transportType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Wszystkie</option>
                  <option value="standard">Standard</option>
                  <option value="merged">Łączone</option>
                  <option value="drums">Bębny</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabela z danymi */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {currentItems.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Brak zleceń spełniających kryteria wyszukiwania</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Szczegóły
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trasa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nr zamówienia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Osoba odpowiedzialna
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dokumenty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data dostawy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => {
                    const locationInfo = getLocationInfo(item)
                    const deliveryInfo = getDeliveryInfo(item)
                    const isExpanded = expandedRows[item.id]
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleRowExpansion(item.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isExpanded ? 
                                <ChevronUp size={20} className="text-gray-600" /> : 
                                <ChevronDown size={20} className="text-gray-600" />
                              }
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {locationInfo.city} ({locationInfo.company})
                              </div>
                              <div className="text-gray-500 flex items-center">
                                <span>→</span>
                                <span className="ml-2">
                                  {deliveryInfo.city} ({deliveryInfo.company})
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{item.order_number || 'Brak'}</div>
                              {item.mpk && (
                                <div className="text-gray-500 text-xs">MPK: {item.mpk}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.responsible_person || 'Brak'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.documents || 'Brak'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(item.delivery_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(item)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getTransportTypeBadge(item)}
                          </td>
                        </tr>
                        {isExpanded && renderExpandedDetails(item)}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginacja */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Wyświetlanie {startIndex + 1} - {Math.min(endIndex, filteredArchiwum.length)} z {filteredArchiwum.length} wyników
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10 na stronę</option>
                  <option value={20}>20 na stronę</option>
                  <option value={50}>50 na stronę</option>
                  <option value={100}>100 na stronę</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}