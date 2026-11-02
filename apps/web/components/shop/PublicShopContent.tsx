"use client";
import { SiteLink } from "../Router";
import { useShopCopy } from "./ProductCard";
import CatalogView, { SearchBar } from "./CatalogView";
import CategoryList from "./CategoryList";
import ProductDetail from "./ProductDetail";

/** Route projection for the public Vite catalogue; no cart/checkout activation. */
export function publicShopRoute(pageId: string, pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const q = (params.get("q") || "").trim().slice(0, 120);
  const requestedPage = params.get("seite") || "1";
  const page = /^[1-9]\d*$/.test(requestedPage) && Number.isSafeInteger(Number(requestedPage)) ? Number(requestedPage) : 1;
  if (pageId === "tk-shop") return { kind: "shop" as const, page };
  if (pageId === "tk-search") return { kind: "search" as const, q, page };
  if (pageId === "tk-categories") return { kind: "categories" as const };
  if (pageId === "tk-category") {
    const id = /^\/teileklar\/kategorie\/([1-9]\d*)\/?$/.exec(pathname)?.[1];
    return id && Number.isSafeInteger(Number(id)) ? { kind: "category" as const, category: Number(id), page, base: "/teileklar/kategorie/" + id } : { kind: "categories" as const };
  }
  if (pageId === "tk-product") {
    const id = /^\/teileklar\/produkt\/([A-Za-z0-9_-]{1,120})\/?$/.exec(pathname)?.[1];
    return id ? { kind: "product" as const, id } : { kind: "product-search" as const };
  }
  return { kind: "none" as const };
}
export default function PublicShopContent({ pageId, pathname, search }: { pageId: string; pathname: string; search: string }) {
  const { t } = useShopCopy();
  const route = publicShopRoute(pageId, pathname, search);
  switch (route.kind) {
    case "shop": return <section data-testid="public-shop-catalog"><SearchBar /><CategoryList compact /><CatalogView base="/teileklar/shop" page={route.page} /></section>;
    case "search": return <section data-testid="public-shop-search"><SearchBar initial={route.q} /><CatalogView q={route.q} page={route.page} base="/teileklar/suche" /></section>;
    case "categories": return <CategoryList />;
    case "category": return <CatalogView category={route.category} page={route.page} base={route.base} />;
    case "product": return <ProductDetail key={route.id} id={route.id} readOnly />;
    case "product-search": return <p>{t("productSearchBefore")} <SiteLink href="/teileklar/suche">{t("productSearchLink")}</SiteLink>{t("productSearchAfter")}</p>;
    default: return null;
  }
}
