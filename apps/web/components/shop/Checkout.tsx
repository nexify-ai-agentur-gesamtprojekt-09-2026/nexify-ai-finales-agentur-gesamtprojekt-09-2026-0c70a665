"use client";
import { useEffect, useRef, useState } from "react";
import { SiteLink } from "../Router";
import { api, deliveryWindow, type ApiError, type Cart, type Line } from "./api";
import AddressStep, { EMPTY_ADDRESS, type AddressData } from "./AddressStep";
import { Totals } from "./CartView";
import { useShopCopy } from "./ProductCard";
import SellerInfo from "./SellerInfo";
import TrustBar, { TRUST_LINE } from "./TrustBar";

const STEPS = [["checkoutStepAddress", "checkoutHeadAddress"], ["checkoutStepShipping", "checkoutHeadShipping"], ["checkoutStepReview", "checkoutHeadReview"], ["checkoutStepPayment", "checkoutHeadPayment"]] as const;
type Option = { id: string; label: string; price_cents: number };
const CHANGE_TEXT = { price: "changePrice", stock: "changeStock", unavailable: "changeUnavailable" } as const;
type CheckoutError = "" | "quoteError" | "changesPending" | "paymentUnavailable" | "orderFailed";
const LEGAL_PATH = "/teileklar/rechtliches";

/** One delivery window for the whole order, only when every line carries a configured window. */
export function orderDelivery(lines: Line[] | undefined) {
  if (!lines?.length) return null;
  const windows = lines.map(line => deliveryWindow(line.delivery_days_min, line.delivery_days_max));
  if (windows.some(window => !window)) return null;
  return { min: Math.max(...windows.map(window => window!.min)), max: Math.max(...windows.map(window => window!.max)) };
}

function idempotencyKey(hash: string) {
  const stored = sessionStorage.getItem("tk-order-key");
  if (stored && stored.startsWith(hash.slice(0, 16) + ":")) return stored;
  const key = hash.slice(0, 16) + ":" + crypto.randomUUID();
  sessionStorage.setItem("tk-order-key", key);
  return key;
}

function Delivery({ lines, testId }: { lines: Line[] | undefined; testId: string }) {
  const { t, number } = useShopCopy();
  const window = orderDelivery(lines);
  if (!window) return null;
  return <span data-testid={testId}>{window.min === window.max ? t(window.min === 1 ? "deliveryOneDay" : "deliveryDays", { days: number(window.min) }) : t("deliveryRange", { min: number(window.min), max: number(window.max) })}</span>;
}

// Legal links open in a new tab so the checkout state is kept. German source text (AGENTS: no machine translation of legal wording).
const legalLink = (anchor: string, label: string, testId: string) => <a href={LEGAL_PATH + "#" + anchor} target="_blank" rel="noopener noreferrer" data-testid={testId}>{label}<span className="visually-hidden"> (öffnet in neuem Tab)</span></a>;

export default function Checkout() {
  const { t, money, number } = useShopCopy();
  const [step, setStep] = useState(0), [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS), [options, setOptions] = useState<Option[]>([]), [shipping, setShipping] = useState("");
  const [quote, setQuote] = useState<Cart | null>(null), [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<CheckoutError>(""), [empty, setEmpty] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { api<Cart>("/api/shop/cart").then(data => { setCart(data); setEmpty(!data.lines.length); }).catch(() => setEmpty(false)); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const loadQuote = async () => { setError(""); try { setQuote(await api<Cart>("/api/shop/checkout/quote", { method: "POST", json: {} })); } catch { setError("quoteError"); } };
  async function acceptChanges() { setBusy(true); try { await api("/api/shop/cart/confirm-changes", { method: "POST", json: {} }); await loadQuote(); } finally { setBusy(false); } }
  async function order() {
    if (!quote?.quote_hash || busy) return;
    setBusy(true); setError(""); setStep(3);
    try {
      const result = await api<{ checkout_url: string }>("/api/shop/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey(quote.quote_hash) }, json: { address, shipping_method: shipping, accept_terms: terms, quote_hash: quote.quote_hash } });
      window.location.assign(result.checkout_url);
    } catch (failure) {
      const e = failure as ApiError; setBusy(false);
      if (e.error === "changes_pending") { setQuote(e.body?.quote as Cart); setStep(2); setError("changesPending"); }
      else { sessionStorage.removeItem("tk-order-key"); setStep(2); setError(e.status === 502 ? "paymentUnavailable" : "orderFailed"); }
    }
  }
  if (empty) return <div className="tk-empty" data-testid="checkout-empty"><h2>{t("cartEmpty")}</h2><p>{t("cartEmptyBody")}</p><SiteLink href="/teileklar/shop" className="content-action-link">{t("goShop")}</SiteLink></div>;
  return <div className="tk-checkout" data-testid="checkout">
    <ol className="tk-steps" aria-label={t("checkoutSteps")}>{STEPS.map(([label], index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index < step ? "is-done" : ""} data-testid={"checkout-step-" + index}><span>{number(index + 1)}</span>{t(label)}</li>)}</ol>
    <h2 ref={heading} tabIndex={-1} data-testid="checkout-heading">{t(STEPS[step][1])}</h2>
    {step === 0 && <>
      <p className="tk-note" data-testid="checkout-address-note">{t("checkoutAddressNote")} {t("checkoutGuestNote")}</p>
      <AddressStep value={address} onNext={async (a, check) => { const errors = await check(a); if (!Object.keys(errors).length) { setAddress(a); const data = await api<{ options: Option[] }>("/api/shop/checkout/shipping-options"); setOptions(data.options); setShipping(data.options[0]?.id || ""); setStep(1); } }} />
    </>}
    {step === 1 && <form className="tk-form" onSubmit={event => { event.preventDefault(); void loadQuote().then(() => setStep(2)); }} data-testid="checkout-shipping-form">
      <fieldset><legend>{t("shippingMethod")}</legend>{options.map(option => <label key={option.id} className="tk-radio"><input type="radio" name="shipping" value={option.id} checked={shipping === option.id} onChange={() => setShipping(option.id)} data-testid={"shipping-option-" + option.id} /><span>{option.label} · {money(option.price_cents)}{orderDelivery(cart?.lines) && <> · <Delivery lines={cart?.lines} testId={"shipping-option-delivery-" + option.id} /></>}</span></label>)}</fieldset>
      <div className="tk-actions"><button type="button" className="outline-button" onClick={() => setStep(0)}>{t("back")}</button><button className="primary-button" type="submit" disabled={!shipping} data-testid="checkout-shipping-continue">{t("toReview")}</button></div>
    </form>}
    {step >= 2 && quote && <div className="tk-review" data-testid="checkout-review">
      <section><h3>{t("deliveryAddress")}</h3><p data-testid="review-address">{address.first_name} {address.last_name}<br />{address.street}<br />{address.zip} {address.city} · {address.country}<br />{address.email}</p><button className="text-button" onClick={() => setStep(0)} disabled={busy}>{t("change")}</button></section>
      <section><h3>{t("items")}</h3><ul className="tk-review-lines">{quote.lines.map(line => <li key={line.product_id}><span>{number(line.quantity)} × {line.name}</span><span>{money(line.line_cents)}</span></li>)}</ul><Totals cart={quote} />
        <p className="tk-meta" data-testid="review-shipping-note">{t("reviewShippingNote", { shipping: money(quote.shipping_cents), total: money(quote.total_cents) })}</p>
        {orderDelivery(quote.lines) && <p className="tk-review-delivery" data-testid="review-delivery"><Delivery lines={quote.lines} testId="review-delivery-value" /></p>}</section>
      <SellerInfo />
      {quote.changes.length > 0 && <div role="alert" className="tk-alert" data-testid="checkout-changes"><strong>{t("changesTitle")}</strong><ul>{quote.changes.map(c => <li key={c.product_id + c.kind}>{c.name}: {t(CHANGE_TEXT[c.kind])}{c.kind === "price" ? ` (${money(c.old!)} → ${money(c.new!)})` : c.kind === "stock" ? " (" + t("changeAvailable", { count: number(c.new ?? 0) }) + ")" : ""}</li>)}</ul>
        <button className="outline-button" disabled={busy} onClick={() => void acceptChanges()} data-testid="checkout-accept-changes">{t("acceptChanges")}</button></div>}
      <section className="tk-withdrawal" lang="de" data-testid="checkout-withdrawal-hint"><h3>Widerrufsrecht</h3>
        <p>Sie können Ihre Bestellung innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. Einzelheiten finden Sie in der {legalLink("widerruf", "Widerrufsbelehrung", "checkout-withdrawal-link")}; für Ihre Erklärung können Sie das {legalLink("widerrufsformular", "Muster-Widerrufsformular", "checkout-withdrawal-form-link")} verwenden.</p></section>
      <label className="tk-terms" lang="de"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} data-testid="checkout-terms-checkbox" /><span>Ich habe die {legalLink("agb", "AGB", "checkout-terms-agb-link")} gelesen. Die {legalLink("widerruf", "Widerrufsbelehrung", "checkout-terms-withdrawal-link")} habe ich zur Kenntnis genommen.</span></label>
      <div className="tk-order-cta">
        <button className="primary-button tk-cta" lang="de" disabled={!terms || busy || quote.changes.length > 0} onClick={() => void order()} data-testid="checkout-place-order">Zahlungspflichtig bestellen</button>
        <p className="tk-note" data-testid="checkout-payment-note">{t("paymentRedirectNote")}</p>
        <TrustBar items={TRUST_LINE} compact testId="checkout-trust" />
      </div>
      {step === 3 && busy && <p role="status" data-testid="checkout-redirecting">{t("paymentRedirecting")}</p>}
    </div>}
    {error && <p role="alert" className="tk-alert" data-testid="checkout-error">{t(error)}</p>}
  </div>;
}
