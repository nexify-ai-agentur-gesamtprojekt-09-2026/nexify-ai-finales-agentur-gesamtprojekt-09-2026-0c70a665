# Netz-Inventur · 14.11.2026

Anlass: Der Inhaber vermutet, dass in den letzten Tagen „am Netzwerk etwas verstellt“ wurde. Dieses Dokument ist die belegte Landkarte dazu: welche Adresse wohin zeigt, was dort antwortet, was wann geändert wurde und wo die Dokumentation nicht zur Messung passt.

**Nur gelesen, nichts geändert.** Erhoben am 14.11.2026 zwischen 22:16 und 22:23 UTC. Es gelten D-016 und D-017 (`DECISIONS.md`). Kein DNS-Eintrag, kein Server, kein Container, keine Firewall und kein Konto wurde angefasst; es wurde kein Mess-Container gestartet.

## Messwege

| Kürzel | Messweg | Zeit (UTC) |
|---|---|---|
| H | Hostinger-API, nur `GET`: Domain-Portfolio, DNS-Zonen, DNS-Schnappschüsse, Server, Firewall, Schlüsselnamen, Aktionsverlauf, Container-Liste, Compose-Struktur (nur Abbild, Ports, Netzmodus, Startbefehl; keine Umgebungswerte) | 22:16–22:22 |
| C | Cloudflare-API, nur `GET`: Zonen, DNS-Einträge, Audit-Log seit 31.10., Tunnel-Liste, Tunnel-Zuordnungen | 22:16–22:23 |
| D | Öffentliches DNS über zwei Auflöser (`dns.google/resolve`, `cloudflare-dns.com/dns-query`) | 22:19–22:21 |
| W | Je ein `GET` auf `/` über http und https, ohne Anmeldung, ohne Folgen der Weiterleitung; 126 Adressen. Für `unternehmensbot.eu` zusätzlich je ein `GET` auf die im Server-Befund genannten Pfade | 22:19–22:21 |
| R | Suche im Repository am Commit `9c9c806` | 22:21 |

Grenzen der Messung: Die Abrufe laufen über den Netz-Proxy der Sitzung. Belastbar sind Statuscode, Kopfzeilen, Titel und TLS-Aussteller, nicht die Erreichbarkeit einzelner Ports. Was auf srv1243952 läuft, zeigt die Hostinger-API nicht (Antwort `[VPS:2044]`, Docker Manager dort nicht verfügbar). Wer eine Änderung ausgelöst hat, steht hier nur als Akteurstyp (Oberfläche, Schnittstelle, Token, System).

Kundenzonen sind nach `nexify-kundenprojekt` ohne Namen geführt (K1 bis K4, SK für das Studienkolleg). Die Zuordnung der Kürzel steht nicht im Repository.

## Kurzfassung

1. **`nexifyai.de` wurde am 13.11.2026 um 21:50–21:53 UTC von den Hostinger-Nameservern zu Cloudflare umgezogen** (Cloudflare-Oberfläche, Akteurstyp Benutzer); das ist die größte Änderung der letzten 14 Tage.
2. **Beim Umzug gingen fünf Clerk-Einträge verloren** (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`): Sie stehen noch in der abgehängten Hostinger-Zone, fehlen bei Cloudflare und lösen öffentlich mit NXDOMAIN auf.
3. **Die drei Hostinger-DKIM-Namen von `nexifyai.de` lösen öffentlich nicht mehr auf**, weil sie bei Cloudflare mit eingeschaltetem Proxy angelegt wurden; Postfach-Mails von `@nexifyai.de` sind damit ohne prüfbare DKIM-Signatur.
4. Das Ziel der Website `nexifyai.de` wurde zwischen 13.11. 09:34 und 14.11. 05:36 UTC viermal umgestellt (Vercel → srv1243952 → Vercel-Adresse hinter Cloudflare → srv1243952 → Vercel); seit 14.11. 05:36 UTC antwortet Vercel mit 200.
5. **`unternehmensbot.eu` zeigt seit 08.11. 09:50 UTC auf srv1243952, nicht auf srv1941843**, während Server-Befund und Lösungsregister die Hermes-Oberfläche hinter dieser Adresse auf srv1941843 beschreiben; die dortige Außenmessung hat srv1243952 getroffen.
6. **Der Tunnel `nexifyai-contabo` ist seit 09.11. 10:40 UTC ohne Verbindung**; `agenten.nexifyai.cloud` und `librechat.nexifyai.cloud` antworten deshalb mit 530.
7. Weitere tote Adressen in `nexifyai.cloud`: `demo` und `den` 502, `space` 526, `pad` und `work2work` ohne Antwort, dazu 12 Adressen mit 404.
8. An den Servern selbst wurde über Hostinger nichts verstellt: Firewall-Gruppe zuletzt am 13.09. geändert, in 14 Tagen kein Neustart und keine Firewall-Aktion, nur Sicherungen, ein Snapshot, die bekannten Mess-Container und zwei Ressourcen-Anpassungen an srv1941843 (01.11. und 05.11.).
9. „Port 8788“ meint je Server etwas anderes (srv1941843: Hermes-Oberfläche laut Server-Befund; srv1243952: alte Website hinter `www.nexifyai.cloud` laut Tunnel-Zuordnung), und Ruflo kommt im Repository nur als getrennter Konnektor vor, nicht als Dienst an einem Port.
10. Welche Störung der Inhaber bemerkt hat, ist nicht belegt; die Punkte 1 bis 6 sind die belegten Kandidaten, und srv1243952 bleibt mangels Einblick der blinde Fleck.

## 1. Domains und Zonen

### 1.1 Wo welche Zone geführt wird (H, C, D · 22:16–22:21 UTC)

| Domain | Registriert bei Hostinger | Nameserver laut Hostinger | Zone wirkt bei | Hostinger führt daneben eine Zone | Schnappschüsse bei Hostinger (gesamt / seit 31.10.) |
|---|---|---|---|---|---|
| `nexifyai.de` | ja, bis 31.01.2027 | Cloudflare (`brynne`, `carmelo`) | **Cloudflare**, seit 13.11. 21:53 UTC | ja, 16 Einträge, **wirkungslos** | 269 / 1 |
| `nexifyai.cloud` | ja, bis 06.02.2027 | Cloudflare | Cloudflare, seit 13.05.2026 | ja, 37 Einträge, wirkungslos | 136 / 0 |
| `unternehmensbot.eu` | ja, bis 23.02.2027 (zusätzlich als Gratis-Domain eines Hosting-Pakets geführt) | Hostinger (`ns1/ns2.dns-parking.com`) | **Hostinger** | – | 41 / 4 |
| `teileklar.shop` | ja, bis 31.08.2027 | Cloudflare | Cloudflare, seit 31.08.2026 | ja, 11 Einträge, wirkungslos (Hauptadresse dort 2.57.91.91) | 1 / 0 |
| `teileklar.de`, `.store`, `.pro` | ja, bis 31.08.2027 | Hostinger | Hostinger, nur Parkseite | – | 0 / 0 |
| `ainexi2fyi.de`, `.studio`, `.click`, `.shop` | ja, bis 10.2027 | Hostinger | Hostinger, nur Parkseite | – | 0 / 0 |
| `nexify-automate.com` | nein (Cloudflare nennt als früheren Registrar united-domains) | Cloudflare | Cloudflare, seit 21.05.2026 | – | – |
| Kundenzone K3 | ja | Cloudflare | Cloudflare | ja, 2 Einträge, wirkungslos | 0 / 0 |
| Kundenzone K4 | ja | Cloudflare | Cloudflare | ja, 11 Einträge, wirkungslos | 1 / 0 |
| Kundenzonen K1, K2, SK | nein | Cloudflare | Cloudflare | – | – |

Im Hostinger-Portfolio steht außerdem ein Gratis-Domain-Platz im Zustand `pending_setup` ohne Domain (angelegt 30.08.2026).

Öffentlich nachgemessen (D, 22:20 UTC): `nexifyai.de`, `nexifyai.cloud`, `teileklar.shop` → Cloudflare-Nameserver; `unternehmensbot.eu` → `ns1/ns2.dns-parking.com`.

**Wichtig für jede künftige Änderung:** Wer bei Hostinger einen DNS-Eintrag von `nexifyai.de`, `nexifyai.cloud` oder `teileklar.shop` ändert, ändert nichts Sichtbares. Wirksam ist allein Cloudflare. Die Hostinger-Zonen sind zugleich der einzige Ort, an dem der Stand vor dem Umzug noch nachlesbar ist.

### 1.2 Cloudflare-Zonen (C · 22:17 UTC)

Alle neun Zonen: Tarif „Free Website“, Zustand `active`, Typ `full`, ein Konto.

| Zone | Einträge | davon A/AAAA/CNAME | mit Proxy | MX | TXT | Zone angelegt | aktiv seit |
|---|---|---|---|---|---|---|---|
| Kundenzone K1 | 8 | 5 | 5 | 2 | 1 | 2026-08-12T17:34Z | 2026-08-12T17:50Z |
| Kundenzone K2 | 11 | 5 | 0 | 1 | 5 | 2026-07-02T07:41Z | 2026-07-02T07:46Z |
| Kundenzone SK | 24 | 13 | 13 | 4 | 7 | 2026-08-14T08:01Z | 2026-08-16T20:25Z |
| Kundenzone K3 | 6 | 2 | 2 | 0 | 4 | 2026-08-22T10:04Z | 2026-08-22T10:06Z |
| `nexifyai.cloud` | 88 | 75 | 63 | 2 | 11 | 2026-05-13T11:31Z | 2026-05-13T11:36Z |
| `nexifyai.de` | 14 | 7 | 5 | 3 | 4 | 2026-11-13T21:50Z | 2026-11-13T21:53Z |
| `nexify-automate.com` | 25 | 5 | 2 | 4 | 16 | 2026-05-21T17:47Z | 2026-05-21T17:55Z |
| `teileklar.shop` | 5 | 2 | 2 | 0 | 3 | 2026-08-31T22:47Z | 2026-08-31T23:13Z |
| Kundenzone K4 | 14 | 8 | 3 | 2 | 4 | 2026-06-16T06:19Z | 2026-06-16T06:21Z |

### 1.3 `nexifyai.de` bei Cloudflare: Mail- und Hilfseinträge (C · 22:17 UTC)

| Typ | Name | Wert (gekürzt) | Proxy | angelegt | geändert |
|---|---|---|---|---|---|
| CNAME | `hostingermail-a._domainkey.nexifyai.de` | `hostingermail-a.dkim.mail.hostinger.com` | ja | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| CNAME | `hostingermail-b._domainkey.nexifyai.de` | `hostingermail-b.dkim.mail.hostinger.com` | ja | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| CNAME | `hostingermail-c._domainkey.nexifyai.de` | `hostingermail-c.dkim.mail.hostinger.com` | ja | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| MX | `nexifyai.de` | `5 mx1.hostinger.com` | nein | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| MX | `nexifyai.de` | `10 mx2.hostinger.com` | nein | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| MX | `send.nexifyai.de` | `10 feedback-smtp.eu-west-1.amazonses.com` | nein | 2026-11-14T22:03Z | 2026-11-14T22:03Z |
| TXT | `_dmarc.nexifyai.de` | `v=DMARC1; p=none` | nein | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| TXT | `nexifyai.de` | `v=spf1 include:_spf.mail.hostinger.com ~all` | nein | 2026-11-13T21:50Z | 2026-11-13T21:50Z |
| TXT | `resend._domainkey.nexifyai.de` | `p=… (gekürzt)` | nein | 2026-11-14T22:03Z | 2026-11-14T22:03Z |
| TXT | `send.nexifyai.de` | `v=spf1 include:amazonses.com ~all` | nein | 2026-11-14T22:03Z | 2026-11-14T22:03Z |

Dazu `autoconfig` und `autodiscover` (CNAME auf Hostinger-Mail, **Proxy an**) sowie Haupt- und `www`-Adresse (Abschnitt 3.1).

Nur in der abgehängten Hostinger-Zone von `nexifyai.de`, **nicht** bei Cloudflare (H · 22:16 UTC): `clerk` → `frontend-api.clerk.services`, `accounts` → `accounts.clerk.services`, `clkmail`, `clk._domainkey`, `clk2._domainkey` (je CNAME auf `…clerk.services`); Hauptadresse dort `A 72.62.152.47`.

### 1.4 `nexifyai.cloud` bei Cloudflare: Mail- und Hilfseinträge (C · 22:17 UTC)

| Typ | Name | Wert (gekürzt) | Proxy | angelegt | geändert |
|---|---|---|---|---|---|
| CNAME | `_pipedream-challenge-a6119d9ff43bf7a5.nexifyai.cloud` | `nexify.cloud` | ja | 2026-09-12T23:16Z | 2026-09-12T23:16Z |
| CNAME | `hostingermail-a._domainkey.nexifyai.cloud` | `hostingermail-a.dkim.mail.hostinger.com` | nein | 2026-06-13T07:37Z | 2026-06-13T07:37Z |
| CNAME | `hostingermail-b._domainkey.nexifyai.cloud` | `hostingermail-b.dkim.mail.hostinger.com` | nein | 2026-06-13T07:38Z | 2026-08-08T07:53Z |
| CNAME | `hostingermail-c._domainkey.nexifyai.cloud` | `hostingermail-c.dkim.mail.hostinger.com` | nein | 2026-06-13T07:38Z | 2026-06-13T07:38Z |
| MX | `nexifyai.cloud` | `10 mx2.hostinger.com` | nein | 2026-06-13T07:36Z | 2026-06-13T07:36Z |
| MX | `nexifyai.cloud` | `5 mx1.hostinger.com` | nein | 2026-06-13T07:36Z | 2026-06-13T07:36Z |
| TXT | `_cf-custom-hostname.www.nexifyai.cloud` | `295fe19c… (gekürzt)` | nein | 2026-09-12T06:16Z | 2026-10-24T12:53Z |
| TXT | `_dmarc.nexifyai.cloud` | `v=DMARC1; p=quarantine; rua=mailto:(Adresse)` | nein | 2026-05-13T13:42Z | 2026-06-10T09:36Z |
| TXT | `_openai-site-verification.www.nexifyai.cloud` | `openai-site-verification=… (gekürzt)` | nein | 2026-09-12T06:16Z | 2026-10-24T12:53Z |
| TXT | `_pipedream-challenge-a6119d9ff43bf7a5.nexifyai.cloud` | `bbd5eb93… (gekürzt)` | nein | 2026-09-12T23:17Z | 2026-09-12T23:17Z |
| TXT | `_railway-verify.work2work.nexifyai.cloud` | `railway-verify=… (gekürzt)` | nein | 2026-10-14T04:14Z | 2026-10-14T04:14Z |
| TXT | `hostingermail1._domainkey.nexifyai.cloud` | `v=… (gekürzt)` | nein | 2026-09-12T20:40Z | 2026-09-12T20:40Z |
| TXT | `nexifyai.cloud` | `openai-domain-verification=… (gekürzt)` | nein | 2026-09-11T09:38Z | 2026-09-11T09:38Z |
| TXT | `nexifyai.cloud` | `v=spf1 include:_spf.mail.hostinger.com include:amazonses.com ~all` | nein | 2026-06-13T07:37Z | 2026-08-10T10:54Z |
| TXT | `nexifyai.cloud` | `google-site-verification=… (gekürzt)` | nein | 2026-08-02T08:51Z | 2026-08-02T08:51Z |
| TXT | `nexifyai.cloud` | `MS=… (gekürzt)` | nein | 2026-07-25T02:26Z | 2026-07-25T02:26Z |
| TXT | `resend._domainkey.nexifyai.cloud` | `p=… (gekürzt)` | nein | 2026-06-04T13:39Z | 2026-06-10T10:04Z |

Nur in der abgehängten Hostinger-Zone von `nexifyai.cloud` (H · 22:16 UTC), bei Cloudflare ohne Entsprechung und öffentlich ohne Antwort (D, Stichprobe `hermes`, `chat`, `supabase`, `studienkolleg` · 22:21 UTC): `gateway`, `relay`, `opencarbox`, `alert`, `qdrant`, `affilinet`, `chat`, `hermes`, `analytics`, `ai-ceo`, `app-admin`, `notebook`, `ai-farbrik`, `nexifyai`, `studienkolleg`, `supabase`, `kuma` (alle `A 72.62.152.47`), `ai-team` (CNAME auf einen weiteren Tunnel). Das sind Altlasten aus der Zeit vor dem 13.05.2026.

## 2. Zeitleiste der Änderungen seit 31.10.2026

Hostinger-Schnappschüsse halten den Stand **unmittelbar vor** der genannten Änderung fest; „nachher“ ist aus dem nächsten Schnappschuss oder dem heutigen Stand abgelesen. Der Akteur steht bei Hostinger nicht im Schnappschuss.

| UTC | Wo | Was | Vorher → nachher | Akteurstyp | Messweg |
|---|---|---|---|---|---|
| 01.11. 00:13 | srv1941843 | `ct_set_limits` (Ressourcengrenzen gesetzt) | nicht ausgewiesen | Hostinger-Aktion | H |
| 01.11. 11:14 | `unternehmensbot.eu` (Hostinger) | „Hosting CDN enabled“ | `@` A 2.57.91.91, `www` CNAME auf `@` → `@` ALIAS und `www` CNAME auf `…cdn.hstgr.net` | nicht ausgewiesen | H, Schnappschuss 193231342 |
| 02.11. 07:46–07:48 | Cloudflare-Konto | zwei CASB-Anbindungen angelegt (Slack, GitHub) | – → vorhanden | Benutzer, Oberfläche | C |
| 02.11. 13:59 | `unternehmensbot.eu` | Eintrag ergänzt | – → `home` A 72.62.152.47 | nicht ausgewiesen | H, 193524244 |
| um 02.11. | srv1941843 | fast alle Container „Up 12 days“: Docker oder Server um den 02.11. neu gestartet; über die Hostinger-API ist kein Neustart verzeichnet | – | nicht ausgewiesen | H, Container-Liste |
| 03.11. 15:42–16:03 | Kundenzone SK | Vorschau-Adresse angelegt (CNAME auf einen Sites-Dienst, zwei Prüf-TXT), dann Proxy eingeschaltet | – → vorhanden | Benutzer, Oberfläche | C |
| 05.11. 15:12 | srv1941843 | `ct_set_limits` | nicht ausgewiesen | Hostinger-Aktion | H |
| um 05.11. | srv1941843 | Container `hermes` „Up 9 days“ | Neustart des Containers | nicht ausgewiesen | H |
| 06.11. 19:13 | Cloudflare | Zertifikat für die workers.dev-Subdomain des Kontos ausgestellt | – | System | C |
| 08.11. 09:50:09 | `unternehmensbot.eu` | Einträge gelöscht | `@` ALIAS und `www` CNAME auf das Hostinger-CDN → entfernt | nicht ausgewiesen | H, 195196695 |
| 08.11. 09:50:14 | `unternehmensbot.eu` | Einträge gesetzt | – → `@` und `www` A **72.62.152.47** (srv1243952) | nicht ausgewiesen | H, 195196707 |
| 09.11. 09:30 | Cloudflare-Tunnel | Zuordnung der Tunnel `nexifyai-agentur-cloudflare-tunnel` (Fassung 93) und `nexifyai-contabo` (Fassung 20) neu geschrieben | alter Inhalt im Audit-Log nicht enthalten | Benutzer, Schnittstelle | C |
| 09.11. 09:31 | `nexifyai.cloud` | `gitlab` geändert | vorheriges Ziel nicht ausgewiesen → Tunnel `nexifyai-duesseldorf` (srv1941843) | Benutzer, Schnittstelle | C |
| 09.11. 09:33 | Tunnel `nexifyai-duesseldorf` | Verbindungen neu aufgebaut (aktiv seit) | – | – | C, Tunnel-Liste |
| 09.11. 10:40 | Tunnel `nexifyai-contabo` | **letzte Verbindung beendet, seither `down`** | verbunden → keine Verbindung | – | C, Tunnel-Liste |
| 09.11. 16:16 | `nexifyai.cloud` | sechs kurzlebige Zertifikats-Prüfeinträge für `gitlab`, `webui`, `ai-router`, `wissen`, `factory`, `cockpit` angelegt und wieder entfernt | – | Benutzer, Schnittstelle (ein Zertifikatsdienst auf einem Server) | C |
| 13.11. 09:34 | `nexifyai.de` (Hostinger, damals wirksam) | Hauptadresse umgestellt | `@` A 216.150.1.1 (Vercel) → **72.62.152.47** (srv1243952) | nicht ausgewiesen | H, 196682832 |
| 13.11. 11:20 | `nexifyai.cloud` | zwei Regelsatz-Änderungen (Umschreiberegel angelegt) | Inhalt nicht gelesen | Token | C |
| 13.11. 21:50:40 | `nexifyai.de` | **Zone bei Cloudflare angelegt** | – | Benutzer, Oberfläche | C |
| 13.11. 21:50:45 | `nexifyai.de` (Cloudflare) | 11 Einträge aus dem automatischen Abgleich übernommen: `@` A 72.62.152.47, `www`, `autoconfig`, `autodiscover`, drei DKIM-CNAME (alle **mit Proxy**), 2 MX, SPF, DMARC. **Die fünf Clerk-Einträge sind nicht dabei.** | – → vorhanden | Benutzer, Oberfläche | C |
| 13.11. 21:53:31 | `nexifyai.de` | Hauptadresse geändert | → A 76.76.21.21 (Vercel) mit Proxy | Benutzer, Oberfläche | C |
| 13.11. 21:53:54 | `nexifyai.de` | **Nameserver bestätigt, Cloudflare wirksam**; Zertifikate ausgestellt | Hostinger-DNS → Cloudflare-DNS | Benutzer / System | C |
| 14.11. 03:18 | `nexifyai.de` | Hauptadresse geändert | → A **72.62.152.47** (srv1243952) mit Proxy | Benutzer, **Schnittstelle** | C |
| 14.11. 05:32–05:35 | `nexifyai.de` | `www` geändert | → CNAME auf Vercel, erst mit, dann ohne Proxy | Benutzer, Oberfläche | C |
| 14.11. 05:36 | `nexifyai.de` | Hauptadresse ersetzt | A 72.62.152.47 gelöscht → CNAME auf Vercel, ohne Proxy | Benutzer, Oberfläche | C |
| 14.11. 06:47–06:48 | `nexifyai.cloud` | `www` zweimal geändert | vorheriges Ziel nicht ausgewiesen → CNAME `cname.vercel-dns.com`, ohne Proxy | Benutzer, Oberfläche | C |
| 14.11. 09:38 | `nexifyai.cloud`, `teileklar.shop` | kurzlebige Zertifikats-Prüfeinträge für `www.nexifyai.cloud`, `teileklar.shop`, `www.teileklar.shop` | – | Benutzer, Schnittstelle (Zertifikatsdienst auf einem Server) | C |
| 14.11. 11:47 | beide Server | Snapshot angelegt (läuft 15.11. 11:47 UTC ab) | – | Hostinger-Aktion | H |
| 14.11. 12:00–13:43, 18:17, 18:30 | srv1941843 | zehnmal `docker_compose_up`: die zehn bekannten Mess-Projekte | – | Schnittstelle (Mess-Sitzungen) | H |
| 14.11. 18:42 | Cloudflare-Konto | Zugangstoken angelegt (Bezeichnung im Audit-Log vorhanden, hier nicht wiedergegeben) | – | Benutzer | C |
| 14.11. 18:47–18:53 | Cloudflare Workers | ein Skript dreimal ausgeliefert, auf der workers.dev-Subdomain eingeschaltet, Protokoll mitgelesen | – | Token | C |
| 14.11. 22:03 | `nexifyai.de` | drei Resend-Einträge ergänzt (TXT `resend._domainkey`, MX und TXT `send`) – gewollt und bekannt | – → vorhanden | Konto-Token, Schnittstelle | C |
| täglich | beide Server | `backup_create`, jeweils erfolgreich (srv1243952: 12 Läufe, srv1941843: 12 Läufe seit 01.11.) | – | Hostinger | H |

Im selben Zeitraum **nicht** vorgekommen (H, C): Änderung an der Firewall-Gruppe (letzte Änderung 13.09.2026 10:57 UTC), Neustart, Stopp, Wiederherstellung oder Neuinstallation eines Servers über Hostinger, DNS-Änderung an `nexifyai.cloud` bei Hostinger, Änderung an `teileklar.shop` außer den Prüfeinträgen.

## 3. Was antwortet wo

Spalte „http / https“: Statuscode des einen Abrufs von `/`. `000` heißt: keine Antwort. Zuordnung der Tunnel zu Servern: Herkunftsadresse der Tunnel-Verbindungen laut Cloudflare (C, 22:18 UTC) gegen die Serveradressen laut Hostinger (H). Die lokalen Ziele (`127.0.0.1:Port`) stammen aus der Tunnel-Zuordnung bei Cloudflare; ob dort ein Dienst lauscht, ist für srv1243952 nicht einsehbar.

### 3.1 `nexifyai.de` (W, D · 22:19–22:20 UTC)

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `autoconfig.nexifyai.de` | CNAME `autoconfig.mail.hostinger.com` · Proxy | 200 / 200 |  |  | cloudflare | Let's Encrypt | 22:19:49 |
| `autodiscover.nexifyai.de` | CNAME `autodiscover.mail.hostinger.com` · Proxy | 200 / 200 |  |  | cloudflare | Let's Encrypt | 22:19:50 |
| `nexifyai.de` | CNAME `6deb9ec02c598d1f.vercel-dns-016.com` · nur DNS | 308 / 200 |  | Ein Gespräch. Ein Projekt, das passt. · NeXify AI | Vercel | Let's Encrypt | 22:19:55 |
| `www.nexifyai.de` | CNAME `6deb9ec02c598d1f.vercel-dns-016.com` · nur DNS | 308 / 200 |  | Ein Gespräch. Ein Projekt, das passt. · NeXify AI | Vercel | Let's Encrypt | 22:20:00 |

Vercel-Adresse der Produktion laut `AGENTS.md`:

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `nexify-ai-finales-agentur-gesamtpro-one.vercel.app` | - `-` | 308 / 200 |  | Ein Gespräch. Ein Projekt, das passt. · NeXify AI | Vercel | Google Trust Services | 22:19:54 |

Shop-Dienst (W, 22:21 UTC): `https://nexifyai.de/api/shop/health` → 503, `server: Vercel`, Antwort `runtime_binding_unavailable`, Grund `payment_mode_unbound`. `https://nexifyai.de/anmelden` → 200; im HTML der Startseite kommt keine Clerk-Adresse vor.

### 3.2 `unternehmensbot.eu` (W, D · 22:19–22:21 UTC)

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `home.unternehmensbot.eu` | A srv1243952 | 301 / 302 | → `home.unternehmensbot.eu/login` |  |  | Let's Encrypt | 22:19:53 |
| `unternehmensbot.eu` | A srv1243952 | 301 / 302 | → `unternehmensbot.eu/login` |  |  | Let's Encrypt | 22:19:57 |
| `www.unternehmensbot.eu` | A srv1243952 | 301 / 302 | → `www.unternehmensbot.eu/login` |  |  | Let's Encrypt | 22:20:01 |

Direkt auf srv1243952, ohne Cloudflare davor. `GET /login` → 200, Titel „NeX Agentic AI — Anmelden“; `GET /api/status` → 401 `Authentication required`; `GET /session` → 302 auf `login`. Zertifikate von Let's Encrypt, je Name eigenes Zertifikat. Derselbe Titel erscheint unter `hermes-dash.nexifyai.cloud/login` (Tunnel nach srv1243952, lokales Ziel `127.0.0.1:8787`).

### 3.3 `teileklar.shop` (W, D · 22:20 UTC)

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `teileklar.shop` | A srv1243952 · Proxy | 301 / 200 |  | Autoteile online kaufen – passgenau für dein Fahrzeug / TEILEKLAR | cloudflare | Google Trust Services | 22:19:57 |
| `www.teileklar.shop` | A srv1243952 · Proxy | 301 / 200 |  | Autoteile online kaufen – passgenau für dein Fahrzeug / TEILEKLAR | cloudflare | Google Trust Services | 22:20:01 |

Die Tunnel-Zuordnung von `nexifyai-duesseldorf` (srv1941843) enthält ebenfalls `teileklar.shop` und `www.teileklar.shop` → `http://localhost:8090`. Das DNS zeigt aber auf srv1243952; der Tunnel-Eintrag wird nicht benutzt.

### 3.4 `nexifyai.cloud` (W, D · 22:19–22:20 UTC)

Verteilung der https-Statuscodes über 71 Adressen: 000: 2, 200: 22, 301: 5, 302: 9, 307: 3, 400: 1, 401: 10, 404: 12, 501: 1, 502: 2, 503: 1, 526: 1, 530: 2.

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `(K1).nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8095` | 301 / 200 |  | (Kundenseite) | cloudflare | SSL Corporation | 22:19:47 |
| `admin.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:47 |
| `agenta.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `https://localhost:443` | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:47 |
| `agenten.nexifyai.cloud` | Tunnel `nexifyai-contabo` (kein Server verbunden) → Pfadregel `^/(api\|console/api\|v1\|files)(/.*)?$` `http://127.0.0.1:32768`; `http://127.0.0.1:32769` | 301 / 530 |  |  | cloudflare | SSL Corporation | 22:19:47 |
| `agentmemory-api.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http_status:503` | 301 / 503 |  |  | cloudflare | SSL Corporation | 22:19:47 |
| `agentmemory.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://localhost:3113` | 301 / 302 | → Cloudflare-Access-Anmeldung |  | cloudflare | SSL Corporation | 22:19:47 |
| `ai-router.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:20128` | 301 / 307 | → `ai-router.nexifyai.cloud/dashboard` |  | cloudflare | SSL Corporation | 22:19:47 |
| `angebot.nexifyai.cloud` | CNAME `links2.resend-dns.com` · nur DNS | 301 / 400 |  |  |  | Amazon | 22:19:48 |
| `api.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:49 |
| `app.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:3000` | 301 / 200 |  |  | cloudflare | SSL Corporation | 22:19:49 |
| `auth.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:49 |
| `billing.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:50 |
| `board.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `https://127.0.0.1:443` | 301 / 200 |  | NeX2fly * NeXify AI / Board | cloudflare | SSL Corporation | 22:19:50 |
| `bot-managment-cloudflare.nexifyai.cloud` | CNAME `public.r2.dev` · Proxy | 301 / 404 |  |  | cloudflare | Google Trust Services | 22:19:50 |
| `brain.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `https://localhost:443` | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:51 |
| `budibase.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → kein Eintrag in der Tunnel-Zuordnung (Rest: 404) | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:51 |
| `ceo.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8899` | 301 / 200 |  | eve | cloudflare | SSL Corporation | 22:19:51 |
| `cf-worker.nexifyai.cloud` | AAAA `100::` · Proxy | 301 / 200 |  |  | cloudflare | Google Trust Services | 22:19:51 |
| `cloudflared.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://localhost:20241` | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:51 |
| `cockpit.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 302 | → `system.nexifyai.cloud/workspace` |  | cloudflare | SSL Corporation | 22:19:51 |
| `codex.nexifyai.cloud` | A srv1941843 · nur DNS | 301 / 401 |  |  |  | Let's Encrypt | 22:19:51 |
| `dashboard.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `https://127.0.0.1:443` | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:51 |
| `demo.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 502 |  |  | cloudflare | SSL Corporation | 22:19:51 |
| `den.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:3015` | 301 / 502 |  |  | cloudflare | SSL Corporation | 22:19:52 |
| `design.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8896` | 301 / 200 |  | eve | cloudflare | SSL Corporation | 22:19:52 |
| `docs.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://localhost:8840` | 301 / 200 |  | Dokumentation — vorübergehend nicht verfügbar - NeXify Docs | cloudflare | SSL Corporation | 22:19:52 |
| `downloads.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8811` | 301 / 200 |  | NeXify AI — Downloads | cloudflare | SSL Corporation | 22:19:52 |
| `factory.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:52 |
| `gateway.nexifyai.cloud` | CNAME `gateway.ai.cloudflare.com` · Proxy | 301 / 401 |  |  | cloudflare | Google Trust Services | 22:19:52 |
| `gitlab.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `http://127.0.0.1:8922` | 301 / 302 | → `gitlab.nexifyai.cloud/users/sign_in` |  | cloudflare | SSL Corporation | 22:19:52 |
| `grafana.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 301 | → `dashboard.nexifyai.cloud/grafana/` |  | cloudflare | SSL Corporation | 22:19:52 |
| `headroom.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://localhost:7777` | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:52 |
| `hermes-dash.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8787` | 301 / 302 | → `hermes-dash.nexifyai.cloud/login` |  | cloudflare | SSL Corporation | 22:19:53 |
| `hooks.nexifyai.cloud` | A srv1941843 · nur DNS | 301 / 501 |  |  | BaseHTTP/0.6 Python/3.12.3 | Let's Encrypt | 22:19:53 |
| `js.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8096` | 301 / 200 |  | (Kundenseite) | cloudflare | SSL Corporation | 22:19:53 |
| `langfuse.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 200 |  |  | cloudflare | SSL Corporation | 22:19:53 |
| `librechat.nexifyai.cloud` | Tunnel `nexifyai-contabo` (kein Server verbunden) → `http://127.0.0.1:3081` | 301 / 530 |  |  | cloudflare | SSL Corporation | 22:19:53 |
| `marketing.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8897` | 301 / 200 |  | eve | cloudflare | SSL Corporation | 22:19:53 |
| `mcp-cf-portal.nexifyai.cloud` | CNAME `gateway.agents.cloudflare.com` · Proxy | 301 / 404 |  |  | cloudflare | Google Trust Services | 22:19:54 |
| `mcp-gateway.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:3115` | 301 / 302 | → Cloudflare-Access-Anmeldung |  | cloudflare | SSL Corporation | 22:19:54 |
| `mobile.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 200 |  | NeXifyAI Mobile | cloudflare | SSL Corporation | 22:19:54 |
| `myadmin.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `https://127.0.0.1:443` | 301 / 302 | → `system.nexifyai.cloud/workspace` |  | cloudflare | SSL Corporation | 22:19:54 |
| `mypad.nexifyai.cloud` | CNAME `nexifyai.cloud.cdn.hstgr.net` · nur DNS | 301 / 200 |  | Paperclip | hcdn | Let's Encrypt | 22:19:54 |
| `n8n.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8005` | 301 / 200 |  |  | cloudflare | SSL Corporation | 22:19:54 |
| `new.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8905` | 301 / 301 | → `www.nexifyai.cloud/` |  | cloudflare | SSL Corporation | 22:19:54 |
| `nex-agentic-ai.nexifyai.cloud` | CNAME `sites.framer.app` · nur DNS | 308 / 200 |  | NeX2fly-NeXify-Agentur-Repo | Framer/6d4c3c4 | Let's Encrypt | 22:19:54 |
| `nex2fly.nexifyai.cloud` | CNAME `sites.framer.app` · nur DNS | 308 / 200 |  | My Framer Site | Framer/6d4c3c4 | Let's Encrypt | 22:19:54 |
| `nexifyai.cloud` | CNAME `79910370a5cd2dfb.vercel-dns-016.com` · nur DNS | 308 / 200 |  | Ein Gespräch. Ein Projekt, das passt. · NeXify AI | Vercel | Let's Encrypt | 22:19:55 |
| `oauth.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8810` | 301 / 200 |  | NeXifyAI OAuth-Callback | cloudflare | SSL Corporation | 22:19:55 |
| `onyx.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `https://localhost:443` | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:55 |
| `pad.nexifyai.cloud` | A `169.58.169.111` · Proxy | 301 / 000 (Zeitüberschreitung 25 s) |  |  |  | SSL Corporation | 22:19:55 |
| `portal.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 301 | → `myadmin.nexifyai.cloud/` |  | cloudflare | SSL Corporation | 22:19:55 |
| `postfach.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8786` | 301 / 302 | → Cloudflare-Access-Anmeldung |  | cloudflare | SSL Corporation | 22:19:55 |
| `prometheus.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:55 |
| `rag.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:9621` | 301 / 307 | → `rag.nexifyai.cloud/lightrag/webui/` |  | cloudflare | SSL Corporation | 22:19:55 |
| `shop.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 301 | → `teileklar.shop/` |  | cloudflare | SSL Corporation | 22:19:56 |
| `skyvern.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → kein Eintrag in der Tunnel-Zuordnung (Rest: 404) | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:56 |
| `space.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 526 |  |  | cloudflare | SSL Corporation | 22:19:56 |
| `ssh.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `ssh://localhost:22` | 301 / 200 |  |  | cloudflare | SSL Corporation | 22:19:56 |
| `system.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:56 |
| `team.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 301 | → `myadmin.nexifyai.cloud/` |  | cloudflare | SSL Corporation | 22:19:56 |
| `traefik.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8082` | 301 / 404 |  |  | cloudflare | SSL Corporation | 22:19:57 |
| `typefully.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8898` | 301 / 200 |  | eve | cloudflare | SSL Corporation | 22:19:57 |
| `vorschau.nexifyai.cloud` | A srv1941843 · nur DNS | 301 / 401 |  |  |  | Let's Encrypt | 22:19:57 |
| `vs.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `https://localhost:8443` | 301 / 401 |  |  | cloudflare | SSL Corporation | 22:19:57 |
| `webui.nexifyai.cloud` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8787` | 301 / 302 | → `webui.nexifyai.cloud/login` |  | cloudflare | SSL Corporation | 22:19:57 |
| `wissen.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 307 | → `wissen.nexifyai.cloud/lightrag/webui/` |  | cloudflare | SSL Corporation | 22:19:57 |
| `work2work.nexifyai.cloud` | CNAME `ov3m7d0i.up.railway.app` · Proxy | 301 / 000 (Zeitüberschreitung 25 s) |  |  |  | SSL Corporation | 22:19:58 |
| `workplace.nexifyai.cloud` | Tunnel `nexifyai-duesseldorf` (srv1941843) → `https://localhost:443` | 301 / 200 |  | NeX2fly Agentic AI | cloudflare | SSL Corporation | 22:19:58 |
| `workspace.nexifyai.cloud` | A srv1243952 · Proxy | 301 / 302 | → `system.nexifyai.cloud/workspace` |  | cloudflare | SSL Corporation | 22:19:58 |
| `www.nexifyai.cloud` | CNAME `cname.vercel-dns.com` · nur DNS | 308 / 200 |  | Ein Gespräch. Ein Projekt, das passt. · NeXify AI | Vercel | Let's Encrypt | 22:19:59 |

### 3.5 `nexify-automate.com` (W · 22:20 UTC)

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `nexify-automate.com` | A `192.0.2.1` · Proxy | 301 / 301 | → `www.nexifyai.cloud/` |  | cloudflare | Let's Encrypt | 22:19:55 |
| `no-resend.send.nexify-automate.com` | CNAME `links1.resend-dns.com` · nur DNS | 301 / 400 |  |  |  | Amazon | 22:19:55 |
| `www.nexify-automate.com` | CNAME `dc76080e3a37b4bf.vercel-dns-016.com` · Proxy | 301 / 301 | → `www.nexifyai.cloud/` |  | cloudflare | Let's Encrypt | 22:19:59 |

### 3.6 Geparkte Domains (W · 22:19–22:20 UTC)

Alle zeigen die Hostinger-Parkseite („Parked Domain name on Hostinger DNS system“).

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `teileklar.de` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Google Trust Services | 22:19:56 |
| `www.teileklar.de` | CNAME `teileklar.de` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Google Trust Services | 22:20:00 |
| `teileklar.store` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:57 |
| `www.teileklar.store` | CNAME `teileklar.store` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:20:01 |
| `teileklar.pro` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:56 |
| `www.teileklar.pro` | CNAME `teileklar.pro` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:20:00 |
| `ainexi2fyi.de` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:47 |
| `www.ainexi2fyi.de` | CNAME `ainexi2fyi.de` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:58 |
| `ainexi2fyi.studio` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:48 |
| `www.ainexi2fyi.studio` | CNAME `ainexi2fyi.studio` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:59 |
| `ainexi2fyi.click` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:47 |
| `www.ainexi2fyi.click` | CNAME `ainexi2fyi.click` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:58 |
| `ainexi2fyi.shop` | A 2.57.91.91 (Hostinger-Parkseite) | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:48 |
| `www.ainexi2fyi.shop` | CNAME `ainexi2fyi.shop` | 200 / 200 |  | Parked Domain name on Hostinger DNS system | hcdn | Let's Encrypt | 22:19:59 |

### 3.7 Kundenzonen, nur von außen (W · 22:19–22:20 UTC)

Ein Abruf von `/` je Adresse, ohne Titel, ohne Inhalte. `autodiscover`/`autoconfig` antworten bei K4 über https nicht, weil der Mail-Anbieter für diesen Namen kein Zertifikat ausliefert; das ist bei solchen Hilfsnamen üblich.

| Adresse | DNS-Ziel und Zuordnung | http / https | Weiterleitung (https) | Titel | `server` | TLS-Aussteller | UTC |
|---|---|---|---|---|---|---|---|
| `(K1-Hauptadresse)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8095` | 301 / 301 | → `www.(K1)/` |  | cloudflare | Google Trust Services | 22:19:47 |
| `autodiscover.(K1)` | CNAME `adsredir.ionos.info` · Proxy | 301 / 302 | → `autodiscover.1and1.info/Autodiscover/Autodiscove` |  | cloudflare | Google Trust Services | 22:19:49 |
| `www.(K1)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8095` | 301 / 200 |  |  | cloudflare | Google Trust Services | 22:19:58 |
| `api.(K2)` | CNAME `cname.vercel-dns.com` · nur DNS | 308 / 402 |  |  | Vercel | Let's Encrypt | 22:19:48 |
| `app.(K2)` | CNAME `6ef697bff0875cee.vercel-dns-016.com` · nur DNS | 308 / 402 |  |  | Vercel | Let's Encrypt | 22:19:49 |
| `beauty-group.(K2)` | CNAME `cname.vercel-dns.com` · nur DNS | 308 / 402 |  |  | Vercel | Let's Encrypt | 22:19:50 |
| `(K2-Hauptadresse)` | CNAME `6ef697bff0875cee.vercel-dns-016.com` · nur DNS | 308 / 402 |  |  | Vercel | Let's Encrypt | 22:19:50 |
| `www.(K2)` | CNAME `6ef697bff0875cee.vercel-dns-016.com` · nur DNS | 308 / 402 |  |  | Vercel | Let's Encrypt | 22:19:59 |
| `(K3-Hauptadresse)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8096` | 301 / 200 |  |  | cloudflare | Google Trust Services | 22:19:53 |
| `www.(K3)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:8096` | 301 / 200 |  |  | cloudflare | Google Trust Services | 22:19:59 |
| `admin.(K4)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:3088` | 301 / 302 | → Cloudflare-Access-Anmeldung |  | cloudflare | Google Trust Services | 22:19:47 |
| `autoconfig.(K4)` | CNAME `autoconfig.mail.hostinger.com` · nur DNS | 200 / 000 (TLS-Name passt nicht) |  |  |  |  | 22:19:49 |
| `autodiscover.(K4)` | CNAME `autodiscover.mail.hostinger.com` · nur DNS | 200 / 000 (TLS-Name passt nicht) |  |  |  |  | 22:19:50 |
| `(K4-Hauptadresse)` | Tunnel `nexifyai-agentur-cloudflare-tunnel` (srv1243952) → `http://127.0.0.1:3088` | 301 / 307 | → `(K4)/de` |  | cloudflare | Google Trust Services | 22:19:57 |
| `www.(K4)` | CNAME `(K4)` · Proxy | 301 / 307 | → `www.(K4)/de` |  | cloudflare | Google Trust Services | 22:20:01 |
| `admin-drive.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 302 / 302 | → `admin-drive.(SK)/web/admin/login` |  | cloudflare | Google Trust Services | 22:19:47 |
| `app.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 301 / 301 | → `(SK)/` |  | cloudflare | Google Trust Services | 22:19:49 |
| `connector.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 404 / 404 |  |  | cloudflare | Google Trust Services | 22:19:51 |
| `(SK-Hauptadresse)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 301 / 200 |  |  | cloudflare | Google Trust Services | 22:19:51 |
| `drive.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 302 / 302 | → `drive.(SK)/web/client/login` |  | cloudflare | Google Trust Services | 22:19:52 |
| `file.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 301 / 301 | → `drive.(SK)/` |  | cloudflare | Google Trust Services | 22:19:52 |
| `ki.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 302 / 302 | → Cloudflare-Access-Anmeldung |  | cloudflare | Google Trust Services | 22:19:53 |
| `lern.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 200 / 200 |  |  | cloudflare | Google Trust Services | 22:19:53 |
| `lms.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 302 / 302 | → `lms.(SK)/dmz/` |  | cloudflare | Google Trust Services | 22:19:53 |
| `onlyoffice.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 302 / 302 | → `onlyoffice.(SK)/welcome/` |  | cloudflare | Google Trust Services | 22:19:55 |
| `preview.(SK)` | CNAME `custom-domains.chatgpt.site` · Proxy | 302 / 200 |  |  | cloudflare | Google Trust Services | 22:19:55 |
| `ssh.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 200 / 200 |  |  | cloudflare | Google Trust Services | 22:19:56 |
| `www.(SK)` | Tunnel `Tunnel der Kundenzone SK` (Kundenserver) | 301 / 301 | → `(SK)/` |  | cloudflare | Google Trust Services | 22:19:59 |

Auffällig, ohne Bewertung des Kundenprojekts: Alle fünf Adressen der Kundenzone K2 antworten mit **402** von Vercel.

### 3.8 Server, Container, Firewall (H · 22:16–22:19 UTC)

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | 72.62.152.47, `2a02:4780:41:aaea::1` | 179.198.195.91, `2a02:4780:7e:ef02::1` |
| System, Zustand | Ubuntu 26.04, `running`, angelegt 03.01.2026 | Ubuntu 24.04, `running`, angelegt 30.08.2026 |
| Firewall-Gruppe | `nexifyai-minimal-20260713` (327623), synchron | dieselbe Gruppe, synchron |
| Container laut API | nicht lesbar (`[VPS:2044]`) | 20 Compose-Projekte mit Containern, 2 ohne (`dify-dqiq`, `headroom-qsx8`), 10 beendete Mess-Projekte |
| Sicherungen | 5, neueste 14.11. 18:41 UTC | 5, neueste 14.11. 16:14 UTC |
| Snapshot | 14.11. 11:47 UTC, läuft 15.11. 11:47 UTC ab | ebenso |
| Tunnel von hier | `nexifyai-agentur-cloudflare-tunnel`, 4 Verbindungen, aktiv seit 26.10. | `nexifyai-duesseldorf`, 4 Verbindungen, aktiv seit 09.11. 09:33 UTC |
| Adressen, die hierher zeigen | 18 A-Einträge in `nexifyai.cloud` (hinter Cloudflare), `teileklar.shop`, `www.teileklar.shop`, `unternehmensbot.eu` mit `www` und `home` (direkt), dazu 34 Namen über den Tunnel | `codex`, `vorschau`, `hooks` (direkt, ohne Cloudflare), dazu alle Adressen des Tunnels |

Firewall-Regeln der Gruppe (unverändert seit 13.09.2026): TCP 22, 80, 443, 2222 und UDP 443, 51820, 51821, Quelle jeweils beliebig. Stimmt mit dem Server-Befund überein.

Auf srv1941843 an alle Schnittstellen gebundene Container-Ports (H): 4310, 4311, 6791 (Convex), 3001 (LibreChat-Verwaltung), 9621 (LightRAG). Keiner davon steht in der Firewall-Gruppe; von außen wurden sie nicht geprüft. Traefik und Hermes laufen mit `network_mode: host`; ihre Ports zeigt die API deshalb nicht.

SSH-Schlüssel im Hostinger-Konto (nur Namen, 15 Stück, H · 22:16 UTC): `cowork-deploy-ephemeral`, `aionui-agent`, `nexify-agent-key`, `cowork-teileklar-mobilefix-2026-09-01`, `nexify-claude-terminal-2026-09-01`, `cowork-claude-device-2026-08-31`, `cowork-claude-terminal-2026-08-31`, `cowork-claude-incident-2026-08-30`, `nexify-agents-micode-20260707`, `nexify-agents-vps-2026-07-06`, `emergent-agent`, `ignore-this`, `temp-check`, `default`, `claude-omni-auditor-2026`. Ob sie auf den Servern hinterlegt sind, sagt die Liste nicht.

## 4. Widersprüche: Dokumentation gegen Messung

| # | Dokumentation sagt | Messung sagt | Messweg, UTC |
|---|---|---|---|
| W1 | `config/loesungsregister.json` (`hermes-webui`): „srv1941843, Port 8788, über Traefik unter `unternehmensbot.eu` öffentlich erreichbar“; ebenso `server-befund-2026-11-14.md`, Abschnitt „Port 8788“, und `PROGRESS.md` | `unternehmensbot.eu`, `www` und `home` zeigen seit 08.11. auf **srv1243952**. Die Traefik-Route auf srv1941843 mag in der Datei stehen, wird über diesen Namen aber nicht erreicht. Die Außenmessung im Server-Befund (302 auf `login`, 401) hat srv1243952 getroffen. Öffentlich erreichbar ist eine Anmeldeseite also tatsächlich, aber auf dem anderen Server. | H, D, W · 22:16–22:21 |
| W2 | Server-Befund und `ops/hermes/README.md`: Hermes-Oberfläche auf `0.0.0.0:8788` (srv1941843) | Auf srv1243952 führt die Tunnel-Zuordnung `www.nexifyai.cloud` und `nexifyai.cloud` auf `127.0.0.1:8788` und `hermes-dash`/`webui` auf `127.0.0.1:8787`. Derselbe Port bedeutet je Server etwas anderes. `docs/GITHUB-SETUP-2026-09-30.md:55` nennt 8788 als alte Website. | C · 22:22 |
| W3 | `hostinger-srv1243952` im Lösungsregister: „läuft unbelegt“; Server-Befund: Bestand der Dienste OFFEN | 57 der 126 gemessenen Adressen führen auf diesen Server (18 A-Einträge in `nexifyai.cloud`, 34 Namen über den Tunnel, `teileklar.shop` mit `www`, `unternehmensbot.eu` mit `www` und `home`). Was dort im Einzelnen läuft, bleibt uneinsehbar; dass er trägt, ist belegt. | C, D, W · 22:17–22:22 |
| W4 | Lösungsregister `cloudflare-dns`: „Zonen `nexifyai.de` und `nexifyai.cloud`“ | Das Konto führt neun Zonen, darunter `teileklar.shop`, `nexify-automate.com` und fünf Kundenzonen. | C · 22:17 |
| W5 | `AGENTS.md`, Nachtrag 14.11.: vier Hauptadressen antworten mit 200 von Vercel | bestätigt (22:19–22:20 UTC). Nicht dokumentiert ist, dass `nexifyai.de` dafür am Vorabend den DNS-Anbieter gewechselt hat und dabei Einträge verloren gingen (W6, W7). | W, C |
| W6 | `docs/deployment/clerk-dns.md` (Stand 26.10.): fünf Clerk-CNAMEs fehlen, sollen angelegt werden | Sie wurden bei Hostinger angelegt (im Schnappschuss vom 29.10. vier, `clk2._domainkey` am 29.10. 00:11 UTC ergänzt) und waren dort bis zum 13.11. wirksam. Seit dem Nameserver-Wechsel fehlen sie öffentlich wieder (NXDOMAIN bei beiden Auflösern). | H, D · 22:17–22:21 |
| W7 | `mailversand-zustand-2026-11-14.md`: SPF und DMARC von `nexifyai.de` gesetzt; DKIM des Postfach-Anbieters nicht behandelt | SPF, DMARC, MX lösen auf. Die drei `hostingermail-*._domainkey` lösen **weder als CNAME noch als TXT** auf (Abschnitt 5). | D · 22:20 |
| W8 | `mailversand-zustand-2026-11-14.md`, B-2: Resend-Einträge für `nexifyai.de` fehlen | Seit 22:03 UTC vorhanden und öffentlich auflösbar (`resend._domainkey` TXT, `send` MX und TXT). Der dortige Befund ist damit überholt; ob Resend die Domain als bestätigt führt, wurde hier nicht gelesen. | C, D · 22:20 |
| W9 | Aufräumplan und Lösungsregister (`cognee-server`): `brain.nexifyai.cloud` → srv1941843, 404 von Traefik | bestätigt: Tunnel `nexifyai-duesseldorf` → `https://localhost:443`, Antwort 404 „404 page not found“. | C, W · 22:20–22:22 |
| W10 | `AGENTS.md`: Shop-API antwortet mit 503 `project_binding_unverified` | 503 bestätigt; der Grund lautet jetzt `runtime_binding_unavailable` / `payment_mode_unbound` (Pfad `/api/shop/health`). Ob das derselbe Zustand unter anderem Namen ist, ist nicht geprüft. | W · 22:21 |
| W11 | Lösungsregister `librechat`: defekt, srv1941843 | `librechat.nexifyai.cloud` zeigt auf den toten Tunnel `nexifyai-contabo` (530). Die Zuordnung des Tunnels `nexifyai-duesseldorf` enthält bereits einen Eintrag für `librechat` (und `agenten`), das DNS nutzt ihn nicht. | C, W · 22:19–22:22 |
| W12 | Tunnel-Zuordnung srv1243952 enthält `vorschau.nexifyai.cloud` → `127.0.0.1:8907` | DNS: `vorschau` zeigt direkt auf srv1941843 (ohne Proxy), Antwort 401 mit Traefik-Basisschutz. Der Tunnel-Eintrag ist tot. | C, W · 22:20–22:22 |
| W13 | Server-Befund: Firewall-Gruppe, 15 SSH-Schlüssel, zehn Mess-Projekte | alle drei bestätigt, unverändert. | H · 22:16–22:19 |

## 5. Nebenbefund: Hostinger-DKIM und Hilfsnamen von `nexifyai.de` hinter dem Proxy

Gemessen (D, 22:20 UTC, beide Auflöser gleich):

| Name | Abfrage | Antwort |
|---|---|---|
| `hostingermail-a/b/c._domainkey.nexifyai.de` | CNAME | leer (kein Eintrag, kein Fehlercode) |
| `hostingermail-a/b/c._domainkey.nexifyai.de` | TXT | leer |
| zum Vergleich `hostingermail-a._domainkey.nexifyai.cloud` (Proxy aus) | TXT | CNAME auf Hostinger und dahinter der DKIM-Schlüssel |
| `hostingermail-a.dkim.mail.hostinger.com` (das Ziel selbst) | TXT | DKIM-Schlüssel vorhanden |
| `autoconfig.nexifyai.de`, `autodiscover.nexifyai.de` | CNAME | leer; über https antwortet Cloudflare mit 200 |
| `nexifyai.de` | MX, TXT (SPF), `_dmarc` | vorhanden und richtig |

Einordnung: Ein CNAME mit eingeschaltetem Proxy wird von Cloudflare nicht als CNAME ausgeliefert, sondern als Adresse von Cloudflare. Ein empfangender Mailserver, der den DKIM-Schlüssel als TXT unter `hostingermail-a._domainkey.nexifyai.de` sucht, findet nichts.

Risiko für die Postfächer:

- **Empfang:** nicht betroffen. MX zeigt unverändert auf Hostinger.
- **Versand aus den Postfächern `@nexifyai.de`:** Die DKIM-Signatur ist seit 13.11. 21:53 UTC nicht prüfbar. SPF besteht weiter und DMARC steht auf `p=none`, deshalb wird nichts hart abgewiesen. Die Zustellung kann trotzdem leiden (Einstufung als Werbung oder unerwünscht), und weitergeleitete Mails verlieren jede gültige Prüfung, weil SPF eine Weiterleitung nicht übersteht. BELEGT ist die fehlende Auflösung, nicht eine einzelne verlorene Mail.
- **Einrichtung von Mailprogrammen:** `autoconfig` antwortet über den Proxy weiter (200, Hinweistext des Hostinger-Dienstes); `autodiscover` ebenfalls 200. Ob die automatische Einrichtung in Outlook oder Thunderbird noch gelingt, ist nicht geprüft.
- In `nexifyai.cloud` und in Kundenzone K4 stehen dieselben Einträge **ohne** Proxy; dort besteht das Problem nicht.

Geändert wurde nichts. Abhilfe in „Entscheidungen des Inhabers“, E2.

## 6. Was nach Ruflo aussieht

Suche im Repository (R, 22:21 UTC, Commit `9c9c806`):

| Fundstelle | Inhalt | Einordnung |
|---|---|---|
| `config/integrationen.json:343` | „RuFlo Federation / ruflo-ai-team (needs reconnect)“ in der Liste abgelaufener oder getrennter Konnektoren, Stand 09.11.2026 09:15 UTC | Ruflo ist hier ein **Konnektor der Claude-Umgebung** (MCP), kein Dienst auf einem Server und kein Port. Einziger Treffer im ganzen Repository. |
| `config/loesungsregister.json` | kein Eintrag „ruflo“ | Ruflo ist im Lösungsregister nicht geführt. |
| `server-befund-2026-11-14.md:28`, `:75`; `ops/hermes/README.md:27`, `:165`; Lösungsregister `hermes-webui` | Port 8788 = Web-Oberfläche von Hermes auf srv1941843 | Quelle ist die Traefik-Datei auf srv1941843 und das Containerprotokoll (Messung der Vorgängersitzung, hier nicht wiederholt, weil dafür ein Mess-Container nötig wäre). |
| `docs/GITHUB-SETUP-2026-09-30.md:55` | „Produktion `www.nexifyai.cloud` noch altes Konzept (FRA `:8788`)“ | Auf srv1243952 ist 8788 die **alte Website**; die Tunnel-Zuordnung führt `www.nexifyai.cloud` und `nexifyai.cloud` bis heute dorthin (C, 22:22 UTC), das DNS aber nicht mehr. |

Ergebnis: Für „Ruflo hinter Port 8788“ gibt es keinen Beleg. Belegt sind zwei verschiedene Dienste hinter 8788, je einer pro Server, und eine Anmeldeseite „NeX Agentic AI — Anmelden“ unter `unternehmensbot.eu` auf srv1243952. In dieser Sitzung ist ein Konnektor mit Werkzeugen namens `federation_*`, `claims_*` und `channel_*` angebunden (ANNAHME: das ist der im Register genannte RuFlo-Konnektor); er wurde nicht aufgerufen. Ob auf srv1243952 ein Ruflo-Prozess läuft, ist OFFEN (Server nicht einsehbar).

## 7. Mögliche Erklärungen für Störungen der letzten Tage

### BELEGT

| # | Sachverhalt | Zeitraum (UTC) | Beleg |
|---|---|---|---|
| B1 | `nexifyai.de` zeigte auf srv1243952 statt auf Vercel | 13.11. 09:34 bis 21:53; erneut 14.11. 03:18 bis 05:36 | H Schnappschuss 196682832; C Audit-Log. Deckt sich mit `AGENTS.md` („Stand 13.11.: Domains zeigen nicht auf dieses Vercel-Projekt“). |
| B2 | Nameserver-Wechsel von `nexifyai.de`; während der Umstellung können Auflöser bis zum Ablauf ihrer Zwischenspeicher unterschiedliche Ziele geliefert haben | ab 13.11. 21:53 | C Audit-Log `nameservers_confirmed` |
| B3 | Fünf Clerk-Namen von `nexifyai.de` fehlen öffentlich | seit 13.11. 21:53 | H Zone, C Zone, D NXDOMAIN (22:20) |
| B4 | DKIM des Postfach-Anbieters für `nexifyai.de` nicht auflösbar | seit 13.11. 21:53 | D (22:20), C `proxied: true` |
| B5 | `unternehmensbot.eu` vom Hostinger-Webhosting über das Hostinger-CDN auf srv1243952 umgestellt; die frühere Website unter dieser Adresse ist damit nicht mehr erreichbar | 01.11. 11:14, 08.11. 09:50 | H Schnappschüsse 193231342, 195196695, 195196707 |
| B6 | Tunnel `nexifyai-contabo` ohne Verbindung; `agenten` und `librechat` antworten mit 530 | seit 09.11. 10:40 | C Tunnel-Liste, W (22:19) |
| B7 | Tunnel-Zuordnungen am 09.11. neu geschrieben, `gitlab` auf srv1941843 umgehängt | 09.11. 09:30–09:33 | C Audit-Log |
| B8 | `www.nexifyai.cloud` am 14.11. umgestellt | 14.11. 06:47–06:48 | C Audit-Log; vorheriges Ziel nicht im Log |
| B9 | `demo` und `den` 502, `space` 526, `pad` und `work2work` ohne Antwort, `agentmemory-api` 503 (so in der Tunnel-Zuordnung fest eingetragen) | Zeitpunkt des Ausfalls unbekannt, gemessen 22:19–22:20 | W |
| B10 | Container auf srv1941843 um den 02.11. neu gestartet, `hermes` um den 05.11. | siehe Zeitleiste | H Container-Liste (Laufzeiten) |

### ANNAHME

| # | Annahme | Was dafür spricht | Was fehlt |
|---|---|---|---|
| A1 | Die Umstellungen von B1 stammen aus dem Versuch, die neue Website erst auf dem eigenen Server, dann auf Vercel zu zeigen; der Wechsel am 14.11. 03:18 kam von einem Programm, nicht von Hand. | Akteurstyp „Benutzer über Schnittstelle“ nur bei diesem einen Schritt; alle anderen über die Oberfläche. | Wer oder welche Sitzung den Schlüssel benutzt hat. |
| A2 | B3 ist heute ohne sichtbare Wirkung, weil die Produktion Clerk nicht eingeschaltet hat. | `docs/deployment/environment-variables.md`: Aktivierungsschalter deaktiviert; im HTML der Startseite keine Clerk-Adresse; `/anmelden` antwortet 200. | Ein Anmeldeversuch (bewusst nicht gemacht). Sobald Clerk eingeschaltet wird, fehlen die Einträge. |
| A3 | Hinter `unternehmensbot.eu` auf srv1243952 läuft eine zweite Instanz derselben Agenten-Oberfläche wie auf srv1941843. | Gleicher Titel wie `hermes-dash` (Tunnel nach srv1243952:8787); gleiches Antwortmuster, wie es der Server-Befund für Hermes beschreibt. | Einblick in srv1243952. |
| A4 | Der Zertifikatsdienst, der am 09.11. und 14.11. Prüfeinträge schrieb, läuft auf srv1243952 und besitzt einen Cloudflare-Schlüssel mit Schreibrecht auf DNS. | Die Namen (`wissen`, `factory`, `cockpit`, `teileklar.shop`) zeigen auf srv1243952. | Einblick in srv1243952. |
| A5 | Der Neustart um den 02.11. (B10) hängt mit `ct_set_limits` vom 01.11. zusammen. | zeitliche Nähe | kein Neustart im Aktionsverlauf |

### OFFEN

- Welche Störung der Inhaber tatsächlich bemerkt hat (Adresse, Zeitpunkt, Fehlerbild). Ohne diese Angabe lässt sich keiner der Punkte oben als Ursache bestätigen.
- Alles, was auf srv1243952 läuft: Dienste, Ports, Reverse-Proxy, ob dort Hermes, die alte Website oder Ruflo lauschen. Braucht eine Sitzung mit Shell oder die Freigabe für einen Mess-Weg.
- Vorherige Ziele von `gitlab.nexifyai.cloud` (09.11.) und `www.nexifyai.cloud` (14.11.): Das Audit-Log liefert bei diesen Änderungen keinen alten Wert.
- Inhalt der Tunnel-Zuordnungen vor dem 09.11. 09:30 UTC und der Regelsatz-Änderung vom 13.11. 11:20 UTC.
- Ob die Traefik-Route für `unternehmensbot.eu` auf srv1941843 noch besteht (nicht erneut gelesen).
- Wer die Hostinger-DNS-Änderungen ausgelöst hat (Schnappschüsse nennen keinen Akteur).
- Ob Zustellprobleme bei Mails von `@nexifyai.de` tatsächlich aufgetreten sind.
- `ssh.nexifyai.cloud` und die entsprechende Adresse der Kundenzone SK antworten auf `GET /` mit 200 ohne Weiterleitung zur Cloudflare-Access-Anmeldung. Ob davor ein Zugriffsschutz steht, wurde nicht geprüft.
- TLS-Aussteller und Erreichbarkeit aus anderen Netzen; gemessen wurde nur aus der Sitzungsumgebung.

## 8. Entscheidungen des Inhabers

Nichts davon wurde ausgeführt. Jede Zeile nennt den Rückweg.

| # | Entscheidung | Empfehlung | Rückweg |
|---|---|---|---|
| E1 | Clerk-Einträge von `nexifyai.de` bei Cloudflare nachtragen? | Ja, sobald Anmeldung über Clerk gewollt ist: fünf CNAME, **ohne Proxy**, Werte aus der Hostinger-Zone übernehmen und vorher im Clerk-Dashboard abgleichen (`docs/deployment/clerk-dns.md`). | Die fünf Einträge wieder löschen; sie stehen weiter in der Hostinger-Zone. |
| E2 | DKIM-, `autoconfig`- und `autodiscover`-Einträge von `nexifyai.de` auf „nur DNS“ stellen? | Ja, zeitnah. Fünf Einträge, je ein Schalter. Danach `hostingermail-a._domainkey.nexifyai.de` als TXT nachmessen. | Proxy wieder einschalten (stellt den heutigen Zustand her). |
| E3 | Wohin soll `unternehmensbot.eu` zeigen, und darf dort eine Anmeldeseite öffentlich stehen? | Erst klären, was auf srv1243952 antwortet (OFFEN). D-019 Folge 4 verlangt „nicht öffentlich“. | Hostinger hält die Schnappschüsse 193231342 (Stand vor dem CDN), 195196695 (Stand mit CDN) vor; Wiederherstellen stellt den jeweiligen Stand her. |
| E4 | Tunnel `nexifyai-contabo`: wieder verbinden oder `agenten` und `librechat` auf `nexifyai-duesseldorf` umhängen? | Umhängen, wenn die Dienste auf srv1941843 gebraucht werden; die Zuordnung dort enthält beide Namen schon. Sonst die beiden Adressen stilllegen. | CNAME-Ziel zurück auf den Tunnel `8959c86f-…` (heutiger Wert, Abschnitt 3.4). |
| E5 | Abgehängte Hostinger-Zonen (`nexifyai.de`, `nexifyai.cloud`, `teileklar.shop`, K3, K4) behalten? | Behalten und nicht mehr ändern: Sie sind der Rückweg zum Stand vor dem Umzug und die einzige Quelle für die Clerk-Werte. | Entfällt (es wird nichts geändert). Rückweg des Umzugs selbst: Nameserver bei Hostinger zurück auf `ns1/ns2.dns-parking.com`; vorher die Hauptadresse dort prüfen, sie zeigt auf srv1243952. |
| E6 | Tote Adressen in `nexifyai.cloud` aufräumen (`demo`, `den`, `space`, `pad`, `work2work`, `agentmemory-api`, die 404-Namen, ungenutzte Tunnel-Einträge)? | Erst nach Sichtung je Name; nichts löschen, bevor die Zone exportiert ist (D-016). | Zonenexport vor der Änderung; Einträge daraus wieder anlegen. |
| E7 | Dokumentation berichtigen: `hermes-webui` und `hostinger-srv1243952` im Lösungsregister, „Port 8788“ im Server-Befund, `cloudflare-dns` (neun Zonen)? | Ja, als eigener PR durch die koordinierende Sitzung; dieses Dokument ist die Quelle. | `git revert` des PR. |
| E8 | Soll srv1243952 einsehbar werden (Sitzung mit Shell oder ein freigegebener, nur lesender Mess-Weg)? | Ja. Der Server trägt den größeren Teil der öffentlichen Adressen und ist der blinde Fleck dieser Inventur. | Entfällt (nur lesen). |
| E9 | Schlüssel mit Schreibrecht auf Cloudflare-DNS sichten: Ein Dienst schreibt als „Benutzer über Schnittstelle“ (A4), am 14.11. 18:42 UTC kam ein weiterer Token dazu. | Im Cloudflare-Dashboard die Liste der Token und die Verwendung des globalen Schlüssels prüfen; Zertifikatsdienste auf einen Token mit Recht nur für die nötige Zone umstellen. | Token können einzeln widerrufen und neu erstellt werden; vor dem Widerruf klären, welcher Dienst ihn nutzt. |
| E10 | Zugriffsschutz für `ssh.nexifyai.cloud` prüfen (OFFEN-Liste). | Im Cloudflare-Dashboard nachsehen, ob eine Access-Anwendung davor liegt. | Entfällt (nur prüfen). |

Bereits anderswo geführt und hier nur bestätigt: SSH für jede Quelle offen (Server-Befund S8), 15 SSH-Schlüssel im Konto (S6), DMARC `p=none` ohne Berichtsadresse und Rücklaufpfad von `nexifyai.cloud` (`mailversand-zustand-2026-11-14.md`, B-1 und B-3), Snapshot-Ablauf am 15.11. 11:47 UTC.

## 9. Was nicht lesbar war

- srv1243952: Container, Ports, Routen, Protokolle (Hostinger-API `[VPS:2044]`).
- Hostinger: Akteur einer DNS-Änderung; Schnappschüsse zwischen 09.05. und 01.11.2026 für `unternehmensbot.eu` wurden nicht einzeln gelesen (außerhalb des Zeitraums).
- Cloudflare: alte Werte bei `update`-Einträgen des Audit-Logs; Inhalt von Regelsätzen, Access-Anwendungen und Worker-Skripten wurde nicht abgerufen.
- Traefik-Datei `dynamic.yml` auf srv1941843: nicht erneut gelesen (wäre nur mit einem Mess-Container möglich, der in dieser Sitzung nicht erlaubt war).
- Vercel- und Resend-Konto: nicht abgefragt.

## 10. Nachtrag Shop: wer liefert `teileklar.shop` aus (14.11.2026, 22:39–22:40 UTC)

Anlass: Rückfrage der koordinierenden Sitzung nach einer Frage des Inhabers. Nur gelesen, nichts umgeschaltet. Messwege wie oben (H, C, W, R); je ein `GET` je Pfad.

### 10.1 Messung

| Pfad | `teileklar.shop` (Cloudflare-Proxy → srv1243952) | `nexifyai.de` und die Vercel-Adresse der Produktion | UTC |
|---|---|---|---|
| `/api/shop/products?limit=1` | **200**, Schlüssel nur `items`, `total`; `total` = 3720 | **503** `runtime_binding_unavailable`, Grund `database_binding_missing_or_unsuitable` | 22:39 |
| `/api/shop/categories` | 404 `{"detail":"Not Found"}` | 503, derselbe Grund | 22:39 |
| `/api/shop/status` | 404 `{"detail":"Not Found"}` | 503, derselbe Grund | 22:39 |
| `/api/shop/health` | 404 `{"detail":"Not Found"}` | 503, Grund `payment_mode_unbound` | 22:39 |
| `/` | 200, `last-modified: Wed, 14 Oct 2026 15:56:12 GMT`, statische Seite mit `support.js` und `nx-page.js` | 200 von Vercel | 22:39 |

Auf `main` (R, Commit `9c9c806`, `apps/shop-api/shop/catalog_api.py:58–90`) gibt es `/status`, `/categories`, `/products` und `/products/{product_id}`; die Produktliste liefert dort zusätzlich `page`, `page_size`, `pages`, `q`, `category`. Der Dienst hinter `teileklar.shop` kennt drei dieser vier Routen nicht und liefert die kürzere Antwort. Er läuft also mit einem anderen, älteren Stand; ob es dasselbe Programm in älterer Fassung oder ein Vorgänger ist, ist nicht belegt.

### 10.2 Die drei Fragen

| Frage | Antwort | Beleg |
|---|---|---|
| Welcher Container auf srv1243952 liefert aus (Projekt, Abbild, Alter, Ports, Route)? | **Nicht lesbar.** Die Hostinger-API liefert für srv1243952 keine Container (`[VPS:2044]`). Belegt ist nur der Weg bis zum Server: `teileklar.shop` und `www` sind A-Einträge auf 72.62.152.47 mit Proxy. Die Tunnel-Zuordnung von srv1243952 enthält `teileklar.shop` nicht; der Abruf kommt also über Port 80/443 des Servers an, nicht über den Tunnel. | H 22:18, C 22:17 und 22:22 |
| Wann wurde das DNS von `teileklar.shop` zuletzt geändert, worauf zeigte es vorher? | **Zuletzt am 15.09.2026, 10:35 UTC** (Akteurstyp Benutzer über Schnittstelle): `teileklar.shop` und `www` → A 72.62.152.47. Davor seit 31.08.2026, 22:59 UTC CNAME auf den Tunnel `nexifyai-duesseldorf` (srv1941843, lokales Ziel `localhost:8090`, steht dort bis heute in der Zuordnung). Davor, 31.08. 22:47 UTC, A 2.57.91.91 (Hostinger-Parkseite). **In den letzten 14 Tagen keine Änderung** außer kurzlebigen Zertifikats-Prüfeinträgen am 14.11. 09:38 UTC. Das Muster von `unternehmensbot.eu` (frisches Umhängen) liegt hier nicht vor. | C, Audit-Log 31.08.–14.11. |
| Gibt es parallel eine Vercel-Bereitstellung des Shops mit aktuellem Stand? | **Es gibt sie, aber sie arbeitet nicht.** Der Shop-Dienst im Vercel-Projekt der Produktion antwortet auf allen geprüften Pfaden mit 503, weil Datenbank- und Zahlungsbindung fehlen. Die Routen des aktuellen Stands sind dort vorhanden (die Antwort kommt aus dem Dienst selbst, nicht als 404), liefern aber keine Daten. | W 22:39; deckt sich mit `AGENTS.md`, Nachtrag 14.11. |

### 10.3 Einordnung: Fall A, nicht Fall B

**Fall A trifft zu:** `teileklar.shop` wird von einem Dienst auf srv1243952 mit älterem Stand ausgeliefert; die Datenbank dahinter antwortet (3720 aktive Produkte). Das DNS wurde nicht kürzlich verstellt.

**Fall B scheidet heute aus:** Ein Umschalten des DNS auf Vercel würde den funktionierenden Katalog (200) durch 503 ersetzen. Vercel ist erst dann ein Ziel, wenn der Shop-Dienst dort gebunden ist (Datenbank, Zahlungsmodus; `docs/04-betrieb/anfrageweg-befund-2026-11-14.md`, Abschnitt zur Bindung).

OFFEN bleibt, was genau auf srv1243952 läuft und woraus es gebaut wurde (Entscheidung E8). Ebenso, ob auf srv1941843 hinter `localhost:8090` noch ein Shop-Dienst steht; die Container-Liste dort zeigt keinen veröffentlichten Port 8090 (H 22:18), Dienste mit `network_mode: host` wären darin aber nicht sichtbar.

### 10.4 Wege und Rückwege (nichts davon ausgeführt)

| Weg | Was nötig wäre | Rückweg |
|---|---|---|
| A1: Dienst auf srv1243952 auf den Stand von `main` bringen | Sitzung mit Shell auf srv1243952; vorher feststellen, welcher Dienst ausliefert, laufendes Abbild taggen, Hostinger-Snapshot anlegen (der heutige läuft am 15.11. 11:47 UTC ab) | altes Abbild wieder starten; notfalls Snapshot zurückspielen |
| A2: Shop-Dienst auf Vercel binden und danach das DNS umstellen | Laufzeit-Zugänge im Vercel-Projekt setzen (Entscheidung des Inhabers, D-017), `/api/shop/products`, `/categories`, `/status` dort mit 200 nachmessen, erst dann DNS | DNS zurück auf A 72.62.152.47 mit Proxy für `teileklar.shop` und `www` (heutiger Wert); der Dienst auf srv1243952 bleibt bis zur Abnahme unverändert stehen |
| Nicht empfohlen: DNS jetzt auf Vercel | – | derselbe DNS-Rückweg; bis dahin wäre der Katalog nicht erreichbar |
