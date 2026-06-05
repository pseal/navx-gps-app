// src/services/routingService.ts
import axios from 'axios';
import NodeCache from 'node-cache';
import { RouteInfo, RouteRequest, RouteStep, Coordinates, TravelMode, OSRMRoute, OSRMStep } from '../types';

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// OSRM public demo server — swap for self-hosted in production
const OSRM_PROFILES: Record<TravelMode, string> = {
  driving: 'https://router.project-osrm.org/route/v1/driving',
  walking: 'https://router.project-osrm.org/route/v1/foot',
  cycling: 'https://router.project-osrm.org/route/v1/bike',
};

function decodePolyline(encoded: string): Coordinates[] {
  const coords: Coordinates[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coords.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }
  return coords;
}

function getManeuverInstruction(step: OSRMStep, idx: number, total: number): string {
  const { type, modifier } = step.maneuver;
  const street = step.name ? ` onto ${step.name}` : '';
  const dist = step.distance > 0 ? ` (${formatDistance(step.distance)})` : '';

  if (idx === 0) return `Start${street}${dist}`;
  if (idx === total - 1) return 'Arrive at destination';

  const maneuverMap: Record<string, string> = {
    'turn-left': `Turn left${street}`,
    'turn-right': `Turn right${street}`,
    'turn-slight left': `Slight left${street}`,
    'turn-slight right': `Slight right${street}`,
    'turn-sharp left': `Sharp left${street}`,
    'turn-sharp right': `Sharp right${street}`,
    'continue-straight': `Continue straight${street}`,
    'merge-left': `Merge left${street}`,
    'merge-right': `Merge right${street}`,
    'roundabout-left': `At roundabout, exit left${street}`,
    'roundabout-right': `At roundabout, exit right${street}`,
    'depart-straight': `Head straight${street}`,
    'arrive-left': 'Destination is on the left',
    'arrive-right': 'Destination is on the right',
  };

  const key = modifier ? `${type}-${modifier}` : type;
  return (maneuverMap[key] || `Continue${street}`) + dist;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function stepsFromOSRM(steps: OSRMStep[]): RouteStep[] {
  return steps.map((step, idx) => {
    const [lon, lat] = step.maneuver.location;
    return {
      instruction: getManeuverInstruction(step, idx, steps.length),
      distance: step.distance,
      duration: step.duration,
      maneuver: `${step.maneuver.type}${step.maneuver.modifier ? `-${step.maneuver.modifier}` : ''}`,
      coordinates: { lat, lon },
      streetName: step.name || undefined,
    };
  });
}

export async function getRoute(request: RouteRequest): Promise<RouteInfo | null> {
  const { origin, destination, mode } = request;
  const cacheKey = `route:${mode}:${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}:${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`;
  const cached = cache.get<RouteInfo>(cacheKey);
  if (cached) return cached;

  const baseUrl = OSRM_PROFILES[mode];
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

  try {
    const response = await axios.get(`${baseUrl}/${coords}`, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true,
        annotations: false,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const osrmRoute: OSRMRoute = data.routes[0];
    const leg = osrmRoute.legs[0];

    const geometry: Coordinates[] = osrmRoute.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lat, lon }));
    const steps = stepsFromOSRM(leg.steps || []);

    const distKm = (osrmRoute.distance / 1000).toFixed(1);
    const durationMin = Math.round(osrmRoute.duration / 60);
    const summary = `${distKm} km · ${durationMin} min`;

    const routeInfo: RouteInfo = {
      distance: osrmRoute.distance,
      duration: osrmRoute.duration,
      steps,
      geometry,
      summary,
      mode,
    };

    cache.set(cacheKey, routeInfo);
    return routeInfo;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
}
