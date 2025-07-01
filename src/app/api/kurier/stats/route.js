// src/app/api/kurier/stats/route.js
import { NextResponse } from 'next/server';
import db from '@/database/db';

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  try {
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first();
    
    return session?.user_id;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
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

    // Sprawdź czy tabela istnieje
    const tableExists = await db.schema.hasTable('kuriers');
    if (!tableExists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tabela kuriers nie istnieje' 
      }, { status: 500 });
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
      .whereNotNull('magazine_source')
      .groupBy('magazine_source');

    // NAPRAWIONY SQL DLA POSTGRESQL - zmiana z DATE_SUB na INTERVAL
    const last30Days = await db('kuriers')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count('* as count')
      .first();

    // Dodatkowe statystyki
    const last7Days = await db('kuriers')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
      .count('* as count')
      .first();

    const thisMonth = await db('kuriers')
      .whereRaw("DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())")
      .count('* as count')
      .first();

    const lastMonth = await db('kuriers')
      .whereRaw("DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')")
      .count('* as count')
      .first();

    // Pobierz średni czas realizacji (dla dostarczonych zamówień)
    const avgDeliveryTime = await db('kuriers')
      .whereIn('status', ['delivered'])
      .whereNotNull('updated_at')
      .whereNotNull('created_at')
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours'))
      .first();

    // Formatuj statystyki
    const statusCounts = {
      new: 0,
      approved: 0,
      sent: 0,
      delivered: 0
    };

    stats.forEach(stat => {
      statusCounts[stat.status] = parseInt(stat.count) || 0;
    });

    const magazineCounts = {};
    magazineStats.forEach(stat => {
      magazineCounts[stat.magazine_source] = parseInt(stat.count) || 0;
    });

    // Oblicz trendy
    const thisMonthCount = parseInt(thisMonth?.count || 0);
    const lastMonthCount = parseInt(lastMonth?.count || 0);
    const growthPercentage = lastMonthCount > 0 
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : 0;

    return NextResponse.json({ 
      success: true, 
      stats: {
        statusCounts,
        magazineCounts,
        activeCount: statusCounts.new,
        archivedCount: statusCounts.approved + statusCounts.sent + statusCounts.delivered,
        totalCount: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        last30DaysCount: parseInt(last30Days?.count || 0),
        last7DaysCount: parseInt(last7Days?.count || 0),
        thisMonthCount,
        lastMonthCount,
        growthPercentage,
        avgDeliveryHours: avgDeliveryTime?.avg_hours ? Math.round(parseFloat(avgDeliveryTime.avg_hours) * 10) / 10 : null,
        // Dodatkowe metryki
        deliveryRate: statusCounts.delivered > 0 
          ? Math.round((statusCounts.delivered / (statusCounts.approved + statusCounts.sent + statusCounts.delivered)) * 100)
          : 0
      },
      meta: {
        generatedAt: new Date().toISOString(),
        period: '30days',
        currency: 'PLN'
      }
    });
  } catch (error) {
    console.error('Error fetching kurier stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Błąd serwera: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
