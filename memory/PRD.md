> **HISTORIE – abgelöst durch docs/konzept/FUEHRENDES-KONZEPT.md (14.11.2026)**

# NeXify AI — verbindlicher Soll-Stand und Frontend-Abnahme

## Geltung und Priorität
Stand: 08.11.2026. Neueste Nutzerentscheidungen haben Vorrang vor älteren Übergaben und Designvarianten.

1. **Ausschließlich Frontend-Arbeiten.** Keine weiteren Backend-Änderungen, Integrationen, Backend-Tests, Live-Testzahlungen oder Testmails seit dem Scopewechsel.
2. **Die bestehende Startseite ist die einzige Layoutreferenz.** Auch sie wird sorgfältig nachpoliert. Keine zweite Stilwelt für Unterseiten, kein visueller Rohbau.
3. **Deutschland ist der Schwerpunkt.** Deutsches formelles Sie, klare Euro-/MwSt.-/Versandangaben. Daraus folgt keine ungeprüfte Erweiterung der Lieferländer.
4. **Keine Mock-Inhalte:** keine erfundenen Kunden, Projekte, Bestände, Umsätze, Bewertungen, Produktverfügbarkeiten oder Integrationszusagen. Fehlende private Datensätze werden als echte Leerzustände mit Handlung angezeigt.
5. **Bildregel:** Markenbereiche nur vorhandene 17 Higgsfield-Stills, keine Videos/Stock. Nachträglich explizit freigegeben: Original-Lieferantenfotos tatsächlich angebotener Shopartikel.
6. **Durchgängigkeit Header bis Footer.** Markenhierarchie, Seitenränder, Typografie, Bildrahmen, Abstände und Aktionen stammen von der Startseite.
7. **Nachweis statt Perfektionsbehauptung.** Keine pauschale ISO/DIN/WCAG-Zertifizierung. Gemessene Konsolen- und Funktionsfehler werden geschlossen und erneut geprüft.

## Bestehende Architektur — unverändert
- Next.js / React: `/app/apps/web` (Port 3000), ursprüngliches Workspace-/Lockfile beibehalten
- Bestehender FastAPI-Dienst: `/app/apps/shop-api` (Port 8001), seit Scopewechsel nicht weiterbearbeitet
- Private Daten werden ausschließlich durch bestehende geschützte APIs geladen. Eine sichtbare Portalseite oder Cookie-Anwesenheit erteilt keine Datenberechtigung.
- Vorschau: https://chat-it-automate--01quzkxh.preview.emergentagent.com

## Eine visuelle Quelle
- Homepage: `HomeContent.tsx`, `IdentityHero.tsx`, **konsolidiertes `HomeConcept.css`**
- Davon abgeleitete Seiten: `PublicContent.tsx`, `PageShowcase.tsx`, **`HomeMaster.css`**
- `HomeMaster.css` überschreibt nicht länger die Homepage. Historische konkurrierende Home-/Video-Regeln wurden entfernt.
- Seitenfamilien dürfen ihre Informationsanordnung ändern, nicht ihr visuelles Grundsystem.
- Rechtliche Texte bleiben sachlich und lesbar, ohne erfundene Register-/Rechtsformangaben.

## Verbindliche Bildzuordnung
Quelle: `/app/apps/web/lib/brand-media.ts`. Tatsächliche Bildinhalte wurden über einen beschrifteten Kontaktbogen geprüft; Dateinamen sind irreführend und nicht mehr Zuordnungsgrundlage.

| Verwendung | Bild | Tatsächlicher Kontext |
|---|---|---|
| Bestehender Homepage-Hero | hf-02 | Präsentation am Tisch mit Entwürfen und Modell |
| Web / Gestaltung | hf-14 | Besprechung gedruckter Entwürfe und Materialmuster |
| Automatisierung | hf-07 | Besprechung von Unterlagen an einer Fertigungsanlage |
| Apps/Portale, NeX2fly | hf-11 | Gemeinsamer Blick auf ein Tablet |
| Leistungsübersicht | hf-03 | Atelier mit Layouttafeln und Modellen |
| Leistungsumfang | hf-06 | Unterlagen am Besprechungstisch |
| Kampagnen/Marketing | hf-15 | Gedrucktes Layout im Gespräch |
| Preise/Ablauf | hf-10 | Dokumentbesprechung im Empfangsbereich |
| Kontakt | hf-05 | Persönliches Gespräch am Tisch |
| NeX Agentic AI | hf-13 | Gemeinsame Prozessunterlagen in einer Fertigung |
| API / Wissensübersicht | hf-16 | Pläne und technisches Modell am Arbeitstisch |
| TEILEKLAR-Markenverweis | hf-08 | Logistik-/Förderanlagen-Szene, kein Produktfoto |
| Homepage-Abschluss | hf-17 | Freigestellte Markenfiguren, unten bündig |

Markenbilder sind ausdrücklich Inszenierungen, keine Produkt-Screenshots oder Kundenreferenzen. Alt-Texte beschreiben Sichtbares. Home-Teaser und dazugehörige Detailseite teilen dieselbe Zuordnung. Landschaftsbilder bleiben 16:9 ohne Personenbeschnitt. Tatsächliche Shop-Produktbilder kommen ausschließlich aus dem zugeordneten Artikel.

## Frontend-Flächen
- Homepage: bestehende Reihenfolge und Texte beibehalten; Hero, Angebote, Produktwelt, Kalkulation, persönlicher Abschluss, Footer
- Öffentliche Seiten aus `config/site-map.json` / `apps/site/.generated/public-site.json`: echte Inhaltsabschnitte, kohärenter Bild-/Text-Einstieg, passende Verknüpfung und nächste Handlung
- Zehn Leistungs-/Produktseiten: je acht konkrete Fragen, lokalisierte SSR-Metadaten, Canonical, tatsächlich verfügbare Sprachvarianten, FAQ/Service-JSON-LD
- Kontakt: bestehendes echtes Formular früh im Seitenfluss. Termin-/Gutscheinseiten bieten eine **Anfrage**, keine vorgetäuschte bestätigte Buchung oder ausgegebenen Gutscheincode
- TEILEKLAR: Schaufenster, Originalfotos, Kategorien, Suche, Filter, Sortierung, Produktdetail, Warenkorb, Checkout-Oberfläche, Bestellübersicht und bestehende Hilfswerkzeuge
- Kunden-/Partner-/Operatorseiten: geschützte Datenansichten mit Anmeldung, Navigation, Lade-/Fehler-/Leerzuständen, Listen und Details statt nackter JSON-Sperrseite
- Sitemap/Robots: App-Router-Routen statt kollidierender zusätzlicher Dateien in `public/`

## Präzise Fehlerbehandlung
- Root-Hydration: Nutzer-Diff betraf externe `cz-shortcut-listen`- und `color-scheme`-Attribute. Eng begrenzte Attributtoleranz ausschließlich an `html`/`body`, deterministischer dunkler Grundmodus. Keine Konsolenfilter, keine globale Abschaltung von Hydration-Prüfungen.
- Eigene Client-Zustände initial deterministisch (Sprache, Resize, Cart-Ladeanzeige).
- Private Routen liefern nur HTML-Shells/Gates, keine privaten Daten. `Cache-Control: private, no-store`; Backend bleibt Rechteautorität.
- Echte private Leere ist keine Attrappe. Kein Dummy-Projekt zum Füllen.

## Prüfnachweise und Grenzen
- Historische Frontend-Berichte: `/app/test_reports/iteration_21.json` bis `iteration_24.json`; alte Fehlbefunde sind nicht automatisch aktueller Zustand.
- Bericht 24: öffentliche Routen geladen, reale Shopbilder geladen, Warenkorb im selben Kontext nach Reload vorhanden; fand zusätzlich Frontend-Proxy-Sperre und Robots/Sitemap-Konflikt. Beide wurden korrigiert und benötigen den abschließenden Frontend-Nachtest.
- TypeScript-Compile wiederholt erfolgreich; maßgeblich ist der letzte Nachtest nach Bild-/CSS-Konsolidierung.
- Frühere Backend-Ergebnisse vor Scopewechsel: echter Katalogimport, freigegebene 30 % Kalkulation, Kontakt/Resend und Revolut-Konfiguration. **Nicht Gegenstand der jetzigen Fertigstellungsbehauptung.**
- Keine Live-Zahlung, Lieferantenbestellung oder neue Mail im abschließenden Frontendtest.
- Keine behauptete Gesamtfertigstellung, solange konkrete Frontend-Fehler offen sind. Keine Behauptung einer juristischen oder normativen Zertifizierung.
