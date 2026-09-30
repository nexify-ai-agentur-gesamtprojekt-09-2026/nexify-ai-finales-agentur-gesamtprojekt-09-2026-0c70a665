#!/usr/bin/env node
// Mail-Versand (SMTP, stdlib net) + Outbox-Verarbeitung. Konfig aus env.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { connect } from 'node:net';

function smtpCfg() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 25),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@nexifyai.cloud',
  };
}

// Minimaler SMTP-Client (ohne TLS; für interne/verschlüsselte Relay-Endpunkte).
export async function sendMail({ to, subject, body, cfg = smtpCfg() }) {
  if (!cfg.host) return { ok: false, grund: 'kein SMTP_HOST konfiguriert' };
  return new Promise((resolve) => {
    const s = connect(cfg.port, cfg.host, () => {
      let step = 0;
      s.on('data', (d) => {
        const txt = d.toString();
        if (step === 0) { s.write(`EHLO nexify\r\n`); step = 1; }
        else if (step === 1) { s.write(`MAIL FROM:<${cfg.from}>\r\n`); step = 2; }
        else if (step === 2) { s.write(`RCPT TO:<${to}>\r\n`); step = 3; }
        else if (step === 3) { s.write('DATA\r\n'); step = 4; }
        else if (step === 4) { s.write(`Subject: ${subject}\r\nFrom: ${cfg.from}\r\nTo: ${to}\r\n\r\n${body}\r\n.\r\n`); step = 5; }
        else if (step === 5) { s.write('QUIT\r\n'); step = 6; }
        else { s.end(); resolve({ ok: true, txt: txt.slice(0, 80) }); }
      });
      s.on('error', (e) => resolve({ ok: false, grund: String(e).slice(0, 80) }));
    });
    s.setTimeout(10000, () => { s.destroy(); resolve({ ok: false, grund: 'Timeout' }); });
  });
}

// CLI: node tools/mail.mjs <to> <subject>
const [, , to = 'kunde@example.com', subject = 'NeXify Bestätigung'] = process.argv;
const r = await sendMail({ to, subject, body: 'Willkommen bei NeXify AI.' });
console.log(JSON.stringify({ to, subject, ...r }));
