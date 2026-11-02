"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.home;
const diagrams=interfaceCopy.homeDiagrams;
import {type ReactNode} from 'react';
import {StartAction,useUI} from './Workspace';
import {SiteLink} from './Router';
import type {PublicPage} from '../lib/page-types';
import {type PublicVideo} from './PresenterVideo';
import IdentityHero from './IdentityHero';
import './HomeRebuild.css';
import {ProblemExplorer} from './ProblemExplorer';
import TrioScene from './TrioScene';
import {homeScenes,sceneFigures,sceneMedia} from '../lib/home-scenes';
import type {CSSProperties} from 'react';
import './HomeJourney.css';

// Kundentexte: PUB-home, Masterplan v2, Zeilen 694–717.
// Produktionsanweisungen und Governance bleiben außerhalb der öffentlichen Seite.
export default function HomeContent({home,pages=[],children,video:_video,moduleVideos={}}:{home:PublicPage;pages?:PublicPage[];children?:ReactNode;video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo['locale'],PublicVideo>>>}){
 const {locale}=useUI(),base=copy[locale],t={...base,project:home.sections[0]?.heading[locale]??base.project,projectBody:home.sections[0]?.body[locale]??base.projectBody};void _video;
 void moduleVideos;
 const d=diagrams[locale];
 const services=['websites','automation','apps-portals'].flatMap(id=>{const page=pages.find(p=>p.id===id);return page?[page]:[];});
 const products=[{name:'NeX2fly Suite',page:pages.find(p=>p.path==='/produkte/nex2fly')},{name:'NeX Agentic AI',page:pages.find(p=>p.id==='one')},{name:'NeXify API',page:pages.find(p=>p.path==='/api'||p.id==='api')},{name:'TEILEKLAR',page:pages.find(p=>p.id==='tk-home')}];
 const sceneLabel={de:{project:'Pascal, NeX und AI Fly Oracle hören zu und ordnen Ihr Vorhaben',choice:'Pascal, NeX und AI Fly Oracle zeigen die drei Einstiege',startProject:'Zuhören starten',startChoice:'Einstiege zeigen'},nl:{project:'Pascal, NeX en AI Fly Oracle luisteren en ordenen je plan',choice:'Pascal, NeX en AI Fly Oracle tonen de drie ingangen',startProject:'Luisteren starten',startChoice:'Ingangen tonen'},fr:{project:'Pascal, NeX et AI Fly Oracle écoutent et structurent ton projet',choice:'Pascal, NeX et AI Fly Oracle montrent les trois accès',startProject:'Commencer l’écoute',startChoice:'Montrer les accès'},en:{project:'Pascal, NeX and AI Fly Oracle listen and structure your project',choice:'Pascal, NeX and AI Fly Oracle show the three entry points',startProject:'Start listening',startChoice:'Show entry points'}}[locale];
 const projectStations=<ol className="home-stations" aria-label={`${t.start} · ${t.work} · ${t.result}`} data-testid="home-project-stations">
  {[[t.start,d.input],[t.work,d.rows[1][1]],[t.result,d.output]].map(([label,hint],i)=><li key={label} className="home-station" data-testid={`home-project-station-${i+1}`}><span className="home-station-number" aria-hidden="true">0{i+1}</span><strong>{label}</strong><small>{hint}</small></li>)}
 </ol>;
 const projectFinale=<div className="trio-overview home-project-overview" data-testid="home-project-overview">
  <h3 className="trio-rise" style={{'--i':0} as CSSProperties}>{d.output}</h3>
  <dl>{d.rows.map(([k,v],i)=><div key={k} className="trio-rise home-overview-row" style={{'--i':i+1} as CSSProperties}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  <SiteLink href="/leistungsumfang" className="trio-path-link trio-rise" style={{'--i':5} as CSSProperties} data-testid="home-project-finale-cta"><span><strong>{t.projectAction}</strong><small>{d.note}</small></span><i aria-hidden="true">→</i></SiteLink>
 </div>;
 const choiceFinale=<div className="trio-paths home-choice-finale" aria-label={d.choiceTitle} data-testid="home-choice-finale-content">
  <p className="trio-paths-title trio-rise" style={{'--i':0} as CSSProperties}>{d.choiceTitle}</p>
  {d.routes.map(([label,hint],i)=><span key={label} className="trio-path-link trio-rise" data-testid={`home-choice-finale-path-${i+1}`} style={{'--i':i+1} as CSSProperties}><span><strong>{t.pathLabels[i]}</strong><small>{label} · {hint}</small></span><i aria-hidden="true">→</i></span>)}
 </div>;
 return <div className="home-rebuild home-journey" data-testid="home-content">
  <IdentityHero locale={locale} page={home} video={_video}/>
  <section id="vorhaben" className="home-project home-chapter" aria-labelledby="home-project-title" data-testid="home-project-section">
   <div className="home-project-grid">
    <div className="home-chapter-copy"><span className="home-kicker">{t.projectKicker}</span><h2 id="home-project-title" data-testid="home-project-title">{t.project}</h2><p data-testid="home-project-body">{t.projectBody}</p><SiteLink href="/leistungsumfang" className="primary-button" data-testid="home-project-cta">{t.projectAction}<span aria-hidden="true">→</span></SiteLink><span className="home-caption">{t.projectNote}</span></div>
    <div className="home-film-slot" data-testid="home-project-film-slot" data-film-id="FILM-home-project" data-media-state="live-scene">
     <TrioScene scene={homeScenes.project} locale={locale} testId="home-project" title={sceneLabel.project} startLabel={sceneLabel.startProject} media={sceneMedia.project} figures={{pascal:sceneFigures.pascalStand,nex:sceneFigures.nexWalk,oracle:sceneFigures.oracle,pascalAspect:1.28}} finale={projectFinale}>{projectStations}</TrioScene>
    </div>
   </div>
   <ProblemExplorer/>
  </section>
  {home.sections.slice(1).map(section=><section className="home-chapter" key={section.id} data-testid={"home-content-"+section.id}><div className="home-chapter-heading"><h2>{section.heading[locale]}</h2><p>{section.body[locale]}</p></div></section>)}
  <section id="leistungen" className="home-choice home-chapter" aria-labelledby="home-choice-title" data-testid="home-choice-section">
   <div className="home-chapter-heading"><span className="home-kicker">{t.choiceKicker}</span><h2 id="home-choice-title" data-testid="home-choice-title">{t.choice}</h2><p data-testid="home-choice-body">{t.choiceBody}</p></div>
   <div className="home-choice-layout"><div className="home-film-slot" data-testid="home-choice-film-slot" data-film-id="FILM-home-choice" data-media-state="live-scene">
    <TrioScene scene={homeScenes.choice} locale={locale} testId="home-choice" title={sceneLabel.choice} startLabel={sceneLabel.startChoice} media={sceneMedia.choice} figures={{pascal:sceneFigures.pascalWalk,nex:sceneFigures.nexWalk,oracle:sceneFigures.oracle}} finale={choiceFinale}/>
   </div>
   <div className="home-choice-links">{services.map((page,i)=><SiteLink key={page.id} href={page.path} className="home-choice-link" data-testid={`home-choice-${page.id}`}><span className="home-number" aria-hidden="true">0{i+1}</span><span><strong>{t.pathLabels[i]}</strong><span>{t.pathDescriptions[i]}</span></span><span className="home-choice-arrow" aria-hidden="true">↗</span></SiteLink>)}</div></div>
  </section>
  <section className="home-process home-chapter" aria-labelledby="home-process-title" data-testid="home-process-section"><div className="home-chapter-heading"><span className="home-kicker">{t.processKicker}</span><h2 id="home-process-title" data-testid="home-process-title">{t.process}</h2><p data-testid="home-process-body">{t.processBody}</p></div><ol className="home-process-steps">{t.steps.map(([title,body],i)=><li key={title} data-testid={`home-process-step-${i+1}`}><span className="home-process-node" aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
  <section className="home-products home-chapter" aria-labelledby="home-products-title" data-testid="home-products-section"><div className="home-chapter-heading"><span className="home-kicker">{t.productKicker}</span><h2 id="home-products-title" data-testid="home-products-title">{t.products}</h2><p data-testid="home-products-body">{t.productsBody}</p></div><nav className="home-product-links" aria-label={t.products}>{products.map(({name,page},i)=>page?<SiteLink key={page.id} href={page.path} className="home-product-link" data-testid={`home-product-${page.id}`}><span><strong>{name}</strong><span>{t.productDescriptions[i]}</span><small>{t.productAvailability}</small></span><span aria-hidden="true">↗</span></SiteLink>:null)}</nav></section>
  <section className="home-finish home-chapter" aria-labelledby="home-finish-title" data-testid="home-finish-section"><div className="home-chapter-heading"><h2 id="home-finish-title" data-testid="home-finish-title">{t.finish}</h2><p data-testid="home-finish-body">{t.finishBody}</p></div><div className="home-finish-actions"><StartAction intent="quote">{t.finishAction}<span aria-hidden="true">→</span></StartAction><span className="home-meeting-action" data-testid="home-meeting-action"><StartAction intent="booking" variant="secondary">{home.actions.find(a=>a.type==='chat'&&a.chat_intent==='booking')?.label[locale]||(locale==='de'?'Gespräch anfragen':locale==='nl'?'Gesprek aanvragen':locale==='fr'?'Demander un entretien':'Request a conversation')}</StartAction></span><SiteLink href="/leistungen" className="secondary-button" data-testid="home-finish-services">{t.services}</SiteLink></div><SiteLink href="/kontakt" className="home-direct-contact" data-testid="home-direct-contact">{t.contact}<span aria-hidden="true">↗</span></SiteLink></section>
  {children}
 </div>;
}
