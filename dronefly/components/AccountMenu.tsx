'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/** Header account control. Renders nothing when Firebase isn't configured. */
export default function AccountMenu() {
  const { enabled, user, loading, error, signInWithGoogle } = useAuth();
  const { tr } = useLanguage();

  if (!enabled || loading) return null;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-[10px] font-mono text-[#ff3344] max-w-[220px] leading-tight" role="alert">
            {error === 'popup-blocked' ? tr.popupBlocked : tr.signInFailed(error)}
          </span>
        )}
        <button
          onClick={signInWithGoogle}
          className="border border-[#00b4d8] text-[#00b4d8] px-3 py-1 text-xs font-mono tracking-wider hover:bg-[#00b4d8] hover:text-black transition-colors"
        >
          {tr.signIn}
        </button>
      </div>
    );
  }

  const label = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || tr.profile;
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 border border-[#1e2d45] px-2 py-1 text-xs font-mono text-[#c8d0e0] hover:border-[#00b4d8] transition-colors"
      title={tr.profile}
    >
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt="" width={18} height={18} referrerPolicy="no-referrer" className="block" />
      ) : (
        <span className="text-[#00b4d8]">◉</span>
      )}
      <span className="max-w-[100px] truncate uppercase">{label}</span>
    </Link>
  );
}
