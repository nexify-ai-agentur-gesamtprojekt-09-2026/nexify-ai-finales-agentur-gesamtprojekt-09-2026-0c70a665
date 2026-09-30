# Betriebshandbuch · Kurzfassung

> Automatisch erzeugt am 2026-09-30 aus `config/`. Nicht von Hand ändern – Quelle ändern.

## Gesundheitsprüfungen

- **traefik**: GET /ping
- **cloudflare**: API /zones
- **supabase**: GET /rest/v1/ (anon)
- **9router**: GET /health
- **headroom**: GET /health
- **lightrag**: GET /health
- **cognee**: GET /health
- **agentmemory**: MCP search
- **dify**: GET /health
- **composio**: GET /api/v1/apps
- **resend**: GET /domains
- **revolut**: Sandbox: POST /api/orders
- **posteingang**: letzter Abruf < 5 min
- **monitoring**: Heartbeat
- **gitlab**: GET /api/v4/version
- **openbao**: GET /v1/sys/health
- **github**: GET /installation/repositories
- **slack**: POST Incoming Webhook
- **coderabbit**: GitHub-App-Install auf Ziel-Repo

## Modelle

    [
      {
        "id": 0,
        "name": "NeXify lokal",
        "modell": "${MODELL_LOKAL}",
        "kontextTokens": 32000,
        "ausgabeMax": 4000,
        "zeitlimitSek": 60,
        "centJeMioIn": 0,
        "centJeMioOut": 0
      },
      {
        "id": 1,
        "name": "Günstig",
        "modell": "${MODELL_GUENSTIG}",
        "kontextTokens": 128000,
        "ausgabeMax": 8000,
        "zeitlimitSek": 120,
        "centJeMioIn": "${PREIS_1_IN}",
        "centJeMioOut": "${PREIS_1_OUT}"
      },
      {
        "id": 2,
        "name": "Stark",
        "modell": "${MODELL_STARK}",
        "kontextTokens": 200000,
        "ausgabeMax": 16000,
        "zeitlimitSek": 300,
        "centJeMioIn": "${PREIS_2_IN}",
        "centJeMioOut": "${PREIS_2_OUT}"
      }
    ]

## Langlauf

1. wissen · sammler
2. recherche · rechercheur
3. profil · analyst (nach wissen, recherche)
4. vergleich · architekt (nach profil)
5. loesung · director (nach vergleich) · Freigabe Umsetzung durch Pascal
