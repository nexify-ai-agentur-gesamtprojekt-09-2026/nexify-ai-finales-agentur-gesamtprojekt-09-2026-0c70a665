# Seitenbezogene Metadaten · lokaler Laufzeitnachweis

Stand: 02.11.2026  
Branch: `codex/sitewide-design-2026-11-02`  
Paket: P03 Seiten/Redaktion · Teilumfang SEO- und Social-Metadaten

## Nutzerergebnis

Besucher, Browser und Vorschauplattformen erhalten nach einem direkten Aufruf,
einem internen Routenwechsel oder einem Sprachwechsel den Titel, die Beschreibung,
die kanonische URL und die Seitensprache der tatsächlich geöffneten öffentlichen
Seite. Dynamische TEILEKLAR-Detailpfade bleiben bis zum Nachweis eines realen
Datensatzes auf der registrierten Basisroute. Unbekannte oder nicht öffentliche
Pfade werden nicht als eigene kanonische Seite oder `WebPage` ausgegeben.

Die Texte stammen aus den lokalisierten Titeln und Zusammenfassungen in
`config/site-map.json`. Die Ausgabe behauptet keine Bestellung, Partnerschaft,
Modellfunktion, Terminzusage oder öffentliche Indexierung.

## Umsetzung

- `apps/site/src/seo-state.mjs` erzeugt einen vollständigen Metadatenzustand für
  DE, NL, FR und EN.
- `apps/site/src/main.tsx` wendet denselben Zustand nach Direktaufruf,
  Routenwechsel und Sprachwechsel an.
- Titel, Beschreibung, Robots, Canonical, Open Graph, Twitter und die
  `WebPage`-Strukturdaten werden gemeinsam aktualisiert.
- Fehlerseiten verweisen kanonisch auf `/` und tragen zusätzlich `noarchive`.
- Standalone-Dateien ohne HTTP-Origin verwenden den geprüften öffentlichen
  Vorschau-Origin und brechen nicht an `origin = null` ab.
- Die bestehende private Vorschau bleibt `noindex,nofollow`. Eine öffentliche
  Domain- oder Rankingfreigabe ist nicht Teil dieses Pakets.

## Nachweis

- 4 reine Metadaten-Vertragstests bestanden.
- 125 Site-Tests bestanden.
- TypeScript-Typecheck und Produktionsbuild bestanden.
- Reale Chromium-Prüfung: drei direkte Routen, DE/NL, dynamischer Produktpfad
  und unbekannte Route; null externe Requests.
- `python3 tools/check_llm_policy.py` und `make check` bestanden.
- Der vollständige historische `make test` bleibt fail-closed: 697 Tests,
  61 Fehler, 10 Errors, 11 Skips. Ursachen sind die bestehende Hashdrift alter
  Browser-/Resize-/Registerbelege, fehlendes `pymongo` und die erwartete
  Invalidierung einer alten Exception-Evidenz durch den neuen `main.tsx`-Stand.

## Unabhängiger Review

APPROVE durch `/root/grafik_design`: drei gefundene Randfehler wurden behoben
und erneut geprüft. Der Reviewer änderte keine Dateien.

## Sitemap

Die vorhandene Sitemap enthält jetzt exakt alle 39 öffentlichen Routen aus dem
Register. Die drei neueren TEILEKLAR-Wege `shop`, `reifenrechner` und
`batterie-berater` sind ergänzt. Ein eigener Vertragstest verhindert fehlende,
doppelte oder private Routen sowie gemischte Origins.

Der Origin `https://www.nexifyai.de` bleibt die dokumentierte Zieladresse des
deutschen Marktauftritts. Die aktuelle private Vorschau bleibt dennoch
`noindex,nofollow`; dieser Abgleich ist kein Domain-Cutover und keine
Indexierungsfreigabe.

## Restumfang

Dieses Paket schließt weder P03 noch den Gesamtauftrag. Offen bleiben insbesondere
die Prüfung aller 39 öffentlichen Routen in FR/EN, serverseitig vorgerenderte
Metadaten für Crawler, die öffentliche Domain-/Indexierungsentscheidung,
Sitemap-/Canonical-Readback am Zielhost sowie fachliche Abnahme jedes Seitentextes.
