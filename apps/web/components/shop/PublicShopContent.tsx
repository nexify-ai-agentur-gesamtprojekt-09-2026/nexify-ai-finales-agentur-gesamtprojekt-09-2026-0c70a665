"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { useShopCopy } from "./ProductCard";
import CatalogView, { SearchBar } from "./CatalogView";
import CategoryList from "./CategoryList";
import ProductDetail from "./ProductDetail";
import CartView from "./CartView";
import Checkout from "./Checkout";
import WorkshopFinder from "./WorkshopFinder";
import WorkshopDetail from "./WorkshopDetail";
import TrustBar from "./TrustBar";
import { api, CART_EVENT, type Cart } from "./api";
import type { Locale } from "../../lib/i18n";
import "./shop.css";

/** Route projection shared by the public catalogue, checkout and workshop journey. */
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
  if (pageId === "tk-cart") return { kind: "cart" as const };
  if (pageId === "tk-checkout") return { kind: "checkout" as const };
  if (pageId === "tk-workshop") {
    const id = /^\/teileklar\/werkstatt\/([A-Za-z0-9_-]{1,120})\/?$/.exec(pathname)?.[1];
    if (id) return { kind: "workshop-detail" as const, id };
    const requestedRadius = Number(params.get("umkreis") || "25");
    const radius = [10, 25, 50, 100].includes(requestedRadius) ? requestedRadius : 25;
    return { kind: "workshops" as const, q, radius };
  }
  return { kind: "none" as const };
}

const mobileCopy: Record<Locale, { aria: string; links: readonly (readonly [string, string])[]; cart: string }> = {
  de: { aria: "TEILEKLAR Schnellzugriff", links: [["/teileklar/shop", "Shop"], ["/teileklar/suche", "Suche"], ["/teileklar/fahrzeug-und-passung", "Fahrzeug"], ["/teileklar/werkstatt", "Werkstatt"]], cart: "Warenkorb" },
  nl: { aria: "TEILEKLAR snelkeuze", links: [["/teileklar/shop", "Shop"], ["/teileklar/suche", "Zoeken"], ["/teileklar/fahrzeug-und-passung", "Voertuig"], ["/teileklar/werkstatt", "Werkplaats"]], cart: "Mandje" },
  fr: { aria: "Accès rapide TEILEKLAR", links: [["/teileklar/shop", "Boutique"], ["/teileklar/suche", "Recherche"], ["/teileklar/fahrzeug-und-passung", "Véhicule"], ["/teileklar/werkstatt", "Atelier"]], cart: "Panier" },
  en: { aria: "TEILEKLAR quick access", links: [["/teileklar/shop", "Shop"], ["/teileklar/suche", "Search"], ["/teileklar/fahrzeug-und-passung", "Vehicle"], ["/teileklar/werkstatt", "Workshop"]], cart: "Cart" },
};

function MobileCommerceNav({ pathname }: { pathname: string }) {
  const { locale = "de" } = useShopCopy();
  const copy = mobileCopy[locale];
  const [count, setCount] = useState(0);
  useEffect(() => {
    const changed = (event: Event) => setCount(Number((event as CustomEvent<number>).detail) || 0);
    window.addEventListener(CART_EVENT, changed);
    api<Cart>("/api/shop/cart").then(cart => setCount(cart.count)).catch(() => undefined);
    return () => window.removeEventListener(CART_EVENT, changed);
  }, []);
  return <nav className="tk-mobile-commerce-nav" aria-label={copy.aria}>
    {copy.links.map(([href, label]) => <SiteLink href={href} key={href} aria-current={pathname === href ? "page" : undefined}>{label}</SiteLink>)}
    <SiteLink href="/teileklar/warenkorb" className="tk-mobile-cart" aria-current={pathname === "/teileklar/warenkorb" || pathname === "/teileklar/kasse" ? "page" : undefined}>{copy.cart}{count > 0 && <span>{count}</span>}</SiteLink>
  </nav>;
}

export default function PublicShopContent({ pageId, pathname, search }: { pageId: string; pathname: string; search: string }) {
  const { t } = useShopCopy();
  const route = publicShopRoute(pageId, pathname, search);
  let content = null;
  switch (route.kind) {
    case "shop": content = <section className="tk-storefront" data-testid="public-shop-catalog"><div className="tk-storefront-search"><SearchBar /></div><TrustBar testId="shop-trust" /><CategoryList compact /><CatalogView base="/teileklar/shop" page={route.page} /></section>; break;
    case "search": content = <section className="tk-storefront" data-testid="public-shop-search"><div className="tk-storefront-search"><SearchBar initial={route.q} /></div><CatalogView q={route.q} page={route.page} base="/teileklar/suche" /></section>; break;
    case "categories": content = <CategoryList />; break;
    case "category": content = <CatalogView category={route.category} page={route.page} base={route.base} />; break;
    case "product": content = <ProductDetail key={route.id} id={route.id} />; break;
    case "product-search": content = <p>{t("productSearchBefore")} <SiteLink href="/teileklar/suche">{t("productSearchLink")}</SiteLink>{t("productSearchAfter")}</p>; break;
    case "cart": content = <CartView />; break;
    case "checkout": content = <Checkout />; break;
    case "workshops": content = <WorkshopFinder q={route.q} radius={route.radius} />; break;
    case "workshop-detail": content = <WorkshopDetail id={route.id} />; break;
    default: return null;
  }
  return <div className="tk-public-commerce">{content}<MobileCommerceNav pathname={pathname} /></div>;
}
