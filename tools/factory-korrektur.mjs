#!/usr/bin/env node
// Lean Korrekturschleife (Masterprompt §15 "automatische Korrektur", §28).
//
// Fuer ein offenes Factory-MR mit roter Pipeline: den fehlgeschlagenen Job-Log und die
// geaenderte Datei holen, den Kanon-Router (openai-kompatibel) eine korrigierte Vollversion
// erzeugen lassen und diese als NEUEN Commit auf denselben Branch schreiben (nichtdestruktiv,
// kein Force). Die Pipeline laeuft daraufhin erneut.
//
// Aufruf: GITLAB_TOKEN=... node tools/factory-korrektur.mjs --mr <iid> [--versuch N]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GL = (process.env.GITLAB_URL || 'http://127.0.0.1:8922').replace(/\/$/, '');
const PROJECT = process.env.GITLAB_PROJECT_ID || '42';
const ROUTER = (process.env.NX_ROUTER_URL || 'https://ai-router.nexifyai.cloud/v1').replace(/\/$/, '');
const MODELL = process.env.NX_WORKER_MODELL || 'openrouter/deepseek-v4.1-flash';

function gitlabToken() {
  if (process.env.GITLAB_TOKEN) return process.env.GITLAB_TOKEN;
  try {
    const bao = readFileSync('/opt/ai-stack/nexify-neu/.dev/openbao/gateway.env', 'utf8').split('\n').find((l) => l.startsWith('OPENBAO_TOKEN='))?.split('=').slice(1).join('=').trim();
    const roh = execFileSync('curl', ['-sS', '-H', `X-Vault-Token: ${bao}`, 'http://127.0.0.1:8200/v1/nexify/data/gitlab', '--max-time', '8'], { encoding: 'utf8' });
    return JSON.parse(roh)?.data?.data?.token || '';
  } catch { return ''; }
}
function routerKey() {
  if (process.env.NEXIFY_API_KEY) return process.env.NEXIFY_API_KEY;
  try { const z = readFileSync('/opt/nexifyai/librechat/.env', 'utf8').split('\n').find((l) => l.startsWith('NEXIFY_API_KEY=')); return z ? z.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : ''; } catch { return ''; }
}
const TOKEN = gitlabToken(), RKEY = routerKey();
if (!TOKEN || !RKEY) { console.error('FEHLER: Token fehlt'); process.exit(2); }

async function api(path, opts = {}, rohText = false) {
  const url = `${GL}/api/v4/projects/${PROJECT}${path}`;
  let r, e;
  for (let i = 0; i < 3; i++) { try { r = await fetch(url, { method: opts.method || 'GET', headers: { 'PRIVATE-TOKEN': TOKEN, 'Content-Type': 'application/json' }, body: opts.body }); break; } catch (x) { e = x; await new Promise((s) => setTimeout(s, 1500 * (i + 1))); } }
  if (!r) throw e;
  const t = await r.text();
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> HTTP ${r.status}: ${t.slice(0, 200)}`);
  return rohText ? t : JSON.parse(t);
}

async function llm(prompt) {
  const r = await fetch(`${ROUTER}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${RKEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODELL, messages: [{ role: 'user', content: prompt }], max_tokens: 2500, stream: false }) });
  if (!r.ok) throw new Error(`Router HTTP ${r.status}`);
  const roh = await r.text();
  let txt = '';
  if (roh.trimStart().startsWith('data:')) { for (const z of roh.split('\n')) { const s = z.trim(); if (!s.startsWith('data:')) continue; const p = s.slice(5).trim(); if (p === '[DONE]') continue; try { txt += JSON.parse(p).choices?.[0]?.delta?.content || ''; } catch {} } }
  else txt = JSON.parse(roh).choices?.[0]?.message?.content || '';
  return txt.replace(/^\s*```[a-zA-Z]*\n/, '').replace(/\n```\s*$/, '').trim() + '\n';
}

async function main() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) a[v[i].slice(2)] = v[i + 1];
  if (!a.mr) { console.error('FEHLER: --mr <iid> noetig'); process.exit(2); }
  const mr = await api(`/merge_requests/${a.mr}`);
  if (mr.state !== 'opened') { console.log(JSON.stringify({ mr: a.mr, status: 'nicht-offen', state: mr.state })); return; }
  const pstatus = (mr.head_pipeline || {}).status;
  if (pstatus === 'success') { console.log(JSON.stringify({ mr: a.mr, status: 'pipeline-gruen' })); return; }
  if (!['failed', 'canceled'].includes(pstatus)) { console.log(JSON.stringify({ mr: a.mr, status: 'keine-korrektur-noetig', pipeline: pstatus })); return; }

  const jobs = await api(`/pipelines/${mr.head_pipeline.id}/jobs?per_page=30`);
  const rot = jobs.find((j) => j.status === 'failed');
  if (!rot) { console.log(JSON.stringify({ mr: a.mr, status: 'kein-roter-job' })); return; }
  const trace = await api(`/jobs/${rot.id}/trace`, {}, true);
  const diff = await api(`/merge_requests/${a.mr}/changes`);
  const datei = (diff.changes || []).find((c) => !c.deleted_file);
  if (!datei) { console.log(JSON.stringify({ mr: a.mr, status: 'keine-datei' })); return; }
  const inhalt = await api(`/repository/files/${encodeURIComponent(datei.new_path)}/raw?ref=${encodeURIComponent(mr.source_branch)}`, {}, true);

  const prompt = `Ein CI-Job ("${rot.name}") ist an der Datei "${datei.new_path}" fehlgeschlagen. Korrigiere den Dateiinhalt.\n\nFehlerauszug:\n${trace.slice(-1500)}\n\nAktueller Dateiinhalt:\n${inhalt.slice(0, 4000)}\n\nGib AUSSCHLIESSLICH die korrigierte Vollversion der Datei aus (kein Markdown-Zaun, keine Erklaerung).`;
  const neu = await llm(prompt);
  await api(`/repository/files/${encodeURIComponent(datei.new_path)}`, { method: 'PUT', body: JSON.stringify({ branch: mr.source_branch, content: neu, commit_message: `fix(factory): automatische Korrektur fuer ${rot.name}` }) });
  await api(`/merge_requests/${a.mr}/notes`, { method: 'POST', body: JSON.stringify({ body: `Korrekturschleife: neuer Commit auf ${mr.source_branch} nach rotem Job "${rot.name}" (${neu.length} Bytes). Pipeline laeuft erneut.` }) });
  console.log(JSON.stringify({ mr: a.mr, status: 'korrektur-committet', datei: datei.new_path, job: rot.name, bytes: neu.length }, null, 2));
}
main().catch((e) => { console.error('FEHLER:', e.message); process.exit(1); });
