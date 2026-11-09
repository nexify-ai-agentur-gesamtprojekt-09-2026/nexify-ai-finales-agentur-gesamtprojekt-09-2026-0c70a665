"use client";
import { useEffect, useState } from "react";
import { api, dateTime, money, type ApiError } from "./api";

type Mail = { _id: string; status: string; subject?: string; attempts: number };
type AdminOrder = { id: string; number: string; status: string; fulfilment: string | null; total_cents: number; email: string; created_at: string; tracking_number?: string; carrier?: string; mails: Mail[]; bigbuy_order_id?: string | null; fulfillment_error?: string | null; bigbuy_submit_pending?: boolean };
const LABEL: Record<string, string> = { bezahlt: "Bezahlt", in_bearbeitung: "In Bearbeitung", versendet: "Versendet", zugestellt: "Zugestellt", zahlung_offen: "Zahlung offen", zahlung_nicht_abgeschlossen: "Zahlung nicht abgeschlossen" };
const NEXT: Record<string, string[]> = { bezahlt: ["in_bearbeitung", "versendet"], in_bearbeitung: ["versendet"], versendet: ["zugestellt"] };

function OrderRow({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const [tracking, setTracking] = useState(""), [carrier, setCarrier] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const current = order.fulfilment || order.status;
  async function set(status: string) {
    if (status === "versendet" && !tracking.trim()) { setError("Bitte Sendungsnummer eingeben."); return; }
    setBusy(true); setError("");
    try { await api(`/api/admin/orders/${order.id}/status`, { method: "POST", json: { status, tracking_number: tracking, carrier } }); onChanged(); }
    catch (e) { setError((e as ApiError).error === "transition_not_allowed" ? "Dieser Statuswechsel ist nicht erlaubt." : "Status konnte nicht gesetzt werden."); }
    finally { setBusy(false); }
  }
  async function refreshTracking() {
    setBusy(true); setError("");
    try { await api(`/api/admin/orders/${order.id}/tracking-refresh`, { method: "POST", json: {} }); onChanged(); }
    catch { setError("Tracking konnte nicht abgerufen werden."); }
    finally { setBusy(false); }
  }
  const canRefresh = Boolean(order.bigbuy_order_id) && current !== "versendet" && current !== "zugestellt";
  return <tr data-testid={"admin-order-" + order.number}>
    <td>{order.number}<br /><small>{dateTime(order.created_at)}</small></td><td>{order.email}</td><td>{money(order.total_cents)}</td>
    <td data-testid={"admin-order-status-" + order.number}>{LABEL[current] || current}{order.tracking_number && <><br /><small>{order.tracking_number}</small></>}
      {order.fulfillment_error && <><br /><small role="alert" className="tk-field-error" data-testid={"admin-order-error-" + order.number}>BigBuy-Übergabe fehlgeschlagen ({order.fulfillment_error}).</small></>}</td>
    <td>{order.mails.map(m => <small key={m._id} className="tk-mail-state" data-testid={"admin-mail-" + m._id}>{m.subject || m._id}: {m.status}</small>)}</td>
    <td>{canRefresh && <button className="outline-button" disabled={busy} onClick={() => void refreshTracking()} data-testid={"admin-refresh-tracking-" + order.number}>Tracking abrufen</button>}
      {(NEXT[current] || []).length > 0 && <div className="tk-order-actions">
      {NEXT[current].includes("versendet") && <><input aria-label="Sendungsnummer" placeholder="Sendungsnummer" value={tracking} onChange={e => setTracking(e.target.value)} data-testid={"admin-tracking-" + order.number} /><input aria-label="Versanddienstleister" placeholder="Versanddienstleister" value={carrier} onChange={e => setCarrier(e.target.value)} data-testid={"admin-carrier-" + order.number} /></>}
      {NEXT[current].map(s => <button key={s} className="outline-button" disabled={busy} onClick={() => void set(s)} data-testid={`admin-set-${s}-${order.number}`}>{LABEL[s]}</button>)}
      {error && <span role="alert" className="tk-field-error">{error}</span>}</div>}</td>
  </tr>;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null), [retry, setRetry] = useState("");
  const load = () => api<{ orders: AdminOrder[] }>("/api/admin/orders").then(d => setOrders(d.orders)).catch(() => setOrders([]));
  useEffect(() => { void load(); }, []);
  async function retryMails() { const r = await api<{ retried: number }>("/api/admin/outbox/retry", { method: "POST", json: {} }); setRetry(`${r.retried} E-Mail(s) erneut versucht.`); void load(); }
  return <section className="tk-form" data-testid="admin-orders"><h2>Bestellungen</h2>
    <p className="tk-meta">Jeder Statuswechsel sendet die passende Kunden-E-Mail genau einmal. Bezahlte Bestellungen werden automatisch an BigBuy übergeben, sofern die Automatik aktiviert ist; ein Fehler steht in der Statusspalte. Das Tracking wird mit „Tracking abrufen“ geholt.</p>
    <div className="tk-actions"><button className="outline-button" onClick={() => void retryMails()} data-testid="admin-outbox-retry">Fehlgeschlagene E-Mails erneut senden</button>{retry && <span role="status">{retry}</span>}</div>
    {orders === null ? <p role="status">Bestellungen werden geladen …</p> : orders.length === 0 ? <p data-testid="admin-orders-empty">Noch keine Bestellungen.</p> :
      <div className="tk-table-wrap"><table className="tk-table"><thead><tr><th>Bestellung</th><th>Kunde</th><th>Summe</th><th>Status</th><th>E-Mails</th><th>Aktion</th></tr></thead><tbody>{orders.map(o => <OrderRow key={o.id} order={o} onChanged={() => void load()} />)}</tbody></table></div>}
  </section>;
}
