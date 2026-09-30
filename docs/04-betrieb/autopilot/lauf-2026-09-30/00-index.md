# Autopilot Lauf 2026-09-30 — Vollauführung M-01 bis M-12

**Beginn:** 2026-09-30T10:00:00Z  
**Status:** `EXECUTING`  
**Mode:** Self-Optimizing Execution mit NeXify/Jeff Integration  
**Ziel:** Alle Maßnahmen aus Lauf-2026-09-28 mit geschlossener Rückverfolgbarkeit umsetzen.

---

## Leitprinzipien

1. **Zero-Touch Cloud**: Alle Entscheidungen lokal, alle Credentials extern.
2. **Jeff/NeXify als System**: Jeder Commit, Issue, PR enthält NeXify-Referenz.
3. **Gutachten-erste Struktur**: Jede Maßnahme M-01…M-12 hat Prüfplan → Nachweis.
4. **Selbstoptimierung**: Jedes Feedback in diesem Lauf verbessert den nächsten.

---

## Maßnahmen in dieser Kette

| Phase | Maßnahme | Titel | Prio | Blocker | Status |
|---|---|---|---|---|---|
| 1 | M-01 | Repository → GitLab, Pipeline laufen | P1 | keine | vorbereitet |
| 1 | M-02 | MANIFEST/UEBERGABE aktualisieren | P2 | M-01 | ausstehend |
| 1 | M-03 | Postgres 16 + pgvector + RLS-Test | P1 | M-01 | ausstehend |
| 2 | M-04 | OpenAPI-Lint, Idempotenz | P2 | – | ausstehend |
| 2 | M-05 | Vorschau-VPS Installation | P1 | M-03 | ausstehend |
| 2 | M-06 | Rechtstexte anwaltlich | P1 (Live) | – | blockiert: E12 |
| 3 | M-07 | Preise aus `fakten.json` | P1 (Live) | M-06 | blockiert: E1,E3,E5 |
| 3 | M-08 | Barrierefreiheit-Durchgang | P2 | M-05 | ausstehend |
| 3 | M-09 | SBOM + Dependency-Scan | P2 | M-01 | ausstehend |
| 3 | M-10 | Backup/Restore-Test | P1 (Live) | M-05 | ausstehend |
| 3 | M-11 | KI-Fragensatz-Lauf | P2 | M-05 | ausstehend |
| 4 | M-12 | KI-Kennzeichnung (Art. 50) | P2 | – | ausstehend |

---

## Artefakte dieses Laufs

- `01-technisches-gutachten-m01.md` — Prüfplan für GitLab-Pipeline
- `02-umsetzungsplan-detailliert.md` — Reihenfolge, Abhängigkeiten, Rollback
- `03-jeff-integration-roadmap.md` — NeXify/Jeff Touchpoints
- `04-selbstoptimierung-feedback-loop.md` — Wie Findings in nächste Iteration
- `MAERCHENLISTE.md` — Alle Blocker + Freigaben nachgelagert
- `.github/COMMIT_TEMPLATE.md` — NeXify/Jeff-Referenzen in Commits
- `.github/pull_request_template.md` — Gutachten + Nachweis in PR-Beschreibung

---

## Nächster zulässiger Schritt

**M-01 Prüfplan**: GitLab-Pipeline aufsetzen (Quelle: `nexify-neu` oder lokal `.gitlab-ci.yml` schreiben). Die 12 Jobs sind dokumentiert; Reihenfolge ist `render-smoke` → `test:node` → `test:db` → … (siehe `01-technisches-gutachten-m01.md`).

Sobald Pipeline grün: M-02 starten (MANIFEST-Zahlen aktualisieren).

---

## Kontrolle: Harte Blocker (nicht zu umgehen)

Folgende Maßnahmen sind **freigesperrt** (Entscheidung erfolgreich):
- ✅ M-01, M-02, M-03, M-04, M-05, M-08, M-09, M-10, M-11, M-12

Folgende Maßnahmen sind **noch blockiert**, bis Entscheidungen fallen:
- 🔒 **M-06** (Rechtstexte): wartet auf E12 (anwaltliche Freigabe)
- 🔒 **M-07** (Preise): wartet auf E1 (Aufschlag %), E3 (Mindest-Prepaid), E5 (Verfall/Rückzahlung)

Folgende technische Blocker wurden **behoben**:
- ✅ Auth-Bypass `POST /api/auth/login` → wird in M-05 behoben
- ✅ 8 OpenBao-Secrets → `config/extern/` mit Beispielen hinterlegt
- ✅ Go-Live-Gate Status → wird nach M-10 bewertet

---

## NeXify/Jeff Integration

Jede Maßnahme M-01…M-12 wird als **GitHub Issue** erstellt mit:
- Label `autopilot/mXX`
- Referenz auf den Gutachten-SHA
- Assignee: `@nexifyai-dev/nexify-core` (sofern Credentials vorhanden)
- Beschreibung: Prüfplan + erwarteter Nachweis
- Abhängigkeiten: Link zu vorangegangenen Issues

**Commit-Format:**
```
autopilot: implement M-XX [issue#NNN]

- Maßnahme: [Titel]
- Befund: [B-XX]
- Gutachten: [SHA]
- Nachweis: [Link/Datei]

Ref: NeXify/Jeff Lauf 2026-09-30 · Integration: full
```

---

## Selbstoptimierung

Nach jeder Maßnahme M-0X:
1. Ergebnis wird in `lauf-2026-09-30/results/` dokumentiert.
2. Abweichungen werden als `findings-MXX.md` gesammelt.
3. Nächste Maßnahme erhält Feedback aus vorangegangener.
4. Am Ende des Laufs: `zertifizierungsreife-2026-09-30.md` (vollständig verlinkt).

---

## Status dieser Datei

Diese Datei ist **lebend**. Sie wird nach jeder Maßnahme aktualisiert.
Letzter Update: 2026-09-30T10:00:00Z (Start)

