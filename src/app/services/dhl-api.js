// src/app/services/dhl-api.js
// Prawdziwa integracja z DHL24 API zgodnie z dokumentacją WSDL

class DHLApiService {
  constructor() {
    // URL do prawdziwego API DHL24
    this.apiUrl = process.env.DHL_API_URL || 'https://dhl24.com.pl/servicepoint/provider/service.html?ws=1';
    this.testApiUrl = 'https://sandbox.dhl24.com.pl/servicepoint/provider/service.html?ws=1'; // Sandbox dla testów
    this.username = process.env.DHL_USERNAME;
    this.password = process.env.DHL_PASSWORD;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
  }

  // Tworzenie przesyłki zgodnie z WSDL
  async createShipment(shipmentData) {
    try {
      console.log('Creating DHL24 shipment for order:', shipmentData.id);
      
      const soapEnvelope = this.buildCreateShipmentSOAP(shipmentData);
      const url = this.isTestMode ? this.testApiUrl : this.apiUrl;
      
      console.log('Sending SOAP request to:', url);
      console.log('SOAP Envelope:', soapEnvelope);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'https://dhl24.com.pl/servicepoint/provider/service.html?ws=1#createShipment',
          'Accept': 'text/xml'
        },
        body: soapEnvelope
      });

      console.log('DHL24 Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DHL24 HTTP error:', errorText);
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('DHL24 Response:', responseText);
      
      const result = this.parseCreateShipmentResponse(responseText);
      
      if (result.success) {
        console.log('DHL24 shipment created successfully:', result);
        return {
          success: true,
          shipmentNumber: result.shipmentNumber,
          trackingNumber: result.shipmentNumber, // W DHL24 to samo
          labelUrl: result.labelContent ? `data:application/pdf;base64,${result.labelContent}` : null,
          labelContent: result.labelContent,
          dispatchNumber: result.dispatchNumber,
          data: result
        };
      } else {
        throw new Error(result.error || 'Unknown DHL24 error');
      }
    } catch (error) {
      console.error('DHL24 shipment creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Budowanie SOAP envelope dla createShipment
  buildCreateShipmentSOAP(shipmentData) {
    const notes = typeof shipmentData.notes === 'string' 
      ? JSON.parse(shipmentData.notes) 
      : shipmentData.notes;

    // Parsowanie adresów
    const shipperAddress = this.parseAddress(notes.nadawca.adres);
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    
    // Określ typ usługi DHL
    const serviceType = this.determineServiceType(notes.typZlecenia);
    
    // Wyciągnij wymiary i wagę
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="https://dhl24.com.pl/servicepoint/provider/service.html?ws=1">
  <soap:Body>
    <tns:createShipment>
      <tns:shipment>
        <tns:authData>
          <tns:username>${this.escapeXml(this.username)}</tns:username>
          <tns:password>${this.escapeXml(this.password)}</tns:password>
        </tns:authData>
        <tns:shipmentData>
          <tns:ship>
            <tns:shipper>
              <tns:address>
                <tns:name>${this.escapeXml(notes.nadawca.nazwa)}</tns:name>
                <tns:postcode>${this.escapeXml(shipperAddress.postcode)}</tns:postcode>
                <tns:city>${this.escapeXml(shipperAddress.city)}</tns:city>
                <tns:street>${this.escapeXml(shipperAddress.street)}</tns:street>
                <tns:houseNumber>${this.escapeXml(shipperAddress.houseNumber)}</tns:houseNumber>
                ${shipperAddress.apartmentNumber ? `<tns:apartmentNumber>${this.escapeXml(shipperAddress.apartmentNumber)}</tns:apartmentNumber>` : ''}
              </tns:address>
              <tns:contact>
                <tns:personName>${this.escapeXml(notes.nadawca.kontakt)}</tns:personName>
                <tns:phoneNumber>${this.escapeXml(this.cleanPhoneNumber(notes.nadawca.telefon))}</tns:phoneNumber>
                <tns:emailAddress>${this.escapeXml(notes.nadawca.email)}</tns:emailAddress>
              </tns:contact>
            </tns:shipper>
            <tns:receiver>
              <tns:address>
                <tns:addressType>PRIVATE</tns:addressType>
                <tns:name>${this.escapeXml(shipmentData.recipient_name)}</tns:name>
                <tns:postcode>${this.escapeXml(receiverAddress.postcode)}</tns:postcode>
                <tns:city>${this.escapeXml(receiverAddress.city)}</tns:city>
                <tns:street>${this.escapeXml(receiverAddress.street)}</tns:street>
                <tns:houseNumber>${this.escapeXml(receiverAddress.houseNumber)}</tns:houseNumber>
                ${receiverAddress.apartmentNumber ? `<tns:apartmentNumber>${this.escapeXml(receiverAddress.apartmentNumber)}</tns:apartmentNumber>` : ''}
              </tns:address>
              <tns:contact>
                <tns:personName>${this.escapeXml(notes.odbiorca.kontakt || shipmentData.recipient_name)}</tns:personName>
                <tns:phoneNumber>${this.escapeXml(this.cleanPhoneNumber(shipmentData.recipient_phone))}</tns:phoneNumber>
                <tns:emailAddress>${this.escapeXml(notes.odbiorca.email || '')}</tns:emailAddress>
              </tns:contact>
            </tns:receiver>
          </tns:ship>
          <tns:shipmentInfo>
            <tns:dropOffType>REGULAR_PICKUP</tns:dropOffType>
            <tns:serviceType>${serviceType}</tns:serviceType>
            <tns:billing>
              <tns:shippingPaymentType>SENDER</tns:shippingPaymentType>
              <tns:paymentType>BANK_TRANSFER</tns:paymentType>
            </tns:billing>
            <tns:labelType>BLP</tns:labelType>
          </tns:shipmentInfo>
          <tns:pieceList>
            <tns:item>
              <tns:type>PACKAGE</tns:type>
              <tns:width>${piece.width}</tns:width>
              <tns:height>${piece.height}</tns:height>
              <tns:lenght>${piece.length}</tns:lenght>
              <tns:weight>${piece.weight}</tns:weight>
              <tns:quantity>${piece.quantity}</tns:quantity>
              <tns:nonStandard>false</tns:nonStandard>
            </tns:item>
          </tns:pieceList>
          <tns:content>${this.escapeXml(this.extractContentFromDescription(shipmentData.package_description))}</tns:content>
          <tns:comment>${this.escapeXml(notes.przesylka.uwagi || '')}</tns:comment>
          <tns:reference>ORDER_${shipmentData.id}</tns:reference>
        </tns:shipmentData>
      </tns:shipment>
    </tns:createShipment>
  </soap:Body>
</soap:Envelope>`;
  }

  // Parsowanie odpowiedzi createShipment
  parseCreateShipmentResponse(xmlResponse) {
    try {
      // Sprawdź czy to błąd SOAP
      if (xmlResponse.includes('soap:Fault') || xmlResponse.includes('faultstring')) {
        const faultMatch = xmlResponse.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
        const errorMessage = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
        return {
          success: false,
          error: `DHL24 SOAP Error: ${errorMessage}`
        };
      }

      // Wyciągnij shipmentNumber
      const shipmentMatch = xmlResponse.match(/<(?:tns:)?shipmentNumber[^>]*>(.*?)<\/(?:tns:)?shipmentNumber>/);
      const shipmentNumber = shipmentMatch ? shipmentMatch[1] : null;

      // Wyciągnij dispatchNumber
      const dispatchMatch = xmlResponse.match(/<(?:tns:)?dispatchNumber[^>]*>(.*?)<\/(?:tns:)?dispatchNumber>/);
      const dispatchNumber = dispatchMatch ? dispatchMatch[1] : null;

      // Wyciągnij labelContent (Base64)
      const labelMatch = xmlResponse.match(/<(?:tns:)?labelContent[^>]*>(.*?)<\/(?:tns:)?labelContent>/);
      const labelContent = labelMatch ? labelMatch[1] : null;

      if (shipmentNumber) {
        return {
          success: true,
          shipmentNumber: shipmentNumber,
          dispatchNumber: dispatchNumber,
          labelContent: labelContent
        };
      } else {
        return {
          success: false,
          error: 'No shipment number in response'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Response parsing error: ${error.message}`
      };
    }
  }

  // Usuwanie przesyłki
  async cancelShipment(shipmentNumber) {
    try {
      console.log('Cancelling DHL24 shipment:', shipmentNumber);
      
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="https://dhl24.com.pl/servicepoint/provider/service.html?ws=1">
  <soap:Body>
    <tns:deleteShipment>
      <tns:shipment>
        <tns:authData>
          <tns:username>${this.escapeXml(this.username)}</tns:username>
          <tns:password>${this.escapeXml(this.password)}</tns:password>
        </tns:authData>
        <tns:shipment>${this.escapeXml(shipmentNumber)}</tns:shipment>
      </tns:shipment>
    </tns:deleteShipment>
  </soap:Body>
</soap:Envelope>`;

      const url = this.isTestMode ? this.testApiUrl : this.apiUrl;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'https://dhl24.com.pl/servicepoint/provider/service.html?ws=1#deleteShipment',
          'Accept': 'text/xml'
        },
        body: soapEnvelope
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('DHL24 Delete Response:', responseText);

      // Sprawdź status w odpowiedzi
      if (responseText.includes('<tns:status>OK</tns:status>') || 
          responseText.includes('<status>OK</status>')) {
        return { success: true };
      } else {
        throw new Error('Cancellation failed');
      }
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
      
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="https://dhl24.com.pl/servicepoint/provider/service.html?ws=1">
  <soap:Body>
    <tns:getLabel>
      <tns:structure>
        <tns:authData>
          <tns:username>${this.escapeXml(this.username)}</tns:username>
          <tns:password>${this.escapeXml(this.password)}</tns:password>
        </tns:authData>
        <tns:shipment>${this.escapeXml(shipmentNumber)}</tns:shipment>
        <tns:type>BLP</tns:type>
      </tns:structure>
    </tns:getLabel>
  </soap:Body>
</soap:Envelope>`;

      const url = this.isTestMode ? this.testApiUrl : this.apiUrl;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'https://dhl24.com.pl/servicepoint/provider/service.html?ws=1#getLabel',
          'Accept': 'text/xml'
        },
        body: soapEnvelope
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const responseText = await response.text();
      
      // Wyciągnij labelContent (Base64)
      const labelMatch = responseText.match(/<(?:tns:)?labelContent[^>]*>(.*?)<\/(?:tns:)?labelContent>/);
      const labelContent = labelMatch ? labelMatch[1] : null;

      if (labelContent) {
        return {
          success: true,
          labelUrl: `data:application/pdf;base64,${labelContent}`,
          labelContent: labelContent
        };
      } else {
        throw new Error('No label content in response');
      }
    } catch (error) {
      console.error('DHL24 label download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Śledzenie przesyłki (to nie jest w WSDL, więc używamy innego API)
  async getShipmentStatus(trackingNumber) {
    try {
      console.log('Tracking DHL24 shipment:', trackingNumber);
      
      // DHL24 ma osobne API do trackingu
      const trackingUrl = 'https://api.dhl24.com.pl/tracking';
      
      const response = await fetch(`${trackingUrl}/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DHL24-Integration'
        }
      });

      if (!response.ok) {
        throw new Error(`Tracking API Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        status: data.status || 'UNKNOWN',
        events: data.events || [],
        estimatedDelivery: data.estimatedDelivery
      };
    } catch (error) {
      console.error('DHL24 tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ====== FUNKCJE POMOCNICZE ======

  // Parsowanie adresu z tekstu
  parseAddress(addressString) {
    if (!addressString) return {};
    
    const parts = addressString.split(',').map(p => p.trim());
    const postcodeMatch = addressString.match(/(\d{2}-\d{3})/);
    
    // Przykład: "Wysockiego 69B, 15-169 Białystok"
    const streetPart = parts[0] || '';
    const cityPart = parts[parts.length - 1] || '';
    
    // Wyciągnij numer domu ze street
    const streetMatch = streetPart.match(/^(.+?)[\s]+([0-9]+[A-Za-z]*)$/);
    const street = streetMatch ? streetMatch[1] : streetPart;
    const houseNumber = streetMatch ? streetMatch[2] : '';
    
    // Wyciągnij miasto (bez kodu pocztowego)
    const city = cityPart.replace(/\d{2}-\d{3}\s*/, '').trim();
    
    return {
      street: street,
      houseNumber: houseNumber,
      apartmentNumber: '', // Trzeba by to lepiej parsować
      postcode: postcodeMatch ? postcodeMatch[1] : '',
      city: city
    };
  }

  // Wyciągnij informacje o paczce
  extractPieceInfo(packageDescription, przesylka) {
    const wymiary = przesylka?.wymiary || {};
    
    return {
      width: parseInt(wymiary.szerokosc) || 10,
      height: parseInt(wymiary.wysokosc) || 10,
      length: parseInt(wymiary.dlugosc) || 10, // UWAGA: DHL używa "lenght" w XML!
      weight: parseInt(przesylka?.waga) || 1,
      quantity: parseInt(przesylka?.ilosc) || 1
    };
  }

  // Określ typ usługi DHL24
  determineServiceType(typZlecenia) {
    // Kody usług zgodnie z dokumentacją DHL24
    switch (typZlecenia) {
      case 'nadawca_bialystok':
      case 'nadawca_zielonka':
      case 'odbiorca_bialystok':
      case 'odbiorca_zielonka':
      case 'trzecia_strona':
      default:
        return '09'; // Domestic 09:00 - standard dla przesyłek krajowych
    }
  }

  // Wyciągnij zawartość z opisu
  extractContentFromDescription(description) {
    if (!description) return 'Przesyłka';
    return description.split('|')[0]?.trim() || 'Przesyłka';
  }

  // Oczyszczanie numeru telefonu
  cleanPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '').substring(0, 15);
  }

  // Escape XML characters
  escapeXml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default new DHLApiService();
