"use client";
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {registerPublicInstallation} from '../../site/src/public-installation.mjs';

const WORKER_PATH='/public-install-worker.js',CACHE_PREFIX='nexify-public-';
/** Rückweg: ist die Installation im Build abgeschaltet, wird nur die eigene Registrierung samt eigener Caches entfernt. */
async function retirePublicInstallation(){
 try{
  if(!('serviceWorker' in navigator))return;
  for(const registration of await navigator.serviceWorker.getRegistrations()){
   const worker=registration.active||registration.waiting||registration.installing;
   if(worker&&new URL(worker.scriptURL).pathname===WORKER_PATH)await registration.unregister();
  }
  if('caches' in window)for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX))await caches.delete(key);
 }catch{/* ohne Zugriff bleibt alles, wie es ist */}
}
/**
 * Öffentliche Installation (PWA) von apps/web.
 * Manifest: ein Manifest für den Ursprung („NeXify AI", Start /). TEILEKLAR ist eine eigene Marke ohne eigenes App-Icon;
 * Seiten unter /teileklar verlinken es deshalb nicht. React setzt das <link> in den Kopf.
 * Worker (pwa/worker.js): nur im Produktions-Build mit eingeschalteter Installation, erst nach dem ersten Seitenaufbau
 * und nicht im Datensparmodus. Kein Cookie, kein localStorage, keine Kennung: die Einwilligungslogik
 * (DiagnosticConsent) bleibt unberührt.
 */
export default function PublicInstallation({enabled}:{enabled:boolean}){
 const pathname=usePathname()||'/';
 const teileklar=pathname==='/teileklar'||pathname.startsWith('/teileklar/');
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production')return;
  if(!enabled){void retirePublicInstallation();return;}
  if((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData===true)return;
  // Erst die Seite, dann der Worker: Registrierung und Vorabladen der Offline-Seite laufen nach dem ersten Seitenaufbau.
  let handle=0;
  const idle=()=>{handle=window.setTimeout(()=>void registerPublicInstallation(true),2000);};
  if(document.readyState==='complete')idle();else window.addEventListener('load',idle,{once:true});
  return()=>{window.removeEventListener('load',idle);window.clearTimeout(handle);};
 },[enabled]);
 return enabled&&!teileklar?<link rel="manifest" href="/manifest.webmanifest"/>:null;
}
