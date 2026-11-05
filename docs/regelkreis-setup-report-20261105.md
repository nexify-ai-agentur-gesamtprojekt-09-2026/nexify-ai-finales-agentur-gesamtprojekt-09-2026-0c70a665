# Regelkreis Setup-Report (Closed-Loop Onboarding, 05.11.2026)

Proof-of-Work zur Protokoll-Initialisierung (Phase 1 Zero-State, Phase 2 Environment). Ziel: bedingungslose
Gesamtfertigstellung, strikt vorgabengesteuert. Dieser Report ist der Verständnis-Nachweis; die Ausführung läuft
im Dauerbetrieb und aktualisiert `PROGRESS.md` (Ketten-Log) und das Register.

## Phase 2 — Environment Ping-Test (real geprüft)
**Verfügbar:** git/push (origin, 27 Commits), node/python-Gates (css-norm, regel-pruefung, browser-evidence,
text-resize, image-uniqueness, reconciliation), shop-Test-venv (mongomock-motor), Playwright, Build/Serve (vite/next).
**Blockiert (Owner/Remote):** Drive-MCP (403), AgentMemory/LightRAG, Bild-Gen-MCP, BigBuy-Key, Revolut-Prod,
nativer Regelkreis-Runtime (Oracle/Hermes), managed-LLM-Adapter (deepseek), echte Fotos, CI-Settings
(review-Secret/Cloudflare-Worker/Vercel-CLI). → Regel 5 greift je betroffenem Thread (unten).

## Phase 1 — Abhängigkeitsmatrix (was gatet was)
```
Fundament (ERLEDIGT+belegt): P02 Design · DIN/ISO-Gates · Evidenz-Kette · Test-Harness · Mail-Kern (G17) ·
                             Cart-Merge (G02) · Auth-Härtung-Teil (G04) · Pricing/Authz/Order/Preisfreigabe · Bild-Einmaligkeits-Gate
   │
   ├─ P03 Seiten/Redaktion (weitgehend erledigt; Copy KI-mustersauber gemessen) ──┐
   ├─ P04 Medien ◄── [E2 echte Fotos] ──────────── gatet Bildserie/Einmaligkeits-Abbau
   ├─ P05/P06/P16 Suite/Workspace/Auth ◄── [G04-Vollfeature: Verifizierung/Tenant/Trial — Design+Owner]
   ├─ P07 API/Kosten ◄── [E4 managed-LLM-Adapter deepseek, GAP-REMOTE] ── gatet Live-KI
   ├─ P08–P11 Produktdaten/Passung/Kauf/Lieferung ◄── [E1 BigBuy-Key] + [E3 Legal/Preis-Freigabe] + [Revolut-Prod]
   ├─ P12–P14 Stadt/Werkstatt/Partner/Termin ◄── [G21 Daten-Journey] + [Partnerdaten owner]
   ├─ P17 Mail/Inbox ◄── Mailer (ERLEDIGT) + [Connector/Transport-Bindung owner]
   ├─ P18–P23 Finance/Wissen/Steuerung/Skills/Marketing/Betrieb ◄── nach System-Reife (operating-model) + [GAP-REMOTE Runtime]
   ├─ P24 Release/Recht/QS ◄── [E3 Legal-Freigabe] + [E6 CI-Settings]
   └─ P25/P26 Plugins/Übergabe
   ▼
P01–P26 ABNAHME ◄── [E7 Owner-Gate: reconciliation-Validator untersagt autonome Abnahme]
```

## Lücken + logische Brücken-Annahmen (dokumentiert, gegen Stillstand)
- **A1:** Persistente Presenter-/Panel-Identität zählt vorläufig als Baseline-Owner-Schuld im Einmaligkeits-Gate
  (nicht als Pro-Bereich-Verstoß), bis der Owner die Interpretation bestätigt. Gate erzwingt „kein NEUES Doppelbild".
- **A2:** Bild-Tests sind an gepinnte Pillow 12.3.0/NumPy 2.3.5 gebunden; kanonische Prüfung = `make test` (default python3).
- **A3:** G04-Vollfeature wird NICHT halb-gebaut (keine Sicherheitsregression); nur der sichere Teil gehärtet+getestet.

## Regel-5-Eskalationen (ultrakurz, lösungsorientiert) — Thread isoliert, Rest läuft weiter
| ID | Ursache | Auswirkung | Handlungsanforderung (Human-in-the-Loop) |
|----|---------|-----------|-------------------------------------------|
| E1 | BigBuy-Key fehlt (D-008) | P08–P11 Katalog leer, Shop nicht live | BigBuy-Schlüssel setzen (Secret, serverseitig) |
| E2 | Echte Fotos fehlen | P04/Bildserie, Einmaligkeits-Abbau blockiert | Bereichseigene Unikat-Fotos in den Chat hochladen |
| E3 | Rechts-/Preis-Freigabe offen | Impressum/Datenschutz/Kasse/Editionen Entwurf | Pascal gibt Rechts-/Preistexte frei (fakten.json) |
| E4 | managed-LLM-Adapter (deepseek) nicht erreichbar | Live-KI/Agenten nicht aktiv | serverseitigen Adapter/Zugang bereitstellen |
| E5 | Regelkreis-Runtime (Oracle/Hermes/AgentMemory) unerreichbar | kein nativer autonomer Loop, nur manuelle Emulation | MCP/VPS-Zugang bereitstellen oder bestätigen |
| E6 | CI-Settings | `review`+`Workers Builds` rot, Live-Preview offen | review-API-Key-Secret, Cloudflare-Worker-Name ≤54, Vercel-CLI-Session |
| E7 | Abnahme = Owner-Gate (Validator) | P01–P26 bleiben not_accepted | je Phase mit Nachweis abnehmen |
| E8 | Claude-Design-`/p/`-Links (NeX2Fly Suite, Impressum/Datenschutz) liefern HTTP 403 — aus der Cloud-Session keine authentifizierte Route (verifiziert) | diese Design-Dateien nicht ingestierbar/steuerbar; Design-Governance läuft stattdessen über den Repo (Tokens/Gates/Komponenten/Einmaligkeit) | die `.dc.html` in den Chat hochladen (bewährte Route wie Startseite+Komponenten) ODER eine erreichbare Design-MCP/Export bereitstellen |

| E9 | AI-Coverage-Audit meldet `audit_partial`: 9 registrierte AI-Quellen gedriftet (`requires_review`) + 4 unregistrierte Kandidaten. Vorbestehend (0 von dieser Sitzung geändert), advisory (nicht in `make check`/CI), Tool bewusst `automatic_hash_refresh:false` | AI-Governance-Register nicht aktuell; **kein** Blocker der grünen Prüfkette | Deliberate Per-Quelle-Review (AI-Verhalten/Policy-Konformität) + bewusste Re-Registrierung durch Owner/Review — **kein** Bulk-Auto-Refresh (wäre unreviewte Governance-Regression, CLAUDE.md-widrig) |
| E-RUFLO-1 | **Teil-Korrektur (05.11.):** Der **CLI-Pfad** von Ruflo ist aus dem Cloud-Container lauffähig und wurde gestartet (`init check`, `swarm init`, `metaharness score` — alle EXIT=0, Nachweis im Zyklus-Log). **Nur** die *In-Session-MCP-Registrierung* (`RuFlo_Federation` / `claude mcp add-json claude-flow`) bleibt Auth-Required und aus dem Container nicht anmeldbar. | claude-flow-**Orchestrierung aktiv** (Swarm/Metaharness per CLI); lediglich die MCP-Tool-Oberfläche in dieser Session fehlt. **Kein** Blocker — Ruflo ergänzt laut CLAUDE.md, ersetzt Gates/Arbeit nicht. | Nur falls MCP-Tools in der Session gewünscht: Owner aktiviert `claude mcp add-json … --scope local` am Arbeitsplatz gemäß `docs/automation/ruflo.md`. Der CLI-Betrieb braucht dies nicht. |

**Design-Steuerung (Verantwortung übernommen):** Das maßgebliche Designsystem wird im Repo gesteuert und durchgesetzt —
`docs/design/design-system-authoritative-20261105.md` (+ versionierte Startseite/Komponenten-Quellen), die Token-Ebene
(`masterplan-tokens.css` + kanonische `design-tokens.json`), die Gates (css-norm, regel-pruefung) und das
Bild-Einmaligkeits-Gate. Claude-Design-App-Dateien sind ein Eingang, der per E8 nur über Chat-Upload/erreichbare
MCP ins Repo gelangt; bis dahin ist die Repo-Governance der verbindliche Steuerstand.

## Deep-Dive-Status (tiefste unabhängige Knoten)
Alle autonom + sicher ausführbaren Blätter sind exekutiert und belegt (Design-System, shop-api-Korrektheits-/
Sicherheits-Sweep inkl. Bugfixes+Invarianten+Audits, Bild-Einmaligkeits-Gate, Test-Robustheit). Verbleibende Knoten
sind an E1–E7 gebunden. Closed-Loop-Zustand: **ausführbarer Scope erschöpft+belegt, blockierter Scope eskaliert+umgangen,
kein passives Warten** — der Loop setzt je eintreffender Owner-Zulieferung am betroffenen Knoten sofort fort.

## Zyklus-Log (Dauerbetrieb)
- **05.11. — Fahrzeugauswahl auf öffentlichen TEILEKLAR-Flächen (Commit `3895bae`, PR #67):** Proaktiv erkannte
  Spec-Abweichung: der Standard „Fahrzeug zuerst am Kopf JEDER TEILEKLAR-Fläche" (`VehicleBar.tsx`) galt nur in
  next-web (`ShopFrame`), nicht im öffentlichen Vite-Runtime-Shop (`PublicShopContent`). Behoben (additiv: VehicleBar
  als führendes Element von `.tk-public-commerce`). Nachweis: Einheitstest (9 Commerce-Flächen), realer Browser-Lauf
  (`browser-shop-api.mjs`, VehicleBar first-child auf Shop+Suche), Shop-Browser-Evidence + Text-Resize-Evidence neu
  erzeugt, Reconciliation-Register nachgezogen. Self-Healing: drei durch die Quelländerung ausgelöste Evidence-Binding-
  Gates im Regelkreis automatisch nachgezogen (nicht blind rehash, sondern Nachweise real regeneriert). Gates grün:
  python unittest 748 OK, css-norm 0, regel-pruefung 38/38, image-uniqueness PASS. Teil von Task #12 (Pure-Frontend-Anteil).
- **05.11. — `mail_quota` als deklarierte Namespace-Collection (Verfügbarkeits-Fix, PR #67):** Verifizierter
  VADE-Befund (`mailer.py:78`, RECOMMENDATION FIX): die erste Tages-Kontingentreservierung legt per `upsert=True`
  die Collection `mail_quota` an; `vercel_app.check_metadata` verlangt die Live-Collections jedoch EXAKT gleich
  `COLLECTIONS` (Z. 112). `mail_quota` war — anders als ihr Mailer-Geschwister `outbox` — dort nicht deklariert,
  sodass die erste versandte Mail den Readiness-Probe auf `namespace_schema_unbound` kippt und ALLE Shop-API-
  Geschäftsrouten mit 503 sperrt. Gegen den echten Code bestätigt (nicht blind übernommen). Vertragskonform behoben:
  `mail_quota` in `COLLECTIONS` (vercel_app.py) und im Provisioning-Plan (`services-namespace-plan-2026-10-31.json`)
  aufgenommen → der `namespace_operator` legt sie mit SCHEMA_MARKER-Validator an, der Mailer-`upsert` schreibt in die
  bereits validierte Collection ohne Optionsänderung, der Probe bleibt grün. Keine INDEXES nötig (`_id` = Tagesdatum).
  Nachweis: test_namespace_operator (19 statt 18 Collections), test_vercel_adapter (zieht `mail_quota` dynamisch mit),
  test_mailer_cap — alle grün im Venv; Self-Healing der stale gewordenen Bindings (acceptance-coverage source_sha256,
  reale Shop-Browser-Evidence neu erzeugt: 8 Katalog- + 10 Shop-Checks PASS, reconciliation nachgezogen). `make check`
  EXIT=0, python 748 OK, regel-pruefung 38/38, image-uniqueness PASS. Teil von Task #12 (Backend-Härtung).
  **Klassen-Nachweis (Regelkreis-Schließung der gesamten Fehlerklasse, nicht nur der Instanz):** systematischer
  Abgleich ALLER `db.<collection>`-Laufzeitzugriffe der Shop-API (`apps/shop-api/shop/*.py`, Nicht-Test) gegen die
  19er-`COLLECTIONS`-Allowlist ergibt **0 undeklarierte Collections** (einziger vermeintlicher Treffer
  `db.ensure_indexes` ist die async-Funktion in `shop/db.py`, keine Collection). Damit ist die 503-Schema-Sperre-
  Klasse, die VADE in zwei Instanzen (`quotes` → Commit `e0fdb52`, `mail_quota` → `cdaab78`) gemeldet hatte,
  vollständig geschlossen: keine weitere latente Laufzeit-Autocreate-Collection existiert.
- **05.11. — Ruflo nach Vorgabe gestartet (Nutzerziel `/goal`, vorgabengesteuert):** Der dokumentierte Startpfad
  aus `docs/automation/ruflo.md` wurde real ausgeführt (orchestrierungs-Scaffolding, **keine** Modell-Aufrufe →
  `config/llm-policy.json` unberührt): `npx -y ruflo@3.71.1 init check` → „[OK] RuFlo is initialized, V3-Runtime
  `.claude-flow/config.yaml`"; `swarm init --topology mesh --max-agents 5` → Swarm `swarm-1793876556686-kr5et0`
  (mesh, Auto-Scale, message-bus); `metaharness score` → harnessFit 76, compileConfidence 100, toolSafety 100,
  hardConstraints **6/6**, scaffoldReady true, recommendedMode „CLI + MCP", est. $0.048/Run — alle EXIT=0.
  Korrektur zu E-RUFLO-1: der CLI-Betrieb ist aus dem Container lauffähig; nur die In-Session-MCP-Registrierung
  bleibt Owner-lokal. Self-Healing: der V3-Swarm-Start erzeugt zusätzliche Laufzeit-Artefakte
  (`.claude-flow/{daemon-state.json,daemon.pid,harness-active-policy.json,metrics,policy,swarm}`, `.swarm/`,
  `.claude/proven-config.json` + `.proven-config-version`), die die dokumentierte gitignore-Liste nicht abdeckte;
  `.gitignore` erweitert, sodass die Invariante „Laufzeitdaten sind gitignoriert" wieder exakt gilt (`git status`
  danach nur `.gitignore`). Daemon läuft lokal (Stop: `npx ruflo@3.71.1 daemon stop`), Tool-Aufrufe bleiben
  bestätigungspflichtig; `AGENTS.md`/Gates/Secret-/Mandantengrenzen behalten laut `config/integrations/ruflo.json`
  Vorrang.
- **Grenze des session-exekutierbaren In-Repo-Scopes:** Binäre Prüfkette = 100 % grün. Offene Tasks #10 (Copy-Tiefe/
  KI-Muster — editorial, kein binäres Gate; jede Copy-Änderung kaskadiert den Evidence-Loop), #11/#15 (echte Bildserie —
  E2 owner-gated), #12-Rest (Katalog/Preise — E1/E3 owner-gated). AI-Coverage-Audit `blocked` ist advisory (exit 0) und
  E4/E9-owner-gated; **nicht** per Hash-Umschreiben „grün" zu fälschen (CLAUDE.md: keine Gates abschalten).
