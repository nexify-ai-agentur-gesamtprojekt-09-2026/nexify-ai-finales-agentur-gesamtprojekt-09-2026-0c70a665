"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {useUI} from "./Workspace";
import "./PartnerRequestForm.css";

// Real partner onboarding form: form -> /api/partner/requests -> SQLite -> UI readback via
// /api/partner/requests/mine. Storage only; it never claims receipt, delivery or approval.
// Authorised reception is a separate, role/tenant-protected channel (fail-closed elsewhere).
const INTAKE_TENANT="teileklar-partner-intake";
type Stored={id:string;tenant:string;status:string;created:number};
const words={
 de:{title:"Werkstattpartner werden",intro:"Sende dein Interesse als Werkstatt. Deine Angaben werden gespeichert und zur Prüfung vorgemerkt – das ist keine Empfangs-, Zustell- oder Freigabebestätigung.",company:"Betrieb / Firma",contact:"Ansprechpartner",email:"E-Mail",message:"Dein Anliegen",submit:"Anfrage speichern",sending:"Wird gespeichert …",ok:"Gespeichert und zur Prüfung vorgemerkt (noch nicht empfangen/geprüft).",ref:"Referenz",mine:"Deine gespeicherten Anfragen",status:"Status",none:"Noch keine gespeicherten Anfragen.",error:"Nicht gespeichert. Bitte prüfe deine Angaben und versuche es erneut.",nosession:"Verbindung wird vorbereitet … bitte kurz warten.",recipient:"Der berechtigte Empfang erfolgt getrennt über den geschützten Partnerzugang (Rolle und Tenant); hier wird nichts freigeschaltet."},
 nl:{title:"Werkplaatspartner worden",intro:"Stuur je interesse als werkplaats. Je gegevens worden opgeslagen en voorgemerkt voor toetsing – dit is geen ontvangst-, bezorg- of goedkeuringsbevestiging.",company:"Bedrijf",contact:"Contactpersoon",email:"E-mail",message:"Je vraag",submit:"Aanvraag opslaan",sending:"Wordt opgeslagen …",ok:"Opgeslagen en voorgemerkt voor toetsing (nog niet ontvangen/getoetst).",ref:"Referentie",mine:"Je opgeslagen aanvragen",status:"Status",none:"Nog geen opgeslagen aanvragen.",error:"Niet opgeslagen. Controleer je gegevens en probeer opnieuw.",nosession:"Verbinding wordt voorbereid … even geduld.",recipient:"De bevoegde ontvangst verloopt apart via de beveiligde partnertoegang (rol en tenant); hier wordt niets vrijgegeven."},
 fr:{title:"Devenir garage partenaire",intro:"Envoie ton intérêt en tant que garage. Tes informations sont enregistrées et notées pour vérification – ce n’est pas une confirmation de réception, de livraison ou d’approbation.",company:"Établissement",contact:"Contact",email:"E-mail",message:"Ta demande",submit:"Enregistrer la demande",sending:"Enregistrement…",ok:"Enregistré et noté pour vérification (pas encore reçu/vérifié).",ref:"Référence",mine:"Tes demandes enregistrées",status:"Statut",none:"Aucune demande enregistrée.",error:"Non enregistré. Vérifie tes informations et réessaie.",nosession:"Connexion en préparation… un instant.",recipient:"La réception autorisée se fait séparément via l’accès partenaire protégé (rôle et tenant) ; rien n’est validé ici."}
};

export default function PartnerRequestForm(){
 const{locale,session}=useUI();
 const t=words[locale as keyof typeof words]||words.de;
 const[state,setState]=useState<"idle"|"sending"|"ok"|"error">("idle");
 const[reference,setReference]=useState("");
 const[mine,setMine]=useState<Stored[]>([]);
 // Stable idempotency: unchanged input keeps the same key so a retry cannot create a duplicate.
 const idemKeyRef=useRef<string>("");
 const lastSignatureRef=useRef<string>("");
 async function readback(){
  try{const r=await fetch('/api/partner/requests/mine',{cache:'no-store'});if(r.ok){const d=await r.json();if(Array.isArray(d.requests))setMine(d.requests);}}catch{/* ignore readback errors */}
 }
 useEffect(()=>{if(session)void readback();},[session?.csrf]);
 // Exact receipt for the frozen key (same session + Idempotency-Key). Never creates a new key.
 // 200 = stored (no delivery); 404 may precede a still-running POST; 409/503/network stay unknown.
 async function confirmReceipt(){
  if(!session||!idemKeyRef.current)return false;
  try{
   const r=await fetch('/api/partner/requests/receipt?tenant='+encodeURIComponent(INTAKE_TENANT),{cache:'no-store',headers:{'X-CSRF-Token':session.csrf,'Idempotency-Key':idemKeyRef.current}});
   if(r.status===200){const d=await r.json();if(d&&d.id){setReference(d.id);setState("ok");await readback();return true;}}
  }catch{/* unknown outcome; keep the same frozen key and payload */}
  return false;
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!session){setState("error");return;}
  const form=new FormData(event.currentTarget);
  const payload={
   tenant:INTAKE_TENANT,company:String(form.get('company')||''),contact:String(form.get('contact')||''),email:String(form.get('email')||''),message:String(form.get('message')||''),locale
  };
  // Reuse one idempotency key for unchanged input; a changed input gets a fresh key.
  const signature=JSON.stringify([payload.company,payload.contact,payload.email,payload.message,payload.locale]);
  if(!idemKeyRef.current||signature!==lastSignatureRef.current){idemKeyRef.current=crypto.randomUUID();lastSignatureRef.current=signature;}
  setState("sending");
  try{
   const response=await fetch('/api/partner/requests',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf,'Idempotency-Key':idemKeyRef.current},body:JSON.stringify(payload)});
   if(response.status===409){setState("error");return;}
   if(!response.ok)throw new Error('submit');
   const data=await response.json();
   if(data.status!=='pending_review'||data.stored!==true||data.received!==false)throw new Error('contract');
   setReference(data.id);setState("ok");await readback();
  }catch{
   // Unknown outcome (503/network/session loss or an ambiguous response): ask the exact receipt
   // endpoint with the SAME frozen key before any retry. A deliberate retry re-sends the identical
   // key+payload and cannot create a duplicate; we never guess from /mine or mint a new key on 404.
   if(!await confirmReceipt())setState("error");
  }
 }
 return <section className="partner-form" aria-labelledby="partner-form-title" data-testid="partner-request-form">
  <h2 id="partner-form-title">{t.title}</h2>
  <p className="status-note">{t.intro}</p>
  <p className="partner-recipient-note" data-testid="partner-recipient-note">{t.recipient}</p>
  {!session&&<p role="status" data-testid="partner-nosession">{t.nosession}</p>}
  <form onSubmit={submit} data-testid="partner-form">
   <label>{t.company}<input name="company" required maxLength={160} data-testid="partner-company"/></label>
   <label>{t.contact}<input name="contact" required maxLength={160} data-testid="partner-contact"/></label>
   <label>{t.email}<input name="email" type="email" required maxLength={254} data-testid="partner-email"/></label>
   <label>{t.message}<textarea name="message" required maxLength={2000} rows={4} data-testid="partner-message"/></label>
   <button className="primary-button" type="submit" disabled={!session||state==="sending"} data-testid="partner-submit">{state==="sending"?t.sending:t.submit}</button>
  </form>
  {state==="ok"&&<p role="status" data-testid="partner-ok">{t.ok} · {t.ref}: {reference}</p>}
  {state==="error"&&<p role="alert" data-testid="partner-error">{t.error}</p>}
  <div className="partner-mine" data-testid="partner-mine">
   <h3>{t.mine}</h3>
   {mine.length===0?<p data-testid="partner-mine-empty">{t.none}</p>
    :<ul>{mine.map(item=><li key={item.id} data-testid={"partner-mine-"+item.id}><strong>{t.ref}:</strong> {item.id} · <strong>{t.status}:</strong> {item.status}</li>)}</ul>}
  </div>
 </section>;
}
