"use client";
import { useEffect, useRef, useState } from "react";
import { SiteLink } from "../Router";
import { api, money, type ApiError, type Cart } from "./api";
import AddressStep, { EMPTY_ADDRESS, type AddressData } from "./AddressStep";
import { Totals } from "./CartView";
import SellerInfo from "./SellerInfo";

const STEPS = ["Adresse", "Versand", "Prüfen", "Zahlung"];
type Option = { id: string; label: string; price_cents: number };
const CHANGE_TEXT = { price: "Preis geändert", stock: "Bestand geändert", unavailable: "Nicht mehr verfügbar" };

function idempotencyKey(hash: string) {
  const stored = sessionStorage.getItem("tk-order-key");
  if (stored && stored.startsWith(hash.slice(0, 16) + ":")) return stored;
  const key = hash.slice(0, 16) + ":" + crypto.randomUUID();
  sessionStorage.setItem("tk-order-key", key);
  return key;
}

export default function Checkout() {
  const [step, setStep] = useState(0), [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS), [options, setOptions] = useState<Option[]>([]), [shipping, setShipping] = useState("");
  const [quote, setQuote] = useState<Cart | null>(null), [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [empty, setEmpty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { api<Cart>("/api/shop/cart").then(cart => setEmpty(!cart.lines.length)).catch(() => setEmpty(false)); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const loadQuote = async () => { setError(""); try { setQuote(await api<Cart>("/api/shop/checkout/quote", { method: "POST", json: {} })); } catch { setError("Die Bestellübersicht konnte nicht berechnet werden."); } };
  async function acceptChanges() { setBusy(true); try { await api("/api/shop/cart/confirm-changes", { method: "POST", json: {} }); await loadQuote(); } finally { setBusy(false); } }
  async function order() {
    if (!quote?.quote_hash || busy) return;
    setBusy(true); setError(""); setStep(3);
    try {
      const result = await api<{ checkout_url: string }>("/api/shop/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey(quote.quote_hash) }, json: { address, shipping_method: shipping, accept_terms: terms, quote_hash: quote.quote_hash } });
      window.location.assign(result.checkout_url);
    } catch (failure) {
      const e = failure as ApiError; setBusy(false);
      if (e.error === "changes_pending") { setQuote(e.body?.quote as Cart); setStep(2); setError("Preis oder Bestand haben sich geändert. Bitte prüfen und bestätigen Sie die Änderungen."); }
      else { sessionStorage.removeItem("tk-order-key"); setStep(2); setError(e.status === 502 ? "Der Zahlungsdienst ist gerade nicht erreichbar. Es wurde keine Zahlung ausgelöst. Bitte versuchen Sie es später erneut." : "Die Bestellung konnte nicht angelegt werden. Es wurde keine Zahlung ausgelöst."); }
    }
  }
  if (empty) return <div className="tk-empty" data-testid="checkout-empty"><h2>Ihr Warenkorb ist leer</h2><SiteLink href="/teileklar/shop" className="content-action-link">Zum Shop</SiteLink></div>;
  return <div className="tk-checkout" data-testid="checkout">
    <ol className="tk-steps" aria-label="Schritte">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index < step ? "is-done" : ""} data-testid={"checkout-step-" + index}><span>{index + 1}</span>{label}</li>)}</ol>
    <h2 ref={heading} tabIndex={-1}>{STEPS[step]}</h2>
    {step === 0 && <AddressStep value={address} onNext={async (a, check) => { const errors = await check(a); if (!Object.keys(errors).length) { setAddress(a); const data = await api<{ options: Option[] }>("/api/shop/checkout/shipping-options"); setOptions(data.options); setShipping(data.options[0]?.id || ""); setStep(1); } }} />}
    {step === 1 && <form className="tk-form" onSubmit={event => { event.preventDefault(); void loadQuote().then(() => setStep(2)); }} data-testid="checkout-shipping-form">
      <fieldset><legend>Versandart</legend>{options.map(option => <label key={option.id} className="tk-radio"><input type="radio" name="shipping" value={option.id} checked={shipping === option.id} onChange={() => setShipping(option.id)} data-testid={"shipping-option-" + option.id} />{option.label} · {money(option.price_cents)}</label>)}</fieldset>
      <div className="tk-actions"><button type="button" className="outline-button" onClick={() => setStep(0)}>Zurück</button><button className="primary-button" type="submit" disabled={!shipping} data-testid="checkout-shipping-continue">Weiter zur Prüfung</button></div>
    </form>}
    {step >= 2 && quote && <div className="tk-review" data-testid="checkout-review">
      <section><h3>Lieferadresse</h3><p data-testid="review-address">{address.first_name} {address.last_name}<br />{address.street}<br />{address.zip} {address.city} · {address.country}<br />{address.email}</p><button className="text-button" onClick={() => setStep(0)} disabled={busy}>Ändern</button></section>
      <section><h3>Artikel</h3><ul className="tk-review-lines">{quote.lines.map(line => <li key={line.product_id}><span>{line.quantity} × {line.name}</span><span>{money(line.line_cents)}</span></li>)}</ul><Totals cart={quote} /><p className="tk-meta" data-testid="review-shipping-note">Versand: {money(quote.shipping_cents)} · Gesamtpreis inkl. {quote.vat_percent || "19"} % MwSt.: {money(quote.total_cents)}</p></section>
      <SellerInfo />
      {quote.changes.length > 0 && <div role="alert" className="tk-alert" data-testid="checkout-changes"><strong>Änderungen seit dem Hinzufügen:</strong><ul>{quote.changes.map(c => <li key={c.product_id + c.kind}>{c.name}: {CHANGE_TEXT[c.kind]}{c.kind === "price" ? ` (${money(c.old!)} → ${money(c.new!)})` : c.kind === "stock" ? ` (verfügbar: ${c.new})` : ""}</li>)}</ul>
        <button className="outline-button" disabled={busy} onClick={() => void acceptChanges()} data-testid="checkout-accept-changes">Änderungen übernehmen</button></div>}
      <label className="tk-terms"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} data-testid="checkout-terms-checkbox" /><span>Ich habe die <SiteLink href="/teileklar/rechtliches#agb">AGB</SiteLink> und die <SiteLink href="/teileklar/rechtliches#widerruf">Widerrufsbelehrung</SiteLink> gelesen und akzeptiere sie.</span></label>
      <button className="primary-button tk-cta" disabled={!terms || busy || quote.changes.length > 0} onClick={() => void order()} data-testid="checkout-place-order">Zahlungspflichtig bestellen</button>
      {step === 3 && busy && <p role="status" data-testid="checkout-redirecting">Sie werden zur sicheren Zahlungsseite von Revolut weitergeleitet …</p>}
    </div>}
    {error && <p role="alert" className="tk-alert" data-testid="checkout-error">{error}</p>}
  </div>;
}
