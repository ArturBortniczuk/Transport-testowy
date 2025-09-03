// UPROSZCZONA FUNKCJA generująca HTML zamówienia (bez emoji i skomplikowanych elementów)
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

  // Zbierz wszystkie numery zleceń (główny + połączone)
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
  
  // Zbierz wszystkie MPK (główny + połączone)
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
    
    return mpks.filter(Boolean);
  };
  
  // Zbierz wszystkie dokumenty (główny + połączone)
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
  
  // Generuj sekwencję trasy w punktach
  const generateRouteSequence = () => {
    const sequence = [];
    
    // Sprawdź czy mamy routePoints z responseData
    if (responseData.routePoints && Array.isArray(responseData.routePoints)) {
      responseData.routePoints.forEach((point, index) => {
        let pointType = point.type === 'loading' ? 'ZAŁADUNEK' : 'ROZŁADUNEK';
        let pointCompany = 'Nie podano firmy';
        let pointAddress = 'Nie podano adresu';
        
        if (point.description) {
          pointCompany = point.description;
        }
        
        if (point.address) {
          pointAddress = point.address;
        }
        
        sequence.push({
          number: index + 1,
          type: pointType,
          companyName: pointCompany,
          address: pointAddress,
          date: point.type === 'loading' ? dataZaladunku : dataRozladunku
        });
      });
      
      return sequence;
    }
    
    // Fallback: Podstawowa sekwencja
    let loadingAddress = 'Nie podano adresu';
    let loadingCompany = 'Nie podano firmy';
    
    if (spedycja.location === 'Magazyn Białystok') {
      loadingAddress = 'Białystok, 15-169, ul. Wysockiego 69B';
      loadingCompany = 'Grupa Eltron Sp. z o.o.';
    } else if (spedycja.location === 'Magazyn Zielonka') {
      loadingAddress = 'Zielonka, 05-220, ul. Żeglarska 1';
      loadingCompany = 'Grupa Eltron Sp. z o.o.';
    } else if (spedycja.location === 'Odbiory własne' && producerAddress) {
      loadingAddress = (producerAddress.city || '') + ', ' + (producerAddress.postalCode || '') + ', ' + (producerAddress.street || '');
      loadingCompany = producerAddress.company || 'Nie podano';
    }
    
    sequence.push({
      number: 1,
      type: 'ZAŁADUNEK',
      companyName: loadingCompany,
      address: loadingAddress,
      date: dataZaladunku
    });
    
    // Rozładunek główny
    let unloadingAddress = 'Nie podano adresu';
    let unloadingCompany = 'Nie podano firmy';
    
    if (delivery) {
      unloadingAddress = (delivery.city || '') + ', ' + (delivery.postalCode || '') + ', ' + (delivery.street || '');
      unloadingCompany = delivery.companyName || delivery.company || 'Nie podano';
    }
    
    sequence.push({
      number: 2,
      type: 'ROZŁADUNEK',
      companyName: unloadingCompany,
      address: unloadingAddress,
      date: dataRozladunku
    });
    
    return sequence;
  };
  
  // Oblicz liczbę transportów
  const getTransportCount = () => {
    if (mergedTransports && mergedTransports.originalTransports && Array.isArray(mergedTransports.originalTransports)) {
      return mergedTransports.originalTransports.length + 1;
    }
    return 1;
  };
  
  const allOrderNumbers = getAllOrderNumbers();
  const allMPKs = getAllMPKs();
  const allDocuments = getAllDocuments();
  const totalPrice = responseData.deliveryPrice || responseData.totalPrice || 0;
  const totalDistance = getTotalDistance();
  const routeSequence = generateRouteSequence();
  const transportCount = getTransportCount();
  
  // Generowanie HTML punktów trasy
  let routePointsHtml = '';
  routeSequence.forEach(point => {
    const numberClass = point.type.includes('ZAŁADUNEK') ? 'loading' : 'unloading';
    routePointsHtml += '<div class="route-point">';
    routePointsHtml += '<div class="route-number ' + numberClass + '">' + point.number + '</div>';
    routePointsHtml += '<div class="route-details">';
    routePointsHtml += '<div class="route-type">' + point.type + '</div>';
    routePointsHtml += '<div class="route-company">' + point.companyName + '</div>';
    routePointsHtml += '<div class="route-address">' + point.address + '</div>';
    routePointsHtml += '<div class="route-info">';
    routePointsHtml += '<div><strong>Data:</strong> ' + formatDate(point.date) + '</div>';
    routePointsHtml += '</div>';
    routePointsHtml += '</div>';
    routePointsHtml += '</div>';
  });
  
  // Informacja o transporcie łączonym
  let mergedInfoHtml = '';
  if (transportCount > 1) {
    mergedInfoHtml = '<div class="merged-info">';
    mergedInfoHtml += '<strong>TRANSPORT ŁĄCZONY</strong><br>';
    mergedInfoHtml += 'To zlecenie obejmuje ' + transportCount + ' połączonych transportów w jednej trasie.<br>';
    mergedInfoHtml += 'Łączna odległość wszystkich tras: ' + totalDistance + ' km';
    mergedInfoHtml += '</div>';
  }
  
  return '<!DOCTYPE html>' +
    '<html lang="pl">' +
    '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>Zlecenie Transportowe</title>' +
      '<style>' +
        'body {' +
          'font-family: Arial, sans-serif;' +
          'line-height: 1.5;' +
          'color: #1a1a1a !important;' +
          'max-width: 800px;' +
          'margin: 0 auto;' +
          'padding: 20px;' +
          'background-color: #ffffff !important;' +
        '}' +
        '.header {' +
          'background: #1a71b5 !important;' +
          'color: #ffffff !important;' +
          'padding: 25px;' +
          'text-align: center;' +
          'border-radius: 10px;' +
          'margin-bottom: 20px;' +
        '}' +
        '.header h1 {' +
          'margin: 0;' +
          'font-size: 26px;' +
          'font-weight: bold;' +
          'color: #ffffff !important;' +
        '}' +
        '.header p {' +
          'margin: 10px 0 0 0;' +
          'font-size: 14px;' +
          'color: #e6f2ff !important;' +
        '}' +
        '.important-note {' +
          'background-color: #fff8dc !important;' +
          'border: 3px solid #ffc107 !important;' +
          'padding: 18px;' +
          'margin: 20px 0;' +
          'font-weight: bold;' +
          'color: #664d00 !important;' +
          'text-align: center;' +
          'border-radius: 8px;' +
        '}' +
        '.important-warning {' +
          'background-color: #ffe6e6 !important;' +
          'border: 3px solid #dc3545 !important;' +
          'padding: 18px;' +
          'margin: 20px 0;' +
          'font-weight: bold;' +
          'color: #8b0000 !important;' +
          'text-align: center;' +
          'border-radius: 8px;' +
        '}' +
        '.section {' +
          'background-color: #ffffff !important;' +
          'padding: 25px;' +
          'margin: 15px 0;' +
          'border: 2px solid #e0e0e0;' +
          'border-radius: 10px;' +
        '}' +
        '.section h2 {' +
          'color: #1a71b5 !important;' +
          'margin-top: 0;' +
          'margin-bottom: 20px;' +
          'font-size: 20px;' +
          'font-weight: bold;' +
          'border-bottom: 3px solid #e0e0e0;' +
          'padding-bottom: 10px;' +
        '}' +
        '.info-table {' +
          'width: 100%;' +
          'border-collapse: collapse;' +
          'margin-bottom: 15px;' +
        '}' +
        '.info-table th {' +
          'text-align: left;' +
          'padding: 12px;' +
          'background-color: #f8f9fa !important;' +
          'font-weight: bold;' +
          'width: 220px;' +
          'color: #333333 !important;' +
          'border: 1px solid #dee2e6;' +
        '}' +
        '.info-table td {' +
          'padding: 12px;' +
          'border: 1px solid #dee2e6;' +
          'color: #1a1a1a !important;' +
          'background-color: #ffffff !important;' +
        '}' +
        '.route-sequence {' +
          'margin: 20px 0;' +
        '}' +
        '.route-point {' +
          'display: flex;' +
          'align-items: center;' +
          'margin-bottom: 20px;' +
          'padding: 20px;' +
          'background-color: #f8f9fa !important;' +
          'border: 2px solid #e0e0e0;' +
          'border-radius: 10px;' +
        '}' +
        '.route-number {' +
          'width: 50px;' +
          'height: 50px;' +
          'border-radius: 50%;' +
          'display: flex;' +
          'align-items: center;' +
          'justify-content: center;' +
          'font-size: 18px;' +
          'font-weight: bold;' +
          'color: #ffffff !important;' +
          'margin-right: 20px;' +
        '}' +
        '.route-number.loading {' +
          'background-color: #28a745 !important;' +
        '}' +
        '.route-number.unloading {' +
          'background-color: #dc3545 !important;' +
        '}' +
        '.route-details {' +
          'flex: 1;' +
        '}' +
        '.route-type {' +
          'font-size: 16px;' +
          'font-weight: bold;' +
          'color: #1a71b5 !important;' +
          'margin-bottom: 8px;' +
        '}' +
        '.route-company {' +
          'font-size: 18px;' +
          'font-weight: bold;' +
          'color: #1a1a1a !important;' +
          'margin-bottom: 8px;' +
        '}' +
        '.route-address {' +
          'font-size: 14px;' +
          'color: #555555 !important;' +
          'margin-bottom: 8px;' +
        '}' +
        '.route-info {' +
          'font-size: 13px;' +
          'color: #666666 !important;' +
        '}' +
        '.merged-info {' +
          'background-color: #e3f2fd !important;' +
          'border: 3px solid #2196f3 !important;' +
          'padding: 20px;' +
          'margin: 20px 0;' +
          'border-radius: 10px;' +
          'color: #0d47a1 !important;' +
          'text-align: center;' +
          'font-weight: bold;' +
        '}' +
        '.footer {' +
          'background-color: #f8f9fa !important;' +
          'padding: 20px;' +
          'text-align: center;' +
          'border-radius: 10px;' +
          'font-size: 12px;' +
          'color: #666666 !important;' +
          'border: 1px solid #e0e0e0;' +
        '}' +
      '</style>' +
    '</head>' +
    '<body>' +
      '<div class="header">' +
        '<h1>ZLECENIE TRANSPORTOWE</h1>' +
        '<p>Numery zleceń: ' + allOrderNumbers.join(', ') + ' | Data utworzenia: ' + formatDate(new Date().toISOString()) + '</p>' +
      '</div>' +
      
      '<div class="important-note">' +
        'Proszę o dopisanie na fakturze zamieszczonych poniżej numerów zleceń: ' + allOrderNumbers.join(', ') + '.' +
      '</div>' +
      
      '<div class="important-warning">' +
        '<strong>UWAGA!</strong> Na fakturze musi być podany numer zlecenia: ' + allOrderNumbers.join(', ') + '. ' +
        'Faktury bez numeru zlecenia nie będą opłacane.' +
      '</div>' +
      
      mergedInfoHtml +
      
      '<div class="section">' +
        '<h2>Informacje o transporcie</h2>' +
        '<table class="info-table">' +
          '<tr><th>Rodzaj towaru:</th><td>' + (towar || 'Nie podano') + '</td></tr>' +
          '<tr><th>Waga towaru:</th><td>' + (waga || 'Nie podano') + '</td></tr>' +
          '<tr><th>Łączna odległość' + (transportCount > 1 ? ' wszystkich tras' : '') + ':</th><td><strong>' + totalDistance + ' km</strong></td></tr>' +
          '<tr><th>MPK' + (allMPKs.length > 1 ? ' (wszystkie)' : '') + ':</th><td>' + (allMPKs.join(', ') || 'Nie podano') + '</td></tr>' +
          '<tr><th>Dokumenty' + (allDocuments.length > 1 ? ' (wszystkie)' : '') + ':</th><td>' + (allDocuments.join(', ') || 'Nie podano') + '</td></tr>' +
        '</table>' +
      '</div>' +
      
      '<div class="section">' +
        '<h2>Sekwencja trasy</h2>' +
        '<div class="route-sequence">' +
          routePointsHtml +
        '</div>' +
      '</div>' +
      
      '<div class="section">' +
        '<h2>Dane przewoźnika</h2>' +
        '<table class="info-table">' +
          '<tr><th>Przewoźnik:</th><td>' + (responseData.driverName || '') + ' ' + (responseData.driverSurname || '') + '</td></tr>' +
          '<tr><th>Numer rejestracyjny:</th><td>' + (responseData.vehicleNumber || 'Nie podano') + '</td></tr>' +
          '<tr><th>Telefon do kierowcy:</th><td>' + (responseData.driverPhone || 'Nie podano') + '</td></tr>' +
        '</table>' +
      '</div>' +
      
      '<div class="section">' +
        '<h2>Płatność</h2>' +
        '<table class="info-table">' +
          '<tr><th>Całkowita cena transportu:</th><td><strong>' + formatPrice(totalPrice) + '</strong></td></tr>' +
          '<tr><th>Termin płatności:</th><td>' + (terminPlatnosci || 'Nie podano') + '</td></tr>' +
        '</table>' +
      '</div>' +
      
      '<div class="section">' +
        '<h2>Uwagi</h2>' +
        '<p>' + (spedycja.notes || 'Brak uwag') + '</p>' +
        (responseData.adminNotes ? '<p><strong>Uwagi przewoźnika:</strong> ' + responseData.adminNotes + '</p>' : '') +
      '</div>' +
      
      '<div class="section">' +
        '<h2>Adres do wysyłki faktur i dokumentów</h2>' +
        '<p>' +
          '<strong>Grupa Eltron Sp. z o.o.</strong><br>' +
          'ul. Główna 7<br>' +
          '18-100 Łapy<br>' +
          'tel. 85 715 27 05<br>' +
          'NIP: 9662112843<br>' +
          'ksiegowosc@grupaeltron.pl' +
        '</p>' +
      '</div>' +
      
      '<div class="footer">' +
        '<p><strong>Zlecenie wygenerowane automatycznie przez System Transportowy</strong></p>' +
        '<p>Data: ' + formatDate(new Date().toISOString()) + ' | Użytkownik: ' + (user.name || user.email) + '</p>' +
        '<p>Typ transportu: ' + (transportCount > 1 ? 'Łączony (' + transportCount + ' tras)' : 'Pojedynczy') + '</p>' +
      '</div>' +
    '</body>' +
    '</html>';
}