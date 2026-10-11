# PROGRESS — NeXify AI Gesamtlösung (Design-Handoff)

## Current State
- Last commit: `11994bf` (branch `main`).
- Verification: `make check` (ds-audit) **0 Fehler/0 Warnungen**, `make test` (Audit + 10 Python-Tests + Manifest/Config) **OK**, `make check-arch` OK, `make clean-check` OK.
- Harness: `make audit` (Ziel 73/73). VCR: `make vcr`.

## In Progress
- Agent-Harness nachgezogen: AGENTS.md-Router (Verification/Constraints/State/Zustandsmaschine/DoD/Arch-Grenzen/Observability/Clock-in-out), feature_list.json, PROGRESS.md, DECISIONS.md, init.sh, Makefile, .harness/, .claude/, scripts/, templates/, docs/quality-document.md, prototypen/lib/ARCHITECTURE.md, requirements.txt.

## Offene Punkte (bekannt, bewertet)
- `tools/inhaltsabgleich.js` (Fakten-Konsistenz) erwartet das Herkunfts-Layout (api/openapi.yaml, lib/, Prototypen im Root) und ist in diesem Repo **nicht lauffähig**; der Absturz wurde entschärft (fehlende Quelle = Befund statt Crash). Bewusst **nicht** in `make check` verdrahtet. Vor Reaktivierung: Layout angleichen oder Tool entfernen (mit Freigabe).
- `config/fakten.json` referenziert teils ältere Prototyp-Namen (z. B. `NeXifyAI Cloud v10.dc.html`; vorhanden ist v12) → 18 DATEI-Befunde. Inhaltsprüfung/Freigabe offen.
- Behoben: Widerspruch Mindestaufladung — `docs/03-backend/api-prepaid-umsetzung.md` nannte 50 €, die Inhabervorgabe (29.09.2026) ist 10 € (`config/api-prepaid.json`); Doku angeglichen, E3 als entschieden markiert.
- Behoben (2026-10-11): `nexify-watcher.service` löste einen **selbstauslösenden Endlos-Loop** aus — `tools/watcher.mjs` überwacht `config/`, `prototypen/`, `docs/`, die ausgelöste Pipeline (`docs-aktualisieren.mjs`/`wissen-speisen.mjs`) schreibt in genau diese Bäume → Dauer-Regeneration (~0.9 Orakel-Aufrufe/s, 4h28m CPU, Tree dauerhaft schmutzig). Fix: Self-Write-Guard in `tools/watcher.mjs` (ignoriert `docs/STAND.md`, `docs/generiert/**`, `prototypen/MANIFEST.sha256`); `make check` rc0. Commit `11994bf`.

## Offene Punkte (bekannt, bewertet)
- **Netz-Exposition — BEHOBEN (2026-10-05):** 19 veröffentlichte Container-Ports waren über `0.0.0.0`
  erreichbar, weil Docker die ufw-Regeln über die Kette `DOCKER-USER` umgeht. Fix umgesetzt:
  `iptables`/`ip6tables -I DOCKER-USER -i eth0 -j DROP`, persistent über
  `docker-user-hardening.service` (idempotent, enabled). `node tools/exposure-check.mjs` **PASS**
  (ungeschützt 0); öffentliche Traefik-Endpunkte und lokale Zugriffe unverändert. Details/Rollback:
  `docs/EXPOSITION.md`.

## Next Steps
- Fakten-Referenzen in `config/fakten.json` auf die real vorhandenen Prototyp-Dateien (v12) prüfen und nachziehen; danach `tools/inhaltsabgleich.js` wieder verdrahten.
- Freigabe-Entscheidungen E1/E4/E5/E6/E12 einholen (siehe `docs/09-final/08-recht-und-compliance.md`) und in DECISIONS.md nachtragen.
- `prototypen/lib/ARCHITECTURE.md` und `docs/quality-document.md` fortschreiben.

## Blockers
- Freigaben des Inhabers (Preise/Recht) stehen aus; keine Änderung an Preisen/Rechtstexten ohne Freigabe.
