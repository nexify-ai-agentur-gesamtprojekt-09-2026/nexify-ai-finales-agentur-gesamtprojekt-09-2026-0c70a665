# Designsystem — NeXify AI × TEILEKLAR

**Fachtiefe zur Gestaltung.** Die Werte selbst stehen in `design/tokens.json` (L0), die Schichtenregeln in `ARCHITEKTUR.md`, die verbindliche Betreibervorgabe in `CLAUDE.md`. Dieses Dokument erklärt, *warum* das System so aussieht.

Ein Designsystem für zwei Marken, die dasselbe System sind: **NeXify AI** (nexifyai.cloud) baut und betreibt Automatisierung, **TEILEKLAR** (teileklar.shop) verkauft Kfz-Ersatzteile mit belegter Passung und führt Kunden an Partnerwerkstätten weiter. Beide teilen Konten, Termine, Belege, Farbsystem, Typografie, Bewegung und **einen** Footer.

Ein Logo wurde **nicht** neu gezeichnet. Das Master-Signet liegt als `assets/nexify-ai/nexify-ai-signet.svg` vor, die Wortmarken als `wordmark-horizontal.png` / `wordmark-stacked.png`.

**Absichtliche Ergänzung gegenüber den Quellen: keine.** Jede der 20 Komponenten hat ihr Vorbild in mindestens zwei der gebauten Oberflächen. Was in den Quellen nicht vorkommt (Toast, Avatar, Tabs, Tooltip, Dialog), wurde bewusst **nicht** erfunden.

---

## Inhaltliche Grundlagen

**Grundhaltung: Klartext vor Fachsprache.** Das ist keine Stilvorliebe, sondern die härteste Regel des Systems. Fachbegriffe werden übersetzt, nicht erklärt:

| Nicht so | Sondern so |
|---|---|
| Passung belegt | Passt zu deinem Auto |
| Prüfung erforderlich | Eine Frage offen |
| Fehler bei der Validierung | Diese Nummer hat vier Stellen |
| Kontaktieren Sie uns | Schreiben Sie an mail@nexifyai.cloud |

**Anrede.** TEILEKLAR duzt (Endkunden, Autofahrer). NeXify AI siezt (Unternehmen, Werkstattinhaber). Die Portale folgen der Rolle: Kundenportal und Partnerportal siezen, das Nachbarschaftskunden-Portal siezt ebenfalls — es geht dort um Termine und Geld.

**Ton.** Nüchtern, konkret, ohne Superlative. Zahlen statt Adjektive. Kein „innovativ", „modernst", „einzigartig", „revolutionär". Wenn etwas gut ist, steht die Zahl da.

**Ehrlichkeit über Grenzen.** Wo etwas offen ist, steht das im Text — nicht im Kleingedruckten: „Fertiglösungs-Preise hängen von Produkt- und Branding-Umfang ab — auf Anfrage, kein pauschaler Rabattsatz."

**Überschriften sind Sätze**, keine Fragmente. „Wer sind Sie gerade?" · „Einmal entwickelt. Unter Ihrer Marke eingerichtet." · „Jede Oberfläche übergibt an die nächste — ohne Bruch." Punkt am Ende, wenn es ein Satz ist.

**Mehrsprachigkeit.** Jede Nutzeroberfläche existiert in de/nl/fr — nie „nur Deutsch mit Sprachhinweis". Sieben Märkte: de-DE, de-AT, de-CH, nl-NL, nl-BE, fr-BE, fr-LU. Ein nicht existierender Markt (etwa fr-FR) darf nirgends auftauchen.

**Zahlen nach DIN 5008, ausnahmslos.** Komma als Dezimaltrennzeichen, Punkt als Tausendertrennzeichen, geschütztes Leerzeichen vor der Einheit, Datum TT.MM.JJJJ, 24-Stunden-Zeit: `2.694,00 €` · `288 × 25 mm` · `2,2×` · `17.09.2026, 14:30`

Musterdaten sind immer „Erika/Max Mustermann · Heidestraße 17 · 51147 Köln" — nie „Lorem" oder „test@test.de".

**Kein Emoji.** Nicht Teil der Marke, in keiner Oberfläche, in keinem Dokument.

**Referenzen sind anonymisiert** (Beschluss vom 04.09.2026): Branche + Leistung + Kennzahl. Keine Kundennamen, keine Kundendomains. Einzige Ausnahme ist der Eigenbetrieb TEILEKLAR.

---

## Visuelle Grundlagen

### Farbe

Eine Palette, zwei Marken. **Maximal zwei Hintergrundfarben pro Ansicht** — Papier + Weiß, oder Graphit + Papier.

Neutrale sind aus genau zwei Hue-Familien abgeleitet: Schrift aus Tinte→Weiß, Flächen aus Papier→Tinte/Weiß. Deshalb wirkt nichts „bunt neutral".

**Lime `#C8F04B` ist der einzige Markenakzent.** Er erscheint als Schaltfläche, Punkt, Kante oder kleine Kapsel — **nie als große Fläche unter Fließtext**. Text auf hellem Lime ist immer Tinte `#14191C` oder Lime-dunkel `#4A5C10`.

**Amber `#E8871F` auf `#FBF3E9` bedeutet ausschließlich „eine Frage offen".** Amber ist nie dekorativ. Wer eine Karte anders aussehen lassen will, nimmt `tone="flaeche"`, nicht Amber.

Grün `#7BB80D` = passt. Rot `#C4432B` = blockiert. Beide nie allein — Klartext steht daneben.

Zur Doppel-Rampe (`#5F686D` gegen `#646769` und Geschwister) siehe `ARCHITEKTUR.md`, Entscheidung 1: kanonisch ist die Rampe aus `CLAUDE.md`, die zweite ist als abgelöst deklariert und läuft bis 31.10.2026 aus.

### Typografie

Zwei Familien, keine dritte.

- **Archivo** 500/600/700/800/900 — alles Lesbare: Überschriften, Fließtext, Schaltflächen, Navigation.
- **IBM Plex Mono** 400/500/600 — ausschließlich Kicker, Preise, Teilenummern, Maße, Status, Fußnoten, Codes.

Die Trennung ist semantisch, nicht ästhetisch: Mono heißt „das ist ein Datum", nicht „das soll technisch aussehen".

Überschriften tragen **negative Laufweite** (H1 −.05em, H2 −.04em, H3 −.03em) und Gewicht 800. Zeilenhöhe 1,05 bei Display, 1,6 im Fließtext. `text-wrap: balance` auf jeder Überschrift, `text-wrap: pretty` auf jedem Absatz.

**Mindestgröße 10,5 px, ausnahmslos** (DIN 1450). Auch Fußnoten, auch Plattformleiste, auch Betreiberzeile.

### Raster und Abstand

**4-px-Raster.** Jedes padding, margin und gap ist ein Vielfaches von 4 — keine 7, 9, 10, 15, 22.

Sektionsabstand 84 px auf Desktop, 56 px auf Mobil. Vier Containerbreiten: 1280 (Seiten), 1080 (Inhalt), 1000 (Werkzeuge), 760 (Rechtstexte) — jeweils `min(X, calc(100% − 56px))`.

**Sibling-Gruppen liegen immer in Flex oder Grid mit `gap`** — nie durch Quelltext-Leerzeichen oder Einzelmargins getrennt.

Karten-Raster ist `repeat(auto-fit, minmax(…, 1fr))`; wo Spalten unterschiedlich breit sein sollen, Flexbox mit `flex: 1 1 <basis>` und `min-width: 0` — nie `auto-fit` für ein Zwei-Spalten-Layout, weil sonst bei mittlerer Breite ein Waisenblock entsteht.

### Hintergründe und Verläufe

Flächen sind flach. Es gibt **genau eine erlaubte Verlaufsfläche**: das Lichtkern-Band (Graphit mit Lime-Aura oben links plus 80-px-Spaltenraster in `rgba(255,255,255,.035)`) — als Hero-Studiobühne und als dunkles Panel. Maximal ein bis zwei pro Seite.

Keine Fotohintergründe, keine Texturen, keine Muster. Produktbilder liegen freigestellt auf `--nx-flaeche`.

### Tiefe

Ein Standardschatten: `0 1px 2px rgba(14,19,21,.05)`. Ein Hover-Schatten: `0 12px 28px −18px rgba(14,19,21,.40)` bei `translateY(-3px)`. Ein Schwebe-Schatten für Dialoge. Mehr gibt es nicht — ein stärkerer Schatten braucht einen Anlass.

### Radien

10 px Eingaben · 12 px Schaltflächen · 14–16 px kleine und mittlere Karten · 18–20 px Standardkarten · 24 px große Panels · 99 px Kapseln · 5 px Signet-Quadrat · 24 % und 50 % als skalenrelative Radien für Signet-Badges.

### Bewegung

Bewegung transportiert Zustand, nie Dekoration.

- Hover-Rahmen `border-color .2s ease`
- Karte anheben `transform .25s ease`, maximal −3 px
- Einblendung `.32s cubic-bezier(.22,.7,.3,1)` von 16 px Versatz
- Kopfzeile einfahren `max-height .32s`
- Companion 6 s (idle) bis 14 s (autopilot), 0,95 s (success)

`prefers-reduced-motion: reduce` schaltet **jede** Animation und **jeden** Übergang ab — global in `tokens/motion.css`.

### Zustände

- **Hover** hell: Rahmen wird Tinte, Karte hebt sich 3 px, Lime wird `#D5F76C`.
- **Hover dunkel**: Rahmen und Schrift werden Lime.
- **Fokus**: `outline: 2px solid #4A5C10`, `outline-offset: 2px` — sichtbar, nie entfernt.
- **Aktiv/gewählt**: Tinte-Fläche mit Lime-Punkt (Chip), Lime-Kapsel (Plattformleiste), `aria-pressed` bzw. `aria-current`.
- **Deaktiviert**: Opazität 0,45, `cursor: not-allowed` — nie ausgegraute Farbe erfinden.

### Klickflächen

**44 px Mindesthöhe für jedes bedienbare Element** — auch für die kompakte Schaltflächengröße S, auch für Chips, auch für Eingaben. Ikonen-Schaltflächen (quadratisch, `aria-label` statt Text) sind von der Höhe-zu-Schriftgröße-Regel ausgenommen, nicht von der Klickfläche.

### Transparenz und Blur

Nur an zwei Stellen: die Shop-Kopfzeile (`rgba(242,243,239,.92)` + `blur(20px)`) und Flächen auf Graphit (`rgba(255,255,255,.045)`). Sonst deckende Farben.

### Bildsprache

Produktbilder freigestellt, neutral ausgeleuchtet, kühler Graphit-Hintergrund, kein Grain, keine Filter. Der Companion ist die einzige „Figur" — kein Maskottchen, kein Gesicht, kein Roboter.

---

## Ikonografie

**Icons sind schlanke Lucide-artige SVGs**, inline geschrieben:

- `stroke-width` 1,9–2,6
- `stroke-linecap="round"`, `stroke-linejoin="round"`
- `fill="none"`, `stroke="currentColor"`
- **nie** gefüllte Piktogramme, **nie** Farbverläufe in Icons

Es gibt **keine Icon-Schriftart und kein Sprite** in den Quellen — die Oberflächen zeichnen ihre wenigen Icons inline. Dieses System übernimmt das: wo ein Icon nötig ist, steht ein Inline-SVG; wo keines nötig ist, steht keines. Der Pfeil im Accordion und das Häkchen in der Checkliste sind die einzigen Icons in den Komponenten.

**Statuspunkte statt Statusicons.** Ein 8-px-Kreis in Grün, Amber oder Grau, immer mit Klartext daneben, ersetzt das, wofür andere Systeme Icons verwenden.

**Kein Emoji**, keine Unicode-Piktogramme als Icon-Ersatz. Der einzige verwendete Sonderzeichen-Satz sind Interpunktion (· — ×) und Pfeile (→ ←).

**Marken-Assets** liegen in `assets/nexify-ai/`: das Master-Signet als SVG (nie umzeichnen, nie lokal duplizieren), beide Wortmarken als PNG, das Porträt als WebP. TEILEKLAR hat kein eigenes Signet-Artwork — dort steht ein Lime-Quadrat mit 5 px Radius vor dem Schriftzug, so wie es in allen gebauten Oberflächen erscheint.

---

## Der Companion

Die eine Produktgestalt von NeXify AI: **ein Signet, elf Zustände.**

```
idle · thinking · research · browsing · building · orchestrating
validating · success · warning · error · autopilot
```

Bewegung und Halo wechseln, die Kernform nie. Bei konkurrierenden Zuständen gilt:

`error > warning > validating > orchestrating > browsing > research > building > thinking > success > autopilot > idle`

**Barrierefreiheit:** `warning` und `error` dürfen nie allein über den Halo kommuniziert werden — immer zusätzlich Klartext oder `aria-live`. Rein dekorativ eingesetzt trägt das Signet `aria-hidden="true"`.

Die alte Produktfigur (KLARA, Cyan/Azure) ist abgelöst und darf nirgends als zweite Identität weiterlaufen. State-Contract, Prioritätsregel und Timings stehen in `design/tokens.json` unter `companion`; die Referenzimplementierung ist `NeXify-AI-Companion.dc.html`.

---

## Komponenten-Inventar

| Gruppe | Komponenten |
|---|---|
| `components/foundations/` | Kicker · SectionHeader · StepNumber |
| `components/core/` | Button · Chip · Card · Badge · StatusDot |
| `components/forms/` | Field · TextInput · SelectInput · Checkbox · Switch |
| `components/data/` | DataRow · KpiTile · Accordion |
| `components/brand/` | Companion · Wordmark · DarkPanel · PlatformBar |

Komponenten sind React-Funktionskomponenten ohne Abhängigkeiten außer React. Sie stylen über die CSS-Variablen — kein CSS-in-JS, keine Klassenbibliothek. Sie sind Spezimen und Fremdcode-Schnittstelle, **nicht** die Laufzeit der ausgelieferten Flächen (siehe `ARCHITEKTUR.md`, L1).

```html
<link rel="stylesheet" href="styles.css" />
```

Das ist der einzige Einstiegspunkt. Er lädt Schriften, Farben, Typografie, Raster, Formen, Bewegung und die Grundlage.

Die Vorschau-Dateien (`*.card.html`, `ui_kits/*/index.html`) laden das vom Compiler erzeugte Bundle. Fehlt es — etwa beim Öffnen direkt aus dem Projektordner — springt `_ds_preview_runtime.js` ein und lädt die Komponenten-Quellen nach.

`guidelines/` enthält 19 Spezimen-Karten zu Farbe, Typografie, Raster und Marke.

---

## Abnahme-Prüfliste

Vor jeder Auslieferung:

1. `node scripts/check-system.mjs` → **0 Fehler**. Neue Dateien zusätzlich `--strict`.
2. Nur Tokens aus `design/tokens.json` — keine neu erfundenen Hexwerte, keine dritte Schriftart.
3. Jede Schriftgröße ≥ 10,5 px.
4. Jedes padding/margin/gap ein Vielfaches von 4.
5. Jede Klickfläche ≥ 44 px.
6. Genau eine `primaer`-Schaltfläche pro Sektion.
7. Amber nur bei offenen Fragen.
8. Zahlen nach DIN 5008.
9. Fokus sichtbar, Kontrast AA, Status nie allein über Farbe.
10. `prefers-reduced-motion` geprüft.
11. Keine offenen `{{ }}`-Platzhalter, kein horizontaler Überlauf.
