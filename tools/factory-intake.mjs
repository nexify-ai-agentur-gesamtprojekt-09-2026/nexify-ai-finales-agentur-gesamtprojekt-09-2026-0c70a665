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

async function offenesMrFuer(issue) {
  const mrs = await api('/merge_requests?state=opened&per_page=50');
  return mrs.find((m) => (m.description || '').includes(`factory-issue: ${issue.iid}`));
}

async function intake(issue) {
  // Idempotenz/Resume: laeuft fuer dieses Issue schon ein offenes MR, kein Doppel-Lauf.
  const vorhanden = await offenesMrFuer(issue);
  if (vorhanden) {
    // Resume: Pipeline abwarten; bei gruenem Gate das unterbrochene MR abschliessen.
    let pstatus = (vorhanden.head_pipeline || {}).status || 'none';
    for (let i = 0; i < 40 && ['pending', 'running', 'created', 'none'].includes(pstatus); i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const m = await api(`/merge_requests/${vorhanden.iid}`);
      pstatus = (m.head_pipeline || {}).status || 'none';
    }
    if (pstatus === 'success') {
      try {
        await api(`/merge_requests/${vorhanden.iid}/merge`, { method: 'PUT' });
        await api(`/issues/${issue.iid}`, { method: 'PUT', body: JSON.stringify({ state_event: 'close' }) });
        await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: `Intake (Resume): unterbrochenen Lauf abgeschlossen — MR !${vorhanden.iid} gemerged (Pipeline success).` }) });
        return { issue: issue.iid, status: 'fortgesetzt-gemerged', mr: vorhanden.iid };
      } catch (e) {
        await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: `Intake (Resume): MR !${vorhanden.iid} Pipeline success, Merge blockiert: ${String(e.message).slice(0, 120)}` }) });
        return { issue: issue.iid, status: 'resume-merge-blockiert', mr: vorhanden.iid };
      }
    }
    await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: `Intake: bereits in Bearbeitung — MR !${vorhanden.iid} (${vorhanden.web_url}); Pipeline ${pstatus}; kein neuer Lauf.` }) });
    return { issue: issue.iid, status: 'bereits-in-arbeit', mr: vorhanden.iid };
  }
  const dateien = bloecke(issue.description || '');
  if (!dateien.length) {
    await api(`/issues/${issue.iid}/notes`, { method: 'POST', body: JSON.stringify({ body: 'Intake: keine `file:`-Bloecke im Issue-Body gefunden — kein Factory-Lauf.' }) });
    return { issue: issue.iid, status: 'kein-auftrag' };
  }
  const tmp = mkdtempSync(join(tmpdir(), 'factory-intake-'));
  const argv = ['--task', issue.title, '--issue', String(issue.iid)];
  dateien.forEach((d, i) => { const p = join(tmp, `c${i}`); writeFileSync(p, d.content); argv.push('--file', d.file, '--content-file', p); });
  argv.push('--merge');

  let ergebnis = null, fehler = null, out = '';
  try {
    out = execFileSync('node', [ADAPTER, ...argv], { encoding: 'utf8', timeout: 900000, env: { ...process.env, GITLAB_TOKEN: TOKEN } });
  } catch (e) { out = String(e.stdout || ''); if (!out) fehler = String(e.message || '').slice(0, 400); }
  if (out) { try { ergebnis = JSON.parse(out.slice(out.indexOf('{'))); } catch { /* kein JSON */ } }

  // Automatische Korrektur (§15): bei roter Pipeline eine LLM-Korrektur, dann neu pruefen.
  if (ergebnis && ergebnis.pipeline_status && ergebnis.pipeline_status !== 'success' && ergebnis.mr_iid) {
    try {
      execFileSync('node', [new URL('./factory-korrektur.mjs', import.meta.url).pathname, '--mr', String(ergebnis.mr_iid)], { encoding: 'utf8', timeout: 300000, env: { ...process.env, GITLAB_TOKEN: TOKEN } });
      let pstatus = 'none';
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 10000));
        const m = await api(`/merge_requests/${ergebnis.mr_iid}`);
        pstatus = (m.head_pipeline || {}).status || 'none';
        if (!['pending', 'running', 'created', 'none'].includes(pstatus)) break;
      }
      ergebnis.pipeline_status = pstatus;
      if (pstatus === 'success') {
        try { const m = await api(`/merge_requests/${ergebnis.mr_iid}/merge`, { method: 'PUT' }); ergebnis.merge = m.state; } catch (e2) { ergebnis.merge = 'blockiert: ' + e2.message.slice(0, 100); }
      }
    } catch (e) { fehler = 'Korrektur fehlgeschlagen: ' + String(e.message).slice(0, 200); }
  }

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
  process.exit(res.every(r => ['success', 'kein-auftrag', 'bereits-in-arbeit', 'fortgesetzt-gemerged'].includes(r.status)) ? 0 : 1);
}
main().catch((e) => { console.error('FEHLER:', e.message); process.exit(1); });
