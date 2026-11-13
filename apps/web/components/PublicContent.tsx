"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
import {Children,type ReactNode} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "../lib/page-types";
import {useUI} from "./Workspace";
import {pageImage,pageVideo,imageAlt,srcSetFor} from "../lib/brand-media";
import {SceneVideo} from "./SceneVideo";
import {HcArrow} from "./HcArrow";
import {PageShowcase} from "./PageShowcase";
import {PageQuestions} from "./PageQuestions";
import "./HomeConcept.css";
import "./PageConcept.css";

// Every public page is a derivative of the Startseite: same container, same grid rhythm,
// same kicker/heading/link vocabulary (.home-concept / .hc-*). No second layout system.
const words=interfaceCopy.page;
type Layout="service"|"product"|"workshop"|"commerce"|"document"|"account"|"article"|"company";
const groups:Record<Layout,string[]>={
 service:["services","websites","automation","apps-portals","scope"],
 product:["solutions","nex2fly","one","api","pricing"],
 workshop:["tk-partner","tk-workshop","tk-appointments"],
 commerce:["tk-home","tk-search","tk-fitment","tk-categories","tk-category","tk-product","tk-cart","tk-checkout","tk-vouchers"],
 document:["imprint","privacy","terms","ai-notice","accessibility","cookies","tk-legal"],
 account:["login","signup"],article:["knowledge","knowledge-start"],company:["company","contact"]
};
function layoutFor(page:PublicPage):Layout{
 for(const kind of ["document","account","workshop","commerce","service","product","article"] as Layout[])if(groups[kind].includes(page.id))return kind;
 if(page.site_context==="teileklar")return "commerce";
 return "company";
}
function uniquePages(candidates:(PublicPage|undefined)[]):PublicPage[]{
 const seen=new Set<string>();return candidates.filter((page):page is PublicPage=>Boolean(page&&!seen.has(page.id)&&(seen.add(page.id),true)));
}
const anchorId=(pageId:string,sectionId:string,index:number)=>"content-"+pageId.replace(/[^a-z0-9_-]/gi,"-")+"-"+sectionId.replace(/[^a-z0-9_-]/gi,"-")+"-"+index;
const paragraphs=(text:string)=>text.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean);
const startIntent=(intent:unknown)=>window.dispatchEvent(new CustomEvent("nexify-action",{detail:intent}));

export default function PublicContent({page,pages,children,sectionContent={},explanation}:{page:PublicPage;pages:PublicPage[];children?:ReactNode;sectionContent?:Record<string,ReactNode>;explanation?:ReactNode}){
 const{locale}=useUI();const t=words[locale];const layout=layoutFor(page);
 const get=(id:string)=>pages.find(candidate=>candidate.id===id);
 const home=get("home");const contextHome=page.site_context==="teileklar"?get("tk-home"):home;
 const pathParents=pages.filter(candidate=>candidate.id!==page.id&&candidate.path!=="/"&&page.path.startsWith(candidate.path+"/")).sort((a,b)=>a.path.length-b.path.length);
 const proposedParent=page.path.startsWith("/produkte/")?get("solutions"):page.id==="scope"?get("services"):undefined;
 const editorialParent=proposedParent?.actions.some(action=>action.type==="route"&&action.target_id===page.id)?proposedParent:undefined;
 const parents=uniquePages([home,contextHome,...pathParents,editorialParent]).filter(candidate=>candidate.id!==page.id);
 const contextualPages=groups[layout].map(get).filter((candidate):candidate is PublicPage=>Boolean(candidate&&candidate.id!==page.id));
 const outbound=page.actions.filter(action=>action.type==="route").map(action=>get(action.target_id||""));
 const related=uniquePages([...outbound,...contextualPages]).filter(candidate=>candidate.id!==page.id).slice(0,4);
 const isQuiet=layout==="document"||layout==="account";
 const sections=page.sections.filter(section=>isQuiet||section.body[locale].trim()!==page.localizedSummary[locale].trim());
 const supplementFirst=["tk-home","tk-shop","tk-search","tk-categories","tk-category","tk-product","tk-cart","tk-checkout","tk-workshop","tk-partner","tk-appointments","tk-vouchers","tk-fitment","contact","login","signup"].includes(page.id);
 const image=pageImage(page.id);
 const headingId="page-title-"+page.id;
 const brand=page.site_context==="teileklar"?"TEILEKLAR":"NEXIFY AI";
 const total=String(sections.length).padStart(2,"0");

 const actionLink=(action:PublicPage["actions"][number],index:number,primary:boolean)=>{
  const className="hc-text-link"+(primary?" is-primary":"");
  if(action.type==="chat"&&action.chat_intent)return <button key={index} type="button" className={className} onClick={()=>startIntent(action.chat_intent)} data-testid={"page-action-"+index}>{action.label[locale]}<HcArrow/></button>;
  const target=get(action.target_id||"");
  return target?<SiteLink key={index} className={className} href={target.path} data-testid={"page-action-"+index}>{action.label[locale]}<HcArrow/></SiteLink>:<span key={index} className="hc-caption">{action.label[locale]} · {t.unavailable}</span>;
 };
 const hasSupplement=Children.toArray(children).length>0;
 const supplement=hasSupplement?<section className="hc-container pc-supplement" data-testid={"page-supplement-"+page.id}>{children}</section>:null;

 return <div data-testid={"public-page-"+page.id} className={"home-concept page-concept page-"+page.id+" layout-"+layout+" context-"+page.site_context}>
  <section className="hc-container" aria-labelledby={headingId}>
   <header className={"pc-hero"+(image?"":" is-text-only")}>
    <div className="pc-hero-copy">
     <nav className="pc-breadcrumb" aria-label={t.breadcrumb}><ol>{parents.map((parent,index)=><li key={parent.id}><SiteLink href={parent.path}>{parent.id==="home"?t.home:parent.localizedTitle[locale]}</SiteLink>{index<parents.length-1&&<span aria-hidden="true">/</span>}</li>)}<li className="visually-hidden"><span aria-current="page">{page.localizedTitle[locale]}</span></li></ol></nav>
     <span className="hc-kicker">{brand}<span aria-hidden="true"> / </span>{t[layout]}</span>
     <h1 id={headingId}>{page.localizedTitle[locale]}</h1>
     <p className="pc-hero-lead">{page.localizedSummary[locale]}</p>
     {page.actions.length>0&&<div className="pc-hero-actions">{page.actions.slice(0,2).map((action,index)=>actionLink(action,index,index===0))}</div>}
    </div>
    {image&&<figure className="pc-hero-media" data-testid={"domain-artwork-"+page.id}><img src={image.src} srcSet={srcSetFor(image.src)} sizes="100vw" alt={imageAlt(image,locale)} width={2000} height={1125} loading="eager" fetchPriority="high" decoding="async"/>{pageVideo(page.id)&&<SceneVideo key={page.id} src={pageVideo(page.id)!} locale={locale}/>}</figure>}
   </header>
  </section>
  {sections.length>1&&<nav className="hc-anchors hc-container" aria-label={t.onPage}>{sections.map((section,index)=><a key={section.id} href={"#"+anchorId(page.id,section.id,index)}>{section.heading[locale]}<HcArrow direction="down"/></a>)}</nav>}
  {supplementFirst&&supplement}
  {sections.length>0&&<div className="pc-sections">{sections.map((section,index)=>{
   const custom=sectionContent[section.id];
   return <section className="hc-intro hc-container pc-section" id={anchorId(page.id,section.id,index)} tabIndex={-1} key={section.id} aria-labelledby={anchorId(page.id,section.id,index)+"-title"}>
    <div><span className="hc-kicker">{String(index+1).padStart(2,"0")} / {total}</span><h2 id={anchorId(page.id,section.id,index)+"-title"}>{section.heading[locale]}</h2></div>
    <div className="pc-section-body">{paragraphs(section.body[locale]).map((part,i)=><p key={i}>{part}</p>)}{custom}</div>
   </section>;
  })}</div>}
  {Boolean(page.contact_channels?.length)&&<section className="hc-section hc-container hc-budget" aria-labelledby={"contact-title-"+page.id}>
   <div className="hc-budget-story"><header className="hc-section-heading"><span className="hc-kicker">{brand}</span><h2 id={"contact-title-"+page.id}>{t.contact}</h2></header>
   <div className="hc-costs">{page.contact_channels?.map(channel=><div key={channel.address} className="pc-channel"><h3>{channel.label[locale]}</h3><a href={"mailto:"+channel.address}>{channel.address}<HcArrow/></a></div>)}</div></div>
  </section>}
  {explanation}
  <PageShowcase page={page} pages={pages}/>
  {!supplementFirst&&supplement}
  <PageQuestions page={page}/>
  {related.length>0&&<section className="hc-section hc-container hc-process pc-related" aria-labelledby={"related-title-"+page.id}>
   <header className="hc-section-heading hc-process-heading"><div><span className="hc-kicker">{t.related}</span><h2 id={"related-title-"+page.id}>{t.connections}</h2></div><p>{t.nextIntro}</p></header>
   <ol>{related.map(target=><li key={target.id}><span className="hc-kicker">{target.site_context==="teileklar"?"TEILEKLAR":"NEXIFY AI"}</span><h3><SiteLink href={target.path}>{target.localizedTitle[locale]}<HcArrow direction="out"/></SiteLink></h3><p>{target.localizedSummary[locale]}</p><SiteLink className="hc-text-link" href={target.path} aria-label={target.localizedTitle[locale]+" – "+t.learn}>{t.learn}<HcArrow/></SiteLink></li>)}</ol>
  </section>}
  {page.actions.length>0&&<section className={"hc-section hc-finish hc-container"+(isQuiet?" is-plain":"")} aria-labelledby={"finish-title-"+page.id} data-testid={"page-finish-"+page.id}>
   <div className="hc-finish-heading"><span className="hc-kicker">{isQuiet?t.related:t.details}</span><h2 id={"finish-title-"+page.id}>{isQuiet?t.related:t.next}</h2></div>
   <div className="hc-finish-next">{!isQuiet&&<p>{t.nextIntro}</p>}
   <div className="hc-finish-actions">{page.actions.map((action,index)=>{
    if(index===0){
     if(action.type==="chat"&&action.chat_intent)return <button key={index} type="button" className="hc-finish-primary" onClick={()=>startIntent(action.chat_intent)}>{action.label[locale]}<HcArrow/></button>;
     const target=get(action.target_id||"");if(target)return <SiteLink key={index} className="hc-finish-primary" href={target.path}>{action.label[locale]}<HcArrow/></SiteLink>;
    }
    return actionLink(action,index,false);
   })}</div></div>
  </section>}
 </div>;
}
