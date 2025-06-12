// src/app/archiwum/page.js - POPRAWIONA WERSJA Z LISTĄ
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
  Package,
  Route,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Phone,
  Hash,
  MessageSquare
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
  const [itemsPerPage] = useState(10)
  const [selectedTransport, setSelectedTransport] = useState(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [expandedRows, setExpandedRows] = useState({})
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

  // Funkcja przełączania rozwinięcia wiersza
  const toggleRowExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

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
        'Nr WZ': transport.wz_number || '',
        'Kierowca': driver ? driver.imie : '',
        'Nr rejestracyjny': driver ? driver.tabliceRej : '',
        'Status': transport.status || '',
        'Data zakończenia': transport.completed_at ? format(new Date(transport.completed_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '',
        'Osoba zlecająca': transport.requester_name || '',
        'Email zlecającego': transport.requester_email || '',
        'Rynek': transport.market || '',
        'Poziom załadunku': transport.loading_level || '',
        'Uwagi': transport.notes || '',
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</div>
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Archiwum Transportów
        </h1>
        <p className="text-gray-600">
          Przeglądaj, filtruj i oceniaj zrealizowane transporty
        </p>
      </div>

      {/* Panel filtrów */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filtry</h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>Filtry zaawansowane</span>
            <ChevronDown 
              size={16} 
              className={`ml-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
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
              className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="xlsx">Excel (XLSX)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              
              <button
                onClick={exportData}
                disabled={filteredArchiwum.length === 0}
                className="w-full sm:w-auto py-2 px-6 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                <span>Eksportuj</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Podsumowanie i status */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Znaleziono:</span> {filteredArchiwum.length} transportów
          {filteredArchiwum.length > 0 && (
            <span className="ml-4">
              <span className="font-medium">Całkowita odległość:</span> {totalDistance.toLocaleString('pl-PL')} km
            </span>
          )}
        </div>
        
        {deleteStatus && (
          <div className={`text-sm px-3 py-1 rounded ${
            deleteStatus.type === 'loading' ? 'bg-blue-100 text-blue-700' :
            deleteStatus.type === 'success' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {deleteStatus.message}
          </div>
        )}
      </div>

      {/* Lista transportów */}
      <div className="space-y-4">
        {currentItems.length > 0 ? (
          currentItems.map((transport) => (
            <div key={transport.id} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Nagłówek karty transportu - kompaktowy grid */}
              <div 
                className="px-6 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleRowExpand(transport.id)}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Data - 2 kolumny */}
                  <div className="col-span-2 flex items-center text-gray-700">
                    <Calendar size={14} className="mr-2 text-blue-600" />
                    <span className="font-medium text-sm">
                      {format(new Date(transport.delivery_date), 'dd.MM.yy', { locale: pl })}
                    </span>
                  </div>
                  
                  {/* Miejsce docelowe - 3 kolumny */}
                  <div className="col-span-3">
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{transport.destination_city}</div>
                        <div className="text-xs text-gray-600 truncate">
                          {transport.postal_code}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Klient - 2 kolumny */}
                  <div className="col-span-2 hidden sm:block">
                    <div className="text-sm font-medium text-gray-900 truncate" title={transport.client_name}>
                      {transport.client_name || 'Brak nazwy'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {transport.mpk || 'Brak MPK'}
                    </div>
                  </div>
                  
                  {/* Magazyn - 1 kolumna */}
                  <div className="col-span-1 hidden md:block text-center">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      transport.source_warehouse === 'bialystok' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {transport.source_warehouse === 'bialystok' ? 'BIA' : 'ZIE'}
                    </div>
                  </div>
                  
                  {/* Kierowca - 2 kolumny */}
                  <div className="col-span-2 hidden lg:block">
                    <div className="flex items-center">
                      <Truck size={14} className="mr-2 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">
                          {KIEROWCY.find(k => k.id === parseInt(transport.driver_id))?.imie || 'Nieznany'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {transport.distance || 0} km
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ocena i przyciski - 2 kolumny */}
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <TransportRatingBadge 
                      transportId={transport.id} 
                      refreshTrigger={0}
                      onCanBeRatedChange={(canBeRated, isPositive) => handleCanBeRatedChange(transport.id, canBeRated, isPositive)}
                    />
                    
                    {/* Przycisk oceny - kompaktowy */}
                    {ratableTransports[transport.id] !== undefined && (
                      ratableTransports[transport.id] ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRatingModal(transport);
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Oceń
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRatingModal(transport);
                          }}
                          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Zobacz
                        </button>
                      )
                    )}
                    
                    <ChevronDown 
                      size={16} 
                      className={`text-gray-500 transition-transform ${expandedRows[transport.id] ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </div>
                
                {/* Ocena i przyciski */}
                <div className="flex items-center space-x-3">
                  <TransportRatingBadge 
                    transportId={transport.id} 
                    refreshTrigger={0}
                    onCanBeRatedChange={(canBeRated, isPositive) => handleCanBeRatedChange(transport.id, canBeRated, isPositive)}
                  />
                  
                  {/* Przycisk oceny */}
                  {ratableTransports[transport.id] !== undefined && (
                    ratableTransports[transport.id] ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRatingModal(transport);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Oceń
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRatingModal(transport);
                        }}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Zobacz oceny
                      </button>
                    )
                  )}
                  
                  <ChevronDown 
                    size={20} 
                    className={`text-gray-500 transition-transform ${expandedRows[transport.id] ? 'rotate-180' : ''}`} 
                  />
                </div>
              </div>
              
                <div className="px-6 py-6 border-t bg-white">
                  {/* Tabelka z podstawowymi informacjami */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-200 last:border-b-0">
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 w-1/4">Pełny adres:</td>
                          <td className="py-2 text-sm text-gray-900">
                            {transport.destination_city}, {transport.postal_code}
                            {transport.street && `, ${transport.street}`}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 last:border-b-0">
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500">Kierowca (pojazd):</td>
                          <td className="py-2 text-sm text-gray-900">{getDriverInfo(transport.driver_id)}</td>
                        </tr>
                        <tr className="border-b border-gray-200 last:border-b-0">
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500">Magazyn → Odległość:</td>
                          <td className="py-2 text-sm text-gray-900">
                            {transport.source_warehouse === 'bialystok' ? 'Magazyn Białystok' : 'Magazyn Zielonka'} 
                            → {transport.distance || 0} km
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 last:border-b-0">
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500">Data dostawy:</td>
                          <td className="py-2 text-sm text-gray-900">
                            {format(new Date(transport.delivery_date), 'dd MMMM yyyy', { locale: pl })}
                          </td>
                        </tr>
                        {transport.completed_at && (
                          <tr className="border-b border-gray-200 last:border-b-0">
                            <td className="py-2 pr-4 text-sm font-medium text-gray-500">Zakończono:</td>
                            <td className="py-2 text-sm text-gray-900">
                              {format(new Date(transport.completed_at), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Sekcja: Informacje o zamówieniu */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Package className="w-4 h-4 mr-2 text-blue-600" />
                      Informacje o zamówieniu
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50 w-1/3">Klient</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.client_name || 'N/A'}</td>
                          </tr>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">MPK</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.mpk || 'N/A'}</td>
                          </tr>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Nr WZ</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.wz_number || 'N/A'}</td>
                          </tr>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Rynek</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.market || 'N/A'}</td>
                          </tr>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Poziom załadunku</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.loading_level || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sekcja: Osoby odpowiedzialne */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2 text-purple-600" />
                      Osoby odpowiedzialne
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50 w-1/3">Osoba zlecająca</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{transport.requester_name || 'N/A'}</td>
                          </tr>
                          {transport.requester_email && (
                            <tr className="border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Email</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{transport.requester_email}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sekcja: Uwagi (jeśli istnieją) */}
                  {transport.notes && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                        Uwagi
                      </h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-gray-800 text-sm">{transport.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Sekcja: Ocena transportu */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-yellow-600" />
                      Ocena transportu
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <TransportRatingBadge 
                            transportId={transport.id} 
                            refreshTrigger={0}
                            onCanBeRatedChange={(canBeRated, isPositive) => handleCanBeRatedChange(transport.id, canBeRated, isPositive)}
                          />
                          <span className="text-sm text-gray-600">
                            {ratableTransports[transport.id] ? 'Możesz ocenić ten transport' : 'Transport został oceniony'}
                          </span>
                        </div>
                        
                        {/* Przyciski akcji */}
                        <div className="flex gap-2">
                          {ratableTransports[transport.id] !== undefined && (
                            ratableTransports[transport.id] ? (
                              <button
                                onClick={() => handleOpenRatingModal(transport)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                <Star size={16} className="mr-2" />
                                Oceń transport
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenRatingModal(transport)}
                                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                <Eye size={16} className="mr-2" />
                                Zobacz oceny
                              </button>
                            )
                          )}
                          
                          {/* Przycisk usuwania dla adminów */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTransport(transport.id)}
                              className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Usuń
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg font-medium">Brak transportów w wybranym okresie</p>
              <p className="text-gray-400 mt-2">Spróbuj zmienić kryteria filtrowania</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="mt-8 bg-white rounded-lg shadow px-6 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-gray-700 mb-4 sm:mb-0">
            <span className="font-medium">Strona {currentPage} z {totalPages}</span>
            <span className="mx-2">•</span>
            <span>Łącznie {filteredArchiwum.length} transportów</span>
          </div>
          
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            {/* Wyświetlanie numerów stron */}
            <div className="flex space-x-1">
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
                    className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
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
  );
}
