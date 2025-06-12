// src/app/kalendarz/components/TransportsList.js - KOMPLETNY POPRAWIONY KOD
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
  
  // WALIDACJA selectedDate - to naprawia błąd React #310
  if (!selectedDate || !(selectedDate instanceof Date)) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">Wybierz datę aby zobaczyć transporty</p>
      </div>
    );
  }

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const transportyNaDzien = transporty[dateKey] || [];
  
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
  
  // Filtrujemy według aktywnych filtrów
  const filtrowaneTransporty = transportyNaDzien.filter(transport => {
    // Sprawdź czy transport jest zrealizowany
    const isCompleted = transport.status === 'completed' || transport.status === 'zakończony';
    
    // Jeśli transport jest zrealizowany i nie chcemy pokazywać zrealizowanych, odfiltrowujemy
    if (isCompleted && !filtryAktywne.pokazZrealizowane) {
      return false;
    }
    
    const pasujeMagazyn = !filtryAktywne.magazyn || transport.zrodlo === filtryAktywne.magazyn;
    const pasujeKierowca = !filtryAktywne.kierowca || parseInt(transport.kierowcaId) === filtryAktywne.kierowca;
    const pasujePojazd = !filtryAktywne.pojazd || 
                         parseInt(transport.pojazdId) === filtryAktywne.pojazd || 
                         (!transport.pojazdId && parseInt(transport.kierowcaId) === filtryAktywne.pojazd);
    const pasujeRynek = !filtryAktywne.rynek || transport.rynek === filtryAktywne.rynek;
    
    return pasujeMagazyn && pasujeKierowca && pasujePojazd && pasujeRynek;
  });

  // POPRAWIONA funkcja sprawdzająca czy użytkownik może edytować transport
  const canEditTransport = (transport) => {
    // Admin może zawsze edytować
    if (userRole === 'admin') return true;
    
    // Sprawdź czy użytkownik ma rolę magazynu
    const isMagazynRole = userRole === 'magazyn' || 
                         userRole?.startsWith('magazyn_') ||
                         userRole === 'magazyn_bialystok' ||
                         userRole === 'magazyn_zielonka';
    
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
      return pojazd ? pojazd.tabliceRej : 'Brak danych';
    }
    
    // Jeśli nie mamy pojazdId, ale mamy kierowcaId, użyjmy starego mapowania
    if (kierowcaId) {
      // W starym systemie id kierowcy odpowiadało id pojazdu
      const pojazd = POJAZDY.find(p => p.id === parseInt(kierowcaId));
      return pojazd ? pojazd.tabliceRej : 'Brak danych';
    }
    
    return 'Brak danych';
  };
  
  // Sprawdź, czy transport może być połączony (nie jest już połączony i jest aktywny)
  const canBeConnected = (transport) => {
    return !isConnectedTransport(transport) && transport.status === 'active' && canEdit;
  };

  if (isLoading) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          Ładowanie uprawnień...
        </div>
      </div>
    );
  }

  if (filtrowaneTransporty.length === 0) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          Brak transportów na ten dzień
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Transporty na {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
          </h2>
        </div>

        <div className="p-6">     
          <div className="space-y-4">
            {filtrowaneTransporty.map(transport => {
              const kierowca = KIEROWCY.find(k => k.id === parseInt(transport.kierowcaId));
              
              // Sprawdź, czy transport jest połączony
              const isConnected = isConnectedTransport(transport);
              const isSource = transportyNaDzien.some(t => t.connected_transport_id === transport.id);
              const isTarget = transport.connected_transport_id !== null;
              
              // Sprawdź czy transport jest zrealizowany
              const isCompleted = transport.status === 'completed' || transport.status === 'zakończony';
              
              // Znajdź połączony transport, jeśli istnieje
              const connectedTransport = isConnected ? findConnectedTransport(transport) : null;
              
              return (
                <div 
                  key={transport.id} 
                  className={`
                    border rounded-lg p-4 hover:shadow-md transition-all duration-200
                    ${isConnected ? 'border-l-4 border-blue-500' : ''}
                    ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Nagłówek transportu */}
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transport.miasto} ({transport.kodPocztowy})
                        </h3>
                        
                        {/* Status badges */}
                        {isCompleted && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Zrealizowany
                          </span>
                        )}
                        
                        {isConnected && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                            <Link className="w-3 h-3 mr-1" />
                            Połączony
                          </span>
                        )}
                      </div>

                      {transport.ulica && (
                        <p className="text-gray-600 mb-2">{transport.ulica}</p>
                      )}

                      {/* Szczegółowe informacje */}
                      <div className="text-sm text-gray-500 space-y-1 mt-3">
                        <p><strong>Klient:</strong> {transport.nazwaKlienta}</p>
                        
                        {transport.osobaZlecajaca && (
                          <p><strong>Osoba zlecająca:</strong> {transport.osobaZlecajaca}</p>
                        )}
                        
                        {transport.mpk && (
                          <p><strong>MPK:</strong> {transport.mpk}</p>
                        )}
                        
                        <p><strong>Kierowca:</strong> {getDriverInfo(transport.kierowcaId)}</p>
                        <p><strong>Pojazd:</strong> {getVehicleInfo(transport.pojazdId, transport.kierowcaId)}</p>
                        <p><strong>Magazyn:</strong> {transport.zrodlo}</p>
                        <p><strong>Odległość:</strong> {transport.odleglosc} km</p>
                        <p><strong>Poziom załadunku:</strong> {transport.poziomZaladunku}</p>
                        <p><strong>WZ:</strong> {transport.numerWZ}</p>
                        {transport.rynek && (
                          <p><strong>Rynek:</strong> {transport.rynek}</p>
                        )}
                      </div>

                      {/* Informacje o połączeniu */}
                      {isConnected && connectedTransport && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Połączony z:</strong> {connectedTransport.miasto} ({connectedTransport.kodPocztowy})
                          </p>
                          {isSource && (
                            <p className="text-xs text-blue-600 mt-1">
                              Ten transport jest źródłem dla połączonej trasy
                            </p>
                          )}
                          {isTarget && (
                            <p className="text-xs text-blue-600 mt-1">
                              Ten transport jest częścią połączonej trasy
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Panel akcji */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {/* Ocena transportu - tylko dla ukończonych */}
                      {isCompleted && (
                        <div className="flex flex-col items-end space-y-2">
                          <TransportRatingBadge 
                            transportId={transport.id} 
                            refreshTrigger={ratingRefreshTrigger}
                          />
                          <button
                            onClick={() => handleOpenRating(transport)}
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Pokaż/Dodaj ocenę"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Przyciski akcji tylko dla aktywnych transportów */}
                      {!isCompleted && (
                        <>
                          {canMarkAsCompleted && (
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
                              <ArrowLeft className="w-4 h-4 mr-1" />
                              Rozłącz
                            </button>
                          ) : (
                            canBeConnected(transport) && onConnectTransport && (
                              <button
                                onClick={() => onConnectTransport(transport)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
                                title="Połącz z innym transportem"
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Połącz
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal ze szczegółowymi ocenami */}
      {showRatingModal && selectedTransport && (
        <TransportRating
          transportId={selectedTransport.id}
          onClose={handleCloseRating}
        />
      )}
    </>
  );
}
