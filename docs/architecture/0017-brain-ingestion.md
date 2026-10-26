# Lokales Markdown-Staging und geplanter Brain-Adapter

Dieser Schnitt stellt eine lokale, versionierte Importvorbereitung bereit. Er synchronisiert keinen Live-Brain und enthält keinen LightRAG-Schreibadapter. Die gemeldeten etwa 9.000 Markdown-Dateien und vier Server sind vom Nutzer genannte Bestände; sie wurden hier weder gezählt noch über einen Remotezugang gelesen. Fehlender Zugriff ist kein Nachweis für einen leeren Bestand. `external_indexed: null` bedeutet unbekannt, nicht null tatsächlich importierte Dokumente.

## Autorisierter lokaler Lauf

```sh
python3 tools/brain_ingestion.py scan \
  --source-root /genehmigter/lokaler/projektordner \
  --tenant nexify --project factory \
  --database .local/brain-staging.sqlite \
  --source-id genehmigte-projektdokumente \
  --authority reference
```

Der Quellordner muss ausdrücklich für das angegebene Projekt autorisiert sein. Mandant, Projekt und Quellenkennung sind serverseitig kontrollierte lokale Bezeichner; die CLI ist kein öffentliches Authentifizierungsverfahren. Der SQLite-Dateieigentümer besitzt direkten Datenzugriff. Mandantenfilter in den bereitgestellten Leseoperationen ersetzen weder produktive Rollenprüfung noch PostgreSQL-RLS.

`reference` ist Referenzmaterial. `project_instruction` kennzeichnet eine projektbezogene Regelquelle zur anschließenden Prüfung. Beide erzeugen ausschließlich Kandidaten: Frontmatter-Metadaten, Aufgaben und Richtlinien werden niemals automatisch ausgeführt oder als globale Agentenanweisung angewandt. Shellblöcke bleiben zitierbarer Text. Gleiche Quellenkennung bindet pro Mandant/Projekt genau einen realen Quellordner und eine Authority; ein Wechsel benötigt eine neue autorisierte Quellenkennung.

## Grenzen vor dem dauerhaften Speichern

Breite Dateisystemwurzeln, das pausierte Affilinet-Kundenprojekt und bekannte historische Kundenpfade sind ausgeschlossen. Symlinks werden nicht verfolgt; Dateien werden über ein geöffnetes Wurzelverzeichnis mit `openat`/`O_NOFOLLOW` geöffnet. Hardlinks und andere nicht reguläre Dateien werden quarantänisiert. `.git`, `node_modules`, `.env*`, typische Secretverzeichnisse und Credentialdateien werden übersprungen. Es werden ausschließlich `.md`-Dateien gelesen.

Ein Dokument darf höchstens 1 MiB groß sein; ein Lauf höchstens 20.000 Markdown-Dateien und 256 MiB Eingabedaten. Überschreitungen machen den Lauf ausdrücklich unvollständig. UTF-8 mit optionalem BOM ist zugelassen; ungültiges UTF-8 und Binärinhalte werden quarantänisiert. Zeilenenden und Unicode werden normalisiert. Erkannte Secretzuweisungen, bekannte Tokenformen, private Schlüsselblöcke und URL-Zugangsdaten werden vor dem Speichern redigiert. Mehrdeutige mehrzeilige Secrets und unvollständige private Schlüssel gelangen in Quarantäne. Diese Mustererkennung ist kein vollständiger DLP-Nachweis: unbekannte Secretformate oder personenbezogene Inhalte benötigen eine zusätzliche Quellenprüfung vor externer Freigabe.

Nur der SHA-256 der ursprünglichen Bytes wird behalten; ursprünglicher Secretklartext wird nicht kopiert. Der zweite Hash bindet die normalisierte und redigierte Fassung. Pfad, beobachteter Änderungszeitpunkt, Quellenfassung, Mandant, Projekt, Authority und Datenklasse `project_internal` bleiben nachvollziehbar. Eine Fassung wird anhand der Dokumentidentität plus ursprünglichem Hash dedupliziert; allein ein neuer Dateizeitstempel erzeugt keine künstliche Inhaltsfassung.

## Dauerhafter Zustand und exaktes Readback

Eine Dokumenttransaktion speichert Fassungen, begrenzte Überschriften-/Zeilen-Chunks, Kandidaten, Audit und Manifest. Stabile Chunk-IDs binden Dokumentfassung, Chunkindex und Zeilenposition; lange Überschriften besitzen einen begrenzten Metadatenpräfix, der vollständige Quelltext bleibt in den Chunks erhalten. Rohbyteänderungen erzeugen neue Fassungen, frühere Fassungen bleiben erhalten.

Inbox und Outbox beginnen mit `pending_readback`. Nach Commit liest eine neue Verbindung Quellenidentität, Dokument-/Quellenfassung, Pfad, Original-/Normalisierungshash, Authority, Datenklasse, Inhalt und alle Chunks exakt zurück. Dann wechseln neue Fassungen zu `pending_scan_reconciliation`. Erst ein vollständig erfolgreicher Scan ohne Quarantäne, Traversierungsfehler oder Mengenabbruch darf den aktuellen Quellenbestand abgleichen und die beobachtete Fassung zu `pending_ingestion` freigeben. Ein Absturz vor diesen Übergängen kann durch Wiederholung desselben lokalen Imports abgeglichen werden; daraus entsteht kein automatischer Remoteversuch. Jobmanifeste und Versionslesezugriffe müssen Mandant und Projekt angeben.

Beim vollständigen Abgleich gilt ausschließlich der angegebene Mandant/Projekt/Source-ID-Bereich: Eine neue aktuelle Fassung ersetzt frühere noch ausstehende Fassungen durch `superseded`; tatsächlich fehlende Dokumente erhalten einen dauerhaften Tombstone, `current_version=NULL` und den Queuezustand `source_removed`. Kein historischer Inhalt, Chunk oder Auditbeleg wird gelöscht. Beobachtete, aber unterdrückte Dateien und ausgelassene Unterverzeichnisse werden nicht als bewiesene Abwesenheit behandelt. Unvollständige Scans verändern den aktiven Quellenbestand nicht. Sowohl A→B→A als auch Löschung→identische Wiederkehr reaktivieren nach erneutem exaktem Readback die ursprüngliche stabile Fassung und deaktivieren nur ihre inzwischen überholten Pending-Alternativen.

Ein lokaler `flock` über die gesamte SQLite-Datenbank serialisiert vollständige Scans einschließlich Erstanlage, Recovery und abschließendem Quellenabgleich. Er wird beim Prozessende vom Betriebssystem freigegeben. Dadurch kann kein älterer unvollständiger Scan einen neueren vollständigen Bestand nachträglich tombstonen. Das ist eine lokale Linux-Prozessgrenze, kein verteilter Serverlock und kein transaktionaler Snapshot eines gleichzeitig extern veränderten Dateisystems.

Der JSON-Bericht unterscheidet `staged` (neu gespeicherte Fassungen), `changed` (beobachtete Inhaltswechsel einschließlich Wiederkehr), `reactivated` (wiederverwendete historische Fassungen), `unchanged`, `suppressed` und `quarantine`. `reconciliation_applied`, `tombstoned` und `superseded_versions` dokumentieren den tatsächlich durchgeführten lokalen Quellenabgleich. `suppressed` zählt übersprungene Einträge beziehungsweise vollständig ausgelassene Verzeichnisse; es zählt deren unbekannten Inhalt nicht nach. `scan_complete` berücksichtigt Mengenlimits, Quarantäne und Traversierungsfehler. `remote_model_calls: 0` beschreibt diese rein lokale Implementierung. `external_indexed` bleibt unbekannt. Ein solcher Bericht ist kein Beleg für eine produktive Brain-Synchronisierung.

## Nächster autorisierter Adaptervertrag

Ein Remoteadapter bleibt geplant. Vor jedem LightRAG-/Brain-Schreibzugriff müssen der tatsächlich erreichbare Server, Version, Tool- und API-Schema, Authentisierung, Mandanten-/Workspacebindung sowie freigegebene Quell- und Zielbereiche entdeckt und geprüft werden. Keine aus Beispielen erratene URL und kein ungeprüftes MCP-Tool darf Importrechte begründen. Die vier genannten Server benötigen jeweils eine tatsächliche Bestandsaufnahme und getrennte Herkunfts-/Versionsbelege.

Ein freigegebener Adapter übernimmt nur verifizierte `pending_ingestion`-Einträge mit idempotenter Job-/Dokument-/Versionsbindung. Falls Indexierung oder Zusammenfassung NeXify-managed LLM-Arbeit auslöst, gilt exakt `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high`, ohne Ersatzmodell oder stillen Downgrade; Embedding-Fähigkeiten benötigen einen separat bestätigten Vertrag. Zusätzlich erforderlich sind serverseitige Credentials, autorisierte Finanzierung, maximale Kostenreservierung und kontrolliertes Verhalten bei unbekanntem Ausgang. Modellkonfiguration allein erteilt keine Ausgabenfreigabe.

Nach `INDEX` muss der Adapter die tatsächliche externe Quellen-/Dokumentfassung, gespeicherten normalisierten Inhalt und Zielbindung exakt zurücklesen (`READBACK`). Ein bloßes HTTP-200 oder eine Elementanzahl reicht nicht. Unbekannte Ausgänge bleiben ungeklärt und werden vor Wiederholung abgeglichen. Erst nach diesem Nachweis darf eine einzelne externe Fassung als indexiert gelten. Dieser lokale Schnitt führt weder `INDEX` noch Remote-`READBACK`, Modellaufrufe, Zahlungen oder Serverkonfiguration aus.

## Gezielte Prüfung

`python3 -m unittest discover -s tests -p test_brain_ingestion.py -q` prüft tatsächliche SQLite-Persistenz und Prozessneustart, Deduplizierung, Dateiänderungen, A→B→A, Löschung und identische Wiederkehr, Schutz bei Teilscans/Quarantäne/Traversalfehlern, konkurrierende Scans, Secretredigierung vor Ablage, Symlink-/Hardlink-/Kundenbereichsgrenzen, Mandantentrennung und einen Lauf mit 1.000 isolierten Markdown-Dateien. Enthaltene Befehle bleiben Daten; es wird kein externes Modell benötigt.
