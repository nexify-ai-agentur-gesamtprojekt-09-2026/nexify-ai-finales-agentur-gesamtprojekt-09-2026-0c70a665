# ADR-0008 · Mandantentrennung: gemeinsames Schema, mandant_id und erzwungene RLS

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Anlass:** Skill »SaaS Multi-Tenant Architecture«

## 1 · Befund (gemessen 28.09.2026)
- **Fehler:** Migration 005 verweist auf `mandant(id)`, die Tabelle existierte nicht – 005 wäre beim ersten Lauf gescheitert.
- **Lücke:** 10 Shop-Tabellen mit Kunden-, Bestell- und Einwilligungsdaten (customer, address, order, order_line, order_event, return_case, consent, data_request, workshop, workshop_job) ohne mandant_id und ohne RLS.
- **Lücke:** 4 Wissens-Tabellen mit RLS, aber ohne FORCE (Tabelleneigentümer umgeht sie) und ohne WITH CHECK (Schreiben in fremde Mandanten möglich).
- **Gut:** alle Primärschlüssel UUID, keine fortlaufenden IDs.

## 2 · Optionen
| | A · gemeinsames Schema + mandant_id + RLS | B · Schema je Mandant | C · Datenbank je Mandant |
|---|---|---|---|
| Pro | eine Migration, ein Pool, Hybrid-Suche über eine Tabelle | stärkere Trennung | vollständige Trennung, eigene Region |
| Contra | Fehler im Schutz betrifft alle – daher RLS als zweites Netz | Migrationen N-fach, Pool-Erschöpfung | Betrieb übersteigt Teamgröße |

## 3 · Entscheidung
**A.** Wurzeltabelle `mandant` (004b), `aktueller_mandant()` liest `app.mandant_id` und liefert bei fehlendem Wert NULL (keine Zeile sichtbar). Jede mandantenbezogene Tabelle: `mandant_id NOT NULL`, Index, RLS aktiv **und erzwungen**, Richtlinie mit **USING und WITH CHECK**. Katalog (Produkte, Fahrzeuge, Passung, Preise) ist global. Rollen: `nx_app` ohne Umgehung, `nx_migration` und `nx_auswertung` mit bypassrls und eigener Anmeldung. Eindeutigkeit von E-Mail und Bestellnummer je Mandant statt global.

## 4 · Durchsetzung
`tools/mandanten-pruefung.js` in CI: jede Tabelle muss in `config/mandanten.json` als global oder mandantenbezogen geführt sein; Gegenprobe ohne 007: 48 Befunde, mit 007: 0.

## 5 · Offen
Seed mit 3 Mandanten und Prüffall »A liest und schreibt B nicht« gegen eine echte Postgres (Backend-Auftrag B4). Die Migrationen sind nicht gegen eine Datenbank gelaufen.
