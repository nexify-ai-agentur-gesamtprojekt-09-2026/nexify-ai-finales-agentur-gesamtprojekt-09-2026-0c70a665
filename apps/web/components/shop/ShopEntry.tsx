"use client";
import { SiteLink } from "../Router";
import CategoryList from "./CategoryList";
import { SearchBar } from "./CatalogView";
import "./shop.css";

export default function ShopEntry() {
  return <section className="tk-home-entry" aria-labelledby="tk-entry-title" data-testid="teileklar-shop-entry">
    <span className="eyebrow">TEILEKLAR / Shop</span>
    <h2 id="tk-entry-title">Ersatzteile finden und bestellen</h2>
    <SearchBar />
    <CategoryList compact />
    <div className="tk-actions"><SiteLink href="/teileklar/shop" className="content-action-link" data-testid="entry-shop-link">Zum Shop</SiteLink><SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid="entry-workshop-link">Werkstatt in der Nähe suchen</SiteLink></div>
  </section>;
}
