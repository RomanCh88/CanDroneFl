// SERVER ONLY. Membership, auth checks and signed approval links.
//
// Firestore (written only by the server; rules deny client writes):
//   members/{uid}         { email, name, via: 'invite'|'request'|'legacy'|'admin', invitedBy?, inviteCode?, createdAt }
//   invites/{code}        { createdBy, createdByName, createdAt, expiresAt, usedBy?, usedAt?, revoked? }
//   inviteQuota/{uid}     { stamps: Timestamp[] }   — creation times within the last 24 h (max 10)
//   accessRequests/{uid}  { email, name, message, status: 'pending'|'approved'|'rejected', createdAt, decidedAt? }

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './admin';

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
export const INVITES_PER_DAY = 10;
export const APPROVAL_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function handleError(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.code }, e.status);
  console.error(e);
  return json({ error: 'server_error' }, 500);
}

export interface AuthedUser { uid: string; email: string; name: string }

/** Verify the Firebase ID token from `Authorization: Bearer <token>`. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) throw new HttpError(401, 'unauthenticated');
  try {
    const d = await adminAuth().verifyIdToken(token);
    return { uid: d.uid, email: (d.email ?? '').toLowerCase(), name: (d.name as string | undefined) ?? '' };
  } catch {
    throw new HttpError(401, 'invalid_token');
  }
}

const adminEmail = () => (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();

export async function isMember(uid: string): Promise<boolean> {
  return (await adminDb().doc(`members/${uid}`).get()).exists;
}

/**
 * Membership status, bootstrapping two cases automatically:
 *  - the admin (ADMIN_EMAIL, server-side only)
 *  - legacy users who already had a profile before invites existed (users/{uid} exists)
 */
export async function resolveMembership(u: AuthedUser): Promise<{ member: boolean; via?: string }> {
  const db = adminDb();
  const ref = db.doc(`members/${u.uid}`);
  const snap = await ref.get();
  if (snap.exists) return { member: true, via: snap.get('via') };

  let via: 'admin' | 'legacy' | null = null;
  if (u.email && u.email === adminEmail()) via = 'admin';
  else if ((await db.doc(`users/${u.uid}`).get()).exists) via = 'legacy';
  if (!via) return { member: false };

  await ref.set({ email: u.email, name: u.name, via, createdAt: FieldValue.serverTimestamp() });
  return { member: true, via };
}

export async function requireMember(req: Request): Promise<AuthedUser> {
  const u = await requireUser(req);
  const { member } = await resolveMembership(u);
  if (!member) throw new HttpError(403, 'not_member');
  return u;
}

// ---------------------------------------------------------------------------
// Invite codes: 12 chars from an unambiguous alphabet (no 0/O/1/I/L) ≈ 60 bits.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newInviteCode(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);

export const tsMillis = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : 0);

// ---------------------------------------------------------------------------
// Signed approval links: HMAC-SHA256 over "requestUid.action.expiry" with APPROVAL_SECRET.

export type Decision = 'approve' | 'reject';

function secret(): string {
  const s = process.env.APPROVAL_SECRET ?? '';
  if (s.length < 32) throw new HttpError(500, 'approval_secret_missing');
  return s;
}

export function signDecision(uid: string, action: Decision, exp: number): string {
  return createHmac('sha256', secret()).update(`${uid}.${action}.${exp}`).digest('base64url');
}

export function verifyDecision(uid: string, action: string, exp: number, sig: string): action is Decision {
  if (action !== 'approve' && action !== 'reject') return false;
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  let expected: string;
  try { expected = signDecision(uid, action, exp); } catch { return false; }
  const a = Buffer.from(expected);
  const b = Buffer.from(sig ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Public base URL for links in emails: APP_URL, else the forwarded host of this request. */
export function baseUrl(req: Request): string {
  const env = process.env.APP_URL?.replace(/\/+$/, '');
  if (env) return env;
  const proto = req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

export function decisionLink(base: string, uid: string, action: Decision): string {
  const exp = Date.now() + APPROVAL_LINK_TTL_MS;
  const q = new URLSearchParams({ r: uid, a: action, e: String(exp), s: signDecision(uid, action, exp) });
  return `${base}/access/decide?${q}`;
}

export { adminEmail };
