"use client";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import "./TeileklarTools.css";

const copy={
 de:{kicker:"Sortiment",title:"Einstieg ins Sortiment",intro:"W\u00e4hlen Sie einen Bereich oder starten Sie \u00fcber Ihr Fahrzeug. Online-Bestellungen sind derzeit nicht m\u00f6glich; wir ordnen das passende Teil zu und melden uns pers\u00f6nlich.",entry:"So starten Sie",categories:"Teilebereiche",byVehicle:"Nach Fahrzeug suchen",byVehicleHint:"Hersteller, Modell und Baujahr angeben",bySearch:"Teilnummer oder Stichwort",bySearchHint:"Gezielt nach OE-/Teilenummer suchen",tyres:"Reifenrechner",tyresHint:"Reifengr\u00f6\u00dfen vergleichen",battery:"Batterie-Berater",batteryHint:"Passende Starterbatterie finden",note:"Die Bereiche sind Einstiegspunkte. Verf\u00fcgbarkeit, Passung und Preis besprechen wir individuell anhand Ihres Fahrzeugs."},
 nl:{kicker:"Assortiment",title:"Ingang tot het assortiment",intro:"Kies een onderdeel of start via uw voertuig. Online bestellen is momenteel niet mogelijk; wij bepalen het passende onderdeel en nemen persoonlijk contact op.",entry:"Zo begint u",categories:"Onderdeelgebieden",byVehicle:"Op voertuig zoeken",byVehicleHint:"Merk, model en bouwjaar opgeven",bySearch:"Onderdeelnummer of trefwoord",bySearchHint:"Gericht op OE-/onderdeelnummer zoeken",tyres:"Bandencalculator",tyresHint:"Bandenmaten vergelijken",battery:"Accu-adviseur",batteryHint:"De juiste startaccu vinden",note:"De gebieden zijn ingangen. Beschikbaarheid, pasvorm en prijs bespreken we per voertuig."},
 fr:{kicker:"Assortiment",title:"Entr\u00e9e dans l\u2019assortiment",intro:"Choisissez un domaine ou commencez par votre v\u00e9hicule. La commande en ligne n\u2019est pas possible actuellement ; nous identifions la pi\u00e8ce adapt\u00e9e et vous r\u00e9pondons personnellement.",entry:"Pour commencer",categories:"Domaines de pi\u00e8ces",byVehicle:"Rechercher par v\u00e9hicule",byVehicleHint:"Indiquer marque, mod\u00e8le et ann\u00e9e",bySearch:"R\u00e9f\u00e9rence ou mot-cl\u00e9",bySearchHint:"Rechercher par r\u00e9f\u00e9rence OE/pi\u00e8ce",tyres:"Calculateur de pneus",tyresHint:"Comparer les dimensions",battery:"Conseiller batterie",batteryHint:"Trouver la bonne batterie",note:"Les domaines sont des points d\u2019entr\u00e9e. Disponibilit\u00e9, compatibilit\u00e9 et prix se discutent selon le v\u00e9hicule."},
 en:{kicker:"Range",title:"Entry into the range",intro:"Choose an area or start from your vehicle. Online ordering is currently not possible; we identify the right part and respond personally.",entry:"How to start",categories:"Part areas",byVehicle:"Search by vehicle",byVehicleHint:"Enter make, model and year",bySearch:"Part number or keyword",bySearchHint:"Search by OE/part number",tyres:"Tyre calculator",tyresHint:"Compare tyre sizes",battery:"Battery advisor",batteryHint:"Find the right battery",note:"The areas are entry points. Availability, fit and price are discussed per vehicle."}
};
const categories:Record<Locale,string[]>={
 de:["Bremsen","Filter","\u00d6l & Betriebsstoffe","Z\u00fcndung & Gl\u00fchkerzen","Fahrwerk & Lenkung","Elektrik & Batterie","Reifen & R\u00e4der","Beleuchtung","K\u00fchlung","Abgasanlage","Scheibenwischer","Karosserie"],
 nl:["Remmen","Filters","Olie & vloeistoffen","Ontsteking & gloeibougies","Onderstel & besturing","Elektra & accu","Banden & wielen","Verlichting","Koeling","Uitlaat","Ruitenwissers","Carrosserie"],
 fr:["Freins","Filtres","Huile & fluides","Allumage & bougies","Train roulant & direction","\u00c9lectricit\u00e9 & batterie","Pneus & roues","\u00c9clairage","Refroidissement","\u00c9chappement","Essuie-glaces","Carrosserie"],
 en:["Brakes","Filters","Oil & fluids","Ignition & glow plugs","Suspension & steering","Electrics & battery","Tyres & wheels","Lighting","Cooling","Exhaust","Wipers","Body"]
};

export default function ShopOverview({locale,pages}:{locale:Locale;pages:PublicPage[]}){
 const t=copy[locale];
 const path=(id:string,fallback:string)=>pages.find(p=>p.id===id)?.path||fallback;
 const cat=path("tk-categories","/teileklar/kategorien");
 const entries=[
  {id:"tk-fitment",label:t.byVehicle,hint:t.byVehicleHint,href:path("tk-fitment","/teileklar/fahrzeug-und-passung"),tid:"shop-entry-fahrzeug"},
  {id:"tk-search",label:t.bySearch,hint:t.bySearchHint,href:path("tk-search","/teileklar/suche"),tid:"shop-entry-suche"},
  {id:"tk-reifenrechner",label:t.tyres,hint:t.tyresHint,href:path("tk-reifenrechner","/teileklar/reifenrechner"),tid:"shop-entry-reifen"},
  {id:"tk-batterie",label:t.battery,hint:t.batteryHint,href:path("tk-batterie","/teileklar/batterie-berater"),tid:"shop-entry-batterie"}
 ];
 return <section className="tk-tool" aria-labelledby="shop-overview-title" data-testid="shop-overview">
  <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="shop-overview-title">{t.title}</h2><p>{t.intro}</p></div>
  <p className="tk-subhead">{t.entry}</p>
  <div className="tk-grid" style={{marginBottom:"var(--space-6)"}}>
   {entries.map(e=><SiteLink key={e.id} href={e.href} className="tk-tile is-entry" data-testid={e.tid}><span className="tk-tile-label">{e.label}<span aria-hidden="true">→</span></span><small>{e.hint}</small></SiteLink>)}
  </div>
  <p className="tk-subhead">{t.categories}</p>
  <div className="tk-grid" data-testid="shop-category-grid">
   {categories[locale].map((name,i)=><SiteLink key={i} href={cat} className="tk-tile" data-testid={`shop-category-${i}`}><span className="tk-tile-label">{name}<span aria-hidden="true">→</span></span></SiteLink>)}
  </div>
  <p className="tk-note" style={{marginTop:"var(--space-5)"}}>{t.note}</p>
 </section>;
}
