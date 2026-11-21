'use client';

import { useState } from 'react';
import { DroneProfile, DronePerformance } from '@/types';
import { DRONE_PROFILES, EXAMPLE_SPEC_DRONE } from '@/lib/droneProfiles';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomDroneInput } from '@/lib/userData';
import { Btn, Field, inputClass } from './ui';

const ICONS = ['🚀', '🔭', '🛸', '✈️', '🛩️', '🚁', '🎯', '📡', '🦅', '⚡'];

// ---- numeric fields -------------------------------------------------------
// Bounds are mirrored in firestore.rules — keep both in sync.

type BaseKey =
  | 'maxWindSpeed' | 'maxWindGusts' | 'minTemperature' | 'maxTemperature'
  | 'maxPrecipitation' | 'maxSnowfall' | 'minVisibility' | 'nominalRange' | 'nominalEndurance';

type PerfKey =
  | 'maxPayloadKg' | 'maxRangeKm' | 'radiusEmptyKm' | 'radiusFullKm'
  | 'endEmptyMin' | 'endEmptyMax' | 'endLoadedMin' | 'endLoadedMax' | 'loadedPayloadKg'
  | 'speedEmptyMin' | 'speedEmptyMax' | 'speedFullKmh' | 'ceilingMin' | 'ceilingMax'
  | 'emptyWeightKg' | 'windEmptyMs' | 'windFullMs';

type NumKey = BaseKey | PerfKey;

const BOUNDS: Record<NumKey, [number, number]> = {
  maxWindSpeed: [0, 60],
  maxWindGusts: [0, 80],
  minTemperature: [-60, 60],
  maxTemperature: [-40, 70],
  maxPrecipitation: [0, 50],
  maxSnowfall: [0, 20],
  minVisibility: [0, 50000],
  nominalRange: [0.1, 2000],
  nominalEndurance: [1, 3000],
  maxPayloadKg: [0.1, 500],
  maxRangeKm: [0.1, 2000],
  radiusEmptyKm: [0.1, 2000],
  radiusFullKm: [0.1, 2000],
  endEmptyMin: [1, 3000],
  endEmptyMax: [1, 3000],
  endLoadedMin: [1, 3000],
  endLoadedMax: [1, 3000],
  loadedPayloadKg: [0.1, 500],
  speedEmptyMin: [1, 500],
  speedEmptyMax: [1, 500],
  speedFullKmh: [1, 500],
  ceilingMin: [1, 10000],
  ceilingMax: [1, 10000],
  emptyWeightKg: [0.05, 1000],
  windEmptyMs: [0, 60],
  windFullMs: [0, 60],
};

/** Spec fields that may be left empty entirely. */
const OPTIONAL_PERF: PerfKey[] = ['emptyWeightKg'];

/** "to" fields that may be left empty (then = "from"). */
const OPTIONAL_MAX: Partial<Record<PerfKey, PerfKey>> = {
  endEmptyMax: 'endEmptyMin',
  endLoadedMax: 'endLoadedMin',
  speedEmptyMax: 'speedEmptyMin',
  ceilingMax: 'ceilingMin',
};

const BASE_KEYS: BaseKey[] = ['maxWindSpeed', 'maxWindGusts', 'minTemperature', 'maxTemperature',
  'maxPrecipitation', 'maxSnowfall', 'minVisibility', 'nominalRange', 'nominalEndurance'];
const PERF_KEYS = Object.keys(BOUNDS).filter(k => !(BASE_KEYS as string[]).includes(k)) as PerfKey[];
/** In specs mode these base fields live in the specs table (wind) or are derived (range/endurance). */
const BASE_IN_SPECS: BaseKey[] = ['maxWindSpeed', 'maxWindGusts', 'nominalRange', 'nominalEndurance'];

interface FormState {
  name: string;
  icon: string;
  type: DroneProfile['type'];
  nums: Record<NumKey, string>;
  specs: boolean;
  hasThermalCamera: boolean;
  hasIpProtection: boolean;
  icingRisk: boolean;
  notes: string;
}

const str = (v: number | undefined) => (v === undefined ? '' : String(v));

function toForm(d: Omit<DroneProfile, 'id'>, nameOverride?: string): FormState {
  const p = d.performance;
  return {
    name: nameOverride ?? d.name,
    icon: d.icon,
    type: d.type,
    nums: {
      maxWindSpeed: str(d.limits.maxWindSpeed),
      maxWindGusts: str(d.limits.maxWindGusts),
      minTemperature: str(d.limits.minTemperature),
      maxTemperature: str(d.limits.maxTemperature),
      maxPrecipitation: str(d.limits.maxPrecipitation),
      maxSnowfall: str(d.limits.maxSnowfall),
      minVisibility: str(d.limits.minVisibility),
      nominalRange: str(d.nominalRange),
      nominalEndurance: str(d.nominalEndurance),
      maxPayloadKg: str(p?.maxPayloadKg),
      maxRangeKm: str(p?.maxRangeKm ?? d.nominalRange),
      radiusEmptyKm: str(p?.radiusEmptyKm),
      radiusFullKm: str(p?.radiusFullKm),
      endEmptyMin: str(p?.enduranceEmptyMin.min ?? d.nominalEndurance),
      endEmptyMax: str(p?.enduranceEmptyMin.max),
      endLoadedMin: str(p?.enduranceLoadedMin.min),
      endLoadedMax: str(p?.enduranceLoadedMin.max),
      loadedPayloadKg: str(p?.loadedPayloadKg),
      speedEmptyMin: str(p?.speedEmptyKmh.min),
      speedEmptyMax: str(p?.speedEmptyKmh.max),
      speedFullKmh: str(p?.speedFullKmh),
      ceilingMin: str(p?.ceilingM.min),
      ceilingMax: str(p?.ceilingM.max),
      emptyWeightKg: str(p?.emptyWeightKg),
      // Older records stored the spec "12–17" as sustained/gusts; its meaning is 17 empty → 12 full.
      windEmptyMs: str(p?.windEmptyMs ?? d.limits.maxWindGusts),
      windFullMs: str(p?.windFullMs ?? d.limits.maxWindSpeed),
    },
    specs: Boolean(p),
    hasThermalCamera: d.hasThermalCamera,
    hasIpProtection: d.hasIpProtection,
    icingRisk: d.limits.icingRisk,
    notes: d.notes ?? '',
  };
}

/** One row of the spec-sheet table (module-level so inputs keep focus across renders). */
function SpecRow({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_1.3fr] gap-x-3 gap-y-1 py-2 border-b border-[#1e2d45] last:border-b-0 items-center">
      <div className="text-xs font-mono text-[#c8d0e0]">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">{value}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#4a6080]">{note}</div>
    </div>
  );
}

const EXAMPLE_ID = '__example_specs';

interface Props {
  /** Existing custom drone to edit; omit to create a new one. */
  initial?: DroneProfile;
  onSubmit: (d: CustomDroneInput) => Promise<void>;
  onCancel: () => void;
}

export default function DroneForm({ initial, onSubmit, onCancel }: Props) {
  const { lang, tr } = useLanguage();
  const [form, setForm] = useState<FormState>(() => (initial ? toForm(initial) : toForm(EXAMPLE_SPEC_DRONE, '')));
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const baseLabels: Record<BaseKey, string> = {
    maxWindSpeed: `${tr.maxWind} (m/s)`,
    maxWindGusts: `${tr.maxGusts} (m/s)`,
    minTemperature: tr.minTemp,
    maxTemperature: tr.maxTemp,
    maxPrecipitation: `${tr.maxPrecip} (mm/h)`,
    maxSnowfall: `${tr.maxSnow} (cm/h)`,
    minVisibility: `${tr.minVisibility} (m)`,
    nominalRange: tr.nominalRange,
    nominalEndurance: tr.nominalEndurance,
  };
  const perfLabels: Record<PerfKey, string> = {
    maxPayloadKg: tr.specMaxPayload,
    maxRangeKm: tr.specRange,
    radiusEmptyKm: `${tr.specRadius} ${tr.specRadiusEmpty}`,
    radiusFullKm: `${tr.specRadius} ${tr.specRadiusFull}`,
    endEmptyMin: `${tr.specEndurance} ${tr.specEnduranceEmpty}`,
    endEmptyMax: `${tr.specEndurance} ${tr.specEnduranceEmpty}`,
    endLoadedMin: `${tr.specEndurance} ${tr.specEnduranceLoaded}`,
    endLoadedMax: `${tr.specEndurance} ${tr.specEnduranceLoaded}`,
    loadedPayloadKg: `${tr.specEndurance} — ${tr.specAtPayload}`,
    speedEmptyMin: `${tr.specSpeed} ${tr.specSpeedEmpty}`,
    speedEmptyMax: `${tr.specSpeed} ${tr.specSpeedEmpty}`,
    speedFullKmh: `${tr.specSpeed} ${tr.specSpeedFull}`,
    ceilingMin: tr.specCeiling,
    ceilingMax: tr.specCeiling,
    emptyWeightKg: tr.specEmptyWeight,
    windEmptyMs: `${tr.specWind} ${tr.specRadiusEmpty}`,
    windFullMs: `${tr.specWind} ${tr.specRadiusFull}`,
  };
  const labelOf = (k: string) =>
    k === 'name' ? tr.nameLabel : (baseLabels as Record<string, string>)[k] ?? (perfLabels as Record<string, string>)[k] ?? k;

  const setNum = (k: NumKey, v: string) => setForm(f => ({ ...f, nums: { ...f.nums, [k]: v } }));

  const applyTemplate = (id: string) => {
    const tpl = id === EXAMPLE_ID ? EXAMPLE_SPEC_DRONE : DRONE_PROFILES.find(p => p.id === id);
    if (tpl) setForm(f => ({ ...toForm(tpl), name: f.name }));
  };

  const validate = (): CustomDroneInput | null => {
    const bad = new Set<string>();
    const n = {} as Record<NumKey, number>;
    // Specs mode: wind limits and range/endurance come from the specs table.
    const keys: NumKey[] = form.specs ? [...BASE_KEYS.filter(k => !BASE_IN_SPECS.includes(k)), ...PERF_KEYS] : BASE_KEYS;

    for (const k of keys) {
      let raw = form.nums[k].replace(',', '.').trim();
      if (raw === '' && OPTIONAL_PERF.includes(k as PerfKey)) { n[k] = NaN; continue; }
      const fallback = OPTIONAL_MAX[k as PerfKey];
      if (raw === '' && fallback) raw = form.nums[fallback].replace(',', '.').trim();
      const v = Number(raw);
      const [lo, hi] = BOUNDS[k];
      if (raw === '' || !Number.isFinite(v) || v < lo || v > hi) bad.add(k);
      n[k] = v;
    }
    const rel = (ok: boolean, ...ks: NumKey[]) => {
      if (!ok && ks.every(k => !bad.has(k))) ks.forEach(k => bad.add(k));
    };
    rel(n.minTemperature < n.maxTemperature, 'minTemperature', 'maxTemperature');
    if (form.specs) {
      rel(n.endEmptyMin <= n.endEmptyMax, 'endEmptyMin', 'endEmptyMax');
      rel(n.endLoadedMin <= n.endLoadedMax, 'endLoadedMin', 'endLoadedMax');
      rel(n.endLoadedMin <= n.endEmptyMin, 'endLoadedMin', 'endEmptyMin');
      rel(n.loadedPayloadKg <= n.maxPayloadKg, 'loadedPayloadKg', 'maxPayloadKg');
      rel(n.speedEmptyMin <= n.speedEmptyMax, 'speedEmptyMin', 'speedEmptyMax');
      rel(n.speedFullKmh <= n.speedEmptyMax, 'speedFullKmh', 'speedEmptyMax');
      rel(n.radiusFullKm <= n.radiusEmptyKm, 'radiusFullKm', 'radiusEmptyKm');
      rel(n.ceilingMin <= n.ceilingMax, 'ceilingMin', 'ceilingMax');
      rel(n.windFullMs <= n.windEmptyMs, 'windFullMs', 'windEmptyMs');
    }
    if (!form.name.trim()) bad.add('name');
    setErrors(bad);
    if (bad.size > 0) return null;

    const performance: DronePerformance | undefined = form.specs
      ? {
          maxPayloadKg: n.maxPayloadKg,
          enduranceEmptyMin: { min: n.endEmptyMin, max: n.endEmptyMax },
          enduranceLoadedMin: { min: n.endLoadedMin, max: n.endLoadedMax },
          loadedPayloadKg: n.loadedPayloadKg,
          speedEmptyKmh: { min: n.speedEmptyMin, max: n.speedEmptyMax },
          speedFullKmh: n.speedFullKmh,
          radiusEmptyKm: n.radiusEmptyKm,
          radiusFullKm: n.radiusFullKm,
          maxRangeKm: n.maxRangeKm,
          ceilingM: { min: n.ceilingMin, max: n.ceilingMax },
          windEmptyMs: n.windEmptyMs,
          windFullMs: n.windFullMs,
          ...(Number.isFinite(n.emptyWeightKg) ? { emptyWeightKg: n.emptyWeightKg } : {}),
        }
      : undefined;

    return {
      name: form.name.trim(),
      icon: form.icon,
      type: form.type,
      description: '',
      limits: {
        // Specs mode: fixed limits = the empty-drone spec (payload-dependent limits are computed).
        maxWindSpeed: performance ? performance.windEmptyMs! : n.maxWindSpeed,
        maxWindGusts: performance ? Math.min(80, Math.round(performance.windEmptyMs! * 1.25 * 10) / 10) : n.maxWindGusts,
        minTemperature: n.minTemperature,
        maxTemperature: n.maxTemperature,
        maxPrecipitation: n.maxPrecipitation,
        maxSnowfall: n.maxSnowfall,
        minVisibility: n.minVisibility,
        maxCloudCover: 100,
        icingRisk: form.icingRisk,
      },
      // With specs, the simple model's numbers are derived (used only for the fallback/legacy display).
      nominalRange: performance ? performance.maxRangeKm : n.nominalRange,
      nominalEndurance: performance ? Math.round(performance.enduranceEmptyMin.min) : Math.round(n.nominalEndurance),
      hasThermalCamera: form.hasThermalCamera,
      hasIpProtection: form.hasIpProtection,
      notes: form.notes.trim(),
      ...(performance ? { performance } : {}),
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = validate();
    if (!d) return;
    setBusy(true);
    setFailed(false);
    try {
      await onSubmit(d);
    } catch (err) {
      console.error(err);
      setFailed(true);
      setBusy(false);
    }
  };

  // ---- small renderers ----
  const num = (k: NumKey, opts: { placeholder?: string; width?: string } = {}) => (
    <input
      inputMode="decimal"
      value={form.nums[k]}
      onChange={e => setNum(k, e.target.value)}
      aria-invalid={errors.has(k)}
      aria-label={labelOf(k)}
      placeholder={opts.placeholder}
      className={`${inputClass} ${opts.width ?? 'w-20'} !px-1.5 text-center`}
    />
  );
  const unit = (u: string) => <span className="text-[11px] font-mono text-[#4a6080]">{u}</span>;
  const dash = <span className="text-[#4a6080]">–</span>;
  const checkbox = (key: 'hasThermalCamera' | 'hasIpProtection' | 'icingRisk', label: string) => (
    <label className="flex items-center gap-2 text-xs font-mono text-[#c8d0e0] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
        className="accent-[#00b4d8] w-4 h-4"
      />
      {label}
    </label>
  );

  const kmh = lang === 'uk' ? 'км/год' : 'km/h';
  const km = lang === 'uk' ? 'км' : 'km';
  const kg = lang === 'uk' ? 'кг' : 'kg';
  const min = lang === 'uk' ? 'хв' : 'min';
  const m = lang === 'uk' ? 'м' : 'm';
  const ms = lang === 'uk' ? 'м/с' : 'm/s';

  const visibleBase = form.specs ? BASE_KEYS.filter(k => !BASE_IN_SPECS.includes(k)) : BASE_KEYS;

  return (
    <form onSubmit={submit} noValidate className="border border-[#00b4d8]/60 bg-[#0a0f1a] p-3 space-y-4">
      <div className="text-xs font-mono text-[#00b4d8]">{initial ? tr.editDrone : tr.newDrone}</div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
        <Field label={tr.nameLabel}>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={40}
            aria-invalid={errors.has('name')}
            className={inputClass}
            autoFocus
          />
        </Field>
        <Field label={tr.droneType}>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as DroneProfile['type'] }))}
            className={inputClass}
          >
            <option value="fpv">{tr.typeFpv}</option>
            <option value="multirotor">{tr.typeMultirotor}</option>
            <option value="fixed_wing">{tr.typeFixedWing}</option>
          </select>
        </Field>
        {!initial && (
          <Field label={tr.startFrom}>
            <select defaultValue={EXAMPLE_ID} onChange={e => applyTemplate(e.target.value)} className={inputClass}>
              <option value={EXAMPLE_ID}>⚖ {tr.exampleTemplate}</option>
              {DRONE_PROFILES.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {lang === 'uk' ? (p.nameUk ?? p.name) : p.name}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#4a6080] mb-1">{tr.icon}</span>
        <div className="flex flex-wrap gap-1">
          {ICONS.map(ic => (
            <button
              type="button"
              key={ic}
              onClick={() => setForm(f => ({ ...f, icon: ic }))}
              aria-pressed={form.icon === ic}
              className={`w-9 h-9 border text-lg ${form.icon === ic ? 'border-[#00b4d8] bg-[#00b4d8]/10' : 'border-[#1e2d45] hover:border-[#4a6080]'}`}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Detailed specs (spec-sheet layout) ---- */}
      <div className="border border-[#1e2d45]">
        <label className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2d45] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.specs}
            onChange={e => setForm(f => ({ ...f, specs: e.target.checked }))}
            className="accent-[#00b4d8] w-4 h-4"
          />
          <span className="text-xs font-mono text-[#00b4d8] uppercase tracking-wider">{tr.specsTitle}</span>
          <span className="text-xs font-mono text-[#c8d0e0]">— {tr.useDetailedSpecs}</span>
        </label>
        {form.specs && (
          <div className="px-3 pb-2">
            <div className="text-[11px] font-mono text-[#4a6080] py-2">{tr.specsHint}</div>
            <div className="hidden md:grid grid-cols-[180px_1fr_1.3fr] gap-x-3 pb-1 border-b border-[#1e2d45] text-[10px] font-mono uppercase tracking-wider text-[#2d4060]">
              <span>{tr.specParam}</span><span>{tr.specValue}</span><span>{tr.specNote}</span>
            </div>
            <SpecRow
              label={tr.specMaxPayload}
              value={<>{unit(tr.toLabel)} {num('maxPayloadKg', { placeholder: '15' })} {unit(kg)}</>}
            />
            <SpecRow
              label={tr.specEmptyWeight}
              value={<>{num('emptyWeightKg', { placeholder: '25' })} {unit(kg)}</>}
              note={<>{tr.specEmptyWeightNote}</>}
            />
            <SpecRow
              label={tr.specRange}
              value={<>{unit(tr.toLabel)} {num('maxRangeKm', { placeholder: '20' })} {unit(km)}</>}
              note={<>
                {tr.specRadius}: {num('radiusEmptyKm', { placeholder: '15', width: 'w-16' })} {unit(`${km} ${tr.specRadiusEmpty}`)},
                {num('radiusFullKm', { placeholder: '10', width: 'w-16' })} {unit(`${km} ${tr.specRadiusFull}`)}
              </>}
            />
            <SpecRow
              label={tr.specEndurance}
              value={<>{num('endEmptyMin', { placeholder: '37' })}{dash}{num('endEmptyMax', { placeholder: '45' })} {unit(`${min} (${tr.specEnduranceEmpty})`)}</>}
              note={<>
                {tr.specAtPayload} {num('loadedPayloadKg', { placeholder: '10', width: 'w-14' })} {unit(kg)} —
                {num('endLoadedMin', { placeholder: '23', width: 'w-14' })}{dash}{num('endLoadedMax', { placeholder: '27', width: 'w-14' })} {unit(min)}
              </>}
            />
            <SpecRow
              label={tr.specSpeed}
              value={<>{unit(tr.toLabel)} {num('speedEmptyMin', { placeholder: '80' })}{dash}{num('speedEmptyMax', { placeholder: '100' })} {unit(kmh)}</>}
              note={<>{tr.specSpeedFull}: {num('speedFullKmh', { placeholder: '40', width: 'w-16' })} {unit(kmh)}</>}
            />
            <SpecRow
              label={tr.specCeiling}
              value={<>{num('ceilingMin', { placeholder: '400' })}{dash}{num('ceilingMax', { placeholder: '500' })} {unit(m)}</>}
            />
            <SpecRow
              label={tr.specWind}
              value={<>{num('windEmptyMs', { placeholder: '17' })} {unit(tr.specRadiusEmpty)} {dash} {num('windFullMs', { placeholder: '12' })} {unit(`${ms} ${tr.specRadiusFull}`)}</>}
              note={<>{tr.specWindNote}</>}
            />
            <div className="text-[10px] font-mono text-[#2d4060] pt-2">* {tr.specConservativeNote}</div>
          </div>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#4a6080] mb-2">{tr.thresholds}</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleBase.map(k => (
            <Field key={k} label={baseLabels[k]} hint={`${BOUNDS[k][0]} … ${BOUNDS[k][1]}`}>
              <input
                inputMode="decimal"
                value={form.nums[k]}
                onChange={e => setNum(k, e.target.value)}
                aria-invalid={errors.has(k)}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {checkbox('hasThermalCamera', tr.hasThermal)}
        {checkbox('hasIpProtection', tr.ipProtected)}
        {checkbox('icingRisk', tr.icingSusceptible)}
      </div>

      <Field label={tr.notesLabel}>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          maxLength={300}
          rows={2}
          className={inputClass}
        />
      </Field>

      {errors.size > 0 && (
        <div className="text-xs font-mono text-[#ff3344]" role="alert">
          {tr.invalidField([...new Set([...errors].map(labelOf))].join(', '))}
        </div>
      )}
      {failed && <div className="text-xs font-mono text-[#ff3344]" role="alert">{tr.saveFailed}</div>}

      <div className="flex gap-2">
        <Btn type="submit" variant="primary" disabled={busy}>{busy ? tr.saving : tr.save}</Btn>
        <Btn onClick={onCancel} disabled={busy}>{tr.cancel}</Btn>
      </div>
    </form>
  );
}
