// Broad public-site audit: every public page × 320/390/820/1280/1920 (de) + nl/fr/en at 390.
// Measures overflow, single h1, accessible names, target size (<24px, inline sentence links exempt
// per WCAG 2.5.8), images without alt, duplicate ids, broken internal links, meta description, lang
// runtime errors and spacing: rounded painted panels must not touch the viewport edge and their text
// must keep at least 10px from the panel edge (owner feedback 04.11.2026: missing outer margins).
// and runtime errors. Learned false-positive rules: innerText is empty for content-visibility:auto
// and closed menus, so names use textContent and only checkVisibility()-visible elements count.
// Run after "vite build --mode public-pwa": PLAYWRIGHT_MODULE=... node tests/browser-broad-audit.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {preview} from 'vite';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root=repo+'apps/site/';
const server=await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:false}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
{const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const routes=new Set(data.pages.map(p=>p.path));const b=await chromium.launch();const findings=[];
const runs=[];for(const w of [320,390,820,1280,1920])runs.push({w,l:'de'});for(const l of ['nl','fr','en'])runs.push({w:390,l});
for(const run of runs){const c=await b.newContext({viewport:{width:run.w,height:900},reducedMotion:'reduce'});
await c.addInitScript(l=>{try{localStorage.setItem('nexify-locale',l)}catch(e){}},run.l);
await c.route('**/api/**',r=>r.fulfill({status:503,json:{error:'catalog_not_configured'}}));
const p=await c.newPage();let errs=[];p.on('pageerror',e=>errs.push('pageerror:'+e.message.slice(0,120)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|503/.test(m.text()))errs.push('console:'+m.text().slice(0,120))});
for(const pg of data.pages){errs=[];await p.goto(origin+pg.path);await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})&&!e.closest('[inert],[aria-hidden=true],[hidden]')};
const name=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?.textContent||e.textContent||e.value||e.getAttribute('title')||[...e.querySelectorAll('img[alt]')].map(i=>i.alt).join('')||'').trim();
const inter=[...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea')].filter(vis);
const small=inter.filter(e=>{const b=e.getBoundingClientRect();return (b.height<24||b.width<24)&&!e.closest('p,li p,label')}).map(e=>e.tagName+':'+(name(e)||e.className).slice(0,40));
const ids={};document.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);
return {overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('main h1').length,
 noName:inter.filter(e=>!name(e)&&!(e.labels&&e.labels.length)).map(e=>e.tagName+'.'+String(e.className).slice(0,40)).slice(0,5),
 imgNoAlt:[...document.querySelectorAll('img:not([alt])')].filter(vis).map(i=>i.src.slice(-40)).slice(0,5),
 small:small.slice(0,5),dupIds:Object.entries(ids).filter(([k,v])=>v>1).map(([k])=>k).slice(0,5),
 edge:(()=>{const res=[];for(const e of document.querySelectorAll('main *, footer *')){if(!vis(e))continue;const s=getComputedStyle(e),bx=e.getBoundingClientRect();if(bx.width<80||bx.height<40)continue;
  const painted=(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent')||s.backgroundImage!=='none'||s.boxShadow!=='none';if(!painted||parseFloat(s.borderTopLeftRadius)<=2)continue;
  const cls=(e.tagName+'.'+String(e.className).split(' ')[0]).slice(0,50);if(bx.left<8||bx.right>innerWidth-8){res.push('edge:'+cls);continue;}
  if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.tagName))continue;for(const t of e.querySelectorAll('h1,h2,h3,p,li,span,strong')){if(!t.checkVisibility()||!t.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(t);const rb=rg.getBoundingClientRect();if(rb.width&&(rb.left-bx.left<10||bx.right-rb.right<10)){res.push('tight:'+cls);break;}}}return [...new Set(res)].slice(0,5);})(),
 links:[...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href').split(/[?#]/)[0]),
 title:document.title,desc:document.querySelector('meta[name=description]')?.content||'',lang:document.documentElement.lang};});
const broken=[...new Set(r.links)].filter(h=>!routes.has(h)&&!routes.has(h.replace(/\/$/,''))&&!/^\/teileklar\/(produkt|kategorie|werkstatt)\//.test(h)&&!/^\/(media|api)\//.test(h));
const f={w:run.w,l:run.l,path:pg.path};let bad=false;
for(const k of ['noName','imgNoAlt','small','dupIds','edge'])if(r[k].length){f[k]=r[k];bad=true;}
if(r.overflow){f.overflow=true;bad=true;}if(r.h1!==1){f.h1=r.h1;bad=true;}if(broken.length){f.broken=broken.slice(0,5);bad=true;}
if(!r.desc){f.noDesc=true;bad=true;}if(r.lang!==run.l){f.lang=r.lang;bad=true;}if(errs.length){f.errs=[...new Set(errs)].slice(0,3);bad=true;}
if(bad)findings.push(f);}
await c.close();}
await b.close();await new Promise(r=>server.httpServer.close(r));
const report={scope:'local optimized public build; heuristic audit, not a full WCAG or device acceptance',pages:data.pages.length,runs:runs.map(r=>r.w+':'+r.l),findings,passed:findings.length===0};
await mkdir(repo+'evidence/broad-audit-2026-11-04',{recursive:true});await writeFile(repo+'evidence/broad-audit-2026-11-04/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages,runs:runs.length,findings:findings.length,passed:report.passed}));if(!report.passed)process.exitCode=1;}
