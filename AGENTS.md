# AGENTS.md · NeXify AI Gesamtlösung (Handoff an Codex)

Stand 2026-09-29 · Fassung 1.0 · Freigabe der Entscheidungen E1/E3/E4/E5/E6/E12 steht aus (siehe `docs/09-final/08-recht-und-compliance.md`).

## Aktuelle Führungsentscheidung · 13.11.2026

Entscheidung des Inhabers Pascal Courbois vom 13.11.2026: Führender Stand ist `main`
dieses Repositorys; ausgeliefert wird **ausschließlich über Vercel**. Produktion ist das
Vercel-Projekt `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665-ut7r`
(Team `nexify-projekte`), das `apps/web` und `apps/shop-api` aus `main` baut; Adresse
`https://nexify-ai-finales-agentur-gesamtpro-one.vercel.app`. Cloudflare wird als Hosting
nicht verfolgt; `apps/web/wrangler.jsonc` und `docs/deployment/cloudflare-workers.md`
sind eine ungenutzte Vorbereitung und kein Auftrag. Die Führungsentscheidung vom
04.11.2026 (ChatGPT-Sites-Stand) ist im widersprechenden Umfang historisch.

Stand 22.11.2026, 18:50 UTC (gemessen, lesend): Der Absatz „Stand 16.11.2026, 13:10 UTC“ unten ist
**HISTORIE**. `nexifyai.de` leitet per 301 auf `www.nexifyai.de` um; beide lösen auf Cloudflare-Adressen auf.
`https://www.nexifyai.de/.well-known/nexify-build.json` nennt `served_by: "cloudflare worker nexfiy-ai-studio (.de)"`,
Commit `6eb6273165` aus `main` von `nexfiy-ai-studio`, gebaut auf `srv1243952`, ausgeliefert 2026-11-22T13:18:38+01:00
(`tools/deploy-live.sh`, Betreiber: Hermes/NeX). Der Lovable-Zweig `lovable` ist damit nicht mehr der ausgelieferte Stand.
`/mcp` und `/.well-known/oauth-protected-resource` antworten auf dem neuen Stand mit 404. Ob dieser Wechsel als
Produktionsweg gilt, ist vom Inhaber in `DECISIONS.md` festzuhalten (OFFEN). Bis dahin bleibt D-021 formal
in Kraft; die Vercel-Aussagen in diesem Dokument (auch unter „Aktueller Gesamtauftrag“) beschreiben
nicht den gemessenen Stand.

Stand 16.11.2026, 13:10 UTC (Inhaberangabe im Chat, Pascal Courbois: „vercel ist auch raus“;
gemessen 13:05 UTC): `nexifyai.de` löst auf `185.158.133.1` auf und wird vom Lovable-Projekt
„Nexfiy Ai Studio“ (`dcb47f25-0aec-4b03-88b7-4b67f07d4a09`) ausgeliefert; `/.well-known/oauth-protected-resource`
nennt `resource_name: "Nexfiy Ai Studio"`. Die Aussage „ausgeliefert wird **ausschließlich über Vercel**“
und die Vercel-Angaben in diesem Abschnitt sind damit **HISTORIE**. Was `main` dieses Repositorys heute
noch für die Produktion bedeutet, ist OFFEN und vom Inhaber festzulegen; ein Eintrag in `DECISIONS.md`
steht aus. Nachweis: `docs/04-betrieb/oracle-autotasks-checkpoint-2026-11-16.md`, Abschnitt 10.

Stand 14.11.2026, 17:42 UTC: Der Satz „Cloudflare wird als Hosting nicht verfolgt“ und
die Einordnung „kein Auftrag“ sind HISTORIE, überholt durch D-021 in `DECISIONS.md`.
Vercel ist der heutige Auslieferungsweg und bleibt es, bis ein Umzug gemessen und vom
Inhaber abgenommen ist; der Umzug von `apps/web` auf Cloudflare ist nach D-021 in
Prüfung, nichts ist umgeschaltet, der Shop-Dienst bleibt vorerst auf Vercel. Daraus
folgt kein Auftrag, DNS, Produktion oder einen Tarif zu ändern (D-016, D-017).

Stand 13.11.2026 (HISTORIE, in Teilen überholt durch den Nachtrag vom 14.11.2026
direkt darunter): Die Domains
`nexifyai.de` und `nexifyai.cloud` zeigen per DNS nicht auf dieses Vercel-Projekt; die
Shop-API antwortet dort mit 503 (Laufzeit-Zugänge fehlen); Indexierung ist aus und das
Impressum hat keine bestätigten Anbieterangaben. Nachweis:
`docs/04-betrieb/befund-2026-11-13.md`.

Nachtrag 14.11.2026 (IST, gemessen 14.11.2026, 10:37 bis 10:43 UTC): `nexifyai.de`,
`www.nexifyai.de`, `nexifyai.cloud` und `www.nexifyai.cloud` antworten mit 200 von
Vercel und zeigen die Oberfläche aus `apps/web` mit den Änderungen vom 14.11.2026;
ausliefernd ist laut `docs/deployment/environment-variables.md` Abschnitt 6 das Projekt
`…-ut7r` (`prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR`). Der Satz zu DNS oben ist damit überholt. Offen und nicht als erledigt zu
behandeln: Die Shop-API antwortet in Produktion mit 503 `project_binding_unverified`
(Sortiment, Warenkorb und Kasse ohne Funktion); die Indexierung ist aus
(`noindex, nofollow`); das Impressum trägt seit PR 102 Anbieterangaben nach Angabe des
Inhabers, `apps/site/src/Auth.tsx` nennt aber weiter „B.V.“, die Rechtsform ist damit
nicht widerspruchsfrei belegt. Messwerte und Quellen: `PROGRESS.md`, Abschnitt
„Stand 14.11.2026“.

## Inhaberentscheidungen · 14.11.2026

Maßgeblich sind die Einträge D-011 bis D-018 in `DECISIONS.md`; sie werden hier nicht
wiederholt. Für die Arbeit in diesem Repository folgt daraus:

- Die Startseite ist die einzige fertige Referenz. Neue Seiten und Abschnitte in
  `apps/web` entstehen nach `.claude/skills/nexify-klon-fabrik/SKILL.md`; vor jeder
  Auslieferung laufen `tools/gleichmacher.mjs` und `tools/live-check.mjs` (siehe
  „Verification“).
- Zielbild der Datenhaltung ist die eigene, selbst gehostete Supabase-Instanz
  (PostgreSQL mit RLS), auch für den Shop (D-013). MongoDB-Aussagen in diesem
  Repository beschreiben den IST von `apps/shop-api` und sind als Zielbild überholt.
- Der sichtbare Produktname ist „NeX AIFly Suite“ (D-011). „NeX2fly“ in älteren
  Abschnitten und Dokumenten ist Historie; IDs und die Adresse `/produkte/nex2fly`
  bleiben.
- Führende Dokumente nach jedem Merge und jeder Inhaberentscheidung nachführen:
  `.claude/skills/nexify-stand-halten/SKILL.md`.
- Der Wissensgraph (Graphify) wird in jedem Projekt eingesetzt, je Projekt getrennt
  (D-018). Vor dem Einzellesen vieler Dateien und vor jeder Änderung an einem gemeinsam
  genutzten Baustein den Graphen befragen: `.claude/skills/nexify-graph/SKILL.md`
  (`make graph`, `tools/graph.sh`). Der Graph ersetzt keine Prüfung und kein Gate.
- Kundenprojekte werden in eigenen Repositories und eigenen Sitzungen bearbeitet.
  Kundendaten und Einzelheiten zu Vorfällen gehören nicht in dieses Repository; hier
  steht höchstens ein Verweis (`PROGRESS.md`, „Offene Arbeiten“).
- Aktueller Stand, offene Entwürfe und was beim Inhaber liegt: `PROGRESS.md`, oberster
  Abschnitt und „Offene Arbeiten“. Dort nachlesen, bevor eine Arbeit begonnen wird, die
  ein anderer Zweig schon trägt.

## Frühere Führungsentscheidung · 04.11.2026

Die ausdrückliche Nutzerentscheidung führt diese Website als Arbeits-, Gestaltungs-
und Migrationsstand: https://nexify-ai-factory-20261101.workspace-vo-0220.chatgpt.site/,
Sites-Projekt `appgprj_6ae7ad63df2081918a843f996caf9422`. Ältere Vercel-/Backup-
Prioritäten unten sind im widersprechenden Umfang historisch; bestehende Domains,
Daten und Laufzeiten bleiben bis zum jeweils geprüften Übergang erhalten.
Keinen zweiten Writer, blindes Spiegeln oder ungeprüften Runtimewechsel starten.
Der bestehende Gesamtauftrag P01–P26 im `requirements_reconciliation`-Register
von `config/acceptance-coverage.json` bleibt führend. Neue Details und Nachweise
unter derselben Auftragsbindung nachführen; keine zweite Aufgabenverwaltung.

Der Home-Hero MUSS die vorgegebene Videoaufnahme liefern; Standbilder oder
CSS-Figuren ersetzen diesen Lieferumfang nicht. Die drei Medien darunter bleiben
Glasbilder. Neueste konkrete Regie und Produktionsstatus stehen in
`docs/production/hero-requirements-2026-11-04.md`. Vorhandene Originale erhalten,
Pascal unverfremdet, NeX als Tukan, Oracle glatt mit Hut/Monokel und ohne Fell.
Abo-Medien in Higgsfield zuerst wiederverwenden; notwendige Produktion nur im
vorhandenen Guthaben ohne Aufladung/Neutarif. Keine automatische Gesamtabnahme
oder Daten-/Rechtefreigabe aus dieser Führungsentscheidung ableiten.

## Aktuelle Führungsentscheidung · 10.11.2026 — Umsatz zuerst, Umsetzung statt Stillstand

Die neueste ausdrückliche Unternehmerweisung präzisiert die Arbeitsreihenfolge
für sämtliche bestehenden autorisierten NeXify-Aufträge:
**kritische Daten-/Betriebsrisiken sichern → eigene NeXify-Seite öffentlich
verkaufsfähig machen → echte Leads und Umsatzwege herstellen → bestehende
Kundenprojekte abnahme- und abrechnungsfähig fertigstellen → wirtschaftlichen
Dauerbetrieb stabilisieren und skalieren.** Aufgaben nach konkreter Wirkung,
Risiko, Frist, Kosten und Abhängigkeiten priorisieren; unabhängige Teilaufgaben
parallel ausführen.

Die ältere Aussage weiter unten »Erst das Gesamtsystem fertigstellen;
Marketing, Mailings und eigene Social-Kanäle danach aktivieren« gilt insoweit
nicht mehr: rechtmäßige Akquise, passende Inhalte, Mailings und CRM-/Leadwege
dürfen und sollen innerhalb bestehender Rechte bereits **parallel** zur noch
offenen technischen Gesamtfertigstellung ausgeführt werden. Für Werbeversand
gelten die jeweils anwendbaren gesetzlichen Voraussetzungen, Opt-out,
Suppression und Datenschutz. Die Unternehmerweisung ersetzt keine zwingenden
Sicherheits-, Preis-, Zahlungs-, Vertrags-, Datenschutz-, Mandanten- oder
technischen Releasegates. Ungelöste Gate-Konflikte versioniert dokumentieren,
die betroffene Wirkung nicht ungeprüft freischalten, andere Arbeiten fortsetzen.

**Jede autorisierte Aufgabe ist im Regelfall ein Ausführungsauftrag:**
bestehenden IST messen → kleinsten sicheren nutzbaren Schritt implementieren →
prüfen, integrieren, rücklesen und dokumentieren. Ältere P01–P26-Aufträge und
der führende Aufgaben-/Projektzustand bleiben erhalten, keine Parallelregister
oder neue Gesamtplattform schaffen. AIfly ORACLE koordiniert; Codex/Work und
tatsächlich verbundene Agenten führen innerhalb ihrer eigenen berechtigten
Runtime aus. Ein Prompt beweist keinen laufenden Agenten, ein grüner Build
keinen Livegang und eine Rechnung keinen Zahlungseingang.

## Zielvollständigkeit, Agenten- und Entscheidungsketten · 10.11.2026

Eine Nutzeranforderung beschreibt ein **Geschäftsziel**, nicht automatisch alle
technisch notwendigen Teilschritte. Der Nutzer muss fehlende Integrationen,
Abhängigkeiten, Agentenrollen, Entscheidungswege, Fehlerfälle, Quality-Gates,
Betriebsaufgaben oder Vorbedingungen nicht selbst aufzählen.

Für neue und historisch offene Ziele den bestehenden Workflow
`WF-NEXIFY-CONTEXT-DELIVERY` zusammen mit
`docs/automation/intent-closure-contract.md` verwenden:
**Ziel/Ergebnis → explizite Anforderungen → notwendig abgeleitete Voraussetzungen
und Folgeprozesse → Abhängigkeits-/Entscheidungsgraph → zuständiger Writer →
wirkliche Implementierung → Tests/Readback → Betrieb/Monitoring/Recovery.**

In bestehenden Quellen, Tasks und Agentenketten fehlende Voraussetzungsknoten,
Folgeaktionen, Zuständigkeiten, zulässige Alternativen und Automatisierungen
erkennen, mit Quelle/Begründung nachführen und innerhalb gültiger Befugnisse
tatsächlich umsetzen. Explizite Pflicht, notwendige Ableitung, optionale Idee
und unbestätigte Annahme getrennt dokumentieren. Für jeden Eingriff Tenant,
Owner, Lease, einmaligen Writer, echte Berechtigung, Wiederholungsschutz,
Prüfer, Kosten, Rückweg und dauerhafte Ergebnisprüfung berücksichtigen.

**Bei jeder tatsächlichen Aktivierung** den aktuellen Auftrag zuerst bearbeiten
und danach alle übrigen offenen Vorgänge anhand persistenter Cursor und
Ereignisstände prüfen; keine unendlichen Vollscans, Selbstauslöser oder
Doppelvergabe. Fehlende technische Rechte, aktuelle Produktfreigaben oder
Schutzvorgaben nicht per Text übergehen. Eine verfasste Kette ist kein
installierter Worker. Bestehende manuelle und neue sinnvolle Prozesse erkennen,
bauen, pflegen und im laufenden Betrieb prüfen.

## Werkzeuge bereitstellen statt wirtschaftlichen Stillstand hinnehmen · 10.11.2026

Fehlende CLI, Plugins, SDKs, Browser-/Testwerkzeuge, OSS-Worker, MCP-Adapter,
Automations- oder Monitoringkomponenten sind **fehlende Implementierungsschritte**,
kein Abschlussgrund. Erst tatsächlich vorhandene Fähigkeiten, projektbezogene
Skills und eingebundene Tools prüfen. Reicht dies nicht, geeignete
aktuell gepflegte kostenlose/Open-Source-Lösungen anhand von Lizenz,
Sicherheits-/Tenantgrenzen, Version, Abhängigkeiten, Hostinger-Kapazität und
Gesamtbetriebskosten auswählen. Innerhalb bestehender technischer Rechte
eigenständig installieren, konfigurieren, an den tatsächlichen Fachprozess
anschließen, Unit-/Integrations-/E2E-/Restart-/Fehlerproben ausführen und
Version, Owner, Monitoring, Wartung, Rückweg und Ergebnisreadback dokumentieren.

Keine wirtschaftlich sinnvolle zulässige Umsetzung allein wegen fehlenden
kostenlosen Standardwerkzeugs stehen lassen. Bei fehlender Pluginverbindung,
interaktiver OAuth-Einwilligung, Systemrechten oder anderen Hartsperren
zuerst funktional gleichwertige vorhandene autorisierte lokale/Cloud-/
API-/MCP-Wege versuchen; nur die konkret gesperrte Wirkung als OFFEN
mit notwendigem einmaligem Zugriffsschritt nachweisen. Ansonsten
unabhängige Arbeiten fortsetzen. Keine eigenmächtige Rechte-/Passwortänderung,
Zahlung/Neuverpflichtung oder endgültige Löschung; kein Plattform-/
Sicherheitsgate umgehen. Hohe Speicherlast und ausgefallene Dienste auf den
Hostinger-Servern beachten: nicht wahllos neue dauerhafte Prozesse installieren.
Installation und Dokumentation sind erst nach tatsächlicher Funktion und
Runbook/Watchdog/Recovery-Prüfung als erledigt zu kennzeichnen.

## Dauerhafte GOAL-Bindung für alle Chats und sichere Lauf-Fortsetzung · 10.11.2026

Alle autorisierten NeXify-Arbeitschats und tatsächlich laufenden Work-/Codex-
Agentenketten mit einem **einzigen führenden GOAL und Taskregister** verbinden.
Besonders die getrennten Projekte **NeXify Site Erstellung** und
**Studienkolleg Aachen** nach
`docs/automation/chat-goal-continuity-2026-11-10.md` führen.
Ein Chat-Navigationslink ist kein Schreibrecht in den Originalchat;
jede reale Zustellung und Wiederaufnahme muss mit echter Identität und
Readback geprüft werden. Keine neuen Doppelregister, keine Agenten-Echos,
ein Writer und ein klarer Tenant pro Änderung.

Bei **jeder Aktivierung**, aus welchem zulässigen Kanal auch immer, zuerst den
auslösenden Auftrag und danach **systemweit** die übrigen offenen, verwaisten,
überfälligen und aus alten GOALs abgeleiteten Aufgaben inkrementell prüfen.
VOR JEDEM LAUFENDE den `NEXIFY-RUN-FINALIZER-20261110` ausführen:
aktuellen Checkpoint sicher persistieren, exakten Task-/Worker-/Lease-State
zurücklesen, nächste zulässige Arbeit und *tatsächlichen* Auslöser festlegen,
Scheduler-/Eventsubscription-/Watchdog-/Rückkanal-Verfügbarkeit prüfen,
`next_run`, Owner, Frist und Alternativweg im bestehenden Register sichern.
Ein geplantes Datum ohne überprüfbaren ausführbaren Mechanismus ist kein
Wiederanlaufnachweis. Verpasste Trigger oder fehlende ACKs als Incident
behandeln, datenerhaltend und idempotent reparieren; keine blinden Retry-
oder Selbsttrigger-Schleifen. Persönliche Dot-/Admin-Pausen nie umgehen.
Ein echtes mehrmals stündliches Intervall braucht einen verifiziert laufenden
externen Hostinger-Scheduler, nicht nur eine ChatGPT-Regel.

Alle fehlenden technisch notwendigen und wirtschaftlich sinnvollen
Abhängigkeiten, Tools, API-/MCP-Adapter, Agenten- und Entscheidungsketten
selbständig erkennen und – soweit rechtlich sowie technisch autorisiert –
**installieren, implementieren, testen und betreiben**. Vorhandene Werkzeuge,
aktuelle OSS-Lizenzen, Ressourcenkapazität und TCO prüfen. Jede Änderung
muss nötige Cronjobs, Timer, Skills, Runbooks, CI-/Brandregeln und Monitoring
mit aktualisieren; Livewirkung und Wiederanlauf unabhängig prüfen. Nicht nur
die wörtliche Teilanforderung erledigen, sondern den gesamten fachlichen
End-to-End-Geschäftsweg.

## Auftrag
Baue aus den HTML-Referenzen in `prototypen/` (`*.dc.html`) das Produkt. **Die Referenzen sind Design und Verhalten, kein Produktionscode.** Nicht kopieren, nachbauen. Sprache der Oberfläche: Deutsch (Quelle), Niederländisch und Französisch für Kopf/Fuß und Markt-Seiten.

## Aktueller Gesamtauftrag und kanonische Quelle · 26.10.2026

Der Nutzer bestimmt `nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` als gemeinsames Repository des Gesamtsystems. Neue Anwendungen, Regeln, Integrationsverträge, REA-Anbindung und Small-Business-Zuordnungen hier führen. Bestehende Quellstände und Herkunft bei der Konsolidierung bewahren; weder Force-Push noch Löschung der Ausgangsrepositories. GitHub ist die kanonische Quelle; eine bestätigte lokale GitLab-Anbindung ist nachgelagerte CI/Spiegelung mit Fast-forward, keine zweite Schreibquelle. Historische Mirror-/Watcher-/Factory-Skripte nicht ungeprüft starten.

Zielaufbau nach Nutzerpräzisierung: portable React/Vite-/TypeScript-Ausgabe unter `apps/site` für öffentlichen Webauftritt und native NeX Agentic AIFly-Seitenleiste; die bestehende Next-/Clerk-Ausgabe unter `apps/web` bleibt als Referenz erhalten. Vercel ist Hauptbetrieb und nach aktueller Nutzerbestätigung die verbindliche Live-Vorschau. Eine ChatGPT-Backupausgabe war zuvor gewünscht; ihre fehlende Deploymentfähigkeit ist kein Blocker des aktuellen Veröffentlichungswegs. Neue Ergebnisse als direkten Vercel-Link liefern, nicht als ChatGPT-Bildausgabe. Bestehende `.cloud`-Seite bis Fertigstellung erhalten; eigene Agentur- und TEILEKLAR-Funktionen mit klaren Anwendungskontexten. Affilinet Portal Aachen ist ein gesondertes, pausiertes Kundenprojekt und kein Agenturmodul, keine Lieferabhängigkeit und kein zu migrierender Datenbestand. Die Seitenarchitektur umfasst die eigenen TEILEKLAR-, Werkstatt-/Partner-/Kunden-/Affiliatebereiche. Zielmarkt: 90 Prozent Deutschland als Nutzerziel, kein behaupteter Analyticswert. Einheitliche deutsche Ansprache, passende Folgeseiten und überprüfte Verlinkungen; NL-/FR-Schlüsselsätze erhalten. Unterschiedliche Domains, Rollen oder Mandanten nicht durch einen gemeinsamen Cookie oder Clientclaim gleichsetzen.

Quellen vor jeder Wiederverwendung fachlich zuordnen: `config/source-boundaries.json` und `docs/architecture/0011-source-and-customer-boundaries.md`. Fertige Komponenten aus allen autorisierten Repositories gezielt nutzen, mit Quelle/Commit/Dateien, Zweck, Lizenzgrundlage, Anpassung und Tests. Keine pauschalen Projekt-/Historienimporte, keine Übernahme von Kundendaten, Secrets, Branding oder Kundenkonfiguration. Ähnliche Namen oder Funktionen begründen weder gemeinsame Produkte noch SSO oder eine Datenmigration. Der verworfene lokale Zweig `factory/monorepo-autonomy-2026-10-26` enthält den irrtümlichen Kundenimport und darf nicht als Agenturstand gepusht oder zurückgemergt werden.

Der Nutzer hat Implementierung und Erstellung fehlender Hero-Clips beauftragt. Diese allgemeine Freigabe nicht erneut verlangen. Konkrete Zahlungs-/Versand-/Produktiv-/Rechtsvoraussetzungen bleiben an die einzelne Aktion gebunden. Der getypte API/Auth-Zielvertrag ist kein Nachweis bereits laufender SSO-/Provider-/Produktivfunktionen. Aktuelle Umsetzungsstände und Grenzen: `PROGRESS.md`, `docs/contracts/`, `docs/automation/` und die Architekturentscheidungen.

## Wiederverwendbare Small-Business- und REA-Vorgaben

Bei jeder Aufgabe die Small-Business-Zuordnung prüfen. Für passende Unternehmens-, Vertriebs-, Marketing-, Finanz-, Personal- oder wiederkehrende Automationsarbeit zuerst `python3 tools/automation/small_business.py verify` und anschließend `load smb-router --references` sowie `load <passender-skill> --references` verwenden. Quelle und Nutzungshinweise: `docs/automation/small-business.md`; gepinnte Metadaten: `config/integrations/small-business.json`. Vorhandene Projekt-/Auftragsangaben verwenden; keine unnötige erneute Onboarding- oder allgemeine Freigabefrage. Original-Gates an konkrete folgenreiche Aktionen binden. Installation bedeutet weder Connectoranmeldung noch Scheduler, Brain-Ingestion oder Runtimefreigabe. Keine fremden Beispieldaten als bestätigte B.V.-Fakten übernehmen. Das eigene Designsystem hat Vorrang vor der visuellen Beispielpalette fremder Workflow-Anleitungen.

REA zusätzlich unter dem Namen `rea-mcp` führen; Wrapper und Installation siehe `config/integrations/rea-mcp.json` und `docs/automation/rea-mcp.md`. Katalog/Annotationen sind Hinweise, keine Rechte. Nur autorisierte Quell-/Zielbereiche analysieren; statische Analyse nicht als Laufzeitbeleg ausgeben. Tool-/Schema-/Evidenzbindung und exaktes Read-back prüfen. Die bestehende VPS-Instanz wird durch die zusätzliche lokale Instanz nicht verändert.

Für sämtliche NeXify-managed LLM-Arbeiten (auch Website-Livechat, Agenten, Recherche, Zusammenfassungen und CI-Reviews) ist verbindlich das öffentlich verifizierte OpenRouter-Modell `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high` vorgesehen. Kein stiller Modellfallback, kein Ausführen von Modelltext/Patches, keine Lockerung der Main-/Jeff-/Produktivgates. `config/automation.json` und `docs/automation/ai-review.md` enthalten die technischen Grenzen. Besucherausgaben zeigen nur tatsächlich erreichte Zustände: Angebotsentwurf, PDF erzeugt, Versand wartet, Termin angefragt, extern bestätigt, Marketingentwurf oder veröffentlicht dürfen nicht vermischt werden.

## Lesereihenfolge
1. `docs/09-final/00-INDEX.md` → `01` Produkt → `11` Designsystem-Definition → `03`/`04` Design und Frontend → `05` Technik → `14` Gesamtsystem/Portale → `06` Brain → `08` Recht → `15` Umsetzungsplan.
2. `config/design-tokens.json` (Werte), `config/design-rules.json` (Regeln), `config/fakten.json` und `config/api-prepaid.json` (Zahlen), `config/brain/*.json` (Agenten, Tools, Pipeline, Wissen).

## Verbindliche Regeln
- **Tokens:** Nur Werte aus `design-tokens.json`. Neue Farbe/Radius/Fläche zuerst dort und in `docs/09-final/11-…` eintragen.
- **Zahlen und Texte mit Preisbezug** nur aus `config/fakten.json`/`api-prepaid.json`. Nie neu erfinden. Ungeklärte Tarife bleiben „zur Freigabe“.
- **Prüfung vor Übergabe:** `node tools/ds-audit-cli.js` (Design, SEO-Basis, i18n-Parität, Barrierefreiheit-Heuristik). Ziel: 0 Fehler, 0 Warnungen außerhalb dokumentierter Ausnahmen (`config/abweichungen.json`).
- **Barrierefreiheit:** WCAG 2.2 AA, Ziele ≥ 44 px, sichtbarer Fokus (2 px Lime), Reduced-Motion.
- **i18n:** de/nl/fr, identischer Schlüsselsatz; Zahlenformat folgt der Textsprache; Preise/Steuer/Rechtstexte folgen dem Markt.
- **Recht:** Texte sind Entwurf 0.9. Nichts als Rechtsberatung ausgeben; Button-Lösung (§ 312j BGB), KI-Kennzeichnung (Art. 50 KI-VO), Widerruf 14 Tage (B2C).
- **Sicherheit:** Mandantentrennung per RLS, Idempotenz auf allen Buchungen, Geheimnisse nie im Code, Hartsperren im Gateway (`config/brain/agents.json`).
- **Ehrlich bleiben:** Referenzen, Logos, Zitate, Messwerte werden nicht erfunden. Beispiele sind gekennzeichnet.

## Stack-Empfehlung
Next.js/React + TypeScript · PostgreSQL (Frankfurt) mit Row-Level-Security · OpenAI-kompatibles Gateway (`api.nexifyai.cloud/v1`) · Revolut Merchant API (Sandbox → Produktion getrennt) · selbst gehostete Schriften (Geist, Geist Mono). Details `docs/09-final/05-technische-spezifikation.md`.

## Phasen (Abnahme je Phase mit Nachweis)
Siehe `docs/09-final/15-umsetzungsplan-codex.md`: P0 Fundament → P1 Marke/Bausteine → P2 Öffentliche Seiten → P3 Konto/Portale → P4 API/Ledger → P5 Shop → P6 Workspace/Brain → P7 Recht/SEO/Betrieb.

## Repository-Vorschlag
```
apps/web            Next.js (öffentlich + Portale)
apps/gateway        API-Gateway (Auth, Ledger, Router)
packages/tokens     aus config/design-tokens.json generiert
packages/ui         Komponenten (Header, Footer, Karte, Well, Button, …)
packages/i18n       de/nl/fr Wörterbücher
packages/rules      design-rules + ds-audit
infra/              OpenTofu, CI
docs/               übernommen aus docs/09-final
```

## Nicht tun
Keine Abrechnung/Rechnungslauf vor Entscheidung E1/E3/E4. Kein Livegang ohne Freigabe-Gate (`docs/09-final/07`, Abschnitt Gate). Keine automatische Übersetzung von Rechtstexten. Keine Änderung an Preisen ohne Freigabe von Pascal Courbois.

## Kontakt
Pascal Courbois · mail@nexifyai.cloud (Firmendaten in `docs/09-final/08` bitte bestätigen lassen).

---

## Verification (verbindlich)

- `make check` — Design-/Marken-/A11y-Audit (`node tools/ds-audit-cli.js`), Ziel 0 Fehler/0 Warnungen außer dokumentierter Ausnahmen.
- `make test` — Audit + Python-Tests (`python3 -m unittest discover -s tests`) + Artefakt-/Config-Integrität.
- `make build` — Prototypen-Manifest (`sha256sum -c`) + `config/*.json` valide.
- `make e2e` — vollständige Prüfkette (Audit + Tests + Artefakt-/Config-Integrität).
- `make check-arch` — Architektur-Regeln (`.harness/arch-rules.json`); `make clean-check` — Sauber-Zustand.
- `node tools/gleichmacher.mjs [basis-url] [--breiten=390,1440]` — misst jede Seite im echten Browser gegen die Startseite (D-012). Pflicht vor jeder Auslieferung von `apps/web`, Ziel 0 Abweichungen; Exit 1 bei Abweichung. Nur lesend, braucht Playwright. Ein Befund wird an der Ursache behoben, nicht im Prüfskript.
- `node tools/live-check.mjs [basis-url]` — Live-Prüfung aller verlinkten Seiten einschließlich Shop-Dienst (Standard `https://nexifyai.de`). Pflicht vor jeder Auslieferung gegen den lokalen Build und danach gegen die Produktion; Exit 1 bei Befund. Nur lesend, braucht Playwright. Ein grüner Lauf ist keine Gesamtabnahme.
Vor jeder Abschlussmeldung `make check && make test`.

## Constraints (MUST / MUST NOT)

- MUST: Designwerte nur aus `config/design-tokens.json`; Zahlen mit Preisbezug nur aus `config/fakten.json`/`config/api-prepaid.json`. `# source: AGENTS.md Verbindliche Regeln`
- MUST NOT: Preise/Rechtstexte ohne Freigabe (Pascal Courbois) ändern; keine Abrechnung/Rechnungslauf vor E1/E3/E4. `# why: Freigabevorbehalt`
- MUST NOT: Prototypen (`prototypen/*.dc.html`) kopieren — sie sind Referenz, nicht Produktionscode; Manifest bleibt unverändert. `# source: Auftrag`
- MUST: Barrierefreiheit WCAG 2.2 AA, Ziele ≥44 px, sichtbarer Fokus, Reduced-Motion. `# source: AGENTS.md`
- MUST: i18n de/nl/fr mit identischem Schlüsselsatz; Preise/Steuer/Recht folgen dem Markt. `# source: AGENTS.md`
- MUST NOT: erfundene Referenzen, Logos, Zitate oder Messwerte. `# source: Ehrlich bleiben`

## State files

- `PROGRESS.md` — Current State (Commit + Prüfstatus), In Progress, Next Steps, Blockers.
- `feature_list.json` — Features mit `id`, `behavior`, `verification`, `state`, `evidence`, `layers`.
- `DECISIONS.md` — Architektur-/Prozessentscheidungen. `config/system-inventar.json` — Systeminventar.
- `docs/quality-document.md` — Modulnoten; `prototypen/lib/ARCHITECTURE.md` — Modulgrenzen.

## Zustandsmaschine + WIP

- Zustand je Feature: `not_started → active → passing`. Wechsel nur über `make verify-feature F=<id>`; **niemals** `state` direkt auf `passing` setzen.
- **WIP=1:** höchstens ein Feature `active`. Granularität: ein Feature muss in einer Sitzung abschließbar sein (completable in one session) — sonst aufteilen.
- `make vcr` zeigt passing/aktivierte Features (Ziel 1.0).

## Definition of Done (drei Schichten)

Fertig ist, was **Laufzeit-Evidenz** hat — nicht was geschrieben oder behauptet ist.
- Layer 1 (Syntax/Statik): JSON valide, `node --check`, `make check`.
- Layer 2 (Verhalten): `make test` (Audit + Tests + Integrität).
- Layer 3 (System/E2E): `make e2e` — **Layer 3 (e2e) is required when changes cross component or domain boundaries** (Tokens, i18n, Config, Prototypen).
- Reihenfolge: Do not proceed to Layer N+1 if Layer N fails (must pass in order). Laufzeitsignale: Audit 0 Fehler, Manifest unverändert, keine debug artifacts.

## Architecture boundaries

`config/` (Werte/Regeln) → `packages/*` (generiert/abgeleitet) → `apps/*` (Anwendung) → `docs/` (Doku).
`make check-arch` erzwingt die Grenzen (WHAT/WHY/FIX).
Promotion-Prinzip: **jede im Review gefundene Fehlerkategorie wird zu einer Regel in `.harness/arch-rules.json`.**

## Observability

- Vor jedem Feature: Sprint-Contract (`templates/sprint-contract.md`).
- Während der Verifikation: `make session-start` / `make session-end` schreiben JSONL nach `.harness/traces/`.
- Nach Abschluss: Bewertung gegen `templates/evaluator-rubric.md` — jede Dimension mindestens B.

## Clock-in / Clock-out

- **Clock-in:** `PROGRESS.md` + Lesereihenfolge oben befolgen, `make check` grün bestätigen, dann arbeiten.
- **Clock-out:** `PROGRESS.md` aktualisieren (Current State + Next Steps), `make clean-check`, dann committen.
- **Clean-State:** `make clean-check` (Audit, Tests, Manifest, Feature-Liste, PROGRESS, Debug-Reste). Dual-Mode: sofort beim Sitzungsende **plus** periodischer Voll-Sweep gegen Struktur-Drift.

## Commits und Dokumentation

- **Atomicität:** ein logischer Vorgang pro Commit; das Repo ist nach jedem Commit konsistent.
- **Commit-Nachricht:** das *Warum* erklären (explain why), nicht nur das Was (not just what).
- **Keine veralteten Docs (no stale documentation):** Doku im *same commit* wie die Änderung aktualisieren.
- **Kein überstürztes Fertigmelden (do not rush, running low on context):** bei knappem Kontext stoppen, `PROGRESS.md` aktualisieren, sauberen Checkpoint committen.

## Company-Status

- `make company-status` bzw. `node tools/company-status.mjs` erzeugt `docs/COMPANY-STATUS.md` +
  `evidence/company-status.json`: Harness-Stand aller Company-Repos, Dienstelage der Gesundheitspruefung,
  offene Blocker (nexi2fyi) und offene Defekte. Reiner Report — die Gates bleiben in den Repos.

## Tools / MCP

- Zugriff auf `node`, `python3`, `bash`; Tool-Geltung in `.claude/settings.json`.
- `tools/inhaltsabgleich.js` prüft Fakten-Konsistenz, erwartet aber das Herkunfts-Layout (api/, lib/, Prototypen im Root) — in diesem Repo derzeit **nicht lauffähig** (siehe `PROGRESS.md`, offener Punkt).


## Vercel-Einrichtung und projektbezogene Plattform-Skills

Stand 14.11.2026: Die beiden folgenden Sätze sind HISTORIE. Produktion ist seit der
Führungsentscheidung vom 13.11.2026 das Projekt `…-ut7r` (Team `nexify-projekte`), und
`.de` wie `.cloud` werden von dort ausgeliefert (Nachtrag 14.11.2026 oben).
`prj_Po7jl…` bleibt die Bindung der Shop-API, solange `SHOP_ALLOWED_PROJECT_IDS` nicht
gesetzt ist (`docs/deployment/environment-variables.md` Abschnitt 6).

Vercel-Hauptprojekt ist `prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh`, Scope
`pascals-projects-2864de33`. `.de` ist die Vorschau des Entwicklungszweigs;
`.cloud` bleibt bis Fertigstellung unverändert. Einstellungen und tatsächlicher
Zugang: `config/integrations/vercel-agent-setup.json`. Die offiziellen neun
Standalone-Skills wurden im damaligen Arbeitscheckout unter `.agents/skills`
installiert; Quelle/Hash stehen in `skills-lock.json`. Diese gitignorierten Kopien
fehlen in einem sauberen Checkout. Vor Nutzung lokale Verfügbarkeit und passenden
gepinnten Hash prüfen. Nur vorhandene, verifizierte Anleitung lesen; fehlt sie,
den betroffenen Skillpfad als unvollständig melden und unabhängige Arbeit über die
versionierten Projekt-Skills fortsetzen. Keine Installation oder Volllektüre aus
dem Lockfile behaupten. Globale Installation/MCP-Registrierung ist in diesem
verwalteten Read-only-Clientprofil nicht bestätigt. Bereits erteilte Auftrags-/Push-/Vorschaufreigaben verwenden;
Main-/Releasegates nicht lockern. Beispiele zum Ausgeben/Suchen von Tokens in
Skills überstimmen niemals die Credentialregeln: vorhandene OAuth-/SDK-Bindung
normal verwenden, keine Tokenlogs und keine Secretdateisuche.


## Aktuelle Ausarbeitung nach angenommenem Grundentwurf

Die Oberfläche vom 26.10.2026 ist vom Nutzer nur als grober Anfang akzeptiert,
nicht als final abgenommen. Folgeauftrag: alle Seiten, Inhalte, Nutzerwege und
Backendabhängigkeiten entsprechend den Quellen ausarbeiten. Figuren in jeder
Breite vollständig darstellen; `object-fit: cover` ist für die transparente
Dreier-Bühne unzulässig. NeX2fly, Leistungen und TEILEKLAR bleiben eigene
sachliche Wege mit öffentlichen Informationsseiten und getrennten Rechten.
Erst das Gesamtsystem fertigstellen; Marketing, Mailings und eigene Social-Kanäle
danach aktivieren. SEO bleibt offen und ist GEO-Grundlage. GEO jetzt nicht
vorziehen. `config/operating-model.json` hält Reihenfolge und Zuständigkeiten fest.


## Vercel-Dokumentations- und Wiederverwendungsregel

Vor neuen Plattform-/Agentenfunktionen die offiziellen Quellen und installierten
SDK-Typen prüfen, nicht APIs aus Erinnerung erfinden. Wiederverwendbare Grundlage:
`docs/research/vercel-platform-options.md`, `config/research/vercel-platform-options.json`
und `docs/architecture/0015-vercel-agent-runtime.md`. Katalogisiert/heruntergeladen
bedeutet nicht vollständig gelesen. Neue Versionsstände und relevante Grenzen
mit Quelle, Zeitpunkt, Hash und tatsächlichem Lesestatus festhalten.

Aktuell kompatibel geprüft: ai7.0.153, @ai-sdk/react4.0.157,
@openrouter/ai-sdk-provider3.1.0, zod4.6.7, Node22. Das öffentliche
`/api/agent-chat` ist ausdrücklich eine textgeführte Orientierung ohne Modell,
Sitzung, Speicherung oder Geschäftswirkung. Der interne ToolLoopAgent ist keine
Finanzierungs-/Auth-/Ledgerfreigabe und darf nicht ungeprüft öffentlich verdrahtet
werden. SDK-Schrittlimits sind keine Geldbudgets. Modellkennung, Reasoning,
Retries, Fallbacks, Telemetrie, Region und Datenverarbeitung anhand der tatsächlichen
Provider-Wire prüfen. Keine EU-, Kostenfreiheits- oder Vollständigkeitsbehauptung
aus einem Produktnamen ableiten. Tests mit echten SDK-Protokollen und Mockmodell/
Fakefetch ausführen; bezahlte Aufrufe bleiben konkret autorisiert und finanziert.


## Unverlierbare Modellvorgabe · aktuelle Nutzerweisung

Kanonische, maschinenprüfbare Quelle ist `config/llm-policy.json`: exakt
`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`. Die Endung **1017** ist
zwingend. Keine andere DeepSeek-Version, keine andere Modellfamilie, kein
Reasoning-Downgrade, kein stilles Tier-/Providerfallback. Gilt für sämtliche
vom Repository kontrollierten NeXify-managed LLM-Aufrufe, einschließlich
öffentlichem Website-Livechat, Agenten, Recherche, Verdichtung und CI-Review.
Der finale Providerrequest muss diese Bindung nach allen SDK-Merges einhalten.
Eine vorhandene Modellkonfiguration bedeutet noch keine Kosten-, Rechte- oder
Livefreigabe. Die textgeführte Chatvorschau ist ausdrücklich nur ein Zwischenstand
und erfüllt den geforderten Live-KI-Chat noch nicht. Fremde Hostingmodelle dieser
ChatGPT-Sitzung werden durch eine Repositorydatei nicht umgeschaltet.

## Kontext, eigene Skills und aktive Lückenbehebung

Vor mehrstufiger Arbeit `python3 tools/project_skills.py verify` ausführen und
`skills/nexify-governed-delivery/SKILL.md` sowie fachlich passende eigene Skills
aus `config/project-skills.json` lesen. Diese Quellen gelten auch dann, wenn
ein Host die lokalen Skillkopien nicht automatisch lädt. Die Quellen ergänzen
die bestehenden offiziellen Skills, ohne deren Originaldateien zu verändern.
`python3 tools/context_executor.py --task "<konkrete Aufgabe>"` liefert begrenzte,
quellengebundene Auswahl; Status `partial` und ausgelassene Quellen beachten.
Auswahl oder Import ist keine vollständige Verarbeitung aller historischen Daten.

Fehlende Voraussetzungen stoppen nur ihre betroffene Wirkung und erzeugen einen
konkreten Behebungsauftrag mit Zuständigkeit, nächstem Schritt, Fälligkeit,
Quellenstand und erneutem Nachweischeck. Sofort innerhalb vorhandener Rechte
beheben; unabhängige Arbeiten weiterführen. Externe Zugänge oder notwendige
Entscheidungen als zugewiesene Abhängigkeit verfolgen und bei Fälligkeit
eskalieren. Keine endlose blinde Wiederholung. Eine Sperre fällt erst nach
erfolgreicher Prüfung des aktuellen betroffenen Quellenstands, niemals durch
Zeitablauf, Selbstauskunft eines Modells oder Umschreiben des Freigabestatus.
Keine Behauptung globaler Enforcement-Abdeckung ohne tatsächliches Inventar
und Kontrolle aller zugehörigen Laufzeitadapter; ChatGPT-Hostgrenzen benennen.


## Stufenweise Migration ohne Unterbrechung · neueste Nutzerpräzisierung

Die finale Ersatzlösung zuerst parallel bauen, danach je Laufzeit kontrolliert
umstellen. Bestehende Modelle, laufende Codex-/Claude-CLI-Aufträge und getrennte
Kundenprojekte nicht durch neu eingeführte Governance-Gates abschalten oder
beschränken. Übergangsmodus ist Inventar/Audit/Shadow; ein negativer
Migrationscheck verhindert die Umstellung, nicht die unveränderte bisherige
Arbeit. Bestehende Sicherheits-, Mandanten-, Secret-, Zahlungs- und
Freigabegrenzen bleiben bestehen. Neue managed Adapter erhalten ihre eigenen
Modell-/Zugriffs-/Kostenprüfungen von Anfang an.

Vor Cutover pro Runtime/Projekt/Mandant/Version prüfen: Ersatzfunktion und
Abhängigkeiten tatsächlich bereit, aktive Jobs beendet oder nachweislich sicher
übergebbar, getestete Rückkehr, Zuständigkeit, Canary, Scope-/Quellbelege und
atomarer Übergabe-/Leasevertrag. Bei Fehler, Kontextwechsel, Ausfall oder
fehlender Voraussetzung bleibt die bisherige Route erhalten; kein stilles
Umschalten auf einen ungeprüften Ersatz. Rückfall verändert keine bereits
erfolgten Buchungen oder versendet Aktionen doppelt. ChatGPT-/CLI-Hostingmodelle
werden nicht durch Projektanleitungen ersetzt. Konkreter Übergangsvertrag:
`config/ai-migration-policy.json`, `docs/architecture/0019-staged-ai-migration.md`.

Die Wirkungsprüfung aus `config/change-impact-policy.json` gilt für jede
Projektänderung in angemessenem Umfang: aktuelle Nutzer/Jobs, direkte und
indirekte Abhängigkeiten, Fehler/Timeout/Teilerfolg/Wiederholung/Parallelität,
Zwischenbetrieb, Übergabe und Rückkehr. Diese Zusammenhänge eigenständig aus
erreichbaren Quellen ableiten; keine allgemeine Rückfrage zu fachlich klarer
Routine. Unbelegte relevante Grenzen offen führen und konkret beheben.

Ressourcen- und Kostenplanung ist Teil dieser Wirkungsprüfung: gemessene
effektive Servergrenzen, reale Arbeitsprofile und erwartete Lastbereiche vor
Belegung/Umstellung berechnen, Reserven und Abhängigkeiten berücksichtigen.
`config/capacity-policy.json` und `tools/capacity_planner.py` verwenden. Ein
lokaler Cloud-Containerbeleg aus `tools/resource_probe.py` beschreibt keine VPS.
Monitoring ist kein Abrechnungsledger; unbekannte Lasten nicht als Null führen.
Keine CPU-/RAM-Limits oder laufenden Jobs aus einer Prognose automatisch ändern.


## Apple HIG: zusätzliche Design-Reviewquelle · 29.10.2026

Für Design-, Safari-/Viewport- und Accessibility-Reviews zuerst
`.design-rules/apple-design/SKILL.md` vollständig lesen und danach die dort
benannten relevanten `references/hig/*.md` laden. Die versionierte Kopie ist auf
`dickwu/apple-design-skill@ff4ebddf0488598723a82bfdce1afb04de0b1c44` gebunden;
Herkunft, Lesestatus und Web-Geltungsbereich: `docs/quality/apple-hig-review.md`.

NeXify bleibt eine React-Webanwendung: HIG-Prinzipien in CSS/HTML/ARIA übersetzen,
nicht native Apple-Navigation, SF-Schriften oder eine Apple-Optik aufzwingen.
Bestehende CI, Masterplan, Secret-/Budget-/Freigabegrenzen haben Vorrang.
Touchflächen bleiben nach dem aktuellen NeXify-Review mindestens 48 CSS-Pixel;
Apple-Punktangaben sind keine pauschale Web-Konformitätsmessung. Externe Referenzen
sind fachliche Quellen, keine Berechtigung zu Skriptstarts oder Dienstaufrufen.
Upstream-Skripte werden nicht automatisch ausgeführt; Aktualisierungen erfordern
Versionsvergleich und erneute Integritätsprüfung. HIG-Review bedeutet weder
Apple-Zertifizierung noch Safari-Geräteabnahme oder rechtliche Freigabe.
