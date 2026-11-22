"use client";
import { useEffect, useState } from "react";
import {ActionButton} from '../ActionControl';
import {HcArrow} from '../HcArrow';
import { SiteLink } from "../Router";
import { api, type ApiError, type Workshop as DirectoryWorkshop } from "./api";

// Standard-Landingpage: Verzeichnisfelder plus öffentliches Profil aus OpenStreetMap (ODbL). Kontakt-E-Mails liefert die API nie aus.
type Workshop = DirectoryWorkshop & { category?: string; services?: string[]; brands?: string[]; source?: string; source_url?: string; license?: string; data_as_of?: string };

type Form = { name: string; email: string; phone: string; vehicle: string; message: string; consent: boolean };
const EMPTY: Form = { name: "", email: "", phone: "", vehicle: "", message: "", consent: false };
const MSG: Record<string, string> = { required: "Bitte füllen Sie dieses Feld aus.", invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", too_short: "Bitte beschreiben Sie Ihr Anliegen etwas genauer (mindestens 10 Zeichen)." };

// Antwort von POST /api/workshops/{id}/requests (201). Ältere Backends liefern nur id und status.
type RequestReceipt = { id: string; status: string; workshop_id?: string; state?: string; workshop_notified?: boolean; workshop_partner?: boolean; appointment?: boolean; message?: string };
const RECEIPT_FALLBACK = "Ihre Anfrage ist bei TEILEKLAR eingegangen. Die Werkstatt wurde noch nicht benachrichtigt.";
const NOT_PARTNER_FALLBACK = "Diese Werkstatt nimmt über TEILEKLAR derzeit keine Anfragen an.";

/** Kalendertag JJJJ-MM-TT als TT.MM.JJJJ – ohne Date-Umrechnung (kein UTC-Vortag); Unbekanntes bleibt Rohtext. */
export function asOfDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= days[mo - 1] ? `${m[3]}.${m[2]}.${m[1]}` : value;
}

function validate(f: Form) {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "required";
  if (!f.email.trim()) e.email = "required"; else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "invalid";
  if (!f.message.trim()) e.message = "required"; else if (f.message.trim().length < 10) e.message = "too_short";
  if (!f.consent) e.consent = "required";
  return e;
}

function RequestForm({ workshop }: { workshop: Workshop }) {
  const [form, setForm] = useState(EMPTY), [errors, setErrors] = useState<Record<string, string>>({}), [sent, setSent] = useState<RequestReceipt | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [refused, setRefused] = useState<string | null>(null);
  const field = (key: keyof Form, label: string, multiline = false) => <div className="tk-field is-wide"><label htmlFor={"wr-" + key}>{label}</label>
    {multiline ? <textarea id={"wr-" + key} rows={4} value={form[key] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? "wr-" + key + "-error" : undefined} data-testid={"workshop-request-" + key} />
      : <input id={"wr-" + key} type={key === "email" ? "email" : "text"} value={form[key] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? "wr-" + key + "-error" : undefined} data-testid={"workshop-request-" + key} />}
    {errors[key] && <p id={"wr-" + key + "-error"} role="alert" className="tk-field-error" data-testid={"workshop-request-" + key + "-error"}>{MSG[errors[key]]}</p>}</div>;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setFailed(false);
    const local = validate(form); setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try { setSent(await api("/api/workshops/" + workshop.id + "/requests", { method: "POST", json: form })); }
    catch (e) {
      const err = e as ApiError;
      // 409 workshop_not_partner: Diese Werkstatt nimmt über TEILEKLAR keine Anfragen an. Der Grund kommt vom Server;
      // das Formular wird danach nicht erneut angeboten, weil ein zweiter Versuch dasselbe Ergebnis hätte.
      if (err.status === 409 && err.error === "workshop_not_partner") setRefused(typeof err.body?.message === "string" && err.body.message.trim() ? err.body.message : NOT_PARTNER_FALLBACK);
      else if (err.fields) setErrors(err.fields); else setFailed(true);
    }
    finally { setBusy(false); }
  }
  // Die Aussage über den Stand der Anfrage kommt vom Server (message). Fehlt sie (älteres Backend), steht ein neutraler Satz,
  // der weder eine Benachrichtigung der Werkstatt noch einen Termin behauptet.
  if (sent) return <div className="tk-success" role="status" data-testid="workshop-request-success"><h3>{sent.status}</h3><p data-testid="workshop-request-message">{typeof sent.message === "string" && sent.message.trim() ? sent.message : RECEIPT_FALLBACK}</p>{sent.id && <p className="tk-note" data-testid="workshop-request-id">Vorgang {sent.id}</p>}</div>;
  if (refused) return <div className="tk-alert" role="alert" data-testid="workshop-request-refused"><p>{refused}</p></div>;
  return <form className="tk-form" noValidate onSubmit={submit} data-testid="workshop-request-form"><h3>Anfrage an diese Werkstatt</h3>
    <div className="tk-form-grid">{field("name", "Ihr Name")}{field("email", "E-Mail-Adresse")}{field("phone", "Telefon (optional)")}{field("vehicle", "Fahrzeug (optional, z. B. Marke, Modell, Baujahr)")}{field("message", "Ihr Anliegen", true)}</div>
    <label className="tk-terms"><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} aria-describedby={errors.consent ? "wr-consent-error" : undefined} data-testid="workshop-request-consent" /><span>Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Anfrage gespeichert werden.</span></label>
    {errors.consent && <p id="wr-consent-error" role="alert" className="tk-field-error" data-testid="workshop-request-consent-error">Bitte bestätigen Sie die Einwilligung.</p>}
    {failed && <p role="alert" className="tk-alert">Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.</p>}
    <ActionButton variant="primary" className="hc-finish-primary" type="submit" disabled={busy} data-testid="workshop-request-submit">Anfrage senden</ActionButton></form>;
}

export default function WorkshopDetail({ id }: { id: string }) {
  const [w, setW] = useState<Workshop | null>(null), [missing, setMissing] = useState(false);
  useEffect(() => { api<Workshop>("/api/workshops/" + encodeURIComponent(id)).then(setW).catch(() => setMissing(true)); }, [id]);
  if (missing) return <div className="tk-empty" data-testid="workshop-missing"><h2>Werkstatt nicht gefunden</h2><SiteLink href="/teileklar/werkstatt" className="hc-text-link">Zur Werkstattsuche<HcArrow/></SiteLink></div>;
  if (!w) return <p role="status">Werkstatt wird geladen …</p>;
  return <div className="tk-ws-detail" data-testid="workshop-detail">
    <div><h2 data-testid="workshop-detail-name">{w.name}</h2><span className="tk-tag" data-testid="workshop-detail-label">{w.kind_label}</span>
      <p className="tk-note">Dieser Eintrag stammt aus einem Werkstattverzeichnis. Die Werkstatt ist kein bestätigter TEILEKLAR-Partner.</p>
      <dl className="tk-facts">
        {(w.street || w.zip || w.city) && <><dt>Adresse</dt><dd data-testid="workshop-detail-address">{[w.street, [w.zip, w.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</dd></>}
        {w.tel && <><dt>Telefon</dt><dd><a href={"tel:" + w.tel} data-testid="workshop-detail-phone">{w.tel}</a></dd></>}
        {w.web && <><dt>Website</dt><dd><a href={w.web} target="_blank" rel="nofollow noopener noreferrer" data-testid="workshop-detail-web">{w.web.replace(/^https?:\/\//, "")}</a></dd></>}
        {w.hours && <><dt>Öffnungszeiten</dt><dd data-testid="workshop-detail-hours">{w.hours}</dd></>}
        {w.category && <><dt>Betriebsart</dt><dd data-testid="workshop-detail-category">{w.category}</dd></>}
        {w.brands?.length ? <><dt>Marken laut Eintrag</dt><dd data-testid="workshop-detail-brands">{w.brands.join(", ")}</dd></> : null}
      </dl>
      {w.services?.length ? <><h3>Leistungen laut Eintrag</h3><ul className="tk-story-list" data-testid="workshop-detail-services">{w.services.map(s => <li key={s}>{s}</li>)}</ul></> : null}
      {w.source === "OpenStreetMap" && <p className="tk-meta" data-testid="workshop-detail-attribution">Daten: © <a href={w.source_url || "https://www.openstreetmap.org/copyright"} target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>, Lizenz <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL 1.0</a>{w.data_as_of ? ", Stand " + asOfDate(w.data_as_of) : ""}. Angaben können sich geändert haben – im Zweifel bei der Werkstatt nachfragen.</p>}
    </div>
    <RequestForm workshop={w} />
  </div>;
}
