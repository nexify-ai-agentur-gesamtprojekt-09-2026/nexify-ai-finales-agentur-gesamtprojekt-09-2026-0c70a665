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

## Produktion `www.nexifyai.cloud` · Repo-seitige Routenlösung

Die Routen stehen zentral in `config/routen.json`. Daraus werden Sitemap,
robots.txt und `infra/nginx/nexifyai-routen.conf` erzeugt:

```sh
node tools/routen.mjs schreiben
node tools/routen.mjs pruefen
```

Vor dem Cutover müssen die Dateien aus `prototypen/` ins Produktions-Docroot
und der generierte nginx-Schnipsel in den `www.nexifyai.cloud`-Serverblock
eingebunden werden. Der `root`-Pfad im vhost muss auf dieses Docroot zeigen.
Danach `nginx -t`, nginx reload und Cloudflare-Cache-Purge ausführen. Die
Startseite `/` wird direkt auf die Cloud-Datei aufgelöst; `/start` und
ungültige Sitemap-Legalpfade leiten auf aktuelle Ziele. Unbekannte URLs
liefern die Repo-404-Seite mit HTTP 404. Die Sitemap enthält nur indexierbare,
öffentliche HTML-Seiten.

**Nicht aus dem Repo lösbar:** Der Produktions-Cutover und nginx-/Cloudflare-
Änderungen benötigen Serverzugriff und bleiben hinter dem dokumentierten
Abnahme-Gate (Freigaben E1/E3/E4/E5/E6/E12, Auth-Bypass beheben, Secrets
bereitstellen). Bis zum Cutover bleibt das alte Live-Docroot unverändert.
Der `/login`-Pfad führt zur vorhandenen Anmeldeseite, stellt aber keine
Backend-Authentifizierung bereit. Der in E-Mail-Vorlagen verwendete
`/abmelden`-Pfad braucht einen serverseitigen, tokenisierten Abmelde-Handler;
die statische Website darf keine erfolgreiche Abmeldung vortäuschen.
Gesetzliche Texte unter `/nl/` und `/fr/` werden nicht automatisch übersetzt.

Live-Probe 30.09.2026: Die veröffentlichte Sitemap hat 49 URLs; 13 liefern
HTTP 200, 36 liefern 404 (Stadt- und Rechtsrouten, darunter de/nl/fr).
Von 41 HTML-Dateipfaden antworteten 40 mit HTTP 200; `/404.html` ist
erwartungsgemäß noch nicht deployt. Der alte Live-Root liefert weiterhin den
Loader, und die alten Kurzpfade `/login` sowie `/abmelden` antworten mit 404.
Browserlauf über die Live-Portale fand Syntax-Ausnahmen in
`support.js` auf Kundenportal, Partnerportal und Nachbarschaftskunden-Portal,
außerdem CSP-Blockaden für externe Google Fonts und QR-Code-Script sowie 404s
für `i18n/cloud-v12.json`, `lib/seiten-i18n.js` und `assets/icon-512.png`.
Die aktuelle Repo-Version der betroffenen Seiten lief lokal ohne
JavaScript-Ausnahmen und ohne fehlende Bilder. Diese Live-Abweichungen werden
erst durch Docroot-Cutover plus passende CSP-/Asset-Konfiguration behoben;
`/abmelden` bleibt bis zur Implementierung des Backend-Handlers blockiert.
