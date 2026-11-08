# Gesamtbeschreibung 08.11.2026 · Abgleich Seitenkatalog (§16) gegen Ist

Quelle: „NeXify AI – Gesamtbeschreibung“, Pascal Courbois, 08.11.2026 (Auftraggebertext, Abschnitte 1–18).
Stand dieses Abgleichs: 08.11.2026, Zweig `claude/loving-albattani-4jp12a`, geprüft gegen die lokal gebaute
Next-Ausgabe `apps/web` (die auf `.de` veröffentlichte Ausgabe). Belegt ist nur, was unten als „geprüft“ steht.

## 1. Erkannter Bestand (in `.de` ausgeliefert)

49 Routen in `config/site-map.json`, davon 39 öffentlich und 10 geschützt; dazu die dynamischen Shop-Routen
(`/teileklar/produkt/[id]`, `/kategorie/[id]`, `/werkstatt/[id]`, `/bestellung/[id]`, `/bestellungen`, `/admin`),
`/intern/workspace`, die Auth-Routen und die API-Routen. Geprüft: alle 39 öffentlichen Katalogrouten liefern 200,
je genau eine H1, `lang="de"`; `/login`→308→`/anmelden`, `/signup`→308→`/registrieren`; unbekannte Pfade 404.

## 2. Abgleich §16.2 Öffentliche NeXify-Seiten

| Soll (§16.2) | Ist vor diesem Stand | Ist nach diesem Stand |
|---|---|---|
| Startseite | vorhanden (Referenzniveau) | unverändert |
| Leistungsseiten | `/leistungen`, `/websites`, `/agenten-automatisierung`, `/apps-portale`, `/leistungsumfang` | unverändert |
| NeX2fly Suite | `/produkte/nex2fly` | unverändert; Tarife bleiben Entwurf, nicht freigegeben |
| NeX Agentic AIFly | nur Teil von `/produkte/one` | eigene Seite `/produkte/nex-agentic-aifly` |
| AIFly ORACLE | nur Teil von `/produkte/one` | eigene Seite `/produkte/aifly-oracle` |
| Skills und MCP | fehlte | `/produkte/skills-mcp` |
| Portale (Überblick) | fehlte | `/portale` |
| Landingpages, Explore- und Stadtseiten | fehlt | **offen** (siehe 4) |
| Registrieren und Anmelden | vorhanden; `/login` `/signup` leiten um | Canonical/Description ergänzt, `noindex` |
| KI-Hinweise | befüllt (4 Sprachen) | unverändert |
| Impressum, Datenschutz, AGB | Impressum ohne Registerangaben | Registerangaben ergänzt (siehe 3) |
| Operator Dashboard (intern) | `/intern/leitstand` (geschützt) | unverändert |
| Komponenten- und Baukasten-Showcase | fehlt | **offen** (siehe 4) |

## 3. Behobene Defekte in diesem Stand

- **Canonical/Description fehlten** auf `/anmelden`, `/registrieren`, `/teileklar/suche|kategorien|warenkorb|kasse|werkstatt`
  (erbten das globale `noindex` ohne eigene Metadaten). Jetzt über `routeMetadata()` aus `lib/page-seo.ts`: gleiche
  Title/Description/Canonical/hreflang wie die Katalogseite; Kategorien und Werkstattsuche indexierbar, Suche, Warenkorb,
  Kasse und Auth ausdrücklich `noindex, follow`.
- **Impressum**: Abschnitt „Registerangaben und Anschrift“: Kamer van Koophandel, Registerstelle **Roermond**,
  KvK 90483944, BTW NL865786276B01, Graaf van Loonstraat 1E, 5921 JA Venlo. Die Rechtsform (Eenmanszaak oder B.V.) bleibt
  ausdrücklich **unbestätigt** (Gesamtbeschreibung §15/§18); die Seite bleibt „kein abschließend freigegebenes Impressum“.
  NL/FR/EN dieses Abschnitts sind Entwurfsübersetzungen und brauchen rechtliche Prüfung vor Freigabe.
  Im Code war kein „Eindhoven“ vorhanden; der Fehler lag in der fehlenden Registerangabe.
- **Sitemap-Test** (`apps/site/tests/seo-sitemap.test.mjs`) las statische Dateien, die der Commit `5222298` durch die
  Next-Routen `sitemap.ts`/`robots.ts` ersetzt hatte. Test prüft jetzt den gleichen Vertrag gegen diese Quellen
  (Ausschlussliste, private Pfade, Hauptdomain). Keine Schwelle gelockert.

## 4. Offen, mit Owner und nächster Aktion

| Punkt | Warum offen | Owner | Nächste Aktion |
|---|---|---|---|
| Rechtsform / Impressum final | Eenmanszaak vs. B.V. ungeklärt | Inhaber | Registerauszug liefern, dann Impressum freigeben |
| Landingpages, Explore-, Stadtseiten | zehn Suchbegriffe und Top-10-Wettbewerbsanalyse sind nicht belegt; Inhalte dürfen nicht erfunden werden | Content-/SEO-Owner | Suchbegriffe bestätigen, Wettbewerb real erheben, danach Seiten anlegen |
| Komponenten-/Baukasten-Showcase | Vorlagen-Bestand (>100) nicht vorhanden | Art Director | Vorlagen aus Prototypen ableiten |
| Canonical-Domain | durch `main` (db8555d) auf `www.nexifyai.de` entschieden; Gesamtbeschreibung §6 nennt noch `nexifyai.cloud` | Inhaber | Gesamtbeschreibung angleichen |
| Tarife NeX2fly | Entwurf | Inhaber | Freigabe |
| Hero-Video, Higgsfield-Credits | Konto-Guthaben fehlt; Autoplay mit Ton nicht belegt | Inhaber | Guthaben abfragen, dann produzieren |
| Mehrsprachigkeit | nur DE gesichert | Content-Owner | NL/FR/EN je Seite sprachlich prüfen |
| Kontaktformular → Resend | Code vorhanden (`/api/requests`, Outbox), Lauf gegen echte MongoDB/Resend nicht nachgewiesen | Backend-Owner | Ende-zu-Ende-Test mit Staging-Zugang |
| Finanzierung / Zahlungen | keine Zahlung, kein Guthaben-Aufladen ohne Freigabe (Ebene D) | Inhaber | konkrete Freigabe je Aktion |
| Gesamtabnahme | make test rot (siehe `PROGRESS.md`), historische Nachweis-Pins veraltet | unabhängiger Review | Pins fachlich neu erheben, nicht umbinden |
