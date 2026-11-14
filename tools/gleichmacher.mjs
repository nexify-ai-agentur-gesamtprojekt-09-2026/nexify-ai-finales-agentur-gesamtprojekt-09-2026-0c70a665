#!/usr/bin/env node
// Gleichmacher: misst jede Seite gegen die Startseite als einzige Norm (Inhabervorgabe 14.11.2026).
// Nur lesend, Chat-Scheibe ueberall geschlossen. Vergleicht die berechneten Stile der gemeinsamen Bausteine im echten Browser.
// Aufruf: node tools/gleichmacher.mjs [basis-url] [--breiten=390,1440]   Ausgabe JSON, Exit 1 bei Abweichung.
// Er behebt nichts: eine Abweichung heisst, dass eine Seite einen Baustein nachgebaut statt wiederverwendet hat.
// Norm: die Startseite. Bausteine, die es dort nicht gibt (Eingabefelder), haben genau eine zweite Normseite; sie steht
// am Baustein (`seite`, derzeit /kontakt) und nirgends sonst. Auch die Startseite selbst wird geprueft, wo ein Baustein
// mehrfach vorkommt (Galerie-Filme gegen den Hero-Film).
// TEILEKLAR ist eine eigene Shop-Marke mit eigener Kopfleiste (`CommerceHeader`, in Workspace.tsx bewusst statt `.site-header`;
// docs/01-konzept/cd-2026-bildschirm.md: „behalten ihre eigene Marke"). Sie wird nicht gegen die NeXify-Kopfleiste gemessen,
// sondern innerhalb der Marke: Normseite ist /teileklar, jede Seite unter /teileklar muss dieselbe Shop-Kopfleiste tragen.
// Neben dem Vergleich gegen eine Normseite gibt es feste Regeln (REGELN unten): Sie gelten auch auf der Normseite selbst und
// fallen deshalb auch dann auf, wenn ein Rueckfall alle Seiten zugleich trifft.
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
const KARTE=['border-radius','background-color','background-image','box-shadow','backdrop-filter','border-top-width','border-top-color','padding-top','padding-bottom','padding-left','padding-right'];
const KOPF=[...EIGENSCHAFTEN_TEXT,'position','display','border-bottom-width','border-bottom-color','box-shadow','backdrop-filter'];
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
 // Karten (Register OA-052, D-012): die Flaechen der Startseite, die Unterseiten wiederverwenden. Gemessen wird das Material der
 // Flaeche (Form, Grund, Kante, Tiefe, Innenabstand), nicht ihr Inhalt und nicht ihre Groesse. Jedes Vorkommen zaehlt.
 // Die aufgeklappte Detailkarte hebt sich ab (anderer Schatten); deshalb zwei Bausteine mit je eigener Norm auf der Startseite.
 'Karte-Detail':{sel:'.home-concept .hc-service-detail:not([open])',alle:true,eigenschaften:KARTE},
 'Karte-Detail-offen':{sel:'.home-concept .hc-service-detail[open]',alle:true,eigenschaften:KARTE},
 'Karte-Ablauf':{sel:'.home-concept .hc-process>ol>li',alle:true,eigenschaften:KARTE},
 'Karte-Galerie':{sel:'.home-concept .hc-gallery-card',alle:true,eigenschaften:KARTE},
 'Karte-Angebot':{sel:'.home-concept .hc-product',alle:true,eigenschaften:KARTE},
 'Karte-Kosten':{sel:'.home-concept .hc-costs',alle:true,eigenschaften:KARTE},
 'Karte-Satz':{sel:'.home-concept .hc-rate',alle:true,eigenschaften:KARTE},
 'Abschluss-Flaeche':{sel:'.home-concept .hc-finish',alle:true,eigenschaften:KARTE},
 // Abschlussbereich (PR 173): ab zwei Schaltern eine Liste. Die Startseite hat nur einen Schalter; Norm ist /kontakt (fuenf).
 // Anordnung und der eine Abstandswert werden hier verglichen, Breiten und Reihenfolge prueft die feste Regel unten.
 'Abschluss-Schalterliste':{sel:'.home-concept .hc-finish-actions:has(>:nth-child(2))',alle:true,seite:'/kontakt',eigenschaften:['display','row-gap','column-gap','align-items','justify-items']},
 // Hinweis unter der Chat-Eingabe (PR 172, Inhaberbefund 14.11.2026: kleinste Schriftstufe). Die Scheibe ist bei der Messung
 // geschlossen, der Hinweis also unsichtbar; seine berechnete Schrift steht trotzdem fest (`verborgen`).
 'Chat-Hinweis':{sel:'#aifly-panel .public-orientation>.connection-note',alle:true,verborgen:true,eigenschaften:['font-family','font-size','font-weight','line-height','letter-spacing','text-transform']},
 // Shop-Kopfleiste der Marke TEILEKLAR: Norm ist /teileklar, verglichen wird jede Seite, die diese Kopfleiste traegt.
 'Shop-Kopfleiste':{sel:'.tk-commerce-header',seite:'/teileklar',eigenschaften:KOPF},
 'Shop-Kopfleiste-Dienstzeile':{sel:'.tk-commerce-header .tk-service-strip',seite:'/teileklar',eigenschaften:KOPF},
 'Shop-Kopfleiste-Hauptzeile':{sel:'.tk-commerce-header .tk-commerce-main',seite:'/teileklar',eigenschaften:[...KOPF,'column-gap','row-gap']},
 'Shop-Kopfleiste-Wortmarke':{sel:'.tk-commerce-header .tk-wordmark',seite:'/teileklar'},
 'Shop-Kopfleiste-Suchfeld':{sel:'.tk-commerce-header .tk-header-search input',seite:'/teileklar',eigenschaften:[...EIGENSCHAFTEN,'border-top-width','box-shadow']},
 'Shop-Kopfleiste-Schalter-suchen':{sel:'.tk-commerce-header .tk-header-search button',seite:'/teileklar'},
 'Shop-Kopfleiste-Konto':{sel:'.tk-commerce-header .tk-header-account>a',alle:true,seite:'/teileklar'},
 'Shop-Kopfleiste-Navigation':{sel:'.tk-commerce-header .tk-commerce-nav',seite:'/teileklar',eigenschaften:[...KOPF,'column-gap','row-gap']},
 'Shop-Kopfleiste-Navigation-Link':{sel:'.tk-commerce-header .tk-commerce-nav a:not([aria-current])',alle:true,seite:'/teileklar',eigenschaften:[...EIGENSCHAFTEN_TEXT,'border-bottom-width','border-bottom-color']},
 'Shop-Kopfleiste-Navigation-aktiv':{sel:'.tk-commerce-header .tk-commerce-nav a[aria-current]',alle:true,seite:'/teileklar',eigenschaften:[...EIGENSCHAFTEN_TEXT,'border-bottom-width','border-bottom-color']},
};
// Eintragsformen: 'Selektor' · [Selektor, Norm-Baustein] · {sel, norm?, seite?, alle?, verborgen?, eigenschaften?}
//  norm          anderer Baustein der Normseite als Massstab
//  seite         zweite Normseite fuer Bausteine, die es auf der Startseite nicht gibt (je Baustein genau eine)
//  alle          jedes sichtbare Vorkommen der Seite messen, nicht nur das erste
//  verborgen     auch unsichtbare Vorkommen messen (Bausteine in der geschlossenen Chat-Scheibe)
//  eigenschaften eigene Liste statt EIGENSCHAFTEN
const form=e=>typeof e==='string'?{sel:e}:Array.isArray(e)?{sel:e[0],norm:e[1]}:e;

// 'min-height' zaehlt nur bei Schaltern (Zielgroesse). Bei Textbausteinen haengt der berechnete Wert ('auto' oder '0px')
// vom Elternlayout ab, und die Startseite nutzt dieselbe Abschnittsueberschrift selbst in mehreren Layouts.
const PLAN=Object.fromEntries(Object.entries(BAUSTEINE).map(([name,e])=>{const f=form(e);return [name,{...f,eigenschaften:f.eigenschaften||EIGENSCHAFTEN.filter(x=>x!=='min-height'||name.includes('Schalter'))}];}));
// Je Baustein eine Liste von Messungen (ein Eintrag, bei `alle` mehrere). Unsichtbare Vorkommen zaehlen nicht.
// `laufend` zaehlt laufende Uebergaenge auf einer gemessenen Eigenschaft eines gemessenen Elements.
// `regeln` sind die Verstoesse gegen die festen Regeln der Seite, `geprueft` die Zahl der dafuer angestellten Pruefungen.
const messenRoh=plan=>{
 const out={},gemessen=new Map();
 for(const [name,p] of Object.entries(plan)){const treffer=p.alle?[...document.querySelectorAll(p.sel)]:[document.querySelector(p.sel)].filter(Boolean);const werte=[];
  for(const el of treffer){const r=el.getBoundingClientRect();const s=getComputedStyle(el);if(!p.verborgen&&(r.width===0||r.height===0||s.display==='none'||s.visibility==='hidden'))continue;
   for(const e of p.eigenschaften)(gemessen.get(el)||gemessen.set(el,new Set()).get(el)).add(e);
   werte.push(Object.fromEntries(p.eigenschaften.map(e=>[e,s.getPropertyValue(e)])));}
  if(werte.length)out[name]=werte;}
 const laufend=document.getAnimations().filter(a=>a instanceof CSSTransition&&a.playState==='running'&&!a.effect?.pseudoElement&&gemessen.get(a.effect?.target)?.has(a.transitionProperty)).length;
 // Feste Regeln (REGELN im Kopf des Abschnitts unten beschrieben). Sie laufen im Browser, weil sie Lage und Masse brauchen.
 const regeln=[],jeRegel={};let geprueft=0;const rund=x=>Math.round(x*100)/100,zeigt=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const pruefe=(regel,eigenschaft,soll,ist)=>{geprueft++;jeRegel[regel]=(jeRegel[regel]||0)+1;if(String(soll)!==String(ist))regeln.push({regel,eigenschaft,soll:String(soll),ist:String(ist)});};
 for(const liste of document.querySelectorAll('.home-concept .hc-finish-actions')){const kinder=[...liste.children].filter(zeigt);if(!zeigt(liste)||kinder.length<2)continue;
  const lage=kinder.map(k=>k.getBoundingClientRect()),name='Abschluss-Schalterliste';
  for(const q of lage.slice(1)){pruefe(name,'Schalterbreite',rund(lage[0].width)+'px',rund(q.width)+'px');pruefe(name,'linke Kante',rund(lage[0].left)+'px',rund(q.left)+'px');}
  const nachLage=[...lage].sort((a,b)=>a.top-b.top),soll=getComputedStyle(liste).rowGap;
  for(let i=1;i<nachLage.length;i++)pruefe(name,'Abstand zum Vorgaenger',soll,rund(nachLage[i].top-nachLage[i-1].bottom)+'px');
  const haupt=kinder.filter(k=>k.matches('.hc-finish-primary'));pruefe(name,'Zahl der Hauptschalter',1,haupt.length);
  if(haupt.length===1)pruefe(name,'Platz des Hauptschalters',1,1+lage.filter(q=>q.top<haupt[0].getBoundingClientRect().top-.5).length);}
 for(const hinweis of document.querySelectorAll('#aifly-panel .public-orientation>.connection-note')){const s=getComputedStyle(hinweis);
  pruefe('Chat-Hinweis','font-size (kleinste Schriftstufe --as-t-12)',s.getPropertyValue('--as-t-12').trim()||'Token fehlt',s.fontSize);}
 const kopf=['.site-header','.tk-commerce-header'].filter(sel=>[...document.querySelectorAll(sel)].some(zeigt));
 return {out,laufend,regeln,geprueft,jeRegel,kopf};};
// Gemessen wird erst, wenn kein solcher Uebergang mehr laeuft und zwei Messungen in Folge gleich sind. Befund 14.11.2026:
// gegen eine langsam antwortende lokale Laufzeit standen Innenabstaende der Kopfleiste als Zwischenwerte im Ergebnis
// (11,43 bis 11,92 statt 12 px bei 1440 px); die Leiste wechselt sie mit `transition:padding`. Die Toleranz bleibt null:
// kommt eine Seite in der Frist nicht zur Ruhe, ist das ein Fehler des Laufs (Exit 1) und kein gemessener Wert.
const messen=async(page,ort)=>{const {wert,ruhig}=await ruhigMessen(page,messenRoh,{arg:PLAN,bereit:m=>m.laufend===0});
 if(!ruhig)fehler.push({...ort,grund:'Seite kommt nicht zur Ruhe: Uebergang laeuft noch oder Messungen schwanken'});
 return {bausteine:wert?.out||{},regeln:wert?.regeln||[],geprueft:wert?.geprueft||0,jeRegel:wert?.jeRegel||{},kopf:wert?.kopf||[]};};
// Feste Regeln. Sie haengen nicht an einer Normseite und gelten auf jeder Seite, auch auf der Startseite:
//  Abschluss-Schalterliste  ab zwei sichtbaren Schaltern in `.hc-finish-actions` (PR 173): alle Schalter gleich breit und an
//                           einer linken Kante, zwischen ihnen genau der eine Abstandswert der Liste (row-gap), genau ein
//                           Hauptschalter (`.hc-finish-primary`), und er steht an erster Stelle (nach Lage, nicht nach Quelltext).
//  Chat-Hinweis             Schriftgroesse des Hinweises unter der Chat-Eingabe ist die kleinste Schriftstufe des Systems
//                           (`--as-t-12`, PR 172). Der Sollwert wird im Browser aus dem Token gelesen, nicht hier wiederholt.
//  Kopfleiste               jede Seite traegt genau eine sichtbare Kopfleiste, und zwar die ihrer Marke: unter /teileklar die
//                           Shop-Kopfleiste, sonst die NeXify-Kopfleiste. Eine Seite ohne Kopfleiste bliebe sonst ungeprueft.
const kopfSoll=route=>route==='/teileklar'||route.startsWith('/teileklar/')?'.tk-commerce-header':'.site-header';
const regelnWerten=(m,route,w)=>{vergleiche+=m.geprueft+1;jeBaustein['Kopfleiste der Marke']++;for(const [n,z] of Object.entries(m.jeRegel))jeBaustein[n+' (Regel)']+=z;
 for(const r of m.regeln)abweichungen.push({seite:route,breite:w,baustein:r.regel,eigenschaft:r.eigenschaft,norm:r.soll,ist:r.ist});
 const soll=kopfSoll(route),ist=m.kopf.join(' + ')||'keine';
 if(ist!==soll)abweichungen.push({seite:route,breite:w,baustein:'Kopfleiste der Marke',eigenschaft:'sichtbare Kopfleiste',norm:soll,ist});};

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
// Vergleiche je Baustein und Regel: ein Baustein mit 0 Vergleichen ist gelistet, hat aber (noch) kein zweites Vorkommen.
const jeBaustein=Object.fromEntries([...Object.keys(BAUSTEINE),'Abschluss-Schalterliste (Regel)','Chat-Hinweis (Regel)','Kopfleiste der Marke'].map(n=>[n,0]));
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
  const norm=(await messen(page,{breite:w,seite:'/'})).bausteine;
  if(!Object.keys(norm).length){fehler.push({breite:w,grund:'Norm nicht messbar: Startseite zeigt keinen Baustein'});await page.close();continue;}
  // Zweite Normseiten: nur fuer Bausteine mit `seite`; alle uebrigen Normen bleiben die der Startseite.
  for(const [name,p] of Object.entries(PLAN)){if(!p.seite)continue;
   try{await page.goto(base+p.seite,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(600);const dort=(await messen(page,{breite:w,seite:p.seite})).bausteine;if(dort[name])norm[name]=dort[name];else fehler.push({breite:w,baustein:name,grund:'Norm nicht messbar auf '+p.seite});}catch{fehler.push({breite:w,baustein:name,grund:'Normseite nicht ladbar: '+p.seite});}}
  for(const route of routes){let ist=null;
   try{const r=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()??0)!==200)continue;await page.waitForTimeout(350);const m=await messen(page,{breite:w,seite:route});ist=m.bausteine;regelnWerten(m,route,w);}catch{fehler.push({breite:w,seite:route,grund:'nicht ladbar'});continue;}
   for(const [name,liste] of Object.entries(ist)){const p=PLAN[name],soll=norm[p.norm||name]?.[0];if(!soll)continue;
    // Die Startseite ist die Norm; auf ihr selbst zaehlen nur weitere Vorkommen (`alle`) und Bausteine mit fremder Norm.
    if(route==='/'&&!p.alle&&!p.norm&&!p.seite)continue;
    const gesehen=new Set();
    for(const werte of liste){for(const e of p.eigenschaften){if(!(e in soll))continue;vergleiche++;jeBaustein[name]++;if(werte[e]!==soll[e]){const k=e+'|'+werte[e];if(gesehen.has(k))continue;gesehen.add(k);abweichungen.push({seite:route,breite:w,baustein:name,eigenschaft:e,norm:soll[e],ist:werte[e]});}}}}
  }
  await page.close();
 }
}finally{await browser.close();}

// Gleiche Abweichung auf vielen Seiten zusammenfassen, damit der Befund lesbar bleibt.
const gruppen={};
for(const a of abweichungen){const k=[a.baustein,a.eigenschaft,a.breite,a.norm,a.ist].join('|');(gruppen[k]??={baustein:a.baustein,eigenschaft:a.eigenschaft,breite:a.breite,norm:a.norm,ist:a.ist,seiten:[]}).seiten.push(a.seite);}
const befunde=Object.values(gruppen).sort((x,y)=>y.seiten.length-x.seiten.length);
console.log(JSON.stringify({base,zeit:new Date().toISOString(),seiten,breiten:widths,vergleiche,jeBaustein,abweichungen:abweichungen.length,befunde,fehler},null,1));
process.exit(abweichungen.length||fehler.length?1:0);
