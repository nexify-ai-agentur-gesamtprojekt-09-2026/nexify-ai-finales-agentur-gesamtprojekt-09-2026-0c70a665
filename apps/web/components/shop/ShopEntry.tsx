"use client";
import { SiteLink } from "../Router";
import {HcArrow} from '../HcArrow';
import { useShopCopy } from "./ProductCard";
import CategoryList from "./CategoryList";
import { SearchBar } from "./CatalogView";
import "./shop.css";

export default function ShopEntry() {
  const { t } = useShopCopy();
  return <section className="tk-home-entry" aria-labelledby="tk-entry-title" data-testid="teileklar-shop-entry">
    <span className="eyebrow">{t("entryEyebrow")}</span>
    <h2 id="tk-entry-title">{t("entryTitle")}</h2>
    <SearchBar />
    <CategoryList compact />
    <div className="tk-actions"><SiteLink href="/teileklar/shop" className="hc-text-link" data-testid="entry-shop-link">{t("goShop")}<HcArrow/></SiteLink><SiteLink href="/teileklar/werkstatt" className="hc-text-link" data-testid="entry-workshop-link">{t("findWorkshop")}<HcArrow/></SiteLink></div>
  </section>;
}
