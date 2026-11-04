"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SiteLink, useSitePathname } from "../Router";
import { api, supplierImageSource, type Product } from "./api";
import { ProductImage, useShopCopy } from "./ProductCard";
import "./ProductShowcase.css";

// Hero stage built only from real catalogue packshots (owner decision 04.11.2026).
// Without at least MIN_ITEMS available products with a safe supplier image the
// approved fallback (editorial film) stays; nothing is drawn or invented.
const SHOWCASE_PAGES = new Set(["tk-home", "tk-shop", "tk-categories", "tk-category", "tk-search"]);
const MIN_ITEMS = 3, MAX_ITEMS = 4;
export const hasProductShowcase = (pageId: string) => SHOWCASE_PAGES.has(pageId);

export function selectShowcaseItems(items: unknown): Product[] {
  if (!Array.isArray(items)) return [];
  const picked = items.filter((p): p is Product => !!p && typeof p === "object" && typeof (p as Product).id === "string" && (p as Product).id.length > 0
    && typeof (p as Product).name === "string" && supplierImageSource((p as Product).image) !== null && (p as Product).in_stock !== false).slice(0, MAX_ITEMS);
  return picked.length >= MIN_ITEMS ? picked : [];
}

function categoryFromPath(pathname: string | undefined): number | undefined {
  if (!pathname) return undefined;
  const id = /^\/teileklar\/kategorie\/([1-9]\d*)\/?$/.exec(pathname)?.[1];
  return id && Number.isSafeInteger(Number(id)) ? Number(id) : undefined;
}

export default function ProductShowcase({ pageId, fallback }: { pageId: string; fallback: ReactNode }) {
  const { t } = useShopCopy();
  const [items, setItems] = useState<Product[]>([]);
  // Category comes from the router path so a client-side switch between two
  // categories (same pageId) reloads the stage instead of keeping stale packshots.
  const routerPath = useSitePathname();
  const pathname = routerPath && routerPath !== "/" ? routerPath : (typeof window === "undefined" ? routerPath : window.location.pathname);
  const category = pageId === "tk-category" ? categoryFromPath(pathname) : undefined;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const params = new URLSearchParams({ q: "", page: "1" });
    if (category !== undefined) params.set("category", String(category));
    api<{ items?: unknown }>("/api/shop/products?" + params, { signal: controller.signal })
      .then(data => { if (current) setItems(selectShowcaseItems(data.items)); })
      .catch(() => { if (current) setItems([]); });
    return () => { current = false; controller.abort(); };
  }, [pageId, category]);
  if (items.length === 0) return <>{fallback}</>;
  return <figure className="tk-showcase" data-testid="product-showcase">
    <ul className="tk-showcase-grid" aria-label={t("showcaseLabel")}>
      {items.map(p => <li key={p.id}><SiteLink className="tk-showcase-item" href={"/teileklar/produkt/" + encodeURIComponent(p.id)} data-testid="showcase-item">
        <ProductImage src={p.image} alt={p.name} /><span className="tk-showcase-name">{p.name}</span>
      </SiteLink></li>)}
    </ul>
    <figcaption>{t("showcaseCaption")}</figcaption>
  </figure>;
}
