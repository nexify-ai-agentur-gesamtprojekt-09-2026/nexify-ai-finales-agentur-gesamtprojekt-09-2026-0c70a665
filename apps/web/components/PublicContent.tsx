"use client";
import Link from "next/link";
import type { PublicPage } from "../lib/catalog";
import { StartAction,useUI } from "./Workspace";

export default function PublicContent({page,pages}:{page:PublicPage;pages:PublicPage[]}){
  const{locale}=useUI();
  return <section className={`public-page context-${page.site_context}`}><span className="eyebrow">{page.site_context==="teileklar"?"TEILEKLAR · NEXIFY AI":"NEXIFY AI"}</span><h1>{page.localizedTitle[locale]}</h1><p className="page-purpose">{page.localizedSummary[locale]}</p><div className="editorial-sections">{page.sections.map(section=><article className="editorial-note" key={section.id}><h2>{section.heading[locale]}</h2><p>{section.body[locale]}</p></article>)}</div><div className="hero-actions">{page.actions.map((action,index)=>action.type==="chat"&&action.chat_intent?<StartAction key={index} intent={action.chat_intent}>{action.label[locale]}</StartAction>:<Link key={index} className="outline-button route-action" href={pages.find(target=>target.id===action.target_id)?.path||pages.find(target=>target.id==="login")?.path||"/"}>{action.label[locale]} <span aria-hidden="true">→</span></Link>)}</div></section>;
}
