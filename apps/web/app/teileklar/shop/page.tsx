import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import CatalogView, { SearchBar } from "../../../components/shop/CatalogView";
import CategoryList from "../../../components/shop/CategoryList";
export const metadata = pageMetadata("/teileklar/shop", "Shop · TEILEKLAR", "Kuratierter Kfz-Teilekatalog mit Kategorien, Suche und direkter Bestellung. Versandkostenfrei ab 75 Euro Warenwert.");
export default async function ShopHome({ searchParams }: { searchParams: Promise<{ seite?: string }> }) {
  const { seite } = await searchParams;
  return <><SeoJsonLd description="Kuratierter Kfz-Teilekatalog mit Kategorien, Suche und direkter Bestellung. Versandkostenfrei ab 75 Euro Warenwert." /><ShopFrame title="Autoteile und Zubehör" testId="shop-home" intro="Artikel aus dem Sortiment Auto & Motorrad unseres Lieferanten BigBuy. Preise inklusive Mehrwertsteuer; die Passung zu Ihrem Fahrzeug ist nicht geprüft."><SearchBar /><CategoryList compact /><CatalogView base="/teileklar/shop" page={Math.max(1, Number(seite) || 1)} /></ShopFrame></>;
}
