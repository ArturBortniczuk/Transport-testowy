// src/app/api/spedycje/multi-response/route.js
import { NextResponse } from 'next/server'
import db from '@/database/db'

export async function POST(request) {
  try {
    const requestData = await request.json()
    console.log('=== MULTI-RESPONSE API START ===')
    console.log('Otrzymane dane:', JSON.stringify(requestData, null, 2))

    const {
      transportIds,
      routeSequence,
      driverInfo,
      totalPrice,
      priceBreakdown,
      transportDate,
      notes,
      cargoDescription,
      totalWeight,
      totalDistance,
      isMerged
    } = requestData

    // Walidacja danych
    if (!transportIds || !Array.isArray(transportIds) || transportIds.length === 0) {
      console.log('❌ Błąd: Nie wybrano transportów')
      return NextResponse.json({
        success: false,
        error: 'Nie wybrano żadnych transportów'
      }, { status: 400 })
    }

    if (!driverInfo?.name || !driverInfo?.phone || !totalPrice || !transportDate) {
      console.log('❌ Błąd: Brak wymaganych pól:', { 
        driverName: driverInfo?.name, 
        driverPhone: driverInfo?.phone, 
        totalPrice, 
        transportDate 
      })
      return NextResponse.json({
        success: false,
        error: 'Wymagane pola nie zostały wypełnione'
      }, { status: 400 })
    }

    // Sprawdź wszystkie transporty w bazie (bez filtra statusu)
    console.log('🔍 Sprawdzanie transportów o ID:', transportIds)
    const allTransports = await db('spedycje')
      .whereIn('id', transportIds)
      .select('id', 'status', 'order_number', 'mpk', 'delivery_date')

    console.log('📋 Znalezione transporty:', allTransports)

    if (allTransports.length !== transportIds.length) {
      const foundIds = allTransports.map(t => t.id)
      const missingIds = transportIds.filter(id => !foundIds.includes(parseInt(id)))
      
      console.log('❌ Brakujące transporty:', missingIds)
      return NextResponse.json({
        success: false,
        error: `Transporty o ID: ${missingIds.join(', ')} nie istnieją w bazie danych`
      }, { status: 400 })
    }

    // Sprawdź czy transporty mają odpowiedni status
    const newTransports = allTransports.filter(t => t.status === 'new')
    if (newTransports.length !== transportIds.length) {
      const nonNewTransports = allTransports.filter(t => t.status !== 'new')
      console.log('⚠️ Transporty z niewłaściwym statusem:', nonNewTransports)
      
      return NextResponse.json({
        success: false,
        error: `Niektóre transporty zostały już przetworzone. Transporty o ID: ${nonNewTransports.map(t => `${t.id} (status: ${t.status})`).join(', ')}`
      }, { status: 400 })
    }

    const currentTime = new Date().toISOString()
    console.log('✅ Wszystkie transporty są dostępne, zapisuję odpowiedź...')

    // Jeśli jest to odpowiedź na jeden transport
    if (transportIds.length === 1) {
      const transportId = transportIds[0]
      const transport = allTransports[0]
      
      console.log('📝 Zapisuję odpowiedź dla pojedynczego transportu:', transportId)
      
      // Przygotuj dane odpowiedzi
      const responseData = {
        driverName: driverInfo.name,
        driverPhone: driverInfo.phone,
        vehicleNumber: driverInfo.vehicleNumber || null,
        deliveryPrice: parseFloat(totalPrice),
        distance: totalDistance || null,
        notes: notes || null,
        cargoDescription: cargoDescription || null,
        totalWeight: totalWeight || null,
        newDeliveryDate: transportDate !== transport.delivery_date ? transportDate : null,
        dateChanged: transportDate !== transport.delivery_date,
        routeSequence: routeSequence || []
      }

      // Zaktualizuj transport
      const updateResult = await db('spedycje')
        .where('id', transportId)
        .update({
          status: 'responded',
          response_data: JSON.stringify(responseData),
          driver_name: driverInfo.name,
          driver_phone: driverInfo.phone,
          vehicle_number: driverInfo.vehicleNumber || null,
          transport_date: transportDate,
          transport_price: parseFloat(totalPrice),
          total_distance: totalDistance || null,
          total_weight: totalWeight || null,
          cargo_description: cargoDescription || null,
          route_sequence: JSON.stringify(routeSequence || []),
          is_merged: false,
          responded_at: currentTime,
          updated_at: currentTime
        })

      console.log('✅ Transport zaktualizowany, affected rows:', updateResult)

      return NextResponse.json({
        success: true,
        message: 'Odpowiedź została zapisana'
      })
    }

    // Jeśli jest to łączenie transportów (więcej niż 1)
    else {
      console.log('🔗 Zapisuję odpowiedź dla połączonych transportów:', transportIds.length)
      
      // Pobierz szczegółowe dane wszystkich transportów
      const transportsDetails = await db('spedycje')
        .whereIn('id', transportIds)
        .select('*')

      console.log('📊 Szczegółowe dane transportów:', transportsDetails.length)

      // Przygotuj dane dla głównego transportu (pierwszy z listy)
      const mainTransportId = parseInt(transportIds[0])
      const mainTransport = transportsDetails.find(t => t.id === mainTransportId)

      // Przygotuj dane o połączonych transportach
      const mergedTransportsData = {
        originalTransports: transportsDetails.slice(1).map(transport => ({
          id: transport.id,
          orderNumber: transport.order_number,
          mpk: transport.mpk,
          location: transport.location,
          location_data: transport.location_data,
          delivery_data: transport.delivery_data,
          loading_contact: transport.loading_contact,
          unloading_contact: transport.unloading_contact,
          documents: transport.documents,
          notes: transport.notes,
          goods_description: transport.goods_description,
          clientName: transport.client_name || transport.responsible_person,
          costAssigned: priceBreakdown ? (priceBreakdown[transport.id] || 0) : 0,
          distance: transport.distance_km || 0
        })),
        totalDistance: totalDistance || 0,
        mainTransportCost: priceBreakdown ? (priceBreakdown[mainTransportId] || 0) : parseFloat(totalPrice),
        totalMergedCost: parseFloat(totalPrice),
        mergedAt: currentTime,
        mergedBy: 'system'
      }

      // Przygotuj dane odpowiedzi dla głównego transportu
      const mainResponseData = {
        driverName: driverInfo.name,
        driverPhone: driverInfo.phone,
        vehicleNumber: driverInfo.vehicleNumber || null,
        deliveryPrice: parseFloat(totalPrice),
        distance: totalDistance || null,
        notes: notes || null,
        cargoDescription: cargoDescription || null,
        totalWeight: totalWeight || null,
        newDeliveryDate: transportDate !== mainTransport.delivery_date ? transportDate : null,
        dateChanged: transportDate !== mainTransport.delivery_date,
        isMerged: true,
        costBreakdown: priceBreakdown || {},
        mergedTransportIds: transportIds,
        routeSequence: routeSequence || []
      }

      // Rozpocznij transakcję
      await db.transaction(async (trx) => {
        console.log('🔄 Rozpoczynam transakcję...')
        
        // Zaktualizuj główny transport
        const mainUpdateResult = await trx('spedycje')
          .where('id', mainTransportId)
          .update({
            status: 'responded',
            response_data: JSON.stringify(mainResponseData),
            merged_transports: JSON.stringify(mergedTransportsData),
            driver_name: driverInfo.name,
            driver_phone: driverInfo.phone,
            vehicle_number: driverInfo.vehicleNumber || null,
            transport_date: transportDate,
            transport_price: parseFloat(totalPrice),
            total_distance: totalDistance || null,
            total_weight: totalWeight || null,
            cargo_description: cargoDescription || null,
            route_sequence: JSON.stringify(routeSequence || []),
            cost_breakdown: JSON.stringify(priceBreakdown || {}),
            is_merged: true,
            responded_at: currentTime,
            updated_at: currentTime
          })

        console.log('✅ Główny transport zaktualizowany:', mainUpdateResult)

        // Zaktualizuj pozostałe transporty jako połączone
        const otherTransportIds = transportIds.slice(1).map(id => parseInt(id))
        
        for (const transportId of otherTransportIds) {
          const transportPrice = priceBreakdown ? (priceBreakdown[transportId] || 0) : 0
          
          const otherResponseData = {
            driverName: driverInfo.name,
            driverPhone: driverInfo.phone,
            vehicleNumber: driverInfo.vehicleNumber || null,
            deliveryPrice: parseFloat(transportPrice),
            distance: null,
            notes: `Transport połączony z #${mainTransportId}. ${notes || ''}`.trim(),
            cargoDescription: cargoDescription || null,
            totalWeight: null,
            newDeliveryDate: transportDate,
            dateChanged: true,
            isMerged: true,
            isSecondaryMerged: true,
            mainTransportId: mainTransportId,
            costBreakdown: priceBreakdown || {},
            routeSequence: routeSequence || []
          }

          const otherUpdateResult = await trx('spedycje')
            .where('id', transportId)
            .update({
              status: 'responded',
              response_data: JSON.stringify(otherResponseData),
              merged_transports: JSON.stringify({
                isSecondary: true,
                mainTransportId: mainTransportId,
                mergedAt: currentTime
              }),
              driver_name: driverInfo.name,
              driver_phone: driverInfo.phone,
              vehicle_number: driverInfo.vehicleNumber || null,
              transport_date: transportDate,
              transport_price: parseFloat(transportPrice),
              total_distance: null,
              total_weight: null,
              cargo_description: cargoDescription || null,
              route_sequence: JSON.stringify(routeSequence || []),
              cost_breakdown: JSON.stringify(priceBreakdown || {}),
              is_merged: true,
              main_transport_id: mainTransportId,
              responded_at: currentTime,
              updated_at: currentTime
            })

          console.log(`✅ Transport ${transportId} zaktualizowany:`, otherUpdateResult)
        }
      })

      console.log('✅ Transakcja zakończona pomyślnie')

      return NextResponse.json({
        success: true,
        message: `Odpowiedź została zapisana dla ${transportIds.length} połączonych transportów`,
        mainTransportId: mainTransportId,
        mergedCount: transportIds.length
      })
    }

  } catch (error) {
    console.error('❌ Błąd zapisywania odpowiedzi zbiorczej:', error)
    console.error('Stack trace:', error.stack)
    
    return NextResponse.json({
      success: false,
      error: 'Błąd serwera: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
