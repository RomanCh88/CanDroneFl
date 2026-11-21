import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/admin';
import {
  HttpError, INVITES_PER_DAY, INVITE_TTL_MS, baseUrl, handleError, json, newInviteCode, requireMember, tsMillis,
} from '@/lib/server/access';

const DAY = 24 * 60 * 60 * 1000;

function inviteStatus(d: FirebaseFirestore.DocumentData, now: number) {
  if (d.revoked) return 'revoked';
  if (d.usedBy) return 'used';
  if (tsMillis(d.expiresAt) <= now) return 'expired';
  return 'active';
}

/** My recent invites + remaining quota. */
export async function GET(req: Request) {
  try {
    const u = await requireMember(req);
    const db = adminDb();
    const now = Date.now();
    // Equality-only query → no composite index needed; sort/trim in memory.
    const [snap, quota] = await Promise.all([
      db.collection('invites').where('createdBy', '==', u.uid).get(),
      db.doc(`inviteQuota/${u.uid}`).get(),
    ]);
    const base = baseUrl(req);
    const invites = snap.docs
      .map(d => ({ code: d.id, ...d.data() }))
      .filter(d => now - tsMillis((d as { createdAt?: unknown }).createdAt) < 7 * DAY)
      .sort((a, b) => tsMillis((b as { createdAt?: unknown }).createdAt) - tsMillis((a as { createdAt?: unknown }).createdAt))
      .slice(0, 30)
      .map(d => {
        const x = d as FirebaseFirestore.DocumentData & { code: string };
        return {
          code: x.code,
          url: `${base}/invite/${x.code}`,
          createdAt: tsMillis(x.createdAt),
          expiresAt: tsMillis(x.expiresAt),
          status: inviteStatus(x, now),
          usedByName: x.usedByName ?? null,
        };
      });
    const stamps = ((quota.get('stamps') as Timestamp[] | undefined) ?? []).map(tsMillis).filter(t => now - t < DAY);
    return json({
      invites,
      remaining: Math.max(0, INVITES_PER_DAY - stamps.length),
      limit: INVITES_PER_DAY,
      resetAt: stamps.length ? Math.min(...stamps) + DAY : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

/** Create an invite (members only, max 10 per rolling 24 h, valid 24 h, single use). */
export async function POST(req: Request) {
  try {
    const u = await requireMember(req);
    const db = adminDb();
    const quotaRef = db.doc(`inviteQuota/${u.uid}`);
    const code = newInviteCode();
    const inviteRef = db.doc(`invites/${code}`);

    const out = await db.runTransaction(async tx => {
      const now = Date.now();
      const q = await tx.get(quotaRef);
      const stamps = ((q.get('stamps') as Timestamp[] | undefined) ?? []).filter(t => now - tsMillis(t) < DAY);
      if (stamps.length >= INVITES_PER_DAY) {
        throw new HttpError(429, 'quota_exceeded');
      }
      const expiresAt = Timestamp.fromMillis(now + INVITE_TTL_MS);
      tx.set(inviteRef, {
        createdBy: u.uid,
        createdByName: u.name.split(' ')[0] || '',
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });
      tx.set(quotaRef, { stamps: [...stamps, Timestamp.fromMillis(now)] });
      return { expiresAt: expiresAt.toMillis(), remaining: INVITES_PER_DAY - stamps.length - 1 };
    });

    return json({ code, url: `${baseUrl(req)}/invite/${code}`, ...out }, 201);
  } catch (e) {
    return handleError(e);
  }
}
