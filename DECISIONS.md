# DECISIONS — NeXify AI Gesamtlösung

## D-001 — Prototypen sind Referenz, nicht Produktionscode
- **Entscheidung:** `prototypen/*.dc.html` werden nachgebaut, nicht kopiert; das Manifest (`sha256sum -c`) bleibt unverändert.
- **Grund:** Design/Verhalten als Vorlage, aber kein Produktionscode (Auftrag in `AGENTS.md`).

## D-002 — Werte nur aus der Konfiguration
- **Entscheidung:** Designwerte aus `config/design-tokens.json`, Zahlen mit Preisbezug aus `config/fakten.json`/`config/api-prepaid.json`.
- **Grund:** Eine Quelle der Wahrheit; erfundene Zahlen/Preise sind unzulässig.

## D-003 — Mindestaufladung 10 € (Inhabervorgabe 29.09.2026)
- **Entscheidung:** `config/api-prepaid.json` `aufladung.minCent = 1000` ist maßgeblich; die Doku wurde angeglichen, E3 gilt als entschieden.
- **Grund:** Widerspruch zwischen Doku (50 €) und Inhabervorgabe (10 €) wurde durch den Faktenabgleich aufgedeckt.

## D-004 — Faktenabgleich nur mit passendem Layout
- **Entscheidung:** `tools/inhaltsabgleich.js` wird erst wieder in `make check` verdrahtet, wenn das erwartete Layout (api/, lib/, Prototypen im Root) hergestellt oder das Tool entfernt ist.
- **Grund:** Ein Prüfwerkzeug, das im Repo nicht laufen kann, darf keinen grünen Schein erzeugen; fehlende Quellen werden als Befund ausgegeben statt zu crashen.

## D-005 — Shop-API als eigener FastAPI-Dienst (`apps/shop-api`)
- **Entscheidung:** Katalog, Warenkorb, Checkout, Werkstätten, Admin und Konten laufen in `apps/shop-api` (FastAPI, async, OpenAPI unter `/api/openapi.json`); `backend/server.py` und `frontend/` sind nur dünne Supervisor-Hüllen, die echte Oberfläche bleibt `apps/web`.
- **Grund:** Der bestehende stdlib-Gateway (`apps/agent-gateway`) ist bewusst auf lokale Origins beschränkt; ein separater Dienst hält diese Grenze intakt und liefert Validierung/OpenAPI.

## D-006 — MongoDB als Shop-Speicher
- **Entscheidung:** Produkte, Preise, Warenkörbe, Bestellungen, Zahlungsereignisse, Werkstätten, Nutzer und Sitzungen liegen in MongoDB (`MONGO_URL`/`DB_NAME` aus der Umgebung). Preise/Summen werden ausschließlich serverseitig berechnet.
- **Grund:** Vorgegebene Laufzeitumgebung; Clientpreise werden ignoriert.
- **Stand 14.11.2026:** Als Zielbild überholt durch D-013 (alle Datenhaltung auf der eigenen Supabase-Instanz). D-006 beschreibt weiter den IST von `apps/shop-api`, bis die Migration nach D-013 umgesetzt und abgenommen ist.

## D-007 — Clerk ersetzt durch eigene Konten + Emergent Google Auth
- **Entscheidung:** Eigene Konten (bcrypt, serverseitige Sitzung im httpOnly-/Secure-Cookie `tk_session`, Registrierung, Login, Logout, Reset per Resend, Sperre nach 5 Fehlversuchen in 15 Minuten, Fehlertext „E-Mail oder Passwort ist falsch“) plus „Mit Google anmelden“ über Emergent-managed Google Auth, per E-Mail mit demselben Nutzer verknüpft. Rollen (`customer`, `admin`) stehen im eigenen Nutzerdatensatz; Gast-Warenkorb wird beim Login zusammengeführt. `@clerk/*` ist aus `apps/web` und `apps/site` entfernt; `LocaleAwareClerk.tsx` und `auth/public-provider.ts` bleiben nur als SDK-freie Hüllen für bestehende Inventare. `PREVIEW_TEST_AUTH` entfällt.
- **Grund:** Inhabervorgabe 31.10.2026; Clerk-Secret war nicht verfügbar, Clerk-Schlüssel dürfen nicht mehr erforderlich sein.
- **Folge:** Gespeicherte Browser-Nachweise, die an Clerk-/UI-Quellhashes gebunden sind, sind absichtlich ungültig (fail-closed) und müssen neu erzeugt werden.

## D-008 — Revolut live im Preview, BigBuy-Import blockiert
- **Entscheidung:** `REVOLUT_MODE=live` (Inhabervorgabe; kein Sandbox-Schlüssel). Webhook-Signatur und Idempotenz werden mit Test-Signaturmaterial und gemocktem Status-Readback getestet; es gibt keine Fake-Zahlung. Umschalten: `REVOLUT_MODE=sandbox` + `REVOLUT_MERCHANT_SECRET_KEY_SANDBOX`.
- **Grund/Blocker:** BigBuy-Produktion antwortet trotz freigegebener IP `34.170.12.145` mit `401 Invalid Token`; Sandbox-Host aus dem Pod nicht erreichbar. Der Katalog bleibt leer, bis ein gültiger Schlüssel vorliegt; der Import ist fertig verdrahtet (Admin → Import).

## D-009 — Produktaufbereitung (F-22, Umsetzung Phase 2): eigener Anwendungsfall `product_enrichment`
- **Entscheidung (Nutzeranweisung 31.10.2026):** Produkttexte werden über den eigenen Router (`9router`, `ROUTER_URL`/`ROUTER_KEY`, OpenAI-kompatibel) mit `ds/deepseek-v4-pro` bei `reasoning_effort: high` aufbereitet. Das ersetzt für diesen Anwendungsfall die allgemeine Vorgabe `deepseek/deepseek-v4.1-flash-1017`, die für alle übrigen Bereiche unverändert gilt. Es gibt keinen stillen Fallback: Ist das Modell nicht verfügbar, schlägt der Lauf mit Fehler fehl. Festgehalten in `config/llm-policy.json#use_cases.product_enrichment` und `config/llm-verbindungen.json#anwendungsfaelle.product_enrichment` und geprüft durch `tools/check_llm_policy.py`.
- **Bilder:** Keine generative Bearbeitung, weil Produkt und Lieferumfang unverändert bleiben müssen. Die Aufbereitung ist deterministisch (Pillow: Format, Weißraum, Schärfe, WebP; wo nötig lokale Freistellung). Das Original bleibt erhalten, und die aufbereitete Version wird mit Herkunft im Objektspeicher abgelegt, nicht als Base64 in Mongo.


## USER-LUXURY-20261101 · Material- und Medienrichtung

Pascal verlangt eine weniger militaristische, luxuriöse Gestaltung mit edlen Metallen und gezieltem Glas. Gemeinsame visuelle Schicht für Vite und Next, mehr Raum, zurückhaltendes Lime, Kontohinweis im Inhaltsraster und optionales Assistenzdock. Drei fachlich zugeordnete Editorial-Stills ersetzen keinen Katalog-/Funktionalitätsbeleg. Home veröffentlicht keine ungeprüften Review-/Ambientperformances mehr; Originaldateien bleiben erhalten. Reale Lippen-/Gestenfilme benötigen echte passende Quellen und separate Abnahme. REA6.8.0 lokal isoliert wiederhergestellt und MCP-discovered, Analyse jedoch an Host-Prozessprüfung blockiert; keine globale Registrierung/HTTP-Exposition oder Rechteänderung. Kein Gesamtfreigabeentscheid.

## D-010 — Öffentlicher Chat: KI-geführt, sichtbare KI-Kennzeichnung im Chat entfernt (13.11.2026)

- **Entscheidung (Inhaber Pascal Courbois, 13.11.2026):** Der öffentliche Chat wird KI-geführt statt
  modellfrei betrieben. Sichtbare KI-Kennzeichnungen werden aus der Chat-Oberfläche entfernt
  (Entscheidung „A und B“). Die Namen „AIFly ORACLE“ und „NeX Agentic AI“ bleiben.
- **Herkunft des Belegs:** Die Entscheidung wurde dieser Arbeitssitzung über die koordinierende Sitzung
  übermittelt. In diesem Repository liegt kein weiterer Beleg vor. Der Merge des zugehörigen Pull Requests
  durch den Inhaber gilt als Bestätigung; bis dahin ist die Entfernung nicht wirksam.
- **Benanntes Risiko (keine Rechtsberatung):** Art. 50 Abs. 1 der EU-KI-Verordnung (VO (EU) 2024/1689,
  anwendbar seit 02.08.2026) verlangt, dass Personen, die direkt mit einem KI-System interagieren, darüber
  informiert werden, sofern das nicht aus den Umständen offensichtlich ist. Ohne sichtbare Kennzeichnung im
  Chat stützt sich die Erkennbarkeit auf den Produktnamen und die Seite `/ki-hinweise`. Ob das genügt, ist
  rechtlich nicht geprüft. Der Inhaber hat die Entscheidung nach ausdrücklichem Hinweis auf dieses Risiko
  getroffen und trägt es.
- **Umfang der Entfernung:** In `apps/web/components/PublicOrientationChat.tsx` entfällt die Zeile
  „NeX Agentic AIFly kann Fehler machen.“ (de/nl/fr/en). An ihrer Stelle steht ein sachlicher Eingabehinweis
  mit Verweis auf die Datenschutzseite. Außerdem sendet `/api/chat` die Modellkennung nicht mehr an den
  Browser (bisher im `start`-Ereignis und in der JSON-Antwort); in der Ablage der Nachricht bleibt sie.
  Sonst wurde nichts entfernt.
- **Was bewusst bleibt:** (1) Der Assistent gibt sich nicht als Mensch aus: Die Vorgabe verlangt auf Nachfrage
  eine wahrheitsgemäße Antwort, und eine Aussage, ein Mensch zu sein, wird serverseitig durch die wahre Angabe
  ersetzt (`apps/web/lib/chat-guidance.ts`, Tests in `apps/web/auth/tests/chat-guidance.test.mjs`).
  (2) Datenschutz- und Rechtsseiten einschließlich `/ki-hinweise` sind unverändert. (3) Der Hinweis
  „ohne Live-KI“ erscheint weiter, wenn der Chat ohne Modellanbindung auf die Orientierung anhand der Website
  zurückfällt; er beschreibt dann den tatsächlichen Zustand.
- **Offener Abgleich:** `AGENTS.md` (Abschnitt „Verbindliche Regeln“) und `config/llm-verbindungen.json`
  (`kennzeichnung`) nennen die KI-Kennzeichnung nach Art. 50 weiterhin als Vorgabe. Diese Entscheidung ändert
  sie nicht; der Inhaber entscheidet, ob sie angepasst werden. Außerhalb des Chats (z. B. „KI-Assistent“ in
  `ExplainerSections.tsx`, verborgener Statustext in `Workspace.tsx`) wurde nichts geändert.
- **Folgen für andere Texte:** Mit dem KI-geführten Chat werden Besuchernachrichten an den Router und das
  Modell übermittelt und, falls Supabase eingerichtet ist, gespeichert. Die Aussage „arbeitet derzeit ohne Live-KI-Modell“
  auf `/ki-hinweise` und `/produkte/aifly-oracle` (`config/site-map.json`) trifft dann nicht mehr zu, und
  `/datenschutz` muss die Verarbeitung der Chatnachrichten abdecken. Beides ist vor dem Livegang vom Inhaber
  zu prüfen und anzupassen; diese Seiten wurden hier nicht verändert.
- **Rückweg:** Revert des Commits „chat: sichtbare KI-Kennzeichnung im Chat entfernen“ stellt die Zeile
  wieder her; die übrigen Chat-Pakete sind davon unabhängig.

## D-011 — Produktname „NeX AIFly Suite“ ersetzt „NeX2fly“; Betriebsmodell AI FACTORY (14.11.2026)
- **Entscheidung (Inhaber Pascal Courbois, 14.11.2026):** Der sichtbare Produktname ist überall „NeX AIFly Suite“; „NeX2fly“/„NeX2fly Suite“ ist historisch. Das Team besteht aus Pascal (Ideen, Design, Basis) und den Agenten NeX und AIFly; alles Weitere erarbeitet das Agententeam der AI FACTORY, orchestriert über Paperclip (voll zu konfigurieren und zu migrieren, Status: geplant, `config/automation.json` `user_selected_not_verified`).
- **Umfang:** Sichtbare Texte in `config/` (site-map, Oberflächen-, Startseiten-, Erklär-, Medien-, Presenter-Texte) und `apps/` in de/nl/fr/en. Interne IDs, Test-IDs und die Adresse `/produkte/nex2fly` bleiben unverändert, damit Links, Nachweise und Routen stabil bleiben; Nutzer, die „NeX2fly“ eingeben, landen in der Orientierung weiterhin auf der Suite-Seite. Historische Abgleich- und Quellinventare (`content-reconciliation-*`, `policy-source-inventory`, `rebuild-source-map`, `research/`, `integrations/`) bleiben als Historie unverändert.
- **Folge:** Die im Anforderungsabgleich festgehaltenen Quell-Prüfsummen von `apps/site/src/Auth.tsx` und `config/presenter-system.json` sind dadurch veraltet und werden – wie die bestehenden 40 Abweichungen dieser Art – erst mit einer echten Neuprüfung erneuert, nicht nebenbei. Die Freigabeliste `config/presenter-sources.json` wurde nur für `config/site-map.json` aktualisiert, nachdem geprüft war, dass sich die Datei gegenüber dem freigegebenen `main`-Stand ausschließlich durch die Namensersetzung unterscheidet (vorgesehener Ablauf „intentional source changes require reviewed inventory refresh“).

## Inhaberentscheidungen aus dem Gespräch vom 14.11.2026 (D-012 bis D-017)

Quelle aller sechs Einträge: Inhaber Pascal Courbois im Gespräch mit der koordinierenden Sitzung am 14.11.2026, dieser Arbeitssitzung als Auftrag übermittelt. Ein weiterer Beleg (Mitschrift, Mail) liegt im Repository nicht vor. Kennzeichnung: SOLL = gültige Vorgabe, IST = belegt mit Datum und Quelle, OFFEN = fehlt oder nicht belegt.

Hinweis zur Nummerierung: Der nicht gemergte Zweig `origin/claude/marke-texte` (Stand `45f0555`, 14.11.2026) vergibt D-011 bis D-020 für andere Entscheidungen. Führend ist `main`; beim Zusammenführen müssen die Einträge jenes Zweigs neu nummeriert werden.

## D-012 — Startseite ist die einzige fertige Referenz; Wiederverwendung und Gleichmacher vor jeder Auslieferung (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Die Startseite `/` ist die einzige fertige Referenz. Jede andere Seite verwendet ihre Bausteine wieder (Strict-Reuse); Nachbau und Wertekopien sind Fehler. Jede Auslieferung läuft vorher durch den „Gleichmacher“ (`tools/gleichmacher.mjs`).
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen (IST):** Hero-Baustein `HeroStage` für alle Seiten (PR 133, 139), TEILEKLAR-Abschnitte aus den Bausteinen der Startseite (PR 144), Werkzeug und Skill `.claude/skills/nexify-klon-fabrik/SKILL.md` (PR 142, 145). Messung gegen `https://nexifyai.de` am 14.11.2026, 10:42 UTC: 44 Seiten, 9.240 Vergleiche, 0 Abweichungen. Bausteinliste und Vorgehen stehen nur im Skill, nicht hier.
- **Offen:** Der Gleichmacher prüft elf Bausteine; Formulare, Karten und Eingabefelder sind nicht in der Prüfliste. Eine Messung ohne Abweichung belegt Gleichheit der geprüften Bausteine, keine Gestaltungs- oder Barrierefreiheitsabnahme.

## D-013 — Alle Datenhaltung auf der eigenen, selbst gehosteten Supabase-Instanz, auch der Shop (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Sämtliche Datenhaltung wird auf der eigenen, selbst gehosteten Supabase-Instanz gebaut (Open Source, PostgreSQL mit Row-Level-Security). Das gilt auch für den Shop.
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen:** D-006 (MongoDB als Shop-Speicher) ist als Zielbild überholt und bleibt IST, bis migriert ist. Die Entscheidung deckt sich mit `AGENTS.md` (Stack: PostgreSQL mit RLS; Regel „Mandantentrennung per RLS“). Chat, Angebote und Bestellungen liegen bereits im Supabase-Schema `chat` (`apps/web/supabase/migrations/0001` bis `0003`, `GO-LIVE.md`).
- **IST (14.11.2026):** `apps/shop-api` arbeitet weiter mit MongoDB (`MONGO_URL`/`MONGODB_URI`, `DB_NAME`); auf `main` gibt es kein Shop-Schema für PostgreSQL. In Produktion antwortet der Shop-Dienst mit 503 `project_binding_unverified` (Messung 10:41 UTC, siehe `PROGRESS.md`).
- **Offen:** Adresse und Zugang der Supabase-Instanz sind im Repository nicht belegt. Es fehlen Shop-Schema mit RLS, Plan für die Datenübernahme (Produkte, Bestellungen, Zahlungsereignisse, Konten und Sitzungen nach D-007), Idempotenz der Buchungen im neuen Speicher, Backup mit Wiederherstellungsnachweis und ein Rückweg. Umstellung der Produktion und jeder Eingriff in die bestehende MongoDB brauchen die Freigabe des Inhabers (D-016). Im führenden Register als Konflikt `DATA-STORE-001` geführt.

## D-014 — AI FACTORY: Rollen von NeX und AIFly ORACLE (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Präzisierung zu D-011: Der Inhaber gibt Ideen, Design und Basis. NeX führt aus, AIFly ORACLE koordiniert; beide erarbeiten alles Weitere. Orchestriert wird über Paperclip.
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen:** Deckt sich mit `AGENTS.md`, Abschnitt „Umsatz zuerst“ („AIfly ORACLE koordiniert“). Die Grenzen aus D-017 gelten für jede Rolle.
- **Offen:** Paperclip steht in `config/automation.json` als `user_selected_not_verified`. Instanz, Zugang, Konfiguration und Migration sind nicht belegt; es gibt keinen Nachweis eines laufenden Workers. Eine beschriebene Rolle ist kein laufender Agent (`AGENTS.md`).
- **Stand 14.11.2026:** Der Satz „Orchestriert wird über Paperclip“ ist überholt durch D-019. `config/automation.json` führt Paperclip seither als `superseded_by_owner_decision_not_pursued` (Eintrag bleibt als Historie) und Hermes als `owner_selected_container_reported_not_verified`.

## D-015 — Mobile Optimierung und PWA gehören zum Auftrag (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Mobile Optimierung und eine installierbare Web-App (PWA) sind Teil des Auftrags.
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen:** Betrifft `apps/web` (ausgelieferte Oberfläche). Im Register besteht dazu MASTER-13 (PWA, `apps/site`, lokal geprüft) und MASTER-09 (Responsive/Barrierefreiheit, lokal offen).
- **IST (14.11.2026):** `apps/web/app/manifest.webmanifest/route.ts` ist vorhanden. Live-Prüfung 10:41 UTC: kein Querüberlauf bei 360 und 1440 px auf den geprüften Seiten.
- **Offen:** Installation, Aktualisierung und Deinstallation auf echten Geräten sind nicht abgenommen (MASTER-13). Kein privater Offline-Betrieb ohne eigenen Produkt- und Datenvertrag. Umfang der PWA für `apps/web` (Service Worker, Offline-Seiten) ist nicht festgelegt.

## D-016 — Server-Bereinigung nur mit Freigabe und Rückweg (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Aufräumen auf den Servern geschieht nur mit Freigabe des Inhabers je Schritt und mit geprüftem Rückweg. `vsk-mongodb`, Traefik und laufende Kundenseiten werden nicht destruktiv angefasst.
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen:** Lesende Bestandsaufnahme ist zulässig; Stoppen, Löschen, Umkonfigurieren und Datenänderungen sind es ohne Freigabe nicht. Passt zu `AGENTS.md` („keine endgültige Löschung“, Hartsperren im Gateway).
- **Offen:** Ein aktuelles Inventar der Server und Dienste liegt in dieser Sitzung nicht vor; welche Dienste zu `vsk-mongodb` und Traefik gehören und welche Kundenseiten laufen, ist hier nicht belegt.

## D-017 — Die Grenzen bleiben (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Unverändert gilt für jede Arbeit der Agenten: keine Zahlungen, keine Änderung an Preisen oder Rechtstexten, kein Lockern von Schutzmechanismen, keine Zugangsdaten im Klartext, nichts löschen.
- **Quelle:** Inhaber im Gespräch 14.11.2026.
- **Folgen:** Bestätigt bestehende Regeln, ersetzt keine: `AGENTS.md` „Nicht tun“, „Constraints“ und „Verbindliche Regeln › Sicherheit“. D-012 bis D-016 sind innerhalb dieser Grenzen auszuführen.
- **Offen:** Laut Sitzungsnotiz vom 14.11.2026 standen Zugangsdaten (BigBuy, Composio) im Gespräch; ob sie erneuert wurden, ist nicht belegt (siehe `PROGRESS.md`, „Offene Arbeiten“).

## D-018 — Graphify-Wissensgraph in allen Projekten, auch in Kundenprojekten, je Projekt getrennt (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Der Wissensgraph mit Graphify wird in allen Projekten eingesetzt, auch in Kundenprojekten. Jedes Projekt bekommt seinen eigenen Graphen; Graphen verschiedener Projekte werden nicht zusammengeführt.
- **Quelle:** Inhaber im Gespräch mit der koordinierenden Sitzung am 14.11.2026, dieser Arbeitssitzung als Auftrag übermittelt; für dieses Repository zusätzlich Merge von PR 151 (`fb053a9`). Ein weiterer Beleg liegt im Repository nicht vor.
- **Folgen:** Vor dem Einzellesen vieler Dateien wird der Graph befragt (`.claude/skills/nexify-graph/SKILL.md`; Einstieg, Befehle und Grenzen stehen nur dort). Der Graph ersetzt keine Prüfung und kein Gate. Die Grenzen aus D-017 gelten: keine Projektinhalte an fremde Dienste, keine Kundendaten in dieses Repository.
- **IST (14.11.2026, `git show --stat fb053a9`):** In diesem Repository eingerichtet sind `tools/graph.sh`, `make graph`, `.graphifyignore`, `.graphifyrc` und der Skill `nexify-graph`; die Ausgabe `graphify-out/` ist über `.gitignore` unversioniert. Laut Skill läuft nur der lokale Code-Lauf, ohne Modell und ohne Konto.
- **Offen:** Ein Konto beim Cloud-Dienst von Graphify ist nicht eingerichtet und bleibt eine eigene Inhaberentscheidung. Die Einrichtung in den anderen Projekten und in Kundenprojekten ist hier nicht belegt; sie geschieht in den jeweiligen Repositories. Ein eigener Lauf von `make graph` wurde in dieser Nachführung nicht gemessen.
- **Hinweis zur Nummerierung:** Der nicht gemergte Zweig `origin/claude/marke-texte` vergibt D-018 für eine andere Entscheidung (Nachtlauf „Regelkreis“); führend ist `main`, siehe Hinweis vor D-012.

## D-019 — Hermes ist die Orchestrierungs-Laufzeit, betrieben mit DeepSeek (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Wörtlich: „hermes soll unser orchestrator fur alles werden mit der deepseek dazu konfiguriere ihn und lerne ihn an“. Hermes (Nous Research `hermes-agent`) orchestriert; das Modell folgt unverändert `config/llm-policy.json`.
- **Quelle:** Inhaber im Gespräch mit der koordinierenden Sitzung am 14.11.2026; auf die Rückfrage zu den offenen Punkten antwortete er „Entscheide“. Die folgenden Festlegungen unter „Folgen“ sind deshalb Entscheidungen der koordinierenden Sitzung im Auftrag des Inhabers und als solche gekennzeichnet.
- **Verhältnis zu D-014:** Ersetzt in D-014 nur den Satz „Orchestriert wird über Paperclip“. Die Rollen bleiben: NeX führt aus, AIFly ORACLE koordiniert. Auslegung der koordinierenden Sitzung: Hermes ist die Laufzeit, in der diese Rollen arbeiten, keine dritte Rolle. Paperclip wird nicht weiter verfolgt; `config/automation.json` ist entsprechend nachzuführen.
- **Folgen (festgelegt von der koordinierenden Sitzung):** (1) Konfiguration, Persona und Einspielweg liegen in `ops/hermes/` (PR 157). (2) Hermes bekommt das Monorepo nur lesend, bis ein Funktionsnachweis vorliegt. (3) Die Rückfrage vor Befehlen bleibt eingeschaltet (`approvals.mode: manual`). (4) Die Web-Oberfläche bleibt nicht öffentlich erreichbar; Zugriff nur über SSH-Tunnel oder WireGuard. (5) Der Docker-Socket im Hermes-Container wird entfernt, sobald die Einrichtung abgeschlossen ist; bis dahin ist er als Risiko zu führen, weil er faktisch Root auf dem Host gibt. (6) Kein Nachrichtenkanal an Dritte ohne eigene Freigabe.
- **IST (14.11.2026, Hostinger-API, nur lesend):** Hermes läuft als Container `hermes` im Projekt `docker-hermes` auf srv1941843 seit acht Tagen. Version, Modell und Konfiguration dort sind nicht belegt. Siehe `docs/04-betrieb/server-befund-2026-11-14.md`.
- **Offen:** `config/integrations/nexify-team-runtime-candidate.json` ordnet Hermes nur `triage` und `angebot` zu, und `tools/check_team_runtime_candidate.py` erzwingt das; beides ist gemeinsam nachzuführen, bevor Hermes weitere Rollen übernimmt. Ein echter Modellaufruf ist nicht belegt (kein Schlüssel); der bezahlte Nachweis braucht einen OpenRouter-Schlüssel mit Ausgabenlimit, den der Inhaber einträgt. Die Grenzen aus D-016 und D-017 gelten für Hermes wie für jede Rolle.
- **Stand 14.11.2026 (Nachführung, Zweig `claude/d019-nachfuehren`):** `config/automation.json` ist nachgeführt (siehe Stand in D-014). Der Kandidat trägt den Block `orchestration_runtime` (`owner_selected_not_activated`) und `remote_installation` mit Verweis auf den Server-Befund; `tools/check_team_runtime_candidate.py` bindet beides exakt und prüft zusätzlich `execution_authority` jeder Rolle. Nicht geändert: `activation`, `controller`, `execution_authority` und die Zuordnung der neun Profile (Hermes weiter nur `triage` und `angebot`). Offen bleibt, welche weiteren Profile in Hermes laufen sollen; das setzt den Funktionsnachweis und die Entfernung des Docker-Sockets (Folge 5) voraus.

## D-020 — Studienkolleg Aachen: bestehende Bilder und Videos des Kunden werden eingebunden, neue nicht erstellt (14.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026):** Wörtlich: „auch die ganzen bilder und videos usw. der bestehenden studienkollage werden eingearbeitet. nur das hero bild muss neu genriert werden. alle anderen sind direkt vom stk und duerfen und sollen eingearbeitet sein.“ Auf Rückfrage zu den Videos: „keine neuen erstellen! aber bestehende einbinden klar.“
- **Quelle:** Inhaber im Gespräch mit der koordinierenden Sitzung am 14.11.2026.
- **Folgen:** Die bisherige Kurzform „Für Studienkolleg Aachen … keine Videos“ ist zu lesen als: keine neu erstellten Videos. Bestehendes Material des Kunden wird übernommen und optimiert. Einzige Neuerzeugung ist das Hero-Bild; sein Prompt geht dem Inhaber zur Freigabe zu. Kundendaten und Kundenmaterial bleiben im Kundenrepository, nicht in diesem (D-017).
- **Offen:** Die Umsetzung geschieht im Kundenrepository und ist hier nicht belegt.

## D-021 — Cloudflare als Zielhosting gewünscht; in Prüfung, nicht umgeschaltet (14.11.2026)
- **Status des Eintrags:** Vorschlag der nachführenden Sitzung (Zweig `claude/paket-a-stand`). Der Eintrag hält einen Auftrag des Inhabers und Messwerte fest; er wird mit dem Merge durch die koordinierende Sitzung oder den Inhaber wirksam.
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026, 17:42 UTC):** Wörtlich: „Okay. Wenn möglich, lass uns den Umzug auf Cloudflare durch fuhren. Denn da sind wir kostenfrei. Statt Vercel. Und da wir bei cloudflare die domains haben, sowie andere dinge haben.“ Cloudflare ist damit das gewünschte Zielhosting für `apps/web`. Zustand: in Prüfung, nicht umgeschaltet. Der Auftrag steht unter dem Vorbehalt „wenn möglich“ und der Erwartung „kostenfrei“; beides ist nicht erfüllt belegt (siehe IST).
- **Quelle:** Inhaber im Gespräch mit der koordinierenden Sitzung am 14.11.2026, 17:42 UTC (Sitzungsverlauf 69187537, dort nachgelesen). Messwerte: `docs/04-betrieb/cloudflare-umzug-2026-11-14.md` auf dem Zweig `claude/cloudflare-umzug` (Stand `65a6577`), nicht auf `main`.
- **Folgen:** Der Satz „Cloudflare wird als Hosting nicht verfolgt“ der Führungsentscheidung vom 13.11.2026 in `AGENTS.md` ist überholt. Die übrige Führungsentscheidung vom 13.11.2026 gilt weiter: Vercel bleibt der Auslieferungsweg, bis der Umzug gemessen und vom Inhaber abgenommen ist, und bleibt bis dahin als Rückweg bestehen. Der Shop-Dienst (`apps/shop-api`, Python) zieht nicht mit auf Workers um und bleibt vorerst auf Vercel; sein endgültiger Ort ist eine eigene Entscheidung. Jede Umschaltung von DNS oder Produktion braucht die Freigabe des Inhabers je Schritt (D-016); die Grenzen aus D-017 gelten (kein Kauf eines Tarifs durch Agenten).
- **IST (14.11.2026, Bericht auf `claude/cloudflare-umzug`, hier nicht nachgemessen):** Der Bau von `apps/web` für Workers läuft durch. Die Rechenzeit lag lokal in der Workers-Laufzeit bei 46 bis 56 ms je Seite; der kostenlose Workers-Tarif erlaubt 10 ms je Anfrage. Das ist keine Messung auf Cloudflare: drei Messversuche auf `workers.dev` zwischen 18:10 und 18:35 UTC kamen nicht zustande (Token ohne Worker-Recht). Drei Kostenwege: A · kostenloser Tarif mit Seiten wie heute, nur wenn die Rechenzeit auf Cloudflare unter 10 ms bleibt, nach der lokalen Messung nicht zu erwarten; B · kostenloser Tarif mit öffentlichen Seiten als fertigen Dateien, verlangt einen Umbau in `apps/web` (feste Sprachpfade statt `?lang=`, Farbschema und Chat-Zustand im Browser); C · bezahlter Workers-Tarif, mindestens 5 USD je Monat und Konto.
- **Stand 14.11.2026, 20:40 UTC:** Dieser Eintrag ist mit PR 176 (`5f0a411`, 18:48 UTC, Merge durch `nexifyai-dev`) auf `main`. Eine ausdrückliche Bestätigung des Wortlauts durch den Inhaber ist im Repository nicht belegt; der Vermerk „Vorschlag“ bleibt deshalb stehen. Die Vorbereitung liegt inzwischen als PR 184 vor (Zweig `claude/cloudflare-umzug`, Kopf `1c43325`, nicht gemergt). Der mit PR 183 vorbereitete und gesperrte Chat-Weg über das Cloudflare AI Gateway ist kein Hosting und von diesem Eintrag nicht gedeckt; ein eigener D-Eintrag dafür ist als Vorschlag in `docs/04-betrieb/cloudflare-ai-gateway-2026-11-14.md`, Abschnitt 8, formuliert und nicht eingetragen.
- **Offen:** Wahl des Kostenwegs A, B oder C (Inhaber). Messung auf einer Vorschau unter `workers.dev` (braucht ein Token mit Worker-Recht). Ort des Shop-Dienstes und Ersatz seiner Bindung an `VERCEL_PROJECT_ID` (Schutzmechanismus, D-017). Die Vorbereitung ist nicht auf `main`; `apps/web/wrangler.jsonc` und `docs/deployment/cloudflare-workers.md` auf `main` sind der Stand vor diesem Auftrag. Unabhängig davon ist laut Mail vom 14.11.2026, 01:37 UTC, eine Vercel-Zahlung fehlgeschlagen (`PROGRESS.md`, „Braucht den Inhaber“).

## D-022 — Kopfleiste: Das Glas liegt rechts am Projektschalter an (14.11.2026)
- **Status des Eintrags:** Vorschlag der nachführenden Sitzung (Zweig `claude/paket-a-stand`), wie D-021.
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 14.11.2026, 17:07 UTC):** Wörtlich: „Lege den Header rechts an den button an.“ Die Glasleiste der Kopfzeile schließt beim Blättern rechts am Schalter „Projektgespräch anfragen“ ab.
- **Quelle:** Inhaber im Gespräch mit der koordinierenden Sitzung am 14.11.2026, 17:07 UTC (Sitzungsverlauf 69187537, dort nachgelesen), mit Bildschirmfoto laut PR 171.
- **Folgen (IST):** Umgesetzt mit PR 171 (`b50d0c6`): rechter Innenabstand der Leiste beim Blättern 12 px statt 24 px. Die Prüfregel folgt mit PR 175 (`2906f58`, `tools/kopfleiste-regel.mjs`): rechts über 640 px Breite 12 px ±1 px. Messwerte stehen in `PROGRESS.md`.
- **Stand 14.11.2026, 20:40 UTC:** Mit PR 176 (`5f0a411`) auf `main`, Vermerk „Vorschlag“ wie bei D-021 unverändert. Neu offen und nicht entschieden: Auf `/kontakt` und `/leistungen` läuft die Abschnittsleiste beim Blättern sichtbar unter der Glasleiste durch (laut PR 188, dort nur gemessen; `PROGRESS.md`, „Braucht den Inhaber“).
- **Offen:** Laut PR 175 stehen über und unter dem Schalter je 6 px Glas, rechts 12 px. Ob rechts ebenfalls 6 px gelten sollen, entscheidet der Inhaber; bis dahin gilt der eingebrachte Wert.

## D-023 — Studio-Seiten als Inhalt übernehmen, Selbstkonfiguration als prüfbares Register (18.11.2026)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, 18.11.2026):** Auf die Frage, wie die Seiten aus `nexfiy-ai-studio` in das kanonische Repository kommen: „Bestpraxis. oder clone die Seiten. Wie es nach Bestpraxis geleost wird.“ Auf die Frage nach der Vorgabe für die Selbstkonfiguration: „Diese sind zu erstellen. Starte daher das gesamte, zuvor mit den Experten nach soll vorgaben zu planen, umzusetzen, relasieren, in betrieb zu nehmen und dauerhaft zu betreiben.“
- **Quelle:** Paperclip-Interaktion `968460c7-eea5-4853-9ee1-84ac62ca739c`, beantwortet am 18.11.2026, 02:16 UTC (Fragen `integration_mode` und `self_configuration_spec`). Wortlaut unverändert übernommen, Rechtschreibung wie im Original.
- **Folgen:** (1) Kein pauschaler Projektimport. Die Seiten des Studios werden als Inhalt in das kanonische Modell (`config/site-map.json`, Abschnitte und vier Sprachsätze) übernommen, Route für Route mit Beleg. (2) Das Studio-Repository ist keine fremde Quelle: seine `README.md` nennt dieses Repository als Herkunft, es ist eine Lovable-Ausgabe von N1. Es wird deshalb als `agency_system` geführt, nicht als Kundenprojekt. (3) `config/source-boundaries.json` führt es als `N3` mit festgenageltem Commit, Pfaden, Zweck, Lizenzgrundlage, Anpassungen und Tests. (4) Die Selbstkonfiguration wird als prüfbares Register `config/selbstkonfiguration.json` mit Erläuterung `docs/automation/selbstkonfiguration.md` und Prüfer `tools/check_selbstkonfiguration.py` erstellt; die Goal-Automatik steht darin als Ablauf mit Haltebedingungen, nicht als Freibrief. (5) Planung, Umsetzung, Release und Betrieb werden mit Fachagenten gefahren (`nexify-agenten-koordination`); die koordinierende Sitzung prüft die Berichte nach.
- **IST (18.11.2026):** Quelle gelesen und festgenagelt: `main` = `d43b95de17ef4011ad0bad9e6be9357739621321`, 43 Routen, davon 41 bereits in `config/site-map.json`; neu sind `/passwort-vergessen` und `/teileklar/bestellungen`. Die Routen- und Abschnittszuordnung steht in `docs/migration/seiten-import-2026-11-18.md`. Nichts importiert, nichts ausgeliefert.
- **Offen:** Übernahme der zwei neuen Routen in `config/site-map.json` samt vier Sprachsätzen und Abschnitten (eigener PR; `config/presenter-sources.json` bindet die Datei, der Beleg wird dabei neu abweichend). Die 41 gemeinsamen Routen werden nur dort nachgezogen, wo der Vergleich einen inhaltlichen Unterschied belegt. Wissenssprung weiter rot (Umgebungsrecht auf `REA-CAPABILITY-POLICY.json`). Hermes-Schlüssel und Rollenumfang bleiben bei NEX-541.
