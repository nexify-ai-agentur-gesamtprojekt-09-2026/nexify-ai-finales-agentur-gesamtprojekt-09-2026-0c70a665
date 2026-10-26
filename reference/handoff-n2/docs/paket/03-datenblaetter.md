# Band 03 · Technische Datenblätter je Dienst

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

Status je Dienst ist **unbelegt**, bis ein datiertes Health-Protokoll vorliegt (`docs/generiert/dienste.md`).

| Dienst | Zweck | Port (Normal / parallel) | Prüfung | Geheimnis (OpenBao) | Daten | Sicherung |
|---|---|---|---|---|---|---|
| Traefik | TLS, Routing | 80/443 | `/ping` | – | – | Konfig im Repo |
| Gateway | API | 8080 / 18080 | `/v1/health?cb=` | JWT-, Webhook-Schlüssel | keine eigenen | Image-Tag |
| Worker | Warteschlangen | – | Heartbeat < 60 s | Revolut, Resend | pg-boss-Tabellen | mit Postgres |
| Postgres 16 + pgvector (Supabase) | Quelle der Wahrheit | 5432 | `select 1` | Rollen `nx_app`, `nx_migration`, `nx_auswertung` | alle Fachdaten | täglich + WAL, Restore geübt (Band 05) |
| OpenBao | Geheimnisse | 8200 | `/v1/sys/health` | Schlüsselteile 3/2 offline | Geheimnisse | Snapshot verschlüsselt |
| 9router | Modelle Stufe 0–2 | intern | `/health` | Anbieter-Schlüssel | keine Inhalte | Konfig im Repo |
| Langfuse (+ ClickHouse, Valkey, S3) | Traces | 3000 (Access) | `/api/public/health` | Projekt-Schlüssel | 90 Tage, maskiert | Volumes |
| Resend | Versand | extern | `GET /domains` | API-Schlüssel | Ereignisse | – |
| Revolut Merchant | Aufladung | extern | Sandbox-Order | Secret Key, Webhook-Secret | Order-Referenzen | – |
| GitLab | Code, CI | extern | `/api/v4/version` | Deploy-Token | Repo | GitLab-Backup |

Versionen werden erst bei Installation festgeschrieben (Annahme A-02 in Band 00); `install.sh --nur-pruefen` meldet Ist-Stände.
