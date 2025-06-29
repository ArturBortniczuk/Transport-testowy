// src/database/db.js
import knex from 'knex';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Sprawdź, czy jesteśmy w fazie budowania
const isBuildPhase = process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.NEXT_RUNTIME;

// Funkcja do tworzenia połączenia z bazą danych
const createDbConnection = () => {
  // Jeśli jesteśmy w fazie budowania, zwróć mock zamiast prawdziwego połączenia
  if (isBuildPhase) {
    return {
      schema: {
        hasTable: () => Promise.resolve(false),
        createTable: () => Promise.resolve(),
        table: () => ({ timestamp: () => {} })
      },
      raw: () => Promise.resolve([[], []]),
      select: () => ({ where: () => ({ first: () => Promise.resolve({}) }) }),
      where: () => ({ update: () => Promise.resolve(1), first: () => Promise.resolve({}) }),
      insert: () => Promise.resolve([1]),
      count: () => ({ first: () => Promise.resolve({ count: 0 }) }),
      fn: { now: () => 'NOW()' }
    };
  }

  // W przeciwnym razie utwórz prawdziwe połączenie
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 1 // Redukcja dla środowiska serverless
    },
    acquireConnectionTimeout: 30000
  });
};

// Inicjalizacja połączenia
const db = createDbConnection();

// Inicjalizacja wszystkich tabel
const initializeDatabase = async () => {
  if (isBuildPhase) {
    return true;
  }
  
  try {
    // Tabela użytkowników
    const usersExists = await db.schema.hasTable('users');
    if (!usersExists) {
      await db.schema.createTable('users', table => {
        table.string('email').primary();
        table.string('name').notNullable();
        table.string('position').notNullable();
        table.string('phone');
        table.string('password').notNullable();
        table.string('role').notNullable();
        table.boolean('first_login').defaultTo(true);
        table.boolean('is_admin').defaultTo(false);
        table.text('permissions');
        table.string('mpk');
      });
    }

    // Tabela sesji
    const sessionsExists = await db.schema.hasTable('sessions');
    if (!sessionsExists) {
      await db.schema.createTable('sessions', table => {
        table.string('token').primary();
        table.string('user_id').notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('user_id').references('email').inTable('users');
      });
    }

    // Tabela transportów
    const transportsExists = await db.schema.hasTable('transports');
    if (!transportsExists) {
      await db.schema.createTable('transports', table => {
        table.increments('id').primary();
        table.string('source_warehouse').notNullable();
        table.string('destination_city').notNullable();
        table.string('postal_code');
        table.string('street');
        table.float('latitude');
        table.float('longitude');
        table.float('distance');
        table.integer('driver_id');
        table.integer('vehicle_id'); 
        table.string('status').defaultTo('active');
        table.string('wz_number');
        table.string('client_name');  // Nowe pole dla nazwy klienta/firmy
        table.string('market');
        table.string('loading_level');
        table.text('notes');
        table.boolean('is_cyclical').defaultTo(false);
        table.timestamp('delivery_date');
        table.timestamp('completed_at');
        table.string('requester_name');
        table.string('requester_email');
        table.string('mpk');
        table.text('goods_description');  // Nowe pole dla opisu towaru
        table.text('responsible_constructions');  // Nowe pole dla odpowiedzialnych budów
      });
    }

    const packagingsExists = await db.schema.hasTable('packagings');
    if (!packagingsExists) {
      await db.schema.createTable('packagings', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.float('weight');
        table.string('unit').defaultTo('kg');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    // Tabela ocen transportów
    const ratingsExists = await db.schema.hasTable('transport_ratings');
    if (!ratingsExists) {
      await db.schema.createTable('transport_ratings', table => {
        table.increments('id').primary();
        table.integer('transport_id').notNullable();
        table.string('rater_email').notNullable();
        table.string('rater_name');
        table.integer('rating').notNullable();
        table.text('comment');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('transport_id').references('id').inTable('transports');
        table.unique(['transport_id', 'rater_email']);
      });
      console.log('Tabela transport_ratings została utworzona');
    } else {
      console.log('Tabela transport_ratings już istnieje');
      
      // Sprawdź czy kolumna is_positive istnieje
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'transport_ratings' 
        AND table_schema = 'public'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      const hasIsPositive = columnNames.includes('is_positive');
      const hasRating = columnNames.includes('rating');
      
      if (!hasIsPositive) {
        await db.schema.table('transport_ratings', table => {
          table.boolean('is_positive').defaultTo(true);
        });
        
        // Migracja danych tylko jeśli stara kolumna istnieje
        if (hasRating) {
          const ratings = await db('transport_ratings').select('id', 'rating');
          for (const rating of ratings) {
            await db('transport_ratings')
              .where('id', rating.id)
              .update({ is_positive: rating.rating >= 3 });
          }
        }
      }
    }
    
    // Tabela budów
    const constructionsExists = await db.schema.hasTable('constructions');
    if (!constructionsExists) {
      await db.schema.createTable('constructions', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('mpk').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
    }
    
    // Tabela spedycji
    const spedycjeExists = await db.schema.hasTable('spedycje');
    if (!spedycjeExists) {
      await db.schema.createTable('spedycje', table => {
        table.increments('id').primary();
        table.string('status').defaultTo('new');
        table.string('order_number');
        table.string('created_by');
        table.string('created_by_email');
        table.string('responsible_person');
        table.string('responsible_email');
        table.string('mpk');
        table.string('location');
        table.text('location_data');
        table.text('delivery_data');
        table.string('loading_contact');
        table.string('unloading_contact');
        table.date('delivery_date');
        table.string('documents');
        table.text('notes');
        table.text('response_data');
        table.string('completed_by');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('completed_at');
        table.integer('distance_km');
        table.boolean('order_sent').defaultTo(false);
        table.timestamp('order_sent_at');
        table.string('order_sent_by');
        table.string('order_recipient');
        table.text('order_data');
        table.string('client_name');
        table.text('goods_description');
        table.text('responsible_constructions');
        table.text('merged_transports');
      });
    }

    // ISTNIEJĄCA Tabela kurierów - SPRAWDZAMY CZY ISTNIEJE, ALE NIE TWORZYMY PONOWNIE
    const kuriersExists = await db.schema.hasTable('kuriers');
    if (!kuriersExists) {
      await db.schema.createTable('kuriers', table => {
        table.increments('id').primary();
        table.string('status').defaultTo('new');
        table.string('created_by_email');
        table.string('magazine_source');
        table.string('magazine_destination');
        table.string('recipient_name');
        table.string('recipient_address');
        table.string('recipient_phone');
        table.string('package_description');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('completed_at');
        table.string('completed_by');
      });
      console.log('Tabela kuriers została utworzona');
    } else {
      console.log('Tabela kuriers już istnieje');
    }

    // NOWA: Tabela zapytań kurierskich
    const kurierQueriesExists = await db.schema.hasTable('kurier_queries');
    if (!kurierQueriesExists) {
      await db.schema.createTable('kurier_queries', table => {
        table.increments('id').primary();
        table.string('status').defaultTo('new'); // new, approved, rejected
        table.string('created_by_email').notNullable();
        table.string('created_by_name');
        
        // Podstawowe dane zapytania
        table.string('query_type').notNullable(); // pickup, delivery, info
        table.string('priority').defaultTo('normal'); // low, normal, high, urgent
        table.text('description').notNullable();
        
        // Lokalizacja
        table.string('address');
        table.string('city');
        table.string('postal_code');
        table.string('contact_person');
        table.string('contact_phone');
        table.string('contact_email');
        
        // Szczegóły przesyłki (opcjonalne)
        table.string('package_type'); // document, package, pallet
        table.float('weight');
        table.string('dimensions'); // "długość x szerokość x wysokość"
        table.integer('quantity').defaultTo(1);
        table.string('content_description');
        
        // Preferencje czasowe
        table.date('preferred_date');
        table.string('preferred_time'); // morning, afternoon, evening
        table.boolean('is_urgent').defaultTo(false);
        
        // Dane finansowe
        table.string('payment_method'); // company, cash, card
        table.float('estimated_cost');
        table.text('cost_notes');
        
        // Dodatkowe informacje
        table.text('special_instructions');
        table.text('internal_notes'); // Notatki dla administratorów
        
        // Dane przetwarzania
        table.string('processed_by'); // Email osoby która zaakceptowała
        table.timestamp('processed_at');
        table.text('processing_notes'); // Notatki z akceptacji/odrzucenia
        
        // Dane DHL (po zaakceptowaniu i wysłaniu)
        table.text('dhl_data'); // JSON z danymi DHL
        
        // Timestamps
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        // Indeksy
        table.index('status');
        table.index('created_by_email');
        table.index('query_type');
        table.index('created_at');
      });
      console.log('Tabela kurier_queries została utworzona');
    } else {
      console.log('Tabela kurier_queries już istnieje');
    }

    return true;
  } catch (error) {
    console.error('Błąd inicjalizacji bazy danych:', error);
    return false;
  }
};

// Funkcja do inicjalizacji użytkowników z pliku Excel
const initializeUsersFromExcel = async () => {
  if (isBuildPhase) {
    return;
  }
  
  try {
    // Sprawdź, czy w bazie już są użytkownicy
    const existingUsers = await db('users').count('* as count').first();
    if (existingUsers.count > 0) {
      console.log('Użytkownicy już istnieją w bazie danych');
      return;
    }

    const excelPath = path.join(process.cwd(), 'src', 'data', 'users.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.log('Plik users.xlsx nie istnieje - pomijam inicjalizację użytkowników');
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    for (const row of data) {
      try {
        await db('users').insert({
          email: row.email?.toLowerCase(),
          name: row.name,
          position: row.position,
          phone: row.phone,
          password: row.password,
          role: row.role,
          first_login: true,
          is_admin: row.is_admin === 'TRUE' || row.is_admin === true,
          permissions: row.permissions ? JSON.stringify(JSON.parse(row.permissions)) : null,
          mpk: row.mpk
        });
        console.log(`Dodano użytkownika: ${row.email}`);
      } catch (insertError) {
        console.error(`Błąd dodawania użytkownika ${row.email}:`, insertError.message);
      }
    }

    console.log('Inicjalizacja użytkowników z Excel zakończona');
  } catch (error) {
    console.error('Błąd inicjalizacji użytkowników z Excel:', error);
  }
};

// Funkcja do wyświetlania wszystkich użytkowników
const showAllUsers = async () => {
  if (isBuildPhase) {
    return;
  }
  
  try {
    const users = await db('users').select('*');
    console.log('Lista wszystkich użytkowników w bazie:', users.length);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Rola: ${user.role}, Admin: ${user.is_admin}`);
    });
  } catch (error) {
    console.error('Błąd pobierania użytkowników:', error);
  }
};

// Funkcja sprawdzająca tabelę transportów
const checkTransportsTable = async () => {
  try {
    const tableExists = await db.schema.hasTable('transports');
    if (!tableExists) {
      console.log('Tabela transports nie istnieje');
      return;
    }

    // Sprawdź kolumny
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transports' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columns.rows.map(row => row.column_name);
    console.log('Kolumny w tabeli transports:', columnNames);

    // Dodaj brakujące kolumny
    if (!columnNames.includes('goods_description')) {
      await db.schema.table('transports', table => {
        table.text('goods_description');
      });
      console.log('Dodano kolumnę goods_description do tabeli transports');
    }

    if (!columnNames.includes('responsible_constructions')) {
      await db.schema.table('transports', table => {
        table.text('responsible_constructions');
      });
      console.log('Dodano kolumnę responsible_constructions do tabeli transports');
    }

    if (!columnNames.includes('client_name')) {
      await db.schema.table('transports', table => {
        table.string('client_name');
      });
      console.log('Dodano kolumnę client_name do tabeli transports');
    }

  } catch (error) {
    console.error('Błąd sprawdzania tabeli transports:', error);
  }
};

// Funkcja sprawdzająca tabelę spedycji
const checkSpedycjeTable = async () => {
  try {
    const tableExists = await db.schema.hasTable('spedycje');
    if (!tableExists) {
      console.log('Tabela spedycje nie istnieje');
      return;
    }

    // Sprawdź kolumny
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'spedycje' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columns.rows.map(row => row.column_name);
    console.log('Kolumny w tabeli spedycje:', columnNames);

    // Sprawdź czy kolumna distance_km istnieje
    if (!columnNames.includes('distance_km')) {
      await db.schema.table('spedycje', table => {
        table.integer('distance_km');
      });
      console.log('Dodano kolumnę distance_km do tabeli spedycje');
    }
    
    // Sprawdź czy kolumny związane z zamówieniem istnieją
    if (!columnNames.includes('order_sent')) {
      await db.schema.table('spedycje', table => {
        table.boolean('order_sent').defaultTo(false);
        table.timestamp('order_sent_at');
        table.string('order_sent_by');
        table.string('order_recipient');
        table.text('order_data');
      });
      console.log('Dodano kolumny zamówienia do tabeli spedycje');
    }
    
    // Sprawdź czy nowe kolumny istnieją
    if (!columnNames.includes('client_name')) {
      await db.schema.table('spedycje', table => {
        table.string('client_name');
      });
      console.log('Dodano kolumnę client_name do tabeli spedycje');
    }
    
    if (!columnNames.includes('goods_description')) {
      await db.schema.table('spedycje', table => {
        table.text('goods_description');
      });
      console.log('Dodano kolumnę goods_description do tabeli spedycje');
    }
    
    if (!columnNames.includes('responsible_constructions')) {
      await db.schema.table('spedycje', table => {
        table.text('responsible_constructions');
      });
      console.log('Dodano kolumnę responsible_constructions do tabeli spedycje');
    }
  } catch (error) {
    console.error('Błąd sprawdzania tabeli spedycje:', error);
  }
};

// Funkcja sprawdzająca czy tabela transportów ma odpowiednie referencje dla ocen
const checkTransportsTableForRatings = async () => {
  try {
    // Sprawdź czy tabela transportów ma kolumnę ID
    const transportsExists = await db.schema.hasTable('transports');
    if (!transportsExists) {
      console.log('Tabela transportów nie istnieje - podstawowa wersja zostanie utworzona w initializeDatabase');
      return;
    }
    
    // Sprawdź czy mamy kolumnę status
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transports' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columns.rows.map(row => row.column_name);
    
    if (!columnNames.includes('status')) {
      await db.schema.table('transports', table => {
        table.string('status').defaultTo('active');
      });
      console.log('Dodano kolumnę status do tabeli transports');
    }
    
    if (!columnNames.includes('completed_at')) {
      await db.schema.table('transports', table => {
        table.timestamp('completed_at');
      });
      console.log('Dodano kolumnę completed_at do tabeli transports');
    }
    
  } catch (error) {
    console.error('Błąd sprawdzania tabeli transportów dla ocen:', error);
  }
};

// Funkcja sprawdzająca i tworząca tabele szczegółowych ocen
const checkDetailedRatingsTable = async () => {
  try {
    console.log('Sprawdzanie tabeli transport_detailed_ratings...');
    
    // Sprawdź czy tabela istnieje
    const tableExists = await db.schema.hasTable('transport_detailed_ratings');
    if (!tableExists) {
      console.log('Tworzenie tabeli transport_detailed_ratings...');
      
      await db.schema.createTable('transport_detailed_ratings', table => {
        table.increments('id').primary();
        table.integer('transport_id').notNullable();
        table.string('rater_email').notNullable();
        table.timestamp('rated_at').defaultTo(db.fn.now());
        
        // Kategoria: Kierowca
        table.boolean('driver_professional'); // Kierowca zachował się profesjonalnie wobec klienta
        table.boolean('driver_tasks_completed'); // Kierowca zrealizował wszystkie ustalone zadania
        
        // Kategoria: Towar
        table.boolean('cargo_complete'); // Towar był kompletny i zgodny z zamówieniem
        table.boolean('cargo_correct'); // Nie doszło do pomyłki – klient dostał właściwy towar
        
        // Kategoria: Organizacja dostawy
        table.boolean('delivery_notified'); // Dostawa została wcześniej awizowana u klienta
        table.boolean('delivery_on_time'); // Towar dotarł w ustalonym terminie
        
        // Dodatkowy komentarz
        table.text('comment');
        
        // Upewnij się, że jeden użytkownik może ocenić transport tylko raz
        table.unique(['transport_id', 'rater_email']);
        
        // Indeksy
        table.index('transport_id');
        table.index('rater_email');
        
        // Klucz obcy do tabeli transportów
        table.foreign('transport_id').references('id').inTable('transports').onDelete('CASCADE');
      });
      
      console.log('Tabela transport_detailed_ratings została utworzona');
    } else {
      console.log('Tabela transport_detailed_ratings już istnieje');
    }
    
    // Utwórz widok dla statystyk
    await createRatingSummaryView();
    
  } catch (error) {
    console.error('Błąd sprawdzania/tworzenia tabeli transport_detailed_ratings:', error);
  }
};

// Funkcja tworząca widok dla statystyk ocen
const createRatingSummaryView = async () => {
  try {
    console.log('Tworzenie widoku transport_rating_summary...');
    
    // Usuń widok jeśli istnieje (żeby móc go zaktualizować)
    await db.raw('DROP VIEW IF EXISTS transport_rating_summary');
    
    // Utwórz nowy widok
    await db.raw(`
      CREATE VIEW transport_rating_summary AS
      SELECT 
        transport_id,
        COUNT(*) as total_ratings,
        
        -- Statystyki dla kategorii Kierowca
        COUNT(CASE WHEN driver_professional = true THEN 1 END) as driver_professional_positive,
        COUNT(CASE WHEN driver_professional = false THEN 1 END) as driver_professional_negative,
        COUNT(CASE WHEN driver_tasks_completed = true THEN 1 END) as driver_tasks_positive,
        COUNT(CASE WHEN driver_tasks_completed = false THEN 1 END) as driver_tasks_negative,
        
        -- Statystyki dla kategorii Towar
        COUNT(CASE WHEN cargo_complete = true THEN 1 END) as cargo_complete_positive,
        COUNT(CASE WHEN cargo_complete = false THEN 1 END) as cargo_complete_negative,
        COUNT(CASE WHEN cargo_correct = true THEN 1 END) as cargo_correct_positive,
        COUNT(CASE WHEN cargo_correct = false THEN 1 END) as cargo_correct_negative,
        
        -- Statystyki dla kategorii Organizacja dostawy
        COUNT(CASE WHEN delivery_notified = true THEN 1 END) as delivery_notified_positive,
        COUNT(CASE WHEN delivery_notified = false THEN 1 END) as delivery_notified_negative,
        COUNT(CASE WHEN delivery_on_time = true THEN 1 END) as delivery_on_time_positive,
        COUNT(CASE WHEN delivery_on_time = false THEN 1 END) as delivery_on_time_negative,
        
        -- Ogólny wynik (średnia wszystkich pozytywnych ocen)
        ROUND(
          (
            COUNT(CASE WHEN driver_professional = true THEN 1 END) +
            COUNT(CASE WHEN driver_tasks_completed = true THEN 1 END) +
            COUNT(CASE WHEN cargo_complete = true THEN 1 END) +
            COUNT(CASE WHEN cargo_correct = true THEN 1 END) +
            COUNT(CASE WHEN delivery_notified = true THEN 1 END) +
            COUNT(CASE WHEN delivery_on_time = true THEN 1 END)
          )::decimal / 
          NULLIF(
            COUNT(CASE WHEN driver_professional IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN driver_tasks_completed IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN cargo_complete IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN cargo_correct IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN delivery_notified IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN delivery_on_time IS NOT NULL THEN 1 END), 0
          ) * 100, 1
        ) as overall_rating_percentage
        
      FROM transport_detailed_ratings
      GROUP BY transport_id
    `);
    
    console.log('Widok transport_rating_summary został utworzony');
    
  } catch (error) {
    console.error('Błąd tworzenia widoku transport_rating_summary:', error);
  }
};

// NOWA FUNKCJA: Sprawdź i dodaj uprawnienia do zapytań kurierskich
const checkKurierQueryPermissions = async () => {
  if (isBuildPhase) {
    return;
  }
  
  try {
    console.log('Sprawdzanie uprawnień do zapytań kurierskich...');
    
    // Pobierz wszystkich użytkowników
    const users = await db('users').select('email', 'role', 'permissions');
    
    for (const user of users) {
      let permissions = {};
      let needsUpdate = false;
      
      try {
        if (user.permissions && typeof user.permissions === 'string') {
          permissions = JSON.parse(user.permissions);
        }
      } catch (error) {
        console.error('Błąd parsowania uprawnień dla użytkownika:', user.email);
        permissions = {};
      }

      // Sprawdź czy ma już uprawnienia do zapytań kurierskich
      if (!permissions.kurier) {
        permissions.kurier = {
          queries: {
            add: true, // Każdy może dodawać zapytania
            approve: user.role === 'admin' ? true : false, // Domyślnie tylko admin może akceptować
            view: true, // Każdy może przeglądać swoje zapytania
            viewAll: user.role === 'admin' ? true : false // Tylko admin może widzieć wszystkie
          }
        };
        needsUpdate = true;
      } else if (!permissions.kurier.queries) {
        permissions.kurier.queries = {
          add: true,
          approve: user.role === 'admin' ? true : false,
          view: true,
          viewAll: user.role === 'admin' ? true : false
        };
        needsUpdate = true;
      }

      // Zaktualizuj jeśli potrzeba
      if (needsUpdate) {
        await db('users')
          .where('email', user.email)
          .update({
            permissions: JSON.stringify(permissions)
          });

        console.log(`✅ Dodano uprawnienia kuriera dla: ${user.email} (rola: ${user.role})`);
      }
    }
    
    console.log('Sprawdzenie uprawnień kurierskich zakończone');
  } catch (error) {
    console.error('Błąd sprawdzania uprawnień kurierskich:', error);
  }
};

// Wykonaj inicjalizację asynchronicznie tylko jeśli nie jesteśmy w fazie budowania
if (!isBuildPhase) {
  (async () => {
    try {
      await initializeDatabase();
      await initializeUsersFromExcel();
      await showAllUsers();
      await checkTransportsTable();
      await checkSpedycjeTable();
      
      // Wywołania dla szczegółowych ocen:
      await checkTransportsTableForRatings();
      await checkDetailedRatingsTable();
      
      // NOWE: Sprawdź uprawnienia do zapytań kurierskich
      await checkKurierQueryPermissions();
      
      console.log('Wszystkie tabele zostały sprawdzone i utworzone');
    } catch (error) {
      console.error('Błąd inicjalizacji:', error);
    }
  })();
}

export default db;
