# Online-Status der Seiten

**Stand 29.09.2026**

## Jetzt erreichbar (Quick-Tunnel, temporär)

- Öffentliche URL: `https://cookies-anticipated-jefferson-push.trycloudflare.com/NeXifyAI%20Cloud%20v12.dc.html`
- Lokal: `http://127.0.0.1:8091/NeXifyAI%20Cloud%20v12.dc.html` (HTTP 200)
- Reproduzierbar: `tools/vorschau-online.sh` (startet Server :8091 + Tunnel)

## Stabil (Domain nexifyai.cloud) — bereit, aber extern blockiert

Pfad: Cloudflare Named Tunnel `fa05bd9f-…` → Traefik (:443) → Router
`Host(vorschau.nexifyai.cloud)` → `http://127.0.0.1:8091`.

Blocker: `CF_API_TOKEN` fehlt (`/etc/nexifyai/cloudflare.env` existiert nicht).
Ohne Token kann kein Hostname/DNS zum Named Tunnel hinzugefügt werden.
Quick-Tunnel-URL rotiert bei jedem Neustart.

## Nächster Schritt (benötigt extern)

1. `CF_API_TOKEN` nach `/etc/nexifyai/cloudflare.env` legen.
2. `vorschau.nexifyai.cloud` als Tunnel-Hostname ergänzen (siehe `scripts/cf-tunnel-route-patch.py`).
3. Traefik-Route in `/docker/traefik-juib/dynamic.yml` aktivieren.

## Nachtrag 29.09.2026 · vorschau.nexifyai.cloud existiert bereits

- DNS `vorschau.nexifyai.cloud` löst auf (Cloudflare, orange Cloud).
- Öffentlich liefert sie aber `401 Authorization Required` (nginx), d. h. sie
  zeigt aktuell auf GitLab-nginx, nicht auf diese Vorschau.
- Traefik-Route `vorschau.nexifyai.cloud → 127.0.0.1:8091` ist lokal verifiziert:
  `curl -H 'Host: vorschau.nexifyai.cloud' https://127.0.0.1/` → HTTP 200 (Redirect).
- Fix: Cloudflare-Routing (Tunnel-Ingress oder DNS-Origin) auf Traefik/`localhost:443`
  umstellen. Erfordert `CF_API_TOKEN` (fehlt).

## Nachtrag 29.09.2026 · stabile Domain LIVE (hinter Abnahme-Gate)

- `vorschau.nexifyai.cloud` (Tunnel f0f2b101) → `http://127.0.0.1:8906`.
- Statischer Server auf **:8906** gestartet → liefert die kanonischen Seiten (HTTP 200 lokal).
- Öffentlich: `https://vorschau.nexifyai.cloud/` → **401**, Header
  `www-authenticate: Basic realm="NeXifyAI Vorschau — Abnahmestufe"` +
  `x-robots-tag: noindex` — exakt das ZIELBILD-Gate (Abnahmestufe).
- Heißt: Seiten stehen auf der stabilen Domain, hinter dem vorgesehenen
  Basic-Auth-Gate. Zugang nur mit den Abnahme-Credentials.
