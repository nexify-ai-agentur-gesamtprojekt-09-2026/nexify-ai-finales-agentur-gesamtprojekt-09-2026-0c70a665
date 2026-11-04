"use client";
import { useEffect, useRef, useState } from "react";
import { SiteLink } from "../Router";
import { api, cartIntentKey, notifyCart, type ApiError, type Cart, type ProductDetail as Detail } from "./api";
import { BasePriceLabel, DeliveryLabel, EligibilityChips, ProductImage, StockLabel, useShopCopy } from "./ProductCard";
import TrustBar, { TRUST_LINE } from "./TrustBar";

const DETAIL_LABELS = { weight: "weight", height: "height", width: "width", depth: "depth", condition: "condition" } as const;
export const SHIPPING_INFO_PATH = "/teileklar/versand-und-zahlung";

// Legal take-back notices (BattG / ElektroG) stay German source text: draft, legal review before launch.
// Shown only when the product data carries the matching disposal_class; never inferred from names.
const DISPOSAL: Record<"battery" | "weee", { title: string; body: string }> = {
  battery: { title: "Hinweis nach dem Batteriegesetz (BattG)", body: "Batterien und Akkus gehören nicht in den Hausmüll. Als Endnutzer sind Sie zur Rückgabe gebrauchter Batterien gesetzlich verpflichtet. Sie können sie unentgeltlich bei einer kommunalen Sammelstelle oder im Handel zurückgeben. Das Symbol der durchgestrichenen Mülltonne bedeutet, dass Batterien nicht über den Hausmüll entsorgt werden dürfen." },
  weee: { title: "Hinweis nach dem Elektro- und Elektronikgerätegesetz (ElektroG)", body: "Elektro- und Elektronikaltgeräte dürfen nicht über den Hausmüll entsorgt werden. Das Symbol der durchgestrichenen Mülltonne weist darauf hin. Geben Sie Altgeräte unentgeltlich bei einer kommunalen Sammelstelle zurück und entnehmen Sie vorher Altbatterien, soweit dies ohne Zerstörung möglich ist." },
};

function Fitment({ product }: { product: Detail }) {
  const { t } = useShopCopy();
  const values = (product.suitability || []).filter(value => typeof value === "string" && value.trim());
  const universal = values.length > 0 && values.every(value => value.trim().toLowerCase() === "universal");
  const specific = values.filter(value => value.trim().toLowerCase() !== "universal");
  return <div className="tk-fitment" data-testid="fitment-status" data-fitment={specific.length ? "data" : universal ? "universal" : "none"}>
    <strong>{t("fitmentTitle")}</strong>
    {specific.length ? <><p data-testid="fitment-values">{t("fitmentSuitable", { values: specific.join(", ") })}</p><p>{t("fitmentCheck")}</p></>
      : <p>{universal ? t("fitmentUniversal") : t("fitmentBody")}</p>}
    <SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid="fitment-workshop-link">{t("findWorkshop")}</SiteLink>
  </div>;
}

function AddToCart({ product }: { product: Detail }) {
  const { t, number } = useShopCopy();
  const [quantity, setQuantity] = useState(1), [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle"), [message, setMessage] = useState<"cartDone" | "quantityUnavailable" | "quantityAvailable" | "quantityLimit" | "priceNoOrder" | "cartUnknown" | "cartError">("cartDone");
  const [available, setAvailable] = useState(0);
  // The server adds `quantity` to its own current line ("add" mode). The key stays with
  // the intent while its outcome is unknown, so a retry after a lost response replays
  // instead of adding twice; a definite answer (success or 4xx) ends the intent.
  const pending = useRef<{ key: string; quantity: number } | null>(null);
  const out = product.stock === null || product.stock <= 0 || product.price_cents === null;
  async function add() {
    if (out || state === "busy") return;
    setState("busy");
    const intent = pending.current?.quantity === quantity ? pending.current : { key: cartIntentKey(), quantity };
    pending.current = intent;
    try {
      const cart = await api<Cart>("/api/shop/cart/items", { method: "POST", headers: { "Idempotency-Key": intent.key }, json: { product_id: product.id, quantity: intent.quantity, mode: "add" } });
      pending.current = null; notifyCart(cart.count); setState("done"); setMessage("cartDone");
    } catch (error) {
      const failure = error as Partial<ApiError>;
      const refused = typeof failure?.status === "number" && failure.status >= 400 && failure.status < 500;
      if (refused) pending.current = null;
      const left = failure?.body?.stock;
      const counted = failure?.error === "insufficient_stock" && typeof left === "number" && Number.isSafeInteger(left) && left > 0;
      if (counted) setAvailable(left as number);
      setState("error");
      setMessage(counted ? "quantityAvailable" : failure?.error === "insufficient_stock" ? "quantityUnavailable" : failure?.error === "quantity_limit" ? "quantityLimit"
        : failure?.error === "price_not_released" ? "priceNoOrder" : refused ? "cartError" : "cartUnknown");
    }
  }
  return <div className="tk-buy">
    <label htmlFor="tk-qty">{t("quantity")}</label>
    <input id="tk-qty" type="number" min={1} max={Math.max(1, Math.min(20, product.stock ?? 0))} value={quantity} disabled={out} onChange={event => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} data-testid="product-quantity" />
    <button className="primary-button" disabled={out || state === "busy"} onClick={() => void add()} data-testid="add-to-cart-button">{t("addCart")}</button>
    {out && <p className="tk-note" data-testid="out-of-stock-note">{product.stock === null ? t("unknownNoOrder") : product.price_cents === null ? t("priceNoOrder") : t("outNoOrder")}</p>}
    {state === "done" && <p role="status" data-testid="add-to-cart-success">{t(message)} <SiteLink href="/teileklar/warenkorb">{t("goCart")}</SiteLink></p>}
    {state === "error" && <p role="alert" className="tk-alert" data-testid="add-to-cart-error">{t(message, { max: 20, count: number(available) })}{message === "cartUnknown" && <> <SiteLink href="/teileklar/warenkorb">{t("goCart")}</SiteLink></>}</p>}
  </div>;
}

export default function ProductDetail({ id, readOnly = false }: { id: string; readOnly?: boolean }) {
  const { t, number, money, date } = useShopCopy();
  const [product, setProduct] = useState<Detail | null>(null), [missing, setMissing] = useState(false), [failed, setFailed] = useState(false), [active, setActive] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setProduct(null); setMissing(false); setFailed(false); setActive(0);
    api<Detail>("/api/shop/products/" + encodeURIComponent(id), { signal: controller.signal })
      .then(value => { if (current) setProduct(value); })
      .catch(error => { if (current && !controller.signal.aborted) { if ((error as ApiError).status === 404) setMissing(true); else setFailed(true); } });
    return () => { current = false; controller.abort(); };
  }, [id]);
  if (failed) return <p role="alert" className="tk-alert" data-testid="product-error">{t("productError")}</p>;
  if (missing) return <div className="tk-empty" data-testid="product-missing"><h2>{t("productMissing")}</h2><p>{t("productMissingBody")}</p><SiteLink href="/teileklar/shop" className="content-action-link">{t("goShop")}</SiteLink></div>;
  if (!product) return <p role="status">{t("productLoading")}</p>;
  const images = product.images.length ? product.images : [null];
  const inStock = typeof product.stock === "number" && product.stock > 0;
  const notes = product.safety_notes || [], contents = product.scope_of_delivery || [];
  const disposal = product.disposal_class === "battery" || product.disposal_class === "weee" ? DISPOSAL[product.disposal_class] : null;
  const description = product.description ? product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  return <article className="tk-product" data-testid="product-detail">
    <div className="tk-gallery"><ProductImage src={images[active]} alt={product.name} large />
      {images.length > 1 && <div className="tk-thumbs">{images.map((src, index) => <button key={index} type="button" aria-label={t("imageNumber", { number: number(index + 1) })} aria-pressed={index === active} onClick={() => setActive(index)}><ProductImage src={src} alt="" /></button>)}</div>}</div>
    <div className="tk-product-info">
      <h2 data-testid="product-name">{product.name}</h2>
      <p className="tk-meta" data-testid="product-identifiers">{product.manufacturer && <><span data-testid="product-manufacturer">{t("manufacturer")} {product.manufacturer}</span> · </>}{t("sku")} {product.sku}{product.ean ? " · " + t("ean") + " " + product.ean : ""}</p>
      <EligibilityChips suitability={product.suitability} testId="product-eligibility" />
      <div className="tk-price-block">
        <p className="tk-price is-large" data-testid="product-price">{product.price_cents === null ? t("priceUnavailable") : <>{money(product.price_cents)} <small>{t("taxRate", { rate: number(Number(product.vat_percent)) })} <a href={SHIPPING_INFO_PATH} data-testid="product-shipping-info-link">{t("shipping")}</a></small></>}</p>
        <BasePriceLabel priceCents={product.price_cents} content={product.net_content} unit={product.unit} testId="product-base-price" />
      </div>
      {product.price_cents === null && <p className="tk-meta" data-testid="price-not-released-note">{t("priceNote")}</p>}
      <p className="tk-availability"><StockLabel stock={product.stock} />{inStock && <DeliveryLabel min={product.delivery_days_min} max={product.delivery_days_max} testId="product-delivery" />}</p>
      {readOnly ? <p className="tk-note" data-testid="product-read-only">{t("readOnly")}</p> : <AddToCart product={product} />}
      <TrustBar items={TRUST_LINE} compact testId="product-trust" />
      <Fitment product={product} />
    </div>
    <div className="tk-product-sections">
      {description && <section className="tk-description" aria-labelledby="pdp-description" data-testid="product-description"><h3 id="pdp-description">{t("description")}</h3><p>{description}</p></section>}
      <section aria-labelledby="pdp-facts"><h3 id="pdp-facts">{t("pdpFacts")}</h3>
        <dl className="tk-facts" data-testid="product-facts">
          <dt>{t("sku")}</dt><dd data-testid="product-sku">{product.sku}</dd>
          {product.ean && <><dt>{t("ean")}</dt><dd data-testid="product-ean">{product.ean}</dd></>}
          {product.category_name && <><dt>{t("category")}</dt><dd>{product.category_name}</dd></>}
          {typeof product.net_content === "number" && product.unit && <><dt>{t("netContent")}</dt><dd data-testid="product-net-content">{number(product.net_content)} {product.unit}</dd></>}
          {Object.entries(product.details).filter(([key]) => DETAIL_LABELS[key as keyof typeof DETAIL_LABELS]).map(([key, value]) => <div key={key} className="tk-fact-row"><dt>{t(DETAIL_LABELS[key as keyof typeof DETAIL_LABELS])}</dt><dd>{typeof value === "number" ? number(value) : String(value)}</dd></div>)}
          <dt>{t("source")}</dt><dd>{t("supplierDate", { date: date(product.imported_at) })}</dd>
        </dl>
      </section>
      {contents.length > 0 && <section aria-labelledby="pdp-contents" data-testid="product-scope-of-delivery"><h3 id="pdp-contents">{t("pdpContents")}</h3><ul>{contents.map(item => <li key={item}>{item}</li>)}</ul></section>}
      <section aria-labelledby="pdp-safety" data-testid="product-safety"><h3 id="pdp-safety">{t("pdpSafety")}</h3>
        {product.manufacturer ? <p data-testid="product-safety-manufacturer"><strong>{t("manufacturer")}:</strong> {product.manufacturer}</p> : <p className="tk-note" data-testid="product-safety-manufacturer-missing">{t("pdpManufacturerMissing")}</p>}
        {notes.length ? <ul data-testid="product-safety-notes">{notes.map(note => <li key={note}>{note}</li>)}</ul> : <p className="tk-note" data-testid="product-safety-notes-missing">{t("pdpSafetyMissing")}</p>}
      </section>
      {disposal && <section aria-labelledby="pdp-disposal" data-testid="product-disposal" data-disposal={product.disposal_class}><h3 id="pdp-disposal">{t("pdpDisposal")}</h3><p><strong>{disposal.title}</strong></p><p lang="de">{disposal.body}</p></section>}
      <section aria-labelledby="pdp-shipping" data-testid="product-shipping-returns"><h3 id="pdp-shipping">{t("pdpShipping")}</h3>
        <p>{t("pdpShippingBody")}</p>
        <div className="tk-actions"><a href={SHIPPING_INFO_PATH} className="content-action-link" data-testid="product-shipping-page-link">{t("shippingPage")}</a><a href="/teileklar/rechtliches#widerruf" className="content-action-link" data-testid="product-withdrawal-link">{t("withdrawalPolicy")}</a></div>
      </section>
    </div>
  </article>;
}
