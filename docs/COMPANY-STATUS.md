# Company-Status (konsolidiert)

Generiert durch `tools/company-status.mjs`. Stand: 2026-10-06T03:21:18.220Z

## Repositories (Harness-Standard)

| Repo | Zweck | Harness |
| --- | --- | --- |
| `nexi2fyi` | Backoffice/Portal (Produktion :8080) | **73/73** |
| `ainex-studio` | Agent-Studio (:3400) | **73/73** |
| `nexify-myadmin` | myADMIN Cockpit (:8300) | **73/73** |
| `my-tanstack-app` | TanStack-Start-Scaffold | **73/73** |
| `lv-ai` | LV.AI AVA-Copilot | **73/73** |
| `dsh-enterprise` | DSH-Enterprise Deployment/Release-Gates | **73/73** |
| `nexify-gesamt` | Produktoberflaeche (:4173) | **73/73** |
| `design_handoff_nexify_gesamtloesung` | Gesamtloesung/Docs/CI | **73/73** |
| `dsh-market-web` | Plugin-Markt (:3086) | **73/73** |
| `teileklar` | Kundenprojekt TEILEKLAR Shop | **73/73** |
| `nexify-neu` | NeXify AI x TEILEKLAR Front-End | **73/73** |

## Git-Zustand je Repo (Bereich C, TEST-C001/C002)

| Repo | Branch | HEAD | dirty | untracked | Remote | Hinweis |
| --- | --- | --- | --- | --- | --- | --- |
| `nexi2fyi` | master | d4b4bb6 | 985 | 914 | none | kein Remote |
| `ainex-studio` | - | - | - | - | - | kein Git-Repo |
| `nexify-myadmin` | myadmin-p0-cockpit | 648bfd8 | 25 | 17 | origin | - |
| `my-tanstack-app` | ? | ? | 25 | 25 | none | kein Commit (Baseline fehlt); kein Remote |
| `lv-ai` | main | bfe2154 | 44 | 12 | origin | - |
| `dsh-enterprise` | master | f08b2a5 | 17 | 16 | origin | 7 unpushed |
| `nexify-gesamt` | - | - | - | - | - | kein Git-Repo |
| `design_handoff_nexify_gesamtloesung` | main | 4af0d5a | 48 | 26 | origin | - |
| `dsh-market-web` | master | 5725969 | 15 | 12 | none | kein Remote |
| `teileklar` | main | ef0386e | 31 | 28 | origin | - |
| `nexify-neu` | main | b728018 | 33 | 25 | none | kein Remote |

- Handlungsbedarf (freigabepflichtig): nexi2fyi (kein Remote); ainex-studio (kein Git-Repo); my-tanstack-app (kein Commit (Baseline fehlt); kein Remote); dsh-enterprise (7 unpushed); nexify-gesamt (kein Git-Repo); dsh-market-web (kein Remote); nexify-neu (kein Remote)

## Dienste (Gesundheitspruefung)

- Geprueft: 72 · Ausfaelle: keine

## Offene Blocker (nexi2fyi)

- **DNS-MAIL** — Produktivdomains + SPF/DKIM/DMARC/CAA (`node tools/mail-dns-check.mjs`) · 16 Einzelpunkte · Punkte: TEST-Q005, TEST-Q006, TEST-D007, TEST-D010, TEST-AI003
- **DRITTLAND** — AVV/SCC/TIA + Anbietervertraege je kritischem Anbieter (`node tools/transfer-check.mjs`) · 10 Einzelpunkte · Punkte: TEST-T025, TEST-T026, TEST-T027, TEST-AE006, TEST-V033, TEST-AH001, TEST-AH002
- **OFFHOST** — Off-Host-/Zweitziel fuer Backups + Restore-Nachweis (`node tools/offhost-check.mjs`) · 1 Einzelpunkte · Punkte: TEST-E024, TEST-E027, TEST-A002, TEST-H017
- **SCHULUNG** — Praktische Schulungs-/Kompetenznachweise + Business-Akzeptanz (`node tools/schulung-nachweis-check.mjs`) · 17 Einzelpunkte · Punkte: TEST-AG004, TEST-AG006, TEST-AK001

## Offene Defekte

- **DEF-0002** (mittel) Platzhalter-Ausstelleranschrift + fehlende E-Rechnungs-Pflichtstammdaten — freigabepflichtig
- **DEF-0003** (hoch) Drittlandtransfers ohne AVV/SCC/TIA (OpenRouter, DeepSeek, Resend, Stripe) — freigabepflichtig
- **DEF-0004** (mittel) Deploytes Image aus unsauberem Arbeitsbaum gebaut (uncommitted changes) — freigabepflichtig
- **DEF-0007** (mittel) Historische E2E-Testdaten in Produktion (append-only Tabellen) — freigabepflichtig
- **DEF-0026** (mittel) Zwei Content-Quellen ohne Git-Versionierung (lib/angebot-pdf.mjs, lib/mini-pdf.mjs) — freigabepflichtig

## Abschluss-Kennzahlen (§Z.5)

- TECHNICAL STATUS: **NOT GO-LIVE** (Stand 2026-10-06T03:15:07.807Z)
- requirements_total: 668
- requirements_pass: 606
- requirements_offen_teilweise: 62
- requirements_unbekannt: 0
- requirements_nicht_anwendbar: 98
- defekte_offen_gesamt: 5
- defekte_offen_kritisch: 0
- defekte_offen_hoch: 1
- defekte_offen_mittel: 4
- defekte_offen_niedrig: 0
- blockierende_defekte: 1
- offene_operator_punkte: 44

## Netz-Exposition (Betreiber-Entscheidung)

- Oeffentlich veroeffentlichte Container-Ports: **19** · ohne DOCKER-USER-Sperre: **0** · Sperre vorhanden: ja
- Prüfbefehl: `node tools/exposure-check.mjs` · Details: `docs/EXPOSITION.md`

## Geheimnis-Rechte (Konfigurationsdateien)

- Weltlesbare Geheimnisdateien: **4** · ungeschützt: **0**
- Prüfbefehl: `node tools/secret-perms-check.mjs`

## Git-Historie (Geheimnis-Scan)

- Repos geprüft: **9** · Treffer: **5** · unbewertet: **0**
- Prüfbefehl: `node tools/history-secret-check.mjs`

## Gestoppte Container (Bereich E, TEST-E005)

| Container | Image | Status | verwaist |
| --- | --- | --- | --- |
| `dsh-enterprise-openfga-migrate-1` | `openfga/openfga:v1.15.1` | Exited (0) 16 hours ago | nein (Compose) |
| `chaosdbg-api` | `872d27cd7f0e` | Exited (1) 37 hours ago | nein (Compose) |
| `chaosdbg-db` | `pgvector/pgvector:pg16` | Exited (0) 37 hours ago | **ja** |
| `nexify-migtest` | `ccc6e83d6e35` | Exited (255) 6 days ago | **ja** |
| `gowa-whatsapp` | `ghcr.io/aldinokemal/go-whatsapp-web-multidevice:latest` | Exited (255) 6 days ago | nein (Compose) |
| `brave_carson` | `openbao/openbao:2` | Exited (0) 7 days ago | **ja** |
| `brave_swirles` | `openbao/openbao:2` | Exited (0) 7 days ago | **ja** |

## Dauerbetrieb (systemd-Timer)

| Timer | enabled | active |
| --- | --- | --- |
| `nexi2fyi-backup.timer` | enabled | active |
| `nexi2fyi-drift.timer` | enabled | active |
| `nexi2fyi-tls.timer` | enabled | active |
| `nexi2fyi-wiederkehrtest.timer` | enabled | active |
| `nexify-backup.timer` | enabled | active |
| `nexify-finops-monatsbericht.timer` | enabled | active |
| `nexify-gesundheit.timer` | enabled | active |
| `nexify-integrationspruefung.timer` | enabled | active |
| `nexify-kettenwaechter.timer` | enabled | active |
| `nexify-kontrolle.timer` | enabled | active |
| `nexify-lernschleife.timer` | enabled | active |
| `nexify-sync-gesamt.timer` | enabled | active |
| `nexify-webhook-dispatch.timer` | enabled | active |
| `nexifyai-dangling-watch.timer` | enabled | active |
| `nexifyai-dify-agent-healthcheck.timer` | enabled | active |
| `nexifyai-dify-sicherung.timer` | enabled | active |
| `nexifyai-dify-skill-publish-all.timer` | enabled | active |
| `nexifyai-dus-sicherung.timer` | enabled | active |
| `nexifyai-image-scan.timer` | enabled | active |
| `nexifyai-master-integrity.timer` | enabled | active |
| `nexifyai-offsite-prune.timer` | enabled | active |

## Regel

Dieser Report aggregiert nur autoritative Quellen; er ersetzt keine Gate-Pruefung. Rot bleibt rot.
