"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent,type KeyboardEvent,type MouseEvent} from "react";
import {Zeichen} from "./Zeichen";
import type {Locale} from "../lib/i18n";
import type {PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import "./PublicOrientationChat.css";
import {staticOrientation,type StaticGuidance} from "../lib/static-orientation";
import {LOGO_FIGUR,OracleName} from './Logo';
import {saveOracleBrief} from "../lib/project-brief-transfer";
import {streamChat} from "../lib/chat-client";
import {loadChat,saveChat,settleTurn,stopAllowed,type ChatPhase,type ChatTurn} from "../lib/chat-session";
import type {BriefingDTO,ChatMessageDTO} from "../lib/chat-contract";
declare const __NEXIFY_STATIC_ORIENTATION__:boolean;

const copy={
  "de": {
    "title": "Was planen Sie?",
    "mode": "Leistungen finden",
    "intro": "Erzählen Sie mir von Ihrem Unternehmen und Ihrem Vorhaben. Ich helfe Ihnen, passende Leistungen zu finden und Ihr Gespräch mit Pascal vorzubereiten.",
    "label": "Wobei können wir Ihnen helfen?",
    "placeholder": "Zum Beispiel: Ich möchte meine Website erneuern …",
    "send": "Nachricht senden",
    "stop": "Antwort anhalten",
    "waiting": "Passende Informationen werden geladen …",
    "error": "Die Website-Beratung ist gerade nicht erreichbar. Ihre Eingabe bleibt erhalten. Für die persönliche Projektklärung nutzen Sie bitte die Kontaktseite.",
    "privacy": "Bitte keine Passwörter oder Zahlungsdaten eingeben. Sie sprechen hier mit einem KI-Assistenten (NeX Agentic AIFly); Antworten können Fehler enthalten.",
    "you": "Sie",
    "assistant": "Oracle",
    "next": "Zum passenden Angebot",
    "prompt": "Welcher Einstieg von NeXify passt zu meinem Unternehmen?"
  },
  "nl": {
    "title": "Wat bent u van plan?",
    "mode": "Diensten vinden",
    "intro": "Vertel me over uw bedrijf en uw plannen. Ik help u passende diensten te vinden en uw gesprek met Pascal voor te bereiden.",
    "label": "Waarmee kunnen we u helpen?",
    "placeholder": "Bijvoorbeeld: Ik wil mijn website vernieuwen …",
    "send": "Bericht versturen",
    "stop": "Antwoord onderbreken",
    "waiting": "Passende informatie wordt geladen …",
    "error": "Het websiteadvies is nu niet bereikbaar. Uw invoer blijft behouden. Gebruik de contactpagina voor een persoonlijk projectgesprek.",
    "privacy": "Voer hier geen wachtwoorden of betaalgegevens in. U spreekt hier met een AI-assistent (NeX Agentic AIFly); antwoorden kunnen fouten bevatten.",
    "you": "U",
    "assistant": "Oracle",
    "next": "Naar het passende aanbod",
    "prompt": "Welke eerste stap van NeXify past bij mijn bedrijf?"
  },
  "fr": {
    "title": "Quel est votre projet ?",
    "mode": "Trouver une prestation",
    "intro": "Parlez-moi de votre entreprise et de votre projet. Je vous aide à trouver les services adaptés et à préparer votre échange avec Pascal.",
    "label": "Comment pouvons-nous vous aider ?",
    "placeholder": "Par exemple : je souhaite refaire mon site …",
    "send": "Envoyer le message",
    "stop": "Suspendre la réponse",
    "waiting": "Chargement des informations pertinentes…",
    "error": "Le conseil sur le site est momentanément indisponible. Votre saisie est conservée. Utilisez la page de contact pour un échange personnel sur votre projet.",
    "privacy": "Merci de ne saisir ni mot de passe ni données de paiement. Vous parlez ici à un assistant IA (NeX Agentic AIFly) ; les réponses peuvent contenir des erreurs.",
    "you": "Vous",
    "assistant": "Oracle",
    "next": "Vers l’offre adaptée",
    "prompt": "Quelle première étape de NeXify convient à mon entreprise ?"
  },
  "en": {
    "title": "What are you planning?",
    "mode": "Find a service",
    "intro": "Tell me about your business and what you have in mind. I can help you find relevant services and prepare your conversation with Pascal.",
    "label": "How can we help?",
    "placeholder": "For example: I would like to update my website …",
    "send": "Send message",
    "stop": "Pause response",
    "waiting": "Loading relevant information …",
    "error": "Website guidance is temporarily unavailable. Your input is retained. Please use the contact page for a personal project discussion.",
    "privacy": "Please do not enter passwords or payment details. You are talking to an AI assistant (NeX Agentic AIFly); answers may contain errors.",
    "you": "You",
    "assistant": "Oracle",
    "next": "View the relevant offer",
    "prompt": "Which NeXify starting point suits my business?"
  }
};

// Zustände des geführten Gesprächs. Gleicher Schlüsselsatz in allen vier Sprachen.
type StateCopy={reply:string;thinking:string;failed:string;limitedSeconds:string;limitedMinutes:string;rejected:string;stopped:string;retry:string;resend:string;contact:string;contactWithMessage:string;restart:string;brief:string;briefRequest:string;unavailable:string;pages:string;openPage:string;counter:string;keys:string};
const stateCopy:Record<Locale,StateCopy>={
 de:{reply:"Ihre Antwort …",thinking:"Oracle antwortet …",failed:"Die Antwort konnte gerade nicht geladen werden. Ihre Nachricht bleibt stehen. Versuchen Sie es erneut oder schreiben Sie Pascal direkt.",limitedSeconds:"Gerade gehen sehr viele Nachrichten ein. Bitte versuchen Sie es in {n} Sekunden erneut.",limitedMinutes:"Gerade gehen sehr viele Nachrichten ein. Bitte versuchen Sie es in etwa {n} Minuten erneut.",rejected:"Diese Nachricht konnte so nicht verarbeitet werden. Bitte formulieren Sie sie neu oder schreiben Sie Pascal direkt.",stopped:"Antwort angehalten.",retry:"Erneut versuchen",resend:"Erneut senden",contact:"Kontakt aufnehmen",contactWithMessage:"Mit dieser Nachricht anfragen",restart:"Neues Gespräch",brief:"Briefing jetzt erstellen",briefRequest:"Bitte fassen Sie mein Vorhaben jetzt als Briefing zusammen.",unavailable:"Der Chat ist im Moment nicht erreichbar. Ihre Nachricht bleibt erhalten. Sie können damit direkt bei Pascal anfragen oder es erneut versuchen.",pages:"Passende Seiten",openPage:"Seite öffnen",counter:"Zeichen",keys:"Eingabetaste sendet, Umschalt und Eingabetaste beginnt eine neue Zeile."},
 nl:{reply:"Uw antwoord …",thinking:"Oracle antwoordt …",failed:"Het antwoord kon nu niet worden geladen. Uw bericht blijft staan. Probeer het opnieuw of schrijf Pascal rechtstreeks.",limitedSeconds:"Er komen nu erg veel berichten binnen. Probeer het over {n} seconden opnieuw.",limitedMinutes:"Er komen nu erg veel berichten binnen. Probeer het over ongeveer {n} minuten opnieuw.",rejected:"Dit bericht kon zo niet worden verwerkt. Formuleer het opnieuw of schrijf Pascal rechtstreeks.",stopped:"Antwoord onderbroken.",retry:"Opnieuw proberen",resend:"Opnieuw versturen",contact:"Contact opnemen",contactWithMessage:"Aanvragen met dit bericht",restart:"Nieuw gesprek",brief:"Nu briefing maken",briefRequest:"Vat mijn plan nu samen als briefing.",unavailable:"De chat is op dit moment niet bereikbaar. Uw bericht blijft bewaard. U kunt hiermee rechtstreeks bij Pascal aanvragen of het opnieuw proberen.",pages:"Passende pagina’s",openPage:"Pagina openen",counter:"tekens",keys:"Enter verstuurt, Shift en Enter begint een nieuwe regel."},
 fr:{reply:"Votre réponse …",thinking:"Oracle répond …",failed:"La réponse n’a pas pu être chargée. Votre message est conservé. Réessayez ou écrivez directement à Pascal.",limitedSeconds:"De très nombreux messages arrivent en ce moment. Veuillez réessayer dans {n} secondes.",limitedMinutes:"De très nombreux messages arrivent en ce moment. Veuillez réessayer dans environ {n} minutes.",rejected:"Ce message n’a pas pu être traité tel quel. Reformulez-le ou écrivez directement à Pascal.",stopped:"Réponse suspendue.",retry:"Réessayer",resend:"Renvoyer",contact:"Prendre contact",contactWithMessage:"Faire une demande avec ce message",restart:"Nouvelle conversation",brief:"Créer le briefing",briefRequest:"Merci de résumer maintenant mon projet sous forme de briefing.",unavailable:"Le chat est momentanément indisponible. Votre message est conservé. Vous pouvez l’utiliser pour une demande directe à Pascal ou réessayer.",pages:"Pages utiles",openPage:"Ouvrir la page",counter:"caractères",keys:"Entrée envoie, Maj et Entrée commence une nouvelle ligne."},
 en:{reply:"Your reply …",thinking:"Oracle is replying …",failed:"The reply could not be loaded just now. Your message is kept. Please try again or write to Pascal directly.",limitedSeconds:"A lot of messages are coming in right now. Please try again in {n} seconds.",limitedMinutes:"A lot of messages are coming in right now. Please try again in about {n} minutes.",rejected:"This message could not be processed as written. Please rephrase it or write to Pascal directly.",stopped:"Reply paused.",retry:"Try again",resend:"Send again",contact:"Get in touch",contactWithMessage:"Enquire with this message",restart:"New conversation",brief:"Create the brief now",briefRequest:"Please summarise my project as a brief now.",unavailable:"The chat is unavailable at the moment. Your message is kept. You can use it to enquire with Pascal directly or try again.",pages:"Relevant pages",openPage:"Open page",counter:"characters",keys:"Enter sends, Shift and Enter starts a new line."}
};

// Hinweis unter dem Eingabefeld: sachlicher Eingabehinweis mit Verweis auf die Datenschutzseite der jeweiligen Marke.
const privacyLink:Record<Locale,string>={de:"Datenschutz",nl:"Privacy",fr:"Confidentialité",en:"Privacy"};
function ComposerNote({locale,site,pages,children}:{locale:Locale;site:"nexify"|"teileklar";pages:PublicPage[];children:string}){
 const target=pages.find(page=>page.path===(site==="teileklar"?"/teileklar/rechtliches":"/datenschutz"));
 return <>{children}{target&&<> <SiteLink href={target.path}>{privacyLink[locale]}</SiteLink></>}</>;
}

// TEILEKLAR-specific overrides for the default-visible orientation chat (vehicle/part/workshop context).
const tkCopy={
 de:{title:"Willkommen bei TEILEKLAR",intro:"Willkommen bei TEILEKLAR. Worum geht es bei Ihnen: ein Ersatzteil, ein Werkstattbesuch oder eine Zusammenarbeit? Bei einer Teile- oder Werkstattfrage nennen Sie bitte Ihr Fahrzeug und beschreiben Sie Ihr Anliegen. Eine vorhandene Teilenummer hilft bei der Zuordnung.",label:"Ihr Fahrzeug-/Teile-Anliegen",placeholder:"Fahrzeug und gesuchtes Teil nennen …"},
 nl:{title:"Welkom bij TEILEKLAR",intro:"Welkom bij TEILEKLAR. Waar gaat het bij u om: een onderdeel, een werkplaatsbezoek of een samenwerking? Bij een onderdeel- of werkplaatsvraag: noem uw voertuig en beschrijf uw vraag. Een bestaand onderdeelnummer helpt bij de toewijzing. Online bestellen is momenteel niet mogelijk.",label:"Uw voertuig-/onderdeelvraag",placeholder:"Voertuig en gezocht onderdeel noemen …"},
 fr:{title:"Bienvenue chez TEILEKLAR",intro:"Bienvenue chez TEILEKLAR. Que recherchez-vous : une pièce, une visite en atelier ou une collaboration ? Pour une demande de pièce ou d’atelier, indiquez votre véhicule et décrivez votre demande. Un numéro de pièce existant facilite l’affectation. La commande en ligne n’est pas possible actuellement.",label:"Votre demande véhicule/pièce",placeholder:"Indiquez le véhicule et la pièce recherchée …"},
 en:{"title": "Welcome to TEILEKLAR", "intro": "Welcome to TEILEKLAR. What is it about for you: a spare part, a workshop visit or a partnership? For a parts or workshop question, please name your vehicle and describe your request. An existing part number helps with the assignment. Online ordering is currently not possible.", "label": "Your vehicle/part request", "placeholder": "Enter the vehicle and the part you need …"}
};
const staticModeLabel:Record<Locale,string>={de:'Orientierung anhand der Website · ohne Live-KI',nl:'Oriëntatie op basis van de website · zonder live AI',fr:'Orientation selon le site · sans IA en direct',en:'Website-based guidance · no live AI'};
const starters={
  "de": {
    "nexify": [
      [
        "Marke & Web",
        "Ich möchte meinen Markenauftritt und meine Website entwickeln: "
      ],
      [
        "Systeme & KI",
        "Ich möchte diesen Arbeitsablauf mit KI und Automatisierung verbessern: "
      ],
      [
        "Ads & Marketing",
        "Ich möchte diese Zielgruppe mit einer Kampagne erreichen: "
      ]
    ],
    "teileklar": [
      [
        "Fahrzeug & Teil",
        "Mein Fahrzeug und das gesuchte Teil: "
      ],
      [
        "Werkstatt-Anfrage",
        "Mein Fahrzeug und die gewünschte Werkstattleistung: "
      ],
      [
        "Zusammenarbeit",
        "Ich möchte eine Zusammenarbeit mit TEILEKLAR besprechen: "
      ]
    ]
  },
  "nl": {
    "nexify": [
      [
        "Merk & web",
        "Ik wil mijn merkuitstraling en website ontwikkelen: "
      ],
      [
        "Systemen & AI",
        "Ik wil dit werkproces met AI en automatisering verbeteren: "
      ],
      [
        "Ads & marketing",
        "Ik wil deze doelgroep met een campagne bereiken: "
      ]
    ],
    "teileklar": [
      [
        "Voertuig & onderdeel",
        "Mijn voertuig en het gezochte onderdeel: "
      ],
      [
        "Werkplaatsaanvraag",
        "Mijn voertuig en de gewenste werkplaatsdienst: "
      ],
      [
        "Samenwerking",
        "Ik wil samenwerking met TEILEKLAR bespreken: "
      ]
    ]
  },
  "fr": {
    "nexify": [
      [
        "Marque & web",
        "Je souhaite développer ma marque et mon site web : "
      ],
      [
        "Systèmes & IA",
        "Je souhaite améliorer ce processus grâce à l’IA et à l’automatisation : "
      ],
      [
        "Publicité & marketing",
        "Je souhaite toucher ce public avec une campagne : "
      ]
    ],
    "teileklar": [
      [
        "Véhicule & pièce",
        "Mon véhicule et la pièce recherchée : "
      ],
      [
        "Demande atelier",
        "Mon véhicule et la prestation d’atelier souhaitée : "
      ],
      [
        "Collaboration",
        "Je souhaite discuter d’une collaboration avec TEILEKLAR : "
      ]
    ]
  },
  "en": {
    "nexify": [
      [
        "Brand & web",
        "I want to develop my brand presence and website: "
      ],
      [
        "Systems & AI",
        "I want to improve this workflow with AI and automation: "
      ],
      [
        "Ads & marketing",
        "I want to reach this audience with a campaign: "
      ]
    ],
    "teileklar": [
      [
        "Vehicle & part",
        "My vehicle and the part I need: "
      ],
      [
        "Workshop enquiry",
        "My vehicle and the workshop service I am seeking: "
      ],
      [
        "Partnership",
        "I would like to discuss working with TEILEKLAR: "
      ]
    ]
  }
} as const;

const starterDetails:Record<Locale,Record<"nexify"|"teileklar",readonly string[]>>={
 de:{
  nexify:["Auftritt, Website oder Shop gestalten.","Abläufe verbinden und Arbeit erleichtern.","Menschen erreichen und Nachfrage gewinnen."],
  teileklar:["Mit Fahrzeugdaten und vorhandenem Hinweis zum passenden Teil starten.","Leistung, Fahrzeug und Standort für die Werkstattsuche einordnen.","Werkstattprofil, Zusammenarbeit und gemeinsamen Serviceweg besprechen."]
 },
 nl:{
  nexify:["Een uitstraling, website of shop ontwikkelen.","Processen verbinden en werk eenvoudiger maken.","Mensen bereiken en vraag creëren."],
  teileklar:["Start met voertuiggegevens en bekende informatie over het onderdeel.","Werkplaatsdienst, voertuig en locatie samen afbakenen.","Werkplaatsprofiel, samenwerking en gezamenlijke service bespreken."]
 },
 fr:{
  nexify:["Créer une identité, un site ou une boutique.","Relier les processus et simplifier le travail.","Atteindre des clients et susciter la demande."],
  teileklar:["Commencer avec le véhicule et les informations connues sur la pièce.","Préciser la prestation, le véhicule et la zone de recherche.","Échanger sur le profil atelier, la collaboration et le parcours de service."]
 },
 en:{
  nexify:["Create a presence, website or shop.","Connect workflows and make work easier.","Reach people and generate demand."],
  teileklar:["Start with vehicle details and any known information about the part.","Frame the service, vehicle and location for the workshop search.","Discuss the workshop profile, partnership and shared service journey."]
 }
};

const journeyCopy:Record<Locale,Record<"nexify"|"teileklar",{eyebrow:string;title:string;body:string;steps:readonly [string,string][]}>>={
 de:{
  nexify:{eyebrow:"Persönlich geführt",title:"Aus einer Idee wird ein klarer nächster Schritt.",body:"AIFly ordnet Ihr Vorhaben vor. Pascal übernimmt, sobald Ziele, Umfang und Entscheidungen persönlich geklärt werden sollen.",steps:[["01","Vorhaben einordnen"],["02","Passenden Weg finden"],["03","Persönlich vertiefen"]]},
  teileklar:{eyebrow:"Gezielt vorbereitet",title:"Vom Anliegen zur passenden Anlaufstelle.",body:"AIFly sammelt die entscheidenden Angaben. Anschließend führt der passende Weg zu Teil, Werkstatt oder Zusammenarbeit.",steps:[["01","Fahrzeug nennen"],["02","Anliegen eingrenzen"],["03","Nächsten Weg wählen"]]}
 },
 nl:{
  nexify:{eyebrow:"Persoonlijk begeleid",title:"Van idee naar een duidelijke volgende stap.",body:"AIFly ordent uw plan vooraf. Pascal neemt over zodra doelen, omvang en keuzes persoonlijk besproken moeten worden.",steps:[["01","Plan duiden"],["02","Route bepalen"],["03","Persoonlijk verdiepen"]]},
  teileklar:{eyebrow:"Gericht voorbereid",title:"Van vraag naar het juiste aanspreekpunt.",body:"AIFly verzamelt de beslissende gegevens. Daarna leidt de passende route naar onderdeel, werkplaats of samenwerking.",steps:[["01","Voertuig noemen"],["02","Vraag afbakenen"],["03","Route kiezen"]]}
 },
 fr:{
  nexify:{eyebrow:"Accompagnement personnel",title:"De l’idée à une prochaine étape claire.",body:"AIFly structure d’abord votre projet. Pascal prend le relais lorsque les objectifs, le périmètre et les décisions doivent être précisés ensemble.",steps:[["01","Situer le projet"],["02","Trouver la voie"],["03","Approfondir ensemble"]]},
  teileklar:{eyebrow:"Préparation ciblée",title:"De la demande au bon interlocuteur.",body:"AIFly rassemble les informations décisives, puis oriente vers la pièce, l’atelier ou la collaboration appropriée.",steps:[["01","Nommer le véhicule"],["02","Préciser le besoin"],["03","Choisir la suite"]]}
 },
 en:{
  nexify:{eyebrow:"Personally guided",title:"Turn an idea into a clear next step.",body:"AIFly structures your project first. Pascal takes over when goals, scope and decisions need a personal conversation.",steps:[["01","Frame the project"],["02","Find the right route"],["03","Develop it together"]]},
  teileklar:{eyebrow:"Purposefully prepared",title:"From request to the right point of contact.",body:"AIFly gathers the decisive details, then directs you to the relevant part, workshop or partnership route.",steps:[["01","Name the vehicle"],["02","Narrow the request"],["03","Choose the route"]]}
 }
};

/** Das Eingabefeld wächst mit dem Text (bis zur Grenze aus dem Stylesheet) und schrumpft nach dem Senden zurück. */
function useAutoGrow(field:{current:HTMLTextAreaElement|null},value:string){
 useEffect(()=>{const node=field.current;if(!node)return;node.style.height="auto";node.style.height=node.scrollHeight+"px";},[field,value]);
}

function OrientationStarters({locale,site,label,onChoose,chosen}:{locale:Locale;site:"nexify"|"teileklar";label:string;onChoose:(seed:string)=>void;chosen?:string}){
 return <div className="orientation-starters" role="group" aria-label={label}>{starters[locale][site].map(([title,seed],index)=><button key={title} type="button" className="orientation-starter" aria-pressed={chosen===seed} onClick={()=>onChoose(seed)}><span className="orientation-starter-index" aria-hidden="true">0{index+1}</span><span className="orientation-starter-copy"><strong>{title}</strong><small>{starterDetails[locale][site][index]}</small></span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button>)}</div>;
}

// Leerzustand: Oracle empfängt als Gastgeber; darunter die Marke des Assistenten.
function OrientationIntro({title,intro}:{title:string;intro:string}){
 return <div className="orientation-intro"><div className="orientation-host"><span className="orientation-host-figure" aria-hidden="true"><img src={LOGO_FIGUR} alt="" width={512} height={512} decoding="async"/></span><OracleName className="orientation-host-name"/></div><h3>{title}</h3><p className="orientation-intro-body">{intro}</p></div>;
}

function OrientationJourney({locale,site,step=0,quiet=false}:{locale:Locale;site:"nexify"|"teileklar";step?:number;quiet?:boolean}){
 const content=journeyCopy[locale][site];
 return <ol className={"orientation-path"+(quiet?" orientation-path-quiet":"")} aria-label={content.title}>{content.steps.map(([number,label],index)=><li key={number} data-state={index<step?"done":index===step?"current":"open"} aria-current={index===step?"step":undefined}><small>{number}</small>{label}</li>)}</ol>;
}

function OrientationAnswer({text,locale}:{text:string;locale:Locale}){
 const paragraphs=text.split(/\n\n+/).filter(Boolean),last=paragraphs.length-1;
 const noteLabel=({de:"Wie diese Antwort entsteht",nl:"Hoe dit antwoord ontstaat",fr:"Origine de cette réponse",en:"How this answer is produced"} as const)[locale];
 return <div className="orientation-answer-copy">{paragraphs.map((paragraph,index)=>index===0?<p className="orientation-answer-heading" key={paragraph}>{paragraph}</p>:index===last&&paragraphs.length>2?<details className="orientation-answer-note" key={paragraph}><summary>{noteLabel}<span aria-hidden="true">+</span></summary><p>{paragraph}</p></details>:<p key={paragraph}>{paragraph}</p>)}</div>;
}

function guidedText(text:string,pages:PublicPage[]){
 return text.split(/(\[[^\]\n]+\]\(\/[A-Za-z0-9/-]*\))/g).map((part,index)=>{
  const match=/^\[([^\]\n]+)\]\((\/[A-Za-z0-9/-]*)\)$/.exec(part);
  const target=match&&pages.find(page=>page.path===match[2]);
  return target?<SiteLink key={index} href={target.path}>{match![1]}</SiteLink>:part;
 });
}

const briefingCopy:Record<Locale,{title:string;intro:string;label:string;copy:string;copied:string;fallback:string;tooLong:string;contact:string;hint:string;heading:string}>={
 de:{title:"Ihr Projektbriefing",intro:"Aus Ihren Angaben entsteht ein Entwurf für das persönliche Gespräch. Sie können ihn ändern.",label:"Briefing bearbeiten",copy:"Briefing kopieren",copied:"Kopiert.",fallback:"Die Übernahme ist hier nicht möglich. Kopieren Sie den Text und fügen Sie ihn im Kontaktformular ein.",tooLong:"Bitte kürzen Sie das Briefing auf höchstens 4.000 Zeichen.",contact:"Mit diesem Briefing anfragen",hint:"Der Text wird auf diesem Gerät ins Kontaktformular übernommen. Erst dort entscheiden Sie, ob Sie die Anfrage absenden.",heading:"Mein Vorhaben"},
 nl:{title:"Uw projectbriefing",intro:"Uw informatie vormt een concept voor een persoonlijk gesprek. U kunt het aanpassen.",label:"Briefing bewerken",copy:"Briefing kopiëren",copied:"Gekopieerd.",fallback:"Overnemen is hier niet mogelijk. Kopieer de tekst en plak deze in het contactformulier.",tooLong:"Kort het briefing in tot maximaal 4.000 tekens.",contact:"Aanvragen met dit briefing",hint:"De tekst wordt op dit apparaat in het contactformulier gezet. U beslist daar zelf over verzenden.",heading:"Mijn project"},
 fr:{title:"Votre briefing projet",intro:"Vos informations forment une base pour un échange personnel. Vous pouvez la modifier.",label:"Modifier le briefing",copy:"Copier le briefing",copied:"Copié.",fallback:"Le transfert est indisponible ici. Copiez le texte puis collez-le dans le formulaire de contact.",tooLong:"Raccourcissez le briefing à 4 000 caractères maximum.",contact:"Faire une demande avec ce briefing",hint:"Le texte est repris dans le formulaire sur cet appareil. Vous décidez ensuite de l’envoyer.",heading:"Mon projet"},
 en:{title:"Your project brief",intro:"Your details become a draft for a personal conversation. You can edit it.",label:"Edit brief",copy:"Copy brief",copied:"Copied.",fallback:"Transfer is unavailable here. Copy the text and paste it into the contact form.",tooLong:"Please shorten the brief to 4,000 characters or fewer.",contact:"Enquire with this brief",hint:"The text is added to the contact form on this device. You decide whether to send it there.",heading:"My project"}
};

function ProjectBriefing({locale,questions,prepared}:{locale:Locale;questions:string[];prepared?:string}){
 const t=briefingCopy[locale];
 const [edited,setEdited]=useState<string|null>(null),[notice,setNotice]=useState("");
 const priorQuestions=useRef<string[]>([]);
 const questionSignature=questions.join('\u0001');
 useEffect(()=>{
  const previous=priorQuestions.current;
  const incoming=questions.length>previous.length?questions.slice(previous.length):previous.at(-1)!==questions.at(-1)?questions.slice(-1):[];
  priorQuestions.current=questions;
  if(incoming.length&&prepared===undefined)setEdited(current=>current===null?null:`${current}\n${incoming.join('\n')}`);
 },[questionSignature]);
 const prompts:Record<Locale,string>={de:"Ziel / gewünschtes Ergebnis:\n\nBestehende Website oder Systeme:\n\nZeitrahmen und Budget (falls bekannt):",nl:"Doel / gewenst resultaat:\n\nBestaande website of systemen:\n\nPlanning en budget (indien bekend):",fr:"Objectif / résultat souhaité :\n\nSite ou systèmes existants :\n\nCalendrier et budget (si connus) :",en:"Goal / desired outcome:\n\nExisting website or systems:\n\nTimeline and budget (if known):"};
 // Ein im Gespräch entstandenes Briefing ersetzt den Entwurf; eine neue Fassung ersetzt auch eigene Änderungen daran.
 useEffect(()=>{if(prepared!==undefined){setEdited(null);setNotice("");}},[prepared]);
 const generated=prepared??`${t.heading}:\n${questions.map((question,index)=>`${index+1}. ${question}`).join("\n")}\n\n${prompts[locale]}`;
 const value=edited??generated;
 async function copyBrief(){try{await navigator.clipboard.writeText(value);setNotice(t.copied);}catch{setNotice(t.fallback);}}
 function transferBrief(event:MouseEvent<HTMLAnchorElement>){
  try{
   if(value.length>4000){event.preventDefault();setNotice(t.tooLong);return;}
   if(!saveOracleBrief(sessionStorage,value))throw new Error('invalid_brief');
  }catch{
   event.preventDefault();
   setNotice(t.fallback);
  }
 }
 return <section className="orientation-brief" aria-label={t.title}><div className="orientation-brief-heading"><span className="orientation-brief-icon" aria-hidden="true">✳</span><div><h4>{t.title}</h4><p>{t.intro}</p></div></div><label htmlFor="orientation-brief-text">{t.label}</label><textarea id="orientation-brief-text" rows={prepared?10:5} maxLength={4000} value={value} onChange={event=>{setEdited(event.target.value);setNotice("");}}/><div className="orientation-brief-actions"><button type="button" className="outline-button" onClick={()=>void copyBrief()}>{t.copy}</button><SiteLink className="primary-button" href="/kontakt" onClick={transferBrief}>{t.contact} <Zeichen name="pfeil" groesse={18}/></SiteLink></div><p className="orientation-brief-hint">{t.hint}</p><p className="orientation-brief-notice" role="status">{notice}</p></section>;
}

type OrientationProps={locale:Locale;pagePath:string;pages:PublicPage[];onActivityChange?:(working:boolean)=>void};
type FallbackProps=OrientationProps&{unavailable?:boolean;initialQuestion?:string;onRetry?:()=>void};

export default function PublicOrientationChat(props:OrientationProps){
 const local=typeof __NEXIFY_STATIC_ORIENTATION__!=="undefined"&&__NEXIFY_STATIC_ORIENTATION__===true;
 const site=props.pagePath.startsWith('/teileklar')?'teileklar':'nexify';
 const conversationKey=`${site}:${props.locale}`;
 // Meldet der Server ausdrücklich, dass der Chat nicht angebunden ist, und gab es noch keine Antwort,
 // führt die Oberfläche auf den Kontaktweg. „Erneut versuchen" sendet dieselbe Nachricht noch einmal.
 const [fallback,setFallback]=useState<{key:string;question:string}|null>(null);
 const [resend,setResend]=useState<{key:string;question:string}|null>(null);
 return local?<StaticOrientationChat key={conversationKey} {...props}/>
  :fallback?.key===conversationKey?<StaticOrientationChat key={conversationKey+":fallback"} {...props} unavailable initialQuestion={fallback.question} onRetry={()=>{setResend(fallback);setFallback(null);}}/>
  :<ServerOrientationChat key={conversationKey} {...props} resend={resend?.key===conversationKey?resend.question:undefined} onUnavailable={question=>setFallback({key:conversationKey,question})}/>;
}

type Turn=ChatTurn;
const MESSAGE_LIMIT=1000;
const sessionStore=()=>{try{return window.sessionStorage;}catch{return null;}};

// Sichtbarer Text der Antwort: Absätze, Links nur auf bekannte Seiten, keine Auszeichnungszeichen.
// Aufzählungen und nummerierte Schritte werden als Listen gesetzt; alles andere bleibt Absatz.
function AssistantText({text,pages}:{text:string;pages:PublicPage[]}){
 const blocks=text.replace(/\*\*|__/g,"").split(/\n{2,}/).map(block=>block.trim()).filter(Boolean);
 const bullet=/^\s*[-•*]\s+/,numbered=/^\s*\d{1,2}[.)]\s+/;
 return <>{blocks.flatMap((block,index)=>{
  const parts:{kind:"p"|"ul"|"ol";lines:string[]}[]=[];
  for(const line of block.split("\n")){
   const kind=bullet.test(line)?"ul":numbered.test(line)?"ol":"p",last=parts.at(-1);
   const value=line.replace(kind==="ul"?bullet:kind==="ol"?numbered:/^$/,"").trim();if(!value)continue;
   if(last&&last.kind===kind)last.lines.push(value);else parts.push({kind,lines:[value]});
  }
  return parts.map((part,order)=>part.kind==="p"?<p key={index+"-"+order}>{guidedText(part.lines.join(" "),pages)}</p>
   :part.kind==="ul"?<ul key={index+"-"+order}>{part.lines.map((line,item)=><li key={item}>{guidedText(line,pages)}</li>)}</ul>
   :<ol key={index+"-"+order}>{part.lines.map((line,item)=><li key={item}>{guidedText(line,pages)}</li>)}</ol>);
 })}</>;
}

// Verlauf für den Server: abgeschlossene Beiträge, jüngste zuerst begrenzt. Ein Briefing reist als Block mit,
// damit eine spätere Ergänzung darauf aufbauen kann. Der Server begrenzt und bereinigt erneut.
export function clientHistory(turns:{role:"user"|"assistant";text:string;briefing?:BriefingDTO}[]):ChatMessageDTO[]{
 return turns.filter(turn=>turn.text.trim()||turn.briefing).slice(-16).map(turn=>({role:turn.role,content:turn.briefing?`${turn.text}\n\n\`\`\`briefing\n${JSON.stringify(turn.briefing.data)}\n\`\`\``:turn.text}));
}

/** Wartezeit in Worten: unter anderthalb Minuten in Sekunden, darüber in Minuten. */
function waitText(state:StateCopy,seconds:number){
 return seconds<=90?state.limitedSeconds.replace("{n}",String(Math.max(1,seconds))):state.limitedMinutes.replace("{n}",String(Math.ceil(seconds/60)));
}

function ServerOrientationChat({locale,pagePath,pages,onActivityChange,onUnavailable,resend}:OrientationProps&{onUnavailable:(question:string)=>void;resend?:string}){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify";const text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};const state=stateCopy[locale];
 const [draft,setDraftState]=useState("");const [turns,setTurns]=useState<Turn[]>([]);const [phase,setPhase]=useState<ChatPhase>("idle");
 // Wartezeit nach einer Mengenbegrenzung: angezeigte Sekunden und ob schon wieder gesendet werden darf.
 const [wait,setWait]=useState<{seconds:number;until:number}|null>(null);const [waiting,setWaiting]=useState(false);
 const turnsRef=useRef<Turn[]>([]);const draftRef=useRef("");const conversation=useRef<string|null>(null);const controller=useRef<AbortController|null>(null);
 const pending=useRef("");const sequence=useRef(0);const mounted=useRef(true);const exchanged=useRef(false);
 // Laufnummer: ein neues Gespräch macht den Ausgang einer noch laufenden Anfrage gegenstandslos.
 const run=useRef(0);const sentAt=useRef(0);const restored=useRef(false);
 const composerInput=useRef<HTMLTextAreaElement>(null);const scroller=useRef<HTMLDivElement>(null);const pinned=useRef(true);
 const busy=phase==="sending"||phase==="streaming";
 const update=useCallback((next:Turn[])=>{turnsRef.current=next;setTurns(next);},[]);
 const setDraft=useCallback((next:string)=>{draftRef.current=next;setDraftState(next);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;run.current++;controller.current?.abort();};},[]);
 // Hoehe der Fusszone (Eingabe + Hinweis) als --ca-fuss an der Wurzel: der Verlauf laeuft unter der Eingabe hindurch
 // und haelt unten genau diesen Abstand. Beobachtet werden alle Teile der Fusszone und die Flaeche selbst, auch solange
 // sie nicht angezeigt werden: auf dem Handy startet das Gespraech eingeklappt, die Teile haben dann keine Hoehe. Wer nur
 // die beim Start sichtbaren Teile beobachtet, misst dort dauerhaft 0 px, und die Eingabe liegt ueber dem Verlauf.
 // Ohne Messwert (alles ausgeblendet) bleibt die Angabe weg, dann gilt der Vorgabewert des Stylesheets.
 useEffect(()=>{const node=scroller.current?.parentElement;if(!node||typeof ResizeObserver==='undefined')return;
  const parts=()=>[...node.children].filter(c=>c!==scroller.current) as HTMLElement[];
  const measure=()=>{const h=parts().filter(c=>c.offsetHeight>1).reduce((sum,c)=>sum+c.offsetHeight+parseFloat(getComputedStyle(c).marginTop||'0'),0);if(h>0)node.style.setProperty('--ca-fuss',Math.round(h)+'px');else node.style.removeProperty('--ca-fuss');};
  const observer=new ResizeObserver(measure);observer.observe(node);parts().forEach(c=>observer.observe(c));measure();return()=>observer.disconnect();},[phase]);
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 // Während die Antwort wächst, bleibt das Ende im Blick – außer der Besucher hat nach oben geblättert.
 // Dem Gespräch folgen, aber nie über den Anfang der letzten eigenen Nachricht hinaus: sie bleibt ganz sichtbar.
 useEffect(()=>{
  const node=scroller.current;if(!node||!pinned.current)return;
  const own=node.querySelectorAll<HTMLElement>(".orientation-message.role-user"),last=own[own.length-1];
  const bottom=node.scrollHeight-node.clientHeight;
  const top=last?node.scrollTop+last.getBoundingClientRect().top-node.getBoundingClientRect().top-24:bottom;
  node.scrollTop=Math.max(0,Math.min(bottom,top));
 },[turns,phase]);
 useAutoGrow(composerInput,draft);
 const nextId=(role:string)=>`${role}-${++sequence.current}`;

 async function send(value:string,options:{retry?:boolean}={}){
  const message=value.trim();if(!message||controller.current)return;
  const base=options.retry?turnsRef.current:[...turnsRef.current,{id:nextId("user"),role:"user" as const,text:message,state:"done" as const}];
  const answerId=nextId("assistant"),current=++run.current;
  pending.current=message;pinned.current=true;sentAt.current=Date.now();update(base);setPhase("sending");setWait(null);
  const abort=new AbortController();controller.current=abort;
  const live=()=>mounted.current&&run.current===current;
  const outcome=await streamChat({message,locale,pagePath,conversationId:conversation.current,history:clientHistory(base.slice(0,-1))},{
   onStart:id=>{if(!live())return;conversation.current=id;exchanged.current=true;},
   onText:full=>{if(!live())return;setPhase("streaming");update([...base,{id:answerId,role:"assistant",text:full,state:"streaming"}]);}
  },{signal:abort.signal});
  if(!live())return;
  controller.current=null;
  if("conversationId" in outcome&&outcome.conversationId)conversation.current=outcome.conversationId;
  const now=Date.now(),settled=settleTurn({base,message,answerId,draft:draftRef.current,exchanged:exchanged.current},outcome,now);
  exchanged.current=settled.exchanged;pending.current=settled.pending;
  update(settled.turns);if(settled.draft!==draftRef.current)setDraft(settled.draft);setPhase(settled.phase);
  if(settled.retryAt){setWait({seconds:Math.ceil((settled.retryAt-now)/1000),until:settled.retryAt});setWaiting(true);}
  if(settled.unavailable){onUnavailable(message);return;}
  if(document.activeElement===document.body&&composerInput.current?.offsetParent!==null)composerInput.current?.focus();
 }
 // Gespräch, Entwurf und Konversation liegen im Sitzungsspeicher: Sprachwechsel, Seitenwechsel und Neuladen löschen sie nicht.
 useLayoutEffect(()=>{
  const stored=loadChat(sessionStore(),site,Date.now());
  if(stored){
   conversation.current=stored.conversationId;exchanged.current=stored.exchanged;pending.current=stored.pending;
   update(stored.turns);setDraft(stored.draft);setPhase(stored.phase);
  }
  restored.current=true;
  if(resend){const last=turnsRef.current.at(-1);void send(resend,{retry:last?.role==="user"&&last.text===resend.trim()});}
  // Nur beim Einhängen: der Schlüssel der Komponente wechselt mit Marke und Sprache.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  if(!restored.current)return;
  saveChat(sessionStore(),site,{turns,draft,conversationId:conversation.current,exchanged:exchanged.current,pending:pending.current,phase},Date.now());
 },[turns,draft,phase,site]);
 // Nach Ablauf der Wartezeit ist „Erneut versuchen" wieder frei.
 useEffect(()=>{
  if(!wait)return;const left=wait.until-Date.now();
  if(left<=0){setWaiting(false);return;}
  const timer=window.setTimeout(()=>setWaiting(false),left);return()=>window.clearTimeout(timer);
 },[wait]);
 function submit(event:FormEvent){event.preventDefault();const value=draft.trim();if(!value||busy||value.length>MESSAGE_LIMIT||(phase==="limited"&&waiting))return;setDraft("");void send(value);}
 function onKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}
 // Der zweite Klick eines Doppelklicks auf „Senden" trifft diesen Schalter: kurz nach dem Absenden zählt er nicht.
 function stop(){if(stopAllowed(sentAt.current,Date.now()))controller.current?.abort();}
 function restart(){run.current++;controller.current?.abort();controller.current=null;conversation.current=null;pending.current="";exchanged.current=false;update([]);setPhase("idle");setWait(null);setDraft("");composerInput.current?.focus();}
 const users=turns.filter(turn=>turn.role==="user");
 const latestBriefing=[...turns].reverse().find(turn=>turn.briefing)?.briefing;
 const namedService=turns.some(turn=>turn.role==="assistant"&&/\]\(\//.test(turn.text));
 const step=latestBriefing?2:namedService?1:0;
 const problem=phase==="failed"||phase==="limited"||phase==="rejected"||phase==="halted";
 const problemText=phase==="limited"?waitText(state,wait?.seconds??60):phase==="rejected"?state.rejected:phase==="halted"?state.stopped:state.failed;
 return <section className="public-orientation" aria-label={text.title} data-orientation-mode="guided" data-phase={phase}>
  <div className="orientation-content" ref={scroller} onScroll={event=>{const node=event.currentTarget;pinned.current=node.scrollHeight-node.scrollTop-node.clientHeight<48;}}>
  <OrientationIntro title={text.title} intro={text.intro}/>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>{turns.map(turn=><article className={"orientation-message role-"+turn.role} data-state={turn.state} key={turn.id}><strong>{turn.role==="user"?text.you:text.assistant}</strong>{turn.role==="assistant"?<AssistantText text={turn.text} pages={pages}/>:<p>{turn.text}</p>}{turn.state==="stopped"&&<small className="orientation-message-state">{state.stopped}</small>}</article>)}
   {phase==="sending"&&<article className="orientation-message role-assistant orientation-thinking"><strong>{text.assistant}</strong><p><span className="orientation-dots" aria-hidden="true"><i/><i/><i/></span><span className="visually-hidden">{state.thinking}</span></p></article>}
  </div>
  {problem&&<div className="orientation-problem" role={phase==="halted"?"status":"alert"} data-problem={phase}><p>{problemText}</p><div className="orientation-problem-actions">{phase!=="rejected"&&<button type="button" className="outline-button" disabled={phase==="limited"&&waiting} onClick={()=>void send(pending.current,{retry:true})}>{phase==="halted"?state.resend:state.retry}</button>}{phase!=="halted"&&<SiteLink className="outline-button" href="/kontakt">{state.contact} <Zeichen name="pfeil" groesse={18}/></SiteLink>}</div></div>}
  {users.length>0&&!busy&&<OrientationJourney locale={locale} site={site} step={step}/>}
  {site==="nexify"&&latestBriefing&&<ProjectBriefing locale={locale} questions={users.map(turn=>turn.text)} prepared={latestBriefing.text}/>}
  {turns.length===0&&!busy&&<OrientationStarters locale={locale} site={site} label={text.label} chosen={draft} onChoose={seed=>{setDraft(seed);composerInput.current?.focus();}}/>}
  {turns.length===0&&!busy&&<OrientationJourney locale={locale} site={site} step={-1} quiet/>}
  {turns.length>0&&!busy&&<div className="orientation-followup">{site==="nexify"&&!latestBriefing&&users.length>=2&&!problem&&<button type="button" className="outline-button" onClick={()=>void send(state.briefRequest)}>{state.brief}</button>}<button type="button" className="text-button orientation-restart" onClick={restart}>{state.restart}</button></div>}
  </div>
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={composerInput} id="orientation-message" maxLength={MESSAGE_LIMIT} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder={turns.length?state.reply:text.label} aria-describedby="orientation-keys" enterKeyHint="send" required/><span id="orientation-keys" className="visually-hidden">{state.keys}</span><div className="orientation-composer-actions">{draft.length>=MESSAGE_LIMIT-100&&<span className="orientation-counter" aria-live="polite">{draft.length}/{MESSAGE_LIMIT} <span className="visually-hidden">{state.counter}</span></span>}{busy?<button key="stop" type="button" className="outline-button" data-testid="chat-stop" onClick={stop}>{text.stop}</button>:<button key="send" className="primary-button" data-testid="chat-send" disabled={!draft.trim()||(phase==="limited"&&waiting)} aria-label={text.send}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button>}</div></form>
  <p className="connection-note orientation-status" role="status">{busy?state.thinking:""}</p><p className="connection-note"><ComposerNote locale={locale} site={site} pages={pages}>{text.privacy}</ComposerNote></p>
 </section>;
}

// Zwei Aufgaben: die Orientierung des eigenständigen Standes (ohne Server) und der Rückfall, wenn der
// Server den Chat ausdrücklich als nicht angebunden meldet. Im Rückfall bleibt die Nachricht des Besuchers
// stehen; es gibt eine Aussage, den Weg zum Kontaktformular mit übernommenem Text und den Rückweg.
function StaticOrientationChat({locale,pagePath,pages,onActivityChange,unavailable,initialQuestion,onRetry}:FallbackProps){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify",text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})},state=stateCopy[locale];
 const [draft,setDraft]=useState(""),[error,setError]=useState(false),[notice,setNotice]=useState("");
 // Beim Rückfall werden zur bereits gestellten Frage passende Seiten der Website gezeigt.
 const [messages,setMessages]=useState<{question:string;answer:StaticGuidance|null}[]>(()=>{
  const question=initialQuestion?.trim();if(!question)return [];
  try{return [{question,answer:staticOrientation({locale,pagePath,question,pages,previousQuestions:[]})}];}catch{return [{question,answer:null}];}
 });
 const input=useRef<HTMLTextAreaElement>(null),latest=useRef<HTMLElement|null>(null);
 useEffect(()=>{onActivityChange?.(false);},[onActivityChange]);
 const firstLocale=useRef(locale);
 useEffect(()=>{if(firstLocale.current===locale)return;firstLocale.current=locale;setMessages([]);setError(false);},[locale]);
 useAutoGrow(input,draft);
 useEffect(()=>{if(!messages.length||unavailable)return;latest.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages,unavailable]);
 // Im Rückfall verschwindet das Eingabefeld: der Fokus geht auf die Aussage mit den beiden Wegen, nicht ins Leere.
 const statement=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(unavailable&&(document.activeElement===document.body||document.activeElement===null))statement.current?.focus({preventScroll:true});},[unavailable]);
 function submit(event:FormEvent){
  event.preventDefault();const question=draft.trim();if(!question)return;
  try{const answer=staticOrientation({locale,pagePath,question,pages,previousQuestions:messages.map(message=>message.question)});setMessages(previous=>[...previous.slice(-5),{question,answer}]);setDraft("");setError(false);input.current?.focus();}
  catch{setError(true);}
 }
 // Der Text der eigenen Nachricht geht auf diesem Gerät ins Kontaktformular; gesendet wird erst dort.
 function transfer(event:MouseEvent<HTMLAnchorElement>){
  const value=messages.map(message=>message.question).join("\n\n");
  try{if(!saveOracleBrief(sessionStorage,value))throw new Error("invalid_brief");}
  catch{event.preventDefault();setNotice(briefingCopy[locale].fallback);}
 }
 if(unavailable)return <section className="public-orientation" aria-label={text.title} data-orientation-mode="fallback">
  <div className="orientation-content">
  <OrientationIntro title={text.title} intro={text.intro}/>
  <div className="orientation-problem orientation-unavailable" role="status" tabIndex={-1} ref={statement}><p>{state.unavailable}</p><div className="orientation-problem-actions"><SiteLink className="primary-button" href="/kontakt" data-testid="chat-fallback-contact" onClick={transfer}>{state.contactWithMessage} <Zeichen name="pfeil" groesse={18}/></SiteLink>{onRetry&&<button type="button" className="outline-button" data-testid="chat-fallback-retry" onClick={onRetry}>{state.retry}</button>}</div>{notice&&<p className="orientation-brief-notice" role="status">{notice}</p>}</div>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map((message,index)=><article className="orientation-message role-user" key={index}><strong>{text.you}</strong><p>{message.question}</p></article>)}</div>
  {messages.some(message=>message.answer?.cards.length)&&<nav className="orientation-page-results" aria-label={state.pages}><p className="orientation-message-state">{state.pages}</p>{(messages.at(-1)?.answer?.cards??[]).map((card,cardIndex)=><SiteLink className="orientation-page-link" key={card.path} href={card.path}><span className="orientation-page-index" aria-hidden="true">0{cardIndex+1}</span><span className="orientation-page-copy"><strong>{card.title}</strong><small>{state.openPage}</small></span><span className="orientation-page-arrow" aria-hidden="true"><Zeichen name="pfeil" groesse={18}/></span></SiteLink>)}</nav>}
  </div>
  <p className="connection-note"><ComposerNote locale={locale} site={site} pages={pages}>{text.privacy}</ComposerNote></p>
 </section>;
 return <section className="public-orientation" aria-label={text.title} data-orientation-mode="local-public-pages">
  <div className="orientation-content">
  <OrientationIntro title={text.title} intro={text.intro}/>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map((message,index)=><div key={index}>
   <article className="orientation-message role-user"><strong>{text.you}</strong><p>{message.question}</p></article>
   {message.answer&&<article className="orientation-message role-assistant" ref={index===messages.length-1?latest:undefined}><strong>{text.assistant}</strong><OrientationAnswer text={message.answer.text} locale={locale}/><div className="orientation-page-results">{message.answer.cards.map((card,cardIndex)=><SiteLink className="orientation-page-link" key={card.path} href={card.path}><span className="orientation-page-index" aria-hidden="true">0{cardIndex+1}</span><span className="orientation-page-copy"><strong>{card.title}</strong><small>{card.summary}</small></span><span className="orientation-page-arrow" aria-hidden="true"><Zeichen name="pfeil" groesse={18}/></span><span className="visually-hidden"> · {state.openPage}</span></SiteLink>)}</div></article>}
  </div>)}</div>
  {messages.length>0&&<OrientationJourney locale={locale} site={site}/>}
  {site==="nexify"&&messages.length>0&&<ProjectBriefing locale={locale} questions={messages.map(message=>message.question)}/>}
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<OrientationStarters locale={locale} site={site} label={text.label} chosen={draft} onChoose={seed=>{setDraft(seed);input.current?.focus();}}/>}
  {messages.length===0&&<OrientationJourney locale={locale} site={site} step={-1} quiet/>}
  </div>
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={input} id="orientation-message" maxLength={1000} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.label} required/><div className="orientation-composer-actions"><button className="primary-button" disabled={!draft.trim()} aria-label={text.send}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button></div></form>
  <p className="connection-note">{site==='nexify'&&<span className="orientation-mode-note">{staticModeLabel[locale]}</span>}<ComposerNote locale={locale} site={site} pages={pages}>{text.privacy}</ComposerNote></p>
 </section>;
}
