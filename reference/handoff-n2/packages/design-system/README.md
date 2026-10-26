# NeXify Designsystem — fixes System für alle Agentur-Dinge

**Fassung 2.0 · Graphit & Lime · Stand 29.09.2026**

Ein System, zwei Marken: **NeXify AI** (nexifyai.cloud) und **TEILEKLAR**
(teileklar.shop). Gleiche Tokens, gleicher Footer, gleicher Companion.

## Einzige Quelle der Wahrheit

`config/design-tokens.json` (W3C-DTCG) → erzeugt `packages/tokens/*`
(`node packages/tokens/build-tokens.mjs`). Nie die generierten Dateien
von Hand ändern.

## Einbinden (jedes Agentur-Projekt)

```html
<link rel="stylesheet" href="packages/design-system/index.css" />
```

Oder per Import:

```css
@import "packages/design-system/index.css";
```

## Kernwerte

- Farben: Graphit `#242826` (Seitengrund), Lime `#D7FA50` (einziger Akzent),
  Text `#FFFFFF`/`#E3E6E3`/`#BCC1BD`, Zustände Türkis `#6FE3CF`,
  Amber `#FFC24A`, Rot `#FF8A7A`, Licht Violett `#A78BFA`.
- Typografie: **Geist** (Text), **Geist Mono** (Kicker, Zahlen, IDs, Zeiten).
- Raster: 4-px-Takt. Container `min(1280px, 100% − 48px)`.
- Radien: 8/10/12/16/20/999 px.
- Schatten: ein Standardschatten `0 28px 56px -32px rgba(0,0,0,.85)`.
- Primärbutton: Verlauf `#EEFF9A → #D7FA50 → #BFE83C`, Text `#111312`.
- Bewegung: `prefers-reduced-motion` schaltet alles ab.
- Barrierefreiheit: Ziele ≥ 44 px, Fokus 2 px Lime, Kontrast ≥ 4,5:1.

## Verwendung (CSS-Variablen)

```css
.mein-block {
  background: var(--color-graphit-850);
  color: var(--color-text-primaer);
  border: 1px solid var(--color-linie-fein);
  border-radius: var(--radius-karte);
  font-family: var(--font-mono);
}
```

## Regeln erzwingen

`node tools/ds-audit-cli.js` → Ziel **0 Fehler, 0 Warnungen** (dokumentierte
Ausnahmen abgezogen). Regeln: `config/design-rules.json`, Definition
`dokumentation/11-designsystem-definition.md`.

## Referenz

- Lebendes Regelwerk: `prototypen/NeXify Designsystem.dc.html`
- Referenzimplementierung: `prototypen/NeXifyAI Cloud v12.dc.html`
- Fachtiefe: `dokumentation/03-designsystem.md`

## Kernbausteine

`packages/ui/` liefert die fertigen Bausteine als reine CSS-Klassen
(keine Hardwerte, nur Token-Variablen): `.btn` (primär/sekundär), `.karte`,
`.karte-klein`, `.well`, `.chip`, `.kicker`, `.status`, `.badge`.
Demo: `packages/ui/index.html`.

```html
<link rel="stylesheet" href="packages/ui/components.css" />
```
