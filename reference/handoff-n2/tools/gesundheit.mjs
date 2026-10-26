#!/usr/bin/env node
// Gesundheits-/Selbstheilungs-Check: vorschau DNS + Services.
// Repariert vorschau-A-Record (DUS, DNS-only) automatisch (korrigiert 29.09.2026:
// alter CNAME->Tunnel f0f2b101 war tot; richtiger Zielzustand = A 179.198.195.91).
import { readFileSync } from 'node:fs';

const CF = 'https://api.cloudflare.com/client/v4';
function cfEnv() {
  const env = {};
  for (const line of readFileSync('/opt/backups/frankfurt/etc/nexifyai/hermes.env', 'utf8').split('\n')) {
    const l = line.trim();
    if (l && !l.startsWith('#') && l.includes('=')) { const [k, v] = l.split('=', 2); env[k] = v.trim().replace(/^["']|["']$/g, ''); }
  }
  return env;
}
const env = cfEnv();
const DNS_TOKEN = env.CLOUDFLARE_DNS_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const DUS_IP = '179.198.195.91';

async function cf(path, opts = {}) {
  const r = await fetch(CF + path, { headers: { 'Authorization': 'Bearer ' + DNS_TOKEN, 'Content-Type': 'application/json' }, method: opts.method || 'GET', body: opts.body });
  return r.json();
}

const out = { zeit: new Date().toISOString(), cname: 'ok', services: {}, selbstheilung: [] };

// 1) DNS vorschau prüfen + ggf. reparieren (Soll: A -> DUS_IP, DNS-only)
const zones = await cf('/zones?name=nexifyai.cloud');
const zone = (zones.result || [{}])[0].id;
const recs = await cf(`/zones/${zone}/dns_records?name=vorschau.nexifyai.cloud`);
const richtig = (recs.result || []).find(x => x.type === 'A' && x.content === DUS_IP);
if (!richtig) {
  for (const x of (recs.result || [])) if (x.id) await cf(`/zones/${zone}/dns_records/${x.id}`, { method: 'DELETE' });
  await cf(`/zones/${zone}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'A', name: 'vorschau.nexifyai.cloud', content: DUS_IP, proxied: false, ttl: 1 }) });
  out.cname = 'repariert';
  out.selbstheilung.push('vorschau A-Record neu gesetzt (DUS, DNS-only)');
}

// 2) Services prüfen
const checks = [
  ['nexify-app', 'http://127.0.0.1:8907/health'],
  ['agentmemory', 'http://127.0.0.1:3111/agentmemory/livez'],
  ['lightrag', 'http://127.0.0.1:9621/health'],
  ['cognee', 'http://127.0.0.1:32869/health'],
  ['orchestrierung', 'http://127.0.0.1:8908/health'],
];
for (const [n, u] of checks) {
  try { const r = await fetch(u, { signal: AbortSignal.timeout(5000) }); out.services[n] = r.status; }
  catch { out.services[n] = 0; }
}

console.log(JSON.stringify(out, null, 2));
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: `Gesundheit: cname=${out.cname}, services=${JSON.stringify(out.services)}`, concepts: ['gesundheit', 'selbstheilung', 'dns'] }) });
} catch {}
