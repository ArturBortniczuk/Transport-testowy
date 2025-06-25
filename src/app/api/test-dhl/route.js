// src/app/api/test-dhl/route.js
import { NextResponse } from 'next/server';
import DHLApiService from '@/app/services/dhl-api';

export async function GET(request) {
  try {
    console.log('🧪 Rozpoczynam test DHL API...');
    
    // Test 1: Sprawdź strukturę SOAP
    console.log('\n--- TEST 1: Struktura SOAP ---');
    const soapTest = await DHLApiService.testSOAPStructure();
    
    // Test 2: Pełny test z przykładowymi danymi
    console.log('\n--- TEST 2: Przykładowa przesyłka ---');
    const shipmentTest = await DHLApiService.testDHLConnection();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        soapStructure: soapTest,
        shipmentCreation: shipmentTest
      },
      environment: {
        DHL_TEST_MODE: process.env.DHL_TEST_MODE,
        DHL_LOGIN: process.env.DHL_LOGIN ? '✅ SET' : '❌ NOT SET',
        DHL_PASSWORD_DHL24: process.env.DHL_PASSWORD_DHL24 ? '✅ SET' : '❌ NOT SET',
        DHL_ACCOUNT_NUMBER: process.env.DHL_ACCOUNT_NUMBER ? '✅ SET' : '❌ NOT SET',
        DHL_API_URL: process.env.DHL_API_URL || 'default'
      }
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
    console.log('🧪 Test DHL z custom danymi:', customData);
    
    const result = await DHLApiService.createShipment(customData);
    
    return NextResponse.json({
      success: true,
      result: result,
      customData: customData
    });
    
  } catch (error) {
    console.error('❌ Błąd custom testu DHL:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
