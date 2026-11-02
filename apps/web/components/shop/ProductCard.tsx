"use client";
import { useState } from "react";
import { SiteLink } from "../Router";
import { useUI } from "../Workspace";
import shopCopy from "../../../../config/shop-interface-copy.json";
import { supplierImageSource, type Product } from "./api";

export function useShopCopy() {
  const { locale } = useUI();
  const copy = shopCopy[locale];
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const t = (key: keyof typeof shopCopy.de, values: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
  const date = (value: string) => Number.isNaN(Date.parse(value)) ? t("dateUnknown") : new Intl.DateTimeFormat(locale).format(new Date(value));
  return { t, number, money, date };
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

export function ProductCard({ product }: { product: Product }) {
  const { t, money } = useShopCopy();
  return <li className="tk-card" data-testid={"product-card-" + product.id}>
    <SiteLink href={"/teileklar/produkt/" + product.id} className="tk-card-link" data-testid={"product-link-" + product.id}>
      <ProductImage src={product.image} alt={product.name} />
      <strong className="tk-card-name">{product.name}</strong>
    </SiteLink>
    <span className="tk-meta">{t("sku")} {product.sku}{product.ean ? " · " + t("ean") + " " + product.ean : ""}</span>
    <span className="tk-price" data-testid={"product-price-" + product.id}>{product.price_cents === null ? t("priceUnavailable") : <>{money(product.price_cents)} <small>{t("taxShipping")}</small></>}</span>
    <StockLabel stock={product.stock} />
  </li>;
}
