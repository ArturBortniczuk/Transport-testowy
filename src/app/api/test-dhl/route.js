// src/app/api/test-dhl/route.js
import { NextResponse } from 'next/server';
import DHLApiService from '@/app/services/dhl-api';

export async function GET(request) {
  try {
    console.log('🧪 Rozpoczynam test DHL API (ServicePoint)...');
    
    // Test 0: Sprawdź wszystkie URL DHL
    console.log('\n--- TEST 0: Wszystkie URL DHL ---');
    const urlTest = await DHLApiService.testMultipleURLs();
    console.log('URL Test Results:', urlTest);
    
    // Test 1: Sprawdź strukturę SOAP
    console.log('\n--- TEST 1: Struktura SOAP (ServicePoint) ---');
    const soapTest = await DHLApiService.testSOAPStructure();
    
    // Test 2: Prosta przesyłka z poprawną strukturą
    console.log('\n--- TEST 2: Prosta przesyłka (ServicePoint API) ---');
    const simpleTest = await DHLApiService.testSimpleShipment();
    
    // Test 3: Pełny test z przykładowymi danymi
    console.log('\n--- TEST 3: Przykładowa przesyłka (ServicePoint) ---');
    const shipmentTest = await DHLApiService.testDHLConnection();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      note: 'Tests updated to use DHL ServicePoint API with username/password auth',
      tests: {
        urlTest: urlTest,
        soapStructure: soapTest,
        simpleShipment: simpleTest,
        shipmentCreation: shipmentTest
      },
      environment: {
        DHL_TEST_MODE: process.env.DHL_TEST_MODE,
        DHL_LOGIN: process.env.DHL_LOGIN ? '✅ SET' : '❌ NOT SET',
        DHL_PASSWORD_DHL24: process.env.DHL_PASSWORD_DHL24 ? '✅ SET' : '❌ NOT SET',
        DHL_ACCOUNT_NUMBER: process.env.DHL_ACCOUNT_NUMBER ? '✅ SET' : '❌ NOT SET',
        DHL_API_URL: process.env.DHL_API_URL || 'https://sandbox.dhl24.com.pl/servicepoint?wsdl (default)'
      },
      fixes: [
        'Changed from login to username in authData (per DHL documentation)',
        'Switched to ServicePoint API (https://sandbox.dhl24.com.pl/servicepoint?wsdl)',
        'Updated structure to match CreateShipmentStructure from WSDL',
        'Added proper shipper/receiver with address/contact/preaviso',
        'Fixed pieceList structure with lenght field (DHL API typo)',
        'Added servicePointAccountNumber field'
      ]
    });
    
  } catch (error) {
    console.error('❌ Błąd testu DHL:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Możliwość testowania z własnymi danymi
    const customData = await request.json();
    console.log('🧪 Test DHL z custom danymi (ServicePoint):', customData);
    
    const result = await DHLApiService.createShipment(customData);
    
    return NextResponse.json({
      success: true,
      result: result,
      customData: customData,
      note: 'Using DHL ServicePoint API with corrected structure'
    });
    
  } catch (error) {
    console.error('❌ Błąd custom testu DHL:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
