# Selbstkonfiguration — Register, Ableitung und Goal-Automatik

Stand: 18.11.2026. Grundlage: `DECISIONS.md#D-023` (Inhaberentscheidung vom
18.11.2026, Interaktion `968460c7-eea5-4853-9ee1-84ac62ca739c`).

## Zweck

Das Register `config/selbstkonfiguration.json` beantwortet drei Fragen, ohne
dass ein Agent sie aus dem Chatverlauf raten muss:

1. **Woraus leite ich meine Vorgaben ab?** — aus den Quellen `S1` bis `S6`.
2. **Was darf ich daraus tun und was nicht?** — aus `derivation_rules` und
   `limits`.
3. **Wie führe ich einen Auftrag als Goal-Automatik zu Ende?** — aus
   `goal_automation` mit Schritten und Haltebedingungen.

Der Prüfer `tools/check_selbstkonfiguration.py` hält das Register ehrlich: Jede
genannte Quelle muss im Baum liegen, jede Ableitung eine bekannte Quelle nennen,
jede Grenze auf eine Entscheidung in `DECISIONS.md` zeigen, jedes Gate auf ein
vorhandenes Werkzeug verweisen, und die Goal-Automatik darf weder einen
automatischen Merge nach `main` noch eine automatische Produktivauslieferung
erlauben.

## Quellen

| ID | Datei | Rolle |
|---|---|---|
| S1 | `AGENTS.md` | verbindliche Arbeitsvorgabe |
| S2 | `DECISIONS.md` | Entscheidungsregister |
| S3 | `config/llm-policy.json` | Modell- und Anbietervorgabe |
| S4 | `config/source-boundaries.json` | Quellengrenzen und Wiederverwendung |
| S5 | `config/automation.json` | Automatisierungsgrenzen |
| S6 | `docs/automation/selbstkonfiguration.md` | diese Erläuterung |

Chatverlauf ist keine Quelle. Eine Aussage im Gespräch wird erst zur Vorgabe,
wenn sie als Entscheidung in `DECISIONS.md` steht und hier referenziert wird.

## Ableitungsregeln

- **R1** — Eine Vorgabe gilt nur, wenn sie in einer Quelle unter `sources` steht.
- **R2** — Bei Widerspruch gilt die jüngere Inhaberentscheidung; der Widerspruch
  wird sichtbar gemacht, nicht stillschweigend aufgelöst.
- **R3** — Fehlt eine Fähigkeit, wird sie standardkonform gebaut, positiv und
  negativ getestet und im selben Auftrag eingesetzt.
- **R4** — Wiederverwendung braucht Quelle, Commit, Pfade, Zweck,
  Lizenzgrundlage, Anpassung und Tests.
- **R5** — Jede Automatisierung bleibt in den Grenzen aus S5 und D-017.
- **R6** — `fertig`, `live` oder `verbunden` nur mit Messwert, Test und
  unabhängiger Prüfung am genannten Commit.

## Grenzen

Die Grenzen `L1` bis `L6` verweisen auf D-017 (keine Zahlungen, keine
Preisänderungen, keine Rechtstextänderung ohne Freigabe, keine Lockerung von
Schutzmechanismen, keine Secrets im Klartext, nichts löschen) und auf D-023
(kein pauschaler Projektimport). Eine berührte Grenze ist eine Haltebedingung,
kein Diskussionsthema.

## Gates

| ID | Befehl | Zweck |
|---|---|---|
| G1 | `python3 tools/check_selbstkonfiguration.py` | Register gegen Quellen und Entscheidungen prüfen |
| G2 | `python3 tools/check_source_boundaries.py` | Quellengrenzen und Wiederverwendung prüfen |
| G3 | `make governance-check` | LLM-Policy, Hermes, Lösungsregister, Skills, AI-Coverage |
| G4 | `python3 -m unittest discover -s tests -p test_selbstkonfiguration.py -q` | Positiv- und Negativfälle des Registers |

Alle vier Gates sind Pflicht. Ein rotes Gate blockiert den Abschluss, nicht die
Diagnose.

## Goal-Automatik

Die Goal-Automatik ist eingeschaltet, aber begrenzt. Sie startet, sobald ein
Auftrag ein Ziel nennt, aus dem sich eine Vorgabe aus einer Quelle ableiten
lässt. Sie läuft dann in sieben Schritten:

1. Ist-Stand messen und Quelle mit Commit festhalten.
2. SOLL aus den Quellen ableiten und als Abnahmekriterium notieren.
3. Plan mit Fachagenten schneiden, WIP=1, Maker und Checker trennen.
4. Umsetzen, positiv und negativ testen, Diff prüfen.
5. Unabhängig prüfen lassen; ohne APPROVE kein Abschluss.
6. Als Entwurfs-PR ausliefern; kein automatischer Merge.
7. Wissen zurückschreiben und Register nachführen.

Sie hält an, wenn eine Grenze berührt ist, eine Quelle fehlt, gesperrt ist oder
ohne Entscheidung widerspricht, ein Test oder eine unabhängige Prüfung fehlt,
oder eine Produktiv- oder Rechtswirkung nicht durch den Inhaber gedeckt ist.

Der Unterschied zu einem Freibrief: Die Automatik darf **planen, bauen, testen,
prüfen lassen und einen Entwurf liefern**. Sie darf **nicht** selbst nach `main`
mergen, nicht produktiv ausliefern und keine Rechte ausweiten.

## Anwendung in einem Lauf

1. `python3 /opt/nexifyai/scripts/knowledge-bootstrap.py --verify` ausführen.
   Exit ungleich 0 ist ein Blocker und wird gemeldet, nicht umgangen.
2. Dieses Register lesen, bevor eine Vorgabe behauptet wird.
3. Ist-Stand messen, Quelle mit Commit festhalten, SOLL ableiten.
4. Gates aus `gates` laufen lassen; Ergebnis mit Befehl und Exit-Code notieren.
5. Ergebnis als Entwurfs-PR liefern und im Issue belegen.

## Änderung des Registers

Eine Änderung braucht:

1. eine Inhaberentscheidung oder eine belegte Quelle,
2. einen Eintrag in `DECISIONS.md` (fortlaufende Nummer, Wortlaut, Folgen),
3. die Anpassung von `config/selbstkonfiguration.json`,
4. einen neuen oder angepassten Negativfall in `tests/test_selbstkonfiguration.py`,
5. grüne Gates G1 bis G4.

Wer das Register ändert, ändert damit die Vorgabe für alle Agenten. Deshalb ist
das ein eigener, begründeter Schritt und keine Nebenwirkung einer anderen
Aufgabe.

## Was das Register nicht ist

- Kein Geheimnisspeicher. Es nennt Dateien und Umgebungsvariablen, nie Werte.
- Keine zweite Wahrheit neben `AGENTS.md` und `DECISIONS.md`. Es zeigt auf sie.
- Keine Freigabe für Produktivänderungen. Diese bleibt beim Inhaber.
- Keine Aussage über nicht gemessene Zustände. Was nicht belegt ist, steht als
  offen im Text.

## Belegter Stand

- Register und Prüfer liegen in diesem Zweig; G1, G2 und G4 sind grün.
- Der Wissenssprung ist rot: `knowledge-bootstrap.py --verify` endet mit Exit 1,
  weil `REA-CAPABILITY-POLICY.json` mit `0600 root` geschützt ist. Der
  Bundle-Hash `05e02d4a…305f` stimmt mit dem Manifest. Das ist ein
  Umgebungsrecht, kein Registerfehler, und wird als Blocker gemeldet.
- Hermes-Schlüssel und Rollenumfang sind nicht Teil dieses Registers; sie hängen
  an NEX-541.
