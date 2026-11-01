"use client";
import {useState} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import "./TeileklarTools.css";

const copy={
 de:{kicker:"TEILEKLAR Shop",title:"Erst Passung prüfen, dann bestellen",intro:"Wählen Sie Ihr Fahrzeug über HSN/TSN, dann sehen Sie je Artikel, ob er passt. So vermeiden Sie Fehlkäufe. Muster-Shop: Beispielartikel, keine echte Lieferung und keine Zahlung.",vehicle:"Ihr Fahrzeug",hsn:"HSN (2–4)",tsn:"TSN (3)",check:"Passung prüfen",reset:"Zurücksetzen",chosen:"Gewählt",none:"Noch kein Fahrzeug gewählt – Status „prüfen“.",parts:"Beispielartikel",oe:"OE-Nr.",maker:"Hersteller",ex:"Beispiel",fits:"passt",maybe:"prüfen",nofit:"passt nicht",addToCart:"In den Warenkorb",inCart:"Im Warenkorb",cart:"Warenkorb (Muster)",items:"Artikel",order:"Zahlungspflichtig bestellen",orderNote:"Muster-Shop – es erfolgt keine echte Bestellung, Lieferung oder Zahlung.",priceNote:"Preise brutto inkl. USt., zzgl. Versand – Beispielwerte, zur Freigabe.",workshop:"Einbau in Werkstatt",workshopHint:"Termin beim Werkstattpartner zum Teil"},
 nl:{kicker:"TEILEKLAR shop",title:"Eerst pasvorm, dan bestellen",intro:"Kies uw voertuig via HSN/TSN; per artikel ziet u of het past. Zo voorkomt u miskopen. Demoshop: voorbeeldartikelen, geen echte levering of betaling.",vehicle:"Uw voertuig",hsn:"HSN (2–4)",tsn:"TSN (3)",check:"Pasvorm controleren",reset:"Wissen",chosen:"Gekozen",none:"Nog geen voertuig gekozen – status „controleren“.",parts:"Voorbeeldartikelen",oe:"OE-nr.",maker:"Fabrikant",ex:"Voorbeeld",fits:"past",maybe:"controleren",nofit:"past niet",addToCart:"In winkelwagen",inCart:"In winkelwagen",cart:"Winkelwagen (demo)",items:"artikelen",order:"Bestelling met betaalplicht",orderNote:"Demoshop – geen echte bestelling, levering of betaling.",priceNote:"Prijzen incl. btw, excl. verzending – voorbeeldwaarden, ter vrijgave.",workshop:"Montage in werkplaats",workshopHint:"Afspraak bij werkplaatspartner bij het onderdeel"},
 fr:{kicker:"Boutique TEILEKLAR",title:"D’abord la compatibilité, puis la commande",intro:"Choisissez votre véhicule via HSN/TSN ; chaque article indique s’il convient. Évitez les erreurs. Boutique démo : articles d’exemple, sans livraison ni paiement réels.",vehicle:"Votre véhicule",hsn:"HSN (2–4)",tsn:"TSN (3)",check:"Vérifier la compatibilité",reset:"Réinitialiser",chosen:"Choisi",none:"Aucun véhicule choisi – statut « à vérifier ».",parts:"Articles d’exemple",oe:"Réf. OE",maker:"Fabricant",ex:"Exemple",fits:"compatible",maybe:"à vérifier",nofit:"non compatible",addToCart:"Ajouter au panier",inCart:"Au panier",cart:"Panier (démo)",items:"articles",order:"Commande avec obligation de paiement",orderNote:"Boutique démo – aucune commande, livraison ni paiement réels.",priceNote:"Prix TTC, hors livraison – valeurs d’exemple, à valider.",workshop:"Montage en atelier",workshopHint:"Rendez-vous chez l’atelier partenaire pour la pièce"},
 en:{kicker:"TEILEKLAR shop",title:"Check fit first, then order",intro:"Select your vehicle via HSN/TSN; each item shows whether it fits. Avoid wrong purchases. Demo shop: sample items, no real delivery or payment.",vehicle:"Your vehicle",hsn:"HSN (2–4)",tsn:"TSN (3)",check:"Check fit",reset:"Reset",chosen:"Chosen",none:"No vehicle chosen yet – status “check”.",parts:"Sample items",oe:"OE no.",maker:"Maker",ex:"Example",fits:"fits",maybe:"check",nofit:"no fit",addToCart:"Add to cart",inCart:"In cart",cart:"Cart (demo)",items:"items",order:"Order with obligation to pay",orderNote:"Demo shop – no real order, delivery or payment.",priceNote:"Prices incl. VAT, plus shipping – example values, pending release.",workshop:"Install at workshop",workshopHint:"Appointment at the workshop partner for the part"}
};
type Fit="fits"|"maybe"|"nofit";
const PARTS=[
 {k:"Bremsbeläge vorne",oe:"34 11 6 858 652",maker:"Beispiel Brake Co.",price:"49,90",fit:"fits" as Fit},
 {k:"Ölfilter",oe:"11 42 8 507 683",maker:"Beispiel Filter AG",price:"12,50",fit:"fits" as Fit},
 {k:"Zündkerze (4er-Satz)",oe:"12 12 0 037 607",maker:"Beispiel Ignite",price:"28,00",fit:"maybe" as Fit},
 {k:"Starterbatterie 70 Ah EFB",oe:"61 21 8 720 018",maker:"Beispiel Power",price:"119,00",fit:"maybe" as Fit},
 {k:"Scheibenwischer-Satz",oe:"61 61 2 160 773",maker:"Beispiel Clear",price:"24,90",fit:"fits" as Fit},
 {k:"Luftfilter",oe:"13 71 8 507 320",maker:"Beispiel Filter AG",price:"18,40",fit:"nofit" as Fit}
];

export default function ShopOverview({locale,pages}:{locale:Locale;pages:PublicPage[]}){
 const t=copy[locale];
 const [hsn,setHsn]=useState("");
 const [tsn,setTsn]=useState("");
 const [vehicle,setVehicle]=useState<string|null>(null);
 const [cart,setCart]=useState<string[]>([]);
 const path=(id:string,fb:string)=>pages.find(p=>p.id===id)?.path||fb;
 const checked=vehicle!==null;
 const statusOf=(fit:Fit):Fit=>checked?fit:"maybe";
 const badge:Record<Fit,{cls:string;label:string}>={fits:{cls:"is-ok",label:t.fits},maybe:{cls:"is-warn",label:t.maybe},nofit:{cls:"is-nofit",label:t.nofit}};
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(hsn.trim()&&tsn.trim())setVehicle(`${hsn.trim().toUpperCase()} / ${tsn.trim().toUpperCase()}`);};
 const add=(k:string)=>setCart(c=>c.includes(k)?c:[...c,k]);
 return <section className="tk-tool" aria-labelledby="shop-front-title" data-testid="shop-overview">
  <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="shop-front-title">{t.title}</h2><p>{t.intro}</p></div>
  <form className="tk-form" onSubmit={submit} data-testid="shop-vehicle-form" aria-label={t.vehicle}>
   <p className="tk-subhead">{t.vehicle}</p>
   <div className="tk-fieldrow">
    <div className="tk-field"><label htmlFor="shop-hsn">{t.hsn}</label><input id="shop-hsn" data-testid="shop-hsn" inputMode="numeric" maxLength={4} value={hsn} onChange={e=>setHsn(e.target.value)} placeholder="0603"/></div>
    <div className="tk-field"><label htmlFor="shop-tsn">{t.tsn}</label><input id="shop-tsn" data-testid="shop-tsn" maxLength={3} value={tsn} onChange={e=>setTsn(e.target.value)} placeholder="BID"/></div>
    <div className="tk-field" style={{justifyContent:"flex-end"}}><button type="submit" className="tk-submit" data-testid="shop-check-fit">{t.check}</button></div>
   </div>
   <p className="tk-note" data-testid="shop-vehicle-status">{checked?`${t.chosen}: ${vehicle}`:t.none}{checked&&<> · <button type="button" className="tk-inline-btn" onClick={()=>{setVehicle(null);setHsn("");setTsn("");}} data-testid="shop-reset">{t.reset}</button></>}</p>
  </form>
  <p className="tk-subhead">{t.parts}</p>
  <div className="tk-grid" data-testid="shop-product-grid">
   {PARTS.map((p,i)=>{const st=statusOf(p.fit);const b=badge[st];const inCart=cart.includes(p.k);return (
    <article key={i} className="tk-product" data-testid={`shop-product-${i}`}>
     <span className={"tk-badge "+b.cls} data-testid={`shop-fit-${i}`}>{b.label}</span>
     <h3 className="tk-product-name">{p.k}</h3>
     <small>{t.maker}: {p.maker} ({t.ex})<br/>{t.oe}: {p.oe}</small>
     <p className="tk-price" data-testid={`shop-price-${i}`}>{p.price} € <span className="tk-price-ex">· {t.ex}</span></p>
     <button type="button" className="tk-submit tk-full" disabled={st==="nofit"||inCart} onClick={()=>add(p.k)} data-testid={`shop-add-${i}`}>{inCart?t.inCart:t.addToCart}</button>
    </article>);})}
  </div>
  <p className="tk-note" data-testid="shop-price-note">{t.priceNote}</p>
  <div className="tk-result" data-testid="shop-cart" style={{marginTop:"var(--space-5)"}}>
   <p className="tk-subhead">{t.cart}</p>
   <div className="tk-result-row"><dt>{t.items}</dt><dd data-testid="shop-cart-count">{cart.length}</dd></div>
   <button type="button" className="tk-submit tk-full" disabled={cart.length===0} data-testid="shop-order">{t.order}</button>
   <p className="tk-note">{t.orderNote}</p>
   <div className="tk-actions"><SiteLink className="tk-link" href={path("tk-appointments","/teileklar/termine")} data-testid="shop-link-workshop">{t.workshop}<span aria-hidden="true">→</span></SiteLink></div>
   <p className="tk-note">{t.workshopHint}</p>
  </div>
 </section>;
}
