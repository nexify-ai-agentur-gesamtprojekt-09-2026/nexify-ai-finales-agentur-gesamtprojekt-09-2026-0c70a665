"use client";
import {useId,useState} from "react";
import DiagnosticConsent from "./DiagnosticConsent";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import {ActionLink} from './ActionControl';

// Footer = ruhiger Abschluss jeder Seite: Marke + Einstieg links, vier Linkgruppen rechts, darunter eine kompakte
// Seitenübersicht (gruppiert, mehrspaltig – keine lange Liste) und die Pflichtangaben. Vorbereitet für Master §30:
// Stadt-/Werkstattseiten erscheinen automatisch als eigene Gruppe, sobald sie im Seitenplan existieren (keine erfundenen Einträge).
const copy={
 de:{intro:"Aus Ideen werden klare nächste Schritte. Persönlich besprechen, digital verbinden, gemeinsam weiterarbeiten.",products:"Produkte und Bereiche",orientation:"Orientierung",company:"Unternehmen",legal:"Rechtliches",places:"Städte und Werkstätten",all:"Seitenübersicht",allHint:"Alle Seiten dieses Bereichs, nach Themen geordnet",preview:"Beta-Version",home:"Zur Startseite",contact:"Vorhaben besprechen",more:"Weitere Seiten",services:"Leistungen",productsShort:"Produkte",knowledge:"Wissen und Unternehmen",shop:"TEILEKLAR",account:"Konto",languages:"Sprache",claim:"Chat it. Automate it."},
 nl:{intro:"Van ideeën naar heldere volgende stappen. Persoonlijk bespreken, digitaal verbinden en samen verder werken.",products:"Producten en onderdelen",orientation:"Oriëntatie",company:"Bedrijf",legal:"Juridisch",places:"Steden en werkplaatsen",all:"Pagina-overzicht",allHint:"Alle pagina’s van dit onderdeel, op thema geordend",preview:"Beta-versie",home:"Naar de startpagina",contact:"Je plan bespreken",more:"Overige pagina’s",services:"Diensten",productsShort:"Producten",knowledge:"Kennis en bedrijf",shop:"TEILEKLAR",account:"Account",languages:"Taal",claim:"Chat it. Automate it."},
 fr:{intro:"Des idées aux prochaines étapes concrètes. En parler, connecter les outils et avancer ensemble.",products:"Produits et espaces",orientation:"Repères",company:"Entreprise",legal:"Informations légales",places:"Villes et ateliers",all:"Plan du site",allHint:"Toutes les pages de cet espace, classées par thème",preview:"Version bêta",home:"Vers l’accueil",contact:"Parler du projet",more:"Autres pages",services:"Services",productsShort:"Produits",knowledge:"Savoir et entreprise",shop:"TEILEKLAR",account:"Compte",languages:"Langue",claim:"Chat it. Automate it."}
};

const legalCopy={
 de:{links:"Rechtsdokumente",shopLegal:"TEILEKLAR: Anbieterinformationen und Datenschutz",shopNotice:"Die Rechtsinformationen für TEILEKLAR sind direkt erreichbar. Vollständige Angaben zum Anbieter, Datenschutz und Verbraucherrechten im Shop stehen noch zur Prüfung und Freigabe.",imprint:"Impressum",privacy:"Datenschutz",licenses:"Lizenzen",summary:"Hinweise zu den Rechtsdokumenten",notice:"Die Seiten zu Anbieterinformationen und Datenschutz sind direkt erreichbar. Vollständige Pflichtangaben und Rechtstexte stehen noch zur Prüfung und Freigabe.",licenseNotice:"Hinweise zu Drittanbieter-Komponenten und ihren Lizenzen findest du unter Lizenzen.",missingLicenses:"Eine öffentliche Übersicht der Drittanbieter-Komponenten und ihrer Lizenzen ist noch nicht verfügbar."},
 nl:{links:"Juridische documenten",shopLegal:"TEILEKLAR: aanbiederinformatie en privacy",shopNotice:"De juridische informatie voor TEILEKLAR is rechtstreeks bereikbaar. Volledige informatie over de aanbieder, privacy en consumentenrechten in de winkel moet nog worden gecontroleerd en goedgekeurd.",imprint:"Colofon",privacy:"Privacy",licenses:"Licenties",summary:"Toelichting op de juridische documenten",notice:"De pagina’s met aanbiederinformatie en privacyinformatie zijn rechtstreeks bereikbaar. Volledige verplichte gegevens en juridische teksten moeten nog worden gecontroleerd en goedgekeurd.",licenseNotice:"Informatie over componenten van derden en hun licenties vind je onder Licenties.",missingLicenses:"Een openbaar overzicht van componenten van derden en hun licenties is nog niet beschikbaar."},
 fr:{links:"Documents juridiques",shopLegal:"TEILEKLAR : prestataire et confidentialité",shopNotice:"Les informations juridiques de TEILEKLAR sont directement accessibles. Les informations complètes sur le prestataire, la confidentialité et les droits des consommateurs de la boutique restent à vérifier et à valider.",imprint:"Mentions légales",privacy:"Confidentialité",licenses:"Licences",summary:"À propos des documents juridiques",notice:"Les pages relatives au prestataire et à la confidentialité sont directement accessibles. Les mentions obligatoires et les textes juridiques complets restent à vérifier et à valider.",licenseNotice:"Les informations sur les composants tiers et leurs licences figurent sous Licences.",missingLicenses:"Un aperçu public des composants tiers et de leurs licences n’est pas encore disponible."}
};

const LEGAL_IDS=new Set(["imprint","privacy","terms","ai-notice","accessibility","cookies","tk-legal","licenses"]);
const isPlacePage=(page:PublicPage)=>page.id.startsWith("tk-city")||page.id.startsWith("tk-stadt")||page.path.startsWith("/teileklar/staedte")||page.path.startsWith("/teileklar/stadt/");

export default function SiteFooter({pages,site,locale}:{pages:PublicPage[];site:string;locale:Locale}){
 const text=copy[locale];
 const legal=legalCopy[locale],noticeId=useId(),overviewId=useId();
 const [legalExpanded,setLegalExpanded]=useState(false);
 const [overviewOpen,setOverviewOpen]=useState(false);
 const legalPages=(site==="teileklar"?[{id:"tk-legal",label:legal.shopLegal}]:[{id:"imprint",label:legal.imprint},{id:"privacy",label:legal.privacy},{id:"licenses",label:legal.licenses}]).flatMap(item=>{const page=pages.find(page=>page.id===item.id&&page.site_context===site);return page?[{...item,path:page.path}]:[];});
 const hasLicenses=legalPages.some(page=>page.id==="licenses");
 const placePages=pages.filter(page=>page.site_context==="teileklar"&&isPlacePage(page));
 const groups=[
  {title:text.products,ids:site==="teileklar"?["tk-home","tk-search","tk-fitment","tk-appointments","tk-partner","tk-workshop"]:["nex2fly","one","api","tk-home","tk-partner"]},
  {title:text.orientation,ids:site==="teileklar"?["tk-categories","tk-vouchers","tk-cart"]:["services","solutions","pricing","scope","knowledge-start"]},
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
 return <footer className="site-footer structured-footer" data-testid="site-footer">
  <div className="footer-brand-block"><SiteLink href={site==="teileklar"?"/teileklar":"/"} aria-label={text.home} className="brand"><img src="/signet.svg" alt="" width="30" height="30"/><span>{site==="teileklar"?<>TEILE<strong>KLAR</strong></>:<>Ne<strong>X</strong>ify <strong>AI</strong></>}<small>{text.claim}</small></span></SiteLink><p>{text.intro}</p><ActionLink variant="text" href="/kontakt" className="footer-contact" data-testid="footer-contact-link">{text.contact} <span aria-hidden="true">→</span></ActionLink></div>
  <div className={`footer-link-groups ${placePages.length?'has-places':''}`}>
   {groups.map((group,groupIndex)=><nav key={group.title} aria-label={group.title} data-testid={`footer-group-${groupIndex}`}><h2 data-testid={`footer-group-title-${groupIndex}`}>{group.title}</h2>{group.ids.flatMap(id=>{const page=pages.find(item=>item.id===id);return page?[<SiteLink key={id} href={page.path} data-testid={`footer-group-${groupIndex}-link-${id}`}>{page.localizedTitle[locale]}</SiteLink>]:[];})}</nav>)}
   {placePages.length>0&&<nav aria-label={text.places} data-testid="footer-places"><h2>{text.places}</h2>{placePages.slice(0,8).map(page=><SiteLink key={page.id} href={page.path}>{page.localizedTitle[locale]}</SiteLink>)}</nav>}
  </div>
  <div className="footer-bottom">
   <span className="footer-claim">{site==="teileklar"?"TEILEKLAR":"NeXify AI"} <span aria-hidden="true">·</span> {text.claim}</span>
   <span className="preview-badge">{text.preview}</span>
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
 <DiagnosticConsent locale={locale}/>
 </footer>;
}
