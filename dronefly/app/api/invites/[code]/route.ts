import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/admin';
import {
  HttpError, handleError, json, normalizeCode, requireMember, requireUser, resolveMembership, tsMillis,
} from '@/lib/server/access';

type Ctx = { params: Promise<{ code: string }> };

/** Public: is this invite usable? (no auth; reveals only the inviter's first name) */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const code = normalizeCode((await params).code);
    if (code.length < 8) return json({ status: 'not_found' });
    const snap = await adminDb().doc(`invites/${code}`).get();
    if (!snap.exists) return json({ status: 'not_found' });
    const d = snap.data()!;
    const expiresAt = tsMillis(d.expiresAt);
    const status = d.revoked ? 'revoked' : d.usedBy ? 'used' : expiresAt <= Date.now() ? 'expired' : 'active';
    return json({ status, expiresAt, inviterName: d.createdByName ?? '' });
  } catch (e) {
    return handleError(e);
  }
}

/** Redeem: the signed-in user becomes a member (single use, before expiry). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const u = await requireUser(req);
    if ((await resolveMembership(u)).member) return json({ member: true, already: true });
    const code = normalizeCode((await params).code);
    const db = adminDb();
    const inviteRef = db.doc(`invites/${code}`);
    const memberRef = db.doc(`members/${u.uid}`);

    await db.runTransaction(async tx => {
      const inv = await tx.get(inviteRef);
      if (!inv.exists) throw new HttpError(404, 'not_found');
      const d = inv.data()!;
      if (d.revoked) throw new HttpError(410, 'revoked');
      if (d.usedBy) throw new HttpError(410, 'used');
      if (tsMillis(d.expiresAt) <= Date.now()) throw new HttpError(410, 'expired');
      tx.update(inviteRef, { usedBy: u.uid, usedByName: u.name.split(' ')[0] || '', usedAt: FieldValue.serverTimestamp() });
      tx.set(memberRef, {
        email: u.email, name: u.name, via: 'invite', invitedBy: d.createdBy, inviteCode: code,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return json({ member: true });
  } catch (e) {
    return handleError(e);
  }
}

/** Revoke one of my unused invites. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const u = await requireMember(req);
    const code = normalizeCode((await params).code);
    const ref = adminDb().doc(`invites/${code}`);
    await adminDb().runTransaction(async tx => {
      const inv = await tx.get(ref);
      if (!inv.exists || inv.get('createdBy') !== u.uid) throw new HttpError(404, 'not_found');
      if (inv.get('usedBy')) throw new HttpError(409, 'used');
      tx.update(ref, { revoked: true });
    });
    return json({ revoked: true });
  } catch (e) {
    return handleError(e);
  }
}
