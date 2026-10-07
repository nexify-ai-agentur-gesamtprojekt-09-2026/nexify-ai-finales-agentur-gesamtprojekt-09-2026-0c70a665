# prototypen/lib/ — Architektur (Referenz)

Abgleich-Bibliothek der Design-Referenzen. Wird von `tools/inhaltsabgleich.js` verwendet.

- `inhaltsabgleich.js` — Kern `abgleichen()`/`zusammenfassen()`: vergleicht Fakten (`config/fakten.json`) mit den Seiten/Dokumenten und meldet DATEI-/WIDERSPRUCH-/QUELLE-Befunde.
- Weitere Module (`anfrage-pipeline.js`, `betriebskennzahlen.js`, …) stammen aus dem Herkunfts-Layout und sind hier nur Referenz; sie werden vom Produktcode nicht importiert.

Regel: Referenzen bleiben unverändert (Manifest); Produktlogik gehört in `apps/`/`packages/`, nicht hier.
