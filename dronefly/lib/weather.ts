import { WeatherData } from '@/types';

// Open-Meteo client. Called from the browser on purpose: the free tier is rate-limited
// per IP, so each user using their own IP scales better than a shared server proxy.

const BASE = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_VARS =
  'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,snowfall,weather_code,' +
  'cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl';

const HOURLY_VARS =
  'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,snowfall,weather_code,' +
  'cloud_cover,visibility,wind_speed_10m,wind_speed_80m,wind_direction_10m,wind_gusts_10m';

/** Number of hourly steps. `forecast_hours` starts at the location's current hour (local tz). */
export const FORECAST_HOURS = 48;

/**
 * Round to 0.01° (~1 km). Forecast model cells are 1–11 km, so results don't change, but
 * nearby clicks share cache entries and we send less precise positions to the API.
 */
export const roundCoord = (v: number) => Math.round(v * 100) / 100;

export async function fetchWeather(lat: number, lng: number, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(roundCoord(lat)),
    longitude: String(roundCoord(lng)),
    current: CURRENT_VARS,
    hourly: HOURLY_VARS,
    forecast_hours: String(FORECAST_HOURS),
    timezone: 'auto',
    wind_speed_unit: 'ms',
  });
  const res = await fetch(`${BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Last-known forecast cache (instant display on load, offline fallback).
// Weather for a ~1 km cell is not sensitive, unlike mission routes.

const CACHE_KEY = 'dronefly.wx';
const CACHE_MAX = 8;

interface CacheEntry { t: number; data: WeatherData }
type CacheMap = Record<string, CacheEntry>;

const cacheKey = (lat: number, lng: number) => `${roundCoord(lat).toFixed(2)},${roundCoord(lng).toFixed(2)}`;

function readCache(): CacheMap {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}'); } catch { return {}; }
}

export function getCachedWeather(lat: number, lng: number): CacheEntry | null {
  return readCache()[cacheKey(lat, lng)] ?? null;
}

export function putCachedWeather(lat: number, lng: number, data: WeatherData): void {
  try {
    const map = readCache();
    map[cacheKey(lat, lng)] = { t: Date.now(), data };
    const keys = Object.keys(map).sort((a, b) => map[b].t - map[a].t);
    for (const k of keys.slice(CACHE_MAX)) delete map[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch { /* storage full/unavailable */ }
}

// ---------------------------------------------------------------------------
// Route weather for the mission planner: many points in ONE request, wind at 4 heights.

export const WIND_LEVELS = [10, 80, 120, 180] as const;

export interface PointWeather {
  lat: number;
  lng: number;
  time: string[];
  temperature: number[];
  humidity: number[];
  dewPoint: number[];
  precipitation: number[];
  rain: number[];
  snowfall: number[];
  weatherCode: number[];
  cloudCover: number[];
  visibility: number[];
  gusts10: number[];
  /** windSpeed[levelIndex][hour], windDir[levelIndex][hour] for WIND_LEVELS. */
  windSpeed: number[][];
  windDir: number[][];
}

const ROUTE_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 'precipitation', 'rain', 'snowfall',
  'weather_code', 'cloud_cover', 'visibility', 'wind_gusts_10m',
  ...WIND_LEVELS.flatMap(h => [`wind_speed_${h}m`, `wind_direction_${h}m`]),
].join(',');

interface RawHourly { [k: string]: (number | string)[] }
interface RawPoint { latitude: number; longitude: number; hourly: RawHourly }

export async function fetchRouteWeather(
  points: { lat: number; lng: number }[],
  signal?: AbortSignal
): Promise<PointWeather[]> {
  if (points.length === 0) return [];
  const params = new URLSearchParams({
    latitude: points.map(p => roundCoord(p.lat)).join(','),
    longitude: points.map(p => roundCoord(p.lng)).join(','),
    hourly: ROUTE_VARS,
    forecast_hours: String(FORECAST_HOURS),
    timezone: 'auto',
    wind_speed_unit: 'ms',
  });
  const res = await fetch(`${BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();
  const list: RawPoint[] = Array.isArray(json) ? json : [json];
  return list.map((p, i) => {
    const h = p.hourly;
    const n = (k: string) => (h[k] ?? []).map(v => (typeof v === 'number' ? v : 0));
    return {
      lat: points[i].lat,
      lng: points[i].lng,
      time: (h.time ?? []) as string[],
      temperature: n('temperature_2m'),
      humidity: n('relative_humidity_2m'),
      dewPoint: n('dew_point_2m'),
      precipitation: n('precipitation'),
      rain: n('rain'),
      snowfall: n('snowfall'),
      weatherCode: n('weather_code'),
      cloudCover: n('cloud_cover'),
      visibility: n('visibility'),
      gusts10: n('wind_gusts_10m'),
      windSpeed: WIND_LEVELS.map(lv => n(`wind_speed_${lv}m`)),
      windDir: WIND_LEVELS.map(lv => n(`wind_direction_${lv}m`)),
    };
  });
}
