"use client";
import { SiteLink } from "../Router";
import { useShopCopy } from "./ProductCard";
import CategoryList from "./CategoryList";
import { SearchBar } from "./CatalogView";
import TrustBar from "./TrustBar";
import "./shop.css";

export default function ShopEntry() {
  const { t } = useShopCopy();
  return <section className="tk-home-entry" aria-labelledby="tk-entry-title" data-testid="teileklar-shop-entry">
    <span className="eyebrow">{t("entryEyebrow")}</span>
    <h2 id="tk-entry-title">{t("entryTitle")}</h2>
    <TrustBar testId="entry-trust" />
    <SearchBar />
    <CategoryList compact />
    <div className="tk-actions"><SiteLink href="/teileklar/shop" className="content-action-link" data-testid="entry-shop-link">{t("goShop")}</SiteLink><SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid="entry-workshop-link">{t("findWorkshop")}</SiteLink></div>
  </section>;
}
