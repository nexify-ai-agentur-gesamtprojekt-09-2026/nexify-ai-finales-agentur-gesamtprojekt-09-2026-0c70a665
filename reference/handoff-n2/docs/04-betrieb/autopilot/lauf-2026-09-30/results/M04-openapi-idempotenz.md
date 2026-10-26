# M-04 · OpenAPI-Lint + Idempotenz · Nachweis

**Zeit:** 2026-09-30T10:19:00Z · **Umgebung:** DUS, nexify-neu

## Ergebnis

| Prüfung | Wert |
|---|---|
| OpenAPI-Lint (`redocly lint api/openapi.yaml`) | valid, Exit 0 (77 Warnungen, 0 Fehler) |
| Rechenkern-Idempotenz (`vitest tests/rechenkern.test.js`) | 18/18, P-05 „doppelte Buchung bucht einmal“ |
| Gateway-Contract (`apps/gateway npm test`) | 24/24, Idempotency-Key fehlt → 400 |

## Beleg (Kern)

- `lib/rechenkern.js`: gleicher Idempotenz-Schlüssel → keine zweite Abbuchung.
- `apps/gateway/src/server.js`: schreibende Pfade ohne `Idempotency-Key` → 400
  (begründete Ausnahmen in `IDEM_FREI`: Login, Webhook, Ereignisbus, Regelprüfung, Schätzung).

## Grenze

77 OpenAPI-Warnungen sind operationId-Hinweise, nicht blockierend.
