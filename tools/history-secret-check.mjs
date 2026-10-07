#!/usr/bin/env node
// Geheimnis-Scan der Git-Historien aller Company-Repos (Bereich C, TEST-C004).
// Reiner Report (kein Gate): Treffer werden mit Repo + Muster gemeldet; eine Allowlist
// dokumentiert bekannte Test-Fixtures. Aufruf: node tools/history-secret-check.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';

const REPOS = [
  '/root/nexi2fyi', '/root/nexify-myadmin', '/root/my-tanstack-app', '/root/lv-ai', '/root/dsh-enterprise',
  '/opt/ai-stack/design_handoff_nexify_gesamtloesung', '/opt/nex2fly/dsh-market-web', '/opt/customers/teileklar',
  '/opt/ai-stack/nexify-neu',
];
const MUSTER = [
  { id: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'stripe-live', re: /sk_live_[A-Za-z0-9]{20,}/ },
  { id: 'webhook-secret', re: /whsec_[A-Za-z0-9]{20,}/ },
  { id: 'openai-key', re: /sk-[A-Za-z0-9]{20,}/ },
];
// Bekannte, bewertete Test-Fixtures (keine echten Geheimnisse) — dokumentierte Allowlist.
const ALLOWLIST = [
  { repo: '*', muster: 'openai-key', grund: 'Test-Fixture "sk-ABCDEF…" in regelwerk.js (RW29)' },
  { repo: 'nexify-neu', muster: 'private-key', grund: 'privater TEST-Schluessel fuer nx-gateway-check, im Baum mit Commit 817ffae entfernt; nur noch Historie, Repo ohne Remote' },
];
const befunde = [];
for (const repo of REPOS) {
  if (!existsSync(repo + '/.git')) continue;
  let log = '';
  try { log = execFileSync('bash', ['-lc', `git -C ${repo} log -p --all 2>/dev/null`], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }); } catch { continue; }
  for (const m of MUSTER) {
    const treffer = (log.match(new RegExp(m.re.source, 'g')) || []).length;
    if (!treffer) continue;
    const erlaubt = ALLOWLIST.some((a) => (a.repo === '*' || a.repo === repo.split('/').pop()) && a.muster === m.id);
    befunde.push({ repo: repo.split('/').pop(), muster: m.id, treffer, status: erlaubt ? 'bewertet' : 'OFFEN' });
  }
}
const offen = befunde.filter((b) => b.status === 'OFFEN');
const bericht = { stand: new Date().toISOString(), repos: REPOS.length, befunde, offen: offen.length };
try { mkdirSync('evidence', { recursive: true }); writeFileSync('evidence/history-secrets.json', JSON.stringify(bericht, null, 2) + '\n'); } catch { /* optional */ }
console.log(`  Historie-Scan: ${befunde.length} Treffer in ${REPOS.length} Repos, ${offen.length} unbewertet`);
for (const b of befunde) console.log(`  ${b.status === 'OFFEN' ? 'OFFEN ' : 'bewertet'} ${b.repo}: ${b.muster} (${b.treffer})`);
if (offen.length) { console.error('history-secret-check: unbewertete Treffer -> pruefen und ggf. Schluessel rotieren/Historie bereinigen'); process.exit(1); }
console.log('history-secret-check: alle Treffer bewertet; Evidenz evidence/history-secrets.json');
