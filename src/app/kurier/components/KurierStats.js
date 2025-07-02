// src/app/kurier/components/KurierStats.js
// 🎨 KURIER STATS - Wizualnie ulepszony z polskimi napisami
'use client'
import { useState, useEffect } from 'react'
import { 
  Package, Clock, CheckCircle, TrendingUp, Building, DollarSign,
  Calendar, Truck, BarChart3, Activity, RefreshCw, 
  ArrowUp, ArrowDown, Minus, AlertTriangle, Star, Target,
  Award, Zap, Eye, Download
} from 'lucide-react'

export default function KurierStats({ isArchive = false, refreshTrigger = 0 }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [isArchive, refreshTrigger])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = `/api/kurier/stats`
      console.log('📊 Pobieranie statystyk z:', url)
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      const data = await response.json()
      console.log('📊 Odpowiedź statystyk:', data)
      
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

  const getStatusInfo = (status) => {
    const statusMap = {
      'new': {
        label: 'Nowe',
        color: 'from-yellow-400 to-yellow-600',
        textColor: 'text-yellow-800',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        emoji: '🆕',
        description: 'Oczekują na zatwierdzenie'
      },
      'approved': {
        label: 'Zatwierdzone',
        color: 'from-green-400 to-green-600',
        textColor: 'text-green-800',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '✅',
        description: 'Gotowe do wysyłki'
      },
      'sent': {
        label: 'Wysłane',
        color: 'from-blue-400 to-blue-600',
        textColor: 'text-blue-800',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        emoji: '🚚',
        description: 'W trakcie dostawy'
      },
      'delivered': {
        label: 'Dostarczone',
        color: 'from-purple-400 to-purple-600',
        textColor: 'text-purple-800',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        emoji: '📦',
        description: 'Pomyślnie dostarczone'
      }
    }
    return statusMap[status] || statusMap['new']
  }

  const calculateSuccessRate = () => {
    if (!stats || !stats.statusCounts) return 0
    const total = stats.totalCount || 0
    const successful = (stats.statusCounts.delivered || 0) + (stats.statusCounts.sent || 0)
    return total > 0 ? (successful / total) * 100 : 0
  }

  const getSuccessRateColor = (rate) => {
    if (rate >= 80) return 'from-green-400 to-green-600'
    if (rate >= 60) return 'from-yellow-400 to-yellow-600'
    if (rate >= 40) return 'from-orange-400 to-orange-600'
    return 'from-red-400 to-red-600'
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full">
            <RefreshCw className="animate-spin text-blue-600 mr-2" size={20} />
            <span className="text-blue-800 font-medium">Ładowanie statystyk...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full mb-4"></div>
                <div className="w-20 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2"></div>
                <div className="w-32 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-bold text-red-800">Błąd ładowania statystyk</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button 
              onClick={fetchStats}
              className="mt-3 inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
            >
              <RefreshCw className="mr-2" size={16} />
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
    <div className="mb-8 space-y-8">
      {/* Header z animowanym tłem */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-x-20 -translate-y-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full translate-x-16 translate-y-16 animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                  <BarChart3 className="text-white" size={28} />
                </div>
                📊 Statystyki Kurierskie
                {isArchive && <span className="ml-3 text-blue-200">(Archiwum)</span>}
              </h2>
              <p className="text-blue-100 mt-2 text-lg">
                Kompleksowy przegląd zamówień i wskaźników wydajności
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <Eye className="mr-2" size={18} />
                {showDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
              </button>
              
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-200 backdrop-blur-sm disabled:opacity-50"
              >
                <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={18} />
                Odśwież
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Główne statystyki - karty z animacjami */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Łączne zamówienia */}
        <div className="group bg-white rounded-2xl shadow-lg border-2 border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-1">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <Package className="text-white" size={28} />
                </div>
                <div className="text-4xl">📦</div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  Łączne zamówienia
                </h3>
                <div className="text-3xl font-bold text-blue-900">
                  {stats.totalCount || 0}
                </div>
                
                {stats.growthPercentage !== undefined && (
                  <div className="flex items-center text-sm">
                    {getTrendIcon(stats.growthPercentage)}
                    <span className={`ml-1 font-medium ${stats.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(Math.abs(stats.growthPercentage))}
                    </span>
                    <span className="text-gray-500 ml-1">vs poprzedni miesiąc</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wskaźnik sukcesu */}
        <div className="group bg-white rounded-2xl shadow-lg border-2 border-green-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className={`bg-gradient-to-r ${getSuccessRateColor(successRate)} p-1`}>
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 bg-gradient-to-r ${getSuccessRateColor(successRate)} rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                  <Target className="text-white" size={28} />
                </div>
                <div className="text-4xl">🎯</div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                  Wskaźnik sukcesu
                </h3>
                <div className="text-3xl font-bold text-green-900">
                  {formatPercentage(successRate)}
                </div>
                <div className="text-xs text-green-600">
                  {(stats.statusCounts?.delivered || 0) + (stats.statusCounts?.sent || 0)} z {stats.totalCount || 0} pomyślnie
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className={`bg-gradient-to-r ${getSuccessRateColor(successRate)} h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aktywne zamówienia */}
        <div className="group bg-white rounded-2xl shadow-lg border-2 border-yellow-100 hover:border-yellow-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-1">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <Activity className="text-white" size={28} />
                </div>
                <div className="text-4xl">⚡</div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">
                  Aktywne zamówienia
                </h3>
                <div className="text-3xl font-bold text-yellow-900">
                  {stats.activeCount || 0}
                </div>
                <div className="text-xs text-yellow-600">
                  Oczekują na realizację
                </div>
                
                {stats.activeCount > 0 && (
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-xs text-yellow-700">Wymagają uwagi</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wydajność dostaw */}
        <div className="group bg-white rounded-2xl shadow-lg border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-400 to-purple-600 p-1">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <Clock className="text-white" size={28} />
                </div>
                <div className="text-4xl">⏱️</div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
                  Wydajność dostaw
                </h3>
                <div className="text-3xl font-bold text-purple-900">
                  {stats.deliveryRate || 0}%
                </div>
                <div className="text-xs text-purple-600">
                  {stats.avgDeliveryHours ? `${stats.avgDeliveryHours}h średnio` : 'Wskaźnik realizacji'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Szczegółowe statystyki */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          
          {/* Rozkład statusów */}
          {stats.statusCounts && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <BarChart3 className="mr-2" size={24} />
                  📊 Rozkład statusów
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {Object.entries(stats.statusCounts).map(([status, count]) => {
                  const statusInfo = getStatusInfo(status)
                  const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0
                  
                  return (
                    <div key={status} className={`group p-4 rounded-xl border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} hover:shadow-md transition-all duration-200`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 bg-gradient-to-r ${statusInfo.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200`}>
                            <span className="text-white text-xl">{statusInfo.emoji}</span>
                          </div>
                          <div>
                            <div className={`font-bold text-lg ${statusInfo.textColor}`}>
                              {statusInfo.label}
                            </div>
                            <div className="text-sm text-gray-600">
                              {statusInfo.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-500">
                            {formatPercentage(percentage)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mini progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-3">
                        <div 
                          className={`bg-gradient-to-r ${statusInfo.color} h-1 rounded-full transition-all duration-1000`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Statystyki czasowe */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Calendar className="mr-2" size={24} />
                📅 Statystyki czasowe
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                
                <div className="group p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">📅</span>
                      </div>
                      <span className="font-medium text-blue-800">Ostatnie 7 dni</span>
                    </div>
                    <div className="text-xl font-bold text-blue-900">
                      {stats.last7DaysCount || 0}
                    </div>
                  </div>
                </div>
                
                <div className="group p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">📊</span>
                      </div>
                      <span className="font-medium text-green-800">Ostatnie 30 dni</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">
                      {stats.last30DaysCount || 0}
                    </div>
                  </div>
                </div>
                
                <div className="group p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">🗓️</span>
                      </div>
                      <span className="font-medium text-purple-800">Ten miesiąc</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">
                      {stats.thisMonthCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rozkład według magazynów - tylko jeśli są dane */}
      {stats.magazineCounts && Object.keys(stats.magazineCounts).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-700 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Building className="mr-2" size={24} />
              🏢 Rozkład według magazynów
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stats.magazineCounts).map(([magazine, count]) => {
                const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0
                
                return (
                  <div key={magazine} className="group p-4 bg-teal-50 border-2 border-teal-200 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-teal-600 rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                          <Building className="text-white" size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-teal-800">{magazine}</div>
                          <div className="text-sm text-teal-600">Magazyn</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-teal-900">{count}</div>
                        <div className="text-sm text-teal-600">{formatPercentage(percentage)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer z meta informacjami */}
      <div className="text-center">
        <div className="inline-flex items-center px-6 py-3 bg-gray-50 border-2 border-gray-200 rounded-full">
          <Clock className="mr-2 text-gray-500" size={16} />
          <span className="text-sm text-gray-600">
            Ostatnia aktualizacja: {stats.meta ? new Date(stats.meta.generatedAt).toLocaleString('pl-PL') : 'Nieznana'}
          </span>
        </div>
        
        {stats.meta?.note && (
          <div className="mt-3 inline-flex items-center px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-600 text-sm">ℹ️ {stats.meta.note}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// CSS dla animacji fadeIn
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
`

// Wstrzyknij style do head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  if (!document.head.querySelector('style[data-kurier-stats]')) {
    styleSheet.setAttribute('data-kurier-stats', 'true')
    document.head.appendChild(styleSheet)
  }
}
