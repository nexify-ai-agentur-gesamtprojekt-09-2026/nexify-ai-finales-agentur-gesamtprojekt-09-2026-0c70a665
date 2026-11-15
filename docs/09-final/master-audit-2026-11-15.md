# Master-Audit · NeXify AI Gesamtlage · 15.11.2026

Ein konsolidiertes, belegtes Lagebild der gesamten NeXify-Infrastruktur und der
Projektstände, erstellt von der Audit-Sitzung `session_01HyncR7aMx6EmTYbwkvC3Z6` im
Auftrag der koordinierenden Sitzung `session_01HyncR5WyGFuRr9RrQ7w46i` für den Inhaber
Pascal Courbois. **Nur gelesen.** Gegen alle Systeme ausschließlich `GET`/`HEAD`, keine
Anmeldeversuche, keine Schreibaufrufe; an Servern, Containern, DNS, Konten und Secrets
wurde nichts geändert. Geschrieben wurde nur dieses eine Dokument.

Dieses Dokument **ersetzt kein Register.** Führend bleibt `PROGRESS.md` (Aufgaben,
P01–P26, MASTER-01 bis MASTER-18 in `config/acceptance-coverage.json`) mit der
Arbeitsliste `docs/09-final/offene-arbeiten-2026-11-14.md` (OA-001 bis OA-178). Dieses
Dokument verweist darauf und verdichtet die Lage; wo es von der Arbeitsliste abweicht,
gilt die Arbeitsliste für die Aufgabenführung. Jede Aussage trägt eine Quelle und ist
als **BELEGT**, **ANNAHME** oder **OFFEN** gekennzeichnet.

## Messwege und Quellen

| Kürzel | Weg | Zeit (UTC) |
|---|---|---|
| M | Eigene Live-Messung dieser Sitzung: je ein `GET` über den Sitzungs-Proxy auf die genannte Adresse; DNS über `dns.google/resolve` | 15.11.2026, 09:19 und 09:57 |
| K | Daten, die die koordinierende Sitzung dieser Sitzung übergeben hat (Resend-Konto, von ihr am 15.11. 09:56 UTC gelesen; von ihr am 15.11. ~09:25 UTC bei Cloudflare ausgeführte, inhaberfreigegebene Änderungen) | 15.11.2026 |
| N | `docs/04-betrieb/netz-inventur-2026-11-14.md` (Zweig `claude/netz-inventur`, nur gelesen), Erhebung 14.11. 22:16–22:40 UTC | 14.11.2026 |
| S | `docs/04-betrieb/server-befund-2026-11-14.md`, Erhebung über Hostinger-API 14.11. ~11:45–18:45 UTC | 14.11.2026 |
| R | Repository am Commit `9c9c806` (`main`, Stand dieser Sitzung): `PROGRESS.md`, `DECISIONS.md`, `config/loesungsregister.json`, `docs/09-final/offene-arbeiten-2026-11-14.md`, `docs/04-betrieb/aufraeumplan-2026-11-14.md` u. a. | 15.11.2026 |
| P | PR-Stände laut Auftrag der koordinierenden Sitzung und `PROGRESS.md` (Abschnitte 20:40 und 22:00 UTC) | 14.–15.11.2026 |

Grenzen: Die Live-Abrufe (M) laufen über den Netz-Proxy der Sitzung. Belastbar sind
Statuscode, Kopfzeilen, Titel und Antwortrumpf, nicht die Erreichbarkeit einzelner Ports
und nicht die Erreichbarkeit aus anderen Netzen. **srv1243952 ist von innen nicht
einsehbar** (Hostinger-API `[VPS:2044]`); dieser Server bleibt der blinde Fleck
(Abschnitt 7).

---

## 1. Kurzfassung

1. Die öffentlichen NeXify-Seiten stehen: `nexifyai.de`, `www.nexifyai.de`,
   `nexifyai.cloud`, `www.nexifyai.cloud` antworten mit 200 von Vercel und tragen
   `noindex, nofollow` (M, 15.11. 09:19 UTC); Indexierung bleibt eine Inhaberfreigabe.
2. Der Shop ist gespalten (Fall A): `teileklar.shop` liefert einen **alten** Dienst auf
   srv1243952 mit **3720 Produkten** (200), kennt aber `/status` und `/categories` nicht
   (404); die neue Vercel-Fassung unter `nexifyai.de/api/shop/*` antwortet mit **503**,
   weil Datenbank- und Zahlungsbindung fehlen (M, 09:19 UTC).
3. Die größte Netzänderung der letzten Tage ist der Umzug von `nexifyai.de` auf
   Cloudflare am 13.11. 21:53 UTC; dabei gingen fünf Clerk-Einträge und die prüfbare
   DKIM-Signatur des Postfachs verloren (N).
4. **Diese beiden Netzschäden sind seit dem 15.11. ~09:25 UTC behoben:** die
   koordinierende Sitzung hat die fünf Clerk-CNAMEs neu angelegt und die drei
   Hostinger-DKIM-CNAMEs auf „nur DNS“ gestellt (K); eigene Nachmessung über
   öffentliches DNS bestätigt das (M, 09:57 UTC).
5. Offen bleibt der **tote Tunnel `nexifyai-contabo`** (seit 09.11. 10:40 UTC ohne
   Verbindung): `agenten.nexifyai.cloud` und `librechat.nexifyai.cloud` antworten weiter
   mit 530 (M, 09:57 UTC).
6. Resend führt `nexifyai.de` seit dem 15.11. als **verified** (DKIM, SPF, MX alle
   verified); die Domain stand am 14.11. 20:09 UTC noch auf „failed“ (K).
7. `unternehmensbot.eu` zeigt direkt auf srv1243952 und liefert dort eine laufende
   Agenten-Oberfläche; `/health` antwortet mit 200 und `status: ok` (M, 09:19 UTC) —
   die Oberfläche ist ohne Cloudflare davor öffentlich erreichbar (Widerspruch zu D-019
   Folge 4).
8. Der Cognee-/Brain-Zugang `brain.nexifyai.cloud/mcp` antwortet mit 401 hinter
   Traefik-Basisschutz (M, 09:19 UTC); der Cognee-API-Container fehlt, die Daten
   (2,69 GB) liegen als Docker-Volumes und dürfen nicht geprunt werden (S, Aufräumplan).
9. srv1941843 ist zu **97 % voll** (10,2 GB frei); größter Posten 77,3 GiB
   Paperclip-Laufverzeichnisse, die nach D-019 abgelöst sind (S).
10. GitHub Actions startet kontoweit **keine Jobs** (Ausgabenlimit); dadurch gehen
    freigegebene PRs trotz Inhaberfreigabe nicht durch (Zweigschutz blockiert), und es
    gibt kein automatisches Gate vor `main` (P, `PROGRESS.md`).
11. Abnahmefähige Entwürfe liegen vor (Einwilligungsweg 186, Terminbuchung 195,
    Cognee 197, Hermes 193); ihr Merge ist vom Inhaber freigegeben, aber durch
    Zweigschutz blockiert (P).
12. Das Kundenprojekt **Studienkolleg Aachen** ist dieser Orchestrierung neu übertragen
    (Abschnitt 6a); Kundendaten bleiben im Kundenrepository.

---

## 2. Lagebild Infrastruktur

Domain → Nameserver/Ziel → was antwortet → Server/Dienst → Soll/Ist. Statuscode aus
einem `GET` auf die Hauptadresse. Quelle und Zeit je Zeile.

| Domain / Adresse | Nameserver, DNS-Ziel | Antwort (https) | Server / Dienst | Soll / Ist | Quelle · UTC |
|---|---|---|---|---|---|
| `nexifyai.de`, `www` | Cloudflare (seit 13.11. 21:53), CNAME → Vercel, nur DNS | 200, `server: Vercel`, `noindex,nofollow` | Vercel-Projekt `…-ut7r` (`apps/web`) | SOLL=IST: Vercel liefert; Indexierung aus (Freigabe offen) | M · 15.11. 09:19 |
| `nexifyai.cloud`, `www` | Cloudflare (seit 13.05.), CNAME → Vercel, nur DNS | 200, `server: Vercel` | Vercel-Projekt `…-ut7r` | SOLL=IST | N · 14.11. 22:19 |
| `nexifyai.de/api/shop/*` | wie oben | **503** `runtime_binding_unavailable` / `database_binding_missing_or_unsuitable` | Shop-Dienst auf Vercel, ohne DB-Bindung | SOLL: funktionierender Shop. IST: tot | M · 15.11. 09:19 |
| `teileklar.shop`, `www` | Cloudflare (seit 31.08.), A 72.62.152.47 · Proxy | 200 (Startseite), Katalog 200 | **srv1243952**, alter Shop-Dienst | IST (Fall A): alter Stand liefert | M · 15.11. 09:19 |
| `unternehmensbot.eu`, `www`, `home` | Hostinger (`dns-parking.com`), A 72.62.152.47 | 302 → `/login`; `/health` 200 `status: ok` | **srv1243952**, Agenten-Oberfläche „NeX Agentic AI“ | SOLL (D-019 F4): nicht öffentlich. IST: öffentlich erreichbar | M · 15.11. 09:19 |
| `brain.nexifyai.cloud` | Cloudflare, Tunnel `nexifyai-duesseldorf` → srv1941843:443 | `/` 404; `/mcp` 401 (Traefik Basic) | srv1941843, Traefik; Cognee-API-Container fehlt | SOLL: Brain/Cognee-MCP erreichbar. IST: nur Traefik, kein Cognee | M · 15.11. 09:19; S |
| `agenten.nexifyai.cloud`, `librechat.…` | Cloudflare, Tunnel **`nexifyai-contabo`** (ohne Verbindung) | **530** | kein Server verbunden | IST: tot seit 09.11. 10:40 UTC | M · 15.11. 09:57; N |
| `teileklar.de/.store/.pro`, `ainexi2fyi.*` | Hostinger | 200 Parkseite | Hostinger-Parkseite | IST: geparkt | N · 14.11. 22:19 |
| `nexify-automate.com` | Cloudflare | 301 → `www.nexifyai.cloud` | Weiterleitung | IST: Weiterleitung | N · 14.11. 22:19 |

**Server (S, Hostinger-API, 14.11.):**

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | 72.62.152.47 | 179.198.195.91 |
| System | Ubuntu 26.04, KVM 8 (8 Kerne, 32 GB, 400 GiB) | Ubuntu 24.04, KVM 8 |
| Platte | 86 % belegt (Hostinger-Metrik) | **97 % belegt, 10,2 GB frei** (gemessen 14.11. 12:00–12:50) |
| Container laut API | **nicht lesbar (`[VPS:2044]`)** | 20 Compose-Projekte mit Containern |
| Tunnel von hier | `nexifyai-agentur-cloudflare-tunnel` (aktiv seit 26.10.) | `nexifyai-duesseldorf` (aktiv seit 09.11. 09:33) |
| Firewall | `nexifyai-minimal-20260713`, synchron, unverändert seit 13.09. | dieselbe Gruppe |

Firewall-Gruppe (beide, unverändert seit 13.09.2026 10:57 UTC): TCP 22, 80, 443, 2222;
UDP 443, 51820, 51821; Quelle jeweils beliebig (S, N). SSH (22 und 2222) für jede Quelle
offen (OA-024). 15 SSH-Schlüssel im Hostinger-Konto, darunter `ignore-this`,
`temp-check` (S6, OA-021).

Compose-Projekte srv1941843 (S): `cherry-dashboard`, `cognee-x532`,
`convex-selfhosted`, `crit-web-deploy`, `deploy`, `deploy-staging`, `docker-hermes`,
`dsh-enterprise`, `extern` (SearXNG), `gitlab`, `gowa`, `librechat`, `monitoring-dus`,
`myadmin-shell`, `nexify-lokal`, `stack` (`9router`, LightRAG), `traefik-juib`, `wiki`;
ohne Container: `dify-dqiq`, `headroom-qsx8`; zehn beendete Mess-Projekte
`nx-messung*-20261114`.

**Lösungs- und Zugangsregister:** `config/loesungsregister.json` führt 58 Lösungen und
48 Zugänge; 17 Zugänge als „Erneuerung fällig“, 15 als offengelegt (R;
`tools/check_loesungsregister.py` Exit 0, 15.11. 09:57 UTC). Dokumentations­korrekturen
aus der Netz-Inventur (E7) sind dort noch nicht nachgeführt: `hermes-webui`,
`hostinger-srv1243952`, `cloudflare-dns` (neun Zonen statt zwei).

---

## 3. Lagebild Produkte und Dienste

### 3.1 Shop (Fall A — belegt)

- **`teileklar.shop` (alter Dienst auf srv1243952):** `/api/shop/products?limit=1` → 200,
  Antwort nur `items`, `total`; **`total` = 3720** (M, 15.11. 09:19 UTC). `/api/shop/status`,
  `/api/shop/categories` → 404 `{"detail":"Not Found"}`. Der Dienst kennt drei der vier
  Katalog-Routen von `main` nicht (`apps/shop-api/shop/catalog_api.py`) und läuft mit einem
  älteren Stand; die Datenbank dahinter antwortet (BELEGT; welcher Container ausliefert ist
  OFFEN, srv1243952 nicht einsehbar).
- **Vercel-Fassung (`nexifyai.de/api/shop/*`):** `/products` und `/status` → **503**
  `runtime_binding_unavailable` / `database_binding_missing_or_unsuitable` (M, 15.11. 09:19 UTC).
  Die Routen sind vorhanden (Antwort aus dem Dienst, nicht 404), liefern aber keine Daten:
  `MONGODB_URI` fehlt im Projekt `…-ut7r`; der Produktionswert im alten Projekt ist als
  „Sensitive“ gespeichert und nicht auslesbar (P, `PROGRESS.md` 14:25 UTC). Zielbild nach
  D-013 ist die eigene Supabase-Instanz (PostgreSQL mit RLS); Adresse und Zugang sind im
  Repository nicht belegt (Konflikt `DATA-STORE-001`).
- **Einordnung:** Ein Umschalten des DNS auf Vercel würde heute den funktionierenden
  Katalog (200) durch 503 ersetzen (N, Abschnitt 10.3). Das DNS von `teileklar.shop` wurde
  zuletzt am 15.09.2026 geändert, in den letzten 14 Tagen nicht (N).

### 3.2 Werkstattservice und Termine

Entwurf, nicht eingebunden. Terminlogik als Spezifikation (PR 187) und Terminbuchung
(PR 195, abnahmefähig als Entwurf) liegen vor; der Anfrageweg der Formulare
(`/kontakt`, `/teileklar/termine` …) läuft über `POST /api/requests` an den Shop-Dienst
und wird am 503-Gate abgewiesen — gespeichert und versendet wird nichts; das Formular
meldet die Abweisung ehrlich und übergibt per `mailto` (PR 181, R;
`docs/04-betrieb/anfrageweg-befund-2026-11-14.md`). OFFEN (Inhaber): eigener Empfänger in
`apps/web` oder Bindung des Shop-Dienstes (OA-163).

### 3.3 Cognee / Brain

`brain.nexifyai.cloud/mcp` → 401 hinter Traefik-Basisschutz (M, 15.11. 09:19 UTC). Der
**Cognee-API-Container fehlt**; die Wissensdaten liegen als Docker-Volumes
`cognee-x532_cognee-data` und `cognee-x532_cognee-system` (zusammen 2,69 GB) auf
srv1941843 und werden von Docker nur deshalb als „ungenutzt“ geführt, weil der Container
fehlt. **Sperrvermerk:** kein `docker volume prune`, kein `docker system prune --volumes`,
kein `docker image prune -a`, bis die Cognee-Volumes gesichert und wieder verknüpft sind
(S, `aufraeumplan-2026-11-14.md` Abschnitt 3.1). PR 197 (Cognee) ist abnahmefähig als
Entwurf (P).

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
Schlüssel). PR 193 (Hermes) ist abnahmefähig als Entwurf (P).

### 3.5 Mailing / Resend

`nexifyai.de` bei Resend **verified** (gemessen durch die auftraggebende Sitzung, 15.11.
09:56 UTC, K): DKIM (TXT `resend._domainkey`), SPF MX `send`, SPF TXT `send`, CNAME
`rsend → send.forge.rmta.net` — alle verified; Sending enabled, Receiving disabled,
Tracking aus. Am 14.11. 20:09 UTC stand die Domain noch auf „failed“ (alle Einträge
fehlten); drei Einträge am 14.11. 22:03 UTC, der vierte (`rsend`) am 15.11. ~09:25 UTC
bei Cloudflare angelegt (K). Eigene Gegenprobe über öffentliches DNS: `resend._domainkey`
TXT vorhanden (M, 15.11. 09:57 UTC). Weitere Domains im Konto: `nexifyai.cloud` verified,
`deinstudienkolleg.de` verified, `studienkollegaachen.de` failed (K, 14.11. ~22:05 UTC).
Kontakte: 1, Topics 0, Broadcasts 0 (K). Kein Versand erfolgt; Einwilligungen 0
(`mailversand-zustand-2026-11-14.md`, OA-001/OA-049).

---

## 4. Belegte Störungen der letzten Tage

| # | Störung | Zeitraum (UTC) | Quelle | Stand / Rückweg |
|---|---|---|---|---|
| B1 | `nexifyai.de` von Hostinger-NS auf Cloudflare umgezogen (größte Änderung der 14 Tage) | 13.11. 21:50–21:53 | N (Cloudflare-Audit) | Rückweg: NS bei Hostinger zurück auf `dns-parking.com`; abgehängte Hostinger-Zone als Rückweg behalten (E5) |
| B2 | Zielwechsel der Website `nexifyai.de` viermal (Vercel → srv1243952 → Vercel …) | 13.11. 09:34 – 14.11. 05:36 | N, S | seit 14.11. 05:36 Vercel 200; bestätigt M 15.11. 09:19 |
| B3 | **Clerk-Verlust:** fünf Einträge (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) fehlten öffentlich (NXDOMAIN) | 13.11. 21:53 – 15.11. ~09:25 | N; M (09:19 NXDOMAIN) | **BEHOBEN:** von koord. Sitzung neu angelegt (nur DNS); Gegenprobe M 09:57 UTC: alle fünf lösen auf |
| B4 | **DKIM-Proxy:** drei `hostingermail-*._domainkey.nexifyai.de` als CNAME mit Proxy → DKIM nicht prüfbar | 13.11. 21:53 – 15.11. ~09:25 | N; M | **BEHOBEN:** auf „nur DNS“ gestellt; Gegenprobe M 09:57 UTC: lösen als CNAME auf Hostinger-DKIM auf |
| B5 | `unternehmensbot.eu` vom Hostinger-Webhosting über CDN auf srv1243952 umgestellt | 01.11. 11:14, 08.11. 09:50 | N, S | Rückweg: Hostinger-Schnappschüsse 193231342, 195196695 |
| B6 | **Toter Tunnel `nexifyai-contabo`:** `agenten`, `librechat` → 530 | seit 09.11. 10:40 | N; **M 09:57 UTC weiter 530** | OFFEN. Rückweg: wieder verbinden oder auf `nexifyai-duesseldorf` umhängen (Zuordnung dort schon vorhanden, E4) |
| B7 | Tunnel-Zuordnungen am 09.11. neu geschrieben, `gitlab` auf srv1941843 umgehängt | 09.11. 09:30–09:33 | N | — |
| B8 | Tote Adressen in `nexifyai.cloud`: `demo`/`den` 502, `space` 526, `pad`/`work2work` Zeitüberschreitung, `agentmemory-api` 503 | gemessen 14.11. 22:19 | N | OFFEN; aufräumen erst nach Zonenexport (E6) |

Clerk ist heute ohne sichtbare Wirkung, solange die Produktion Clerk nicht einschaltet.
**Hinweis (M, 15.11. 09:19 UTC, BELEGT):** Die Produktion `nexifyai.de` nennt in ihrer
CSP-Kopfzeile inzwischen `https://clerk.nexifyai.de` (script-src/connect-src) — anders als
am 14.11. (N: keine Clerk-Adresse im HTML). Die zugehörigen DNS-Namen waren um 09:19 UTC
noch NXDOMAIN und sind seit ~09:25 UTC wieder vorhanden (B3). Ob Clerk damit scharf
geschaltet ist, ist OFFEN (kein Anmeldeversuch); sobald es eingeschaltet wird, müssen die
Einträge stehen — das ist jetzt der Fall.

An den Servern selbst wurde über Hostinger nichts verstellt: in 14 Tagen kein Neustart,
keine Firewall-Aktion, nur Sicherungen, ein Snapshot und zwei Ressourcen-Anpassungen an
srv1941843 (N, Abschnitt 8). **Welche Störung der Inhaber bemerkt hat, ist nicht belegt**
(OFFEN); B1–B6 sind die belegten Kandidaten.

---

## 5. Pakete und Pull Requests

Stand laut Auftrag der koordinierenden Sitzung und `PROGRESS.md` (P). Prüfstand:
„zweimal geprüft“ = unabhängige zweite Prüfung genannt. GitHub Actions startet keine Jobs
(Ausgabenlimit), deshalb ist vor `main` kein automatisches Gate aktiv; der Merge
freigegebener PRs ist durch Zweigschutz blockiert (`mergeable_state: blocked`).

| PR | Inhalt | Prüfstand | Reife | Was fehlt / Inhaberfreigabe |
|---|---|---|---|---|
| 186 | Einwilligungsweg Mailing, hinter `NEXIFY_MAILING_CONSENT` (Standard aus) | zweimal geprüft | Entwurf, abnahmefähig | Merge freigegeben, durch Zweigschutz blockiert (Actions-Budget) |
| 195 | Terminbuchung (Werkstatt) | geprüft | Entwurf, abnahmefähig | Merge freigegeben, blockiert |
| 197 | Cognee | geprüft | Entwurf, abnahmefähig | Merge freigegeben, blockiert; Cognee-API-Container fehlt (Serverzugriff) |
| 193 | Hermes (Arbeitsbereich) | geprüft | Entwurf, abnahmefähig | Merge freigegeben, blockiert; Modellschlüssel + Docker-Socket (Inhaber/Serverzugriff) |
| 190 | Suite-Funktionsliste | — | Entwurf | Sichtung/Abnahme |
| 189 | Unabhängige Prüfung von PR 118 (Google-Anmeldung) | — | Entwurf | Sichtung |
| 192 | `/intern/workspace` schließen | — | Entwurf | Sichtung |
| 201 | Zielkunden | — | Entwurf | Sichtung |
| Markenzeichen/Library | Zweig `claude/markenzeichen-library` | — | Entwurf | Sichtung |
| 184 | Cloudflare-Umzug (Vorbereitung) | — | kein Entwurf, Auto-Merge an, nicht gemergt | Kostenweg A/B/C (Inhaber, D-021) |
| 196 | Konto-Verknüpfung im Shop-Dienst | zweimal geprüft | **gemergt** `d4f2032` (14.11. 21:26) | Reste OA-171 bis OA-174 |
| 198 | robots-Meta, Ausfallkarten, Belege | geprüft | **gemergt** `48f5072` (14.11. 21:45) | Reste OA-175 bis OA-178 |

Betriebslage (P): 31 PRs offen (21:47 UTC); Auto-Merge bei 21 eingeschaltet. Codex-Review
startet nicht (Kontingent erschöpft, OA-146). Fünf verwaiste Vercel-Projekte (`web`,
`web-2kby`, `site`, `site-gjp7`, `site-k23m`) melden Baufehler (OA-023). Laut Mail vom
14.11. 01:37 UTC ist eine Vercel-Zahlung über 300,05 $ fehlgeschlagen (nur Inhaber).

---

## 6. Lückenplan — das große Saubermachen

Priorisiert nach Wirkung × Aufwand × Risiko. Owner-Typ: **I** = nur Inhaberentscheidung,
**SZ** = Serverzugriff (Shell/Freigabe nach D-016), **AA** = Agentenarbeit. Reihenfolge
folgt den Prioritäten aus `AGENTS.md` (Umsatz zuerst) und der Arbeitsliste.

### Priorität 1 — Sicherheits-, Daten- und Betriebsrisiko

| # | Lücke | Owner | Nächster Schritt |
|---|---|---|---|
| L1 | Cognee-Volumes ungesichert, API-Container fehlt; Prune-Sperre aktiv | **SZ** | Shell auf srv1941843: Volumes sichern, Cognee-Container wieder verknüpfen, dann Sperre aufheben (Aufräumplan Phase 0/3) |
| L2 | srv1941843 zu 97 % voll (10,2 GB frei); 77,3 GiB Paperclip-Läufe (abgelöst) | **SZ** | Shell: `.paperclip-runtime/runs` sichten und nach Freigabe kürzen; GitLab-Prometheus begrenzen (S, Folgen 2a/2b) |
| L3 | Hermes-Oberfläche öffentlich (D-019 F4 verletzt); Docker-Socket im Container (F5) | **SZ** | Shell: `ipAllowList`/`basicAuth` vor `hermes-webui`/`-api` oder nur SSH-Tunnel; Socket entfernen |
| L4 | Toter Tunnel `nexifyai-contabo` → `agenten`, `librechat` 530 | **I/SZ** | wieder verbinden oder auf `nexifyai-duesseldorf` umhängen (E4) |
| L5 | srv1243952 nicht einsehbar (trägt 57 von 126 Adressen) | **I** | Shell oder freigegebener nur-lesender Mess-Weg (E8) — **nur der Inhaber** |
| L6 | Cloudflare-Token mit DNS-Schreibrecht sichten (Zertifikatsdienst + neuer Token 14.11. 18:42) | **I** | Token-Liste und globalen Schlüssel prüfen, auf engste Zone begrenzen (E9) — **nur der Inhaber** |
| L7 | GitHub Actions ohne Budget → kein Gate, Merges blockiert | **I** | Actions-Budget/Abrechnung freigeben (OA-022) — **nur der Inhaber** |
| L8 | SSH für jede Quelle offen; 15 Schlüssel im Konto | **I** | auf feste Quellen/WireGuard begrenzen; Schlüssel aussortieren (S6/S8) — **nur der Inhaber** |

### Priorität 2 — Verkaufsfähiger Auftritt

| # | Lücke | Owner | Nächster Schritt |
|---|---|---|---|
| L9 | Indexierung aus (`noindex,nofollow`); Rechtsform/Impressum offen | **I** | `NEXIFY_INDEXING=enabled` in Vercel setzen (nach Impressum-Freigabe, OA-031/OA-009) — **nur der Inhaber** |
| L10 | Vercel-Zahlung fehlgeschlagen (300,05 $) | **I** | Zahlung/Abrechnung klären — **nur der Inhaber** |
| L11 | Verwaiste Vercel-Projekte melden Baufehler | **I** | Projekte trennen/löschen (OA-023) — **nur der Inhaber** |
| L12 | Cloudflare-Hosting-Umzug: Kostenweg unklar (lokal 46–56 ms > 10 ms Free-Tarif) | **I** | Kostenweg A/B/C wählen; Messung auf `workers.dev` (Token mit Worker-Recht), D-021 — **nur der Inhaber** |

### Priorität 3 — Kundenwege, Leads, Umsatz

| # | Lücke | Owner | Nächster Schritt |
|---|---|---|---|
| L13 | Shop-Vercel ohne DB-Bindung (503); `MONGODB_URI` fehlt | **I/AA** | `MONGODB_URI` im Projekt `…-ut7r` setzen (Inhaber, D-017) **oder** Supabase-Migration nach D-013 bauen (AA) |
| L14 | Anfrageweg erreicht nur per `mailto`, kein eigener Empfänger | **I/AA** | eigener Empfänger in `apps/web` oder Shop-Dienst binden (OA-163) |
| L15 | Mailing: 0 Einwilligungen, Rechtsgrundlage je Gruppe offen | **I** | Einwilligungsweg (PR 186) mergen + Rechtsgrundlage je Gruppe (OA-001) — **nur der Inhaber** |
| L16 | Abnahmefähige Entwürfe 186/193/195/197 nicht gemergt | **I** | nach L7 mergen; Freigabe liegt vor, Zweigschutz blockiert |

### Priorität 4 — Kundenprojekte abnahmefähig

| # | Lücke | Owner | Nächster Schritt |
|---|---|---|---|
| L17 | Studienkolleg Aachen: PR 22 mit offenen Entscheidungen H1/M4/G3; PR 20 gegen Vermerk gemergt | **I** | Entscheidungen H1/M4/G3; PR-20-Lage klären (Abschnitt 6a) — **nur der Inhaber** |

### Priorität 5 — Betrieb und Skalierung

| # | Lücke | Owner | Nächster Schritt |
|---|---|---|---|
| L18 | Dokumentation vs. Messung (W1–W13 der Netz-Inventur): `hermes-webui`, `hostinger-srv1243952`, `cloudflare-dns` falsch im Lösungsregister | **AA** | eigener additiver PR der koord. Sitzung; Quelle = Netz-Inventur (E7) |
| L19 | Supabase-Zielinstanz (D-013) ohne belegte Adresse/Zugang; kein Shop-Schema/RLS/Backup | **I/AA** | Instanz benennen, Schema+RLS bauen, Migrationsplan (Konflikt `DATA-STORE-001`) |
| L20 | Kein Regelbetrieb ohne offene Sitzung (Scheduler feuert in die Sitzung) | **I/AA** | verifiziert laufender externer Hostinger-Scheduler statt Chat-Regel (OA, `AGENTS.md`) |
| L21 | Managed-LLM-Aufrufe ohne belegten Schlüssel (9router/Hermes) | **I** | OpenRouter-Schlüssel mit Ausgabenlimit eintragen — **nur der Inhaber** |

### 6a. Kundenprojekt Studienkolleg Aachen (neu übertragen)

Dieser Orchestrierung am 15.11.2026 vom Inhaber übertragen (K). Kundendaten und
Einzelheiten bleiben im Kundenrepository; hier nur der Verweisstand laut Übergabe
(ANNAHME, hier nicht nachgeprüft): PR 22 Entwurf mit offenen Entscheidungen **H1/M4/G3**;
PR 21 Cloudflare vorbereitet; PR 20 gegen einen Vermerk gemergt → **Inhaberentscheidung
offen**; Grafik/Veredlung in Arbeit auf `claude/stk-grafik-veredlung`. Es gilt D-020:
bestehende Bilder/Videos des Kunden einbinden, nur das Hero-Bild neu erzeugen, keine neuen
Videos. Resend führt `deinstudienkolleg.de` als verified, `studienkollegaachen.de` als
failed (K).

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
- Vercel- und Cloudflare-Konto wurden in dieser Sitzung **nicht** über die jeweiligen
  MCP-Werkzeuge abgefragt (eine Resend/MCP-Abfrage hing an einer Berechtigungsabfrage und
  wurde ohne Entscheidung abgebrochen); die Resend-Werte stammen von der koordinierenden
  Sitzung (K). Inhalt von Cloudflare-Regelsätzen, Access-Anwendungen und Worker-Skripten
  wurde nicht gelesen.
- Welche Störung der Inhaber tatsächlich bemerkt hat (Adresse, Zeit, Fehlerbild) — OFFEN.
- Erreichbarkeit aus anderen Netzen; gemessen wurde nur aus der Sitzungsumgebung.
- Zustellung an `mail@nexifyai.cloud` und ob Mail-Zustellprobleme real auftraten — OFFEN.

---

*Ende. Quellen: eigene Live-Messungen 15.11.2026 09:19 und 09:57 UTC (M); Übergabe der
koordinierenden Sitzung (K); `docs/04-betrieb/netz-inventur-2026-11-14.md` (N);
`docs/04-betrieb/server-befund-2026-11-14.md` und `aufraeumplan-2026-11-14.md` (S);
`PROGRESS.md`, `DECISIONS.md`, `config/loesungsregister.json`,
`docs/09-final/offene-arbeiten-2026-11-14.md` (R, P). Führend für die Aufgabenverwaltung
bleibt `PROGRESS.md`.*
