"use client";
import {useState,type CSSProperties,type ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import {homeScenes,sceneFigures,sceneMedia} from '../lib/home-scenes';
import type {PublicVideo} from './PresenterVideo';
import TrioScene,{type Phase} from './TrioScene';
import {ActionLink} from './ActionControl';
import {SiteLink} from './Router';
import './IdentityHero.css';

// Kundentext: Masterplan v2 PUB-home H00 (Zeilen 699-701). Hero: Text links, reale Chat-Fläche rechts (Panel),
// Trio frei auf der Bühne nach Zielbild – kein Video-Kasten, keine KI-Veränderung der Figuren.
const copy={
 de:{titleStart:'Aus deiner Idee wird',titleAccent:'ein klarer nächster Schritt.',body:'Websites, Apps und Automatisierung für dein Unternehmen. Gemeinsam schauen wir auf dein Vorhaben und finden den passenden Einstieg.',cta:'Vorhaben besprechen',services:'Leistungen ansehen',scene:'Pascal, NeX und AI Fly Oracle begrüßen dich',start:'Begrüßung starten',finaleTitle:'Dein Ziel. Dein nächster Schritt.',paths:[['Website','Dein Angebot auf den Punkt bringen'],['Ablauf','Weniger Routine. Mehr Überblick.'],['Portal','Ein Zugang für dein Team und deine Kunden']]},
 nl:{titleStart:'Van jouw idee naar',titleAccent:'een duidelijke volgende stap.',body:'Websites, apps en automatisering voor jouw bedrijf. Samen kijken we naar je plan en vinden we de juiste ingang.',cta:'Plan bespreken',services:'Diensten bekijken',scene:'Pascal, NeX en AI Fly Oracle verwelkomen jou',start:'Welkom starten',finaleTitle:'Waar wil je beginnen?',paths:[['Website','Je aanbod helder presenteren'],['Proces','Terugkerend werk vereenvoudigen'],['Portaal','Informatie samen gebruiken']]},
 fr:{titleStart:'De ton idée à',titleAccent:'une prochaine étape claire.',body:'Sites web, applications et automatisation pour ton entreprise. Ensemble, nous examinons ton projet et trouvons le bon point de départ.',cta:'Discuter du projet',services:'Voir les services',scene:'Pascal, NeX et AI Fly Oracle te saluent',start:'Lancer l’accueil',finaleTitle:'Par quoi souhaites-tu commencer ?',paths:[['Site web','Présenter clairement ton offre'],['Processus','Simplifier le travail répétitif'],['Portail','Partager les informations']]},
 en:{"titleStart": "From your idea to", "titleAccent": "a clear next step.", "body": "Websites, apps and automation for your business. Together we look at your project and find the right starting point.", "cta": "Discuss your project", "services": "View services", "scene": "Pascal, NeX and AI Fly Oracle greet you", "start": "Start the welcome", "finaleTitle": "What would you like to start with?", "paths": [["Website", "Present your offer clearly"], ["Process", "Simplify repetitive work"], ["Portal", "Share information"]]}
};
const pathRoutes=['/leistungen/websites','/leistungen/agenten-automatisierung','/leistungen/apps-portale'];

export default function IdentityHero({locale,intro:_intro,actions:_actions,video:_video}:{locale:Locale;intro:string;actions:ReactNode;video?:PublicVideo}){
 const t=copy[locale];void _intro;void _actions;void _video;
 const [phase,setPhase]=useState<Phase>('idle');
 const finale=<div className="trio-paths identity-finale" aria-label={t.finaleTitle}>
  <p className="trio-paths-title trio-rise" data-testid="hero-finale-title" style={{'--i':0} as CSSProperties}>{t.finaleTitle}</p>
  {t.paths.map(([label,hint],i)=><SiteLink key={label} href={pathRoutes[i]} className="trio-path-link trio-rise" style={{'--i':i+1} as CSSProperties} data-testid={`hero-finale-path-${i+1}`}><span><strong>{label}</strong><small>{hint}</small></span><i aria-hidden="true">↗</i></SiteLink>)}
 </div>;
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state="live-scene" data-scene-phase={phase} data-identity-layout="zielbild-v2">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline"><span>{t.titleStart}</span>{' '}<span className="identity-title-accent">{t.titleAccent}</span></h1>
    <p className="identity-body" data-testid="hero-description">{t.body}</p>
    <div className="identity-links">
     <ActionLink variant="text" className="identity-primary-link" href="/leistungsumfang" data-testid="hero-project-link"><span>{t.cta}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink>
     <ActionLink variant="quiet" className="identity-secondary-link" href="/leistungen" data-testid="hero-services-link">{t.services}</ActionLink>
    </div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    <TrioScene scene={homeScenes.welcome} locale={locale} testId="hero" title={t.scene} startLabel={t.start} onPhase={setPhase} media={sceneMedia.welcome}
     figures={{pascal:sceneFigures.pascalWalk,nex:sceneFigures.nexWalk,oracle:sceneFigures.oracle}} finale={finale}/>
   </div>
  </div>
 </section>;
}
