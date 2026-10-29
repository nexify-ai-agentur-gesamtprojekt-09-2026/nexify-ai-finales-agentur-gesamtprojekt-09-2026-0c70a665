import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import {isPublicVideo,type PublicVideo} from './PresenterVideo';
import {ActionButton,ActionLink} from './ActionControl';
import './IdentityHero.css';

const copy={
 de:{titleStart:'Aus deiner Idee wird',titleAccent:'ein klarer nächster Schritt.',body:'Websites, Apps und Automatisierung für dein Unternehmen. Gemeinsam schauen wir auf dein Vorhaben und finden den passenden Einstieg.',cta:'Vorhaben besprechen',sound:'Ton einschalten',soundOff:'Ton ausschalten',play:'Film abspielen',pause:'Film anhalten',scene:'Pascal, NeX und AI Fly Oracle begrüßen dich',captions:'Untertitel',transcript:'Gesprochenen Text lesen',seek:'Filmposition',loading:'Film wird geladen …',error:'Der Film kann gerade nicht geladen werden. Der Text bleibt verfügbar.',retry:'Erneut laden',download:'Film herunterladen',review:'KI-animierter Film · Qualitätsüberarbeitung',reduced:'Bewegung reduziert. Du startest den Film selbst.'},
 nl:{titleStart:'Van jouw idee naar',titleAccent:'een duidelijke volgende stap.',body:'Websites, apps en automatisering voor jouw bedrijf. Samen kijken we naar je plan en vinden we de juiste ingang.',cta:'Plan bespreken',sound:'Geluid aan',soundOff:'Geluid uit',play:'Film afspelen',pause:'Film pauzeren',scene:'Pascal, NeX en AI Fly Oracle verwelkomen jou',captions:'Ondertiteling',transcript:'Gesproken tekst lezen (Duits)',seek:'Filmpositie',loading:'Film wordt geladen …',error:'De film kan niet worden geladen. De tekst blijft beschikbaar.',retry:'Opnieuw laden',download:'Film downloaden',review:'AI-geanimeerde film · kwaliteitsherziening · Duits',reduced:'Beweging beperkt. Je start de film zelf.'},
 fr:{titleStart:'De ton idée à',titleAccent:'une prochaine étape claire.',body:'Sites web, applications et automatisation pour ton entreprise. Ensemble, nous examinons ton projet et trouvons le bon point de départ.',cta:'Discuter du projet',sound:'Activer le son',soundOff:'Couper le son',play:'Lire le film',pause:'Mettre en pause',scene:'Pascal, NeX et AI Fly Oracle te saluent',captions:'Sous-titres',transcript:'Lire le texte (allemand)',seek:'Position du film',loading:'Chargement du film…',error:'Le film ne peut pas être chargé. Le texte reste disponible.',retry:'Réessayer',download:'Télécharger le film',review:'Film animé par IA · révision qualitative · allemand',reduced:'Mouvements réduits. Tu démarres le film.'}
};
const transcript=[
 ['Pascal','Hallo, ich bin Pascal. Willkommen bei NeXify! Schön, dass du da bist. Wir schauen gemeinsam, was dein Unternehmen wirklich braucht – und wie deine vorhandenen Systeme dabei helfen können.'],
 ['NeX','Ich bin NeX. Geht es um eine Website, einen automatisierten Ablauf oder ein Kundenportal? Du kannst hier direkt deinen Einstieg wählen.'],
 ['AI Fly Oracle','Und ich bin AI Fly Oracle. Ich helfe dir, dein Vorhaben zu ordnen, offene Fragen sichtbar zu machen und den nächsten Schritt vorzubereiten.'],
 ['Pascal','Schau dich in Ruhe um. Womit möchtest du anfangen?']
];
const clock=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export default function IdentityHero({locale,intro:_intro,actions:_actions,video}:{locale:Locale;intro:string;actions:ReactNode;video?:PublicVideo}){
 const t=copy[locale];void _intro;void _actions;
 const approvedVideo=isPublicVideo(video,locale)?video:undefined;
 const videoRef=useRef<HTMLVideoElement>(null);
 const [soundOn,setSoundOn]=useState(false),[playing,setPlaying]=useState(false),[captions,setCaptions]=useState(false);
 const [reduced,setReduced]=useState(false),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 const [position,setPosition]=useState(0),[duration,setDuration]=useState(0);
 useEffect(()=>{
  setFailed(false);setLoaded(false);setPosition(0);setDuration(0);
  const node=videoRef.current;const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{setReduced(motion.matches);if(motion.matches)node?.pause();};change();
  if(!motion.matches)node?.play().catch(()=>{});
  const other=(e:Event)=>{if((e as CustomEvent).detail!=='identity-hero')node?.pause();};
  motion.addEventListener('change',change);window.addEventListener('nexify:presenter-play',other);
  return()=>{node?.pause();motion.removeEventListener('change',change);window.removeEventListener('nexify:presenter-play',other);};
 },[approvedVideo?.src]);
 const captionMode=(enabled:boolean)=>{const tracks=videoRef.current?.textTracks;if(tracks)for(let i=0;i<tracks.length;i++)tracks[i].mode=enabled?'showing':'hidden';};
 const toggleCaptions=()=>{setCaptions(v=>{captionMode(!v);return !v;});};
 const toggleSound=()=>{const node=videoRef.current;if(!node)return;node.muted=!node.muted;setSoundOn(!node.muted);};
 const togglePlay=()=>{const node=videoRef.current;if(!node)return;if(!node.paused){node.pause();return;}window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:'identity-hero'}));node.play().catch(()=>setFailed(true));};
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state={failed?'error':loaded?'film':'loading'} data-identity-layout="zielbild-v2">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline"><span>{t.titleStart}</span>{' '}<span className="identity-title-accent">{t.titleAccent}</span></h1>
    <p className="identity-body" data-testid="hero-description">{t.body}</p>
    <div className="identity-links"><ActionLink variant="text" className="identity-primary-link" href="/leistungsumfang" data-testid="hero-project-link"><span>{t.cta}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink><ActionLink variant="quiet" className="identity-secondary-link" href="/leistungen" data-testid="hero-services-link">{locale==='de'?'Leistungen ansehen':locale==='nl'?'Diensten bekijken':'Voir les services'}</ActionLink></div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    <div className="identity-stage" data-testid="hero-stage">
     <video key={approvedVideo?.src||'welcome-draft'} ref={videoRef} className="identity-video" muted={!soundOn} playsInline preload="metadata" poster={approvedVideo?.poster||'/media/home-review/welcome-review-poster.jpg'} aria-label={approvedVideo?.title||t.scene} data-testid="hero-video" tabIndex={0}
      onLoadedData={()=>setLoaded(true)} onLoadedMetadata={()=>{setDuration(videoRef.current?.duration||0);captionMode(captions);}}
      onTimeUpdate={()=>setPosition(videoRef.current?.currentTime||0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}
      onKeyDown={e=>{if([' ','k','m','c'].includes(e.key.toLowerCase())){e.preventDefault();if(e.key===' '||e.key.toLowerCase()==='k')togglePlay();if(e.key.toLowerCase()==='m')toggleSound();if(e.key.toLowerCase()==='c')toggleCaptions();}}}>
      {approvedVideo?<source src={approvedVideo.src} type={approvedVideo.mime}/>:<><source src="/media/home-review/welcome-review.webm" type="video/webm"/><source src="/media/home-review/welcome-review.mp4" type="video/mp4"/></>}
      <track kind="captions" src={approvedVideo?.captionsSrc||'/media/home-review/welcome-review.vtt'} srcLang={approvedVideo?.locale||'de'} label={approvedVideo?.locale||'Deutsch'} onLoad={()=>captionMode(captions)}/>
     </video>
    </div>
    <div className="identity-controls" role="group" aria-label={t.scene} data-testid="hero-controls">
     <ActionButton variant="secondary" className="identity-sound" onClick={togglePlay} disabled={failed} aria-pressed={playing} data-testid="hero-play-toggle">{playing?t.pause:t.play}</ActionButton>
     <ActionButton variant="secondary" className="identity-sound" onClick={toggleSound} disabled={failed} aria-pressed={soundOn} data-testid="hero-sound-toggle">{soundOn?t.soundOff:t.sound}</ActionButton>
     <ActionButton variant="secondary" className="identity-sound" onClick={toggleCaptions} disabled={failed} aria-pressed={captions} data-testid="hero-captions-toggle">{t.captions}</ActionButton>
    </div>
    <div className="identity-timeline"><input className="identity-progress" type="range" min="0" max={duration||1} step="0.1" value={position} aria-label={t.seek} disabled={!loaded||failed} onChange={e=>{const value=Number(e.target.value);if(videoRef.current)videoRef.current.currentTime=value;setPosition(value);}} data-testid="hero-progress-slider"/><span data-testid="hero-time">{clock(position)} / {clock(duration)}</span></div>
    {!loaded&&!failed&&<p className="identity-media-status" role="status" data-testid="hero-loading">{t.loading}</p>}
    {failed&&<div className="identity-error" role="alert" data-testid="hero-error"><p>{t.error}</p><ActionButton variant="secondary" className="identity-sound" onClick={()=>{setFailed(false);setLoaded(false);videoRef.current?.load();}} data-testid="hero-retry">{t.retry}</ActionButton></div>}
    {reduced&&<p className="identity-media-status" data-testid="hero-reduced-motion">{t.reduced}</p>}
    {!approvedVideo&&<p className="identity-media-status" data-testid="hero-review-note">{locale==='de'?'Neue Begrüßungsfassung · zur Abstimmung':locale==='nl'?'Nieuwe welkomstfilm · ter beoordeling':'Nouvelle version du film · à valider'}</p>}
    <details className="identity-transcript" data-testid="hero-transcript"><summary data-testid="hero-transcript-toggle">{t.transcript}</summary>{approvedVideo?<p lang={approvedVideo.locale} data-testid="hero-transcript-approved">{approvedVideo.transcript}</p>:transcript.map(([speaker,line],i)=><p key={i} lang="de" data-testid={`hero-transcript-line-${i}`}><strong>{speaker}: </strong>{line}</p>)}<a href={approvedVideo?.src||'/media/home-review/welcome-review.mp4'} download data-testid="hero-download">{t.download}</a></details>
   </div>
  </div>
 </section>;
}
