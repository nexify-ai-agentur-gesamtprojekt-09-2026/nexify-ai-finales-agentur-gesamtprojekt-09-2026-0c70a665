# Quellenzuordnung: Leistungs- und Entscheidungsseiten

Stand: 26.10.2026. Ergänzender fachlicher Inhaltsausbau für `services`, `websites`, `automation`, `apps-portals`, `scope`, `solutions` und `pricing` im kanonischen N1-Seitenmodell. Je Seite wurden drei zusätzliche Abschnitte ergänzt. Bestehende Abschnitte und öffentliche Aktionswege bleiben erhalten. Bei `scope` wurde die bisherige Ansprache in Überblick, Kurztext und Metadaten auf Du umgestellt; NL/FR wurden entsprechend angeglichen. Alle neuen Inhalte haben denselben fachlichen Umfang in DE/NL/FR.

## Gelesene Quellen und Übernahmeentscheidung

Die N1-Originaldatei `prototypen/NeXifyAI Cloud v12.dc.html` wurde als sichtbarer Gesamttext gelesen, einschließlich der ergänzenden Datendefinitionen `BAUSTEINE`, `WEGE`, `STUNDEN`, `STATIONEN` und `FAQ`. Konkrete Grundlagen sind die Abschnitte „Was Sie bei uns bekommen“, „Der Baukasten“, „Zwei Wege, ein Fundament“, „Ein Arbeitstag mit NeXify“, „Preise & Rechner“, „Vom Gespräch zum Betrieb“ und die Einwände. Diese beschreiben Chat-Agent, Terminbuchung, E-Mail-Triage, Angebotsentwurf, Kundenportal, dokumentengestütztes Wissen und Website/Shop sowie die Trennung von Einrichtung, Entwicklung und Betreuung.

`prototypen/Kundenwege.dc.html` wurde als sichtbarer Gesamttext gelesen: Rolle und Registrierung, Angebotsfassung/Annahme/Ablehnung/Weiterleitung, Rechnungsdaten, Team und Kickoff. `prototypen/Kundenportal.dc.html` wurde gezielt in den Bereichen Hero/Angebote/Projekt/Rechnungen/Dokumente gelesen. Es dient als fachliche Referenz für den Inhalt eines Kundenportals, nicht als Nachweis einer schon produktiven Portalimplementierung.

`docs/09-final/02-informationsarchitektur-und-journeys.md`, `05-technische-spezifikation.md` und `14-gesamtsystem-und-portale.md` wurden für Nutzerwege, Datenbereiche, Rollen, Zustände, Dokumente, Schnittstellen und Prüfung gelesen. Sie beschreiben Zielzustände; ein vorhandener API-Entwurf beweist keine freigeschaltete Kundenfunktion. Der vorhandene NeX2fly-Quellennachweis wird ausschließlich für die bereits getrennt beschriebene Suite-/Produktfamilie referenziert. Die dort dokumentierten aktuellen Nutzerentscheidungen haben Vorrang vor historischen Mindestaufladungen oder Rollenannahmen.

Die Small-Business-Installation wurde hashgeprüft (216 Quelldateien, 44 Skills); `content-strategy` mit Referenzen wurde als Gliederungshilfe geladen. Dies ist keine Quelle neuer Unternehmensfakten, keine externe Kampagne, keine GEO-Ausführung und keine Connectoraktivierung.

## Konkrete Zuordnung pro Abschnitt

| Seite/Abschnitt | Aus dem Original übernommener fachlicher Gehalt | Quellen |
| --- | --- | --- |
| `services/leistung-auswaehlen` | Cloud-v12 „Vier Wege“ und Baukasten: Aufgaben Website, Anfrage-/Termin-/Postfachautomatisierung, geschützte Portale unterscheiden. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/02-informationsarchitektur-und-journeys.md` |
| `services/baustein-oder-individuell` | WEGE und FAQ: vorhandener Baustein mit Marke/Ton/Regeln/Anbindung gegenüber neuem Datenmodell/Systemzusammenspiel; Rechte und Betrieb separat klären. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `services/ergebnis-und-uebergabe` | Tagesziel, Vorschau, Berichte, Klärung und Abnahme aus Tagesablauf und Kundenwegen; kein garantierter Berichtstakt. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`prototypen/Kundenwege.dc.html` |
| `websites/inhalte-und-wege` | B8/Leistungswege und IA: Landingpage, Unternehmenswebsite und Shop nach Inhalt und Nutzerweg unterscheiden. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/02-informationsarchitektur-und-journeys.md` |
| `websites/vorschau-und-pruefung` | Cloud-v12 Vorschau/Kontakt und IA-Zustände: Inhalte, Navigation, mobile Nutzung, Fehlermeldung und echte Übermittlung als getrennte Prüfpunkte. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/02-informationsarchitektur-und-journeys.md` |
| `websites/pflege-und-verantwortung` | WEGE/FAQ: Code-/Datenübergabe individuell, Rechte bei Bausteinen und getrennte Pflege; keine ungeprüfte Eigentums- oder SEO-Garantie. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `automation/konkrete-bausteine` | BAUSTEINE B1/B2/B3/B4/B6: Chat, Termin, E-Mail-Triage, Angebotsentwurf und Wissen mit Quellen; Anwendungsmöglichkeiten statt bestätigter Integrationen. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `automation/systeme-und-regeln` | STATIONEN und STUNDEN: Anbindungen, Regeln, fehlende Angaben, Freigaben und menschliche Übergabe; technische Zielbeschreibung ergänzt Rollengrenzen. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/05-technische-spezifikation.md` |
| `automation/pilot-und-messung` | Kennzahl-Abschnitt und Vorschau: gleiche Kennzahl vor/nach freigegebenem Betrieb, mit Negativ-/Ausnahmeprüfung; keine übernommenen Beispielerfolge. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `apps-portals/portal-aufgaben` | Kundenportal Angebote/Projekt/Rechnungen/Dokumente und Portal-Funktionsmatrix; Ansehen, Annahme und Zahlung nicht gleichsetzen. | `prototypen/Kundenportal.dc.html`<br>`docs/09-final/14-gesamtsystem-und-portale.md` |
| `apps-portals/rollen-und-datenbereiche` | Kundenwege Team/Rollen und Technik-Mandantenmodell; explizite Rechte statt Menü-/Loginberechtigung. | `prototypen/Kundenwege.dc.html`<br>`docs/09-final/05-technische-spezifikation.md`<br>`docs/09-final/14-gesamtsystem-und-portale.md` |
| `apps-portals/ablauf-und-abnahme` | Angebotsautomat, Portalzustände und IA-Laden/Leer/Fehler/Gesperrt/Demo; Integrationen und Benachrichtigungen einzeln vereinbaren. | `prototypen/Kundenwege.dc.html`<br>`docs/09-final/14-gesamtsystem-und-portale.md`<br>`docs/09-final/02-informationsarchitektur-und-journeys.md` |
| `scope/ausgangslage-erfassen` | Cloud-v12 Audit/Anfrage sowie Schnittstellenquellen: konkreter Ablauf, vorhandene Systeme, Entscheider und sichere erste Beispieldaten. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/05-technische-spezifikation.md` |
| `scope/umfang-und-angebot` | Schriftliches Ergebnis/Audit, Angebotsfassung und Kundenwege: Umfang, Annahmen, prüfbare Ergebnisse; Chatentwurf bleibt unverbindlich. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`prototypen/Kundenwege.dc.html` |
| `scope/aenderung-und-uebergabe` | Kundenwege und Portalangebot Änderungswunsch/Abnahme sowie Vorschau; Änderungen mit Auswirkung dokumentieren. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`prototypen/Kundenwege.dc.html`<br>`docs/09-final/14-gesamtsystem-und-portale.md` |
| `solutions/agentur-oder-produkt` | Cloud-v12 vier Leistungswege, IA und aktueller NeX2fly-Nachweis: Projektauftrag, Suite, one/one+ und API fachlich unterscheiden. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/02-informationsarchitektur-und-journeys.md`<br>`docs/architecture/nex2fly-page-source.md` |
| `solutions/handel-und-shopprojekt` | Cloud-v12 Muster-Shop/Shop-Fertiglösung und Systemkarte: eigenständiger TEILEKLAR-Handel gegenüber Kunden-Shopprojekt; Muster beweist keinen Bestand. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/14-gesamtsystem-und-portale.md` |
| `solutions/kombination-und-grenzen` | Cloud-v12 Kombination der Wege und Technik/Portalrollen: Website→Ablauf→Projektübersicht als vereinbarte Verbindung ohne automatische Rechte. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/09-final/05-technische-spezifikation.md`<br>`docs/09-final/14-gesamtsystem-und-portale.md` |
| `pricing/aufbau-betrieb-verbrauch` | Preise-Abschnitt/FAQ: Entwicklung/Einrichtung, nachgelagerter Betrieb und Modellkosten trennen, ohne historische Tarife erneut zu veröffentlichen. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `pricing/aufwandsfaktoren` | WEGE: Marke/Regeln/Anbindung gegenüber neuem Datenmodell/Oberfläche; Abhängigkeiten statt Richtwert-Laufzeiten oder Preisgarantien. | `prototypen/NeXifyAI Cloud v12.dc.html` |
| `pricing/fragen-zur-kalkulation` | FAQ Eigentum/Betrieb/Festpreis und NeX2fly-Nachweis: Vertragsumfang, Rechte, Betreiber, Fremdkosten; Suite-Guthaben kein Agenturprojektpreis. | `prototypen/NeXifyAI Cloud v12.dc.html`<br>`docs/architecture/nex2fly-page-source.md` |

## Bewusst nicht übernommen

Die Ergänzungen übernehmen keine historischen Tagessätze, Paketpreise, Mindestaufladungen, Aufschläge, Rabatt-/Förderversprechen, Umsatz-/ROI-Ergebnisse, Antwortfristen, garantierten Fertigstellungstermine, behauptete Kundenzahlen oder bereits im Betrieb befindliche Integrationen. Code-/Datenrechte werden für die konkrete Vereinbarung beschrieben; aus dem alten Satz „Danach gehört der Agent Ihnen“ wird kein pauschales Recht an jedem Drittbaustein.

Vorhandene N1-/N2-Originale, Zahlenquellen und Rechtstexte wurden nicht geändert. Die sprachlich angepassten Inhalte sind fachliche Ergänzungen zum groben Seitenmodell, keine vollständige Portierung aller 94 Originalreferenzen. Sie ersetzen weder das konkrete Angebot noch Laufzeit-/Abnahmebelege. Auftragsumfang, Berechtigungen und verfügbare Anbindungen müssen für die einzelne Ausführung geprüft sein. Das akzeptierte Vercel-Live-Ziel bleibt davon unberührt; ChatGPT-Backup ist kein zusätzliches Produktfreigabegate.

## Quellensnapshot

| Gelesene Quelle | Rebuild-ID soweit vorhanden | SHA-256 |
| --- | --- | --- |
| `docs/09-final/02-informationsarchitektur-und-journeys.md` | `Dokument-/Entscheidungsquelle` | `2baeb53192a6f98ace40e3fdd72a0625186ad672c02573414a628d4c0b9c5dcb` |
| `docs/09-final/05-technische-spezifikation.md` | `Dokument-/Entscheidungsquelle` | `4622859aee95179ee8cef6d0315148b8b062fe7f1939538e16c0eba4baa69c9d` |
| `docs/09-final/14-gesamtsystem-und-portale.md` | `Dokument-/Entscheidungsquelle` | `1876597700cf1ac38ce9f69c37a524a327f978104214c95b8255be86cd7f8aa4` |
| `docs/architecture/nex2fly-page-source.md` | `Dokument-/Entscheidungsquelle` | `aec8ca6e9df0821d3b583490022ced048a6de5477258bde78b187c640b6c657c` |
| `prototypen/Kundenportal.dc.html` | `c499fcea5927` | `c969bb0f65ec31673ec0d9183ec65a64056c798c929fa4765592e3cc51754ff0` |
| `prototypen/Kundenwege.dc.html` | `48d2977d5c20` | `f558b25c757652a36b64f382216fa2485a434d28bfa11ceff037f1b8f213d82d` |
| `prototypen/NeXifyAI Cloud v12.dc.html` | `7b03d4cdbb5e` | `4f3befc8dd12803c781bc377d0611c83262bcb40907b01bbefac6784a6671ed5` |
