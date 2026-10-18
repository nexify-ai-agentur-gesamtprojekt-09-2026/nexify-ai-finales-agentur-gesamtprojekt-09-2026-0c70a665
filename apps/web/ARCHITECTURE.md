# Architektur (apps/web)

- `app/` — Next.js App Router (Server Components); `app/cockpit/page.tsx` = Cockpit, `app/api/cockpit/route.ts` = JSON-API.
- `lib/cockpit.ts` — Datenzugriff (Postgres `myadmin.kennzahl`), kein State-Store.
- `next.config.mjs` — `basePath: /myadmin`, `output: standalone`.

## Grenzen
- Designwerte nur ueber Tokens (`config/design-tokens.json` -> `app/tokens.generated.css`); kein Hex/RGB im App-Code (Regel ARCH-002).
- Zahlen/Preise nur aus `config/fakten.json`/`config/api-prepaid.json` (Regel ARCH-003).
- Mandantentrennung per Postgres-RLS (App-Rolle ohne BYPASSRLS), Nachweis `infra/db/rls-test.sh`.
- Durchgesetzt mit `make check-arch` (`.harness/arch-rules.json`).
