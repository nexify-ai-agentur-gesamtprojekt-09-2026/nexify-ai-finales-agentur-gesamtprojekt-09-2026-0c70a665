// Bounded local contrast audit. No pixel/gradient/alpha or full WCAG assertion.
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const site=fileURLToPath(new URL('../',import.meta.url));
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const sources=['config/design-rules.json','config/design-tokens.json','config/site-map.json','apps/site/.generated/public-site.json','apps/web/app/globals.css','apps/web/components/Workspace.tsx','apps/web/components/WorkspaceRebuild.css','apps/web/components/HomeContent.tsx','apps/web/components/HomeRebuild.css','packages/tokens/tokens.css','apps/site/tests/browser-contrast-scope.mjs'];
async function hashes(){return Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));}
const before=await hashes();const rules=JSON.parse(await readFile(repo+'config/design-rules.json'));const data=JSON.parse(await readFile(site+'.generated/public-site.json'));
function findThreshold(x){if(x&&typeof x==='object'){if('kontrast_text_min'in x)return x.kontrast_text_min;for(const v of Object.values(x)){const n=findThreshold(v);if(n!==undefined)return n;}}}
const threshold=findThreshold(rules);assert.equal(threshold,4.5);
const report={schema_version:1,base_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),observed_at:new Date().toISOString(),scope:'Local rendered ordinary text on opaque solid CSS surfaces, default public states, DE/NL at390/1280. No provider or whole Accessibility acceptance.',threshold,source_sha256:before,method:'sRGB relative luminance (linear channel <=0.04045 /12.92 else ((c+0.055)/1.055)^2.4); (lighter+0.05)/(darker+0.05). Direct text nodes, visible layout boxes. Transparent-zero ancestors allowed; partial alpha, ancestor opacity, images/gradients, pseudo-element paint, filters and blends excluded conservatively. No pixel sampling.',limits:['No computed result for skipped surfaces','No screenreader, focus/hover/error states, native control text, SVG/canvas, text shadows or overlapping unrelated elements proof','Large text still uses project threshold4.5; no automatic WCAG exemption','No screenshot is stored in this report or repository','Prior screenshot spot checks: homepage1280/390 and actual200% font resize; DE select and N badge corrected; not all pages visually audited'],external_requests_blocked:0,checks:[],combinations:[],full_case_accepted:false};
const combos=new Map();
const server=await createServer({root:site,server:{port:0,strictPort:false,hmr:false}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 for(const locale of ['de','nl']){const context=await browser.newContext();await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){report.external_requests_blocked++;return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:403,json:{error:'synthetic_denied'}});return r.continue();});const page=await context.newPage();
 for(const item of data.pages){await page.goto(origin+item.path);await page.locator('#locale').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l,locale);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const result=await page.evaluate(()=>{
 const parse=c=>{const m=c.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const v=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);return v.length===3?[...v,1]:v.length===4?v:null;};
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 const rows=[],skipped={};const skip=r=>skipped[r]=(skipped[r]||0)+1;
 for(const el of document.querySelectorAll('body *')){
 const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim();if(!text)continue;
 const box=el.getBoundingClientRect(),style=getComputedStyle(el);if(!box.width||!box.height||style.visibility!=='visible'||el.closest('[hidden],.visually-hidden'))continue;
 if(el.closest('select,option,input,textarea,svg,canvas')){skip('native_or_non_html_text');continue;}
 let bg=null,reason=null;for(let node=el;node;node=node.parentElement){const s=getComputedStyle(node);if(Number(s.opacity)!==1){reason='opacity';break;}if(s.filter!=='none'||s.mixBlendMode!=='normal'||s.backdropFilter!=='none'){reason='filter_or_blend';break;}if(s.backgroundImage!=='none'){reason='image_or_gradient';break;}if(s.textShadow!=='none'){reason='text_shadow';break;}
 for(const pseudo of ['::before','::after']){const p=getComputedStyle(node,pseudo);if(!['none','normal'].includes(p.content)&&p.display!=='none'){reason='pseudo_element_paint';break;}}if(reason)break;
 const color=parse(s.backgroundColor);if(!color){reason='unsupported_color';break;}if(color[3]>0&&color[3]<1){reason='partial_alpha_background';break;}if(!bg&&color[3]===1)bg=color;
 }
 const fg=parse(style.color);if(!reason&&(!fg||fg[3]!==1))reason='partial_or_unsupported_foreground';if(!reason&&!bg)reason='no_opaque_surface';if(reason){skip(reason);continue;}
 const a=lum(fg),b=lum(bg);rows.push({selector:el.tagName.toLowerCase()+(el.className?'.'+String(el.className).trim().replace(/\s+/g,'.'):''),text:text.slice(0,90),foreground:fg.slice(0,3),background:bg.slice(0,3),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
 }return {rows,skipped};});
 const failures=result.rows.filter(r=>r.ratio<threshold);report.checks.push({path:item.path,locale,width,measured:result.rows.length,skipped:result.skipped,failures});
 for(const row of result.rows){const k=JSON.stringify([row.foreground,row.background]);if(!combos.has(k))combos.set(k,{foreground:row.foreground,background:row.background,ratio:row.ratio,meets_project_threshold:row.ratio>=threshold,occurrences:0,sample:{path:item.path,locale,width,selector:row.selector,text:row.text}});combos.get(k).occurrences++;}
 }
 }await context.close();}
 assert.deepEqual(await hashes(),before,'source drift during contrast audit');report.combinations=[...combos.values()];report.total_measured=report.checks.reduce((a,r)=>a+r.measured,0);report.failure_occurrences=report.checks.reduce((a,r)=>a+r.failures.length,0);report.completed=true;
}finally{await browser.close();await server.close();await writeFile(repo+'evidence/one-app-2026-10-27/decision-accessibility.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,measured:report.total_measured,failures:report.failure_occurrences,combinations:report.combinations.length,external_requests_blocked:report.external_requests_blocked}));
