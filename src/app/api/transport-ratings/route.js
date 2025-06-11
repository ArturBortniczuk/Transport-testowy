// src/app/api/transport-ratings/route.js - ZASTĄPIONE NOWYM SYSTEMEM SZCZEGÓŁOWYCH OCEN
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
    const authToken = request.cookies.get('authToken')?.value;
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
    const transportResult = await db('transports')
      .where('id', transportId)
      .select('id', 'status', 'delivery_date')
      .first();
    
    if (!transportResult) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }

    const transport = transportResult
    
    // Transport można ocenić tylko jeśli ma status 'completed'
    const canBeRated = transport.status === 'completed'

    // Pobierz szczegółowe oceny transportu
    const ratingsResult = await db('transport_detailed_ratings')
      .where('transport_id', transportId)
      .orderBy('rated_at', 'desc')
      .select('*');

    // Sprawdź czy bieżący użytkownik już ocenił ten transport
    const userRating = ratingsResult.find(rating => rating.rater_email === currentUserEmail)
    const hasUserRated = !!userRating

    // Pobierz statystyki z widoku
    const statsResult = await db('transport_rating_summary')
      .where('transport_id', transportId)
      .first();

    const stats = statsResult || {
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
      ratings: ratingsResult.map(rating => ({
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
        totalRatings: stats.total_ratings,
        categories: {
          driver: {
            professional: {
              positive: stats.driver_professional_positive,
              negative: stats.driver_professional_negative
            },
            tasksCompleted: {
              positive: stats.driver_tasks_positive,
              negative: stats.driver_tasks_negative
            }
          },
          cargo: {
            complete: {
              positive: stats.cargo_complete_positive,
              negative: stats.cargo_complete_negative
            },
            correct: {
              positive: stats.cargo_correct_positive,
              negative: stats.cargo_correct_negative
            }
          },
          delivery: {
            notified: {
              positive: stats.delivery_notified_positive,
              negative: stats.delivery_notified_negative
            },
            onTime: {
              positive: stats.delivery_on_time_positive,
              negative: stats.delivery_on_time_negative
            }
          }
        },
        overallRatingPercentage: stats.overall_rating_percentage
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
    const authToken = request.cookies.get('authToken')?.value;
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    let userEmail
    try {
      userEmail = await validateSession(authToken);
      if (!userEmail) {
        return NextResponse.json({ 
          success: false, 
          error: 'Nieprawidłowy token' 
        }, { status: 401 })
      }
    } catch (error) {
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
    const transportResult = await db('transports')
      .where('id', transportId)
      .select('id', 'status')
      .first();
    
    if (!transportResult) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }

    const transport = transportResult
    
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
    const authToken = request.cookies.get('authToken')?.value;
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    let userEmail, isAdmin
    try {
      userEmail = await validateSession(authToken);
      if (!userEmail) {
        return NextResponse.json({ 
          success: false, 
          error: 'Nieprawidłowy token' 
        }, { status: 401 })
      }
      
      const user = await db('users').where('email', userEmail).first();
      isAdmin = user?.is_admin === true || user?.role === 'admin';
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowy token' 
      }, { status: 401 })
    }

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
import { NextResponse } from 'next/server'
import { query } from '../../../lib/db'
import jwt from 'jsonwebtoken'

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
    const token = request.cookies.get('auth_token')?.value
    let currentUserEmail = null
    let isAdmin = false
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        currentUserEmail = decoded.email
        isAdmin = decoded.isAdmin
      } catch (error) {
        console.error('Błąd weryfikacji tokenu:', error)
      }
    }

    // Sprawdź czy transport istnieje i czy można go ocenić
    const transportResult = await query(
      'SELECT id, status, created_at FROM transports WHERE id = $1',
      [transportId]
    )
    
    if (transportResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }

    const transport = transportResult.rows[0]
    
    // Transport można ocenić tylko jeśli ma status 'completed'
    const canBeRated = transport.status === 'completed'

    // Pobierz szczegółowe oceny transportu
    const ratingsResult = await query(`
      SELECT 
        id,
        rater_email,
        rated_at,
        driver_professional,
        driver_tasks_completed,
        cargo_complete,
        cargo_correct,
        delivery_notified,
        delivery_on_time,
        comment
      FROM transport_detailed_ratings 
      WHERE transport_id = $1
      ORDER BY rated_at DESC
    `, [transportId])

    // Sprawdź czy bieżący użytkownik już ocenił ten transport
    const userRating = ratingsResult.rows.find(rating => rating.rater_email === currentUserEmail)
    const hasUserRated = !!userRating

    // Pobierz statystyki z widoku
    const statsResult = await query(`
      SELECT * FROM transport_rating_summary WHERE transport_id = $1
    `, [transportId])

    const stats = statsResult.rows[0] || {
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

    return NextResponse.json({
      success: true,
      canBeRated: canBeRated && !hasUserRated,
      hasUserRated,
      userRating: userRating || null,
      ratings: ratingsResult.rows.map(rating => ({
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
        totalRatings: stats.total_ratings,
        categories: {
          driver: {
            professional: {
              positive: stats.driver_professional_positive,
              negative: stats.driver_professional_negative
            },
            tasksCompleted: {
              positive: stats.driver_tasks_positive,
              negative: stats.driver_tasks_negative
            }
          },
          cargo: {
            complete: {
              positive: stats.cargo_complete_positive,
              negative: stats.cargo_complete_negative
            },
            correct: {
              positive: stats.cargo_correct_positive,
              negative: stats.cargo_correct_negative
            }
          },
          delivery: {
            notified: {
              positive: stats.delivery_notified_positive,
              negative: stats.delivery_notified_negative
            },
            onTime: {
              positive: stats.delivery_on_time_positive,
              negative: stats.delivery_on_time_negative
            }
          }
        },
        overallRatingPercentage: stats.overall_rating_percentage
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
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    let userEmail
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      userEmail = decoded.email
    } catch (error) {
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
    const transportResult = await query(
      'SELECT id, status FROM transports WHERE id = $1',
      [transportId]
    )
    
    if (transportResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transport nie istnieje' 
      }, { status: 404 })
    }

    const transport = transportResult.rows[0]
    
    if (transport.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Można ocenić tylko ukończone transporty' 
      }, { status: 400 })
    }

    // Sprawdź czy użytkownik już ocenił ten transport
    const existingRating = await query(
      'SELECT id FROM transport_detailed_ratings WHERE transport_id = $1 AND rater_email = $2',
      [transportId, userEmail]
    )

    if (existingRating.rows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ten transport został już oceniony' 
      }, { status: 400 })
    }

    // Dodaj nową ocenę
    const result = await query(`
      INSERT INTO transport_detailed_ratings (
        transport_id,
        rater_email,
        driver_professional,
        driver_tasks_completed,
        cargo_complete,
        cargo_correct,
        delivery_notified,
        delivery_on_time,
        comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      transportId,
      userEmail,
      ratings.driverProfessional !== undefined ? ratings.driverProfessional : null,
      ratings.driverTasksCompleted !== undefined ? ratings.driverTasksCompleted : null,
      ratings.cargoComplete !== undefined ? ratings.cargoComplete : null,
      ratings.cargoCorrect !== undefined ? ratings.cargoCorrect : null,
      ratings.deliveryNotified !== undefined ? ratings.deliveryNotified : null,
      ratings.deliveryOnTime !== undefined ? ratings.deliveryOnTime : null,
      comment || null
    ])

    return NextResponse.json({
      success: true,
      message: 'Ocena została zapisana',
      ratingId: result.rows[0].id
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
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    let userEmail, isAdmin
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      userEmail = decoded.email
      isAdmin = decoded.isAdmin
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nieprawidłowy token' 
      }, { status: 401 })
    }

    // Sprawdź czy ocena istnieje i czy użytkownik ma prawo ją usunąć
    const ratingResult = await query(
      'SELECT id, rater_email FROM transport_detailed_ratings WHERE id = $1',
      [ratingId]
    )

    if (ratingResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ocena nie istnieje' 
      }, { status: 404 })
    }

    const rating = ratingResult.rows[0]
    
    // Użytkownik może usunąć tylko własną ocenę, admin może usunąć każdą
    if (!isAdmin && rating.rater_email !== userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak uprawnień do usunięcia tej oceny' 
      }, { status: 403 })
    }

    // Usuń ocenę
    await query('DELETE FROM transport_detailed_ratings WHERE id = $1', [ratingId])

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
