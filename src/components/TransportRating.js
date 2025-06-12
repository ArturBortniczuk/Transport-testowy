// src/components/TransportRating.js - NAPRAWIONA WERSJA
'use client'
import { useState, useEffect } from 'react'
import { 
  X, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Truck, 
  Package, 
  Calendar, 
  MessageSquare 
} from 'lucide-react'

export default function TransportRating({ transportId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Stan formularza oceny
  const [ratings, setRatings] = useState({
    driverProfessional: null,
    driverTasksCompleted: null,
    cargoComplete: null,
    cargoCorrect: null,
    deliveryNotified: null,
    deliveryOnTime: null
  })
  const [comment, setComment] = useState('')

  // Kategorie ocen
  const categories = [
    {
      id: 'driver',
      icon: <Truck size={24} className="text-blue-600" />,
      title: '👨‍💼 Kierowca',
      criteria: [
        {
          key: 'driverProfessional',
          text: 'Kierowca zachował się profesjonalnie wobec klienta.'
        },
        {
          key: 'driverTasksCompleted',
          text: 'Kierowca zrealizował wszystkie ustalone zadania.'
        }
      ]
    },
    {
      id: 'cargo',
      icon: <Package size={24} className="text-green-600" />,
      title: '📦 Towar',
      criteria: [
        {
          key: 'cargoComplete',
          text: 'Towar był kompletny i zgodny z zamówieniem.'
        },
        {
          key: 'cargoCorrect',
          text: 'Nie doszło do pomyłki – klient dostał właściwy towar.'
        }
      ]
    },
    {
      id: 'delivery',
      icon: <Calendar size={24} className="text-purple-600" />,
      title: '📦 Organizacja dostawy',
      criteria: [
        {
          key: 'deliveryNotified',
          text: 'Dostawa została wcześniej awizowana u klienta.'
        },
        {
          key: 'deliveryOnTime',
          text: 'Towar dotarł w ustalonym terminie.'
        }
      ]
    }
  ]

  // Pobierz dane o ocenach
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/transport-ratings?transportId=${transportId}`)
        const result = await response.json()
        
        if (result.success) {
          setData(result)
          
          // Jeśli użytkownik już ocenił, wypełnij formularz
          if (result.userRating) {
            setRatings(result.userRating.ratings)
            setComment(result.userRating.comment || '')
          }
        } else {
          setError(result.error)
        }
      } catch (error) {
        console.error('Błąd pobierania ocen:', error)
        setError('Wystąpił błąd podczas pobierania ocen')
      } finally {
        setLoading(false)
      }
    }
    
    if (transportId) {
      fetchData()
    }
  }, [transportId])

  // Funkcja wysyłająca ocenę
  const handleSubmitRating = async (e) => {
    e.preventDefault()
    
    // Sprawdź czy wszystkie kryteria zostały ocenione
    const allRated = Object.values(ratings).every(rating => rating !== null)
    if (!allRated) {
      setSubmitError('Oceń wszystkie kryteria przed wysłaniem')
      return
    }
    
    try {
      setSubmitting(true)
      setSubmitError(null)
      
      const response = await fetch('/api/transport-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportId,
          ratings,
          comment: comment.trim()
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSubmitSuccess(true)
        
        // Odśwież dane
        const refreshResponse = await fetch(`/api/transport-ratings?transportId=${transportId}`)
        const refreshResult = await refreshResponse.json()
        
        if (refreshResult.success) {
          setData(refreshResult)
        }
        
        setTimeout(() => {
          setSubmitSuccess(false)
          onClose() // Zamknij modal po udanym dodaniu oceny
        }, 2000)
      } else {
        setSubmitError(result.error)
      }
    } catch (error) {
      console.error('Błąd wysyłania oceny:', error)
      setSubmitError('Wystąpił błąd podczas wysyłania oceny')
    } finally {
      setSubmitting(false)
    }
  }

  // Funkcja renderująca przycisk oceny
  const renderRatingButton = (criteriaKey, value, label) => {
    const isSelected = ratings[criteriaKey] === value
    const baseClasses = "flex items-center justify-center px-3 py-2 rounded-md transition-colors text-sm font-medium"
    const selectedClasses = value 
      ? "bg-green-100 text-green-800 border-2 border-green-300" 
      : "bg-red-100 text-red-800 border-2 border-red-300"
    const unselectedClasses = "bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100"
    
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Oceń transport</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            {error}
          </div>
        ) : (
          <>
            {/* Formularz oceny - dla użytkowników którzy mogą ocenić */}
            {data?.canBeRated && !data?.hasUserRated && (
              <div className="mb-8">
                <form onSubmit={handleSubmitRating} className="space-y-6">
                  {categories.map(category => (
                    <div key={category.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center mb-4">
                        {category.icon}
                        <h4 className="font-medium text-lg ml-2">{category.title}</h4>
                      </div>
                      
                      {category.criteria.map(criteria => (
                        <div key={criteria.key} className="mb-4">
                          <p className="text-gray-700 mb-2">{criteria.text}</p>
                          <div className="flex space-x-2">
                            {renderRatingButton(criteria.key, true, 'Tak')}
                            {renderRatingButton(criteria.key, false, 'Nie')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                      Dodatkowy komentarz (opcjonalnie)
                    </label>
                    <textarea
                      id="comment"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Podziel się swoją opinią na temat tego transportu..."
                    />
                  </div>
                  
                  {submitError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
                      {submitError}
                    </div>
                  )}
                  
                  {submitSuccess && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-sm">
                      Twoja ocena została zapisana!
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {submitting ? 'Zapisywanie...' : 'Zapisz ocenę'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Informacja dla transportów, które nie mogą być ocenione */}
            {!data?.canBeRated && (
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-6">
                <p>Ten transport nie może być obecnie oceniony.</p>
                <p className="text-sm mt-1">Transport można ocenić dopiero po jego ukończeniu.</p>
              </div>
            )}

            {/* Informacja o tym, że użytkownik już ocenił */}
            {data?.hasUserRated && (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
                <p>Już oceniłeś ten transport.</p>
                <p className="text-sm mt-1">Każdy transport można ocenić tylko raz.</p>
              </div>
            )}

            {/* Lista wszystkich ocen - BEZ anonimizacji */}
            {data?.ratings?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-4">Wszystkie oceny</h3>
                <div className="space-y-4">
                  {data.ratings.map((rating, index) => (
                    <div key={rating.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm text-gray-600">
                          Oceniono przez: {rating.raterEmail}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(rating.ratedAt).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {categories.map(category => (
                        <div key={category.id} className="mb-4">
                          <h5 className="font-medium text-sm mb-2 flex items-center">
                            {category.icon}
                            <span className="ml-1">{category.title}</span>
                          </h5>
                          
                          {category.criteria.map(criteria => {
                            const ratingValue = rating.ratings[criteria.key]
                            if (ratingValue === null || ratingValue === undefined) return null
                            
                            return (
                              <div key={criteria.key} className="flex items-center justify-between text-sm mb-1 pl-6">
                                <span className="text-gray-600">{criteria.text}</span>
                                <div className="flex items-center">
                                  {ratingValue ? (
                                    <ThumbsUp size={14} className="text-green-600" />
                                  ) : (
                                    <ThumbsDown size={14} className="text-red-600" />
                                  )}
                                  <span className={`ml-1 text-xs ${ratingValue ? 'text-green-600' : 'text-red-600'}`}>
                                    {ratingValue ? 'Tak' : 'Nie'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                      
                      {rating.comment && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-start">
                            <MessageSquare size={16} className="text-gray-400 mt-1 mr-2" />
                            <p className="text-gray-700 text-sm">{rating.comment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brak ocen */}
            {data?.stats?.totalRatings === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Ten transport nie został jeszcze oceniony.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
