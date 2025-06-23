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

// GET - Pobierz wszystkie zamówienia kurierskie
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

    // Pobierz wszystkie zamówienia, sortowane od najnowszych
    const zamowienia = await db('kuriers')
      .orderBy('created_at', 'desc');

    return NextResponse.json({ 
      success: true, 
      zamowienia: zamowienia || []
    });
  } catch (error) {
    console.error('Error fetching kurier orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Dodaj nowe zamówienie kurierskie
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

    // Na razie każdy zalogowany może dodawać zamówienia kurierskie
    // Później możemy to ograniczyć do konkretnych ról

    const zamowienieData = await request.json();
    console.log('Otrzymane dane zamówienia kurierskiego:', zamowienieData);

    // Mapowanie danych z formularza na kolumny bazy danych
    const dataToSave = {
      status: 'new',
      created_by_email: userId,
      magazine_source: zamowienieData.magazynZamawiajacy || user.role,
      magazine_destination: 'external', // Zawsze zewnętrzne dla kuriera
      recipient_name: zamowienieData.odbiorcaNazwa,
      recipient_address: `${zamowienieData.odbiorcaUlica} ${zamowienieData.odbiorcaNumerDomu}${zamowienieData.odbiorcaNumerLokalu ? '/' + zamowienieData.odbiorcaNumerLokalu : ''}, ${zamowienieData.odbiorcaKodPocztowy} ${zamowienieData.odbiorcaMiasto}`,
      recipient_phone: zamowienieData.odbiorcaTelefon,
      package_description: `${zamowienieData.zawartoscPrzesylki} | Waga: ${zamowienieData.waga}kg | Wymiary: ${zamowienieData.dlugosc}x${zamowienieData.szerokosc}x${zamowienieData.wysokosc}cm | Ilość: ${zamowienieData.iloscPaczek}`,
      notes: JSON.stringify({
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
          email: zamowienieData.odbiorcaEmail
        },
        // Szczegóły przesyłki
        przesylka: {
          mpk: zamowienieData.MPK,
          uwagi: zamowienieData.uwagi
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
      message: 'Zamówienie kurierskie zostało dodane'
    });
  } catch (error) {
    console.error('Error adding kurier order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
