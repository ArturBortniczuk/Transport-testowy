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
    // ZAKTUALIZOWANE WSDL URLs zgodnie z mailem od DHL
    this.possibleUrls = {
      servicepoint: 'https://sandbox.dhl24.com.pl/servicepoint?wsdl',
      webapi2: 'https://sandbox.dhl24.com.pl/webapi2?wsdl',
      production_servicepoint: 'https://dhl24.com.pl/servicepoint?wsdl',
      production_webapi2: 'https://dhl24.com.pl/webapi2?wsdl'
    };
    
    // Domyślnie używaj WebAPI2 (zgodnie z danymi z maila)
    this.wsdlUrl = this.possibleUrls.webapi2;
    
    console.log('DHL API URL:', this.wsdlUrl);
    
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL API Service initialized with REAL credentials:', {
      wsdlUrl: this.wsdlUrl,
      login: this.login ? `SET (${this.login})` : 'NOT SET',
      password: this.password ? `SET (${this.password.substring(0, 3)}...)` : 'NOT SET',
      accountNumber: this.accountNumber ? `SET (${this.accountNumber})` : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // GŁÓWNA METODA TWORZENIA PRZESYŁKI - zaktualizowana do WebAPI2
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL shipment for order:', shipmentData.id);
      
      if (!this.login || !this.password || !this.accountNumber) {
        return {
          success: false,
          error: 'Brak kompletnych danych uwierzytelniających DHL'
        };
      }

      const notes = typeof shipmentData.notes === 'string' 
        ? JSON.parse(shipmentData.notes) 
        : shipmentData.notes;

      // W trybie testowym zwróć sukces bez prawdziwego API
      if (this.isTestMode) {
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

      // UŻYJ WebAPI2 zgodnie z danymi z DHL
      const shipmentParams = this.prepareWebAPI2Data(shipmentData, notes);
      
      console.log('Prepared WebAPI2 data:', JSON.stringify(shipmentParams, null, 2));
      
      const result = await this.callWebAPI2(shipmentParams);
      
      return result;
    } catch (error) {
      console.error('DHL shipment creation error:', error);
      return {
        success: false,
        error: `DHL Error: ${error.message}`
      };
    }
  }

  // NOWA METODA: Przygotuj dane dla WebAPI2
  prepareWebAPI2Data(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    // Struktura zgodna z WebAPI2
    return {
      authData: {
        login: this.login,
        password: this.password
      },
      shipments: {
        item: [
          {
            shipperAddress: {
              name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
              postalCode: shipperAddress.postcode || '15-169',
              city: shipperAddress.city || 'Białystok',
              street: shipperAddress.street || 'Wysockiego',
              houseNumber: shipperAddress.houseNumber || '69B',
              ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber })
            },
            shipperContact: {
              personName: notes.nadawca?.kontakt || 'Magazyn Białystok',
              phoneNumber: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
              emailAddress: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
            },
            receiverAddress: {
              name: shipmentData.recipient_name,
              postalCode: receiverAddress.postcode || '00-001',
              city: receiverAddress.city || 'Warszawa',
              street: receiverAddress.street || 'Testowa',
              houseNumber: receiverAddress.houseNumber || '1',
              ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber })
            },
            receiverContact: {
              personName: notes.odbiorca?.kontakt || shipmentData.recipient_name,
              phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
              emailAddress: notes.odbiorca?.email || ''
            },
            pieceList: {
              item: [
                {
                  type: 'PACKAGE',
                  width: piece.width,
                  height: piece.height,
                  length: piece.length,
                  weight: piece.weight,
                  quantity: piece.quantity
                }
              ]
            },
            content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
            comment: notes.przesylka?.uwagi || '',
            reference: `ORDER_${shipmentData.id}`,
            paymentInfo: {
              paymentMethod: 'SENDER',
              accountNumber: this.accountNumber
            },
            serviceType: 'AH', // Domestic service
            labelType: 'BLP'
          }
        ]
      }
    };
  }

  // NOWA METODA: Wywołanie WebAPI2
  async callWebAPI2(shipmentParams) {
    try {
      if (!soap) {
        throw new Error('Biblioteka SOAP nie jest dostępna');
      }

      console.log('Creating SOAP client for WebAPI2:', this.wsdlUrl);
      
      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });
      
      console.log('WebAPI2 client created successfully');
      console.log('Available methods:', Object.keys(client).filter(key => key.includes('create')));
      
      console.log('=== WYSYŁANE DANE DO DHL WebAPI2 ===');
      console.log('Params:', JSON.stringify(shipmentParams, null, 2));
      console.log('=== KONIEC WYSYŁANYCH DANYCH ===');

      // Wywołaj createShipments dla WebAPI2
      const [result] = await client.createShipmentsAsync(shipmentParams);
      
      console.log('=== PEŁNA ODPOWIEDŹ Z DHL WebAPI2 ===');
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('=== KONIEC ODPOWIEDZI ===');
      
      // Sprawdź strukturę odpowiedzi WebAPI2
      if (result && result.createShipmentsResult) {
        const shipmentsResult = result.createShipmentsResult;
        
        if (shipmentsResult.item && shipmentsResult.item.length > 0) {
          const shipment = shipmentsResult.item[0];
          
          if (shipment.shipmentNumber) {
            return {
              success: true,
              shipmentNumber: shipment.shipmentNumber,
              trackingNumber: shipment.shipmentNumber,
              labelUrl: shipment.labelData ? 
                `data:application/pdf;base64,${shipment.labelData}` : null,
              labelContent: shipment.labelData,
              dispatchNumber: shipment.dispatchNumber,
              cost: shipment.cost || 'Nieznany',
              data: shipment
            };
          }
        }
      }
      
      // Sprawdź czy jest informacja o błędzie
      if (result && (result.error || result.errors)) {
        throw new Error(`DHL WebAPI2 Error: ${result.error || result.errors}`);
      }
      
      throw new Error(`DHL WebAPI2 zwróciło nieoczekiwaną strukturę: ${JSON.stringify(result)}`);
      
    } catch (error) {
      console.error('DHL WebAPI2 Error:', error);
      
      if (error.body) {
        console.error('SOAP Error Body:', error.body);
      }
      
      return {
        success: false,
        error: `DHL WebAPI2 Error: ${error.message}`
      };
    }
  }

  // METODA TESTOWA zaktualizowana do WebAPI2
  async testWebAPI2Connection() {
    try {
      console.log('=== TESTOWANIE POŁĄCZENIA WebAPI2 ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      // MINIMALNA STRUKTURA dla WebAPI2
      const testParams = {
        authData: {
          login: this.login,
          password: this.password
        },
        shipments: {
          item: [
            {
              shipperAddress: {
                name: "Test Shipper",
                postalCode: "00-999",
                city: "Warszawa",
                street: "Testowa",
                houseNumber: "1"
              },
              shipperContact: {
                personName: "Test Person",
                phoneNumber: "600700800",
                emailAddress: "test@test.pl"
              },
              receiverAddress: {
                name: "Test Receiver",
                postalCode: "30-001",
                city: "Kraków",
                street: "Odbiorcza",
                houseNumber: "2"
              },
              receiverContact: {
                personName: "Test Receiver",
                phoneNumber: "600800900",
                emailAddress: "receiver@test.pl"
              },
              pieceList: {
                item: [
                  {
                    type: "PACKAGE",
                    width: 10,
                    height: 10,
                    length: 10,
                    weight: 1,
                    quantity: 1
                  }
                ]
              },
              content: "Test content",
              comment: "Test comment",
              reference: "TEST_REF",
              paymentInfo: {
                paymentMethod: "SENDER",
                accountNumber: this.accountNumber
              },
              serviceType: "AH",
              labelType: "BLP"
            }
          ]
        }
      };

      console.log('=== WebAPI2 TEST PARAMS ===');
      console.log(JSON.stringify(testParams, null, 2));

      const [result] = await client.createShipmentsAsync(testParams);
      
      console.log('=== WebAPI2 TEST RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      return {
        success: result?.createShipmentsResult?.item?.[0]?.shipmentNumber ? true : false,
        result: result,
        shipmentNumber: result?.createShipmentsResult?.item?.[0]?.shipmentNumber,
        error: !result?.createShipmentsResult?.item?.[0]?.shipmentNumber ? 'No shipment number returned' : null
      };

    } catch (error) {
      console.error('WebAPI2 test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // POMOCNICZE METODY (bez zmian)
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
      quantity: parseInt(przesylka?.ilosc) || 1
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

  // Anulowanie przesyłki dla WebAPI2
  async cancelShipment(shipmentNumber) {
    try {
      console.log('Cancelling DHL shipment (WebAPI2):', shipmentNumber);
      
      if (this.isTestMode) {
        console.log('TEST MODE: Simulating successful cancellation');
        return { success: true };
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
        shipments: {
          item: [shipmentNumber]
        }
      };

      const [result] = await client.deleteShipmentsAsync(params);
      
      if (result && result.deleteShipmentsResult) {
        return { success: true };
      } else {
        throw new Error('Anulowanie nie powiodło się');
      }
    } catch (error) {
      console.error('DHL cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Śledzenie przesyłek
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
        error: 'Śledzenie przesyłek nie jest jeszcze zaimplementowane dla WebAPI2'
      };
    } catch (error) {
      console.error('DHL tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // STARA METODA dla backward compatibility
  async testDHLConnection() {
    return await this.testWebAPI2Connection();
  }

  // STARA METODA dla backward compatibility
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
