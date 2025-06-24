// src/app/services/dhl-api.js
// Serwis do komunikacji z API DHL24

class DHLApiService {
  constructor() {
    this.baseUrl = process.env.DHL_API_URL || 'https://sandbox.dhl24.com.pl';
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_API;
    this.sapClient = process.env.DHL_SAP_CLIENT;
  }

  // Autoryzacja i pobieranie tokenu
  async authenticate() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: this.login,
          password: this.password,
          sapClient: this.sapClient
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.authToken || data.token;
    } catch (error) {
      console.error('DHL Authentication error:', error);
      throw new Error('Nie udało się zalogować do API DHL: ' + error.message);
    }
  }

  // Utworzenie przesyłki kurierskiej
  async createShipment(shipmentData) {
    try {
      const token = await this.authenticate();
      
      const dhlShipment = this.mapToDHLFormat(shipmentData);
      
      const response = await fetch(`${this.baseUrl}/api/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        label: result.labelUrl || result.label,
        cost: result.cost,
        data: result
      };
    } catch (error) {
      console.error('DHL Create shipment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mapowanie danych z naszego formatu na format DHL
  mapToDHLFormat(shipmentData) {
    const notes = typeof shipmentData.notes === 'string' 
      ? JSON.parse(shipmentData.notes) 
      : shipmentData.notes;

    return {
      // Dane nadawcy
      sender: {
        name: notes.nadawca.nazwa,
        address: {
          street: this.extractStreetFromAddress(notes.nadawca.adres),
          city: this.extractCityFromAddress(notes.nadawca.adres),
          postalCode: this.extractPostalCodeFromAddress(notes.nadawca.adres),
          country: 'PL'
        },
        contact: {
          person: notes.nadawca.kontakt,
          phone: notes.nadawca.telefon,
          email: notes.nadawca.email
        }
      },

      // Dane odbiorcy
      receiver: {
        name: shipmentData.recipient_name,
        address: {
          street: this.extractStreetFromAddress(shipmentData.recipient_address),
          city: this.extractCityFromAddress(shipmentData.recipient_address),
          postalCode: this.extractPostalCodeFromAddress(shipmentData.recipient_address),
          country: 'PL'
        },
        contact: {
          person: notes.odbiorca.kontakt,
          phone: shipmentData.recipient_phone,
          email: notes.odbiorca.email
        }
      },

      // Dane przesyłki
      shipment: {
        content: this.extractContentFromDescription(shipmentData.package_description),
        weight: notes.przesylka.waga,
        dimensions: notes.przesylka.wymiary,
        quantity: notes.przesylka.ilosc || 1,
        value: 100, // Domyślna wartość, można rozszerzyć
        currency: 'PLN',
        comments: notes.przesylka.uwagi
      },

      // Opcje dostawy
      serviceType: this.determineServiceType(notes.typZlecenia),
      
      // Dodatkowe opcje
      options: {
        saturdayDelivery: false,
        morningDelivery: false,
        eveningDelivery: false,
        personalCollection: false
      }
    };
  }

  // Pomocnicze funkcje do ekstrakcji danych z adresu
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
      // Usuń kod pocztowy z miasta
      return lastPart.replace(/\d{2}-\d{3}\s*/, '').trim();
    }
    return '';
  }

  extractContentFromDescription(description) {
    return description.split('|')[0]?.trim() || 'Przesyłka kurierska';
  }

  // Określenie typu usługi na podstawie typu zlecenia
  determineServiceType(typZlecenia) {
    switch (typZlecenia) {
      case 'nadawca_bialystok':
      case 'nadawca_zielonka':
        return 'DHL_DOMESTIC'; // Krajowa
      case 'odbiorca_bialystok':
      case 'odbiorca_zielonka':
        return 'DHL_PICKUP'; // Odbiór
      case 'trzecia_strona':
        return 'DHL_DOMESTIC'; // Krajowa
      default:
        return 'DHL_DOMESTIC';
    }
  }

  // Sprawdzenie statusu przesyłki
  async getShipmentStatus(trackingNumber) {
    try {
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/tracking/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    } catch (error) {
      console.error('DHL Tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Anulowanie przesyłki
  async cancelShipment(shipmentNumber) {
    try {
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
    } catch (error) {
      console.error('DHL Cancel shipment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DHLApiService();
