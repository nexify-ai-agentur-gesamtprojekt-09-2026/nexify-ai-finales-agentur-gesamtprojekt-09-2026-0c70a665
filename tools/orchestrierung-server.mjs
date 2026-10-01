#!/usr/bin/env node
// Orchestrierungs-API (Host): POST /auftrag -> voller Loop (auftrag.mjs).
// Grundlage für globalen Rollout im Chat (LibreChat/myADMIN ruft diesen Endpoint).
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.NX_ORCH_PORT || 8908;

createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/auftrag' || req.url === '/api/auftrag-loop')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { typ, ziel } = JSON.parse(body || '{}');
        // execFile (statt execFileSync) läuft asynchron, damit ein einzelner Auftrag
        // nicht den Event-Loop blockiert und andere eingehende Anfragen verzögert.
        const { stdout } = await execFileAsync('node', [join(root, 'tools', 'auftrag.mjs'), 'neu', typ || 'rag', ziel || ''], { encoding: 'utf8', cwd: root });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(stdout);
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ fehler: String(e.stderr || e).slice(0, 300) }));
      }
    });
    return;
  }
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"status":"ok","dienst":"orchestrierung"}'); }
  res.writeHead(404); res.end('404');
}).listen(PORT, () => console.log(`orchestrierung-server auf :${PORT}`));
