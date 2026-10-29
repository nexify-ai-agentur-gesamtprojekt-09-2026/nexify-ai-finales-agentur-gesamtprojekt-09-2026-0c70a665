"use client";

import {useEffect, useId, useRef, useState} from "react";
import "./PresenterVideo.css";

export type PublicVideo = {
  id: string; version: number; locale: "de" | "nl" | "fr";
  src: string; mime: "video/mp4" | "video/webm"; captionsSrc: string;
  transcript: string; title: string; poster?: string | null;
  width: number; height: number; durationSeconds: number;
};

const words = {
  de: {play:"Video abspielen", pause:"Video pausieren", mute:"Ton ausschalten", unmute:"Ton einschalten", captions:"Untertitel", transcript:"Transkript", error:"Das Video kann gerade nicht abgespielt werden. Der Text bleibt verfügbar.", reduced:"Bewegung ist reduziert. Das Video startet nur auf deine Auswahl.", label:"Videosteuerung"},
  nl: {play:"Video afspelen", pause:"Video pauzeren", mute:"Geluid uitschakelen", unmute:"Geluid inschakelen", captions:"Ondertiteling", transcript:"Transcript", error:"De video kan nu niet worden afgespeeld. De tekst blijft beschikbaar.", reduced:"Beweging is beperkt. De video start alleen wanneer je die kiest.", label:"Videobediening"},
  fr: {play:"Lire la vidéo", pause:"Mettre la vidéo en pause", mute:"Couper le son", unmute:"Activer le son", captions:"Sous-titres", transcript:"Transcription", error:"La vidéo ne peut pas être lue pour le moment. Le texte reste disponible.", reduced:"Les mouvements sont réduits. La vidéo démarre uniquement sur votre demande.", label:"Commandes vidéo"}
};
const own = (value:unknown, extensions:string) => typeof value === "string" && !value.includes("..") && new RegExp("^/media/[A-Za-z0-9/_-]+\\.(?:"+extensions+")$").test(value);

// This is a rendering guard, not an approval verifier. Only the build's checked
// public registry projection may supply these props; provider/voice data stays private.
export function isPublicVideo(value:unknown, locale:string):value is PublicVideo {
  if (!value || typeof value !== "object") return false;
  const v = value as PublicVideo;
  return typeof v.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v.id) && Number.isSafeInteger(v.version) && v.version > 0 &&
    v.locale === locale && ["de","nl","fr"].includes(v.locale) && own(v.src,"mp4|webm") && own(v.captionsSrc,"vtt") &&
    v.mime === (v.src.endsWith(".webm") ? "video/webm" : "video/mp4") &&
    typeof v.title === "string" && !!v.title.trim() && typeof v.transcript === "string" && !!v.transcript.trim() &&
    (v.poster == null || own(v.poster,"png|webp|jpg|jpeg|avif")) &&
    Number.isSafeInteger(v.width) && v.width > 0 && Number.isSafeInteger(v.height) && v.height > 0 &&
    typeof v.durationSeconds === "number" && Number.isFinite(v.durationSeconds) && v.durationSeconds > 0;
}

export default function PresenterVideo(props:{video:PublicVideo;locale:PublicVideo["locale"];hero?:boolean}) {
  if (!isPublicVideo(props.video,props.locale)) return null;
  return <VideoPlayback key={`${props.video.id}:${props.video.version}:${props.locale}:${props.video.src}`} {...props}/>;
}

function VideoPlayback({video,locale,hero=false}:{video:PublicVideo;locale:PublicVideo["locale"];hero?:boolean}) {
  const element = useRef<HTMLVideoElement>(null);
  const active = useRef(true);
  const id = useId();
  const [playing,setPlaying] = useState(false);
  const [muted,setMuted] = useState(false);
  const [captions,setCaptions] = useState(true);
  const [failed,setFailed] = useState(false);
  const [reduced,setReduced] = useState(false);
  const text = words[locale];
  useEffect(() => {
    active.current = true;
    const node = element.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => {setReduced(preference.matches); if (preference.matches) node?.pause();};
    const anotherStarted = (event:Event) => {if ((event as CustomEvent<string>).detail !== id) node?.pause();};
    motionChanged();
    preference.addEventListener("change",motionChanged);
    window.addEventListener("nexify:presenter-play",anotherStarted);
    return () => {
      active.current = false;
      preference.removeEventListener("change",motionChanged);
      window.removeEventListener("nexify:presenter-play",anotherStarted);
      node?.pause(); // Route, locale and asset changes must never leave speech running.
    };
  },[id,video.id,video.version,video.src,locale]);
  function captionMode(enabled:boolean) {
    const tracks = element.current?.textTracks;
    if (tracks) for (let index=0;index<tracks.length;index++) tracks[index].mode = enabled ? "showing" : "hidden";
  }
  async function togglePlay() {
    const node = element.current;
    if (!node) return;
    if (!node.paused) {node.pause();return;}
    setFailed(false);
    window.dispatchEvent(new CustomEvent("nexify:presenter-play",{detail:id}));
    node.muted = muted;
    try {await node.play();} catch {if (active.current) {setPlaying(false);setFailed(true);}}
  }
  return <div className={`presenter-video${hero ? " presenter-video--hero" : ""}`} role="group" aria-labelledby={`${id}-title`}>
    <span id={`${id}-title`} className="visually-hidden">{video.title}</span>
    <video ref={element} width={video.width} height={video.height} preload="none" playsInline poster={video.poster || undefined}
      aria-label={video.title} aria-describedby={`${id}-transcript`} muted={muted}
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}
      onLoadedMetadata={()=>captionMode(captions)}>
      <source src={video.src} type={video.mime}/>
      <track kind="captions" src={video.captionsSrc} srcLang={locale} label={text.captions} default/>
    </video>
    <div className="presenter-video-controls" role="group" aria-label={text.label}>
      <button type="button" onClick={()=>void togglePlay()}>{playing ? text.pause : text.play}</button>
      <button type="button" onClick={()=>{const next=!muted;setMuted(next);if(element.current)element.current.muted=next;}}>{muted ? text.unmute : text.mute}</button>
      <button type="button" onClick={()=>{const next=!captions;setCaptions(next);captionMode(next);}} aria-pressed={captions}>{text.captions}</button>
    </div>
    {failed ? <p role="status">{text.error}</p> : null}
    {reduced ? <p className="presenter-video-motion">{text.reduced}</p> : null}
    <details id={`${id}-transcript`} className="presenter-video-transcript"><summary>{text.transcript}</summary><p>{video.transcript}</p></details>
  </div>;
}
