// src/app/api/spedycje/multi-response/route.js
import { NextResponse } from 'next/server'
import db from '@/database/db'

export async function POST(request) {
  try {
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
    } = await request.json()

    console.log('Otrzymane dane odpowiedzi zbiorczej:', {
      transportIds,
      isMerged,
      driverInfo,
      totalPrice
    })

    // Walidacja danych
    if (!transportIds || !Array.isArray(transportIds) || transportIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nie wybrano żadnych transportów'
      }, { status: 400 })
    }

    if (!driverInfo?.name || !driverInfo?.phone || !totalPrice || !transportDate) {
      return NextResponse.json({
        success: false,
        error: 'Wymagane pola nie zostały wypełnione'
      }, { status: 400 })
    }

    // Sprawdź czy wszystkie transporty istnieją i mają status 'new'
    const existingTransports = await db('spedycje')
      .whereIn('id', transportIds)
      .where('status', 'new')

    console.log('Znalezione transporty:', existingTransports.length, 'z', transportIds.length, 'oczekiwanych')

    if (existingTransports.length !== transportIds.length) {
      const foundIds = existingTransports.map(t => t.id)
      const missingIds = transportIds.filter(id => !foundIds.includes(id))
      
      return NextResponse.json({
        success: false,
        error: `Transporty o ID: ${missingIds.join(', ')} nie istnieją lub zostały już przetworzone`
      }, { status: 400 })
    }

    const currentTime = new Date().toISOString()

    // Jeśli jest to odpowiedź na jeden transport (nie łączenie)
    if (transportIds.length === 1) {
      const transportId = transportIds[0]
      
      // Przygotuj dane odpowiedzi
      const responseData = {
        driverName: driverInfo.name,
        driverPhone: driverInfo.phone,
        vehicleNumber: driverInfo.vehicleNumber || null,
        deliveryPrice: totalPrice,
        distance: totalDistance || null,
        notes: notes || null,
        cargoDescription: cargoDescription || null,
        totalWeight: totalWeight || null,
        newDeliveryDate: transportDate !== existingTransports[0].delivery_date ? transportDate : null,
        dateChanged: transportDate !== existingTransports[0].delivery_date,
        routeSequence: routeSequence || []
      }

      // Zaktualizuj transport
      await db('spedycje')
        .where('id', transportId)
        .update({
          status: 'responded',
          response_data: JSON.stringify(responseData),
          driver_name: driverInfo.name,
          driver_phone: driverInfo.phone,
          vehicle_number: driverInfo.vehicleNumber || null,
          transport_date: transportDate,
          transport_price: totalPrice,
          total_distance: totalDistance || null,
          total_weight: totalWeight || null,
          cargo_description: cargoDescription || null,
          route_sequence: JSON.stringify(routeSequence || []),
          is_merged: false,
          responded_at: currentTime,
          updated_at: currentTime
        })

      return NextResponse.json({
        success: true,
        message: 'Odpowiedź została zapisana'
      })
    }

    // Jeśli jest to łączenie transportów (więcej niż 1)
    else {
      // Pobierz szczegółowe dane wszystkich transportów
      const transportsDetails = await db('spedycje')
        .whereIn('id', transportIds)
        .select('*')

      // Przygotuj dane dla głównego transportu (pierwszy z listy)
      const mainTransportId = transportIds[0]
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
          costAssigned: priceBreakdown ? priceBreakdown[transport.id] : 0,
          distance: transport.distance_km || 0
        })),
        totalDistance: totalDistance || 0,
        mainTransportCost: priceBreakdown ? priceBreakdown[mainTransportId] : totalPrice,
        totalMergedCost: totalPrice,
        mergedAt: currentTime,
        mergedBy: 'system'
      }

      // Przygotuj dane odpowiedzi dla głównego transportu
      const mainResponseData = {
        driverName: driverInfo.name,
        driverPhone: driverInfo.phone,
        vehicleNumber: driverInfo.vehicleNumber || null,
        deliveryPrice: totalPrice,
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
        // Zaktualizuj główny transport
        await trx('spedycje')
          .where('id', mainTransportId)
          .update({
            status: 'responded',
            response_data: JSON.stringify(mainResponseData),
            merged_transports: JSON.stringify(mergedTransportsData),
            driver_name: driverInfo.name,
            driver_phone: driverInfo.phone,
            vehicle_number: driverInfo.vehicleNumber || null,
            transport_date: transportDate,
            transport_price: totalPrice,
            total_distance: totalDistance || null,
            total_weight: totalWeight || null,
            cargo_description: cargoDescription || null,
            route_sequence: JSON.stringify(routeSequence || []),
            cost_breakdown: JSON.stringify(priceBreakdown || {}),
            is_merged: true,
            responded_at: currentTime,
            updated_at: currentTime
          })

        // Zaktualizuj pozostałe transporty jako połączone
        const otherTransportIds = transportIds.slice(1)
        
        for (const transportId of otherTransportIds) {
          const transportPrice = priceBreakdown ? priceBreakdown[transportId] : 0
          
          const otherResponseData = {
            driverName: driverInfo.name,
            driverPhone: driverInfo.phone,
            vehicleNumber: driverInfo.vehicleNumber || null,
            deliveryPrice: transportPrice,
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

          await trx('spedycje')
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
              transport_price: transportPrice,
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
        }
      })

      return NextResponse.json({
        success: true,
        message: `Odpowiedź została zapisana dla ${transportIds.length} połączonych transportów`,
        mainTransportId: mainTransportId,
        mergedCount: transportIds.length
      })
    }

  } catch (error) {
    console.error('Błąd zapisywania odpowiedzi zbiorczej:', error)
    return NextResponse.json({
      success: false,
      error: 'Błąd serwera: ' + error.message
    }, { status: 500 })
  }
}
