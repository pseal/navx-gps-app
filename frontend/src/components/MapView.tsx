// src/components/MapView.tsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, RouteInfo } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5)"><span style="transform:rotate(45deg);font-size:11px;font-weight:700;color:#0a0e1a">${label}</span></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#00d4ff;border:3px solid #0a0e1a;box-shadow:0 0 0 4px rgba(0,212,255,0.3)"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

function FixMap() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false });
      // Re-center after invalidation so tiles fill correctly
      map.setView(map.getCenter(), map.getZoom(), { animate: false });
    }, 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], animate: false });
    }
  }, [coords, map]);
  return null;
}

function PanTo({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lon], 15, { animate: true });
  }, [center, map]);
  return null;
}

interface MapViewProps {
  origin: Coordinates | null;
  destination: Coordinates | null;
  userLocation: Coordinates | null;
  route: RouteInfo | null;
  activeStepIdx: number;
  panToUser: boolean;
  mapStyle: 'default' | 'satellite';
}

const MapView: React.FC<MapViewProps> = ({
  origin, destination, userLocation, route, panToUser, mapStyle,
}) => {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lon]
    : [51.505, -0.09];

  const routePts: [number, number][] = route?.geometry.map(c => [c.lat, c.lon]) ?? [];

  const fitCoords: [number, number][] = [];
  if (origin)      fitCoords.push([origin.lat, origin.lon]);
  if (destination) fitCoords.push([destination.lat, destination.lon]);

  return (
    <MapContainer
      center={center}
      zoom={5}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <FixMap />

      {mapStyle === 'satellite' ? (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={19}
        />
      ) : (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          maxZoom={19}
        />
      )}

      {origin      && <Marker position={[origin.lat, origin.lon]}           icon={makeIcon('#00d4ff', 'A')}><Popup>Origin</Popup></Marker>}
      {destination && <Marker position={[destination.lat, destination.lon]} icon={makeIcon('#00ff9d', 'B')}><Popup>Destination</Popup></Marker>}
      {userLocation && <Marker position={[userLocation.lat, userLocation.lon]} icon={makeUserIcon()}><Popup>You</Popup></Marker>}

      {routePts.length > 0 && <>
        <Polyline positions={routePts} pathOptions={{ color: '#00d4ff', weight: 6, opacity: 0.2 }} />
        <Polyline positions={routePts} pathOptions={{ color: '#00d4ff', weight: 4, opacity: 0.9 }} />
      </>}

      {fitCoords.length === 2 && route && <FitBounds coords={fitCoords} />}
      {panToUser && userLocation && <PanTo center={userLocation} />}
    </MapContainer>
  );
};

export default MapView;
