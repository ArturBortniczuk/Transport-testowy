// src/app/archiwum/page.js - OSTATECZNA POPRAWKA
'use client'
import React from 'react'  // DODAJ TĘ LINIĘ
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { KIEROWCY, POJAZDY } from '../kalendarz/constants'
import * as XLSX from 'xlsx'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Star, 
  ChevronDown, 
  MapPin, 
  Truck, 
  Building, 
  User, 
  Calendar, 
  Trash2,
  Package,
  Route,
  Eye,
  FileText,
  Hash,
  MessageSquare,
  Edit
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

  // Filtry
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedRequester, setSelectedRequester] = useState('')
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedConstruction, setSelectedConstruction] = useState('')
  
  // Lista użytkowników i budów
  const [users, setUsers] = useState([])
  const [constructions, setConstructions] = useState([])

  // Lista lat i miesięcy
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: 'all', label: 'Wszystkie miesiące' },
    { value: 0, label: 'Styczeń' },
    { value: 1, label: 'Luty' },
    { value: 2, label: 'Marzec' },
    { value: 3, label: 'Kwiecień' },
    { value: 4, label: 'Maj' },
    { value: 5, label: 'Czerwiec' },
    { value: 6, label: 'Lipiec' },
    { value: 7, label: 'Sierpień' },
    { value: 8, label: 'Wrzesień' },
    { value: 9, label: 'Październik' },
    { value: 10, label: 'Listopad' },
    { value: 11, label: 'Grudzień' }
  ]

  const ratingOptions = [
    { value: 'all', label: 'Wszystkie transporty' },
    { value: 'rated', label: 'Tylko ocenione' },
    { value: 'unrated', label: 'Tylko nieocenione' }
  ]

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/user')  // ZMIANA: używamy istniejącego endpointu
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Błąd sprawdzania uprawnień:', error)
      }
    }

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
  
  const applyFilters = async (transports, year, month, warehouse, driver, requester, rating, construction) => {
    if (!transports) return
    
    let filtered = transports.filter(transport => {
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

    if (rating !== 'all') {
      const ratingsPromises = filtered.map(async (transport) => {
        try {
          const response = await fetch(`/api/transport-simple-rating?transportId=${transport.id}`)
          const data = await response.json()
          
          if (rating === 'rated') {
            return data.success && data.totalRatings > 0 ? transport : null
          } else if (rating === 'unrated') {
            return data.success && data.totalRatings === 0 ? transport : null
          }
          return transport
        } catch (error) {
          console.error('Błąd sprawdzania oceny transportu:', error)
          return transport
        }
      })

      const ratingsResults = await Promise.all(ratingsPromises)
      filtered = ratingsResults.filter(transport => transport !== null)
    }
    
    setFilteredArchiwum(filtered)
  }

  useEffect(() => {
    applyFilters(archiwum, selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction)
  }, [selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction, archiwum, constructions])

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

  const handleOpenRatingModal = (transport) => {
    setSelectedTransport(transport)
    setShowRatingModal(true)
  }

  const handleCloseRating = () => {
    setShowRatingModal(false)
    setSelectedTransport(null)
    fetchArchivedTransports()
  }

  const getDriverInfo = (driverId) => {
    const driver = KIEROWCY.find(k => k.id === parseInt(driverId))
    if (!driver) return 'Brak danych'
    
    const vehicle = POJAZDY.find(p => p.id === parseInt(driverId))
    const vehicleInfo = vehicle ? vehicle.tabliceRej : 'Brak pojazdu'
    
    return `${driver.imie} (${vehicleInfo})`
  }

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
        'Nr rejestracyjny': driver ? POJAZDY.find(p => p.id === parseInt(transport.driver_id))?.tabliceRej || '' : '',
        'Zamówił': transport.requester_email || '',
        'Uwagi': transport.notes || ''
      }
    })
    
    const fileName = `archiwum_transportow_${format(new Date(), 'yyyy-MM-dd')}`
    
    if (exportFormat === 'csv') {
      exportToCSV(dataToExport, fileName)
    } else {
      exportToXLSX(dataToExport, fileName)
    }
  }

  const exportToCSV = (data, fileName) => {
    const headers = Object.keys(data[0])
    let csvContent = headers.join(';') + '\n'
    
    data.forEach(item => {
      const row = headers.map(header => {
        let cell = item[header] ? item[header] : ''
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

  // Komponent przycisku oceny
  const RatingButton = ({ transport }) => {
    const [ratingInfo, setRatingInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchRatingInfo = async () => {
        try {
          const response = await fetch(`/api/transport-ratings?transportId=${transport.id}`)
          const data = await response.json()
          if (data.success) {
            setRatingInfo({
              canBeRated: data.canBeRated,
              hasUserRated: data.hasUserRated,
              totalRatings: data.stats?.totalRatings || 0
            })
          }
        } catch (error) {
          console.error('Błąd pobierania informacji o ocenie:', error)
          setRatingInfo({
            canBeRated: true,
            hasUserRated: false,
            totalRatings: 0
          })
        } finally {
          setLoading(false)
        }
      }

      fetchRatingInfo()
    }, [transport.id])

    if (loading) {
      return <div className="w-20 h-8 bg-gray-100 rounded animate-pulse"></div>
    }

    if (!ratingInfo?.canBeRated && !ratingInfo?.hasUserRated) {
      return (
        <span className="text-gray-400 text-sm">
          Nie można ocenić
        </span>
      )
    }

    if (ratingInfo?.hasUserRated) {
      return (
        <button
          onClick={() => handleOpenRatingModal(transport)}
          className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
        >
          <Edit size={14} className="mr-1" />
          Zobacz/Edytuj
        </button>
      )
    }

    return (
      <button
        onClick={() => handleOpenRatingModal(transport)}
        className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
      >
        <Star size={14} className="mr-1" />
        Oceń
      </button>
    )
  }

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
          Zarządzaj zakończonymi transportami i ich ocenami
        </p>
      </div>

      {/* Status usuwania */}
      {deleteStatus && (
        <div className={`mb-4 p-4 rounded-lg ${
          deleteStatus.type === 'loading' ? 'bg-blue-50 text-blue-700' :
          deleteStatus.type === 'success' ? 'bg-green-50 text-green-700' :
          'bg-red-50 text-red-700'
        }`}>
          {deleteStatus.message}
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rok
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miesiąc
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Magazyn
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wszystkie magazyny</option>
              <option value="bialystok">Białystok</option>
              <option value="zielonka">Zielonka</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status oceny
            </label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ratingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zaawansowane filtry */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kierowca
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszyscy kierowcy</option>
                {KIEROWCY.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.imie}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zamówił
              </label>
              <select
                value={selectedRequester}
                onChange={(e) => setSelectedRequester(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszyscy użytkownicy</option>
                {users.map(user => (
                  <option key={user.email} value={user.email}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budowa
              </label>
              <select
                value={selectedConstruction}
                onChange={(e) => setSelectedConstruction(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszystkie budowy</option>
                {constructions.map(construction => (
                  <option key={construction.id} value={construction.id}>
                    {construction.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Liczba transportów</p>
              <p className="text-2xl font-bold text-gray-900">{filteredArchiwum.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Route className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Łączna odległość</p>
              <p className="text-2xl font-bold text-gray-900">{totalDistance.toLocaleString()} km</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eksport danych</p>
              <div className="flex items-center mt-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="mr-2 border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="xlsx">Excel</option>
                  <option value="csv">CSV</option>
                </select>
                <button
                  onClick={exportData}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  Eksportuj
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista transportów */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data / Trasa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Klient / MPK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kierowca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((transport) => {
                return (
                  <React.Fragment key={transport.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <Calendar size={16} className="text-gray-400 mt-1 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {format(new Date(transport.delivery_date), 'dd.MM.yyyy', { locale: pl })}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin size={12} className="mr-1" />
                              {transport.destination_city}
                              {transport.distance && (
                                <span className="ml-2 text-blue-600">
                                  ({transport.distance} km)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <Building size={16} className="text-gray-400 mt-1 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transport.client_name || 'Brak nazwy'}
                            </div>
                            {transport.mpk && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <Hash size={12} className="mr-1" />
                                MPK: {transport.mpk}
                              </div>
                            )}
                            {transport.wz_number && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <FileText size={12} className="mr-1" />
                                WZ: {transport.wz_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <User size={16} className="text-gray-400 mt-1 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getDriverInfo(transport.driver_id)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transport.source_warehouse === 'bialystok' ? 'Białystok' : 
                               transport.source_warehouse === 'zielonka' ? 'Zielonka' : 
                               transport.source_warehouse}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <TransportRatingBadge transportId={transport.id} />
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <RatingButton transport={transport} />
                          
                          <button
                            onClick={() => setExpandedRows(prev => ({
                              ...prev,
                              [transport.id]: !prev[transport.id]
                            }))}
                            className="flex items-center px-2 py-1 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors text-sm"
                          >
                            <Eye size={14} className="mr-1" />
                            {expandedRows[transport.id] ? 'Ukryj' : 'Szczegóły'}
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTransport(transport.id)}
                              className="flex items-center px-2 py-1 text-red-600 hover:text-red-900 rounded-md hover:bg-red-100 transition-colors text-sm"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Usuń
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedRows[transport.id] && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Szczegóły transportu</h4>
                              <div className="space-y-2 text-sm">
                                {transport.street && (
                                  <div className="flex items-center">
                                    <MapPin size={14} className="text-gray-400 mr-2" />
                                    <span className="text-gray-600">Adres:</span>
                                    <span className="ml-1">{transport.street}</span>
                                  </div>
                                )}
                                {transport.postal_code && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600 ml-6">Kod:</span>
                                    <span className="ml-1">{transport.postal_code}</span>
                                  </div>
                                )}
                                {transport.phone && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600">Telefon:</span>
                                    <span className="ml-1">{transport.phone}</span>
                                  </div>
                                )}
                                {transport.requester_email && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600">Zamówił:</span>
                                    <span className="ml-1">{transport.requester_email}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Dodatkowe informacje</h4>
                              <div className="space-y-2 text-sm">
                                {transport.notes && (
                                  <div className="flex items-start">
                                    <MessageSquare size={14} className="text-gray-400 mr-2 mt-1" />
                                    <div>
                                      <span className="text-gray-600">Uwagi:</span>
                                      <p className="mt-1 text-gray-900">{transport.notes}</p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Calendar size={14} className="text-gray-400 mr-2" />
                                  <span className="text-gray-600">Utworzono:</span>
                                  <span className="ml-1">
                                    {format(new Date(transport.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>

          {/* Brak wyników */}
          {filteredArchiwum.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak transportów</h3>
              <p className="text-gray-500">
                Nie znaleziono transportów spełniających wybrane kryteria.
              </p>
            </div>
          )}
        </div>

        {/* Paginacja */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Poprzednie
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Następne
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Pokazano <span className="font-medium">{indexOfFirstItem + 1}</span> do{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredArchiwum.length)}
                  </span>{' '}
                  z <span className="font-medium">{filteredArchiwum.length}</span> wyników
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
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
                    );
                  })}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal oceny transportu */}
      {showRatingModal && selectedTransport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TransportRating
              transportId={selectedTransport.id}
              onClose={handleCloseRating}
            />
          </div>
        </div>
      )}
    </div>
  )
}
