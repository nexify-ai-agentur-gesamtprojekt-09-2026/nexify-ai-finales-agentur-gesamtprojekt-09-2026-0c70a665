# Band 02 · Gesamtspezifikation Plattform (Backend)

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

## 1 Schnitt
Modularer Monolith (ADR-0001): **Gateway** (HTTP, Auth, Idempotenz, Regelprüfung), **Worker** (pg-boss: Mails, Revolut, Nachtlauf, Nachholen), **MCP** (Werkzeuge für Agenten). Fachentscheidungen ausschließlich in `lib/` (23 Kerne, ohne Ein-/Ausgabe).

## 2 Verträge
| Vertrag | Quelle |
|---|---|
| HTTP-API 1.2.0, 44 Pfade | `api/openapi.yaml` |
| Ereignisse (HMAC, Idempotenz, 3 Versuche) | `docs/generiert/dienste.md` § Ereignisse |
| Datenmodell, Mandantentrennung | `db/migrations/001–008`, `config/mandanten.json`, ADR-0008 |
| Regeln R-01…R-21 | `lib/regelwerk.js`, `docs/generiert/regelverzeichnis.md` |

## 3 Pflichten jedes Endpunkts
1. Mandant aus Sitzung/Schlüssel, nie aus dem Körper; `set_config('app.mandant_id', …, true)` je Transaktion.
2. Schreibend: `Idempotency-Key` 16–128 Zeichen; gleiche Antwort bei Wiederholung.
3. Vor dem Seiteneffekt `regelwerk.pruefe`; 403 `REGEL_GESPERRT`, 202 `MENSCH_ERFORDERLICH`.
4. Fehlerformat `{ error: { code, message, feld? } }`; Listen mit `cursor`, `limit ≤ 100`.
5. Zeit `jetzt` wird dem Kern immer übergeben (Prüfprotokoll N2).
6. Validierung mit zod, erzeugt aus OpenAPI (ADR-0007).

## 4 Abläufe mit Kern
| Ablauf | Kern | Endpunkte |
|---|---|---|
| Modellanfrage | `anfrage-pipeline` → `prompt-cache`, `rag`, `gedaechtnis`, `modi`, `ki-muster` | `POST /requests` |
| API Prepaid | `prepaid` | `/credit…`, `/invoices…`, `/payments/revolut/webhook` |
| Registrierung, Angebot, Onboarding | `kundenwege` | `/auth/…`, `/offers/…`, `/onboarding…` |
| Posteingang, Versand | `posteingang`, `versand` | `/inbox…`, `/events` |
| Langläufe, Entscheidungen | `langlauf`, `entscheidungen` | `/runs…` |
| Lernen, Selbstheilung, Nachtlauf | `lernschleife`, `selbstheilung`, `nachtlauf`, `betriebskennzahlen` | `/learning…`, Worker |

## 5 Umsetzungsreihenfolge
B1–B14 nach `docs/08-gesamtloesung/01-backend-auftrag.md` – jeder Schritt mit rotem und grünem Testlauf, Gate, Rollback.
