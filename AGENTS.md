# AGENTS.md · NeXify AI Gesamtlösung (Handoff an Codex)

Stand 2026-09-29 · Fassung 1.0 · Freigabe der Entscheidungen E1/E3/E4/E5/E6/E12 steht aus (siehe `docs/09-final/08-recht-und-compliance.md`).

## Auftrag
Baue aus den HTML-Referenzen in `prototypen/` (`*.dc.html`) das Produkt. **Die Referenzen sind Design und Verhalten, kein Produktionscode.** Nicht kopieren, nachbauen. Sprache der Oberfläche: Deutsch (Quelle), Niederländisch und Französisch für Kopf/Fuß und Markt-Seiten.

## Aktueller Gesamtauftrag und kanonische Quelle · 26.10.2026

Der Nutzer bestimmt `nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` als gemeinsames Repository des Gesamtsystems. Neue Anwendungen, Regeln, Integrationsverträge, REA-Anbindung und Small-Business-Zuordnungen hier führen. Bestehende Quellstände und Herkunft bei der Konsolidierung bewahren; weder Force-Push noch Löschung der Ausgangsrepositories. GitHub ist die kanonische Quelle; eine bestätigte lokale GitLab-Anbindung ist nachgelagerte CI/Spiegelung mit Fast-forward, keine zweite Schreibquelle. Historische Mirror-/Watcher-/Factory-Skripte nicht ungeprüft starten.

Zielaufbau: Next.js/TypeScript für öffentlichen Webauftritt und native NeX Agentic AIFly-Seitenleiste; eigene Agentur- und TEILEKLAR-Funktionen mit klaren Anwendungskontexten. Affilinet Portal Aachen ist ein gesondertes, pausiertes Kundenprojekt und kein Agenturmodul, keine Lieferabhängigkeit und kein zu migrierender Datenbestand. Die Seitenarchitektur umfasst die eigenen TEILEKLAR-, Werkstatt-/Partner-/Kunden-/Affiliatebereiche. Zielmarkt: 90 Prozent Deutschland als Nutzerziel, kein behaupteter Analyticswert. Einheitliche deutsche Ansprache, passende Folgeseiten und überprüfte Verlinkungen; NL-/FR-Schlüsselsätze erhalten. Unterschiedliche Domains, Rollen oder Mandanten nicht durch einen gemeinsamen Cookie oder Clientclaim gleichsetzen.

Quellen vor jeder Wiederverwendung fachlich zuordnen: `config/source-boundaries.json` und `docs/architecture/0011-source-and-customer-boundaries.md`. Fertige Komponenten aus allen autorisierten Repositories gezielt nutzen, mit Quelle/Commit/Dateien, Zweck, Lizenzgrundlage, Anpassung und Tests. Keine pauschalen Projekt-/Historienimporte, keine Übernahme von Kundendaten, Secrets, Branding oder Kundenkonfiguration. Ähnliche Namen oder Funktionen begründen weder gemeinsame Produkte noch SSO oder eine Datenmigration. Der verworfene lokale Zweig `factory/monorepo-autonomy-2026-10-26` enthält den irrtümlichen Kundenimport und darf nicht als Agenturstand gepusht oder zurückgemergt werden.

Der Nutzer hat Implementierung und Erstellung fehlender Hero-Clips beauftragt. Diese allgemeine Freigabe nicht erneut verlangen. Konkrete Zahlungs-/Versand-/Produktiv-/Rechtsvoraussetzungen bleiben an die einzelne Aktion gebunden. Der getypte API/Auth-Zielvertrag ist kein Nachweis bereits laufender SSO-/Provider-/Produktivfunktionen. Aktuelle Umsetzungsstände und Grenzen: `PROGRESS.md`, `docs/contracts/`, `docs/automation/` und die Architekturentscheidungen.

## Wiederverwendbare Small-Business- und REA-Vorgaben

Bei jeder Aufgabe die Small-Business-Zuordnung prüfen. Für passende Unternehmens-, Vertriebs-, Marketing-, Finanz-, Personal- oder wiederkehrende Automationsarbeit zuerst `python3 tools/automation/small_business.py verify` und anschließend `load smb-router --references` sowie `load <passender-skill> --references` verwenden. Quelle und Nutzungshinweise: `docs/automation/small-business.md`; gepinnte Metadaten: `config/integrations/small-business.json`. Vorhandene Projekt-/Auftragsangaben verwenden; keine unnötige erneute Onboarding- oder allgemeine Freigabefrage. Original-Gates an konkrete folgenreiche Aktionen binden. Installation bedeutet weder Connectoranmeldung noch Scheduler, Brain-Ingestion oder Runtimefreigabe. Keine fremden Beispieldaten als bestätigte B.V.-Fakten übernehmen. Das eigene Designsystem hat Vorrang vor der visuellen Beispielpalette fremder Workflow-Anleitungen.

REA zusätzlich unter dem Namen `rea-mcp` führen; Wrapper und Installation siehe `config/integrations/rea-mcp.json` und `docs/automation/rea-mcp.md`. Katalog/Annotationen sind Hinweise, keine Rechte. Nur autorisierte Quell-/Zielbereiche analysieren; statische Analyse nicht als Laufzeitbeleg ausgeben. Tool-/Schema-/Evidenzbindung und exaktes Read-back prüfen. Die bestehende VPS-Instanz wird durch die zusätzliche lokale Instanz nicht verändert.

Für CI-Reviews ist das öffentlich verifizierte OpenRouter-Modell `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high` vorgesehen. Kein stiller Modellfallback, kein Ausführen von Modelltext/Patches, keine Lockerung der Main-/Jeff-/Produktivgates. `config/automation.json` und `docs/automation/ai-review.md` enthalten die technischen Grenzen. Besucherausgaben zeigen nur tatsächlich erreichte Zustände: Angebotsentwurf, PDF erzeugt, Versand wartet, Termin angefragt, extern bestätigt, Marketingentwurf oder veröffentlicht dürfen nicht vermischt werden.

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

---

## Verification (verbindlich)

- `make check` — Design-/Marken-/A11y-Audit (`node tools/ds-audit-cli.js`), Ziel 0 Fehler/0 Warnungen außer dokumentierter Ausnahmen.
- `make test` — Audit + Python-Tests (`python3 -m unittest discover -s tests`) + Artefakt-/Config-Integrität.
- `make build` — Prototypen-Manifest (`sha256sum -c`) + `config/*.json` valide.
- `make e2e` — vollständige Prüfkette (Audit + Tests + Artefakt-/Config-Integrität).
- `make check-arch` — Architektur-Regeln (`.harness/arch-rules.json`); `make clean-check` — Sauber-Zustand.
Vor jeder Abschlussmeldung `make check && make test`.

## Constraints (MUST / MUST NOT)

- MUST: Designwerte nur aus `config/design-tokens.json`; Zahlen mit Preisbezug nur aus `config/fakten.json`/`config/api-prepaid.json`. `# source: AGENTS.md Verbindliche Regeln`
- MUST NOT: Preise/Rechtstexte ohne Freigabe (Pascal Courbois) ändern; keine Abrechnung/Rechnungslauf vor E1/E3/E4. `# why: Freigabevorbehalt`
- MUST NOT: Prototypen (`prototypen/*.dc.html`) kopieren — sie sind Referenz, nicht Produktionscode; Manifest bleibt unverändert. `# source: Auftrag`
- MUST: Barrierefreiheit WCAG 2.2 AA, Ziele ≥44 px, sichtbarer Fokus, Reduced-Motion. `# source: AGENTS.md`
- MUST: i18n de/nl/fr mit identischem Schlüsselsatz; Preise/Steuer/Recht folgen dem Markt. `# source: AGENTS.md`
- MUST NOT: erfundene Referenzen, Logos, Zitate oder Messwerte. `# source: Ehrlich bleiben`

## State files

- `PROGRESS.md` — Current State (Commit + Prüfstatus), In Progress, Next Steps, Blockers.
- `feature_list.json` — Features mit `id`, `behavior`, `verification`, `state`, `evidence`, `layers`.
- `DECISIONS.md` — Architektur-/Prozessentscheidungen. `config/system-inventar.json` — Systeminventar.
- `docs/quality-document.md` — Modulnoten; `prototypen/lib/ARCHITECTURE.md` — Modulgrenzen.

## Zustandsmaschine + WIP

- Zustand je Feature: `not_started → active → passing`. Wechsel nur über `make verify-feature F=<id>`; **niemals** `state` direkt auf `passing` setzen.
- **WIP=1:** höchstens ein Feature `active`. Granularität: ein Feature muss in einer Sitzung abschließbar sein (completable in one session) — sonst aufteilen.
- `make vcr` zeigt passing/aktivierte Features (Ziel 1.0).

## Definition of Done (drei Schichten)

Fertig ist, was **Laufzeit-Evidenz** hat — nicht was geschrieben oder behauptet ist.
- Layer 1 (Syntax/Statik): JSON valide, `node --check`, `make check`.
- Layer 2 (Verhalten): `make test` (Audit + Tests + Integrität).
- Layer 3 (System/E2E): `make e2e` — **Layer 3 (e2e) is required when changes cross component or domain boundaries** (Tokens, i18n, Config, Prototypen).
- Reihenfolge: Do not proceed to Layer N+1 if Layer N fails (must pass in order). Laufzeitsignale: Audit 0 Fehler, Manifest unverändert, keine debug artifacts.

## Architecture boundaries

`config/` (Werte/Regeln) → `packages/*` (generiert/abgeleitet) → `apps/*` (Anwendung) → `docs/` (Doku).
`make check-arch` erzwingt die Grenzen (WHAT/WHY/FIX).
Promotion-Prinzip: **jede im Review gefundene Fehlerkategorie wird zu einer Regel in `.harness/arch-rules.json`.**

## Observability

- Vor jedem Feature: Sprint-Contract (`templates/sprint-contract.md`).
- Während der Verifikation: `make session-start` / `make session-end` schreiben JSONL nach `.harness/traces/`.
- Nach Abschluss: Bewertung gegen `templates/evaluator-rubric.md` — jede Dimension mindestens B.

## Clock-in / Clock-out

- **Clock-in:** `PROGRESS.md` + Lesereihenfolge oben befolgen, `make check` grün bestätigen, dann arbeiten.
- **Clock-out:** `PROGRESS.md` aktualisieren (Current State + Next Steps), `make clean-check`, dann committen.
- **Clean-State:** `make clean-check` (Audit, Tests, Manifest, Feature-Liste, PROGRESS, Debug-Reste). Dual-Mode: sofort beim Sitzungsende **plus** periodischer Voll-Sweep gegen Struktur-Drift.

## Commits und Dokumentation

- **Atomicität:** ein logischer Vorgang pro Commit; das Repo ist nach jedem Commit konsistent.
- **Commit-Nachricht:** das *Warum* erklären (explain why), nicht nur das Was (not just what).
- **Keine veralteten Docs (no stale documentation):** Doku im *same commit* wie die Änderung aktualisieren.
- **Kein überstürztes Fertigmelden (do not rush, running low on context):** bei knappem Kontext stoppen, `PROGRESS.md` aktualisieren, sauberen Checkpoint committen.

## Company-Status

- `make company-status` bzw. `node tools/company-status.mjs` erzeugt `docs/COMPANY-STATUS.md` +
  `evidence/company-status.json`: Harness-Stand aller Company-Repos, Dienstelage der Gesundheitspruefung,
  offene Blocker (nexi2fyi) und offene Defekte. Reiner Report — die Gates bleiben in den Repos.

## Tools / MCP

- Zugriff auf `node`, `python3`, `bash`; Tool-Geltung in `.claude/settings.json`.
- `tools/inhaltsabgleich.js` prüft Fakten-Konsistenz, erwartet aber das Herkunfts-Layout (api/, lib/, Prototypen im Root) — in diesem Repo derzeit **nicht lauffähig** (siehe `PROGRESS.md`, offener Punkt).
