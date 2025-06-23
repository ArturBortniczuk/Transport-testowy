'use client'
import { useState, useEffect } from 'react'
import { Building, Package2, ArrowRight, ArrowLeft } from 'lucide-react'

export default function KurierForm({ onSubmit, magazynNadawcy, userName, onCancel }) {
  const [typZlecenia, setTypZlecenia] = useState('nadawca_bialystok') 
  const [error, setError] = useState('')
  
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

  // Dane magazynów
  const daneMagazynow = {
    bialystok: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Białystok',
      ulica: 'Wysockiego',
      numerDomu: '69B',
      kodPocztowy: '15-169',
      miasto: 'Białystok',
      osobaKontaktowa: 'Magazyn Białystok',
      telefon: '85 715 27 05',
      email: 'bialystok@grupaeltron.pl'
    },
    zielonka: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Zielonka',
      ulica: 'Krótka',
      numerDomu: '2',
      kodPocztowy: '05-220',
      miasto: 'Zielonka',
      osobaKontaktowa: 'Magazyn Zielonka',
      telefon: '85 715 27 05',
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

    // Uzupełnij odpowiednie dane w zależności od typu zlecenia
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
        odbiorcaOsobaKontaktowa: dane.osobaKontaktowa,
        odbiorcaTelefon: dane.telefon,
        odbiorcaEmail: dane.email
      }))
    }
    // Dla trzeciej strony nie uzupełniamy nic - oba pola puste
  }, [typZlecenia])

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
  
    // Walidacja wagi
    if (formData.waga > 1000) {
      setError('Maksymalna waga przesyłki to 1000 kg')
      return
    }
  
    // Walidacja wymiarów
    if (formData.dlugosc > 160 || formData.szerokosc > 160 || formData.wysokosc > 160) {
      setError('Maksymalny wymiar przesyłki to 160 cm (długość/szerokość/wysokość)')
      return
    }
  
    // Dodaj informację o typie zlecenia
    const dataToSubmit = {
      ...formData,
      typZlecenia: typZlecenia
    }
  
    onSubmit(dataToSubmit)
    
    // Reset formularza
    setTypZlecenia('nadawca_bialystok')
    setError('')
  }

  // Pomocnicze funkcje do sprawdzania czy pola mają być zablokowane
  const isNadawcaReadonly = typZlecenia === 'nadawca_bialystok' || typZlecenia === 'nadawca_zielonka'
  const isOdbiorcaReadonly = typZlecenia === 'odbiorca_bialystok' || typZlecenia === 'odbiorca_zielonka'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Nowe zamówienie kuriera</h2>
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
              <label className="block text-sm font-medium text-gray-700">Ulica</label>
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
              <label className="block text-sm font-medium text-gray-700">Kod pocztowy</label>
              <input
                type="text"
                name="nadawcaKodPocztowy"
                value={formData.nadawcaKodPocztowy}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                placeholder="00-000"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Miejscowość</label>
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
              <label className="block text-sm font-medium text-gray-700">Osoba kontaktowa</label>
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
              <label className="block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="tel"
                name="nadawcaTelefon"
                value={formData.nadawcaTelefon}
                onChange={handleChange}
                readOnly={isNadawcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  isNadawcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
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
              <label className="block text-sm font-medium text-gray-700">Ulica</label>
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
              <label className="block text-sm font-medium text-gray-700">Kod pocztowy</label>
              <input
                type="text"
                name="odbiorcaKodPocztowy"
                value={formData.odbiorcaKodPocztowy}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                placeholder="00-000"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Miejscowość</label>
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
              <label className="block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="tel"
                name="odbiorcaTelefon"
                value={formData.odbiorcaTelefon}
                onChange={handleChange}
                readOnly={isOdbiorcaReadonly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${
                  isOdbiorcaReadonly ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
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
        </div>

        {/* Sekcja Szczegółów Przesyłki */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package2 className="mr-2 text-purple-600" />
            Szczegóły przesyłki
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Zawartość przesyłki</label>
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
              <label className="block text-sm font-medium text-gray-700">Ilość paczek</label>
              <input
                type="number"
                name="iloscPaczek"
                value={formData.iloscPaczek}
                onChange={handleChange}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                required
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Waga (kg)</label>
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
                <label className="block text-sm font-medium text-gray-700">Długość (cm)</label>
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
                <label className="block text-sm font-medium text-gray-700">Szerokość (cm)</label>
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
                <label className="block text-sm font-medium text-gray-700">Wysokość (cm)</label>
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

        {/* Błędy */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            {error}
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
            Zamów kuriera
          </button>
        </div>
      </div>
    </form>
  )
}
