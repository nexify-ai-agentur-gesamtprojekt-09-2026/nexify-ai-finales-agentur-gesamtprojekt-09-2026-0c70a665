import { useId } from "react";

// Farben nur aus config/design-tokens.json (AGENTS.md: Tokens).
const LIME = "var(--color-marke-lime-signal)";
const INK = "var(--color-text-primaer)";

/**
 * Einheitliches Platzhalterbild für Artikel ohne Lieferantenbild (Detailseite, Warenkorb, Bestellungen).
 * Eine zentrale Komponente: Jede Bildfläche im Shop läuft über ProductImage und damit über diese Datei.
 * Es zeigt bewusst kein erfundenes Produktfoto, sondern die Marke und ein neutrales Teile-Motiv.
 */
export function ProductPlaceholder({ label, large = false }: { label: string; large?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <svg className={"tk-placeholder" + (large ? " is-large" : "")} role="img" aria-label={label} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" data-testid="product-placeholder">
    <defs>
      <linearGradient id={id + "bg"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "var(--color-dunkel-flaeche)" }} /><stop offset="1" style={{ stopColor: "var(--color-dunkel-grund)" }} /></linearGradient>
      <radialGradient id={id + "glow"} cx="50%" cy="42%" r="55%"><stop offset="0" style={{ stopColor: LIME, stopOpacity: .16 }} /><stop offset="1" style={{ stopColor: LIME, stopOpacity: 0 }} /></radialGradient>
    </defs>
    <rect width="400" height="300" fill={`url(#${id}bg)`} />
    <rect width="400" height="300" fill={`url(#${id}glow)`} />
    <g fill="none" style={{ stroke: LIME }} strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(200 118)">
      <circle r="44" />
      <circle r="16" />
      <path d="M0-44v-10M0 44v10M-44 0h-10M44 0h10M31-31l7-7M-31 31l-7 7M31 31l7 7M-31-31l-7-7" />
      <path d="M0-16v-28M0 16v28M-16 0h-28M16 0h28" strokeOpacity=".28" />
    </g>
    <text x="200" y="218" textAnchor="middle" fontFamily="inherit" fontSize="30" fontWeight="700" letterSpacing="6" style={{ fill: INK }}>TEILE<tspan style={{ fill: LIME }}>KLAR</tspan></text>
    <text x="200" y="246" textAnchor="middle" fontFamily="inherit" fontSize="11" letterSpacing="3" style={{ fill: INK }} fillOpacity=".5">PASSENDE AUSWAHL · KLARE ANGABEN</text>
    <rect x=".75" y=".75" width="398.5" height="298.5" rx="2" fill="none" style={{ stroke: "var(--color-dunkel-licht)" }} strokeOpacity=".08" />
  </svg>;
}
