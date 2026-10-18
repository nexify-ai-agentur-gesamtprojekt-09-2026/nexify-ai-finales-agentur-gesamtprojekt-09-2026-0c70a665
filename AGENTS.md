# AGENTS.md · NeXify AI Gesamtlösung (Handoff an Codex)

Stand 2026-09-29 · Fassung 1.0 · Freigabe der Entscheidungen E1/E3/E4/E5/E6/E12 steht aus (siehe `docs/09-final/08-recht-und-compliance.md`).

## Auftrag
Baue aus den HTML-Referenzen in `prototypen/` (`*.dc.html`) das Produkt. **Die Referenzen sind Design und Verhalten, kein Produktionscode.** Nicht kopieren, nachbauen. Sprache der Oberfläche: Deutsch (Quelle), Niederländisch und Französisch für Kopf/Fuß und Markt-Seiten.

## Lesereihenfolge
1. `docs/09-final/00-INDEX.md` → `01` Produkt → `11` Designsystem-Definition → `03`/`04` Design und Frontend → `05` Technik → `14` Gesamtsystem/Portale → `06` Brain → `08` Recht → `15` Umsetzungsplan.
2. `config/design-tokens.json` (Werte), `config/design-rules.json` (Regeln), `config/fakten.json` und `config/api-prepaid.json` (Zahlen), `config/brain/*.json` (Agenten, Tools, Pipeline, Wissen).

## Verbindliche Regeln
- **Tokens:** Nur Werte aus `design-tokens.json`. Neue Farbe/Radius/Fläche zuerst dort und in `docs/09-final/11-…` eintragen.
- **Zahlen und Texte mit Preisbezug** nur aus `config/fakten.json`/`api-prepaid.json`. Nie neu erfinden. Ungeklärte Tarife bleiben „zur Freigabe“.
- **Prüfung vor Übergabe:** `node tools/ds-audit-cli.js` (Design, SEO-Basis, i18n-Parität, Barrierefreiheit-Heuristik). Ziel: 0 Fehler, 0 Warnungen außerhalb dokumentierter Ausnahmen (`config/abweichungen.json`).
- **Barrierefreiheit:** WCAG 2.2 AA, Ziele ≥ 44 px, sichtbarer Fokus (2 px Lime), Reduced-Motion.
- **i18n:** de/nl/fr, identischer Schlüsselsatz; Zahlenformat folgt der Textsprache; Preise/Steuer/Rechtstexte folgen dem Markt.
- **Recht:** Texte sind Entwurf 0.9. Nichts als Rechtsberatung ausgeben; Button-Lösung (§ 312j BGB), KI-Kennzeichnung (Art. 50 KI-VO), Widerruf 14 Tage (B2C).
- **Sicherheit:** Mandantentrennung per RLS, Idempotenz auf allen Buchungen, Geheimnisse nie im Code, Hartsperren im Gateway (`config/brain/agents.json`).
- **Ehrlich bleiben:** Referenzen, Logos, Zitate, Messwerte werden nicht erfunden. Beispiele sind gekennzeichnet.

## Stack-Empfehlung
Next.js/React + TypeScript · PostgreSQL (Frankfurt) mit Row-Level-Security · OpenAI-kompatibles Gateway (`api.nexifyai.cloud/v1`) · Revolut Merchant API (Sandbox → Produktion getrennt) · selbst gehostete Schriften (Geist, Geist Mono). Details `docs/09-final/05-technische-spezifikation.md`.

## Phasen (Abnahme je Phase mit Nachweis)
Siehe `docs/09-final/15-umsetzungsplan-codex.md`: P0 Fundament → P1 Marke/Bausteine → P2 Öffentliche Seiten → P3 Konto/Portale → P4 API/Ledger → P5 Shop → P6 Workspace/Brain → P7 Recht/SEO/Betrieb.

## Repository-Vorschlag
```
apps/web            Next.js (öffentlich + Portale)
apps/gateway        API-Gateway (Auth, Ledger, Router)
packages/tokens     aus config/design-tokens.json generiert
packages/ui         Komponenten (Header, Footer, Karte, Well, Button, …)
packages/i18n       de/nl/fr Wörterbücher
packages/rules      design-rules + ds-audit
infra/              OpenTofu, CI
docs/               übernommen aus docs/09-final
```

## Nicht tun
Keine Abrechnung/Rechnungslauf vor Entscheidung E1/E3/E4. Kein Livegang ohne Freigabe-Gate (`docs/09-final/07`, Abschnitt Gate). Keine automatische Übersetzung von Rechtstexten. Keine Änderung an Preisen ohne Freigabe von Pascal Courbois.

## Kontakt
Pascal Courbois · mail@nexifyai.cloud (Firmendaten in `docs/09-final/08` bitte bestätigen lassen).

## Harness (Betrieb, verbindlich)

### Clock-in
Vor jeder Codeaenderung: `PROGRESS.md` lesen, dann `make check` ausfuehren, um die gruene
Basis zu bestaetigen. Genau ein aktives Feature bearbeiten; Scope nicht weiten.

### Verifikation
- `make check` — Design/SEO/i18n/A11y-Audit (`node tools/ds-audit-cli.js`), muss Exit 0 liefern.
- `make test` — Selbsttest + Preislogik-Test.
- `make e2e` — echter Browserlauf gegen die Live-Cockpit-URL (Scanner-Chromium).
- `make check-arch` — Architektur-Regeln; `make clean-check` — Sauber-Zustand.
- Repo ist konsistent, wenn `make check` (und `make test`) Exit 0 liefern.

### Zustandsdateien (State)
- `PROGRESS.md` — Current State, In Progress, Next Steps, Blockers.
- `DECISIONS.md` — getroffene Entscheidungen mit Begruendung.
- `feature_list.json` — Feature-Primitive (behavior + verification + state + evidence + layers).

### Feature List Rules (Zustandsmaschine)
- Zustaende: `not_started` → `active` → `passing`. Kein Ueberspringen.
- `passing` wird nie von Hand gesetzt — nur ueber `make verify-feature F=<id>`.
- WIP=1: hoechstens ein Feature darf `active` sein; erst fertigstellen, dann naechstes.
- Granularitaet: each feature must be completable in one session. If it spans sessions, split it.
- `evidence`-Feld je Feature nennt Datum und Pruefbefehl.

### Definition of Done (drei Schichten)
- Layer 1 (Syntax/Statik): `npm run check` bzw. `tsc --noEmit` in `apps/web`.
- Layer 2 (Laufzeitverhalten): der feature-eigene Pruefbefehl (`make test`).
- Layer 3 (System/E2E): `make e2e` (echter Browserlauf) bzw. Live-/Deployment-Nachweis.
- Do not proceed to Layer N+1 if Layer N fails; layers must pass in order.
- Layer 3 (e2e) is required when changes cross component or domain boundaries.
- Laufzeitsignale: App erreicht Ready-State (Cockpit 200), Seiteneffekte korrekt
  (RLS-Trennung, Ledger-Idempotenz), keine Debug-Artefakte bleiben zurueck.

### Architecture Boundaries
- `apps/web/app` = UI/Routen · `apps/web/lib` = Datenzugriff · `infra/db` = Schema/RLS ·
  `config` = Tokens/Fakten/Regeln · `tools` = Pruef-/Betriebswerkzeuge.
- Durchgesetzt: `.harness/arch-rules.json` → `make check-arch` (WHAT/WHY/FIX).
- Review-to-automation: every new error category caught in code review becomes a rule in
  `.harness/arch-rules.json`.

### Observability
- Sprint-Contract vor jedem Feature: `templates/sprint-contract.md`.
- Laufzeitsignale je Sitzung: `scripts/session-trace.sh` (`make session-start`/`make session-end`).
- Bewertung nach Abschluss: `templates/evaluator-rubric.md` — jede Dimension mindestens B.

### Clean State
- Vor dem Abschluss: `make clean-check` (Statik/Audit, Tests, feature_list, PROGRESS.md,
  keine Debug-Artefakte) gruen. Modulgesundheit in `docs/quality-document.md` (A/B/C/D) pflegen.
- Dual-Mode-Cleanup: sofort nach jeder Sitzung (Debug-/Temp-Artefakte) + periodischer Sweep
  (woechentlich) fuer strukturellen Drift.

### Clock-out
Vor dem Schliessen: `PROGRESS.md` aktualisieren (Current State + Next Steps), `make check`
und `make clean-check` gruen. Kein Commit ohne Freigabe.

### Commits
- Atomic: one logical operation per commit; das Repo ist nach jedem Commit konsistent.
- Write commit messages that explain WHY the change was made, not just what changed.

### Kontext-Knappheit
Bei knappem Kontext nicht hektisch fertigstellen — stoppen, `PROGRESS.md` aktualisieren
und einen sauberen Checkpoint hinterlassen (do not rush).

### Constraints (annotiert)

- Tokens: nur Werte aus `config/design-tokens.json` (source: config/design-tokens.json; why: CI-/Token-Drift vermeiden).
- Zahlen und Preise: nur aus `config/fakten.json`/`config/api-prepaid.json` (source: config/fakten.json; why: keine erfundenen Zahlen/Preise).
- Geheimnisse nie im Code, sondern aus `/etc/myadmin/web.env` (source: /etc/myadmin/web.env; why: Geheimnisschutz).
- Mandantentrennung per RLS, Idempotenz auf allen Buchungen (source: infra/db/001_cockpit.sql; why: Datenschutz/Integritaet).
- Dokumentation wird im selben Commit wie der Code aktualisiert — no stale documentation, keine veralteten Docs (same commit).
