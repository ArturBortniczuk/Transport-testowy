// src/components/TransportRatingBadge.js - NAPRAWIONA WERSJA (używa istniejące API)
'use client'
import { useState, useEffect } from 'react'
import { Star, StarOff } from 'lucide-react'

export default function TransportRatingBadge({ transportId, refreshTrigger = 0, onCanBeRatedChange }) {
  const [rating, setRating] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRating = async () => {
      try {
        setLoading(true)
        // ZMIANA: używamy istniejące API transport-ratings zamiast transport-detailed-ratings
        const response = await fetch(`/api/transport-ratings?transportId=${transportId}`)
        const data = await response.json()

        if (data.success) {
          const ratingData = {
            totalRatings: data.stats.totalRatings,
            overallPercentage: data.stats.overallRatingPercentage,
            canBeRated: data.canBeRated,
            hasUserRated: data.hasUserRated
          }
          setRating(ratingData)

          // KLUCZOWA CZĘŚĆ - wywołujemy callback z informacją czy można ocenić
          if (onCanBeRatedChange) {
            console.log('TransportRatingBadge - wywołuję onCanBeRatedChange:', {
              transportId,
              canBeRated: ratingData.canBeRated,
              totalRatings: ratingData.totalRatings
            })
            
            const hasRating = ratingData.totalRatings > 0
            const isPositive = hasRating
              ? ratingData.overallPercentage >= 50
              : null
            
            // Wywołujemy callback - ZAWSZE po pobraniu danych
            onCanBeRatedChange(ratingData.canBeRated, isPositive)
          }
        }
      } catch (error) {
        console.error('Błąd pobierania oceny:', error)
        
        // W przypadku błędu też wywołujemy callback - może być nieoceniony transport
        if (onCanBeRatedChange) {
          console.log('TransportRatingBadge - błąd, wywołuję onCanBeRatedChange z true')
          onCanBeRatedChange(true, null) // Może być oceniony jeśli nie ma błędu w danych
        }
      } finally {
        setLoading(false)
      }
    }

    if (transportId) {
      fetchRating()
    }
  }, [transportId, refreshTrigger, onCanBeRatedChange])

  if (loading) {
    return (
      <div className="w-20 h-5 bg-gray-100 rounded animate-pulse"></div>
    )
  }

  if (!rating || rating.totalRatings === 0) {
    return (
      <span className="text-gray-400 text-sm flex items-center">
        <StarOff size={14} className="mr-1" />
        Brak oceny
      </span>
    )
  }

  const getColorClass = (percentage) => {
    if (percentage >= 80) return 'bg-green-500 text-white'
    if (percentage >= 60) return 'bg-yellow-500 text-white'
    if (percentage >= 40) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <div className="flex items-center">
      <div className={`flex items-center px-2 py-1 rounded-md text-sm font-medium ${getColorClass(rating.overallPercentage)}`}>
        <Star size={14} className="mr-1 fill-current" />
        {rating.overallPercentage}%
      </div>
      <span className="text-xs text-gray-500 ml-1">
        ({rating.totalRatings})
      </span>
    </div>
  )
}
