import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import {ActionButton} from './ActionControl';

const labels:Record<string,Record<Locale,string>>={services:{de:"Leistungen",nl:"Diensten",fr:"Services"},solutions:{de:"Produkte",nl:"Producten",fr:"Produits"},pricing:{de:"Preise",nl:"Prijzen",fr:"Tarifs"},knowledge:{de:"Arbeitsweise",nl:"Werkwijze",fr:"Méthode"},company:{de:"Unternehmen",nl:"Bedrijf",fr:"Entreprise"},contact:{de:"Kontakt",nl:"Contact",fr:"Contact"}};
const minimalNavIds=new Set(["services","knowledge","contact"]);
export default function SiteNavigation({pages,site,locale,pathname}:{pages:PublicPage[];site:string;locale:Locale;pathname:string}){
 const navigation=pages.filter(page=>page.navigationContexts.includes(site)).filter(page=>minimalNavIds.has(page.id));
 const label=(page:PublicPage)=>labels[page.id]?.[locale]||page.localizedTitle[locale];
 const products=["solutions","nex2fly","one","api","tk-home","tk-workshop"].flatMap(id=>{const page=pages.find(item=>item.id===id);return page?[page]:[];});
 return <>
  <nav className="main-navigation" aria-label={locale==="de"?"Hauptnavigation":locale==="nl"?"Hoofdnavigatie":"Navigation principale"}>{navigation.map(page=>page.id==="solutions"?<details key={page.id} className="product-navigation"><summary>{label(page)}<span aria-hidden="true">⌄</span></summary><div className="product-navigation-menu">{products.map(product=><SiteLink key={product.id} href={product.path} aria-current={pathname===product.path?"page":undefined}>{product.localizedTitle[locale]}<span aria-hidden="true">→</span></SiteLink>)}</div></details>:<SiteLink key={page.id} href={page.path} aria-current={pathname===page.path?"page":undefined}>{label(page)}</SiteLink>)}</nav>
  <details className="mobile-navigation" data-testid="mobile-navigation" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary aria-label={locale==='de'?'Menü':locale==='nl'?'Menu':'Menu'} data-testid="mobile-navigation-toggle">☰</summary><nav aria-label={locale==="de"?"Seitenmenü":locale==="nl"?"Paginamenu":"Menu des pages"}>{navigation.map(page=><SiteLink key={page.id} href={page.path} aria-current={pathname===page.path?"page":undefined}>{label(page)}</SiteLink>)}{["nex2fly","login","signup"].flatMap(id=>{const page=pages.find(item=>item.id===id);return page?[<SiteLink key={id} href={page.path}>{page.localizedTitle[locale]}</SiteLink>]:[];})}<ActionButton variant="quiet" data-testid="mobile-navigation-close" onClick={event=>{const menu=event.currentTarget.closest('details');if(menu){menu.open=false;menu.querySelector('summary')?.focus();}}}>{locale==='de'?'Menü schließen':locale==='nl'?'Menu sluiten':'Fermer le menu'}</ActionButton></nav></details>
 </>;
}
