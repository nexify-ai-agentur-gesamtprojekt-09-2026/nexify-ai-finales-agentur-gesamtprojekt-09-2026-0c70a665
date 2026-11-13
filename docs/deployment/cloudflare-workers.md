# Cloudflare Workers als Hosting für `apps/web` · Stand 13.11.2026

Auftrag (Pascal Courbois, 13.11.2026): Zielstand ist die Vercel-Vorschau
`…-lf8nj5vzv.vercel.app` (Zweig `fix/hero-video-controls-source-20261112`, Commit
`a2e65e2`, PR 95); Hosting bei Cloudflare.

**Status: vorbereitet und lokal geprüft. Nicht ausgeliefert.** Keine Domain, kein
DNS-Eintrag und kein Cloudflare-Objekt wurde geändert.

## Was dieser Stand enthält

- `apps/web/wrangler.jsonc`: Worker `nexify-web` (kurzer Name, siehe Register OF-06),
  statische Dateien über die Assets-Bindung.
- `apps/web/open-next.config.ts`: OpenNext-Adapter ohne Zwischenspeicher.
- Skripte in `apps/web/package.json`: `cf:build`, `cf:preview`, `cf:deploy`.
- Entwicklungsabhängigkeiten `@opennextjs/cloudflare` 1.20.17 und `wrangler` 4.161.0.

## Lokaler Nachweis (13.11.2026, Node 22.23.4, pnpm 12.15.0)

- `opennextjs-cloudflare build`: erfolgreich.
- `wrangler deploy --dry-run`: 11 398 KiB, gzip **2 442 KiB**.
- `wrangler dev` (Workers-Laufzeit lokal), je ein Abruf:

| Weg | Ergebnis |
|---|---|
| `/`, `/leistungen`, `/kontakt`, `/impressum`, `/datenschutz`, `/portale`, `/produkte/aifly-oracle`, `/teileklar`, `/anmelden` | 200 |
| `/?lang=nl` | 200, `<html lang="nl">` |
| `/login` | 308 nach `/anmelden` |
| `/sitemap.xml`, `/robots.txt`, `/media/runway/hero.mp4` (5,7 MB) | 200 |
| `/api/internal/workspace/status` ohne Anmeldung | 401 |
| `POST /api/chat` ohne Router-Zugang | 503 (so vorgesehen: kein stiller Ersatz) |
| Kopfzeilen | `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` vorhanden |
| `robots` | `noindex, nofollow` (unverändert; Schalter liegt in PR 94) |

Nicht geprüft: Browser-Sichtprüfung, Formularversand, Chat mit echtem Modell,
Shop-Daten, Verhalten auf echter Cloudflare-Infrastruktur, Lastverhalten.

## Grenzen, die vor dem Umzug entschieden werden müssen

1. **Kostenfrei ist knapp.** Das Paket liegt mit 2 442 KiB (gzip) unter der Grenze des
   kostenlosen Tarifs (3 MiB), mit rund 19 % Abstand. Der kostenlose Tarif begrenzt
   außerdem die Rechenzeit je Anfrage auf 10 ms; die Seiten werden serverseitig
   gerendert (rund 400 KB HTML). Ob das reicht, zeigt erst eine Messung auf Cloudflare.
   Reicht es nicht, ist der bezahlte Workers-Tarif nötig (Kaufentscheidung Inhaber).
2. **`proxy.ts` läuft als Node-Middleware.** Der Adapter meldet dafür „experimental,
   not officially maintained“. `proxy.ts` trägt Sprache und Zugriffsschutz; lokal
   funktionierten beide. Vor Produktion auf Cloudflare erneut prüfen.
3. **Shop-API bleibt außen vor.** `apps/shop-api` (FastAPI) ist ein eigener Dienst im
   Vercel-Projekt und läuft nicht auf diesem Worker. Solange er auf Vercel bleibt,
   braucht der Worker dessen Adresse als Ziel; das ist hier nicht verdrahtet.
4. **Umgebungsvariablen.** Namen aus `apps/web/.env.example` als Worker-Variablen bzw.
   Secrets anlegen; Werte setzt nur der Inhaber. Hier ist nichts hinterlegt.

## Auslieferung (durch den Inhaber oder mit dessen Zugang)

1. Cloudflare → Workers & Pages → Worker `nexify-web` anlegen, Git-Verbindung auf dieses
   Repository, Wurzelverzeichnis `apps/web`.
2. Build: `pnpm install --frozen-lockfile --ignore-scripts && pnpm cf:build`;
   Deploy: `npx wrangler deploy`.
3. Auf der `workers.dev`-Adresse die Tabelle oben wiederholen und Rechenzeit messen.
4. Domain erst nach technischer und fachlicher Abnahme zuweisen. Zwingend vorher:
   Shop-API-Ziel und Worker-Variablen angebunden; Browser-Sichtprüfung, Formularversand
   und Chat auf der `workers.dev`-Adresse bestanden; Rechenzeit unter Last auf Cloudflare
   gemessen; Umschaltung zuerst mit einem kleinen Anteil oder einer Testadresse; Rückweg
   auf die Vercel-Auslieferung einmal praktisch durchgeführt.
5. Rückweg: Domain wieder vom Worker lösen; bestehende Auslieferungen bleiben unberührt.

## Speicher (R2, Drive)

- Für das Hosting ist R2 nicht nötig: 144 Dateien, zusammen 104 MB, größte Datei 13,4 MB
  (Grenze je Datei 25 MiB).
- Vorhanden: R2-Bucket `nexify-agentur-pucket` (angelegt 15.10.2026), Inhalt nicht geprüft.
- OFFEN: Welches Speicherproblem gemeint ist. Belegt ist der volle GitHub-Artefaktspeicher
  (PR 94, OF-19); den löst eine kürzere Aufbewahrung der Artefakte, nicht R2. Aus dieser
  Session lassen sich keine Objekte nach R2 schreiben (kein Zugang mit Schreibrecht).
