// Coordinate input parsing & formatting (all local, no network).
// Accepts: WGS84 decimal ("50.45, 30.52", "50,45 30,52", "N50.45 E30.52", "50.45N 30.52E"),
//          degrees-minutes(-seconds) ("50°27'00\"N 30°31'24\"E", "50 27.0 N, 30 31.4 E"),
//          MGRS ("36UUA2418291607", "36U UA 24182 91607", any even precision 0–10 digits).

import * as mgrs from 'mgrs';
import type { LatLng } from './geo';

export type CoordKind = 'wgs84' | 'dms' | 'mgrs';

export interface ParsedCoords extends LatLng {
  kind: CoordKind;
}

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const num = (s: string) => Number(s.replace(',', '.'));

// ---------------------------------------------------------------------------
// MGRS

const MGRS_RE = /^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d*)$/;

function parseMGRS(text: string): ParsedCoords | null {
  const s = text.toUpperCase().replace(/\s+/g, '');
  const m = s.match(MGRS_RE);
  if (!m) return null;
  const zone = Number(m[1]);
  if (zone < 1 || zone > 60 || m[4].length % 2 !== 0 || m[4].length > 10) return null;
  try {
    const [lng, lat] = mgrs.toPoint(s); // centre of the referenced square
    return valid(lat, lng) ? { lat, lng, kind: 'mgrs' } : null;
  } catch {
    return null;
  }
}

/** "36U UA 24182 91607" (1 m precision by default). Empty string outside MGRS coverage (polar). */
export function toMGRS(p: LatLng, digits = 5): string {
  try {
    const raw = mgrs.forward([p.lng, p.lat], digits);
    const m = raw.match(/^(\d{1,2}[C-X])([A-Z]{2})(\d*)$/);
    if (!m) return raw;
    const half = m[3].length / 2;
    return half ? `${m[1]} ${m[2]} ${m[3].slice(0, half)} ${m[3].slice(half)}` : `${m[1]} ${m[2]}`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// WGS84 decimal & DMS

function parseDecimal(text: string): ParsedCoords | null {
  const t = text.trim();
  // "50.45, 30.52" / "50.45 30.52" / "50.45;30.52"
  let m = t.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (m) {
    const lat = Number(m[1]), lng = Number(m[2]);
    return valid(lat, lng) ? { lat, lng, kind: 'wgs84' } : null;
  }
  // Comma decimals: "50,45 30,52" / "50,45; 30,52"
  m = t.match(/^(-?\d{1,2}(?:,\d+)?)\s*[;\s]\s*(-?\d{1,3}(?:,\d+)?)$/);
  if (m) {
    const lat = num(m[1]), lng = num(m[2]);
    return valid(lat, lng) ? { lat, lng, kind: 'wgs84' } : null;
  }
  return null;
}

/** One axis: optional leading/trailing hemisphere, degrees, optional minutes, optional seconds. */
// Each number is a whole token: (?!\d)(?![.,]\d) stops "50" being split into "5" + "0".
const AXIS = String.raw`([NSEW])?\s*(\d{1,3}(?:[.,]\d+)?)(?!\d)(?![.,]\d)\s*(?:°|º|d)?\s*(?:(\d{1,2}(?:[.,]\d+)?)(?!\d)(?![.,]\d)\s*(?:'|′|’|m)?\s*)?(?:(\d{1,2}(?:[.,]\d+)?)(?!\d)(?![.,]\d)\s*(?:"|″|”|''|s)?\s*)?([NSEW])?`;
const DMS_RE = new RegExp(`^\\s*${AXIS}\\s*[,;/]?\\s*${AXIS}\\s*$`, 'i');

function axisValue(deg: string, min?: string, sec?: string): number {
  return num(deg) + (min ? num(min) / 60 : 0) + (sec ? num(sec) / 3600 : 0);
}

function parseDMS(text: string): ParsedCoords | null {
  // Require some DMS/hemisphere marker so plain "50 30" stays a decimal pair.
  if (!/[°º'′’"″”NSEWnsew]/.test(text)) return null;
  const t = text.replace(/\s+/g, ' ').trim();
  const m = t.match(DMS_RE);
  if (!m) return null;
  const [, h1a, d1, m1, s1, h1bRaw, h2aRaw, d2, m2, s2, h2b] = m;
  // "S33.86 W70.5": the regex gives W to axis 1 as a trailing letter; if axis 1 already has a
  // leading letter, that trailing letter is really axis 2's leading one.
  let h1b: string | undefined = h1bRaw;
  let h2a: string | undefined = h2aRaw;
  if (h1a && h1b && !h2a) { h2a = h1b; h1b = undefined; }
  const h1 = (h1a || h1b || '').toUpperCase();
  const h2 = (h2a || h2b || '').toUpperCase();
  let a = axisValue(d1, m1, s1);
  let b = axisValue(d2, m2, s2);
  if ((m1 && num(m1) >= 60) || (s1 && num(s1) >= 60) || (m2 && num(m2) >= 60) || (s2 && num(s2) >= 60)) return null;
  // Allow "E30 N50" order.
  const firstIsLng = h1 === 'E' || h1 === 'W' || h2 === 'N' || h2 === 'S';
  if (firstIsLng) [a, b] = [b, a];
  const latH = firstIsLng ? h2 : h1;
  const lngH = firstIsLng ? h1 : h2;
  const lat = latH === 'S' ? -a : a;
  const lng = lngH === 'W' ? -b : b;
  const hasMinutes = !!(m1 || m2);
  return valid(lat, lng) ? { lat, lng, kind: hasMinutes ? 'dms' : 'wgs84' } : null;
}

/** Try every coordinate format. Returns null for free text (→ place-name search). */
export function parseCoordinates(text: string): ParsedCoords | null {
  const t = text.trim();
  if (t.length < 3) return null;
  return parseDecimal(t) ?? parseMGRS(t) ?? parseDMS(t);
}

export function formatDMS(p: LatLng): string {
  const f = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const mFull = (a - d) * 60;
    const m = Math.floor(mFull);
    const s = (mFull - m) * 60;
    return `${d}°${String(m).padStart(2, '0')}'${s.toFixed(1).padStart(4, '0')}"${v >= 0 ? pos : neg}`;
  };
  return `${f(p.lat, 'N', 'S')} ${f(p.lng, 'E', 'W')}`;
}
