// src/app/kurier/components/KurierForm.js
'use client'
import { useState } from 'react'
import { 
  Package, User, Building, MapPin, Phone, Mail, 
  Clock, DollarSign, Shield, X, Save
} from 'lucide-react'

export default function KurierForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Dane nadawcy
    sender_name: '',
    sender_company: '',
    sender_address: '',
    sender_postal_code: '',
    sender_city: '',
    sender_phone: '',
    sender_email: '',
    
    // Dane odbiorcy
    recipient_name: '',
    recipient_company: '',
    recipient_address: '',
    recipient_postal_code: '',
    recipient_city: '',
    recipient_phone: '',
    recipient_email: '',
    
    // Dane przesyłki
    service_type: 'standard',
    weight: '',
    dimensions_length: '',
    dimensions_width: '',
    dimensions_height: '',
    declared_value: '',
    
    // Usługi dodatkowe
    cod_amount: '',
    insurance_amount: '',
    saturday_delivery: false,
    return_service: false,
    
    // Notatki
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Usuń błąd dla tego pola
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Wymagane pola
    if (!formData.recipient_name.trim()) {
      newErrors.recipient_name = 'Nazwa odbiorcy jest wymagana'
    }
    
    if (!formData.recipient_address.trim()) {
      newErrors.recipient_address = 'Adres odbiorcy jest wymagany'
    }
    
    if (!formData.recipient_city.trim()) {
      newErrors.recipient_city = 'Miasto odbiorcy jest wymagane'
    }
    
    if (!formData.recipient_postal_code.trim()) {
      newErrors.recipient_postal_code = 'Kod pocztowy odbiorcy jest wymagany'
    }
    
    // Walidacja kodu pocztowego (XX-XXX)
    if (formData.recipient_postal_code && !/^\d{2}-\d{3}$/.test(formData.recipient_postal_code)) {
      newErrors.recipient_postal_code = 'Kod pocztowy musi mieć format XX-XXX'
    }
    
    // Walidacja wagi
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)) {
      newErrors.weight = 'Waga musi być liczbą większą od 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="mr-3" size={24} />
            Nowe zamówienie kurierskie
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Kolumna 1 - Nadawca */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="mr-2" size={20} />
                Dane nadawcy
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa/Imię i nazwisko
                  </label>
                  <input
                    type="text"
                    value={formData.sender_name}
                    onChange={(e) => handleChange('sender_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="np. Jan Kowalski"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firma
                  </label>
                  <input
                    type="text"
                    value={formData.sender_company}
                    onChange={(e) => handleChange('sender_company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="np. ABC Sp. z o.o."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={formData.sender_address}
                    onChange={(e) => handleChange('sender_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ul. Przykładowa 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kod pocztowy
                    </label>
                    <input
                      type="text"
                      value={formData.sender_postal_code}
                      onChange={(e) => handleChange('sender_postal_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00-000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miasto
                    </label>
                    <input
                      type="text"
                      value={formData.sender_city}
                      onChange={(e) => handleChange('sender_city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Warszawa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.sender_phone}
                      onChange={(e) => handleChange('sender_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123 456 789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.sender_email}
                      onChange={(e) => handleChange('sender_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="jan@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kolumna 2 - Odbiorca */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="mr-2" size={20} />
                Dane odbiorcy
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa/Imię i nazwisko *
                  </label>
                  <input
                    type="text"
                    value={formData.recipient_name}
                    onChange={(e) => handleChange('recipient_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.recipient_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="np. Anna Nowak"
                  />
                  {errors.recipient_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.recipient_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firma
                  </label>
                  <input
                    type="text"
                    value={formData.recipient_company}
                    onChange={(e) => handleChange('recipient_company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="np. XYZ Sp. z o.o."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres *
                  </label>
                  <input
                    type="text"
                    value={formData.recipient_address}
                    onChange={(e) => handleChange('recipient_address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.recipient_address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ul. Testowa 456"
                  />
                  {errors.recipient_address && (
                    <p className="text-red-500 text-xs mt-1">{errors.recipient_address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kod pocztowy *
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_postal_code}
                      onChange={(e) => handleChange('recipient_postal_code', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.recipient_postal_code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="00-000"
                    />
                    {errors.recipient_postal_code && (
                      <p className="text-red-500 text-xs mt-1">{errors.recipient_postal_code}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miasto *
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_city}
                      onChange={(e) => handleChange('recipient_city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.recipient_city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Kraków"
                    />
                    {errors.recipient_city && (
                      <p className="text-red-500 text-xs mt-1">{errors.recipient_city}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.recipient_phone}
                      onChange={(e) => handleChange('recipient_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="987 654 321"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.recipient_email}
                      onChange={(e) => handleChange('recipient_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="anna@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dane przesyłki */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="mr-2" size={20} />
              Dane przesyłki
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rodzaj usługi
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => handleChange('service_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="overnight">Overnight</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waga (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.weight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1.5"
                />
                {errors.weight && (
                  <p className="text-red-500 text-xs mt-1">{errors.weight}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Długość (cm)
                </label>
                <input
                  type="number"
                  value={formData.dimensions_length}
                  onChange={(e) => handleChange('dimensions_length', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Szerokość (cm)
                </label>
                <input
                  type="number"
                  value={formData.dimensions_width}
                  onChange={(e) => handleChange('dimensions_width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wysokość (cm)
                </label>
                <input
                  type="number"
                  value={formData.dimensions_height}
                  onChange={(e) => handleChange('dimensions_height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wartość deklarowana (PLN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.declared_value}
                  onChange={(e) => handleChange('declared_value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pobranie (PLN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cod_amount}
                  onChange={(e) => handleChange('cod_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubezpieczenie (PLN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.insurance_amount}
                  onChange={(e) => handleChange('insurance_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500.00"
                />
              </div>
            </div>

            {/* Checkboxy */}
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.saturday_delivery}
                  onChange={(e) => handleChange('saturday_delivery', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Dostawa w sobotę</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.return_service}
                  onChange={(e) => handleChange('return_service', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Usługa zwrotna</span>
              </label>
            </div>

            {/* Notatki */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uwagi i notatki
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dodatkowe informacje o przesyłce..."
              />
            </div>
          </div>

          {/* Przyciski */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Tworzę zamówienie...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={16} />
                  Utwórz zamówienie
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
