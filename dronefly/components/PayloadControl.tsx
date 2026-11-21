'use client';

import { useEffect, useState } from 'react';
import { DronePerformance } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  perf: DronePerformance;
  /** Payload in kg (the model's input). */
  value: number;
  onChange: (payloadKg: number) => void;
  compact?: boolean;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * Weight selector for drones with detailed specs.
 * With a known empty weight the user sets the exact TAKE-OFF WEIGHT (slider + number);
 * otherwise the payload directly. Internally everything is payload = total − empty.
 */
export default function PayloadControl({ perf, value, onChange, compact }: Props) {
  const { lang, tr } = useLanguage();
  const kg = lang === 'uk' ? 'кг' : 'kg';
  const hasTotal = perf.emptyWeightKg !== undefined;
  const offset = hasTotal ? perf.emptyWeightKg! : 0;
  const min = offset;
  const max = offset + perf.maxPayloadKg;
  const shown = Math.round((offset + value) * 10) / 10;
  const step = perf.maxPayloadKg <= 5 ? 0.1 : 0.5;

  // Exact-number input keeps its own text so typing "24." isn't fought by re-renders.
  const [text, setText] = useState(fmt(shown));
  // Sync the text box when the value changes from the slider/presets.
  useEffect(() => {

    setText(fmt(shown));
  }, [shown]);

  const commit = (raw: string) => {
    const v = Number(raw.replace(',', '.'));
    if (!Number.isFinite(v)) { setText(fmt(shown)); return; }
    const clamped = Math.min(max, Math.max(min, v));
    onChange(Math.round((clamped - offset) * 100) / 100);
    setText(fmt(clamped));
  };

  const presets = Array.from(new Set([0, perf.loadedPayloadKg, perf.maxPayloadKg]));

  return (
    <div className={`border border-[#00b4d8]/50 bg-[#0d1424] p-3 ${compact ? '' : 'mb-3'} flex flex-wrap items-center gap-x-4 gap-y-2`}>
      <div className="flex items-baseline gap-2">
        <span className="text-[#4a6080] text-xs font-mono whitespace-nowrap">⚖ {hasTotal ? tr.totalWeight : tr.payload}</span>
        <input
          inputMode="decimal"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }}
          aria-label={hasTotal ? tr.totalWeight : tr.payload}
          className="w-20 bg-[#0a0f1a] border border-[#1e2d45] px-1.5 py-0.5 text-xl font-bold font-mono text-[#00b4d8] tabular-nums text-right outline-none focus:border-[#00b4d8]"
        />
        <span className="text-xs font-mono text-[#4a6080] whitespace-nowrap">/ {fmt(max)} {kg}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={e => onChange(Math.round((Number(e.target.value) - offset) * 100) / 100)}
        aria-label={hasTotal ? tr.totalWeight : tr.payload}
        className="flex-1 min-w-[160px] accent-[#00b4d8] h-6 cursor-pointer"
      />

      <div className="flex gap-1">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            title={`${tr.payloadShort} ${fmt(p)} ${kg}`}
            className={`border px-2 py-1 text-[11px] font-mono transition-colors ${
              Math.abs(value - p) < 1e-6
                ? 'border-[#00b4d8] text-[#00b4d8] bg-[#00b4d8]/10'
                : 'border-[#1e2d45] text-[#4a6080] hover:border-[#c8d0e0] hover:text-[#c8d0e0]'
            }`}
          >
            {hasTotal ? `${fmt(offset + p)}` : fmt(p)} {kg}
          </button>
        ))}
      </div>

      <div className="w-full text-[10px] font-mono text-[#2d4060]">
        {hasTotal && <span className="text-[#4a6080]">{tr.payloadShort}: {fmt(value)} {kg} · </span>}
        {tr.payloadHint}
      </div>
    </div>
  );
}
