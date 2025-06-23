'use client'
import { useState, useEffect } from 'react'
import { Filter, X, Calendar, Building } from 'lucide-react'

export default function KurierFilters({ onFiltersChange, isArchive = false }) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    magazyn: '',
    dataOd: '',
    dataDo: '',
    status: isArchive ? 'all' : 'new'
  })

  const magazyny = [
    { value: '', label: 'Wszystkie magazyny' },
    { value: 'admin', label: 'Admin' },
    { value: 'handlowiec', label: 'Handlowiec' },
    { value: 'magazyn_bialystok', label: 'Magazyn Białystok' },
    { value: 'magazyn_zielonka', label: 'Magazyn Zielonka' }
  ]

  const statusyArchiwum = [
    { value: 'all', label: 'Wszystkie statusy' },
    { value: 'approved', label: 'Zatwierdzone' },
    { value: 'sent', label: 'Wysłane' },
    { value: 'delivered', label: 'Dostarczone' }
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
      magazyn: '',
      dataOd: '',
      dataDo: '',
      status: isArchive ? 'all' : 'new'
    })
  }

  const hasActiveFilters = filters.magazyn || filters.dataOd || filters.dataDo || 
    (isArchive && filters.status !== 'all') || (!isArchive && filters.status !== 'new')

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
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtr magazynu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building size={16} className="inline mr-1" />
                Magazyn
              </label>
              <select
                value={filters.magazyn}
                onChange={(e) => handleFilterChange('magazyn', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {magazyny.map(magazyn => (
                  <option key={magazyn.value} value={magazyn.value}>
                    {magazyn.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr statusu dla archiwum */}
            {isArchive && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {statusyArchiwum.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Data od */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={16} className="inline mr-1" />
                Data od
              </label>
              <input
                type="date"
                value={filters.dataOd}
                onChange={(e) => handleFilterChange('dataOd', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Data do */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={16} className="inline mr-1" />
                Data do
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
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={16} />
                <span>Wyczyść filtry</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
