'use client'
import { useState, useEffect } from 'react'
import { Package, Clock, CheckCircle, TrendingUp, Building } from 'lucide-react'

export default function KurierStats({ isArchive = false }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kurier/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Błąd pobierania statystyk:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
    )
  }

  if (!stats) return null

  const statCards = isArchive ? [
    {
      title: 'Zatwierdzone',
      value: stats.statusCounts.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Wysłane',
      value: stats.statusCounts.sent,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Dostarczone',
      value: stats.statusCounts.delivered,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Łącznie w archiwum',
      value: stats.archivedCount,
      icon: TrendingUp,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ] : [
    {
      title: 'Aktywne zamówienia',
      value: stats.activeCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'W archiwum',
      value: stats.archivedCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ostatnie 30 dni',
      value: stats.last30DaysCount,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Łącznie',
      value: stats.totalCount,
      icon: Package,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ]

  return (
    <div className="mb-6">
      {/* Główne statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {statCards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <IconComponent className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-600">{card.title}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Statystyki według magazynów */}
      {Object.keys(stats.magazineCounts).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <Building className="w-5 h-5 mr-2 text-gray-600" />
            Zamówienia według magazynów
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.magazineCounts).map(([magazyn, count]) => (
              <div key={magazyn} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {magazyn.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
