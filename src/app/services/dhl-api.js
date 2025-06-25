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
    // Użyj URL który działa z testów
    this.wsdlUrl = process.env.DHL_API_URL || 'https://sandbox.dhl24.com.pl/webapi2?wsdl';
    
    console.log('Final WSDL URL:', this.wsdlUrl);
    
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.passwordApi = process.env.DHL_PASSWORD_API;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.sapClient = process.env.DHL_SAP_CLIENT;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL API Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      login: this.login ? 'SET' : 'NOT SET',
      password: this.password ? 'SET' : 'NOT SET',
      passwordApi: this.passwordApi ? 'SET' : 'NOT SET',
      accountNumber: this.accountNumber ? 'SET' : 'NOT SET',
      sapClient: this.sapClient ? 'SET' : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // Główna metoda tworzenia przesyłki
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL shipment for order:', shipmentData.id);
      
      if (!this.login || !this.password || !this.accountNumber) {
        return {
          success: false,
          error: 'Brak kompletnych danych uwierzytelniających DHL (DHL_LOGIN/DHL_PASSWORD_DHL24/DHL_ACCOUNT_NUMBER)'
        };
      }

      const notes = typeof shipmentData.notes === 'string' 
        ? JSON.parse(shipmentData.notes) 
        : shipmentData.notes;

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

      // POPRAWIONA struktura danych zgodnie z DHL WebAPI
      const soapParams = this.prepareDHLWebAPIData(shipmentData, notes);
      
      console.log('Prepared SOAP data:', JSON.stringify(soapParams, null, 2));
      
      const result = await this.callDHLSOAPAPI(soapParams);
      
      return result;
    } catch (error) {
      console.error('DHL shipment creation error:', error);
      return {
        success: false,
        error: `DHL Error: ${error.message}`
      };
    }
  }

  // POPRAWIONA struktura zgodnie z DHL WebAPI dokumentacją
  prepareDHLWebAPIData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    // STRUKTURA zgodna z DHL WebAPI (nie ServicePoint)
    return {
      authData: {
        login: this.login,
        password: this.password
      },
      shipment: {
        // Dane nadawcy
        shipper: {
          name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
          street: shipperAddress.street || 'Wysockiego',
          houseNumber: shipperAddress.houseNumber || '69B',
          ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber }),
          city: shipperAddress.city || 'Białystok',
          postcode: shipperAddress.postcode || '15-169',
          country: 'PL',
          contact: {
            person: notes.nadawca?.kontakt || 'Magazyn',
            phone: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
            email: notes.nadawca?.email || 'magazyn@grupaeltron.pl'
          }
        },
        
        // Dane odbiorcy
        consignee: {
          name: shipmentData.recipient_name,
          street: receiverAddress.street || 'Testowa',
          houseNumber: receiverAddress.houseNumber || '1',
          ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber }),
          city: receiverAddress.city || 'Warszawa',
          postcode: receiverAddress.postcode || '00-001',
          country: 'PL',
          contact: {
            person: notes.odbiorca?.kontakt || shipmentData.recipient_name,
            phone: this.cleanPhoneNumber(shipmentData.recipient_phone),
            email: notes.odbiorca?.email || ''
          }
        },

        // Informacje o przesyłce
        shipmentInfo: {
          account: this.accountNumber,
          serviceType: 'AH', // Domestic Standard
          shipmentDate: new Date().toISOString().split('T')[0],
          shipmentStartHour: '08:00',
          shipmentEndHour: '18:00',
          // Dla sandbox można pominąć te pola
          ...(this.isTestMode && {
            billing: {
              shippingPaymentType: 'SHIPPER',
              billingAccountNumber: this.accountNumber,
              costsCenter: 'TEST'
            }
          })
        },

        // Lista paczek - UPROSZCZONA
        pieceList: {
          piece: {
            type: 'PACKAGE',
            weight: piece.weight,
            width: piece.width,
            height: piece.height,
            length: piece.length
          }
        },

        content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
        reference: `ORDER_${shipmentData.id}`,
        comment: notes.przesylka?.uwagi || ''
      }
    };
  }

  // Wywołanie SOAP API DHL (UPROSZCZONE)
  async callDHLSOAPAPI(soapParams) {
    try {
      if (!soap) {
        throw new Error('Biblioteka SOAP nie jest dostępna. Uruchom: npm install soap');
      }

      console.log('Creating SOAP client for URL:', this.wsdlUrl);
      
      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });
      
      console.log('SOAP client created successfully');
      console.log('Available methods for createShipment:', 
        Object.keys(client).filter(key => key.toLowerCase().includes('createshipment'))
      );
      
      console.log('=== WYSYŁANE DANE DO DHL ===');
      console.log('SOAP Params:', JSON.stringify(soapParams, null, 2));
      console.log('=== KONIEC WYSYŁANYCH DANYCH ===');

      // Wywołaj createShipment (WebAPI)
      const [result] = await client.createShipmentAsync(soapParams);
      
      console.log('=== PEŁNA ODPOWIEDŹ Z DHL ===');
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('=== KONIEC ODPOWIEDZI ===');
      
      // Sprawdź różne możliwe struktury odpowiedzi
      let shipmentResult = null;
      
      if (result && result.createShipmentResult) {
        shipmentResult = result.createShipmentResult;
      } else if (result && result.shipmentNumber) {
        shipmentResult = result;
      } else if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        // Sprawdź czy w którymś z kluczy jest shipmentNumber
        for (const key in result) {
          if (result[key] && result[key].shipmentNumber) {
            shipmentResult = result[key];
            break;
          }
        }
      }
      
      console.log('Processed shipmentResult:', shipmentResult);
      
      if (shipmentResult && shipmentResult.shipmentNumber) {
        return {
          success: true,
          shipmentNumber: shipmentResult.shipmentNumber,
          trackingNumber: shipmentResult.shipmentNumber,
          labelUrl: shipmentResult.label?.labelContent ? 
            `data:application/pdf;base64,${shipmentResult.label.labelContent}` : null,
          labelContent: shipmentResult.label?.labelContent,
          dispatchNumber: shipmentResult.dispatchNumber,
          cost: shipmentResult.cost || 'Nieznany',
          data: shipmentResult
        };
      }
      
      // Sprawdź czy jest informacja o błędzie
      if (result && (result.error || result.errors)) {
        throw new Error(`DHL API Error: ${result.error || result.errors}`);
      }
      
      // Jeśli createShipmentResult jest null, może być problem z danymi
      if (result && result.createShipmentResult === null) {
        console.log('=== DEBUGGING: createShipmentResult is null ===');
        console.log('Full result object:', result);
        console.log('Result keys:', Object.keys(result));
        
        // Sprawdź czy są inne pola w odpowiedzi
        const otherFields = Object.keys(result).filter(key => key !== 'createShipmentResult');
        if (otherFields.length > 0) {
          console.log('Other fields in result:', otherFields);
          otherFields.forEach(field => {
            console.log(`${field}:`, result[field]);
          });
        }
        
        throw new Error('DHL API zwróciło pustą odpowiedź (createShipmentResult: null). Sprawdź dane wejściowe: numery kont, adresy, format danych.');
      }
      
      throw new Error(`DHL API zwróciło nieoczekiwaną strukturę: ${JSON.stringify(result)}`);
      
    } catch (error) {
      console.error('DHL SOAP API Error:', error);
      
      if (error.body) {
        console.error('SOAP Error Body:', error.body);
      }
      if (error.response) {
        console.error('SOAP Error Response:', error.response);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Brak połączenia z serwisem DHL. Sprawdź połączenie internetowe i spróbuj ponownie.'
        };
      }
      
      if (error.message && (error.message.includes('auth') || error.message.includes('login'))) {
        return {
          success: false,
          error: 'Błąd uwierzytelnienia DHL. Sprawdź dane logowania (DHL_LOGIN/DHL_PASSWORD_DHL24/DHL_ACCOUNT_NUMBER).'
        };
      }
      
      return {
        success: false,
        error: `DHL SOAP Error: ${error.message}`
      };
    }
  }

  // Anulowanie przesyłki
  async cancelShipment(shipmentNumber) {
    try {
      console.log('Cancelling DHL shipment:', shipmentNumber);
      
      if (this.isTestMode && (!this.accountNumber || this.accountNumber === 'TEST')) {
        console.log('TEST MODE: Simulating successful cancellation');
        return { success: true };
      }

      if (!this.login || !this.password) {
        return {
          success: false,
          error: 'Brak danych uwierzytelniających do anulowania przesyłki'
        };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });
      
      const params = {
        authData: {
          login: this.login,
          password: this.password
        },
        shipment: shipmentNumber
      };

      const [result] = await client.deleteShipmentAsync(params);
      
      if (result && result.deleteShipmentResult && result.deleteShipmentResult.status === 'OK') {
        return { success: true };
      } else {
        throw new Error(result?.deleteShipmentResult?.error || 'Anulowanie nie powiodło się');
      }
    } catch (error) {
      console.error('DHL cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ====== FUNKCJE POMOCNICZE (BEZ ZMIAN) ======

  parseAddress(addressString) {
    if (!addressString) return {};
    
    const parts = addressString.split(',').map(p => p.trim());
    const postcodeMatch = addressString.match(/(\d{2}-\d{3})/);
    
    const streetPart = parts[0] || '';
    const cityPart = parts[parts.length - 1] || '';
    
    const streetMatch = streetPart.match(/^(.+?)[\s]+([0-9]+[A-Za-z]*)(\/([0-9]+))?$/);
    const street = streetMatch ? streetMatch[1] : streetPart;
    const houseNumber = streetMatch ? streetMatch[2] : '';
    const apartmentNumber = streetMatch ? streetMatch[4] : '';
    
    const city = cityPart.replace(/\d{2}-\d{3}\s*/, '').trim();
    
    return {
      street: street,
      houseNumber: houseNumber,
      apartmentNumber: apartmentNumber,
      postcode: postcodeMatch ? postcodeMatch[1] : '',
      city: city
    };
  }

  extractPieceInfo(packageDescription, przesylka) {
    const wymiary = przesylka?.wymiary || {};
    
    return {
      type: 'PACKAGE',
      width: parseInt(wymiary.szerokosc) || 10,
      height: parseInt(wymiary.wysokosc) || 10,
      length: parseInt(wymiary.dlugosc) || 10,
      weight: parseFloat(przesylka?.waga) || 1,
      quantity: parseInt(przesylka?.ilosc) || 1,
      nonStandard: false
    };
  }

  extractContentFromDescription(description) {
    if (!description) return 'Przesyłka';
    return description.split('|')[0]?.trim() || 'Przesyłka';
  }

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+48' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+48' + cleaned;
    }
    return cleaned.substring(0, 15);
  }

  // METODA TESTOWA - prosta struktura dla debugowania
  async testSimpleShipment() {
    try {
      console.log('=== TEST PROSTEJ PRZESYŁKI ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      // NAJPROSTSZA możliwa struktura
      const simpleParams = {
        authData: {
          login: this.login,
          password: this.password
        },
        shipment: {
          shipper: {
            name: "Test Shipper",
            street: "Testowa",
            houseNumber: "1",
            city: "Warszawa",
            postcode: "00-001",
            country: "PL"
          },
          consignee: {
            name: "Test Receiver",
            street: "Odbiorcza", 
            houseNumber: "2",
            city: "Kraków",
            postcode: "30-001",
            country: "PL"
          },
          shipmentInfo: {
            account: this.accountNumber,
            serviceType: "AH"
          },
          pieceList: {
            piece: {
              type: "PACKAGE",
              weight: 1,
              width: 10,
              height: 10,
              length: 10
            }
          },
          content: "Test content"
        }
      };

      console.log('=== SIMPLE SOAP PARAMS ===');
      console.log(JSON.stringify(simpleParams, null, 2));

      const [result] = await client.createShipmentAsync(simpleParams);
      
      console.log('=== SIMPLE RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      return {
        success: result?.createShipmentResult?.shipmentNumber ? true : false,
        result: result,
        shipmentNumber: result?.createShipmentResult?.shipmentNumber,
        error: result?.createShipmentResult === null ? 'createShipmentResult is null' : null
      };

    } catch (error) {
      console.error('Simple test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Dodaj metodę śledzenia
  async getShipmentStatus(trackingNumber) {
    try {
      console.log('Tracking DHL shipment:', trackingNumber);
      
      if (this.isTestMode) {
        console.log('TEST MODE: Simulating tracking data');
        return {
          success: true,
          status: 'IN_TRANSIT',
          events: [
            {
              status: 'PICKED_UP',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              location: 'Białystok'
            },
            {
              status: 'IN_TRANSIT',
              timestamp: new Date().toISOString(),
              location: 'Warszawa'
            }
          ],
          estimatedDelivery: new Date(Date.now() + 86400000).toISOString()
        };
      }

      return {
        success: false,
        error: 'Śledzenie przesyłek nie jest jeszcze zaimplementowane'
      };
    } catch (error) {
      console.error('DHL tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // METODY TESTOWE (zachowaj istniejące)
  async testMultipleURLs() {
    const urlsToTest = [
      'https://sandbox.dhl24.com.pl/webapi2?wsdl',
      'https://sandbox.dhl24.com.pl/servicepoint?wsdl', 
      'https://dhl24.com.pl/servicepoint/provider/service.html?ws=1'
    ];
    
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

  async testDHLConnection() {
    console.log('=== TESTOWANIE POŁĄCZENIA Z DHL ===');
    
    // Testuj prostą strukturę
    const simpleTest = await this.testSimpleShipment();
    console.log('Simple test result:', simpleTest);
    
    if (simpleTest.success) {
      return simpleTest;
    }
    
    // Jeśli prosta struktura nie działa, testuj z pełnymi danymi
    const testShipmentData = {
      id: 'TEST_001',
      recipient_name: 'Jan Testowy',
      recipient_address: 'Testowa 123, 00-001 Warszawa',
      recipient_phone: '+48600123456',
      package_description: 'Testowa przesyłka | Waga: 2kg | Wymiary: 30x20x10cm | Ilość: 1',
      magazine_source: 'magazyn_bialystok',
      notes: JSON.stringify({
        typZlecenia: 'nadawca_bialystok',
        nadawca: {
          typ: 'firma',
          nazwa: 'Grupa Eltron Sp. z o.o.',
          adres: 'Wysockiego 69B, 15-169 Białystok',
          kontakt: 'Magazyn Białystok',
          telefon: '857152705',
          email: 'bialystok@grupaeltron.pl'
        },
        odbiorca: {
          typ: 'osoba',
          email: 'jan.testowy@example.com',
          kontakt: 'Jan Testowy'
        },
        przesylka: {
          mpk: 'TEST_MPK_001',
          uwagi: 'To jest testowa przesyłka - proszę nie dostarczać!',
          waga: '2',
          wymiary: {
            dlugosc: '30',
            szerokosc: '20',
            wysokosc: '10'
          },
          ilosc: '1'
        }
      })
    };

    console.log('Testowe dane przesyłki:', testShipmentData);
    
    const result = await this.createShipment(testShipmentData);
    
    console.log('=== WYNIK TESTU DHL ===');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Full result:', result);
    console.log('=== KONIEC TESTU ===');
    
    return result;
  }

  async testSOAPStructure() {
    console.log('=== TEST STRUKTURY SOAP ===');
    
    try {
      if (!soap) {
        return {
          success: false,
          error: 'Biblioteka SOAP nie jest dostępna. Uruchom: npm install soap'
        };
      }

      console.log('Próba połączenia z WSDL:', this.wsdlUrl);
      console.log('Dane uwierzytelniające:', {
        login: this.login ? 'SET' : 'NOT SET',
        password: this.password ? 'SET' : 'NOT SET',
        accountNumber: this.accountNumber ? 'SET' : 'NOT SET'
      });

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 15000,
        disableCache: true,
        ignoredNamespaces: {
          namespaces: [],
          override: false
        }
      });
      
      console.log('✅ SOAP Client utworzony pomyślnie!');
      console.log('Dostępne metody:', Object.keys(client));
      console.log('WSDL załadowany z:', client.wsdl.uri);
      
      return {
        success: true,
        methods: Object.keys(client),
        wsdlUri: client.wsdl.uri
      };
      
    } catch (error) {
      console.error('❌ Błąd tworzenia SOAP Client:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }
}

export default new DHLApiService();
