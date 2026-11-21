'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/contexts/UserDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AccountMenu from '@/components/AccountMenu';
import MissionPlanner from '@/components/mission/MissionPlanner';
import { Btn } from '@/components/profile/ui';

export default function MissionPage() {
  const { enabled, user, loading, error, signInWithGoogle } = useAuth();
  const { ready } = useUserData();
  const { lang, setLang, tr } = useLanguage();

  let body: React.ReactNode;
  if (!enabled) {
    body = <Notice>{tr.authUnavailable}</Notice>;
  } else if (loading || (user && !ready)) {
    body = <Notice pulse>{tr.loadingProfile}</Notice>;
  } else if (!user) {
    body = (
      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto mt-12 border border-[#1e2d45] bg-[#0d1424] p-6 space-y-4">
          <div className="text-[#c8d0e0] font-mono text-sm">{tr.missionSignIn}</div>
          {error && (
            <div className="text-xs font-mono text-[#ff3344]" role="alert">
              {error === 'popup-blocked' ? tr.popupBlocked : tr.signInFailed(error)}
            </div>
          )}
          <Btn variant="primary" onClick={signInWithGoogle} className="!text-xs !px-4 !py-2">G&nbsp;&nbsp;{tr.signIn}</Btn>
        </div>
      </div>
    );
  } else {
    // key: remount per account so per-user mission storage is read fresh.
    body = <MissionPlanner key={user.uid} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1a' }}>
      <header className="h-[57px] shrink-0 border-b border-[#1e2d45] bg-[#080d17] flex items-center gap-4 px-4 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛩</span>
          <span className="font-bold text-lg tracking-widest text-[#00b4d8]">DRONEFLY</span>
        </Link>
        <span className="text-xs font-mono text-[#4a6080] hidden sm:inline">{tr.missionTitle}</span>
        <Link href="/" className="text-xs font-mono text-[#4a6080] hover:text-[#00b4d8]">{tr.backToDashboard}</Link>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
            className="text-xs px-2 py-1 border border-[#1e2d45] font-mono tracking-wider"
          >
            <span style={{ color: lang === 'uk' ? '#00b4d8' : '#4a6080' }}>UA</span>
            <span className="text-[#2d4060]">|</span>
            <span style={{ color: lang === 'en' ? '#00b4d8' : '#4a6080' }}>EN</span>
          </button>
          <AccountMenu />
        </div>
      </header>
      {body}
    </div>
  );
}

function Notice({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) {
  return (
    <div className={`flex-1 py-16 text-center text-sm font-mono text-[#4a6080] ${pulse ? 'animate-pulse' : ''}`}>{children}</div>
  );
}
