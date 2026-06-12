'use client';

import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Stop, NextStopGuidance } from '@/lib/types';

const defaultCenter: [number, number] = [21.010055759332513, 105.7948062944532];

interface MapProps {
  stops?: Stop[];
  currentLocation?: { lat: number; lng: number } | null;
  visitedStopIds?: string[];
  routeGeometry?: [number, number][];
  nextStopGuidance?: NextStopGuidance | null;
}

function createVisitedIcon(n: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: '',
  });
}

function createRecommendedIcon(n: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#f97316;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:3px solid white;box-shadow:0 0 0 3px #f97316, 0 2px 6px rgba(0,0,0,0.4)">${n}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: '',
  });
}

function createUnvisitedIcon(n: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:transparent;color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px dashed #3b82f6;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${n}</div>`,
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

export default function Map({ stops = [], currentLocation = null, visitedStopIds = [], routeGeometry, nextStopGuidance }: MapProps) {
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);
  const straightPath: [number, number][] = sortedStops.map((s) => [s.lat, s.lng]);
  const hasRouteGeometry = routeGeometry && routeGeometry.length > 1;
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
      {hasRouteGeometry ? (
        <Polyline
          positions={routeGeometry}
          pathOptions={{ color: '#3b82f6', opacity: 0.3, weight: 2, dashArray: '6 3' }}
        />
      ) : straightPath.length > 1 && (
        <Polyline
          positions={straightPath}
          pathOptions={{ color: '#3b82f6', opacity: 0.4, weight: 2, dashArray: '8 5' }}
        />
      )}
      {nextStopGuidance && nextStopGuidance.geometry.length > 1 && (
        <Polyline
          positions={nextStopGuidance.geometry}
          pathOptions={{ color: '#f97316', opacity: 0.9, weight: 5 }}
        />
      )}
      {sortedStops.map((stop, i) => {
        const visited = visitedStopIds.includes(stop.id);
        const recommended = nextStopGuidance?.stopIndex === i;
        const keyState = visited ? 'v' : recommended ? 'r' : 'u';
        const icon = visited
          ? createVisitedIcon(i + 1)
          : recommended
          ? createRecommendedIcon(i + 1)
          : createUnvisitedIcon(i + 1);
        return (
          <Marker
            key={`${stop.id}-${keyState}`}
            position={[stop.lat, stop.lng]}
            icon={icon}
          />
        );
      })}
      {currentLocation && (
        <Marker
          position={[currentLocation.lat, currentLocation.lng]}
          icon={busIcon}
        />
      )}
    </MapContainer>
  );
}
