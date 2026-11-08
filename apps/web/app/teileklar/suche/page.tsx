import ShopFrame from "../../../components/shop/ShopFrame";
import CatalogView, { SearchBar } from "../../../components/shop/CatalogView";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("tk-search", false);
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; seite?: string }> }) {
  const { q = "", seite } = await searchParams;
  return <ShopFrame title="Teile suchen" testId="shop-search" crumbs={[["/teileklar/shop", "Shop"]]}><SearchBar initial={q} /><CatalogView q={q} base="/teileklar/suche" page={Math.max(1, Number(seite) || 1)} /></ShopFrame>;
}
