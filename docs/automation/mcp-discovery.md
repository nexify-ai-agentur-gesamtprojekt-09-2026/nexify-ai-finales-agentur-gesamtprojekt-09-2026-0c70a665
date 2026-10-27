# MCP-Discovery und Vertragsbereitschaft

`tools/automation/mcp_probe.py` inventarisiert ausschließlich über begrenzte,
lesende Streamable-HTTP-Protokollaufrufe. Es ruft kein `tools/call` auf.
JSON- und SSE-Antworten mit doppelten Objektschlüsseln oder nichtstandardisierten
Zahlen wie `NaN` werden als ungültig abgewiesen; sie können kein vollständiges
Inventar belegen.

`complete` beschreibt nur eine erfolgreich abgeschlossene Discovery einschließlich
der angekündigten Pagination. Es beweist weder ein gültiges JSON-Schema noch eine
nutzbare Funktion, Kontoberechtigung oder Integrationsabnahme. Tooldefinitionen
werden in diesem Stand ausschließlich gehasht und inventarisiert; eine vollständige
Schema- oder Funktionsvalidierung ist damit ausdrücklich nicht erfolgt.

```sh
python3 -m unittest discover -s tests -p test_automation_mcp.py -q
```

Die Gegenproben nutzen echte lokale HTTP-Verbindungen einschließlich Pagination,
falscher Protokollversionen, Redirects, Zeitgrenzen und mehrdeutiger JSON-/SSE-
Antworten.
Die separate REA-STDIO-Instanz und echte Providerkonten benötigen weiterhin eigene
Laufzeit-/Vertragsnachweise.
