"use client";

import {useEffect, useRef, useState} from 'react';
import type {Locale} from '../lib/i18n';
import './HomeStudioScene.css';

const scene={
 de:{kicker:'NeXify Atelier · KI-generierte Szene',title:'Ideen werden greifbar.',body:'Pascal zeigt, wie aus einem Gespräch ein zusammenhängender digitaler Auftritt entsteht.',play:'Szene abspielen',pause:'Szene pausieren',fallback:'Die Atelier-Szene ist gerade nicht verfügbar.'},
 nl:{kicker:'NeXify atelier · AI-gegenereerde scène',title:'Ideeën worden tastbaar.',body:'Pascal laat zien hoe een gesprek uitgroeit tot één samenhangende digitale presentatie.',play:'Scène afspelen',pause:'Scène pauzeren',fallback:'De atelierscène is momenteel niet beschikbaar.'},
 fr:{kicker:'Atelier NeXify · scène générée par IA',title:'Les idées prennent forme.',body:'Pascal montre comment une conversation devient une présence numérique cohérente.',play:'Lire la scène',pause:'Mettre la scène en pause',fallback:'La scène de l’atelier est momentanément indisponible.'},
 en:{kicker:'NeXify studio · AI-generated scene',title:'Ideas take shape.',body:'Pascal shows how a conversation becomes one coherent digital presence.',play:'Play scene',pause:'Pause scene',fallback:'The studio scene is currently unavailable.'},
} as const;
const src='/media/home-review/pascal-studio-scene-20261109.mp4';
const poster='/media/home-review/pascal-studio-scene-20261109.jpg';

export default function HomeStudioScene({locale}:{locale:Locale}){
 const video=useRef<HTMLVideoElement>(null);
 const manuallyPaused=useRef(false);
 const [playing,setPlaying]=useState(false);
 const [failed,setFailed]=useState(false);
 const t=scene[locale];

 useEffect(()=>{
  const node=video.current;
  if(!node)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  const sync=()=>{
   if(!visible||motion.matches||manuallyPaused.current||node.ended){node.pause();return;}
   void node.play().catch(()=>setPlaying(false));
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.35});
  observer.observe(node);
  motion.addEventListener('change',sync);
  return()=>{observer.disconnect();motion.removeEventListener('change',sync);node.pause();};
 },[]);

 function toggle(){
  const node=video.current;
  if(!node)return;
  if(!node.paused){manuallyPaused.current=true;node.pause();return;}
  manuallyPaused.current=false;
  if(node.ended)node.currentTime=0;
  void node.play().catch(()=>setFailed(true));
 }

 return <section className="hc-studio-scene hc-container" aria-labelledby="hc-studio-title" data-testid="home-studio-scene">
  <div className="hc-studio-copy"><span className="hc-kicker">{t.kicker}</span><h2 id="hc-studio-title">{t.title}</h2><p>{t.body}</p></div>
  <div className="hc-studio-media">
   {failed?<img src={poster} width="1280" height="720" alt={t.fallback}/>:<video ref={video} src={src} poster={poster} width="1280" height="720" muted playsInline preload="metadata" aria-label={t.kicker} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setFailed(true)}/>}
   {!failed&&<button type="button" onClick={toggle} aria-label={playing?t.pause:t.play}>{playing?t.pause:t.play}</button>}
  </div>
 </section>;
}
