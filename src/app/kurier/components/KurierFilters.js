// src/app/kurier/components/KurierFilters.js
// 🔥 MEGA KURIER FILTERS - Najbardziej zaawansowany system filtrowania
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Filter, X, Calendar, Building, User, Package2, Search, DollarSign,
  Clock, MapPin, Truck, Star, Download, RefreshCw, BarChart3, Target,
  Shield, CreditCard, Globe, Zap, TrendingUp, Eye, Save, FolderOpen,
  ChevronDown, ChevronUp, SlidersHorizontal, Calculator, Archive
} from 'lucide-react'

export default function KurierFilters({ 
  onFiltersChange, 
  isArchive = false, 
  zamowienia = [],
  loading = false,
  onExport,
  onBulkAction 
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [savedFilters, setSavedFilters] = useState([])
  const [filterName, setFilterName] = useState('')

  const [filters, setFilters] = useState({
    // Podstawowe filtry
    zleca: 'wszystkie', // nadawca, trzecia_strona, odbiorca, wszystkie
    status: isArchive ? 'wszystkie' : 'nowe',
    uslugaDHL: 'wszystkie', // AH, 09, 12, DW, SP, EK, PI, PR, CP, CM, wszystkie
    
    // Filtry datowe
    dataOd: '',
    dataDo: '',
    dataPreset: '', // dzisiaj, wczoraj, ostatnie_7_dni, ostatnie_30_dni, ten_miesiac
    
    // Wyszukiwanie
    szukaj: '', // wyszukiwanie po nazwie odbiorcy, MPK, zawartości, etc.
    szukajZaawansowane: {
      odbiorca: '',
      adres: '',
      telefon: '',
      mpk: '',
      zawartosc: '',
      nrPrzesylki: '',
      nrSledzenia: ''
    },
    
    // Filtry cenowe
    cenaOd: '',
    cenaDo: '',
    kostCurrency: 'PLN',
    
    // Filtry usług dodatkowych
    uslugiDodatkowe: {
      ubezpieczenie: false,
      pobranie: false,
      doreczenieSobota: false,
      doreczenieWieczorne: false,
      informacjePrzedDoreczeniem: false,
      potwierdzenieDoręczenia: false
    },
    
    // Filtry geograficzne
    miasto: '',
    kodPocztowy: '',
    wojewodztwo: 'wszystkie',
    kraj: 'wszystkie',
    
    // Filtry DHL
    statusDHL: 'wszystkie', // sent_to_dhl, failed, error, wszystkie
    maEtykiety: 'wszystkie', // tak, nie, wszystkie
    maKurier: 'wszystkie', // tak, nie, wszystkie
    maTracking: 'wszystkie', // tak, nie, wszystkie
    
    // Filtry operacyjne
    utworzonePrzez: 'wszyscy',
    zatwierdzlnePrzez: 'wszyscy',
    magazynZrodlowy: 'wszystkie',
    
    // Sortowanie
    sortowanie: 'data_desc', // data_desc, data_asc, nazwa_asc, nazwa_desc, cena_asc, cena_desc, status_asc
    sortowanieZaawansowane: {
      pole1: 'data',
      kierunek1: 'desc',
      pole2: 'nazwa',
      kierunek2: 'asc'
    }
  })

  // Presety filtrów
  const datePresets = [
    { value: 'dzisiaj', label: 'Dzisiaj', icon: '📅' },
    { value: 'wczoraj', label: 'Wczoraj', icon: '📆' },
    { value: 'ostatnie_7_dni', label: 'Ostatnie 7 dni', icon: '📊' },
    { value: 'ostatnie_30_dni', label: 'Ostatnie 30 dni', icon: '📈' },
    { value: 'ten_miesiac', label: 'Ten miesiąc', icon: '🗓️' },
    { value: 'ostatni_miesiac', label: 'Ostatni miesiąc', icon: '🗂️' },
    { value: 'ten_kwartal', label: 'Ten kwartał', icon: '📋' },
    { value: 'ten_rok', label: 'Ten rok', icon: '📚' }
  ]

  // Opcje zlecenia
  const opcjeZleca = [
    { value: 'wszystkie', label: 'Wszystkie zlecenia', icon: Package2, count: 0 },
    { value: 'nadawca', label: 'Nadawca (Grupa Eltron)', icon: Building, count: 0 },
    { value: 'trzecia_strona', label: 'Trzecia strona', icon: User, count: 0 },
    { value: 'odbiorca', label: 'Odbiorca płaci', icon: User, count: 0 }
  ]

  // Usługi DHL z opisami
  const uslugiDHL = [
    { value: 'wszystkie', label: 'Wszystkie usługi', description: '', premium: false },
    { value: 'AH', label: 'Przesyłka krajowa', description: 'Standardowa usługa krajowa', premium: false },
    { value: '09', label: 'Domestic Express 9', description: 'Dostawa do 9:00', premium: true },
    { value: '12', label: 'Domestic Express 12', description: 'Dostawa do 12:00', premium: true },
    { value: 'DW', label: 'Doręczenie wieczorne', description: 'Dostawa 18:00-22:00', premium: false },
    { value: 'SP', label: 'Doręczenie do punktu', description: 'DHL ServicePoint', premium: false },
    { value: 'EK', label: 'Connect', description: 'Przesyłka Connect', premium: false },
    { value: 'PI', label: 'International', description: 'Przesyłka międzynarodowa', premium: false },
    { value: 'PR', label: 'Premium', description: 'Usługa Premium', premium: true },
    { value: 'CP', label: 'Connect Plus', description: 'Connect Plus', premium: false },
    { value: 'CM', label: 'Connect Plus Pallet', description: 'Palety Connect Plus', premium: false }
  ]

  // Opcje statusu
  const opcjeStatus = isArchive ? [
    { value: 'wszystkie', label: 'Wszystkie statusy', color: 'gray', count: 0 },
    { value: 'approved', label: 'Zatwierdzone', color: 'green', count: 0 },
    { value: 'sent', label: 'Wysłane', color: 'blue', count: 0 },
    { value: 'delivered', label: 'Dostarczone', color: 'purple', count: 0 }
  ] : [
    { value: 'nowe', label: 'Nowe zamówienia', color: 'yellow', count: 0 },
    { value: 'approved', label: 'Zatwierdzone', color: 'green', count: 0 },
    { value: 'wszystkie', label: 'Wszystkie aktywne', color: 'gray', count: 0 }
  ]

  // Opcje sortowania
  const opcjeSortowania = [
    { value: 'data_desc', label: 'Najnowsze pierwsze', icon: '📅↓' },
    { value: 'data_asc', label: 'Najstarsze pierwsze', icon: '📅↑' },
    { value: 'nazwa_asc', label: 'Nazwa A-Z', icon: '🔤↑' },
    { value: 'nazwa_desc', label: 'Nazwa Z-A', icon: '🔤↓' },
    { value: 'cena_asc', label: 'Cena rosnąco', icon: '💰↑' },
    { value: 'cena_desc', label: 'Cena malejąco', icon: '💰↓' },
    { value: 'status_asc', label: 'Status A-Z', icon: '📊↑' },
    { value: 'waga_desc', label: 'Najcięższe pierwsze', icon: '⚖️↓' },
    { value: 'odleglosc_asc', label: 'Najbliższe pierwsze', icon: '📍↑' }
  ]

  // Kalkulacja statystyk filtrów
  const filterStats = useMemo(() => {
    if (!zamowienia.length) return {}

    const stats = {
      total: zamowienia.length,
      byStatus: {},
      byService: {},
      byType: {},
      avgCost: 0,
      totalCost: 0,
      dateRange: { oldest: null, newest: null }
    }

    zamowienia.forEach(z => {
      // Status count
      stats.byStatus[z.status] = (stats.byStatus[z.status] || 0) + 1
      
      // Service count
      try {
        const notes = JSON.parse(z.notes || '{}')
        const service = notes.uslugaDHL || 'AH'
        stats.byService[service] = (stats.byService[service] || 0) + 1
        
        // Type count
        const type = notes.typZlecenia || 'nieznany'
        const typeCategory = type.includes('nadawca') ? 'nadawca' : 
                           type.includes('odbiorca') ? 'odbiorca' : 'trzecia_strona'
        stats.byType[typeCategory] = (stats.byType[typeCategory] || 0) + 1
        
        // Cost calculation
        if (notes.dhl?.cost) {
          const cost = parseFloat(notes.dhl.cost) || 0
          stats.totalCost += cost
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
      
      // Date range
      const date = new Date(z.created_at)
      if (!stats.dateRange.oldest || date < stats.dateRange.oldest) {
        stats.dateRange.oldest = date
      }
      if (!stats.dateRange.newest || date > stats.dateRange.newest) {
        stats.dateRange.newest = date
      }
    })

    stats.avgCost = stats.totalCost / zamowienia.length

    return stats
  }, [zamowienia])

  // Auto-apply date presets
  useEffect(() => {
    if (filters.dataPreset) {
      const today = new Date()
      let startDate, endDate

      switch (filters.dataPreset) {
        case 'dzisiaj':
          startDate = endDate = today.toISOString().split('T')[0]
          break
        case 'wczoraj':
          const yesterday = new Date(today)
          yesterday.setDate(today.getDate() - 1)
          startDate = endDate = yesterday.toISOString().split('T')[0]
          break
        case 'ostatnie_7_dni':
          endDate = today.toISOString().split('T')[0]
          const weekAgo = new Date(today)
          weekAgo.setDate(today.getDate() - 7)
          startDate = weekAgo.toISOString().split('T')[0]
          break
        case 'ostatnie_30_dni':
          endDate = today.toISOString().split('T')[0]
          const monthAgo = new Date(today)
          monthAgo.setDate(today.getDate() - 30)
          startDate = monthAgo.toISOString().split('T')[0]
          break
        case 'ten_miesiac':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
          endDate = today.toISOString().split('T')[0]
          break
        default:
          return
      }

      setFilters(prev => ({
        ...prev,
        dataOd: startDate,
        dataDo: endDate
      }))
    }
  }, [filters.dataPreset])

  // Notify parent about filter changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onFiltersChange(filters)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [filters, onFiltersChange])

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Handle nested filter changes
  const handleNestedFilterChange = useCallback((parent, key, value) => {
    setFilters(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      zleca: 'wszystkie',
      status: isArchive ? 'wszystkie' : 'nowe',
      uslugaDHL: 'wszystkie',
      dataOd: '',
      dataDo: '',
      dataPreset: '',
      szukaj: '',
      szukajZaawansowane: {
        odbiorca: '',
        adres: '',
        telefon: '',
        mpk: '',
        zawartosc: '',
        nrPrzesylki: '',
        nrSledzenia: ''
      },
      cenaOd: '',
      cenaDo: '',
      kostCurrency: 'PLN',
      uslugiDodatkowe: {
        ubezpieczenie: false,
        pobranie: false,
        doreczenieSobota: false,
        doreczenieWieczorne: false,
        informacjePrzedDoreczeniem: false,
        potwierdzenieDoręczenia: false
      },
      miasto: '',
      kodPocztowy: '',
      wojewodztwo: 'wszystkie',
      kraj: 'wszystkie',
      statusDHL: 'wszystkie',
      maEtykiety: 'wszystkie',
      maKurier: 'wszystkie',
      maTracking: 'wszystkie',
      utworzonePrzez: 'wszyscy',
      zatwierdzlnePrzez: 'wszyscy',
      magazynZrodlowy: 'wszystkie',
      sortowanie: 'data_desc',
      sortowanieZaawansowane: {
        pole1: 'data',
        kierunek1: 'desc',
        pole2: 'nazwa',
        kierunek2: 'asc'
      }
    })
  }, [isArchive])

  // Save current filters
  const saveFilters = useCallback(() => {
    if (!filterName.trim()) {
      alert('Podaj nazwę dla zapisanych filtrów')
      return
    }

    const newSavedFilter = {
      id: Date.now(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
      usage: 0
    }

    setSavedFilters(prev => [...prev, newSavedFilter])
    setFilterName('')
    alert(`Filtry zapisane jako "${filterName}"`)
  }, [filterName, filters])

  // Load saved filters
  const loadFilters = useCallback((savedFilter) => {
    setFilters(savedFilter.filters)
    setSavedFilters(prev => 
      prev.map(f => 
        f.id === savedFilter.id 
          ? { ...f, usage: f.usage + 1 }
          : f
      )
    )
  }, [])

  // Delete saved filters
  const deleteSavedFilter = useCallback((filterId) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId))
  }, [])

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.zleca !== 'wszystkie' || 
           filters.dataOd || filters.dataDo || filters.szukaj ||
           (isArchive && filters.status !== 'wszystkie') || 
           (!isArchive && filters.status !== 'nowe') ||
           filters.sortowanie !== 'data_desc' ||
           filters.uslugaDHL !== 'wszystkie' ||
           filters.cenaOd || filters.cenaDo ||
           Object.values(filters.uslugiDodatkowe).some(v => v) ||
           filters.miasto || filters.kodPocztowy ||
           filters.statusDHL !== 'wszystkie'
  }, [filters, isArchive])

  // Get suggestion placeholder
  const getSuggestionPlaceholder = () => {
    switch (filters.zleca) {
      case 'nadawca':
        return 'Szukaj po MPK, odbiorcy, zawartości...'
      case 'trzecia_strona':
        return 'Szukaj po nazwie zleceniodawcy, MPK...'
      case 'odbiorca':
        return 'Szukaj po nazwie odbiorcy, adresie...'
      default:
        return 'Szukaj po nazwie, MPK, adresie, nr przesyłki...'
    }
  }

  // Export filtered data
  const handleExport = async (format) => {
    if (onExport) {
      await onExport(filters, format)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <Filter size={20} />
            <span className="font-medium">Filtry i wyszukiwanie</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                Aktywne ({Object.keys(filters).filter(k => 
                  filters[k] && filters[k] !== 'wszystkie' && filters[k] !== 'wszyscy' && filters[k] !== 'nowe'
                ).length})
              </span>
            )}
          </button>

          <div className="flex items-center space-x-2">
            {/* Quick stats */}
            {filterStats.total > 0 && (
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Package2 size={16} className="mr-1" />
                  <span>{filterStats.total} zamówień</span>
                </div>
                {filterStats.totalCost > 0 && (
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-1" />
                    <span>{filterStats.totalCost.toFixed(2)} PLN</span>
                  </div>
                )}
              </div>
            )}

            {/* Toggle buttons */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-2 rounded-md transition-colors ${
                showAnalytics ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Pokaż analytics"
            >
              <BarChart3 size={18} />
            </button>

            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`p-2 rounded-md transition-colors ${
                showPresets ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Zapisane filtry"
            >
              <Star size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="p-4 bg-purple-50 border-b">
          <h4 className="font-medium text-purple-900 mb-3 flex items-center">
            <BarChart3 className="mr-2" size={18} />
            Analytics & Statystyki
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{filterStats.total}</div>
              <div className="text-sm text-gray-600">Łącznie zamówień</div>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filterStats.totalCost.toFixed(0)} PLN
              </div>
              <div className="text-sm text-gray-600">Łączny koszt</div>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {filterStats.avgCost.toFixed(0)} PLN
              </div>
              <div className="text-sm text-gray-600">Średni koszt</div>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(filterStats.byService).length}
              </div>
              <div className="text-sm text-gray-600">Różne usługi</div>
            </div>
          </div>

          {/* Service breakdown */}
          <div className="mt-4">
            <h5 className="font-medium text-gray-700 mb-2">Podział według usług DHL:</h5>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filterStats.byService).map(([service, count]) => (
                <span key={service} className="bg-white px-3 py-1 rounded-full text-sm">
                  <span className="font-medium">{service}:</span> {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Filters Panel */}
      {showPresets && (
        <div className="p-4 bg-green-50 border-b">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-green-900 flex items-center">
              <Star className="mr-2" size={18} />
              Zapisane filtry
            </h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Nazwa filtrów..."
                className="px-3 py-1 border rounded-md text-sm"
              />
              <button
                onClick={saveFilters}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
              >
                <Save size={14} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savedFilters.map((saved) => (
              <div key={saved.id} className="bg-white p-3 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">{saved.name}</div>
                  <button
                    onClick={() => deleteSavedFilter(saved.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Użyto: {saved.usage} razy
                </div>
                <button
                  onClick={() => loadFilters(saved)}
                  className="w-full px-2 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200 transition-colors"
                >
                  <FolderOpen size={12} className="inline mr-1" />
                  Załaduj
                </button>
              </div>
            ))}
            
            {savedFilters.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                Brak zapisanych filtrów. Ustaw filtry i kliknij przycisk zapisz.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Filters Panel */}
      {showFilters && (
        <div className="p-4 space-y-6">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filters.szukaj}
              onChange={(e) => handleFilterChange('szukaj', e.target.value)}
              placeholder={getSuggestionPlaceholder()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
            {filters.szukaj && (
              <button
                onClick={() => handleFilterChange('szukaj', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Szybkie filtry daty:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {datePresets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handleFilterChange('dataPreset', preset.value)}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    filters.dataPreset === preset.value
                      ? 'bg-blue-100 border-blue-500 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Typ zlecenia:
              </label>
              <div className="space-y-2">
                {opcjeZleca.map(opcja => {
                  const IconComponent = opcja.icon
                  const count = filterStats.byType?.[opcja.value] || 0
                  
                  return (
                    <label key={opcja.value} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="zleca"
                        value={opcja.value}
                        checked={filters.zleca === opcja.value}
                        onChange={(e) => handleFilterChange('zleca', e.target.value)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <IconComponent size={16} className="mr-2 text-gray-500 group-hover:text-blue-600" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-grow">
                        {opcja.label}
                      </span>
                      {count > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          {count}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status:
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {opcjeStatus.map(status => {
                  const count = filterStats.byStatus?.[status.value === 'nowe' ? 'new' : status.value] || 0
                  return (
                    <option key={status.value} value={status.value}>
                      {status.label} {count > 0 ? `(${count})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* DHL Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usługa DHL:
              </label>
              <select
                value={filters.uslugaDHL}
                onChange={(e) => handleFilterChange('uslugaDHL', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {uslugiDHL.map(usluga => {
                  const count = filterStats.byService?.[usluga.value] || 0
                  return (
                    <option key={usluga.value} value={usluga.value}>
                      {usluga.label} {usluga.premium ? '⭐' : ''} {count > 0 ? `(${count})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={16} className="inline mr-1" />
                Data od:
              </label>
              <input
                type="date"
                value={filters.dataOd}
                onChange={(e) => handleFilterChange('dataOd', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={16} className="inline mr-1" />
                Data do:
              </label>
              <input
                type="date"
                value={filters.dataDo}
                onChange={(e) => handleFilterChange('dataDo', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <SlidersHorizontal size={16} />
              <span>Filtry zaawansowane</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="space-y-6 border-t pt-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign size={16} className="inline mr-1" />
                  Zakres cenowy:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={filters.cenaOd}
                    onChange={(e) => handleFilterChange('cenaOd', e.target.value)}
                    placeholder="Od (PLN)"
                    min="0"
                    step="0.01"
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    value={filters.cenaDo}
                    onChange={(e) => handleFilterChange('cenaDo', e.target.value)}
                    placeholder="Do (PLN)"
                    min="0"
                    step="0.01"
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={filters.kostCurrency}
                    onChange={(e) => handleFilterChange('kostCurrency', e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Additional Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield size={16} className="inline mr-1" />
                  Usługi dodatkowe:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries({
                    ubezpieczenie: { label: 'Ubezpieczenie', icon: Shield },
                    pobranie: { label: 'Pobranie', icon: CreditCard },
                    doreczenieSobota: { label: 'Dostawa w sobotę', icon: Calendar },
                    doreczenieWieczorne: { label: 'Dostawa wieczorna', icon: Clock },
                    informacjePrzedDoreczeniem: { label: 'Info przed dostawą', icon: User },
                    potwierdzenieDoręczenia: { label: 'Potwierdzenie', icon: CheckCircle }
                  }).map(([key, config]) => {
                    const IconComponent = config.icon
                    return (
                      <label key={key} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.uslugiDodatkowe[key]}
                          onChange={(e) => handleNestedFilterChange('uslugiDodatkowe', key, e.target.checked)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <IconComponent size={14} className="mr-1 text-gray-500" />
                        <span className="text-sm text-gray-700">{config.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Geographic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={16} className="inline mr-1" />
                    Miasto:
                  </label>
                  <input
                    type="text"
                    value={filters.miasto}
                    onChange={(e) => handleFilterChange('miasto', e.target.value)}
                    placeholder="Warszawa, Kraków..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kod pocztowy:
                  </label>
                  <input
                    type="text"
                    value={filters.kodPocztowy}
                    onChange={(e) => handleFilterChange('kodPocztowy', e.target.value)}
                    placeholder="00-001, 15-169..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe size={16} className="inline mr-1" />
                    Kraj:
                  </label>
                  <select
                    value={filters.kraj}
                    onChange={(e) => handleFilterChange('kraj', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="wszystkie">Wszystkie kraje</option>
                    <option value="PL">Polska</option>
                    <option value="DE">Niemcy</option>
                    <option value="CZ">Czechy</option>
                    <option value="SK">Słowacja</option>
                    <option value="other">Inne</option>
                  </select>
                </div>
              </div>

              {/* DHL Status Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Truck size={16} className="inline mr-1" />
                    Status DHL:
                  </label>
                  <select
                    value={filters.statusDHL}
                    onChange={(e) => handleFilterChange('statusDHL', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="wszystkie">Wszystkie</option>
                    <option value="sent_to_dhl">Wysłane do DHL</option>
                    <option value="failed">Błąd wysyłki</option>
                    <option value="error">Błąd integracji</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etykiety:
                  </label>
                  <select
                    value={filters.maEtykiety}
                    onChange={(e) => handleFilterChange('maEtykiety', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="wszystkie">Wszystkie</option>
                    <option value="tak">Ma etykiety</option>
                    <option value="nie">Bez etykiet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurier:
                  </label>
                  <select
                    value={filters.maKurier}
                    onChange={(e) => handleFilterChange('maKurier', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="wszystkie">Wszystkie</option>
                    <option value="tak">Kurier zamówiony</option>
                    <option value="nie">Bez kuriera</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking:
                  </label>
                  <select
                    value={filters.maTracking}
                    onChange={(e) => handleFilterChange('maTracking', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="wszystkie">Wszystkie</option>
                    <option value="tak">Ma tracking</option>
                    <option value="nie">Bez tracking</option>
                  </select>
                </div>
              </div>

              {/* Advanced Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search size={16} className="inline mr-1" />
                  Wyszukiwanie szczegółowe:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries({
                    odbiorca: 'Nazwa odbiorcy',
                    adres: 'Adres',
                    telefon: 'Telefon',
                    mpk: 'MPK',
                    zawartosc: 'Zawartość',
                    nrPrzesylki: 'Nr przesyłki DHL',
                    nrSledzenia: 'Nr śledzenia'
                  }).map(([key, placeholder]) => (
                    <input
                      key={key}
                      type="text"
                      value={filters.szukajZaawansowane[key]}
                      onChange={(e) => handleNestedFilterChange('szukajZaawansowane', key, e.target.value)}
                      placeholder={placeholder}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sorting Options */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TrendingUp size={16} className="inline mr-1" />
              Sortowanie:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filters.sortowanie}
                onChange={(e) => handleFilterChange('sortowanie', e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {opcjeSortowania.map(sort => (
                  <option key={sort.value} value={sort.value}>
                    {sort.icon} {sort.label}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport('excel')}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                >
                  <Download size={14} />
                  <span>Excel</span>
                </button>
                
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center space-x-1"
                >
                  <Download size={14} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {filters.zleca === 'nadawca' && (
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  📦 Grupa Eltron wysyła przesyłki
                </span>
              )}
              {filters.zleca === 'trzecia_strona' && (
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">
                  👤 Klient zleca i płaci za przesyłkę
                </span>
              )}
              {filters.zleca === 'odbiorca' && (
                <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
                  📫 Odbiorca płaci za przesyłkę
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X size={16} />
                  <span>Wyczyść wszystkie filtry</span>
                </button>
              )}
              
              <div className="text-sm text-gray-500">
                Znaleziono: <span className="font-bold">{filterStats.total}</span> zamówień
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
