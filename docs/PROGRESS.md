# NeXify — Verbindliche Baseline (Supervisor-Auftrag 5, Finales Gesamtziel)

Stand: 2026-11-08 · Branch `claude/focused-hawking-yrap9l` · HEAD `e4acc02`
Laufendes Schritt-Log: Root-`PROGRESS.md`. Offene-Punkte-Register:
`docs/offene-punkte-register-2026-11-08.md`. Denk-Kanon: `lieferpaket/denk-kanon.md`.

> Diese Datei ist auf ausdrückliche Anweisung (`docs/PROGRESS.md`) angelegt. Das
> bestehende Root-`PROGRESS.md` bleibt als laufendes Log unverändert. Keine
> Umdeutung: Der Auftragstext ist unten im Wortlaut übernommen.

---

## 1 · Wortlaut-Readback (unverändert übernommen)

**GOAL:** Eine Agentur, ein Design, ein Textkonzept, vier Oberflächen:
(1) .de-Website aus der Canvas 6LEqysUc28N2PmUq68Hk8D, alle Seiten, Chat auf jeder
Seite; (2) Arbeitsplatz auf Hermes WebUI (:8787) im NeXify-Skin; (3) NeX2fly
Kunden-Suite auf Hermes WebUI, mandantenfähig, eigener NeX Agentic AIFly je Kunde,
Composio-Anbindungen; (4) TEILEKLAR-Shop und Werkstattportale. Dazu:
Werkstattverzeichnis (OSM, 56 Städte, noindex bis 3 Betriebe), SEO, Marketing,
Preise (nur nach Pascals Freigabe), Betrieb, Prüfung.

**SOURCE:** Master System Order v4.0.0 (16 Prinzipien, 15 Gates, Statuskette
PLANNED bis OPERATING), Denk-Kanon, Aufträge 1 bis 4, Lieferpaket.

**ACTION:** (a) Baseline in docs/PROGRESS.md mit exaktem Readback, keine Umdeutung.
(b) Konflikte melden statt zu raten. (c) Je Seite echten Stand auf .de (Screenshot
Desktop 1440 und Mobil 390, Chat sichtbar ja/nein), CI-Status PR #75/#36
klassifiziert, Antwort auf Aufträge 1 bis 4.

**LIMITS:** Kundenprojekte (Studienkolleg, IPAC, A-Bau, Bookando, Carvantooo) nie
mit NeXify mischen; keine Preise, Rechtstexte, Kaltakquise, Zahlungen, Löschungen,
Force-Push, Merge oder Deploy auf main ohne Pascals Ja; keine Secrets in Dateien;
Marco-App ist UNBEKANNT, nichts dazu erfinden; Hermes-WebUI, Composio-Abdeckung und
Serverstände gelten als UNGEPRÜFT bis zum Nachweis.

**EVIDENCE:** Commit-Hash, Screenshots, Testausgabe, Readback.
**NEXT:** Die Statuskette pro Seite führen, nichts als fertig melden ohne
LIVE_VERIFIED.

---

## 2 · Die vier Oberflächen — Stand (ehrlich, Statuskette PLANNED→OPERATING)

| # | Oberfläche | Realer Stand | Statuskette | Nachweis / Blocker |
|---|---|---|---|---|
| 1 | **.de-Website** aus Canvas | Repo `apps/web` rendert öffentliche Seiten; globaler Oracle-Chat auf jeder Pflichtseite; Startseite-Hero + Oracle-Chat an Canvas angeglichen | **LOCALLY_TESTED** (nicht LIVE_VERIFIED) | tsc 0, Chat-Gate 80/80 lokal; **.de live BLOCKIERT** (Vercel Authentication, siehe §4) |
| 2 | **Arbeitsplatz Hermes WebUI (:8787)** NeXify-Skin | **UNGEPRÜFT** — kein Nachweis, dass :8787 erreichbar/skinbar ist | **PLANNED** | Hermes-WebUI gilt laut Auftrag als ungeprüft; kein Zugriff/Nachweis in dieser Sitzung |
| 3 | **NeX2fly Kunden-Suite** (mandantenfähig, AIFly je Kunde, Composio) | **UNGEPRÜFT** — Composio-Abdeckung ungeprüft; Mandantenmodell im Repo vorhanden (`access.tenant_required`), aber kein Live-Nachweis | **PLANNED** | Composio-Anbindung/Serverstände ungeprüft bis Nachweis |
| 4 | **TEILEKLAR-Shop + Werkstattportale** | Repo-Seiten `/teileklar/*` vorhanden (Shop, Kasse, Werkstatt, Partner, Portale); Chat auf öffentlichen TEILEKLAR-Seiten | **LOCALLY_TESTED** (öffentliche Seiten) | Werkstattverzeichnis-Daten BLOCKIERT (OSM-Egress, Auftrag 1) |

Grün-Regel: **Keine Oberfläche gilt als fertig ohne LIVE_VERIFIED.**

---

## 3 · Konflikte — NICHT GERATEN, zur Entscheidung an Pascal

1. **Grün-Token.** Canvas/aktuelle App nutzen **`#C0EE38`** (hell; in den
   Screenshots bestätigt). Pascal 05.11.: `#C0EE38` „viel zu grell"; App-Token
   `config/design-tokens.json#marke.lime = #A8C76A` (gedämpft). Die „Falsch"-
   Korrektur + Canvas als Quelle sprechen jetzt für `#C0EE38`. **Offen:**
   `#C0EE38` (Canvas-treu) vs. ruhigeres `#A8C76A`. → Pascals Entscheid.
2. **Chat-Name.** Aktueller Repo-Stand (korrigiert): Chat heißt **„Oracle"**
   (Canvas-Wortlaut). Früher „NeX Agentic AIFly". **„NOVA" kommt im aktuellen
   Repo nicht vor.** **Offen:** NOVA vs. NeX Agentic AIFly/ORACLE. → Pascal.
3. **Rechtsform.** Aktuelle Inhalte (Canvas JSON-LD, Footer) nennen
   **„NeXify AI FACTORY B.V."** (B.V.). **Offen:** Eenmanszaak vs. B.V. — betrifft
   Impressum/Schema; nicht geraten. → Pascal (Impressum bleibt Entwurf).
4. **Sprachen.** `main`/`apps/web` = **de/nl/fr/en (4)**; `.de`-Branch
   `factory/agency-separated-2026-10-26` = **de/nl/fr (3)**. **Offen:** 3 vs. 4
   vor .de-Migration. → Pascal.
5. **Hero-Video mit Ton vs. Bilder.** Aktuell **Bilder** (editorial still,
   Higgsfield NeX/Pascal/Oracle). Video owner-gated (`config/hero-film.json`
   `production_accepted`, `page-media-registry.json` pending); Ton/Lippensync/
   Autoplay **nicht als funktionierend gemeldet**. **Offen** → Pascal.

---

## 4 · Je Seite echter Stand auf .de

**Blocker für Live-.de-Nachweis:** Die Branch-/Preview-Deployments (`web`, `site`,
`.de`) liegen hinter **Vercel Authentication** (Login-Wall). Verifiziert: HTTP 200,
aber ausgelieferte Seite = „Login – Vercel". Daher sind **keine echten
.de-Screenshots (1440/390)** erzeugbar und **kein LIVE_VERIFIED** vergebbar, bis der
Deployment-Schutz aufgehoben oder Zugang gegeben ist. Danach läuft die Abnahme per
`PLAYWRIGHT_BASE_URL=<.de-URL>` direkt gegen Live.

**Lokaler Stand (apps/web, `next dev`, Chat-Gate `apps/web/e2e`):** Chat-Einstieg
auf **allen 39** `shared_chat_required`-Routen in Desktop 1440 **und** Mobil 390
sichtbar — **80/80 grün** (39 Routen × 2 Viewports + 2 Wächter).

| Bereich | Seiten (Pfad) | Chat lokal | .de live |
|---|---|---|---|
| NeXify öffentlich | `/`, `/leistungen`, `/leistungen/websites`, `/leistungen/agenten-automatisierung`, `/leistungen/apps-portale`, `/leistungsumfang`, `/loesungen`, `/preise-ablauf`, `/wissen`, `/wissen/projekt-vorbereiten`, `/unternehmen`, `/kontakt`, `/produkte/nex2fly`, `/produkte/one`, `/produkte/api`, `/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/barrierefreiheit`, `/cookies`, `/anmelden`, `/registrieren` | **ja** | BLOCKIERT |
| TEILEKLAR öffentlich | `/teileklar`, `/teileklar/suche`, `/teileklar/kategorien`, `/teileklar/kategorie`, `/teileklar/produkt`, `/teileklar/warenkorb`, `/teileklar/kasse`, `/teileklar/fahrzeug-und-passung`, `/teileklar/termine`, `/teileklar/gutscheine`, `/teileklar/partner-werden`, `/teileklar/werkstatt`, `/teileklar/rechtliches`, `/teileklar/shop`, `/teileklar/reifenrechner`, `/teileklar/batterie-berater` | **ja** | BLOCKIERT |
| Auth/intern (Chat bewusst nicht) | `/portal/kunde`, `/portal/api`, `/portal/affiliate`, `/teileklar/konto`, `/teileklar/partnerportal`, `/teileklar/nachbarschaft`, `/intern/workspace`, `/intern/posteingang`, `/intern/leitstand`, `/intern/verwaltung` | n/a (exempt) | BLOCKIERT |

Je Seite gilt die Statuskette max. **LOCALLY_TESTED**; **LIVE_VERIFIED erst nach
.de-Abnahme** (Blocker oben).

---

## 5 · CI-Status PR #75 / #36 (klassifiziert)

**PR #36** — `closed` + **merged** (27.10.2026, „Factory/agency separated",
Basis `main`). Erledigt; nichts offen.

**PR #75** (HEAD `e4acc02`, laufend):
- **Rot, vorbestehendes Gesamt-Gate:** `next-web`, `review` (und `react-site`,
  `repository`, `postgres-isolation` als Teil der Vollkette, z. T. noch laufend) —
  die Vollkette ist bereits auf dem Basisstand rot (~79 Failures laut Root-
  `PROGRESS.md`). Nicht durch diese PR verursacht.
- **Rot, Infra/Entitlement (nicht Code):** `Workers Builds` (Cloudflare)
  „Script name too long (>54 Zeichen)"; `Vercel – site-gjp7` „Deployment blocked".
  Repo-weit, nicht diese PR.
- **Grün:** `triage`, `openapi-schema`, `Vercel Preview Comments`.
- **Neutral/Review-Bots:** `CodeRabbit`, `cubic`, `Vercel Agent Review`
  (letzterer: Leistungswege-Befund **ISSUE_RESOLVED**), `Paperclip Review`
  (`action_required`, Entitlement).
- **Diese PR selbst:** `tsc` 0, Chat-Gate 80/80, Generator/ds-audit grün.
  Keine Tests deaktiviert, keine Gates abgesenkt.

---

## 6 · Antwort auf Aufträge 1–4 (Kurzstand; Detail im Register)

- **Auftrag 1 (Werkstatt/SEO/Preisrecherche):** A/B (Stadtseiten + JSON-LD/sitemap)
  BAUBAR; **C (OSM-Daten) BLOCKIERT** (Overpass-Egress). Auftrag nennt 56 Städte
  (frühere Notiz 57 — **Readback-Abweichung, 56 gilt**). noindex bis 3 belegte
  Betriebe. D (Preisrecherche) als interne Doku, nicht als NeXify-Preise.
- **Auftrag 2 (Marketing/Content/Conversion):** Positionierung/Pflichtfragen/CTA in
  Seiten-Nachbau zu integrieren; Wettbewerb Top-10 offen; **10 SEO-Keywords
  BLOCKIERT** (kein Keyword-Tool/Search-Console); Vertriebsmaterial braucht
  Kontaktdaten von Pascal.
- **Auftrag 3 (Oracle-Chat = Highlight):** Global vorhanden, an Canvas angeglichen
  („Oracle · Ihr KI-Assistent · sofort bereit"); **Playwright-Abnahme-Gate gebaut
  (80/80 lokal)**. Offen: Datenschutz-Consent-Gate (Vor-Eingabe, getrennte
  Einwilligungen, Zahlungs-/ID-Filter), Token-Feinschliff.
- **Auftrag 4 (Denk-Kanon):** In Repo (`lieferpaket/denk-kanon.md`) mit gemeldeten
  Konflikten a–d; hier in §3 aktualisiert/erweitert.

---

## 7 · UNGEPRÜFT / UNBEKANNT (nichts erfunden)

- **Hermes WebUI (:8787)**, **Composio-Abdeckung**, **Serverstände** — UNGEPRÜFT bis
  zum Nachweis (kein Zugriff in dieser Sitzung).
- **Marco-App** — UNBEKANNT; nichts dazu angelegt oder angenommen.
- **Master System Order v4.0.0** (16 Prinzipien, 15 Gates) — als SOURCE benannt;
  Volltext liegt dieser Sitzung nicht als Datei vor → als Referenz geführt, nicht
  paraphrasiert.

## 8 · Freigaben/Eingaben von Pascal, die blockieren

1. Vercel-Deployment-Schutz der Preview aufheben **oder** Zugang → ermöglicht
   Live-.de-Abnahme (LIVE_VERIFIED). 2. OSM-Egress **oder** Werkstattdaten extern.
3. Keyword-Tool/Search-Console. 4. Kontaktdaten (Vertriebsmaterial).
5. Higgsfield-Medienbindung (`page-media-registry.json`). 6. .de-Sprachen 3 vs. 4.
7. Grün-Token, Chat-Name, Rechtsform, Hero-Video — §3.
