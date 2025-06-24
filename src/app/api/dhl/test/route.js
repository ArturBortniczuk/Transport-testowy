// src/app/api/dhl/test/route.js
import { NextResponse } from 'next/server';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  const session = await (await import('@/database/db')).default('sessions')
    .where('token', authToken)
    .whereRaw('expires_at > NOW()')
    .select('user_id')
    .first();
  
  return session?.user_id;
};

// GET - Test połączenia z DHL
export async function GET(request) {
  try {
    // Sprawdź autoryzację
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('Testing DHL connection for user:', userId);

    // Import DHL service
    const { default: DHLApiService } = await import('@/app/services/dhl-api');
    
    // Test połączenia
    const testResult = await DHLApiService.testConnection();
    
    // Dodaj informacje o konfiguracji (bez haseł)
    const config = {
      baseUrl: process.env.DHL_API_URL || 'Nie ustawione',
      login: process.env.DHL_LOGIN || 'Nie ustawione',
      sapClient: process.env.DHL_SAP_CLIENT || 'Nie ustawione',
      passwordSet: !!process.env.DHL_PASSWORD_API
    };

    return NextResponse.json({ 
      success: testResult.success,
      message: testResult.message,
      error: testResult.error,
      config: config,
      timestamp: new Date().toISOString(),
      testedBy: userId
    });

  } catch (error) {
    console.error('DHL test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd testowania połączenia: ' + error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST - Test utworzenia próbnej przesyłki
export async function POST(request) {
  try {
    // Sprawdź autoryzację
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('Testing DHL shipment creation for user:', userId);

    // Pobierz dane użytkownika
    const db = (await import('@/database/db')).default;
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name')
      .first();

    // Sprawdź uprawnienia (tylko admin może testować)
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Tylko administrator może testować tworzenie przesyłek' 
      }, { status: 403 });
    }

    // Przykładowe dane testowe
    const testShipmentData = {
      id: 'TEST_' + Date.now(),
      recipient_name: 'Test Odbiorca',
      recipient_address: 'ul. Testowa 1, 00-001 Warszawa',
      recipient_phone: '+48123456789',
      package_description: 'Przesyłka testowa | Waga: 1kg | Wymiary: 20x15x10cm | Ilość: 1',
      notes: JSON.stringify({
        typZlecenia: 'nadawca_bialystok',
        nadawca: {
          nazwa: 'Grupa Eltron Sp. z o.o.',
          adres: 'ul. Wysockiego 69B, 15-169 Białystok',
          kontakt: 'Test Nadawca',
          telefon: '+48857152705',
          email: 'test@grupaeltron.pl',
          typ: 'firma'
        },
        odbiorca: {
          typ: 'osoba',
          email: 'test.odbiorca@example.com',
          kontakt: 'Test Odbiorca'
        },
        przesylka: {
          mpk: 'TEST123',
          uwagi: 'To jest przesyłka testowa',
          waga: 1,
          wymiary: {
            dlugosc: 20,
            szerokosc: 15,
            wysokosc: 10
          },
          ilosc: 1
        }
      })
    };

    // Import DHL service i test utworzenia przesyłki
    const { default: DHLApiService } = await import('@/app/services/dhl-api');
    const shipmentResult = await DHLApiService.createShipment(testShipmentData);

    return NextResponse.json({ 
      success: shipmentResult.success,
      data: shipmentResult.success ? {
        shipmentNumber: shipmentResult.shipmentNumber,
        trackingNumber: shipmentResult.trackingNumber,
        cost: shipmentResult.cost,
        labelUrl: shipmentResult.labelUrl
      } : null,
      error: shipmentResult.error,
      testData: testShipmentData,
      timestamp: new Date().toISOString(),
      testedBy: userId
    });

  } catch (error) {
    console.error('DHL shipment test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd testowania utworzenia przesyłki: ' + error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
