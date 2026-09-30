# Gesamt-Seitenplan NeXify AI + TEILEKLAR

**Fassung 1.0 · 25.09.2026 · Status: Planungsstand zur Freigabe durch Pascal**
Gilt für alle Oberflächen vor und nach der Anmeldung, alle Rechtsseiten, alle Systemzustände, alle Dokumentationen und Handbücher.

---

## 0. Wissensgrundlage

| Quelle | Ergebnis |
|---|---|
| AgentMemory `nexifyai` | ausgewertet: Finale Gesamtlösung A–Z (24.09.), Gesamtprojekt-Register 22→29 Anforderungen, Produkt-Roadmap Apps/Webapps (25.09.), Blocker-Matrix, Core-OpenAPI (14 Pfade), Bestandsdaten-Cutover, Revolut-Vorbereitung, AGENTS.md-Systemregeln |
| AgentMemory `teileklar`, `teileklar-shop` | keine Einträge unter diesen Projektnamen, Wissen liegt in den Projektdokumenten |
| LightRAG | **nicht abgefragt.** Aus dieser Arbeitsumgebung gibt es keinen Zugang. Laut AgentMemory läuft die LightRAG-Abfrage außerdem derzeit ins Leere (Anfrage ohne Antwort, Rückstau bei der Wissensaufnahme, NX-GR-019). Die Abfrage muss nachgeholt werden, sobald LightRAG wieder antwortet. |
| Projektdokumente | gesamtprojektplan, prototyp-oberflaechen, auth-und-rollen, rechtstexte, designsystem, handbuch-kopf-fuss-anmeldung, Betriebsbuch, admin-/nutzerhandbuch |

---

## 1. Team-Durchsicht — fünf Perspektiven, ein Ergebnis

| Rolle | Wichtigster Befund |
|---|---|
| **Vertrieb** | Der Weg von „Interesse“ zu „bezahltem Tag“ hat keine eigene Fläche. Zwischen Angebot, Annahme, Guthaben und Projektstart fehlt die Strecke *Angebot annehmen → Guthaben laden → Starttermin*. |
| **Recht** | **Zwei Widersprüche müssen vor Livegang gelöst werden.** (1) AGENTS.md: „Niemals sagen, dass du Bot/KI bist“ widerspricht Art. 50 KI-VO und der eigenen KI-Hinweise-Seite. Die Website muss die KI kennzeichnen. (2) Laut AgentMemory gilt „Prepaid via Revolut, keine Leistung ohne Guthaben“, die AGB § 4 beschreiben aber Tagesrechnung mit Zahlung bis 09:00 Uhr am Folgetag. Pascal muss eines von beiden festlegen. |
| **Betrieb** | Die Statusseite, die Fehler- und Wartungsseiten sowie der Alarm-zu-Ticket-Weg fehlen als Oberfläche, obwohl bereits Wächter laufen (Kunden-Verfügbarkeits-, Frankfurt-, DMS-Wächter). |
| **Gestaltung** | Die Agentur-Seite v3 ist dunkel, 26 Dateien sind noch hell. Die Übertragung erfolgt zuerst über gemeinsame Bausteine (Kopf, Fuß, Anmeldung, Farbwerte), danach pro Fläche. TEILEKLAR behält Papier/Graphit als eigene Marke. |
| **Technik** | Jede Fläche nach der Anmeldung braucht einen OpenAPI-Pfad aus `nexifyai-core-openapi.yaml`. Die Seiten für Guthaben/Ledger, Rechnungen, Support-Tickets und Abnahme L1/L2/L3 sind als Pfade vorhanden, aber noch nicht als Oberfläche. |

**Beschluss des Teams:** kein neuer Stil vor vollständiger Seitenliste. Diese Liste ist die Seitenliste.

---

## 2. Lesehilfe

Status: **✓ vorhanden** · **◐ teilweise / alter Stil** · **○ fehlt**
Priorität: **P0** vor Livegang · **P1** mit Pilot · **P2** danach

---

## 3. NeXify AI — vor der Anmeldung (nexifyai.cloud)

Datei: `NeXifyAI Cloud v3.dc.html` (neuer Stil). Alle Unterseiten liegen in dieser einen Datei.

| # | Seite | Status | P | Notiz |
|---|---|---|---|---|
| A1 | Start | ✓ | P0 | Hero, Prinzipien, 8 Leistungen, Skala, Flaggschiff, Teams, Prozess, Stimmen |
| A2 | Leistungen (Übersicht + 8 Detailblöcke) | ✓ | P0 | Deep-Link je Leistung fehlt: `#leistung-<id>` |
| A3 | Fertiglösungen / White-Label | ◐ | P1 | derzeit Abschnitt in A2, eigene Seite mit Anfrageformular |
| A4 | Preise + Kosten- und ROI-Rechner + Checkliste | ✓ | P0 | Hinweis Guthaben/Prepaid nach Entscheidung (§ 1 Recht) |
| A5 | Prozess | ✓ | P0 | |
| A6 | Referenzen / Projekte | ✓ | P0 | Freigabe der Kundennennung je Fall dokumentieren (AGB § 11) |
| A7 | Über uns | ✓ | P0 | Porträtfoto fehlt |
| A8 | FAQ | ✓ | P0 | |
| A9 | Kontakt + KI-Berater | ✓ | P0 | echtes Formular mit Pflichtfeldern + Einwilligung fehlt |
| A10 | **Erstgespräch buchen** (Kalender) | ○ | P0 | heute nur Link auf Kontakt |
| A11 | **Angebot anfragen** (Bedarfsformular mehrstufig) | ○ | P0 | Ergebnis: Angebot im Kundenportal |
| A12 | Partner werden (Agentur/Freelancer) | ◐ | P1 | derzeit nur Karte auf A1 |
| A13 | Wissenshub (Übersicht + Artikel) | ◐ | P1 | Artikelvorlage vorhanden, Übersicht fehlt |
| A14 | Local-SEO-Stadtseiten | ◐ | P1 | Muster vorhanden, 8 Städte im Fuß verlinkt, aber ohne Ziel |
| A15 | Branchenseiten (Handwerk, Handel, Bildung, Dienstleister) | ○ | P2 | SEO-Keywords von Pascal nötig (NX-GR-022) |
| A16 | Karriere / Mitarbeit | ○ | P2 | nur wenn gewünscht |
| A17 | Presse / Medienpaket (Logo, Signet, Fakten) | ○ | P2 | |
| A18 | Newsletter-Anmeldung | ○ | P2 | laut Datenschutz § 13 kein Einsatz, nur nach Entscheidung |
| A19 | Niederländische Fassung (alle Seiten) | ○ | P1 | „DE/NL zweisprachig“ wird versprochen, UWG § 5: erst wenn vorhanden |

## 4. TEILEKLAR — vor der Anmeldung (teileklar.shop)

Datei: `TEILEKLAR Shop.dc.html` + Werkzeuge. 7 Marktversionen, de/nl/fr.

| # | Seite | Status | P |
|---|---|---|---|
| B1 | Start mit Fahrzeugauswahl | ✓ | P0 |
| B2 | Teilesuche / Kategorie mit Facetten | ✓ | P0 |
| B3 | Produktseite mit Passungskasten | ✓ | P0 |
| B4 | Warenkorb | ✓ | P0 |
| B5 | Kasse 5 Schritte, Gast oder Konto, B2C/B2B-Weiche | ✓ | P0 |
| B6 | Bestellbestätigung + Gast-Bestellansicht (signierter Link) | ◐ | P0 |
| B7 | Sendungsverfolgung ohne Konto | ○ | P1 |
| B8 | Rückgabe / Widerruf / Mangel / Fehlpassung melden | ✓ | P0 |
| B9 | Klarwissen (Ratgeber) | ✓ | P1 |
| B10 | Fitment-Checker, Reifenrechner, Batterie-Berater | ✓ | P1 |
| B11 | Werkstatt finden + Werkstatt-Partnerseite | ✓ | P1 |
| B12 | Partner werden (Werkstatt) | ✓ | P1 |
| B13 | Stadtseiten (34) | ◐ | P1 |
| B14 | Hilfe-Center / Kontakt / KLARA | ◐ | P0 |
| B15 | Rückrufe & Sicherheitshinweise (GPSR) | ○ | P0 |
| B16 | Batterie-Pfand & Altöl-Rücknahme | ○ | P0 |
| B17 | Investoren | ◐ | P2 |
| B18 | App installieren (PWA) | ✓ | P2 |

---

## 5. Rechtsseiten — vollständige Matrix

### 5.1 NeXify AI (B2B, NL-Recht)

| Seite | Status | Offen |
|---|---|---|
| Impressum / Colofon | ✓ | |
| Datenschutzerklärung | ✓ | mit Kontaktformular, Kalender und Revolut abgleichen |
| AGB (B2B) | ✓ | **§ 4 an Prepaid-Entscheidung anpassen** |
| AVV | ✓ | TOM-Anlage + Subunternehmerliste als eigene Anlage |
| Widerruf — B2B-Ausschluss | ✓ | Tippfehler „begleichen sind“ korrigieren |
| Cookie-Richtlinie + Einstellungen-Dialog | ◐ | Link „Cookie-Einstellungen“ im Fuß ohne Dialog |
| KI-Hinweise | ✓ | Widerspruch zu AGENTS.md auflösen |
| Barrierefreiheit | ✓ | |
| Security + Meldung von Sicherheitslücken | ✓ | `/.well-known/security.txt` ergänzen |
| **SLA / Leistungsbeschreibung NeXify Care** | ○ | P0: Reaktionszeiten, Verfügbarkeit, Ausschlüsse (NX-GR-013) |
| **Prepaid-/Guthabenbedingungen** | ○ | P0: Aufladung, Sperrschwelle, Verfall, Rückzahlung |
| **Partnerbedingungen (Agentur/Freelancer)** | ○ | P1: Provision, Weißlabel, Vertraulichkeit |
| **Unterauftragsverarbeiter-Liste** (öffentlich, versioniert) | ○ | P1 |
| **NDA-Vorlage** | ○ | P2 |

### 5.2 TEILEKLAR (B2C + B2B, 7 Märkte × Sprache)

12 Pflichtdokumente je Markt laut `rechtstexte.md` § 3.1 → **84 Dokumente**, im Shop vorhanden (✓). Zusätzlich offen:

| Dokument | Status | P |
|---|---|---|
| Muster-Widerrufsformular als ausfüllbare Seite | ◐ | P0 |
| Streitbeilegung je Land | ◐ | P0 |
| Werkstatt-Partnervereinbarung | ○ | P1 |
| Pro-Konto-Bedingungen (B2B) | ○ | P1 |
| Nutzungsbedingungen Markeninhalte | ○ | P2 |
| Einwilligungstexte (Bewertung, Beratungsverlauf) | ◐ | P1 |

### 5.3 Nachbarschaftskunden-Programm

| Dokument | Status | P |
|---|---|---|
| Programmbedingungen inkl. 7-Tage-Widerspruch | ○ | P1 |
| Gutscheinbedingungen (Laufzeit, Einlösung, Verfall) | ○ | P1 |

---

## 6. Anmeldung und Konto — die gemeinsamen Flächen

Eine Kontoart, mehrere Rollen (`auth-und-rollen.md`). Datei: `Anmeldung.dc.html`.

| # | Fläche | Status | P |
|---|---|---|---|
| C1 | Anmelden (Einmallink / Passwort + TOTP nach Rolle) | ✓ | P0 |
| C2 | Registrieren (Privat, Geschäft, Werkstatt, Agenturkunde) | ◐ | P0 |
| C3 | Link gesendet / Link abgelaufen / Link bereits benutzt | ◐ | P0 |
| C4 | Passwort vergessen + neues Passwort | ◐ | P0 |
| C5 | Zwei-Faktor einrichten + Wiederherstellungscodes | ○ | P0 |
| C6 | Konto gesperrt (nach 10 Fehlversuchen) | ○ | P0 |
| C7 | Einladung annehmen (Team-/Pro-Mitglied) | ○ | P1 |
| C8 | Rollenwahl nach Anmeldung (mehrere Rollen) | ○ | P1 |
| C9 | Sitzung abgelaufen / auf anderem Gerät beendet | ○ | P1 |
| C10 | Abmelden-Bestätigung | ○ | P2 |

---

## 7. Nach der Anmeldung

### 7.1 Kundenportal NeXify AI — `Kundenportal.dc.html` ◐

| # | Bereich | Status | P | API |
|---|---|---|---|---|
| D1 | Übersicht (Projektphase, nächster Schritt, Guthaben) | ◐ | P0 | `/v1/customers/me` |
| D2 | Angebote: ansehen, **annehmen**, ablehnen, Rückfrage | ◐ | P0 | `offers/accept` |
| D3 | **Guthaben**: Saldo, Aufladen (Revolut), Sperrschwelle, Verlauf | ○ | P0 | `/v1/ledger`, `/v1/revolut` |
| D4 | Projekte: Phase, Tagesberichte, Entscheidungsbedarf | ◐ | P0 | |
| D5 | **Abnahme**: L1/L2/L3-Belege je Baustein, Freigeben/Rügen (14 Tage) | ○ | P0 | Abnahme-Pfad |
| D6 | Rechnungen + „NeXify AI Kosten“ (monatlich, 38 %) | ◐ | P0 | |
| D7 | Dateien / Übergabedokumente | ◐ | P1 | `documents/download` |
| D8 | **Support-Tickets** mit SLA-Anzeige | ○ | P0 | Support-Pipeline |
| D9 | NeXify Care: Monitoring-Status der eigenen Systeme | ○ | P1 | |
| D10 | Team & Rechte (Nutzer einladen) | ○ | P1 | |
| D11 | Einstellungen: Firmendaten, USt-IdNr., Rechnungsadresse, Benachrichtigungen | ○ | P0 | |
| D12 | Meine Daten (Export, Löschung, Einwilligungen) | ○ | P0 | `account/data-rights` |
| D13 | AVV abschließen / herunterladen | ○ | P0 | |

### 7.2 Partnerportal (Werkstatt) — `Partnerportal.dc.html` ◐

Profil/Landingpage, Gutscheine bestellen, Termineingang, Aufträge annehmen, monatliche Abrechnung, Nutzen-Rechner sind vorhanden. **Fehlt:** Partnervertrag digital annehmen (P1), Auszahlungsdaten + Gutschriften (P0), Qualitätsrückmeldung zum Einbau (P1), Mitarbeiter-Zugänge (P2).

### 7.3 Nachbarschaftskunden-Portal — `Nachbarschaftskunden-Portal.dc.html` ◐

Konto, Termin, Belege sind vorhanden. **Fehlt:** Gutschein einlösen als eigener Schritt mit Fehlerfällen (P1), Kündigung (P1).

### 7.4 TEILEKLAR Konto / Garage — `Konto.dc.html` ◐

Garage, Bestellungen, Rechnungen, Einwilligungen, Datenrechte. **Fehlt:** mehrere Fahrzeuge verwalten (P1), Pro-Konto-Antrag mit VIES-Status (P1), Pro: Benutzer, Limits, Freigaben (P1), Bewertungen schreiben mit Kaufnachweis (P2).

### 7.5 Intern — team.nexifyai.cloud + system.nexifyai.cloud

Nicht in diesem Projekt gebaut, laut Roadmap P0 (Team-/Business-Webapp läuft, Svelte). **Hier nur Gestaltung angleichen, nicht nachbauen.**

| Bereich | Wo | P |
|---|---|---|
| Business-Portal (8 Tabs: Preisrechner, Ledger, Angebote, Partner, Kunden, Rechnungen, Service, Risiko) | DUS Team-App | P0 |
| Board, Aufgabenwarteschlange, Skills, Orchestrator | system | P1 |
| Redaktion: Artikel-/Ratgeberfreigabe | ○ | P1 |
| Verwaltung: Rollen, Märkte, Rechtstexte, Sperrungen, Audit-Log | ○ | P0 |
| Freigabe-Gate: L1/L2/L3-Register, Abnahmebelege | ◐ Register | P0 |

---

## 8. Systemzustände — auf jeder Fläche

| Zustand | Status | P |
|---|---|---|
| 404 Seite nicht gefunden (je Marke) | ○ | P0 |
| 500 / Dienst gestört | ○ | P0 |
| Wartungsmodus mit Zeitfenster | ○ | P0 |
| Offline (PWA) | ✓ TEILEKLAR / ○ NeXify | P1 |
| **Öffentliche Statusseite** status.nexifyai.cloud (aus den bestehenden Wächtern) | ○ | P1 |
| Einwilligungsbanner + Einstellungen | ✓ TEILEKLAR / ○ NeXify | P0 |
| Leerzustände je Liste (keine Rechnungen, keine Tickets …) | ◐ | P0 |
| Lade- und Fehlerzustände je Formular | ◐ | P0 |
| Guthaben unter Sperrschwelle (Banner + Sperre) | ○ | P0 |

---

## 9. E-Mails und Benachrichtigungen

Vorhanden: Angebot/Kontoeinladung, Newsletter. **Fehlend (alle P0 außer vermerkt):**
Anmeldelink · Passwort zurücksetzen · Neues Gerät / verdächtige Anmeldung · Konto gesperrt · Bestellbestätigung · Versandbestätigung · Rücksendung erhalten · Rechnung · Zahlungserinnerung · Guthaben niedrig · Guthaben aufgeladen · Tagesbericht (20:00 Uhr) · Abnahme angefordert · Ticket eröffnet/beantwortet/gelöst · Partner: neuer Auftrag · Partner: Monatsabrechnung · Werkstatttermin bestätigt · Datenexport bereit · Löschung abgeschlossen · Bewertungsanfrage (P2).
Alle nach DIN 5008, mit SPF/DKIM/DMARC (NX-GR-017).

---

## 10. Dokumentation und Handbücher

| Dokument | Zielgruppe | Status | P |
|---|---|---|---|
| Nutzerhandbuch Kundenportal | Agenturkunde | ◐ `nutzerhandbuch.md` | P0 |
| Nutzerhandbuch TEILEKLAR (Konto, Garage, Rückgabe) | Endkunde | ◐ | P1 |
| Partnerhandbuch Werkstatt | Werkstatt | ○ | P1 |
| Handbuch Nachbarschaftsprogramm | Einlöser | ○ | P2 |
| Admin-Handbuch | Verwaltung | ◐ `admin-handbuch.md` | P0 |
| Redaktionshandbuch (Freigabe, Quellen, Stand) | Redaktion | ○ | P1 |
| **Betriebshandbuch** (Dienste, Ports, Wächter, Backup/Restore, Eskalation) | Betrieb | ◐ `Betriebsbuch.md` | P0 |
| **Runbooks je Störung** (502 www, API-DB unavailable, LightRAG-Rückstau, Kundenseite langsam) | Betrieb | ○ | P0 |
| Notfall- und Wiederanlaufplan (RTO/RPO je Dienst) | Betrieb | ○ | P0 |
| Datensicherungskonzept inkl. Restore-Nachweis | Betrieb | ◐ teileklar 24/24 ✓ | P0 |
| Freigabe-Gate / Abnahmeprotokoll L1–L3 | QA | ◐ Register | P0 |
| Designsystem + Komponentenkatalog (dunkel) | Gestaltung | ◐ | P0 |
| Handbuch Kopf/Fuß/Anmeldung | Gestaltung | ✓ | P0 |
| API-Dokumentation (aus OpenAPI) | Technik | ◐ YAML | P1 |
| Verarbeitungsverzeichnis Art. 30 DSGVO | Recht | ○ | P0 |
| Löschkonzept | Recht | ○ | P0 |
| Vorfall-Meldeprozess (72 h, Art. 33) | Recht | ○ | P0 |
| KI-Nutzungsrichtlinie + KI-Kompetenz Art. 4 | Recht | ○ | P1 |
| GoBD-Verfahrensdokumentation | Steuer | ○ blockiert | P0 |
| Preis- und Margenblatt (45 % auf Endpreis) | Pascal | ○ blockiert | P0 |
| Onboarding-Checkliste Neukunde | Vertrieb | ◐ | P0 |
| Übergabedokument je Projekt (Vorlage) | Kunde | ○ | P1 |
| Changelog / Versionshinweise | alle | ○ | P2 |

---

## 11. Was sonst vergessen wird

1. `robots.txt`, `sitemap.xml` je Sprache, `hreflang`, kanonische Adressen.
2. Open-Graph-/Teilen-Bilder je Seite, Favicon-Satz, Manifest für NeXify AI.
3. `security.txt`, `humans.txt` optional.
4. Druckansicht für Rechtstexte, Rechnungen und Angebote.
5. Dunkler Stil für E-Mails? **Nein.** E-Mails bleiben hell (Darstellung in Mailprogrammen).
6. Druckstücke: Entscheidung dunkel/hell steht noch aus.
7. Tastaturbedienung und Fokus für jede neue Fläche, Kontrastnachweis für den dunklen Stil.
8. Leistungsbudget: Ladezeit unter 2,5 s (LCP), sonst meldet der Wächter.
9. Messung ohne Tracking-Cookies (serverseitige Zählung) — nur wenn gewünscht.
10. Weiterleitungen von alten Adressen (new.nexifyai.cloud → nexifyai.cloud).
11. Aufbewahrungsfristen sichtbar im Konto (7 Jahre Rechnungen).
12. Widerspruch KI-Kennzeichnung ↔ AGENTS.md (§ 1) — **vor Livegang lösen.**

---

## 12. Reihenfolge der Umsetzung

| Welle | Inhalt | Ergebnis |
|---|---|---|
| **W1** | Gemeinsame Bausteine dunkel: NX-Header, NX-Footer, Anmeldung C1–C6, Systemzustände § 8, Designsystem.md | jede Fläche kann umgestellt werden |
| **W2** | NeXify AI vor der Anmeldung: A10, A11, Cookie-Dialog, SLA-, Prepaid-Seite | Verkauf ohne Lücke |
| **W3** | Kundenportal dunkel + D3, D5, D8, D11–D13 | bezahlter Projektablauf Ende-zu-Ende |
| **W4** | Partnerportal, Nachbarschaftsportal, TEILEKLAR-Konto (Stil angleichen, Lücken § 7) | alle Portale |
| **W5** | TEILEKLAR B6, B7, B15, B16 | Shop-Pflichten |
| **W6** | E-Mails § 9, Handbücher § 10 (P0 zuerst), Runbooks | Betrieb und Übergabe |
| **W7** | P1/P2: NL-Fassung, Wissenshub, Stadt-/Branchenseiten, Presse | Reichweite |

---

## 13. Entscheidungen, die nur Pascal treffen kann

1. **Prepaid oder Tagesrechnung** — AGB § 4 folgt dieser Entscheidung.
2. **KI-Kennzeichnung**: AGENTS.md-Regel „nie sagen, dass KI“ für die Website aufheben (Empfehlung: ja, Pflicht nach Art. 50 KI-VO).
3. Druckstücke dunkel oder hell.
4. Newsletter ja/nein.
5. NL-Fassung der Agentur-Seite: jetzt (P1) oder später — bis dahin „DE/NL“ nur für Beratung, nicht für die Website versprechen.
6. SEO-Keywords / Branchen für A15.
7. Porträtfoto Pascal.
