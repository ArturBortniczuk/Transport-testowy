// src/database/kuriers-migration.js
// 🚀 MIGRACJA TABELI KURIERS - Dodaje wszystkie potrzebne kolumny

import db from './db.js'

// Funkcja sprawdzająca czy kolumna istnieje
const checkColumnExists = async (tableName, columnName) => {
  try {
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? 
      AND column_name = ?
      AND table_schema = 'public'
    `, [tableName, columnName])
    
    return columns.rows.length > 0
  } catch (error) {
    console.error(`Błąd sprawdzania kolumny ${columnName}:`, error)
    return false
  }
}

// Główna funkcja migracji
export const migrateKuriersTable = async () => {
  try {
    console.log('🔄 Rozpoczynam migrację tabeli kuriers...')
    
    const tableExists = await db.schema.hasTable('kuriers')
    if (!tableExists) {
      console.log('❌ Tabela kuriers nie istnieje - tworzę...')
      await createKuriersTable()
      return
    }

    // Lista wszystkich kolumn do sprawdzenia
    const columnsToAdd = [
      // Podstawowe dane
      { name: 'order_type', type: 'string', defaultValue: 'other' },
      { name: 'magazine_source', type: 'string', defaultValue: 'other' },
      
      // Dane nadawcy
      { name: 'sender_name', type: 'string' },
      { name: 'sender_company', type: 'string' },
      { name: 'sender_street', type: 'string' },
      { name: 'sender_house_number', type: 'string' },
      { name: 'sender_apartment_number', type: 'string' },
      { name: 'sender_city', type: 'string' },
      { name: 'sender_postcode', type: 'string' },
      { name: 'sender_country', type: 'string', defaultValue: 'PL' },
      { name: 'sender_phone', type: 'string' },
      { name: 'sender_email', type: 'string' },
      { name: 'sender_contact_person', type: 'string' },
      
      // Dane odbiorcy (niektóre już istnieją)
      { name: 'recipient_name', type: 'string' },
      { name: 'recipient_company', type: 'string' },
      { name: 'recipient_street', type: 'string' },
      { name: 'recipient_house_number', type: 'string' },
      { name: 'recipient_apartment_number', type: 'string' },
      { name: 'recipient_city', type: 'string' },
      { name: 'recipient_postcode', type: 'string' },
      { name: 'recipient_country', type: 'string', defaultValue: 'PL' },
      { name: 'recipient_phone', type: 'string' },
      { name: 'recipient_email', type: 'string' },
      { name: 'recipient_contact_person', type: 'string' },
      
      // Szczegóły przesyłki
      { name: 'package_contents', type: 'text' },
      { name: 'mpk', type: 'string' },
      { name: 'notes_general', type: 'text' },
      
      // Dane paczki
      { name: 'package_weight', type: 'decimal', precision: [8, 2] },
      { name: 'package_length', type: 'integer' },
      { name: 'package_width', type: 'integer' },
      { name: 'package_height', type: 'integer' },
      { name: 'package_type', type: 'string', defaultValue: 'PACKAGE' },
      { name: 'package_quantity', type: 'integer', defaultValue: 1 },
      { name: 'package_non_standard', type: 'boolean', defaultValue: false },
      
      // Usługa DHL
      { name: 'service_type', type: 'string', defaultValue: 'AH' },
      
      // Usługi dodatkowe
      { name: 'insurance_requested', type: 'boolean', defaultValue: false },
      { name: 'insurance_amount', type: 'decimal', precision: [10, 2] },
      { name: 'cod_requested', type: 'boolean', defaultValue: false },
      { name: 'cod_amount', type: 'decimal', precision: [10, 2] },
      { name: 'saturday_delivery', type: 'boolean', defaultValue: false },
      { name: 'evening_delivery', type: 'boolean', defaultValue: false },
      
      // Dane międzynarodowe
      { name: 'is_international', type: 'boolean', defaultValue: false },
      { name: 'customs_type', type: 'string' },
      { name: 'customs_value', type: 'decimal', precision: [10, 2] },
      
      // Kalkulacja cen
      { name: 'estimated_cost', type: 'decimal', precision: [10, 2] },
      { name: 'pricing_data', type: 'text' },
      
      // Dane JSON
      { name: 'packages_details', type: 'text' },
      { name: 'postal_services_data', type: 'text' },
      
      // Metadane (niektóre już istnieją)
      { name: 'status', type: 'string', defaultValue: 'new' },
      { name: 'created_by_email', type: 'string' },
      { name: 'created_by_name', type: 'string' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ]

    let addedColumns = 0

    // Sprawdź i dodaj każdą kolumnę
    for (const column of columnsToAdd) {
      const exists = await checkColumnExists('kuriers', column.name)
      
      if (!exists) {
        await addColumn(column)
        addedColumns++
        console.log(`✅ Dodano kolumnę ${column.name}`)
      } else {
        console.log(`⭐ Kolumna ${column.name} już istnieje`)
      }
    }

    console.log(`🎉 Migracja zakończona! Dodano ${addedColumns} nowych kolumn`)

  } catch (error) {
    console.error('❌ Błąd podczas migracji tabeli kuriers:', error)
    throw error
  }
}

// Funkcja dodawania kolumny
const addColumn = async (column) => {
  await db.schema.table('kuriers', table => {
    let col

    switch (column.type) {
      case 'string':
        col = table.string(column.name)
        break
      case 'text':
        col = table.text(column.name)
        break
      case 'integer':
        col = table.integer(column.name)
        break
      case 'decimal':
        col = table.decimal(column.name, ...(column.precision || [10, 2]))
        break
      case 'boolean':
        col = table.boolean(column.name)
        break
      case 'timestamp':
        col = table.timestamp(column.name)
        break
      case 'date':
        col = table.date(column.name)
        break
      case 'time':
        col = table.time(column.name)
        break
      default:
        col = table.string(column.name)
    }

    // Dodaj wartość domyślną jeśli określona
    if (column.defaultValue !== undefined) {
      if (column.type === 'timestamp' && column.defaultValue === 'now') {
        col.defaultTo(db.fn.now())
      } else {
        col.defaultTo(column.defaultValue)
      }
    }
  })
}

// Funkcja tworząca tabelę od zera (jeśli nie istnieje)
const createKuriersTable = async () => {
  await db.schema.createTable('kuriers', table => {
    table.increments('id').primary()
    
    // Podstawowe dane
    table.string('order_type').defaultTo('other')
    table.string('magazine_source').defaultTo('other')
    
    // Dane nadawcy
    table.string('sender_name')
    table.string('sender_company')
    table.string('sender_street')
    table.string('sender_house_number')
    table.string('sender_apartment_number')
    table.string('sender_city')
    table.string('sender_postcode')
    table.string('sender_country').defaultTo('PL')
    table.string('sender_phone')
    table.string('sender_email')
    table.string('sender_contact_person')
    
    // Dane odbiorcy
    table.string('recipient_name')
    table.string('recipient_company')
    table.string('recipient_street')
    table.string('recipient_house_number')
    table.string('recipient_apartment_number')
    table.string('recipient_city')
    table.string('recipient_postcode')
    table.string('recipient_country').defaultTo('PL')
    table.string('recipient_phone')
    table.string('recipient_email')
    table.string('recipient_contact_person')
    
    // Szczegóły przesyłki
    table.text('package_contents')
    table.string('mpk')
    table.text('notes_general')
    
    // Dane paczki
    table.decimal('package_weight', 8, 2)
    table.integer('package_length')
    table.integer('package_width')
    table.integer('package_height')
    table.string('package_type').defaultTo('PACKAGE')
    table.integer('package_quantity').defaultTo(1)
    table.boolean('package_non_standard').defaultTo(false)
    
    // Usługa DHL
    table.string('service_type').defaultTo('AH')
    
    // Usługi dodatkowe
    table.boolean('insurance_requested').defaultTo(false)
    table.decimal('insurance_amount', 10, 2)
    table.boolean('cod_requested').defaultTo(false)
    table.decimal('cod_amount', 10, 2)
    table.boolean('saturday_delivery').defaultTo(false)
    table.boolean('evening_delivery').defaultTo(false)
    
    // Dane międzynarodowe
    table.boolean('is_international').defaultTo(false)
    table.string('customs_type')
    table.decimal('customs_value', 10, 2)
    
    // Kalkulacja cen
    table.decimal('estimated_cost', 10, 2)
    table.text('pricing_data')
    
    // Dane JSON
    table.text('packages_details')
    table.text('postal_services_data')
    
    // Metadane
    table.string('status').defaultTo('new')
    table.string('created_by_email')
    table.string('created_by_name')
    table.timestamp('created_at').defaultTo(db.fn.now())
    table.timestamp('updated_at').defaultTo(db.fn.now())
  })

  console.log('✅ Tabela kuriers została utworzona od zera')
}

// Funkcja dla testowania migracji
export const testMigration = async () => {
  try {
    console.log('🧪 Test migracji...')
    await migrateKuriersTable()
    
    // Sprawdź czy tabela została utworzona prawidłowo
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'kuriers' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Struktura tabeli kuriers:')
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
    })
    
    console.log('🎉 Test migracji zakończony pomyślnie!')
    
  } catch (error) {
    console.error('❌ Błąd testu migracji:', error)
  }
}

export default migrateKuriersTable
