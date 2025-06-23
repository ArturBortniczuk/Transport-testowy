// src/app/api/kurier/stats/route.js
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

// GET - Pobierz statystyki zamówień kurierskich
export async function GET(request) {
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

    // Pobierz liczby zamówień według statusów
    const stats = await db('kuriers')
      .select('status')
      .count('* as count')
      .groupBy('status');

    // Pobierz statystyki według magazynów
    const magazineStats = await db('kuriers')
      .select('magazine_source')
      .count('* as count')
      .groupBy('magazine_source');

    // Pobierz zamówienia z ostatnich 30 dni
    const last30Days = await db('kuriers')
      .where('created_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 30 DAY)"))
      .count('* as count')
      .first();

    // Formatuj statystyki
    const statusCounts = {
      new: 0,
      approved: 0,
      sent: 0,
      delivered: 0
    };

    stats.forEach(stat => {
      statusCounts[stat.status] = parseInt(stat.count);
    });

    const magazineCounts = {};
    magazineStats.forEach(stat => {
      magazineCounts[stat.magazine_source] = parseInt(stat.count);
    });

    return NextResponse.json({ 
      success: true, 
      stats: {
        statusCounts,
        magazineCounts,
        activeCount: statusCounts.new,
        archivedCount: statusCounts.approved + statusCounts.sent + statusCounts.delivered,
        totalCount: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        last30DaysCount: parseInt(last30Days?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching kurier stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
