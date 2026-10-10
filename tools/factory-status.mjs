#!/usr/bin/env node
// Factory-Status (Masterprompt §26 Observability): aggregiert den realen Zustand des
// Factory-Pfads — offene Factory-MRs, offene factory-task-Issues, letzte main-Pipelines,
// Mirror-Synchronitaet. Schreibt evidence/factory-status.json und meldet Exit 1, wenn ein
// Pflichtsignal rot ist (roter main-Pipeline-Lauf, Mirror divergent, Intake-Fehler).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const GL = (process.env.GITLAB_URL || 'http://127.0.0.1:8922').replace(/\/$/, '');
const PROJECT = process.env.GITLAB_PROJECT_ID || '42';
function token() {
  if (process.env.GITLAB_TOKEN) return process.env.GITLAB_TOKEN;
  try {
    const bao = readFileSync('/opt/ai-stack/nexify-neu/.dev/openbao/gateway.env', 'utf8').split('\n').find((l) => l.startsWith('OPENBAO_TOKEN='))?.split('=').slice(1).join('=').trim();
    const roh = execFileSync('curl', ['-sS', '-H', `X-Vault-Token: ${bao}`, 'http://127.0.0.1:8200/v1/nexify/data/gitlab', '--max-time', '8'], { encoding: 'utf8' });
    return JSON.parse(roh)?.data?.data?.token || '';
  } catch { return ''; }
}
const TOKEN = token();
async function api(path) {
  let r, e;
  for (let i = 0; i < 3; i++) { try { r = await fetch(`${GL}/api/v4/projects/${PROJECT}${path}`, { headers: { 'PRIVATE-TOKEN': TOKEN } }); break; } catch (x) { e = x; await new Promise((s) => setTimeout(s, 1500 * (i + 1))); } }
  if (!r) throw e;
  return JSON.parse(await r.text());
}

const offeneMrs = (await api('/merge_requests?state=opened&per_page=100')).filter((m) => (m.description || '').includes('factory-issue:') || (m.source_branch || '').startsWith('factory/'));
const offeneIssues = await api('/issues?labels=factory-task&state=opened&per_page=100');
const pipelines = (await api('/pipelines?ref=main&per_page=5')).map((p) => ({ id: p.id, sha: p.sha.slice(0, 8), status: p.status }));
let mirror = { status: 'unbekannt' };
try { const z = readFileSync('/var/lib/nex2fly/sync-gesamt.status', 'utf8').trim(); mirror = { status: z.includes('OK:') ? 'ok' : (z.includes('DIVERGENZ') ? 'divergenz' : 'unpruefbar'), roh: z }; } catch {}

const rotMain = pipelines.some((p) => p.status === 'failed');
const ungesund = rotMain || mirror.status === 'divergenz';
const status = {
  zeit: new Date().toISOString(),
  offene_factory_mrs: offeneMrs.map((m) => ({ iid: m.iid, title: m.title, pipeline: (m.head_pipeline || {}).status || null })),
  offene_factory_issues: offeneIssues.map((i) => ({ iid: i.iid, title: i.title })),
  main_pipelines: pipelines,
  mirror,
  gesund: !ungesund,
};
try { writeFileSync(join(root, 'evidence/factory-status.json'), JSON.stringify(status, null, 2) + '\n'); } catch {}
console.log(JSON.stringify(status, null, 2));
process.exit(ungesund ? 1 : 0);
