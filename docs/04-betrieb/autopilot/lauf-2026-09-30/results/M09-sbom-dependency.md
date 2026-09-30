# M-09 · SBOM + Dependency-Scan · Nachweis

**Zeit:** 2026-09-30T10:32:00Z · **Umgebung:** DUS, nexify-neu

## Ergebnis

| Prüfung | Wert |
|---|---|
| `npm audit --omit=dev --audit-level=moderate` (gateway/mcp/worker/web/app) | **0 Vulnerabilities** in allen 5 |
| SBOM CycloneDX `gateway` | 91 Komponenten (`apps/gateway/sbom.gateway.json`) |
| SBOM CycloneDX `mcp` | 118 Komponenten (`apps/mcp/sbom.mcp.json`) |
| SBOM CycloneDX `worker` | 70 Komponenten (`apps/worker/sbom.worker.json`) |

## Grenze

- `web` und `app` (Next.js): `cyclonedx-npm` schlägt mit `npm-ls exited with errors`
  fehl (Peer-/Lockfile-Auflösung). SBOM für diese beiden Frontends ist offen;
  Dependency-Audit ist dennoch 0.

## Kernaussage

Keine bekannten moderaten/kritischen Abhängigkeiten; SBOM für die drei Backend-Dienste erzeugt.
