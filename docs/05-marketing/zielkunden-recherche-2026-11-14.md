# Zielkunden- und Marktrecherche · NeXify AI und TEILEKLAR · 14.11.2026

**Status:** Arbeitsfassung zur Entscheidung durch den Inhaber Pascal Courbois.
**Zweck:** Belegte Zielkunden- und Marktgrundlage für das Meeting am 15.11.2026, 14:00 Europe/Amsterdam, aus der eine priorisierte Angebots- und Library-Roadmap folgt. Abschnitt 3 ist die Zuarbeit für `docs/01-konzept/library-erweiterung-2026-11-14.md` (Schwestersitzung) und über die IDs `LIB-NX-*` / `LIB-TK-*` referenzierbar.
**Scope:** Nur dieses Dokument (additiv). Keine Änderung an Code, Seiten, Design, Preisen, Rechtstexten. Kein Sammeln personenbezogener Daten, kein Lead-Scraping.

**Grundsätze dieser Recherche**
- Zwei getrennte Marken: **NeXify AI** (B2B-Automatisierungsagentur, „Chat it. Automate it.") und **TEILEKLAR.shop** (Kfz-Teile + Werkstattvermittlung, B2C/B2B2C). Daten, Design und Rechte bleiben getrennt.
- Jede Marktaussage trägt Quelle mit Datum/Link (Abschnitt 5). Interne Festlegungen sind als SOLL/IST mit Fundstelle markiert, nicht belegte Aussagen als **ANNAHME**.
- Preise, Referenzen, Kennzahlen werden nicht erfunden. Der Tagessatz 449 € netto (`config/fakten.json#projekt.tagessatz_eur`) ist intern belegt, aber laut Marketing-Gesamtkonzept (O-1) **noch nicht öffentlich freigegeben**. Fremde Anbieterpreise in diesem Dokument sind Marktbeobachtung, kein NeXify-Preisvorschlag.
- Methodenhinweis zu den Marktzahlen: Studien zur KI-Nutzung unterscheiden sich stark nach Definition (Größenklassen, „Nutzung" inkl. Pilot ja/nein, Mittelstand vs. alle Unternehmen). Deshalb stehen hier Spannen statt einer Einzelzahl.

---

## 1. Ideales Kundenprofil je Marke (AKP 1)

### 1.1 NeXify AI — Marktlage (belegt)

Die Nachfragegrundlage für eine Automatisierungsagentur im Mittelstand ist belegbar vorhanden und wächst, bei gleichzeitig niedriger Umsetzungsreife — genau die Lücke, die NeXify adressiert:

- **KI-Nutzung im deutschen Mittelstand liegt bei rund einem Drittel**, mit starkem Größeneffekt. DMB/Salesforce KI-Index Mittelstand 2025: 33,1 % der Unternehmen bis 500 Beschäftigte setzen KI ein, davon nur 9,5 % vollständig implementiert, 24 % in Test/Pilot, 43 % ohne konkrete Pläne [Q1]. Destatis IKT-Erhebung 2025 (zit. n. business.digital): 23 % bei kleinen, 36 % bei mittleren, 57 % bei großen Unternehmen [Q2]. ifo/Bitkom: 36–41 % ab 20 Beschäftigten [Q3].
- **Die Umsetzung hinkt der Absicht hinterher.** Laut FZI/Hochschule Karlsruhe haben nur 21 % der Unternehmen eine KI-Strategie [Q4]; laut einer über business.digital zitierten Angabe haben 81 % den KI-Return nie systematisch gemessen [Q2]. → NeXifys Versprechen „Kennzahl statt Versprechen" (Marketing-Gesamtkonzept MKT-002) trifft eine belegte Schwäche des Marktes.
- **Im Handwerk ist der Druck am höchsten, die Digitalisierung am niedrigsten.** Bitkom-Handwerksstudie 2025 (504 Betriebe): 83 % beklagen Azubimangel, 75 % Fachkräftemangel; die Betriebe benoten die eigene Digitalisierung im Schnitt mit „3"; 54 % stimmen zu, ohne digitale Technik im Wettbewerb um Fachkräfte zu verlieren. KI wird vor allem für Büroaufgaben gesehen (E-Mail, Angebotskalkulation, Rechnung) [Q5].
- **Benelux als Zweitmarkt** (NeXify sitzt in Venlo): In den Niederlanden nutzen laut CBS 2025 29,8 % des MKB (10–249) KI, aber nur 13,8 % der Microbedrijven (2–9) — gewachsen von 6,8 % (2023) über 10,6 % (2024). Microbetriebe setzen KI vor allem für Marketing/Verkauf (32,7 %) und Verwaltung (25,9 %) ein. Eurostat: NL 33,2 % vs. EU-Schnitt 20,0 % [Q6]. → Dasselbe Muster wie in DE: kleine Betriebe hängen zurück, Bedarf in Marketing/Verwaltung.

**Einordnung:** Hauptmarkt ist Deutschland (SOLL: `config/site-map.json#audience` — Geschäftsziel ~90 % DE, keine gemessene Zahl; `AGENTS.md`). Der Markt ist groß und unterdigitalisiert; NeXifys Engpass ist nicht die Nachfrage, sondern die fehlende öffentliche Referenzbreite (IST: Marketing-Gesamtkonzept, Abschnitt 3; TEILEKLAR und der eigene Auftritt dienen als Arbeitsprobe).

### 1.2 NeXify AI — die drei Zielsegmente

Abgeleitet aus `docs/01-konzept/NeXify-Marketingkonzept.md` (Abschnitt 4) und `docs/05-marketing/gesamtkonzept-2026-11-14.md` (Abschnitt 1), geschärft mit der Marktlage oben. Priorisiert nach belegter Nachfrage × Passung zur heutigen Belegbarkeit.

#### Segment NX-A · Inhabergeführtes Handwerk, Bau & Fertigung (Priorität 1)
- **Branche/Größe:** Handwerk, Bau, kleine Fertigung; 5–30 Mitarbeitende; DE (NRW), NL (Limburg), Benelux.
- **Entscheider:** Inhaber/Geschäftsführung in Personalunion — eine Person entscheidet, zahlt, nutzt.
- **Schmerzpunkt:** Anfragen, Termine, Angebote laufen per Hand; Büroarbeit frisst Feierabend; keine eigene IT. Belegt: Büroaufgaben (Angebotskalkulation, Rechnung, E-Mail) sind der genannte KI-Einsatzort im Handwerk [Q5]; Dokumentations-/Verwaltungslast ist der zeitraubendste Bereich [Q5].
- **Auslöser:** Fachkräftemangel zwingt zum Zeitgewinn im Büro [Q5]; Neugründung/Relaunch; eine liegengebliebene Anfrage, die Umsatz gekostet hat.
- **Budgetrahmen:** ANNAHME — projektbasiert im unteren vierstelligen Bereich, kein Abo-Appetit. Marktanker (fremde Anbieter, kein NeXify-Preis): KMU-Website bei Agenturen 1.500–8.000 € [Q11]; Automatisierungs-Piloten bei DACH-Agenturen ab ~990–1.900 € [Q7]. NeXify-Tagessatz 449 € netto intern belegt, öffentlich offen (O-1).
- **Wo erreichbar:** lokale/organische Suche (Stadt-/Branchenseiten), Handwerkskammer-Umfeld, Empfehlung, GEO (zitierfähige Faktenseiten). Nicht über Kaltakquise (Rechts-Gate, § 7 UWG).

#### Segment NX-B · Dienstleister, Handel & Organisationen mit „Vorgang zu groß fürs Postfach" (Priorität 1)
- **Branche/Größe:** Dienstleistung, Handel, Verwaltung, Bildungsträger/Organisationen; 5–80 Mitarbeitende.
- **Entscheider:** Geschäftsführung + eine koordinierende Rolle (Office-/Projektleitung).
- **Schmerzpunkt:** E-Mail-Flut, lange Angebotsdauer, „jeder fragt nach dem Stand, keiner weiß wo er steht" — Bedarf an Shop, Portal oder App statt Mail/Telefon/Listen (IST: gesamtkonzept-2026-11-14, Abschnitt 1).
- **Auslöser:** ein Prozess wächst über das Postfach hinaus; Relaunch; Kampagne steht an.
- **Budgetrahmen:** ANNAHME — mittleres vierstelliges Projektbudget plus laufende Betreuung (NeXify Care). Marktanker: individuelle Web-/Portalprojekte ab 8.000–12.000 € [Q11]; Komplett-Setup Automatisierung ab ~6.500 € [Q7].
- **Wo erreichbar:** organische Suche nach Vorgang/Lösung, LinkedIn (Pascal persönlich), Partner-/Empfehlungsnetz, Wissenshub-Artikel („Was kostet…", „Wann lohnt sich…").
- **Einordnung:** Einwand „zu groß für eine Person" ist belegbar entkräftbar über den eigenen Auftritt (43 Seiten, 4 Sprachen) und TEILEKLAR als Arbeitsprobe.

#### Segment NX-C · Technische Ansprechpersonen mit eigenem Produkt / API-Bedarf (Priorität 2)
- **Branche/Größe:** Softwarenahe KMU, Teams mit eigener Anwendung; Rolle: technische Leitung/Entwickler.
- **Schmerzpunkt:** KI einbinden ohne Abo-je-Platz und ohne Blackbox; klare Kosten je Nutzung; Datsenschutz/EU-Hosting. Belegt als Marktpräferenz: Self-Hosting/Eigentum an Workflows und Daten, offene Standards statt proprietärer Bindung werden in der Agenturlandschaft ausdrücklich nachgefragt [Q7].
- **Auslöser:** ein konkreter Anwendungsfall im eigenen Produkt.
- **Budgetrahmen:** nutzungsbasiert (NeXify API, Aufladung ab 10 €, Abo-Stufen im Entwurf; `config/api-prepaid.json`, intern belegt, öffentlich offen O-1). BYOK-Trennung ist Policy (`config/llm-policy.json#customer_byok`).
- **Wo erreichbar:** Produktseiten `/produkte/api`, `/produkte/skills-mcp`, technische Dokumentation, GEO/Entwickler-Suche.
- **Priorisierung:** kleineres, aber margenstarkes Segment; hohe Passung zum vorhandenen Stack (OpenRouter/DeepSeek, 9router, Composio). Nach A/B einzuordnen, weil die öffentliche API-Freigabe (Tarife) noch offen ist.

### 1.3 TEILEKLAR — Marktlage (belegt)

- **Großer, wachsender, fragmentierter Online-Markt.** Der europäische E-Commerce-Automotive-Aftermarket wird für 2025 auf ~21,09 Mrd. USD geschätzt (GM Insights) [Q8]. Marktführer Autodoc meldet 2025 ~1,8 Mrd. € Umsatz, 18,9 Mio. Bestellungen (+12,4 %), 72,5 Mio. verkaufte Artikel (+10,7 %), 9,3 Mio. aktive Kunden und ~9,2 % Marktanteil [Q8][Q9]. Die Top 5 (Autodoc, Amazon, eBay Motors, Delticom, LKQ/Euro Car Parts) halten zusammen nur 28,4 % — der Markt ist fragmentiert, Nischen sind besetzbar [Q8].
- **Der Kaufschmerz ist belegt die Passung.** HSN/TSN dient in Online-Katalogen nur als erster Filter und erfasst Ausstattungsunterschiede nicht; die Orientierung nur an Baujahr/Schlüsselnummer führt besonders häufig zu Fehlbestellungen, der häufigste Fehler ist schlicht das falsche Bauteil [Q10]. → TEILEKLARs Kernversprechen „Fahrzeug einmal auswählen, danach nur passende Teile" (IST: `docs/01-konzept/teileklar-shop.md`) adressiert genau diesen Schmerz.
- **Werkstattmarkt schrumpft und bleibt digital ausbaufähig.** Deutschland hat ~35.800–36.570 Kfz-Werkstätten, davon ~21.000–22.000 markenungebunden/frei (e-mobil BW, Basis 2021); prognostiziert werden bis 2030 ~−20 %, bis 2040 ~−40 % weniger freie Betriebe [Q12]. Das digitale Serviceangebot bleibt laut DEKRA/Ipsos hinter den Kundenerwartungen zurück [Q12]. → Raum für ein Vermittlungs-/Partnermodell, das Werkstätten Aufträge mit bereits geklärtem Fahrzeug- und Teilebezug bringt.

### 1.4 TEILEKLAR — die Zielsegmente

Abgeleitet aus `docs/01-konzept/teileklar-shop.md` und `gesamtkonzept-2026-11-14.md` (Abschnitt 1). Lieferländer (IST, `config/fakten.json#teileklar.lieferlaender`): DE, AT, NL, BE, LU.

#### Segment TK-1 · Selbstschrauber & kostenbewusste Halter (B2C, Priorität 1)
- **Wer:** Auto-/Motorradhalter, die selbst warten oder gezielt ein Teil/Zubehör kaufen; Preis- und passungsbewusst.
- **Schmerzpunkt:** Angst vor Fehlkauf („Passt das wirklich?") — belegt als häufigster Online-Kauf-Fehler [Q10].
- **Auslöser:** Wartung, Defekt, Saisonwechsel (Reifen, Batterie, Bremsen).
- **Budgetrahmen:** Einzelkauf, typisch zweistellig bis niedrig dreistellig; Versand vor Abschluss sichtbar (IST: Shop inkl. MwSt., Versandmatrix je Markt).
- **Wo erreichbar:** organische/lokale Suche nach Teil + Fahrzeug, Teilenummer, SEO-Zielseiten (3 interaktive Tools dreisprachig fertig, IST), Preisvergleich.
- **Abgrenzung/Handschrift:** Ehrlichkeit als Verkaufsargument — „ein Foto belegt keine Passung", Originalfotos des Lieferanten, Markenware statt No-Name (Bosch, ATE, Sachs, Febi, Mahle, Zimmermann, Hella, Valeo; IST).

#### Segment TK-2 · Freie Werkstätten als Partner (B2B2C, Priorität 1)
- **Wer:** markenungebundene Mehrmarken-Werkstätten; Inhaber/Werkstattleitung.
- **Schmerzpunkt:** Kunden bringen falsche Teile mit, Angaben fehlen, Rückfragen kosten Zeit; Auslastung und Neukunden aus der Umgebung gesucht.
- **Auslöser:** freie Kapazität, Nachfolge-/Wettbewerbsdruck in einem schrumpfenden Werkstattmarkt [Q12].
- **Budgetrahmen:** ANNAHME — Partnermodell (Auftragsvermittlung/Verzeichnis), keine öffentliche Kostenaussage (offen O-9). Vorhanden: Werkstattverzeichnis mit 6.875 Betrieben in 1.104 Orten (IST), Partner-werden-Strecke.
- **Wo erreichbar:** Werkstattverzeichnis, lokale Suche, Partner-Formular, Fachumfeld.

#### Segment TK-3 · Zubehörkäufer & Saisonbedarf (B2C, Priorität 2)
- **Wer:** Halter mit Zubehör-/Komfortbedarf (Pflege, Transport, Saison) ohne tiefes Teilewissen.
- **Schmerzpunkt:** Orientierung im Sortiment, Vertrauen in Angaben; kein Werkstattkontext.
- **Budgetrahmen:** Einzelkauf, impulsnäher als TK-1.
- **Wo erreichbar:** Kategorie-/Stöberseiten, SEO, saisonale Inhalte.
- **Priorisierung:** nach TK-1/TK-2, weil Katalog-/Bestands-/Preisanbindung noch am Lieferantenvertrag hängt (IST: BigBuy im Lösungsregister; Anbindung offen).

---

## 2. Wettbewerb und Abgrenzung (AKP 2)

### 2.1 NeXify AI — Wettbewerb

Die Suche nach „KI-/Automatisierungsagentur" liefert überwiegend Selbstdarstellungen; Preis-/Leistungsangaben stammen von den Anbietern selbst [Q7]. Vier relevante Wettbewerbstypen:

| # | Wettbewerber / Alternative | Was sie tun | Beleg |
|---|---|---|---|
| 1 | **DACH-n8n/Make-Automatisierungsagenturen** (z. B. Sanetech Berlin, FullCircle Köln, DARE Koblenz, Webmaster Studios, ki-agentur.io, Automated KI-Agentur) | Workflow-/KI-Automatisierung für KMU; teils Festpreis (ab ~990 €), Piloten ab ~1.900 €, Setups ab ~6.500 €, Betrieb ab ~190 €/Mon.; DSGVO/EU-Hosting, „Workflows gehören dem Kunden" | [Q7] |
| 2 | **No-/Low-Code-Plattformen in Eigenregie** (Make, Zapier, n8n) | Kunde baut selbst; Make ab ~9 €/Mon., n8n self-hosted kostenlos, Zapier einfach aber teuer/limitiert | [Q7] |
| 3 | **Klassische Web-/Software-Agenturen & Freelancer** | Website/Shop/Portal als Projekt; KMU-Website 1.500–8.000 €, Freelancer 20–40 % darunter, Individualprojekte ab 8.000–12.000 € | [Q11] |
| 4 | **Generische KI-Assistenten / SaaS-Bordmittel** (ChatGPT & Co., Branchen-SaaS) | Allzweck-Hilfe ohne Integration in den konkreten Betriebsprozess | ANNAHME (Marktbeobachtung, kein Einzelbeleg) |

**Abgrenzung NeXify (die „Handschrift": hochwertig, locker, klar, vertrauensvoll):**
- **Ein Mensch verantwortet, ein Agententeam arbeitet aus** (AI-FACTORY-Modell, D-011) — gegen anonyme Agentur und gegen reines Tool. Belegbar über den eigenen Auftritt und TEILEKLAR, nicht über (fehlende) Kundenlogos.
- **Bauen *und* betreiben** (NeXify Care) statt Demo/Projektübergabe ohne Betrieb — passt zur belegten Marktschwäche „81 % messen den KI-Return nicht" [Q2].
- **Eigentum an Code/Daten beim Kunden, EU-Hosting, KI als KI gekennzeichnet** — trifft die in NL belegte Datenschutz-Hürde [Q6] und die Nachfrage nach offenen Standards [Q7].
- **Kein Abo-Zwang, Umfang vor dem Start bekannt** — gegen Baukasten-/Abo-Modelle.
- **Ehrlichkeit als Prinzip:** keine erfundenen Referenzen/Zahlen (Marketing-Gesamtkonzept, Abschnitt 3) — Differenzierung gegenüber superlativlastigen Wettbewerbsseiten.
- **Grenze (offen, nicht behaupten):** keine gemessene Kosten-/Zeitersparnis, keine Kundenreferenzen freigegeben (O-2), Preise öffentlich offen (O-1). Diese Lücken sind die wichtigsten fehlenden Belege — siehe Abschnitt 3.

### 2.2 TEILEKLAR — Wettbewerb

| # | Wettbewerber / Alternative | Was sie tun | Beleg |
|---|---|---|---|
| 1 | **Autodoc** | Europäischer Marktführer Online-Kfz-Teile; ~1,8 Mrd. € Umsatz 2025, ~9,2 % Marktanteil, breiter Katalog, eigene Fitment-Filter per HSN/TSN | [Q8][Q9] |
| 2 | **kfzteile24** | Drittplatziert im deutschen Teilesegment; Online + eigene Filialen | [Q8] |
| 3 | **Marktplätze Amazon & eBay Motors** | Reichweite/Preis, aber schwache fahrzeuggenaue Passung, kein Werkstattbezug | [Q8] |
| 4 | **Delticom / weitere Spezialisten, LKQ/Euro Car Parts** | Reifen-/Teilespezialisten bzw. Großhandel mit Online-Angebot | [Q8] |
| 5 | **Preis-/Katalogshops** (z. B. autoteiledirekt, euautoteile, pkwteile-Typ) | breiter Katalog, Fahrzeugauswahl, 14-Tage-Rückgabe üblich | [Q10] |
| 6 | **Lokale Teilehändler & Werkstatt-Direktbezug** | persönlich/schnell vor Ort, aber ohne dreisprachige Online-Passung | [Q12] |

**Abgrenzung TEILEKLAR (Handschrift: klar, vertrauensvoll, alltagsnah, du-Ansprache):**
- **Passung vor Verkauf, ehrlich kommuniziert:** „Fahrzeug einmal wählen, dann nur passende Teile" plus der klare Satz „ein Foto belegt keine Passung" — direkte Antwort auf den belegten häufigsten Fehlkauf [Q10]. Grenze: es gibt **keine** automatische Prüfung gegen einen Fahrzeugkatalog (IST: O-9/`FitmentChecklist.tsx`) — darf nicht als „geprüfte Passung" behauptet werden.
- **Teile *und* Werkstattvermittlung in einem** (6.875 Betriebe, 1.104 Orte) — ein B2B2C-Baustein, den die reinen Teileshops nicht bieten; trifft den schrumpfenden, digital ausbaufähigen Werkstattmarkt [Q12].
- **Markenware statt No-Name**, Originalfotos, Preise inkl. MwSt., Versand vor Abschluss sichtbar — Vertrauen gegen Marktplatz-Beliebigkeit.
- **Lokalisierung auf 7 Marktversionen / 3 Sprachen** mit korrekten Steuer-/Versand-/Lieferzeitangaben je Markt — Vorteil gegenüber generischen DE-Shops im Benelux-Raum.
- **Grenze (offen, nicht behaupten):** Shop-Betrieb in Produktion antwortet derzeit nicht zuverlässig; Terminbuchung, Gutscheine, Batterie-Berater „noch nicht" verfügbar (IST: AGENTS.md 13.11.2026; O-9). Katalog-/Preisanbindung hängt am Lieferantenvertrag.
