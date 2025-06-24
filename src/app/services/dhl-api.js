// src/app/services/dhl-api.js
// Prawdziwa integracja z DHL24 API

class DHLApiService {
  constructor() {
    this.baseUrl = process.env.DHL_API_URL || 'https://sandbox.dhl24.com.pl';
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_API;
    this.sapClient = process.env.DHL_SAP_CLIENT;
  }

  // Autoryzacja do DHL24 - prawdziwy endpoint
  async authenticate() {
    try {
      console.log('DHL Auth attempt:', { 
        url: `${this.baseUrl}/api/auth/login`,
        login: this.login,
        sapClient: this.sapClient 
      });

      // DHL24 używa podstawowej autoryzacji HTTP lub formularza
      const authData = new URLSearchParams({
        'username': this.login,
        'password': this.password,
        'client': this.sapClient
      });

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'GrupaEltron-TransportSystem/1.0'
        },
        body: authData
      });

      console.log('DHL Auth response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DHL Auth error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DHL Auth success:', data);
      
      return data.authToken || data.token || data.sessionId;
    } catch (error) {
      console.error('DHL Authentication error:', error);
      throw new Error('Nie udało się zalogować do DHL24: ' + error.message);
    }
  }

  // Utworzenie przesyłki - prawdziwy format DHL24
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL shipment for order:', shipmentData.id);
      
      // Na razie symulujemy, bo potrzebujemy poznać dokładny format API
      // To powinno być zastąpione prawdziwym żądaniem gdy poznamy endpoint
      
      const dhlShipment = this.mapToDHL24Format(shipmentData);
      console.log('Mapped shipment data:', dhlShipment);
      
      // SYMULACJA - zastąp prawdziwym API
      const simulatedResponse = {
        success: true,
        shipmentNumber: 'DHL' + Date.now(),
        trackingNumber: '1234567890123456',
        labelUrl: `${this.baseUrl}/labels/test-label.pdf`,
        cost: (Math.random() * 50 + 15).toFixed(2),
        status: 'CREATED'
      };
      
      console.log('DHL shipment created (simulated):', simulatedResponse);
      return simulatedResponse;
      
      /* PRAWDZIWE ŻĄDANIE - odkomentuj gdy poznamy endpoint
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/shipments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(dhlShipment)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DHL API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        shipmentNumber: result.shipmentNumber || result.id,
        trackingNumber: result.trackingNumber || result.waybill,
        labelUrl: result.labelUrl || result.label,
        cost: result.cost,
        data: result
      };
      */
    } catch (error) {
      console.error('DHL Create shipment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mapowanie na format DHL24 (na podstawie dokumentacji)
  mapToDHL24Format(shipmentData) {
    const notes = typeof shipmentData.notes === 'string' 
      ? JSON.parse(shipmentData.notes) 
      : shipmentData.notes;

    // Format zgodny z DHL24 API (może wymagać dostosowania)
    return {
      shipmentInfo: {
        serviceType: this.determineServiceType(notes.typZlecenia),
        billing: 'SENDER', // Kto płaci
        labelType: 'BLP', // Typ etykiety
        content: this.extractContentFromDescription(shipmentData.package_description)
      },
      
      // Nadawca
      shipper: {
        name: notes.nadawca.nazwa,
        postalCode: this.extractPostalCodeFromAddress(notes.nadawca.adres),
        city: this.extractCityFromAddress(notes.nadawca.adres),
        street: this.extractStreetFromAddress(notes.nadawca.adres),
        contactPerson: notes.nadawca.kontakt,
        phoneNumber: notes.nadawca.telefon,
        emailAddress: notes.nadawca.email,
        countryCode: 'PL'
      },

      // Odbiorca
      receiver: {
        name: shipmentData.recipient_name,
        postalCode: this.extractPostalCodeFromAddress(shipmentData.recipient_address),
        city: this.extractCityFromAddress(shipmentData.recipient_address),
        street: this.extractStreetFromAddress(shipmentData.recipient_address),
        contactPerson: notes.odbiorca.kontakt || shipmentData.recipient_name,
        phoneNumber: shipmentData.recipient_phone,
        emailAddress: notes.odbiorca.email,
        countryCode: 'PL'
      },

      // Dane przesyłki
      pieceList: [{
        type: 'PACKAGE',
        width: notes.przesylka.wymiary?.szerokosc || 10,
        height: notes.przesylka.wymiary?.wysokosc || 10,
        length: notes.przesylka.wymiary?.dlugosc || 10,
        weight: notes.przesylka.waga || 1,
        quantity: notes.przesylka.ilosc || 1,
        blpPieceType: 'ENVELOPE'
      }],

      // Dodatkowe opcje
      shipmentValue: 100,
      currency: 'PLN',
      reference: shipmentData.id?.toString(),
      comments: notes.przesylka.uwagi || ''
    };
  }

  // Pomocnicze funkcje (bez zmian)
  extractStreetFromAddress(address) {
    const parts = address.split(',');
    return parts[0]?.trim() || '';
  }

  extractPostalCodeFromAddress(address) {
    const match = address.match(/(\d{2}-\d{3})/);
    return match ? match[1] : '';
  }

  extractCityFromAddress(address) {
    const parts = address.split(',');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      return lastPart.replace(/\d{2}-\d{3}\s*/, '').trim();
    }
    return '';
  }

  extractContentFromDescription(description) {
    return description.split('|')[0]?.trim() || 'Przesyłka kurierska';
  }

  determineServiceType(typZlecenia) {
    // Kody usług DHL24 (może wymagać weryfikacji)
    switch (typZlecenia) {
      case 'nadawca_bialystok':
      case 'nadawca_zielonka':
        return 'DR'; // Domestic Regular
      case 'odbiorca_bialystok':
      case 'odbiorca_zielonka':
        return 'DR'; // Domestic Regular 
      case 'trzecia_strona':
        return 'DR'; // Domestic Regular
      default:
        return 'DR';
    }
  }

  // Śledzenie przesyłki - SYMULACJA
  async getShipmentStatus(trackingNumber) {
    try {
      console.log('Tracking DHL shipment:', trackingNumber);
      
      // SYMULACJA - zastąp prawdziwym API
      const simulatedStatus = {
        success: true,
        status: Math.random() > 0.5 ? 'IN_TRANSIT' : 'DELIVERED',
        events: [
          {
            timestamp: new Date().toISOString(),
            status: 'PICKED_UP',
            location: 'Białystok',
            description: 'Przesyłka odebrana od nadawcy'
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'IN_TRANSIT',
            location: 'Warszawa HUB',
            description: 'Przesyłka w transporcie'
          }
        ],
        estimatedDelivery: new Date(Date.now() + 86400000).toISOString()
      };
      
      return simulatedStatus;
      
      /* PRAWDZIWE ŻĄDANIE
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/tracking/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        status: data.status,
        events: data.events || [],
        estimatedDelivery: data.estimatedDelivery
      };
      */
    } catch (error) {
      console.error('DHL Tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Anulowanie przesyłki - SYMULACJA
  async cancelShipment(shipmentNumber) {
    try {
      console.log('Cancelling DHL shipment:', shipmentNumber);
      
      // SYMULACJA
      return { success: true };
      
      /* PRAWDZIWE ŻĄDANIE
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/shipments/${shipmentNumber}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
      */
    } catch (error) {
      console.error('DHL Cancel shipment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Metoda testowa do sprawdzenia połączenia
  async testConnection() {
    try {
      console.log('Testing DHL24 connection...');
      
      // Sprawdź czy możemy się zalogować
      const token = await this.authenticate();
      console.log('DHL24 connection test successful, token received');
      
      return {
        success: true,
        message: 'Połączenie z DHL24 działa',
        token: token ? 'Otrzymano' : 'Brak'
      };
    } catch (error) {
      console.error('DHL24 connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DHLApiService();
