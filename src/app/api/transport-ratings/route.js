// src/app/api/transport-ratings/route.js - POPRAWIONA WERSJA BEZ ANONIMIZACJI
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

// Funkcja sprawdzania czy tabela istnieje
const tableExists = async (tableName) => {
  try {
    await db.raw(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
};

// Pobierz oceny transportu
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

    // Sprawdzenie tokenu
    const authToken = request.cookies.get('authToken')?.value
    let currentUserEmail = null
    
    if (authToken) {
      const userId = await validateSession(authToken);
      if (userId) {
        const user = await db('users')
          .where('id', userId)
          .select('email')
          .first();
        currentUserEmail = user?.email;
      }
    }

    // Sprawdzenie transportu
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

        // Oblicz statystyki
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
        // POPRAWKA: Usuwamy anonimizację - pokazujemy pełny email
        raterEmail: rating.rater_email || 'Brak emaila',
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
        overallRatingPercentage: stats.overallRatingPercentage
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

// Dodaj lub zaktualizuj ocenę transportu
export async function POST(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    const userId = await validateSession(authToken);
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowa sesja' 
      }, { status: 401 })
    }

    // Pobierz email użytkownika
    const user = await db('users')
      .where('id', userId)
      .select('email')
      .first();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Użytkownik nie istnieje' 
      }, { status: 404 })
    }

    const { transportId, ratings, comment } = await request.json()
    
    if (!transportId || !ratings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak wymaganych danych' 
      }, { status: 400 })
    }

    // Sprawdź czy transport istnieje i można go ocenić
    const transport = await db('transports')
      .where('id', transportId)
      .select('status')
      .first();
    
    if (!transport) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }

    if (transport.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Można ocenić tylko ukończone transporty' 
      }, { status: 400 })
    }

    // Sprawdź czy tabela szczegółowych ocen istnieje, jeśli nie - utwórz ją
    const detailedRatingsExist = await tableExists('transport_detailed_ratings');
    
    if (!detailedRatingsExist) {
      await db.schema.createTable('transport_detailed_ratings', (table) => {
        table.increments('id').primary()
        table.integer('transport_id').notNullable()
        table.string('rater_email').notNullable()
        table.boolean('driver_professional')
        table.boolean('driver_tasks_completed')
        table.boolean('cargo_complete')
        table.boolean('cargo_correct')
        table.boolean('delivery_notified')
        table.boolean('delivery_on_time')
        table.text('comment')
        table.timestamp('rated_at').defaultTo(db.fn.now())
        
        table.index(['transport_id'])
        table.unique(['transport_id', 'rater_email'])
      })
    }

    // Sprawdź czy użytkownik już ocenił ten transport
    const existingRating = await db('transport_detailed_ratings')
      .where('transport_id', transportId)
      .where('rater_email', user.email)
      .first();

    const ratingData = {
      transport_id: transportId,
      rater_email: user.email,
      driver_professional: ratings.driverProfessional,
      driver_tasks_completed: ratings.driverTasksCompleted,
      cargo_complete: ratings.cargoComplete,
      cargo_correct: ratings.cargoCorrect,
      delivery_notified: ratings.deliveryNotified,
      delivery_on_time: ratings.deliveryOnTime,
      comment: comment || null,
      rated_at: new Date()
    };

    if (existingRating) {
      // Aktualizuj istniejącą ocenę
      await db('transport_detailed_ratings')
        .where('id', existingRating.id)
        .update(ratingData);
    } else {
      // Dodaj nową ocenę
      await db('transport_detailed_ratings').insert(ratingData);
    }

    return NextResponse.json({
      success: true,
      message: existingRating ? 'Ocena została zaktualizowana' : 'Ocena została dodana'
    })

  } catch (error) {
    console.error('Błąd dodawania/aktualizacji oceny:', error)
    
    // Sprawdź czy błąd to duplikat klucza
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Już oceniłeś ten transport. Spróbuj odświeżyć stronę.' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd podczas zapisywania oceny' 
    }, { status: 500 })
  }
}
