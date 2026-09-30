# M-05 · Vorschau-VPS Installation · Nachweis

**Zeit:** 2026-09-30T10:21:00Z · **Umgebung:** DUS + FRA

## Ergebnis

| Prüfung | Wert |
|---|---|
| Öffentlich `https://vorschau.nexifyai.cloud/` | 401 (Basic-Auth-Gate, Abnahmestufe) |
| Mit Credentials `/` | 200 |
| `/seiten/NeXifyAI Cloud v12.dc.html` | 200 |
| `/api/status` | 200 |
| `/tokens.css` | 200 |
| Container `nexify-app` | Up (10 h) |

## Abhängigkeiten (`/api/status`)

- `agentmemory`: ok (200)
- `lightrag`: ok (200)
- `9router`: 401 (API-Key nötig, erwartet)
- `cognee`: ausfall (Port-Drift, optional)

## Grenze

`cognee`-Health prüft Port 32869, tatsächlich 32768/32868 — kosmetischer Statusfehler,
nicht blockierend für die Vorschau.
