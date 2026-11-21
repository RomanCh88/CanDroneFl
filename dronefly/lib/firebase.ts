'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Web config is public by design (security comes from Auth + Firestore rules).
// NEXT_PUBLIC_* values are inlined at build time, so they must be set for the
// BUILD step on App Hosting (see apphosting.yaml) and in .env.local for dev.
// Each var is referenced literally so Next can inline it.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False when env vars are missing: the app then runs in public-only mode (no sign-in UI). */
export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured');
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}
