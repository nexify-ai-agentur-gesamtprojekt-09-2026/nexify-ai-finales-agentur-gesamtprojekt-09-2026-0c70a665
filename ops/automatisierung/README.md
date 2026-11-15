# Vorbereitete Automatisierungen

Vier Automatisierungen der Agentur, gebaut und getestet, **ausgeschaltet**. Beschreibung, Prozesslandkarte,
Einschaltliste, Rückwege und offene Entscheidungen: `docs/04-betrieb/prozess-automatisierung-2026-11-15.md`.

| Datei | Inhalt |
|---|---|
| `kern.py` | Schalter, Idempotenz (SQLite), begrenzte Wiederholung, Fehlerliste, Protokoll, Tagesgrenze |
| `zustellung.py` | Kanäle `datei` und `resend_intern` (nur an eine interne Adresse), Vorlagen |
| `tagesbericht.py`, `waechter.py`, `anfragen.py`, `fristen.py` | die vier Automatisierungen |
| `cli.py` | `status`, `lauf <kennung>`, `probe <kennung> --ausgabe <ordner>` |
| `vorlagen/` | Texte der Meldungen mit Platzhaltern; `antwort-entwurf.md` ist ein Entwurf für den Inhaber |
| `definitionen/` | Zeitplan-Definitionen und Vorlagen für Zeitgeber; nichts davon ist angelegt |
| `beispiele/` | Testdaten für den Probelauf |

Schalter und Grenzen: `config/prozess-automatisierung.json`. Tests: `tests/test_prozess_automatisierung.py`.

Regeln für Erweiterungen: keine Wirkung ohne Schalter und Idempotenzschlüssel; kein Empfänger als Parameter;
keine personenbezogenen Angaben im Zustandsordner; kein Modellaufruf, solange `llm.aufrufe_erlaubt` false ist.
Nur Standardbibliothek.
