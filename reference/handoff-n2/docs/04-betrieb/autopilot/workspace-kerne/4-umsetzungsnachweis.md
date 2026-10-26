# Stufe 4 · Umsetzungsnachweis · NX-WS-KERNE-2026-09

**Lauf** `42426a46-0b05-47d6-a174-e1ea2494dfae` · **Auftrag** Chat-Anweisung Pascal vom 27.09.2026 („Fahre … als Projektleiter fort … Starte“) = Ausführungsauftrag für den lokalen, reversiblen Teil des Plans · **Abschluss** 2026-09-27T21:41:14.995Z
**Grenzen des Auftrags:** nur Projektdateien. Kein Server, kein DNS, kein Deployment, keine Rechtstexte, keine Preise. Hartsperren unberührt.

## 1 · Vorgehen (Test zuerst)

| Schritt | Ergebnis |
|---|---|
| M-01 Gegenproben als Prüffälle anlegen (LL20–LL32, PE21–PE31) | angelegt |
| Rot-Lauf vor jeder Codeänderung | Langlauf **20/32** (12 rot) · Posteingang **22/31** (9 rot). Grün schon vorher: LL22, PE24, PE29 – sie sichern das Soll-Verhalten ab, das erhalten bleiben muss |
| Umsetzung M-02 … M-18 (ohne M-07-DB-Teil) | siehe § 2 |
| Grün-Lauf | Langlauf **32/32** · Posteingang **31/31** · alle 39 Altfälle weiter grün |
| Evidenzstufe | **E2** (automatisiert, Browser-Sandkasten, gleiche Module). Nicht E3: kein Produktivsystem, Rollback nur als Dateirücknahme |

## 2 · Maßnahmen – Stand

| Maßnahme | Befund | Stand | Nachweis |
|---|---|---|---|
| M-01 Regressionsfälle | WK-23 | **umgesetzt** | 25 neue Fälle |
| M-02 KI-Kennzeichnung gegen festen Satz `KI_HINWEIS` | WK-09 | **umgesetzt**; Wortlaut „Diese Nachricht wurde mit KI erstellt.“ ist **Vorschlag**, Entscheidung E-A offen | PE21, PE22 |
| M-03 Fallnummer nur „hoch“ bei passendem Absender | WK-10 | **umgesetzt** | PE23, PE24; Altfall „Nummer schlägt Domain“ grün, jetzt mit Sicherheit `niedrig` und Hinweis |
| M-04 Schemafehler sperrt bis Freigabe | WK-01 | **umgesetzt**; Freigabe setzt die Versuche des gesperrten Schritts zurück | LL20–LL22 |
| M-05 `budgetErhoehen` | WK-02 | **umgesetzt** | LL23–LL25 |
| M-06 Budgetpause vor `wartet` | WK-03 | **umgesetzt**; offene Freigabe bleibt in `wartetAuf` erhalten | LL26, LL27 |
| M-07 Lease als Schranke | WK-04 | **Kern umgesetzt**, DB-Sperre offen (Backend 6a). **Abweichung vom Plan:** Pflicht ohne Lease nur mit `leasePflicht: true` (in `config/langlauf.json` gesetzt); Kern-Standard bleibt aus, damit die reinen Prüffälle ohne Adapter laufen | LL28–LL30 |
| M-08 72-h-Grenze durchgesetzt | WK-05 | **umgesetzt** (`E_ZEIT`). Abweichung: der Kern wirft, den Laufzustand setzt der Adapter | LL31 |
| M-09 Zusammenfassung gekürzt | WK-06 | **umgesetzt** (Feld `gekuerzt`) | LL32 |
| M-10 Datum geprüft | WK-12 | **umgesetzt** | PE25 |
| M-11 keine Automatik bei SPF/DKIM/DMARC-Fehler | WK-13 | **umgesetzt** | PE26 |
| M-12 Sperrliste exakt | WK-15 | **umgesetzt** | PE27 |
| M-13 Posteingang fällt geschlossen aus | WK-17 | **umgesetzt**: ohne Kern keine Ordnerzuordnung, Ausgang „nicht geprüft“ | unabhängige Sichtprüfung angestoßen |
| M-14 Dienststatus `unbelegt` + `belegt_am` | WK-18 | **umgesetzt**: 11 Dienste von „vorhanden“ auf `unbelegt` (Soll bleibt in `soll`); Posteingang-Ansicht „Dienste“ zeigt dasselbe | Dateivergleich, `docs/generiert/dienste.md` |
| M-15 Kategorie ohne Absender, Newsletter-Regel | WK-11, WK-14 | **umgesetzt**; System-Erkennung nur noch über den Absender | PE28–PE30 |
| M-16 KI-Hinweis sprachlich | WK-21 | **umgesetzt** (Workspace, `librechat.yaml`-Auszug) | Mustersuche |
| M-17 Garantietabelle | WK-24 | **umgesetzt** | `langlauf-orchestrierung.md` |
| M-18 Zustellrate | WK-16 | **umgesetzt**; Schwellen als Hausregel gekennzeichnet | PE31 |
| M-19, M-20 | WK-08, WK-07 | offen – brauchen Adapter bzw. echte Modelle | – |
| M-21 Router-Werte, Health | WK-19 | **BLOCKED** – Server-/OpenBao-Zugang | – |
| M-22 Composio | WK-20 | **BLOCKED** – Entscheidung E-B / Rechtsprüfung | – |
| M-23 Löschfrist | WK-22 | offen – Entscheidung Pascal | – |

## 3 · Während der Umsetzung neu gefunden

| ID | Befund | Behandlung |
|---|---|---|
| **WK-25** | `tools/doku-generator.js` las `lauf.schritte`; das Feld heißt `pipeline`. Der Abschnitt „Langlauf“ im erzeugten Betriebshandbuch war deshalb immer leer. | behoben; Generator im Sandkasten mit unverändertem Code (nur Dateizugriff ersetzt) ausgeführt, `docs/generiert/*` neu erzeugt; Tabelle zeigt jetzt Status, Soll, Belegt am |
| **WK-26** | Die System-Regel prüfte auch Text und Betreff: eine Kundenmail „Problem mit Supabase-Login“ wäre `system` ohne Antwort geworden. | mit M-15 behoben (nur Absender) |
| WK-27 | Workspace führt den Gutachten-Skill als „veraltet“, obwohl er genutzt wird (W-04) | Entscheidung Pascal, nicht geändert |

## 4 · Nachbewertung der Kriterien (intern, E2)

| Kriterium | vorher | jetzt | Grund |
|---|---|---|---|
| C-01 KI-Kennzeichnung | Major | **Minor** | Prüfung wirksam; Wortlaut E-A und Regel GL-02 offen |
| C-02 Mensch entscheidet | Minor | **erfüllt (E2)** | LL20–LL22 |
| C-03 Kostenkontrolle | Major | **Major** | Kern erfüllt (LL23–LL27), aber Preise je Stufe fehlen (B-01) |
| C-04 Exklusivität | Major | **Minor** | Kern erzwingt Lease; DB-Sperre fehlt |
| C-05 Laufzeit, Kontext | Minor | **erfüllt (E2)** | LL31, LL32 |
| C-06 Zuordnung | Major | **erfüllt (E2)** | PE23, PE24 |
| C-07 Missbrauchsschutz | Minor | **erfüllt (E2)** | PE26, PE27 |
| C-08 Robustheit | Minor | **erfüllt (E2)** für den Kern; Oberfläche nach Sichtprüfung | PE25, M-13 |
| C-09 Belegter Ist-Stand | Major | **Major** | Widerspruch W-01 aufgelöst (Status ehrlich), Nachweis selbst fehlt weiter |
| C-10 Freigabe-Gate | nicht prüfbar | nicht prüfbar | unverändert |
| C-11 Drittland | offen | offen | unverändert |
| C-12 Regressionsschutz, Doku | Minor | **erfüllt (E2)**, CI fehlt | 25 neue Fälle, Doku angeglichen |

**Urteil bleibt `NOT_READY`** (2 Major: C-03, C-09 – beide hängen am selben Beweismittel B-01). Mit B-01 erreichbar: `CONDITIONALLY_READY` (intern). Keine Live-Freigabe.

## 5 · Rollback

Jede Datei in § 6 über die Projektversionen auf den Stand vor 2026-09-27T21:22:28Z zurücksetzen. Keine Daten- oder Schemaänderung, nichts außerhalb des Projekts.

## 6 · Geänderte Dateien (SHA-256 nach Umsetzung)

| Datei | SHA-256 |
|---|---|
| `lib/langlauf.js` | `11a697a7…0a7b3ce5` |
| `lib/posteingang.js` | `2342255d…f28939fe` |
| `tests/posteingang.test.js` | `9b5115d9…8d9a251f` |
| `config/integrationen.json` | `b15f757d…5e26566b` |
| `config/langlauf.json` | `706d155f…1d5cbee2` |
| `tools/doku-generator.js` | `c4a1956c…7187f322` |
| `docs/generiert/dienste.md` | `22ae7cc1…ef746792` |
| `docs/generiert/mcp.md` | `03220dd2…bbc7e397` |
| `docs/generiert/betriebshandbuch-kurz.md` | `d5922cd9…fb9a18d2` |
| `docs/03-backend/langlauf-orchestrierung.md` | `a733fc1c…18d62661` |
| `docs/02-frontend/webui-librechat.md` | `e0b4f334…5b7f7f2f` |
| `AGENT.md` | `71b6cd88…2d00878f` |
| `NeXify Posteingang.dc.html` | `3c5021ee…ae211bbf` |
| `NeXify Workspace.dc.html` | `664c389b…fe79d4d3` |
