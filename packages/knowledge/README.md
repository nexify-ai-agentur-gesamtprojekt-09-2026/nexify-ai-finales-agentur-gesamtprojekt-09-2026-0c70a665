# packages/knowledge · Wissensport

Stand 14.11.2026 · **Baustein, kein Betrieb.** Python (Standardbibliothek, lauffähig ab 3.12),
keine Netz- und keine Modellaufrufe, keine Abhängigkeit mit Konto oder Kosten.

## Schnittstelle

```python
from nexify_knowledge import ArbeitsspeicherWissen, Mandant, Wissenseintrag, Herkunft, Inhaltsart

port = ArbeitsspeicherWissen()
m = Mandant("mandant-a")                       # serverseitig aus Sitzung/Mitgliedschaft, nie aus der Anfrage
port.speichern(m, Wissenseintrag("…", Herkunft("handbuch/v1", zeitpunkt, Inhaltsart.DOKUMENT)))
port.abrufen(m, "Frage", limit=5)              # Treffer = Dateninhalt + Herkunft
port.loeschen(m, Loeschauswahl.person("p-1"))  # Eintrag | Gespräch | Person | abgelaufen | Mandant
port.exportieren(m, betroffene_person="p-1")   # Auskunft / Übertragbarkeit
port.zustand()
```

| Regel | Wo erzwungen |
|---|---|
| Mandant ist erstes Pflichtargument; nur der Typ `Mandant` gilt (kein Text, kein `*`, keine Liste) | `typen.mandant_pruefen`, feste Methoden in `port.WissensPort` |
| Kein mandantenübergreifendes Lesen: es gibt keine solche Operation; liefert eine Implementierung fremde Sätze, bricht die Basisklasse mit `Mandantenverletzung` ab | `port.WissensPort._eigen` |
| Öffentliche Operationen sind nicht überschreibbar | `WissensPort.__init_subclass__` |
| Herkunft (Quelle, Zeitpunkt mit Zeitzone, Art Dokument/Chat/Notiz) ist Pflicht | `typen.Herkunft` |
| Chat: Rechtsgrundlagen-Kennzeichen und Löschfrist Pflicht; Einwilligung braucht Verweis | `typen.Wissenseintrag` |
| Schreiben → Rücklesen → Inhaltsvergleich; gleicher Eintrag zweimal = ein Eintrag | `WissensPort.speichern` |
| Abgelaufene Inhalte werden nicht mehr ausgeliefert; Löschung mit Gegenprobe | `WissensPort.abrufen`, `.loeschen` |
| Gespeicherter Inhalt ist `Dateninhalt` (Rolle `daten`), für Prompts nur über `fuer_prompt()` | `typen.Dateninhalt` |

## Implementierungen

- `ArbeitsspeicherWissen` – für Tests und Entwicklung; nicht dauerhaft, Wortüberdeckung statt Vektorsuche.
- `CogneeAdapter` – **Gerüst.** Regeln und Datensatz-Zuordnung (`t-<mandant>--<art>`) sind gegen eine
  Attrappe getestet. Die echte Anbindung (Naht `CogneeTransport`) fehlt absichtlich. Ohne vollständige
  `CogneeKonfiguration` verweigert der Adapter; es gibt keinen Standardwert. Einbetter muss lokal sein,
  ein Sprachmodell geht nur über den eigenen Router oder wird ausdrücklich abgewählt (`OHNE_SPRACHMODELL`).

## Vertragstests

`nexify_knowledge.vertrag.WissensPortVertrag` ist ein Mixin für `unittest.TestCase`; jede neue
Implementierung muss es bestehen (siehe `tests/test_knowledge_port.py`).

```sh
python3 -m unittest discover -s tests -p test_knowledge_port.py
```

## Bewusst nicht enthalten

Echter Cognee-Betrieb, Vektorsuche, dauerhafte Ablage, HTTP-Fassade, Schwärzung von Inhalten vor dem
Speichern, gemeinsames Agenturwissen über Mandanten hinweg, Migration von AgentMemory/LightRAG
(Altbestand wird gesichert und archiviert, nicht gelöscht). Kein Rechtsrat: Kennzeichen sind Metadaten.
