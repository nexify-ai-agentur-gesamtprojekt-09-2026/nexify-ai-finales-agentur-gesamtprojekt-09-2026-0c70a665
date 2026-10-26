# API-Übergabe: Modellanfrage (Anfrage-Pipeline)

Stand 28.09.2026 · Übergabe an: Workspace (`NeXify Workspace v2.dc.html`), Posteingang, künftige API-Kunden-Oberfläche.

> **Umsetzungsstand, ehrlich:** Fertig und geprüft ist die Fachlogik `lib/anfrage-pipeline.js` (11/11 Prüffälle, nur im Browser, Suche und Modell nachgebildet). Der HTTP-Endpunkt `POST /v1/requests` ist **nur spezifiziert** (`api/openapi.yaml`), das Gateway ist noch nicht gebaut (Backend-Auftrag B6). Alles unter „Endpunkt“ beschreibt den Soll-Vertrag; alles unter „Antwortformen“ das tatsächlich geprüfte Verhalten des Kerns.

## Geschäftskontext
Jede Frage an eine KI – im Workspace, im Posteingang oder per API – läuft durch dieselbe Pipeline: Regeln prüfen, Gedächtnis und Wissen abrufen, Prompt cachefähig bauen, Modell fragen, jede Aussage gegen die Fundstellen prüfen. Die Oberfläche muss vier Ergebnisarten unterscheiden können, weil nur eine davon eine echte, belegte Antwort ist. **Fakten ohne Beleg gibt es nicht** (Regel R-08, R-20) – eine Antwort ohne Treffer ist ein gültiges Ergebnis, kein Fehler.

## Endpunkt

### POST /v1/requests
- **Zweck:** eine Modellanfrage stellen.
- **Auth:** Bearer-Schlüssel (API-Kunde) oder Sitzung (Workspace); Mandant kommt aus der Anmeldung, **nie** aus dem Request.
- **Pflicht-Header:** `Idempotency-Key` (16–128 Zeichen). Gleicher Schlüssel → gleiche Antwort, keine zweite Abrechnung.
- **Request:**
  ```json
  {
    "modell": "nexify-auto | nexify-lokal | nexify-guenstig | nexify-stark — Standard nexify-auto",
    "eingabe": "array — Nachrichten; die letzte Nutzernachricht ist die Frage",
    "kostenstelle": "string — Pflicht, bestimmt Budget",
    "maxKostenCent": "integer — optional, Obergrenze dieser Anfrage"
  }
  ```
- **Response 200 – belegte Antwort:**
  ```json
  {
    "ki": true,
    "art": "antwort",
    "modus": "fehlersuche",
    "text": "Im Partnerportal unter »Gutscheine« einlösen [F1].\n\nDiese Antwort wurde mit KI erstellt …",
    "quellen": [{ "id": "F1", "titel": "Handbuch Gutscheine", "datum": "27.09.2026" }],
    "kostenCent": 1,
    "stufe": 1,
    "traceId": "tr_…"
  }
  ```
- **Response 200 – ohne Antwort** (`art` = `keine_info` | `verworfen` | `ausfall` | `abgewiesen`): gleiche Form, `quellen: []`, `kostenCent` 0 wenn kein Modell gefragt wurde.
- **Fehler** (Form `{ "error": { "code", "message" } }`):
  - `402 GUTHABEN` – Budget der Kostenstelle erschöpft (vor dem Modellaufruf geprüft).
  - `403 REGEL_GESPERRT` – z. B. `#stopp` aktiv, Region außerhalb EU, Antwort verletzt eine Regel. `message` nennt die Regel-ID.
  - `422 VALIDIERUNG` – Pflichtfeld fehlt, `Idempotency-Key` zu kurz.
  - `429` – Ratenbegrenzung je Mandant; `Retry-After` beachten.
- **Hinweise:** Keine Pagination. Streaming ist geplant, aber nicht im Vertrag – bis dahin eine vollständige Antwort.

## Antwortformen (geprüftes Verhalten des Kerns)

| `art` | Wann | Modell gefragt? | Was die Oberfläche zeigt | Prüffall |
|---|---|---|---|---|
| `antwort` | Treffer gefunden, jede Fundstelle belegt | ja | Text + Quellenliste + Aktion „≋ Ablauf“ | AP01 |
| `keine_info` | Weder Wissen noch Gedächtnis relevant | **nein** | „Dazu liegt nichts Belastbares vor“ – kein Fehlerstil | AP04 |
| `verworfen` | Modell nannte eine Fundstelle, die es nicht gibt | ja | wie `keine_info`; intern Lernsignal | AP02 |
| `ausfall` | Modell nicht erreichbar | versucht | „Die KI ist gerade nicht erreichbar. Ihre Anfrage ist gespeichert …“ | AP10 |
| `abgewiesen` | Anweisung an das System erkannt, **nur Kundenmandanten** | **nein** | Bitte um Umformulierung | AP09 |

Gesperrt (Regel, `#stopp`, Budget) ist **kein** `art`, sondern ein Fehler (403/402) – AP03, AP05, AP06.

## Enums & Konstanten

| Feld | Wert | Anzeigetext |
|---|---|---|
| `modus` | `brainstorm` · `umsetzen` · `fehlersuche` · `review` · `vermitteln` · `ausliefern` | Brainstorm · Umsetzen · Fehlersuche · Review · Vermitteln · Ausliefern |
| `stufe` | `0` · `1` · `2` | Lokal · Günstig · Stark |
| `modell` | `nexify-auto` … | Automatisch · Lokal · Günstig · Stark |

## Validierungsregeln (für die UX spiegeln)
- Frage nicht leer; Steuer- und unsichtbare Zeichen werden serverseitig entfernt – nicht clientseitig „reparieren“.
- `#stopp` im Text stoppt sofort; die Oberfläche soll das vorher sichtbar machen.
- `maxKostenCent` ≤ Restbudget der Kostenstelle, sonst 402.

## Geschäftslogik & Randfälle
- **Der KI-Hinweis steht immer im `text`** (Art. 50 KI-VO). Nicht abschneiden, nicht separat erzeugen.
- **Quellen nur, wenn belegt:** `quellen` enthält ausschließlich Fundstellen, die im Text zitiert und geprüft sind.
- **Mandant `nexify` (intern)** wird bei Injektionsverdacht nicht abgewiesen, sondern nur markiert – Kundenmandanten schon.
- **Modus:** ausdrücklich gewählt → `#tag` → Satz → Stichwörter → `umsetzen`. Fehler gewinnt vor Bauauftrag.
- **Spur und Trace sind intern:** Die Schrittliste (`spur`) geht nur an den Workspace-Reiter „Ablauf“ und nach Langfuse (maskiert), **nie** an API-Kunden.

## Integrationshinweise
- **Ablauf:** senden → Ladezustand „Agent denkt …“ → `art` auswerten → bei `antwort` Quellen und „≋ Ablauf“ zeigen.
- **Optimistic UI:** nur für die eigene Nachricht; die Antwort nie vorwegnehmen.
- **Bewertung ▲/▼:** geht als Langfuse-Score mit `traceId` in die Warteschlange (Worker überträgt); ▼ wird Lernsignal.
- **Caching:** keine HTTP-Caches auf `/v1/requests`; Wiederholung nur über denselben `Idempotency-Key`.

## Testszenarien
1. **Happy Path:** „Wie löse ich einen Gutschein ein?“ → `art: antwort`, eine Quelle F1.
2. **Kein Treffer:** Frage ohne Wissensbezug → `art: keine_info`, `kostenCent: 0`.
3. **Erfundene Quelle:** Modell zitiert F4 → `art: verworfen`.
4. **Gesperrt:** `#stopp` → 403 `REGEL_GESPERRT`.
5. **Budget:** Restbudget 0 → 402 `GUTHABEN`.
6. **Ausfall:** Modell-Timeout → 200 `art: ausfall`, kein Absturz der Oberfläche.

## Offene Fragen / TODOs
- [ ] **Vertragslücke Spezifikation ↔ Kern:** `KiAntwort` in `api/openapi.yaml` verlangt `stufe` und `kostenCent`, kennt aber `art`, `modus` und `traceId` nicht. Der Kern liefert `stufe` noch nicht (setzt der Modell-Router) und bei `keine_info`/`abgewiesen` kein `kostenCent`. Vorschlag: Schema um `art` (Pflicht), `modus`, `traceId` erweitern; Gateway setzt `kostenCent: 0` und `stufe` aus dem Router. **Nicht eigenmächtig geändert** – Vertragsänderung braucht Freigabe.
- [ ] Soll `modus` an API-Kunden gehen oder nur intern sein?
- [ ] Streaming-Vertrag (SSE-Ereignisse) fehlt.
- [ ] Nachholen bei `ausfall` baut der Worker noch nicht.
