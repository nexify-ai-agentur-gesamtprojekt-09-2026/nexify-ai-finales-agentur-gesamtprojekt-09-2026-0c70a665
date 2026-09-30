#!/usr/bin/env node
// Revolut Merchant-Integration: Zahlungs-Link (Order) + Webhook-Verifikation (idempotent).
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';

function env() {
  const e = {};
  for (const l of readFileSync('/etc/nexifyai/revolut-merchant.env', 'utf8').split('\n')) {
    const x = l.trim();
    if (x && !x.startsWith('#') && x.includes('=')) { const [k, v] = x.split('=', 2); e[k] = v.trim().replace(/^["']|["']$/g, ''); }
  }
  return e;
}
// Zahlungs-Link erzeugen (Order). Betrag in Cent, idempotent via merchant_order_ext_ref.
export async function revolutOrder({ amountCent, currency = 'EUR', referenz, beschreibung }) {
  const E = env();
  const BASE = E.REVOLUT_API_BASE || 'https://sandbox-merchant.revolut.com/api';
  const SECRET = E.REVOLUT_API_SECRET_KEY || E.REVOLUT_SECRET_KEY;
  if (!SECRET) throw new Error('Revolut API-Schlüssel fehlt');
  const body = { amount: amountCent, currency, merchant_order_ext_ref: referenz, description: beschreibung };
  const r = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

// Webhook-Signatur prüfen: v1=HMAC-SHA256(secret, 'v1.' + timestamp + '.' + rawBody)
export function revolutVerifyWebhook(signature, timestamp, rawBody, secret, now = Date.now()) {
  if (!signature || !secret || !/^\d+$/.test(String(timestamp)) || Math.abs(now - Number(timestamp)) > 300_000) return false;
  const expected = createHmac('sha256', secret).update(`v1.${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  return String(signature).split(',').some((part) => {
    const sig = part.trim();
    if (!/^v1=[0-9a-f]{64}$/i.test(sig)) return false;
    return timingSafeEqual(a, Buffer.from(sig.slice(3), 'hex'));
  });
}

// Idempotenz-Regel: Gutschrift erst nach GET /orders/{id} state=completed + passender Referenz/Betrag.
export const REGEL = 'Gutschrift erst nach GET /orders/{id} mit state=completed + passender merchant_order_ext_ref + Betrag + Währung';

// Selbsttest: HMAC-Verifikation deterministisch prüfen
const [, , cmd, ...args] = process.argv;
if (cmd === 'verify') {
  const secret = 'test-secret';
  const ts = '1700000000'; const body = '{"type":"ORDER_COMPLETED"}';
  const good = createHmac('sha256', secret).update(`v1.${ts}.${body}`).digest('hex');
  const ok = revolutVerifyWebhook(`v1=${good}`, ts, body, secret, Number(ts));
  const bad = revolutVerifyWebhook('v1=deadbeef', ts, body, secret, Number(ts));
  console.log(JSON.stringify({ ok, bad, regel: REGEL }));
}
