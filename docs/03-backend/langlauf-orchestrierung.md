# Langlauf-Orchestrierung · Aufgabe → Artefakt → Subagenten → Gesamtlösung

**Stand 27.09.2026.** Kern umgesetzt und geprüft: `lib/langlauf.js`, 32/32 Prüffälle (LL20–LL32 aus Gutachten NX-WS-KERNE-2026-09) (`tests/langlauf.test.js`). Konfiguration: `config/llm-verbindungen.json`, `config/langlauf.json`. Oberfläche: `NeXify Workspace.dc.html` (Auftragsmodus).

## Warum kein „Agentenmodus, der immer wieder stoppt“
Ein Chat-Agent hält den Zustand im Kontextfenster. Wird es voll oder bricht die Verbindung ab, ist der Lauf verloren. Hier besitzt der **Director** den Zustand in der Datenbank. Modelle bekommen je Schritt nur den gebauten Kontext und liefern ein Ergebnis. Dadurch:
- Abbruch einer Verbindung kostet einen Schritt-Versuch, nicht den Lauf.
- Kontextfenster läuft nie voll: feste Schichten (S1–S3, gecacht) + Fundstellen + neuester Verlauf, Älteres wird verdichtet.
- Läufe über Stunden und Tage: Checkpoints, Lease, Heartbeat, Wiederaufnahme am letzten Schritt.

## Ablauf
```
Chat-Eingabe ──► Auftragsakte (Artefakt) anlegen
                 ├─► Sammler      Wissen aus Brains, MD, Dateien, Chats      ┐ parallel
                 └─► Rechercheur  Bestpraxis, 3 Ebenen, ≥ 8 Quellen, ≤ 30 T ┘
                        ▼
                 Analyst     Anforderungsprofil (Vorlage)
                        ▼
                 Architekt   Vergleich ≥ 3 Lösungen je Anforderung, Muster übernehmen
                        ▼
                 Director    Gesamtlösung: WebUI-Entwurf, Plan, Tests, Gate
                        ▼
                 wartet auf Pascal → Freigabe Umsetzung
```

## Garantien (im Kern geprüft)
| Garantie | Prüffall |
|---|---|
| Reihenfolge wird erzwungen | LL02, LL06 |
| Leeres Ergebnis gilt nicht als fertig | LL07 |
| Fehler brauchen eine Klasse (zeit, netz, modell, schema) | LL08 |
| Schemafehler sperrt den Schritt bis zur Freigabe, kein automatischer Neustart | LL20, LL21, LL22 |
| Wiederholung bucht nicht doppelt | LL09 |
| Budget überschritten → Pause, nicht Weiterlaufen, auch im letzten Schritt | LL10, LL26 |
| Budget erhöhen nur durch Pascal, höchstens 5.000 ct; danach zurück zur offenen Freigabe | LL23, LL24, LL25, LL27 |
| Höchstens 3 Versuche je Schritt | LL11 |
| Nur ein Director je Lauf: `lease` prüft Übernahme; `starte/erledige/scheitere` prüfen den Besitzer; mit `leasePflicht` (Konfiguration: an) ohne Lease kein Schritt | LL12, LL13, LL28, LL29, LL30 |
| Backoff exponentiell, gedeckelt | LL14, LL15 |
| Kontext bleibt im Fenster, Zusammenfassung wird gekürzt | LL16, LL17, LL32 |
| #stopp und Fortsetzen am selben Schritt | LL18 |
| Kein endloser Lauf: nach 72 h startet kein Schritt mehr (`E_ZEIT`) | LL19, LL31 |
| Nur Pascal gibt frei | LL04, LL05 |

## Was von hier aus nicht prüfbar ist
| Punkt | Warum | Wer |
|---|---|---|
| 9router erreichbar, Schlüssel gültig | kein Zugriff auf Server/OpenBao aus der Entwurfsumgebung | Betrieb, Health `/health` |
| Modellnamen und Preise je Stufe | stehen als `${…}` in der Konfiguration | Pascal |
| Postgres-Tabellen für Läufe | Backend noch nicht gebaut | Umsetzung Schritt 5 |
| Rechercheur-Zugang (Websuche EU) | Anbieter noch nicht gewählt | Pascal |

Diese Punkte gelten als **unbelegt** und blockieren das Freigabe-Gate.

## Tabellen (Backend)
```sql
create table laeufe (id text primary key, aufgabe text not null, zustand text not null, version int not null,
  budget_cent int not null, verbraucht_cent int not null default 0, max_stunden int not null default 72,
  lease_besitzer text, lease_bis timestamptz, erstellt timestamptz not null default now());
create table schritte (lauf_id text references laeufe(id), id text, zustand text not null, versuche int not null default 0,
  schluessel text unique not null, ergebnis_ref text, fehler text, primary key (lauf_id, id));
create table ereignisse (lauf_id text references laeufe(id), t timestamptz not null default now(), e text not null);
```
Jede Zustandsänderung: `update … where version = $alt` (optimistische Sperre). Die Lease-Prüfung im Kern ersetzt diese Sperre nicht: zwei Prozesse mit veraltetem Stand würden sonst beide schreiben.
