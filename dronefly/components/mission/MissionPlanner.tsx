'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/contexts/UserDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DRONE_PROFILES } from '@/lib/droneProfiles';
import { computePerformance, defaultPayload } from '@/lib/performance';
import { assess, WeatherPoint } from '@/lib/assessment';
import { LatLng, fmtLatLng } from '@/lib/geo';
import { parseCoordinates, toMGRS } from '@/lib/coords';
import {
  aircraftFor, averageWind, bestAirspeed, planMission, reachPolygon, usableMinutes, windAt, Wind,
} from '@/lib/mission';
import { Mission, loadMissions, saveMissions, getPersist, setPersist, clearMissions, newMissionId } from '@/lib/missionStore';
import { ExportContext, downloadBlob, fileBase, toCSV, toGPX, toJSON, toKML, toPNG } from '@/lib/missionExport';
import { PointWeather } from '@/lib/weather';
import { useRouteWeather } from '@/hooks/useRouteWeather';
import { DroneProfile, FlyabilityAssessment } from '@/types';
import PayloadControl from '@/components/PayloadControl';
import { Panel, Btn, ConfirmDeleteBtn, Field, inputClass } from '@/components/profile/ui';

const MissionMap = dynamic(() => import('./MissionMap'), { ssr: false });

type ClickTarget = 'auto' | 'A' | 'B' | 'wp';

const STATUS_COLOR = { GO: '#00ff88', CAUTION: '#ffaa00', NO_GO: '#ff3344' } as const;

function weatherPointAt(pw: PointWeather, h: number): WeatherPoint {
  return {
    temperature: pw.temperature[h], humidity: pw.humidity[h], dewPoint: pw.dewPoint[h],
    precipitation: pw.precipitation[h], rain: pw.rain[h], snowfall: pw.snowfall[h],
    cloudCover: pw.cloudCover[h], visibility: pw.visibility[h], weatherCode: pw.weatherCode[h],
    windSpeed: pw.windSpeed[0][h], windDirection: pw.windDir[0][h], windGusts: pw.gusts10[h],
    windSpeed80: pw.windSpeed[1][h],
  };
}

export default function MissionPlanner() {
  const { user } = useAuth();
  const uid = user!.uid;
  const { customDrones, prefs, locations } = useUserData();
  const { lang, tr } = useLanguage();
  const allProfiles: DroneProfile[] = useMemo(() => [...DRONE_PROFILES, ...customDrones], [customDrones]);
  const droneName = useCallback((d: DroneProfile) => (lang === 'uk' ? (d.nameUk ?? d.name) : d.name), [lang]);

  // ---------------- missions (browser storage only) ----------------
  const [persist, setPersistState] = useState(() => (typeof window === 'undefined' ? false : getPersist(uid)));
  const [missions, setMissions] = useState<Mission[]>(() => (typeof window === 'undefined' ? [] : loadMissions(uid)));
  const [currentId, setCurrentId] = useState<string | null>(() => missions[0]?.id ?? null);

  const makeMission = useCallback((n: number): Mission => {
    const preferred = allProfiles.find(p => p.id === prefs.defaultDroneId)
      ?? customDrones.find(d => d.performance) ?? allProfiles[0];
    const home = locations.find(l => l.id === prefs.defaultLocationId);
    return {
      id: newMissionId(),
      name: tr.missionDefaultName(n),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      droneId: preferred.id,
      payloadKg: preferred.performance ? defaultPayload(preferred.performance) : null,
      airspeedKmh: null,
      altitudeM: 100,
      hourIndex: 0,
      reservePct: 20,
      mode: 'return',
      points: home ? [{ lat: home.lat, lng: home.lng }] : [],
    };
  }, [allProfiles, customDrones, prefs.defaultDroneId, prefs.defaultLocationId, locations, tr]);

  // Always have a mission to work on.
  useEffect(() => {
    if (missions.length === 0) {
      const m = makeMission(1);
      // Seeding the first mission once on an empty list.

      setMissions([m]);
      setCurrentId(m.id);
    }
  }, [missions.length, makeMission]);

  useEffect(() => { saveMissions(uid, missions); }, [uid, missions]);

  const mission = missions.find(m => m.id === currentId) ?? missions[0];
  const update = useCallback((patch: Partial<Mission>) => {
    setMissions(list => list.map(m => (m.id === (currentId ?? list[0]?.id) ? { ...m, ...patch, updatedAt: Date.now() } : m)));
  }, [currentId]);

  const [clickTarget, setClickTarget] = useState<ClickTarget>('auto');
  const [coordFormat, setCoordFormatState] = useState<CoordFormat>(() => {
    if (typeof window === 'undefined') return 'wgs84';
    try { return localStorage.getItem(COORD_FORMAT_KEY) === 'mgrs' ? 'mgrs' : 'wgs84'; } catch { return 'wgs84'; }
  });
  const setCoordFormat = (f: CoordFormat) => {
    setCoordFormatState(f);
    try { localStorage.setItem(COORD_FORMAT_KEY, f); } catch { /* storage unavailable */ }
  };
  const [fitKey, setFitKey] = useState('init');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const points = useMemo(() => mission?.points ?? [], [mission?.points]);
  const drone = allProfiles.find(p => p.id === mission?.droneId) ?? allProfiles[0];
  const perfSpec = drone.performance;
  const payloadKg = perfSpec ? Math.min(mission?.payloadKg ?? defaultPayload(perfSpec), perfSpec.maxPayloadKg) : undefined;
  const ceiling = perfSpec?.ceilingM.min ?? 500;
  const altitudeM = Math.min(mission?.altitudeM ?? 100, ceiling);

  // ---------------- weather along the route ----------------
  const { samples, weather, approximate, loading: wxLoading, error: wxError } = useRouteWeather(points);
  const hours = weather?.[0]?.time.length ?? 0;
  const h = Math.min(mission?.hourIndex ?? 0, Math.max(0, hours - 1));
  const hourLabel = (i: number) => {
    const t = weather?.[0]?.time[i];
    if (!t) return `+${i} h`;
    const d = new Date(t); // local time of the location (no tz suffix)
    return d.toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ---------------- calculation ----------------
  const calc = useMemo(() => {
    if (!mission || !weather || weather.length === 0) return null;
    const wA = weather[0];
    const temperature = wA.temperature[h];
    const perf = perfSpec ? computePerformance(perfSpec, payloadKg ?? 0, { temperature, windSpeed: 0 }, drone.limits) : undefined;
    const aircraft = aircraftFor(drone, perf, temperature);
    const windLaunch: Wind = windAt(wA, h, altitudeM);

    const legWinds: Wind[] = [];
    for (let i = 0; i < Math.max(0, points.length - 1); i++) {
      const idx = samples.map((s, k) => (s.leg === i ? k : -1)).filter(k => k >= 0);
      // Include the first sample of the next leg (= this leg's end point) when there is one.
      const next = idx[idx.length - 1] + 1;
      const used = next < samples.length ? [...idx, next] : idx;
      legWinds.push(averageWind(used.map(k => windAt(weather[k], h, altitudeM))));
    }

    const base = { points, mode: mission.mode, reservePct: mission.reservePct, aircraft, legWinds };
    const autoSpeed = points.length >= 2 ? bestAirspeed(base) : aircraft.maxAirspeedMs * 0.8;
    const airspeedMs = Math.min(aircraft.maxAirspeedMs, mission.airspeedKmh !== null ? mission.airspeedKmh / 3.6 : autoSpeed);
    const plan = planMission({ ...base, airspeedMs });
    const usable = usableMinutes(aircraft, airspeedMs, mission.reservePct);

    const center = points[0];
    const reachO = center ? reachPolygon({ center, mode: 'oneway', airspeedMs, usableMin: usable, wind: windLaunch }) : null;
    const reachR = center ? reachPolygon({ center, mode: 'return', airspeedMs, usableMin: usable, wind: windLaunch }) : null;

    const wxA: FlyabilityAssessment = assess(drone, weatherPointAt(wA, h), lang, { payloadKg });
    const wB = weather[weather.length - 1];
    const wxB: FlyabilityAssessment | null = points.length >= 2 ? assess(drone, weatherPointAt(wB, h), lang, { payloadKg }) : null;

    return { perf, aircraft, windLaunch, legWinds, airspeedMs, autoSpeed, plan, usable, reachO, reachR, wxA, wxB, temperature };
  }, [mission, weather, h, perfSpec, payloadKg, drone, altitudeM, points, samples, lang]);

  // ---------------- route editing ----------------
  const setPoints = (next: LatLng[]) => update({ points: next });

  /** Insert a point: A if none, then B, then waypoints before B (or the explicit target). */
  const addPoint = useCallback((p: LatLng, explicit: ClickTarget = 'auto') => {
    if (!mission) return;
    const pts = mission.points;
    const target: ClickTarget = explicit === 'auto' ? (pts.length === 0 ? 'A' : pts.length === 1 ? 'B' : 'wp') : explicit;
    let next: LatLng[];
    if (target === 'A') next = pts.length === 0 ? [p] : [p, ...pts.slice(1)];
    else if (target === 'B') next = pts.length <= 1 ? [...pts, p] : [...pts.slice(0, -1), p];
    else next = pts.length < 2 ? [...pts, p] : [...pts.slice(0, -1), p, pts[pts.length - 1]];
    update({ points: next });
  }, [mission, update]);

  const onMapClick = useCallback((p: LatLng) => {
    addPoint(p, clickTarget);
    if (clickTarget !== 'auto' && clickTarget !== 'wp') setClickTarget('auto');
  }, [addPoint, clickTarget]);

  const onMovePoint = useCallback((i: number, p: LatLng) => {
    if (!mission) return;
    update({ points: mission.points.map((q, k) => (k === i ? p : q)) });
  }, [mission, update]);

  const pointName = (i: number, n = points.length) => (i === 0 ? tr.pointA : i === n - 1 && n > 1 ? tr.pointB : tr.waypointN(i));

  // ---------------- export ----------------
  const kmhU = lang === 'uk' ? 'км/год' : 'km/h';
  const kmU = lang === 'uk' ? 'км' : 'km';
  const minU = lang === 'uk' ? 'хв' : 'min';
  const msU = lang === 'uk' ? 'м/с' : 'm/s';

  const failReasons = (): string[] => {
    const p = calc?.plan;
    if (!p) return [];
    const out: string[] = [];
    if (!p.allLegsFlyable) out.push(tr.reasonLeg);
    if (p.marginMin < 0 && p.allLegsFlyable) out.push(tr.reasonBattery(Math.abs(p.marginMin).toFixed(1)));
    return out;
  };

  /** Weather over the drone's limits: amber warnings, never blocking (operator decides). */
  const windWarnings = (): string[] => {
    const p = calc?.plan;
    if (!p) return [];
    const out: string[] = [];
    if (p.windOverLimit) out.push(tr.warnWind(p.maxWindMs.toFixed(1), calc!.aircraft.windLimitSustained));
    if (p.gustOverLimit) out.push(tr.warnGust(p.maxGustMs.toFixed(1), calc!.aircraft.windLimitGust));
    if (!p.withinLink) out.push(tr.warnRange(p.maxDistFromLaunchKm.toFixed(1), calc!.aircraft.linkRangeKm));
    return out;
  };

  const buildExport = (): ExportContext | null => {
    if (!mission || !calc) return null;
    const p = calc.plan;
    const lines: string[] = [
      `${tr.droneLabel}: ${drone.icon} ${droneName(drone)}`,
      ...(payloadKg !== undefined ? [`⚖ ${calc.perf?.totalWeightKg !== undefined ? `${calc.perf.totalWeightKg} kg (${tr.payloadShort} ${payloadKg} kg)` : `${payloadKg} kg`}`] : []),
      `${tr.departure}: ${hourLabel(h)}`,
      `${tr.airspeed}: ${(calc.airspeedMs * 3.6).toFixed(0)} ${kmhU} · ${tr.altitude}: ${altitudeM} m · ${tr.reserve}: ${mission.reservePct}%`,
      `${tr.windAtAlt(altitudeM)}: ${calc.windLaunch.speedMs.toFixed(1)} ${msU} (${Math.round(calc.windLaunch.fromDeg)}°)`,
      '',
      `// ${tr.results}`,
      ...(p ? [
        `${tr.distance}: ${p.distanceKm.toFixed(1)} ${kmU}`,
        `${tr.flightTime}: ${p.timeMin.toFixed(1)} / ${p.usableMin.toFixed(1)} ${minU}`,
        `${tr.margin}: ${p.marginMin >= 0 ? '+' : ''}${p.marginMin.toFixed(1)} ${minU} · ${tr.batteryUsed}: ${Math.round(p.usedPct)}%`,
        ...(p.limitAlongKm !== undefined ? [p.turnBackPoint ? tr.turnBackHint(p.limitAlongKm.toFixed(1)) : tr.batteryLimitHint(p.limitAlongKm.toFixed(1))] : []),
        ...failReasons(),
        ...windWarnings().map(w => `⚠ ${w}`),
      ] : [tr.needTwoPoints]),
      '',
      ...(calc.reachR ? [`${tr.reachReturn}: ${tr.reachRange(calc.reachR.minKm.toFixed(1), calc.reachR.maxKm.toFixed(1))}`] : []),
      ...(calc.reachO ? [`${tr.reachOneway}: ${tr.reachRange(calc.reachO.minKm.toFixed(1), calc.reachO.maxKm.toFixed(1))}`] : []),
      ...points.map((pt, i) => `${pointName(i)}: ${fmtLatLng(pt)} · MGRS ${toMGRS(pt, 5)}`),
    ];
    return {
      name: mission.name, mode: mission.mode, points, pointNames: points.map((_, i) => pointName(i)),
      plan: p, reachReturn: calc.reachR?.polygon, reachOneway: calc.reachO?.polygon,
      linkKm: calc.aircraft.linkRangeKm, altitudeM, departure: weather?.[0]?.time[h] ?? '',
      airspeedKmh: calc.airspeedMs * 3.6, payloadKg, totalWeightKg: calc.perf?.totalWeightKg,
      reservePct: mission.reservePct,
      drone: { name: droneName(drone), type: drone.type, estimated: calc.aircraft.estimated },
      windAtLaunch: calc.windLaunch, summaryLines: lines,
      statusText: p ? (p.feasible ? tr.feasible : tr.notFeasible) : tr.needTwoPoints,
      statusOk: !!p?.feasible,
      labels: { a: tr.pointA, b: tr.pointB, wp: tr.waypointN },
      legend: { route: tr.legendRoute, returnArea: tr.legendReturnArea, onewayArea: tr.legendOnewayArea, link: tr.legendLink },
      footer: tr.generatedBy,
    };
  };

  const doExport = async (kind: 'json' | 'gpx' | 'kml' | 'csv' | 'png') => {
    const ctx = buildExport();
    if (!ctx) return;
    const base = fileBase(ctx.name);
    if (kind === 'json') downloadBlob(`${base}.json`, toJSON(ctx));
    if (kind === 'gpx') downloadBlob(`${base}.gpx`, toGPX(ctx));
    if (kind === 'kml') downloadBlob(`${base}.kml`, toKML(ctx));
    if (kind === 'csv') downloadBlob(`${base}.csv`, toCSV(ctx));
    if (kind === 'png') {
      setExporting(true);
      setExportError(false);
      try { downloadBlob(`${base}.png`, await toPNG(ctx)); }
      catch (e) { console.error(e); setExportError(true); }
      finally { setExporting(false); }
    }
  };

  if (!mission) return null;
  const plan = calc?.plan ?? null;
  const reasons = failReasons();
  const warnings = windWarnings();

  // ---------------- UI ----------------
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* MAP */}
      <div className="relative h-[55vh] lg:h-auto lg:flex-1 order-1 lg:order-2 border-b lg:border-b-0 border-[#1e2d45]">
        <MissionMap
          points={points}
          mode={mission.mode}
          plan={plan}
          reachReturn={calc?.reachR?.polygon}
          reachOneway={calc?.reachO?.polygon}
          linkKm={calc?.aircraft.linkRangeKm}
          wind={calc ? { fromDeg: calc.windLaunch.fromDeg, speedMs: calc.windLaunch.speedMs, label: tr.windAtAlt(altitudeM) } : undefined}
          labels={MAP_LABELS(tr)}
          legend={{ route: tr.legendRoute, returnArea: tr.legendReturnArea, onewayArea: tr.legendOnewayArea, link: tr.legendLink }}
          fitKey={fitKey}
          onMapClick={onMapClick}
          onMovePoint={onMovePoint}
        />
        {/* click-mode toolbar */}
        <div className="absolute top-2 left-12 z-[1000] flex items-center gap-1 border border-[#1e2d45] bg-[#0a0f1a]/90 px-2 py-1 font-mono text-[11px]">
          <span className="text-[#4a6080] mr-1 hidden sm:inline">{tr.clickSets}</span>
          {([['A', tr.setA, '#00ff88'], ['B', tr.setB, '#ff3344'], ['wp', tr.addWaypoint, '#00b4d8']] as const).map(([k, label, color]) => (
            <button
              key={k}
              type="button"
              onClick={() => setClickTarget(t => (t === k ? 'auto' : k))}
              className="border px-2 py-0.5 transition-colors"
              style={{ borderColor: clickTarget === k ? color : '#1e2d45', color: clickTarget === k ? color : '#c8d0e0', background: clickTarget === k ? `${color}1a` : 'transparent' }}
            >
              {label}
            </button>
          ))}
        </div>
        {(wxLoading || approximate) && (
          <div className="absolute top-12 left-12 z-[1000] border border-[#1e2d45] bg-[#0a0f1a]/90 px-2 py-1 font-mono text-[11px] text-[#00b4d8] animate-pulse">
            {tr.loadingRouteWx}
          </div>
        )}
      </div>

      {/* SIDE PANEL */}
      <aside className="order-2 lg:order-1 w-full lg:w-[420px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-r border-[#1e2d45] p-3 space-y-3">
        {/* Missions */}
        <Panel
          title={tr.missions}
          action={<Btn variant="primary" onClick={() => { const m = makeMission(missions.length + 1); setMissions(l => [m, ...l]); setCurrentId(m.id); setFitKey(m.id); }}>{tr.newMission}</Btn>}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={mission.id}
                onChange={e => { setCurrentId(e.target.value); setFitKey(e.target.value); }}
                className={`${inputClass} flex-1`}
                aria-label={tr.missions}
              >
                {missions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ConfirmDeleteBtn
                label="✕"
                confirmLabel={tr.confirmDelete}
                onConfirm={() => {
                  const rest = missions.filter(m => m.id !== mission.id);
                  setMissions(rest);
                  setCurrentId(rest[0]?.id ?? null);
                  setFitKey(rest[0]?.id ?? 'none');
                }}
              />
            </div>
            <Field label={tr.missionName}>
              <input value={mission.name} onChange={e => update({ name: e.target.value.slice(0, 60) })} className={inputClass} />
            </Field>
            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-mono text-[#c8d0e0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={persist}
                  onChange={e => { setPersist(uid, e.target.checked); setPersistState(e.target.checked); saveMissions(uid, missions); }}
                  className="accent-[#00b4d8] w-4 h-4"
                />
                {tr.rememberOnDevice}
              </label>
              <ConfirmDeleteBtn
                label={tr.clearAll}
                confirmLabel={tr.confirmDelete}
                onConfirm={() => { clearMissions(uid); const m = makeMission(1); setMissions([m]); setCurrentId(m.id); setFitKey(m.id); }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#2d4060] leading-relaxed">{tr.rememberHint} {tr.opsecNote}</div>
          </div>
        </Panel>

        {/* Drone & weight */}
        <Panel title={tr.droneLabel}>
          <div className="space-y-2">
            <select
              value={drone.id}
              onChange={e => {
                const d = allProfiles.find(p => p.id === e.target.value);
                update({ droneId: e.target.value, payloadKg: d?.performance ? defaultPayload(d.performance) : null, airspeedKmh: null });
              }}
              className={inputClass}
              aria-label={tr.droneLabel}
            >
              {allProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {droneName(p)}{p.performance ? ' ⚖' : ''}</option>
              ))}
            </select>
            {perfSpec ? (
              <PayloadControl compact perf={perfSpec} value={payloadKg ?? 0} onChange={kg => update({ payloadKg: kg })} />
            ) : (
              <div className="text-[11px] font-mono text-[#ffaa00] leading-relaxed">⚠ {tr.noSpecsWarning}</div>
            )}
          </div>
        </Panel>

        {/* Flight parameters */}
        <Panel title={tr.missionMode}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1">
              {(['oneway', 'return'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ mode: m })}
                  className={`border py-1.5 text-xs font-mono tracking-wider ${mission.mode === m ? 'border-[#00b4d8] text-[#00b4d8] bg-[#00b4d8]/10' : 'border-[#1e2d45] text-[#4a6080] hover:text-[#c8d0e0]'}`}
                >
                  {m === 'oneway' ? tr.modeOneway : tr.modeReturn}
                </button>
              ))}
            </div>

            <SliderRow
              label={tr.airspeed}
              value={calc ? Math.round(calc.airspeedMs * 3.6) : 0}
              unit={kmhU}
              min={10}
              max={calc ? Math.floor(calc.aircraft.maxAirspeedMs * 3.6) : 100}
              onChange={v => update({ airspeedKmh: v })}
              extra={
                <button
                  type="button"
                  onClick={() => update({ airspeedKmh: mission.airspeedKmh === null ? Math.round((calc?.airspeedMs ?? 10) * 3.6) : null })}
                  title={tr.autoHint}
                  className={`border px-1.5 py-0.5 text-[10px] font-mono ${mission.airspeedKmh === null ? 'border-[#00ff88] text-[#00ff88]' : 'border-[#1e2d45] text-[#4a6080]'}`}
                >
                  {tr.auto}
                </button>
              }
              hint={mission.airspeedKmh === null ? tr.autoHint : undefined}
            />
            <SliderRow
              label={tr.altitude}
              value={altitudeM}
              unit="m"
              min={10}
              max={ceiling}
              step={10}
              onChange={v => update({ altitudeM: v })}
              hint={tr.altitudeHint(ceiling)}
            />
            <SliderRow label={tr.reserve} value={mission.reservePct} unit="%" min={0} max={50} step={5} onChange={v => update({ reservePct: v })} />
            <SliderRow
              label={tr.departure}
              value={h}
              display={h === 0 ? `${tr.nowLabel} · ${hourLabel(0)}` : hourLabel(h)}
              min={0}
              max={Math.max(0, hours - 1)}
              onChange={v => update({ hourIndex: v })}
            />
          </div>
        </Panel>

        {/* Route */}
        <Panel
          title={tr.route}
          action={
            <div className="flex gap-1">
              <div className="flex border border-[#1e2d45]" role="group" aria-label="coordinate format">
                {(['wgs84', 'mgrs'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCoordFormat(f)}
                    aria-pressed={coordFormat === f}
                    className={`px-1.5 py-1 text-[10px] font-mono ${coordFormat === f ? 'text-[#00b4d8] bg-[#00b4d8]/10' : 'text-[#4a6080] hover:text-[#c8d0e0]'}`}
                  >
                    {f === 'wgs84' ? 'WGS84' : 'MGRS'}
                  </button>
                ))}
              </div>
              <Btn onClick={() => setPoints(points.slice().reverse())} disabled={points.length < 2}>{tr.reverseRoute}</Btn>
              <Btn onClick={() => setPoints([])} disabled={points.length === 0}>{tr.clearRoute}</Btn>
            </div>
          }
        >
          <div className="space-y-1.5">
            {points.map((p, i) => (
              <PointRow
                key={`${i}-${points.length}`}
                label={pointName(i)}
                color={i === 0 ? '#00ff88' : i === points.length - 1 && points.length > 1 ? '#ff3344' : '#00b4d8'}
                point={p}
                format={coordFormat}
                onChange={q => setPoints(points.map((x, k) => (k === i ? q : x)))}
                onRemove={() => setPoints(points.filter((_, k) => k !== i))}
              />
            ))}
            <NewPointRow
              label={points.length === 0 ? tr.pointA : points.length === 1 ? tr.pointB : '+'}
              color={points.length === 0 ? '#00ff88' : points.length === 1 ? '#ff3344' : '#00b4d8'}
              format={coordFormat}
              placeholder={points.length === 0 ? tr.newPointA : points.length === 1 ? tr.newPointB : tr.newWaypoint}
              onAdd={p => { addPoint(p); setFitKey(`add-${Date.now()}`); }}
            />
            {locations.length > 0 && (
              <select
                value=""
                onChange={e => {
                  const l = locations.find(x => x.id === e.target.value);
                  if (!l) return;
                  const q = { lat: l.lat, lng: l.lng };
                  setPoints(points.length === 0 ? [q] : [q, ...points.slice(1)]);
                  setFitKey(`loc-${l.id}-${Date.now()}`);
                }}
                className={`${inputClass} !text-xs`}
              >
                <option value="">{tr.fromSaved} → {tr.pointA}</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            <div className="text-[10px] font-mono text-[#2d4060]">{tr.routeHint}</div>
          </div>
        </Panel>

        {/* Results */}
        <Panel title={tr.results}>
          {wxError && <div className="text-xs font-mono text-[#ff3344] mb-2">⚠ {wxError}</div>}
          {!plan ? (
            <div className="text-xs font-mono text-[#4a6080]">{points.length < 2 ? tr.needTwoPoints : tr.loadingRouteWx}</div>
          ) : (
            <div className="space-y-3">
              <div className={`border-l-4 pl-3 ${plan.feasible ? 'border-[#00ff88]' : 'border-[#ff3344]'}`}>
                <div className={`text-2xl font-bold font-mono ${plan.feasible ? 'text-[#00ff88]' : 'text-[#ff3344]'}`}>
                  {plan.feasible ? tr.feasible : tr.notFeasible}
                </div>
                {reasons.map(r => <div key={r} className="text-xs font-mono text-[#ff3344]">▶ {r}</div>)}
                {warnings.map(w => <div key={w} className="text-xs font-mono text-[#ffaa00]">⚠ {w}</div>)}
                {calc?.aircraft.estimated && <div className="text-[11px] font-mono text-[#ffaa00] mt-1">⚠ {tr.noSpecsWarning}</div>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Stat label={tr.distance} value={`${plan.distanceKm.toFixed(1)} ${kmU}`} />
                <Stat label={tr.flightTime} value={`${plan.timeMin.toFixed(1)} ${minU}`} />
                <Stat label={tr.usableTime} value={`${plan.usableMin.toFixed(1)} ${minU}`} />
                <Stat label={tr.margin} value={`${plan.marginMin >= 0 ? '+' : ''}${plan.marginMin.toFixed(1)} ${minU}`} color={plan.marginMin >= 0 ? '#00ff88' : '#ff3344'} />
                <Stat label={tr.batteryUsed} value={Number.isFinite(plan.usedPct) ? `${Math.round(plan.usedPct)}%` : '—'} color={plan.usedPct <= 100 ? (plan.usedPct > 85 ? '#ffaa00' : '#c8d0e0') : '#ff3344'} />
                <Stat label={tr.maxFromLaunch} value={`${plan.maxDistFromLaunchKm.toFixed(1)} / ${calc!.aircraft.linkRangeKm} ${kmU}`} color={plan.withinLink ? '#c8d0e0' : '#ffaa00'} />
              </div>

              {plan.limitAlongKm !== undefined && (
                <div className="text-xs font-mono text-[#ffaa00]">
                  ✕ {plan.turnBackPoint ? `${tr.turnBack}: ${tr.turnBackHint(plan.limitAlongKm.toFixed(1))}` : `${tr.batteryLimit}: ${tr.batteryLimitHint(plan.limitAlongKm.toFixed(1))}`}
                </div>
              )}

              <div className="text-[11px] font-mono text-[#4a6080] space-y-0.5">
                {calc?.reachR && <div><span className="text-[#00ff88]">■</span> {tr.reachReturn}: {tr.reachRange(calc.reachR.minKm.toFixed(1), calc.reachR.maxKm.toFixed(1))}</div>}
                {calc?.reachO && <div><span className="text-[#ffaa00]">□</span> {tr.reachOneway}: {tr.reachRange(calc.reachO.minKm.toFixed(1), calc.reachO.maxKm.toFixed(1))}</div>}
                {calc?.perf && <div>{tr.specRadiusCompare(calc.perf.radiusNominalKm)}</div>}
              </div>

              {/* Weather at A and B */}
              <div className="grid grid-cols-2 gap-2">
                {[{ p: tr.pointA, a: calc!.wxA }, ...(calc!.wxB ? [{ p: tr.pointB, a: calc!.wxB }] : [])].map(({ p, a }) => (
                  <div key={p} className="border border-[#1e2d45] p-2">
                    <div className="text-[10px] font-mono text-[#4a6080]">{tr.weatherAt(p)}</div>
                    <div className="text-sm font-bold font-mono" style={{ color: STATUS_COLOR[a.status] }}>
                      {a.status === 'GO' ? tr.statusGo : a.status === 'CAUTION' ? tr.statusCaution : tr.statusNoGo}
                    </div>
                    {a.reasons.slice(0, 2).map(r => <div key={r} className="text-[10px] font-mono text-[#4a6080] leading-tight">{r}</div>)}
                  </div>
                ))}
              </div>

              {/* Legs */}
              <div>
                <div className="text-[10px] font-mono uppercase text-[#4a6080] mb-1">{'// '}{tr.legs}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="text-[#4a6080]">
                      <tr className="border-b border-[#1e2d45]">
                        <th className="text-left font-normal py-1">#</th>
                        <th className="text-right font-normal">{kmU}</th>
                        <th className="text-right font-normal">{tr.colTrack}</th>
                        <th className="text-right font-normal">{tr.colWind}</th>
                        <th className="text-right font-normal">{tr.colGround}</th>
                        <th className="text-right font-normal">{tr.colTime}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.legs.map((l, i) => (
                        <tr key={i} className="border-b border-[#1e2d45]/50" style={{ color: l.feasible ? '#c8d0e0' : '#ff3344' }}>
                          <td className="py-1">{i + 1}{l.return && <span className="text-[#4a6080]"> {tr.returnLeg}</span>}</td>
                          <td className="text-right">{l.distKm.toFixed(1)}</td>
                          <td className="text-right">{Math.round(l.trackDeg)}°</td>
                          <td className="text-right" style={{ color: l.headwindMs > 0.5 ? '#ffaa00' : l.headwindMs < -0.5 ? '#00ff88' : undefined }}>
                            {Math.abs(l.headwindMs).toFixed(1)} {l.headwindMs >= 0 ? tr.headwindShort : tr.tailwindShort}
                          </td>
                          <td className="text-right">{l.feasible ? Math.round(l.groundKmh) : '—'}</td>
                          <td className="text-right">{Number.isFinite(l.timeMin) ? l.timeMin.toFixed(1) : '∞'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Export */}
        <Panel title={tr.exportTitle}>
          <div className="flex flex-wrap gap-1.5">
            <Btn variant="primary" onClick={() => doExport('png')} disabled={!calc || points.length === 0 || exporting}>{exporting ? tr.exporting : `▣ ${tr.exportPng}`}</Btn>
            {(['gpx', 'kml', 'csv', 'json'] as const).map(k => (
              <Btn key={k} onClick={() => doExport(k)} disabled={!calc || points.length === 0}>{k.toUpperCase()}</Btn>
            ))}
          </div>
          {exportError && <div className="text-xs font-mono text-[#ff3344] mt-2">{tr.exportFailed}</div>}
          <div className="text-[10px] font-mono text-[#2d4060] mt-2">{tr.exportHint}</div>
        </Panel>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MAP_LABELS(tr: ReturnType<typeof useLanguage>['tr']) {
  return { a: tr.pointA, b: tr.pointB, wp: tr.waypointN, turnBack: tr.turnBack, batteryLimit: tr.batteryLimit };
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-[#1e2d45] px-2 py-1.5">
      <div className="text-[10px] font-mono text-[#4a6080] leading-tight">{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color: color ?? '#c8d0e0' }}>{value}</div>
    </div>
  );
}

function SliderRow({ label, value, unit, display, min, max, step = 1, onChange, extra, hint }: {
  label: string; value: number; unit?: string; display?: string; min: number; max: number; step?: number;
  onChange: (v: number) => void; extra?: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#4a6080]">{label}</span>
        <span className="flex items-center gap-1.5">
          {extra}
          <span className="text-sm font-mono font-bold text-[#00b4d8] tabular-nums">{display ?? `${value} ${unit ?? ''}`}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={step}
        value={Math.min(Math.max(value, min), Math.max(min, max))}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-[#00b4d8] cursor-pointer"
      />
      {hint && <div className="text-[10px] font-mono text-[#2d4060]">{hint}</div>}
    </div>
  );
}

type CoordFormat = 'wgs84' | 'mgrs';
const COORD_FORMAT_KEY = 'dronefly.coordFormat';
const MGRS_SAMPLE = '36U UA 24182 91607';
const WGS_SAMPLE = '50.45010, 30.52340';

const formatPoint = (p: LatLng, f: CoordFormat) => (f === 'mgrs' ? toMGRS(p, 5) || fmtLatLng(p) : fmtLatLng(p));

/** WGS84 (decimal or DMS) or MGRS only — no place-name search in the planner. */
const parsePointInput = (text: string): LatLng | null => {
  const c = parseCoordinates(text);
  return c ? { lat: c.lat, lng: c.lng } : null;
};

function PointRow({ label, color, point, format, onChange, onRemove }: {
  label: string; color: string; point: LatLng; format: CoordFormat;
  onChange: (p: LatLng) => void; onRemove: () => void;
}) {
  const shown = formatPoint(point, format);
  const [text, setText] = useState(shown);
  const [bad, setBad] = useState(false);
  // Follow drags on the map and format switches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(shown);
    setBad(false);
  }, [shown]);
  const commit = () => {
    if (text.trim() === shown) return; // unchanged — don't re-save a rounded copy
    const p = parsePointInput(text);
    if (p) onChange(p); else setBad(true);
  };
  const placeholder = format === 'mgrs' ? MGRS_SAMPLE : WGS_SAMPLE;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 h-7 shrink-0 flex items-center justify-center border-2 text-xs font-bold font-mono" style={{ borderColor: color, color }}>{label}</span>
      <input
        value={text}
        onChange={e => { setText(e.target.value); setBad(false); }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        placeholder={placeholder}
        aria-invalid={bad}
        aria-label={label}
        className={`${inputClass} !py-1 !text-xs flex-1`}
      />
      <button type="button" onClick={onRemove} aria-label="remove" className="w-7 h-7 border border-[#1e2d45] text-[#4a6080] hover:border-[#ff3344] hover:text-[#ff3344] text-xs">✕</button>
    </div>
  );
}

/** Typed entry for a new route point (MGRS or WGS84). Enter adds it; invalid input is highlighted. */
function NewPointRow({ label, color, format, placeholder, onAdd }: {
  label: string; color: string; format: CoordFormat; placeholder: string; onAdd: (p: LatLng) => void;
}) {
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  const parsed = text.trim() ? parsePointInput(text) : null;
  const add = () => {
    if (!text.trim()) return;
    if (parsed) { onAdd(parsed); setText(''); setBad(false); } else setBad(true);
  };
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="w-8 h-7 shrink-0 flex items-center justify-center border-2 border-dashed text-xs font-bold font-mono" style={{ borderColor: color, color }}>{label}</span>
        <input
          value={text}
          onChange={e => { setText(e.target.value); setBad(false); }}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder={`${placeholder} — ${format === 'mgrs' ? MGRS_SAMPLE : WGS_SAMPLE}`}
          aria-invalid={bad}
          aria-label={placeholder}
          spellCheck={false}
          className={`${inputClass} !py-1 !text-xs flex-1`}
        />
        <button
          type="button"
          onClick={add}
          disabled={!parsed}
          aria-label={placeholder}
          className="w-7 h-7 border border-[#00b4d8] text-[#00b4d8] text-sm disabled:opacity-30 hover:bg-[#00b4d8] hover:text-black"
        >+</button>
      </div>
      {parsed && (
        <div className="pl-10 pt-0.5 text-[10px] font-mono text-[#00ff88]">
          ▸ {fmtLatLng(parsed)} · MGRS {toMGRS(parsed, 5)}
        </div>
      )}
    </div>
  );
}
