#!/usr/bin/env node
// Gleichmacher: misst jede Seite gegen die Startseite als einzige Norm (Inhabervorgabe 14.11.2026).
// Nur lesend, Chat-Scheibe ueberall geschlossen. Vergleicht die berechneten Stile der gemeinsamen Bausteine im echten Browser.
// Aufruf: node tools/gleichmacher.mjs [basis-url] [--breiten=390,1440]   Ausgabe JSON, Exit 1 bei Abweichung.
// Er behebt nichts: eine Abweichung heisst, dass eine Seite einen Baustein nachgebaut statt wiederverwendet hat.
// Norm: die Startseite. Bausteine, die es dort nicht gibt (Eingabefelder), haben genau eine zweite Normseite; sie steht
// am Baustein (`seite`, derzeit /kontakt) und nirgends sonst. Auch die Startseite selbst wird geprueft, wo ein Baustein
// mehrfach vorkommt (Galerie-Filme gegen den Hero-Film).
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
import {ruhigMessen} from './kopfleiste-regel.mjs';
const args=process.argv.slice(2);
const base=(args.find(a=>!a.startsWith('--'))||'https://nexifyai.de').replace(/\/$/,'');
const widths=(args.find(a=>a.startsWith('--breiten='))?.slice(10)||'390,1440').split(',').map(Number).filter(Boolean);

// Eigenschaften, die ein Baustein ueberall gleich tragen muss. Breite/Hoehe gehoeren nicht dazu (Inhalt bestimmt sie).
const EIGENSCHAFTEN=['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','text-transform','padding-top','padding-bottom','padding-left','padding-right','min-height'];
const EIGENSCHAFTEN_TEXT=EIGENSCHAFTEN.filter(e=>e!=='min-height');
// Baustein -> Selektor. Die Norm ist das erste Vorkommen auf der Startseite.
// Hat die Startseite einen Baustein nicht selbst (sie hat kein Formular), steht statt des Selektors [Selektor, Norm-Baustein]:
// gemessen wird dann gegen den genannten Baustein der Startseite. Der Absendeschalter eines Formulars ist der primaere Schalter.
const BAUSTEINE={
 // Ueberschriften tragen zusaetzlich ihre Aussenabstaende: die Abstaende zu Dachzeile und Text kommen aus dem Baustein (gap der Huelle,
 // margin der Ueberschrift), nicht aus der Seite. Verglichen wird der berechnete margin in px; er haengt nicht vom Elternlayout ab.
 'Hero-Titel':{sel:'.identity-hero .identity-copy h1',eigenschaften:[...EIGENSCHAFTEN_TEXT,'margin-top','margin-bottom']},
 'Hero-Titel-Akzent':'.identity-hero .identity-title-accent',
 'Hero-Text':'.identity-hero .identity-body',
 'Hero-Schalter-primaer':'.identity-hero .identity-primary-link',
 'Kopfleiste':'.site-header',
 'Kopfleiste-Logo':'.site-header .nx-logo',
 'Fusszeile':'footer',
 'Fusszeile-Link':'footer .footer-legal-direct a',
 'Abschnitts-Titel':{sel:'.hc-section-heading h2',alle:true,eigenschaften:[...EIGENSCHAFTEN_TEXT,'margin-top','margin-bottom']},
 'Abschluss-Titel':{sel:'.hc-finish h2',eigenschaften:[...EIGENSCHAFTEN_TEXT,'margin-top','margin-bottom']},
 'Dachzeile':{sel:'.home-concept .hc-kicker',eigenschaften:[...EIGENSCHAFTEN_TEXT,'margin-top','margin-bottom']},
 'Text-Schalter':'.hc-text-link',
 'Abschluss-Schalter':'.hc-finish-primary',
 'Formular-Schalter-absenden':['.home-concept form button[type="submit"]','Abschluss-Schalter'],
 // Film (Inhaberbefund 14.11.2026, /anmelden: „ganz andere Video-Rahmen"). Die Selektoren sind bewusst allgemein: sie treffen
 // jeden Film im Seiteninhalt, auch einen nachgebauten, und messen ihn gegen den Hero-Film der Startseite (AtelierFilm).
 // Groesse und Innenabstand der Leiste folgen der Filmbreite (Container „film") und zaehlen deshalb nicht; Form, Material und Schrift schon.
 'Filmrahmen':{sel:'main figure:has(video)',alle:true,eigenschaften:['border-radius','box-shadow','overflow-x','overflow-y','background-color','padding-top','padding-left','margin-top','margin-left']},
 'Filmbild':{sel:'main figure:has(video) video',alle:true,eigenschaften:['border-radius','object-fit','background-color']},
 'Film-Bedienleiste':{sel:'main figure:has(video) :has(> button)',alle:true,eigenschaften:['position','display','border-radius','background-color','background-image','box-shadow','backdrop-filter']},
 'Film-Schalter':{sel:'main figure:has(video) button',eigenschaften:['font-family','font-weight','letter-spacing','text-transform','color','background-color','border-top-width','box-shadow']},
 // Eingabefelder: die Startseite hat kein Formular. Norm ist das erste Feld des Kontaktformulars (zweite Normseite, Angabe `seite`).
 // Passwortfelder zaehlen nicht: sie tragen rechts den Platz fuer den Sichtbarkeits-Schalter.
 'Eingabefeld':{sel:'.home-concept form :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=range]):not([type=password]),textarea)',alle:true,seite:'/kontakt',eigenschaften:['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','border-top-width','box-shadow','padding-left','padding-right','min-height']},
 'Eingabefeld-Beschriftung':{sel:'.home-concept form label:not(:has(input[type=checkbox],input[type=radio]))',seite:'/kontakt',eigenschaften:['font-family','font-size','font-weight','line-height','letter-spacing','color','text-transform']},
};
// Eintragsformen: 'Selektor' · [Selektor, Norm-Baustein] · {sel, norm?, seite?, alle?, eigenschaften?}
//  norm          anderer Baustein der Normseite als Massstab
//  seite         zweite Normseite fuer Bausteine, die es auf der Startseite nicht gibt (je Baustein genau eine)
//  alle          jedes sichtbare Vorkommen der Seite messen, nicht nur das erste
//  eigenschaften eigene Liste statt EIGENSCHAFTEN
const form=e=>typeof e==='string'?{sel:e}:Array.isArray(e)?{sel:e[0],norm:e[1]}:e;

// 'min-height' zaehlt nur bei Schaltern (Zielgroesse). Bei Textbausteinen haengt der berechnete Wert ('auto' oder '0px')
// vom Elternlayout ab, und die Startseite nutzt dieselbe Abschnittsueberschrift selbst in mehreren Layouts.
const PLAN=Object.fromEntries(Object.entries(BAUSTEINE).map(([name,e])=>{const f=form(e);return [name,{...f,eigenschaften:f.eigenschaften||EIGENSCHAFTEN.filter(x=>x!=='min-height'||name.includes('Schalter'))}];}));
// Je Baustein eine Liste von Messungen (ein Eintrag, bei `alle` mehrere). Unsichtbare Vorkommen zaehlen nicht.
// `laufend` zaehlt laufende Uebergaenge auf einer gemessenen Eigenschaft eines gemessenen Elements.
const messenRoh=plan=>{
 const out={},gemessen=new Map();
 for(const [name,p] of Object.entries(plan)){const treffer=p.alle?[...document.querySelectorAll(p.sel)]:[document.querySelector(p.sel)].filter(Boolean);const werte=[];
  for(const el of treffer){const r=el.getBoundingClientRect();const s=getComputedStyle(el);if(r.width===0||r.height===0||s.display==='none'||s.visibility==='hidden')continue;
   for(const e of p.eigenschaften)(gemessen.get(el)||gemessen.set(el,new Set()).get(el)).add(e);
   werte.push(Object.fromEntries(p.eigenschaften.map(e=>[e,s.getPropertyValue(e)])));}
  if(werte.length)out[name]=werte;}
 const laufend=document.getAnimations().filter(a=>a instanceof CSSTransition&&a.playState==='running'&&!a.effect?.pseudoElement&&gemessen.get(a.effect?.target)?.has(a.transitionProperty)).length;
 return {out,laufend};};
// Gemessen wird erst, wenn kein solcher Uebergang mehr laeuft und zwei Messungen in Folge gleich sind. Befund 14.11.2026:
// gegen eine langsam antwortende lokale Laufzeit standen Innenabstaende der Kopfleiste als Zwischenwerte im Ergebnis
// (11,43 bis 11,92 statt 12 px bei 1440 px); die Leiste wechselt sie mit `transition:padding`. Die Toleranz bleibt null:
// kommt eine Seite in der Frist nicht zur Ruhe, ist das ein Fehler des Laufs (Exit 1) und kein gemessener Wert.
const messen=async(page,ort)=>{const {wert,ruhig}=await ruhigMessen(page,messenRoh,{arg:PLAN,bereit:m=>m.laufend===0});
 if(!ruhig)fehler.push({...ort,grund:'Seite kommt nicht zur Ruhe: Uebergang laeuft noch oder Messungen schwanken'});
 return wert?.out||{};};

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
  const norm=await messen(page,{breite:w,seite:'/'});
  if(!Object.keys(norm).length){fehler.push({breite:w,grund:'Norm nicht messbar: Startseite zeigt keinen Baustein'});await page.close();continue;}
  // Zweite Normseiten: nur fuer Bausteine mit `seite`; alle uebrigen Normen bleiben die der Startseite.
  for(const [name,p] of Object.entries(PLAN)){if(!p.seite)continue;
   try{await page.goto(base+p.seite,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(600);const dort=await messen(page,{breite:w,seite:p.seite});if(dort[name])norm[name]=dort[name];else fehler.push({breite:w,baustein:name,grund:'Norm nicht messbar auf '+p.seite});}catch{fehler.push({breite:w,baustein:name,grund:'Normseite nicht ladbar: '+p.seite});}}
  for(const route of routes){let ist=null;
   try{const r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()??0)!==200)continue;await page.waitForTimeout(350);ist=await messen(page,{breite:w,seite:route});}catch{fehler.push({breite:w,seite:route,grund:'nicht ladbar'});continue;}
   for(const [name,liste] of Object.entries(ist)){const p=PLAN[name],soll=norm[p.norm||name]?.[0];if(!soll)continue;
    // Die Startseite ist die Norm; auf ihr selbst zaehlen nur weitere Vorkommen (`alle`) und Bausteine mit fremder Norm.
    if(route==='/'&&!p.alle&&!p.norm&&!p.seite)continue;
    const gesehen=new Set();
    for(const werte of liste){for(const e of p.eigenschaften){if(!(e in soll))continue;vergleiche++;if(werte[e]!==soll[e]){const k=e+'|'+werte[e];if(gesehen.has(k))continue;gesehen.add(k);abweichungen.push({seite:route,breite:w,baustein:name,eigenschaft:e,norm:soll[e],ist:werte[e]});}}}}
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
