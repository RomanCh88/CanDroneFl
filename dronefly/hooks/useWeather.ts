'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WeatherData } from '@/types';
import { fetchWeather, getCachedWeather, putCachedWeather } from '@/lib/weather';

const REFRESH_MS = 15 * 60 * 1000;
const DEBOUNCE_MS = 300;
const RETRY_MS = [5_000, 15_000, 60_000];

interface WeatherState {
  weather: WeatherData | null;
  /** True while a network request is in flight (cached data may still be shown). */
  loading: boolean;
  error: string | null;
  /** When the shown data was fetched (may be from cache). */
  updatedAt: Date | null;
  /** Shown data comes from cache and a refresh hasn't succeeded yet. */
  stale: boolean;
}

/**
 * Weather for one location with:
 *  - instant display of the last cached forecast, then background refresh (stale-while-revalidate)
 *  - debounce on location changes + abort of superseded requests (no out-of-order results)
 *  - refresh every 15 min only while the tab is visible; immediate refresh on return / reconnect if stale
 *  - retry with backoff on failure (keeps showing the last data)
 */
export function useWeather(lat: number, lng: number) {
  const [state, setState] = useState<WeatherState>({ weather: null, loading: true, error: null, updatedAt: null, stale: false });
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef(0);
  const retryRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The retry timer calls the latest `load` through a ref (load can't reference itself).
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setState(s => ({ ...s, loading: true }));
    try {
      const data = await fetchWeather(lat, lng, ctrl.signal);
      if (ctrl.signal.aborted) return;
      putCachedWeather(lat, lng, data);
      lastFetchRef.current = Date.now();
      retryRef.current = 0;
      setState({ weather: data, loading: false, error: null, updatedAt: new Date(), stale: false });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Failed to fetch weather data';
      setState(s => ({ ...s, loading: false, error: msg }));
      const delay = RETRY_MS[Math.min(retryRef.current, RETRY_MS.length - 1)];
      retryRef.current++;
      retryTimer.current = setTimeout(() => { if (!document.hidden) void loadRef.current(); }, delay);
    }
  }, [lat, lng]);
  useEffect(() => { loadRef.current = load; }, [load]);

  // Location change: show cache immediately, fetch after a short debounce.
  useEffect(() => {
    const cached = getCachedWeather(lat, lng);
    const fresh = !!cached && Date.now() - cached.t < REFRESH_MS;
    // Restoring cached data for a new location is synchronising with an external store.
    // Without a cache entry, clear the old location's data so it is never shown for the new point.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      weather: cached?.data ?? null,
      updatedAt: cached ? new Date(cached.t) : null,
      stale: !!cached && !fresh,
      loading: !fresh,
      error: null,
    });
    if (fresh) {
      lastFetchRef.current = cached.t;
      return () => abortRef.current?.abort();
    }
    lastFetchRef.current = 0;
    const t = setTimeout(() => { void load(); }, DEBOUNCE_MS);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [lat, lng, load]);

  // Periodic refresh while visible; catch up on return to the tab or when back online.
  useEffect(() => {
    const maybeRefresh = () => {
      if (!document.hidden && Date.now() - lastFetchRef.current >= REFRESH_MS) void load();
    };
    const iv = setInterval(maybeRefresh, 60_000);
    document.addEventListener('visibilitychange', maybeRefresh);
    window.addEventListener('online', load);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', maybeRefresh);
      window.removeEventListener('online', load);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [load]);

  return { ...state, reload: load };
}
