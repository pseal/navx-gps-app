// src/services/searchService.ts
import axios from 'axios';
import NodeCache from 'node-cache';
import { SearchSuggestion, NominatimResult } from '../types';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  'User-Agent': 'GPSNavApp/1.0 (navigation@example.com)',
  'Accept-Language': 'en',
};

function formatDisplayName(result: NominatimResult): string {
  const parts = result.display_name.split(', ');
  return parts.slice(0, 4).join(', ');
}

function getShortName(result: NominatimResult): string {
  return result.name || result.display_name.split(',')[0];
}

function getLocationType(result: NominatimResult): string {
  const typeMap: Record<string, string> = {
    city: 'City',
    town: 'Town',
    village: 'Village',
    suburb: 'Suburb',
    road: 'Street',
    house: 'Address',
    building: 'Building',
    amenity: 'Place',
    tourism: 'Attraction',
    shop: 'Shop',
    restaurant: 'Restaurant',
    hotel: 'Hotel',
    airport: 'Airport',
    station: 'Station',
    motorway: 'Highway',
    trunk: 'Road',
  };
  return typeMap[result.type] || typeMap[result.class] || 'Place';
}

export async function searchPlaces(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = cache.get<SearchSuggestion[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get<NominatimResult[]>(`${NOMINATIM_BASE}/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit,
        dedupe: 1,
      },
      headers: HEADERS,
      timeout: 5000,
    });

    const suggestions: SearchSuggestion[] = response.data.map((result) => ({
      id: `${result.osm_type}:${result.osm_id}`,
      displayName: formatDisplayName(result),
      shortName: getShortName(result),
      type: getLocationType(result),
      coordinates: {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      },
      country: result.address?.country || '',
      city: result.address?.city || result.address?.town || result.address?.village,
      postcode: result.address?.postcode,
    }));

    cache.set(cacheKey, suggestions);
    return suggestions;
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<SearchSuggestion | null> {
  const cacheKey = `reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = cache.get<SearchSuggestion>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get<NominatimResult>(`${NOMINATIM_BASE}/reverse`, {
      params: { lat, lon, format: 'json', addressdetails: 1 },
      headers: HEADERS,
      timeout: 5000,
    });

    const result = response.data;
    const suggestion: SearchSuggestion = {
      id: `${result.osm_type}:${result.osm_id}`,
      displayName: formatDisplayName(result),
      shortName: getShortName(result),
      type: getLocationType(result),
      coordinates: { lat, lon },
      country: result.address?.country || '',
      city: result.address?.city || result.address?.town,
      postcode: result.address?.postcode,
    };

    cache.set(cacheKey, suggestion);
    return suggestion;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}
