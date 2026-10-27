# Unabhängige Gegenprüfung: Kontext, Brain, SEO und Governance

Stand: 26.10.2026. Read-only-Implementierungsreview durch independent_review. Eigene Änderungen ausschließlich an diesem Ergebnisdokument; keine Installation, kein Commit, keine Provideraufrufe, keine produktive Migration. Der Bericht bewertet lokale Tools und ihre ausdrücklich begrenzten Nachweise, nicht die Gesamtabnahme der Factory.

## Ergebnis und nachgeprüfte Behebungen

Die sechs ursprünglich reproduzierten Fehler sind im geprüften Stand behoben. Die abschließende Queue-Gegenprüfung hat keinen verbleibenden materiellen Fehler ergeben. Alle fünf eigenen Skillquellen verifizieren tatsächlich; governed-delivery ist 1.0.2, platform-integrations ist 1.0.1, die drei übrigen Skills sind 1.0.0. Der Verifier installiert nichts und behauptet weder semantische Gesamtabnahme noch Liveaktivierung.

| Befund | Reproduktion | Nachgeprüfte Korrektur |
| --- | --- | --- |
| P1 Brain-FIFO blockiert Scan | Autorisierte lokale FIFO mit Markdownsuffix blockierte vor Dateitypprüfung. | O_NONBLOCK, FD-fstat und Ablehnung nichtregulärer/verlinkter Dateien; bounded Subprozesstest. |
| P1 Bekannte Tokenform im Klartext gespeichert | Synthetischer unzugewiesener glpat-Token erschien im SQLite-Dump. | Erweiterte Muster und Negativtests gegen rohe DB-Persistenz; eigener Readback redigiert. Kein Universal-DLP-Versprechen. |
| P2 Context liest fremden Hardlink | Eigener Fremdprojekt-Sentinel per Hardlink unter erlaubter Referenz wurde gelesen. | st_nlink muss exakt 1 sein; Foreign-Sentinel-Negativtest. |
| P2 Brain behält entfernte/überholte aktuelle Versionen | Vollständiger Scan nach Entfernung meldete Erfolg, alter Current-Pointer blieb bestehen. | Vollständiger source-scoped Abgleich mit append-only Tombstones, Supersede und A→B→A-/Wiederkehrreaktivierung. Unvollständige Scans reconciliieren nicht. |
| P2 SEO-Quellatomizität und rückwärts wirkender Replay | Zwei Connections konnten Sourcehash A mit Ortsdaten B speichern; v1→v2→v1 setzte aktuelle Ortsdaten zurück. | BEGIN IMMEDIATE vor Quellenlookup; SHA/Lizenz und Ortsupdates in derselben Transaktion. Exakter alter Versionsreplay ist ausschließlich Readback. Echte Zwei-Connection- und Replaytests. |
| P2 Bindestrichbegriffe verlieren Kontextregeln | SEO-Recherche/LLM-Chat selektierten nur allgemeine Regeln. | Originaltoken plus Bindestrich-Subtoken; SEO-Pflichtcheck wird erkannt, Geometrie-Neubau erzeugt keinen falschen SEO-Treffer. |

Brain serialisiert vollständige lokale Scans über eine DB-bezogene OS-Dateisperre. Quarantäne, Budgetabbruch und Walkfehler liefern keinen erfolgreichen Removalabgleich. Dokumente in ausgeschlossenen Pfaden/Präfixen werden nicht stillschweigend als entfernt interpretiert. Kandidaten ändern den Current-Pointer erst beim vollständigen Abgleich. Tenant/Projekt/Source-ID werden gebunden; alte Inhaltsversionen bleiben lesbar. Das ist lokale Staging-/Outbox-Verwaltung, kein Nachweis externer Ingestion oder Remote-Löschung.

Context bindet sechs Kernquellen einschließlich change-impact-policy unabhängig von der Aufgabengruppe. Die Quellenprüfung bestätigt Auswahl, sichere Lesbarkeit, Referenz und begrenzte Ausgabe; sie führt die fachlichen Pflichtprüfungen nicht selbst aus. Der deterministische Selektor beweist weder vollständiges Verständnis historischer Daten noch semantische Vollabdeckung jeder indirekten Abhängigkeit. Scopeparameter dieser lokalen Operatorwerkzeuge ersetzen keine öffentliche Authentifizierung oder RLS.

SEO trennt öffentliche geografische Kandidaten von privaten Keywordkohorten. Importierte Orte behaupten keine tatsächliche Geschäftsabdeckung. Fehlende Volumina sind nicht Null; unvergleichbare/unvollständige Messungen dürfen keine finale Rangliste ergeben. Kein Import erzeugt oder veröffentlicht automatisch Geschäftsinhalte.

## RemediationQueue: abschließende Gegenprüfung

Acht feste native Prüftypen sind vorhanden: local_file_sha256, project_skills_integrity, managed_llm_policy, external_readback_required, context_reader_regression, brain_ingestion_regression, seo_atomicity_regression und browser_evidence_binding. Es gibt keine frei übergebenen Befehle oder Provideraktionen.

Drei zusätzliche Vorabbefunde sind behoben: Der local_file-Zielpfad gehört zwingend zum Quellenfingerprint; native Checker kommen ausschließlich aus dem festen Anwendungspfad und führen exakt sicher gelesene Bytes aus; bekannte Tokenformen werden auch in Identifierfeldern wie Owner/Scope/Eventkey abgelehnt. Tests prüfen Reopen nach Targetdrift, manipulierten Datenroot/Byte-Reopen und sensible Identifier.

Generation, Scopehash, Quellenfingerprint und aktuelles Ticket begrenzen jede Verifikation. Ein alter Replay kann keinen neueren Stand freigeben. Vor und nach der Prüfung müssen gebundene Quellen aktuell sein. Read-only status/due erzeugen keine DB und starten keine Regressionstests. Eine frühere erfolgreiche Regression bleibt ausschließlich an die unveränderten gebundenen Quell-/Test-/Runnerbytes gebunden. verify startet nur die drei festen lokalen Tests, mit Deadline und Kill ausschließlich der selbst gestarteten Prozessgruppe. Die Tests laufen in vertrauenswürdigem lokalem Quellcode, nicht in einer Sicherheits-Sandbox für feindliche Checkouts.

external_readback_required bleibt ohne echten Adapter offen; ein Modelltext oder Boolean kann dies nicht erfüllen. Retry, Owner, Fälligkeit und Eskalationsmetadaten sind lokale Verwaltung, kein dauerhaft laufender Scheduler und keine externe Nachricht. resolved erfüllt nur das lokale gebundene Prädikat; es autorisiert keine Zahlung, Runtimeumstellung oder fremden Mandantenzugriff. Lokaler Dateibesitz ist die Betreibervertrauensgrenze, keine neue Multiuser-RBAC.

Die Regeln beachten ausdrücklich die aktuelle Übergangsweisung: Bestehende Modelle, Codex-/CLI-Arbeit und getrennte Kundenabläufe bleiben während Audit/Shadow erhalten. Neue Adapter haben eigene Guards; spätere Umstellung braucht tatsächlich verifizierten Ersatz und scoped Cutover. Eine fehlgeschlagene lokale Verifikation ist kein Prozess-Kill-Switch. Bestehende Sicherheits-, Zahlungs-, Secret- und Mandantengrenzen bleiben bestehen.

## Skills, Browserbindung und Migration

Der Installer ist explizit und projektbezogen, prüft die fünf eigenen gepinnten Quellen, überschreibt keine abweichenden bestehenden oder fremden Skills und liest exakt zurück. Eine Referenzprüfung bestätigt Pfad und sichere Existenz; sie ersetzt keine vollständige semantische Prüfung jedes referenzierten Dokuments. Die aktuelle Quellenverifikation ist bestanden; die tatsächliche Installation führt der Auftragseigner nach Review aus.

Die Browser-Evidenzprüfung bindet vier bestehende Layout-/Routenquellen und fünf feste SDK-Quellen sowie drei kritische SDK-Checks an bereits gespeicherte Messungen. Der eigene Checkeraufruf und fünf Negativtests bestehen. Das ist stored_browser_evidence_binding_only, kein neuer Browserlauf, kein pauschaler WCAG-/LCP-/Produktivnachweis. Der separate SDK-Review hält die korrigierte Vercel-Statusfunktion fra1/maxDuration15 fest; daraus folgt keine Liveinferenzfreigabe.

Das neue AI-Migrationsmodell wurde mit zehn Tests geprüft: Scope-/Quellwechsel, fehlende/abgelaufene Belege, aktive Jobs/Drain, Rollback, Replay und konkurrierende Revisionen. Es liefert reine Offline-Vorschläge; der Koordinator ist ausschließlich prozesslokales CAS. Evidence-JSON bleibt eine Behauptung im Was-wenn-Szenario, keine authentifizierte Betriebsattestation. Eine Entscheidung autorisiert keine Ausführung und verändert kein Routing, keinen Prozess und keine Datenbank. Reale Lease, atomarer Datenspeicher, Canary-/Drain-/Rollback-Adapter und aktive Jobzahlen bleiben produktive Integrationsaufgaben.

**Nachprüfung des letzten P2 bestanden:** Der Migration-CLI-FIFO wurde reproduziert, gemeldet und anschließend behoben. Der neue Leser öffnet Ancestor-Verzeichnisse und Datei über FD mit O_NOFOLLOW, nutzt O_NONBLOCK und prüft regulären Typ, nlink1, tatsächlich gelesene Bytes sowie Vor-/Nachstat. Zehn Migrationstests bestehen, einschließlich echter bounded CLI-Negativtests für FIFO, Hardlinks, Datei-/Verzeichnissymlinks und Übergröße sowie Actual-Read-Growth. An dieser Grenze verbleibt kein materieller Befund.

Der nachgeprüfte kleine Context-/Skilldelta ergänzt Operationsaliases und die existierende 0020-Planungsreferenz; sechs Kernquellen bleiben erhalten. Platform-integrations 1.0.1 beschreibt Planung ausdrücklich ohne automatische Betriebsänderung. Die lokale resource_probe.py wurde quellenlesend und mit drei Tests geprüft: ausschließlich feste lokale cgroup-Dateien und /workspace-Dateisystemwerte, keine Credential-/Remoteabfrage oder Lastgenerierung; placement_ready bleibt false. Eine kurze cgroup-Beobachtung und ein Affinity-/Quotawert ersetzen insbesondere keine vollständige Parent-cgroup-/Peak-/Hostinger-Kapazitätsmessung. Die eigentliche Capacity-Mathematik wird getrennt unabhängig geprüft und erhält durch diesen Bericht keine zusätzliche Abnahme.

## Tatsächlich ausgeführte gezielte Prüfungen

| Suite | Fälle | Ergebnis |
| --- | ---: | --- |
| ContextExecutor | 16 | bestanden |
| BrainIngestion | 11 | bestanden |
| SEO catalog | 8 | bestanden |
| Project skills | 8 | bestanden |
| RemediationQueue, final acht Prüftypen | 22 | bestanden |
| Browser evidence guard | 5 | bestanden |
| AI migration | 10 | bestanden |
| Lokale Ressourcenprobe | 3 | bestanden |
| Summe | 83 | bestanden |

Zusätzlich: project_skills.py verify bestätigt exakt fünf Quellen/Versionen ohne Installation. Die Zahlen fassen die tatsächlich gezielten unabhängigen Läufe dieser Reviewrunde zusammen; es wurde keine neue Vollsystem-/Produktivtestsuite behauptet. Keine echte Queue verändert und kein externes Funding/LLM/Brain-System angesprochen.

## Quellenfingerprints dieses Reviewstands

SHA-256 über tatsächliche lokale Bytes. Spätere Änderungen benötigen erneute Prüfung der betroffenen Aussage; dieser Snapshot ist keine automatische Freigabe späterer Dateien.

| Quelle | SHA-256 |
| --- | --- |
| `AGENTS.md` | `41f0379cd8b2a90aa3f841144f3f531d35599b4c37119c44a63909898531e6db` |
| `tools/context_executor.py` | `b4fe37c32759e36efec82ffea2b35f4a3a36696545bf86114fa5bc78940e9a55` |
| `tests/test_context_executor.py` | `836d1ed9e4a93b51bc8b3a29d190a00065b5675cf4b9e071858bb82931399adb` |
| `tools/brain_ingestion.py` | `ef81297bfc808188960f40d658a0599b483ce6b117bcce41f7174aa2f545ff68` |
| `tests/test_brain_ingestion.py` | `c0b88440609ed22e6aec20eb3a7ff687d0676ca356ef9b7829c2d0af15b81194` |
| `tools/seo_catalog.py` | `79b68d53a0fae6e8deff0a8053ec1bcf8b2c8da5566b263844d3cc8067bc4dab` |
| `tests/test_seo_catalog.py` | `b4f4babe6770c133676b307cd5234f6cff810f934f38802f3adedf40a2385e21` |
| `tools/project_skills.py` | `3ede8dab369cd068f89a08afc1e5e477e697304ad2df65081cbee8fdd66ec80b` |
| `tests/test_project_skills.py` | `d4f4848a6fa8ae2d12da0bc94eb91a3e9af014f7d7bce9590f6caee898aa978d` |
| `config/project-skills.json` | `1a08d949ad747bdbaf1f833dea5ca55666f0d7e1c8a0423c5a734f97f90f9d6b` |
| `config/seo-workflow.json` | `3d82742a46c55d7bb2cbb887f7a4a1b9f98a3e0fc74f76129620b488149dc8ca` |
| `config/change-impact-policy.json` | `32e9b978d2a80c9832fd99752ef65cd17741e8255567c5f055af59b3f8a9eda8` |
| `config/llm-policy.json` | `5cf781a67f41d55f0942b5edab327ec6a6537c93e610e86e8de4516ccbf1e368` |
| `config/source-boundaries.json` | `0b9fb61c0fab2206b1b4ae04110b497d276980d1c0ad590723cf2e8f60f1ea7b` |
| `config/selfservice-policy.json` | `355ccc200852e6e14087aa55a5dc10ed94e42f1a3222d9818086db393bcbf2ab` |
| `config/operating-model.json` | `cf06ea67d0ad29812541528b64724f6da456b1da59532003f5d410d0b7662845` |
| `docs/workflows/context-to-delivery.md` | `708956f7442213816ffd2b568ea85188021c2a1078e5c8d7e3edc26b58e46b30` |
| `docs/architecture/0016-context-executor.md` | `99ad0ef95b1c8380fc906af4066433e8d00fed4ea70195ab6721949df812ce49` |
| `docs/architecture/0017-brain-ingestion.md` | `0beb0a939a481759d2212f3c93bdf146e62aaa7048a7671ac1b97ae197d34e8a` |
| `tools/remediation_queue.py` | `4a584e391ba77a9c4a4090cccf144dd62f9253c52e0fbbff410a6672cfe8f4a9` |
| `tests/test_remediation_queue.py` | `90b494b606f556330e6e44235f0d6f30c3508cc2d13231b1ac950e8f32a67ae9` |
| `config/remediation-policy.json` | `a5ac51b55d9320443ce38fdf4fc4ab774055aff76e486d4c20848c1e03447685` |
| `docs/architecture/0018-remediation-lifecycle.md` | `15aada196ea398e9736fbf01fbf24c6cff6083b38fdeec9d95c6634d0cf18b1d` |
| `tools/check_browser_evidence.py` | `2528282e3a21cff77b381317837abc985a18647002e490151f0ba8d04162fe18` |
| `tests/test_browser_evidence.py` | `68e317673f9d31f470174f88955f81abd25e6652dfef2ef4bc3c58112ae20cbd` |
| `tools/ai_migration.py` | `75e3ac289e1b226925ed07925bb986c0d825b4e3c21b77ef29c12105fc04a70e` |
| `tests/test_ai_migration.py` | `dbe2653f3d69e8d5e9907173f92b1fcc12c1cbd8ea1db4eb46f63196a011f414` |
| `config/ai-migration-policy.json` | `98ba89849bff3585843f3fd603a8d0da9df8c568ee534b90f3ddf5c3a82aeaa0` |
| `docs/architecture/0019-staged-ai-migration.md` | `d660c6159050ddb8cfc61ef95dc453ab2a7c9753e38a2b8535f1388c516495cc` |
| `skills/nexify-governed-delivery/SKILL.md` | `a86b53e827e2ecc0e1f6e9efb9a3c9c4a4204a1ac00acc246c2d535ff540cf27` |
| `skills/nexify-knowledge-operations/SKILL.md` | `dcc2498dcc6405472c7b947d24f00cf12c4cbdd861b6fa79315136a3dd53be2f` |
| `skills/nexify-platform-integrations/SKILL.md` | `4ec6b0475dcc86cb24bde801fb22c9609b89386d5f7c4544c41ce93bda4375bf` |
| `skills/nexify-quality-learning/SKILL.md` | `83a0def89fd68fbc17d7b5a15765dd2c20d24a21d462dcfae99f23b7d068b11d` |
| `skills/nexify-research-content/SKILL.md` | `3e747269d8d47e652d60e32bf64b2c9f2b0d918f7fe6d90a2dcbf397cc30f912` |
| `tools/resource_probe.py` | `c131ca49bb0056378e886a4e60b9dabd0710eaf648fc1a3e152d052b61a53aeb` |
| `tests/test_resource_probe.py` | `559084ece98206e0c6e32cf3edba3f058b2762e5be905903a889a1e8f832e8f4` |
| `docs/architecture/0020-capacity-and-cost-planning.md` | `596acb15f69691c51c341360201e237ed5d9b802fa5175594f0ed75697e7a41c` |
