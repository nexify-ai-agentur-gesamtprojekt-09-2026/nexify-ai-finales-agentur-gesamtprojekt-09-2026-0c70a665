#!/usr/bin/env node
// Jeff-Backup-Verify (neu): Backup-Frische prüfen -> Jeff bewertet Zustand + Aktion.
import { execFileSync } from 'node:child_process';

let bak = '';
try { bak = execFileSync('bash', ['-c', 'ls -t /opt/nexifyai/backup/nexify/nexify-*.tar.gz 2>/dev/null | head -1'], { encoding: 'utf8' }).trim(); } catch {}
let alter = -1;
if (bak) { try { alter = parseInt(execFileSync('bash', ['-c', `echo $(( ($(date +%s) - $(stat -c %Y "${bak}")) / 86400 ))`], { encoding: 'utf8' }).trim(), 10); } catch {} }

const zustand = !bak ? 'kritisch:kein Backup vorhanden' : alter >= 2 ? `warn:Backup ${alter} Tage alt` : 'ok:Backup frisch';
let j = {};
try {
  const out = execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ zustand, alter, backup: bak?.split('/').pop() || 'keins' }),
    '--choice', 'verdict', 'Backup-Zustand bewerten',
    'ok:frisch, kein Handeln',
    'warn:stale, Backup anstossen',
    'kritisch:fehlend/alt, sofort Backup'], { encoding: 'utf8' }).trim();
  j = JSON.parse(out);
} catch (e) { j = { verfuegbar: false }; }

const out = { zeit: new Date().toISOString(), backup: bak?.split('/').pop() || null, alterTage: alter, zustand, verdict: j.answers?.verdict?.choice || 'ok', p: j.answers?.verdict?.probabilities || {} };
console.log(JSON.stringify(out, null, 2));
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Jeff-Backup: ${out.verdict} · ${out.zustand}`, concepts: ['jeff', 'backup', 'verify', out.verdict] }),
  });
} catch {}
