#!/usr/bin/env node
// NeXify AI Reviewer (CodeRabbit-Muster): statische Analyse + Slop-Erkennung.
// Findet Bugs (shellcheck), KI-Schwurbel/Platzhalter, meldet strukturiert, legt in agentmemory ab.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SKRIPT_DIRS = ['/opt/nexifyai/scripts', join(root, 'tools')];
const SLOP = [
  [/TODO|FIXME|XXX\b/i, 'offener Platzhalter/TODO'],
  [/lorem ipsum/i, 'Lorem-Ipsum-Platzhalter'],
  [/as an (AI|artificial intelligence)/i, 'KI-Fuellphrase'],
  [/placeholder|dummy|stub/i, 'Platzhalter/Stub'],
  [/\b(console\.log|print)\([^)]*\b(debug|DEBUG)\b/i, 'Debug-Ausgabe'],
];

const findings = [];
for (const dir of SKRIPT_DIRS) {
  if (!existsSync(dir)) continue;
  const files = execFileSync('find', [dir, '-maxdepth', '2', '-type', 'f', '(', '-name', '*.sh', '-o', '-name', '*.mjs', ')']).toString().trim().split('\n').filter(Boolean).filter((f) => !f.endsWith('review.mjs'));
  // Jede Datei wird unabhängig geprüft (shellcheck-Subprozess + Slop-Scan); parallel
  // statt sequenziell spart bei vielen Dateien die Summe aller Shellcheck-Prozessstarts.
  const dateiBefunde = await Promise.all(files.map(async (f) => {
    const lokal = [];
    // shellcheck nur für bash
    if (f.endsWith('.sh')) {
      try {
        const { stdout } = await execFileAsync('shellcheck', ['-S', 'warning', '-f', 'gcc', f], { encoding: 'utf8' });
        const sc = stdout.trim();
        if (sc) for (const l of sc.split('\n').slice(0, 20)) lokal.push({ typ: 'bug', datei: f, meldung: l });
      } catch (e) { if (e.stdout) for (const l of String(e.stdout).trim().split('\n').slice(0, 20)) lokal.push({ typ: 'bug', datei: f, meldung: l }); }
    }
    // Slop-Erkennung (nur erste 8 KB lesen)
    let src = '';
    try { src = readFileSync(f, 'utf8').slice(0, 8192); } catch {}
    for (const [re, label] of SLOP) if (re.test(src)) lokal.push({ typ: 'slop', datei: f, meldung: label });
    return lokal;
  }));
  findings.push(...dateiBefunde.flat());
}

const out = { zeit: new Date().toISOString(), anzahl: findings.length, findings: findings.slice(0, 80) };
console.log(JSON.stringify(out, null, 2));
// Learnings-Muster: Befunde ins agentmemory (nur wenn welche existieren)
if (findings.length) {
  try {
    await fetch('http://127.0.0.1:3111/agentmemory/remember', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: `Reviewer: ${findings.length} Befunde (${findings.filter(f => f.typ === 'bug').length} bug, ${findings.filter(f => f.typ === 'slop').length} slop). Top: ${findings.slice(0, 3).map(f => f.datei.split('/').pop() + ':' + f.meldung).join(' | ')}`, concepts: ['reviewer', 'bug', 'slop', 'code-review'] }),
    });
  } catch {}
  // Jeff-Security-Triage (neu): Befunde nach Dringlichkeit klassifizieren
  try { execFileSync('node', ['tools/jeff-triage.mjs', `Reviewer: ${findings.length} Befunde`], { stdio: 'ignore' }); } catch {}
}
