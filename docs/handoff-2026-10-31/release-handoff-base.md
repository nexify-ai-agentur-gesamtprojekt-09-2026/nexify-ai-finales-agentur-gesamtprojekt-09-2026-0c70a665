# Handoff-Release-Basis — NEX-RELEASE-20261030-2000

## Push-Status: BLOCKIERT (externe GitHub-Auth), kein Force, kein main, kein PR
- `git ls-remote`/Push schlagen fehl: **"Invalid username or token. Password authentication is not supported for Git operations."** → eingebetteter Remote-Token ist ungültig/abgelaufen.
- Keine Alternative vorhanden: kein `gh` CLI, keine SSH-Keys, kein `GITHUB_TOKEN`/`GH_TOKEN`, kein credential.helper. Auftragsgemäß keine neuen Zugänge/Credentials angelegt.
- Behebung (Plattform-UI, keine Credentials im Chat): Emergent-GitHub-OAuth neu autorisieren (GitHub → Settings → Applications → Authorized OAuth Apps → Emergent widerrufen → in Emergent über Home-Tab neu verbinden), danach „Save → Save to GitHub" → Repo wählen → Branch `handoff/2026-10-30-release` anlegen → pushen.

## Trigger-Befund (statisch aus `.github/workflows/*`, read-only) — Bedingung für Branch-Push ERFÜLLT
- **Kein Produktionsdeploy**: in keinem Workflow ein Deploy-/Vercel-Schritt. Vercel-Prod nur von `main` (extern).
- **Kein kostenpflichtiger Agentenrun**: `ai-review` (OpenRouter) läuft NUR bei `pull_request_target` (PR), NICHT bei Branch-Push. `slack-notify` nur `main`/PR.
- Branch-Push würde nur **`ci.yml`** auslösen (`permissions: contents: read`, Audit/Tests/Build, **kein** Deploy) — Standard-CI, kein Agentenrun, kein Prod.
- ⇒ Sobald die GitHub-Verbindung erneuert ist, ist der reine Branch-Push sicher und auftragskonform.

## Exakte Basis für eure Agenten (sobald gepusht)
- Repo (ohne Credentials): `github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`
- Ziel-Branch: `handoff/2026-10-30-release` (neu; remote noch nicht vorhanden)
- Branch-URL (nach Push): `https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665/tree/handoff/2026-10-30-release`
- **Commit-SHA (HEAD): `901343a7b38717a30edb68c058539b46dd341d6d`** (lokaler `main`, 54 Commits vor `origin/main f91b671`, sauberer Fast-Forward; enthält `cfaca08`).

## Dateigrenzen
- **Enthalten**: gesamter Repo-Stand bis `901343a` inkl. UI-Depth (`globals.css`, `masterplan-tokens.css`, regenerierte Evidence + Register), EN-Staging komplett unter `i18n-staging/en/**` (Daten 495+61+26 + 21 Komponenten-Quellfragmente + Tools/Runbook), Handoff-Doku `docs/handoff-2026-10-31/**`.
- **Runtime unverändert**: `config/site-map.json`, `config/i18n.json`, `apps/web/lib/i18n.ts`, Komponenten — EN liegt ausschließlich in Staging, nicht in der Laufzeit. `make test` = 583 OK.
- **Ausgeschlossen/unberührt (reserviert)**: `tools/bigbuy_batch.py`, `tests/test_bigbuy_batch.py`, `docs/contracts/bigbuy-batch.md`. `.cloud`-Domains unverändert.
