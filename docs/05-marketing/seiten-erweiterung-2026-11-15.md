# Seiten-Erweiterung: mehr Kontext und Information auf den eigenen Seiten

**Stand:** 15.11.2026 · **Status:** Inhaltsentwurf zur Abnahme durch den Inhaber Pascal Courbois. Nichts davon ist eingebaut, nichts ist live.

**Auftrag (Inhaber, 15.11.2026, über die koordinierende Sitzung übermittelt):** „Es muss viel informativer sein, viel mehr Informationen drinstehen. Da muss also noch deutlich mehr Kontext rein.“ Und: „Mehr Kontext und mehr Informationen gilt übrigens auch für unsere Seiten.“ Gemeint sind NeXify AI und die eigene Shop-Marke TEILEKLAR.

**Was dieses Dokument ist:** ein einbaufertig formulierter deutscher Textentwurf je Seite, mit Fundstelle je Abschnitt und einem Hinweis, in welches bestehende Seitenmuster der Abschnitt passt.

**Was es nicht ist:** keine Änderung an Seiten, Komponenten, Stilen, Tokens oder Textquellen. `config/site-map.json`, `config/home-concept-copy.json`, `config/page-explainers.json`, `apps/web/**` und `config/design-tokens.json` sind unberührt (Design-Sperre des Inhabers vom 14.11.2026, `docs/01-konzept/markenzeichen-2026-11-14.md` auf dem Zweig `claude/markenzeichen-library`).

Kennzeichnung: **IST** = heute gelesen oder gezählt · **SOLL** = gültige Entscheidung · **ANNAHME** = Einschätzung dieses Entwurfs · **OFFEN** = nicht belegt, Frage an den Inhaber (Abschnitt 7).

## 0. Maßstab und Quellen

Mehr Information heißt hier: mehr Erklärung, Ablauf, Nutzen, Beispiele, Abgrenzung und Antworten auf Kundenfragen. Es heißt nicht: mehr Versprechen. Was noch nicht gebaut ist, heißt „noch nicht“ oder „in Vorbereitung“.

| Kürzel | Quelle | Stand |
|---|---|---|
| SM | `config/site-map.json`, `pages[<id>]` (Titel, Zusammenfassung, Abschnitte) | `origin/main` `9c9c806` |
| HC | `config/home-concept-copy.json`, Ebene `de` | `origin/main` `9c9c806` |
| FAQ | `apps/web/lib/page-faq.ts` (Fragenblock „Acht Fragen“) | `origin/main` `9c9c806` |
| MK | `docs/05-marketing/gesamtkonzept-2026-11-14.md` (Abschnitt in Klammern) | `origin/main` `9c9c806` |
| FL | `docs/04-betrieb/suite-funktionsliste-2026-11-14.md` (Zeilennummer wie S1, PW3) | Zweig `claude/suite-funktionsliste`, `e4957f3`, PR 190 |
| ES | ehrlicher Seitentext, Änderungen an SM, HC, FAQ und `PartnerJourney.tsx` | Zweig `claude/seitentexte-ehrlicher-stand`, WIP `850d79a` (gelesen, nicht angefasst) |
| MZ | `docs/01-konzept/markenzeichen-2026-11-14.md` | Zweig `claude/markenzeichen-library`, `10eba3e`, PR 202 |
| ZK | `docs/05-marketing/zielkunden-recherche-2026-11-14.md` | Zweig `claude/zielkunden-recherche`, `a2ce474`, PR 201 |
| FC | `apps/web/components/shop/FitmentChecklist.tsx` | `origin/main` `9c9c806` |
| TC | `apps/web/components/shop/TyreCalculator.tsx` | `origin/main` `9c9c806` |
| PN | `apps/web/components/shop/PhaseNotice.tsx` | `origin/main` `9c9c806` |
| FK | `config/fakten.json` | `origin/main` `9c9c806` |
| AP | `config/api-prepaid.json` | `origin/main` `9c9c806` |
| D-0nn | `DECISIONS.md` | `origin/main` `9c9c806` |

Regeln, nach denen formuliert ist: Skill `nexify-seitentexte` (Deutsch ist Quelle, keine Aussage ohne Beleg, Rechts- und Kassentexte bleiben unberührt), MK Abschnitt 5 (Sie-Form, ein Gedanke je Satz, konkret statt allgemein, „noch nicht“ in einem Satz, keine Superlative, gemiedene Wörter) und MZ Abschnitt 4 (hochwertig, locker und doch klar, vertrauensvoll).

Der Entwurfstext steht in Zitatblöcken (`>`). Alles außerhalb der Zitatblöcke ist Arbeitsnotiz und gehört nicht auf die Seite.

## 1. Befund in Kürze

1. **IST:** Die 21 inhaltlichen NeXify-Seiten tragen in der Seitenliste zusammen 2.724 deutsche Wörter (Titel, Zusammenfassung, Abschnitte), im Mittel 130 je Seite. Die 18 inhaltlichen TEILEKLAR-Seiten tragen zusammen 1.397 Wörter, im Mittel 78. Die Startseite hat zusätzlich 917 Wörter in HC. Zählung: Abschnitt 9.
2. **IST:** Jede Seite hat zwei bis vier Abschnitte mit je ein bis zwei Absätzen. Es fehlen durchgehend: ein Ablauf in Schritten, „für wen“, Beispiele, „was Sie bekommen und was nicht“, Begriffserklärungen und Antworten auf naheliegende Fragen.
3. **IST:** Auf elf Seiten ist der Abschnittstext der Seitenliste heute nicht sichtbar, weil die Seite einen eigenen Baustein rendert: Startseite, `/anmelden`, `/registrieren` und acht TEILEKLAR-Seiten mit eigener Route (Abschnitt 3, Muster M9). Mehr Text in der Seitenliste erscheint dort nicht von selbst.
4. **ANNAHME:** Der größte Teil der Erweiterung lässt sich ohne neues Muster einbauen, als weitere Einträge in `pages[<id>].sections` (Muster M2). Sieben Stellen bräuchten ein neues Muster oder eine neue Verdrahtung und sind als Entscheidung des Inhabers gekennzeichnet (Abschnitt 3.3).
5. **Entwurf:** Dieses Dokument liefert für 37 Seiten zusätzlichen Text. Umfang vorher und nachher je Seite: Abschnitt 9. Zwei Seiten bleiben bewusst ohne Erweiterung (`/teileklar/kasse`: Kassentext; `/teileklar/gutscheine`: nur ein Satz).
6. **OFFEN:** 24 Fragen an den Inhaber (Abschnitt 7). Die wichtigsten: Preise öffentlich (O-1 aus MK), Aussagen zu Eigentum an Ergebnissen und zum Ort der Datenhaltung, Kurzvorstellung von Pascal, Zahl und Herkunft des Werkstattverzeichnisses, Anrede bei TEILEKLAR.

## 2. Bestandsaufnahme je Seite

Wörter gezählt am 15.11.2026 an `config/site-map.json` (`title` + `summary` + `sections[].heading` + `sections[].body`), je Sprache. Rechtsseiten (`content_kind` `legal_notice`) und geschützte Ziele (`protected_target`) sind nicht Teil dieses Entwurfs.

### 2.1 NeXify AI

| Seite | Wörter de / nl / fr / en | Kundenfrage, die sie beantwortet | Was fehlt |
|---|---|---|---|
| `/` Startseite (`home`) | 105 / 103 / 109 / 108, dazu HC 917 / 819 / 902 / 889 | Bin ich hier richtig, und was passiert, wenn ich mich melde? | Für wen genau; was nach der Anfrage geschieht; wie Mensch und Agenten zusammenarbeiten; der ehrliche Stand der Produkte |
| `/leistungen` (`services`) | 156 / 160 / 181 / 167 | Was macht ihr, und wo fange ich an? | Entscheidungshilfe zwischen den drei Feldern; Ablauf; Beispiele; was nicht dazugehört; Begriffe |
| `/leistungen/websites` (`websites`) | 132 / 137 / 140 / 141 | Was bekomme ich, wenn ich eine Website beauftrage? | Ablauf; Mitwirkung; Auffindbarkeit; was nach der Übergabe gilt; Fragen zu Bestand und Pflege |
| `/leistungen/agenten-automatisierung` (`automation`) | 142 / 147 / 162 / 149 | Welche Arbeit kann KI bei mir übernehmen, und behalte ich die Kontrolle? | Welche Arbeit sich eignet; Schritte; Rolle der Agenten; Voraussetzungen; was nicht zugesagt wird; Begriffe |
| `/leistungen/apps-portale` (`apps-portals`) | 133 / 136 / 149 / 144 | Wann brauche ich ein Portal, und wie entsteht es? | Wann es sich lohnt; die drei Arten; Ablauf; Rollen erklärt; Arbeitsprobe |
| `/leistungsumfang` (`scope`) | 121 / 123 / 133 / 124 | Was ist in welchem Paket, und was kostet extra? | Inhalt je Paket; Liste der Optionen; was im Angebot steht; Umgang mit Änderungen |
| `/loesungen` (`solutions`) | 128 / 130 / 153 / 133 | Wie bringt ihr mein Angebot zu Kunden? | Für wen; Ablauf einer Kampagne; die drei Budgets; Voraussetzungen; Begriffe |
| `/preise-ablauf` (`pricing`) | 109 / 120 / 135 / 125 | Was kostet es, und bleibt es dabei? | Wie ein Angebot entsteht; was darin steht; Beispiele je Kostenart; warum kein Betrag auf der Seite steht |
| `/wissen` (`knowledge`) | 125 / 132 / 140 / 126 | Wie läuft die Zusammenarbeit ab? | Die Schritte einzeln; wer wann entscheidet; wie geprüft wird; Rolle der Agenten |
| `/wissen/projekt-vorbereiten` (`knowledge-start`) | 116 / 118 / 131 / 118 | Was muss ich vorbereiten? | Hilfe zu jeder der fünf Fragen; ein Beispiel; was nach dem Absenden geschieht |
| `/unternehmen` (`company`) | 146 / 152 / 160 / 161 | Wer ist mein Gegenüber, und kann ich ihm vertrauen? | Das Arbeitsmodell erklärt; Umgang mit Referenzen; Überblick über Marken und Produkte mit Stand; Grundsätze |
| `/kontakt` (`contact`) | 126 / 128 / 132 / 132 | Wie melde ich mich, und was passiert dann? | Die drei Wege; eine Beispielanfrage; die Schritte danach; was nicht in die Anfrage gehört |
| `/produkte/nex2fly` (`nex2fly`) | 229 / 235 / 238 / 244 | Was ist die Suite, und kann ich sie nutzen? | **Stand stimmt nicht** (FL S1 bis S8): zuerst ES einbauen. Danach: welches Problem sie lösen soll, was heute geht, Begriffe |
| `/produkte/one` (`one`) | 116 / 119 / 127 / 126 | Was tun die zwei Agenten für mich? | Rollen einzeln; ein Beispiel Schritt für Schritt; was die Agenten nicht tun; wie ein Einsatz beginnt |
| `/produkte/api` (`api`) | 133 / 141 / 153 / 145 | Wie binde ich eure KI in meine Anwendung ein? | Für wen; Weg zum Zugang; Guthaben erklärt; der Stand; Begriffe |
| `/produkte/aifly-oracle` (`aifly-oracle`) | 164 / 171 / 172 / 164 | Was ist das für ein Chat, und was darf er? | Was man fragen kann, mit Beispielen; ORACLE im Projekt; Hinweis auf KI und Fehler ausführlicher |
| `/produkte/nex-agentic-aifly` (`nex-agentic`) | 148 / 155 / 161 / 159 | Was kann der ausführende Agent übernehmen? | Welche Aufgaben passen; ein Einsatz in Schritten; Werkzeuge und Rechte; Prüfung |
| `/produkte/skills-mcp` (`skills-mcp`) | 171 / 172 / 183 / 186 | Was bedeuten diese Begriffe, und was habe ich davon? | Je ein Beispiel; Zusammenspiel; was vor dem Einsatz geprüft wird; Begriffe |
| `/portale` (`portals`) | 116 / 116 / 131 / 122 | Wo ist mein Zugang? | **Stand prüfen:** Bereiche sind Hüllen (FL A1, PW4). Fehlt: der heutige Stand in einem Satz, der Weg zum Zugang |
| `/anmelden` (`login`) | 82 / 81 / 85 / 86 | Wie komme ich in meinen Bereich? | Abschnitte nicht sichtbar (FL 3.3). Stand nach ES. Keine Erweiterung sinnvoll, bis die Anmeldung arbeitet |
| `/registrieren` (`signup`) | 96 / 99 / 111 / 109 | Wie teste ich die Suite? | Abschnitte nicht sichtbar (FL 3.2). Stand nach ES; Betrag „5 EUR“ ohne belegte Freigabe (FL Hinweis zu R4). Keine Erweiterung |

### 2.2 TEILEKLAR

Alle TEILEKLAR-Seiten werden bewusst nur deutsch ausgeliefert (`apps/web/proxy.ts`, FL Abschnitt 7); die Seitenliste führt dennoch vier Sprachen. Spalte „Sichtbar“: ob die Abschnitte der Seitenliste heute auf der Seite erscheinen.

| Seite | Wörter de / nl / fr / en | Sichtbar | Kundenfrage | Was fehlt |
|---|---|---|---|---|
| `/teileklar` (`tk-home`) | 79 / 83 / 92 / 90 | nein (`Storefront.tsx`) | Was ist das für ein Shop, und kann ich ihm trauen? | Wie man kauft; wohin geliefert wird; was der Shop nicht tut; wer dahintersteht |
| `/teileklar/shop` (`tk-shop`) | 74 / 75 / 76 / 72 | nein (`ShopFrame`) | Wo finde ich alle Artikel? | Die zwei Wege zum Artikel, ausführlicher; was am Artikel steht |
| `/teileklar/suche` (`tk-search`) | 86 / 85 / 97 / 95 | nein | Wie finde ich mein Teil? | Welche Nummern es gibt; wo man sie findet; was tun ohne Nummer |
| `/teileklar/kategorien` (`tk-categories`) | 77 / 78 / 78 / 87 | nein | Wo stöbere ich? | Wann die Kategorie der bessere Einstieg ist |
| `/teileklar/kategorie` (`tk-category`) | 75 / 72 / 89 / 78 | nein | Welches von zwei ähnlichen Teilen ist richtig? | Die drei Arten von Maßangaben erklärt; Vergleich in Schritten |
| `/teileklar/produkt` (`tk-product`) | 82 / 84 / 91 / 88 | nein | Was genau bekomme ich? | Wie man eine Artikelseite liest; was tun bei Unsicherheit |
| `/teileklar/warenkorb` (`tk-cart`) | 66 / 66 / 70 / 69 | nein | Stimmt meine Auswahl? | Drei Kontrollen vor der Kasse |
| `/teileklar/kasse` (`tk-checkout`) | 66 / 64 / 77 / 70 | nein | Wie schließe ich ab? | **Keine Erweiterung:** Kassentext, bleibt unberührt (Skill `nexify-seitentexte`) |
| `/teileklar/fahrzeug-und-passung` (`tk-fitment`) | 84 / 90 / 105 / 98 | ja | Passt das Teil zu meinem Fahrzeug? | HSN und TSN erklärt; die häufigsten Irrtümer je Teileart als lesbarer Text; Begriffe |
| `/teileklar/reifenrechner` (`tk-reifenrechner`) | 84 / 85 / 94 / 93 | ja | Darf ich eine andere Reifengröße fahren? | Wie man eine Reifengröße liest; was der Rechner zeigt und wie er einordnet |
| `/teileklar/batterie-berater` (`tk-batterie`) | 86 / 90 / 101 / 90 | ja | Welche Batterie brauche ich? | Die Angaben einzeln; Start-Stopp erklärt; Stand des Beraters |
| `/teileklar/werkstatt` (`tk-workshop`) | 76 / 78 / 86 / 78 | nein | Wer baut mir das Teil ein? | Wie die Suche arbeitet; was man die Werkstatt fragt |
| `/teileklar/termine` (`tk-appointments`) | 77 / 81 / 86 / 82 | ja | Wie bekomme ich einen Termin? | Der Weg in Schritten; was in die Anfrage gehört |
| `/teileklar/gutscheine` (`tk-vouchers`) | 69 / 71 / 68 / 77 | ja | Gibt es Gutscheine? | Nichts Wesentliches; ein Satz zum heutigen Weg |
| `/teileklar/partner-werden` (`tk-partner`) | 84 / 87 / 87 / 86 | ja | Was habe ich als Werkstatt davon, und wie läuft es? | Für welche Betriebe; der Weg in Schritten; der ehrliche Stand von Portal und Auftragsweitergabe |

Nicht in der Tabelle: `/teileklar/rechtliches` (Rechtsseite) sowie `/teileklar/konto`, `/teileklar/partnerportal`, `/teileklar/nachbarschaft` (geschützte Ziele).

## 3. Einbauhinweis: bestehende Muster, keine Designänderung

### 3.1 Muster, die es heute gibt

IST, gelesen an `apps/web/components/PublicContent.tsx`, `PageQuestions.tsx`, `PageShowcase.tsx`, `HomeContent.tsx`, `ExplainerSections.tsx` und den Bausteinen unter `apps/web/components/shop/`. Nur benannt, nichts gebaut.

| Muster | Baustein | Speist sich aus | Geeignet für |
|---|---|---|---|
| **M1** Kopf | `HeroStage` | `title`, `summary` | Nutzen in einem Satz. Länge begrenzt: Titel muss bei 360 px umbrechen |
| **M2** Nummerierter Abschnitt | `section.pc-section` (`hc-intro`), Überschrift links, Absätze rechts, Zähler „01 / 05“ | `pages[<id>].sections[]`: `heading`, `body` (Absätze durch Leerzeile getrennt) | Erklärung, Ablauf in nummerierten Absätzen, Beispiele, „bekommen / nicht“, Begriffe, einzelne Frage mit Antwort |
| **M3** Sprungmarken | `nav.hc-anchors` | entsteht aus den Überschriften aller Abschnitte | wächst mit jedem neuen Abschnitt mit |
| **M4** Fragenblock | `PageQuestions` („Acht Fragen zu Ihrem Vorhaben“, Akkordeon `hc-service-detail`) | `apps/web/lib/page-faq.ts`, feste acht Fragen, nur auf zehn Seiten (`FAQ_PAGES`) | Zielgruppe, Nutzen, Grenzen je Seite |
| **M5** Galerie „Der passende Einstieg“ | `PageShowcase` (`hc-gallery`) | feste Zuordnung im Baustein | Verweise, kein Fließtext |
| **M6** Verwandte Seiten und Abschluss | `pc-related` (`hc-process`), `hc-finish` | `next_actions`, Seitengruppe | Verweise, kein Fließtext |
| **M7** Startseiten-Bausteine | `HomeContent`: Einstieg, Galerie, Leistungs-Akkordeon, vier Schritte, drei Kostenarten, Rechenbeispiel, Produkte, Sichtbarkeit, Abschluss | Schlüssel in `config/home-concept-copy.json` | längerer Text in vorhandenen Schlüsseln |
| **M8** Erklärmodul mit Sprecher | `ExplainerSections` | `config/page-explainers.json`, Status `script_draft`, Medien `asset_pending` | hier nicht verwendet (hängt an Medien) |
| **M9** Shop-Rahmen | `ShopFrame` mit `title`, `kicker`, `intro` (ein Absatz); `Storefront` mit eigenem Text im Baustein | Text steht in der Route oder im Baustein, nicht in der Seitenliste | ein kurzer Einleitungssatz; **kein** Platz für Abschnitte |
| **M10** Hinweis „noch nicht“ | `PhaseNotice` | Text im Baustein | Stand einer Funktion in einem Satz |
| **M11** Werkzeuge | `FitmentChecklist`, `TyreCalculator`, `PartnerJourney`, `ContactRequestForm` | Text im Baustein | bleibt, wie es ist |

### 3.2 Was beim Einbau zu beachten ist

1. **Der Regelweg ist M2.** Ein neuer Abschnitt ist ein weiterer Eintrag in `pages[<id>].sections` mit `id`, `heading`, `body`, `source_refs`, `requirement`, `source_sections` in vier Sprachen. Es entsteht kein neuer Baustein und kein neuer Stil; der Gleichmacher vergleicht berechnete Stile der Bausteine (MZ, „Design-Sperre“), keine Textmengen. ANNAHME bis zur Messung: Der Lauf bleibt grün. Belegt ist das erst mit `node tools/gleichmacher.mjs` und `node tools/live-check.mjs` am Einbau-Commit.
2. **Die Seitenliste ist gebunden.** `config/site-map.json` trägt mehrere Pins und Belege (Skill `nexify-belege-und-pins`). Der Einbau gehört der Sitzung, die diese Datei führt, und zieht Belege nach. Dieser Entwurf fasst die Datei nicht an.
3. **Schritte und Begriffe stehen als Absätze.** M2 kennt keine Listen. Ein Ablauf wird wie heute auf `/wissen/projekt-vorbereiten` als nummerierte Absätze geschrieben („1. …“, Leerzeile, „2. …“). Begriffe stehen als Absätze der Form „Begriff: Erklärung.“ So ist der Entwurf unten gesetzt.
4. **Sprungmarken (M3) werden länger.** Heute stehen dort zwei bis vier Einträge, nach dem Einbau bis zu neun. Bei 390 px muss gemessen werden, ob die Leiste noch bedienbar ist. Wird sie zu lang, ist das eine Entscheidung (Abschnitt 3.3, E-3).
5. **Der Fragenblock (M4) hängt an den Abschnitten.** Die Antwort auf „Was gehört dazu?“ ist heute die Verkettung aller Abschnittstexte der Seite (`page-faq.ts`, Funktion `pageFaq`, Zeile mit `included`). Auf den zehn Seiten mit Fragenblock würde diese eine Antwort mit jedem neuen Abschnitt mitwachsen, auf mehrere hundert Wörter. Das muss vor dem Einbau gelöst werden (E-2).
6. **Titel bleiben kurz.** Neue Überschriften sind so gewählt, dass sie bei 360 px umbrechen können; gemessen ist das nicht.
7. **Folgebindungen.** Ändert sich ein vorhandener deutscher Abschnittstitel, ist `context_title` in `config/page-media-registry.json` nachzuziehen (Skill `nexify-seitentexte`, Schritt 5). Dieser Entwurf ändert keinen vorhandenen Titel; er fügt nur hinzu.

### 3.3 Stellen, die ein neues Muster oder eine neue Verdrahtung bräuchten (Entscheidung des Inhabers)

Jede dieser Stellen berührt Dateien unter `apps/web/components/**` oder `apps/web/lib/**` und kollidiert deshalb mit der Design-Sperre. Ohne Entscheidung bleibt der Text dieser Stellen liegen oder wird in M2 untergebracht, wo das möglich ist.

| Nr. | Stelle | Was es bräuchte | Ausweg ohne neues Muster |
|---|---|---|---|
| **E-1** | Abschnitte auf Seiten mit Shop-Rahmen (M9): `/teileklar`, `/teileklar/shop`, `/suche`, `/kategorien`, `/kategorie`, `/produkt`, `/warenkorb`, `/werkstatt` | Verdrahtung: M2 müsste unter dem Shop-Baustein gerendert werden. Das Muster gibt es, auf diesem Seitentyp ist es nicht angeschlossen | Den Text auf `/teileklar/fahrzeug-und-passung` und in einem eigenen Ratgeber-Bereich bündeln (dort ist M2 sichtbar); auf den Shop-Seiten nur der Einleitungssatz |
| **E-2** | Fragenblock: Antwort 4 wächst mit; mehr als acht Fragen; Fragenblock auf weiteren Seiten (`company`, `contact`, `knowledge`, Produktseiten außer den zehn) | Änderung in `apps/web/lib/page-faq.ts` (gebundene Datei); die Überschrift „Acht Fragen“ steht fest im Baustein | Zusätzliche Fragen als M2-Abschnitt „Häufige Fragen“ mit Frage und Antwort als Absätze. So ist der Entwurf gesetzt. Antwort 4 muss trotzdem begrenzt werden |
| **E-3** | Sprungmarken bei sieben bis neun Abschnitten | ein Umbruch- oder Kürzungsverhalten in `hc-anchors` | Abschnitte zusammenfassen; Obergrenze je Seite festlegen (Empfehlung: höchstens sieben) |
| **E-4** | Vergleich der drei Pakete nebeneinander (`/leistungsumfang`) | eine Tabelle oder drei Spalten; gibt es als Muster nicht | Drei Absätze in einem M2-Abschnitt. So gesetzt |
| **E-5** | Glossar als Liste mit Begriff und Erklärung | eine Definitionsliste; gibt es nicht | Absätze „Begriff: Erklärung.“ in M2. So gesetzt |
| **E-6** | Sichtbare Abschnitte auf `/anmelden` und `/registrieren` | Verdrahtung im Kontoformular | Keine Erweiterung, bis Anmeldung und Registrierung arbeiten |
| **E-7** | Startseite: eigener Block „Für wen“ und Fragenblock | neuer Block in `HomeContent` beziehungsweise Anschluss von M4 | Längerer Text in vorhandenen HC-Schlüsseln (M7). So gesetzt. Die Startseite ist die Norm des Gleichmachers; jede Änderung dort wirkt auf alle Seiten |

## 4. Erweiterungsentwurf NeXify AI

Je Seite: zusätzliche Abschnitte in der vorgeschlagenen Reihenfolge, **nach** den heutigen Abschnitten, soweit nicht anders vermerkt. Unter jedem Abschnitt stehen Quelle und Muster.

### 4.1 Startseite `/`

Die Startseite rendert HC, nicht die Abschnitte der Seitenliste. Der Entwurf verlängert deshalb Text in **vorhandenen** HC-Schlüsseln (M7, E-7). Kein neuer Schlüssel.

> **introBody (ersetzt den heutigen Text)**
>
> Eine Website, die Ihr Angebot nicht erklärt. Ein Vorgang, der jeden Tag Zeit kostet. Eine Idee ohne nächsten Schritt. Zeigen Sie uns die Stelle, an der es hakt.
>
> Wir arbeiten für Inhaberinnen, Inhaber und Geschäftsführungen kleiner und mittlerer Betriebe: Dienstleistung, Handwerk, Fertigung und Handel. Sie brauchen dafür keine eigene IT und kein eigenes Marketing. Sie brauchen jemanden, der zuhört, den Umfang klar benennt und die Arbeit zu Ende führt.

Quelle: HC `introBody`; Zielgruppe aus MK (1), erste Zeile der Tabelle. Muster: M7, Schlüssel `introBody`.

> **serviceBody (ersetzt)**
>
> Marken und Websites, vernetzte Abläufe oder Kampagnen: Wir beginnen bei einer konkreten Aufgabe in Ihrem Unternehmen. Daraus wird ein Auftrag mit benanntem Ergebnis, nicht ein Paket von der Stange.
>
> Sie müssen nicht wissen, wie die Lösung heißt. Es genügt, wenn Sie sagen, was sich ändern soll: mehr passende Anfragen, weniger Handarbeit oder ein Auftritt, der zu Ihrem Unternehmen passt.

Quelle: HC `serviceBody`; MK (4) Stützbotschaft 1; SM `knowledge-start` (Frage 2). Muster: M7, `serviceBody`.

> **processBody (ersetzt)**
>
> Pascal begleitet Ihr Projekt vom ersten Gespräch bis zur Übergabe. Sie sehen früh, welche Richtung entsteht, was enthalten ist und welche Entscheidung als Nächstes gebraucht wird.
>
> Die Ausarbeitung tragen die KI-Agenten NeX und AIFly ORACLE. Was entsteht, verantwortet Pascal. Für Sie heißt das: ein Mensch, der zuhört und entscheidet, und ein Agententeam, das ausarbeitet.

Quelle: HC `processBody`; SM `company` Abschnitt 1; D-011; MK (2). Muster: M7, `processBody`.

> **steps (die vier Schritttexte, je verlängert)**
>
> Wir verstehen, was Sie erreichen möchten. Wir sprechen über Ihr Angebot, Ihre Kunden, die bisherige Lösung und den Maßstab, an dem das Ergebnis bestehen muss. Ein fertiges Konzept brauchen Sie dafür nicht; fünf Antworten genügen für den Anfang.
>
> Sie erhalten einen klaren Leistungsrahmen. Leistungen, Mitwirkung, Termine, sinnvolle Optionen und Kosten werden verständlich voneinander getrennt. Erst wenn Sie das Angebot annehmen, entsteht ein Auftrag.
>
> Konzept, Text und Design entstehen gemeinsam. Sie sehen an vereinbarten Punkten ein schlüssiges Gesamtbild und entscheiden, wie es weitergeht. Zusätzliche Arbeit stimmen wir mit Ihnen ab, bevor sie entsteht.
>
> Wir prüfen, übergeben und bleiben erreichbar. Das vereinbarte Ergebnis wird geprüft und nachvollziehbar übergeben, mit den Dateien, der Dokumentation und der Einweisung, die im Angebot stehen. Pflege und Weiterentwicklung können Sie mit NeXify Care ergänzen.

Quelle: HC `steps`; SM `knowledge-start` (Zusammenfassung), `contact` Abschnitt 2, `pricing` Abschnitt 2, `knowledge` Abschnitt 2. Muster: M7, `steps[n][1]`.

> **budgetBody (ersetzt)**
>
> Vor dem Start erhalten Sie ein Angebot mit klar abgegrenztem Umfang. Sie entscheiden, was jetzt entsteht und was später folgt.
>
> Ist Ihr Budget oder Ihre Zeit begrenzt, legen wir gemeinsam fest, welches Ergebnis Sie zuerst brauchen. Alles Weitere steht als Option daneben, mit eigenen Kosten.

Quelle: HC `budgetBody`; SM `pricing` Abschnitt 2. Muster: M7, `budgetBody`.

> **productsBody (ersetzt)**
>
> Die NeX AIFly Suite, die Agenten NeX und AIFly ORACLE, die NeXify API und TEILEKLAR haben je eine eigene Aufgabe. Wir sagen Ihnen offen, was zu Ihrem Vorhaben passt und was davon heute schon nutzbar ist. Die Suite ist in Vorbereitung; die Agenten arbeiten in Aufträgen, die wir mit Ihnen vereinbaren.

Quelle: HC `productsBody`; ES (Suite „in Vorbereitung und noch nicht nutzbar“); FL S1, H1; SM `nex-agentic` Abschnitt 3. Muster: M7, `productsBody`. Hinweis: `products[0][1]` ist nach ES anzupassen (FL H1); das gehört zu ES, nicht zu diesem Entwurf.

> **finishBody (ersetzt)**
>
> Website, Shop oder ein Ablauf, der jeden Tag Zeit kostet: Ein paar Sätze genügen für den Anfang. Sie entscheiden, ob daraus eine persönliche Anfrage wird.
>
> Eine Anfrage ist noch kein Auftrag. Wir klären offene Punkte, dann erhalten Sie ein Angebot mit Leistungen und Kosten.

Quelle: HC `finishBody`; SM `contact` Abschnitt 2. Muster: M7, `finishBody`.

### 4.2 `/leistungen`

> **Woran Sie Ihr Feld erkennen**
>
> „Unsere Website sagt nicht, was wir können.“ Dann beginnen wir bei Marke & Web: bei Ihrem Angebot, Ihrer Sprache und einer Seite, die den Weg zur Anfrage öffnet.
>
> „Das mache ich jeden Tag von Hand.“ Dann beginnen wir bei Systeme & KI: bei einem Ablauf, den wir gemeinsam ansehen und an dem KI einen benannten Schritt übernimmt.
>
> „Jeder fragt nach dem Stand, und keiner weiß, wo er steht.“ Dann geht es um ein Portal oder eine App: ein Ort für den Vorgang statt Postfach, Telefon und Listen.
>
> „Wir haben ein gutes Angebot, aber zu wenige passende Anfragen.“ Dann beginnen wir bei Wachstum & Kampagnen: bei Botschaft, Werbemittel und Zielseite aus einem Plan.

Quelle: MK (1) Spalte „Problem in eigenen Worten“; SM `services`, `apps-portals`, `solutions`. Der vierte Satz in Anführungszeichen ist sinngemäß gebildet (MK nennt „Anfragen bleiben aus“ als Auslöser), kein Kundenzitat. Muster: M2.

> **So arbeiten wir**
>
> 1. Sie schildern Ihr Vorhaben. Ein paar Sätze genügen: was Sie anbieten, wen Sie erreichen wollen und was sich ändern soll.
>
> 2. Pascal klärt mit Ihnen Ziel, Ausgangslage und Umfang. Was fehlt, klären wir im Gespräch.
>
> 3. Sie erhalten ein Angebot. Darin stehen Ergebnisse, Ihre Mitwirkung, der Zeitrahmen und die Kosten, getrennt nach Entwicklung, Betreuung danach und externen Kosten.
>
> 4. Sie entscheiden. Erst wenn Sie das Angebot annehmen, entsteht ein Auftrag.
>
> 5. Wir setzen um. An vereinbarten Punkten sehen Sie den Stand und entscheiden, wie es weitergeht.
>
> 6. Wir prüfen und übergeben. Betreuung danach ist ein eigener, vereinbarter Teil: NeXify Care.

Quelle: MK (7) Schritte 1 bis 6; SM `contact`, `scope`, `pricing`; HC `steps`. Muster: M2, nummerierte Absätze.

> **Was Sie bekommen – und was nicht**
>
> Sie bekommen einen Ansprechpartner, der Gestaltung, Umsetzung und Vermarktung zusammenhält. Sie bekommen ein Angebot mit abgegrenztem Umfang, bevor Sie entscheiden. Und Sie bekommen ein geprüftes Ergebnis mit einer Übergabe, mit der Sie arbeiten können.
>
> Sie bekommen keinen Baukasten und kein Abo, das Sie nicht gewählt haben: Das Projekt hat einen vereinbarten Umfang und eine Übergabe. KI läuft bei uns nicht unbeaufsichtigt; sie übernimmt benannte Schritte, Menschen entscheiden. Ein bestimmtes Suchmaschinenranking, eine Reichweite oder einen Umsatz sagen wir nicht zu.

Quelle: FAQ `services` (Nutzen); MK (2) Abgrenzung; MK (3) „Was nicht belegt ist“; FAQ `websites`, `solutions` (Grenzen). Muster: M2.

> **Drei Beispiele für einen Einstieg**
>
> Beispiel Website: Ein Betrieb gründet neu oder überarbeitet seinen Auftritt. Wir beginnen bei Angebot und Zielgruppe, dann folgen Seitenführung, Texte, Gestaltung und der Kontaktweg. Das ist das Paket Markenstart.
>
> Beispiel Ablauf: Eingehende Anfragen sollen zugeordnet werden, oder die Angaben für ein Angebot sollen fertig bereitliegen. Wir sehen uns die Schritte an, legen Eingaben, Ergebnis und Ausnahmen fest und prüfen an einem echten Arbeitsfall. Das ist das Paket KI im Betrieb.
>
> Beispiel Kampagne: Eine Anzeige soll zu mehr passenden Anfragen führen. Botschaft, Werbemittel und Zielseite entstehen zusammen; Anzeigen starten erst nach Ihrer Freigabe. Das ist das Paket Wachstum.
>
> Die Beispiele beschreiben, wie ein Einstieg aussieht. Es sind keine Kundenprojekte.

Quelle: SM `knowledge` Abschnitt 1, `websites`, `automation` Abschnitt 1, `solutions`; HC `offers` (Notiz „Für Neugründung oder Relaunch“). Kennzeichnung als Beispiel nach `AGENTS.md` („Beispiele sind gekennzeichnet“, zitiert in MZ 4). Muster: M2.

> **Wer an Ihrem Projekt arbeitet**
>
> Pascal Courbois gibt Idee, Gestaltung und Richtung vor und bleibt Ihr Ansprechpartner bis zur Übergabe. Die KI-Agenten arbeiten aus: NeX führt aus, AIFly ORACLE ordnet und koordiniert. Was entsteht, verantwortet Pascal. Wir nennen dieses Arbeitsmodell AI FACTORY.

Quelle: SM `company`; D-011 und dessen Präzisierung in `DECISIONS.md`. Muster: M2.

> **Begriffe kurz erklärt**
>
> Paket: ein Projekt mit vereinbartem Lieferumfang. Es gibt drei: Markenstart, KI im Betrieb und Wachstum.
>
> Option: eine Erweiterung, die Sie einzeln wählen, etwa weitere Sprachen, zusätzliche Inhalte oder Anbindungen. Jede Option steht als eigener Posten im Angebot.
>
> NeXify Care: die Betreuung nach der Übergabe, also Pflege und Weiterentwicklung, wenn Sie sie wünschen.
>
> Zielseite: die Seite, auf der jemand nach dem Klick auf eine Anzeige ankommt.
>
> Übergabe: der Punkt, an dem Sie das geprüfte Ergebnis mit Dateien, Dokumentation und Einweisung erhalten.

Quelle: SM `scope`, `pricing`, `solutions`, `knowledge`; `docs/design/factory-brand-revision-2026-11-02.md` (Pakete und Optionen). Muster: M2, Absätze „Begriff: Erklärung“ (E-5).

### 4.3 `/leistungen/websites`

> **Für wen Markenstart gedacht ist**
>
> Für Unternehmen, deren Angebot online verständlicher werden soll: beim ersten Auftritt nach einer Gründung oder bei der Überarbeitung einer bestehenden Website. Umfang, Sprachen und Funktionen vereinbaren wir vor dem Start.
>
> Sie haben schon eine Website? Dann beginnen wir nicht bei null. Wir sehen uns an, was heute gut funktioniert und wo Besucher abspringen, und entscheiden mit Ihnen, was bleibt.

Quelle: FAQ `websites` (Zielgruppe); HC `offers` (Notiz zum ersten Eintrag); SM `knowledge-start` (Frage 3). Muster: M2.

> **So entsteht Ihre Website**
>
> 1. Ziel und Zielgruppe. Was bieten Sie an, für wen, und was soll ein Besucher am Ende tun?
>
> 2. Seitenstruktur. Sie folgt den Fragen Ihrer Kunden, nicht dem Aufbau Ihres Unternehmens.
>
> 3. Texte und Gestaltung. Beides entsteht zusammen, eigens für Ihr Unternehmen entworfen. Sie sehen an vereinbarten Punkten ein Gesamtbild und entscheiden.
>
> 4. Umsetzung. Die Seite wird für Telefon und Bildschirm gebaut, mit einem Kontaktweg ohne Umwege.
>
> 5. Prüfung und Übergabe. Wir prüfen die Darstellung auf Telefon und Bildschirm und übergeben das Ergebnis so, wie es im Angebot steht.

Quelle: SM `websites` Abschnitt 1, `knowledge` Abschnitt 1; HC `offers` (Positionierung, Seitenstruktur, Texte; Art Direction und Webdesign; responsive Umsetzung, Anfrageweg, Übergabe), HC `steps`. Muster: M2, nummerierte Absätze.

> **Was wir von Ihnen brauchen**
>
> Informationen zu Ihrem Angebot, Ihrer Zielgruppe und – wenn vorhanden – Ihrer Marke: Logo, Farben, Beispiele. Dazu eine Person, die entscheiden darf.
>
> Wer welche Inhalte liefert, steht im Angebot. Inhalte und Nutzungsrechte, etwa an Fotos, klären wir vor der Veröffentlichung.

Quelle: FAQ `websites` (Grenzen), FAQ `services` (Grenzen: „entscheidungsberechtigte Kontaktperson“); SM `websites` Abschnitt 1. Muster: M2.

> **Damit Sie gefunden werden**
>
> Ihre künftigen Kunden suchen auf unterschiedlichen Wegen. Für die Suche bei Google zählen die Begriffe Ihrer Kunden, verständliche Leistungsseiten und eine saubere technische Grundlage. Für Antworten von KI-Suchsystemen zählen klare Aussagen zu Unternehmen und Leistungen, nachvollziehbare Quellen und strukturierte Inhalte.
>
> Beides legen wir beim Bau der Seite mit an. Ein bestimmtes Ranking sagen wir nicht zu.

Quelle: HC `visibility` (SEO, GEO); FAQ `websites` (Grenzen). Muster: M2.

> **Dieser Auftritt als Arbeitsprobe**
>
> Was Sie hier sehen, bauen wir auch für Sie: ein Auftritt aus einem Konzept, in vier Sprachen geführt und für die Bedienung am Telefon geprüft. Wir zeigen ihn als Arbeitsprobe, nicht als Kundenreferenz. Kundenprojekte nennen wir erst, wenn es dafür eine Freigabe gibt.

Quelle: MK (3) erste Zeile der Belegtabelle und Einwand 3 in MK (1). OFFEN F-5: ob der Inhaber den Satz zu den Referenzen so auf der Seite will. Muster: M2.

> **Häufige Fragen**
>
> Kann ich die Website später selbst pflegen? Ja. Pflege und Aktualisierung übernehmen Sie selbst oder vereinbaren sie mit NeXify Care.
>
> Was ist nicht im Paket? Weitere Sprachen, Foto und Video, ein Shop und eigene Zielseiten für Kampagnen sind Optionen mit eigenem Umfang. Hosting und Software sind externe Kosten und stehen getrennt im Angebot.
>
> Wie lange dauert es? Den Zeitrahmen nennt das Angebot, weil er von Umfang und Ihrem Material abhängt.

Quelle: SM `knowledge` Abschnitt 2, `websites` Abschnitt 2, `pricing` Abschnitt 1, `scope` Abschnitt 1; MK (3): keine Zusage zur Projektdauer. Muster: M2 mit Frage und Antwort als Absatz (E-2).

### 4.4 `/leistungen/agenten-automatisierung`

> **Welche Arbeit sich eignet**
>
> Geeignet ist Arbeit, die wiederkehrt und klare Eingaben hat: Anfragen zuordnen, Unterlagen vorbereiten, Entwürfe schreiben, die Angaben für ein Angebot zusammenstellen. Es braucht bei Ihnen eine Person, die den fachlichen Ablauf beurteilen kann.
>
> Nicht geeignet ist eine Aufgabe, bei der niemand sagen kann, wann das Ergebnis richtig ist. Dann klären wir zuerst den Ablauf und erst danach die Technik.

Quelle: SM `automation` (Zusammenfassung, Abschnitt 1); FAQ `automation` (Zielgruppe, Grenzen: „abgegrenzter Prozess“). Der zweite Absatz ist eine Folgerung daraus (ANNAHME, sachlich nahe an FAQ). Muster: M2.

> **So gehen wir vor**
>
> 1. Wir sehen uns einen Ablauf an: die Schritte, die beteiligten Systeme und die Stellen, an denen ein Mensch entscheidet.
>
> 2. Wir legen fest, was hineingeht, was herauskommen soll und welche Ausnahmen es gibt.
>
> 3. Wir vereinbaren, welche Dokumente und Daten die KI nutzt, wer sie pflegt und auf welche Systeme sie zugreift.
>
> 4. Wir setzen um und prüfen an einem echten Arbeitsfall.
>
> 5. Erst wenn dieser Ablauf verlässlich läuft, planen wir den nächsten.

Quelle: SM `automation` Abschnitte 1 und 2. Muster: M2, nummerierte Absätze.

> **Wer was entscheidet**
>
> Entscheidungen, Versand und Zahlungen bleiben bei Menschen. Ein Entwurf ist noch kein Versand und kein Vertrag. Ausnahmen gehen an eine benannte Person, Fehler werden sichtbar gemeldet.
>
> KI ist bei uns als KI erkennbar. Ihre Ergebnisse können Fehler enthalten; deshalb steht vor jedem Einsatz fest, wer das Ergebnis prüft.

Quelle: MK (1) Einwand 2; SM `automation` Abschnitt 2, `nex-agentic` Abschnitte 1 und 2; FAQ `automation` (Grenzen). Muster: M2.

> **Was NeX und AIFly ORACLE dabei tun**
>
> AIFly ORACLE ordnet: Es zerlegt ein Vorhaben in Aufgaben und macht sichtbar, was wovon abhängt. NeX führt aus: Es arbeitet die vereinbarten Schritte ab, mit den Quellen und Werkzeugen, die Sie dafür zulassen. Welche Schritte die Agenten für Sie übernehmen, steht im Angebot.

Quelle: SM `aifly-oracle` Abschnitt 1, `nex-agentic` Abschnitt 1, `one` Abschnitt 1. Muster: M2.

> **Was Sie mitbringen**
>
> Einen abgegrenzten Ablauf, Datenquellen, die genutzt werden dürfen, und Zugänge, die dafür berechtigt sind. Zugangsdaten gehören nicht in die Anfrage; dafür vereinbaren wir einen sicheren Weg.

Quelle: FAQ `automation` (Grenzen); SM `knowledge-start` Abschnitt 2. Muster: M2.

> **Was wir nicht zusagen**
>
> Wir nennen keine Stunden oder Beträge, die Sie sparen werden. Das hängt von Ihrem Ablauf ab und lässt sich erst an einem echten Fall zeigen. Deshalb beginnen wir mit einem Ablauf und prüfen daran.

Quelle: MK (3): keine gemessene Zeit- oder Kostenersparnis; SM `automation` Abschnitt 1. Muster: M2.

> **Begriffe kurz erklärt**
>
> Agent: ein KI-System, das eine klar umrissene Aufgabe in mehreren Schritten bearbeitet und dafür zugelassene Werkzeuge nutzt.
>
> Ablauf: eine wiederkehrende Folge von Arbeitsschritten mit Eingabe und Ergebnis.
>
> Ausnahme: ein Fall, den der Ablauf nicht selbst entscheidet und an eine benannte Person gibt.
>
> Quelle: ein Dokument oder Datenbestand, den die KI für ihre Arbeit nutzen darf.
>
> Freigabe: Ihre Entscheidung, dass ein Entwurf versendet, veröffentlicht oder ausgeführt wird.

Quelle: SM `automation`, `nex-agentic`, `one`, `skills-mcp`. Muster: M2 (E-5).

### 4.5 `/leistungen/apps-portale`

> **Wann sich ein Portal lohnt**
>
> Ein Vorgang wird zu groß für das Postfach: Kunden fragen nach dem Stand, Unterlagen liegen in mehreren Postfächern, und eine Liste weiß mehr als die andere. Dann hilft ein Ort, an dem Eingaben, Dokumente und der Stand zusammenstehen.
>
> Ein Portal lohnt sich nicht für alles. Kommt ein Vorgang selten vor, reicht oft ein gutes Formular. Das sagen wir Ihnen im Gespräch.

Quelle: MK (1) zweite Zeile („Ein Vorgang wird zu groß für das Postfach“); SM `apps-portals` Abschnitt 1. Der zweite Absatz ist eine Aussage zur Beratung (ANNAHME, OFFEN F-9). Muster: M2.

> **Drei Arten, ein Prinzip**
>
> Kundenportal: Ihre Kunden sehen den Stand ihres Vorgangs, laden Unterlagen hoch und stellen Anfragen.
>
> Interne Anwendung: Ihr Team bearbeitet einen Vorgang an einer Stelle, statt in Postfach, Telefon und Listen.
>
> Partnerbereich: Partner erhalten einen eigenen, geschützten Zugang zu dem, was sie betrifft.
>
> Das Prinzip ist jedes Mal dasselbe: Jeder sieht, was er sehen soll.

Quelle: SM `apps-portals` (Zusammenfassung), `portals` Abschnitt 1. Muster: M2.

> **So entsteht Ihre Anwendung**
>
> 1. Der Vorgang. Wer gibt etwas ein, wer prüft, und was ist der nächste Schritt?
>
> 2. Die Rollen. Sie bestimmen, wer was sieht und wer was entscheidet.
>
> 3. Die Ansichten. Aus Vorgang und Rollen entstehen die Oberflächen für Ihre Nutzergruppen.
>
> 4. Die Verbindungen. Soll die Anwendung mit vorhandenen Systemen arbeiten, legen wir für jede Verbindung Zweck, Daten und Rechte fest.
>
> 5. Die Prüfung. Wir prüfen an den Fällen, die bei Ihnen wirklich vorkommen.
>
> 6. Übergabe und Betrieb. Datenübernahme, externe Dienste, Betrieb und spätere Erweiterungen sind eigene Posten im Angebot.

Quelle: SM `apps-portals` Abschnitte 1 und 2. Muster: M2, nummerierte Absätze.

> **Was vorher zu klären ist**
>
> Rollen, die Verantwortung für die Daten und die Systeme, die es schon gibt. Jede Schnittstelle und jede Datenübernahme braucht einen eigenen Umfang. Den Zugang zu fremden Systemen setzen wir nicht voraus; wir klären ihn mit Ihnen.

Quelle: FAQ `apps-portals` (Grenzen). Muster: M2.

> **TEILEKLAR als Arbeitsprobe**
>
> TEILEKLAR ist unsere eigene Shop-Marke für Auto und Motorrad. Daran zeigen wir, was wir für Kunden bauen: Katalog, Suche, Warenkorb, Kasse und ein Werkstattverzeichnis. Der Shop ist im Aufbau; nicht jede Funktion ist heute in Betrieb.

Quelle: SM `company` Abschnitt 2; MK (3) zweite Zeile samt Einschränkung; FL Abschnitt 1, Satz 2. OFFEN F-8: ob der letzte Satz so auf der Seite stehen soll. Muster: M2.

### 4.6 `/leistungsumfang`

> **Die drei Pakete im Einzelnen**
>
> Markenstart: die Markenbasis und Ihr Webauftritt. Positionierung, Seitenstruktur, Texte, Gestaltung und Technik entstehen aus einem Konzept. Gedacht für Neugründung oder Überarbeitung.
>
> KI im Betrieb: ein ausgewählter Ablauf, den KI im Alltag mitträgt, mit den Quellen und Rechten, die Sie dafür zulassen. Wir prüfen ihn an einem echten Arbeitsfall.
>
> Wachstum: Kampagnenkonzept, Texte, Bild- oder Videomotive und die Zielseite, aus einem Plan. Medienbudget und Kanäle legen Sie gesondert fest.

Quelle: SM `services` (alle drei Abschnitte), `websites`, `automation`, `solutions`; HC `offers`. Muster: M2, drei Absätze (E-4: ein Vergleich in Spalten wäre ein neues Muster).

> **Die Optionen**
>
> Zusätzliche Inhalte und Seiten. Weitere Sprachen. Foto und Video. Ein Shop. Eigene Zielseiten für Kampagnen. Anbindungen an vorhandene Systeme. Anzeigen. Und die Betreuung danach mit NeXify Care.
>
> Jede Option hat ihren eigenen Umfang und eigene Kosten. So sehen Sie, was zum Start gehört und was Sie später ergänzen können.

Quelle: SM `scope` Abschnitt 2, `websites` Abschnitt 2, `services` Abschnitt 1. Muster: M2.

> **Was im Angebot steht**
>
> Die Ergebnisse, die entstehen. Ihre Mitwirkung: welches Material Sie liefern und wann Sie entscheiden. Der Zeitrahmen. Und die Kosten, getrennt nach Entwicklung, Betreuung danach und externen Kosten.
>
> Verbindlich ist die Fassung des Angebots, die wir gemeinsam abgestimmt haben, mit Umfang, Abnahme und Kosten.

Quelle: SM `scope` Abschnitt 1, `pricing`; FAQ `scope` (Grenzen). Muster: M2.

> **Wenn sich unterwegs etwas ändert**
>
> Ein Paket ist kein unbegrenzter Leistungsanspruch. Kommt ein Wunsch hinzu, sagen wir Ihnen, was er für Aufwand und Kosten bedeutet. Zusätzliche Arbeit stimmen wir mit Ihnen ab, bevor sie entsteht.

Quelle: FAQ `scope` (Nutzen, Grenzen); SM `pricing` Abschnitt 2. Muster: M2.

> **Womit Sie beginnen**
>
> Sie wählen, wo wir anfangen. Im Gespräch klären wir, welcher Einstieg zu Ihrer Lage passt und was schon vorhanden ist. Sind Budget oder Zeit begrenzt, legen wir fest, welches Ergebnis Sie zuerst brauchen.

Quelle: SM `services` (Zusammenfassung), `scope` Abschnitt 1, `pricing` Abschnitt 2. Muster: M2.

### 4.7 `/loesungen` (Wachstum & Kampagnen)

> **Für wen das Paket Wachstum gedacht ist**
>
> Für Unternehmen, die eine Kampagne auf ein konkretes Angebot und eine passende Zielseite ausrichten wollen. Es braucht ein klares Angebot. Fehlt das noch, beginnen wir dort und nicht bei der Anzeige.

Quelle: FAQ `solutions` (Zielgruppe, Grenzen); SM `solutions` Abschnitt 1. Muster: M2.

> **So läuft eine Kampagne ab**
>
> 1. Ausgangspunkt. Ihr Angebot, Ihre Zielgruppe und die Reaktion, die Sie erreichen wollen, etwa mehr passende Anfragen.
>
> 2. Botschaft. Ein Satz, den Anzeige und Zielseite gemeinsam tragen.
>
> 3. Werbemittel und Zielseite. Texte, Bild- oder Videomotive und die Seite, auf der jemand nach dem Klick ankommt, entstehen zusammen.
>
> 4. Freigabe. Anzeigen starten erst, wenn Sie sie freigegeben haben.
>
> 5. Auswertung. Welche Messung zulässig und sinnvoll ist, legen wir vor dem Start fest.

Quelle: SM `solutions` Abschnitte 1 und 2. Muster: M2, nummerierte Absätze.

> **Drei Budgets, getrennt ausgewiesen**
>
> Gestaltung: Konzept, Texte, Motive und Zielseite. Das ist die Arbeit von NeXify AI.
>
> Kampagnenbetreuung: die laufende Arbeit an der Kampagne, wenn Sie sie wünschen.
>
> Medienbudget: das Geld, das an die Plattform fließt, auf der Ihre Anzeige läuft. Sie legen es gesondert fest.
>
> So sehen Sie, wohin Ihr Geld geht.

Quelle: SM `solutions` Abschnitt 2, `services` Abschnitt 3; FAQ `solutions` (Nutzen). Muster: M2.

> **Was wir nicht zusagen**
>
> Ergebnisse hängen von Angebot, Zielgruppe, Wettbewerb und Budget ab. Eine bestimmte Reichweite, eine Zahl von Anfragen oder einen Umsatz sagen wir nicht zu. Was wir zusagen, steht im Auftrag: Kanäle, Formate und Lieferumfang.

Quelle: SM `solutions` Abschnitte 1 und 2; FAQ `solutions` (Grenzen). Muster: M2.

> **Begriffe kurz erklärt**
>
> Zielseite: die Seite, auf der jemand nach dem Klick auf eine Anzeige ankommt. Sie soll halten, was die Anzeige verspricht.
>
> Werbemittel: Text, Bild oder Video einer Anzeige.
>
> Medienbudget: der Betrag, den die Werbeplattform für das Ausspielen Ihrer Anzeigen erhält.
>
> Kanal: der Ort, an dem die Anzeige läuft, zum Beispiel eine Suchmaschine oder ein soziales Netzwerk.

Quelle: SM `solutions`. Die Beispiele im letzten Satz sind Allgemeinwissen, keine Zusage bestimmter Kanäle. Muster: M2 (E-5).

### 4.8 `/preise-ablauf`

> **Wie Ihr Angebot entsteht**
>
> 1. Sie schildern Ihr Vorhaben.
>
> 2. Wir klären offene Punkte und den passenden Umfang.
>
> 3. Sie erhalten ein Angebot mit Leistungen und Kosten.
>
> 4. Erst wenn Sie es annehmen, entsteht ein Auftrag.
>
> Eine Anfrage verpflichtet Sie zu nichts.

Quelle: SM `contact` Abschnitt 2; FAQ (`next`: „die Anfrage ist noch keine Beauftragung“). Muster: M2, nummerierte Absätze.

> **Die drei Kostenarten an Beispielen**
>
> Entwicklung, einmalig: das Konzept, die Texte, die Gestaltung und die Technik für das vereinbarte Ergebnis.
>
> Betreuung danach, wenn Sie sie wünschen: Pflege, Weiterentwicklung und persönliche Unterstützung mit NeXify Care, als eigener, vereinbarter Teil.
>
> Externe Kosten, offen ausgewiesen: Hosting, Software, die Nutzung von KI-Modellen und ein Medien- oder Werbebudget. Diese Beträge gehen an Dritte und sind nicht im Projektpreis versteckt.

Quelle: SM `pricing` Abschnitt 1; HC `costs`. Muster: M2.

> **Warum hier kein Betrag steht**
>
> Was ein Projekt kostet, hängt von seinem Umfang ab. Ein Tagessatz allein ist kein Gesamtpreis: Benötigte Tage, Fremdkosten, Steuern und laufende Leistungen stehen im konkreten Angebot. Deshalb nennen wir den Betrag dort, wo er stimmt.
>
> Wie eine Kalkulation aufgebaut ist, zeigt das Rechenbeispiel auf der Startseite. Es rechnet mit angenommenen Werten und ist kein Tarif.

Quelle: FAQ `pricing` (Grenzen); HC `exampleTitle`, `exampleNote`. OFFEN F-1: Gibt der Inhaber Preise frei (MK O-1), ändert sich dieser Abschnitt grundlegend. Muster: M2.

> **Wenn sich der Umfang ändert**
>
> Zusätzliche Arbeit stimmen wir mit Ihnen ab, bevor sie entsteht. Sie erfahren, was der Wunsch für Aufwand und Kosten bedeutet, und entscheiden dann.

Quelle: SM `pricing` Abschnitt 2; FAQ `scope` (Nutzen). Muster: M2.

> **Kosten der Produkte**
>
> Für die NeXify API gilt ein eigenes Modell: Sie laden Guthaben auf und verbrauchen es mit Ihren Aufrufen. Die Tarife stehen noch zur Freigabe. Die NeX AIFly Suite ist in Vorbereitung; Preise dafür gibt es noch nicht.

Quelle: SM `api` Abschnitt 2; FAQ (`productCost`); ES; FL S6 (`paid_suite_price_status`: keine Preise erfunden). Muster: M2.

### 4.9 `/wissen`

> **Die Schritte im Einzelnen**
>
> 1. Erstes Gespräch. Es geht um Ihr Unternehmen, Ihre Kunden und das Ergebnis, das Sie erreichen wollen. Sie entscheiden danach, ob Sie ein Angebot möchten.
>
> 2. Angebot. Es nennt Ergebnisse, Ihre Mitwirkung, den Zeitrahmen und die Kosten. Sie entscheiden, ob und womit wir beginnen.
>
> 3. Konzept. Zuerst Zielgruppe, Angebot und gewünschte Wirkung, daraus Gestaltung, Inhalte, Funktionen. Sie sehen die Richtung früh und entscheiden über sie.
>
> 4. Umsetzung. An vereinbarten Punkten sehen Sie ein schlüssiges Gesamtbild. Sie entscheiden, wie es weitergeht.
>
> 5. Prüfung. Wir prüfen das Ergebnis, bevor wir es übergeben.
>
> 6. Übergabe. Sie erhalten das Ergebnis mit den Dateien, der Dokumentation und der Einweisung, die im Angebot stehen. Offene Punkte und nächste Schritte halten wir schriftlich fest.

Quelle: SM `knowledge` (beide Abschnitte), `company` Abschnitt 1, `scope` Abschnitt 1; HC `steps`. Muster: M2, nummerierte Absätze.

> **Warum wir beim Ziel beginnen**
>
> So wissen Sie bei jedem Teil des Projekts, warum es ihn gibt. Eine Seite, eine Funktion oder ein Text, der keinem Ziel dient, kostet Geld und hilft niemandem. Deshalb fragen wir zuerst nach Wirkung und erst dann nach Umfang.

Quelle: SM `knowledge` Abschnitt 1 (erster Satz wörtlich). Der zweite und dritte Satz erläutern ihn (ANNAHME, keine neue Sachbehauptung). Muster: M2.

> **Wie die KI-Agenten mitarbeiten**
>
> Pascal Courbois gibt Idee, Gestaltung und Richtung vor. Die Ausarbeitung tragen die KI-Agenten: NeX führt aus, AIFly ORACLE ordnet und koordiniert. Was entsteht, verantwortet Pascal. Ihr Ansprechpartner ist ein Mensch, vom ersten Gespräch bis zur Übergabe.

Quelle: SM `company` Abschnitt 1; D-011. Muster: M2.

> **Nach der Übergabe**
>
> Pflege und Aktualisierung übernehmen Sie selbst oder vereinbaren sie mit NeXify Care. Care ist ein eigener, vereinbarter Teil und kein Zwang. Was dazugehört, steht in Ihrem Angebot.

Quelle: SM `knowledge` Abschnitt 2, `pricing` Abschnitt 1; MK (4) Kernaussage NeXify Care. Muster: M2.

### 4.10 `/wissen/projekt-vorbereiten`

> **Hilfe zu jeder Frage**
>
> Zu Frage 1: Schreiben Sie so, wie Sie es einem neuen Kunden am Telefon sagen würden. Ein Satz zum Angebot, ein Satz zu den Kunden.
>
> Zu Frage 2: Nennen Sie eine Sache, nicht fünf. Was soll in einem halben Jahr anders sein?
>
> Zu Frage 3: Ein Beispiel genügt. Etwa: Anfragen kommen an, aber ohne die Angaben, die wir brauchen.
>
> Zu Frage 4: Eine Liste reicht. Die Unterlagen selbst brauchen wir erst später.
>
> Zu Frage 5: Ein ungefährer Rahmen hilft, ist aber kein Muss. Was fehlt, klären wir im Gespräch.

Quelle: SM `knowledge-start` Abschnitt 1, `contact` Abschnitt 1. Die Hilfen sind redaktionelle Erläuterung der fünf Fragen (ANNAHME, keine Sachbehauptung über Leistungen). Muster: M2.

> **Ein Beispiel**
>
> „Wir sind ein Malerbetrieb mit acht Mitarbeitenden und arbeiten für private Kunden in der Region. Unsere Website ist zehn Jahre alt und zeigt nicht, was wir heute anbieten. Anfragen kommen fast nur über Empfehlung. Wir haben Fotos von Projekten und ein Logo. Wir möchten im Frühjahr starten.“
>
> Das ist ein erfundenes Beispiel, kein Kunde. Mehr braucht es für den Anfang nicht.

Quelle: Form nach SM `knowledge-start` (fünf Fragen); Branche nach ZK Segment NX-A. Als erfundenes Beispiel gekennzeichnet. OFFEN F-10: ob ein solches Beispiel gewünscht ist. Muster: M2.

> **Was nicht in die Anfrage gehört**
>
> Zugangsdaten und Passwörter. Dafür vereinbaren wir einen sicheren Weg, wenn es so weit ist.

Quelle: SM `knowledge-start` Abschnitt 2. Muster: M2.

> **Was nach dem Absenden passiert**
>
> Das Formular bestätigt den Eingang. Wir klären offene Punkte und den passenden Umfang. Dann erhalten Sie ein Angebot mit Leistungen und Kosten. Erst wenn Sie es annehmen, entsteht ein Auftrag.
>
> Sie sind noch unsicher, wie Sie Ihr Vorhaben beschreiben sollen? Im Chat hilft Ihnen AIFly ORACLE, die Anfrage vorzubereiten. Absenden tun Sie selbst.

Quelle: SM `contact` Abschnitt 2, `aifly-oracle` Abschnitt 3. Hinweis: Ob das Formular und der Chat in der Produktion antworten, ist nicht belegt (FL S9, FL Abschnitt 7). Muster: M2.

### 4.11 `/unternehmen`

> **Was AI FACTORY bedeutet**
>
> AI FACTORY ist unser Name für die Art, wie wir arbeiten. Pascal Courbois gibt Idee, Gestaltung und Richtung vor. NeX führt aus. AIFly ORACLE ordnet Aufgaben und koordiniert. Was entsteht, verantwortet Pascal.
>
> Für Sie heißt das: Sie sprechen mit einem Menschen, der zuhört und entscheidet. Die Ausarbeitung trägt ein Agententeam. Verträge, Zahlungen und Zusagen entscheiden Menschen.

Quelle: SM `company`; D-011 und Präzisierung in `DECISIONS.md`; SM `aifly-oracle` Abschnitt 2; MK (2). Muster: M2.

> **Wo wir arbeiten**
>
> NeXify AI sitzt in Venlo, an der Grenze zwischen den Niederlanden und Deutschland. Wir arbeiten für Unternehmen in Deutschland, in den Niederlanden und im französischsprachigen Raum. Diese Seiten gibt es deshalb in vier Sprachen.

Quelle: SM `company` (Zusammenfassung: Venlo); MK (2) Positionierung; SM `locales`. Die Lagebeschreibung „an der Grenze“ ist Allgemeinwissen. Muster: M2.

> **Wie wir mit Referenzen umgehen**
>
> Kundenreferenzen nennen wir erst, wenn es dafür eine Freigabe gibt. Bis dahin zeigen wir zwei Arbeitsproben: diesen Auftritt und unsere eigene Marke TEILEKLAR. Zahlen, Logos und Zitate erfinden wir nicht.

Quelle: MK (1) Einwand 3; MK (3) „Was nicht belegt ist“; `AGENTS.md` („Ehrlich bleiben“, zitiert in MZ 4). OFFEN F-5. Muster: M2.

> **Unsere Marken und Produkte**
>
> NeXify AI: die Agenturarbeit. Websites, Shops, Portale, Apps und KI-Abläufe.
>
> NeX und AIFly ORACLE: unsere zwei KI-Agenten. Sie arbeiten in Aufträgen, die wir mit Ihnen vereinbaren. AIFly ORACLE antwortet außerdem im Chat dieser Website.
>
> NeX AIFly Suite: ein eigener KI-Arbeitsbereich. Sie ist in Vorbereitung und noch nicht nutzbar.
>
> NeXify API: KI-Funktionen für Ihre eigene Anwendung. Den Zugang gibt es im Rahmen eines Projekts; die Tarife stehen zur Freigabe.
>
> TEILEKLAR: unsere eigene Shop-Marke für Auto und Motorrad.

Quelle: SM `company` Abschnitt 2, `nex-agentic` Abschnitt 3, `aifly-oracle`, `api`; ES (Suite); FL S1. Muster: M2.

> **Woran wir uns halten**
>
> Sie kennen den Umfang vor dem Start. KI ist als KI erkennbar. Ein Entwurf ist kein Versand. Und was es noch nicht gibt, nennen wir „noch nicht“.

Quelle: MK (4) Stützbotschaft 3; MK (1) Einwand 2; MK (5) Regel 6. Muster: M2.

Nicht entworfen: eine Kurzvorstellung von Pascal (Werdegang, Erfahrung). Dafür gibt es im Repository keinen belegten Text; MK (3) schließt aggregierte Erfahrungszahlen aus. OFFEN F-4.

### 4.12 `/kontakt`

> **Drei Wege zu uns**
>
> Das Formular auf dieser Seite. Ein paar Sätze genügen.
>
> Eine E-Mail an mail@nexifyai.cloud, wenn Sie lieber frei schreiben.
>
> Der Chat mit AIFly ORACLE. Er hilft Ihnen, Ihr Vorhaben zu ordnen und die Anfrage vorzubereiten. Er ist ein KI-System, kein Mensch; absenden tun Sie selbst.

Quelle: MK (7) Schritte 1 bis 3 (E-Mail-Adresse dort und in FK `teileklar.verkaeufer`); SM `aifly-oracle` Abschnitt 3. Muster: M2.

> **So kann eine Anfrage aussehen**
>
> „Wir sind ein Ingenieurbüro mit zwölf Mitarbeitenden. Angebote schreiben wir von Hand, das dauert zu lange. Wir nutzen ein Programm für die Zeiterfassung und Tabellen für alles andere. Wir möchten wissen, ob sich ein Teil davon abnehmen lässt.“
>
> Das ist ein erfundenes Beispiel. Kürzer geht auch.

Quelle: Form nach SM `contact` Abschnitt 1; Lage nach ZK Segment NX-B. Als erfunden gekennzeichnet. OFFEN F-10. Muster: M2.

> **Wenn das Formular nicht erreichbar ist**
>
> Dann zeigt es Ihnen das an. Ihre Anfrage ist in diesem Fall nicht gesendet und nicht gespeichert. Schreiben Sie uns dann per E-Mail.

Quelle: ES (FAQ `next`: „Ist das Formular nicht erreichbar, zeigt es Ihnen das an und bietet den Weg per E-Mail.“); `apps/web/lib/contact-copy.ts:3` nach FL Abschnitt 2. Muster: M2.

> **Was eine Anfrage ist – und was nicht**
>
> Eine Anfrage ist der Anfang eines Gesprächs. Sie ist keine Beauftragung und verpflichtet Sie zu nichts. Ein Auftrag entsteht erst, wenn Sie ein Angebot annehmen.
>
> Zugangsdaten und Passwörter gehören nicht in die Anfrage.

Quelle: SM `contact` Abschnitt 2; FAQ (`next`); SM `knowledge-start` Abschnitt 2. Muster: M2.

Nicht entworfen: eine Aussage dazu, wie schnell eine Antwort kommt. MK (3) und MK O-8: keine Zusage. OFFEN F-6.

### 4.13 `/produkte/nex2fly` (NeX AIFly Suite)

Voraussetzung: Zuerst muss der Stand stimmen. Die heutigen Abschnitte versprechen einen Test über 24 Stunden und einen Arbeitsbereich, den es nicht gibt (FL S1 bis S8). ES ersetzt sie. Der Entwurf unten **setzt ES voraus** und kommt danach hinzu.

> **Welche Arbeit die Suite leichter machen soll**
>
> Wer mit KI arbeitet, kennt das: Jede Frage beginnt von vorn. Das Gespräch von gestern ist weg, das Dokument liegt woanders, und die Aufgabe steht in einer dritten Liste. Die NeX AIFly Suite soll das zusammenhalten: das Gespräch mit der KI, die Aufgabe daraus, das Dokument dazu und das Wissen Ihres Projekts.

Quelle: SM `nex2fly` Abschnitt 1 in der Fassung ES („soll zusammenbleiben“); FAQ `nex2fly` (Nutzen, Fassung ES). Muster: M2.

> **Was heute geht – und was noch nicht**
>
> Heute können Sie uns schreiben, wenn Sie die Suite kennenlernen möchten. Wir sagen Ihnen, wie weit sie ist und ob sie zu Ihrem Vorhaben passt.
>
> Noch nicht möglich sind: ein Konto für die Suite, ein Test und die Arbeit in einem eigenen Bereich. Wir schreiben das hier so deutlich, damit Sie nicht suchen müssen.

Quelle: ES (`nex2fly` Zusammenfassung und Abschnitte 1 bis 4, `signup`); FL S1, S2, R1. Muster: M2 oder M10.

> **Suite und Agenturauftrag**
>
> Die Suite ist ein eigenes Produkt. Einen Agenturauftrag brauchen Sie dafür nicht. Umgekehrt gilt: Wer mit uns ein Projekt macht, braucht die Suite nicht. Beides kann zusammenkommen, muss aber nicht.

Quelle: SM `nex2fly` Abschnitt 1 (zweiter Absatz, unverändert in ES). Der zweite und dritte Satz folgen daraus (ANNAHME). Muster: M2.

> **Woran wir uns beim Bau halten**
>
> Ihr Zugang soll nur für Ihren Arbeitsbereich gelten, ohne Zugriff auf Projekte anderer Kunden oder auf die Agentur. Sie sollen festlegen können, welche Quellen die KI nutzt und wer bei Ihnen mitarbeitet. Die Nutzung von KI-Modellen soll ein eigenes Budget haben, das Sie sehen, bevor Sie es nutzen.
>
> Das sind Grundsätze für den Bau, keine Beschreibung eines fertigen Produkts.

Quelle: ES (`nex2fly` Abschnitte 2 bis 4); FL S4, S6, S7. Muster: M2.

> **Begriffe kurz erklärt**
>
> Arbeitsbereich: Ihr eigener, geschützter Ort in der Suite, getrennt von anderen Kunden.
>
> Projektwissen: die Dokumente und Angaben, auf die sich die KI in Ihrem Bereich stützen darf.
>
> Modellbudget: der Betrag, der für die Nutzung von KI-Modellen bereitsteht, getrennt vom Preis der Suite.

Quelle: SM `nex2fly` (Fassung ES); FL S6. Muster: M2 (E-5).

Nicht entworfen: ein Termin oder eine Warteliste. OFFEN F-12.

### 4.14 `/produkte/one` (NeX und AIFly ORACLE)

> **Zwei Rollen**
>
> AIFly ORACLE ordnet. Es zerlegt ein Vorhaben in Aufgaben, ordnet Zuständigkeiten zu und macht sichtbar, was wovon abhängt.
>
> NeX führt aus. Es arbeitet die vereinbarten Schritte ab: recherchieren, vorbereiten, wiederkehrende Schritte erledigen, mit den Werkzeugen, die Sie dafür zulassen.
>
> Die Trennung hat einen Grund: Erst ordnen, dann handeln.

Quelle: SM `aifly-oracle` (Titel, Abschnitt 1), `nex-agentic` (Zusammenfassung, Abschnitt 1), `one`. Muster: M2.

> **Ein Beispiel, Schritt für Schritt**
>
> Die Aufgabe: Informationen für ein Projekt ordnen und einen Entwurf vorbereiten.
>
> 1. Recherche. NeX sammelt aus den Quellen, die dafür zugelassen sind.
>
> 2. Entwurf. NeX schreibt einen Entwurf. Er ist als Entwurf gekennzeichnet.
>
> 3. Prüfung. Eine benannte Person sieht den Entwurf durch.
>
> 4. Ihre Freigabe. Veröffentlichen und Versenden bleiben Ihre Entscheidung.
>
> Ein Arbeitsstand zeigt, ob etwas vorbereitet, geprüft oder ausgeführt ist. Das Beispiel beschreibt den Ablauf, kein Kundenprojekt.

Quelle: SM `one` Abschnitte 1 und 2; FAQ `one` (Nutzen). Muster: M2, nummerierte Absätze.

> **Was die Agenten nicht tun**
>
> Sie schließen keine Verträge, lösen keine Zahlungen aus und geben keine verbindlichen Zusagen. Das entscheiden Menschen. Eine Produktbeschreibung ist keine Vollmacht: Werkzeuge, Datenzugriffe und Budgets müssen für Ihren Einsatz freigegeben sein.

Quelle: SM `aifly-oracle` Abschnitt 2; FAQ `one` (Grenzen). Muster: M2.

> **Wie ein Einsatz beginnt**
>
> Schildern Sie die Aufgabe und die beteiligten Systeme. Wir prüfen Voraussetzungen und Rechte und nennen im Angebot, welche Schritte die Agenten für Sie übernehmen.

Quelle: SM `nex-agentic` Abschnitt 3. Muster: M2.

### 4.15 `/produkte/api`

> **Für wen die API gedacht ist**
>
> Für Unternehmen mit einer eigenen Anwendung und einer technischen Ansprechperson, die Datenformate, Berechtigungen und die Einbindung beurteilen kann.

Quelle: FAQ `api` (Zielgruppe). Muster: M2.

> **Der Weg zum Zugang**
>
> 1. Der Anwendungsfall. Welche Anwendung sendet welche Anfrage, und welches Ergebnis brauchen Sie?
>
> 2. Die Beschreibung. Wir beschreiben die Schnittstelle mit Datenformaten und Fehlerfällen.
>
> 3. Zugang und Berechtigungen. Sie werden für Ihre Verbindung eingerichtet.
>
> 4. Der Test. Ein nachvollziehbarer Test zeigt, dass die Verbindung arbeitet.
>
> 5. Die Nutzung. Erwartete Aufrufe, Grenzen und Abrechnung vereinbaren wir vorher.
>
> Den Zugang erhalten Sie im Rahmen eines Projekts, nicht über diese Seite.

Quelle: SM `api` Abschnitte 1 und 2. Muster: M2, nummerierte Absätze.

> **Guthaben statt Rechnung im Nachhinein**
>
> Die API ist als Prepaid-Angebot angelegt. Sie laden Guthaben auf und verbrauchen es mit Ihren Aufrufen. Ist kein Guthaben da, wird keine Anfrage ausgeführt. So entstehen keine Kosten, die Sie nicht erwarten.

Quelle: SM `api` Abschnitt 2; AP `sperre.leer` („hart – keine Anfrage ohne Deckung“). Muster: M2.

> **Der Stand heute**
>
> Die Tarife stehen noch zur Freigabe. Diese Seite ist kein Nachweis, dass jede beschriebene Funktion schon als Schnittstelle bereitsteht. Welche Funktionen für Ihren Fall nutzbar sind, sagen wir Ihnen im Gespräch.

Quelle: SM `api` Abschnitt 2; FAQ `api` (Grenzen, sinngleich). Muster: M2 oder M10.

> **Begriffe kurz erklärt**
>
> Schnittstelle (API): der Weg, auf dem Ihre Anwendung eine Anfrage sendet und ein Ergebnis zurückerhält.
>
> Guthaben: der Betrag, den Sie vorab aufladen und mit Ihren Aufrufen verbrauchen.
>
> Grenze (Limit): die vereinbarte Obergrenze für Aufrufe oder Verbrauch.

Quelle: SM `api`; FAQ `api`. Muster: M2 (E-5).

Nicht entworfen: Mindestaufladung und Aufschlag (AP, Preisbezug, nicht freigegeben, MK O-1), eigene Anbieterschlüssel (FL R4: kein Tresor gebaut), öffentliche Dokumentation. OFFEN F-1, F-13.

### 4.16 `/produkte/aifly-oracle`

> **Was Sie den Chat fragen können**
>
> „Ich brauche eine neue Website. Womit fange ich an?“
>
> „Was ist der Unterschied zwischen den drei Paketen?“
>
> „Welche Seite erklärt, wie die Kosten aufgebaut sind?“
>
> AIFly ORACLE hilft Ihnen, Leistungen und passende Seiten zu finden und Ihre Anfrage vorzubereiten.

Quelle: SM `aifly-oracle` Abschnitt 3. Die drei Fragen sind Beispiele, keine Aufzeichnungen. Hinweis: Ob der Chat in der Produktion antwortet, ist nicht gemessen (FL Abschnitt 7). Muster: M2.

> **Was der Chat nicht tut**
>
> Er schließt keine Verträge, bucht keine Termine und löst keine Zahlungen aus. Ihre Anfrage senden Sie selbst ab. AIFly ORACLE ist ein KI-System, kein Mensch, und kann sich irren. Wie wir KI einsetzen, steht in den KI-Hinweisen.

Quelle: SM `aifly-oracle` Abschnitt 3; Verweis auf `/ki-hinweise` (Rechtsseite, unverändert). Muster: M2.

> **AIFly ORACLE in Ihrem Projekt**
>
> In Kundenprojekten ordnet AIFly ORACLE die Arbeit: Es zerlegt ein Vorhaben in Aufgaben und macht Abhängigkeiten sichtbar. Welche Werkzeuge und Verbindungen es dafür nutzt, vereinbaren wir vorab. Fachliche Entscheidungen, technische Änderungen und verbindliche Zusagen haben jeweils eine benannte verantwortliche Person.

Quelle: SM `aifly-oracle` Abschnitte 1 und 2. Muster: M2.

> **Warum erst ordnen**
>
> Wer sofort handelt, erledigt oft das Falsche zuerst. Ordnung vor der Arbeit heißt: Es ist klar, was als Nächstes dran ist und wer es erledigt.

Quelle: SM `aifly-oracle` Abschnitt 1 (letzter Satz). Der erste Satz erläutert ihn (ANNAHME). Muster: M2.

Nicht entworfen: Aussagen dazu, was mit Eingaben im Chat geschieht. Das ist Sache der Datenschutzerklärung (Rechtstext). OFFEN F-14; MK O-10 (Widerspruch zwischen `/ki-hinweise` und D-010) besteht fort.

### 4.17 `/produkte/nex-agentic-aifly`

> **Welche Aufgaben zu NeX passen**
>
> Aufgaben mit klarem Anfang und klarem Ergebnis: Informationen zu einem Thema zusammentragen. Einen Entwurf vorbereiten. Einen wiederkehrenden Schritt erledigen, der jedes Mal gleich abläuft.

Quelle: SM `nex-agentic` (Zusammenfassung); SM `one` Abschnitt 1. Muster: M2.

> **Ein Einsatz in vier Schritten**
>
> 1. Wir legen fest, was entstehen soll.
>
> 2. Wir legen fest, welche Quellen und Werkzeuge NeX verwenden darf.
>
> 3. Wir legen fest, wer das Ergebnis prüft.
>
> 4. NeX arbeitet die Schritte ab.
>
> Ob ein Schritt ausgeführt ist, sehen Sie am Ergebnis, nicht an einer Behauptung.

Quelle: SM `nex-agentic` Abschnitt 1. Muster: M2, nummerierte Absätze.

> **Werkzeuge und Rechte**
>
> NeX nutzt nur, was für Ihren Einsatz zugelassen ist. Wie ein Agent an Ihre Systeme angebunden wird und wie eine Arbeitsweise wiederholbar festgehalten wird, erklärt die Seite zu Skills und MCP.

Quelle: SM `nex-agentic` (Zusammenfassung), `skills-mcp`. Muster: M2.

> **Wie NeX und AIFly ORACLE zusammenarbeiten**
>
> AIFly ORACLE ordnet die Arbeit, NeX führt sie aus. Zusammen übernehmen sie in Ihrem Auftrag benannte Arbeitsschritte, von der Recherche bis zum geprüften Entwurf.

Quelle: SM `one` (Zusammenfassung). Muster: M2.

Hinweis: Die Seiten führen „NeX Agentic AI“ (HC `products`) und „NeX Agentic AIFly“ (SM) nebeneinander (MK O-5). OFFEN F-15.

### 4.18 `/produkte/skills-mcp`

> **Ein Skill an einem Beispiel**
>
> Jede eingehende Anfrage soll gleich geordnet werden: Wer fragt, was wird gebraucht, was fehlt noch? Ein Skill hält diese Reihenfolge einmal fest. Der Agent wendet sie jedes Mal gleich an, und Sie können nachlesen, wonach er vorgeht.

Quelle: SM `skills-mcp` Abschnitt 1 („Wie wird eine Anfrage strukturiert …“). Beispiel, kein Kundenprojekt. Muster: M2.

> **MCP an einem Beispiel**
>
> Ein Agent soll in Ihrem Kalender nachsehen oder einen Vorgang in Ihrem Fachsystem lesen. Über MCP geschieht das auf einem einheitlichen Weg. Für jede Verbindung steht fest, wer sie betreibt, wozu sie dient und was sie darf: nur lesen oder auch schreiben.

Quelle: SM `skills-mcp` Abschnitt 2. Kalender und Fachsystem sind Beispiele; „nur lesen oder auch schreiben“ erläutert „was sie darf“ (ANNAHME). Muster: M2.

> **Wie beides zusammenspielt**
>
> Der Skill sagt, wie eine Aufgabe erledigt wird. MCP sagt, womit. Zusammen wird KI-Arbeit wiederholbar und kontrollierbar.

Quelle: SM `skills-mcp` (Zusammenfassung). Muster: M2.

> **Was wir vor dem Einsatz prüfen**
>
> Bei einem Skill: Herkunft, Eignung und Version. Bei einer Verbindung: die vorhandene Schnittstelle, die nötigen Rechte und den Nutzen. Die fachliche Verantwortung bleibt bei Ihnen, Ihre Daten bleiben in Ihrem Projekt.

Quelle: SM `skills-mcp` Abschnitte 1 und 3. Muster: M2.

> **Begriffe kurz erklärt**
>
> Skill: eine festgehaltene Arbeitsweise, die ein Agent wiederholt anwenden kann.
>
> MCP (Model Context Protocol): der Standard, über den Agenten zugelassene Werkzeuge und Fachsysteme nutzen.
>
> Verbindung: der eingerichtete Zugang eines Agenten zu einem bestimmten System, mit Zweck und Rechten.

Quelle: SM `skills-mcp`. Muster: M2 (E-5).

### 4.19 `/portale`

Voraussetzung: Die heutige Zusammenfassung sagt „Hier finden Sie Ihren Einstieg“. Die Bereiche sind Hüllen, die Anmeldung antwortet nicht (FL A1, PW4). ES ändert `/anmelden`, nicht `/portale`. Der erste Abschnitt unten sollte deshalb **vor** den heutigen Abschnitten stehen. OFFEN F-11.

> **Der Stand heute**
>
> Die Bereiche für Kunden, Partner und Werkstätten sind in Vorbereitung. Die Anmeldung ist zurzeit nicht in Betrieb. Wenn Sie einen Zugang brauchen, schreiben Sie uns.

Quelle: ES (`login` Zusammenfassung); FL A1, PW4. Muster: M2 an erster Stelle oder M10.

> **So erhalten Sie Zugang**
>
> 1. Sie beschreiben, wofür Sie einen Zugang brauchen.
>
> 2. Wir nennen Ihnen den passenden Bereich.
>
> 3. Wir richten den Bereich für Sie ein. Nicht jeder Bereich steht jedem Konto offen.

Quelle: SM `portals` Abschnitt 3. Muster: M2, nummerierte Absätze.

> **Warum die Bereiche getrennt sind**
>
> Jeder Bereich hat eigene Rollen und Rechte. Eine Anmeldung soll für Ihren Bereich gelten, nicht für einen anderen. So sehen Kunden keine Daten anderer Kunden, und Partner sehen nur, was sie betrifft.

Quelle: SM `portals` Abschnitt 2; ES (`login` Abschnitt 1: „Vorgesehen ist …“); FL S7. Muster: M2.

### 4.20 `/anmelden` und `/registrieren`

Keine Erweiterung. Die Abschnitte der Seitenliste sind auf beiden Seiten nicht sichtbar (FL 3.2, 3.3; E-6), und beide Formulare arbeiten heute nicht (FL R1, A1). Maßgeblich ist ES. Sobald Anmeldung und Registrierung arbeiten, lohnt ein kurzer Text „Was nach der Anmeldung geschieht“.
