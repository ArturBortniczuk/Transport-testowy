'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Archive, HelpCircle, Package, Plus } from 'lucide-react'
import KurierForm from './components/KurierForm'
import ZamowieniaList from './components/ZamowieniaList'
import KurierStats from './components/KurierStats'
import KurierFilters from './components/KurierFilters'
import KurierQueryForm from './components/KurierQueryForm'
import KurierQueriesList from './components/KurierQueriesList'

export default function KurierPage() {
  const [activeTab, setActiveTab] = useState('zamowienia') // 'zamowienia' lub 'zapytania'
  const [zamowienia, setZamowienia] = useState([])
  const [queries, setQueries] = useState([])
  const [filteredZamowienia, setFilteredZamowienia] = useState([])
  const [filteredQueries, setFilteredQueries] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [userPermissions, setUserPermissions] = useState({
    canAdd: true,
    canApprove: false,
    canViewAll: false
  })
  const [showForm, setShowForm] = useState(false)
  const [showQueryForm, setShowQueryForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [queriesLoading, setQueriesLoading] = useState(false)
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
    if (activeTab === 'zapytania') {
      fetchQueries()
    }
  }, [activeTab])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      
      if (data.isAuthenticated && data.user) {
        setUserRole(data.user.role)
        setUserName(data.user.name)
        
        // Sprawdź uprawnienia do zapytań kurierskich
        const permissions = data.user.permissions || {}
        const isAdmin = data.user.role === 'admin'
        const kurierPerms = permissions.kurier?.queries || {}
        
        setUserPermissions({
          canAdd: isAdmin || kurierPerms.add !== false,
          canApprove: isAdmin || kurierPerms.approve === true,
          canViewAll: isAdmin || kurierPerms.viewAll === true
        })
      }
    } catch (error) {
      console.error('Błąd pobierania danych użytkownika:', error)
    }
  }

  // Funkcja filtrowania zamówień (bez zmian)
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

  // NOWE: Pobierz zapytania kurierskie
  const fetchQueries = async () => {
    try {
      setQueriesLoading(true)
      const response = await fetch('/api/kurier/queries')
      const data = await response.json()
      
      if (data.success) {
        console.log('Pobrano zapytania:', data.queries.length)
        setQueries(data.queries)
        setFilteredQueries(data.queries) // Na razie bez zaawansowanych filtrów
        setError(null)
      } else {
        setError(data.error)
        setQueries([])
        setFilteredQueries([])
      }
    } catch (error) {
      console.error('Błąd pobierania zapytań:', error)
      setError('Nie udało się pobrać zapytań kurierskich')
      setQueries([])
      setFilteredQueries([])
    } finally {
      setQueriesLoading(false)
    }
  }

  useEffect(() => {
    if (zamowienia.length > 0) {
      const filtered = applyFilters(zamowienia, filters)
      setFilteredZamowienia(filtered)
    }
  }, [zamowienia, filters, applyFilters])

  // ZAMÓWIENIA - funkcje bez zmian
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

  // NOWE: Funkcje dla zapytań kurierskich
  const handleDodajZapytanie = async (noweZapytanie) => {
    try {
      setQueriesLoading(true)
      console.log('Dodawanie nowego zapytania:', noweZapytanie)
      
      const response = await fetch('/api/kurier/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noweZapytanie),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('Zapytanie dodane pomyślnie, ID:', data.id)
        await fetchQueries()
        setShowQueryForm(false)
        alert('Zapytanie kurierskie zostało wysłane! Otrzymasz odpowiedź w ciągu 24h.')
      } else {
        console.error('Błąd dodawania zapytania:', data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd dodawania zapytania:', error)
      alert('Wystąpił błąd podczas wysyłania zapytania')
    } finally {
      setQueriesLoading(false)
    }
  }

  const handleApproveQuery = async (queryId, notes) => {
    try {
      console.log(`✅ Akceptacja zapytania ${queryId}`)
      
      const response = await fetch(`/api/kurier/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          notes: notes,
          autoCreateShipment: true // Automatycznie utwórz przesyłkę DHL
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Zapytanie ${queryId} zaakceptowane:`, data)
        await fetchQueries()
        
        if (data.dhlResult?.success) {
          alert('Zapytanie zaakceptowane i przesyłka DHL została utworzona! 🚚')
        } else {
          alert('Zapytanie zaakceptowane. ' + (data.message || ''))
        }
      } else {
        console.error(`❌ Błąd akceptacji zapytania ${queryId}:`, data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error(`💥 Błąd akceptacji zapytania ${queryId}:`, error)
      alert('Wystąpił błąd podczas akceptacji zapytania')
    }
  }

  const handleRejectQuery = async (queryId, reason) => {
    try {
      console.log(`❌ Odrzucenie zapytania ${queryId}`)
      
      const response = await fetch(`/api/kurier/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          notes: reason
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log(`❌ Zapytanie ${queryId} odrzucone`)
        await fetchQueries()
        alert('Zapytanie zostało odrzucone.')
      } else {
        console.error(`❌ Błąd odrzucenia zapytania ${queryId}:`, data.error)
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error(`💥 Błąd odrzucenia zapytania ${queryId}:`, error)
      alert('Wystąpił błąd podczas odrzucania zapytania')
    }
  }

  // Sprawdź uprawnienia
  const canAddOrder = userRole === 'handlowiec' || userRole === 'admin' || userRole?.includes('magazyn')
  const canApprove = userRole === 'admin' || userRole?.includes('magazyn')
  
  if (loading && zamowienia.length === 0 && activeTab === 'zamowienia') {
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
      {/* Nagłówek z tabami */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Moduł kuriera
            </h1>
            <p className="text-gray-600 mt-2">
              Zarządzaj zamówieniami i zapytaniami kurierskimi z integracją DHL
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
            
            {/* Przyciski akcji */}
            {activeTab === 'zamowienia' && canAddOrder && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition-all"
              >
                <Plus size={20} />
                <span>{showForm ? 'Anuluj' : 'Nowe zamówienie'}</span>
              </button>
            )}
            
            {activeTab === 'zapytania' && userPermissions.canAdd && (
              <button
                onClick={() => setShowQueryForm(!showQueryForm)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 flex items-center space-x-2 transition-all"
              >
                <Plus size={20} />
                <span>{showQueryForm ? 'Anuluj' : 'Nowe zapytanie'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Taby */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('zamowienia')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'zamowienia'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="inline-block w-5 h-5 mr-2" />
              Zamówienia kurierskie
              {zamowienia.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 py-1 px-2 rounded-full text-xs">
                  {zamowienia.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('zapytania')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'zapytania'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <HelpCircle className="inline-block w-5 h-5 mr-2" />
              Zapytania kurierskie
              {queries.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs">
                  {queries.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Statystyki */}
      <KurierStats isArchive={false} />

      {/* Zawartość w zależności od aktywnej zakładki */}
      {activeTab === 'zamowienia' && (
        <>
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
        </>
      )}

      {activeTab === 'zapytania' && (
        <>
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

          {/* Lista zapytań */}
          <div className={`transition-all duration-500 ${showQueryForm ? 'opacity-50' : 'opacity-100'} mt-6`}>
            <KurierQueriesList
              queries={filteredQueries}
              onApprove={handleApproveQuery}
              onReject={handleRejectQuery}
              userPermissions={userPermissions}
              loading={queriesLoading}
              onRefresh={fetchQueries}
            />
          </div>
        </>
      )}

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

      {/* Modal formularza zapytania */}
      {showQueryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <KurierQueryForm 
              onSubmit={handleDodajZapytanie} 
              userName={userName}
              onCancel={() => setShowQueryForm(false)}
            />
          </div>
        </div>
      )}

      {/* Debug info - tylko w development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          <div className="font-mono">
            <div><strong>Aktywna zakładka:</strong> {activeTab}</div>
            <div><strong>Zamówienia:</strong> {zamowienia.length} (po filtrach: {filteredZamowienia.length})</div>
            <div><strong>Zapytania:</strong> {queries.length}</div>
            <div><strong>Użytkownik:</strong> {userName} ({userRole})</div>
            <div><strong>Uprawnienia zamówień:</strong> Dodawanie: {canAddOrder ? 'TAK' : 'NIE'}, Zatwierdzanie: {canApprove ? 'TAK' : 'NIE'}</div>
            <div><strong>Uprawnienia zapytań:</strong> Dodawanie: {userPermissions.canAdd ? 'TAK' : 'NIE'}, Akceptacja: {userPermissions.canApprove ? 'TAK' : 'NIE'}, Wszystkie: {userPermissions.canViewAll ? 'TAK' : 'NIE'}</div>
            <div><strong>Przetwarzane zamówienia:</strong> {Array.from(processingOrders).join(', ') || 'Brak'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
