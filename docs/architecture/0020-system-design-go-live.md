# 0020 · System-Design Go-live: NeXify AI und TEILEKLAR

Stand 04.11.2026 · Branch `claude/youthful-sagan-bzmkkr` · Grundlage: tatsächlicher Repo-Stand,
`vercel.json`, `apps/shop-api`, `api/agent-chat.ts`, Prototypen in `prototypen/`.
Annahmen sind als **ANNAHME** markiert, offene Entscheidungen als **E-…**.

## 1. Anforderungen

### Funktional
| Bereich | Muss | Quelle |
|---|---|---|
| NeXify-Agenturseiten | 43 öffentliche Seiten, Chat rechts standardmäßig geöffnet, Briefing/Angebot, Kontakt | `config/site-map.json`, Prototypen `index.html`, `NX-*.dc.html` |
| KI-Chat | Orientierung ohne Modell; Live-Modell `deepseek/deepseek-v4.1-flash-1017`, Reasoning high, ohne Fallback | `config/llm-policy.json`, `api/agent-chat.ts` |
| Angebotsentwurf | Entwurf, PDF, Versand an Kontoadresse und intern, Preis „zur Freigabe“ | `apps/shop-api/shop/quotes_api.py` |
| Konten und Portale | Registrierung, Anmeldung, Passwort, Kundenportal, Partnerportal, Suite | `accounts_api.py`, `apps/web/proxy.ts`, Prototypen `Kundenportal`, `Partnerportal`, `Konto` |
| TEILEKLAR Shop | Eigenständige Marke: Fahrzeugwahl, Suche, Produkt, Warenkorb, Kasse, Ratgeber, Standorte, Recht | Prototyp `TEILEKLAR Shop.dc.html` (maßgeblich laut Nutzer) |
| TEILEKLAR Werkstatt | Werkstattsuche, Partner werden, Partnerportal, Termine | `workshops_api.py`, Prototypen `Werkstatt-Partnerseite`, `Partner-werden`, `Partnerportal` |
| Werkzeuge | Reifenrechner, Fitment-Checker, Batterie-Berater | gleichnamige Prototypen |
| Mail | Bestellung, Status, Konto, Anfragen, Angebot über Outbox | `mailer.py` (Resend) |
| Zahlung | Revolut gehostete Bestellung und Webhook | `revolut.py`, `checkout_api.py` |

### Nicht funktional
- **Region und Datenschutz:** Funktionen in `fra1`; keine Geheimnisse im Code; Mandantentrennung.
- **Barrierefreiheit:** WCAG 2.2 AA, Ziele ≥ 44 px (Repo-Regel 48 px), sichtbarer Fokus, Reduced Motion.
- **Sprachen:** de, nl, fr, en mit identischem Schlüsselsatz; Rechtstexte nicht maschinell übersetzt.
- **Verfügbarkeit:** **ANNAHME** 99,5 % für den Shop, Chat darf degradieren (Fallback ohne Modell).
- **Last:** **ANNAHME** zum Start unter 50 gleichzeitigen Nutzern, unter 100 Bestellungen pro Tag. Keine Messwerte vorhanden.
- **Gates:** `node tools/ds-audit-cli.js`, Browser-Nachweise, Abgleichsregister, CI-Jobs `repository`, `react-site`, `next-web`, `openapi-schema`, `postgres-isolation`.

### Randbedingungen
Kleines Team, Monorepo, Vercel Services, MongoDB als Live-Datenbank, keine Supabase. Preise nur aus
`config/fakten.json`. Design nur aus `config/design-tokens.json`.

## 2. Architektur im Überblick

```
                    Browser (nexifyai.de · teileklar)
                                 │
                       Vercel Edge / Rewrites (vercel.json)
          ┌──────────────────────┴──────────────────────────┐
  service "frontend" (apps/web, Next.js 16)        service "shop" (apps/shop-api, FastAPI)
  ├─ öffentliche Seiten NeXify + TEILEKLAR          ├─ /api/auth      Konten, Sitzungen
  ├─ proxy.ts  → Portale 401 ohne Sitzung          ├─ /api/shop      Katalog, Warenkorb, Kasse
  ├─ /api/agent-chat ── Gate ──► OpenRouter         ├─ /api/admin     Einstellungen, Bestellungen, Outbox
  │                      (DeepSeek 1017, high)      ├─ /api/workshops Werkstattsuche, Anfragen
  └─ /api/agent-runtime-status                      ├─ /api/requests  Kontakt, Partneranfragen
                                                    ├─ /api/quotes    Angebotsentwurf, PDF, Versand
                                                    └─ /api/health, /api/docs
                                                           │
                         ┌─────────────────┬───────────────┼──────────────┬─────────────┐
                      MongoDB          Resend (Mail)   Revolut (Pay)   BigBuy (API/FTP)  Sentry
```

**TEILEKLAR eingebunden, aber eigenständig:** gleiche Laufzeit und gleiches Konto-System, aber eigener
`site_context` (`teileklar`), eigene Navigation, eigene Marke, eigene Rechtstexte, eigene Bildwelt,
eigener Assistent („TEILEKLAR Hilfe“). Die Trennung liegt heute in `config/site-map.json`
(`site_contexts`) und den Layout-Gruppen in `PublicContent.tsx`. Die Prototyp-Domains
`teileklar.shop/{de,at,nl,be-fr,be-nl,lu,ch}` zeigen das Zielbild als eigene Domain je Markt.

## 3. Vertiefung

### Datenmodell (MongoDB, Sammlungen)
`users`, `sessions` · `products`, `categories`, `settings` (Versand, Freigaben) · `carts`, `orders`,
`webhook_events` · `outbox` (Mail, idempotent) · `workshops`, `workshop_requests` · `requests` ·
`quotes` (neu, Index `id` unique, `owner+created_at`).

### API-Verträge
REST über FastAPI, Schema unter `/api/openapi.json`. Schreibende Aufrufe: Same-Origin-Pflicht,
`Idempotency-Key` bei Warenkorb, Bestellung, Anfrage und Angebot. Portale: Next `proxy.ts` gibt 401
mit `sign_in_path` `/anmelden`, `Cache-Control: private, no-store`.

### Caching
Öffentliche Seiten statisch (SSG). Shop-APIs `no-store`. **Revisit:** Next 16 Cache Components für
Katalogseiten, sobald echte Produkte existieren.

### Ereignisse und Wiederholung
Mail über Outbox mit Lease und maximal 5 Versuchen. **Lücke:** Auf Vercel läuft keine
Wiederholschleife. Lösung: Vercel Cron ruft `POST /api/admin/outbox/retry` mit Servertoken auf.
Revolut-Webhook idempotent über `webhook_events.event_key`.

### Fehlerbehandlung
Chat: Gate geschlossen → geprüfte Orientierung; Modellfehler → `managed_live_chat_unavailable` im
Stream, kein Ersatzmodell. Shop: fehlende Bindung → `database_*`-Fehler ohne Treiberdetails.

## 4. Skalierung und Zuverlässigkeit
- Fluid Compute skaliert beide Services horizontal; Mongo ist der gemeinsame Engpass.
  **ANNAHME** M10-Cluster in EU reicht für den Start.
- `maxDuration` 10 s für `agent-chat` ist für ein Reasoning-Modell knapp; nach Freischaltung messen,
  dann begründet anheben (Test `test_vercel_adapter.py` pinnt den Wert bewusst).
- Monitoring: Sentry (Server und Browser), Vercel Logs. **Lücke:** keine Alarme definiert.
- Wiederherstellung: Mongo-Backups beim Anbieter; **Lücke:** Wiederanlaufprobe fehlt.

## 5. Abwägungen
| Entscheidung | Gewählt | Kosten | Wann neu bewerten |
|---|---|---|---|
| Ein Shop-Service für NeXify-Konten und TEILEKLAR | weniger Betrieb, ein Konto-System | Kopplung der Marken in einer Laufzeit | eigene Domain `teileklar.shop` oder eigenes Team |
| MongoDB statt Postgres | vorhandener, getesteter Code | `db/foundation` (Postgres, RLS) ungenutzt | Mandantenfähigkeit der Portale |
| OpenRouter statt AI Gateway | Modellbindung 1017 belegt | kein Gateway-Routing | Gateway führt 1017 nachweislich |
| Bildserie als Komposition freigegebener Figuren | keine generierten Gesichter | begrenzte Posen, Figuren teils niedrig aufgelöst | hochaufgelöste Aufnahmen liegen vor |

## 6. Offene Entscheidungen
- **E-SORTIMENT:** Der Prototyp `TEILEKLAR Shop.dc.html` zeigt Ersatzteile („Welche Bremsscheibe
  passt wirklich?“, „Von der Bremsscheibe bis zum Komplettrad“). Der BigBuy-Bezug liefert laut
  Konzept nur universelles Zubehör (Auto & Motorrad). Welche Bezugsquelle deckt Ersatzteile ab, oder
  wird der Prototyp-Inhalt auf Zubehör angepasst?
- **E-DOMAIN:** TEILEKLAR unter `nexifyai.de/teileklar` oder eigene Domains je Markt wie im Prototyp.
- **E-PORTALE:** Rollenprüfung in `proxy.ts` gegen `/api/auth/me` (heute alle privaten Seiten 401).
- Owner-Eingaben: BigBuy-Schlüssel, Versandkosten, Lieferzeiten, Rechtsprüfung, Mail-Absender.

## 7. Was mit Wachstum neu zu bewerten ist
Cache-Strategie Katalog, Suchindex (heute Mongo-Regex), Rate-Limits und Bot-Schutz für Chat und
Formulare, getrennte Datenbank für TEILEKLAR, Postgres mit RLS für Portale, Warteschlange für
Importe und Mail statt Cron.
