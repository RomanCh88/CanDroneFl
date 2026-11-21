'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDb } from '@/lib/firebase';
import { apiFetch, ApiError } from '@/lib/api';
import { Btn, inputClass } from '@/components/profile/ui';
import type { Translations } from '@/lib/i18n';

export function inviteError(tr: Translations, code: string): string {
  switch (code) {
    case 'not_found': return tr.inviteErr_not_found;
    case 'used': return tr.inviteErr_used;
    case 'expired': return tr.inviteErr_expired;
    case 'revoked': return tr.inviteErr_revoked;
    default: return tr.inviteErr_generic;
  }
}

/** Accepts a bare code or a full ".../invite/CODE" link. */
export function extractInviteCode(input: string): string {
  const t = input.trim();
  const m = t.match(/\/invite\/([A-Za-z0-9-]+)/);
  return (m ? m[1] : t).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

type RequestState = { status: 'pending' | 'approved' | 'rejected' } | null;

/** Shown to signed-in users without membership: redeem an invite or request access. */
export default function AccessGate() {
  const { user, signOut, refreshMembership } = useAuth();
  const { tr } = useLanguage();
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState<string | null>(null);
  const [request, setRequest] = useState<RequestState>(null);

  // Live status of my own access request (rules allow reading only my own doc).
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(getDb(), 'accessRequests', user.uid),
      s => setRequest(s.exists() ? { status: s.get('status') } : null),
      () => setRequest(null)
    );
  }, [user]);

  const redeem = async () => {
    const c = extractInviteCode(code);
    if (!c) return;
    setCodeBusy(true);
    setCodeErr(null);
    try {
      await apiFetch(`/api/invites/${encodeURIComponent(c)}`, { method: 'POST' });
      await refreshMembership();
    } catch (e) {
      setCodeErr(inviteError(tr, e instanceof ApiError ? e.code : ''));
    } finally {
      setCodeBusy(false);
    }
  };

  const sendRequest = async () => {
    setReqBusy(true);
    setReqErr(null);
    try {
      const r = await apiFetch<{ status: string; emailSent?: boolean; alreadySent?: boolean }>('/api/access/request', { body: { message } });
      if (r.status === 'member') await refreshMembership();
      else if (r.emailSent === false && !r.alreadySent) setReqErr(tr.requestEmailFailed);
    } catch (e) {
      setReqErr(e instanceof ApiError && e.code === 'rejected_recently' ? tr.requestRejected : tr.serverUnavailable);
    } finally {
      setReqBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto border border-[#1e2d45] bg-[#0d1424] p-5 space-y-5 font-mono">
      <div>
        <div className="text-xs text-[#ffaa00] mb-1">◈ {tr.inviteOnlyBadge}</div>
        <div className="text-[#c8d0e0] text-sm font-bold">{tr.inviteOnlyTitle}</div>
        <div className="text-xs text-[#4a6080] mt-1 leading-relaxed">{tr.inviteOnlyText}</div>
      </div>

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-[#4a6080]">{'// '}{tr.haveInvite}</div>
        <form onSubmit={e => { e.preventDefault(); void redeem(); }} className="flex gap-2">
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setCodeErr(null); }}
            placeholder={tr.invitePlaceholder}
            aria-invalid={!!codeErr}
            spellCheck={false}
            autoComplete="off"
            className={`${inputClass} flex-1`}
          />
          <Btn type="submit" variant="primary" disabled={codeBusy || !code.trim()}>{codeBusy ? '…' : tr.redeem}</Btn>
        </form>
        {codeErr && <div className="text-xs text-[#ff3344]" role="alert">{codeErr}</div>}
      </section>

      <section className="space-y-2 border-t border-[#1e2d45] pt-4">
        <div className="text-[10px] uppercase tracking-wider text-[#4a6080]">{'// '}{tr.requestAccess}</div>
        {request?.status === 'pending' ? (
          <div className="text-xs text-[#00ff88] leading-relaxed">✓ {tr.requestPending}</div>
        ) : (
          <>
            {request?.status === 'rejected' && <div className="text-xs text-[#ff3344]">{tr.requestRejected}</div>}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={tr.requestMessagePlaceholder}
              className={inputClass}
            />
            <Btn variant="primary" onClick={sendRequest} disabled={reqBusy}>{reqBusy ? '…' : tr.sendRequest}</Btn>
          </>
        )}
        {reqErr && <div className="text-xs text-[#ffaa00]" role="alert">{reqErr}</div>}
      </section>

      <div className="border-t border-[#1e2d45] pt-3 flex items-center justify-between text-[11px] text-[#4a6080]">
        <span className="truncate">{user?.email}</span>
        <button type="button" onClick={signOut} className="hover:text-[#00b4d8] underline-offset-2 hover:underline">{tr.switchAccount}</button>
      </div>
    </div>
  );
}
