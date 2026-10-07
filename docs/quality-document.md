# Quality Document — NeXify AI Gesamtlösung

Bewertung je Modul (A–D) über 5 Dimensionen: Korrektheit, Architektur-Treue, Prüfabdeckung, Nachweis, Betriebsreife.

| Modul | Korrektheit | Architektur | Prüfung | Nachweis | Betrieb | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `config/` (Werte/Regeln) | A | A | A (ds-audit + JSON-Scan) | A | B | **A** |
| `tools/ds-audit-cli.js` | A | A | A | A | B | **A** |
| `tools/github_event_inbox.py` | A | A | A (10 Tests) | A | B | **A** |
| `prototypen/` (Referenz) | A | A | A (Manifest) | A | B | **A** |
| `docs/` | A | A | B | B | B | **B+** |
| `tools/inhaltsabgleich.js` | D (nicht lauffähig im Repo) | C | D | D | D | **D** |

## Offene Prioritäten
1. `tools/inhaltsabgleich.js` — Layout angleichen oder entfernen; bis dahin nicht in `make check` (D → B).
2. `config/fakten.json` — Referenzen auf reale Prototyp-Dateien (v12) prüfen.
3. `docs/` — veraltete Werte nach Freigaben nachziehen.

## Regel
Eine Note ohne Nachweis ist unzulässig; Nachweise sind über `make check`/`make test` reproduzierbar.
