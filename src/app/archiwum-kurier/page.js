'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import ZamowieniaList from '../kurier/components/ZamowieniaList'
import KurierStats from '../kurier/components/KurierStats'
import KurierFilters from '../kurier/components/KurierFilters'

export default function ArchiwumKurierPage() {
  const [zamowienia, setZamowienia] = useState([])
  const [filteredZamowienia, setFilteredZamowienia] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    zleca: 'wszystkie',
    status: 'wszystkie', // Zmienione dla archiwum
    dataOd: '',
    dataDo: '',
    szukaj: '',
    sortowanie: 'data_desc'
  })

  // Pobierz dane użytkownika przy ładowaniu
  useEffect(() => {
    fetchUserData()
    fetchArchivedZamowienia()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      
      if (data.isAuthenticated && data.user) {
        setUserRole(data.user.role)
        setUserName(data.user.name)
      }
    } catch (error) {
      console.error('Błąd pobierania danych użytkownika:', error)
    }
  }

  // Funkcja filtrowania zamówień - taka sama jak w głównym module
  const applyFilters = useCallback((zamowieniaList, currentFilters) => {
    let filtered = [...zamowieniaList]

    // Filtr typu zlecenia
    if (currentFilters.zleca !== 'wszystkie') {
      filtered = filtered.filter(z => {
        try {
          const notes = JSON.parse(z.notes || '{}')
          const typZlecenia = notes.typZlecenia || ''
          
          switch (currentFilters.zleca) {
            case 'nadawca':
              return typZlecenia.includes('nadawca_')
            case 'trzecia_strona':
              return typZlecenia === 'trzecia_strona'
            case 'odbiorca':
              return typZlecenia.includes('odbiorca_')
            default:
              return true
          }
        } catch (error) {
          return true
        }
      })
    }

    // Filtr statusu - dla archiwum
    if (currentFilters.status !== 'wszystkie') {
      filtered = filtered.filter(z => z.status === currentFilters.status)
    }

    // Filtr wyszukiwania
    if (currentFilters.szukaj) {
      const searchTerm = currentFilters.szukaj.toLowerCase()
      filtered = filtered.filter(z => {
        const notes = JSON.parse(z.notes || '{}')
        return (
          z.recipient_name?.toLowerCase().includes(searchTerm) ||
          z.recipient_address?.toLowerCase().includes(searchTerm) ||
          z.package_description?.toLowerCase().includes(searchTerm) ||
          notes.przesylka?.mpk?.toLowerCase().includes(searchTerm) ||
          z.created_by_email?.toLowerCase().includes(searchTerm)
        )
      })
    }

    // Filtr daty od
    if (currentFilters.dataOd) {
      const dataOd = new Date(currentFilters.dataOd)
      filtered = filtered.filter(z => new Date(z.created_at) >= dataOd)
    }

    // Filtr daty do
    if (currentFilters.dataDo) {
      const dataDo = new Date(currentFilters.dataDo)
      dataDo.setHours(23, 59, 59)
      filtered = filtered.filter(z => new Date(z.created_at) <= dataDo)
    }

    // Sortowanie
    filtered.sort((a, b) => {
      switch (currentFilters.sortowanie) {
        case 'data_asc':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'data_desc':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'nazwa_asc':
          return a.recipient_name.localeCompare(b.recipient_name)
        case 'nazwa_desc':
          return b.recipient_name.localeCompare(a.recipient_name)
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return filtered
  }, [])

  // Obsługa zmiany filtrów
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    const filtered = applyFilters(zamowienia, newFilters)
    setFilteredZamowienia(filtered)
  }, [zamowienia, applyFilters])

  // POPRAWIONA FUNKCJA: Pobierz zarchiwizowane zamówienia
  const fetchArchivedZamowienia = async () => {
    try {
      setLoading(true)
      console.log('🗃️ Pobieranie zarchiwizowanych zamówień...')
      
      // Pobierz zamówienia z statusem 'completed' (archiwum)
      const response = await fetch('/api/kurier?status=completed')
      const data = await response.json()
      
      console.log('📦 Odpowiedź API archiwum:', data)
      
      if (data.success) {
        console.log('✅ Pobrano zamówienia z archiwum:', data.zamowienia.length)
        setZamowienia(data.zamowienia)
        // Zastosuj aktualne filtry do nowych danych
        const filtered = applyFilters(data.zamowienia, filters)
        setFilteredZamowienia(filtered)
        setError(null)
      } else {
        console.error('❌ Błąd API archiwum:', data.error)
        setError(data.error)
        setZamowienia([])
        setFilteredZamowienia([])
      }
    } catch (error) {
      console.error('💥 Błąd pobierania archiwum:', error)
      setError('Nie udało się pobrać zarchiwizowanych zamówień')
      setZamowienia([])
      setFilteredZamowienia([])
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

  // PLACEHOLDER funkcje - w archiwum nie można zatwierdzać ani usuwać
  const handleZatwierdzZamowienie = async (zamowienieId) => {
    alert('W archiwum nie można zatwierdzać zamówień')
  }

  const handleUsunZamowienie = async (zamowienieId) => {
    alert('W archiwum nie można usuwać zamówień')
  }

  if (loading && zamowienia.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie archiwum...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Archiwum zamówień kuriera
          </h1>
          <p className="text-gray-600 mt-2">
            Przeglądaj zatwierdzone, wysłane i dostarczone zamówienia
          </p>
        </div>
        <div className="flex space-x-4">
          {/* Link powrotu do aktywnych */}
          <Link
            href="/kurier"
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg shadow hover:bg-blue-200 flex items-center space-x-2 transition-all"
          >
            <ArrowLeft size={20} />
            <span>Aktywne zamówienia</span>
          </Link>
          
          <button
            onClick={fetchArchivedZamowienia}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Package size={20} />
            <span>{loading ? 'Odświeżanie...' : 'Odśwież'}</span>
          </button>
        </div>
      </div>

      {/* Statystyki dla archiwum */}
      <KurierStats isArchive={true} />

      {/* Filtry dla archiwum */}
      <div className="mb-6">
        <KurierFilters 
          onFiltersChange={handleFiltersChange}
          isArchive={true}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <div className="flex items-center">
            <div className="text-red-400 mr-2">⚠️</div>
            <div>
              <div className="font-medium">Błąd:</div>
              <div>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista zarchiwizowanych zamówień */}
      <div className="mt-6">
        <ZamowieniaList
          zamowienia={filteredZamowienia}
          onZatwierdz={handleZatwierdzZamowienie} // Nie działa w archiwum
          onUsun={handleUsunZamowienie} // Nie działa w archiwum
          userRole={userRole}
          canApprove={false} // WYŁĄCZONE w archiwum
          loading={loading}
          onRefresh={fetchArchivedZamowienia}
          processingOrders={new Set()} // Puste - nic się nie przetwarza w archiwum
        />
      </div>

      {/* Debug info - tylko w development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          <div className="font-mono">
            <div>🗃️ <strong>ARCHIWUM KURIERA</strong></div>
            <div>Łącznie w archiwum: {zamowienia.length}</div>
            <div>Po filtrach: {filteredZamowienia.length}</div>
            <div>Użytkownik: {userName} ({userRole})</div>
            <div>Aktywne filtry: {JSON.stringify(filters)}</div>
            <div>Statusy w danych: {[...new Set(zamowienia.map(z => z.status))].join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  )
}
