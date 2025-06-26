// src/app/services/dhl-api.js
// Dynamiczny import soap dla środowiska serverless
let soap;
try {
  soap = require('soap');
} catch (error) {
  console.error('SOAP library not available:', error);
}

class DHLApiService {
  constructor() {
    // Różne URL do testowania
    this.possibleUrls = {
      servicepoint: 'https://sandbox.dhl24.com.pl/servicepoint?wsdl',
      webapi2: 'https://sandbox.dhl24.com.pl/webapi2?wsdl',
      production: 'https://dhl24.com.pl/servicepoint?wsdl' // Produkcyjny - tylko dla testów
    };
    
    // Domyślnie używaj ServicePoint
    this.wsdlUrl = this.possibleUrls.servicepoint;
    
    console.log('Final WSDL URL:', this.wsdlUrl);
    
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.passwordApi = process.env.DHL_PASSWORD_API;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.sapClient = process.env.DHL_SAP_CLIENT;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL API Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      login: this.login ? `SET (${this.login})` : 'NOT SET',
      password: this.password ? `SET (${this.password.substring(0, 3)}...)` : 'NOT SET',
      passwordApi: this.passwordApi ? `SET (${this.passwordApi.substring(0, 3)}...)` : 'NOT SET',
      accountNumber: this.accountNumber ? `SET (${this.accountNumber})` : 'NOT SET',
      sapClient: this.sapClient ? `SET (${this.sapClient})` : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // NOWA METODA: Test różnych kombinacji danych logowania
  async testCredentialCombinations() {
    console.log('=== TESTOWANIE RÓŻNYCH KOMBINACJI DANYCH LOGOWANIA ===');
    
    const credentialVariants = [
      {
        name: 'Standard ServicePoint (username/password)',
        wsdl: this.possibleUrls.servicepoint,
        auth: { username: this.login, password: this.password }
      },
      {
        name: 'ServicePoint z password API',
        wsdl: this.possibleUrls.servicepoint,
        auth: { username: this.login, password: this.passwordApi }
      },
      {
        name: 'WebAPI2 (login/password)',
        wsdl: this.possibleUrls.webapi2,
        auth: { login: this.login, password: this.password }
      },
      {
        name: 'WebAPI2 z password API',
        wsdl: this.possibleUrls.webapi2,
        auth: { login: this.login, password: this.passwordApi }
      },
      {
        name: 'ServicePoint bez SAP',
        wsdl: this.possibleUrls.servicepoint,
        auth: { username: this.login, password: this.password }
      }
    ];

    const results = [];

    for (const [index, variant] of credentialVariants.entries()) {
      console.log(`\n--- Test ${index + 1}: ${variant.name} ---`);
      
      try {
        if (!soap) {
          results.push({
            variant: index + 1,
            name: variant.name,
            success: false,
            error: 'SOAP library not available'
          });
          continue;
        }

        const client = await soap.createClientAsync(variant.wsdl, {
          timeout: 15000,
          disableCache: true
        });

        // Przygotuj minimalne dane testowe
        const testParams = this.prepareMinimalTestData(variant.auth, variant.wsdl);
        
        console.log(`Testowe dane dla ${variant.name}:`, JSON.stringify(testParams, null, 2));

        // Wybierz odpowiednią metodę w zależności od API
        let result;
        if (variant.wsdl.includes('webapi2')) {
          result = await client.createShipmentAsync(testParams);
        } else {
          result = await client.createShipmentAsync(testParams);
        }
        
        console.log(`Rezultat dla ${variant.name}:`, JSON.stringify(result, null, 2));
        
        // Sprawdź czy to sukces
        const isSuccess = result && result[0] && 
          (result[0].createShipmentResult?.shipmentNumber || 
           result[0].shipmentNumber ||
           !result[0].createShipmentResult === null);
        
        results.push({
          variant: index + 1,
          name: variant.name,
          wsdl: variant.wsdl,
          auth: variant.auth,
          success: isSuccess,
          result: result ? result[0] : 'No result',
          shipmentNumber: result?.[0]?.createShipmentResult?.shipmentNumber || result?.[0]?.shipmentNumber,
          error: isSuccess ? null : 'No shipment number returned'
        });

      } catch (error) {
        console.error(`Error in variant ${index + 1} (${variant.name}):`, error.message);
        
        results.push({
          variant: index + 1,
          name: variant.name,
          wsdl: variant.wsdl,
          auth: variant.auth,
          success: false,
          error: error.message,
          errorDetails: {
            code: error.code,
            faultCode: this.extractFaultCode(error),
            isAuthError: this.isAuthenticationError(error)
          }
        });
      }
    }

    console.log('\n=== PODSUMOWANIE TESTÓW DANYCH LOGOWANIA ===');
    results.forEach(result => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`${status} - ${result.name}: ${result.error || 'OK'}`);
      if (result.errorDetails?.isAuthError) {
        console.log(`  🔐 Auth Error Details: Code ${result.errorDetails.faultCode}`);
      }
    });

    return {
      success: true,
      results: results,
      workingVariants: results.filter(r => r.success),
      authErrors: results.filter(r => r.errorDetails?.isAuthError),
      recommendations: this.generateRecommendations(results)
    };
  }

  // Funkcja pomocnicza do przygotowania minimalnych danych testowych
  prepareMinimalTestData(authData, wsdlUrl) {
    if (wsdlUrl.includes('webapi2')) {
      // Struktura dla WebAPI2
      return {
        authData: authData,
        shipment: {
          shipperAddress: {
            name: "Test Shipper",
            postalCode: "00-999",
            city: "Warszawa",
            street: "Testowa",
            houseNumber: "1"
          },
          receiverAddress: {
            name: "Test Receiver",
            postalCode: "30-001",
            city: "Kraków",
            street: "Odbiorcza",
            houseNumber: "2"
          },
          pieceList: {
            item: [{
              type: "PACKAGE",
              weight: 1,
              width: 10,
              height: 10,
              length: 10
            }]
          },
          content: "Test content",
          paymentInfo: {
            paymentMethod: "SENDER",
            accountNumber: this.accountNumber
          }
        }
      };
    } else {
      // Struktura dla ServicePoint
      return {
        shipment: {
          authData: authData,
          shipmentData: {
            ship: {
              shipper: {
                address: {
                  name: "Test Shipper",
                  postcode: "00-999",
                  city: "Warszawa",
                  street: "Testowa",
                  houseNumber: "1"
                },
                contact: {
                  personName: "Test Person",
                  phoneNumber: "600700800",
                  emailAddress: "test@test.pl"
                },
                preaviso: {
                  personName: "Test Person",
                  phoneNumber: "600700800",
                  emailAddress: "test@test.pl"
                }
              },
              receiver: {
                address: {
                  addressType: "B",
                  name: "Test Receiver",
                  postcode: "30-001",
                  city: "Kraków",
                  street: "Odbiorcza",
                  houseNumber: "2"
                },
                contact: {
                  personName: "Test Receiver",
                  phoneNumber: "600800900",
                  emailAddress: "receiver@test.pl"
                },
                preaviso: {
                  personName: "Test Receiver",
                  phoneNumber: "600800900",
                  emailAddress: "receiver@test.pl"
                }
              },
              servicePointAccountNumber: this.accountNumber
            },
            shipmentInfo: {
              dropOffType: "REGULAR_PICKUP",
              serviceType: "LM",
              billing: {
                shippingPaymentType: "SHIPPER",
                billingAccountNumber: this.accountNumber,
                paymentType: "BANK_TRANSFER",
                costsCenter: "TEST"
              },
              shipmentDate: new Date().toISOString().split('T')[0],
              shipmentStartHour: "10:00",
              shipmentEndHour: "15:00",
              labelType: "BLP"
            },
            pieceList: {
              item: [{
                type: "PACKAGE",
                width: 10,
                height: 10,
                lenght: 10, // DHL używa "lenght" (błąd w ich API)
                weight: 1,
                quantity: 1,
                nonStandard: false
              }]
            },
            content: "Test content",
            comment: "Test comment",
            reference: "TEST_REF"
          }
        }
      };
    }
  }

  // Funkcje pomocnicze do analizy błędów
  extractFaultCode(error) {
    if (error.message && error.message.includes(':')) {
      return error.message.split(':')[0];
    }
    return null;
  }

  isAuthenticationError(error) {
    const authKeywords = ['301', 'authorization', 'autoryzacji', 'unauthorized', 'auth'];
    return authKeywords.some(keyword => 
      error.message?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.every(r => !r.success)) {
      recommendations.push('🚨 Wszystkie testy nie powiodły się - prawdopodobnie problem z danymi logowania');
      
      const authErrors = results.filter(r => r.errorDetails?.isAuthError);
      if (authErrors.length > 0) {
        recommendations.push('🔐 Wykryto błędy autoryzacji - sprawdź:');
        recommendations.push('   - Czy login/hasło są poprawne');
        recommendations.push('   - Czy konto DHL jest aktywne w środowisku sandbox');
        recommendations.push('   - Czy numer konta (servicePointAccountNumber) jest prawidłowy');
        recommendations.push('   - Skontaktuj się z DHL w celu weryfikacji danych');
      }
    }
    
    const workingVariants = results.filter(r => r.success);
    if (workingVariants.length > 0) {
      recommendations.push(`✅ Znaleziono ${workingVariants.length} działającą konfigurację:`);
      workingVariants.forEach(variant => {
        recommendations.push(`   - ${variant.name} (${variant.wsdl})`);
      });
    }
    
    return recommendations;
  }

  // GŁÓWNA METODA DO DIAGNOZOWANIA PROBLEMU
  async diagnoseDHLConnection() {
    console.log('🔍 ROZPOCZYNAM PEŁNĄ DIAGNOZĘ POŁĄCZENIA Z DHL...\n');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      environment: {
        testMode: this.isTestMode,
        hasLogin: !!this.login,
        hasPassword: !!this.password,
        hasPasswordApi: !!this.passwordApi,
        hasAccountNumber: !!this.accountNumber,
        loginValue: this.login,
        accountNumberValue: this.accountNumber
      },
      tests: {}
    };
    
    // Test 1: Sprawdź dostępność WSDL
    console.log('📡 Test 1: Sprawdzanie dostępności WSDL...');
    diagnosis.tests.wsdlAvailability = await this.testMultipleURLs();
    
    // Test 2: Sprawdź różne kombinacje danych logowania
    console.log('\n🔐 Test 2: Sprawdzanie kombinacji danych logowania...');
    diagnosis.tests.credentialCombinations = await this.testCredentialCombinations();
    
    // Test 3: Sprawdź format danych konta
    console.log('\n📋 Test 3: Walidacja formatu danych...');
    diagnosis.tests.dataValidation = this.validateAccountData();
    
    console.log('\n📊 PODSUMOWANIE DIAGNOZY:');
    console.log('==========================');
    
    if (diagnosis.tests.credentialCombinations.workingVariants.length > 0) {
      console.log('✅ ZNALEZIONO DZIAŁAJĄCĄ KONFIGURACJĘ!');
      diagnosis.tests.credentialCombinations.workingVariants.forEach(variant => {
        console.log(`   🎯 ${variant.name}`);
      });
    } else {
      console.log('❌ BRAK DZIAŁAJĄCEJ KONFIGURACJI');
      console.log('\n🚨 ZALECANE DZIAŁANIA:');
      diagnosis.tests.credentialCombinations.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    return diagnosis;
  }

  // Walidacja formatu danych konta
  validateAccountData() {
    const validation = {
      login: {
        present: !!this.login,
        format: 'unknown',
        value: this.login
      },
      password: {
        present: !!this.password,
        length: this.password ? this.password.length : 0
      },
      accountNumber: {
        present: !!this.accountNumber,
        format: 'unknown',
        value: this.accountNumber
      },
      issues: []
    };
    
    // Sprawdź format loginu
    if (this.login) {
      if (this.login.includes('@')) {
        validation.login.format = 'email';
      } else if (this.login.includes('_')) {
        validation.login.format = 'username_with_underscore';
      } else {
        validation.login.format = 'simple_username';
      }
    } else {
      validation.issues.push('Brak loginu (DHL_LOGIN)');
    }
    
    // Sprawdź hasło
    if (!this.password) {
      validation.issues.push('Brak hasła (DHL_PASSWORD_DHL24)');
    } else if (this.password.length < 8) {
      validation.issues.push('Hasło może być za krótkie (< 8 znaków)');
    }
    
    // Sprawdź numer konta
    if (!this.accountNumber) {
      validation.issues.push('Brak numeru konta (DHL_ACCOUNT_NUMBER)');
    } else if (!/^\d+$/.test(this.accountNumber)) {
      validation.issues.push('Numer konta powinien zawierać tylko cyfry');
    }
    
    return validation;
  }

  // Pozostałe metody bez zmian...
  async createShipment(shipmentData) {
    // W trybie testowym zwróć sukces bez prawdziwego API
    if (this.isTestMode && (!this.accountNumber || this.accountNumber === 'TEST')) {
      console.log('TEST MODE: Simulating successful DHL shipment creation');
      const mockShipmentNumber = `TEST_${Date.now()}`;
      
      return {
        success: true,
        shipmentNumber: mockShipmentNumber,
        trackingNumber: mockShipmentNumber,
        labelUrl: null,
        labelContent: null,
        dispatchNumber: `DISPATCH_${Date.now()}`,
        cost: '25.50',
        data: {
          mode: 'TEST',
          created: new Date().toISOString()
        }
      };
    }

    // Tutaj reszta logiki createShipment...
    return {
      success: false,
      error: 'Metoda createShipment wymaga aktualizacji po diagnozie'
    };
  }

  // Pozostałe metody pomocnicze (bez zmian)
  async testMultipleURLs() {
    const urlsToTest = Object.values(this.possibleUrls);
    const results = [];
    
    for (const testUrl of urlsToTest) {
      console.log(`\n=== TESTING URL: ${testUrl} ===`);
      
      try {
        if (!soap) {
          results.push({
            url: testUrl,
            success: false,
            error: 'SOAP library not available'
          });
          continue;
        }

        const client = await soap.createClientAsync(testUrl, {
          timeout: 15000,
          disableCache: true
        });
        
        console.log(`✅ SUCCESS: ${testUrl}`);
        console.log('Available methods:', Object.keys(client).filter(key => key.includes('create')));
        
        results.push({
          url: testUrl,
          success: true,
          methods: Object.keys(client).filter(key => key.includes('Async')).slice(0, 5),
          wsdlUri: client.wsdl?.uri
        });
        
      } catch (error) {
        console.log(`❌ FAILED: ${testUrl} - ${error.message}`);
        results.push({
          url: testUrl,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      results: results,
      recommended: results.find(r => r.success)?.url || 'None working'
    };
  }
}

export default new DHLApiService();
