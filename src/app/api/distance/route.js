// src/app/api/distance/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origins = searchParams.get('origins');
  const destinations = searchParams.get('destinations');
  const waypoints = searchParams.get('waypoints');
  
  if (!origins || !destinations) {
    return NextResponse.json({ 
      error: 'Missing origins or destinations parameters' 
    }, { status: 400 });
  }
  
  try {
    // Jeśli są waypoints, używamy Directions API
    if (waypoints) {
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origins}&destination=${destinations}&waypoints=${waypoints}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      
      const directionsResponse = await fetch(directionsUrl);
      const directionsData = await directionsResponse.json();
      
      if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
        const route = directionsData.routes[0];
        const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
        const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);
        
        // Formatuj odpowiedź jak Distance Matrix API
        return NextResponse.json({
          status: 'OK',
          rows: [{
            elements: [{
              status: 'OK',
              distance: {
                value: totalDistance,
                text: `${Math.round(totalDistance / 1000)} km`
              },
              duration: {
                value: totalDuration,
                text: `${Math.round(totalDuration / 60)} min`
              }
            }]
          }]
        });
      } else {
        return NextResponse.json({
          status: directionsData.status || 'ERROR',
          error: 'No routes found'
        });
      }
    } else {
      // Standardowe Distance Matrix API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error fetching distance:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch distance data' 
    }, { status: 500 });
  }
}