"use client";
import {useEffect, useMemo, useState} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "./../lib/page-types";
import type {Locale} from "./../lib/i18n";
import {PRODUCTS, SAMPLE_VEHICLES, CATEGORY_LABELS, REASON_LABELS, fitOf, money, netMinor, type ShopProduct, type Fit} from "./teileklar-shop-data";
import ShopWorkshopFinder from "./ShopWorkshopFinder";
import ShopCheckout, {type CheckoutLine} from "./ShopCheckout";
import "./TeileklarTools.css";

const copy = {
  de: {kicker: "TEILEKLAR Shop", title: "Erst Passung prüfen, dann bestellen", intro: "Wählen Sie Ihr Fahrzeug über HSN/TSN – dann sehen Sie je Artikel, ob er passt. So vermeiden Sie Fehlkäufe. Muster-Shop: Beispielartikel, keine echte Lieferung und keine Zahlung.", garage: "Ihre Garage", vehicle: "Fahrzeug wählen", pick: "Beispiel-Fahrzeug", hsn: "HSN (2–4)", tsn: "TSN (3)", check: "Passung prüfen", chosen: "Gewählt", none: "Noch kein Fahrzeug gewählt – Status „prüfen“.", reset: "Ändern", account: "Werkstatt-Konto (Netto)", accountHint: "Angemeldete Werkstätten sehen Nettopreise. Im Muster-Shop simuliert.", search: "Teil, OE-Nr., SKU oder EAN suchen", onlyFitting: "Nur passende Teile", parts: "Artikel", oe: "OE-Nr.", sku: "SKU", ean: "EAN", maker: "Hersteller", ex: "Beispiel", fits: "passt", maybe: "prüfen", nofit: "passt nicht", details: "Details", add: "In den Warenkorb", inCart: "Im Warenkorb", lead: "Lieferzeit", days: "Werktage", stock: "auf Lager", grund: "Grundpreis", fitment: "Fitment-Liste", years: "Baujahr", position: "Einbauort", qty: "Menge", close: "Schließen", cart: "Warenkorb (Muster)", items: "Artikel", empty: "Ihr Warenkorb ist leer.", remove: "Entfernen", total: "Zwischensumme", checkout: "Zur Kasse", priceNote: "Preise brutto inkl. USt., zzgl. Versand – Beispielwerte, zur Freigabe.", noResults: "Keine Artikel zu Ihrer Suche. Bitte Suche anpassen.", backShop: "Weiter einkaufen", netto: "Netto"},
  nl: {kicker: "TEILEKLAR shop", title: "Eerst pasvorm, dan bestellen", intro: "Kies uw voertuig via HSN/TSN – per artikel ziet u of het past. Zo voorkomt u miskopen. Demoshop: voorbeeldartikelen, geen echte levering of betaling.", garage: "Uw garage", vehicle: "Voertuig kiezen", pick: "Voorbeeldvoertuig", hsn: "HSN (2–4)", tsn: "TSN (3)", check: "Pasvorm controleren", chosen: "Gekozen", none: "Nog geen voertuig gekozen – status „controleren“.", reset: "Wijzigen", account: "Werkplaatsaccount (netto)", accountHint: "Aangemelde werkplaatsen zien nettoprijzen. In de demoshop gesimuleerd.", search: "Onderdeel, OE-nr., SKU of EAN zoeken", onlyFitting: "Alleen passende onderdelen", parts: "Artikelen", oe: "OE-nr.", sku: "SKU", ean: "EAN", maker: "Fabrikant", ex: "Voorbeeld", fits: "past", maybe: "controleren", nofit: "past niet", details: "Details", add: "In winkelwagen", inCart: "In winkelwagen", lead: "Levertijd", days: "werkdagen", stock: "op voorraad", grund: "Basisprijs", fitment: "Pasvormlijst", years: "Bouwjaar", position: "Inbouwplaats", qty: "Aantal", close: "Sluiten", cart: "Winkelwagen (demo)", items: "artikelen", empty: "Uw winkelwagen is leeg.", remove: "Verwijderen", total: "Subtotaal", checkout: "Naar de kassa", priceNote: "Prijzen incl. btw, excl. verzending – voorbeeldwaarden, ter vrijgave.", noResults: "Geen artikelen voor uw zoekopdracht.", backShop: "Verder winkelen", netto: "Netto"},
  fr: {kicker: "Boutique TEILEKLAR", title: "D’abord la compatibilité, puis la commande", intro: "Choisissez votre véhicule via HSN/TSN – chaque article indique s’il convient. Évitez les erreurs. Boutique démo : articles d’exemple, sans livraison ni paiement réels.", garage: "Votre garage", vehicle: "Choisir un véhicule", pick: "Véhicule d’exemple", hsn: "HSN (2–4)", tsn: "TSN (3)", check: "Vérifier la compatibilité", chosen: "Choisi", none: "Aucun véhicule choisi – statut « à vérifier ».", reset: "Modifier", account: "Compte atelier (HT)", accountHint: "Les ateliers connectés voient les prix HT. Simulé dans la démo.", search: "Pièce, réf. OE, SKU ou EAN", onlyFitting: "Pièces compatibles seulement", parts: "Articles", oe: "Réf. OE", sku: "SKU", ean: "EAN", maker: "Fabricant", ex: "Exemple", fits: "compatible", maybe: "à vérifier", nofit: "non compatible", details: "Détails", add: "Ajouter au panier", inCart: "Au panier", lead: "Délai", days: "jours ouvrés", stock: "en stock", grund: "Prix de base", fitment: "Liste de compatibilité", years: "Année", position: "Emplacement", qty: "Quantité", close: "Fermer", cart: "Panier (démo)", items: "articles", empty: "Votre panier est vide.", remove: "Retirer", total: "Sous-total", checkout: "Vers la caisse", priceNote: "Prix TTC, hors livraison – valeurs d’exemple, à valider.", noResults: "Aucun article pour votre recherche.", backShop: "Continuer mes achats", netto: "HT"},
  en: {kicker: "TEILEKLAR shop", title: "Check fit first, then order", intro: "Select your vehicle via HSN/TSN – each item shows whether it fits. Avoid wrong purchases. Demo shop: sample items, no real delivery or payment.", garage: "Your garage", vehicle: "Choose vehicle", pick: "Sample vehicle", hsn: "HSN (2–4)", tsn: "TSN (3)", check: "Check fit", chosen: "Chosen", none: "No vehicle chosen yet – status “check”.", reset: "Change", account: "Workshop account (net)", accountHint: "Signed-in workshops see net prices. Simulated in the demo shop.", search: "Search part, OE no., SKU or EAN", onlyFitting: "Fitting parts only", parts: "Items", oe: "OE no.", sku: "SKU", ean: "EAN", maker: "Maker", ex: "Example", fits: "fits", maybe: "check", nofit: "no fit", details: "Details", add: "Add to cart", inCart: "In cart", lead: "Lead time", days: "business days", stock: "in stock", grund: "Base price", fitment: "Fitment list", years: "Model years", position: "Position", qty: "Quantity", close: "Close", cart: "Cart (demo)", items: "items", empty: "Your cart is empty.", remove: "Remove", total: "Subtotal", checkout: "To checkout", priceNote: "Prices incl. VAT, plus shipping – example values, pending release.", noResults: "No items for your search.", backShop: "Continue shopping", netto: "Net"},
};

const VKEY = "tk-garage-vehicle";

export default function ShopOverview({locale, pages}: {locale: Locale; pages: PublicPage[]}) {
  const t = copy[locale];
  const cats = CATEGORY_LABELS[locale];
  const reasons = REASON_LABELS[locale];
  const path = (id: string, fb: string) => pages.find(p => p.id === id)?.path || fb;
  const terminePath = path("tk-appointments", "/teileklar/termine");
  const workshopPath = path("tk-workshop", "/teileklar/werkstatt");

  const [vehicle, setVehicle] = useState<{hsn: string; tsn: string; label?: string} | null>(null);
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [account, setAccount] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyFit, setOnlyFit] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"shop" | "checkout">("shop");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VKEY);
      if (raw) setVehicle(JSON.parse(raw));
    } catch {/* ignore */}
  }, []);
  useEffect(() => {
    try {
      if (vehicle) window.localStorage.setItem(VKEY, JSON.stringify(vehicle));
      else window.localStorage.removeItem(VKEY);
    } catch {/* ignore */}
  }, [vehicle]);

  const chosenHsn = vehicle?.hsn ?? null;

  const applyManual = (event: React.FormEvent) => {
    event.preventDefault();
    if (hsn.trim() && tsn.trim()) setVehicle({hsn: hsn.trim(), tsn: tsn.trim().toUpperCase()});
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, "");
    return PRODUCTS.filter(p => {
      const hay = (p.name + p.oe + p.sku + p.ean + cats[p.category]).toLowerCase().replace(/[\s-]/g, "");
      if (q && !hay.includes(q)) return false;
      if (onlyFit && chosenHsn && fitOf(p, chosenHsn) === "nofit") return false;
      return true;
    });
  }, [query, onlyFit, chosenHsn, cats]);

  const badge: Record<Fit, {cls: string; label: string}> = {
    fits: {cls: "is-ok", label: t.fits}, maybe: {cls: "is-warn", label: t.maybe}, nofit: {cls: "is-nofit", label: t.nofit},
  };

  const priceOf = (p: ShopProduct) => account ? netMinor(p.priceMinor) : p.priceMinor;
  const addToCart = (id: string, qty = 1) => setCart(c => ({...c, [id]: (c[id] || 0) + qty}));
  const setQty = (id: string, qty: number) => setCart(c => {
    const next = {...c};
    if (qty <= 0) delete next[id]; else next[id] = qty;
    return next;
  });
  const cartLines: CheckoutLine[] = Object.entries(cart)
    .map(([id, qty]) => ({product: PRODUCTS.find(p => p.id === id)!, qty}))
    .filter(line => line.product);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotalMinor = cartLines.reduce((s, l) => s + priceOf(l.product) * l.qty, 0);

  if (view === "checkout") {
    return (
      <section className="tk-tool" aria-labelledby="shop-front-title" data-testid="shop-overview">
        <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="shop-front-title">{t.checkout}</h2></div>
        <ShopCheckout locale={locale} lines={cartLines} netto={account} terminePath={terminePath}
          onBack={() => setView("shop")} onReset={() => {setCart({}); setView("shop");}} />
      </section>
    );
  }

  return (
    <section className="tk-tool" aria-labelledby="shop-front-title" data-testid="shop-overview">
      <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="shop-front-title">{t.title}</h2><p>{t.intro}</p></div>

      {/* Garage + Werkstatt-Konto */}
      <div className="tk-garage" data-testid="shop-garage">
        <form className="tk-form" onSubmit={applyManual} aria-label={t.garage}>
          <p className="tk-subhead">{t.garage}</p>
          <div className="tk-fieldrow">
            <div className="tk-field">
              <label htmlFor="shop-pick">{t.pick}</label>
              <select id="shop-pick" data-testid="shop-vehicle-pick" value={vehicle?.label && SAMPLE_VEHICLES.some(v => v.label === vehicle.label) ? vehicle.label : ""}
                onChange={e => {const v = SAMPLE_VEHICLES.find(x => x.label === e.target.value); if (v) setVehicle({hsn: v.hsn, tsn: v.tsn, label: v.label});}}>
                <option value="">–</option>
                {SAMPLE_VEHICLES.map(v => <option key={v.label} value={v.label}>{v.label}</option>)}
              </select>
            </div>
            <div className="tk-field"><label htmlFor="shop-hsn">{t.hsn}</label><input id="shop-hsn" data-testid="shop-hsn" inputMode="numeric" maxLength={4} value={hsn} onChange={e => setHsn(e.target.value)} placeholder="0603" /></div>
            <div className="tk-field"><label htmlFor="shop-tsn">{t.tsn}</label><input id="shop-tsn" data-testid="shop-tsn" maxLength={3} value={tsn} onChange={e => setTsn(e.target.value)} placeholder="BID" /></div>
            <div className="tk-field" style={{justifyContent: "flex-end"}}><button type="submit" className="tk-submit" data-testid="shop-check-fit">{t.check}</button></div>
          </div>
          <p className="tk-note" data-testid="shop-vehicle-status" aria-live="polite">
            {vehicle ? `${t.chosen}: ${vehicle.label || `${vehicle.hsn} / ${vehicle.tsn}`}` : t.none}
            {vehicle && <> · <button type="button" className="tk-inline-btn" onClick={() => {setVehicle(null); setHsn(""); setTsn("");}} data-testid="shop-reset">{t.reset}</button></>}
          </p>
        </form>
        <label className="tk-accountbar" data-testid="shop-account-toggle">
          <input type="checkbox" checked={account} onChange={e => setAccount(e.target.checked)} data-testid="shop-account-checkbox" />
          <span><strong>{t.account}</strong><br /><small className="tk-note">{t.accountHint}</small></span>
        </label>
      </div>

      {/* Suche + Filter */}
      <div className="tk-searchbar">
        <div className="tk-field" style={{flex: "1 1 240px"}}>
          <label htmlFor="shop-search">{t.search}</label>
          <input id="shop-search" type="search" data-testid="shop-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} />
        </div>
        {chosenHsn && (
          <label className="tk-check" data-testid="shop-onlyfit">
            <input type="checkbox" checked={onlyFit} onChange={e => setOnlyFit(e.target.checked)} /> {t.onlyFitting}
          </label>
        )}
      </div>

      {/* Produktliste */}
      <p className="tk-subhead">{t.parts}</p>
      {filtered.length === 0
        ? <p className="tk-note" role="status" data-testid="shop-no-results">{t.noResults}</p>
        : <div className="tk-grid" data-testid="shop-product-grid">
            {filtered.map((p, i) => {
              const st = fitOf(p, chosenHsn);
              const b = badge[st];
              const inCart = Boolean(cart[p.id]);
              const open = openId === p.id;
              return (
                <article key={p.id} className="tk-product" data-testid={"shop-product-" + i}>
                  <span className={"tk-badge " + b.cls} data-testid={"shop-fit-" + i}>{b.label}</span>
                  <h3 className="tk-product-name">{p.name}</h3>
                  <small>{t.maker}: {p.maker} ({t.ex})<br />{t.oe}: {p.oe} · {t.sku}: {p.sku}</small>
                  <p className="tk-price" data-testid={"shop-price-" + i}>
                    {money(priceOf(p), locale)} {account && <span className="tk-badge is-ok tk-mini">{t.netto}</span>}
                    <span className="tk-price-ex"> · {t.ex}</span>
                  </p>
                  {p.base && <small className="tk-note">{t.grund}: {money(p.base.minorPerUnit, locale)}/{p.base.unit}</small>}
                  <div className="tk-product-actions">
                    <button type="button" className="tk-link tk-slim" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)} data-testid={"shop-details-" + i}>{t.details}</button>
                    <button type="button" className="tk-submit tk-slim" disabled={st === "nofit" || inCart} onClick={() => addToCart(p.id)} data-testid={"shop-add-" + i}>{inCart ? t.inCart : t.add}</button>
                  </div>
                  {open && (
                    <div className="tk-detail" data-testid={"shop-detail-" + i}>
                      <dl className="tk-detail-grid">
                        <div><dt>{t.ean}</dt><dd>{p.ean}</dd></div>
                        <div><dt>{t.lead}</dt><dd>{p.leadDays[0]}–{p.leadDays[1]} {t.days}</dd></div>
                        <div><dt>{t.stock}</dt><dd>{p.stock}</dd></div>
                      </dl>
                      <p className="tk-subhead">{t.fitment}</p>
                      <ul className="tk-fitlist">
                        {p.fitment.map((f, j) => (
                          <li key={j}><strong>{f.vehicle}</strong><span className="tk-note">{t.years}: {f.years} · {t.position}: {f.position}</span></li>
                        ))}
                      </ul>
                      {st === "nofit" && <p className="tk-note" style={{color: "var(--color-semantik-fehler)"}} data-testid={"shop-reason-" + i}>{reasons[p.noFitReason]}</p>}
                      <QtyAdd locale={locale} t={t} disabled={st === "nofit"} onAdd={qty => addToCart(p.id, qty)} />
                      <ShopWorkshopFinder locale={locale} partName={p.name} terminePath={terminePath} workshopPath={workshopPath} />
                      <button type="button" className="tk-inline-btn" onClick={() => setOpenId(null)} data-testid={"shop-detail-close-" + i}>{t.close}</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>}
      <p className="tk-note" data-testid="shop-price-note">{t.priceNote}</p>

      {/* Warenkorb */}
      <div className="tk-result" data-testid="shop-cart" style={{marginTop: "var(--space-5)"}}>
        <p className="tk-subhead">{t.cart}</p>
        {cartLines.length === 0
          ? <p className="tk-note" data-testid="shop-cart-empty">{t.empty}</p>
          : <ul className="tk-cart-list">
              {cartLines.map(line => (
                <li key={line.product.id} data-testid={"shop-cart-item-" + line.product.id}>
                  <span>{line.product.name}</span>
                  <QtyStepper value={line.qty} onChange={q => setQty(line.product.id, q)} label={t.qty} />
                  <span>{money(priceOf(line.product) * line.qty, locale)}</span>
                  <button type="button" className="tk-inline-btn" onClick={() => setQty(line.product.id, 0)} data-testid={"shop-cart-remove-" + line.product.id}>{t.remove}</button>
                </li>
              ))}
            </ul>}
        <div className="tk-result-row"><dt>{t.items}</dt><dd data-testid="shop-cart-count">{cartCount}</dd></div>
        <div className="tk-result-row"><dt>{t.total}{account ? ` · ${t.netto}` : ""}</dt><dd data-testid="shop-cart-total">{money(cartTotalMinor, locale)}</dd></div>
        <button type="button" className="tk-submit tk-full" disabled={cartCount === 0} onClick={() => setView("checkout")} data-testid="shop-checkout-start">{t.checkout}</button>
      </div>
    </section>
  );
}

function QtyStepper({value, onChange, label}: {value: number; onChange: (q: number) => void; label: string}) {
  return (
    <span className="tk-qty" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="-">−</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="+">+</button>
    </span>
  );
}

function QtyAdd({locale, t, disabled, onAdd}: {locale: Locale; t: typeof copy["de"]; disabled: boolean; onAdd: (q: number) => void}) {
  const [qty, setQty] = useState(1);
  return (
    <div className="tk-qtyadd">
      <QtyStepper value={qty} onChange={q => setQty(Math.max(1, q))} label={t.qty} />
      <button type="button" className="tk-submit tk-slim" disabled={disabled} onClick={() => onAdd(qty)} data-testid="shop-detail-add">{t.add}</button>
    </div>
  );
}
