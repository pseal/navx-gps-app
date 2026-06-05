// src/services/api.ts
// Geocoding: Nominatim (OSM) — no key needed
// Routing:
//   driving  → OSRM public demo (car profile, accurate)
//   walking  → OpenRouteService (free, 2000 req/day, real pedestrian speeds)
//   cycling  → OpenRouteService (free, 2000 req/day, real cycling speeds)

import { SearchSuggestion, RouteInfo, RouteStep, Coordinates } from '../types';

// ─── Nominatim ────────────────────────────────────────────────────────────────

const NOMINATIM = 'https://nominatim.openstreetmap.org';

interface NomResult {
  place_id: number; osm_id: number; osm_type: string;
  display_name: string; name: string; lat: string; lon: string;
  type: string; class: string;
  address?: { city?: string; town?: string; village?: string; country?: string; postcode?: string; road?: string; state?: string; };
}

const TYPE_LABEL: Record<string, string> = {
  city: 'City', town: 'Town', village: 'Village', suburb: 'Suburb',
  road: 'Street', house: 'Address', building: 'Building',
  amenity: 'Place', tourism: 'Attraction', shop: 'Shop',
  restaurant: 'Restaurant', hotel: 'Hotel', airport: 'Airport',
  station: 'Station', motorway: 'Highway', trunk: 'Road',
};

function toSuggestion(r: NomResult): SearchSuggestion {
  const parts = r.display_name.split(', ');
  return {
    id: `${r.osm_type}:${r.osm_id}`,
    displayName: parts.slice(0, 4).join(', '),
    shortName: r.name || parts[0],
    type: TYPE_LABEL[r.type] || TYPE_LABEL[r.class] || 'Place',
    coordinates: { lat: parseFloat(r.lat), lon: parseFloat(r.lon) },
    country: r.address?.country || '',
    city: r.address?.city || r.address?.town || r.address?.village,
    postcode: r.address?.postcode,
  };
}

export async function fetchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `${NOMINATIM}/search?` + new URLSearchParams({
      q: query, format: 'json', addressdetails: '1', limit: '7', dedupe: '1',
    });
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    const data: NomResult[] = await res.json();
    return data.map(toSuggestion);
  } catch { return []; }
}

export async function reverseGeocode(lat: number, lon: number): Promise<SearchSuggestion | null> {
  try {
    const url = `${NOMINATIM}/reverse?` + new URLSearchParams({
      lat: String(lat), lon: String(lon), format: 'json', addressdetails: '1',
    });
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    return toSuggestion(await res.json());
  } catch { return null; }
}

// ─── Shared step parser ───────────────────────────────────────────────────────

interface OsrmStep {
  distance: number; duration: number; name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

function buildInstruction(step: OsrmStep, idx: number, total: number): string {
  const street = step.name ? ` onto ${step.name}` : '';
  const { type, modifier } = step.maneuver;
  if (idx === 0)         return `Start${street}`;
  if (idx === total - 1) return 'Arrive at destination';
  const MAP: Record<string, string> = {
    'turn-left':         `Turn left${street}`,
    'turn-right':        `Turn right${street}`,
    'turn-slight left':  `Slight left${street}`,
    'turn-slight right': `Slight right${street}`,
    'turn-sharp left':   `Sharp left${street}`,
    'turn-sharp right':  `Sharp right${street}`,
    'continue-straight': `Continue straight${street}`,
    'roundabout-left':   `At roundabout, exit left${street}`,
    'roundabout-right':  `At roundabout, exit right${street}`,
    'merge-left':        `Merge left${street}`,
    'merge-right':       `Merge right${street}`,
    'new name-straight': `Continue straight${street}`,
    'new name-left':     `Bear left${street}`,
    'new name-right':    `Bear right${street}`,
  };
  return MAP[modifier ? `${type}-${modifier}` : type] || `Continue${street}`;
}

function osrmStepsToRouteSteps(steps: OsrmStep[]): RouteStep[] {
  return steps.map((step, idx, arr) => {
    const [lon, lat] = step.maneuver.location;
    const mod = step.maneuver.modifier;
    return {
      instruction: buildInstruction(step, idx, arr.length),
      distance:    step.distance,
      duration:    step.duration,
      maneuver:    mod ? `${step.maneuver.type}-${mod}` : step.maneuver.type,
      coordinates: { lat, lon },
      streetName:  step.name || undefined,
    };
  });
}

function buildRouteInfo(
  distance: number, duration: number,
  steps: RouteStep[], geometry: Coordinates[], mode: string
): RouteInfo {
  const distKm     = (distance / 1000).toFixed(1);
  const durationMin = Math.round(duration / 60);
  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m} min`;
  return {
    distance, duration, steps, geometry,
    summary: `${distKm} km · ${timeStr}`,
    mode: mode as any,
  };
}

// ─── OSRM — driving only (car profile, most reliable) ────────────────────────

async function fetchOsrmRoute(
  origin: Coordinates, destination: Coordinates
): Promise<RouteInfo | null> {
  try {
    const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const r    = data.routes[0];
    const leg  = r.legs[0];
    const geometry: Coordinates[] = r.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({ lat, lon })
    );
    return buildRouteInfo(r.distance, r.duration, osrmStepsToRouteSteps(leg.steps || []), geometry, 'driving');
  } catch (e) {
    console.error('OSRM error:', e);
    return null;
  }
}

// ─── OpenRouteService — walking & cycling (accurate pedestrian/bike speeds) ──
// Free tier: 2 000 requests/day, no credit card needed
// Sign up at https://openrouteservice.org/dev/#/signup to get your own key
// Using the community demo key below — swap it for your own for production

const ORS_KEY  = '5b3ce3597851110001cf6248a2e9c97a77d74f23a0c9bf3eecd18b1f'; // public demo key
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';

const ORS_PROFILE: Record<string, string> = {
  walking: 'foot-walking',
  cycling: 'cycling-regular',
};

// ORS uses the same OSRM step format under the hood (it's compatible)
interface OrsStep {
  distance: number; duration: number; name: string; type: number;
  instruction: string;
  way_points?: number[];
  maneuver?: { bearing_after: number; bearing_before: number; location: [number, number]; type: string; modifier?: string };
}

// ORS type numbers → maneuver strings (their API uses numeric types)
const ORS_MANEUVER: Record<number, string> = {
  0: 'depart', 1: 'turn-left', 2: 'turn-right', 3: 'turn-sharp left',
  4: 'turn-sharp right', 5: 'turn-slight left', 6: 'turn-slight right',
  7: 'continue-straight', 8: 'roundabout-right', 9: 'roundabout-left',
  10: 'uturn', 11: 'arrive',
};

async function fetchOrsRoute(
  origin: Coordinates, destination: Coordinates, mode: string
): Promise<RouteInfo | null> {
  const profile = ORS_PROFILE[mode];
  if (!profile) return null;

  try {
    const url = `${ORS_BASE}/${profile}/json`;
    const body = {
      coordinates: [
        [origin.lon, origin.lat],
        [destination.lon, destination.lat],
      ],
      instructions: true,
      geometry: true,
      geometry_format: 'geojson',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn('ORS error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const seg = route.segments?.[0];
    const geometry: Coordinates[] = route.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({ lat, lon })
    );

    const steps: RouteStep[] = (seg?.steps || []).map((step: OrsStep, idx: number, arr: OrsStep[]) => {
      const loc = route.geometry.coordinates[step.way_points?.[0] ?? 0] as [number, number] | undefined;
      const [lon, lat] = loc ?? [origin.lon, origin.lat];
      const maneuverKey = ORS_MANEUVER[step.type] ?? 'continue-straight';
      return {
        instruction: step.instruction,
        distance:    step.distance,
        duration:    step.duration,
        maneuver:    maneuverKey,
        coordinates: { lat, lon },
        streetName:  step.name || undefined,
      };
    });

    return buildRouteInfo(route.summary.distance, route.summary.duration, steps, geometry, mode);
  } catch (e) {
    console.error('ORS error:', e);
    return null;
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function fetchRoute(
  origin: Coordinates,
  destination: Coordinates,
  mode: string
): Promise<RouteInfo | null> {
  if (mode === 'driving') {
    // OSRM is purpose-built for driving — fast, accurate road times
    return fetchOsrmRoute(origin, destination);
  } else {
    // ORS gives true pedestrian/cycling speeds & path networks
    const result = await fetchOrsRoute(origin, destination, mode);
    if (result) return result;

    // Fallback: OSRM distance geometry + realistic speed estimation
    console.warn(`ORS failed for ${mode}, using speed-adjusted fallback`);
    const driving = await fetchOsrmRoute(origin, destination);
    if (!driving) return null;

    // Realistic average speeds: walking 5 km/h, cycling 15 km/h, driving ~50 km/h avg urban
    const speedFactors: Record<string, number> = { walking: 10, cycling: 3.3 };
    const factor = speedFactors[mode] ?? 1;
    const adjustedDuration = driving.duration * factor;
    const distKm = (driving.distance / 1000).toFixed(1);
    const durationMin = Math.round(adjustedDuration / 60);
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return {
      ...driving,
      duration: adjustedDuration,
      summary: `${distKm} km · ${h > 0 ? `${h}h ${m}m` : `${m} min`}`,
      mode: mode as any,
    };
  }
}
