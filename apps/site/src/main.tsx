import "../../../packages/tokens/tokens.css";
import "../../web/app/globals.css";
import {PublicAuthProvider,AuthenticationPanel} from "./Auth";
import {useEffect,useMemo,useState,type MouseEvent} from "react";
import {createRoot} from "react-dom/client";
import Workspace,{useUI} from "../../web/components/Workspace";
import PresenterGuide,{PresenterGuideProvider,type PresenterJourney} from "../../web/components/PresenterGuide";
import ExplainerSections,{type ExplainerModule} from "../../web/components/ExplainerSections";
import HomeContent from "../../web/components/HomeContent";
import PublicContent from "../../web/components/PublicContent";
import {RouterProvider,type SiteLinkProps} from "../../web/components/Router";
import type {PublicPage} from "../../web/lib/page-types";
import {routePath,interceptNavigation} from "./router-state.mjs";
import publicData from "../.generated/public-site.json";

const pages=publicData.pages as PublicPage[];
const journeys=(publicData as unknown as {journeys?:PresenterJourney[]}).journeys||[];
const explainers=(publicData as unknown as {explainers?:{page_id:string;modules:ExplainerModule[]}[]}).explainers||[];
const hashMode=location.protocol==='file:'||(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true;
const routeIndex=new Map(pages.map(page=>[page.path,page]));
function BrowserLink({href,onClick,target,download,...props}:SiteLinkProps){
  const internal=href.startsWith('/')&&!href.startsWith('//');
  const presented=hashMode&&internal?'#'+href:href;
  function clicked(event:MouseEvent<HTMLAnchorElement>){
    onClick?.(event);
    if(hashMode)return;
    if(!interceptNavigation(href,{...event,defaultPrevented:event.defaultPrevented,button:event.button,metaKey:event.metaKey,ctrlKey:event.ctrlKey,shiftKey:event.shiftKey,altKey:event.altKey,target,download:download!==undefined},location.origin))return;
    event.preventDefault();history.pushState(null,'',href);window.dispatchEvent(new Event('popstate'));
  }
  return <a {...props} href={presented} target={target} download={download} onClick={clicked}/>;
}
function RouteContent({page}:{page?:PublicPage}){
  const{locale}=useUI();
  useEffect(()=>{document.title=page?`${page.localizedTitle[locale]} · NeXify AI`:'Seite nicht verfügbar · NeXify AI';window.scrollTo(0,0);},[page,locale]);
  if(!page)return <section className="public-page"><span className="eyebrow">NEXIFY AI</span><h1>Seite nicht verfügbar</h1><p>Diese Seite ist in dieser öffentlichen Anwendung nicht freigegeben. Private Daten werden nicht angezeigt.</p><a className="route-action" href={hashMode?'#/':'/'}>Zur Startseite</a></section>;
  const modules=explainers.find(entry=>entry.page_id===page.id)?.modules||[];
  const explanation=<><PresenterGuide pageId={page.id} pages={pages} journeys={journeys}/><ExplainerSections modules={modules} pages={pages}/></>;
  if(page.path==='/')return <HomeContent home={page} pages={pages}>{explanation}</HomeContent>;
  const authFallback=['login','signup'].includes(page.id);
  return <>{authFallback&&<AuthenticationPanel mode={page.id==='signup'?'signup':'login'}/>}<PublicContent page={page} pages={pages}>{explanation}</PublicContent></>;
}
function App(){
  const[path,setPath]=useState(()=>routePath(location,hashMode)||'__invalid__');
  useEffect(()=>{const changed=()=>setPath(routePath(location,hashMode)||'__invalid__');addEventListener('popstate',changed);addEventListener('hashchange',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('hashchange',changed);};},[]);
  const adapter=useMemo(()=>({pathname:path,Link:BrowserLink}),[path]);
  return <RouterProvider adapter={adapter}><PresenterGuideProvider journeys={journeys} defaultJourneyId={journeys.find(journey=>journey.steps.includes(routeIndex.get(path)?.id||""))?.id}><Workspace pages={pages}><RouteContent page={routeIndex.get(path)}/></Workspace></PresenterGuideProvider></RouterProvider>;
}
createRoot(document.getElementById('root')!).render(<PublicAuthProvider hashMode={hashMode}><App/></PublicAuthProvider>);
