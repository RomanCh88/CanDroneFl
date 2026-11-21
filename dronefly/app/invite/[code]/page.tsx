'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, ApiError } from '@/lib/api';
import { Btn } from '@/components/profile/ui';
import { inviteError } from '@/components/access/AccessGate';

const linkBtn = (primary = false) =>
  `inline-block border px-3 py-1.5 text-[11px] font-mono tracking-wider ${primary ? 'border-[#00b4d8] text-[#00b4d8] hover:bg-[#00b4d8] hover:text-black' : 'border-[#1e2d45] text-[#4a6080] hover:text-[#c8d0e0]'}`;

interface Info { status: 'active' | 'used' | 'expired' | 'revoked' | 'not_found'; expiresAt?: number; inviterName?: string }

export default function InvitePage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { enabled, user, loading, member, signInWithGoogle, refreshMembership, error: authError } = useAuth();
  const { lang, setLang, tr } = useLanguage();
  const [info, setInfo] = useState<Info | null>(null);
  const [redeemErr, setRedeemErr] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    apiFetch<Info>(`/api/invites/${encodeURIComponent(code)}`, { auth: false })
      .then(setInfo)
      .catch(() => setInfo({ status: 'not_found' }));
  }, [code]);

  // Signed in, not a member, invite usable → accept automatically (once).
  useEffect(() => {
    if (!user || member !== false || info?.status !== 'active' || tried.current) return;
    tried.current = true;
    apiFetch(`/api/invites/${encodeURIComponent(code)}`, { method: 'POST' })
      .then(async () => { setAccepted(true); await refreshMembership(); })
      .catch(e => setRedeemErr(inviteError(tr, e instanceof ApiError ? e.code : '')));
  }, [user, member, info, code, refreshMembership, tr]);

  const fmt = (t: number) => new Date(t).toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  let body: React.ReactNode;
  if (!enabled) body = <div className="text-[#4a6080]">{tr.authUnavailable}</div>;
  else if (!info || loading) body = <div className="text-[#4a6080] animate-pulse">…</div>;
  else if (user && member && !accepted) {
    body = (
      <>
        <div className="text-[#00ff88] text-lg font-bold">✓ {tr.alreadyMember}</div>
        <Link href="/profile" className={linkBtn(true)}>{tr.goToProfile}</Link>
      </>
    );
  } else if (accepted) {
    body = (
      <>
        <div className="text-[#00ff88] text-lg font-bold">✓ {tr.inviteAccepted}</div>
        <div className="flex gap-2">
          <Link href="/profile" className={linkBtn(true)}>{tr.goToProfile}</Link>
          <Link href="/mission" className={linkBtn()}>◎ {tr.mission}</Link>
        </div>
      </>
    );
  } else if (info.status !== 'active') {
    body = (
      <>
        <div className="text-[#ff3344] font-bold">{inviteError(tr, info.status)}</div>
        <Link href="/profile" className="text-xs text-[#00b4d8] hover:underline">{tr.requestAccess} →</Link>
      </>
    );
  } else {
    body = (
      <>
        <div className="text-white text-lg font-bold">{tr.invitedBy(info.inviterName ?? '')}</div>
        {info.expiresAt && <div className="text-xs text-[#4a6080]">{tr.inviteValidUntil(fmt(info.expiresAt))}</div>}
        {redeemErr && <div className="text-xs text-[#ff3344]" role="alert">{redeemErr}</div>}
        {!user ? (
          <>
            <div className="text-xs text-[#c8d0e0]">{tr.signInToAccept}</div>
            {authError && <div className="text-xs text-[#ff3344]">{authError === 'popup-blocked' ? tr.popupBlocked : tr.signInFailed(authError)}</div>}
            <Btn variant="primary" onClick={signInWithGoogle} className="!text-xs !px-4 !py-2">G&nbsp;&nbsp;{tr.signIn}</Btn>
          </>
        ) : (
          !redeemErr && <div className="text-xs text-[#00b4d8] animate-pulse">{tr.acceptInvite}…</div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1a' }}>
      <header className="border-b border-[#1e2d45] bg-[#080d17] flex items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛩</span>
          <span className="font-bold text-lg tracking-widest text-[#00b4d8]">DRONEFLY</span>
        </Link>
        <button
          onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
          className="ml-auto text-xs px-2 py-1 border border-[#1e2d45] font-mono tracking-wider"
        >
          <span style={{ color: lang === 'uk' ? '#00b4d8' : '#4a6080' }}>UA</span>
          <span className="text-[#2d4060]">|</span>
          <span style={{ color: lang === 'en' ? '#00b4d8' : '#4a6080' }}>EN</span>
        </button>
      </header>
      <main className="flex-1 flex items-start justify-center p-4">
        <div className="w-full max-w-md mt-12 border border-[#1e2d45] bg-[#0d1424] p-6 font-mono space-y-4">
          <div className="text-xs text-[#4a6080]">{tr.inviteTitle}</div>
          {body}
        </div>
      </main>
    </div>
  );
}
