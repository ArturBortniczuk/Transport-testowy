// src/components/TransportRatingBadge.js
'use client'
import { useState, useEffect } from 'react'
import { Star, StarOff } from 'lucide-react'

export default function TransportDetailedRatingBadge({ transportId, refreshTrigger = 0, onCanBeRatedChange }) {
  const [rating, setRating] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRating = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/transport-detailed-ratings?transportId=${transportId}`)
        const data = await response.json()

        if (data.success) {
          const ratingData = {
            totalRatings: data.stats.totalRatings,
            overallPercentage: data.stats.overallRatingPercentage,
            canBeRated: data.canBeRated,
            hasUserRated: data.hasUserRated
          }
          setRating(ratingData)

          if (onCanBeRatedChange) {
            const hasRating = ratingData.totalRatings > 0
            const isPositive = hasRating
              ? ratingData.overallPercentage >= 50
              : null
            onCanBeRatedChange(ratingData.canBeRated, isPositive)
          }
        }
      } catch (error) {
        console.error('Błąd pobierania oceny:', error)
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
