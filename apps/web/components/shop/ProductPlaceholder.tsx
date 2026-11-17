import { useId } from "react";

/**
 * Einheitliches Platzhalterbild für Artikel ohne Lieferantenbild (Detailseite, Warenkorb, Bestellungen).
 * Eine zentrale Komponente: Jede Bildfläche im Shop läuft über ProductImage und damit über diese Datei.
 * Es zeigt bewusst kein erfundenes Produktfoto, sondern die Marke und ein neutrales Teile-Motiv.
 */
export function ProductPlaceholder({ label, large = false }: { label: string; large?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <svg className={"tk-placeholder" + (large ? " is-large" : "")} role="img" aria-label={label} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" data-testid="product-placeholder">
    <defs>
      <linearGradient id={id + "bg"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#12161f" /><stop offset="1" stopColor="#080a0f" /></linearGradient>
      <radialGradient id={id + "glow"} cx="50%" cy="42%" r="55%"><stop offset="0" stopColor="#c0ee38" stopOpacity=".16" /><stop offset="1" stopColor="#c0ee38" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width="400" height="300" fill={`url(#${id}bg)`} />
    <rect width="400" height="300" fill={`url(#${id}glow)`} />
    <g fill="none" stroke="#c0ee38" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(200 118)">
      <circle r="44" />
      <circle r="16" />
      <path d="M0-44v-10M0 44v10M-44 0h-10M44 0h10M31-31l7-7M-31 31l-7 7M31 31l7 7M-31-31l-7-7" />
      <path d="M0-16v-28M0 16v28M-16 0h-28M16 0h28" strokeOpacity=".28" />
    </g>
    <text x="200" y="218" textAnchor="middle" fontFamily="inherit" fontSize="30" fontWeight="700" letterSpacing="6" fill="#f2f4f8">TEILE<tspan fill="#c0ee38">KLAR</tspan></text>
    <text x="200" y="246" textAnchor="middle" fontFamily="inherit" fontSize="11" letterSpacing="3" fill="#f2f4f8" fillOpacity=".5">PASSENDE AUSWAHL · KLARE ANGABEN</text>
    <rect x=".75" y=".75" width="398.5" height="298.5" rx="2" fill="none" stroke="#ffffff" strokeOpacity=".08" />
  </svg>;
}
