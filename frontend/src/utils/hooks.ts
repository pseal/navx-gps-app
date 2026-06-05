// src/utils/hooks.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchSuggestion } from '../types';
import { fetchSuggestions } from '../services/api';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSearch(query: string) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const latestQuery = useRef('');

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    latestQuery.current = debouncedQuery;
    setLoading(true);
    fetchSuggestions(debouncedQuery).then((results) => {
      // Discard stale results if a newer query came in
      if (latestQuery.current === debouncedQuery) {
        setSuggestions(results);
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });
  }, [debouncedQuery]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
    latestQuery.current = '';
  }, []);

  return { suggestions, loading, clearSuggestions };
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(
    (onSuccess: (lat: number, lon: number) => void) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          onSuccess(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setLoading(false);
          setError(err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    []
  );

  return { loading, error, getLocation };
}

export function useWatchPosition(active: boolean) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setPosition(pos),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [active]);

  return position;
}
