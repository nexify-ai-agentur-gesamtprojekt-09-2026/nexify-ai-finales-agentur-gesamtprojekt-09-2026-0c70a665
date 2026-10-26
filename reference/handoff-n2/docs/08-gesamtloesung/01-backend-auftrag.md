# Backend-Auftrag · Schritt für Schritt · NeXify Plattform

**Stand 27.09.2026 · Fassung 1.0.** Auftrag an das Backend-Team bzw. an den ausführenden Agenten. Jeder Schritt hat **Eingang, Tun, Prüffälle, Abnahme, Gate, Rollback**. Kein Schritt beginnt, bevor der vorige abgenommen ist. Tests zuerst: der rote Lauf wird protokolliert, bevor Code entsteht.

**Unveränderlich:** Vertrag = `api/openapi.yaml`. Regeln = `lib/regelwerk.js` + `config/regelwerk.json`. Oberflächen = die Design Components im Projekt (Vorlage, Pixel für Pixel). Stack = `docs/03-backend/backend-architektur.md` § 2 (Next.js/TypeScript, Fastify, Supabase-Postgres mit RLS, pg-boss, OpenBao, OpenTofu, GitLab CI).

**Monorepo `nexifyai/plattform`:**
```
apps/gateway   Fastify, /v1 nach openapi.yaml, ruft regelwerk.pruefe() vor jedem Seiteneffekt
apps/mcp       MCP 2026-07-28, zustandslos, Werkzeuge aus config/mcp-server.json
apps/worker    pg-boss-Queues: langlauf, posteingang, lernen, doku
apps/web       Next.js: agentur, shop, werkzeuge (öffentlich)
apps/app       Next.js: portal, workspace, posteingang, leitstand, verwaltung (angemeldet)
packages/kerne lib/*.js unverändert übernommen (eine Quelle für Oberfläche und Dienst)
packages/ui    Designsystem aus design/tokens.json
config/ api/ db/ deploy/ playbooks/ tools/ tests/ docs/
```

| # | Schritt | Eingang | Tun | Prüffälle (rot zuerst) | Abnahme | Gate | Rollback |
|---|---|---|---|---|---|---|---|
| **B0** | Repository und CI | dieses Paket | Monorepo anlegen, `.gitlab-ci.yml` übernehmen | alle 143 Kern-Prüffälle grün in CI (18+12+32+31+30+20) | Pipeline grün, Regelprüfung 0 Befunde | – | Repo archivieren |
| **B1** | Vorschau-Stufe | Einzelfreigabe LIVE-DNS | `playbooks/site.yml --tags vorpruefung,basis,kerne` auf Vorschau | Health 13/13 `200` mit Cache-Buster | Health-Protokoll | Stufe 1+2 | DNS-Eintrag löschen |
| **B2** | Vertrag lebt | B1 | Gateway-Gerüst: alle Pfade antworten mit `501` und Fehlerformat; Contract-Tests aus `openapi.yaml` | je Pfad: falsches Schema → 422, fehlender `Idempotency-Key` → 400 | Lint + Contract-Suite grün | – | Version zurück |
| **B3** | Regelwerk scharf | B2 | Middleware: jede schreibende Route und jedes MCP-Werkzeug → `pruefe()`; Entscheidung als Ereignis `regel.entscheidung` | RW01–RW30 + je Route ein Fall „gesperrt → 403 REGEL_GESPERRT“, „mensch → 202“ | Nachweis: absichtlich gesperrte Aktion erreicht keinen Seiteneffekt | E3 | Middleware aus = alles gesperrt (fail-closed), nicht offen |
| **B4** | Auth, Rollen, RLS | B3 | OIDC, Rollen aus `auth-und-rollen.md`, RLS je `mandant_id` | fremder Mandant → 403; abgelaufene Sitzung → 401; Negativfall je Rolle | Pen-Test-Checkliste Auth | E3 | Migration zurück |
| **B5** | Buchungskern | B4 | `lib/rechenkern.js` als Dienst, Journal in Postgres, Idempotenz-Tabelle, Storno = Gegenbuchung | R-04-Fälle + doppelter Webhook bucht nicht doppelt + Buchung → Storno → Saldo 0 (**Rollback-Test, bisher offen**) | 3 Beispielrechnungen identisch in allen Systemen (nach Entscheidung E1) | E3 | Dienst aus, Journal bleibt |
| **B6** | Langlauf-Dienst | B3 | Tabellen aus `langlauf-orchestrierung.md`, Worker mit `leasePflicht: true`, optimistische Sperre | LL01–LL32 + zwei Worker am selben Lauf → einer bekommt `E_LEASE` | Lauf über Neustart des Workers fortgesetzt | E3 | Queue anhalten (`#stopp`) |
| **B7** | Posteingang | B3 | IMAP/Weiterleitung → Worker → `verarbeiten()`; Versand nur über Resend mit `ausgehendPruefen()` | Posteingang 31/31 + echte Testmail je Kategorie auf Vorschau | 0 automatische Antworten an SPF-Fehler-Absender | E3 | Abruf aus, Mails bleiben im Postfach |
| **B8** | MCP-Server | B3 | Werkzeuge nach `config/mcp-server.json`, keine `destructiveHint`-Werkzeuge | je Werkzeug Rolle falsch → Fehler; Aufruf ohne Regelprüfung unmöglich (Test) | Konformitätssuite des MCP-SDK | E3 | Server aus |
| **B9** | Lernschleife | B5–B7 | Signale nach `config/lernen.json` (Entwurf geändert, Bewertung, Test rot, Vorfall, Hinweis) → `aufnehmen()`; Lernformen als Aufgaben im Leitstand | LS01–LS20 + Signal mit E-Mail-Adresse wird bereinigt gespeichert (DB-Abfrage) | eine Woche Signale, Watch-List im Leitstand sichtbar | E3 | Signalaufnahme aus, Betrieb unberührt |
| **B10** | Beobachtung | B2 | OTel-SDK in Gateway/Worker/MCP, GenAI-Spans, Collector, Außen- und Innenwächter, zweite Ebene | Collector-Test: Span mit `gen_ai.input.messages` kommt ohne Inhalt an | Alarmweg einmal ausgelöst und quittiert | E3 | Export aus |
| **B11** | Oberflächen | B4–B9 | `apps/app` und `apps/web` nach den Design Components, Pixel für Pixel; Designsystem aus `design/tokens.json` | Playwright E2E je Nutzerweg inkl. Fehlerfall; Sichtvergleich gegen DC-Bildschirmfotos | 0 Konsolenfehler, Kontrast AA, Zielgrößen | Gate je Modul | Umleitung auf Altstand |
| **B12** | Stufe-0-Modell | B9, GPU-Entscheidung, ≥ 500 Paare | vLLM mit LoRA, Training SFT → DPO, `promotion()` → `rollout()` | LS12–LS19 + Rückfall auf Stufe 1 bei ungesundem Modell | Canary 5 % 48 h ohne Rückschritt | Freigabe Pascal für 100 % | 9router auf Vorversion |
| **B13** | Umstellung | B11 abgenommen | Parallelbetrieb 14 Tage, dann Umleitung der Altadressen | Crawler ohne 404, Weiterleitungen 301 | Endabnahme je Modul | Endabnahme | Umleitung zurück |
| **B14** | Bereinigung | B13 + Frist abgelaufen | `playbooks/90-bereinigung.yml` erst `--check`, dann mit Bestätigung | R-13-Fälle; Health nach Bereinigung 13/13 | Bereinigungsbericht mit Archiv-Prüfsummen | Bestätigung Pascal | Archiv zurückspielen |

## Pflicht in jedem Schritt

1. Roter Testlauf protokolliert, dann Umsetzung, dann grüner Lauf.
2. Regelprüfung `node tools/regel-pruefung.js` ohne Befund.
3. Freigabe-Nachweis-Zeile nach `docs/04-betrieb/freigabe-gate-status.md`.
4. `node tools/doku-generator.js` – Doku folgt der Konfiguration, nie umgekehrt.
5. Jeder gefundene Fehler: Signal `fehler` → Prüffall (L4). Kein Fix ohne Prüffall.

## Nicht Teil dieses Auftrags

Reboot, Live-DNS, vollständige Firewall-Änderung, Preise, Rechtstexte, Endabnahme – das bleibt bei Pascal (R-01, R-02, R-09).
