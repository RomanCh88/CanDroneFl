// Great-circle helpers (spherical Earth, accurate to well under 0.5 % at mission distances).

export interface LatLng { lat: number; lng: number }

const R = 6371.0088; // mean Earth radius, km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees 0–360 (0 = north, clockwise). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Point at `distKm` from `a` on initial bearing `brgDeg`. */
export function destination(a: LatLng, brgDeg: number, distKm: number): LatLng {
  const d = distKm / R;
  const b = rad(brgDeg);
  const lat1 = rad(a.lat);
  const lng1 = rad(a.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 };
}

/** Point at fraction t (0..1) along the segment a→b (great circle). */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return destination(a, bearingDeg(a, b), distanceKm(a, b) * t);
}

/** Parse "50.45, 30.52" / "50.45 30.52" / "50,45; 30,52". Returns null if not a valid pair. */
export function parseLatLng(text: string): LatLng | null {
  const cleaned = text.trim().replace(/;/g, ' ');
  // Prefer "lat, lng" with dot decimals; fall back to whitespace-separated with comma decimals.
  let m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) {
    const parts = cleaned.split(/\s+/);
    if (parts.length === 2) m = ['', parts[0].replace(',', '.'), parts[1].replace(',', '.')] as unknown as RegExpMatchArray;
  }
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const fmtLatLng = (p: LatLng, digits = 5) => `${p.lat.toFixed(digits)}, ${p.lng.toFixed(digits)}`;
