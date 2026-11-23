'use client';

import { useRef, useState } from 'react';
import { DroneProfile, DronePerformance } from '@/types';
import { DRONE_PROFILES, EXAMPLE_SPEC_DRONE } from '@/lib/droneProfiles';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomDroneInput } from '@/lib/userData';
import { Btn, inputClass } from './ui';

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
/** In specs mode these base fields come from the specs (wind) or are derived (range/endurance). */
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

// ---- building blocks (module-level so inputs keep focus across renders) ----

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pt-5 first:pt-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-mono font-bold bg-[#00b4d8] text-[#0a0f1a]">{n}</span>
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#00b4d8]">{title}</h3>
      </div>
      {hint && <p className="text-[11px] font-mono text-[#4a6080] mb-3 ml-7">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1e2d45] bg-[#0d1424] p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#c8d0e0] mb-2">{title}</div>
      <div className="space-y-3">{children}</div>
      {hint && <div className="text-[10px] font-mono text-[#4a6080] mt-2">{hint}</div>}
    </div>
  );
}

/** Label above, input(s) in the middle, error (red) or hint (muted) below. */
function FieldBox({ label, optional, hint, error, children }: {
  label: string; optional?: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-mono text-[#c8d0e0] mb-1">
        {label}
        {optional && <span className="text-[#4a6080]"> · {optional}</span>}
      </div>
      {children}
      {error
        ? <div className="text-[10px] font-mono text-[#ff3344] mt-1">{error}</div>
        : hint && <div className="text-[10px] font-mono text-[#4a6080] mt-1">{hint}</div>}
    </div>
  );
}

/** Numeric input with the unit shown inside the box. */
function NumInput({ field, value, onChange, unit, invalid, ariaLabel, placeholder }: {
  field: string; value: string; onChange: (v: string) => void; unit?: string;
  invalid: boolean; ariaLabel: string; placeholder?: string;
}) {
  return (
    <div className={`flex items-stretch flex-1 min-w-0 border bg-[#0a0f1a] ${invalid ? 'border-[#ff3344]' : 'border-[#1e2d45] focus-within:border-[#00b4d8]'}`}>
      <input
        data-field={field}
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm font-mono text-[#c8d0e0] outline-none placeholder:text-[#2d4060]"
      />
      {unit && (
        <span className="flex items-center px-2 text-[11px] font-mono text-[#4a6080] border-l border-[#1e2d45] bg-[#0d1424] whitespace-nowrap">
          {unit}
        </span>
      )}
    </div>
  );
}

function ToggleTile({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`text-left border p-3 flex gap-3 items-start transition-colors ${checked ? 'border-[#00b4d8] bg-[#00b4d8]/10' : 'border-[#1e2d45] hover:border-[#4a6080]'}`}
    >
      <span className={`mt-0.5 w-4 h-4 shrink-0 border flex items-center justify-center text-[11px] ${checked ? 'border-[#00b4d8] bg-[#00b4d8] text-[#0a0f1a]' : 'border-[#4a6080]'}`}>
        {checked ? '✓' : ''}
      </span>
      <span>
        <span className="block text-xs font-mono text-[#c8d0e0]">{label}</span>
        <span className="block text-[10px] font-mono text-[#4a6080] mt-0.5">{hint}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------

const EXAMPLE_ID = '__example_specs';
type Template = Omit<DroneProfile, 'id'> & { id: string };
const TEMPLATES: Template[] = [...DRONE_PROFILES, { ...EXAMPLE_SPEC_DRONE, id: EXAMPLE_ID }];

interface Props {
  /** Existing custom drone to edit; omit to create a new one. */
  initial?: DroneProfile;
  onSubmit: (d: CustomDroneInput) => Promise<void>;
  onCancel: () => void;
}

export default function DroneForm({ initial, onSubmit, onCancel }: Props) {
  const { lang, tr } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  // New drone: first pick a template (step 'pick'), then fill the form.
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(() => (initial ? toForm(initial) : null));
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const u = lang === 'uk'
    ? { kmh: 'км/год', km: 'км', kg: 'кг', min: 'хв', m: 'м', ms: 'м/с', mmh: 'мм/год', cmh: 'см/год', c: '°C' }
    : { kmh: 'km/h', km: 'km', kg: 'kg', min: 'min', m: 'm', ms: 'm/s', mmh: 'mm/h', cmh: 'cm/h', c: '°C' };

  const tplName = (t: Template) => (t.id === EXAMPLE_ID ? tr.exampleTemplate : lang === 'uk' ? (t.nameUk ?? t.name) : t.name);
  const typeLabel = (t: DroneProfile['type']) => (t === 'fpv' ? tr.typeFpv : t === 'multirotor' ? tr.typeMultirotor : tr.typeFixedWing);

  const pickTemplate = (t: Template) => {
    setTemplateId(t.id);
    setForm(f => ({ ...toForm(t), name: f?.name ?? '' }));
    setErrors(new Map());
  };

  // ---- step 1: template picker (new drones only) ----
  if (!form) {
    return (
      <div className="border border-[#00b4d8]/60 bg-[#0a0f1a] p-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="text-xs font-mono text-[#00b4d8]">{tr.newDrone}</div>
          <Btn onClick={onCancel}>{tr.cancel}</Btn>
        </div>
        <h3 className="text-sm font-mono text-[#c8d0e0] mb-1">{tr.dfPickTitle}</h3>
        <p className="text-[11px] font-mono text-[#4a6080] mb-4">{tr.dfPickHint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTemplate(t)}
              className="text-left border border-[#1e2d45] hover:border-[#00b4d8] hover:bg-[#00b4d8]/5 p-3 flex gap-3 items-start transition-colors"
            >
              <span className="text-2xl leading-none">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-xs font-mono text-[#c8d0e0]">{tplName(t)}</span>
                <span className="block text-[10px] font-mono text-[#4a6080] mt-0.5">
                  {typeLabel(t.type)}
                  {t.performance && <span className="ml-1.5 px-1 border border-[#00b4d8]/60 text-[#00b4d8]">{tr.specsTitle}</span>}
                </span>
                <span className="block text-[10px] font-mono text-[#4a6080] mt-1">
                  ≤{t.limits.maxWindSpeed} {u.ms} · {t.nominalRange} {u.km} · {t.nominalEndurance} {u.min}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- step 2: the form ----
  const labels: Record<NumKey, string> = {
    maxWindSpeed: tr.maxWind,
    maxWindGusts: tr.maxGusts,
    minTemperature: tr.minTemp,
    maxTemperature: tr.maxTemp,
    maxPrecipitation: tr.maxPrecip,
    maxSnowfall: tr.maxSnow,
    minVisibility: tr.minVisibility,
    nominalRange: tr.nominalRange,
    nominalEndurance: tr.nominalEndurance,
    maxPayloadKg: tr.specMaxPayload,
    emptyWeightKg: tr.specEmptyWeight,
    maxRangeKm: tr.specRange,
    radiusEmptyKm: `${tr.specRadius} ${tr.specRadiusEmpty}`,
    radiusFullKm: `${tr.specRadius} ${tr.specRadiusFull}`,
    endEmptyMin: `${tr.specEndurance} ${tr.specEnduranceEmpty} (${tr.fromLabel})`,
    endEmptyMax: `${tr.specEndurance} ${tr.specEnduranceEmpty} (${tr.toLabel})`,
    endLoadedMin: `${tr.specEndurance} ${tr.specEnduranceLoaded} (${tr.fromLabel})`,
    endLoadedMax: `${tr.specEndurance} ${tr.specEnduranceLoaded} (${tr.toLabel})`,
    loadedPayloadKg: `${tr.specEndurance}: ${tr.specAtPayload}`,
    speedEmptyMin: `${tr.specSpeed} ${tr.specSpeedEmpty} (${tr.fromLabel})`,
    speedEmptyMax: `${tr.specSpeed} ${tr.specSpeedEmpty} (${tr.toLabel})`,
    speedFullKmh: `${tr.specSpeed} ${tr.specSpeedFull}`,
    ceilingMin: `${tr.specCeiling} (${tr.fromLabel})`,
    ceilingMax: `${tr.specCeiling} (${tr.toLabel})`,
    windEmptyMs: `${tr.specWind} ${tr.specRadiusEmpty}`,
    windFullMs: `${tr.specWind} ${tr.specRadiusFull}`,
  };
  const labelOf = (k: string) => (k === 'name' ? tr.nameLabel : (labels as Record<string, string>)[k] ?? k);

  const clearError = (k: string) =>
    setErrors(e => {
      if (!e.has(k)) return e;
      const next = new Map(e);
      next.delete(k);
      return next;
    });
  const setNum = (k: NumKey, v: string) => {
    setForm(f => f && { ...f, nums: { ...f.nums, [k]: v } });
    clearError(k);
  };
  const patch = (p: Partial<FormState>) => setForm(f => f && { ...f, ...p });

  const focusField = (k: string) => {
    const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${k}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus({ preventScroll: true });
  };

  const validate = (): CustomDroneInput | null => {
    const bad = new Map<string, string>();
    const n = {} as Record<NumKey, number>;
    const keys: NumKey[] = form.specs ? [...BASE_KEYS.filter(k => !BASE_IN_SPECS.includes(k)), ...PERF_KEYS] : BASE_KEYS;

    for (const k of keys) {
      let raw = form.nums[k].replace(',', '.').trim();
      if (raw === '' && OPTIONAL_PERF.includes(k as PerfKey)) { n[k] = NaN; continue; }
      const fallback = OPTIONAL_MAX[k as PerfKey];
      if (raw === '' && fallback) raw = form.nums[fallback].replace(',', '.').trim();
      const v = Number(raw);
      const [lo, hi] = BOUNDS[k];
      if (raw === '') bad.set(k, tr.dfRequired);
      else if (!Number.isFinite(v) || v < lo || v > hi) bad.set(k, tr.dfErrRange(lo, hi));
      n[k] = v;
    }
    /** Requires a ≤ b (or a < b when strict); marks both fields with a readable message. */
    const order = (a: NumKey, b: NumKey, strict = false) => {
      if (bad.has(a) || bad.has(b)) return;
      if (strict ? n[a] < n[b] : n[a] <= n[b]) return;
      bad.set(a, tr.dfErrNotAbove(labelOf(b)));
      bad.set(b, tr.dfErrNotBelow(labelOf(a)));
    };
    order('minTemperature', 'maxTemperature', true);
    if (form.specs) {
      order('endEmptyMin', 'endEmptyMax');
      order('endLoadedMin', 'endLoadedMax');
      order('endLoadedMin', 'endEmptyMin');
      order('loadedPayloadKg', 'maxPayloadKg');
      order('speedEmptyMin', 'speedEmptyMax');
      order('speedFullKmh', 'speedEmptyMax');
      order('radiusFullKm', 'radiusEmptyKm');
      order('ceilingMin', 'ceilingMax');
      order('windFullMs', 'windEmptyMs');
    } else {
      order('maxWindSpeed', 'maxWindGusts');
    }
    if (!form.name.trim()) bad.set('name', tr.dfRequired);
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
    if (!d) {
      // Jump to the first broken field (DOM order = visual order).
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus({ preventScroll: true });
      });
      return;
    }
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
  const num = (k: NumKey, unit?: string, placeholder?: string) => (
    <NumInput
      field={k}
      value={form.nums[k]}
      onChange={v => setNum(k, v)}
      unit={unit}
      invalid={errors.has(k)}
      ariaLabel={labelOf(k)}
      placeholder={placeholder}
    />
  );
  const single = (k: NumKey, label: string, unit: string, opts: { placeholder?: string; hint?: string; optional?: boolean } = {}) => (
    <FieldBox label={label} hint={opts.hint} error={errors.get(k)} optional={opts.optional ? tr.dfOptional : undefined}>
      {num(k, unit, opts.placeholder)}
    </FieldBox>
  );
  /** "from – to" pair; the error of either half is shown under the pair. */
  const range = (a: NumKey, b: NumKey, label: string, unit: string, ph: [string, string], hint?: string) => (
    <FieldBox label={label} hint={hint} error={errors.get(a) ?? errors.get(b)}>
      <div className="flex items-center gap-1.5">
        {num(a, undefined, `${tr.fromLabel} ${ph[0]}`)}
        <span className="text-[#4a6080]">–</span>
        {num(b, unit, `${tr.toLabel} ${ph[1]}`)}
      </div>
    </FieldBox>
  );

  const tpl = TEMPLATES.find(t => t.id === templateId);
  const errorKeys = [...errors.keys()];

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="border border-[#00b4d8]/60 bg-[#0a0f1a]">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#1e2d45]">
        <div className="text-xs font-mono text-[#00b4d8]">{initial ? tr.editDrone : tr.newDrone}</div>
        {tpl && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#4a6080]">
            <span>{tr.dfBasedOn}: <span className="text-[#c8d0e0]">{tpl.icon} {tplName(tpl)}</span></span>
            <button type="button" onClick={() => setForm(null)} className="text-[#00b4d8] underline underline-offset-2 hover:text-[#c8d0e0]">
              {tr.dfChangeTemplate}
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* 1 — basics */}
        <Section n={1} title={tr.dfSecBasics}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldBox label={tr.nameLabel} error={errors.get('name')}>
              <input
                data-field="name"
                value={form.name}
                onChange={e => { patch({ name: e.target.value }); clearError('name'); }}
                maxLength={40}
                aria-invalid={errors.has('name')}
                aria-label={tr.nameLabel}
                placeholder={tr.dfNamePlaceholder}
                className={`${inputClass} placeholder:text-[#2d4060]`}
                autoFocus
              />
            </FieldBox>
            <FieldBox label={tr.droneType}>
              <div className="grid grid-cols-3 border border-[#1e2d45]" role="radiogroup" aria-label={tr.droneType}>
                {(['fpv', 'multirotor', 'fixed_wing'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.type === t}
                    onClick={() => patch({ type: t })}
                    className={`py-1.5 text-xs font-mono border-r last:border-r-0 border-[#1e2d45] transition-colors ${form.type === t ? 'bg-[#00b4d8] text-[#0a0f1a]' : 'text-[#c8d0e0] hover:bg-[#141b2d]'}`}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </FieldBox>
          </div>
          <div className="mt-4">
            <FieldBox label={tr.icon}>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={tr.icon}>
                {ICONS.map(ic => (
                  <button
                    type="button"
                    key={ic}
                    role="radio"
                    aria-checked={form.icon === ic}
                    onClick={() => patch({ icon: ic })}
                    className={`w-10 h-10 border text-lg ${form.icon === ic ? 'border-[#00b4d8] bg-[#00b4d8]/15' : 'border-[#1e2d45] hover:border-[#4a6080]'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </FieldBox>
          </div>
        </Section>

        {/* 2 — performance */}
        <Section n={2} title={tr.dfSecPerformance} hint={tr.dfPerfHint}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label={tr.dfSecPerformance}>
            {([false, true] as const).map(isSpecs => {
              const active = form.specs === isSpecs;
              return (
                <button
                  key={String(isSpecs)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { patch({ specs: isSpecs }); setErrors(new Map()); }}
                  className={`text-left border p-3 flex gap-3 items-start transition-colors ${active ? 'border-[#00b4d8] bg-[#00b4d8]/10' : 'border-[#1e2d45] hover:border-[#4a6080]'}`}
                >
                  <span className={`mt-0.5 w-3.5 h-3.5 shrink-0 border-2 ${active ? 'border-[#00b4d8] bg-[#00b4d8]' : 'border-[#4a6080]'}`} />
                  <span>
                    <span className="block text-xs font-mono text-[#c8d0e0]">{isSpecs ? tr.dfModeSpecs : tr.dfModeQuick}</span>
                    <span className="block text-[10px] font-mono text-[#4a6080] mt-0.5">{isSpecs ? tr.dfModeSpecsHint : tr.dfModeQuickHint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {!form.specs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {single('nominalRange', tr.specRange, u.km, { placeholder: '10' })}
              {single('nominalEndurance', tr.specEndurance, u.min, { placeholder: '30' })}
            </div>
          ) : (
            <>
              <p className="text-[11px] font-mono text-[#4a6080] mb-3">{tr.specsHint}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Group title={tr.dfGroupPayload}>
                  {single('maxPayloadKg', tr.specMaxPayload, u.kg, { placeholder: '15' })}
                  {single('emptyWeightKg', tr.specEmptyWeight, u.kg, { placeholder: '25', hint: tr.specEmptyWeightNote, optional: true })}
                </Group>
                <Group title={tr.dfGroupFlightTime} hint={tr.dfSingleValueHint}>
                  {range('endEmptyMin', 'endEmptyMax', tr.specEnduranceEmpty, u.min, ['37', '45'])}
                  {single('loadedPayloadKg', tr.specAtPayload, u.kg, { placeholder: '10' })}
                  {range('endLoadedMin', 'endLoadedMax', tr.specEnduranceLoaded, u.min, ['23', '27'])}
                </Group>
                <Group title={tr.dfGroupSpeed} hint={tr.dfSingleValueHint}>
                  {range('speedEmptyMin', 'speedEmptyMax', tr.specSpeedEmpty, u.kmh, ['80', '100'])}
                  {single('speedFullKmh', tr.specSpeedFull, u.kmh, { placeholder: '40' })}
                </Group>
                <Group title={tr.dfGroupRadius}>
                  <div className="grid grid-cols-2 gap-3">
                    {single('radiusEmptyKm', `${tr.specRadius}, ${tr.specRadiusEmpty}`, u.km, { placeholder: '15' })}
                    {single('radiusFullKm', `${tr.specRadius}, ${tr.specRadiusFull}`, u.km, { placeholder: '10' })}
                  </div>
                  {single('maxRangeKm', tr.specRange, u.km, { placeholder: '20' })}
                </Group>
                <Group title={tr.specCeiling} hint={tr.dfSingleValueHint}>
                  {range('ceilingMin', 'ceilingMax', tr.specCeiling, u.m, ['400', '500'])}
                </Group>
              </div>
              <p className="text-[10px] font-mono text-[#2d4060] mt-2">* {tr.specConservativeNote}</p>
            </>
          )}
        </Section>

        {/* 3 — weather limits */}
        <Section n={3} title={tr.dfSecWeather} hint={tr.dfWeatherHint}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Group title={tr.dfGroupWind} hint={form.specs ? tr.specWindNote : undefined}>
              {form.specs ? (
                <>
                  {single('windEmptyMs', tr.specRadiusEmpty, u.ms, { placeholder: '17' })}
                  {single('windFullMs', tr.specRadiusFull, u.ms, { placeholder: '12' })}
                </>
              ) : (
                <>
                  {single('maxWindSpeed', tr.specWindSustained, u.ms)}
                  {single('maxWindGusts', tr.specWindGusts, u.ms)}
                </>
              )}
            </Group>
            <Group title={tr.dfGroupTemp}>
              {single('minTemperature', tr.minTemp.replace(/\s*\(°C\)/, ''), u.c)}
              {single('maxTemperature', tr.maxTemp.replace(/\s*\(°C\)/, ''), u.c)}
            </Group>
            <Group title={tr.dfGroupPrecip}>
              {single('maxPrecipitation', tr.maxPrecip, u.mmh)}
              {single('maxSnowfall', tr.maxSnow, u.cmh)}
              {single('minVisibility', tr.minVisibility, u.m)}
            </Group>
          </div>
        </Section>

        {/* 4 — equipment */}
        <Section n={4} title={tr.dfSecEquipment}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ToggleTile checked={form.hasThermalCamera} onChange={v => patch({ hasThermalCamera: v })} label={tr.hasThermal} hint={tr.dfThermalHint} />
            <ToggleTile checked={form.icingRisk} onChange={v => patch({ icingRisk: v })} label={tr.icingSusceptible} hint={tr.dfIcingHint} />
            <ToggleTile checked={form.hasIpProtection} onChange={v => patch({ hasIpProtection: v })} label={tr.ipProtected} hint={tr.dfIpHint} />
          </div>
          <div className="mt-4">
            <FieldBox label={tr.notesLabel} optional={tr.dfOptional} hint={`${form.notes.length}/300`}>
              <textarea
                value={form.notes}
                onChange={e => patch({ notes: e.target.value })}
                maxLength={300}
                rows={2}
                aria-label={tr.notesLabel}
                className={inputClass}
              />
            </FieldBox>
          </div>
        </Section>
      </div>

      {/* footer: stays visible while scrolling a long form */}
      <div className="sticky bottom-0 z-10 bg-[#0a0f1a] border-t border-[#1e2d45] px-4 py-3 space-y-2">
        {errorKeys.length > 0 && (
          <div className="text-xs font-mono text-[#ff3344]" role="alert">
            {tr.dfErrSummary(errorKeys.length)}:{' '}
            {errorKeys.map((k, i) => (
              <span key={k}>
                {i > 0 && ', '}
                <button type="button" onClick={() => focusField(k)} className="underline underline-offset-2 hover:text-[#c8d0e0]">
                  {labelOf(k)}
                </button>
              </span>
            ))}
          </div>
        )}
        {failed && <div className="text-xs font-mono text-[#ff3344]" role="alert">{tr.saveFailed}</div>}
        <div className="flex gap-2">
          <Btn type="submit" variant="primary" disabled={busy} className="!px-4 !py-2 !text-xs">
            {busy ? tr.saving : initial ? tr.dfSaveChanges : tr.dfCreate}
          </Btn>
          <Btn onClick={onCancel} disabled={busy} className="!px-4 !py-2 !text-xs">{tr.cancel}</Btn>
        </div>
      </div>
    </form>
  );
}
