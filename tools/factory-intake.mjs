#!/usr/bin/env node
// Lean Factory-Intake (Masterprompt §14/§28 Phase 3): GitLab-Issue -> Factory-Lauf.
//
// Ein Issue mit Label "factory-task" ist der isolierte Auftrag. Der Issue-Body enthaelt
// mindestens einen Datei-Block:
//
//   ```file:docs/beispiel.md
//   ... Inhalt ...
//   ```
//
// Der Intake ruft fuer jedes Issue den Adapter (tools/factory-adapter.mjs) auf, der
// Branch -> Commit -> MR -> CI -> Review -> (bei --merge) Release faehrt, und schreibt
// das Ergebnis als Kommentar zurueck ins Issue. Bei erfolgreichem Merge wird das Issue
// geschlossen (reversibel, keine Loeschung).
//
// Aufruf: GITLAB_TOKEN=... node tools/factory-intake.mjs --label factory-task
//         GITLAB_TOKEN=... node tools/factory-intake.mjs --issue 5
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GL = (process.env.GITLAB_URL || 'http://127.0.0.1:8922').replace(/\/$/, '');
const PROJECT = process.env.GITLAB_PROJECT_ID || '42';
const ADAPTER = new URL('./factory-adapter.mjs', import.meta.url).pathname;
// Token: aus der Umgebung, sonst aus OpenBao (wie tools/sync-github-gitlab.sh) —
// damit der Intake als systemd-Dienst ohne Klartext-Secret laufen kann.
function openbaoToken() {
  try {
    const gateway = '/opt/ai-stack/nexify-neu/.dev/openbao/gateway.env';
    const bao = readFileSync(gateway, 'utf8').split('\n').find((l) => l.startsWith('OPENBAO_TOKEN='))?.split('=').slice(1).join('=').trim();
    if (!bao) return '';
    const roh = execFileSync('curl', ['-sS', '-H', `X-Vault-Token: ${bao}`, 'http://127.0.0.1:8200/v1/nexify/data/gitlab', '--max-time', '8'], { encoding: 'utf8' });
    return JSON.parse(roh)?.data?.data?.token || '';
  } catch { return ''; }
}
const TOKEN = process.env.GITLAB_TOKEN || openbaoToken();
if (!TOKEN) { console.error('FEHLER: kein GitLab-Token (weder GITLAB_TOKEN noch OpenBao)'); process.exit(2); }

const a = {}; const v = process.argv.slice(2);
for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) a[v[i].slice(2)] = v[i + 1];

async function api(path, opts = {}) {
  const url = `${GL}/api/v4/projects/${PROJECT}${path}`;
  let r, letzterFehler;
  for (let i = 0; i < 3; i++) {
    try { r = await fetch(url, { method: opts.method || 'GET', headers: { 'PRIVATE-TOKEN': TOKEN, 'Content-Type': 'application/json' }, body: opts.body }); break; }
    catch (e) { letzterFehler = e; await new Promise((x) => setTimeout(x, 1500 * (i + 1))); }
  }
  if (!r) throw letzterFehler;
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> HTTP ${r.status}: ${typeof j === 'string' ? j.slice(0, 200) : JSON.stringify(j).slice(0, 200)}`);
  return j;
}

function bloecke(body) {
  const out = []; const re = /```file:([^\n]+)\n([\s\S]*?)```/g; let m;
  while ((m = re.exec(body))) out.push({ file: m[1].trim(), content: m[2] });
  return out;
}

async function intake(issue) {
  const dateien = bloecke(issue.description || '');
  if (!dateien.length) {
    await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: 'Intake: keine `file:`-Bloecke im Issue-Body gefunden — kein Factory-Lauf.' }) });
    return { issue: issue.iid, status: 'kein-auftrag' };
  }
  const tmp = mkdtempSync(join(tmpdir(), 'factory-intake-'));
  const argv = ['--task', issue.title];
  dateien.forEach((d, i) => { const p = join(tmp, `c${i}`); writeFileSync(p, d.content); argv.push('--file', d.file, '--content-file', p); });
  argv.push('--merge');

  let ergebnis = null, fehler = null;
  try {
    const out = execFileSync('node', [ADAPTER, ...argv], { encoding: 'utf8', timeout: 900000, env: { ...process.env, GITLAB_TOKEN: TOKEN } });
    ergebnis = JSON.parse(out.trim().split('\n').slice(out.trim().indexOf('{')).join('\n'));
  } catch (e) { fehler = String(e.stdout || e.message || '').slice(0, 400); }

  if (ergebnis) {
    const zeile = `Factory-Ergebnis: MR !${ergebnis.mr_iid} (${ergebnis.mr_url})\nPipeline ${ergebnis.pipeline_id} = ${ergebnis.pipeline_status}; Merge = ${ergebnis.merge}; Review = ${ergebnis.review?.entscheidung} (Risiko ${ergebnis.review?.risiko}).`;
    await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: zeile }) });
    if (ergebnis.merge === 'merged') await api(`/issues/${issue.iid}`, { method: 'PUT', body: JSON.stringify({ state_event: 'close' }) });
    return { issue: issue.iid, status: ergebnis.pipeline_status, mr: ergebnis.mr_iid, merge: ergebnis.merge };
  }
  await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: `Factory-Fehler: ${fehler}` }) });
  return { issue: issue.iid, status: 'fehler' };
}

async function main() {
  let issues = [];
  if (a.issue) issues = [await api(`/issues/${a.issue}`)];
  else if (a.label) issues = await api(`/issues?labels=${encodeURIComponent(a.label)}&state=opened&per_page=20`);
  else { console.error('FEHLER: --issue <iid> oder --label <label> noetig'); process.exit(2); }
  const res = [];
  for (const it of issues) res.push(await intake(it));
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.every(r => ['success', 'kein-auftrag'].includes(r.status)) ? 0 : 1);
}
main().catch((e) => { console.error('FEHLER:', e.message); process.exit(1); });
