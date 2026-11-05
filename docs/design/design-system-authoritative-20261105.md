# NeXify Designsystem — maßgeblich (Stand 05.11.2026)

**Führungsentscheidung (Nutzer, 05.11.2026):** Die hochgeladene `NeXify_Startseite.html` ist das
**alleinige, systemweit gültige Designsystem**. Quelle versioniert unter
`docs/design/authoritative-startseite-20261105/` (`*.source.html` = Originalupload des Design-Components-Bundles,
`*.template.html` = extrahierte Vorlage, 94 KB). Dieses System ist **Entwurf, noch nicht verifiziert/zertifiziert**;
es durchläuft das Abschlussverfahren (Gates), aber keine bestandene Prüfung ist eine Abnahme oder ein
DIN-/ISO-Zertifikat (`docs/quality/standards-applicability.md`). Zahlen/Preise bleiben weiter nur aus
`config/fakten.json`; diese Datei ändert nur die Gestaltung.

Werte unten sind aus den Inline-Stilen der Vorlage **gemessen** (279 Stilattribute), nicht geschätzt.

## Palette (warm, dunkel, editorial)
| Rolle | Wert |
|---|---|
| Ink / Seitengrund | `#111312` · `#121314` · Verläufe `#16171A`/`#141518`/`#101113` |
| Fläche / Panel | `rgba(30,33,34,.91)` und `.6` (≈ `#1E2122`), Glas über `rgba(255,255,255,.10→.03)` |
| Text primär | `#F3F0EA` |
| Text sekundär | `#E2DFD8` |
| Text tertiär / gedämpft | `#B9BBBA` · `#BDC5C9` · `#CBD1D6` |
| Champagner-Akzent (Signatur) | `#C4B394` |
| Champagner-Verlauf | `linear-gradient(115deg,#F3F0EA 8%,#C4B394 62%,#BDC5C9 100%)` |
| Lime-Akzent | `#C0EE38`, Verlauf `linear-gradient(180deg,#DBF68A,#C0EE38 55%,#A6D820)` |
| Text auf Lime | `#111312` |

## Typografie
| Rolle | Schrift / Wert |
|---|---|
| Display | Plus Jakarta Sans 700, `clamp(32px,3.5cqi,48px)/1.15`, Tracking −.04em |
| Marke/Logo | Plus Jakarta Sans 700, `22px/1` |
| Fließtext | Inter, **15px** (dominant), auch 16/14/13px, Zeilenhöhe **1.65** |
| Einleitung | Inter 18–19px |
| Kicker/Meta | Geist Mono, 11–12.5px, Tracking `.16em` |
| Gewichte | 500 / 600 / 700 |

## Raster, Radien, Layout
- **Abstände:** 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 px, fluide über `clamp(…cqi…)`; Gutter `clamp(20px,4.5cqi,80px)`.
- **Radien:** 10 · 14 · 16 · 20 · 28 · 36 · 999px · 50 %. **Damit ist die offene Entscheidung E-RADIEN zugunsten der weicheren Skala (Masterplan-Familie) entschieden.**
- **Container:** `max-width:1680px`, zentriert; Lesebreiten 18–20ch (Labels) bis 46–65ch (Fließtext).
- **Responsive:** Container-Queries (`cqi`) statt reiner Breakpoints.

## Konflikte mit dem aktuellen DIN/ISO-Gate (zu klären, nicht still übernommen)
Das am 04.11. geschärfte Gate (`tools/css-norm.mjs`, `docs/01-konzept/Design-Norm.md`) erzwingt eine feste
Typoskala (12/14/16/18/20…) und Fließtext-Zeilenhöhe 1,6. Das maßgebliche Design weicht ab:

| Punkt | Maßgebliches Design | Aktuelles Gate | Bewertung |
|---|---|---|---|
| Fließtextgröße | 15px | 12/14/16/18/20 (15 nicht auf Skala) | Reine Skalenfrage — Gate an 15px anpassen. |
| Zeilenhöhe Fließtext | 1,65 | 1,6 | Skalenfrage — Gate anpassen. |
| Zwischengrößen 13px | 13px | 14px nächster Wert | Skalenfrage — zulassen. |
| **Kicker 11px / 12.5px** | 11 / 12.5px | **≥ 12px Pflicht (WCAG/Lesbarkeit)** | **Echter Barrierefreiheits-Konflikt.** 11px bleibt zu klein; Vorschlag: Kicker-Mindestgröße 12px, Owner-Entscheid Pascal. |
| Abstände 10/14px | 10 · 14px | 8-pt-Raster (10/14 außerhalb) | Das Design nutzt sie bewusst — Rasterregel um 10/14 erweitern oder als Design-Ausnahme führen. |

## Gestufte Übernahme (Blast-Radius, daher nicht in einem Zug)
Die Umstellung berührt `config/design-tokens.json`, `packages/tokens/*`, `apps/web/app/*.css`, alle Komponenten
und macht sämtliche Browser-Nachweise neu nötig (`change-impact-policy.json`: erst Audit/Shadow, bestehende Arbeit
erhalten, reversibler Schritt vor Cutover). Reihenfolge:
1. **Tokens angleichen** (Farben, Typo, Radien, Container) an die gemessenen Werte; Gate-Skalen (css-norm, Design-Norm) mit den vier Skalenpunkten oben nachziehen; Kicker-Konflikt offen an Pascal.
2. **globals.css + Kernkomponenten** auf die warme Palette umstellen, je Zyklus mit Playwright-Nachweisen.
3. **TEILEKLAR** behält eigene Marke, erbt aber dieselbe System-Grammatik.
4. Hero/Bildserie und Einmaligkeit darauf aufsetzen.

## Komponenten-Bibliothek (hochgeladen 05.11.2026) — maßgebliches Pendant zur Startseite
Quelle versioniert: `NeXify_Komponenten.source.html` (Originalupload, 613 KB) und `NeXify_Komponenten.template.html`
(extrahierte Vorlage, 37 KB) im selben Verzeichnis. Die Bibliothek definiert die systemweite Komponenten-Grammatik
in zehn Abschnitten: **Farb-Tokens · Typografie · Buttons & Links · Formular · Chips, Badges & Nav · Karten & Panels ·
Rückmeldungen · Tabs, Schalter & Fortschritt · Tabelle · Glas & Bewegung**. Typografie bestätigt: Display Plus Jakarta
Sans 500–800 (Tracking −.03/.04em), Fließtext Inter 400/500/600 (line-height 1.6), Mono Geist Mono.

**Gemessene Palette (Häufigkeit):** `#C4B394` Champagner (21× — häufigster Akzent, Signatur) · `#F3F0EA` / `#E2DFD8`
Text · `#C0EE38`/`#DBF68A`/`#A6D820` Lime · `#BDC5C9` tertiär · `#B9BBBA` gedämpft · `#111212`/`#111312` Ink ·
`#1E2122` Panel · `#15171A` Verlaufsstopp · `#8C8F8E` (10×, beobachteter gedämpfter Grauton — Rolle noch nicht
zugeordnet, daher **nicht** als Token erfunden; Entscheid/Benennung offen).

**Umsetzung 05.11. (Stufe 1 Ergänzung):** Der Signatur-Akzent **Champagner `#C4B394`** fehlte im Token-Layer, obwohl
oben als Signatur geführt. Ergänzt in `apps/web/app/masterplan-tokens.css`: `--color-brand-champagne` + Alias
`--color-marke-champagner` + `--gradient-champagner` (`linear-gradient(115deg,#F3F0EA 8%,#C4B394 62%,#BDC5C9 100%)`).
Token eingeführt (verfügbar); die Komponenten-Adoption (Champagner in Karten-/Panel-/Akzentflächen) ist Stufe 3b.
Die `{{ s.name }}/{{ s.hex }}`-Swatch-Liste ist eine JS-Datenschleife in `data-props` der Komponenten-Nodes; die
exakten Token-Namen folgen bei der Stufe-3b-Adoption aus dieser Datenquelle, nicht aus Schätzung.

## Offene Leg: kanonische Basis-Tokens warm angleichen (GAP-TOKENBASE-20261105)
Der Cutover 05.11. warmte den **Laufzeit-Override** `apps/web/app/masterplan-tokens.css`; der Render ist dadurch
systemweit warm. Die **kanonische Quelle** `config/design-tokens.json` hält jedoch weiterhin die historische kühle
`graphit`-Skala (#080A0F/#0F131A/#141A22 …) neben der bereits warmen `atelier`-Skala, und `packages/tokens/tokens.css`
spiegelt die kühlen Werte. Konsumenten, die **nicht** über den CSS-Override laufen, lesen daher noch kühl:
- `apps/site/pwa/plugin.mjs` (public-pwa-Manifest `theme_color`/`background_color` = `color-graphit-900`) — nur im
  expliziten `public-pwa`-Build, nicht Default-Produktion.
- statische `theme-color` in `apps/site/index.html` — **behoben 05.11.** auf #111312 (kein Token, Dokument-Chrome).

AGENTS schreibt `config/design-tokens.json` als Quelle der Wahrheit vor; die graphit-Skala dort warm zu schreiben ist
die saubere Stufe-1-Vollendung, hat aber **großen Evidenz-Blast-Radius** (identity-hero, one-app critical/text-spacing,
shop-design-reference, observability). Daher **bewusst als eigene gestufte Leg** geführt (change-impact: erst Shadow,
reversibel), **nicht** als Autopilot-Big-Bang. Owner/Next: deliberat in einem Zyklus mit vollständiger Evidenz-Neuerhebung.
