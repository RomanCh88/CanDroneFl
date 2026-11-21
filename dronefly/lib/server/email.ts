// SERVER ONLY. Transactional email via Resend's HTTP API (no SDK needed), sent from the
// project's own domain (EMAIL_FROM, e.g. "DroneFly <noreply@candronefly.org>") once the domain
// is verified in Resend. Returns false (and logs) when not configured, so dev still works.

export interface Mail { to: string; subject: string; html: string; text: string; replyTo?: string }

export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn('[email] RESEND_API_KEY / EMAIL_FROM not set — email not sent:', mail.subject);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    console.error('[email] Resend error', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
