"use client";
import {useState} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import type {Locale} from "../lib/i18n";
import "./TeileklarTools.css";

const copy={
 de:{kicker:"Batterie-Berater",title:"Passende Starterbatterie einordnen",intro:"Beantworten Sie zwei Fragen – wir ordnen den passenden Batterietyp ein. Die genaue Passung best\u00e4tigen wir anhand Ihrer Fahrzeugdaten.",q1:"Hat Ihr Fahrzeug Start-Stopp-Automatik?",q2:"Umfangreiche Ausstattung (z. B. Rekuperation, viele Verbraucher)?",yes:"Ja",no:"Nein",unknown:"Wei\u00df nicht",result:"Empfehlung",agm:"AGM-Batterie",efb:"EFB-Batterie",flooded:"Konventionelle Nassbatterie (SLI)",agmWhy:"Start-Stopp mit hoher Last ben\u00f6tigt in der Regel AGM.",efbWhy:"Start-Stopp ohne Rekuperation ist meist mit EFB abgedeckt.",floodedWhy:"Ohne Start-Stopp gen\u00fcgt \u00fcblicherweise eine konventionelle Batterie.",unknownWhy:"Ohne Angabe zur Start-Stopp-Technik bleibt der Typ offen – wir kl\u00e4ren ihn \u00fcber Ihre Fahrzeugdaten.",note:"Bauform, Kapazit\u00e4t und Kaltstartstrom sowie eine eventuelle Anlernung h\u00e4ngen vom Fahrzeug ab. Eine R\u00fcckr\u00fcstung auf einen schw\u00e4cheren Typ ist nicht empfohlen.",fitment:"Fahrzeug und Passung",appointment:"Werkstatttermin f\u00fcr den Einbau"},
 nl:{kicker:"Accu-adviseur",title:"De juiste startaccu bepalen",intro:"Beantwoord twee vragen – wij bepalen het passende accutype. De exacte pasvorm bevestigen we aan de hand van uw voertuiggegevens.",q1:"Heeft uw voertuig start-stop?",q2:"Uitgebreide uitrusting (bijv. recuperatie, veel verbruikers)?",yes:"Ja",no:"Nee",unknown:"Weet niet",result:"Advies",agm:"AGM-accu",efb:"EFB-accu",flooded:"Conventionele natte accu (SLI)",agmWhy:"Start-stop met hoge belasting vraagt meestal AGM.",efbWhy:"Start-stop zonder recuperatie is meestal met EFB gedekt.",floodedWhy:"Zonder start-stop volstaat doorgaans een conventionele accu.",unknownWhy:"Zonder info over start-stop blijft het type open – we bepalen het via uw voertuiggegevens.",note:"Bouwvorm, capaciteit en koudstartstroom en een eventuele aanleerstap hangen af van het voertuig. Terugzetten naar een zwakker type is niet aangeraden.",fitment:"Voertuig en pasvorm",appointment:"Werkplaatsafspraak voor montage"},
 fr:{kicker:"Conseiller batterie",title:"Identifier la bonne batterie",intro:"R\u00e9pondez \u00e0 deux questions – nous identifions le type adapt\u00e9. La compatibilit\u00e9 exacte est confirm\u00e9e d\u2019apr\u00e8s les donn\u00e9es de votre v\u00e9hicule.",q1:"Votre v\u00e9hicule a-t-il le start-stop ?",q2:"\u00c9quipement important (r\u00e9cup\u00e9ration, nombreux consommateurs) ?",yes:"Oui",no:"Non",unknown:"Je ne sais pas",result:"Recommandation",agm:"Batterie AGM",efb:"Batterie EFB",flooded:"Batterie conventionnelle (SLI)",agmWhy:"Le start-stop \u00e0 forte charge exige g\u00e9n\u00e9ralement une AGM.",efbWhy:"Le start-stop sans r\u00e9cup\u00e9ration est le plus souvent couvert par une EFB.",floodedWhy:"Sans start-stop, une batterie conventionnelle suffit g\u00e9n\u00e9ralement.",unknownWhy:"Sans info sur le start-stop, le type reste ouvert – nous le pr\u00e9cisons via votre v\u00e9hicule.",note:"Forme, capacit\u00e9 et courant de d\u00e9marrage \u00e0 froid, ainsi qu\u2019un \u00e9ventuel apprentissage, d\u00e9pendent du v\u00e9hicule. Revenir \u00e0 un type plus faible n\u2019est pas recommand\u00e9.",fitment:"V\u00e9hicule et compatibilit\u00e9",appointment:"Rendez-vous atelier pour le montage"},
 en:{kicker:"Battery advisor",title:"Identify the right battery",intro:"Answer two questions – we classify the suitable battery type. We confirm the exact fit from your vehicle data.",q1:"Does your vehicle have start-stop?",q2:"Extensive equipment (e.g. recuperation, many consumers)?",yes:"Yes",no:"No",unknown:"Not sure",result:"Recommendation",agm:"AGM battery",efb:"EFB battery",flooded:"Conventional flooded battery (SLI)",agmWhy:"Start-stop with high load usually requires AGM.",efbWhy:"Start-stop without recuperation is usually covered by EFB.",floodedWhy:"Without start-stop a conventional battery is usually enough.",unknownWhy:"Without start-stop info the type stays open – we clarify it from your vehicle data.",note:"Form factor, capacity and cold cranking current, plus any relearning, depend on the vehicle. Downgrading to a weaker type is not recommended.",fitment:"Vehicle and fit",appointment:"Workshop appointment for installation"}
};
type YN=""|"yes"|"no"|"unknown";

export default function BatteryAdvisor({locale,pages}:{locale:Locale;pages:PublicPage[]}){
 const t=copy[locale];
 const [ss,setSs]=useState<YN>("");
 const [eq,setEq]=useState<YN>("no");
 const path=(id:string,fb:string)=>pages.find(p=>p.id===id)?.path||fb;
 let rec="",why="";
 if(ss==="unknown"){rec="";why=t.unknownWhy;}
 else if(ss==="yes"){if(eq==="yes"){rec=t.agm;why=t.agmWhy;}else{rec=t.efb;why=t.efbWhy;}}
 else if(ss==="no"){rec=t.flooded;why=t.floodedWhy;}
 const options:{v:YN;l:string}[]=[{v:"yes",l:t.yes},{v:"no",l:t.no},{v:"unknown",l:t.unknown}];
 return <section className="tk-tool" aria-labelledby="battery-advisor-title" data-testid="battery-advisor">
  <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="battery-advisor-title">{t.title}</h2><p>{t.intro}</p></div>
  <div className="tk-form">
   <div className="tk-field"><label htmlFor="battery-ss">{t.q1}</label><select id="battery-ss" data-testid="battery-startstop" value={ss} onChange={e=>setSs(e.target.value as YN)}><option value="" disabled>–</option>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
   <div className="tk-field"><label htmlFor="battery-eq">{t.q2}</label><select id="battery-eq" data-testid="battery-equipment" value={eq} onChange={e=>setEq(e.target.value as YN)}><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></div>
   {(rec||why)&&<div className="tk-result" data-testid="battery-result" aria-live="polite"><p className="tk-subhead">{t.result}</p>{rec&&<p className="tk-recommend" data-testid="battery-recommendation">{rec}</p>}<p className="tk-note">{why}</p></div>}
   <p className="tk-note">{t.note}</p>
   <div className="tk-actions"><SiteLink className="tk-link" href={path("tk-fitment","/teileklar/fahrzeug-und-passung")} data-testid="battery-link-fitment">{t.fitment}<span aria-hidden="true">→</span></SiteLink><SiteLink className="tk-link" href={path("tk-appointments","/teileklar/termine")} data-testid="battery-link-appointment">{t.appointment}<span aria-hidden="true">→</span></SiteLink></div>
  </div>
 </section>;
}
