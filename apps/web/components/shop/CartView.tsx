"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, money, notifyCart, type Cart } from "./api";
import { ProductImage } from "./ProductCard";
import { freeShippingHint } from "./shipping-hint";

export function Totals({ cart }: { cart: Cart }) {
  const hint = freeShippingHint(cart);
  return <>
    {hint && <p className="tk-ship-hint" role="status" data-testid="cart-free-shipping">{hint.kind === "reached" ? "Für diese Bestellung entfallen die Versandkosten." : `Noch ${money(hint.remaining_cents)} bis zum kostenlosen Versand (ab ${money(hint.threshold_cents)}).`}</p>}
    <dl className="tk-totals" data-testid="cart-totals">
      <dt>Zwischensumme</dt><dd data-testid="cart-subtotal">{money(cart.subtotal_cents)}</dd>
      <dt>Versand</dt><dd data-testid="cart-shipping">{cart.shipping_pending?'Berechnung nach Lieferadresse':money(cart.shipping_cents)}</dd>
      <dt className="is-total">Gesamt</dt><dd className="is-total" data-testid="cart-total">{money(cart.total_cents)}</dd>
      <dt>enthaltene MwSt. ({cart.vat_percent || "19"} %)</dt><dd>{money(cart.vat_included_cents)}</dd>
    </dl>
  </>;
}

export default function CartView() {
  const [cart, setCart] = useState<Cart | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const load = () => api<Cart>("/api/shop/cart").then(data => { setCart(data); notifyCart(data.count); }).catch(() => setError("Der Warenkorb konnte nicht geladen werden."));
  useEffect(() => { void load(); }, []);
  async function change(productId: string, quantity: number) {
    setBusy(true); setError("");
    try { const data = await api<Cart>("/api/shop/cart/items", { method: "POST", json: { product_id: productId, quantity } }); setCart(data); notifyCart(data.count); }
    catch { setError("Die Menge konnte nicht geändert werden. Bitte prüfen Sie den Lagerbestand."); await load(); setRevision(value => value + 1); }
    finally { setBusy(false); }
  }
  if (!cart) return error ? <p role="alert" className="tk-alert">{error}</p> : <p role="status">Warenkorb wird geladen …</p>;
  if (!cart.lines.length) return <div className="tk-empty" data-testid="cart-empty"><h2>Ihr Warenkorb ist leer</h2><p>Suchen Sie im Shop nach dem passenden Artikel.</p><SiteLink href="/teileklar/shop" className="content-action-link">Zum Shop</SiteLink></div>;
  return <div className="tk-cart" data-testid="cart-view">
    <ul className="tk-lines">{cart.lines.map(line => <li key={line.product_id} data-testid={"cart-line-" + line.product_id}>
      <ProductImage src={line.image} alt={line.name} />
      <div><SiteLink href={"/teileklar/produkt/" + line.product_id}><strong>{line.name}</strong></SiteLink><span className="tk-meta">SKU {line.sku} · {money(line.unit_cents)} je Stück</span></div>
      <label className="tk-qty-label">Menge<input type="number" min={1} max={Math.min(20, line.stock)} defaultValue={line.quantity} key={line.quantity + ":" + revision} disabled={busy}
        onBlur={event => { const value = Number(event.target.value); if (value !== line.quantity && value >= 1) void change(line.product_id, value); }} data-testid={"cart-qty-" + line.product_id} /></label>
      <span className="tk-line-total" data-testid={"cart-line-total-" + line.product_id}>{money(line.line_cents)}</span>
      <button className="text-button" disabled={busy} onClick={() => void change(line.product_id, 0)} data-testid={"cart-remove-" + line.product_id}>Entfernen</button>
    </li>)}</ul>
    {cart.changes.length > 0 && <p role="alert" className="tk-alert">Seit dem Hinzufügen haben sich Preis oder Bestand geändert. Sie sehen die Änderungen vor der Zahlung im Checkout.</p>}
    {error && <p role="alert" className="tk-alert">{error}</p>}
    <aside className="tk-summary"><Totals cart={cart} /><p className="tk-note">Alle Preise werden auf dem Server aus dem aktuellen Katalog berechnet.</p>
      <SiteLink href="/teileklar/kasse" className="primary-button tk-cta" data-testid="cart-checkout-link">Zur Kasse</SiteLink></aside>
  </div>;
}
