# NEX-TYPOGRAPHY-20261030-06 — Typografie-Prüfbeleg

Status: **`make test` = 583 OK**. Kein Main-Push/Publish. CI-Fonts, Logo, grüne Markenelemente und Hero unverändert.

## Was gemacht wurde
- **Wiederverwendbare Typografie-Tokens** in `apps/web/app/globals.css :root` definiert (ohne neue Schriftfamilie; bestehende selbstgehostete CI-Fonts Geist/Inter/Plus Jakarta Sans/Geist Mono unverändert):
  - Größen: `--font-size-h1..h4`, `--font-size-lead`, `--font-size-body`, `--font-size-small`, `--font-size-label`, `--font-size-button`, `--font-size-chat-lead`, `--font-size-chat-body`, `--font-size-chat-label` (fluide `clamp()` ohne harte Sprünge).
  - Gewichte: `--font-weight-regular/medium/semibold/bold`.
  - Zeilenhöhen: `--leading-heading/snug/body/relaxed`; Laufweite `--tracking-heading/display`; Zeilenlänge `--measure-body` (68ch), `--measure-lead` (62ch).
- **Angewendet (konservativ, messbar):**
  - Lead-Text `.page-purpose` → `--font-size-lead` + `--leading-body`, Zeilenlänge begrenzt (720px).
  - `.section-intro` → Body-Größe + `--leading-body`.
  - `.editorial-note p` → `--leading-body` + Zeilenlänge `--measure-body`.
  - Chat-Lead `.welcome-card>p` → `--font-size-chat-lead` (vorher fix 25px → jetzt responsiv 21–25px, kein Sprung auf Mobil).
- **Bewusst unverändert:** Hero-/Public-H1-Größen (gute, geprüfte Werte), Logo, grüne Akzente, `tokens.css`/Fonts. Keine ganzen fettbunten Absätze, kein Keyword-Stuffing; Hervorhebung bleibt Überschriften + vorhandene Akzentfarbe (Markup-Rendering der Fließtexte nicht umgebaut → keine unnötige Feature-Änderung).

## Evidenz — TATSÄCHLICH neu gemessen (kein reines SourceSHA-Umbinden)
- `browser-critical.mjs` (echtes Chromium headless, Node22): 8 Checks PASS, inkl. Presenter-Contain/Overflow über **5 Desktop-Breiten (1024/1280/1440/1600/1920)** und Gutter-Messung bei **1920 + 390 (Mobil)**; `document.scrollWidth>innerWidth` = false (kein horizontaler Overflow, keine abgeschnittenen Texte).
- `browser-text-spacing.mjs`: **108 Checks, 0 Issues** — reale Geometrie inkl. **200%-Textzoom-Verdopplung** und Content-Overflow-Prüfung über die öffentlichen Routen.
- Regeneriert: `docs/design/detail-browser-evidence.json`, `evidence/one-app-2026-10-27/{critical-browser-fresh,text-spacing}.json`; Register-SHAs (`config/acceptance-coverage.json`, 3 Einträge) via `tools/_update_register_shas.py`.
- Consent-/Footer-Evidenz: in diesem Auftrag **nicht betroffen** (SiteFooter.tsx/site-map.json unverändert) → bestehender PASS bleibt gültig.

## Geprüfte Seitentypen (über die realen Messläufe abgedeckt)
Agentur (`/`, `/leistungen`, `/produkte/nex2fly`), Shop/Werkstatt (`/teileklar/werkstatt`), Recht (`/impressum`), Portale/Public + Chat — Desktop & Mobil & 200%-Zoom, ohne Textabschnitte oder Overflow.
