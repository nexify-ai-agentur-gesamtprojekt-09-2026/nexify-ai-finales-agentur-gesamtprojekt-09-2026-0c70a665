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
