// src/app/services/dhl-api.js
// Prawdziwa integracja z testowym API DHL24

class DHLApiService {
  constructor() {
    this.baseUrl = process.env.DHL_API_URL || 'https://sandbox.dhl24.com.pl';
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_API;
    this.sapClient = process.env.DHL_SAP_CLIENT;
  }

  // Autoryzacja do DHL24 - zgodnie z dokumentacją
  async authenticate() {
    try {
      console.log('DHL24 authentication attempt to:', this.baseUrl);
      console.log('Using login:', this.login);
      console.log('Using SAP client:', this.sapClient);

      // DHL24 używa Basic Auth lub POST z parametrami
      const response = await fetch(`${this.baseUrl}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          login: this.login,
          password: this.password,
          client: this.sapClient
        })
      });

      console.log('DHL24 Auth Response Status:', response.status);
      console.log('DHL24 Auth Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DHL24 Auth error response:', errorText);
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('DHL24 authentication successful, received data:', data);
      
      return data.authToken || data.token;
    } catch (error) {
      console.error('DHL24 authentication error:', error);
      throw new Error('Nie udało się zalogować do DHL24: ' + error.message);
    }
  }

  // Utworzenie przesyłki w DHL24
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL24 shipment for order:', shipmentData.id);
      console.log('Shipment data received:', {
        id: shipmentData.id,
        recipient: shipmentData.recipient_name,
        address: shipmentData.recipient_address,
        phone: shipmentData.recipient_phone
      });
      
      const token = await this.authenticate();
      const dhlShipment = this.mapToDHL24Format(shipmentData);
      
      console.log('Mapped DHL24 shipment data:', JSON.stringify(dhlShipment, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(dhlShipment)
      });

      console.log('DHL24 Shipment Response Status:', response.status);
      console.log('DHL24 Shipment Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.text();
        console.error('DHL24 shipment creation failed:', errorData);
        throw new Error(`DHL24 API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('DHL24 shipment created successfully:', result);
      
      return {
        success: true,
        shipmentNumber: result.shipmentNumber || result.id,
        trackingNumber: result.trackingNumber || result.waybill,
        labelUrl: result.labelUrl || result.label,
        cost: result.cost || result.price,
        data: result
      };
    } catch (error) {
      console.error('DHL24 shipment creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mapowanie na format DHL24 zgodnie z dokumentacją
  mapToDHL24Format(shipmentData) {
    const notes = typeof shipmentData.notes === 'string' 
      ? JSON.parse(shipmentData.notes) 
      : shipmentData.notes;

    return {
      // Podstawowe informacje o przesyłce
      shipmentInfo: {
        serviceType: this.determineServiceType(notes.typZlecenia),
        billing: 'SENDER',
        labelType: 'BLP',
        content: this.extractContentFromDescription(shipmentData.package_description),
        reference: `ORDER_${shipmentData.id}`,
        comments: notes.przesylka.uwagi || ''
      },
      
      // Nadawca
      shipper: {
        name: notes.nadawca.nazwa,
        postalCode: this.extractPostalCodeFromAddress(notes.nadawca.adres),
        city: this.extractCityFromAddress(notes.nadawca.adres),
        street: this.extractStreetFromAddress(notes.nadawca.adres),
        contactPerson: notes.nadawca.kontakt,
        phoneNumber: this.cleanPhoneNumber(notes.nadawca.telefon),
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
        phoneNumber: this.cleanPhoneNumber(shipmentData.recipient_phone),
        emailAddress: notes.odbiorca.email || '',
        countryCode: 'PL'
      },

      // Lista paczek
      pieceList: [{
        type: 'PACKAGE',
        width: parseFloat(notes.przesylka.wymiary?.szerokosc) || 10,
        height: parseFloat(notes.przesylka.wymiary?.wysokosc) || 10,
        length: parseFloat(notes.przesylka.wymiary?.dlugosc) || 10,
        weight: parseFloat(notes.przesylka.waga) || 1,
        quantity: parseInt(notes.przesylka.ilosc) || 1,
        content: this.extractContentFromDescription(shipmentData.package_description)
      }],

      // Wartość przesyłki
      shipmentValue: 100,
      currency: 'PLN'
    };
  }

  // Pomocnicze funkcje
  extractStreetFromAddress(address) {
    if (!address) return '';
    const parts = address.split(',');
    return parts[0]?.trim() || '';
  }

  extractPostalCodeFromAddress(address) {
    if (!address) return '';
    const match = address.match(/(\d{2}-\d{3})/);
    return match ? match[1] : '';
  }

  extractCityFromAddress(address) {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      return lastPart.replace(/\d{2}-\d{3}\s*/, '').trim();
    }
    return '';
  }

  extractContentFromDescription(description) {
    if (!description) return 'Przesyłka';
    return description.split('|')[0]?.trim() || 'Przesyłka';
  }

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    // Usuń wszystkie znaki oprócz cyfr i znaku +
    return phone.replace(/[^\d+]/g, '');
  }

  determineServiceType(typZlecenia) {
    // Kody usług DHL24 zgodnie z dokumentacją
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

  // Śledzenie przesyłki
  async getShipmentStatus(trackingNumber) {
    try {
      console.log('Tracking DHL24 shipment:', trackingNumber);
      
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/tracking/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DHL24 tracking error:', errorText);
        throw new Error(`Tracking failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('DHL24 tracking result:', data);
      
      return {
        success: true,
        status: data.status || data.shipmentStatus,
        events: data.events || data.trackingEvents || [],
        estimatedDelivery: data.estimatedDelivery || data.expectedDeliveryDate
      };
    } catch (error) {
      console.error('DHL24 tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Anulowanie przesyłki
  async cancelShipment(shipmentNumber) {
    try {
      console.log('Cancelling DHL24 shipment:', shipmentNumber);
      
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/shipments/${shipmentNumber}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DHL24 cancellation error:', errorText);
        throw new Error(`Cancellation failed: ${response.status}`);
      }

      console.log('DHL24 shipment cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('DHL24 cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Pobieranie etykiety
  async getLabel(shipmentNumber) {
    try {
      console.log('Getting DHL24 label for:', shipmentNumber);
      
      const token = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/api/shipments/${shipmentNumber}/label`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error(`Label download failed: ${response.status}`);
      }

      const labelBlob = await response.blob();
      const labelUrl = URL.createObjectURL(labelBlob);
      
      return {
        success: true,
        labelUrl: labelUrl,
        blob: labelBlob
      };
    } catch (error) {
      console.error('DHL24 label download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DHLApiService();
