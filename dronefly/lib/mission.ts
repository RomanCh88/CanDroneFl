// Mission planning maths (pure). Used by the /mission page, its map overlays and exports.
//
// Model:
//  - Airspeed v is chosen by the user (≤ max speed at the current payload).
//  - Usable flight time = spec endurance at payload (lower value, after cold)
//      × speed factor (full up to 80 % of max speed, dropping linearly to 90 % at max speed —
//        spec flight times are usually hover times; moderate forward flight is about as efficient)
//      × (1 − reserve).
//  - Per leg, wind (speed w, coming FROM φ) is split into along-track a and cross-track c.
//    Ground speed g = √(v² − c²) + a. If c ≥ v or g ≤ 0 the leg is impossible.
//  - One-way reach on heading θ: T·g(θ). Out-and-back reach: T·g₁g₂ / (g₁ + g₂).
//  - The control-link / max range is NOT a cap: reach areas show physical reach; exceeding the
//    range is a warning (drawn as a separate circle on the map).

import { DroneProfile, PerformanceResult } from '@/types';
import { LatLng, bearingDeg, destination, distanceKm, interpolate } from './geo';
import { PointWeather, WIND_LEVELS } from './weather';

export type MissionMode = 'oneway' | 'return';

export interface Wind { speedMs: number; fromDeg: number; gustMs: number }

export interface Aircraft {
  /** Max airspeed at the current payload (m/s). */
  maxAirspeedMs: number;
  /** Flight time at the current payload after cold, lower spec value (min). */
  enduranceMin: number;
  /** Control-link / max range from the launch point (km). */
  linkRangeKm: number;
  windLimitSustained: number;
  windLimitGust: number;
  /** True when built from rough type defaults (drone has no detailed specs). */
  estimated: boolean;
}

// Typical cruise speeds for drones without specs (m/s) — same table as lib/range.ts.
const TYPE_SPEED: Record<DroneProfile['type'], number> = { fpv: 22, multirotor: 12, fixed_wing: 25 };

/** Build the aircraft model from a drone + its performance at the chosen payload/weather. */
export function aircraftFor(drone: DroneProfile, perf: PerformanceResult | undefined, temperature: number): Aircraft {
  if (perf && drone.performance) {
    return {
      maxAirspeedMs: perf.airspeedMs,
      enduranceMin: perf.endurance.min,
      linkRangeKm: drone.performance.maxRangeKm,
      windLimitSustained: perf.windLimitSustained,
      windLimitGust: perf.windLimitGust,
      estimated: false,
    };
  }
  const cold = temperature < 0 ? 1 - Math.min(0.3, Math.abs(temperature) * 0.01) : 1;
  return {
    maxAirspeedMs: TYPE_SPEED[drone.type],
    enduranceMin: drone.nominalEndurance * cold,
    linkRangeKm: drone.nominalRange,
    windLimitSustained: drone.limits.maxWindSpeed,
    windLimitGust: drone.limits.maxWindGusts,
    estimated: true,
  };
}

/** Flight-time multiplier for flying at airspeed v (see model notes). */
export function speedFactor(v: number, vMax: number): number {
  if (vMax <= 0) return 0;
  const x = Math.min(1, v / vMax);
  return x <= 0.8 ? 1 : 1 - ((x - 0.8) / 0.2) * 0.1;
}

export function usableMinutes(ac: Aircraft, airspeedMs: number, reservePct: number): number {
  return ac.enduranceMin * speedFactor(airspeedMs, ac.maxAirspeedMs) * (1 - reservePct / 100);
}

/** Ground speed (m/s) flying track `trackDeg` at airspeed v in wind; ≤ 0 means impossible. */
export function groundSpeed(trackDeg: number, v: number, wind: Wind): { g: number; along: number; cross: number } {
  const toDeg = (wind.fromDeg + 180) % 360;
  const ang = ((trackDeg - toDeg) * Math.PI) / 180;
  const along = wind.speedMs * Math.cos(ang); // + tailwind
  const cross = wind.speedMs * Math.sin(ang);
  if (Math.abs(cross) >= v) return { g: 0, along, cross };
  return { g: Math.sqrt(v * v - cross * cross) + along, along, cross };
}

// ---------------------------------------------------------------------------
// Wind at altitude from the multi-level forecast

/** Wind at `altitudeM` for hour index `h`: linear in speed, vector-interpolated direction. */
export function windAt(pw: PointWeather, h: number, altitudeM: number): Wind {
  const lv = WIND_LEVELS as readonly number[];
  const alt = Math.min(lv[lv.length - 1], Math.max(lv[0], altitudeM));
  let i = 0;
  while (i < lv.length - 2 && alt > lv[i + 1]) i++;
  const t = (alt - lv[i]) / (lv[i + 1] - lv[i]);
  const vec = (k: number) => {
    const s = pw.windSpeed[k][h] ?? 0;
    const d = ((pw.windDir[k][h] ?? 0) * Math.PI) / 180;
    return { x: s * Math.sin(d), y: s * Math.cos(d), s };
  };
  const a = vec(i);
  const b = vec(i + 1);
  const speed = a.s + (b.s - a.s) * t;
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const fromDeg = (Math.atan2(x, y) * 180) / Math.PI;
  // Gusts are a turbulent EXCESS over the mean wind that does not grow with height, so add the
  // 10 m excess instead of scaling by the 10 m gust ratio (which explodes in light wind:
  // 2.7 m/s gusting 7.2 → ratio 2.7 → 9.9 m/s aloft would become a fake 26 m/s gust).
  const s10 = pw.windSpeed[0][h] ?? 0;
  const excess = Math.max(0, (pw.gusts10[h] ?? s10) - s10);
  return { speedMs: speed, fromDeg: (fromDeg + 360) % 360, gustMs: speed + excess };
}

/** Vector-average several winds (for a leg crossing several forecast cells). */
export function averageWind(winds: Wind[]): Wind {
  if (winds.length === 0) return { speedMs: 0, fromDeg: 0, gustMs: 0 };
  let x = 0, y = 0, s = 0, gust = 0;
  for (const w of winds) {
    const d = (w.fromDeg * Math.PI) / 180;
    x += w.speedMs * Math.sin(d);
    y += w.speedMs * Math.cos(d);
    s += w.speedMs;
    gust = Math.max(gust, w.gustMs);
  }
  const n = winds.length;
  // Keep the mean speed (vector mean underestimates when directions differ a bit).
  return { speedMs: s / n, fromDeg: ((Math.atan2(x / n, y / n) * 180) / Math.PI + 360) % 360, gustMs: gust };
}

// ---------------------------------------------------------------------------
// Route sampling for the weather request

export interface Sample extends LatLng { leg: number }

/** Points to fetch weather for: every route point + intermediate points every ~spacing km (max total). */
export function sampleRoute(points: LatLng[], spacingKm = 3, maxSamples = 30): Sample[] {
  if (points.length < 2) return points.map(p => ({ ...p, leg: 0 }));
  const total = points.slice(1).reduce((acc, p, i) => acc + distanceKm(points[i], p), 0);
  const spacing = Math.max(spacingKm, total / Math.max(1, maxSamples - points.length));
  const out: Sample[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const d = distanceKm(a, b);
    const n = Math.max(1, Math.round(d / spacing));
    for (let k = 0; k < n; k++) out.push({ ...interpolate(a, b, k / n), leg: i });
  }
  out.push({ ...points[points.length - 1], leg: points.length - 2 });
  return out;
}

// ---------------------------------------------------------------------------
// Mission plan

export interface Leg {
  from: LatLng;
  to: LatLng;
  return: boolean;
  distKm: number;
  trackDeg: number;
  wind: Wind;
  headwindMs: number;  // + = headwind
  crosswindMs: number;
  groundKmh: number;
  timeMin: number;
  feasible: boolean;
}

export interface MissionPlan {
  legs: Leg[];
  distanceKm: number;
  timeMin: number;
  usableMin: number;
  /** Time left at the end, beyond the reserve (min). Negative = not enough battery. */
  marginMin: number;
  usedPct: number;
  /** Farthest straight-line distance from the launch point (km). */
  maxDistFromLaunchKm: number;
  withinLink: boolean;
  allLegsFlyable: boolean;
  /** Strongest mean wind / gust on the outbound legs (m/s). */
  maxWindMs: number;
  maxGustMs: number;
  /** Over the drone's weather limits — a WARNING only: the planner lets you fly in any conditions,
   *  the wind just shrinks distance/time (physically impossible legs are caught by allLegsFlyable). */
  windOverLimit: boolean;
  gustOverLimit: boolean;
  /** Physically possible: every leg flyable and enough battery.
   *  Weather limits and the max range (control link) are warnings only — the operator decides. */
  feasible: boolean;
  /** One-way: point where usable time runs out along the route (if it does). */
  batteryLimitPoint?: LatLng;
  /** Return: farthest point along the outbound route from which the drone can still get back. */
  turnBackPoint?: LatLng;
  /** Distance along the outbound route to that point (km). */
  limitAlongKm?: number;
}

function makeLeg(from: LatLng, to: LatLng, v: number, wind: Wind, isReturn: boolean): Leg {
  const distKm = distanceKm(from, to);
  const trackDeg = bearingDeg(from, to);
  const { g, along, cross } = groundSpeed(trackDeg, v, wind);
  const feasible = g > 0.5;
  return {
    from, to, return: isReturn, distKm, trackDeg, wind,
    headwindMs: -along, crosswindMs: Math.abs(cross),
    groundKmh: g * 3.6,
    timeMin: feasible ? distKm / (g * 3.6) * 60 : Infinity,
    feasible,
  };
}

/** Walk along legs until `budgetMin` runs out; returns the point and distance travelled. */
function walk(legs: Leg[], budgetMin: number): { point: LatLng; alongKm: number } | null {
  let t = 0, along = 0;
  for (const leg of legs) {
    if (!leg.feasible) return { point: leg.from, alongKm: along };
    if (t + leg.timeMin > budgetMin) {
      const frac = (budgetMin - t) / leg.timeMin;
      return { point: interpolate(leg.from, leg.to, frac), alongKm: along + leg.distKm * frac };
    }
    t += leg.timeMin;
    along += leg.distKm;
  }
  return null; // budget not exhausted
}

export function planMission(opts: {
  points: LatLng[];
  mode: MissionMode;
  airspeedMs: number;
  reservePct: number;
  aircraft: Aircraft;
  /** Wind per outbound leg (index = leg). */
  legWinds: Wind[];
}): MissionPlan | null {
  const { points, mode, airspeedMs: v, reservePct, aircraft: ac, legWinds } = opts;
  if (points.length < 2) return null;
  const out: Leg[] = [];
  for (let i = 0; i < points.length - 1; i++) out.push(makeLeg(points[i], points[i + 1], v, legWinds[i] ?? legWinds[0], false));
  const back: Leg[] = mode === 'return'
    ? out.slice().reverse().map(l => makeLeg(l.to, l.from, v, l.wind, true))
    : [];
  const legs = [...out, ...back];
  const usableMin = usableMinutes(ac, v, reservePct);
  const timeMin = legs.reduce((s, l) => s + l.timeMin, 0);
  const distance = legs.reduce((s, l) => s + l.distKm, 0);
  const launch = points[0];
  const maxDistFromLaunchKm = Math.max(...points.map(p => distanceKm(launch, p)));
  const allLegsFlyable = legs.every(l => l.feasible);
  const maxWindMs = Math.max(0, ...out.map(l => l.wind.speedMs));
  const maxGustMs = Math.max(0, ...out.map(l => l.wind.gustMs));
  const windOverLimit = maxWindMs > ac.windLimitSustained;
  const gustOverLimit = maxGustMs > ac.windLimitGust;
  const withinLink = maxDistFromLaunchKm <= ac.linkRangeKm + 1e-9;

  const plan: MissionPlan = {
    legs, distanceKm: distance, timeMin, usableMin,
    marginMin: usableMin - timeMin,
    usedPct: usableMin > 0 ? (timeMin / usableMin) * 100 : Infinity,
    maxDistFromLaunchKm, withinLink, allLegsFlyable,
    maxWindMs, maxGustMs, windOverLimit, gustOverLimit,
    feasible: allLegsFlyable && timeMin <= usableMin,
  };

  if (mode === 'oneway') {
    const w = walk(out, usableMin);
    if (w) { plan.batteryLimitPoint = w.point; plan.limitAlongKm = w.alongKm; }
  } else {
    // Binary-search the farthest fraction of the outbound route that still allows getting back.
    const outDist = out.reduce((s, l) => s + l.distKm, 0);
    const timeFor = (alongKm: number) => {
      let rem = alongKm, t = 0;
      for (const leg of out) {
        if (rem <= 0) break;
        const d = Math.min(rem, leg.distKm);
        const p = interpolate(leg.from, leg.to, d / leg.distKm);
        const o = makeLeg(leg.from, p, v, leg.wind, false);
        const b = makeLeg(p, leg.from, v, leg.wind, true);
        if (!o.feasible || !b.feasible) return Infinity;
        t += o.timeMin + b.timeMin;
        rem -= d;
      }
      return t;
    };
    if (timeFor(outDist) > usableMin) {
      let lo = 0, hi = outDist;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (timeFor(mid) <= usableMin) lo = mid; else hi = mid;
      }
      let rem = lo;
      for (const leg of out) {
        if (rem <= leg.distKm) { plan.turnBackPoint = interpolate(leg.from, leg.to, rem / leg.distKm); break; }
        rem -= leg.distKm;
      }
      plan.limitAlongKm = lo;
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Reachable area around the launch point (for the map)

export function reachPolygon(opts: {
  center: LatLng;
  mode: MissionMode;
  airspeedMs: number;
  usableMin: number;
  wind: Wind;
  steps?: number;
}): { polygon: LatLng[]; minKm: number; maxKm: number } {
  const { center, mode, airspeedMs: v, usableMin, wind } = opts;
  const steps = opts.steps ?? 72;
  const T = usableMin / 60; // h
  const polygon: LatLng[] = [];
  let minKm = Infinity, maxKm = 0;
  for (let i = 0; i < steps; i++) {
    const brg = (360 / steps) * i;
    const g1 = groundSpeed(brg, v, wind).g * 3.6; // km/h
    let r: number;
    if (mode === 'oneway') r = Math.max(0, g1) * T;
    else {
      const g2 = groundSpeed((brg + 180) % 360, v, wind).g * 3.6;
      r = g1 > 0 && g2 > 0 ? (T * g1 * g2) / (g1 + g2) : 0;
    }
    minKm = Math.min(minKm, r);
    maxKm = Math.max(maxKm, r);
    polygon.push(destination(center, brg, r));
  }
  return { polygon, minKm, maxKm };
}

/** Airspeed (m/s) that maximises the time margin for this route, scanned in 1 km/h steps. */
export function bestAirspeed(opts: Omit<Parameters<typeof planMission>[0], 'airspeedMs'>): number {
  const vMax = opts.aircraft.maxAirspeedMs;
  let best = vMax * 0.7, bestMargin = -Infinity;
  for (let kmh = Math.ceil(vMax * 3.6 * 0.35); kmh <= Math.floor(vMax * 3.6); kmh++) {
    const p = planMission({ ...opts, airspeedMs: kmh / 3.6 });
    if (p && p.allLegsFlyable && p.marginMin > bestMargin) { bestMargin = p.marginMin; best = kmh / 3.6; }
  }
  return best;
}
