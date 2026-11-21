'use client';

// Firestore data layer for signed-in users.
//
// Layout (all access restricted to the owner by firestore.rules):
//   users/{uid}                    { displayName, email, photoURL, createdAt, updatedAt, prefs }
//   users/{uid}/locations/{id}     { name, lat, lng, createdAt }
//   users/{uid}/drones/{id}        DroneProfile fields (minus id/custom) + createdAt, updatedAt

import {
  doc, collection, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy, Unsubscribe, getDoc, deleteField,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getDb } from './firebase';
import { DroneProfile, SavedLocation, UserPrefs } from '@/types';

export type CustomDroneInput = Omit<DroneProfile, 'id' | 'custom'>;

const userDoc = (uid: string) => doc(getDb(), 'users', uid);
const locationsCol = (uid: string) => collection(getDb(), 'users', uid, 'locations');
const dronesCol = (uid: string) => collection(getDb(), 'users', uid, 'drones');

/** Create the user doc on first sign-in; refresh public profile fields afterwards. */
export async function ensureUserDoc(user: User): Promise<void> {
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  const profile = {
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    updatedAt: serverTimestamp(),
  };
  if (snap.exists()) {
    await updateDoc(ref, profile);
  } else {
    // merge: a prefs write may have created the doc in the meantime.
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() }, { merge: true });
  }
}

// ---------- prefs ----------

type OnError = (e: Error) => void;

export function subscribePrefs(uid: string, cb: (prefs: UserPrefs) => void, onError?: OnError): Unsubscribe {
  return onSnapshot(userDoc(uid), snap => cb((snap.data()?.prefs as UserPrefs) ?? {}), onError);
}

export async function updatePrefs(uid: string, patch: Partial<UserPrefs>): Promise<void> {
  // merge:true deep-merges the prefs map (other prefs are kept) and also works
  // if the user doc doesn't exist yet (first sign-in race with ensureUserDoc).
  const prefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) prefs[k] = v ?? null;
  await setDoc(userDoc(uid), { prefs, updatedAt: serverTimestamp() }, { merge: true });
}

// ---------- locations ----------

export function subscribeLocations(uid: string, cb: (locs: SavedLocation[]) => void, onError?: OnError): Unsubscribe {
  return onSnapshot(query(locationsCol(uid), orderBy('createdAt', 'asc')), snap =>
    cb(snap.docs.map(d => {
      const v = d.data();
      return { id: d.id, name: v.name, lat: v.lat, lng: v.lng };
    })),
    onError
  );
}

export async function addLocation(uid: string, loc: Omit<SavedLocation, 'id'>): Promise<string> {
  const ref = await addDoc(locationsCol(uid), {
    name: loc.name.trim().slice(0, 60),
    lat: loc.lat,
    lng: loc.lng,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameLocation(uid: string, id: string, name: string): Promise<void> {
  await updateDoc(doc(locationsCol(uid), id), { name: name.trim().slice(0, 60) });
}

export async function deleteLocation(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(locationsCol(uid), id));
}

// ---------- custom drones ----------

export function subscribeDrones(uid: string, cb: (drones: DroneProfile[]) => void, onError?: OnError): Unsubscribe {
  return onSnapshot(query(dronesCol(uid), orderBy('createdAt', 'asc')), snap =>
    cb(snap.docs.map(d => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...rest } = d.data();
      return { ...(rest as CustomDroneInput), id: `custom_${d.id}`, custom: true };
    })),
    onError
  );
}

/** Firestore doc id from the app-level id (`custom_<docId>`). */
export const droneDocId = (appId: string) => appId.replace(/^custom_/, '');

function cleanDrone(d: CustomDroneInput): CustomDroneInput {
  // Firestore rejects `undefined`; strip optional fields that aren't set.
  return JSON.parse(JSON.stringify({ ...d, name: d.name.trim().slice(0, 40), notes: (d.notes ?? '').slice(0, 300) }));
}

export async function addDrone(uid: string, drone: CustomDroneInput): Promise<string> {
  const ref = await addDoc(dronesCol(uid), { ...cleanDrone(drone), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return `custom_${ref.id}`;
}

export async function updateDrone(uid: string, appId: string, drone: CustomDroneInput): Promise<void> {
  const clean = cleanDrone(drone);
  // updateDoc replaces each top-level field; specs switched off must be removed explicitly.
  await updateDoc(doc(dronesCol(uid), droneDocId(appId)), {
    ...clean,
    performance: clean.performance ?? deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDrone(uid: string, appId: string): Promise<void> {
  await deleteDoc(doc(dronesCol(uid), droneDocId(appId)));
}
