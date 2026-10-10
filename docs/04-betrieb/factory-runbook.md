# Factory-Runbook (lean)

Betrieb des Factory-Pfads auf srv1941843:

1. Auftrag: GitLab-Issue mit Label factory-task und file:-Block.

2. Intake: `node tools/factory-intake.mjs --label factory-task` (liest Issues, ruft den Adapter).

3. Adapter: Branch -> Commit -> MR -> CI-Pflichtgates -> Review -> Release (nur bei gruener Pipeline).

4. Schutz: main geschuetzt, kein Force, Merge nur bei gruener Pipeline.

5. Mirror: GitLab main -> GitHub (Fast-Forward, nichtdestruktiv).
