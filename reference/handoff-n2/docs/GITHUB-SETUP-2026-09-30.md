# GitHub-Einrichtung · 30.09.2026 · finale Agentur-Gesamtlösung

## Ziel

Ganze neue Lösung in GitHub ablegen, Code-Review über Coderabbit.
CI/CD bleibt ausschließlich auf GitLab (kostenfrei), kein GitHub Actions.

## Ziel-Repo

- Remote: `https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git`
- Branch: `main`
- Inhalt dieses Pakets: 435 Dateien, 13 MB, keine Secrets/`.env`/`.pem`.

## Erledigt (belegt)

- `git init -b main` im Paket.
- `.gitignore` angelegt (`.env`, `*.pem`, `*.key`, `secrets/`, `node_modules/`, Logs, OS-Junk).
- Initial-Commit `bf4a6b3` mit 435 Dateien.
- `git remote add origin` auf das Ziel-Repo.

## NeXify-Orakel (`nx-jeff`, erreichbar)

- `frage --choice einrichtung`: **erst-auth** (66 %) — zuerst GitHub-Auth
  (Token oder SSH), dann pushen. Zweite Wahl `kanonisch` (19 %): dieses
  Paket als Quelle.

## Blocker: GitHub-Auth fehlt

Geprüft: kein `gh`, kein GitHub-Token, keine GitHub-SSH-Key registriert.
`ssh -T git@github.com` → `Permission denied (publickey)`.
Push ohne Credentials → `could not read Username`.

Nötig ist genau einer dieser Werte (nur von Pascal/nexifyai-dev):

1. Personal Access Token (Scope `repo`), ODER
2. öffentlicher SSH-Key eines GitHub-Accounts `nexifyai-dev` mit Schreibrecht,
   ODER
3. `gh auth login` mit Zugang zum Account `nexifyai-dev`.

## Push, sobald Auth vorliegt

```bash
cd /opt/ai-stack/design_handoff_nexify_gesamtloesung
git push -u origin main
```

Kein GitHub-Actions-Workflow anlegen. CI/CD bleibt GitLab
(`.gitlab-ci.yml` im Plattform-Repo `nexify-neu`).

## Liveschaltung (weiter Auftrag, Stand 30.09.2026)

- Neues Gesamtkonzept fertig: DS-Audit `0 Fehler, 0 Warnungen`, 39 kanonische
  Seiten, `prototypen/MANIFEST.sha256` 79/79 OK.
- Live hinter Abnahme-Gate: `vorschau.nexifyai.cloud` (DUS) + FRA `:8907`.
- Produktion `www.nexifyai.cloud` noch altes Konzept (FRA `:8788`).
- Cutover vorbereitet (Docroot-Swap `new-nexifyai-cloud` → `nexify-gesamt`),
  nicht ausgeführt.
- Harte Blocker: Freigabe-Gate `0/FAIL`, Entscheidungen E1/E3/E4/E5/E6/E12,
  kritischer Live-Auth-Bypass (`POST /api/auth/login`), 8 OpenBao-Secrets fehlen.
