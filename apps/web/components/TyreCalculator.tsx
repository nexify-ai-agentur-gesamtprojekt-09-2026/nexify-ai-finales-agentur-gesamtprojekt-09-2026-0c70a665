"use client";
import {useState} from "react";
import type {Locale} from "../lib/i18n";
import "./TeileklarTools.css";

const copy={
 de:{kicker:"Reifenrechner",title:"Reifengr\u00f6\u00dfen vergleichen",intro:"Geben Sie Ihre aktuelle Gr\u00f6\u00dfe und eine Wunschgr\u00f6\u00dfe ein. Der Rechner vergleicht den Abrollumfang. Dies dient der Orientierung und ersetzt keine technische Freigabe.",current:"Aktuelle Gr\u00f6\u00dfe",alt:"Wunschgr\u00f6\u00dfe",width:"Breite (mm)",ratio:"Querschnitt (%)",rim:"Felge (Zoll)",diameter:"Durchmesser",circ:"Abrollumfang",deviation:"Abweichung",ok:"Innerhalb \u00b13 % – \u00fcblicher Orientierungsrahmen",warn:"\u00dcber \u00b13 % – Tacho/Freig\u00e4ngigkeit pr\u00fcfen lassen",note:"Zul\u00e4ssigkeit, Freig\u00e4ngigkeit und Tachoabweichung h\u00e4ngen von Ihrem Fahrzeug ab. Lassen Sie die Gr\u00f6\u00dfe vor dem Kauf fachlich best\u00e4tigen."},
 nl:{kicker:"Bandencalculator",title:"Bandenmaten vergelijken",intro:"Voer uw huidige maat en een gewenste maat in. De calculator vergelijkt de rolomtrek. Dit dient ter ori\u00ebntatie en vervangt geen technische vrijgave.",current:"Huidige maat",alt:"Gewenste maat",width:"Breedte (mm)",ratio:"Hoogte (%)",rim:"Velg (inch)",diameter:"Diameter",circ:"Rolomtrek",deviation:"Afwijking",ok:"Binnen \u00b13 % – gebruikelijk kader",warn:"Boven \u00b13 % – teller/vrijloop laten controleren",note:"Toelaatbaarheid, vrijloop en tellerafwijking hangen af van uw voertuig. Laat de maat v\u00f3\u00f3r de aankoop vakkundig bevestigen."},
 fr:{kicker:"Calculateur de pneus",title:"Comparer les dimensions",intro:"Saisissez votre dimension actuelle et une dimension souhait\u00e9e. Le calculateur compare la circonf\u00e9rence de roulement. \u00c0 titre indicatif, sans remplacer une homologation.",current:"Dimension actuelle",alt:"Dimension souhait\u00e9e",width:"Largeur (mm)",ratio:"Hauteur (%)",rim:"Jante (pouces)",diameter:"Diam\u00e8tre",circ:"Circonf\u00e9rence",deviation:"\u00c9cart",ok:"Dans \u00b13 % – cadre d\u2019orientation usuel",warn:"Au-del\u00e0 de \u00b13 % – faire v\u00e9rifier compteur/d\u00e9gagement",note:"L\u2019admissibilit\u00e9, le d\u00e9gagement et l\u2019\u00e9cart compteur d\u00e9pendent de votre v\u00e9hicule. Faites confirmer la dimension avant l\u2019achat."},
 en:{kicker:"Tyre calculator",title:"Compare tyre sizes",intro:"Enter your current size and a target size. The calculator compares rolling circumference. For orientation only, not a technical approval.",current:"Current size",alt:"Target size",width:"Width (mm)",ratio:"Aspect (%)",rim:"Rim (inch)",diameter:"Diameter",circ:"Circumference",deviation:"Deviation",ok:"Within \u00b13 % – common orientation range",warn:"Above \u00b13 % – have speedo/clearance checked",note:"Approval, clearance and speedo deviation depend on your vehicle. Have the size professionally confirmed before purchase."}
};
function diameterMm(w:number,r:number,rim:number){return rim*25.4+2*(w*r/100);}

export default function TyreCalculator({locale}:{locale:Locale}){
 const t=copy[locale];
 const [a,setA]=useState({w:205,r:55,rim:16});
 const [b,setB]=useState({w:225,r:45,rim:17});
 const valid=(s:{w:number;r:number;rim:number})=>s.w>=100&&s.w<=400&&s.r>=20&&s.r<=90&&s.rim>=10&&s.rim<=24;
 const dA=diameterMm(a.w,a.r,a.rim),dB=diameterMm(b.w,b.r,b.rim);
 const okA=valid(a),okB=valid(b);
 const dev=okA&&okB&&dA>0?((dB-dA)/dA)*100:0;
 const within=Math.abs(dev)<=3;
 const fmt=(n:number)=>n.toLocaleString(locale=="en"?"en-GB":locale,{maximumFractionDigits:1});
 const field=(id:string,s:{w:number;r:number;rim:number},set:(v:{w:number;r:number;rim:number})=>void,prefix:string)=>(
  <div className="tk-fieldrow">
   <div className="tk-field"><label htmlFor={prefix+"-w"}>{t.width}</label><input id={prefix+"-w"} data-testid={prefix+"-width"} type="number" inputMode="numeric" min={100} max={400} value={s.w} onChange={e=>set({...s,w:Number(e.target.value)})}/></div>
   <div className="tk-field"><label htmlFor={prefix+"-r"}>{t.ratio}</label><input id={prefix+"-r"} data-testid={prefix+"-ratio"} type="number" inputMode="numeric" min={20} max={90} value={s.r} onChange={e=>set({...s,r:Number(e.target.value)})}/></div>
   <div className="tk-field"><label htmlFor={prefix+"-rim"}>{t.rim}</label><input id={prefix+"-rim"} data-testid={prefix+"-rim"} type="number" inputMode="numeric" min={10} max={24} value={s.rim} onChange={e=>set({...s,rim:Number(e.target.value)})}/></div>
  </div>
 );
 return <section className="tk-tool" aria-labelledby="tyre-calc-title" data-testid="tyre-calculator">
  <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="tyre-calc-title">{t.title}</h2><p>{t.intro}</p></div>
  <div className="tk-form">
   <div><p className="tk-subhead">{t.current}</p>{field("a",a,setA,"tyre-a")}</div>
   <div><p className="tk-subhead">{t.alt}</p>{field("b",b,setB,"tyre-b")}</div>
   <dl className="tk-result" data-testid="tyre-result" aria-live="polite">
    <div className="tk-result-row"><dt>{t.diameter} ({t.current})</dt><dd data-testid="tyre-dia-a">{okA?fmt(dA)+" mm":"–"}</dd></div>
    <div className="tk-result-row"><dt>{t.diameter} ({t.alt})</dt><dd data-testid="tyre-dia-b">{okB?fmt(dB)+" mm":"–"}</dd></div>
    <div className="tk-result-row"><dt>{t.circ} ({t.alt})</dt><dd>{okB?fmt(Math.PI*dB)+" mm":"–"}</dd></div>
    <div className="tk-result-row"><dt>{t.deviation}</dt><dd data-testid="tyre-deviation">{okA&&okB?(dev>0?"+":"")+fmt(dev)+" %":"–"}</dd></div>
    {okA&&okB&&<span className={"tk-badge "+(within?"is-ok":"is-warn")} data-testid="tyre-verdict">{within?t.ok:t.warn}</span>}
   </dl>
   <p className="tk-note">{t.note}</p>
  </div>
 </section>;
}
