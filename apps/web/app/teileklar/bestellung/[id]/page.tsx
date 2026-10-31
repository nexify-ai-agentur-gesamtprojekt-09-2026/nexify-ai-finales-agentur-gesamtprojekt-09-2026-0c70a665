import ShopFrame from "../../../../components/shop/ShopFrame";
import OrderConfirmation from "../../../../components/shop/OrderConfirmation";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopFrame title="Ihre Bestellung" testId="shop-order" crumbs={[["/teileklar/bestellungen", "Bestellungen"]]}><OrderConfirmation id={id} /></ShopFrame>;
}
