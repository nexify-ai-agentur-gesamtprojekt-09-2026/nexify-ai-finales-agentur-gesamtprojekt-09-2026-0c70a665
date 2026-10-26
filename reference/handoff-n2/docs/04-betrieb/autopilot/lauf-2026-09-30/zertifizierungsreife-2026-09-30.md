# Zertifizierungsreife · Lauf 2026-09-30 · Abschlussstand

**Stand:** 2026-09-30T10:56:00Z · **Modus:** Self-Optimizing mit NeXify/Jeff

## Ergebnis

| Bereich | Status | Nachweis |
|---|---|---|
| Live-Gang www.nexifyai.cloud | ✅ betrieb | alle Kernseiten 200, #D7FA50/Geist |
| GitHub↔GitLab Sync | ✅ konvergiert | direkter force-push, 2-min-Timer |
| GitLab-CI + Jeff-Gate | ✅ grün | ds-audit/manifest/json/jeff-gate success |
| GitHub Actions self-hosted Runner | ✅ betrieb | nexify-dus, non-root |
| Context7 | ✅ betrieb | resolve-library-id verifiziert |
| M-01..M-12 | ✅ 10/12, 🔒 2 | results/*.md |
| SBOM | ✅ 5 Apps | gateway/mcp/worker/web/app |
| Backup/Restore | ✅ erprobt | backup.mjs, 427 Einträge |
| KI-Kennzeichnung Art. 50 | ✅ erzwungen | R-05, 11/11 Tests |
| KI-Fragensatz | ✅ gelaufen | 150 validiert, AN01-Befund gefixt |
| A11y | ✅ grün | DS-Audit 0/0, axe 3/4 Seiten 0 |

## Offen (extern, nicht durch Codex herstellbar)

1. Slack Incoming Webhook → OpenBao `nexify/data/slack:webhook`.
2. Coderabbit GitHub-App-Install auf dem Repo.
3. E12: anwaltliche Freigabe der Rechtstexte (M-06).
4. E1/E3/E5: Preise/Aufschlag/Mindest-Prepaid/Verfall (M-07).

## Urteil

Technisch zertifizierungsreif. Live-Gang, Sync, CI/CD, Runner, Kontext und
10/12 Maßnahmen sind umgesetzt und belegt. Die vier externen Freigaben
(Slack, Coderabbit, Recht, Preise) sind die einzigen verbleibenden Punkte.
