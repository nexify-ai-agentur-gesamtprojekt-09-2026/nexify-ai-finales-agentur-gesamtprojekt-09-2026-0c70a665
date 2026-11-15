// Aufruf: node messung.mjs <basis-url> <ausgabeordner> <präfix>
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {writeFile,mkdir} from 'node:fs/promises';
const [base,out,prefix]=process.argv.slice(2);await mkdir(out,{recursive:true});
const browser=await chromium.launch();const result=[];
const measure=()=>{const a=document.querySelector('#atelier'),p=document.querySelector('#aifly-panel'),m=document.querySelector('.website')||document.querySelector('main'),h=document.querySelector('[data-testid="chat-resize-handle"]'),l=document.querySelector('[data-testid="chat-launcher"]');
 const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&!e.hidden&&e.getBoundingClientRect().width>0;const r=e=>e?Math.round(e.getBoundingClientRect().width*100)/100:null;
 return {klasse:a.className.match(/is-(open|closed)/)?.[0],boot:a.dataset.chatBoot??null,leiste_sichtbar:vis(p),leiste_breite:vis(p)?r(p):null,leiste_links:vis(p)?Math.round(p.getBoundingClientRect().left):null,inhalt_breite:r(m),inhalt_rechts:m?Math.round(m.getBoundingClientRect().right):null,inline_breite:a.style.getPropertyValue('--layout-panel-width')||null,quer_ueberlauf:document.documentElement.scrollWidth-document.documentElement.clientWidth,rolle:p.getAttribute('role'),aria_modal:p.getAttribute('aria-modal'),hidden:p.hidden,griff_valuenow:h?.getAttribute('aria-valuenow')??null,griff_min:h?.getAttribute('aria-valuemin')??null,schalter_sichtbar:vis(l),schalter_expanded:l?.getAttribute('aria-expanded')??null,fokus:document.activeElement?.tagName+(document.activeElement?.id?'#'+document.activeElement.id:'')};};
async function fall(name,width,height,{cookies=[],path='/',js=true,shot=false}={}){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:shot?2:1,javaScriptEnabled:js});
 if(cookies.length)await ctx.addCookies(cookies.map(([n,v])=>({name:n,value:v,url:base})));
 const page=await ctx.newPage();
 // Layout-Sprung: Summe der layout-shift-Einträge ab dem ersten Bildaufbau
 await page.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}});
 await page.goto(base+path,{waitUntil:'load'});
 let first=null;if(js){first=await page.evaluate(measure);await page.waitForFunction(()=>!document.querySelector('#atelier').dataset.chatBoot,{timeout:15000}).catch(()=>{});await page.waitForTimeout(1200);}
 const m=await page.evaluate(measure);const cls=js?await page.evaluate(()=>Math.round(window.__cls*10000)/10000):null;
 if(shot)await page.screenshot({path:`${out}/${prefix}-${name}.png`});
 result.push({fall:name,breite:width,pfad:path,cookies:Object.fromEntries(cookies),js,vor_skript:js?null:m,erstes_bild:first&&{boot:first.boot,leiste_sichtbar:first.leiste_sichtbar,leiste_breite:first.leiste_breite,inhalt_breite:first.inhalt_breite},nach_start:js?m:null,layout_shift:cls});
 await ctx.close();}
await fall('1440',1440,900,{shot:true});
await fall('390',390,844,{shot:true});
await fall('1700',1700,1000);
await fall('1280',1280,800);
await fall('1200',1200,800,{shot:true});
await fall('1199',1199,800);
await fall('821',821,800);
await fall('1440-ohne-skript',1440,900,{js:false});
await fall('1440-gespeichert-zu',1440,900,{cookies:[['nx-chat-open','0']]});
await fall('1440-gespeichert-breite-520',1440,900,{cookies:[['nx-chat-open','1'],['nx-chat-width','520']]});
await fall('1199-gespeichert-offen',1199,800,{cookies:[['nx-chat-open','1']]});
await fall('390-gespeichert-offen',390,844,{cookies:[['nx-chat-open','1']]});
await fall('1440-teileklar',1440,900,{path:'/teileklar'});
await writeFile(`${out}/${prefix}-messung.json`,JSON.stringify(result,null,1));
for(const r of result){const m=r.nach_start||r.vor_skript;console.log([r.fall,m.klasse,'leiste='+m.leiste_breite,'inhalt='+m.inhalt_breite,'inline='+m.inline_breite,'ueberlauf='+m.quer_ueberlauf,'cls='+r.layout_shift,'erstes='+(r.erstes_bild?.leiste_breite??'-'),'now='+m.griff_valuenow,'rolle='+m.rolle,'schalter='+m.schalter_sichtbar].join(' '));}
await browser.close();
