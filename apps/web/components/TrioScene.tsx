"use client";
import {useCallback,useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import {sceneLabels,speakerNames,type SceneSpec,type Speaker} from '../lib/home-scenes';
import {ActionButton} from './ActionControl';
import './TrioScene.css';

/**
 * TrioScene – audio-driven, DOM-rendered scene (Masterplan §8: figures free on the page surface,
 * no player box, no autoplay sound, captions + transcript, reduced-motion still).
 * Phases: idle (composed still) → entering (walk-in, 0–4 s) → speaking (cues) → finale (closing graphic) → ended.
 *
 * Two visual modes:
 *  - media: real loop clips (Kling v3 Pro image-to-video from the identity-true frames, no face edits). The optional
 *    intro clip starts only with the user's play action, then the loop follows the audio play/pause state. Audio and
 *    captions are driven by the ElevenLabs track independently of the clip.
 *  - figures: CSS-only cut-outs (fallback when no media is available for a scene).
 * Captions always live below the stage – they never cover a figure.
 */
export type Phase='idle'|'entering'|'speaking'|'finale'|'ended';
export type TrioFigures={pascal:string;nex:string;oracle:string;pascalAspect?:number};
export type ClipSources={mp4:string;webm:string};
export type TrioMedia={intro?:ClipSources;loop:ClipSources;poster:string};
type Props={scene:SceneSpec;locale:Locale;figures:TrioFigures;media?:TrioMedia;testId:string;title:string;finale:ReactNode;children?:ReactNode;startLabel?:string;onPhase?:(phase:Phase)=>void};

const clock=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const Icon={
 play:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg>,
 pause:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><path d="M5.5 4.5h3v11h-3zM11.5 4.5h3v11h-3z" fill="currentColor"/></svg>,
 replay:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><path d="M10 4a6 6 0 1 1-5.2 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 3v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
 sound:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><path d="M3.5 7.5h3l4-3.2v11.4l-4-3.2h-3z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6M15 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
 muted:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><path d="M3.5 7.5h3l4-3.2v11.4l-4-3.2h-3z" fill="currentColor"/><path d="M13 7.5l4 5M17 7.5l-4 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
 captions:<svg viewBox="0 0 20 20" aria-hidden="true" className="trio-icon"><rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M6 9h4M6 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
};

export default function TrioScene({scene,locale,figures,media,testId,title,finale,children,startLabel,onPhase}:Props){
 const t=sceneLabels[locale];
 const uid=useId().replace(/[^a-z0-9]/gi,'');
 const audioRef=useRef<HTMLAudioElement>(null);
 const introRef=useRef<HTMLVideoElement>(null);
 const loopRef=useRef<HTMLVideoElement>(null);
 const [phase,setPhaseState]=useState<Phase>('idle');
 const [speaker,setSpeaker]=useState<Speaker|null>(null);
 const [cueIndex,setCueIndex]=useState(-1);
 const [playing,setPlaying]=useState(false);
 const [muted,setMuted]=useState(false);
 const [captions,setCaptions]=useState(true);
 const [reduced,setReduced]=useState(false);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 const [time,setTime]=useState(0);
 const [duration,setDuration]=useState(0);
 const knownDuration=Number.isFinite(duration)&&duration>0;
 const [clip,setClipState]=useState<'poster'|'intro'|'loop'>('poster');
 const clipModeRef=useRef<'poster'|'intro'|'loop'>('poster');
 const setClip=useCallback((next:'poster'|'intro'|'loop')=>{clipModeRef.current=next;setClipState(next);},[]);
 const [clipFailed,setClipFailed]=useState(false);
 const lastCueEnd=scene.cues[scene.cues.length-1].end;
 const setPhase=useCallback((next:Phase)=>{setPhaseState(prev=>{if(prev!==next)onPhase?.(next);return next;});},[onPhase]);

 // Weg B (NEX-MEDIA-SYNC-20261030-01): ONE scene controller, audio.currentTime is the master clock.
 // The silent ambient loop stays ambient (modulo repetition) and is coupled to the master's STATE
 // (play/pause/seek/stall/ended/replay) only – it is explicitly NOT a lip performance, so no
 // per-frame audio↔video drift correction is applied (there is no matching mouth content).
 const startTokenRef=useRef(0);
 const visualTokenRef=useRef(0);
 const pausedByUserRef=useRef(false);
 const playVisual=useCallback((video:HTMLVideoElement)=>{
  const token=visualTokenRef.current;
  video.play().catch((error:DOMException)=>{
   if(token!==visualTokenRef.current||error?.name==='AbortError'||error?.name==='NotAllowedError')return;
   setClipFailed(true);
  });
 },[]);
 const playLoopAmbient=useCallback(()=>{
  if(!media||reduced||clipFailed||pausedByUserRef.current||!audioRef.current||audioRef.current.paused)return;
  const intro=introRef.current;
  if(media.intro&&intro&&(clipModeRef.current==='poster'||(clipModeRef.current==='intro'&&!intro.ended))){
   setClip('intro');playVisual(intro);
  }else{setClip('loop');if(loopRef.current)playVisual(loopRef.current);}
 },[media,reduced,clipFailed,playVisual,setClip]);
 const freezeLoop=useCallback(()=>{visualTokenRef.current++;introRef.current?.pause();loopRef.current?.pause();},[]);
 const syncLoopToMaster=useCallback((master:number)=>{const l=loopRef.current;if(l&&Number.isFinite(l.duration)&&l.duration>0)l.currentTime=master%l.duration;},[]);
 // Robust play(): a benign AbortError (interrupted by a quick pause/new load) or a blocked
 // NotAllowedError (needs a fresh user gesture) must not be shown as a hard failure; a stale
 // start token (after pause/unmount/locale change) is ignored so a late promise never restarts.
 const playAudio=useCallback((a:HTMLAudioElement)=>{const token=++startTokenRef.current;a.play().then(()=>{}).catch((err:DOMException)=>{if(token!==startTokenRef.current)return;if(err&&(err.name==='AbortError'||err.name==='NotAllowedError'))return;setFailed(true);});},[]);

 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setReduced(motion.matches);change();
  const other=(e:Event)=>{if((e as CustomEvent).detail!==testId){audioRef.current?.pause();freezeLoop();}};
  motion.addEventListener('change',change);window.addEventListener('nexify:presenter-play',other);
  return()=>{startTokenRef.current++;motion.removeEventListener('change',change);window.removeEventListener('nexify:presenter-play',other);audioRef.current?.pause();freezeLoop();};
 },[testId,locale,freezeLoop]);

 // Visibility saves battery; it never starts an idle scene or overrides an explicit pause.
 useEffect(()=>{
  if(!media)return;
  if(reduced){freezeLoop();return;}
  const element=(introRef.current||loopRef.current)?.parentElement;
  if(!element||!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting))playLoopAmbient();else freezeLoop();
  },{threshold:0});
  io.observe(element);return()=>io.disconnect();
 },[media,reduced,playLoopAmbient,freezeLoop]);

 const sync=useCallback((now:number)=>{
  setTime(now);
  const idx=scene.cues.findIndex(c=>now>=c.start&&now<c.end);
  if(idx>=0){setCueIndex(idx);setSpeaker(scene.cues[idx].speaker);setPhase('speaking');return;}
  setSpeaker(null);
  if(now>=lastCueEnd){setPhase('finale');return;}
  if(now<scene.entranceSeconds){setCueIndex(-1);setPhase('entering');return;}
  setPhase('speaking');
 },[scene,lastCueEnd,setPhase]);

 const start=()=>{
  const a=audioRef.current;if(!a)return;
  pausedByUserRef.current=false;
  window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:testId}));
  if(phase==='ended'||a.ended){freezeLoop();a.currentTime=0;if(introRef.current)introRef.current.currentTime=0;setClip('poster');setCueIndex(-1);setSpeaker(null);syncLoopToMaster(0);}
  if(phase==='idle'||phase==='ended')setPhase('entering');
  playAudio(a);
 };
 const toggle=()=>{const a=audioRef.current;if(!a)return;if(!a.paused){pausedByUserRef.current=true;a.pause();freezeLoop();return;}start();};
 const restart=()=>{const a=audioRef.current;if(!a)return;pausedByUserRef.current=false;a.pause();freezeLoop();a.currentTime=0;if(introRef.current)introRef.current.currentTime=0;setClip('poster');setCueIndex(-1);setSpeaker(null);setPhase('entering');syncLoopToMaster(0);window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:testId}));playAudio(a);};
 const toggleMute=()=>{const a=audioRef.current;if(!a)return;a.muted=!a.muted;setMuted(a.muted);};
 const keys=(e:KeyboardEvent<HTMLDivElement>)=>{
  if((e.target as HTMLElement).closest('button,a,input,summary'))return;
  const k=e.key.toLowerCase();
  if(k===' '||k==='k'){e.preventDefault();toggle();}else if(k==='m'){e.preventDefault();toggleMute();}else if(k==='c'){e.preventDefault();setCaptions(v=>!v);}
 };
 const showFinale=phase==='finale'||phase==='ended';
 const mainLabel=playing?t.pause:phase==='idle'?(startLabel||t.startGeneric):phase==='ended'?t.restart:t.resume;
 const mainIcon=playing?Icon.pause:phase==='ended'?Icon.replay:Icon.play;
 const useMedia=Boolean(media)&&!clipFailed;
 const classes=['trio-scene',`trio-${scene.id}`,`is-${phase}`,playing?'is-playing':'is-paused',reduced?'is-reduced':'',captions?'captions-on':'',useMedia?'has-media':'has-figures',useMedia?`clip-${reduced?'poster':clip}`:''].filter(Boolean).join(' ');
 const figure=(key:Speaker,src:string,alt:string)=>(
  <div className={`trio-figure trio-${key} ${speaker===key?'is-speaking':speaker?'is-listening':''}`} data-testid={`${testId}-figure-${key}`}>
   <img className="trio-body" src={src} alt={alt} draggable={false} loading={scene.id==='welcome'?'eager':'lazy'} decoding="async"/>
   <img className="trio-reflection" src={src} alt="" aria-hidden="true" draggable={false} loading="lazy" decoding="async"/>
   <span className="trio-contact" aria-hidden="true"/>
  </div>);
 const cue=captions&&speaker&&cueIndex>=0?scene.cues[cueIndex]:null;

 return <div className={classes} data-testid={`${testId}-scene`} data-phase={phase} data-film-id={scene.filmId} data-speaker={speaker||''} data-clip={useMedia?(reduced?'poster':clip):'figures'}>
  <div className="trio-frame">
  <div className="trio-stage" role="group" aria-label={title} tabIndex={0} onKeyDown={keys} data-testid={`${testId}-stage`} style={{'--pascal-aspect':figures.pascalAspect||2.2} as CSSProperties}>
   <svg className="trio-light" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
     <linearGradient id={`${uid}-lime`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="var(--color-marke-lime)" stopOpacity="0"/><stop offset=".45" stopColor="var(--color-marke-lime)" stopOpacity=".9"/><stop offset="1" stopColor="var(--color-marke-lime)" stopOpacity="0"/></linearGradient>
     <linearGradient id={`${uid}-cyan`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="var(--color-marke-cyan)" stopOpacity="0"/><stop offset=".55" stopColor="var(--color-marke-cyan)" stopOpacity=".7"/><stop offset="1" stopColor="var(--color-marke-cyan)" stopOpacity="0"/></linearGradient>
     <filter id={`${uid}-glow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>
    <g className="trio-ribbons">
     <path className="trio-ribbon trio-ribbon-glow" d="M-120 640 C 320 420, 720 720, 1120 400 S 1720 300, 1900 150" stroke={`url(#${uid}-lime)`} filter={`url(#${uid}-glow)`}/>
     <path className="trio-ribbon" d="M-120 640 C 320 420, 720 720, 1120 400 S 1720 300, 1900 150" stroke={`url(#${uid}-lime)`}/>
     <path className="trio-ribbon trio-ribbon-soft" d="M-120 790 C 380 600, 880 900, 1760 420" stroke={`url(#${uid}-lime)`}/>
     <path className="trio-ribbon trio-ribbon-cyan" d="M120 1010 C 560 820, 1080 960, 1760 700" stroke={`url(#${uid}-cyan)`}/>
    </g>
   </svg>
   <div className="trio-floor" aria-hidden="true"/>
   {useMedia&&<div className="trio-surface" aria-hidden="true"/>}
   {useMedia&&media&&<div className="trio-media" data-testid={`${testId}-clips`}>
    <img className="trio-poster" src={media.poster} alt={title} draggable={false} loading={scene.id==='welcome'?'eager':'lazy'} decoding="async"/>
    {media.intro&&<video ref={introRef} className="trio-clip trio-clip-intro" muted playsInline preload={scene.id==='welcome'?'auto':'metadata'} disablePictureInPicture aria-hidden="true" tabIndex={-1}
     onEnded={()=>{setClip('loop');if(!reduced&&!pausedByUserRef.current&&audioRef.current&&!audioRef.current.paused&&loopRef.current)playVisual(loopRef.current);}}><source src={media.intro.mp4} type="video/mp4"/><source src={media.intro.webm} type="video/webm"/></video>}
    <video ref={loopRef} className="trio-clip trio-clip-loop" muted loop playsInline preload={scene.id==='welcome'?'auto':'metadata'} disablePictureInPicture aria-hidden="true" tabIndex={-1}><source src={media.loop.mp4} type="video/mp4"/><source src={media.loop.webm} type="video/webm"/></video>
   </div>}
   {!useMedia&&figure('nex',figures.nex,'NeX')}
   {!useMedia&&figure('pascal',figures.pascal,'Pascal')}
   {!useMedia&&figure('oracle',figures.oracle,'AIFly ORACLE')}
   {speaker&&<span className={`trio-speaker-light trio-speaker-${speaker}`} aria-hidden="true"/>}
  </div>
   {children}
   <div className="trio-finale" hidden={!showFinale} data-testid={`${testId}-finale`} data-visible={showFinale}>{finale}</div>
   <div className="trio-caption-bar" aria-live="polite" data-testid={`${testId}-caption-bar`}>
    {cue&&<p className="trio-caption" data-speaker={cue.speaker} lang="de" data-testid={`${testId}-caption`}><strong>{speakerNames[cue.speaker]}</strong><span>{cue.text}</span></p>}
   </div>
   <div className="trio-controls" role="group" aria-label={title} data-testid={`${testId}-controls`}>
    <ActionButton variant="primary" className="trio-control trio-control-main" onClick={toggle} disabled={failed} aria-pressed={playing} data-testid={`${testId}-play-toggle`}>{mainIcon}<span>{mainLabel}</span></ActionButton>
    <ActionButton variant="secondary" className="trio-control" onClick={toggleMute} disabled={failed} aria-pressed={!muted} aria-label={muted?t.soundOff:t.sound} title={muted?t.soundOff:t.sound} data-testid={`${testId}-sound-toggle`}>{muted?Icon.muted:Icon.sound}<span className="trio-control-label">{muted?t.soundOff:t.sound}</span></ActionButton>
    <ActionButton variant="secondary" className="trio-control" onClick={()=>setCaptions(v=>!v)} aria-pressed={captions} title={t.captions} data-testid={`${testId}-captions-toggle`}>{Icon.captions}<span className="trio-control-label">{t.captions}</span></ActionButton>
    {(phase==='speaking'||phase==='finale'||phase==='entering')&&<ActionButton variant="secondary" className="trio-control" onClick={restart} aria-label={t.restart} title={t.restart} data-testid={`${testId}-restart`}>{Icon.replay}<span className="trio-control-label">{t.restart}</span></ActionButton>}
   </div>
  </div>
  <audio ref={audioRef} preload="metadata" src={scene.audioSrc} data-testid={`${testId}-audio`}
   onLoadedMetadata={()=>{setDuration(audioRef.current?.duration||0);setReady(true);}} onCanPlay={()=>setReady(true)}
   onTimeUpdate={()=>sync(audioRef.current?.currentTime||0)} onPlay={()=>{setPlaying(true);playLoopAmbient();}}
   onPlaying={()=>playLoopAmbient()} onWaiting={()=>freezeLoop()} onStalled={()=>freezeLoop()}
   onSeeked={()=>syncLoopToMaster(audioRef.current?.currentTime||0)}
   onPause={()=>{setPlaying(false);if(!audioRef.current?.ended)freezeLoop();}}
   onEnded={()=>{setPlaying(false);setSpeaker(null);setPhase('ended');freezeLoop();}} onError={()=>{setFailed(true);setPlaying(false);freezeLoop();}}/>
  <div className="trio-meta" data-duration={knownDuration?"known":"unknown"}>
   {knownDuration&&<input className="trio-progress" type="range" min="0" max={duration||1} step="0.1" value={time} aria-label={t.position} disabled={!ready||failed} onChange={e=>{const v=Number(e.target.value);if(audioRef.current)audioRef.current.currentTime=v;if(phase==='idle')setPhase('entering');sync(v);syncLoopToMaster(v);}} data-testid={`${testId}-progress-slider`}/>}
   {(knownDuration||time>0)&&<span className="trio-time" data-testid={`${testId}-time`}>{knownDuration?`${clock(time)} / ${clock(duration)}`:clock(time)}</span>}
   <details className="trio-transcript" data-testid={`${testId}-transcript`}><summary data-testid={`${testId}-transcript-toggle`}>{t.transcript}</summary>
    {scene.cues.map((cue,i)=><p key={i} lang="de" data-testid={`${testId}-transcript-line-${i}`}><strong>{speakerNames[cue.speaker]}: </strong>{cue.text}</p>)}
   </details>
  </div>
  <p className="trio-status" role="status" data-testid={`${testId}-status-text`}>
   {failed?t.error:(!ready||!knownDuration)&&playing?t.loading:reduced?t.reduced:phase==='ended'?t.ended:locale!=='de'?t.spokenIn:''}
   {failed&&<ActionButton variant="secondary" className="trio-control trio-retry" onClick={()=>{setFailed(false);audioRef.current?.load();}} data-testid={`${testId}-retry`}>{t.retry}</ActionButton>}
  </p>
 </div>;
}
