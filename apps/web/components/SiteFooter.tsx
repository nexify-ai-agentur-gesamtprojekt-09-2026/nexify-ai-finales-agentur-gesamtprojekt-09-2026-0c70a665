"use client";
import {useId,useState} from "react";
import DiagnosticConsent from "./DiagnosticConsent";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";

const copy={
 de:{intro:"Aus Ideen werden klare nächste Schritte. Persönlich besprechen, digital verbinden, gemeinsam weiterarbeiten.",products:"Produkte und Bereiche",orientation:"Orientierung",company:"Unternehmen",legal:"Rechtliches",all:"Alle Seiten",preview:"Entwicklungsvorschau",home:"Zur Startseite",contact:"Vorhaben besprechen"},
 nl:{intro:"Van ideeën naar heldere volgende stappen. Persoonlijk bespreken, digitaal verbinden en samen verder werken.",products:"Producten en onderdelen",orientation:"Oriëntatie",company:"Bedrijf",legal:"Juridisch",all:"Alle pagina’s",preview:"Ontwikkelvoorbeeld",home:"Naar de startpagina",contact:"Je plan bespreken"},
 fr:{intro:"Des idées aux prochaines étapes concrètes. En parler, connecter les outils et avancer ensemble.",products:"Produits et espaces",orientation:"Repères",company:"Entreprise",legal:"Informations légales",all:"Toutes les pages",preview:"Aperçu de développement",home:"Vers l’accueil",contact:"Parler du projet"}
};

const legalCopy={
 de:{links:"Rechtsdokumente",imprint:"Impressum",privacy:"Datenschutz",licenses:"Lizenzen",summary:"Hinweise zu den Rechtsdokumenten",notice:"Die Seiten zu Anbieterinformationen und Datenschutz sind direkt erreichbar. Vollständige Pflichtangaben und Rechtstexte stehen noch zur Prüfung und Freigabe.",licenseNotice:"Hinweise zu Drittanbieter-Komponenten und ihren Lizenzen findest du unter Lizenzen.",missingLicenses:"Eine öffentliche Übersicht der Drittanbieter-Komponenten und ihrer Lizenzen ist noch nicht verfügbar."},
 nl:{links:"Juridische documenten",imprint:"Colofon",privacy:"Privacy",licenses:"Licenties",summary:"Toelichting op de juridische documenten",notice:"De pagina’s met aanbiederinformatie en privacyinformatie zijn rechtstreeks bereikbaar. Volledige verplichte gegevens en juridische teksten moeten nog worden gecontroleerd en goedgekeurd.",licenseNotice:"Informatie over componenten van derden en hun licenties vind je onder Licenties.",missingLicenses:"Een openbaar overzicht van componenten van derden en hun licenties is nog niet beschikbaar."},
 fr:{links:"Documents juridiques",imprint:"Mentions légales",privacy:"Confidentialité",licenses:"Licences",summary:"À propos des documents juridiques",notice:"Les pages relatives au prestataire et à la confidentialité sont directement accessibles. Les mentions obligatoires et les textes juridiques complets restent à vérifier et à valider.",licenseNotice:"Les informations sur les composants tiers et leurs licences figurent sous Licences.",missingLicenses:"Un aperçu public des composants tiers et de leurs licences n’est pas encore disponible."}
};

export default function SiteFooter({pages,site,locale}:{pages:PublicPage[];site:string;locale:Locale}){
 const text=copy[locale];
 const legal=legalCopy[locale],noticeId=useId();
 const [legalExpanded,setLegalExpanded]=useState(false);
 const legalPages=[{id:"imprint",label:legal.imprint},{id:"privacy",label:legal.privacy},{id:"licenses",label:legal.licenses}].flatMap(item=>{const page=pages.find(page=>page.id===item.id);return page?[{...item,path:page.path}]:[];});
 const hasLicenses=legalPages.some(page=>page.id==="licenses");
 const groups=[
  {title:text.products,ids:site==="teileklar"?["tk-home","tk-search","tk-fitment","tk-appointments","tk-partner","tk-workshop"]:["nex2fly","one","api","tk-home","tk-partner"]},
  {title:text.orientation,ids:site==="teileklar"?["tk-categories","tk-vouchers","tk-cart"]:["services","solutions","pricing","scope","knowledge-start"]},
  {title:text.company,ids:["company","contact","login","signup"]},
  {title:text.legal,ids:site==="teileklar"?["tk-legal","privacy","ai-notice","accessibility","cookies"]:["imprint","privacy","terms","ai-notice","accessibility","cookies"]}
 ];
 return <footer className="site-footer structured-footer">
  <div className="footer-brand-block"><SiteLink href={site==="teileklar"?"/teileklar":"/"} aria-label={text.home} className="brand"><img src="/signet.svg" alt="" width="30" height="30"/><span>{site==="teileklar"?"TEILEKLAR":"NeXify AI"}<small>Chat it. Automate it.</small></span></SiteLink><p>{text.intro}</p><SiteLink href="/kontakt" className="footer-contact">{text.contact} <span aria-hidden="true">→</span></SiteLink></div>
  <div className="footer-link-groups">{groups.map(group=><nav key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.ids.flatMap(id=>{const page=pages.find(item=>item.id===id);return page?[<SiteLink key={id} href={page.path}>{page.localizedTitle[locale]}</SiteLink>]:[];})}</nav>)}</div>
  <div className="footer-bottom"><span>NeXify AI · Chat it. Automate it.</span><span className="preview-badge">{text.preview}</span><SiteLink href={site==="teileklar"?"/":"/teileklar"}>{site==="teileklar"?"NeXify AI":"TEILEKLAR"} →</SiteLink><details><summary>{text.all}</summary><nav aria-label={text.all}>{pages.filter(page=>page.site_context===site).map(page=><SiteLink key={page.id} href={page.path}>{page.localizedTitle[locale]}</SiteLink>)}</nav></details></div>
 <div className="footer-legal">
  <nav className="footer-legal-direct" aria-label={legal.links}>{legalPages.map(page=><SiteLink key={page.id} href={page.path}>{page.label}</SiteLink>)}</nav>
  <details className="footer-legal-details" onToggle={event=>setLegalExpanded(event.currentTarget.open)}>
   <summary aria-expanded={legalExpanded} aria-controls={noticeId}>{legal.summary}</summary>
   <div id={noticeId}><p>{legal.notice}</p><p>{hasLicenses?legal.licenseNotice:legal.missingLicenses}</p></div>
  </details>
 </div>
 <DiagnosticConsent locale={locale}/>
 </footer>;
}
