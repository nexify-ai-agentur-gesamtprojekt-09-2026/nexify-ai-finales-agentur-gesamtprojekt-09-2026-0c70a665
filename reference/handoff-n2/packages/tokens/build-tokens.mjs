#!/usr/bin/env node
// NeXify Designsystem 2.0 — Token-Generator.
// Liest config/design-tokens.json (W3C-DTCG) und erzeugt CSS-Variablen,
// eine flache JSON-Karte und eine TypeScript-Konstante.
// Aufruf: node packages/tokens/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = dirname(dirname(__dirname)); // design_handoff_nexify_gesamtloesung
const src = JSON.parse(readFileSync(join(pkg, 'config', 'design-tokens.json'), 'utf8'));

const camelToKebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const isToken = (v) => v && typeof v === 'object' && !Array.isArray(v) && '$value' in v;

// Flache Karte: key ohne $-Felder, Wert = $value oder Blattwert.
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const key = prefix ? `${prefix}-${k}` : k;
    if (isToken(v)) out[key] = v.$value;
    else if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

// Nicht als CSS-Variable sinnvoll: freie Beschreibungstexte der Typo-Skala
// und die reine Bewegungs-Regel. Die übrigen Motion-Werte sind Dauerangaben.
const SKIP_CSS = new Set([
  'type-h1', 'type-h2', 'type-h3', 'type-body', 'type-small', 'type-kicker',
  'motion-regel',
]);

const flat = flatten(src);
const cssVars = [];
for (const [k, v] of Object.entries(flat)) {
  if (SKIP_CSS.has(k)) continue;
  const name = '--' + camelToKebab(k);
  const value = typeof v === 'string' ? v : String(v);
  cssVars.push(`  ${name}: ${value};`);
}

const css = `/* NeXify Designsystem 2.0 — Graphit & Lime\n   Generiert aus config/design-tokens.json. Nicht von Hand ändern. */\n:root {\n${cssVars.join('\n')}\n}\n`;

const ts = `// Generiert aus config/design-tokens.json. Nicht von Hand ändern.\nexport const tokens = ${JSON.stringify(flat, null, 2)} as const;\n`;

const outDir = join(pkg, 'packages', 'tokens');
writeFileSync(join(outDir, 'tokens.css'), css);
writeFileSync(join(outDir, 'tokens.json'), JSON.stringify(flat, null, 2) + '\n');
writeFileSync(join(outDir, 'tokens.ts'), ts);
console.log(`tokens.css: ${cssVars.length} Variablen · tokens.json/tokens.ts erzeugt`);
