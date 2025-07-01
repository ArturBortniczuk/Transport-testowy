// src/app/api/kurier/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  try {
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first();
    
    return session?.user_id;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
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
        error: 'Brak autoryzacji. Zaloguj się ponownie.' 
      }, { status: 401 });
    }

    // Sprawdź czy tabela istnieje
    const tableExists = await db.schema.hasTable('kuriers');
    if (!tableExists) {
      console.error('❌ Tabela kuriers nie istnieje w bazie danych');
      return NextResponse.json({ 
        success: false, 
        error: 'Tabela kuriers nie istnieje w bazie danych',
        suggestion: 'Uruchom migracje bazy danych'
      }, { status: 500 });
    }

    // Sprawdź parametry URL
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 Kurier API GET - parametry:', { statusFilter, limit, offset });

    let query = db('kuriers');

    // POPRAWIONA LOGIKA FILTROWANIA
    if (statusFilter === 'completed' || statusFilter === 'archive') {
      // Archiwum - zamówienia zatwierdzone, wysłane i dostarczone
      console.log('📦 Pobieranie archiwum - statusy: approved, sent, delivered');
      query = query.whereIn('status', ['approved', 'sent', 'delivered']);
    } else if (statusFilter === 'active' || statusFilter === 'new') {
      // Aktywne - tylko nowe zamówienia
      console.log('🆕 Pobieranie aktywnych - status: new');
      query = query.where('status', 'new');
    } else if (statusFilter === 'sent') {
      // Wysłane
      query = query.where('status', 'sent');
    } else if (statusFilter === 'delivered') {
      // Dostarczone
      query = query.where('status', 'delivered');
    } else if (statusFilter === 'approved') {
      // Zatwierdzone
      query = query.where('status', 'approved');
    } else if (statusFilter === 'all') {
      // Wszystkie zamówienia
      console.log('🌍 Pobieranie wszystkich zamówień');
      // Nie dodawaj filtra - pokaż wszystko
    } else {
      // Domyślnie pokazuj tylko aktywne zamówienia (nowe)
      console.log('🔄 Domyślnie - pokazuj aktywne (new)');
      query = query.where('status', 'new');
    }

    // Pobierz zamówienia z limitami, sortowane od najnowszych
    const zamowienia = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Pobierz całkowitą liczbę dla paginacji
    let countQuery = db('kuriers');
    if (statusFilter === 'completed' || statusFilter === 'archive') {
      countQuery = countQuery.whereIn('status', ['approved', 'sent', 'delivered']);
    } else if (statusFilter === 'active' || statusFilter === 'new') {
      countQuery = countQuery.where('status', 'new');
    } else if (statusFilter && statusFilter !== 'all') {
      countQuery = countQuery.where('status', statusFilter);
    }
    
    const totalCountResult = await countQuery.count('* as count').first();
    const totalCount = parseInt(totalCountResult?.count || 0);

    console.log(`✅ Pobrano ${zamowienia.length}/${totalCount} zamówień dla statusu: ${statusFilter || 'default(active)'}`);
    
    // DEBUG: Pokaż statusy w danych
    const statusy = [...new Set(zamowienia.map(z => z.status))];
    console.log('📊 Statusy w zwróconych danych:', statusy);

    // Formatuj dane - dodaj bezpieczne parsowanie notes
    const formattedZamowienia = zamowienia.map(zamowienie => {
      let parsedNotes = {};
      try {
        if (zamowienie.notes && typeof zamowienie.notes === 'string') {
          parsedNotes = JSON.parse(zamowienie.notes);
        }
      } catch (error) {
        console.warn(`Błąd parsowania notes dla zamówienia ${zamowienie.id}:`, error);
        parsedNotes = {};
      }

      return {
        ...zamowienie,
        parsedNotes,
        // Dodaj sformatowane daty
        created_at_formatted: zamowienie.created_at ? new Date(zamowienie.created_at).toISOString() : null,
        updated_at_formatted: zamowienie.updated_at ? new Date(zamowienie.updated_at).toISOString() : null
      };
    });

    return NextResponse.json({ 
      success: true, 
      zamowienia: formattedZamowienia,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        hasMore: (offset + limit) < totalCount
      },
      filters: {
        statusFilter: statusFilter || 'active',
        appliedStatus: statusFilter
      },
      debug: {
        statusFilter: statusFilter,
        count: zamowienia.length,
        totalCount: totalCount,
        statusyWDanych: statusy
      }
    });
  } catch (error) {
    console.error('❌ Error w Kurier API GET:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera podczas pobierania zamówień',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
}

// POST - Utwórz nowe zamówienie kurierskie
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

    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('name', 'role', 'email')
      .first();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Użytkownik nie znaleziony' 
      }, { status: 404 });
    }

    const data = await request.json();
    console.log('📦 Tworzenie nowego zamówienia kurierskiego:', data);

    // Walidacja wymaganych pól
    const requiredFields = ['magazine_source', 'recipient_name', 'recipient_street', 'recipient_city', 'recipient_postcode'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Brakujące wymagane pola: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Przygotuj dane do zapisu
    const zamowienieData = {
      // Podstawowe dane
      magazine_source: data.magazine_source,
      
      // Dane odbiorcy
      recipient_name: data.recipient_name,
      recipient_street: data.recipient_street,
      recipient_city: data.recipient_city,
      recipient_postcode: data.recipient_postcode,
      recipient_phone: data.recipient_phone || null,
      recipient_email: data.recipient_email || null,
      recipient_company: data.recipient_company || null,
      
      // Dane paczki
      package_weight: parseFloat(data.package_weight) || null,
      package_length: parseFloat(data.package_length) || null,
      package_width: parseFloat(data.package_width) || null,
      package_height: parseFloat(data.package_height) || null,
      package_type: data.package_type || 'package',
      package_contents: data.package_contents || null,
      package_value: parseFloat(data.package_value) || null,
      
      // Usługi
      service_type: data.service_type || 'domestic',
      pickup_date: data.pickup_date || null,
      pickup_time_from: data.pickup_time_from || null,
      pickup_time_to: data.pickup_time_to || null,
      
      // Dodatkowe opcje
      cod_amount: data.cod_amount ? parseFloat(data.cod_amount) : null,
      insurance_amount: data.insurance_amount ? parseFloat(data.insurance_amount) : null,
      saturday_delivery: data.saturday_delivery || false,
      return_service: data.return_service || false,
      
      // Notatki jako JSON
      notes: data.notes ? JSON.stringify(data.notes) : JSON.stringify({}),
      
      // Status i metadane
      status: 'new',
      created_by_email: user.email,
      created_by_name: user.name,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Zapisz do bazy danych
    const [newZamowienie] = await db('kuriers')
      .insert(zamowienieData)
      .returning('*');

    console.log('✅ Utworzono nowe zamówienie kurierskie:', newZamowienie.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Zamówienie kurierskie zostało utworzone',
      zamowienie: newZamowienie
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error w Kurier API POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd podczas tworzenia zamówienia: ' + error.message
    }, { status: 500 });
  }
}
