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
    // UŻYWAJ ServicePoint API zgodnie z dokumentacją DHL
    this.wsdlUrl = 'https://sandbox.dhl24.com.pl/servicepoint?wsdl'; // ← WYMUŚ ServicePoint API
    
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

      // POPRAWIONA struktura danych zgodnie z DHL ServicePoint API
      const soapParams = this.prepareDHLServicePointData(shipmentData, notes);
      
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

  // POPRAWIONA struktura zgodnie z DHL ServicePoint API i dokumentacją
  prepareDHLServicePointData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    // STRUKTURA zgodna z CreateShipmentStructure z WSDL
    return {
      shipment: {
        // AuthdataStructure - UŻYJ username zamiast login!
        authData: {
          username: this.login,  // ← POPRAWKA: username zamiast login
          password: this.password
        },
        // ShipmentStructure
        shipmentData: {
          // ShipStructure
          ship: {
            // FullAddressDataStructure dla nadawcy
            shipper: {
              // AddressStructure
              address: {
                name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
                postcode: shipperAddress.postcode || '15-169',
                city: shipperAddress.city || 'Białystok',
                street: shipperAddress.street || 'Wysockiego',
                houseNumber: shipperAddress.houseNumber || '69B',
                ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber })
              },
              // ContactStructure
              contact: {
                personName: notes.nadawca?.kontakt || 'Magazyn Białystok',
                phoneNumber: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
                emailAddress: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
              },
              // PreavisoStructure
              preaviso: {
                personName: notes.nadawca?.kontakt || 'Magazyn Białystok',
                phoneNumber: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
                emailAddress: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
              }
            },
            // ReceiverDataStructure dla odbiorcy
            receiver: {
              // ReceiverAddressStructure
              address: {
                addressType: 'B', // B = adres prywatny, zgodnie z dokumentacją
                name: shipmentData.recipient_name,
                postcode: receiverAddress.postcode || '00-001',
                city: receiverAddress.city || 'Warszawa',
                street: receiverAddress.street || 'Testowa',
                houseNumber: receiverAddress.houseNumber || '1',
                ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber })
              },
              // ContactStructure
              contact: {
                personName: notes.odbiorca?.kontakt || shipmentData.recipient_name,
                phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
                emailAddress: notes.odbiorca?.email || ''
              },
              // PreavisoStructure
              preaviso: {
                personName: notes.odbiorca?.kontakt || shipmentData.recipient_name,
                phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
                emailAddress: notes.odbiorca?.email || ''
              }
            },
            // servicePointAccountNumber
            servicePointAccountNumber: this.accountNumber
          },
          // ShipmentInfoStructure
          shipmentInfo: {
            dropOffType: 'REGULAR_PICKUP',
            serviceType: 'LM', // Last Mile zgodnie z przykładem
            // BillingStructure
            billing: {
              shippingPaymentType: 'SHIPPER',
              billingAccountNumber: this.accountNumber,
              paymentType: 'BANK_TRANSFER',
              costsCenter: 'Transport System'
            },
            shipmentDate: new Date().toISOString().split('T')[0],
            shipmentStartHour: '10:00',
            shipmentEndHour: '15:00',
            labelType: 'BLP',
            wayBill: `WB_${Date.now()}` // Dodaj wayBill jeśli potrzebny
          },
          // ArrayOfPiecestructure - STRUKTURA ZGODNA Z SERVICEPOINT WSDL
          pieceList: {
            item: [
              {
                // PieceStructure
                type: 'PACKAGE',
                width: piece.width,
                height: piece.height,
                lenght: piece.length, // ← UWAGA: DHL używa "lenght" (błąd w ich API)
                weight: piece.weight,
                quantity: piece.quantity,
                nonStandard: false
              }
            ]
          },
          content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
          comment: notes.przesylka?.uwagi || '',
          reference: `ORDER_${shipmentData.id}`
        }
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

      // Wywołaj createShipment zgodnie z ServicePoint API
      const [result] = await client.createShipmentAsync(soapParams);
      
      console.log('=== PEŁNA ODPOWIEDŹ Z DHL ===');
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('=== KONIEC ODPOWIEDZI ===');
      
      // Sprawdź strukturę odpowiedzi zgodnie z CreateShipmentResponseStructure
      if (result && result.createShipmentResult) {
        const shipmentResult = result.createShipmentResult;
        
        if (shipmentResult.shipmentNumber) {
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
      }
      
      // Sprawdź czy jest informacja o błędzie
      if (result && (result.error || result.errors)) {
        throw new Error(`DHL API Error: ${result.error || result.errors}`);
      }
      
      // Jeśli createShipmentResult jest null lub brak shipmentNumber
      if (result && result.createShipmentResult === null) {
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
      
      if (error.message && (error.message.includes('autoryzacyjne') || error.message.includes('auth'))) {
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
      
      if (this.isTestMode) {
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
      
      // DeleteShipmentStructure zgodnie z WSDL
      const params = {
        shipment: {
          authData: {
            username: this.login,  // ← username zamiast login
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

  // METODA TESTOWA Z POPRAWIONĄ STRUKTURĄ
  async testSimpleShipment() {
    try {
      console.log('=== TEST PROSTEJ PRZESYŁKI (ServicePoint API) ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      // MINIMALNA STRUKTURA zgodnie z CreateShipmentStructure
      const simpleParams = {
        shipment: {
          authData: {
            username: this.login,  // ← username zamiast login
            password: this.password
          },
          shipmentData: {
            ship: {
              shipper: {
                address: {
                  name: "Test Shipper",
                  postcode: "00999",
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
                  postcode: "30001",
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
              item: [
                {
                  type: "PACKAGE",
                  width: 10,
                  height: 10,
                  lenght: 10, // ← DHL używa "lenght" (błąd w ich API)
                  weight: 1,
                  quantity: 1,
                  nonStandard: false
                }
              ]
            },
            content: "Test content",
            comment: "Test comment",
            reference: "TEST_REF"
          }
        }
      };

      console.log('=== SIMPLE SOAP PARAMS (ServicePoint) ===');
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

  // Dodaj metodę testową z różnymi wariantami username
  async testAuthVariants() {
    try {
      console.log('=== TEST RÓŻNYCH WARIANTÓW USERNAME ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const authVariants = [
        { username: this.login, password: this.password, description: 'Current login (GRUPAELTRON_TEST)' },
        { username: 'A.BORTNICZUK@GRUPAELTRON.PL', password: this.password, description: 'Email from DHL documentation' },
        { username: 'test', password: 'WSyj3$aDE', description: 'Example from DHL docs' },
        { username: this.login.toLowerCase(), password: this.password, description: 'Lowercase login' }
      ];

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      const results = [];

      for (const [index, auth] of authVariants.entries()) {
        console.log(`\n--- Testing auth variant ${index + 1}: ${auth.description} ---`);
        
        try {
          const simpleParams = {
            shipment: {
              authData: {
                username: auth.username,
                password: auth.password
              },
              shipmentData: {
                ship: {
                  shipper: {
                    address: {
                      name: "Test Shipper",
                      postcode: "00999",
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
                      postcode: "30001",
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
                  item: [
                    {
                      type: "PACKAGE",
                      width: 10,
                      height: 10,
                      lenght: 10,
                      weight: 1,
                      quantity: 1,
                      nonStandard: false
                    }
                  ]
                },
                content: "Test content",
                comment: "Test comment",
                reference: "TEST_REF"
              }
            }
          };

          const [result] = await client.createShipmentAsync(simpleParams);
          
          console.log(`Result for ${auth.description}:`, result);
          
          results.push({
            variant: index + 1,
            description: auth.description,
            username: auth.username,
            success: result?.createShipmentResult?.shipmentNumber ? true : false,
            result: result,
            shipmentNumber: result?.createShipmentResult?.shipmentNumber,
            error: result?.createShipmentResult === null ? 'createShipmentResult is null' : null
          });

        } catch (error) {
          console.error(`Variant ${index + 1} error:`, error.message);
          results.push({
            variant: index + 1,
            description: auth.description,
            username: auth.username,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log('\n=== PODSUMOWANIE TESTÓW AUTH ===');
      results.forEach(result => {
        console.log(`Variant ${result.variant} (${result.description}): ${result.success ? '✅ SUCCESS' : '❌ FAILED'} - ${result.error || 'OK'}`);
      });
      
      return {
        success: true,
        results: results,
        working: results.filter(r => r.success)
      };
      
    } catch (error) {
      console.error('Auth variants test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async testMultipleURLs() {
    const urlsToTest = [
      'https://sandbox.dhl24.com.pl/servicepoint?wsdl', // ← Teraz ServicePoint jako główny
      'https://sandbox.dhl24.com.pl/webapi2?wsdl',
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
    console.log('=== TESTOWANIE POŁĄCZENIA Z DHL (ServicePoint) ===');
    
    // NAJPIERW testuj różne warianty username
    const authTest = await this.testAuthVariants();
    console.log('Auth variants test result:', authTest);
    
    if (authTest.working && authTest.working.length > 0) {
      return {
        success: true,
        authVariants: authTest.results,
        workingVariants: authTest.working,
        note: 'Found working authentication variant',
        recommendedAuth: authTest.working[0]
      };
    }
    
    // Jeśli żaden wariant auth nie działa, testuj prostą strukturę
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
    console.log('=== TEST STRUKTURY SOAP (ServicePoint) ===');
    
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
