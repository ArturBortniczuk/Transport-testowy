// src/app/spedycja/components/RouteVisualization.js
'use client'
import { MapPin, Truck, Package, Clock, ArrowRight } from 'lucide-react'

export default function RouteVisualization({ 
  routeSequence = [], 
  showControls = false, 
  onMovePoint = null,
  className = ""
}) {
  
  // Grupuj punkty według transportu
  const groupedRoute = routeSequence.reduce((acc, point, index) => {
    if (!acc[point.transportId]) {
      acc[point.transportId] = []
    }
    acc[point.transportId].push({ ...point, originalIndex: index })
    return acc
  }, {})

  const getPointIcon = (type) => {
    switch (type) {
      case 'loading':
        return <Package size={16} className="text-green-600" />
      case 'unloading':
        return <MapPin size={16} className="text-red-600" />
      default:
        return <Truck size={16} className="text-blue-600" />
    }
  }

  const getPointColor = (type) => {
    switch (type) {
      case 'loading':
        return 'border-green-200 bg-green-50'
      case 'unloading':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  const formatTime = (index) => {
    // Symulacja czasów - można to rozwinąć w przyszłości
    const baseTime = new Date()
    baseTime.setHours(8, 0) // Start o 8:00
    baseTime.setMinutes(baseTime.getMinutes() + (index * 60)) // Co godzinę
    return baseTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }

  if (routeSequence.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Truck size={48} className="mx-auto mb-4 text-gray-300" />
        <p>Brak punktów trasy do wyświetlenia</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Nagłówek z podsumowaniem */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <Truck size={20} className="text-blue-600" />
          <h3 className="font-semibold text-blue-900">Sekwencja trasy</h3>
        </div>
        <div className="text-sm text-blue-700">
          <span className="font-medium">{routeSequence.length}</span> punkt{routeSequence.length > 1 ? 'ów' : ''} 
          {Object.keys(groupedRoute).length > 1 && (
            <span> • <span className="font-medium">{Object.keys(groupedRoute).length}</span> transport{Object.keys(groupedRoute).length > 1 ? 'ów' : ''}</span>
          )}
        </div>
      </div>

      {/* Wizualizacja trasy */}
      <div className="relative">
        {routeSequence.map((point, index) => (
          <div key={point.id} className="relative">
            
            {/* Punkt trasy */}
            <div className={`flex items-start gap-4 p-4 border rounded-lg ${getPointColor(point.type)} transition-all duration-200 hover:shadow-md`}>
              
              {/* Numer kolejny i ikona */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-300 rounded-full font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="mt-2">
                  {getPointIcon(point.type)}
                </div>
              </div>

              {/* Informacje o punkcie */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {point.type === 'loading' ? 'Załadunek' : 'Rozładunek'}
                  </span>
                  <span className="text-sm text-gray-600">•</span>
                  <span className="text-sm font-medium text-gray-700">
                    {point.city}
                  </span>
                  {point.mpk && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                      MPK: {point.mpk}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div className="font-medium">{point.company}</div>
                  {point.address && (
                    <div className="text-xs">{point.address}</div>
                  )}
                  {point.contact && (
                    <div className="text-xs">Kontakt: {point.contact}</div>
                  )}
                </div>
              </div>

              {/* Szacowany czas */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={14} />
                  <span>{formatTime(index)}</span>
                </div>
                
                {/* Kontrolki do zmiany kolejności */}
                {showControls && onMovePoint && (
                  <div className="flex flex-col gap-1 mt-2">
                    <button
                      onClick={() => onMovePoint(index, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded text-xs ${
                        index === 0 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-white hover:shadow-sm'
                      }`}
                      title="Przenieś wyżej"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => onMovePoint(index, 'down')}
                      disabled={index === routeSequence.length - 1}
                      className={`p-1 rounded text-xs ${
                        index === routeSequence.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-white hover:shadow-sm'
                      }`}
                      title="Przenieś niżej"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Strzałka do następnego punktu */}
            {index < routeSequence.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight size={20} className="text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Podsumowanie na końcu */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Punkty załadunku:</span>
            <div className="font-semibold">
              {routeSequence.filter(p => p.type === 'loading').length}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Punkty rozładunku:</span>
            <div className="font-semibold">
              {routeSequence.filter(p => p.type === 'unloading').length}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Szac. czas:</span>
            <div className="font-semibold">
              {Math.round(routeSequence.length * 0.75)}h
            </div>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <div className="font-semibold text-green-600">
              Gotowa do realizacji
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
