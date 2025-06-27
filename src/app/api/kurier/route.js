// src/app/api/kurier/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  const session = await db('sessions')
    .where('token', authToken)
    .whereRaw('expires_at > NOW()')
    .select('user_id')
    .first();
  
  return session?.user_id;
};

// GET - Pobierz zamówienia kurierskie (z opcjonalnym filtrowaniem)
export async function GET(request) {
  try {
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Sprawdź parametry URL
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = db('kuriers');

    console.log('🔍 Kurier API - parametr status:', statusFilter);

    // POPRAWIONA LOGIKA FILTROWANIA
    if (statusFilter === 'completed') {
      // Archiwum - zamówienia zatwierdzone, wysłane i dostarczone
      console.log('📦 Pobieranie archiwum - statusy: approved, sent, delivered');
      query = query.whereIn('status', ['approved', 'sent', 'delivered']);
    } else if (statusFilter === 'active') {
      // Aktywne - tylko nowe zamówienia
      console.log('🆕 Pobieranie aktywnych - status: new');
      query = query.where('status', 'new');
    } else if (statusFilter === 'all') {
      // Wszystkie zamówienia
      console.log('🌍 Pobieranie wszystkich zamówień');
      // Nie dodawaj filtra - pokaż wszystko
    } else {
      // Domyślnie pokazuj tylko aktywne zamówienia (nowe)
      console.log('🔄 Domyślnie - pokazuj aktywne (new)');
      query = query.where('status', 'new');
    }

    // Pobierz zamówienia, sortowane od najnowszych
    const zamowienia = await query.orderBy('created_at', 'desc');

    console.log(`✅ Pobrano ${zamowienia.length} zamówień dla statusu: ${statusFilter || 'default(active)'}`);
    
    // DEBUG: Pokaż statusy w danych
    const statusy = [...new Set(zamowienia.map(z => z.status))];
    console.log('📊 Statusy w zwróconych danych:', statusy);

    return NextResponse.json({ 
      success: true, 
      zamowienia: zamowienia || [],
      debug: {
        statusFilter: statusFilter,
        count: zamowienia.length,
        statusyWDanych: statusy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching kurier orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Dodaj nowe zamówienie kurierskie (BEZ ZMIAN)
export async function POST(request) {
  try {
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name')
      .first();

    const zamowienieData = await request.json();
    console.log('Otrzymane dane zamówienia kurierskiego:', zamowienieData);

    // Mapowanie danych z NOWEGO formularza na kolumny bazy danych
    const dataToSave = {
      status: 'new',
      created_by_email: userId,
      magazine_source: user.role, // Rola użytkownika
      magazine_destination: 'external', // Zawsze zewnętrzne dla kuriera
      recipient_name: zamowienieData.odbiorcaNazwa,
      recipient_address: `${zamowienieData.odbiorcaUlica} ${zamowienieData.odbiorcaNumerDomu}${zamowienieData.odbiorcaNumerLokalu ? '/' + zamowienieData.odbiorcaNumerLokalu : ''}, ${zamowienieData.odbiorcaKodPocztowy} ${zamowienieData.odbiorcaMiasto}`,
      recipient_phone: zamowienieData.odbiorcaTelefon,
      package_description: `${zamowienieData.zawartoscPrzesylki} | Waga: ${zamowienieData.waga}kg | Wymiary: ${zamowienieData.dlugosc}x${zamowienieData.szerokosc}x${zamowienieData.wysokosc}cm | Ilość: ${zamowienieData.iloscPaczek}`,
      notes: JSON.stringify({
        // NOWA STRUKTURA - z informacją o typie zlecenia
        typZlecenia: zamowienieData.typZlecenia,
        
        // Dane nadawcy
        nadawca: {
          typ: zamowienieData.nadawcaTyp,
          nazwa: zamowienieData.nadawcaNazwa,
          adres: `${zamowienieData.nadawcaUlica} ${zamowienieData.nadawcaNumerDomu}${zamowienieData.nadawcaNumerLokalu ? '/' + zamowienieData.nadawcaNumerLokalu : ''}, ${zamowienieData.nadawcaKodPocztowy} ${zamowienieData.nadawcaMiasto}`,
          kontakt: zamowienieData.nadawcaOsobaKontaktowa,
          telefon: zamowienieData.nadawcaTelefon,
          email: zamowienieData.nadawcaEmail
        },
        
        // Dane odbiorcy
        odbiorca: {
          typ: zamowienieData.odbiorcaTyp,
          email: zamowienieData.odbiorcaEmail,
          kontakt: zamowienieData.odbiorcaOsobaKontaktowa || zamowienieData.odbiorcaNazwa
        },
        
        // Szczegóły przesyłki
        przesylka: {
          mpk: zamowienieData.MPK,
          uwagi: zamowienieData.uwagi,
          waga: zamowienieData.waga,
          wymiary: {
            dlugosc: zamowienieData.dlugosc,
            szerokosc: zamowienieData.szerokosc, 
            wysokosc: zamowienieData.wysokosc
          },
          ilosc: zamowienieData.iloscPaczek
        },
        
        // Informacja o magazynach (dla łatwiejszego filtrowania później)
        magazyny: {
          nadawca: zamowienieData.typZlecenia.includes('nadawca_') ? 
            zamowienieData.typZlecenia.replace('nadawca_', '') : null,
          odbiorca: zamowienieData.typZlecenia.includes('odbiorca_') ? 
            zamowienieData.typZlecenia.replace('odbiorca_', '') : null
        }
      }),
      created_at: db.fn.now()
    };

    console.log('Dane do zapisania w bazie:', dataToSave);

    // Zapisz do bazy danych
    const [id] = await db('kuriers').insert(dataToSave).returning('id');

    return NextResponse.json({ 
      success: true, 
      id: id,
      message: `Zamówienie kurierskie zostało dodane (${zamowienieData.typZlecenia})`
    });
  } catch (error) {
    console.error('Error adding kurier order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
