"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import type {Localized,PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import {useUI} from "./Workspace";

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
  de:{title:"Mit Pascal, NeX und AIFly durch die Seiten",label:"Was möchten Sie kennenlernen?",start:"Begleitung starten",pause:"Begleitung pausieren",previous:"Vorheriger Schritt",next:"Nächster Schritt",begin:"Zum gewählten Einstieg",position:"Schritt",of:"von",available:"Textbegleitung verfügbar. Die Videobeiträge werden ergänzt.",outside:"Dieser Bereich gehört nicht zum gewählten Rundgang. Sie können hier frei weiterlesen oder zum Einstieg wechseln.",finished:"Sie sind am Ende dieses Rundgangs. Die Folgeseiten und AIFly stehen weiterhin bereit."},
  nl:{title:"Samen met Pascal, NeX en AIFly door de pagina’s",label:"Wat wilt u ontdekken?",start:"Begeleiding starten",pause:"Begeleiding pauzeren",previous:"Vorige stap",next:"Volgende stap",begin:"Naar het gekozen begin",position:"Stap",of:"van",available:"Tekstbegeleiding is beschikbaar. Videobijdragen worden toegevoegd.",outside:"Dit onderdeel hoort niet bij de gekozen rondleiding. Lees vrij verder of ga naar het begin.",finished:"U bent aan het einde van deze rondleiding. De vervolgpagina’s en AIFly blijven beschikbaar."},
  fr:{title:"Parcourir les pages avec Pascal, NeX et AIFly",label:"Que souhaitez-vous découvrir ?",start:"Démarrer le parcours",pause:"Mettre en pause",previous:"Étape précédente",next:"Étape suivante",begin:"Aller au point de départ",position:"Étape",of:"sur",available:"Le parcours texte est disponible. Les vidéos seront ajoutées.",outside:"Cette page ne fait pas partie du parcours choisi. Poursuivez librement ou revenez au début.",finished:"Vous avez terminé ce parcours. Les pages suivantes et AIFly restent disponibles."}
};
export default function PresenterGuide({pageId,pages,journeys}:{pageId:string;pages:PublicPage[];journeys:PresenterJourney[]}){
  const {locale}=useUI();const text=copy[locale];const {state,update}=useContext(GuideContext);
  const journey=journeys.find(j=>j.id===state.journeyId)||journeys[0];
  if(!journey)return null;
  const index=journey.steps.indexOf(pageId);
  const find=(step:string|undefined)=>pages.find(page=>page.id===step);
  const previous=find(journey.steps[index-1]),next=find(journey.steps[index+1]),begin=find(journey.steps[0]);
  return <section className="presenter-guide" aria-label={text.title}>
    <div><span className="eyebrow">PASCAL · NEX · AIFLY</span><h2>{text.title}</h2><p>{text.available}</p></div>
    <div className="presenter-guide-controls"><label>{text.label}<select value={journey.id} onChange={event=>update({...state,journeyId:event.target.value})}>{journeys.map(item=><option value={item.id} key={item.id}>{item.label[locale]}</option>)}</select></label><button type="button" className="outline-button" aria-pressed={state.enabled} onClick={()=>update({journeyId:journey.id,enabled:!state.enabled})}>{state.enabled?text.pause:text.start}</button></div>
    {state.enabled&&<div className="presenter-guide-progress">
      {index<0?<><p>{text.outside}</p>{begin&&<SiteLink className="route-action" href={begin.path}>{text.begin}: {begin.localizedTitle[locale]}</SiteLink>}</>:<><p role="status">{text.position} {index+1} {text.of} {journey.steps.length} · {journey.label[locale]}</p><nav aria-label={journey.label[locale]}>{previous&&<SiteLink className="route-action" href={previous.path}>← {text.previous}</SiteLink>}{next?<SiteLink className="route-action" href={next.path}>{text.next}: {next.localizedTitle[locale]} →</SiteLink>:<p>{text.finished}</p>}</nav></>}
    </div>}
  </section>;
}
