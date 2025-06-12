// src/app/api/transport-ratings/route.js - UPROSZCZONA SZYBKA WERSJA
import { NextResponse } from 'next/server'
import db from '@/database/db'

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
    console.error('Błąd walidacji sesji:', error)
    return null
  }
};

// SZYBKA funkcja sprawdzania czy tabela istnieje
const tableExists = async (tableName) => {
  try {
    await db.raw(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
};

// Pobierz oceny transportu - SZYBKA WERSJA
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const transportId = searchParams.get('transportId')
    
    if (!transportId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak ID transportu' 
      }, { status: 400 })
    }

    // SZYBKIE sprawdzenie tokenu
    const authToken = request.cookies.get('authToken')?.value
    let currentUserEmail = null
    
    if (authToken) {
      currentUserEmail = await validateSession(authToken);
    }

    // SZYBKIE sprawdzenie transportu
    const transport = await db('transports')
      .where('id', transportId)
      .select('id', 'status')
      .first();
    
    if (!transport) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }
    
    // Transport można ocenić tylko jeśli ma status 'completed'
    const canBeRated = transport.status === 'completed'

    // Sprawdź czy tabela szczegółowych ocen istnieje
    const detailedRatingsExist = await tableExists('transport_detailed_ratings');
    
    let ratings = []
    let userRating = null
    let hasUserRated = false
    let stats = {
      totalRatings: 0,
      overallRatingPercentage: null
    }

    if (detailedRatingsExist) {
      try {
        // Pobierz oceny z tabeli szczegółowej
        ratings = await db('transport_detailed_ratings')
          .where('transport_id', transportId)
          .orderBy('rated_at', 'desc')
          .select('*');

        // Sprawdź czy użytkownik już ocenił
        userRating = ratings.find(rating => rating.rater_email === currentUserEmail)
        hasUserRated = !!userRating

        // Oblicz statystyki SZYBKO
        if (ratings.length > 0) {
          const totalPositive = ratings.reduce((sum, rating) => {
            const positiveCount = [
              rating.driver_professional,
              rating.driver_tasks_completed,
              rating.cargo_complete,
              rating.cargo_correct,
              rating.delivery_notified,
              rating.delivery_on_time
            ].filter(val => val === true).length
            return sum + positiveCount
          }, 0)
          
          const totalCriteria = ratings.length * 6 // 6 kryteriów na ocenę
          stats.totalRatings = ratings.length
          stats.overallRatingPercentage = totalCriteria > 0 ? Math.round((totalPositive / totalCriteria) * 100) : null
        }
      } catch (error) {
        console.error('Błąd pobierania szczegółowych ocen:', error)
        // Kontynuuj z pustymi danymi
      }
    } else {
      // Sprawdź starą tabelę transport_ratings
      try {
        const oldRatings = await db('transport_ratings')
          .where('transport_id', transportId)
          .select('*');
        
        if (oldRatings.length > 0) {
          stats.totalRatings = oldRatings.length
          const avgRating = oldRatings.reduce((sum, r) => sum + (r.is_positive ? 1 : 0), 0) / oldRatings.length
          stats.overallRatingPercentage = Math.round(avgRating * 100)
        }
      } catch (error) {
        console.error('Błąd pobierania starych ocen:', error)
      }
    }

    // SZYBKA odpowiedź
    return NextResponse.json({
      success: true,
      canBeRated: canBeRated && !hasUserRated,
      hasUserRated,
      userRating: userRating ? {
        id: userRating.id,
        ratings: {
          driverProfessional: userRating.driver_professional,
          driverTasksCompleted: userRating.driver_tasks_completed,
          cargoComplete: userRating.cargo_complete,
          cargoCorrect: userRating.cargo_correct,
          deliveryNotified: userRating.delivery_notified,
          deliveryOnTime: userRating.delivery_on_time
        },
        comment: userRating.comment
      } : null,
      ratings: ratings.map(rating => ({
        id: rating.id,
        raterEmail: rating.rater_email?.replace(/(.{2}).*(@.*)/, '$1***$2') || 'Anonim',
        ratedAt: rating.rated_at,
        ratings: {
          driverProfessional: rating.driver_professional,
          driverTasksCompleted: rating.driver_tasks_completed,
          cargoComplete: rating.cargo_complete,
          cargoCorrect: rating.cargo_correct,
          deliveryNotified: rating.delivery_notified,
          deliveryOnTime: rating.delivery_on_time
        },
        comment: rating.comment
      })),
      stats: {
        totalRatings: stats.totalRatings,
        overallRatingPercentage: stats.overallRatingPercentage,
        categories: {
          driver: { professional: { positive: 0, negative: 0 }, tasksCompleted: { positive: 0, negative: 0 } },
          cargo: { complete: { positive: 0, negative: 0 }, correct: { positive: 0, negative: 0 } },
          delivery: { notified: { positive: 0, negative: 0 }, onTime: { positive: 0, negative: 0 } }
        }
      }
    })

  } catch (error) {
    console.error('Błąd pobierania ocen:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd serwera' 
    }, { status: 500 })
  }
}

// Dodaj ocenę transportu - SZYBKA WERSJA
export async function POST(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    const userEmail = await validateSession(authToken);
    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowy token' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { transportId, ratings, comment } = body

    if (!transportId || !ratings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak wymaganych danych' 
      }, { status: 400 })
    }

    // Sprawdź transport
    const transport = await db('transports')
      .where('id', transportId)
      .select('id', 'status')
      .first();
    
    if (!transport || transport.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje lub nie jest ukończony' 
      }, { status: 400 })
    }

    // Sprawdź czy tabela szczegółowych ocen istnieje, jeśli nie - utwórz
    const detailedRatingsExist = await tableExists('transport_detailed_ratings');
    
    if (!detailedRatingsExist) {
      await db.schema.createTable('transport_detailed_ratings', table => {
        table.increments('id').primary();
        table.integer('transport_id').notNullable();
        table.string('rater_email').notNullable();
        table.timestamp('rated_at').defaultTo(db.fn.now());
        table.boolean('driver_professional');
        table.boolean('driver_tasks_completed');
        table.boolean('cargo_complete');
        table.boolean('cargo_correct');
        table.boolean('delivery_notified');
        table.boolean('delivery_on_time');
        table.text('comment');
        table.unique(['transport_id', 'rater_email']);
        table.index('transport_id');
      });
    }

    // Sprawdź czy użytkownik już ocenił
    const existingRating = await db('transport_detailed_ratings')
      .where('transport_id', transportId)
      .where('rater_email', userEmail)
      .first();

    if (existingRating) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ten transport został już oceniony' 
      }, { status: 400 })
    }

    // Dodaj ocenę
    const result = await db('transport_detailed_ratings').insert({
      transport_id: transportId,
      rater_email: userEmail,
      driver_professional: ratings.driverProfessional,
      driver_tasks_completed: ratings.driverTasksCompleted,
      cargo_complete: ratings.cargoComplete,
      cargo_correct: ratings.cargoCorrect,
      delivery_notified: ratings.deliveryNotified,
      delivery_on_time: ratings.deliveryOnTime,
      comment: comment || null
    }).returning('id');

    return NextResponse.json({
      success: true,
      message: 'Ocena została zapisana',
      ratingId: result[0]?.id || result[0]
    })

  } catch (error) {
    console.error('Błąd dodawania oceny:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd serwera' 
    }, { status: 500 })
  }
}
