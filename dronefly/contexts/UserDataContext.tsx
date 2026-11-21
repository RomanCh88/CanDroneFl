'use client';

import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { DroneProfile, SavedLocation, UserPrefs } from '@/types';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import * as data from '@/lib/userData';
import type { CustomDroneInput } from '@/lib/userData';

interface UserDataContextValue {
  /** True once prefs, locations and drones have all arrived for the signed-in user. */
  ready: boolean;
  prefs: UserPrefs;
  locations: SavedLocation[];
  customDrones: DroneProfile[];
  updatePrefs: (patch: Partial<UserPrefs>) => Promise<void>;
  addLocation: (loc: Omit<SavedLocation, 'id'>) => Promise<string>;
  renameLocation: (id: string, name: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addDrone: (d: CustomDroneInput) => Promise<string>;
  updateDrone: (id: string, d: CustomDroneInput) => Promise<void>;
  deleteDrone: (id: string) => Promise<void>;
}

const noop = async () => { throw new Error('Not signed in'); };

const UserDataContext = createContext<UserDataContextValue>({
  ready: false,
  prefs: {},
  locations: [],
  customDrones: [],
  updatePrefs: noop,
  addLocation: noop,
  renameLocation: noop,
  deleteLocation: noop,
  addDrone: noop,
  updateDrone: noop,
  deleteDrone: noop,
});

interface DataStore {
  uid: string | null;
  prefs: UserPrefs;
  locations: SavedLocation[];
  customDrones: DroneProfile[];
  loaded: { prefs: boolean; locations: boolean; drones: boolean };
}

// Shared constants so the "empty" fallback is referentially stable across renders.
const EMPTY_PREFS: UserPrefs = {};
const EMPTY_LOCATIONS: SavedLocation[] = [];
const EMPTY_DRONES: DroneProfile[] = [];
const NOT_LOADED = { prefs: false, locations: false, drones: false };

const emptyStore = (uid: string | null): DataStore => ({
  uid, prefs: EMPTY_PREFS, locations: EMPTY_LOCATIONS, customDrones: EMPTY_DRONES, loaded: NOT_LOADED,
});

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { lang, setLang } = useLanguage();

  // All data is tagged with the uid it belongs to; data for another uid (or none) reads as empty.
  // This avoids resetting state inside the effect when the user changes.
  const [store, setStore] = useState<DataStore>(emptyStore(null));
  const cur = store.uid === uid ? store : emptyStore(uid);
  const { prefs, locations, customDrones, loaded } = cur;

  // Subscribe to the user's data while signed in.
  useEffect(() => {
    if (!uid) return;
    const patch = (p: Partial<DataStore>, key: keyof DataStore['loaded']) =>
      setStore(s => {
        const base = s.uid === uid ? s : emptyStore(uid);
        return { ...base, ...p, loaded: { ...base.loaded, [key]: true } };
      });
    // On error, still mark as loaded so the UI doesn't wait forever.
    const onErr = (key: keyof DataStore['loaded']) => (e: Error) => {
      console.error(`Failed to load ${key}`, e);
      patch({}, key);
    };
    const unsubs = [
      data.subscribePrefs(uid, p => patch({ prefs: p }, 'prefs'), onErr('prefs')),
      data.subscribeLocations(uid, l => patch({ locations: l }, 'locations'), onErr('locations')),
      data.subscribeDrones(uid, d => patch({ customDrones: d }, 'drones'), onErr('drones')),
    ];
    return () => unsubs.forEach(u => u());
  }, [uid]);

  // Two-way language sync: remote change → local; local toggle → remote.
  const lastRemoteLang = useRef<string | null>(null);
  useEffect(() => {
    if (!uid) { lastRemoteLang.current = null; return; }
    if (!loaded.prefs) return;
    const remote = prefs.lang ?? null;
    if (remote && remote !== lastRemoteLang.current) {
      lastRemoteLang.current = remote;
      if (remote !== lang) setLang(remote);
      return;
    }
    if (lang !== remote) {
      lastRemoteLang.current = lang;
      data.updatePrefs(uid, { lang }).catch(e => console.error('Failed to save language', e));
    }
  }, [uid, loaded.prefs, prefs.lang, lang, setLang]);

  const value = useMemo<UserDataContextValue>(() => {
    if (!uid) {
      return { ready: false, prefs: {}, locations: [], customDrones: [],
        updatePrefs: noop, addLocation: noop, renameLocation: noop, deleteLocation: noop,
        addDrone: noop, updateDrone: noop, deleteDrone: noop };
    }
    return {
      ready: loaded.prefs && loaded.locations && loaded.drones,
      prefs,
      locations,
      customDrones,
      updatePrefs: p => data.updatePrefs(uid, p),
      addLocation: l => data.addLocation(uid, l),
      renameLocation: (id, name) => data.renameLocation(uid, id, name),
      deleteLocation: async id => {
        await data.deleteLocation(uid, id);
        if (prefs.defaultLocationId === id) await data.updatePrefs(uid, { defaultLocationId: null });
      },
      addDrone: d => data.addDrone(uid, d),
      updateDrone: (id, d) => data.updateDrone(uid, id, d),
      deleteDrone: async id => {
        await data.deleteDrone(uid, id);
        if (prefs.defaultDroneId === id) await data.updatePrefs(uid, { defaultDroneId: null });
      },
    };
  }, [uid, loaded, prefs, locations, customDrones]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataContextValue {
  return useContext(UserDataContext);
}
