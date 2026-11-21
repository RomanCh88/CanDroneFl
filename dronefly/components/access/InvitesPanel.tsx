'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, ApiError } from '@/lib/api';
import { Panel, Btn, ConfirmDeleteBtn } from '@/components/profile/ui';

interface Invite {
  code: string;
  url: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'used' | 'expired' | 'revoked';
  usedByName: string | null;
}
interface ListResponse { invites: Invite[]; remaining: number; limit: number; resetAt: number | null }

const STATUS_COLOR = { active: '#00ff88', used: '#00b4d8', expired: '#4a6080', revoked: '#4a6080' } as const;

/** Members create single-use 24 h invite links (max 10 per rolling 24 h). */
export default function InvitesPanel() {
  const { lang, tr } = useLanguage();
  const [data, setData] = useState<ListResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<ListResponse>('/api/invites'));
    } catch (e) {
      console.error(e);
      setError(tr.serverUnavailable);
    }
  }, [tr.serverUnavailable]);

  useEffect(() => {
    // Initial fetch from the server (external system).

    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const inv = await apiFetch<{ code: string; url: string }>('/api/invites', { method: 'POST' });
      await load();
      await copy(inv.url, inv.code);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'quota_exceeded' ? tr.quotaExceeded : tr.serverUnavailable);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url: string, code: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000);
    } catch { /* clipboard blocked — the link is visible to copy manually */ }
  };

  const share = async (url: string) => {
    try { await navigator.share({ title: 'DroneFly', text: tr.invitedBy(''), url }); } catch { /* cancelled */ }
  };

  const revoke = async (code: string) => {
    try {
      await apiFetch(`/api/invites/${code}`, { method: 'DELETE' });
      await load();
    } catch {
      setError(tr.inviteErr_generic);
    }
  };

  const fmt = (t: number) => new Date(t).toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const statusLabel = (s: Invite['status']) =>
    s === 'active' ? tr.inviteStatus_active : s === 'used' ? tr.inviteStatus_used : s === 'expired' ? tr.inviteStatus_expired : tr.inviteStatus_revoked;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Panel
      title={tr.invitesTitle}
      action={<Btn variant="primary" onClick={create} disabled={busy || data?.remaining === 0}>{busy ? '…' : tr.createInvite}</Btn>}
    >
      <div className="space-y-3 font-mono">
        <div className="text-[11px] text-[#4a6080] leading-relaxed">{tr.invitesHint}</div>
        {data && (
          <div className="text-xs" style={{ color: data.remaining > 0 ? '#c8d0e0' : '#ffaa00' }}>
            {tr.invitesLeft(data.remaining, data.limit)}
            {data.remaining === 0 && data.resetAt && <span className="text-[#4a6080]"> · {tr.invitesResetAt(fmt(data.resetAt))}</span>}
          </div>
        )}
        {error && <div className="text-xs text-[#ff3344]" role="alert">{error}</div>}

        {data && data.invites.length === 0 && <div className="text-xs text-[#2d4060]">{tr.noInvitesYet}</div>}
        <ul className="divide-y divide-[#1e2d45]">
          {data?.invites.map(inv => (
            <li key={inv.code} className="py-2 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                <div className={`text-xs break-all ${inv.status === 'active' ? 'text-[#c8d0e0]' : 'text-[#4a6080] line-through decoration-[#2d4060]'}`}>{inv.url}</div>
                <div className="text-[10px] text-[#4a6080]">
                  <span style={{ color: STATUS_COLOR[inv.status] }}>● {statusLabel(inv.status)}</span>
                  {inv.status === 'used' && inv.usedByName && <> · {inv.usedByName}</>}
                  {inv.status === 'active' && <> · {tr.inviteValidUntil(fmt(inv.expiresAt))}</>}
                </div>
              </div>
              {inv.status === 'active' && (
                <>
                  <Btn variant={copied === inv.code ? 'primary' : 'ghost'} onClick={() => copy(inv.url, inv.code)}>{copied === inv.code ? `✓ ${tr.copied}` : tr.copy}</Btn>
                  {canShare && <Btn onClick={() => share(inv.url)}>{tr.share}</Btn>}
                  <ConfirmDeleteBtn label={tr.revoke} confirmLabel={tr.confirmDelete} onConfirm={() => revoke(inv.code)} />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
