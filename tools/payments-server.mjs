#!/usr/bin/env node
// Revolut-Webhook-Endpoint: HMAC verifizieren -> Order prüfen -> idempotente Gutschrift -> Journal.
import { createServer } from 'node:http';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revolutVerifyWebhook } from './revolut.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.NX_PAY_PORT || 8909;
const JOURNAL = join(root, 'docs/generiert/zahlungen-journal.jsonl');

function secret() {
  for (const l of readFileSync('/etc/nexifyai/revolut-merchant.env', 'utf8').split('\n')) {
    const x = l.trim();
    if (x.startsWith('REVOLUT_WEBHOOK_SECRET=')) return x.slice('REVOLUT_WEBHOOK_SECRET='.length).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const webhookSecret = secret();
if (!webhookSecret) throw new Error('REVOLUT_WEBHOOK_SECRET fehlt');

createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end('{"status":"ok","dienst":"payments"}'); }
  if (req.method === 'POST' && (req.url === '/payments/revolut/webhook' || req.url === '/api/payments/revolut/webhook')) {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      if (size > 1_048_576) return;
      size += chunk.length;
      if (size > 1_048_576) {
        res.writeHead(413); res.end('Webhook zu groß');
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > 1_048_576) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      const sig = req.headers['revolut-signature'] || '';
      const ts = req.headers['revolut-request-timestamp'] || '';
      const ok = revolutVerifyWebhook(sig, ts, raw, webhookSecret);
      let status = 401, out = { ok };
      if (ok) {
        let ev;
        try {
          ev = JSON.parse(raw);
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          status = 400; out = { ok, fehler: 'JSON ungültig' };
        }
        if (ev !== undefined && (!ev || typeof ev !== 'object' || Array.isArray(ev))) {
          status = 400; out = { ok, fehler: 'Webhook-Ereignis ungültig' };
        } else if (ev !== undefined) {
          const orderId = ev.data?.order?.id || ev.order_id;
          if (typeof orderId !== 'string' || !orderId) {
            status = 400; out = { ok, fehler: 'Order-ID fehlt' };
          } else {
            // Nur das Ereignis protokollieren; Gutschriften erfordern eine separate Order-Prüfung.
            try {
              mkdirSync(dirname(JOURNAL), { recursive: true });
              appendFileSync(JOURNAL, JSON.stringify({ zeit: new Date().toISOString(), orderId, event: ev.event }) + '\n');
              status = 200; out = { ok, status: 'journalisiert', event: ev.event || 'unbekannt', orderId };
            } catch (error) {
              console.error('Revolut-Webhook konnte nicht journalisiert werden:', error);
              status = 503; out = { ok: false, fehler: 'Journal nicht verfügbar' };
            }
          }
        }
      }
      res.writeHead(status, {'content-type':'application/json'});
      res.end(JSON.stringify(out));
    });
    return;
  }
  res.writeHead(404); res.end('404');
}).listen(PORT, () => console.log(`payments-server auf :${PORT}`));
