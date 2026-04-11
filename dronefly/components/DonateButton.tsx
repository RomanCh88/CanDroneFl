'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function DonateButton({ compact = false }: { compact?: boolean }) {
  const { tr } = useLanguage();

  if (compact) {
    return (
      <a
        href="https://nowpayments.io/donation"
        target="_blank"
        rel="noopener noreferrer"
        className="border border-[#00b4d8] text-[#00b4d8] px-3 py-1 text-xs font-mono hover:bg-[#00b4d8] hover:text-black transition-colors"
      >
        {tr.supportCompact}
      </a>
    );
  }

  return (
    <div className="border border-[#1e2d45] p-4 space-y-3">
      <div className="text-[#c8d0e0] font-mono text-sm font-bold">{tr.supportTitle}</div>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://nowpayments.io/donation"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[#00b4d8] text-[#00b4d8] px-4 py-2 text-sm font-mono hover:bg-[#00b4d8] hover:text-black transition-colors"
        >
          {tr.crypto}
        </a>
        <a
          href="https://www.paypal.me"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[#4a6080] text-[#c8d0e0] px-4 py-2 text-sm font-mono hover:border-[#c8d0e0] transition-colors"
        >
          {tr.paypal}
        </a>
        <a
          href="https://send.monobank.ua"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[#4a6080] text-[#c8d0e0] px-4 py-2 text-sm font-mono hover:border-[#c8d0e0] transition-colors"
        >
          {tr.monobank}
        </a>
      </div>
      <div className="text-[#4a6080] text-xs font-mono">
        {tr.donateNote}
      </div>
    </div>
  );
}
