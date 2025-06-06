import { jsPDF } from 'jspdf'

export async function generateCMR(transport) {
  try {
    console.log('Starting CMR generation')
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      floatPrecision: 16,
      hotfixes: ["px_scaling"]
    })

    // Funkcja pomocnicza do konwersji polskich znaków
    function convertPolishChars(text) {
      const polishChars = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 
        'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
      };
      
      return text.split('').map(char => polishChars[char] || char).join('');
    }

    // Ustaw domyślną czcionkę
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    // Szablon CMR - 4 kopie
    const templates = [
      '/cmr-templates/cmr-1.jpg',  // Oryginał dla nadawcy
      '/cmr-templates/cmr-2.jpg',  // Kopia dla odbiorcy
      '/cmr-templates/cmr-3.jpg',  // Kopia dla przewoźnika
      '/cmr-templates/cmr-4.jpg'   // Kopia dla wystawcy
    ]

    // Funkcja do ładowania obrazów
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })
    }

    // Funkcja do bezpiecznego dodawania tekstu
    const safeAddText = (text, x, y, options = {}) => {
      try {
        if (!text) text = ''; // Zabezpieczenie przed undefined/null
        const convertedText = convertPolishChars(String(text))
        doc.text(convertedText, x, y, { 
          ...options,
          charSpace: 0.5
        })
      } catch (error) {
        console.error('Error adding text:', text, error)
      }
    }

    // Załaduj wszystkie szablony
    try {
      const images = await Promise.all(templates.map(loadImage))
      
      // Dodaj strony z szablonami
      images.forEach((img, index) => {
        if (index > 0) doc.addPage()
        doc.addImage(img, 'JPEG', 0, 0, 210, 297)  // A4: 210x297mm
        
        // Dodaj zawartość na każdej stronie
        addPageContent(doc, transport, safeAddText)
      })
      
    } catch (error) {
      console.error('Błąd podczas ładowania szablonów:', error)
      // Jeśli nie udało się załadować szablonów, generuj bez nich
      for (let i = 0; i < 4; i++) {
        if (i > 0) doc.addPage()
        addPageContent(doc, transport, safeAddText)
      }
    }

    doc.save(`CMR_${transport.id}.pdf`)
    console.log('CMR generated successfully')

  } catch (error) {
    console.error('Error generating CMR:', error)
    alert('Błąd podczas generowania CMR: ' + error.message)
  }
}

// Funkcja dodająca zawartość na stronę
function addPageContent(doc, transport, safeAddText) {
  console.log('=== DEBUG CMR GENERATION ===');
  console.log('Cały obiekt transport:', transport);
  console.log('transport.response:', transport.response);
  console.log('transport.response?.connectedTransports:', transport.response?.connectedTransports);
  console.log('transport.order_data:', transport.order_data);
  
  const textOptions = {
    align: 'left',
    baseline: 'top'
  }

  // Definiujemy dane adresowe magazynów
  const magazynData = {
    'Magazyn Białystok': {
      nazwa: 'Magazyn Białystok',
      adres: 'Grupa Eltron Sp. z o.o.\nul. Wysockiego 69B\n15-169 Białystok'
    },
    'Magazyn Zielonka': {
      nazwa: 'Magazyn Zielonka',
      adres: 'Grupa Eltron Sp. z o.o.\nul. Krótka 2\n05-220 Zielonka'
    }
  };

  // Funkcja do pobierania powiązanych transportów
  const getConnectedTransports = () => {
    console.log('=== SPRAWDZANIE POWIĄZANYCH TRANSPORTÓW ===');
    
    // ZMIANA PRIORYTETU: Najpierw sprawdź order_data.additionalPlaces
    if (transport.order_data) {
      try {
        let orderData;
        if (typeof transport.order_data === 'string') {
          orderData = JSON.parse(transport.order_data);
        } else {
          orderData = transport.order_data;
        }
        
        if (orderData?.additionalPlaces && orderData.additionalPlaces.length > 0) {
          console.log('Znaleziono additionalPlaces:', orderData.additionalPlaces);
          console.log('Pierwszy element additionalPlaces:', orderData.additionalPlaces[0]);
          console.log('Wszystkie klucze pierwszego elementu additionalPlaces:', Object.keys(orderData.additionalPlaces[0]));
          return orderData.additionalPlaces;
        }
      } catch (error) {
        console.error('Błąd parsowania order_data:', error);
      }
    }
    
    // Potem sprawdź response.connectedTransports (jeśli additionalPlaces nie istnieje)
    if (transport.response?.connectedTransports && transport.response.connectedTransports.length > 0) {
      console.log('Znaleziono connectedTransports:', transport.response.connectedTransports);
      console.log('Pierwszy element connectedTransports:', transport.response.connectedTransports[0]);
      console.log('Wszystkie klucze pierwszego elementu:', Object.keys(transport.response.connectedTransports[0]));
      return transport.response.connectedTransports;
    }
    
    console.log('Nie znaleziono powiązanych transportów');
    return [];
  };

  // Funkcja do pobierania dodatkowych miejsc według typu
  const getAdditionalPlaces = (type) => {
    const connectedTransports = getConnectedTransports();
    const filtered = connectedTransports.filter(place => place.type === type);
    console.log(`Filtered places for type '${type}':`, filtered);
    return filtered;
  };

  // NOWA FUNKCJA: Pobieranie kontaktu dla transportu
  const getContactFromTransportId = (transportId, contactType) => {
    if (!transport.merged_transports?.originalTransports) return '';
    
    const originalTransport = transport.merged_transports.originalTransports.find(t => t.id === transportId);
    if (!originalTransport) return '';
    
    return contactType === 'loading' ? 
      originalTransport.loading_contact || '' : 
      originalTransport.unloading_contact || '';
  };
  
  // POPRAWIONA FUNKCJA: Formatowanie kompaktowego adresu dla CMR
  const formatCompactAddressForCMR = (addressData, contact) => {
    if (!addressData) return '';
    
    let formattedAddress = '';
    
    // Jeśli to string z nazwą magazynu
    if (typeof addressData === 'string') {
      if (addressData.includes('Magazyn Białystok')) {
        formattedAddress = 'Białystok';
      } else if (addressData.includes('Magazyn Zielonka')) {
        formattedAddress = 'Zielonka';
      } else {
        formattedAddress = addressData;
      }
    } 
    // Jeśli to obiekt adresowy
    else if (typeof addressData === 'object' && addressData.city) {
      formattedAddress = `${addressData.postalCode || ''} ${addressData.city || ''}`;
      if (addressData.street) {
        formattedAddress += `, ${addressData.street}`;
      }
    }
    
    // Dodaj kontakt jeśli jest
    if (contact) {
      formattedAddress += `, t:${contact}`;
    }
    
    return formattedAddress.trim();
  };
  
  // Funkcja do formatowania kompaktowego adresu
  const formatCompactAddress = (address, contact) => {
    if (!address) return '';
    
    let formattedAddress = '';
    if (typeof address === 'object') {
      formattedAddress = `${address.postalCode || ''} ${address.city || ''}, ${address.street || ''}`.trim();
    } else {
      formattedAddress = String(address);
    }
    
    if (contact) {
      formattedAddress += `, t:${contact}`;
    }
    
    return formattedAddress;
  };

  // Funkcja do pobierania adresu z powiązanego transportu
  const getTransportAddress = (connectedTransport, isLoading = true) => {
    console.log('Getting address for connected transport:', connectedTransport);
    
    if (isLoading) {
      // Dla załadunku
      if (connectedTransport.location === 'Odbiory własne') {
        return connectedTransport.producerAddress || connectedTransport.address;
      } else if (connectedTransport.location?.includes('Magazyn')) {
        return connectedTransport.location;
      } else {
        return connectedTransport.address;
      }
    } else {
      // Dla rozładunku
      return connectedTransport.delivery || connectedTransport.address;
    }
  };

  // 1. Nadawca (pole 1) - z dodatkowymi miejscami załadunku
  let sender;
  const additionalLoadingPlaces = getAdditionalPlaces('załadunek');
  
  console.log('Additional loading places:', additionalLoadingPlaces);
  
  // Główny nadawca
  if (transport.location === 'Odbiory własne' && transport.producerAddress) {
    sender = [
      transport.producerAddress.city,
      transport.producerAddress.postalCode,
      transport.producerAddress.street,
      `Tel: ${transport.loadingContact}`
    ].join('\n');
  } else if (magazynData[transport.location]) {
    sender = `${magazynData[transport.location].adres}\nTel: ${transport.loadingContact}`;
  } else {
    sender = `${transport.location}\nTel: ${transport.loadingContact}`;
  }
  
  // Dodaj dodatkowe miejsca załadunku
  if (additionalLoadingPlaces.length > 0) {
    sender += '\n--- DODATKOWE ZALADUNKI ---';
    
    additionalLoadingPlaces.forEach((place, index) => {
      console.log(`Processing loading place ${index + 1}:`, place);
      
      let additionalAddress = '';
      const address = getTransportAddress(place, true);
      const contact = place.loadingContact || place.contact || '';
      
      if (typeof address === 'string' && address.includes('Magazyn')) {
        additionalAddress = `${address}, t:${contact}`;
      } else {
        additionalAddress = formatCompactAddress(address, contact);
      }
      
      sender += `\n${index + 2}. ${additionalAddress}`;
      if (place.orderNumber) {
        sender += ` (${place.orderNumber})`;
      }
    });
  }
  
  // Ustaw odpowiednią czcionkę
  if (additionalLoadingPlaces.length > 0) {
    doc.setFontSize(8);
    safeAddText(sender, 20, 32, textOptions);
    doc.setFontSize(10);
  } else {
    safeAddText(sender, 20, 32, textOptions);
  }

  // 2. Odbiorca (pole 2) - z dodatkowymi miejscami rozładunku
  const additionalUnloadingPlaces = getAdditionalPlaces('rozładunek');
  
  console.log('Additional unloading places:', additionalUnloadingPlaces);
  
  let recipient = [
    transport.delivery?.city || '',
    transport.delivery?.postalCode || '',
    transport.delivery?.street || '',
    `Tel: ${transport.unloadingContact || ''}`
  ].join('\n');
  
  // Dodaj dodatkowe miejsca rozładunku
  if (additionalUnloadingPlaces.length > 0) {
    recipient += '\n--- DODATKOWE ROZLADUNKI ---';
    
    additionalUnloadingPlaces.forEach((place, index) => {
      console.log(`Processing unloading place ${index + 1}:`, place);
      
      const address = getTransportAddress(place, false);
      const contact = place.unloadingContact || place.contact || '';
      const additionalAddress = formatCompactAddress(address, contact);
      
      recipient += `\n${index + 2}. ${additionalAddress}`;
      if (place.orderNumber) {
        recipient += ` (${place.orderNumber})`;
      }
    });
  }
  
  // Ustaw odpowiednią czcionkę
  if (additionalUnloadingPlaces.length > 0) {
    doc.setFontSize(8);
    safeAddText(recipient, 20, 55, textOptions);
    doc.setFontSize(10);
  } else {
    safeAddText(recipient, 20, 55, textOptions);
  }

  // 3. Miejsce dostawy (pole 3) - główne miejsce + dodatkowe skrótowo
  let deliveryAddress = [
    transport.delivery?.city || '',
    transport.delivery?.postalCode || '',
    transport.delivery?.street || ''
  ].join('\n');
  
  if (additionalUnloadingPlaces.length > 0) {
    deliveryAddress += '\n+ DODATKOWE:';
    additionalUnloadingPlaces.forEach((place, index) => {
      const address = getTransportAddress(place, false);
      const city = address?.city || '';
      deliveryAddress += `\n${index + 2}. ${city}`;
    });
    
    doc.setFontSize(8);
    safeAddText(deliveryAddress, 20, 79, textOptions);
    doc.setFontSize(10);
  } else {
    safeAddText(deliveryAddress, 20, 79, textOptions);
  }

  // 4. Data i miejsce załadunku (pole 4)
  let deliveryDate = '';
  if (transport.deliveryDate) {
    const date = new Date(transport.deliveryDate);
    deliveryDate = date.toISOString().split('T')[0];
  }
  
  let locationText = transport.location;
  if (magazynData[transport.location]) {
    locationText = transport.location;
  }
  
  // Dodaj informację o dodatkowych miejscach
  const totalAdditionalPlaces = additionalLoadingPlaces.length + additionalUnloadingPlaces.length;
  if (totalAdditionalPlaces > 0) {
    locationText += ` +${totalAdditionalPlaces} miejsc`;
  }
  
  safeAddText(`${locationText} ${deliveryDate}`, 20, 104, textOptions);

  // 5. Załączone dokumenty (pole 5)
  safeAddText(transport.documents || '', 20, 120, textOptions);

  // Dane przewoźnika (pole 16)
  if (transport.response) {
    const carrierInfo = [
      `${transport.response.driverName || ''} ${transport.response.driverSurname || ''}`,
      `Telefon: ${transport.response.driverPhone || ''}`,
      `Nr pojazdu: ${transport.response.vehicleNumber || ''}`,
    ].join('\n');
    
    safeAddText(carrierInfo, 110, 55, textOptions);
  }

  // 6. Rodzaj towaru (Nature of the goods)
  let goodsDescription = '';
  
  console.log('=== SPRAWDZANIE DANYCH TOWARU ===');
  
  // Sprawdź order_data w różnych formatach
  if (transport.order_data) {
    console.log('transport.order_data (raw):', transport.order_data);
    try {
      let orderData;
      if (typeof transport.order_data === 'string') {
        orderData = JSON.parse(transport.order_data);
      } else {
        orderData = transport.order_data;
      }
      
      console.log('Parsed orderData:', orderData);
      
      if (orderData && orderData.towar) {
        goodsDescription = orderData.towar;
        console.log('Znaleziono towar w order_data:', goodsDescription);
      }
    } catch (error) {
      console.error('Błąd parsowania order_data:', error);
    }
  }
  
  // Fallback do innych źródeł
  if (!goodsDescription) {
    if (transport.response?.goodsDescription) {
      goodsDescription = transport.response.goodsDescription;
      console.log('Używam towaru z response:', goodsDescription);
    } else if (transport.goodsDescription?.description) {
      goodsDescription = transport.goodsDescription.description;
      console.log('Używam towaru z goodsDescription:', goodsDescription);
    }
  }
  
  console.log('FINALNA WARTOŚĆ goodsDescription:', goodsDescription);
  
  // Pole 6 - TWOJE POPRAWNE POZYCJE
  if (goodsDescription) {
    safeAddText(`${goodsDescription}`, 20, 138, textOptions);
  }

  // 11. Waga brutto
  let weight = '';
  
  console.log('=== SPRAWDZANIE DANYCH WAGI ===');
  
  // Sprawdź order_data
  if (transport.order_data) {
    try {
      let orderData;
      if (typeof transport.order_data === 'string') {
        orderData = JSON.parse(transport.order_data);
      } else {
        orderData = transport.order_data;
      }
      
      if (orderData && orderData.waga) {
        weight = orderData.waga;
        console.log('Znaleziono wagę w order_data:', weight);
      }
    } catch (error) {
      console.error('Błąd parsowania order_data dla wagi:', error);
    }
  }
  
  // Fallback do innych źródeł
  if (!weight) {
    if (transport.response?.weight) {
      weight = transport.response.weight;
      console.log('Używam wagi z response:', weight);
    } else if (transport.goodsDescription?.weight) {
      weight = transport.goodsDescription.weight;
      console.log('Używam wagi z goodsDescription:', weight);
    }
  }
  
  console.log('FINALNA WARTOŚĆ weight:', weight);
  
  // Pole 11 - TWOJE POPRAWNE POZYCJE
  if (weight) {
    safeAddText(`${weight}`, 154, 138, textOptions);
  }

  // MPK (pole 13)
  safeAddText(`MPK: ${transport.mpk || ''}`, 110, 197, textOptions);
}
