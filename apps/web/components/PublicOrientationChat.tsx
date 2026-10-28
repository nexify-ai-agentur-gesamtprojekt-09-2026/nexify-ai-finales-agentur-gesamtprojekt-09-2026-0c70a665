"use client";
import {useChat} from "@ai-sdk/react";
import {DefaultChatTransport} from "ai";
import {useEffect,useMemo,useRef,useState,type FormEvent,type Dispatch,type SetStateAction} from "react";
import type {Locale} from "../lib/i18n";
import type {ContactChannel,PublicPage} from "../lib/page-types";
import type {ProjectBriefDraft} from '../lib/project-brief.mjs';
import {projectBriefCopy} from '../lib/project-brief-i18n';
import ProjectBrief from './ProjectBrief';
import {SiteLink} from "./Router";
import "./PublicOrientationChat.css";

const copy={
 de:{title:"Orientierung im Gespräch",mode:"Textgeführte Vorschau · ohne Live-KI",intro:"Frage nach Leistungen, Produkten oder deinem nächsten Schritt. Du erhältst passende Informationen und Seitenwege. Hier wird nichts gebucht, versendet oder kostenpflichtig ausgeführt.",label:"Deine Frage zur Website",placeholder:"Was möchtest du kennenlernen?",send:"Frage senden",stop:"Antwort stoppen",waiting:"Antwort wird übertragen …",error:"Die Orientierung ist gerade nicht erreichbar. Deine Eingabe bleibt erhalten.",privacy:"Verlauf nur für diesen Besuch im Browser. Keine dauerhafte Speicherung. Bitte keine Zugangsdaten eingeben.",you:"Du",assistant:"AI Fly Oracle",next:"Passende Seite öffnen",prompt:"Wie starte ich mit NeX2fly?"},
 nl:{title:"Oriëntatie in gesprek",mode:"Tekstgestuurd voorbeeld · zonder live-AI",intro:"Vraag naar diensten, producten of je volgende stap. Je krijgt passende informatie en paginaroutes. Hier wordt niets geboekt, verzonden of tegen betaling uitgevoerd.",label:"Je vraag over de website",placeholder:"Wat wil je ontdekken?",send:"Vraag verzenden",stop:"Antwoord stoppen",waiting:"Antwoord wordt ontvangen …",error:"De oriëntatie is nu niet bereikbaar. Je invoer blijft behouden.",privacy:"Geschiedenis alleen tijdens dit bezoek in de browser. Geen blijvende opslag. Voer geen toegangsgegevens in.",you:"Jij",assistant:"AI Fly Oracle",next:"Passende pagina openen",prompt:"Hoe begin ik met NeX2fly?"},
 fr:{title:"Trouver ton chemin",mode:"Aperçu guidé par texte · sans IA en direct",intro:"Pose une question sur les services, les produits ou ta prochaine étape. Tu obtiens les informations et les pages adaptées. Aucune réservation, aucun envoi ni action payante n’est effectué ici.",label:"Ta question sur le site",placeholder:"Que souhaites-tu découvrir ?",send:"Envoyer la question",stop:"Arrêter la réponse",waiting:"Réponse en cours de transmission…",error:"Le guide est momentanément indisponible. Ta saisie est conservée.",privacy:"Historique uniquement dans le navigateur pendant cette visite. Aucune conservation durable. Ne saisis pas d’identifiants.",you:"Toi",assistant:"AI Fly Oracle",next:"Ouvrir la page adaptée",prompt:"Comment commencer avec NeX2fly ?"}
};

function guidedText(text:string,pages:PublicPage[]){
 return text.split(/(\[[^\]\n]+\]\(\/[A-Za-z0-9/-]*\))/g).map((part,index)=>{
  const match=/^\[([^\]\n]+)\]\((\/[A-Za-z0-9/-]*)\)$/.exec(part);
  const target=match&&pages.find(page=>page.path===match[2]);
  return target?<SiteLink key={index} href={target.path}>{match![1]}</SiteLink>:part;
 });
}

export default function PublicOrientationChat({locale,pagePath,pages,onActivityChange,projectBrief,onProjectBriefChange,onUseQuote,canQuote,contact}:{locale:Locale;pagePath:string;pages:PublicPage[];onActivityChange?:(working:boolean)=>void;projectBrief:ProjectBriefDraft;onProjectBriefChange:Dispatch<SetStateAction<ProjectBriefDraft>>;onUseQuote:(title:string,details:string)=>void;canQuote:boolean;contact?:ContactChannel}){
 const text=copy[locale];const[draft,setDraft]=useState("");const lastSubmitted=useRef("");
 const transport=useMemo(()=>new DefaultChatTransport({api:"/api/agent-chat",prepareSendMessagesRequest:({id,messages,trigger,messageId,body})=>({body:{id,trigger,...(messageId?{messageId}:{}),page_path:body?.page_path,locale:body?.locale,messages:messages.filter(message=>message.role==="user").slice(-1).map(message=>({id:message.id,role:message.role,parts:message.parts.filter(part=>part.type==="text")}))}})}),[]);
 const{messages,sendMessage,status,error,stop}=useChat({id:"nexify-public-orientation",transport,onError:()=>setDraft(previous=>previous||lastSubmitted.current)});
 const busy=status==="submitted"||status==="streaming";
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 const composerInput=useRef<HTMLTextAreaElement>(null),submitting=useRef(false);
 const page=pages.find(p=>p.path===pagePath),briefCopy=projectBriefCopy[locale];
 useEffect(()=>{if(!busy&&lastSubmitted.current&&document.activeElement===document.body&&composerInput.current?.offsetParent!==null)composerInput.current?.focus();},[busy]);
 async function submit(event:FormEvent){event.preventDefault();const value=(composerInput.current?.value??draft).trim();if(!value||busy||submitting.current)return;submitting.current=true;lastSubmitted.current=value;setDraft("");try{await sendMessage({text:value},{body:{page_path:pagePath,locale}});}catch{setDraft(previous=>previous||value);}finally{submitting.current=false;}}
 return <section className="public-orientation" aria-label={text.title}>
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  {page&&<><div className="orientation-starters"><p className="connection-note">{briefCopy.context}: <SiteLink href={page.path}>{page.localizedTitle[locale]}</SiteLink></p>{[briefCopy.starter,briefCopy.nextStarter].map(prompt=><button type="button" className="outline-button" key={prompt} disabled={busy||Boolean(draft.trim())} aria-label={briefCopy.useStarter+': '+prompt} onClick={()=>{setDraft(page.localizedTitle[locale]+': '+prompt);composerInput.current?.focus();}}>{prompt}</button>)}</div><ProjectBrief locale={locale} page={page} pages={pages} contact={contact} draft={projectBrief} onChange={onProjectBriefChange} onUseQuote={onUseQuote} canQuote={canQuote}/></>}
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map(message=><article className={"orientation-message role-"+message.role} key={message.id}><strong>{message.role==="user"?text.you:text.assistant}</strong>{message.parts.map((part,index)=>{
   if(part.type==="text")return <p key={index}>{message.role==="assistant"?guidedText(part.text,pages):part.text}</p>;
   if(part.type!=="data-page"||!("data" in part)||!part.data||typeof part.data!=="object")return null;
   const ref=part.data as Record<string,unknown>;const page=pages.find(page=>page.id===ref.page_id&&page.path===ref.path);
   return page?<SiteLink className="orientation-page-link" key={index} href={page.path}>{page.localizedTitle[locale]} <span aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>:null;
  })}</article>)}</div>
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={composerInput} id="orientation-message" maxLength={1000} rows={3} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} disabled={busy} required/><button className="primary-button" disabled={busy||!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button>{busy&&<button type="button" className="outline-button" onClick={()=>void stop()}>{text.stop}</button>}</form>
  {busy&&<p className="connection-note" role="status">{text.waiting}</p>}<p className="connection-note">{text.privacy}</p>
 </section>;
}
