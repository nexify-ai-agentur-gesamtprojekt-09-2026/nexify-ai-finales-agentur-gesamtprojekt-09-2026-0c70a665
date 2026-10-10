# Factory End-to-End (lean)

Isolierter Auftrag (GitLab-Issue, Label factory-task) -> Adapter -> Branch -> Commit ->
Merge Request -> CI-Pflichtgates -> unabhaengiges Review (Oracle) -> Release (nur bei gruener
Pipeline) -> Ergebnisrueckfluss ins Issue.

Bestandteile:
- tools/factory-intake.mjs - liest das Issue, extrahiert file:-Bloecke, ruft den Adapter.
- tools/factory-adapter.mjs - Branch/Commit/MR/CI/Review/optional Release, nichtdestruktiv.
- Schutz: main geschuetzt (kein Force), Merge nur bei gruener Pipeline und aufgeloesten Diskussionen.
