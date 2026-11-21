'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb, getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { ensureUserDoc } from '@/lib/userData';
import { apiFetch } from '@/lib/api';

interface AuthContextValue {
  /** False when Firebase env is missing: hide every account-related UI. */
  enabled: boolean;
  user: User | null;
  /** True until the first auth state is known (avoids flashing the sign-in button). */
  loading: boolean;
  /**
   * Accounts are invite-only. null = unknown yet (checking), true = member, false = signed in
   * but no access (show invite / request-access screen). Live: flips to true when approved.
   */
  member: boolean | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-check membership on the server (e.g. right after redeeming an invite). */
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  enabled: false,
  user: null,
  loading: false,
  member: null,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshMembership: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [member, setMember] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), u => {
      setUser(u);
      setMember(null);
      setLoading(false);
    });
  }, []);

  const refreshMembership = useCallback(async () => {
    try {
      // Server bootstraps the admin and pre-invite (legacy) users into members/.
      const r = await apiFetch<{ member: boolean }>('/api/access/me', { method: 'POST' });
      setMember(r.member);
    } catch (e) {
      console.error('Membership check failed', e);
      setMember(m => m ?? false);
    }
  }, []);

  // Membership: ask the server once, then follow members/{uid} live (approval flips it to true).
  useEffect(() => {
    if (!user) return;
    // Asking our server (external system); state is set when the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMembership();
    return onSnapshot(
      doc(getDb(), 'members', user.uid),
      snap => { if (snap.exists()) setMember(true); },
      () => { /* not readable yet / offline — the server answer decides */ }
    );
  }, [user, refreshMembership]);

  // Create/refresh the profile doc only for members (rules deny everyone else).
  useEffect(() => {
    if (user && member) ensureUserDoc(user).catch(e => console.error('Failed to init user profile', e));
  }, [user, member]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(code === 'auth/popup-blocked' ? 'popup-blocked' : code || 'unknown');
      console.error('Sign-in failed', e);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await fbSignOut(getFirebaseAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ enabled: isFirebaseConfigured, user, loading, member, error, signInWithGoogle, signOut, refreshMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
