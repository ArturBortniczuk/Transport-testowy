// src/app/kurier/components/ZamowieniaList.js
'use client'
import { useState } from 'react'
import { 
  ChevronDown, ChevronUp, Package, User, Building2, MapPin, Phone, Mail, 
  Clock, CheckCircle, AlertCircle, Truck, RefreshCw, Download, Printer,
  Eye, Edit, Trash2, Calendar, DollarSign, Shield, CreditCard, Globe,
  ExternalLink, Copy, QrCode, FileText, Archive, Star, Filter,
  TrendingUp, BarChart3, Target, Award, Zap, Camera, Headphones
} from 'lucide-react'

export default function ZamowieniaList({ 
  zamowienia, 
  onZatwierdz, 
  onUsun, 
  userRole, 
  canApprove, 
  loading, 
  onRefresh, 
  processingOrders = new Set(),
  isArchive = false 
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(new Set())

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const selectAllOrders = () => {
    if (selectedOrders.size === zamowienia.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(zamowienia.map(z => z.id)))
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'new':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: Clock,
          label: 'Nowe'
        }
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          label: 'Zatwierdzone'
        }
      case 'sent':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Truck,
          label: 'Wysłane'
        }
      case 'delivered':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          label: 'Dostarczone'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Package,
          label: status || 'Nieznany'
        }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty'
    try {
      return new Date(dateString).toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Nieprawidłowa data'
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Ładowanie zamówień...</p>
        </div>
      </div>
    )
  }

  if (!zamowienia || zamowienia.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isArchive ? 'Brak zamówień w archiwum' : 'Brak aktywnych zamówień'}
          </h3>
          <p className="text-gray-600 mb-6">
            {isArchive 
              ? 'Nie ma jeszcze żadnych zarchiwizowanych zamówień kurierskich.'
              : 'Nie ma jeszcze żadnych zamówień kurierskich. Utwórz pierwsze zamówienie.'
            }
          </p>
          {!isArchive && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
            >
              <RefreshCw className="mr-2" size={16} />
              Odśwież listę
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="mr-2" size={20} />
              Lista zamówień kurierskich {isArchive && '(Archiwum)'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Znaleziono {zamowienia.length} {zamowienia.length === 1 ? 'zamówienie' : 'zamówień'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Bulk actions */}
            {zamowienia.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === zamowienia.length && zamowienia.length > 0}
                  onChange={selectAllOrders}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {selectedOrders.size > 0 
                    ? `Wybrano ${selectedOrders.size} z ${zamowienia.length}`
                    : `Zaznacz wszystkie (${zamowienia.length})`
                  }
                </span>
              </div>
            )}
            
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista zamówień */}
      <div className="divide-y divide-gray-200">
        {zamowienia.map((zamowienie) => {
          const statusConfig = getStatusConfig(zamowienie.status)
          const StatusIcon = statusConfig.icon
          const isExpanded = expandedId === zamowienie.id
          const isProcessing = processingOrders.has(zamowienie.id)
          const isSelected = selectedOrders.has(zamowienie.id)
          
          return (
            <div key={zamowienie.id} className={`${isSelected ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
              {/* Główny wiersz */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(zamowienie.id)}
                      className="rounded border-gray-300"
                    />
                    
                    {/* Status */}
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </div>
                    
                    {/* Podstawowe info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            Zamówienie #{zamowienie.id}
                          </div>
                          <div className="text-sm text-gray-600">
                            Do: {zamowienie.recipient_city || 'Brak miasta'} 
                            {zamowienie.recipient_name && ` • ${zamowienie.recipient_name}`}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-900">
                            {formatDate(zamowienie.created_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {zamowienie.created_by_email || 'Nieznany użytkownik'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Akcje */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Zatwierdź (tylko dla nowych) */}
                    {canApprove && zamowienie.status === 'new' && onZatwierdz && (
                      <button
                        onClick={() => onZatwierdz(zamowienie.id)}
                        disabled={isProcessing}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                      >
                        {isProcessing ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        Zatwierdź
                      </button>
                    )}
                    
                    {/* Usuń (tylko dla adminów) */}
                    {userRole === 'admin' && onUsun && (
                      <button
                        onClick={() => onUsun(zamowienie.id)}
                        disabled={isProcessing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
                      >
                        {isProcessing ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1" />
                        )}
                        Usuń
                      </button>
                    )}
                    
                    {/* Rozwiń/Zwiń */}
                    <button
                      onClick={() => toggleExpand(zamowienie.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Rozwinięte szczegóły */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    
                    {/* Dane nadawcy */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Nadawca
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex">
                          <span className="w-20 text-gray-500">Nazwa:</span>
                          <span>{zamowienie.sender_name || 'Brak danych'}</span>
                        </div>
                        {zamowienie.sender_company && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Firma:</span>
                            <span>{zamowienie.sender_company}</span>
                          </div>
                        )}
                        <div className="flex">
                          <span className="w-20 text-gray-500">Adres:</span>
                          <span>
                            {zamowienie.sender_address || 'Brak adresu'}
                            {zamowienie.sender_postal_code && `, ${zamowienie.sender_postal_code}`}
                            {zamowienie.sender_city && ` ${zamowienie.sender_city}`}
                          </span>
                        </div>
                        {zamowienie.sender_phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{zamowienie.sender_phone}</span>
                          </div>
                        )}
                        {zamowienie.sender_email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{zamowienie.sender_email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Dane odbiorcy */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Odbiorca
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex">
                          <span className="w-20 text-gray-500">Nazwa:</span>
                          <span>{zamowienie.recipient_name || 'Brak danych'}</span>
                        </div>
                        {zamowienie.recipient_company && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Firma:</span>
                            <span>{zamowienie.recipient_company}</span>
                          </div>
                        )}
                        <div className="flex">
                          <span className="w-20 text-gray-500">Adres:</span>
                          <span>
                            {zamowienie.recipient_address || 'Brak adresu'}
                            {zamowienie.recipient_postal_code && `, ${zamowienie.recipient_postal_code}`}
                            {zamowienie.recipient_city && ` ${zamowienie.recipient_city}`}
                          </span>
                        </div>
                        {zamowienie.recipient_phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{zamowienie.recipient_phone}</span>
                          </div>
                        )}
                        {zamowienie.recipient_email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{zamowienie.recipient_email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Dane przesyłki */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Przesyłka
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex">
                          <span className="w-20 text-gray-500">Usługa:</span>
                          <span>{zamowienie.service_type || 'Standard'}</span>
                        </div>
                        {zamowienie.weight && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Waga:</span>
                            <span>{zamowienie.weight} kg</span>
                          </div>
                        )}
                        {(zamowienie.dimensions_length || zamowienie.dimensions_width || zamowienie.dimensions_height) && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Wymiary:</span>
                            <span>
                              {zamowienie.dimensions_length || 0} × 
                              {zamowienie.dimensions_width || 0} × 
                              {zamowienie.dimensions_height || 0} cm
                            </span>
                          </div>
                        )}
                        {zamowienie.declared_value && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Wartość:</span>
                            <span>{formatCurrency(zamowienie.declared_value)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Usługi dodatkowe */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Usługi dodatkowe
                      </h4>
                      <div className="space-y-2 text-sm">
                        {zamowienie.cod_amount && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Pobranie:</span>
                            <span>{formatCurrency(zamowienie.cod_amount)}</span>
                          </div>
                        )}
                        {zamowienie.insurance_amount && (
                          <div className="flex">
                            <span className="w-20 text-gray-500">Ubezp.:</span>
                            <span>{formatCurrency(zamowienie.insurance_amount)}</span>
                          </div>
                        )}
                        {zamowienie.saturday_delivery && (
                          <div className="text-blue-600">
                            ✓ Dostawa w sobotę
                          </div>
                        )}
                        {zamowienie.return_service && (
                          <div className="text-blue-600">
                            ✓ Usługa zwrotna
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Notatki */}
                  {zamowienie.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <h5 className="font-medium text-gray-900 mb-2">Uwagi i notatki:</h5>
                      <p className="text-sm text-gray-700">
                        {typeof zamowienie.notes === 'string' 
                          ? zamowienie.notes 
                          : JSON.stringify(zamowienie.notes)
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Bulk actions panel */}
      {selectedOrders.size > 0 && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Wybrano {selectedOrders.size} zamówień
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="px-3 py-1 text-blue-700 border border-blue-300 rounded hover:bg-blue-100 text-sm"
              >
                Odznacz wszystkie
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Akcje grupowe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
