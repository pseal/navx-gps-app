// src/types/index.ts

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface SearchSuggestion {
  id: string;
  displayName: string;
  shortName: string;
  type: string;
  coordinates: Coordinates;
  country: string;
  city?: string;
  postcode?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string;
  coordinates: Coordinates;
  streetName?: string;
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
  geometry: Coordinates[];
  summary: string;
  mode: TravelMode;
}

export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  mode: TravelMode;
  alternatives?: boolean;
}

export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    postcode?: string;
    road?: string;
    state?: string;
  };
  boundingbox: string[];
}

export interface OSRMRoute {
  distance: number;
  duration: number;
  legs: OSRMLeg[];
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
}

export interface OSRMLeg {
  distance: number;
  duration: number;
  summary: string;
  steps: OSRMStep[];
}

export interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
  geometry: {
    coordinates: [number, number][];
  };
}
