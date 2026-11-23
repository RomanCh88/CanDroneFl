'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/contexts/UserDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DRONE_PROFILES } from '@/lib/droneProfiles';
import { DroneProfile, SavedLocation } from '@/types';
import DroneForm from '@/components/profile/DroneForm';
import { Panel, Btn, ConfirmDeleteBtn, Field, inputClass } from '@/components/profile/ui';
import AccessGate from '@/components/access/AccessGate';
import InvitesPanel from '@/components/access/InvitesPanel';

export default function ProfilePage() {
  const { enabled, user, loading, member, error, signInWithGoogle, signOut } = useAuth();
  const { ready } = useUserData();
  const { lang, setLang, tr } = useLanguage();

  let body: React.ReactNode;
  if (!enabled) {
    body = <Notice>{tr.authUnavailable}</Notice>;
  } else if (loading || (user && member === null) || (user && member && !ready)) {
    body = <Notice pulse>{tr.loadingProfile}</Notice>;
  } else if (!user) {
    body = (
      <div className="max-w-md mx-auto border border-[#1e2d45] bg-[#0d1424] p-6 space-y-4">
        <div className="text-[#c8d0e0] font-mono text-sm">{tr.signInToUnlock}</div>
        <ul className="space-y-1">
          {tr.signInBenefits.map(b => (
            <li key={b} className="text-xs font-mono text-[#4a6080]"><span className="text-[#00ff88]">▸</span> {b}</li>
          ))}
        </ul>
        {error && (
          <div className="text-xs font-mono text-[#ff3344]" role="alert">
            {error === 'popup-blocked' ? tr.popupBlocked : tr.signInFailed(error)}
          </div>
        )}
        <Btn variant="primary" onClick={signInWithGoogle} className="!text-xs !px-4 !py-2">G&nbsp;&nbsp;{tr.signIn}</Btn>
      </div>
    );
  } else if (!member) {
    body = <AccessGate />;
  } else {
    body = (
      <div className="space-y-4">
        <Panel title={tr.account} action={<Btn onClick={signOut}>{tr.signOut}</Btn>}>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" width={40} height={40} referrerPolicy="no-referrer" className="border border-[#1e2d45]" />
            )}
            <div className="font-mono min-w-0">
              <div className="text-sm text-[#c8d0e0] truncate">{user.displayName}</div>
              <div className="text-xs text-[#4a6080] truncate">{user.email}</div>
            </div>
          </div>
        </Panel>
        <PreferencesPanel />
        <LocationsPanel />
        <DronesPanel />
        <InvitesPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1a' }}>
      <header className="border-b border-[#1e2d45] bg-[#080d17] flex items-center gap-4 px-4 py-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛩</span>
          <span className="font-bold text-lg tracking-widest text-[#00b4d8]">DRONEFLY</span>
        </Link>
        <Link href="/" className="text-xs font-mono text-[#4a6080] hover:text-[#00b4d8]">{tr.backToDashboard}</Link>
        <Link href="/docs" className="text-xs font-mono text-[#4a6080] hover:text-[#00b4d8]">? {tr.navDocs}</Link>
        <button
          onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
          className="ml-auto text-xs px-2 py-1 border border-[#1e2d45] font-mono tracking-wider"
        >
          <span style={{ color: lang === 'uk' ? '#00b4d8' : '#4a6080' }}>UA</span>
          <span className="text-[#2d4060]">|</span>
          <span style={{ color: lang === 'en' ? '#00b4d8' : '#4a6080' }}>EN</span>
        </button>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-xs font-mono text-[#4a6080]">{tr.profileTitle}</h1>
        {body}
      </main>
    </div>
  );
}

function Notice({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) {
  return (
    <div className={`py-16 text-center text-sm font-mono text-[#4a6080] ${pulse ? 'animate-pulse' : ''}`}>{children}</div>
  );
}

// ---------------------------------------------------------------------------

function PreferencesPanel() {
  const { prefs, locations, customDrones, updatePrefs } = useUserData();
  const { lang, setLang, tr } = useLanguage();
  const allProfiles = [...DRONE_PROFILES, ...customDrones];
  const droneLabel = (p: DroneProfile) => `${p.icon} ${lang === 'uk' ? (p.nameUk ?? p.name) : p.name}`;
  const save = (patch: Parameters<typeof updatePrefs>[0]) => updatePrefs(patch).catch(e => console.error(e));

  return (
    <Panel title={tr.preferences}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={tr.language}>
          {/* Language is synced to the profile by UserDataContext. */}
          <select value={lang} onChange={e => setLang(e.target.value as 'uk' | 'en')} className={inputClass}>
            <option value="uk">Українська</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label={tr.defaultLocation}>
          <select
            value={prefs.defaultLocationId ?? ''}
            onChange={e => save({ defaultLocationId: e.target.value || null })}
            className={inputClass}
          >
            <option value="">{tr.none}</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label={tr.defaultDrone}>
          <select
            value={prefs.defaultDroneId ?? ''}
            onChange={e => save({ defaultDroneId: e.target.value || null })}
            className={inputClass}
          >
            <option value="">{tr.none}</option>
            {allProfiles.map(p => <option key={p.id} value={p.id}>{droneLabel(p)}</option>)}
          </select>
        </Field>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function dashboardHref(l: SavedLocation) {
  return `/?${new URLSearchParams({ lat: String(l.lat), lng: String(l.lng), name: l.name })}`;
}

function LocationsPanel() {
  const { locations, prefs, addLocation, renameLocation, deleteLocation, updatePrefs } = useUserData();
  const { tr } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Panel
      title={`${tr.savedLocations} (${locations.length})`}
      action={!adding && <Btn variant="primary" onClick={() => setAdding(true)}>{tr.addLocation}</Btn>}
    >
      {adding && (
        <LocationForm
          onCancel={() => setAdding(false)}
          onSubmit={async l => { await addLocation(l); setAdding(false); }}
        />
      )}
      {locations.length === 0 && !adding && <div className="text-xs font-mono text-[#2d4060]">{tr.noSavedLocations}</div>}
      <ul className="divide-y divide-[#1e2d45]">
        {locations.map(l => {
          const isDefault = prefs.defaultLocationId === l.id;
          if (editingId === l.id) {
            return (
              <li key={l.id} className="py-2">
                <LocationForm
                  initial={l}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async v => { await renameLocation(l.id, v.name); setEditingId(null); }}
                  nameOnly
                />
              </li>
            );
          }
          return (
            <li key={l.id} className="py-2 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[160px] font-mono">
                <div className="text-sm text-[#c8d0e0]">{l.name}</div>
                <div className="text-[11px] text-[#4a6080]">{l.lat.toFixed(4)}, {l.lng.toFixed(4)}</div>
              </div>
              <Link href={dashboardHref(l)} className="border border-[#1e2d45] px-2 py-1 text-[11px] font-mono text-[#00b4d8] hover:border-[#00b4d8]">
                {tr.useOnDashboard}
              </Link>
              {isDefault ? (
                <span className="px-2 py-1 text-[11px] font-mono text-[#ffaa00]">{tr.isDefault}</span>
              ) : (
                <Btn onClick={() => updatePrefs({ defaultLocationId: l.id }).catch(console.error)}>{tr.setDefault}</Btn>
              )}
              <Btn onClick={() => setEditingId(l.id)}>{tr.rename}</Btn>
              <ConfirmDeleteBtn label={tr.deleteLabel} confirmLabel={tr.confirmDelete} onConfirm={() => deleteLocation(l.id).catch(console.error)} />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function LocationForm({ initial, nameOnly, onSubmit, onCancel }: {
  initial?: SavedLocation;
  nameOnly?: boolean;
  onSubmit: (l: Omit<SavedLocation, 'id'>) => Promise<void>;
  onCancel: () => void;
}) {
  const { tr } = useLanguage();
  const [name, setName] = useState(initial?.name ?? '');
  const [lat, setLat] = useState(initial ? String(initial.lat) : '');
  const [lng, setLng] = useState(initial ? String(initial.lng) : '');
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const la = Number(lat.replace(',', '.'));
    const ln = Number(lng.replace(',', '.'));
    const errs = new Set<string>();
    if (!name.trim()) errs.add('name');
    if (!nameOnly) {
      if (lat.trim() === '' || !Number.isFinite(la) || Math.abs(la) > 90) errs.add('lat');
      if (lng.trim() === '' || !Number.isFinite(ln) || Math.abs(ln) > 180) errs.add('lng');
    }
    setBad(errs);
    if (errs.size) return;
    setBusy(true);
    setFailed(false);
    try {
      await onSubmit({ name: name.trim(), lat: la, lng: ln });
    } catch (err) {
      console.error(err);
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2 mb-3">
      <div className="flex-1 min-w-[160px]">
        <Field label={tr.nameLabel}>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} aria-invalid={bad.has('name')} className={inputClass} autoFocus />
        </Field>
      </div>
      {!nameOnly && (
        <>
          <div className="w-28">
            <Field label={tr.latLabel}>
              <input inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} aria-invalid={bad.has('lat')} className={inputClass} placeholder="50.4501" />
            </Field>
          </div>
          <div className="w-28">
            <Field label={tr.lngLabel}>
              <input inputMode="decimal" value={lng} onChange={e => setLng(e.target.value)} aria-invalid={bad.has('lng')} className={inputClass} placeholder="30.5234" />
            </Field>
          </div>
        </>
      )}
      <Btn type="submit" variant="primary" disabled={busy} className="!py-1.5">{busy ? tr.saving : tr.save}</Btn>
      <Btn onClick={onCancel} disabled={busy} className="!py-1.5">{tr.cancel}</Btn>
      {failed && <div className="w-full text-xs font-mono text-[#ff3344]">{tr.saveFailed}</div>}
    </form>
  );
}

// ---------------------------------------------------------------------------

function DronesPanel() {
  const { customDrones, addDrone, updateDrone, deleteDrone } = useUserData();
  const { tr } = useLanguage();
  const [mode, setMode] = useState<{ kind: 'new' } | { kind: 'edit'; id: string } | null>(null);

  const typeLabel = (t: DroneProfile['type']) => (t === 'fpv' ? tr.typeFpv : t === 'multirotor' ? tr.typeMultirotor : tr.typeFixedWing);

  return (
    <Panel
      title={`${tr.customDrones} (${customDrones.length})`}
      action={!mode && <Btn variant="primary" onClick={() => setMode({ kind: 'new' })}>{tr.addDrone}</Btn>}
    >
      {mode?.kind === 'new' && (
        <div className="mb-3">
          <DroneForm onCancel={() => setMode(null)} onSubmit={async d => { await addDrone(d); setMode(null); }} />
        </div>
      )}
      {customDrones.length === 0 && !mode && <div className="text-xs font-mono text-[#2d4060]">{tr.noCustomDrones}</div>}
      <ul className="space-y-2">
        {customDrones.map(d => (
          <li key={d.id}>
            {mode?.kind === 'edit' && mode.id === d.id ? (
              <DroneForm initial={d} onCancel={() => setMode(null)} onSubmit={async v => { await updateDrone(d.id, v); setMode(null); }} />
            ) : (
              <div className="border border-[#1e2d45] p-3 flex flex-wrap items-center gap-3">
                <span className="text-2xl">{d.icon}</span>
                <div className="flex-1 min-w-[180px] font-mono">
                  <div className="text-sm text-[#c8d0e0]">{d.name} <span className="text-[10px] text-[#4a6080]">· {typeLabel(d.type)}</span></div>
                  <div className="text-[11px] text-[#4a6080] leading-relaxed">
                    {tr.maxWind} {d.limits.maxWindSpeed} · {tr.maxGusts} {d.limits.maxWindGusts} m/s ·{' '}
                    {d.limits.minTemperature}…{d.limits.maxTemperature}°C · {d.nominalRange} km · {d.nominalEndurance} min
                  </div>
                  {d.performance && (
                    <div className="text-[11px] text-[#00b4d8] leading-relaxed">
                      ⚖ {tr.specMaxPayload} {d.performance.maxPayloadKg} kg · {d.performance.enduranceEmptyMin.min}–{d.performance.enduranceEmptyMin.max} min
                      {' → '}{d.performance.enduranceLoadedMin.min}–{d.performance.enduranceLoadedMin.max} min @ {d.performance.loadedPayloadKg} kg
                      {' · '}{d.performance.speedEmptyKmh.min}–{d.performance.speedEmptyKmh.max} / {d.performance.speedFullKmh} km/h
                      {' · '}R {d.performance.radiusEmptyKm}/{d.performance.radiusFullKm} km
                    </div>
                  )}
                </div>
                <Link href={`/?drone=${encodeURIComponent(d.id)}`} className="border border-[#1e2d45] px-2 py-1 text-[11px] font-mono text-[#00b4d8] hover:border-[#00b4d8]">
                  {tr.useOnDashboard}
                </Link>
                <Btn onClick={() => setMode({ kind: 'edit', id: d.id })} disabled={!!mode}>{tr.edit}</Btn>
                <ConfirmDeleteBtn label={tr.deleteLabel} confirmLabel={tr.confirmDelete} onConfirm={() => deleteDrone(d.id).catch(console.error)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
