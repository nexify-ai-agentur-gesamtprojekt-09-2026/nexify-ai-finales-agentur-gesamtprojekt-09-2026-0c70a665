"use client";
import {type ReactNode} from 'react';
import {useUI} from './Workspace';
import {SiteLink} from './Router';
import type {PublicPage} from '../lib/page-types';
import type {PublicVideo} from './PresenterVideo';
import IdentityHero from './IdentityHero';
import copy from '../../../config/home-concept-copy.json';
import './HomeConcept.css';
import './HomeVorhaben.css';

function DetailArrow({direction='right'}:{direction?:'right'|'out'|'down'}){
 const path=direction==='out'?'M5 19 19 5M5 5h14v14':direction==='down'?'M12 4v16M5 13l7 7 7-7':'M4 12h16M13 5l7 7-7 7';
 return <svg className="hc-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path}/></svg>;
}

const navTargets=['#vorhaben','/leistungen','/preise-ablauf','/preise-ablauf','/produkte/nex2fly'];
const avatars={pascal:'/media/atelier/presenters/pascal-lossless.webp',nex:'/media/atelier/presenters/nex-lossless.webp',oracle:'/media/atelier/presenters/oracle-lossless.webp'} as const;
function openChat(){
 const launcher=document.querySelector<HTMLElement>('[data-testid="chat-launcher"]');
 if(launcher){launcher.click();return;}
 document.querySelector<HTMLElement>('#aifly-panel textarea, #aifly-panel input')?.focus();
}

/** Startseite nach bestätigtem Aufbau: Hero, Vorhaben, Einstieg/Chat. Der Kontakt-Abschluss ist der Footer-CTA.
 *  Leistungen, Arbeitsweise, Budget und Produkte liegen auf ihren eigenen Seiten. */
export default function HomeContent({home,video,moduleVideos,children,pages}:{home:PublicPage;pages?:PublicPage[];children?:ReactNode;video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo['locale'],PublicVideo>>>}){
 const {locale}=useUI(),v=copy[locale].v3;
 void moduleVideos;void children;void pages;
 return <div className="home-concept" data-testid="home-content">
  <IdentityHero locale={locale} page={home} video={video}/>
  <nav className="hc-anchors hc-container" aria-label={v.vKicker}>{v.nav.map((label,i)=><SiteLink key={label} href={navTargets[i]}>{label}<DetailArrow direction={i===0?'down':'right'}/></SiteLink>)}</nav>
  <section id="vorhaben" className="hc-section hc-container hv-vorhaben" aria-labelledby="hv-vorhaben-title" data-testid="home-vorhaben">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.vKicker}</span><h2 id="hv-vorhaben-title">{v.vTitle}</h2></div><p>{v.vLead}</p></header>
   <ol className="hv-cues">{v.cues.map(([name,who,text],i)=><li key={name} className={`hv-cue hv-cue-${who}`}>
    <span className="hv-cue-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
    <div className="hv-cue-who"><img src={avatars[who as keyof typeof avatars]} alt="" width="56" height="56" loading="lazy" decoding="async"/><span><strong>{v.speakers[who as keyof typeof v.speakers]}</strong><small>{name}</small></span></div>
    <p>{text}</p>
   </li>)}</ol>
  </section>
  <section id="chat" className="hc-section hc-container hv-einstieg" aria-labelledby="hv-chat-title" data-testid="home-einstieg">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.cKicker}</span><h2 id="hv-chat-title">{v.cTitle}</h2></div><p>{v.cLead}</p></header>
   <ul className="hv-paths">{v.paths.map(([no,title,body,href])=><li key={no}><SiteLink href={href} className="hv-path"><span className="hv-path-no" aria-hidden="true">{no}</span><h3>{title}<DetailArrow direction="out"/></h3><p>{body}</p></SiteLink></li>)}</ul>
   <div className="hv-chat-cta"><button type="button" className="hc-finish-primary" onClick={openChat} data-testid="home-open-chat">{v.chatCta}<DetailArrow/></button><small>{v.chatNote}</small></div>
  </section>
 </div>;
}
