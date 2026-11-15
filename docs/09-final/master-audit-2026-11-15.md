# Master-Audit · NeXify AI Gesamtlage · 15.11.2026

**Fortgeschrieben 15.11.2026, 12:40 UTC** (Erststand `555a75a`/`aa515be`, dann zwei
Fortschreibungen am Ende des Dokuments — „Stand 11:10 UTC" und „Stand 12:25 UTC" —, danach
Korrekturen einer unabhängigen Gegenprüfung um 12:40 UTC; was sich gegenüber dem Erststand
geändert hat, steht in der Änderungstabelle direkt unter der Kurzfassung).

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

> **Rückwege (BELEGT, N/K):** Der Hostinger-Snapshot beider Server (angelegt 14.11.
> 11:47 UTC) **ist am 15.11.2026, 11:47 UTC abgelaufen**. Als Rückwege bleiben die
> automatischen Hostinger-Sicherungen **ohne Ablaufdatum** (zuletzt srv1941843 14.11.
> 16:14 UTC, srv1243952 14.11. 18:41 UTC; K, 10:34 UTC) und die benannten Schnappschüsse
> einzelner DNS-Zonen. Vor jedem Server-Eingriff zuerst klären, welcher Rückweg gilt und
> ob vorher ein neuer Snapshot gezogen wird (Inhaberentscheidung, D-016; Neustart-Fenster
> siehe V7).

## Messwege und Quellen

| Kürzel | Weg | Zeit (UTC) |
|---|---|---|
| M | Eigene Live-Messung dieser Sitzung: je ein `GET` über den Sitzungs-Proxy auf die genannte Adresse; DNS über `dns.google/resolve` | 15.11.2026, 09:19, 09:57, 11:07 und 12:26–12:27 |
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
   antworten mit 200 von Vercel. **Indexierung inzwischen freigegeben und ausgeliefert
   (Fortschreibung Nr. 1):** `nexifyai.de/`, `/leistungen`, `/impressum` und
   `www.nexifyai.cloud/` tragen `index, follow` ohne `x-robots-tag`; `/teileklar` bleibt
   `noindex, nofollow` (eigene Messung M, 15.11. 11:07 UTC). Der Erststand 09:19/10:06 UTC
   nannte hier noch `noindex, nofollow`.
2. Der Shop ist gespalten (Fall A): `teileklar.shop` liefert einen **alten** Dienst auf
   srv1243952 mit **3720 Produkten** (200), kennt aber `/status`, `/categories` und
   `/products/{id}` nicht (404). Die neue Vercel-Fassung unter `nexifyai.de/api/shop/*`
   antwortete um 09:19 UTC noch mit **503**, liefert aber **seit ~11:52 UTC 200** mit
   `products:0` (DB-Bindung jetzt da, Katalog leer; M, 12:26 UTC; Fortschreibung 12:25
   Nr. 3). Der Zahlungsmodus war zuvor ungebunden (`payment_mode_unbound`, auf `/health`,
   N/M).
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
9. srv1941843 war am 14.11. zu **97 % voll** (10,2 GiB frei; größter Posten 77,3 GiB
   Paperclip-Läufe, nach D-019 abgelöst, S); am 15.11. **sinkt** die Belegung durch das
   Archivskript des Inhabers auf **~95 %** (19,8 GiB frei, 12:19 UTC, K). srv1243952 ist
   zu **~96 %** belegt und sinkt ebenfalls (K; Fortschreibungen Nr. 3 bzw. 1/2).
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

### Was sich seit dem Erststand (`555a75a`/`aa515be`) geändert hat

| Kurzfassungs-Punkt | Erststand (09:19–10:08 UTC) | Fortschreibung (Stand 11:10 UTC) |
|---|---|---|
| 1 Indexierung | `noindex, nofollow` auf allen vier Hauptseiten | **freigegeben:** Hauptseiten `index, follow`, nur `/teileklar` weiter gesperrt (M 11:07) |
| 9 Platte srv1941843/… | nur srv1941843 mit 97 % genannt | **srv1243952 jetzt mit 96 % belegt** (Inhaber-Konsole; „86 %" überholt), rund 300 GB außerhalb der Docker-Zählung, Ursache offen (Fortschr. Nr. 3) |
| 10 Actions/Auto-Merge | Auto-Merge bei vielen PRs an | **Auto-Merge-Abschaltung für 34 von 36 PRs aufgerufen; nur 23 erfolgreich (Nicht-Entwürfe), 11 Fehler (Entwürfe)** (K, nicht zurückgelesen); Actions weiter ohne Budget (Fortschr. Nr. 7) |
| L0 Snapshot | Snapshot-Ablauf als einziger Rückweg hervorgehoben | zusätzlich **automatische Sicherungen ohne Ablaufdatum** belegt (Fortschr. Nr. 2) |
| L12 Cloudflare-Hosting | Kostenweg A/B/C offen | **Inhaber: kein Umzug jetzt** (Fortschr. Nr. 8) |
| L20 Regelbetrieb | „kein Regelbetrieb ohne offene Sitzung" | **serverseitige Zeitpläne laufen** (zwei Trigger), eigener Dauerdienst fehlt weiter (Fortschr. Nr. 9) |
| 2 Shop-Vercel | 503 `database_binding_missing_or_unsuitable` | **seit ~11:52 UTC 200** mit `products:0` (M 12:26; Stand 12:25 Nr. 3) |
| L0 Snapshot | läuft heute 11:47 UTC ab | **um 11:47 UTC abgelaufen**; automatische Sicherungen ohne Ablaufdatum bleiben (Stand 12:25) |
| V5 R2 (Cloudflare) | Vorbehalt „< 5 USD" | **Inhaber hat R2 freigegeben, Vorbehalt entfällt**; R2 aktiv, 1 Bucket (K 12:35) |
| Speicher beide Server | 97 % / „86 %" | **sinkt**: srv1941843 ~95 % (12:19), srv1243952 ~96 % und fallend (K; Stand 12:25 Nr. 1/2) |

Einzelheiten und Belege: die Abschnitte „Fortschreibung … Stand 11:10 UTC" und „Stand
12:25 UTC" am Ende.

---

## 2. Lagebild Infrastruktur

| Domain / Adresse | Nameserver, DNS-Ziel | Antwort (https) | Server / Dienst | Soll / Ist | Quelle · UTC |
|---|---|---|---|---|---|
| `nexifyai.de`, `www` | Cloudflare (seit 13.11. 21:53), CNAME → Vercel, nur DNS | 200, `server: Vercel`, **`index, follow`** (seit 11:01 UTC) | Vercel-Projekt `…-ut7r` (`apps/web`) | SOLL=IST: Vercel liefert; Indexierung **an** (seit 11:01) | M · 15.11. 09:19/11:07 |
| `nexifyai.cloud`, `www` | Cloudflare (seit 13.05.), CNAME → Vercel, nur DNS | 200, `server: Vercel`; `www.cloud` `index, follow` (11:07) | Vercel-Projekt `…-ut7r` | SOLL=IST | N · 14.11. 22:19; M · 15.11. 11:07 |
| `nexifyai.de/api/shop/*` | wie oben | 09:19 UTC **503**; **seit ~11:52 UTC 200** mit `products:0` | Shop-Dienst auf Vercel, DB-Bindung jetzt da, Katalog leer | SOLL: funktionierender Shop. IST: erreichbar, leer | M · 15.11. 09:19/12:26 |
| `teileklar.shop`, `www` | Cloudflare (seit 31.08.), A `72.62.x.x` · Proxy (A-Eintrag: N) | 200 (Startseite), Katalog 200 (`total` 3720) | **srv1243952**, alter Shop-Dienst | IST (Fall A): alter Stand liefert | Status M · 15.11. 12:26; DNS N |
| `unternehmensbot.eu`, `www`, `home` | Hostinger (`dns-parking.com`), A `72.62.x.x` | 302 → `/login`; `/health` 200 `status: ok` | **srv1243952**, Agenten-Oberfläche „NeX Agentic AI“ | SOLL (D-019 F4): nicht öffentlich. IST: öffentlich erreichbar | M · 15.11. 09:19 |
| `brain.nexifyai.cloud` | Cloudflare, Tunnel `nexifyai-duesseldorf` → srv1941843:443 | `/` 404; `/mcp` 401 (Traefik Basic) | srv1941843, Traefik; Cognee-API-Container fehlt | SOLL: Brain/Cognee-MCP erreichbar. IST: nur Traefik, kein Cognee | M · 15.11. 09:19; S |
| `agenten.nexifyai.cloud`, `librechat.…` | Cloudflare, Tunnel **`nexifyai-contabo`** (ohne Verbindung) | **530** | kein Server verbunden | IST: tot seit 09.11. 10:40 | M · 15.11. 09:57; N |
| `teileklar.de/.store/.pro`, `ainexi2fyi.*` | Hostinger | 200 Parkseite | Hostinger-Parkseite | IST: geparkt | N · 14.11. 22:19 |
| `nexify-automate.com` | Cloudflare | 301 → `www.nexifyai.cloud` | Weiterleitung | IST: Weiterleitung | N · 14.11. 22:19 |

**Server (Quelle N/S):**

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | `72.62.x.x` (gekürzt) | `179.198.x.x` (gekürzt) |
| System | Ubuntu 26.04, KVM 8 (8 Kerne, 32 GB, 400 GiB) | Ubuntu 24.04, KVM 8 |
| Platte | 14.11.: „86 %" (S); 15.11. **~96 % und fallend** (K, Stand 12:25 Nr. 3) | 14.11.: **97 %, 10,2 GiB frei** (S); 15.11. **~95 %** (19,8 GiB frei, 12:19, K) |
| Container laut API | **nicht lesbar (`[VPS:2044]`, N/S)** | 20 Compose-Projekte mit Containern (S) |
| Tunnel von hier | `nexifyai-agentur-cloudflare-tunnel` (aktiv seit 26.10., N) | `nexifyai-duesseldorf` (aktiv seit 09.11. 09:33, N) |
| Firewall | `nexifyai-minimal-20260713`, synchron, unverändert seit 13.09. | dieselbe Gruppe |

Firewall-Gruppe (beide, unverändert seit 13.09.2026 10:57 UTC): die üblichen Web- und
SSH-Ports offen für beliebige Quelle (Einzelheiten im Server-Befund, S/N). **SSH für jede
Quelle offen und 15 SSH-Schlüssel im Hostinger-Konto** (Namen und Ports nur im
Server-Befund, nicht hier) — beides OA-020 (S).

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
- **Vercel-Fassung (`nexifyai.de/api/shop/*`):** um 09:19 UTC noch **503**
  (`runtime_binding_unavailable` / `database_binding_missing_or_unsuitable`); **seit ~11:52
  UTC 200** mit `products:0`, `last_import_at:null`, `source:BigBuy` (M, 12:26 UTC). Die
  DB-Bindung ist also inzwischen vorhanden, der Katalog aber leer (Import gesperrt, V1).
  Zielbild nach D-013 bleibt die eigene Supabase-Instanz (PostgreSQL mit RLS); Adresse und
  Zugang sind im Repository nicht belegt (Konflikt `DATA-STORE-001`, OFFEN).
- **Einordnung (Stand 12:26 UTC):** Ein Umschalten des DNS von `teileklar.shop` auf Vercel
  würde heute den funktionierenden Katalog (200, `total` 3720) durch den **leeren**
  Vercel-Katalog ersetzen — Vercel liefert seit ~11:52 UTC 200 mit `products:0` (M 12:26),
  nicht mehr 503 (so die historische Einordnung in N, Abschnitt 10.3). Das belegte
  Hindernis ist also jetzt der leere Katalog, nicht mehr der 503. Das DNS von
  `teileklar.shop` wurde zuletzt am 15.09.2026 geändert, in den letzten 14 Tagen nicht (N).
  OFFEN (Inhaber): welcher Dienst `teileklar.shop` künftig ausliefert (N, Abschnitt 10.4) —
  L22; Umschaltbedingungen V2.

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
| B1 | `nexifyai.de` von Hostinger-NS auf Cloudflare umgezogen (größte Änderung der 14 Tage) | 13.11. 21:50–21:53 | N | Rückweg: NS bei Hostinger zurück auf `dns-parking.com` — **aber zuerst Zielrecords prüfen/angleichen:** die abgehängte Hostinger-Zone führt die Hauptadresse noch auf srv1243952 (N, E5); ein bloßer NS-Rückwechsel würde die heute funktionierende Vercel-Seite wieder auf den uneinsehbaren Server umleiten. Zone als Rückweg behalten (E5) |
| B2 | Zielwechsel der Website `nexifyai.de` viermal (Vercel → srv1243952 → Vercel …) | 13.11. 09:34 – 14.11. 05:36 | N, S | seit 14.11. 05:36 Vercel 200; bestätigt M 15.11. 09:19 |
| B3 | **Clerk-Verlust:** fünf Einträge fehlten öffentlich (NXDOMAIN) | 13.11. 21:53 – 15.11. ~09:25 | N; M (09:19 NXDOMAIN) | **BEHOBEN:** neu angelegt (nur DNS, Quelle K); Gegenprobe M 09:57 UTC: alle fünf lösen auf |
| B4 | **DKIM-Proxy:** drei `hostingermail-*._domainkey.nexifyai.de` als CNAME mit Proxy → DKIM nicht prüfbar | 13.11. 21:53 – 15.11. ~09:25 | N; M | **BEHOBEN:** auf „nur DNS“ gestellt (Quelle K); Gegenprobe M 09:57 UTC: lösen als CNAME auf Hostinger-DKIM auf |
| B5 | `unternehmensbot.eu` vom Hostinger-Webhosting über CDN auf srv1243952 umgestellt | 01.11. 11:14, 08.11. 09:50 | N, S | Rückweg: die in der Netz-Inventur benannten Hostinger-Schnappschüsse (Nummern dort) |
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

**Keine zweite Wahrheit (nexify-stand-halten):** Dieser Lückenplan ist eine *Befund- und
Vorschlagsliste* der Audit-Sitzung, **kein** Aufgabenregister. Führend für Aufgaben, Owner
und Termine bleiben `PROGRESS.md` und die Arbeitsliste `offene-arbeiten-2026-11-14.md`
(OA-…); die L-Nummern und Fälligkeiten hier sind Zieltermine/Empfehlungen und werden erst
verbindlich, wenn der zuständige Writer sie als OA-Einträge in das führende Register
übernimmt. Wo diese Liste vom führenden Register abweicht, gilt das Register. Reine
Inhaberentscheidungen tragen „Inhaber (offen)“, weil ihr Termin nicht von einer
Agentensitzung gesetzt werden kann.

### Priorität 0 — Snapshot heute 11:47 UTC abgelaufen

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L0 | Hostinger-Snapshot beider Server **am 15.11. 11:47 UTC abgelaufen** | **I** | Rückweg sind jetzt die automatischen Sicherungen ohne Ablaufdatum; vor dem nächsten Server-Eingriff neuen Snapshot ziehen (Neustart-Fenster V7 04:30–05:00 UTC) | abgelaufen; vor nächstem Eingriff |

### Priorität 1 — Sicherheits-, Daten- und Betriebsrisiko

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L1 | Cognee-Volumes ungesichert, API-Container fehlt; Prune-Sperre aktiv | **SZ** | Shell auf srv1941843: Volumes sichern, Cognee-Container wieder verknüpfen, dann Sperre aufheben (Aufräumplan Phase 0/3) | bis 16.11. (Serverzugriff) |
| L2 | srv1941843 am 14.11. 97 % (10,2 GiB frei); am 15.11. ~95 % und fallend durch das Archivskript des Inhabers (19,8 GiB frei, 12:19, K); 77,3 GiB Paperclip-Läufe (abgelöst) werden archiviert | **SZ** | Archivlauf fertigstellen und Ergebnis prüfen; GitLab-Prometheus auf 30 Tage (V6) | 15.11. (Archivskript läuft) |
| L3 | Hermes-/Agenten-Oberfläche öffentlich erreichbar; Docker-Socket im Container | **I** | **OFFEN:** `unternehmensbot.eu` zeigt auf **srv1243952** (N, W1); die Router `hermes-webui/-api` liegen auf **srv1941843** und werden über diesen Namen **nicht** erreicht — ein Schutz der srv1941843-Router schließt die öffentliche Oberfläche also **nicht**. Erst klären, was auf srv1243952 antwortet (E3), dann je Server schützen. D-019 F4 „nicht öffentlich“ als OFFEN führen (E3, OA-015) | Inhaber (offen) |
| L4 | Toter Tunnel `nexifyai-contabo` → `agenten`, `librechat` 530 | **I/SZ** | wieder verbinden oder auf `nexifyai-duesseldorf` umhängen (E4) | bis 17.11. |
| L5 | srv1243952 nicht einsehbar (trägt 57 von 126 Adressen) | **I** | Shell oder freigegebener nur-lesender Mess-Weg (E8) — **nur der Inhaber** | Inhaber (offen) |
| L6 | Cloudflare-Token mit DNS-Schreibrecht sichten (Zertifikatsdienst + neuer Token 14.11. 18:42) | **I** | Token-Liste und globalen Schlüssel prüfen, auf engste Zone begrenzen (E9) — **nur der Inhaber** | Inhaber (offen) |
| L7 | GitHub Actions ohne Budget → kein Gate, Merges blockiert | **I** | Actions-Budget/Abrechnung freigeben (OA-022) — **nur der Inhaber**. **Warnung:** danach gehen PRs mit eingeschaltetem Auto-Merge ohne weitere Abnahme nach `main` (OA-027). Fortschr. Nr. 7: `disable_pr_auto_merge` für 34 von 36 PRs aufgerufen, davon nur 23 erfolgreich (Nicht-Entwürfe), 11 Fehler (Entwürfe) (K, nicht zurückgelesen) — der belegte Schutz gilt nur für diese 23; vor der Budget-Freigabe in der Oberfläche prüfen | Inhaber (offen) |
| L8 | SSH für jede Quelle offen; 15 Schlüssel im Konto | **I** | auf feste Quellen/WireGuard begrenzen; Schlüssel aussortieren (OA-020) — **nur der Inhaber** | Inhaber (offen) |

### Priorität 2 — Verkaufsfähiger Auftritt

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L9 | **Teilweise erledigt** (Fortschr. Nr. 1): `NEXIFY_INDEXING=enabled` gesetzt, Hauptseiten `index, follow` (M 11:07). Offen: Rechtsform/Impressum (live „Eenmanszaak", im Code anderswo „B.V."; Register KvK 90483944 genannt, Auszug nicht belegt — L27) und Hauptdomain (`.de` ist nach V12 kanonisch, `.cloud` dennoch indexierbar) | **I** | Rechtsform widerspruchsfrei klären (OA-009, L27); Canonical auf `.de` durchsetzen (OA-031, V12) — **nur der Inhaber** | Inhaber (offen) |
| L10 | Vercel-Zahlung fehlgeschlagen (300,05 $) | **I** | Zahlung/Abrechnung klären — **nur der Inhaber** | 15.11. (Inhaber, dringend) |
| L11 | Verwaiste Vercel-Projekte melden Baufehler | **I** | Projekte trennen/löschen (OA-023) — **nur der Inhaber** | Inhaber (offen) |
| L12 | Cloudflare-Hosting-Umzug | **I** | **Inhaberentscheidung 15.11.: kein Umzug jetzt** (V8/Fortschr. Nr. 8, Quelle K); Vercel bleibt. Noch nicht in `DECISIONS.md` nachgetragen | entschieden (kein Umzug) |

### Priorität 3 — Kundenwege, Leads, Umsatz

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L13 | Shop-Vercel: DB-Bindung inzwischen vorhanden — `/api/shop/status` **200** mit `products:0`, `last_import_at:null` (M 12:26 UTC), vorher 503; Katalog noch leer (Import gesperrt) | **I/AA** | Katalog nach V1 erstbefüllen (Vertragsnachweis, Mindestzahl, Stichprobe); Supabase-Migration (D-013) liegt vorbereitet und ausgeschaltet auf eigenem Zweig (Stand 12:25, Nr. 6) | bis 18.11. |
| L14 | Anfrageweg erreicht nur per `mailto`, kein eigener Empfänger | **I/AA** | eigener Empfänger in `apps/web` oder Shop-Dienst binden (OA-163) | bis 18.11. |
| L15 | Mailing: 0 Einwilligungen, Rechtsgrundlage je Gruppe offen | **I** | Einwilligungsweg (PR 186) mergen + Rechtsgrundlage je Gruppe (OA-001) — **nur der Inhaber** | Inhaber (offen) |
| L16 | Abnahmefähige Entwürfe 186/193/195/197 nicht gemergt | **I** | nach L7 mergen (V11); Freigabe laut K liegt vor, Zweigschutz blockiert. Kopf von PR 186 heute geändert → vor Merge erneut prüfen | nach L7 (Actions grün) |

### Priorität 4 — Kundenprojekte abnahmefähig

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L17 | Kundenprojekt SK: offene Inhaberentscheidungen (Einzelheiten nur im Kundenrepository) | **I** | im Kundenrepository/eigener Sitzung führen (Abschnitt 6a) — **nur der Inhaber** | Inhaber (offen) |

### Priorität 5 — Betrieb und Skalierung

| # | Lücke | Owner | Nächster Schritt | Fälligkeit |
|---|---|---|---|---|
| L18 | Dokumentation vs. Messung (W1–W13): `hermes-webui`, `hostinger-srv1243952`, `cloudflare-dns` falsch im Lösungsregister | **AA** | eigener additiver PR der koord. Sitzung; Quelle = Netz-Inventur (E7) | bis 18.11. |
| L19 | Supabase-Zielinstanz (D-013) ohne belegte Adresse/Zugang; kein Shop-Schema/RLS/Backup | **I/AA** | Instanz benennen, Schema+RLS bauen, Migrationsplan (`DATA-STORE-001`) | bis 22.11. |
| L20 | Regelbetrieb: serverseitige Zeitpläne laufen, aber kein eigener Dauerdienst auf eigener Infrastruktur | **I/AA** | Fortschr. Nr. 9: zwei Trigger laufen („Audit-Herzschlag" 2-stündlich, „Regelbetrieb Hauptsitzung" 6×/Tag); der frühere sitzungsunabhängige Regelbetrieb ist seit 14.11. 10:51 UTC aus. Offen: ein von einer offenen Sitzung unabhängiger Dauerdienst | bis 22.11. |
| L21 | Managed-LLM-Aufrufe ohne belegten Schlüssel (9router/Hermes) | **I** | OpenRouter-Schlüssel mit Ausgabenlimit eintragen (V10, Deckel 5 USD/Tag) — **nur der Inhaber** | Inhaber (offen) |
| L22 | Entscheidung „welcher Dienst liefert `teileklar.shop` künftig“ (alter srv1243952-Dienst vs. Vercel/Supabase) | **I** | nach L13 entscheiden; bis dahin alten Dienst stehen lassen (N, 10.4; V2/V4) | nach L13 (Inhaber) |
| L23 | Zugriffsschutz `ssh.nexifyai.cloud` ungeprüft (200 ohne Access-Anmeldung) | **I** | im Cloudflare-Dashboard prüfen, ob eine Access-Anwendung davor liegt (E10) | bis 18.11. (Inhaber) |
| L24 | `autoconfig`/`autodiscover.nexifyai.de` hinter Proxy; automatische Mail-Einrichtung ungeprüft | **I/AA** | auf „nur DNS“ stellen und nachmessen (E2) | bis 18.11. |
| L25 | **Backend-/DB-Zuordnung des alten Shops ungeklärt** (kein Widerspruch): der ausliefernde Dienst/Weiterleiter (`shop-tls`?) sitzt laut Messung auf srv1243952, die Mongo-DB vermutet der Migrationsbericht auf srv1941843 — ein Weiterleiter auf dem einen Server kann eine DB auf dem anderen nutzen; beide ohne Einblick belegt | **I/AA** | auf einsehbarem Server Weiterleitungsziel und DB-Bindung feststellen (hängt an L5) | nach L5 |
| L26 | **DeepSeek-Delegation** (`claude/deepseek-arbeiter`): Router `ai-router.nexifyai.cloud` bietet laut Zweig keinen datierten Modellstand, der Adapter verlangt die Endung „1017“ (`config/llm-policy.json`); kein Schlüssel hinterlegt | **I/AA** | Modellstand am Router datiert belegen; Schlüssel mit Deckel 5 USD/Tag eintragen (V10, L21) | bis 18.11. |
| L27 | **Rechtsform OFFEN**: live „Eenmanszaak", im Code „B.V."; Register KvK 90483944 genannt, **Registerauszug nicht belegt** | **I** | Registerauszug beiziehen, Impressum/Code widerspruchsfrei machen (OA-009) — **nur der Inhaber** | Inhaber (offen) |
| L28 | **Aussortier-Sitzung hat bisher 0 GiB selbst entfernt** (nur das Inhaber-Archivskript wirkt); **Port 8090 ungeklärt** (alter Shop-Dienst auf srv1941843 laut Tunnel-Zuordnung, ohne veröffentlichten Port) | **SZ** | Klasse A/B einzeln nach Freigabe entfernen; 8090 auf dem einsehbaren Server klären | bis 18.11. (Serverzugriff) |
| L29 | Ein **Transport-PR eines Kundenprojekts** (SK) ist Rohmaterial, auf Entwurf gestellt — **nicht mergen** (Einzelheiten nur im Kundenrepository, D-017) | **I** | in der Kundensitzung behandeln; nicht nach `main` eines Agenturrepos bringen | Inhaber (offen) |

### 6a. Kundenprojekt SK (nur Verweis)

Ein der Orchestrierung am 15.11.2026 neu übertragenes Kundenprojekt (Kürzel SK, wie in
der Netz-Inventur) wird in eigener Sitzung und eigenem Repository bearbeitet. **Kundendaten,
Kundendomains, PR-Nummern, Zweignamen und Einzelheiten gehören nicht in dieses Repository**
(AGENTS.md, Skill `nexify-kundenprojekt`, D-017); hier steht nur dieser Verweis. Es gilt
zusätzlich D-020 (bestehendes Kundenmaterial einbinden, nur das Hero-Bild neu erzeugen,
keine neuen Videos). Offene Inhaberentscheidungen und der Grafik-/Veredelungsstand werden
in der Kundensitzung geführt.

---

## Fortschreibung 15.11.2026, Stand 11:10 UTC

Neue belegte Befunde der koordinierenden Sitzung vom 15.11.2026, 10:34–11:10 UTC. Quelle
**K** = Mitteilung der koordinierenden Sitzung (nicht öffentlich nachprüfbar, außer wo
eine eigene Nachmessung **M** genannt ist). Keine Kundeneinzelheiten.

1. **Indexierung freigegeben (BELEGT).** Der Inhaber hat die Sperre aufheben lassen;
   `NEXIFY_INDEXING=enabled` ist in der Vercel-Produktion gesetzt und ausgeliefert. Eigene
   Nachmessung (M, 11:07 UTC): `nexifyai.de/`, `/leistungen`, `/impressum` und
   `www.nexifyai.cloud/` → `index, follow`, kein `x-robots-tag`; `/teileklar` → weiterhin
   `noindex, nofollow` (zweiter Schalter bewusst aus, Shop 503); Sitemap 28 Adressen, keine
   `/teileklar`. L9 damit teilweise erledigt. Offen (M 11:07): Impressum nennt live
   „Eenmanszaak", im Code steht anderswo „B.V." → Rechtsform nicht widerspruchsfrei; sowie
   die Hauptdomain-Frage (`.de` und `.cloud` beide indexierbar).
2. **Sicherungen (K, 10:34 UTC).** Je Server ein Snapshot vom 14.11. 11:47 UTC, Ablauf
   heute 11:47 UTC; **zusätzlich automatische Sicherungen ohne Ablaufdatum**, zuletzt
   srv1941843 14.11. 16:14 UTC, srv1243952 14.11. 18:41 UTC. Der Snapshot-Ablauf (L0) ist
   damit nicht der einzige Rückweg.
3. **Speicher srv1243952 (K, Inhaber-Konsole 11:04 UTC).** 387 G groß, 368 G belegt,
   16 G frei (**96 %**); Docker zählt nur ~62 GB (Images 53,71 GB, davon 8,42 GB
   freigebbar; Volumes 7,43 GB; Container 0,65 GB; Build-Cache 0) — **rund 300 GB liegen
   außerhalb der Docker-Zählung, Ursache offen**. Hostinger-Metrik 385,0 GB (08:15) →
   394,3 GB (10:46). Swap 87–88 %, 11 Zombie-Prozesse, Neustart ausstehend, 100
   Aktualisierungen offen. Die frühere Angabe „86 %" (Abschnitt 2) ist überholt.
   **Einheiten:** Konsolen- und Hostinger-Metrikwerte sind GB (10⁹ B), die `df`-Werte der
   Fortschreibung 12:25 sind GiB (2³⁰ B); sie stehen hier bewusst nebeneinander, weil sie
   aus verschiedenen Quellen stammen (1 GiB ≈ 1,074 GB).
4. **Speicher srv1941843 (K).** Hostinger-Metrik 402,7 GB (09:15) → 408,9 GB (10:15) →
   408,5 GB (10:46). Build-Cache/hängende Images brachten 0 GB (noch in Gebrauch).
   Inhaberentscheidung: Altläufe verlustfrei archivieren (Archiv → Prüfung → Original
   entfernen), läuft bei der Speicher-Sitzung; Cognee-Volumes nur lesend sichern, kein
   Prune (deckt sich mit L1/L2 und dem Sperrvermerk).
5. **Shop-Dienst (K).** Auf srv1243952 nennt die Inhaber-Konsole nur einen Container mit
   Shop-Bezug, `shop-tls` (vermutlich ein Weiterleiter); **wo Shop-Dienst und Datenbank
   tatsächlich laufen, bleibt OFFEN**. Entscheidung: Zielbild Vercel-Fassung, der alte
   Dienst bleibt Rückweg; parallel wird der Umzug der Datenschicht auf Supabase/Postgres
   (D-013) als Paket vorbereitet (Entwurf, ausgeschaltet). Betrifft L13/L22.
6. **Tunnel (K, Cloudflare-Schnittstelle 10:58 UTC).** Vier Tunnel im Konto: einer
   `healthy` mit Ursprung srv1243952; einer `healthy` mit Ursprung srv1941843 (seit 09.11.
   09:33 UTC); **`nexifyai-contabo` `down`** ohne Verbindung (deckt sich mit B6/L4, M 09:57
   UTC → `agenten`/`librechat` 530); ein vierter `healthy` für das Kundenprojekt mit
   Ursprung auf einem dritten, hier nicht einsehbaren Kundenserver.
7. **Auto-Merge (K).** `disable_pr_auto_merge` wurde für 34 von 36 offenen PRs aufgerufen
   (alle außer 193 und 197): 23 Erfolge (alle Nicht-Entwürfe), 11 Fehler (alle Entwürfe).
   **Nicht zurückgelesen** — das Feld ist mit den verfügbaren Werkzeugen nicht lesbar; vor
   einer Budget-Freigabe in der Oberfläche prüfen (L7). Offene PRs jetzt: **36** (23 kein
   Entwurf, 13 Entwurf).
8. **Inhaberentscheidungen 15.11. (K, noch nicht in `DECISIONS.md`).** KI-Kennzeichnung
   immer, in allen Projekten, im Footer; Design-Sperre in `make check` verdrahten (läuft
   auf PR 202); Preise als „ab"-Preise in Textentwürfen, Referenzen nur anonym; **kein
   Cloudflare-Hosting-Umzug jetzt** (L12); kein zweiter Zeitplan neben dem Regelbetrieb;
   allgemeine Regel: ein Auftrag gilt zugleich als Freigabe der dafür nötigen Schritte,
   wobei die Dauergrenzen (keine Zahlungen, nichts ohne Archiv löschen, keine Geheimnisse
   im Klartext, keine Sicherheitslockerung) bestehen bleiben. **OFFEN:** Nachtrag in
   `DECISIONS.md` durch die koordinierende Sitzung (von dieser Audit-Sitzung nicht geändert).
9. **Zeitpläne (K, `list_triggers` 10:33 UTC).** „Audit-Herzschlag" alle 2 Stunden,
   letzter Lauf 10:31 UTC erfolgreich; „NeXify Regelbetrieb in der Hauptsitzung" sechsmal
   täglich, letzter Lauf 06:47 UTC erfolgreich; ein früherer sitzungsunabhängiger
   Regelbetrieb ist seit 14.11. 10:51 UTC abgeschaltet. L20 entsprechend präzisiert:
   serverseitige Zeitpläne laufen, ein eigener Dauerdienst auf eigener Infrastruktur fehlt.
10. **Neue Arbeitszweige (K, alle Entwurf, ausgeschaltet):** `claude/prozess-automatisierung`,
    `claude/shop-supabase-migration`, `claude/speicher-bereinigung`,
    `claude/seiteninhalte-erweiterung`.

---

## Fortschreibung 15.11.2026, Stand 12:25 UTC

Weitere Befunde der koordinierenden Sitzung (Quelle **K**, Hostinger-Metrik bzw. HTTP ohne
Anmeldung) und eigene Nachmessungen (**M**, 12:26–12:27 UTC). Unbelegtes als OFFEN.

1. **Speicher srv1941843 sinkt (K, Hostinger-Metrik):** 11:47 UTC 380,4 GiB belegt →
   12:15 UTC 363,3 GiB. Ursache: Archivskript für Paperclip-Altläufe, vom Inhaber ~11:55
   UTC gestartet (`/root/archiv-paperclip.sh`, archiviert → prüft → entfernt Original).
   Fortschritt im Server-Log nicht gelesen → **OFFEN**. Betrifft **L2** (Platte
   srv1941843); **L1** (Cognee-Sicherung) bleibt davon unberührt.
2. **Speicher srv1243952 sinkt (K, Hostinger-Metrik):** 11:15 UTC 367,3 GiB → 11:50 UTC
   339,8 GiB, 12:19 UTC unverändert 339,8. **Ursache OFFEN** (Angabe der koordinierenden
   Sitzung: keine der beteiligten Sitzungen hat dort Schreibzugriff; Server bleibt der
   blinde Fleck, L5).
3. **Shop (M, 12:26–12:27 UTC):** `nexifyai.de/api/shop/status` → **200** mit
   `products:0`, `last_import_at:null`, `source:BigBuy` (vorher 503 — die DB-Bindung ist
   jetzt da, der Katalog aber leer). `teileklar.shop/api/shop/products` → 200, `total`
   weiterhin **3720** (alter Katalog liefert). Live-Startseite `nexifyai.de/` → 200,
   Deployment `dpl_CXVZrjQ4…` (ID gekürzt). **Herkunft des Deployments:** `git log
   origin/main` zeigt in den letzten 3 h **keinen neuen Commit**; `origin/main` steht
   unverändert auf `9c9c806` (14.11. 22:54 CET). **Belegt** ist daraus nur: das
   Live-Deployment ist **kein neuer `main`-Commit**. Dass es ein Redeploy oder Env-Wechsel
   desselben Stands ist, ist **ANNAHME**; der genaue Auslöser (Env-Variable gesetzt /
   manueller Redeploy) ist ohne Vercel-Zugang **OFFEN** (M, R).
4. **Indexierung (M, bestätigt 11:07; K: live seit 11:01 UTC):** Agenturseiten `/`,
   `/leistungen`, `/impressum` `index, follow`; `/teileklar` weiter `noindex` (siehe
   Fortschreibung 11:10 Nr. 1, L9).
5. **Inhaberentscheidungen vom 15.11. (Quelle K, ~12:15 UTC, Vollmacht des Inhabers; Status
   je „entschieden, nicht ausgeführt").** Eigenes Präfix **V**, um Verwechslung mit den
   „E…"-Nummern der Netz-Inventur zu vermeiden. **In `DECISIONS.md` auf `main` steht dazu
   noch kein Eintrag → OFFEN, Nachtrag durch die koordinierende Sitzung.**

   | Nr. | Entscheidung |
   |---|---|
   | V1 | Katalog übernehmen bei angeschalteter Importsperre |
   | V2 | `teileklar.shop` erst umschalten bei ≥ 3720 Produkten + Live-Zahlung + Testbestellung |
   | V3 | Shop-Indexierung erst danach |
   | V4 | alten Shop 14 Tage später anhalten |
   | V5 | **R2 ausdrücklich freigegeben** („wenn erweitert werden muss, erweitern, ohne zu fragen"); der frühere Vorbehalt „< 5 USD/Monat" **entfällt**. Gemessen 12:35 UTC (K): R2 im Konto aktiv, 1 Bucket |
   | V6 | GitLab-Prometheus auf 30 Tage |
   | V7 | Neustart je Server 04:30–05:00 UTC, vorher Snapshot |
   | V8 | kein Cloudflare-Hosting-Umzug jetzt (L12) |
   | V9 | unbenutzte Images älter 30 Tage entfernen |
   | V10 | DeepSeek über 9Router, Deckel 5 USD/Tag, aus bis Schlüssel hinterlegt (L21/L26) |
   | V11 | kein neuer Zeitplan |
   | V12 | `nexifyai.de` kanonisch |
   | V13 | PRs 197, 193, 186, 195 mergen, sobald Actions grün (L16) |
   | V14 | Rechtsform nach Handelsregister KvK 90483944 (Auszug nicht belegt, L27) |

   Die Dauergrenzen bleiben: keine Zahlungen, nichts ohne Archiv löschen, keine Geheimnisse
   im Klartext, keine Sicherheitslockerung.
6. **Neue Arbeitszweige (Berichte gelesen, R; alle Entwurf/ausgeschaltet):**

   | Zweig (Kopf) | Ziel | Status | Nächster Schritt / beim Inhaber |
   |---|---|---|---|
   | `claude/rechtstexte-de-nl` (`0fcc5b1`) | Belegtes EU-Rechts-Quellenregister als Grundlage der Rechtstexte (NL-Unternehmen, B2B-Agentur + B2C/B2B-Shop) | WIP; Primärquellen am 15.11. abgerufen (DSGVO, SCC 2021/914, DPF 2023/1795 u. a.); keine Rechtsberatung; nationales Umsetzungsrecht offen | Rechtstexte auf dieser Basis überarbeiten; **Inhaber:** Freigabe der Rechtstexte (D-017), anwaltliche Prüfung, Rechtsform KvK 90483944 (L27) |
   | `claude/shop-eigene-domain` (`33f3cb0`) | TEILEKLAR auf eigener Domain, hinter Schalter `NEXIFY_SHOP_HOST` (Standard AUS) | Code + Tests (`apps/web/auth/shop-host.ts`, `shop-host.test.mjs`), ausgeschaltet | Nach Shop-Live Schalter setzen; **Inhaber:** Domainwahl/Umschaltung (V2) |
   | `claude/server-aussortieren` (`dc6f6a1`, 12:23) | Kandidatenliste + Löschprotokoll beide Server nach 30-Tage-Regel (V9) | WIP vor Ausführung; srv1941843 durch Inhaber-Archivskript von 99 % (2 GiB frei, 11:40) auf 95 % (19,8 GiB frei, 12:19); **Sitzung selbst hat 0 GiB entfernt**; Klasse B klein (~5 GiB), Cognee gesperrt | Klasse A/B einzeln nach Freigabe entfernen; Port 8090 klären (L28); **Inhaber/Serverzugriff** je Schritt (D-016) |
   | `claude/shop-supabase-migration` (`740d31d`) | Shop-Datenschicht MongoDB → Supabase/PostgreSQL (D-013) | Vorbereitet, getestet, ausgeschaltet (Schalter `SHOP_STORE_BACKEND=mongodb`); Zielschema + RLS lokal einspielbar | Zwingend fehlt: belegter Supabase-Zugang; Import + Vercel-Bindung sprechen noch MongoDB; kein Lauf gegen echtes Mongo/Supabase; Backend-/DB-Zuordnung der alten Mongo-DB ungeklärt (L25). **Inhaber:** Supabase-Instanz/Zugang, Umschaltfreigabe |
   | `claude/deepseek-arbeiter` (`c96f1d0`, erster Push 12:28) | DeepSeek-Delegation über 9Router (V10) | Zweig vorhanden; Router `ai-router.nexifyai.cloud` ohne datierten Modellstand, Adapter verlangt Endung „1017"; **kein Schlüssel hinterlegt** | Modellstand datiert belegen; Schlüssel mit Deckel 5 USD/Tag (L26); **Inhaber** |

   Noch ohne Push und daher **OFFEN** (kein Zweigstand lesbar): `claude/chat-standard-offen`.

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

*Ende. Quellen: eigene Live-Messungen 15.11.2026 09:19, 09:57, 11:07 und 12:26–12:27 UTC (M); Übergabe der
koordinierenden Sitzung (K); `docs/04-betrieb/netz-inventur-2026-11-14.md` (N, PR 200);
`server-befund-2026-11-14.md` und `aufraeumplan-2026-11-14.md` (S); `PROGRESS.md`,
`DECISIONS.md`, `config/loesungsregister.json`, `offene-arbeiten-2026-11-14.md` (R, P).
Führend für die Aufgabenverwaltung bleibt `PROGRESS.md`.*
