"use client";
import {useEffect,useState} from "react";
import {Logo} from './Logo';
import type {Locale} from "../lib/i18n";
import {useSitePathname} from "./Router";
import "./InstallInvitation.css";

// Discreet, honest installation area. It never fabricates an OS install or download guarantee and
// never caches auth/API/customer data. It only offers the real browser prompt when the browser
// actually fires `beforeinstallprompt`; otherwise it gives honest, browser-specific guidance. iOS
// Safari has no prompt event, so it receives the manual "Teilen → Zum Home-Bildschirm" hint. When
// the app already runs standalone/installed, or the user dismisses, it stops offering (no nagging,
// no automatic popups). It lives in the page footer flow and never overlays the chat panel.

type InstallChoice={outcome:"accepted"|"dismissed";platform?:string};
type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<InstallChoice>};
type Mode="prompt"|"ios"|"instructions";
const DISMISS_KEY="nexify-install-dismissed-v1";

// Module-level capture so a beforeinstallprompt firing before this component mounts is not lost.
let deferredPrompt:InstallPromptEvent|null=null;
const subscribers=new Set<()=>void>();
function announce(){for(const fn of subscribers)fn();}
if(typeof window!=="undefined"){
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredPrompt=event as InstallPromptEvent;announce();});
  window.addEventListener("appinstalled",()=>{deferredPrompt=null;announce();});
}

export function runningStandalone(env:{matchMedia?:(q:string)=>{matches:boolean};navigator?:{standalone?:boolean}}=globalThis as unknown as {matchMedia?:(q:string)=>{matches:boolean};navigator?:{standalone?:boolean}}):boolean{
  try{
    if(typeof env.matchMedia==="function"&&env.matchMedia("(display-mode: standalone)").matches)return true;
    if(env.navigator&&env.navigator.standalone===true)return true; // iOS home-screen launch
  }catch{/* feature detection only */}
  return false;
}
export function isIosSafari(userAgent:string):boolean{
  const iOS=/iphone|ipad|ipod/i.test(userAgent);
  const otherEngine=/crios|fxios|edgios|opios|android/i.test(userAgent);
  const safari=/safari/i.test(userAgent);
  return iOS&&safari&&!otherEngine;
}

const copy={
 de:{title:"NeXify AI als App installieren",prompt:"Installiere NeXify AI für einen schnellen Start direkt vom Startbildschirm.",ios:"Auf iPhone/iPad: im Teilen-Menü (Teilen-Symbol) „Zum Home-Bildschirm“ wählen.",generic:"In unterstützten Browsern über das Browsermenü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.",note:"Verfügbarkeit und Installation hängen vom Browser ab. Für die Nutzung ist eine Internetverbindung erforderlich.",install:"Installieren",dismiss:"Nicht jetzt"},
 nl:{title:"NeXify AI als app installeren",prompt:"Installeer NeXify AI voor een snelle start direct vanaf het startscherm.",ios:"Op iPhone/iPad: kies in het deelmenu (deel-symbool) „Zet op beginscherm“.",generic:"In ondersteunde browsers via het browsermenu „App installeren“ of „Toevoegen aan beginscherm“.",note:"Beschikbaarheid en installatie hangen af van de browser. Voor gebruik is een internetverbinding nodig.",install:"Installeren",dismiss:"Niet nu"},
 fr:{title:"Installer NeXify AI en tant qu’application",prompt:"Installe NeXify AI pour un démarrage rapide depuis l’écran d’accueil.",ios:"Sur iPhone/iPad : dans le menu Partager (icône Partager), choisis « Sur l’écran d’accueil ».",generic:"Dans les navigateurs compatibles, via le menu du navigateur « Installer l’application » ou « Ajouter à l’écran d’accueil ».",note:"La disponibilité et l’installation dépendent du navigateur. Une connexion Internet est nécessaire.",install:"Installer",dismiss:"Pas maintenant"},
 en:{title:"Install NeXify AI as an app",prompt:"Install NeXify AI for a quick start straight from your home screen.",ios:"On iPhone/iPad: in the Share menu (share icon) choose \u201cAdd to Home Screen\u201d.",generic:"In supported browsers, use the browser menu \u201cInstall app\u201d or \u201cAdd to Home Screen\u201d.",note:"Availability and installation depend on the browser. An internet connection is required.",install:"Install",dismiss:"Not now"}
};

export default function InstallInvitation({locale}:{locale:Locale}){
  const [,setTick]=useState(0);
  const [dismissed,setDismissed]=useState(false);
  const [resolved,setResolved]=useState(false);
  const [standalone,setStandalone]=useState(false);
  const [manifestAvailable,setManifestAvailable]=useState(false);
  // Der Verweis auf das Manifest gilt je Seite (TEILEKLAR hat keinen): bei jedem Seitenwechsel neu lesen, sonst bleibt der Hinweis stehen.
  const pathname=useSitePathname();
  useEffect(()=>{setManifestAvailable(Boolean(document.querySelector('link[rel="manifest"][href]')));},[pathname]);
  useEffect(()=>{
    setStandalone(runningStandalone());
    try{setDismissed(localStorage.getItem(DISMISS_KEY)==="1");}catch{/* storage optional */}
    const update=()=>setTick(value=>value+1);
    subscribers.add(update);
    return()=>{subscribers.delete(update);};
  },[]);
  const t=copy[locale as keyof typeof copy]||copy.de;
  if(!manifestAvailable||standalone||dismissed||resolved)return null; // only a configured PWA can be offered
  const hasPrompt=deferredPrompt!==null;
  const userAgent=typeof navigator!=="undefined"?navigator.userAgent:"";
  const mode:Mode=hasPrompt?"prompt":isIosSafari(userAgent)?"ios":"instructions";
  async function install(){
    const event=deferredPrompt;
    if(!event)return;
    try{await event.prompt();await event.userChoice;}catch{/* user/browser owns the outcome */}
    deferredPrompt=null;setResolved(true); // user-initiated only; respect the single choice
  }
  function dismiss(){
    setDismissed(true);
    try{localStorage.setItem(DISMISS_KEY,"1");}catch{/* storage optional */}
  }
  const body=mode==="prompt"?t.prompt:mode==="ios"?t.ios:t.generic;
  return <section className="install-invitation" aria-labelledby="install-invitation-title" data-testid="install-invitation" data-mode={mode}>
    <Logo variante="figur" groesse="s" className="install-invitation-mark"/>
    <div className="install-invitation-copy">
      <h2 id="install-invitation-title">{t.title}</h2>
      <p data-testid="install-invitation-text">{body}</p>
      <p className="install-invitation-note">{t.note}</p>
    </div>
    <div className="install-invitation-actions">
      {mode==="prompt"&&<button type="button" className="primary-button" data-testid="install-invitation-install" onClick={install}>{t.install}</button>}
      <button type="button" className="text-button" data-testid="install-invitation-dismiss" onClick={dismiss}>{t.dismiss}</button>
    </div>
  </section>;
}
