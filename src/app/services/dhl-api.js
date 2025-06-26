// src/app/services/dhl-api.js
// POPRAWIONA WERSJA zgodnie z dokumentacją DHL

// Dynamiczny import soap dla środowiska serverless
let soap;
try {
  soap = require('soap');
} catch (error) {
  console.error('SOAP library not available:', error);
}

class DHLApiService {
  constructor() {
    // URL dla WebAPI2 zgodnie z dokumentacją
    this.wsdlUrl = 'https://sandbox.dhl24.com.pl/webapi2';
    
    console.log('DHL WebAPI2 URL:', this.wsdlUrl);
    
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL WebAPI2 Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      login: this.login ? `SET (${this.login})` : 'NOT SET',
      password: this.password ? `SET (${this.password.substring(0, 3)}...)` : 'NOT SET',
      accountNumber: this.accountNumber ? `SET (${this.accountNumber})` : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // GŁÓWNA METODA - zgodna z dokumentacją DHL
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

      // UŻYJ createShipments zgodnie z dokumentacją WebAPI2
      const shipmentParams = this.prepareCreateShipmentsData(shipmentData, notes);
      
      console.log('Prepared createShipments data:', JSON.stringify(shipmentParams, null, 2));
      
      const result = await this.callCreateShipments(shipmentParams);
      
      return result;
    } catch (error) {
      console.error('DHL shipment creation error:', error);
      return {
        success: false,
        error: `DHL Error: ${error.message}`
      };
    }
  }

  // POPRAWIONA METODA: Przygotuj dane zgodnie z dokumentacją DHL
  prepareCreateShipmentsData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    // Wyczyść i sformatuj kody pocztowe
    const shipperPostcode = this.cleanPostalCode(shipperAddress.postcode || '15169');
    const receiverPostcode = this.cleanPostalCode(receiverAddress.postcode || '00001');

    console.log('Shipper postal code:', shipperAddress.postcode, '->', shipperPostcode);
    console.log('Receiver postal code:', receiverAddress.postcode, '->', receiverPostcode);

    // STRUKTURA ZGODNA Z DOKUMENTACJĄ DHL WebAPI2
    return {
      authData: {
        username: this.login,  // ← ZGODNIE Z DOKUMENTACJĄ
        password: this.password
      },
      shipments: {
        item: [
          {
            // SHIPPER - nadawca (zgodnie z dokumentacją)
            shipper: {
              name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
              postalCode: shipperPostcode, // ← UŻYWAMY WYCZYSZCZONEGO
              city: shipperAddress.city || 'Białystok',
              street: shipperAddress.street || 'Wysockiego',
              houseNumber: shipperAddress.houseNumber || '69B',
              ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber }),
              contactPerson: notes.nadawca?.kontakt || 'Magazyn Białystok',
              contactPhone: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
              contactEmail: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
            },
            
            // RECEIVER - odbiorca - POPRAWIONA STRUKTURA
            receiver: {
              // DODANE: Wymagane pola dla przesyłek krajowych
              country: 'PL', // ← KLUCZOWE: Kraj odbiorcy
              addressType: 'B', // ← KLUCZOWE: Typ adresu (B = Business, C = Consumer)
              
              name: shipmentData.recipient_name,
              postalCode: receiverPostcode, // ← UŻYWAMY WYCZYSZCZONEGO
              city: receiverAddress.city || 'Warszawa',
              street: receiverAddress.street || 'Testowa',
              houseNumber: receiverAddress.houseNumber || '1',
              ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber }),
              contactPerson: notes.odbiorca?.kontakt || shipmentData.recipient_name,
              contactPhone: this.cleanPhoneNumber(shipmentData.recipient_phone),
              contactEmail: notes.odbiorca?.email || ''
            },
            
            // PIECE LIST - lista paczek (zgodnie z dokumentacją)
            pieceList: {
              item: [
                {
                  type: 'PACKAGE',
                  width: piece.width,
                  height: piece.height,
                  length: piece.length,  // ← length (nie lenght!)
                  weight: piece.weight,
                  quantity: piece.quantity,
                  nonStandard: false
                }
              ]
            },
            
            // PAYMENT - płatność (zgodnie z dokumentacją)
            payment: {
              paymentMethod: 'BANK_TRANSFER',
              payerType: 'SHIPPER',
              accountNumber: parseInt(this.accountNumber) // ← MUSI BYĆ LICZBĄ!
            },
            
            // SERVICE - usługa (zgodnie z dokumentacją)
            service: {
              product: 'AH', // Przesyłka krajowa
              deliveryEvening: false
            },
            
            // INNE POLA (zgodnie z dokumentacją)
            shipmentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
            comment: notes.przesylka?.uwagi || '',
            reference: `ORDER_${shipmentData.id}`,
            skipRestrictionCheck: true // Ważne dla stałego zbioru
          }
        ]
      }
    };
  }

  // WYWOŁANIE createShipments zgodnie z dokumentacją
  async callCreateShipments(shipmentParams) {
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
      console.log('Available methods:', Object.keys(client).filter(key => key.includes('createShipments')));
      
      console.log('=== WYSYŁANE DANE DO DHL createShipments ===');
      console.log('Params:', JSON.stringify(shipmentParams, null, 2));
      console.log('=== KONIEC WYSYŁANYCH DANYCH ===');

      // WYWOŁAJ createShipments (zgodnie z dokumentacją WebAPI2)
      const [result] = await client.createShipmentsAsync(shipmentParams);
      
      console.log('=== PEŁNA ODPOWIEDŹ Z DHL createShipments ===');
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('=== KONIEC ODPOWIEDZI ===');
      
      // SPRAWDŹ STRUKTURĘ ODPOWIEDZI (zgodnie z dokumentacją)
      if (result && result.createShipmentsResult) {
        const shipmentsResult = result.createShipmentsResult;
        
        if (shipmentsResult.item && shipmentsResult.item.length > 0) {
          const shipment = shipmentsResult.item[0];
          
          if (shipment.shipmentId) {
            return {
              success: true,
              shipmentNumber: shipment.shipmentId,
              trackingNumber: shipment.shipmentId,
              labelUrl: null, // Etykiety pobieramy osobno metodą getLabels
              labelContent: null,
              dispatchNumber: null,
              cost: 'Nieznany',
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
      console.error('DHL WebAPI2 createShipments Error:', error);
      
      if (error.body) {
        console.error('SOAP Error Body:', error.body);
      }
      
      return {
        success: false,
        error: `DHL WebAPI2 Error: ${error.message}`
      };
    }
  }

  // METODA TESTOWA zgodna z dokumentacją
  async testCreateShipments() {
    try {
      console.log('=== TESTOWANIE createShipments WebAPI2 ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });

      // POPRAWIONA STRUKTURA z prawidłowymi kodami pocztowymi
      const testParams = {
        authData: {
          username: this.login,
          password: this.password
        },
        shipments: {
          item: [
            {
              shipper: {
                name: "Grupa Eltron Test",
                postalCode: "15-169", // ← POPRAWIONY FORMAT
                city: "Białystok",
                street: "Wysockiego",
                houseNumber: "69B",
                contactPerson: "Test Magazyn",
                contactPhone: "857152705",
                contactEmail: "test@grupaeltron.pl"
              },
              receiver: {
                country: "PL",
                addressType: "B",
                
                name: "Test Receiver",
                postalCode: "24-100", // ← POPRAWIONY FORMAT
                city: "Puławy", 
                street: "Wróblewskiego",
                houseNumber: "7",
                contactPerson: "Test Receiver",
                contactPhone: "600800900",
                contactEmail: "receiver@test.pl"
              },
              pieceList: {
                item: [
                  {
                    type: "PACKAGE",
                    width: 10,
                    height: 10,
                    length: 10,
                    weight: 1,
                    quantity: 1,
                    nonStandard: false
                  }
                ]
              },
              payment: {
                paymentMethod: "BANK_TRANSFER",
                payerType: "SHIPPER",
                accountNumber: parseInt(this.accountNumber)
              },
              service: {
                product: "AH",
                deliveryEvening: false
              },
              shipmentDate: new Date().toISOString().split('T')[0],
              content: "Test content",
              comment: "Test comment",
              reference: "TEST_REF",
              skipRestrictionCheck: true
            }
          ]
        }
      };

      console.log('=== createShipments TEST PARAMS ===');
      console.log(JSON.stringify(testParams, null, 2));

      const [result] = await client.createShipmentsAsync(testParams);
      
      console.log('=== createShipments TEST RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      const isSuccess = result?.createShipmentsResult?.item?.[0]?.shipmentId ? true : false;

      return {
        success: isSuccess,
        result: result,
        shipmentId: result?.createShipmentsResult?.item?.[0]?.shipmentId,
        error: !isSuccess ? 'No shipmentId returned' : null
      };

    } catch (error) {
      console.error('createShipments test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NOWA METODA: Czyszczenie kodów pocztowych
  cleanPostalCode(postcode) {
    if (!postcode) return '';
    
    // Usuń wszystko oprócz cyfr
    let cleaned = postcode.toString().replace(/[^\d]/g, '');
    
    console.log('Cleaning postal code:', postcode, '->', cleaned);
    
    // Jeśli ma 5 cyfr, sformatuj jako XX-XXX
    if (cleaned.length === 5) {
      const formatted = `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
      console.log('Formatted postal code:', formatted);
      return formatted;
    }
    
    // Jeśli już ma prawidłowy format XX-XXX
    if (postcode && postcode.match(/^\d{2}-\d{3}$/)) {
      return postcode;
    }
    
    console.warn('Invalid postal code format:', postcode, 'using default');
    return '00-001'; // Domyślny dla testów
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
      length: parseInt(wymiary.dlugosc) || 10, // length (nie lenght!)
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
    // DHL wymaga 9 cyfr bez prefiksu (zgodnie z dokumentacją FAQ)
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('48')) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return cleaned.substring(0, 9); // Maksymalnie 9 cyfr
  }

  // Anulowanie przesyłki
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
          username: this.login,
          password: this.password
        },
        shipmentIdList: [shipmentNumber]
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

  // BACKWARD COMPATIBILITY
  async testDHLConnection() {
    return await this.testCreateShipments();
  }
}

export default new DHLApiService();
