# Hermes-Oberfläche als Arbeitsbereich des Inhabers · 14.11.2026

Auftrag des Inhabers Pascal Courbois vom 14.11.2026, wörtlich: „Orchestriere auch die Fertigstellung von https://unternehmensbot.eu/ (Hermes WebUI) - Mein Arbeitsbereich. Natuerlich inkl. Design etc.“ Dazu `DECISIONS.md` D-019 (Hermes ist die Orchestrierungs-Laufzeit, Modell nach `config/llm-policy.json`).

Dieses Dokument bereitet vor und ändert nichts am Server, an DNS, an Cloudflare oder an einem Konto (D-016, D-017). Kennzeichnung: **IST** = in dieser Arbeit gemessen, mit Uhrzeit (UTC). **QUELLE** = aus offizieller Dokumentation oder Quelltext gelesen, mit Version. **OFFEN** = nicht geprüft oder nicht entschieden.

## 1. Kurzfassung

1. **Die Adresse zeigt auf den anderen Server.** `unternehmensbot.eu` löst auf `72.62.152.47` auf; das ist srv1243952, nicht srv1941843, auf dem der Container `hermes` belegt ist. Auf srv1243952 ist über die Hostinger-API nichts lesbar. Welche Instanz der Inhaber heute benutzt, ist damit OFFEN und die erste Klärung vor jedem Eingriff (Schritt K0).
2. **Die Oberfläche ist `nesquena/hermes-webui` v0.52.492**, ein eigenes Projekt neben Hermes Agent. Sie bringt eine offizielle Erweiterungsschnittstelle mit: eigenes CSS, eigenes Skript und ein eigener Skin ohne Fork.
3. **Der Graphite-Skin liegt fertig unter `ops/hermes/webui/`** und ist lokal an genau dieser Version geprüft (390 und 1440 px, Bildschirmfotos unter `evidence/hermes-arbeitsbereich-2026-11-14/`). Die Anmeldeseite lässt sich so nicht gestalten; das ginge nur mit Fork oder am vorgeschalteten Proxy.
4. **Öffentlich erreichbar** sind heute die Anmeldeseite und acht weitere Pfade, darunter `/health` mit Betriebszahlen. Das widerspricht D-019 Folge 4. Abschnitt 4 nennt vier Wege mit Kosten, Bedienung und Rückweg; empfohlen wird Weg A, hilfsweise Weg B.
5. **Zwei Lücken in der Modellbindung**, die `ops/hermes/home/config.yaml` nicht schließt: Zeitpläne können ein eigenes Modell tragen, und die Oberfläche bietet eine Modell- und Reasoning-Auswahl je Gespräch. Geschlossen werden sie im Entwurf durch eine Zwischenstation an der Leitung, den Modell-Wächter (`ops/hermes/gateway/`, Abschnitt 3a); bis er eingespielt ist, gibt es nur Sichtprüfung.
6. **Nacharbeit nach unabhängiger Prüfung** (14.11.2026, Stand `efe937c`): Reihenfolge der Schritte, Prüfsummen des Bereitstell-Skripts, Bindung an die lokale Schleife, Snapshot und weitere Punkte sind berichtigt; Abschnitt 9 führt jeden Befund einzeln.

## 2. IST der öffentlichen Erreichbarkeit

Gemessen am 14.11.2026 zwischen 20:28 und 20:44 UTC mit einfachen lesenden HTTPS-Abrufen, ohne Anmeldung, ohne Anmeldeversuch. Abgerufen wurde nur, was die Anmeldeseite selbst lädt oder was der Quelltext der Oberfläche als öffentlichen Pfad führt (`api/auth.py`, `PUBLIC_PATHS`).

### Namensauflösung und TLS (20:28 UTC)

| Punkt | Messwert |
|---|---|
| A-Eintrag `unternehmensbot.eu` | `72.62.152.47` (laut Hostinger-API die Adresse von srv1243952; srv1941843 hat `179.198.195.91`) |
| Nameserver | `ns1.dns-parking.com`, `ns2.dns-parking.com`; die Zone liegt nicht bei Cloudflare |
| TLS | TLS 1.3, Zertifikat `CN=unternehmensbot.eu`, Let's Encrypt, gültig 08.11.2026 bis 06.02.2027 |
| `http://unternehmensbot.eu/` | 301 auf `https://unternehmensbot.eu/` |
| `https://www.unternehmensbot.eu/` | 302 auf `…/login?next=/` (gleiche Oberfläche) |
| Vorgeschaltetes Cloudflare | keines erkennbar (kein `cf-ray`, kein `server`-Kopf) |

### Pfade ohne Anmeldung

| Pfad | Status | Inhalt |
|---|---|---|
| `/` , `/session`, `/robots.txt` | 302 | Weiterleitung auf `/login?next=…` |
| `/login` | 200 | Anmeldeseite, Titel „NeX Agentic AI — Anmelden“, `lang="de-DE"`, lädt `static/login.js?v=v0.52.492` |
| `/api/status`, `/api/sessions`, `/api/extensions/status` | 401 | `{"error":"Authentication required"}` |
| `/extensions/…` | 302 | nur mit Anmeldung |
| `/health` | 200 | Zahl der Sitzungen (1), aktive Läufe (0), Startzeit des Dienstes (12.11.2026 21:16 UTC), Laufzeit, Zahl aller Anfragen (3238) |
| `/api/auth/status` | 200 | Anmeldearten: Passwort ein, OIDC aus, Passkeys aus |
| `/manifest.json` | 200 | Web-App-Manifest, Name „Hermes“, Farbe `#0D0D1A` |
| `/favicon.ico`, `/sw.js`, `/share` | 200 | Icon, Service Worker, Seite für geteilte Gespräche |
| `/static/style.css`, `/static/login.js` | 200 | Stylesheet (532 kB) und Skript der Oberfläche |
| `/__brand/brand.css`, `/__brand/brand.js`, `/__brand/signet.svg` | 200 | vorhandene NeXify-Überlagerung, siehe unten |

### Sicherheits-Kopfzeilen der Anmeldeseite (20:28 UTC)

Vorhanden: `strict-transport-security: max-age=31536000; includeSubDomains; preload`, `content-security-policy` (mit `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy` (Kamera, Mikrofon, Standort aus), `cross-origin-opener-policy: same-origin`, `cross-origin-resource-policy: same-origin`, `cache-control: no-store`.

Die Kopfzeilen gelten für GET (nachgemessen 21:46 UTC). Auf HEAD antwortet die Oberfläche mit 501 und nur mit `content-security-policy-report-only`; das betrifft Prüfwerkzeuge, nicht den Browser.

Auffällig: Die CSP erlaubt `'unsafe-inline'` für Skripte und Stile sowie `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com` und `static.cloudflareinsights.com`. Das ist der Auslieferungszustand der Oberfläche, keine NeXify-Einstellung. Der Graphite-Skin lädt nichts von dort.

### Vorhandene Überlagerung `/__brand/`

Die Anmeldeseite enthält zusätzlich `<link rel="stylesheet" href="/__brand/brand.css">`, ein Icon `/__brand/signet.svg` und `/__brand/brand.js?v=2`. Im Quelltext der Oberfläche v0.52.492 kommt `__brand` nicht vor; die Zeilen werden also von einem vorgeschalteten Proxy eingefügt (die 404-Seite unter `/__brand/` ist 162 Byte groß, wie bei nginx üblich; ANNAHME). `brand.css` trägt `last-modified: 08.11.2026 22:21 UTC` und setzt Farben per `!important`, darunter `#111212`, `#151617`, `#AEB5BB`, die nicht in `config/design-tokens.json` stehen. `brand.js` setzt den Titel „NeXify AI — Arbeitsplatz“ alle 700 ms neu.

Folge: Es gibt bereits eine Gestaltung, aber außerhalb des Repositories, außerhalb der Tokens und über einen Weg, den die Oberfläche nicht vorsieht. Sie wird nicht angefasst. Wird der Graphite-Skin eingespielt, gehört die Überlagerung in derselben Freigabe abgeschaltet, sonst überschreibt sie ihn.

### Welcher Server liefert aus? (OFFEN)

| Beobachtung | Quelle |
|---|---|
| DNS zeigt auf srv1243952 | DNS-Abfrage 20:28 UTC, Hostinger-API `/virtual-machines` 20:29 UTC |
| Auf srv1941843 läuft `docker-hermes`, Container `hermes`, „Up 9 days“; die Oberfläche dort startete am 05.11.2026 13:03 UTC auf `0.0.0.0:8788` | Hostinger-API, Projekt und Protokoll, 20:29 UTC |
| Die öffentlich antwortende Oberfläche startete am 12.11.2026 21:16 UTC | `/health`, 20:28 UTC |
| Beim Start am 05.11. meldete die Oberfläche auf srv1941843 „Set a password via Settings or HERMES_WEBUI_PASSWORD env var“ und beantwortete `GET /` mit 200 statt mit einer Weiterleitung auf die Anmeldung | Protokoll `docker-hermes` |
| Auf srv1941843 leitet Traefik laut Befund `unternehmensbot.eu` auf `127.0.0.1:8788` | `docs/04-betrieb/server-befund-2026-11-14.md`, „Messung“ |

Die Startzeiten passen nicht zusammen. Entweder läuft auf srv1243952 eine zweite Instanz, oder srv1243952 leitet an srv1941843 weiter und die Oberfläche wurde dort am 12.11. neu gestartet, ohne dass das Protokoll der API es zeigt (es endet am 08.11.). Beides ist von hier nicht entscheidbar: srv1243952 ist über den Docker Manager nicht lesbar (`[VPS:2044]`), und ein direkter Abruf gegen die Adresse von srv1941843 wurde von der Umgebung zurückgewiesen (Verbindungsabbruch am Proxy, 20:30 UTC; nicht umgangen).

**Angabe des Inhabers (14.11.2026, über die koordinierende Sitzung, hier nicht nachgeprüft):** Es handle sich um eine von Hostinger gehostete, dokumentierte App-Lösung. Die Aussage fiel zu `cognee-x532`; ob sie auch für die Hermes-Oberfläche gilt, ist unbestätigt. Träfe sie zu, könnte Hostinger die Compose-Datei verwalten (siehe Abschnitt 4, Folge 5). An K0 ändert das nichts.

**Risiko, nicht belegt:** Ob auf srv1941843 inzwischen ein Passwort gesetzt ist, ist offen. Die Firewall lässt Port 8788 nicht zu (nur 22, 80, 443, 2222), aber Traefik nimmt auf 443 Anfragen für den Hostnamen an. Wäre die Instanz dort ohne Passwort, stünde ein Agent mit Docker-Socket ohne Anmeldung im Netz. Das ist in Schritt K0 als Erstes zu prüfen.

Die Aussage in `docs/04-betrieb/server-befund-2026-11-14.md` und im Lösungsregister, die öffentliche Oberfläche laufe auf srv1941843, ist damit nicht belegt. Das Lösungsregister ist in diesem Zweig berichtigt; der Server-Befund ist ein bestehender Beleg und bleibt unverändert.

## 3. Abgleich `ops/hermes/` gegen die Dokumentation

Quellen, alle am 14.11.2026 zwischen 20:30 und 20:42 UTC gelesen:

- Hermes Agent: `NousResearch/hermes-agent`, `website/docs/` am gebundenen Commit `bf0203a794a07aac3ff764972ab9087baa4e4f4e` (v0.22.5 laut `ops/hermes/README.md`). Neuester Stand des Projekts am selben Tag: Commit `1831ce1c…`, neuestes Tag `v2026.9.24`.
- Oberfläche: `nesquena/hermes-webui`, Tag `v0.52.492`, Commit `0700933a6717a954203ed13c66db9ba2164f05d2`, MIT-Lizenz. Das ist die Version, die `unternehmensbot.eu` ausliefert. Neuestes Tag am selben Tag: `v0.52.667`.

**OFFEN: Welche Hermes-Agent-Version auf den Servern läuft**, ist ohne Shell nicht feststellbar. Der Abgleich gilt für den gebundenen Commit. Die Oberfläche importiert Module von Hermes Agent direkt und liest dessen Zustandsablage (`README.md` der Oberfläche, Abschnitt zur Kopplung); weichen die Versionen stark ab, kann sich Verhalten ändern.

| Thema | Fassung in `ops/hermes/` | Dokumentation | Befund |
|---|---|---|---|
| Modellbindung | `model.provider: openrouter`, `model.default: deepseek/deepseek-v4.1-flash-1017`, `agent.reasoning_effort: high`, `fallback_providers: []`, `provider_routing.require_parameters: true` | Schlüssel belegt in `user-guide/configuration.md`, `configuring-models.md`, `features/fallback-providers.md`, `features/provider-routing.md` | stimmt überein |
| Modell in Zeitplänen | kein Abschnitt `cron:`; `einspielen.sh` sperrt `cron` im Zusatz | `features/cron.md`: Reihenfolge je Lauf ist Einzelbindung am Job, dann `cron.model`, dann Hauptmodell. Eine Einzelbindung kann auch eine eigene Reasoning-Stufe tragen | **Lücke in der Konfiguration**, an der Leitung geschlossen durch den Modell-Wächter (Abschnitt 3a). Ohne ihn bleibt nur die Sichtprüfung der Jobdatei |
| Modell in der Oberfläche | nichts | Die Oberfläche zeigt in der Eingabezeile eine Modellauswahl und eine Auswahl der Reasoning-Stufe je Gespräch; `HERMES_WEBUI_DEFAULT_MODEL` übersteuert die Vorgabe | **Lücke in der Konfiguration**, an der Leitung geschlossen durch den Modell-Wächter. `webui.env.example` führt `HERMES_WEBUI_DEFAULT_MODEL` als „nicht setzen“ |
| Rollen NeX und AIFly ORACLE | `SOUL.md` beschreibt die Rollen; ein Home, kein Profil | `user-guide/profiles.md`: Ein Profil ist ein eigenes Hermes-Home mit eigener `config.yaml`, `.env`, `SOUL.md`, Speicher, Sitzungen, Skills und Zeitplänen; die Oberfläche schaltet Profile ohne Neustart um | Zwei Rollen als zwei Profile sind möglich. **Folge:** Jedes Profil hat eine eigene `config.yaml`; `einspielen.sh` schreibt nur das Standard-Home. Vor dem Anlegen von Profilen muss das Skript je Profil einspielen können. Ein Profil trennt Zustand und ist keine Sandbox. Nicht umgesetzt, weil D-019 „Offen“ die Zuordnung nicht entschieden hat |
| Skills | `skills.external_dirs: ${NEXIFY_REPO}/.claude/skills`, `write_approval: true`, `guard_agent_created: true` | `features/skills.md` | stimmt überein; je Profil getrennt einzutragen |
| Werkzeuge | keine Einschränkung | `user-guide/configuration.md`: `agent.disabled_toolsets` nimmt Namen aus `reference/toolsets-reference.md` und wirkt nach der Einstellung je Plattform | weiter offen (`ops/hermes/README.md`, „Offen“ Punkt 6). Empfehlung für den Arbeitsbereich: erst nach dem Funktionsnachweis festlegen, je Profil |
| Speicher | `memory.write_approval: true` | `features/memory.md`: `memories/MEMORY.md` (2.200 Zeichen) und `USER.md` (1.375 Zeichen) je Home; mit `write_approval` werden Schreibzugriffe außerhalb der interaktiven CLI zur Freigabe angehalten | stimmt überein. Für den Inhaber heißt das: Merkt sich Hermes etwas aus der Oberfläche, wartet der Eintrag auf Freigabe |
| Zeitpläne | `approvals.cron_mode: deny` | `features/cron.md`, `user-guide/security.md`. Zeitpläne laufen im Gateway; die Oberfläche hat dafür den Reiter „Tasks“ | stimmt überein. `cron_mode: deny` lehnt gefährliche Befehle in Zeitplänen ab; ein Zeitplan, der nur liest und berichtet, läuft. Ob der Gateway auf dem Server läuft, ist OFFEN |
| Rückfragen | `approvals.mode: manual` | `user-guide/security.md`: Rückfrage, keine Sandbox | stimmt überein |
| Oberfläche | bisher nichts | `docs/EXTENSIONS.md`, `THEMES.md`, `README.md` der Oberfläche | neu: `ops/hermes/webui/` (Abschnitt 5) |

Die eingebaute Verwaltungsoberfläche von Hermes Agent (`hermes dashboard`, Port 9119, `features/web-dashboard.md`) ist etwas anderes als die Oberfläche unter `unternehmensbot.eu`. Sie ist hier nicht Gegenstand.

## 3a. Modellbindung: was trägt und was nicht

Vorgabe (`config/llm-policy.json`): exakt `deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`, kein stiller Ersatz, bei fehlender Fähigkeit ablehnen statt ersetzen, und die serialisierte Anfrage an den Anbieter muss der Vorgabe entsprechen.

| Mittel | Hält das Modell | Hält Reasoning `high` | Einordnung |
|---|---|---|---|
| `config.yaml` aus `ops/hermes/home/` | nur für Aufrufe, die nichts anderes verlangen | ebenso | Voreinstellung. Oberfläche, Zeitplan und Profil können abweichen |
| Kontrolle von `cron/jobs.json` (Schritt E0) und Blick in das OpenRouter-Protokoll | nein | nein | **Sichtprüfung**, einmalig, kein Zwang |
| Beschränkung am OpenRouter-Schlüssel (erlaubte Modelle, Ausgabenlimit) | ja, laut unabhängiger Prüfung in der OpenRouter-Dokumentation belegt; in dieser Arbeit nicht selbst gelesen | **nein**: Reasoning ist ein Parameter je Anfrage | sinnvoll als zweite Sicherung und für das Geldlimit, für die Vorgabe nicht ausreichend |
| 9router (Lösungsregister `9router`, läuft auf srv1941843, laut Compose-Kommentar „abgelöst 03.10.“) | nicht belegt | nicht belegt | siehe Bewertung unten |
| **Modell-Wächter** `ops/hermes/gateway/modell_waechter.py` | ja: Jede Anfrage mit anderem Modell wird mit 422 `model_policy` abgelehnt und erreicht den Anbieter nicht | ja: abweichende Stufe wird mit 422 `reasoning_policy` abgelehnt; fehlt die Angabe, wird `high` eingesetzt | tragfähiger Weg, **Entwurf**, nicht eingespielt |

### Der Modell-Wächter (Entwurf)

Eine kleine Zwischenstation auf der lokalen Schleife, nur Python-Standardbibliothek. Hermes spricht statt mit OpenRouter mit dem Wächter; der Wächter prüft jede Anfrage gegen `config/llm-policy.json` und leitet nur weiter, was der Vorgabe entspricht.

- **Abgelehnt, nicht umgeschrieben** werden: anderes Modell (auch dieselbe Kennung ohne `-1017` oder mit Anhang), andere Reasoning-Stufe, abgeschaltetes Reasoning, Ausweichlisten (`models`, `route`), Anbieter-Angaben, die Ausweichanbieter erlauben oder die Parameterpflicht aufheben. Das Modell wird nie ersetzt.
- **Eingesetzt** wird nur die vorgeschriebene Reasoning-Stufe, wenn die Anfrage keine nennt. Grund: Hermes sendet das Feld nur an OpenRouter-Adressen (`ops/hermes/README.md`, „Nicht belegt“); hinter dem Wächter fehlt es deshalb. `provider.require_parameters: true` wird immer gesetzt.
- **Antwortprüfung:** Nennt die Antwort ein anderes Modell, wird sie nicht ausgeliefert (502). Ein Antwortstrom wird zurückgehalten, bis ein Datenblock das Modell der Vorgabe nennt.
- **Schlüssel:** Der OpenRouter-Schlüssel liegt nur in der Umgebung des Wächters, außerhalb der in den Container eingehängten Ordner. Hermes bekommt einen eigenen Zugangswert, der nur am Wächter gilt. Der Agent kann den Anbieter-Schlüssel dann weder lesen noch an der Vorgabe vorbei benutzen.
- **Protokoll:** je Anfrage Zeit, Urteil, verlangtes Modell; keine Inhalte, keine Schlüssel.
- **Wirkung auf die beiden Lücken:** Wählt der Inhaber in der Oberfläche ein anderes Modell oder eine andere Stufe, oder trägt ein Zeitplan ein eigenes Modell, endet der Aufruf mit einer klaren Fehlermeldung statt mit einer Antwort eines anderen Modells.

Belegt (lokal, gegen eine Attrappe als Anbieter, ohne Schlüssel und ohne Modellaufruf): `tests/test_hermes_arbeitsbereich.py`, Klasse `ModellWaechter`, 10 Tests; dazu ein Start als Prozess mit Ablehnung einer Anfrage für `openai/gpt-5.4-mini`.

**Nicht belegt und vor einem Einsatz nötig:** ein Lauf mit Hermes davor (ob Hermes mit `OPENROUTER_BASE_URL` auf den Wächter alle Aufrufe dorthin sendet, auch Nebenaufgaben und Zeitpläne; die Variable ist in `ops/hermes/README.md` nur gegen eine Attrappe belegt), ein echter Aufruf bei OpenRouter mit Kontrolle der abgerechneten Stufe, Betrieb als Dienst (Neustart, Protokollablage, Überwachung), eine unabhängige Prüfung des Quelltexts und die Entscheidung des Inhabers. `config/llm-policy.json` nennt als Zielroute „nur über 9router“ (Status nicht aktiviert); der Wächter lässt als Gegenstelle bewusst nur `openrouter.ai` zu. Soll er vor 9router stehen, ist die Hostliste zu erweitern, und die Vorprüfungen der Policy gelten. Solange der Wächter nicht eingespielt ist, ist die Einhaltung der Vorgabe in Oberfläche und Zeitplänen **nur Sichtprüfung**.

### Bewertung 9router

QUELLE: `decolua/9router`, `README.md` am Commit `1855aa44…`, gelesen 14.11.2026 21:46 UTC. Welches Projekt und welche Version auf dem Server laufen, ist nicht belegt (ANNAHME aus dem Namen).

Das Projekt beschreibt sich als Router mit automatischem Ausweichen zwischen Abonnement-, günstigen und kostenlosen Modellen („Auto fallback“, „Custom Combos“). Die Beschreibung nennt keine Funktion, die Anfragen mit einem anderen als dem vorgeschriebenen Modell ablehnt oder eine Reasoning-Stufe erzwingt. Der Zweck des Werkzeugs, bei Ausfall auf ein anderes Modell zu wechseln, steht gegen `silent_model_fallback: false`. Eine Kombination mit nur einem Modell vermeidet das Ausweichen, verhindert aber nicht, dass ein Aufrufer ein anderes dort eingerichtetes Modell verlangt.

Ergebnis: 9router ist nach seiner Beschreibung kein Nachweis und kein Zwang für die Vorgabe. Als Leitung hinter dem Wächter ist er denkbar, als alleinige Sicherung nicht. Der Quelltext von 9router wurde nicht geprüft.

### Bildschirmfotos mit „GPT-5.4 Mini“

Die Bildschirmfotos unter `evidence/hermes-arbeitsbereich-2026-11-14/` zeigen in der Eingabezeile „GPT-5.4 Mini“. Das ist eine **lokale Testinstanz ohne Hermes Agent, ohne Schlüssel und ohne Modellbindung**: Die Oberfläche zeigt dort ihren eigenen Vorgabewert. Es wurde kein Modell aufgerufen. Die Bilder belegen die Gestaltung, nicht die Modellbindung; sie zeigen zugleich, dass die Oberfläche von sich aus nichts erzwingt.

Sie zeigen außerdem den Hinweis der Oberfläche auf eine neuere Version mit dem Schalter „Update Now“. Ein Klick darauf ändert den Quellbaum der Oberfläche; das ist ein Eingriff am Server und gehört nicht zur Bedienung im Alltag (D-016).

## 4. Entscheidungsvorlage: Absicherung

Ziel: Die Oberfläche bleibt der Arbeitsbereich des Inhabers am Telefon und am Mac und steht trotzdem nicht offen im Netz (D-019 Folge 4).

Gemeinsame Vorbedingung aller Wege: Schritt K0 (welcher Server), danach bindet die Oberfläche nur noch an `127.0.0.1` oder an das private Netz, und die öffentliche Route entfällt. Das Passwort der Oberfläche bleibt in jedem Weg als zweite Hürde bestehen.

| | Weg A: Cloudflare Access mit Tunnel | Weg B: WireGuard (privates Netz) | Weg C: Anmeldung am Reverse-Proxy | Weg D: SSH-Tunnel |
|---|---|---|---|---|
| Wie | Ein `cloudflared`-Dienst auf dem Server baut eine ausgehende Verbindung auf; Cloudflare verlangt vor der Oberfläche eine Anmeldung (Einmalcode an die Adresse des Inhabers). Kein offener Port für die Oberfläche | Server und Geräte des Inhabers bilden ein privates Netz; die Oberfläche ist nur darin erreichbar | Der vorhandene Proxy verlangt vor der Oberfläche Benutzername und Passwort und lässt optional nur bestimmte Adressen zu | `ssh -N -L 8788:127.0.0.1:8788 …`, dann `http://localhost:8788` |
| Vorhanden | Cloudflare-Konto mit Zonen `nexifyai.de` und `nexifyai.cloud` (Lösungsregister `cloudflare-access`, „läuft unbelegt“). `unternehmensbot.eu` liegt **nicht** bei Cloudflare | UDP 51820 und 51821 sind in der Firewall offen (`server-befund-2026-11-14.md`); ob ein WireGuard-Dienst läuft, ist OFFEN | Traefik auf srv1941843; auf srv1243952 unbekannt | SSH offen auf 22 und 2222 |
| Aufwand | mittel: Tunnel anlegen, Hostname in einer Cloudflare-Zone (zum Beispiel unter `nexifyai.cloud`), Access-Anwendung mit Regel „nur die Adresse des Inhabers“, Dienst `cloudflared` starten. Für `unternehmensbot.eu` selbst müssten vorher die Nameserver zu Cloudflare umziehen | mittel: Dienst einrichten oder vorhandenen nutzen, je Gerät ein Profil (QR-Code am Telefon), Oberfläche an die Netzadresse binden | klein: ein Abschnitt in der Proxy-Konfiguration | keiner am Server |
| Laufende Kosten | laut Cloudflare gibt es einen „Zero Trust Free plan“, für den ein Zahlungsmittel hinterlegt wird, ohne dass etwas berechnet wird (QUELLE: `developers.cloudflare.com/cloudflare-one/setup/`, gelesen 20:43 UTC). Grenze der Nutzerzahl im kostenlosen Tarif: OFFEN, nicht geprüft. Für einen Nutzer ist kein kostenpflichtiger Tarif vorgeschlagen | 0 €; WireGuard ist freie Software auf dem eigenen Server | 0 € | 0 € |
| Telefon | Browser oder installierte Web-App; Anmeldung per Einmalcode, danach bleibt die Sitzung für die eingestellte Dauer bestehen. Keine zusätzliche App | WireGuard-App, einmal einrichten; „bei Bedarf verbinden“ hält es unauffällig. Ohne Verbindung lädt die Seite nicht | Anmeldefenster des Browsers; als installierte Web-App unzuverlässig, weil Manifest und Service Worker hinter derselben Abfrage liegen (ANNAHME aus dem Aufbau, nicht gemessen) | praktisch nicht nutzbar |
| Mac | Browser, Anmeldung wie am Telefon | WireGuard-App, ein Klick | Anmeldefenster, vom Browser merkbar | Terminal offen halten |
| Erfüllt D-019 Folge 4 | ja in der Sache (keine Seite der Oberfläche ohne vorherige Anmeldung erreichbar), aber Folge 4 nennt wörtlich SSH-Tunnel oder WireGuard: braucht eine Entscheidung des Inhabers | ja, wörtlich | nur teilweise: Der Dienst bleibt im Netz, geschützt durch eine zweite Passwortabfrage | ja, wörtlich |
| Was dabei über Dritte läuft | der gesamte Verkehr der Oberfläche läuft über Cloudflare | nichts | nichts | nichts |
| Rückweg | Tunnel-Dienst stoppen, DNS-Eintrag des Tunnels entfernen, bisherige Route aus der Sicherung zurück | Bindung der Oberfläche zurück, Route aus der Sicherung zurück | Abschnitt aus der Sicherung zurück | Tunnel beenden |

Nicht vorgeschlagen: Tailscale. Der kostenlose Tarif ist laut Anbieter nur für nicht gewerbliche Nutzung gedacht (QUELLE: `tailscale.com/pricing`, gelesen 20:43 UTC); der Betrag des passenden bezahlten Tarifs wurde nicht geprüft, deshalb kein Vorschlag (D-017).

**Empfehlung: Weg A**, mit einem Hostnamen in einer Zone, die schon bei Cloudflare liegt. Begründung: Der Auftrag heißt Arbeitsbereich am Telefon; Weg A braucht dort keine zusätzliche App, hält die installierte Web-App nutzbar und öffnet keinen Port. Preis dafür: ein dauerhafter kleiner Dienst mehr auf dem Server, der Verkehr läuft über Cloudflare, und D-019 Folge 4 muss vom Inhaber um diesen Weg ergänzt werden. Will der Inhaber Folge 4 nicht ändern oder keinen Verkehr über Cloudflare, gilt **Weg B**; er ist ohne neue Entscheidung zulässig. Weg C taugt nur als kurze Zwischenlösung, Weg D als Notzugang für eine Sitzung mit Shell.

Unabhängig vom Weg: `/health` nennt ohne Anmeldung Betriebszahlen. Mit Weg A, B oder D ist der Pfad nicht mehr öffentlich; bei Weg C muss er ausdrücklich mit geschützt werden.

### D-019 Folge 5: Docker-Socket

Genaue Änderung, Vorprüfung, Prüfung danach und Rückweg stehen in `ops/hermes/docker/docker-socket-entfernen.md`. Kurz: In der Compose-Datei von `docker-hermes` entfällt genau die Zeile `- /var/run/docker.sock:/var/run/docker.sock`; wirksam mit dem Neuerstellen des Containers. Der Socket muss entfernt und der Container neu erstellt sein, **bevor** der Modellschlüssel eingetragen wird, weil der Agent ab dann handeln kann; die Schrittfolge in Abschnitt 6 ist so geordnet. OFFEN: Führt der Docker Manager von Hostinger eine eigene Kopie der Compose-Datei, kann er die Änderung überschreiben; die Vorlage nennt die Prüfung dazu.

## 5. Gestaltung

### Was die Oberfläche ohne Fork zulässt (QUELLE: v0.52.492)

| Wunsch | Geht ohne Fork? | Weg |
|---|---|---|
| Farben der gesamten App | ja | eigener Skin über `window.registerHermesSkin()` plus CSS (`docs/EXTENSIONS.md`, „Registering a custom theme (skin)“; `THEMES.md`) |
| Dunkles Grundthema erzwingen | ja | `scheme: "dark"` am Skin |
| Schrift | ja | `--font-ui`, `--font-mono` per CSS; Schriftdateien aus dem Erweiterungsordner (`font-src 'self'`) |
| Eigenes CSS und eigenes Skript | ja | `HERMES_WEBUI_EXTENSION_DIR`, `HERMES_WEBUI_EXTENSION_MANIFEST`; nur Pfade unter `/extensions/` oder `/static/`, nur gleiche Herkunft |
| Titel im Browser, Name in Kopfzeile und Anmeldeseite | ja | Assistentenname (`HERMES_WEBUI_BOT_NAME` oder Einstellungen der Oberfläche) |
| Logo in Kopfzeile und Startansicht | ja, über die Erweiterung | CSS blendet das Hermes-Zeichen aus, das Skript setzt die Wortmarke als Text |
| Favicon, Icon am Startbildschirm, Web-App-Manifest (Name, Farbe) | nur nach der Anmeldung | Das Skript tauscht die Verweise auf Dateien im Erweiterungsordner. Die Dateien `/manifest.json` und `/favicon.ico` der Oberfläche selbst sind fest („Hermes“, `#0D0D1A`) |
| **Anmeldeseite** (Farben, Logo, Schrift) | **nein** | Die Seite ist eine feste Vorlage mit eigenen Farben; Erweiterungen werden dort nicht eingebunden, und `/extensions/…` ist ohne Anmeldung nicht abrufbar (lokal gemessen: 302). Änderbar sind nur Assistentenname und Sprache |
| Texte der Oberfläche, Anordnung, neue Ansichten | Texte nein, Zusatzansichten ja | Übersetzungen sind fest; eigene Flächen sind als Erweiterung möglich |

Was es für die Anmeldeseite bräuchte: einen Fork der Oberfläche (dann trägt NeXify jede Aktualisierung selbst) oder das Einfügen am Proxy wie heute unter `/__brand/` (außerhalb dessen, was die Oberfläche vorsieht). Beides ist eine Entscheidung des Inhabers und hier nicht gebaut. Mit Weg A oder B sieht der Inhaber die Anmeldeseite nur noch selten; mit Weg A ließe sich die Passwortabfrage später durch die vorgeschaltete Anmeldung ersetzen (die Oberfläche kennt dafür `HERMES_WEBUI_TRUSTED_AUTH_HEADER`; nicht geprüft, nicht vorgeschlagen, solange der Dienst nicht ausschließlich über den Tunnel erreichbar ist).

### Was umgesetzt ist

| Datei unter `ops/hermes/webui/` | Inhalt |
|---|---|
| `nexify-graphite.css` | Skin „NeXify Graphite“: Grund `#1B1E1D`, Ebenen, Schrift, Linien, Lime als Handlung, Glas in der Kopfleiste, Wortmarke, sichtbarer Fokus, Rand der Eingabefelder, Reduced-Motion. Zielgröße 48 px: mit dem Finger für jedes Bedienelement, mit der Maus nur für die benannten Elemente von Navigation, Sitzungsliste und Eingabezeile (gemessen), damit dichte, ungeprüfte Ansichten nicht brechen. Jede Regel gilt nur, solange der Skin gewählt ist |
| `nexify-graphite.js` | meldet den Skin an, wählt ihn je Browser einmal vor, setzt die Wortmarke „NeXify AI“ (X in `#C0EE38`) mit dem Claim, tauscht Icon und Manifest, setzt den Platzhalter der Eingabe auf Deutsch („Nachricht an …“). Ruft keine Schnittstelle der Oberfläche auf und sendet nichts. Schreibt im Browser-Speicher genau zwei Einträge: den eigenen Merker `nexify-skin-vorgabe` und einmalig `hermes-skin`, den Eintrag der Oberfläche für den gewählten Skin. Das zweite liegt außerhalb der angemeldeten Schnittstelle `registerHermesSkin`; `THEMES.md` nennt den Speicher als Ablage der Wahl, eine eigene Funktion zum Vorauswählen gibt es in v0.52.492 nicht. Der Prüfer lässt nur diese beiden Schlüssel zu |
| `extensions.json` | Manifest der Erweiterung |
| `app-manifest.json` | Web-App-Manifest „NeXify AI Arbeitsbereich“ |
| `bereitstellen.sh` | stellt den Erweiterungsordner zusammen; Schriften und Icons kommen aus `apps/web/public`, es gibt keine zweite Kopie im Repository. Trockenlauf ist Standard. Der Ordner bleibt derselbe und wird Datei für Datei aktualisiert; vorher entsteht daneben eine vollständige Kopie, `--zurueck` spielt sie zurück; eine Sperre verhindert zwei gleichzeitige Läufe |
| `pruefe-gestaltung.py` | prüft, dass jeder Farb- und Maßwert in `config/design-tokens.json` steht und die Pflichtregeln vorhanden sind |
| `webui.env.example` | Variablennamen der Oberfläche, keine Geheimnisse |

Das Signal-Lime `#C0EE38` steht genau einmal im Skin und trägt nur das X der Wortmarke, wie es das Token `color.marke.limeSignal` vorschreibt („nie als Fläche oder Fließtext“). Schalter und Verweise nutzen `color.marke.lime` und `color.dunkel.limeHandlung`.

### Lokale Prüfung (IST, 14.11.2026, 20:39 bis 20:42 UTC; nach der Nacharbeit erneut 21:47 bis 21:52 UTC)

Umgebung: Oberfläche v0.52.492 aus dem öffentlichen Quellstand, im Scratchpad der Sitzung, eigenes `HOME`, ohne Hermes Agent, ohne Modellschlüssel, ohne Modellaufruf. Gemessen mit Chromium über Playwright.

| Prüfung | 390 px (Touch, Reduced-Motion) | 1440 px |
|---|---|---|
| Skin aktiv, dunkles Grundthema | ja | ja |
| Grundfarbe, Schrift | `rgb(27,30,29)`, Inter geladen | gleich |
| Wortmarke, X in `rgb(192,238,56)` | ja | ja |
| Icon und Manifest getauscht | ja | ja |
| Sichtbare Bedienelemente kleiner als 44 px | 0 (auch bei geöffnetem Menü) | 0 in Startansicht und Einstellungen. Ausgenommen der Textverweis „What's new in WebUI?“ im Aktualisierungshinweis der Oberfläche (Verweis im Fließtext) |
| Querüberlauf | 0 px | 14 px; gleich groß ohne Skin (ausgeblendete rechte Seitenleiste der Oberfläche), also nicht vom Skin |
| Fokus per Tastatur | nicht geprüft | Umriss 2 px `rgb(168,199,106)`, Abstand 2 px; in der linken Leiste innen liegend (−2 px), damit der Fensterrand ihn nicht abschneidet |
| Platzhalter der Eingabe | „Nachricht an NeX…“ | „Nachricht an NeX…“ |
| Web-App-Manifest nach Anmeldung (eigene lokale Instanz mit Testpasswort, Chromium) | Verweis trägt `crossorigin="use-credentials"`; Abruf 200, Name „NeXify AI Arbeitsbereich“, keine Manifest- und keine Installationsfehler laut Browser | – |
| Fehler in der Konsole | 0 | 0 |
| Gegenprobe: Skin abgewählt | – | Wortmarke aus, Icon und Manifest wieder Original |

Kontraste (gerechnet nach WCAG): Text auf Grund 14,5:1; leiser Text auf Grund 8,5:1, auf Fläche 7,0:1, auf Karte 6,2:1; Lime auf Grund 8,8:1; Schrift auf Lime-Schalter 7,5:1; Fehlerfarbe auf Grund 7,3:1.

Bildschirmfotos: `evidence/hermes-arbeitsbereich-2026-11-14/` (`arbeitsbereich-390.png`, `arbeitsbereich-390-menue.png`, `arbeitsbereich-1440.png`, `arbeitsbereich-1440-fokus.png`, `arbeitsbereich-1440-einstellungen.png`).

**Nicht geprüft:** Gespräch mit Antwort, Werkzeugkarten, Kanban, Aufgaben mit Inhalt, Dateiansicht und Terminal (dafür fehlen lokal Hermes Agent und ein Modell); Verhalten auf einem echten iPhone und in Safari; die tatsächliche Installation als Web-App und der Abruf der Icons dabei (gemessen ist nur, dass Chromium das Manifest nach der Anmeldung annimmt); die Zielgröße mit der Maus in dichten Ansichten (dort gilt sie bewusst nicht pauschal); Zusammenspiel mit der vorhandenen Überlagerung `/__brand/`; die Oberfläche mit der auf dem Server laufenden Hermes-Agent-Version. Die Zielgröße ist für die Startansicht, das Menü und die Einstellungen gemessen, nicht für jede Ansicht. Eine vollständige WCAG-Prüfung ist das nicht.

Sichtbar bleiben englische Reste der Oberfläche (Einträge der Einstellungen wie „Appearance“, der Aktualisierungshinweis). Das sind feste Texte der Oberfläche; nur den Platzhalter der Eingabe setzt der Skin auf Deutsch.

## 6. Einspielpaket

Jeder Schritt steht für sich: Befehl, erwartetes Ergebnis, Prüfung, Rückweg. Nach jedem Schritt anhalten. Jeder Schritt auf dem Server braucht die Freigabe des Inhabers (D-016). Die Schritte 0 bis 6 aus `ops/hermes/README.md` bleiben inhaltlich gültig; **die Reihenfolge hier geht vor**, weil dort der Schlüssel vor dem Neuerstellen des Containers eingetragen würde.

**Wer:** „Inhaber“ = kann nur Pascal Courbois (Schlüssel, Passwort, Konten, DNS, Entscheidung). „Agent“ = eine Sitzung mit Shell auf dem Server und der Freigabe für genau diesen Schritt. Eine Cloud-Sitzung ohne Shell kann nur V0 und V2 ausführen.

Drei Grundsätze der Reihenfolge:

1. **Erst der Socket, dann der Schlüssel.** Solange der Docker-Socket im Container hängt, wird kein Modellschlüssel eingetragen. Ein handlungsfähiger Agent hätte sonst Root auf dem Host.
2. **Erst die Absicherung, dann die Bindung.** Die Oberfläche wird erst an `127.0.0.1` gebunden, wenn der neue Zugang nachweislich funktioniert. Sonst ist der Arbeitsbereich weg.
3. **Der Snapshot ist der letzte Rückweg und wird nicht nebenbei überschrieben.**

### Vorbedingungen

| # | Schritt | Wer | Befehl | Erwartet | Rückweg |
|---|---|---|---|---|---|
| V0 | Rückwege feststellen (nur lesen) | Agent (Hostinger-API) | `GET /virtual-machines/<id>/snapshot`, `GET /virtual-machines/<id>/backups` je Server | Zeitpunkt und Ablauf des vorhandenen Snapshots; Liste der Backups (Stand 14.11.: je 4, neuestes 13.11. gegen 16:45 UTC; Snapshot vom 14.11. 11:47 UTC, Ablauf 15.11. 11:47 UTC) | entfällt |
| V1 | Frischer Snapshot des Zielservers | Agent mit **ausdrücklicher** Freigabe des Inhabers für das Überschreiben | `POST /virtual-machines/<id>/snapshot`, danach `GET …/snapshot` | **Ein neuer Snapshot überschreibt den vorhandenen** (QUELLE: API-Beschreibung von Hostinger, `openapi.json` Version 3.0.0, gelesen 14.11.2026 21:46 UTC: „Creating new snapshot will overwrite the existing snapshot!“). Deshalb erst unmittelbar vor dem ersten ändernden Schritt (E1), nur für den Server, an dem geändert wird, und nur, wenn der Server in einem Zustand ist, zu dem man zurück will. Bis dahin bleibt der vorhandene Snapshot stehen | Es gibt danach keinen Weg zum überschriebenen Snapshot zurück; die Backups aus V0 bleiben |
| V2 | Speicherplatz messen | Agent, nur lesend (`nexify-server-messung`) | `df -h /` | Stand 14.11.: srv1941843 97 % belegt, 10,2 GB frei. **Vorschlag der Schwelle: mindestens 30 GB frei**, bevor ein Image neu gebaut oder ein weiterer Dienst gestartet wird. Der Erweiterungsordner selbst braucht unter 1 MB und hängt davon nicht ab | Platz schaffen nur nach `docs/04-betrieb/aufraeumplan-2026-11-14.md`, je Schritt mit Freigabe |
| V3 | Checkout des Repositories auf dem Zielserver | Agent | `git -C <pfad> log -1 --format=%H` | Commit von `main`, der diesen Zweig enthält | entfällt |

### Klärung und Sofortschutz

| # | Schritt | Wer | Befehl | Erwartet | Rückweg |
|---|---|---|---|---|---|
| K0 | Feststellen, welche Instanz `unternehmensbot.eu` ausliefert, und ob Hostinger die Compose-Datei verwaltet (nur lesen) | Agent mit Shell auf **beiden** Servern | auf srv1243952: `ss -ltnp \| grep -E ':(80\|443\|8788)\b'`, `docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'`, Proxy-Konfiguration nach `unternehmensbot` und `__brand` durchsuchen (`grep -rl`); auf beiden: `curl -s http://127.0.0.1:8788/health`, `curl -s http://127.0.0.1:8788/api/auth/status`; auf srv1941843: `docker compose ls` und Vergleich der dort genannten Datei mit dem, was `GET /virtual-machines/1941843/docker/docker-hermes` liefert | Die Instanz, deren `server_started_at` zu `/health` von außen passt, ist die öffentliche. Für jede Instanz: `"auth_enabled": true`. Ob die Datei auf der Platte und die Fassung der Hostinger-API dieselbe sind. Ergebnis in `docs/04-betrieb/hermes-schritt-0-<Datum>.md` | entfällt |
| K1 | Falls eine Instanz `"auth_enabled": false` meldet: sofort melden | Agent meldet, Inhaber entscheidet | – | Der Inhaber setzt ein Passwort in den Einstellungen der Oberfläche oder gibt frei, die Route zu dieser Instanz zu entfernen | Route aus der Sicherung zurück |
| K2 | Entscheidung Absicherung (Abschnitt 4) | Inhaber | – | Weg A, B, C oder D; bei Weg A zusätzlich: Hostname und Ergänzung von D-019 Folge 4 | – |
| K3 | Entscheidung Zielserver: auf welchem Server der Arbeitsbereich laufen soll und was mit der anderen Instanz geschieht | Inhaber, nach K0 | – | Ein Server ist benannt. Die folgenden Schritte gelten für diesen | – |
| K4 | Entscheidung Modellbindung (Abschnitt 3a): Modell-Wächter einsetzen, ja oder nein | Inhaber | – | Bei Ja: unabhängige Prüfung des Entwurfs und Schritt E8a. Bei Nein: Die Einhaltung der Vorgabe bleibt Sichtprüfung, und das steht so in der Abnahme | – |

### Einrichtung (nach K0 bis K4, auf dem Zielserver)

| # | Schritt | Wer | Befehl | Erwartet und Prüfung | Rückweg |
|---|---|---|---|---|---|
| E0 | Bestand lesen (`ops/hermes/README.md`, Schritt 0), ergänzt um Oberfläche und Zeitpläne | Agent | wie dort, zusätzlich: `cat /opt/hermes-webui/VERSION 2>/dev/null \|\| git -C /opt/hermes-webui describe --tags`, `grep -nE '"(model\|provider\|reasoning[a-z_]*)"' /root/.hermes/cron/jobs.json` (Aufbau der Datei hier nicht geprüft), `grep -c '^OPENROUTER_API_KEY=.' /root/.hermes/.env` (nur die Zahl, nie der Wert), `bash ops/hermes/webui/bereitstellen.sh` | Version der Oberfläche `v0.52.492` (sonst Skin vor dem Einspielen an der vorgefundenen Version lokal prüfen). Keine Fundstelle mit einem anderen Modell als der Vorgabe; das ist eine Sichtprüfung. Steht bereits ein Schlüssel in der `.env` (Zahl 1), ist das dem Inhaber sofort zu melden: Dann gilt Grundsatz 1 schon heute nicht. Trockenlauf nennt 4 Dateien, 3 Schriften, 3 Icons | entfällt |
| E1 | Docker-Socket aus der Compose-Datei nehmen (D-019 Folge 5) | Agent mit Freigabe; unmittelbar davor V1 | `ops/hermes/docker/docker-socket-entfernen.md` | Datei geändert, `docker compose config` gültig. Wirksam erst mit E6 | Sicherung der Compose-Datei zurück |
| E2 | Image um `libatomic1` ergänzen (README Schritt 1) | Agent mit Freigabe, nur wenn V2 erfüllt | wie dort | Bau ohne Fehler; altes Image als `hermes-rueckweg:vorher` getaggt | altes Image zurücktaggen |
| E3 | Erweiterungsordner bereitstellen | Agent mit Freigabe | `bash ops/hermes/webui/bereitstellen.sh --anwenden` | „Bereitgestellt: /opt/nexify/hermes-webui-ext (10 Dateien und MANIFEST.sha256)“. Prüfung: `(cd /opt/nexify/hermes-webui-ext && sha256sum -c MANIFEST.sha256)` endet mit Exit 0 | beim ersten Mal: Ordner bleibt ohne Wirkung, solange E5 fehlt. Später: `bereitstellen.sh --zurueck <Sicherungsordner> --anwenden` |
| E4 | Compose-Zusatz prüfen (README Schritt 2) | Agent | `NEXIFY_REPO_HOST=<pfad> docker compose -f docker-compose.yml -f docker-compose.nexify.yml config` | zwei zusätzliche Einhängungen, beide `ro`; keine Zeile mit `docker.sock` | Zusatzdatei weglassen |
| E5 | Variablen der Oberfläche setzen (nicht geheim) | Agent mit Freigabe | die drei aktiven Zeilen aus `ops/hermes/webui/webui.env.example` in die Umgebung des Dienstes (Compose `environment`); vorher `cp -p docker-compose.yml docker-compose.yml.vorher-webui`. **`HERMES_WEBUI_HOST` hier nicht setzen** (erst E9) | `docker compose config` zeigt `HERMES_WEBUI_EXTENSION_DIR` und `HERMES_WEBUI_EXTENSION_MANIFEST`; `HERMES_WEBUI_DEFAULT_MODEL` und `HERMES_WEBUI_HOST` fehlen | Sicherung zurück |
| E6 | Konfiguration einspielen und Container neu erstellen (README Schritte 4 und 5), **noch ohne Modellschlüssel** | Agent mit Freigabe, Zeitfenster mit dem Inhaber | `bash ops/hermes/einspielen.sh --zusatz … --anwenden` (meldet den fehlenden Schlüssel, das ist hier gewollt), dann `docker compose … up -d hermes` | `docker inspect hermes --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' \| grep -c docker.sock` ergibt 0. Protokoll ohne `libatomic.so.1` und ohne `session.create refused`. `curl -s http://127.0.0.1:8788/api/auth/status` meldet `"auth_enabled": true`. Die Oberfläche ist über den bisherigen Weg weiter erreichbar und zeigt nach der Anmeldung den Graphite-Skin | README Schritt 5, Rückweg |
| E7 | Modellschlüssel eintragen (README Schritt 3) | **nur Inhaber**, von Hand, **erst nachdem E6 den Socket als entfernt belegt hat** | ohne Wächter: `OPENROUTER_API_KEY` (mit Ausgabenlimit und, wenn der Anbieter es anbietet, auf das eine Modell beschränkt) und `NEXIFY_REPO` in `/root/.hermes/.env` (Rechte 600). Mit Wächter (K4 Ja): stattdessen E8a | `bash ops/hermes/einspielen.sh` meldet beide als gesetzt und keine verbotene Variable. Danach `docker restart hermes`, falls laufende Sitzungen den Schlüssel nicht sehen | `.env.vorher` zurück |
| E8 | Absicherung nach K2 umsetzen | Weg A: Inhaber (Cloudflare-Konto, Access-Regel, Hostname) und Agent (Dienst `cloudflared`). Weg B: Agent (Dienst), Inhaber (Profile auf den Geräten). Weg C: Agent (Proxy-Abschnitt), Inhaber (Passwort) | je Weg; vor jeder Änderung an einer Proxy-Datei `cp -p <datei> <datei>.vorher`. Der bisherige öffentliche Weg bleibt bestehen, bis der neue geprüft ist | Der Inhaber meldet sich über den **neuen** Weg an, am Telefon und am Mac, und sieht die Oberfläche | Dienst stoppen; der bisherige Weg besteht noch |
| E8a | Nur bei K4 Ja: Modell-Wächter als Dienst | Agent mit Freigabe; Schlüssel und Zugangswert trägt **nur der Inhaber** ein | Dienst außerhalb des Containers, Umgebungsdatei mit Rechten 600 außerhalb der eingehängten Ordner; in `/root/.hermes/.env` steht dann der Zugangswert des Wächters statt des Anbieter-Schlüssels und die Adresse des Wächters. Genaue Befehle erst nach der unabhängigen Prüfung des Entwurfs | `curl -s http://127.0.0.1:8791/health` nennt Modell und Stufe der Vorgabe; eine Probeanfrage mit einem anderen Modell endet mit 422 | Dienst stoppen, `.env.vorher` zurück |
| E9 | Erst jetzt: Oberfläche an die lokale Schleife binden und den bisherigen öffentlichen Weg schließen | Agent mit Freigabe, im Zeitfenster, der Inhaber ist erreichbar | `HERMES_WEBUI_HOST=127.0.0.1` in die Umgebung des Dienstes, `docker compose … up -d hermes`; danach die bisherige öffentliche Route aus der Proxy-Konfiguration nehmen (Datei vorher sichern). Bei Weg C entfällt die Bindung, wenn der Proxy die Oberfläche nicht über die lokale Schleife erreicht; das ist vorher festzustellen | über den neuen Weg: Anmeldung funktioniert. Von außen ohne Anmeldung: `curl -s -o /dev/null -w '%{http_code}' https://<adresse>/health` liefert nicht mehr 200 der Oberfläche, und `https://unternehmensbot.eu/login` zeigt die Anmeldeseite nicht mehr | Variable entfernen und Container neu erstellen; Sicherung der Proxy-Datei zurück |
| E10 | Vorhandene Überlagerung `/__brand/` abschalten | Agent mit Freigabe, Fundstelle aus K0 | die einfügenden Zeilen in der Proxy-Konfiguration auskommentieren, Datei vorher sichern | Die App-Seite enthält `/extensions/nexify-graphite.css` und kein `/__brand/` mehr | Sicherung zurück |
| E11 | DNS, falls `unternehmensbot.eu` auf den Zielserver oder den Tunnel zeigen soll | **nur Inhaber** (Hostinger-DNS; DNS ist für Agenten gesperrt) | Eintrag ändern, alten Wert vorher notieren | `dig +short unternehmensbot.eu` zeigt den neuen Wert | alten Wert wieder eintragen |
| E12 | Funktionsnachweis (README Schritt 6), bezahlter Aufruf | Agent mit Freigabe der Kosten durch den Inhaber | wie dort | Bericht nennt `deepseek/deepseek-v4.1-flash-1017`, `openrouter`, `completed: true`; im OpenRouter-Protokoll Reasoning `high` | entfällt |
| E13 | Abnahme durch den Inhaber | Inhaber | Abschnitt 7 | jede Zeile mit Ja oder Nein | – |

### Aktualisieren und Zurücknehmen des Skins im Betrieb

- **Aktualisieren:** `bereitstellen.sh --anwenden` schreibt in denselben Ordner. Ein laufender Container hat genau diesen Ordner eingehängt und sieht die neuen Dateien sofort; geladen werden sie beim nächsten Seitenaufruf. Kein Neustart nötig. Belegt ist das am Skript (der Ordner bleibt derselbe, Test `test_ordner_bleibt_derselbe…`), nicht an einem Container.
- **Zurücknehmen einer Aktualisierung:** `bereitstellen.sh --zurueck <ziel>.vorher-<Zeit>-<pid> --anwenden`. Ebenfalls ohne Neustart.
- **Skin ganz abschalten:** Der Inhaber wählt in den Einstellungen einen anderen Skin (sofort, je Browser), oder die beiden Variablen aus E5 entfallen und der Container wird neu erstellt. Ein Umbenennen des Ordners am laufenden Container hilft nicht: Die Einhängung zeigt weiter auf den umbenannten Ordner.
- Die Sicherungsordner bleiben liegen; das Skript löscht nichts.

Reihenfolge der Freigaben des Inhabers: V0 (lesen) → K0 (Shell auf beiden Servern, nur lesen) → K2 (Weg) → K3 (Zielserver) → K4 (Wächter ja oder nein) → V1 (Snapshot überschreiben) und E1 (Socket) → E2 (Image, nur bei genug Platz) → E3 bis E5 (Skin) → E6 (Neustart im Zeitfenster, ohne Schlüssel) → E7 (Schlüssel, selbst) → E8 (Absicherung, Konto und Geräte selbst) → E9 (Bindung und alten Weg schließen) → E10 (alte Überlagerung) → E11 (DNS, selbst) → E12 (Kosten des Nachweises) → E13 (Abnahme, selbst).

## 7. Abnahmeliste „fertiger Arbeitsbereich“

Der Inhaber prüft selbst, am Telefon und am Mac. „Fertig“ ist der Arbeitsbereich, wenn jede Zeile mit Ja beantwortet ist.

| # | Was der Inhaber tut | Woran er es erkennt |
|---|---|---|
| 1 | Die Adresse im privaten Fenster öffnen, ohne sich anzumelden | Es erscheint die vorgeschaltete Anmeldung (Weg A) oder die Seite lädt nicht (Weg B). Die Anmeldeseite von Hermes erscheint nicht |
| 2 | Sich anmelden | Die Oberfläche ist dunkel in Graphit, oben steht „NeXify AI“ mit grünem X, darunter „Chat it. Automate it.“ |
| 3 | **Auftrag geben:** im Reiter „Chat“ schreiben: „Lies PROGRESS.md und nenne die drei obersten offenen Arbeiten.“ | Es kommt eine Antwort mit drei Punkten, die in `PROGRESS.md` stehen. Die Modellanzeige in der Eingabezeile nennt das DeepSeek-Modell der Vorgabe (genaue Beschriftung nicht geprüft) |
| 4 | Einen Auftrag geben, der etwas ändern will: „Lege im Repository die Datei test.txt an.“ | Hermes fragt nach oder meldet, dass das Repository nur lesend eingebunden ist. Es entsteht keine Datei |
| 5 | **Stand sehen:** den Reiter „Kanban“ und den Reiter „Tasks“ öffnen | Laufende und wartende Aufträge stehen dort mit Zustand; ein Zeitplan zeigt Zeitpunkt und Ergebnis des letzten Laufs |
| 6 | **Ergebnis prüfen:** ein abgeschlossenes Gespräch öffnen und die Werkzeugkarten aufklappen | Jeder ausgeführte Befehl steht mit Ausgabe da; bei einer Lieferung steht die Adresse des Entwurfs-PR |
| 7 | Den Reiter „Skills“ öffnen | Die Skills aus `.claude/skills/README.md` stehen in der Liste |
| 8 | Am Telefon: Menü öffnen, einen Auftrag schreiben, senden | Alles ist mit dem Daumen treffbar, nichts ragt seitlich heraus, die Schrift zoomt beim Tippen nicht |
| 9 | Am Telefon, angemeldet: „Zum Home-Bildschirm“ | Das Symbol trägt das NeXify-Zeichen und den Namen „NeXify AI“. Zeigt es stattdessen „Hermes“, hat der Browser das Manifest oder die Icons hinter der Anmeldung nicht geholt; dann ist diese Zeile Nein, und die Lösung ist ein Fork oder das Ausliefern von Manifest und Icons am Proxy (Entscheidung des Inhabers) |
| 10 | Am Mac: nur mit der Tabulatortaste durch die Oberfläche gehen | Das jeweils aktive Element hat einen grünen Rahmen |
| 11 | Einstellungen → Darstellung → anderen Skin wählen und wieder „NeXify Graphite“ | Die Oberfläche wechselt und kommt zurück; nichts ist verstellt |

Technische Gegenprüfung durch einen Agenten, nicht Teil der Abnahme des Inhabers: E6 und E9 „Erwartet“. Zur Modellbindung: Mit Modell-Wächter endet eine Probeanfrage mit einem anderen Modell und eine mit Reasoning `low` jeweils mit 422, aus der Oberfläche heraus ausgelöst. Ohne Wächter gibt es nur die Sichtprüfung (`jobs.json` ohne eigenes Modell, im OpenRouter-Protokoll ausschließlich `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high`); das ist dann in der Abnahme als nicht erzwungen zu vermerken.

Zeilen 3 bis 7 setzen Hermes Agent, den Schlüssel und das eingebundene Repository voraus und sind lokal nicht geprüft. Zeile 9: Lokal ist gemessen, dass Chromium das getauschte Manifest nach der Anmeldung annimmt und den Namen liest; die Installation selbst, der Abruf der Icons dabei und Safari auf dem iPhone sind nicht gemessen.

## 8. Nachzuführen außerhalb dieses Zweigs

Diese Dateien durfte dieser Auftrag nicht ändern. Vorschlag für die koordinierende Sitzung:

| Datei | Was nachzuführen wäre |
|---|---|
| `config/integrations/nexify-team-runtime-candidate.json` und `tools/check_team_runtime_candidate.py` (gemeinsam) | Die Oberfläche ist ein eigenes Projekt (`nesquena/hermes-webui`, Tag `v0.52.492`, Commit `0700933a…`) und bisher nicht gebunden; als eigener Eintrag mit Version aufnehmen. Der offene Punkt „Web-Oberfläche öffentlich“ nennt srv1941843; belegt ist nur, dass die Adresse auf srv1243952 zeigt. `remote_installation` um den Vermerk ergänzen, dass die öffentlich antwortende Instanz nicht zugeordnet ist |
| `DECISIONS.md` D-019 | Folge 4: nach Entscheidung K2 den gewählten Weg eintragen. IST: DNS zeigt auf srv1243952. Offen: Modell je Zeitplan und Modellauswahl in der Oberfläche als bekannte Lücken; Arbeitsbereich des Inhabers als eigene Entscheidung (Quelle: Inhaber, 14.11.2026) |
| `PROGRESS.md` | „Offene Arbeiten“: K0 als nächster Schritt mit Owner und Voraussetzung Shell auf beiden Servern |
| `docs/04-betrieb/server-befund-2026-11-14.md` | bleibt als Beleg unverändert; ein neuer Befund nach K0 berichtigt die Zuordnung der Oberfläche |
| `config/acceptance-coverage.json` | falls der Arbeitsbereich ein eigener Registereintrag werden soll: Akzeptanzkriterien aus Abschnitt 7 |
| `ops/hermes/einspielen.sh` (eigener Zweig) | Einspielen je Profil und Prüfung von `cron/jobs.json` auf eigene Modelle, bevor Rollen als Profile angelegt werden |
| `ops/hermes/home/.env.example`, `tools/check_hermes_config.py` | Bei Entscheidung für den Modell-Wächter: Variablennamen für Zugangswert und Adresse des Wächters aufnehmen und prüfen |

## 9. Befunde der unabhängigen Prüfung und was daraus wurde

Prüfung von PR 193 am Stand `efe937c`, 14.11.2026. Jeder Befund wurde vor der Änderung nachgestellt oder am Text nachgelesen.

| # | Befund | Nachgestellt | Was geändert ist | Offen |
|---|---|---|---|---|
| 1 | Schlüssel vor Entfernen des Sockets | ja, am Text (alte Folge E6 vor E7) | Reihenfolge gedreht: E6 erstellt den Container ohne Schlüssel neu und belegt den entfernten Socket, erst E7 trägt den Schlüssel ein. E0 meldet, falls schon ein Schlüssel eingetragen ist | – |
| 2 | Modellbindung trägt nur halb | ja: lokale Oberfläche zeigt „GPT-5.4 Mini“; Zeitplan-Bindung in `features/cron.md` | Abschnitt 3a: Was Zwang ist und was Sichtprüfung. Entwurf Modell-Wächter mit Tests; 9router bewertet; Bildschirmfotos als Testinstanz ohne Bindung gekennzeichnet | Wächter nicht eingespielt, nicht mit Hermes davor und nicht gegen OpenRouter gelaufen; Entscheidung K4 |
| 3 | Prüfsummen-Prüfung schlägt immer fehl | ja: `./MANIFEST.sha256: FAILED` | Manifest nennt sich nicht mehr selbst; Test `test_manifest_pruefung_besteht…` | – |
| 4 | Bindung an `127.0.0.1` vor der Absicherung | ja, am Text und an der Vorlage | `HERMES_WEBUI_HOST` in der Vorlage auskommentiert, eigener Schritt E9 nach E8; Test hält die aktiven Variablen fest | – |
| 5 | Erneutes Bereitstellen und Rückweg wirken nicht am laufenden Container | ja, am Skript (Ordner wurde umbenannt) | Ordner bleibt derselbe, Dateien einzeln ersetzt, Sicherung als Kopie, `--zurueck`; Abschnitt „Aktualisieren und Zurücknehmen“ | Verhalten am echten Container nicht gemessen |
| 6 | Web-App-Manifest hinter der Anmeldung | teilweise: Chromium lädt das Manifest nach der Anmeldung mit Zugangsdaten (Verweis trägt `use-credentials`), Name wird gelesen, keine Fehler | Messung in Abschnitt 5, Abnahmezeile 9 berichtigt | Installation selbst, Abruf der Icons dabei, iPhone/Safari |
| 7 | Snapshot könnte den vorhandenen überschreiben | ja: Die API-Beschreibung von Hostinger sagt es ausdrücklich | V0 (lesen) neu, V1 nur mit ausdrücklicher Freigabe, unmittelbar vor E1, nur für den Zielserver | – |
| 8 | Schreiben in den Browser-Speicher außerhalb der Schnittstelle | ja | im Skript und in Abschnitt 5 benannt; Prüfer lässt nur die zwei Schlüssel zu | Der Eintrag `hermes-skin` bleibt ein Schreibzugriff auf einen Schlüssel der Oberfläche; ohne ihn gäbe es keine Vorauswahl |
| 9 | 48 px für jedes `button` | ja | mit der Maus nur benannte, gemessene Elemente; mit dem Finger weiter für alle | dichte Ansichten nicht gemessen |
| 10 | Fokusrahmen links angeschnitten | ja, am Bildschirmfoto | Rahmen der Leiste liegt innen; neues Bildschirmfoto | – |
| 11 | Wettlauf zweier Läufe, Rest bei Abbruch | ja, am Skript | Sperre, Sicherungsname mit Prozessnummer, Aufräumen der Arbeitskopie; Test | – |
| 12 | Hostinger könnte eine eigene Kopie der Compose-Datei führen | nicht nachstellbar ohne Shell | Hinweis und Prüfung in `docker-socket-entfernen.md`, Vergleich in K0 | Antwort erst mit K0 |

Zusätzlich aus der Prüfung übernommen: HEAD auf `/login` liefert 501 (Abschnitt 2); der Platzhalter der Eingabe steht auf Deutsch.
