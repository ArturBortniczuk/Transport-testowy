'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Package, User, Building2, MapPin, Phone, Mail, Box, Weight, Ruler, Clock, CheckCircle, AlertCircle, Truck, RefreshCw } from 'lucide-react'

export default function ZamowieniaList({ zamowienia, onZatwierdz, onUsun, userRole, canApprove, loading, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(null)

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
        return <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">Nowe</span>
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">Zatwierdzone</span>
      case 'sent':
        return <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">Wysłane do DHL</span>
      case 'delivered':
        return <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">Dostarczone</span>
      default:
        return <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const parseNotes = (notesString) => {
    try {
      return JSON.parse(notesString || '{}')
    } catch (error) {
      return {}
    }
  }

  const handleTrackingRefresh = async (trackingNumber) => {
    try {
      setTrackingLoading(trackingNumber)
      
      const response = await fetch(`/api/kurier/tracking/${trackingNumber}`, {
        method: 'POST' // POST dla wymuszenia odświeżenia
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Status śledzenia odświeżony!\nStatus: ${data.status}`)
        // Odśwież listę zamówień
        if (onRefresh) {
          onRefresh()
        }
      } else {
        alert('Błąd odświeżania statusu: ' + data.error)
      }
    } catch (error) {
      console.error('Błąd odświeżania trackingu:', error)
      alert('Wystąpił błąd podczas odświeżania statusu')
    } finally {
      setTrackingLoading(null)
    }
  }

  if (loading && zamowienia.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie zamówień...</span>
        </div>
      </div>
    )
  }

  if (zamowienia.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Brak zamówień kuriera</p>
          <p className="text-sm mt-2">Dodaj pierwsze zamówienie korzystając z przycisku powyżej</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Lista zamówień kuriera ({zamowienia.length})</h2>
      </div>

      <div className="p-6 space-y-4">
        {zamowienia.map((zamowienie) => {
          const notes = parseNotes(zamowienie.notes)
          const nadawca = notes.nadawca || {}
          const odbiorca = notes.odbiorca || {}
          const przesylka = notes.przesylka || {}

          return (
            <div 
              key={zamowienie.id}
              className="border rounded-lg overflow-hidden"
            >
              {/* Nagłówek zamówienia */}
              <div
                onClick={() => toggleExpand(zamowienie.id)}
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Package className="text-blue-600" />
                  <div>
                    <div className="font-medium">{zamowienie.recipient_name}</div>
                    <div className="text-sm text-gray-500">
                      {zamowienie.magazine_source} → {zamowienie.recipient_phone}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {zamowienie.id} | Utworzono: {formatDate(zamowienie.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(zamowienie.status)}
                  {/* Wskaźnik DHL */}
                  {notes.dhl && (
                    <div className="flex items-center space-x-2">
                      <Truck className={`w-4 h-4 ${
                        notes.dhl.status === 'sent_to_dhl' ? 'text-blue-600' :
                        notes.dhl.status === 'failed' ? 'text-red-600' :
                        'text-yellow-600'
                      }`} />
                      <span className="text-xs text-gray-500">DHL</span>
                    </div>
                  )}
                  {expandedId === zamowienie.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Szczegóły zamówienia */}
              {expandedId === zamowienie.id && (
                <div className="p-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nadawca */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                        Nadawca
                      </h4>
                      <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                        <div className="flex items-center text-sm">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="font-medium">{nadawca.nazwa || 'Nie podano'}</span>
                          <span className="ml-2 text-xs text-gray-500">({nadawca.typ})</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.adres || 'Nie podano'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.kontakt || 'Nie podano'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.telefon || 'Nie podano'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{nadawca.email || 'Nie podano'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Odbiorca */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-green-600" />
                        Odbiorca
                      </h4>
                      <div className="space-y-2 bg-green-50 p-3 rounded-md">
                        <div className="flex items-center text-sm">
                          {odbiorca.typ === 'osoba' ? 
                            <User className="w-4 h-4 mr-2 text-gray-400" /> : 
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          }
                          <span className="font-medium">{zamowienie.recipient_name}</span>
                          <span className="ml-2 text-xs text-gray-500">({odbiorca.typ})</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{zamowienie.recipient_address}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{zamowienie.recipient_phone}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{odbiorca.email || 'Nie podano'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Szczegóły przesyłki */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-purple-600" />
                        Szczegóły przesyłki
                      </h4>
                      <div className="bg-purple-50 p-4 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Zawartość:</span>
                              <p className="mt-1 text-gray-900">{zamowienie.package_description.split(' | ')[0]}</p>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Parametry:</span>
                              <div className="mt-1 space-y-1">
                                {zamowienie.package_description.split(' | ').slice(1).map((param, index) => (
                                  <div key={index} className="text-gray-900 text-xs bg-white px-2 py-1 rounded border">
                                    {param}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Magazyn nadawczy:</span>
                              <p className="mt-1 text-gray-900 capitalize">{zamowienie.magazine_source?.replace('_', ' ')}</p>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Utworzone przez:</span>
                              <p className="mt-1 text-gray-900">{zamowienie.created_by_email}</p>
                            </div>
                            {przesylka.mpk && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">MPK:</span>
                                <p className="mt-1 text-gray-900 font-mono">{przesylka.mpk}</p>
                              </div>
                            )}
                            {notes.typZlecenia && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Typ zlecenia:</span>
                                <p className="mt-1 text-gray-900 capitalize">{notes.typZlecenia.replace('_', ' ')}</p>
                              </div>
                            )}
                          </div>
                          {przesylka.uwagi && (
                            <div className="md:col-span-2 pt-3 border-t border-purple-200">
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Uwagi:</span>
                                <p className="mt-1 text-gray-900 bg-white p-3 rounded border">{przesylka.uwagi}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informacje o zatwierdzeniu */}
                    {zamowienie.status === 'approved' && zamowienie.completed_at && (
                      <div className="md:col-span-2">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                          <div className="flex items-center text-sm text-green-800">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Zatwierdzone przez:</span>
                            <span className="ml-2">{zamowienie.completed_by}</span>
                            <span className="ml-4">w dniu:</span>
                            <span className="ml-2">{formatDate(zamowienie.completed_at)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informacje DHL */}
                    {notes.dhl && (
                      <div className="md:col-span-2">
                        <div className={`border p-3 rounded-md ${
                          notes.dhl.status === 'sent_to_dhl' ? 'bg-blue-50 border-blue-200' :
                          notes.dhl.status === 'failed' ? 'bg-red-50 border-red-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Truck className="w-4 h-4 mr-2" />
                              <span className="font-medium">Status DHL</span>
                            </div>
                            {notes.dhl.trackingNumber && (
                              <button
                                onClick={() => handleTrackingRefresh(notes.dhl.trackingNumber)}
                                disabled={trackingLoading === notes.dhl.trackingNumber}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                              >
                                <RefreshCw className={`w-3 h-3 ${trackingLoading === notes.dhl.trackingNumber ? 'animate-spin' : ''}`} />
                                <span>{trackingLoading === notes.dhl.trackingNumber ? 'Odświeżanie...' : 'Odśwież status'}</span>
                              </button>
                            )}
                          </div>
                          
                          {notes.dhl.status === 'sent_to_dhl' && (
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium text-gray-700">Nr przesyłki:</span>
                                  <p className="font-mono text-blue-700">{notes.dhl.shipmentNumber}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Nr śledzenia:</span>
                                  <p className="font-mono text-blue-700">{notes.dhl.trackingNumber}</p>
                                </div>
                              </div>
                              
                              {notes.dhl.cost && (
                                <div>
                                  <span className="font-medium text-gray-700">Koszt:</span>
                                  <span className="ml-2 text-green-600 font-medium">{notes.dhl.cost} PLN</span>
                                </div>
                              )}
                              
                              <div>
                                <span className="font-medium text-gray-700">Wysłano:</span>
                                <span className="ml-2">{formatDate(notes.dhl.sentAt)} przez {notes.dhl.sentBy}</span>
                              </div>
                              
                              {notes.dhl.labelUrl && (
                                <div>
                                  <a 
                                    href={notes.dhl.labelUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                  >
                                    📄 Pobierz etykietę
                                  </a>
                                </div>
                              )}
                              
                              {notes.dhl.trackingStatus && (
                                <div className="pt-2 border-t border-blue-200">
                                  <span className="font-medium text-gray-700">Status śledzenia:</span>
                                  <span className="ml-2 text-blue-700 font-medium">{notes.dhl.trackingStatus}</span>
                                  {notes.dhl.lastTracked && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      (sprawdzono: {formatDate(notes.dhl.lastTracked)})
                                    </span>
                                  )}
                                </div>
                              )}

                              {notes.dhl.estimatedDelivery && (
                                <div>
                                  <span className="font-medium text-gray-700">Przewidywana dostawa:</span>
                                  <span className="ml-2 text-purple-600 font-medium">{formatDate(notes.dhl.estimatedDelivery)}</span>
                                </div>
                              )}

                              {notes.dhl.trackingEvents && notes.dhl.trackingEvents.length > 0 && (
                                <div className="pt-2 border-t border-blue-200">
                                  <span className="font-medium text-gray-700">Ostatnie zdarzenia:</span>
                                  <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                                    {notes.dhl.trackingEvents.slice(0, 3).map((event, index) => (
                                      <div key={index} className="text-xs bg-white p-2 rounded border">
                                        <div className="font-medium">{event.status || event.description}</div>
                                        <div className="text-gray-500">{formatDate(event.timestamp || event.date)}</div>
                                        {event.location && <div className="text-gray-600">{event.location}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {notes.dhl.status === 'failed' && (
                            <div className="text-sm text-red-700">
                              <span className="font-medium">Błąd wysyłki DHL:</span>
                              <p className="mt-1">{notes.dhl.error}</p>
                              <p className="text-xs text-red-600 mt-1">
                                Próba: {formatDate(notes.dhl.attemptedAt)} przez {notes.dhl.attemptedBy}
                              </p>
                            </div>
                          )}
                          
                          {notes.dhl.status === 'error' && (
                            <div className="text-sm text-yellow-700">
                              <span className="font-medium">Problem z integracją DHL:</span>
                              <p className="mt-1">{notes.dhl.error}</p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Spróbuj ponownie lub skontaktuj się z administratorem
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Przyciski akcji */}
                  {zamowienie.status === 'new' && (
                    <div className="mt-6 flex justify-end space-x-4">
                      <button
                        onClick={() => onUsun(zamowienie.id)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Usuń
                      </button>
                      {canApprove && (
                        <button
                          onClick={() => onZatwierdz(zamowienie.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors flex items-center"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Zatwierdź i wyślij do DHL
                        </button>
                      )}
                    </div>
                  )}

                  {/* Informacja dla zamówień zatwierdzonych */}
                  {zamowienie.status === 'approved' && !notes.dhl && (
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center text-sm text-blue-800">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Zamówienie zostało zatwierdzone. Oczekiwanie na wysyłkę do DHL...</span>
                      </div>
                    </div>
                  )}

                  {/* Informacja dla zamówień wysłanych */}
                  {(zamowienie.status === 'sent' || zamowienie.status === 'delivered') && notes.dhl && notes.dhl.status === 'sent_to_dhl' && (
                    <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center text-sm text-green-800">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>
                          {zamowienie.status === 'delivered' 
                            ? 'Przesyłka została dostarczona do odbiorcy!' 
                            : 'Przesyłka została przekazana do DHL i jest w trasie.'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
