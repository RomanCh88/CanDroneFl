'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import shots from './shots.json';

// Annotated screenshot: numbered markers with arrows pointing at real UI elements.
// Screenshots and element boxes are produced by a capture script (see CLAUDE.md → Docs), so the
// boxes match the image exactly; they are stored per language because text lengths differ.

type Box = [number, number, number, number];
type ShotSet = Record<string, { w: number; h: number; boxes: Record<string, Box> }>;
const SHOTS = shots as unknown as Record<string, ShotSet>;

export type Side = 't' | 'b' | 'l' | 'r' | 'in';
export interface FigureItem {
  /** Key of the captured element box. */
  k: string;
  label: string;
  text?: React.ReactNode;
  /** Where the marker sits relative to the box; default = automatic. */
  side?: Side;
}

const GAP = 34; // marker distance from the box (image px)
const R = 13; // marker half-size (image px, for arrow start)

function placeMarker([x, y, w, h]: Box, W: number, H: number, side?: Side): { mx: number; my: number; tx: number; ty: number; side: Side } {
  const cx = x + w / 2, cy = y + h / 2;
  const big = w * h > W * H * 0.12 || (w > W * 0.5 && h > H * 0.35);
  let s: Side = side ?? (big ? 'in' : y > GAP + R + 4 ? 't' : y + h + GAP + R + 4 < H ? 'b' : x > GAP + R + 4 ? 'l' : 'r');
  if (s === 't' && y < GAP + R) s = 'b';
  if (s === 'b' && y + h + GAP + R > H) s = 'in';
  const clampX = (v: number) => Math.min(W - R - 2, Math.max(R + 2, v));
  const clampY = (v: number) => Math.min(H - R - 2, Math.max(R + 2, v));
  switch (s) {
    case 't': return { mx: clampX(cx), my: y - GAP, tx: clampX(cx), ty: y, side: s };
    case 'b': return { mx: clampX(cx), my: y + h + GAP, tx: clampX(cx), ty: y + h, side: s };
    case 'l': return { mx: x - GAP, my: clampY(cy), tx: x, ty: clampY(cy), side: s };
    case 'r': return { mx: x + w + GAP, my: clampY(cy), tx: x + w, ty: clampY(cy), side: s };
    // Inside big boxes: sit on the top-left corner so panel titles stay readable.
    default: return { mx: clampX(x + 2), my: clampY(y + 2), tx: 0, ty: 0, side: 'in' };
  }
}

export default function Figure({ shot, items, caption }: { shot: string; items: FigureItem[]; caption?: React.ReactNode }) {
  const { lang, tr } = useLanguage();
  const set = SHOTS[shot]?.[lang] ?? SHOTS[shot]?.en;
  const [active, setActive] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');
  if (!set) return null;
  const { w: W, h: H, boxes } = set;
  const src = `/docs/${shot}.${SHOTS[shot][lang] ? lang : 'en'}.webp`;
  const placed = items.map(it => (boxes[it.k] ? { ...it, box: boxes[it.k], pos: placeMarker(boxes[it.k], W, H, it.side) } : null));

  return (
    <figure className="my-6">
      {/* Wide screenshots scroll sideways inside the frame on phones instead of shrinking to unreadable. */}
      <div className="border border-[#1e2d45] bg-[#080d17] overflow-x-auto">
        <div className={`relative w-full ${W > 900 ? 'min-w-[680px] md:min-w-0' : ''}`} style={{ aspectRatio: `${W} / ${H}` }}>
          <Image src={src} alt={caption ? String(typeof caption === 'string' ? caption : '') : ''} width={W} height={H} unoptimized className="absolute inset-0 w-full h-full" />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            <defs>
              <marker id={`ah-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth">
                <path d="M0,0 L10,5 L0,10 z" fill="#ffd60a" />
              </marker>
            </defs>
            {placed.map((p, i) => {
              if (!p) return null;
              const [x, y, w, h] = p.box;
              const on = active === i;
              const dim = active !== null && !on;
              const { mx, my, tx, ty, side } = p.pos;
              // Start the arrow at the marker's edge, not its centre.
              const dx = tx - mx, dy = ty - my, len = Math.hypot(dx, dy) || 1;
              return (
                <g key={p.k} opacity={dim ? 0.25 : 1}>
                  <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4}
                    fill={on ? 'rgba(255,214,10,0.12)' : 'rgba(255,214,10,0.03)'}
                    stroke="#ffd60a" strokeWidth={on ? 2.5 : 1.5} strokeDasharray={on ? undefined : '6 4'}
                    vectorEffect="non-scaling-stroke" />
                  {side !== 'in' && (
                    <line x1={mx + (dx / len) * R} y1={my + (dy / len) * R} x2={tx} y2={ty}
                      stroke="#ffd60a" strokeWidth={2} vectorEffect="non-scaling-stroke" markerEnd={`url(#ah-${uid})`} />
                  )}
                </g>
              );
            })}
          </svg>
          {placed.map((p, i) => p && (
            <button
              key={p.k}
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => document.getElementById(`${uid}-${i}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
              aria-label={`${i + 1}. ${p.label}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[11px] sm:text-xs font-mono font-bold border-2 transition-transform ${active === i ? 'scale-125 bg-[#ffd60a] text-[#0a0f1a] border-[#0a0f1a]' : 'bg-[#ffd60a] text-[#0a0f1a] border-[#0a0f1a]'}`}
              style={{ left: `${(p.pos.mx / W) * 100}%`, top: `${(p.pos.my / H) * 100}%`, opacity: active !== null && active !== i ? 0.45 : 1 }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        {caption && <figcaption className="text-[11px] font-mono text-[#4a6080]">{caption}</figcaption>}
        <a href={src} target="_blank" rel="noopener" className="text-[11px] font-mono text-[#4a6080] hover:text-[#00b4d8] ml-auto">
          ⤢ {tr.docsOpenFull}
        </a>
      </div>
      <ol className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {placed.map((p, i) => p && (
          <li
            key={p.k}
            id={`${uid}-${i}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={`flex gap-2.5 items-start p-1.5 -m-1.5 transition-colors ${active === i ? 'bg-[#ffd60a]/10' : ''}`}
          >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold bg-[#ffd60a] text-[#0a0f1a]">{i + 1}</span>
            <span className="text-[13px] leading-snug">
              <span className="text-[#e6ebf5] font-semibold">{p.label}</span>
              {p.text && <span className="text-[#8a9ab5]"> — {p.text}</span>}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
