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
  <section id="leistungen" className="hc-section hc-container hl-choice" aria-labelledby="hl-choice-title" data-testid="home-leistungen">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.lKicker}</span><h2 id="hl-choice-title">{v.lTitle}</h2></div><p>{v.lLead}</p></header>
   <ol className="hl-choices">{v.lChoices.map(([who,text],i)=><li key={i} className={`hl-choice-card hv-cue-${who}`}>
    <div className="hv-cue-who"><img src={avatars[who as keyof typeof avatars]} alt="" width="56" height="56" loading="lazy" decoding="async"/><strong>{v.speakers[who as keyof typeof v.speakers]}</strong></div>
    <p>{text}</p>
   </li>)}</ol>
   <p className="hl-close">{v.lClose}</p>
  </section>
  <section id="leistungen-detail" className="hc-section hc-container hl-detail" aria-labelledby="hl-detail-title" data-testid="home-leistungen-detail">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.ldKicker}</span><h2 id="hl-detail-title">{v.ldTitle}</h2></div><p>{v.ldLead}</p></header>
   <div className="hl-ways">{(v.ldWays as Array<{title:string;summary:string;bullets?:string[];note?:string;cta?:string}>).map((w,i)=><article key={i} className="hl-way">
    <h3>{w.title}</h3><p className="hl-way-sum">{w.summary}</p>
    {w.bullets&&<ul className="hl-way-list">{w.bullets.map((b,bi)=><li key={bi}>{b}</li>)}</ul>}
    {w.note&&<p className="hl-way-note">{w.note}</p>}
    {w.cta&&<SiteLink href="/leistungen" className="hl-way-cta">{w.cta}<DetailArrow direction="out"/></SiteLink>}
   </article>)}</div>
   <SiteLink href="#chat" className="hc-finish-primary hl-detail-cta">{v.ldCta}<DetailArrow/></SiteLink>
  </section>
  <section id="zusammenarbeit" className="hc-section hc-container hl-process" aria-labelledby="hl-process-title" data-testid="home-zusammenarbeit">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.zKicker}</span><h2 id="hl-process-title">{v.zTitle}</h2></div><p>{v.zLead}</p></header>
   <ol className="hl-steps">{v.zSteps.map(([t,b],i)=><li key={i} className="hl-step"><span className="hl-step-no" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div><h3>{t}</h3><p>{b}</p></div></li>)}</ol>
  </section>
  <section id="budget" className="hc-section hc-container hl-budget" aria-labelledby="hl-budget-title" data-testid="home-budget">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.bKicker}</span><h2 id="hl-budget-title">{v.bTitle}</h2></div><p>{v.bLead}</p></header>
   <div className="hl-budget-grid">
    <article className="hl-rate">
     <span className="hl-rate-label">{v.bRateLabel}</span>
     <p className="hl-rate-value"><strong>{v.bRate}</strong><small>{v.bRateUnit}</small></p>
     <p className="hl-rate-note">{v.bRateNote}</p>
     <SiteLink href="/preise-ablauf" className="hl-way-cta">{v.bRateCta}<DetailArrow direction="out"/></SiteLink>
    </article>
    <ul className="hl-cost-blocks">{v.bBlocks.map(([t,b],i)=><li key={i}><h3>{t}</h3><p>{b}</p></li>)}</ul>
   </div>
  </section>
  <section id="chat" className="hc-section hc-container hv-einstieg" aria-labelledby="hv-chat-title" data-testid="home-einstieg">
   <header className="hc-section-heading"><div><span className="hc-kicker">{v.cKicker}</span><h2 id="hv-chat-title">{v.cTitle}</h2></div><p>{v.cLead}</p></header>
   <ul className="hv-paths">{v.paths.map(([no,title,body,href])=><li key={no}><SiteLink href={href} className="hv-path"><span className="hv-path-no" aria-hidden="true">{no}</span><h3>{title}<DetailArrow direction="out"/></h3><p>{body}</p></SiteLink></li>)}</ul>
   <div className="hv-chat-cta"><button type="button" className="hc-finish-primary" onClick={openChat} data-testid="home-open-chat">{v.chatCta}<DetailArrow/></button><small>{v.chatNote}</small></div>
  </section>
 </div>;
}
