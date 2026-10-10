#!/usr/bin/env node
// Lean GitLab-Factory-Adapter (Masterprompt §14/§15/§28 Phase 3).
//
// Auftrag -> isolierter Branch -> Commit -> Merge Request -> CI-Pipeline -> Ergebnis.
// Der Adapter ist NICHTdestruktiv: kein Force, keine Ref-Loeschung, kein Branch-Delete.
// Er ersetzt vorlaeufig einen externen Factory-Worker (Paperclip/NeX), bis dieser real
// vorhanden ist, und nutzt ausschliesslich die GitLab-API des eigenen Servers.
//
// Aufruf:
//   GITLAB_TOKEN=... node tools/factory-adapter.mjs \
//     --task "Kurztitel" --file docs/beispiel.md --content-file ./beispiel.md [--base main]
//   --content "<text>" als Alternative zu --content-file.
//
// Exit 0 = MR angelegt und MR-Pipeline gruen; 1 = Pipeline nicht gruen/Fehler; 2 = Konfigfehler.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GL = (process.env.GITLAB_URL || 'http://127.0.0.1:8922').replace(/\/$/, '');
const TOKEN = process.env.GITLAB_TOKEN || '';
const PROJECT = process.env.GITLAB_PROJECT_ID || '42';
if (!TOKEN) { console.error('FEHLER: GITLAB_TOKEN fehlt'); process.exit(2); }

function args() {
  const a = { files: [], contentFiles: [] }, v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (!v[i].startsWith('--')) continue;
    const k = v[i].slice(2), val = v[i + 1];
    if (k === 'file') a.files.push(val);
    else if (k === 'content-file') a.contentFiles.push(val);
    else a[k] = val;
  }
  return a;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'task';

async function api(path, opts = {}) {
  // Retry nur auf Netzfehler (fetch wirft), nicht auf 4xx/5xx-Antworten.
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

// Unabhaengiges Review (Maker/Checker-Trennung): der Oracle (nx-jeff/AIfly) bewertet
// die Aenderung. Der Adapter erzeugt, der Oracle bewertet — nie dieselbe Instanz.
function oracleReview(task, file, kontext) {
  try {
    const out = execFileSync('nx-jeff', ['pruefe-aenderung',
      '--was', `Factory-MR: ${task} (Datei ${file})`,
      '--risiko', 'niedrig (isolierter Branch, Merge nur bei gruener Pipeline)',
      '--rollback', 'MR schliessen bzw. Branch verwerfen; main geschuetzt',
      '--kontext', kontext], { encoding: 'utf8', timeout: 90000 });
    return JSON.parse(out.trim());
  } catch (e) {
    return { verfuegbar: false, roh: String(e.stdout || e.message || '').slice(0, 300) };
  }
}

async function note(iid, body) {
  try { await api(`/merge_requests/${iid}/notes`, { method: 'POST', body: JSON.stringify({ body }) }); return true; }
  catch { return false; }
}

async function main() {
  const a = args();
  const task = a.task || 'factory-adapter Selbsttest';
  const base = a.base || 'main';
  // Ein oder mehrere Dateien: --file X --content-file Y (wiederholbar).
  const aenderungen = a.files.length
    ? a.files.map((f, i) => ({ file: f, content: a.contentFiles[i] ? readFileSync(a.contentFiles[i], 'utf8') : (a.content || `# ${task}\n`) }))
    : [{ file: '.factory-e2e-marker', content: a.content || `# ${task}\n\n${new Date().toISOString()}\n` }];
  const branch = `factory/${slug(task)}-${Date.now()}`;

  const baseInfo = await api(`/repository/branches/${encodeURIComponent(base)}`);
  await api('/repository/branches', { method: 'POST', body: JSON.stringify({ branch, ref: baseInfo.commit.id }) });
  // Jede Datei anlegen ODER aktualisieren (upsert): POST, bei "already exists" -> PUT.
  for (const { file, content } of aenderungen) {
    const fileBody = JSON.stringify({ branch, content, commit_message: `factory: ${task} (${file})` });
    try {
      await api(`/repository/files/${encodeURIComponent(file)}`, { method: 'POST', body: fileBody });
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
      await api(`/repository/files/${encodeURIComponent(file)}`, { method: 'PUT', body: fileBody });
    }
  }
  const mr = await api('/merge_requests', {
    method: 'POST',
    body: JSON.stringify({
      source_branch: branch, target_branch: base, title: `factory: ${task}`,
      description: 'Automatisch erstellt durch tools/factory-adapter.mjs (Lean GitLab-Adapter). Nichtdestruktiv: kein Force, keine Ref-Loeschung.',
      remove_source_branch: false,
    }),
  });

  let status = 'none', pipelineId = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const m = await api(`/merge_requests/${mr.iid}`);
    const p = m.pipeline;
    if (p) { status = p.status; pipelineId = p.id; if (!['pending', 'running', 'created'].includes(status)) break; }
  }
  // Automatische Releaseentscheidung (nur bei gruener Pipeline UND --merge gesetzt):
  // Merge-Gate bleibt serverseitig erzwungen (nur bei gruener Pipeline/aufgeloesten Diskussionen).
  let mergeState = 'nicht-angefordert';
  if (a.merge !== undefined && status === 'success') {
    try { const m = await api(`/merge_requests/${mr.iid}/merge`, { method: 'PUT' }); mergeState = m.state; }
    catch (e) { mergeState = 'blockiert: ' + e.message.slice(0, 120); }
  }

  // Unabhaengiges Review + Ergebnisrueckfluss in den MR.
  const review = oracleReview(task, aenderungen.map(x=>x.file).join(', '), `Branch ${branch}, Pipeline ${pipelineId} = ${status}`);
  const reviewZeile = `**Unabhaengiges Review (Oracle):** Entscheidung=\`${review.entscheidung || 'n/a'}\` Konfidenz=${review.konfidenz ?? 'n/a'} Risiko=${review.risiko_0_10 ?? 'n/a'} (verfuegbar=${review.verfuegbar !== false})`;
  if (status === 'success') {
    await note(mr.iid, `CI-Pipeline ${pipelineId} = success.\n\n${reviewZeile}\n\nMerge-Gate: nur bei gruener Pipeline und aufgeloesten Diskussionen.`);
  } else {
    // Korrekturschleife: Fehlerrueckfluss als Aufgabe in den MR.
    await note(mr.iid, `CI-Pipeline ${pipelineId} = ${status}. **Korrektur erforderlich** — Pflichtgate nicht bestanden, Merge blockiert.\n\n${reviewZeile}`);
  }
  console.log(JSON.stringify({ task, branch, files: aenderungen.map(x=>x.file), mr_iid: mr.iid, mr_url: mr.web_url, pipeline_id: pipelineId, pipeline_status: status, merge: mergeState, review: { entscheidung: review.entscheidung, konfidenz: review.konfidenz, risiko: review.risiko_0_10, verfuegbar: review.verfuegbar !== false } }, null, 2));
  process.exit(status === 'success' ? 0 : 1);
}
main().catch((e) => { console.error('FEHLER:', e.message); process.exit(1); });
