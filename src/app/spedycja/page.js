// src/app/spedycja/page.js
'use client'
import { useState, useEffect } from 'react'
import SpedycjaForm from './components/SpedycjaForm'
import SpedycjaList from './components/SpedycjaList'
import Link from 'next/link'
import { Clipboard, Archive, Edit, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import TransportOrderForm from './components/TransportOrderForm'

export default function SpedycjaPage() {
  const [zamowienia, setZamowienia] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedZamowienie, setSelectedZamowienie] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderZamowienie, setSelectedOrderZamowienie] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCopying, setIsCopying] = useState(false); // NOWY STAN dla kopiowania
  
  // NOWY STAN: Komunikaty o operacjach
  const [operationMessage, setOperationMessage] = useState(null);

  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
  };

  // NOWA FUNKCJA: Wyświetlanie komunikatu operacji
  const showOperationMessage = (message, type = 'success') => {
    setOperationMessage({ message, type });
    setTimeout(() => {
      setOperationMessage(null);
    }, 5000); // Ukryj po 5 sekundach
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    
    // Sprawdź czy użytkownik jest administratorem i pobierz email
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setIsAdmin(data.isAdmin);
          setCurrentUserEmail(data.user.email);
        }
      } catch (error) {
        console.error('Błąd sprawdzania uprawnień użytkownika:', error);
        setIsAdmin(false);
      }
    };
    
    fetchUserInfo();
    fetchSpedycje();
  }, [showArchive]);

  const fetchSpedycje = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Pobierz dane z API z filtrem statusu
      const status = showArchive ? 'completed' : 'new';
      const response = await fetch(`/api/spedycje?status=${status}`);
      
      if (!response.ok) {
        throw new Error(`Problem z API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Pobrane dane z API:', data.spedycje);
        setZamowienia(data.spedycje);
      } else {
        // Próbujemy pobrać dane z localStorage dla kompatybilności
        const savedData = localStorage.getItem('zamowieniaSpedycja');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const filteredData = showArchive 
            ? parsedData.filter(item => item.status === 'completed')
            : parsedData.filter(item => item.status === 'new');
          setZamowienia(filteredData);
          return;
        }
        
        throw new Error(data.error || 'Błąd pobierania danych');
      }
    } catch (error) {
      console.error('Błąd pobierania danych spedycji:', error);
      
      // Próbujemy pobrać dane z localStorage dla kompatybilności
      const savedData = localStorage.getItem('zamowieniaSpedycja');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const filteredData = showArchive 
          ? parsedData.filter(item => item.status === 'completed')
          : parsedData.filter(item => item.status === 'new');
        setZamowienia(filteredData);
      } else {
        setError('Wystąpił problem podczas pobierania danych. Spróbuj ponownie później.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDodajZamowienie = async (noweZamowienie) => {
    try {
      console.log(isCopying ? 'Zapisywanie skopiowanego zamówienia:' : 'Dodawanie nowego zamówienia:', noweZamowienie);
      
      // Najpierw spróbuj zapisać do API
      try {
        const response = await fetch('/api/spedycje', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noweZamowienie)
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Odświeżamy listę po dodaniu
          fetchSpedycje();
          setShowForm(false);
          setIsCopying(false); // Resetuj stan kopiowania
          showOperationMessage(
            isCopying 
              ? 'Skopiowane zamówienie zostało pomyślnie zapisane jako nowe' 
              : 'Zamówienie spedycji zostało pomyślnie dodane', 
            'success'
          );
          return;
        }
      } catch (apiError) {
        console.error('Błąd API, używam localStorage:', apiError);
      }
      
      // Zapisz do localStorage jeśli API zawiedzie
      const zamowienieWithDetails = {
        ...noweZamowienie,
        id: Date.now(),
        status: 'new',
        createdAt: new Date().toISOString()
      };

      const savedData = localStorage.getItem('zamowieniaSpedycja');
      const currentZamowienia = savedData ? JSON.parse(savedData) : [];
      const updatedZamowienia = [...currentZamowienia, zamowienieWithDetails];
      localStorage.setItem('zamowieniaSpedycja', JSON.stringify(updatedZamowienia));
      
      fetchSpedycje();
      setShowForm(false);
      setIsCopying(false); // Resetuj stan kopiowania
      showOperationMessage(
        isCopying 
          ? 'Skopiowane zamówienie zostało dodane (lokalnie)' 
          : 'Zamówienie spedycji zostało dodane (lokalnie)', 
        'success'
      );
    } catch (error) {
      console.error('Błąd dodawania zlecenia:', error);
      showOperationMessage('Wystąpił błąd podczas dodawania zlecenia', 'error');
    }
  };

  // NOWA FUNKCJA: Obsługa kopiowania zamówienia
  const handleCopy = (zamowienie) => {
    console.log('Kopiowanie zamówienia:', zamowienie);
    
    // Przygotuj dane do skopiowania (bez ID, statusu, dat systemowych)
    const copiedData = {
      location: zamowienie.location,
      documents: zamowienie.documents || '', // POPRAWKA: Skopiuj numery zamówień zamiast czyścić
      clientName: zamowienie.clientName || '',
      producerAddress: zamowienie.producerAddress,
      delivery: {
        // Zachowaj tylko miasto, wyczyść resztę do edycji
        city: '',
        postalCode: '',
        street: '',
        pinLocation: zamowienie.delivery?.pinLocation || ''
      },
      loadingContact: zamowienie.loadingContact,
      unloadingContact: '', // Wyczyść kontakt rozładunku
      deliveryDate: '', // Wyczyść datę - użytkownik ustawi nową
      notes: zamowienie.notes || '',
      responsiblePerson: zamowienie.responsiblePerson,
      responsibleEmail: zamowienie.responsibleEmail,
      mpk: zamowienie.mpk,
      responsibleConstructions: zamowienie.responsibleConstructions || [],
      goodsDescription: zamowienie.goodsDescription || null,
      // Dodaj flagę że to kopia
      isCopy: true,
      originalOrderNumber: zamowienie.orderNumber
    };
    
    console.log('Dane do skopiowania:', copiedData);
    
    // Ustaw tryb kopiowania
    setSelectedZamowienie(copiedData);
    setIsEditing(false);
    setIsCopying(true);
    setShowForm(true);
    
    showOperationMessage(`Skopiowano zamówienie ${zamowienie.orderNumber}. Zmodyfikuj dane i zapisz jako nowe zamówienie.`, 'success');
  };

  // Nowa funkcja do obsługi edycji zamówienia
  const handleEdit = (zamowienie) => {
    console.log('Edycja zamówienia:', zamowienie);
    setSelectedZamowienie(zamowienie);
    setIsEditing(true);
    setIsCopying(false);
    setShowForm(true);
  };
  
  // Funkcja do zapisywania zmian po edycji
  const handleSaveEdit = async (id, updatedData) => {
    try {
      console.log('Zapisywanie zmian zamówienia ID:', id, 'Dane:', updatedData);
      
      // Wywołaj API
      const response = await fetch('/api/spedycje/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          ...updatedData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchSpedycje(); // Odświeżamy listę
        setShowForm(false);
        setIsEditing(false);
        setIsCopying(false);
        setSelectedZamowienie(null);
        showOperationMessage('Zamówienie zostało pomyślnie zaktualizowane', 'success');
      } else {
        throw new Error(data.error || 'Błąd aktualizacji zamówienia');
      }
    } catch (error) {
      console.error('Błąd edycji zamówienia:', error);
      showOperationMessage('Wystąpił błąd podczas zapisywania zmian: ' + error.message, 'error');
    }
  };

  // ZMODYFIKOWANA FUNKCJA handleResponse - obsługa łączenia transportów
  const handleResponse = async (zamowienieId, response) => {
    try {
      console.log('Odpowiedź na zamówienie ID:', zamowienieId, 'Dane odpowiedzi:', response);
      
      // Sprawdź czy to jest łączenie transportów
      const isMerging = response.transportsToMerge && response.transportsToMerge.length > 0;
      
      if (isMerging) {
        console.log('Wykryto łączenie transportów:', response.transportsToMerge.length);
      }
      
      // Najpierw spróbuj użyć API
      try {
        const responseApi = await fetch('/api/spedycje', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: zamowienieId,
            ...response
          })
        });
        
        const data = await responseApi.json();
        
        if (data.success) {
          setShowForm(false);
          fetchSpedycje();
          
          // Pokaż komunikat z informacją o łączeniu lub standardowej odpowiedzi
          if (isMerging) {
            showOperationMessage(data.message || `Transport został połączony z ${response.transportsToMerge.length} innymi transportami`, 'success');
          } else {
            showOperationMessage('Odpowiedź została pomyślnie zapisana', 'success');
          }
          return;
        } else {
          throw new Error(data.error || 'Błąd zapisywania odpowiedzi');
        }
      } catch (apiError) {
        console.error('Błąd API, używam localStorage:', apiError);
        throw apiError; // Rzuć błąd dalej, żeby nie próbować localStorage dla łączenia
      }
      
    } catch (error) {
      console.error('Błąd odpowiedzi na zlecenie:', error);
      showOperationMessage('Wystąpił błąd podczas zapisywania odpowiedzi: ' + error.message, 'error');
    }
  };

  const handleCreateOrder = (zamowienie) => {
    setSelectedOrderZamowienie(zamowienie)
  }
  
  // Funkcja do wysyłania zamówienia
  const handleSendOrder = async (orderData) => {
    try {
      console.log('Wysyłanie zlecenia transportowego:', orderData)
      
      const response = await fetch('/api/send-transport-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showOperationMessage('Zlecenie transportowe zostało wysłane!', 'success');
        setSelectedOrderZamowienie(null)
        fetchSpedycje() // Odśwież listę po wysłaniu
      } else {
        throw new Error(data.error || 'Nie udało się wysłać zlecenia transportowego')
      }
    } catch (error) {
      console.error('Błąd wysyłania zlecenia transportowego:', error)
      showOperationMessage('Wystąpił błąd podczas wysyłania zlecenia: ' + error.message, 'error');
      throw error
    }
  }

  // Funkcja do pobierania szczegółowych danych zamówienia przed odpowiedzią
  const handlePrepareResponse = async (zamowienie) => {
    console.log('Przygotowanie odpowiedzi dla zamówienia:', zamowienie);
    
    // Sprawdź, czy zamówienie ma już wszystkie niezbędne dane
    if (zamowienie.distanceKm || (zamowienie.distance_km !== undefined && zamowienie.distance_km !== null)) {
      console.log('Zamówienie już ma dane o odległości:', zamowienie.distanceKm || zamowienie.distance_km);
      setSelectedZamowienie(zamowienie);
      setIsEditing(false);
      setIsCopying(false);
      setShowForm(true);
      return;
    }
    
    // Próbujemy pobrać pełne dane zamówienia z API
    try {
      const response = await fetch(`/api/spedycje/${zamowienie.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.spedycja) {
          console.log('Pobrane szczegółowe dane zamówienia:', data.spedycja);
          setSelectedZamowienie(data.spedycja);
        } else {
          console.log('Używam dostępnych danych zamówienia:', zamowienie);
          setSelectedZamowienie(zamowienie);
        }
      } else {
        console.log('Błąd pobierania szczegółów, używam dostępnych danych:', zamowienie);
        setSelectedZamowienie(zamowienie);
      }
    } catch (error) {
      console.error('Błąd pobierania szczegółów zamówienia:', error);
      setSelectedZamowienie(zamowienie);
    }
    
    setIsEditing(false);
    setIsCopying(false);
    setShowForm(true);
  };

  const handleMarkAsCompleted = async (id) => {
    try {
      // Najpierw spróbuj użyć API
      try {
        const response = await fetch('/api/spedycje/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (data.success) {
          fetchSpedycje(); // Odśwież listę
          showOperationMessage('Zlecenie zostało oznaczone jako zrealizowane', 'success');
          return;
        }
      } catch (apiError) {
        console.error('Błąd API, używam localStorage:', apiError);
      }
      
      // Jeśli API zawiedzie, użyj localStorage
      const savedData = localStorage.getItem('zamowieniaSpedycja');
      if (savedData) {
        const zamowienia = JSON.parse(savedData);
        const updatedZamowienia = zamowienia.map(zam => {
          if (zam.id === id) {
            return { 
              ...zam, 
              status: 'completed',
              completedAt: new Date().toISOString(),
              // Dodajemy minimalne informacje o odpowiedzi
              response: {
                ...(zam.response || {}), // Zachowujemy istniejącą odpowiedź, jeśli istnieje
                completedManually: true,
                completedBy: 'Admin',
                completedAt: new Date().toISOString()
              }
            };
          }
          return zam;
        });
        
        localStorage.setItem('zamowieniaSpedycja', JSON.stringify(updatedZamowienia));
        fetchSpedycje();
        showOperationMessage('Zlecenie zostało oznaczone jako zrealizowane (lokalnie)', 'success');
      }
    } catch (error) {
      console.error('Błąd oznaczania jako zrealizowane:', error);
      showOperationMessage('Wystąpił błąd podczas oznaczania zlecenia jako zrealizowane', 'error');
    }
  };

  useEffect(() => {
    // Pobierz pełne uprawnienia użytkownika
    const fetchUserPermissions = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setUserRole(data.user.role);
          setIsAdmin(data.user.isAdmin);
          setCurrentUserEmail(data.user.email);
          
          // Ustaw uprawnienia na podstawie danych z API
          const permissions = data.user.permissions || {};
          
          // Domyślnie admin ma wszystkie uprawnienia
          if (data.user.isAdmin) {
            setCanAddOrder(true);
            setCanRespond(true);
            setCanSendOrder(true);
          } else {
            // Sprawdź uprawnienia spedycyjne
            setCanAddOrder(permissions?.spedycja?.add || false);
            setCanRespond(permissions?.spedycja?.respond || false);
            setCanSendOrder(permissions?.spedycja?.sendOrder || false);
          }
        }
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
      }
    };
    
    fetchUserPermissions();
  }, []);
  
  // Dodajemy nowe stany do komponentu
  const [canAddOrder, setCanAddOrder] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [canSendOrder, setCanSendOrder] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* NOWY KOMPONENT: Komunikaty o operacjach */}
      {operationMessage && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${
          operationMessage.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {operationMessage.type === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertCircle size={20} className="mr-2" />
          )}
          {operationMessage.message}
        </div>
      )}

      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Zamówienia spedycji
        </h1>
        <div className="flex gap-2">
          <button 
            className={!showArchive ? buttonClasses.primary : buttonClasses.outline}
            onClick={() => setShowArchive(false)}
          >
            <Clipboard size={18} />
            Aktywne
          </button>
          <Link 
            href="/archiwum-spedycji"
            className={buttonClasses.outline}
          >
            <Archive size={18} />
            Archiwum
          </Link>
          
          {canAddOrder && (
            <button 
              className={buttonClasses.primary}
              onClick={() => {
                setSelectedZamowienie(null);
                setIsEditing(false);
                setIsCopying(false);
                setShowForm(true);
              }}
            >
              Nowe zamówienie
            </button>
          )}
        </div>
      </div>

      {/* Lista zamówień */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow">
          {zamowienia.length > 0 ? (
            <SpedycjaList
              zamowienia={zamowienia}
              showArchive={showArchive}
              isAdmin={canRespond}
              onResponse={handlePrepareResponse}
              onMarkAsCompleted={handleMarkAsCompleted}
              onCreateOrder={handleCreateOrder}
              canSendOrder={canSendOrder}
              onEdit={handleEdit}
              onCopy={handleCopy}
              currentUserEmail={currentUserEmail}
            />
          ) : (
            <div className="p-12 text-center text-gray-500">
              {showArchive ? 'Brak zarchiwizowanych zleceń spedycji' : 'Brak aktywnych zleceń spedycji'}
            </div>
          )}
        </div>
      )}

      {/* Formularz */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SpedycjaForm 
              onSubmit={isEditing 
                ? (id, data) => handleSaveEdit(selectedZamowienie.id, data)
                : selectedZamowienie 
                  ? handleResponse 
                  : handleDodajZamowienie}
              onCancel={() => {
                setShowForm(false);
                setSelectedZamowienie(null);
                setIsEditing(false);
                setIsCopying(false);
              }}
              initialData={selectedZamowienie}
              isResponse={!!selectedZamowienie && !isEditing && !isCopying}
              isEditing={isEditing}
              isCopying={isCopying}
            />
          </div>
        </div>
      )}
      
      {selectedOrderZamowienie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TransportOrderForm
              onSubmit={handleSendOrder}
              onCancel={() => setSelectedOrderZamowienie(null)}
              zamowienie={selectedOrderZamowienie}
            />
          </div>
        </div>
      )}
    </div>
  );
}
