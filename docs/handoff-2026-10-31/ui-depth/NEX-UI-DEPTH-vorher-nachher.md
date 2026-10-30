# NEX-UI-DEPTH-20261030-01 — Dezente Tiefe im rechten Chat + leichte Seitenakzente

Auftrag (Pascal, 15:32 UTC): dezente, hochwertige 3D-Tiefe und Feinschliff im Text-/Nachrichtenbereich
des rechten Chats sowie leichte, zurückhaltende Akzente auf den Seiten. Nur vorhandene CI-Tokens/Komponenten,
höchstens klar definierte Elevation-/Shadow-/Highlight-Tokens ergänzen. Keine starken Effekte überall, kein
Neon-Overload, keine schwebenden Rahmen um die Figuren. Text scharf, Kontrast ausreichend, Fokus sichtbar,
Composer/Buttons mobil erreichbar. Effekte hinter Inhalten, nie vor Pascal/NeX/AIFly, keine Doppelbilder.
Keine unnötige Animation; Reduced Motion + Performance erhalten. Nur vorhandene Assets, keine bezahlte Grafik.

## Was geändert wurde (minimal, token-basiert)

### 1) Neue, klar definierte Tokens — `apps/web/app/masterplan-tokens.css`
(Diese Datei ist **nicht** evidence-gebunden; Rohwerte dort erlaubt. Alle Werte sind weiche, kurze Schatten
+ minimale Lichtkante.)

- `--highlight-kante` — minimale obere Lichtkante `inset 0 1px 0 rgba(255,255,255,.05)`
- `--shadow-chat-bubble` — weiche kurze Tiefe für Nachrichten-/Aktionsflächen
- `--shadow-chat-raised` — etwas stärker für Composer/Briefing-Karte
- `--shadow-chat-panel` — leichte Ebenentrennung Panel ↔ Inhalt (inset Lichtkante links + sehr weicher Außenschatten)
- `--shadow-akzent-weich` — zurückhaltender Seitenakzent

### 2) Anwendung — `apps/web/app/globals.css` (**nur** `var(--token)`, keine Rohfarben → Contract bleibt grün)
Alle Änderungen sind **layout-neutral** (ausschließlich `box-shadow`), beeinflussen `scrollWidth` nicht.

| Selektor | Effekt |
|---|---|
| `.aifly-panel` | `--shadow-chat-panel` (leichte Ebenentrennung zum Hauptinhalt) |
| `.action-option` + `:hover` | `--shadow-chat-bubble`, beim Hover `--shadow-chat-raised` (sanftes Anheben) |
| `.message.user` | `--shadow-chat-bubble` (Sprechblase bekommt Tiefe) |
| `.action-card` | `--shadow-chat-raised` (Briefing-/Entwurfskarte) |
| `.composer` | `--shadow-chat-raised` (Eingabefeld hebt sich ab) |
| `.download-link` | `--shadow-chat-bubble` |
| `.feature-grid article` (Seiten) | sanfte Hover-Elevation `--shadow-chat-raised` (nur `box-shadow`-Transition) |

Figuren-Container (`.trio-*`, `.hero-portrait`, Presenter) wurden **nicht** angefasst → keine Rahmen/Schatten
vor Pascal/NeX/AIFly, keine Doppelbilder.

## Schutzkriterien — eingehalten
- **Text scharf / Kontrast:** nur Schatten hinter Flächen, keine Textschatten, keine Transparenz auf Text.
- **Fokus sichtbar:** globaler `--focus-ring` unverändert.
- **Reduced Motion:** globale Regel `@media(prefers-reduced-motion:reduce){*{transition:none!important}}` greift
  weiter; die einzige neue Transition (`box-shadow` an `.action-option`/`.feature-grid article`) wird dort still.
- **Performance:** nur `box-shadow` animiert (kein `transition:all`, kein Layout/Repaint-Sturm).
- **Mobil erreichbar:** Composer/Senden bleiben Touch-erreichbar; real belegt durch bestandenen Browsertest
  `sdk_mobile_real_chat_no_overflow_escape_and_focus_return`.

## Vorher / Nachher (echte Renders)
- `ui-depth/live-vorher-desktop.jpg` — Live-Preview (alter Build) des rechten Chats.
- `ui-depth/harness-vorher-desktop.jpg` — identisches Markup mit **alter** CSS (ohne Tiefe).
- `ui-depth/harness-nachher-desktop.jpg` — identisches Markup mit **neuer** CSS (NEX-UI-DEPTH).

Die Harness lädt die **echten** Dateien `packages/tokens/tokens.css` + `masterplan-tokens.css` + `globals.css`
(alt via `git show HEAD:…`, neu aus dem Arbeitsstand) mit identischem Chat-DOM. Der Unterschied ist bewusst
**dezent**: definiertere Kanten an Aktions-Reihen/Sprechblase/Briefing-Karte/Composer und eine leichte
Panel-Ebenentrennung. Keine starken/neonartigen Effekte.

## Evidence / CI — echt neu gemessen (keine reine Hashanpassung)
`globals.css` ist in genau **zwei** erzwungenen Bindungen hinterlegt (empirisch via `make test` ermittelt):
1. `evidence/one-app-2026-10-27/text-spacing.json` → **real neu gemessen** mit `apps/site/tests/browser-text-spacing.mjs`
   (108 Checks, 0 Issues).
2. `docs/design/detail-browser-evidence.json` (+ `critical-browser-fresh.json`) → **real neu gemessen** mit
   `apps/site/tests/browser-critical.mjs` (alle kritischen + SDK-Chat-Checks PASS).

Danach die drei neuen Evidence-SHAs chirurgisch im Register `config/acceptance-coverage.json` nachgezogen und die
abgeleitete Ansicht `docs/contracts/requirements-reconciliation.md` via `--render` regeneriert.

**Ergebnis:** `make test` = **583 Tests OK** (grün).
