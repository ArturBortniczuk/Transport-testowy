// src/app/api/send-transport-order/route.js
import { NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
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
    
    // Pobierz dane z żądania - UPROSZCZONE, bez additionalPlaces
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
    
    // Zapisz informacje o wysłanym zleceniu - UPROSZCZONE
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
          mergedTransportsCount: mergedTransports?.originalTransports?.length || 0
        })
      });
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: isMerged 
        ? `Wysłano zlecenie dla transportu połączonego (${mergedTransports?.originalTransports?.length + 1} tras)`
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

// ZAKTUALIZOWANA FUNKCJA generująca HTML zamówienia
function generateTransportOrderHTML({ spedycja, producerAddress, delivery, responseData, mergedTransports, user, orderData }) {
  const { towar, terminPlatnosci, waga, dataZaladunku, dataRozladunku } = orderData;
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // NOWA FUNKCJA do zbierania wszystkich numerów zleceń
  const getAllOrderNumbers = () => {
    const orderNumbers = [spedycja.order_number || spedycja.id]; // Główne zlecenie
    
    if (mergedTransports && mergedTransports.originalTransports) {
      mergedTransports.originalTransports.forEach(transport => {
        const orderNum = transport.order_number || transport.orderNumber || transport.id;
        if (orderNum && !orderNumbers.includes(orderNum)) {
          orderNumbers.push(orderNum);
        }
      });
    }
    
    return orderNumbers.filter(Boolean);
  };
  
  // Funkcja do zbierania wszystkich MPK
  const getAllMPKs = () => {
    const mpks = [spedycja.mpk]; // Główny MPK
    
    if (mergedTransports && mergedTransports.originalTransports) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.mpk && !mpks.includes(transport.mpk)) {
          mpks.push(transport.mpk);
        }
      });
    }
    
    return mpks.filter(Boolean); // Usuń puste wartości
  };
  
  // Funkcja do zbierania wszystkich dokumentów
  const getAllDocuments = () => {
    const documents = [];
    
    // Główny transport
    if (spedycja.documents) {
      documents.push(spedycja.documents);
    }
    
    // Połączone transporty
    if (mergedTransports && mergedTransports.originalTransports) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.documents && !documents.includes(transport.documents)) {
          documents.push(transport.documents);
        }
      });
    }
    
    return documents.filter(Boolean);
  };
  
  // Funkcja do zbierania wszystkich miejsc załadunku
  const getAllLoadingPlaces = () => {
    const places = [];
    
    // Jeśli mamy routeSequence, użyj jej do generowania miejsc załadunku
    if (responseData.routeSequence && responseData.routeSequence.length > 0) {
      const loadingPoints = responseData.routeSequence.filter(point => point.type === 'loading');
      
      loadingPoints.forEach((point, index) => {
        places.push({
          address: `${point.city || 'Brak miejscowości'}, ${point.postalCode || 'Brak kodu'}<br>${point.address || 'Brak adresu'}<br>${point.company || 'Brak nazwy firmy'}`,
          contact: point.contact || 'Brak kontaktu',
          date: dataZaladunku
        });
      });
      
      return places;
    }
    
    // Fallback - stary sposób dla pojedynczych transportów
    // Główne miejsce załadunku
    if (spedycja.location === 'Odbiory własne' && producerAddress) {
      places.push({
        address: formatAddressNice(producerAddress, producerAddress.pinLocation),
        contact: spedycja.loading_contact,
        date: dataZaladunku
      });
    } else if (spedycja.location === 'Magazyn Białystok') {
      places.push({
        address: 'Białystok, 15-169<br>ul. Wysockiego 69B<br>Grupa Eltron Sp z o.o',
        contact: spedycja.loading_contact,
        date: dataZaladunku
      });
    } else if (spedycja.location === 'Magazyn Zielonka') {
      places.push({
        address: 'Zielonka, 05-220<br>ul. Krótka 2<br>Grupa Eltron Sp z o.o',
        contact: spedycja.loading_contact,
        date: dataZaladunku
      });
    } else if (spedycja.location === 'Odbiory własne' && spedycja.producerAddress) {
      const addr = spedycja.producerAddress;
      places.push({
        address: `${addr.city}, ${addr.postalCode}<br>${addr.street}<br>${spedycja.sourceClientName || 'Klient'}`,
        contact: spedycja.loading_contact,
        date: dataZaladunku
      });
    } else {
      places.push({
        address: spedycja.location || 'Brak danych',
        contact: spedycja.loading_contact,
        date: dataZaladunku
      });
    }
    
    // Dodatkowe miejsca załadunku z połączonych transportów (stary sposób)
    if (mergedTransports && mergedTransports.originalTransports && responseData.routeConfiguration) {
      mergedTransports.originalTransports.forEach(transport => {
        const config = responseData.routeConfiguration[transport.id];
        
        if (config && config.useLoading === true) {
          let address = '';
          if (transport.location === 'Odbiory własne') {
            try {
              const locationData = typeof transport.location_data === 'string' ? 
                JSON.parse(transport.location_data) : transport.location_data;
              address = formatAddressNice(locationData, locationData.pinLocation);
            } catch (error) {
              address = 'Odbiory własne';
            }
          } else if (transport.location === 'Magazyn Białystok') {
            address = 'Białystok, 15-169<br>ul. Wysockiego 69B<br>Grupa Eltron Sp z o.o';
          } else if (transport.location === 'Magazyn Zielonka') {
            address = 'Zielonka, 05-220<br>ul. Krótka 2<br>Grupa Eltron Sp z o.o';
          } else if (transport.location === 'Odbiory własne') {
            try {
              const locationData = typeof transport.location_data === 'string' ? 
                JSON.parse(transport.location_data) : transport.location_data;
              address = `${locationData.city}, ${locationData.postalCode}<br>${locationData.street}<br>${transport.sourceClientName || 'Klient'}`;
            } catch (error) {
              address = transport.sourceClientName || 'Odbiory własne';
            }
          } else {
            address = transport.location;
          }
          
          places.push({
            address: address,
            contact: transport.loading_contact,
            date: dataZaladunku
          });
        }
      });
    }
    
    return places;
  };
  
  // Funkcja do zbierania wszystkich miejsc rozładunku
  const getAllUnloadingPlaces = () => {
    const places = [];
    
    // Jeśli mamy routeSequence, użyj jej do generowania miejsc rozładunku
    if (responseData.routeSequence && responseData.routeSequence.length > 0) {
      const unloadingPoints = responseData.routeSequence.filter(point => point.type === 'unloading');
      
      unloadingPoints.forEach((point, index) => {
        places.push({
          address: `${point.city || 'Brak miejscowości'}, ${point.postalCode || 'Brak kodu'}<br>${point.address || 'Brak adresu'}<br>${point.company || 'Brak nazwy firmy'}`,
          contact: point.contact || 'Brak kontaktu',
          date: dataRozladunku
        });
      });
      
      return places;
    }
    
    // Fallback - stary sposób dla pojedynczych transportów
    // Główne miejsce rozładunku
    places.push({
      address: formatAddressNice(delivery, delivery.pinLocation),
      contact: spedycja.unloading_contact,
      date: dataRozladunku
    });
    
    // Dodatkowe miejsca rozładunku z połączonych transportów (stary sposób)
    if (mergedTransports && mergedTransports.originalTransports && responseData.routeConfiguration) {
      mergedTransports.originalTransports.forEach(transport => {
        const config = responseData.routeConfiguration[transport.id];
        
        if (config && config.useUnloading === true) {
          try {
            const deliveryData = typeof transport.delivery_data === 'string' ? 
              JSON.parse(transport.delivery_data) : transport.delivery_data;
            
            places.push({
              address: formatAddressNice(deliveryData, deliveryData.pinLocation),
              contact: transport.unloading_contact,
              date: dataRozladunku
            });
          } catch (error) {
            places.push({
              address: 'Brak danych',
              contact: transport.unloading_contact || '',
              date: dataRozladunku
            });
          }
        }
      });
    }
    
    return places;
  };

  // NOWA FUNKCJA do tworzenia sekwencji trasy
  const getRouteSequence = () => {
    const sequence = [];
    const loadingPlaces = getAllLoadingPlaces();
    const unloadingPlaces = getAllUnloadingPlaces();
    
    // Dodaj wszystkie punkty załadunku
    loadingPlaces.forEach((place, index) => {
      // Wyciągnij nazwę firmy z adresu (ostatnia linia po <br>)
      const addressParts = place.address.split('<br>');
      const companyName = addressParts.length > 2 ? addressParts[addressParts.length - 1] : 'Firma';
      const addressOnly = addressParts.slice(0, -1).join('<br>');
      
      sequence.push({
        type: 'ZAŁADUNEK',
        companyName,
        address: addressOnly,
        contact: place.contact || 'Nie podano',
        date: place.date
      });
    });
    
    // Dodaj wszystkie punkty rozładunku
    unloadingPlaces.forEach((place, index) => {
      // Wyciągnij nazwę firmy z adresu (ostatnia linia po <br>)
      const addressParts = place.address.split('<br>');
      const companyName = addressParts.length > 2 ? addressParts[addressParts.length - 1] : 'Odbiorca';
      const addressOnly = addressParts.slice(0, -1).join('<br>');
      
      sequence.push({
        type: 'ROZŁADUNEK',
        companyName,
        address: addressOnly,
        contact: place.contact || 'Nie podano',
        date: place.date
      });
    });
    
    return sequence;
  };

  // NOWA FUNKCJA do obliczania całkowitej ceny transportu
  const getTotalTransportPrice = () => {
    let totalPrice = 0;
    
    // Cena głównego transportu
    if (responseData.deliveryPrice) {
      totalPrice += parseFloat(responseData.deliveryPrice);
    }
    
    // Ceny z połączonych transportów
    if (mergedTransports && mergedTransports.originalTransports) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.response_data) {
          try {
            const transportResponse = typeof transport.response_data === 'string' 
              ? JSON.parse(transport.response_data) 
              : transport.response_data;
            
            if (transportResponse.deliveryPrice) {
              totalPrice += parseFloat(transportResponse.deliveryPrice);
            }
          } catch (error) {
            console.error('Error parsing transport response data:', error);
          }
        }
      });
    }
    
    return totalPrice > 0 ? totalPrice.toFixed(2) : null;
  };
  
  // Formatowanie ceny z dopiskiem "Netto"
  const formatPrice = (price) => {
    if (!price) return 'Nie podano';
    return `${price} PLN Netto`;
  };
  
  const allOrderNumbers = getAllOrderNumbers();
  const allMPKs = getAllMPKs();
  const allDocuments = getAllDocuments();
  const loadingPlaces = getAllLoadingPlaces();
  const unloadingPlaces = getAllUnloadingPlaces();
  const routeSequence = getRouteSequence();
  const totalPrice = getTotalTransportPrice();
  
  // Tworzenie HTML-a
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
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1a71b5;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #1a71b5;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          margin-top: 0;
        }
        .section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        .section h2 {
          margin-top: 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          color: #1a71b5;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table th {
          text-align: left;
          background-color: #eee;
          padding: 8px;
          width: 40%;
        }
        .info-table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #777;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .important-note {
          background-color: #f2f9ff;
          border-left: 4px solid #1a71b5;
          padding: 10px 15px;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .important-warning {
          background-color: #fff2f2;
          border-left: 4px solid #e74c3c;
          margin: 20px 0;
          padding: 15px;
          border-radius: 5px;
          font-weight: bold;
          color: #c0392b;
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
      
      <div class="section">
        <h2>Dane podstawowe</h2>
        <table class="info-table">
          <tr>
            <th>Numery MPK:</th>
            <td>${allMPKs.join(', ')}</td>
          </tr>
          <tr>
            <th>Dokumenty:</th>
            <td>${allDocuments.join(', ')}</td>
          </tr>
          <tr>
            <th>Rodzaj towaru:</th>
            <td>${towar || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Waga towaru:</th>
            <td>${waga || 'Nie podano'}</td>
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
              <div><strong>Data ${point.type.toLowerCase()}:</strong> ${formatDate(point.date) || 'Nie podano'}</div>
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
            <td>${totalPrice ? formatPrice(totalPrice) : (responseData.deliveryPrice ? formatPrice(responseData.deliveryPrice) : 'Nie podano')}</td>
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
        <p>Zlecenie wygenerowane automatycznie.</p>
      </div>
    </body>
    </html>
  `;
}