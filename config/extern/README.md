# Externe Blocker — vorbereitet auf „nur noch Credential"

Jeder Blocker ist technisch vorbereitet; es fehlt nur die Eingabe/Freigabe.

| # | Blocker | Vorbereitet | Fehlt nur |
|---|---|---|---|
| 1 | www-Umschaltung | Tunnel-Route + Traefik stehen, DNS vorbereitet | Abnahme |
| 2 | VPS-Failover | Failover-Plan + Healthcheck | 2. Live-VPS |
| 3 | Slack | Integration-Skript bereit | SLACK_TOKEN |
| 4 | Vorschau-Zugang | setzen per Cloudflare/Datei | A/B-Entscheidung |
| 5 | Web-Suche | SearXNG-Compose bereit | (kein Key nötig, self-hosted) |
| 6 | SMTP | mail.mjs + Outbox bereit | SMTP_HOST+Creds |
| 7 | Revolut-Live | Order/Webhook gebaut | Merchant-Key (OpenBao) |
