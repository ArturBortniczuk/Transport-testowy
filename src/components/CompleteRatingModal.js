// src/components/CompleteRatingModal.js - MODAL OCENY TRANSPORTU WŁASNEGO
'use client'
import { useState, useEffect } from 'react'
import { X, ThumbsUp, ThumbsDown, CheckCircle, AlertCircle, MessageSquare, Edit } from 'lucide-react'

export default function CompleteRatingModal({ transport, onClose, onSuccess }) {
  const [ratings, setRatings] = useState({
    driverProfessional: null,
    driverTasksCompleted: null,
    cargoComplete: null,
    cargoCorrect: null,
    deliveryNotified: null,
    deliveryOnTime: null
  })
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasMainRating, setHasMainRating] = useState(false)
  const [userHasRated, setUserHasRated] = useState(false)

  // Kategorie oceny
  const categories = [
    {
      id: 'driver',
      title: '👤 Kierowca',
      criteria: [
        { key: 'driverProfessional', text: 'Kulturalny i profesjonalny' },
        { key: 'driverTasksCompleted', text: 'Wykonał wszystkie zadania' }
      ]
    },
    {
      id: 'cargo',
      title: '📦 Towar',
      criteria: [
        { key: 'cargoComplete', text: 'Towar kompletny' },
        { key: 'cargoCorrect', text: 'Towar prawidłowy' }
      ]
    },
    {
      id: 'delivery',
      title: '🚚 Organizacja dostawy',
      criteria: [
        { key: 'deliveryNotified', text: 'Dostawa zgłoszona' },
        { key: 'deliveryOnTime', text: 'Dostawa na czas' }
      ]
    }
  ]

  useEffect(() => {
    fetchExistingRating()
  }, [transport.id])

  const fetchExistingRating = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transport-detailed-ratings?transportId=${transport.id}`)
      const data = await response.json()
      
      if (data.success) {
        setHasMainRating(data.stats.totalRatings > 0)
        setUserHasRated(data.hasUserRated)
        
        // Jeśli są jakiekolwiek oceny, załaduj pierwszą (lub ocenę użytkownika)
        if (data.allRatings && data.allRatings.length > 0) {
          // Znajdź ocenę użytkownika lub weź pierwszą
          const ratingToShow = data.rating || data.allRatings[0]
          
          setRatings({
            driverProfessional: ratingToShow.driver_professional,
            driverTasksCompleted: ratingToShow.driver_tasks_completed,
            cargoComplete: ratingToShow.cargo_complete,
            cargoCorrect: ratingToShow.cargo_correct,
            deliveryNotified: ratingToShow.delivery_notified,
            deliveryOnTime: ratingToShow.delivery_on_time
          })
          setComment(ratingToShow.comment || '')
        }
      }
    } catch (error) {
      console.error('Błąd pobierania oceny:', error)
      setError('Nie udało się pobrać istniejącej oceny')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Sprawdź czy wszystkie kryteria są wypełnione
    const allRated = Object.values(ratings).every(rating => rating !== null)
    if (!allRated) {
      setError('Proszę ocenić wszystkie kryteria')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/transport-detailed-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportId: transport.id,
          ratings,
          comment
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          if (onSuccess) onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(data.error || 'Wystąpił błąd podczas zapisywania oceny')
      }
    } catch (error) {
      console.error('Błąd zapisywania oceny:', error)
      setError('Wystąpił błąd podczas zapisywania oceny')
    } finally {
      setSubmitting(false)
    }
  }

  const RatingButton = ({ criteriaKey, value, label, readOnly = false }) => {
    const baseClasses = "flex items-center px-3 py-2 rounded-md border text-sm font-medium transition-colors"
    const isSelected = ratings[criteriaKey] === value
    
    if (readOnly) {
      const readOnlyClasses = value !== null 
        ? (value ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")
        : "bg-gray-50 text-gray-400 border-gray-200"
      
      return (
        <div className={`${baseClasses} ${readOnlyClasses} cursor-not-allowed`}>
          {value ? <ThumbsUp size={16} className="mr-1" /> : <ThumbsDown size={16} className="mr-1" />}
          {label}
        </div>
      )
    }
    
    const selectedClasses = value 
      ? "bg-green-100 text-green-700 border-green-300"
      : "bg-red-100 text-red-700 border-red-300"
    const unselectedClasses = "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
    
    return (
      <button
        type="button"
        onClick={() => setRatings(prev => ({ ...prev, [criteriaKey]: value }))}
        className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
      >
        {value ? <ThumbsUp size={16} className="mr-1" /> : <ThumbsDown size={16} className="mr-1" />}
        {label}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {!hasMainRating 
                  ? 'Oceń transport' 
                  : (isEditMode ? 'Edytuj ocenę transportu' : 'Ocena transportu')
                }
              </h2>
              <p className="text-gray-600 mt-1">
                {transport.destination_city} - {transport.client_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Komunikaty */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md flex items-center">
              <CheckCircle size={16} className="mr-2" />
              {userHasRated ? 'Ocena została zaktualizowana!' : 'Ocena została zapisana!'}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {error}
            </div>
          )}

          {/* Wyświetlanie istniejącej oceny */}
          {hasMainRating && !isEditMode && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">
                ⭐ Transport został oceniony
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {categories.map(category => (
                  <div key={category.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-sm mb-3 text-gray-800">{category.title}</h4>
                    {category.criteria.map(criteria => {
                      const ratingValue = ratings[criteria.key]
                      
                      if (ratingValue === null || ratingValue === undefined) {
                        return (
                          <div key={criteria.key} className="flex items-center justify-between text-sm mb-2 p-2 bg-gray-50 rounded">
                            <span className="text-gray-500 text-xs">{criteria.text}</span>
                            <span className="text-gray-400 text-xs">Brak oceny</span>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={criteria.key} className={`flex items-center justify-between text-sm mb-2 p-2 rounded ${
                          ratingValue ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <span className="text-gray-700 text-xs flex-1 mr-2">{criteria.text}</span>
                          <div className="flex items-center">
                            {ratingValue ? (
                              <>
                                <ThumbsUp size={14} className="text-green-600 mr-1" />
                                <span className="text-green-700 text-xs font-medium">TAK</span>
                              </>
                            ) : (
                              <>
                                <ThumbsDown size={14} className="text-red-600 mr-1" />
                                <span className="text-red-700 text-xs font-medium">NIE</span>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {comment && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                  <h5 className="font-medium text-sm text-blue-800 mb-2">💬 Komentarz:</h5>
                  <p className="text-gray-700 text-sm italic">"{comment}"</p>
                </div>
              )}

              {userHasRated && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mt-4"
                >
                  <Edit size={16} className="mr-2" />
                  Edytuj swoją ocenę
                </button>
              )}
            </div>
          )}

          {/* Formularz oceny */}
          {(!hasMainRating || isEditMode) && (
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {userHasRated ? 'Edytuj swoją ocenę' : 'Oceń transport według kryteriów'}
                </h3>
                
                <div className="space-y-6">
                  {categories.map(category => (
                    <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-gray-800">{category.title}</h4>
                      
                      {category.criteria.map(criteria => (
                        <div key={criteria.key} className="mb-3 last:mb-0">
                          <p className="text-sm text-gray-700 mb-2">{criteria.text}</p>
                          <div className="flex space-x-2">
                            <RatingButton
                              criteriaKey={criteria.key}
                              value={true}
                              label="TAK"
                            />
                            <RatingButton
                              criteriaKey={criteria.key}
                              value={false}
                              label="NIE"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Komentarz */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="inline w-4 h-4 mr-1" />
                  Komentarz (opcjonalnie)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="Dodaj komentarz do oceny..."
                />
              </div>

              {/* Przyciski */}
              <div className="flex justify-end space-x-3">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Anuluj
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Zapisywanie...' : (userHasRated ? 'Aktualizuj ocenę' : 'Zapisz ocenę')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}