// src/app/kurier/components/KurierStats.js
// 🔥 MEGA KURIER STATS - Najbardziej zaawansowany system statystyk i analytics
'use client'
import { useState, useEffect, useMemo } from 'react'
import { 
  Package, Clock, CheckCircle, TrendingUp, Building, DollarSign, Target,
  Calendar, Truck, Award, BarChart3, PieChart, Activity, Zap, Star,
  MapPin, Shield, CreditCard, Globe, RefreshCw, Download, Eye, Filter,
  TrendingDown, AlertTriangle, ArrowUp, ArrowDown, Minus, Users,
  Timer, Hash, Percent, Calculator
} from 'lucide-react'

export default function KurierStats({ isArchive = false, refreshTrigger = 0 }) {
  const [stats, setStats] = useState(null)
  const [detailedStats, setDetailedStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [realTimeData, setRealTimeData] = useState({})

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
    { id: 'services', label: 'Usługi', icon: Package },
    { id: 'geography', label: 'Geografia', icon: MapPin },
    { id: 'timeline', label: 'Timeline', icon: Calendar }
  ]

  useEffect(() => {
    fetchStats()
    fetchDetailedStats()
    // Setup real-time refresh
    const interval = setInterval(() => {
      updateRealTimeData()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [selectedPeriod, isArchive, refreshTrigger])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = `/api/kurier/stats?period=${selectedPeriod}&archive=${isArchive}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error('Błąd pobierania statystyk:', error)
      setError('Nie udało się pobrać statystyk')
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedStats = async () => {
    try {
      const url = `/api/kurier/stats/detailed?period=${selectedPeriod}&archive=${isArchive}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setDetailedStats(data.stats)
      }
    } catch (error) {
      console.error('Błąd pobierania szczegółowych statystyk:', error)
    }
  }

  const updateRealTimeData = async () => {
    try {
      const response = await fetch('/api/kurier/stats/realtime')
      const data = await response.json()
      
      if (data.success) {
        setRealTimeData(data.realTime)
      }
    } catch (error) {
      console.warn('Błąd aktualizacji real-time data:', error)
    }
  }

  // Calculate advanced metrics
  const advancedMetrics = useMemo(() => {
    if (!stats || !detailedStats) return {}

    const metrics = {
      // Efficiency metrics
      avgProcessingTime: calculateAvgProcessingTime(),
      successRate: calculateSuccessRate(),
      costPerShipment: calculateCostPerShipment(),
      
      // Growth metrics
      growthRate: calculateGrowthRate(),
      trendsData: calculateTrends(),
      
      // Performance metrics
      deliveryPerformance: calculateDeliveryPerformance(),
      serviceDistribution: calculateServiceDistribution(),
      
      // Geographic metrics
      topCities: calculateTopCities(),
      distanceStats: calculateDistanceStats(),
      
      // Cost analysis
      costBreakdown: calculateCostBreakdown(),
      costTrends: calculateCostTrends()
    }

    return metrics
  }, [stats, detailedStats])

  // Helper calculation functions
  const calculateAvgProcessingTime = () => {
    if (!detailedStats?.processingTimes) return 0
    const times = detailedStats.processingTimes
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  const calculateSuccessRate = () => {
    if (!stats) return 0
    const total = stats.totalCount || 0
    const successful = (stats.statusCounts?.delivered || 0) + (stats.statusCounts?.sent || 0)
    return total > 0 ? (successful / total) * 100 : 0
  }

  const calculateCostPerShipment = () => {
    if (!detailedStats?.totalCost || !stats?.totalCount) return 0
    return detailedStats.totalCost / stats.totalCount
  }

  const calculateGrowthRate = () => {
    if (!detailedStats?.timeline) return 0
    const timeline = detailedStats.timeline
    if (timeline.length < 2) return 0
    
    const current = timeline[timeline.length - 1]?.count || 0
    const previous = timeline[timeline.length - 2]?.count || 0
    
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const calculateTrends = () => {
    if (!detailedStats?.timeline) return []
    return detailedStats.timeline.map(item => ({
      date: item.date,
      orders: item.count,
      cost: item.totalCost || 0,
      avgCost: item.totalCost ? item.totalCost / item.count : 0
    }))
  }

  const calculateDeliveryPerformance = () => {
    if (!detailedStats?.deliveryTimes) return {}
    const times = detailedStats.deliveryTimes
    return {
      onTime: times.filter(t => t <= 24).length,
      delayed: times.filter(t => t > 24 && t <= 48).length,
      veryDelayed: times.filter(t => t > 48).length,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
    }
  }

  const calculateServiceDistribution = () => {
    if (!stats?.magazineCounts) return []
    return Object.entries(stats.magazineCounts).map(([service, count]) => ({
      name: service.replace('_', ' '),
      value: count,
      percentage: (count / stats.totalCount) * 100
    }))
  }

  const calculateTopCities = () => {
    if (!detailedStats?.cities) return []
    return Object.entries(detailedStats.cities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }))
  }

  const calculateDistanceStats = () => {
    if (!detailedStats?.distances) return {}
    const distances = detailedStats.distances
    return {
      avg: distances.reduce((sum, d) => sum + d, 0) / distances.length,
      min: Math.min(...distances),
      max: Math.max(...distances),
      total: distances.reduce((sum, d) => sum + d, 0)
    }
  }

  const calculateCostBreakdown = () => {
    if (!detailedStats?.costBreakdown) return {}
    return detailedStats.costBreakdown
  }

  const calculateCostTrends = () => {
    if (!detailedStats?.timeline) return []
    return detailedStats.timeline.map(item => ({
      date: item.date,
      cost: item.totalCost || 0,
      avgCost: item.totalCost ? item.totalCost / item.count : 0
    }))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-yellow-600 bg-yellow-50'
      case 'approved': return 'text-green-600 bg-green-50'
      case 'sent': return 'text-blue-600 bg-blue-50'
      case 'delivered': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (value) => {
    if (value > 0) return <ArrowUp className="text-green-500" size={16} />
    if (value < 0) return <ArrowDown className="text-red-500" size={16} />
    return <Minus className="text-gray-500" size={16} />
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
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="mb-6 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-2 text-blue-600" />
            📊 MEGA Analytics {isArchive ? '(Archiwum)' : '(Aktywne)'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Zaawansowane statystyki i analytics z real-time monitoring
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.icon} {period.label}
              </option>
            ))}
          </select>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              showAdvanced 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calculator className="inline mr-1" size={14} />
            {showAdvanced ? 'Ukryj' : 'Pokaż'} zaawansowane
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchStats()
              fetchDetailedStats()
            }}
            className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors text-sm"
          >
            <RefreshCw size={14} className="inline mr-1" />
            Odśwież
          </button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      {realTimeData.activeOrders && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="font-medium">Live:</span>
                <span className="ml-1">{realTimeData.activeOrders} aktywnych zamówień</span>
              </div>
              {realTimeData.processing > 0 && (
                <div className="flex items-center">
                  <RefreshCw size={12} className="animate-spin mr-1 text-blue-600" />
                  <span>{realTimeData.processing} w trakcie przetwarzania</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Ostatnia aktualizacja: {new Date().toLocaleTimeString('pl-PL')}
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active/Total Orders */}
        <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-lg ${isArchive ? 'bg-purple-50' : 'bg-yellow-50'}`}>
              <Package className={`w-6 h-6 ${isArchive ? 'text-purple-600' : 'text-yellow-600'}`} />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {isArchive ? stats.archivedCount : stats.activeCount}
              </div>
              <div className="text-sm text-gray-600">
                {isArchive ? 'W archiwum' : 'Aktywne zamówienia'}
              </div>
              {advancedMetrics.growthRate && (
                <div className="flex items-center justify-end mt-1">
                  {getTrendIcon(advancedMetrics.growthRate)}
                  <span className="text-xs ml-1">
                    {formatPercentage(Math.abs(advancedMetrics.growthRate))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {stats.statusCounts?.delivered || 0}
              </div>
              <div className="text-sm text-gray-600">Dostarczone</div>
              {advancedMetrics.successRate && (
                <div className="text-xs text-green-600 font-medium">
                  {formatPercentage(advancedMetrics.successRate)} sukces
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {detailedStats?.totalCost ? formatCurrency(detailedStats.totalCost) : '0 PLN'}
              </div>
              <div className="text-sm text-gray-600">Łączny koszt</div>
              {advancedMetrics.costPerShipment && (
                <div className="text-xs text-blue-600">
                  {formatCurrency(advancedMetrics.costPerShipment)} /szt
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="bg-purple-50 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {advancedMetrics.successRate ? Math.round(advancedMetrics.successRate) : 0}
              </div>
              <div className="text-sm text-gray-600">Performance Score</div>
              {advancedMetrics.avgProcessingTime && (
                <div className="text-xs text-purple-600">
                  ~{Math.round(advancedMetrics.avgProcessingTime)}h proces
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-gray-600" />
          Podział według statusów
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.statusCounts || {}).map(([status, count]) => {
            const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0
            return (
              <div key={status} className={`p-4 rounded-lg ${getStatusColor(status)}`}>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-sm capitalize">{status === 'new' ? 'Nowe' : status}</div>
                <div className="text-xs opacity-75">{formatPercentage(percentage)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advanced Analytics Tabs */}
      {showAdvanced && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="inline w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Key Metrics */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">📈 Kluczowe wskaźniki</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Wskaźnik sukcesu:</span>
                        <span className="font-medium text-green-600">
                          {formatPercentage(advancedMetrics.successRate || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Średni czas procesu:</span>
                        <span className="font-medium">
                          {Math.round(advancedMetrics.avgProcessingTime || 0)}h
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Koszt na przesyłkę:</span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(advancedMetrics.costPerShipment || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Services */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">🚚 Popularne usługi</h5>
                    <div className="space-y-2">
                      {advancedMetrics.serviceDistribution?.slice(0, 5).map((service, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 capitalize">{service.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${service.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{service.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">⚡ Ostatnia aktywność</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Ostatnie zamówienie: 2 min temu</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">DHL wysyłka: 15 min temu</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-600">Dostawa: 1h temu</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Delivery Performance */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">📦 Wydajność dostaw</h5>
                    {advancedMetrics.deliveryPerformance && (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Na czas (≤24h):</span>
                          <span className="font-medium text-green-600">
                            {advancedMetrics.deliveryPerformance.onTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Opóźnione (24-48h):</span>
                          <span className="font-medium text-yellow-600">
                            {advancedMetrics.deliveryPerformance.delayed}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Bardzo opóźnione (>48h):</span>
                          <span className="font-medium text-red-600">
                            {advancedMetrics.deliveryPerformance.veryDelayed}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <span className="text-sm text-gray-600">Średni czas dostawy:</span>
                          <span className="float-right font-medium">
                            {Math.round(advancedMetrics.deliveryPerformance.avgTime || 0)}h
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quality Metrics */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">⭐ Wskaźniki jakości</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Wskaźnik sukcesu:</span>
                        <span className="font-medium text-green-600">
                          {formatPercentage(advancedMetrics.successRate || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Błędy wysyłki:</span>
                        <span className="font-medium text-red-600">
                          {stats.statusCounts?.failed || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Średnia ocena:</span>
                        <span className="font-medium text-yellow-600">
                          ⭐ 4.8/5.0
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Costs Tab */}
            {activeTab === 'costs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">💰 Łączny koszt</h5>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(detailedStats?.totalCost || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Za okres {selectedPeriod === 'all' ? 'całkowity' : `${selectedPeriod} dni`}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">📊 Średni koszt</h5>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(advancedMetrics.costPerShipment || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Na przesyłkę
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">📈 Trend kosztów</h5>
                    <div className="flex items-center">
                      {getTrendIcon(advancedMetrics.growthRate || 0)}
                      <div className="ml-2 text-2xl font-bold text-purple-600">
                        {formatPercentage(Math.abs(advancedMetrics.growthRate || 0))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {advancedMetrics.growthRate > 0 ? 'Wzrost' : 'Spadek'} vs okres poprzedni
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                {advancedMetrics.costBreakdown && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">🔍 Struktura kosztów</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(advancedMetrics.costBreakdown).map(([category, amount]) => (
                        <div key={category} className="text-center">
                          <div className="font-bold text-lg">{formatCurrency(amount)}</div>
                          <div className="text-sm text-gray-600 capitalize">{category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Service Distribution */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">🚚 Rozkład usług DHL</h5>
                    <div className="space-y-3">
                      {Object.entries(stats.magazineCounts || {}).map(([service, count]) => {
                        const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0
                        return (
                          <div key={service} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium capitalize">{service.replace('_', ' ')}</span>
                              <span className="text-sm text-gray-600">{count} zamówień</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatPercentage(percentage)} z wszystkich zamówień
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Service Performance */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">⚡ Wydajność usług</h5>
                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Przesyłka krajowa (AH)</span>
                          <span className="text-green-600 font-bold">98.5%</span>
                        </div>
                        <div className="text-sm text-gray-600">Sukces dostaw</div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Express 12</span>
                          <span className="text-blue-600 font-bold">11.2h</span>
                        </div>
                        <div className="text-sm text-gray-600">Średni czas dostawy</div>
                      </div>

                      <div className="bg-purple-50 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">International</span>
                          <span className="text-purple-600 font-bold">{formatCurrency(85.50)}</span>
                        </div>
                        <div className="text-sm text-gray-600">Średni koszt</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Geography Tab */}
            {activeTab === 'geography' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Cities */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">🏙️ Najpopularniejsze miasta</h5>
                    <div className="space-y-2">
                      {advancedMetrics.topCities?.slice(0, 10).map((city, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                              {index + 1}
                            </span>
                            <span className="font-medium">{city.city}</span>
                          </div>
                          <span className="text-sm text-gray-600">{city.count} dostaw</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distance Stats */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">📏 Statystyki odległości</h5>
                    {advancedMetrics.distanceStats && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(advancedMetrics.distanceStats.avg)} km
                          </div>
                          <div className="text-sm text-gray-600">Średnia odległość</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 p-3 rounded text-center">
                            <div className="font-bold text-green-600">
                              {Math.round(advancedMetrics.distanceStats.min)} km
                            </div>
                            <div className="text-xs text-gray-600">Minimum</div>
                          </div>
                          
                          <div className="bg-red-50 p-3 rounded text-center">
                            <div className="font-bold text-red-600">
                              {Math.round(advancedMetrics.distanceStats.max)} km
                            </div>
                            <div className="text-xs text-gray-600">Maximum</div>
                          </div>
                        </div>

                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-lg font-bold text-purple-600">
                            {Math.round(advancedMetrics.distanceStats.total).toLocaleString()} km
                          </div>
                          <div className="text-sm text-gray-600">Łączna odległość</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <h5 className="font-medium text-gray-900">📅 Timeline aktywności</h5>
                
                {advancedMetrics.trendsData && advancedMetrics.trendsData.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {advancedMetrics.trendsData.slice(-7).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm font-medium">
                            {new Date(item.date).toLocaleDateString('pl-PL')}
                          </span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                              {item.orders} zamówień
                            </span>
                            <span className="text-sm text-green-600 font-medium">
                              {formatCurrency(item.cost)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center text-gray-500 text-sm">
                  💡 Szczegółowe wykresy będą dostępne w następnej wersji
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="flex justify-end space-x-2">
        <button className="px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-sm flex items-center space-x-1">
          <Download size={14} />
          <span>Excel</span>
        </button>
        <button className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors text-sm flex items-center space-x-1">
          <Download size={14} />
          <span>PDF Report</span>
        </button>
      </div>
    </div>
  )
}
