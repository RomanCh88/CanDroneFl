'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface BestWindowsProps {
  windows: { start: string; end: string; durationHours: number }[];
  droneName: string;
}

export default function BestWindows({ windows, droneName }: BestWindowsProps) {
  const { lang, tr } = useLanguage();
  const locale = lang === 'uk' ? 'uk-UA' : 'en-GB';

  function fmt(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="text-[#4a6080] text-xs font-mono mb-3">
        {tr.optimalWindows(droneName.toUpperCase())}
      </div>
      {windows.length === 0 ? (
        <div className="text-[#ff3344] font-mono text-sm">
          {tr.noWindows}
        </div>
      ) : (
        <div className="space-y-2">
          {windows.map((w, i) => (
            <div key={i} className="flex items-center gap-4 border border-[#00ff88]/30 bg-[#00ff88]/5 px-4 py-2">
              <div className="text-[#00ff88] font-mono font-bold text-sm w-6">{i + 1}</div>
              <div className="font-mono text-[#c8d0e0] text-sm">
                {fmt(w.start)}
              </div>
              <div className="text-[#4a6080] font-mono text-sm">→</div>
              <div className="font-mono text-[#c8d0e0] text-sm">
                {fmt(w.end)}
              </div>
              <div className="ml-auto font-mono text-[#00ff88] font-bold text-sm">
                {tr.goWindow(w.durationHours)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
