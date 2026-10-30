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

---

## 11) UI-Politur Addendum (Navigation, Mega-Menü, Footer, Spacing, Schatten) – **CI unverändert**

> Ziel: „weniger Schatten, mehr Luft, bessere Navigation/Footer, großes nach unten öffnendes Menü“ – ohne neue Farben/Fonts/Frameworks. Keine CSS-Implementierung hier; nur Spezifikation.

### 11.1 Globale Politur-Prinzipien (Spacing & Dichte)
- **Dichte reduzieren:** Standard-Vertikalabstände in Inhaltssektionen nicht unter `--space-7` (48px) zwischen Blöcken; Sektionen bleiben `--space-8..9` (64–96px).
- **Lesebreite:** Copy-Blöcke max. **65–76ch** (wie bereits in HomeRebuild.css genutzt). Keine zentrierten Fließtexte.
- **Interaktive Reihen:** In Menüs/Footern Zeilenhöhe so wählen, dass Touch-Ziel **≥ `--target-min` (48px)** erreicht wird.
- **Hairlines statt Schatten:** Trennung primär über `--color-linie-fein/mittel/stark` + leichte Glasflächen; Schatten nur dort, wo „schwebend“ wirklich nötig ist.

### 11.2 Schatten-Reduktion (konkret, ohne Rebranding)
- **Default:** Navigation, Footer, Mega-Menü-Panels nutzen **keinen** großen Drop-Shadow als Standard.
- **Erlaubt:**
  - 1) **Inset-Highlight** (Token `material.highlight`) + 1px Border (`material.border`) für „Glas“.
  - 2) `--shadow-kleine-karte` nur für Panels/Overlays, die über Content liegen (Mega-Menü, Footer-Overview Panel).
  - 3) `--shadow-dialog` ausschließlich für echte Dialoge/Modals.
- **Verboten:** Mehrfach gestapelte Schatten in Navigation/Footer; keine „Glow“-Schatten außerhalb der bestehenden Token.

### 11.3 Header / Navigation – Informationsarchitektur
**Bestand:** `SiteNavigation.tsx` nutzt `details/summary` für Produkte-Dropdown und Mobile-Menü.

**Neu (Spezifikation):** Desktop bekommt ein **Mega-Menü** für „Produkte“ (downward opening), Mobile bleibt `details`-basiert.

#### 11.3.1 Desktop-Navigation: Struktur
- Primärlinks (Top-Level): **Leistungen**, **Produkte (Mega-Menü)**, **Arbeitsweise**, **Kontakt**.
- „Produkte“ öffnet ein Panel mit 2–3 Spalten:
  1) **NeXify AI** (z.B. NeX2Fly, ONE, API)
  2) **TEILEKLAR** (tk-home, tk-workshop, tk-partner) – nur echte Seiten, keine erfundenen Städte.
  3) Optional: **Einstieg** (Preise / Überblick), falls im Pages-Plan vorhanden.
- Jede Zeile im Mega-Menü:
  - Titel (Display/semibold)
  - 1 Satz Beschreibung (Text-tertiär) **optional**, nur wenn bereits in Content vorhanden; sonst weglassen.
  - Pfeilindikator als reines Zeichen (→) oder vorhandenes Icon-System; keine Emojis.

#### 11.3.2 Mega-Menü: Interaktion & A11y
- Öffnen:
  - Click auf Summary/Trigger.
  - Keyboard: Enter/Space auf Trigger.
- Schließen:
  - **Escape** schließt und setzt Fokus zurück auf Trigger.
  - Click außerhalb schließt (Pointerdown listener auf document; nur aktiv wenn offen).
  - Fokus-Management: Beim Öffnen Fokus **nicht** automatisch ins Panel springen (verhindert „Fokusklau“), aber Panel muss per Tab erreichbar sein.
- ARIA:
  - Trigger: `aria-expanded`, `aria-controls`.
  - Panel: `role="dialog"` vermeiden (es ist Navigation). Stattdessen `role="group"` + `aria-label="Produkte"` oder `nav aria-label`.
- Reduced motion:
  - Öffnen/Schließen ohne Slide-Animation; nur opacity/visibility (oder gar keine Transition) bei `prefers-reduced-motion`.

#### 11.3.3 Mega-Menü: Layout & Maße (Token-basiert)
- Panelbreite: an `--container` ausrichten; links/rechts bündig mit Content.
- Panel-Padding: `--space-5` (24px) innen.
- Spalten-Gap: `--space-6` (32px).
- Link-Reihen: min-height `--target-min`.
- Panel-Trennung: 1px hairline `--color-linie-fein` + optional `--shadow-kleine-karte`.

#### 11.3.4 data-testid (Navigation)
- `site-header`
- `desktop-navigation`
- `desktop-products-megamenu-toggle`
- `desktop-products-megamenu-panel`
- `desktop-products-megamenu-link-<page-id>`
- `mobile-navigation` (besteht)
- `mobile-navigation-toggle` (besteht)
- `mobile-navigation-close` (besteht)

### 11.4 Mobile Header
- Mobile-Menü bleibt `details`-basiert, aber:
  - Summary/Toggle Touch ≥ 48px.
  - Menü-Inhalt als vertikale Liste mit klaren Gruppen (z.B. „Produkte“ als eigener Block).
  - Escape schließt (bereits implementiert) + Outside-Click schließen ergänzen.

### 11.5 Footer – Gruppierung & „Seitenübersicht“ Politur
**Bestand:** `SiteFooter.tsx` hat Brand-Block + Linkgruppen + Bottom-Bar + Overview-Details + Legal-Details.

**Politur-Spezifikation:**
- Linkgruppen bleiben 4 Spalten (Desktop), aber:
  - Spaltenüberschriften: `--font-mono` oder klein in Uppercase (wie Kicker), Farbe `--color-text-tertiaer`.
  - Links: `--color-text-sekundaer`, Hover → `--color-marke-lime`.
  - Zwischen Links: vertikaler Abstand `--space-2` (8px) bis `--space-3` (12px), aber Touch-Ziel beachten (Padding pro Link).
- „Seitenübersicht“ (`details.footer-overview`):
  - Panel als **mehrspaltiges Grid** (besteht), aber mit klarer Max-Höhe + Scroll innerhalb (damit Footer nicht „endlos“ wird).
  - Panel bekommt `--shadow-kleine-karte` (einmalig) + hairline border.
  - Summary-Zeile als echte Control-Reihe (min-height 48px) mit sichtbarem Hover/Pressed.
- „Rechtsdokumente“: direkte Links bleiben sichtbar; Details-Text bleibt ruhig (kein Marketing).

#### 11.5.1 data-testid (Footer)
- `site-footer` (besteht)
- `footer-contact-link` (besteht)
- `footer-overview` (besteht)
- `footer-overview-toggle`
- `footer-overview-panel`
- `footer-legal-direct`
- `footer-legal-details-toggle`

### 11.6 Play Controls (TrioScene / Hero Video) – Kontrast & Zustände
- Zustände strikt trennen (wie in `TrioScene.css` bereits angelegt):
  - **Default**: Graphit-Glasfläche, Text sekundär.
  - **Hover**: Border Richtung Lime, Text Richtung Lime.
  - **Pressed**: dunklere Fläche, Border Lime.
  - **Toggled (aria-pressed=true)**: nur Icon/Text leicht Lime, **nicht** Hintergrund Lime (außer Primary CTA).
- Primary Play/Pause bleibt immer: Lime Hintergrund + `--color-text-auf-lime`.

### 11.7 Marketing-/Grafiktexte (Finale Szene) – Safe-Zones
- Finale-Overlays (z.B. `.trio-finale`) dürfen nur in **freien Zonen** liegen:
  - Welcome/Einstieg: **oben links** (siehe TrioScene.css `.has-media.trio-welcome .trio-paths`).
  - Projekt: **oben rechts** (`.has-media.trio-project .trio-overview`).
- Keine Texte über Gesichter/Körper; keine halbtransparenten Textflächen direkt auf Video.
- Typo:
  - Titel: `--font-display`, 16–18px (UI), keine riesigen Headlines im Overlay.
  - Meta/Descriptions: `--font-text`, `--type-small-size`.

### 11.8 Menü-/Footer-Links: „echte Zielseiten“ Regel
- Keine Platzhalter-Links zu Städten/Werkstätten.
- Städte/Werkstätten erscheinen **nur**, wenn `pages` sie liefert (wie `placePages` bereits macht). Keine Hardcodes.

### 11.9 QA-Checkliste (für „erst Politur, dann Tests grün“)
- Keyboard:
  - Mega-Menü: Tab-Reihenfolge logisch; Escape schließt; Fokus kehrt zum Trigger zurück.
  - Mobile-Menü: Escape schließt (besteht), Close-Button fokussierbar.
- Pointer:
  - Outside-Click schließt Mega-Menü und Mobile-Menü.
- Reduced motion:
  - Keine animierten Slides; nur opacity oder keine Transition.
- data-testid:
  - Alle neuen Trigger/Panel/Links mit stabilen IDs.

---

## 13) FOCUSED Addendum – Workspace Chat Layout (browserfest, CI unverändert)
> Gilt für: `/app/apps/web/components/Workspace.tsx` + `WorkspaceRebuild.css`. **Keine neuen Farben/Fonts/Tokens.** Ziel: Gespräch dominant, Composer kompakt, Hinweise einklappbar, Safari/iOS stabil.

### 13.1 Panel-Layout-Regeln (Desktop ≥1280×720)
- **Conversation bekommt Priorität:** `conversation` muss **mindestens 60%** der Panelhöhe erhalten; `composer-area` + `panel-footer-row` zusammen **max. 40%**.
- **Composer-Höhe deckeln:** `textarea` max-height **25vh** (Desktop) und **30vh** (Mobile), darüber internes Scrollen; Default `rows=2` bleibt.
- **Hinweise entkoppeln:** Permanente Hinweise (Legal/Model/Privacy/ChatGPT-Note) dürfen **nicht** als immer sichtbare Fließtexte im Composer stehen. Stattdessen: 1-zeilige Summary + `details/summary` („Hinweise & Datenschutz“) direkt **oberhalb** des Send-Buttons; geöffnet zeigt Volltext scrollbar.
- **Projektformulare sekundär:** `action-card` bleibt im Verlauf, aber bei wenig Höhe als `details`-Block („Projektfunktionen“) zusammenklappbar; Default: geschlossen, sobald `visualViewport.height < 700`.

### 13.2 Mobile Overlay (≤820px)
- Panel ist `position:fixed` und nutzt **Safe-Area**: padding-bottom = `env(safe-area-inset-bottom)`; Send-Button darf nie darunter liegen.
- **Keyboard/Viewport:** Bei geöffnetem Keyboard muss der Composer sichtbar bleiben: nutze `window.visualViewport` (falls vorhanden) um eine CSS-Variable `--vvh` zu setzen; Panelhöhe = `min(100dvh, var(--vvh, 100dvh))`.
- Backdrop bleibt, aber **kein** `overflow: visible` in short-height Breakpoints.

### 13.3 Short-height Breakpoints (Safari kritisch)
- Für `max-height: 560px` (oder `visualViewport.height <= 560`): **gesamtes Panel scrollt**, aber `send-button` bleibt erreichbar.
- Verboten: feste Pixel-Offsets, die den Send-Button unter die Viewportkante drücken. Stattdessen: `composer-area` sticky am Panel-Bottom **oder** Panel-internes Scrollen mit `min-height:0` auf dem Verlauf.

### 13.4 Messbare Akzeptanzkriterien (QA)
- Desktop 1280×720: `conversation` sichtbarer Bereich ≥ **360px**; `composer-area` sichtbarer Bereich ≤ **260px**.
- Mobile 390×844 (iPhone): Send-Button ist **immer** vollständig sichtbar (auch mit Keyboard offen) und hat Touch ≥ `--target-min`.
- Safari iOS: kein „Jumping“ beim Fokussieren des Textareas; keine Elemente außerhalb des Viewports ohne Scroll erreichbar.

### 13.5 data-testid Ergänzungen (Pflicht)
- `chat-composer-textarea` (Textarea)
- `chat-hints-disclosure` (details)
- `chat-hints-toggle` (summary)
- `chat-project-tools-disclosure` (details um action-card)
- `chat-panel-close-button` (Close)

---

## 12) General UI UX Design Guidelines  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
        - Prioritize using pre-existing components from src/components/ui when applicable
        - Create new components that match the style and conventions of existing components when needed
        - Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
        - Use Shadcn/UI as the primary component library for consistency and accessibility
        - Import path: ./components/[component-name]

**Export Conventions:**
        - Components MUST use named exports (export const ComponentName = ...)
        - Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
