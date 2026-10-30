# Git-Handoff-Status (read-only Erhebung)

Auftrag: Übergabe vor Creditsende sichern. **Kein Push** in diesem Schritt, **keine** öffentliche Patch-/Bundle-URL. Private Quellcode-Dateien bleiben im Repo, nicht in öffentlichen Preview-Assets.

## Fakten (Stand dieser Erhebung)

- **git remote (ohne Credentials):**
  `https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665.git`
  (Remote-Name: `origin`, fetch + push identisch)
- **Aktueller Branch:** `main`
- **HEAD-SHA (vollständig):** `e79cb892591573e5fa8a52378603f9e2b7207853`
- **HEAD kurz + Betreff:** `e79cb89 docs(handover): EN-Prep Status 209/483 (oeffentliche Marketing-Seiten komplett, batch-verifiziert)`
- **Upstream-Tracking:** `origin/main`

## Warum der Backendprüfer nur `f91b671` sieht

- `origin/main` (GitHub) steht lokal auf `f91b671ec77c2cf3ca627fd4f159660bd49afbd1`.
- Lokaler `main` ist **42 Commits voraus** (`ahead 42`) und ein **sauberer Fast-Forward** über `f91b671` (keine divergierenden Commits auf origin-Seite).
- `f91b671` ist Vorfahre von HEAD → GitHub ist schlicht ein älterer Stand; es wurde seit `f91b671` **nicht gepusht**.
- Das vom Prüfer vermisste `cfaca08` (fail-closed Live-DeepSeek-Pfad) **ist** im lokalen `main` enthalten (Vorfahre von HEAD), aber noch nicht auf GitHub, weil der Push aussteht.

## Ist ein sicherer Branch-Push ohne neuen Login möglich?

- **Ja.** Die `origin`-URL enthält eine eingebettete Zugangsdaten-Komponente → ein Push funktioniert ohne neue Anmeldung.
- `credential.helper`: keiner gesetzt (Auth läuft über die eingebettete Remote-Credential).
- Kein spezielles push-Refspec; Standard = aktueller Branch.
- **In diesem Schritt wurde bewusst NICHT gepusht** (Auftrag: nur Lesen).

### Empfohlener sicherer Push-Weg (erst nach deiner Freigabe)
- Entweder Fast-Forward auf `main`: bringt GitHub von `f91b671` → `e79cb89` (42 Commits, inkl. `cfaca08`).
- Oder sicherer Sammel-Branch (ohne `main` zu verändern), z. B. `handoff/2026-10-31`, dann PR.
- Beides ohne neue Credentials möglich.

## Reservierte Backend-Dateien (separates Team) — Bestätigung
- `tools/bigbuy_batch.py` — existiert, **keine** uncommitteten Änderungen durch mich.
- `tests/test_bigbuy_batch.py` — existiert, **keine** uncommitteten Änderungen durch mich.
- `docs/contracts/bigbuy-batch.md` — existiert, **keine** uncommitteten Änderungen durch mich.
- Ich habe an diesen Dateien keine laufenden Änderungen und werde sie nicht anfassen.

## Read-only Workflow-Analyse (Push auf neuen privaten Handoff-Branch, z. B. `handoff/2026-10-31`)

Quelle: `.github/workflows/*` + `vercel.json` (nur gelesen; keine Credentials ausgegeben, kein Push).

- **ci.yml** — `on: push:` **ohne Branch-Filter** → läuft bei Push auf **jeden** Branch (also auch den Handoff-Branch). Jobs: Audit/Behavior/Integrity/Architecture, Migration-Gegenbeispiele, OpenAPI-Contract-Validate, `@nexify/web` auth-test + build. `permissions: contents: read`. **Kein Deploy-Schritt.** → reine CI-Rechenlast, kein Produktionseffekt.
- **ai-review.yml** — `on: pull_request_target` (nur bei PR open/reopen/sync/ready). **Ein reiner Branch-Push triggert es NICHT.** Nutzt OpenRouter-Secret, nur im eigenen Repo.
- **pr-triage.yml** — nur `pull_request`.
- **slack-notify.yml** — `push: branches:[main]` (nicht der Handoff-Branch) + `pull_request`. Branch-Push → **keine** Slack-Meldung; ein PR würde melden.
- **issue-triage.yml** — nur Issues.
- **Kein GitHub-Actions-Deploy/Vercel-Schritt** in irgendeinem Workflow (`grep` = keine `vercel/deploy/--prod/production`).
- **vercel.json**: `framework: vite`, `buildCommand: pnpm --filter @nexify/site build`. Vercel-Deploys laufen über Vercels **eigene** Git-Integration (außerhalb des Repos, hier nicht einsehbar). Übliche Regel: Nicht-Produktionsbranches → **Preview**-Deployment, Produktion nur vom Production-Branch (`main`). Ein Handoff-Branch-Push würde also **keinen** Produktionsdeploy auslösen — zu bestätigen in den externen Vercel-Projekteinstellungen (Production Branch = `main`).

### Empfehlung für sichere, private Codeübergabe (kein ungeprüfter Prod-Deploy)
1. Nur **Branch pushen** (`handoff/2026-10-31`), **keinen PR** öffnen → vermeidet ai-review (OpenRouter) + Slack.
2. Vorab prüfen, dass der Vercel-Production-Branch `main` ist → Branch bleibt Preview-only.
3. ci.yml läuft (read-only, kein Deploy) — unkritisch. Remote-Credentials nie ausgeben.
