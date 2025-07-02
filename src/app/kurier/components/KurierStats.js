// src/app/kurier/components/KurierStats.js
'use client'
import { useState, useEffect } from 'react'
import { 
  Package, Clock, CheckCircle, TrendingUp, Building, DollarSign, Target,
  Calendar, Truck, Award, BarChart3, PieChart, Activity, Zap, Star,
  MapPin, Shield, CreditCard, Globe, RefreshCw, Download, Eye, Filter,
  TrendingDown, AlertTriangle, ArrowUp, ArrowDown, Minus, Users,
  Timer, Hash, Percent, Calculator
} from 'lucide-react'

export default function KurierStats({ isArchive = false, refreshTrigger = 0 }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Periods for stats
  const periods = [
    { value: '7', label: 'Ostatnie 7 dni', icon: '📅' },
    { value: '30', label: 'Ostatnie 30 dni', icon: '📊' },
    { value: '90', label: 'Ostatnie 3 miesiące', icon: '📈' },
    { value: '365', label: 'Ostatni rok', icon: '📚' },
    { value: 'all', label: 'Wszystko', icon: '🌐' }
  ]

  // Tabs for different views
  const tabs = [
    { id: 'overview', label: 'Przegląd', icon: BarChart3 },
    { id: 'performance', label: 'Wydajność', icon: TrendingUp },
    { id: 'costs', label: 'Koszty', icon: DollarSign },
    { id: 'timeline', label: 'Czas', icon: Clock }
  ]

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger, selectedPeriod, isArchive])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/kurier/stats?period=${selectedPeriod}&archive=${isArchive}`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || 'Błąd pobierania statystyk')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('pl-PL')
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount)
  }

  const getStatColor = (value, trend) => {
    if (trend === 'up') return 'text-green-600'
    if (trend === 'down') return 'text-red-600'
    return 'text-gray-600'
  }

  const getStatBgColor = (value, trend) => {
    if (trend === 'up') return 'bg-green-50'
    if (trend === 'down') return 'bg-red-50'
    return 'bg-gray-50'
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 p-6 rounded-lg">
                <div className="h-8 bg-gray-200 rounded w-8 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Błąd ładowania statystyk</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
          >
            <RefreshCw className="mr-2" size={16} />
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="mr-2" size={20} />
              Statystyki {isArchive ? 'Archiwum' : 'Kuriera'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isArchive ? 'Historyczne dane zamówień' : 'Aktualne statystyki zamówień'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Period selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.icon} {period.label}
                </option>
              ))}
            </select>
            
            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                showAdvanced
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-4 h-4 mr-1 inline" />
              {showAdvanced ? 'Podstawowe' : 'Zaawansowane'}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={fetchStats}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Basic Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Aktywne zamówienia */}
          <div className={`p-6 rounded-lg ${getStatBgColor(stats?.activeCount, stats?.activeTrend)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <div className={`text-2xl font-bold ${getStatColor(stats?.activeCount, stats?.activeTrend)}`}>
                      {formatNumber(stats?.activeCount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isArchive ? 'Zostały zarchiwizowane' : 'Aktywne zamówienia'}
                    </div>
                  </div>
                </div>
              </div>
              {stats?.activeTrend && (
                <div className={`text-sm ${getStatColor(stats?.activeCount, stats?.activeTrend)}`}>
                  {stats?.activeTrend === 'up' ? <ArrowUp size={16} /> : 
                   stats?.activeTrend === 'down' ? <ArrowDown size={16} /> : 
                   <Minus size={16} />}
                </div>
              )}
            </div>
          </div>

          {/* Ukończone zamówienia */}
          <div className={`p-6 rounded-lg ${getStatBgColor(stats?.deliveredCount, stats?.deliveredTrend)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <div className={`text-2xl font-bold ${getStatColor(stats?.deliveredCount, stats?.deliveredTrend)}`}>
                      {formatNumber(stats?.deliveredCount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isArchive ? 'Dostarczone w archiwum' : 'Dostarczone'}
                    </div>
                  </div>
                </div>
              </div>
              {stats?.deliveredTrend && (
                <div className={`text-sm ${getStatColor(stats?.deliveredCount, stats?.deliveredTrend)}`}>
                  {stats?.deliveredTrend === 'up' ? <ArrowUp size={16} /> : 
                   stats?.deliveredTrend === 'down' ? <ArrowDown size={16} /> : 
                   <Minus size={16} />}
                </div>
              )}
            </div>
          </div>

          {/* Wszystkie zamówienia */}
          <div className={`p-6 rounded-lg ${getStatBgColor(stats?.totalCount, stats?.totalTrend)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <div className={`text-2xl font-bold ${getStatColor(stats?.totalCount, stats?.totalTrend)}`}>
                      {formatNumber(stats?.totalCount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Wszystkie zamówienia
                    </div>
                  </div>
                </div>
              </div>
              {stats?.totalTrend && (
                <div className={`text-sm ${getStatColor(stats?.totalCount, stats?.totalTrend)}`}>
                  {stats?.totalTrend === 'up' ? <ArrowUp size={16} /> : 
                   stats?.totalTrend === 'down' ? <ArrowDown size={16} /> : 
                   <Minus size={16} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Stats */}
        {showAdvanced && (
          <div className="mt-8">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-2" size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="bg-gray-50 p-6 rounded-lg">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatNumber(stats?.newCount || 0)}</div>
                    <div className="text-sm text-gray-600">Nowe</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{formatNumber(stats?.approvedCount || 0)}</div>
                    <div className="text-sm text-gray-600">Zatwierdzone</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{formatNumber(stats?.sentCount || 0)}</div>
                    <div className="text-sm text-gray-600">Wysłane</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatNumber(stats?.deliveredCount || 0)}</div>
                    <div className="text-sm text-gray-600">Dostarczone</div>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.deliveryRate || 0}%</div>
                    <div className="text-sm text-gray-600">Wskaźnik dostaw</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.avgDeliveryTime || 0}h</div>
                    <div className="text-sm text-gray-600">Średni czas dostawy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats?.customerSatisfaction || 0}%</div>
                    <div className="text-sm text-gray-600">Zadowolenie klientów</div>
                  </div>
                </div>
              )}

              {activeTab === 'costs' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</div>
                    <div className="text-sm text-gray-600">Przychody</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.totalCosts || 0)}</div>
                    <div className="text-sm text-gray-600">Koszty</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.avgOrderValue || 0)}</div>
                    <div className="text-sm text-gray-600">Średnia wartość</div>
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.avgProcessingTime || 0}h</div>
                    <div className="text-sm text-gray-600">Czas przetwarzania</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats?.avgShippingTime || 0}h</div>
                    <div className="text-sm text-gray-600">Czas wysyłki</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.onTimeDeliveries || 0}%</div>
                    <div className="text-sm text-gray-600">Na czas</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
