# Evaluator-Rubric (Vorlage)

Bewertungsdimensionen (je A-D, bestanden ab B):
- Korrektheit: erfuellt das Feature real sein Verhalten? (Layer 2/3)
- Architektur-Treue: Grenzen eingehalten (`.harness/arch-rules.json`, `make check-arch`)?
- Testabdeckung: Pruefbefehl vorhanden und gruen?
- Verifikations-Evidenz: Ausgabe/Datum im `evidence`-Feld?
Bestehensgrenze: keine Dimension unter B; Korrektheit = A.
