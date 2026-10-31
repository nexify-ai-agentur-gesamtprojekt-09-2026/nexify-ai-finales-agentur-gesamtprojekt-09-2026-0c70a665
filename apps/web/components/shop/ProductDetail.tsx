"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, money, notifyCart, type ApiError, type Cart, type ProductDetail as Detail } from "./api";
import { ProductImage, StockLabel } from "./ProductCard";

const DETAIL_LABELS: Record<string, string> = { weight: "Gewicht (kg)", height: "Höhe (cm)", width: "Breite (cm)", depth: "Tiefe (cm)", condition: "Zustand" };

function AddToCart({ product }: { product: Detail }) {
  const [quantity, setQuantity] = useState(1), [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle"), [message, setMessage] = useState("");
  const out = product.stock <= 0 || product.price_cents === null;
  async function add() {
    setState("busy");
    try {
      const current = await api<Cart>("/api/shop/cart");
      const existing = current.lines.find(line => line.product_id === product.id)?.quantity || 0;
      const cart = await api<Cart>("/api/shop/cart/items", { method: "POST", json: { product_id: product.id, quantity: Math.min(20, existing + quantity) } });
      notifyCart(cart.count); setState("done"); setMessage("Der Artikel liegt in Ihrem Warenkorb.");
    } catch (error) { setState("error"); setMessage((error as ApiError).error === "insufficient_stock" ? "Diese Menge ist beim Lieferanten nicht verfügbar." : "Der Artikel konnte nicht hinzugefügt werden."); }
  }
  return <div className="tk-buy">
    <label htmlFor="tk-qty">Menge</label>
    <input id="tk-qty" type="number" min={1} max={Math.max(1, Math.min(20, product.stock))} value={quantity} disabled={out} onChange={event => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} data-testid="product-quantity" />
    <button className="primary-button" disabled={out || state === "busy"} onClick={() => void add()} data-testid="add-to-cart-button">In den Warenkorb</button>
    {out && <p className="tk-note" data-testid="out-of-stock-note">Dieser Artikel ist derzeit nicht auf Lager und kann nicht bestellt werden.</p>}
    {state === "done" && <p role="status" data-testid="add-to-cart-success">{message} <SiteLink href="/teileklar/warenkorb">Zum Warenkorb</SiteLink></p>}
    {state === "error" && <p role="alert" className="tk-alert" data-testid="add-to-cart-error">{message}</p>}
  </div>;
}

export default function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Detail | null>(null), [missing, setMissing] = useState(false), [active, setActive] = useState(0);
  useEffect(() => { api<Detail>("/api/shop/products/" + encodeURIComponent(id)).then(setProduct).catch(() => setMissing(true)); }, [id]);
  if (missing) return <div className="tk-empty" data-testid="product-missing"><h2>Artikel nicht gefunden</h2><p>Dieser Artikel ist nicht (mehr) im Katalog.</p><SiteLink href="/teileklar/shop" className="content-action-link">Zum Shop</SiteLink></div>;
  if (!product) return <p role="status">Artikel wird geladen …</p>;
  const images = product.images.length ? product.images : [null];
  return <article className="tk-product" data-testid="product-detail">
    <div className="tk-gallery"><ProductImage src={images[active]} alt={product.name} large />
      {images.length > 1 && <div className="tk-thumbs">{images.map((src, index) => <button key={index} type="button" aria-label={"Bild " + (index + 1)} aria-pressed={index === active} onClick={() => setActive(index)}><ProductImage src={src} alt="" /></button>)}</div>}</div>
    <div className="tk-product-info">
      <h2 data-testid="product-name">{product.name}</h2>
      <p className="tk-price is-large" data-testid="product-price">{product.price_cents === null ? "Preis noch nicht freigegeben" : <>{money(product.price_cents)} <small>inkl. {product.vat_percent} % MwSt., zzgl. <a href="/teileklar/rechtliches" data-testid="product-shipping-info-link">Versandkosten</a></small></>}</p>
      {product.price_cents === null && <p className="tk-meta" data-testid="price-not-released-note">Der Verkaufspreis wird noch geprüft. Bis zur Freigabe ist keine Bestellung möglich.</p>}
      <StockLabel stock={product.stock} />
      <p className="tk-fitment" data-testid="fitment-status"><strong>Passung nicht geprüft.</strong> Für diesen Artikel liegt keine geprüfte Fahrzeugzuordnung vor. Bitte vergleichen Sie Teilenummer und Fahrzeugangaben vor der Bestellung.</p>
      <AddToCart product={product} />
      <dl className="tk-facts" data-testid="product-facts">
        <dt>SKU</dt><dd data-testid="product-sku">{product.sku}</dd>
        {product.ean && <><dt>EAN</dt><dd data-testid="product-ean">{product.ean}</dd></>}
        {product.category_name && <><dt>Kategorie</dt><dd>{product.category_name}</dd></>}
        {Object.entries(product.details).filter(([key]) => DETAIL_LABELS[key]).map(([key, value]) => <div key={key} className="tk-fact-row"><dt>{DETAIL_LABELS[key]}</dt><dd>{String(value)}</dd></div>)}
        <dt>Datenquelle</dt><dd>Lieferant BigBuy, Stand {new Date(product.imported_at).toLocaleDateString("de-DE")}</dd>
      </dl>
      {product.description && <div className="tk-description"><h3>Beschreibung des Lieferanten</h3><p>{product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p></div>}
    </div>
  </article>;
}
