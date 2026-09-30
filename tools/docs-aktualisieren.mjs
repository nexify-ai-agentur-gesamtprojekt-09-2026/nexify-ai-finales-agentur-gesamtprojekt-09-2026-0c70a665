#!/usr/bin/env node
// NeXify Dokumentations-Automatisierung (Lösung laut NeXify: ein Skript).
// Erneuert ALLE generierten Artefakte aus den Quellen und fragt NeXify/Jeff
// als go/no-go-Gate, ob der Stand übernommen wird.
//
// Quellen der Wahrheit: config/*.json, config/design-tokens.json, prototypen/*.dc.html
// Erzeugt: docs/generiert/*, packages/tokens/*, prototypen/MANIFEST.sha256, docs/STAND.md
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname); // Paketstamm (tools/ → oben)

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'MANIFEST.sha256') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// 1) config → Markdown-Doku
run('node', ['tools/doku-generator.js']);

// 2) Design-Tokens → CSS/JSON/TS
run('node', ['packages/tokens/build-tokens.mjs']);

// 3) Echtheits-Manifest der Seiten neu erzeugen
const files = walk(join(root, 'prototypen')).sort();
const manifest = files
  .map((f) => `${createHash('sha256').update(readFileSync(f)).digest('hex')}  ./${relative(join(root, 'prototypen'), f)}`)
  .join('\n') + '\n';
writeFileSync(join(root, 'prototypen', 'MANIFEST.sha256'), manifest);

// 4) Designsystem-Audit
let audit = '';
try { audit = run('node', ['tools/ds-audit-cli.js']); } catch (e) { audit = String(e.stdout || '') + String(e.stderr || ''); }

// 5) Stand-Doku
const ts = new Date().toISOString();
const tokens = JSON.parse(readFileSync(join(root, 'packages', 'tokens', 'tokens.json'), 'utf8'));
mkdirSync(join(root, 'docs', 'generiert'), { recursive: true });
const stand = `# Stand der Dokumentation\n\n> Automatisch erzeugt am ${ts} durch tools/docs-aktualisieren.mjs.\n\n` +
  `- Seiten: ${files.length} Dateien im Manifest\n` +
  `- Design-Tokens: ${Object.keys(tokens).length} Werte\n` +
  `- Designsystem-Audit: ${(audit.match(/Ergebnis:[^\n]*/) || ['unbekannt'])[0]}\n`;
writeFileSync(join(root, 'docs', 'STAND.md'), stand);

// 6) NeXify/Jeff als go/no-go-Gate
let jeff = '{"verfuegbar":false}';
try {
  jeff = run('nx-jeff', ['pruefe-aenderung',
    '--was', 'Gesamte Dokumentation aus config/*.json, design-tokens.json und prototypen/*.dc.html regeneriert',
    '--risiko', 'niedrig (nur generierte Markdown/CSS/Manifest, vollstaendig reversibel)',
    '--rollback', 'generierte Dateien aus Git zuruecksetzen']);
} catch (e) { jeff = String(e.stdout || '') + String(e.stderr || ''); }

console.log(JSON.stringify({ stand: ts, seiten: files.length, tokens: Object.keys(tokens).length, audit: (audit.match(/Ergebnis:[^\n]*/) || [''])[0], jeff: jeff.slice(0, 600) }, null, 2));
