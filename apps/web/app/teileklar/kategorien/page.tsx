import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import CategoryList from "../../../components/shop/CategoryList";
export const metadata = pageMetadata("/teileklar/kategorien", "Kategorien · TEILEKLAR", "Alle Kategorien des TEILEKLAR-Katalogs auf einen Blick: Bremsen, Filter, Beleuchtung und mehr. Direkt zur passenden Kategorie.");
export default function CategoriesPage() {
  return <><SeoJsonLd description="Alle Kategorien des TEILEKLAR-Katalogs auf einen Blick: Bremsen, Filter, Beleuchtung und mehr. Direkt zur passenden Kategorie." /><ShopFrame title="Kategorien" testId="shop-categories" crumbs={[["/teileklar/shop", "Shop"]]}><CategoryList /></ShopFrame></>;
}
