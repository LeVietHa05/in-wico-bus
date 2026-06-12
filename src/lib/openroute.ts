import { Stop, RoutePath, RoutePathSegment } from './types';

const ORS_BASE = 'https://api.openrouteservice.org/v2/directions/driving-car';

function orsApiKey(): string {
  const key = process.env.ORS_API_KEY;
  if (!key || key === 'your_key_here') throw new Error('ORS_API_KEY not configured');
  return key;
}

function flipCoords(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

function parseGeometry(geometry: unknown): [number, number][] {
  if (!geometry) return [];
  if (typeof geometry === 'string') {
    return geometry.length > 0 ? decodePolyline(geometry) : [];
  }
  if (typeof geometry === 'object' && geometry !== null) {
    const g = geometry as { coordinates?: [number, number][] };
    if (Array.isArray(g.coordinates) && g.coordinates.length > 0) {
      return flipCoords(g.coordinates);
    }
  }
  return [];
}

export async function fetchORSGuidance(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<{ geometry: [number, number][]; distance: number; duration: number }> {
  const coordinates: [number, number][] = [[fromLng, fromLat], [toLng, toLat]];

  const res = await fetch(ORS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: orsApiKey(),
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify({ coordinates, geometry: true, units: 'm' }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ORS guidance API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('ORS returned no routes');

  return {
    geometry: parseGeometry(route.geometry),
    distance: route.summary?.distance || 0,
    duration: route.summary?.duration || 0,
  };
}

export async function fetchORSDrivePath(stops: Stop[]): Promise<RoutePath> {
  if (stops.length < 2) {
    const pt: [number, number] = stops.length === 1 ? [stops[0].lat, stops[0].lng] : [21.010055759332513, 105.7948062944532];
    return {
      segments: [],
      totalDistance: 0,
      totalDuration: 0,
      geometry: [pt],
    };
  }

  const coordinates: [number, number][] = stops
    .sort((a, b) => a.order - b.order)
    .map((s) => [s.lng, s.lat]);

  const res = await fetch(ORS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: orsApiKey(),
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify({
      coordinates,
      geometry: true,
      units: 'm',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ORS API error ${res.status}: ${body}`);
  }

  const data = await res.json();

  const route = data.routes?.[0];
  if (!route) throw new Error('ORS returned no routes');

  const geometryCoords = parseGeometry(route.geometry);

  const segments: RoutePathSegment[] = (route.segments || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (seg: any, i: number) => {
      const segCoords = seg.steps
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? seg.steps.flatMap((step: any) => parseGeometry(step.geometry))
        : [];
      return {
        coordinates: segCoords.length > 0 ? segCoords : geometryCoords,
        distance: seg.distance || 0,
        duration: seg.duration || 0,
      };
    }
  );

  const totalDistance = route.summary?.distance || segments.reduce((s: number, seg: RoutePathSegment) => s + seg.distance, 0);
  const totalDuration = route.summary?.duration || segments.reduce((s: number, seg: RoutePathSegment) => s + seg.duration, 0);

  return {
    segments,
    totalDistance,
    totalDuration,
    geometry: geometryCoords,
  };
}
