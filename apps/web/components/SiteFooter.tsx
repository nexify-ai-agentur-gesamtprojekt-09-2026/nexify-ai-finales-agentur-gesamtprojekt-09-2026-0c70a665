import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";

const copy={
 de:{intro:"Aus Ideen werden klare nächste Schritte. Persönlich besprechen, digital verbinden, gemeinsam weiterarbeiten.",products:"Produkte und Bereiche",orientation:"Orientierung",company:"Unternehmen",legal:"Rechtliches",all:"Alle Seiten",preview:"Entwicklungsvorschau",home:"Zur Startseite",contact:"Vorhaben besprechen"},
 nl:{intro:"Van ideeën naar heldere volgende stappen. Persoonlijk bespreken, digitaal verbinden en samen verder werken.",products:"Producten en onderdelen",orientation:"Oriëntatie",company:"Bedrijf",legal:"Juridisch",all:"Alle pagina’s",preview:"Ontwikkelvoorbeeld",home:"Naar de startpagina",contact:"Je plan bespreken"},
 fr:{intro:"Des idées aux prochaines étapes concrètes. En parler, connecter les outils et avancer ensemble.",products:"Produits et espaces",orientation:"Repères",company:"Entreprise",legal:"Informations légales",all:"Toutes les pages",preview:"Aperçu de développement",home:"Vers l’accueil",contact:"Parler du projet"}
};

export default function SiteFooter({pages,site,locale}:{pages:PublicPage[];site:string;locale:Locale}){
 const text=copy[locale];
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
 </footer>;
}
