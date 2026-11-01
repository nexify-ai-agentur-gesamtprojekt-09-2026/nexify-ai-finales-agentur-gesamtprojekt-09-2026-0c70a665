# NeXify · Team- und Runtime-Nachtrag zum Gesamtplan v3 Revision 2

Version 1 · 01.11.2026 · Auftraggeber Pascal. Die sieben Schritte der vollständig
gelesenen Google-Docs-Vorlage sind die Aufbaugrundlage. Original und frühere
Planfassungen bleiben erhalten. Dieser Nachtrag ergänzt den Gesamtplan.
Er ist kein neuer Scheduler, kein fertig migriertes Framework und keine
Produktions-/Versand-/Zahlungsfreigabe.

## Ergebnis und aktuelle Entscheidung

NeX Agentic AIfly bleibt die gemeinsame Steuerung. Die neun schon vorhandenen
operativen Profile werden mit dem getrennten Katalog aus 44 Enterprise-Fachrollen
und 44 unveränderten Original-SMB-Skills verbunden. Frameworks wie Hermes sind
austauschbare Ausführungsumgebungen für passende Rollen, keine zusätzlichen
Fachrollen und keine automatische Berechtigungsquelle.

Bestehende Codex-/Claude-/Jeff-/Paperclip-Arbeit wird nicht abgeschaltet oder
doppelt gestartet. Codex' laufende AGENTS.md-Arbeit bleibt unberührt. Eine neue
Runtime wird zunächst isoliert inventarisiert und geprüft; der bisherige Weg
bleibt bis zu einer belegten Übergabe erhalten.

Es gibt einen konkreten technischen Anschlussbedarf: Der aktuelle öffentliche
Handler api/agent-chat.ts gibt bei aktivierter managed-Freigabe ausdrücklich 503
managed_live_chat_unavailable zurück. Der Routerassembler weist einen anderen
als den bisherigen OpenRouter-Endpunkt mit managed_live_chat_router_binding_pending
ab. Das ist eine offene Implementierungs-/Konten-/Kostenbindung; zusätzliche
Agentennamen oder ein weiteres Framework schließen sie nicht.

## Die sieben Schritte für NeXify

| Vorlage | Übernommener Zweck | NeXify-Umsetzung und Nachweis |
|---|---|---|
| 1 Zuhause | Dauerhaft verfügbare Arbeitsumgebung | Vorhandene Hosts je Zweck/Eigentümer/Ressourcen/Restore prüfen. Eine erreichbare VPS ist nicht automatisch sicher oder 24×7 abgenommen. Keine Hostbelegung aus einer einzelnen RAM-/Loadprobe. |
| 2 Unterbau | Tatsächlich ausführbare Worker | Bestehende Controller-/Codex-/Claude-/Paperclippfade zuerst identifizieren; Hermes gezielt als Worker prüfen. OpenClaw ist Vergleichs-/Kanaloption, kein zweiter gestarteter Koordinator. |
| 3 Gehirn | Passendes Modell pro erlaubtem Auftrag | NeXify-managed Modell-/Reasoningbindung bleibt in config/llm-policy.json; Account, Routing, Guthaben und Toolfähigkeit separat nachweisen. Hostingmodelle dieser Sitzung werden nicht per Repo umgeschaltet. |
| 4 Organigramm | Klare Verantwortung | Neun operative Profile, darunter Umsetzung und getrennte Prüfung; 44 Fachrollen in acht Clustern. Keine53 oder 88 laufenden Agenten aus diesen Katalogen ableiten. |
| 5 Gedächtnis | Wiederaufnahme und gemeinsamer Kontext | Unternehmenswissen zweckgebunden teilen, private Kunden-/Projektbestände trennen. Vier Brainbelege bleiben getrennt. Kein Verlustfreiheitsversprechen aus einer Wikiinstallation. |
| 6 Skills | Geeignete Fähigkeiten pro Auftrag | 44 Originale hashgebunden/lesbar, getrennte Zuordnung und eigene geprüfte Lernkandidaten. Keine Originaländerung oder gleichnamige Überschattung durch lokale Lerndateien. |
| 7 Werkzeuge | Echte, erlaubte Aktionen | Je Worker authentifizierte Kontobindung, Schema, Scope und Ergebnisreadback. Verbindungen dieser ChatGPT-Sitzung sind nicht automatisch auf einer VPS oder in Hermes vorhanden. |

## Rollenvertrag

Die Profile stehen in config/integrations/nexify-team-runtime-candidate.json.
Sie sind geprüfte Integrationsvorgaben; alle connected_worker_id-Felder bleiben
bis zum tatsächlichen Runtimebeleg leer. Toolbindungen sind ebenfalls leer.
Die Profile vergeben keine Rechte und starten keine Prozesse.

| Vorhandene ID | Aufgabe | Geeigneter Ausführungsweg / aktueller Anschluss |
|---|---|---|
| orchestrator | Auftrag, Priorität, Abhängigkeiten, Budget und Übergabe | Vorhandene NeX/AIfly-Steuerung; kein zweites Auftrags- oder Fehlerregister. |
| baumeister | Autorisierte Umsetzung mit genau einem Writer | Vorhandener Codex; andere Codex-Arbeit und aktuelle AGENTS-Regeln beachten. Externer CLI/App-Serveranschluss dieser Sitzung ungeprüft. |
| pruefer | Unabhängige Gegenprüfung und exakter Versionsbezug | Verbindlicher nativer Codex-Code-Review; ergänzende technische Prüfer ersetzen dessen offenen Nachweis nicht. |
| recherche | Primärquellen und fachliche Entscheidungsgrundlage | Vier tatsächliche begrenzte Recherche-/Prüfaufträge wurden in dieser Sitzung abgeschlossen. Dies ist kein installierter Serverdienst. |
| wissen | Quellen, Fassungen, Hashes und Wissensrückgabe | Bestehender lokaler source.verify-Adapter wurde tatsächlich ausgeführt und separat gegengeprüft; Remote-Brain bleibt unverbunden. |
| triage | Eingänge zuordnen und vorbereiten | Hermes als isolierter Kandidat; reale Postfach-/Vorgangsrechte fehlen in der Runtimebindung. Kein Versand. |
| angebot | Belegtes Angebot/PDF vorbereiten | Hermes oder vorhandener begrenzter Worker nach Adapterabnahme; Preise und Annahme bleiben eigene Gates. |
| waechter | Betriebszustand, Frische und Recovery lesen | Systemmaster R0 verfügbar; kein pauschaler Root-/SSH-/Shelladapter. |
| companion | Besucher helfen, Aufgabe aufnehmen und richtig übergeben | Eigene NeX/AIfly-Oberfläche; reale managed-Router-/Session-/Budgetbindung noch offen. |

| Fachcluster | Erhaltene Rollen | Zuständigkeitsbereich |
|---|---|---|
| A | ER-01–05 | Strategie, Governance, Risiko |
| B | ER-06–11 | Suite, API, Frontend, Dokumentation, Release |
| C | ER-12–18 | Produkte, Passung, Bilder, Shop, Preise |
| D | ER-19–24 | Buchhaltungsvorbereitung, Steuern, Belege, Reconciliation |
| E | ER-25–30 | Marke, Inhalte, Kampagnenvorbereitung, Messung |
| F | ER-31–35 | Mail, CRM, Aktivierung und Betreuung |
| G | ER-36–40 | Support, Wissensbasis, Retouren und Kundenbetreuung |
| H | ER-41–44 | Checkout/Fencing, Memory, QS, Betrieb |

Die vollständige ursprüngliche44-Rollen-Zuordnung ist im getrennten
docs/source-snapshots/team-blueprint-20261101/role-catalogue.json erhalten.
Sie wird nicht als aktuelle Prozessbesetzung oder bereits installierte
Enterprise-Fähigkeit ausgegeben. Fachaktionen bleiben an ihre konkreten
Konten, Rechte und Nachweise gebunden. Aus Finance-/Marketing-/HR-Rollen folgen
keine eigenständigen Zahlungen, Nachrichten, Kampagnen oder Personalaktionen.

## Hermes und OpenClaw: technische Auswahl

Hermes v0.22.5 ist auf bf0203a794a07aac3ff764972ab9087baa4e4f4e
gepinnt. MIT-Lizenz, Installationsvorgaben, pyproject, PM-Lock, Profile,
Delegation und MCP-Dokumentation wurden am Commit geprüft. Unterstützter
Runtimepfad ist Python 3.14; die >=3.11-Metadaten sind nicht die Zusage einer
aktuellen3.12-Runtime. PM-Lock bindet Python 3.14.9 und Node26.12.1.
Diese Arbeitsumgebung hat Python 3.12.14 und keine Hermes-/Codex-/Claude-/
OpenClaw-CLI im PATH. Das beschreibt nur diesen temporären Executor.

Eine Hermes-Installation auf anderen Hosts ist damit weder bewiesen noch
widerlegt. Die interne Bestandsquelle nennt Hermes als ungeklärte Position.
Die Systemmaster-Containerfilter hermes und paperclip lieferten jeweils keine
Treffer; dies ist kein hostübergreifender Installationsnachweis. Der gezielte
lesende Zugriff auf /opt/ai-stack/orchestrator wurde vom Operator abgelehnt;
kein anderer Root-/Shellpfad wurde als Umgehung verwendet.

Hermes-Profile trennen Konfiguration und State, aber sind keine Dateisandbox.
Native Kinder erben die Toolausstattung und teilen standardmäßig den CWD.
Deshalb getrennte OS-/Container-/Ressourcen- und Kontobindung je Vertrauensbereich,
schmale Rollen-MCPs und serverseitige Tenantprüfung. Keine globale Weitergabe
des gesamten Toolkatalogs oder bestehender CLI-Credentials. MCP-Sampling und
automatische Skillmutation zunächst aus; native Werkzeuge müssen entsprechend
geprüft begrenzt werden. Die NeXify-Kandidatendatei ist KEIN angewendetes natives
Hermes-Konfigurationsformat und setzt diese Grenzen noch nicht durch.

OpenClaw v2026.10.9/8b18b5578f66eab1501cba4cef2310d88bfb9a41
wurde als Alternative geprüft. MIT-Lizenz und package.json am Commit nachgelesen;
Nodeconstraint >=24.22.1 <25 oder >=26.12.1. Bewegliche Herstellerdocs erläutern
einen Gateway-Vertrauensbereich und separat nötige Sandbox-/Memory-/Plugin-
Grenzen. Genaue gesamte Featureparität der aktuellen Docs mit dem Release
nicht als geprüft behaupten. Keine zweite Gateway-/Cron-/Memoryinstallation
wird allein aus der Vorlage angelegt. OpenClaw bleibt unselektierter Kandidat.

Quellen: https://github.com/NousResearch/hermes-agent/tree/bf0203a794a07aac3ff764972ab9087baa4e4f4e
und https://github.com/openclaw/openclaw/tree/8b18b5578f66eab1501cba4cef2310d88bfb9a41;
https://docs.openclaw.ai/gateway/security. Exakte Datei-/Lizenzhashes im Manifest.

## Anpassung, Lernen und Fine-Tuning

NeXify-Anpassung erfolgt zuerst durch versionierte Rollenaufträge, die vorhandenen
Skills, Ausgabe-/Toolverträge, kontrollierten Kontext und messbare Evaluationen.
Beispiele: Auto-Teile ohne Fitmentbeleg sperren; Dateiliste ist kein Upload;
Mailentwurf ist kein Versand; Informationsprofil ist kein Partnervertrag;
Quelltext ist kein bereits ausgeführter Worker.

Echte Gewichtsanpassung wurde nicht durchgeführt. Dafür wären ein tatsächlich
feinabstimmbares Modell, erlaubte/zweckgebundene Trainingsdaten, Budget,
Trainings-/Holdouttrennung, Qualitäts-/Datenschutzprüfung und Rollback nötig.
Hermes' Skill-/Memory-Lernen ist nicht automatisch Gewichtstraining. Es gibt
keinen heimlichen Modellwechsel aus der verbindlichen managed-Modellpolitik.

## Tests und wirkliche Ausführung

tools/check_team_runtime_candidate.py prüft die Quellen-/Katalog-/Profil-
Konsistenz.17 Positiv-/Negativtests bestehen. Vier durch die unabhängige
Gegenprüfung entdeckte Auditlücken wurden geschlossen: fehlende Aktivierungskeys,
unbekannte Runtimezuordnung, vollständig umbenannter erfundener Skill und
falscher Gateway-Vertrauensbereich. Fünf Gegenproben sichern diese Kategorien.

Der Checker installiert/startet nichts, ruft kein Modell und kein Tool im
Namen einer Rolle auf und erteilt keine Berechtigung. Ausgabe:
configuration_consistent_not_runtime_ready. --require-runtime-ready liefert
absichtlich Exit3. JSON-Konsistenz ist keine Laufzeitdurchsetzung.

Der bestehende LocalControl-Adapter source.verify hat einen echten lokalen
Quellenauftrag verarbeitet, Ergebnis/Checkpoint persistiert, den lokalen Lease
freigegeben und nach unabhängiger Prüfung das exakte Receipt aufgenommen:
verified_complete, ausschließlich local_only. Operatorlabels sind keine
Serverauthentifizierung. Die erste TXT-Revision wurde mangels erlaubtem
Quellformat vor Ausführung blockiert und bleibt erhalten; die unterstützte,
vollständige Markdownfassung wurde als neue Revision geprüft. Ebenso wurde
die Receiptdatei zunächst unter evidence/ abgewiesen und bytegleich unter dem
bereits erlaubten docs/reviews/-Pfad aufgenommen. Keine Policy wurde gelockert.
Dies sind sichtbare Schutz-/Formatgrenzen, kein Hermes-Erfolgsbeleg.

MCP-REA prüft den eigenen Checker zusätzlich statisch am kompilierten Bytecode;
das genaue Ergebnis samt exaktem Readback steht im gesonderten REA-Bericht.
Kein Bytecodeinventar ersetzt Python-Verhalten, Rollenrechte oder Betriebsabnahme.

## Codex-Code-Review und Browser

Pascal bestimmt https://chatgpt.com/settings/code-review/repositories/github-1397719293
als verbindlichen Reviewpfad. Die Repository-ID ist dem Gesamtprojekt zugeordnet.
Der Browser-Plugin-Aufruf scheitert hier an fehlendem originating browser context.
Die Cloudbrowser-Ersatzsitzung ist separat und wurde zur Anmeldung umgeleitet.
Keine Anmeldung, Kontofreigabe oder Reviewaktivierung wird erfunden. Für die
Browser-Plugin-Bedienung muss dieser Chat aus dem Browser mit verbundener
Erweiterung geöffnet sein. Dann aktuelle Einstellung tatsächlich lesen;
Codex-AGENTS-Writer erhalten und Review am exakten Commit dokumentieren.

Die offizielle Codex-Dokumentation bestätigt AGENTS.md als Reviewregelquelle
und PR-Reviews. Separate Subagent-Gegenprüfungen sind keine native
Codex-Code-Review-Abnahme. Dieser Nachtrag verändert AGENTS.md nicht und
schaltet keine neue CI, kein Slackposting und keinen Review-Providerlauf ein.
Quelle: https://developers.openai.com/blog/custom-code-review-rules-for-codex.

## Geschlossener Anschlussplan und Übergabe

1. Bestehenden tatsächlichen Hermes-/Paperclip-/Codex-/Claude-/Jeff-Prozess
   mit erlaubtem R0-Zugriff pro Host identifizieren; fehlende Sichtbarkeit bleibt
   unknown. Kein Post auf einen alten Auftragserver als Gesundheitsprobe.
2. Genau einen quellengebundenen Executor an bestehenden Task/Attempt,
   authentifizierten Scope, Queue/Lease/Fence und Resultatreadback anbinden.
   Bestehende Jobs sicher erhalten, keine zweite Registry oder generische Rootbridge.
3. Hermes erst mit isoliertem unterstütztem Runtimepaket, eigenem Dienstnutzer,
   getrenntem State, schmalen Tools und tatsächlichem Account-/Budgetnachweis
   prüfen. Node-/Python-Versionen der bestehenden Webanwendung bleiben erhalten.
4. Identische Tests je Worker: fremder Tenant, geänderter Policyhash, doppelter
   Auftrag, abgelaufener Lease, Crash/Restart, Stop samt späten Ergebnissen,
   unklarer Seiteneffekt und Ergebniszustellung. Zeit/Schritt/Parallelitäts-/
   Kostenlimits müssen am wirklichen Adapter greifen.
5. Brain WRITE, INDEX, EXACT READ-BACK und CONTENT COMPARE tenantgebunden
   einzeln beweisen; vorher weder Indexierung noch gemeinsamen Privatbestand behaupten.
6. Nativen Codexreview und benötigte fachliche/providerseitige Abnahmen am
   Endcommit abschließen. Erst danach kontrollierte Migration mit Canary und
   erprobtem Rückweg pro Runtime. Kein vollständiger Dauerbetrieb aus einem Pilot.

Zuständigkeiten bleiben die vorhandenen Fachowner, keine neu erfundenen
Personalbesetzungen: D06 Runtime-/Account-/Betrieb, D08 Steuerung/Lease,
D07 QS; Pascal für ausdrücklich vorbehaltene Inhaberentscheidungen.
Öffentliche Agentur/Shop/DNS/Altadressen und bestehende Automationen unberührt.
