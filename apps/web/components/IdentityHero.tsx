"use client";
import {useState,type CSSProperties} from 'react';
import interfaceCopy from '../../../config/public-interface-copy.json';
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import {homeScenes,sceneFigures,sceneMedia} from '../lib/home-scenes';
import type {PublicVideo} from './PresenterVideo';
import TrioScene,{type Phase} from './TrioScene';
import {ActionLink} from './ActionControl';
import {SiteLink} from './Router';
import './IdentityHero.css';

// Kundentext: Masterplan v2 PUB-home H00 (Zeilen 699-701). Hero: Text links, reale Chat-Fläche rechts (Panel),
// Trio frei auf der Bühne nach Zielbild – kein Video-Kasten, keine KI-Veränderung der Figuren.
const pathRoutes=['/leistungen/websites','/leistungen/agenten-automatisierung','/leistungen/apps-portale'];

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];void _video;const words=page.localizedTitle[locale].split(' '),split=locale==='fr'?3:2;
 const [phase,setPhase]=useState<Phase>('idle');
 const finale=<div className="trio-paths identity-finale" aria-label={t.finaleTitle}>
  <p className="trio-paths-title trio-rise" data-testid="hero-finale-title" style={{'--i':0} as CSSProperties}>{t.finaleTitle}</p>
  {t.paths.map(([label,hint],i)=><SiteLink key={label} href={pathRoutes[i]} className="trio-path-link trio-rise" style={{'--i':i+1} as CSSProperties} data-testid={`hero-finale-path-${i+1}`}><span><strong>{label}</strong><small>{hint}</small></span><i aria-hidden="true">↗</i></SiteLink>)}
 </div>;
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state="live-scene" data-scene-phase={phase} data-identity-layout="zielbild-v2">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline"><span>{words.slice(0,split).join(' ')}</span>{' '}<span className="identity-title-accent">{words.slice(split).join(' ')}</span></h1>
    <p className="identity-body" data-testid="hero-description">{page.localizedSummary[locale]}</p>
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
