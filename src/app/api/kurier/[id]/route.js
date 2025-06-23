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

// PUT - Aktualizuj zamówienie (np. zatwierdź)
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

    const dataToUpdate = {
      ...updateData,
      ...(updateData.status === 'approved' && {
        completed_by: userId,
        completed_at: db.fn.now()
      })
    };

    const updated = await db('kuriers')
      .where('id', id)
      .update(dataToUpdate);

    if (updated === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Zamówienie nie znalezione' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: updateData.status === 'approved' ? 'Zamówienie zostało zatwierdzone' : 'Zamówienie zostało zaktualizowane'
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
