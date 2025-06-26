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

  // Zaktualizuj metodę prepareCreateShipmentsData
  prepareCreateShipmentsData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);
  
    // STRUKTURA ZGODNA Z DOKUMENTACJĄ DHL WebAPI2
    return {
      authData: {
        username: this.login,
        password: this.password
      },
      shipments: {
        item: [
          {
            // SHIPPER - nadawca (zgodnie z dokumentacją)
            shipper: {
              name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
              postalCode: shipperAddress.postcode || '15-169',
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
              postalCode: this.cleanPostalCode(receiverAddress.postcode) || '00-001',
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
                  length: piece.length,
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
            skipRestrictionCheck: true // Ważne dla sandbox
          }
        ]
      }
    };
  }
  
  // DODAJ nową metodę do czyszczenia kodów pocztowych
  cleanPostalCode(postcode) {
    if (!postcode) return '';
    // Usuń wszystko oprócz cyfr i myślnika
    const cleaned = postcode.replace(/[^\d-]/g, '');
    
    // Sprawdź czy to polski format XX-XXX
    if (cleaned.match(/^\d{2}-\d{3}$/)) {
      return cleaned;
    }
    
    // Jeśli tylko cyfry, sformatuj jako XX-XXX
    if (cleaned.match(/^\d{5}$/)) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
    }
    
    return cleaned || '00-001'; // Domyślny kod dla testów
  }
  
  // ZAKTUALIZUJ metodę testową
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
  
      // POPRAWIONA STRUKTURA TESTOWA zgodna z dokumentacją DHL
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
                postalCode: "15-169",
                city: "Białystok",
                street: "Wysockiego",
                houseNumber: "69B",
                contactPerson: "Test Magazyn",
                contactPhone: "857152705",
                contactEmail: "test@grupaeltron.pl"
              },
              receiver: {
                // KLUCZOWE POLA dla przesyłek krajowych
                country: "PL",
                addressType: "B", // Business address
                
                name: "Test Receiver",
                postalCode: "24-100", // Prawidłowy polski format
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
                product: "AH", // Przesyłka krajowa AH
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
