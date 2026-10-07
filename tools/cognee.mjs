#!/usr/bin/env node
// Cognee-Integration (dritte RAG-Quelle): Login + add + cognify + search.
import { execFileSync } from 'node:child_process';

// Host-Port dynamisch aus Docker lesen (Compose vergibt einen dynamischen Port; 33018 war der letzte beobachtete).
function cogneePort() {
  try {
    const out = execFileSync('docker', ['inspect', 'cognee-x532-cognee-1'], { encoding: 'utf8' });
    const p = JSON.parse(out)[0]?.NetworkSettings?.Ports?.['8000/tcp'];
    if (p && p[0]?.HostPort) return p[0].HostPort;
  } catch {}
  return '33018';
}
const BASE = `http://127.0.0.1:${cogneePort()}`;

function containerEnv(key) {
  const out = execFileSync('docker', ['inspect', 'cognee-x532-cognee-1'], { encoding: 'utf8' });
  const env = JSON.parse(out)[0].Config.Env;
  for (const e of env) if (e.startsWith(key + '=')) return e.split('=', 2)[1];
  return '';
}

async function login() {
  const email = containerEnv('DEFAULT_USER_EMAIL');
  const pw = containerEnv('DEFAULT_USER_PASSWORD');
  const body = new URLSearchParams({ grant_type: 'password', username: email, password: pw, scope: '' });
  const r = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const d = await r.json();
  return d.access_token || d.token || '';
}

export async function cogneeAdd(rawData, datasetName = 'nexify-designsystem') {
  const tok = await login();
  // add erwartet multipart/form-data, nicht JSON
  const fd = new FormData();
  fd.append('datasetName', datasetName);
  for (const r of rawData) fd.append('raw_data', r);
  const r = await fetch(`${BASE}/api/v1/add`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
  return r.json();
}

export async function cogneeSearch(query) {
  const tok = await login();
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(`${BASE}/api/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ query, searchType: 'CHUNKS' }), signal: ctl.signal });
    return r.json();
  } finally { clearTimeout(t); }
}

// Direktaufruf: node tools/cognee.mjs add "text" | search "frage"
const [, , cmd, arg] = process.argv;
if (cmd === 'add' && arg) { const r = await cogneeAdd([arg]); console.log(JSON.stringify(r).slice(0, 500)); }
else if (cmd === 'search' && arg) { const r = await cogneeSearch(arg); console.log(JSON.stringify(r).slice(0, 500)); }
else { const tok = await login(); console.log('cognee login token_len:', tok.length); }
