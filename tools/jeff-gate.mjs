#!/usr/bin/env node
// Jeff-Gate: nx-jeff pruefe-aenderung kapseln + Entscheidung nach agentmemory loggen.
// Aufruf: node tools/jeff-gate.mjs --was "..." --risiko "..." --rollback "..."
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').match(/--([a-z-]+)\s+"([^"]*)"|--([a-z-]+)\s+(\S+)/g)
    .map((m) => { const [k, v] = m.slice(2).split(/\s+/); return [k, v.replace(/^"|"$/g, '')]; }),
);

const was = args['--was'] || args.was || '';
const risiko = args['--risiko'] || args.risiko || '';
const rollback = args['--rollback'] || args.rollback || '';
if (!was || !risiko || !rollback) {
  console.error('FEHLER: --was --risiko --rollback erforderlich');
  process.exit(2);
}

let out;
try {
  out = execFileSync('nx-jeff', ['pruefe-aenderung',
    '--was', was, '--risiko', risiko, '--rollback', rollback], { encoding: 'utf8' });
} catch (e) {
  out = String(e.stdout || '') + String(e.stderr || '');
}
console.log(out.trim());

let j = {};
try { j = JSON.parse(out); } catch {}

// Entscheidung nach agentmemory loggen (Audit-Trail), falls Daemon läuft.
const entscheidung = j.entscheidung || 'unbekannt';
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `Jeff-Gate: ${entscheidung} · "${was}" · Risiko ${j.risiko_0_10 ?? '?'}/10 · reversibel ${j.reversibel_p ?? '?'}`,
      project: 'ai-stack',
      concepts: ['jeff-gate', 'orakel', 'governance'],
    }),
  });
} catch {}
