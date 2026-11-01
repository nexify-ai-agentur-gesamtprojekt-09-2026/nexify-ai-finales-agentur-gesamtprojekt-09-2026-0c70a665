"use client";
import {useState, useMemo} from "react";
import {SiteLink} from "./Router";
import type {Locale} from "./../lib/i18n";
import {money, netMinor, VAT_RATE, type ShopProduct} from "./teileklar-shop-data";

export type CheckoutLine = {product: ShopProduct; qty: number};

const copy = {
  de: {
    steps: ["Adresse", "Versand", "Zahlung", "Prüfen"],
    stepOf: "Schritt", of: "von",
    address: "Lieferadresse", first: "Vorname", last: "Nachname", street: "Straße und Hausnummer", zip: "PLZ", city: "Ort", email: "E-Mail",
    sameBilling: "Rechnungsadresse entspricht der Lieferadresse",
    shipping: "Versandart", ship_std: "Standardversand (1–3 Werktage)", ship_exp: "Express (1 Werktag)", ship_pick: "Abholung in Partnerwerkstatt",
    payment: "Zahlungsart", pay_card: "Karte / Revolut (Muster)", pay_invoice: "Kauf auf Rechnung (Muster)", pay_sepa: "SEPA-Lastschrift (Muster)",
    review: "Bestellung prüfen", items: "Artikel", qty: "Menge", subtotal: "Zwischensumme", shippingCost: "Versandkosten", vat: "darin enthaltene USt. (19 %)", net: "Nettobetrag", total: "Gesamtsumme",
    back: "Zurück", next: "Weiter", place: "Zahlungspflichtig bestellen",
    terms: "Ich habe die AGB und die Widerrufsbelehrung (14 Tage) gelesen und akzeptiere sie.",
    priceNote: "Alle Preise inkl. gesetzlicher USt. und zzgl. Versand, sofern nicht anders angegeben. Beispielwerte – zur Freigabe.",
    taxNote: "USt. nach Lieferland (DE 19 %, NL 21 %) im OSS-Verfahren; für Werkstatt-Konten mit gültiger USt-IdNr. ist Reverse-Charge möglich. Muster-Werte.",
    withdrawalNote: "Verbraucher haben ein 14-tägiges Widerrufsrecht. Ausnahmen gelten u. a. für versiegelte Waren. Dies ist ein Muster-Shop.",
    musterBanner: "Muster-Kasse: Es wird keine echte Bestellung ausgelöst, keine Lieferung veranlasst und keine Zahlung eingezogen.",
    required: "Bitte füllen Sie die Pflichtfelder aus.",
    placed: "Muster-Bestellung erfasst", placedBody: "Dies ist eine Demonstration. Es wurde keine Bestellung abgegeben, keine Lieferung veranlasst und keine Zahlung gestartet.", orderRef: "Vorgangs-Nr. (Muster)",
    newOrder: "Neue Muster-Bestellung", appointment: "Einbau-Termin anfragen",
    nettoBadge: "Netto (Werkstatt-Konto)",
  },
  nl: {
    steps: ["Adres", "Verzending", "Betaling", "Controle"],
    stepOf: "Stap", of: "van",
    address: "Bezorgadres", first: "Voornaam", last: "Achternaam", street: "Straat en huisnummer", zip: "Postcode", city: "Plaats", email: "E-mail",
    sameBilling: "Factuuradres is gelijk aan bezorgadres",
    shipping: "Verzendwijze", ship_std: "Standaard (1–3 werkdagen)", ship_exp: "Express (1 werkdag)", ship_pick: "Afhalen bij partnerwerkplaats",
    payment: "Betaalwijze", pay_card: "Kaart / Revolut (demo)", pay_invoice: "Op rekening (demo)", pay_sepa: "SEPA-incasso (demo)",
    review: "Bestelling controleren", items: "Artikelen", qty: "Aantal", subtotal: "Subtotaal", shippingCost: "Verzendkosten", vat: "incl. btw (19 %)", net: "Nettobedrag", total: "Totaal",
    back: "Terug", next: "Verder", place: "Bestelling met betaalplicht",
    terms: "Ik heb de voorwaarden en het herroepingsrecht (14 dagen) gelezen en accepteer ze.",
    priceNote: "Alle prijzen incl. wettelijke btw en excl. verzending, tenzij anders vermeld. Voorbeeldwaarden – ter vrijgave.",
    taxNote: "Btw volgens leverland (DE 19 %, NL 21 %) via OSS; voor werkplaatsaccounts met geldig btw-nr. is de verleggingsregeling mogelijk. Demowaarden.",
    withdrawalNote: "Consumenten hebben 14 dagen herroepingsrecht. Uitzonderingen gelden o.a. voor verzegelde waren. Dit is een demoshop.",
    musterBanner: "Demo-kassa: er wordt geen echte bestelling, levering of betaling uitgevoerd.",
    required: "Vul de verplichte velden in.",
    placed: "Demo-bestelling vastgelegd", placedBody: "Dit is een demonstratie. Er is geen bestelling geplaatst, geen levering en geen betaling gestart.", orderRef: "Referentie (demo)",
    newOrder: "Nieuwe demo-bestelling", appointment: "Montageafspraak aanvragen",
    nettoBadge: "Netto (werkplaatsaccount)",
  },
  fr: {
    steps: ["Adresse", "Livraison", "Paiement", "Vérifier"],
    stepOf: "Étape", of: "sur",
    address: "Adresse de livraison", first: "Prénom", last: "Nom", street: "Rue et numéro", zip: "Code postal", city: "Ville", email: "E-mail",
    sameBilling: "L’adresse de facturation est identique",
    shipping: "Mode de livraison", ship_std: "Standard (1–3 jours ouvrés)", ship_exp: "Express (1 jour ouvré)", ship_pick: "Retrait en atelier partenaire",
    payment: "Mode de paiement", pay_card: "Carte / Revolut (démo)", pay_invoice: "Sur facture (démo)", pay_sepa: "Prélèvement SEPA (démo)",
    review: "Vérifier la commande", items: "Articles", qty: "Quantité", subtotal: "Sous-total", shippingCost: "Frais de livraison", vat: "dont TVA (19 %)", net: "Montant HT", total: "Total",
    back: "Retour", next: "Continuer", place: "Commande avec obligation de paiement",
    terms: "J’ai lu et j’accepte les CGV et le droit de rétractation (14 jours).",
    priceNote: "Tous les prix TTC et hors livraison, sauf indication contraire. Valeurs d’exemple – à valider.",
    taxNote: "TVA selon le pays de livraison (DE 19 %, NL 21 %) via OSS ; pour les comptes atelier avec n° de TVA valide, l’autoliquidation est possible. Valeurs démo.",
    withdrawalNote: "Les consommateurs disposent d’un droit de rétractation de 14 jours. Des exceptions s’appliquent. Boutique démo.",
    musterBanner: "Caisse démo : aucune commande, livraison ni paiement réels ne sont déclenchés.",
    required: "Veuillez remplir les champs obligatoires.",
    placed: "Commande démo enregistrée", placedBody: "Ceci est une démonstration. Aucune commande, livraison ni paiement n’a été lancé.", orderRef: "Réf. (démo)",
    newOrder: "Nouvelle commande démo", appointment: "Demander un rendez-vous de montage",
    nettoBadge: "HT (compte atelier)",
  },
  en: {
    steps: ["Address", "Shipping", "Payment", "Review"],
    stepOf: "Step", of: "of",
    address: "Delivery address", first: "First name", last: "Last name", street: "Street and number", zip: "Postal code", city: "City", email: "Email",
    sameBilling: "Billing address matches delivery address",
    shipping: "Shipping method", ship_std: "Standard (1–3 business days)", ship_exp: "Express (1 business day)", ship_pick: "Pickup at partner workshop",
    payment: "Payment method", pay_card: "Card / Revolut (demo)", pay_invoice: "Purchase on invoice (demo)", pay_sepa: "SEPA direct debit (demo)",
    review: "Review order", items: "Items", qty: "Quantity", subtotal: "Subtotal", shippingCost: "Shipping", vat: "incl. VAT (19%)", net: "Net amount", total: "Total",
    back: "Back", next: "Next", place: "Order with obligation to pay",
    terms: "I have read and accept the terms and the 14-day right of withdrawal.",
    priceNote: "All prices incl. statutory VAT and plus shipping unless stated otherwise. Example values – pending release.",
    taxNote: "VAT by delivery country (DE 19%, NL 21%) via OSS; for workshop accounts with a valid VAT ID, reverse charge is possible. Demo values.",
    withdrawalNote: "Consumers have a 14-day right of withdrawal. Exceptions apply. This is a demo shop.",
    musterBanner: "Demo checkout: no real order, delivery or payment is triggered.",
    required: "Please complete the required fields.",
    placed: "Demo order recorded", placedBody: "This is a demonstration. No order was placed, no delivery and no payment started.", orderRef: "Reference (demo)",
    newOrder: "New demo order", appointment: "Request installation appointment",
    nettoBadge: "Net (workshop account)",
  },
};

const SHIP_MINOR: Record<string, number> = {std: 499, exp: 999, pick: 0};

export default function ShopCheckout({locale, lines, netto, terminePath, onBack, onReset}: {locale: Locale; lines: CheckoutLine[]; netto: boolean; terminePath: string; onBack: () => void; onReset: () => void}) {
  const t = copy[locale];
  const [step, setStep] = useState(0);
  const [addr, setAddr] = useState({first: "", last: "", street: "", zip: "", city: "", email: ""});
  const [ship, setShip] = useState("std");
  const [pay, setPay] = useState("card");
  const [terms, setTerms] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const grossSubtotal = useMemo(() => lines.reduce((sum, line) => sum + line.product.priceMinor * line.qty, 0), [lines]);
  const shippingCost = SHIP_MINOR[ship] ?? 0;
  const grossTotal = grossSubtotal + shippingCost;
  const vatPart = Math.round(grossTotal - grossTotal / (1 + VAT_RATE));
  const netTotal = grossTotal - vatPart;

  const addressValid = addr.first && addr.last && addr.street && /^[0-9]{4,5}$/.test(addr.zip) && addr.city && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email);

  const goNext = () => {
    if (step === 0) {
      setTouched(true);
      if (!addressValid) return;
    }
    setTouched(false);
    setStep(s => Math.min(3, s + 1));
  };
  const goBack = () => {
    if (step === 0) {onBack(); return;}
    setStep(s => Math.max(0, s - 1));
  };
  const place = () => {
    if (!terms) return;
    setPlaced("TK-MUSTER-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  };

  if (placed) {
    return (
      <div className="tk-result" role="status" data-testid="shop-checkout-success">
        <span className="tk-badge is-ok">{t.placed}</span>
        <p className="tk-recommend">{t.orderRef}: {placed}</p>
        <p className="tk-note">{t.placedBody}</p>
        <div className="tk-actions">
          <SiteLink className="tk-link" href={terminePath} data-testid="shop-success-appointment">{t.appointment}<span aria-hidden="true">→</span></SiteLink>
          <button type="button" className="tk-link" onClick={onReset} data-testid="shop-success-new">{t.newOrder}</button>
        </div>
      </div>
    );
  }

  const unit = (minor: number) => netto ? money(netMinor(minor), locale) : money(minor, locale);

  return (
    <div className="tk-checkout" data-testid="shop-checkout">
      <p className="tk-note tk-muster" role="note" data-testid="shop-checkout-muster">{t.musterBanner}</p>
      <nav aria-label={t.review} className="tk-steps">
        <ol>
          {t.steps.map((label, index) => (
            <li key={label} className={index === step ? "is-active" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined} data-testid={"shop-step-" + index}>
              <span className="tk-step-num" aria-hidden="true">{index + 1}</span>{label}
            </li>
          ))}
        </ol>
        <p className="tk-note">{t.stepOf} {step + 1} {t.of} 4</p>
      </nav>

      {step === 0 && (
        <div className="tk-form" data-testid="shop-step-address">
          <p className="tk-subhead">{t.address}</p>
          <div className="tk-fieldrow">
            <div className="tk-field"><label htmlFor="co-first">{t.first}</label><input id="co-first" autoComplete="given-name" value={addr.first} onChange={e => setAddr({...addr, first: e.target.value})} /></div>
            <div className="tk-field"><label htmlFor="co-last">{t.last}</label><input id="co-last" autoComplete="family-name" value={addr.last} onChange={e => setAddr({...addr, last: e.target.value})} /></div>
          </div>
          <div className="tk-field"><label htmlFor="co-street">{t.street}</label><input id="co-street" autoComplete="street-address" value={addr.street} onChange={e => setAddr({...addr, street: e.target.value})} /></div>
          <div className="tk-fieldrow">
            <div className="tk-field"><label htmlFor="co-zip">{t.zip}</label><input id="co-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={addr.zip} onChange={e => setAddr({...addr, zip: e.target.value.replace(/[^0-9]/g, "")})} /></div>
            <div className="tk-field"><label htmlFor="co-city">{t.city}</label><input id="co-city" autoComplete="address-level2" value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} /></div>
          </div>
          <div className="tk-field"><label htmlFor="co-email">{t.email}</label><input id="co-email" type="email" autoComplete="email" value={addr.email} onChange={e => setAddr({...addr, email: e.target.value})} /></div>
          <label className="tk-check"><input type="checkbox" defaultChecked disabled /> {t.sameBilling}</label>
          {touched && !addressValid && <p className="tk-note" role="alert" data-testid="shop-address-error" style={{color: "var(--color-semantik-fehler)"}}>{t.required}</p>}
        </div>
      )}

      {step === 1 && (
        <fieldset className="tk-fieldset" data-testid="shop-step-shipping">
          <legend className="tk-subhead">{t.shipping}</legend>
          {[["std", t.ship_std], ["exp", t.ship_exp], ["pick", t.ship_pick]].map(([value, label]) => (
            <label key={value} className="tk-radio">
              <input type="radio" name="shipping" value={value} checked={ship === value} onChange={() => setShip(value)} data-testid={"shop-ship-" + value} />
              <span>{label}</span>
              <span className="tk-radio-price">{money(SHIP_MINOR[value], locale)}</span>
            </label>
          ))}
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="tk-fieldset" data-testid="shop-step-payment">
          <legend className="tk-subhead">{t.payment}</legend>
          {[["card", t.pay_card], ["invoice", t.pay_invoice], ["sepa", t.pay_sepa]].map(([value, label]) => (
            <label key={value} className="tk-radio">
              <input type="radio" name="payment" value={value} checked={pay === value} onChange={() => setPay(value)} data-testid={"shop-pay-" + value} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {step === 3 && (
        <div className="tk-form" data-testid="shop-step-review">
          <p className="tk-subhead">{t.review}</p>
          <ul className="tk-review-items">
            {lines.map(line => (
              <li key={line.product.id} data-testid={"shop-review-" + line.product.id}>
                <span>{line.product.name} · {t.qty} {line.qty}</span>
                <span>{netto ? money(netMinor(line.product.priceMinor) * line.qty, locale) : money(line.product.priceMinor * line.qty, locale)}</span>
              </li>
            ))}
          </ul>
          <label className="tk-check" data-testid="shop-terms"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /> {t.terms}</label>
          <p className="tk-note">{t.withdrawalNote}</p>
        </div>
      )}

      <dl className="tk-result" aria-live="polite" data-testid="shop-checkout-totals" style={{marginTop: "var(--space-5)"}}>
        {netto && <div className="tk-result-row"><dt><span className="tk-badge is-ok">{t.nettoBadge}</span></dt><dd></dd></div>}
        <div className="tk-result-row"><dt>{t.subtotal}</dt><dd>{unit(grossSubtotal)}</dd></div>
        <div className="tk-result-row"><dt>{t.shippingCost}</dt><dd>{netto ? money(netMinor(shippingCost), locale) : money(shippingCost, locale)}</dd></div>
        <div className="tk-result-row"><dt>{netto ? t.net : t.vat}</dt><dd>{netto ? money(netTotal, locale) : money(vatPart, locale)}</dd></div>
        <div className="tk-result-row"><dt><strong>{t.total}</strong></dt><dd data-testid="shop-checkout-total"><strong>{money(grossTotal, locale)}</strong></dd></div>
      </dl>
      <p className="tk-note">{t.priceNote}</p>
      <p className="tk-note" data-testid="shop-tax-note">{t.taxNote}</p>

      <div className="tk-actions">
        <button type="button" className="tk-link" onClick={goBack} data-testid="shop-checkout-back">{t.back}</button>
        {step < 3
          ? <button type="button" className="tk-submit" onClick={goNext} data-testid="shop-checkout-next">{t.next}</button>
          : <button type="button" className="tk-submit" onClick={place} disabled={!terms} data-testid="shop-checkout-place">{t.place}</button>}
      </div>
    </div>
  );
}
