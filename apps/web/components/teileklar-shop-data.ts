import type {Locale} from "./../lib/i18n";

// Muster-Katalog: brand-neutral example articles. OE/SKU/EAN and prices are
// example values ("zur Freigabe"); no real transaction, delivery or payment.
export type Fit = "fits" | "maybe" | "nofit";

export type ShopProduct = {
  id: string;
  name: string;            // German, brand-neutral; universal across locales
  category: string;        // localization key into CATEGORY_LABELS
  maker: string;
  oe: string;
  sku: string;
  ean: string;
  priceMinor: number;      // gross price in cents
  base?: {minorPerUnit: number; unit: string}; // Grundpreis (PAngV), optional
  stock: number;
  leadDays: [number, number];
  fitsHsn: string[];       // HSN values for which this part fits ("passt")
  noFitHsn: string[];      // HSN values for which it does not fit ("passt nicht")
  noFitReason: string;     // localization key into REASON_LABELS
  fitment: {vehicle: string; years: string; position: string}[];
};

// A single curated sample vehicle for the fitment-first demo.
export const SAMPLE_VEHICLES: {hsn: string; tsn: string; label: string}[] = [
  {hsn: "0603", tsn: "BID", label: "BMW 3er (F30) · 320i"},
  {hsn: "0588", tsn: "AQA", label: "VW Golf VII · 1.4 TSI"},
  {hsn: "1313", tsn: "GAF", label: "Mercedes C-Klasse (W205)"},
];

export const PRODUCTS: ShopProduct[] = [
  {
    id: "p-brake-front", name: "Bremsbeläge vorne", category: "brakes", maker: "Beispiel Brake Co.",
    oe: "34 11 6 858 652", sku: "TK-BRK-1001", ean: "4011558012345", priceMinor: 4990,
    stock: 42, leadDays: [1, 2], fitsHsn: ["0603", "0588"], noFitHsn: ["1313"], noFitReason: "subtype",
    fitment: [
      {vehicle: "BMW 3er (F30/F31)", years: "2012–2019", position: "Vorderachse"},
      {vehicle: "BMW 4er (F32)", years: "2013–2020", position: "Vorderachse"},
      {vehicle: "VW Golf VII", years: "2012–2020", position: "Vorderachse"},
    ],
  },
  {
    id: "p-oil-filter", name: "Ölfilter", category: "filter", maker: "Beispiel Filter AG",
    oe: "11 42 8 507 683", sku: "TK-FIL-2003", ean: "4011558023456", priceMinor: 1250,
    stock: 180, leadDays: [1, 2], fitsHsn: ["0603", "0588", "1313"], noFitHsn: [], noFitReason: "engine",
    fitment: [
      {vehicle: "BMW 3er (F30)", years: "2011–2019", position: "Motor"},
      {vehicle: "VW Golf VII", years: "2012–2020", position: "Motor"},
      {vehicle: "Mercedes C-Klasse (W205)", years: "2014–2021", position: "Motor"},
    ],
  },
  {
    id: "p-spark", name: "Zündkerze (4er-Satz)", category: "ignition", maker: "Beispiel Ignite",
    oe: "12 12 0 037 607", sku: "TK-IGN-3007", ean: "4011558034567", priceMinor: 2800,
    stock: 64, leadDays: [2, 4], fitsHsn: ["0588"], noFitHsn: [], noFitReason: "engine",
    fitment: [
      {vehicle: "VW Golf VII 1.4 TSI", years: "2012–2020", position: "Motor"},
      {vehicle: "Audi A3 (8V) 1.4 TFSI", years: "2012–2020", position: "Motor"},
    ],
  },
  {
    id: "p-battery", name: "Starterbatterie 70 Ah EFB", category: "battery", maker: "Beispiel Power",
    oe: "61 21 8 720 018", sku: "TK-BAT-4010", ean: "4011558045678", priceMinor: 11900,
    stock: 23, leadDays: [1, 3], fitsHsn: ["0603", "1313"], noFitHsn: [], noFitReason: "size",
    fitment: [
      {vehicle: "BMW 3er (F30) Start-Stopp", years: "2011–2019", position: "Kofferraum"},
      {vehicle: "Mercedes C-Klasse (W205)", years: "2014–2021", position: "Motorraum"},
    ],
  },
  {
    id: "p-wiper", name: "Scheibenwischer-Satz", category: "visibility", maker: "Beispiel Clear",
    oe: "61 61 2 160 773", sku: "TK-WIP-5002", ean: "4011558056789", priceMinor: 2490,
    stock: 310, leadDays: [1, 2], fitsHsn: ["0603", "0588", "1313"], noFitHsn: [], noFitReason: "size",
    fitment: [
      {vehicle: "BMW 3er (F30)", years: "2011–2019", position: "Frontscheibe"},
      {vehicle: "VW Golf VII", years: "2012–2020", position: "Frontscheibe"},
      {vehicle: "Mercedes C-Klasse (W205)", years: "2014–2021", position: "Frontscheibe"},
    ],
  },
  {
    id: "p-air-filter", name: "Luftfilter", category: "filter", maker: "Beispiel Filter AG",
    oe: "13 71 8 507 320", sku: "TK-FIL-2044", ean: "4011558067890", priceMinor: 1840,
    stock: 95, leadDays: [1, 2], fitsHsn: ["1313"], noFitHsn: ["0603"], noFitReason: "engine",
    fitment: [
      {vehicle: "Mercedes C-Klasse (W205)", years: "2014–2021", position: "Motor"},
      {vehicle: "Mercedes E-Klasse (W213)", years: "2016–2023", position: "Motor"},
    ],
  },
  {
    id: "p-coolant", name: "Kühlmittel G12++ (1 l)", category: "fluids", maker: "Beispiel Fluid",
    oe: "83 19 2 211 191", sku: "TK-FLU-6001", ean: "4011558078901", priceMinor: 1190,
    base: {minorPerUnit: 1190, unit: "l"}, stock: 240, leadDays: [1, 2],
    fitsHsn: ["0603", "0588", "1313"], noFitHsn: [], noFitReason: "size",
    fitment: [
      {vehicle: "Herstellerübergreifend (G12++-Freigabe)", years: "—", position: "Kühlsystem"},
    ],
  },
  {
    id: "p-brake-disc", name: "Bremsscheiben-Satz vorne", category: "brakes", maker: "Beispiel Brake Co.",
    oe: "34 11 6 792 219", sku: "TK-BRK-1055", ean: "4011558089012", priceMinor: 8900,
    stock: 18, leadDays: [2, 4], fitsHsn: ["0603"], noFitHsn: ["0588"], noFitReason: "subtype",
    fitment: [
      {vehicle: "BMW 3er (F30) 320i/330i", years: "2012–2019", position: "Vorderachse"},
    ],
  },
];

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  de: {brakes: "Bremsen", filter: "Filter", ignition: "Zündung", battery: "Batterie", visibility: "Sicht", fluids: "Betriebsstoffe"},
  nl: {brakes: "Remmen", filter: "Filters", ignition: "Ontsteking", battery: "Accu", visibility: "Zicht", fluids: "Vloeistoffen"},
  fr: {brakes: "Freinage", filter: "Filtres", ignition: "Allumage", battery: "Batterie", visibility: "Visibilité", fluids: "Fluides"},
  en: {brakes: "Brakes", filter: "Filters", ignition: "Ignition", battery: "Battery", visibility: "Visibility", fluids: "Fluids"},
};

export const REASON_LABELS: Record<Locale, Record<string, string>> = {
  de: {subtype: "Für Ihren Untertyp/Ihre Motorisierung nicht freigegeben.", engine: "Motorcode weicht ab – anderer Artikel nötig.", size: "Bauform/Maß passt für Ihr Fahrzeug nicht."},
  nl: {subtype: "Niet vrijgegeven voor uw subtype/motorisering.", engine: "Motorcode wijkt af – ander artikel nodig.", size: "Bouwvorm/maat past niet bij uw voertuig."},
  fr: {subtype: "Non homologué pour votre sous-type/motorisation.", engine: "Code moteur différent – autre article requis.", size: "Forme/dimension incompatible avec votre véhicule."},
  en: {subtype: "Not released for your subtype/engine.", engine: "Engine code differs – different item needed.", size: "Form/size does not fit your vehicle."},
};

export function fitOf(product: ShopProduct, hsn: string | null): Fit {
  if (!hsn) return "maybe"; // never "passt" without a hit
  if (product.fitsHsn.includes(hsn)) return "fits";
  if (product.noFitHsn.includes(hsn)) return "nofit";
  return "maybe";
}

export function money(minor: number, locale: Locale): string {
  const code = locale === "en" ? "en-GB" : locale === "nl" ? "nl-NL" : locale === "fr" ? "fr-FR" : "de-DE";
  return new Intl.NumberFormat(code, {style: "currency", currency: "EUR"}).format(minor / 100);
}

export const VAT_RATE = 0.19;
export function netMinor(grossMinor: number): number {
  return Math.round(grossMinor / (1 + VAT_RATE));
}
