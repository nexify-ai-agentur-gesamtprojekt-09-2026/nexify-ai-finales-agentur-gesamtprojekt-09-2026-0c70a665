# NeXify AI · Gesamtlösung 2026 – Dokumentationssatz (Final-Entwurf)

**Stand 29.09.2026 · Fassung 1.0 · Status: Entwurf zur Freigabe durch Pascal Courbois**

Dieser Satz ersetzt keine bestehenden Verträge oder Register; er bündelt Konzept, Gestaltung, Spezifikation, Betrieb und Übergabe in einer lesbaren Reihenfolge. Bei Widerspruch gelten `config/fakten.json` und `config/api-prepaid.json` (Zahlen) vor jedem Text.

| Nr. | Dokument | Für wen | Inhalt |
|---|---|---|---|
| 01 | Produkt und Marke | Geschäftsführung, Marketing, Vertrieb | Idee, Zielgruppen, Produkte, Positionierung, Tonalität, Belege |
| 02 | Informationsarchitektur und Journeys | UX, Frontend | Seitenbaum, Navigation, Nutzerwege, Zustände |
| 03 | Designsystem | Design, Frontend | Farben, Typografie, Raster, Radien, Schatten, Licht, Komponenten, Bewegung |
| 04 | Frontend-Spezifikation | Entwicklung | Seiten, Komponenten, Interaktionen, Datenmodelle, Barrierefreiheit |
| 05 | Technische Spezifikation | Backend, Betrieb | Architektur, API, Datenmodell, Abrechnung, Shop-Logik, Sicherheit |
| 06 | Brain: KI-Team, Pipeline, Tool-Orakel, Wissenspflege | KI-Entwicklung | Agenten, Modell-Routing, Wissensaufbau, Werkzeuggenerierung, Qualitätsschleifen |
| 07 | Betriebs- und Nutzerhandbuch | Betrieb, Support, Kunden | Alltag, Störungen, Freigabe-Gate, Rollen, Schritt-für-Schritt |
| 08 | Recht und Compliance | Recht, Datenschutz | Textmatrix, Pflichtangaben, KI-Verordnung, BFSG, offene Punkte |
| 09 | Prüfbericht, Lücken, Backend-Roadmap | alle | durchgeführte Prüfungen, verbleibende Einschränkungen, nächste Schritte |
| 10 | Vorlagen und Unterlagen | Vertrieb, Verwaltung | E-Mails, Dokumente, Datenblätter, Broschüren, Präsentation |
| 11 | Designsystem-Definition (verbindlich, Regel-IDs DS-x-nn, i18n) | Design, Frontend | Farben, Typografie, Radien, Flächen, Bausteine, Barrierefreiheit, Sprachen und Märkte |
| 12 | Abweichungsbericht | alle | Prüfergebnis je Datei und Regel, Ausnahmen, offene Punkte |
| 13 | Erweiterte Prüfung | alle | SEO, Technik, Portale, Mobil – behoben und offen |
| 14 | Gesamtsystem und Portale | Produkt, Entwicklung | Systemkarte, Portal-Matrix, Zustandsautomaten (Angebot, Rechnung, Bestellung, Guthaben) |
| 15 | Umsetzungsplan (Codex) | Entwicklung | Phasen P0–P7 mit Abnahme, Entscheidungen, Lücken |
| — | `AGENTS.md` | Codex | Auftrag, Regeln, Lesereihenfolge |
| — | `config/design-tokens.json`, `config/design-rules.json`, `tools/ds-audit.js` | Entwicklung | Token-Quelle, technische Regeldefinition, Prüfskript |
| — | `config/brain/*.json` | Entwicklung | Agenten, Werkzeuge, Pipeline, Wissensquellen als Konfiguration |
| — | `HANDOFF.md` (Paketwurzel) | Entwickler | Einstieg, Dateien, Reihenfolge |

## Die Prototypen (Design-Referenz, nicht Produktionscode)

| Datei | Zweck |
|---|---|
| `NeXifyAI Cloud v12.dc.html` | Startseite: Signalfeld, Kennzahl, Demo-Fenster, Baukasten, Preise, Rechner, Ablauf, FAQ, Kontakt |
| `NeXify AI one.dc.html` | Produktseite one / one+: Arbeitsplatz-Demo, Zugänge, Prepaid, Grenzen, FAQ, Rechtliches |
| `NeXify Shop.dc.html` | Muster-Shop: 10 Kategorien, 132 Artikel, Suche, Filter, Warenkorb, Kasse, Berater, Rechtstexte |
| `Rechtliches.dc.html` | Rechtsseiten (Entwurf 0.9) |
| `NX-Header.dc.html`, `NX-Footer.dc.html` | gemeinsame Bausteine |
| `NeXify API.dc.html`, `Kundenportal.dc.html`, `Anmeldung.dc.html` | vorhandene Flächen (Stand vor dieser Runde, Stil angleichen) |

## Lesereihenfolge

Neue Person im Projekt: 01 → 03 → 04 → 05 → 06. Betrieb: 07 → 05 → 08. Vertrieb: 01 → 10.
