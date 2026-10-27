# Runbook — Sentry Betriebsüberwachung

## Zweck
Fehler aus Browser-App (`apps/site`) und Vercel-Functions (`api/*`) landen in Sentry und sind dort abrufbar.

## Zuordnung
| Bereich | Sentry-Organisation | Projekt | DSN-Variable |
|---|---|---|---|
| `apps/site` (Browser) | nex2fly | sentry-bistre-cable | `VITE_SENTRY_DSN` (Build-Zeit) |
| `api/*` (Vercel) | nexify-chat-it-automate-it | javascript-nextjs | `SENTRY_DSN` (Runtime) |

## Verhalten ohne Konfiguration
Ohne DSN ist die Überwachung inaktiv. `Sentry.init` wird nicht aufgerufen, `captureClientError`/`captureServerError` sind No-Ops. Kein Netzwerkverkehr, kein Fehler.

## Datenschutz
`dataCollection.userInfo: false`, `tracesSampleRate: 0`. Keine Benutzerkennungen, keine Request-Bodies, keine Cookies.

## Prüfung
```bash
# Ingest positiv: echtes Event senden und Issue in Sentry prüfen
node .local/sentry-probe.mjs "$VITE_SENTRY_DSN" production site
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://de.sentry.io/api/0/projects/nex2fly/sentry-bistre-cable/issues/?query=operational%20probe&statsPeriod=24h"
```
Erwartet: HTTP 200 mit Treffer `SENTRY-BISTRE-CABLE-*`.

## Störung
1. Keine Events sichtbar: DSN im Build/Environment prüfen (`VITE_SENTRY_DSN` muss beim Build gesetzt sein).
2. Events abgelehnt (429/413): Sentry-Quota prüfen, nicht die Anwendung ändern.
3. Verdacht auf PII: `dataCollection` prüfen, betroffenes Event löschen, Ursache im Code beheben.

## Rückweg
1. `git revert <commit>` der Sentry-Integration.
2. `VITE_SENTRY_DSN`/`SENTRY_DSN` in Vercel entfernen.
3. Neu deployen. Ohne DSN ist die Überwachung aus; die Anwendung funktioniert unverändert.
