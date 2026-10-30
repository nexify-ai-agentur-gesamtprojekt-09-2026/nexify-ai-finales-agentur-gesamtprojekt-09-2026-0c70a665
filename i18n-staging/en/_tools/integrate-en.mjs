// NEX-WEB-EN-20261030-01 — ATOMIC EN integration into runtime sources.
// Applies verified staging parts into: config/site-map.json, apps/web/lib/i18n.ts, config/i18n.json.
// Reversible via git. Run from repo root with node22.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sha = s => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

// ---- 1) site-map.json ----
const smRaw = readFileSync('config/site-map.json', 'utf8');
const sm = JSON.parse(smRaw);
const pointerParts = ['01-core', '02-leistungen-rahmen', '03-produkte', '04-wissen', '05-recht', '06-auth', '07-teileklar', '08-portal-intern', '09-footer', '12-sitemap-chrome'];
const ptrEn = {};
for (const name of pointerParts) {
  const p = JSON.parse(readFileSync(`i18n-staging/en/parts/${name}.en.json`, 'utf8'));
  for (const k of Object.keys(p)) if (!k.startsWith('_')) ptrEn[k] = p[k];
}
const setAt = (ptr, en) => {
  const keys = ptr.split('/').slice(1);
  let o = sm;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  const leaf = o[keys[keys.length - 1]];
  if (!leaf || typeof leaf !== 'object' || typeof leaf.de !== 'string') throw new Error('not a loc object: ' + ptr);
  if (!(['de','nl','fr'].every(l => typeof leaf[l] === 'string'))) throw new Error('loc missing base locale: ' + ptr);
  leaf.en = en;
};
let count = 0;
for (const ptr of Object.keys(ptrEn)) { setAt(ptr, ptrEn[ptr]); count++; }
if (!sm.locales.includes('en')) sm.locales.push('en');
// verify every loc object now has en (whole-doc)
const isLoc = v => v && typeof v === 'object' && !Array.isArray(v) && ['de','nl','fr'].every(k => typeof v[k] === 'string');
let missingEn = 0;
(function walk(o) { if (isLoc(o)) { if (typeof o.en !== 'string') missingEn++; return; } if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k]); })(sm);
writeFileSync('config/site-map.json', JSON.stringify(sm, null, 2) + '\n');
console.log('site-map: injected en into', count, 'pointers; loc objects still missing en:', missingEn, '; locales=', JSON.stringify(sm.locales));

// ---- 2) config/i18n.json ----
const ciRaw = readFileSync('config/i18n.json', 'utf8');
const ci = JSON.parse(ciRaw);
const uiPart = JSON.parse(readFileSync('i18n-staging/en/parts/11-ui-config.en.json', 'utf8'));
if (!ci.sprachen.includes('en')) ci.sprachen.push('en');
let ciCount = 0;
for (const k of Object.keys(ci.texte)) { if (uiPart[k] == null) throw new Error('missing EN ui-config key: ' + k); ci.texte[k].en = uiPart[k]; ciCount++; }
writeFileSync('config/i18n.json', JSON.stringify(ci, null, 2) + '\n');
console.log('config/i18n.json: injected en into', ciCount, 'texte keys; sprachen=', JSON.stringify(ci.sprachen));

// ---- 3) apps/web/lib/i18n.ts ----
const tsRaw = readFileSync('apps/web/lib/i18n.ts', 'utf8');
const chat = JSON.parse(readFileSync('i18n-staging/en/parts/10-chat-ui.en.json', 'utf8'));
const chatKeys = Object.keys(chat).filter(k => !k.startsWith('_'));
const enBody = chatKeys.map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(chat[k])}`).join(',\n');
const enBlock = `  en: {\n${enBody}\n  }`;
const anchor = '  }\n};';
const idx = tsRaw.indexOf(anchor);
if (idx === -1 || tsRaw.indexOf(anchor) !== tsRaw.lastIndexOf(anchor)) throw new Error('i18n.ts anchor not unique/found');
const tsNew = tsRaw.replace(anchor, `  },\n${enBlock}\n};`);
writeFileSync('apps/web/lib/i18n.ts', tsNew);
console.log('i18n.ts: inserted en block with', chatKeys.length, 'keys');
console.log('DONE_INTEGRATION');
