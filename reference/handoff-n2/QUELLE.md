# QUELLE — einzig kanonische Seiten und Designsystem

**Stand 29.09.2026 · Fassung 1.0 · verbindlich**

Einzige Quelle der Wahrheit für Seiten und Designsystem ist **dieses Paket**.
Nur Dateien aus `prototypen/` und Werte aus `config/design-tokens.json` dürfen
verwendet werden. Kein Mischen mit anderen Ständen.

## Herkunft (Provenienz)

- Google Drive: https://drive.google.com/file/d/1PR09Wc6BW8xhn8KxY8Aj7NHMBexjp01l/view?usp=drive_link
- ZIP SHA256: `8228f4847b234c1d3e73c76a84809b86f703101c0282ca4c8661e9a2fd12736d`

## Kanonische Seiten

- Ordner: `prototypen/`
- Umfang: **37 `.dc.html`** + **2 `.html`** (= 39 HTML-Oberflächen) plus
  `support.js`, `assets/`, `i18n/`, `lib/`
- Einstieg: `NeXifyAI Cloud v12.dc.html` (Start), `NeXify AI one.dc.html`,
  `NeXify Shop.dc.html`, `Rechtliches.dc.html`

## Kanonisches Designsystem

- Werte: `config/design-tokens.json` (Graphit & Lime, Fassung 2.0)
- Regeln: `config/design-rules.json`
- Definition: `dokumentation/11-designsystem-definition.md`
- Kern: Graphit `#242826`, Lime `#D7FA50`, Geist + Geist Mono

## Verboten

Alle `.dc.html`/`.html` außerhalb dieses Pakets sind **nicht kanonisch** und
dürfen weder verwendet, kopiert noch referenziert werden. Insbesondere die
Dateien in `/opt/ai-stack/nexify-neu` (altes Designsystem „CD-2026 hell“,
Lime `#C8F04B`, Archivo) sind verboten.

## Regel

Jede neue Seite, jede Änderung und jedes Token stammt aus diesem Paket.
Abweichungen sind ein Fehler und werden nicht übernommen.

## Echtheitsnachweis der Seiten

`prototypen/MANIFEST.sha256` enthält die SHA256 je Datei (76 Einträge).
Prüfen: `cd prototypen && sha256sum -c MANIFEST.sha256`.
Eine Datei gilt nur dann als kanonisch, wenn ihr Hash im Manifest steht.

## Dokumentation automatisch aktuell halten

**Betriebsregel:** Bei jeder Arbeit wird die gesamte Dokumentation mitgezogen.
Ein Skript erneuert alle generierten Artefakte und fragt NeXify/Jeff als
go/no-go-Gate:

```
node tools/docs-aktualisieren.mjs
```

Erzeugt/aktualisiert: `docs/generiert/*.md` (aus `config/*.json`),
`packages/tokens/*` (aus `config/design-tokens.json`),
`prototypen/MANIFEST.sha256` (Echtheitsnachweis), `docs/STAND.md` (Ist-Stand),
Designsystem-Audit (`0 Fehler`), Jeff-Gate (`nx-jeff pruefe-aenderung`).

## NeXify/Jeff (Orakel) — globale Einbindung

- Fähigkeiten und Einsatzorte: `docs/jeff-integration.md`
- Wiederverwendbares Freigabe-Gate: `node tools/jeff-gate.mjs --was … --risiko … --rollback …`
- Doku-Automatisierung fragt Jeff bereits als go/no-go-Gate (`tools/docs-aktualisieren.mjs`)

**Globale Vorgabe:** Bei jeder Arbeit wird relevantes Wissen zusätzlich in
agentmemory (`POST /agentmemory/remember`) und LightRAG (`POST /documents/text`)
abgelegt — projektübergreifend, nicht nur für NeXify.

## Fixes Designsystem für alle Agentur-Dinge

`packages/design-system/` ist der Einstieg für jedes Agentur-Projekt:
`index.css` (Tokens + Geist/Geist Mono + Basis) und `README.md` (Nutzung).
Einzige Quelle der Wahrheit bleibt `config/design-tokens.json`.

## Kernbausteine (P1)

`packages/ui/` = fertige CSS-Bausteine (Button/Karte/Well/Chip/Kicker/Status/Badge),
nur Token-Variablen, Demo `index.html`. Kein Hardwert.
