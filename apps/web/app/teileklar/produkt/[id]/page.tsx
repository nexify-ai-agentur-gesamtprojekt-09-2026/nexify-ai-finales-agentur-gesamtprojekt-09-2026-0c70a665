import ShopFrame from "../../../../components/shop/ShopFrame";
import ProductDetail from "../../../../components/shop/ProductDetail";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopFrame title="Artikel" testId="shop-product" crumbs={[["/teileklar/shop", "Shop"]]}><ProductDetail id={id} /></ShopFrame>;
}
