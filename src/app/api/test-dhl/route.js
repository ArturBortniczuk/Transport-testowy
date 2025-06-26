// src/app/api/test-dhl/route.js
import { NextResponse } from 'next/server';
import DHLApiService from '@/app/services/dhl-api';

export async function GET(request) {
  try {
    console.log('🧪 Rozpoczynam PEŁNĄ DIAGNOZĘ DHL API...');
    
    // Uruchom pełną diagnozę
    const fullDiagnosis = await DHLApiService.diagnoseDHLConnection();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      title: '🔍 PEŁNA DIAGNOZA DHL API',
      diagnosis: fullDiagnosis,
      
      // Dodatkowe informacje o środowisku
      environment: {
        DHL_TEST_MODE: process.env.DHL_TEST_MODE,
        DHL_LOGIN: process.env.DHL_LOGIN ? `✅ SET (${process.env.DHL_LOGIN})` : '❌ NOT SET',
        DHL_PASSWORD_DHL24: process.env.DHL_PASSWORD_DHL24 ? `✅ SET (${process.env.DHL_PASSWORD_DHL24.substring(0, 3)}...)` : '❌ NOT SET',
        DHL_PASSWORD_API: process.env.DHL_PASSWORD_API ? `✅ SET (${process.env.DHL_PASSWORD_API.substring(0, 3)}...)` : '❌ NOT SET',
        DHL_ACCOUNT_NUMBER: process.env.DHL_ACCOUNT_NUMBER ? `✅ SET (${process.env.DHL_ACCOUNT_NUMBER})` : '❌ NOT SET',
        DHL_SAP_CLIENT: process.env.DHL_SAP_CLIENT ? `✅ SET (${process.env.DHL_SAP_CLIENT})` : '❌ NOT SET'
      },
      
      // Instrukcje dla użytkownika
      nextSteps: generateNextSteps(fullDiagnosis),
      
      // Możliwe rozwiązania
      possibleSolutions: [
        '1. Sprawdź czy dane logowania są poprawne w panelu DHL',
        '2. Upewnij się, że konto jest aktywne w środowisku sandbox',
        '3. Sprawdź czy numer konta ServicePoint jest prawidłowy',
        '4. Skontaktuj się z supportem DHL w celu weryfikacji konta',
        '5. Sprawdź czy nie używasz danych produkcyjnych w środowisku sandbox'
      ]
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas diagnozy DHL:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      recommendations: [
        'Sprawdź logi serwera dla szczegółów błędu',
        'Upewnij się, że wszystkie zmienne środowiskowe są ustawione',
        'Sprawdź połączenie internetowe',
        'Spróbuj ponownie za kilka minut'
      ]
    }, { status: 500 });
  }
}

// Funkcja generująca następne kroki na podstawie diagnozy
function generateNextSteps(diagnosis) {
  const steps = [];
  
  if (!diagnosis.environment.hasLogin) {
    steps.push('🚨 KRYTYCZNE: Ustaw zmienną środowiskową DHL_LOGIN');
  }
  
  if (!diagnosis.environment.hasPassword) {
    steps.push('🚨 KRYTYCZNE: Ustaw zmienną środowiskową DHL_PASSWORD_DHL24');
  }
  
  if (!diagnosis.environment.hasAccountNumber) {
    steps.push('🚨 KRYTYCZNE: Ustaw zmienną środowiskową DHL_ACCOUNT_NUMBER');
  }
  
  if (diagnosis.tests.credentialCombinations?.workingVariants?.length > 0) {
    const workingVariant = diagnosis.tests.credentialCombinations.workingVariants[0];
    steps.push(`✅ UŻYJ: ${workingVariant.name} - ta konfiguracja działa!`);
    steps.push(`📋 WSDL: ${workingVariant.wsdl}`);
    steps.push(`🔐 AUTH: ${JSON.stringify(workingVariant.auth)}`);
  } else {
    steps.push('❌ Brak działającej konfiguracji - wymagana interwencja');
    steps.push('📞 Skontaktuj się z DHL Support lub sprawdź dane logowania');
  }
  
  if (diagnosis.tests.dataValidation?.issues?.length > 0) {
    steps.push('⚠️ PROBLEMY Z DANYMI:');
    diagnosis.tests.dataValidation.issues.forEach(issue => {
      steps.push(`   - ${issue}`);
    });
  }
  
  return steps;
}

export async function POST(request) {
  try {
    // Test z własnymi danymi
    const customData = await request.json();
    console.log('🧪 Test DHL z custom danymi:', customData);
    
    // Jeśli podano credentials, użyj ich
    if (customData.testCredentials) {
      console.log('🔧 Testowanie z custom credentials...');
      
      // Stwórz tymczasową instancję z custom credentials
      const tempService = Object.create(DHLApiService);
      tempService.login = customData.testCredentials.login;
      tempService.password = customData.testCredentials.password;
      tempService.accountNumber = customData.testCredentials.accountNumber;
      
      const result = await tempService.testCredentialCombinations();
      
      return NextResponse.json({
        success: true,
        result: result,
        customData: customData,
        note: 'Test z custom credentials zakończony'
      });
    }
    
    // Standardowy test
    const result = await DHLApiService.createShipment(customData);
    
    return NextResponse.json({
      success: true,
      result: result,
      customData: customData,
      note: 'Test z danymi zamówienia zakończony'
    });
    
  } catch (error) {
    console.error('❌ Błąd custom testu DHL:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
