'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Package, User, Building2, MapPin, Phone, Mail, Box, Weight, Ruler, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ZamowieniaList({ zamowienia, onZatwierdz, onUsun, userRole, canApprove, loading }) {
  const [expandedId, setExpandedId] = useState(null)

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
        return <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">Wysłane</span>
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
                          Zatwierdź i wyślij do kuriera
                        </button>
                      )}
                    </div>
                  )}

                  {/* Informacja dla zamówień zatwierdzonych */}
                  {zamowienie.status === 'approved' && (
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center text-sm text-blue-800">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Zamówienie zostało zatwierdzone i może zostać przekazane do realizacji kurierskiej.</span>
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
