#!/usr/bin/env node
// A11y-Audit (WCAG 2.2 AA Heuristik): img alt, html lang, button label, Kontrast-Risiko, Fokus.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROTO = '/opt/ai-stack/design_handoff_nexify_gesamtloesung/prototypen';
const files = readdirSync(PROTO).filter((f) => f.endsWith('.dc.html') || f.endsWith('.html'));
const out = { gesamt: files.length, probleme: {} };

for (const f of files) {
  const t = readFileSync(join(PROTO, f), 'utf8');
  const p = [];
  if (!/<html[^>]*lang=/.test(t)) p.push('kein html lang');
  if (/(<img(?![^>]*\balt=)[^>]*>)/.test(t)) p.push('img ohne alt');
  if (/<button(?![^>]*>.*\S)/.test(t) && /<button[^>]*><\/button>/.test(t)) p.push('leerer button');
  if (/outline:\s*none(?!.*:focus)/.test(t)) p.push('outline:none ohne Ersatz');
  // Kontrast-Risiko: sehr helle Farbe auf hellem Grund (grob)
  if (/#F[0-9A-F]{5}\b/.test(t) && /background:\s*#F[0-9A-F]{5}/i.test(t)) p.push('moeglicher Kontrastmangel (hell auf hell)');
  if (p.length) out.probleme[f] = p;
}

console.log(JSON.stringify(out, null, 2));
const ges = Object.values(out.probleme).reduce((n, a) => n + a.length, 0);
process.stderr.write(`A11y: ${files.length} Seiten, ${ges} Probleme\n`);
