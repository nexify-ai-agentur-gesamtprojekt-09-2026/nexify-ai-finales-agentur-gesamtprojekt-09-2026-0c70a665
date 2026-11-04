"use client";
import { useShopCopy } from "./ProductCard";

// Only claims the platform can back today (concept 1.3). Free shipping or free returns
// need a configured and released value first; none exists, so they are not offered here.
export const TRUST_ITEMS = ["trustPrices", "trustWithdrawal", "trustPayment", "trustContact", "trustWorkshop"] as const;
export const TRUST_LINE = ["trustWithdrawal", "trustPayment", "trustContact"] as const;
export type TrustItem = typeof TRUST_ITEMS[number];

export default function TrustBar({ items = TRUST_ITEMS, compact = false, testId = "trust-bar" }: { items?: readonly TrustItem[]; compact?: boolean; testId?: string }) {
  const { t } = useShopCopy();
  return <ul className={"tk-trust" + (compact ? " is-compact" : "")} aria-label={t("trustLabel")} data-testid={testId}>
    {items.map(key => <li key={key} data-testid={testId + "-" + key}>{t(key)}</li>)}
  </ul>;
}
