"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, dateTime, money, type ApiError } from "./api";

type Settings = { markup_percent: string; shipping_cents: number; vat_percent: string; updated_at?: string; revolut_mode: string; webhook_registered: boolean };
type Run = { id: string; status: string; environment: string; started_at: string; finished_at?: string; error?: string; counts?: Record<string, number> };

export default function AdminShop() {
  const [settings, setSettings] = useState<Settings | null>(null), [denied, setDenied] = useState(false), [markup, setMarkup] = useState(""), [shipping, setShipping] = useState("");
  const [runs, setRuns] = useState<Run[]>([]), [active, setActive] = useState(0), [message, setMessage] = useState(""), [error, setError] = useState("");
  const loadRuns = () => api<{ runs: Run[]; active_products: number }>("/api/admin/import").then(d => { setRuns(d.runs); setActive(d.active_products); }).catch(() => undefined);
  useEffect(() => {
    api<Settings>("/api/admin/settings").then(s => { setSettings(s); setMarkup(s.markup_percent); setShipping((s.shipping_cents / 100).toFixed(2).replace(".", ",")); void loadRuns(); }).catch((e: ApiError) => e.status === 403 ? setDenied(true) : setError("Einstellungen nicht erreichbar."));
  }, []);
  useEffect(() => { if (!runs.some(r => r.status === "running")) return; const t = setTimeout(() => void loadRuns(), 4000); return () => clearTimeout(t); }, [runs]);
  if (denied) return <div className="tk-empty" data-testid="admin-denied"><h2>Kein Zugriff</h2><p>Dieser Bereich ist nur für Administratoren.</p><SiteLink href="/anmelden" className="content-action-link">Anmelden</SiteLink></div>;
  if (!settings) return error ? <p role="alert" className="tk-alert">{error}</p> : <p role="status">Einstellungen werden geladen …</p>;
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setError("");
    const cents = Math.round(Number(shipping.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) { setError("Bitte einen gültigen Versandpreis eingeben."); return; }
    try { const s = await api<Settings>("/api/admin/settings", { method: "PUT", json: { markup_percent: markup, shipping_cents: cents } }); setSettings(s); setMarkup(s.markup_percent); setMessage("Gespeichert. Alle Produktpreise werden ab sofort mit dem neuen Aufschlag berechnet."); }
    catch { setError("Aufschlag ungültig: bitte eine Zahl zwischen 0 und 500 mit höchstens zwei Nachkommastellen."); }
  }
  async function start(environment: string) {
    setError("");
    try { await api("/api/admin/import", { method: "POST", json: { environment } }); await loadRuns(); } catch (e) { setError((e as ApiError).error === "import_running" ? "Ein Import läuft bereits." : "Import konnte nicht gestartet werden."); }
  }
  async function webhook() { try { await api("/api/admin/revolut/webhook", { method: "POST", json: {} }); setSettings({ ...settings!, webhook_registered: true }); } catch (e) { setError("Webhook-Registrierung fehlgeschlagen: " + (e as ApiError).error); } }
  return <div className="tk-admin" data-testid="admin-shop">
    <form className="tk-form" onSubmit={save} data-testid="admin-settings-form"><h2>Preise</h2>
      <p className="tk-note">Verkaufspreis = Einkaufspreis × (1 + Aufschlag) × (1 + {settings.vat_percent} % MwSt.). Beispiel: 10,00 € Einkauf → {money(Math.round(1000 * (1 + Number(markup.replace(",", ".")) / 100) * (1 + Number(settings.vat_percent) / 100)) || 0)}.</p>
      <div className="tk-form-grid"><div className="tk-field"><label htmlFor="adm-markup">Aufschlag in %</label><input id="adm-markup" inputMode="decimal" value={markup} onChange={e => setMarkup(e.target.value)} data-testid="admin-markup-input" /></div>
        <div className="tk-field"><label htmlFor="adm-ship">Versandkosten je Bestellung in €</label><input id="adm-ship" inputMode="decimal" value={shipping} onChange={e => setShipping(e.target.value)} data-testid="admin-shipping-input" /></div></div>
      <button className="primary-button" type="submit" data-testid="admin-settings-save">Speichern</button>
      {settings.updated_at && <p className="tk-meta">Zuletzt geändert: {dateTime(settings.updated_at)}</p>}</form>
    <section className="tk-form" data-testid="admin-import"><h2>BigBuy-Import „Auto &amp; Motorrad“</h2><p className="tk-meta" data-testid="admin-active-products">Aktive Produkte im Shop: {active}</p>
      <div className="tk-actions"><button className="primary-button" onClick={() => void start("ftp")} data-testid="admin-import-ftp">Sync über FTP (CSV)</button><button className="outline-button" onClick={() => void start("production")} data-testid="admin-import-start">Import über API</button><button className="outline-button" onClick={() => void start("sandbox")} data-testid="admin-import-sandbox">Testimport (BigBuy-Sandbox)</button></div>
      <table className="tk-table" data-testid="admin-import-runs"><thead><tr><th>Start</th><th>Umgebung</th><th>Status</th><th>Ergebnis</th></tr></thead><tbody>{runs.map(r => <tr key={r.id} data-testid={"admin-import-run-" + r.id}><td>{dateTime(r.started_at)}</td><td>{r.environment}</td><td>{r.status === "running" ? "läuft" : r.status === "done" ? "fertig" : "fehlgeschlagen"}</td><td>{r.counts ? `${r.counts.stored} gespeichert · ${r.counts.created} neu · ${r.counts.updated} aktualisiert · ${r.counts.deactivated} deaktiviert` : r.error ? `Fehler: ${r.error} – bisheriger Katalog bleibt erhalten` : ""}</td></tr>)}</tbody></table></section>
    <section className="tk-form"><h2>Zahlung (Revolut)</h2><p data-testid="admin-revolut-mode">Modus: {settings.revolut_mode === "live" ? "LIVE (echte Zahlungen)" : "Sandbox (Testzahlungen)"} · Webhook {settings.webhook_registered ? "registriert" : "noch nicht registriert"}</p>
      {!settings.webhook_registered && <button className="outline-button" onClick={() => void webhook()} data-testid="admin-webhook-register">Webhook bei Revolut registrieren</button>}</section>
    {message && <p role="status" data-testid="admin-message">{message}</p>}
    {error && <p role="alert" className="tk-alert" data-testid="admin-error">{error}</p>}
  </div>;
}
