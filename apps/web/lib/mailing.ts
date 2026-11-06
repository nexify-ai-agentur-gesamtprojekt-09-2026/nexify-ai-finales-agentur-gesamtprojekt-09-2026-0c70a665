/**
 * Mailing-Glue: nutzt denselben Resend-Mechanismus wie das bestehende
 * shop-api/shop/mailer.py (Resend REST), Schlüssel aus ENV — nicht erfunden.
 * Server-only, keine npm-Abhängigkeit (nur fetch).
 *
 * ENV:
 *   RESEND_API_KEY        Resend-API-Key (Pflicht für echten Versand)
 *   RESEND_FROM           vollständiger Absender "NeXify AI <mail@nexifyai.cloud>"
 *   RESEND_FROM_ADDRESS   Fallback-Adresse, wenn RESEND_FROM nur die Adresse ist
 *
 * Hinweis: Das ältere tools/mail.mjs (SMTP) wird bewusst NICHT importiert — es
 * führt beim Import Top-Level-Code aus (argv + Versand). Es bliebe als SMTP-
 * Transport nutzbar, sobald sein CLI-Teil hinter eine import.meta-Guard gelegt ist.
 */

export interface MailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export function mailingConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && (process.env.RESEND_FROM || process.env.RESEND_FROM_ADDRESS));
}

function sender(): string {
  const full = (process.env.RESEND_FROM || '').trim();
  if (full.includes('<')) return full;
  const address = (process.env.RESEND_FROM_ADDRESS || full).trim();
  return address ? `NeXify AI <${address}>` : '';
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
  attachments?: { filename: string; content: string }[]; // content = base64
}

/** Versendet eine Mail über Resend. Ohne Konfiguration: skipped (kein Fehler). */
export async function sendMail(mail: MailInput): Promise<MailResult> {
  if (!mailingConfigured()) return { ok: false, skipped: true };
  const from = sender();
  if (!from) return { ok: false, skipped: true };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.reply_to ? { reply_to: mail.reply_to } : {}),
        ...(mail.attachments ? { attachments: mail.attachments } : {}),
      }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: body.message || `resend_${res.status}` };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'mail_failed' };
  }
}
