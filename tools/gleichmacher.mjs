#!/usr/bin/env node
// Gleichmacher: misst jede Seite gegen die Startseite als einzige Norm (Inhabervorgabe 14.11.2026).
// Nur lesend, Chat-Scheibe ueberall geschlossen. Vergleicht die berechneten Stile der gemeinsamen Bausteine im echten Browser.
// Aufruf: node tools/gleichmacher.mjs [basis-url] [--breiten=390,1440]   Ausgabe JSON, Exit 1 bei Abweichung.
// Er behebt nichts: eine Abweichung heisst, dass eine Seite einen Baustein nachgebaut statt wiederverwendet hat.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const args=process.argv.slice(2);
const base=(args.find(a=>!a.startsWith('--'))||'https://nexifyai.de').replace(/\/$/,'');
const widths=(args.find(a=>a.startsWith('--breiten='))?.slice(10)||'390,1440').split(',').map(Number).filter(Boolean);

// Baustein -> Selektor. Die Norm ist das erste Vorkommen auf der Startseite.
const BAUSTEINE={
 'Hero-Titel':'.identity-hero .identity-copy h1',
 'Hero-Titel-Akzent':'.identity-hero .identity-title-accent',
 'Hero-Text':'.identity-hero .identity-body',
 'Hero-Schalter-primaer':'.identity-hero .identity-primary-link',
 'Kopfleiste':'.site-header',
 'Kopfleiste-Logo':'.site-header .nx-logo',
 'Fusszeile':'footer',
 'Fusszeile-Link':'footer .footer-legal-direct a',
 'Abschnitts-Titel':'.hc-section-heading h2',
 'Text-Schalter':'.hc-text-link',
 'Abschluss-Schalter':'.hc-finish-primary',
};
// Eigenschaften, die ein Baustein ueberall gleich tragen muss. Breite/Hoehe gehoeren nicht dazu (Inhalt bestimmt sie).
const EIGENSCHAFTEN=['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','text-transform','padding-top','padding-bottom','padding-left','padding-right','min-height'];

// 'min-height' zaehlt nur bei Schaltern (Zielgroesse). Bei Textbausteinen haengt der berechnete Wert ('auto' oder '0px')
// vom Elternlayout ab, und die Startseite nutzt dieselbe Abschnittsueberschrift selbst in mehreren Layouts.
const messen=(page)=>page.evaluate(([bausteine,eigenschaften])=>{
 const out={};
 for(const [name,sel] of Object.entries(bausteine)){const el=document.querySelector(sel);if(!el)continue;
  const r=el.getBoundingClientRect();const s=getComputedStyle(el);if(r.width===0||r.height===0||s.display==='none')continue;
  out[name]=Object.fromEntries(eigenschaften.map(e=>[e,s.getPropertyValue(e)]));}
 return out;},[BAUSTEINE,EIGENSCHAFTEN]);

// Gleicher Ausgangszustand auf jeder Seite: Die Chat-Scheibe oeffnet sich ab 1200 px nur auf NeXify-Seiten von selbst
// (Workspace.tsx). Offen ist der Inhalt schmaler, und die Schrift waechst mit der Behaelterbreite. Ohne festen Zustand
// misst das Werkzeug die Scheibe statt der Bausteine (Befund 14.11.2026: 70 scheinbare Abweichungen im Shop, obwohl
// die Startseite mit geschlossener Scheibe dieselben Werte hat). Deshalb wird ueberall mit geschlossener Scheibe gemessen:
// der Server liest das Cookie 'nx-chat-open' (lib/chat-panel.ts), der Browser denselben Schluessel im sessionStorage.
const neueSeite=async(viewport)=>{const context=await browser.newContext(viewport?{viewport}:{});
 await context.addCookies([{name:'nx-chat-open',value:'0',url:base}]);
 await context.addInitScript(()=>{try{sessionStorage.setItem('nx-chat-open','0');}catch{}});
 return context.newPage();};
const browser=await chromium.launch();
const abweichungen=[];let seiten=0,vergleiche=0;const fehler=[];
try{
 let routes=new Set(['/','/teileklar']);
 {const page=await neueSeite();
  for(const start of ['/','/teileklar']){try{await page.goto(base+start,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(500);
   for(const h of await page.$$eval('a[href^="/"]',as=>as.map(a=>a.getAttribute('href').split('#')[0].split('?')[0])))if(h&&!h.startsWith('/api')&&!h.startsWith('/_next'))routes.add(h.replace(/(.)\/$/,'$1'));}catch{}}
  await page.close();}
 routes=[...routes].sort();seiten=routes.length;
 for(const w of widths){
  const page=await neueSeite({width:w,height:900});
  await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(600);
  const norm=await messen(page);
  if(!Object.keys(norm).length){fehler.push({breite:w,grund:'Norm nicht messbar: Startseite zeigt keinen Baustein'});await page.close();continue;}
  for(const route of routes){if(route==='/')continue;let ist=null;
   try{const r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()??0)!==200)continue;await page.waitForTimeout(350);ist=await messen(page);}catch{fehler.push({breite:w,seite:route,grund:'nicht ladbar'});continue;}
   for(const [name,werte] of Object.entries(ist)){if(!norm[name])continue;
    for(const e of EIGENSCHAFTEN){if(e==='min-height'&&!name.includes('Schalter'))continue;vergleiche++;if(werte[e]!==norm[name][e])abweichungen.push({seite:route,breite:w,baustein:name,eigenschaft:e,norm:norm[name][e],ist:werte[e]});}}
  }
  await page.close();
 }
}finally{await browser.close();}

// Gleiche Abweichung auf vielen Seiten zusammenfassen, damit der Befund lesbar bleibt.
const gruppen={};
for(const a of abweichungen){const k=[a.baustein,a.eigenschaft,a.breite,a.norm,a.ist].join('|');(gruppen[k]??={baustein:a.baustein,eigenschaft:a.eigenschaft,breite:a.breite,norm:a.norm,ist:a.ist,seiten:[]}).seiten.push(a.seite);}
const befunde=Object.values(gruppen).sort((x,y)=>y.seiten.length-x.seiten.length);
console.log(JSON.stringify({base,zeit:new Date().toISOString(),seiten,breiten:widths,vergleiche,abweichungen:abweichungen.length,befunde,fehler},null,1));
process.exit(abweichungen.length||fehler.length?1:0);
