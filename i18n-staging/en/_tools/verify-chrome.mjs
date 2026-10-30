// NEX-WEB-EN-20261030-01 — verify the site-map CHROME part covers EXACTLY the localized
// objects that live OUTSIDE the 483-field page/footer inventory (site_contexts/inter_site_links/
// customer_portal_entry). Proves full gap coverage, DE binding, placeholder/term parity.
// No runtime locale is touched.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha = s => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const sm = JSON.parse(readFileSync('config/site-map.json', 'utf8'));
const inv = JSON.parse(readFileSync('i18n-staging/en/inventory.json', 'utf8'));
const glossary = JSON.parse(readFileSync('i18n-staging/en/glossary.json', 'utf8'));
const protectedTerms = glossary.preserve_verbatim;
const placeholderRe = /\{[a-zA-Z0-9_]+\}|%[sd]|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/g;
const partPath = process.argv[2] || 'i18n-staging/en/parts/12-sitemap-chrome.en.json';
const part = JSON.parse(readFileSync(partPath, 'utf8'));

const isLoc = v => v && typeof v === 'object' && !Array.isArray(v) && ['de', 'nl', 'fr'].every(k => typeof v[k] === 'string');
const all = [];
(function walk(o, ptr) {
  if (isLoc(o)) { all.push(ptr); return; }
  if (Array.isArray(o)) o.forEach((v, i) => walk(v, ptr + '/' + i));
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], ptr + '/' + k);
})(sm, '');
const invPtrs = new Set(inv.entries.map(e => e.pointer));
const want = all.filter(p => !invPtrs.has(p)); // the gap set
const have = Object.keys(part).filter(k => !k.startsWith('_'));
const haveSet = new Set(have), wantSet = new Set(want);
const resolve = ptr => ptr.split('/').slice(1).reduce((o, k) => (o == null ? o : o[k]), sm);
const errors = [];
for (const p of want) if (!haveSet.has(p)) errors.push('missing_en:' + p);
for (const p of have) if (!wantSet.has(p)) errors.push('stray_pointer:' + p);
for (const p of have) {
  if (!wantSet.has(p)) continue;
  const obj = resolve(p); const d = obj && typeof obj === 'object' ? obj.de : obj;
  const en = part[p];
  if (typeof d !== 'string') { errors.push('pointer_unresolved:' + p); continue; }
  if (typeof en !== 'string' || !en.trim()) { errors.push('empty_en:' + p); continue; }
  const dp = (d.match(placeholderRe) || []).sort(), ep = (en.match(placeholderRe) || []).sort();
  if (JSON.stringify(dp) !== JSON.stringify(ep)) errors.push('placeholder_mismatch:' + p);
  for (const t of protectedTerms) if (d.includes(t) && !en.includes(t)) errors.push('lost_protected_term:' + t + '@' + p);
}
console.log(JSON.stringify({ part: partPath, wanted: want.length, present: have.length, errors }, null, 1));
if (errors.length) process.exitCode = 1;
else console.log('VERIFY_OK: ' + have.length + ' site-map chrome fields (gap outside inventory) proven, runtime unchanged.');
