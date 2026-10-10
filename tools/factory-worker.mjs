#!/usr/bin/env node
// Lean LLM-Factory-Worker (Masterprompt §14/§15/§AP001): natuerlichsprachiger Auftrag -> Datei.
//
// Liest ein GitLab-Issue (Label factory-task) mit natuerlichsprachiger Aufgabe und einer
// Zielangabe `target: <pfad>` im Body. Ruft den Kanon-Router (ai-router.nexifyai.cloud,
// openrouter/deepseek-v4.1-flash) und laesst den vollstaendigen Dateiinhalt erzeugen.
// Danach laeuft der bewaehrte Adapter (Branch -> Commit -> MR -> CI -> Review -> Release).
//
// Aufruf: GITLAB_TOKEN=... node tools/factory-worker.mjs --issue <iid>
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GL = (process.env.GITLAB_URL || 'http://127.0.0.1:8922').replace(/\/$/, '');
const PROJECT = process.env.GITLAB_PROJECT_ID || '42';
const ADAPTER = new URL('./factory-adapter.mjs', import.meta.url).pathname;
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
  try {
    const z = readFileSync('/opt/nexifyai/librechat/.env', 'utf8').split('\n').find((l) => l.startsWith('NEXIFY_API_KEY='));
    return z ? z.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
}
const TOKEN = gitlabToken();
const RKEY = routerKey();
if (!TOKEN) { console.error('FEHLER: kein GitLab-Token'); process.exit(2); }
if (!RKEY) { console.error('FEHLER: kein Router-Key (NEXIFY_API_KEY)'); process.exit(2); }

async function api(path, opts = {}) {
  const url = `${GL}/api/v4/projects/${PROJECT}${path}`;
  let r, e;
  for (let i = 0; i < 3; i++) { try { r = await fetch(url, { method: opts.method || 'GET', headers: { 'PRIVATE-TOKEN': TOKEN, 'Content-Type': 'application/json' }, body: opts.body }); break; } catch (x) { e = x; await new Promise((s) => setTimeout(s, 1500 * (i + 1))); } }
  if (!r) throw e;
  const t = await r.text();
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> HTTP ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

async function erzeuge(target, aufgabe) {
  const prompt = `Du bist ein praeziser Software-Worker. Erzeuge den VOLLSTAENDIGEN Inhalt der Datei "${target}" fuer folgende Aufgabe. Gib AUSSCHLIESSLICH den Dateiinhalt aus, ohne Markdown-Zaun, ohne Erklaerung.\n\nAufgabe:\n${aufgabe}`;
  const r = await fetch(`${ROUTER}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RKEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELL, messages: [{ role: 'user', content: prompt }], max_tokens: 2000, stream: false }),
  });
  if (!r.ok) throw new Error(`Router HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const roh = await r.text();
  let txt = '';
  if (roh.trimStart().startsWith('data:')) {
    // Der Kanon-Router liefert Server-Sent-Events; Deltas zusammensetzen.
    for (const zeile of roh.split('\n')) {
      const z = zeile.trim();
      if (!z.startsWith('data:')) continue;
      const payload = z.slice(5).trim();
      if (payload === '[DONE]') continue;
      try { txt += JSON.parse(payload).choices?.[0]?.delta?.content || ''; } catch { /* Teilzeile */ }
    }
  } else {
    txt = JSON.parse(roh).choices?.[0]?.message?.content || '';
  }
  // Etwaigen Markdown-Zaun entfernen.
  txt = txt.replace(/^\s*```[a-zA-Z]*\n/, '').replace(/\n```\s*$/, '');
  return txt.trim() + '\n';
}

async function main() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) a[v[i].slice(2)] = v[i + 1];
  if (!a.issue) { console.error('FEHLER: --issue <iid> noetig'); process.exit(2); }
  const issue = await api(`/issues/${a.issue}`);
  const m = /^target:\s*(\S+)\s*$/m.exec(issue.description || '');
  if (!m) { console.error('FEHLER: keine "target: <pfad>"-Zeile im Issue'); process.exit(2); }
  const target = m[1];
  const aufgabe = `${issue.title}\n\n${issue.description}`;

  const inhalt = await erzeuge(target, aufgabe);
  const tmp = mkdtempSync(join(tmpdir(), 'factory-worker-'));
  const pfad = join(tmp, 'inhalt');
  writeFileSync(pfad, inhalt);
  await api(`/issues/${a.issue}/notes`, { method: 'POST', body: JSON.stringify({ body: `Worker: Inhalt fuer ${target} via ${MODELL} erzeugt (${inhalt.length} Bytes); Adapter startet.` }) });

  const out = execFileSync('node', [ADAPTER, '--task', issue.title, '--issue', String(a.issue), '--file', target, '--content-file', pfad, '--merge'], { encoding: 'utf8', timeout: 900000, env: { ...process.env, GITLAB_TOKEN: TOKEN } });
  const ergebnis = JSON.parse(out.trim().slice(out.trim().indexOf('{')));
  await api(`/issues/${a.issue}/notes`, { method: 'POST', body: JSON.stringify({ body: `Worker-Ergebnis: MR !${ergebnis.mr_iid} Pipeline ${ergebnis.pipeline_status}; Merge ${ergebnis.merge}; Review ${ergebnis.review?.entscheidung}.` }) });
  console.log(JSON.stringify({ issue: a.issue, target, bytes: inhalt.length, ...ergebnis }, null, 2));
}
main().catch((e) => { console.error('FEHLER:', e.message); process.exit(1); });
