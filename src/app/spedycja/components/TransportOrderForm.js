// src/app/spedycja/components/TransportOrderForm.js
'use client'
import { useState } from 'react'
import { Truck, DollarSign, Calendar, Mail, Package, Weight } from 'lucide-react'

export default function TransportOrderForm({ onSubmit, onCancel, zamowienie }) {
  const [formData, setFormData] = useState({
    towar: '',
    waga: '',
    dataZaladunku: '',
    dataRozladunku: '',
    terminPlatnosci: '30 dni',
    emailOdbiorcy: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
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
      const orderData = {
        spedycjaId: zamowienie.id,
        ...formData
      }
      
      await onSubmit(orderData)
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania zlecenia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Truck className="mr-3 text-blue-600" size={28} />
          Stwórz zlecenie transportowe
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Anuluj
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <strong>Błąd:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Podstawowe informacje o ładunku */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="mr-2 text-blue-600" size={20} />
            Informacje o ładunku
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rodzaj towaru *
              </label>
              <input
                name="towar"
                type="text"
                value={formData.towar}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="np. Materiały budowlane, meble, elektronika..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Weight className="mr-1" size={16} />
                Waga towaru *
              </label>
              <input
                name="waga"
                type="text"
                value={formData.waga}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="np. 2500 kg, 15 ton..."
              />
            </div>
          </div>
        </div>

        {/* Terminy */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="mr-2 text-blue-600" size={20} />
            Terminy realizacji
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data i czas załadunku *
              </label>
              <input
                name="dataZaladunku"
                type="datetime-local"
                value={formData.dataZaladunku}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data i czas rozładunku *
              </label>
              <input
                name="dataRozladunku"
                type="datetime-local"
                value={formData.dataRozladunku}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Płatność i kontakt */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="mr-2 text-blue-600" size={20} />
            Płatność i kontakt
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Termin płatności *
              </label>
              <select
                name="terminPlatnosci"
                value={formData.terminPlatnosci}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="mr-1" size={16} />
                Email odbiorcy *
              </label>
              <input
                name="emailOdbiorcy"
                type="email"
                value={formData.emailOdbiorcy}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="email@przewoznik.pl"
              />
            </div>
          </div>
        </div>

        {/* Przyciski */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Anuluj
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Wysyłanie...
              </>
            ) : (
              <>
                <Truck className="mr-2" size={16} />
                Wyślij zlecenie
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}