import {useEffect,useState,type ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import PresenterScene from './PresenterScene';
import './IdentityHero.css';

const copy={
 de:{
  eyebrow:'NeXify AI · Chat it. Automate it.',
  titleStart:'Websites, Apps und KI,',
  titleAccent:'die für dich arbeiten.',
  body:'Wir verbinden deinen digitalen Auftritt mit den Abläufen dahinter. Persönlich geplant. Gemeinsam umgesetzt.',
  cta:'Unsere Leistungen',
  sound:'Ton einschalten',
  soundOff:'Ton ausschalten',
  scene:'Pascal, NeX und AI Fly Oracle begrüßen dich',
  stageLabel:'Bühne',
  note:'Begrüßungsszene · Film folgt in Kürze.',
  grid:['Design nach DIN EN ISO 9241-125 / 303','Satz nach DIN 1450 · Modular Scale 1.333','Kontraste WCAG 2.2 AAA','Interaktion ≥ 44 × 44 px'],
  steps:[['Verstehen.','Ausgangspunkt sind die Aufgaben, die heute Zeit und Aufmerksamkeit kosten.'],['Bewusst entscheiden.','Du bestimmst Ziel, Grenzen und den nächsten Schritt.'],['Geordnet weiterarbeiten.','NeX und AI Fly Oracle begleiten Verbindung und Orientierung.']]
 },
 nl:{
  eyebrow:'NeXify AI · Chat it. Automate it.',
  titleStart:'Websites, apps en AI,',
  titleAccent:'die voor jou werken.',
  body:'We verbinden je digitale uitstraling met de processen erachter. Persoonlijk gepland. Samen gerealiseerd.',
  cta:'Onze diensten',
  sound:'Geluid aan',
  soundOff:'Geluid uit',
  scene:'Pascal, NeX en AI Fly Oracle verwelkomen jou',
  stageLabel:'Podium',
  note:'Welkomstscène · Film volgt binnenkort.',
  grid:['Ontwerp volgens DIN EN ISO 9241','Zetwerk volgens DIN 1450','Contrasten WCAG 2.2 AAA','Interactie ≥ 44 × 44 px'],
  steps:[['Begrijpen.','We beginnen bij de taken die vandaag tijd en aandacht vragen.'],['Bewust kiezen.','Jij bepaalt het doel, de grenzen en de volgende stap.'],['Geordend verderwerken.','NeX en AI Fly Oracle begeleiden verbinding en oriëntatie.']]
 },
 fr:{
  eyebrow:'NeXify AI · Chat it. Automate it.',
  titleStart:'Des sites, apps et IA',
  titleAccent:'qui travaillent pour toi.',
  body:'Nous relions ta présence numérique aux processus qui l’animent. Pensé avec toi, réalisé ensemble.',
  cta:'Nos services',
  sound:'Activer le son',
  soundOff:'Couper le son',
  scene:'Pascal, NeX et AI Fly Oracle te saluent',
  stageLabel:'Scène',
  note:'Scène de bienvenue · Vidéo à venir.',
  grid:['Conception selon DIN EN ISO 9241','Typographie selon DIN 1450','Contrastes WCAG 2.2 AAA','Interaction ≥ 44 × 44 px'],
  steps:[['Comprendre.','Nous partons des tâches qui demandent du temps et de l’attention aujourd’hui.'],['Choisir consciemment.','Tu définis l’objectif, les limites et la prochaine étape.'],['Avancer avec méthode.','NeX et AI Fly Oracle accompagnent la connexion et l’orientation.']]
 }
};

/**
 * Hero V5 – vermessene Begrüßungsbühne.
 * - 8-pt Basisgrid, modulare Typo-Skala 1.333 (Perfect Fourth), DIN 1450 Lesewerte.
 * - Goldener Schnitt (φ ≈ 1.618) für Spalten- und Figurenpositionen.
 * - Echte 3D-Bühne mit perspective 1600 px, geneigter Bodenebene und Reflektionsebene.
 * - WCAG 2.2 AAA Kontraste; prefers-reduced-motion respektiert.
 */
export default function IdentityHero({locale,intro:_intro,actions:_actions}:{locale:Locale;intro:string;actions:ReactNode}){
 const t=copy[locale];
 void _intro;void _actions;
 const [videoReady,setVideoReady]=useState(false);
 const [soundOn,setSoundOn]=useState(false);
 const videoSrc='/media/runway/hero.mp4';
 useEffect(()=>{
  let cancelled=false;
  fetch(videoSrc,{method:'HEAD'}).then(r=>{
   const ct=r.headers.get('content-type')||'';
   if(!cancelled && r.ok && ct.startsWith('video/')) setVideoReady(true);
  }).catch(()=>{});
  return()=>{cancelled=true;};
 },[]);
 return <section className="identity-hero" aria-labelledby="home-headline" data-media-state={videoReady?'approved-video':'interim-images-video-pending'} data-identity-layout="accepted-v5">
  <div className="identity-scene">
   <div className="identity-copy">
    <p className="identity-eyebrow">{t.eyebrow}</p>
    <h1 id="home-headline"><span>{t.titleStart}</span><br/><span className="identity-title-accent">{t.titleAccent}</span></h1>
    <p className="identity-body">{t.body}</p>
    <a className="identity-primary-link" href="#leistungen" data-testid="hero-services-link">
     <span>{t.cta}</span><span aria-hidden="true" className="identity-primary-arrow">→</span>
    </a>
    <dl className="identity-standards" aria-label="Gestaltungsgrundlage" data-testid="hero-standards">
     {t.grid.map(line=><div key={line} className="identity-standard"><dt aria-hidden="true">✓</dt><dd>{line}</dd></div>)}
    </dl>
   </div>
   <div className="identity-stage" role="group" aria-label={t.scene} data-video={videoReady?'on':'off'}>
    <div className="identity-stage-depth" aria-hidden="true">
     <div className="identity-key-light"/>
     <div className="identity-fill-light"/>
     <div className="identity-rim-light"/>
     <div className="identity-floor-plane">
      <div className="identity-floor-grid"/>
      <div className="identity-floor-horizon"/>
     </div>
     <div className="identity-floor-glow"/>
    </div>
    {videoReady?(
     <video key={soundOn?'on':'off'} className="identity-video" src={videoSrc} autoPlay muted={!soundOn} loop playsInline preload="metadata" aria-label={t.scene}/>
    ):(
     <div className="identity-walk-in">
      <div className="identity-shadow identity-shadow-nex" aria-hidden="true"/>
      <div className="identity-shadow identity-shadow-pascal" aria-hidden="true"/>
      <div className="identity-shadow identity-shadow-aifly" aria-hidden="true"/>
      {(['nex','pascal','aifly'] as const).map(speaker=><div key={speaker} className={`identity-figure identity-figure-${speaker}`}><PresenterScene speaker={speaker} title={t.scene} locale={locale} hero/></div>)}
     </div>
    )}
    <div className="identity-stage-vignette" aria-hidden="true"/>
    {videoReady&&<button type="button" className="identity-sound" onClick={()=>setSoundOn(v=>!v)} aria-pressed={soundOn} data-testid="hero-sound-toggle">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>{soundOn?<><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></>:<path d="m16 9 5 6M21 9l-5 6"/>}</svg>
     <span>{soundOn?t.soundOff:t.sound}</span>
    </button>}
    {!videoReady&&<p className="identity-note" data-testid="hero-note">{t.note}</p>}
   </div>
  </div>
  <ol className="identity-story">{t.steps.map(([title,body],i)=><li key={i}><span className="identity-step-number" aria-hidden="true">0{i+1}</span><h2>{title}</h2><p>{body}</p></li>)}</ol>
 </section>;
}
