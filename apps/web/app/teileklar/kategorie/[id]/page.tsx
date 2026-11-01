import ShopFrame from "../../../../components/shop/ShopFrame";
import CatalogView from "../../../../components/shop/CatalogView";
import CategoryTitle from "../../../../components/shop/CategoryTitle";
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ seite?: string }> }) {
  const [{ id }, { seite }] = await Promise.all([params, searchParams]);
  return <ShopFrame title="Kategorie" testId="shop-category" crumbs={[["/teileklar/shop", "Shop"], ["/teileklar/kategorien", "Kategorien"]]}><CategoryTitle id={Number(id)} /><CatalogView category={Number(id)} base={"/teileklar/kategorie/" + id} page={Math.max(1, Number(seite) || 1)} /></ShopFrame>;
}
