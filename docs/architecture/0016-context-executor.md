# Lokaler Context Executor: relevante Quellen vor der Arbeit

Stand 26.10.2026. Implementiert sind
[`tools/context_executor.py`](../../tools/context_executor.py) und
[`tests/test_context_executor.py`](../../tests/test_context_executor.py).
Der Name bezeichnet einen **Kontextselektor**, keinen Befehls- oder
Policyexecutor. Er arbeitet ohne LLM, Netzwerk, Credentials oder bezahlte API.

```sh
python3 tools/context_executor.py --task 'LLM Website Chat'
python3 tools/context_executor.py --task 'SEO Keyword Research und Copy'
```

Der Aufruf ist vor der jeweiligen fachlichen Arbeit wiederzuverwenden und bei
geändertem Auftrag erneut auszuführen. Eine dauerhafte automatische Einbindung
in Agent-Memory, Host-Middleware oder sämtliche Werkzeuge entsteht durch diese
Datei noch nicht; der entsprechende AGENTS-Verweis wird getrennt geprüft.

## Quellen und Relevanz

Immer geladen werden die festen aktiven Kernquellen:

- `AGENTS.md`;
- `config/llm-policy.json`, insbesondere exaktes Managed-Modell `1017` mit
  `high` und der getrennte Kunden-BYOK-Kontext;
- `config/source-boundaries.json` für Agentur-/Kunden-/Anwendungsgrenzen;
- `config/selfservice-policy.json` für Registrierung, Trial und Finanzgrenzen;
- `config/operating-model.json`, gezielt `go_to_market_sequence`.

Deterministische Aliasgruppen ergänzen feste Quellen für LLM/Chat/Website,
SEO/GEO/Copy, Auth, Selfservice, Medien, Betrieb und Standards. Es werden
Markdown-Abschnitte und benannte JSON-Felder ausgewählt. Die Auswahl enthält
ihre Begründung (`always_required_core_policy` oder konkrete Task-Aliasgruppe).
Die SEO-Gruppe bindet `config/seo-workflow.json` mit Recherche vor Copy,
Mess-/Qualitätsanforderungen und bestehender Go-to-Market-Reihenfolge ein.
Fehlt diese oder eine andere vorgesehene Datei, wird sie ausdrücklich als
fehlend aufgeführt; kein neuer Policyinhalt wird dafür erfunden.

Es gibt keinen frei wählbaren CLI-Quellpfad. Die Bibliotheksfunktion
`build_context(task, root=...)` besitzt einen Rootparameter ausschließlich für
vertrauenswürdige lokale Einbettung und isolierte Tests. Quellnamen stammen
aus festen Tabellen, niemals aus in der Task enthaltenen Dateinamen oder URLs.
Nur `AGENTS.md`, `config/` und `docs/` im gewählten Agenturroot sind zugelassen.
Andere Checkouts, A1/Affilinet, `reference/`, Kundendatenverzeichnisse,
Dependencies, versteckte Dateien und als Secrets/Credentials erkennbare
Dateinamen sind gesperrt. Symlinks einschließlich solcher in Root-Vorfahren
werden durch FD-basiertes `O_NOFOLLOW`-Lesen abgewiesen. Nur reguläre UTF-8-
Dateien innerhalb der Bytegrenzen werden gelesen; geänderte, leere und
ungültige strukturierte Quellen erscheinen als Fehler.

## Maschinenvertrag und überprüfbare Zitate

JSON enthält `task_context` mit `active_policy_refs`, `required_checks`,
`source_citations`, `candidate_constraints` und `missing_sources`.
Jedes Zitat führt Pfad, **1-basierte inklusive** Start-/Endzeile, vollständigen
Quell-SHA-256, Ausschnitt-SHA-256 und Relevanzbegründung. Bei späterer Nutzung
lassen sich Quelle und Ausschnitt genau zurücklesen und Hashabweichungen
erkennen. Geänderte Quellen erfordern eine neue Auswahl; alte Hashes sind
keine aktuelle Freigabe.

Bekannte Key-/Tokenmuster und Literalzuweisungen werden vor Ausgabe redigiert,
ebenso URL-Zugangsdaten. Secretdateien werden nicht erst zur Redaktionsprüfung
geöffnet. Bei Redaktion verweist `excerpt_sha256` auf den ursprünglichen
Quellausschnitt; `quote` enthält dessen redigierte Fassung. Zeilengrenzen
bleiben erhalten. Die Mustersuche ist kein Nachweis allgemeiner DLP-
Vollständigkeit für beliebige unbekannte Geheimnisformate; auch freigegebene
Dokumentationsquellen dürfen keine Secrets enthalten.

Die Klassifikation unterscheidet `fact`, Task (`task`), `constraint`,
`workflow` und **KANDIDAT** (`candidate_instruction`). Eine heuristisch erkannte
Anweisung aus zusätzlichem Wissen bleibt ein Kandidat. `fact` bezeichnet dabei
eine dokumentierte Aussage, keine verifizierte Runtime-Tatsache; deshalb steht
`claim_verified: false` an den Zitaten. Auf jeder zitierten
Klausel stehen `executable: false` und `grants_authority: false` – auch bei
aktiven Policyreferenzen. Aktive Regeln werden referenziert, nicht als neue
Rechte erzeugt. `required_checks` bedeutet erforderliche Prüfung mit Quelle,
**nicht**, dass Auth, Finanzkontrolle, SEO-Messung oder eine andere Prüfung
bereits ausgeführt wurde.

Promptinjection, Shellbefehle und Rollenbehauptungen in Texten werden weder
ausgeführt noch zu Systeminstruktionen befördert. Der Selektor verändert keine
Datei, Policy, Mitgliedschaft, Wallet, Veröffentlichung oder Providerbindung.
Die kodierten Modell-/Egressguards bleiben eigene technische Schutzgrenzen.

## Budgets und Fehler

Standardgrenzen: 512 KiB gelesene Quelldaten insgesamt, 256 KiB je Datei,
24 Zitate, 64 KiB Ausgabe und ein zusätzlicher konservativer
UTF-8-Bytebound von 32768 anstelle einer behaupteten Modell-Tokenmessung.
`--max-bytes`, `--max-records` und `--max-tokens` können die Ausgabe begrenzen.
Der UTF-8-Bytebound ist bewusst konservativ; er kennt keinen Tokenizer und
belegt keine tatsächliche Kontextkapazität eines Providers.

Bei fehlenden Quellen oder entfernten Zitaten gilt `status: partial` und
CLI-Exit **2**. `budget.dropped_citations` und gegebenenfalls
`selection_incomplete` zeigen Budgetverluste. Wenn selbst Metadaten nicht in
das Budget passen, kommt eine kleine `blocked`-Antwort statt übergroßer oder
scheinbar vollständiger Ausgabe. Nur `selected` liefert Exit **0**; das
bedeutet erfolgreiche begrenzte Auswahl, keine vollständig verstandene
Organisation oder bestandenes fachliches Gate.

Die Auswahl rekonstruiert nicht die Semantik aller etwa 9000 gemeldeten
LightRAG-Dateien. Sie prüft auch nicht den Inhalt vier anderer Server-MDs.
Hier fehlen deren verifizierte Quellbindung, Connector-/Credentialvertrag und
tatsächliches Retrieval. Eine andere Instanz bearbeitet native Ingestion
getrennt. Diese Implementierung behauptet keine Remote-Brain-Abnahme,
Hostinger-Verbindung oder dauerhafte Servermemory.

Die schmalen Regressionen prüfen echte Dateien und CLI, Source-/Zeilen-
Readback, Kern-/SEO-Relevanz, fehlende/ungültige Quellen, Symlink-/Kunden-
Grenzen, Secretredaktion, nicht ausgeführte Promptinjection sowie Byte-,
Record- und konservative Tokenbudgets. Ausführen:

```sh
python3 -m unittest discover -s tests -p test_context_executor.py -v
```
