import { GPSData, Attendance, NavState, RouteHistory, Stop } from './types';

const gpsStore = new Map<string, GPSData>();
const attendanceStore = new Map<string, Attendance[]>();
const routeHistoryStore = new Map<string, RouteHistory>();
const navState: NavState = {
  currentRouteHistoryId: null,
  startedAt: null,
};

export function setGPSData(data: GPSData): void {
  gpsStore.set(data.routeId, data);
}

export function getGPSData(routeId: string): GPSData | undefined {
  return gpsStore.get(routeId);
}

export function getAllGPSData(): GPSData[] {
  return Array.from(gpsStore.values());
}

export function addAttendance(record: Attendance): void {
  const existing = attendanceStore.get(record.routeHistoryId) || [];
  const idx = existing.findIndex((a) => a.studentId === record.studentId);
  if (idx >= 0) {
    existing[idx] = record;
  } else {
    existing.push(record);
  }
  attendanceStore.set(record.routeHistoryId, existing);
}

export function getAttendance(routeHistoryId: string): Attendance[] {
  return attendanceStore.get(routeHistoryId) || [];
}

export function setRouteHistory(rh: RouteHistory): void {
  routeHistoryStore.set(rh.id, rh);
}

export function getRouteHistory(id: string): RouteHistory | undefined {
  return routeHistoryStore.get(id);
}

export function updateRouteHistory(id: string, partial: Partial<RouteHistory>): RouteHistory | undefined {
  const existing = routeHistoryStore.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...partial };
  routeHistoryStore.set(id, updated);
  return updated;
}

export function getAllRouteHistories(): RouteHistory[] {
  return Array.from(routeHistoryStore.values());
}

export function getNavState(): NavState {
  return { ...navState };
}

export function setNavState(partial: Partial<NavState>): NavState {
  Object.assign(navState, partial);
  return { ...navState };
}

export function clearRouteData(routeId: string): void {
  gpsStore.delete(routeId);
}

export function clearRouteHistory(routeHistoryId: string): void {
  routeHistoryStore.delete(routeHistoryId);
  attendanceStore.delete(routeHistoryId);
}

const STOP_THRESHOLD_METERS = 50;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkStopArrival(
  routeHistoryId: string,
  busLat: number,
  busLng: number,
  stops: Stop[]
): { arrived: boolean; stopIndex: number; stopName: string } | null {
  const rh = routeHistoryStore.get(routeHistoryId);
  if (!rh) return null;

  for (let i = 0; i < stops.length; i++) {
    const progress = rh.stopsProgress[i];
    if (!progress || progress.arrivalTime !== null) continue;

    const dist = haversineDistance(busLat, busLng, stops[i].lat, stops[i].lng);
    if (dist <= STOP_THRESHOLD_METERS) {
      return { arrived: true, stopIndex: i, stopName: stops[i].name };
    }
  }

  return { arrived: false, stopIndex: -1, stopName: '' };
}
