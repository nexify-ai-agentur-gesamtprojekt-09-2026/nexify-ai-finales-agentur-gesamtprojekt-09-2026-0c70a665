"use client";
import { SiteLink } from "../Router";
import { money, type Product } from "./api";

export function ProductImage({ src, alt, large = false }: { src: string | null; alt: string; large?: boolean }) {
  return <div className={"tk-image" + (large ? " is-large" : "")}>{src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <span className="tk-image-missing">Kein Bild vom Lieferanten</span>}</div>;
}

export function StockLabel({ stock }: { stock: number }) {
  return stock > 0 ? <span className="tk-stock is-in" data-testid="stock-label">Lagerbestand beim Lieferanten: {stock}</span> : <span className="tk-stock is-out" data-testid="stock-label">Derzeit nicht auf Lager</span>;
}

export function ProductCard({ product }: { product: Product }) {
  return <li className="tk-card" data-testid={"product-card-" + product.id}>
    <SiteLink href={"/teileklar/produkt/" + product.id} className="tk-card-link" data-testid={"product-link-" + product.id}>
      <ProductImage src={product.image} alt={product.name} />
      <strong className="tk-card-name">{product.name}</strong>
    </SiteLink>
    <span className="tk-meta">SKU {product.sku}{product.ean ? " · EAN " + product.ean : ""}</span>
    <span className="tk-price" data-testid={"product-price-" + product.id}>{money(product.price_cents)} <small>inkl. MwSt.</small></span>
    <StockLabel stock={product.stock} />
  </li>;
}
