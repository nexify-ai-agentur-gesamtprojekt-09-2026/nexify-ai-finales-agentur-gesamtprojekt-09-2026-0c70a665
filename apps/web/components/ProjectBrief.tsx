"use client";
import {useLayoutEffect,useId,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {Locale} from '../lib/i18n';
import type {ContactChannel,PublicPage} from '../lib/page-types';
import {briefComplete,briefLimits,briefMailto,briefText,emptyBrief,type ProjectBriefDraft} from '../lib/project-brief.mjs';
import {projectBriefCopy} from '../lib/project-brief-i18n';
import {SiteLink} from './Router';

export default function ProjectBrief({locale,page,pages,contact,draft,onChange,onUseQuote,canQuote}:{locale:Locale;page:PublicPage;pages:PublicPage[];contact?:ContactChannel;draft:ProjectBriefDraft;onChange:Dispatch<SetStateAction<ProjectBriefDraft>>;onUseQuote:(title:string,details:string)=>void;canQuote:boolean}){
 const t=projectBriefCopy[locale],id=useId(),input=useRef<HTMLTextAreaElement>(null),summaryInput=useRef<HTMLTextAreaElement>(null),resume=useRef<HTMLButtonElement>(null),resetTrigger=useRef<HTMLButtonElement>(null);
 const[resetArmed,setResetArmed]=useState(false),[resetDone,setResetDone]=useState(false);
 const[focusEpoch,setFocusEpoch]=useState(0),wasOpen=useRef(false),restoreResetFocus=useRef(false);
 const fields=['goal','situation','nextStep'] as const,field=fields[draft.step];
 const origin=pages.find(p=>p.path===draft.originPath),complete=briefComplete(draft);
 const summary=briefText(draft,t,origin?.localizedTitle[locale]);
 const mailto=complete?briefMailto(contact?.address,t.subject,summary):null;
 const target=origin?.actions.map(a=>pages.find(p=>p.id===a.target_id)).find(p=>p&&p.path!==origin.path);
 useLayoutEffect(()=>{if(draft.open)(draft.step<3?input:summaryInput).current?.focus();else if(wasOpen.current)resume.current?.focus();wasOpen.current=draft.open;},[draft.open,draft.step,focusEpoch]);
 useLayoutEffect(()=>{if(!resetArmed&&restoreResetFocus.current){restoreResetFocus.current=false;resetTrigger.current?.focus();}},[resetArmed]);
 const change=(recipe:(value:ProjectBriefDraft)=>ProjectBriefDraft)=>{setResetArmed(false);setResetDone(false);onChange(recipe);};
 function close(){change(v=>({...v,open:false}));}
 return <section className="project-brief" aria-label={t.title}>
  {!draft.open?<button ref={resume} type="button" className="outline-button" aria-expanded="false" aria-controls={id} onClick={()=>change(v=>({...v,open:true,originPath:v.originPath||page.path}))}>{draft.goal||draft.situation||draft.nextStep?t.resume:t.start}</button>:<>
   <div className="project-brief-heading"><h4>{t.title}</h4><button type="button" className="text-button" onClick={close} aria-expanded="true" aria-controls={id}>{t.close}</button></div>
  </>}
  <div id={id} hidden={!draft.open}>
   <p className="state-label">{t.local}</p><p className="connection-note">{t.memory}</p>
   {origin&&<p className="project-brief-source">{t.source}: <SiteLink href={origin.path}>{origin.localizedTitle[locale]}</SiteLink></p>}
   {field?<form onSubmit={event=>{event.preventDefault();const expectedStep=draft.step;change(v=>v.step===expectedStep&&v[field].trim()?{...v,step:Math.min(3,v.step+1)}:v);}}>
    <p className="connection-note">{t.step} {draft.step+1} {t.of} 3</p>
    <label htmlFor={id+'-answer'}>{t.questions[draft.step]}</label><textarea id={id+'-answer'} ref={input} rows={4} maxLength={briefLimits[field]} required value={draft[field]} onChange={event=>{const value=event.target.value;change(v=>({...v,[field]:value}));}}/>
    <div className="project-brief-actions">{draft.step>0&&<button type="button" className="outline-button" onClick={()=>change(v=>({...v,step:Math.max(0,v.step-1)}))}>{t.back}</button>}<button className="primary-button" disabled={!draft[field].trim()}>{draft.step===2?t.review:t.continue}</button></div>
   </form>:<div className="project-brief-review">
    <dl>{fields.map(key=><div key={key}><dt>{t[key]}</dt><dd>{draft[key]}</dd></div>)}</dl>
    <button type="button" className="outline-button" onClick={()=>change(v=>({...v,step:0}))}>{t.edit}</button>
    <label htmlFor={id+'-summary'}>{t.select}</label><textarea id={id+'-summary'} ref={summaryInput} rows={7} readOnly value={summary} onFocus={event=>event.currentTarget.select()}/>
    {mailto&&<><a className="primary-button project-brief-mail" href={mailto}>{t.mail}</a><p className="connection-note">{t.mailNote}</p></>}
    {canQuote?<><button type="button" className="outline-button" disabled={!complete} onClick={()=>onUseQuote(draft.goal.trim().slice(0,160),summary)}>{t.tools}</button><p className="connection-note">{t.toolsNote}</p></>:<p className="status-note">{t.unavailable}</p>}
    {target&&<SiteLink className="orientation-page-link" href={target.path}>{t.page}: {target.localizedTitle[locale]} <span aria-hidden="true">→</span></SiteLink>}
   </div>}
   {resetArmed?<div className="project-brief-reset"><p>{t.resetNote}</p><button type="button" className="outline-button" onClick={()=>{onChange({...emptyBrief(),open:true,originPath:page.path});setResetArmed(false);setResetDone(true);setFocusEpoch(v=>v+1);}}>{t.confirm}</button><button type="button" className="text-button" onClick={()=>{restoreResetFocus.current=true;setResetArmed(false);}}>{t.cancel}</button></div>:<button ref={resetTrigger} type="button" className="text-button project-brief-reset" onClick={()=>setResetArmed(true)}>{t.reset}</button>}
  </div>
  {resetDone&&<p role="status" className="connection-note">{t.resetDone}</p>}
 </section>;
}
