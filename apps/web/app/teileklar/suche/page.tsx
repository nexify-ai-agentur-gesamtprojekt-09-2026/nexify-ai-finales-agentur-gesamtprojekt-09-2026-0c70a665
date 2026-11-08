import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import CatalogView, { SearchBar } from "../../../components/shop/CatalogView";
export const metadata = pageMetadata("/teileklar/suche", "Suche · TEILEKLAR", "Teile nach Fahrzeug und Kategorie suchen: Treffer mit Verfuegbarkeit und Preis. Ohne passendes Ergebnis zeigen wir Alternativen und den direkten Kontakt.");
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; seite?: string }> }) {
  const { q = "", seite } = await searchParams;
  return <><SeoJsonLd description="Teile nach Fahrzeug und Kategorie suchen: Treffer mit Verfuegbarkeit und Preis. Ohne passendes Ergebnis zeigen wir Alternativen und den direkten Kontakt." /><ShopFrame title="Teile suchen" testId="shop-search" crumbs={[["/teileklar/shop", "Shop"]]}><SearchBar initial={q} /><CatalogView q={q} base="/teileklar/suche" page={Math.max(1, Number(seite) || 1)} /></ShopFrame></>;
}
