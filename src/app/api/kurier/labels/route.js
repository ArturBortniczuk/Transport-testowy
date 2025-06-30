// src/app/api/kurier/labels/route.js
// 🏷️ MEGA LABELS API - Generowanie etykiet DHL (PDF, ZPL, QR)
import { NextResponse } from 'next/server';
import DHLApiService from '@/app/services/dhl-api';

// Funkcja pomocnicza do walidacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  const { default: db } = await import('@/database/db');
  const session = await db('sessions')
    .where('token', authToken)
    .whereRaw('expires_at > NOW()')
    .select('user_id')
    .first();
  
  return session?.user_id;
};

// POST - Generuj etykiety dla przesyłek
export async function POST(request) {
  try {
    // Sprawdzamy uwierzytelnienie
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { shipmentIds, labelTypes, options } = await request.json();
    
    console.log('🏷️ Generowanie etykiet DHL:', { shipmentIds, labelTypes, options });

    // Walidacja
    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brakujące numery przesyłek' 
      }, { status: 400 });
    }

    if (!labelTypes || !Array.isArray(labelTypes) || labelTypes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brakujące typy etykiet' 
      }, { status: 400 });
    }

    // Sprawdź czy użytkownik ma uprawnienia do tych przesyłek
    const { default: db } = await import('@/database/db');
    const userShipments = await db('kuriers')
      .whereIn('id', shipmentIds)
      .where(function() {
        this.where('created_by_email', userId)
            .orWhere(function() {
              // Admin może pobierać wszystkie
              this.whereExists(function() {
                this.select('*')
                    .from('users')
                    .where('email', userId)
                    .where('is_admin', true);
              });
            });
      })
      .select('id', 'notes');

    if (userShipments.length !== shipmentIds.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do niektórych przesyłek' 
      }, { status: 403 });
    }

    // Przygotuj żądania etykiet dla DHL
    const labelRequests = [];
    
    for (const shipmentId of shipmentIds) {
      // Znajdź DHL shipment number w notes
      const shipment = userShipments.find(s => s.id === parseInt(shipmentId));
      if (!shipment) continue;

      let notes = {};
      try {
        notes = JSON.parse(shipment.notes || '{}');
      } catch (e) {
        console.warn(`Nie można parsować notes dla zamówienia ${shipmentId}`);
        continue;
      }

      const dhlShipmentNumber = notes.dhl?.shipmentNumber;
      if (!dhlShipmentNumber) {
        console.warn(`Brak numeru DHL dla zamówienia ${shipmentId}`);
        continue;
      }

      // Dodaj żądania dla wszystkich typów etykiet
      for (const labelType of labelTypes) {
        labelRequests.push({
          shipmentId: dhlShipmentNumber,
          labelType: labelType,
          originalOrderId: shipmentId
        });
      }
    }

    if (labelRequests.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak przesyłek z numerami DHL do pobrania etykiet' 
      }, { status: 400 });
    }

    // Wywołaj DHL API
    const labelsResult = await DHLApiService.getLabels(labelRequests);
    
    if (labelsResult.success) {
      // Przetwórz wyniki
      const processedLabels = labelsResult.labels.map(label => {
        const originalRequest = labelRequests.find(req => req.shipmentId === label.shipmentId);
        
        return {
          ...label,
          originalOrderId: originalRequest?.originalOrderId,
          downloadUrl: `/api/kurier/labels/download/${label.shipmentId}/${label.labelType}`,
          size: calculateLabelSize(label.labelData),
          createdAt: new Date().toISOString(),
          createdBy: userId
        };
      });

      // Zapisz informacje o pobranych etykietach w bazie
      await saveLabelDownloadHistory(processedLabels, userId);

      return NextResponse.json({
        success: true,
        labels: processedLabels,
        summary: {
          totalLabels: processedLabels.length,
          labelTypes: [...new Set(processedLabels.map(l => l.labelType))],
          shipmentIds: [...new Set(processedLabels.map(l => l.shipmentId))],
          totalSize: processedLabels.reduce((sum, l) => sum + l.size, 0)
        }
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: labelsResult.error 
      });
    }
  } catch (error) {
    console.error('💥 Błąd generowania etykiet:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera: ' + error.message 
    }, { status: 500 });
  }
}

// GET - Pobierz dostępne typy etykiet i opcje
export async function GET(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const labelTypes = {
      success: true,
      availableLabelTypes: [
        {
          type: 'LP',
          name: 'List przewozowy',
          description: 'Standardowy list przewozowy DHL',
          format: 'PDF',
          size: 'A4',
          use: 'Dokumentacja przesyłki',
          icon: '📄'
        },
        {
          type: 'BLP',
          name: 'Etykieta BLP (PDF)',
          description: 'Etykieta BLP w formacie PDF dla drukarek laserowych',
          format: 'PDF',
          size: '10x15 cm',
          use: 'Drukarka laserowa',
          icon: '🏷️',
          recommended: true
        },
        {
          type: 'LBLP',
          name: 'Etykieta BLP (A4)',
          description: 'Etykieta BLP na całą stronę A4',
          format: 'PDF',
          size: 'A4',
          use: 'Drukarka laserowa - duży format',
          icon: '📋'
        },
        {
          type: 'ZBLP',
          name: 'Etykieta ZPL (Zebra)',
          description: 'Etykieta w formacie ZPL dla drukarek Zebra',
          format: 'ZPL',
          size: '10x15 cm',
          use: 'Drukarka termiczna Zebra',
          icon: '🖨️'
        },
        {
          type: 'ZBLP300',
          name: 'Etykieta ZPL 300dpi',
          description: 'Etykieta ZPL w wysokiej rozdzielczości 300dpi',
          format: 'ZPL',
          size: '10x15 cm',
          use: 'Drukarka Zebra 300dpi',
          icon: '🖨️⚡'
        },
        {
          type: 'QR_PDF',
          name: 'Kod QR (PDF)',
          description: 'Kod QR w formacie PDF dla przesyłek ZK',
          format: 'PDF',
          size: '5x5 cm',
          use: 'Przesyłki ZK',
          icon: '📱'
        },
        {
          type: 'QR2_IMG',
          name: 'Kod QR 2cm (PNG)',
          description: 'Kod QR 2x2 cm w formacie PNG',
          format: 'PNG',
          size: '2x2 cm',
          use: 'Małe etykiety',
          icon: '🔲'
        },
        {
          type: 'QR4_IMG',
          name: 'Kod QR 4cm (PNG)',
          description: 'Kod QR 4x4 cm w formacie PNG',
          format: 'PNG',
          size: '4x4 cm',
          use: 'Standardowe etykiety',
          icon: '🔳'
        },
        {
          type: 'QR6_IMG',
          name: 'Kod QR 6cm (PNG)',
          description: 'Kod QR 6x6 cm w formacie PNG',
          format: 'PNG',
          size: '6x6 cm',
          use: 'Duże etykiety',
          icon: '⬛'
        }
      ],
      recommendations: {
        'Drukarka laserowa': ['BLP', 'LP'],
        'Drukarka termiczna Zebra': ['ZBLP', 'ZBLP300'],
        'Przesyłki krajowe': ['BLP', 'LP'],
        'Przesyłki międzynarodowe': ['LP', 'BLP'],
        'Przesyłki ZK': ['QR_PDF', 'QR4_IMG'],
        'Masowe drukowanie': ['ZBLP', 'ZBLP300']
      },
      notes: [
        'Etykiety BLP są najbardziej uniwersalne',
        'Format ZPL jest szybszy dla drukarek termicznych',
        'Etykiety QR są wymagane dla niektórych usług',
        'Zawsze możesz pobrać kilka formatów jednocześnie'
      ]
    };

    return NextResponse.json(labelTypes);
  } catch (error) {
    console.error('Error getting label types:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper functions
function calculateLabelSize(labelData) {
  if (!labelData) return 0;
  
  // Base64 string size to bytes
  const base64Length = labelData.length;
  const padding = (labelData.match(/=/g) || []).length;
  const bytes = (base64Length * 3) / 4 - padding;
  
  return Math.round(bytes);
}

async function saveLabelDownloadHistory(labels, userId) {
  try {
    const { default: db } = await import('@/database/db');
    
    // Sprawdź czy tabela istnieje
    const tableExists = await db.schema.hasTable('kurier_label_downloads');
    
    if (!tableExists) {
      await db.schema.createTable('kurier_label_downloads', table => {
        table.increments('id').primary();
        table.string('shipment_id').notNullable();
        table.string('label_type').notNullable();
        table.string('downloaded_by').notNullable();
        table.timestamp('downloaded_at').defaultTo(db.fn.now());
        table.integer('file_size');
        table.string('file_format');
        table.text('notes');
        
        table.index(['shipment_id', 'downloaded_by']);
        table.index('downloaded_at');
      });
      
      console.log('Created kurier_label_downloads table');
    }

    // Zapisz historię pobrań
    const downloadRecords = labels.map(label => ({
      shipment_id: label.shipmentId,
      label_type: label.labelType,
      downloaded_by: userId,
      file_size: label.size,
      file_format: label.labelMimeType,
      notes: JSON.stringify({
        originalOrderId: label.originalOrderId,
        labelName: label.labelName
      })
    }));

    await db('kurier_label_downloads').insert(downloadRecords);
    
    console.log(`Zapisano ${downloadRecords.length} rekordów pobrań etykiet`);
  } catch (error) {
    console.error('Błąd zapisywania historii pobrań:', error);
    // Nie przerywaj procesu jeśli zapisywanie historii nie powiedzie się
  }
}
