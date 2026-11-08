"use client";
import type {ReactNode} from "react";
import type {PublicPage} from "../lib/page-types";
import {useSitePathname} from "./Router";
import {useUI} from "./Workspace";
import PresenterGuide,{PresenterGuideProvider,type PresenterJourney} from "./PresenterGuide";
import ExplainerSections,{type ExplainerModule} from "./ExplainerSections";
import HomeContent from "./HomeContent";
import PublicContent from "./PublicContent";
import FitmentChecklist from "./shop/FitmentChecklist";
import TyreCalculator from "./shop/TyreCalculator";
import PhaseNotice from "./shop/PhaseNotice";
import ContactRequestForm from "./ContactRequestForm";
import TeileklarLegal from "./shop/TeileklarLegal";
import WorkshopDirectory from "./WorkshopDirectory";
import PublicShopContent from "./shop/PublicShopContent";
import ShopEntry from "./shop/ShopEntry";
import PartnerJourney from "./shop/PartnerJourney";
import type {PublicVideo} from "./PresenterVideo";

export type PublicExperienceData={pages:PublicPage[];journeys:PresenterJourney[];explainers:{page_id:string;modules:ExplainerModule[]}[];videos:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>>;videoModules:Record<string,Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>>>};
export function PublicExperienceProvider({data,children}:{data:PublicExperienceData;children:ReactNode}){
  const path=useSitePathname();const id=data.pages.find(page=>page.path===path)?.id;
  return <PresenterGuideProvider journeys={data.journeys} defaultJourneyId={data.journeys.find(journey=>journey.steps.includes(id||""))?.id}>{children}</PresenterGuideProvider>;
}
export default function PublicExperience({page,data,documentTitle=false,shopRuntime=false,pathname="",search=""}:{page:PublicPage;data:PublicExperienceData;documentTitle?:boolean;shopRuntime?:boolean;pathname?:string;search?:string}){
  const{locale}=useUI();const video=data.videos[page.id]?.[locale==="en"?"de":locale];// Startseite only
  const title=documentTitle?<title>{`${page.localizedTitle[locale]} · NeXify AI`}</title>:null;
  const modules=data.explainers.find(entry=>entry.page_id===page.id)?.modules||[];
  const sectionContent:Record<string,ReactNode>={};
  for(const module of modules){
    const id=module.content_section_id;
    const section=id?page.sections.find(section=>section.id===id):undefined;
    if(id&&section&&!sectionContent[id])sectionContent[id]=<ExplainerSections modules={[module]} pages={data.pages} variant="inline" sectionText={{heading:section.heading[locale],body:section.body[locale]}}/>;
  }
  // Inner pages carry no films: brand pages use the approved Higgsfield stills exclusively.
  const explanation=<><ExplainerSections modules={modules.filter(module=>!module.content_section_id)} pages={data.pages}/><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/></>;
  if(page.path==='/')return <>{title}<HomeContent home={page} pages={data.pages} video={video} moduleVideos={data.videoModules[page.id]||{}}><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/></HomeContent></>;
  return <>{title}<PublicContent page={page} pages={data.pages} sectionContent={sectionContent} explanation={explanation}>{shopRuntime&&<PublicShopContent pageId={page.id} pathname={pathname} search={search}/>}{(!shopRuntime||page.id==="tk-home")&&["tk-home","tk-search","tk-categories","tk-category","tk-product","tk-cart","tk-checkout"].includes(page.id)&&<ShopEntry/>}{page.id==="tk-fitment"&&<><FitmentChecklist/><TyreCalculator/></>}{["tk-appointments","tk-vouchers"].includes(page.id)&&<ContactRequestForm topic={page.id==='tk-appointments'?'Terminwunsch · Verfügbarkeit bitte zuerst bestätigen':'Gutscheinanfrage · Konditionen bitte zuerst bestätigen'}/>}{page.id==="tk-workshop"&&!shopRuntime&&<WorkshopDirectory/>}{page.id==="tk-partner"&&<><PartnerJourney/><ContactRequestForm kind="partner"/></>}{page.id==="contact"&&<ContactRequestForm/>}{page.id==="tk-legal"&&<TeileklarLegal/>}</PublicContent></>;
}
