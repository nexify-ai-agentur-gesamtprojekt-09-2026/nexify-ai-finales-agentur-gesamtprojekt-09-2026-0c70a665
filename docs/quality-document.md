# Quality-Document — Modulgesundheit (A/B/C/D)

Je Modul 5 Dimensionen: Korrektheit · Architektur-Treue · Tests · Evidenz · Doku. Bewertet am 2026-10-05.

| Modul | Korrektheit | Architektur | Tests | Evidenz | Doku | Note |
| --- | --- | --- | --- | --- | --- | --- |
| apps/web (Cockpit) | A | A | B | B | A | A |
| tools (Audit/Selbsttest/Preis) | A | A | B | B | B | B |
| infra/db (RLS) | A | A | A | B | B | A |
| packages/tokens | A | A | B | B | B | B |
| config (Tokens/Fakten/Brain) | A | A | B | B | B | B |

Grundlage: `make check` (0 Fehler), `make test` (Selbsttest + Preis), `make e2e` (Cockpit live),
`bash infra/db/rls-test.sh`, `make check-arch`. Neue Sitzungen lesen dieses Dokument zur Priorisierung.
