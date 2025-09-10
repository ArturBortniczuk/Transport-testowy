// src/app/archiwum-spedycji/page.js - KOMPLETNA WERSJA Z WSZYSTKIMI FILTRAMI + NOWY LAYOUT
'use client'
import React, { useState, useEffect, Fragment } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { generateCMR } from '@/lib/utils/generateCMR'
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Download, 
  Search, 
  Truck, 
  Package, 
  MapPin, 
  Phone, 
  Calendar, 
  DollarSign, 
  User, 
  Clipboard, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Building, 
  ShoppingBag, 
  Weight, 
  Mail, 
  Hash, 
  Clock, 
  CheckCircle, 
  Printer,
  Eye,
  EyeOff,
  Filter,
  X,
  Container,
  Route,
  Users,
  Target,
  Settings,
  Edit,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  UserCheck,
  Archive
} from 'lucide-react'

export default function ArchiwumSpedycjiPage() {
  const [archiwum, setArchiwum] = useState([])
  const [filteredArchiwum, setFilteredArchiwum] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // WSZYSTKIE FILTRY - jak w oryginale
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [mpkFilter, setMpkFilter] = useState('')
  const [orderNumberFilter, setOrderNumberFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [transportTypeFilter, setTransportTypeFilter] = useState('all')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')
  const [mergedFilter, setMergedFilter] = useState('all')
  const [drumsFilter, setDrumsFilter] = useState('all')
  const [mergedOriginFilter, setMergedOriginFilter] = useState('all')
  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [clientNameFilter, setClientNameFilter] = useState('')
  const [responsiblePersonFilter, setResponsiblePersonFilter] = useState('')
  const [deliveryCityFilter, setDeliveryCityFilter] = useState('')
  const [documentsFilter, setDocumentsFilter] = useState('')
  const [notesFilter, setNotesFilter] = useState('')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [minDistanceFilter, setMinDistanceFilter] = useState('')
  const [maxDistanceFilter, setMaxDistanceFilter] = useState('')
  
  // Opcje dla filtrów
  const [mpkOptions, setMpkOptions] = useState([])
  const [responsiblePersonOptions, setResponsiblePersonOptions] = useState([])
  const [clientNameOptions, setClientNameOptions] = useState([])
  const [driverNameOptions, setDriverNameOptions] = useState([])
  const [locationOptions, setLocationOptions] = useState([])
  const [transportTypeOptions, setTransportTypeOptions] = useState([])
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([])

  // Pobierz dane przy ładowaniu
  useEffect(() => {
    checkAdmin()
    fetchArchiveData()
  }, [])

  // Sprawdź uprawnienia administratora
  const checkAdmin = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      if (data.isAuthenticated) {
        setIsAdmin(data.isAdmin || false)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Błąd sprawdzania uprawnień:', error)
      setIsAdmin(false)
    }
  }

  // Pobierz dane archiwum z API
  const fetchArchiveData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Pobierz dane z API zamiast localStorage
      const response = await fetch('/api/spedycje?status=completed')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          console.log('Pobrane dane z API:', data.spedycje)
          setArchiwum(data.spedycje)
          
          // Zbierz unikalne wartości MPK dla filtra
          const uniqueMpks = [...new Set(data.spedycje.map(item => item.mpk).filter(Boolean))]
          setMpkOptions(uniqueMpks)
          
          // Zbierz inne opcje filtrów
          extractFilterOptions(data.spedycje)
          
          applyFilters(data.spedycje)
        } else {
          throw new Error(data.error || 'Błąd pobierania danych')
        }
      } else {
        throw new Error(`Problem z API: ${response.status}`)
      }
    } catch (error) {
      console.error('Błąd pobierania archiwum:', error)
      setError('Wystąpił błąd podczas pobierania danych')
      
      // Fallback do localStorage jako ostateczność
      try {
        const savedData = localStorage.getItem('zamowieniaSpedycja')
        if (savedData) {
          const transporty = JSON.parse(savedData)
            .filter(transport => transport.status === 'completed')
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          
          setArchiwum(transporty)
          
          // Zbierz unikalne wartości MPK dla filtra
          const uniqueMpks = [...new Set(transporty.map(item => item.mpk).filter(Boolean))]
          setMpkOptions(uniqueMpks)
          
          extractFilterOptions(transporty)
          applyFilters(transporty)
        }
      } catch (fallbackError) {
        console.error('Błąd fallback localStorage:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  // Wyciągnij opcje dla filtrów z danych
  const extractFilterOptions = (data) => {
    // MPK
    const mpks = [...new Set(data.map(item => item.mpk).filter(Boolean))]
    setMpkOptions(mpks)
    
    // Odpowiedzialni
    const responsiblePersons = [...new Set(data.map(item => 
      item.responsiblePerson || item.responsible_person
    ).filter(Boolean))]
    setResponsiblePersonOptions(responsiblePersons)
    
    // Klienci
    const clientNames = [...new Set(data.map(item => 
      item.clientName || item.client_name
    ).filter(Boolean))]
    setClientNameOptions(clientNames)
    
    // Lokalizacje
    const locations = [...new Set(data.map(item => item.location).filter(Boolean))]
    setLocationOptions(locations)
    
    // Typy transportu
    const transportTypes = [...new Set(data.map(item => 
      item.transportType || item.transport_type
    ).filter(Boolean))]
    setTransportTypeOptions(transportTypes)
    
    // Typy pojazdów
    const vehicleTypes = [...new Set(data.map(item => 
      item.vehicleType || item.vehicle_type
    ).filter(Boolean))]
    setVehicleTypeOptions(vehicleTypes)
    
    // Kierowcy z response_data
    const driverNames = [...new Set(data.map(item => {
      if (item.response_data || item.response) {
        const response = item.response_data || item.response
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response)
            return parsed.driverInfo?.name || parsed.driver?.name
          } catch (e) {
            return null
          }
        }
        return response.driverInfo?.name || response.driver?.name
      }
      return null
    }).filter(Boolean))]
    setDriverNameOptions(driverNames)
  }

  // Funkcje pomocnicze do wyświetlania danych - jak w oryginale
  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: pl })
    } catch (error) {
      console.error("Błąd formatowania daty:", error, dateString)
      return 'Nieprawidłowa data'
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: pl })
    } catch (error) {
      return 'Nieprawidłowa data'
    }
  }

  // Funkcja sprawdzająca czy data dostawy została zmieniona
  const isDeliveryDateChanged = (transport) => {
    if (!transport.deliveryDate && !transport.delivery_date) return false
    
    const response = transport.response || transport.response_data
    if (!response) return false
    
    let responseData = response
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        return false
      }
    }
    
    const originalDate = transport.deliveryDate || transport.delivery_date
    const responseDate = responseData.deliveryDate
    
    if (!originalDate || !responseDate) return false
    
    try {
      const original = new Date(originalDate).toDateString()
      const changed = new Date(responseDate).toDateString()
      return original !== changed
    } catch (e) {
      return false
    }
  }

  // Funkcja pobierająca aktualną datę dostawy
  const getActualDeliveryDate = (transport) => {
    const response = transport.response || transport.response_data
    if (response) {
      let responseData = response
      if (typeof response === 'string') {
        try {
          responseData = JSON.parse(response)
        } catch (e) {
          // ignore
        }
      }
      
      if (responseData.deliveryDate) {
        return responseData.deliveryDate
      }
    }
    
    return transport.deliveryDate || transport.delivery_date
  }

  // Funkcja pobierająca informacje o odpowiedzialnym
  const getResponsibleInfo = (transport) => {
    // Sprawdź czy istnieją dane w responsibleConstructions
    const constructions = transport.responsibleConstructions || transport.responsible_constructions
    if (constructions && Array.isArray(constructions) && constructions.length > 0) {
      if (constructions.length === 1) {
        return {
          type: 'construction',
          name: constructions[0].name,
          mpk: constructions[0].mpk
        }
      } else {
        return {
          type: 'multiple_constructions',
          count: constructions.length,
          names: constructions.map(c => c.name).join(', ')
        }
      }
    }
    
    // Fallback do responsiblePerson
    const responsiblePerson = transport.responsiblePerson || transport.responsible_person
    if (responsiblePerson) {
      return {
        type: 'person',
        name: responsiblePerson
      }
    }
    
    return {
      type: 'none',
      name: 'Nie przypisano'
    }
  }

  // Funkcja pobierająca aktualny MPK
  const getCurrentMPK = (transport) => {
    const constructions = transport.responsibleConstructions || transport.responsible_constructions
    if (constructions && Array.isArray(constructions) && constructions.length > 0) {
      if (constructions.length === 1) {
        return constructions[0].mpk
      } else {
        return constructions.map(c => c.mpk).filter(Boolean).join(', ')
      }
    }
    
    return transport.mpk || 'Brak MPK'
  }

  // Funkcja renderująca odpowiedzialne budowy
  const renderResponsibleConstructions = (transport) => {
    const constructions = transport.responsibleConstructions || transport.responsible_constructions
    if (!constructions || !Array.isArray(constructions) || constructions.length === 0) {
      return null
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
        <div className="text-xs font-medium text-green-700 mb-2 flex items-center">
          <Building size={14} className="mr-1" />
          Odpowiedzialne budowy:
        </div>
        <div className="flex flex-wrap gap-2">
          {constructions.map((construction, index) => (
            <div key={index} className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs flex items-center border border-green-300">
              <Building size={12} className="mr-1" />
              {construction.name}
              {construction.mpk && (
                <span className="ml-1 text-green-600 font-medium">({construction.mpk})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Funkcja pobierająca lokalizację załadunku
  const getLoadingLocation = (transport) => {
    if (transport.location === 'Odbiory własne') {
      let producerAddress = transport.producerAddress || transport.location_data
      if (typeof producerAddress === 'string') {
        try {
          producerAddress = JSON.parse(producerAddress)
        } catch (e) {
          return 'Odbiory własne'
        }
      }
      return producerAddress?.city || 'Odbiory własne'
    }
    return transport.location?.replace('Magazyn ', '') || 'Nie podano'
  }

  // Funkcja pobierająca miasto dostawy
  const getDeliveryCity = (transport) => {
    let delivery = transport.delivery || transport.delivery_data
    if (typeof delivery === 'string') {
      try {
        delivery = JSON.parse(delivery)
      } catch (e) {
        return 'Nie podano'
      }
    }
    return delivery?.city || 'Nie podano'
  }

  // Funkcja pobierająca informacje o kierowcy
  const getDriverInfo = (transport) => {
    const response = transport.response || transport.response_data
    if (!response) return 'Nie przypisano'
    
    let responseData = response
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        return 'Nie przypisano'
      }
    }
    
    if (responseData.driverInfo) {
      return `${responseData.driverInfo.name} (${responseData.driverInfo.phone || 'brak tel.'})`
    }
    
    if (responseData.driver) {
      return `${responseData.driver.name} (${responseData.driver.phone || 'brak tel.'})`
    }
    
    return 'Nie przypisano'
  }

  // Funkcja pobierająca informacje o pojeździe
  const getVehicleInfo = (transport) => {
    const response = transport.response || transport.response_data
    if (!response) return 'Nie podano'
    
    let responseData = response
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        return 'Nie podano'
      }
    }
    
    if (responseData.vehicleInfo) {
      return `${responseData.vehicleInfo.plates} - ${responseData.vehicleInfo.model}`
    }
    
    if (responseData.vehicle) {
      return `${responseData.vehicle.plates} - ${responseData.vehicle.model}`
    }
    
    return 'Nie podano'
  }

  // Funkcja pobierająca cenę
  const getTotalPrice = (transport) => {
    const response = transport.response || transport.response_data
    if (!response) return 'Nie podano'
    
    let responseData = response
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        return 'Nie podano'
      }
    }
    
    return responseData.totalPrice || responseData.deliveryPrice || 'Nie podano'
  }

  // Funkcje sprawdzające typy transportu
  const isTransportMerged = (transport) => {
    return transport.isMerged || transport.is_merged || false
  }

  const isDrumsTransport = (transport) => {
    return transport.isDrumsTransport || transport.is_drums_transport || false
  }

  const isFromMergedTransport = (transport) => {
    const response = transport.response || transport.response_data
    if (!response) return false
    
    let responseData = response
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        return false
      }
    }
    
    return responseData.isFromMergedTransport || false
  }

  // Funkcja pobierająca typ transportu z badge'ami
  const getTransportTypeDisplay = (transport) => {
    const badges = []
    
    if (isTransportMerged(transport)) {
      badges.push({ 
        text: 'ŁĄCZONY', 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        icon: <Users size={12} /> 
      })
    }
    
    if (isFromMergedTransport(transport)) {
      badges.push({ 
        text: 'CZĘŚĆ ŁĄCZONEGO', 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        icon: <Route size={12} /> 
      })
    }
    
    if (isDrumsTransport(transport)) {
      badges.push({ 
        text: 'BĘBNY', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: <Container size={12} /> 
      })
    }
    
    const transportType = transport.transportType || transport.transport_type
    if (transportType === 'opakowaniowy') {
      badges.push({ 
        text: 'OPAKOWANIOWY', 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        icon: <Package size={12} /> 
      })
    }
    
    const vehicleType = transport.vehicleType || transport.vehicle_type
    if (vehicleType) {
      badges.push({ 
        text: vehicleType.toUpperCase(), 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: <Truck size={12} /> 
      })
    }
    
    return badges
  }

  // Funkcja renderująca szczegóły połączonych transportów
  const renderMergedTransportDetails = (transport) => {
    const mergedData = transport.merged_transports
    if (!mergedData) return null
    
    let mergedTransports = mergedData
    if (typeof mergedData === 'string') {
      try {
        mergedTransports = JSON.parse(mergedData)
      } catch (e) {
        return null
      }
    }
    
    if (!mergedTransports.originalTransports || mergedTransports.originalTransports.length === 0) {
      return null
    }

    return (
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-5 rounded-xl shadow-sm border border-cyan-200 mt-4">
        <h4 className="font-bold text-cyan-700 mb-4 pb-2 border-b border-cyan-300 flex items-center text-lg">
          <Truck size={20} className="mr-2" />
          Transporty łączone ({mergedTransports.originalTransports.length})
        </h4>
        
        <div className="space-y-3">
          {mergedTransports.originalTransports.map((originalTransport, index) => (
            <div key={originalTransport.id} className="bg-white p-3 rounded-lg border border-cyan-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nr zamówienia:</span>
                  <div className="font-semibold text-gray-900">{originalTransport.orderNumber}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">MPK:</span>
                  <div className="font-semibold text-gray-900">{originalTransport.mpk || 'Brak'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Koszt przypisany:</span>
                  <div className="font-semibold text-gray-900">{originalTransport.costAssigned} zł</div>
                </div>
              </div>
              
              {originalTransport.route && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <Route size={14} className="mr-1" />
                  <span className="font-medium">Trasa:</span> 
                  <span className="ml-1">{originalTransport.route}</span>
                </div>
              )}
              
              {originalTransport.responsiblePerson && (
                <div className="mt-1 text-sm text-gray-600 flex items-center">
                  <User size={14} className="mr-1" />
                  <span className="font-medium">Odpowiedzialny:</span> 
                  <span className="ml-1">{originalTransport.responsiblePerson}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded border border-cyan-300">
            <span className="font-medium text-gray-700 flex items-center">
              <DollarSign size={16} className="mr-1" />
              Łączny koszt połączonych:
            </span>
            <div className="font-bold text-cyan-600 text-lg">{mergedTransports.totalMergedCost} zł</div>
          </div>
          <div className="bg-white p-3 rounded border border-cyan-300">
            <span className="font-medium text-gray-700 flex items-center">
              <Route size={16} className="mr-1" />
              Łączna odległość:
            </span>
            <div className="font-bold text-cyan-600 text-lg">{mergedTransports.totalDistance} km</div>
          </div>
          <div className="bg-white p-3 rounded border border-cyan-300">
            <span className="font-medium text-gray-700 flex items-center">
              <Calendar size={16} className="mr-1" />
              Data połączenia:
            </span>
            <div className="font-bold text-cyan-600">{formatDateTime(mergedTransports.mergedAt)}</div>
          </div>
        </div>
      </div>
    )
  }

  // NOWE FUNKCJE DO POBIERANIA DANYCH W KATEGORIACH
  const getOrderData = (transport) => {
    return {
      orderNumber: transport.orderNumber || transport.order_number,
      mpk: getCurrentMPK(transport),
      documents: transport.documents || 'Brak'
    }
  }

  const getCarrierData = (transport) => {
    const response = transport.response || transport.response_data
    let responseData = null
    
    if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response)
      } catch (e) {
        responseData = null
      }
    } else {
      responseData = response
    }
    
    const driverInfo = responseData?.driverInfo || responseData?.driver
    const vehicleInfo = responseData?.vehicleInfo || responseData?.vehicle
    
    return {
      driverName: driverInfo?.name || 'Nie przypisano',
      driverPhone: driverInfo?.phone || 'Brak telefonu',
      vehiclePlates: vehicleInfo?.plates || 'Nie podano',
      vehicleModel: vehicleInfo?.model || 'Brak',
      vehicleType: transport.vehicleType || transport.vehicle_type || 'Standard'
    }
  }

  const getGoodsData = (transport) => {
    const goodsDescription = transport.goodsDescription || transport.goods_description
    let parsedGoods = null
    
    if (goodsDescription) {
      if (typeof goodsDescription === 'string') {
        try {
          parsedGoods = JSON.parse(goodsDescription)
        } catch (e) {
          parsedGoods = { description: goodsDescription }
        }
      } else {
        parsedGoods = goodsDescription
      }
    }
    
    const transportType = transport.transportType || transport.transport_type
    const isDrums = isDrumsTransport(transport)
    
    let goodsType = 'Towar standardowy'
    if (isDrums) {
      goodsType = 'Bębny'
    } else if (transportType === 'opakowaniowy') {
      goodsType = 'Opakowania'
    }
    
    return {
      type: goodsType,
      description: parsedGoods?.description || 'Brak opisu',
      weight: parsedGoods?.weight || 'Nie podano',
      price: getTotalPrice(transport)
    }
  }

  const getResponsibleData = (transport) => {
    const constructions = transport.responsibleConstructions || transport.responsible_constructions
    
    return {
      createdBy: transport.createdBy || transport.created_by || 'Nie podano',
      responsiblePerson: transport.responsiblePerson || transport.responsible_person || 'Nie przypisano',
      mpk: transport.mpk || 'Brak MPK',
      constructions: constructions || [],
      notes: transport.notes || ''
    }
  }

  const getDatesData = (transport) => {
    const actualDeliveryDate = getActualDeliveryDate(transport)
    const originalDeliveryDate = transport.deliveryDate || transport.delivery_date
    const isDateChanged = isDeliveryDateChanged(transport)
    
    return {
      created: transport.createdAt || transport.created_at,
      delivery: actualDeliveryDate,
      originalDelivery: originalDeliveryDate,
      completed: transport.completedAt || transport.completed_at,
      isDeliveryDateChanged: isDateChanged
    }
  }

  const getLoadingLocationData = (transport) => {
    if (transport.location === 'Odbiory własne') {
      let producerAddress = transport.producerAddress || transport.location_data
      if (typeof producerAddress === 'string') {
        try {
          producerAddress = JSON.parse(producerAddress)
        } catch (e) {
          return { company: 'Nie podano', address: 'Brak adresu', contact: 'Brak kontaktu' }
        }
      }
      return {
        company: producerAddress?.company || transport.clientName || transport.client_name || 'Nie podano',
        address: `${producerAddress?.city || ''}, ${producerAddress?.postalCode || ''}, ${producerAddress?.street || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Brak adresu',
        contact: transport.loadingContact || transport.loading_contact || 'Brak kontaktu'
      }
    } else if (transport.location === 'Magazyn Białystok') {
      return {
        company: 'Grupa Eltron Sp. z o.o.',
        address: 'Białystok, Magazyn centralny',
        contact: transport.loadingContact || transport.loading_contact || 'Standardowy kontakt'
      }
    } else if (transport.location === 'Magazyn Zielonka') {
      return {
        company: 'Grupa Eltron Sp. z o.o.',
        address: 'Zielonka, Magazyn regionalny',
        contact: transport.loadingContact || transport.loading_contact || 'Standardowy kontakt'
      }
    }
    return { company: 'Nie podano', address: 'Brak adresu', contact: 'Brak kontaktu' }
  }

  const getUnloadingLocationData = (transport) => {
    let delivery = transport.delivery || transport.delivery_data
    if (typeof delivery === 'string') {
      try {
        delivery = JSON.parse(delivery)
      } catch (e) {
        return { company: 'Nie podano', address: 'Brak adresu', contact: 'Brak kontaktu' }
      }
    }
    
    if (!delivery) return { company: 'Nie podano', address: 'Brak adresu', contact: 'Brak kontaktu' }
    
    return {
      company: transport.clientName || transport.client_name || delivery.company || 'Nie podano',
      address: `${delivery.city || ''}, ${delivery.postalCode || ''}, ${delivery.street || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Brak adresu',
      contact: transport.unloadingContact || transport.unloading_contact || 'Brak kontaktu'
    }
  }

  // Funkcja stosująca WSZYSTKIE filtry
  const applyFilters = (data = archiwum) => {
    let filtered = [...data]

    // Filtr roku
    if (selectedYear) {
      filtered = filtered.filter(item => {
        const itemYear = new Date(item.completedAt || item.completed_at || item.createdAt || item.created_at).getFullYear()
        return itemYear === selectedYear
      })
    }

    // Filtr miesiąca
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(item => {
        const itemMonth = new Date(item.completedAt || item.completed_at || item.createdAt || item.created_at).getMonth()
        return itemMonth === parseInt(selectedMonth)
      })
    }

    // Filtr MPK
    if (mpkFilter) {
      filtered = filtered.filter(item => 
        (item.mpk && item.mpk.toLowerCase().includes(mpkFilter.toLowerCase()))
      )
    }

    // Filtr numeru zamówienia
    if (orderNumberFilter) {
      filtered = filtered.filter(item => 
        (item.orderNumber || item.order_number || '').toLowerCase().includes(orderNumberFilter.toLowerCase())
      )
    }

    // Filtr lokalizacji
    if (locationFilter !== 'all') {
      filtered = filtered.filter(item => item.location === locationFilter)
    }

    // Filtr typu transportu
    if (transportTypeFilter !== 'all') {
      filtered = filtered.filter(item => 
        (item.transportType || item.transport_type) === transportTypeFilter
      )
    }

    // Filtr typu pojazdu
    if (vehicleTypeFilter !== 'all') {
      filtered = filtered.filter(item => 
        (item.vehicleType || item.vehicle_type) === vehicleTypeFilter
      )
    }

    // Filtr statusu łączenia
    if (mergedFilter !== 'all') {
      filtered = filtered.filter(item => {
        const isMerged = isTransportMerged(item)
        if (mergedFilter === 'merged') return isMerged
        if (mergedFilter === 'single') return !isMerged
        return true
      })
    }

    // Filtr transportu bębnów
    if (drumsFilter !== 'all') {
      filtered = filtered.filter(item => {
        const isDrums = isDrumsTransport(item)
        if (drumsFilter === 'drums') return isDrums
        if (drumsFilter === 'standard') return !isDrums
        return true
      })
    }

    // Filtr nazwy kierowcy
    if (driverNameFilter) {
      filtered = filtered.filter(item => 
        getDriverInfo(item).toLowerCase().includes(driverNameFilter.toLowerCase())
      )
    }

    // Filtr nazwy klienta
    if (clientNameFilter) {
      filtered = filtered.filter(item => 
        (item.clientName || item.client_name || '').toLowerCase().includes(clientNameFilter.toLowerCase())
      )
    }

    // Filtr odpowiedzialnej osoby
    if (responsiblePersonFilter) {
      filtered = filtered.filter(item => 
        (item.responsiblePerson || item.responsible_person || '').toLowerCase().includes(responsiblePersonFilter.toLowerCase())
      )
    }

    // Filtr miasta dostawy
    if (deliveryCityFilter) {
      filtered = filtered.filter(item => 
        getDeliveryCity(item).toLowerCase().includes(deliveryCityFilter.toLowerCase())
      )
    }

    // Filtr dokumentów
    if (documentsFilter) {
      filtered = filtered.filter(item => 
        (item.documents || '').toLowerCase().includes(documentsFilter.toLowerCase())
      )
    }

    // Filtr uwag
    if (notesFilter) {
      filtered = filtered.filter(item => 
        (item.notes || '').toLowerCase().includes(notesFilter.toLowerCase())
      )
    }

    // Filtr ceny (min)
    if (minPriceFilter) {
      filtered = filtered.filter(item => {
        const price = parseFloat(getTotalPrice(item)) || 0
        return price >= parseFloat(minPriceFilter)
      })
    }

    // Filtr ceny (max)
    if (maxPriceFilter) {
      filtered = filtered.filter(item => {
        const price = parseFloat(getTotalPrice(item)) || 0
        return price <= parseFloat(maxPriceFilter)
      })
    }

    // Filtr odległości (min)
    if (minDistanceFilter) {
      filtered = filtered.filter(item => {
        const distance = item.distanceKm || item.distance_km || 0
        return distance >= parseFloat(minDistanceFilter)
      })
    }

    // Filtr odległości (max)
    if (maxDistanceFilter) {
      filtered = filtered.filter(item => {
        const distance = item.distanceKm || item.distance_km || 0
        return distance <= parseFloat(maxDistanceFilter)
      })
    }

    setFilteredArchiwum(filtered)
    setCurrentPage(1) // Reset paginacji
  }

  // Stosuj filtry przy każdej zmianie
  useEffect(() => {
    applyFilters()
  }, [
    archiwum, selectedYear, selectedMonth, mpkFilter, orderNumberFilter, 
    locationFilter, transportTypeFilter, vehicleTypeFilter, mergedFilter, 
    drumsFilter, driverNameFilter, clientNameFilter, responsiblePersonFilter,
    deliveryCityFilter, documentsFilter, notesFilter, minPriceFilter, 
    maxPriceFilter, minDistanceFilter, maxDistanceFilter
  ])

  // Reset filtrów
  const resetFilters = () => {
    setSelectedYear(new Date().getFullYear())
    setSelectedMonth('all')
    setMpkFilter('')
    setOrderNumberFilter('')
    setLocationFilter('all')
    setTransportTypeFilter('all')
    setVehicleTypeFilter('all')
    setMergedFilter('all')
    setDrumsFilter('all')
    setDriverNameFilter('')
    setClientNameFilter('')
    setResponsiblePersonFilter('')
    setDeliveryCityFilter('')
    setDocumentsFilter('')
    setNotesFilter('')
    setMinPriceFilter('')
    setMaxPriceFilter('')
    setMinDistanceFilter('')
    setMaxDistanceFilter('')
  }

  // Funkcja usuwania transportu (dla adminów)
  const handleDeleteTransport = async (transportId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten transport? Ta operacja jest nieodwracalna.')) {
      return
    }

    try {
      setDeleteStatus({ type: 'loading', message: 'Usuwanie transportu...' })
      
      const response = await fetch(`/api/spedycje/${transportId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDeleteStatus({ type: 'success', message: 'Transport został pomyślnie usunięty' })
        // Odśwież dane
        fetchArchiveData()
      } else {
        setDeleteStatus({ type: 'error', message: data.error || 'Błąd usuwania transportu' })
      }
    } catch (error) {
      console.error('Błąd usuwania transportu:', error)
      setDeleteStatus({ type: 'error', message: 'Wystąpił błąd podczas usuwania transportu' })
    }
    
    // Ukryj komunikat po 5 sekundach
    setTimeout(() => setDeleteStatus(null), 5000)
  }

  // Funkcja eksportu - ulepszona
  const handleExport = () => {
    if (filteredArchiwum.length === 0) {
      alert('Brak danych do eksportu')
      return
    }

    const dataToExport = filteredArchiwum.map(transport => {
      const responsibleInfo = getResponsibleInfo(transport)
      const orderData = getOrderData(transport)
      const carrierData = getCarrierData(transport)
      const goodsData = getGoodsData(transport)
      const responsibleData = getResponsibleData(transport)
      const datesData = getDatesData(transport)
      const loadingLocation = getLoadingLocationData(transport)
      const unloadingLocation = getUnloadingLocationData(transport)
      
      return {
        'Nr zamówienia': orderData.orderNumber,
        'MPK': orderData.mpk,
        'Dokumenty': orderData.documents,
        'Kierowca': carrierData.driverName,
        'Telefon kierowcy': carrierData.driverPhone,
        'Numer auta': carrierData.vehiclePlates,
        'Model pojazdu': carrierData.vehicleModel,
        'Rodzaj pojazdu': carrierData.vehicleType,
        'Rodzaj towaru': goodsData.type,
        'Opis towaru': goodsData.description,
        'Waga': goodsData.weight,
        'Cena towaru': goodsData.price,
        'Dodane przez': responsibleData.createdBy,
        'Osoba odpowiedzialna': responsibleData.responsiblePerson,
        'Uwagi zamówienia': responsibleData.notes,
        'Data utworzenia': formatDate(datesData.created),
        'Data dostawy': formatDate(datesData.delivery),
        'Data zakończenia': formatDate(datesData.completed),
        'Data dostawy zmieniona': datesData.isDeliveryDateChanged ? 'Tak' : 'Nie',
        'Firma załadunek': loadingLocation.company,
        'Adres załadunek': loadingLocation.address,
        'Kontakt załadunek': loadingLocation.contact,
        'Firma rozładunek': unloadingLocation.company,
        'Adres rozładunek': unloadingLocation.address,
        'Kontakt rozładunek': unloadingLocation.contact,
        'Łączony': isTransportMerged(transport) ? 'Tak' : 'Nie'
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

  // Funkcja drukowania CMR
  const handlePrintCMR = (transport) => {
    try {
      generateCMR(transport)
    } catch (error) {
      console.error('Błąd generowania CMR:', error)
      alert('Wystąpił błąd podczas generowania dokumentu CMR')
    }
  }

  // Paginacja
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredArchiwum.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredArchiwum.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error && archiwum.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={24} className="mx-auto mb-2" />
          <h3 className="font-bold mb-2">Błąd ładowania danych</h3>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchArchiveData}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="text-blue-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">
            Archiwum Spedycji
          </h1>
        </div>
        <p className="text-gray-600">
          Zrealizowane zlecenia spedycyjne z pełnymi szczegółami organizacji transportu
        </p>
      </div>

      {/* Delete Status */}
      {deleteStatus && (
        <div className={`mb-4 p-4 rounded-lg border ${
          deleteStatus.type === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          deleteStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-red-50 text-red-700 border-red-200'
        }`}>
          {deleteStatus.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            {showFilters ? 'Ukryj filtry' : 'Pokaż filtry'}
          </button>
          
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{filteredArchiwum.length}</span> z {archiwum.length} rekordów
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Eksportuj
          </button>
        </div>
      </div>

      {/* WSZYSTKIE FILTRY - jak w oryginale */}
      {showFilters && (
        <div className="mb-8 bg-white rounded-lg shadow border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Filtry wyszukiwania</h3>
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
              Wyczyść wszystkie
            </button>
          </div>
          
          {/* Filtry podstawowe */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rok</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miesiąc</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie miesiące</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {format(new Date(2023, i, 1), 'LLLL', { locale: pl })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MPK</label>
              <input
                type="text"
                value={mpkFilter}
                onChange={(e) => setMpkFilter(e.target.value)}
                placeholder="Wpisz MPK..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nr zamówienia</label>
              <input
                type="text"
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                placeholder="Wpisz numer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtry rozszerzone */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Źródło</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie lokalizacje</option>
                {locationOptions.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status łączenia</label>
              <select
                value={mergedFilter}
                onChange={(e) => setMergedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie</option>
                <option value="merged">Łączone</option>
                <option value="single">Pojedyncze</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transport bębnów</label>
              <select
                value={drumsFilter}
                onChange={(e) => setDrumsFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie</option>
                <option value="drums">Tylko bębny</option>
                <option value="standard">Bez bębnów</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ transportu</label>
              <select
                value={transportTypeFilter}
                onChange={(e) => setTransportTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie typy</option>
                {transportTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ pojazdu</label>
              <select
                value={vehicleTypeFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie pojazdy</option>
                {vehicleTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Klient</label>
              <input
                type="text"
                value={clientNameFilter}
                onChange={(e) => setClientNameFilter(e.target.value)}
                placeholder="Nazwa klienta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtry tekstowe */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Odpowiedzialny</label>
              <input
                type="text"
                value={responsiblePersonFilter}
                onChange={(e) => setResponsiblePersonFilter(e.target.value)}
                placeholder="Nazwa osoby..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miasto dostawy</label>
              <input
                type="text"
                value={deliveryCityFilter}
                onChange={(e) => setDeliveryCityFilter(e.target.value)}
                placeholder="Miasto..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dokumenty</label>
              <input
                type="text"
                value={documentsFilter}
                onChange={(e) => setDocumentsFilter(e.target.value)}
                placeholder="Dokumenty..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uwagi</label>
              <input
                type="text"
                value={notesFilter}
                onChange={(e) => setNotesFilter(e.target.value)}
                placeholder="Tekst w uwagach..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtry zakresów */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cena min</label>
              <input
                type="number"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cena max</label>
              <input
                type="number"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                placeholder="9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Odległość min (km)</label>
              <input
                type="number"
                value={minDistanceFilter}
                onChange={(e) => setMinDistanceFilter(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Odległość max (km)</label>
              <input
                type="number"
                value={maxDistanceFilter}
                onChange={(e) => setMaxDistanceFilter(e.target.value)}
                placeholder="9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results - NOWY LAYOUT KATEGORII */}
      <div className="space-y-6">
        {currentItems.length > 0 ? (
          currentItems.map((transport) => {
            const orderData = getOrderData(transport)
            const carrierData = getCarrierData(transport)
            const goodsData = getGoodsData(transport)
            const responsibleData = getResponsibleData(transport)
            const datesData = getDatesData(transport)
            const loadingLocation = getLoadingLocationData(transport)
            const unloadingLocation = getUnloadingLocationData(transport)
            const isExpanded = expandedRowId === transport.id
            
            return (
              <div key={transport.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div 
                  onClick={() => setExpandedRowId(isExpanded ? null : transport.id)}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                        {orderData.orderNumber}
                      </div>
                      
                      {/* Type Badges */}
                      <div className="flex gap-2">
                        {getTransportTypeDisplay(transport).map((badge, index) => (
                          <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${badge.color}`}>
                            {badge.icon}
                            {badge.text}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-gray-600">
                        <span className="font-medium">Zrealizowano:</span> {formatDate(datesData.completed)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Admin Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePrintCMR(transport)
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Drukuj CMR"
                          >
                            <Printer size={20} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTransport(transport.id)
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                            title="Usuń transport"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                      
                      <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content - KATEGORIE */}
                {isExpanded && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Lewa kolumna */}
                      <div className="space-y-6">
                        
                        {/* 1. Dane zamówienia */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-blue-800 mb-4">
                            <Clipboard className="mr-2" size={20} />
                            Dane zamówienia
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numer zamówienia:</span>
                              <span className="font-semibold">{orderData.orderNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">MPK:</span>
                              <span className="font-semibold">{orderData.mpk}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Dokumenty:</span>
                              <span className="font-semibold">{orderData.documents}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Dane przewoźnika */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-green-800 mb-4">
                            <Truck className="mr-2" size={20} />
                            Dane przewoźnika
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Imię i nazwisko kierowcy:</span>
                              <span className="font-semibold">{carrierData.driverName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Telefon kontaktowy:</span>
                              <span className="font-semibold">{carrierData.driverPhone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numer auta:</span>
                              <span className="font-semibold">{carrierData.vehiclePlates}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Model pojazdu:</span>
                              <span className="font-semibold">{carrierData.vehicleModel}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rodzaj pojazdu:</span>
                              <span className="font-semibold">{carrierData.vehicleType}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Dane o towarze */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-orange-800 mb-4">
                            <Package className="mr-2" size={20} />
                            Dane o towarze
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rodzaj towaru:</span>
                              <span className="font-semibold">{goodsData.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Opis z zamówienia:</span>
                              <span className="font-semibold">{goodsData.description}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Waga:</span>
                              <span className="font-semibold">{goodsData.weight}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cena towaru:</span>
                              <span className="font-semibold">{goodsData.price} zł</span>
                            </div>
                          </div>
                        </div>

                        {/* 4. Osoby odpowiedzialne */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-purple-800 mb-4">
                            <UserCheck className="mr-2" size={20} />
                            Osoby odpowiedzialne
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Dodane przez:</span>
                              <span className="font-semibold">{responsibleData.createdBy}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Osoba odpowiedzialna:</span>
                              <span className="font-semibold">{responsibleData.responsiblePerson}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numer MPK:</span>
                              <span className="font-semibold">{responsibleData.mpk}</span>
                            </div>
                            {responsibleData.notes && (
                              <div>
                                <div className="text-gray-600 mb-1">Uwagi zamówienia:</div>
                                <div className="bg-white border border-purple-200 rounded p-3 text-sm">
                                  {responsibleData.notes}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Odpowiedzialne budowy */}
                          {responsibleData.constructions.length > 0 && (
                            <div className="mt-3">
                              {renderResponsibleConstructions(transport)}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Prawa kolumna */}
                      <div className="space-y-6">
                        
                        {/* 5. Daty */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-indigo-800 mb-4">
                            <Calendar className="mr-2" size={20} />
                            Daty
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Data utworzenia:</span>
                              <span className="font-semibold">{formatDate(datesData.created)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Data dostawy:</span>
                              <span className="font-semibold">
                                {formatDate(datesData.delivery)}
                                {datesData.isDeliveryDateChanged && (
                                  <div className="text-xs text-orange-600 mt-1">
                                    (zmieniona z {formatDate(datesData.originalDelivery)})
                                  </div>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Data zakończenia:</span>
                              <span className="font-semibold">{formatDate(datesData.completed)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 6. Miejsce załadunku */}
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-cyan-800 mb-4">
                            <MapPin className="mr-2" size={20} />
                            Miejsce załadunku
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nazwa firmy:</span>
                              <span className="font-semibold">{loadingLocation.company}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Adres:</span>
                              <span className="font-semibold">{loadingLocation.address}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kontakt:</span>
                              <span className="font-semibold">{loadingLocation.contact}</span>
                            </div>
                          </div>
                        </div>

                        {/* 7. Miejsce rozładunku */}
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                          <h3 className="flex items-center text-lg font-semibold text-teal-800 mb-4">
                            <Target className="mr-2" size={20} />
                            Miejsce rozładunku
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nazwa firmy:</span>
                              <span className="font-semibold">{unloadingLocation.company}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Adres:</span>
                              <span className="font-semibold">{unloadingLocation.address}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kontakt:</span>
                              <span className="font-semibold">{unloadingLocation.contact}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Merged Transport Details - jeśli istnieją */}
                    {isTransportMerged(transport) && renderMergedTransportDetails(transport)}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow border">
            <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Package size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Brak wyników
            </h3>
            <p className="text-gray-600 mb-6">
              Nie znaleziono transportów spełniających kryteria wyszukiwania.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Wyczyść filtry
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-700">
            Pokazuje {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredArchiwum.length)} z {filteredArchiwum.length} wyników
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const page = i + 1
                if (totalPages <= 10) {
                  return (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                }
                return null
              })}
            </div>
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}