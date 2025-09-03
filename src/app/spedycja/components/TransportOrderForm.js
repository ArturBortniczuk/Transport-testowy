// src/app/api/send-transport-order/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';  // ← POPRAWIONY IMPORT (usunąłem "* as")
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
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
    const canSendTransportOrder = isAdmin || permissions?.spedycja?.sendOrder === true;
    
    if (!canSendTransportOrder) {
      return NextResponse.json({
        success: false,
        error: 'Brak uprawnień do wysyłania zlecenia transportowego'
      }, { status: 403 });
    }
    
    // Pobierz dane z żądania
    const { 
      spedycjaId, 
      towar, 
      terminPlatnosci, 
      waga, 
      dataZaladunku, 
      dataRozladunku, 
      emailOdbiorcy,
      isMerged = false,
      mergedTransportsData = null
    } = await request.json();
    
    console.log('Wysyłanie zlecenia dla:', { spedycjaId, isMerged, mergedCount: mergedTransportsData?.originalTransports?.length || 0 });
    
    // Pobierz dane spedycji
    const spedycja = await db('spedycje')
      .where('id', spedycjaId)
      .select('*')
      .first();
    
    if (!spedycja) {
      return NextResponse.json({
        success: false,
        error: 'Nie znaleziono zlecenia spedycji'
      }, { status: 404 });
    }
    
    // Parsowanie danych JSON
    let producerAddress = {};
    let delivery = {};
    let responseData = {};
    let mergedTransports = null;
    
    try {
      if (spedycja.location_data) {
        producerAddress = JSON.parse(spedycja.location_data);
      }
      if (spedycja.delivery_data) {
        delivery = JSON.parse(spedycja.delivery_data);
      }
      if (spedycja.response_data) {
        responseData = JSON.parse(spedycja.response_data);
      }
      if (spedycja.merged_transports) {
        mergedTransports = JSON.parse(spedycja.merged_transports);
      }
    } catch (error) {
      console.error('Błąd parsowania danych JSON:', error);
    }
    
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
    
    // Konfiguracja transportera mailowego - POPRAWIONA FUNKCJA
    const transporter = nodemailer.createTransport({  // ← POPRAWIONE: createTransport zamiast createTransporter
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

// FUNKCJA generująca HTML zamówienia (bez zmian - pozostaje taka jak była)
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

  // FUNKCJA do zbierania wszystkich numerów zleceń
  const getAllOrderNumbers = () => {
    const orderNumbers = [spedycja.order_number || spedycja.id];
    
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
  
  // FUNKCJA do zbierania wszystkich MPK
  const getAllMPKs = () => {
    const mpks = [spedycja.mpk];
    
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.mpk && !mpks.includes(transport.mpk)) {
          mpks.push(transport.mpk);
        }
      });
    }
    
    return mpks.filter(Boolean);
  };
  
  // FUNKCJA do zbierania wszystkich dokumentów
  const getAllDocuments = () => {
    const documents = [];
    
    if (spedycja.documents) {
      documents.push(spedycja.documents);
    }
    
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.documents && !documents.includes(transport.documents)) {
          documents.push(transport.documents);
        }
      });
    }
    
    return documents.filter(Boolean);
  };
  
  // FUNKCJA do obliczania łącznej ceny
  const getTotalPrice = () => {
    return responseData.deliveryPrice || responseData.totalPrice || 0;
  };
  
  // FUNKCJA do obliczania łącznej odległości
  const getTotalDistance = () => {
    return responseData.realRouteDistance || 
           responseData.totalDistance || 
           spedycja.distance_km || 
           0;
  };
  
  // FUNKCJA do generowania sekwencji trasy
  const generateRouteSequence = () => {
    const sequence = [];
    
    // Punkt 1: Załadunek główny
    let loadingAddress = 'Nie podano adresu';
    let loadingCompany = 'Nie podano firmy';
    
    if (spedycja.location === 'Magazyn Białystok') {
      loadingAddress = 'Białystok, 15-169, ul. Wysockiego 69B';
      loadingCompany = 'Grupa Eltron Sp. z o.o.';
    } else if (spedycja.location === 'Magazyn Zielonka') {
      loadingAddress = 'Zielonka, 05-220, ul. Żeglarska 1';
      loadingCompany = 'Grupa Eltron Sp. z o.o.';
    } else if (spedycja.location === 'Odbiory własne' && producerAddress) {
      loadingAddress = formatAddressNice(producerAddress, producerAddress.pinLocation);
      loadingCompany = producerAddress.company || 'Nie podano';
    }
    
    sequence.push({
      type: 'ZAŁADUNEK',
      companyName: loadingCompany,
      address: loadingAddress,
      date: dataZaladunku,
      contact: spedycja.loading_contact || 'Brak kontaktu'
    });
    
    // Sprawdź czy mamy dane routePoints z połączonych transportów
    if (mergedTransports?.routePoints && Array.isArray(mergedTransports.routePoints)) {
      mergedTransports.routePoints.forEach(point => {
        if (point.type !== 'loading' || point.transportId !== 'main') {
          sequence.push({
            type: point.type === 'loading' ? 'ZAŁADUNEK' : 'ROZŁADUNEK',
            companyName: point.companyName || 'Nie podano',
            address: point.address || 'Brak adresu',
            date: point.type === 'loading' ? dataZaladunku : dataRozladunku,
            contact: point.contact || 'Brak kontaktu'
          });
        }
      });
    } else {
      // Fallback - dodaj główny rozładunek
      let unloadingAddress = 'Nie podano adresu';
      let unloadingCompany = 'Nie podano firmy';
      
      if (delivery) {
        unloadingAddress = `${delivery.city || ''}, ${delivery.postalCode || ''}, ${delivery.street || ''}`.replace(/^,\s*|,\s*$/g, '');
        unloadingCompany = delivery.companyName || delivery.company || 'Nie podano';
      }
      
      sequence.push({
        type: 'ROZŁADUNEK',
        companyName: unloadingCompany,
        address: unloadingAddress,
        date: dataRozladunku,
        contact: spedycja.unloading_contact || 'Brak kontaktu'
      });
    }
    
    return sequence;
  };
  
  // OBLICZANIE LICZBY TRANSPORTÓW
  const getTransportCount = () => {
    if (mergedTransports?.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      return mergedTransports.originalTransports.length + 1; // +1 za główny transport
    }
    return 1;
  };
  
  const allOrderNumbers = getAllOrderNumbers();
  const allMPKs = getAllMPKs();
  const allDocuments = getAllDocuments();
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
          background: linear-gradient(135deg, #1a71b5 0%, #0d5a9a 100%);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin-bottom: 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .important-note {
          background-color: #fff3cd;
          border: 2px solid #ffc107;
          padding: 15px;
          margin: 0;
          font-weight: bold;
          color: #856404;
          text-align: center;
        }
        .important-warning {
          background-color: #f8d7da;
          border: 2px solid #dc3545;
          padding: 15px;
          margin: 0;
          font-weight: bold;
          color: #721c24;
          text-align: center;
        }
        .section {
          background-color: white;
          padding: 20px;
          margin: 0;
          border-left: 4px solid #1a71b5;
        }
        .section h2 {
          color: #1a71b5;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 8px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .info-table th {
          text-align: left;
          padding: 8px;
          background-color: #f8f9fa;
          font-weight: bold;
          width: 200px;
        }
        .info-table td {
          padding: 8px;
          border-bottom: 1px solid #e9ecef;
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
          margin: 20px 0;
          border-radius: 5px;
          color: #003d7a;
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
            <th>MPK:</th>
            <td>${allMPKs.join(', ') || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Dokumenty:</th>
            <td>${allDocuments.join(', ') || 'Nie podano'}</td>
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
        ${responseData.adminNotes ? `<p><strong>Uwagi przewoźnika:</strong> ${responseData.adminNotes}</p>` : ''}
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