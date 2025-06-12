// src/components/TransportRating.js - POPRAWIONA LOGIKA OCENIANIA
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
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Edit,
  Save
} from 'lucide-react'

export default function TransportRating({ transportId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
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
          
          // Jeśli użytkownik już ocenił, wypełnij formularz i włącz tryb edycji
          if (result.hasUserRated && result.userRating) {
            setRatings(result.userRating.ratings)
            setComment(result.userRating.comment || '')
            setIsEditMode(false) // Rozpocznij w trybie tylko do odczytu
          } else {
            // Jeśli nie ocenił, od razu tryb edycji
            setIsEditMode(true)
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
        setIsEditMode(false) // Przejdź w tryb tylko do odczytu
        
        // Odśwież dane
        const refreshResponse = await fetch(`/api/transport-ratings?transportId=${transportId}`)
        const refreshResult = await refreshResponse.json()
        
        if (refreshResult.success) {
          setData(refreshResult)
        }
        
        setTimeout(() => {
          setSubmitSuccess(false)
          onClose() // Zamknij modal po udanym zapisaniu
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
    const baseClasses = "flex items-center justify-center px-3 py-2 rounded-md transition-colors text-sm font-medium border"
    
    if (!isEditMode) {
      // Tryb tylko do odczytu - przyciski nieaktywne
      const readOnlyClasses = isSelected 
        ? (value ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")
        : "bg-gray-50 text-gray-400 border-gray-200"
      
      return (
        <div className={`${baseClasses} ${readOnlyClasses} cursor-not-allowed`}>
          {value ? <ThumbsUp size={16} className="mr-1" /> : <ThumbsDown size={16} className="mr-1" />}
          {label}
        </div>
      )
    }
    
    // Tryb edycji - przyciski aktywne
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {data?.hasUserRated 
            ? (isEditMode ? 'Edytuj ocenę transportu' : 'Twoja ocena transportu') 
            : 'Oceń transport'
          }
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Komunikaty */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md flex items-center">
          <CheckCircle size={16} className="mr-2" />
          Ocena została zapisana pomyślnie!
        </div>
      )}

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {submitError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* Informacja dla transportów, które nie mogą być ocenione */}
          {!data?.canBeRated && !data?.hasUserRated && (
            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-6">
              <p>Ten transport nie może być obecnie oceniony.</p>
              <p className="text-sm mt-1">Transport można ocenić dopiero po jego ukończeniu.</p>
            </div>
          )}

          {/* Panel kontrolny dla użytkownika który już ocenił */}
          {data?.hasUserRated && (
            <div className="bg-blue-50 p-4 rounded-md mb-6 flex items-center justify-between">
              <div>
                <p className="text-blue-700 font-medium">
                  {isEditMode ? 'Edytujesz swoją ocenę' : 'Przeglądasz swoją ocenę'}
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  {isEditMode ? 'Wprowadź zmiany i zapisz' : 'Kliknij "Edytuj" aby wprowadzić zmiany'}
                </p>
              </div>
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit size={16} className="mr-1" />
                  Edytuj
                </button>
              )}
            </div>
          )}

          {/* Formularz oceny */}
          {(data?.canBeRated || data?.hasUserRated) && (
            <div className="mb-8">
              {!data?.hasUserRated && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md">
                  <p className="text-sm">
                    <strong>Instrukcja:</strong> Oceń każde kryterium jako "Tak" lub "Nie". 
                    Wszystkie pola są wymagane.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitRating} className="space-y-6">
                {categories.map(category => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      {category.icon}
                      <span className="ml-2">{category.title}</span>
                    </h3>
                    
                    {category.criteria.map(criteria => (
                      <div key={criteria.key} className="mb-4 last:mb-0">
                        <p className="text-gray-700 mb-3">{criteria.text}</p>
                        <div className="flex space-x-3">
                          {renderRatingButton(criteria.key, true, 'Tak')}
                          {renderRatingButton(criteria.key, false, 'Nie')}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Pole komentarza */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dodatkowy komentarz (opcjonalny)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    disabled={!isEditMode}
                    className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isEditMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
                    }`}
                    placeholder="Opisz szczegóły transportu, problemy lub pozytywne aspekty..."
                  />
                </div>
                
                {/* Przyciski akcji */}
                <div className="flex justify-end space-x-3">
                  {isEditMode && (
                    <>
                      {data?.hasUserRated && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditMode(false)
                            // Przywróć oryginalne wartości
                            if (data.userRating) {
                              setRatings(data.userRating.ratings)
                              setComment(data.userRating.comment || '')
                            }
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Anuluj
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Save size={16} className="mr-1" />
                        {submitting ? 'Zapisywanie...' : (data?.hasUserRated ? 'Zapisz zmiany' : 'Zapisz ocenę')}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Lista wszystkich ocen - BEZ anonimizacji */}
          {data?.ratings?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-4">Wszystkie oceny ({data.ratings.length})</h3>
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
  )
}
