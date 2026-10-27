# MCP-Discovery und Vertragsbereitschaft

`tools/automation/mcp_probe.py` inventarisiert ausschließlich über begrenzte,
lesende Streamable-HTTP-Protokollaufrufe. Es ruft kein `tools/call` auf.
JSON- und SSE-Antworten mit doppelten Objektschlüsseln oder nichtstandardisierten
Zahlen wie `NaN` werden als ungültig abgewiesen; sie können kein vollständiges
Inventar belegen.

`complete` und `inventory_complete` beschreiben nur erfolgreich abgeschlossene
Discovery einschließlich der angekündigten Pagination. Sie beweisen weder ein
gültiges JSON-Schema noch eine nutzbare Funktion, Kontoberechtigung oder
Integrationsabnahme. `contracts_validated` bleibt ausdrücklich `false`.

`tool_contracts` enthält eine getrennte Strukturdiagnose. Sie erkennt fehlende
oder für die sichere Anzeige nicht unterstützte Namen, doppelte Toolnamen,
fehlende/nicht objektförmige `inputSchema`-Wurzeln und offensichtlich fehlerhafte
Strukturen von `properties`, `required`, `additionalProperties` und `$schema`.
Sie ist kein vollständiger JSON-Schema-2020-12-Validator: verschachtelte Schemas,
Referenzen und unbekannte Dialekte benötigen eine gesonderte, versionsgebundene
Prüfung. Auch ein strukturell unauffälliges Tool erhält weder Ausführungsrecht
noch den Status „Vertrag validiert“.

Ungültige Toolstrukturen liefern `status=discovered_contracts_invalid`. Eine
vollständig gelesene Liste bleibt dabei als vollständiges Inventar erhalten;
die CLI beendet sich mit Exit 3. Fehlende Schemas bekommen keinen erfundenen
Hash eines leeren Schemas. Diagnosen enthalten Index und Fehlercode, keine
Toolbeschreibungen, Argumentdefaults, Ressourcen-URIs oder Zugangsdaten.

```sh
python3 -m unittest discover -s tests -p test_automation_mcp.py -q
```

Die Gegenproben nutzen echte lokale HTTP-Verbindungen einschließlich Pagination,
fehlender/nuller Schemas, Namensduplikaten, falscher Strukturen und des expliziten
Falls „Inventar gelesen, verschachteltes Schema noch nicht validiert“.
Die separate REA-STDIO-Instanz und echte Providerkonten benötigen weiterhin eigene
Laufzeit-/Vertragsnachweise.
