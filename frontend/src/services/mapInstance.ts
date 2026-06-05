// src/services/mapInstance.ts
// Leaflet map initialized once, completely outside React

import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const TILES = {
  default:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

export let map: L.Map | null = null;
export let tileLayer: L.TileLayer | null = null;

export function initMap(elementId: string): L.Map {
  const el = document.getElementById(elementId)!;

  // Clean up any previous instance
  if ((el as any)._leaflet_id) {
    (el as any)._leaflet_id = null;
  }
  if (map) {
    try { map.remove(); } catch {}
    map = null;
  }

  map = L.map(el, {
    center: [51.505, -0.09],
    zoom: 13,
    zoomControl: false,
  });

  tileLayer = L.tileLayer(TILES.default, { maxZoom: 19 }).addTo(map);

    // Force tiles to redraw after CSS fully paints
    setTimeout(() => {
      if (!map) return;
      map.invalidateSize({ animate: false });
      map.setView(map.getCenter(), map.getZoom(), { animate: false });
    }, 300);

    return map;
}

export function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:3px solid rgba(0,0,0,0.6);display:flex;align-items:center;
      justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5)">
      <span style="transform:rotate(45deg);font-size:11px;font-weight:700;color:#0a0e1a">${label}</span>
    </div>`,
    iconSize: [32, 32], iconAnchor: [16, 32],
  });
}

export function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#00d4ff;
      border:3px solid #0a0e1a;box-shadow:0 0 0 4px rgba(0,212,255,0.3)"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}
