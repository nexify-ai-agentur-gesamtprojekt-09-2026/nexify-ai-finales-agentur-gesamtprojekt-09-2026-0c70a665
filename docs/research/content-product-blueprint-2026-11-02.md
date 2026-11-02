# Kundeninhalte und Produktkatalog: belegte Migration · 02.11.2026

Status: Anwendungskorrekturen umgesetzt; keine Gesamtabnahme. Kanonischer Vorschlag: PR60, Commit 77d80462944ed2320ad563cd1140036b95bf21ba. Die eigentümerprivate Sites-Ausgabe und GitHub-main sind unterschiedliche Laufzeit-/Quellstände. Main bleibt unverändert.

## Vom Soll zur sichtbaren Ausgabe

Kanonisch sind aktuelle Nutzerweisungen, bestätigte Geschäftsfakten und die Mastervorgabe vom29.10. Historische one/one+-Texte, alte Firmenformen und frühere Preise dürfen diese Reihenfolge nicht überstimmen. NeXify AI beschreibt die Agentur; NeX2fly ist die eigene Suite; NeX Agentic AI und AI Fly Oracle ordnen Arbeit und Koordination; TEILEKLAR bleibt eigenständiger Handel und Werkstattbereich.

32 redaktionelle Seiten wurden in DE/NL/FR/EN neu formuliert: Nutzen, konkreter Umfang, passende Einordnung und vorhandener nächster Schritt. 67 Fachabschnitte und268 lokalisierte Abschnitte. Sieben Rechtsseiten bleiben unverändert und nicht rechtsfachlich abgenommen. Home/Hero verwenden echte Page-Daten; referenzierte Erklärmodule beziehen ihre Überschrift und ihren Absatz aus derselben Sektion. Die Sektion wird genau einmal ausgegeben. Alte CTA-Labels werden nicht positionsweise auf neue Ziele übertragen. Gemeinsame UI- und Shoptexte liegen in zentralen JSON-Dateien. Der Vorlesedienst liest dieselbe validierte Assistentenquelle und behält seine15 vorhandenen DE/NL/FR-Texte; EN-Text aktiviert keine EN-Stimme.

Das kanonische Main enthielt sieben Rechtserklärungen ohne EN. Diese werden nicht automatisch übersetzt: Die Zusatznotiz erscheint bei EN ausdrücklich als deutsches Original. Dies ist keine Übersetzungs- oder Rechtsabnahme.

## Daten- und Darstellungsblueprint

| Ebene | Umgesetzte Bindung | Verbleibende Abnahme |
|---|---|---|
| Katalogabruf | Alle Seiten bis ausdrücklich leer; Fehler, Wiederholung, Limit oder unvollständige Ressourcen brechen ab | Aktueller autoritativer Pagination-/Snapshot-/Quotenvertrag |
| Zahlen | Strikte Preise/Bestände; unbekannt wird nicht zu0; CSV-Werte ausdrücklich vorhanden | Aktuelles BigBuy-CSV-/Steuer-/Währungsschema |
| Veröffentlichung | Eine MongoDB-Transaktion für Produkte, Deaktivierung, Kategorien, Manifest und Abschluss; kein nichttransaktionaler Ersatz | Echte Topologie, Rechte, Kapazität und Wiederanlauf |
| Bilder | Identität erhaltende Lieferantenoriginale, exakter HTTPS-Host/-Pfad, contain, sichtbare Fehler; CSP auf beobachtetes Verzeichnis begrenzt | Rechte, Variantenbezug und materielle Freistellqualität je Artikel |
| Oberfläche | Vite-Katalog, Suche, dynamische Kategorien/Produkte; Lesemodus, Fehler getrennt von leer | Tatsächlich gebundener Katalogdienst; keine Bestellfreigabe |
| Konten/Verbrauch | Keine neuen Rollen, SSO-, Guthaben-, Zahlungs- oder Trialbehauptungen | Reale Auth-/Mandanten-/Ledger-/Trial-E2E-Abnahme |

Die vorhandene Freistellpipeline bleibt ein Reviewprozess. Glas, Reflexionen, Beschriftung, Vollständigkeit und Lieferumfang dürfen nicht aus einem Alphakanal oder Dateihash als korrekt gelten. Keine generierten Teilebilder, kein Zuschneiden fehlender Produktteile und keine ungesehen freigegebenen Derivate. Produkt- und Verpackungsmaße, technische Einheiten sowie Fahrzeugpassung benötigen noch einen eigenen bestätigten Datenvertrag.

## Tatsächlicher Datenstand

Ein begrenzter öffentlicher Read-only-Abruf lieferte500 Zeilen bei gemeldetem Gesamtwert3720. Pagination und Frische sind nicht verifiziert. Alle500 Bildreferenzen verwiesen auf cdnbigbuy.com/images/. Dieser Befund ist weder ein Vollkatalog noch eine Preis-, Rechte- oder Importfreigabe. Der aktive Vercel-Produktdienst antwortete503/runtime_binding_unavailable/database_namespace_unapproved. Das beweist einen Bindingfehler vor dem DB-Zugriff, nicht eine leere oder verlorene Datenbank. Env-Metadaten bestätigen eine verschlüsselte MONGODB_URI und keinen separat gelisteten DB_NAME; keine Werte wurden ausgegeben. Den Namespace-Gate nicht lockern oder blind einen fremden Bestand übernehmen.

## Verwendete offizielle Grundlagen

- Contentful: https://www.contentful.com/help/content-models/ und https://www.contentful.com/help/references/ — Struktur und Referenzierung gelesen; Wiederverwendung in unserem bestehenden JSON-Modell umgesetzt, kein zusätzlicher CMS-Betrieb behauptet.
- Vercel Commerce/Shop: https://vercel.com/templates/next.js/vercel-shop — typisierte Katalog-/Frontendgrenzen als Blueprint berücksichtigt. Das aktuelle Template ist Shopify-spezifisch; kein ungeprüfter Wechsel von BigBuy zu Shopify.
- MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src — beobachtete Bildquellen mit engem CSP-Verzeichnis abgleichen; kein allgemeiner https:- oder Proxy-Freibrief.
- BigBuy: https://www.bigbuy.eu/public/doc/Guia_API_BigBuy_EN.pdf und https://api.bigbuy.eu/rest/doc — offizielle Quellen gefunden; aktuelle vollständige Inhalte waren über den verfügbaren Zugriff nicht lesbar. Kein vollständig gelesener aktueller Vertrag behauptet; Drittanbieter-Spiegel ersetzen ihn nicht.

## Verifikation und Grenzen

102 Site-Tests,80 gezielte BigBuy-Prüfungen, lokale Präsentations-/Assistentenchecks und der Site-Build bestanden. Die vollständige lokale Kette mit kombinierten vorhandenen Abhängigkeiten lief729 Tests:54 Fehlerfälle,9 Errors,11 Skips; die verbliebenen Fehler betreffen veraltete gebundene Quellen-/Browsernachweise. make check ist grün; make check-arch bleibt wegen veralteter Nachweise rot. Keine Hashes wurden zum Schein an einen nicht ausgeführten Browserlauf angepasst. Node24.22.1/pnpm11.25.0 sind die gemessene Hosttoolchain; die deklarierte Node22.23.4/pnpm12.15.0-Betriebsabnahme bleibt separat. Der große Build-Chunk bleibt offen.

Browser: tatsächliche Startseite/Hero, deduplizierte Shopabschnitte, EN-Sprachwechsel und Suche mit URL-Query geprüft; fehlender Dienst wird als Fehler und nicht leerer Bestand angezeigt. Gemessener Viewport1363×936, kein horizontaler Überlauf in diesen Ansichten. Keine neue physische Mobilgeräte-, Safari- oder vollständige WCAG-Abnahme.

## Offene Maßnahmen

1. Runtime-/Datenowner: Zuordnung des bestehenden Stores und des geplanten Namespace nexify_teileklar_shop_v1 belegen; danach kontrollierten Preflight und gegebenenfalls ausdrücklich zulässige Initialisierung ausführen. Niemals die Namensprüfung deaktivieren. Erneuter Readback des Produktdienstes erforderlich.
2. Katalogowner: aktuelle autorisierte BigBuy-Dokumentation/Entitlements, vollständigen Abruf, Varianten, Steuer-/Einheitenvertrag und Quoten abnehmen; zunächst isolierter Lauf und Vergleich mit bestehender Generation.
3. Medienowner: echte Artikelstichprobe mit Glas, Metall, Etiketten und Lieferumfang prüfen; nur exakt zugeordneten geprüften Varianten Bildderivate freigeben. Der zuvor blockierte Hero-Transfer wird nicht erneut versucht.
4. QA-Owner: alle betroffenen gebundenen Browser-/Integrationsbelege tatsächlich neu ausführen, danach vollständige Prüfkette und kanonisches CI erneut bewerten. Einzeltests ersetzen diese Abnahme nicht.
5. Pascal/Rechtsverantwortliche: ausstehende Betreiber-/Rechts-/Preisentscheidungen konkret bestätigen. Keine neuen rechtlichen Tatsachen oder Tarife in diesem Arbeitsschritt.

Interner Wiederprüfungspunkt:03.11.2026,12:00UTC; keine Kunden-SLA und keine angelegte Automation. Der detaillierte interne redaktionelle Prüfdatensatz wird nicht in den kanonischen PR hochgeladen. Nach einer automatischen Uploadablehnung wurden Repository-Eigentum, private Sichtbarkeit und Pushrechte verifiziert; anschließend ausschließlich der engere Anwendungscode ohne das interne Register übertragen.


## CI-Nachkorrektur

Die neue Shop-Installationszeile und zwei vorhandene manuelle Vercel-Workflowzeilen enthielten YAML-sensitive Doppelpunkte in unquotierten run-Skalaren. Sie sind als Blockskalare korrekt geparst; die vollständige Workflowmenge wurde geparst. Der bestehende manuelle/Opt-in-Deploymentmodus bleibt unverändert. Der initiale Draft-Head zeigte deshalb keine ausführbaren CI-Jobs. Der korrigierte Head ist77d80462944ed2320ad563cd1140036b95bf21ba; tatsächliche Folgechecks werden separat zurückgelesen, nicht aus erfolgreicher PR-Triage abgeleitet.
