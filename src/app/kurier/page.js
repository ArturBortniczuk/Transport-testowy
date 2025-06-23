'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Archive } from 'lucide-react'
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
  const [filters, setFilters] = useState({
    magazyn: '',
    dataOd: '',
    dataDo: '',
    status: 'new'
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

    // Filtr magazynu
    if (currentFilters.magazyn) {
      filtered = filtered.filter(z => z.magazine_source === currentFilters.magazyn)
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

  // Pobierz zamówienia i zastosuj filtry
  const fetchZamowienia = async () => {
    try {
      setLoading(true)
      // Pobierz tylko aktywne zamówienia (status=active oznacza nowe)
      const response = await fetch('/api/kurier?status=active')
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
      console.error('Błąd pobierania zamówień:', error)
      setError('Nie udało się pobrać zamówień kurierskich')
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

  const handleDodajZamowienie = async (noweZamowienie) => {
    try {
      setLoading(true)
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
        // Odśwież listę zamówień
        await fetchZamowienia()
        setShowForm(false)
        
        // Pokaż komunikat sukcesu
        alert('Zamówienie kurierskie zostało dodane pomyślnie!')
      } else {
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
    try {
      // TODO: Tutaj później dodamy integrację z API DHL/InPost
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
        // Odśwież listę zamówień
        await fetchZamowienia()
        alert('Zamówienie zostało zatwierdzone!')
      } else {
        alert('Błąd: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd zatwierdzania zamówienia:', error)
      alert('Wystąpił błąd podczas zatwierdzania zamówienia')
    }
  }

  const handleUsunZamowienie = async (zamowienieId) => {
    if (!confirm('Czy na pewno chcesz usunąć to zamówienie?')) {
      return
    }

    try {
      const response = await fetch(`/api/kurier/${zamowienieId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        // Odśwież listę zamówień
        await fetchZamowienia()
        alert('Zamówienie zostało usunięte!')
      } else {
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
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Aktywne zamówienia kuriera
          </h1>
          <p className="text-gray-600 mt-2">
            Zarządzaj nowymi zamówieniami kurierskimi dla magazynu
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
          
          {canAddOrder && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition-all"
            >
              <span>{showForm ? 'Anuluj' : 'Nowe zamówienie'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Statystyki */}
      <KurierStats isArchive={false} />

      {/* Filtry */}
      <KurierFilters 
        onFiltersChange={handleFiltersChange}
        isArchive={false}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          Błąd: {error}
        </div>
      )}

      {/* Lista zamówień jest zawsze widoczna */}
      <div className={`transition-all duration-500 ${showForm ? 'opacity-50' : 'opacity-100'} mt-6`}>
        <ZamowieniaList
          zamowienia={filteredZamowienia}
          onZatwierdz={handleZatwierdzZamowienie}
          onUsun={handleUsunZamowienie}
          userRole={userRole}
          canApprove={canApprove}
          loading={loading}
        />
      </div>

      {/* Formularz jest wyświetlany jako modal po kliknięciu przycisku */}
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
    </div>
  )
}
