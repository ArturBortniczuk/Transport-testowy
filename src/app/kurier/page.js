// src/app/kurier/page.js
'use client'
import React, { useState, useEffect } from 'react'
import { 
  Package, Plus, RefreshCw, Filter, Download, Archive, 
  CheckCircle, AlertCircle, Clock, Truck, Eye, Search,
  Calendar, BarChart3, Settings, Bell, Mail, User
} from 'lucide-react'

// ✅ NAPRAWIONE IMPORTY - bez cyklicznych zależności
import KurierForm from './components/KurierForm'
import ZamowieniaList from './components/ZamowieniaList'  
import KurierStats from './components/KurierStats'

export default function KurierPage() {
  // Stan główny
  const [activeView, setActiveView] = useState('active')
  const [zamowienia, setZamowienia] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Stan filtrów i wyszukiwania
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Stan formularza
  const [showForm, setShowForm] = useState(false)

  // Stan statystyk
  const [stats, setStats] = useState({
    activeCount: 0,
    archivedCount: 0,
    totalCount: 0
  })

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
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchZamowienia = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let statusParam = 'active'
      if (activeView === 'archive') {
        statusParam = 'completed'
      } else if (activeView === 'all') {
        statusParam = 'all'
      }
      
      const url = `/api/kurier?status=${statusParam}`
      console.log('🚚 Fetching from:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📦 API Response:', data)
      
      if (data.success) {
        setZamowienia(data.zamowienia || [])
      } else {
        setError(data.error || 'Błąd pobierania zamówień')
      }
    } catch (error) {
      console.error('Error fetching zamowienia:', error)
      setError('Błąd połączenia z serwerem: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/kurier/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Czy na pewno chcesz usunąć to zamówienie?')) return
    
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
    }
  }

  // Filtrowanie zamówień
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
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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

        {/* 🔥 NAPRAWIONA SEKCJA BEZ CYKLICZNYCH IMPORTÓW */}
        
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
          canApprove={userRole === 'admin' || userRole?.includes('magazyn')}
          loading={loading}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
          processingOrders={new Set()}
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
