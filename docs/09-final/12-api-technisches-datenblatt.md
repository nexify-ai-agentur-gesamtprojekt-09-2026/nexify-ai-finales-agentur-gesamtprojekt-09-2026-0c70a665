# 12 · NeXify AI API – Beschreibung und technisches Datenblatt

**Stand 29.09.2026 · Entwurf.** Preise/Tarife: **zur Freigabe** (E1).

## Kurzbeschreibung
Ein Schlüssel, ein Guthaben, eine Rechnung: Zugriff auf die freigegebenen Modelle von NeXify AI über eine OpenAI-kompatible Schnittstelle, per Terminal (`nexify`) und im Browser. Prepaid statt Abo, Hosting Frankfurt, Kostenstellen mit eigenem Budget.

## Datenblatt
| Merkmal | Wert |
|---|---|
| Basis-URL | `https://api.nexifyai.cloud/v1` |
| Kompatibilität | OpenAI Chat Completions, Anthropic-Messages-Schema, Embeddings |
| Modelle | `nexify-one` (antwortet), `nexify-one+` (handelt, mit Rückfrage) – Router wählt Stufe 0/1/2 |
| Authentifizierung | `Authorization: Bearer nx_live_…` (Test: `nx_test_…`), Schlüssel je Kostenstelle |
| Abrechnung | Prepaid 50–5.000 € netto, Verbrauch je Anfrage in Cent, Monatsnachweis, Anzahlungsrechnung je Aufladung |
| Limits | Rate-Limit je Schlüssel, Budget je Kostenstelle, Warnung 50/80 %, Stopp weich/hart |
| Streaming | SSE (`stream: true`) |
| Fehler | JSON `{fehler:{code,text_de,feld?}}`; 401, 402 (Guthaben), 403, 429, 5xx |
| Idempotenz | Header `Idempotency-Key` für Buchung und Bestellung |
| Daten | Standard: keine Speicherung von Inhalten, nur Zähldaten; Region Frankfurt |
| Unterstützung | Ticket, SLA je Vertrag |

## Endpunkte
`POST /chat/completions` · `POST /messages` · `POST /embeddings` · `POST /estimate` · `GET /ledger` · `POST /topups` · `GET /usage?from&to&cost_center` · `POST /keys` · `DELETE /keys/{id}` · `POST /payments/revolut/webhook` (intern, HMAC).

## Beispiel
```bash
curl https://api.nexifyai.cloud/v1/chat/completions \
  -H "Authorization: Bearer $NX_KEY" -H "Content-Type: application/json" \
  -d '{"model":"nexify-one","messages":[{"role":"user","content":"Fasse dieses Angebot zusammen."}]}'
```
Terminal: `nexify login` → `nexify ask "…"` → `nexify run` (one+, fragt vor jeder Dateiänderung).

## Abrechnungsformel
`Preis = EK × (1 + Aufschlag)`; Aufschlag laut datierter Preisliste (E1 offen); intern 6 Nachkommastellen, Rechnung je Position auf Cent; EK in USD × EZB-Kurs des 1. Arbeitstags.

## Sicherheit und Recht
AVV nach Art. 28 DSGVO, TOM, Unterauftragsverarbeiter-Liste; KI-Kennzeichnung; Hochrisiko-Einsatz nur mit gesondertem Vertrag; Nutzungsbedingungen siehe `Rechtliches.dc.html#nutzung-one` und `API-Rechtliches.dc.html`.

## Offen
E1 Aufschlag · E3 Mindestaufladung · E4 Steuer Prepaid · E5 Verfall · Modellliste und Kontingente je Anbieter.
