// src/app/api/kurier/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

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

// GET - Pobierz konkretne zamówienie
export async function GET(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { id } = params;
    
    const zamowienie = await db('kuriers')
      .where('id', id)
      .first();

    if (!zamowienie) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zamówienie nie znalezione' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      zamowienie 
    });
  } catch (error) {
    console.error('Error fetching kurier order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT - Aktualizuj zamówienie (np. zatwierdź i wyślij do DHL)
export async function PUT(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('role', 'name')
      .first();

    // Tylko admin i magazynierzy mogą zatwierdzać
    const canApprove = user.role === 'admin' || user.role?.includes('magazyn');
    
    const { id } = params;
    const updateData = await request.json();

    // Jeśli to zatwierdzenie, sprawdź uprawnienia
    if (updateData.status === 'approved' && !canApprove) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do zatwierdzania zamówień' 
      }, { status: 403 });
    }

    let dataToUpdate = {
      ...updateData,
      ...(updateData.status === 'approved' && {
        completed_by: userId,
        completed_at: db.fn.now()
      })
    };

    // Jeśli zatwierdzamy zamówienie, spróbuj wysłać do DHL
    if (updateData.status === 'approved') {
      try {
        // Pobierz pełne dane zamówienia
        const zamowienie = await db('kuriers')
          .where('id', id)
          .first();

        if (!zamowienie) {
          return NextResponse.json({ 
            success: false, 
            error: 'Zamówienie nie znalezione' 
          }, { status: 404 });
        }

        // Import DHL service dynamically (dla środowiska serverless)
        const { default: DHLApiService } = await import('@/app/services/dhl-api');
        
        // Wyślij do DHL
        console.log('Attempting to send shipment to DHL for order:', id);
        const dhlResult = await DHLApiService.createShipment(zamowienie);
        
        if (dhlResult.success) {
          // Zaktualizuj status na 'sent' i dodaj dane DHL
          dataToUpdate.status = 'sent';
          const existingNotes = JSON.parse(zamowienie.notes || '{}');
          dataToUpdate.notes = JSON.stringify({
            ...existingNotes,
            dhl: {
              shipmentNumber: dhlResult.shipmentNumber,
              trackingNumber: dhlResult.trackingNumber,
              labelUrl: dhlResult.label,
              cost: dhlResult.cost,
              sentAt: new Date().toISOString(),
              sentBy: userId,
              status: 'sent_to_dhl'
            }
          });
          
          console.log('DHL shipment created successfully:', {
            orderId: id,
            shipmentNumber: dhlResult.shipmentNumber,
            trackingNumber: dhlResult.trackingNumber
          });
        } else {
          // Jeśli DHL nie powiedzie się, tylko zatwierdź lokalnie
          console.error('DHL shipment failed, keeping local approval:', dhlResult.error);
          const existingNotes = JSON.parse(zamowienie.notes || '{}');
          dataToUpdate.notes = JSON.stringify({
            ...existingNotes,
            dhl: {
              error: dhlResult.error,
              attemptedAt: new Date().toISOString(),
              attemptedBy: userId,
              status: 'failed'
            }
          });
        }
      } catch (dhlError) {
        console.error('DHL integration error:', dhlError);
        // Kontynuuj z lokalnym zatwierdzeniem nawet jeśli DHL nie działa
        const zamowienie = await db('kuriers').where('id', id).first();
        const existingNotes = JSON.parse(zamowienie?.notes || '{}');
        dataToUpdate.notes = JSON.stringify({
          ...existingNotes,
          dhl: {
            error: 'Integration error: ' + dhlError.message,
            attemptedAt: new Date().toISOString(),
            attemptedBy: userId,
            status: 'error'
          }
        });
      }
    }

    const updated = await db('kuriers')
      .where('id', id)
      .update(dataToUpdate);

    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zamówienie nie znalezione' 
      }, { status: 404 });
    }

    // Zwróć odpowiednią wiadomość
    let message = 'Zamówienie zostało zaktualizowane';
    if (updateData.status === 'approved') {
      if (dataToUpdate.status === 'sent') {
        message = 'Zamówienie zostało zatwierdzone i wysłane do DHL';
      } else {
        message = 'Zamówienie zostało zatwierdzone (problem z wysyłką DHL - sprawdź szczegóły)';
      }
    }

    return NextResponse.json({ 
      success: true,
      message: message,
      dhlStatus: dataToUpdate.status,
      localStatus: updateData.status
    });
  } catch (error) {
    console.error('Error updating kurier order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Usuń zamówienie
export async function DELETE(request, { params }) {
  try {
    const authToken = request.cookies.get('authToken')?.value;
    const userId = await validateSession(authToken);
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Sprawdź uprawnienia - tylko twórca lub admin może usuwać
    const user = await db('users')
      .where('email', userId)
      .select('role')
      .first();

    const { id } = params;

    // Pobierz zamówienie żeby sprawdzić właściciela
    const zamowienie = await db('kuriers')
      .where('id', id)
      .first();

    if (!zamowienie) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zamówienie nie znalezione' 
      }, { status: 404 });
    }

    // Tylko twórca lub admin może usuwać
    const canDelete = zamowienie.created_by_email === userId || user.role === 'admin';
    
    if (!canDelete) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do usunięcia zamówienia' 
      }, { status: 403 });
    }

    // Jeśli zamówienie ma numer DHL, spróbuj je anulować
    if (zamowienie.notes) {
      try {
        const notes = JSON.parse(zamowienie.notes);
        if (notes.dhl && notes.dhl.shipmentNumber && notes.dhl.status === 'sent_to_dhl') {
          console.log('Attempting to cancel DHL shipment:', notes.dhl.shipmentNumber);
          
          const { default: DHLApiService } = await import('@/app/services/dhl-api');
          const cancelResult = await DHLApiService.cancelShipment(notes.dhl.shipmentNumber);
          
          if (cancelResult.success) {
            console.log('DHL shipment cancelled successfully');
          } else {
            console.warn('Failed to cancel DHL shipment:', cancelResult.error);
          }
        }
      } catch (error) {
        console.warn('Error cancelling DHL shipment:', error);
        // Kontynuuj z usunięciem lokalnym nawet jeśli anulowanie DHL nie powiedzie się
      }
    }

    await db('kuriers')
      .where('id', id)
      .del();

    return NextResponse.json({ 
      success: true,
      message: 'Zamówienie zostało usunięte'
    });
  } catch (error) {
    console.error('Error deleting kurier order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
