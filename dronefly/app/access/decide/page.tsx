import type { Metadata } from 'next';
import { adminDb } from '@/lib/server/admin';
import { signDecision, tsMillis, verifyDecision, APPROVAL_LINK_TTL_MS } from '@/lib/server/access';

export const metadata: Metadata = { title: 'Access request — DroneFly', robots: { index: false } };

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

const DONE: Record<string, { uk: string; en: string; color: string }> = {
  approved: { uk: 'Доступ надано', en: 'Access approved', color: '#00ff88' },
  rejected: { uk: 'Запит відхилено', en: 'Request rejected', color: '#ff3344' },
  already_approved: { uk: 'Цей запит уже схвалено', en: 'This request was already approved', color: '#4a6080' },
  already_rejected: { uk: 'Цей запит уже відхилено', en: 'This request was already rejected', color: '#4a6080' },
  missing: { uk: 'Запит не знайдено', en: 'Request not found', color: '#ffaa00' },
  invalid: { uk: 'Посилання недійсне або прострочене', en: 'Link is invalid or expired', color: '#ff3344' },
  error: { uk: 'Помилка сервера, спробуйте ще раз', en: 'Server error, please try again', color: '#ff3344' },
};

/** Fresh signatures for both actions (a valid incoming link already proved it's the admin). */
function signedForms(uid: string) {
  const exp = Date.now() + APPROVAL_LINK_TTL_MS;
  const f = (a: 'approve' | 'reject') => ({ r: uid, a, e: String(exp), s: signDecision(uid, a, exp) });
  return { approve: f('approve'), reject: f('reject') };
}

function DecisionButton({ fields, label, primary, focus }: {
  fields: Record<string, string>; label: string; primary?: boolean; focus?: boolean;
}) {
  return (
    <form method="POST" action="/api/access/decide" className="flex-1">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        autoFocus={focus}
        className={`w-full py-3 text-sm font-bold tracking-wider border ${primary ? 'bg-[#00ff88] border-[#00ff88] text-black' : 'border-[#ff3344] text-[#ff3344]'}`}
      >
        {label}
      </button>
    </form>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0f1a' }}>
      <div className="w-full max-w-lg border border-[#1e2d45] bg-[#0d1424] p-6 font-mono space-y-4">
        <div className="text-[#00b4d8] font-bold tracking-widest">DRONEFLY</div>
        <div className="text-xs text-[#4a6080]">{'// '}ЗАПИТ НА ДОСТУП / ACCESS REQUEST</div>
        {children}
      </div>
    </main>
  );
}

export default async function DecidePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? '';

  const done = one('done');
  if (done) {
    const d = DONE[done] ?? DONE.error;
    return (
      <Shell>
        <div className="text-2xl font-bold" style={{ color: d.color }}>{d.uk}</div>
        <div className="text-sm text-[#c8d0e0]">{d.en}</div>
      </Shell>
    );
  }

  const uid = one('r');
  const action = one('a');
  const exp = Number(one('e'));
  const sig = one('s');
  if (!uid || !verifyDecision(uid, action, exp, sig)) {
    const d = DONE.invalid;
    return <Shell><div className="text-xl font-bold" style={{ color: d.color }}>{d.uk}</div><div className="text-sm text-[#c8d0e0]">{d.en}</div></Shell>;
  }

  const snap = await adminDb().doc(`accessRequests/${uid}`).get();
  if (!snap.exists) {
    const d = DONE.missing;
    return <Shell><div className="text-xl font-bold" style={{ color: d.color }}>{d.uk}</div><div className="text-sm text-[#c8d0e0]">{d.en}</div></Shell>;
  }
  const r = snap.data()!;
  const status = String(r.status);
  const created = tsMillis(r.createdAt);

  // A valid link proves it's the admin, so both buttons are offered (each with its own signature).
  const forms = signedForms(uid);

  return (
    <Shell>
      <div>
        <div className="text-lg text-white font-bold">{r.name || '—'}</div>
        <div className="text-sm text-[#c8d0e0]">{r.email}</div>
        {created > 0 && <div className="text-xs text-[#4a6080] mt-1">{new Date(created).toLocaleString('uk-UA')}</div>}
      </div>
      {r.message && <div className="border-l-2 border-[#1e2d45] pl-3 text-sm text-[#c8d0e0] whitespace-pre-wrap">{r.message}</div>}
      {status !== 'pending' ? (
        <div className="text-sm" style={{ color: status === 'approved' ? '#00ff88' : '#ff3344' }}>
          {status === 'approved' ? DONE.already_approved.uk : DONE.already_rejected.uk} / {status === 'approved' ? DONE.already_approved.en : DONE.already_rejected.en}
        </div>
      ) : (
        <div className="flex gap-2 pt-2">
          <DecisionButton fields={forms.approve} label="✓ СХВАЛИТИ / APPROVE" primary focus={action === 'approve'} />
          <DecisionButton fields={forms.reject} label="✕ ВІДХИЛИТИ / REJECT" focus={action === 'reject'} />
        </div>
      )}
    </Shell>
  );
}
