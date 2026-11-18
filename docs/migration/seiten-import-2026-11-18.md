# Seiten-Import aus `nexfiy-ai-studio` — Befund und Zuordnung (18.11.2026)

Dieses Dokument belegt, welche Seiten das Studio-Repository enthält, welche davon
bereits im kanonischen Modell stehen und was mit den zwei fehlenden Routen
geschieht. Es ist der Nachweis zu `DECISIONS.md#D-023` und zu `N3` in
`config/source-boundaries.json`.

## Quelle und Messweise

| Punkt | Wert |
|---|---|
| Repository | `https://github.com/nexify-ai-agentur-gesamtprojekt-09-2026/nexfiy-ai-studio.git` |
| Festgenagelter Stand | `main` = `d43b95de17ef4011ad0bad9e6be9357739621321`, Commit-Zeit 18.11.2026 01:05:19 +0100 |
| Messweise | Nur lesender Klon ohne Arbeitskopie (`--depth 1 --filter=blob:none --no-checkout`), danach `git ls-tree -r --name-only HEAD`; kein Push, kein Schreibzugriff |
| Umfang | 43 Routendateien unter `src/routes` (ohne `__root.tsx` und `README.md`), 42 Seitendateien unter `src/styles/pages`, 168 Dateien unter `src`, 65 Dateien unter `public` |
| Vergleichsgrundlage | `config/site-map.json`, Stand dieses Zweigs |

Die Zuordnung der Dateinamen zu Pfaden folgt der TanStack-Router-Konvention:
`teileklar_.bestellungen.tsx` wird zu `/teileklar/bestellungen`, `index.tsx` zu `/`.
Damit ergeben sich 43 Pfade.

## Routenabgleich

41 der 43 Pfade stehen bereits in `config/site-map.json`. Zwei Pfade fehlen:
`/passwort-vergessen` und `/teileklar/bestellungen`. Umgekehrt enthält das
kanonische Modell 12 Pfade, die das Studio nicht kennt (interne Leitstände,
Portalbereiche und ergänzende TEILEKLAR-Seiten). Diese bleiben unberührt.

| Studio-Route | Seite in `config/site-map.json` | Befund |
|---|---|---|
| `/` | `home` | vorhanden, unverändert |
| `/anmelden` | `login` | vorhanden, unverändert |
| `/barrierefreiheit` | `accessibility` | vorhanden, unverändert |
| `/cookies` | `cookies` | vorhanden, unverändert |
| `/datenschutz` | `privacy` | vorhanden, unverändert |
| `/impressum` | `imprint` | vorhanden, unverändert |
| `/ki-hinweise` | `ai-notice` | vorhanden, unverändert |
| `/kontakt` | `contact` | vorhanden, unverändert |
| `/leistungen` | `services` | vorhanden, unverändert |
| `/leistungen/agenten-automatisierung` | `automation` | vorhanden, unverändert |
| `/leistungen/apps-portale` | `apps-portals` | vorhanden, unverändert |
| `/leistungen/websites` | `websites` | vorhanden, unverändert |
| `/leistungsumfang` | `scope` | vorhanden, unverändert |
| `/loesungen` | `solutions` | vorhanden, unverändert |
| `/passwort-vergessen` | — | **neu, fehlt** |
| `/portale` | `portals` | vorhanden, unverändert |
| `/preise-ablauf` | `pricing` | vorhanden, unverändert |
| `/produkte/aifly-oracle` | `aifly-oracle` | vorhanden, unverändert |
| `/produkte/api` | `api` | vorhanden, unverändert |
| `/produkte/nex-agentic-aifly` | `nex-agentic` | vorhanden, unverändert |
| `/produkte/nex2fly` | `nex2fly` | vorhanden, unverändert |
| `/produkte/one` | `one` | vorhanden, unverändert |
| `/produkte/skills-mcp` | `skills-mcp` | vorhanden, unverändert |
| `/registrieren` | `signup` | vorhanden, unverändert |
| `/teileklar` | `tk-home` | vorhanden, unverändert |
| `/teileklar/batterie-berater` | `tk-batterie` | vorhanden, unverändert |
| `/teileklar/bestellungen` | — | **neu, fehlt** |
| `/teileklar/fahrzeug-und-passung` | `tk-fitment` | vorhanden, unverändert |
| `/teileklar/gutscheine` | `tk-vouchers` | vorhanden, unverändert |
| `/teileklar/kasse` | `tk-checkout` | vorhanden, unverändert |
| `/teileklar/kategorien` | `tk-categories` | vorhanden, unverändert |
| `/teileklar/partner-werden` | `tk-partner` | vorhanden, unverändert |
| `/teileklar/rechtliches` | `tk-legal` | vorhanden, unverändert |
| `/teileklar/reifenrechner` | `tk-reifenrechner` | vorhanden, unverändert |
| `/teileklar/shop` | `tk-shop` | vorhanden, unverändert |
| `/teileklar/suche` | `tk-search` | vorhanden, unverändert |
| `/teileklar/termine` | `tk-appointments` | vorhanden, unverändert |
| `/teileklar/warenkorb` | `tk-cart` | vorhanden, unverändert |
| `/teileklar/werkstatt` | `tk-workshop` | vorhanden, unverändert |
| `/unternehmen` | `company` | vorhanden, unverändert |
| `/vertragsgrundlagen` | `terms` | vorhanden, unverändert |
| `/wissen` | `knowledge` | vorhanden, unverändert |
| `/wissen/projekt-vorbereiten` | `knowledge-start` | vorhanden, unverändert |

Nur im kanonischen Modell, nicht im Studio: `/intern/leitstand`,
`/intern/posteingang`, `/intern/verwaltung`, `/intern/workspace`,
`/portal/affiliate`, `/portal/api`, `/portal/kunde`, `/teileklar/kategorie`,
`/teileklar/konto`, `/teileklar/nachbarschaft`, `/teileklar/partnerportal`,
`/teileklar/produkt`.

## Warum kein Code-Import

Das Studio ist eine TanStack-Start-Ausgabe (TanStack Router 1.170.41, React 19,
Vite, Tailwind) und erzeugt je Seite eine große, ausgelagerte Komponente mit
eigener CSS-Datei. Das kanonische `apps/site` hat einen eigenen Router, erzeugte
Seitendaten aus `config/site-map.json`, PWA- und Beobachtungs-Plugins sowie
SEO-Ableitungen. Ein Ersetzen würde diese Kette verwerfen und die vorhandenen
Prüfungen entwerten.

Deshalb gilt nach D-023: **Inhalt übernehmen, nicht Code.** Jede Seite wird als
Eintrag in `config/site-map.json` mit vier Sprachsätzen und ihren Abschnitten
geführt; die Darstellung kommt aus den Bausteinen der Startseite.

## Die zwei fehlenden Routen

### `/passwort-vergessen`

Belegte Abschnitte der Quelle: Brotkrumen (Startseite / Passwort vergessen),
Überschrift „Passwort vergessen“, Einleitung „Ihr Zugang zu persönlichen
Vorgängen, Unterlagen und Shop-Bestellungen.“, Formular mit Feld
`E-Mail-Adresse` und Schaltfläche `Link anfordern`, Verweise auf `/anmelden`,
`/registrieren` und `/datenschutz`, dazu eine Markenszene.

Ziel: öffentliche Seite `password-reset` mit diesen Abschnitten in vier
Sprachen. Kein Mailversand und keine Kontoprüfung in diesem Schritt; der
Schalter darf keine Adresse als vorhanden bestätigen.

### `/teileklar/bestellungen`

Belegte Abschnitte der Quelle: Shop-Kopf mit Suche und Konto, Navigation mit
`Meine Bestellungen` als aktiver Seite, Brotkrumen (TEILEKLAR.shop / Ihre
Bestellungen), Kicker `TEILEKLAR / Kundenkonto`, Überschrift „Ihre
Bestellungen“, Hinweis „Die Bestellungen konnten nicht geladen werden.“

Ziel: private Seite `tk-orders` im Kundenkonto, nur mit angemeldeter Rolle und
Mandant TEILEKLAR. Keine Bestelldaten im öffentlichen Bau; solange die
Bestellquelle nicht angebunden ist, sagt die Seite genau das.

## Offene Schritte (eigener PR)

`config/site-map.json` ist über `config/presenter-sources.json` byte-genau
gebunden. Eine Änderung dort verlangt einen eigenen Beleg-Lauf. Deshalb trennt
D-023 die beiden Schritte:

1. Dieses Register und die Quellengrenze (dieser Zweig).
2. Übernahme der zwei Routen in `config/site-map.json` samt vier Sprachsätzen,
   Abschnitten, Navigationseintrag und neuem Beleg in `config/presenter-sources.json`,
   mit `tests/test_site_map.py` und den Grenzprüfungen.

## Belege

- `git -C <klon> log -1 --format='%H %cI'` → `d43b95de17ef4011ad0bad9e6be9357739621321 2026-11-18T01:05:19+01:00`
- `git ls-tree -r --name-only HEAD -- src/routes` → 45 Einträge, davon 43 Routen
- Vergleich gegen `config/site-map.json` → 41 vorhanden, 2 fehlend, 12 nur im Ziel
- Kein Schreibzugriff auf die Quelle, kein Push, kein Import von Dateien.
