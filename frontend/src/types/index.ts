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
  distance: number;
  duration: number;
  maneuver: string;
  coordinates: Coordinates;
  streetName?: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  steps: RouteStep[];
  geometry: Coordinates[];
  summary: string;
  mode: TravelMode;
}

export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface AppState {
  origin: PlacePoint | null;
  destination: PlacePoint | null;
  route: RouteInfo | null;
  travelMode: TravelMode;
  isNavigating: boolean;
  currentStepIdx: number;
  userLocation: Coordinates | null;
  isLoadingRoute: boolean;
  isLoadingLocation: boolean;
  error: string | null;
}

export interface PlacePoint {
  suggestion: SearchSuggestion;
  label: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface FavoritePlace {
  id: string;
  name: string;
  icon: string;
  suggestion: SearchSuggestion;
  createdAt: number;
}
