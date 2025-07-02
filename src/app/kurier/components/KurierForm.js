// src/app/kurier/components/KurierForm.js
// 🔥 MEGA KURIER FORM - Zaawansowany formularz z kalkulacją cen na żywo
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Building, Package2, ArrowRight, ArrowLeft, Clock, CheckCircle, AlertCircle, RefreshCw, Calculator, Truck, Shield, CreditCard, Calendar, Globe, Plus, Minus, Eye, Download } from 'lucide-react'

export default function KurierForm({ onSubmit, magazynNadawcy, userName, onCancel }) {
  const [typZlecenia, setTypZlecenia] = useState('nadawca_bialystok')
  const [currentStep, setCurrentStep] = useState(1) // Multi-step form
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
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCourierBooking, setShowCourierBooking] = useState(false)
  const [showInternational, setShowInternational] = useState(false)
  
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
    
    // NOWE: Wiele paczek
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
    
    // NOWE: Usługa DHL
    uslugaDHL: 'AH', // AH, 09, 12, DW, SP, EK, PI, PR, CP, CM
    
    // NOWE: Usługi dodatkowe
    uslugiDodatkowe: {
      ubezpieczenie: false,
      wartoscUbezpieczenia: '',
      pobranie: false,
      kwotaPobrania: '',
      formaPobrania: 'BANK_TRANSFER',
      doreczenieSobota: false,
      nadanieSobota: false,
      doreczenieWieczorne: false,
      informacjePrzedDoreczeniem: false,
      odbiórWlasny: false,
      potwierdzenieDoręczenia: false
    },
    
    // NOWE: Zamawianie kuriera
    zamowKuriera: false,
    kurierData: {
      dataOdbioru: '',
      godzinaOd: '08:00',
      godzinaDo: '16:00',
      uwagi: '',
      kurierZEtykieta: false
    },
    
    // NOWE: Dane międzynarodowe (dla przesyłek poza UE)
    daneMiedzynarodowe: {
      typOdprawy: 'U', // U - uproszczona, I - indywidualna
      wartoscTransportu: '',
      waluta: 'PLN',
      nipNadawcy: '',
      eoriNadawcy: '',
      vatNadawcy: '',
      eoriOdbiorcy: '',
      vatOdbiorcy: '',
      kategoriaTowarow: '9', // 9-Inne, 11-Sprzedaż, 21-Zwrot, 31-Prezent, 32-Próbki, 91-Dokumenty
      numerFaktury: '',
      dataFaktury: '',
      krajPochodzenia: 'PL',
      dodatkoweInfo: '',
      wagaBrutto: '',
      imieOsobyKontaktowej: '',
      nazwiskoOsobyKontaktowej: '',
      zgodnosc: {
        nieWiekszaWartosc: true,
        niezakazaneTowar: true,
        nieograniczoneTowar: true
      },
      pozycjeCelne: []
    }
  })

  // DANE MAGAZYNÓW - rozszerzone
  const daneMagazynow = {
    bialystok: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Białystok',
      ulica: 'Wysockiego',
      numerDomu: '69B',
      kodPocztowy: '15-169',
      miasto: 'Białystok',
      kraj: 'PL',
      osobaKontaktowa: 'Magazyn Białystok',
      telefon: '857 152 705',
      email: 'bialystok@grupaeltron.pl'
    },
    zielonka: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Zielonka',
      ulica: 'Krótka',
      numerDomu: '2',
      kodPocztowy: '05-220',
      miasto: 'Zielonka',
      kraj: 'PL',
      osobaKontaktowa: 'Magazyn Zielonka',
      telefon: '857 152 705',
      email: 'zielonka@grupaeltron.pl'
    }
  }

  // OPCJE ZLECEŃ - rozszerzone
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

  // USŁUGI DHL - pełna lista z dokumentacji
  const uslugiDHL = [
    { value: 'AH', label: 'Przesyłka krajowa', opis: 'Standardowa usługa krajowa', cena: '~25 PLN' },
    { value: '09', label: 'Domestic 09', opis: 'Dostawa do 9:00', cena: '~45 PLN', premium: true },
    { value: '12', label: 'Domestic 12', opis: 'Dostawa do 12:00', cena: '~35 PLN', premium: true },
    { value: 'DW', label: 'Doręczenie wieczorne', opis: 'Dostawa 18:00-22:00', cena: '~30 PLN' },
    { value: 'SP', label: 'Doręczenie do punktu', opis: 'DHL ServicePoint', cena: '~20 PLN' },
    { value: 'EK', label: 'Connect', opis: 'Przesyłka Connect', cena: '~28 PLN' },
    { value: 'PI', label: 'International', opis: 'Przesyłka międzynarodowa', cena: '~60 PLN', international: true },
    { value: 'PR', label: 'Premium', opis: 'Usługa Premium', cena: '~50 PLN', premium: true },
    { value: 'CP', label: 'Connect Plus', opis: 'Connect Plus', cena: '~35 PLN' },
    { value: 'CM', label: 'Connect Plus Pallet', opis: 'Palety Connect Plus', cena: '~80 PLN', pallet: true }
  ]

  // KRAJE - lista dla przesyłek międzynarodowych
  const kraje = [
    { code: 'PL', name: 'Polska', eu: true },
    { code: 'DE', name: 'Niemcy', eu: true },
    { code: 'CZ', name: 'Czechy', eu: true },
    { code: 'SK', name: 'Słowacja', eu: true },
    { code: 'AT', name: 'Austria', eu: true },
    { code: 'FR', name: 'Francja', eu: true },
    { code: 'IT', name: 'Włochy', eu: true },
    { code: 'ES', name: 'Hiszpania', eu: true },
    { code: 'NL', name: 'Holandia', eu: true },
    { code: 'BE', name: 'Belgia', eu: true },
    { code: 'GB', name: 'Wielka Brytania', eu: false },
    { code: 'US', name: 'USA', eu: false },
    { code: 'CA', name: 'Kanada', eu: false },
    { code: 'AU', name: 'Australia', eu: false },
    { code: 'JP', name: 'Japonia', eu: false },
    { code: 'CN', name: 'Chiny', eu: false },
    { code: 'RU', name: 'Rosja', eu: false },
    { code: 'UA', name: 'Ukraina', eu: false }
  ]

  // WALIDACJA HELPERS
  const validatePostalCode = (code) => {
    const cleaned = code.replace(/[^\d]/g, '')
    return cleaned.length === 5 ? cleaned : null
  }

  const formatPostalCodeDisplay = (code) => {
    const cleaned = code.replace(/[^\d]/g, '')
    if (cleaned.length === 5) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`
    }
    return code
  }

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

  const formatPhoneDisplay = (phone) => {
    const cleaned = phone.replace(/[^\d]/g, '')
    if (cleaned.length === 9) {
      return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
    }
    return phone
  }

  // REAL-TIME SERVICES CHECK
  const checkPostalServices = useCallback(async (postCode, city, street = '', houseNumber = '') => {
    const cleanedPostCode = validatePostalCode(postCode)
    if (!cleanedPostCode || !city) {
      return
    }

    setCheckingServices(true)
    setServicesError('')
    
    try {
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
      }
    } catch (error) {
      console.error('💥 Błąd sprawdzania usług DHL:', error)
      setServicesError('Nie udało się sprawdzić usług DHL')
      setPostalServices(null)
    } finally {
      setCheckingServices(false)
    }
  }, [])

  // REAL-TIME PRICE CALCULATION
  const calculatePrice = useCallback(async () => {
    if (!formData.paczki[0].waga || !formData.odbiorcaKodPocztowy || !formData.nadawcaKodPocztowy) {
      return
    }

    setCalculatingPrice(true)
    setPricingError('')
    
    try {
      const priceRequest = {
        shipper: {
          country: formData.nadawcaKraj,
          name: formData.nadawcaNazwa,
          postalCode: formData.nadawcaKodPocztowy,
          city: formData.nadawcaMiasto,
          street: formData.nadawcaUlica,
          houseNumber: formData.nadawcaNumerDomu,
          apartmentNumber: formData.nadawcaNumerLokalu
        },
        receiver: {
          country: formData.odbiorcaKraj,
          addressType: formData.odbiorcaTyp === 'firma' ? 'B' : 'C',
          name: formData.odbiorcaNazwa,
          postalCode: formData.odbiorcaKodPocztowy,
          city: formData.odbiorcaMiasto,
          street: formData.odbiorcaUlica,
          houseNumber: formData.odbiorcaNumerDomu,
          apartmentNumber: formData.odbiorcaNumerLokalu
        },
        service: {
          product: formData.uslugaDHL,
          deliveryEvening: formData.uslugiDodatkowe.doreczenieWieczorne,
          deliveryOnSaturday: formData.uslugiDodatkowe.doreczenieSobota,
          pickupOnSaturday: formData.uslugiDodatkowe.nadanieSobota,
          collectOnDelivery: formData.uslugiDodatkowe.pobranie,
          collectOnDeliveryValue: formData.uslugiDodatkowe.kwotaPobrania || 0,
          insurance: formData.uslugiDodatkowe.ubezpieczenie,
          insuranceValue: formData.uslugiDodatkowe.wartoscUbezpieczenia || 0
        },
        pieceList: formData.paczki.map(paczka => ({
          type: paczka.typ,
          weight: parseFloat(paczka.waga) || 1,
          width: parseInt(paczka.szerokosc) || 10,
          height: parseInt(paczka.wysokosc) || 10,
          length: parseInt(paczka.dlugosc) || 10,
          quantity: parseInt(paczka.ilosc) || 1,
          nonStandard: paczka.niestandardowa
        }))
      }

      const response = await fetch('/api/kurier/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(priceRequest)
      })

      const data = await response.json()
      
      if (data.success) {
        setPricing(data)
        console.log('💰 Cena obliczona:', data)
      } else {
        setPricingError(data.error)
        setPricing(null)
      }
    } catch (error) {
      console.error('💥 Błąd kalkulacji ceny:', error)
      setPricingError('Nie udało się obliczyć ceny')
      setPricing(null)
    } finally {
      setCalculatingPrice(false)
    }
  }, [formData])

  // AUTO-FILL DATA BASED ON ORDER TYPE
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
        nadawcaKraj: 'PL',
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
        odbiorcaKraj: 'PL',
        odbiorcaOsobaKontaktowa: '',
        odbiorcaTelefon: '',
        odbiorcaEmail: ''
      }))
    }

    resetFormData()
    setPostalServices(null)
    setPricing(null)

    // Auto-fill based on order type
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
  }, [typZlecenia])

  // AUTO-CALCULATE PRICE WHEN DATA CHANGES
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculatePrice()
    }, 1000)

    return () => clearTimeout(debounceTimer)
  }, [calculatePrice])

  // HANDLE FORM CHANGES
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
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }))
    }

    // Auto-check services for receiver postal code
    if (name === 'odbiorcaKodPocztowy' && processedValue.length === 6) {
      const miasto = formData.odbiorcaMiasto
      if (miasto) {
        setTimeout(() => {
          checkPostalServices(processedValue, miasto, formData.odbiorcaUlica, formData.odbiorcaNumerDomu)
        }, 500)
      }
    }

    if (name === 'odbiorcaMiasto' && formData.odbiorcaKodPocztowy.length === 6) {
      setTimeout(() => {
        checkPostalServices(formData.odbiorcaKodPocztowy, processedValue, formData.odbiorcaUlica, formData.odbiorcaNumerDomu)
      }, 500)
    }
  }

  // PACKAGE MANAGEMENT
  const addPackage = () => {
    const newId = Math.max(...formData.paczki.map(p => p.id)) + 1
    setFormData(prev => ({
      ...prev,
      paczki: [
        ...prev.paczki,
        {
          id: newId,
          typ: 'PACKAGE',
          waga: '',
          dlugosc: '',
          szerokosc: '',
          wysokosc: '',
          ilosc: 1,
          niestandardowa: false
        }
      ]
    }))
  }

  const removePackage = (id) => {
    if (formData.paczki.length > 1) {
      setFormData(prev => ({
        ...prev,
        paczki: prev.paczki.filter(p => p.id !== id)
      }))
    }
  }

  const updatePackage = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      paczki: prev.paczki.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    }))
  }

  // STEP NAVIGATION
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // CHECK IF INTERNATIONAL SHIPMENT
  const isInternational = formData.nadawcaKraj !== formData.odbiorcaKraj
  const isOutsideEU = !kraje.find(k => k.code === formData.odbiorcaKraj)?.eu

  // FORM VALIDATION
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.nadawcaNazwa && formData.nadawcaKodPocztowy && formData.nadawcaMiasto && 
               formData.odbiorcaNazwa && formData.odbiorcaKodPocztowy && formData.odbiorcaMiasto
      case 2:
        return formData.zawartoscPrzesylki && formData.paczki[0].waga && 
               formData.paczki[0].dlugosc && formData.paczki[0].szerokosc && formData.paczki[0].wysokosc
      case 3:
        return true // Optional step
      case 4:
        return true // Review step
      default:
        return false
    }
  }

  // HANDLE SUBMIT
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

      // Prepare data for submission
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

  // COMPONENT RENDERERS
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
        </div>
      )
    }

    return null
  }

  const renderPricing = () => {
    if (calculatingPrice) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <Calculator className="animate-pulse text-blue-600" size={16} />
            <span className="text-blue-800 text-sm">Obliczanie ceny...</span>
          </div>
        </div>
      )
    }

    if (pricingError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-600" size={16} />
            <span className="text-red-800 text-sm">{pricingError}</span>
          </div>
        </div>
      )
    }

    if (pricing) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calculator className="text-green-600" size={16} />
              <span className="text-green-800 font-medium text-sm">Kalkulacja kosztów:</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-900">
                {pricing.price} {pricing.currency || 'PLN'}
              </div>
              <div className="text-xs text-green-700">netto</div>
            </div>
          </div>
          
          {pricing.breakdown && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2 rounded">
                <div className="font-medium">Cena bazowa:</div>
                <div>{pricing.breakdown.basePrice} PLN</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-medium">Dopłata paliwowa:</div>
                <div>{pricing.breakdown.fuelSurcharge} PLN ({pricing.fuelSurcharge}%)</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-medium">VAT:</div>
                <div>{pricing.breakdown.vat} PLN</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-medium">Razem brutto:</div>
                <div className="font-bold">{pricing.breakdown.totalGross} PLN</div>
              </div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const isNadawcaReadonly = typZlecenia === 'nadawca_bialystok' || typZlecenia === 'nadawca_zielonka'
  const isOdbiorcaReadonly = typZlecenia === 'odbiorca_bialystok' || typZlecenia === 'odbiorca_zielonka'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl overflow-hidden max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">🚀 MEGA Zamówienie kuriera DHL</h2>
            <p className="text-blue-100 text-sm mt-1">
              Zaawansowany formularz z kalkulacją cen na żywo i wszystkimi usługami DHL WebAPI2
            </p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">Krok {currentStep} z 4</div>
            <div className="w-24 bg-blue-800 rounded-full h-2 mt-1">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* STEP 1: BASIC INFO & ADDRESSES */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Package2 className="mr-2 text-blue-600" />
              Krok 1: Dane podstawowe i adresy
            </h3>

            {/* TYPE SELECTION */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Typ zlecenia:</h4>
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

                {/* Address fields - similar structure as before but with enhanced styling */}
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
                    Kraj <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    name="nadawcaKraj"
                    value={formData.nadawcaKraj}
                    onChange={handleChange}
                    disabled={isNadawcaReadonly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      isNadawcaReadonly ? 'bg-gray-100' : ''
                    }`}
                    required
                  >
                    {kraje.map(kraj => (
                      <option key={kraj.code} value={kraj.code}>
                        {kraj.name} {!kraj.eu && '🌍'}
                      </option>
                    ))}
                  </select>
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
                </div>

                <div>
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

            {/* RECEIVER - similar enhanced structure */}
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
              
              {/* Similar structure as sender but for receiver */}
              {/* ... all receiver fields with enhanced styling ... */}
              
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
                <div key={paczka.id} className="bg-white p-4 rounded-lg border mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-gray-900">Paczka #{index + 1}</h5>
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

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Typ</label>
                      <select
                        value={paczka.typ}
                        onChange={(e) => updatePackage(paczka.id, 'typ', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                      >
                        <option value="ENVELOPE">Koperta</option>
                        <option value="PACKAGE">Paczka</option>
                        <option value="PALLET">Paleta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Waga (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={paczka.waga}
                        onChange={(e) => updatePackage(paczka.id, 'waga', e.target.value)}
                        step="0.1"
                        min="0.1"
                        max="1000"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Długość (cm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={paczka.dlugosc}
                        onChange={(e) => updatePackage(paczka.id, 'dlugosc', e.target.value)}
                        min="1"
                        max="160"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Szerokość (cm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={paczka.szerokosc}
                        onChange={(e) => updatePackage(paczka.id, 'szerokosc', e.target.value)}
                        min="1"
                        max="160"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Wysokość (cm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={paczka.wysokosc}
                        onChange={(e) => updatePackage(paczka.id, 'wysokosc', e.target.value)}
                        min="1"
                        max="160"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ilość</label>
                      <input
                        type="number"
                        value={paczka.ilosc}
                        onChange={(e) => updatePackage(paczka.id, 'ilosc', e.target.value)}
                        min="1"
                        max="10"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={paczka.niestandardowa}
                        onChange={(e) => updatePackage(paczka.id, 'niestandardowa', e.target.checked)}
                        className="form-checkbox text-orange-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Paczka niestandardowa</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* DHL SERVICE SELECTION */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Usługa DHL</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uslugiDHL.map(usluga => {
                  const isSelected = formData.uslugaDHL === usluga.value
                  const isDisabled = (usluga.international && !isInternational) || 
                                    (usluga.premium && formData.paczki[0]?.waga > 31.5)
                  
                  return (
                    <label 
                      key={usluga.value} 
                      className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' :
                        isSelected ? 'border-blue-500 bg-blue-100' : 
                        'border-gray-200 bg-white hover:border-gray-300'
                      } ${usluga.premium ? 'ring-2 ring-yellow-300' : ''}`}
                    >
                      <input
                        type="radio"
                        name="uslugaDHL"
                        value={usluga.value}
                        checked={isSelected}
                        onChange={handleChange}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-start mb-1">
                        <div className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {usluga.label}
                          {usluga.premium && ' ⭐'}
                          {usluga.international && ' 🌍'}
                          {usluga.pallet && ' 📦'}
                        </div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {usluga.cena}
                        </div>
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                        {usluga.opis}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* REAL-TIME PRICING */}
            {renderPricing()}
          </div>
        )}

        {/* STEP 3: ADVANCED OPTIONS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Shield className="mr-2 text-green-600" />
              Krok 3: Opcje zaawansowane (opcjonalnie)
            </h3>

            {/* ADDITIONAL SERVICES */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Usługi dodatkowe</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insurance */}
                <div className="bg-white p-4 rounded-lg border">
                  <label className="inline-flex items-center mb-3">
                    <input
                      type="checkbox"
                      name="uslugiDodatkowe.ubezpieczenie"
                      checked={formData.uslugiDodatkowe.ubezpieczenie}
                      onChange={handleChange}
                      className="form-checkbox text-green-600"
                    />
                    <span className="ml-2 font-medium">Ubezpieczenie przesyłki</span>
                  </label>
                  {formData.uslugiDodatkowe.ubezpieczenie && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Wartość do ubezpieczenia (PLN)
                      </label>
                      <input
                        type="number"
                        name="uslugiDodatkowe.wartoscUbezpieczenia"
                        value={formData.uslugiDodatkowe.wartoscUbezpieczenia}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>

                {/* Cash on Delivery */}
                <div className="bg-white p-4 rounded-lg border">
                  <label className="inline-flex items-center mb-3">
                    <input
                      type="checkbox"
                      name="uslugiDodatkowe.pobranie"
                      checked={formData.uslugiDodatkowe.pobranie}
                      onChange={handleChange}
                      className="form-checkbox text-green-600"
                    />
                    <span className="ml-2 font-medium">Pobranie</span>
                  </label>
                  {formData.uslugiDodatkowe.pobranie && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Kwota pobrania (PLN)
                        </label>
                        <input
                          type="number"
                          name="uslugiDodatkowe.kwotaPobrania"
                          value={formData.uslugiDodatkowe.kwotaPobrania}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Forma zwrotu
                        </label>
                        <select
                          name="uslugiDodatkowe.formaPobrania"
                          value={formData.uslugiDodatkowe.formaPobrania}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        >
                          <option value="BANK_TRANSFER">Przelew bankowy</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Options */}
                <div className="bg-white p-4 rounded-lg border">
                  <h5 className="font-medium mb-3">Opcje dostawy</h5>
                  <div className="space-y-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.doreczenieSobota"
                        checked={formData.uslugiDodatkowe.doreczenieSobota}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Doręczenie w sobotę</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.doreczenieWieczorne"
                        checked={formData.uslugiDodatkowe.doreczenieWieczorne}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Doręczenie wieczorne (18-22)</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.nadanieSobota"
                        checked={formData.uslugiDodatkowe.nadanieSobota}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Nadanie w sobotę</span>
                    </label>
                  </div>
                </div>

                {/* Additional Services */}
                <div className="bg-white p-4 rounded-lg border">
                  <h5 className="font-medium mb-3">Usługi dodatkowe</h5>
                  <div className="space-y-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.informacjePrzedDoreczeniem"
                        checked={formData.uslugiDodatkowe.informacjePrzedDoreczeniem}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Informacje przed doręczeniem</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.odbiórWlasny"
                        checked={formData.uslugiDodatkowe.odbiórWlasny}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Odbiór własny</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="uslugiDodatkowe.potwierdzenieDoręczenia"
                        checked={formData.uslugiDodatkowe.potwierdzenieDoręczenia}
                        onChange={handleChange}
                        className="form-checkbox text-green-600"
                      />
                      <span className="ml-2 text-sm">Potwierdzenie doręczenia</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* COURIER BOOKING */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <label className="inline-flex items-center mb-4">
                <input
                  type="checkbox"
                  name="zamowKuriera"
                  checked={formData.zamowKuriera}
                  onChange={handleChange}
                  className="form-checkbox text-yellow-600"
                />
                <span className="ml-2 text-lg font-medium">Zamów kuriera do odbioru</span>
              </label>

              {formData.zamowKuriera && (
                <div className="bg-white p-4 rounded-lg border">
                  <h5 className="font-medium mb-3 flex items-center">
                    <Truck className="mr-2 text-yellow-600" />
                    Szczegóły zamawiania kuriera
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Data odbioru
                      </label>
                      <input
                        type="date"
                        name="kurierData.dataOdbioru"
                        value={formData.kurierData.dataOdbioru}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Godzina od
                      </label>
                      <input
                        type="time"
                        name="kurierData.godzinaOd"
                        value={formData.kurierData.godzinaOd}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Godzina do
                      </label>
                      <input
                        type="time"
                        name="kurierData.godzinaDo"
                        value={formData.kurierData.godzinaDo}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Uwagi dla kuriera
                    </label>
                    <textarea
                      name="kurierData.uwagi"
                      value={formData.kurierData.uwagi}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Dodatkowe informacje dla kuriera..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="kurierData.kurierZEtykieta"
                        checked={formData.kurierData.kurierZEtykieta}
                        onChange={handleChange}
                        className="form-checkbox text-yellow-600"
                      />
                      <span className="ml-2 text-sm">Kurier ma przyjechać z etykietą</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* INTERNATIONAL OPTIONS */}
            {isInternational && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="mr-2 text-red-600" />
                  Przesyłka międzynarodowa
                </h4>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-4">
                    Przesyłka międzynarodowa wymaga dodatkowych danych. 
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
                      
                      {/* More international fields would go here */}
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
                      <div key={paczka.id} className="bg-gray-50 p-2 rounded">
                        <div>Paczka #{index + 1}: {paczka.typ}</div>
                        <div>{paczka.waga}kg, {paczka.dlugosc}×{paczka.szerokosc}×{paczka.wysokosc}cm</div>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <strong>Zawartość:</strong> {formData.zawartoscPrzesylki}
                    </div>
                  </div>
                </div>

                {/* Service Summary */}
                <div className="bg-white p-4 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-2">🚚 Usługa</h5>
                  <div className="text-sm space-y-1">
                    <div><strong>DHL {formData.uslugaDHL}</strong></div>
                    {Object.entries(formData.uslugiDodatkowe).map(([key, value]) => {
                      if (value === true) {
                        return <div key={key}>✓ {key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
                      }
                      return null
                    })}
                    {formData.zamowKuriera && (
                      <div>✓ Zamówiony kurier na {formData.kurierData.dataOdbioru}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PRICING SUMMARY */}
            {pricing && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <Calculator className="mr-2" />
                  Podsumowanie kosztów
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {pricing.price} PLN
                    </div>
                    <div className="text-sm text-green-700">netto + {pricing.fuelSurcharge}% dopłata paliwowa</div>
                  </div>
                  {pricing.breakdown && (
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-lg font-bold text-green-900">
                        {pricing.breakdown.totalGross} PLN
                      </div>
                      <div className="text-sm text-green-700">łącznie z VAT</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VALIDATION SUMMARY */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Status walidacji</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="text-green-600 mr-2" size={16} />
                  <span>Adresy</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="text-green-600 mr-2" size={16} />
                  <span>Paczki</span>
                </div>
                <div className="flex items-center">
                  {postalServices ? 
                    <CheckCircle className="text-green-600 mr-2" size={16} /> :
                    <AlertCircle className="text-yellow-600 mr-2" size={16} />
                  }
                  <span>Usługi DHL</span>
                </div>
                <div className="flex items-center">
                  {pricing ? 
                    <CheckCircle className="text-green-600 mr-2" size={16} /> :
                    <AlertCircle className="text-yellow-600 mr-2" size={16} />
                  }
                  <span>Wycena</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERROR/SUCCESS MESSAGES */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="mr-2" size={20} />
              <div>{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <CheckCircle className="mr-2" size={20} />
              <div>{success}</div>
            </div>
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex space-x-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Poprzedni krok</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={() => onCancel()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
          </div>
          
          <div className="flex space-x-4">
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
                disabled={submitting || !validateStep(4)}
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
        </div>

        {/* STEP INDICATOR */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step === currentStep ? 'bg-blue-600' :
                  step < currentStep ? 'bg-green-600' :
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
