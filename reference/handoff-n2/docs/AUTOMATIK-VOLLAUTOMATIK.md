# Vollautomatik · GitHub ↔ GitLab synchron · Coderabbit · Slack

## Ziel

Issues, Merge-/Pull-Requests und Deployments restlos automatisiert und synchron
über GitHub und GitLab. Coderabbit als Review-Schicht, Slack als Kanal.
CI/CD bleibt auf GitLab (kostenfrei), GitHub ist Spiegel + Review.

## NeXify-Entscheidung (nx-jeff, 30.09.2026)

- `frage --choice automatik`: **erst-auth-mirror** (57 %) — zuerst GitHub-Auth,
  dann Push + Mirror GitHub→GitLab, danach Slack/Coderabbit.

## Architektur

| Schicht | System | Rolle |
|---|---|---|
| Quelle | GitLab CE `gitlab.nexifyai.cloud` | Code, Issues, MR, CI/CD, Deploy |
| Spiegel | GitHub `nexifyai-dev` | Code-Review (Coderabbit), Öffentlichkeit |
| Review | Coderabbit (GitHub App) | automatische PR-Reviews |
| Kanal | Slack | Push/MR/Deploy-Benachrichtigung |

## Erforderliche Geheimnisse (alle aktuell UNBELEGT)

| Geheimnis | Zweck | Wo hinterlegen |
|---|---|---|
| `GITHUB_TOKEN` (PAT, Scope `repo` + `workflow`) | Push/Mirror nach GitHub | GitLab-CI-Variable oder OpenBao `nexify/data/github:token` |
| `GITLAB_TOKEN` (PAT, Scope `api`) | Mirror per API steuern | OpenBao `nexify/data/gitlab:token` |
| `SLACK_WEBHOOK` | Slack-Incoming-Webhook | GitLab-Integration Slack |
| Coderabbit | GitHub-App auf `nexify-ai-finales-agentur-gesamtprojekt-09-2026` | Owner installiert |

## Schritte (Reihenfolge laut NeXify)

1. GitHub-Auth beschaffen (PAT `repo` oder SSH-Key für `nexifyai-dev`).
2. `git push -u origin main` (Repo ist vorbereitet, Commit `c97ce39`).
3. GitLab Push-Mirror anlegen: GitLab → Settings → Repository → Mirroring →
   `https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git`
   (Richtung Push, Auth = `GITHUB_TOKEN`).
4. Slack-Integration in GitLab aktivieren (Settings → Integrations → Slack,
   Webhook `SLACK_WEBHOOK`, Events: Push, Merge Request, Pipeline).
5. Coderabbit: GitHub-App auf dem Ziel-Repo installieren.

## Alternativ: Mirror als CI-Job (ohne GitLab-Mirror-UI)

```yaml
github-mirror:
  stage: doku
  rules:
    - if: '$GITHUB_TOKEN && $CI_COMMIT_BRANCH == "main"'
  script:
    - git remote add github "https://oauth2:${GITHUB_TOKEN}@github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git"
    - git push github main --force
```

## Slack-Benachrichtigung (CI-Job)

```yaml
slack:
  stage: doku
  rules:
    - if: '$SLACK_WEBHOOK'
  script:
    - |
      curl -sS -X POST -H 'Content-Type: application/json' \
        --data "{\"text\":\"${CI_PROJECT_PATH} · ${CI_COMMIT_REF_NAME} · ${CI_PIPELINE_STATUS} · ${CI_PIPELINE_URL}\"}" \
        "$SLACK_WEBHOOK"
```

## Stand 30.09.2026

- GitHub-Repo lokal vorbereitet: `main`, Remote gesetzt, 2 Commits, keine Secrets.
- Blocker: `GITHUB_TOKEN`, `GITLAB_TOKEN`, `SLACK_WEBHOOK` und Coderabbit-App fehlen.
- Keine GitHub-Actions. CI/CD bleibt GitLab.
