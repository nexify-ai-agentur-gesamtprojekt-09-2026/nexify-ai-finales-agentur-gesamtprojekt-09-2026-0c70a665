"use client";
import { SiteLink } from "../Router";
import ProductShowcase from "./ProductShowcase";
import { useShopCopy } from "./ProductCard";

// Kapitel 0 of the shop story on the agency home: copy + CTA always, real
// catalogue packshots only when the live catalogue delivers them.
export default function ShopHomeTeaser() {
  const { t } = useShopCopy();
  return <section id="teileklar-shop" className="hc-section hc-container tk-home-teaser" aria-labelledby="tk-home-teaser-title" data-testid="shop-home-teaser">
    <div className="tk-home-teaser-copy">
      <span className="hc-kicker">{t("teaserKicker")}</span>
      <h2 id="tk-home-teaser-title">{t("teaserTitle")}</h2>
      <p>{t("teaserBody")}</p>
      <div className="tk-home-teaser-actions">
        <SiteLink className="hc-text-link" href="/teileklar/shop" data-testid="shop-home-teaser-cta">{t("teaserCta")} <span aria-hidden="true">→</span></SiteLink>
        <SiteLink className="hc-text-link" href="/teileklar/werkstatt">{t("teaserWorkshop")}</SiteLink>
      </div>
    </div>
    <ProductShowcase pageId="home" fallback={null} />
  </section>;
}
