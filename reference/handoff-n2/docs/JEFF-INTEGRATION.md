# NeXify-Orakel (Jeff) in CI/CD · 30.09.2026

## Ergebnis (verifiziert)

Jeff ist als Pflicht-Gate in die GitLab-CI eingearbeitet. Nach
DS-Audit + Manifest + JSON läuft `jeff-gate` und ruft das Orakel
(`https://ai-router.nexifyai.cloud/v1/systemone`, Modell `openrouter/typesafe/jev-1.13`).

Pipeline (Commit 29c723f5) grün:

- `ds-audit` success
- `manifest` success
- `json-konfig` success
- `jeff-gate` success — Orakel-Antwort `go`, Konfidenz 0.71, Risiko 0.9

## Bausteine

- `tools/jeff-gate.py` — CI-fähig, nur stdlib, ruft Orakel direkt (ohne `nx-jeff`).
  Exit 0 = go, 1 = rueckfrage/no_go, 3 = Orakel nicht erreichbar.
- `.gitlab-ci.yml` — Stage `jeff`, Job `jeff-gate` (`needs` auf die drei Prüfungen).
- GitLab-CI-Variablen (Projekt 42): `NX_ORAKEL_ENDPOINT`, `NX_ORAKEL_MODEL`,
  `NX_ORAKEL_KEY` (masked, auf allen Branches).

## Regel (verbindlich)

Kein Merge/Commit auf `main` ohne grünen `jeff-gate`. Sagt das Orakel
`rueckfrage`/`no_go` oder ist es nicht erreichbar (Exit 3), bricht die Pipeline ab.
