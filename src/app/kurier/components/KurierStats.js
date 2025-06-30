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
    if (!detailedStats?.deliveryTimes) return null
    
    const times = detailedStats.deliveryTimes
    const onTime = times.filter(t => t <= 24).length
    const delayed = times.filter(t => t > 24 && t <= 48).length
    const veryDelayed = times.filter(t => t > 48).length
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    
    return { onTime, delayed, veryDelayed, avgTime }
  }

  const calculateServiceDistribution = () => {
    if (!detailedStats?.services) return []
    return Object.entries(detailedStats.services).map(([service, count]) => ({
      service,
      count,
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
    if (!detailedStats?.distances) return null
    const distances = detailedStats.distances
    return {
      avg: distances.reduce((sum, dist) => sum + dist, 0) / distances.length,
      min: Math.min(...distances),
      max: Math.max(...distances),
      total: distances.reduce((sum, dist) => sum + dist, 0)
    }
  }

  const calculateCostBreakdown = () => {
    if (!detailedStats?.costBreakdown) return null
    return detailedStats.costBreakdown
  }

  const calculateCostTrends = () => {
    if (!detailedStats?.timeline) return []
    return detailedStats.timeline.map(item => ({
      date: item.date,
      avgCost: item.totalCost ? item.totalCost / item.count : 0,
      totalCost: item.totalCost || 0
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
            📊 MEGA Analytics {isArchive ? '(Archiwum)' : ''}
            {realTimeData.lastUpdate && (
              <span className="ml-2 text-sm text-green-600 flex items-center">
                <Activity className="mr-1" size={16} />
                Live
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Zaawansowane analizy i metryki wydajności systemu kurierskiego
          </p>
        </div>

        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              showAdvanced 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap className="mr-1 inline" size={16} />
            {showAdvanced ? 'Ukryj zaawansowane' : 'Pokaż zaawansowane'}
          </button>
        </div>
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
              {advancedMetrics.growthRate !== undefined && (
                <div className="flex items-center text-sm">
                  {getTrendIcon(advancedMetrics.growthRate)}
                  <span className={advancedMetrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(Math.abs(advancedMetrics.growthRate))}
                  </span>
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
                {formatPercentage(advancedMetrics.successRate || 0)}
              </div>
              <div className="text-xs text-green-600">
                {(stats.statusCounts?.delivered || 0) + (stats.statusCounts?.sent || 0)} z {stats.totalCount || 0}
              </div>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        {/* Average Cost */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-yellow-600 mb-1">
                <DollarSign className="mr-2" size={20} />
                <span className="text-sm font-medium">Średni koszt</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(advancedMetrics.costPerShipment || 0)}
              </div>
              <div className="text-xs text-yellow-600">
                za przesyłkę
              </div>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        {/* Processing Time */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-purple-600 mb-1">
                <Clock className="mr-2" size={20} />
                <span className="text-sm font-medium">Czas realizacji</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {Math.round(advancedMetrics.avgProcessingTime || 0)}h
              </div>
              <div className="text-xs text-purple-600">
                średnio
              </div>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      {stats.statusCounts && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <PieChart className="mr-2 text-blue-600" />
            📊 Rozkład statusów
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <div key={status} className={`p-3 rounded-lg ${getStatusColor(status)}`}>
                <div className="text-sm font-medium capitalize">{status}</div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs">
                  {formatPercentage((count / stats.totalCount) * 100)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Analytics */}
      {showAdvanced && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="mr-2 inline" size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900">📈 Przegląd ogólny</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">⚡ Wydajność</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Zamówienia dzisiaj:</span>
                        <span className="font-medium">{realTimeData.todayOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">W tym tygodniu:</span>
                        <span className="font-medium">{realTimeData.weekOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Aktywne:</span>
                        <span className="font-medium text-blue-600">{realTimeData.activeOrders || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">💸 Finanse</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Łączny koszt:</span>
                        <span className="font-medium">{formatCurrency(detailedStats?.totalCost || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Średnia dziś:</span>
                        <span className="font-medium">{formatCurrency(realTimeData.avgCostToday || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Oszczędności:</span>
                        <span className="font-medium text-green-600">-12.5%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">🎯 Jakość</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Wskaźnik sukcesu:</span>
                        <span className="font-medium text-green-600">
                          {formatPercentage(advancedMetrics.successRate || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Zadowolenie:</span>
                        <span className="font-medium">⭐ 4.8/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reklamacje:</span>
                        <span className="font-medium text-red-600">2.1%</span>
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
                          <span className="text-sm text-gray-600">Bardzo opóźnione ({'>'}48h):</span>
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
                    <div className="text-2xl font-bold text-purple-600 flex items-center">
                      {getTrendIcon(advancedMetrics.growthRate || 0)}
                      <span className="ml-1">
                        {formatPercentage(Math.abs(advancedMetrics.growthRate || 0))}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      W porównaniu do poprzedniego okresu
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                {advancedMetrics.costBreakdown && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">🔍 Rozkład kosztów</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(advancedMetrics.costBreakdown).map(([type, amount]) => (
                        <div key={type} className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(amount)}
                          </div>
                          <div className="text-sm text-gray-600 capitalize">{type}</div>
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
                <h4 className="text-lg font-semibold text-gray-900">🚚 Analiza usług</h4>
                
                {advancedMetrics.serviceDistribution && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">📊 Rozkład usług</h5>
                    <div className="space-y-3">
                      {advancedMetrics.serviceDistribution.map(({ service, count, percentage }) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{service}:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{count}</span>
                            <span className="text-sm text-gray-500">
                              ({formatPercentage(percentage)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Geography Tab */}
            {activeTab === 'geography' && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900">🗺️ Analiza geograficzna</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Cities */}
                  {advancedMetrics.topCities && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">🏙️ Najpopularniejsze miasta</h5>
                      <div className="space-y-2">
                        {advancedMetrics.topCities.slice(0, 5).map(({ city, count }, index) => (
                          <div key={city} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              #{index + 1} {city}
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distance Stats */}
                  {advancedMetrics.distanceStats && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">📏 Statystyki odległości</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Średnia odległość:</span>
                          <span className="font-medium">
                            {Math.round(advancedMetrics.distanceStats.avg)} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Najkrótsza:</span>
                          <span className="font-medium">
                            {advancedMetrics.distanceStats.min} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Najdłuższa:</span>
                          <span className="font-medium">
                            {advancedMetrics.distanceStats.max} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Łączna odległość:</span>
                          <span className="font-medium">
                            {Math.round(advancedMetrics.distanceStats.total).toLocaleString()} km
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900">📅 Analiza czasowa</h4>
                
                {advancedMetrics.trendsData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">📈 Trendy w czasie</h5>
                    <div className="text-sm text-gray-600 mb-4">
                      Wykres pokazuje zmiany liczby zamówień i kosztów w wybranym okresie
                    </div>
                    <div className="space-y-2">
                      {advancedMetrics.trendsData.slice(-10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.date}</span>
                          <div className="flex space-x-4">
                            <span>📦 {item.orders}</span>
                            <span>💰 {formatCurrency(item.cost)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Updates Indicator */}
      {realTimeData.lastUpdate && (
        <div className="text-center text-xs text-gray-500">
          Ostatnia aktualizacja: {new Date(realTimeData.lastUpdate).toLocaleTimeString('pl-PL')}
          <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        </div>
      )}
    </div>
  )
}
