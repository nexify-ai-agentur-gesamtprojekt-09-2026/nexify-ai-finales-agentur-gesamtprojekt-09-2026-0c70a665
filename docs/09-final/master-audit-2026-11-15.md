# Master-Audit · NeXify AI Gesamtlage · 15.11.2026

Ein konsolidiertes, belegtes Lagebild der gesamten NeXify-Infrastruktur und der
Projektstände, erstellt von der Audit-Sitzung im Auftrag der koordinierenden Sitzung für
den Inhaber Pascal Courbois. **Nur gelesen.** Gegen alle Systeme ausschließlich
`GET`/`HEAD`, keine Anmeldeversuche, keine Schreibaufrufe; an Servern, Containern, DNS,
Konten und Secrets wurde nichts geändert. Geschrieben wurde nur dieses eine Dokument.

Dieses Dokument **ersetzt kein Register.** Führend bleibt `PROGRESS.md` (Aufgaben,
P01–P26, MASTER-01 bis MASTER-18 in `config/acceptance-coverage.json`) mit der
Arbeitsliste `docs/09-final/offene-arbeiten-2026-11-14.md` (OA-001 bis OA-178). Dieses
Dokument verweist darauf und verdichtet die Lage; wo es von der Arbeitsliste abweicht,
gilt die Arbeitsliste für die Aufgabenführung. Die wesentlichen Aussagen tragen eine
Quelle und sind, wo belegbar, als **BELEGT**, **ANNAHME** oder **OFFEN** gekennzeichnet.

> **Zeitkritisch (BELEGT, N):** Der Hostinger-Snapshot beider Server (angelegt 14.11.
> 11:47 UTC) **läuft heute, 15.11.2026, 11:47 UTC ab**. Danach fehlt dieser eine
> Rückweg für serverseitige Eingriffe; als Rückwege bleiben dann die täglichen
> Hostinger-Sicherungen (je 5, neueste 14.11. 18:41 bzw. 16:14 UTC) und die benannten
> Schnappschüsse einzelner DNS-Zonen. Vor jedem Server-Eingriff heute zuerst klären,
> welcher Rückweg gilt (Inhaberentscheidung, D-016).

## Messwege und Quellen

| Kürzel | Weg | Zeit (UTC) |
|---|---|---|
| M | Eigene Live-Messung dieser Sitzung: je ein `GET` über den Sitzungs-Proxy auf die genannte Adresse; DNS über `dns.google/resolve` | 15.11.2026, 09:19 und 09:57 |
| K | Daten, die die koordinierende Sitzung dieser Sitzung übergeben hat (Resend-Konto, von ihr am 15.11. 09:56 UTC gelesen; von ihr am 15.11. ~09:25 UTC bei Cloudflare ausgeführte, inhaberfreigegebene Änderungen; PR-Reife- und Merge-Angaben). **Nicht öffentlich nachprüfbar, außer wo unten eine eigene DNS-Gegenprobe (M) genannt ist.** | 15.11.2026 |
| N | `docs/04-betrieb/netz-inventur-2026-11-14.md` (= PR 200, Zweig `claude/netz-inventur` `2fa1480`, nur gelesen), Erhebung 14.11. 22:16–22:40 UTC | 14.11.2026 |
| S | `docs/04-betrieb/server-befund-2026-11-14.md`, Hostinger-API, 14.11. ~11:45–18:45 UTC | 14.11.2026 |
| R | Repository am Commit `9c9c806` (`main`): `PROGRESS.md`, `DECISIONS.md`, `config/loesungsregister.json`, `offene-arbeiten-2026-11-14.md`, `aufraeumplan-2026-11-14.md` u. a. | 15.11.2026 |
| P | PR-Stände laut Auftrag der koordinierenden Sitzung und `PROGRESS.md` | 14.–15.11.2026 |

Grenzen: Die Live-Abrufe (M) laufen über den Netz-Proxy der Sitzung. Belastbar sind
Statuscode, Kopfzeilen, Titel und Antwortrumpf, nicht die Erreichbarkeit einzelner Ports
und nicht die Erreichbarkeit aus anderen Netzen. **srv1243952 ist von innen nicht
einsehbar** (Hostinger-API `[VPS:2044]`); dieser Server bleibt der blinde Fleck
(Abschnitt 7).

---

## 1. Kurzfassung

1. Die öffentlichen NeXify-Seiten stehen: `nexifyai.de`/`www`, `nexifyai.cloud`/`www`
   antworten mit 200 von Vercel und tragen `noindex, nofollow` (`.de` eigene Messung M,
   15.11. 09:19 UTC; alle vier durch die koordinierende Gegenprüfung am 15.11. 10:06 UTC
   bestätigt, K); Indexierung bleibt eine Inhaberfreigabe.
2. Der Shop ist gespalten (Fall A): `teileklar.shop` liefert einen **alten** Dienst auf
   srv1243952 mit **3720 Produkten** (200), kennt aber `/status`, `/categories` und
   `/products/{id}` nicht (404); die neue Vercel-Fassung unter `nexifyai.de/api/shop/*`
   antwortet mit **503** `database_binding_missing_or_unsuitable` (M, 15.11. 09:19 UTC);
   der Zahlungsmodus ist zusätzlich ungebunden (`payment_mode_unbound`, erscheint auf
   `/health`, N/M).
3. Die größte Netzänderung der letzten Tage ist der Umzug von `nexifyai.de` auf
   Cloudflare am 13.11. 21:53 UTC; dabei gingen fünf Clerk-Einträge und die prüfbare
   DKIM-Signatur des Postfachs verloren (N).
4. **Diese beiden Netzschäden sind seit dem 15.11. ~09:25 UTC behoben** (Quelle K: die
   koordinierende Sitzung hat die fünf Clerk-CNAMEs neu angelegt und die drei
   Hostinger-DKIM-CNAMEs auf „nur DNS“ gestellt); **eigene Gegenprobe über öffentliches
   DNS bestätigt die Wirkung** (M, 15.11. 09:57 UTC): alle lösen auf.
5. Offen bleibt der **tote Tunnel `nexifyai-contabo`** (seit 09.11. 10:40 UTC ohne
   Verbindung): `agenten.nexifyai.cloud` und `librechat.nexifyai.cloud` antworten weiter
   mit 530 (M, 15.11. 09:57 UTC).
6. Resend führt `nexifyai.de` als **verified** (DKIM, SPF, MX alle verified; Quelle K,
   gemessen durch die koordinierende Sitzung 15.11. 09:56 UTC); öffentlich belegt ist die
   DNS-Wirkung (`resend._domainkey` TXT vorhanden, M 09:57 UTC). Am 14.11. 20:09 UTC stand
   die Domain noch auf „failed“ (K).
7. `unternehmensbot.eu` zeigt direkt auf srv1243952 und liefert dort eine laufende
   Agenten-Oberfläche; `/health` → 200 `status: ok` (M, 15.11. 09:19 UTC) — öffentlich
   erreichbar, ohne Cloudflare davor (Spannung zu D-019 Folge 4, siehe L3).
8. `brain.nexifyai.cloud/mcp` → 401 hinter Traefik-Basisschutz (M, 15.11. 09:19 UTC); der
   Cognee-API-Container fehlt, die Daten (2,69 GB) liegen als Docker-Volumes und dürfen
   nicht geprunt werden (S, Aufräumplan).
9. srv1941843 ist zu **97 % voll** (10,2 GB frei); größter Posten 77,3 GiB
   Paperclip-Laufverzeichnisse, nach D-019 abgelöst (S).
10. GitHub Actions startet kontoweit **keine Jobs** (Ausgabenlimit); dadurch kein
    automatisches Gate vor `main`, und freigegebene PRs gehen trotz Freigabe nicht durch
    (Zweigschutz; P).
11. Abnahmefähige Entwürfe liegen vor (Einwilligungsweg 186, Terminbuchung 195,
    Cognee 197, Hermes 193); ihr Merge ist laut K vom Inhaber freigegeben, aber durch
    Zweigschutz blockiert (`mergeable_state: blocked`, Quelle K, nicht öffentlich
    nachprüfbar).
12. Ein der Orchestrierung neu übertragenes Kundenprojekt (Kürzel SK) wird in eigener
    Sitzung und eigenem Repository geführt; Kundendaten und Einzelheiten bleiben dort
    (Abschnitt 6a, D-017/D-020).

---

## 2. Lagebild Infrastruktur

| Domain / Adresse | Nameserver, DNS-Ziel | Antwort (https) | Server / Dienst | Soll / Ist | Quelle · UTC |
|---|---|---|---|---|---|
| `nexifyai.de`, `www` | Cloudflare (seit 13.11. 21:53), CNAME → Vercel, nur DNS | 200, `server: Vercel`, `noindex,nofollow` | Vercel-Projekt `…-ut7r` (`apps/web`) | SOLL=IST: Vercel liefert; Indexierung aus (Freigabe offen) | M · 15.11. 09:19 |
| `nexifyai.cloud`, `www` | Cloudflare (seit 13.05.), CNAME → Vercel, nur DNS | 200, `server: Vercel`, `noindex,nofollow` | Vercel-Projekt `…-ut7r` | SOLL=IST | N · 14.11. 22:19; Gegenprüfung K · 15.11. 10:06 |
| `nexifyai.de/api/shop/*` | wie oben | **503** `database_binding_missing_or_unsuitable` | Shop-Dienst auf Vercel, ohne DB-Bindung | SOLL: funktionierender Shop. IST: tot | M · 15.11. 09:19 |
| `teileklar.shop`, `www` | Cloudflare (seit 31.08.), A 72.62.152.47 · Proxy (A-Eintrag: N) | 200 (Startseite), Katalog 200 | **srv1243952**, alter Shop-Dienst | IST (Fall A): alter Stand liefert | Status M · 15.11. 09:19; DNS N |
| `unternehmensbot.eu`, `www`, `home` | Hostinger (`dns-parking.com`), A 72.62.152.47 | 302 → `/login`; `/health` 200 `status: ok` | **srv1243952**, Agenten-Oberfläche „NeX Agentic AI“ | SOLL (D-019 F4): nicht öffentlich. IST: öffentlich erreichbar | M · 15.11. 09:19 |
| `brain.nexifyai.cloud` | Cloudflare, Tunnel `nexifyai-duesseldorf` → srv1941843:443 | `/` 404; `/mcp` 401 (Traefik Basic) | srv1941843, Traefik; Cognee-API-Container fehlt | SOLL: Brain/Cognee-MCP erreichbar. IST: nur Traefik, kein Cognee | M · 15.11. 09:19; S |
| `agenten.nexifyai.cloud`, `librechat.…` | Cloudflare, Tunnel **`nexifyai-contabo`** (ohne Verbindung) | **530** | kein Server verbunden | IST: tot seit 09.11. 10:40 | M · 15.11. 09:57; N |
| `teileklar.de/.store/.pro`, `ainexi2fyi.*` | Hostinger | 200 Parkseite | Hostinger-Parkseite | IST: geparkt | N · 14.11. 22:19 |
| `nexify-automate.com` | Cloudflare | 301 → `www.nexifyai.cloud` | Weiterleitung | IST: Weiterleitung | N · 14.11. 22:19 |

**Server (Quelle N/S):**

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | 72.62.152.47 | 179.198.195.91 |
| System | Ubuntu 26.04, KVM 8 (8 Kerne, 32 GB, 400 GiB) | Ubuntu 24.04, KVM 8 |
| Platte | 86 % belegt (Hostinger-Metrik, S) | **97 % belegt, 10,2 GB frei** (S, gemessen 14.11. 12:00–12:50) |
| Container laut API | **nicht lesbar (`[VPS:2044]`, N/S)** | 20 Compose-Projekte mit Containern (S) |
| Tunnel von hier | `nexifyai-agentur-cloudflare-tunnel` (aktiv seit 26.10., N) | `nexifyai-duesseldorf` (aktiv seit 09.11. 09:33, N) |
| Firewall | `nexifyai-minimal-20260713`, synchron, unverändert seit 13.09. | dieselbe Gruppe |

Firewall-Gruppe (beide, unverändert seit 13.09.2026 10:57 UTC): TCP 22, 80, 443, 2222;
UDP 443, 51820, 51821; Quelle jeweils beliebig (S, N). **SSH (22 und 2222) für jede
Quelle offen und 15 SSH-Schlüssel im Hostinger-Konto** (darunter `ignore-this`,
`temp-check`) — beides OA-020 (S).

Compose-Projekte srv1941843 (S): `cherry-dashboard`, `cognee-x532`,
`convex-selfhosted`, `crit-web-deploy`, `deploy`, `deploy-staging`, `docker-hermes`,
`dsh-enterprise`, `extern` (SearXNG), `gitlab`, `gowa`, `librechat`, `monitoring-dus`,
`myadmin-shell`, `nexify-lokal`, `stack` (`9router`, LightRAG), `traefik-juib`, `wiki`;
ohne Container: `dify-dqiq`, `headroom-qsx8`; zehn beendete Mess-Projekte
`nx-messung*-20261114`.

**Lösungs- und Zugangsregister:** `config/loesungsregister.json` führt 58 Lösungen und
48 Zugänge (R; `tools/check_loesungsregister.py` Exit 0, 15.11. 09:57 UTC). Die
Dokumentations­korrekturen aus der Netz-Inventur (E7) sind dort noch nicht nachgeführt:
`hermes-webui`, `hostinger-srv1243952`, `cloudflare-dns` (neun Zonen statt zwei) — L18.

---

## 3. Lagebild Produkte und Dienste

### 3.1 Shop (Fall A — belegt)

- **`teileklar.shop` (alter Dienst auf srv1243952):** `/api/shop/products?limit=1` → 200,
  Antwort nur `items`, `total`; **`total` = 3720** (M, 15.11. 09:19 UTC). `/api/shop/status`
  und `/api/shop/categories` → 404 (M, 09:19 UTC); `/api/shop/products/{id}` → 404
  (Gegenprüfung K, 15.11. 10:07 UTC). Der Dienst kennt drei der vier Katalog-Routen von
  `main` nicht (`apps/shop-api/shop/catalog_api.py`) und läuft mit einem älteren Stand; die
  Datenbank dahinter antwortet (BELEGT; welcher Container ausliefert ist OFFEN, srv1243952
  nicht einsehbar).
- **Vercel-Fassung (`nexifyai.de/api/shop/*`):** `/products` und `/status` → **503**
  `runtime_binding_unavailable` / `database_binding_missing_or_unsuitable` (M, 15.11.
  09:19 UTC). Die Routen sind vorhanden (Antwort aus dem Dienst, nicht 404), liefern aber
  keine Daten: `MONGODB_URI` fehlt im Projekt `…-ut7r`; der Produktionswert im alten
  Projekt ist als „Sensitive“ gespeichert und nicht auslesbar (P). Zielbild nach D-013 ist
  die eigene Supabase-Instanz (PostgreSQL mit RLS); Adresse und Zugang sind im Repository
  nicht belegt (Konflikt `DATA-STORE-001`, OFFEN).
- **Einordnung:** Ein Umschalten des DNS auf Vercel würde heute den funktionierenden
  Katalog (200) durch 503 ersetzen (N, Abschnitt 10.3). Das DNS von `teileklar.shop` wurde
  zuletzt am 15.09.2026 geändert, in den letzten 14 Tagen nicht (N). OFFEN (Inhaber):
  welcher Dienst `teileklar.shop` künftig ausliefert (N, Abschnitt 10.4) — L22.

### 3.2 Werkstattservice und Termine

Entwurf, nicht eingebunden. Terminlogik als Spezifikation (PR 187) und Terminbuchung
(PR 195, abnahmefähig als Entwurf laut K) liegen vor; der Anfrageweg der Formulare läuft
über `POST /api/requests` an den Shop-Dienst und wird am 503-Gate abgewiesen —
gespeichert und versendet wird nichts; das Formular meldet die Abweisung ehrlich und
übergibt per `mailto` (PR 181, R; `anfrageweg-befund-2026-11-14.md`). OFFEN (Inhaber):
eigener Empfänger in `apps/web` oder Bindung des Shop-Dienstes (OA-163) — L14.

### 3.3 Cognee / Brain

`brain.nexifyai.cloud/mcp` → 401 hinter Traefik-Basisschutz (M, 15.11. 09:19 UTC). Der
**Cognee-API-Container fehlt**; die Wissensdaten liegen als Docker-Volumes
`cognee-x532_cognee-data` und `cognee-x532_cognee-system` (zusammen 2,69 GB) auf
srv1941843 und werden von Docker nur deshalb als „ungenutzt“ geführt, weil der Container
fehlt. **Sperrvermerk:** kein `docker volume prune`, kein `docker system prune --volumes`,
kein `docker image prune -a`, bis die Cognee-Volumes gesichert und wieder verknüpft sind
(S, `aufraeumplan-2026-11-14.md` Abschnitt 3.1). PR 197 (Cognee) ist abnahmefähig als
Entwurf (K) — L1/L16.

### 3.4 Hermes (Arbeitsbereich)

Hermes läuft als Container `hermes` im Projekt `docker-hermes` auf **srv1941843** (S,
D-019 IST). Zusätzlich liefert **srv1243952** hinter `unternehmensbot.eu` eine laufende
Agenten-Oberfläche „NeX Agentic AI — Anmelden“; `/health` → 200 mit `status: ok`,
`sessions: 1`, `uptime_seconds ≈ 216174` (M, 15.11. 09:19 UTC) — rund 2,5 Tage Laufzeit,
Start also um den 12.11. (BELEGT, dass dort ein Dienst läuft; welcher Container, ist
OFFEN). Befund S3/S4: der MCP-Server `rea` startet nicht (`libatomic.so.1` fehlt im
Image), kein Nachrichtenkanal aktiv, wiederholt Speicherdruck (S). Hermes hat das
Monorepo nur lesend; Rückfrage vor Befehlen eingeschaltet; Docker-Socket noch im
Container (Risiko, D-019 Folge 5). Ein echter Modellaufruf ist nicht belegt (kein
Schlüssel). PR 193 (Hermes) ist abnahmefähig als Entwurf (K) — L3/L16.

### 3.5 Mailing / Resend

`nexifyai.de` bei Resend **verified** (Quelle K, gemessen durch die koordinierende Sitzung
15.11. 09:56 UTC): DKIM (TXT `resend._domainkey`), SPF MX `send`, SPF TXT `send`, CNAME
`rsend → send.forge.rmta.net` — alle verified; Sending enabled, Receiving disabled,
Tracking aus. **Öffentlich belegt ist nur die DNS-Wirkung:** `resend._domainkey` TXT
vorhanden (M, 15.11. 09:57 UTC). Am 14.11. 20:09 UTC stand die Domain noch auf „failed“;
drei Einträge am 14.11. 22:03 UTC, der vierte (`rsend`) am 15.11. ~09:25 UTC bei
Cloudflare angelegt (K). `nexifyai.cloud` bei Resend verified (K). Kein Versand erfolgt;
Einwilligungen 0 (`mailversand-zustand-2026-11-14.md`, OA-001/OA-049). Kundendomains des
Projekts SK siehe Abschnitt 6a (nicht hier geführt).

---

## 4. Belegte Störungen der letzten Tage

| # | Störung | Zeitraum (UTC) | Quelle | Stand / Rückweg |
|---|---|---|---|---|
| B1 | `nexifyai.de` von Hostinger-NS auf Cloudflare umgezogen (größte Änderung der 14 Tage) | 13.11. 21:50–21:53 | N | Rückweg: NS bei Hostinger zurück auf `dns-parking.com`; abgehängte Hostinger-Zone als Rückweg behalten (E5) |
| B2 | Zielwechsel der Website `nexifyai.de` viermal (Vercel → srv1243952 → Vercel …) | 13.11. 09:34 – 14.11. 05:36 | N, S | seit 14.11. 05:36 Vercel 200; bestätigt M 15.11. 09:19 |
| B3 | **Clerk-Verlust:** fünf Einträge fehlten öffentlich (NXDOMAIN) | 13.11. 21:53 – 15.11. ~09:25 | N; M (09:19 NXDOMAIN) | **BEHOBEN:** neu angelegt (nur DNS, Quelle K); Gegenprobe M 09:57 UTC: alle fünf lösen auf |
| B4 | **DKIM-Proxy:** drei `hostingermail-*._domainkey.nexifyai.de` als CNAME mit Proxy → DKIM nicht prüfbar | 13.11. 21:53 – 15.11. ~09:25 | N; M | **BEHOBEN:** auf „nur DNS“ gestellt (Quelle K); Gegenprobe M 09:57 UTC: lösen als CNAME auf Hostinger-DKIM auf |
| B5 | `unternehmensbot.eu` vom Hostinger-Webhosting über CDN auf srv1243952 umgestellt | 01.11. 11:14, 08.11. 09:50 | N, S | Rückweg: Hostinger-Schnappschüsse 193231342, 195196695 |
| B6 | **Toter Tunnel `nexifyai-contabo`:** `agenten`, `librechat` → 530 | seit 09.11. 10:40 | N; **M 09:57 UTC weiter 530** | OFFEN. Rückweg: wieder verbinden oder auf `nexifyai-duesseldorf` umhängen (Zuordnung dort schon vorhanden, E4) — L4 |
| B7 | Tunnel-Zuordnungen am 09.11. neu geschrieben, `gitlab` auf srv1941843 umgehängt | 09.11. 09:30–09:33 | N | — |
| B8 | Tote Adressen in `nexifyai.cloud`: `demo`/`den` 502, `space` 526, `pad`/`work2work` Zeitüberschreitung, `agentmemory-api` 503 | gemessen 14.11. 22:19 | N | OFFEN; aufräumen erst nach Zonenexport (E6) |

**Clerk in der Produktion (M, 15.11. 09:19 UTC, BELEGT):** Die Produktion `nexifyai.de`
nennt in ihrer CSP-Kopfzeile inzwischen `https://clerk.nexifyai.de`
(script-src/connect-src) — anders als am 14.11. (N: keine Clerk-Adresse im HTML). Die
zugehörigen DNS-Namen waren um 09:19 UTC noch NXDOMAIN und sind seit ~09:25 UTC wieder
vorhanden (B3). Ob Clerk damit scharf geschaltet ist, ist OFFEN (kein Anmeldeversuch);
sobald es eingeschaltet wird, müssen die Einträge stehen — das ist jetzt der Fall.

An den Servern selbst wurde über Hostinger nichts verstellt: in 14 Tagen kein Neustart,
keine Firewall-Aktion, nur Sicherungen, ein Snapshot und zwei Ressourcen-Anpassungen an
srv1941843 (N, Kurzfassung Punkt 8). **Welche Störung der Inhaber bemerkt hat, ist nicht
belegt** (OFFEN); B1–B6 sind die belegten Kandidaten.

---

## 5. Pakete und Pull Requests

Stand laut Auftrag der koordinierenden Sitzung und `PROGRESS.md` (P/K). GitHub Actions
startet keine Jobs (Ausgabenlimit), deshalb vor `main` kein automatisches Gate; der Merge
freigegebener PRs ist laut K durch Zweigschutz blockiert (`mergeable_state: blocked`,
nicht öffentlich nachprüfbar). Köpfe wie von der koordinierenden Sitzung übergeben (K).

| PR | Kopf | Inhalt | Prüfstand | Reife | Was fehlt / Freigabe |
|---|---|---|---|---|---|
| 186 | `53b8adb` (geändert 15.11. 09:38) | Einwilligungsweg Mailing, hinter `NEXIFY_MAILING_CONSENT` (Standard aus) | zweimal geprüft — **deckt diesen Kopf nicht nachweislich ab** (Kopf heute geändert) | Entwurf | Merge laut K freigegeben, durch Zweigschutz blockiert |
| 195 | `b75428c` | Terminbuchung (Werkstatt) | geprüft (K) | Entwurf, abnahmefähig | Merge laut K freigegeben, blockiert |
| 197 | `2915bc2` | Cognee | geprüft (K) | Entwurf, abnahmefähig | Merge laut K freigegeben, blockiert; Cognee-API-Container fehlt (Serverzugriff) |
| 193 | `f5b6955` | Hermes (Arbeitsbereich) | geprüft (K) | Entwurf, abnahmefähig | Merge laut K freigegeben, blockiert; Modellschlüssel + Docker-Socket (Inhaber/Serverzugriff) |
| 190 | — | Suite-Funktionsliste | — | Entwurf | Sichtung/Abnahme |
| 189 | — | Unabhängige Prüfung von PR 118 (Google-Anmeldung) | — | Entwurf | Sichtung |
| 192 | — | `/intern/workspace` schließen | — | Entwurf | Sichtung |
| 200 | `2fa1480` | Netz-Inventur (Quelle N dieses Dokuments) | — | Entwurf | Sichtung/Merge |
| 201 | `a2ce474` | Zielkunden | — | Entwurf | Sichtung |
| 202 | `10eba3e` | Markenzeichen / Library | — | Entwurf | Sichtung |
| 203 | `555a75a` | **dieses Dokument** (Master-Audit) | Doc-only | Entwurf | Sichtung |
| 184 | `1c43325` | Cloudflare-Umzug (Vorbereitung) | — | kein Entwurf, **Auto-Merge aus** (Stand 14.11. 21:47 UTC, P), nicht gemergt | Kostenweg A/B/C (Inhaber, D-021) |
| 196 | — | Konto-Verknüpfung im Shop-Dienst | zweimal geprüft | **gemergt** `d4f2032` (14.11. 21:26) | Reste OA-171 bis OA-174 |
| 198 | — | robots-Meta, Ausfallkarten, Belege | geprüft | **gemergt** `48f5072` (14.11. 21:45) | Reste OA-175 bis OA-178 |

Zahl offener PRs: **31 am Vorabend** (14.11. 21:47 UTC, P); **heute mindestens 34**
(15.11., Quelle K). Auto-Merge bei vielen eingeschaltet (OA-027). Codex-Review startet
nicht (Kontingent erschöpft, OA-146). Fünf verwaiste Vercel-Projekte melden Baufehler
(OA-023). Laut Mail vom 14.11. 01:37 UTC ist eine Vercel-Zahlung über 300,05 $
fehlgeschlagen (nur Inhaber).

**Inhaberfreigabe vom 15.11. (Quelle K, OFFEN im Repository):** Der Inhaber hat am 15.11.
per Auswahl „Rückholbare DNS-Reparaturen“ und „Reife, zweifach geprüfte PRs mergen“
freigegeben. Das steht noch **nicht** in `DECISIONS.md`; **Nachtrag in `DECISIONS.md`
durch die koordinierende Sitzung offen** (von dieser Audit-Sitzung nicht geändert).

---

## 6. Lückenplan — das große Saubermachen

Priorisiert nach Wirkung × Aufwand × Risiko. Owner-Typ: **I** = nur Inhaberentscheidung,
**SZ** = Serverzugriff (Shell/Freigabe nach D-016), **AA** = Agentenarbeit. Je Punkt
Owner, nächster Schritt, Fälligkeit (CLAUDE.md).

### Priorität 0 — heute, vor Ablauf des Snapshots

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L0 | Hostinger-Snapshot beider Server läuft **heute 11:47 UTC** ab | **I** | Entscheiden, ob der Snapshot verlängert/neu angelegt wird, bevor serverseitig etwas angefasst wird; sonst gelten nur die täglichen Sicherungen als Rückweg | **15.11. 11:47 UTC** |

### Priorität 1 — Sicherheits-, Daten- und Betriebsrisiko

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L1 | Cognee-Volumes ungesichert, API-Container fehlt; Prune-Sperre aktiv | **SZ** | Shell auf srv1941843: Volumes sichern, Cognee-Container wieder verknüpfen, dann Sperre aufheben (Aufräumplan Phase 0/3) | sofort, Serverzugriff nötig |
| L2 | srv1941843 zu 97 % voll (10,2 GB frei); 77,3 GiB Paperclip-Läufe (abgelöst) | **SZ** | Shell: `.paperclip-runtime/runs` sichten und nach Freigabe kürzen; GitLab-Prometheus begrenzen (S, Folgen 2a/2b) | sofort, Serverzugriff nötig |
| L3 | Hermes-/Agenten-Oberfläche öffentlich erreichbar; Docker-Socket im Container | **I** | **OFFEN:** `unternehmensbot.eu` zeigt auf **srv1243952** (N, W1); die Router `hermes-webui/-api` liegen auf **srv1941843** und werden über diesen Namen **nicht** erreicht — ein Schutz der srv1941843-Router schließt die öffentliche Oberfläche also **nicht**. Erst klären, was auf srv1243952 antwortet (E3), dann je Server schützen. D-019 F4 „nicht öffentlich“ als OFFEN führen (E3, OA-015) | Inhaberentscheidung |
| L4 | Toter Tunnel `nexifyai-contabo` → `agenten`, `librechat` 530 | **I/SZ** | wieder verbinden oder auf `nexifyai-duesseldorf` umhängen (E4) | kurzfristig |
| L5 | srv1243952 nicht einsehbar (trägt 57 von 126 Adressen) | **I** | Shell oder freigegebener nur-lesender Mess-Weg (E8) — **nur der Inhaber** | Inhaberentscheidung |
| L6 | Cloudflare-Token mit DNS-Schreibrecht sichten (Zertifikatsdienst + neuer Token 14.11. 18:42) | **I** | Token-Liste und globalen Schlüssel prüfen, auf engste Zone begrenzen (E9) — **nur der Inhaber** | kurzfristig |
| L7 | GitHub Actions ohne Budget → kein Gate, Merges blockiert | **I** | Actions-Budget/Abrechnung freigeben (OA-022) — **nur der Inhaber**. **Warnung:** danach gehen PRs mit eingeschaltetem Auto-Merge ohne weitere Abnahme nach `main` (OA-027); vorher Auto-Merge dort prüfen | Inhaberentscheidung |
| L8 | SSH für jede Quelle offen; 15 Schlüssel im Konto | **I** | auf feste Quellen/WireGuard begrenzen; Schlüssel aussortieren (OA-020) — **nur der Inhaber** | kurzfristig |

### Priorität 2 — Verkaufsfähiger Auftritt

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L9 | Indexierung aus (`noindex,nofollow`); Rechtsform/Impressum offen | **I** | `NEXIFY_INDEXING=enabled` in Vercel (nach Impressum-Freigabe, OA-031/OA-009) — **nur der Inhaber** | Inhaberentscheidung |
| L10 | Vercel-Zahlung fehlgeschlagen (300,05 $) | **I** | Zahlung/Abrechnung klären — **nur der Inhaber** | dringend |
| L11 | Verwaiste Vercel-Projekte melden Baufehler | **I** | Projekte trennen/löschen (OA-023) — **nur der Inhaber** | kurzfristig |
| L12 | Cloudflare-Hosting-Umzug: Kostenweg unklar (lokal 46–56 ms > 10 ms Free-Tarif) | **I** | Kostenweg A/B/C wählen; Messung auf `workers.dev` (Token mit Worker-Recht), D-021 — **nur der Inhaber** | Inhaberentscheidung |

### Priorität 3 — Kundenwege, Leads, Umsatz

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L13 | Shop-Vercel ohne DB-Bindung (503); `MONGODB_URI` fehlt | **I/AA** | `MONGODB_URI` im Projekt `…-ut7r` setzen (Inhaber, D-017) **oder** Supabase-Migration nach D-013 bauen (AA) | kurzfristig |
| L14 | Anfrageweg erreicht nur per `mailto`, kein eigener Empfänger | **I/AA** | eigener Empfänger in `apps/web` oder Shop-Dienst binden (OA-163) | kurzfristig |
| L15 | Mailing: 0 Einwilligungen, Rechtsgrundlage je Gruppe offen | **I** | Einwilligungsweg (PR 186) mergen + Rechtsgrundlage je Gruppe (OA-001) — **nur der Inhaber** | Inhaberentscheidung |
| L16 | Abnahmefähige Entwürfe 186/193/195/197 nicht gemergt | **I** | nach L7 mergen; Freigabe laut K liegt vor, Zweigschutz blockiert. Kopf von PR 186 heute geändert → vor Merge erneut prüfen | nach L7 |

### Priorität 4 — Kundenprojekte abnahmefähig

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L17 | Kundenprojekt SK: offene Inhaberentscheidungen (Einzelheiten nur im Kundenrepository) | **I** | im Kundenrepository/eigener Sitzung führen (Abschnitt 6a) — **nur der Inhaber** | Inhaberentscheidung |

### Priorität 5 — Betrieb und Skalierung

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L18 | Dokumentation vs. Messung (W1–W13): `hermes-webui`, `hostinger-srv1243952`, `cloudflare-dns` falsch im Lösungsregister | **AA** | eigener additiver PR der koord. Sitzung; Quelle = Netz-Inventur (E7) | kurzfristig |
| L19 | Supabase-Zielinstanz (D-013) ohne belegte Adresse/Zugang; kein Shop-Schema/RLS/Backup | **I/AA** | Instanz benennen, Schema+RLS bauen, Migrationsplan (`DATA-STORE-001`) | mittelfristig |
| L20 | Kein Regelbetrieb ohne offene Sitzung (Scheduler feuert in die Sitzung) | **I/AA** | verifiziert laufender externer Hostinger-Scheduler statt Chat-Regel | mittelfristig |
| L21 | Managed-LLM-Aufrufe ohne belegten Schlüssel (9router/Hermes) | **I** | OpenRouter-Schlüssel mit Ausgabenlimit eintragen — **nur der Inhaber** | Inhaberentscheidung |
| L22 | Entscheidung „welcher Dienst liefert `teileklar.shop` künftig“ (alter srv1243952-Dienst vs. Vercel/Supabase) | **I** | nach L13 entscheiden; bis dahin alten Dienst stehen lassen (N, 10.4) | Inhaberentscheidung |
| L23 | Zugriffsschutz `ssh.nexifyai.cloud` ungeprüft (200 ohne Access-Anmeldung) | **I** | im Cloudflare-Dashboard prüfen, ob eine Access-Anwendung davor liegt (E10) | kurzfristig |
| L24 | `autoconfig`/`autodiscover.nexifyai.de` hinter Proxy; automatische Mail-Einrichtung ungeprüft | **I/AA** | auf „nur DNS“ stellen und nachmessen (E2) | kurzfristig |

### 6a. Kundenprojekt SK (nur Verweis)

Ein der Orchestrierung am 15.11.2026 neu übertragenes Kundenprojekt (Kürzel SK, wie in
der Netz-Inventur) wird in eigener Sitzung und eigenem Repository bearbeitet. **Kundendaten,
Kundendomains, PR-Nummern, Zweignamen und Einzelheiten gehören nicht in dieses Repository**
(AGENTS.md, Skill `nexify-kundenprojekt`, D-017); hier steht nur dieser Verweis. Es gilt
zusätzlich D-020 (bestehendes Kundenmaterial einbinden, nur das Hero-Bild neu erzeugen,
keine neuen Videos). Offene Inhaberentscheidungen und der Grafik-/Veredelungsstand werden
in der Kundensitzung geführt.

---

## 7. Blinde Flecken — was nicht gemessen werden konnte

- **srv1243952** ist von innen nicht einsehbar (Hostinger-API `[VPS:2044]`, Docker Manager
  dort nicht verfügbar). Er trägt den größeren Teil der öffentlichen Adressen
  (`teileklar.shop`, `unternehmensbot.eu`, 18 A-Einträge und 34 Tunnel-Namen in
  `nexifyai.cloud`). Welche Container, Ports, Routen und Images dort laufen, bleibt OFFEN
  (E8, L5).
- Welcher Container `teileklar.shop` ausliefert und woraus er gebaut ist — OFFEN.
- Welches Modell und welche Route Hermes nutzt, und ob je ein echter Modellaufruf erfolgte
  — OFFEN (kein Schlüssel belegt).
- Vercel-, Cloudflare- und Resend-Konto wurden in dieser Sitzung **nicht** über die
  jeweiligen MCP-Werkzeuge abgefragt (eine Resend/MCP-Abfrage hing an einer
  Berechtigungsabfrage und wurde ohne Entscheidung abgebrochen; danach wurden keine
  bestätigungspflichtigen Werkzeuge mehr aufgerufen). Die Resend-Werte und die Angaben zu
  Merge-Freigabe und `mergeable_state` stammen von der koordinierenden Sitzung (Quelle K)
  und sind, außer bei der genannten DNS-Gegenprobe, nicht öffentlich nachgeprüft.
- Welche Störung der Inhaber tatsächlich bemerkt hat (Adresse, Zeit, Fehlerbild) — OFFEN.
- Erreichbarkeit aus anderen Netzen; gemessen wurde nur aus der Sitzungsumgebung.
- Zustellung an `mail@nexifyai.cloud` und ob Mail-Zustellprobleme real auftraten — OFFEN.

---

*Ende. Quellen: eigene Live-Messungen 15.11.2026 09:19 und 09:57 UTC (M); Übergabe der
koordinierenden Sitzung (K); `docs/04-betrieb/netz-inventur-2026-11-14.md` (N, PR 200);
`server-befund-2026-11-14.md` und `aufraeumplan-2026-11-14.md` (S); `PROGRESS.md`,
`DECISIONS.md`, `config/loesungsregister.json`, `offene-arbeiten-2026-11-14.md` (R, P).
Führend für die Aufgabenverwaltung bleibt `PROGRESS.md`.*
