// src/utils/helpers.ts
import { RouteStep } from '../types';

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function formatETA(seconds: number): string {
  const now = new Date();
  now.setSeconds(now.getSeconds() + seconds);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getManeuverIcon(maneuver: string): string {
  const icons: Record<string, string> = {
    'turn-left': '↰',
    'turn-right': '↱',
    'turn-slight left': '↖',
    'turn-slight right': '↗',
    'turn-sharp left': '↩',
    'turn-sharp right': '↪',
    'continue-straight': '↑',
    'merge-left': '⬅',
    'merge-right': '➡',
    'roundabout-left': '↺',
    'roundabout-right': '↻',
    'depart-straight': '🏁',
    'arrive-left': '📍',
    'arrive-right': '📍',
    arrive: '🏁',
    depart: '🚀',
  };
  return icons[maneuver] || '→';
}

export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    City: '🏙️',
    Town: '🏘️',
    Village: '🏡',
    Street: '🛣️',
    Address: '🏠',
    Building: '🏢',
    Airport: '✈️',
    Station: '🚉',
    Restaurant: '🍽️',
    Shop: '🛒',
    Attraction: '⭐',
    Hotel: '🏨',
    Highway: '🛤️',
    Place: '📍',
    Suburb: '🏘️',
  };
  return icons[type] || '📍';
}

export function getModeIcon(mode: string): string {
  return mode === 'driving' ? '🚗' : mode === 'walking' ? '🚶' : '🚴';
}

export function snapToRoute(
  userLat: number,
  userLon: number,
  steps: RouteStep[]
): number {
  let closest = 0;
  let minDist = Infinity;
  steps.forEach((step, idx) => {
    const d = haversineDistance(userLat, userLon, step.coordinates.lat, step.coordinates.lon);
    if (d < minDist) { minDist = d; closest = idx; }
  });
  return closest;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
