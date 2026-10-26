# M-03 · Postgres 16 + pgvector + RLS-Test · Nachweis

**Zeit:** 2026-09-30T10:17:00Z · **Umgebung:** DUS, `nx-pg-test` (pgvector/pgvector:pg16)

## Ergebnis

| Prüfung | Wert |
|---|---|
| Postgres + pgvector | `pgvector/pgvector:pg16` Up |
| Statische Mandantenprüfung | 56 Tabellen, 0 Befunde (`node tools/mandanten-pruefung.js`) |
| Live-RLS-Test (Rolle `nx_test_app`, kein Superuser) | 43 RLS-Tabellen, 0 Befunde (`node tools/rls-pruefung.mjs`) |

## Nachweis-Befehle

```bash
cd /opt/ai-stack/nexify-neu
node tools/mandanten-pruefung.js
NX_TEST_DATABASE_URL="postgres://nx_test_app:nx_test_pw@127.0.0.1:5499/nx_test" node tools/rls-pruefung.mjs
```

Beide Exit-Code 0.

## Grenze

Testdaten auf `nx_test`. Nach Ausrollen auf die Betriebs-DB denselben Lauf wiederholen.
