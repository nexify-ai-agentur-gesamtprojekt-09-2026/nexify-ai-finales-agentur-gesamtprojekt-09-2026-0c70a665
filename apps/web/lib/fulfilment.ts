/**
 * Fulfilment-Glue: verbindet die bestehende Rechnungs- (tools/rechnung.mjs) und
 * Mailing-Logik (Resend, wie shop-api/shop/mailer.py) mit dem Chat→Offer→Order-Flow.
 * Reiner Verbindungscode: generiert XRechnung + versendet Bestätigung/Rechnung,
 * schreibt Audit-Ereignisse. Best-effort, nie fehlerauslösend für die Bestellung.
 * Server-only.
 */
import type { OrderDTO } from './chat-contract';
import { invoiceForOrder } from './invoice';
import { mailingConfigured, sendMail } from './mailing';
import { sbInsert, supabaseConfigured } from './supabase-rest';

export interface FulfilmentSummary {
  invoiceNumber: string | null;
  mailed: boolean;
  mailSkipped: boolean;
}

async function event(orderId: string, kind: string, payload: Record<string, unknown>): Promise<void> {
  if (!supabaseConfigured() || orderId.startsWith('local-')) return;
  try {
    await sbInsert('chat_order_events', { order_id: orderId, kind, payload });
  } catch {
    /* Audit-Fehler dürfen die Bestellung nicht kippen. */
  }
}

function euro(cents: number | null): string {
  return cents === null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function confirmationBody(order: OrderDTO, invoiceNumber: string | null): { subject: string; html: string; text: string } {
  const rows = order.items
    .map((it) => `${it.position}. ${it.description} · ${it.quantity}× · ${euro(it.unit_cents)}`)
    .join('\n');
  const subject = `Ihre Bestellung ${order.number} bei NeXify AI`;
  const text = [
    `Guten Tag ${order.customer.name},`,
    '',
    `vielen Dank für Ihre verbindliche Bestellung ${order.number}.`,
    '',
    'Positionen:',
    rows,
    '',
    `Gesamt (netto, Richtpreis): ${euro(order.total_cents)}`,
    invoiceNumber ? `Rechnung: ${invoiceNumber} (XRechnung, im Anhang).` : 'Die Rechnung folgt nach Umfangsklärung.',
    '',
    'NeXify AI · Chat it. Automate it.',
  ].join('\n');
  const html = `<div style="font-family:Inter,system-ui,sans-serif">
<p>Guten Tag ${order.customer.name},</p>
<p>vielen Dank für Ihre verbindliche Bestellung <strong>${order.number}</strong>.</p>
<ul>${order.items.map((it) => `<li>${it.position}. ${it.description} · ${it.quantity}× · ${euro(it.unit_cents)}</li>`).join('')}</ul>
<p><strong>Gesamt (netto, Richtpreis): ${euro(order.total_cents)}</strong></p>
<p>${invoiceNumber ? `Rechnung: ${invoiceNumber} (XRechnung, im Anhang).` : 'Die Rechnung folgt nach Umfangsklärung.'}</p>
<p>NeXify AI · Chat it. Automate it.</p></div>`;
  return { subject, html, text };
}

/** Rechnung erzeugen + Bestätigungs-/Rechnungs-Mail senden. Audit in chat_order_events. */
export async function fulfilOrder(order: OrderDTO): Promise<FulfilmentSummary> {
  let invoiceNumber: string | null = null;
  const invoice = invoiceForOrder(order);
  if (invoice) {
    invoiceNumber = invoice.nr;
    await event(order.id, 'invoice_generated', { nr: invoice.nr, format: 'xrechnung-ubl-2.1', bytes: invoice.xml.length });
  }

  if (!mailingConfigured()) {
    await event(order.id, 'mail_skipped', { reason: 'mailing_not_configured' });
    return { invoiceNumber, mailed: false, mailSkipped: true };
  }

  const { subject, html, text } = confirmationBody(order, invoiceNumber);
  const attachments = invoice
    ? [{ filename: `${invoice.nr}.xml`, content: Buffer.from(invoice.xml, 'utf8').toString('base64') }]
    : undefined;
  const result = await sendMail({ to: order.customer.email, subject, html, text, attachments });
  await event(order.id, result.ok ? 'mail_sent' : 'mail_failed', { id: result.id, error: result.error });
  return { invoiceNumber, mailed: result.ok, mailSkipped: false };
}
