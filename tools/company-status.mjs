#!/usr/bin/env node
// Company-Status: konsolidierte Lage aller Company-Repos, Dienste und offenen Blocker.
// Liest ausschliesslich vorhandene, autoritative Quellen (Harness-Audit, Statusdateien,
// Evidenz). Reiner Report; die Gates selbst bleiben in den jeweiligen Repos.
// Aufruf: node tools/company-status.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const AUDIT = '/root/.codex/skills/harness-engineering/scripts/audit-harness.sh';
const REPOS = [
  ['nexi2fyi', '/root/nexi2fyi', 'Backoffice/Portal (Produktion :8080)'],
  ['ainex-studio', '/root/ainex-studio', 'Agent-Studio (:3400)'],
  ['nexify-myadmin', '/root/nexify-myadmin', 'myADMIN Cockpit (:8300)'],
  ['my-tanstack-app', '/root/my-tanstack-app', 'TanStack-Start-Scaffold'],
  ['lv-ai', '/root/lv-ai', 'LV.AI AVA-Copilot'],
  ['dsh-enterprise', '/root/dsh-enterprise', 'DSH-Enterprise Deployment/Release-Gates'],
  ['nexify-gesamt', '/opt/open-design/nexify-gesamt', 'Produktoberflaeche (:4173)'],
  ['design_handoff_nexify_gesamtloesung', '/opt/ai-stack/design_handoff_nexify_gesamtloesung', 'Gesamtloesung/Docs/CI'],
  ['dsh-market-web', '/opt/nex2fly/dsh-market-web', 'Plugin-Markt (:3086)'],
  ['teileklar', '/opt/customers/teileklar', 'Kundenprojekt TEILEKLAR Shop'],
  ['nexify-neu', '/opt/ai-stack/nexify-neu', 'NeXify AI x TEILEKLAR Front-End'],
];
const lies = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

// Git-Zustand je Repo (Bereich C, TEST-C001/C002): Branch, Commit, uncommitted/untracked, Remote, unpushed.
const gitInfo = (dir) => {
  const run = (args) => { try { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
  if (!existsSync(join(dir, '.git'))) return { vorhanden: false, hinweis: 'kein Git-Repo' };
  const branch = run(['rev-parse', '--abbrev-ref', 'HEAD']) || '?';
  const head = run(['rev-parse', '--short', 'HEAD']) || '?';
  const porcelain = run(['status', '--porcelain']) || '';
  const zeilen = porcelain ? porcelain.split('\n').filter(Boolean) : [];
  const dirty = zeilen.length;
  const untracked = zeilen.filter((l) => l.startsWith('??')).length;
  const remote = (run(['remote']) || '').split('\n').filter(Boolean)[0] || 'none';
  let ahead = null;
  try { ahead = Number(run(['rev-list', '--count', '@{u}..HEAD'])); } catch { ahead = null; }
  const hinweise = [];
  if (head === '?') hinweise.push('kein Commit (Baseline fehlt)');
  else if (branch === 'HEAD') hinweise.push('detached HEAD');
  if (remote === 'none') hinweise.push('kein Remote');
  if (Number.isFinite(ahead) && ahead > 0) hinweise.push(ahead + ' unpushed');
  return { vorhanden: true, branch, head, dirty, untracked, remote, ahead, hinweis: hinweise.join('; ') };
};

// Gestoppte Container (Bereich E, TEST-E005): verwaiste (nicht Compose-verwaltete) identifizieren.
const gestoppteContainer = () => {
  try {
    const out = execFileSync('docker', ['ps', '-a', '--filter', 'status=exited', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Labels}}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean).map((l) => {
      const [name, image, status, labels = ''] = l.split('\t');
      return { name, image, status, verwaist: !/com\.docker\.compose\.project=/.test(labels) };
    });
  } catch { return []; }
};

// Dauerbetrieb: systemd-Timer der Company (nexify*/nexi2fyi*) mit enabled/active.
const dauerbetriebTimer = () => {
  let units = [];
  try { units = execFileSync('systemctl', ['list-timers', '--all', '--no-legend', '--no-pager'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).match(/\S+\.timer/g) || []; } catch { return []; }
  units = [...new Set(units)].filter((u) => /(nexify|nexi2fyi)/.test(u)).sort();
  return units.map((u) => {
    const q = (p) => { try { return execFileSync('systemctl', ['show', u, '-p', p, '--value'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return '?'; } };
    return { unit: u, enabled: q('UnitFileState'), active: q('ActiveState') };
  });
};

const repos = [];
for (const [name, dir, zweck] of REPOS) {
  let score = 'n/a';
  try {
    const out = execFileSync('bash', [AUDIT, dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = /Total:\s*(\d+)\s*\/\s*(\d+)/.exec(out.replace(/\u001b\[[0-9;]*m/g, ''));
    if (m) score = `${m[1]}/${m[2]}`;
  } catch { score = 'FEHLER'; }
  repos.push({ name, dir, zweck, harness: score, git: gitInfo(dir) });
}

const dienste = lies('/var/log/nexify-gesundheit-status.json') || {};
const aufgaben = lies('/root/nexi2fyi/evidence/operator-aufgaben.json') || {};
const defekte = lies('/root/nexi2fyi/compliance/defekte.json') || {};
const offeneDefekte = (defekte.defekte || []).filter((x) => x.status === 'offen');
const exposition = lies('evidence/exposure.json') || {};
const rechte = lies('evidence/secret-perms.json') || {};
const historie = lies('evidence/history-secrets.json') || {};
const kennzahlen = lies('/root/nexi2fyi/evidence/abschluss-kennzahlen.json') || null;
const gestoppt = gestoppteContainer();
const timer = dauerbetriebTimer();

const md = [
  '# Company-Status (konsolidiert)', '',
  `Generiert durch \`tools/company-status.mjs\`. Stand: ${new Date().toISOString()}`, '',
  '## Repositories (Harness-Standard)', '',
  '| Repo | Zweck | Harness |', '| --- | --- | --- |',
  ...repos.map((r) => `| \`${r.name}\` | ${r.zweck} | **${r.harness}** |`), '',
  '## Git-Zustand je Repo (Bereich C, TEST-C001/C002)', '',
  '| Repo | Branch | HEAD | dirty | untracked | Remote | Hinweis |', '| --- | --- | --- | --- | --- | --- | --- |',
  ...repos.map((r) => r.git.vorhanden
    ? `| \`${r.name}\` | ${r.git.branch} | ${r.git.head} | ${r.git.dirty} | ${r.git.untracked} | ${r.git.remote} | ${r.git.hinweis || '-'} |`
    : `| \`${r.name}\` | - | - | - | - | - | ${r.git.hinweis} |`), '',
  ...(() => {
    const handlung = repos.filter((r) => !r.git.vorhanden || r.git.hinweis).map((r) => `${r.name} (${!r.git.vorhanden ? 'kein Git-Repo' : r.git.hinweis})`);
    return handlung.length ? [`- Handlungsbedarf (freigabepflichtig): ${handlung.join('; ')}`, ''] : ['- Handlungsbedarf: keiner', ''];
  })(),
  '## Dienste (Gesundheitspruefung)', '',
  dienste.services ? `- Geprueft: ${Object.keys(dienste.services).length} · Ausfaelle: ${(dienste.ausfaelle || []).length === 0 ? 'keine' : dienste.ausfaelle.join(', ')}` : '- keine Statusdatei vorhanden', '',
  '## Offene Blocker (nexi2fyi)', '',
  ...(aufgaben.offen || []).map((b) => `- **${b.id}** — ${b.titel} (\`${b.pruefung}\`) · ${b.anzahl} Einzelpunkte · Punkte: ${(b.punkte || []).join(', ')}`), '',
  '## Offene Defekte', '',
  ...offeneDefekte.map((x) => `- **${x.id}** (${x.schwere}) ${x.titel}${String(x.freigabe_erforderlich || '').toLowerCase().startsWith('ja') ? ' — freigabepflichtig' : ''}`), '',
  '## Abschluss-Kennzahlen (§Z.5)', '',
  ...(kennzahlen
    ? [`- TECHNICAL STATUS: **${kennzahlen.technical_status}** (Stand ${kennzahlen.stand})`, ...Object.entries(kennzahlen.werte).map(([k, v]) => `- ${k}: ${v}`)]
    : ['- keine Kennzahlen-Evidenz (node tools/abschluss-kennzahlen.mjs im nexi2fyi-Repo)']), '',
  '## Netz-Exposition (Betreiber-Entscheidung)', '',
  exposition.oeffentlich !== undefined
    ? `- Oeffentlich veroeffentlichte Container-Ports: **${exposition.oeffentlich}** · ohne DOCKER-USER-Sperre: **${(exposition.offen || []).length}** · Sperre vorhanden: ${exposition.sperre_vorhanden ? 'ja' : 'nein'}\n- Prüfbefehl: \`node tools/exposure-check.mjs\` · Details: \`docs/EXPOSITION.md\``
    : '- keine Evidenz (Prüfung noch nicht ausgeführt)', '',
  '## Geheimnis-Rechte (Konfigurationsdateien)', '',
  rechte.kandidaten !== undefined
    ? `- Weltlesbare Geheimnisdateien: **${rechte.kandidaten}** · ungeschützt: **${(rechte.fehler || []).length}**\n- Prüfbefehl: \`node tools/secret-perms-check.mjs\``
    : '- keine Evidenz (Prüfung noch nicht ausgeführt)', '',
  '## Git-Historie (Geheimnis-Scan)', '',
  historie.befunde !== undefined
    ? `- Repos geprüft: **${historie.repos}** · Treffer: **${(historie.befunde || []).length}** · unbewertet: **${historie.offen}**\n- Prüfbefehl: \`node tools/history-secret-check.mjs\``
    : '- keine Evidenz (Prüfung noch nicht ausgeführt)', '',
  '## Gestoppte Container (Bereich E, TEST-E005)', '',
  ...(gestoppt.length
    ? ['| Container | Image | Status | verwaist |', '| --- | --- | --- | --- |',
       ...gestoppt.map((d) => `| \`${d.name}\` | \`${d.image}\` | ${d.status} | ${d.verwaist ? '**ja**' : 'nein (Compose)'} |`)]
    : ['- keine gestoppten Container']), '',
  '## Dauerbetrieb (systemd-Timer)', '',
  ...(timer.length
    ? ['| Timer | enabled | active |', '| --- | --- | --- |', ...timer.map((t) => `| \`${t.unit}\` | ${t.enabled} | ${t.active} |`)]
    : ['- keine Company-Timer gefunden']), '',
  '## Regel', '',
  'Dieser Report aggregiert nur autoritative Quellen; er ersetzt keine Gate-Pruefung. Rot bleibt rot.',
];
const bericht = { stand: new Date().toISOString(), repos, dienste: { geprueft: dienste.services ? Object.keys(dienste.services).length : 0, ausfaelle: dienste.ausfaelle || [] }, blocker: (aufgaben.offen || []).map((b) => ({ id: b.id, anzahl: b.anzahl, pruefung: b.pruefung })), offeneDefekte: offeneDefekte.map((x) => x.id), gestoppte_container: gestoppt, timer, kennzahlen };
try { mkdirSync('docs', { recursive: true }); writeFileSync('docs/COMPANY-STATUS.md', md.join('\n') + '\n'); mkdirSync('evidence', { recursive: true }); writeFileSync('evidence/company-status.json', JSON.stringify(bericht, null, 2) + '\n'); } catch { /* optional */ }

console.log(`Company-Status: ${repos.length} Repos, ${bericht.dienste.geprueft} Dienste (${bericht.dienste.ausfaelle.length} Ausfaelle), ${bericht.blocker.length} Blocker, ${bericht.offeneDefekte.length} offene Defekte`);
for (const r of repos) console.log(`  ${r.harness.padStart(7)}  ${r.name}`);
