# NeXify AI – Design Guidelines (CI beibehalten, keine Implementierung)

> **Priorität:** Aktuelle ausdrückliche Vorgaben von Pascal haben Vorrang vor älteren Prototypen. **Kein Rebranding.** Bestehende finale Markenassets verwenden.
>
> **Quelle der Wahrheit:** `/app/config/design-tokens.json` und daraus generiert `/app/packages/tokens/tokens.css`.

---

## 0) Nicht verhandelbar (aus der CI / Arbeitsfassung 29.10.2026)
- Markencharakter **„Graphite“**: hochwertig, klar, ruhig, räumlich, persönlich, technisch souverän.
- **Großzügige Flächen**, präzise Typografie, **ruhige grüne Akzente**, gezielte **Licht-/Glas-/Schatten-/3D-Wirkung**.
- **Full-Width mit gemeinsamem Raster**: keine zufälligen Breitenwechsel zwischen Sektionen.
- **Kein Flachmachen**: Tiefe entsteht über Token-Schatten, subtile Spotlights, Glas/Reflexe – nicht über neue Farben.
- **Keine neuen Rasterwerte erfinden**: 8px Raster, Touch ≥ 48px (Token), Sektionen 96–128px.
- **Offene Werte nicht als beschlossen behaupten**: Wenn etwas nicht in Tokens steht, als „zu klären“ markieren.

---

## 1) Design Tokens (verbindlich)
### 1.1 Farben (nur Tokens, keine lokalen Hexwerte in Komponenten)
**Canvas / Flächen**
- Page Canvas: `--color-graphit-800` / `--color-graphit-900` (#080A0F)
- Masterplan Surface: `--color-graphit-850` (#0F131A)
- Card Surfaces: `--color-graphit-650` / `--color-graphit-600`
- Linien: `--color-linie-fein` (hairline), `--color-linie-mittel`, `--color-linie-stark`

**Text**
- Primär: `--color-text-primaer`
- Sekundär: `--color-text-sekundaer`
- Tertiär: `--color-text-tertiaer`
- Gedämpft: `--color-text-gedaempft`
- Auf Lime: `--color-text-auf-lime`

**Marke / Akzent**
- CI Lime: `--color-marke-lime` (#C0EE38)
- Lime Varianten: `--color-marke-lime-hell`, `--color-marke-lime-dunkel`, `--color-marke-lime-gruen`

**Semantik (Statusfarben)**
- Erfolg: `--color-semantik-erfolg`
- Warnung: `--color-semantik-warnung`
- Fehler: `--color-semantik-fehler`
- Licht: `--color-semantik-licht` (**nur** Signalfeld/Lichtflecken, nicht als UI-Theme)

### 1.2 Typografie (nur Token-Fonts)
- Text: `--font-text` = Inter
- Display: `--font-display` = Plus Jakarta Sans
- Mono: `--font-mono` = Geist Mono

**Regel:** Keine neuen Fonts hinzufügen. Headings bevorzugt `--font-display`, Body `--font-text`, IDs/Job-IDs `--font-mono`.

### 1.3 Layout / Maße
- Container: `--container` = `min(1280px, 100% - 48px)`
- Panelbreite: `--layout-panel-width` = `clamp(360px, 28vw, 440px)` (**beibehalten**)
- Touch Target: `--target-min` = 44px (mindestens)
- Spacing: `--space-1..9` (4–96px) **8px Raster**
- Radien: `--radius-button` (10px), `--radius-karte` (16px), `--radius-pille` (999px)

### 1.4 Schatten / Tiefe (CI-„räumlich“)
- Cards: `--shadow-karte`, `--shadow-kleine-karte`
- Wells/Inset: `--shadow-well`
- Dialog: `--shadow-dialog`
- Primary CTA: `--shadow-button-primaer`

---

## 2) Seitenaufbau & Raster (Full-Width, gemeinsames Grid)
### 2.1 Grundprinzip
- Jede öffentliche Seite nutzt **denselben** horizontalen Rhythmus:
  - Außen: Full-Width Canvas (Graphit)
  - Innen: Content auf `--container`
  - Sektionen: vertikal **96–128px** (Tokens: `--space-9`/`--space-8` + Kombinationen)
- Keine „viergeteilte Canvas“ / keine Kachelflächen. **Eine durchgehende Markenfläche**.

### 2.2 8px Raster
- Abstände, Gaps, Icon-Offsets, Border-Radii: Vielfache von 8px.
- Ausnahmen: 1px Borders, optische Korrekturen bis max 2px.

---

## 3) Home / Hero (bestehende CI-Logik beibehalten)
**Referenz-Implementierung (bestehend):** `/app/apps/web/components/HomeRebuild.css`


## Aktuelle Home-Fortführung (Nutzerauftrag, kein neuer Markenbeschluss)
- Quelle PUB-home im Original-Masterplan wurde direkt gelesen (Zeilen 690–782).
- Reihenfolge H00 → S01 Vorhaben → S02 Einstieg → S03 Umsetzung → S04 Produkte → F00 bleibt bindend.
- Auf aktuelle ausdrückliche Weisung: Figuren im Hero groß; Textspalte 1, Filmspalte 1.618. Dies ist die technische Umsetzung des Größenwunschs, kein neues Markenraster.
- Begrüßung 42–45s und zwei eigene Filme45–55s, keine Stummprobe als Ersatz; kein Zwangsloop.
- Alle aktuellen Touch-Ziele mindestens48px, entgegen älteren44px-Angaben weiter unten.
- Fontrollen Inter/Text und Jakarta/Überschriften sind technische Fortführung; keine zusätzliche Schrift einführen.
- Light-Palette und vollständige Freigabe bleiben offen, keine automatische Inversion oder Zertifizierungsbehauptung.

### 3.1 Hero Layout (links Text, rechts Film – ohne sichtbaren Playerkasten)
- **Verbindlich:** Hero als **2-Spalten-Grid** (Desktop), **Stack** (Mobile).
- Text links, Film rechts. **Kein Text über Video**, keine Masken/Crops, die Gesichter instabil wirken lassen.
- Video ist **Teil der Seite** (kein „Playerkasten“ als fremdes UI). Controls dürfen „schweben“, aber im Raster.

**Empfohlene Geometrie (aus bestehendem CSS ableitbar, nicht neu erfinden):**
- Desktop Grid: `grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr)`
- Gap: `--space-5` (24px)
- Hero Padding: `--space-9` oben, seitlich `clamp(24px, 4.5vw, 80px)`, unten `--space-8`

### 3.2 Räumliche Markenwirkung (Spotlights/Light-Ribbons)
- Erlaubt und erwünscht: **subtile** radiale Spotlights/Light-Ribbons wie in `HomeRebuild.css`.
- Regel: Effekte sind **Kulisse**, nicht Overlay, das Content „frisst“.
- Keine Neon-Glows; Lime bleibt Akzent.

### 3.3 Presenter/Identity Assets
- „Pascal“ und „NeX AIFly“ laufen gemeinsam ins Bild: **nur mit freigegebenen Assets**.
- **Keine Plüsch-/Fell-Ästhetik.**
- **Keine unstabilen Gesichter** (keine wackelige Mimik/Lip-Sync als „final“ ausspielen).
- `identityprobe.mp4` ist **nicht** final.

---

## 4) Chat & rechtes Panel (bestehende Reparaturen behalten)
- Panelbreite **fix nach Token**: `--layout-panel-width` (max 440px).
- Keine Ultra-Wide-Aufblähung.
- Panel/Chat bleibt **separat** vom Hero-Film.
- „Mute Reset / Panel 440 repariert“: **nicht zurückbauen**.

---

## 5) Komponenten- und CSS-Regeln (JS/JSX Projekt)
### 5.1 Keine shadcn/ui Vorgaben
- In diesem Repo ist **kein** `/frontend/src/components/ui` vorhanden.
- Daher: **keine** shadcn-Komponentenpfade, keine .tsx-only Patterns.

### 5.2 Bestehende CSS-Architektur respektieren
- Referenzen (Bestand):
  - `/app/apps/web/app/globals.css`
  - `/app/apps/web/app/masterplan-tokens.css`
  - `/app/apps/web/app/measurement-system.css`
  - `/app/apps/web/components/HomeRebuild.css`
  - `/app/packages/tokens/tokens.css`

### 5.3 Motion
- Motion ist Zustand/Feedback, nicht Deko.
- `prefers-reduced-motion: reduce` muss Animationen/Transitions deaktivieren (siehe HomeRebuild.css).
- **Kein** `transition: all`.

---

## 6) Video/Media Controls (ohne „Playerkasten“)
- Controls müssen Touch ≥ 48px sein (`--target-min`).
- Keyboard: Tab erreichbar; Space/K Play/Pause; M Mute; C Captions.
- Untertitel/Transcript: **Pflicht** (A11y-orientiert, ohne Claims).

**data-testid (Pflicht, kebab-case):**
- `hero-video-player`
- `hero-video-play-toggle`
- `hero-video-mute-toggle`
- `hero-video-captions-toggle`
- `hero-video-progress-slider`
- `hero-video-status-text`

---

## 7) Integrations-/Status-UI (keine Spec-Texte als Marketing veröffentlichen)
- Handoff-Dateien/Skripte/Seitenanweisungen sind **Umsetzungsspezifikationen**, nicht Werbetexte.
- Interne Spec-/Quality-Services-Texte, die versehentlich veröffentlicht wurden: **entfernen/neutralisieren**.
- Statusfarben nur aus Tokens; keine „offenen Lightwerte“ als final behaupten.

---

## 8) Accessibility (ohne Zertifizierungsclaims)
- Fokus sichtbar: `outline: var(--focus-ring); outline-offset: var(--focus-offset)`
- Interaktive Targets ≥ 44px.
- Links-bündige Leseführung (kein zentrierter Fließtext).

---

## 9) Testing-Konvention (verbindlich)
Alle interaktiven und kritischen Info-Elemente **müssen** `data-testid` tragen.
- Format: kebab-case, rollenbasiert (nicht visuell).
- Beispiele:
  - `home-primary-cta-button`
  - `home-briefing-textarea`
  - `right-panel-toggle-button`
  - `chat-composer-send-button`
  - `integration-resend-send-test-button`


## Zusätzliche verbindliche Material- und Textvorgabe des Nutzers
- Simulierter45°-Lichteinfall obenlinks: gerichtete Schatten haben positive gleiche X/Y-Vektoren, zusätzliche separate Umgebungsschatten. Keine Behauptung physikalischen Raytracings.
- FrostedGlass20pxBlur,10%weißeAuflage (innerhalb10–15),1pxHighlight; zentrale config/design-tokens.json material.*, keine komponentenlokalenFarben.
- Lange Komposita: HTMLlang passend, hyphens:auto,word-break:normal,overflow-wrap:anywhere als Notfall; monospaceCodes/URLs ohne automatische Silbentrennung.
- NeueMaterialregeln ersetzen wederCI nochDrehplan, natürlicheMimik/Lachen bleiben Pflicht, Stills keineFilme.

---

## 10) Knappe Handlungsanweisung (CI wahren)
1. **Tokens first:** Keine neuen Farben/Fonts/Rasterwerte. Alles über `tokens.css`/`design-tokens.json`.
2. **Räumlichkeit zurückholen ohne Rebranding:** Spotlights/Light-Ribbons/Token-Schatten wie `HomeRebuild.css` nutzen; keine Kachel-Canvas.
3. **Hero strikt:** links Text, rechts Film; Video ist Teil der Seite, kein sichtbarer Playerkasten; keine Crops/Masken.
4. **Panel 440 behalten:** `--layout-panel-width` strikt; keine Ultra-Wide Eskalation.
5. **Spec-Texte entfernen:** Handoff/Specs nicht als öffentliche Marketingcopy ausspielen.
6. **data-testid überall:** Buttons/Inputs/Controls/Statusfelder konsequent markieren.
