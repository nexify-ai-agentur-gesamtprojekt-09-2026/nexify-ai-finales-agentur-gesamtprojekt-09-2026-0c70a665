// T-385 (14.10.2026) — Seiten-i18n-Boot fuer Prototyp-Seiten.
// Zweck: laedt das Woerterbuch der Seite (i18n/<seite>.json, Konvention siehe
// lib/seiten-i18n.js) und uebernimmt Uebersetzungen beim Markt-/Sprachwechsel
// (Ereignis "nx:markt"). Fehlt das Woerterbuch oder schlaegt der Abruf fehl,
// bleibt die deutsche Quelle stehen (No-op) — kein sichtbarer Effekt in "de".
// Verwendung in der Seite (statischer <head>, nach support.js):
//   <script type="module">import { boot } from "./lib/i18n-boot.js"; boot("<seite>");</script>
import { start } from "./seiten-i18n.js";

export function boot(seite) {
  if (window.__nxI18nAktiv) return;  // Mehrfach-Einbindung ausschliessen
  window.__nxI18nAktiv = true;
  fetch("./i18n/" + seite + ".json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && typeof d === "object") start(document.body, d); })
    .catch(() => {});
}
