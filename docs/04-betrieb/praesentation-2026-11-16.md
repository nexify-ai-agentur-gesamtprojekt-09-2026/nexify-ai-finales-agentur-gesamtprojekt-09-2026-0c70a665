# Eigene Seiten vor dem Gespräch am 16.11.2026 · Darstellungsprüfung und Behebung

Zweck: Der Inhaber Pascal Courbois führt am 16.11.2026 um 11:00 Uhr (Europe/Amsterdam,
10:00 UTC) ein Gespräch mit einem Interessenten, der eine direkte Kooperation mit
wiederkehrenden Aufträgen erwägt. Verkauft wird über Qualität und hochwertige Darstellung.
Diese Prüfung geht die eigenen Seiten im echten Browser durch und behebt, was einem
zahlenden Interessenten auffallen würde.

Zweig: `claude/eigene-seiten-praesentation`, ausgehend von `main` `9c9c806`.
Messzeit: 15.11.2026, 22:20 UTC bis 16.11.2026, 01:10 UTC.
Gemessen gegen den lokalen Produktionsbau dieses Zweigs (`next build`, `next start -p 3311`),
nicht gegen die Auslieferung. Die Live-Nachmessung gegen `https://nexifyai.de` gehört nach
dem Merge dazu (`.claude/skills/nexify-klon-fabrik/SKILL.md`, „Nach dem Merge“) und ist hier
**nicht** erfolgt.

Werkzeuge: Playwright 1.63.0 (festgelegt ist 1.65.0 in `.github/evidence-runner/package.json`;
die Abweichung ist bekannt, OA-177). Browser Chromium. Breiten 390, 768, 1280 und 1800 px.
Bildschirmfotos wurden tatsächlich angesehen, nicht nur Prüfskripte gelesen.

Alle Prüfprotokolle liegen vollständig im Zweig:
`docs/04-betrieb/praesentation-2026-11-16-pruefungen/` (Befehl, Zeit, ganze Ausgabe).
Bildschirmfotos vorher/nachher: `docs/design/belege/praesentation-2026-11-16/`.

---

## 1. Was geprüft wurde

29 Adressen (28 NeXify-Seiten plus `/teileklar`) bei vier Breiten, dazu die drei
Rechtsrouten `/agb`, `/avv`, `/widerruf`, die bis zu dieser Arbeit von keiner Seite aus
erreichbar waren.

| Prüfung | Werkzeug | Ergebnis am Ende |
|---|---|---|
| Bausteine gegen die Startseite | `node tools/gleichmacher.mjs` | **47 Seiten, 32.213 Vergleiche, 0 Abweichungen** (vorher 44 Seiten; +3, weil die Rechtsrouten jetzt verlinkt sind) |
| Alle verlinkten Seiten, Kopfzeilen, Medien, PWA | `node tools/live-check.mjs` | 350 Prüfungen, 7 Befunde — **alle aus der lokalen Umgebung**, siehe Abschnitt 5 |
| Design-, SEO-, i18n-, A11y-Audit | `node tools/ds-audit-cli.js`, `make check` | **0 Fehler, 0 Warnungen** |
| Typprüfung | `node tools/lint.mjs` | **0 Diagnosen** (265 Dateien) |
| Waagerechtes Scrollen, Überläufe, Trefferflächen, `alt`, tote Verweise, Überschriftenstufen, Platzhalter | eigener Durchgang, 29 Seiten × 4 Breiten | 7 Befunde, davon 3 gewollt (Shop-Leiste) und 4 aus der lokalen Umgebung |
| Fokusrahmen | echte Tabulatortasten, Bildpunktvergleich | **405 Tabstopps auf 9 Seiten, 0 ohne sichtbaren Rahmen** |
| Kontrast der Kopfleiste über hellen Filmen | echte Bildpunkte, hellster Leistengrund beim Blättern | siehe Befund 01 |
| Schriftgrößen-Reihe | berechnete Stile aller Textknoten | 11 Stufen bei 390 px (12/13/14/15/16/18/18,4/24/32/36), **keine Bruchstelle** |
| Rechtschreibung, Typografie | Suche nach Wortdopplung, fehlendem Abstand, geraden Anführungszeichen, drei Punkten | **keine echten Treffer** |
| Python-Prüfkette | `python3 -m unittest discover -s tests` | **46 rote Namen; auf `main` sind es 47.** Kein neuer roter Test; einer ist auf diesem Zweig grün geworden |

---

## 2. Behobene Befunde

Jede sichtbare Änderung hat einen benannten, gemessenen Befund. Das Design wurde nicht
umgestaltet: keine neue Farbe, keine neue Schrift, kein neuer Baustein, kein neuer
Design-Token.

### 01 · schwer · Kopfleiste auf allen Seiten · Über hellen Filmen unlesbar

**Befund.** `#atelier[data-scrolled='true'] .site-header::before` trug
`background:var(--as-glass-dense),color-mix(in srgb,var(--as-ground) 34%,transparent)`.
Das ist ungültige CSS-Kurzform: `--as-glass-dense` endet selbst auf eine Farbe, und eine
zweite Farbe dahinter ist keine gültige Schicht. Der Browser verwarf deshalb die **ganze**
Angabe, und die klebende Leiste trug gar keinen Grund — nur eine Unschärfe. Der berechnete
Wert war `rgba(0, 0, 0, 0) none`.

**Messung vorher** (echte Bildpunkte, schlechteste Stelle beim Blättern über die Filme der
Startseite):

| Breite | Wortmarke | Claim | Projektknopf |
|---|---|---|---|
| 390 | 1,28:1 | — | — (dort ausgeblendet) |
| 768 | 1,07:1 | 1,01:1 | 1,11:1 |
| 1280 | 1,06:1 | 1,00:1 | 1,10:1 |
| 1800 | 1,01:1 | 1,05:1 | 1,01:1 |

Gefordert sind 4,5:1 (AGENTS.md, WCAG 2.2 AA). 1,00:1 heißt: nicht zu sehen.

**Behebung.** Dieselbe Deckung gültig geschrieben: Glasschichten aus dem Token, danach die
Grundfarbe als eigene Angabe. `1-(1-0,72)*(1-0,34)=0,815` war die ursprünglich gemeinte
Deckung; damit blieb der Claim (12 px) bei 768 und 1800 px mit 4,12 und 4,24:1 knapp unter
4,5:1, deshalb 86 %.

**Messung nachher** (hellster gemessener Leistengrund je Breite):

| Breite | Leistengrund | Wortmarke | Claim | Projektknopf | Navigation |
|---|---|---|---|---|---|
| 390 | rgb(48,51,50) | 11,02:1 | 6,47:1 | 11,02:1 | 8,40:1 |
| 768 | rgb(69,72,69) | 8,00:1 | 4,70:1 | 8,00:1 | 6,10:1 |
| 1280 | rgb(64,66,64) | 8,75:1 | 5,14:1 | 8,75:1 | 6,67:1 |
| 1800 | rgb(68,70,69) | 8,21:1 | 4,82:1 | 8,21:1 | 6,26:1 |

Bildschirmfotos: `01-kopfleiste-ueber-film-1280-vorher.jpg` / `…-nachher.jpg`.
Protokoll: `kopfleiste-kontrast-nachher.json`.
Datei: `apps/web/components/AtelierSystem.css`.

### 02 · schwer · Segmentleiste `.hc-anchors` · Beschriftungen überlappen, Pfeil abgeschnitten

**Befund.** Die Segmente durften schrumpfen (Vorgabe `flex-shrink:1`) und trugen zugleich
`white-space:nowrap`. Passte die Zeile nicht, lief jede Beschriftung aus ihrem eigenen Feld.
Gemessen: `/produkte/skills-mcp` bei 768 px — drei Beschriftungen schoben sich ineinander,
die letzte lief aus der Pille heraus. `/produkte/nex2fly` bei 1280 px — 820 px Inhalt in
818 px Feld, die Kante schnitt den letzten Pfeil ab.

**Behebung.** Die Leiste bleibt eine Zeile; reicht der Platz nicht, bricht die Beschriftung
innerhalb ihres eigenen Feldes um. Die Pille wächst dann in der Höhe — dieselbe Ausweichform,
die der Raster-Fall unter 640 px schon benutzt.

**Nachher gemessen:** `/produkte/skills-mcp` 768 px: 3 Segmente, 213 + 235 + 243 = 691 px =
Leistenbreite, kein Überlauf. `/produkte/nex2fly` 1280 px: 189 + 232 + 181 + 216 = 818 px =
Leistenbreite.

Bildschirmfotos: `02-segmentleiste-skills-mcp-768-vorher.jpg` / `…-nachher.jpg`,
`03-segmentleiste-nex2fly-1280-vorher.jpg` / `…-nachher.jpg`.
Datei: `apps/web/components/AtelierSystem.css`.

### 03 · mittel · `/avv` bei 390 px · Überschrift läuft aus dem Bild

**Befund.** Die H1 „Auftragsverarbeitungsvertrag (AVV / DPA)“ stand **410 px breit in einer
342 px breiten Spalte** und lief rechts aus dem Bild („Auftragsverarbeitungsvert…“).
Ursache: `overflow-wrap:break-word` bricht lange Wörter zwar um, verkleinert aber die
Mindestbreite des Kastens nicht.

**Behebung.** `overflow-wrap:anywhere` plus dieselbe Silbentrennung, die der Hero der
Startseite schon trägt — **nur** für die Überschrift im Kopfbereich der Dokumentseiten
(`.pc-hero .pc-hero-copy :is(h1,h2)`), nicht für alle Überschriften.

**Nachher:** 342 px, bricht mit Trennstrich als „Auftragsverarbeitungs-/vertrag“.

Bildschirmfotos: `04-avv-ueberschrift-390-vorher.jpg` / `…-nachher.jpg`.

### 04 · mittel · Chat-Eingabe bei 1280 px · Platzhalter mitten im Wort abgeschnitten

**Befund.** Der Platzhalter „Wobei können wir Ihnen helfen?“ brauchte **241 px** bei
**223 px** Schreibbreite und endete sichtbar als „…Ihnen helfe“. Ein Platzhalter bricht im
Textfeld nicht um; mehr Höhe löst das nicht. Zusätzlich benutzte das Feld die Beschriftung
als Platzhalter, obwohl in derselben Datei ein eigener Platzhaltertext steht, der nie
verwendet wurde.

**Behebung.** Das Feld nimmt jetzt den dafür vorgesehenen Platzhalter, gekürzt auf eine
Länge, die in jeder Breite passt (de „Ihre Nachricht …“, 125 px; nl, fr, en sinngleich).
Die Höhe des Feldes bleibt unverändert; es wächst beim Tippen wie bisher über `useAutoGrow`
(gemessen: 48 px in Ruhe, 160 px bei acht Zeilen, in jedem Browser, da JavaScript).

Bildschirmfotos: `05-chat-eingabe-1280-vorher.jpg` / `…-nachher.jpg`.

### 05 · schwer · `/wissen/projekt-vorbereiten` · Aufzählung ungestaltet, halbe Seite leer

Inhaberbefund mit Bildschirmfoto, übermittelt über die koordinierende Sitzung:
„Sowas darf nicht einfach nur untereinander weg stehen, sondern muss ansprechend,
verständlich präsentiert sein.“

**Befund.** Die fünf Fragen standen als nackte Textzeilen untereinander, je mit „1. “, „2. “
davor, alle in gleicher Größe und Farbe. Die linke Spalte daneben war **482 px** hoch leer
(gemessen bei 1280 px: links 74 px, rechts 556 px).

**Behebung.** Die Fragen bekommen den Ablauf-Baustein der Startseite (`.hc-process` mit
`ol`/`li`, Ziffer aus dem CSS-Zähler `hc-step`) und stehen über die ganze Breite, nicht
neben einer leeren Spalte. Kein neuer Baustein: derselbe, den die Startseite für ihren
Ablauf und jede Unterseite für „Passende Themen“ benutzt. Die Umstellung greift nur, wenn
ein Abschnitt durchgehend nummeriert ist — das trifft im ganzen Seitenplan genau auf diesen
einen Abschnitt zu.

Bildschirmfotos: `06-fuenf-fragen-1280-vorher.jpg`, `06b-…-vorher-forts.jpg`,
`06-fuenf-fragen-1280-nachher.jpg`.

### 06 · mittel · 30 von 56 Abschnitten · Linke Spalte leer, rechte gedrängt

**Befund.** Der Abschnittsbaustein der Unterseiten stellte Dachzeile und Überschrift links,
den gesamten Text rechts. Gemessen bei 1280 px über alle 28 Seiten: **30 von 56 Abschnitten**
mit mehr als 140 px Unterschied, der größte 482 px.

**Behebung.** Hat ein Abschnitt mehr als einen Absatz, steht der erste als Vorspann unter der
Überschrift — dieselbe Stapelung, die `.hc-budget-story` auf der Startseite schon benutzt
(Dachzeile, Titel, Text untereinander). Beide Spalten tragen damit Inhalt.

**Nachher:** 25 Abschnitte über 140 px Unterschied, davon 13 jetzt mit der *linken* Spalte
als längerer Seite (Überschrift plus Vorspann gegen einen kurzen Schlusssatz) — ein
gewöhnlicher redaktioneller Zweispalter. Die verbleibenden rechtslastigen Fälle sind
Abschnitte mit nur einem Absatz; dort gibt es nichts zu teilen.

Protokoll der Messung: Abschnitt 6 dieses Berichts, Zahlen im Commit `2cdfd0c`.

### 07 · mittel · Unterseiten · Der zweite Schalter im Kopfbereich sah nicht wie ein Verweis aus

**Befund.** `.identity-secondary-link` (zum Beispiel „Websites & Marke“ auf `/leistungen`,
„Pakete vergleichen“ auf `/preise-ablauf`, „Partner werden“ auf `/portale`) trug gemessen:
dieselbe Farbe wie der Fließtext (Token `--color-text-sekundaer`), keine Unterstreichung,
keinen Rahmen, keinen Grund, kein Zeichen. Nichts daran zeigte, dass er zu etwas führt.

**Behebung.** Er bekommt den Pfeil, den jeder andere Verweis dieser Seiten trägt
(`HcArrow`). Keine neue Farbe, keine neue Form.

### 08 · schwer · `/teileklar` ohne Artikel · „Das Schaufenster wird geladen …“ ohne Ende

**Befund** (gemessen von der parallelen Inhaltsprüfung gegen die Auslieferung, Befund 02
dort): `GET https://nexifyai.de/api/shop/products` antwortet **HTTP 200 mit null Artikeln**.
Die Oberfläche unterschied nur „Fehler“ und „nicht Fehler“ und zeigte deshalb dauerhaft
einen Ladehinweis. Ein Ladehinweis, der nie endet, wirkt wie ein Defekt. Unter
„Was suchen Sie?“ stand ohne Kategorien eine leere Fläche ganz ohne Hinweis.

**Behebung.** Drei Zustände statt zwei: lädt noch · geladen und leer · nicht erreichbar.
Im leeren Fall steht sachlich „Zurzeit sind keine Artikel eingestellt. Das Sortiment wird
gerade aufgebaut.“ Nachgestellt im Browser mit abgefangener Antwort (200, `items: []`), bei
390 und 1280 px angesehen.

Bildschirmfoto: `07-teileklar-leeres-sortiment-1280-nachher.jpg`.
Ein Vorher-Foto dieses Zustands gibt es nicht: lokal fehlt der Shop-Dienst ganz (404), der
Produktionsfall (200 mit null Artikeln) ließ sich nur nachstellen, nicht am alten Stand
fotografieren.

### 09 · schwer · `/agb`, `/avv`, `/widerruf` · Vorhanden, aber von keiner Seite erreichbar

**Befund** (Inhaltsprüfung, Befund 05): Die drei Seiten antworten mit 200, standen aber in
keinem Seitenplan. `href="/agb"` kam im HTML der Startseite **null** mal vor. Sie waren nur
über die direkte Adresse erreichbar. Für einen Geschäftspartner sind auffindbare AGB eine
Mindestvoraussetzung.

**Behebung.** Feste Verweise in der Fußzeilengruppe „Rechtliches“: AGB,
Auftragsverarbeitung (AVV), Widerruf — in allen vier Sprachen beschriftet. **Die Dokumente
selbst sind unverändert.**

**Folgebefund, dabei gefunden und behoben:** Sobald die drei Seiten verlinkt waren, nahm der
Gleichmacher sie in die Messung auf und meldete **21 Abweichungen**: Schriftgröße,
Zeilenhöhe, Farbe und Innenabstand der Fußzeile wichen bei 390 und 1440 px ab. Ursache war
kein Gestaltungsfehler, sondern ein zweites `<footer>`-Element im Seiteninhalt dieser drei
Routen (eine Reihe von Verweisen, als `footer` ausgezeichnet). Es ist jetzt ein `div` mit
derselben Klasse — gleiche Darstellung, keine doppelte Landmarke mehr, und der Gleichmacher
misst wieder die richtige Fußzeile. Danach: 47 Seiten, 0 Abweichungen.

### 10 · mittel · Fußzeile aller Seiten · Der Freigabestand-Hinweis stand überall

**Befund** (Inhaltsprüfung, Befund 01): „Die Seiten zu Anbieterinformationen und Datenschutz
sind direkt erreichbar. Vollständige Pflichtangaben und Rechtstexte stehen noch zur Prüfung
und Freigabe.“ stand im ausgelieferten HTML **jeder** Seite, hinter der zugeklappten Leiste
„Hinweise zu den Rechtsdokumenten“. Wer sie öffnet, liest auf einer Leistungs- oder
Produktseite einen Hinweis, der über diese Seite nichts aussagt.

**Behebung.** Der Hinweis erscheint nur noch auf den Rechts- und Pflichtseiten
(`/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/barrierefreiheit`,
`/cookies`, `/agb`, `/avv`, `/widerruf`, `/teileklar/rechtliches`). Der Wortlaut ist
unverändert; nur sein Ort ist eingegrenzt.

**Gemessen nachher, alle 29 Seiten:** auf **20 Seiten kein einziger** solcher Satz sichtbar.
Sichtbar bleiben: `/kontakt` (eine Teaserkarte zu `/datenschutz`), `/produkte/api`
(Teaserkarte zu `/vertragsgrundlagen` und der eigene Satz „Die Tarife stehen noch zur
Freigabe“), die sechs Rechtsseiten selbst (dort gehört er hin) und `/teileklar`
(„Gutscheine gibt es noch nicht“ als Linktext). Warum nicht mehr: siehe Abschnitt 4.

### 11 · klein · `/teileklar/katalog` antwortete mit 404

**Behebung.** Die Adresse führt jetzt dauerhaft (308) auf `/teileklar/shop`, bzw. auf den
laufenden Shop, wenn die Variante aus Abschnitt 3 aktiviert ist. Kein toter Verweis mehr,
keine zweite Sortimentsseite zu pflegen.

### 12 · schwer · Die drei Rechtsdokumente in der Fußzeile · in der tragbaren Ausgabe ins Leere

**Woher der Befund kommt.** Der Prüfbot am Pull Request hat ihn gemeldet; ich habe ihn im
Browser nachgestellt und bestätigt. Es ist ein Folgefehler von Befund 09.

**Befund.** Die Fußzeile gehört `apps/web`, wird aber auch von der tragbaren Ausgabe
benutzt: `apps/site/src/main.tsx` lädt dasselbe `Workspace`. Diese Ausgabe kennt nur die
Adressen aus dem Seitenplan; `/agb`, `/avv` und `/widerruf` sind handgeschriebene
Next-Routen und stehen dort nicht. Gemessen in der gebauten tragbaren Ausgabe
(`vite preview`): `/agb`, `/avv` und `/widerruf` zeigen je die Seite **„Seite nicht
verfügbar“**. Die drei neuen Verweise der Fußzeile führten dort also genau dorthin —
auf jeder Seite der tragbaren Ausgabe.

**Behebung.** Die drei Verweise erscheinen nur, wo die Dokumente wirklich als eigene Route
liegen. `Workspace` und `SiteFooter` haben dafür den Schalter `documentRoutes`; gesetzt
wird er allein in `apps/web/app/layout.tsx`. Keine Änderung an den Dokumenten, keine
Änderung am Seitenplan, keine neue Gestaltung.

**Nachher gemessen** (`fussleiste-ausgaben-runde-4.json`): Next-Ausgabe 58 Verweise in der
Fußzeile, darunter alle drei — `/agb` → „Allgemeine Geschäftsbedingungen (B2B)“, `/avv` →
„Auftragsverarbeitungsvertrag (AVV / DPA)“, `/widerruf` → „Widerrufsrecht“. Tragbare
Ausgabe 55 Verweise, davon keiner der drei; die übrigen Rechtsverweise (Impressum,
Datenschutz, KI-Hinweise, Barrierefreiheit, Cookies) stehen in beiden Ausgaben gleich.

### 13 · mittel · `/teileklar` ohne Artikel · Der Hinweis konnte unwahr sein

**Woher der Befund kommt.** Ebenfalls vom Prüfbot, ebenfalls nachgeprüft. Folgefehler von
Befund 08.

**Befund.** Die Abfrage lautet `/api/shop/products?page_size=12&in_stock=true`. Eine leere
Antwort heißt also entweder „kein Artikel vorhanden“ **oder** „kein Artikel auf Lager“.
Mein Wortlaut behauptete das erste: „Zurzeit sind keine Artikel eingestellt. Das Sortiment
wird gerade aufgebaut.“ Lägen Artikel ohne Bestand im Katalog, wäre dieser Satz falsch —
und er erfindet dazu einen Grund.

**Behebung.** Ein Satz, der in beiden Fällen stimmt und keinen Grund erfindet: **„Zurzeit
ist kein Artikel im Schaufenster verfügbar.“** Gleicher Baustein, gleiche Stelle.
Nachgestellt im Browser mit abgefangener Antwort (200, `items: []`), 1280 px, Bild
`docs/design/belege/praesentation-2026-11-16/08-teileklar-leeres-sortiment-wortlaut-1280-nachher.jpg`.

---

## 3. Vorbereitet, aber nicht aktiviert: TEILEKLAR auf den laufenden Shop

Auftrag der koordinierenden Sitzung: Falls das eigene Sortiment bis 08:00 UTC nicht steht,
soll `/teileklar` den laufenden Shop sichtbar und selbstbewusst verlinken.

**Belegt:** `https://teileklar.shop/` antwortet mit 200, Titel „Autoteile online kaufen –
passgenau für dein Fahrzeug | TEILEKLAR“, im ausgelieferten HTML 186 Preisangaben, 84
Produktmarkierungen und ein Warenkorb. Die Adresse steht in `config/site-map.json` als
`requested_production_domain` der Shop-Marke; sie ist nicht erfunden.

**Umschalten:** ein Wort in `config/teileklar-schaufenster.json`:
`"quelle": "eigen"` → `"quelle": "extern"`. **Der Vorgabewert ist `eigen`; dieser Zweig
ändert das Verhalten also nicht.**

Mit `extern` zeigt die Seite im Kopfbereich statt des leeren Schaufensters den Satz
„Das vollständige Sortiment liegt im laufenden Shop unter teileklar.shop“ mit dem
Hauptschalter „Zu teileklar.shop“, im Abschnitt „Artikel im Schaufenster“ den Schalter
„Sortiment bei teileklar.shop ansehen“, und bei den Kategorien denselben Verweis.
`/teileklar/katalog` führt dann direkt dorthin. Im Browser bei 390 und 1280 px gebaut,
angesehen und wieder zurückgestellt.

**Nicht entschieden, gehört dem Inhaber:** ob umgestellt wird. Zu bedenken ist der Befund 03
der Inhaltsprüfung: `/teileklar` trägt als einzige der 29 Seiten `noindex, nofollow`.

---

## 4. Befunde, die ich **nicht** behoben habe, und warum

| Befund | Grund |
|---|---|
| Freigabestand-Sätze in den Zusammenfassungen von `/datenschutz`, `/vertragsgrundlagen`, `/cookies` (erscheinen dadurch auch als Teasertext auf `/kontakt` und `/produkte/api` und als Meta-Beschreibung) | Diese Seiten tragen `content_kind: legal_notice`. `.claude/skills/nexify-seitentexte/SKILL.md` verbietet ausdrücklich, ihre Texte anzufassen; der Auftrag sagt dasselbe. Ich hatte die Sätze versuchsweise aus der Zusammenfassung in den Seitentext verschoben und **zurückgenommen**, als die Regel das ausschloss. **Vorschlag an den Inhaber:** denselben Satz aus der Zusammenfassung in den letzten Abschnitt derselben Seite verschieben — er bleibt sichtbar, verschwindet aber aus Teasern und Suchergebnisschnipseln anderer Seiten. Vier Sprachen, 24 Zeilen, kein Wortlaut geändert. Braucht die Freigabe des Inhabers. |
| „Die Tarife stehen noch zur Freigabe“ auf `/produkte/api`, `/produkte/one`, `/produkte/nex2fly` | Preisbezug. Nicht ohne Freigabe (AGENTS.md). |
| Alle Preis-, Vertrags- und Rechtsbefunde der Inhaltsprüfung (Tagessatz nur in den AGB, § 4.2 Zahlung bis 09:00 Uhr, § 4.7 gegen das Transparenzversprechen, § 11 Referenznennung gegen die Inhaberweisung, B2B-Ausschluss gegen den Verbrauchershop) | Kaufmännische und rechtliche Entscheidungen. Sie stehen vollständig in `docs/04-betrieb/inhalt-praesentation-2026-11-16.md` (Zweig `claude/inhalt-praesentation`). **§ 11 der AGB ist der wichtigste davon: er behält sich die öffentliche Nennung von Kundennamen vor und widerspricht damit der Weisung „Referenzen nur auf Anfrage“.** |
| Chat-Schaltfläche (`.reopen-chat`) überdeckt Fließtext | Gemessen: bei 390 px 279 px², bei 768 px bis 1.970 px² Überdeckung am rechten Rand (zum Beispiel auf `/agb`). Das ist ein bewusst gesetztes schwebendes Bedienelement, kein Darstellungsfehler. Verschieben oder Verkleinern wäre eine Gestaltungsänderung ohne belegten Fehler. **Dem Inhaber vorgelegt.** |
| Waagerecht scrollende Shop-Navigation auf `/teileklar` bei 390 px | `overflow-x:auto` ist dort gewollt; die Seite selbst scrollt nicht waagerecht (gemessen: `scrollWidth == clientWidth` auf allen 29 Seiten × 4 Breiten). Kein Befund. Offen bleibt, dass es keinen sichtbaren Hinweis auf die Scrollbarkeit gibt. |
| Produktnamen uneinheitlich („NeX Agentic AI“ vs. „NeX Agentic AIFly“), `/loesungen` heißt wie eine Übersicht, drei Produktseiten für zwei Agenten | Inhaltsprüfung, Befunde 13–15. Keine davon ist eindeutig: die zweite Sitzung nennt je zwei mögliche Wege. Entscheidung des Inhabers. |

---

## 5. Geprüft, kein Befund

- **Trefferflächen der Filmschalter.** Erst als zu klein gemeldet (390 px: 44 × 34,2 px
  sichtbar). Nachgemessen einschließlich der unsichtbaren Fläche (`::before`): **44 × 48 px**
  bei 390 und 1280 px. Die Vorgabe ist eingehalten; mein erster Messwert war der Kasten des
  Schalters, nicht seine Trefferfläche.
- **Fokusrahmen.** Erster Lauf meldete 63 von 309 Elementen ohne sichtbaren Fokus. Das war
  ein Fehlalarm: `element.focus()` löst `:focus-visible` nicht aus. Mit echten Tabulatortasten:
  **405 Tabstopps, 0 ohne sichtbaren Rahmen.**
- **Waagerechtes Scrollen:** 0 auf 29 Seiten × 4 Breiten.
- **Fehlende `alt`-Texte:** 0. **Verweise ins Leere (`href` leer oder `#`):** 0.
  **Platzhaltertexte (lorem, TODO, TBD):** 0. **Falsche Überschriftenstufen:** 0
  (je Seite genau eine H1, keine übersprungene Stufe).
- **Verzerrte oder fehlende Bilder:** 0.
- **Schriftgrößen-Reihe:** 11 Stufen bei 390 px, keine Bruchstelle. Die zusätzlichen
  Zwischenwerte bei 1280 px (18,4 / 23,9 / 30,9 / 38,2 / 41,8 px) stammen aus `clamp()` und
  sind gewollt fließend.
- **Kundennamen, Kundenlogos, erkennbare Kundenprojekte:** auf keiner der geprüften Seiten
  gefunden. Das Fehlen öffentlicher Referenzen ist nach ausdrücklicher Weisung des Inhabers
  gewollt („Referenzen nur auf Anfrage, zum Schutze unserer Kunden“) und kein Mangel.

---

## 6. Die sieben Befunde des `live-check` einzeln

Lauf gegen den lokalen Bau, 16.11.2026, 00:5x UTC, 350 Prüfungen:

| # | Befund | Einordnung |
|---|---|---|
| 1 | Shop-Dienst `/api/shop/status` → 404 | Lokal läuft kein Shop-Dienst. In Produktion antwortet er mit 200 (Messung der Inhaltsprüfung). Nicht aus dieser Arbeit. |
| 2 | Shop-Dienst `/api/shop/products` → 404 | wie 1 |
| 3 | PWA-Manifest nicht erreichbar/vollständig → 404 | Manifest, Worker und Offline-Seite entstehen nur im Bau mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa`. |
| 4 | PWA-Icons und Kurzwege → leer | wie 3 |
| 5 | PWA-Worker nicht erreichbar → 404 | wie 3 |
| 6 | PWA-Worker übernimmt keine offene Sitzung → 404 | wie 3 |
| 7 | PWA-Manifest im Kopf verlinkt → fehlt | wie 3 |

**Gegenprobe, im Zweig abgelegt** (`live-check-mit-pwa.json`): Derselbe Lauf gegen einen Bau
mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa` ergibt **350 Prüfungen, 2 Befunde** — nur noch
die beiden Shop-Dienst-Zeilen. Die fünf PWA-Befunde stammen also aus der Bauweise, nicht aus
den Seiten.

---

## 7. Gates, Belege und Pins

| Prüfung | Zweig | `main` |
|---|---|---|
| `node tools/gleichmacher.mjs` | 47 Seiten, 32.213 Vergleiche, **0 Abweichungen** (Exit 0) | 44 Seiten (drei Seiten waren nicht verlinkt) |
| `node tools/live-check.mjs` | 350 Prüfungen, 7 Befunde (mit PWA-Bau: 2) | 329 Prüfungen |
| `make check` | Exit 0 | Exit 0 |
| `node tools/lint.mjs` | Exit 0, 0 Diagnosen | Exit 0 |
| `node tools/ds-audit-cli.js` | 0 Fehler, 0 Warnungen | 0 Fehler, 0 Warnungen |
| `python3 -m unittest discover -s tests` | 844 Tests, **46 rote Namen** | 844 Tests, **47 rote Namen** |
| `python3 tools/verify_requirements_reconciliation.py` | 41 „Stale implementation source“ | 41 |

**Kein neuer roter Test.** Ein Name ist auf diesem Zweig grün geworden, der auf `main` rot
ist: `test_product_presentation_integrity.test_frontend_filters_images_and_shows_error_and_unknown_stock`
(die Leerzustände des Schaufensters aus Befund 08).
Namenslisten beider Läufe: `tests-zweig.txt`, `tests-main.txt`.

**Erneuerte Browser-Belege** (nötig, weil Dateien in gebundenen Verzeichnissen geändert
wurden; Verfahren nach `.claude/skills/nexify-belege-und-pins/SKILL.md`):

| Beleg | Lauf | Ergebnis | alte Fassung |
|---|---|---|---|
| `evidence/resize-2026-11-10/text-spacing.json` | `apps/site/tests/browser-text-spacing.mjs` | 129 Prüfungen, 43 Routen, 0 Befunde, 175 Quellen | `superseded/text-spacing.pre-praesentation-2026-11-16.json` |
| `evidence/consent-ui-2026-10-28/browser-consent-ui.json` | `apps/site/tests/browser-consent-ui.mjs` | 18 Prüfungen, bestanden | `superseded/browser-consent-ui.pre-praesentation-2026-11-16.json` |
| `evidence/consent-ui-2026-10-28/next-public.json` | `apps/web/auth/tests/browser-public-experience.mjs` | 70 Routen, 10 private Hüllen, bestanden | `superseded/next-public.pre-praesentation-2026-11-16.json` |

**Nachgezogene Pins**, je mit Belegart (`config/acceptance-coverage.json`):

| Datei | Belegart |
|---|---|
| `apps/web/components/SiteFooter.tsx` | Browserlauf (beide Consent-Läufe binden die Datei per Prüfsumme und sind heute bestanden) |
| `evidence/consent-ui-2026-10-28/browser-consent-ui.json` | Browserlauf (die Belegdatei selbst, neu erhoben) |
| `evidence/consent-ui-2026-10-28/next-public.json` | Browserlauf (dito) |

`tools/_update_register_shas.py` wurde nicht verwendet.

**Stehen gelassen, mit Grund:** Die 41 „Stale implementation source“-Zeilen sind
unverändert die von `main`. Für `apps/web/components/Workspace.tsx`,
`PublicOrientationChat.tsx` und `config/site-map.json` war der Pin schon auf `main`
veraltet; meine Änderung macht dort nichts neu rot und löst nichts.

**Abweichung, benannt:** Die Belegläufe liefen mit Playwright 1.63.0 statt der festgelegten
1.65.0, geladen über eine ESM-Hülle, weil die installierte Fassung CommonJS ist. Es ist
dieselbe Fassung, die auch die übrigen Messungen dieser Nacht benutzt haben. Offener Punkt
OA-177 bleibt bestehen.

---

## 8. Seite für Seite

Spalte „Befunde“ nennt die Nummern aus Abschnitt 2. Alle Seiten bei 390, 768, 1280 und
1800 px aufgenommen; die mit **A** markierten wurden zusätzlich Bildschirmhöhe für
Bildschirmhöhe angesehen.

| Seite | Befunde | Stand |
|---|---|---|
| `/` **A** | 01, 04 | in Ordnung |
| `/leistungen` **A** | 01, 06, 07 | in Ordnung |
| `/leistungen/websites` | 01, 06 | in Ordnung |
| `/leistungen/agenten-automatisierung` | 01, 06 | in Ordnung |
| `/leistungen/apps-portale` | 01, 06 | in Ordnung |
| `/leistungsumfang` **A** | 01, 06 | in Ordnung; Inhaltsbefund 04 der zweiten Sitzung bleibt offen (die Seite vergleicht keine Pakete) |
| `/loesungen` **A** | 01, 06 | in Ordnung; Inhaltsbefund 13 offen (Adresse verspricht eine Übersicht) |
| `/preise-ablauf` **A** | 01, 02, 06, 07 | in Ordnung; Inhaltsbefund 04/05 offen (keine Zahl auf der Preisseite) |
| `/wissen` | 01, 06 | in Ordnung |
| `/wissen/projekt-vorbereiten` **A** | 01, 05, 06 | behoben, vom Inhaber benannt |
| `/unternehmen` **A** | 01, 06, 07 | in Ordnung |
| `/kontakt` **A** | 01, 06 | in Ordnung; Formular, Pflichtfeldzeichen und Einwilligung sauber. Ob eine Anfrage ankommt, ist **nicht** geprüft (Abschnitt 9) |
| `/produkte/nex2fly` **A** | 01, 02, 06, 07 | in Ordnung |
| `/produkte/one` | 01, 06, 07 | in Ordnung |
| `/produkte/api` | 01, 06, 07 | in Ordnung; „Tarife zur Freigabe“ bleibt stehen (Preisbezug) |
| `/produkte/aifly-oracle` **A** | 01, 06, 07 | in Ordnung |
| `/produkte/nex-agentic-aifly` | 01, 06, 07 | in Ordnung |
| `/produkte/skills-mcp` | 01, 02, 06, 07 | in Ordnung |
| `/portale` **A** | 01, 06, 07 | in Ordnung. Keine leere Hülle: die Seite erklärt die Bereiche und sagt, dass sie je Kunde eingerichtet werden |
| `/impressum` | 01, 06 | in Ordnung |
| `/datenschutz` | 01, 06, 10 | in Ordnung |
| `/vertragsgrundlagen` | 01, 06, 10 | in Ordnung |
| `/ki-hinweise` | 01, 10 | in Ordnung |
| `/barrierefreiheit` | 01, 10 | in Ordnung |
| `/cookies` | 01, 06, 10 | in Ordnung |
| `/agb` **A** | 01, 09, 10 | jetzt verlinkt und mit derselben Fußzeile wie alle Seiten |
| `/avv` | 01, 03, 09, 10 | wie `/agb` |
| `/widerruf` | 01, 09, 10 | wie `/agb` |
| `/teileklar` **A** | 02, 07, 08, 11 | Leerzustände jetzt ehrlich; Variante für den laufenden Shop liegt bereit (Abschnitt 3) |

---

## 9. Was ich **nicht** geprüft habe

- **Die Auslieferung.** Alles hier ist gegen den lokalen Bau gemessen. `nexifyai.de` wurde
  von dieser Sitzung **nicht** aufgerufen. Die Live-Nachmessung nach dem Merge steht aus.
- **Ob eine Anfrage ankommt.** Es wurde kein Formular abgesendet, kein Konto angelegt, keine
  Bestellung ausgelöst. Die Zusage „Sie erhalten eine Vorgangsnummer“ auf elf Seiten ist
  damit weiterhin **unbelegt** (Inhaltsbefund 08). Das braucht eine echte Testanfrage mit
  Freigabe des Inhabers.
- **Andere Browser.** Nur Chromium. Kein Safari, kein Firefox, kein echtes Gerät — die sind
  in dieser Umgebung nicht installiert.
- **Sprachen außer Deutsch.** Die Messungen liefen in der deutschen Fassung. `?lang=nl`,
  `?lang=fr`, `?lang=en` wurden **nicht** bei 360 px auf Titelüberlauf geprüft, wie es
  `nexify-seitentexte` für Textänderungen verlangt. Betroffen wäre nur die eine geänderte
  Zeichenkette (Platzhalter des Chatfelds, Befund 04); sie ist in jeder Sprache kürzer als
  die vorherige.
- **Die Portale hinter der Anmeldung.** `/intern/workspace` und die Kundenbereiche sind
  nicht Teil der 29 öffentlichen Adressen und wurden nicht angesehen.
- **Bewegung und Ton.** Filme wurden nicht abgespielt und nicht auf Inhalt geprüft, nur ihr
  Rahmen, ihre Bedienleiste und ihre Trefferflächen.
- **Barrierefreiheit über das Gemessene hinaus.** Kein Screenreader, keine vollständige
  WCAG-Begutachtung. Geprüft wurden Kontrast, Trefferfläche, Fokus, Überschriftenstufen und
  `alt`-Texte.

---

## 10. Die roten CI-Prüfungen am Pull Request 213

Stand 16.11.2026, 03:4x UTC, Kopf `9019584`. Vier Prüfungen sind rot. Ich habe jede
einzeln zurückverfolgt; die Zuordnung steht hier, damit niemand sie neu suchen muss.

| Prüfung | Ursache | Von diesem Zweig verursacht? | Was ich getan habe |
|---|---|---|---|
| `next-web` | `apps/web/auth/tests/chat-guidance.test.mjs` liest `apps/site/.generated/public-site.json`. Diese Datei wird erzeugt, nicht eingecheckt — und der Auftrag `next-web` erzeugte sie nie. Fehler: `ENOENT`, 137 von 138 Prüfungen bestanden. | **Nein.** Test und `ci.yml` sind auf `main` zeichengleich (`git diff origin/main..HEAD` ist für beide leer). | Ursache behoben: der Auftrag `next-web` führt jetzt dieselbe Zeile aus wie die Aufträge `repository` und `react-site`. Nachgestellt: ohne die Datei 137/138 mit genau diesem `ENOENT`, mit ihr 138/138. |
| `repository` | `make test`: 912 Prüfungen, 56 Fehlschläge und 45 Fehler, überwiegend `test_requirements_reconciliation` (41 veraltete Quellbindungen, darunter `apps/web/app/sitemap.ts`). | **Nein.** Lokal gemessen, gleiche Umgebung, gleicher Zeitpunkt: Zweig 15 rote Namen, `main` 16; kein Name nur auf dem Zweig rot, einer neu grün. `verify_requirements_reconciliation`: 41 auf dem Zweig, 41 auf `main`. | Nichts. Der Rückstand liegt auf `main` und ist keine Arbeit dieses Auftrags. Solange er besteht, wird der eingeschaltete Auto-Merge nicht auslösen. Das ist eine Entscheidung des Inhabers, keine Messfrage. |
| `hero` | `apps/site/tests/browser-hero-release-20261112.mjs` wartet vergeblich darauf, dass das Hero-Video `readyState >= 2` erreicht, und läuft in den Zeitablauf. Das Video selbst antwortet im Lauf mit HTTP 200 und `video/mp4`. | **Nein.** Dieser Zweig fasst `apps/site` nicht an — kein einziger Pfad unter `apps/site/` steht im Diff gegen `main`. Der Lauf misst ausschließlich die Vite-Ausgabe von `apps/site`. | Nichts. Der Verdacht liegt auf der Codec-Ausstattung des Prüfbrowsers (`channel:'chrome'`), nicht auf dem Quelltext. Das gehört in einen eigenen Auftrag. |
| `review` (ai-review) | Läuft 12–14 Sekunden und endet mit Fehlschlag, auf jedem Kopf dieses Zweigs. | Nicht geprüft. | Offen und hier als offen benannt. |

Der Prüfbot von Vercel hat zwei inhaltliche Befunde gemeldet; beide waren echt, beide sind
behoben und gemessen: Befunde 12 und 13 in Abschnitt 2.

---

## 11. Kanonische Adresse: umgestellt und wieder zurückgenommen

> **Ausgang: Es bleibt bei `www.nexifyai.de`.** Der Ausfall der Domain war vorübergehend.
> Commit `99f4783` hat die kanonische Adresse auf `nexifyai.cloud` umgestellt, Commit
> `ba3bd19` nimmt genau das zurück. Der Abschnitt bleibt stehen, weil beides gemessen und
> begründet war und die Entscheidungslage sonst nicht nachvollziehbar ist.
>
> **Zeitleiste, jeweils eigene Messung:**
>
> | Zeit (UTC) | Lage |
> |---|---|
> | 03:36 | `nexifyai.de` liefert 404 („No published build"), weil die Domain an ein Lovable-Projekt gegeben wurde |
> | 05:3x | Ich messe: `.de` 404, `www.de` 302 → 404, `nexifyai.cloud` 200, `www.nexifyai.cloud` 200 |
> | 06:0x | Umstellung auf `nexifyai.cloud` (`99f4783`), Abnahmekriterien erfüllt |
> | 06:20 | `nexifyai.de` ist wieder online; Entscheidung des Inhabers: „Shop und alles ist online auf .de — das bleibt auch." |
> | 06:3x | Ich messe nach: `https://nexifyai.de/` 200 („Websites, Apps und KI-Automatisierung · NeXify AI"), `https://www.nexifyai.de/` 200, `https://nexifyai.de/teileklar` 200 („TEILEKLAR.shop – Katalog und Teilefragen für Auto und Motorrad") |
> | 06:4x | Rücknahme (`ba3bd19`): die fünf Quellen stehen wieder auf `https://www.nexifyai.de`, Entscheidung **E13 gilt unverändert** |
>
> **Beobachtung, die jemand bewerten sollte** (ich ändere daran nichts): Die laufende
> Auslieferung auf `nexifyai.de` trägt den Titel „Websites, Apps und KI-Automatisierung ·
> NeXify AI". Unsere eigene Anwendung liefert auf `nexifyai.cloud` den Titel „Ein Gespräch.
> Ein Projekt, das passt. · NeXify AI". Die beiden Adressen zeigen also gerade **nicht
> denselben Auftritt**. Unsere kanonische Adresse verweist damit auf eine Seite, die dieses
> Repository nicht baut. Das ist eine Inhaberentscheidung, keine Messfrage — aber es gehört
> gesehen, bevor jemand sich auf `canonical` verlässt.

Der folgende Teil beschreibt den Stand von 06:0x, also die inzwischen zurückgenommene
Umstellung. Ich habe die Begründung damals nicht übernommen, sondern selbst gemessen.

**Messung um 05:3x UTC, eigene Abrufe:**

| Adresse | Antwort |
|---|---|
| `https://nexifyai.de/` | **404** |
| `https://www.nexifyai.de/` | 302 → `https://nexifyai.de/` (also ebenfalls 404) |
| `https://nexifyai.cloud/` | **200**, `server: Vercel`, `x-matched-path: /` |
| `https://www.nexifyai.cloud/` | **200**, `server: Vercel` |

Im ausgelieferten HTML von `https://nexifyai.cloud/` stand
`<link rel="canonical" href="https://www.nexifyai.de/">` und dieselbe Adresse als `og:url`,
dazu **28 Vorkommen** von `nexifyai.de`. Ein Besucher auf der laufenden Adresse, der im
Gespräch auf einen solchen Verweis klickt, landet auf einer 404-Seite. Das ist das konkrete
Risiko für den Termin.

**Welcher `.cloud`-Host.** Beide antworten mit 200, keiner leitet auf den anderen um. Ich
habe nicht geraten, sondern genommen, was das Projekt selbst erklärt:
`config/site-map.json` → `site_contexts.nexify.requested_production_domain = nexifyai.cloud`
und `config/deployment-topology.json` → `primary.domain = nexifyai.cloud`. Also **ohne
`www`**.

**Geändert (fünf Stellen, alle leiten sich aus einer Konstanten ab):**
`apps/web/lib/page-seo.ts` (`PUBLIC_ORIGIN`, davon hängen Canonical, `og:url`, hreflang,
JSON-LD und die Sitemap ab), `apps/web/lib/shop-server.ts` (`SHOP_CANONICAL`),
`apps/web/app/robots.ts` (Sitemap-Zeile) und die zwei hart verdrahteten Canonicals in
`apps/web/app/teileklar/page.tsx` und `apps/web/app/teileklar/shop/page.tsx`.

**Nicht geändert:** `APPROVED_INDEX_HOSTS` in `apps/web/auth/indexing.ts` — `nexifyai.de`
bleibt dort erlaubt, die Domain gehört weiter uns, sie ist nur nicht mehr die kanonische
Adresse. Ebenfalls unangetastet: DNS, Vercel-Einstellungen, Design, Aufbau, Texte und die
Messprotokolle, in denen `nexifyai.de` als damals gemessener Zustand steht
(`config/clerk-dns.json`, `config/known-solutions.json`, `config/integrationen.json`,
`tools/site_audit_register.py`).

**Nachher gemessen** (lokaler Produktionsbau, `kanonische-adresse-runde-5.json`):

| Seite | `canonical` | `og:url` | Treffer `nexifyai.de` im HTML |
|---|---|---|---|
| `/` | `https://nexifyai.cloud/` | dito | **0** |
| `/leistungen` | `https://nexifyai.cloud/leistungen` | dito | **0** |
| `/preise-ablauf` | `https://nexifyai.cloud/preise-ablauf` | dito | **0** |
| `/kontakt` | `https://nexifyai.cloud/kontakt` | dito | **0** |
| `/produkte/nex2fly` | `https://nexifyai.cloud/produkte/nex2fly` | dito | **0** |
| `/teileklar` | `https://nexifyai.cloud/teileklar` | (keine) | **0** |

`sitemap.xml`: 28 Adressen, alle auf `nexifyai.cloud`, 0 Treffer `nexifyai.de`, hreflang
für de/nl/fr/en ebenfalls auf `.cloud`. `robots.txt`: `Sitemap: https://nexifyai.cloud/sitemap.xml`.

**Beobachtet, nicht geändert:** `/teileklar` trägt kein `og:url` — die Seite hat eine eigene
`metadata` ohne `openGraph`. Das ist älter als dieser Auftrag und steht nicht in den
Abnahmekriterien; es gehört in einen eigenen Befund.

**Folge für die Entscheidungen:** E13 („`nexifyai.de` kanonisch") ist damit überholt. Ich
habe keine zweite Master-Datei angelegt; die Meldung an die koordinierende Sitzung zur
Aufnahme in `PROGRESS.md` ist raus.

**Was ich nicht geprüft habe:** Ob die Auslieferung nach dem Merge tatsächlich die neuen
Adressen zeigt — dafür muss der Zweig erst live sein. Die Messung oben ist der lokale
Produktionsbau dieses Zweigs, nicht `https://nexifyai.cloud/`.
