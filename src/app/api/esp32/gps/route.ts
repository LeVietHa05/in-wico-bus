import { NextRequest, NextResponse } from 'next/server';
import { setGPSData, getRouteHistory, updateRouteHistory, checkStopArrival } from '@/lib/store';
import { getRoutes } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routeId, routeHistoryId, lat, lng } = body;

    if (!routeId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields: routeId, lat, lng' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const data = { routeId, lat, lng, timestamp };
    setGPSData(data);

    let stopArrival = null;

    if (routeHistoryId) {
      const routes = await getRoutes();
      const route = routes.find((r) => r.id === routeId);
      if (route) {
        const result = checkStopArrival(routeHistoryId, lat, lng, route.stops);
        if (result && result.arrived) {
          const now = new Date().toISOString();
          const rh = getRouteHistory(routeHistoryId);
          if (rh && rh.stopsProgress[result.stopIndex]) {
            const updatedProgress = [...rh.stopsProgress];
            updatedProgress[result.stopIndex] = {
              ...updatedProgress[result.stopIndex],
              arrivalTime: now,
            };
            updateRouteHistory(routeHistoryId, { stopsProgress: updatedProgress });
            stopArrival = {
              stopIndex: result.stopIndex,
              stopName: result.stopName,
              arrivalTime: now,
            };
          }
        }
      }
    }

    return NextResponse.json({ success: true, data, stopArrival });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
