# Schwachstellen-Scan der Container-Images

Stand: 2026-10-07T04:17:40.380Z

| Image | HIGH | CRITICAL | mit Fix | Status |
| --- | --- | --- | --- | --- |
| `deploy-api:latest` | 0 | 0 | 0 | gescannt |
| `deploy-db:hardened` | 63 | 3 | 0 | gescannt |
| `deploy-scanner:latest` | 95 | 5 | 3 | gescannt |
| `nexify-app:latest` | 0 | 0 | 0 | gescannt |
| `nx-app-check:latest` | 0 | 0 | 0 | gescannt |
| `nx-web-check:latest` | 0 | 0 | 0 | gescannt |
| `nx-gateway-check:latest` | 0 | 0 | 0 | gescannt |
| `nx-mcp-check:latest` | 0 | 0 | 0 | gescannt |
| `nx-worker-check:latest` | 0 | 0 | 0 | gescannt |
| `ghcr.io/get-convex/convex-backend:latest` | 15 | 1 | 15 | gescannt |
| `registry.librechat.ai/librechat-ai/librechat-dev:latest` | 45 | 2 | 45 | gescannt |
| `dataelement/bisheng-backend:v3.0.0-beta2` | 1114 | 36 | 684 | gescannt |
| `cr.dataelem.com/dataelement/gateway:v1.6.0` | 181 | 27 | 144 | gescannt |
| `searxng/searxng:latest` | 0 | 0 | 0 | gescannt |
| `openbao/openbao:2` | 0 | 0 | 0 | gescannt |
| `pgvector/pgvector:pg16` | 101 | 16 | 51 | gescannt |
| `node:22-alpine` | - | - | - | nicht vorhanden |

Report, kein Gate: Findings mit verfuegbarem Fix sind priorisiert zu patchen (Image-Rebuild/Update); ohne Fix bleibt nur Bewertung/Risikoentscheidung.
