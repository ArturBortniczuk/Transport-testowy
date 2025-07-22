// src/app/moje-wnioski/page.js
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Plus,
  Calendar,
  MapPin,
  User,
  Phone,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Building
} from 'lucide-react'

// ------- Komponent do wyboru Budowy -------
function ConstructionSelector({ value, onChange, className = '' }) {
  const [constructions, setConstructions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchConstructions = async () => {
      try {
        setIsLoading(true);
        // KLUCZOWA POPRAWKA: Dodajemy 'credentials: include'
        const response = await fetch('/api/constructions', { credentials: 'include' });

        if (!response.ok) {
          throw new Error('Problem z pobraniem danych budów');
        }

        const data = await response.json();
        setConstructions(data.constructions || []);
      } catch (err) {
        setError('Nie udało się pobrać listy budów');
        console.error('Error fetching constructions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConstructions();
  }, []);

  const filteredConstructions = search.trim() === ''
    ? constructions
    : constructions.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.mpk.toLowerCase().includes(search.toLowerCase())
      );

  const handleSelect = (construction) => {
    onChange(construction);
    setShowDropdown(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value ? `${value.name} (${value.mpk})` : search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="Wyszukaj budowę lub MPK..."
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading && <div className="p-2 text-gray-500">Ładowanie...</div>}
          {error && <div className="p-2 text-red-500">{error}</div>}
          {!isLoading && filteredConstructions.length === 0 && <div className="p-2 text-gray-500">Brak wyników</div>}
          {filteredConstructions.map(construction => (
            <div
              key={construction.id}
              onClick={() => handleSelect(construction)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              <div className="font-medium">{construction.name}</div>
              <div className="text-sm text-gray-500">MPK: {construction.mpk}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------- Komponent do wyboru Handlowca -------
function UserSelector({ value, onChange, className = '' }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoading(true);
                // KLUCZOWA POPRAWKA: Dodajemy 'credentials: include'
                const response = await fetch('/api/users/list', { credentials: 'include' });
                if (!response.ok) throw new Error('Nie udało się pobrać użytkowników');
                const data = await response.json();
                setUsers(data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = search.trim() === ''
        ? users
        : users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (user) => {
        onChange(user);
        setShowDropdown(false);
        setSearch('');
    };

    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                value={value ? value.name : search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Wyszukaj handlowca..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {showDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoading && <div className="p-2">Ładowanie...</div>}
                    {error && <div className="p-2 text-red-500">{error}</div>}
                    {filteredUsers.map(user => (
                        <div key={user.id} onClick={() => handleSelect(user)} className="p-2 hover:bg-gray-100 cursor-pointer">
                            {user.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


// ------- Główny komponent strony -------
export default function MojeWnioskiPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [userInfo, setUserInfo] = useState(null)

  // NOWE STANY
  const [recipientType, setRecipientType] = useState('construction'); // Domyślnie 'budowa'
  const [selectedEntity, setSelectedEntity] = useState(null); // Przechowuje wybrany obiekt (budowę lub usera)

  const [formData, setFormData] = useState({
    destination_city: '',
    postal_code: '',
    street: '',
    delivery_date: '',
    justification: '',
    client_name: '',
    mpk: '',
    contact_person: '',
    contact_phone: '',
    notes: ''
  })

  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Pobierz dane użytkownika
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user')
        const data = await response.json()

        if (data.isAuthenticated && data.user) {
          setUserInfo(data.user)
        } else {
          setError('Brak autoryzacji')
        }
      } catch (err) {
        setError('Błąd pobierania danych użytkownika')
      }
    }

    fetchUserInfo()
  }, [])

  // Pobierz wnioski
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transport-requests')
      const data = await response.json()

      if (data.success) {
        setRequests(data.requests)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Wystąpił błąd podczas pobierania wniosków')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userInfo) {
      fetchRequests()
    }
  }, [userInfo])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.destination_city.trim()) errors.destination_city = 'Miasto docelowe jest wymagane'
    if (!formData.delivery_date) errors.delivery_date = 'Data dostawy jest wymagana'
    if (!formData.justification.trim()) errors.justification = 'Uzasadnienie jest wymagane'
    if (!selectedEntity) errors.entity = 'Wybór budowy lub handlowca jest wymagany'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const url = '/api/transport-requests'
      const method = editingRequest ? 'PUT' : 'POST'

      const dataToSend = {
        ...formData,
        // Zależnie od typu, wysyłamy ID budowy lub użytkownika
        construction_id: recipientType === 'construction' ? selectedEntity?.id : null,
        user_id: recipientType === 'sales' ? selectedEntity?.id : null
      };
      
      const body = editingRequest
        ? { ...dataToSend, requestId: editingRequest.id, action: 'edit' }
        : dataToSend

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        alert(editingRequest ? 'Wniosek został zaktualizowany' : 'Wniosek został złożony')
        cancelForm()
        fetchRequests()
      } else {
        alert('Błąd: ' + data.error)
      }
    } catch (err) {
      alert('Wystąpił błąd podczas wysyłania wniosku')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (request) => {
    setFormData({
      destination_city: request.destination_city || '',
      postal_code: request.postal_code || '',
      street: request.street || '',
      delivery_date: request.delivery_date || '',
      justification: request.justification || '',
      client_name: request.client_name || '',
      mpk: request.mpk || '',
      contact_person: request.contact_person || '',
      contact_phone: request.contact_phone || '',
      notes: request.notes || ''
    })

    // Ustawienie typu i wybranego elementu na podstawie danych z edytowanego wniosku
    if(request.construction_id) {
        setRecipientType('construction');
        setSelectedEntity({ id: request.construction_id, name: request.construction_name || request.client_name, mpk: request.mpk });
    } else if (request.user_id) {
        setRecipientType('sales');
        setSelectedEntity({ id: request.user_id, name: request.requester_name || request.client_name, mpk: request.mpk });
    } else {
        setSelectedEntity(null);
    }

    setEditingRequest(request)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingRequest(null)
    setFormData({
      destination_city: '', postal_code: '', street: '',
      delivery_date: '', justification: '', client_name: '',
      mpk: '', contact_person: '', contact_phone: '', notes: ''
    })
    setSelectedEntity(null)
    setFormErrors({})
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Oczekuje
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaakceptowany
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Odrzucony
          </span>
        )
      default:
        return status
    }
  }

  if (loading && !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Moje wnioski transportowe</h1>
          <p className="mt-2 text-gray-600">Złóż wniosek o transport własny dla wybranej budowy lub handlowca</p>
        </div>

        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => {
                setShowForm(true)
                setRecipientType('construction'); // Reset do domyślnego przy otwieraniu
                setSelectedEntity(null);
                setFormData({ // Resetowanie formularza
                  destination_city: '', postal_code: '', street: '',
                  delivery_date: '', justification: '', client_name: '',
                  mpk: '', contact_person: '', contact_phone: '', notes: ''
                });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nowy wniosek transportowy
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingRequest ? 'Edytuj wniosek' : 'Nowy wniosek transportowy'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* NOWY BLOK: Wybór typu odbiorcy */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-base font-medium text-gray-800 mb-3">Wybierz typ odbiorcy</h4>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => { setRecipientType('construction'); setSelectedEntity(null); setFormData(prev => ({...prev, client_name: '', mpk: ''})) }}
                    className={`px-4 py-2 rounded-md transition-colors ${recipientType === 'construction' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 border hover:bg-gray-100'}`}
                  >
                    Budowa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientType('sales'); setSelectedEntity(null); setFormData(prev => ({...prev, client_name: '', mpk: ''})) }}
                    className={`px-4 py-2 rounded-md transition-colors ${recipientType === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 border hover:bg-gray-100'}`}
                  >
                    Handlowiec
                  </button>
                </div>
              </div>

              {/* NOWA LOGIKA: Warunkowe wyświetlanie selektorów */}
              {recipientType === 'construction' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wybierz budowę/MPK *</label>
                  <ConstructionSelector
                    value={selectedEntity}
                    onChange={(selection) => {
                      setSelectedEntity(selection);
                      if (selection) setFormData(prev => ({ ...prev, client_name: selection.name, mpk: selection.mpk }));
                    }}
                    className={formErrors.entity ? 'border-red-300' : ''}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wybierz handlowca *</label>
                  <UserSelector
                    value={selectedEntity}
                    onChange={(user) => {
                      setSelectedEntity(user);
                      if (user) setFormData(prev => ({ ...prev, client_name: user.name, mpk: user.mpk || '' }));
                    }}
                    className={formErrors.entity ? 'border-red-300' : ''}
                  />
                </div>
              )}
              {formErrors.entity && (<p className="mt-1 text-sm text-red-600">{formErrors.entity}</p>)}

              {/* Pola nieedytowalne (klient i MPK) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nazwa klienta / Odbiorca</label>
                    <input type="text" name="client_name" value={formData.client_name} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100" readOnly />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700">MPK</label>
                    <input type="text" name="mpk" value={formData.mpk} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100" readOnly />
                  </div>
              </div>
              
              {/* Reszta formularza */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Miasto docelowe *</label>
                  <input type="text" name="destination_city" value={formData.destination_city} onChange={handleInputChange} className={`mt-1 block w-full rounded-md shadow-sm ${formErrors.destination_city ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`} />
                  {formErrors.destination_city && (<p className="mt-1 text-sm text-red-600">{formErrors.destination_city}</p>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data dostawy *</label>
                  <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} className={`mt-1 block w-full rounded-md shadow-sm ${formErrors.delivery_date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`} />
                  {formErrors.delivery_date && (<p className="mt-1 text-sm text-red-600">{formErrors.delivery_date}</p>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kod pocztowy</label>
                  <input type="text" name="postal_code" value={formData.postal_code} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ulica i numer</label>
                  <input type="text" name="street" value={formData.street} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                </div>
              </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Osoba kontaktowa</label>
                  <input type="text" name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Telefon kontaktowy</label>
                  <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Uzasadnienie wniosku *</label>
                <textarea name="justification" value={formData.justification} onChange={handleInputChange} rows={4} className={`mt-1 block w-full rounded-md shadow-sm ${formErrors.justification ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`} />
                {formErrors.justification && (<p className="mt-1 text-sm text-red-600">{formErrors.justification}</p>)}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Dodatkowe uwagi</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={cancelForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Anuluj</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Zapisywanie...' : (editingRequest ? 'Zaktualizuj' : 'Złóż wniosek')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista wniosków */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Twoje wnioski transportowe</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Ładowanie wniosków...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600">Nie masz jeszcze żadnych wniosków transportowych</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Złóż pierwszy wniosek
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => (
                <div key={request.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Wniosek #{request.id}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {request.destination_city}
                          {request.postal_code && `, ${request.postal_code}`}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(new Date(request.delivery_date), 'dd.MM.yyyy', { locale: pl })}
                        </div>
                        {request.client_name && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {request.client_name}
                          </div>
                        )}
                        {request.contact_phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            {request.contact_phone}
                          </div>
                        )}
                        {(request.mpk || request.construction_name) && (
                          <div className="flex items-center md:col-span-2">
                            <Building className="w-4 h-4 mr-2" />
                            <span>
                              {request.construction_name && `${request.construction_name} - `}
                              MPK: {request.mpk}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="text-sm text-gray-800">
                          <strong>Uzasadnienie:</strong> {request.justification}
                        </p>
                      </div>

                      {request.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            <strong>Uwagi:</strong> {request.notes}
                          </p>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div className="mt-2 p-3 bg-red-50 rounded-md">
                          <p className="text-sm text-red-800">
                            <strong>Powód odrzucenia:</strong> {request.rejection_reason}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-500">
                        Utworzony: {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        {request.approved_at && (
                          <span className="ml-4">
                            {request.status === 'approved' ? 'Zaakceptowany' : 'Przetworzony'}: {format(new Date(request.approved_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            {request.approved_by && ` przez ${request.approved_by}`}
                          </span>
                        )}
                        {request.transport_id && (
                          <span className="ml-4 text-blue-600">
                            (Transport #{request.transport_id} - dodany do kalendarza)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Akcje */}
                    {request.status === 'pending' && (
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => startEdit(request)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edytuj wniosek"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
