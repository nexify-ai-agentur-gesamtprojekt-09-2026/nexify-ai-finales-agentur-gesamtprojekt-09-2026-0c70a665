---
name: nexify-seitentexte
description: Seitentexte von nexifyai.de und TEILEKLAR an der Quelle ändern (config/site-map.json, config/home-concept-copy.json), in allen vier Sprachen mit gleichem Schlüsselsatz, ohne unbelegte Aussagen und ohne Rechts- oder Kassentexte zu berühren. Verwenden bei jeder Änderung an Titeln, Zusammenfassungen, Abschnittstexten, Schaltertexten oder Meta-Beschreibungen und bei Aufträgen wie „Text umschreiben", „Seite neu texten", „Überschrift ändern", „Übersetzung nachziehen".
---

# Seitentexte

Texte stehen in Konfigurationsdateien, nicht in Komponenten. Geändert wird an der Quelle, geliefert wird als Entwurfs-PR mit Vorschau zur Freigabe durch den Inhaber. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Quellen

| Datei | Inhalt |
|---|---|
| `config/site-map.json` | alle Seiten unter `pages`: `title`, `summary`, `sections`, `metadata`, je Feld ein Objekt mit `de`, `nl`, `fr`, `en` |
| `config/home-concept-copy.json` | Startseite, oberste Ebene `de`, `nl`, `fr`, `en` mit identischen Schlüsseln |
| `config/fakten.json`, `config/api-prepaid.json` | einzige Quelle für Zahlen, Zeiten und alles mit Preisbezug |
| `docs/05-marketing/` | Konzept `gesamtkonzept-2026-11-14.md` und Prüfmaßstäbe (`marketing-psychologie-pruefung.md`, `seo-i18n-und-local-marketing.md`, `signalfeld-philosophie.md`, `story-3d-startseite.md`) |

Maßgebliches Konzept ist `docs/05-marketing/gesamtkonzept-2026-11-14.md` (seit dem 14.11.2026 auf `main`, gemergt als Texte „zur Freigabe“). Die übrigen Dateien des Ordners sind Prüfmaßstäbe dazu.

## Regeln

- **Deutsch ist Quelle.** `nl`, `fr`, `en` tragen denselben Schlüsselsatz; kein Schlüssel fehlt, keiner kommt hinzu, der nicht in allen vier steht.
- **Keine Aussage ohne Beleg.** Keine Referenzen, Kundennamen, Logos, Zitate, Messwerte, Fristen, Reaktionszeiten, Stückzahlen. Zahlen und Preise nur wörtlich aus `config/fakten.json` und `config/api-prepaid.json`; ungeklärte Tarife bleiben „zur Freigabe“. Lässt sich ein Satz nicht belegen, entfällt er oder wird als Frage an den Inhaber gestellt.
- **Nicht anfassen:** Rechtsseiten (in `config/site-map.json` alle Seiten mit `content_kind` `legal_notice`, zum Beispiel `/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/teileklar/rechtliches`), Kassentexte und Schalter der Bestellung (Button-Lösung nach § 312j BGB), Einwilligungstexte, Preisangaben. Keine automatische Übersetzung von Rechtstexten.
- **Produktname** nach `DECISIONS.md` D-011: „NeX AIFly Suite“. IDs und die Adresse `/produkte/nex2fly` bleiben.
- **Nur Text.** Bausteine, Reihenfolge und Gestaltung ändert `nexify-klon-fabrik`, nicht dieser Skill.

## Schritte

1. Worktree und Zweig nach `nexify-zweig-und-pr`.
2. Betroffene Seiten in `config/site-map.json` über `id` oder `path` finden. `content_kind` und `site_context` lesen: Seiten mit `legal_notice` und die Kasse scheiden aus.
3. Vor dem Schreiben Bindungen prüfen (`nexify-belege-und-pins`). `config/site-map.json` ist mehrfach gebunden.
4. Deutsch schreiben, dann `nl`, `fr`, `en` sinngleich von Hand. Länge beachten: Titel müssen bei 360 px in jeder Sprache umbrechen, ohne aus dem Rahmen zu ragen.
5. **Folgebindungen nachführen**, im selben Commit:
   - Ändert sich ein deutscher Modultitel, `context_title` in `config/page-media-registry.json` angleichen (geprüft von `apps/site/tests/public-video-assets.test.mjs`).
   - Greifen `config/page-explainers.json` oder `apps/web/lib/page-faq.ts` denselben Wortlaut auf, dort mitziehen.
   - Pins nur mit Belegart nachziehen, sonst im PR unter „Nicht belegt“ nennen. Regel und Verfahren: `nexify-belege-und-pins`.
6. Prüfen (siehe unten).
7. Entwurfs-PR nach `nexify-zweig-und-pr`. Zusätzlich in die Beschreibung: je Seite alt und neu in Deutsch, Hinweis auf geänderte Sprachen, Vorschau-Adresse, und der Satz „Texte zur Freigabe durch den Inhaber“. Ohne Freigabe kein Merge.

## Prüfung

Lokal bauen und starten wie in `nexify-klon-fabrik` (Abschnitt „Gleichmacher“), dann:

```bash
node tools/live-check.mjs http://localhost:3311
node tools/gleichmacher.mjs http://localhost:3311
```

`tools/live-check.mjs` prüft unter anderem „Titel im Rahmen“ bei 360 px und den alten Produktnamen, aber je Seite nur in der ausgelieferten Sprache. Deshalb zusätzlich jede geänderte Seite bei 360 px Breite mit `?lang=nl`, `?lang=fr` und `?lang=en` im Browser öffnen und messen, ob der Titel im Rahmen bleibt (rechte Kante des `h1` nicht rechts von seinem Behälter). Ergebnis je Seite und Sprache in den PR.

Dazu die Gates aus `nexify-zweig-und-pr`, Schritt 5; `node tools/ds-audit-cli.js` prüft die i18n-Parität.

## Grenzen

- Kein Livegang, keine Änderung an der Indexierung, kein Text direkt in einer Komponente.
- Kein Entwurf wird als freigegeben ausgegeben. Vorschau ist Vorschau.
- Texte für Kundenprojekte gehören nicht hierher: `nexify-kundenprojekt`.

## Was als Beleg gilt

Für eine Aussage: die Fundstelle in `config/fakten.json`, `config/api-prepaid.json` oder eine datierte Angabe des Inhabers. Für die Lieferung: beide Läufe mit Exit 0 gegen den lokalen Build am genannten Commit, die 360-px-Messung je Sprache, die Gate-Zahlen. Die Freigabe des Inhabers ist ein eigener Schritt und wird mit Datum im PR festgehalten.
