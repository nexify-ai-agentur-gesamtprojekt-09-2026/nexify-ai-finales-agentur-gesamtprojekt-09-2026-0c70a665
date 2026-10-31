"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SiteLink } from "../Router";
import { api, CART_EVENT, type Cart } from "./api";
import "./shop.css";

const NAV: [string, string][] = [["/teileklar/shop", "Shop"], ["/teileklar/kategorien", "Kategorien"], ["/teileklar/werkstatt", "Werkstattsuche"], ["/teileklar/bestellungen", "Bestellungen"]];

function AccountLink() {
  const [user, setUser] = useState<{ email: string; role: string } | null | false>(null);
  useEffect(() => { api<{ email: string; role: string }>("/api/auth/me").then(setUser).catch(() => setUser(false)); }, []);
  if (user === null) return null;
  if (!user) return <SiteLink href="/anmelden" data-testid="shop-nav-login">Anmelden</SiteLink>;
  return <>{user.role === "admin" && <SiteLink href="/teileklar/admin" data-testid="shop-nav-admin">Verwaltung</SiteLink>}<button type="button" className="outline-button" data-testid="shop-nav-logout" onClick={async () => { await api("/api/auth/logout", { method: "POST", json: {} }); window.location.assign("/anmelden"); }}>Abmelden ({user.email})</button></>;
}

function CartLink() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    api<Cart>("/api/shop/cart").then(cart => setCount(cart.count)).catch(() => setCount(null));
    const update = (event: Event) => setCount((event as CustomEvent<number>).detail);
    window.addEventListener(CART_EVENT, update);
    return () => window.removeEventListener(CART_EVENT, update);
  }, []);
  return <SiteLink href="/teileklar/warenkorb" className="tk-nav-cart" data-testid="shop-nav-cart">Warenkorb{count ? <span className="tk-badge" data-testid="shop-nav-cart-count">{count}</span> : null}</SiteLink>;
}

export default function ShopFrame({ title, kicker = "Shop", intro, crumbs = [], children, testId }: { title: string; kicker?: string; intro?: ReactNode; crumbs?: [string, string][]; children: ReactNode; testId: string }) {
  return <section className="public-page tk-shop context-teileklar" data-testid={testId} aria-labelledby={testId + "-title"}>
    <nav className="content-breadcrumb" aria-label="Sie sind hier"><ol>
      <li><SiteLink href="/teileklar">TEILEKLAR</SiteLink><span aria-hidden="true">/</span></li>
      {crumbs.map(([href, label]) => <li key={href}><SiteLink href={href}>{label}</SiteLink><span aria-hidden="true">/</span></li>)}
      <li><span aria-current="page">{title}</span></li>
    </ol></nav>
    <nav className="tk-shop-nav" aria-label="Shopbereiche" data-testid="shop-nav">{NAV.map(([href, label]) => <SiteLink key={href} href={href}>{label}</SiteLink>)}<CartLink /><AccountLink /></nav>
    <header className="tk-shop-head"><span className="eyebrow">TEILEKLAR / {kicker}</span><h1 id={testId + "-title"}>{title}</h1>{intro && <p className="tk-intro">{intro}</p>}</header>
    {children}
  </section>;
}
