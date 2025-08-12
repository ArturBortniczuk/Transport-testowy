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
  const [isCopying, setIsCopying] = useState(false);
  
  // Stan: Komunikaty o operacjach
  const [operationMessage, setOperationMessage] = useState(null);

  // Dodatkowe stany dla uprawnień
  const [canAddOrder, setCanAddOrder] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [canSendOrder, setCanSendOrder] = useState(false);

  const buttonClasses = {
    primary: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2",
    outline: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
  };

  // Funkcja: Wyświetlanie komunikatu operacji
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
          
          // Ustaw uprawnienia na podstawie roli
          if (data.user.isAdmin) {
            setCanAddOrder(true);
            setCanRespond(true);
            setCanSendOrder(true);
          } else {
            // Sprawdź uprawnienia spedycyjne
            const permissions = data.user.permissions || {};
            setCanAddOrder(permissions?.spedycja?.add || false);
            setCanRespond(permissions?.spedycja?.respond || false);
            setCanSendOrder(permissions?.spedycja?.sendOrder || false);
          }
        }
      } catch (error) {
        console.error('Błąd sprawdzania uprawnień użytkownika:', error);
        setIsAdmin(false);
        setCanAddOrder(false);
        setCanRespond(false);  
        setCanSendOrder(false);
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
      const status = showArchive ? 'completed' : 'new,responded';
      const response = await fetch(`/api/spedycje?status=${status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setZamowienia(data.spedycje);
      } else {
        throw new Error(data.error || 'Nieznany błąd');
      }
    } catch (error) {
      console.error('Błąd pobierania spedycji:', error);
      
      // Fallback do localStorage jeśli API zawiedzie
      try {
        const savedData = localStorage.getItem('zamowieniaSpedycja');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const filteredData = parsedData.filter(zam => {
            if (showArchive) {
              return zam.status === 'completed';
            } else {
              return zam.status === 'new';
            }
          });
          setZamowienia(filteredData);
          setError('Używam danych offline - niektóre funkcje mogą być ograniczone');
        } else {
          setError('Brak danych do wyświetlenia');
          setZamowienia([]);
        }
      } catch (localError) {
        console.error('Błąd odczytu localStorage:', localError);
        setError('Wystąpił błąd podczas pobierania danych: ' + error.message);
        setZamowienia([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja obsługi dodawania nowego zamówienia
  const handleSubmit = async (data) => {
    try {
      console.log('Dodawanie nowego zamówienia:', data);

      // Najpierw spróbuj użyć API
      try {
        const response = await fetch('/api/spedycje', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          fetchSpedycje();
          setShowForm(false);
          setSelectedZamowienie(null);
          setIsEditing(false);
          setIsCopying(false);
          showOperationMessage('Zamówienie zostało pomyślnie dodane', 'success');
          return;
        } else {
          throw new Error(result.error || 'Błąd dodawania zamówienia');
        }
      } catch (apiError) {
        console.error('Błąd API, używam localStorage:', apiError);
      }

      // Jeśli API zawiedzie, użyj localStorage
      const savedData = localStorage.getItem('zamowieniaSpedycja');
      const zamowienia = savedData ? JSON.parse(savedData) : [];
      
      const newOrder = {
        ...data,
        id: Date.now(), // Tymczasowe ID
        status: 'new',
        createdAt: new Date().toISOString(),
        orderNumber: `SP-${Date.now()}`
      };
      
      zamowienia.push(newOrder);
      localStorage.setItem('zamowieniaSpedycja', JSON.stringify(zamowienia));
      
      fetchSpedycje();
      setShowForm(false);
      setSelectedZamowienie(null);
      setIsEditing(false);
      setIsCopying(false);
      showOperationMessage('Zamówienie zostało dodane (tryb offline)', 'success');
    } catch (error) {
      console.error('Błąd dodawania zamówienia:', error);
      showOperationMessage('Wystąpił błąd podczas dodawania zamówienia: ' + error.message, 'error');
    }
  };

  // Funkcja do oznaczania jako zrealizowane
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
        } else {
          throw new Error(data.error || 'Błąd oznaczania jako zrealizowane');
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
              completedAt: new Date().toISOString()
            };
          }
          return zam;
        });
        
        localStorage.setItem('zamowieniaSpedycja', JSON.stringify(updatedZamowienia));
        fetchSpedycje(); // Odśwież listę
        showOperationMessage('Zlecenie zostało oznaczone jako zrealizowane (tryb offline)', 'success');
      }
    } catch (error) {
      console.error('Błąd oznaczania jako zrealizowane:', error);
      showOperationMessage('Wystąpił błąd podczas oznaczania jako zrealizowane: ' + error.message, 'error');
    }
  };

  // Funkcja do kopiowania zamówienia
  const handleCopy = (zamowienie) => {
    console.log('Kopiowanie zamówienia:', zamowienie);
    
    // Przygotuj dane do skopiowania (bez ID i danych systemowych)
    const copiedData = {
      ...zamowienie,
      id: undefined, // Usunięcie ID żeby utworzyć nowe
      createdAt: undefined,
      updatedAt: undefined,
      status: 'new',
      response: null,
      response_data: null,
      originalOrderNumber: zamowienie.orderNumber || `#${zamowienie.id}` // Zachowaj referencję do oryginalnego
    };
    
    setSelectedZamowienie(copiedData);
    setIsEditing(false);
    setIsCopying(true);
    setShowForm(true);
    showOperationMessage(`Skopiowano zamówienie ${zamowienie.orderNumber || `#${zamowienie.id}`}. 
Zmodyfikuj dane i zapisz jako nowe zamówienie.`, 'success');
  };

  // Funkcja do obsługi edycji zamówienia
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
      
      // Najpierw spróbuj użyć API
      try {
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
          return;
        } else {
          throw new Error(data.error || 'Błąd aktualizacji zamówienia');
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
              ...updatedData,
              updatedAt: new Date().toISOString()
            };
          }
          return zam;
        });
        
        localStorage.setItem('zamowieniaSpedycja', JSON.stringify(updatedZamowienia));
        fetchSpedycje(); // Odśwież listę
        setShowForm(false);
        setIsEditing(false);
        setIsCopying(false);
        setSelectedZamowienie(null);
        showOperationMessage('Zamówienie zostało zaktualizowane (tryb offline)', 'success');
      }
    } catch (error) {
      console.error('Błąd edycji zamówienia:', error);
      showOperationMessage('Wystąpił błąd podczas zapisywania zmian: ' + error.message, 'error');
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

  // Funkcja sprawdzania uprawnień do dodawania zamówień  
  const checkCanAddOrder = () => {
    return true; // Wszyscy mogą dodawać nowe zapytania spedycyjne
  };

  // Funkcja sprawdzania uprawnień do odpowiadania
  const checkCanRespond = () => {
    return isAdmin || canRespond;
  };

  // Funkcja sprawdzania uprawnień do wysyłania zleceń
  const checkCanSendOrder = () => {
    return isAdmin || canSendOrder;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && zamowienia.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-semibold mb-2">Błąd ładowania</h3>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchSpedycje}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Komunikat o operacji */}
      {operationMessage && (
        <div className={`mb-4 p-4 rounded-lg border ${
          operationMessage.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        } flex items-center`}>
          {operationMessage.type === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertCircle size={20} className="mr-2" />
          )}
          {operationMessage.message}
        </div>
      )}

      {/* Komunikat o błędzie, ale z danymi */}
      {error && zamowienia.length > 0 && (
        <div className="mb-4 p-4 rounded-lg border bg-yellow-50 text-yellow-800 border-yellow-200 flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Zamówienia spedycji
        </h1>
        <div className="flex flex-wrap gap-2">
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
          
          {checkCanAddOrder() && (
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
              isAdmin={checkCanRespond()}
              onMarkAsCompleted={handleMarkAsCompleted}
              onCreateOrder={handleCreateOrder}
              canSendOrder={checkCanSendOrder()}
              onEdit={handleEdit}
              onCopy={handleCopy}
              currentUserEmail={currentUserEmail}
              fetchSpedycje={fetchSpedycje}
              showOperationMessage={showOperationMessage}
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
                ? (data) => handleSaveEdit(selectedZamowienie.id, data)
                : selectedZamowienie 
                  ? handleSubmit // To dla kopiowania - traktujemy jako nowe zamówienie
                  : handleSubmit  // To dla zupełnie nowego zamówienia
              }
              onCancel={() => {
                setShowForm(false);
                setSelectedZamowienie(null);
                setIsEditing(false);
                setIsCopying(false);
              }}
              initialData={selectedZamowienie}
              isResponse={false} // Nigdy nie używamy trybu odpowiedzi - to jest usunięte
              isEditing={isEditing}
              isCopying={isCopying}
            />
          </div>
        </div>
      )}

      {/* Modal zlecenia transportowego */}
      {selectedOrderZamowienie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TransportOrderForm
              zamowienie={selectedOrderZamowienie}
              onClose={() => setSelectedOrderZamowienie(null)}
              onSubmit={handleSendOrder}
            />
          </div>
        </div>
      )}

      {/* Informacje o statusie systemu */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            error ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
          {error 
            ? 'System działa w trybie offline' 
            : 'System połączony z bazą danych'
          }
        </div>
      </div>
    </div>
  );
}
