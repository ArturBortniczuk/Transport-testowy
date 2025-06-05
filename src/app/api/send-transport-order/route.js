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
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: "logistyka@grupaeltron.pl",
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Przygotuj tytuł e-maila
    const emailTitle = isMerged 
      ? `Zlecenie transportowe nr ${spedycja.order_number} (${mergedTransports?.originalTransports?.length + 1 || 1} tras)`
      : `Zlecenie transportowe nr ${spedycja.order_number}`;
    
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
  
  const formatAddress = (address) => {
    if (!address) return 'Brak danych';
    return `${address.city || ''}, ${address.postalCode || ''}, ${address.street || ''}`;
  };
  
  const getLoadingLocation = () => {
    if (spedycja.location === 'Odbiory własne' && producerAddress) {
      return formatAddress(producerAddress);
    } else if (spedycja.location === 'Magazyn Białystok') {
      return 'Grupa Eltron Sp z o.o, ul. Wysockiego 69B, 15-169 Białystok';
    } else if (spedycja.location === 'Magazyn Zielonka') {
      return 'Grupa Eltron Sp z o.o, ul. Krótka 2, 05-220 Zielonka';
    }
    return spedycja.location || 'Brak danych';
  };
  
  // Formatowanie ceny z dopiskiem "Netto"
  const formatPrice = (price) => {
    if (!price) return 'Nie podano';
    return `${price} PLN Netto`;
  };
  
  // NOWA FUNKCJA: Generowanie sekcji dla połączonych transportów
  const generateMergedTransportsHTML = () => {
    if (!mergedTransports || !mergedTransports.originalTransports || mergedTransports.originalTransports.length === 0) {
      return '';
    }
    
    let html = '';
    
    // Nagłówek dla połączonych transportów
    html += `
    <div class="section">
      <h2>Transport połączony - dodatkowe trasy (${mergedTransports.originalTransports.length})</h2>
      <div class="important-info">
        <strong>Uwaga:</strong> To zlecenie obejmuje ${mergedTransports.originalTransports.length + 1} tras w ramach jednego transportu.
        Koszt został odpowiednio podzielony między poszczególne MPK.
      </div>
    `;
    
    // Dodaj informacje o każdej dodatkowej trasie
    mergedTransports.originalTransports.forEach((transport, index) => {
      html += `
      <div style="margin: 15px 0; padding: 10px; border-left: 3px solid #1a71b5; background-color: #f9f9f9;">
        <h3 style="margin-top: 0; color: #1a71b5;">Dodatkowa trasa ${index + 1}</h3>
        <table class="info-table">
          <tr>
            <th>Numer zlecenia:</th>
            <td>${transport.orderNumber}</td>
          </tr>
          <tr>
            <th>MPK:</th>
            <td>${transport.mpk}</td>
          </tr>
          <tr>
            <th>Trasa:</th>
            <td>${transport.route}</td>
          </tr>
          <tr>
            <th>Osoba odpowiedzialna:</th>
            <td>${transport.responsiblePerson || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Przydzielony koszt:</th>
            <td>${formatPrice(transport.costAssigned)}</td>
          </tr>
          <tr>
            <th>Dokumenty:</th>
            <td>${transport.documents || 'Nie podano'}</td>
          </tr>
        </table>
      </div>
      `;
    });
    
    html += `</div>`;
    
    return html;
  };
  
  // Ustal czy to transport połączony
  const isMerged = mergedTransports && mergedTransports.originalTransports && mergedTransports.originalTransports.length > 0;
  const totalTransports = isMerged ? mergedTransports.originalTransports.length + 1 : 1;
  
  // Tworzenie HTML-a
  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zlecenie Transportowe${isMerged ? ' - Transport Połączony' : ''}</title>
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
        .important-info {
          background-color: #f9f9f9;
          padding: 12px;
          border-radius: 5px;
          border-left: 4px solid #1a71b5;
          margin: 10px 0;
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
        .merged-transport-badge {
          background-color: #9b59b6;
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ZLECENIE TRANSPORTOWE${isMerged ? ` - POŁĄCZONE (${totalTransports} TRAS)` : ''}</h1>
        <p>Nr zlecenia: ${spedycja.order_number || spedycja.id} | Data utworzenia: ${formatDate(new Date().toISOString())}</p>
        ${isMerged ? '<span class="merged-transport-badge">TRANSPORT POŁĄCZONY</span>' : ''}
      </div>
      
      <div class="important-note">
        Proszę o dopisanie na fakturze zamieszczonego poniżej numeru MPK oraz numeru zlecenia: ${spedycja.order_number || spedycja.id}.
        ${isMerged ? ` Transport obejmuje ${totalTransports} tras z różnymi numerami MPK.` : ''}
      </div>
      
      <div class="important-warning">
        <strong>UWAGA!</strong> Na fakturze musi być podany numer zlecenia: ${spedycja.order_number || spedycja.id}. 
        Faktury bez numeru zlecenia nie będą opłacane.
        ${isMerged ? ' W przypadku transportu połączonego prosimy o wyszczególnienie kosztów według podanych MPK.' : ''}
      </div>
      
      <div class="section">
        <h2>Dane podstawowe</h2>
        <table class="info-table">
          <tr>
            <th>Numer MPK główny:</th>
            <td>${spedycja.mpk || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Dokumenty:</th>
            <td>${spedycja.documents || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Rodzaj towaru:</th>
            <td>${towar || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Waga towaru:</th>
            <td>${waga || 'Nie podano'}</td>
          </tr>
          ${isMerged ? `
          <tr>
            <th>Liczba tras:</th>
            <td>${totalTransports} (główna + ${mergedTransports.originalTransports.length} dodatkowych)</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div class="section">
        <h2>${isMerged ? 'Główne miejsce załadunku' : 'Dane załadunku'}</h2>
        <table class="info-table">
          <tr>
            <th>Miejsce załadunku:</th>
            <td>${getLoadingLocation()}</td>
          </tr>
          <tr>
            <th>Data załadunku:</th>
            <td>${formatDate(dataZaladunku) || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Kontakt do załadunku:</th>
            <td>${spedycja.loading_contact || 'Nie podano'}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>${isMerged ? 'Główne miejsce rozładunku' : 'Dane rozładunku'}</h2>
        <table class="info-table">
          <tr>
            <th>Miejsce rozładunku:</th>
            <td>${formatAddress(delivery)}</td>
          </tr>
          <tr>
            <th>Data rozładunku:</th>
            <td>${formatDate(dataRozladunku) || 'Nie podano'}</td>
          </tr>
          <tr>
            <th>Kontakt do rozładunku:</th>
            <td>${spedycja.unloading_contact || 'Nie podano'}</td>
          </tr>
        </table>
      </div>
      
      ${generateMergedTransportsHTML()}
      
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
            <th>Cena transportu całkowita:</th>
            <td>${responseData.deliveryPrice ? formatPrice(responseData.deliveryPrice) : 'Nie podano'}</td>
          </tr>
          ${isMerged && responseData.costBreakdown ? `
          <tr>
            <th>Podział kosztów:</th>
            <td>
              <div>Główny transport (MPK: ${spedycja.mpk}): ${formatPrice(responseData.costBreakdown.mainTransport?.cost || 0)}</div>
              ${responseData.costBreakdown.mergedTransports?.map(mt => 
                `<div>MPK: ${mt.mpk}: ${formatPrice(mt.cost)}</div>`
              ).join('') || ''}
            </td>
          </tr>
          ` : ''}
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
        ${isMerged ? `
        <div class="important-info">
          <strong>Uwaga dotycząca transportu połączonego:</strong><br>
          To zlecenie obejmuje ${totalTransports} tras realizowanych w ramach jednego transportu. 
          Koszty zostały podzielone zgodnie z powyższym zestawieniem. 
          Prosimy o wystawienie faktury z wyszczególnieniem kosztów według numerów MPK.
        </div>
        ` : ''}
      </div>
      
      <div class="section">
        <h2>Adres do wysyłki faktur i dokumentów</h2>
        <p class="important-info">
          Grupa Eltron Sp. z o.o.<br>
          ul. Główna 7<br>
          18-100 Łapy<br>
          tel. 85 715 27 05<br>
          NIP: 9662112843<br>
          ksiegowosc@grupaeltron.pl
        </p>
      </div>
      
      <div class="footer">
        <p>Zlecenie wygenerowane automatycznie${isMerged ? ' - Transport połączony' : ''}.</p>
        ${isMerged ? `<p><strong>Łączna liczba tras: ${totalTransports}</strong></p>` : ''}
      </div>
    </body>
    </html>
  `;
}
