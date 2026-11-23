'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DRONE_PROFILES } from '@/lib/droneProfiles';

// Small presentational building blocks for the docs (flat HUD style: no gradients/shadows/radius).

export function H3({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h3 id={id} className="scroll-mt-24 mt-8 mb-3 text-[15px] font-semibold text-[#e6ebf5] tracking-wide">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="my-3 text-[14px] leading-relaxed text-[#b3bfd4]">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="my-3 space-y-1.5 text-[14px] leading-relaxed text-[#b3bfd4]">{children}</ul>;
}
export function LI({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span className="text-[#00b4d8] shrink-0">▸</span><span>{children}</span></li>;
}

export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="my-4 space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 flex items-center justify-center text-[11px] font-mono font-bold border border-[#00b4d8] text-[#00b4d8]">{i + 1}</span>
          <span className="text-[14px] leading-relaxed text-[#b3bfd4] pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

export function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-[#e6ebf5] font-semibold">{children}</strong>;
}
export function C({ children }: { children: React.ReactNode }) {
  return <code className="px-1 py-0.5 bg-[#141b2d] border border-[#1e2d45] font-mono text-[12.5px] text-[#c8d0e0] whitespace-nowrap">{children}</code>;
}
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 border border-[#4a6080] border-b-2 font-mono text-[12px] text-[#c8d0e0]">{children}</kbd>;
}

const STATUS_COLOR = { GO: '#00ff88', CAUTION: '#ffaa00', NO_GO: '#ff3344' } as const;
export function Status({ s }: { s: keyof typeof STATUS_COLOR }) {
  const { tr } = useLanguage();
  const c = STATUS_COLOR[s];
  return (
    <span className="inline-block px-1.5 font-mono text-[12px] font-bold border whitespace-nowrap" style={{ color: c, borderColor: c }}>
      {s === 'GO' ? tr.statusGo : s === 'CAUTION' ? tr.statusCaution : tr.statusNoGo}
    </span>
  );
}

export function Callout({ kind = 'info', title, children }: { kind?: 'info' | 'warn' | 'tip'; title?: string; children: React.ReactNode }) {
  const color = kind === 'warn' ? '#ffaa00' : kind === 'tip' ? '#00ff88' : '#00b4d8';
  const icon = kind === 'warn' ? '⚠' : kind === 'tip' ? '✓' : 'ℹ';
  return (
    <div className="my-4 border-l-2 bg-[#0d1424] px-4 py-3" style={{ borderColor: color }}>
      {title && <div className="text-[12px] font-mono uppercase tracking-wider mb-1" style={{ color }}>{icon} {title}</div>}
      <div className="text-[13.5px] leading-relaxed text-[#b3bfd4]">{children}</div>
    </div>
  );
}

/** Formula block: monospace, one formula per line, optional explanation under each. */
export function Formula({ lines }: { lines: [string, React.ReactNode?][] }) {
  return (
    <div className="my-4 border border-[#1e2d45] bg-[#080d17] px-4 py-3 space-y-2 overflow-x-auto">
      {lines.map(([f, note], i) => (
        <div key={i}>
          <div className="font-mono text-[13px] text-[#00b4d8] whitespace-pre">{f}</div>
          {note && <div className="text-[12px] text-[#6b7d99] mt-0.5">{note}</div>}
        </div>
      ))}
    </div>
  );
}

export function Table({ head, rows, dense }: { head: React.ReactNode[]; rows: React.ReactNode[][]; dense?: boolean }) {
  return (
    <div className="my-4 overflow-x-auto border border-[#1e2d45]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#0d1424]">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 text-[10.5px] font-mono uppercase tracking-wider text-[#4a6080] font-normal border-b border-[#1e2d45] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#1e2d45] last:border-b-0 align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3 ${dense ? 'py-1.5' : 'py-2'} text-[13px] leading-snug ${j === 0 ? 'text-[#e6ebf5]' : 'text-[#b3bfd4]'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MembersBadge() {
  const { tr } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[#ffaa00]/70 text-[#ffaa00] text-[10px] font-mono tracking-wider align-middle">
      ◈ {tr.docsMembersBadge}
    </span>
  );
}

/** Call to action that adapts to the reader: anonymous → sign in, signed-in non-member → request, member → open. */
export function MembersCTA({ compact }: { compact?: boolean }) {
  const { tr } = useLanguage();
  const { enabled, user, member, signInWithGoogle } = useAuth();
  if (!enabled) return null;
  if (user && member) {
    return (
      <div className="my-5 border border-[#00ff88]/40 bg-[#00ff88]/5 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-[#00ff88] font-mono">✓ {tr.docsCtaMember}</span>
        <Link href="/mission" className="ml-auto border border-[#00b4d8] text-[#00b4d8] px-3 py-1.5 text-[11px] font-mono tracking-wider hover:bg-[#00b4d8] hover:text-black">◎ {tr.mission}</Link>
      </div>
    );
  }
  return (
    <div className={`my-6 border border-[#ffaa00]/50 bg-[#ffaa00]/5 ${compact ? 'px-4 py-3' : 'p-5'}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="text-[#ffaa00] text-[11px] font-mono tracking-wider mb-1">◈ {tr.docsCtaTitle}</div>
          <div className="text-[13.5px] text-[#b3bfd4] leading-relaxed">{tr.docsCtaText}</div>
        </div>
        {!user ? (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="border border-[#00b4d8] text-[#00b4d8] px-4 py-2 text-xs font-mono tracking-wider hover:bg-[#00b4d8] hover:text-black transition-colors"
          >
            G&nbsp;&nbsp;{tr.docsCtaSignIn}
          </button>
        ) : (
          <Link href="/profile" className="border border-[#ffaa00] text-[#ffaa00] px-4 py-2 text-xs font-mono tracking-wider hover:bg-[#ffaa00] hover:text-black transition-colors">
            {tr.docsCtaRequest} →
          </Link>
        )}
      </div>
    </div>
  );
}

/** Built-in drone profiles, generated from the code so the docs never drift. */
export function ProfilesTable() {
  const { lang } = useLanguage();
  const uk = lang === 'uk';
  return (
    <Table
      dense
      head={uk
        ? ['Профіль', 'Вітер / пориви', 'Темп.', 'Опади / сніг', 'Мін. видим.', 'Дальн. / час', 'Тепловізор', 'Обмерзання']
        : ['Profile', 'Wind / gusts', 'Temp', 'Precip / snow', 'Min vis.', 'Range / time', 'Thermal', 'Icing-prone']}
      rows={DRONE_PROFILES.map(p => [
        <span key="n" className="whitespace-nowrap">{p.icon} {uk ? (p.nameUk ?? p.name) : p.name}</span>,
        `${p.limits.maxWindSpeed} / ${p.limits.maxWindGusts} m/s`,
        `${p.limits.minTemperature}…${p.limits.maxTemperature} °C`,
        `${p.limits.maxPrecipitation} mm/h / ${p.limits.maxSnowfall} cm/h`,
        `${p.limits.minVisibility} m`,
        `${p.nominalRange} km / ${p.nominalEndurance} min`,
        p.hasThermalCamera ? '✓' : '—',
        p.limits.icingRisk ? '✓' : '—',
      ])}
    />
  );
}
