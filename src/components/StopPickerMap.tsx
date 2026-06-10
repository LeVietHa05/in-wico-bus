'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Stop } from '@/lib/types';

const pinIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:translateY(-14px)"/>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

const stopIcon = (n: number) =>
  L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${n}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: '',
  });

interface StopPickerMapProps {
  stops: Stop[];
  onPick: (lat: number, lng: number) => void;
  center?: [number, number];
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StopPickerMap({ stops, onPick, center }: StopPickerMapProps) {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  const mapCenter: [number, number] = center || (sorted.length > 0
    ? [sorted[0].lat, sorted[0].lng]
    : [21.010055759332513, 105.7948062944532]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {sorted.map((s, i) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={stopIcon(i + 1)} />
      ))}
    </MapContainer>
  );
}
