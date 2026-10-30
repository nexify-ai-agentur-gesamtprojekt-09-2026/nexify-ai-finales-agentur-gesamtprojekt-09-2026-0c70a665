// NEX-WEB-EN-20261030-01 — build the FULL localized-field inventory of config/site-map.json.
// Emits one entry per localized field: JSON-pointer, group, the DE source text and its sha256.
// This is build-preparation only; it does not touch runtime locales or any shipped file.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const sm=JSON.parse(readFileSync('config/site-map.json','utf8'));
const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const isLoc=v=>v&&typeof v==='object'&&!Array.isArray(v)&&['de','nl','fr'].every(k=>typeof v[k]==='string');
const pathToId={};sm.pages.forEach((p,i)=>pathToId[i]=p.id);
function groupOf(pageId){const p=sm.pages.find(x=>x.id===pageId);const path=p?p.path:'';
 if(path==='/')return'home';
 if(path.startsWith('/leistungen'))return'leistungen';
 if(['/leistungsumfang','/loesungen','/preise-ablauf'].includes(path))return'leistungen-rahmen';
 if(path==='/unternehmen')return'unternehmen';
 if(path==='/kontakt')return'kontakt';
 if(path.startsWith('/produkte'))return'produkte';
 if(path.startsWith('/wissen'))return'wissen';
 if(path.startsWith('/teileklar'))return'teileklar';
 if(path.startsWith('/portal')||path.startsWith('/intern'))return'portal-intern';
 if(['/impressum','/datenschutz','/vertragsgrundlagen','/ki-hinweise','/barrierefreiheit','/cookies'].includes(path))return'recht';
 if(['/anmelden','/registrieren'].includes(path))return'auth';
 return'sonstige';}
const entries=[];
function walk(o,ptr,pageIdx){
 if(isLoc(o)){const pageId=pageIdx!=null?pathToId[pageIdx]:null;
  entries.push({pointer:ptr,page:pageId,group:pageId?groupOf(pageId):'footer',de:o.de,de_sha256:sha(o.de)});return;}
 if(Array.isArray(o)){o.forEach((v,i)=>walk(v,ptr+'/'+i,pageIdx));}
 else if(o&&typeof o==='object'){for(const k of Object.keys(o))walk(o[k],ptr+'/'+k,pageIdx);}
}
sm.pages.forEach((p,i)=>walk(p,'/pages/'+i,i));
walk(sm.footer,'/footer',null);
mkdirSync('i18n-staging/en',{recursive:true});
const byGroup={};entries.forEach(e=>{byGroup[e.group]=(byGroup[e.group]||0)+1;});
const out={order:'NEX-WEB-EN-20261030-01',purpose:'build-preparation field inventory, not shipped, runtime locales unchanged',
 site_map_sha256:sha(readFileSync('config/site-map.json','utf8')),generated_from:'config/site-map.json',
 total_fields:entries.length,by_group:byGroup,entries};
writeFileSync('i18n-staging/en/inventory.json',JSON.stringify(out,null,1));
console.log('inventory fields:',entries.length,'| groups:',JSON.stringify(byGroup));
