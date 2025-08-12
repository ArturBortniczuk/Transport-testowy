// src/app/spedycja/components/TransportOrderForm.js
'use client'
import { useState, useEffect } from 'react'
import { Calendar, Info, Truck, FileText, MapPin, DollarSign, LinkIcon, Building, ShoppingBag, Weight } from 'lucide-react'

export default function TransportOrderForm({ onSubmit, onCancel, zamowienie }) {
  const [formData, setFormData] = useState({
    towar: '',
    terminPlatnosci: '30 dni',
    waga: '',
    dataZaladunku: '',
    dataRozladunku: '',
    emailOdbiorcy: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  // Sprawdź czy transport jest połączony
  const isMergedTransport = (() => {
    // Sprawdź response_data
    if (zamowienie?.response_data) {
      try {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data
        return responseData?.isMerged || false
      } catch (e) {
        console.error('Błąd parsowania response_data:', e)
      }
    }
    
    // Fallback do starych pól
    return zamowienie?.merged_transports && zamowienie?.response?.isMerged
  })()
  
  // Pobierz dane o połączonych transportach
  const getMergedData = () => {
    if (!isMergedTransport) return null
    
    try {
      // Sprawdź response_data
      if (zamowienie?.response_data) {
        const responseData = typeof zamowienie.response_data === 'string' 
          ? JSON.parse(zamowienie.response_data) 
          : zamowienie.response_data
        
        return {
          originalTransports: responseData?.mergedTransportIds || [],
          costBreakdown: responseData?.costBreakdown || responseData?.priceBreakdown || null,
          routeSequence: responseData?.routeSequence || [],
          totalDistance: responseData?.totalDistance || 0,
          cargoDescription: responseData?.cargoDescription || '',
          totalWeight: responseData?.totalWeight || 0
        }
      }
      
      // Fallback do starych pól
      return {
        originalTransports: zamowienie.merged_transports?.originalTransports || [],
        costBreakdown: zamowienie.response?.costBreakdown || null
      }
    } catch (error) {
      console.error('Błąd parsowania danych połączonych transportów:', error)
      return null
    }
  }
  
  const mergedData = getMergedData()
  
  // Automatyczne wypełnienie danych dla połączonych transportów
  useEffect(() => {
    if (isMergedTransport && mergedData) {
      setFormData(prev => ({
        ...prev,
        towar: mergedData.cargoDescription || prev.towar,
        waga: mergedData.totalWeight ? mergedData.totalWeight.toString() : prev.waga
      }))
    }
  }, [isMergedTransport, mergedData])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Przygotuj dane zlecenia - automatycznie uwzględnij wszystkie miejsca z połączonego transportu
      const orderData = {
        spedycjaId: zamowienie.id,
        ...formData,
        // Dodaj informację o tym czy to transport połączony
        isMerged: isMergedTransport,
        mergedTransportsData: mergedData
      }
      
      await onSubmit(orderData)
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania zlecenia')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Funkcja formatująca trasę transportu
  const getTransportRoute = (transport) => {
    let start;
    if (transport.location === 'Odbiory własne' && transport.producerAddress) {
      start = transport.producerAddress.city || 'Brak miasta';
    } else if (transport.location === 'Magazyn Białystok') {
      start = 'Białystok';
    } else if (transport.location === 'Magazyn Zielonka') {
      start = 'Zielonka';
    } else {
      start = transport.location?.replace('Magazyn ', '') || 'Nie podano';
    }
    
    const end = transport.delivery?.city || 'Brak danych'
    
    return `${start} → ${end}`
  }
  
  // Funkcja formatująca adres
  const formatAddress = (address) => {
    if (!address) return 'Brak danych'
    if (typeof address === 'string') return address
    return `${address.city || ''}, ${address.postalCode || ''}, ${address.street || ''}`.replace(/^,\s*|,\s*$/g, '')
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Stwórz zlecenie transportowe</h2>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Anuluj
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Informacja o transporcie połączonym */}
      {isMergedTransport && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <LinkIcon size={18} className="mr-2" />
            Transport połączony - automatycznie uwzględnione wszystkie trasy
          </h3>
          
          <div className="space-y-2 text-sm">
            {/* Główny transport */}
            <div className="font-medium text-purple-800">
              1. {zamowienie.orderNumber} - {getTransportRoute(zamowienie)} (MPK: {zamowienie.mpk})
            </div>
            
            {/* Połączone transporty */}
            {mergedData?.originalTransports.map((transport, index) => (
              <div key={transport.id} className="text-purple-700 ml-4">
                {index + 2}. {transport.orderNumber} - {transport.route} (MPK: {transport.mpk})
              </div>
            ))}
            
            <div className="mt-3 pt-2 border-t border-purple-200 font-medium text-purple-800">
              Łączna wartość: {zamowienie.response?.deliveryPrice || 0} PLN
            </div>
          </div>
        </div>
      )}

      {/* Podstawowe dane zlecenia */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Rodzaj towaru</label>
          <input
            name="towar"
            type="text"
            value={formData.towar}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="Opisz przewożony towar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Waga towaru</label>
          <input
            name="waga"
            type="text"
            value={formData.waga}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="np. 2500 kg"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data załadunku</label>
          <input
            name="dataZaladunku"
            type="datetime-local"
            value={formData.dataZaladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data rozładunku</label>
          <input
            name="dataRozladunku"
            type="datetime-local"
            value={formData.dataRozladunku}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Termin płatności</label>
          <select
            name="terminPlatnosci"
            value={formData.terminPlatnosci}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="7 dni">7 dni</option>
            <option value="14 dni">14 dni</option>
            <option value="21 dni">21 dni</option>
            <option value="30 dni">30 dni</option>
            <option value="60 dni">60 dni</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email odbiorcy</label>
          <input
            name="emailOdbiorcy"
            type="email"
            value={formData.emailOdbiorcy}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            placeholder="email@przewoznik.pl"
          />
        </div>
      </div>
      
      {/* Informacje o zleceniu */}
      <div className="mt-6 bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium mb-3 flex items-center">
          <FileText size={18} className="mr-2 text-blue-600" />
          Podsumowanie zlecenia
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-medium">Numer zlecenia:</span> {zamowienie.orderNumber || zamowienie.id}</p>
            <p><span className="font-medium">MPK główny:</span> {zamowienie.mpk}</p>
            <p><span className="font-medium">Dokumenty:</span> {zamowienie.documents}</p>
            {zamowienie.clientName && (
              <p><span className="font-medium">Klient:</span> {zamowienie.clientName}</p>
            )}
          </div>
          
          <div>
            <p><span className="font-medium">Trasa główna:</span> {getTransportRoute(zamowienie)}</p>
            <p><span className="font-medium">Odległość:</span> {zamowienie.distanceKm || 0} km</p>
            <p><span className="font-medium">Wartość transportu:</span> {zamowienie.response?.deliveryPrice || 0} PLN</p>
            {isMergedTransport && (
              <p><span className="font-medium">Liczba tras:</span> {(mergedData?.originalTransports.length || 0) + 1}</p>
            )}
          </div>
        </div>
        
        {/* Szczegóły tras dla transportu połączonego */}
        {isMergedTransport && mergedData && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="font-bold text-sm mb-2 text-gray-800">Szczegóły wszystkich tras:</h4>
            
            {/* Główna trasa */}
            <div className="mb-2 p-2 bg-white rounded border border-purple-100">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">GŁÓWNA: {zamowienie.orderNumber}</span>
                  <div className="text-xs text-gray-600 mt-1">
                    Załadunek: {zamowienie.location === 'Odbiory własne' 
                      ? formatAddress(zamowienie.producerAddress) 
                      : zamowienie.location}
                  </div>
                  <div className="text-xs text-gray-600">
                    Rozładunek: {formatAddress(zamowienie.delivery)}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-green-600">
                    {mergedData.costBreakdown?.mainTransport?.cost || 0} PLN
                  </div>
                  <div className="text-xs text-gray-500">
                    MPK: {zamowienie.mpk}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dodatkowe trasy */}
            {mergedData.originalTransports.map((transport, index) => (
              <div key={transport.id} className="mb-2 p-2 bg-white rounded border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{index + 2}. {transport.orderNumber}</span>
                    <div className="text-xs text-gray-600 mt-1">
                      Trasa: {transport.route}
                    </div>
                    <div className="text-xs text-gray-600">
                      Odpowiedzialny: {transport.responsiblePerson || 'Brak'}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-green-600">
                      {transport.costAssigned || 0} PLN
                    </div>
                    <div className="text-xs text-gray-500">
                      MPK: {transport.mpk}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Truck size={16} />
          {isSubmitting ? 'Wysyłanie...' : 'Wyślij zlecenie'}
        </button>
      </div>
    </form>
  )
}
