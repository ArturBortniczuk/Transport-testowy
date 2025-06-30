// src/app/services/dhl-api.js
// 🔥 MEGA DHL API SERVICE - PEŁNA IMPLEMENTACJA WebAPI2
// Wszystkie funkcje z dokumentacji DHL + zaawansowane features

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
    
    this.login = process.env.DHL_LOGIN;
    this.password = process.env.DHL_PASSWORD_DHL24;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.isTestMode = process.env.DHL_TEST_MODE === 'true';
    
    // Cache dla często używanych danych
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minut
    
    console.log('🚀 MEGA DHL WebAPI2 Service initialized:', {
      wsdlUrl: this.wsdlUrl,
      login: this.login ? `SET (${this.login})` : 'NOT SET',
      password: this.password ? `SET (${this.password.substring(0, 3)}...)` : 'NOT SET',
      accountNumber: this.accountNumber ? `SET (${this.accountNumber})` : 'NOT SET',
      testMode: this.isTestMode
    });
  }

  // ============================================================================
  // 🔧 HELPER METHODS
  // ============================================================================

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Tworzenie klienta SOAP z retry mechanism
  async createSoapClient(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        if (!soap) {
          throw new Error('Biblioteka SOAP nie jest dostępna');
        }

        const client = await soap.createClientAsync(this.wsdlUrl, {
          timeout: 30000,
          disableCache: true,
          wsdl_options: {
            timeout: 30000
          }
        });

        return client;
      } catch (error) {
        console.error(`SOAP client creation attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // Czyszczenie kodu pocztowego - tylko cyfry dla DHL
  cleanPostalCode(postcode) {
    if (!postcode) return '';
    let cleaned = postcode.toString().replace(/[^\d]/g, '');
    return cleaned.length === 5 ? cleaned : '00001';
  }

  // Czyszczenie numeru telefonu
  cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('48')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned.substring(0, 9);
  }

  // Parsowanie adresu
  parseAddress(addressString) {
    if (!addressString) return {};
    
    const parts = addressString.split(',').map(p => p.trim());
    const postcodeMatch = addressString.match(/(\d{2}-?\d{3})/);
    
    const streetPart = parts[0] || '';
    const cityPart = parts[parts.length - 1] || '';
    
    const streetMatch = streetPart.match(/^(.+?)[\s]+([0-9]+[A-Za-z]*)(\/([0-9]+))?$/);
    const street = streetMatch ? streetMatch[1] : streetPart;
    const houseNumber = streetMatch ? streetMatch[2] : '';
    const apartmentNumber = streetMatch ? streetMatch[4] : '';
    
    const city = cityPart.replace(/\d{2}-?\d{3}\s*/, '').trim();
    
    let postcode = '';
    if (postcodeMatch) {
      postcode = postcodeMatch[1].replace(/[^\d]/g, '');
    }
    
    return {
      street: street,
      houseNumber: houseNumber,
      apartmentNumber: apartmentNumber,
      postcode: postcode,
      city: city
    };
  }

  // ============================================================================
  // 📦 CORE SHIPMENT METHODS
  // ============================================================================

  // 1. getVersion - Sprawdzanie wersji API
  async getVersion() {
    try {
      console.log('🔍 Checking DHL API version...');
      
      if (this.isTestMode) {
        return {
          success: true,
          version: 'TEST_VERSION_2.4'
        };
      }

      const client = await this.createSoapClient();
      const [result] = await client.getVersionAsync();
      
      return {
        success: true,
        version: result?.version || 'Unknown'
      };
    } catch (error) {
      console.error('getVersion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 2. createShipments - Tworzenie przesyłek (ULEPSZONE)
  async createShipment(shipmentData) {
    try {
      console.log('📦 Creating DHL shipment for order:', shipmentData.id);
      
      if (!this.login || !this.password || !this.accountNumber) {
        return {
          success: false,
          error: 'Brak kompletnych danych uwierzytelniających DHL'
        };
      }

      const notes = typeof shipmentData.notes === 'string' 
        ? JSON.parse(shipmentData.notes) 
        : shipmentData.notes;

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

  // 3. getMyShipments - Pobieranie listy przesyłek użytkownika
  async getMyShipments(dateFrom, dateTo, offset = 0) {
    try {
      console.log('📋 Getting my shipments:', { dateFrom, dateTo, offset });
      
      const cacheKey = `myShipments_${dateFrom}_${dateTo}_${offset}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      if (this.isTestMode) {
        const mockShipments = [
          {
            shipmentId: 'TEST_001',
            created: new Date().toISOString(),
            orderStatus: 'COURIER_BOOKED',
            shipper: { name: 'Test Shipper' },
            receiver: { name: 'Test Receiver' },
            service: { product: 'AH' },
            content: 'Test content'
          }
        ];
        
        const result = {
          success: true,
          shipments: mockShipments
        };
        
        this.setCache(cacheKey, result);
        return result;
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        createdFrom: dateFrom,
        createdTo: dateTo,
        offset: offset
      };

      const [result] = await client.getMyShipmentsAsync(params);
      
      if (result?.shipments) {
        const response = {
          success: true,
          shipments: result.shipments
        };
        
        this.setCache(cacheKey, response);
        return response;
      } else {
        throw new Error('No shipments data received');
      }
    } catch (error) {
      console.error('getMyShipments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 4. getMyShipmentsCount - Liczba przesyłek
  async getMyShipmentsCount(dateFrom, dateTo) {
    try {
      console.log('🔢 Getting shipments count:', { dateFrom, dateTo });
      
      if (this.isTestMode) {
        return {
          success: true,
          count: 42
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        createdFrom: dateFrom,
        createdTo: dateTo
      };

      const [result] = await client.getMyShipmentsCountAsync(params);
      
      return {
        success: true,
        count: result?.shipmentsCount || 0
      };
    } catch (error) {
      console.error('getMyShipmentsCount error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 🚚 COURIER BOOKING METHODS  
  // ============================================================================

  // 5. bookCourier - Zamawianie kuriera
  async bookCourier(courierData) {
    try {
      console.log('🚚 Booking courier:', courierData);
      
      if (this.isTestMode) {
        return {
          success: true,
          orderId: [`TEST_ORDER_${Date.now()}`],
          message: 'Kurier zamówiony w trybie testowym'
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        pickupDate: courierData.pickupDate,
        pickupTimeFrom: courierData.pickupTimeFrom,
        pickupTimeTo: courierData.pickupTimeTo,
        additionalInfo: courierData.additionalInfo || '',
        courierWithLabel: courierData.courierWithLabel || false
      };

      // Opcja 1: Zamówienie kuriera dla istniejących przesyłek
      if (courierData.shipmentIds && courierData.shipmentIds.length > 0) {
        params.shipmentIdList = courierData.shipmentIds.map(id => ({ item: id }));
      }
      
      // Opcja 2: Zamówienie kuriera bez przesyłek
      if (courierData.shipmentOrderInfo) {
        params.shipmentOrderInfo = {
          shipper: courierData.shipmentOrderInfo.shipper,
          numberOfExPieces: courierData.shipmentOrderInfo.numberOfExPieces || 0,
          numberOfDrPieces: courierData.shipmentOrderInfo.numberOfDrPieces || 0,
          totalWeight: courierData.shipmentOrderInfo.totalWeight || 0,
          heaviestPieceWeight: courierData.shipmentOrderInfo.heaviestPieceWeight || 0
        };
      }

      const [result] = await client.bookCourierAsync(params);
      
      if (result?.orderId) {
        return {
          success: true,
          orderId: Array.isArray(result.orderId) ? result.orderId : [result.orderId],
          message: 'Kurier został zamówiony pomyślnie'
        };
      } else {
        throw new Error('No order ID received from courier booking');
      }
    } catch (error) {
      console.error('bookCourier error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 🏷️ LABELS & DOCUMENTS METHODS
  // ============================================================================

  // 6. getLabels - Pobieranie etykiet (PDF, ZPL)
  async getLabels(labelRequests) {
    try {
      console.log('🏷️ Getting labels:', labelRequests);
      
      if (this.isTestMode) {
        return {
          success: true,
          labels: labelRequests.map(req => ({
            shipmentId: req.shipmentId,
            labelType: req.labelType,
            labelData: 'VEVTVCBMQUJFTCBEQVRB', // base64 dla "TEST LABEL DATA"
            labelMimeType: req.labelType === 'BLP' ? 'application/pdf' : 'text/plain',
            labelName: `${req.shipmentId}_${req.labelType}.pdf`
          }))
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        itemsToPrint: labelRequests.map(req => ({
          item: {
            labelType: req.labelType, // LP, BLP, ZBLP, ZBLP300
            shipmentId: req.shipmentId
          }
        }))
      };

      const [result] = await client.getLabelsAsync(params);
      
      if (result?.itemsToPrintResponse) {
        return {
          success: true,
          labels: result.itemsToPrintResponse.map(item => ({
            shipmentId: item.shipmentId,
            labelType: item.labelType,
            labelData: item.labelData,
            labelMimeType: item.labelMimeType,
            labelName: `${item.shipmentId}_${item.labelType}.${item.labelMimeType === 'application/pdf' ? 'pdf' : 'zpl'}`,
            cn23Data: item.cn23Data,
            cn23MimeType: item.cn23MimeType,
            fvProformaData: item.fvProformaData,
            fvProformaMimeType: item.fvProformaMimeType
          }))
        };
      } else {
        throw new Error('No labels data received');
      }
    } catch (error) {
      console.error('getLabels error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 7. getShipmentScan - Skan listu przewozowego
  async getShipmentScan(shipmentId) {
    try {
      console.log('📸 Getting shipment scan:', shipmentId);
      
      if (this.isTestMode) {
        return {
          success: true,
          scanData: 'VEVTVCBTQ0FOIERBVEE=', // base64
          scanMimeType: 'image/jpeg',
          message: 'Skan pobrany w trybie testowym'
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        shipmentId: shipmentId
      };

      const [result] = await client.getShipmentScanAsync(params);
      
      if (result?.scanData) {
        return {
          success: true,
          scanData: result.scanData,
          scanMimeType: result.scanMimeType || 'image/jpeg'
        };
      } else {
        throw new Error('No scan data available for this shipment');
      }
    } catch (error) {
      console.error('getShipmentScan error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 💰 PRICING METHODS
  // ============================================================================

  // 8. getPrice - Kalkulacja ceny przesyłki
  async getPrice(priceRequest) {
    try {
      console.log('💰 Calculating price:', priceRequest);
      
      const cacheKey = `price_${JSON.stringify(priceRequest)}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      if (this.isTestMode) {
        const mockPrice = {
          success: true,
          price: '25.50',
          fuelSurcharge: '15.2',
          currency: 'PLN',
          breakdown: {
            basePrice: '22.17',
            fuelSurcharge: '3.33',
            totalNet: '25.50',
            vat: '5.87',
            totalGross: '31.37'
          }
        };
        
        this.setCache(cacheKey, mockPrice);
        return mockPrice;
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        shipment: {
          payment: {
            accountNumber: this.accountNumber
          },
          shipper: {
            country: priceRequest.shipper.country || 'PL',
            name: priceRequest.shipper.name,
            postalCode: this.cleanPostalCode(priceRequest.shipper.postalCode),
            city: priceRequest.shipper.city,
            street: priceRequest.shipper.street,
            houseNumber: priceRequest.shipper.houseNumber,
            apartmentNumber: priceRequest.shipper.apartmentNumber || ''
          },
          receiver: {
            country: priceRequest.receiver.country || 'PL',
            addressType: priceRequest.receiver.addressType || 'B',
            name: priceRequest.receiver.name,
            postalCode: this.cleanPostalCode(priceRequest.receiver.postalCode),
            city: priceRequest.receiver.city,
            street: priceRequest.receiver.street,
            houseNumber: priceRequest.receiver.houseNumber,
            apartmentNumber: priceRequest.receiver.apartmentNumber || ''
          },
          service: {
            product: priceRequest.service.product || 'AH',
            deliveryEvening: priceRequest.service.deliveryEvening || false,
            deliveryOnSaturday: priceRequest.service.deliveryOnSaturday || false,
            pickupOnSaturday: priceRequest.service.pickupOnSaturday || false,
            collectOnDelivery: priceRequest.service.collectOnDelivery || false,
            collectOnDeliveryValue: priceRequest.service.collectOnDeliveryValue || 0,
            insurance: priceRequest.service.insurance || false,
            insuranceValue: priceRequest.service.insuranceValue || 0
          },
          pieceList: priceRequest.pieceList.map(piece => ({
            item: {
              type: piece.type || 'PACKAGE',
              weight: piece.weight,
              width: piece.width,
              height: piece.height,
              length: piece.length,
              quantity: piece.quantity || 1,
              nonStandard: piece.nonStandard || false
            }
          }))
        }
      };

      const [result] = await client.getPriceAsync(params);
      
      if (result?.price !== undefined) {
        const priceResult = {
          success: true,
          price: result.price,
          fuelSurcharge: result.fuelSurcharge || '0',
          currency: 'PLN'
        };
        
        this.setCache(cacheKey, priceResult);
        return priceResult;
      } else {
        throw new Error('No price data received');
      }
    } catch (error) {
      console.error('getPrice error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 📍 POSTAL CODE & SERVICES METHODS
  // ============================================================================

  // 9. getPostalCodeServices - Sprawdzanie usług dla kodu pocztowego (ROZSZERZONE)
  async getPostalCodeServices(postCode, pickupDate, city = '', street = '', houseNumber = '', apartmentNumber = '') {
    try {
      console.log('🔍 Checking postal code services:', postCode);
      
      if (!postCode || postCode.length !== 5) {
        return {
          success: false,
          error: 'Nieprawidłowy kod pocztowy - wymagane 5 cyfr'
        };
      }

      const cacheKey = `postalServices_${postCode}_${pickupDate}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      if (this.isTestMode) {
        const mockServices = {
          success: true,
          services: {
            domesticExpress9: true,
            domesticExpress12: true,
            deliveryEvening: true,
            pickupOnSaturday: false,
            deliverySaturday: true,
            exPickupFrom: '08:00',
            exPickupTo: '16:00',
            drPickupFrom: '08:00',
            drPickupTo: '18:00'
          },
          message: 'Wszystkie standardowe usługi dostępne (TEST MODE)'
        };
        
        this.setCache(cacheKey, mockServices);
        return mockServices;
      }

      const client = await this.createSoapClient();

      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        postCode: postCode,
        pickupDate: pickupDate,
        ...(city && { city }),
        ...(street && { street }),
        ...(houseNumber && { houseNumber }),
        ...(apartmentNumber && { apartmentNumber })
      };

      const [result] = await client.getPostalCodeServicesAsync(params);
      
      if (result?.getPostalCodeServicesResult) {
        const services = result.getPostalCodeServicesResult;
        
        const serviceResult = {
          success: true,
          services: {
            domesticExpress9: services.domesticExpress9 || false,
            domesticExpress12: services.domesticExpress12 || false,
            deliveryEvening: services.deliveryEvening || false,
            pickupOnSaturday: services.pickupOnSaturday || false,
            deliverySaturday: services.deliverySaturday || false,
            exPickupFrom: services.exPickupFrom || null,
            exPickupTo: services.exPickupTo || null,
            drPickupFrom: services.drPickupFrom || null,
            drPickupTo: services.drPickupTo || null
          },
          message: 'Usługi DHL sprawdzone pomyślnie'
        };
        
        this.setCache(cacheKey, serviceResult);
        return serviceResult;
      } else {
        return {
          success: false,
          error: 'Brak dostępnych usług DHL dla podanego kodu pocztowego'
        };
      }
    } catch (error) {
      console.error('getPostalCodeServices error:', error);
      return {
        success: false,
        error: `Błąd sprawdzania usług: ${error.message}`
      };
    }
  }

  // 10. getRouting - Pobieranie tras kurierskich
  async getRouting(routingRequest) {
    try {
      console.log('🗺️ Getting routing info:', routingRequest);
      
      if (this.isTestMode) {
        return {
          success: true,
          routing: {
            EX_PN: 'EX_ROUTE_MON',
            EX_WT: 'EX_ROUTE_TUE', 
            EX_SR: 'EX_ROUTE_WED',
            EX_CZ: 'EX_ROUTE_THU',
            EX_PT: 'EX_ROUTE_FRI',
            EX_SO: 'EX_ROUTE_SAT',
            DR_PN: 'DR_ROUTE_MON',
            DR_WT: 'DR_ROUTE_TUE',
            DR_SR: 'DR_ROUTE_WED', 
            DR_CZ: 'DR_ROUTE_THU',
            DR_PT: 'DR_ROUTE_FRI',
            DR_SO: 'DR_ROUTE_SAT',
            W_PN: 'EVENING_MON',
            W_WT: 'EVENING_TUE',
            W_SR: 'EVENING_WED',
            W_CZ: 'EVENING_THU',
            W_PT: 'EVENING_FRI'
          }
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        getRoutingRequest: {
          authData: {
            username: this.login,
            password: this.password
          },
          postalCode: this.cleanPostalCode(routingRequest.postalCode),
          city: routingRequest.city,
          street: routingRequest.street,
          houseNumber: routingRequest.houseNumber,
          apartmentNumber: routingRequest.apartmentNumber || ''
        }
      };

      const [result] = await client.getRoutingAsync(params);
      
      return {
        success: true,
        routing: result || {}
      };
    } catch (error) {
      console.error('getRouting error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 📊 TRACKING & MONITORING METHODS
  // ============================================================================

  // 11. getTrackAndTraceInfo - Pełne śledzenie przesyłki
  async getTrackAndTraceInfo(shipmentId) {
    try {
      console.log('📊 Getting tracking info:', shipmentId);
      
      if (this.isTestMode) {
        return {
          success: true,
          shipmentId: shipmentId,
          receivedBy: 'Jan Kowalski',
          events: [
            {
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              description: 'Przesyłka została odebrana od nadawcy',
              location: 'Białystok',
              status: 'PICKED_UP'
            },
            {
              timestamp: new Date(Date.now() - 43200000).toISOString(), 
              description: 'Przesyłka w transporcie',
              location: 'Warszawa Hub',
              status: 'IN_TRANSIT'
            },
            {
              timestamp: new Date().toISOString(),
              description: 'Przesyłka dostarczona',
              location: 'Warszawa',
              status: 'DELIVERED'
            }
          ]
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        shipmentId: shipmentId
      };

      const [result] = await client.getTrackAndTraceInfoAsync(params);
      
      if (result) {
        return {
          success: true,
          shipmentId: result.shipmentId,
          receivedBy: result.receivedBy || '',
          events: result.events || []
        };
      } else {
        throw new Error('No tracking data available');
      }
    } catch (error) {
      console.error('getTrackAndTraceInfo error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 🗑️ MANAGEMENT METHODS
  // ============================================================================

  // 12. deleteShipments - Usuwanie przesyłek
  async deleteShipments(shipmentIds) {
    try {
      console.log('🗑️ Deleting shipments:', shipmentIds);
      
      if (this.isTestMode) {
        return {
          success: true,
          deletedShipments: shipmentIds,
          message: 'Przesyłki usunięte w trybie testowym'
        };
      }

      const client = await this.createSoapClient();
      
      const params = {
        authData: {
          username: this.login,
          password: this.password
        },
        shipments: shipmentIds.map(id => ({ item: id }))
      };

      const [result] = await client.deleteShipmentsAsync(params);
      
      if (result?.shipments) {
        return {
          success: true,
          deletedShipments: result.shipments,
          message: 'Przesyłki zostały usunięte'
        };
      } else {
        throw new Error('Failed to delete shipments');
      }
    } catch (error) {
      console.error('deleteShipments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 🔧 EXISTING METHODS (Enhanced)
  // ============================================================================

  prepareCreateShipmentsData(shipmentData, notes) {
    const shipperAddress = this.parseAddress(notes.nadawca?.adres || '');
    const receiverAddress = this.parseAddress(shipmentData.recipient_address);
    const piece = this.extractPieceInfo(shipmentData.package_description, notes.przesylka);

    const shipperPostcode = this.cleanPostalCode(shipperAddress.postcode || '15169');
    const receiverPostcode = this.cleanPostalCode(receiverAddress.postcode || '24100');

    return {
      authData: {
        username: this.login,
        password: this.password
      },
      shipments: {
        item: [
          {
            shipper: {
              name: notes.nadawca?.nazwa || 'Grupa Eltron Sp. z o.o.',
              postalCode: shipperPostcode,
              city: shipperAddress.city || 'Białystok',
              street: shipperAddress.street || 'Wysockiego',
              houseNumber: shipperAddress.houseNumber || '69B',
              ...(shipperAddress.apartmentNumber && { apartmentNumber: shipperAddress.apartmentNumber }),
              contactPerson: notes.nadawca?.kontakt || 'Magazyn Białystok',
              contactPhone: this.cleanPhoneNumber(notes.nadawca?.telefon || '857152705'),
              contactEmail: notes.nadawca?.email || 'bialystok@grupaeltron.pl'
            },
            receiver: {
              country: 'PL',
              addressType: 'B',
              name: shipmentData.recipient_name,
              postalCode: receiverPostcode,
              city: receiverAddress.city || 'Warszawa',
              street: receiverAddress.street || 'Testowa',
              houseNumber: receiverAddress.houseNumber || '1',
              ...(receiverAddress.apartmentNumber && { apartmentNumber: receiverAddress.apartmentNumber }),
              contactPerson: notes.odbiorca?.kontakt || shipmentData.recipient_name,
              contactPhone: this.cleanPhoneNumber(shipmentData.recipient_phone),
              contactEmail: notes.odbiorca?.email || ''
            },
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
            payment: {
              paymentMethod: 'BANK_TRANSFER',
              payerType: 'SHIPPER',
              accountNumber: parseInt(this.accountNumber)
            },
            service: {
              product: 'AH',
              deliveryEvening: false
            },
            shipmentDate: new Date().toISOString().split('T')[0],
            content: this.extractContentFromDescription(shipmentData.package_description) || 'Przesyłka',
            comment: notes.przesylka?.uwagi || '',
            reference: `ORDER_${shipmentData.id}`,
            skipRestrictionCheck: true
          }
        ]
      }
    };
  }

  async callCreateShipments(shipmentParams) {
    try {
      const client = await this.createSoapClient();
      const [result] = await client.createShipmentsAsync(shipmentParams);
      
      console.log('DHL createShipments result:', JSON.stringify(result, null, 2));
      
      if (result?.createShipmentsResult?.item?.[0]?.shipmentId) {
        const shipment = result.createShipmentsResult.item[0];
        
        return {
          success: true,
          shipmentNumber: shipment.shipmentId,
          trackingNumber: shipment.shipmentId,
          labelUrl: null,
          labelContent: null,
          dispatchNumber: null,
          cost: 'Nieznany',
          data: shipment
        };
      }
      
      throw new Error(`DHL WebAPI2 zwróciło nieoczekiwaną strukturę: ${JSON.stringify(result)}`);
      
    } catch (error) {
      console.error('DHL WebAPI2 createShipments Error:', error);
      return {
        success: false,
        error: `DHL WebAPI2 Error: ${error.message}`
      };
    }
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

  // ============================================================================
  // 🧪 TESTING & DIAGNOSTICS
  // ============================================================================

  async testCreateShipments() {
    try {
      console.log('=== TESTOWANIE createShipments WebAPI2 ===');
      
      if (!soap) {
        return { success: false, error: 'SOAP not available' };
      }

      const client = await this.createSoapClient();

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
                postalCode: "15169",
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
                postalCode: "24100",
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

      const [result] = await client.createShipmentsAsync(testParams);
      
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

  // BACKWARD COMPATIBILITY METHODS
  async getShipmentStatus(trackingNumber) {
    return await this.getTrackAndTraceInfo(trackingNumber);
  }

  async cancelShipment(shipmentNumber) {
    return await this.deleteShipments([shipmentNumber]);
  }

  async testDHLConnection() {
    return await this.testCreateShipments();
  }
}

export default new DHLApiService();
