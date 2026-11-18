"use client";
import { SiteLink } from "../Router";
import {HcArrow} from '../HcArrow';
import { useShopCopy } from "./ProductCard";
import CategoryList from "./CategoryList";
import { SearchBar } from "./CatalogView";
import "./shop.css";
import { STORY, type StoryLocale } from "./product-story-copy";

export default function ShopEntry() {
  const { t, locale } = useShopCopy();
  const story = STORY[(locale as StoryLocale) in STORY ? (locale as StoryLocale) : "de"];
  return <section className="tk-home-entry" aria-labelledby="tk-entry-title" data-testid="teileklar-shop-entry">
    <span className="eyebrow">{t("entryEyebrow")}</span>
    <h2 id="tk-entry-title">{t("entryTitle")}</h2>
    <SearchBar />
    <ul className="tk-story-trust" data-testid="entry-trust">{story.trust.map(item => <li key={item}>{item}</li>)}</ul>
    <CategoryList compact />
    <div className="tk-actions"><SiteLink href="/teileklar/shop" className="hc-text-link" data-testid="entry-shop-link">{t("goShop")}<HcArrow/></SiteLink><SiteLink href="/teileklar/werkstatt" className="hc-text-link" data-testid="entry-workshop-link">{t("findWorkshop")}<HcArrow/></SiteLink></div>
    <h3>{story.stepsTitle}</h3>
    <ol className="tk-story-steps" data-testid="entry-steps">{story.steps.map(([title, body], index) => <li key={title}><span className="tk-story-num" aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
  </section>;
}
