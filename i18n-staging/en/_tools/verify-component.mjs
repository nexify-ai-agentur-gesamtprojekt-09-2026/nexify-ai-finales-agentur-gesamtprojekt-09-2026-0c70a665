// NEX-EN-COMPONENT-STAGING-20261030-03 — verify an EN component fragment (build-prep, NOT shipped).
// Proves: (1) the bound source file is unchanged (sha256 == _de_sha256), (2) the EN dict covers
// EXACTLY the recorded German key set (_keys), (3) no leaf value is empty.
// Runtime is never touched. Usage: node verify-component.mjs <fragment.en.json>
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const sha = buf => createHash('sha256').update(buf).digest('hex');
const path = process.argv[2];
const frag = JSON.parse(readFileSync(path, 'utf8'));
const errors = [];

// (1) source binding
let actual = null;
try { actual = sha(readFileSync(frag._file)); } catch (e) { errors.push('source_missing:' + frag._file); }
if (actual && actual !== frag._de_sha256) errors.push('source_drift:' + frag._file + ' now=' + actual);

// (2) key completeness (top-level keys of the EN dict vs recorded _keys)
const en = frag.en || {};
const haveKeys = Object.keys(en);
const wantKeys = frag._keys || [];
const haveSet = new Set(haveKeys), wantSet = new Set(wantKeys);
for (const k of wantKeys) if (!haveSet.has(k)) errors.push('missing_key:' + k);
for (const k of haveKeys) if (!wantSet.has(k)) errors.push('stray_key:' + k);

// (3) non-empty leaves (recurse through strings / arrays / objects)
const nonEmpty = (v, kp) => {
  if (typeof v === 'string') { if (!v.trim()) errors.push('empty:' + kp); return; }
  if (Array.isArray(v)) { if (v.length === 0) errors.push('empty_array:' + kp); v.forEach((x, i) => nonEmpty(x, kp + '/' + i)); return; }
  if (v && typeof v === 'object') { const ks = Object.keys(v); if (!ks.length) errors.push('empty_obj:' + kp); ks.forEach(k => nonEmpty(v[k], kp + '/' + k)); return; }
  errors.push('bad_leaf:' + kp);
};
for (const k of haveKeys) nonEmpty(en[k], k);

const out = { fragment: path, file: frag._file, keys: wantKeys.length, present: haveKeys.length, source_sha256: frag._de_sha256, source_bound_ok: actual === frag._de_sha256, errors };
console.log(JSON.stringify(out, null, 1));
if (errors.length) process.exitCode = 1;
else console.log('VERIFY_OK: ' + haveKeys.length + ' keys, source-bound, complete, non-empty — runtime unchanged.');
