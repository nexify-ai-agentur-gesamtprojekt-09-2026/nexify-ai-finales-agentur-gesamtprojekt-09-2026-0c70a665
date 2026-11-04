"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, notifyCart, type Cart } from "./api";
import { ProductImage, useShopCopy } from "./ProductCard";
import TrustBar from "./TrustBar";

export function Totals({ cart }: { cart: Cart }) {
  const { t, money, number } = useShopCopy();
  const rate = Number(cart.vat_percent);
  return <dl className="tk-totals" data-testid="cart-totals">
    <dt>{t("subtotal")}</dt><dd data-testid="cart-subtotal">{money(cart.subtotal_cents)}</dd>
    <dt>{t("shippingCost")}</dt><dd data-testid="cart-shipping">{money(cart.shipping_cents)}</dd>
    <dt className="is-total">{t("totalInclVat")}</dt><dd className="is-total" data-testid="cart-total">{money(cart.total_cents)}</dd>
    <dt>{cart.vat_percent && Number.isFinite(rate) ? t("vatIncludedRate", { rate: number(rate) }) : t("vatIncluded")}</dt><dd data-testid="cart-vat">{money(cart.vat_included_cents)}</dd>
  </dl>;
}

/** Payment, withdrawal and contact in one place (concept 3.5); no reaction time is claimed without data. */
export function TrustBox({ testId }: { testId: string }) {
  const { t } = useShopCopy();
  return <section className="tk-trust-box" aria-labelledby={testId + "-title"} data-testid={testId}>
    <h3 id={testId + "-title"}>{t("trustBoxTitle")}</h3>
    <TrustBar testId={testId + "-items"} compact />
    <p className="tk-note">{t("trustContactBefore")} <SiteLink href="/kontakt" data-testid={testId + "-contact"}>{t("trustContactLink")}</SiteLink></p>
  </section>;
}

export default function CartView() {
  const { t, money } = useShopCopy();
  const [cart, setCart] = useState<Cart | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<"" | "cartLoadError" | "cartChangeError">("");
  const load = () => api<Cart>("/api/shop/cart").then(data => { setCart(data); notifyCart(data.count); }).catch(() => setError("cartLoadError"));
  useEffect(() => { void load(); }, []);
  async function change(productId: string, quantity: number) {
    setBusy(true); setError("");
    try { const data = await api<Cart>("/api/shop/cart/items", { method: "POST", json: { product_id: productId, quantity } }); setCart(data); notifyCart(data.count); }
    catch { setError("cartChangeError"); await load(); }
    finally { setBusy(false); }
  }
  if (!cart) return error ? <p role="alert" className="tk-alert" data-testid="cart-error">{t(error)}</p> : <p role="status">{t("cartLoading")}</p>;
  if (!cart.lines.length) return <div className="tk-empty" data-testid="cart-empty"><h2>{t("cartEmpty")}</h2><p>{t("cartEmptyBody")}</p>
    <div className="tk-actions"><SiteLink href="/teileklar/shop" className="content-action-link" data-testid="cart-empty-shop">{t("goShop")}</SiteLink><SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid="cart-empty-workshop">{t("findWorkshop")}</SiteLink></div></div>;
  return <div className="tk-cart" data-testid="cart-view">
    <div className="tk-cart-main">
      <ul className="tk-lines">{cart.lines.map(line => <li key={line.product_id} data-testid={"cart-line-" + line.product_id}>
        <ProductImage src={line.image} alt={line.name} />
        <div><SiteLink href={"/teileklar/produkt/" + line.product_id}><strong>{line.name}</strong></SiteLink><span className="tk-meta">{t("sku")} {line.sku} · {t("unitEach", { price: money(line.unit_cents) })}</span></div>
        <label className="tk-qty-label">{t("quantity")}<input type="number" min={1} max={Math.min(20, line.stock)} defaultValue={line.quantity} key={line.quantity} disabled={busy}
          onBlur={event => { const value = Number(event.target.value); if (value !== line.quantity && value >= 1) void change(line.product_id, value); }} data-testid={"cart-qty-" + line.product_id} /></label>
        <span className="tk-line-total" data-testid={"cart-line-total-" + line.product_id}>{money(line.line_cents)}</span>
        <button className="text-button" disabled={busy} onClick={() => void change(line.product_id, 0)} data-testid={"cart-remove-" + line.product_id}>{t("remove")}</button>
      </li>)}</ul>
      {cart.changes.length > 0 && <p role="alert" className="tk-alert" data-testid="cart-changes">{t("cartChanged")}</p>}
      {error && <p role="alert" className="tk-alert" data-testid="cart-error">{t(error)}</p>}
      <TrustBox testId="cart-trust" />
    </div>
    <aside className="tk-summary" aria-label={t("cartSummary")}><Totals cart={cart} /><p className="tk-note">{t("serverPrices")}</p>
      <SiteLink href="/teileklar/kasse" className="primary-button tk-cta" data-testid="cart-checkout-link">{t("goCheckout")}</SiteLink>
      <SiteLink href="/teileklar/shop" className="content-action-link" data-testid="cart-continue-shopping">{t("continueShopping")}</SiteLink></aside>
  </div>;
}
