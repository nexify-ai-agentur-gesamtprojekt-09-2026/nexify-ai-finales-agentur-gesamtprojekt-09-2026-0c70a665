# AUFTRAG AN DEN CODEX-AGENTEN – NeXify-Gesamtlösung bis zur Liveschaltung

**Auftraggeber:** Pascal Courbois, NeXify AI · **Auftragsdatum:** 28.09.2026 · **Auftrags-ID:** NEXIFYAI-AT-2026-09-CODEX-01 (Registry-Nummer `UNVERIFIED`)
**Sprache:** Alles, was du schreibst (Code-Kommentare, Commits, Berichte, UI-Texte), ist **Deutsch**. Bezeichner im Code dürfen englisch sein, wenn das Bestandsmuster es so vorgibt; im Paket sind sie deutsch – folge dem Paket.

---

## 0. Lies das zuerst – Wie dieser Auftrag funktioniert

Du bist ein autonomer Umsetzungsagent. Du erhältst ein **fertig konzipiertes Paket** (Oberflächen, 24 Fachkerne mit Prüffällen, API-Vertrag, Migrationen, Installation, Betriebshandbuch, Regelwerk). Deine Aufgabe ist **nicht**, neu zu entwerfen, sondern:

1. das Paket **als Code-Basis in Betrieb zu nehmen** (Backend, Datenbank, Gateway, Worker, Oberflächen als echte Anwendung),
2. die **bestehenden Dienste** (AgentMemory, LightRAG, 9Router, DeepSeek Harness, n8n, Core-API, teileklar.shop u. a.) nach festem Muster **anzubinden oder abzulösen**,
3. alles **lückenlos zu prüfen**,
4. bis zur **Vorschau-Stufe** zu bringen und **dort anzuhalten**. Die Liveschaltung führst du nur nach schriftlicher Freigabe von Pascal durch (Abschnitt 13).

**Arbeitsweise in einem Satz:** Erst lesen, dann Prüffall schreiben, dann umsetzen, dann nachweisen – nie aus dem Gedächtnis, nie ohne Beleg, nie auf Produktivdaten schreibend ohne Freigabe.

### 0.1 Lesereihenfolge (Pflicht, vor der ersten Codezeile)
| # | Datei | Warum |
|---|---|---|
| 1 | `UEBERGABE.md`, `MANIFEST.md` | was gültig ist, was ersetzt ist |
| 2 | `AGENT.md` | Arbeitsregeln des Projekts, Sprachvorgabe |
| 3 | `docs/SOLL-Beschreibung.md` | Seiten, Seitenfolgen, Abweichungen IST→SOLL |
| 4 | `docs/paket/00-hauptdokument.md` | Einstieg in die Bände 01–13 |
| 5 | `docs/paket/12-bestandsuebernahme.md` | **Muster für jeden Altbestand** |
| 6 | `docs/paket/13-inbetriebnahme.md` | Reihenfolge der Inbetriebnahme |
| 7 | `docs/paket/11-pruefplan-logik-und-seiten.md` | Prüfplan, gegen den du abnimmst |
| 8 | `docs/paket/02-plattform.md`, `03-datenblaetter.md`, `04-architektur.md`, `docs/architecture/*.md` | Backend, Dienste, C4 |
| 9 | `docs/paket/05-betrieb.md`, `06-agenten.md`, `07-wiki.md` | Betrieb, Agentenrollen, Wissensbasis |
| 10 | `docs/adr/0001–0008` | getroffene Entscheidungen – nicht still umkehren |
| 11 | `api/openapi.yaml` | API-Vertrag 1.1.0 – **einzige** Schnittstelle der Oberflächen |
| 12 | `config/*.json` | alle Werte; `config/fakten.json` ist Quelle der Wahrheit für Zahlen |
| 13 | Abschnitt 12a dieses Auftrags + `docs/paket/06-agenten.md` | gesamte KI-Konfiguration |

Kannst du eine dieser Dateien nicht lesen: **anhalten**, Befund `B-LESEN` im Bericht, nicht raten.

Zusätzlich lesen: Bände `01-installation`, `08-workspace`, `09-cd-2026`, `10-pruefung`; `Handbuch.md`, `INBETRIEBNAHME.md`, `ARCHITEKTUR.md`, `Designsystem.md`, `CLAUDE.md`, `README.md`; `docs/handoffs/*`; `docs/03-backend/*` (u. a. Abrechnungskonzept, Landingpage-Prüfungen).

### 0.2 Vollständiges Bestandsverzeichnis des Pakets (was es gibt und was du damit tust)
| Bereich | Inhalt | Umgang |
|---|---|---|
| Oberflächen `*.dc.html` | 33 aktuelle laut `MANIFEST.md` | **visuelle und funktionale Referenz** für die Zielanwendung (Abschnitt 3a) |
| Ersetzte Oberflächen | `NeXifyAI Cloud` (ohne Nr.) und v3–v9, `myADMIN.dc.html` (v1) | nicht übernehmen; nach Abnahme ins Archiv |
| Skizzen | `Canvas.dc.html`, `Workspace Wireframes.dc.html`, `NeXify-Agent-3D.html` | nicht übernehmen; 3D-Agent nur nach eigener Freigabe |
| E-Mail-Vorlagen | `E-Mail-Transaktional-Angebot.html`, `E-Mail-Marketing-Newsletter.html` | in Versand-Vorlagen (`lib/versand.js`) überführen; Werbemail nur mit Einwilligung, Abmeldelink, Impressum |
| Laufzeit der Prototypen | `support.js`, `_ds_preview_runtime.js`, `nx-page.js`, `deck-stage.js`, `doc-page.js`, `image-slot.js`, `three-d-stage.js`, `styles.css` | **nur für Prototypen**, nicht in die Produktion übernehmen |
| Gestaltung | `design/tokens.json` + `tokens.css`, `tokens/*.css`, `components/`, `guidelines/`, `ui_kits/`, `scripts/build-tokens.mjs`, `scripts/check-system.mjs` | **eine** Token-Quelle festlegen (`design/tokens.json`), Rest daraus erzeugen; Abweichungen = Befund |
| Kerne `lib/` | 24 Dateien mit `FAELLE` | unverändert übernehmen, unter Node testen |
| Tests `tests/` | 21 Node-Testdateien | **fehlend:** `kundenwege.test.js`, `prepaid.test.js`, `inhaltsabgleich.test.js` – anlegen (Muster der übrigen: `FAELLE` ausführen, Exit ≠ 0 bei Fehlschlag) |
| Zweiter Preiskern | `tools/nexify-preis.js` + Test | **Konflikt mit `lib/prepaid.js`** – nach Entscheidung E1 genau einen Kern behalten, anderen entfernen |
| CI-Werkzeuge | `verweise`, `inhaltsabgleich`, `mandanten-pruefung`, `code-regeln`, `abhaengigkeiten`, `norm-lint`, `regel-pruefung`, `design-norm`, `bestpraxis`, `doku-generator` | in `.gitlab-ci.yml` lauffähig machen |
| Einmal-Umwandler | `dark-convert`, `v8-type`, `v9-back`, `clickhouse-dark`, `teileklar-dark`, `hybrid-light`, `click-ui` | **nicht ausführen**, nicht in CI; nach `tools/archiv/` verschieben |
| **GitHub-Workflow** | `.github/workflows/ci.yml` | **Verstoß gegen H-06** – Inhalt in `.gitlab-ci.yml` übernehmen, dann `.github/` entfernen; `github.md` durch Repository-Angabe GitLab ersetzen |
| `.env.example` | Shop-Stand: `ANTHROPIC_API_KEY`, `KLARA_MODEL`, `PAYMENT_*`, `SMTP_*`, `SENTRY_DSN` u. a. | **Konflikt mit OpenBao/9Router** – auf `playbooks/vorlagen/env.j2` zusammenführen: Modellzugang nur über Router, Geheimnisse nur als OpenBao-Referenz, Sentry nur mit ADR (Drittland prüfen) |
| Konfiguration | zusätzlich `api-prepaid.json` (Prepaid-Regeln), `integrationen.json` (Dienste ↔ Adapter, Gateway-Basis `https://api.nexifyai.cloud/v1`, Ereignisse `POST /v1/events`) | wie 12a.1 gegen reale Dienste prüfen |
| Migrationen | 001–007, **008_api_prepaid.sql vorhanden** (Journal nur anhängend, Mikrocent) | gegen leere DB laufen lassen; 008 gegen Bestands-Journal U-01 abgleichen |
| Architektur | `docs/architecture/c4-*.md`, ADR 0001–0008 (u. a. 0001 modularer Monolith, 0002 eine Oberfläche, 0003 Gestaltungsnorm, 0006 Vektorspeicher) | Mermaid-Rendering prüfen; ADRs nicht still umkehren |
| Projekt-Skill | `skills/nexifyai-kern-muster` | Muster für neue Kerne befolgen |
| Arbeitsstände | `docs_dev/`, `learning-captures/`, `docs/plans/`, `screenshots/`, `versions/`, `uploads/` | nur lesen; nicht ausliefern; Uploads können personenbezogene Daten enthalten – nicht in Git |
| Assets | `assets/`, `manifest.webmanifest` | übernehmen; Bildrechte je Datei prüfen |
| Rechtliches | `LICENSE`, `API-Rechtliches.dc.html` (Entwurf) | Lizenz der Abhängigkeiten prüfen (OSS-Pflichten); Rechtstexte nur nach E2 |
| **Fehlt ganz** | Impressum, Datenschutzerklärung, AGB Agentur, Barrierefreiheitserklärung, Cookie-Einstellungen | als Seiten anlegen, Inhalt **nicht erfinden**: Platzhalter gesperrt bis Pascal liefert (E12) |

---

## 1. Ziel und Endzustand

**Endzustand (Definition of Done des Gesamtauftrags):**
- Eine Anwendung ersetzt Agentur-Website, Business-Portal, altes mzADMIN, DSH-Oberflächen und Shop-Frontend.
- Alle Oberflächen aus `MANIFEST.md` mit Stand **aktuell** laufen als echte Seiten gegen das Gateway, **keine Musterdaten** im Betrieb.
- Alle 24 Kerne in `lib/` laufen unter Node im Gateway/Worker; alle Prüffälle grün unter Node **und** in der GitLab-CI.
- Datenbank mit Migrationen 001–008 (008 ist von dir zu erstellen, siehe U-01), Zeilenebenen-Sicherheit aktiv, Mandantentrennung geprüft.
- Altbestand ist je Bestandteil U-01 … U-16 im Zustand **angebunden**, **abgelöst** oder **begründet behalten** – mit Paritätsnachweis.
- Vorschau-Umgebung läuft stabil (Health ≥ 60 s ohne Fehler), Prüfplan Band 11 bestanden, Rollback geprüft.
- Übergabebericht liegt vor; Pascal erteilt oder verweigert die Freigabe zur Liveschaltung.

**Nicht-Ziele:** kein Redesign, keine neuen Produkte, keine neuen Anbieter ohne ADR, keine Zertifizierung, keine Rechtsberatung.

---

## 2. Unverletzliche Regeln (Verstoß = Abbruch der Aufgabe, Bericht an Pascal)

| ID | Regel |
|---|---|
| H-01 | **Hartsperren:** kein Server-Neustart, keine Live-DNS-Änderung, keine vollständige Firewall-Änderung, kein Eingriff in WireGuard – auch nicht mit Freigabe dieses Auftrags. Nur Pascal persönlich. |
| H-02 | **Nur lesend auf Bestand**, bis Inventar, Sicherung und Paritätstest vorliegen. Löschen/Abschalten nur nach Sicherung + Probelauf + Bestätigung Pascal (Regel R-13). |
| H-03 | **Keine Geheimnisse** in Git, Logs, Berichten, Prompts, Tickets. Geheimnisse nur in OpenBao; im Bericht nur Pfad + Hash. |
| H-04 | **Keine Musterdaten** im Betrieb. Fehlt ein echter Wert: Konfigurationsschlüssel mit `UNVERIFIED` markieren, Funktion bleibt gesperrt, Befund im Bericht. Keine erfundenen Preise, Kennzahlen, Logos, Zitate. |
| H-05 | **Studienkolleg-Server nicht anfassen** (U-16, fremdes Konto). |
| H-06 | **GitLab** (`gitlab.nexifyai.cloud`) ist das einzige Repository. Kein GitHub, kein Vercel, kein Redis (Valkey nur, wo Langfuse es mitbringt). |
| H-07 | **Datenhaltung EU/Frankfurt.** Kein neuer Drittlandtransfer ohne ADR und Freigabe. |
| H-08 | **Prompt- und Rechtstext-Versionen sind unveränderlich.** Änderungen nur als neue Version, aktiv erst nach Freigabe Pascal. |
| H-09 | **Keine Abkürzung am Freigabe-Gate.** Grüne CI ist kein Go-Live. |
| H-10 | **Widerspruch nicht glätten.** Weichen Paket, Bestand und Doku voneinander ab: Befund im Konsistenzregister, Entscheidung durch Pascal. |

---

## 3. Systembild (Soll-Architektur)

```
Browser (Oberflächen .dc.html → später gebaute Seiten)
   │  HTTPS (Traefik/cloudflared, bestehend)
   ▼
Gateway (REST nach api/openapi.yaml, Auth, Idempotenz, RFC 9457)
   ├── Kerne lib/*.js (reine Funktionen, keine Ein-/Ausgabe)
   ├── Postgres (Supabase self-hosted) + pgvector 768 + RLS je mandant_id
   ├── Worker (Warteschlange in Postgres, Nachtlauf, Versand, Webhooks)
   ├── MCP-Server (config/mcp-server.json) – Werkzeuge für Agenten
   ├── 9Router ──► Modelle (einzige Tür; vLLM lokal laut compose)
   ├── AgentMemory (Adapter über lib/gedaechtnis.js)
   ├── LightRAG (Adapter über lib/rag.js)
   ├── Langfuse (Web, Worker, ClickHouse, Valkey, MinIO) + OTel-Collector
   ├── Resend (Versand, lib/versand.js)
   ├── Revolut Business Pay (Zahlung, Webhook, lib/prepaid.js)
   ├── n8n (nur über signierte Gateway-Hooks, HMAC)
   └── OpenBao (Geheimnisse)
```
Dienste laut `deploy/compose.yml`: `gateway, mcp, worker, vllm, otel, langfuse-web, langfuse-worker, langfuse-clickhouse, langfuse-valkey, langfuse-minio`. Postgres/Supabase, OpenBao, Traefik/cloudflared, GitLab, n8n, AgentMemory, LightRAG, 9Router sind **Bestand** oder werden von `install.sh` bereitgestellt – prüfe das im Inventar (Phase 1).

### 3a. Zielanwendung für die Oberflächen
Die `.dc.html`-Dateien sind **Prototypen** auf einer Vorschau-Laufzeit. Für den Betrieb baust du eine echte Anwendung:
1. **Zielstack als ADR-0009 vorschlagen** (Entscheidung E10). Vorschlag laut NeXify-Stack: Next.js (App Router, TypeScript, self-hosted im Compose-Projekt, kein Vercel), Server-Komponenten für öffentliche Seiten (SEO), Client-Komponenten nur für Interaktion. Abweichung nur begründet.
2. **Ein Modul je Bereich** (ADR-0001 modularer Monolith): `web/oeffentlich`, `web/teileklar`, `web/konto`, `web/portale/*`, `web/intern/*`.
3. **Gestaltung pixelgenau** aus dem Prototyp übernehmen; Token nur aus `design/tokens.json`; Vorher-Nachher-Bildvergleich je Seite bei 320, 768, 1440 px (Toleranz im Bericht nennen).
4. **Daten** nur über das Gateway (`api/openapi.yaml`), Typen aus dem Vertrag erzeugen; keine Musterdaten, Leerzustände nach SOLL-Beschreibung § 9.
5. **Parameter und Anker** der Prototypen (`?weg=`, `?rolle=`, `#konsole` …) als stabile Routen erhalten oder mit 301 umleiten.
6. **Barrierefreiheit** WCAG 2.2 AA je Komponente; Tastatur, Fokus, Ziele ≥ 44 px.
7. **SEO:** Titel, Beschreibung, Open Graph, strukturierte Daten, Sitemap, `hreflang` nur bei echter Übersetzung; pSEO-Seiten nur nach `lib/pseo.js`.

**Schichtregel (ADR-0007, Band 04):** Oberfläche → Gateway → Kern → Adapter → Dienst. Kerne kennen keine Datenbank, kein Netz, keine Datei. Adapter enthalten keine Fachlogik. Ein Import entgegen dieser Richtung ist ein CI-Fehler (`tools/abhaengigkeiten.js`).

---

## 4. Die Fachkerne – was sie tun und wo sie andocken

| Kern | Aufgabe | Andockpunkt |
|---|---|---|
| `anfrage-pipeline.js` | Companion/Workspace → Eingangsprüfung → S1 → Antwort, abgesichert | Gateway `/chat`, Worker |
| `ki-muster.js` | strukturierte Ausgabe, Schema-Prüfung, Fallback, Prompt-Register | Pipeline |
| `prompt-cache.js` | Prompt-Reihenfolge stabil → Cache-Treffer | 9Router-Aufruf |
| `tagrouter.js` | Zuordnung Anfrage → Agentenrolle | Pipeline |
| `modi.js` | Arbeitsweisen (Brainstorm, Umsetzen, Fehlersuche …) | Pipeline |
| `regelwerk.js` | erlaubt/verbietet Aktionen, R-01…R-21, Freigaben | vor jeder folgenreichen Aktion |
| `entscheidungen.js` | Freigabevorgänge, Nachweis | Leitstand |
| `gedaechtnis.js` | Kurz-/Langzeitgedächtnis, Vergessen | **AgentMemory-Adapter** (U-05) |
| `rag.js` | Hybrid-Suche Stichwort + Bedeutung, Fundstellen | **LightRAG-Adapter** (U-06), pgvector |
| `langlauf.js` | Langläufe mit Lease/Heartbeat/Checkpoint | Worker, **DeepSeek Harness** (U-08) |
| `lernschleife.js` | Rückmeldungen → Verbesserung, nur mit Freigabe aktiv | Nachtlauf |
| `langfuse.js` | Trace je Antwort, Scores (▲/▼) | Langfuse |
| `betriebskennzahlen.js` | Kennzahlen, Schwellen | Leitstand, Nachtlauf |
| `selbstheilung.js` | erkennen → reparieren im erlaubten Rahmen → melden | Worker |
| `nachtlauf.js` | nächtliche Pflege (Kennzahlen, Vergessen, RAG-Sync, Karten) | Worker-Zeitplan |
| `posteingang.js` | Eingänge, Karten, Zuweisung | Posteingang |
| `versand.js` | Zustellbarkeit (SPF/DKIM/DMARC), Sperrliste, Drosselung | Resend |
| `kundenwege.js` | Registrierung, Angebotsannahme, Onboarding | Gateway `/auth/*`, `/angebote/*`, `/onboarding/*` |
| `prepaid.js` | Guthaben, Reservierung, Abbuchung, Rechnung | Gateway `/v1/*`, Revolut-Webhook (U-01/U-02) |
| `rechenkern.js` | Cent-Arithmetik, USt | alle Beträge |
| `einstellungen.js` | Einstellungen vor/nach Anmeldung, Einwilligung | myADMIN, Konto |
| `inhaltsabgleich.js` | Fakten aus `config/fakten.json` gegen Seiten | CI |
| `normpruefung.js` | Layout-/Normprüfung (Abstände, Ziele, Kontrast) | CI, Prüfplan |
| `pseo.js` | Qualitätsprüfung skalierter SEO-Seiten | vor Veröffentlichung |

Jeder Kern exportiert `FAELLE` (Prüffälle). **Bevor du einen Kern änderst, schreibst du den fehlenden Prüffall.**

---

## 5. Muster für jeden Altbestand (verbindlich, aus Band 12)

Für **jeden** Eintrag U-01 … U-16 genau diese sechs Schritte, in dieser Reihenfolge, je Eintrag eine Datei `docs/12-bestand/U-xx.md`:

1. **Inventar (nur lesend):** Version, Konfiguration, Endpunkte, Datenmodell, Datenmenge, Abhängigkeiten, Nutzer, Ports, Protokolle, Sicherung.
2. **Zuordnung:** jede Funktion → Kern / Endpunkt / Seite. Fehlt ein Ziel → Prüffall zuerst, dann Kern erweitern.
3. **Paritätstest:** gleiche Eingaben an Alt und Neu; Beträge centgenau, Texte inhaltlich; Abweichung = Befund.
4. **Adapter:** nie beide Systeme schreibend auf dieselben Daten. Eine Seite führt, die andere liest.
5. **Parallelbetrieb:** `install.sh --parallel` (Compose-Projekt `nexify-neu`, Ports 18080/18090), Mindestdauer laut Band 12.
6. **Ablösung oder Behalten:** Sicherung → Probelauf → Bestätigung Pascal → Abschalten. Rückweg dokumentiert.

| Nr. | Bestand | Ziel | Art | Bekannter Konflikt – zuerst lösen |
|---|---|---|---|---|
| U-01 | Core-API `/v1/ledger` (FRA) | `lib/prepaid.js` + `api_journal` (**Migration 008 vorhanden**, gegen Bestand abgleichen) | Adapter, dann ablösen | zwei Journale – genau eines führend (E8) |
| U-02 | Core-API `/v1/revolut` | `/v1/payments/revolut/webhook` + Worker | ablösen | Signaturprüfung, Order-Abruf |
| U-03 | `scripts/nexifyai-margin-prepaid.py` | `prepaid.js preis()`, `rechenkern.js` | ersetzen | **Marge ÷ 0,55 vs. Aufschlag × 1,45** → Entscheidung E1 durch Pascal **vor** Umsetzung |
| U-04 | Business-Portal mit Preisrechner | `NeXify API.dc.html#preise` | ersetzen | gleiche Tabelle, gleiche Formel |
| U-05 | **AgentMemory** | `lib/gedaechtnis.js` (ADR-0004) | Adapter | `mandant_id` nachrüsten |
| U-06 | **LightRAG** | `lib/rag.js` | Adapter | Fundstellenformat angleichen; aktuell ein Workspace ohne Mandantentrennung |
| U-07 | **9Router** | einzige Tür zu Modellen | behalten | Cache-Markierungen durchreichen – ungeprüft |
| U-08 | **DeepSeek Harness** (`/opt/nexifyai/dsh-home/skills/`) | Gutachtenkette, `langlauf.js` | Adapter | Laufakten-Format |
| U-09 | Hermes | im Inventar klären | offen | Zweck unbekannt – **nicht raten** |
| U-10 | n8n | nur über signierte Gateway-Hooks | behalten | HMAC einführen |
| U-11 | GitLab, CI | `.gitlab-ci.yml` des Pakets | behalten | Schritte ergänzen |
| U-12 | Agentur-Website | `NeXifyAI Cloud v10.dc.html` | ersetzen nach Abnahme | Rechtstexte, Tracking |
| U-13 | WireGuard-Hub | unverändert | behalten | **Hartsperre** |
| U-14 | teileklar.shop (DUS: Backend, Nginx, Postgres) | Shop-Oberfläche + Migrationen | parallel, dann ablösen | Kunden/Bestellungen mit `mandant_id` TEILEKLAR übernehmen |
| U-15 | Traefik, cloudflared (DUS) | Band 03 | behalten | – |
| U-16 | Studienkolleg-Server | **nicht anfassen** | – | – |

**AgentMemory-Muster konkret (U-05):** Kern `gedaechtnis.js` bleibt rein. Adapter `adapter/agentmemory.js` übersetzt `merken / erinnern / vergessen` auf die AgentMemory-API; jede Operation trägt `mandant_id`, `quelle`, `zeit`, `ablauf`. Lesen zuerst aus AgentMemory, Schreiben erst nach Paritätstest. Vergessen läuft über `nachtlauf.js`. Keine personenbezogenen Rohdaten in Erinnerungen – nur Referenzen.

**LightRAG-Muster konkret (U-06):** `rag.js` fragt Stichwort (BM25) und Bedeutung (Vektor) parallel, verschmilzt per Reciprocal Rank Fusion (k = 60). Adapter liefert Fundstellen im Format `{ quelle, abschnitt, stand, text, punkte }`. Einbettungsmodell projektweit fixiert (768 Dimensionen, Migration 006); Modellwechsel = Voll-Reindex nach Blau-Grün-Muster.

---

## 6. Phasenplan (strikt nacheinander; jede Phase endet mit Tor)

| Phase | Inhalt | Tor (Abnahmekriterium) |
|---|---|---|
| **P0 Vorbereitung** | Lesen (0.1), Claim im Koordinationslog, Arbeitszweig `codex/gesamtloesung`, Bericht `docs/codex/bericht.md` anlegen | Lesenachweis: je Datei 1 Satz Kernaussage im Bericht |
| **P1 Inventar** | U-01…U-16 nur lesend, Ports/Dienste/Versionen, Datensicherungen vorhanden? | 16 Inventardateien, kein Schreibzugriff im Audit-Log |
| **P2 Repository & CI** | Paket nach GitLab, Node-Projekt (`package.json`, Node LTS, ESM), CI-Schranken aus `.gitlab-ci.yml` lauffähig, `.github/` überführt und entfernt, fehlende Testdateien angelegt, Einmal-Umwandler archiviert, `.env.example` zusammengeführt | CI grün: Kern-Prüffälle, `verweise`, `inhaltsabgleich`, `mandanten-pruefung`, `code-regeln`, `abhaengigkeiten`, `norm-lint` |
| **P3 Datenbank** | Migrationen 001–008 gegen **leere** Vorschau-DB, RLS-Tests mit 3 Mandanten | alle Migrationen idempotent; Fremdzugriffstest 0 Treffer |
| **P4 Gateway** | Endpunkte laut `api/openapi.yaml`, Auth, Idempotency-Key, Fehler RFC 9457, Spectral-Lauf | Vertragstests 100 % der Operationen; Spectral ohne Fehler |
| **P5 Worker & Dienste** | Warteschlange, Nachtlauf, Versand (Resend, DNS-Prüfung nur lesend), Revolut-Webhook (Sandbox), Langfuse + OTel | Ende-zu-Ende: Aufladung Sandbox → Journal → Rechnung-PDF |
| **P6 Adapter Bestand** | U-05 AgentMemory, U-06 LightRAG, U-07 9Router, U-08 DSH, U-10 n8n | Paritätstests je Adapter bestanden |
| **P6a KI-Inbetriebnahme** | Abschnitt 12a: Router-Adapter, Prompt-Register, MCP-Server, Gedächtnis, RAG-Index + Einbettung, Langfuse-Traces, Fragensatz-Grundlauf | KI-Prüfungen 12a.8 bestanden; Basiswerte 12a.7 gemessen und im Bericht |
| **P7 Oberflächen** | Zielanwendung nach 3a (nach E10), .dc.html als Referenz nachgebaut und an Gateway, Musterdaten entfernen, Abweichungen A1–A10 aus SOLL-Beschreibung § 11 beheben | Prüfplan Band 11 je Seite; 320 px ohne Querscrollen; WCAG 2.2 AA |
| **P8 Installation** | `install.sh` (fragt Domain, E-Mail, Router-Schlüssel; Region fest eu-central) → Ansible `playbooks/site.yml` auf **Vorschau**-Host | Neuinstallation auf leerem Host ohne Handeingriff |
| **P9 Parallelbetrieb** | `--parallel`, Datenübernahme U-14 in Probe, Paritätsläufe | Abweichungen = 0 oder von Pascal akzeptiert |
| **P10 Vorschau-Abnahme** | Health ≥ 60 s, Last- und Negativtests, Rollback-Probe, Sicherung + Rücksicherung | Abnahmebericht; **ANHALTEN** |
| **P11 Liveschaltung** | nur nach schriftlicher Freigabe Pascal, siehe Abschnitt 13 | Health live ≥ 60 s, Rollback bereit |
| **P12 Bereinigung** | `playbooks/90-bereinigung.yml`: Altbestand nach Freigabe abschalten, Temp-Dateien, Zweige, Probedaten | Bereinigungsnachweis, Handbücher aktualisiert |

Bei Scheitern eines Tors: höchstens **drei** Versuche mit geändertem Ansatz, dann Eskalation an Pascal mit kleinstem fehlendem Beweismittel.

---

## 7. Konfiguration und Geheimnisse

- Werte **nur** aus `config/*.json`; Geheimnisse **nur** aus OpenBao (`install.sh` richtet OpenBao ein, falls keines erreichbar, und legt den Router-Schlüssel dort ab).
- Umgebungsdatei aus Vorlage `playbooks/vorlagen/env.j2`; nie eingecheckt.
- Markierte Werte `UNVERIFIED` oder `ungeprüft` in `config/fakten.json` bleiben gesperrt, bis Pascal sie bestätigt (u. a. API-Preise, Mindestaufladung E3).
- MCP-Server und LLM-Verbindungen: `config/mcp-server.json`, `config/llm-verbindungen.json` – nur Dienste daraus; neue nur mit ADR.

---

## 8. Qualitätsregeln für deinen Code

1. Kerne bleiben **reine Funktionen**; Ein-/Ausgabe nur in Adaptern/Gateway.
2. **Bibliotheken zuerst an den Rändern** (ADR-0007): z. B. Zod für Schemas, cockatiel für Wiederholung; kein Eigenbau in Adaptern, wo eine etablierte OSS-Bibliothek existiert.
3. Funktionen ≤ 50 Zeilen, Dateien ≤ 200 Zeilen, Verschachtelung ≤ 3, frühe Rückgabe; Grundlinie `tools/code-regeln.grundlinie.json` darf nicht schlechter werden.
4. Beträge als ganze Cent; USt ausgewiesen; Rundung nur in `rechenkern.js`.
5. Jeder schreibende Endpunkt mit Idempotency-Key; jeder Fehler RFC 9457.
6. Jede Tabelle mit Mandantenbezug: `mandant_id NOT NULL`, RLS `ENABLE` + `FORCE`, Richtlinien für Lesen und Schreiben.
7. Jede KI-Antwort mit Kennzeichnung und Trace-ID.
8. Commits: Conventional Commits, deutsch, klein, je Commit ein Zweck.

---

## 9. Prüfung (Nachweis statt Behauptung)

| Ebene | Werkzeug | Pflicht |
|---|---|---|
| Kerne | `FAELLE` unter Node | 100 % grün |
| Vertrag | OpenAPI-Vertragstests + Spectral | alle Operationen |
| Datenbank | Migrationstests, RLS mit 3 Mandanten | 0 Fremdzugriffe |
| Ende-zu-Ende | Playwright gegen Vorschau, Seitenfolgen F1–F10 der SOLL-Beschreibung | alle Folgen durchklickbar |
| Barrierefreiheit | axe + manuelle Tastaturprüfung | WCAG 2.2 AA |
| Last | 10× erwartete Spitzenlast Gateway, Prepaid-Reservierung parallel | keine Doppelbuchung |
| Sicherheit | Negativtests Auth, Idempotenz, Webhook-Signatur, Prompt-Injection-Fragensatz `config/fragensatz.json` | alle abgewiesen |
| Wiederherstellung | Sicherung → Rücksicherung auf leeren Host | Datenstand identisch |

**Evidenzklassen:** E0 behauptet · E1 Code gelesen · E2 lokal gelaufen · E3 in Vorschau gelaufen inkl. Negativfall, Grenzwert, Rollback. **Für die Freigabe zählt nur E3.**

---

## 10. Dokumentation, die du fortschreibst (automatisch, bei jeder Änderung)

- `docs/codex/bericht.md` – Fortschritt je Phase, Tore, Befunde, Evidenzklasse.
- `docs/12-bestand/U-xx.md` – Inventar und Parität je Bestand.
- `docs/SOLL-Beschreibung.md` § 11 – Abweichungen schließen, mit Commit-Referenz.
- `docs/paket/05-betrieb.md`, `config/runbooks.json` – jedes neue Verfahren als Runbook.
- `docs/adr/` – jede neue Entscheidung als ADR (Status „vorgeschlagen“, Freigabe Pascal).
- `docs/generiert/` – per `tools/doku-generator.js` aus Code und Konfiguration; nie von Hand.
- Wissensbasis (Band 07): Erkenntnisse als Einträge mit Quelle und Datum.

---

## 11. Berichtsformat (nach jeder Phase, in `docs/codex/bericht.md`)

```
## Phase Px – <Name> · <Datum UTC>
Status: PASS | PARTIAL | BLOCKED
Erledigt: …
Nicht erledigt und warum: …        ← Pflicht, auch wenn leer begründet
Nachweise: <Datei/Log/CI-Lauf> (Evidenzklasse E0–E3)
Befunde: B-xx … (Schwere, Auswirkung, Vorschlag)
Offene Entscheidungen für Pascal: E-xx …
Nächster Schritt: …
```

---

## 12. Offene Entscheidungen – nicht selbst treffen

| ID | Frage | Blockiert |
|---|---|---|
| E1 | Preisformel Marge ÷ 0,55 oder Aufschlag × 1,45 | U-03, U-04, API-Preise |
| E2 | Rechtstexte API (anwaltlich geprüft?) | Liveschaltung API |
| E3 | Mindestaufladung 25 € oder 50 € | Konsole |
| E4 | Social Login Google/Microsoft | optional, F4 |
| E5 | Echte API-Preise | API live |
| E6 | ADR 0005, 0007, 0008 | Architekturregeln verbindlich |
| E7 | Prompt S1 2.0.0 aktivieren | Workspace-Verhalten |
| E8 | Führendes Journal (U-01) | Migration 008 schreibend |
| E9 | Zweck Hermes (U-09) | Inventarabschluss |
| E10 | Zielstack Oberflächen (ADR-0009, Vorschlag Next.js self-hosted) | P7 |
| E11 | Fehlerüberwachung: Sentry (Drittland?) oder nur Langfuse/OTel | `.env`, Betrieb |
| E12 | Inhalte Impressum, Datenschutz, AGB Agentur, Barrierefreiheitserklärung | Liveschaltung |
| E13 | Welcher Preiskern bleibt (`lib/prepaid.js` oder `tools/nexify-preis.js`) – folgt aus E1 | P5 |

Bis zur Entscheidung: betroffenen Zweig sperren, alles Übrige weiterbearbeiten.

---

## 12a. KI-Konfiguration – vollständig (Agenten, Modelle, Gedächtnis, Wissen, Lernen, Beobachtung)

> Grundsatz (Agenten-Architektur): **Autonom, aber steuerbar.** Jeder Agent hat Grenzen, Budget, Iterationslimit, Werkzeugauswahl je Aufgabe, nachvollziehbare Spur und einen definierten Fehlerzustand. Ein Agent, der nicht weiterkommt, **meldet sich** – er schleift nicht.

### 12a.1 Quellen der KI-Konfiguration (einzige Wahrheit)
| Datei | Inhalt | Umgesetzt in | Stand |
|---|---|---|---|
| `config/llm-verbindungen.json` | 9Router (OpenAI-kompatibel, Streaming, eu-central), Modellstufen 0–n mit Kontext, Ausgabe-Max, Zeitlimit, Cent je Mio. Token | Gateway-Adapter `adapter/router.js` (von dir zu bauen) | Soll, nicht live geprüft |
| `config/prompts.json` + `config/prompts/*.md` | Prompt-Register; S1-Orchestrator 1.0.0 **aktiv**, 2.0.0 **Entwurf** | `lib/ki-muster.js` | Versionen unveränderlich |
| `config/prompt-cache.json` | Schichtreihenfolge S1 System → S2 Regeln → S3 Skills/Werkzeuge (nach Name sortiert) → S4 Wissen (mit Versions-Hash) → S5 Verlauf → S6 Eingabe/Datum; max. 4 Breakpoints; verboten vor Breakpoint: Zeitstempel, UUID, Sitzungswerte | `lib/prompt-cache.js` | Faktoren UNVERIFIED |
| `config/mcp-server.json` | `nexify-mcp`, Spezifikation 2026-07-28, streamable-http zustandslos, OAuth 2.1, Werkzeuge rufen **vor jedem Seiteneffekt** `regelwerk.pruefe()`; nicht nutzen: roots, sampling, logging | MCP-Dienst `mcp` | Soll |
| `config/gedaechtnis.json` | vier Arten: Arbeit (Postgres, S5), episodisch (Cognee + CRM, Halbwert 30 T), semantisch (LightRAG, 365 T, S4), prozedural (AgentMemory-Lessons + Skills + Regelwerk) | `lib/gedaechtnis.js` (ADR-0004) | 17/17 im Browser |
| `config/rag.json` | strukturbewusst, Eltern-Kind, Kind 600 Zeichen, Überlappung 15 %, 3 Eltern je Antwort; Einbettung `paraphrase-multilingual-mpnet-base-v2`, 768 D, normalisiert, lokal CPU, Queue »einbetten« | `lib/rag.js` | Startwerte bis Messung |
| `config/langlauf.json` | max. 72 h, Budget Standard 200 Cent / max. 5000 Cent, Checkpoint je Schritt + 5 min, Lease 900 s / Puls 60 s, nie endlos, Budget erhöhen nur Pascal | `lib/langlauf.js` | 32/32 |
| `config/lernen.json` | Signale (Entwurfskorrektur, ▲/▼, Schrittfehler, CI rot, Vorfall), Reihenfolge Regel/Prompt → Wissen → Prüffall → Adapter; **Gewichte ändern sich nie live** | `lib/lernschleife.js` | 20/20 |
| `config/fragensatz.json` | 150 Fälle (Anfrage, Support, Rechnung, Werkstatt, Recht) als goldener Satz | Evaluation, Lern-Gate | 23 Fälle quellengeprüft |
| `config/kennzahlen.json` | DORA-Startannahmen, KI-Kosten je Vorgang nur aus Journal | `lib/betriebskennzahlen.js` | Startannahmen |
| `config/langfuse.json` | self-hosted, Cloudflare Access, Geheimnisse aus OpenBao, OTLP oder Ingestion | `lib/langfuse.js` | Versionen UNVERIFIED |
| `config/computer-use.json` | letzte Wahl nach API/MCP und Playwright; Sandbox Xvfb/VNC, `internal: true`, read_only | Regel R-21 | Soll |
| `config/regelwerk.json` | R-01…R-21 | `lib/regelwerk.js` | 38/38 |
| `config/skills-register.json` | angewendete Skills je Bereich | Doku | – |

**Deine Pflicht:** Jede Datei gegen die realen Dienste prüfen (Version, Endpunkt, Modellname, Preis). Abweichung → Befund, Wert bleibt `UNVERIFIED`, Funktion gesperrt. Werte in `${…}` **nur** aus OpenBao.

### 12a.2 Agenten-Architektur
| Baustein | Vorgabe |
|---|---|
| **Orchestrator S1** | ein Orchestrator je Vorgang; Rolle aus aktivem Prompt; Regelwerk hat **Vorrang** vor Prompt |
| **Arbeitsweise** | `lib/modi.js` wählt je Anfrage (Brainstorm, Umsetzen, Fehlersuche, Review, Vermitteln, Ausliefern) |
| **Zuordnung** | `lib/tagrouter.js` Anfrage → Fach-Agent/Rolle |
| **Muster** | Standard: Werkzeugaufruf (Function Calling). Mehrschritt: Plan-and-Execute über `langlauf.js` mit Neuplanung. ReAct nur mit **Iterationslimit** (Standard 10, konfigurierbar, nie unbegrenzt). Multi-Agent **nur begründet** (ADR), sonst ein Agent. |
| **Werkzeugregister** | jedes Werkzeug mit vollständigem Schema, Beschreibung, Beispiel, Seiteneffekt-Klasse (lesen/entwerfen/schreiben/extern), Regelwerk-Aktion; **je Aufgabe kuratierte Auswahl** (höchstens so viele wie nötig, Sortierung nach Name für Cache-Stabilität); Nutzung wird gezählt |
| **Werkzeugfehler** | strukturiert an den Agenten zurück (`{ code, meldung, wiederholbar }`), nie verschluckt; nach 3 gleichartigen Fehlern: Lauf wartet auf Mensch |
| **Ausgabe** | nur schemageprüft (`ki-muster.js`); Schemafehler → ein Neuversuch → sicherer Fallback; nie Freitext parsen |
| **Budget** | Token-/Cent-Budget je Vorgang aus `langlauf.json`; Reservierung vor Aufruf, Abbuchung danach |
| **Mensch im Ablauf** | Aktionen der Klassen schreiben/extern → Regelwerk; Freigaben R-01/R-09/R-13 → Pascal |
| **Kennzeichnung** | jede KI-Antwort gekennzeichnet (EU AI Act Art. 50), Trace-ID sichtbar im Workspace-Seitenfeld |
| **Computer Use** | nur nach R-21, in Sandbox, nur lesen/entwerfen, Absenden durch Pascal |

### 12a.3 Modelle und Routing
1. **Einzige Tür:** alle Modellaufrufe über 9Router (U-07). Kein direkter Anbieteraufruf aus Kernen oder Adaptern.
2. **Stufenwahl:** niedrigste Stufe, die den Fragensatz-Schwellenwert der Aufgabenart erfüllt; Stufe 0 lokal (vLLM laut compose) für Einbettung, Klassifikation, Entwürfe ohne Außenwirkung.
3. **Fallback-Kette:** Zeitüberschreitung/5xx/429 → Wiederholung mit Backoff (cockatiel), dann nächste Stufe, dann klare Meldung an Nutzer; keine stille Degradation – jeder Fallback ist im Trace markiert.
4. **Cache-Markierungen** von `prompt-cache.js` bis zum Anbieter durchreichen; `cache_read`/`cache_creation`-Tokens je Aufruf loggen; Trefferquote im Leitstand.
5. **Kostenrechnung** ausschließlich über `rechenkern.js` und Journal; Preise je Stufe aus OpenBao/Konfiguration, nie im Code.

### 12a.4 Gedächtnis (AgentMemory & Co.)
- **Mandant zuerst:** jede Erinnerung trägt `mandant_id`; Abruf filtert **vor** der Suche.
- **Selektiv merken** (kein Memory-Hoarding): nur Entscheidungen, Korrekturen, bestätigte Fakten, Lessons; keine Rohdaten, keine Geheimnisse, keine personenbezogenen Inhalte ohne Zweck.
- **Vergessen** nach Halbwertszeit im Nachtlauf; Löschung auf Anfrage (DSGVO Art. 17) über alle vier Speicher nachweisbar.
- **Adapter** AgentMemory (Lessons), Cognee (episodisch), LightRAG (semantisch) – Kern entscheidet, Dienste speichern.

### 12a.5 Wissen (RAG)
- Hybrid (BM25 + Vektor), RRF k = 60, Metadaten-Vorfilter (Mandant, Stand, Dokumenttyp) vor der Vektorsuche.
- Reranking **erst**, wenn Messung Qualitätsproblem zeigt (Latenzbudget +100–300 ms).
- Delta-Sync per Content-Hash im Nachtlauf; verwaiste Vektoren entfernen; Versions-ID je Chunk.
- Evaluation getrennt: Context Precision/Recall (Abruf) und Faithfulness/Answer Relevancy (Antwort) mit RAGAS gegen `fragensatz.json`; jede Änderung an Zerlegen/Einbettung/Modell nur mit Vorher-Nachher-Lauf.
- Antwort nur aus Fundstellen, mit Quellenangabe; fehlt Wissen → „nicht belegt“, keine Erfindung.

### 12a.6 Lernen und Selbstoptimierung
- Lernformen L1 Regel · L2 Wissen · L3 Prompt · L4 Prüffall · L5 Adapter (LoRA/QLoRA, eine GPU, **nur** mit Freigabe, ADR-0005 – kein verteiltes Training).
- Jede gelernte Änderung: Fragensatz-Lauf ≥ vorheriger Stand → Canary 5 → 25 → 100 % → Rücknahme mit einem Klick.
- Prompt-Änderung = neue Version im Register, aktiv erst nach Freigabe (H-08).
- Selbstheilung: Schatten → Vorschlag (≥ 7 Tage, ≥ 5 Auslösungen) → Selbst (nur Stufe 1 nach Grundfreigabe); Schleifensperre 3/h.

### 12a.7 Beobachtung und Evaluation (LLMOps)
| Messgröße | Quelle | Startziel (Annahme, nach 4 Wochen neu setzen) |
|---|---|---|
| Latenz bis erstes Token (Workspace, Streaming) | Langfuse | P50 ≤ 2 s, P95 ≤ 5 s |
| Gateway ohne Modellaufruf | OTel | P95 ≤ 200 ms |
| Fehlerquote Modellaufrufe nach Fallback | Langfuse | ≤ 1 % |
| Schemafehler vor Neuversuch | ki-muster | ≤ 2 % |
| Cache-Trefferquote S1–S3 | prompt-cache | ≥ 70 % bei wiederholten Vorgängen |
| Kosten je Vorgang | Journal | gemessen, nicht geschätzt |
| Bewertung ▲-Anteil | Workspace | Basis messen |
| Fragensatz-Bestehensquote | Evaluation | je Bereich festlegen, darf nie sinken |
| Verfügbarkeit Gateway | Health | 99,5 % (Ein-Personen-Betrieb, ein Host) |

> **Hinweis zu Zielen aus Fremd-Skills:** Werte wie „P50 < 50 ms, > 1000 req/s, 10.000 gleichzeitige Nutzer, 99,9 %“ gelten für große Inferenzplattformen, nicht für diesen Betrieb auf einem VPS mit Modellaufrufen über einen Router. **Nicht übernehmen**, sondern messen und begründet setzen.

Jeder Trace enthält: Vorgang, Mandant (pseudonymisiert), Agent/Rolle, Modus, Promptversion, Stufe/Modell, Werkzeuge mit Ergebnis, Tokens (inkl. Cache), Cent, Latenz, Fallback, Bewertung. Keine Eingabetexte mit personenbezogenen Daten in Langfuse ohne Maskierung (`config/langfuse.json` → datenschutz).

### 12a.8 KI-spezifische Prüfungen (zusätzlich zu Abschnitt 9)
| Prüfung | Kriterium |
|---|---|
| Iterationslimit | Agent mit unlösbarer Aufgabe endet nach Limit mit Status „wartet auf Mensch“ |
| Werkzeugfehler | Fehler erscheint im Trace und in der Antwort, kein stilles Weiterarbeiten |
| Prompt-Injection | Fragensatz-Fälle „sicherheit“ vollständig abgewiesen; Nutzereingabe eingezäunt |
| Regelwerk vor Werkzeug | jedes schreibende MCP-Werkzeug ohne Freigabe → abgewiesen |
| Mandant im Gedächtnis/RAG | Abfrage Mandant A liefert 0 Treffer aus B |
| Budget | Lauf über Budget stoppt vor dem Aufruf |
| Fallback | Router aus → verständliche Meldung, kein Absturz |
| Cache-Stabilität | zwei identische Vorgänge → identischer Prefix-Hash S1–S3 |
| Kennzeichnung | 100 % der KI-Antworten gekennzeichnet |

### 12a.9 Parallelarbeit mehrerer Agenten (Arbeitsplätze)
Arbeiten mehrere Agenten-Sitzungen gleichzeitig am Repository:
- **Ist `docko` installiert** (Workspace-Orchestrierung): nur in `slots/*` arbeiten; Slot vor dem ersten Schreiben beanspruchen mit `docko slot acquire --session "$DOCKO_SESSION_ID" --branch <zweig> --task "<aufgabe>" --brief`; bei Langläufen `docko heartbeat`, am Ende `docko release`. **Nie** eine Sitzungs-ID erfinden; ist `$DOCKO_SESSION_ID` leer → anhalten und über `docko session list --brief` klären. Unter-Agenten derselben Sitzung erben den Claim; eigenständige Prozesse nur per `docko delegate`.
- **Ist `docko` nicht vorhanden:** je Aufgabe eigener Git-Worktree und Zweig, Claim im Koordinationslog (Eigentümer, TTL, Kollisionsklasse), keine zwei Sitzungen auf derselben Datei.
- In beiden Fällen: ein Zweig = eine Aufgabe; Zusammenführen nur über Merge Request mit grüner CI und Review (Skill `code-review-anfordern-subagent`).

## 12b. Orchestrierung der Umsetzung – schnell, parallel, ohne Kollision

### 12b.1 Rollen der Agenten-Sitzungen
| Rolle | Aufgabe | Darf | Darf nicht |
|---|---|---|---|
| **Leitung** (eine Sitzung) | Arbeitspakete schneiden, Abhängigkeiten, Zuweisung, Tore, Bericht | Pakete vergeben, Merge Requests zusammenführen | selbst Fachcode schreiben, während Pakete laufen |
| **Umsetzer** (höchstens 3 parallel) | genau ein Arbeitspaket | im eigenen Zweig/Slot schreiben | fremde Dateien ändern, Tore überspringen |
| **Prüfer** (frische Sitzung je Merge Request) | Review nach `code-review-pruefkatalog` | Befunde, Änderungswünsche | eigenen Code prüfen (Funktionstrennung) |
| **Erkunder** (bei Bedarf) | nur lesend Inventar/Analyse | lesen, berichten | schreiben |

Eine Sitzung = eine Rolle. Die Leitung startet Umsetzer und Prüfer als **getrennte** Kontexte (Muster `subagent-pro-aufgabe-methodik`); kann die Umgebung keine Unter-Agenten starten, arbeitet die Leitung die Pakete nacheinander in logisch getrennten Durchgängen ab und vermerkt `AUSFUEHRUNGSMODUS: SEQUENZIELL`.

### 12b.2 Arbeitspakete (AP) und Abhängigkeitsgraph
Jedes Paket hat: ID · Ziel · Eingangsdateien · Ausgabedateien (**Dateibesitz**) · Abhängigkeiten · Prüfkriterium · Zeitbox. Pakete ohne gemeinsame Ausgabedateien und ohne offene Abhängigkeit laufen **parallel**.

```
P0 ─► P1 (Erkunder: U-01…U-16 parallel in 3 Bahnen: FRA-Kern · FRA-KI · DUS/Shop)
          │
          ▼
        P2 Repo+CI ─► P3 DB ─┬─► P4 Gateway ─┬─► P5 Worker/Dienste ─► P9 ─► P10
                              │                ├─► P6 Adapter (5 AP parallel)
                              │                ├─► P6a KI (4 AP parallel)
                              └─► P7a Design-Token + Grundgerüst ─► P7b Seiten (je Bereich 1 AP, 3 parallel)
        P8 Installation läuft ab P3 parallel (eigener Dateibesitz: install.sh, playbooks/, deploy/)
```
**Kritischer Pfad:** P2 → P3 → P4 → P5 → P9 → P10. Die Leitung priorisiert ihn; alles andere füllt freie Bahnen.

### 12b.3 Ablauf je Paket (fest)
1. Claim (docko-Slot **oder** Worktree + Koordinationslog, siehe 12a.9) mit Paket-ID, TTL, Dateibesitz.
2. Fehlende Prüffälle zuerst (rot sehen).
3. Umsetzen, klein committen.
4. Lokal: Formatierung, Lint, Tests, betroffene CI-Schranken.
5. Merge Request mit Vorlage (Ziel, Änderung, Nachweise E-Klasse, nicht Erledigtes und warum).
6. Prüfer-Sitzung: Review; Befund „kritisch/hoch“ → zurück zu 3.
7. Merge nur über **Merge-Zug** (GitLab Merge Trains) mit grüner Pipeline.
8. Claim freigeben, Bericht ergänzen.

### 12b.4 Takt und Grenzen
- **WIP-Grenze:** höchstens 3 Umsetzer gleichzeitig, je Umsetzer 1 Paket.
- **Zeitbox:** Paket > 1 Arbeitstag → Leitung schneidet neu.
- **Drei-Versuche-Regel:** drittes erfolgloses Vorgehen am selben Problem → Eskalation (kleinstes fehlendes Beweismittel).
- **Heartbeat:** bei Langläufen spätestens alle 15 min; abgelaufener Claim darf erst nach Prüfung übernommen werden.
- **Kein Warten im Leerlauf:** blockiertes Paket → Befund, nächstes freies Paket.
- **Täglicher Stand** (automatisch aus Claims + CI): erledigt, laufend, blockiert, kritischer Pfad, Restschätzung.

### 12b.5 Kollisionsschutz
Dateibesitz exklusiv je Paket · gemeinsame Dateien (`api/openapi.yaml`, `config/fakten.json`, `db/migrations/`, `.gitlab-ci.yml`) **nur** durch die Leitung oder ein dafür benanntes Paket · Migrationen fortlaufend nummeriert, Nummer vergibt die Leitung · Vertrag zuerst: Änderung an `openapi.yaml` als eigenes Paket vor den Umsetzern.

## 12c. OSS-Werkzeuge je Aufgabe (Standardauswahl)

> Regeln: self-hosted/OSS vor SaaS · kein GitHub, kein Vercel, kein Redis · **Lizenz und Version vor Einsatz gegen die offizielle Quelle prüfen** und im Bericht festhalten (Angaben unten Stand Wissen 28.09.2026, `UNVERIFIED` bis geprüft) · AGPL-Werkzeuge nur intern betreiben, nie in ausgelieferten Code einbinden · kein Werkzeug ohne Zweck in dieser Tabelle; neue Werkzeuge per ADR.

| Aufgabe | Werkzeug | Lizenz (zu prüfen) | Einsatz |
|---|---|---|---|
| Umsetzungsagent | OpenAI Codex CLI | Apache-2.0 | Umsetzer-Sitzungen, Sandbox-Modus „workspace-write“, Netz nur bei Bedarf |
| Parallelarbeit | Git-Worktrees; `docko` falls vorhanden | Git: GPL-2.0; docko: UNVERIFIED | 12a.9 |
| Repository/CI | GitLab (self-hosted) mit Merge Trains, Runner mit Docker-Executor | MIT (CE) | Pipeline, Merge-Zug |
| Laufzeit/Pakete | Node.js LTS, pnpm | MIT | Gateway, Worker, Tests |
| Format/Lint | Biome (alternativ ESLint + Prettier) | MIT/Apache-2.0 | P2 |
| Tests | `node:test` für `FAELLE`, Vitest für Adapter/Gateway | MIT | P2–P6 |
| Schemas/Validierung | Zod | MIT | Gateway, KI-Ausgaben |
| Wiederholung/Ausfall | cockatiel | MIT | Router-, Zahlungs-, Versand-Adapter |
| Warteschlange (ohne Redis) | pg-boss (Postgres) | MIT | Worker, Nachtlauf, Einbetten |
| API-Vertrag | Spectral (Lint), Prism (Mock), openapi-typescript (Typen), Schemathesis (Vertragstests) | Apache-2.0 / Apache-2.0 / MIT / MIT | P4 |
| Datenbank | dbmate (Migrationen), pgTAP (DB-Tests inkl. RLS), sqlfluff (SQL-Lint) | MIT / PostgreSQL / MIT | P3 |
| Frontend | Next.js, React | MIT | P7 (nach E10) |
| E2E/Bildvergleich | Playwright (inkl. Screenshot-Vergleich) | Apache-2.0 | F1–F10, 320/768/1440 px |
| Barrierefreiheit | axe-core (`@axe-core/playwright`), pa11y-ci | MPL-2.0 / LGPL-3.0 | P7, P10 |
| Leistung Web | Lighthouse CI | Apache-2.0 | P7, P10 |
| Last | k6 | AGPL-3.0 (nur intern) | P10 |
| KI-Evaluation | promptfoo (Fragensatz), RAGAS (RAG-Metriken) | MIT / Apache-2.0 | P6a, Lern-Gate |
| KI-Beobachtung | Langfuse, OpenTelemetry Collector | MIT (Kern) / Apache-2.0 | P5, P6a |
| Geheimnisse | OpenBao; Gitleaks (Suche in Git) | MPL-2.0 / MIT | P2, ständig |
| Sicherheit Code | Semgrep CE, OSV-Scanner | LGPL-2.1 / Apache-2.0 | CI |
| Container/SBOM | Trivy, Syft, Grype | Apache-2.0 | CI, vor P10 |
| Abhängigkeiten aktuell | Renovate (self-hosted) | AGPL-3.0 (nur intern) | nach P10 |
| Infrastruktur | Ansible, ansible-lint, Molecule | GPL-3.0 / GPL-3.0 / MIT | P8 |
| Compose/Container | Docker Engine + Compose | Apache-2.0 | P5, P8 |
| Sicherung | pgBackRest (Postgres), restic (Dateien/Objekte) | MIT / BSD-2 | P10, Betrieb |
| Erreichbarkeit | Uptime Kuma | MIT | P10, Betrieb |
| Schalter/Rollout | GrowthBook (self-hosted) oder Unleash | MIT (Kern) / Apache-2.0 | Canary 5→25→100 % |
| Diagramme | Mermaid CLI | MIT | `docs/architecture` rendern |
| Doku | `tools/doku-generator.js`, Markdown → PDF über bestehende CD-2026-Vorlage | – | Band-PDFs |

### 12c.1 Pipeline-Stufen (`.gitlab-ci.yml`, Reihenfolge = Abbruchreihenfolge)
1. **schnell** (< 2 min): Biome, Gitleaks, `node:test` Kerne, `verweise`, `inhaltsabgleich`, `code-regeln`, `abhaengigkeiten`
2. **vertrag**: Spectral, openapi-typescript-Abgleich, sqlfluff, `mandanten-pruefung`
3. **integration**: Postgres-Dienst, dbmate up/down, pgTAP (RLS, 3 Mandanten), Vitest Gateway, Schemathesis gegen laufendes Gateway
4. **sicherheit**: Semgrep, OSV-Scanner, Trivy, Syft (SBOM als Artefakt)
5. **oberflaeche**: Next-Build, Playwright F1–F10, axe, Lighthouse CI, Bildvergleich
6. **ki** (nächtlich + bei Änderung an Prompts/RAG/Router): promptfoo Fragensatz, RAGAS
7. **vorschau** (nur Hauptzweig): Deploy Vorschau per Ansible, Health ≥ 60 s, Rauchtest
Parallelisierung in GitLab über `needs:`; Caches für pnpm und Playwright-Browser.

## 12d. Prompt-Engineering – verbindliche Regeln für jeden Prompt

> Prompts sind Code: versioniert, geprüft, gemessen. Intuition über Prompt-Qualität ist oft falsch – **jede Änderung braucht einen Messlauf.**

### 12d.1 Aufbau jeder Prompt-Datei (`config/prompts/<name>-<version>.md`, Vorlage `config/prompts/VORLAGE.md`)
Reihenfolge = Cache-Reihenfolge (12a.1, `prompt-cache.json`):
1. **Rolle** – wer das Modell ist, für wen es arbeitet (ein Absatz)
2. **Kontext** – feste Hintergründe; keine „für alle Fälle“-Beigaben
3. **Anweisungen** – nummeriert, eindeutig, je Satz eine Handlung
4. **Grenzen / Verbote** – ausdrücklich, was **nicht** zu tun ist (z. B. keine Preise nennen, keine Rechtsauskunft, nichts erfinden)
5. **Unsicherheit** – wie fehlende Information zu melden ist (Feld `fehlt`, Status „nicht belegt“), nie raten
6. **Ausgabeformat** – Verweis auf das Zod-/JSON-Schema; das Schema ist Wahrheit, nicht der Prosa-Text
7. **Beispiele** – 2–5, siehe 12d.2
8. **Kopf** (Metadaten, wird vor dem Senden entfernt): Name, Version, Status, Freigabe, gilt_für, Temperatur, Modellstufe, Schema, Fragensatz-Bereich, Änderungsgrund

Nutzereingabe, Datum und Sitzungswerte gehören **nie** in die Prompt-Datei, sondern zur Laufzeit in Schicht S6.

### 12d.2 Beispiele (Few-Shot)
- 2–5 Paare, **vielfältig**, inklusive Grenzfall und mindestens ein **Negativbeispiel** (was abzulehnen/zurückzufragen ist).
- Schwierigkeit wie echte Eingaben; einheitliches Format; Ausgabe exakt im Schema.
- **Nur echte, anonymisierte** Fälle aus `config/fragensatz.json` oder freigegebenen Vorgängen – keine erfundenen Kunden, Preise, Fristen.
- Beispiele **nicht** zugleich als Testfälle werten (Test-Leck): Fälle, die im Prompt stehen, sind im Fragensatz als `im_prompt: true` markiert und zählen nicht zur Bestehensquote.

### 12d.3 Schrittweises Denken
- Für Analyse, Rechnung, Fehlersuche: **strukturierte Zwischenschritte als Schemafelder** (`annahmen`, `schritte`, `ergebnis`), getrennt geparst.
- Zwischenschritte werden **nicht** an Kunden ausgegeben; im Trace sichtbar für Pascal.
- Rechnungen niemals vom Modell: Beträge immer über `rechenkern.js` (Werkzeugaufruf).
- Keine pauschalen Wirkungsversprechen übernehmen (z. B. „+30–50 % Genauigkeit“) – Wirkung nur aus eigenem Messlauf.

### 12d.4 Parameter je Aufgabenart (Startwerte, per Messlauf bestätigen)
| Aufgabenart | Temperatur | Ausgabe |
|---|---|---|
| Klassifikation, Extraktion, Routing (`tagrouter`) | 0 | Schema, kurz |
| Antwortentwurf Posteingang, Support | 0,2–0,4 | Schema mit Textfeld |
| Zusammenfassung mit Quellen (RAG) | 0–0,2 | Fundstellen Pflicht |
| Marketingtext-Entwurf | 0,6–0,8 | nur Entwurf, Freigabe Pascal |
| Rechtliches, Preise, Fristen | – | **kein Freitext vom Modell**; nur Bausteine aus Register/Konfiguration |

Antwort-Caching (nicht Prompt-Caching) nur bei Temperatur 0.

### 12d.5 Schutz gegen Prompt-Injection
- Nutzereingabe und fremde Inhalte (Mails, Webseiten, Dokumente) **eingezäunt** und als Daten gekennzeichnet (`<eingabe quelle="…">…</eingabe>`); Anweisungen daraus werden nie befolgt.
- Werkzeuge mit Seiteneffekt nur nach `regelwerk.pruefe()`, nie auf Anweisung aus Eingabetext.
- Ausgabe vor Weitergabe prüfen: Schema, verbotene Inhalte (Geheimnisse, fremde Mandanten, Links auf unbekannte Domains).
- Fragensatz-Bereich „sicherheit“ ist Pflicht-Gate für jede Prompt-Version.

### 12d.6 Ausgabe-Kontrolle
- **Strukturierte Ausgabe** über Werkzeugaufruf/JSON-Schema des Anbieters, geprüft mit Zod.
- **Kein** Herausfischen von JSON per regulärem Ausdruck aus Freitext (Muster aus Fremd-Skills „JSON per Regex retten“ ist verboten) – bei Schemafehler: ein Neuversuch mit Fehlermeldung, dann sicherer Fallback.
- Nachbearbeitung deterministisch (Formatierung, Kennzeichnung, Quellen), nie durch zweites freies Modell ohne Prüfung.

### 12d.7 Kosten und Nutzung je Kunde (API-Produkt und intern)
- Jeder Aufruf: Tokens ein/aus/Cache, Modellstufe, Cent über `rechenkern.js`, Mandant, Kostenstelle → Journal (Migration 008).
- Budget je Vorgang (`langlauf.json`), je Kostenstelle (Prepaid), je Mandant/Monat; Prüfung **vor** dem Aufruf.
- Ausgabe-Maximum je Stufe aus `llm-verbindungen.json`, nie unbegrenzt.
- Modell- und Preistabellen aus Fremd-Skills **nicht** übernehmen (veraltet); nur aus Konfiguration/OpenBao.

### 12d.8 Änderung eines Prompts (Ablauf)
1. Neue Version anlegen (alte bleibt unverändert, H-08), Änderungsgrund im Kopf.
2. Messlauf mit promptfoo gegen den Fragensatz des Bereichs: Bestehensquote, Schemafehler, Tokens, Kosten, Latenz – **alt gegen neu**.
3. Nicht schlechter in allen Pflichtbereichen (inkl. „sicherheit“) → Vorschlag an Pascal mit Messbericht.
4. Nach Freigabe: Canary 5 → 25 → 100 % (GrowthBook/Unleash), Cache-Effekt beachten (jede Variante = eigener Cache-Eintrag).
5. Rücknahme mit einem Klick auf die Vorversion.

### 12d.8a Qualitätsdrift
Anbieter ändern Modelle hinter gleichem Namen. Deshalb: **nächtlicher** Fragensatz-Lauf gegen die aktive Prompt-Version und Modellstufe (CI-Stufe `ki`), Ergebnis in Langfuse als Datensatz-Lauf. Sinkt die Bestehensquote eines Bereichs um mehr als 3 Prozentpunkte gegenüber dem 7-Tage-Mittel oder steigt die Schemafehlerquote über 2 % → Vorfall im Leitstand, Lernschleife sperrt Ausrollungen, Pascal entscheidet (Stufe wechseln, Prompt anpassen, abwarten). Schwellen sind Startwerte.

**Nicht übernommen (geprüft 28.09.2026):** automatische Prompt-Optimierer (z. B. DSPy) – verändern Prompts ohne Freigabe und widersprechen H-08; Einsatz nur als Offline-Vorschlagswerkzeug per ADR. Die Skripte `prompt_optimizer.py`, `rag_evaluator.py`, `agent_orchestrator.py` aus dem Skill „Senior Prompt Engineer“ existieren nicht; ihre Aufgaben decken promptfoo, RAGAS und 12b ab. Leistungsziele des Skills (P50 < 50 ms, > 1000 req/s, 99,9 %) gelten nicht für diesen Betrieb (siehe 12a.7).

### 12d.9 Lieferungen dazu
- `config/prompts/VORLAGE.md` (Aufbau 12d.1)
- `config/eval/promptfooconfig.yaml` (Anbieter = 9Router, Tests aus `fragensatz.json`, Schema-Prüfung, Kosten/Latenz-Metriken)
- CI-Stufe `ki` (12c.1) führt den Messlauf bei jeder Änderung unter `config/prompts/` aus.

## 13. Liveschaltung (P11) – nur mit Freigabe

**Voraussetzungen (alle):** P10 bestanden mit E3 · Bericht vollständig · E1, E2, E5, E8, E10, E12 entschieden · Sicherung ≤ 24 h alt und Rücksicherung geprüft · Rollback-Plan schriftlich · **schriftliche Freigabe Pascal mit Datum und Umfang**.

**Ablauf:**
1. Wartungsfenster laut Freigabe, Kunden nach Band 05 informiert.
2. Datenstand Bestand einfrieren (nur lesend), letzte Übernahme U-14/U-01.
3. Neue Dienste auf Zielhost starten (Compose), Health prüfen ≥ 60 s.
4. Umschaltung Verkehr **über Traefik/cloudflared-Routing** – **keine** Live-DNS-Änderung durch dich (H-01). Braucht es DNS: Pascal schaltet.
5. Rauchtests F1–F10 live, Zahlung mit kleinstem echten Betrag, Rückerstattung.
6. Beobachtung 24 h (Langfuse, Kennzahlen, Fehlerquote); Abbruchkriterium: Fehlerquote > Schwelle in `config/kennzahlen.json` → Rollback.
7. Erst nach 7 Tagen stabilem Betrieb und Freigabe: P12 Bereinigung, Altbestand abschalten.

**Rollback:** Routing zurück auf Bestand, neue Dienste stoppen (nicht löschen), Datenrückfluss laut Adapter-Richtung, Bericht.

---

## 14. Start

1. Claim eintragen, Zweig anlegen, `docs/codex/bericht.md` mit Abschnitt „P0“ anlegen.
2. Lesereihenfolge 0.1 abarbeiten und belegen.
3. Arbeitspakete nach 12b.2 schneiden und im Bericht als Tabelle führen.
4. Mit P1 Inventar beginnen – **nur lesend**, drei Erkunder-Bahnen parallel.

Frage nicht nach Bestätigung für Schritte, die dieser Auftrag erlaubt. Frage **immer** vor allem, was Abschnitt 2 oder 12 berührt.

*Chat it. Automate it.*
