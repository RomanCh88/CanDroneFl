'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseCoordinates, toMGRS, ParsedCoords } from '@/lib/coords';
import { searchPlaces, Place } from '@/lib/geocode';
import { Location } from '@/types';

interface Props {
  onSelect: (loc: Location) => void;
}

type Option =
  | { type: 'coords'; c: ParsedCoords }
  | { type: 'place'; p: Place };

const DEBOUNCE_MS = 350;

/**
 * One field for everything: WGS84 decimal / DMS, MGRS, or a place name.
 * Coordinates are parsed locally (instant, offline); names go to Open-Meteo Geocoding.
 * Keyboard: "/" focuses, ↑/↓ choose, Enter goes, Esc closes.
 */
export default function LocationSearch({ onSelect }: Props) {
  const { lang, tr } = useLanguage();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [places, setPlaces] = useState<{ q: string; list: Place[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const coords = useMemo(() => parseCoordinates(text), [text]);
  const query = text.trim();
  const wantsPlaces = !coords && query.length >= 2;

  // Place search (debounced, abortable). Coordinates never hit the network.
  useEffect(() => {
    if (!wantsPlaces) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const list = await searchPlaces(query, lang, ctrl.signal);
        if (!ctrl.signal.aborted) { setPlaces({ q: query, list }); setActive(0); }
      } catch {
        if (!ctrl.signal.aborted) setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, wantsPlaces, lang]);

  const options: Option[] = coords
    ? [{ type: 'coords', c: coords }]
    : wantsPlaces && places?.q === query ? places.list.map(p => ({ type: 'place' as const, p })) : [];

  // "/" focuses the field from anywhere (unless typing in another input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, []);

  const kindLabel = (c: ParsedCoords) => (c.kind === 'mgrs' ? 'MGRS' : c.kind === 'dms' ? tr.kindDms : 'WGS84');
  const placeLabel = (p: Place) => [p.name, p.admin1, p.countryCode && p.countryCode !== 'UA' ? p.country : null].filter(Boolean).join(', ');

  const choose = (o: Option | undefined) => {
    if (!o) return;
    if (o.type === 'coords') {
      const c = o.c;
      const name = c.kind === 'mgrs' ? toMGRS(c, 4) || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
      onSelect({ lat: c.lat, lng: c.lng, name });
    } else {
      onSelect({ lat: o.p.lat, lng: o.p.lng, name: placeLabel(o.p) });
    }
    setText('');
    setPlaces(null);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, Math.max(0, options.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(options[active] ?? options[0]); }
    else if (e.key === 'Escape') { if (text) setText(''); else { setOpen(false); inputRef.current?.blur(); } }
  };

  const showPanel = open && query.length > 0;

  return (
    <div ref={rootRef} className="relative flex-1 min-w-[220px] max-w-md order-last sm:order-none basis-full sm:basis-auto">
      <div className="flex items-center border border-[#1e2d45] bg-[#0a0f1a] focus-within:border-[#00b4d8] transition-colors">
        <span className="pl-2 text-[#4a6080] text-xs font-mono" aria-hidden>⌖</span>
        <input
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={tr.searchPlaceholder}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={tr.searchPlaceholder}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-xs font-mono text-[#c8d0e0] placeholder:text-[#2d4060] outline-none"
        />
        {loading && <span className="pr-2 text-[10px] font-mono text-[#00b4d8] animate-pulse">…</span>}
        {!text && <kbd className="mr-2 px-1 border border-[#1e2d45] text-[10px] font-mono text-[#2d4060] hidden sm:inline">/</kbd>}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[2000] border border-[#1e2d45] bg-[#0d1424] font-mono text-xs shadow-none">
          <ul id={listId} role="listbox">
            {options.map((o, i) => (
              <li key={o.type === 'coords' ? 'c' : o.p.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`w-full text-left px-3 py-2 flex items-start justify-between gap-3 ${i === active ? 'bg-[#141b2d]' : ''}`}
                >
                  {o.type === 'coords' ? (
                    <>
                      <span>
                        <span className="text-[#00ff88]">▸ {kindLabel(o.c)}</span>
                        <span className="block text-[#c8d0e0]">{o.c.lat.toFixed(5)}, {o.c.lng.toFixed(5)}</span>
                      </span>
                      <span className="text-[#4a6080] text-right shrink-0">{toMGRS(o.c, 5)}</span>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0">
                        <span className="text-[#c8d0e0]">{o.p.name}</span>
                        <span className="block text-[#4a6080] truncate">{[o.p.admin2, o.p.admin1, o.p.country].filter(Boolean).join(', ')}</span>
                      </span>
                      <span className="text-[#2d4060] shrink-0">{o.p.lat.toFixed(2)}, {o.p.lng.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {options.length === 0 && (
            <div className="px-3 py-2 text-[#4a6080]">
              {error ? tr.searchError : wantsPlaces && !loading && places?.q === query ? tr.searchNoResults : wantsPlaces ? '…' : tr.searchHint}
            </div>
          )}
          <div className="px-3 py-1.5 border-t border-[#1e2d45] text-[10px] text-[#2d4060]">{tr.searchHint}</div>
        </div>
      )}
    </div>
  );
}
