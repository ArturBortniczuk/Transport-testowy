// src/app/kurier/components/KurierForm.js
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Building, Package2, ArrowRight, ArrowLeft, Clock, CheckCircle, AlertCircle, RefreshCw, Calculator, Truck, Shield, CreditCard, Calendar, Globe, Plus, Minus, Eye, Download } from 'lucide-react'

// Dane magazynów
const daneMagazynow = {
  bialystok: {
    nazwa: 'Magazyn Białystok',
    ulica: 'Przykładowa',
    numerDomu: '123',
    kodPocztowy: '15-400',
    miasto: 'Białystok',
    kraj: 'PL',
    osobaKontaktowa: 'Jan Kowalski',
    telefon: '123 456 789',
    email: 'bialystok@firma.pl'
  },
  zielonka: {
    nazwa: 'Magazyn Zielonka',
    ulica: 'Testowa',
    numerDomu: '456',
    kodPocztowy: '05-220',
    miasto: 'Zielonka',
    kraj: 'PL',
    osobaKontaktowa: 'Anna Nowak',
    telefon: '987 654 321',
    email: 'zielonka@firma.pl'
  }
}

// Lista krajów
const kraje = [
  { code: 'PL', name: 'Polska', eu: true },
  { code: 'DE', name: 'Niemcy', eu: true },
  { code: 'CZ', name: 'Czechy', eu: true },
  { code: 'SK', name: 'Słowacja', eu: true },
  { code: 'LT', name: 'Litwa', eu: true },
  { code: 'LV', name: 'Łotwa', eu: true },
  { code: 'EE', name: 'Estonia', eu: true },
  { code: 'US', name: 'USA', eu: false },
  { code: 'GB', name: 'Wielka Brytania', eu: false }
]

// Funkcje walidacji
const validatePostalCode = (code) => {
  const cleaned = code.replace(/[^\d]/g, '')
  if (cleaned.length === 5) {
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`
  }
  return null
}

const validatePhoneNumber = (phone) => {
  const cleaned = phone.replace(/[^\d]/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
  }
  return null
}

export default function KurierForm({ onSubmit, magazynNadawcy, userName, onCancel }) {
  const [typZlecenia, setTypZlecenia] = useState('nadawca_bialystok')
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Real-time validation & services
  const [postalServices, setPostalServices] = useState(null)
  const [checkingServices, setCheckingServices] = useState(false)
  const [servicesError, setServicesError] = useState('')
  
  // Real-time pricing
  const [pricing, setPricing] = useState(null)
  const [calculatingPrice, setCalculatingPrice] = useState(false)
  const [pricingError, setPricingError] = useState('')
  
  // Loading states
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    // Podstawowe dane
    typZlecenia: 'nadawca_bialystok',
    
    // Dane nadawcy
    nadawcaTyp: 'firma',
    nadawcaNazwa: '',
    nadawcaUlica: '',
    nadawcaNumerDomu: '',
    nadawcaNumerLokalu: '',
    nadawcaKodPocztowy: '',
    nadawcaMiasto: '',
    nadawcaKraj: 'PL',
    nadawcaOsobaKontaktowa: '',
    nadawcaTelefon: '',
    nadawcaEmail: '',
    
    // Dane odbiorcy
    odbiorcaTyp: 'osoba',
    odbiorcaNazwa: '',
    odbiorcaUlica: '',
    odbiorcaNumerDomu: '',
    odbiorcaNumerLokalu: '',
    odbiorcaKodPocztowy: '',
    odbiorcaMiasto: '',
    odbiorcaKraj: 'PL',
    odbiorcaOsobaKontaktowa: '',
    odbiorcaTelefon: '',
    odbiorcaEmail: '',
    
    // Szczegóły przesyłki
    zawartoscPrzesylki: '',
    MPK: '',
    uwagi: '',
    
    // Paczki
    paczki: [
      {
        id: 1,
        typ: 'PACKAGE',
        waga: '',
        dlugosc: '',
        szerokosc: '',
        wysokosc: '',
        ilosc: 1,
        niestandardowa: false
      }
    ],
    
    // Usługa DHL
    uslugaDHL: 'AH', // AH, 09, 12, DW, SP, EK, PI, PR, CP, CM
    
    // Dane międzynarodowe (uproszczone)
    daneMiedzynarodowe: {
      typOdprawy: 'U',
      wartoscTowarow: '',
      krajPochodzenia: 'PL'
    }
  })

  // Auto-fill based on type
  useEffect(() => {
    setFormData(prev => ({ ...prev, typZlecenia }))
    
    if (typZlecenia === 'nadawca_bialystok') {
      const dane = daneMagazynow.bialystok
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: dane.nazwa,
        nadawcaUlica: dane.ulica,
        nadawcaNumerDomu: dane.numerDomu,
        nadawcaKodPocztowy: dane.kodPocztowy,
        nadawcaMiasto: dane.miasto,
        nadawcaKraj: dane.kraj,
        nadawcaOsobaKontaktowa: dane.osobaKontaktowa,
        nadawcaTelefon: dane.telefon,
        nadawcaEmail: dane.email
      }))
    } else if (typZlecenia === 'nadawca_zielonka') {
      const dane = daneMagazynow.zielonka
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: dane.nazwa,
        nadawcaUlica: dane.ulica,
        nadawcaNumerDomu: dane.numerDomu,
        nadawcaKodPocztowy: dane.kodPocztowy,
        nadawcaMiasto: dane.miasto,
        nadawcaKraj: dane.kraj,
        nadawcaOsobaKontaktowa: dane.osobaKontaktowa,
        nadawcaTelefon: dane.telefon,
        nadawcaEmail: dane.email
      }))
    } else if (typZlecenia === 'odbiorca_bialystok') {
      const dane = daneMagazynow.bialystok
      setFormData(prev => ({
        ...prev,
        odbiorcaTyp: 'firma',
        odbiorcaNazwa: dane.nazwa,
        odbiorcaUlica: dane.ulica,
        odbiorcaNumerDomu: dane.numerDomu,
        odbiorcaKodPocztowy: dane.kodPocztowy,
        odbiorcaMiasto: dane.miasto,
        odbiorcaKraj: dane.kraj,
        odbiorcaOsobaKontaktowa: dane.osobaKontaktowa,
        odbiorcaTelefon: dane.telefon,
        odbiorcaEmail: dane.email
      }))
    } else if (typZlecenia === 'odbiorca_zielonka') {
      const dane = daneMagazynow.zielonka
      setFormData(prev => ({
        ...prev,
        odbiorcaTyp: 'firma',
        odbiorcaNazwa: dane.nazwa,
        odbiorcaUlica: dane.ulica,
        odbiorcaNumerDomu: dane.numerDomu,
        odbiorcaKodPocztowy: dane.kodPocztowy,
        odbiorcaMiasto: dane.miasto,
        odbiorcaKraj: dane.kraj,
        odbiorcaOsobaKontaktowa: dane.osobaKontaktowa,
        odbiorcaTelefon: dane.telefon,
        odbiorcaEmail: dane.email
      }))
    }
    // Resetuj pola gdy wybieramy trzecią stronę (nie auto-uzupełniamy)
  }, [typZlecenia])

  // Calculate price function - UPROSZCZONA
  const calculatePrice = useCallback(async () => {
    if (!formData.nadawcaKodPocztowy || !formData.odbiorcaKodPocztowy || !formData.paczki[0]?.waga) {
      return
    }

    setCalculatingPrice(true)
    setPricingError('')

    try {
      const response = await fetch('/api/kurier/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPostalCode: formData.nadawcaKodPocztowy,
          toPostalCode: formData.odbiorcaKodPocztowy,
          packages: formData.paczki,
          service: formData.uslugaDHL
        })
      })

      const data = await response.json()

      if (data.success) {
        setPricing(data.pricing)
      } else {
        setPricingError(data.error || 'Błąd kalkulacji ceny')
      }
    } catch (err) {
      setPricingError('Błąd podczas kalkulacji ceny')
    } finally {
      setCalculatingPrice(false)
    }
  }, [formData.nadawcaKodPocztowy, formData.odbiorcaKodPocztowy, formData.paczki, formData.uslugaDHL])

  // Auto-calculate price when data changes - UPROSZCZONE
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculatePrice()
    }, 1000)

    return () => clearTimeout(debounceTimer)
  }, [calculatePrice])

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    let processedValue = type === 'checkbox' ? checked : value

    // Auto-formatting
    if (name.includes('KodPocztowy')) {
      let cleaned = value.replace(/[^\d]/g, '')
      if (cleaned.length >= 2) {
        processedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}`
      } else {
        processedValue = cleaned
      }
    } else if (name.includes('Telefon')) {
      let cleaned = value.replace(/[^\d]/g, '')
      if (cleaned.length <= 3) {
        processedValue = cleaned
      } else if (cleaned.length <= 6) {
        processedValue = `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`
      } else {
        processedValue = `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`
      }
    }

    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: processedValue }))
    }
  }

  // Package functions
  const addPackage = () => {
    const newPackage = {
      id: Date.now(),
      typ: 'PACKAGE',
      waga: '',
      dlugosc: '',
      szerokosc: '',
      wysokosc: '',
      ilosc: 1,
      niestandardowa: false
    }
    setFormData(prev => ({
      ...prev,
      paczki: [...prev.paczki, newPackage]
    }))
  }

  const removePackage = (packageId) => {
    setFormData(prev => ({
      ...prev,
      paczki: prev.paczki.filter(p => p.id !== packageId)
    }))
  }

  // Funkcja sprawdzająca czy wymiary są niestandardowe
  const checkNonStandardDimensions = (length, width) => {
    const l = parseInt(length) || 0
    const w = parseInt(width) || 0
    // Niestandardowe jeśli > 120x80 lub 80x120
    return (l > 120 && w > 80) || (l > 80 && w > 120)
  }

  const updatePackage = (packageId, field, value) => {
    setFormData(prev => ({
      ...prev,
      paczki: prev.paczki.map(p => {
        if (p.id !== packageId) return p
        
        const updatedPackage = { ...p, [field]: value }
        
        // Automatycznie ustaw niestandardowa=true jeśli wymiary są za duże
        if (field === 'dlugosc' || field === 'szerokosc') {
          updatedPackage.niestandardowa = checkNonStandardDimensions(
            updatedPackage.dlugosc, 
            updatedPackage.szerokosc
          )
        }
        
        return updatedPackage
      })
    }))
  }

  // Step navigation - POMIJAMY KROK 3
  const nextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2) // Z kroku 1 do 2
    } else if (currentStep === 2) {
      setCurrentStep(4) // Z kroku 2 BEZPOŚREDNIO do 4 (pomijamy krok 3)
    }
  }

  const prevStep = () => {
    if (currentStep === 4) {
      setCurrentStep(2) // Z kroku 4 z powrotem do 2
    } else if (currentStep === 2) {
      setCurrentStep(1) // Z kroku 2 do 1
    }
  }

  // Check if international shipment
  const isInternational = formData.nadawcaKraj !== formData.odbiorcaKraj
  const isOutsideEU = !kraje.find(k => k.code === formData.odbiorcaKraj)?.eu

  // Form validation - POMIJAMY KROK 3
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.nadawcaNazwa && formData.nadawcaKodPocztowy && formData.nadawcaMiasto && 
               formData.odbiorcaNazwa && formData.odbiorcaKodPocztowy && formData.odbiorcaMiasto
      case 2:
        return formData.zawartoscPrzesylki && formData.paczki[0].waga && 
               formData.paczki[0].dlugosc && formData.paczki[0].szerokosc && formData.paczki[0].wysokosc
      case 4: // Krok 4 (podgląd) - zawsze prawda
        return true
      default:
        return false
    }
  }

  // Render postal services
  const renderPostalServices = () => {
    if (checkingServices) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="animate-spin text-blue-600" size={16} />
            <span className="text-blue-800 text-sm">Sprawdzanie usług DHL...</span>
          </div>
        </div>
      )
    }

    if (servicesError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-600" size={16} />
            <span className="text-red-800 text-sm">{servicesError}</span>
          </div>
        </div>
      )
    }

    if (postalServices) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="text-green-600" size={16} />
            <span className="text-green-800 font-medium text-sm">Dostępne usługi DHL:</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-2 rounded ${postalServices.domesticExpress9 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-medium">Domestic Express 9</div>
              <div>Dostawa do 9:00</div>
            </div>
            
            <div className={`p-2 rounded ${postalServices.domesticExpress12 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-medium">Domestic Express 12</div>
              <div>Dostawa do 12:00</div>
            </div>
            
            <div className={`p-2 rounded ${postalServices.deliveryEvening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-medium">Dostawa wieczorna</div>
              <div>Dostawa do 20:00</div>
            </div>
            
            <div className={`p-2 rounded ${postalServices.deliverySaturday ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-medium">Dostawa sobota</div>
              <div>Dostawa w sobotę</div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // Final validation
      const nadawcaPostalValid = validatePostalCode(formData.nadawcaKodPocztowy)
      const odbiorcaPostalValid = validatePostalCode(formData.odbiorcaKodPocztowy)
      
      if (!nadawcaPostalValid || !odbiorcaPostalValid) {
        setError('Nieprawidłowe kody pocztowe')
        return
      }

      const nadawcaPhoneValid = validatePhoneNumber(formData.nadawcaTelefon)
      const odbiorcaPhoneValid = validatePhoneNumber(formData.odbiorcaTelefon)
      
      if (!nadawcaPhoneValid || !odbiorcaPhoneValid) {
        setError('Nieprawidłowe numery telefonów')
        return
      }

      // Prepare data for submission - UPROSZCZONE
      const dataToSubmit = {
        ...formData,
        typZlecenia: typZlecenia,
        nadawcaKodPocztowy: nadawcaPostalValid,
        odbiorcaKodPocztowy: odbiorcaPostalValid,
        nadawcaTelefon: nadawcaPhoneValid,
        odbiorcaTelefon: odbiorcaPhoneValid,
        pricing: pricing,
        postalServices: postalServices
      }

      console.log('Submitting advanced order:', dataToSubmit)
      
      await onSubmit(dataToSubmit)
      setSuccess('Zamówienie zostało złożone pomyślnie!')
      
    } catch (error) {
      setError(error.message || 'Wystąpił błąd podczas składania zamówienia')
    } finally {
      setSubmitting(false)
    }
  }

  const isNadawcaReadonly = typZlecenia.includes('nadawca_')
  const isOdbiorcaReadonly = typZlecenia.includes('odbiorca_')
  const isTrzeciaStrona = typZlecenia === 'trzecia_strona'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Nowe zamówienie kuriera DHL</h2>
            <p className="text-blue-100 mt-1">
              Krok {currentStep === 4 ? 3 : currentStep} z 3
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-blue-100 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Order Type Selection - TYLKO W KROKU 1 */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Typ zlecenia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { value: 'nadawca_bialystok', label: 'Nadawca: Białystok', icon: '📤', desc: 'Wysyłka z magazynu Białystok' },
              { value: 'nadawca_zielonka', label: 'Nadawca: Zielonka', icon: '📤', desc: 'Wysyłka z magazynu Zielonka' },
              { value: 'odbiorca_bialystok', label: 'Odbiorca: Białystok', icon: '📥', desc: 'Dostawa do magazynu Białystok' },
              { value: 'odbiorca_zielonka', label: 'Odbiorca: Zielonka', icon: '📥', desc: 'Dostawa do magazynu Zielonka' },
              { value: 'trzecia_strona', label: 'Trzecia strona', icon: '🏢', desc: 'Płatnik zewnętrzny' }
            ].map(option => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="typZlecenia"
                  value={option.value}
                  checked={typZlecenia === option.value}
                  onChange={(e) => setTypZlecenia(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 rounded-lg border-2 transition-colors ${
                  typZlecenia === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: SENDER & RECEIVER */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Building className="mr-2 text-blue-600" />
            Krok 1: Dane nadawcy i odbiorcy
          </h3>

          {/* SENDER */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="mr-2 text-blue-600" />
              Nadawca
              {isNadawcaReadonly && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Auto-uzupełnione
                </span>
              )}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Typ <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="nadawcaTyp"
                  value={formData.nadawcaTyp}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isNadawcaReadonly}
                >
                  <option value="firma">Firma</option>
                  <option value="osoba">Osoba prywatna</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwa/Imię i nazwisko <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="nadawcaNazwa"
                  value={formData.nadawcaNazwa}
                  onChange={handleChange}
                  placeholder="Nazwa firmy lub imię i nazwisko"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ulica <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="nadawcaUlica"
                  value={formData.nadawcaUlica}
                  onChange={handleChange}
                  placeholder="Nazwa ulicy"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nr domu <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="nadawcaNumerDomu"
                    value={formData.nadawcaNumerDomu}
                    onChange={handleChange}
                    placeholder="123"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                    disabled={isNadawcaReadonly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nr lokalu</label>
                  <input
                    type="text"
                    name="nadawcaNumerLokalu"
                    value={formData.nadawcaNumerLokalu}
                    onChange={handleChange}
                    placeholder="4"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    disabled={isNadawcaReadonly}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kod pocztowy <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="nadawcaKodPocztowy"
                  value={formData.nadawcaKodPocztowy}
                  onChange={handleChange}
                  placeholder="12-345"
                  maxLength="6"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Miasto <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="nadawcaMiasto"
                  value={formData.nadawcaMiasto}
                  onChange={handleChange}
                  placeholder="Warszawa"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kraj <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="nadawcaKraj"
                  value={formData.nadawcaKraj}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                >
                  {kraje.map(kraj => (
                    <option key={kraj.code} value={kraj.code}>{kraj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Osoba kontaktowa</label>
                <input
                  type="text"
                  name="nadawcaOsobaKontaktowa"
                  value={formData.nadawcaOsobaKontaktowa}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefon <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="tel"
                  name="nadawcaTelefon"
                  value={formData.nadawcaTelefon}
                  onChange={handleChange}
                  placeholder="123 456 789"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isNadawcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="nadawcaEmail"
                  value={formData.nadawcaEmail}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    isNadawcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  disabled={isNadawcaReadonly}
                />
              </div>
            </div>
          </div>

          {/* RECEIVER */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="mr-2 text-green-600" />
              Odbiorca
              {isOdbiorcaReadonly && (
                <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Auto-uzupełnione
                </span>
              )}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Typ <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="odbiorcaTyp"
                  value={formData.odbiorcaTyp}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  disabled={isOdbiorcaReadonly}
                >
                  <option value="firma">Firma</option>
                  <option value="osoba">Osoba prywatna</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwa/Imię i nazwisko <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="odbiorcaNazwa"
                  value={formData.odbiorcaNazwa}
                  onChange={handleChange}
                  placeholder="Nazwa firmy lub imię i nazwisko"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ulica <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="odbiorcaUlica"
                  value={formData.odbiorcaUlica}
                  onChange={handleChange}
                  placeholder="Nazwa ulicy"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nr domu <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="odbiorcaNumerDomu"
                    value={formData.odbiorcaNumerDomu}
                    onChange={handleChange}
                    placeholder="123"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                      isOdbiorcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                    disabled={isOdbiorcaReadonly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nr lokalu</label>
                  <input
                    type="text"
                    name="odbiorcaNumerLokalu"
                    value={formData.odbiorcaNumerLokalu}
                    onChange={handleChange}
                    placeholder="4"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                      isOdbiorcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    disabled={isOdbiorcaReadonly}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kod pocztowy <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="odbiorcaKodPocztowy"
                  value={formData.odbiorcaKodPocztowy}
                  onChange={handleChange}
                  placeholder="12-345"
                  maxLength="6"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Miasto <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="odbiorcaMiasto"
                  value={formData.odbiorcaMiasto}
                  onChange={handleChange}
                  placeholder="Warszawa"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kraj <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="odbiorcaKraj"
                  value={formData.odbiorcaKraj}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                >
                  {kraje.map(kraj => (
                    <option key={kraj.code} value={kraj.code}>{kraj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Osoba kontaktowa</label>
                <input
                  type="text"
                  name="odbiorcaOsobaKontaktowa"
                  value={formData.odbiorcaOsobaKontaktowa}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefon <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="tel"
                  name="odbiorcaTelefon"
                  value={formData.odbiorcaTelefon}
                  onChange={handleChange}
                  placeholder="123 456 789"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  required
                  disabled={isOdbiorcaReadonly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="odbiorcaEmail"
                  value={formData.odbiorcaEmail}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                    isOdbiorcaReadonly ? 'bg-gray-100' : ''
                  }`}
                  disabled={isOdbiorcaReadonly}
                />
              </div>
            </div>

            {/* POSTAL SERVICES CHECK */}
            {renderPostalServices()}
          </div>
        </div>
      )}

      {/* STEP 2: PACKAGES & CONTENT */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Package2 className="mr-2 text-purple-600" />
            Krok 2: Paczki i zawartość
          </h3>

          {/* CONTENT */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Zawartość przesyłki</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Zawartość <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="zawartoscPrzesylki"
                  value={formData.zawartoscPrzesylki}
                  onChange={handleChange}
                  placeholder="Np. Dokumenty, części, próbki..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">MPK</label>
                <input
                  type="text"
                  name="MPK"
                  value={formData.MPK}
                  onChange={handleChange}
                  placeholder="Opcjonalnie"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Uwagi</label>
                <textarea
                  name="uwagi"
                  value={formData.uwagi}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Dodatkowe informacje dla kuriera..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* PACKAGES */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Paczki w przesyłce</h4>
              <button
                type="button"
                onClick={addPackage}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <Plus size={16} />
                <span>Dodaj paczkę</span>
              </button>
            </div>

            {formData.paczki.map((paczka, index) => (
              <div key={paczka.id} className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium text-gray-900">Paczka {index + 1}</h5>
                  {formData.paczki.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePackage(paczka.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Waga (kg) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={paczka.waga}
                      onChange={(e) => updatePackage(paczka.id, 'waga', e.target.value)}
                      placeholder="1.5"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Długość (cm) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={paczka.dlugosc}
                      onChange={(e) => updatePackage(paczka.id, 'dlugosc', e.target.value)}
                      placeholder="30"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Szerokość (cm) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={paczka.szerokosc}
                      onChange={(e) => updatePackage(paczka.id, 'szerokosc', e.target.value)}
                      placeholder="20"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Wysokość (cm) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={paczka.wysokosc}
                      onChange={(e) => updatePackage(paczka.id, 'wysokosc', e.target.value)}
                      placeholder="10"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ilość</label>
                    <input
                      type="number"
                      min="1"
                      value={paczka.ilosc}
                      onChange={(e) => updatePackage(paczka.id, 'ilosc', e.target.value)}
                      placeholder="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Informacja o niestandardowych wymiarach */}
                {paczka.niestandardowa && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="text-yellow-600" size={16} />
                      <span className="text-yellow-800 font-medium text-sm">
                        Paczka niestandardowa
                      </span>
                    </div>
                    <p className="text-yellow-700 text-xs mt-1">
                      Wymiary przekraczają 120×80 cm lub 80×120 cm. Mogą wystąpić dodatkowe koszty.
                    </p>
                  </div>
                )}

                {/* Typ paczki */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Typ paczki</label>
                  <select
                    value={paczka.typ}
                    onChange={(e) => updatePackage(paczka.id, 'typ', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="PACKAGE">Paczka</option>
                    <option value="PALLET">Paleta</option>
                    <option value="ENVELOPE">Koperta</option>
                    <option value="DOCUMENT">Dokumenty</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: SERVICES & OPTIONS */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-2 text-indigo-600" />
            Krok 3: Usługi i opcje (opcjonalne)
          </h3>

          {/* DHL SERVICE */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Usługa DHL</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Typ usługi</label>
                <select
                  name="uslugaDHL"
                  value={formData.uslugaDHL}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="AH">Express (AH)</option>
                  <option value="09">Express 9:00 (09)</option>
                  <option value="12">Express 12:00 (12)</option>
                  <option value="DW">Express Wieczór (DW)</option>
                  <option value="SP">Express Sobota (SP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADDITIONAL SERVICES */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Usługi dodatkowe</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="uslugiDodatkowe.ubezpieczenie"
                  checked={formData.uslugiDodatkowe.ubezpieczenie}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <label className="text-sm font-medium text-gray-700">Ubezpieczenie dodatkowe</label>
              </div>

              {formData.uslugiDodatkowe.ubezpieczenie && (
                <div className="ml-6">
                  <input
                    type="number"
                    name="uslugiDodatkowe.wartoscUbezpieczenia"
                    value={formData.uslugiDodatkowe.wartoscUbezpieczenia}
                    onChange={handleChange}
                    placeholder="Wartość w PLN"
                    className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="uslugiDodatkowe.pobranie"
                  checked={formData.uslugiDodatkowe.pobranie}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <label className="text-sm font-medium text-gray-700">Pobranie</label>
              </div>

              {formData.uslugiDodatkowe.pobranie && (
                <div className="ml-6">
                  <input
                    type="number"
                    name="uslugiDodatkowe.wartoscPobrania"
                    value={formData.uslugiDodatkowe.wartoscPobrania}
                    onChange={handleChange}
                    placeholder="Kwota pobrania w PLN"
                    className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* INTERNATIONAL */}
          {isInternational && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="mr-2 text-red-600" />
                Przesyłka międzynarodowa
              </h4>
              
              <div className="space-y-4">
                <p className="text-sm text-red-800">
                  ⚠️ To jest przesyłka międzynarodowa z {formData.nadawcaKraj} do {formData.odbiorcaKraj}.
                  {isOutsideEU && ' Ta przesyłka idzie poza UE - wymagana odprawa celna.'}
                </p>
                
                {isOutsideEU && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Typ odprawy celnej
                      </label>
                      <select
                        name="daneMiedzynarodowe.typOdprawy"
                        value={formData.daneMiedzynarodowe.typOdprawy}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                      >
                        <option value="U">Uproszczona</option>
                        <option value="I">Indywidualna</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Wartość towarów (PLN)
                      </label>
                      <input
                        type="number"
                        name="daneMiedzynarodowe.wartoscTowarow"
                        value={formData.daneMiedzynarodowe.wartoscTowarow}
                        onChange={handleChange}
                        placeholder="100.00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Eye className="mr-2 text-gray-600" />
            Krok 4: Podgląd i potwierdzenie
          </h3>

          {/* ORDER SUMMARY */}
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie zamówienia</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Summary */}
              <div className="bg-white p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">📤 Nadawca</h5>
                <div className="text-sm space-y-1">
                  <div><strong>{formData.nadawcaNazwa}</strong></div>
                  <div>{formData.nadawcaUlica} {formData.nadawcaNumerDomu}/{formData.nadawcaNumerLokalu}</div>
                  <div>{formData.nadawcaKodPocztowy} {formData.nadawcaMiasto}</div>
                  <div>{formData.nadawcaTelefon}</div>
                </div>
              </div>

              {/* Receiver Summary */}
              <div className="bg-white p-4 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">📥 Odbiorca</h5>
                <div className="text-sm space-y-1">
                  <div><strong>{formData.odbiorcaNazwa}</strong></div>
                  <div>{formData.odbiorcaUlica} {formData.odbiorcaNumerDomu}/{formData.odbiorcaNumerLokalu}</div>
                  <div>{formData.odbiorcaKodPocztowy} {formData.odbiorcaMiasto}</div>
                  <div>{formData.odbiorcaTelefon}</div>
                </div>
              </div>

              {/* Packages Summary */}
              <div className="bg-white p-4 rounded-lg">
                <h5 className="font-medium text-purple-900 mb-2">📦 Paczki ({formData.paczki.length})</h5>
                <div className="text-sm space-y-2">
                  {formData.paczki.map((paczka, index) => (
                    <div key={paczka.id} className="p-2 bg-gray-50 rounded">
                      <div>Paczka {index + 1}: {paczka.waga}kg</div>
                      <div>{paczka.dlugosc}×{paczka.szerokosc}×{paczka.wysokosc}cm</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Summary */}
              <div className="bg-white p-4 rounded-lg">
                <h5 className="font-medium text-orange-900 mb-2">📋 Zawartość</h5>
                <div className="text-sm space-y-1">
                  <div><strong>Zawartość:</strong> {formData.zawartoscPrzesylki}</div>
                  {formData.MPK && <div><strong>MPK:</strong> {formData.MPK}</div>}
                  {formData.uwagi && <div><strong>Uwagi:</strong> {formData.uwagi}</div>}
                </div>
              </div>
            </div>

            {/* Pricing */}
            {pricing && (
              <div className="bg-white p-4 rounded-lg mt-4 border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">💰 Kalkulacja kosztów</h5>
                <div className="text-sm space-y-1">
                  <div><strong>Koszt podstawowy:</strong> {pricing.basePrice} PLN</div>
                  {pricing.additionalServices && (
                    <div><strong>Usługi dodatkowe:</strong> {pricing.additionalServices} PLN</div>
                  )}
                  <div className="font-medium text-lg text-green-800">
                    <strong>CAŁKOWITY KOSZT:</strong> {pricing.totalPrice} PLN
                  </div>
                </div>
              </div>
            )}

            {calculatingPrice && (
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="animate-spin text-blue-600" size={16} />
                  <span className="text-blue-800 text-sm">Kalkulacja ceny...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION BUTTONS */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          {/* Back button */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Poprzedni krok</span>
            </button>
          )}

          {/* Spacer */}
          {currentStep === 1 && <div></div>}

          {/* Next/Submit button */}
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Następny krok</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Składanie zamówienia...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Złóż zamówienie kuriera</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* STEP INDICATOR - TYLKO 3 KROKI */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            {[1, 2, 4].map(step => ( // Pokazujemy kroki 1, 2, 4 (ale wizualnie jako 1, 2, 3)
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step === currentStep ? 'bg-blue-600' :
                  step < currentStep || (step === 4 && currentStep === 4) ? 'bg-green-600' :
                  'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </form>
  )
}
