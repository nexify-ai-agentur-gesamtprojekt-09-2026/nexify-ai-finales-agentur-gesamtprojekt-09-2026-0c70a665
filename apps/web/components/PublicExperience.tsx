"use client";
import type {ReactNode} from "react";
import type {PublicPage} from "../lib/page-types";
import {useSitePathname} from "./Router";
import {useUI} from "./Workspace";
import PresenterGuide,{PresenterGuideProvider,type PresenterJourney} from "./PresenterGuide";
import ExplainerSections,{type ExplainerModule} from "./ExplainerSections";
import HomeContent from "./HomeContent";
import PublicContent from "./PublicContent";
import ShopPanel from "./ShopPanel";
import WorkshopDirectory from "./WorkshopDirectory";
import PartnerRequestForm from "./PartnerRequestForm";
import type {PublicVideo} from "./PresenterVideo";

export type PublicExperienceData={pages:PublicPage[];journeys:PresenterJourney[];explainers:{page_id:string;modules:ExplainerModule[]}[];videos:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>>;videoModules:Record<string,Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>>>};
export function PublicExperienceProvider({data,children}:{data:PublicExperienceData;children:ReactNode}){
  const path=useSitePathname();const id=data.pages.find(page=>page.path===path)?.id;
  return <PresenterGuideProvider journeys={data.journeys} defaultJourneyId={data.journeys.find(journey=>journey.steps.includes(id||""))?.id}>{children}</PresenterGuideProvider>;
}
export default function PublicExperience({page,data,documentTitle=false}:{page:PublicPage;data:PublicExperienceData;documentTitle?:boolean}){
  const{locale}=useUI();const video=data.videos[page.id]?.[locale];
  const title=documentTitle?<title>{`${page.localizedTitle[locale]} · NeXify AI`}</title>:null;
  const explanation=<><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/><ExplainerSections modules={data.explainers.find(entry=>entry.page_id===page.id)?.modules||[]} pages={data.pages} video={page.path==='/'?undefined:video} moduleVideos={data.videoModules[page.id]||{}}/></>;
  if(page.path==='/')return <>{title}<HomeContent home={page} pages={data.pages} video={video} moduleVideos={data.videoModules[page.id]||{}}><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/></HomeContent></>;
  return <>{title}<PublicContent page={page} pages={data.pages}>{["tk-search","tk-categories","tk-category","tk-product","tk-cart","tk-checkout"].includes(page.id)&&<ShopPanel pageId={page.id}/>} {page.id==="tk-workshop"&&<WorkshopDirectory/>} {page.id==="tk-partner"&&<PartnerRequestForm/>} {explanation}</PublicContent></>;
}
