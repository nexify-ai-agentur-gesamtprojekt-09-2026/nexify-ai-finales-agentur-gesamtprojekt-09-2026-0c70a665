// Typdeklaration für das bestehende tools/rechnung.mjs (additiv, Modul unverändert).
// Erzeugt eine XRechnung (UBL 2.1) als XML-String aus einer Buchung.
export function xrechnung(input: {
  nr: string;
  kunde: string;
  betragEur: string | number;
  name: string;
  datum: string;
}): string;
