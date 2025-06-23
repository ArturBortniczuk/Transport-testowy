'use client'
import { useState, useEffect } from 'react'
import { Building, User, Package } from 'lucide-react'

export default function KurierForm({ onSubmit, magazynNadawcy, userName, onCancel }) {
  const [zleca, setZleca] = useState('nadawca') // nadawca, trzecia_strona, odbiorca
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Dane nadawcy (auto-uzupełniane dla "nadawca")
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
    
    // Dane płatnika (dla trzeciej strony)
    platnikTyp: 'firma',
    platnikNazwa: '',
    platnikUlica: '',
    platnikNumerDomu: '',
    platnikNumerLokalu: '',
    platnikKodPocztowy: '',
    platnikMiasto: '',
    platnikOsobaKontaktowa: '',
    platnikTelefon: '',
    platnikEmail: '',
    
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

  // Automatyczne uzupełnianie danych Grupy Eltron
  const dataGrupyEltron = {
    nazwa: 'Grupa Eltron Sp. z o.o.',
    ulica: 'Główna',
    numerDomu: '7',
    kodPocztowy: '18-100',
    miasto: 'Łapy',
    osobaKontaktowa: userName || 'Biuro',
    telefon: '85 715 27 05',
    email: 'logistyka@grupaeltron.pl'
  }

  // Dane magazynów
  const daneMagazynow = {
    magazyn_bialystok: {
      nazwa: 'Grupa Eltron Sp. z o.o. - Magazyn Białystok',
      ulica: 'Wysockiego',
      numerDomu: '69B',
      kodPocztowy: '15-169',
      miasto: 'Białystok',
      osobaKontaktowa: 'Magazyn Białystok',
      telefon: '85 715 27 05',
      email: 'bialystok@grupaeltron.pl'
    },
    magazyn_zielonka: {
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

  // Automatyczne uzupełnianie gdy zmienia się "Zleca"
  useEffect(() => {
    if (zleca === 'nadawca') {
      // Grupa Eltron wysyła - uzupełnij dane nadawcy
      const daneNadawcy = daneMagazynow[magazynNadawcy] || dataGrupyEltron
      
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: daneNadawcy.nazwa,
        nadawcaUlica: daneNadawcy.ulica,
        nadawcaNumerDomu: daneNadawcy.numerDomu,
        nadawcaNumerLokalu: '',
        nadawcaKodPocztowy: daneNadawcy.kodPocztowy,
        nadawcaMiasto: daneNadawcy.miasto,
        nadawcaOsobaKontaktowa: daneNadawcy.osobaKontaktowa,
        nadawcaTelefon: daneNadawcy.telefon,
        nadawcaEmail: daneNadawcy.email
      }))
    } else if (zleca === 'odbiorca') {
      // Odbiorca płaci - uzupełnij dane nadawcy jako Grupa Eltron
      const daneNadawcy = daneMagazynow[magazynNadawcy] || dataGrupyEltron
      
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: daneNadawcy.nazwa,
        nadawcaUlica: daneNadawcy.ulica,
        nadawcaNumerDomu: daneNadawcy.numerDomu,
        nadawcaNumerLokalu: '',
        nadawcaKodPocztowy: daneNadawcy.kodPocztowy,
        nadawcaMiasto: daneNadawcy.miasto,
        nadawcaOsobaKontaktowa: daneNadawcy.osobaKontaktowa,
        nadawcaTelefon: daneNadawcy.telefon,
        nadawcaEmail: daneNadawcy.email
      }))
    } else {
      // Trzecia strona - wyczyść dane nadawcy
      setFormData(prev => ({
        ...prev,
        nadawcaTyp: 'firma',
        nadawcaNazwa: '',
        nadawcaUlica: '',
        nadawcaNumerDomu: '',
        nadawcaNumerLokalu: '',
        nadawcaKodPocztowy: '',
        nadawcaMiasto: '',
        nadawcaOsobaKontaktowa: '',
        nadawcaTelefon: '',
        nadawcaEmail: ''
      }))
    }
  }, [zleca, magazynNadawcy, userName])

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
      typZlecenia: zleca
    }
  
    onSubmit(dataToSubmit)
    
    // Reset formularza
    setZleca('nadawca')
    setFormData({
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
      
      platnikTyp: 'firma',
      platnikNazwa: '',
      platnikUlica: '',
      platnikNumerDomu: '',
      platnikNumerLokalu: '',
      platnikKodPocztowy: '',
      platnikMiasto: '',
      platnikOsobaKontaktowa: '',
      platnikTelefon: '',
      platnikEmail: '',
      
      zawartoscPrzesylki: '',
      MPK: '',
      uwagi: '',
      iloscPaczek: 1,
      waga: '',
      dlugosc: '',
      szerokosc: '',
      wysokosc: ''
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Nowe zamówienie kuriera</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Sekcja wyboru kto zleca (jak w DHL) */}
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Zleca i płaci za przesyłkę:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="zleca"
                value="nadawca"
                checked={zleca === 'nadawca'}
                onChange={(e) => setZleca(e.target.value)}
                className="mr-3 text-blue-600"
              />
              <Building className="mr-2 text-blue-600" size={20} />
              <div>
                <div className="font-medium">Nadawca</div>
                <div className="text-sm text-gray-500">Grupa Eltron wysyła</div>
              </div>
            </label>

            <label className="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="zleca"
                value="trzecia_strona"
                checked={zleca === 'trzecia_strona'}
                onChange={(e) => setZleca(e.target.value)}
                className="mr-3 text-green-600"
              />
              <User className="mr-2 text-green-600" size={20} />
              <div>
                <div className="font-medium">Trzecia strona</div>
                <div className="text-sm text-gray-500">Klient zleca i płaci</div>
              </div>
            </label>

            <label className="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="zleca"
                value="odbiorca"
                checked={zleca === 'odbiorca'}
                onChange={(e) => setZleca(e.target.value)}
                className="mr-3 text-orange-600"
              />
              <Package className="mr-2 text-orange-600" size={20} />
              <div>
                <div className="font-medium">Odbiorca</div>
                <div className="text-sm text-gray-500">Odbiorca płaci</div>
              </div>
            </label>
          </div>
        </div>

        {/* Sekcja Nadawcy */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 text-blue-600" />
            Nadawca
            {zleca === 'nadawca' && (
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
                    disabled={zleca === 'nadawca'} // Zablokowane gdy auto-uzupełnione
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
                    disabled={zleca === 'nadawca'} // Zablokowane gdy auto-uzupełnione
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                    readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                    readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                    placeholder="Nr domu"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                    readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                    placeholder="Nr lok."
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                placeholder="00-000"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
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
                readOnly={zleca === 'nadawca' || zleca === 'odbiorca'}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  (zleca === 'nadawca' || zleca === 'odbiorca') ? 'bg-gray-100' : ''
                }`}
                required
              />
            </div>
          </div>
        </div>

        {/* Sekcja Płatnika (tylko dla trzeciej strony) */}
        {zleca === 'trzecia_strona' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="mr-2 text-green-600" />
              Płatnik (Trzecia strona)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="platnikTyp"
                      value="osoba"
                      checked={formData.platnikTyp === 'osoba'}
                      onChange={handleChange}
                      className="form-radio text-green-600"
                    />
                    <span className="ml-2">Osoba prywatna</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="platnikTyp"
                      value="firma"
                      checked={formData.platnikTyp === 'firma'}
                      onChange={handleChange}
                      className="form-radio text-green-600"
                    />
                    <span className="ml-2">Firma/Instytucja</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {formData.platnikTyp === 'osoba' ? 'Imię i nazwisko' : 'Nazwa firmy'}
                </label>
                <input
                  type="text"
                  name="platnikNazwa"
                  value={formData.platnikNazwa}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Ulica</label>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      name="platnikUlica"
                      value={formData.platnikUlica}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="platnikNumerDomu"
                      value={formData.platnikNumerDomu}
                      onChange={handleChange}
                      placeholder="Nr domu"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="platnikNumerLokalu"
                      value={formData.platnikNumerLokalu}
                      onChange={handleChange}
                      placeholder="Nr lok."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kod pocztowy</label>
                <input
                  type="text"
                  name="platnikKodPocztowy"
                  value={formData.platnikKodPocztowy}
                  onChange={handleChange}
                  placeholder="00-000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Miejscowość</label>
                <input
                  type="text"
                  name="platnikMiasto"
                  value={formData.platnikMiasto}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Osoba kontaktowa</label>
                <input
                  type="text"
                  name="platnikOsobaKontaktowa"
                  value={formData.platnikOsobaKontaktowa}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  type="tel"
                  name="platnikTelefon"
                  value={formData.platnikTelefon}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="platnikEmail"
                  value={formData.platnikEmail}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Sekcja Odbiorcy */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 text-red-600" />
            Odbiorca
            {zleca === 'odbiorca' && (
              <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                Płaci za przesyłkę
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
                    className="form-radio text-red-600"
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
                    className="form-radio text-red-600"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="odbiorcaNumerDomu"
                    value={formData.odbiorcaNumerDomu}
                    onChange={handleChange}
                    placeholder="Nr domu"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="odbiorcaNumerLokalu"
                    value={formData.odbiorcaNumerLokalu}
                    onChange={handleChange}
                    placeholder="Nr lok."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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
                placeholder="00-000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Sekcja Szczegółów Przesyłki */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="mr-2 text-purple-600" />
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
