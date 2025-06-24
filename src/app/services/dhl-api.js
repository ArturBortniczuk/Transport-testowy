// src/app/services/dhl-api.js
import soap from 'soap';

class DHLApiService {
  constructor() {
    // URL do SOAP WSDL
    this.wsdlUrl = process.env.DHL_TEST_MODE === 'true' 
      ? 'https://sandbox.dhl24.com.pl/webapi2?wsdl'
      : 'https://dhl24.com.pl/webapi2?wsdl';
    
    this.username = process.env.DHL_USERNAME;
    this.password = process.env.DHL_PASSWORD;
    this.clientNumber = process.env.DHL_CLIENT_NUMBER;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    console.log('DHL API Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      username: this.username ? 'SET' : 'NOT SET',
      password: this.password ? 'SET' : 'NOT SET',
      clientNumber: this.clientNumber ? 'SET' : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // Główna metoda tworzenia przesyłki
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL shipment for order:', shipmentData.id);
      
      // Sprawdź dane konfiguracyjne
      if (!this.username || !this.password) {
        return {
          success: false,
          error: 'Brak danych uwierzytelniających DHL (username/password)'
        };
      }

      const notes = typeof shipmentData.notes === 'string' 
        ? JSON.parse(shipmentData.notes) 
        : shipmentData.notes;

      // W trybie testowym zwróć sukces bez prawdziwego API
      if (this.isTestMode && (!this.clientNumber || this.clientNumber === 'TEST')) {
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

      // Przygotuj dane zgodnie z SOAP API DHL
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

  // Przygotowanie danych zgodnie z dokumentacją DHL SOAP
  prepareDHLSOAPData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    return {
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
              personName: notes.nadawca?.kontakt || 'Magazyn',
              phoneNumber: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
              emailAddress: notes.nadawca?.email || 'logistyka@grupaeltron.pl'
            }
          },
          receiver: {
            address: {
              addressType: notes.odbiorca?.typ === 'firma' ? 'BUSINESS' : 'PRIVATE',
              name: shipmentData.recipient_name,
              postcode: receiverAddress.postcode,
              city: receiverAddress.city,
              street: receiverAddress.street,
              houseNumber: receiverAddress.houseNumber,
              ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber })
            },
            contact: {
              personName: notes.odbiorca?.kontakt || shipmentData.recipient_name,
              phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
              emailAddress: notes.odbiorca?.email || ''
            }
          }
        },
        shipmentInfo: {
          dropOffType: 'REGULAR_PICKUP',
          serviceType: this.determineServiceType(notes.typZlecenia),
          billing: {
            shippingPaymentType: 'SHIPPER',
            billingAccountNumber: this.clientNumber,
            paymentType: 'BANK_TRANSFER',
            costsCenter: 'Transport System'
          },
          shipmentDate: new Date().toISOString().split('T')[0],
          shipmentStartHour: '08:00',
          shipmentEndHour: '16:00',
          labelType: 'BLP'
        },
        pieceList: [
          {
            item: piece
          }
        ],
        content: this.extractContentFromDescription(shipmentData.package_description),
        comment: notes.przesylka?.uwagi || '',
        reference: `ORDER_${shipmentData.id}`
      }
    };
  }

  // Wywołanie SOAP API DHL
  async callDHLSOAPAPI(soapParams) {
    try {
      console.log('Creating SOAP client for URL:', this.wsdlUrl);
      
      // Utwórz klienta SOAP
      const client = await soap.createClientAsync(this.wsdlUrl, {
        timeout: 30000,
        disableCache: true
      });
      
      console.log('SOAP client created successfully');
      console.log('Available methods:', Object.keys(client));
      
      // Wywołaj metodę createShipment
      const [result] = await client.createShipmentAsync(soapParams);
      
      console.log('DHL SOAP Response:', result);
      
      if (result && result.shipmentNumber) {
        return {
          success: true,
          shipmentNumber: result.shipmentNumber,
          trackingNumber: result.shipmentNumber, // W DHL często to samo
          labelUrl: result.labelContent ? `data:application/pdf;base64,${result.labelContent}` : null,
          labelContent: result.labelContent,
          dispatchNumber: result.dispatchNumber,
          cost: result.cost || 'Nieznany',
          data: result
        };
      } else if (result && result.error) {
        throw new Error(result.error);
      } else {
        throw new Error('Nieoczekiwana odpowiedź z DHL API');
      }
    } catch (error) {
      console.error('DHL SOAP API Error:', error);
      
      // Jeśli to błąd połączenia lub timeout, zwróć specjalny błąd
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Brak połączenia z serwisem DHL. Sprawdź połączenie internetowe i spróbuj ponownie.'
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
      
      if (this.isTestMode && (!this.clientNumber || this.clientNumber === 'TEST')) {
        console.log('TEST MODE: Simulating successful cancellation');
        return { success: true };
      }

      const client = await soap.createClientAsync(this.wsdlUrl);
      
      const params = {
        authData: {
          username: this.username,
          password: this.password
        },
        shipment: shipmentNumber
      };

      const [result] = await client.deleteShipmentAsync(params);
      
      if (result && result.status === 'OK') {
        return { success: true };
      } else {
        throw new Error(result.error || 'Anulowanie nie powiodło się');
      }
    } catch (error) {
      console.error('DHL cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Śledzenie przesyłki (jeśli dostępne w API)
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

      // Próba użycia API śledzenia
      const trackingUrl = `https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`;
      
      const response = await fetch(trackingUrl, {
        method: 'GET',
        headers: {
          'DHL-API-Key': process.env.DHL_TRACKING_API_KEY || '',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: data.shipments?.[0]?.status?.statusCode || 'UNKNOWN',
          events: data.shipments?.[0]?.events || [],
          estimatedDelivery: data.shipments?.[0]?.estimatedTimeOfDelivery
        };
      } else {
        throw new Error(`Tracking API error: ${response.status}`);
      }
    } catch (error) {
      console.error('DHL tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ====== FUNKCJE POMOCNICZE ======

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
      lenght: parseInt(wymiary.dlugosc) || 10, // DHL używa "lenght" zamiast "length"
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
}

export default new DHLApiService();
