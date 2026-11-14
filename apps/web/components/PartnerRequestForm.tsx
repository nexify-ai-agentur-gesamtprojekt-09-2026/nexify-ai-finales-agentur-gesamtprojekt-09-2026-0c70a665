"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {useUI} from "./Workspace";
import {ActionButton} from "./ActionControl";
import "./PartnerRequestForm.css";

// Real partner onboarding form: form -> /api/partner/requests -> SQLite -> UI readback via
// /api/partner/requests/mine. Storage only; it never claims receipt, delivery or approval.
// Authorised reception is a separate, role/tenant-protected channel (fail-closed elsewhere).
//
// Idempotent, duplicate-safe retry contract (preview/fixture gateway; production has no proven
// /api runtime binding yet, so this is explicitly not a production acceptance):
//  - The pending attempt (tenant + locale + payload + idempotency key) is one inseparable object.
//  - An unknown outcome (timeout / network / 503 / lost response / session change / remount) stays
//    UNKNOWN and is persisted; it is never silently lost and never shown as "not saved".
//  - A retry re-sends the SAME frozen key + payload, so a committed-but-lost first POST cannot be
//    duplicated. Editing inputs while an attempt is unresolved is a separate draft: the unresolved
//    attempt must be resolved first and never mints a new key.
//  - Receipt (200) is accepted only when the full stored contract matches (tenant, stored, status,
//    no delivery/receipt claim); it proves storage, never delivery or authorised reception.
const INTAKE_TENANT="teileklar-partner-intake";
const PENDING_STORAGE_KEY="nx-partner-pending-v1";
const SUBMIT_TIMEOUT_MS=8000;
const RECEIPT_TIMEOUT_MS=6000;
type Stored={id:string;tenant:string;status:string;created:number};
type Payload={tenant:string;company:string;contact:string;email:string;message:string;locale:string};
type Pending={key:string;signature:string;payload:Payload};
type Receipt={id?:unknown;tenant?:unknown;status?:unknown;stored?:unknown;received?:unknown;approved?:unknown;delivered?:unknown};
type FormState="idle"|"sending"|"ok"|"error"|"unknown"|"conflict";
const words={
 de:{title:"Werkstattpartner werden",intro:"Sende dein Interesse als Werkstatt. Deine Angaben werden gespeichert und zur Prüfung vorgemerkt – das ist keine Empfangs-, Zustell- oder Freigabebestätigung.",company:"Betrieb / Firma",contact:"Ansprechpartner",email:"E-Mail",message:"Dein Anliegen",submit:"Anfrage speichern",retry:"Status erneut prüfen",sending:"Wird gespeichert …",checking:"Status wird geprüft …",ok:"Gespeichert und zur Prüfung vorgemerkt (noch nicht empfangen/geprüft).",ref:"Referenz",mine:"Deine gespeicherten Anfragen",status:"Status",none:"Noch keine gespeicherten Anfragen.",error:"Nicht gespeichert. Bitte prüfe deine Angaben und versuche es erneut.",unknown:"Status unklar: Deine Anfrage wurde möglicherweise schon gespeichert. Es wurde nichts doppelt angelegt. Tippe auf „Status erneut prüfen“, um den gleichen Vorgang sicher aufzulösen – ein erneuter Versuch erzeugt kein Duplikat.",conflict:"Für diesen Vorgang liegen bereits andere Angaben gespeichert vor. Es gilt die zuerst gespeicherte Fassung; es wurde nichts doppelt angelegt. Geänderte Angaben sende bitte als neue Anfrage.",nosession:"Verbindung wird vorbereitet … bitte kurz warten.",recipient:"Der berechtigte Empfang erfolgt getrennt über den geschützten Partnerzugang (Rolle und Tenant); hier wird nichts freigeschaltet."},
 nl:{title:"Werkplaatspartner worden",intro:"Stuur je interesse als werkplaats. Je gegevens worden opgeslagen en voorgemerkt voor toetsing – dit is geen ontvangst-, bezorg- of goedkeuringsbevestiging.",company:"Bedrijf",contact:"Contactpersoon",email:"E-mail",message:"Je vraag",submit:"Aanvraag opslaan",retry:"Status opnieuw controleren",sending:"Wordt opgeslagen …",checking:"Status wordt gecontroleerd …",ok:"Opgeslagen en voorgemerkt voor toetsing (nog niet ontvangen/getoetst).",ref:"Referentie",mine:"Je opgeslagen aanvragen",status:"Status",none:"Nog geen opgeslagen aanvragen.",error:"Niet opgeslagen. Controleer je gegevens en probeer opnieuw.",unknown:"Status onduidelijk: je aanvraag is mogelijk al opgeslagen. Er is niets dubbel aangemaakt. Tik op „Status opnieuw controleren“ om dezelfde actie veilig af te ronden – opnieuw proberen maakt geen duplicaat.",conflict:"Voor deze actie zijn al andere gegevens opgeslagen. De eerst opgeslagen versie geldt; er is niets dubbel aangemaakt. Stuur gewijzigde gegevens als nieuwe aanvraag.",nosession:"Verbinding wordt voorbereid … even geduld.",recipient:"De bevoegde ontvangst verloopt apart via de beveiligde partnertoegang (rol en tenant); hier wordt niets vrijgegeven."},
 fr:{title:"Devenir garage partenaire",intro:"Envoie ton intérêt en tant que garage. Tes informations sont enregistrées et notées pour vérification – ce n’est pas une confirmation de réception, de livraison ou d’approbation.",company:"Établissement",contact:"Contact",email:"E-mail",message:"Ta demande",submit:"Enregistrer la demande",retry:"Revérifier le statut",sending:"Enregistrement…",checking:"Vérification du statut…",ok:"Enregistré et noté pour vérification (pas encore reçu/vérifié).",ref:"Référence",mine:"Tes demandes enregistrées",status:"Statut",none:"Aucune demande enregistrée.",error:"Non enregistré. Vérifie tes informations et réessaie.",unknown:"Statut incertain : ta demande est peut-être déjà enregistrée. Rien n’a été créé en double. Appuie sur « Revérifier le statut » pour résoudre la même opération en toute sécurité – réessayer ne crée pas de doublon.",conflict:"D’autres informations sont déjà enregistrées pour cette opération. La première version enregistrée fait foi ; rien n’a été créé en double. Envoie les informations modifiées comme nouvelle demande.",nosession:"Connexion en préparation… un instant.",recipient:"La réception autorisée se fait séparément via l’accès partenaire protégé (rôle et tenant) ; rien n’est validé ici."},
 en:{"title": "Become a workshop partner", "intro": "Send your interest as a workshop. Your details are saved and noted for review – this is not a confirmation of receipt, delivery or approval.", "company": "Business", "contact": "Contact", "email": "Email", "message": "Your request", "submit": "Save the request", "sending": "Saving…", "ok": "Saved and noted for review (not yet received/verified).", "ref": "Reference", "mine": "Your saved requests", "status": "Status", "none": "No saved requests.", "error": "Not saved. Check your details and try again.", "nosession": "Sign-in in preparation… one moment.", "recipient": "Authorized receipt happens separately via the protected partner access (role and tenant); nothing is validated here.", "retry": "Re-check status", "checking": "Checking status …", "unknown": "Status unclear: your request may already have been saved. Nothing was created twice. Tap “Re-check status” to resolve the same operation safely – retrying does not create a duplicate.", "conflict": "Other details are already saved for this operation. The first saved version applies; nothing was created twice. Please send changed details as a new request."}
};

function readPending():Pending|null{
 try{
  const raw=typeof window!=="undefined"?window.sessionStorage.getItem(PENDING_STORAGE_KEY):null;
  if(!raw)return null;
  const value=JSON.parse(raw) as Pending;
  if(value&&typeof value.key==="string"&&typeof value.signature==="string"&&value.payload&&value.payload.tenant===INTAKE_TENANT)return value;
 }catch{/* ignore malformed persisted state */}
 return null;
}

async function fetchWithTimeout(input:string,init:RequestInit,ms:number):Promise<Response>{
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),ms);
 try{return await fetch(input,{...init,signal:controller.signal});}
 finally{clearTimeout(timer);}
}

// Full stored contract: storage only, exact intake tenant, no delivery/receipt claim.
function validReceipt(data:Receipt|null):data is Receipt&{id:string}{
 return !!data&&data.tenant===INTAKE_TENANT&&data.stored===true&&data.received===false
  &&data.approved===false&&data.delivered===false&&data.status==="pending_review"
  &&typeof data.id==="string"&&/^[a-f0-9]{32}$/.test(data.id);
}

export default function PartnerRequestForm(){
 const{locale,session}=useUI();
 const t=words[locale as keyof typeof words]||words.de;
 const[state,setState]=useState<FormState>("idle");
 const[reference,setReference]=useState("");
 const[mine,setMine]=useState<Stored[]>([]);
 // The unresolved attempt is one inseparable, persisted object; a retry reuses its frozen key.
 const pendingRef=useRef<Pending|null>(null);
 // Synchronous reentry guard: blocks a double-click before any await resolves.
 const inFlightRef=useRef(false);

 function persistPending(pending:Pending|null){
  pendingRef.current=pending;
  try{
   if(typeof window==="undefined")return;
   if(pending)window.sessionStorage.setItem(PENDING_STORAGE_KEY,JSON.stringify(pending));
   else window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  }catch{/* storage unavailable; in-memory ref still holds the attempt */}
 }

 async function readback(){
  try{const r=await fetch('/api/partner/requests/mine',{cache:'no-store'});if(r.ok){const d=await r.json();if(Array.isArray(d.requests))setMine(d.requests);}}catch{/* ignore readback errors */}
 }

 // Exact receipt for the frozen attempt (same visitor cookie + Idempotency-Key). Never mints a key.
 // 200 + full contract = stored (no delivery); 404 is a point-in-time miss; timeout/network/503/409
 // stay unknown. The backend scopes the receipt to this visitor, so a changed session cannot read a
 // foreign tenant's record (it fail-closes to 404 and we keep the attempt unresolved).
 async function confirmReceipt(pending:Pending):Promise<boolean>{
  if(!session)return false;
  try{
   const r=await fetchWithTimeout('/api/partner/requests/receipt?tenant='+encodeURIComponent(INTAKE_TENANT),
    {cache:'no-store',headers:{'X-CSRF-Token':session.csrf,'Idempotency-Key':pending.key}},RECEIPT_TIMEOUT_MS);
   if(r.status===200){
    const data=await r.json().catch(()=>null) as Receipt|null;
    if(validReceipt(data)){persistPending(null);setReference(data.id);setState("ok");await readback();return true;}
   }
  }catch{/* unknown outcome; keep the frozen attempt */}
  return false;
 }

 // Restore any unresolved attempt after a remount so it is never silently lost.
 useEffect(()=>{
  const restored=readPending();
  if(restored){pendingRef.current=restored;setState(current=>current==="idle"?"unknown":current);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 // On session ready/change, refresh the readback and try to resolve a pending attempt for THIS
 // visitor via the scoped receipt (resolves a committed-but-lost response after reload/session swap).
 useEffect(()=>{
  if(!session)return;
  void readback();
  if(pendingRef.current)void confirmReceipt(pendingRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[session?.csrf]);

 async function resolveAttempt(pending:Pending,isRetry:boolean){
  // A retry first asks the exact receipt: a committed-but-lost first POST resolves without re-sending.
  if(isRetry&&await confirmReceipt(pending))return;
  let response:Response;
  try{
   response=await fetchWithTimeout('/api/partner/requests',
    {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session!.csrf,'Idempotency-Key':pending.key},body:JSON.stringify(pending.payload)},SUBMIT_TIMEOUT_MS);
  }catch{
   // Timeout / network / abort: outcome unknown. Keep the frozen attempt; try the receipt once more.
   if(await confirmReceipt(pending))return;
   setState("unknown");return;
  }
  if(response.status===200){
   const data=await response.json().catch(()=>null) as Receipt|null;
   if(validReceipt(data)){persistPending(null);setReference(data.id);setState("ok");await readback();return;}
   // Ambiguous 200 without a valid contract: do not claim success; resolve via receipt or stay unknown.
   if(await confirmReceipt(pending))return;
   setState("unknown");return;
  }
  if(response.status===422){
   // Server definitively rejected this payload: nothing was stored under this key. Safe to report.
   persistPending(null);setState("error");return;
  }
  if(response.status===409){
   // This key already stored a DIFFERENT payload. The first stored version is authoritative.
   if(await confirmReceipt(pending))return;
   setState("conflict");return;
  }
  // 503 and any other status: unknown. Keep the attempt and try the receipt.
  if(await confirmReceipt(pending))return;
  setState("unknown");
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!session)return;
  if(inFlightRef.current)return; // synchronous double-click guard (before any await)
  inFlightRef.current=true;
  try{
   // An unresolved attempt is resolved FIRST with its own frozen key+payload; the current form edits
   // are a separate draft and are ignored until the pending attempt is cleared. Only a clean slate
   // mints a fresh key for a genuinely new submission.
   let pending=pendingRef.current;
   const isRetry=pending!==null;
   if(!pending){
    const form=new FormData(event.currentTarget);
    const payload:Payload={tenant:INTAKE_TENANT,company:String(form.get('company')||''),contact:String(form.get('contact')||''),email:String(form.get('email')||''),message:String(form.get('message')||''),locale};
    const signature=JSON.stringify([payload.company,payload.contact,payload.email,payload.message,payload.locale]);
    pending={key:crypto.randomUUID(),signature,payload};
   }
   // Persist before the network call so a crash/remount mid-flight cannot lose the attempt.
   persistPending(pending);
   setState("sending");
   await resolveAttempt(pending,isRetry);
  }finally{
   inFlightRef.current=false;
  }
 }

 const hasPending=state==="unknown"||state==="conflict";
 const buttonLabel=state==="sending"?(pendingRef.current?t.checking:t.sending):hasPending?t.retry:t.submit;
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
   <ActionButton variant="primary" className="hc-finish-primary" type="submit" disabled={!session||state==="sending"} data-testid="partner-submit">{buttonLabel}</ActionButton>
  </form>
  {state==="ok"&&<p role="status" data-testid="partner-ok">{t.ok} · {t.ref}: {reference}</p>}
  {state==="error"&&<p role="alert" data-testid="partner-error">{t.error}</p>}
  {state==="unknown"&&<p role="status" data-testid="partner-unknown">{t.unknown}</p>}
  {state==="conflict"&&<p role="alert" data-testid="partner-conflict">{t.conflict}</p>}
  <div className="partner-mine" data-testid="partner-mine">
   <h3>{t.mine}</h3>
   {mine.length===0?<p data-testid="partner-mine-empty">{t.none}</p>
    :<ul>{mine.map(item=><li key={item.id} data-testid={"partner-mine-"+item.id}><strong>{t.ref}:</strong> {item.id} · <strong>{t.status}:</strong> {item.status}</li>)}</ul>}
  </div>
 </section>;
}
