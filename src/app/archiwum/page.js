// src/app/archiwum/page.js
'use client'
import React, { useState, useEffect, Fragment } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { KIEROWCY, RYNKI, POJAZDY } from '../kalendarz/constants'
import * as XLSX from 'xlsx'
import { ChevronLeft, ChevronRight, FileText, Download, Star, Compass, ChevronDown, MapPin, Truck, Building, User, Calendar, Info, Trash2 } from 'lucide-react'
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
  const [ratingRefreshTrigger, setRatingRefreshTrigger] = useState(0)
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

  // Ładowanie zapisanych filtrów
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('archiveFilters')
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters)
        setSelectedYear(filters.selectedYear || new Date().getFullYear())
        setShowAdvancedFilters(filters.showAdvancedFilters || false)
        setSelectedMonth(filters.selectedMonth || 'all')
        setSelectedWarehouse(filters.selectedWarehouse || '')
        setSelectedDriver(filters.selectedDriver || '')
        setSelectedRequester(filters.selectedRequester || '')
        setSelectedRating(filters.selectedRating || 'all')
        setSelectedConstruction(filters.selectedConstruction || '')
        setCurrentPage(filters.currentPage || 1)
      } catch (e) {
        console.error('Błąd przy ładowaniu zapisanych filtrów:', e)
      }
    }
  }, [])

  useEffect(() => {
    checkAdmin()
    fetchUsers()
    fetchConstructions()
    fetchArchivedTransports()
  }, [])

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

  const fetchArchivedTransports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transports/archived')
      const data = await response.json()

      if (data.success) {
        const sortedTransports = data.transports.sort((a, b) =>
          new Date(b.delivery_date) - new Date(a.delivery_date)
        )
        setArchiwum(sortedTransports)
        applyFilters(
          sortedTransports,
          selectedYear,
          selectedMonth,
          selectedWarehouse,
          selectedDriver,
          selectedRequester,
          selectedRating,
          selectedConstruction
        )
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

  const handleOpenRating = (transport) => {
    setSelectedTransport(transport)
    setShowRatingModal(true)
  }

  const handleCloseRating = () => {
    setShowRatingModal(false)
    setSelectedTransport(null)
    setRatingRefreshTrigger(prev => prev + 1)
    fetchArchivedTransports()
  }

  // filtrowanie transportów
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

      if (driver && transport.driver_id?.toString() !== driver) {
        return false
      }

      if (requester && transport.requester_email !== requester) {
        return false
      }

      if (rating !== 'all') {
        const hasRating = ratableTransports[transport.id] !== undefined && !ratableTransports[transport.id]

        if (rating === 'positive') {
          return hasRating && ratingValues[transport.id]?.isPositive === true
        } else if (rating === 'negative') {
          return hasRating && ratingValues[transport.id]?.isPositive === false
        } else if (rating === 'unrated') {
          return !hasRating || ratableTransports[transport.id]
        }
      }

      if (construction) {
        const selectedCons = constructions.find(c => c.id.toString() === construction)
        if (selectedCons) {
          const matchesClientName = transport.client_name &&
            transport.client_name.toLowerCase().includes(selectedCons.name.toLowerCase())
          const matchesMpk = transport.mpk && transport.mpk === selectedCons.mpk

          if (!matchesClientName && !matchesMpk) {
            return false
          }
        }
      }

      return true
    })

    setFilteredArchiwum(filtered)
  }

  useEffect(() => {
    applyFilters(
      archiwum,
      selectedYear,
      selectedMonth,
      selectedWarehouse,
      selectedDriver,
      selectedRequester,
      selectedRating,
      selectedConstruction
    )
    setCurrentPage(1)
  }, [selectedYear, selectedMonth, selectedWarehouse, selectedDriver, selectedRequester, selectedRating, selectedConstruction, archiwum, ratableTransports, ratingValues])

  // paginacja
  const totalPages = Math.ceil(filteredArchiwum.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredArchiwum.slice(startIndex, endIndex)

  const getKierowcaNazwa = (id) => {
    if (!id) return 'Nieznany kierowca'
    const kierowca = KIEROWCY.find(k => k.id === parseInt(id))
    return kierowca ? (kierowca.nazwa || kierowca.imie) : 'Nieznany kierowca'
  }

  const getPojazdNazwa = (id) => {
    if (!id) return 'Nieznany pojazd'
    const pojazd = POJAZDY.find(p => p.id === parseInt(id))
    return pojazd ? pojazd.nazwa : 'Nieznany pojazd'
  }

  const getRynekNazwa = (id) => {
    if (!id) return 'Nieznany rynek'
    const rynek = RYNKI.find(r => r.id === parseInt(id))
    return rynek ? rynek.nazwa : 'Nieznany rynek'
  }

  const toggleRowExpansion = (transportId) => {
    setExpandedRows(prev => ({
      ...prev,
      [transportId]: !prev[transportId]
    }))
  }

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

  const renderRatingBadge = (transportId) => (
    <TransportRatingBadge
      transportId={transportId}
      refreshTrigger={ratingRefreshTrigger}
      onCanBeRatedChange={(canBeRated, isPositive) =>
        handleCanBeRatedChange(transportId, canBeRated, isPositive)
      }
    />
  )

  const paginate = (pageNumber) => {
    const filterState = {
      selectedYear,
      selectedMonth,
      selectedWarehouse,
      showAdvancedFilters,
      selectedDriver,
      selectedRequester,
      selectedRating,
      selectedConstruction,
      currentPage: pageNumber
    }
    sessionStorage.setItem('archiveFilters', JSON.stringify(filterState))
    setCurrentPage(pageNumber)
  }

  // eksport danych
  const handleExport = () => {
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

    const monthLabel = selectedMonth === 'all'
      ? 'wszystkie_miesiace'
      : format(new Date(2023, parseInt(selectedMonth)), 'LLLL', { locale: pl }).toLowerCase()

    const fileName = `transporty_${selectedYear}_${monthLabel}`

    if (exportFormat === 'csv') {
      const headers = Object.keys(dataToExport[0])
      let csvContent = headers.join(';') + '\n'
      dataToExport.forEach(item => {
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
    } else {
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Transporty')
      XLSX.writeFile(wb, `${fileName}.xlsx`)
    }
  }

  // usuwanie transportu
  const handleDeleteTransport = async (transportId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten transport? Ta operacja jest nieodwracalna.')) {
      return
    }

    try {
      const response = await fetch(`/api/transports/delete?id=${transportId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setDeleteStatus('success')
        fetchArchivedTransports()
        setTimeout(() => setDeleteStatus(null), 3000)
      } else {
        setDeleteStatus('error')
        setTimeout(() => setDeleteStatus(null), 3000)
      }
    } catch (error) {
      console.error('Błąd usuwania transportu:', error)
      setDeleteStatus('error')
      setTimeout(() => setDeleteStatus(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Błąd</h3>
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Archiwum Transportów</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <ChevronDown className={`inline-block w-4 h-4 mr-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              Filtry
            </button>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="inline-block w-4 h-4 mr-2" />
              Eksportuj
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtry roku i miesiąca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rok</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miesiąc</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="all">Wszystkie miesiące</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {format(new Date(2023, i), 'LLLL', { locale: pl })}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr magazynu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Magazyn</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">Wszystkie magazyny</option>
                <option value="bialystok">Białystok</option>
                <option value="zielonka">Zielonka</option>
              </select>
            </div>

            {/* Filtr kierowcy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kierowca</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">Wszyscy kierowcy</option>
                {KIEROWCY.map(kierowca => (
                  <option key={kierowca.id} value={kierowca.nazwa || kierowca.imie}>
                    {kierowca.nazwa || kierowca.imie}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr zlecającego */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zlecający</label>
              <select
                value={selectedRequester}
                onChange={(e) => setSelectedRequester(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">Wszyscy</option>
                {users.map(user => (
                  <option key={user.email} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr budowy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budowa</label>
              <select
                value={selectedConstruction}
                onChange={(e) => setSelectedConstruction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">Wszystkie budowy</option>
                {constructions.map(construction => (
                  <option key={construction.id} value={construction.id}>
                    {construction.name} ({construction.mpk})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr oceny */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ocena</label>
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="all">Wszystkie oceny</option>
                <option value="positive">Pozytywne</option>
                <option value="negative">Negatywne</option>
                <option value="unrated">Nieocenione</option>
              </select>
            </div>
          </div>
        )}

        {/* Podsumowanie */}
        <div className="mb-4 text-sm text-gray-600">
          Znaleziono {filteredArchiwum.length} transportów
          {selectedYear && ` w roku ${selectedYear}`}
          {selectedMonth !== 'all' && ` w miesiącu ${format(new Date(2023, parseInt(selectedMonth)), 'LLLL', { locale: pl })}`}
          {filteredArchiwum.length > 0 && (
            <span className="ml-2">
              <span className="font-medium">Całkowita odległość:</span> {filteredArchiwum.reduce((sum, t) => sum + (t.distance || 0), 0).toLocaleString('pl-PL')} km
            </span>
          )}
        </div>

        {/* Tabela transportów */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trasa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kierowca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {currentItems.map((transport) => (
                <Fragment key={transport.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transport.data_utworzenia || transport.delivery_date), 'dd.MM.yyyy', { locale: pl })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {(transport.zrodlo === 'bialystok' || transport.source_warehouse === 'bialystok') ? 'Białystok' : 'Zielonka'} → {transport.cel || transport.destination_city || 'Brak danych'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-1" />
                        {getKierowcaNazwa(transport.kierowca || transport.driver_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transport.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transport.status === 'completed' ? 'Ukończony' : 'W trakcie'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transport.status === 'completed' && renderRatingBadge(transport.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleRowExpansion(transport.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Pokaż szczegóły"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        {transport.status === 'completed' && (
                          <button
                            onClick={() => handleOpenRating(transport)}
                            className="text-green-600 hover:text-green-900"
                            title="Pokaż oceny"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTransport(transport.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Usuń transport"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedRows[transport.id] && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Podstawowe informacje</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Data: {format(new Date(transport.data_transportu || transport.delivery_date), 'dd.MM.yyyy', { locale: pl })}</span>
                              </div>
                              <div className="flex items-center">
                                <Truck className="w-4 h-4 mr-2" />
                                <span>Pojazd: {getPojazdNazwa(transport.pojazd || transport.vehicle_id)}</span>
                              </div>
                              <div className="flex items-center">
                                <Building className="w-4 h-4 mr-2" />
                                <span>Rynek: {getRynekNazwa(transport.rynek || transport.market)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Szczegóły transportu</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              {(transport.budowa || transport.mpk) && (
                                <div>
                                  <span className="font-medium">Budowa/MPK:</span> {transport.budowa || transport.mpk}
                                </div>
                              )}
                              {(transport.odleglosc || transport.distance) && (
                                <div>
                                  <span className="font-medium">Odległość:</span> {transport.odleglosc || transport.distance} km
                                </div>
                              )}
                              {(transport.uwagi || transport.notes) && (
                                <div>
                                  <span className="font-medium">Uwagi:</span> {transport.uwagi || transport.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Zlecający</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                <span>{transport.email_zlecajacego || transport.requester_email}</span>
                              </div>
                              <div>
                                <span className="font-medium">Utworzono:</span> {format(new Date(transport.data_utworzenia || transport.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showRatingModal && selectedTransport && (
        <TransportRating
          transportId={selectedTransport.id}
          onClose={handleCloseRating}
        />
      )}
    </div>
  )
}
