# Gesamtindex – Gutachtenkette 28.09.2026

Lauf a9666976-c613-40a3-92aa-f1d182032925 · Endstatus **PARTIAL_BLOCKED** · AUSFUEHRUNGSMODUS: PHASENEMULATION

| # | Artefakt | Hash | Status |
|---|---|---|---|
| 1 | 01-technisches-gutachten.md | sha256:f44b255c93834dd754f83f50f151993484b94f63c15ff13d3217c32a7bfb0f99 | PARTIAL |
| 2 | 02-umsetzungsplan.md | sha256:570a8ed9e3a509e8cd68481739522ba9490307586bc2a49ae66195d0b5ea4b4a | PARTIAL |
| 3 | 03-zertifizierungsreife.md | sha256:1f3ceadaa1afdbf56b6daedf6809bece69fd9151e93b047a762211bf6a58cf97 | PARTIAL (Urteil NOT_READY) |
| 4 | uebergabe-agent1/2/3.json | – | validiert (Identität, Hash, Rolle, Vorgängerhash) |
| 5 | pruefflauf-2026-09-28.json | – | Evidenz |

## Rückverfolgbarkeit
| Kante | Beispiel |
|---|---|
| Quelle → Evidenz | tests/*.test.js → pruefflauf-2026-09-28.json |
| Evidenz → Befund | pruefflauf → B-01 |
| Befund → Risiko | B-04 → „Schema unbelegt“ hoch |
| Befund → Maßnahme | B-04 → M-03; B-06 → M-05; B-07 → M-06; B-12 → M-10 |
| Maßnahme → Nachweis | M-03 → SQL-Log + RLS-Protokoll |
| Kriterium → Kontrollnachweis | Mandantentrennung → Migration 007 + Prüfwerkzeug |
| Kriteriumslücke → Maßnahme | Sicherung → M-10; Rechtstexte → M-06 |
| Widerspruch → Klärung | W-04 → M-02 |

Verwaist: keine (jeder Befund B-01…B-13 hat eine Maßnahme oder ist Ergebnis ohne Handlungsbedarf: B-09; B-14 betrifft den Vorlauf).

## Register
**Lücken:** L-1 Node-Lauf (M-01) · L-2 DB-Lauf (M-03) · L-3 Serverlauf (M-05) · L-4 Rechtstexte (M-06) · L-5 Screenreader (M-08) · L-6 SBOM (M-09) · L-7 BCP-Übung (M-10) · L-8 Modelllauf (M-11) · L-9 Managementsystem (Pascal-Entscheidung)
**Annahmen:** A-1 Arbeitsbereich ist der aktuelle Stand · A-2 Node 22/Postgres 16 verfügbar · A-3 vitest-Ersatz verhält sich in den genutzten Matchern wie vitest
**Widersprüche:** W-04 offen bis M-02 · W-05 offen bis M-01 · W-01 offen (E5) · W-03 teilweise (M-12)
**Sperren:** S-1 kein Produktivzugriff · S-2 keine Normvolltexte · S-3 keine Subagenten (Phasenemulation) · S-4 orchestrate_state.py nicht verfügbar – Vertrag manuell
**Restrisiken:** R-1 Ersetzungs-Regressionen bis render-smoke in CI läuft · R-2 Rechtsrisiko bei versehentlicher Veröffentlichung · R-3 Unabhängigkeit der Prüfung eingeschränkt

## Nächster zulässiger Schritt
**M-01:** Repository nach GitLab, Pipeline einmal laufen lassen. Kleinstes fehlendes Beweismittel: das Pipeline-Log der 12 Jobs. Abnahmekriterium: alle Jobs beendet (grün oder mit Befundliste), Log-Hash in der Laufakte. Bis dahin: keine Live-Schaltung, keine Freigabe, keine Hartsperren.

PDF-Fassung: nicht erzeugt (kein Rendering-Werkzeug im Lauf) – visuelle Prüfung **offen**.
