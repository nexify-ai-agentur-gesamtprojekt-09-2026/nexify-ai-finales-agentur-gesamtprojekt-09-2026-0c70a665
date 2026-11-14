# Bot-Team: IST gegen SOLL (Paket H)

Stand: 14.11.2026, Repository `origin/main` auf `2906f58`. Reine Analyse. Kein Agent wurde gestartet, keine Konfiguration geändert, kein Schlüssel gelesen.

Bezug: Register der offenen Arbeiten vom 14.11.2026, Einträge OA-134, OA-141, OA-147.

Kennzeichnung in diesem Dokument:

- **SOLL**: gültige Entscheidung oder führender Plan.
- **IST**: heute an der genannten Fundstelle gelesen oder gemessen.
- **HISTORIE**: überholter Stand, bleibt als Herkunft stehen.
- **ANNAHME**: Zuordnung oder Bewertung dieser Analyse, nicht vom Inhaber bestätigt.
- **OFFEN**: fehlt oder ist nicht belegt.

## 1. Ergebnis in Kürze

1. **IST: Kein geplanter Agent läuft.** Alle neun Profile haben `connected_worker_id: null` und leere `tool_bindings` (`config/integrations/nexify-team-runtime-candidate.json:49-137`); der Kandidat steht auf `candidate_not_runtime_activation` (Zeile 4), der Block `activation` ist vollständig `false` (Zeilen 8-13), der Funktionsnachweis für Hermes fehlt (`function_proof: false`, Zeile 22).
2. **IST: Von 44 Unternehmensrollen hat keine einen Ausführenden.** Jede Rolle trägt `executorAssignment: null` und `executionCapability: must-be-discovered-and-verified-for-this-task` (`docs/source-snapshots/team-blueprint-20261101/role-catalogue.json`, ab Zeile 106). Für 24 der 44 Rollen gibt es im Repository keinen eigenen Skill (ANNAHME, Zuordnung in Abschnitt 4).
3. **IST: Was heute arbeitet, sind Claude-Code-Sitzungen auf Zuruf und ihre Unteragenten**, dazu ein Modellaufruf hinter dem Website-Chat (`apps/web/app/api/chat/route.ts:3`). Das sind keine dauerhaft laufenden Agenten.

## 2. Was geplant ist (SOLL) und woher die Zahlen kommen

| Zahl | Was | Fundstelle |
|---|---|---|
| 9 | Profile (companion, baumeister, pruefer, recherche, triage, angebot, wissen, orchestrator, waechter) | `config/integrations/nexify-team-runtime-candidate.json:47-137`; kanonisch `config/brain/agents.json:13-107` |
| 44 | Unternehmensrollen ER-01 bis ER-44 in 8 Gruppen | `docs/source-snapshots/team-blueprint-20261101/role-catalogue.json:8` ff.; Verweis im Kandidaten Zeilen 39-45 |
| 17 | Fachfähigkeiten des Anhangs A | `docs/09-final/master-goal-anhang-growth-product-factory-2026-11-09.md:27-43` |
| 12 | Abteilungen D01 bis D12 | `config/operating-model.json:35` ff. |
| 44 | Skills der Bibliothek „small-business“ (Anthropic, lesbar eingebunden, nicht ausgeführt) | `config/integrations/small-business.json:4` und `:27` |
| 5 + 13 | eigene Skills: 5 unter `skills/`, 13 unter `.claude/skills/` (12 `nexify-*` und `composio`) | Verzeichnislisten am Commit `2906f58` |

SOLL-Grundsatz des Anhangs A: „Ein Rollenname ist kein laufender Agent. Keine 24/7- oder Teamstärke-Behauptung ohne Runtime-, Identitäts- und Ausführungsnachweis.“ (`master-goal-anhang-growth-product-factory-2026-11-09.md:20`). Die 17 Fähigkeiten sind ausdrücklich „keine Verpflichtung zu 17 dauerhaft aktiven Agenten“ (Zeile 45).

SOLL zur Laufzeit: Hermes ist die Orchestrierungs-Laufzeit, in der die Rollen arbeiten, keine weitere Rolle; NeX führt aus, AIFly ORACLE koordiniert (`DECISIONS.md:141-148`, D-019). Welche Profile über `triage` und `angebot` hinaus in Hermes laufen, ist nicht entschieden (`DECISIONS.md:147-148`).

## 3. Die neun Profile

Zustand: „nur beschrieben“ = Rolle steht in Dokumenten; „konfiguriert“ = eine Konfiguration für eine Laufzeit liegt im Repository; „lauffähig nachgewiesen“ = ein echter Lauf mit Beleg. Kein Profil erreicht die dritte Stufe.

| Profil | Aufgabe in einem Satz | Vorgesehene Laufzeit | Werkzeuge laut Rollendatei | Vorhandener Skill | Heutiger Zustand | Voraussetzung zum Start | Risikoklasse | Priorität |
|---|---|---|---|---|---|---|---|---|
| `companion` | Beantwortet Besucherfragen, ordnet ein und übergibt an den Inhaber; kein Festpreis, keine Rechtsberatung. | `managed-gateway` | `wissen.lesen`, `preisliste.lesen`, `kalender.slots` (`agents.json:13`) | keiner als Skill; die Funktion liegt im Code des Website-Chats (`apps/web/app/api/chat/route.ts`) | **nur beschrieben** als Agent. IST daneben: Der Website-Chat ist ein Modellaufruf ohne Werkzeuge. | Abgleich der Modellkennung (`PROGRESS.md:93`), Schlüssel mit Limit, Entscheidung zu Kalender und Preisliste als Werkzeug | handelt nach außen | A |
| `baumeister` | Ein schreibender Entwickler je freigegebenem Arbeitsbereich. | `codex-existing` | `dateien`, `git`, `browser`, `tests` (`agents.json:29`) | `.claude/skills/nexify-zweig-und-pr`, `nexify-klon-fabrik`, `nexify-shop-zugriffsschicht`, `skills/nexify-governed-delivery` | **nur beschrieben** als Profil. IST: Die Arbeit leisten Claude-Sitzungen auf Zuruf. Codex-Kontingent offen (`PROGRESS.md`, „Braucht den Inhaber“). | beschreibbarer Checkout, eng berechtigter Git-Zugang (`ops/hermes/README.md:168`) | schreibt ins Repository | B |
| `pruefer` | Unabhängige Prüfung von Quellen, Verhalten und Commit, ohne Schreibrechte. | `codex-code-review` | `linter`, `kontrast`, `tests`, `screenshot` (`agents.json:44`) | `.claude/skills/nexify-belege-und-pins`, `nexify-pr-sichtung`, `skills/nexify-quality-learning` | **nur beschrieben**. `settings_verified: false` im Kandidaten. | getrennte Laufzeit vom Schreibenden (`ops/hermes/README.md:161`) | liest nur | B |
| `recherche` | Quellengebundene Recherche mit Quelle und Datum je Aussage. | `session-native` | `websuche`, `web.lesen`, `wissen.lesen` (`agents.json:55`) | `skills/nexify-research-content` | **nur beschrieben** als Profil. IST: in Claude-Sitzungen auf Zuruf möglich, kein Dauerlauf. | Auftrag mit Umfang; Ablageort für Ergebnisse | liest nur | A |
| `triage` | Ordnet eingehende Anfragen zu und bereitet vor; sendet nichts. | `hermes-candidate` | `mail.lesen`, `tags`, `senden: false` (`agents.json:65`) | keiner im Repository; Bibliothek: `lead-triage`, `inbox-manager` (UNGEPRÜFT) | **konfiguriert** nur auf Ebene der Laufzeit (`ops/hermes/home/config.yaml`), nicht als Rolle. Kein Postfach angebunden. | Hermes-Schritte 0–6, lesender Postfachzugang, Freigabe | liest nur | A |
| `angebot` | Bereitet Angebote aus dem Katalog vor; Preise nur aus dem Katalog, Freigabe beim Inhaber. | `hermes-candidate` | `preisliste.lesen`, `rechenkern.cent`, `pdf` (`agents.json:75`) | keiner im Repository; Bibliothek: `proposal-builder` (UNGEPRÜFT) | **konfiguriert** nur auf Ebene der Laufzeit, nicht als Rolle. | Hermes-Schritte 0–6, freigegebene Preisliste, Freigabeweg | schreibt Entwürfe; nach außen erst nach Freigabe | A |
| `wissen` | Beantwortet aus versionierten Quellen mit Fundstelle; ohne Treffer „weiß ich nicht“ und Übergabe. | `local-control` | `rag` (`agents.json:85`) | `skills/nexify-knowledge-operations`, `.claude/skills/nexify-graph` | **nur beschrieben**. `memory.connected: false` (Kandidat Zeile 200). | Entscheidung zum Wissensspeicher (Standortbestimmung Abschnitt 5: Graphify für Code entschieden, Produktwissen offen) | liest nur | B |
| `orchestrator` | Steuert Aufträge, Budget und begrenzte Übergabe. | `existing-coordinator` | `queue`, `journal`, Limit 30 Schritte, 20 Minuten, Kosten offen (`agents.json:94`) | `.claude/skills/nexify-agenten-koordination` | **nur beschrieben** als Profil. IST: Die koordinierende Claude-Sitzung übernimmt das, solange sie offen ist. | Funktionsnachweis Hermes; Entscheidung, ob das Profil in Hermes läuft (`DECISIONS.md:148`) | schreibt ins Repository | B |
| `waechter` | Lesende Betriebs- und Nachweisprüfung mit Gegentest und Zustellbestätigung. | `systemmaster-read-only` | keine genannt; `gegentest: pflicht`, `zustellbestaetigung: pflicht` (`agents.json:107`) | `.claude/skills/nexify-auslieferung-pruefen`, `nexify-server-messung`, `nexify-stand-halten` | **nur beschrieben** als Profil. IST: Die Live-Prüfung läuft als geplante Aufgabe in einer offenen Sitzung (siehe `routinen-ist-soll-2026-11-14.md`). | geplante Aufgabe mit frischer Sitzung, Zustellweg | liest nur | A |

Risikoklassen dieser Tabelle sind ANNAHME aus den Werkzeuglisten. Die Hartsperren gelten für alle Profile: kein Neustart, keine DNS- oder Firewall-Änderung, keine Zahlung, kein Löschen ohne Freigabe, keine Nachricht an Dritte ohne Freigabe (`config/brain/agents.json:4-11`).

## 4. Die 44 Unternehmensrollen

Heutiger Zustand für **alle 44 Zeilen: nur beschrieben.** Beleg: `executorAssignment: null` in jeder Rolle; Bedeutung des Katalogs laut Kopf: „reference catalogue only; does not grant execution“.

Spalten: „Zugeordnete Skills der Bibliothek“ ist die Zuordnung der Quelle zu Skills aus „small-business“ (IST, laut Quelle „supporting-workflows-not-a-complete-enterprise-executor“). „Eigener Skill im Repository“, Risikoklasse und Priorität sind ANNAHME dieser Analyse. Priorität: A = nötig für die Ziele des Inhabers (Beratung im Chat, Angebot, Triage, Tagesbericht, Lead-Recherche), B = nötig für geordneten Betrieb, C = später.

Voraussetzung zum Start, für alle Rollen gleich: (1) eine Laufzeit mit Funktionsnachweis (Hermes-Schritt 6 oder eine geplante Claude-Aufgabe mit frischer Sitzung), (2) OpenRouter-Schlüssel mit Ausgabenlimit, (3) bei „handelt nach außen“ ein freigegebener Kanal und die Freigabe je Vorgang (`DECISIONS.md:146`, Folge 6), (4) bei „schreibt ins Repository“ ein beschreibbarer Checkout mit eng berechtigtem Git-Zugang.

Gruppen: A Strategie und Steuerung · B Produktentwicklung · C E-Commerce und Katalog · D Buchhaltung, Finanzen, Recht · E Marketing · F Mailing und CRM · G Support · H Agentenbetrieb (`role-catalogue.json:10` ff.).

| Rolle | Gruppe | Aufgabe (Wortlaut der Quelle) | Zugeordnete Skills der Bibliothek | Eigener Skill im Repository | Risikoklasse | Priorität | Fundstelle |
|---|---|---|---|---|---|---|---|
| ER-01 Business Model & Value Proposition Architecture | A | Schärfung des White-Label-Modells „NeX2fly — White-Label AI by NeXify / Chat it. Automate it.“ | content-strategy, proposal-builder | `skills/nexify-research-content` (nur Recherche) | liest nur | B | `role-catalogue.json:106` |
| ER-02 OKR, KPI & Monotonic Ratchet Governance | A | Definition und Überwachung aller SOLL-Metriken (mindestens 100 % Zielerhalt). | business-pulse, report-builder, report-pack | `.claude/skills/nexify-stand-halten` (nur Standabgleich) | liest nur | B | `role-catalogue.json:125` |
| ER-03 Portfolio & Suite Gap Analysis | A | Systematische Erkennung fehlender Produkte und Module in der NeX2fly Suite. | business-pulse, growth-pulse, smb-router | FEHLT | liest nur | C | `role-catalogue.json:145` |
| ER-04 Competitive & Market Intelligence (Online Research) | A | Evidenzbasierte Echtzeit-Recherche nach Best Practices (2026). | lead-finder, grow-pipeline, marketing-monday | `skills/nexify-research-content` | liest nur | A | `role-catalogue.json:165` |
| ER-05 Risk, Archive & Business Continuity Management | A | Zero-Data-Loss-Archivierung (`_archive/YYYY-MM-DD/...` + `ARCHIVE_MANIFEST.json`). | contract-review, build-agent | `.claude/skills/nexify-server-messung` (nur Messung) | liest nur | B | `role-catalogue.json:185` |
| ER-06 SaaS & White-Label Suite Packaging | B | Lizenz-, Tier-, Mandanten- und Pricing-Architektur für alle NeX2fly-Produkte. | proposal-builder, report-builder | FEHLT | schreibt ins Repository | A | `role-catalogue.json:204` |
| ER-07 Enterprise API Product Management | B | Design, Auth, Rate-Limiting, Webhooks, OpenAPI-Specs und Developer-Portal der API-Gesamtlösung. | build-connector, contract-review | `skills/nexify-platform-integrations` | schreibt ins Repository | C | `role-catalogue.json:223` |
| ER-08 App & Web Platform Specification | B | Lückenlose Aufarbeitung, Erklärung und User-Flow-Definition aller bisher unzureichend dokumentierten Apps und Webseiten. | build-agent, proposal-builder | `.claude/skills/nexify-klon-fabrik`, `.claude/skills/nexify-seitentexte` | schreibt ins Repository | B | `role-catalogue.json:242` |
| ER-09 UX/UI Design System Governance | B | Durchsetzung eines konsistenten, hellen, hochmodernen Design-Standards (Apple-inspirierte Klarheit). | brand-style, canva-creator | `.claude/skills/nexify-klon-fabrik` | schreibt ins Repository | B | `role-catalogue.json:261` |
| ER-10 Technical Documentation & Knowledge Engineering | B | Produktionsreife Spezifikationen und Playbooks ohne Platzhalter. | build-agent, report-builder | `.claude/skills/nexify-stand-halten`, `skills/nexify-knowledge-operations` | schreibt ins Repository | B | `role-catalogue.json:280` |
| ER-11 Release, Migration & Cutover Management | B | Atomare Vollmigration in den Produktivbestand mit Rollback-Sicherung. | keine (`no-equivalent-in-the-Anthropic-44-catalog`) | `.claude/skills/nexify-zweig-und-pr`, `.claude/skills/nexify-auslieferung-pruefen` | handelt nach außen | B | `role-catalogue.json:299` |
| ER-12 Catalog Taxonomy & Domain Filtering (Automotive Only) | C | Forensische Klassifizierung aller ~6.000 Artikel; strikte Aussortierung und strukturierte Archivierung sämtlicher themenfremder Artikel (Betten, Sofas, Möbel, Haushaltswaren) bei $100\,\%$ Fokus auf Fahrzeuge aller Art. | inventory-planner, seo-ai-visibility | FEHLT | schreibt ins Repository | C | `role-catalogue.json:315` |
| ER-13 Automated Product Image Pipeline (Background Removal) | C | Saubere Entfernung weißer/störender Hintergründe (Freistellung), Alpha-Matting, Schattierung und konsistente Shop-Einbettung. | keine (`no-equivalent-in-the-Anthropic-44-catalog`) | FEHLT | schreibt ins Repository | C | `role-catalogue.json:334` |
| ER-14 High-Conversion Product Copywriting (~6K Scale) | C | Technische Präzisierung, Nutzenargumentation und strukturierte Bullet-Points für alle Fahrzeug-Produkte. | content-strategy, seo-ai-visibility | `.claude/skills/nexify-seitentexte` (nur Seitentexte) | schreibt ins Repository | C | `role-catalogue.json:350` |
| ER-15 Technical E-Commerce SEO & Schema.org | C | Optimierung von Meta-Titeln, Beschreibungen, JSON-LD Product-Schemata, Canonical-Tags und Kategorie-Filtern. | seo-ai-visibility | `skills/nexify-research-content` (nur Daten und Brief) | schreibt ins Repository | C | `role-catalogue.json:369` |
| ER-16 Pricing, Margin & Inventory Sync | C | Bestands-, Varianten-, EAN/OEM-Nummern- und Preislogik. | inventory-planner, restock, cash-flow-snapshot | FEHLT | handelt nach außen | C | `role-catalogue.json:387` |
| ER-17 Storefront & Checkout Conversion Optimization | C | Optimierung aller Kategorie-, Produktdetail- und Warenkorbseiten. | seo-ai-visibility, ticket-deflector | `.claude/skills/nexify-klon-fabrik` (nur Bausteine) | schreibt ins Repository | C | `role-catalogue.json:407` |
| ER-18 Cross-Selling & Vehicle Compatibility Logic | C | Fahrzeugtypen-Zuordnung (Pkw, Nfz, Zweirad, Werkstatt) und passendes Zubehör-Bundling. | inventory-planner, proposal-builder | FEHLT | schreibt ins Repository | C | `role-catalogue.json:426` |
| ER-19 Automated Bookkeeping & Ledger Architecture | D | Einrichtung der kompletten Buchhaltung, Kontenrahmen-Mapping (SKR03/SKR04) und Buchungslogik. | ap-processor, month-end-prep, close-month, payroll-prep | FEHLT | handelt nach außen | B | `role-catalogue.json:445` |
| ER-20 Invoicing, Billing & Subscription Lifecycle | D | Automatisierte Rechnungsstellung für Suite-Abos, API-Nutzung und Shop-Bestellungen. | proposal-builder, invoice-chase, pay-the-bills | FEHLT | handelt nach außen | A | `role-catalogue.json:466` |
| ER-21 Tax, VAT/OSS & Compliance Management | D | Umsatzsteuer-Logik, Belegprüfung und GoBD-konforme Archivierung. | tax-prep, tax-season-organizer, contract-review | FEHLT | handelt nach außen | B | `role-catalogue.json:486` |
| ER-22 Payment Gateway & Reconciliation Automation | D | Abgleich von Zahlungseingängen (Stripe/PayPal/Bank) mit offenen Posten. | month-end-prep, cash-flow-snapshot, ap-processor | FEHLT | handelt nach außen | B | `role-catalogue.json:506` |
| ER-23 Dunning & Receivables Management | D | Mehrstufiges, automatisiertes Mahnwesen und Liquiditäts-Tracking. | invoice-chase, plan-payroll | FEHLT | handelt nach außen | C | `role-catalogue.json:526` |
| ER-24 Financial Reporting & Unit Economics | D | Echtzeit-Auswertung von MRR, ARR, CAC, LTV und Deckungsbeiträgen. | report-builder, business-pulse, growth-pulse | FEHLT | liest nur | B | `role-catalogue.json:545` |
| ER-25 Brand Positioning & Messaging Matrix | E | Einheitliche Markenkommunikation über Agentur, NeX2fly Suite und Automotive-Shop. | brand-style, content-strategy, smb-onboard | `.claude/skills/nexify-seitentexte` | schreibt ins Repository | B | `role-catalogue.json:565` |
| ER-26 Full-Funnel Campaign Architecture | E | Aufbau von Awareness-, Consideration- und Conversion-Funnels. | grow-pipeline, outreach-composer, canva-creator | FEHLT | handelt nach außen | C | `role-catalogue.json:585` |
| ER-27 Content Marketing & Editorial Engine | E | Automatisierte Redaktions- und Fachartikel-Pipelines. | content-strategy, social-content-engine | `skills/nexify-research-content` | schreibt ins Repository | C | `role-catalogue.json:605` |
| ER-28 Search Engine Marketing (SEO/SEA) & Local Visibility | E | Organische und bezahlte Sichtbarkeitssteuerung. | ad-manager, seo-ai-visibility | `skills/nexify-research-content` (nur Daten) | handelt nach außen | C | `role-catalogue.json:624` |
| ER-29 Social Media & Community Orchestration | E | Multi-Channel-Distributionslogik und Asset-Generierung. | social-content-engine, canva-creator, review-reputation | FEHLT | handelt nach außen | C | `role-catalogue.json:643` |
| ER-30 Marketing Analytics & Attribution | E | Klare Messung von RoAS, Conversion-Rates und Funnel-Drop-offs. | growth-pulse, marketing-monday, report-builder | FEHLT | liest nur | C | `role-catalogue.json:663` |
| ER-31 Email Infrastructure & Deliverability Engineering | F | Technisches Setup und Verifikation von SPF, DKIM, DMARC, Bounce-Handling und IP-Reputation. | build-connector, inbox-manager | FEHLT | handelt nach außen | B | `role-catalogue.json:683` |
| ER-32 Transactional Email Architecture | F | Sofortige, fehlerfreie System-Mails (Bestellbestätigung, Rechnung, API-Keys, Passwort-Reset). | inbox-manager, build-agent | FEHLT | handelt nach außen | B | `role-catalogue.json:702` |
| ER-33 Onboarding & Activation Sequences | F | Automatisierte Willkommens- und Aktivierungsstrecken für NeX2fly- und Shop-Kunden. | smb-onboard, speed-to-lead, outreach-composer | FEHLT | handelt nach außen | C | `role-catalogue.json:721` |
| ER-34 CRM Segmentation & Behavioral Triggering | F | Dynamische Zielgruppensegmentierung nach Kauf- und Nutzungsverhalten. | crm-autopilot, lead-triage, call-list | FEHLT | handelt nach außen | C | `role-catalogue.json:741` |
| ER-35 Retention, Win-Back & Newsletter Operations | F | Regelmäßige Kampagnen, Warenkorbabbruch-Recovery und Reaktivierung. | reactivate, outreach-composer, review-reputation | FEHLT | handelt nach außen | C | `role-catalogue.json:761` |
| ER-36 Multi-Tier Support Architecture (Tier 1–3) | G | Klare Trennung zwischen KI-Erstbeantwortung, Fach-Support und Engineering-Eskalation. | ticket-deflector, inbox-manager | FEHLT | handelt nach außen | A | `role-catalogue.json:781` |
| ER-37 Intelligent Ticket Routing & SLA Governance | G | Automatische Klassifizierung, Priorisierung und Einhaltung verbindlicher Antwortzeiten. | ticket-deflector, speed-to-lead | FEHLT | liest nur | A | `role-catalogue.json:800` |
| ER-38 Self-Service Knowledge Base & FAQ Sync | G | Direkte Kopplung des Supports an Brain/LightRAG für sofortige, korrekte Antworten. | build-agent, ticket-deflector | `skills/nexify-knowledge-operations` | liest nur | B | `role-catalogue.json:819` |
| ER-39 RMA, Returns & Warranty Workflows | G | Reibungslose Retouren- und Reklamationsabwicklung für den Fahrzeug-Shop. | ticket-deflector, review-reputation | FEHLT | handelt nach außen | C | `role-catalogue.json:838` |
| ER-40 Customer Health Scoring & Churn Prevention | G | Proaktive Erkennung unzufriedener Kunden und Gegensteuerung. | reactivate, growth-pulse, review-reputation | FEHLT | liest nur | C | `role-catalogue.json:857` |
| ER-41 Atomic Task Checkout & Lock Management | H | Verhinderung von Race-Conditions durch eindeutige Task-Reservierung. | keine (`no-equivalent-in-the-Anthropic-44-catalog`) | `.claude/skills/nexify-agenten-koordination`, `.claude/skills/nexify-zweig-und-pr` | schreibt ins Repository | B | `role-catalogue.json:877` |
| ER-42 Cross-Chat Memory Crystallization & RAG Hygiene | H | Kontinuierliche Deduplizierung, Messung und Anreicherung von Brain, AgentMemory und LightRAG. | keine (`no-equivalent-in-the-Anthropic-44-catalog`) | `.claude/skills/nexify-graph`, `skills/nexify-knowledge-operations` | schreibt ins Repository | C | `role-catalogue.json:893` |
| ER-43 Forensic QA & Adversarial Gate Verification | H | Zwingende Abnahme über `morluto/rea` und `reviewer-gate.py`. | keine (`no-equivalent-in-the-Anthropic-44-catalog`) | `.claude/skills/nexify-belege-und-pins`, `.claude/skills/nexify-pr-sichtung`, `skills/nexify-quality-learning` | liest nur | A | `role-catalogue.json:909` |
| ER-44 Autonomous Cron, Routine & Incident Self-Healing | H | Dauerhafter 24/7-Betrieb mit automatischer Selbstheilung und Health-Checks. | build-agent, business-pulse, monday-brief, report-pack | `.claude/skills/nexify-stand-halten`, `.claude/skills/nexify-auslieferung-pruefen`, `.claude/skills/nexify-server-messung` | schreibt ins Repository | A | `role-catalogue.json:925` |

Zählung (ANNAHME, aus der Tabelle): 24 Rollen ohne eigenen Skill; 11 lesen nur, 16 schreiben ins Repository, 17 handeln nach außen; Priorität A 7, B 16, C 21. Fünf Rollen haben auch in der Bibliothek keine Entsprechung (ER-11, ER-13, ER-41, ER-42, ER-43; IST).

Hinweis zur Herkunft: Der Katalog stammt aus „Master V3“ und nennt noch „NeX2fly“, „AgentMemory“ und „LightRAG“. Der Produktname ist seit D-011 „NeX AIFly Suite“ (`DECISIONS.md:83`); die Wortlaute bleiben als HISTORIE unverändert.

## 5. Die 17 Fachfähigkeiten des Anhangs A gegen vorhandene Skills (OA-141, NX-UM-010)

Statuswerte wie im Auftrag NX-UM-010 verlangt (`docs/09-final/auftragsregister-2026-11-08.md:114-131`): **IST** = eine Skill-Datei liegt im Repository und deckt die Fähigkeit oder einen benannten Teil; **UNGEPRÜFT** = nur ein Skill der Bibliothek ist benannt, für diesen Zweck nicht erprobt; **FEHLT** = nichts vorhanden. IST heißt hier „Arbeitsanweisung vorhanden“, nicht „Agent läuft“.

| Nr. | Fähigkeit (Anhang A, Zeile) | Status | Fundstelle Skill | Grenze |
|---|---|---|---|---|
| 1 | Strategy & Business Architect (27) | UNGEPRÜFT | Bibliothek: `content-strategy`, `proposal-builder` | kein eigener Skill für Geschäftsmodell und Roadmap |
| 2 | CMO / Growth Lead (28) | UNGEPRÜFT | Bibliothek: `grow-pipeline`, `marketing-monday` | Kampagnen brauchen Freigabe; `GTM-03` ist „activation deferred“ (`config/operating-model.json`, `go_to_market_sequence`) |
| 3 | Creative & Brand Director (29) | IST (Teil) | `.claude/skills/nexify-klon-fabrik/SKILL.md` | deckt Wiederverwendung der Bausteine, nicht Medien- und Video-Regie |
| 4 | Copywriting & Editorial (30) | IST | `.claude/skills/nexify-seitentexte/SKILL.md` | nur Seitentexte in vier Sprachen; keine Rechts- und Kassentexte |
| 5 | SEO, GEO & Local Growth (31) | IST (Teil) | `skills/nexify-research-content/SKILL.md` | SEO-Daten bis zum Inhaltsbrief; GEO ausdrücklich nicht aktiviert |
| 6 | CPO / Product Strategy (32) | FEHLT | – | Stufen und Preise sind Inhaberentscheidung |
| 7 | Product Development & UX (33) | IST (Teil) | `.claude/skills/nexify-klon-fabrik/SKILL.md` | keine Nutzerforschung |
| 8 | Solution Architect & Tool Scout (34) | IST | `skills/nexify-platform-integrations/SKILL.md`, `.claude/skills/composio/SKILL.md` | Lizenz- und Kostenprüfung je Fall |
| 9 | Engineering Delivery (35) | IST | `.claude/skills/nexify-zweig-und-pr/SKILL.md`, `.claude/skills/nexify-shop-zugriffsschicht/SKILL.md`, `skills/nexify-governed-delivery/SKILL.md` | Merge nur durch koordinierende Sitzung oder Inhaber |
| 10 | CSO / Sales & RevOps (36) | UNGEPRÜFT | Bibliothek: `lead-triage`, `crm-autopilot`, `speed-to-lead` | kein CRM als führendes System belegt; Ansprache nur mit Einwilligung |
| 11 | Offer, Pricing & Packaging (37) | UNGEPRÜFT | Bibliothek: `proposal-builder`; Profil `angebot` | Preise nur aus freigegebenem Katalog |
| 12 | Planner / PMO / Delivery Lead (38) | IST | `.claude/skills/nexify-agenten-koordination/SKILL.md`, `.claude/skills/nexify-pr-sichtung/SKILL.md` | gilt für die koordinierende Sitzung, nicht für einen Dauerlauf |
| 13 | Research & Intelligence (39) | IST | `skills/nexify-research-content/SKILL.md`; Profil `recherche` | Belegpflicht Quelle und Datum |
| 14 | Audit / QA / Security / Privacy (40) | IST (Teil) | `.claude/skills/nexify-belege-und-pins/SKILL.md`, `.claude/skills/nexify-auslieferung-pruefen/SKILL.md`, `skills/nexify-quality-learning/SKILL.md` | Datenschutzprüfung fehlt als Skill |
| 15 | Analytics, CRO & Experimentation (41) | FEHLT | – | keine Messung von Funnel-Ereignissen belegt |
| 16 | Customer Success & Operations (42) | IST (Teil) | `.claude/skills/nexify-server-messung/SKILL.md`, `.claude/skills/nexify-stand-halten/SKILL.md`, `.claude/skills/nexify-kundenprojekt/SKILL.md` | Support und Onboarding: nur Bibliothek `ticket-deflector`, UNGEPRÜFT |
| 17 | Commercial / Finance Control (43) | UNGEPRÜFT | Bibliothek: `cash-flow-snapshot`, `report-builder` | Buchhaltung nicht verbunden (Register OA-159); LLM-Kosten nicht gemessen |

Zählung: IST 5, IST (Teil) 5, UNGEPRÜFT 5, FEHLT 2. Die Einstufung ist ANNAHME dieser Analyse und braucht die im Auftrag verlangte unabhängige Prüfung.

### Warum `config/skills-register.json` nicht geändert wurde

OA-141 nennt als Ziel, dass `config/skills-register.json` je Rolle IST, FEHLT oder UNGEPRÜFT führt. Die Datei ist gebunden, und die Bindung ist heute gültig (IST):

- Prüfsumme heute: `593d63f0…a2d157`.
- Dieselbe Prüfsumme steht in `config/policy-source-inventory.json:18381` und im Browser-Beleg `evidence/observability-integration-2026-10-28/browser-exceptions-next.json:529` sowie `browser-exceptions-vite.json:529`.

Eine Änderung würde einen gültigen Pin und zwei Browser-Belege ungültig machen. Nachziehen ist nur mit Browserlauf, grünem Test oder geprüftem Diff zulässig und ist „eine eigene Arbeit mit eigenem PR“ (`.claude/skills/nexify-belege-und-pins/SKILL.md:45-55` und `:81`). Deshalb bleibt die Datei unverändert; die Abbildung steht in diesem Dokument.

**Vorschlag für die Umsetzung** (eigener Auftrag, siehe Abschnitt 9, Paket H-2): in `config/skills-register.json` einen neuen Schlüssel `fachfaehigkeiten` mit 17 Einträgen der Form `{ "nr", "name", "status": "IST|FEHLT|UNGEPRÜFT", "fundstelle", "grenze" }` anlegen, bestehende Schlüssel (`angewendet`, `beiBedarf`, `nichtEinschlaegig`, `zaehlung`) unverändert lassen, und im selben PR den Pin in `config/policy-source-inventory.json` mit Belegart „geprüfter Diff“ nachziehen. Die Browser-Belege bleiben stehen und werden als neu abweichend genannt, bis ein Browserlauf sie erneuert.

## 6. Wissensgraph (OA-147, D-018)

SOLL: Graphify in allen Projekten, je Projekt ein eigener Graph, kein Zusammenführen (`DECISIONS.md:133-139`).

IST, gemessen in dieser Arbeit am 14.11.2026 um 18:44 UTC im Worktree auf `2906f58`: `make graph` läuft durch, Dauer 49 Sekunden (`real 0m48.986s`), 1.781 Dateien ohne Zwischenspeicher eingelesen, Ergebnis 12.322 Knoten, 21.480 Kanten, 845 Gruppen; der Ordner `graphify-out/` belegt 31 MB und ist nicht versioniert (`git status` danach leer). 38 Code-Dateien lieferten keine Symbole. Der Lauf nutzte kein Modell und kein Konto.

OFFEN: Graphen in den anderen Projekten und in Kundenprojekten (dort einzurichten, hier nicht belegbar); eine Routine, die den Graphen aktuell hält; ein Konto beim Cloud-Dienst (eigene Inhaberentscheidung, `DECISIONS.md:138`).

## 7. Kleinste sinnvolle Startmannschaft

Ziele des Inhabers laut Auftrag: Kundenberatung im Chat, Angebot, Triage eingehender Anfragen, Tagesbericht, Lead-Recherche ohne E-Mail-Erstansprache.

| Nr. | Rolle | Deckt Ziel | Laufzeit zum Start | Begründung | Was sie nicht darf |
|---|---|---|---|---|---|
| 1 | `waechter` | Tagesbericht, Überwachung | geplante Claude-Aufgabe mit frischer Sitzung je Lauf | Liest nur, braucht Hermes nicht, ist heute ohne neue Zugänge vorbereitbar; die Rollendatei verlangt Zustellbestätigung, genau das fehlt dem Tagesbericht (`auftragsregister-2026-11-08.md:265-267`). | nichts ändern, nichts senden außer dem Bericht an den Inhaber |
| 2 | `companion` | Kundenberatung im Chat | vorhandener Website-Chat | Der Chat ist ausgeliefert; es fehlt der Abgleich der Modellkennung und ein Nachweis, dass Antworten aus freigegebenen Quellen kommen. Ein zweiter Chat-Agent wäre doppelt. | kein Festpreis, keine Rechtsberatung, keine Zusage (`agents.json:13`) |
| 3 | `triage` | Triage eingehender Anfragen | Hermes nach Schritt 6 | Liest und ordnet zu, `senden: false`; kleinstes Risiko unter den Hermes-Rollen und schon Hermes zugeordnet. | nichts senden, keine Zuordnung zu Konten ohne bestätigte Adresse |
| 4 | `angebot` | Angebot | Hermes nach Schritt 6 | Schon Hermes zugeordnet; erzeugt nur Entwürfe, Preise nur aus dem Katalog; der Inhaber gibt frei (`docs/01-konzept/myadmin-gesamtplan.md:57`). | kein Versand, kein neuer Preis |
| 5 | `recherche` | Lead-Recherche | Claude-Sitzung auf Zuruf, später geplante Aufgabe | Liest nur, Belegpflicht; Ergebnis ist eine Liste mit Quelle und Datum. | keine Erstansprache per E-Mail, kein Formularversand, keine Kontaktaufnahme |

Nicht in der Startmannschaft und warum: `orchestrator` (Hermes ist die Laufzeit, die Koordination bleibt bei der koordinierenden Sitzung, bis D-019 „Offen“ entschieden ist); `baumeister` und `pruefer` (die Startmannschaft schreibt nicht ins Repository; Entwicklung läuft weiter über Claude-Sitzungen mit getrennter Prüfung); `wissen` (Wissensspeicher für das Produkt nicht entschieden).

Die Startmannschaft ist ANNAHME dieser Analyse. Drei der fünf Rollen lesen nur; nach außen wirkt allein der bestehende Website-Chat.

## 8. Reihenfolge der Aktivierung nach D-019

Jeder Schritt auf dem Server braucht die Freigabe des Inhabers und hat einen Rückweg (`DECISIONS.md:121`, D-016; `ops/hermes/README.md:3`). Schrittnummern 0–6 wie in `ops/hermes/README.md:54-131`.

**Spur A – ohne Hermes, ohne Server (kann zuerst beginnen):**

1. `waechter` als Tagesbericht: Definition aus `routinen-ist-soll-2026-11-14.md` Abschnitt 6 durch die koordinierende Sitzung als geplante Aufgabe mit frischer Sitzung anlegen lassen (Freigabe des Inhabers für Zustellweg).
2. `companion`: Modellkennung im Website-Chat mit der Regel abgleichen (`PROGRESS.md:93`); kein neuer Agent.
3. `recherche`: erster Auftrag mit Zielgruppe und Ablageort; Ergebnis als Liste, keine Ansprache.

**Spur B – Hermes (Voraussetzung: Shell auf `srv1941843`):**

| Reihenfolge | Schritt | Wer | Abnahme |
|---|---|---|---|
| B0 | **Schritt 0: Bestand lesen** (ändert nichts): Version, Commit, Modell, Ausweichkette, Trockenlauf von `einspielen.sh` | Sitzung mit Shell | Commit gleich `bf0203a…` oder Inhaberentscheidung zur Version (`README.md:66`) |
| B0a | Web-Oberfläche vom öffentlichen Netz nehmen (D-019 Folge 4; `server-befund-2026-11-14.md:75` und `:83`). Kein nummerierter Schritt der Anleitung; ANNAHME: vor Schritt 3, weil dort der Schlüssel eingetragen wird. | Inhaber gibt frei, Sitzung mit Shell | `unternehmensbot.eu` antwortet von außen nicht mehr mit der Anmeldeseite |
| B1 | **Schritt 1: Image um `libatomic1` ergänzen**, vorher altes Image taggen | Sitzung mit Shell | Bau ohne Fehler; nichts neu gestartet |
| B2 | **Schritt 2: Monorepo nur lesend einbinden** (`docker-compose.nexify.yml`, nur `config` prüfen) | Sitzung mit Shell | `docker compose … config` ohne Fehler |
| B3 | **Schritt 3: `.env` ergänzen**: `OPENROUTER_API_KEY` (Schlüssel mit Ausgabenlimit), `NEXIFY_REPO`; `HERMES_INFERENCE_MODEL` und `HERMES_YOLO_MODE` nicht gesetzt | nur Inhaber, von Hand | Trockenlauf meldet keine fehlenden Variablennamen |
| B4 | **Schritt 4: Konfiguration einspielen** (`einspielen.sh --zusatz … --anwenden`) | Sitzung mit Shell | Sicherung unter `/root/.hermes/backups/nexify-<Zeit>/`; zweiter Lauf ändert nichts |
| B5 | **Schritt 5: Container neu erstellen** | Sitzung mit Shell, eigene Freigabe | Protokoll ohne `libatomic.so.1` und ohne `session.create refused` |
| B6 | **Schritt 6: Funktionsnachweis** (bezahlter Aufruf) | Sitzung mit Shell; Kostenfreigabe Inhaber | Exit 0; Bericht nennt `deepseek/deepseek-v4.1-flash-1017`, `openrouter`, `completed: true`, `auxiliary.api_calls` 0; OpenRouter-Protokoll zeigt Reasoning `high` |
| B7 | Docker-Socket aus dem Container entfernen (D-019 Folge 5) | Inhaber gibt frei | Compose-Datei ohne Socket; Container läuft |
| B8 | Kandidatendatei und Prüfer gemeinsam nachführen (`function_proof`, `connected`; `DECISIONS.md:147`) | Agent, eigener PR | `make governance-check` Exit 0 |
| B9 | `triage` in Hermes: lesender Postfachzugang als eigener Adapter, `senden: false` | Agent nach Freigabe des Kanals | 10 echte Anfragen zugeordnet, 0 Nachrichten gesendet |
| B10 | `angebot` in Hermes: Entwurf aus freigegebener Preisliste | Agent; Freigabe je Angebot beim Inhaber | ein Angebot als Entwurf, Preis stimmt centgenau mit dem Katalog überein |

Ein Nachrichtenkanal an Dritte kommt in dieser Reihenfolge nicht vor; er braucht eine eigene Freigabe (D-019 Folge 6; Hartsperre `nachricht_an_dritte_ohne_freigabe`).

OFFEN vor B9: Der Kandidat führt `paid_calls_enabled: false` (Zeile 189) und `shared_monetary_budget: null`; die Rollendatei führt `maxKostenCent: null`. Ein Geldlimit gibt es heute nur am OpenRouter-Schlüssel (`ops/hermes/README.md:170`).

## 9. Als Nächstes vergebbar

Die Pakete überschneiden sich nicht in den Dateien.

| Paket | Inhalt | Betroffene Dateien | Aufwand | Wer | Fertig, wenn |
|---|---|---|---|---|---|
| H-1 | Dieses Dokument vom Inhaber lesen lassen und die Startmannschaft bestätigen oder ändern; Ergebnis als Entscheidung festhalten | `DECISIONS.md` (neuer Eintrag) | S | nur Inhaber; Eintrag durch koordinierende Sitzung | Entscheidung mit Datum steht |
| H-2 | 17 Fachfähigkeiten in `config/skills-register.json` eintragen und Pin mit Belegart „geprüfter Diff“ nachziehen; unabhängige Prüfung | `config/skills-register.json`, `config/policy-source-inventory.json` | M | Agent sofort | valides JSON; `make check`, `make governance-check` Exit 0; kein neuer roter Python-Test; Prüfbericht eines zweiten Agenten |
| H-3 | Hermes-Schritt 0 ausführen und Befund festhalten (nur lesen) | neu: `docs/04-betrieb/hermes-schritt-0-<Datum>.md` | S | Agent nach Zugang: Shell | Version, Commit, Modell, Abweichungen der `config.yaml` dokumentiert |
| H-4 | Rollenabbildung der 44 Rollen als maschinenlesbare Datei neben dem Katalog (Status, eigener Skill, Risikoklasse), ohne den Katalog zu ändern | neu: `config/integrations/rollen-ist-2026-11-14.json`, neu: `tools/check_rollen_ist.py`, `Makefile` (ein Aufruf) | M | Agent sofort | Prüfer bindet 44 Einträge und verbietet jeden Status außer „nur beschrieben“, solange `executorAssignment` leer ist |
| H-5 | Skill für die Rolle `triage` (Eingang einordnen, nichts senden) als Arbeitsanweisung | neu: `.claude/skills/nexify-anfragen-triage/SKILL.md`, `.claude/skills/README.md` | S | Agent sofort | Skill beschreibt Eingaben, Ausgaben, Grenzen und Beleg; in Hermes als `external` sichtbar erst nach Schritt 4 |
| H-6 | Skill für die Rolle `angebot` (Entwurf aus Katalog, Freigabe beim Inhaber) | neu: `.claude/skills/nexify-angebot-entwurf/SKILL.md` | S | Agent sofort, Inhalt Preisliste nur Inhaber | Skill verweist auf die freigegebene Preisquelle und verbietet neue Preise |
| H-7 | Routine „Wissensgraph aktuell halten“ und Graph in den übrigen Projekten | je Projekt im eigenen Repository; hier keine Datei | S je Projekt | Agent sofort, je Projekt | `make graph` je Projekt gemessen (Dauer, Knoten) |

`.claude/skills/README.md` führt ein Verzeichnis der Skills (IST, Zeilen 11 ff.). Damit sich H-5 und H-6 nicht überschneiden, trägt H-5 beide Zeilen dort ein; H-6 fasst die Datei nicht an.

## 10. Nicht geprüft

- Zustand auf dem Server (Version, Modell, Konfiguration von Hermes): keine Shell; Stand ist `docs/04-betrieb/server-befund-2026-11-14.md`.
- Ob die Skills der Bibliothek „small-business“ für die genannten Rollen taugen: keiner wurde ausgeführt.
- Ob der Website-Chat aus freigegebenen Quellen antwortet: nur die Route gelesen, kein Gespräch geführt.
- Inhalt der Entwürfe PR 121 (Agentenkern) und PR 124 (eigener MCP-Server).
- `docs/architecture/team-runtime-adaptation-20261101.md` (Rollenvertrag) wurde nicht vollständig gelesen.
