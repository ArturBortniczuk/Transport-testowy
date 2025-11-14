// src/app/api/spedition-detailed-ratings/route.js - API OCEN TRANSPORTU SPEDYCYJNEGO
import { NextResponse } from 'next/server'
import db from '@/database/db'

// Funkcja pomocnicza do weryfikacji sesji
const validateSession = async (authToken) => {
  if (!authToken) {
    return null
  }
  
  try {
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first()
    
    return session?.user_id
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

// GET - Pobierz ocenę spedycji
export async function GET(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value
    const userId = await validateSession(authToken)
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const speditionId = searchParams.get('speditionId')
    
    if (!speditionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak ID spedycji' 
      }, { status: 400 })
    }

    // Sprawdź czy spedycja istnieje (POPRAWIONA NAZWA TABELI)
    const spedition = await db('spedycje')
      .where('id', speditionId)
      .select('status')
      .first()
    
    if (!spedition) {
      return NextResponse.json({ 
        success: false, 
        error: 'Spedycja nie istnieje' 
      }, { status: 404 })
    }

    // Sprawdź czy tabela ocen istnieje
    const hasTable = await db.schema.hasTable('spedition_detailed_ratings')
    
    if (!hasTable) {
      // Jeśli tabela nie istnieje, zwróć domyślne wartości
      return NextResponse.json({ 
        success: true, 
        rating: null,
        stats: {
          totalRatings: 0,
          overallRatingPercentage: null
        },
        canBeRated: spedition.status === 'completed',
        hasUserRated: false,
        allRatings: []
      })
    }
    
    // Pobierz wszystkie oceny dla spedycji
    const allDetailedRatings = await db('spedition_detailed_ratings')
      .where('spedition_id', speditionId)
      .orderBy('created_at', 'desc')
      .select('*')
    
    const totalRatings = allDetailedRatings.length
    
    // Oblicz ogólny procent pozytywnych ocen
    let overallRatingPercentage = null
    if (totalRatings > 0) {
      let totalCriteria = 0
      let positiveCriteria = 0
      
      allDetailedRatings.forEach(rating => {
        const criteria = [
          rating.carrier_professional,
          rating.loading_on_time,
          rating.cargo_complete,
          rating.cargo_undamaged,
          rating.delivery_notified,
          rating.delivery_on_time,
          rating.documents_complete,
          rating.documents_correct
        ]
        
        criteria.forEach(criterion => {
          if (criterion !== null) {
            totalCriteria++
            if (criterion === true) positiveCriteria++
          }
        })
      })
      
      overallRatingPercentage = totalCriteria > 0 ? 
        Math.round((positiveCriteria / totalCriteria) * 100) : null
    }
    
    // Sprawdź czy użytkownik może ocenić i czy już ocenił
    const canBeRated = spedition.status === 'completed' && totalRatings === 0
    const hasUserRated = allDetailedRatings.some(r => r.rater_email === userId)
    
    // Pobierz ocenę użytkownika
    const rating = allDetailedRatings.find(r => r.rater_email === userId)
    
    return NextResponse.json({ 
      success: true, 
      rating,
      stats: {
        totalRatings,
        overallRatingPercentage
      },
      canBeRated,
      hasUserRated,
      allRatings: allDetailedRatings
    })
  } catch (error) {
    console.error('Error fetching spedition rating:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// POST - Dodaj lub zaktualizuj ocenę spedycji
export async function POST(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value
    const userId = await validateSession(authToken)
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }
    
    const { speditionId, ratings, comment } = await request.json()
    
    if (!speditionId || !ratings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brakujące dane: wymagane spedition ID i oceny' 
      }, { status: 400 })
    }
    
    // Sprawdź czy spedycja istnieje i można ją ocenić (POPRAWIONA NAZWA TABELI)
    const spedition = await db('spedycje')
      .where('id', speditionId)
      .select('*')
      .first()
    
    if (!spedition) {
      return NextResponse.json({ 
        success: false, 
        error: 'Spedycja nie istnieje' 
      }, { status: 404 })
    }
    
    if (spedition.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Można oceniać tylko ukończone transporty' 
      }, { status: 400 })
    }

    // Sprawdź czy tabela istnieje, jeśli nie - utwórz
    const hasTable = await db.schema.hasTable('spedition_detailed_ratings')
    
    if (!hasTable) {
      console.log('Tworzenie tabeli spedition_detailed_ratings...')
      await db.schema.createTable('spedition_detailed_ratings', table => {
        table.increments('id').primary()
        table.integer('spedition_id').unsigned().notNullable()
        table.string('rater_email').notNullable()
        table.string('rater_name')
        table.boolean('carrier_professional')
        table.boolean('loading_on_time')
        table.boolean('cargo_complete')
        table.boolean('cargo_undamaged')
        table.boolean('delivery_notified')
        table.boolean('delivery_on_time')
        table.boolean('documents_complete')
        table.boolean('documents_correct')
        table.text('comment')
        table.timestamp('created_at').defaultTo(db.fn.now())
        table.index('spedition_id')
        table.index('rater_email')
      })
      console.log('Tabela spedition_detailed_ratings utworzona')
    }
    
    // Pobierz nazwę użytkownika
    const user = await db('users')
      .where('email', userId)
      .select('name')
      .first()
    
    // Sprawdź czy użytkownik już ocenił tę spedycję
    const existingRating = await db('spedition_detailed_ratings')
      .where('spedition_id', speditionId)
      .where('rater_email', userId)
      .first()

    const ratingData = {
      spedition_id: speditionId,
      rater_email: userId,
      rater_name: user?.name || null,
      carrier_professional: ratings.carrierProfessional,
      loading_on_time: ratings.loadingOnTime,
      cargo_complete: ratings.cargoComplete,
      cargo_undamaged: ratings.cargoUndamaged,
      delivery_notified: ratings.deliveryNotified,
      delivery_on_time: ratings.deliveryOnTime,
      documents_complete: ratings.documentsComplete,
      documents_correct: ratings.documentsCorrect,
      comment: comment || ''
    }
    
    let ratingId
    
    if (existingRating) {
      // Aktualizuj istniejącą ocenę
      await db('spedition_detailed_ratings')
        .where('id', existingRating.id)
        .update(ratingData)
      
      ratingId = existingRating.id
    } else {
      // Dodaj nową ocenę
      const insertResult = await db('spedition_detailed_ratings')
        .insert(ratingData)
        .returning('id')
      
      ratingId = insertResult[0]?.id || insertResult[0]
    }
    
    return NextResponse.json({ 
      success: true, 
      message: existingRating ? 'Ocena została zaktualizowana' : 'Ocena została dodana',
      ratingId: ratingId
    })
    
  } catch (error) {
    console.error('Error adding spedition rating:', error)
    
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Już oceniłeś tę spedycję. Spróbuj odświeżyć stronę.' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd podczas zapisywania oceny: ' + error.message 
    }, { status: 500 })
  }
}