'use client';

import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Stop } from '@/lib/types';

const defaultCenter: [number, number] = [21.010055759332513, 105.7948062944532];

interface MapProps {
  stops?: Stop[];
  currentLocation?: { lat: number; lng: number } | null;
  visitedStopIds?: string[];
}

function createNumberIcon(n: number, visited: boolean): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${visited ? '#22c55e' : '#3b82f6'};
      color: white; display: flex; align-items: center;
      justify-content: center; font-size: 12px; font-weight: 700;
      border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    ">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: '',
  });
}

const busIcon = L.divIcon({
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50%;
    background: #eab308; color: white; display: flex;
    align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700;
    border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  ">🚌</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: '',
});

export default function Map({ stops = [], currentLocation = null, visitedStopIds = [] }: MapProps) {
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);
  const path: [number, number][] = sortedStops.map((s) => [s.lat, s.lng]);
  const center: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : sortedStops.length > 0
    ? [sortedStops[0].lat, sortedStops[0].lng]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{ color: '#3b82f6', opacity: 0.8, weight: 3 }}
        />
      )}
      {sortedStops.map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={createNumberIcon(i + 1, visitedStopIds.includes(stop.id))}
        />
      ))}
      {currentLocation && (
        <Marker
          position={[currentLocation.lat, currentLocation.lng]}
          icon={busIcon}
        />
      )}
    </MapContainer>
  );
}
