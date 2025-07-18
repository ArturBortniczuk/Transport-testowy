'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ChangePassword from './ChangePassword'

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminAccess, setAdminAccess] = useState({
    isFullAdmin: false,
    packagings: false,
    constructions: false
  })
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const pathname = usePathname()
  const router = useRouter()

  // Funkcja pomocnicza do obsługi różnych formatów boolean
  const isTrueValue = (value) => {
    return value === true || 
           value === 1 || 
           value === 't' || 
           value === 'TRUE' || 
           value === 'true' || 
           value === 'T';
  };

  // Funkcja pobierająca dane użytkownika
  const fetchUserInfo = async () => {
    try {
      console.log('Pobieranie informacji o użytkowniku...');
      const response = await fetch('/api/user');
      const data = await response.json();
      
      console.log('Odpowiedź z API:', data);
      
      setIsLoggedIn(data.isAuthenticated);
      if (data.isAuthenticated && data.user) {
        const role = data.user.role;
        // Normalizacja roli dla zachowania wstecznej kompatybilności
        let normalizedRole = role;
        if (role === 'magazyn_bialystok') normalizedRole = 'magazyn';
        if (role === 'magazyn_zielonka') normalizedRole = 'magazyn';
        
        setUserRole(normalizedRole || null);
        setUserName(data.user.name || '');
        
        // Poprawiona obsługa wartości isAdmin
        const adminStatus = 
          data.user.isAdmin === true || 
          data.user.isAdmin === 1 || 
          data.user.isAdmin === 't' || 
          data.user.isAdmin === 'TRUE' ||
          data.user.isAdmin === 'true' ||
          data.user.role === 'admin';
        
        setIsAdmin(adminStatus);

        // Sprawdź uprawnienia administracyjne
        const permissions = data.user.permissions || {};
        const hasPackagingsAccess = permissions.admin?.packagings === true;
        const hasConstructionsAccess = permissions.admin?.constructions === true;
        
        setAdminAccess({
          isFullAdmin: adminStatus,
          packagings: adminStatus || hasPackagingsAccess,
          constructions: adminStatus || hasConstructionsAccess
        });
        
        console.log('Stan po aktualizacji:', {
          isLoggedIn: true,
          userRole: normalizedRole,
          originalRole: role,
          userName: data.user.name,
          isAdmin: adminStatus,
          adminAccess: {
            isFullAdmin: adminStatus,
            packagings: adminStatus || hasPackagingsAccess,
            constructions: adminStatus || hasConstructionsAccess
          }
        });
      } else {
        setUserRole(null);
        setUserName('');
        setIsAdmin(false);
        setAdminAccess({
          isFullAdmin: false,
          packagings: false,
          constructions: false
        });
        console.log('Użytkownik niezalogowany');
      }
    } catch (error) {
      console.error('Błąd sprawdzania autoryzacji:', error);
      setIsLoggedIn(false);
    }
  };

  // Wywołujemy funkcję przy montowaniu komponentu i przy zmianie ścieżki
  useEffect(() => {
    fetchUserInfo();
    
    // Okresowe odświeżanie stanu co 60 sekund (tylko w środowisku deweloperskim)
    const intervalId = process.env.NODE_ENV === 'development' 
      ? setInterval(() => {
          setLastRefresh(Date.now());
          fetchUserInfo();
        }, 60000)
      : null;
      
    // Własne zdarzenie do odświeżania po zalogowaniu
    const handleAuthChange = () => {
      console.log('Wykryto zmianę stanu uwierzytelnienia');
      fetchUserInfo();
    };
    
    window.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
      });
      
      // Odśwież stan komponentu
      setIsLoggedIn(false);
      setUserRole(null);
      setUserName('');
      setIsAdmin(false);
      setAdminAccess({
        isFullAdmin: false,
        packagings: false,
        constructions: false
      });
      
      // Emituj zdarzenie zmiany stanu uwierzytelnienia
      window.dispatchEvent(new Event('auth-state-changed'));
      
      // Przekieruj do strony logowania
      router.push('/login');
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    }
  };

  // Obsługa kliknięcia na link do panelu administratora
  const handleAdminClick = (e) => {
    e.preventDefault();
    
    // Jeśli pełny administrator, przejdź do głównego panelu
    if (adminAccess.isFullAdmin) {
      router.push('/admin');
      return;
    }
    
    // Jeśli ma tylko uprawnienia do opakowań
    if (adminAccess.packagings && !adminAccess.constructions) {
      router.push('/admin/packagings');
      return;
    }
    
    // Jeśli ma tylko uprawnienia do budów
    if (adminAccess.constructions && !adminAccess.packagings) {
      router.push('/admin/constructions');
      return;
    }
    
    // Jeśli ma uprawnienia do obu, ale nie jest pełnym adminem, przejdź do panelu
    router.push('/admin');
  };

  const publicLinks = [
    { name: 'Strona Główna', path: '/' }
  ];

  const privateLinks = [
    { name: 'Kalendarz', path: '/kalendarz' },
    { name: 'Mapa', path: '/mapa' },
    { name: 'Spedycja', path: '/spedycja' }
  ];
  
  // Dodaj link do panelu admina, jeśli ma jakiekolwiek uprawnienia administracyjne
  if (adminAccess.isFullAdmin || adminAccess.packagings || adminAccess.constructions) {
    console.log('Dodawanie linku do panelu administratora');
    privateLinks.push({ 
      name: 'Panel Administratora', 
      path: '#', // Będziemy obsługiwać kliknięcie przez handleAdminClick
      onClick: handleAdminClick
    });
  }
  
  // Dodaj link do modułu kurierskiego dla wszystkich zalogowanych użytkowników
  privateLinks.push({ name: 'Kurier', path: '/kurier' });

  const navLinks = isLoggedIn ? privateLinks : publicLinks;
  const isActive = (path) => pathname === path;

  // Debug - wyświetlamy stan komponentu
  console.log('Rendering Navigation z:', { isLoggedIn, userRole, isAdmin, adminAccess, userName });

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-bold text-xl">TransportSystem</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.name}
                  onClick={link.onClick}
                  className={`${
                    pathname.startsWith('/admin')
                      ? 'text-white border-b-2 border-white'
                      : 'text-blue-100 hover:text-white'
                  } px-3 py-2 text-sm font-medium transition-custom`}
                >
                  {link.name}
                </button>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`${
                    isActive(link.path)
                      ? 'text-white border-b-2 border-white'
                      : 'text-blue-100 hover:text-white'
                  } px-3 py-2 text-sm font-medium transition-custom`}
                >
                  {link.name}
                </Link>
              )
            ))}
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="text-blue-100 hover:text-white px-3 py-2 text-sm font-medium transition-custom"
              >
                Logowanie
              </Link>
            ) : (
              <>
                <span className="text-blue-100 px-3 py-2 text-sm">
                  {userName}
                </span>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="text-blue-100 hover:text-white px-3 py-2 text-sm font-medium transition-custom"
                >
                  Zmień hasło
                </button>
                <button
                  onClick={handleLogout}
                  className="text-blue-100 hover:text-white px-3 py-2 text-sm font-medium transition-custom"
                >
                  Wyloguj się
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-200 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                link.onClick ? (
                  <button
                    key={link.name}
                    onClick={link.onClick}
                    className={`${
                      pathname.startsWith('/admin')
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    } block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-custom`}
                  >
                    {link.name}
                  </button>
                ) : (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`${
                      isActive(link.path)
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    } block px-3 py-2 rounded-md text-base font-medium transition-custom`}
                  >
                    {link.name}
                  </Link>
                )
              ))}
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="block text-blue-100 hover:bg-blue-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-custom"
                >
                  Logowanie
                </Link>
              ) : (
                <>
                  <div className="px-3 py-2 text-sm text-blue-100">
                    {userName}
                  </div>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full text-left text-blue-100 hover:bg-blue-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-custom"
                  >
                    Zmień hasło
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-blue-100 hover:bg-blue-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-custom"
                  >
                    Wyloguj się
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal zmiany hasła */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </nav>
  );
}
