#!/usr/bin/env node
// Live-Prüfung der Produktion (Regelbetrieb, Selbstheilung). Nur lesend: ruft Seiten ab und misst im echten Browser.
// Aufruf: node tools/live-check.mjs [basis-url]   (Standard https://nexifyai.de). Ausgabe JSON, Exit 1 bei Befund.
// Jede Prüfung entspricht einer Inhabervorgabe vom 14.11.2026 (Quelle in `vorgabe`).
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=(process.argv[2]||'https://nexifyai.de').replace(/\/$/,'');
// Alle Seiten: Start- und Shop-Startseite plus jede dort verlinkte interne Seite (Kopf, Fuß, Seitenübersicht).
let routes=['/','/teileklar'];
const results=[];
const record=(id,ok,vorgabe,detail)=>results.push({id,ok,vorgabe,detail});

const browser=await chromium.launch();
try{
 {const page=await browser.newPage();const found=new Set(routes);
  for(const start of ['/','/teileklar']){try{await page.goto(base+start,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(500);
   for(const h of await page.$$eval('a[href^="/"]',as=>as.map(a=>a.getAttribute('href').split('#')[0].split('?')[0])))if(h&&!h.startsWith('/api')&&!h.startsWith('/_next'))found.add(h.replace(/(.)\/$/,'$1'));}catch{}}
  routes=[...found].sort();await page.close();}
 // Hero-Baustein und Titel auf jeder Seite (Inhabervorgabe: alle Seiten folgen der Startseite)
 {const page=await browser.newPage({viewport:{width:360,height:800}});
  for(const route of routes){let m=null;try{const r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()??0)!==200)continue;await page.waitForTimeout(250);
   m=await page.evaluate(()=>{const h=document.querySelector('h1');if(!h)return {h1:false};const c=h.closest('.identity-copy');const hr=h.getBoundingClientRect();return {h1:true,hero:!!h.closest('.identity-hero'),ragt:c?hr.right>c.getBoundingClientRect().right+1:hr.right>innerWidth+1,alt:(document.body.innerText.match(/NeX2fly/gi)||[]).length}});}catch{}
   if(!m)continue;
   record(`Titel vorhanden ${route}`,m.h1===true,'Jede Seite hat einen Titel',m);
   if(m.h1){record(`Titel im Rahmen ${route} @360`,m.ragt===false,'Titel bricht um',m);record(`kein alter Produktname ${route}`,m.alt===0,'D-011 NeX AIFly Suite',{alt:m.alt});}
  }
  results.push({id:'Seitenzahl',ok:routes.length>=20,vorgabe:'Alle Seiten geprüft',detail:{seiten:routes.length}});await page.close();}
 // 1. Erreichbarkeit und kein Querüberlauf
 for(const w of [360,1440]){
  const page=await browser.newPage({viewport:{width:w,height:900}});
  for(const route of routes){
   let status=0,overflow=null;
   try{const r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});status=r?.status()??0;await page.waitForTimeout(400);overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);}catch(e){status=-1;}
   record(`erreichbar ${route} @${w}`,status===200,'Seiten erreichbar',{status});
   record(`kein Querüberlauf ${route} @${w}`,overflow===false,'Abstände/Spaces',{overflow});
  }
  await page.close();
 }
 // 2. Produktname
 {const page=await browser.newPage();await page.goto(base+'/produkte/nex2fly',{waitUntil:'domcontentloaded'});await page.waitForTimeout(400);
  const t=await page.evaluate(()=>({h1:document.querySelector('h1')?.textContent||'',old:(document.body.innerText.match(/NeX2fly/gi)||[]).length}));
  record('Produktname NeX AIFly Suite',t.h1.includes('NeX AIFly Suite')&&t.old===0,'D-011 NeX AIFly Suite',t);await page.close();}
 // 3. KI-Kennzeichnung im Footer (de/nl/fr)
 for(const l of ['','?lang=nl','?lang=fr']){const page=await browser.newPage({viewport:{width:390,height:800}});await page.goto(base+'/'+l,{waitUntil:'domcontentloaded'});await page.waitForTimeout(500);
  const n=await page.evaluate(()=>{const a=document.querySelector('[data-testid=footer-ai-note-link]');return a?{text:a.textContent,href:a.getAttribute('href'),h:Math.round(a.getBoundingClientRect().height)}:null});
  record(`KI-Hinweis Footer ${l||'de'}`,!!n&&n.h>=44&&/ki-hinweise/.test(n.href),'Art. 50 KI-VO, Footer',n);await page.close();}
 // 4. Autostart: nur der Hero-Film
 {const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(3500);
  await page.evaluate(()=>document.querySelector('.hc-gallery-card')?.scrollIntoView({block:'center'}));await page.waitForTimeout(2500);
  const v=await page.evaluate(()=>[...document.querySelectorAll('.hc-gallery-card video')].map(x=>!x.paused&&x.currentTime>0));
  record('Galerie-Filme starten nicht von selbst',v.length===3&&v.every(p=>!p),'Nur Hero-Video startet automatisch',{galerie:v});
  // Klick startet jeden Galerie-Film
  const played=[];for(let i=0;i<3;i++){const card=page.locator('.hc-gallery-card').nth(i);await card.scrollIntoViewIfNeeded();const btn=card.locator('.atelier-film-controls button').first();
   try{await btn.click({timeout:5000});await page.waitForTimeout(1500);played.push(await card.locator('video').evaluate(x=>!x.paused));}catch{played.push(false);}}
  record('Galerie-Filme starten auf Klick',played.every(Boolean),'Galerie = Hero-Einbettung, bedienbar',{played});await page.close();}
 // 5. Kopfleiste beim Blättern: Inhalt hält Abstand zur Glaskante
 for(const w of [360,390,768,1120,1440,1835]){const page=await browser.newPage({viewport:{width:w,height:900}});await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(800);await page.evaluate(()=>scrollTo(0,600));await page.waitForTimeout(1000);
  const g=await page.evaluate(()=>{const h=document.querySelector('.site-header');const bf=getComputedStyle(h,'::before');const hb=h.getBoundingClientRect();const pl=hb.left+(parseFloat(bf.left)||0),pr=hb.right-(parseFloat(bf.right)||0);
   const vis=[...h.querySelectorAll('a,button,summary')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'});
   return {links:Math.round(Math.min(...vis.map(e=>e.getBoundingClientRect().left))-pl),rechts:Math.round(pr-Math.max(...vis.map(e=>e.getBoundingClientRect().right)))}});
  const min=w<=640?8:20;record(`Kopfleiste Abstand @${w}`,g.links>=min&&g.rechts>=min,'Logo klebt nicht am Rand',g);await page.close();}
 // 6. Shop-Dienst: ohne ihn zeigt TEILEKLAR kein Sortiment, keinen Warenkorb und keine Kasse (Befund 14.11.2026: 503 auf allen /api/shop/*).
 {const page=await browser.newPage();
  for(const path of ['/api/shop/status','/api/shop/products?page_size=1']){let status=0,grund=null;
   try{const r=await page.request.get(base+path,{timeout:30000});status=r.status();if(status!==200){try{grund=(await r.json())?.detail?.reason??null;}catch{}}}catch{status=-1;}
   record(`Shop-Dienst ${path.split('?')[0]}`,status===200,'Echte Kundenwege: Sortiment lädt',{status,grund});}
  await page.close();}
 // 7. Mobil und PWA: installierbar und offline-fähig. Nur lesend. Grenzen des Workers: .claude/skills/nexify-klon-fabrik/SKILL.md.
 {const page=await browser.newPage();const vorgabe='Mobil und PWA: installierbar, offline-fähig';
  const get=async path=>{try{const r=await page.request.get(base+path,{timeout:30000,maxRedirects:0});return {status:r.status(),type:r.headers()['content-type']||'',cache:r.headers()['cache-control']||'',text:await r.text()};}catch{return {status:-1,type:'',cache:'',text:''};}};
  const m=await get('/manifest.webmanifest');let manifest=null;try{manifest=JSON.parse(m.text);}catch{}
  const fehlend=['id','name','short_name','start_url','scope','display','lang','dir','background_color','theme_color'].filter(k=>!manifest?.[k]);
  const icons=manifest?.icons||[],hat=(groesse,zweck)=>icons.some(i=>i.sizes===groesse&&(i.purpose||'any')===zweck);
  record('PWA Manifest erreichbar und vollständig',m.status===200&&/manifest\+json/.test(m.type)&&!!manifest&&fehlend.length===0&&hat('192x192','any')&&hat('512x512','any')&&icons.some(i=>i.purpose==='maskable'),vorgabe,{status:m.status,type:m.type,fehlend,icons:icons.map(i=>i.sizes+' '+(i.purpose||'any'))});
  const tot=[];for(const ziel of [...icons.map(i=>i.src),...(manifest?.shortcuts||[]).map(k=>k.url)]){const r=await get(ziel);if(r.status!==200)tot.push({ziel,status:r.status});}
  record('PWA Icons und Kurzwege erreichbar',!!manifest&&icons.length>0&&tot.length===0,vorgabe,{tot});
  const w=await get('/public-install-worker.js'),alter=/max-age=(\d+)/.exec(w.cache);
  record('PWA Service Worker erreichbar, als Skript, ohne langes Caching',w.status===200&&/javascript/.test(w.type)&&!/immutable/.test(w.cache)&&(/no-cache|no-store/.test(w.cache)||(!!alter&&Number(alter[1])===0)),vorgabe,{status:w.status,type:w.type,cache:w.cache});
  record('PWA Service Worker übernimmt keine offene Sitzung',w.status===200&&/addEventListener\('fetch'/.test(w.text)&&!/skipWaiting\s*\(|clients\s*\.\s*claim\s*\(/.test(w.text),vorgabe,{status:w.status});
  const o=await get('/offline');record('PWA Offline-Seite erreichbar',o.status===200&&/data-testid="offline-page"/.test(o.text),vorgabe,{status:o.status});
  const h=await get('/');record('PWA Manifest im Kopf verlinkt',/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/.test(h.text),vorgabe,{status:h.status});
  await page.close();}
}finally{await browser.close();}

const failed=results.filter(r=>!r.ok);
console.log(JSON.stringify({base,zeit:new Date().toISOString(),pruefungen:results.length,befunde:failed.length,fehlgeschlagen:failed},null,1));
process.exit(failed.length?1:0);
