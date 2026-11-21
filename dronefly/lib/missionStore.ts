'use client';

// Missions are NEVER sent to our database. They live in the browser only, per account:
//  - default: sessionStorage (gone when the tab is closed)
//  - opt-in "remember on this device": localStorage
// Only the opt-in flag itself is stored in localStorage (no coordinates).

import type { LatLng } from './geo';
import type { MissionMode } from './mission';

export interface Mission {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  droneId: string;
  payloadKg: number | null;
  /** Chosen airspeed (km/h); null = automatic best speed. */
  airspeedKmh: number | null;
  altitudeM: number;
  /** Forecast hour offset from now (0–47). */
  hourIndex: number;
  reservePct: number;
  mode: MissionMode;
  /** [A, ...waypoints, B] */
  points: LatLng[];
}

const MAX_MISSIONS = 30;
const dataKey = (uid: string) => `dronefly.missions.${uid}`;
const persistKey = (uid: string) => `dronefly.missions.persist.${uid}`;

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export function getPersist(uid: string): boolean {
  return safe(() => localStorage.getItem(persistKey(uid)) === '1', false);
}

const store = (uid: string): Storage | null =>
  safe(() => (getPersist(uid) ? localStorage : sessionStorage), null);

function isMission(m: unknown): m is Mission {
  const x = m as Mission;
  return !!x && typeof x.id === 'string' && Array.isArray(x.points)
    && x.points.every(p => typeof p?.lat === 'number' && typeof p?.lng === 'number');
}

export function loadMissions(uid: string): Mission[] {
  return safe(() => {
    const raw = store(uid)?.getItem(dataKey(uid));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(isMission) : [];
  }, []);
}

export function saveMissions(uid: string, missions: Mission[]): void {
  safe(() => {
    const list = missions.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_MISSIONS);
    store(uid)?.setItem(dataKey(uid), JSON.stringify(list));
  }, undefined);
}

/** Switch storage mode, moving existing missions to the new place and wiping the old one. */
export function setPersist(uid: string, on: boolean): void {
  safe(() => {
    const missions = loadMissions(uid);
    (on ? sessionStorage : localStorage).removeItem(dataKey(uid));
    if (on) localStorage.setItem(persistKey(uid), '1');
    else localStorage.removeItem(persistKey(uid));
    saveMissions(uid, missions);
  }, undefined);
}

/** Delete this account's missions from both storages. */
export function clearMissions(uid: string): void {
  safe(() => {
    localStorage.removeItem(dataKey(uid));
    sessionStorage.removeItem(dataKey(uid));
  }, undefined);
}

export function newMissionId(): string {
  return safe(() => crypto.randomUUID(), `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}
