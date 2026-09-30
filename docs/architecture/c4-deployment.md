# C4 · Verteilung

**Stand 28.09.2026 · Zielgruppe:** Betrieb · **Quelle:** install.sh, deploy/compose.yml, Band 01

```mermaid
C4Deployment
  title Verteilung der NeXify Plattform (Parallelbetrieb)
  Deployment_Node(cf, "Cloudflare", "Edge") {
    Container(tunnel, "Tunnel und Access", "Cloudflare", "TLS, Zugangsschutz")
  }
  Deployment_Node(vps, "Hostinger-VPS", "Frankfurt, Debian 12") {
    Deployment_Node(neu, "Compose-Projekt nexify-neu", "Docker") {
      Container(gw, "Gateway", "127.0.0.1:18080", "REST /v1")
      Container(mcp, "MCP", "127.0.0.1:18090", "Werkzeuge")
      Container(wk, "Worker", "pg-boss", "Aufträge")
      Container(otel, "Collector", "127.0.0.1:4318", "OTLP")
    }
    ContainerDb(db, "Supabase-Postgres", "intern", "RLS, pgvector")
    ContainerDb(bao, "OpenBao", "127.0.0.1:8200", "Tresor")
    Container(alt, "Altbestand", "Docker", "unberührt bis Bereinigung")
  }
  Rel(tunnel, gw, "leitet weiter an", "HTTP")
  Rel(gw, db, "liest und schreibt", "SQL")
  Rel(gw, bao, "liest aus", "HTTP lokal")
```

Frischer Server: gleiche Knoten, Projekt `nexify`, Ports 8080/8090, kein Altbestand.
