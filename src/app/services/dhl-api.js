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
    // SPRAWDŹ różne warianty URL DHL
    const envUrl = process.env.DHL_API_URL;
    console.log('Environment DHL_API_URL:', envUrl);
    
    // Lista URL do przetestowania w kolejności
    const urlsToTry = [
      'https://sandbox.dhl24.com.pl/webapi2?wsdl', // Pierwotny WebAPI
      'https://sandbox.dhl24.com.pl/servicepoint?wsdl', // ServicePoint z ?wsdl
      'https://sandbox.dhl24.com.pl/servicepoint/provider/service.html?ws=1', // ServicePoint pełny
      envUrl // Z environment variable
    ].filter(Boolean);
    
    // Użyj pierwszego dostępnego (lub z environment)
    this.wsdlUrl = envUrl || urlsToTry[0];
    
    // USUŃ PODWÓJNE ?wsdl jeśli występuje
    if (this.wsdlUrl.includes('?wsdl') && this.wsdlUrl.includes('?ws=1')) {
      this.wsdlUrl = this.wsdlUrl.replace('?wsdl', '');
    }
    
    console.log('Final WSDL URL will be:', this.wsdlUrl);
    
    // Mapowanie do Twoich nazw zmiennych
    this.username = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.passwordApi = process.env.DHL_PASSWORD_API;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.sapClient = process.env.DHL_SAP_CLIENT;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    // Mapowanie do Twoich nazw zmiennych
    this.username = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.passwordApi = process.env.DHL_PASSWORD_API;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.sapClient = process.env.DHL_SAP_CLIENT;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL API Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      username: this.username ? 'SET' : 'NOT SET',
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
      
      // Sprawdź dane konfiguracyjne
      if (!this.username || !this.password || !this.accountNumber) {
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

      // Przygotuj dane zgodnie z SOAP API DHL (POPRAWIONA STRUKTURA)
      const soapParams = this.prepareDHLSOAPData(shipmentData, notes);
      
      console.log('Prepared SOAP data:', JSON.stringify(soapParams, null, 2));
      
      // Wywołaj SOAP API
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

  // DOKŁADNA struktura zgodnie z przykładem DHL
  prepareDHLSOAPData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    // STRUKTURA zgodna z przykładem z dokumentacji DHL
    return {
      shipment: {
        authData: {
          username: this.username,
          password: this.password
        },
        shipmentData: {
          ship: {
            shipper: {
              address: {
                name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
                postcode: shipperAddress.postcode || '15-169',
                city: shipperAddress.city || 'Białystok',
                street: shipperAddress.street || 'Wysockiego',
                houseNumber: shipperAddress.houseNumber || '69B',
                ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber })
              },
              contact: {
                personName: notes.nadawca?.kontakt || 'Magazyn Białystok',
                phoneNumber: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
                emailAddress: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
              }
            },
            receiver: {
              address: {
                addressType: '', // Puste jak w przykładzie
                name: shipmentData.recipient_name,
                postcode: receiverAddress.postcode || '00-001',
                city: receiverAddress.city || 'Warszawa',
                street: receiverAddress.street || 'Testowa',
                houseNumber: receiverAddress.houseNumber || '123',
                ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber })
              },
              contact: {
                personName: notes.odbiorca?.kontakt || shipmentData.recipient_name,
                phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
                emailAddress: notes.odbiorca?.email || ''
              }
            },
            servicePointAccountNumber: this.accountNumber // Dodane zgodnie z przykładem
          },
          shipmentInfo: {
            dropOffType: 'REGULAR_PICKUP',
            serviceType: 'LM', // Jak w przykładzie
            billing: {
              shippingPaymentType: 'SHIPPER',
              billingAccountNumber: this.accountNumber,
              paymentType: 'BANK_TRANSFER',
              costsCenter: 'Transport System'
            },
            shipmentDate: new Date().toISOString().split('T')[0],
            shipmentStartHour: '10:00', // Jak w przykładzie
            shipmentEndHour: '15:00',   // Jak w przykładzie
            labelType: 'BLP'
          },
          pieceList: [
            {
              item: {
                type: 'PACKAGE',
                width: piece.width,
                height: piece.height,
                lenght: piece.length, // DHL używa "lenght"
                weight: piece.weight,
                quantity: piece.quantity,
                nonStandard: false
              }
            }
          ],
          content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
          comment: notes.przesylka?.uwagi || '',
          reference: `ORDER_${shipmentData.id}`
        }
      }
    };
  }

  // Wywołanie SOAP API DHL (POPRAWIONE)
  async callDHLSOAPAPI(soapParams) {
    try {
      // Sprawdź czy biblioteka soap jest dostępna
      if (!soap) {
        throw new Error('Biblioteka SOAP nie jest dostępna. Uruchom: npm install soap');
      }

      console.log('Creating SOAP client for URL:', this.wsdlUrl);
      
      // Utwórz klienta SOAP z timeoutem
      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true,
        // Dodatkowe opcje dla lepszej stabilności
        connection_timeout: 30000,
        forceSoap12Headers: false
      });
      
      console.log('SOAP client created successfully');
      console.log('Available methods:', Object.keys(client));
      
      console.log('=== WYSYŁANE DANE DO DHL ===');
      console.log('SOAP Params:', JSON.stringify(soapParams, null, 2));
      console.log('=== KONIEC WYSYŁANYCH DANYCH ===');

      // Wywołaj metodę createShipment zgodnie z dokumentacją
      const [result] = await client.createShipmentAsync(soapParams);
      
      console.log('=== PEŁNA ODPOWIEDŹ Z DHL ===');
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('Type of result:', typeof result);
      console.log('Keys in result:', Object.keys(result || {}));
      
      if (result && result.createShipmentResult) {
        console.log('createShipmentResult:', JSON.stringify(result.createShipmentResult, null, 2));
      }
      console.log('=== KONIEC ODPOWIEDZI ===');
      
      // Sprawdź strukturę odpowiedzi
      if (result && result.createShipmentResult && result.createShipmentResult.shipmentNumber) {
        const shipmentResult = result.createShipmentResult;
        
        return {
          success: true,
          shipmentNumber: shipmentResult.shipmentNumber,
          trackingNumber: shipmentResult.shipmentNumber,
          labelUrl: shipmentResult.label?.labelContent ? 
            `data:application/pdf;base64,${shipmentResult.label.labelContent}` : null,
          labelContent: shipmentResult.label?.labelContent,
          dispatchNumber: shipmentResult.dispatchNumber,
          cost: 'Nieznany',
          data: shipmentResult
        };
      }
      
      // Jeśli createShipmentResult jest null, może być błąd w żądaniu
      if (result && result.createShipmentResult === null) {
        // Sprawdź czy są jakieś błędy w odpowiedzi
        if (result.errors || result.error) {
          throw new Error(`DHL API Error: ${result.errors || result.error}`);
        }
        throw new Error('DHL API zwróciło pustą odpowiedź - prawdopodobnie błędne dane wejściowe');
      }
      
      // Sprawdź czy w wyniku jest bezpośrednio shipmentNumber (inna struktura odpowiedzi)
      if (result && result.shipmentNumber) {
        return {
          success: true,
          shipmentNumber: result.shipmentNumber,
          trackingNumber: result.shipmentNumber,
          labelUrl: result.label?.labelContent ? 
            `data:application/pdf;base64,${result.label.labelContent}` : null,
          labelContent: result.label?.labelContent,
          dispatchNumber: result.dispatchNumber,
          cost: 'Nieznany',
          data: result
        };
      }
      
      // Jeśli nic z powyższego nie zadziałało
      throw new Error(`DHL API zwróciło nieoczekiwaną strukturę: ${JSON.stringify(result)}`);
      
    } catch (error) {
      console.error('DHL SOAP API Error:', error);
      
      // Szczegółowe logowanie dla debugowania
      if (error.body) {
        console.error('SOAP Error Body:', error.body);
      }
      if (error.response) {
        console.error('SOAP Error Response:', error.response);
      }
      
      // Jeśli to błąd połączenia lub timeout, zwróć specjalny błąd
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Brak połączenia z serwisem DHL. Sprawdź połączenie internetowe i spróbuj ponownie.'
        };
      }
      
      // Jeśli to błąd uwierzytelnienia
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

      if (!this.username || !this.password) {
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
        shipment: {
          authData: {
            username: this.username,
            password: this.password
          },
          shipment: shipmentNumber
        }
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
    
    // Parsuj ulicę i numer domu
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
      length: parseInt(wymiary.dlugosc) || 10, // Dla lepszej czytelności
      weight: parseFloat(przesylka?.waga) || 1,
      quantity: parseInt(przesylka?.ilosc) || 1,
      nonStandard: false
    };
  }

  determineServiceType(typZlecenia) {
    // Kody usług DHL zgodnie z dokumentacją
    switch (typZlecenia) {
      case 'nadawca_bialystok':
      case 'nadawca_zielonka':
      case 'odbiorca_bialystok':
      case 'odbiorca_zielonka':
      case 'trzecia_strona':
      default:
        return '09'; // Domestic 09:00 - standardowa usługa krajowa
    }
  }

  extractContentFromDescription(description) {
    if (!description) return 'Przesyłka';
    return description.split('|')[0]?.trim() || 'Przesyłka';
  }

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    // Usuń wszystko oprócz cyfr i znaku +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Jeśli zaczyna się od 0, zamień na +48
    if (cleaned.startsWith('0')) {
      cleaned = '+48' + cleaned.substring(1);
    }
    // Jeśli nie ma prefiksu, dodaj +48
    if (!cleaned.startsWith('+')) {
      cleaned = '+48' + cleaned;
    }
    return cleaned.substring(0, 15);
  }

  // Dodana metoda do śledzenia przesyłek (opcjonalna)
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

      // Dla produkcji - trzeba będzie dodać odpowiednią metodę SOAP lub REST API do śledzenia
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

  // METODA TESTOWA Z MINIMALNĄ STRUKTURĄ
  async testMinimalShipment() {
    try {
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      // MINIMALNA STRUKTURA zgodnie z dokumentacją DHL
      const minimalParams = {
        authData: {
          username: this.username,
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
          }
        }
      };

      console.log('=== MINIMAL SOAP PARAMS ===');
      console.log(JSON.stringify(minimalParams, null, 2));

      const [result] = await client.createShipmentAsync(minimalParams);
      
      console.log('=== MINIMAL RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      return {
        success: result?.shipmentNumber ? true : false,
        result: result,
        shipmentNumber: result?.shipmentNumber
      };

    } catch (error) {
      console.error('Minimal test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // METODA DO TESTOWANIA RÓŻNYCH URL DHL
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

  // METODA TESTOWA - wysyła przykładowe zapytanie do DHL
  async testDHLConnection() {
    console.log('=== TESTOWANIE POŁĄCZENIA Z DHL ===');
    
    // Przykładowe dane testowe
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
    
    // Wywołaj metodę createShipment z testowymi danymi
    const result = await this.createShipment(testShipmentData);
    
    console.log('=== WYNIK TESTU DHL ===');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Full result:', result);
    console.log('=== KONIEC TESTU ===');
    
    return result;
  }

  // METODA DO TESTOWANIA STRUKTURY SOAP
  async testSOAPStructure() {
    console.log('=== TEST STRUKTURY SOAP ===');
    
    try {
      // Sprawdź czy biblioteka soap jest dostępna
      if (!soap) {
        return {
          success: false,
          error: 'Biblioteka SOAP nie jest dostępna. Uruchom: npm install soap'
        };
      }

      console.log('Próba połączenia z WSDL:', this.wsdlUrl);
      console.log('Dane uwierzytelniające:', {
        username: this.username ? 'SET' : 'NOT SET',
        password: this.password ? 'SET' : 'NOT SET',
        accountNumber: this.accountNumber ? 'SET' : 'NOT SET'
      });

      // Sprawdź czy można utworzyć klienta SOAP
      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 15000,
        disableCache: true,
        // Dodatkowe opcje dla lepszej kompatybilności
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
