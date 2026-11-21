'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import type { LatLng } from '@/lib/geo';
import type { MissionMode, MissionPlan } from '@/lib/mission';

export const MAP_COLORS = {
  a: '#00ff88',
  b: '#ff3344',
  wp: '#00b4d8',
  routeOk: '#00b4d8',
  routeBad: '#ff3344',
  returnArea: '#00ff88',
  onewayArea: '#ffaa00',
  link: '#4a6080',
  limit: '#ffaa00',
};

interface Props {
  points: LatLng[];
  mode: MissionMode;
  plan: MissionPlan | null;
  reachReturn?: LatLng[];
  reachOneway?: LatLng[];
  linkKm?: number;
  wind?: { fromDeg: number; speedMs: number; label: string };
  labels: { a: string; b: string; wp: (n: number) => string; turnBack: string; batteryLimit: string };
  legend: { route: string; returnArea: string; onewayArea: string; link: string };
  /** Change to re-fit the view (e.g. when another mission is opened). */
  fitKey: string;
  onMapClick: (p: LatLng) => void;
  onMovePoint: (index: number, p: LatLng) => void;
}

function pointLabel(i: number, n: number, labels: Props['labels']) {
  if (i === 0) return { text: labels.a, color: MAP_COLORS.a };
  if (i === n - 1 && n > 1) return { text: labels.b, color: MAP_COLORS.b };
  return { text: labels.wp(i), color: MAP_COLORS.wp };
}

export default function MissionMap(props: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Init once.
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(L => {
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const p0 = propsRef.current.points[0] ?? { lat: 50.4501, lng: 30.5234 };
      const map = L.map(elRef.current, { center: [p0.lat, p0.lng], zoom: 10, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        className: 'map-tiles',
        crossOrigin: true,
      }).addTo(map);
      map.on('click', (e: Leaflet.LeafletMouseEvent) => propsRef.current.onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      draw();
      fit();
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };

  }, []);

  function fit() {
    const L = LRef.current, map = mapRef.current;
    const { points, reachReturn, reachOneway } = propsRef.current;
    if (!L || !map || points.length === 0) return;
    const all = [...points, ...(reachOneway ?? []), ...(reachReturn ?? [])];
    if (all.length === 1) map.setView([all[0].lat, all[0].lng], Math.max(map.getZoom(), 11));
    else map.fitBounds(L.latLngBounds(all.map(p => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 14 });
  }

  function draw() {
    const L = LRef.current, layer = layerRef.current;
    if (!L || !layer) return;
    const { points, mode, plan, reachReturn, reachOneway, linkKm, labels } = propsRef.current;
    layer.clearLayers();
    const ll = (p: LatLng) => [p.lat, p.lng] as [number, number];

    // Reachable areas around the launch point.
    if (reachOneway && reachOneway.length > 2) {
      L.polygon(reachOneway.map(ll), {
        color: MAP_COLORS.onewayArea, weight: 1.5, dashArray: '6 6',
        fillColor: MAP_COLORS.onewayArea, fillOpacity: mode === 'oneway' ? 0.1 : 0.03, interactive: false,
      }).addTo(layer);
    }
    if (mode === 'return' && reachReturn && reachReturn.length > 2) {
      L.polygon(reachReturn.map(ll), {
        color: MAP_COLORS.returnArea, weight: 1.5, fillColor: MAP_COLORS.returnArea, fillOpacity: 0.1, interactive: false,
      }).addTo(layer);
    }
    if (points[0] && linkKm) {
      L.circle(ll(points[0]), {
        radius: linkKm * 1000, color: MAP_COLORS.link, weight: 1, dashArray: '2 6', fill: false, interactive: false,
      }).addTo(layer);
    }

    // Route: outbound solid, return dashed; red where a leg is impossible.
    if (plan) {
      for (const leg of plan.legs) {
        L.polyline([ll(leg.from), ll(leg.to)], {
          color: leg.feasible ? (plan.feasible ? MAP_COLORS.routeOk : MAP_COLORS.limit) : MAP_COLORS.routeBad,
          weight: leg.return ? 2 : 3,
          dashArray: leg.return ? '8 6' : undefined,
          opacity: 0.95,
          interactive: false,
        }).addTo(layer);
      }
    } else if (points.length > 1) {
      L.polyline(points.map(ll), { color: MAP_COLORS.routeOk, weight: 2, opacity: 0.6, interactive: false }).addTo(layer);
    }

    // Turn-back / battery-limit marker.
    const limit = plan?.turnBackPoint ?? plan?.batteryLimitPoint;
    if (limit) {
      L.marker(ll(limit), {
        interactive: false,
        icon: L.divIcon({
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<div style="width:22px;height:22px;border:2px solid ${MAP_COLORS.limit};background:rgba(10,15,26,.85);color:${MAP_COLORS.limit};font:700 13px monospace;display:flex;align-items:center;justify-content:center" title="${plan?.turnBackPoint ? labels.turnBack : labels.batteryLimit}">✕</div>`,
        }),
      }).addTo(layer);
    }

    // Route points (draggable).
    points.forEach((p, i) => {
      const { text, color } = pointLabel(i, points.length, labels);
      const m = L.marker(ll(p), {
        draggable: true,
        autoPan: true,
        icon: L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;border:2px solid ${color};background:rgba(10,15,26,.9);color:${color};font:700 12px monospace;display:flex;align-items:center;justify-content:center;cursor:grab">${text}</div>`,
        }),
      });
      m.on('dragend', () => {
        const q = m.getLatLng();
        propsRef.current.onMovePoint(i, { lat: q.lat, lng: q.lng });
      });
      m.addTo(layer);
    });
  }

  // Redraw on every relevant prop change.
  useEffect(() => { draw(); },

    [props.points, props.plan, props.reachReturn, props.reachOneway, props.linkKm, props.mode, props.labels]);

  useEffect(() => { fit(); },

    [props.fitKey]);

  const { wind, legend, mode } = props;
  return (
    <div className="relative w-full h-full">
      <div ref={elRef} className="w-full h-full" />

      {wind && (
        <div className="absolute top-2 right-2 z-[1000] border border-[#1e2d45] bg-[#0a0f1a]/90 px-2 py-1.5 font-mono text-xs text-[#c8d0e0] flex items-center gap-2 pointer-events-none">
          <span
            className="inline-block text-lg leading-none text-[#00b4d8]"
            style={{ transform: `rotate(${(wind.fromDeg + 180) % 360}deg)` }}
            aria-hidden
          >↑</span>
          <span>
            <span className="font-bold">{wind.speedMs.toFixed(1)} m/s</span>
            <span className="block text-[10px] text-[#4a6080]">{wind.label}</span>
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-[1000] border border-[#1e2d45] bg-[#0a0f1a]/90 px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] space-y-0.5 pointer-events-none">
        <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2" style={{ borderColor: MAP_COLORS.routeOk }} />{legend.route}</div>
        {mode === 'return' && (
          <div className="flex items-center gap-2"><span className="inline-block w-5 h-2.5 border" style={{ borderColor: MAP_COLORS.returnArea, background: 'rgba(0,255,136,.15)' }} />{legend.returnArea}</div>
        )}
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-2.5 border border-dashed" style={{ borderColor: MAP_COLORS.onewayArea }} />{legend.onewayArea}</div>
        <div className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dotted" style={{ borderColor: MAP_COLORS.link }} />{legend.link}</div>
      </div>
    </div>
  );
}
