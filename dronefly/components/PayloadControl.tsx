'use client';

import { DronePerformance } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  perf: DronePerformance;
  value: number;
  onChange: (kg: number) => void;
}

/** Payload selector for drones with detailed specs. Everything on the dashboard follows it. */
export default function PayloadControl({ perf, value, onChange }: Props) {
  const { lang, tr } = useLanguage();
  const kg = lang === 'uk' ? 'кг' : 'kg';
  const step = perf.maxPayloadKg <= 5 ? 0.1 : 0.5;
  const presets = Array.from(new Set([0, perf.loadedPayloadKg, perf.maxPayloadKg]));
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div className="border border-[#00b4d8]/50 bg-[#0d1424] p-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-baseline gap-2 min-w-[150px]">
        <span className="text-[#4a6080] text-xs font-mono">⚖ {tr.payload}</span>
        <span className="text-2xl font-bold font-mono text-[#00b4d8] tabular-nums">{fmt(value)}</span>
        <span className="text-xs font-mono text-[#4a6080]">/ {fmt(perf.maxPayloadKg)} {kg}</span>
      </div>

      <input
        type="range"
        min={0}
        max={perf.maxPayloadKg}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={tr.payload}
        className="flex-1 min-w-[180px] accent-[#00b4d8] h-6 cursor-pointer"
      />

      <div className="flex gap-1">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`border px-2 py-1 text-[11px] font-mono transition-colors ${
              Math.abs(value - p) < 1e-6
                ? 'border-[#00b4d8] text-[#00b4d8] bg-[#00b4d8]/10'
                : 'border-[#1e2d45] text-[#4a6080] hover:border-[#c8d0e0] hover:text-[#c8d0e0]'
            }`}
          >
            {fmt(p)} {kg}
          </button>
        ))}
      </div>

      <div className="w-full text-[10px] font-mono text-[#2d4060]">{tr.payloadHint}</div>
    </div>
  );
}
