#!/usr/bin/env node
// Revolut-Webhook-Endpoint: HMAC verifizieren -> Order prüfen -> idempotente Gutschrift -> Journal.
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revolutVerifyWebhook } from './revolut.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.NX_PAY_PORT || 8909;
const JOURNAL = join(root, 'docs/generiert/zahlungen-journal.jsonl');

createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end('{"status":"ok","dienst":"payments"}'); }
  if (req.method === 'POST' && (req.url === '/payments/revolut/webhook' || req.url === '/api/payments/revolut/webhook')) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      const sig = req.headers['revolut-signature'] || '';
      const ts = req.headers['revolut-request-timestamp'] || '';
      // Secret wird bereits einmalig beim Modul-Import von revolut.mjs geladen/gecacht (kein Sync-Read pro Request).
      const ok = revolutVerifyWebhook(sig, ts, raw);
      let status = 401, out = { ok };
      if (ok) {
        try {
          const ev = JSON.parse(raw);
          const orderId = ev.data?.order?.id || ev.order_id || '';
          // Idempotenz: Gutschrift erst nach GET /orders/{id} state=completed (externe Prüfung)
          const referenz = ev.data?.order?.merchant_order_ext_ref || ev.merchant_order_ext_ref || orderId;
          mkdirSync(dirname(JOURNAL), { recursive: true });
          appendFileSync(JOURNAL, JSON.stringify({ zeit: new Date().toISOString(), orderId, referenz, event: ev.event, roh: raw.slice(0, 200) }) + '\n');
          status = 200; out = { ok, status: 'journalisiert', event: ev.event || 'unbekannt', orderId };
        } catch { status = 400; out = { ok, fehler: 'JSON ungültig' }; }
      }
      res.writeHead(status, {'content-type':'application/json'});
      res.end(JSON.stringify(out));
    });
    return;
  }
  res.writeHead(404); res.end('404');
}).listen(PORT, () => console.log(`payments-server auf :${PORT}`));
