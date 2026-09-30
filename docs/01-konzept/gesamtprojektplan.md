# TEILEKLAR — Gesamtprojektplan v1.0

**Projektinhaber:** Pascal Courbois
**Marke:** TEILEKLAR (vormals Arbeitstitel „PASCAL AutoParts")
**Betreiber:** TEILEKLAR — ein Geschäftsbereich von NeXify AI by NeXify, Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande · KvK 90483944 · NL865786276B01
**Slogan:** Na klar. TEILEKLAR. · **Claim:** Das passende Teil. Klar erklärt. · **Proof:** Passend. Belegt. Geliefert.
**Domain:** teileklar.shop
**Stand:** 31.08.2026 · **Version:** 1.1 (ersetzt v0.1 vom 30.08.2026)
**Quellrepository:** github.com/nexifyai-dev/teileklar (Branch main)
**Status:** Shop-Artefakt als Demonstrationsstand vorhanden; Beschaffungs- und Zahlungsanbindung offen.

> Was sich gegenüber v0.1 geändert hat: Marke und Betreiberrolle sind gesetzt, das Design- und Sprachsystem ist gebaut, der Markt ist auf D/A/CH **und Benelux** erweitert, ein KI-Berater ist funktional Teil des Produkts, Rechts- und Normenrahmen sind ausgearbeitet, der Shop ist als App installierbar, und Lieferantennamen erscheinen nicht mehr im Kundenfrontend.

---

## 0. Änderungsprotokoll v0.1 → v1.0

| Bereich | v0.1 | v1.0 |
|---|---|---|
| Marke | Arbeitstitel PASCAL AutoParts | **TEILEKLAR**, vollständiges Marken-, Sprach- und Designsystem |
| Betreiber | offen | TEILEKLAR als Geschäftsbereich von NeXify AI by NeXify (Venlo) |
| Märkte | Deutschland, ggf. NL | **7 Marktversionen:** DE, AT, CH, NL, BE-NL, BE-FR, LU mit Preis-, Steuer-, Versand- und Rechtslogik |
| Sprache | deutsch | de/nl/fr mit i18n über Oberfläche, Berater und Rechtsseiten-Titel |
| Positionierung | „Sicher passend. Ehrlich verfügbar." | „Passend. Belegt. Geliefert." + verständliche Alltagssprache statt Fachjargon |
| Lieferantennennung | Pneudata öffentlich genannt | **Nur intern.** Frontend nennt keine Beschaffungsquelle |
| Beratung | KI assistierend erwähnt | **KI-Berater als Kernfunktion** mit Diagnose-, Zubehör-, Bestell- und Kontostrecke |
| Design | Richtung „Graphite Garage" skizziert | gebautes System: Graphit/Papier, Lime als einziger Akzent, Archivo + IBM Plex Mono, pixelgenaues Logo-Lockup mit Slogan |
| Recht | Checkliste | 8 Rechtsseiten inkl. KI-Verordnung, GPSR, Batterie-/Verpackungsrecht, BFSG |
| Kanal | App als Idee | **PWA installierbar** auf Desktop, Tablet, Smartphone mit Offline-Grundbetrieb |
| Lokal | nicht vorhanden | Standort-Ebene mit Stadtseiten je Markt (34 Städte), Footer-Verlinkung |
| Vertrauen | Signale allgemein | 6 überprüfbare Qualitätszusagen, Stimmen-Slider, Markenband mit Freigabelogik |

---

## 1. Entscheidungssatz (unverändert gültig, präzisiert)

TEILEKLAR ist ein **eigenständiger Single-Merchant-Shop** mit einem Katalog, einer Preislogik, einem Auftragsmanagement und kanalbezogenen Projektionen. Die Differenzierung ist nicht Preis, sondern die **belegte Antwort auf eine einzige Frage: Passt dieses Teil zu meinem Auto?** — mit Quelle, Stand, Maßen, notwendigem Zubehör und ehrlicher Lieferzeit.

Vier Sätze, die alles andere steuern:

1. Ohne Fahrzeugkontext wird keine Passung behauptet.
2. Jede prominente Aussage hat Quelle, Stand und Verantwortliche.
3. Bei unklarer Datenlage wird geklärt oder gesperrt — nicht geschätzt.
4. Beschaffungspartner werden im Kundenfrontend nicht beworben.

---

## 2. Marke, Sprache, Gestaltung (neu, umgesetzt)

**Farbe:** Papier #F2F3EF, Graphit #0E1315, Tinte #14191C, Lime #C8F04B als einziger Markenakzent, Amber #A9601C ausschließlich für offene Prüfungen, Grau für „kein Auto gewählt".
**Typografie:** Archivo für Aussagen, IBM Plex Mono für Daten (Teilenummer, Barcode, Quelle, Stand).
**Logo:** Signet + Wortmarke + Slogan „NA KLAR." in zwei pixelgenau vermessenen Sperrungen (Header horizontal, Footer gestapelt), umbruchsicher.
**Bildwelt:** dunkles Studio, warmes Rim-Light, freigestellte Teile; kein Bild ohne das tatsächliche Produkt.
**Sprachregel:** kein Fachwort ohne Klartext. „Passung belegt" → „Passt zu deinem Auto"; „Prüfung erforderlich" → „Eine Frage offen"; Lieferfenster → Lieferzeit; GTIN/MPN → Barcode/Teilenummer. Ampel-Legende auf Startseite und Suche.

Details: `docs/TEILEKLAR-Design-und-Loesungsdokumentation.md`.

---

## 3. Produkt: Stand des Shop-Artefakts

Gebaut und bedienbar (Demonstrationsstand, ein Artefakt, sieben Marktversionen):

| Bereich | Inhalt |
|---|---|
| Startseite | Hero mit Nachweis-Komposition, „So einfach geht's" (4 Schritte), Treffer mit Detailpanel, Ampel-Legende, Klarwissen, Häufige Fragen, App-Installation, Länderbereich, 6 Qualitätszusagen, 50 Stimmen, Markenband, Werkstatt-Teaser |
| Teilesuche | Suchfeld, Facetten (Kategorie, Einbauort, Marke, „nur sicher passend"), 4 Sortierungen, Leerzustand, Trefferzeilen mit Barcode/Teilenummer und Zubehörhinweis |
| Produktseite | Kaufbox mit Zusagen, Klartext-Beschreibung, Passungskasten, Einbau- und Prüfpunkte, Zusatzteile mit Begründung, Lieferumfang/Ausschlüsse, Variantentabelle, Produkt-FAQ, Versand/Zahlung/Rückgabe, Zuletzt angesehen, Quellenzeile |
| Berater (KLARA) | Diagnose mit Rückfrage, Produktwissen, Variantenvergleich, Zubehörregeln (Halter, Schrauben, Sensor, Filter), Bündel-Vormerkung, Bestellstrecke, Kontoanlage, ehrliche Rückfallantwort — in de/nl/fr |
| Klarwissen | 6 Ratgeber mit Volltext, Inhaltsverzeichnis, Verantwortlichen und Stand |
| Werkstatt | 3-Schritt-Ablauf, Partnerliste mit Entfernung/Leistungen/Termin, Partnerfläche |
| Standorte | 34 Stadtseiten über 7 Märkte mit Lieferzeit, Partnerzahl, lokalen FAQ |
| Konto/Garage | Fahrzeug, letzte Bestellung, Kennzahlen, Kontokacheln |
| Recht | Impressum, Datenschutz, AGB, AVV, Widerruf, Cookies, KI-Hinweise, Normenübersicht |
| App | Manifest, Icons, Service Worker, Ein-Klick-Installation, Offline-Grundbetrieb |

**Noch nicht angebunden:** Katalog-/Bestands-/Preisdaten, echte Fahrzeugdatenbank (HSN/TSN-Eingabe), Checkout/Payment/Versand, Konto/Login/Consent, Feeds, Partnerverwaltung.

---

## 4. Beschaffung (intern)

Die Beschaffungsstrategie aus v0.1 bleibt gültig: drei Fulfillment-Modi (Lieferant direkt, Cross-Dock, Eigenlager/3PL), Aktivierung nur nach schriftlicher Bestätigung, hybrides Zielmodell. **Neu:** Der Frontend-Auftritt ist so gebaut, dass ein Lieferantenwechsel keine Änderung am Kundenerlebnis erfordert — Quellenangaben lauten „Geprüft von TEILEKLAR · Stand …", nicht nach Lieferantenname.

Gate 0 bleibt: Integrationsblatt mit Zugang, Datenfeldern, Bestand, Preis, Bestellweg, Storno, Tracking, Teilversand, Rückabwicklung, Rechten und SLA. Ohne belastbaren Bestell- und Bestandsweg kein breiter Shopbau.

---

## 5. Märkte, Preise, Recht je Land

| Markt | Sprache | Währung | Steuer | Versand | Lieferzeit | Zahlarten |
|---|---|---|---|---|---|---|
| DE | de | EUR | 19 % | 4,95 € | 1–2 Werktage | Rechnung, SEPA, Karte, PayPal |
| AT | de | EUR | 20 % | 6,90 € | 2–3 Werktage | EPS, Rechnung, Karte, PayPal |
| CH | de | CHF | 8,1 % | CHF 12.90 | 3–5 Werktage | TWINT, Karte, Rechnung |
| NL | nl | EUR | 21 % | 5,95 € | 2–3 werkdagen | iDEAL, Rekening, Karte |
| BE-NL / BE-FR | nl / fr | EUR | 21 % | 6,50 € | 2–3 Tage | Bancontact, Karte, PayPal |
| LU | fr (+de) | EUR | 17 % | 7,90 € | 2–4 Tage | Karte, Überweisung |

Rechtsrahmen je Markt, Registrierungen (Verpackung, Batterie), Widerruf, Zoll für CH: `docs/TEILEKLAR-SEO-i18n-und-Local-Marketing.md` und die Normenübersicht im Shop.

**Entschieden am 31.08.2026 durch den Betreiber:**

1. **Rechtsmodell: B2C und B2B mit getrennten Flows.** Verbraucher erhalten Bruttopreise, 14 Tage Widerruf und die vollen Verbraucherrechte; Unternehmer erhalten Nettopreise erst nach Prüfung von Firmenangabe und USt-IdNr., ohne gesetzliches Widerrufsrecht, mit vereinbartem Zahlungsziel.
2. **Rolle: TEILEKLAR ist Verkäufer und Vertragspartner** — kein Vermittlungsmodell. Direktversand durch Lieferanten ändert daran nichts; Vertrag, Gewährleistung und Rücknahme laufen über TEILEKLAR.

Damit sind AGB, Widerruf, Streitbeilegung, Preisdarstellung und Checkout festgelegt. Im Shop ist die Kundentyp-Unterscheidung bereits umgesetzt (Schritt 1 der Bestellstrecke).

---

## 6. Betriebslogik

Vollständig ausgearbeitet in `docs/TEILEKLAR-Betriebslogik-und-Prozesse.md`: Produktstatus-Automat (draft/verified/conditional/blocked/retired mit Übergängen und Rollen), Fahrzeug- und Passungslogik, Zubehör-Abhängigkeitsmatrix, Beratungskette mit Ehrlichkeitsregeln, Bestell- und Werkstattstatus, Redaktionsprozess, Rollen mit Reaktionszielen, Tages-/Wochen-/Monatsroutinen, Kennzahlen mit Definition, Zustandskatalog je Screen, Datenschutz- und Rechtelogik.

---

## 7. Wachstum: drei Zielgruppen, drei Strecken

**7.1 Endkunden** — SEO über Fahrzeug-Teil-Kombinationen, Ratgeber als Zubringer, Stadtseiten für lokale Nachfrage, App-Installation für Wiederkäufe, Berater als Abschlusshilfe.

**7.2 Werkstattpartner** — Wertversprechen: Kunde bringt geprüftes Teil, Werkstatt bekommt Auftrag mit Fahrzeug, Prüfergebnis und Teiledaten. Kein Teilerisiko, kein Rückfragen-Ping-Pong, planbare Termine. Akquise über Verzeichnis-Recherche (Auftrag `docs/Auftrag-Werkstatt-Verzeichnis-DACH-Benelux.md`), Erstansprache nach Priorität, Onboarding mit Partnervereinbarung.

**7.3 Investoren** — Argument: nicht „noch ein Teileshop", sondern ein Vertrauens- und Beratungslayer über einem Beschaffungsnetz, gebaut von einer KI-Agentur, die Aufbau und Betrieb automatisiert. Eigener Investorenbereich im Shop, Präsentation und Datenraum-Struktur.

---

## 8. Roadmap v1.0

| Phase | Ergebnis | Kernaufgaben | Gate |
|---|---|---|---|
| P0 Beschaffung | belastbarer Datenweg | Lieferantenbriefing, Testzugang, Integrationsblatt, Rechtsmodell B2C/B2B, Markenprüfung | Bestand, Preis, Bestellweg schriftlich |
| P1 Vertical Slice | echter Bestellpfad in Testumgebung | 1–3 Kategorien, 1 Adapter, PIM/Fitment-Minimum, Zahlungs-Sandbox, Auftragsstatus | Testbestellung bis Rückgabe bestanden |
| P2 Pilot DE | reale Aufträge | 100–1.000 SKU, Versand/Tracking, Support, Google/idealo, Monitoring | 30 Tage stabil, positive Deckung |
| P3 Partnernetz | Werkstattvermittlung live | Verzeichnis, Erstansprache, Partnervertrag, Auftragsübergabe, Terminlogik | 25 aktive Partner, Lead-to-Appointment gemessen |
| P4 Märkte | AT, NL, BE, CH, LU | Rechtstexte je Land, Zahlarten, Registrierungen, Übersetzung Langtexte | je Markt eigenes Rechts- und Steuer-Gate |
| P5 Kanäle | Marktplätze | eBay Motors, Kaufland, bol.com, später Amazon | Feed-, Order-, Rücksende-Sync nachgewiesen |
| P6 Skalierung | Sortiment und B2B | Reifen/Felgen, Pro-Konto, Eigenlager für Bestseller | Deckungsbeitrag je Kanal belegt |

---

## 9. Arbeitspakete (aktualisiert)

| ID | Paket | Status | Priorität |
|---|---|---|---|
| WP-01 | Lieferantenvertrag und Integrationsklärung | offen | P0 |
| WP-02 | Marke, Domain, Namensprüfung TEILEKLAR | offen | P0 |
| WP-03 | Händler-, Steuer- und Rechtsmodell (B2C/B2B) | **entschieden** (B2C+B2B, Verkäuferrolle) | P0 |
| WP-04 | PIM-/Fitment-Datenmodell | offen | P0 |
| WP-05 | Lieferantenadapter | offen | P0 |
| WP-06 | Preis- und Margenengine (7 Märkte) | offen | P0 |
| WP-07 | Shop-UX und Designsystem | **erledigt** (Demonstrationsstand) | P0 |
| WP-08 | Commerce/OMS/Payment | offen | P0 |
| WP-09 | Retouren und Support | offen | P0 |
| WP-10 | Feeds Google/idealo/billiger/beslist | offen | P1 |
| WP-11 | Marktplätze eBay/Kaufland/bol | offen | P1 |
| WP-12 | Compliance-Datenregister | Rahmen erstellt, Datenfelder offen | P0 |
| WP-13 | Monitoring und Runbooks | offen | P0 |
| WP-14 | B2B-/Pro-Konto | offen | P1 |
| WP-15 | Reifen/Felgen/RDKS | offen | P2 |
| WP-16 | **KI-Berater** (Regelwerk, Wissensbasis, Eskalation) | Grundlogik gebaut | P0 |
| WP-17 | **i18n und Marktversionen** | Oberfläche fertig, Langtexte offen | P1 |
| WP-18 | **Werkstattpartner-Akquise** | Pilotverzeichnis geliefert (598 Betriebe, 6 Märkte) und im Shop eingebaut | P1 |
| WP-19 | **Investoren- und Partnerunterlagen** | in Arbeit | P1 |
| WP-20 | **PWA/App und Performance** | gebaut | P2 |
| WP-21 | **Geschäftsdokumente** (Angebot, Rechnung, Verträge) | in Arbeit | P1 |

---

## 9a. Umsetzungsstand im Shop-Artefakt (31.08.2026)

Seit Version 1.0 zusätzlich umgesetzt und geprüft:

| Baustein | Stand |
|---|---|
| Bestellstrecke | Fünf Schritte (Adresse, Versand, Zahlung, Prüfen, Bestätigung), Kundentyp-Weiche, Pflichtfeldprüfung, Button-Lösung nur am Vertragsabschluss, Bestellnummer |
| Einwilligung | Banner mit gleichgewichteten Wegen, Panel mit drei Kategorien, Nachweis mit Zeitstempel, jederzeit änderbar |
| Datenrechte | Export, Löschung, Auskunft, Berichtigung, Widerspruch, Einwilligungsänderung — als eigener Bereich „Meine Daten" |
| Meldewege | Rückgabe, Widerruf, Mangel, Fehlpassung, Sicherheitsvorfall getrennt geführt |
| KI-Transparenz | Hinweis vor der ersten Antwort, Übergabe an Menschen jederzeit erreichbar |
| Rechtstexte | 84 Marktdokumente in Landessprache, Arbeitsvermerke entfernt (stehen in Pflichtenheft und Projektplan) |
| Werkstattverzeichnis | 598 Betriebe aus dem Pilot, Filter nach Ort, Kartenlink, Datenherkunft je Eintrag ausgewiesen |
| Herstellerlogos | 24 Logos aus Markenportalen, einheitlich in Graustufen, Nutzungsnachweise dokumentiert |

## 10. Risiken (aktualisiert)

Die zehn Risiken aus v0.1 bleiben gültig. Neu hinzugekommen:

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| B2C/B2B-Widerspruch in Rechtstexten | Angreifbarkeit, Bußgeld, Abmahnung | Grundsatzentscheidung vor Verkaufsstart, dann Texte konsistent nachziehen |
| Rechtstexte nur deutsch in NL/BE/LU | Rechtsrisiko und Vertrauensverlust | sichtbarer Sprachhinweis (umgesetzt), Übersetzung mit Fachprüfung vor Marktstart |
| Herstellerlogos ohne Freigabe | Markenrechtsverstoß | Logofelder mit Freigabeprozess (umgesetzt), Beschaffungsauftrag mit Nutzungsnachweis |
| Fachtexte maschinell übersetzt | falsche Maße und Freigaben | Übersetzung nur mit Fachprüfung; Hinweis im UI bis dahin |
| Beratung wird als Rechtsauskunft verstanden | Haftung | KI-Hinweise, Eskalationsweg, Verweis auf Fachwerkstatt (umgesetzt) |
| Werkstattdaten aus Verzeichnissen | Datenschutz-/Nutzungsrechte | nur betriebliche Daten, Quellenprotokoll, Sperrliste (im Auftrag geregelt) |

---

## 11. Entscheidungen, die jetzt anstehen

1. Startmarkt: DE allein oder DE + NL parallel (Sitz Venlo spricht für NL früh).
3. Fulfillment-Modus für den Pilot.
4. Startsortiment: Verschleißteile allein oder mit Reifen/Felgen.
5. Commerce-Kern: Shopware-Evaluation oder Vendure/Sylius.
6. Zahlungs- und Versandpartner je Markt.
7. Ausgeschlossene Teilearten zum Start (Haftung).
8. Budget und Zeitfenster für Pilot und Partnerakquise.
9. Investorenansatz: Eigenfinanzierung, Business Angel oder strategischer Partner.
10. Umgang mit Herstellerlogos: Freigaben einholen oder dauerhaft Wortmarken.

---

## 12. Nächster Auftrag

**P0-a Lieferantenbriefing** (eine Seite): Betreiber, geplantes Sortiment, Kanäle, Fragen zu Datenzugang, Bestellanlage, Versand, Tracking, Rechnung, Retouren, Markenrechten, Bitte um Testzugang und Ansprechpartner.

**P0-b Machbarkeitsprüfung** mit 100–500 SKU: Importdauer, Datenqualität, Dubletten, Bestandsalter, eine Testbestellung inkl. Tracking, Storno und Rückgabe, echte variable Kosten, Go/No-Go dokumentiert.

**P0-c Rechtstexte auf die getroffene Entscheidung festziehen**: AGB in eine Verbraucher- und eine Unternehmerfassung trennen, Widerruf nur für Verbraucher ausweisen, Streitbeilegung entsprechend, Preisdarstellung je Kundentyp — Grundlage ist die Entscheidung vom 31.08.2026 (B2C+B2B, Verkäuferrolle).

**P1-a Partnerakquise starten**: Verzeichnisauftrag ausführen lassen, Erstansprache Top 200 je Markt.

---

## 13. Dokumentenregister

| Dokument | Inhalt |
|---|---|
`TEILEKLAR Shop.dc.html` | Shop-Artefakt, 7 Marktversionen, installierbar als App |
`docs/TEILEKLAR-Design-und-Loesungsdokumentation.md` | Designsystem, Sprachregeln, Bereiche, Beraterfähigkeiten, Tweaks |
`docs/TEILEKLAR-Betriebslogik-und-Prozesse.md` | Statusautomaten, Rollen, Routinen, Kennzahlen, Zustandskatalog |
`docs/TEILEKLAR-SEO-i18n-und-Local-Marketing.md` | Marktmatrix, URL-Struktur, Keywords, Local-Hebel, Feeds, Rollout |
`docs/Auftrag-Herstellerlogos.md` | Beschaffung der Markenlogos mit Nutzungsnachweis |
`docs/Auftrag-Werkstatt-Verzeichnis-DACH-Benelux.md` | Werkstattdaten beschaffen, prüfen, zusammenführen, exportieren |
`docs/TEILEKLAR-Gesamtprojektplan-v1.md` | dieses Dokument |

Der ursprüngliche Plan v0.1 (`uploads/pascal-autoparts-gesamtprojektplan.md`) bleibt als Recherchestand erhalten; Wettbewerbs-Benchmark, Kanal-Integrationsdetails und Quellenregister daraus gelten unverändert weiter.
