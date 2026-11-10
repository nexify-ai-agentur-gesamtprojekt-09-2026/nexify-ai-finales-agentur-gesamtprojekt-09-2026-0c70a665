# NeXify · Verbindlicher Ziel- und Logikvollständigkeitsvertrag

**Contract:** NEXIFY-INTENT-CLOSURE-20261110 · v1.0
**Status:** Für Codex/Work/Oracle als Governance-Erweiterung vorgeschlagen; KEINE Installation oder Live-Abnahme eines Workers.
**Verknüpfte vorhandene Quellen:** `AGENTS.md`, `docs/workflows/context-to-delivery.md` (WF-NEXIFY-CONTEXT-DELIVERY), `config/acceptance-coverage.json` (`requirements_reconciliation`), `config/operating-model.json`, `config/source-boundaries.json`, führendes operatives Task-/Eventregister.
**Owner:** AIFly ORACLE koordiniert; vorhandener verifizierter Scope-Writer implementiert; unabhängiger QA-Owner bewertet.

## 1. Geschäftliches Problem und verbindliches Ergebnis

Der Unternehmer beschreibt Fachziele aus seinem menschlichen Geschäftsverständnis. Er muss keine vollständige technische Komponenten-, Agenten-, Verifikations- oder Betriebsaufzählung liefern. Die bisher häufige Fehlleistung, nur seine ausgesprochenen Teilschritte zu erledigen, gilt ausdrücklich als unvollständiger Auftrag.

**Jede ausdrückliche und jede historisch noch gültige Zielvorgabe verlangt eine begründete, rückverfolgbare Zielvollständigkeitsprüfung.** Der ausführende Agent muss alle im Rahmen des autorisierten Scopes fachlich und technisch notwendigen Voraussetzungen und Folgen eigenständig erkennen, die kleinsten sicheren Arbeitsschritte tatsächlich ausführen und fehlende Hartsperren nur für den betroffenen Wirkungspfad isolieren. Keine unbekannte Fachentscheidung als Fakt erfinden.

Eine ausgeschriebene Aufgabenkarte ist keine fertige Funktion, ein erzeugter Plan kein Worker und ein Modellurteil kein Rechtebeleg.

## 2. Ziel → Systemwirkung: Sechs verpflichtende Abdeckungssichten

Für jede Ziel-ID im **bestehenden Register**, ohne zweite Queue oder neue Datenbank:

1. **Absicht / Nutzen:** überprüfbarer echter Geschäftsausgang, Auftraggeber, Priorität, Kunde/Tenant, Frist und im Geltungsbereich verbindliche Entscheidung.
2. **Anforderungen / Quellen:** explizite Nutzerpflichten, aus fachlich notwendigen Voraussetzungen *abgeleitete* Pflichten, optionale Verbesserungen und offene Annahmen mit Begründung und Herkunft getrennt führen. Keine optionale Idee automatisch als verbindlichen Vertragsumfang deklarieren.
3. **Rückwärtsabhängigkeiten:** Welche Daten, Identitäten, Berechtigungen, API/MCP-/SSH-/Connector-Verträge, Backups, Betriebsumgebung, Tests, Design-/CI-/E-Mail-Signaturen, Legal-/Preis-/Steuerfakten und fachlichen Voraussetzungen sind notwendig, bevor ein Ziel wirklich funktioniert?
4. **Vorwärtsabhängigkeiten:** Welche nachgelagerten Kunden-, Verkaufs-, Support-, Finance-, Monitoring-, Dokumentations-, Wartungs-, Recovery- und Archivprozesse brauchen das Ergebnis? Was muss bei einem neuen Event ausgelöst werden?
5. **Agenten- und Entscheidungsketten:** Wer entscheidet (Policy/Business-/technisches Gate), wer schreibt genau einmal (Lease/Owner), welche Fachagenten beraten, welche Worker führen autorisiert aus, wie werden Join, Test, Gegenprüfung, ACK und Rückmeldung verbunden? Welche alternativen zulässigen Pfade gibt es?
6. **Betrieb und Abnahme:** Was ist die positive und negative E2E-Probe, der tatsächliche Ziel-Readback, der Regressionscheck, der Kosten-/Kapazitätsgrenzwert, der Monitoringalarm und der geprüfte Restore-/Rollbackweg?

Jede Sicht erhält: **abgedeckt / fehlend / nicht anwendbar mit Grund / unklar**, Quelle, Verantwortlichen, Auswirkung und nächsten *realen* Prüfschritt. Leere Felder nicht als „erledigt“ interpretieren.

## 3. Algorithmus: bounded Intent Closure

Pro tatsächlicher Aktivierung im vorhandenen Workflow `WF-NEXIFY-CONTEXT-DELIVERY`:

```text
AUTHORIZED_EVENT
  -> validate_identity_scope_tenant_source_and_current_governance
  -> reconcile_existing_goal_and_task_ids (deduplicate; no shadow task register)
  -> extract_explicit_goal_and_measurable_business_outcome
  -> derive_necessary_prerequisites_and_downstream_implications
  -> classify [EXPLICIT | NECESSARY_DERIVED | OPTIONAL_CANDIDATE | UNKNOWN]
  -> bind_justification_source_owner_writer_and_policy
  -> construct_bounded_dependency_and_decision_DAG
  -> detect_missing_edges_cycles_unowned_steps_or_cross_tenant_edges
  -> identify_highest_value_unblocked_reversible_task_with_valid_lease
  -> execute_authorized_implementation (not only plan)
  -> test_integration_negative_cases_and_business_end_to_end
  -> persist_effects_acks_version_and_independent_readback
  -> update_original_requirements_task_state_and_relevant_docs_skills
  -> inspect_all_other_open_tasks_by_event_cursor_and_resume_next_safe_task
```

**Bounded** heißt: echte Priorität, deklarierte WIP-/Budget-/Zeitgrenzen, keine selbstverursachten Bot- oder Selbsttrigger-Loops. Bei begrenztem Kontext bleiben alle Kandidaten und Resume-Cursor persistent; tiefe Prüfung inkrementell über eigene Veränderungen/Fristen/Altdrifts, statt stündlich alle Repositories und Dokumente blind voll zu lesen.

**Rückwärtsauflösung:** Starte vom beabsichtigten Geschäftsergebnis und verfolge alle **notwendigen** Zulieferzustände bis zu tatsächlich belegten bereitgestellten Komponenten. Fehlender Predecessor ergibt konkreten Task mit Test.

**Vorwärtsauflösung:** Starte von jedem neu erzeugten Systemzustand und verfolge die auszulösenden fachlichen Folgeprozesse bis zu einem belegten Ende. Ein verlorener Folge-Event oder fehlende Kundenkommunikation ist eine eigene Abdeckungslücke.

**Entscheidungsketten:** Eingehende Daten, Agentenvorschläge und fachliche Zustände sind keine Rechte. Der Entscheidungsweg erhält explizite Fallunterscheidungen, gültige Limits, Alternativen, Stopkriterien und Rückweg. Jeff/Jev kann bewerten, darf nicht selbst Rechte, kostenpflichtige Pflichten oder Hartsperren verändern.

## 4. Verbindliche Kettenbausteine

Eine ausführbare Agenten-/Entscheidungskette hat mindestens:
- `task_id`, `goal_id`, `tenant`, `owner`, genau einen `writer`, `correlation_id`, `event_id`, deduplizierten `idempotency_key`;
- aktuelle Version/Policy, Datenquelle mit Status und minimale erlaubte Aktionen;
- Entscheidungsknoten mit `condition`, `true/false/default`, `fallback`, `expiry`, Hartsperre und Entscheidungsnachweis;
- Teilagenten nur bei tatsächlich aktivem Worker, Tokenbudget, zulässiger Laufzeit, kontrollierter Parallelität und verifiziertem Rückkanal;
- Eventpersistenz vor ACK, Inbox/Outbox, Lease, Retry mit Begrenzung, Dead Letter und Reconciliation unklarer Side Effects;
- passende Positiv-/Negativ-/Tenant-/Restart-/Replay-/Kosten-/E2E-Tests, unabhängigen Reviewer und fachlichen Ergebnis-Readback;
- Laufzeit-SLA, Warnung, Recovery, Kapazitäts- und Wartungsverantwortung.

Bei **gleichzeitiger** Änderung eines Scopes entscheidet die existierende Lease/Owner-Regel. Keine Agentenkette auslösen, solange sie nur durch einen Prompt oder ihre eigene Slack-Nachricht behauptet wird. Fehlender Executor ergibt eine Implementierungslücke, nicht ein automatisch ausgeführtes System.

## 5. Beispielhafte verpflichtende abgeleitete Ketten

### „Neue NeXify-Website live bringen“

Beinhaltet nicht nur UI-Bau: freigegebene Marke und Medien, Inhalte und Rechtsseiten, Mobile/Accessibility, Deploy-Build und Version, DNS/TLS, Auth/Tenant, laufender API-/DB-Pfad, Formular→persistente Lead-ID→CRM→bestätigter Rückkanal, Datenschutz, Monitoring, Backup, sicheren Cutover und Rollback. **Die aktuelle `nexifyai.cloud`-Übergangswebsite bleibt unverändert erreichbar**, bis die neue Site real vollständig geprüft und die Umschaltung technisch freigegeben ist; `nexifyai.de` getrennt validieren. Vercel nicht abschalten, bevor der Zielbetrieb auf ChatGPT Sites/den bestehenden Hostinger-Servern samt Rückweg nachgewiesen ist.

### „Studienkolleg Aachen fertigstellen und ~44.000 EUR abrechnen“

Erfordert eigenes Kundenscope/Repo/CI, ausdrücklich **keine Videos**, tatsächlich gelieferte Funktionen und Inhalte, Datenschutz/Qualität, Vertrag/Nachträge, vertraglich passende Preis-/Steuergrundlage, prüfbare Meilensteine, fachliche QA, Kundenabnahme, gesetzlich korrekte Rechnung, Versand-, Forderungs- und Zahlungseingangsprozess. Die rund 44.000 EUR sind ein Nutzerziel, keine bestätigte Forderung, kein bereits verbuchter Umsatz und keine Zahlungsermächtigung.

### „Kosten senken und teure Dienste ersetzen“

Erfordert vollständige aktive Kosten-/Usage-/Abhängigkeitsanalyse, doppelte tatsächlich laufende Dienste, zugelassene OSS-Alternativen auf den **zwei** vorhandenen Hostinger-Servern, echte vergleichbare Funktion, Mandantensicherheit, Backup/Restore, Verlagerung ohne Datenverlust, parallel begrenzten Probebetrieb, gemessene Einsparung, Rückweg und erst dann kosten- oder vertragswirksame Abmeldung im jeweiligen Rechtevertrag. Keine unbewiesenen Monatsbeträge, keine eigenmächtigen Zahlungen/Löschungen/Rechteänderungen.

### „AIFly soll autonom Projekte führen“

Erfordert Ereignis-Ingress, echte Dot-/Worker-/Slack-Identität, gespeichertes Task-/Statusregister, Wiederaufnahmecursor, Lease, konkrete Autorisierung, Entscheidungskette, automatischen Issue-/PR-/Work-/Codex-Dispatch, verifizierten ACK, geführte Side Effects, echte Ausführungsbelege, Review, Monitoring des Monitors, Kapazitäts-/Kostenlimits und Übergabe einer notwendigen Inhaberentscheidung. Persönliche Dot-Regeln allein beweisen weder 24/7-Liveness noch eine Slack- oder Mac-Installation.

## 6. Lernen, Rückwirkung und nachweisbare Verbesserungen

Bei jeder Aktivierung: konkreten Auftrag zuerst und danach registerweite Deltaprüfung **auch aller früheren offenen Ziele**. Relevante neue Entscheidung/Fehlerursache muss kontrolliert in die bereits bestehenden Requirements, Abhängigkeitsbeziehungen, passende Fach-Runbooks, `AGENTS.md`, Automationsskripte/Timer, Skills und Knowledge-Quellen zurückgeführt werden. Source of Truth eindeutig lassen; nur den für die Änderung verantwortlichen Writer zulassen.

Wissensstufen:
1. **Beobachtung:** mit Originalquelle, Version, Tenant, Zeitpunkt und Messung.
2. **Begründete Hypothese:** mit Unsicherheit und konkret möglichem Test.
3. **Geprüfte Regel/Logik:** Tests einschließlich mindestens eines Gegenfalls, Review und Geltungsbereich.
4. **Versionierter Einsatz:** tatsächlicher Worker-/Skill-/Regel-Reload, Hash/Version, nachgewiesene Wirkung und Widerrufspfad.
5. **Dauerhafte Sicherung:** Heartbeat/Monitoring, wiederholter Erfolg, Kostenkontrolle und History.

AgentMemory/LightRAG nur tenantgebunden und nach `WRITE → INDEX → EXACT READBACK → CONTENT COMPARE` aktualisieren; das historisch unisolierte LightRAG-Workspace für Kundendaten bis nachgewiesener Trennung nicht verwenden. Korrektes Wissen ist eine geschäftliche Fähigkeit, nicht allein ein größerer Vektorspeicher. Keine unautorisierte dauerhafte Speicherung personenbezogener Daten.

## 7. Abnahme- und Negativtests vor Behauptung „behoben“

1. Eine Nutzeranforderung nennt nur **„Website live“**: Zielkontrolle findet auch Domain-, Lead-, Monitoring-, Release- und Rollbackvoraussetzungen und erhält die Übergangsseite.
2. **„Kundenprojekt abrechnen“**: Contract/Abnahme/Steuer/Rechnung und echten Zahlungseingang trennen, keine erfundenen EUR-Umsätze.
3. **„Werbung automatisieren“**: Rechtmäßiger Empfängerkreis, Opt-out, Sperrliste, Absender-CI, Resend-Authentifizierung, Liefer-/CRM-Folgeschritte.
4. **„Agent entscheidet“**: Prüft tatsächliche Modell-/Jeff-Gates, Entscheidungsschema, Backoff, Agentenidentität, unabhängigen Review; unbekannte Wirkung löst keinen blinden Retry aus.
5. Fehlende Quelle, Legacy-Widerspruch, Cross-Tenant-Daten oder unbestätigte Freigabe: betroffene Aktion wird *gezielt* isoliert, andere Arbeit fortgeführt.
6. Eine alte „DONE“-Karte ohne Ziel-Readback: bleibt OPEN/UNKNOWN, nicht automatisch ACCEPTED.
7. Wiederholter Start derselben Aufgabe: unveränderte `event_id`/Lease verhindert Doppel-Ausführung.
8. Nach Agentenabsturz: Resume anhand gespeicherten Task-/Event-/Belegzustands; keine neue persönliche Chatfreigabe voraussetzen, aber Plattformpausen und Berechtigungsgrenzen respektieren.
9. Zwei unabhängige Tasks bleiben unabhängig; der Graph führt keine künstliche Totalreihenfolge ein.
10. Ein **optional** abgeleiteter Verbesserungsvorschlag wird nicht ohne wirtschaftliche und fachliche Bewertung zur Kunden-Vertragspflicht oder zu einer Zahlung.

**Done-Definition:** Keine unbegründet isolierte Zielkarte, keine offene notwendige Abhängigkeit ohne Owner/next_action, keine behauptete Agenten-/Runtime-Verbindung ohne tatsächlichen Nachweis, kein fachlicher Abschluss ohne Ziel-E2E/Review/Betriebsübergabe. Incomplete/blocked bleibt ausdrücklich sichtbar. Der vollständige Systembetrieb gilt erst nach realem Laufzeit-/Kundenreadback als nachgewiesen.
