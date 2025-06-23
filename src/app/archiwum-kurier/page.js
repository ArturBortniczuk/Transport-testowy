'use client'
import { useState, useEffect, useCallback } from 'react'
import ZamowieniaList from '../kurier/components/ZamowieniaList'
import KurierStats from '../kurier/components/KurierStats'
import KurierFilters from '../kurier/components/KurierFilters'
import Link from 'next/link'
import { ArrowLeft, Archive } from 'lucide-react'

export default function ArchiwumKurierPage() {
  const [zamowienia, setZamowienia] = useState([])
  const [filteredZamowienia, setFilteredZamowienia] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    magazyn: '',
    dataOd: '',
    dataDo: '',
    status: 'all'
  })

  // Pobierz zrealizowane zamówienia przy ładowaniu
  useEffect(() => {
    fetchArchiwalneZamowienia()
  }, [])

  // Funkcja filtrowania zamówień
  const applyFilters = useCallback((zamowieniaList, currentFilters) => {
    let filtered = [...zamowieniaList]

    // Filtr magazynu
    if (currentFilters.magazyn) {
      filtered = filtered.filter(z => z.magazine_source === currentFilters.magazyn)
    }

    // Filtr statusu dla archiwum
    if (currentFilters.status && currentFilters.status !== 'all') {
      filtered = filtered.filter(z => z.status === currentFilters.status)
    }

    // Filtr daty od
    if (currentFilters.dataOd) {
      const dataOd = new Date(currentFilters.dataOd)
      filtered = filtered.filter(z => new Date(z.created_at) >= dataOd)
    }

    // Filtr daty do
    if (currentFilters.dataDo) {
      const dataDo = new Date(currentFilters.dataDo)
      dataDo.setHours(23, 59, 59) // Koniec dnia
      filtered = filtered.filter(z => new Date(z.created_at) <= dataDo)
    }

    return filtered
  }, [])

  // Obsługa zmiany filtrów
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    const filtered = applyFilters(zamowienia, newFilters)
    setFilteredZamowienia(filtered)
  }, [zamowienia, applyFilters])

  const fetchArchiwalneZamowienia = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kurier?status=completed')
      const data = await response.json()
      
      if (data.success) {
        setZamowienia(data.zamowienia)
        // Zastosuj aktualne filtry do nowych danych
        const filtered = applyFilters(data.zamowienia, filters)
        setFilteredZamowienia(filtered)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error('Błąd pobierania archiwalnych zamówień:', error)
      setError('Nie udało się pobrać archiwalnych zamówień kurierskich')
    } finally {
      setLoading(false)
    }
  }

  // Zastosuj filtry gdy zamówienia się zmienią
  useEffect(() => {
    if (zamowienia.length > 0) {
      const filtered = applyFilters(zamowienia, filters)
      setFilteredZamowienia(filtered)
    }
  }, [zamowienia, filters, applyFilters])

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Nagłówek z nawigacją */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/kurier" 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Wróć do aktywnych zamówień
          </Link>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Archive className="mr-3 text-gray-600" />
              Archiwum zamówień kuriera
            </h1>
            <p className="text-gray-600 mt-2">
              Historia zrealizowanych zamówień kurierskich
            </p>
          </div>
          
          {/* Statystyki w nagłówku */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{filteredZamowienia.length}</div>
            <div className="text-sm text-gray-600">
              {filters.magazyn || filters.dataOd || filters.dataDo || (filters.status !== 'all') 
                ? 'Przefiltrowanych' 
                : 'Zrealizowanych zamówień'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <KurierStats isArchive={true} />

      {/* Filtry */}
      <KurierFilters 
        onFiltersChange={handleFiltersChange}
        isArchive={true}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          Błąd: {error}
        </div>
      )}

      {/* Lista archiwalnych zamówień */}
      <div className="mt-6">
        <ZamowieniaList
          zamowienia={filteredZamowienia}
          onZatwierdz={() => {}} // Brak akcji dla archiwalnych
          onUsun={() => {}} // Brak akcji dla archiwalnych
          userRole="archive" // Specjalna rola dla archiwum
          canApprove={false} // Brak możliwości zatwierdzania w archiwum
          loading={loading}
          isArchive={true} // Nowy prop informujący o trybie archiwum
        />
      </div>
    </div>
  )
}
