import facts from "../../../../config/fakten.json";

const fact = (id: string) => (facts.fakten as { id: string; wert?: string }[]).find(f => f.id === id)?.wert || "";

export default function SellerInfo() {
  return <section className="tk-seller" aria-label="Verkäufer und Lieferung" data-testid="checkout-seller-info">
    <p><strong>Verkäufer:</strong> <span data-testid="checkout-seller">{fact("teileklar.verkaeufer")}</span></p>
    <p><strong>Lieferländer:</strong> <span data-testid="checkout-countries">{fact("teileklar.lieferlaender")}</span></p>
  </section>;
}
