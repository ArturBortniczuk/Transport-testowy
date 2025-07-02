// src/app/kurier/page.js
'use client'
import React, { useState, useEffect } from 'react'
import { 
  Package, Plus, RefreshCw, Filter, Download, Archive, 
  CheckCircle, AlertCircle, Clock, Truck, Eye, Search,
  Calendar, BarChart3, Settings, Bell, Mail, User
} from 'lucide-react'

// Import komponentów (z fallback jeśli nie istnieją)
let KurierForm

try {
  KurierForm = require('./components/KurierForm').default
} catch (error) {
  console.warn('KurierForm component not found, using fallback')
  KurierForm = ({ onSubmit, onCancel }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Formularz zamówienia kuriera</h3>
      <p className="text-gray-600 mb-4">Komponent formularza w przygotowaniu...</p>
      <div className="flex space-x-2">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
        >
          Anuluj
        </button>
        <button 
          onClick={() => onSubmit({ test: true })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Submit
        </button>
      </div>
    </div>
  )
}
let ZamowieniaList
try {
  ZamowieniaList = require('./components/ZamowieniaList').default
} catch (error) {
  console.warn('ZamowieniaList component not found, using fallback')
  ZamowieniaList = ({ zamowienia, loading }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Lista zamówień</h3>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Ładowanie zamówień...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {zamowienia?.length > 0 ? (
            zamowienia.map((zamowienie, index) => (
              <div key={zamowienie.id || index} className="p-3 border rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Zamówienie #{zamowienie.id}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    zamowienie.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    zamowienie.status === 'approved' ? 'bg-green-100 text-green-800' :
                    zamowienie.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {zamowienie.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Do: {zamowienie.recipient_city || 'Brak danych'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">Brak zamówień</p>
          )}
        </div>
      )}
    </div>
  )
}
let KurierStats
try {
  KurierStats = require('./components/KurierStats').default
} catch (error) {
  console.warn('KurierStats component not found, using fallback')
  KurierStats = ({ isArchive, refreshTrigger }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Statystyki</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded text-center">
          <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-700">-</div>
          <div className="text-sm text-blue-600">Aktywne</div>
        </div>
        <div className="bg-green-50 p-4 rounded text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-700">-</div>
          <div className="text-sm text-green-600">Ukończone</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded text-center">
          <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-700">-</div>
          <div className="text-sm text-yellow-600">W trakcie</div>
        </div>
      </div>
    </div>
  )
}

export default function KurierPage() {
  // Stan główny - POPRAWKA: Dodano useState('active')
  const [activeView, setActiveView] = useState('active') // 'active', 'archive', 'new'
  const [zamowienia, setZamowienia] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [canApprove, setCanApprove] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [processingOrders, setProcessingOrders] = useState(new Set())

  // Stan filtrów i wyszukiwania
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Stan formularza
  const [showForm, setShowForm] = useState(false)

  // Stan statystyk
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Pobierz rolę użytkownika
  useEffect(() => {
    fetchUserRole()
  }, [])

  // Pobierz zamówienia gdy zmienia się widok lub filtr
  useEffect(() => {
    fetchZamowienia()
  }, [activeView, statusFilter, refreshTrigger])

  // Pobierz statystyki
  useEffect(() => {
    fetchStats()
  }, [activeView, refreshTrigger])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.user?.role)
        setCanApprove(data.user?.role === 'admin' || data.user?.role?.includes('magazyn'))
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchZamowienia = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Ustaw parametr statusu na podstawie aktywnego widoku
      let statusParam = 'active'
      if (activeView === 'archive') {
        statusParam = 'completed'
      } else if (activeView === 'all') {
        statusParam = 'all'
      }
      
      const url = `/api/kurier?status=${statusParam}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setZamowienia(data.zamowienia || [])
      } else {
        setError(data.error || 'Błąd pobierania zamówień')
      }
    } catch (error) {
      console.error('Error fetching zamowienia:', error)
      setError('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/kurier/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleCreateOrder = async (orderData) => {
    try {
      const response = await fetch('/api/kurier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowForm(false)
        setRefreshTrigger(prev => prev + 1)
        alert('Zamówienie utworzone pomyślnie!')
      } else {
        alert('Błąd: ' + (data.error || 'Nie udało się utworzyć zamówienia'))
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Błąd połączenia z serwerem')
    }
  }

  const handleApproveOrder = async (orderId) => {
    if (processingOrders.has(orderId)) return

    setProcessingOrders(prev => new Set([...prev, orderId]))
    
    try {
      const response = await fetch(`/api/kurier/${orderId}/approve`, {
        method: 'PATCH'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setRefreshTrigger(prev => prev + 1)
        alert('Zamówienie zatwierdzone!')
      } else {
        alert('Błąd: ' + (data.error || 'Nie udało się zatwierdzić'))
      }
    } catch (error) {
      console.error('Error approving order:', error)
      alert('Błąd połączenia z serwerem')
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Czy na pewno chcesz usunąć to zamówienie?')) return
    if (processingOrders.has(orderId)) return

    setProcessingOrders(prev => new Set([...prev, orderId]))
    
    try {
      const response = await fetch(`/api/kurier/${orderId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setRefreshTrigger(prev => prev + 1)
        alert('Zamówienie usunięte!')
      } else {
        alert('Błąd: ' + (data.error || 'Nie udało się usunąć'))
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Błąd połączenia z serwerem')
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  // Filtrowanie zamówień na podstawie wyszukiwania
  const filteredZamowienia = zamowienia.filter(zamowienie => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      zamowienie.id?.toString().includes(searchLower) ||
      zamowienie.recipient_city?.toLowerCase().includes(searchLower) ||
      zamowienie.recipient_name?.toLowerCase().includes(searchLower) ||
      zamowienie.created_by_email?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Truck className="mr-3" size={32} />
                Zarządzanie Kurierem
              </h1>
              <p className="text-gray-600 mt-2">
                Kompleksowe zarządzanie zamówieniami kurierskimi
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                disabled={loading}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={16} />
                Odśwież
              </button>
              
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="mr-2" size={16} />
                Nowe zamówienie
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div className="mb-8">
          <KurierStats 
            isArchive={activeView === 'archive'} 
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Nawigacja widoków */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="inline-block mr-2" size={16} />
              Aktywne ({stats?.activeCount || 0})
            </button>
            
            <button
              onClick={() => setActiveView('archive')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'archive'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Archive className="inline-block mr-2" size={16} />
              Archiwum ({stats?.archivedCount || 0})
            </button>
            
            <button
              onClick={() => setActiveView('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="inline-block mr-2" size={16} />
              Wszystkie ({stats?.totalCount || 0})
            </button>
          </div>
        </div>

        {/* Filtry i wyszukiwanie */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Wyszukiwanie */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Szukaj po nazwie, mieście lub ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filtry */}
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="new">Nowe</option>
                <option value="approved">Zatwierdzone</option>
                <option value="sent">Wysłane</option>
                <option value="delivered">Dostarczone</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="mr-2" size={16} />
                Filtry
              </button>
            </div>
          </div>
        </div>

        {/* Błąd */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="mr-2" size={20} />
              <div>
                <strong>Błąd:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Lista zamówień */}
        <ZamowieniaList
          zamowienia={filteredZamowienia}
          onZatwierdz={handleApproveOrder}
          onUsun={handleDeleteOrder}
          userRole={userRole}
          canApprove={canApprove}
          loading={loading}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
          processingOrders={processingOrders}
          isArchive={activeView === 'archive'}
        />

        {/* Modal formularza */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <KurierForm
                onSubmit={handleCreateOrder}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
