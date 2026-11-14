# Inhaltsprüfung der öffentlichen Seiten (12.11.2026)

Messwerte aus `tools/content_audit.py` über `apps/site/.generated/public-site.json` (43 Seiten, Katalogtexte in vier Sprachen), Rohdaten `evidence/site-audit-2026-11-12/content-audit.json`. Das Werkzeug misst nur Umfang, Wiederholung, Floskeln (Heuristik) und Sprachparität. Ein Qualitätsurteil über Ton, Richtigkeit und Kundennutzen ist damit **nicht** gefällt; das bleibt redaktionell. Es wurde kein Text geändert und nichts erfunden.

## Messwerte

| Messwert | Ergebnis |
|---|---|
| Umfang je Seite (Zusammenfassung plus Abschnitte, Deutsch) | 60 bis 131 Wörter, Median 72 |
| Kürzeste Seiten | `/leistungen/apps-portale` (60), `/teileklar/kategorie` (61), `/leistungen/agenten-automatisierung` (63), `/preise-ablauf` (64), `/teileklar/produkt` (64) |
| Längste Seiten | `/produkte/nex2fly` (116), `/produkte/aifly-oracle` (124), `/impressum` (131) |
| Wiederholte Sätze (≥ 8 Wörter) auf drei oder mehr Seiten, Katalogtexte | 0 |
| Floskel-Heuristik (maßgeschneidert, ganzheitlich, innovativ, nahtlos, einzigartig, erstklassig, modernste, zukunftssicher, Mehrwert, digitale Transformation, state of the art, rundum, auf Augenhöhe, individuelle Lösungen) | keine Treffer |
| Sprachparität NL/FR/EN gegen DE (Wortzahl-Verhältnis) | 0.9 bis 1.33; keine Seite ist in einer Sprache identisch mit Deutsch |

Der Katalog ist also knapp, aber ohne Wiederholungen, ohne Floskeln der Heuristik und vollständig in vier Sprachen. Die Seiten sind kurze Orientierungstexte; die ausführliche Beantwortung von Kundenfragen steckt in den FAQ-Blöcken (`apps/web/lib/page-faq.ts`, zehn Seiten).

## Befund: FAQ-Antworten sind zum Teil wortgleich auf allen zehn Seiten

Auf den zehn FAQ-Seiten (`services`, `websites`, `automation`, `apps-portals`, `scope`, `solutions`, `pricing`, `nex2fly`, `one`, `api`) sind drei der acht Antworten für alle Seiten identisch (Quelle `page-faq.ts`, Konstanten `process`, `cost`/`productCost`, `next`):

| Frage | Antwort | Bewertung |
|---|---|---|
| Wie läuft es ab? | gleicher Ablauftext auf allen zehn Seiten | passt als gemeinsamer Prozess; Wiederholung ist hier fachlich richtig |
| Was kostet es? | „Aufwand und Kosten werden im Angebot festgelegt; Hosting, Software, KI-Verbrauch und gegebenenfalls Medienbudget separat“ (sieben Seiten), Produktvariante auf drei Seiten | beantwortet die Frage **ohne Zahl**; für Kundinnen und Kunden eine Leerstelle |
| Was können Sie jetzt tun? | gleicher Kontaktaufruf auf allen zehn Seiten | passt als gemeinsamer Abschluss |

Die Kostenfrage ist die einzige Antwort, die eine echte Kundenfrage ohne konkrete Aussage lässt. Ein Betrag darf nicht ohne Freigabe erscheinen: OF-04 (Tagessatz 449 € netto steht nur auf der Startseite, Freigabe der Formulierung für „Preise & Ablauf“ liegt bei Pascal). Vorschlag nach der Freigabe: den freigegebenen Tagessatz und eine Spanne oder ein Beispielumfang je Leistung in `cost` aufnehmen.

## Weitere Beobachtungen

- Die acht Fragen sind für alle Seiten dieselben Standardfragen. Seitenspezifisch sind nur Zielgruppe, Nutzen und Grenzen (`audience`, `benefit`, `limits`). Fragen, die Kundinnen und Kunden tatsächlich stellen (aus Chat-Verläufen oder dem Kontaktformular), sind im Repo nicht als Quelle belegt; sie sollten aus echten Anfragen abgeleitet werden, nicht erfunden.
- TEILEKLAR hat keine FAQ-Blöcke; die Shop-Oberfläche wird im Browser nur auf Deutsch ausgeliefert (siehe Site-Audit-Register).

## Offen (Owner: Content)

1. Freigabe der Preisangabe (OF-04), danach `cost` ergänzen.
2. Echte Kundenfragen sammeln (Kontaktformular, Chat, Vertrieb) und je Leistung ergänzen.
3. Redaktionelle Lesung der 43 Seiten auf Ton und Richtigkeit.
