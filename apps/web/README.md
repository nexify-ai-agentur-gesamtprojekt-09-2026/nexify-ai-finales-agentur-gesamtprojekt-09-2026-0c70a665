# myADMIN · Cockpit (P0)

Erster lauffähiger Teil des myADMIN aus der Projekt-Roadmap (P0 Fundament +
Cockpit). Projektstack: Next.js App Router, Server Components, Postgres mit
Row-Level-Security. Kein Framework-Zoo, kein State-Store.

## Was hier steht

| Teil | Pfad | Zweck |
|---|---|---|
| Tokens | `packages/tokens` | `config/design-tokens.json` → CSS-Variablen + flaches JSON |
| Datenbank | `infra/db/001_cockpit.sql` | Tabelle `myadmin.kennzahl`, RLS-Policy, App-Rolle ohne BYPASSRLS |
| Nachweis | `infra/db/rls-test.sh` | Prüffall A/B: Mandant sieht nur eigene Zeilen; ohne Kontext null Zeilen |
| Backend | `apps/web/lib/cockpit.ts`, `app/api/cockpit/route.ts` | Lage live: Dienste, System, Kennzahlen |
| UI | `apps/web/app/cockpit/page.tsx` | Cockpit, server-gerendert, Werte aus den Tokens |

## Betrieb auf dem Server

```bash
docker run -d --name myadmin-pg -p 127.0.0.1:5599:5432 \
  -e POSTGRES_PASSWORD=... -e POSTGRES_DB=myadmin postgres:15-alpine
install -d -m 750 /etc/myadmin          # /etc/myadmin/pg.env (600/640), nie im Repo
infra/db/rls-test.sh                    # legt Schema an und beweist die Trennung
cd apps/web && npm ci && npm run build
systemctl enable --now myadmin-cockpit  # /opt/myadmin/web, Benutzer myadmin
```

Erreichbar unter `/myadmin` (Traefik-Router `myadmin-cockpit`). Der Router ist
speziﬁscher als der Host-Router des Harness (Host + Pfad), deshalb unberührt.

## Bewusst weggelassen (aufgestockt, sobald gebraucht)

- Kein `packages/ui`, `packages/i18n`, `packages/rules`: für ein Cockpit mit
  einer Seite wäre das Verpackung ohne Inhalt. Anlegen, wenn die zweite Fläche kommt.
- Kein Fastify-Gateway: die Next-Route-Handler reichen für Lesepfade. Eigenes
  Gateway erst mit Auth, Ledger und Idempotenz (P4).
- Keine Auth: das Cockpit ist ein interner Leitstand. Vor jedem öffentlichen
  Zugang zuerst Anmeldung + Rollen ergänzen.
- Kein Kennzahlen-Schreiber: die Tabelle ist bereit und leer; gefüllt wird sie
  aus echten Quellen (Rechenkern-Journal, GitLab, Deploy-Nachweise), nicht geraten.
