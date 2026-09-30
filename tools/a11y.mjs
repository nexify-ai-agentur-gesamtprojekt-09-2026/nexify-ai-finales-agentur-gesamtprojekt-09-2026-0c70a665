#!/usr/bin/env node
// A11y-Audit (WCAG 2.2 AA Heuristik): img alt, html lang, button label, Kontrast-Risiko, Fokus.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = fileURLToPath(new URL('../prototypen/', import.meta.url));
const files = readdirSync(PROTO).filter((f) => f.endsWith('.dc.html') || f.endsWith('.html'));
const out = { gesamt: files.length, probleme: {} };

function hexLuminance(value) {
  const raw = value.slice(1);
  const hex = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw;
  if (hex.length !== 6 || !/^[\da-f]{6}$/i.test(hex)) return null;
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

for (const f of files) {
  const t = readFileSync(join(PROTO, f), 'utf8');
  const p = [];
  if (!/<html[^>]*lang=/.test(t)) p.push('kein html lang');
  if (/(<img(?![^>]*\balt=)[^>]*>)/.test(t)) p.push('img ohne alt');
  if (/<button(?![^>]*>.*\S)/.test(t) && /<button[^>]*><\/button>/.test(t)) p.push('leerer button');
  if (/outline:\s*none(?!.*:focus)/.test(t)) p.push('outline:none ohne Ersatz');
  for (const [, style] of t.matchAll(/\bstyle=["']([^"']*)["']/gi)) {
    const declarations = new Map(style.split(';').map((part) => {
      const colon = part.indexOf(':');
      return colon < 0 ? ['', ''] : [part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim()];
    }));
    const foreground = hexLuminance(declarations.get('color') || '');
    const background = hexLuminance(declarations.get('background-color') || declarations.get('background') || '');
    if (foreground === null || background === null) continue;
    const light = Math.max(foreground, background), dark = Math.min(foreground, background);
    if ((light + 0.05) / (dark + 0.05) < 4.5) {
      p.push('moeglicher Kontrastmangel (Text- und Hintergrundfarbe im selben Inline-Stil)');
      break;
    }
  }
  if (p.length) out.probleme[f] = p;
}

console.log(JSON.stringify(out, null, 2));
const ges = Object.values(out.probleme).reduce((n, a) => n + a.length, 0);
process.stderr.write(`A11y: ${files.length} Seiten, ${ges} Probleme\n`);
