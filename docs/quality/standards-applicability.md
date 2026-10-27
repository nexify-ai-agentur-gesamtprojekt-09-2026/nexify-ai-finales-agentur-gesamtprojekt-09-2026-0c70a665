# Normen, Recht und überprüfbare Abnahme der NeXify-Oberfläche

Stand **26.10.2026**, Zweig `factory/source-faithful-rebuild-2026-10-26`.
Dieser Katalog trennt verpflichtende Projektziele, bedingt anwendbares Recht,
freiwillige Organisationsstandards und die gestalterische Rekonstruktion.
**Keine Norm macht ein Design automatisch hochwertig; keine bestandene CI ist
ein DIN-/ISO-Zertifikat.** Die zurückgewiesene Oberfläche ist durch diese
Recherche nicht nachträglich abgenommen.

Der maschinenlesbare Vertrag steht in
[standards-applicability.json](../../config/standards-applicability.json):
25 Anforderungen mit Quelle, Umsetzungsplan, Prüfmethode, vorhandenen
Evidenzpfaden, verantwortlicher Rolle, Lücke und Status. Alle bleiben ohne
Abnahme für den aktuellen Neuaufbau. Rollen sind Zuständigkeiten, die konkret
zu besetzen sind; sie behaupten keine bereits erfolgte Beauftragung eines Auditors.

## Quellen- und Editionsstand

Öffentliche Quellen wurden lesend per HTTPS abgerufen. Exakte URLs, UTC-Zeiten,
Response-SHA-256 und Zugriffsergebnis stehen im JSON. Bei DIN/ISO wurden
öffentliche Kataloginformationen geprüft, keine kostenpflichtigen Volltexte
beschafft. Öffentliche Rechts-/W3C-Texte wurden für die benannten Anforderungen
gezielt ausgewertet; eine vollständige klauselfürweise Konformitätsprüfung
wird nicht behauptet. Hier werden keine langen Normpassagen wiedergegeben.

| Gegenstand | Beobachteter offizieller Stand | Bedeutung für diesen Auftrag |
|---|---|---|
| **DIN 5008** | DIN-Katalog: Ausgabe **2020-03** und **Berichtigung 1:2020-07** aktuell. | Geschäftskorrespondenz und Angebotsvorlagen gemäß Repo-Vorgabe. Keine allgemeine Vorschrift für Farbe, Premiumwirkung oder Website-Layout. Exakte Maße erst gegen die vollständige passende Ausgabe prüfen. |
| **ISO 9241-210** | ISO **2019**, DIN EN-Ausgabe **2020-03**, im DIN-Katalog aktuell. | Menschzentrierter Gestaltungsprozess: Nutzungskontext, Anforderungen, Entwurf und Evaluation müssen zusammenpassen. Ein Screenshot belegt diesen Prozess nicht. |
| **ISO 9241-11** | ISO **2018**, DIN EN-Ausgabe **2018-11**, aktuell gelistet. | Gebrauchstauglichkeit im konkreten Kontext anhand Effektivität, Effizienz und Zufriedenstellung bewerten. Keine erfundenen Konversions-/Usabilitywerte. |
| **ISO 9001** | DIN **2015-11** und **A1:2024-11** aktuell gelistet. ISO **9001:2026**, DIN-Ausgabe **2026-11**, bereits **vorab bereitgestellt**. | Organisationsweites Qualitätsmanagement ist ein gesonderter Geltungsbereich. Vor einem Konformitätsvorhaben Ausgabe und Übergang klären; weder die 2026-Ausgabe vorzeitig als geltende Baseline setzen noch die Revision ignorieren. |
| **ISO/IEC 27001** | ISO **2022**, DIN EN **2024-01** plus **A1:2024-11** zur ISO-Änderung 2024 aktuell gelistet. | Optionales, ausdrücklich abgegrenztes ISMS. Sicherheits- und Datenschutzpflichten gelten unabhängig von einer angestrebten Zertifizierung. |
| **WCAG 2.2 AA** | W3C Recommendation **12.12.2024**, datierte Fassung öffentlich gelesen. | Verbindliches Repo-Ziel für vollständige Seiten und Prozesse. Es umfasst mehr als die unten hervorgehobenen Kriterien. |
| **EN 301 549** | DIN-Katalog: **V3.2.1 (2021-03)**, DIN **2022-06**, aktuell. Daneben **prEN 301549:2025**, DIN **2026-05**, als Entwurf. | Web, Dokumente, Software und gegebenenfalls Unterstützung/Medien prüfen. Entwurf und aktuelle Ausgabe unterscheiden. EN 301 549 ist nicht identisch mit WCAG 2.2. |
| **BFSG/BFSGV** | BFSG §§1, 3, 4, 14 und BFSGV öffentlich gelesen. BFSGV nennt Änderung **10.07.2026**. | Tatsächliche Dienstleistungen, B2C-Verträge, Märkte und Anbieterrolle entscheiden. Keine pauschale Anwendbarkeit oder Ausnahme aus dem Namen „B.V.“ ableiten. |
| **DSGVO Art. 25/32** | Offizieller EDPB-Leitfaden zu Sicherheit, Datenschutz durch Gestaltung und Voreinstellungen erreichbar; EUR-Lex-Text hier nicht nutzbar geliefert. | Datenminimierung, sichere Voreinstellungen und risikogerechte Sicherheitsmaßnahmen praktisch umsetzen; aktuelle konsolidierte Rechtsfassung für die juristische Abnahme zusätzlich lesen. |
| **KI-VO Art. 50/113** | EU-Kommissions-Service-Desk nennt konsolidierten Stand **27.07.2026**. Art.113: allgemeine Anwendung **02.08.2026** mit besonderen Ausnahmen. | Tatsächliche Rolle und Ausgabe einordnen: AI-Interaktion, synthetische Ausgabe und Deepfake-/Presenterfall haben unterschiedliche Pflichten. Kein pauschales „KI-konform“-Siegel. |

Direkte ISO-Katalogaufrufe und der ETSI-PDF-Download lieferten **403**.
Die Editionsangaben oben stützen sich deshalb auf den erfolgreichen offiziellen
DIN-Katalog. Dessen nationaler Katalogstatus ersetzt keine direkt verifizierte
ISO-Lifecycle-Abfrage zur internationalen Ausgabe oder deren Ablösung; gerade
bei ISO 9001 bleibt dies Teil der verbindlichen Editionsentscheidung. Es wird
keine weltweit neueste ISO-Ausgabe als abschließend verifiziert ausgegeben.
EUR-Lex lieferte beim abschließenden Abruf leere Antworten mit
HTTP **202**; frühere Versuche enthielten ebenfalls keinen nutzbaren Gesetzestext.
Das ist ausdrücklich **kein** gelesener EUR-Lex-Volltext. Der öffentliche
EU-Kommissions-Service-Desk ist die hier tatsächlich gelesene AI-Act-Quelle.
Die jeweiligen Fehlversuche bleiben im Quellregister sichtbar.

Wichtige offizielle Einstiege:

- [DIN 5008 im DIN-Katalog](https://www.din.de/de/suche/62730!search?query=DIN%205008), [ISO 9241-210](https://www.din.de/de/suche/62730!search?query=ISO%209241-210), [ISO 9241-11](https://www.din.de/de/suche/62730!search?query=ISO%209241-11).
- [ISO 9001 im DIN-Katalog](https://www.din.de/de/suche/62730!search?query=ISO%209001), [ISO/IEC 27001](https://www.din.de/de/suche/62730!search?query=ISO%2027001), [EN 301549](https://www.din.de/de/suche/62730!search?query=301549).
- [Datierte WCAG 2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/), [W3C Evaluation](https://www.w3.org/WAI/test-evaluate/).
- [BFSG §1](https://www.gesetze-im-internet.de/bfsg/__1.html), [§3](https://www.gesetze-im-internet.de/bfsg/__3.html), [§4](https://www.gesetze-im-internet.de/bfsg/__4.html), [§14](https://www.gesetze-im-internet.de/bfsg/__14.html), [BFSGV](https://www.gesetze-im-internet.de/bfsgv/BJNR092800022.html).
- [EDPB Sicherheitsleitfaden](https://www.edpb.europa.eu/sme-data-protection-guide/secure-personal-data_en), [EU AI Act Art.50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), [Art.113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113).

## Gesetzlicher Geltungsbereich ist eine eigene Entscheidung

BFSG §1 erfasst unter anderem nach dem 28.06.2025 erbrachte Dienstleistungen
im elektronischen Geschäftsverkehr für Verbraucher. Eine reine B2B-Präsentation
und ein tatsächlicher B2C-Vertragsschluss sind fachlich zu unterscheiden.
Auch eine B.V. mit deutschem Zielmarkt benötigt eine Prüfung der konkreten
Leistung und Marktsituation; Sitz und Sprache allein entscheiden das nicht.
§3 Absatz 3 enthält eine Ausnahme für Kleinstunternehmen, die Dienstleistungen
anbieten. Deren tatsächliche Voraussetzungen sind hier nicht belegt. Unabhängig
von dieser Prüfung bleibt WCAG 2.2 AA ein ausdrückliches Projektziel.

Ein alter Amtsblattverweis für die öffentliche Webzugänglichkeitsrichtlinie ist
kein automatischer Nachweis einer BFSG-/EAA-Konformitätsvermutung. Vor einer
solchen Aussage müssen die **aktuell für das konkrete Rechtsinstrument**
veröffentlichten harmonisierten Normen geprüft werden. Der entsprechende
EUR-Lex-Abruf war hier nicht verifizierbar. Die Ausgabe V3.2.1 ist zudem nicht
einfach als vollständiger WCAG-2.2-Nachweis umzuetikettieren. Bei Anwendbarkeit
gehören unter anderem die Informationen nach BFSG §14 und die einschlägigen
Dienstleistungs-/Commerce-Anforderungen der BFSGV in die Abnahme.

Art.50 unterscheidet Pflichten von Anbietern und Betreibern. Eine sichtbare
Kennzeichnung ersetzt nicht automatisch eine gegebenenfalls erforderliche
maschinenlesbare Markierung synthetischer Ausgabe. Umgekehrt ist eine statische
Deterministik im aktuellen Besucher-Gateway kein Beleg für einen angeschlossenen
generativen Agenten. Bei Pascal-/NeX-/AIFly-Medien sind die tatsächliche
Herstellung, Rolle, Rechte und erste Wahrnehmung zu prüfen. Klare, zugängliche
Information erfolgt spätestens beim relevanten ersten Kontakt bzw. der ersten
Exposition, wenn die betreffende Pflicht greift.

## Konkrete Abnahme innerhalb des Repositorys

Die IDs verweisen auf vollständige Umsetzung-/Test-/Owner-Felder im JSON.
Vorhandene Dateien sind **Ansatzpunkte**, keine bestandenen Tests für den
aktuellen Neuaufbau. Die folgenden Kriterien sind priorisierte Prüfpunkte,
keine erschöpfende Liste sämtlicher Normklauseln oder WCAG-A/AA-Kriterien.

| IDs | Umsetzbarer Schritt | Verlangter Nachweis und aktuelle Lücke |
|---|---|---|
| **DOC-01/02** | Geschäftsdokumentvorlage versionieren; Absender/Empfänger, Datum, Betreff und sinnvolle Struktur mit freigegebenem Dokumentdesign binden. Lange Texte, Seitenwechsel, DE/NL/FR und eine zugängliche HTML-Alternative berücksichtigen. | `make_pdf` im Besucher-Gateway erzeugt ein echtes Entwurfs-PDF; vorhandene Tests prüfen unter anderem PDF-Struktur. Das beweist weder DIN-5008-Layout noch getaggtes/zugängliches PDF. Präzise Normprüfung und tatsächliche Dokument-Zugänglichkeitsprüfung fehlen. Preise/Rechtstexte behalten ihre eigenen Gates. |
| **UX-01–04** | Nutzer, Aufgaben, Geräte, Sprachen, Assistenztechnik und Anwendungskontext beschreiben; jede Quellsektion/Aktion einem nativen Ziel oder begründeten Unterschied zuordnen; Entwurf mit realen Aufgaben iterieren. | Inventar und Seitenkarte existieren. Eine vollständige Annahme der 93 Quellseiten und ihrer Interaktionen liegt dadurch nicht vor. Reale Studien, vorab vereinbarte Erfolgskriterien und Befund-zu-Retest-Nachweise fehlen. |
| **A11Y-01** | Tatsächliche Kontraste aller relevanten Zustände aus den Tokens prüfen. | SC 1.4.3: normaler Text 4,5:1, großer Text 3:1; einschlägige UI-/Nichttextkontraste nach SC 1.4.11: 3:1. Ein Token- oder Heuristikaudit erfasst nicht automatisch Bilder, Verläufe und alle Zustände. |
| **A11Y-02** | Vollständige Tastaturbedienung, verständliche Fokusfolge, kein Trap, sichtbarer und nicht verdeckter Fokus. Mobile Seitenleiste/Dialog und externe Anmeldung einbeziehen. | Tab/Shift-Tab/Enter/Leertaste/Escape und Fokusrückgabe manuell prüfen. Fokuscode allein ist keine Abnahme nach SC 2.1.1/2.1.2/2.4.3/2.4.7/2.4.11. |
| **A11Y-03** | Reflow und Vergrößerung ohne Informations-/Funktionsverlust; berechtigte zweidimensionale Ausnahmen dokumentieren. | 320 CSS-Pixel äquivalente Breite, 200% Textgröße und praktisch 400% Browserzoom bei 1280 Pixeln prüfen; mobile Tastatur und Ausrichtung einschließen. |
| **A11Y-04** | Projektvorgabe von mindestens 44 Pixel großen Zielen beibehalten. | WCAG 2.2 **AA** SC 2.5.8 hat grundsätzlich 24×24 CSS-Pixel bzw. einschlägige Abstands-/Ausnahmeregeln. 44 Pixel ist hier die strengere Repo-Vorgabe, kein universeller AA-Grenzwert. |
| **A11Y-05/06** | Formulare, Fehler, Labels, sichere Anmeldung und Statusansagen zugänglich machen; gespeicherte Werte erhalten; Passwortmanager/Einfügen unterstützen. | Accessibility-Tree, Screenreader und reale Fehlerfälle prüfen. Angebotsentwurf, vorgemerkter Versand und Terminwunsch dürfen nicht als gesendet/bestätigt erscheinen. Unter anderem SC 3.3.1/3.3.2/3.3.7/3.3.8/4.1.2/4.1.3 prüfen. |
| **A11Y-07/08** | Tatsächliche Medien mit passenden Untertiteln, Beschreibungen/Alternativen und Steuerung ausliefern; Bewegungen pausierbar, kein Tonautoplay. Alle anwendbaren A/AA-Kriterien in einer vollständigen Matrix führen. | Ein Medienkonzept ist kein geprüfter Clip. Automatikscan, manuelle Tastatur-/Screenreaderprüfung und vollständige Seiten/Prozesse gemeinsam bewerten. Reduced Motion bleibt zusätzliche Projektvorgabe. |
| **LEGAL-A11Y-01/02** | Anwendbarkeit, Ausnahmen und Editionen entscheiden; bei Anwendbarkeit Commerce-, Auth-, Zahlungs-, Dokument- und Unterstützungsabläufe samt Barrierefreiheitsinformation vollständig prüfen. | Begründete Rechts-/Produktentscheidung und aktuelle Norm-/Amtsblattreferenzen fehlen. Keine stille Kleinstunternehmensannahme. |
| **QMS-01/02** | Prozessverantwortung, Qualitätsziele, Versionskontrolle, Lieferantenbeurteilung, Defekt-/Beschwerdeprozess und Wirksamkeitsprüfung dokumentieren. | CI, Featureliste und Arbeitsregeln sind technische Beiträge. Managemententscheidungen, gelebte Audit-/Korrekturzyklen und der Editionsübergang sind nicht als QMS abgenommen. |
| **ISMS-01/02** | Systemgrenzen, Daten/Assets, Risiken und begründete Kontrollen festlegen; echte Auth-/Mandanten- und Secret-/Release-Grenzen testen. | Lokale SQL-RLS-/Auth-Tests sind keine Produktionsfreigabe. Ein DB-Prinzipaltest beweist keine JWT-/Shared-Pool-Brücke. ISMS-Geltungsbereich, Risiko-/Kontrollbegründung und Betriebsevidenz fehlen. |
| **PRIV-01–03** | Daten und Zwecke minimieren, sichere Defaults, Aufbewahrung/Löschung/Holds, Wiederherstellung und Provider-/Transferverträge festlegen. | Öffentlicher Payloadfilter besteht als Ansatzpunkt. Besucher-Sessionablauf löscht nicht automatisch Nachrichten/Buchungen/Outbox. Statisches ZIP-Backup stellt keine Konten, Schlüssel, Gespräche oder Providerdienste wieder her. |
| **AI-01/02** | Tatsächliche Interaktion und synthetische Medien rollen-/versionsbezogen kennzeichnen und gegebenenfalls technische Markierungen prüfen. | Aktueller strukturierter Assistent, späterer Providerdialog und synthetischer Presenter sind getrennte Fälle. Kein real erzeugtes Medium bzw. Anbieter-Markierungsnachweis wurde durch diese Recherche geprüft. |

## Reihenfolge der Umsetzung und Belegführung

1. **Geltung und Quelltreue fixieren:** Seite, Personengruppe, Prozess,
   Marktkontext, Rechts-/Normausgabe und fachliche Quelle benennen. Jede bewusste
   Abweichung von der Referenz als prüfbare Entscheidung führen. Weder ein
   Standardname noch ein edleres Layout rechtfertigen eine entfernte Funktion.
2. **Im Repo implementieren:** freigegebene Tokens/Komponenten, Semantik,
   Navigation, Formulare, Zustände, Medienalternativen und Dokumentvorlage
   umsetzen. Auth-/Mandantengrenzen, Idempotenz und bestehende Preis-/Rechtsgates
   beibehalten. Keine behaupteten Providerergebnisse einsetzen.
3. **Gezielt prüfen:** statische Token-/Marken-/Strukturchecks, tatsächliche
   Kontrast-/Zielgrößenprüfungen und echte Browser-/API-Negativfälle ergänzen.
   Vollständige Nutzerprozesse und externe Widgets einschließen. Automatisierbare
   Kontrollen möglichst als Regression erhalten; manuelle Kriterien nicht durch
   einen automatischen Score ersetzen.
4. **Menschen und Betrieb einbeziehen:** repräsentative Nutzeraufgaben,
   Tastatur/Screenreader, Dokument-/Rechtsreview, realer Datenschutz-/Sicherheits-
   Datenfluss, Wiederherstellung und vereinbarte Organisationsprozesse prüfen.
   Sample, Umgebung, Fehler und Grenzen offen berichten.
5. **Exakte Fassung abnehmen:** Release-Commit und Artefakthash mit der
   Anforderungs-ID, Edition, Umsetzung, Testeingaben/-methode, tatsächlichem
   Ergebnis, UTC-Zeit, Umgebung, Evidenzpfad/-hash sowie verantwortlicher
   Person/Reviewer verbinden. Begründete Ausnahmen separat entscheiden;
   blockierende Lücken halten die betreffende Freigabe offen.

Ein Implementierungsnachweis benötigt diese Kette:

`Anforderung → konkrete Quelle/Edition → Umsetzung → ausgeführter Test → lesbarer Beleg → Owner/Review → Status`.

Die JSON-Datei enthält bewusst keine pauschalen grünen Statusfelder.
`partial_repository_evidence` bedeutet nur vorhandene lokale Ansatzpunkte.
`scope_decision_required`, `edition_and_organisation_review_required` und
`external_review_required` sind offene Arbeit. Ein früherer Testlauf einer
veränderten Oberfläche wird nicht als aktueller Neuaufbau-Nachweis verwendet.

## Was vollständige Normen oder unabhängige Prüfung benötigt

DIN-5008-Maße und vollständige ISO-Klauselkonformität nicht aus Abstracts
rekonstruieren. Vor entsprechender Konformitätsbehauptung die gültige Ausgabe
inklusive Berichtigungen/Änderungen auf autorisiertem Weg bereitstellen und
gegenprüfen. Es wurde kein Normenkauf ausgelöst; die reversible technische
Umsetzung kann parallel anhand der öffentlich belegten Anforderungen und
strengeren Repo-Vorgaben fortgesetzt werden.

ISO-9001-/27001-Zertifizierung setzt einen tatsächlich abgegrenzten und gelebten
Organisations-/Managementprozess voraus. Ein Zertifizierungsziel benötigt eine
eigene Entscheidung und eine unabhängige geeignete Zertifizierungsstelle.
ISO selbst oder diese Dokumentation zertifizieren das Produkt nicht. Auch eine
unabhängige Accessibility-/Rechts-/Datenschutzprüfung darf nicht durch einen
CI-Status, Bibliotheksnamen oder eine allgemeine Designbewertung ersetzt werden.

Diese Lieferung verändert weder Produktionsbetrieb, Preise oder Rechtstexte
noch den UI-Code. Sie legt die fachliche und technische Abnahmebasis offen;
die tatsächliche Rekonstruktion und ihre ausgeführten Prüfungen müssen die
genannten Lücken für die jeweilige Fassung schließen.
