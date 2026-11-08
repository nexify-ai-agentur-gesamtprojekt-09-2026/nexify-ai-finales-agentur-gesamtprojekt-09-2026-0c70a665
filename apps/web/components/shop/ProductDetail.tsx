"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, notifyCart, type ApiError, type Cart, type ProductDetail as Detail } from "./api";
import { ProductImage, StockLabel, useShopCopy } from "./ProductCard";

const DETAIL_LABELS = { weight: "weight", height: "height", width: "width", depth: "depth", condition: "condition" } as const;

function AddToCart({ product }: { product: Detail }) {
  const { t } = useShopCopy();
  const [quantity, setQuantity] = useState(1), [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle"), [message, setMessage] = useState<"cartDone" | "quantityUnavailable" | "cartError">("cartDone");
  const out = product.stock === null || product.stock <= 0 || product.price_cents === null;
  async function add() {
    if (out || state === "busy") return;
    setState("busy");
    try {
      const current = await api<Cart>("/api/shop/cart");
      const existing = current.lines.find(line => line.product_id === product.id)?.quantity || 0;
      if (existing + quantity > Math.min(20,product.stock??0)) {setState('error');setMessage('quantityUnavailable');return;}
      const cart = await api<Cart>("/api/shop/cart/items", { method: "POST", json: { product_id: product.id, quantity: existing + quantity } });
      notifyCart(cart.count); setState("done"); setMessage("cartDone");
    } catch (error) { setState("error"); setMessage((error as ApiError).error === "insufficient_stock" ? "quantityUnavailable" : "cartError"); }
  }
  return <div className="tk-buy">
    <label htmlFor="tk-qty">{t("quantity")}</label>
    <input id="tk-qty" type="number" min={1} max={Math.max(1, Math.min(20, product.stock ?? 0))} value={quantity} disabled={out} onChange={event => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} data-testid="product-quantity" />
    <button className="primary-button" disabled={out || state === "busy"} onClick={() => void add()} data-testid="add-to-cart-button">{t("addCart")}</button>
    {out && <p className="tk-note" data-testid="out-of-stock-note">{product.stock === null ? t("unknownNoOrder") : product.price_cents === null ? t("priceNoOrder") : t("outNoOrder")}</p>}
    {state === "done" && <p role="status" data-testid="add-to-cart-success">{t(message)} <SiteLink href="/teileklar/warenkorb">{t("goCart")}</SiteLink></p>}
    {state === "error" && <p role="alert" className="tk-alert" data-testid="add-to-cart-error">{t(message)}</p>}
  </div>;
}

export default function ProductDetail({ id, readOnly = false, initialProduct }: { id: string; readOnly?: boolean; initialProduct?:Detail }) {
  const { t, number, money, date } = useShopCopy();
  const [product, setProduct] = useState<Detail | null>(initialProduct||null), [missing, setMissing] = useState(false), [failed, setFailed] = useState(false), [active, setActive] = useState(0);
  useEffect(() => {
    if(initialProduct?.id===id){setProduct(initialProduct);return;}
    const controller = new AbortController(); let current = true;
    setProduct(null); setMissing(false); setFailed(false); setActive(0);
    api<Detail>("/api/shop/products/" + encodeURIComponent(id), { signal: controller.signal })
      .then(value => { if (current) setProduct(value); })
      .catch(error => { if (current && !controller.signal.aborted) { if ((error as ApiError).status === 404) setMissing(true); else setFailed(true); } });
    return () => { current = false; controller.abort(); };
  }, [id,initialProduct]);
  if (failed) return <p role="alert" className="tk-alert" data-testid="product-error">{t("productError")}</p>;
  if (missing) return <div className="tk-empty" data-testid="product-missing"><h2>{t("productMissing")}</h2><p>{t("productMissingBody")}</p><SiteLink href="/teileklar/shop" className="content-action-link">{t("goShop")}</SiteLink></div>;
  if (!product) return <p role="status">{t("productLoading")}</p>;
  const images = product.images.length ? product.images : [null];
  return <article className="tk-product" data-testid="product-detail">
    <div className="tk-gallery"><ProductImage src={images[active]} alt={product.name} large />
      {images.length > 1 && <div className="tk-thumbs">{images.map((src, index) => <button key={index} type="button" aria-label={t("imageNumber", { number: number(index + 1) })} aria-pressed={index === active} onClick={() => setActive(index)}><ProductImage src={src} alt="" /></button>)}</div>}</div>
    <div className="tk-product-info">
      <h2 data-testid="product-name">{product.name}</h2>
      <p className="tk-price is-large" data-testid="product-price">{product.price_cents === null ? t("priceUnavailable") : <>{money(product.price_cents)} <small>{t("taxRate", { rate: number(Number(product.vat_percent)) })} <a href="/teileklar/rechtliches" data-testid="product-shipping-info-link">{t("shipping")}</a></small></>}</p>
      {product.price_cents === null && <p className="tk-meta" data-testid="price-not-released-note">{t("priceNote")}</p>}
      <StockLabel stock={product.stock} />
      <p className="tk-fitment" data-testid="fitment-status"><strong>{t("fitmentTitle")}</strong> {t("fitmentBody")}</p>
      {readOnly ? <p className="tk-note" data-testid="product-read-only">{t("readOnly")}</p> : <AddToCart product={product} />}
      <dl className="tk-facts" data-testid="product-facts">
        <dt>{t("sku")}</dt><dd data-testid="product-sku">{product.sku}</dd>
        {product.ean && <><dt>{t("ean")}</dt><dd data-testid="product-ean">{product.ean}</dd></>}
        {product.category_name && <><dt>{t("category")}</dt><dd>{product.category_name}</dd></>}
        {Object.entries(product.details).filter(([key]) => DETAIL_LABELS[key as keyof typeof DETAIL_LABELS]).map(([key, value]) => <div key={key} className="tk-fact-row"><dt>{t(DETAIL_LABELS[key as keyof typeof DETAIL_LABELS])}</dt><dd>{typeof value === "number" ? number(value) : String(value)}</dd></div>)}
        <dt>{t("source")}</dt><dd>{t("supplierDate", { date: date(product.imported_at) })}</dd>
      </dl>
      {product.description && <div className="tk-description"><h3>{t("description")}</h3><p>{product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p></div>}
    </div>
  </article>;
}
