# Entscheidungen (DECISIONS)

Kurzregister der Architektur-/Produktentscheidungen. Details in `docs/09-final/` und `FIXES.md`.

- 2026-09-29: Prototypen (`*.dc.html`) sind Design-Referenz, kein Produktionscode — nachbauen, nicht kopieren.
- 2026-10-05: Monorepo-Wurzel mit npm-Workspaces (`apps/*`, `packages/*`) fuer reproduzierbare Installation (Root-`package-lock.json`).
- 2026-10-05: Cockpit als interner Leitstand ohne Auth; Anmeldung/Rollen vor oeffentlichem Zugang.
- 2026-10-05: Mandantentrennung per Postgres-RLS (App-Rolle ohne BYPASSRLS), Nachweis `infra/db/rls-test.sh`.
- 2026-10-05: Zahlen/Preise nur aus `config/fakten.json`/`config/api-prepaid.json`; ungeklaerte Tarife bleiben „zur Freigabe".
