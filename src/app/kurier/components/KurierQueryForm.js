'use client'
import { useState } from 'react'
import { HelpCircle, Package, MapPin, Calendar, DollarSign, FileText } from 'lucide-react'

export default function KurierQueryForm({ onSubmit, onCancel, userName }) {
  const [formData, setFormData] = useState({
    // Podstawowe dane
    queryType: 'pickup', // pickup, delivery, info
    priority: 'normal', // low, normal, high, urgent
    description: '',
    
    // Lokalizacja
    address: '',
    city: '',
    postalCode: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    
    // Szczegóły przesyłki
    packageType: 'package', // document, package, pallet
    weight: '',
    dimensions: '',
    quantity: 1,
    contentDescription: '',
    
    // Preferencje czasowe
    preferredDate: '',
    preferredTime: 'morning', // morning, afternoon, evening
    isUrgent: false,
    
    // Dane finansowe
    paymentMethod: 'company', // company, cash, card
    estimatedCost: '',
    costNotes: '',
    
    // Dodatkowe informacje
    specialInstructions: ''
  })

  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Podstawowa walidacja
    if (!formData.description.trim()) {
      setError('Opis zapytania jest wymagany')
      return
    }

    if (!formData.contactPerson.trim()) {
      setError('Osoba kontaktowa jest wymagana')
      return
    }

    if (!formData.contactPhone.trim()) {
      setError('Telefon kontaktowy jest wymagany')
      return
    }

    if (!formData.address.trim() || !formData.city.trim()) {
      setError('Adres i miasto są wymagane')
      return
    }

    // Walidacja kodu pocztowego
    const postalCodeRegex = /^\d{2}-?\d{3}$/
    if (formData.postalCode && !postalCodeRegex.test(formData.postalCode)) {
      setError('Nieprawidłowy format kodu pocztowego (XX-XXX)')
      return
    }

    // Walidacja telefonu
    const phoneRegex = /^[0-9\s\-\+\(\)]{9,15}$/
    if (!phoneRegex.test(formData.contactPhone)) {
      setError('Nieprawidłowy format numeru telefonu')
      return
    }

    onSubmit(formData)
  }

  const queryTypeOptions = [
    { value: 'pickup', label: 'Odbiór przesyłki', icon: '📦', desc: 'Chcę aby DHL odebrał przesyłkę' },
    { value: 'delivery', label: 'Dostawa przesyłki', icon: '🚚', desc: 'Chcę aby DHL dostarczył przesyłkę' },
    { value: 'info', label: 'Pytanie informacyjne', icon: '❓', desc: 'Potrzebuję informacji o usługach' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Niski', color: 'text-green-600 bg-green-50' },
    { value: 'normal', label: 'Normalny', color: 'text-blue-600 bg-blue-50' },
    { value: 'high', label: 'Wysoki', color: 'text-orange-600 bg-orange-50' },
    { value: 'urgent', label: 'Pilny', color: 'text-red-600 bg-red-50' }
  ]

  const packageTypeOptions = [
    { value: 'document', label: 'Dokumenty', icon: '📄' },
    { value: 'package', label: 'Paczka', icon: '📦' },
    { value: 'pallet', label: 'Paleta', icon: '🏗️' }
  ]

  const timeOptions = [
    { value: 'morning', label: 'Rano (8:00-12:00)' },
    { value: 'afternoon', label: 'Popołudnie (12:00-17:00)' },
    { value: 'evening', label: 'Wieczór (17:00-20:00)' }
  ]

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <HelpCircle className="mr-2" size={24} />
          Nowe zapytanie kurierskie
        </h2>
        <p className="text-green-100 text-sm mt-1">Wypełnij formularz, a nasz zespół skontaktuje się z Tobą</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Typ zapytania */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HelpCircle className="mr-2 text-green-600" size={20} />
            Typ zapytania
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {queryTypeOptions.map(option => (
              <label 
                key={option.value}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  formData.queryType === option.value 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="queryType"
                  value={option.value}
                  checked={formData.queryType === option.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-2xl mr-3">{option.icon}</span>
                <div>
                  <div className={`font-medium ${
                    formData.queryType === option.value ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {option.label}
                  </div>
                  <div className={`text-sm ${
                    formData.queryType === option.value ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {option.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Podstawowe informacje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorytet
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isUrgent"
                checked={formData.isUrgent}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                🚨 Sprawa pilna (do 24h)
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opis zapytania <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            placeholder="Opisz szczegółowo czego potrzebujesz..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        {/* Lokalizacja */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="mr-2 text-blue-600" size={20} />
            Lokalizacja
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="ul. Przykładowa 123"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Miasto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Warszawa"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kod pocztowy
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="00-001"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Osoba kontaktowa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="Jan Kowalski"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="600 800 900"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email kontaktowy
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="kontakt@firma.pl"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Szczegóły przesyłki - tylko dla pickup i delivery */}
        {(formData.queryType === 'pickup' || formData.queryType === 'delivery') && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="mr-2 text-purple-600" size={20} />
              Szczegóły przesyłki
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ przesyłki
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {packageTypeOptions.map(option => (
                    <label 
                      key={option.value}
                      className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.packageType === option.value 
                          ? 'border-purple-500 bg-purple-100' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="packageType"
                        value={option.value}
                        checked={formData.packageType === option.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-2xl mb-1">{option.icon}</span>
                      <span className="text-xs text-center">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ilość
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waga (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  step="0.1"
                  min="0.1"
                  placeholder="1.5"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wymiary (cm)
                </label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="30x20x10"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zawartość przesyłki
                </label>
                <input
                  type="text"
                  name="contentDescription"
                  value={formData.contentDescription}
                  onChange={handleChange}
                  placeholder="Dokumenty, części zamienne, próbki..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preferencje czasowe */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="mr-2 text-yellow-600" size={20} />
            Preferencje czasowe
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferowana data
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferowana pora dnia
              </label>
              <select
                name="preferredTime"
                value={formData.preferredTime}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informacje finansowe */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="mr-2 text-green-600" size={20} />
            Informacje finansowe
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sposób płatności
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="company"
                    checked={formData.paymentMethod === 'company'}
                    onChange={handleChange}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">🏢 Na firmę (przelew)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={handleChange}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">💵 Gotówka przy odbiorze</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleChange}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">💳 Karta przy odbiorze</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szacowany koszt (PLN)
              </label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="25.00"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Pozostaw puste jeśli nie wiesz</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uwagi do kosztów
              </label>
              <textarea
                name="costNotes"
                value={formData.costNotes}
                onChange={handleChange}
                rows="2"
                placeholder="Dodatkowe informacje o kosztach, budżecie, preferencjach cenowych..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Dodatkowe informacje */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="mr-2 text-gray-600" size={20} />
            Dodatkowe informacje
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specjalne instrukcje
            </label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows="3"
              placeholder="Dodatkowe wymagania, instrukcje specjalne, informacje o dostępności, kodach do bramy itp..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Podsumowanie */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Podsumowanie zapytania
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div><strong>Typ:</strong> {queryTypeOptions.find(opt => opt.value === formData.queryType)?.label}</div>
              <div><strong>Priorytet:</strong> {priorityOptions.find(opt => opt.value === formData.priority)?.label}</div>
              <div><strong>Pilne:</strong> {formData.isUrgent ? 'TAK' : 'NIE'}</div>
            </div>
            <div>
              <div><strong>Lokalizacja:</strong> {formData.city || 'Nie podano'}</div>
              <div><strong>Kontakt:</strong> {formData.contactPerson || 'Nie podano'}</div>
              <div><strong>Płatność:</strong> {
                formData.paymentMethod === 'company' ? 'Na firmę' :
                formData.paymentMethod === 'cash' ? 'Gotówka' : 'Karta'
              }</div>
            </div>
          </div>
          {formData.description && (
            <div className="mt-3 p-3 bg-white rounded border">
              <strong>Opis:</strong> {formData.description.substring(0, 150)}{formData.description.length > 150 ? '...' : ''}
            </div>
          )}
        </div>

        {/* Błędy */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <div className="text-red-400 mr-2">⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Przyciski formularza */}
        <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            📨 Wyślij zapytanie
          </button>
        </div>

        {/* Informacja o procesie */}
        <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600">
          <h4 className="font-medium text-gray-800 mb-2">ℹ️ Co dzieje się dalej?</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Twoje zapytanie zostanie przesłane do zespołu kurierskiego</li>
            <li>W ciągu 24h (lub 4h dla pilnych) otrzymasz odpowiedź</li>
            <li>Po akceptacji automatycznie utworzy się zlecenie DHL</li>
            <li>Otrzymasz numer śledzenia i etykietę do wydruku</li>
          </ol>
        </div>
      </div>
    </form>
  )
}
