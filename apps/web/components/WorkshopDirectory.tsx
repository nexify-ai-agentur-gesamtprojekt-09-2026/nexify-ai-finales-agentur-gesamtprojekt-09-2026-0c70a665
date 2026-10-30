"use client";
import {useEffect,useMemo,useState} from "react";
import {useUI} from "./Workspace";
import "./WorkshopDirectory.css";

// Ported 1:1 from prototypen/TEILEKLAR Shop.dc.html (STANDORTE, kmDist, standortBetriebe,
// cityList, openCity). The directory data itself is NOT bundled into the public build:
// origin and usage rights of the 579 records are unverified. The public SPA therefore
// shows an honest empty state until a reviewed data source is connected. Entries are a
// directory only and are never presented as verified contractual partners.

type Shop={id:string;name:string;city:string;region:string;street?:string;zip?:string;tel?:string;web?:string;hours?:string;kind?:string;lat?:number;lon?:number;full?:number;trust?:string;verified?:boolean};
type Market={total?:number;shops:Shop[]};
type Pack=Record<string,Market>;
type Standort={slug:string;name:string;land:string;markt:string;lat:number;lon:number;r:number};

const STANDORTE:Standort[]=[
 {slug:"berlin",name:"Berlin",land:"DE",markt:"de-DE",lat:52.5200,lon:13.4050,r:45},
 {slug:"hamburg",name:"Hamburg",land:"DE",markt:"de-DE",lat:53.5511,lon:9.9937,r:40},
 {slug:"muenchen",name:"München",land:"DE",markt:"de-DE",lat:48.1351,lon:11.5820,r:45},
 {slug:"koeln",name:"Köln",land:"DE",markt:"de-DE",lat:50.9375,lon:6.9603,r:40},
 {slug:"frankfurt",name:"Frankfurt am Main",land:"DE",markt:"de-DE",lat:50.1109,lon:8.6821,r:40},
 {slug:"stuttgart",name:"Stuttgart",land:"DE",markt:"de-DE",lat:48.7758,lon:9.1829,r:45},
 {slug:"wien",name:"Wien",land:"AT",markt:"de-AT",lat:48.2082,lon:16.3738,r:45},
 {slug:"graz",name:"Graz",land:"AT",markt:"de-AT",lat:47.0707,lon:15.4395,r:45},
 {slug:"zuerich",name:"Zürich",land:"CH",markt:"de-CH",lat:47.3769,lon:8.5417,r:35},
 {slug:"basel",name:"Basel",land:"CH",markt:"de-CH",lat:47.5596,lon:7.5886,r:30},
 {slug:"bern",name:"Bern",land:"CH",markt:"de-CH",lat:46.9480,lon:7.4474,r:35},
 {slug:"amsterdam",name:"Amsterdam",land:"NL",markt:"nl-NL",lat:52.3676,lon:4.9041,r:35},
 {slug:"utrecht",name:"Utrecht",land:"NL",markt:"nl-NL",lat:52.0907,lon:5.1214,r:30},
 {slug:"rotterdam",name:"Rotterdam",land:"NL",markt:"nl-NL",lat:51.9244,lon:4.4777,r:30},
 {slug:"antwerpen",name:"Antwerpen",land:"BE",markt:"nl-BE",lat:51.2194,lon:4.4025,r:35},
 {slug:"bruessel",name:"Brüssel",land:"BE",markt:"nl-BE",lat:50.8503,lon:4.3517,r:35},
 {slug:"luxemburg",name:"Luxemburg",land:"LU",markt:"fr-LU",lat:49.6116,lon:6.1319,r:40}
];
const LAND_NAME:Record<string,string>={DE:"Deutschland",AT:"Österreich",CH:"Schweiz",NL:"Niederlande",BE:"Belgien",LU:"Luxemburg"};
const kmDist=(a:number,b:number,c:number,d:number)=>{const R=6371,p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,h=Math.sin(x/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));};

const marketForLocale:Record<string,string>={de:"de-DE",nl:"nl-NL",fr:"fr-LU"};
const DATA_URL="/teileklar/workshops.json";

// A configured source counts as valid only if it is a market-keyed object whose every
// present market is an object with an array of shops. Broken JSON/schema -> error, not empty.
function validPack(data:unknown):data is Pack{
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const values=Object.values(data as Record<string,unknown>);
 return values.every(market=>!!market&&typeof market==='object'&&!Array.isArray(market)&&Array.isArray((market as {shops?:unknown}).shops));
}

const words={
 de:{title:"Werkstattverzeichnis",disclaimer:"Verzeichnis – keine verifizierten Vertragspartner. Herkunft und Nutzungsrechte der Einträge sind nicht belegt; die Zahl im Feld „total“ ist keine ausgezählte Menge.",loading:"Verzeichnis wird geladen …",empty:"Das Werkstattverzeichnis ist noch nicht mit einer geprüften Datenquelle verbunden. Es werden keine Beispieleinträge angezeigt.",error:"Die Verzeichnisquelle ist momentan nicht erreichbar.",search:"Werkstatt oder Ort suchen",regions:"Standorte",building:"Standort im Aufbau – noch keine Betriebe erfasst.",shopsCount:"Betriebe",verifiedCount:"als „verified“ markiert",open:"Betriebe anzeigen",back:"Zurück zu den Standorten",noHits:"Keine Betriebe für diese Suche in diesem Standort.",verifiedBadge:"Datensatz „verified“ – nicht als Vertragspartner bestätigt",kind:"Art",tel:"Telefon",web:"Web",resultHead:"Betriebe im Standort"},
 nl:{title:"Werkplaatsregister",disclaimer:"Register – geen geverifieerde contractpartners. Herkomst en gebruiksrechten van de vermeldingen zijn niet aangetoond; het getal in het veld „total“ is geen getelde hoeveelheid.",loading:"Register wordt geladen …",empty:"Het werkplaatsregister is nog niet met een geverifieerde gegevensbron verbonden. Er worden geen voorbeeldvermeldingen getoond.",error:"De registerbron is momenteel niet bereikbaar.",search:"Werkplaats of plaats zoeken",regions:"Locaties",building:"Locatie in opbouw – nog geen bedrijven geregistreerd.",shopsCount:"Bedrijven",verifiedCount:"als „verified“ gemarkeerd",open:"Bedrijven tonen",back:"Terug naar de locaties",noHits:"Geen bedrijven voor deze zoekopdracht in deze locatie.",verifiedBadge:"Record „verified“ – niet als contractpartner bevestigd",kind:"Soort",tel:"Telefoon",web:"Web",resultHead:"Bedrijven in de locatie"},
 fr:{title:"Annuaire des garages",disclaimer:"Annuaire – aucun partenaire contractuel vérifié. La provenance et les droits d’usage des entrées ne sont pas prouvés ; le nombre du champ « total » n’est pas une quantité comptée.",loading:"Chargement de l’annuaire…",empty:"L’annuaire des garages n’est pas encore connecté à une source de données vérifiée. Aucune entrée d’exemple n’est affichée.",error:"La source de l’annuaire est momentanément indisponible.",search:"Rechercher un garage ou une ville",regions:"Sites",building:"Site en préparation – aucun établissement encore enregistré.",shopsCount:"Établissements",verifiedCount:"marqués « verified »",open:"Afficher les établissements",back:"Retour aux sites",noHits:"Aucun établissement pour cette recherche sur ce site.",verifiedBadge:"Enregistrement « verified » – non confirmé comme partenaire contractuel",kind:"Type",tel:"Téléphone",web:"Web",resultHead:"Établissements du site"}
};

export default function WorkshopDirectory(){
 const{locale}=useUI();
 const t=words[locale as keyof typeof words]||words.de;
 const activeMarket=marketForLocale[locale]||"de-DE";
 const[pack,setPack]=useState<Pack|null>(null);
 const[loaded,setLoaded]=useState(false);
 const[error,setError]=useState(false);
 const[empty,setEmpty]=useState(false);
 const[selected,setSelected]=useState<string>("");
 const[query,setQuery]=useState("");
 const standalone=typeof window!=="undefined"&&(window.location.protocol==='file:'||(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true);

 useEffect(()=>{
  if(standalone){setLoaded(true);setEmpty(true);return;}
  const controller=new AbortController();setError(false);setEmpty(false);
  fetch(DATA_URL,{cache:'no-store',signal:controller.signal}).then(async response=>{
   // Missing source (404) or the known SPA HTML fallback => honest empty / not-configured.
   if(response.status===404){setEmpty(true);setLoaded(true);return;}
   if(!response.ok){setError(true);setLoaded(true);return;}
   const contentType=response.headers.get('content-type')||'';
   if(!contentType.includes('json')){setEmpty(true);setLoaded(true);return;}
   // A source that actually serves JSON but is broken (invalid JSON / schema) must NOT
   // be silenced as empty; surface a traceable error state instead.
   let data:unknown=null;
   try{data=await response.json();}catch{setError(true);setLoaded(true);return;}
   if(!validPack(data)){setError(true);setLoaded(true);return;}
   setPack(data as Pack);setLoaded(true);
  }).catch(()=>{if(!controller.signal.aborted){setError(true);setLoaded(true);}});
  return()=>controller.abort();
 },[standalone]);

 const standortBetriebe=(st:Standort):Shop[]=>{
  const m=(pack||{})[st.markt]||{shops:[]};
  return (m.shops||[]).filter(s=>(typeof s.lat==='number'&&typeof s.lon==='number')?kmDist(st.lat,st.lon,s.lat,s.lon)<=st.r:(s.city===st.name||s.region===st.name));
 };

 const cityList=useMemo(()=>{
  if(!pack)return [] as {slug:string;name:string;region:string;land:string;markt:string;shops:number;verified:number;imAufbau:boolean}[];
  return STANDORTE.map(st=>{
   const b=standortBetriebe(st);const v=b.filter(s=>s.verified).length;
   return {slug:st.slug,name:st.name,region:LAND_NAME[st.land]||st.land,land:st.land,markt:st.markt,shops:b.length,verified:v,imAufbau:b.length===0};
  }).sort((x,y)=>(x.markt===activeMarket?0:1)-(y.markt===activeMarket?0:1)||x.land.localeCompare(y.land)||y.shops-x.shops);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[pack,activeMarket]);

 const selectedStandort=STANDORTE.find(s=>s.slug===selected);
 const selectedShops=useMemo(()=>{
  if(!selectedStandort)return [] as Shop[];
  const list=standortBetriebe(selectedStandort);
  const q=query.trim().toLowerCase();
  return q?list.filter(s=>(s.name+' '+s.city+' '+(s.zip||'')).toLowerCase().includes(q)):list;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selected,query,pack]);

 return <section className="workshop-directory" aria-labelledby="workshop-directory-title" data-testid="workshop-directory">
  <h2 id="workshop-directory-title">{t.title}</h2>
  <p className="workshop-disclaimer" data-testid="workshop-disclaimer">{t.disclaimer}</p>
  {!loaded?<p role="status" data-testid="workshop-state">{t.loading}</p>
   :error?<p role="alert" data-testid="workshop-state">{t.error}</p>
   :empty||!pack?<p role="status" data-testid="workshop-empty">{t.empty}</p>
   :!selectedStandort?<div data-testid="workshop-regions">
     <h3>{t.regions}</h3>
     <ul className="workshop-regions">{cityList.map(city=><li key={city.slug} data-testid={"workshop-region-"+city.slug}>
      <div><strong>{city.name}</strong><span className="workshop-region-meta">{city.region}</span></div>
      {city.imAufbau?<span className="workshop-building">{t.building}</span>
       :<span className="workshop-region-meta">{city.shops} {t.shopsCount} · {city.verified} {t.verifiedCount}</span>}
      {!city.imAufbau&&<button className="outline-button" data-testid={"workshop-open-"+city.slug} onClick={()=>{setSelected(city.slug);setQuery("");}}>{t.open}</button>}
     </li>)}</ul>
    </div>
   :<div data-testid="workshop-detail">
     <button className="text-button" data-testid="workshop-back" onClick={()=>{setSelected("");setQuery("");}}>{t.back}</button>
     <h3>{t.resultHead}: {selectedStandort.name}</h3>
     <label className="workshop-search">{t.search}<input type="search" value={query} maxLength={120} data-testid="workshop-search" onChange={event=>setQuery(event.target.value)}/></label>
     {selectedShops.length===0?<p role="status" data-testid="workshop-nohits">{t.noHits}</p>
      :<ul className="workshop-shops" data-testid="workshop-shops">{selectedShops.map(shop=><li key={shop.id} data-testid={"workshop-shop-"+shop.id}>
        <strong>{shop.name}</strong>
        <span className="workshop-shop-meta">{[shop.street,shop.zip,shop.city].filter(Boolean).join(', ')}</span>
        {shop.kind&&<span className="workshop-shop-meta">{t.kind}: {shop.kind}</span>}
        {shop.tel&&<span className="workshop-shop-meta">{t.tel}: <a href={"tel:"+shop.tel}>{shop.tel}</a></span>}
        {shop.web&&<span className="workshop-shop-meta">{t.web}: <a href={shop.web} rel="nofollow noopener noreferrer" target="_blank">{shop.web.replace(/^https?:\/\//,'')}</a></span>}
        {shop.verified&&<span className="workshop-verified-note" title={t.verifiedBadge}>{t.verifiedBadge}</span>}
       </li>)}</ul>}
    </div>}
 </section>;
}
