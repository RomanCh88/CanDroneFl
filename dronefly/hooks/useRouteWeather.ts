'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LatLng } from '@/lib/geo';
import { sampleRoute, Sample } from '@/lib/mission';
import { fetchRouteWeather, PointWeather, roundCoord } from '@/lib/weather';

const DEBOUNCE_MS = 600;
const TTL_MS = 15 * 60 * 1000;

// In-memory only (route coordinates are sensitive; never persisted).
const memCache = new Map<string, { t: number; data: PointWeather[] }>();

/** Forecast for sample points along the route, one request per (rounded) route shape. */
export function useRouteWeather(points: LatLng[]) {
  const samples: Sample[] = useMemo(() => sampleRoute(points), [points]);
  const key = useMemo(() => samples.map(s => `${roundCoord(s.lat)},${roundCoord(s.lng)}`).join(';'), [samples]);

  const [state, setState] = useState<{ key: string; data: PointWeather[] | null; loading: boolean; error: string | null }>(
    { key: '', data: null, loading: false, error: null }
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (samples.length === 0) return;
    const hit = memCache.get(key);
    if (hit && Date.now() - hit.t < TTL_MS) {
      // Serving from the in-memory cache (external store) for this route shape.

      setState({ key, data: hit.data, loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const data = await fetchRouteWeather(samples, ctrl.signal);
        if (ctrl.signal.aborted) return;
        memCache.set(key, { t: Date.now(), data });
        setState({ key, data, loading: false, error: null });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Weather error' }));
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [key, samples]);

  // Exact data for the current samples, or — while the new request is in flight — the previous
  // route's forecast mapped to the nearest old sample (weather varies slowly over a few km),
  // so results don't blank out while a point is dragged.
  const data = useMemo(() => {
    if (!state.data) return null;
    if (state.key === key && state.data.length === samples.length) return state.data;
    const old = state.data;
    return samples.map(s => {
      let best = old[0], bd = Infinity;
      for (const o of old) {
        const d = (o.lat - s.lat) ** 2 + ((o.lng - s.lng) * Math.cos((s.lat * Math.PI) / 180)) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      return { ...best, lat: s.lat, lng: s.lng };
    });
  }, [state.data, state.key, key, samples]);
  const approximate = !!data && state.key !== key;
  return { samples, weather: data, approximate, loading: state.loading, error: state.error };
}
