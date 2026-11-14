"use client";
import {useEffect,useId,useRef,useState} from "react";
import {Zeichen} from "./Zeichen";

// Dieselben Woerter wie die kompakte Film-Steuerung des Hero (AtelierFilm.tsx).
const words={de:{play:'Abspielen',pause:'Pausieren',voice:'Ton an',mute:'Ton aus'},nl:{play:'Afspelen',pause:'Pauzeren',voice:'Geluid aan',mute:'Geluid uit'},fr:{play:'Lire',pause:'Pause',voice:'Son',mute:'Sans son'},en:{play:'Play',pause:'Pause',voice:'Sound on',mute:'Mute'}} as const;

/**
 * Bewegte Fassung einer Bildflaeche: das Standbild darunter bleibt Poster und Rueckfall.
 * Der Film laedt erst, wenn die Flaeche im Sichtbereich steht, laeuft stumm in Schleife und haelt ausserhalb an.
 * Ton nur auf ausdrueckliche Wahl; wer Ton einschaltet, schaltet jeden anderen Film stumm bzw. haelt ihn an
 * (Ereignis nexify:presenter-play, das auch der Hero-Film kennt). Weniger Bewegung oder Datensparen: nur das Bild.
 */
export function SceneLoop({src,locale}:{src:string;locale:string}){
  const video=useRef<HTMLVideoElement>(null),id=useId();
  const paused=useRef(false),visible=useRef(false);
  const [allowed,setAllowed]=useState(false),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(true),[failed,setFailed]=useState(false);
  const t=words[(locale in words?locale:'de') as keyof typeof words];
  useEffect(()=>{
    const pref=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
    const decide=()=>setAllowed(!pref.matches&&!connection?.saveData);
    decide();pref.addEventListener('change',decide);return()=>pref.removeEventListener('change',decide);
  },[]);
  useEffect(()=>{
    const node=video.current;if(!node||!allowed)return;
    const run=()=>{if(visible.current&&!paused.current&&!document.hidden)node.play().catch(()=>{});else node.pause();};
    const observer=new IntersectionObserver(entries=>{visible.current=(entries.at(-1)?.intersectionRatio??0)>=.6;run();},{threshold:[0,.6]});
    const other=(e:Event)=>{if((e as CustomEvent<string>).detail!==id){node.muted=true;setMuted(true);}};
    observer.observe(node);document.addEventListener('visibilitychange',run);window.addEventListener('nexify:presenter-play',other);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',run);window.removeEventListener('nexify:presenter-play',other);node.pause();};
  },[allowed,id]);
  if(!allowed||failed)return null;
  const toggle=()=>{const node=video.current;if(!node)return;if(node.paused){paused.current=false;node.play().catch(()=>{});}else{paused.current=true;node.pause();}};
  const sound=()=>{const node=video.current;if(!node)return;const next=!node.muted;node.muted=next;setMuted(next);
    if(!next){window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:id}));if(node.paused){paused.current=false;node.play().catch(()=>{});}}};
  return <>
    <video ref={video} className="scene-loop" data-playing={playing} src={src} muted loop playsInline preload="none" tabIndex={-1} aria-hidden="true"
      onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}/>
    <span className="scene-loop-controls">
      <button type="button" onClick={toggle} aria-label={playing?t.pause:t.play} title={playing?t.pause:t.play}><Zeichen name={playing?'pause':'abspielen'}/></button>
      <button type="button" onClick={sound} aria-pressed={!muted} aria-label={muted?t.voice:t.mute} title={muted?t.voice:t.mute}><Zeichen name={muted?'ton-aus':'ton'}/></button>
    </span>
  </>;
}
