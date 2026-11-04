"use client";
import { useState } from "react";
import { SiteLink } from "../Router";
import { useUI } from "../Workspace";
import shopCopy from "../../../../config/shop-interface-copy.json";
import { basePrice, deliveryWindow, supplierImageSource, type Product } from "./api";

export function useShopCopy() {
  const { locale } = useUI();
  const copy = shopCopy[locale];
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const t = (key: keyof typeof shopCopy.de, values: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
  const date = (value: string) => Number.isNaN(Date.parse(value)) ? t("dateUnknown") : new Intl.DateTimeFormat(locale).format(new Date(value));
  return { t, number, money, date, locale };
}

export function ProductImage({ src, alt, large = false }: { src: string | null | undefined; alt: string; large?: boolean }) {
  const { t } = useShopCopy();
  const safeSrc = supplierImageSource(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = safeSrc !== null && failedSrc === safeSrc;
  return <div className={"tk-image" + (large ? " is-large" : "")}>
    {safeSrc && !failed ? <img key={safeSrc} src={safeSrc} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{ objectFit: "contain" }} onError={() => setFailedSrc(safeSrc)} /> :
      <span className="tk-image-missing" role="status">{failed ? t("imageError") : t("imageMissing")}</span>}
  </div>;
}

export function StockLabel({ stock }: { stock: number | null | undefined }) {
  const { t, number } = useShopCopy();
  if (typeof stock !== "number" || !Number.isSafeInteger(stock) || stock < 0) return <span className="tk-stock" data-testid="stock-label">{t("stockUnknown")}</span>;
  return stock > 0 ? <span className="tk-stock is-in" data-testid="stock-label">{t("stockCount", { count: number(stock) })}</span> : <span className="tk-stock is-out" data-testid="stock-label">{t("stockOut")}</span>;
}

/** Delivery window from stored data only; nothing when the product has no configured window. */
export function DeliveryLabel({ min, max, testId = "delivery-label" }: { min: number | null | undefined; max: number | null | undefined; testId?: string }) {
  const { t, number } = useShopCopy();
  const window = deliveryWindow(min, max);
  if (!window) return null;
  return <span className="tk-delivery" data-testid={testId}>{window.min === window.max ? t(window.min === 1 ? "deliveryOneDay" : "deliveryDays", { days: number(window.min) }) : t("deliveryRange", { min: number(window.min), max: number(window.max) })}</span>;
}

/** Grundpreis per 1 kg / 1 l / 1 m, only from stored net content and a released price. */
export function BasePriceLabel({ priceCents, content, unit, testId = "base-price" }: { priceCents: number | null | undefined; content: number | null | undefined; unit: string | null | undefined; testId?: string }) {
  const { t, money } = useShopCopy();
  const base = basePrice(priceCents, content, unit);
  if (!base) return null;
  return <span className="tk-meta tk-base-price" data-testid={testId}>{t("basePrice", { price: money(base.cents), unit: base.unit })}</span>;
}

/** Eligibility chips only from structured data; "universal" is shown only when the data says so. */
export function EligibilityChips({ suitability, testId = "eligibility" }: { suitability: string[] | undefined; testId?: string }) {
  const { t } = useShopCopy();
  const values = (suitability || []).filter(value => typeof value === "string" && value.trim()).slice(0, 3);
  if (!values.length) return null;
  return <ul className="tk-chips" aria-label={t("eligibilityLabel")} data-testid={testId}>{values.map(value => <li key={value} className="tk-tag">{value.trim().toLowerCase() === "universal" ? t("eligibilityUniversal") : value}</li>)}</ul>;
}

export function ProductCard({ product }: { product: Product }) {
  const { t, money } = useShopCopy();
  const available = typeof product.stock === "number" && product.stock > 0;
  return <li className="tk-card" data-testid={"product-card-" + product.id}>
    <SiteLink href={"/teileklar/produkt/" + product.id} className="tk-card-link" data-testid={"product-link-" + product.id}>
      <ProductImage src={product.image} alt={product.name} />
      {product.manufacturer && <span className="tk-meta" data-testid={"product-manufacturer-" + product.id}>{product.manufacturer}</span>}
      <strong className="tk-card-name">{product.name}</strong>
    </SiteLink>
    <EligibilityChips suitability={product.suitability} testId={"product-eligibility-" + product.id} />
    <span className="tk-meta">{t("sku")} {product.sku}{product.ean ? " · " + t("ean") + " " + product.ean : ""}</span>
    <span className="tk-price" data-testid={"product-price-" + product.id}>{product.price_cents === null ? t("priceUnavailable") : <>{money(product.price_cents)} <small>{t("taxShipping")}</small></>}</span>
    <BasePriceLabel priceCents={product.price_cents} content={product.net_content} unit={product.unit} testId={"product-base-price-" + product.id} />
    <span className="tk-availability"><StockLabel stock={product.stock} />{available && <DeliveryLabel min={product.delivery_days_min} max={product.delivery_days_max} testId={"product-delivery-" + product.id} />}</span>
  </li>;
}
