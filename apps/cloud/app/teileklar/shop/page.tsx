import ShopFrame from "../../../components/shop/ShopFrame";
import CatalogView, { SearchBar } from "../../../components/shop/CatalogView";
import CategoryList from "../../../components/shop/CategoryList";
export const metadata = { title: "Shop · TEILEKLAR" };
export default async function ShopHome({ searchParams }: { searchParams: Promise<{ seite?: string }> }) {
  const { seite } = await searchParams;
  return <ShopFrame title="Autoteile und Zubehör" testId="shop-home" intro="Artikel aus dem Sortiment Auto & Motorrad unseres Lieferanten BigBuy. Preise inklusive Mehrwertsteuer; die Passung zu Ihrem Fahrzeug ist nicht geprüft."><SearchBar /><CategoryList compact /><CatalogView base="/teileklar/shop" page={Math.max(1, Number(seite) || 1)} /></ShopFrame>;
}
