"use client";
import type {Localized,PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import {useUI} from "./Workspace";
import {HcArrow,HcDisclosureIcon} from "./HcArrow";
import type {PublicVideo} from "./PresenterVideo";

export type ExplainerModule={
  id:string;
  content_section_id?:string|null;
  speaker:"pascal"|"nex"|"aifly";
  title:Localized;
  body:Localized;
  outcome:Localized;
  media_side:"left"|"right";
  media:{src:string|null;captions:Partial<Localized>|null;status:"asset_pending"|"published"};
  next_action:{type:"route";target_id:string;label:Localized};
  source_refs:string[];
};

const speakers={pascal:"Pascal",nex:"NeX",aifly:"AIFly ORACLE"} as const;
const labels={
  de:{ai:"KI-Assistent",outcome:"Ihr nächster Schritt",kicker:"So geht es weiter",title:"Was Sie hier erwartet.",lead:"Kurz erklärt von Pascal, NeX und AIFly ORACLE – jeweils mit dem passenden nächsten Schritt."},
  nl:{ai:"AI-assistent",outcome:"Uw volgende stap",kicker:"Zo gaat u verder",title:"Wat u hier kunt verwachten.",lead:"Kort uitgelegd door Pascal, NeX en AIFly ORACLE – telkens met de passende volgende stap."},
  fr:{ai:"Assistant IA",outcome:"Votre prochaine étape",kicker:"La suite de votre parcours",title:"Ce qui vous attend ici.",lead:"Expliqué brièvement par Pascal, NeX et AIFly ORACLE – avec, à chaque fois, l’étape suivante adaptée."},
  en:{ai:"AI assistant",outcome:"Your next step",kicker:"The rest of your journey",title:"What to expect here.",lead:"Explained briefly by Pascal, NeX and AIFly ORACLE – each with the fitting next step."}
};

/** Editorial modules in the accordion vocabulary of the Startseite. Text only: brand pages use the
 *  approved Higgsfield stills exclusively, so presenter cut-outs and films are not rendered here. */
export default function ExplainerSections({modules,pages,variant="section",sectionText,video:_video,moduleVideos:_moduleVideos}:{modules:ExplainerModule[];pages:PublicPage[];variant?:"section"|"inline";sectionText?:{heading:string;body:string};video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>>}){
  const {locale}=useUI();const text=labels[locale];
  const items=modules.filter(module=>Object.hasOwn(speakers,module.speaker));
  if(!items.length)return null;
  const detail=(module:ExplainerModule,open:boolean)=>{
    const next=pages.find(page=>page.id===module.next_action.target_id);
    const speaker=speakers[module.speaker]+(module.speaker!=="pascal"?" · "+text.ai:"");
    return <details className="hc-service-detail" key={module.id} open={open} data-testid={"explainer-"+module.id}>
      <summary><span><strong className="hc-service-name">{module.title[locale]}</strong><span className="hc-service-lead">{speaker}</span></span><HcDisclosureIcon/></summary>
      <div className="hc-service-body"><p>{module.body[locale]}</p><p><strong>{text.outcome}: </strong>{module.outcome[locale]}</p>{next&&module.next_action.type==="route"&&<SiteLink className="hc-text-link" href={next.path}>{module.next_action.label[locale]}<HcArrow/></SiteLink>}</div>
    </details>;
  };
  // Inline (bound to a content section): the section already shows heading and body, so the module
  // contributes only what is new - speaker, outcome and the next step. Duplicate copy is not repeated.
  if(variant==="inline")return <>{items.map(module=>{
    const next=pages.find(page=>page.id===module.next_action.target_id);
    const speaker=speakers[module.speaker]+(module.speaker!=="pascal"?" · "+text.ai:"");
    const sameBody=sectionText?sectionText.body.trim()===module.body[locale].trim():false;
    const sameStep=module.outcome[locale].trim()===module.next_action.label[locale].trim();
    return <div className="hc-service-detail pc-module" key={module.id} data-testid={"explainer-"+module.id}>
      <span className="hc-caption">{speaker}<span aria-hidden="true"> · </span>{text.outcome}</span>
      {!sameBody&&<p>{module.body[locale]}</p>}
      {!sameStep&&<p>{module.outcome[locale]}</p>}
      {next&&module.next_action.type==="route"&&<SiteLink className="hc-text-link" href={next.path}>{module.next_action.label[locale]}<HcArrow/></SiteLink>}
    </div>;
  })}</>;
  return <section className="hc-section hc-container hc-service-story" aria-labelledby="explainers-title" data-testid="page-explainers">
    <div className="hc-service-layout">
      <header className="hc-section-heading"><span className="hc-kicker">{text.kicker}</span><h2 id="explainers-title">{text.title}</h2><p>{text.lead}</p></header>
      <div className="hc-service-list">{items.map((module,index)=>detail(module,index===0))}</div>
    </div>
  </section>;
}
