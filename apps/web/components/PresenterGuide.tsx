"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import type {Localized,PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import {useUI} from "./Workspace";
import "./PresenterEditorial.css";

export type PresenterJourney={id:string;label:Localized;steps:string[]};
type State={enabled:boolean;journeyId:string};
const initial:State={enabled:false,journeyId:"business-website"};
const GuideContext=createContext({state:initial,update:(_next:State)=>{}});
export function PresenterGuideProvider({children,journeys,defaultJourneyId}:{children:ReactNode;journeys:PresenterJourney[];defaultJourneyId?:string}){
  const [state,setState]=useState<State>(()=>({...initial,journeyId:defaultJourneyId||initial.journeyId}));
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    try{const saved=JSON.parse(sessionStorage.getItem("nexify-presenter-guide")||"null");
      if(saved&&typeof saved.enabled==="boolean"&&journeys.some(j=>j.id===saved.journeyId))setState({enabled:saved.enabled,journeyId:saved.journeyId});
    }catch{}setLoaded(true);
  },[journeys]);
  useEffect(()=>{if(loaded)try{sessionStorage.setItem("nexify-presenter-guide",JSON.stringify(state));}catch{}},[state,loaded]);
  return <GuideContext.Provider value={{state,update:setState}}>{children}</GuideContext.Provider>;
}
const copy={
  de:{title:"Die FACTORY entdecken · mit Pascal, NeX und AIFly ORACLE",label:"Welchen Bereich möchten Sie erkunden?",start:"Begleitung starten",pause:"Begleitung pausieren",previous:"Vorheriger Schritt",next:"Nächster Schritt",begin:"Zum gewählten Einstieg",position:"Schritt",of:"von",available:"Die Seitenführung verbindet unsere Leistungen, Produkte und Projektwege. Sie können jeden Bereich auch direkt öffnen.",outside:"Dieser Bereich gehört nicht zum gewählten Rundgang. Sie können hier frei weiterlesen oder zum Einstieg wechseln.",finished:"Ihr Rundgang ist abgeschlossen. Für Ihren eigenen Leistungsrahmen sprechen Sie mit der FACTORY."},
  nl:{title:"Ontdek de FACTORY · met Pascal, NeX en AIFly ORACLE",label:"Wat wilt u ontdekken?",start:"Begeleiding starten",pause:"Begeleiding pauzeren",previous:"Vorige stap",next:"Volgende stap",begin:"Naar het gekozen begin",position:"Stap",of:"van",available:"Deze route verbindt onze diensten, producten en projectstappen. U kunt elk onderdeel ook rechtstreeks openen.",outside:"Dit onderdeel hoort niet bij de gekozen rondleiding. Lees vrij verder of ga naar het begin.",finished:"U bent aan het einde van deze rondleiding. De vervolgpagina’s en AIFly ORACLE blijven beschikbaar."},
  fr:{title:"Découvrez la FACTORY · avec Pascal, NeX et AIFly ORACLE",label:"Que souhaitez-vous découvrir ?",start:"Démarrer le parcours",pause:"Mettre en pause",previous:"Étape précédente",next:"Étape suivante",begin:"Aller au point de départ",position:"Étape",of:"sur",available:"Ce parcours relie nos prestations, produits et étapes de projet. Vous pouvez également ouvrir chaque rubrique directement.",outside:"Cette page ne fait pas partie du parcours choisi. Poursuivez librement ou revenez au début.",finished:"Vous avez terminé ce parcours. Les pages suivantes et AIFly ORACLE restent disponibles."},
  en:{"title": "Discover the FACTORY · with Pascal, NeX and AIFly ORACLE", "label": "What would you like to discover?", "start": "Start the tour", "pause": "Pause", "previous": "Previous step", "next": "Next step", "begin": "Go to the starting point", "position": "Step", "of": "of", "available": "This tour connects our services, products and project steps. You can also open each section directly.", "outside": "This page is not part of the chosen tour. Continue freely or go back to the start.", "finished": "You have completed this tour. The following pages and AIFly ORACLE remain available."}
};
export default function PresenterGuide({pageId,pages,journeys}:{pageId:string;pages:PublicPage[];journeys:PresenterJourney[]}){
  const {locale}=useUI();const text=copy[locale];const {state,update}=useContext(GuideContext);
  const journey=journeys.find(j=>j.id===state.journeyId)||journeys[0];
  if(!journey)return null;
  const index=journey.steps.indexOf(pageId);
  const find=(step:string|undefined)=>pages.find(page=>page.id===step);
  const previous=find(journey.steps[index-1]),next=find(journey.steps[index+1]),begin=find(journey.steps[0]);
  return <section className="editorial-guide" aria-label={text.title}>
    <details className="editorial-guide-disclosure">
      <summary><span>{text.title}</span><span className="editorial-guide-mark" aria-hidden="true" /></summary>
      <div className="editorial-guide-settings">
        <p>{text.available}</p>
        <div className="editorial-guide-controls"><label>{text.label}<select value={journey.id} onChange={event=>update({...state,journeyId:event.target.value})}>{journeys.map(item=><option value={item.id} key={item.id}>{item.label[locale]}</option>)}</select></label><button type="button" className="outline-button" aria-pressed={state.enabled} onClick={()=>update({journeyId:journey.id,enabled:!state.enabled})}>{state.enabled?text.pause:text.start}</button></div>
      </div>
    </details>
    {state.enabled&&<div className="editorial-guide-progress">
      {index<0?<><p>{text.outside}</p>{begin&&<SiteLink className="editorial-next-step" href={begin.path}>{text.begin}: {begin.localizedTitle[locale]}</SiteLink>}</>:<><p role="status">{text.position} {index+1} {text.of} {journey.steps.length} · {journey.label[locale]}</p><nav aria-label={journey.label[locale]}>{previous&&<SiteLink className="editorial-next-step" href={previous.path}>← {text.previous}</SiteLink>}{next?<SiteLink className="editorial-next-step" href={next.path}>{text.next}: {next.localizedTitle[locale]} →</SiteLink>:<p>{text.finished}</p>}</nav></>}
    </div>}
  </section>;
}
