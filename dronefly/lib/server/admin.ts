// SERVER ONLY — never import from client components.
// Firebase Admin SDK. Credentials: App Hosting provides them automatically (service account);
// locally use `gcloud auth application-default login` (Application Default Credentials).

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function app(): App {
  return getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
