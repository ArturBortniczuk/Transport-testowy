// src/app/api/send-transport-order/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  const session = await db('sessions')
    .where('token', authToken)
    .whereRaw('expires_at > NOW()')
    .select('user_id')
    .first();
  
  return session?.user_id;
};

// Funkcja generująca HTML dla zlecenia transportowego
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
    return parseFloat(price).toFixed(2) + ' PLN';
  };
  
  // Pobierz łączną odległość wszystkich transportów połączonych
  const getTotalDistance = () => {
    if (responseData.realRouteDistance && responseData.realRouteDistance > 0) {
      return responseData.realRouteDistance;
    }
    if (responseData.totalDistance && responseData.totalDistance > 0) {
      return responseData.totalDistance;
    }
    return spedycja.distance_km || 0;
  };

  // Zbierz wszystkie numery zleceń
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
  
  // Zbierz wszystkie MPK
  const getAllMPKs = () => {
    const mpks = [];
    
    if (spedycja.mpk) {
      mpks.push(spedycja.mpk);
    }
    
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.mpk && !mpks.includes(transport.mpk)) {
          mpks.push(transport.mpk);
        }
      });
    }
    
    return mpks;
  };
  
  // Zbierz wszystkie dokumenty
  const getAllDocuments = () => {
    const docs = [];
    
    if (spedycja.documents) {
      docs.push(spedycja.documents);
    }
    
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        if (transport.documents && !docs.includes(transport.documents)) {
          docs.push(transport.documents);
        }
      });
    }
    
    return docs;
  };
  
  // Przygotuj punkty trasy dla transportów łączonych
  const getRoutePoints = () => {
    const points = [];
    let pointNumber = 1;
    
    // Główny transport - załadunek
    points.push({
      number: pointNumber++,
      type: 'ZAŁADUNEK',
      companyName: spedycja.location || 'Nie podano',
      address: producerAddress ? 
        `${producerAddress.address || ''}, ${producerAddress.postalCode || ''} ${producerAddress.city || ''}` : 
        'Adres nie podany',
      date: dataZaladunku || spedycja.delivery_date
    });
    
    // Główny transport - rozładunek
    points.push({
      number: pointNumber++,
      type: 'ROZŁADUNEK',
      companyName: spedycja.client_name || delivery?.city || 'Nie podano',
      address: delivery ? 
        `${delivery.address || ''}, ${delivery.postalCode || ''} ${delivery.city || ''}` : 
        'Adres nie podany',
      date: dataRozladunku || spedycja.delivery_date
    });
    
    // Dodaj punkty z transportów łączonych
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      mergedTransports.originalTransports.forEach(transport => {
        // Załadunek
        points.push({
          number: pointNumber++,
          type: 'ZAŁADUNEK',
          companyName: transport.location || 'Nie podano',
          address: transport.location_data ? 
            `${transport.location_data.address || ''}, ${transport.location_data.postalCode || ''} ${transport.location_data.city || ''}` : 
            'Adres nie podany',
          date: transport.delivery_date
        });
        
        // Rozładunek
        points.push({
          number: pointNumber++,
          type: 'ROZŁADUNEK',  
          companyName: transport.clientName || transport.delivery_data?.city || 'Nie podano',
          address: transport.delivery_data ? 
            `${transport.delivery_data.address || ''}, ${transport.delivery_data.postalCode || ''} ${transport.delivery_data.city || ''}` : 
            'Adres nie podany',
          date: transport.delivery_date
        });
      });
    }
    
    return points;
  };

  const allOrderNumbers = getAllOrderNumbers();
  const allMPKs = getAllMPKs();
  const allDocuments = getAllDocuments();
  const totalDistance = getTotalDistance();
  const totalPrice = parseFloat(responseData.deliveryPrice || 0);
  const transportCount = mergedTransports?.originalTransports?.length ? mergedTransports.originalTransports.length + 1 : 1;
  const routePoints = getRoutePoints();
  
  // Generuj HTML punktów trasy
  let routePointsHtml = '';
  routePoints.forEach(point => {
    const bgColor = point.type === 'ZAŁADUNEK' ? '#28a745' : '#dc3545';
    routePointsHtml += `
      <div style="display: flex; align-items: flex-start; margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 10px;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background-color: ${bgColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; margin-right: 20px; flex-shrink: 0;">
          ${point.number}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: bold; color: #1a71b5; margin-bottom: 8px;">
            ${point.type}
          </div>
          <div style="font-size: 18px; font-weight: bold; color: #1a1a1a; margin-bottom: 8px;">
            ${point.companyName}
          </div>
          <div style="font-size: 14px; color: #555555; margin-bottom: 8px;">
            ${point.address}
          </div>
          <div style="font-size: 13px; color: #666666;">
            <strong>Data:</strong> ${formatDate(point.date)}
          </div>
        </div>
      </div>
    `;
  });
  
  // Generuj informację o transporcie łączonym
  let mergedInfoHtml = '';
  if (transportCount > 1) {
    mergedInfoHtml = `
      <div style="background-color: #e3f2fd; border: 3px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center;">
        <strong style="color: #0d47a1; font-size: 18px;">TRANSPORT ŁĄCZONY</strong><br>
        <span style="color: #0d47a1;">To zlecenie obejmuje ${transportCount} połączonych transportów w jednej trasie.</span><br>
        <span style="color: #0d47a1;">Łączna odległość wszystkich tras: <strong>${totalDistance} km</strong></span>
      </div>
    `;
  }
  
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zlecenie Transportowe</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #ffffff !important; }
      * { color: #1a1a1a !important; }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="background-color: #1a71b5; color: white; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 32px; color: white;">ZLECENIE TRANSPORTOWE</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">
      Numery zleceń: <strong>${allOrderNumbers.join(', ')}</strong> | 
      Data utworzenia: ${formatDate(new Date().toISOString())}
    </p>
  </div>
  
  <div style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin-bottom: 30px; border-radius: 10px;">
    <p style="margin: 0; font-size: 16px; color: #856404;">
      <strong>WAŻNE:</strong> Proszę o dopisanie na fakturze zamieszczonych poniżej numerów zleceń: 
      <strong>${allOrderNumbers.join(', ')}</strong>
    </p>
  </div>
  
  <div style="background-color: #f8d7da; border: 2px solid #dc3545; padding: 20px; margin-bottom: 30px; border-radius: 10px;">
    <p style="margin: 0; font-size: 16px; color: #721c24;">
      <strong>UWAGA!</strong> Na fakturze musi być podany numer zlecenia: <strong>${allOrderNumbers.join(', ')}</strong>. 
      Faktury bez numeru zlecenia nie będą opłacane.
    </p>
  </div>
  
  ${mergedInfoHtml}
  
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 24px; color: #1a71b5; border-bottom: 3px solid #e0e0e0; padding-bottom: 10px;">
      Informacje o transporcie
    </h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Rodzaj towaru:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${towar || 'Nie podano'}
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Waga towaru:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${waga || 'Nie podano'}
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Łączna odległość${transportCount > 1 ? ' wszystkich tras' : ''}:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          <strong>${totalDistance} km</strong>
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          MPK${allMPKs.length > 1 ? ' (wszystkie)' : ''}:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${allMPKs.join(', ') || 'Nie podano'}
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Dokumenty${allDocuments.length > 1 ? ' (wszystkie)' : ''}:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${allDocuments.join(', ') || 'Nie podano'}
        </td>
      </tr>
    </table>
  </div>
  
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 24px; color: #1a71b5; border-bottom: 3px solid #e0e0e0; padding-bottom: 10px;">
      Sekwencja trasy
    </h2>
    <div style="margin-top: 20px;">
      ${routePointsHtml}
    </div>
  </div>
  
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 24px; color: #1a71b5; border-bottom: 3px solid #e0e0e0; padding-bottom: 10px;">
      Dane przewoźnika
    </h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Przewoźnik:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${(responseData.driverName || '')} ${(responseData.driverSurname || '')}
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Numer rejestracyjny:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${responseData.vehicleNumber || 'Nie podano'}
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Telefon do kierowcy:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${responseData.driverPhone || 'Nie podano'}
        </td>
      </tr>
    </table>
  </div>
  
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 24px; color: #1a71b5; border-bottom: 3px solid #e0e0e0; padding-bottom: 10px;">
      Płatność
    </h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Całkowita cena transportu:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          <strong style="font-size: 18px; color: #28a745;">${formatPrice(totalPrice)}</strong>
        </td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 220px; border: 1px solid #dee2e6; color: #333333;">
          Termin płatności:
        </th>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #1a1a1a; background-color: #ffffff;">
          ${terminPlatnosci || 'Nie podano'}
        </td>
      </tr>
    </table>
  </div>
  
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 24px; color: #1a71b5; border-bottom: 3px solid #e0e0e0; padding-bottom: 10px;">
      Uwagi
    </h2>
    <p style="margin-top: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 10px; color: #1a1a1a;">
      ${spedycja.notes || 'Brak uwag'}
    </p>
    ${responseData.adminNotes ? `
      <p style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 10px;">
        <strong style="color: #856404;">Uwagi przewoźnika:</strong> 
        <span style="color: #1a1a1a;">${responseData.adminNotes}</span>
      </p>
    ` : ''}
  </div>
  
  <div style="margin-bottom: 30px; background-color: #e8f5e9; padding: 20px; border-radius: 10px;">
    <h2 style="font-size: 20px; color: #2e7d32; margin-bottom: 15px;">
      Adres do wysyłki faktur i dokumentów
    </h2>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
      <strong>Grupa Eltron Sp. z o.o.</strong><br>
      ul. Główna 7<br>
      18-100 Łapy<br>
      tel. 85 715 27 05<br>
      NIP: 9662112843<br>
      <a href="mailto:ksiegowosc@grupaeltron.pl" style="color: #1a71b5; text-decoration: none;">
        ksiegowosc@grupaeltron.pl
      </a>
    </p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 10px; margin-top: 30px;">
    <p style="margin: 0; font-size: 14px; color: #666666;">
      <strong>Zlecenie wygenerowane automatycznie przez System Transportowy</strong>
    </p>
    <p style="margin: 5px 0 0 0; font-size: 12px; color: #666666;">
      Data: ${formatDate(new Date().toISOString())} | 
      Użytkownik: ${user.name || user.email} | 
      Typ transportu: ${transportCount > 1 ? `Łączony (${transportCount} tras)` : 'Pojedynczy'}
    </p>
  </div>
  
</body>
</html>`;
}

// POST - Wysyłanie zlecenia transportowego emailem
export async function POST(request) {
  try {
    console.log('=== START POST /api/send-transport-order ===');
    
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Pobierz dane użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('email', 'name', 'role', 'is_admin')
      .first();
      
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Pobierz dane z żądania
    const { spedycjaId, towar, waga, dataZaladunku, dataRozladunku, terminPlatnosci, emailOdbiorcy } = await request.json();
    
    console.log('Otrzymane dane:', { spedycjaId, towar, waga, dataZaladunku, dataRozladunku, terminPlatnosci, emailOdbiorcy });
    
    // Pobierz szczegóły zlecenia spedycji
    const spedycja = await db('spedycje')
      .where('id', spedycjaId)
      .first();
      
    if (!spedycja) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie znaleziono zlecenia spedycji' 
      }, { status: 404 });
    }
    
    // Parsuj dane JSON
    let producerAddress = null;
    let delivery = null;
    let responseData = {};
    let mergedTransports = null;
    
    try {
      if (spedycja.location_data) {
        producerAddress = typeof spedycja.location_data === 'string' ? 
          JSON.parse(spedycja.location_data) : spedycja.location_data;
      }
      
      if (spedycja.delivery_data) {
        delivery = typeof spedycja.delivery_data === 'string' ? 
          JSON.parse(spedycja.delivery_data) : spedycja.delivery_data;
      }
      
      if (spedycja.response_data) {
        responseData = typeof spedycja.response_data === 'string' ? 
          JSON.parse(spedycja.response_data) : spedycja.response_data;
      }
      
      // Sprawdź czy to transport łączony
      if (spedycja.merged_transports) {
        mergedTransports = typeof spedycja.merged_transports === 'string' ? 
          JSON.parse(spedycja.merged_transports) : spedycja.merged_transports;
      }
    } catch (error) {
      console.error('Błąd parsowania danych JSON:', error);
    }
    
    // Generuj HTML zlecenia
    const htmlContent = generateTransportOrderHTML({
      spedycja,
      producerAddress,
      delivery,
      responseData,
      mergedTransports,
      user,
      orderData: { towar, waga, dataZaladunku, dataRozladunku, terminPlatnosci }
    });
    
    // Przygotuj listę odbiorców
    const recipients = [emailOdbiorcy];
    
    // Dodaj email przewoźnika jeśli jest dostępny
    if (responseData.driverEmail) {
      recipients.push(responseData.driverEmail);
    }
    
    // Dodaj kopię do nadawcy
    recipients.push(user.email);
    
    // Wyślij email przez Resend
    try {
      const emailResult = await resend.emails.send({
        from: 'System Transportowy <transport@grupaeltron.pl>',
        to: recipients,
        subject: `Zlecenie Transportowe - ${spedycja.order_number || spedycja.id}`,
        html: htmlContent,
        headers: {
          'X-Priority': '1',
          'Importance': 'High'
        }
      });
      
      console.log('Email wysłany pomyślnie:', emailResult);
      
      // Zaktualizuj status zlecenia spedycji
      await db('spedycje')
        .where('id', spedycjaId)
        .update({
          status: 'sent',
          order_sent_at: db.fn.now(),
          order_sent_by: userId,
          order_data: JSON.stringify({ towar, waga, dataZaladunku, dataRozladunku, terminPlatnosci })
        });
      
      return NextResponse.json({ 
        success: true,
        message: 'Zlecenie transportowe zostało wysłane pomyślnie',
        emailId: emailResult.id
      });
      
    } catch (emailError) {
      console.error('Błąd wysyłania emaila:', emailError);
      
      return NextResponse.json({ 
        success: false, 
        error: `Błąd wysyłania emaila: ${emailError.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in POST /api/send-transport-order:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: `Błąd serwera: ${error.message}`
    }, { status: 500 });
  }
}