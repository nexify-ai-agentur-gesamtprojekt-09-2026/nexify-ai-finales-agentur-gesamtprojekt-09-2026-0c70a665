// NEX-WEB-EN-20261030-01 — verify a UI-chrome EN part against its LIVE DE source.
// Surfaces: 'chat-ui' (apps/web/lib/i18n.ts translations.de) and 'ui-config' (config/i18n.json texte[*].de).
// Proves: exact key coverage, DE present, placeholder/link/email parity, preserved brand terms.
// No runtime locale is touched.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha = s => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const glossary = JSON.parse(readFileSync('i18n-staging/en/glossary.json', 'utf8'));
const protectedTerms = glossary.preserve_verbatim;
const placeholderRe = /\{[a-zA-Z0-9_]+\}|%[sd]|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/g;

const surface = process.argv[2] || 'chat-ui';
const partPath = process.argv[3];

async function deMap() {
  if (surface === 'chat-ui') {
    const m = await import('../../../apps/web/lib/i18n.ts');
    return m.translations.de;
  }
  if (surface === 'ui-config') {
    const j = JSON.parse(readFileSync('config/i18n.json', 'utf8'));
    const out = {};
    for (const k of Object.keys(j.texte)) out[k] = j.texte[k].de;
    return out;
  }
  throw new Error('unknown surface: ' + surface);
}

const de = await deMap();
const part = JSON.parse(readFileSync(partPath, 'utf8'));
const have = Object.keys(part).filter(k => !k.startsWith('_'));
const want = Object.keys(de);
const haveSet = new Set(have), wantSet = new Set(want);
const errors = [];
for (const k of want) if (!haveSet.has(k)) errors.push('missing_en:' + k);
for (const k of have) if (!wantSet.has(k)) errors.push('stray_key:' + k);
for (const k of have) {
  if (!wantSet.has(k)) continue;
  const en = part[k], d = de[k];
  if (typeof en !== 'string' || en.trim().length === 0) { errors.push('empty_en:' + k); continue; }
  const dp = (d.match(placeholderRe) || []).sort();
  const ep = (en.match(placeholderRe) || []).sort();
  if (JSON.stringify(dp) !== JSON.stringify(ep)) errors.push('placeholder_mismatch:' + k + ' de=' + JSON.stringify(dp) + ' en=' + JSON.stringify(ep));
  for (const t of protectedTerms) if (d.includes(t) && !en.includes(t)) errors.push('lost_protected_term:' + t + '@' + k);
}
const result = { surface, part: partPath, wanted: want.length, present: have.length, errors, source_sha256: sha(JSON.stringify(de)) };
console.log(JSON.stringify(result, null, 1));
if (errors.length) process.exitCode = 1;
else console.log('VERIFY_OK: ' + have.length + ' ' + surface + ' fields, key+placeholder+term coverage proven, runtime unchanged.');
