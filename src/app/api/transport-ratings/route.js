// src/app/api/transport-ratings/route.js
import { NextResponse } from 'next/server'
import db from '@/database/db'

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

// Pobierz szczegółowe oceny transportu
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

    // Pobierz dane o użytkowniku z tokenu
    const authToken = request.cookies.get('authToken')?.value
    let currentUserEmail = null
    let isAdmin = false
    
    if (authToken) {
      try {
        const userId = await validateSession(authToken);
        if (userId) {
          currentUserEmail = userId;
          const user = await db('users').where('email', userId).first();
          isAdmin = user?.is_admin === true || user?.role === 'admin';
        }
      } catch (error) {
        console.error('Błąd weryfikacji tokenu:', error)
      }
    }

    // Sprawdź czy transport istnieje i czy można go ocenić
    const transport = await db('transports')
      .where('id', transportId)
      .select('id', 'status', 'delivery_date')
      .first();
    
    if (!transport) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }
    
    // Transport można ocenić tylko jeśli ma status 'completed'
    const canBeRated = transport.status === 'completed'

    // Pobierz szczegółowe oceny transportu
    const ratings = await db('transport_detailed_ratings')
      .where('transport_id', transportId)
      .orderBy('rated_at', 'desc')
      .select('*');

    // Sprawdź czy bieżący użytkownik już ocenił ten transport
    const userRating = ratings.find(rating => rating.rater_email === currentUserEmail)
    const hasUserRated = !!userRating

    // Pobierz statystyki z widoku
    const stats = await db('transport_rating_summary')
      .where('transport_id', transportId)
      .first();

    const defaultStats = {
      total_ratings: 0,
      driver_professional_positive: 0,
      driver_professional_negative: 0,
      driver_tasks_positive: 0,
      driver_tasks_negative: 0,
      cargo_complete_positive: 0,
      cargo_complete_negative: 0,
      cargo_correct_positive: 0,
      cargo_correct_negative: 0,
      delivery_notified_positive: 0,
      delivery_notified_negative: 0,
      delivery_on_time_positive: 0,
      delivery_on_time_negative: 0,
      overall_rating_percentage: null
    }

    const finalStats = stats || defaultStats;

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
        raterEmail: isAdmin ? rating.rater_email : rating.rater_email.replace(/(.{2}).*(@.*)/, '$1***$2'),
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
        totalRatings: finalStats.total_ratings,
        categories: {
          driver: {
            professional: {
              positive: finalStats.driver_professional_positive,
              negative: finalStats.driver_professional_negative
            },
            tasksCompleted: {
              positive: finalStats.driver_tasks_positive,
              negative: finalStats.driver_tasks_negative
            }
          },
          cargo: {
            complete: {
              positive: finalStats.cargo_complete_positive,
              negative: finalStats.cargo_complete_negative
            },
            correct: {
              positive: finalStats.cargo_correct_positive,
              negative: finalStats.cargo_correct_negative
            }
          },
          delivery: {
            notified: {
              positive: finalStats.delivery_notified_positive,
              negative: finalStats.delivery_notified_negative
            },
            onTime: {
              positive: finalStats.delivery_on_time_positive,
              negative: finalStats.delivery_on_time_negative
            }
          }
        },
        overallRatingPercentage: finalStats.overall_rating_percentage
      }
    })

  } catch (error) {
    console.error('Błąd pobierania szczegółowych ocen:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd serwera' 
    }, { status: 500 })
  }
}

// Dodaj szczegółową ocenę transportu
export async function POST(request) {
  try {
    // Pobierz dane o użytkowniku z tokenu
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
    const { 
      transportId, 
      ratings, 
      comment 
    } = body

    if (!transportId || !ratings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak wymaganych danych' 
      }, { status: 400 })
    }

    // Sprawdź czy transport istnieje i ma status 'completed'
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
    
    if (transport.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Można ocenić tylko ukończone transporty' 
      }, { status: 400 })
    }

    // Sprawdź czy użytkownik już ocenił ten transport
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

    // Dodaj nową ocenę
    const result = await db('transport_detailed_ratings').insert({
      transport_id: transportId,
      rater_email: userEmail,
      driver_professional: ratings.driverProfessional !== undefined ? ratings.driverProfessional : null,
      driver_tasks_completed: ratings.driverTasksCompleted !== undefined ? ratings.driverTasksCompleted : null,
      cargo_complete: ratings.cargoComplete !== undefined ? ratings.cargoComplete : null,
      cargo_correct: ratings.cargoCorrect !== undefined ? ratings.cargoCorrect : null,
      delivery_notified: ratings.deliveryNotified !== undefined ? ratings.deliveryNotified : null,
      delivery_on_time: ratings.deliveryOnTime !== undefined ? ratings.deliveryOnTime : null,
      comment: comment || null
    }).returning('id');

    return NextResponse.json({
      success: true,
      message: 'Ocena została zapisana',
      ratingId: result[0]?.id || result[0]
    })

  } catch (error) {
    console.error('Błąd dodawania szczegółowej oceny:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd serwera' 
    }, { status: 500 })
  }
}

// Usuń szczegółową ocenę transportu
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const ratingId = searchParams.get('id')
    
    if (!ratingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak ID oceny' 
      }, { status: 400 })
    }

    // Pobierz dane o użytkowniku z tokenu
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

    const user = await db('users').where('email', userEmail).first();
    const isAdmin = user?.is_admin === true || user?.role === 'admin';

    // Sprawdź czy ocena istnieje i czy użytkownik ma prawo ją usunąć
    const rating = await db('transport_detailed_ratings')
      .where('id', ratingId)
      .select('id', 'rater_email')
      .first();

    if (!rating) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ocena nie istnieje' 
      }, { status: 404 })
    }
    
    // Użytkownik może usunąć tylko własną ocenę, admin może usunąć każdą
    if (!isAdmin && rating.rater_email !== userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do usunięcia tej oceny' 
      }, { status: 403 })
    }

    // Usuń ocenę
    await db('transport_detailed_ratings').where('id', ratingId).del();

    return NextResponse.json({
      success: true,
      message: 'Ocena została usunięta'
    })

  } catch (error) {
    console.error('Błąd usuwania szczegółowej oceny:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Wystąpił błąd serwera' 
    }, { status: 500 })
  }
}
