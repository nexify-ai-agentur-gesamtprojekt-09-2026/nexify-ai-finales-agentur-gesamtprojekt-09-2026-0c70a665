"use client";
import type {ReactNode} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import {StartAction,useUI} from "./Workspace";
import PageMediaBand from "./PageMediaBand";
import "./PublicContentLayout.css";

const words={
 de:{breadcrumb:"Du bist hier",onPage:"Auf dieser Seite",connections:"Passende Zusammenhänge",next:"Wie möchtest du weitermachen?",nextIntro:"Wähle den nächsten Schritt, der zu deinem Vorhaben passt.",details:"Im Detail",contact:"Direkter Kontakt",learn:"Seite ansehen",unavailable:"Ziel derzeit nicht verfügbar",home:"Startseite",service:"Leistungen",product:"Produkte und Lösungen",workshop:"Werkstatt und Zusammenarbeit",commerce:"Teile, Fahrzeug und nächste Schritte",document:"Informationen und Recht",account:"Dein Konto",article:"Wissen und Orientierung",company:"NeXify kennenlernen",back:"Zur Übersicht",overview:"In diesem Bereich",related:"Weiterführende Seiten"},
 nl:{breadcrumb:"Je bent hier",onPage:"Op deze pagina",connections:"Passende verbanden",next:"Hoe wil je verdergaan?",nextIntro:"Kies de volgende stap die bij je plan past.",details:"In detail",contact:"Direct contact",learn:"Pagina bekijken",unavailable:"Doel momenteel niet beschikbaar",home:"Startpagina",service:"Diensten",product:"Producten en oplossingen",workshop:"Werkplaats en samenwerking",commerce:"Onderdelen, voertuig en volgende stappen",document:"Informatie en voorwaarden",account:"Je account",article:"Kennis en oriëntatie",company:"Ontdek NeXify",back:"Naar het overzicht",overview:"In dit onderdeel",related:"Gerelateerde pagina’s"},
 fr:{breadcrumb:"Tu es ici",onPage:"Sur cette page",connections:"Les liens utiles",next:"Comment souhaites-tu avancer ?",nextIntro:"Choisis la prochaine étape adaptée à ton projet.",details:"En détail",contact:"Contact direct",learn:"Voir la page",unavailable:"Destination actuellement indisponible",home:"Accueil",service:"Prestations",product:"Produits et solutions",workshop:"Atelier et collaboration",commerce:"Pièces, véhicule et prochaines étapes",document:"Informations et conditions",account:"Ton compte",article:"Conseils et orientation",company:"Découvrir NeXify",back:"Revenir à la vue d’ensemble",overview:"Dans cette rubrique",related:"Pages associées"},
 en:{"breadcrumb": "You are here", "onPage": "On this page", "connections": "Useful links", "next": "How would you like to proceed?", "nextIntro": "Choose the next step that fits your project.", "details": "In detail", "contact": "Direct contact", "learn": "View page", "unavailable": "Destination currently unavailable", "home": "Home", "service": "Services", "product": "Products and solutions", "workshop": "Workshop and collaboration", "commerce": "Parts, vehicle and next steps", "document": "Information and terms", "account": "Your account", "article": "Advice and orientation", "company": "Discover NeXify", "back": "Back to the overview", "overview": "In this section", "related": "Related pages"}
};
type Layout="service"|"product"|"workshop"|"commerce"|"document"|"account"|"article"|"company";
const groups:Record<Layout,string[]>={
 service:["services","websites","automation","apps-portals","scope"],
 product:["solutions","nex2fly","one","api","pricing"],
 workshop:["tk-partner","tk-workshop","tk-appointments"],
 commerce:["tk-home","tk-search","tk-fitment","tk-categories","tk-category","tk-product","tk-cart","tk-checkout","tk-vouchers"],
 document:["imprint","privacy","terms","ai-notice","accessibility","cookies","tk-legal"],
 account:["login","signup"],article:["knowledge","knowledge-start"],company:["company","contact"]
};
function layoutFor(page:PublicPage):Layout{
 for(const kind of ["document","account","workshop","commerce","service","product","article"] as Layout[])if(groups[kind].includes(page.id))return kind;
 if(page.site_context==="teileklar")return "commerce";
 return "company";
}
function uniquePages(candidates:(PublicPage|undefined)[]):PublicPage[]{
 const seen=new Set<string>();return candidates.filter((page):page is PublicPage=>Boolean(page&&!seen.has(page.id)&&(seen.add(page.id),true)));
}
function sectionAnchor(pageId:string,sectionId:string,index:number){return "content-"+pageId.replace(/[^a-z0-9_-]/gi,"-")+"-"+sectionId.replace(/[^a-z0-9_-]/gi,"-")+"-"+index;}
function jumpToSection(id:string){const target=document.getElementById(id);if(target){target.scrollIntoView({block:"start"});target.focus({preventScroll:true});}}

export default function PublicContent({page,pages,children}:{page:PublicPage;pages:PublicPage[];children?:ReactNode}){
 const{locale}=useUI();const t=words[locale];const layout=layoutFor(page);
 const get=(id:string)=>pages.find(candidate=>candidate.id===id);
 const home=get("home");const contextHome=page.site_context==="teileklar"?get("tk-home"):home;
 const pathParents=pages.filter(candidate=>candidate.id!==page.id&&candidate.path!=="/"&&page.path.startsWith(candidate.path+"/")).sort((a,b)=>a.path.length-b.path.length);
 const proposedParent=page.path.startsWith("/produkte/")?get("solutions"):page.id==="scope"?get("services"):undefined;
 const editorialParent=proposedParent?.actions.some(action=>action.type==="route"&&action.target_id===page.id)?proposedParent:undefined;
 const parents=uniquePages([home,contextHome,...pathParents,editorialParent]).filter(candidate=>candidate.id!==page.id);
 const overview=page.site_context==="teileklar"?get("tk-home"):layout==="service"?get("services"):layout==="product"?get("solutions"):layout==="article"?get("knowledge"):undefined;
 const contextualPages=groups[layout].map(get).filter((candidate):candidate is PublicPage=>Boolean(candidate&&candidate.id!==page.id));
 const outbound=page.actions.filter(action=>action.type==="route").map(action=>get(action.target_id||""));
 const related=uniquePages([...outbound,...contextualPages]).filter(candidate=>candidate.id!==page.id).slice(0,4);
  const isQuiet=layout==="document"||layout==="account";
 const sections=page.sections.filter(section=>isQuiet||section.body[locale].trim()!==page.localizedSummary[locale].trim());
 const headingId="page-title-"+page.id;
 const actions=(items:PublicPage["actions"],placement:string)=><div className={"content-actions content-actions-"+placement}>{items.map((action,index)=>{
  if(action.type==="chat"&&action.chat_intent)return <StartAction key={index} intent={action.chat_intent}>{action.label[locale]}<span aria-hidden="true">→</span></StartAction>;
  const target=get(action.target_id||"");return target?<SiteLink key={index} className="content-action-link" href={target.path}>{action.label[locale]}<span aria-hidden="true">→</span></SiteLink>:<span key={index} className="content-action-unavailable">{action.label[locale]} · {t.unavailable}</span>;
 })}</div>;
 const hasScene=page.id==="apps-portals"||page.id==="tk-home";
 const contextAside=!isQuiet?<aside className="content-context" aria-label={t.overview}><span className="content-kicker">{t.overview}</span><strong>{t[layout]}</strong><nav aria-label={t.overview}>{contextualPages.slice(0,4).map(target=><SiteLink href={target.path} key={target.id}>{target.localizedTitle[locale]}<span aria-hidden="true">→</span></SiteLink>)}</nav>{overview&&overview.id!==page.id&&<SiteLink className="content-overview-link" href={overview.path}>{t.back}<span aria-hidden="true">←</span></SiteLink>}</aside>:null;
 return <section className={"public-page content-layout layout-"+layout+" context-"+page.site_context} aria-labelledby={headingId}>
  <nav className="content-breadcrumb" aria-label={t.breadcrumb}><ol>{parents.map(parent=><li key={parent.id}><SiteLink href={parent.path}>{parent.id==="home"?t.home:parent.localizedTitle[locale]}</SiteLink><span aria-hidden="true">/</span></li>)}<li><span aria-current="page">{page.localizedTitle[locale]}</span></li></ol></nav>
  <header className={"content-hero"+(hasScene?" has-scene":"")}><div className="content-hero-copy"><span className="content-kicker">{page.site_context==="teileklar"?"TEILEKLAR":"NEXIFY AI"}<span aria-hidden="true"> / </span>{t[layout]}</span><h1 id={headingId}>{page.localizedTitle[locale]}</h1><p className="content-purpose">{page.localizedSummary[locale]}</p>{actions(page.actions.slice(0,2),"primary")}</div>
   {hasScene?<div className="content-hero-aside"><PageMediaBand pageId={page.id} context={page.site_context} locale={locale}/></div>:contextAside}
  </header>
  {hasScene&&contextAside&&<div className="content-context-below">{contextAside}</div>}
  <div className={"content-reading-grid"+(sections.length>1?" has-section-nav":"")}>
   {sections.length>1&&<nav className="content-section-nav" aria-label={t.onPage}><span className="content-kicker">{t.onPage}</span><ol>{sections.map((section,index)=><li key={section.id}><button type="button" onClick={()=>jumpToSection(sectionAnchor(page.id,section.id,index))}>{section.heading[locale]}</button></li>)}</ol></nav>}
   <div className="content-sections">{sections.map((section,index)=><article className="content-section" id={sectionAnchor(page.id,section.id,index)} tabIndex={-1} key={section.id}><span className="content-section-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span><div><h2>{section.heading[locale]}</h2><p>{section.body[locale]}</p></div></article>)}
    {Boolean(page.contact_channels?.length)&&<section className="content-contact" aria-labelledby={"contact-title-"+page.id}><h2 id={"contact-title-"+page.id}>{t.contact}</h2>{page.contact_channels?.map(channel=><a key={channel.address} className="contact-channel" href={"mailto:"+channel.address}><span>{channel.label[locale]}</span><strong>{channel.address}</strong><span aria-hidden="true">→</span></a>)}</section>}
   </div>
  </div>
  {children&&<div className="content-supplement">{children}</div>}
  {related.length>0&&<section className="content-related" aria-labelledby={"related-title-"+page.id}><div className="content-related-heading"><span className="content-kicker">{t.related}</span><h2 id={"related-title-"+page.id}>{t.connections}</h2></div><div className="content-related-grid">{related.map(target=><article key={target.id}><span className="content-related-context">{target.site_context==="teileklar"?"TEILEKLAR":"NEXIFY AI"}</span><h3><SiteLink href={target.path}>{target.localizedTitle[locale]}<span aria-hidden="true">→</span></SiteLink></h3><p>{target.localizedSummary[locale]}</p></article>)}</div></section>}
  {page.actions.length>0&&<footer className="content-next"><div><span className="content-kicker">{isQuiet?t.related:t.details}</span><h2>{isQuiet?t.related:t.next}</h2>{!isQuiet&&<p>{t.nextIntro}</p>}</div>{actions(page.actions,"complete")}</footer>}
 </section>;
}
