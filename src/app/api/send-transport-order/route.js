// src/app/api/send-transport-order/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import db from '@/database/db';

export async function POST(request) {
  try {
    // Pobierz token z ciasteczka
    const authToken = request.cookies.get('authToken')?.value;
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Weryfikacja sesji
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sesja wygasła lub jest nieprawidłowa' 
      }, { status: 401 });
    }
    
    const userId = session.user_id;
    
    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('*')
      .first();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Nie znaleziono użytkownika'
      }, { status: 404 });
    }
    
    // Sprawdź uprawnienia
    let permissions = {};
    try {
      if (user.permissions && typeof user.permissions === 'string') {
        permissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Błąd parsowania uprawnień:', e);
    }
    
    // Sprawdź czy użytkownik ma uprawnienie do wysyłania zlecenia transportowego
    if (!permissions.spedycja?.canSendOrder && user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Brak uprawnień do wysyłania zleceń transportowych'
      }, { status: 403 });
    }
    
    // Pobierz dane z body
    const { 
      spedycjaId, 
      emailOdbiorcy, 
      towar, 
      terminPlatnosci, 
      waga, 
      dataZaladunku, 
      dataRozladunku 
    } = await request.json();
    
    if (!spedycjaId || !emailOdbiorcy) {
      return NextResponse.json({
        success: false,
        error: 'Brak wymaganych danych (spedycjaId, emailOdbiorcy)'
      }, { status: 400 });
    }
    
    // Pobierz dane spedycji
    let spedycja = await db('spedycje')
      .where('id', spedycjaId)
      .select('*')
      .first();
    
    if (!spedycja) {
      return NextResponse.json({
        success: false,
        error: 'Nie znaleziono zlecenia spedycji'
      }, { status: 404 });
    }
    
    // Parsuj dane dotyczące adresów
    let producerAddress = null;
    let delivery = null;
    
    try {
      if (spedycja.location_data) {
        producerAddress = JSON.parse(spedycja.location_data);
      }
      if (spedycja.delivery_data) {
        delivery = JSON.parse(spedycja.delivery_data);
      }
    } catch (error) {
      console.error('Błąd parsowania adresów:', error);
    }
    
    // Parsuj dane JSON
    let responseData = {};
    let mergedTransports = null;
    try {
      if (spedycja.response_data) {
        responseData = JSON.parse(spedycja.response_data);
      }
      if (spedycja.merged_transports) {
        mergedTransports = JSON.parse(spedycja.merged_transports);
      }
    } catch (error) {
      console.error('Błąd parsowania danych JSON:', error);
    }

    // NOWE: Sprawdź czy to transport dodatkowy - jeśli tak, pobierz dane głównego
    if (mergedTransports && mergedTransports.isSecondary && mergedTransports.mainTransportId) {
      console.log('Transport dodatkowy - pobieranie danych głównego transportu:', mergedTransports.mainTransportId);
      
      try {
        // Pobierz dane głównego transportu
        const mainTransport = await db('spedycje')
          .where('id', mergedTransports.mainTransportId)
          .select('*')
          .first();
        
        if (!mainTransport) {
          return NextResponse.json({
            success: false,
            error: 'Nie znaleziono głównego transportu dla tego zlecenia'
          }, { status: 404 });
        }
        
        // Zastąp dane obecnego transportu danymi głównego
        spedycja = mainTransport;
        
        // Parsuj dane głównego transportu
        responseData = {};
        mergedTransports = null;
        
        if (mainTransport.response_data) {
          responseData = JSON.parse(mainTransport.response_data);
        }
        if (mainTransport.merged_transports) {
          mergedTransports = JSON.parse(mainTransport.merged_transports);
        }
        
        // Parsuj też adresy głównego transportu
        if (mainTransport.location_data) {
          producerAddress = JSON.parse(mainTransport.location_data);
        }
        if (mainTransport.delivery_data) {
          delivery = JSON.parse(mainTransport.delivery_data);
        }
        
        console.log('Użyto danych głównego transportu:', mainTransport.id);
      } catch (error) {
        console.error('Błąd pobierania głównego transportu:', error);
        return NextResponse.json({
          success: false,
          error: 'Błąd pobierania danych głównego transportu: ' + error.message
        }, { status: 500 });
      }
    }
    
    // Sprawdź czy transport jest połączony
    const isMerged = responseData.isMerged || false;
    
    // Tworzenie HTML zamówienia
    const htmlContent = generateTransportOrderHTML({
      spedycja,
      producerAddress,
      delivery,
      responseData,
      mergedTransports,
      user,
      orderData: {
        towar,
        terminPlatnosci,
        waga,
        dataZaladunku,
        dataRozladunku
      }
    });
    
    // Konfiguracja transportera mailowego
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: "logistyka@grupaeltron.pl",
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Przygotuj tytuł e-maila
    const emailTitle = `Zlecenie transportowe nr ${spedycja.order_number}`;
    
    // Wysyłanie maila
    const mailOptions = {
      from: `"System Transportowy" <logistyka@grupaeltron.pl>`,
      to: emailOdbiorcy,
      cc: user.email,
      subject: emailTitle,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // POPRAWIONE OBLICZANIE LICZBY TRANSPORTÓW
    const transportCount = mergedTransports?.originalTransports?.length 
      ? mergedTransports.originalTransports.length + 1  // +1 za główny transport
      : 1;
    
    // Zapisz informacje o wysłanym zleceniu
    await db('spedycje')
      .where('id', spedycjaId)
      .update({
        order_sent: true,
        order_sent_at: db.fn.now(),
        order_sent_by: userId,
        order_recipient: emailOdbiorcy,
        order_data: JSON.stringify({
          towar,
          terminPlatnosci,
          waga,
          dataZaladunku,
          dataRozladunku,
          isMerged,
          mergedTransportsCount: transportCount - 1 // Bez głównego transportu
        })
      });
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: isMerged 
        ? `Wysłano zlecenie dla transportu połączonego (${transportCount} tras)`
        : 'Wysłano zlecenie transportowe'
    });
  } catch (error) {
    console.error('Error sending transport order:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// FUNKCJA generująca HTML zamówienia (POPRAWIONA - uwzględnia wszystkie dane połączonych transportów)
function generateTransportOrderHTML({ spedycja, producerAddress, delivery, responseData, mergedTransports, user, orderData }) {
  const { towar, terminPlatnosci, waga, dataZaladunku, dataRozladunku } = orderData;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Nie podano';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Do ustalenia';
    return `${parseFloat(price).toFixed(2)} PLN`;
  };
  
  // Funkcja do formatowania adresu w ładnych linijkach
  const formatAddressNice = (address, pinLocation = null) => {
    if (!address) return 'Brak danych';
    
    let formattedLines = [];
    
    // Linia 1: Miejscowość, kod pocztowy
    if (address.city || address.postalCode) {
      formattedLines.push(`${address.city || ''}, ${address.postalCode || ''}`.replace(/^,\s*|,\s*$/, ''));
    }
    
    // Linia 2: Ulica i numer budynku
    if (address.street) {
      formattedLines.push(address.street);
    }
    
    // Linia 3: Pineska (jeśli jest)
    if (pinLocation) {
      formattedLines.push(`Pineska: ${pinLocation}`);
    }
    
    return formattedLines.join('<br>');
  };

  // POPRAWIONA FUNKCJA do zbierania wszystkich numerów zleceń
  const getAllOrderNumbers = () => {
    const orderNumbers = [spedycja.order_number || spedycja.id];
    
    // TYLKO sprawdź merged_transports (to jedyne źródło danych o połączonych transportach)
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        const orderNum = transport.orderNumber || transport.order_number || transport.id;
        if (orderNum && !orderNumbers.includes(orderNum)) {
          orderNumbers.push(orderNum);
        }
      });
    }
    
    return orderNumbers.filter(Boolean);
  };
  
  // POPRAWIONA FUNKCJA do zbierania wszystkich MPK
  const getAllMPKs = () => {
    const mpks = [];
    
    // Dodaj MPK głównego transportu
    if (spedycja.mpk) {
      mpks.push(spedycja.mpk);
    }
    
    // TYLKO sprawdź merged_transports (to jedyne źródło danych o połączonych transportach)
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.mpk && !mpks.includes(transport.mpk)) {
          mpks.push(transport.mpk);
        }
      });
    }
    
    return mpks.filter(Boolean);
  };
  
  // POPRAWIONA FUNKCJA do zbierania wszystkich dokumentów
  const getAllDocuments = () => {
    const documents = [];
    
    // Dodaj dokumenty głównego transportu
    if (spedycja.documents) {
      documents.push(spedycja.documents);
    }
    
    // TYLKO sprawdź merged_transports (to jedyne źródło danych o połączonych transportach)
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.documents && !documents.includes(transport.documents)) {
          documents.push(transport.documents);
        }
      });
    }
    
    return documents.filter(Boolean);
  };

  // POPRAWIONA FUNKCJA do zbierania wszystkich klientów
  const getAllClients = () => {
    const clients = [];
    
    // Dodaj klienta głównego transportu
    if (spedycja.client_name) {
      clients.push({
        name: spedycja.client_name,
        mpk: spedycja.mpk || '',
        orderNumber: spedycja.order_number || spedycja.id
      });
    }
    
    // TYLKO sprawdź merged_transports (to jedyne źródło danych o połączonych transportach)
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.client_name || transport.clientName) {
          const clientName = transport.client_name || transport.clientName;
          if (!clients.some(c => c.name === clientName)) {
            clients.push({
              name: clientName,
              mpk: transport.mpk || '',
              orderNumber: transport.orderNumber || transport.order_number || transport.id
            });
          }
        }
      });
    }
    
    return clients.filter(c => c.name);
  };

  // POPRAWIONA FUNKCJA do obliczania całkowitej ceny
  const getTotalPrice = () => {
    if (responseData) {
      // Sprawdź różne pola gdzie może być cena
      if (responseData.totalDeliveryPrice && responseData.totalDeliveryPrice > 0) {
        return responseData.totalDeliveryPrice;
      }
      if (responseData.deliveryPrice && responseData.deliveryPrice > 0) {
        return responseData.deliveryPrice;
      }
    }
    
    // Sprawdź w merged_transports
    if (mergedTransports && mergedTransports.totalMergedCost && mergedTransports.totalMergedCost > 0) {
      return mergedTransports.totalMergedCost;
    }
    
    return 0;
  };
  
  // POPRAWIONA FUNKCJA do obliczania całkowitej odległości
  const getTotalDistance = () => {
    // Sprawdź response_data dla rzeczywistej odległości trasy
    if (responseData) {
      if (responseData.realRouteDistance && responseData.realRouteDistance > 0) {
        return responseData.realRouteDistance;
      }
      if (responseData.totalDistance && responseData.totalDistance > 0) {
        return responseData.totalDistance;
      }
      if (responseData.distance && responseData.distance > 0) {
        return responseData.distance;
      }
    }
    
    // Sprawdź w merged_transports
    if (mergedTransports && mergedTransports.totalDistance && mergedTransports.totalDistance > 0) {
      return mergedTransports.totalDistance;
    }
    
    // Fallback - suma odległości podstawowych
    let totalDistance = spedycja.distance_km || 0;
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        totalDistance += transport.distance_km || transport.distanceKm || 0;
      });
    }
    
    return totalDistance || 'Do ustalenia';
  };
  
  // POPRAWIONA FUNKCJA do generowania sekwencji trasy
  const generateRouteSequence = () => {
    const sequence = [];
    
    // Sprawdź czy mamy route points z response_data
    if (responseData && responseData.routePoints && Array.isArray(responseData.routePoints)) {
      responseData.routePoints.forEach((point, index) => {
        sequence.push({
          type: point.type === 'loading' ? 'ZAŁADUNEK' : 'ROZŁADUNEK',
          companyName: point.companyName || point.client_name || `Punkt ${index + 1}`,
          address: point.address || 'Brak adresu',
          date: point.type === 'loading' ? dataZaladunku : dataRozladunku,
          contact: point.contact || 'Brak kontaktu',
          mpk: point.mpk || '',
          orderNumber: point.orderNumber || ''
        });
      });
      return sequence;
    }
    
    // Fallback - dodaj główny załadunek
    let loadingAddress = 'Nie podano adresu';
    let loadingCompany = 'Nie podano firmy';
    
    if (producerAddress) {
      loadingAddress = `${producerAddress.city || ''}, ${producerAddress.postalCode || ''}, ${producerAddress.street || ''}`.replace(/^,\s*|,\s*$/g, '');
      loadingCompany = producerAddress.companyName || producerAddress.company || 'Nie podano';
    } else if (spedycja.location) {
      loadingCompany = spedycja.location;
      if (spedycja.location.includes('Białystok')) {
        loadingAddress = 'ul. Wysockiego 69B, 15-169 Białystok';
      } else if (spedycja.location.includes('Zielonka')) {
        loadingAddress = 'ul. Krótka 2, 05-220 Zielonka';
      }
    }
    
    sequence.push({
      type: 'ZAŁADUNEK',
      companyName: loadingCompany,
      address: loadingAddress,
      date: dataZaladunku,
      contact: spedycja.loading_contact || 'Brak kontaktu',
      mpk: spedycja.mpk || '',
      orderNumber: spedycja.order_number || ''
    });
    
    // Dodaj wszystkie rozładunki z połączonych transportów
    const allClients = getAllClients();
    allClients.forEach((client, index) => {
      let unloadingAddress = 'Nie podano adresu';
      let unloadingContact = 'Brak kontaktu';
      
      // Próbuj znaleźć adres dla tego klienta
      if (index === 0 && delivery) {
        // Główny transport
        unloadingAddress = `${delivery.city || ''}, ${delivery.postalCode || ''}, ${delivery.street || ''}`.replace(/^,\s*|,\s*$/g, '');
        unloadingContact = spedycja.unloading_contact || 'Brak kontaktu';
      } else {
        // Połączone transporty - szukaj w danych
        if (mergedTransports && mergedTransports.originalTransports) {
          const transportData = mergedTransports.originalTransports.find(t => 
            (t.client_name === client.name || t.clientName === client.name)
          );
          if (transportData && transportData.delivery_data) {
            try {
              const deliveryData = typeof transportData.delivery_data === 'string' 
                ? JSON.parse(transportData.delivery_data) 
                : transportData.delivery_data;
              unloadingAddress = `${deliveryData.city || ''}, ${deliveryData.postalCode || ''}, ${deliveryData.street || ''}`.replace(/^,\s*|,\s*$/g, '');
            } catch (e) {
              console.error('Błąd parsowania delivery_data:', e);
            }
            unloadingContact = transportData.unloading_contact || 'Brak kontaktu';
          }
        }
      }
      
      sequence.push({
        type: 'ROZŁADUNEK',
        companyName: client.name,
        address: unloadingAddress,
        date: dataRozladunku,
        contact: unloadingContact,
        mpk: client.mpk,
        orderNumber: client.orderNumber
      });
    });
    
    return sequence;
  };
  
  // POPRAWIONA FUNKCJA obliczania liczby transportów
  const getTransportCount = () => {
    // TYLKO sprawdź merged_transports (to jedyne źródło danych o liczbie połączonych transportów)
    if (mergedTransports?.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      return mergedTransports.originalTransports.length + 1; // +1 za główny transport
    }
    return 1;
  };
  
  const allOrderNumbers = getAllOrderNumbers();
  const allMPKs = getAllMPKs();
  const allDocuments = getAllDocuments();
  const allClients = getAllClients();
  const totalPrice = getTotalPrice();
  const totalDistance = getTotalDistance();
  const routeSequence = generateRouteSequence();
  const transportCount = getTransportCount();
  
  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zlecenie Transportowe</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.4;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .header {
          background: linear-gradient(135deg, #1a71b5, #0056b3);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin-bottom: 0;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .important-note {
          background-color: #fff3cd;
          border: 2px solid #856404;
          padding: 15px;
          margin: 0;
          font-weight: bold;
          color: #856404;
        }
        .important-warning {
          background-color: #f8d7da;
          border: 2px solid #dc3545;
          padding: 15px;
          margin: 0;
          font-weight: bold;
          color: #721c24;
        }
        .section {
          background-color: white;
          margin: 0;
          padding: 20px;
          border-bottom: 1px solid #dee2e6;
        }
        .section h2 {
          color: #1a71b5;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 20px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 8px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .info-table th {
          background-color: #f8f9fa;
          text-align: left;
          padding: 12px;
          border: 1px solid #dee2e6;
          font-weight: bold;
          color: #495057;
          width: 30%;
        }
        .info-table td {
          padding: 12px;
          border: 1px solid #dee2e6;
          background-color: white;
        }
        .clients-section {
          background-color: #e7f3ff;
          border: 2px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .client-item {
          margin-bottom: 10px;
          padding: 10px;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #1a71b5;
        }
        .route-item {
          margin-bottom: 20px;
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          border-left: 5px solid #1a71b5;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .route-type {
          font-size: 18px;
          font-weight: bold;
          color: #1a71b5;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .route-company {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }
        .route-address {
          font-size: 14px;
          color: #555;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .route-details {
          font-size: 13px;
          color: #666;
        }
        .route-details div {
          margin-bottom: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          border-radius: 0 0 8px 8px;
          font-size: 12px;
          color: #666;
        }
        .merged-info {
          background-color: #e7f3ff;
          border: 2px solid #0066cc;
          padding: 15px;
          margin: 0;
          color: #003d7a;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ZLECENIE TRANSPORTOWE</h1>
        <p>Numery zleceń: ${allOrderNumbers.join(', ')} | Data utworzenia: ${formatDate(new Date().toISOString())}</p>
      </div>
      
      <div class="important-note">
        Proszę o dopisanie na fakturze zamieszczonych poniżej numerów zleceń: ${allOrderNumbers.join(', ')}.
      </div>
      
      <div class="important-warning">
        <strong>UWAGA!</strong> Na fakturze musi być podany numer zlecenia: ${allOrderNumbers.join(', ')}. 
        Faktury bez numeru zlecenia nie będą opłacane.
      </div>
      
      ${transportCount > 1 ? `
      <div class="merged-info">
        <strong>TRANSPORT ŁĄCZONY</strong><br>
        To zlecenie obejmuje ${transportCount} połączonych transportów w jednej trasie.
      </div>
      ` : ''}
      
      ${allClients.length > 1 ? `
      <div class="clients-section">
        <h3>Lista wszystkich klientów w tym transporcie:</h3>
        ${allClients.map(client => `
          <div class="client-item">
            <strong>${client.name}</strong> ${client.mpk ? `(MPK: ${client.mpk})` : ''} ${client.orderNumber ? `[Zlecenie: ${client.orderNumber}]` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="section">
        <h2>Informacje o transporcie</h2>
        <table class="info-table">
          <tr>
            <th>Rodzaj towaru:</th>
            <td>${towar || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Waga towaru:</th>
            <td>${waga || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Łączna odległość:</th>
            <td>${totalDistance} km</td>
          </tr>
          <tr>
            <th>Wszystkie MPK:</th>
            <td>${allMPKs.join(', ') || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Wszystkie dokumenty:</th>
            <td>${allDocuments.join(', ') || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Liczba klientów:</th>
            <td>${allClients.length}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Sekwencja trasy</h2>
        ${routeSequence.map((point, index) => `
          <div class="route-item">
            <div class="route-type">${index + 1}. ${point.type}</div>
            <div class="route-company">${point.companyName}</div>
            <div class="route-address">${point.address}</div>
            <div class="route-details">
              <div><strong>Data ${point.type.toLowerCase()}:</strong> ${formatDate(point.date)}</div>
              <div><strong>Kontakt:</strong> ${point.contact}</div>
              ${point.mpk ? `<div><strong>MPK:</strong> ${point.mpk}</div>` : ''}
              ${point.orderNumber ? `<div><strong>Nr zlecenia:</strong> ${point.orderNumber}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Dane przewoźnika</h2>
        <table class="info-table">
          <tr>
            <th>Przewoźnik:</th>
            <td>${responseData.driverName || ''} ${responseData.driverSurname || ''}</td>
          </tr>
          <tr>
            <th>Numer rejestracyjny:</th>
            <td>${responseData.vehicleNumber || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Telefon do kierowcy:</th>
            <td>${responseData.driverPhone || 'Nie podano'}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Płatność</h2>
        <table class="info-table">
          <tr>
            <th>Całkowita cena transportu:</th>
            <td>${formatPrice(totalPrice)}</td>
          </tr>
          <tr>
            <th>Termin płatności:</th>
            <td>${terminPlatnosci || 'Nie podano'}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Uwagi</h2>
        <p>${spedycja.notes || 'Brak uwag'}</p>
        ${responseData.adminNotes ? 
          `<p><strong>Uwagi przewoźnika:</strong> ${responseData.adminNotes}</p>` : ''}
      </div>
      
      <div class="section">
        <h2>Adres do wysyłki faktur i dokumentów</h2>
        <p>
          Grupa Eltron Sp. z o.o.<br>
          ul. Główna 7<br>
          18-100 Łapy<br>
          tel. 85 715 27 05<br>
          NIP: 9662112843<br>
          ksiegowosc@grupaeltron.pl
        </p>
      </div>
      
      <div class="footer">
        <p>Zlecenie wygenerowane automatycznie przez System Transportowy | Data: ${formatDate(new Date().toISOString())}</p>
        <p>Użytkownik: ${user.name || user.email} | Transport ${transportCount > 1 ? 'łączony' : 'pojedynczy'}</p>
      </div>
    </body>
    </html>
  `;
}