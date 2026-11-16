'use client';
import {useEffect,useState} from 'react';
import {HcArrow} from '../HcArrow';
import {SiteLink} from '../Router';
import {api,type Product} from './api';
import {ProductCard,ProductImage} from './ProductCard';
import {CatalogStatus} from './CatalogStatus';
import {HeroStage} from '../IdentityHero';
import {ActionButton,ActionLink} from '../ActionControl';
import schaufenster from '../../../../config/teileklar-schaufenster.json';
import './Storefront.css';
import '../HomeConcept.css';
import '../PageConcept.css';
import '../HomeMaster.css';
type Category={id:number;name:string;count:number;root:boolean};
// Auftrag der koordinierenden Sitzung, 15.11.2026: Solange das eigene Sortiment leer ist, soll /teileklar den
// laufenden Shop unter der eigenen Adresse zeigen statt ein leeres Schaufenster. Umgestellt wird mit einem Wort in
// config/teileklar-schaufenster.json ("quelle": "eigen" | "extern"); der Vorgabewert laesst alles wie bisher.
const EXTERN=schaufenster.quelle==='extern';
const SHOP=schaufenster.externer_shop;
export const Storefront=()=>{
 // Befund 15.11.2026 (Inhaltspruefung der zweiten Sitzung, Befund 02): In Produktion antwortet der Dienst mit 200 und
 // null Artikeln. Dann stand dauerhaft „Das Schaufenster wird geladen …“ - ein Ladehinweis, der nie endet, wirkt wie ein
 // Defekt. `geladen` trennt jetzt die drei Zustaende: laedt noch, geladen und leer, nicht erreichbar.
 const[products,setProducts]=useState<Product[]>([]),[categories,setCategories]=useState<Category[]>([]),[failed,setFailed]=useState(false),[geladen,setGeladen]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{const c=new AbortController();setFailed(false);setGeladen(false);Promise.all([api<{items:Product[]}>('/api/shop/products?page_size=12&in_stock=true',{signal:c.signal}),api<{categories:Category[]}>('/api/shop/categories',{signal:c.signal})]).then(([p,cat])=>{setProducts(p.items);setCategories(cat.categories.filter(x=>!x.root).slice(0,6));setGeladen(true);}).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();},[reload]);
 return <div className="home-concept page-concept tk-shop" data-testid="storefront"><HeroStage headingId="storefront-title" testIds={{headline:'storefront-title'}}
   lead={<span className="hc-kicker">TEILEKLAR.shop<span aria-hidden="true"> / </span>AUTO & MOTORRAD</span>}
   title={<><span>Für Ihr Auto. </span><span className="identity-title-accent">Klar gefunden.</span></>}
   body="Vom praktischen Zubehör bis zur Pflege: Entdecken Sie unser Sortiment. Mit Originalfotos, nachvollziehbaren Preisen und klaren Produktangaben."
   actions={<><ActionLink variant="primary" className="identity-primary-link" href="#sortiment" data-testid="storefront-browse"><span>Sortiment entdecken</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink><ActionLink variant="secondary" className="identity-secondary-link" href="/teileklar/fahrzeug-und-passung" data-testid="storefront-fitment">Passt der Artikel zu meinem Fahrzeug?<HcArrow/></ActionLink></>}
   media={EXTERN?<div className="tk-window-products tk-window-extern" aria-label="Einblicke ins Sortiment"><div className="tk-empty"><p>Das vollständige Sortiment liegt im laufenden Shop unter <strong>{SHOP.name}</strong>: Artikel, Preise und Bestellung an einer Stelle.</p><ActionLink variant="primary" className="identity-primary-link" href={SHOP.adresse} data-testid="storefront-extern-hero"><span>Zu {SHOP.name}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink></div></div>:<div className="tk-window-products" aria-label="Einblicke ins Sortiment">{products.slice(0,3).map((p,i)=><SiteLink href={'/teileklar/produkt/'+p.id} className={'tk-window-product item-'+i} key={p.id} data-testid={'window-product-'+p.id}><ProductImage src={p.image} alt={p.name}/><span>{p.name}</span></SiteLink>)}{!products.length&&<div className="tk-window-loading" role="status">{failed?'Das Sortiment ist gerade nicht abrufbar.':geladen?'Zurzeit sind keine Artikel im Schaufenster.':'Das Schaufenster wird geladen …'}</div>}</div>}/>
 {/* Unter dem Hero dieselben Bausteine wie die Startseite: hc-section, hc-section-heading, hc-kicker, hc-text-link, hc-budget-story. */}
 <section className="hc-container tk-shopping-points" aria-label="Einkaufsinformationen"><div><span>01</span><p><strong>Preise inklusive MwSt.</strong></p><p className="hc-caption">Versandkosten vor Bestellabschluss</p></div><div><span>02</span><p><strong>Sichere Zahlungsseite</strong></p><p className="hc-caption">Bezahlung über Revolut</p></div><div><span>03</span><p><strong>Erst prüfen, dann bestellen</strong></p><p className="hc-caption">Keine ungeprüfte Passformzusage</p></div></section>
 <section className="hc-section hc-container tk-window-categories" data-testid="storefront-categories"><header className="hc-section-heading"><span className="hc-kicker">Ihr Einstieg</span><h2>Was suchen Sie?</h2><SiteLink href="/teileklar/kategorien" className="hc-text-link" data-testid="all-categories-link">Alle Kategorien<HcArrow/></SiteLink></header>{EXTERN?<div className="tk-empty"><p>Die Einteilung des Sortiments finden Sie im laufenden Shop unter {SHOP.name}.</p></div>:categories.length
   // Befund 15.11.2026: Ohne Kategorien blieb unter der Ueberschrift eine leere Flaeche stehen - ohne Hinweis, woran es
   // liegt. Jetzt derselbe Hinweisbaustein wie beim Sortiment darunter (.tk-empty).
   ?<div className="tk-category-tiles">{categories.map(cat=><SiteLink href={'/teileklar/kategorie/'+cat.id} key={cat.id} data-testid={'window-category-'+cat.id}><span>{cat.name}</span><small>{cat.count} Artikel</small><b aria-hidden="true"><HcArrow direction="out"/></b></SiteLink>)}</div>
   :<div className="tk-empty" role="status" data-testid="storefront-categories-empty"><p>{failed?'Die Kategorien sind gerade nicht abrufbar. Der Shop-Dienst antwortet nicht.':geladen?'Zurzeit sind keine Kategorien eingestellt.':'Kategorien werden geladen …'}</p></div>}</section>
 <section className="hc-section hc-container tk-window-selection" id="sortiment" data-testid="storefront-selection"><header className="hc-section-heading"><span className="hc-kicker">Aus dem Sortiment</span><h2>Artikel im Schaufenster</h2><SiteLink href="/teileklar/shop" className="hc-text-link" data-testid="all-products-link">Alle Artikel ansehen<HcArrow/></SiteLink></header>{EXTERN?<div className="tk-empty" data-testid="storefront-extern"><p>Alle Artikel stehen im laufenden Shop unter {SHOP.name}. Dort sehen Sie Bestand, Preise inklusive Mehrwertsteuer und die Versandkosten vor dem Bestellabschluss.</p><ActionLink variant="primary" className="hc-finish-primary" href={SHOP.adresse} data-testid="storefront-extern-link">Sortiment bei {SHOP.name} ansehen<HcArrow direction="out"/></ActionLink></div>:failed?<div className="tk-empty" role="alert"><p>Das Sortiment konnte nicht geladen werden.</p><ActionButton variant="secondary" className="hc-text-link" onClick={()=>setReload(n=>n+1)} data-testid="storefront-retry">Erneut versuchen</ActionButton></div>:geladen&&!products.length?<div className="tk-empty" role="status" data-testid="storefront-empty"><p>Zurzeit sind keine Artikel eingestellt. Das Sortiment wird gerade aufgebaut.</p></div>:<ul className="tk-grid tk-window-grid">{products.slice(0,8).map(p=><ProductCard key={p.id} product={p}/>)}</ul>}</section>
 <section className="hc-section hc-budget hc-container"><div className="hc-budget-story"><header className="hc-section-heading"><span className="hc-kicker">Vor dem Kauf</span><h2>Gut informiert.<br/>Klar entschieden.</h2><p>Vergleichen Sie Artikelnummer und Herstellerangaben. Ein Produktfoto allein bestätigt keine Fahrzeugpassung.</p><SiteLink href="/teileklar/fahrzeug-und-passung" className="hc-text-link" data-testid="buying-guide-link">Zur Passform-Checkliste<HcArrow/></SiteLink></header><div className="hc-costs"><div><h3>So bestellen Sie</h3><div className="hc-service-body"><ol><li>Artikel auswählen und Angaben prüfen</li><li>Menge festlegen und zum Warenkorb hinzufügen</li><li>Lieferadresse, Versand und Gesamtpreis prüfen</li><li>Bestellung bestätigen und sicher bezahlen</li></ol><SiteLink href="/teileklar/rechtliches" className="hc-text-link" data-testid="buying-legal-link">Versand, Widerruf und Bedingungen<HcArrow/></SiteLink></div></div></div></div></section>
 <details className="hc-container tk-source-disclosure" data-testid="catalog-data-details"><summary>Datenstand und Lieferanteninformationen</summary><CatalogStatus/></details></div>;
};
