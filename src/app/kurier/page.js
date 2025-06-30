'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Archive, Package, Plus } from 'lucide-react'
import KurierForm from './components/KurierForm'
import ZamowieniaList from './components/ZamowieniaList'
import KurierStats from './components/KurierStats'
import KurierFilters from './components/KurierFilters'

export default function KurierPage() {
  const [zamowienia, setZamowienia] = useState([])
  const [filteredZamowienia, setFilteredZamowienia] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingOrders, setProcessingOrders] = useState(new Set())
  const [filters, setFilters] = useState({
    zleca: 'wszystkie',
    status: 'nowe',
    dataOd: '',
    dataDo: '',
    szukaj: '',
    sortowanie: 'data_desc'
  })

  // Pobierz dane użytkownika i zamówienia przy ładowaniu
  useEffect(() => {
    fetchUserData()
    fetchZamowienia()
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

  // Funkcja filtrowania zamówień
  const applyFilters = useCallback((zamowieniaList, currentFilters) => {
    let filtered = [...zamowieniaList]

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

    if (currentFilters.status === 'nowe') {
      filtered = filtered.filter(z => z.status === 'new')
    }

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

    if (currentFilters.dataOd) {
      const dataOd = new Date(currentFilters.dataOd)
      filtered = filtered.filter(z => new Date(z.created_at) >= dataOd)
    }

    if (currentFilters.dataDo) {
      const dataDo = new Date(currentFilters.dataDo)
      dataDo.setHours(23, 59, 59)
      filtered = filtered.filter(z => new Date(z.created_at) <= dataDo)
    }

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

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    const filtered = applyFilters(zamowienia, newFilters)
    setFilteredZamowienia(filtered)
  }, [zamowienia, applyFilters])

  // Pobierz zamówienia
  const fetchZamowienia = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kurier?status=active')
      const data = await response.json()
      
      if (data.success) {
        console.log('Pobrano zamówienia:', data.zamowienia.length)
        setZamowienia(data.zamowienia)
        const filtered = applyFilters(data.zamowienia, filters)
        setFilteredZamowienia(filtered)
        setError(null)
      } else {
        setError(data.error)
        setZamowienia([])
        setFilteredZamowienia([])
      }
    } catch (error) {
      console.error('Błąd pobierania zamówień:', error)
      setError('Nie udało się pobrać zamówień kurierskich')
      setZamowienia([])
      setFilteredZamowienia([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (zamowienia.length > 0) {
      const filtered = applyFilters(zamowienia, filters)
      setFilteredZamowienia(filtered)
    }
  }, [zamowienia, filters, applyFilters])

  // Dodawanie zamówienia
  const handleDodajZamowienie = async (noweZamowienie) => {
    try {
      setLoading(true)
      console.log('Dodawanie nowego zamówienia:', noweZamowienie)
      
      const response = await fetch('/api/kurier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...noweZamowienie,
          magazynZamawiajacy: userRole
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('Zamówienie dodane pomyślnie, ID:', data.id)
        await fetchZamowienia()
        setShowForm(false)
        alert('Zamówienie kurierskie zostało dodane pomyślnie!')
      } else {
        console.error('Błąd dodawania zamówienia:', data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd dodawania zamówienia:', error)
      alert('Wystąpił błąd podczas dodawania zamówienia')
    } finally {
      setLoading(false)
    }
  }

  // Zatwierdzanie zamówienia
  const handleZatwierdzZamowienie = async (zamowienieId) => {
    if (processingOrders.has(zamowienieId)) {
      console.warn(`⚠️ Zamówienie ${zamowienieId} jest już przetwarzane, ignoruję żądanie`)
      return
    }

    try {
      setProcessingOrders(prev => new Set([...prev, zamowienieId]))
      
      console.log(`🚀 Rozpoczynam zatwierdzanie zamówienia: ${zamowienieId}`)
      
      const response = await fetch(`/api/kurier/${zamowienieId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved'
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Zamówienie ${zamowienieId} zatwierdzone:`, data)
        await fetchZamowienia()
        
        if (data.dhlStatus === 'sent') {
          alert('Zamówienie zostało zatwierdzone i wysłane do DHL! 🚚')
        } else {
          alert('Zamówienie zostało zatwierdzone. ' + (data.message || ''))
        }
      } else {
        console.error(`❌ Błąd zatwierdzania zamówienia ${zamowienieId}:`, data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error(`💥 Błąd zatwierdzania zamówienia ${zamowienieId}:`, error)
      alert('Wystąpił błąd podczas zatwierdzania zamówienia')
    } finally {
      setTimeout(() => {
        setProcessingOrders(prev => {
          const newSet = new Set(prev)
          newSet.delete(zamowienieId)
          return newSet
        })
      }, 5000)
    }
  }

  // Usuwanie zamówienia
  const handleUsunZamowienie = async (zamowienieId) => {
    if (!confirm('Czy na pewno chcesz usunąć to zamówienie? Jeśli ma numer DHL, zostanie także anulowane.')) {
      return
    }

    try {
      console.log('Usuwanie zamówienia:', zamowienieId)
      
      const response = await fetch(`/api/kurier/${zamowienieId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('Zamówienie usunięte pomyślnie')
        await fetchZamowienia()
        alert('Zamówienie zostało usunięte!')
      } else {
        console.error('Błąd usuwania:', data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd usuwania zamówienia:', error)
      alert('Wystąpił błąd podczas usuwania zamówienia')
    }
  }

  // Sprawdź uprawnienia
  const canAddOrder = userRole === 'handlowiec' || userRole === 'admin' || userRole?.includes('magazyn')
  const canApprove = userRole === 'admin' || userRole?.includes('magazyn')
  
  if (loading && zamowienia.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Nagłówek */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Moduł kuriera
            </h1>
            <p className="text-gray-600 mt-2">
              Zarządzaj zamówieniami kurierskimi z integracją DHL
            </p>
          </div>
          <div className="flex space-x-4">
            {/* Link do archiwum */}
            <Link
              href="/archiwum-kurier"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 flex items-center space-x-2 transition-all"
            >
              <Archive size={20} />
              <span>Archiwum</span>
            </Link>
            
            {/* Przycisk nowego zamówienia */}
            {canAddOrder && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition-all"
              >
                <Plus size={20} />
                <span>{showForm ? 'Anuluj' : 'Nowe zamówienie'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Nagłówek z ikoną */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Zamówienia kurierskie
              </h2>
              {zamowienia.length > 0 && (
                <span className="text-sm text-gray-500">
                  {zamowienia.length} {zamowienia.length === 1 ? 'zamówienie' : 'zamówień'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <KurierStats isArchive={false} />

      {/* Filtry */}
      <div className="mb-6">
        <KurierFilters 
          onFiltersChange={handleFiltersChange}
          isArchive={false}
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

      {/* Lista zamówień */}
      <div className={`transition-all duration-500 ${showForm ? 'opacity-50' : 'opacity-100'} mt-6`}>
        <ZamowieniaList
          zamowienia={filteredZamowienia}
          onZatwierdz={handleZatwierdzZamowienie}
          onUsun={handleUsunZamowienie}
          userRole={userRole}
          canApprove={canApprove}
          loading={loading}
          onRefresh={fetchZamowienia}
          processingOrders={processingOrders}
        />
      </div>

      {/* Modal formularza zamówienia */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <KurierForm 
              onSubmit={handleDodajZamowienie} 
              magazynNadawcy={userRole}
              userName={userName}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Debug info - tylko w development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          <div className="font-mono">
            <div><strong>Zamówienia:</strong> {zamowienia.length} (po filtrach: {filteredZamowienia.length})</div>
            <div><strong>Użytkownik:</strong> {userName} ({userRole})</div>
            <div><strong>Uprawnienia:</strong> Dodawanie: {canAddOrder ? 'TAK' : 'NIE'}, Zatwierdzanie: {canApprove ? 'TAK' : 'NIE'}</div>
            <div><strong>Przetwarzane zamówienia:</strong> {Array.from(processingOrders).join(', ') || 'Brak'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
