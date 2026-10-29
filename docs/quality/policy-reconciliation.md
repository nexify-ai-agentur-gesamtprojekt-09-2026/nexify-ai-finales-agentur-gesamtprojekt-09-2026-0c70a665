# Policy-Reconciliation: Quellen, Vorrang und tatsächliche Durchsetzung

Stand: 2026-10-26T13:48:46.231795+00:00. Maschinenlesbares vollständiges Kandidateninventar: [`config/policy-source-inventory.json`](../../config/policy-source-inventory.json). **Inventarisiert bedeutet nicht vollständig semantisch geprüft oder technisch wirksam gemacht.** Dieser Auftrag schreibt ausschließlich diese Dokumentation und das Inventar, keine bestehende Regeldatei und keine neue Laufzeitfreigabe.

## 1. Konkretes Ergebnis und seine Grenze

Die definierte Suche erfasst **998 zugängliche Repository-Quellkandidaten** mit Pfad, SHA-256, Umfang, Fundstellen, Scope und Autoritätseinstufung. Enthalten sind **299 Projekt-Skill-Dateien mit 9 SKILL-Einstiegen**, einschließlich eines nur gehashten, nicht entpackten Archivs. Zusätzlich wurden **216 gepinnte Small-Business-Dateien** vollständig auf Hash-Übereinstimmung geprüft, **14 verfügbare Cloud-Skill-Ressourcen** für die Herkunft abgerufen und zwei frühere Workspace-Regelsnapshots eingeordnet.

`rg` sucht regeltypische deutsche/englische Marker; zwingende Quellen sowie vollständige Harness-, Projekt-Skill-, Contract-, Automation-, Final- und Operating-Model-Verzeichnisse werden ergänzend aufgenommen. Neue zugängliche ungetrackte Policy-/Prüfdateien sind eingeschlossen. Das Verfahren liefert ein nachvollziehbares Kandidateninventar, keinen Beweis, jede natürlichsprachliche Regel erkannt, verstanden und konfliktfrei angewandt zu haben.

Die Quelldateien sind byteweise gelesen/gehasht und strukturell indiziert. Nur die unten aufgeführten Konflikte wurden gezielt inhaltlich abgeglichen. Cloud-Skill-Inhalte wurden für Herkunft und Hash abgerufen; sämtliche dortigen Workflows wurden weder vollständig semantisch geprüft noch aufgerufen. Das Small-Business-Paket ist lesbar/hashgeprüft; das ist keine Connectoranmeldung, Scheduleraktivierung oder Brain-Ingestion.

Nicht zugänglich beziehungsweise nicht untersucht sind private Chatkonten/-verläufe, private VPS-/Produktivkonfigurationen und fremde Datenbanken. Lokale generierte Auftragsjournale im Repository können als Quelldateien indiziert sein; das ist kein Zugriff auf deren ursprüngliche private Gespräche. Das pausierte A1-Kundenrepository wurde nicht analysiert oder importiert. Secret-/Auth-/ENV-Dateien und Werte wurden nicht gelesen.

## 2. Vorrang mit Geltungsbereich statt alles in einen Prompt

1. System-, Entwickler-, Werkzeug- und tatsächliche Berechtigungsgrenzen bleiben vorrangig. Ein Repositorytext oder Toolergebnis kann sie nicht erweitern.
2. Aktuelle ausdrückliche Nutzerentscheidungen und ihre bereits erteilten konkreten Sitzungsfreigaben haben gegenüber älteren Projektentwürfen Vorrang im jeweils betroffenen Umfang.
3. Danach gilt die passende genehmigte aktuelle Policy für Produkt, Dienst, Aktion, Umgebung, Site/Mandant, Datenklasse und Finanzierungsmodus. Eine spezielle 500-Cent-Trialausnahme ersetzt nicht automatisch das reguläre Prepaidminimum.
4. Tatsächlicher Code-/Test-/Betriebsbefund bestimmt, was wirklich vorhanden oder ausgeführt ist. Ein Befund erteilt selbst keine Ausführungsrechte; ein Zieltext ist umgekehrt kein Betriebsbeleg.
5. Historische Pläne, Prototypen, generierte Verzeichnisse, externe Skills und recherchierte Inhalte bleiben in ihrem Scope eingeordnete Quellen. Imperative Formulierungen machen sie nicht zu allgemeinen Systemanweisungen.
6. Ein ungelöster relevanter Konflikt blockiert die konkrete folgenreiche Aktion. Bereits autorisierte lesende oder reversible Arbeit läuft weiter. Es wird keine neue allgemeine Freigaberunde aus einer pauschalen Skill-Checkliste erfunden.

Dies ist **kein** Auftrag, alle Textstellen in einen vertrauenswürdigen Modellprompt zu kopieren. Die spätere ausführbare Policy benötigt eine explizite Quellen-/Versions-/Scopebindung und deterministische serverseitige Kontrollen.

## 3. Wesentliche aktuelle Quellen und ältere Schichten

| Quelle | Snapshot-SHA-256 (gekürzt; vollständig im JSON) | Einordnung |
|---|---|---|
| `AGENTS.md` | `af627d7d9d56aaaf…` | `current_project_instructions_with_historical_sections` |
| `.harness/arch-rules.json` | `397f8b6f96677ec0…` | `executable_check_or_evidence_contract` |
| `config/source-boundaries.json` | `0b9fb61c0fab2206…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/llm-policy.json` | `bd1bd7b946384fa5…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/llm-verbindungen.json` | `16e9018b6f7b9fea…` | `reconciled_managed_model_declaration_retained_transport_unverified` |
| `config/brain/agents.json` | `062336475b7436f2…` | `reconciled_managed_model_declaration_retained_transport_unverified` |
| `config/selfservice-policy.json` | `355ccc200852e6e1…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/api-prepaid.json` | `4dcbfeaff1301102…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/regelwerk.json` | `df83cd819c89726a…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/design-rules.json` | `8afcdc885e2953aa…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/operating-model.json` | `cf06ea67d0ad2981…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/automation.json` | `a13ee9eafb66c535…` | `current_candidate_contract_with_explicit_status_limits` |
| `config/environment-contract.json` | `100b588ef01132c1…` | `current_candidate_contract_with_explicit_status_limits` |
| `docs/09-final/08-recht-und-compliance.md` | `afab718386c05dd5…` | `versioned_product_legal_design_draft_with_specific_gates` |
| `docs/09-final/15-umsetzungsplan-codex.md` | `56bb717226c3c8fa…` | `versioned_product_legal_design_draft_with_specific_gates` |
| `docs/automation/small-business.md` | `bde4db4d67cbd0e7…` | `current_candidate_contract_with_explicit_status_limits` |
| `docs/automation/vercel-documentation-workflow.md` | `6124ce5c636b6c3a…` | `current_candidate_contract_with_explicit_status_limits` |

`config/regelwerk.json` enthält 22 deklarierte Aktionsregeln R-00 bis R-21. Ihre Existenz beweist nicht automatisch eine überall angeschlossene Gateway-Durchsetzung. Quellenverweise auf `AGENT.md` (Singular) und `CLAUDE.md` finden sich in älteren Regeln; diese Dateien sind an den referenzierten Root-/`.claude`-Orten nicht vorhanden. Der Bericht erfindet ihre Inhalte nicht.

Historische N2-Regeln sind separat klassifiziert. Gleichheit eines Hashes macht aus einer historischen Datei keine aktuelle Regelautorität; ungleiche gleichnamige Dateien werden nicht zusammengeworfen. Die älteren Workspace-Zusammenfassungen unter `.onboarding` enthalten inzwischen überholte Installations-/DNS-/Testbefunde und sind keine aktuelle Dienstelage. Ein generiertes Regelverzeichnis wird nicht durch seine Menge zum Vorrang gegenüber Nutzerentscheidung und spezifischer Policy.

## 4. Konkrete Konflikte, Auswirkung und Owner

Owner-IDs entsprechen `config/operating-model.json`: D01 Leitung, D02 Produkt/Finanzen, D04 Marketing/Design, D05 Lieferung, D06 Entwicklung/KI, D07 unabhängige Qualität, D08 Betrieb/Sicherheit, D12 Recht/Datenschutz. Die jeweilige Accountable-Rolle bleibt nach Quelle `company_owner`; daraus werden keine neuen Personenrechte erfunden.

| Fall | Befund / Auswirkung | Owner | Auflösung / Status |
|---|---|---|---|
| `POL-01-MANAGED-MODEL` | Anfangs CI-only-Wortlaut plus alte Tiers; Root hat inzwischen eine gemeinsame Managed-Policy und ARCH-011-Prüfung eingeführt. | D06, D07, D08 | Konfigurationsguard lokal bestanden; tatsächliche externe Modell-/Deploymentwirkung separat nachweisen. |
| `POL-02-CUSTOMER-BOUNDARY` | A1 ist eigenes pausiertes Kundenprojekt; alte Pläne/Verträge erwähnen seinen Stack. | D01, D05, D06, D12 | Aktuelle Quellenabgrenzung vor Wiederverwendung; kein Import, SSO oder Kundendatenbezug aus Ähnlichkeit. |
| `POL-03-TRIAL-REGULAR-HISTORIC-PRICE` | 500 Cent einmaliger Trial, 1000 Cent regulär, 5000 Cent alte Vorschlagsdokumentation sind unterschiedliche Scopes. | D02, D06, D12 | Spezielle Trialentscheidung anwenden; keine generelle Preissenkung oder ungeprüfte Zahlung. |
| `POL-04-REGISTRATION` | Öffentliche Registrierung ist Produktziel; deaktivierte/unfertige Auth ist Betriebszustand. | D02, D06, D08 | Eigener verifizierter Kundenbereich, expliziter einmaliger Trialstart; keine internen/Adminrechte aus Signup. |
| `POL-05-LIVE-AI-VS-INTERIM` | Öffentliche Wortabgleich-Orientierung ist keine Live-KI, auch bei echtem SDK-Streaming. | D06, D07, D08, D02 | Interim ehrlich kennzeichnen und tatsächlichen finanzierten/authentifizierten Modellpfad als offene Arbeit behalten. |
| `POL-06-MARKETING-GEO-SEQUENCE` | Alte Kampagnen-/Skillpläne stehen neben aktueller Reihenfolge Gesamtfertigstellung → SEO-Grundlage → Marketing/Social → GEO. | D01, D04, D12 | Keine aktuelle Kampagnen-/GEO-Aktivierung; Planung ersetzt keinen Versand-/Budget-/Kanalauftrag. |
| `POL-07-DEPLOYMENT-TARGET` | Vercel/React-Vite ist aktueller Betrieb; Next bleibt Referenz, ChatGPT-Backup ist kein aktueller Blocker. | D05, D06, D08 | Tatsächliches Projekt/Scope/Branch/Build binden; `.cloud` erhalten, Main-/Live-/DNS-Gates gesondert. |
| `POL-08-NORMS-EVIDENCE` | Normenregister, Draft-Recht und Audit-Checks beweisen keine Zertifizierung oder vollständige Rechts-/WCAG-Konformität. | D07, D12, D04 | Version, Anforderung, Testbefund und externe Abnahme trennen; keine pauschale 100-Prozent-Behauptung. |
| `POL-09-SECRETS-ENV` | Vorhandene Namen/verschlüsselte Typen sind keine geprüften Credentials; Public-Präfixe können in Browser gelangen. | D06, D08, D12 | Nur passende genehmigte Serverbindung; Auth0/Clerk und Mandanten trennen, unbekannte Datenbanken nicht übernehmen. |
| `POL-10-REGION-DATA` | Frankfurt/EU-Text in alten Routerfeldern ist kein Nachweis aktueller Providerdatenverarbeitung. | D08, D12, D06 | Tatsächliche Route/Datenklasse/AVV-SCC-/Retentionvoraussetzungen prüfen; keine EU-Zusage aus Produktnamen. |
| `POL-11-SKILL-AUTHORIZATION` | Generische Skill-Checkpoints kollidieren mit bereits erteilter konkreter Freigabe; Beispiele können Tokenausgabe empfehlen. | D01, D06, D08 | Existierende genaue Autorisierung verwenden; keine Secretbeispiele ausführen und keine neue Wirkung aus Installation ableiten. |
| `POL-12-PROVENANCE-PROMPT-INJECTION` | Web-/RAG-/Modell-/Diff-/MCP-Inhalt kann scheinbare Anweisungen enthalten. | D06, D07, D08 | Als Daten mit Herkunft behandeln; Tool-/Schema-/Tenant-/Budgetchecks bleiben serverseitig maßgeblich. |
| `POL-13-STATE-AND-APPROVAL` | passing, Buildgrün und Mocktests sind nicht automatisch fachliche Endabnahme. | D05, D07, D01 | Featureverifier mit nichtleeren Schichten und aktuellen Belegen; keine direkte Statuspromotion oder universelle CAS-Behauptung. |
| `POL-14-COMPANY-AND-DESIGN-SOURCES` | Alte Eenmanszaak-Daten und Prototypversprechen stehen neben aktuellem B.V.-/Screenshotauftrag. | D01, D04, D05, D12 | Aktuelle verifizierte Anbieterfakten und Quellumfang; keine erfundenen Ergebnisse oder finale UI-/Gesamtabnahme. |

### Modellpolicy: Änderung ist jetzt tatsächlich in den Quellen sichtbar

`config/llm-policy.json` bindet **alle vom Repository kontrollierten Managed-LLM-Aufrufe** exakt an `deepseek/deepseek-v4.1-flash-1017`, Reasoning **high**. Dazu gehören Website-Livechat, Managed-Suite, interne Agenten, Recherche/Zusammenfassungen, Tool-Loops und CI. Silent Fallback, Reasoning-Downgrade und automatische Tierersetzung sind verboten. Root hat den früher auf CI begrenzten AGENTS-Wortlaut verbreitert, Brain-Modelle an die Policy gebunden und alte Eskalations-/Ersatzpfade deaktiviert.

Die internen AI-SDK-Primitiven pinnten das Modell bereits; sie waren und sind kein Nachweis eines öffentlichen finanzierten Modellaufrufs. Explizite kundeneigene BYOK-Auswahl bleibt ein gesonderter berechtigter und finanzierter Scope. Ein zentraler Policytext ändert weder das Modell dieses externen Assistentenhosts noch Voice-/Video-/Embeddingfähigkeiten oder automatisch laufende Fremddeployments. Das sind ausdrücklich getrennte Grenzen der aktuellen Policy.

Die aktuelle Architekturregel **ARCH-011** bindet den vorhandenen Guard
`tools/check_llm_policy.py` und dessen Testdatei ein. Der Guard wurde hier
gezielt ausgeführt und hat die fünf festen Konfigurationsquellen mit exakt
1017/high und separater BYOK-Auswahl bestätigt. Er löst keine in diesen Dateien
genannten Pfade, Credentials oder Befehle auf. Sein eigenes Ergebnis lautet
ausdrücklich `managed_config_binding_only_not_live_verification`. Die vorhandenen
SDK-/Wiretests wurden in diesem Inventarauftrag nicht pauschal erneut ausgeführt.

### Trial, Finanzierung und Konvertierung

Die 24 Stunden betreffen Suiteberechtigung; kostenpflichtige LLM-Nutzung ist getrennt zu finanzieren. Der aktuelle Trial beginnt nach verifizierter E-Mail, serverseitig aktiviertem eigenem Arbeitsbereich und authentifiziertem ausdrücklichem Start. Einmaligkeit, atomarer Start, Expiry und Wiederholungs-/Konvertierungsfälle müssen im tatsächlichen Dienst nachgewiesen sein. Eine textliche 500-Cent-Ausnahme ist keine Berechtigung zu Firmenkostenfallback, Negativguthaben, kostenloser Providerannahme oder allgemeiner Reduktion des regulären Minimums. Nutzerfreigabe für diese scoped Regel nicht nochmals pauschal erfragen; konkrete Merchant-/Steuer-/Ledger-/Ausführungsbedingungen bleiben bestehen.

## 5. Operativer Resolver: was im Code wirksam werden muss

Jede ausführbare Regel benötigt mindestens: ID, Herkunft mit Hash/Version, Vertrauensstufe, Geltungsbereich, Aktions-/Umgebungs-/Tenantkontext, Daten-/Regionsgrenzen, Finanzierungsmodus, bestehende Freigabereferenz, explizite Ausnahmen/Supersedes-Beziehung, Prüfort und tatsächliche Evidenz. Eine Herkunft ohne Scope reicht ebenso wenig wie ein grüner Test ohne passende Aktion.

1. Aktion und Kontext bestimmen: Dienst, Produkt, Actor, Site/Mandant, Ziel, Datenklasse, Umgebung, Geldwirkung und Artefakt-/Commitversion.
2. Nur passende genehmigte aktuelle Regeln auswählen. Ältere Quellen als Herkunft behalten und im Konflikt sichtbar herunterstufen.
3. Nicht widersprüchliche Grenzen kombinieren; spezifische Ausnahmen nur im belegten Scope anwenden. Nutzerwunsch, implementierter Zustand und neue Wirkungsberechtigung getrennt führen.
4. Bereits gültige konkrete Sitzungsautorisierung an Aktion/Ziel/Limit/Umgebung/Version binden. Fehlende Freigabe nur für eine tatsächlich neue folgenreiche Wirkung ansprechen und deren konkrete Quelle/Begründung benennen.
5. Entscheidung deterministisch im Server-/CI-Gate treffen, nicht durch einen LLM-Prompt. Ergebnis mit Regel-IDs/Hashes, Freigabereferenz, erlaubter/blockierter Aktion und Evidenz protokollieren; keine Secrets.
6. Unmittelbar vor Wirkung tatsächliche Tool-/Schema-/Zielbindung, Rechte, Budgetreservierung und Idempotenz prüfen. Danach Ergebnis abgleichen; unbekannt ist weder erfolgreich noch kostenlos.
7. Bei Source-/Policy-/Versiondrift den relevanten Teil erneut prüfen. Der Snapshot ist kein zyklischer Zwang, nach jeder PROGRESS-Änderung alle Artefakthashes oder jede Suite erneut laufen zu lassen.

## 6. Konkrete Codechecks, nicht nur Textkonventionen

| Prüfort | Erforderlicher Gegenbeweis |
|---|---|
| Letzte Provider-Wire | Falsches Modell/Suffix, low statt high, Fallback, Retry oder injizierte Modell-/Provideroptionen werden abgelehnt. Endgültigen serialisierten Request prüfen. |
| Gateway-/Toolgrenze | Fremder Tenant, fehlende Rolle, Browserclaim, unregistriertes Tool oder unpassendes Schema bewirken keine Aktion. |
| Trial-/Payment-/Ledgerpfad | Trial500 gilt nicht regulär; Betrag/Währung/Eigentümer/Providerbeleg müssen passen; wiederholter Checkout erzeugt keinen neuen Trial und kein doppeltes Guthaben. |
| Browser-/Public-Data-Build | Keine Provider-/Session-/Management-/Write-Secrets mit VITE_/NEXT_PUBLIC_, in Props, Bundle oder Logs. Öffentliche Schlüssel verleihen keine Geschäftsrechte. |
| Retrieval/Modellantwort | Eingebettete Aufträge zu Exfiltration, Geld, Versand, Regeländerung oder Rechteerweiterung bleiben untrusted Daten. |
| Wissensaufnahme | WRITE → INDEX → EXACT READ-BACK → CONTENT COMPARE; HTTP200/Upload allein genügt nicht. |
| Marketing-/Publishworker | Aktuelle Stage und konkreter Kanal/Empfänger/Budgetauftrag sind erforderlich; kein GEO-Start durch einen geladenen Skill. |
| Feature-/Releaseprüfung | Leere Schichten, Fehler/Pipelines, stale Belege, nicht autorisierte passing-Änderung und fehlende fachliche Abnahme werden nicht als fertig akzeptiert. |
| Claims-/Regionsprüfung | Kein pauschales EU-/kostenfrei-/zertifiziert-/100-Prozent-Versprechen aus Modellname, Normliste, Heuristik oder SDK-/Mocktest. |

Die detaillierten prüfbaren Empfehlungen, Quellstellen und Owner stehen zu jedem Konflikt im JSON. Dieser Bericht implementiert diese neuen Prüfungen nicht selbst. Root verantwortet die aktuelle Modellpolicy-Umsetzung; tatsächliche Laufzeit- und Integrationsbelege sind von diesem Quellenabgleich getrennt zu erbringen.

## 7. Nicht behauptete Vollständigkeit und Verifikationsstand

Nicht behauptet werden: Zugriff auf alle privaten Chats oder VPS-Quellen, vollständige semantische Verarbeitung aller Regeltexte, vollständige Normvolltexte, juristische Konformität, universelle Prompt-Injection-Sicherheit, aktive Connectoren/Skills, gesamtsystemweite Policypropagation oder komplette Produktionsabnahme. Ein lesbares Verzeichnis ist nur der erste prüfbare Schritt.

In diesem Arbeitspaket werden ausschließlich Inventarstruktur, sichere Scope-/Autoritätskennzeichnung, Quellen-/Hashkonsistenz, die zentralen Pflichtquellen und die 14 Konfliktverweise sowie der bestehende Konfigurationsguard gezielt geprüft. Keine bestehende Regeldatei wird geändert, kein breiter Testlauf, kein A1-Import, keine Aktivierung, kein bezahlter Provideraufruf, kein Deployment und kein Commit ausgeführt.
