import { NextRequest, NextResponse } from 'next/server';
import {
  getNavState, setNavState, getGPSData, getAttendance,
  setRouteHistory, getRouteHistory, updateRouteHistory, clearRouteHistory,
  getCachedRoutePath, setCachedRoutePath,
  findNearestUnvisitedStop, getGuidanceCache, setGuidanceCache,
} from '@/lib/store';
import { getRoutes, appendRouteHistory, saveRouteHistories, getRouteHistories } from '@/lib/google-sheets';
import { RouteHistory } from '@/lib/types';
import { fetchORSDrivePath, fetchORSGuidance } from '@/lib/openroute';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const state = getNavState();
    let routeHistory = null;
    let gps = null;
    let routePath = null;
    let nextStopGuidance = null;
    let attendance: Array<{ studentId: string; studentName: string; isPresent: boolean; timestamp: string }> = [];

    if (state.currentRouteHistoryId) {
      routeHistory = getRouteHistory(state.currentRouteHistoryId);
      if (routeHistory) {
        gps = getGPSData(routeHistory.routeId) || null;
        attendance = getAttendance(state.currentRouteHistoryId);
        routePath = getCachedRoutePath(routeHistory.routeId) || null;

        if (gps && routeHistory.stopsProgress) {
          const { getRoutes } = await import('@/lib/google-sheets');
          const routes = await getRoutes();
          const route = routes.find((r) => r.id === routeHistory!.routeId);
          if (route) {
            const nearest = findNearestUnvisitedStop(
              gps.lat, gps.lng, route.stops, routeHistory.stopsProgress
            );
            if (nearest) {
              const cacheKey = `guidance:${route.id}:${nearest.stopIndex}`;
              const cached = getGuidanceCache(cacheKey);
              if (cached) {
                nextStopGuidance = {
                  stopIndex: nearest.stopIndex,
                  stopName: nearest.stop.name,
                  distanceMeters: cached.distanceMeters,
                  durationSeconds: cached.durationSeconds,
                  geometry: cached.geometry,
                };
              } else {
                try {
                  const orsData = await fetchORSGuidance(gps.lat, gps.lng, nearest.stop.lat, nearest.stop.lng);
                  setGuidanceCache(cacheKey, {
                    distanceMeters: orsData.distance,
                    durationSeconds: orsData.duration,
                    geometry: orsData.geometry,
                  });
                  nextStopGuidance = {
                    stopIndex: nearest.stopIndex,
                    stopName: nearest.stop.name,
                    distanceMeters: orsData.distance,
                    durationSeconds: orsData.duration,
                    geometry: orsData.geometry,
                  };
                } catch {
                  // fallback: haversine distance, no geometry
                  nextStopGuidance = {
                    stopIndex: nearest.stopIndex,
                    stopName: nearest.stop.name,
                    distanceMeters: nearest.distance,
                    durationSeconds: Math.round(nearest.distance / 8.33), // ~30 km/h avg
                    geometry: [],
                  };
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        navState: state,
        routeHistory,
        currentGPS: gps,
        attendance,
        routePath,
        nextStopGuidance,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get navigation state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, routeId } = body;

    if (action === 'start') {
      if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
      }

      const routes = await getRoutes();
      const route = routes.find((r) => r.id === routeId);
      if (!route) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }

      const now = new Date().toISOString();
      const stopsProgress = route.stops.map((s) => ({
        stopId: s.id,
        name: s.name,
        arrivalTime: null as string | null,
      }));

      const rh: RouteHistory = {
        id: uuidv4(),
        routeId,
        startTime: now,
        endTime: null,
        attendanceStr: `0/${route.studentIds.length}`,
        stopsProgress,
        status: 'running',
      };

      setRouteHistory(rh);
      setNavState({ currentRouteHistoryId: rh.id, startedAt: now });

      try {
        await appendRouteHistory(rh);
      } catch {
        // best-effort persistence
      }

      try {
        const cached = getCachedRoutePath(routeId);
        if (!cached) {
          const routePath = await fetchORSDrivePath(route.stops);
          setCachedRoutePath(routeId, routePath);
        }
      } catch {
        // directions are optional; fall back to straight-line
      }

      return NextResponse.json({ data: rh });
    }

    if (action === 'stop') {
      const state = getNavState();
      const rhId = state.currentRouteHistoryId;
      if (!rhId) {
        return NextResponse.json({ error: 'No active navigation' }, { status: 400 });
      }

      const rh = getRouteHistory(rhId);
      if (!rh) {
        return NextResponse.json({ error: 'Route history not found' }, { status: 404 });
      }

      const attendance = getAttendance(rhId);
      const total = rh.attendanceStr.split('/')[1] || '0';
      const present = attendance.filter((a) => a.isPresent).length;
      const endTime = new Date().toISOString();

      const finalRh: RouteHistory = {
        ...rh,
        endTime,
        attendanceStr: `${present}/${total}`,
        status: 'end',
      };

      setRouteHistory(finalRh);

      try {
        const persisted = await getRouteHistories();
        const idx = persisted.findIndex((h) => h.id === rhId);
        if (idx >= 0) {
          persisted[idx] = finalRh;
          await saveRouteHistories(persisted);
        } else {
          await appendRouteHistory(finalRh);
        }
      } catch {
        // best-effort persistence
      }

      clearRouteHistory(rhId);
      setNavState({ currentRouteHistoryId: null, startedAt: null });

      return NextResponse.json({ data: finalRh });
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop"' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
