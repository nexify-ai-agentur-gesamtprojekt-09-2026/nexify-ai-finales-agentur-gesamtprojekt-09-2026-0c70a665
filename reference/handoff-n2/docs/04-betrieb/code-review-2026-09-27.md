# Code-Review · Prüfkatalog · 27.09.2026

Grundlage: Skill `code-review-pruefkatalog`, ergänzt um `workflow-automatisierung-architekturprinzipien` (für Auftragssystem und API-Abrechnung) und `entwicklungszweig-abschluss-workflow`.
Gegenstand: 40 Dateien im Gestaltungsprojekt (Design Components, Hilfsskripte). Methode: skriptgestützte Mustersuche (Secrets, innerHTML, eval, externe fetch-Aufrufe, Speicherlöschung, offene Marker) + Einzelsichtung der Treffer. **Kein Git-Repository, keine Testsuite in dieser Umgebung** — der Befund ist E1 (Einzelbeobachtung), kein Abschlussnachweis.

## Befunde

| # | Bereich | Befund | Klasse | Maßnahme |
|---|---|---|---|---|
| R-01 | Sicherheit | Keine hartkodierten Schlüssel, kein `eval` in eigenem Code, keine externen `fetch`-Aufrufe | – | – |
| R-02 | Sicherheit | `innerHTML` nur in Starter-Hüllen (deck-stage, doc-page, image-slot) mit eigenem Markup; `eval` nur in `_ds_preview_runtime.js` (Vorschau-Werkzeug) | OBSERVATION | nicht in die Produktivcodebasis übernehmen |
| R-03 | Daten | Shop `wipeLocal()` löscht nur Schlüssel mit Präfix `teileklar.` | – | korrekt begrenzt |
| R-04 | Funktion | Formulare in Partnerportal (4), Nachbarschaftsportal (3), Kundenportal (1) haben `TODO(BACKEND)` + `data-api-endpoint`; Login und Bestellung sind reine Oberfläche | MAJOR für Livegang | Backend nach Auftragssystem umsetzen; bis dahin nicht als funktionsfähig ausweisen |
| R-05 | Wartbarkeit | Neun Altversionen der Agentur-Seite (v1–v9, je 1.350–1.670 Zeilen) liegen neben v10 | OBSERVATION | nach Endabnahme v10 archivieren (`archiv/`), Links zeigen bereits auf v10 |
| R-06 | Wartbarkeit | Shop: 5.780 Zeilen in einer Datei | OBSERVATION | bei Übergabe in Komponenten zerlegen (Produktcode, nicht Entwurf) |
| R-07 | Tests | Keine automatisierten Tests für Kostenrechner, Margen-Rechenkern, Formulare | MAJOR | Vitest-Fälle: Positiv, leer, Maximalwert, Sonderzeichen; Rechenkern gegen 3 Beispielrechnungen (Abnahme E1) |
| R-08 | Git-Hygiene | nicht prüfbar (kein Repository) | NOT_ASSESSED | Übergabe an GitLab, dort MR mit diesem Katalog |

## Architekturprinzipien für Auftragssystem und API-Abrechnung (Pflicht vor Umsetzung)

- **Durable Execution** für Guthaben-Buchung, Aufladung (Revolut), Rechnung: Schritte einzeln checkpointbar, Wiederaufnahme nach Absturz.
- **Idempotenz-Schlüssel** je Anfrage und je Zahlung — Wiederholung darf nie doppelt abbuchen oder doppelt mailen.
- **Timeouts + exponentielles Backoff** je externem Aufruf (9Router, Revolut, VIES).
- **Seiteneffekte in eigenen Schritten**, nicht im Orchestrierungscode.
- **Große Daten referenzieren** (Beleg-ID, Storage-Link), nicht im Workflow-Zustand.
- **Beobachtbarkeit**: jede Buchung mit Korrelations-ID ins Log; Wächter nach `waechter-bauen`.
- Muster: Anfrage → Orchestrator-Worker (Modellwahl Stufe 0/1/2) → sequenziell Buchung → Rechnung.
- Plattform: n8n (bestehend) für Benachrichtigungen; Buchungskern als eigener Dienst mit Transaktionen in Postgres, nicht in n8n.

## Abschluss-Workflow

**Tests fehlgeschlagen bzw. nicht vorhanden (R-07). Abschluss nicht möglich.** Die vier Optionen (lokal mergen, Merge Request, Branch behalten, verwerfen) werden erst nach grüner Testsuite im GitLab-Repository angeboten.

## Nicht angewendet

`manim-mathematische-animationen`: kein mathematischer Lehrinhalt im Auftrag. Passender Einsatz später: Erklärvideos für das Studienkolleg, wenn beauftragt.
