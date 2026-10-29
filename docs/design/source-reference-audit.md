# Originalquellen für den quellentreuen Neuaufbau

Stand 26.10.2026. Zugehöriger Quellenkatalog mit SHA256, Abmessungen und N2-Abgleich: [design-reference-audit.json](../../config/design-reference-audit.json). Untersucht wurden die eigenen Originalprototypen, Markenassets, historischen Abnahmebilder und Designwerte. Die abgelehnte Reactoberfläche ist **keine Designreferenz** dieses Audits. Anwendung, CSS und Assets wurden nicht geändert; keine neuen Bilder wurden erzeugt.

Die aktuelle Zielvorgabe ist der vom Nutzer beschriebene Screenshot: Originalmarke, Navigation „Produkte / Leistungen / Ressourcen / Unternehmen / Preise“, „Projekt besprechen“, Graphit/Lime, H1 „Mehr Zeit für Kunden. Weniger Arbeit dazwischen.“, drei Figuren mit Ganzkörper-Pascal, NeX-Orb und AIFly-Vogel sowie Produkt-/Partnerstreifen. Die Screenshot-Binärdatei stand dieser Teilprüfung nicht lokal zur Verfügung. Der Vergleich erfolgt deshalb gegen diese konkreten Anforderungen, **nicht als durchgeführter Pixelvergleich**.

## Was die Originale tatsächlich enthalten

| Baustein | Tatsächliche Quelle | Quellentreue Wiederverwendung und Grenze |
| --- | --- | --- |
| Signet und Markenname | `prototypen/NX-Header.dc.html:77–84`, `assets/nexify-ai/nexify-ai-signet.svg` | Originales botanisches Lime-Signet und „NeXify AI“ mit Lime-X. SVG unverändert als Asset nutzen, einschließlich vorhandener C2PA-Metadaten. Keine Ersatzmarke zeichnen. |
| Header | `NX-Header.dc.html:74–110` | Sticky-Fläche, Lichtverlauf, Container, Logo-/Navigationsabstände, Fokus und Lime-CTA sind konkrete Vorlagen. Die historischen Menüpunkte lauten „NeXify AI one / Demos / Shop / Preise & Rechner / API“ (`:142`), der CTA „Erstgespräch starten“ (`:169`). Die jetzt gewünschte Navigation und „Projekt besprechen“ stammen aus der aktuellen Nutzerentscheidung. |
| Hero | `NeXifyAI Cloud v12.dc.html:87–107` | Originaler Zweispaltenaufbau mit großer Typografie und rechts einem animierten Anfrage-/Agent-/Antwort-/Kalenderfluss. Der historische H1 lautet **„Routine erledigt ein Agent. Sie entscheiden.“**. Er entspricht nicht dem aktuellen Screenshot-H1 und enthält keine Drei-Figuren-Szene. |
| Unter dem Hero | Cloud v12 `:112`, `:894`, `:897` | Ein Textlaufband mit Fähigkeiten und ein getrenntes Zusagenraster. Kein belegter Partnerlogo-Streifen. Abstände und Trennlinien sind nutzbar; Partnerschaften oder Logos dürfen daraus nicht erfunden werden. |
| Zahlenlayout | Cloud v12 `:124–139`, `:925` | Vorher-/Nachher-Balkenkarte, seitlicher Rechner und sechsteiliges Kennzahlenraster. Die Balkenwerte sind ausdrücklich Beispiele. Historische Leistungszahlen und Preise werden durch ihr Vorkommen im HTML nicht neu bestätigt. Nur die Struktur übernehmen; Werte separat an autorisierte Fakten binden. |
| Footer | `prototypen/NX-Footer.dc.html` | Originalmarke, Farbflächen, Schrift- und Linksystem als eigene Komponenten nachbauen; historische Rechts-/Firmen-/Produktangaben nicht ungeprüft übertragen. |

Die historischen Bilder `docs/07-abnahme/01-v12-ist.jpg` und `01-v12-grafik.jpg` wurden visuell geöffnet. Sie bestätigen den älteren Header, den abweichenden H1 und den Prozessfluss. Sie sind keine Aufnahme des aktuell beschriebenen Drei-Figuren-Zielbilds.

## Vorhandene und fehlende Bildquellen

- `pascal-courbois-optimiert.png`: 760 × 1.032, RGBA, visuell geprüfter freigestellter **Oberkörper**, kein Ganzkörpermotiv.
- `pascal-courbois.webp`: 380 × 516, RGBA; weitere vorhandene Varianten sind 1:1, 4:5 und 16:9. Andere Seitenverhältnisse erzeugen keine fehlenden Beine oder eine Ganzkörperaufnahme.
- `nexify-ai-signet.svg`: reales vorhandenes Markensignet, **kein nachgewiesenes NeX-Orb-Artwork** des Zielbilds.
- `wordmark-horizontal.png` und `wordmark-stacked.png`: vorhandene Markenvarianten, 574 × 40 beziehungsweise 408 × 90. Für den Webheader ist zusätzlich die tatsächliche Originalkombination aus SVG und gestalteter Wortmarke in `NX-Header` belegt.
- `signalfeld-s4492.png`: visuell geprüftes abstraktes Linien-/Lichtfeld, kein Orb- oder Vogelcharakter.
- `source-hero.png`: visuell geprüftes Auto-/Autoteilemotiv, 1.717 × 916. Der Dateiname macht es nicht zum NeXify-Hero; es gehört fachlich in den TEILEKLAR-Kontext.

In den geprüften Original- und N2-Assetverzeichnissen wurden **keine passenden Originaldateien für Ganzkörper-Pascal, den NeX-Orb oder den AIFly-Vogel** gefunden. Das ist eine konkrete Quellenlücke innerhalb dieses Prüfumfangs, keine Behauptung, dass solche Dateien nirgendwo existieren. Keine generischen Icons einsetzen, das Portrait nicht als Ganzkörper ausgeben und keine Figuren neu generieren. Die genaue Drei-Figuren-Szene bleibt bis zum tatsächlichen Originalmaterial offen.

Die ältere Charakter-CI in `docs/01-konzept/NeXifyAI-CI-und-Logo.md` beschreibt Badge-Formen mit demselben botanischen Signet. Sie belegt die jetzt gewünschte Orb-/Vogelform nicht. Ihr älteres Lime `#C8F04B` darf außerdem nicht die aktuelle Bildschirm-Tokenquelle `#D7FA50` überschreiben.

## Konkrete ursprüngliche Layoutwerte

Aus `config/design-tokens.json` und der tatsächlichen v12-CSS, nicht aus der abgelehnten Reactoberfläche:

| Eigenschaft | Quellwert |
| --- | --- |
| Graphit-Grund / tiefe Fläche | `#242826` / `#1B1E1D` |
| Bildschirm-Lime / Primärtext | `#D7FA50` / `#FFFFFF` |
| Schrift | Geist und Geist Mono, eigene WOFF2-Dateien |
| Inhaltsbreite | `min(1280px, calc(100% - 48px))` |
| Hero-Spalten / Abstand | `minmax(0,6fr) minmax(0,6fr)` / 48 px |
| Hero-Padding | oben 72 px, unten 64 px |
| H1 | 80 px, Zeilenhöhe `.98`, Laufweite `-.04em`; tatsächliche v12-CSS: 52 px bis 1.040 px und 40 px bis 640 px |
| Header-Mindesthöhe | 72 px |
| Signet im Header | 34-px-Box, 26-px-Bild |
| Header-Wortmarke / Navigation | 21 px / 15 px |
| Mindestziel / Fokus | 44 px / 2 px Lime mit Abstand |

Die generische Tokenbeschreibung nennt für mobile H1 einen Bereich von 38–52 px; die konkrete v12-Regel ist 40 px bei 640 px. Diese beiden Aussagen wurden nicht als identischer CSS-Wert ausgegeben. Originale Bewegungsvorlagen enthalten Reduced-Motion-Regeln; daraus folgt keine Freigabe für Audio-Autoplay oder erzwungene Navigation.

## Empfehlung für die Umsetzung

1. Logo/SVG, Wortmarkenbehandlung, eigene Schriften, Tokenfarben, Header-/CTA-Geometrie und Footer aus den benannten Originalbausteinen quellentreu **in eigene React-Komponenten nachbauen**. Die `.dc.html`-Dateien sind Vorlagen; deren `x-dc`, `sc-if`, `sc-for`, Templateausdrücke und `support.js` werden nicht als Produktionsruntime übernommen.
2. Aktuelle Nutzertexte für Navigation, CTA und H1 gezielt einsetzen und als aktuelle Vorgabe behandeln. Die historischen Prozessfluss-Illustrationen sind keine passende Ersatzszene für das Drei-Figuren-Zielbild.
3. Vorhandene Portraits nur an Portraitstellen einsetzen. Die fehlenden drei Originalfiguren und der konkrete Produkt-/Partnerstreifen bleiben sichtbar dokumentierte Lieferlücken; keine vorgetäuschte visuelle Fertigstellung.
4. Fachliche Inhalte, Rechts-/Firmendaten und Kennzahlen getrennt prüfen. Layoutwiederverwendung ist keine Freigabe historischer Erfolgszahlen, Preise oder Partnerbehauptungen.

Die N1-/N2-Hashes stehen vollständig im JSON. Header, Footer und Cloud-v12 sind zwischen beiden Ständen **nicht bytegleich**; Design-Tokens und die historische Charakter-CI sind bytegleich. Die beiden Quellen wurden daher nicht still zusammengeworfen.

Die im aktiven Auftrag gemeldeten ChatGPT-403- und Cloud-404-Antworten verleihen keinen Zugriff auf Plattformquellcode oder sämtliche ChatGPT-Daten. In dieser Prüfung wurde kein solcher Code heruntergeladen oder kopiert. Prüfung: JSON lesbar, 22 Originaldateihashes nachgelesen; keine breite Testsuite und keine Designabnahme.
