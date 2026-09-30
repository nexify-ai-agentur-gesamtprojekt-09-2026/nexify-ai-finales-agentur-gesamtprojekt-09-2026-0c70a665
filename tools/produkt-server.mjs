#!/usr/bin/env node
// Produkt-Server: /abo (Abo-Loop) + /agent (Agenten-Paket) als HTTP-Endpunkte.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.NX_PROD_PORT || 8910;

createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end('{"status":"ok","dienst":"produkt"}'); }
  if (u.pathname === '/abo' || u.pathname === '/api/abo') {
    const stufe = u.searchParams.get('stufe') || 'one';
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    const out = execFileSync('node', [join(root, 'tools', 'abo.mjs'), stufe, kunde], { encoding: 'utf8', cwd: root });
    res.writeHead(200, {'content-type':'application/json'}); return res.end(out);
  }
  if (u.pathname === '/kunden-flow' || u.pathname === '/api/kunden-flow') {
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    const sprache = u.searchParams.get('sprache') || 'de';
    const out = execFileSync('node', [join(root, 'tools', 'kunden-journey.mjs'), 'onePlus', kunde, sprache], { encoding: 'utf8', cwd: root });
    res.writeHead(200, {'content-type':'application/json'}); return res.end(out);
  }
  if (u.pathname === '/support' || u.pathname === '/api/support') {
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    const frage = u.searchParams.get('frage') || 'Frage';
    const out = execFileSync('node', [join(root, 'tools', 'support.mjs'), kunde, frage], { encoding: 'utf8', cwd: root });
    res.writeHead(200, {'content-type':'application/json'}); return res.end(out);
  }
  if (u.pathname === '/agent' || u.pathname === '/api/agent') {
    const stufe = u.searchParams.get('stufe') || 'one';
    const ziel = u.searchParams.get('ziel') || 'Hallo';
    const out = execFileSync('node', [join(root, 'tools', 'agent.mjs'), stufe, ziel], { encoding: 'utf8', cwd: root });
    res.writeHead(200, {'content-type':'application/json'}); return res.end(out);
  }
  res.writeHead(404); res.end('404');
}).listen(PORT, () => console.log(`produkt-server auf :${PORT}`));
