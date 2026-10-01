#!/usr/bin/env node
// Produkt-Server: /abo (Abo-Loop) + /agent (Agenten-Paket) als HTTP-Endpunkte.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.NX_PROD_PORT || 8910;

createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end('{"status":"ok","dienst":"produkt"}'); }

  // execFile (statt execFileSync) läuft asynchron, damit ein einzelner Request
  // nicht den Event-Loop blockiert und andere eingehende Anfragen verzögert.
  const run = (args) => execFileAsync('node', args, { encoding: 'utf8', cwd: root })
    .then(({ stdout }) => { res.writeHead(200, {'content-type':'application/json'}); res.end(stdout); })
    .catch((e) => { res.writeHead(500, {'content-type':'application/json'}); res.end(JSON.stringify({ fehler: String(e.stderr || e).slice(0, 300) })); });

  if (u.pathname === '/abo' || u.pathname === '/api/abo') {
    const stufe = u.searchParams.get('stufe') || 'one';
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    return run([join(root, 'tools', 'abo.mjs'), stufe, kunde]);
  }
  if (u.pathname === '/kunden-flow' || u.pathname === '/api/kunden-flow') {
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    const sprache = u.searchParams.get('sprache') || 'de';
    return run([join(root, 'tools', 'kunden-journey.mjs'), 'onePlus', kunde, sprache]);
  }
  if (u.pathname === '/support' || u.pathname === '/api/support') {
    const kunde = u.searchParams.get('kunde') || 'kunde@example.com';
    const frage = u.searchParams.get('frage') || 'Frage';
    return run([join(root, 'tools', 'support.mjs'), kunde, frage]);
  }
  if (u.pathname === '/agent' || u.pathname === '/api/agent') {
    const stufe = u.searchParams.get('stufe') || 'one';
    const ziel = u.searchParams.get('ziel') || 'Hallo';
    return run([join(root, 'tools', 'agent.mjs'), stufe, ziel]);
  }
  res.writeHead(404); res.end('404');
}).listen(PORT, () => console.log(`produkt-server auf :${PORT}`));
