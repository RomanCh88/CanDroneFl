import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/admin';
import {
  HttpError, adminEmail, baseUrl, decisionLink, handleError, json, requireUser, resolveMembership, tsMillis,
} from '@/lib/server/access';
import { escapeHtml, sendEmail } from '@/lib/server/email';

const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

/** A signed-in non-member asks the admin for access; the admin gets an email with approve/reject links. */
export async function POST(req: Request) {
  try {
    const u = await requireUser(req);
    if ((await resolveMembership(u)).member) return json({ status: 'member' });

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? '').trim().slice(0, 500);

    const ref = adminDb().doc(`accessRequests/${u.uid}`);
    const prev = await ref.get();
    if (prev.exists) {
      const status = prev.get('status');
      const created = tsMillis(prev.get('createdAt'));
      const decided = tsMillis(prev.get('decidedAt'));
      if (status === 'pending' && Date.now() - created < RESEND_AFTER_MS) return json({ status: 'pending', alreadySent: true });
      if (status === 'rejected' && Date.now() - decided < RESEND_AFTER_MS) throw new HttpError(429, 'rejected_recently');
    }

    await ref.set({ email: u.email, name: u.name, message, status: 'pending', createdAt: FieldValue.serverTimestamp() });

    const to = adminEmail();
    let emailSent = false;
    if (to) {
      const base = baseUrl(req);
      const approve = decisionLink(base, u.uid, 'approve');
      const reject = decisionLink(base, u.uid, 'reject');
      const who = escapeHtml(u.name || u.email);
      const msg = message ? escapeHtml(message).replace(/\n/g, '<br>') : '<i>—</i>';
      emailSent = await sendEmail({
        to,
        replyTo: u.email || undefined,
        subject: `DroneFly: запит на доступ — ${u.name || u.email}`,
        text: `Запит на доступ / Access request\n\n${u.name}\n${u.email}\n\n${message || '—'}\n\nСхвалити / Approve: ${approve}\nВідхилити / Reject: ${reject}\n\nПосилання дійсні 7 днів.`,
        html: `<div style="font-family:monospace;background:#0a0f1a;color:#c8d0e0;padding:24px">
  <div style="color:#00b4d8;font-weight:bold;letter-spacing:3px">DRONEFLY</div>
  <p style="color:#4a6080">// ЗАПИТ НА ДОСТУП / ACCESS REQUEST</p>
  <p style="font-size:16px;color:#fff"><b>${who}</b><br><span style="color:#c8d0e0">${escapeHtml(u.email)}</span></p>
  <p style="border-left:3px solid #1e2d45;padding-left:12px">${msg}</p>
  <p style="margin:24px 0">
    <a href="${approve}" style="background:#00ff88;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold">✓ СХВАЛИТИ / APPROVE</a>
    &nbsp;
    <a href="${reject}" style="border:1px solid #ff3344;color:#ff3344;padding:9px 18px;text-decoration:none">✕ ВІДХИЛИТИ / REJECT</a>
  </p>
  <p style="color:#4a6080;font-size:12px">Посилання відкриває сторінку підтвердження; дійсне 7 днів. / Opens a confirmation page; valid 7 days.</p>
</div>`,
      });
    } else {
      console.warn('[access] ADMIN_EMAIL not set — request stored without email');
    }
    return json({ status: 'pending', emailSent });
  } catch (e) {
    return handleError(e);
  }
}
