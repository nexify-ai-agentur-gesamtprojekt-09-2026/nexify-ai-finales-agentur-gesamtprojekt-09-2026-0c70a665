"use client";
import { useState } from "react";
import { useShopCopy } from "./ProductCard";

export type AddressData = { first_name: string; last_name: string; street: string; zip: string; city: string; country: string; email: string; phone: string };
export const EMPTY_ADDRESS: AddressData = { first_name: "", last_name: "", street: "", zip: "", city: "", country: "DE", email: "", phone: "" };
const FIELDS: [keyof AddressData, "addrFirstName" | "addrLastName" | "addrStreet" | "addrZip" | "addrCity" | "addrEmail" | "addrPhone", string, boolean][] = [
  ["first_name", "addrFirstName", "given-name", true], ["last_name", "addrLastName", "family-name", true], ["street", "addrStreet", "street-address", true],
  ["zip", "addrZip", "postal-code", true], ["city", "addrCity", "address-level2", true], ["email", "addrEmail", "email", true], ["phone", "addrPhone", "tel", false]];
// Delivery countries of apps/shop-api checkout_api.COUNTRIES; names come from the browser's region names.
const COUNTRIES = ["DE", "AT", "NL", "BE", "LU"];
const MESSAGES = { required: "addrRequired", invalid: "addrInvalid", unsupported: "addrUnsupported" } as const;
const message = (code: string) => MESSAGES[code as keyof typeof MESSAGES] || MESSAGES.invalid;

export function validateAddress(a: AddressData) {
  const errors: Record<string, string> = {};
  for (const [key, , , required] of FIELDS) if (required && !a[key].trim()) errors[key] = "required";
  if (a.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email.trim())) errors.email = "invalid";
  if (a.country === "DE" && a.zip.trim() && !/^\d{5}$/.test(a.zip.trim())) errors.zip = "invalid";
  return errors;
}

export default function AddressStep({ value, onNext }: { value: AddressData; onNext: (address: AddressData, serverCheck: (a: AddressData) => Promise<Record<string, string>>) => void }) {
  const { t, locale } = useShopCopy();
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const [address, setAddress] = useState(value), [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const set = (key: keyof AddressData, v: string) => setAddress(current => ({ ...current, [key]: v }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const local = validateAddress(address); setErrors(local);
    if (Object.keys(local).length) { document.getElementById("addr-" + Object.keys(local)[0])?.focus(); return; }
    setBusy(true);
    onNext(address, async a => { const remote = await fetch("/api/shop/checkout/validate-address", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) }).then(async r => r.ok ? {} : ((await r.json()).detail?.fields || { street: "invalid" })); setErrors(remote); setBusy(false); return remote; });
  }
  return <form className="tk-form" noValidate onSubmit={submit} data-testid="checkout-address-form">
    <div className="tk-form-grid">{FIELDS.map(([key, label, auto]) => <div key={key} className={"tk-field" + (key === "street" || key === "email" ? " is-wide" : "")}>
      <label htmlFor={"addr-" + key}>{t(label)}</label>
      <input id={"addr-" + key} autoComplete={auto} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={address[key]} onChange={event => set(key, event.target.value)}
        aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? "addr-" + key + "-error" : undefined} data-testid={"checkout-address-" + key} />
      {errors[key] && <p id={"addr-" + key + "-error"} role="alert" className="tk-field-error" data-testid={"checkout-address-" + key + "-error"}>{t(message(errors[key]))}</p>}
    </div>)}
      <div className="tk-field"><label htmlFor="addr-country">{t("addrCountry")}</label><select id="addr-country" value={address.country} onChange={event => set("country", event.target.value)} data-testid="checkout-address-country">{COUNTRIES.map(code => <option key={code} value={code}>{regions.of(code) || code}</option>)}</select>
        {errors.country && <p role="alert" className="tk-field-error">{t(message(errors.country))}</p>}</div>
    </div>
    <button className="primary-button" type="submit" disabled={busy} data-testid="checkout-address-continue">{t("toShipping")}</button>
  </form>;
}
