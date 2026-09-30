# Auftrag: Vollständige Rechtstexte für TEILEKLAR erstellen (7 Marktversionen)

**Auftraggeber:** TEILEKLAR — ein Geschäftsbereich von NeXify AI by NeXify
**Inhaber:** Pascal Courbois (Eenmanszaak nach niederländischem Recht)
**Sitz:** Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande · KvK 90483944 · USt-IdNr. NL865786276B01
**Kontakt:** mail@teileklar.shop · +31 6 133 188 56 · teileklar.shop
**Ziel:** Alle Rechtstexte des Onlineshops individuell auf TEILEKLAR zugeschnitten erstellen, je Markt und Sprache, und als **eine** Download-Datei liefern.
**Stand:** 31.08.2026

---

## 1. Ausgangslage, die zu berücksichtigen ist

- TEILEKLAR ist ein **Onlineshop für Kfz-Ersatzteile** (Bremsen, Batterien, Filter, Öle, Wischer; später Reifen/Felgen), betrieben aus den **Niederlanden** mit Ansprache in **DE, AT, CH, NL, BE (NL+FR), LU**.
- Der Shop verkauft **Fahrzeugteile mit Sicherheitsrelevanz** und weist zu jedem Artikel Passungsstatus, Quelle, Stand, Prüfpunkte und notwendiges Zubehör aus.
- Ein **KI-Berater** („NeXify AI") führt Beratung, Zubehörauswahl, Bestellung und Kontoanlage im Chat.
- Der Shop ist als **PWA installierbar** und nutzt einen Service Worker mit lokalem Cache.
- Beschaffung erfolgt über **Großhandelspartner** (Name im Frontend nicht genannt); Direktversand durch Lieferanten ist möglich.
- **Werkstattpartner** erhalten Aufträge mit Fahrzeug- und Teiledaten (Auftragsvermittlung, keine eigene Werkstattleistung).
- Es gibt **Kundenbewertungen** (künftig mit Kaufnachweis) und ein **Markenband mit Herstellerlogos** (Nutzung nur mit Freigabe).
- Aktuell ist der Shop ein **Demonstrationsstand**: keine Verträge, keine Zahlungen, keine echten Bestände.

## 2. Die zentrale Vorfrage — vor dem Schreiben klären

Der Betreiber muss festlegen: **B2C, B2B oder beides.**

| Variante | Folgen für die Texte |
|---|---|
| Nur B2B (Unternehmer nach § 14 BGB) | Ausschluss von Verbraucherverträgen, kein Widerrufsrecht, keine Verbraucherstreitbeilegung, Nettopreise, Prüfpflicht des Käufers, kein Button-Lösung-Zwang — **aber**: die gesamte Oberfläche und Tonalität muss auf Gewerbe umgestellt werden |
| B2C | volle Informations-, Widerrufs- und Gewährleistungspflichten, Preisangaben inkl. Steuer, Button-Lösung, Streitbeilegungsangabe, Gewährleistung 24 Monate |
| Beides (empfohlen für diesen Shop) | doppelte Preis- und Vertragslogik, getrennte AGB-Abschnitte oder zwei AGB-Sätze, Kundentyp-Erkennung im Checkout, unterschiedliche Widerrufs- und Gewährleistungsregeln |

**Auftragsteil A:** Erstelle zunächst eine **Entscheidungsvorlage** (max. 2 Seiten) mit Vor- und Nachteilen, Pflichtenvergleich, Risiken und einer begründeten Empfehlung. Erst danach die Texte in der gewählten Variante schreiben. Wird keine Entscheidung getroffen, ist die Variante **„B2C und B2B" mit getrennten Abschnitten** zu erstellen.

## 3. Zu erstellende Dokumente

### 3.1 Pflichtdokumente je Marktversion

| Nr. | Dokument | Besonderheit |
|---|---|---|
| 1 | Impressum / Colofon / Mentions légales | Anbieterkennzeichnung; nationale Grundlagen je Markt (DE: § 5 DDG, § 18 Abs. 2 MStV; NL: art. 3:15d BW; BE: Code de droit économique; LU: loi commerce électronique; AT: § 5 ECG, § 25 MedienG; CH: Art. 3 UWG) |
| 2 | Datenschutzerklärung | DSGVO Art. 13/14; Verantwortlicher NL, Aufsicht AP Den Haag; Zwecke: Shop, Fahrzeugkontext, KI-Berater, Bestellung, Zahlung, Versand, Werkstattvermittlung, Support, Reichweitenmessung |
| 3 | Cookie- und Speicher-Richtlinie | § 25 TDDDG (DE), Telecomwet art. 11.7a (NL), Belgische/Luxemburgische Umsetzung, CH DSG; Kategorien inkl. Service-Worker-Cache und Marktauswahl |
| 4 | AGB | Vertragsschluss, Preise je Markt, Versand, Teilsendungen, Eigentumsvorbehalt, Gewährleistung, Haftung, Rechtswahl NL, Gerichtsstand Venlo, zwingende Verbraucherregeln unberührt |
| 5 | Widerrufsbelehrung + Muster-Widerrufsformular | nur B2C; Sonderfälle: eingebaute Bremsteile, geöffnete Öle, Wertersatz; CH: freiwilliges Rückgaberecht klar als freiwillig |
| 6 | Versand-, Zahlungs- und Rückgabeinformationen | Kosten und Zeiten je Markt, Speditionsware, Zoll/MWST für CH, Zahlarten je Land |
| 7 | Batterie- und Altölhinweise | BattG/Batterieverordnung (EU) 2023/1542, Bebat (BE), Batterijenbesluit (NL), Pfand, Rücknahmeweg, Altölrücknahme in gleicher Menge |
| 8 | Verpackungs- und Umwelthinweise | LUCID/VerpackG (DE), ARA (AT), UPV (NL), Fost Plus (BE), SDK (LU), CH-Regelung |
| 9 | Produktsicherheitshinweise | GPSR (EU) 2023/988: verantwortliche Person in der EU, Warnhinweise, Rückrufprozess, Meldeweg für Sicherheitsvorfälle; ECE-R90 für Bremsteile |
| 10 | KI-Hinweise / KI-Transparenzerklärung | KI-VO (EU) 2024/1689: Einordnung, Art. 5 Verbote, Art. 50 Transparenz, Art. 4 KI-Kompetenz, Kennzeichnung erzeugter Inhalte, Eskalation an Menschen, keine Rechtsauskunft |
| 11 | Erklärung zur Barrierefreiheit | BFSG / EU-Richtlinie 2019/882, EN 301 549, Feedback-Mechanismus, Stand der Konformität |
| 12 | Streitbeilegungs- und Beschwerdeinformation | VSBG (DE), Verbraucherschlichtung je Land, ODR-Hinweis soweit anwendbar |

### 3.2 Vertrags- und Partnerdokumente

| Nr. | Dokument | Zweck |
|---|---|---|
| 13 | Auftragsverarbeitungsvertrag (AVV/DPA) | Art. 28 DSGVO, Muster für IT-, Versand-, Zahlungs- und Supportdienstleister, inkl. TOM-Anlage und Subunternehmerliste |
| 14 | Werkstatt-Partnervereinbarung | Leistungsumfang, Auftragsübergabe, Qualitätsanforderungen, Haftung für Einbau, Vergütung/Provision, Datenschutz, Kündigung, Markennutzung |
| 15 | Lieferanten-/Beschaffungsvereinbarung (Rahmen) | Bestellweg, Bestand, Preis, Versand, Direktversand an Endkunden, Retouren, Gewährleistungsabwicklung, Datennutzungsrechte, SLA |
| 16 | B2B-Rahmenvertrag / Pro-Konto-Bedingungen | Nettopreise, Zahlungsziel, Bonitäts- und Limitregeln, Mehrbenutzer, Freigaben, Eigentumsvorbehalt |
| 17 | Nutzungsbedingungen für Markeninhalte | Verwendung von Herstellerlogos und Katalogdaten, Nachweispflichten, Sperrprozess |
| 18 | Vertraulichkeitsvereinbarung (NDA) | Investoren-, Partner- und Dienstleistergespräche |
| 19 | Einwilligungs- und Widerrufstexte | Newsletter, Bewertungsanfrage, Beratungsverlauf im Konto speichern — jeweils mit Nachweislogik |
| 20 | Interne Richtlinien | Datenschutz-Verarbeitungsverzeichnis (Vorlage), Löschkonzept, Vorfall-Meldeprozess, KI-Nutzungsrichtlinie für Mitarbeitende |

## 4. Arbeitsweise (verbindlich)

1. **Sachverhalt aufnehmen:** Diesen Auftrag, das Impressum-Muster und die Shop-Struktur (7 Marktversionen, Sortiment, KI-Berater, Werkstattvermittlung, PWA) als Grundlage nehmen. Keine Standardvorlage ungeprüft übernehmen.
2. **Rechtsquellen prüfen und zitieren:** Für jede Aussage die Rechtsgrundlage mit Norm und Fundstelle angeben (Fußnote oder Klammerzitat). Bei nationalen Unterschieden je Markt getrennt formulieren, nicht zusammenfassen.
3. **Individualisieren:** Jeder Text muss den konkreten Betrieb beschreiben — Ersatzteile mit Sicherheitsrelevanz, Direktversand durch Lieferanten, Passungsangaben mit Quelle, KI-Beratung, Werkstattvermittlung, Pfand auf Batterien, Altöl, Zoll für CH.
4. **Sprachfassungen:** Deutsch (DE/AT/CH), Niederländisch (NL/BE), Französisch (BE/LU). Rechtsbegriffe je Rechtsordnung korrekt, keine wörtliche Übersetzung deutscher Normbegriffe.
5. **Konsistenz sichern:** Widerrufsfrist, Gewährleistung, Lieferzeiten, Versandkosten, Zahlarten und Rücknahmewege müssen mit den Angaben im Shop übereinstimmen (siehe Marktmatrix in Abschnitt 6).
6. **Lücken benennen statt füllen:** Was ohne Vertrag oder Registrierung nicht behauptbar ist (z. B. Verpackungsregistrierung, Zahlungsdienstleister, Versandpartner, verantwortliche Person nach GPSR), wird als **Platzhalter mit eckigen Klammern** und einem Eintrag in `OFFENE-PUNKTE.md` markiert.
7. **Prüfliste beilegen:** Je Dokument eine Checkliste, welche Angaben vor Livegang zu ergänzen bzw. anwaltlich zu prüfen sind.
8. **Kein Rechtsrat behaupten:** Jedes Dokument trägt den Hinweis, dass eine anwaltliche Endprüfung erforderlich ist, sowie Stand und Version.

## 5. Formvorgaben

- **Format:** je Dokument eine Markdown-Datei (`.md`), zusätzlich eine druckfertige Fassung als HTML mit Seitenumbrüchen.
- **Dateiname:** `<nr>-<dokument>-<markt>-<sprache>.md`, z. B. `04-agb-de-DE-de.md`, `01-colofon-nl-NL-nl.md`.
- **Aufbau je Dokument:** Titel · Version · Stand · Geltungsbereich (Markt/Sprache) · Inhaltsverzeichnis · numerierte Paragraphen · Kontaktangaben · Hinweis auf anwaltliche Prüfung.
- **Stil:** klare, kurze Sätze; Fachbegriff nur mit Erläuterung; keine Schachtelsätze über drei Zeilen; Anrede konsistent (B2C: „Sie"; B2B: „Sie").
- **Keine Marken- oder Fremdtextübernahme** aus anderen Shops oder Generatoren.

## 6. Marktmatrix, die in die Texte einzuarbeiten ist

| Markt | Sprache | Währung | Steuer | Versand | Schwer | Lieferzeit | Zahlarten |
|---|---|---|---|---|---|---|---|
| DE | de | EUR | 19 % | 4,95 € | 8,90 € | 1–2 Werktage | Rechnung, SEPA, Karte, PayPal |
| AT | de | EUR | 20 % | 6,90 € | 12,90 € | 2–3 Werktage | EPS, Rechnung, Karte, PayPal |
| CH | de | CHF | 8,1 % | CHF 12.90 | CHF 24.90 | 3–5 Werktage | TWINT, Karte, Rechnung |
| NL | nl | EUR | 21 % | 5,95 € | 11,90 € | 2–3 werkdagen | iDEAL, Rekening, Karte, PayPal |
| BE-NL | nl | EUR | 21 % | 6,50 € | 12,50 € | 2–3 werkdagen | Bancontact, iDEAL, Karte |
| BE-FR | fr | EUR | 21 % | 6,50 € | 12,50 € | 2–3 jours | Bancontact, Karte, Facture |
| LU | fr | EUR | 17 % | 7,90 € | 14,90 € | 2–4 jours | Karte, Virement |

Weitere Shop-Zusagen, die rechtlich abgedeckt sein müssen: kostenfreie Rücknahme bei Fehlpassung trotz Prüfung, 14 Tage Rückgabe, alle Kosten vor Kaufabschluss sichtbar, Pfanderstattung bei Batterierückgabe, Beratung rund um die Uhr mit Übergabe an Menschen.

## 7. Lieferung — eine Datei

`teileklar-rechtstexte.zip`

```
00-ENTSCHEIDUNGSVORLAGE-b2c-b2b.md
/de-DE/  01-impressum … 12-streitbeilegung
/de-AT/  …
/de-CH/  …
/nl-NL/  …
/nl-BE/  …
/fr-BE/  …
/fr-LU/  …
/vertraege/  13-avv … 20-interne-richtlinien
/print/      druckfertige HTML-Fassungen
OFFENE-PUNKTE.md      alle Platzhalter mit Verantwortlichem und Frist
QUELLENREGISTER.md    alle zitierten Normen und Fundstellen mit Abrufdatum
PRUEFLISTE.md         je Dokument: was vor Livegang fehlt
CHANGELOG.md          Version, Datum, Änderungen
```

## 8. Abnahmekriterien

1. Entscheidungsvorlage B2C/B2B liegt vor und die Texte sind konsistent in der gewählten Variante geschrieben.
2. Alle 12 Pflichtdokumente in allen 7 Marktversionen vorhanden, in der jeweils richtigen Sprache und mit nationaler Rechtsgrundlage.
3. Alle 8 Vertrags- und Partnerdokumente vorhanden.
4. Keine widersprüchlichen Angaben zwischen Rechtstexten und Marktmatrix (Frist, Kosten, Zahlart, Rücknahme).
5. Jede Rechtsaussage mit Norm belegt; Quellenregister vollständig mit Abrufdatum.
6. Alle unbelegbaren Angaben als Platzhalter gekennzeichnet und in `OFFENE-PUNKTE.md` geführt.
7. Sicherheitsrelevante Besonderheiten des Sortiments (Bremsteile, Batterien, Öle) sind ausdrücklich behandelt.
8. KI-Transparenzerklärung deckt die KI-VO-Pflichten ab und beschreibt den konkreten Berater, nicht allgemein „KI".
9. Kein Textbaustein erkennbar aus einem Generator oder von einem Wettbewerber übernommen.
10. Jedes Dokument mit Version, Stand und Hinweis auf anwaltliche Endprüfung.

## 9. Ergänzungen, die zusätzlich erwartet werden (proaktiv)

- **Textbausteine für die Oberfläche:** Kurzfassungen für Checkout-Hinweise, Button-Lösung, Einwilligungsbanner, Bestellbestätigungs-Mail, Rückgabe-Portal — jeweils in drei Sprachen.
- **Pflichtangaben-Karte je Produktkategorie:** welche Angaben (Genehmigungsnummer, Warnhinweis, Sicherheitsdatenblatt, Reifenlabel) ein Artikel tragen muss, bevor er veröffentlicht werden darf.
- **Fristen- und Aufgabenplan:** welche Registrierung, welcher Vertrag und welche Prüfung vor dem Start je Markt nötig ist, mit Reihenfolge und geschätztem Zeitbedarf.
- **Muster-Antwortschreiben:** Widerruf, Gewährleistungsfall, Sicherheitsmeldung, Datenschutz-Auskunftsersuchen, Sperrverlangen eines Markeninhabers.
- **Risikobewertung:** je Dokument die drei größten Abmahn- oder Bußgeldrisiken mit Gegenmaßnahme.
