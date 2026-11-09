"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
import {useId,useState} from "react";
import DiagnosticConsent from "./DiagnosticConsent";
import InstallInvitation from "./InstallInvitation";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import './SiteFooter.css';
import {ActionLink} from './ActionControl';

// Footer = ruhiger Abschluss jeder Seite: Marke + Einstieg links, vier Linkgruppen rechts, darunter eine kompakte
// Seitenübersicht (gruppiert, mehrspaltig – keine lange Liste) und die Pflichtangaben. Vorbereitet für Master §30:
// Stadt-/Werkstattseiten erscheinen automatisch als eigene Gruppe, sobald sie im Seitenplan existieren (keine erfundenen Einträge).
const copy={
 de:{"intro":"NeXify AI entwickelt Markenauftritte, digitale Systeme und Marketingkonzepte aus einem klaren Unternehmensziel. Mit einem abgestimmten Umfang und persönlich vereinbarter Betreuung.","products":"Produkte & Arbeitsbereiche","orientation":"Leistungen & Zusammenarbeit","company":"NeXify AI",legal:"Rechtliches",places:"Städte und Werkstätten",all:"Seitenübersicht",allHint:"Alle Seiten dieses Bereichs, nach Themen geordnet","preview":"Entwicklungsstand · Funktionen im jeweiligen Bereich",home:"Zur Startseite","contact":"Ihr Projekt mit NeXify besprechen",more:"Weitere Seiten",services:"Leistungen",productsShort:"Produkte",knowledge:"Wissen und Unternehmen",shop:"TEILEKLAR",account:"Konto",languages:"Sprache",claim:"Chat it. Automate it."},
 nl:{"intro":"NeXify AI ontwikkelt merkuitstraling, digitale systemen en marketingconcepten vanuit een helder bedrijfsdoel. Met een afgestemde omvang en persoonlijk overeengekomen begeleiding.","products":"Producten & werkgebieden","orientation":"Diensten & samenwerking","company":"NeXify AI",legal:"Juridisch",places:"Steden en werkplaatsen",all:"Pagina-overzicht",allHint:"Alle pagina’s van dit onderdeel, op thema geordend","preview":"Ontwikkelstand · functies per onderdeel",home:"Naar de startpagina","contact":"Uw project met NeXify bespreken",more:"Overige pagina’s",services:"Diensten",productsShort:"Producten",knowledge:"Kennis en bedrijf",shop:"TEILEKLAR",account:"Account",languages:"Taal",claim:"Chat it. Automate it."},
 fr:{"intro":"NeXify AI développe des présences de marque, des systèmes numériques et des concepts marketing à partir d’un objectif d’entreprise clair. Avec un périmètre défini et un accompagnement convenu personnellement.","products":"Produits & espaces de travail","orientation":"Prestations & collaboration","company":"NeXify AI",legal:"Informations légales",places:"Villes et ateliers",all:"Plan du site",allHint:"Toutes les pages de cet espace, classées par thème","preview":"Version en développement · fonctions selon la rubrique",home:"Vers l’accueil","contact":"Parler de votre projet avec NeXify",more:"Autres pages",services:"Services",productsShort:"Produits",knowledge:"Savoir et entreprise",shop:"TEILEKLAR",account:"Compte",languages:"Langue",claim:"Chat it. Automate it."},
 en:{"intro":"NeXify AI develops brand presence, digital systems and marketing concepts around a clear business goal. With a defined scope and personally agreed support.", "products":"Products & workspaces", "orientation":"Services & collaboration", "company":"NeXify AI", "legal": "Legal", "places": "Cities and workshops", "all": "Site overview", "allHint": "All pages in this area, organized by topic", "preview":"Development version · functions vary by area", "home": "To the homepage", "contact":"Discuss your project with NeXify", "more": "More pages", "services": "Services", "productsShort": "Products", "knowledge": "Knowledge and company", "shop": "TEILEKLAR", "account": "Account", "languages": "Language", "claim": "Chat it. Automate it."}
};

const legalCopy={
 de:{links:"Rechtsdokumente",shopLegal:"TEILEKLAR: Anbieterinformationen und Datenschutz",shopNotice:"Die Rechtsinformationen für TEILEKLAR sind direkt erreichbar. Vollständige Angaben zum Anbieter, Datenschutz und Verbraucherrechten im Shop stehen noch zur Prüfung und Freigabe.",imprint:"Impressum",privacy:"Datenschutz",licenses:"Lizenzen",summary:"Hinweise zu den Rechtsdokumenten",notice:"Die Seiten zu Anbieterinformationen und Datenschutz sind direkt erreichbar. Vollständige Pflichtangaben und Rechtstexte stehen noch zur Prüfung und Freigabe.",licenseNotice:"Informationen zu Drittanbieter-Komponenten und Lizenzhinweisen finden Sie unter Lizenzen.",missingLicenses:"Eine öffentliche Übersicht der Drittanbieter-Komponenten und ihrer Lizenzen ist noch nicht verfügbar."},
 nl:{links:"Juridische documenten",shopLegal:"TEILEKLAR: aanbiederinformatie en privacy",shopNotice:"De juridische informatie voor TEILEKLAR is rechtstreeks bereikbaar. Volledige informatie over de aanbieder, privacy en consumentenrechten in de winkel moet nog worden gecontroleerd en goedgekeurd.",imprint:"Colofon",privacy:"Privacy",licenses:"Licenties",summary:"Toelichting op de juridische documenten",notice:"De pagina’s met aanbiederinformatie en privacyinformatie zijn rechtstreeks bereikbaar. Volledige verplichte gegevens en juridische teksten moeten nog worden gecontroleerd en goedgekeurd.",licenseNotice:"Informatie over componenten van derden en hun licenties vindt u onder Licenties.",missingLicenses:"Een openbaar overzicht van componenten van derden en hun licenties is nog niet beschikbaar."},
 fr:{links:"Documents juridiques",shopLegal:"TEILEKLAR : prestataire et confidentialité",shopNotice:"Les informations juridiques de TEILEKLAR sont directement accessibles. Les informations complètes sur le prestataire, la confidentialité et les droits des consommateurs de la boutique restent à vérifier et à valider.",imprint:"Mentions légales",privacy:"Confidentialité",licenses:"Licences",summary:"À propos des documents juridiques",notice:"Les pages relatives au prestataire et à la confidentialité sont directement accessibles. Les mentions obligatoires et les textes juridiques complets restent à vérifier et à valider.",licenseNotice:"Les informations sur les composants tiers et leurs licences figurent sous Licences.",missingLicenses:"Un aperçu public des composants tiers et de leurs licences n’est pas encore disponible."},
 en:{links:"Legal documents",shopLegal:"TEILEKLAR: provider information and privacy",shopNotice:"The legal information for TEILEKLAR is directly accessible. Complete provider details, privacy and consumer rights in the shop are still under review and approval.",imprint:"Legal notice",privacy:"Privacy",licenses:"Licenses",summary:"About the legal documents",notice:"The pages on provider information and privacy are directly accessible. Complete mandatory details and legal texts are still under review and approval.",licenseNotice:"Information on third-party components and their licenses is available under Licenses.",missingLicenses:"A public overview of third-party components and their licenses is not yet available."}
};

const LEGAL_IDS=new Set(["imprint","privacy","terms","ai-notice","accessibility","cookies","tk-legal","licenses"]);
const isPlacePage=(page:PublicPage)=>page.id.startsWith("tk-city")||page.id.startsWith("tk-stadt")||page.path.startsWith("/teileklar/staedte")||page.path.startsWith("/teileklar/stadt/");

export default function SiteFooter({pages,site,locale}:{pages:PublicPage[];site:string;locale:Locale}){
 const text=copy[locale];
 const labels=interfaceCopy.footerLinks[locale] as Record<string,string>;
 const invitation={de:['Lassen Sie uns über Ihr Vorhaben sprechen.','Erzählen Sie uns, was Sie verändern möchten. Wir klären gemeinsam den passenden nächsten Schritt.','Projekt besprechen'],nl:['Laten we uw plan bespreken.','Vertel ons wat u wilt veranderen. Samen bepalen we de passende volgende stap.','Project bespreken'],fr:['Parlons de votre projet.','Dites-nous ce que vous souhaitez changer. Nous définirons ensemble la prochaine étape.','Parler de mon projet'],en:['Let’s talk about your project.','Tell us what you would like to change. We will work out the next step together.','Discuss your project']}[locale];
 const legal=legalCopy[locale],noticeId=useId(),overviewId=useId();
 const [legalExpanded,setLegalExpanded]=useState(false);
 const [overviewOpen,setOverviewOpen]=useState(false);
 const legalPages=(site==="teileklar"?[{id:"tk-legal",label:legal.shopLegal}]:[{id:"imprint",label:legal.imprint},{id:"privacy",label:legal.privacy},{id:"licenses",label:legal.licenses}]).flatMap(item=>{const page=pages.find(page=>page.id===item.id&&page.site_context===site);return page?[{...item,path:page.path}]:[];});
 const hasLicenses=legalPages.some(page=>page.id==="licenses");
 const placePages=pages.filter(page=>page.site_context==="teileklar"&&isPlacePage(page));
 const groups=[
  {title:text.products,ids:site==="teileklar"?["tk-home","tk-search","tk-fitment","tk-appointments","tk-partner","tk-workshop"]:["nex2fly","one","api","tk-home","tk-partner"]},
  {title:text.orientation,ids:site==="teileklar"?["tk-categories","tk-vouchers","tk-cart"]:["websites","automation","apps-portals","solutions","pricing"]},
  {title:text.company,ids:["company","contact","login","signup"]},
  {title:text.legal,ids:site==="teileklar"?["tk-legal","ai-notice","accessibility","cookies"]:["imprint","privacy","terms","ai-notice","accessibility","cookies"]}
 ];
 // Seitenübersicht: alle Seiten des Bereichs, thematisch gebündelt (kompakte Spalten statt Endlosliste)
 const sitePages=pages.filter(page=>page.site_context===site);
 const buckets:{title:string;match:(page:PublicPage)=>boolean}[]=site==="teileklar"?[
  {title:text.places,match:isPlacePage},
  {title:text.shop,match:page=>!LEGAL_IDS.has(page.id)},
  {title:text.legal,match:page=>LEGAL_IDS.has(page.id)}
 ]:[
  {title:text.services,match:page=>page.path.startsWith("/leistungen")||page.id==="scope"},
  {title:text.productsShort,match:page=>page.path.startsWith("/produkte")||page.id==="solutions"||page.id==="pricing"},
  {title:text.knowledge,match:page=>page.path.startsWith("/wissen")||["home","company","contact"].includes(page.id)},
  {title:text.account,match:page=>["login","signup"].includes(page.id)},
  {title:text.legal,match:page=>LEGAL_IDS.has(page.id)}
 ];
 const assigned=new Set<string>();
 const overview=buckets.map(bucket=>({title:bucket.title,pages:sitePages.filter(page=>{if(assigned.has(page.id)||!bucket.match(page))return false;assigned.add(page.id);return true;})})).filter(bucket=>bucket.pages.length);
 const rest=sitePages.filter(page=>!assigned.has(page.id));
 if(rest.length)overview.push({title:text.more,pages:rest});
 return <footer className="site-footer structured-footer footer-refined" data-testid="site-footer">
  <div className="footer-inner"><div className="footer-invitation"><div><h2>{invitation[0]}</h2><p>{invitation[1]}</p></div><ActionLink variant="primary" href="/kontakt">{invitation[2]}<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></ActionLink></div><div className="footer-main"><div className="footer-brand-block"><SiteLink href={site==="teileklar"?"/teileklar":"/"} aria-label={text.home} className="brand"><span className="brand-signet" aria-hidden="true"/><span className="brand-word">{site==="teileklar"?<>TEILE<strong>KLAR</strong></>:<>Ne<strong className="brand-x">X</strong>ify <span className="brand-ai">AI</span></>}<small>{text.claim}</small></span></SiteLink><p data-testid="footer-intro">{site==="teileklar"?interfaceCopy.shopFooter[locale].intro:{de:"Websites, digitale Abläufe und Kampagnen für Ihr Unternehmen. Persönlich begleitet von Pascal Courbois.",nl:"Websites, digitale processen en campagnes voor uw bedrijf. Persoonlijk begeleid door Pascal Courbois.",fr:"Sites, processus numériques et campagnes pour votre entreprise. Avec l’accompagnement de Pascal Courbois.",en:"Websites, digital workflows and campaigns for your business. Personally guided by Pascal Courbois."}[locale]}</p><ActionLink variant="text" href="/kontakt" className="footer-contact" data-testid="footer-contact-link">{site==="teileklar"?interfaceCopy.shopFooter[locale].contact:text.contact} <span aria-hidden="true">→</span></ActionLink></div>
  <div className={`footer-link-groups ${placePages.length?'has-places':''}`}>
   {groups.map((group,groupIndex)=><nav key={group.title} aria-label={group.title} data-testid={`footer-group-${groupIndex}`}><h2 data-testid={`footer-group-title-${groupIndex}`}>{group.title}</h2>{group.ids.flatMap(id=>{const page=pages.find(item=>item.id===id);return page?[<SiteLink key={id} href={page.path} data-testid={`footer-group-${groupIndex}-link-${id}`}>{labels[page.id]||page.localizedTitle[locale]}</SiteLink>]:[];})}</nav>)}
   {placePages.length>0&&<nav aria-label={text.places} data-testid="footer-places"><h2>{text.places}</h2>{placePages.slice(0,8).map(page=><SiteLink key={page.id} href={page.path}>{page.localizedTitle[locale]}</SiteLink>)}</nav>}
  </div>
  </div><div className="footer-bottom">
   <span className="footer-claim">{site==="teileklar"?"TEILEKLAR — Na KLAR!":"NeXify AI"} <span aria-hidden="true">·</span> {site==="teileklar"?interfaceCopy.shopFooter[locale].areas:text.claim}</span>

   <SiteLink href={site==="teileklar"?"/":"/teileklar"} className="footer-crosslink">{site==="teileklar"?"NeXify AI":"TEILEKLAR"} <span aria-hidden="true">→</span></SiteLink>
   <details className="footer-overview" onToggle={event=>setOverviewOpen(event.currentTarget.open)} data-testid="footer-overview">
    <summary data-testid="footer-overview-toggle" aria-expanded={overviewOpen} aria-controls={overviewId}><span>{text.all}</span><span className="footer-overview-marker" aria-hidden="true">{overviewOpen?"−":"+"}</span></summary>
    <div className="footer-overview-panel" id={overviewId} data-testid="footer-overview-panel">
     <p className="footer-overview-hint" data-testid="footer-overview-hint">{text.allHint}</p>
     <nav aria-label={text.all} className="footer-overview-columns">{overview.map(bucket=><div key={bucket.title} className="footer-overview-group"><h3>{bucket.title}</h3>{bucket.pages.map(page=><SiteLink key={page.id} href={page.path} data-testid={`footer-overview-link-${page.id}`}>{page.localizedTitle[locale]}</SiteLink>)}</div>)}</nav>
    </div>
   </details>
  </div>
 <div className="footer-legal">
  <nav className="footer-legal-direct" aria-label={legal.links} data-testid="footer-legal-direct">{legalPages.map(page=><SiteLink key={page.id} href={page.path} data-testid={`footer-legal-link-${page.id}`}>{page.label}</SiteLink>)}</nav>
  <details className="footer-legal-details" onToggle={event=>setLegalExpanded(event.currentTarget.open)}>
   <summary data-testid="footer-legal-details-toggle" aria-expanded={legalExpanded} aria-controls={noticeId}>{legal.summary}</summary>
   <div id={noticeId}><p>{site==="teileklar"?legal.shopNotice:legal.notice}</p><p>{hasLicenses?legal.licenseNotice:legal.missingLicenses}</p></div>
  </details>
 </div>
 </div><div className="footer-utilities"><InstallInvitation locale={locale}/>
 <DiagnosticConsent locale={locale}/></div>
 </footer>;
}
