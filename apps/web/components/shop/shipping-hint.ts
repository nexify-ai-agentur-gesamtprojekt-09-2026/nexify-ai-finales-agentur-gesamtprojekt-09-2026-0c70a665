/** Free-shipping progress shown in the cart. The threshold comes from the server, never from the client. */
export type ShippingHint = { kind: "reached" } | { kind: "remaining"; remaining_cents: number; threshold_cents: number } | null;

export function freeShippingHint(cart: { count?: number; subtotal_cents: number; free_shipping_threshold_cents?: number }): ShippingHint {
  const threshold = cart.free_shipping_threshold_cents;
  if (!cart.count || !Number.isSafeInteger(threshold) || (threshold as number) <= 0) return null;
  if (cart.subtotal_cents >= (threshold as number)) return { kind: "reached" };
  return { kind: "remaining", remaining_cents: (threshold as number) - cart.subtotal_cents, threshold_cents: threshold as number };
}
