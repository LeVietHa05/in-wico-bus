export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export interface BusRoute {
  id: string;
  name: string;
  stops: Stop[];
  studentIds: string[];
}

export interface Student {
  id: string;
  name: string;
  rfidTag: string;
  routeIds: string[];
}

export interface GPSData {
  routeId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface RFIDScan {
  routeId: string;
  rfidTag: string;
  timestamp: string;
}

export interface Attendance {
  studentId: string;
  routeHistoryId: string;
  studentName: string;
  isPresent: boolean;
  timestamp: string;
}

export interface StopProgress {
  stopId: string;
  name: string;
  arrivalTime: string | null;
}

export interface RouteHistory {
  id: string;
  routeId: string;
  startTime: string;
  endTime: string | null;
  attendanceStr: string;
  stopsProgress: StopProgress[];
  status: 'running' | 'end';
}

export interface NavState {
  currentRouteHistoryId: string | null;
  startedAt: string | null;
}

export interface RoutePathSegment {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

export interface RoutePath {
  segments: RoutePathSegment[];
  totalDistance: number;
  totalDuration: number;
  geometry: [number, number][];
}
