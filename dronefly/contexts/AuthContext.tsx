'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { ensureUserDoc } from '@/lib/userData';

interface AuthContextValue {
  /** False when Firebase env is missing: hide every account-related UI. */
  enabled: boolean;
  user: User | null;
  /** True until the first auth state is known (avoids flashing the sign-in button). */
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  enabled: false,
  user: null,
  loading: false,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), async u => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          await ensureUserDoc(u);
        } catch (e) {
          console.error('Failed to init user profile', e);
        }
      }
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      // User closing the popup is not an error worth showing.
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
    <AuthContext.Provider value={{ enabled: isFirebaseConfigured, user, loading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
