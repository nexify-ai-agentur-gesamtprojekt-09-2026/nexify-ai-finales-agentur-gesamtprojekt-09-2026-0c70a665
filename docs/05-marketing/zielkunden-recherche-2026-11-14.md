# Zielkunden- und Marktrecherche · NeXify AI und TEILEKLAR · 14.11.2026

**Status:** Arbeitsfassung zur Entscheidung durch den Inhaber Pascal Courbois. Stand 22.11.2026: nach den Review-Befunden (Codex/Copilot/Vercel) ehrlichkeits- und belegbarkeitskonform überarbeitet — über-behauptete IST-Zustände auf SOLL/Prototyp bzw. Lösungsregister-Status zurückgeführt, Preiszahlen aus den NeXify-Budgetbullets entfernt.
**Zweck:** Belegte Zielkunden- und Marktgrundlage für das Meeting am 15.11.2026, 14:00 Europe/Amsterdam, aus der eine priorisierte Angebots- und Library-Roadmap folgt. Abschnitt 3 ist die Zuarbeit für ein geplantes Schwesterdokument `docs/01-konzept/library-erweiterung-2026-11-14.md` (von der Schwestersitzung noch anzulegen; zum Stand dieses Dokuments nicht im Repository) und über die IDs `LIB-NX-*` / `LIB-TK-*` referenzierbar.
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
- **Handwerk: hoher Personaldruck bei mittlerer Digitalisierung** (branchenintern beschrieben, kein Quervergleich zu anderen Branchen). Bitkom-Handwerksstudie 2025 (504 Betriebe): 83 % beklagen Azubimangel, 75 % Fachkräftemangel; die Betriebe benoten die eigene Digitalisierung im Schnitt mit „3"; 54 % stimmen zu, ohne digitale Technik im Wettbewerb um Fachkräfte zu verlieren. KI wird vor allem für Büroaufgaben gesehen (E-Mail, Angebotskalkulation, Rechnung) [Q5]. ANNAHME: dass gerade das Handwerk den höchsten Druck bzw. die niedrigste Reife unter allen Branchen hat, ist nicht quervergleichend belegt.
- **Benelux als Zweitmarkt** (NeXify sitzt in Venlo): In den Niederlanden nutzen laut CBS 2025 29,8 % des MKB (10–249) KI, aber nur 13,8 % der Microbedrijven (2–9) — gewachsen von 6,8 % (2023) über 10,6 % (2024). Microbetriebe setzen KI vor allem für Marketing/Verkauf (32,7 %) und Verwaltung (25,9 %) ein. Eurostat: NL 33,2 % vs. EU-Schnitt 20,0 % [Q6]. → Dasselbe Muster wie in DE: kleine Betriebe hängen zurück, Bedarf in Marketing/Verwaltung.

**Einordnung:** Hauptmarkt ist Deutschland (SOLL: `config/site-map.json#audience` — Geschäftsziel ~90 % DE, keine gemessene Zahl; `AGENTS.md`). Der Markt ist groß und unterdigitalisiert; NeXifys Engpass ist nicht die Nachfrage, sondern die fehlende öffentliche Referenzbreite (IST: Marketing-Gesamtkonzept, Abschnitt 3; TEILEKLAR und der eigene Auftritt dienen als Arbeitsprobe).

### 1.2 NeXify AI — die drei Zielsegmente

Abgeleitet aus `docs/01-konzept/NeXify-Marketingkonzept.md` (Abschnitt 4) und `docs/05-marketing/gesamtkonzept-2026-11-14.md` (Abschnitt 1), geschärft mit der Marktlage oben. Priorisiert nach belegter Nachfrage × Passung zur heutigen Belegbarkeit.

#### Segment NX-A · Inhabergeführtes Handwerk, Bau & Fertigung (Priorität 1)
- **Branche/Größe:** Handwerk, Bau, kleine Fertigung; 5–30 Mitarbeitende; DE (NRW), NL (Limburg), Benelux.
- **Entscheider:** Inhaber/Geschäftsführung in Personalunion — eine Person entscheidet, zahlt, nutzt.
- **Schmerzpunkt:** Anfragen, Termine, Angebote laufen per Hand; Büroarbeit frisst Feierabend; keine eigene IT. Belegt: Büroaufgaben (Angebotskalkulation, Rechnung, E-Mail) sind der genannte KI-Einsatzort im Handwerk [Q5]; Dokumentations-/Verwaltungslast ist der zeitraubendste Bereich [Q5].
- **Auslöser:** Fachkräftemangel zwingt zum Zeitgewinn im Büro [Q5]; Neugründung/Relaunch; eine liegengebliebene Anfrage, die Umsatz gekostet hat.
- **Budgetrahmen:** ANNAHME — projektbasiert, kein Abo-Appetit. Konkrete Wettbewerbspreise stehen als Marktbeobachtung in Abschnitt 2.1 (fremde Anbieter, kein NeXify-Preis, nicht in Angebote übernehmen). NeXify-Tagessatz 449 € netto ist intern belegt (`config/fakten.json`), öffentlich offen (O-1).
- **Wo erreichbar:** lokale/organische Suche (Stadt-/Branchenseiten), Handwerkskammer-Umfeld, Empfehlung, GEO (zitierfähige Faktenseiten). Nicht über Kaltakquise (Rechts-Gate, § 7 UWG).

#### Segment NX-B · Dienstleister, Handel & Organisationen mit „Vorgang zu groß fürs Postfach" (Priorität 1)
- **Branche/Größe:** Dienstleistung, Handel, Verwaltung, Bildungsträger/Organisationen; 5–80 Mitarbeitende.
- **Entscheider:** Geschäftsführung + eine koordinierende Rolle (Office-/Projektleitung).
- **Schmerzpunkt:** E-Mail-Flut, lange Angebotsdauer, „jeder fragt nach dem Stand, keiner weiß wo er steht" — Bedarf an Shop, Portal oder App statt Mail/Telefon/Listen (IST: gesamtkonzept-2026-11-14, Abschnitt 1).
- **Auslöser:** ein Prozess wächst über das Postfach hinaus; Relaunch; Kampagne steht an.
- **Budgetrahmen:** ANNAHME — Projektbudget plus laufende Betreuung (NeXify Care), ohne freigegebenen NeXify-Preis. Größenordnung vergleichbarer Wettbewerbsangebote: siehe Abschnitt 2.1 (externe Marktbeobachtung, kein NeXify-Preis).
- **Wo erreichbar:** organische Suche nach Vorgang/Lösung, LinkedIn (Pascal persönlich), Partner-/Empfehlungsnetz, Wissenshub-Artikel („Was kostet…", „Wann lohnt sich…").
- **Einordnung:** Einwand „zu groß für eine Person" ist belegbar entkräftbar über den eigenen Auftritt (43 Seiten, 4 Sprachen) und TEILEKLAR als Arbeitsprobe.

#### Segment NX-C · Technische Ansprechpersonen mit eigenem Produkt / API-Bedarf (Priorität 2)
- **Branche/Größe:** Softwarenahe KMU, Teams mit eigener Anwendung; Rolle: technische Leitung/Entwickler.
- **Schmerzpunkt:** KI einbinden ohne Abo-je-Platz und ohne Blackbox; klare Kosten je Nutzung; Datenschutz/EU-Hosting. Belegt als Marktpräferenz: Self-Hosting/Eigentum an Workflows und Daten, offene Standards statt proprietärer Bindung werden in der Agenturlandschaft ausdrücklich nachgefragt [Q7].
- **Auslöser:** ein konkreter Anwendungsfall im eigenen Produkt.
- **Budgetrahmen:** nutzungsbasiert (NeXify API, Aufladung ab 10 €, Abo-Stufen im Entwurf; `config/api-prepaid.json`, intern belegt, öffentlich offen O-1). BYOK-Trennung ist Policy (`config/llm-policy.json#customer_byok`).
- **Wo erreichbar:** Produktseiten `/produkte/api`, `/produkte/skills-mcp`, technische Dokumentation, GEO/Entwickler-Suche.
- **Priorisierung:** kleineres, aber margenstarkes Segment; Passung zu registrierten Stack-Teilen (OpenRouter/DeepSeek, 9router, Composio — im Lösungsregister teils „läuft unbelegt", Betriebsstand vor Zusage prüfen). Nach A/B einzuordnen, weil die öffentliche API-Freigabe (Tarife) noch offen ist.

### 1.3 TEILEKLAR — Marktlage (belegt)

- **Großer, wachsender, fragmentierter Online-Markt.** Der europäische E-Commerce-Automotive-Aftermarket wird für 2025 auf ~21,09 Mrd. USD geschätzt (GM Insights) [Q8]. Marktführer Autodoc meldet 2025 ~1,8 Mrd. € Umsatz, 18,9 Mio. Bestellungen (+12,4 %), 72,5 Mio. verkaufte Artikel (+10,7 %), 9,3 Mio. aktive Kunden und ~9,2 % Marktanteil [Q8][Q9]. Die Top 5 (Autodoc, Amazon, eBay Motors, Delticom, LKQ/Euro Car Parts) halten zusammen nur 28,4 % — der Markt ist fragmentiert, Nischen sind besetzbar [Q8].
- **Der belegte Kaufschmerz ist die Passung.** HSN/TSN dient in Online-Katalogen nur als erster Filter und erfasst Ausstattungsunterschiede nicht; die Orientierung nur an Baujahr/Schlüsselnummer führt besonders häufig zu Fehlbestellungen [Q10]. → TEILEKLARs Konzept-Kernversprechen „Fahrzeug einmal auswählen, danach nur passende Teile" (SOLL laut `docs/01-konzept/teileklar-shop.md`) adressiert diesen Schmerz; heute existiert dafür nur eine manuelle Checkliste ohne Fahrzeugkatalogabgleich (IST: `FitmentChecklist.tsx`, O-9), kein automatisches „nur passend".
- **Werkstattmarkt schrumpft und bleibt digital ausbaufähig.** Deutschland hat ~35.800–36.570 Kfz-Werkstätten, davon ~21.000–22.000 markenungebunden/frei (e-mobil BW, Basis 2021); prognostiziert werden bis 2030 ~−20 %, bis 2040 ~−40 % weniger freie Betriebe [Q12]. Das digitale Serviceangebot bleibt laut DEKRA/Ipsos hinter den Kundenerwartungen zurück [Q12]. → Raum für ein Vermittlungs-/Partnermodell, das Werkstätten Aufträge mit bereits geklärtem Fahrzeug- und Teilebezug bringt.

### 1.4 TEILEKLAR — die Zielsegmente

Abgeleitet aus `docs/01-konzept/teileklar-shop.md` und `gesamtkonzept-2026-11-14.md` (Abschnitt 1). Lieferländer (IST, `config/fakten.json#teileklar.lieferlaender`): DE, AT, NL, BE, LU.

#### Segment TK-1 · Selbstschrauber & kostenbewusste Halter (B2C, Priorität 1)
- **Wer:** Auto-/Motorradhalter, die selbst warten oder gezielt ein Teil/Zubehör kaufen; Preis- und passungsbewusst.
- **Schmerzpunkt:** Angst vor Fehlkauf („Passt das wirklich?") — belegt als häufigster Online-Kauf-Fehler [Q10].
- **Auslöser:** Wartung, Defekt, Saisonwechsel (Reifen, Batterie, Bremsen).
- **Budgetrahmen:** Einzelkauf, typisch zweistellig bis niedrig dreistellig; Versand vor Abschluss sichtbar (IST: Shop inkl. MwSt., Versandmatrix je Markt).
- **Wo erreichbar:** organische/lokale Suche nach Teil + Fahrzeug, Teilenummer, SEO-/Prüfhilfe-Zielseiten (vorhanden: Passungs-Checkliste und Reifenrechner; Batterie-Berater noch nicht verfügbar — `PhaseNotice.tsx`), Preisvergleich. Die ausgelieferte `/teileklar`-Oberfläche ist derzeit deutschsprachig (IST: `apps/web/proxy.ts`); Dreisprachigkeit ist Konzept/Prototyp, nicht ausgeliefert.
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
- **Priorisierung:** nach TK-1/TK-2, weil Katalog-/Bestands-/Preisanbindung noch am Lieferantenvertrag hängt (BigBuy ist im Lösungsregister als „defekt" geführt; Anbindung offen).

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

*Die Euro-Angaben in dieser Tabelle sind von den Anbietern selbst genannte Wettbewerbspreise (Stand Recherche, [Q7]/[Q11]), keine NeXify-Preise. Sie dienen der Markteinordnung und dürfen nicht in NeXify-Angebote oder die kanonische Preis-Konfiguration übernommen werden (AGENTS.md: Preiszahlen nur aus `config/fakten.json`).*

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
| 6 | **Lokale Teilehändler & Werkstatt-Direktbezug** | persönlich/schnell vor Ort, aber ohne strukturierte Online-Passungshilfe | [Q12] |

**Abgrenzung TEILEKLAR (Handschrift: klar, vertrauensvoll, alltagsnah; Sie-Form, aber kürzer und alltagsnah — `gesamtkonzept-2026-11-14.md` §5):**
- **Passung vor Verkauf, ehrlich kommuniziert:** heute eine manuelle Prüf-Checkliste plus der klare Satz „ein Foto belegt keine Passung" — eine ehrliche Hilfe gegen den belegten häufigsten Fehlkauf [Q10]. Grenze: es gibt **keine** automatische Prüfung gegen einen Fahrzeugkatalog (IST: `FitmentChecklist.tsx`, O-9); „Fahrzeug wählen, dann nur passende Teile" ist künftiges SOLL und darf nicht als vorhandene Funktion oder „geprüfte Passung" behauptet werden.
- **Teile *und* eigenes lokales Werkstattverzeichnis in einem** (6.875 Verzeichnis-Einträge in 1.104 Orten) — trifft den schrumpfenden, digital ausbaufähigen Werkstattmarkt [Q12]. Wichtig: Das sind Verzeichnis-Einträge, **keine** Vertragspartner und **keine** belegte Auftragsvermittlung — im Shop sind alle Einträge `partner: false` (IST: `workshops_api.py`), Terminanfragen gehen heute an den Kunden, nicht an die Werkstatt. Das Partner-/Vermittlungsmodell ist geplant (SOLL), nicht in Betrieb. Keine Alleinstellung: auch große Shops/Marktplätze vermitteln Montage (z. B. eBay mit Partnern ATU/Euromaster [Q13]). TEILEKLARs Unterschied ist die geplante Kombination aus Teilekauf, eigenem ortsbezogenem Verzeichnis und ehrlicher Passungsansage. **ANNAHME**: Tiefe und Monetarisierung des Vermittlungsmodells offen (O-9).
- **Markenware statt No-Name**, Originalfotos, Preise inkl. MwSt., Versand vor Abschluss sichtbar — Vertrauen gegen Marktplatz-Beliebigkeit.
- **Sieben Marktversionen / drei Sprachen als Konzept/Prototyp** mit Steuer-/Versand-/Lieferzeitangaben je Markt — potenzieller Vorteil im Benelux-Raum, aber **noch nicht ausgeliefert**: die Produktions-`/teileklar`-Oberfläche ist derzeit deutschsprachig (IST: `apps/web/proxy.ts`; `PROGRESS.md`: Shop bleibt deutsch, NL/FR/EN-Wörterbücher fehlen). Als SOLL führen, nicht als vorhandener Vorteil.
- **Grenze (offen, nicht behaupten):** Shop-Betrieb in Produktion antwortet derzeit nicht zuverlässig; Terminbuchung, Gutscheine, Batterie-Berater „noch nicht" verfügbar (IST: AGENTS.md 13.11.2026; O-9). Katalog-/Preisanbindung hängt am Lieferantenvertrag.

---

## 3. Bedarf an Library-Bausteinen — priorisierte Roadmap (AKP 3)

Dies ist die **Zuarbeit für das geplante Schwesterdokument `docs/01-konzept/library-erweiterung-2026-11-14.md`** (von der Schwestersitzung noch anzulegen; zum Stand dieses Dokuments nicht im Repository). Jeder Punkt hat eine stabile ID, einen Zielsegment-Bezug und eine Wirkung-×-Aufwand-Einordnung und ist von dort referenzierbar, sobald es existiert.

**Grundlage: was registriert ist — mit Betriebsstand (nicht neu bauen, aber auch nicht als betriebsbereit voraussetzen).** Aus `config/loesungsregister.json` (Stand 14.11.2026), nach Status getrennt:
- **Betriebsbereit belegt:** CRM (HubSpot), Transaktionsmail (Resend).
- **Registriert, aber „läuft unbelegt" (vor Zusage Betrieb prüfen):** Social-Planung (Postiz), Automatisierung (n8n — zudem in keinem führenden Dokument genannt, keine belegte Instanz), Integrationen/MCP (Composio Platform), LLM-Weg (OpenRouter/DeepSeek, Cloudflare AI Gateway), Datenhaltung (Supabase/Postgres), Zahlung (Revolut).
- **Defekt:** Teile-Großhandel (BigBuy), Gedächtnis (Cognee).

Registriert heißt nicht betriebsbereit. Die Bausteine unten **nutzen** vorhandene Lösungen, wo belegt, und führen unbelegte/defekte Dienste als Abhängigkeit mit Funktionsnachweis, nicht als fertige Grundlage.

**Bewertungslegende:** Wirkung = Beitrag zu Lead/Umsatz/Abschluss; Aufwand = Umsetzungslast; Priorität = Wirkung ÷ Aufwand unter Beachtung der heutigen Belege/Sperren.

### 3.1 NeXify AI — Bausteine

| ID | Baustein (Typ) | Zielsegment | Warum (belegte Begründung) | Wirkung | Aufwand | Priorität |
|---|---|---|---|---|---|---|
| **LIB-NX-01** | **Angebotspaket „KI-/Prozess-Audit, 1 Tag, schriftliches Ergebnis"** als Einstiegsprodukt | NX-A, NX-B | Niedrigschwelliger Einstieg; adressiert „81 % messen KI-Return nicht" [Q2] mit einer Vorher-/Nachher-Kennzahl. Im Marketingkonzept bereits als Einstiegsprodukt vorgesehen (MKT-002 §5). | Hoch | Niedrig | **1** |
| **LIB-NX-02** | **Blaupause „Angebots-/Anfrage-Automatisierung Handwerk"** (Anfrage→Angebot), werkzeugoffen | NX-A | Büroaufgaben (Angebotskalkulation, E-Mail) sind der belegte KI-Einsatzort im Handwerk [Q5]. Ohne feste n8n-Abhängigkeit planen (n8n „läuft unbelegt", keine belegte Instanz); Ablaufweg über Hermes (D-019) erst nach Funktionsnachweis. | Hoch | Mittel | **1** |
| **LIB-NX-03** | **Branchen-/Stadt-Zielseiten-Baukasten** (SEO/GEO, zitierfähige Faktenblöcke) | NX-A, NX-B | Markt groß und unterdigitalisiert [Q1][Q2]. ANNAHME „Finden" sei der Engpass: nicht gemessen (Analytics aus, Seite noindex); Wirkung erst nach Indexierungs-Freigabe. Baut auf Klon-Fabrik/`site-map.json`. | Hoch (ANNAHME) | Mittel | **1** |
| **LIB-NX-04** | **Belegte Fallkarten / Arbeitsproben-Baustein** („drei Zahlen", anonymisiert) | alle NX | Fehlende Referenzbreite ist die Kernschwäche (Abschnitt 3 Marketing-Gesamtkonzept; O-2). Eigener Auftritt + TEILEKLAR als Arbeitsprobe. | Hoch | Niedrig | **1** |
| **LIB-NX-05** | **Portal-/App-Blaupause** („ein Ort statt Postfach/Listen") | NX-B | Belegter Schmerz „keiner weiß, wo der Vorgang steht"; TEILEKLAR-Portale als Vorlage. | Mittel | Hoch | 2 |
| **LIB-NX-06** | **API-/BYOK-Schnellstart + Skills/MCP-Katalog** (Doku, Beispiel-Integrationen) | NX-C | Nachfrage nach Eigentum/offenen Standards/klaren Nutzungskosten [Q7]; nutzt Composio + llm-policy BYOK. | Mittel | Mittel | 2 |
| **LIB-NX-07** | **NeXify-Care-Betriebspaket** (Monitoring/Tagesbericht, definierter Umfang) | NX-A, NX-B | Differenzierer „bauen UND betreiben"; nutzt Sentry/PostHog/Monitoring. Preis offen (O-1). | Mittel | Mittel | 2 |
| **LIB-NX-08** | **Wissenshub-Inhaltsserie** („Was kostet…", „Wann lohnt sich…", „Wie lange dauert…") | NX-A, NX-B | GEO/Vertrauen; beantwortet reale Kaufvorfragen; speist LinkedIn-Rhythmus. | Mittel | Niedrig | 2 |
| **LIB-NX-09** | **Mehrsprach-Paket NL/FR** für Benelux-Marktseiten | NX-A, NX-B | NL-MKB-Nachfrage belegt (Marketing/Verwaltung) [Q6]; Standort Venlo. Muttersprachliche Prüfung offen (O-12). | Mittel | Mittel | 3 |

### 3.2 TEILEKLAR — Bausteine

| ID | Baustein (Typ) | Zielsegment | Warum (belegte Begründung) | Wirkung | Aufwand | Priorität |
|---|---|---|---|---|---|---|
| **LIB-TK-01** | **Fahrzeug-Passungs-Assistent** (ehrliche Checkliste → später Katalogabgleich) | TK-1 | Fehlkauf durch unzureichende HSN/TSN-Filterung ist belegter Hauptschmerz [Q10]. Grenze: keine automatische Katalogprüfung behaupten (O-9). | Hoch | Hoch | **1** |
| **LIB-TK-02** | **Teilenummer-/Suche-Zielseiten-Paket** (SEO; Dreisprachigkeit ist SOLL, heute nur DE ausgeliefert) | TK-1, TK-3 | Teilenummer ist der sicherste Suchweg [Q10]. Vorhanden sind zwei Prüfhilfen (Checkliste, Reifenrechner); Batterie-Berater fehlt; NL/FR/EN nicht ausgeliefert → Aufwand höher als „nur ausbauen". Wirkung erst nach Indexierungs-Freigabe. | Hoch | Mittel–Hoch | **1** |
| **LIB-TK-03** | **Werkstatt-Partner-Onboarding-Baustein** (Auftrag mit Fahrzeug-/Teilebezug) | TK-2 | Schrumpfender, digital ausbaufähiger Werkstattmarkt [Q12]; Verzeichnis (6.875 Betriebe) vorhanden. | Hoch | Mittel | **1** |
| **LIB-TK-04** | **Lokale Werkstatt-/Umkreis-Suche** (Entfernung, Termin-Anfrage) | TK-1, TK-2 | Verbindet B2C-Teilekauf mit B2B-Vermittlung; Online-Terminbuchung heute „noch nicht" (O-9). | Mittel | Mittel | 2 |
| **LIB-TK-05** | **Katalog-/Bestands-/Preis-Anbindung** (BigBuy) als wiederverwendbarer Baustein | TK-1, TK-3 | Sortimentstiefe gegen fragmentierten Wettbewerb [Q8]; hängt am Lieferantenvertrag (IST). | Hoch | Hoch | 2 |
| **LIB-TK-06** | **Vertrauens-/Markenware-Content-Baustein** (Hersteller als Belege) | TK-1, TK-3 | Markenware statt No-Name als Abgrenzung zu Marktplätzen [Q8]. Logo-Nutzungsrechte sind **offen** (Beschaffungsauftrag `docs/06-auftraege/herstellerlogos.md`, Stand 31.08.2026; Logos teils „zur-freigabe", kein fertiges Rechte-Manifest) → Baustein plant die Rechteklärung je Marke ein, nutzt Logos nicht als fertigen Beleg. | Mittel | Niedrig–Mittel | 2 |
| **LIB-TK-07** | **Saison-/Zubehör-Kampagnenvorlagen** (Reifen, Batterie, Pflege), werkzeugoffen | TK-3 | Saisonauslöser belegt im Kaufverhalten [Q10]. Vorlagen unabhängig vom Werkzeug planen; Postiz erst nach Rollenklärung, Zugangserneuerung und Betriebsnachweis („läuft unbelegt"). | Mittel | Niedrig | 3 |

### 3.3 Die drei wichtigsten Roadmap-Punkte (Meeting-Empfehlung)

1. **LIB-NX-01 + LIB-NX-04 (Audit-Einstieg + belegte Arbeitsproben):** schließen zugleich den Einstiegs- und den Referenz-Engpass von NeXify — höchste Wirkung bei geringem Aufwand, ohne offene Freigaben zu berühren.
2. **LIB-NX-03 (Branchen-/Stadt-Zielseiten, SEO/GEO):** adressiert den belegten „Finden"-Engpass in einem großen, unterdigitalisierten Markt [Q1][Q2]; Fundament für alle Leadwege.
3. **LIB-TK-01 + LIB-TK-03 (Passungs-Assistent + Werkstatt-Partner):** TEILEKLARs zwei belegbar nachgefragte Hebel (Fehlkauf-Schmerz [Q10], schrumpfender Werkstattmarkt [Q12]). Beide sind heute SOLL (Checkliste statt Katalogabgleich; Verzeichnis statt Vermittlung) — die Abgrenzung entsteht erst mit dem Bau, nicht durch Exklusivität (auch Marktplätze vermitteln Montage [Q13]).

**Abhängigkeiten/Sperren, die die Reihenfolge beeinflussen:** Preisfreigabe (O-1) begrenzt NX-Angebotskommunikation; Referenzfreigabe (O-2) begrenzt LIB-NX-04-Inhalte; Shop-Betrieb/Lieferantenvertrag (BigBuy „defekt") begrenzen LIB-TK-01/05. **Indexierung ist abgeschaltet** (`noindex, nofollow`, AGENTS.md) und braucht eine gesonderte Inhaberfreigabe plus TEILEKLAR-Schalter (`apps/web/auth/indexing.ts`) — ohne sie wirken die Suchkanäle von LIB-NX-03 und LIB-TK-02 nicht; die Vorbereitung ist davon getrennt möglich. Registrierte, aber „läuft unbelegt"/„defekt" geführte Dienste (n8n, Postiz, BigBuy, Cognee, …) sind je Baustein als Funktionsnachweis-Abhängigkeit zu führen. Alles Inhaber-/Betriebsentscheidungen, keine Bau-Blocker für die Vorbereitung.

---

## 4. Botschaften je Zielsegment (AKP 4)

Im Ton der jeweiligen Marke (NeXify siezt, sachlich-ruhig, keine Superlative/Garantien; TEILEKLAR siezt ebenfalls, aber kürzer und alltagsnah — `gesamtkonzept-2026-11-14.md` §5). **Keine fertigen Rechtstexte, keine Preisversprechen, keine Antwortzeit-Zusagen.** Kanal je Botschaft aus dem Marketing-Gesamtkonzept abgeleitet.

### 4.1 NeXify AI

| Segment | Kernbotschaft(en) | Passender Kanal |
|---|---|---|
| **NX-A Handwerk/Bau/Fertigung** | 1) „Die Büroarbeit, die Sie jeden Abend kostet, übernimmt ein Ablauf — Sie behalten die Entscheidung." 2) „Fangen wir bei der Stelle an, an der es hakt: ein Tag, ein schriftliches Ergebnis." | Lokale/organische Suche (Stadt-/Branchenseiten, LIB-NX-03), GEO-Faktenblöcke, Empfehlung. Kein Kaltakquise-Versand. |
| **NX-B Dienstleister/Handel/Organisationen** | 1) „Ein Ort für den Vorgang statt Postfach, Telefon und Liste." 2) „Sie kennen den Umfang vor dem Start — ein Ansprechpartner statt drei Dienstleister." | Organische Suche nach Vorgang/Lösung, LinkedIn (Pascal persönlich, Vorher/Nachher ohne unbelegte Zahl), Wissenshub (LIB-NX-08). |
| **NX-C technische Ansprechpersonen / API** | 1) „KI in Ihrer Anwendung — abgerechnet nach Nutzung, Daten und Code bleiben bei Ihnen." 2) „Kein Abo je Platz, keine Blackbox: eigene Schlüssel, klare Kosten je Aufruf." | Produktseiten `/produkte/api` & `/produkte/skills-mcp`, technische Doku, Entwickler-/GEO-Suche. |

Dach über allen: **„Ein Gespräch. Ein Projekt, das passt."** (Leitbotschaft, PR 119 / gesamtkonzept-2026-11-14 Abschnitt 4.)

### 4.2 TEILEKLAR

| Segment | Kernbotschaft(en) | Passender Kanal |
|---|---|---|
| **TK-1 Selbstschrauber/Halter** | 1) „Ihr Fahrzeug im Blick — wir helfen Ihnen, die Passung zu prüfen, bevor Sie kaufen." (kein Versprechen automatisch nur passender Treffer; heute Checkliste ohne Fahrzeugkatalogabgleich, O-9) 2) „Ehrlich bleibt ehrlich: Ein Foto belegt keine Passung. So prüfen Sie es selbst." | Organische/lokale Suche nach Teil + Fahrzeug, Teilenummer-Zielseiten (LIB-TK-02), Passungsseite. |
| **TK-2 freie Werkstätten** | 1) „Zeigen Sie Interesse am geplanten Partnermodell — Aufträge mit geklärtem Fahrzeug- und Teilebezug sind das Ziel (noch nicht in Betrieb)." 2) „Kunden aus Ihrer Umgebung finden Sie — ohne Rückfrage-Pingpong." | Werkstattverzeichnis, lokale Suche, Partner-Formular (LIB-TK-03/04), Fachumfeld. |
| **TK-3 Zubehör-/Saisonkäufer** | 1) „Zubehör für Auto und Motorrad — mit klaren Angaben statt Rätselraten." 2) „Zur Saison das Richtige: Reifen, Batterie, Pflege — passend ausgewählt." | Kategorie-/Stöberseiten, SEO, saisonale Social-Posts (Postiz, LIB-TK-07). |

Dach über allen: **„Für Auto und Motorrad. Klar gefunden."** (TEILEKLAR-Startseite, gesamtkonzept-2026-11-14 Abschnitt 6.)

---

## 5. Quellen- und Annahmenverzeichnis (AKP 5)

### 5.1 Externe Quellen (öffentliche Webrecherche, abgerufen 14.11.2026)

- **[Q1]** DMB/Salesforce „KI-Index Mittelstand 2025" (zit. n. Mittelstandsbund & marktundmittelstand.de): ~33,1 % Nutzung, 9,5 % voll implementiert, 43 % ohne Pläne. https://www.mittelstandsbund.de/alle-nachrichten/ki-index-mittelstand-jeder-dritte-mittelstaendler-setzt-ki-ein · https://www.marktundmittelstand.de/ratgeber/ein-drittel-der-mittelstaendler-setzt-bereits-auf-kuenstliche-intelligenz
- **[Q2]** business.digital „KI im Mittelstand 2026" (referiert Destatis IKT 2025: 23/36/57 % nach Größe; 81 % messen ROI nicht). https://business.digital/magazin/ki-im-mittelstand
- **[Q3]** bebensee.it „KI im deutschen Mittelstand" (referiert Bitkom ~36 % / ifo ~40,9 % ab 20 Beschäftigten). https://bebensee.it/de/blog/ki-im-deutschen-mittelstand-strategieluecken-fakten-und-handlungsrahmen/index.html
- **[Q4]** FZI/Hochschule Karlsruhe „KI-Einsatz im deutschen Mittelstand" (40 % Einsatz, 21 % mit Strategie). https://www.fzi.de/2025/10/06/ki-einsatz-im-deutschen-mittelstand/
- **[Q5]** Bitkom-Handwerksstudie 2025 (504 Betriebe; Azubimangel 83 %, Fachkräftemangel 75 %, Digitalisierungsnote 3, 54 % Wettbewerb um Fachkräfte) + marktundmittelstand.de (KI für Büroaufgaben; 84 % skeptisch). https://www.bitkom.org/sites/main/files/2026-01/bitkom-studienbericht-handwerk.pdf · https://www.marktundmittelstand.de/technologie/84-prozent-sind-skeptisch
- **[Q6]** CBS / Eurostat (NL, zit. n. ictmagazine.nl, clevertech.nl, werkenmetai.nl): Microbedrijven 13,8 % (von 6,8 % 2023), MKB 29,8 %, Grootbedrijf 66,2 %; Eurostat NL 33,2 % vs. EU 20,0 %; Microbetriebe Marketing/Verkauf 32,7 %. https://www.ictmagazine.nl/nieuws/slechts-14-procent-van-nederlandse-microbedrijven-gebruikt-ai/ · https://werkenmetai.nl/blog/hoeveel-nederlandse-bedrijven-gebruiken-ai
- **[Q7]** Anbieterlandschaft DACH-Automatisierungsagenturen (Selbstdarstellungen, Preise anbietereigen): Sanetech, FullCircle, DARE Solutions, Webmaster Studios, ki-agentur.io, Automated KI-Agentur; Tool-Vergleich Make/Zapier/n8n. https://www.sanetech-solutions.de/leistungen/n8n-agentur/ · https://dare-solutions.de/n8n-agentur/ · https://ki-agentur.io/leistungen/ki-automatisierung · https://techflow.ai/blog/make-vs-zapier-vs-n8n
- **[Q8]** GM Insights „Europe E-commerce Automotive Aftermarket" (Markt ~21,09 Mrd. USD 2025; Autodoc ~9,2 %; Top 5 = 28,4 %) + amz.de (Fragmentierung, kfzteile24 #3, Speed4Trade −6,4 % Besuchsfrequenz). https://www.gminsights.com/industry-analysis/europe-e-commerce-automotive-aftermarket · https://www.amz.de/onlinemarkt-fuer-autoteile-studie-zeigt-fragmentierung
- **[Q9]** Autodoc-Geschäftszahlen 2025 (Unternehmensmitteilung, zit. n. eqs-news.com & vau-max.de): ~1,8 Mrd. € Umsatz, 18,9 Mio. Bestellungen (+12,4 %), 72,5 Mio. Artikel (+10,7 %), 9,3 Mio. aktive Kunden. https://www.eqs-news.com/news/corporate/autodoc-festigt-europaeische-marktfuehrerschaft-mit-starker-performance-im-jahr-2025/564219a5-1dc0-4d42-bd11-036272ebcd5f_de
- **[Q10]** Passungs-/Fehlkauf-Problem: Autodoc-Ratgeber (zit. n. Stuttgarter Zeitung — HSN/TSN nur erster Filter, Baujahr/Schlüsselnummer führt häufig zu Fehlbestellung), AutoScout24 (VIN/Teilenummer). https://www.stuttgarter-zeitung.de/wissen/online-handel-so-findet-man-das-richtige-ersatzteil-fuers-auto-79519314.html · https://www.autoscout24.de/informieren/ratgeber/kfz-technik/kfz-ersatzteile/ · Die zusätzliche Aussage „häufigster Fehler = falsches Bauteil" stammt aus einem Kfz-Meisterbetrieb-Blog ohne gesicherten Link/Datum und bleibt **ANNAHME/unbelegt**; die belegte Kernaussage (Fehlbestellung durch unzureichende Schlüsselnummer-Filterung) trägt die Argumentation auch ohne sie.
- **[Q11]** Web-Agentur-/KMU-Website-Preise (Anbieter-Ratgeber, Spannen): sellwerk.de, studiomeyer.io, drweb.de (KMU-Website 1.500–8.000 €, Individualprojekte ab 8.000–12.000 €). https://sellwerk.de/wissenswert/was-kostet-eine-website · https://www.drweb.de/website-kosten/
- **[Q13]** eBay-Reifenmontage-Partnerprogramm (Montagebuchung beim Teilekauf über Partner ATU/Euromaster) — Beleg, dass Montagevermittlung auch bei großen Marktplätzen/Shops besteht und keine Alleinstellung ist. https://pages.ebay.de/reifenmontage/ (abgerufen 15.11.2026). Hinweis: Ein Vercel-Review-Bot behauptete zusätzlich eine Autodoc-Euromaster-Vermittlung „seit März 2026"; das ließ sich öffentlich nicht bestätigen und bleibt **ANNAHME/unbelegt**, ändert aber nichts an der entschärften, nicht-exklusiven Formulierung.
- **[Q12]** Werkstattmarkt DE: e-mobil BW „Freie Werkstätten und Servicemarkt 2040" (~36.570 Werkstätten, ~22.000 markenungebunden 2021; −20 % bis 2030, −40 % bis 2040) + DEKRA/Ipsos (digitales Serviceangebot hinter Erwartungen). https://www.e-mobilbw.de/fileadmin/media/e-mobilbw/Downloads/Pressemeldungen/2023/PM_e_mobilBW_Freie_Werkstaetten_und_Servicemarkt_2040.pdf · https://www.autohaus.de/nachrichten/schadenbusiness/aktuelle-dekra-ipsos-studie-beim-digitalen-service-bescheinigen-autobesitzer-ihren-werkstaetten-fortschritte-3893469

**Vorbehalt zu allen Marktzahlen:** KI-Nutzungsquoten variieren je nach Studiendefinition erheblich; Autodoc-/Agenturzahlen stammen teils aus Eigenangaben; Marktgrößen sind Schätzungen einzelner Research-Häuser und nicht direkt vergleichbar. Für Zitate im Außenauftritt sind die Primärquellen (Destatis, Bitkom, CBS, Geschäftsberichte) direkt zu prüfen. Nicht gefunden: belastbare Einzelzahl zum Zeitaufwand fürs Angebotsschreiben im Handwerk; kfzteile24-Umsatz/-Volumen; deutschlandspezifische Teilemarktgröße (nur europäisch belegt).

### 5.2 Interne Quellen (nur gelesen, Daten keine neuen Rechte)

`CLAUDE.md`, `AGENTS.md`, `config/llm-policy.json`, `config/source-boundaries.json`, `config/selfservice-policy.json`, `config/operating-model.json`, `config/fakten.json`, `config/loesungsregister.json`, `config/site-map.json` (Verweis), `docs/01-konzept/NeXify-Marketingkonzept.md` (MKT-002), `docs/01-konzept/teileklar-shop.md`, `docs/05-marketing/gesamtkonzept-2026-11-14.md`. Für die Abgleiche nach den Reviews zusätzlich gezielt geprüft: `apps/web/proxy.ts`, `apps/web/auth/indexing.ts`, `apps/web/components/shop/FitmentChecklist.tsx`, `PhaseNotice.tsx`, `apps/shop-api/shop/workshops_api.py`, `docs/06-auftraege/herstellerlogos.md`, `PROGRESS.md`. Ausgewählt über `tools/context_executor.py` und gezielte Nachprüfung der Review-Befunde.

### 5.3 Annahmenverzeichnis (nicht belegt — als ANNAHME markiert)

| # | Annahme | Warum offen / nächster Schritt |
|---|---|---|
| A-1 | Budgetrahmen NX-A/NX-B/TK-2 | Keine NeXify-Preisfreigabe (O-1) und keine gemessenen Abschlusswerte; Marktanker sind fremde Anbieterpreise. Inhaber-Entscheidung O-1. |
| A-2 | Wettbewerbstyp „generische KI-Assistenten/SaaS" (NeXify #4) | Marktbeobachtung ohne Einzelbeleg; bei Bedarf gezielte Quelle nachziehen. |
| A-3 | Priorisierung TK-3 nach TK-1/TK-2 | Hängt an Katalog-/Preisanbindung (Lieferantenvertrag, IST offen). |
| A-4 | Benelux-Priorität (NX-09) | NL-MKB-Nachfrage belegt [Q6], aber NeXify-Hauptmarkt bleibt DE (SOLL); muttersprachliche Prüfung offen (O-12). |
| A-5 | Wirkung-×-Aufwand-Einstufungen in Abschnitt 3 | Experteneinschätzung aus Belegen + internem Stand, keine gemessenen Umsetzungsdaten; im Meeting durch Inhaber zu validieren. |
| A-6 | Lösungsregister-Dienste als Stack-Grundlage | Nur Resend und HubSpot sind „läuft belegt"; n8n/Postiz/Supabase/Revolut/OpenRouter/Cloudflare AI Gateway/Composio sind „läuft unbelegt", BigBuy und Cognee „defekt". Bausteine führen diese als Funktionsnachweis-Abhängigkeit, nicht als fertige Grundlage. |
| A-7 | TEILEKLAR-Dreisprachigkeit und „7 Marktversionen" als Vorteil | Konzept/Prototyp; ausgeliefert ist heute nur Deutsch (`apps/web/proxy.ts`, `PROGRESS.md`). Als SOLL führen. |
| A-8 | „Finden"/organische Suche als Funnel-Engpass und Leadwirkung von LIB-NX-03/LIB-TK-02 | Nicht gemessen (Analytics aus, Seite `noindex`); Q1/Q2 sind Adoptionsraten, kein Funnel-Beleg. Wirkung erst nach Indexierungs-Freigabe. |
| A-9 | Werkstattverzeichnis als Vermittlung | 6.875 Einträge sind Verzeichnis (`partner: false`), keine Vertragspartner/Auftragsvermittlung; Partnermodell ist SOLL (O-9). |
| A-10 | Herstellerlogo-Nutzungsrechte (LIB-TK-06) | Offen; Beschaffungsauftrag `docs/06-auftraege/herstellerlogos.md`, kein fertiges Rechte-Manifest. |

---

*Ende der Recherche. Offene Inhaber-Entscheidungen (O-1 Preise, O-2 Referenzen, O-9 TEILEKLAR-Betrieb/Lieferant) bleiben die wichtigsten fehlenden Belege und sind zugleich die größten Hebel für die Angebots- und Library-Roadmap.*
