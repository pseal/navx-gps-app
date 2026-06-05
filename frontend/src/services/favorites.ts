// src/services/favorites.ts
// Persists favorite places to localStorage

import { FavoritePlace, SearchSuggestion } from '../types';

const KEY = 'navx_favorites';

export function loadFavorites(): FavoritePlace[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

export function saveFavorite(suggestion: SearchSuggestion, name: string, icon: string): FavoritePlace {
  const favs = loadFavorites();
  const fav: FavoritePlace = {
    id: `fav_${Date.now()}`,
    name,
    icon,
    suggestion,
    createdAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify([...favs, fav]));
  return fav;
}

export function deleteFavorite(id: string): void {
  const favs = loadFavorites().filter(f => f.id !== id);
  localStorage.setItem(KEY, JSON.stringify(favs));
}

export function isFavorited(suggestionId: string): boolean {
  return loadFavorites().some(f => f.suggestion.id === suggestionId);
}
