'use client';

// Mission exports: JSON (everything), GPX (route for maps/GCS), KML (route + areas), CSV (legs), PNG (image).
// All generated locally in the browser; nothing is uploaded.

import type { LatLng } from './geo';
import type { MissionMode, MissionPlan, Wind } from './mission';

export interface ExportContext {
  name: string;
  mode: MissionMode;
  points: LatLng[];
  pointNames: string[];
  plan: MissionPlan | null;
  reachReturn?: LatLng[];
  reachOneway?: LatLng[];
  linkKm?: number;
  altitudeM: number;
  departure: string;
  airspeedKmh: number;
  payloadKg?: number;
  totalWeightKg?: number;
  reservePct: number;
  drone: { name: string; type: string; estimated: boolean };
  windAtLaunch?: Wind;
  /** Pre-formatted, localized lines for the PNG summary panel. */
  summaryLines: string[];
  statusText: string;
  statusOk: boolean;
  labels: { a: string; b: string; wp: (n: number) => string };
  legend: { route: string; returnArea: string; onewayArea: string; link: string };
  footer: string;
}

// ---------------------------------------------------------------------------
// helpers

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function fileBase(name: string): string {
  const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'mission';
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dronefly_${safe}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const esc = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
const r = (v: number, d = 1) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

// ---------------------------------------------------------------------------
// JSON

export function toJSON(ctx: ExportContext): Blob {
  const p = ctx.plan;
  const data = {
    generator: 'DroneFly',
    generatedAt: new Date().toISOString(),
    mission: {
      name: ctx.name, mode: ctx.mode, departure: ctx.departure, altitudeM: ctx.altitudeM,
      airspeedKmh: r(ctx.airspeedKmh), payloadKg: ctx.payloadKg, totalWeightKg: ctx.totalWeightKg, reservePct: ctx.reservePct,
      points: ctx.points.map((pt, i) => ({ name: ctx.pointNames[i], lat: r(pt.lat, 6), lng: r(pt.lng, 6) })),
    },
    drone: ctx.drone,
    windAtLaunch: ctx.windAtLaunch && { speedMs: r(ctx.windAtLaunch.speedMs), fromDeg: r(ctx.windAtLaunch.fromDeg, 0), gustMs: r(ctx.windAtLaunch.gustMs) },
    result: p && {
      feasible: p.feasible, distanceKm: r(p.distanceKm, 2), flightTimeMin: r(p.timeMin), usableTimeMin: r(p.usableMin),
      marginMin: r(p.marginMin), batteryUsedPct: r(p.usedPct, 0), maxDistFromLaunchKm: r(p.maxDistFromLaunchKm, 2),
      withinRange: p.withinLink, allLegsFlyable: p.allLegsFlyable, windOverLimit: p.windOverLimit,
      turnBackPoint: p.turnBackPoint && { lat: r(p.turnBackPoint.lat, 6), lng: r(p.turnBackPoint.lng, 6) },
      batteryLimitPoint: p.batteryLimitPoint && { lat: r(p.batteryLimitPoint.lat, 6), lng: r(p.batteryLimitPoint.lng, 6) },
      limitAlongRouteKm: p.limitAlongKm !== undefined ? r(p.limitAlongKm, 2) : undefined,
      legs: p.legs.map((l, i) => ({
        n: i + 1, direction: l.return ? 'return' : 'outbound',
        distKm: r(l.distKm, 2), trackDeg: r(l.trackDeg, 0),
        windMs: r(l.wind.speedMs), windFromDeg: r(l.wind.fromDeg, 0), gustMs: r(l.wind.gustMs),
        headwindMs: r(l.headwindMs), crosswindMs: r(l.crosswindMs),
        groundKmh: r(l.groundKmh), timeMin: r(l.timeMin), flyable: l.feasible,
      })),
    },
    reachableAreas: {
      returnPolygon: ctx.reachReturn?.map(q => [r(q.lat, 5), r(q.lng, 5)]),
      oneWayPolygon: ctx.reachOneway?.map(q => [r(q.lat, 5), r(q.lng, 5)]),
      maxRangeKm: ctx.linkKm,
    },
    disclaimer: ctx.footer,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

// ---------------------------------------------------------------------------
// GPX 1.1 — waypoints + route (outbound, and back to A for return missions)

export function toGPX(ctx: ExportContext): Blob {
  const pts = ctx.points.map((p, i) => ({ ...p, name: ctx.pointNames[i] }));
  const routePts = ctx.mode === 'return' && pts.length > 1 ? [...pts, ...pts.slice(0, -1).reverse()] : pts;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DroneFly" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(ctx.name)}</name><time>${new Date().toISOString()}</time></metadata>
${pts.map(p => `  <wpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><ele>${ctx.altitudeM}</ele><name>${esc(p.name)}</name></wpt>`).join('\n')}
  <rte>
    <name>${esc(ctx.name)}</name>
${routePts.map(p => `    <rtept lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><ele>${ctx.altitudeM}</ele><name>${esc(p.name)}</name></rtept>`).join('\n')}
  </rte>
</gpx>
`;
  return new Blob([xml], { type: 'application/gpx+xml' });
}

// ---------------------------------------------------------------------------
// KML — points, route, reachable areas

export function toKML(ctx: ExportContext): Blob {
  const c = (p: LatLng, alt = ctx.altitudeM) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)},${alt}`;
  const ring = (poly: LatLng[]) => [...poly, poly[0]].map(p => c(p, 0)).join(' ');
  const routePts = ctx.mode === 'return' && ctx.points.length > 1 ? [...ctx.points, ...ctx.points.slice(0, -1).reverse()] : ctx.points;
  const p = ctx.plan;
  const desc = ctx.summaryLines.map(esc).join('<br/>');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${esc(ctx.name)}</name>
  <description><![CDATA[${ctx.statusText}<br/>${desc}]]></description>
  <Style id="route"><LineStyle><color>ffd8b400</color><width>3</width></LineStyle></Style>
  <Style id="ret"><LineStyle><color>ff88ff00</color><width>1.5</width></LineStyle><PolyStyle><color>2288ff00</color></PolyStyle></Style>
  <Style id="one"><LineStyle><color>ff00aaff</color><width>1.5</width></LineStyle><PolyStyle><color>1100aaff</color></PolyStyle></Style>
${ctx.points.map((pt, i) => `  <Placemark><name>${esc(ctx.pointNames[i])}</name><Point><coordinates>${c(pt)}</coordinates></Point></Placemark>`).join('\n')}
  <Placemark><name>${esc(ctx.legend.route)}</name><styleUrl>#route</styleUrl><LineString><altitudeMode>relativeToGround</altitudeMode><coordinates>${routePts.map(q => c(q)).join(' ')}</coordinates></LineString></Placemark>
${ctx.reachOneway && ctx.reachOneway.length > 2 ? `  <Placemark><name>${esc(ctx.legend.onewayArea)}</name><styleUrl>#one</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(ctx.reachOneway)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>` : ''}
${ctx.mode === 'return' && ctx.reachReturn && ctx.reachReturn.length > 2 ? `  <Placemark><name>${esc(ctx.legend.returnArea)}</name><styleUrl>#ret</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(ctx.reachReturn)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>` : ''}
${p?.turnBackPoint ? `  <Placemark><name>Turn-back</name><Point><coordinates>${c(p.turnBackPoint)}</coordinates></Point></Placemark>` : ''}
${p?.batteryLimitPoint ? `  <Placemark><name>Battery limit</name><Point><coordinates>${c(p.batteryLimitPoint)}</coordinates></Point></Placemark>` : ''}
</Document>
</kml>
`;
  return new Blob([xml], { type: 'application/vnd.google-earth.kml+xml' });
}

// ---------------------------------------------------------------------------
// CSV — one row per leg (UTF-8 BOM so Excel opens Cyrillic correctly)

export function toCSV(ctx: ExportContext): Blob {
  const head = ['leg', 'direction', 'from_lat', 'from_lng', 'to_lat', 'to_lng', 'dist_km', 'track_deg', 'wind_ms', 'wind_from_deg', 'gust_ms', 'headwind_ms', 'crosswind_ms', 'ground_kmh', 'time_min', 'flyable'];
  const rows = (ctx.plan?.legs ?? []).map((l, i) => [
    i + 1, l.return ? 'return' : 'outbound',
    l.from.lat.toFixed(6), l.from.lng.toFixed(6), l.to.lat.toFixed(6), l.to.lng.toFixed(6),
    r(l.distKm, 3), r(l.trackDeg, 0), r(l.wind.speedMs), r(l.wind.fromDeg, 0), r(l.wind.gustMs),
    r(l.headwindMs), r(l.crosswindMs), r(l.groundKmh), r(l.timeMin), l.feasible ? 'yes' : 'no',
  ]);
  const csv = [head, ...rows].map(row => row.map(v => (v === null ? '' : String(v))).join(',')).join('\r\n');
  return new Blob(['﻿' + csv + '\r\n'], { type: 'text/csv;charset=utf-8' });
}

// ---------------------------------------------------------------------------
// PNG — map tiles + overlays + summary panel, drawn on a canvas

const TILE = 256;
const W = 1600, H = 1000, PANEL = 460, MAP_W = W - PANEL;

function project(p: LatLng, z: number) {
  const s = TILE * 2 ** z;
  const lat = Math.max(-85.0511, Math.min(85.0511, p.lat));
  const sin = Math.sin((lat * Math.PI) / 180);
  return { x: ((p.lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
}

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  if (y < 0 || y >= n) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => resolve(null), 8000);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = `https://tile.openstreetmap.org/${z}/${xx}/${y}.png`;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function toPNG(ctx: ExportContext): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const mono = (getComputedStyle(document.documentElement).getPropertyValue('--font-jetbrains') || '').trim() || 'monospace';
  const font = (px: number, bold = false) => `${bold ? '700 ' : ''}${px}px ${mono}, monospace`;

  g.fillStyle = '#0a0f1a';
  g.fillRect(0, 0, W, H);

  // ---- choose zoom/viewport
  const geo = [...ctx.points, ...(ctx.reachOneway ?? []), ...(ctx.reachReturn ?? [])];
  let z = 15;
  for (; z > 3; z--) {
    const ps = geo.map(p => project(p, z));
    const w = Math.max(...ps.map(p => p.x)) - Math.min(...ps.map(p => p.x));
    const h = Math.max(...ps.map(p => p.y)) - Math.min(...ps.map(p => p.y));
    if (w <= MAP_W - 120 && h <= H - 120) break;
  }
  const ps = geo.map(p => project(p, z));
  const cx = (Math.max(...ps.map(p => p.x)) + Math.min(...ps.map(p => p.x))) / 2;
  const cy = (Math.max(...ps.map(p => p.y)) + Math.min(...ps.map(p => p.y))) / 2;
  const ox = cx - MAP_W / 2, oy = cy - H / 2;
  const toPx = (p: LatLng) => { const q = project(p, z); return { x: q.x - ox, y: q.y - oy }; };

  // ---- tiles (dark style like the app: same filter as .map-tiles)
  const tx0 = Math.floor(ox / TILE), tx1 = Math.floor((ox + MAP_W) / TILE);
  const ty0 = Math.floor(oy / TILE), ty1 = Math.floor((oy + H) / TILE);
  const jobs: Promise<void>[] = [];
  g.save();
  g.beginPath();
  g.rect(0, 0, MAP_W, H);
  g.clip();
  g.filter = 'invert(1) hue-rotate(180deg) brightness(0.8) saturate(0.6)';
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      jobs.push(loadTile(z, tx, ty).then(img => { if (img) g.drawImage(img, tx * TILE - ox, ty * TILE - oy, TILE, TILE); }));
    }
  }
  await Promise.all(jobs);
  g.filter = 'none';

  // ---- overlays
  const poly = (pts: LatLng[], stroke: string, fill: string, dash: number[] = []) => {
    if (pts.length < 3) return;
    g.beginPath();
    pts.forEach((p, i) => { const q = toPx(p); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.setLineDash(dash);
    g.strokeStyle = stroke;
    g.lineWidth = 2;
    g.stroke();
    g.setLineDash([]);
  };
  if (ctx.reachOneway) poly(ctx.reachOneway, '#ffaa00', ctx.mode === 'oneway' ? 'rgba(255,170,0,0.12)' : 'rgba(255,170,0,0.04)', [10, 8]);
  if (ctx.mode === 'return' && ctx.reachReturn) poly(ctx.reachReturn, '#00ff88', 'rgba(0,255,136,0.12)');

  if (ctx.points[0] && ctx.linkKm) {
    const c0 = toPx(ctx.points[0]);
    const east = project({ lat: ctx.points[0].lat, lng: ctx.points[0].lng + ctx.linkKm / (111.32 * Math.cos((ctx.points[0].lat * Math.PI) / 180)) }, z);
    const rad = east.x - ox - c0.x;
    g.beginPath();
    g.setLineDash([3, 8]);
    g.strokeStyle = '#4a6080';
    g.lineWidth = 1.5;
    g.arc(c0.x, c0.y, rad, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }

  for (const leg of ctx.plan?.legs ?? []) {
    const a = toPx(leg.from), b = toPx(leg.to);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.setLineDash(leg.return ? [12, 8] : []);
    g.strokeStyle = leg.feasible ? (ctx.plan!.feasible ? '#00b4d8' : '#ffaa00') : '#ff3344';
    g.lineWidth = leg.return ? 3 : 4;
    g.stroke();
    g.setLineDash([]);
  }

  const limit = ctx.plan?.turnBackPoint ?? ctx.plan?.batteryLimitPoint;
  const box = (p: LatLng, text: string, color: string, size: number) => {
    const q = toPx(p);
    g.fillStyle = 'rgba(10,15,26,0.92)';
    g.fillRect(q.x - size / 2, q.y - size / 2, size, size);
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.strokeRect(q.x - size / 2, q.y - size / 2, size, size);
    g.fillStyle = color;
    g.font = font(size * 0.45, true);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, q.x, q.y + 1);
  };
  if (limit) box(limit, '✕', '#ffaa00', 30);
  ctx.points.forEach((p, i) => {
    const n = ctx.points.length;
    const isA = i === 0, isB = i === n - 1 && n > 1;
    box(p, isA ? ctx.labels.a : isB ? ctx.labels.b : ctx.labels.wp(i), isA ? '#00ff88' : isB ? '#ff3344' : '#00b4d8', 36);
  });

  // wind indicator (top-right of map)
  if (ctx.windAtLaunch) {
    const x = MAP_W - 150, y = 20;
    g.fillStyle = 'rgba(10,15,26,0.9)';
    g.fillRect(x, y, 130, 64);
    g.strokeStyle = '#1e2d45';
    g.strokeRect(x, y, 130, 64);
    g.save();
    g.translate(x + 32, y + 32);
    g.rotate((((ctx.windAtLaunch.fromDeg + 180) % 360) * Math.PI) / 180);
    g.strokeStyle = '#00b4d8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 18); g.lineTo(0, -18); g.moveTo(-8, -8); g.lineTo(0, -18); g.lineTo(8, -8);
    g.stroke();
    g.restore();
    g.fillStyle = '#c8d0e0';
    g.font = font(16, true);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(`${ctx.windAtLaunch.speedMs.toFixed(1)} m/s`, x + 58, y + 24);
    g.fillStyle = '#4a6080';
    g.font = font(12);
    g.fillText(`${ctx.altitudeM} m`, x + 58, y + 44);
  }

  // legend (bottom-left) + attribution
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const legendRows: [string, string, number[]][] = [
    [ctx.legend.route, '#00b4d8', []],
    ...(ctx.mode === 'return' ? [[ctx.legend.returnArea, '#00ff88', []] as [string, string, number[]]] : []),
    [ctx.legend.onewayArea, '#ffaa00', [6, 5]],
    [ctx.legend.link, '#4a6080', [2, 5]],
  ];
  const lh = 22, lx = 16, ly = H - 16 - legendRows.length * lh - 10;
  g.fillStyle = 'rgba(10,15,26,0.9)';
  g.fillRect(lx, ly, 260, legendRows.length * lh + 14);
  g.font = font(13);
  legendRows.forEach(([label, color, dash], i) => {
    const y = ly + 14 + i * lh;
    g.setLineDash(dash);
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(lx + 12, y); g.lineTo(lx + 44, y); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#c8d0e0';
    g.fillText(label, lx + 56, y);
  });
  g.font = font(11);
  g.fillStyle = 'rgba(10,15,26,0.8)';
  g.fillRect(MAP_W - 230, H - 22, 230, 22);
  g.fillStyle = '#4a6080';
  g.textAlign = 'right';
  g.fillText('© OpenStreetMap contributors', MAP_W - 8, H - 11);
  g.restore();

  // ---- summary panel
  const px = MAP_W;
  g.fillStyle = '#0d1424';
  g.fillRect(px, 0, PANEL, H);
  g.fillStyle = '#1e2d45';
  g.fillRect(px, 0, 2, H);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  let y = 44;
  g.fillStyle = '#00b4d8';
  g.font = font(22, true);
  g.fillText('DRONEFLY', px + 28, y);
  y += 34;
  g.fillStyle = '#ffffff';
  g.font = font(19, true);
  for (const line of wrapText(g, ctx.name, PANEL - 56)) { g.fillText(line, px + 28, y); y += 26; }
  y += 8;
  g.fillStyle = ctx.statusOk ? '#00ff88' : '#ff3344';
  g.fillRect(px + 28, y, 6, 34);
  g.font = font(24, true);
  g.fillText(ctx.statusText, px + 46, y + 26);
  y += 62;
  g.font = font(14);
  for (const raw of ctx.summaryLines) {
    if (raw === '') { y += 10; continue; }
    const isHead = raw.startsWith('//');
    g.fillStyle = isHead ? '#4a6080' : '#c8d0e0';
    g.font = font(isHead ? 12 : 14, !isHead && raw.includes(':') ? false : false);
    for (const line of wrapText(g, raw, PANEL - 56)) {
      if (y > H - 70) break;
      g.fillText(line, px + 28, y);
      y += isHead ? 20 : 22;
    }
  }
  g.fillStyle = '#2d4060';
  g.font = font(11);
  let fy = H - 44;
  for (const line of wrapText(g, ctx.footer, PANEL - 56)) { g.fillText(line, px + 28, fy); fy += 15; }
  g.fillText(new Date().toLocaleString(), px + 28, fy);

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  );
}
