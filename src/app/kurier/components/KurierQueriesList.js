'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, User, MapPin, Package, Calendar, DollarSign, CheckCircle, XCircle, Clock, Download, Eye } from 'lucide-react'

export default function KurierQueriesList({ 
  queries, 
  onApprove, 
  onReject, 
  userPermissions,
  loading,
  onRefresh
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [processingQuery, setProcessingQuery] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nie podano'
    return new Date(dateString).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'new':
        return <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 flex items-center">
          <Clock size={16} className="mr-1" />
          Oczekuje
        </span>
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 flex items-center">
          <CheckCircle size={16} className="mr-1" />
          Zaakceptowane
        </span>
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 flex items-center">
          <XCircle size={16} className="mr-1" />
          Odrzucone
        </span>
      default:
        return <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getQueryTypeIcon = (type) => {
    switch(type) {
      case 'pickup':
        return { icon: '📦', label: 'Odbiór', color: 'text-blue-600' }
      case 'delivery':
        return { icon: '🚚', label: 'Dostawa', color: 'text-green-600' }
      case 'info':
        return { icon: '❓', label: 'Pytanie', color: 'text-purple-600' }
      default:
        return { icon: '📋', label: 'Zapytanie', color: 'text-gray-600' }
    }
  }

  const getPriorityBadge = (priority, isUrgent) => {
    if (isUrgent) {
      return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-medium">🚨 PILNE</span>
    }
    
    switch(priority) {
      case 'high':
        return <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">Wysoki</span>
      case 'normal':
        return <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Normalny</span>
      case 'low':
        return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Niski</span>
      default:
        return null
    }
  }

  const handleApprove = async (queryId) => {
    const notes = prompt('Opcjonalne uwagi do akceptacji:')
    if (notes !== null) { // null = anulowano, '' = puste ale OK
      setProcessingQuery(queryId)
      try {
        await onApprove(queryId, notes)
      } finally {
        setProcessingQuery(null)
      }
    }
  }

  const handleReject = async (queryId) => {
    const reason = prompt('Podaj powód odrzucenia zapytania:')
    if (reason && reason.trim()) {
      setProcessingQuery(queryId)
      try {
        await onReject(queryId, reason)
      } finally {
        setProcessingQuery(null)
      }
    } else if (reason !== null) {
      alert('Powód odrzucenia jest wymagany')
    }
  }

  const downloadLabel = (dhlData) => {
    if (dhlData && dhlData.labelUrl) {
      window.open(dhlData.labelUrl, '_blank')
    } else {
      alert('Etykieta nie jest dostępna')
    }
  }

  if (loading && queries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie zapytań...</span>
        </div>
      </div>
    )
  }

  if (queries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <HelpCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Brak zapytań kurierskich</p>
          <p className="text-sm mt-2">Dodaj pierwsze zapytanie korzystając z przycisku powyżej</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Zapytania kurierskie ({queries.length})</h2>
      </div>

      <div className="p-6 space-y-4">
        {queries.map((query) => {
          const typeInfo = getQueryTypeIcon(query.query_type)
          const isProcessing = processingQuery === query.id
          
          // Parsuj dane DHL jeśli istnieją
          let dhlData = null
          try {
            if (query.dhl_data) {
              dhlData = JSON.parse(query.dhl_data)
            }
          } catch (error) {
            console.error('Błąd parsowania danych DHL:', error)
          }

          return (
            <div 
              key={query.id}
              className={`border rounded-lg overflow-hidden ${
                isProcessing ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              {/* Nagłówek zapytania */}
              <div
                onClick={() => toggleExpand(query.id)}
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span>{query.contact_person || 'Bez nazwy'}</span>
                      {getPriorityBadge(query.priority, query.is_urgent)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {typeInfo.label} • {query.city || 'Lokalizacja nie podana'}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {query.id} | Utworzono: {formatDate(query.created_at)} | Przez: {query.created_by_name || query.created_by_email}
                    </div>
                    {isProcessing && (
                      <div className="text-xs text-blue-600 font-medium flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                        Przetwarzanie...
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(query.status)}
                  {dhlData && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">DHL</span>
                    </div>
                  )}
                  {expandedId === query.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Szczegóły zapytania */}
              {expandedId === query.id && (
                <div className="p-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Opis zapytania */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <HelpCircle className="w-5 h-5 mr-2 text-green-600" />
                        Opis zapytania
                      </h4>
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-gray-900">{query.description}</p>
                        {query.special_instructions && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <span className="text-sm font-medium text-green-800">Specjalne instrukcje:</span>
                            <p className="text-sm text-green-700 mt-1">{query.special_instructions}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lokalizacja */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                        Lokalizacja
                      </h4>
                      <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{query.address}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="w-4 h-4 mr-2"></span>
                          <span>{query.postal_code} {query.city}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{query.contact_person}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="w-4 h-4 mr-2">📞</span>
                          <span>{query.contact_phone}</span>
                        </div>
                        {query.contact_email && (
                          <div className="flex items-center text-sm">
                            <span className="w-4 h-4 mr-2">✉️</span>
                            <span>{query.contact_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Szczegóły przesyłki - tylko dla pickup i delivery */}
                    {(query.query_type === 'pickup' || query.query_type === 'delivery') && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Package className="w-5 h-5 mr-2 text-purple-600" />
                          Szczegóły przesyłki
                        </h4>
                        <div className="space-y-2 bg-purple-50 p-3 rounded-md">
                          <div className="text-sm">
                            <span className="font-medium">Typ:</span> {
                              query.package_type === 'document' ? '📄 Dokumenty' :
                              query.package_type === 'package' ? '📦 Paczka' :
                              query.package_type === 'pallet' ? '🏗️ Paleta' : 'Nie podano'
                            }
                          </div>
                          {query.weight && (
                            <div className="text-sm">
                              <span className="font-medium">Waga:</span> {query.weight} kg
                            </div>
                          )}
                          {query.dimensions && (
                            <div className="text-sm">
                              <span className="font-medium">Wymiary:</span> {query.dimensions} cm
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="font-medium">Ilość:</span> {query.quantity}
                          </div>
                          {query.content_description && (
                            <div className="text-sm">
                              <span className="font-medium">Zawartość:</span> {query.content_description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preferencje czasowe */}
                    {(query.preferred_date || query.preferred_time) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-yellow-600" />
                          Preferencje czasowe
                        </h4>
                        <div className="space-y-2 bg-yellow-50 p-3 rounded-md">
                          {query.preferred_date && (
                            <div className="text-sm">
                              <span className="font-medium">Data:</span> {new Date(query.preferred_date).toLocaleDateString('pl-PL')}
                            </div>
                          )}
                          {query.preferred_time && (
                            <div className="text-sm">
                              <span className="font-medium">Pora:</span> {
                                query.preferred_time === 'morning' ? 'Rano (8:00-12:00)' :
                                query.preferred_time === 'afternoon' ? 'Popołudnie (12:00-17:00)' :
                                query.preferred_time === 'evening' ? 'Wieczór (17:00-20:00)' : query.preferred_time
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Informacje finansowe */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                        Płatność
                      </h4>
                      <div className="space-y-2 bg-green-50 p-3 rounded-md">
                        <div className="text-sm">
                          <span className="font-medium">Sposób:</span> {
                            query.payment_method === 'company' ? '🏢 Na firmę' :
                            query.payment_method === 'cash' ? '💵 Gotówka' :
                            query.payment_method === 'card' ? '💳 Karta' : 'Nie podano'
                          }
                        </div>
                        {query.estimated_cost && (
                          <div className="text-sm">
                            <span className="font-medium">Szacowany koszt:</span> {query.estimated_cost} PLN
                          </div>
                        )}
                        {query.cost_notes && (
                          <div className="text-sm">
                            <span className="font-medium">Uwagi:</span> {query.cost_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informacje o przetwarzaniu */}
                  {query.status !== 'new' && (
                    <div className="mt-6 p-3 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-gray-900 mb-2">Historia przetwarzania</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Status:</span> {
                            query.status === 'approved' ? 'Zaakceptowane' : 
                            query.status === 'rejected' ? 'Odrzucone' : query.status
                          }
                        </div>
                        {query.processed_by && (
                          <div>
                            <span className="font-medium">Przez:</span> {query.processed_by}
                          </div>
                        )}
                        {query.processed_at && (
                          <div>
                            <span className="font-medium">Data:</span> {formatDate(query.processed_at)}
                          </div>
                        )}
                        {query.processing_notes && (
                          <div>
                            <span className="font-medium">Uwagi:</span> {query.processing_notes}
                          </div>
                        )}
                        {query.internal_notes && userPermissions.canApprove && (
                          <div>
                            <span className="font-medium">Notatki wewnętrzne:</span> {query.internal_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informacje DHL */}
                  {dhlData && (
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        🚚 Informacje DHL
                      </h4>
                      <div className="text-sm space-y-1">
                        {dhlData.shipmentNumber && (
                          <div>
                            <span className="font-medium">Nr przesyłki:</span> 
                            <span className="font-mono ml-2">{dhlData.shipmentNumber}</span>
                          </div>
                        )}
                        {dhlData.trackingNumber && (
                          <div>
                            <span className="font-medium">Nr śledzenia:</span> 
                            <span className="font-mono ml-2">{dhlData.trackingNumber}</span>
                          </div>
                        )}
                        {dhlData.cost && (
                          <div>
                            <span className="font-medium">Koszt:</span> {dhlData.cost} PLN
                          </div>
                        )}
                        {dhlData.sentAt && (
                          <div>
                            <span className="font-medium">Wysłano:</span> {formatDate(dhlData.sentAt)}
                          </div>
                        )}
                        {dhlData.labelUrl && (
                          <div className="mt-2">
                            <button
                              onClick={() => downloadLabel(dhlData)}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              <Download size={16} className="mr-1" />
                              Pobierz etykietę
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Przyciski akcji */}
                  <div className="mt-6 flex justify-end space-x-4">
                    {query.status === 'new' && userPermissions.canApprove && (
                      <>
                        <button
                          onClick={() => handleReject(query.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600 mr-2"></div>
                              Przetwarzanie...
                            </>
                          ) : (
                            <>
                              <XCircle size={16} className="mr-1" />
                              Odrzuć
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleApprove(query.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Przetwarzanie...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} className="mr-1" />
                              Zaakceptuj i wyślij do DHL
                            </>
                          )}
                        </button>
                      </>
                    )}
                    
                    {query.status === 'new' && !userPermissions.canApprove && (
                      <div className="text-sm text-gray-500 italic">
                        Oczekuje na akceptację przez administratora
                      </div>
                    )}

                    {query.status === 'approved' && !dhlData && (
                      <div className="text-sm text-blue-600 italic">
                        Zaakceptowane - przygotowywanie przesyłki DHL...
                      </div>
                    )}

                    {query.status === 'rejected' && (
                      <div className="text-sm text-red-600 italic">
                        Zapytanie zostało odrzucone
                      </div>
                    )}

                    {dhlData && (
                      <div className="text-sm text-green-600 italic flex items-center">
                        <CheckCircle size={16} className="mr-1" />
                        Przesyłka została utworzona w systemie DHL
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
