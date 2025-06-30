'use client'
import { useState, useEffect } from 'react'
import { Building, Package2, ArrowRight, ArrowLeft, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function KurierForm({ onSubmit, magazynNadawcy, userName, onCancel }) {
  const [typZlecenia, setTypZlecenia] = useState('nadawca_bialystok') 
  const [error, setError] = useState('')
  const [postalServices, setPostalServices] = useState(null)
  const [checkingServices, setCheckingServices] = useState(false)
  const [servicesError, setServicesError] = useState('')
  
  const [formData, setFormData] = useState({
    // Dane nadawcy
    nadawcaTyp: 'firma',
    nadawcaNazwa: '',
    nadawcaUlica: '',
    nadawcaNumerDomu: '',
    nadawcaNumerLokalu: '',
    nadawcaKodPocztowy: '',
    nadawcaMiasto: '',
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
    odbiorcaOsobaKontaktowa: '',
    odbiorcaTelefon: '',
    odbiorcaEmail: '',
    
    // Szczegóły przesyłki
    zawartoscPrzesylki: '',
    MPK: '',
    uwagi: '',
    iloscPaczek: 1,
    waga: '',
    dlugosc: '',
    szerokosc: '',
    wysokosc: ''
  })

  // Dane magazynów - POPRAWIONE dla DHL
  const daneMagazynow = {
    bialystok: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Białystok',
      ulica: 'Wysockiego',
      numerDomu: '69B',
      kodPocztowy: '15-169', // ← Format z kreską dla użytkownika
      miasto: 'Białystok',
      osobaKontaktowa: 'Magazyn Białystok',
      telefon: '857 152 705', // ← Format z spacjami dla użytkownika
      email: 'bialystok@grupaeltron.pl'
    },
    zielonka: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Zielonka',
      ulica: 'Krótka',
      numerDomu: '2',
      kodPocztowy: '05-220', // ← Format z kreską dla użytkownika
      miasto: 'Zielonka',
      osobaKontaktowa: 'Magazyn Zielonka',
      telefon: '857 152 705', // ← Format z spacjami dla użytkownika
      email: 'zielonka@grupaeltron.pl'
    }
  }

  // Opcje zleceń
  const opcjeZlecen = [
    {
      value: 'nadawca_bialystok',
      label: 'Nadawca Białystok',
      opis: 'Wysyłamy z magazynu Białystok',
      icon: ArrowRight,
      color: 'blue'
    },
    {
      value: 'nadawca_zielonka',
      label: 'Nadawca Zielonka', 
      opis: 'Wysyłamy z magazynu Zielonka',
      icon: ArrowRight,
      color: 'blue'
    },
    {
      value: 'odbiorca_bialystok',
      label: 'Odbiorca Białystok',
      opis: 'Dostarczamy do magazynu Białystok',
      icon: ArrowLeft,
      color: 'green'
    },
    {
      value: 'odbiorca_zielonka',
      label: 'Odbiorca Zielonka',
      opis: 'Dostarczamy do magazynu Zielonka', 
      icon: ArrowLeft,
      color: 'green'
    },
    {
      value: 'trzecia_strona',
      label: 'Trzecia Strona',
      opis: 'Transport między zewnętrznymi stronami',
      icon: Package2,
      color: 'purple'
    }
  ]

  // NOWA FUNKCJA: Walidacja kodu pocztowego - akceptuje format XX-XXX
  const validatePostalCode = (code) => {
    // Usuń wszystko oprócz cyfr
    const cleaned = code.replace(/[^\d]/g, '')
    // Polski kod pocztowy: 5 cyfr
    return cleaned.length === 5 ? cleaned : null
  }

  // NOWA FUNKCJA: Formatowanie kodu pocztowego dla wyświetlania (XX-XXX)
  const formatPostalCodeDisplay = (code) => {
    const cleaned = code.replace(/[^\d]/g, '')
    if (cleaned.length === 5) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`
    }
    return code
  }

  // NOWA FUNKCJA: Walidacja numeru telefonu
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/[^\d]/g, '')
    let validPhone = cleaned
    if (validPhone.startsWith('48')) {
      validPhone = validPhone.substring(2)
    }
    if (validPhone.startsWith('0')) {
      validPhone = validPhone.substring(1)
    }
    return validPhone.length === 9 ? validPhone : null
  }

  // NOWA FUNKCJA: Formatowanie telefonu dla wyświetlania (XXX XXX XXX)
  const formatPhoneDisplay = (phone) => {
    const cleaned = phone.replace(/[^\d]/g, '')
    if (cleaned.length === 9) {
      return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
    }
    return phone
  }

  // NOWA FUNKCJA: Sprawdzanie usług DHL dla kodu pocztowego
  const checkPostalServices = async (postCode, city, street = '', houseNumber = '') => {
    const cleanedPostCode = validatePostalCode(postCode)
    if (!cleanedPostCode || !city) {
      return
    }

    setCheckingServices(true)
    setServicesError('')
    
    try {
      console.log('🔍 Sprawdzanie usług DHL dla kodu:', cleanedPostCode)
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const pickupDate = tomorrow.toISOString().split('T')[0]
      
      const response = await fetch('/api/kurier/postal-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postCode: cleanedPostCode,
          pickupDate: pickupDate,
          city: city,
          street: street,
          houseNumber: houseNumber
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPostalServices(data.services)
        console.log('✅ Usługi DHL pobrane:', data.services)
      } else {
        setServicesError(data.error)
        setPostalServices(null)
        console.warn('⚠️ Błąd usług DHL:', data.error)
      }
    } catch (error) {
      console.error('💥 Błąd sprawdzania usług DHL:', error)
      setServicesError('Nie udało się sprawdzić usług DHL')
      setPostalServices(null)
    } finally {
      setCheckingServices(false)
    }
  }

  // Automatyczne uzupełnianie gdy zmienia się typ zlecenia
  useEffect(() => {
    const resetFormData = () => {
      setFormData(prev => ({
        ...prev,
        // Reset nadawcy
        nadawcaTyp: 'firma',
        nadawcaNazwa: '',
        nadawcaUlica: '',
        nadawcaNumerDomu: '',
        nadawcaNumerLokalu: '',
        nadawcaKodPocztowy: '',
        nadawcaMiasto: '',
        nadawcaOsobaKontaktowa: '',
        nadawcaTelefon: '',
        nadawcaEmail: '',
        
        // Reset odbiorcy
        odbiorcaTyp: 'osoba',
        odbiorcaNazwa: '',
        odbiorcaUlica: '',
        odbiorcaNumerDomu: '',
        odbiorcaNumerLokalu: '',
        odbiorcaKodPocztowy: '',
        odbiorcaMiasto: '',
        odbiorcaOsobaKontaktowa: '',
        odbiorcaTelefon: '',
        odbiorcaEmail: ''
      }))
    }

    resetFormData()
    setPostalServices(null) // Reset usług przy zmianie typu

    // Uzupełnij odpowiednie dane w zależności od typu zlecenia
    if (typZlecenia === 'nadawca_bialystok') {
      const dane = daneMagazynow.bialystok
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: dane.nazwa,
        nadawcaUlica: dane.ulica,
        nadawcaNumerDomu: dane.numerDomu,
        nadawcaKodPocztowy: dane.kodPocztowy, // Format z kreską
        nadawcaMiasto: dane.miasto,
        nadawcaOsobaKontaktowa: dane.osobaKontaktowa,
        nadawcaTelefon: dane.telefon, // Format z spacjami
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
        nadawcaKodPocztowy: dane.kodPocztowy, // Format z kreską
        nadawcaMiasto: dane.miasto,
        nadawcaOsobaKontaktowa: dane.osobaKontaktowa,
        nadawcaTelefon: dane.telefon, // Format z spacjami
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
        odbiorcaKodPocztowy: dane.kodPocztowy, // Format z kreską
        odbiorcaMiasto: dane.miasto,
        odbiorcaOsobaKontaktowa: dane.osobaKontaktowa,
        odbiorcaTelefon: dane.telefon, // Format z spacjami
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
        odbiorcaKodPocztowy: dane.kodPocztowy, // Format z kreską
        odbiorcaMiasto: dane.miasto,
        odbiorcaOsobaKontaktowa: dane.osobaKontaktowa,
        odbiorcaTelefon: dane.telefon, // Format z spacjami
        odbiorcaEmail: dane.email
      }))
    }
  }, [typZlecenia])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    let processedValue = type === 'checkbox' ? checked : value

    // Automatyczne formatowanie kodów pocztowych
    if (name.includes('KodPocztowy')) {
      // Usuń wszystko oprócz cyfr
      let cleaned = value.replace(/[^\d]/g, '')
      // Automatycznie dodaj kreską po 2 cyfrach
      if (cleaned.length >= 2) {
        processedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}`
      } else {
        processedValue = cleaned
      }
    } else if (name.includes('Telefon')) {
      // Automatyczne formatowanie telefonów
      let cleaned = value.replace(/[^\d]/g, '')
      if (cleaned.length >= 3 && cleaned.length <= 9) {
        if (cleaned.length <= 3) {
          processedValue = cleaned
        } else if (cleaned.length <= 6) {
          processedValue = `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`
        } else {
          processedValue = `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`
        }
      } else {
        processedValue = cleaned.substring(0, 9)
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))

    // NOWA LOGIKA: Sprawdź usługi DHL gdy kod pocztowy odbiorcy się zmieni
    if (name === 'odbiorcaKodPocztowy' && processedValue.length === 6) { // XX-XXX
      const miasto = formData.odbiorcaMiasto
      const ulica = formData.odbiorcaUlica
      const numerDomu = formData.odbiorcaNumerDomu
      
      if (miasto) {
        // Debounce - sprawdź po krótkiej przerwie
        setTimeout(() => {
          checkPostalServices(processedValue, miasto, ulica, numerDomu)
        }, 500)
      }
    }

    // Sprawdź usługi także gdy miasto się zmieni
    if (name === 'odbiorcaMiasto' && formData.odbiorcaKodPocztowy.length === 6) {
      setTimeout(() => {
        checkPostalServices(formData.odbiorcaKodPocztowy, processedValue, formData.odbiorcaUlica, formData.odbiorcaNumerDomu)
      }, 500)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Walidacja kodów pocztowych - konwertuj do formatu DHL (tylko cyfry)
    const nadawcaPostalValid = validatePostalCode(formData.nadawcaKodPocztowy)
    const odbiorcaPostalValid = validatePostalCode(formData.odbiorcaKodPocztowy)
    
    if (!nadawcaPostalValid) {
      setError('Kod pocztowy nadawcy musi mieć format: XX-XXX (np. 15-169)')
      return
    }
    
    if (!odbiorcaPostalValid) {
      setError('Kod pocztowy odbiorcy musi mieć format: XX-XXX (np. 24-100)')
      return
    }

    // Walidacja numerów telefonów - konwertuj do formatu DHL (tylko cyfry)
    const nadawcaPhoneValid = validatePhoneNumber(formData.nadawcaTelefon)
    const odbiorcaPhoneValid = validatePhoneNumber(formData.odbiorcaTelefon)
    
    if (!nadawcaPhoneValid) {
      setError('Telefon nadawcy musi mieć 9 cyfr (format: XXX XXX XXX)')
      return
    }
    
    if (!odbiorcaPhoneValid) {
      setError('Telefon odbiorcy musi mieć 9 cyfr (format: XXX XXX XXX)')
      return
    }

    // Walidacja wagi i wymiarów
    if (formData.waga > 1000) {
      setError('Maksymalna waga przesyłki to 1000 kg')
      return
    }

    if (formData.dlugosc > 160 || formData.szerokosc > 160 || formData.wysokosc > 160) {
      setError('Maksymalny wymiar przesyłki to 160 cm')
      return
    }

    // Przygotuj dane w formacie DHL (konwertuj kody i telefony)
    const dataToSubmit = {
      ...formData,
      typZlecenia: typZlecenia,
      // Konwertuj kody pocztowe do formatu DHL (tylko cyfry)
      nadawcaKodPocztowy: nadawcaPostalValid,
      odbiorcaKodPocztowy: odbiorcaPostalValid,
      // Konwertuj telefony do formatu DHL (tylko cyfry)
      nadawcaTelefon: nadawcaPhoneValid,
      odbiorcaTelefon: odbiorcaPhoneValid
    }

    console.log('Dane przygotowane dla DHL:', dataToSubmit)
    onSubmit(dataToSubmit)
    
    // Reset formularza
    setTypZlecenia('nadawca_bialystok')
    setError('')
    setPostalServices(null)
  }

  // Komponent wyświetlający usługi DHL
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
              <div className="font-medium">Dostawa w sobotę</div>
              <div>Dostawa sobota</div>
            </div>
          </div>
          
          {(postalServices.exPickupFrom || postalServices.drPickupFrom) && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="text-green-800 font-medium text-xs mb-2">Okna czasowe odbioru:</div>
              {postalServices.exPickupFrom && (
                <div className="text-xs text-green-700">
                  <Clock size={12} className="inline mr-1" />
                  Ekspresowe: {postalServices.exPickupFrom} - {postalServices.exPickupTo}
                </div>
              )}
              {postalServices.drPickupFrom && (
                <div className="text-xs text-green-700">
                  <Clock size={12} className="inline mr-1" />
                  Drobnicowe: {postalServices.drPickupFrom} - {postalServices.drPickupTo}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  // Pomocnicze funkcje do sprawdzania czy pola mają być zablokowane
  const isNadawcaReadonly = typZlecenia === 'nadawca_bialystok' || typZlecenia === 'nadawca_zielonka'
  const isOdbiorcaReadonly = typZlecenia === 'odbiorca_bialystok' || typZlecenia === 'odbiorca_zielonka'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Nowe zamówienie kuriera</h2>
        <p className="text-blue-100 text-sm mt-1">Formularz z automatycznym formatowaniem i sprawdzaniem usług DHL</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Sekcja wyboru typu zlecenia */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Typ zlecenia:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {opcjeZlecen.map(opcja => {
              const IconComponent = opcja.icon
              const isSelected = typZlecenia === opcja.value
              
              return (
                <label 
                  key={opcja.value} 
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? `border-${opcja.color}-500 bg-${opcja.color}-50` 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="typZlecenia"
                    value={opcja.value}
                    checked={isSelected}
                    onChange={(e) => setTypZlecenia(e.target.value)}
                    className="sr-only"
                  />
                  <IconComponent 
                    className={`mr-3 ${
                      isSelected ? `text-${opcja.color}-600` : 'text-gray-400'
                    }`} 
                    size={20} 
                  />
                  <div>
                    <div className={`font-medium ${isSelected ? `text-${opcja.color}-900` : 'text-gray-900'}`}>
                      {opcja.label}
                    </div>
                    <div className={`text-sm ${isSelected ? `text-${opcja.color}-700` : 'text-gray-500'}`}>
                      {opcja.opis}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Sekcja Nadawcy */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 text-blue-600" />
            Nadawca
            {isNadawcaReadonly && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Auto-uzupełnione
              </span>
            )}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="nadawcaTyp"
                    value="osoba"
                    checked={formData.nadawcaTyp === 'osoba'}
                    onChange={handleChange}
                    className="form-radio text-blue-600"
                    disabled={isNadawcaReadonly}
                  />
                  <span className="ml-2">Osoba prywatna</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="nadawcaTyp"
                    value="firma"
                    checked={formData.nadawcaTyp === 'firma'}
                    onChange={handleChange}
                    className="form-radio text-blue-600"
                    disabled={isNadawcaReadonly}
                  />
                  <span className="ml-2">Firma/Instytucja</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {formData.nadawcaTyp === 'osoba' ? 'Imię i nazwisko' : 'Nazwa firmy'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="nadawcaNazwa"
                value={formData.nadawcaNazwa}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Ulica <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-4">
                  <input
                    type="text"
                    name="nadawcaUlica"
                    value={formData.nadawcaUlica}
                    onChange={handleChange}
                    readOnly={isNadawcaReadonly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="nadawcaNumerDomu"
                    value={formData.nadawcaNumerDomu}
                    onChange={handleChange}
                    readOnly={isNadawcaReadonly}
                    placeholder="Nr domu"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="nadawcaNumerLokalu"
                    value={formData.nadawcaNumerLokalu}
                    onChange={handleChange}
                    readOnly={isNadawcaReadonly}
                    placeholder="Nr lok."
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
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
                readOnly={isNadawcaReadonly}
                placeholder="15-169"
                maxLength="6"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: XX-XXX | DHL: {validatePostalCode(formData.nadawcaKodPocztowy) || '00000'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Miejscowość <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="nadawcaMiasto"
                value={formData.nadawcaMiasto}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Osoba kontaktowa <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="nadawcaOsobaKontaktowa"
                value={formData.nadawcaOsobaKontaktowa}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
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
                readOnly={isNadawcaReadonly}
                placeholder="857 152 705"
                maxLength="11"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: XXX XXX XXX | DHL: {validatePhoneNumber(formData.nadawcaTelefon) || '000000000'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="nadawcaEmail"
                value={formData.nadawcaEmail}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>
          </div>
        </div>

        {/* Sekcja Odbiorcy */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 text-green-600" />
            Odbiorca
            {isOdbiorcaReadonly && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Auto-uzupełnione
              </span>
            )}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="odbiorcaTyp"
                    value="osoba"
                    checked={formData.odbiorcaTyp === 'osoba'}
                    onChange={handleChange}
                    className="form-radio text-green-600"
                    disabled={isOdbiorcaReadonly}
                  />
                  <span className="ml-2">Osoba prywatna</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="odbiorcaTyp"
                    value="firma"
                    checked={formData.odbiorcaTyp === 'firma'}
                    onChange={handleChange}
                    className="form-radio text-green-600"
                    disabled={isOdbiorcaReadonly}
                  />
                  <span className="ml-2">Firma/Instytucja</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {formData.odbiorcaTyp === 'osoba' ? 'Imię i nazwisko' : 'Nazwa firmy'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="odbiorcaNazwa"
                value={formData.odbiorcaNazwa}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Ulica <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-4">
                  <input
                    type="text"
                    name="odbiorcaUlica"
                    value={formData.odbiorcaUlica}
                    onChange={handleChange}
                    readOnly={isOdbiorcaReadonly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                      isOdbiorcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="odbiorcaNumerDomu"
                    value={formData.odbiorcaNumerDomu}
                    onChange={handleChange}
                    readOnly={isOdbiorcaReadonly}
                    placeholder="Nr domu"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                      isOdbiorcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="odbiorcaNumerLokalu"
                    value={formData.odbiorcaNumerLokalu}
                    onChange={handleChange}
                    readOnly={isOdbiorcaReadonly}
                    placeholder="Nr lok."
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                      isOdbiorcaReadonly ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
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
                readOnly={isOdbiorcaReadonly}
                placeholder="24-100"
                maxLength="6"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: XX-XXX | DHL: {validatePostalCode(formData.odbiorcaKodPocztowy) || '00000'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Miejscowość <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="odbiorcaMiasto"
                value={formData.odbiorcaMiasto}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Osoba kontaktowa <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="odbiorcaOsobaKontaktowa"
                value={formData.odbiorcaOsobaKontaktowa}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
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
                readOnly={isOdbiorcaReadonly}
                placeholder="600 800 900"
                maxLength="11"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: XXX XXX XXX | DHL: {validatePhoneNumber(formData.odbiorcaTelefon) || '000000000'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="odbiorcaEmail"
                value={formData.odbiorcaEmail}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>
          </div>

          {/* NOWA SEKCJA: Wyświetlanie usług DHL */}
          {renderPostalServices()}
        </div>

        {/* Sekcja Szczegółów Przesyłki */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package2 className="mr-2 text-purple-600" />
            Szczegóły przesyłki
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Zawartość przesyłki <span className="text-red-500 ml-1">*</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ilość paczek <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                name="iloscPaczek"
                value={formData.iloscPaczek}
                onChange={handleChange}
                min="1"
                max="10"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                required
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Waga (kg) <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  name="waga"
                  value={formData.waga}
                  onChange={handleChange}
                  step="0.1"
                  min="0.1"
                  max="1000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 1000 kg</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Długość (cm) <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  name="dlugosc"
                  value={formData.dlugosc}
                  onChange={handleChange}
                  min="1"
                  max="160"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 160 cm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Szerokość (cm) <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  name="szerokosc"
                  value={formData.szerokosc}
                  onChange={handleChange}
                  min="1"
                  max="160"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 160 cm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Wysokość (cm) <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  name="wysokosc"
                  value={formData.wysokosc}
                  onChange={handleChange}
                  min="1"
                  max="160"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 160 cm</p>
              </div>
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

        {/* POPRAWIONA SEKCJA: Podgląd danych dla DHL */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
            🔍 Podgląd danych dla DHL WebAPI2
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Nadawca:</h4>
              <div className="bg-white p-3 rounded border font-mono text-xs space-y-1">
                <div>Wyświetlane: <span className="text-blue-600">"{formData.nadawcaKodPocztowy || '00-000'}"</span></div>
                <div>DHL postalCode: <span className="text-blue-600">"{validatePostalCode(formData.nadawcaKodPocztowy) || '00000'}"</span></div>
                <div>Wyświetlany tel: <span className="text-blue-600">"{formData.nadawcaTelefon || '000 000 000'}"</span></div>
                <div>DHL contactPhone: <span className="text-blue-600">"{validatePhoneNumber(formData.nadawcaTelefon) || '000000000'}"</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Odbiorca:</h4>
              <div className="bg-white p-3 rounded border font-mono text-xs space-y-1">
                <div>Wyświetlane: <span className="text-green-600">"{formData.odbiorcaKodPocztowy || '00-000'}"</span></div>
                <div>DHL postalCode: <span className="text-green-600">"{validatePostalCode(formData.odbiorcaKodPocztowy) || '00000'}"</span></div>
                <div>Wyświetlany tel: <span className="text-green-600">"{formData.odbiorcaTelefon || '000 000 000'}"</span></div>
                <div>DHL contactPhone: <span className="text-green-600">"{validatePhoneNumber(formData.odbiorcaTelefon) || '000000000'}"</span></div>
              </div>
            </div>
          </div>
          <p className="text-yellow-700 text-xs mt-3">
            ✅ Automatyczne formatowanie: użytkownik wpisuje XX-XXX i XXX XXX XXX, system konwertuje na format DHL
          </p>
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
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => onCancel()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Zamów kuriera (DHL WebAPI2)
          </button>
        </div>
      </div>
    </form>
  )
}
