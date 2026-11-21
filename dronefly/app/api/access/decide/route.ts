import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/admin';
import { baseUrl, verifyDecision } from '@/lib/server/access';

/**
 * Apply an approve/reject decision. Called by the confirmation page's form (POST), never by a
 * plain GET — so email link scanners that pre-fetch URLs can't approve anyone by accident.
 * The signed link itself is the authorisation (only the admin receives it).
 */
export async function POST(req: Request) {
  const base = baseUrl(req);
  const back = (q: Record<string, string>) =>
    Response.redirect(`${base}/access/decide?${new URLSearchParams(q)}`, 303);

  const form = await req.formData().catch(() => null);
  const uid = String(form?.get('r') ?? '');
  const action = String(form?.get('a') ?? '');
  const exp = Number(form?.get('e'));
  const sig = String(form?.get('s') ?? '');
  if (!uid || !verifyDecision(uid, action, exp, sig)) return back({ done: 'invalid' });

  const db = adminDb();
  const reqRef = db.doc(`accessRequests/${uid}`);
  const memberRef = db.doc(`members/${uid}`);
  try {
    const result = await db.runTransaction(async tx => {
      const r = await tx.get(reqRef);
      if (!r.exists) return 'missing';
      const status = r.get('status');
      if (status !== 'pending') return `already_${status}`;
      tx.update(reqRef, { status: action === 'approve' ? 'approved' : 'rejected', decidedAt: FieldValue.serverTimestamp() });
      if (action === 'approve') {
        const m = await tx.get(memberRef);
        if (!m.exists) {
          tx.set(memberRef, { email: r.get('email') ?? '', name: r.get('name') ?? '', via: 'request', createdAt: FieldValue.serverTimestamp() });
        }
      }
      return action === 'approve' ? 'approved' : 'rejected';
    });
    return back({ done: result });
  } catch (e) {
    console.error(e);
    return back({ done: 'error' });
  }
}
