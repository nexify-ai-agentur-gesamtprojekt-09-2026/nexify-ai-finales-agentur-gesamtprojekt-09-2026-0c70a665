# Teststrategie · Stand 04.11.2026

Grundlage: tatsächlicher Bestand im Repo und `.github/workflows/ci.yml`. Ergänzt
`docs/architecture/0020-system-design-go-live.md`. Keine bestandene Prüfung ist eine Abnahme
oder ein DIN-/ISO-Zertifikat (`docs/quality/standards-applicability.md`).

## 1. Bestand

| Ebene | Umfang | Läuft in CI | Job |
|---|---|---|---|
| Python Repo-Tests (`tests/`, Verträge, Gates, Register, Nachweisbindung) | 68 Dateien, 712 Tests | ja | `repository` (`make test`) |
| Prototyp-Audit `node tools/ds-audit-cli.js` | Design, SEO-Basis, i18n-Parität, A11y-Heuristik | ja | `repository` (`make check`) |
| Shop-API (`apps/shop-api/tests`: Adapter, Warenkorb-Idempotenz, Angebotsentwurf, Produktfelder, Namespace) | 5 Dateien, 40 Tests | **ab jetzt ja** (vorher nie) | `repository` |
| Agent-Runtime (`packages/agent-runtime/tests`: Orientierung, SSE, Live-Gate) | 6 Dateien, 39 Tests | ja | `react-site` (`pnpm test:agent`) |
| Site-Unit (`apps/site/tests/*.test.mjs`) | 22 Dateien, 131 Tests | ja | `react-site` |
| Next Auth/Öffentlichkeit (`apps/web/auth/tests`) | 7 Dateien | ja | `next-web` |
| OpenAPI-Vertrag | `docs/contracts/factory.openapi.json` | ja | `openapi-schema` |
| Postgres-Mandantentrennung | `db/foundation` | ja | `postgres-isolation` |
| Browser-Läufe (`apps/site/tests/browser-*.mjs`, Playwright) | 31 Skripte | **nein**, nur gespeicherte Nachweise mit SHA-256-Quellbindung werden in CI geprüft | `check_browser_evidence.py`, `check_text_resize_evidence.py`, Abgleichsregister |

## 2. Lücken (gemessen)

1. **Shop-API-Tests liefen nie in CI.** Behoben: Schritt in `repository` mit
   `apps/shop-api/requirements-test.txt` (hash-gepinnt, nur Test).
2. **7 Browser-Skripte ohne Nachweisbindung:** `browser-broad-audit`, `browser-atelier-playback`,
   `browser-install-invitation`, `browser-media-sync`, `browser-partner-form`,
   `browser-partner-reception`, `browser-workshop-directory`. Ihr Ergebnis kann veralten, ohne dass
   ein Gate anschlägt.
3. **2 Browser-Skripte schlagen fehl:** `browser-identity-hero` (erwartet Layout `zielbild-v2`, die
   Seite rendert `graphite-atelier`) und `browser-scene-images` (erwartet Live-Hero-Element). Das ist
   eine echte Abweichung vom freigegebenen Zielbild (`config/identity-hero.json`), kein Testfehler.
4. **Kein Live-Rauchtest gegen die Vercel-Vorschau** (Startseite, Shop-API `/api/health`, 401 der
   Portale, Chat-Stream).
5. **Kein Lasttest**, keine Alarme. Kapazitätsannahmen in 0020 sind unbelegt.
6. **TEILEKLAR-Prototyplogik** (Fahrzeugwahl, Reifenrechner, Fitment-Checker, Batterie-Berater,
   Werkstattbereich) hat außer Reifenrechner/Checkliste keine Komponententests.

## 3. Plan nach Komponententyp

| Bereich | Testart | Ziel | Beispielfälle |
|---|---|---|---|
| Shop-API Kasse/Warenkorb/Angebot | Unit + HTTP-Integration (mongomock) | jede schreibende Route: Idempotenz, 401/403/422, Mandant | doppelter Klick legt nichts doppelt an; fremdes Angebot → 404; Angebot ohne Preis |
| Revolut-Webhook | Integration mit Signaturfixture | Signatur falsch → 401, doppelt → einmal verbucht | Ereignis zweimal, Bestellung einmal bezahlt |
| Mail-Outbox | Unit | Lease, max. 5 Versuche, Tageslimit, `not_configured` | Cron-Aufruf verschickt wartende Mails genau einmal |
| Chat `/api/agent-chat` | Unit (Gate) + SSE-Vertrag | geschlossen → kein Modellaufruf; offen → nur gepinnter Endpunkt, Modell 1017 | vorhanden in `live-chat-route.test.mjs` |
| Öffentliche Seiten | Browser (Playwright) | 43 Seiten × 8 Läufe: Überlauf, Ränder, Zielgrößen, Alt, H1, Links, Laufzeitfehler | `browser-broad-audit` |
| Barrierefreiheit | Browser + axe/Heuristik | WCAG 2.2 AA, Fokus 2 px, Textabstand, 200 % Zoom | `browser-text-spacing`, `browser-accessibility` |
| Hero/Bildserie | Browser-Geometrie | Figuren ganz (contain), innerhalb der Bühne, keine Überdeckung | `browser-critical` |
| TEILEKLAR-Werkzeuge | Komponenten-Unit | Reifenmaße, Tragfähigkeit/Geschwindigkeitsindex, Batteriewerte | 205/55 R16 91V → 615 kg, V = 240 km/h |
| Portale | Integration Next `proxy.ts` | ohne Sitzung 401 + `sign_in_path`; mit Rolle Zugriff | nach E-PORTALE |
| Vorschau-Deployment | Rauchtest nach Push | 200 Startseite, `/api/health` ok, Portal 401 | neues Skript, Ergebnis als Nachweis |

## 4. Abdeckungsziele
- Schreibende API-Routen: 100 % mit Idempotenz- und Berechtigungsfall.
- Geschäftslogik (Preis, Versand, Steuer, Angebot): Zweigabdeckung ≥ 90 %.
- Öffentliche Seiten: 100 % im Breitenaudit, 0 Befunde als Gate.
- Browser-Skripte: jedes an einen Nachweis mit Quellhash gebunden oder bewusst als lokal markiert.

## 5. Nächste Schritte (Reihenfolge)
1. Breitenaudit-Nachweis binden (`evidence/broad-audit-2026-11-04/report.json` mit Quellhash und
   Prüfung in `tools/check_browser_evidence.py`).
2. Hero an das freigegebene Zielbild `zielbild-v2` angleichen; danach `browser-identity-hero` und
   `browser-scene-images` wieder grün.
3. Rauchtest gegen die Vercel-Vorschau als eigener Job nach erfolgreichem Deployment.
4. Komponententests für die TEILEKLAR-Werkzeuge beim Aufbau nach den Prototypen.
