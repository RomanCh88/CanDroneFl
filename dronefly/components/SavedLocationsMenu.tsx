'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/contexts/UserDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Location } from '@/types';

interface Props {
  current: Location;
  onSelect: (loc: Location) => void;
}

const SAME_POINT_EPS = 0.0005; // ~50 m

/** Header dropdown with the user's saved locations. Signed-in users only. */
export default function SavedLocationsMenu({ current, onSelect }: Props) {
  const { user } = useAuth();
  const { locations, prefs, addLocation } = useUserData();
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const isCurrentSaved = locations.some(
    l => Math.abs(l.lat - current.lat) < SAME_POINT_EPS && Math.abs(l.lng - current.lng) < SAME_POINT_EPS
  );

  const save = async () => {
    const n = name.trim() || current.name;
    setBusy(true);
    setFailed(false);
    try {
      await addLocation({ name: n, lat: current.lat, lng: current.lng });
      setName('');
    } catch (e) {
      console.error(e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="text-xs px-2 py-1 border font-mono transition-colors hover:border-[#00b4d8]"
        style={{ borderColor: open ? '#00b4d8' : '#1e2d45', color: open ? '#00b4d8' : '#4a6080' }}
      >
        ★ {locations.length} ▾
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-[2000] w-[260px] border border-[#1e2d45] bg-[#0d1424] font-mono text-xs">
          <div className="px-3 py-2 text-[#4a6080] border-b border-[#1e2d45]">{tr.savedLocations}</div>
          <ul className="max-h-[240px] overflow-y-auto">
            {locations.length === 0 && <li className="px-3 py-2 text-[#2d4060]">{tr.noSavedLocations}</li>}
            {locations.map(l => {
              const active = Math.abs(l.lat - current.lat) < SAME_POINT_EPS && Math.abs(l.lng - current.lng) < SAME_POINT_EPS;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => { onSelect({ lat: l.lat, lng: l.lng, name: l.name }); setOpen(false); }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#141b2d]"
                    style={{ color: active ? '#00b4d8' : '#c8d0e0' }}
                  >
                    <span className="truncate">
                      {prefs.defaultLocationId === l.id && <span className="text-[#ffaa00]">★ </span>}
                      {l.name}
                    </span>
                    <span className="text-[#2d4060] shrink-0">{l.lat.toFixed(2)}, {l.lng.toFixed(2)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!isCurrentSaved && (
            <form
              onSubmit={e => { e.preventDefault(); void save(); }}
              className="border-t border-[#1e2d45] p-2 flex gap-1"
            >
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={tr.locationNamePlaceholder}
                maxLength={60}
                className="flex-1 min-w-0 bg-[#0a0f1a] border border-[#1e2d45] px-2 py-1 text-[#c8d0e0] outline-none focus:border-[#00b4d8]"
              />
              <button
                type="submit"
                disabled={busy}
                className="border border-[#00b4d8] text-[#00b4d8] px-2 py-1 hover:bg-[#00b4d8] hover:text-black disabled:opacity-50 whitespace-nowrap"
              >
                {busy ? '…' : tr.saveCurrentLocation}
              </button>
            </form>
          )}
          {failed && <div className="px-3 pb-2 text-[#ff3344]">{tr.saveFailed}</div>}
        </div>
      )}
    </div>
  );
}
