'use client';

import { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// "Say thanks" button + popup. The service stays free; donations go to the author's unit's
// fundraising jar, NOT to DroneFly — no feature, ad or paywall depends on them. Keep it that way:
// the Open-Meteo free API is for non-commercial use only.
export const THANKS_JAR_URL = 'https://send.monobank.ua/jar/88F924Sby1';

export default function ThanksButton() {
  const { tr } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs px-2 py-1 border border-[#ffd60a]/60 text-[#ffd60a] font-mono tracking-wider hover:bg-[#ffd60a] hover:text-black transition-colors"
      >
        ♥ {tr.thanksButton}
      </button>

      <dialog
        ref={ref}
        aria-labelledby="thanks-title"
        // Click on the backdrop (outside the panel) closes the dialog.
        onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        className="m-auto w-[min(92vw,440px)] p-0 bg-transparent text-left backdrop:bg-black/70"
      >
        <div className="border border-[#1e2d45] bg-[#0d1424] font-mono">
          {/* Ukrainian flag stripe */}
          <div className="flex h-1"><span className="flex-1 bg-[#0057b7]" /><span className="flex-1 bg-[#ffd700]" /></div>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id="thanks-title" className="text-[#e6ebf5] text-sm font-bold leading-snug">{tr.thanksTitle}</h2>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label={tr.close}
                className="text-[#4a6080] hover:text-[#c8d0e0] text-lg leading-none -mt-1"
              >
                ×
              </button>
            </div>
            <p className="text-[13px] text-[#b3bfd4] leading-relaxed" style={{ fontFamily: 'var(--font-exo2), sans-serif' }}>{tr.thanksFree}</p>
            <p className="text-[13px] text-[#b3bfd4] leading-relaxed" style={{ fontFamily: 'var(--font-exo2), sans-serif' }}>{tr.thanksUnit}</p>
            <a
              href={THANKS_JAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center border border-[#ffd60a] bg-[#ffd60a] text-black px-4 py-2.5 text-xs font-bold tracking-wider hover:bg-transparent hover:text-[#ffd60a] transition-colors"
            >
              {tr.thanksCta} ↗
            </a>
            <p className="text-[11px] text-[#6b7d99] leading-relaxed">{tr.thanksNote}</p>
            <p className="text-[10px] text-[#4a6080] leading-relaxed border-t border-[#1e2d45] pt-3">
              {tr.dataSource}{' '}
              <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="text-[#00b4d8] hover:underline">Open-Meteo.com</a>
              {' · '}{tr.mapSource}{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[#00b4d8] hover:underline">© OpenStreetMap contributors</a>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
