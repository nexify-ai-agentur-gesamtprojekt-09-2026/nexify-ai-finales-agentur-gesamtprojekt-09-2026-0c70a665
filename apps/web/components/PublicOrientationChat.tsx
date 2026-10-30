"use client";
import {useChat} from "@ai-sdk/react";
import {DefaultChatTransport} from "ai";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import type {Locale} from "../lib/i18n";
import type {PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import "./PublicOrientationChat.css";

const copy={
 de:{title:"Orientierung im Gespräch",mode:"Textgeführte Vorschau · ohne Live-KI",intro:"Frage nach Leistungen, Produkten oder deinem nächsten Schritt. Du erhältst passende Informationen und Seitenwege. Hier wird nichts gebucht, versendet oder kostenpflichtig ausgeführt.",label:"Deine Frage zur Website",placeholder:"Was möchtest du kennenlernen?",send:"Frage senden",stop:"Antwort stoppen",waiting:"Antwort wird übertragen …",error:"Die Orientierung ist gerade nicht erreichbar. Deine Eingabe bleibt erhalten.",privacy:"Verlauf nur für diesen Besuch im Browser. Keine dauerhafte Speicherung. Bitte keine Zugangsdaten eingeben.",you:"Du",assistant:"AI Fly Oracle",next:"Passende Seite öffnen",prompt:"Wie starte ich mit NeX2fly?"},
 nl:{title:"Oriëntatie in gesprek",mode:"Tekstgestuurd voorbeeld · zonder live-AI",intro:"Vraag naar diensten, producten of je volgende stap. Je krijgt passende informatie en paginaroutes. Hier wordt niets geboekt, verzonden of tegen betaling uitgevoerd.",label:"Je vraag over de website",placeholder:"Wat wil je ontdekken?",send:"Vraag verzenden",stop:"Antwoord stoppen",waiting:"Antwoord wordt ontvangen …",error:"De oriëntatie is nu niet bereikbaar. Je invoer blijft behouden.",privacy:"Geschiedenis alleen tijdens dit bezoek in de browser. Geen blijvende opslag. Voer geen toegangsgegevens in.",you:"Jij",assistant:"AI Fly Oracle",next:"Passende pagina openen",prompt:"Hoe begin ik met NeX2fly?"},
 fr:{title:"Trouver ton chemin",mode:"Aperçu guidé par texte · sans IA en direct",intro:"Pose une question sur les services, les produits ou ta prochaine étape. Tu obtiens les informations et les pages adaptées. Aucune réservation, aucun envoi ni action payante n’est effectué ici.",label:"Ta question sur le site",placeholder:"Que souhaites-tu découvrir ?",send:"Envoyer la question",stop:"Arrêter la réponse",waiting:"Réponse en cours de transmission…",error:"Le guide est momentanément indisponible. Ta saisie est conservée.",privacy:"Historique uniquement dans le navigateur pendant cette visite. Aucune conservation durable. Ne saisis pas d’identifiants.",you:"Toi",assistant:"AI Fly Oracle",next:"Ouvrir la page adaptée",prompt:"Comment commencer avec NeX2fly ?"}
};

// TEILEKLAR-specific overrides for the default-visible orientation chat (vehicle/part/workshop context).
const tkCopy={
 de:{title:"Orientierung: Fahrzeug, Teil, Werkstatt",intro:"Nenne dein Fahrzeug und das gesuchte Teil oder dein Werkstatt-Anliegen. Du erhältst passende Informationen und Seitenwege. Der Shop ist in Vorbereitung – hier wird nichts bestellt, versendet oder kostenpflichtig ausgeführt.",label:"Dein Fahrzeug-/Teile-Anliegen",placeholder:"Fahrzeug und gesuchtes Teil nennen …"},
 nl:{title:"Oriëntatie: voertuig, onderdeel, werkplaats",intro:"Noem je voertuig en het gezochte onderdeel of je werkplaats-vraag. Je krijgt passende informatie en paginaroutes. De shop is in voorbereiding – hier wordt niets besteld, verzonden of tegen betaling uitgevoerd.",label:"Je voertuig-/onderdeelvraag",placeholder:"Voertuig en gezocht onderdeel noemen …"},
 fr:{title:"Orientation : véhicule, pièce, atelier",intro:"Indique ton véhicule et la pièce recherchée ou ta demande d’atelier. Tu obtiens les informations et les pages adaptées. La boutique est en préparation – aucune commande, aucun envoi ni action payante ici.",label:"Ta demande véhicule/pièce",placeholder:"Indique le véhicule et la pièce recherchée …"}
};
const starters={
 de:{nexify:[["Website planen","Ich möchte eine Website planen: "],["Ablauf automatisieren","Ich möchte einen Ablauf automatisieren: "],["Bestehendes Projekt","Ich habe ein bestehendes Projekt: "]],
     teileklar:[["Fahrzeug angeben","Mein Fahrzeug (Marke, Modell, Baujahr): "],["Teileanfrage vorbereiten","Meine Teileanfrage – Fahrzeug und gesuchtes Teil: "],["Werkstatt-Anliegen","Mein Werkstatt-Anliegen (Fahrzeug und Arbeit): "]]},
 nl:{nexify:[["Website plannen","Ik wil een website plannen: "],["Proces automatiseren","Ik wil een proces automatiseren: "],["Bestaand project","Ik heb een bestaand project: "]],
     teileklar:[["Voertuig opgeven","Mijn voertuig (merk, model, bouwjaar): "],["Onderdeelaanvraag voorbereiden","Mijn onderdeelaanvraag – voertuig en gezocht onderdeel: "],["Werkplaats-vraag","Mijn werkplaats-vraag (voertuig en werk): "]]},
 fr:{nexify:[["Planifier un site","Je veux planifier un site web : "],["Automatiser un processus","Je veux automatiser un processus : "],["Projet existant","J’ai un projet existant : "]],
     teileklar:[["Indiquer le véhicule","Mon véhicule (marque, modèle, année) : "],["Préparer une demande de pièce","Ma demande de pièce – véhicule et pièce recherchée : "],["Demande atelier","Ma demande d’atelier (véhicule et travaux) : "]]}
} as const;

function guidedText(text:string,pages:PublicPage[]){
 return text.split(/(\[[^\]\n]+\]\(\/[A-Za-z0-9/-]*\))/g).map((part,index)=>{
  const match=/^\[([^\]\n]+)\]\((\/[A-Za-z0-9/-]*)\)$/.exec(part);
  const target=match&&pages.find(page=>page.path===match[2]);
  return target?<SiteLink key={index} href={target.path}>{match![1]}</SiteLink>:part;
 });
}

export default function PublicOrientationChat({locale,pagePath,pages,onActivityChange}:{locale:Locale;pagePath:string;pages:PublicPage[];onActivityChange?:(working:boolean)=>void}){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify";const text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};const[draft,setDraft]=useState("");const lastSubmitted=useRef("");
 const transport=useMemo(()=>new DefaultChatTransport({api:"/api/agent-chat",prepareSendMessagesRequest:({id,messages,trigger,messageId,body})=>({body:{id,trigger,...(messageId?{messageId}:{}),page_path:body?.page_path,locale:body?.locale,messages:messages.filter(message=>message.role==="user").slice(-1).map(message=>({id:message.id,role:message.role,parts:message.parts.filter(part=>part.type==="text")}))}})}),[]);
 const{messages,sendMessage,status,error,stop}=useChat({id:"nexify-public-orientation",transport,onError:()=>setDraft(previous=>previous||lastSubmitted.current)});
 const busy=status==="submitted"||status==="streaming";
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 const composerInput=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!busy&&lastSubmitted.current&&document.activeElement===document.body&&composerInput.current?.offsetParent!==null)composerInput.current?.focus();},[busy]);
 async function submit(event:FormEvent){event.preventDefault();const value=draft.trim();if(!value||busy)return;lastSubmitted.current=value;setDraft("");try{await sendMessage({text:value},{body:{page_path:pagePath,locale}});}catch{setDraft(previous=>previous||value);}}
 return <section className="public-orientation" aria-label={text.title}>
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map(message=><article className={"orientation-message role-"+message.role} key={message.id}><strong>{message.role==="user"?text.you:text.assistant}</strong>{message.parts.map((part,index)=>{
   if(part.type==="text")return <p key={index}>{message.role==="assistant"?guidedText(part.text,pages):part.text}</p>;
   if(part.type!=="data-page"||!("data" in part)||!part.data||typeof part.data!=="object")return null;
   const ref=part.data as Record<string,unknown>;const page=pages.find(page=>page.id===ref.page_id&&page.path===ref.path);
   return page?<SiteLink className="orientation-page-link" key={index} href={page.path}>{page.localizedTitle[locale]} <span aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>:null;
  })}</article>)}</div>
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<div className="orientation-starters" role="group" aria-label={text.label}>{starters[locale][site].map(([label,seed])=><button key={label} type="button" className="orientation-starter" onClick={()=>{setDraft(seed);composerInput.current?.focus();}}>{label}<span aria-hidden="true">→</span></button>)}</div>}
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={composerInput} id="orientation-message" maxLength={1000} rows={3} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} disabled={busy} required/><button className="primary-button" disabled={busy||!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button>{busy&&<button type="button" className="outline-button" onClick={()=>void stop()}>{text.stop}</button>}</form>
  {busy&&<p className="connection-note" role="status">{text.waiting}</p>}<p className="connection-note">{text.privacy}</p>
 </section>;
}
