"use client";
import {type ReactNode} from "react";
import {StartAction,useUI} from "./Workspace";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import "./HomeRebuild.css";
import PresenterVideo,{isPublicVideo,type PublicVideo} from "./PresenterVideo";
import PresenterScene from './PresenterScene';
import './PresenterEditorial.css';

const copy={
 de:{one:"Mehr Zeit für Kunden.",two:"Weniger Arbeit",three:"dazwischen.",intro:"Wir entwickeln Websites, Apps und vernetzte Abläufe für dein Unternehmen. So werden aus Anfragen, Wissen und wiederkehrenden Aufgaben klare nächste Schritte – mit deiner Marke, passenden Schnittstellen und einem vorab vereinbarten Leistungsumfang.",plan:"Vorhaben planen",appointment:"Termin anfragen",caption:"Mit NeX Agentic AIFly direkt im Gespräch.",captionStrong:"Von der ersten Idee zum konkreten Entwurf.",stageLabel:"Pascal und digitale Begleiter",stageAlt:"Pascal und zwei digitale Begleiter, darunter AIFly Oracle, auf einer gemeinsamen Bühne",fallbackTitle:"Deine Idee. Unser nächster Schritt.",fallbackBody:"Persönlich besprechen. Möglichkeiten verbinden. Gemeinsam weiterdenken.",fallbackNote:"Pascal · NeX Agentic · AIFly Oracle",servicesKicker:"DIGITAL. VERBUNDEN. FÜR DICH.",servicesTitle:"Was möchtest du voranbringen?",servicesBody:"Eine starke Website. Weniger Handgriffe im Alltag. Eine App, die zu deinen Abläufen passt. Wir beginnen dort, wo du etwas verändern möchtest.",serviceLink:"Mehr erfahren",eyebrow:"EIN GESPRÄCH. KLARE NÄCHSTE SCHRITTE.",headline:"Dein Vorhaben beginnt hier.",summary:"Besprechen, festhalten und weiterplanen – ohne zwischen Formularen und Fenstern zu wechseln.",quoteTitle:"Ein Angebot, das zu deinem Vorhaben passt.",quoteBody:"Besprich den Leistungsumfang, halte ihn als Angebotsentwurf fest und lade ihn als PDF herunter.",quoteAction:"Angebot besprechen",bookingTitle:"Gemeinsam einen Termin finden.",bookingBody:"Wähle einen Zeitvorschlag und speichere deine Anfrage direkt im Gespräch.",marketingTitle:"Marketing mit einer klaren Richtung.",marketingBody:"Lege Ziel und Zielgruppe fest. Daraus entsteht ein strukturiertes Briefing als nächster Schritt.",marketingAction:"Marketing planen",sourceLabel:"Deine nächsten Möglichkeiten"},
 nl:{one:"Meer tijd voor klanten.",two:"Minder werk",three:"tussendoor.",intro:"Websites, apps en slimme processen. We verbinden wat jouw bedrijf vooruithelpt, zodat je idee een duidelijke volgende stap wordt.",plan:"Laten we je project bespreken",appointment:"Afspraak aanvragen",caption:"Direct in gesprek met NeX Agentic AIFly.",captionStrong:"Van het eerste idee naar een concreet concept.",stageLabel:"Pascal en digitale begeleiders",stageAlt:"Pascal en twee digitale begeleiders, waaronder AIFly Oracle, op één podium",fallbackTitle:"Jouw idee. Onze volgende stap.",fallbackBody:"Persoonlijk bespreken. Mogelijkheden verbinden. Samen verderdenken.",fallbackNote:"Pascal · NeX Agentic · AIFly Oracle",servicesKicker:"DIGITAAL. VERBONDEN. VOOR JOU.",servicesTitle:"Wat wil je vooruithelpen?",servicesBody:"Een sterke website. Minder handwerk. Een app die bij je processen past. We beginnen waar jij iets wilt veranderen.",serviceLink:"Meer ontdekken",eyebrow:"ÉÉN GESPREK. DUIDELIJKE VOLGENDE STAPPEN.",headline:"Jouw plan begint hier.",summary:"Bespreken, vastleggen en verder plannen, zonder tussen formulieren en vensters te wisselen.",quoteTitle:"Een offerte die bij je plan past.",quoteBody:"Bespreek de omvang, leg die vast als offerteconcept en download de PDF.",quoteAction:"Offerte bespreken",bookingTitle:"Samen een afspraak vinden.",bookingBody:"Kies een tijdvoorstel en sla je aanvraag direct in het gesprek op.",marketingTitle:"Marketing met een duidelijke richting.",marketingBody:"Bepaal doel en doelgroep en maak een gestructureerde briefing als volgende stap.",marketingAction:"Marketing plannen",sourceLabel:"Je volgende mogelijkheden"},
 fr:{one:"Plus de temps pour tes clients.",two:"Moins de tâches",three:"entre les deux.",intro:"Sites, applications et processus intelligents. Nous relions ce qui fait avancer ton entreprise pour donner une suite concrète à ton idée.",plan:"Parlons de ton projet",appointment:"Demander un rendez-vous",caption:"Échange directement avec NeX Agentic AIFly.",captionStrong:"De la première idée à un projet concret.",stageLabel:"Pascal et les compagnons numériques",stageAlt:"Pascal et deux compagnons numériques, dont AIFly Oracle, sur une scène commune",fallbackTitle:"Ton idée. Notre prochaine étape.",fallbackBody:"En parler. Relier les possibilités. Avancer ensemble.",fallbackNote:"Pascal · NeX Agentic · AIFly Oracle",servicesKicker:"NUMÉRIQUE. CONNECTÉ. POUR TOI.",servicesTitle:"Que souhaites-tu faire avancer ?",servicesBody:"Un site solide. Moins de tâches manuelles. Une application adaptée à tes processus. Nous commençons là où tu souhaites changer quelque chose.",serviceLink:"En savoir plus",eyebrow:"UNE CONVERSATION. DES ÉTAPES CLAIRES.",headline:"Ton projet commence ici.",summary:"Discuter, noter et avancer sans changer constamment de formulaire ou de fenêtre.",quoteTitle:"Un devis adapté à ton projet.",quoteBody:"Discute du périmètre, enregistre un projet de devis et télécharge le PDF.",quoteAction:"Discuter d’un devis",bookingTitle:"Trouver un rendez-vous ensemble.",bookingBody:"Choisis un horaire proposé et enregistre ta demande dans la conversation.",marketingTitle:"Un marketing avec une direction claire.",marketingBody:"Définis l’objectif et le public pour préparer un brief structuré comme prochaine étape.",marketingAction:"Planifier le marketing",sourceLabel:"Tes prochaines possibilités"}
};

const areaCopy={
 de:{label:"Produkte und Bereiche",hint:"Wähle deinen Einstieg",services:"Leistungen für dein Vorhaben"},
 nl:{label:"Producten en onderdelen",hint:"Kies jouw vertrekpunt",services:"Diensten voor jouw plan"},
 fr:{label:"Produits et domaines",hint:"Choisis ton point de départ",services:"Des services pour ton projet"}
};
function PresenterStage({text,video,locale}:{text:typeof copy.de;video?:PublicVideo;locale:PublicVideo["locale"]}){
 const playable=isPublicVideo(video,locale);
 return <figure className="home-presenter-stage has-presenters" aria-label={text.stageLabel} data-media-state={playable?"approved-video":"interim-images-video-pending"}>
  <div className="home-stage-aura" aria-hidden="true"/>
  <div className={"home-presenter-art"+(playable?" has-video":"")}>
  {playable&&<PresenterVideo video={video} locale={locale} hero/>}
  {!playable&&<div className="home-interim-scenes">{(['pascal','nex','aifly'] as const).map(speaker=><PresenterScene key={speaker} speaker={speaker} title={text.stageLabel} locale={locale} hero/>)}</div>}
  </div>
  <figcaption><span className="home-stage-line" aria-hidden="true"/>{text.fallbackNote}</figcaption>
 </figure>;
}
export default function HomeContent({home,pages=[],children,video}:{home?:PublicPage;pages?:PublicPage[];children?:ReactNode;video?:PublicVideo}){
 const{locale}=useUI();const t=copy[locale];const areaText=areaCopy[locale];
 const services=["websites","automation","apps-portals"].flatMap(id=>{const page=pages.find(candidate=>candidate.id===id);return page?[page]:[];});
 const areas=[
  {name:"NeX2fly",page:pages.find(page=>page.path==="/produkte/nex2fly")},
  {name:"AIFly Oracle",page:pages.find(page=>page.id==="solutions")},
  {name:"TEILEKLAR",page:pages.find(page=>page.id==="tk-home")},
  {name:locale==="de"?"Werkstatt":locale==="nl"?"Werkplaats":"Atelier",page:pages.find(page=>page.id==="tk-workshop")}
 ];
 const scope=pages.find(page=>page.id==="scope");
 const tasks=[{intent:"quote" as const,title:t.quoteTitle,body:t.quoteBody,action:t.quoteAction},{intent:"booking" as const,title:t.bookingTitle,body:t.bookingBody,action:t.appointment},{intent:"marketing" as const,title:t.marketingTitle,body:t.marketingBody,action:t.marketingAction}];
 return <div className="home-rebuild">
  <section className="home-hero" aria-labelledby="home-headline">
   <div className="home-light-ribbon home-light-ribbon-one" aria-hidden="true"/><div className="home-light-ribbon home-light-ribbon-two" aria-hidden="true"/>
   <div className="home-hero-copy"><span className="home-kicker">NEXIFY AI <span aria-hidden="true">/</span> CHAT IT. AUTOMATE IT.</span>
    <h1 id="home-headline"><span>{t.one}</span>{" "}<span>{t.two}</span>{" "}<span className="home-headline-accent">{t.three}</span></h1>
    <p className="home-hero-intro">{t.intro}</p>
    <div className="home-hero-actions"><StartAction intent="quote">{t.plan}<span aria-hidden="true">→</span></StartAction><StartAction intent="booking">{t.appointment}</StartAction></div>
    <div className="home-hero-note"><span aria-hidden="true">✦</span><p>{t.caption}<br/><strong>{t.captionStrong}</strong></p></div>
   </div>
   <PresenterStage text={t} video={video} locale={locale}/>
  </section>
  <nav className="home-area-nav" aria-label={areaText.label}>
   <div className="home-area-intro"><span className="home-kicker">{areaText.label}</span><p>{areaText.hint}</p></div>
   <div className="home-area-links">{areas.map(({name,page})=>page?<SiteLink key={name} href={page.path} className="home-area-link"><span className="home-area-name">{name}</span><span className="home-area-destination">{page.localizedTitle[locale]}</span><span className="home-area-arrow" aria-hidden="true">→</span></SiteLink>:null)}</div>
  </nav>
  <section className="home-services" aria-labelledby="home-services-title"><div className="home-section-heading"><span className="home-kicker">{areaText.services}</span><h2 id="home-services-title">{t.servicesTitle}</h2><p>{t.servicesBody}</p></div>
   {services.length>0&&<div className="home-service-grid">{services.map((page,index)=><article className="home-service" key={page.id}><span className="home-service-index" aria-hidden="true">0{index+1}</span><h3>{page.localizedTitle[locale]}</h3><p>{page.localizedSummary[locale]}</p><SiteLink href={page.path} className="home-service-link">{t.serviceLink}<span className="visually-hidden">: {page.localizedTitle[locale]}</span><span aria-hidden="true">→</span></SiteLink></article>)}</div>}
  </section>
  <section className="home-next" aria-labelledby="home-next-title"><div className="home-section-heading"><span className="home-kicker">{t.eyebrow}</span><h2 id="home-next-title">{scope?.localizedTitle[locale]||t.headline}</h2><p>{scope?.localizedSummary[locale]||t.summary}</p></div>
   <div className="home-task-list">{tasks.map((task,index)=><article className="home-task" key={task.intent}><span className="home-task-index" aria-hidden="true">0{index+1}</span><div><h3>{task.title}</h3><p>{task.body}</p></div><StartAction intent={task.intent}>{task.action}<span aria-hidden="true">→</span></StartAction></article>)}</div>
   {home&&<div className="home-source-content">{home.sections.map(section=><article key={section.id}><h3>{section.heading[locale]}</h3><p>{section.body[locale]}</p></article>)}<nav className="home-source-actions" aria-label={t.sourceLabel}>{home.actions.map((action,index)=>{if(action.type==="chat"&&action.chat_intent)return <StartAction key={index} intent={action.chat_intent}>{action.label[locale]}</StartAction>;const target=pages.find(page=>page.id===action.target_id);return target?<SiteLink key={index} href={target.path}>{action.label[locale]}<span aria-hidden="true">→</span></SiteLink>:null;})}</nav></div>}
  </section>
  {children}
 </div>;
}
