// NEX-WEB-EN-20261030-01 — verify an EN translation part against the inventory + live site-map.
// Proves: full pointer coverage for its group(s), DE source-hash binding still valid, JSON valid,
// preserved brand/product terms, preserved placeholders/links. No runtime locale is touched.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const sm=JSON.parse(readFileSync('config/site-map.json','utf8'));
const inv=JSON.parse(readFileSync('i18n-staging/en/inventory.json','utf8'));
const glossary=JSON.parse(readFileSync('i18n-staging/en/glossary.json','utf8'));
const partPath=process.argv[2]||'i18n-staging/en/parts/01-core.en.json';
const groups=(process.argv[3]||'home,leistungen,unternehmen,kontakt').split(',');
const part=JSON.parse(readFileSync(partPath,'utf8'));
const resolve=ptr=>ptr.split('/').slice(1).reduce((o,k)=>o==null?o:o[k],sm);
const protectedTerms=glossary.preserve_verbatim;
const placeholderRe=/\{[a-zA-Z0-9_]+\}|%[sd]|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/g;
const invByPtr=Object.fromEntries(inv.entries.map(e=>[e.pointer,e]));
const want=inv.entries.filter(e=>groups.includes(e.group)).map(e=>e.pointer);
const have=Object.keys(part).filter(k=>!k.startsWith('_'));
const errors=[];
// 1) coverage: every wanted pointer present, no stray pointers
const haveSet=new Set(have);const wantSet=new Set(want);
for(const p of want)if(!haveSet.has(p))errors.push('missing_en:'+p);
for(const p of have)if(!wantSet.has(p))errors.push('stray_pointer:'+p);
// 2) binding + content checks
for(const p of have){
 const en=part[p];const invE=invByPtr[p];
 if(!invE){errors.push('pointer_not_in_inventory:'+p);continue;}
 const liveObj=resolve(p);const liveDe=liveObj&&typeof liveObj==='object'?liveObj.de:liveObj;
 if(typeof liveDe!=='string'){errors.push('pointer_unresolved_in_sitemap:'+p);continue;}
 if(sha(liveDe)!==invE.de_sha256)errors.push('de_source_drift:'+p);
 if(typeof en!=='string'||en.trim().length===0)errors.push('empty_en:'+p);
 // placeholders/links parity (multiset)
 const dp=(liveDe.match(placeholderRe)||[]).sort();const ep=(en.match(placeholderRe)||[]).sort();
 if(JSON.stringify(dp)!==JSON.stringify(ep))errors.push('placeholder_mismatch:'+p+' de='+JSON.stringify(dp)+' en='+JSON.stringify(ep));
 // protected terms: if present in DE, must be present in EN verbatim
 for(const t of protectedTerms)if(liveDe.includes(t)&&!en.includes(t))errors.push('lost_protected_term:'+t+'@'+p);
}
const result={part:partPath,groups,wanted:want.length,present:have.length,errors,
 site_map_sha256_at_inventory:inv.site_map_sha256,site_map_sha256_now:sha(readFileSync('config/site-map.json','utf8'))};
console.log(JSON.stringify(result,null,1));
if(errors.length){process.exitCode=1;}
else console.log('VERIFY_OK: '+have.length+' fields, pointer+hash coverage proven, runtime unchanged.');
