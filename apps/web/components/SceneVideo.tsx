"use client";

import {useRef, useState} from "react";
import "./SceneVideo.css";

const words = {
  de: {play: "Video mit Ton abspielen", label: "Markeninszenierung · KI-generiert", title: "Markenszene mit Pascal, NeX und AIFly ORACLE"},
  nl: {play: "Video met geluid afspelen", label: "Merkscène · AI-gegenereerd", title: "Merkscène met Pascal, NeX en AIFly ORACLE"},
  fr: {play: "Lire la vidéo avec le son", label: "Mise en scène de marque · générée par IA", title: "Scène de marque avec Pascal, NeX et AIFly ORACLE"},
  en: {play: "Play the video with sound", label: "Brand scene · AI-generated", title: "Brand scene with Pascal, NeX and AIFly ORACLE"},
} as const;

/**
 * Brand scene with its original sound, laid over the still image of a page hero.
 * Nothing loads or moves until the visitor presses play; then the film runs once
 * with sound and the browser's own controls. The still stays as poster and fallback.
 * Owner decision 2026-11-13: sound on, no captions (see docs/design/scene-videos-2026-11-13.md).
 */
export function SceneVideo({src, locale}: {src: string; locale: string}) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = words[(locale in words ? locale : "de") as keyof typeof words];
  if (failed) return null;
  const start = () => {
    const node = video.current;
    if (!node) return;
    setStarted(true);
    node.muted = false;
    node.play().catch(() => setStarted(false));
  };
  return <>
    <video ref={video} className="scene-video" data-testid="scene-video" data-started={started} src={src} playsInline preload="none"
      controls={started} title={text.title} tabIndex={started ? 0 : -1} onEnded={() => setStarted(false)} onError={() => setFailed(true)}/>
    {!started && <div className="scene-video-bar">
      <span className="scene-video-label">{text.label}</span>
      <button type="button" className="scene-video-play" onClick={start} data-testid="scene-video-play">{text.play}</button>
    </div>}
  </>;
}
