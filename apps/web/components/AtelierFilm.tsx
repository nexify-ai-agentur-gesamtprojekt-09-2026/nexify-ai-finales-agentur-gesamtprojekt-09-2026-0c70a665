"use client";
import {useEffect,useId,useRef,useState} from 'react';
import type {Locale} from '../lib/i18n';
import {autoStartEditorialVideo} from '../lib/editorial-autoplay';
import './AtelierFilm.css';

const words={de:{play:'Film abspielen',replay:'Erneut abspielen',pause:'Film pausieren',loading:'Video lädt …',voice:'Film mit Ton starten',mute:'Ton ausschalten',error:'Der Film ist gerade nicht verfügbar.',transcript:'Gesprochener Text'},nl:{play:'Film afspelen',replay:'Opnieuw afspelen',pause:'Film pauzeren',loading:'Video laden …',voice:'Film met geluid · DE',mute:'Geluid uit',error:'De film is momenteel niet beschikbaar.',transcript:'Gesproken tekst · DE'},fr:{play:'Lire le film',replay:'Revoir le film',pause:'Mettre en pause',loading:'Chargement de la vidéo …',voice:'Film avec le son · DE',mute:'Couper le son',error:'Le film est indisponible.',transcript:'Texte parlé · DE'},en:{play:'Play film',replay:'Play again',pause:'Pause film',loading:'Loading video …',voice:'Play with sound · DE',mute:'Mute',error:'The film is currently unavailable.',transcript:'Spoken text · DE'}};
const audioWords={de:{captions:'Untertitel',volume:'Lautstärke'},nl:{captions:'Ondertiteling',volume:'Volume'},fr:{captions:'Sous-titres',volume:'Volume'},en:{captions:'Captions',volume:'Volume'}};
export type AtelierAsset={src:string;poster:string;width:number;height:number;title:string;captions?:string;transcript?:string;playOnce?:boolean;hasAudio?:boolean;autoplayWithAudio?:boolean};
/** Editorial motion. End, buffering, manual pause and temporary visibility pauses remain distinct. */
export default function AtelierFilm({asset,locale,hero=false}:{asset:AtelierAsset;locale:Locale;hero?:boolean}){
 const ref=useRef<HTMLVideoElement>(null),root=useRef<HTMLDivElement>(null),id=useId();
 const alive=useRef(true),generation=useRef(0),manualAction=useRef(0),userPaused=useRef(false);
 const [playing,setPlaying]=useState(false),[muted,setMuted]=useState(true),[failed,setFailed]=useState(false),[ended,setEnded]=useState(false),[buffering,setBuffering]=useState(false),[progress,setProgress]=useState(0);
 const [captions,setCaptions]=useState(true),[volume,setVolume]=useState(.8);
 const t=words[locale],a=audioWords[locale],playLabel=ended?t.replay:t.play;
 function captionMode(enabled:boolean){const tracks=ref.current?.textTracks;if(tracks)for(let i=0;i<tracks.length;i++)tracks[i].mode=enabled?'showing':'hidden';}
 useEffect(()=>{
  const video=ref.current,box=root.current;if(!video||!box)return;
  alive.current=true;generation.current++;userPaused.current=false;setFailed(false);setEnded(false);setBuffering(false);setProgress(0);
  let visible=false,disposed=false,audioAttempted=false;
  const pref=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  async function start(){
   if(disposed||!visible||pref.matches||connection?.saveData||document.hidden||video!.ended||userPaused.current)return;
   const action=manualAction.current;
   const audible=hero&&asset.hasAudio===true&&asset.autoplayWithAudio===true&&!audioAttempted;
   audioAttempted=true;
   const result=await autoStartEditorialVideo(video!,audible);
   if(disposed)return;
   if(action!==manualAction.current){if(userPaused.current)video!.pause();return;}
   if(!visible||pref.matches||document.hidden){video!.pause();return;}
   setMuted(result.muted);
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>=.35;if(!visible){video.pause();setBuffering(false);}else void start();},{threshold:[0,.35]});
  const preference=()=>{if(pref.matches){video.pause();setBuffering(false);}else void start();};
  const hidden=()=>{if(document.hidden){video.pause();setBuffering(false);}else void start();};
  const other=(e:Event)=>{if((e as CustomEvent<string>).detail!==id){userPaused.current=true;manualAction.current++;video.pause();setBuffering(false);}};
  observer.observe(box);pref.addEventListener('change',preference);document.addEventListener('visibilitychange',hidden);window.addEventListener('nexify:presenter-play',other);
  return()=>{disposed=true;alive.current=false;generation.current++;observer.disconnect();pref.removeEventListener('change',preference);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('nexify:presenter-play',other);video.pause();};
 },[asset.src,asset.hasAudio,asset.autoplayWithAudio,hero,id]);
 function pause(){userPaused.current=true;manualAction.current++;ref.current?.pause();setBuffering(false);}
 async function play(withVoice=false){
  const video=ref.current;if(!video)return;
  const attempt=generation.current;manualAction.current++;userPaused.current=false;setFailed(false);setBuffering(true);
  if(video.error)video.load();
  if(video.ended||withVoice){video.currentTime=0;setProgress(0);setEnded(false);}
  if(withVoice){if(video.volume===0){video.volume=.8;setVolume(.8);}video.muted=false;setMuted(false);}
  window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:id}));
  try{await video.play();}catch(error){if(alive.current&&attempt===generation.current&&!(error instanceof DOMException&&error.name==='AbortError')){setFailed(true);setBuffering(false);}}
 }
 return <div ref={root} className={'atelier-film'+(hero?' atelier-film-hero':'')} data-film={asset.title} data-playback={failed?'error':ended?'ended':buffering?'buffering':playing?'playing':'paused'}>
  <div className="atelier-film-picture">
   {failed&&<img className="atelier-film-fallback" src={asset.poster} alt={asset.title} width={asset.width} height={asset.height}/>}
   <video ref={ref} src={asset.src} poster={asset.poster} width={asset.width} height={asset.height} preload={hero?'metadata':'none'} playsInline muted={muted} loop={!hero&&!asset.playOnce} aria-label={asset.title}
    onLoadedMetadata={()=>{if(ref.current)ref.current.volume=volume;captionMode(captions);}} onPlay={()=>{setPlaying(true);setEnded(false);}} onPlaying={()=>{setPlaying(true);setBuffering(false);setFailed(false);}} onPause={()=>{setPlaying(false);setBuffering(false);}}
    onWaiting={()=>{if(ref.current&&!ref.current.paused)setBuffering(true);}} onTimeUpdate={()=>{const v=ref.current;if(v&&Number.isFinite(v.duration)&&v.duration>0)setProgress(v.currentTime/v.duration);}}
    onEnded={()=>{setPlaying(false);setBuffering(false);setEnded(true);setProgress(1);}} onError={()=>{setFailed(true);setBuffering(false);setPlaying(false);}}>
    {asset.captions&&<track kind="captions" src={asset.captions} srcLang="de" label="Deutsch" default onLoad={()=>captionMode(captions)}/>}
   </video>
   {buffering&&<span className="atelier-film-loading" role="status">{t.loading}</span>}
   <div className="atelier-film-controls">
    <button type="button" aria-label={playing?t.pause:playLabel} onClick={()=>playing?pause():void play()}><svg className="atelier-playback-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">{playing?<><rect x="5" y="4" width="3" height="12" rx=".7"/><rect x="12" y="4" width="3" height="12" rx=".7"/></>:<path d="M6 3.8a.7.7 0 0 1 1.05-.6l9.2 6.2a.7.7 0 0 1 0 1.2l-9.2 6.2A.7.7 0 0 1 6 16.2Z"/>}</svg><span>{playing?t.pause:playLabel}</span></button>
    {hero&&asset.hasAudio!==false&&<button type="button" aria-label={muted?t.voice:t.mute} onClick={()=>{if(muted)void play(true);else{if(ref.current)ref.current.muted=true;setMuted(true);}}}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4Z"/>{muted?<path d="m17 9 5 6m0-6-5 6"/>:<path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>}</svg><span>{muted?t.voice:t.mute}</span></button>}
    {asset.captions&&<button type="button" aria-label={a.captions} aria-pressed={captions} onClick={()=>{const next=!captions;setCaptions(next);captionMode(next);}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9a3 3 0 1 0 0 6m9-6a3 3 0 1 0 0 6"/></svg><span>{a.captions}</span></button>}
    {hero&&asset.hasAudio===true&&<details className="atelier-volume"><summary aria-label={a.volume}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false"><path d="M6 4v16M18 4v16M3 9h6m6 6h6"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="15" r="2"/></svg><span className="visually-hidden">{a.volume}</span></summary><div><label htmlFor={id+'-volume'}>{a.volume}<input id={id+'-volume'} type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>{const next=Number(e.target.value);setVolume(next);if(ref.current){ref.current.volume=next;ref.current.muted=next===0;}setMuted(next===0);}}/></label></div></details>}
   </div>
   {hero&&<div className="atelier-film-progress" aria-hidden="true"><span style={{transform:`scaleX(${progress})`}}/></div>}
  </div>
  {failed&&<p role="status" className="atelier-film-error">{t.error}</p>}
  {hero&&asset.transcript&&<details className="atelier-film-transcript"><summary>{t.transcript}</summary><p lang="de">{asset.transcript}</p></details>}
 </div>;
}
