"use client";
import type {ReactNode} from "react";
import type {PublicPage} from "../lib/page-types";
import {useSitePathname} from "./Router";
import {useUI} from "./Workspace";
import PresenterGuide,{PresenterGuideProvider,type PresenterJourney} from "./PresenterGuide";
import ExplainerSections,{type ExplainerModule} from "./ExplainerSections";
import HomeContent from "./HomeContent";
import ServicesContent from "./ServicesContent";
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
  const{locale}=useUI();const video=data.videos[page.id]?.[locale==="en"?"de":locale];
  const title=documentTitle?<title>{`${page.localizedTitle[locale]} · NeXify AI`}</title>:null;
  const modules=data.explainers.find(entry=>entry.page_id===page.id)?.modules||[];
  const sectionContent:Record<string,ReactNode>={};
  for(const module of modules){
    const id=module.content_section_id;
    if(id&&page.sections.some(section=>section.id===id)&&!sectionContent[id])sectionContent[id]=<ExplainerSections modules={[module]} pages={data.pages} moduleVideos={data.videoModules[page.id]||{}}/>;
  }
  const explanation=<><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/><ExplainerSections modules={modules.filter(module=>!module.content_section_id)} pages={data.pages} video={page.path==='/'?undefined:video} moduleVideos={data.videoModules[page.id]||{}}/></>;
  if(page.path==='/')return <>{title}<HomeContent home={page} pages={data.pages} video={video} moduleVideos={data.videoModules[page.id]||{}}><PresenterGuide pageId={page.id} pages={data.pages} journeys={data.journeys}/></HomeContent></>;
  if(page.id==='services')return <>{title}<ServicesContent page={page}/></>;
  return <>{title}<PublicContent page={page} pages={data.pages} sectionContent={sectionContent}>{shopRuntime&&<PublicShopContent pageId={page.id} pathname={pathname} search={search}/>} {(!shopRuntime||page.id==="tk-home")&&["tk-home","tk-search","tk-categories","tk-category","tk-product","tk-cart","tk-checkout"].includes(page.id)&&<ShopEntry/>} {page.id==="tk-fitment"&&<><FitmentChecklist/><TyreCalculator/><PhaseNotice id="tk-battery"/></>} {["tk-appointments","tk-vouchers"].includes(page.id)&&<PhaseNotice id={page.id}/>} {page.id==="tk-workshop"&&!shopRuntime&&<WorkshopDirectory/>} {page.id==="tk-partner"&&<><PartnerJourney/><ContactRequestForm kind="partner"/></>} {page.id==="contact"&&<ContactRequestForm/>} {page.id==="tk-legal"&&<TeileklarLegal/>} {explanation}</PublicContent></>;
}
