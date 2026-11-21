// Payload- and weather-dependent performance for drones with detailed specs.
// Pure functions (no React) so they can be unit-tested and reused by the path planner.
//
// Model (documented so operators can trust / challenge it):
//  - Endurance: linear between (0 kg, empty) and (reference kg, loaded); same slope extended to max payload.
//  - Max speed: linear between empty and full payload. Airspeed for wind maths = the LOWER max
//    speed at this payload (what the drone can actually push into a headwind).
//  - Effective radius: linear between empty and full payload, capped by max range.
//  - Cold: −1 % endurance (and radius) per °C below 0, max −30 % (same as lib/range.ts).
//  - Wind: out-and-back flight with airspeed v and wind w. With along-track component a and
//    cross component c, ground speed out/back = s ± a where s = √(v² − c²). For a fixed
//    flight time the radius factor is (s² − a²) / (v·s). Worst case (pure along-wind) = 1 − (w/v)²,
//    pure crosswind = √(1 − (w/v)²). Head- vs tailwind outbound give the same round trip.
//  - Wind used = max(10 m wind, 80 m wind): the drone operates up to its ceiling.
//  - Wind limits at payload p: spec(p) = wind resistance interpolated empty → full payload.
//      sustained = min(spec(p), 85 % of airspeed)   (must be able to fly back)
//      gusts     = min(1.25 × spec(p), airspeed)     (brief, but never faster than the drone)

import { DronePerformance, PerformanceResult, SpecRange } from '@/types';

/** Wind ≥ this share of airspeed → return not guaranteed (NO_GO). */
export const NO_RETURN_RATIO = 0.85;
/** Radius cut by wind beyond this share → CAUTION. */
export const WIND_RADIUS_CAUTION = 0.3;
/** Gusts may briefly exceed the sustained spec by this factor (never beyond airspeed). */
export const GUST_FACTOR = 1.25;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function coldFactor(temperatureC: number): number {
  return temperatureC < 0 ? 1 - Math.min(0.3, Math.abs(temperatureC) * 0.01) : 1;
}

function enduranceAt(empty: number, loaded: number, refKg: number, payloadKg: number): number {
  if (refKg <= 0) return empty;
  const slope = (loaded - empty) / refKg; // min per kg (negative)
  return Math.max(empty * 0.1, empty + slope * payloadKg);
}

/** Radius factor for an out-and-back flight on `headingDeg` (see model notes). 0 = cannot return. */
export function roundTripFactor(headingDeg: number, windFromDeg: number, windMs: number, airspeedMs: number): number {
  if (windMs <= 0) return 1;
  if (airspeedMs <= 0) return 0;
  const windToDeg = (windFromDeg + 180) % 360;
  const angle = ((headingDeg - windToDeg) * Math.PI) / 180;
  const along = windMs * Math.cos(angle);
  const cross = windMs * Math.sin(angle);
  if (Math.abs(cross) >= airspeedMs) return 0;
  const s = Math.sqrt(airspeedMs * airspeedMs - cross * cross);
  if (Math.abs(along) >= s) return 0;
  return clamp((s * s - along * along) / (airspeedMs * s), 0, 1);
}

/** Wind resistance from the spec at payload fraction t (0 = empty, 1 = full). */
export function specWindAt(perf: DronePerformance, t: number, fallback: { sustained: number; gusts: number }): number {
  // Older records stored "12–17" as sustained/gusts; the spec meaning is 17 empty → 12 full.
  const empty = perf.windEmptyMs ?? fallback.gusts;
  const full = perf.windFullMs ?? fallback.sustained;
  return lerp(empty, full, clamp(t, 0, 1));
}

export function computePerformance(
  perf: DronePerformance,
  payloadKg: number,
  wx: { temperature: number; windSpeed: number; windSpeed80?: number },
  limitsFallback: { maxWindSpeed: number; maxWindGusts: number } = { maxWindSpeed: Infinity, maxWindGusts: Infinity }
): PerformanceResult {
  const p = clamp(payloadKg, 0, perf.maxPayloadKg);
  const tFull = perf.maxPayloadKg > 0 ? p / perf.maxPayloadKg : 0;

  const enduranceNominal: SpecRange = {
    min: enduranceAt(perf.enduranceEmptyMin.min, perf.enduranceLoadedMin.min, perf.loadedPayloadKg, p),
    max: enduranceAt(perf.enduranceEmptyMin.max, perf.enduranceLoadedMin.max, perf.loadedPayloadKg, p),
  };
  const cold = coldFactor(wx.temperature);
  const endurance: SpecRange = { min: enduranceNominal.min * cold, max: enduranceNominal.max * cold };

  const maxSpeedKmh: SpecRange = {
    min: lerp(perf.speedEmptyKmh.min, perf.speedFullKmh, tFull),
    max: lerp(perf.speedEmptyKmh.max, perf.speedFullKmh, tFull),
  };
  const airspeedMs = maxSpeedKmh.min / 3.6;

  const rawRadius = lerp(perf.radiusEmptyKm, perf.radiusFullKm, tFull);
  const limitedByRange = rawRadius > perf.maxRangeKm;
  const radiusNominalKm = Math.min(rawRadius, perf.maxRangeKm);
  const radiusStillKm = radiusNominalKm * cold;

  const windMs = Math.max(wx.windSpeed, wx.windSpeed80 ?? 0);
  const windRatio = airspeedMs > 0 ? windMs / airspeedMs : Infinity;
  // Worst case = pure along-wind leg.
  const worst = windRatio >= 1 ? 0 : 1 - windRatio * windRatio;
  const radiusWindKm = radiusStillKm * worst;

  const spec = specWindAt(perf, tFull, { sustained: limitsFallback.maxWindSpeed, gusts: limitsFallback.maxWindGusts });
  const speedCap = NO_RETURN_RATIO * airspeedMs;
  const windLimitSustained = Math.min(spec, speedCap);
  const windLimitGust = Math.max(windLimitSustained, Math.min(spec * GUST_FACTOR, airspeedMs));

  return {
    payloadKg: p,
    enduranceNominal: { min: Math.round(enduranceNominal.min), max: Math.round(enduranceNominal.max) },
    endurance: { min: Math.round(endurance.min), max: Math.round(endurance.max) },
    maxSpeedKmh: { min: Math.round(maxSpeedKmh.min), max: Math.round(maxSpeedKmh.max) },
    airspeedMs: round1(airspeedMs),
    windMs: round1(windMs),
    radiusNominalKm: round1(radiusNominalKm),
    radiusStillKm: round1(radiusStillKm),
    radiusWindKm: round1(radiusWindKm),
    limitedByRange,
    windRatio: Math.round(windRatio * 100) / 100,
    windLimitSustained: round1(windLimitSustained),
    windLimitGust: round1(windLimitGust),
    windLimitBy: speedCap < spec ? 'speed' : 'spec',
    totalWeightKg: perf.emptyWeightKg !== undefined ? round1(perf.emptyWeightKg + p) : undefined,
  };
}

/** Default payload for a drone with specs: the reference (typical mission) payload. */
export function defaultPayload(perf: DronePerformance): number {
  return clamp(perf.loadedPayloadKg, 0, perf.maxPayloadKg);
}
