// src/app/api/kurier/queries/[id]/route.js
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

// Funkcja sprawdzająca uprawnienia do zapytań kurierskich
const checkKurierQueryPermissions = async (userId) => {
  const user = await db('users')
    .where('email', userId)
    .select('role', 'permissions')
    .first();

  if (!user) return { canAdd: false, canApprove: false, canViewAll: false };

  let permissions = {};
  try {
    if (user.permissions) {
      permissions = JSON.parse(user.permissions);
    }
  } catch (error) {
    console.error('Błąd parsowania uprawnień:', error);
  }

  const isAdmin = user.role === 'admin';
  const kurierPerms = permissions.kurier?.queries || {};

  return {
    canAdd: isAdmin || kurierPerms.add !== false,
    canApprove: isAdmin || kurierPerms.approve === true,
    canViewAll: isAdmin || kurierPerms.viewAll === true,
    canView: isAdmin || kurierPerms.view !== false
  };
};

// GET - Pobierz konkretne zapytanie
export async function GET(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    const { id } = params;
    
    const query = await db('kurier_queries')
      .where('id', id)
      .first();

    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zapytanie nie znalezione' 
      }, { status: 404 });
    }

    // Sprawdź czy użytkownik może zobaczyć to zapytanie
    if (!permissions.canViewAll && query.created_by_email !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do przeglądania tego zapytania' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      query,
      permissions 
    });
  } catch (error) {
    console.error('Error fetching kurier query:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT - Aktualizuj zapytanie (akceptuj/odrzuć lub edytuj)
export async function PUT(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    const { id } = params;
    const updateData = await request.json();

    console.log(`🔄 Aktualizacja zapytania ${id} przez ${userId}:`, updateData);

    // Pobierz istniejące zapytanie
    const existingQuery = await db('kurier_queries')
      .where('id', id)
      .first();

    if (!existingQuery) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zapytanie nie znalezione' 
      }, { status: 404 });
    }

    // AKCEPTACJA LUB ODRZUCENIE ZAPYTANIA
    if (updateData.action === 'approve' || updateData.action === 'reject') {
      if (!permissions.canApprove) {
        return NextResponse.json({ 
          success: false, 
          error: 'Brak uprawnień do akceptowania zapytań' 
        }, { status: 403 });
      }

      if (existingQuery.status !== 'new') {
        return NextResponse.json({ 
          success: false, 
          error: 'Zapytanie zostało już przetworzone' 
        }, { status: 400 });
      }

      const newStatus = updateData.action === 'approve' ? 'approved' : 'rejected';
      console.log(`${updateData.action === 'approve' ? '✅' : '❌'} ${newStatus.toUpperCase()} zapytania ${id}`);

      // Aktualizuj status w bazie danych
      const updated = await db('kurier_queries')
        .where('id', id)
        .update({
          status: newStatus,
          processed_by: userId,
          processed_at: db.fn.now(),
          processing_notes: updateData.notes || '',
          internal_notes: updateData.internalNotes || '',
          updated_at: db.fn.now()
        });

      if (updated === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Nie udało się zaktualizować zapytania' 
        }, { status: 500 });
      }

      let dhlResult = null;

      // Jeśli zaakceptowano, spróbuj automatycznie utworzyć przesyłkę DHL
      if (newStatus === 'approved') {
        console.log(`🚚 Próba automatycznego utworzenia przesyłki DHL dla zapytania ${id}`);
        
        try {
          dhlResult = await convertQueryToShipment(existingQuery, userId);
          
          if (dhlResult.success) {
            console.log(`✅ DHL: Przesyłka utworzona pomyślnie:`, dhlResult.dhlData);
            
            // Zapisz dane DHL w zapytaniu
            await db('kurier_queries')
              .where('id', id)
              .update({
                dhl_data: JSON.stringify(dhlResult.dhlData),
                updated_at: db.fn.now()
              });
          } else {
            console.error(`❌ DHL: Błąd tworzenia przesyłki:`, dhlResult.error);
          }
        } catch (dhlError) {
          console.error('💥 DHL: Krytyczny błąd:', dhlError);
          dhlResult = { success: false, error: dhlError.message };
        }
      }

      const successMessage = newStatus === 'approved' 
        ? (dhlResult?.success 
          ? 'Zapytanie zaakceptowane i przesyłka DHL została utworzona!' 
          : 'Zapytanie zaakceptowane (problem z DHL - sprawdź szczegóły)')
        : 'Zapytanie zostało odrzucone';

      return NextResponse.json({ 
        success: true,
        message: successMessage,
        status: newStatus,
        dhlResult: dhlResult,
        queryId: id
      });
    }

    // EDYCJA ZAPYTANIA
    // Sprawdź czy użytkownik może edytować to zapytanie
    if (existingQuery.created_by_email !== userId && !permissions.canViewAll) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do edycji tego zapytania' 
      }, { status: 403 });
    }

    // Nie można edytować już przetworzonych zapytań
    if (existingQuery.status !== 'new') {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie można edytować już przetworzonych zapytań' 
      }, { status: 400 });
    }

    // Aktualizuj zapytanie (edycja przez właściciela)
    const updated = await db('kurier_queries')
      .where('id', id)
      .update({
        ...updateData.changes,
        updated_at: db.fn.now()
      });

    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie udało się zaktualizować zapytania' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Zapytanie zostało zaktualizowane'
    });
  } catch (error) {
    console.error('Error updating kurier query:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Usuń zapytanie
export async function DELETE(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const permissions = await checkKurierQueryPermissions(userId);
    const { id } = params;

    // Pobierz zapytanie
    const query = await db('kurier_queries')
      .where('id', id)
      .first();

    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zapytanie nie znalezione' 
      }, { status: 404 });
    }

    // Tylko właściciel lub admin może usuwać
    const canDelete = query.created_by_email === userId || permissions.canViewAll;
    
    if (!canDelete) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do usunięcia zapytania' 
      }, { status: 403 });
    }

    // Nie można usuwać zaakceptowanych zapytań z DHL
    if (query.status === 'approved' && query.dhl_data) {
      try {
        const dhlData = JSON.parse(query.dhl_data);
        if (dhlData.shipmentNumber) {
          return NextResponse.json({ 
            success: false, 
            error: 'Nie można usunąć zapytania z utworzoną przesyłką DHL. Skontaktuj się z administratorem.' 
          }, { status: 400 });
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }

    await db('kurier_queries')
      .where('id', id)
      .del();

    return NextResponse.json({ 
      success: true,
      message: 'Zapytanie zostało usunięte'
    });
  } catch (error) {
    console.error('Error deleting kurier query:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// FUNKCJA POMOCNICZA: Konwersja zapytania na przesyłkę DHL
async function convertQueryToShipment(query, userId) {
  try {
    console.log('🔄 Konwersja zapytania na przesyłkę DHL:', query.id);

    if (!query) {
      throw new Error('Brak danych zapytania');
    }

    // Przygotuj format danych zgodny z DHL API
    const shipmentData = {
      id: `QUERY_${query.id}`,
      recipient_name: query.contact_person,
      recipient_address: `${query.address || ''}, ${query.postal_code || ''} ${query.city || ''}`.trim(),
      recipient_phone: query.contact_phone,
      package_description: buildPackageDescription(query),
      notes: JSON.stringify({
        typZlecenia: 'zapytanie_kurierskie',
        zapytanie: {
          id: query.id,
          typ: query.query_type,
          priorytet: query.priority,
          pilne: query.is_urgent,
          utworzoneBy: query.created_by_email,
          akceptowaneBy: userId,
          dataPreferowana: query.preferred_date,
          czasPreferowany: query.preferred_time
        },
        nadawca: buildSenderData(),
        odbiorca: {
          typ: 'klient',
          email: query.contact_email,
          kontakt: query.contact_person,
          telefon: query.contact_phone
        },
        przesylka: {
          opis: query.description,
          uwagi: query.special_instructions,
          typ: query.package_type,
          waga: query.weight,
          wymiary: query.dimensions,
          ilosc: query.quantity,
          zawartosc: query.content_description
        },
        platnosc: {
          sposob: query.payment_method,
          szacowanyKoszt: query.estimated_cost,
          uwagi: query.cost_notes
        }
      })
    };

    console.log('📦 Dane przesyłki przygotowane:', shipmentData);

    // Wyślij do DHL
    const { default: DHLApiService } = await import('@/app/services/dhl-api');
    const dhlResult = await DHLApiService.createShipment(shipmentData);

    console.log('🚚 Wynik DHL API:', dhlResult);

    if (dhlResult.success) {
      return {
        success: true,
        dhlData: {
          shipmentNumber: dhlResult.shipmentNumber,
          trackingNumber: dhlResult.trackingNumber,
          labelUrl: dhlResult.labelUrl,
          labelContent: dhlResult.labelContent,
          cost: dhlResult.cost,
          sentAt: new Date().toISOString(),
          sentBy: userId,
          queryId: query.id
        }
      };
    } else {
      throw new Error(dhlResult.error || 'Nieznany błąd DHL');
    }
  } catch (error) {
    console.error('💥 Błąd konwersji zapytania na przesyłkę:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Funkcja pomocnicza - buduj opis paczki
function buildPackageDescription(query) {
  const parts = [];
  
  if (query.content_description) {
    parts.push(query.content_description);
  } else if (query.description) {
    parts.push(query.description.substring(0, 50));
  } else {
    parts.push('Przesyłka kurierska');
  }
  
  if (query.weight) {
    parts.push(`Waga: ${query.weight}kg`);
  }
  
  if (query.dimensions) {
    parts.push(`Wymiary: ${query.dimensions}cm`);
  }
  
  if (query.quantity && query.quantity > 1) {
    parts.push(`Ilość: ${query.quantity}`);
  }
  
  if (query.package_type) {
    const typeLabel = 
      query.package_type === 'document' ? 'Dokumenty' :
      query.package_type === 'package' ? 'Paczka' :
      query.package_type === 'pallet' ? 'Paleta' : query.package_type;
    parts.push(`Typ: ${typeLabel}`);
  }
  
  return parts.join(' | ');
}

// Funkcja pomocnicza - dane nadawcy (Grupa Eltron)
function buildSenderData() {
  return {
    typ: 'firma',
    nazwa: 'Grupa Eltron Sp. z o.o.',
    adres: 'ul. Wysockiego 69B, 15169 Białystok',
    kontakt: 'Magazyn Białystok',
    telefon: '857152705',
    email: 'bialystok@grupaeltron.pl'
  };
}
