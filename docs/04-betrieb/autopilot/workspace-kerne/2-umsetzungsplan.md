# Stufe 2 · Umsetzungsplan · Workspace-, Langlauf- und Posteingangskerne

**Lauf** `42426a46-0b05-47d6-a174-e1ea2494dfae` · **Rolle** agent2 (Phasenemulation) · **Grundlage ausschließlich** Stufe 1 `1-gutachten.md` (Hash in `laufakte.json`) · **Status** ENTWURF

> **Freigabe dieses Plans ist keine Ausführungsfreigabe.** Jede Maßnahme braucht einen eigenen Auftrag. Nichts hier wurde umgesetzt. Dieser Plan ergänzt keine Tatsachen über Stufe 1 hinaus; wo er schätzt, steht es als Annahme da.

## 1 · Grundsätze

- **Test zuerst:** Jede Code-Maßnahme beginnt mit dem roten Prüffall aus der Gegenprobe in Stufe 1 (M-01). Erst dann ändern.
- Nur lokale, reversible Änderungen an `lib/`, `tests/`, `config/`, `docs/` und den zwei Oberflächen. **Keine** Live-Systeme, kein DNS, kein Deployment.
- Rollback je Maßnahme: vorherige Dateifassung wiederherstellen (Projektversionen bzw. Git-Revert, sobald das Repository existiert).
- Aufwand als Spanne in Personenstunden (Ph), grobe Schätzung (Annahme A-02).

## 2 · Maßnahmen

| ID | Befund | Maßnahme | Prio | Rolle | Aufwand | Abhängig | Akzeptanz (Prüffall) | Nachweis | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| **M-01** | WK-23 | Gegenproben X01–X06, Y01–Y08 als Prüffälle anlegen (`LL20–LL28`, `PE21–PE30`), zunächst **rot** | P0 | Entwicklung | 2–4 Ph | – | alle neuen Fälle laufen und scheitern wie in Stufe 1 protokolliert | Testausgabe mit Zeitstempel | Testdateien zurücksetzen |
| **M-02** | WK-09 | KI-Kennzeichnung gegen **festen, freigegebenen Hinweissatz** prüfen (Konstante `KI_HINWEIS`), nicht gegen ein Teilwort | P0 | Entwicklung; Wortlaut Pascal | 1–2 Ph | M-01; Wortlaut (Entscheidung E-A) | „Skizze“ ohne Hinweis → Fehler; Text mit `KI_HINWEIS` → ok | PE21, PE22 grün | Datei zurücksetzen |
| **M-03** | WK-10 | Fallnummer ergibt nur dann „hoch“, wenn der Absender eine bekannte Person dieses Kunden ist oder von einer Kundendomain schreibt; sonst „niedrig“, Aktion `pruefen`, keine Auto-Antwort | P0 | Entwicklung | 2–3 Ph | M-01 | Y03 → Sicherheit `niedrig`, Antwort `entwurf`; bestehender Test „Nummer schlägt Domain“ bleibt grün | PE23, PE24 | Datei zurücksetzen |
| M-04 | WK-01, W-03 | `scheitere(schema)` sperrt den Schritt bis `freigeben()`; `bereit()` liefert nichts, solange der Lauf `wartet` | P1 | Entwicklung | 1–2 Ph | M-01 | X01 → `bereit()` leer, `starte()` → `E_REIHENFOLGE`; nach Freigabe startbar | LL20 | Datei zurücksetzen |
| M-05 | WK-02 | `budgetErhoehen(lauf, wer, neuCent, jetzt)`: nur `pascal`, höchstens `budgetCentMax` (5.000), mit Logeintrag | P1 | Entwicklung | 1 Ph | M-01 | X02 → nach Erhöhung `fortsetzen` ok; Agent → `E_RECHT`; 5.001 → `E_BUDGET` | LL21, LL22 | Datei zurücksetzen |
| M-06 | WK-03 | Budgetpause hat Vorrang vor `wartet` | P1 | Entwicklung | 0,5–1 Ph | M-01 | X06 → `pausiert` | LL23 | Datei zurücksetzen |
| M-07 | WK-04 | Lease wird Pflicht: `starte/erledige/scheitere` nehmen `besitzer`, werfen `E_LEASE` ohne gültigen Lease; `leaseFreigeben()` ergänzen. Datenbankseitig zusätzlich `update … where version = $alt` | P1 | Entwicklung | 2–4 Ph (Kern) + Backend-Anteil in Schritt 6a | M-01; Backend 6a für den DB-Teil | fremder Besitzer → `E_LEASE`; eigener → ok; nach Ablauf übernehmbar | LL24–LL26 | Datei zurücksetzen |
| M-08 | WK-05, WK-24 | `starte()` prüft `zeitUeberschritten`, wirft `E_ZEIT`, Lauf → `wartet` | P1 | Entwicklung | 0,5–1 Ph | M-01 | X04 → `E_ZEIT` | LL27 | Datei zurücksetzen |
| M-09 | WK-06 | Zusammenfassung auf `zusammenfassungMaxTokens` begrenzen; `E_FEST`, wenn fest + Zusammenfassung > Grenze | P1 | Entwicklung | 1 Ph | M-01 | X05 → `genutzt ≤ grenze` oder Fehler | LL28 | Datei zurücksetzen |
| M-10 | WK-12 | Datum prüfen; ungültig → Eingangszeit = jetzt + Hinweis „Datum unlesbar“ | P1 | Entwicklung | 0,5 Ph | M-01 | Y04 → kein Absturz, Hinweis gesetzt | PE25 | Datei zurücksetzen |
| M-11 | WK-13 | Auto-Bestätigung nur, wenn SPF, DKIM, DMARC nicht `fail` sind | P1 | Entwicklung | 0,5–1 Ph | M-01 | Y05 → `entwurf` | PE26 | Datei zurücksetzen |
| M-12 | WK-15 | Sperrliste: exakte Adresse, exakte Domain oder Subdomain mit Punkt davor | P1 | Entwicklung | 0,5 Ph | M-01 | Y08 → nicht gesperrt; `x@mail.boese.de` → gesperrt | PE27 | Datei zurücksetzen |
| M-13 | WK-17 | Posteingang fällt geschlossen aus: ohne Kern Hinweisleiste, Ausgang „nicht geprüft“, keine Ordnerzuordnung | P1 | Gestaltung/Entwicklung | 1–2 Ph | – | Kern-Import künstlich scheitern lassen → Hinweis sichtbar, kein „ok“ | Bildschirmfoto + Prüfprotokoll | Datei zurücksetzen |
| M-14 | WK-18, W-01 | Statusfeld in `integrationen.json` auf `unbelegt` setzen, bis ein Health-Protokoll mit Datum vorliegt; neues Feld `belegt_am` | P1 | Betrieb | 0,5 Ph | – | kein Dienst „vorhanden“ ohne `belegt_am` | Dateivergleich | Datei zurücksetzen |
| M-15 | WK-11, WK-14 | Kategorie aus Betreff und erstem Absatz, ohne Absenderadresse; `List-Unsubscribe` → `newsletter` vor allen Regeln | P2 | Entwicklung | 1–2 Ph | M-01 | Y02 → `newsletter`; Y06 → `anfrage` | PE28, PE29 | Datei zurücksetzen |
| M-16 | WK-21 | KI-Hinweis sprachlich korrigieren (Workspace, `librechat.yaml`-Auszug), Wortlaut = `KI_HINWEIS` aus M-02 | P2 | Gestaltung | 0,5 Ph | E-A | ein Wortlaut an allen Stellen | Mustersuche | Datei zurücksetzen |
| M-17 | WK-24, W-02 | Garantietabelle in `langlauf-orchestrierung.md` nach M-07/M-08 an den Code angleichen | P2 | Entwicklung | 0,5 Ph | M-07, M-08 | jede Garantie hat einen grünen Prüffall | Doku ↔ Testliste | Datei zurücksetzen |
| M-18 | WK-16 | Nenner = max(gesendet, zugestellt + bounce); Schwellen mit Quelle und Datum belegen oder als Hausregel kennzeichnen | P3 | Entwicklung | 0,5 Ph | M-01 | Y07 → Rate ≤ 1 | PE30 | Datei zurücksetzen |
| M-19 | WK-08 | Adapter übergibt echte Zufallszahl; Kern bleibt deterministisch testbar | P3 | Entwicklung | 0,5 Ph | Backend 6a | Adapter-Test: zwei Aufrufe unterschiedlich | Test | – |
| M-20 | WK-07 | Tokenschätzung je Modellstufe gegen den echten Zähler messen, Faktor in Konfiguration | P3 | Entwicklung | 1–2 Ph | **M-21** | Abweichung ≤ 10 % bei 20 Stichproben (Annahme A-03) | Messprotokoll | Faktor zurücksetzen |
| M-21 | WK-19 | Router-URL, Modellnamen, Preise je Stufe beschaffen; `/health` je Stufe 60 s messen | P0 für das Gate | Pascal / Betrieb | 1–2 Ph | Server- und OpenBao-Zugang | 13 Abrufe `200` je Stufe, Preise mit Quelle | Health-Protokoll | Werte zurück auf Platzhalter |
| M-22 | WK-20 | Entscheidung Composio: bis AVV/SCC und Transferbewertung vorliegen, keine personenbezogenen Daten; Rechtsprüfung extern | P1 | Pascal + Rechtsberatung | extern | – | schriftliche Entscheidung im Entscheidungsprotokoll | Protokolleintrag | – |
| M-23 | WK-22 | Löschfrist für Chats/Gedächtnis festlegen; Browser-Speicher nicht in Produktion übernehmen | P2 | Pascal | 0,5 Ph | – | Frist steht in `webui-librechat.md` und Datenschutzerklärung | Dateivergleich | – |

## 3 · Reihenfolge

```
M-01 (rote Tests)
  ├─► M-02, M-03                         P0 · Kommunikation nach außen
  ├─► M-04 … M-12                        P1 · Kerne
  └─► M-15, M-18                         P2/P3
M-13, M-14                               unabhängig, jederzeit
M-07 + M-08 ─► M-17                      Doku erst nach Code
Entscheidung E-A ─► M-02, M-16
M-21 ─► M-20                             braucht echte Modelle
M-22, M-23                               Entscheidungen Pascal, parallel
```

## 4 · Entscheidungen, die dieser Plan braucht

| ID | Frage | Für | Vorschlag (nicht verbindlich) |
|---|---|---|---|
| E-A | Wortlaut des KI-Hinweises in Mails und Chat | M-02, M-16 | „Diese Antwort wurde mit KI erstellt und von NeXify AI geprüft.“ bzw. ohne „geprüft“, wenn nicht geprüft |
| E-B | Composio ja/nein für personenbezogene Daten | M-22 | nein, bis Rechtsprüfung vorliegt |
| E-C | Löschfrist Chats | M-23 | Pascal |

Offen aus früheren Läufen und hier berührt: **GL-02** (interne Regel „nie sagen, dass KI“) – M-02 setzt voraus, dass diese Regel aufgehoben ist.

## 5 · Annahmen

| ID | Annahme | Prüfung |
|---|---|---|
| A-02 | Aufwandsspannen sind grobe Schätzungen für eine Person mit Kenntnis des Codes | nach M-01 nachschätzen |
| A-03 | 10 % Toleranz für die Tokenschätzung genügt, weil `festMaxAnteil` 0,5 Reserve lässt | mit M-20 bestätigen |

## 6 · Bewusst nicht geplant

- Kein Umbau auf eine andere Orchestrierungsplattform: Stufe 1 enthält keinen Befund, der das begründet.
- Keine Maßnahme zu Last, Transport, Sicherung: kein Dienst vorhanden (Stufe 1, § 1). Diese Punkte gehören in das Freigabe-Gate je Phase.
- Keine Maßnahme zu WK-22 im Code: im Prototyp angemessen; nur Entscheidung M-23.

## 7 · Übergabe an Stufe 3

Status **PARTIAL**: jede Maßnahme führt auf einen Befund zurück; alle 24 Befunde sind abgedeckt. Eingeschränkt: M-02/M-16 hängen an E-A, M-20/M-21 an Zugängen, M-22 an Rechtsberatung. **Auswirkung:** Die zugehörigen Kriterien in Stufe 3 können höchstens „bedingt“ werden.
