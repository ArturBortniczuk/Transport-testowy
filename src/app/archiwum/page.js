// src/app/archiwum/page.js - NOWY ZAJEBISTY DESIGN
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { KIEROWCY, RYNKI, POJAZDY } from '../kalendarz/constants'
import * as XLSX from 'xlsx'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Star, 
  StarOff, 
  ChevronDown, 
  MapPin, 
  Truck, 
  Building, 
  User, 
  Calendar, 
  Trash2,
  Filter,
  TrendingUp,
  Package,
  Route,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import TransportRating from '@/components/TransportRating'
import TransportRatingBadge from '@/components/TransportRatingBadge'

export default function ArchiwumPage() {
  const [archiwum, setArchiwum] = useState([])
  const [filteredArchiwum, setFilteredArchiwum] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [selectedTransport, setSelectedTransport] = useState(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratableTransports, setRatableTransports] = useState({})
  const [ratingValues, setRatingValues] = useState({})
  
  // Filtry
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedRequester, setSelectedRequester] = useState('')
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedConstruction, setSelectedConstruction] = useState('')
  
  // Lista użytkowników (handlowców) do filtrowania
  const [users, setUsers] = useState([])
  const [constructions, setConstructions] = useState([])
  
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

  // Funkcja aktualizująca informację o możliwości oceny transportu i jego ocenie
  const handleCanBeRatedChange = (transportId, canBeRated, isPositive = null) => {
    setRatableTransports(prev => {
      if (prev[transportId] === canBeRated) return prev
      return {
        ...prev,
        [transportId]: canBeRated
      }
    })
    
    if (isPositive !== null) {
      setRatingValues(prev => ({
        ...prev,
        [transportId]: { isPositive }
      }))
    }
  }

  useEffect(() => {
    // Sprawdź czy użytkownik jest administratorem
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
    
    // Pobierz listę użytkowników (handlowców)
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/list')
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error('Błąd pobierania użytkowników:', error)
      }
    }

    // Pobierz listę budów do filtrowania
    const fetchConstructions = async () => {
      try {
        const response = await fetch('/api/constructions')
        if (response.ok) {
          const data = await response.json()
          setConstructions(data.constructions || [])
        }
      } catch (error) {
        console.error('Błąd pobierania budów:', error)
      }
    }

    checkAdmin()
    fetchUsers()
    fetchConstructions()
    fetchArchivedTransports()
  }, [])

  // Pobierz dane archiwum z API
  const fetchArchivedTransports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transports?status=completed')
      const data = await response.json()
      
      if (data.success) {
        const sortedTransports = data.transports.sort((a, b) => 
          new Date(b.delivery_date) - new Date(a.delivery_date)
        )
        setArchiwum(sortedTransports)
        applyFilters(sortedTransports, selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction)
      } else {
        setError('Nie udało się pobrać archiwum transportów')
      }
    } catch (error) {
      console.error('Błąd pobierania archiwum:', error)
      setError('Wystąpił błąd podczas pobierania danych')
    } finally {
      setLoading(false)
    }
  }
  
  // Funkcja filtrująca transporty
  const applyFilters = (transports, year, month, warehouse, driver, requester, rating, construction) => {
    if (!transports) return
    
    const filtered = transports.filter(transport => {
      const date = new Date(transport.delivery_date)
      const transportYear = date.getFullYear()
      
      if (transportYear !== parseInt(year)) {
        return false
      }
      
      if (month !== 'all') {
        const transportMonth = date.getMonth()
        if (transportMonth !== parseInt(month)) {
          return false
        }
      }
      
      if (warehouse && transport.source_warehouse !== warehouse) {
        return false
      }
      
      if (driver && transport.driver_id.toString() !== driver) {
        return false
      }
      
      if (requester && transport.requester_email !== requester) {
        return false
      }
      
      if (rating !== 'all') {
        const hasRating = ratableTransports[transport.id] !== undefined && !ratableTransports[transport.id];
        
        if (rating === 'positive') {
          return hasRating && ratingValues[transport.id]?.isPositive === true;
        } else if (rating === 'negative') {
          return hasRating && ratingValues[transport.id]?.isPositive === false;
        } else if (rating === 'unrated') {
          return !hasRating || ratableTransports[transport.id];
        }
      }
      
      if (construction) {
        const selectedConstruction = constructions.find(c => c.id.toString() === construction);
        if (selectedConstruction) {
          const matchesClientName = transport.client_name && 
            transport.client_name.toLowerCase().includes(selectedConstruction.name.toLowerCase());
          const matchesMpk = transport.mpk && transport.mpk === selectedConstruction.mpk;
          
          if (!matchesClientName && !matchesMpk) {
            return false;
          }
        }
      }
      
      return true
    })
    
    setFilteredArchiwum(filtered)
  }

  // Obsługa zmiany filtrów
  useEffect(() => {
    applyFilters(archiwum, selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction)
  }, [selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction, archiwum, ratableTransports, ratingValues])

  // Funkcja do usuwania transportu
  const handleDeleteTransport = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten transport?')) {
      return
    }
    
    try {
      setDeleteStatus({ type: 'loading', message: 'Usuwanie transportu...' })
      
      const response = await fetch(`/api/transports/delete?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        const updatedArchiwum = archiwum.filter(transport => transport.id !== id)
        setArchiwum(updatedArchiwum)
        applyFilters(updatedArchiwum, selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction)
        
        setDeleteStatus({ type: 'success', message: 'Transport został usunięty' })
        
        setTimeout(() => {
          setDeleteStatus(null)
        }, 3000)
      } else {
        setDeleteStatus({ type: 'error', message: data.error || 'Nie udało się usunąć transportu' })
      }
    } catch (error) {
      console.error('Błąd usuwania transportu:', error)
      setDeleteStatus({ type: 'error', message: 'Wystąpił błąd podczas usuwania transportu' })
    }
  }

  // Funkcja do otwierania modalu ocen
  const handleOpenRatingModal = (transport) => {
    setSelectedTransport(transport)
    setShowRatingModal(true)
  }

  // Funkcja do zamykania modalu ocen
  const handleCloseRating = () => {
    setShowRatingModal(false)
    setSelectedTransport(null)
    // Odświeżenie po zamknięciu modalu
    fetchArchivedTransports()
  }

  // Funkcja pomocnicza do znajdowania danych kierowcy
  const getDriverInfo = (driverId) => {
    const driver = KIEROWCY.find(k => k.id === parseInt(driverId))
    if (!driver) return 'Brak danych'
    
    const vehicle = POJAZDY.find(p => p.id === parseInt(driverId))
    const vehicleInfo = vehicle ? vehicle.tabliceRej : 'Brak pojazdu'
    
    return `${driver.imie} (${vehicleInfo})`
  }

  // Funkcja eksportująca dane do pliku
  const exportData = () => {
    if (filteredArchiwum.length === 0) {
      alert('Brak danych do eksportu')
      return
    }
    
    const dataToExport = filteredArchiwum.map(transport => {
      const driver = KIEROWCY.find(k => k.id === parseInt(transport.driver_id))
      
      return {
        'Data transportu': format(new Date(transport.delivery_date), 'dd.MM.yyyy', { locale: pl }),
        'Miasto': transport.destination_city,
        'Kod pocztowy': transport.postal_code || '',
        'Ulica': transport.street || '',
        'Magazyn': transport.source_warehouse === 'bialystok' ? 'Białystok' : 
                 transport.source_warehouse === 'zielonka' ? 'Zielonka' : 
                 transport.source_warehouse,
        'Odległość (km)': transport.distance || '',
        'Firma': transport.client_name || '',
        'MPK': transport.mpk || '',
        'Kierowca': driver ? driver.imie : '',
        'Nr rejestracyjny': driver ? driver.tabliceRej : '',
        'Status': transport.status || '',
        'Data zakończenia': transport.completed_at ? format(new Date(transport.completed_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '',
        'Osoba zlecająca': transport.requester_name || '',
        'Ocena': ratingValues[transport.id] 
          ? (ratingValues[transport.id].isPositive ? 'Pozytywna' : 'Negatywna') 
          : 'Brak oceny'
      }
    })
    
    const monthLabel = selectedMonth === 'all' ? 'wszystkie_miesiace' : 
                     months.find(m => m.value === selectedMonth)?.label.toLowerCase() || selectedMonth
    
    const fileName = `transporty_${selectedYear}_${monthLabel}`
    
    if (exportFormat === 'csv') {
      exportToCSV(dataToExport, fileName)
    } else {
      exportToXLSX(dataToExport, fileName)
    }
  }
  
  // Eksport do CSV
  const exportToCSV = (data, fileName) => {
    const headers = Object.keys(data[0])
    
    let csvContent = headers.join(';') + '\n'
    data.forEach(item => {
      const row = headers.map(header => {
        let cell = item[header] !== undefined && item[header] !== null ? item[header] : ''
        if (cell.toString().includes(',') || cell.toString().includes(';') || cell.toString().includes('\n')) {
          cell = `"${cell}"`
        }
        return cell
      }).join(';')
      csvContent += row + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Eksport do XLSX
  const exportToXLSX = (data, fileName) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transporty')
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  // Paginacja
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredArchiwum.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredArchiwum.length / itemsPerPage)

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  // Statystyki
  const totalDistance = filteredArchiwum.reduce((sum, t) => sum + (t.distance || 0), 0)
  const averageDistance = filteredArchiwum.length > 0 ? (totalDistance / filteredArchiwum.length).toFixed(1) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header z gradientem */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                📦 Archiwum Transportów
              </h1>
              <p className="text-blue-100 text-lg">
                Przeglądaj, filtruj i oceniaj zrealizowane transporty
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{filteredArchiwum.length}</div>
              <div className="text-blue-100">transportów</div>
            </div>
          </div>
        </div>

        {/* Statystyki w kartach */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transporty</p>
                <p className="text-2xl font-bold text-gray-900">{filteredArchiwum.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Route className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Łączna odległość</p>
                <p className="text-2xl font-bold text-gray-900">{totalDistance.toLocaleString('pl-PL')} km</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Średnia odległość</p>
                <p className="text-2xl font-bold text-gray-900">{averageDistance} km</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ocenione</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(ratingValues).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel filtrów */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Filtry</h3>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span>Filtry zaawansowane</span>
              <ChevronDown 
                className={`ml-1 w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>
          
          {/* Podstawowe filtry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rok</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miesiąc</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Magazyn</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Wszystkie magazyny</option>
                <option value="bialystok">Magazyn Białystok</option>
                <option value="zielonka">Magazyn Zielonka</option>
              </select>
            </div>
          </div>
      
          {/* Filtry zaawansowane */}
          {showAdvancedFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kierowca</label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Wszyscy kierowcy</option>
                    {KIEROWCY.map(kierowca => (
                      <option key={kierowca.id} value={kierowca.id}>
                        {kierowca.imie}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Osoba zlecająca</label>
                  <select
                    value={selectedRequester}
                    onChange={(e) => setSelectedRequester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Wszyscy zlecający</option>
                    {users.map(user => (
                      <option key={user.email} value={user.email}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budowa</label>
                  <select
                    value={selectedConstruction}
                    onChange={(e) => setSelectedConstruction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Wszystkie budowy</option>
                    {constructions.map(construction => (
                      <option key={construction.id} value={construction.id}>
                        {construction.name} ({construction.mpk})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ocena</label>
                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Wszystkie oceny</option>
                    <option value="positive">Pozytywne</option>
                    <option value="negative">Negatywne</option>
                    <option value="unrated">Nieocenione</option>
                  </select>
                </div>
              </div>
              
              {/* Eksport */}
              <div className="flex flex-col sm:flex-row gap-4 items-end border-t pt-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format eksportu</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                
                <button
                  onClick={exportData}
                  disabled={filteredArchiwum.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  <span>Eksportuj</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status usuwania */}
        {deleteStatus && (
          <div className={`mb-6 p-4 rounded-lg ${
            deleteStatus.type === 'loading' ? 'bg-blue-50 text-blue-700' :
            deleteStatus.type === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {deleteStatus.message}
          </div>
        )}

        {/* Grid transportów */}
        {currentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentItems.map((transport) => (
              <div key={transport.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Header karty */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg flex items-center">
                        <MapPin className="w-5 h-5 mr-2" />
                        {transport.destination_city}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {transport.postal_code} {transport.street && `• ${transport.street}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">
                        {format(new Date(transport.delivery_date), 'd MMM', { locale: pl })}
                      </div>
                      <div className="text-xs opacity-75">
                        {format(new Date(transport.delivery_date), 'yyyy', { locale: pl })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zawartość karty */}
                <div className="p-4">
                  {/* Informacje główne */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className={`w-4 h-4 mr-2 ${transport.source_warehouse === 'bialystok' ? 'text-red-500' : 'text-blue-500'}`} />
                      <span className="truncate">
                        {transport.source_warehouse === 'bialystok' ? 'Białystok' : 'Zielonka'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Route className="w-4 h-4 mr-2 text-green-500" />
                      <span>{transport.distance || 0} km</span>
                    </div>
                  </div>

                  {/* Klient i MPK */}
                  <div className="mb-4">
                    <p className="font-medium text-gray-900 truncate" title={transport.client_name}>
                      {transport.client_name || 'Brak nazwy klienta'}
                    </p>
                    {transport.mpk && (
                      <p className="text-sm text-gray-600">MPK: {transport.mpk}</p>
                    )}
                  </div>

                  {/* Kierowca */}
                  <div className="flex items-center mb-4">
                    <Truck className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-600 truncate">
                      {getDriverInfo(transport.driver_id)}
                    </span>
                  </div>

                  {/* Osoba zlecająca */}
                  {transport.requester_name && (
                    <div className="flex items-center mb-4">
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600 truncate">
                        {transport.requester_name}
                      </span>
                    </div>
                  )}

                  {/* Data zakończenia */}
                  {transport.completed_at && (
                    <div className="flex items-center mb-4">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Zakończono: {format(new Date(transport.completed_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                      </span>
                    </div>
                  )}

                  {/* Ocena transportu */}
                  <div className="mb-4">
                    <TransportRatingBadge 
                      transportId={transport.id} 
                      refreshTrigger={0}
                      onCanBeRatedChange={(canBeRated, isPositive) => handleCanBeRatedChange(transport.id, canBeRated, isPositive)}
                    />
                  </div>
                </div>

                {/* Footer z przyciskami */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    {/* Przycisk oceny */}
                    <div>
                      {ratableTransports[transport.id] !== undefined && (
                        ratableTransports[transport.id] ? (
                          <button
                            onClick={() => handleOpenRatingModal(transport)}
                            className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Oceń
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenRatingModal(transport)}
                            className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Zobacz oceny
                          </button>
                        )
                      )}
                    </div>

                    {/* Przycisk usuwania dla adminów */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTransport(transport.id)}
                        className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        title="Usuń transport"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak transportów</h3>
              <p className="text-gray-600">
                Nie znaleziono transportów spełniających wybrane kryteria filtrowania.
              </p>
              <p className="text-gray-500 mt-2">
                Spróbuj zmienić filtry lub wybierz inny okres.
              </p>
            </div>
          </div>
        )}

        {/* Paginacja */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                <span className="font-medium">Strona {currentPage} z {totalPages}</span>
                <span className="mx-2">•</span>
                <span>Łącznie {filteredArchiwum.length} transportów</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Poprzednia
                </button>
                
                {/* Numery stron */}
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Następna
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal oceniania transportu */}
        {showRatingModal && selectedTransport && (
          <TransportRating
            transportId={selectedTransport.id}
            onClose={handleCloseRating}
          />
        )}
      </div>
    </div>
  );
}
