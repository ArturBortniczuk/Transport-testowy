// src/app/kalendarz/components/TransportsList.js - POPRAWIONA WERSJA
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { KIEROWCY, POJAZDY } from '../constants';
import { useState, useEffect } from 'react';
import { Link2, ArrowRight, ArrowLeft, CheckCircle, Link, Star } from 'lucide-react';
import TransportRatingBadge from '@/components/TransportRatingBadge';
import TransportRating from '@/components/TransportRating';

export default function TransportsList({
  selectedDate,
  transporty,
  userRole,
  userEmail,
  onZakonczTransport,
  onEditTransport,
  onPrzeniesDoPrzenoszenia,
  onConnectTransport,
  filtryAktywne = {}
}) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [ratingRefreshTrigger, setRatingRefreshTrigger] = useState(0);
  const [userPermissions, setUserPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Pobierz uprawnienia z API zamiast localStorage
  useEffect(() => {
    async function fetchUserPermissions() {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        console.log('Dane użytkownika z API:', data);
        if (data.isAuthenticated && data.user) {
          setUserPermissions(data.user.permissions || {});
          console.log('Pobrane uprawnienia:', data.user.permissions);
        }
      } catch (error) {
        console.error('Błąd pobierania uprawnień użytkownika:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserPermissions();
  }, []);
  
  // PRZENIESIENIE WALIDACJI selectedDate PO HOOKACH - naprawia błąd React #310
  if (!selectedDate || !(selectedDate instanceof Date)) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">Wybierz datę aby zobaczyć transporty</p>
      </div>
    );
  }

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const transportyNaDzien = transporty[dateKey] || [];
  
  const canEdit = userPermissions?.calendar?.edit === true || userRole === 'admin';
  const canMarkAsCompleted = userPermissions?.transport?.markAsCompleted === true || userRole === 'admin';
  
  // Funkcja otwierająca modal z oceną
  const handleOpenRating = (transport) => {
    setSelectedTransport(transport);
    setShowRatingModal(true);
  };

  // Funkcja zamykająca modal z oceną
  const handleCloseRating = () => {
    setShowRatingModal(false);
    setSelectedTransport(null);
    setRatingRefreshTrigger(prev => prev + 1);
  };
  
  // Funkcja sprawdzająca czy użytkownik może edytować transport
  const canEditTransport = (transport) => {
    // Admin może wszystko
    if (userRole === 'admin') return true;
    
    // Sprawdzamy czy użytkownik ma odpowiednie uprawnienia
    const hasPermission = userPermissions?.calendar?.edit === true;
    
    // Dla roli magazynu sprawdzamy, czy to jego magazyn
    const isCorrectMagazyn = transport.zrodlo === 'bialystok' && 
                           (userRole === 'magazyn_bialystok' || userRole === 'magazyn') ||
                           transport.zrodlo === 'zielonka' && 
                           (userRole === 'magazyn_zielonka' || userRole === 'magazyn');
    
    // Sprawdzamy czy transport został utworzony przez tego użytkownika
    const isCreator = transport.emailZlecajacego === userEmail;
    
    return hasPermission && (isCreator || isCorrectMagazyn);
  };

  // Funkcja pomocnicza sprawdzająca czy transport jest połączony z innym
  const isConnectedTransport = (transport) => {
    // Transport może mieć swój własny connected_transport_id
    if (transport.connected_transport_id) return true;
    
    // Lub być źródłem dla innego transportu
    return transportyNaDzien.some(t => t.connected_transport_id === transport.id);
  };
  
  // Funkcja pomocnicza znajdująca połączony transport
  const findConnectedTransport = (transport) => {
    if (transport.connected_transport_id) {
      return transportyNaDzien.find(t => t.id === transport.connected_transport_id);
    }
    
    return transportyNaDzien.find(t => t.connected_transport_id === transport.id);
  };

  // Funkcja do rozłączania transportów
  const handleDisconnectTransport = async (transportId) => {
    if (!confirm('Czy na pewno chcesz rozłączyć ten transport od powiązanej trasy?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/transports/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Transport został pomyślnie rozłączony');
        window.location.reload();
      } else {
        alert('Błąd podczas rozłączania transportu: ' + (data.error || 'Nieznany błąd'));
      }
    } catch (error) {
      console.error('Błąd podczas rozłączania transportu:', error);
      alert('Wystąpił nieoczekiwany błąd podczas rozłączania transportu');
    }
  };
  
  // Funkcja pomocnicza do znajdowania danych kierowcy
  const getDriverInfo = (driverId) => {
    const driver = KIEROWCY.find(k => k.id === parseInt(driverId));
    return driver ? driver.imie : 'Brak danych';
  };
  
  // Ulepszona funkcja z kompatybilnością wsteczną
  const getVehicleInfo = (pojazdId, kierowcaId) => {
    // Najpierw sprawdzamy, czy mamy pojazdId
    if (pojazdId) {
      const pojazd = POJAZDY.find(p => p.id === parseInt(pojazdId));
      return pojazd ? pojazd.nazwa : 'Nieznany pojazd';
    }
    
    // Jeśli nie ma pojazdId, sprawdzamy czy kierowca ma przypisany pojazd
    if (kierowcaId) {
      const kierowca = KIEROWCY.find(k => k.id === parseInt(kierowcaId));
      if (kierowca && kierowca.pojazdId) {
        const pojazd = POJAZDY.find(p => p.id === kierowca.pojazdId);
        return pojazd ? pojazd.nazwa : 'Brak pojazdu';
      }
    }
    
    return 'Brak pojazdu';
  };

  // Filtrowanie transportów
  const filtrowaneTransporty = transportyNaDzien.filter(transport => {
    const pasujeMagazyn = !filtryAktywne.magazyn || transport.zrodlo === filtryAktywne.magazyn;
    const pasujeKierowca = !filtryAktywne.kierowca || transport.kierowcaId === filtryAktywne.kierowca;
    const pasujeRynek = !filtryAktywne.rynek || transport.rynek === filtryAktywne.rynek;
    const pasujeStatus = !filtryAktywne.status || transport.status === filtryAktywne.status;
    
    return pasujeMagazyn && pasujeKierowca && pasujeRynek && pasujeStatus;
  });

  if (filtrowaneTransporty.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">
          Brak transportów na {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Transporty na {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
      </h3>
      
      <div className="space-y-4">
        {filtrowaneTransporty.map((transport, index) => {
          const isConnected = isConnectedTransport(transport);
          const connectedTransport = findConnectedTransport(transport);
          
          return (
            <div 
              key={transport.id} 
              className={`
                border rounded-lg p-4 transition-all duration-200
                ${isConnected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-md'}
              `}
            >
              {/* Nagłówek transportu */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-gray-900">
                    {transport.miasto}
                  </h4>
                  <p className="text-gray-600">
                    {transport.kodPocztowy} {transport.ulica ? `- ${transport.ulica}` : ''}
                  </p>
                </div>
                
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Link className="w-3 h-3 mr-1" />
                      Połączony
                    </span>
                  )}
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${transport.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      transport.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {transport.status === 'completed' ? 'Zrealizowany' : 
                     transport.status === 'active' ? 'Aktywny' : 
                     transport.status}
                  </span>
                </div>
              </div>

              {/* Szczegóły transportu */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Kierowca</p>
                  <p className="font-medium">
                    {transport.kierowcaId ? getDriverInfo(transport.kierowcaId) : 'Nie przypisano'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Pojazd</p>
                  <p className="font-medium">
                    {getVehicleInfo(transport.pojazdId, transport.kierowcaId)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Źródło</p>
                  <p className="font-medium capitalize">{transport.zrodlo}</p>
                </div>
                
                {transport.rynek && (
                  <div>
                    <p className="text-sm text-gray-500">Rynek</p>
                    <p className="font-medium">{transport.rynek}</p>
                  </div>
                )}
                
                {transport.uwagi && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Uwagi</p>
                    <p className="font-medium">{transport.uwagi}</p>
                  </div>
                )}
              </div>

              {/* Informacja o połączeniu */}
              {isConnected && connectedTransport && (
                <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Połączony z transportem do: {connectedTransport.miasto}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {connectedTransport.kodPocztowy} {connectedTransport.ulica}
                  </p>
                </div>
              )}

              {/* Ocena transportu */}
              <div className="mb-4">
                <TransportRatingBadge 
                  transportId={transport.id} 
                  refreshTrigger={ratingRefreshTrigger}
                />
              </div>

              {/* Przyciski akcji */}
              <div className="flex flex-wrap gap-2">
                {transport.status === 'active' && canMarkAsCompleted && (
                  <button
                    onClick={() => {
                      console.log('Kliknięto Zrealizuj dla transportu ID:', transport.id);
                      onZakonczTransport(dateKey, transport.id);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
                    title="Oznacz jako zrealizowany"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Zrealizuj
                  </button>
                )}

                {canEditTransport(transport) && (
                  <button
                    onClick={() => onEditTransport(transport)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                    title="Edytuj transport"
                  >
                    Edytuj
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={() => onPrzeniesDoPrzenoszenia(transport)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                    title="Przenieś na inny dzień"
                  >
                    Przenieś
                  </button>
                )}

                {/* Przycisk łączenia/rozłączania */}
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnectTransport(transport.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
                    title="Rozłącz transport"
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Rozłącz
                  </button>
                ) : (
                  canEdit && transport.status === 'active' && (
                    <button
                      onClick={() => onConnectTransport(transport)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
                      title="Połącz z innym transportem"
                    >
                      <Link className="w-4 h-4 mr-1" />
                      Połącz
                    </button>
                  )
                )}

                {/* Przycisk oceny - tylko dla zrealizowanych transportów */}
                {transport.status === 'completed' && (
                  <button
                    onClick={() => handleOpenRating(transport)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
                    title="Oceń transport"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Oceń
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal z oceną transportu */}
      {showRatingModal && selectedTransport && (
        <TransportRating
          transport={selectedTransport}
          onClose={handleCloseRating}
        />
      )}
    </div>
  );
}
