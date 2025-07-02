// src/app/kurier/components/KurierStats.js
// 🚀 KURIER STATS - Uproszczona wersja która działa z istniejącym API
'use client'
import { useState, useEffect } from 'react'
import { 
  Package, Clock, CheckCircle, TrendingUp, Building, DollarSign,
  Calendar, Truck, BarChart3, Activity, RefreshCw, 
  ArrowUp, ArrowDown, Minus, AlertTriangle
} from 'lucide-react'

export default function KurierStats({ isArchive = false, refreshTrigger = 0 }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [isArchive, refreshTrigger])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Używamy tylko istniejącego endpointu
      const url = `/api/kurier/stats`
      console.log('📊 Fetching stats from:', url)
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      const data = await response.json()
      console.log('📊 Stats response:', data)
      
      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || 'Błąd pobierania statystyk')
      }
    } catch (error) {
      console.error('Błąd pobierania statystyk:', error)
      setError('Nie udało się połączyć z serwerem')
    } finally {
      setLoading(false)
    }
  }

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '0%'
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return <Minus className="text-gray-500" size={16} />
    if (value > 0) return <ArrowUp className="text-green-500" size={16} />
    if (value < 0) return <ArrowDown className="text-red-500" size={16} />
    return <Minus className="text-gray-500" size={16} />
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'sent': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'delivered': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const calculateSuccessRate = () => {
    if (!stats || !stats.statusCounts) return 0
    const total = stats.totalCount || 0
    const successful = (stats.statusCounts.delivered || 0) + (stats.statusCounts.sent || 0)
    return total > 0 ? (successful / total) * 100 : 0
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
                <div className="w-16 h-6 bg-gray-200 rounded mb-1"></div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <div className="flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          <div>
            <div className="font-medium">Błąd ładowania statystyk</div>
            <div className="text-sm">{error}</div>
            <button 
              onClick={fetchStats}
              className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const successRate = calculateSuccessRate()

  return (
    <div className="mb-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-2 text-blue-600" />
            📊 Statystyki kurierskie {isArchive ? '(Archiwum)' : ''}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Przegląd zamówień i podstawowe metryki
          </p>
        </div>
        
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={16} />
          Odśwież
        </button>
      </div>

      {/* Basic Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Orders */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-blue-600 mb-1">
                <Package className="mr-2" size={20} />
                <span className="text-sm font-medium">Łączne zamówienia</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalCount || 0}
              </div>
              {stats.growthPercentage !== undefined && (
                <div className="flex items-center text-sm mt-1">
                  {getTrendIcon(stats.growthPercentage)}
                  <span className={stats.growthPercentage >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {formatPercentage(Math.abs(stats.growthPercentage))}
                  </span>
                  <span className="text-gray-500 ml-1">vs poprzedni miesiąc</span>
                </div>
              )}
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-green-600 mb-1">
                <CheckCircle className="mr-2" size={20} />
                <span className="text-sm font-medium">Wskaźnik sukcesu</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatPercentage(successRate)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {(stats.statusCounts?.delivered || 0) + (stats.statusCounts?.sent || 0)} z {stats.totalCount || 0} dostarczone
              </div>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-yellow-600 mb-1">
                <Activity className="mr-2" size={20} />
                <span className="text-sm font-medium">Aktywne zamówienia</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {stats.activeCount || 0}
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                Oczekujące na realizację
              </div>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        {/* Delivery Performance */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-purple-600 mb-1">
                <Clock className="mr-2" size={20} />
                <span className="text-sm font-medium">Wydajność dostaw</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.deliveryRate || 0}%
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {stats.avgDeliveryHours ? `${stats.avgDeliveryHours}h średnio` : 'Wskaźnik dostaw'}
              </div>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution */}
        {stats.statusCounts && (
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <BarChart3 className="mr-2 text-blue-600" />
              Rozkład statusów
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <div key={status} className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium capitalize">{status}</div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-xs">
                        {formatPercentage((count / stats.totalCount) * 100)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Magazine Distribution */}
        {stats.magazineCounts && Object.keys(stats.magazineCounts).length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Building className="mr-2 text-green-600" />
              Rozkład według magazynów
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.magazineCounts).map(([magazine, count]) => (
                <div key={magazine} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{magazine}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs text-gray-500">
                      {formatPercentage((count / stats.totalCount) * 100)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Period Stats */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Calendar className="mr-2 text-purple-600" />
          Statystyki czasowe
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-900">
              {stats.last7DaysCount || 0}
            </div>
            <div className="text-sm text-blue-600">Ostatnie 7 dni</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-900">
              {stats.last30DaysCount || 0}
            </div>
            <div className="text-sm text-green-600">Ostatnie 30 dni</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-900">
              {stats.thisMonthCount || 0}
            </div>
            <div className="text-sm text-purple-600">Ten miesiąc</div>
          </div>
        </div>
      </div>

      {/* Meta Info */}
      {stats.meta && (
        <div className="text-center text-xs text-gray-500">
          Ostatnia aktualizacja: {new Date(stats.meta.generatedAt).toLocaleString('pl-PL')}
          {stats.meta.note && (
            <div className="mt-1 text-yellow-600">ℹ️ {stats.meta.note}</div>
          )}
        </div>
      )}
    </div>
  )
}
