'use client'
import { useState, useEffect } from 'react'
import { Filter, X, Calendar, Building, User, Package2 } from 'lucide-react'

export default function KurierFilters({ onFiltersChange, isArchive = false }) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    zleca: 'wszystkie', // nadawca, trzecia_strona, odbiorca, wszystkie
    status: isArchive ? 'wszystkie' : 'nowe',
    dataOd: '',
    dataDo: '',
    szukaj: '', // wyszukiwanie po nazwie odbiorcy, MPK, itp.
    sortowanie: 'data_desc' // data_desc, data_asc, nazwa_asc, nazwa_desc
  })

  const opcjeZleca = [
    { value: 'wszystkie', label: 'Wszystkie zlecenia', icon: Package2 },
    { value: 'nadawca', label: 'Nadawca (Grupa Eltron)', icon: Building },
    { value: 'trzecia_strona', label: 'Trzecia strona', icon: User },
    { value: 'odbiorca', label: 'Odbiorca płaci', icon: User }
  ]

  const opcjeStatus = isArchive ? [
    { value: 'wszystkie', label: 'Wszystkie statusy' },
    { value: 'approved', label: 'Zatwierdzone' },
    { value: 'sent', label: 'Wysłane' },
    { value: 'delivered', label: 'Dostarczone' }
  ] : [
    { value: 'nowe', label: 'Nowe zamówienia' },
    { value: 'wszystkie', label: 'Wszystkie aktywne' }
  ]

  const opcjeSortowania = [
    { value: 'data_desc', label: 'Najnowsze pierwsze' },
    { value: 'data_asc', label: 'Najstarsze pierwsze' },
    { value: 'nazwa_asc', label: 'Nazwa A-Z' },
    { value: 'nazwa_desc', label: 'Nazwa Z-A' }
  ]

  // Wywołaj callback gdy filtry się zmienią
  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      zleca: 'wszystkie',
      status: isArchive ? 'wszystkie' : 'nowe',
      dataOd: '',
      dataDo: '',
      szukaj: '',
      sortowanie: 'data_desc'
    })
  }

  const hasActiveFilters = filters.zleca !== 'wszystkie' || 
    filters.dataOd || filters.dataDo || filters.szukaj ||
    (isArchive && filters.status !== 'wszystkie') || 
    (!isArchive && filters.status !== 'nowe') ||
    filters.sortowanie !== 'data_desc'

  // Automatyczne sugestie dla wyszukiwania (można rozszerzyć)
  const getSuggestionPlaceholder = () => {
    switch (filters.zleca) {
      case 'nadawca':
        return 'Szukaj po MPK, odbiorcy, zawartości...'
      case 'trzecia_strona':
        return 'Szukaj po nazwie zleceniodawcy, MPK...'
      case 'odbiorca':
        return 'Szukaj po nazwie odbiorcy, adresie...'
      default:
        return 'Szukaj po nazwie, MPK, adresie...'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Przycisk pokazania filtrów */}
      <div className="p-4 border-b">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <Filter size={20} />
          <span>Filtry i wyszukiwanie</span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Aktywne
            </span>
          )}
        </button>
      </div>

      {/* Panel filtrów */}
      {showFilters && (
        <div className="p-4 space-y-6">
          {/* Główne filtry w stylu DHL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kto zleca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zleca:
              </label>
              <div className="space-y-2">
                {opcjeZleca.map(opcja => {
                  const IconComponent = opcja.icon
                  return (
                    <label key={opcja.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="zleca"
                        value={opcja.value}
                        checked={filters.zleca === opcja.value}
                        onChange={(e) => handleFilterChange('zleca', e.target.value)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <IconComponent size={16} className="mr-2 text-gray-500" />
                      <span className="text-sm text-gray-700">{opcja.label}</span>
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
                {opcjeStatus.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sortowanie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sortowanie:
              </label>
              <select
                value={filters.sortowanie}
                onChange={(e) => handleFilterChange('sortowanie', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {opcjeSortowania.map(sort => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wyszukiwanie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wyszukiwanie:
            </label>
            <input
              type="text"
              value={filters.szukaj}
              onChange={(e) => handleFilterChange('szukaj', e.target.value)}
              placeholder={getSuggestionPlaceholder()}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Filtry dat */}
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

          {/* Przyciski akcji */}
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
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={16} />
                <span>Wyczyść filtry</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
