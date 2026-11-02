import {startSiteObservability} from "./observability";
void startSiteObservability();
import {registerPublicInstallation} from "./public-installation.mjs";
declare const __PUBLIC_PWA__:boolean;
void registerPublicInstallation(__PUBLIC_PWA__);
import "../../../packages/tokens/tokens.css";
import "../../web/app/globals.css";
import {AuthenticationPanel,AccountControl} from "./Auth";
import {useEffect,useMemo,useState,type MouseEvent} from "react";
import {createRoot} from "react-dom/client";
import Workspace,{useUI} from "../../web/components/Workspace";
import {RouterProvider,type SiteLinkProps} from "../../web/components/Router";
import type {PublicPage} from "../../web/lib/page-types";
import {routePath,interceptNavigation} from "./router-state.mjs";
import publicData from "../.generated/public-site.json";
import editorialArt from "../../../config/editorial-art.json";
import sceneDirection from "../../../config/scene-direction.json";
import PublicExperience,{PublicExperienceProvider,type PublicExperienceData} from "../../web/components/PublicExperience";
import "../../web/components/LuxuryMaterials.css";
import "../../web/components/PublicEditorial.css";

const pages=publicData.pages as PublicPage[];
const experienceData=publicData as unknown as PublicExperienceData;
const hashMode=location.protocol==='file:'||(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true;
const routeIndex=new Map(pages.map(page=>[page.path,page]));
const dynamicDetailBases:ReadonlyArray<readonly[string,string]>=[['/teileklar/kategorie/','/teileklar/kategorie'],['/teileklar/produkt/','/teileklar/produkt'],['/teileklar/werkstatt/','/teileklar/werkstatt']];
function resolveRoute(path:string):PublicPage|undefined{
  const exact=routeIndex.get(path);
  if(exact)return exact;
  for(const [prefix,base] of dynamicDetailBases){
    if(path.startsWith(prefix)&&path.length>prefix.length&&!path.slice(prefix.length).includes('/'))return routeIndex.get(base);
  }
  return undefined;
}
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
const descriptions={de:"NeXify AI: Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",nl:"NeXify AI: websites, apps en verbonden processen. Bespreek uw plan direct met NeX Agentic AIFly.",fr:"NeXify AI : sites web, applications et processus connectés. Discutez de votre projet directement avec NeX Agentic AIFly.",en:"NeXify AI: websites, apps and connected processes. Discuss your project directly with NeX Agentic AIFly."};
function updatePageSchema(page:PublicPage|undefined,locale:"de"|"nl"|"fr"|"en",title:string,description:string){
  const script=document.getElementById('home-structured-data');
  if(!script)return;
  try{
    const source=script.dataset.sourceSchema||script.textContent||'{}';
    if(!script.dataset.sourceSchema)script.dataset.sourceSchema=source;
    const base=JSON.parse(source) as {"@context":string;"@graph":Array<Record<string,unknown>>};
    const url=location.origin+(page?.path||'/');
    const homeUrl=location.origin+'/';
    const nodes=base["@graph"].filter(node=>node["@type"]!=='WebPage'&&node["@type"]!=='BreadcrumbList');
    const breadcrumbs=[routeIndex.get('/')];
    if(page&&page.path!=='/'){
      let path='';
      for(const segment of page.path.split('/').filter(Boolean)){
        path+='/'+segment;
        const match=routeIndex.get(path);
        if(match)breadcrumbs.push(match);
      }
    }
    const breadcrumb=page&&page.path!=='/'?{"@type":"BreadcrumbList","@id":url+"#breadcrumb","itemListElement":breadcrumbs.filter((item):item is PublicPage=>!!item).map((item,index)=>({"@type":"ListItem",position:index+1,name:item.localizedTitle[locale],item:location.origin+item.path}))}:null;
    const webPage:Record<string,unknown>={"@type":"WebPage","@id":url+(page?.path==='/'?'#home':'#webpage'),url,name:title,description,inLanguage:locale,isPartOf:{"@id":homeUrl+"#website"},about:{"@id":homeUrl+"#organization"}};
    if(breadcrumb)webPage.breadcrumb={"@id":url+"#breadcrumb"};
    script.textContent=JSON.stringify({"@context":base["@context"],"@graph":[...nodes,webPage,...(breadcrumb?[breadcrumb]:[])]});
  }catch{/* An invalid optional schema never blocks the page. */}
}
function RouteContent({page,pathname,search}:{page?:PublicPage;pathname:string;search:string}){
  const{locale}=useUI();
  const unavailable={de:['Seite nicht verfügbar','Diese Seite ist in dieser öffentlichen Anwendung nicht freigegeben. Private Daten werden nicht angezeigt.','Zur Startseite'],nl:['Pagina niet beschikbaar','Deze pagina is niet beschikbaar in deze openbare toepassing. Privégegevens worden niet getoond.','Naar de startpagina'],fr:['Page indisponible',"Cette page n’est pas disponible dans cette application publique. Les données privées ne sont pas affichées.",'Vers l’accueil'],en:['Page unavailable','This page is not available in this public application. Private data is not shown.','To the homepage']}[locale];
  useEffect(()=>{
    document.documentElement.lang=locale;
    document.title=page?.id==='home'&&locale==='de'?'NeXify AI · Websites, Systeme und Kampagnen aus einem Konzept':page?`${page.localizedTitle[locale]} · NeXify AI`:`${unavailable[0]} · NeXify AI`;
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute('content',page?.id==='home'&&locale==='de'?'NeXify AI FACTORY B.V. gestaltet Markenauftritte und Websites, verbindet digitale Abläufe und entwickelt Kampagnen. Pascal Courbois begleitet Ihr Vorhaben persönlich.':page?.localizedSummary[locale]||descriptions[locale]);
    const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.setAttribute('content',document.title);
    const ogDescription=document.querySelector('meta[property="og:description"]');if(ogDescription)ogDescription.setAttribute('content',meta?.getAttribute('content')||'');
    const ogUrl=document.querySelector('meta[property="og:url"]');if(ogUrl)ogUrl.setAttribute('content',location.origin+(page?.path||'/'));
    const ogLocale=document.querySelector('meta[property="og:locale"]');if(ogLocale)ogLocale.setAttribute('content',({de:'de_DE',nl:'nl_NL',fr:'fr_FR',en:'en_US'} as const)[locale]);
    const family=sceneDirection.pages.find(item=>item.page_id===page?.id)?.family;
    const artwork=editorialArt.assets.find(item=>item.id===family);
    const ogImage=document.querySelector('meta[property="og:image"]');if(ogImage)ogImage.setAttribute('content',location.origin+(artwork?.film.poster||'/media/atelier/films/hero-glass-portrait-20261102.jpg'));
    const ogImageAlt=document.querySelector('meta[property="og:image:alt"]');if(ogImageAlt)ogImageAlt.setAttribute('content',artwork?.alt[locale]||'Pascal, NeX und AIFly im NeXify Glasatelier');
    const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.setAttribute('href',location.origin+(page?.path||'/'));
    updatePageSchema(page,locale,document.title,meta?.getAttribute('content')||'');
    window.scrollTo(0,0);
  },[page,locale]);
  if(!page)return <section className="public-page"><span className="eyebrow">NEXIFY AI</span><h1>{unavailable[0]}</h1><p>{unavailable[1]}</p><BrowserLink className="route-action" href="/">{unavailable[2]}</BrowserLink></section>;
  const authFallback=['login','signup'].includes(page.id);
  return <>{authFallback&&<AuthenticationPanel hashMode={hashMode} mode={page.id==='signup'?'signup':'login'}/>}<PublicExperience page={page} data={experienceData} shopRuntime pathname={pathname} search={search}/></>;
}
function App(){
  const[locationKey,setLocationKey]=useState(()=>location.href);
  const path=routePath(location,hashMode)||'__invalid__';
  const search=hashMode?(location.hash.split('?')[1]||''):location.search;
  void locationKey;
  useEffect(()=>{const changed=()=>setLocationKey(location.href);addEventListener('popstate',changed);addEventListener('hashchange',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('hashchange',changed);};},[]);
  const adapter=useMemo(()=>({pathname:path,Link:BrowserLink,navigate:(href:string)=>{history.pushState(null,'',hashMode?'#'+href:href);window.dispatchEvent(new Event('popstate'));}}),[path,search]);
  return <RouterProvider adapter={adapter}><PublicExperienceProvider data={experienceData}><Workspace pages={pages} accountControl={<AccountControl/>}><RouteContent page={resolveRoute(path)} pathname={path} search={search}/></Workspace></PublicExperienceProvider></RouterProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
