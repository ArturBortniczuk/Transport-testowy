// src/app/api/transport-ratings/comment/route.js
import { NextResponse } from 'next/server'
import db from '@/database/db'

// Funkcja pomocnicza do weryfikacji sesji i pobrania emaila
const getUserEmailFromToken = async (authToken) => {
  if (!authToken) {
    return null;
  }
  
  try {
    const session = await db('sessions')
      .where('token', authToken)
      .whereRaw('expires_at > NOW()')
      .select('user_id')
      .first();
    
    return session?.user_id || null;
  } catch (error) {
    console.error('Błąd walidacji sesji:', error)
    return null
  }
};

export async function POST(request) {
  try {
    const authToken = request.cookies.get('authToken')?.value
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brak autoryzacji' 
      }, { status: 401 })
    }

    const userEmail = await getUserEmailFromToken(authToken);
    if (!userEmail) {
      return NextResponse.json({success: false, 
       error: 'Nieprawidłowa sesja' 
     }, { status: 401 })
   }

   const { transportId, comment } = await request.json()
   
   if (!transportId || !comment || !comment.trim()) {
     return NextResponse.json({ 
       success: false, 
       error: 'Brak wymaganych danych' 
     }, { status: 400 })
   }

   // Sprawdź czy transport istnieje
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
       error: 'Można komentować tylko ukończone transporty' 
     }, { status: 400 })
   }

   // Sprawdź czy tabela szczegółowych ocen istnieje
   const tableExists = async (tableName) => {
     try {
       await db.raw(`SELECT 1 FROM ${tableName} LIMIT 1`);
       return true;
     } catch (error) {
       return false;
     }
   };

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

   // Dodaj komentarz jako nowy wpis (każdy użytkownik może dodać swój komentarz)
   const commentData = {
     transport_id: transportId,
     rater_email: userEmail,
     comment: comment.trim(),
     rated_at: new Date(),
     // Pozostałe pola oceny pozostaw jako null dla samych komentarzy
     driver_professional: null,
     driver_tasks_completed: null,
     cargo_complete: null,
     cargo_correct: null,
     delivery_notified: null,
     delivery_on_time: null
   };

   await db('transport_detailed_ratings').insert(commentData);

   return NextResponse.json({
     success: true,
     message: 'Komentarz został dodany'
   })

 } catch (error) {
   console.error('Błąd dodawania komentarza:', error)
   
   return NextResponse.json({ 
     success: false, 
     error: 'Wystąpił błąd podczas dodawania komentarza' 
   }, { status: 500 })
 }
}
