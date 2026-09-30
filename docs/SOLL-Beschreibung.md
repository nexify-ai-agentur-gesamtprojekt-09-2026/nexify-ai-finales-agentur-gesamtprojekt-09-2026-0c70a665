# NeXify AI – SOLL-Beschreibung der Gesamtlösung

**Stand:** 28.09.2026 · **Status:** Entwurf zur Freigabe durch Pascal Courbois · **Gilt für:** alle als „aktuell“ geführten Oberflächen in `MANIFEST.md`
**Führend bei Widerspruch:** 1. Rechtstexte und Freigaben Pascal · 2. `config/fakten.json` (Zahlen, Preise, Fristen) · 3. diese SOLL-Beschreibung · 4. Bände `docs/paket/00–13` · 5. Oberflächen.

> Ziel dieses Dokuments: Nach dem Lesen ist klar, **welche Seiten es gibt, wer sie nutzt, in welcher Reihenfolge man sie durchläuft, was jede Seite leisten muss, welche Dienste dahinterstehen und woran die Abnahme gemessen wird.** Was im IST noch abweicht, steht in Abschnitt 11.

---

## 1. Zweck und Abgrenzung

NeXify AI ist eine KI-Automatisierungsagentur (Inhaber Pascal Courbois). Die Gesamtlösung ersetzt alle bisherigen Einzellösungen (alte Websites, alter Shop, DSH, altes mzADMIN) durch **eine** Anwendung mit gemeinsamem Konto, gemeinsamer Datenbank, gemeinsamem Regelwerk und gemeinsamer Protokollierung.

| Marke | Rolle | Gestaltung |
|---|---|---|
| **NeXify AI** | Agentur, Plattform, API, interne Werkzeuge | NEXIFYAI-CD-2026 (Dunkelgrund, Neon-Akzent, Helvetica, Geist Mono für Zahlen) |
| **TEILEKLAR** | Autoteile-Shop mit Werkstattnetz (Kundenprojekt/Eigenprodukt) | eigene Marke, eigene Tokens – **nie** mit NeXify-CD mischen |

**Nicht Teil der Lösung:** echte Zertifizierung, Rechtsberatung, Live-Deployment ohne Freigabe-Gate, Hartsperren (Server-Neustart, Live-DNS, vollständige Firewall-Änderung).

## 2. Nutzergruppen und Einstiege

| Gruppe | Wer | Einstieg | Ziel |
|---|---|---|---|
| G1 Interessent | Unternehmen, Bildungsträger, Behörde | Agentur-Website, Wissenshub, Local-SEO-Seite, Suche | Angebot anfragen oder API-Konto anlegen |
| G2 Kunde | Unternehmen mit Vertrag | Einladung aus Angebot, Kundenportal | Angebot annehmen, Projekt verfolgen, Rechnungen |
| G3 API-Kunde | Entwickler/IT eines Unternehmens | API-Landingpage | Guthaben aufladen, Schlüssel nutzen, Kosten steuern |
| G4 Werkstattpartner | Kfz-Werkstatt | Partner werden, Werkstatt-Partnerseite | Termine, Gutscheine, Abrechnung |
| G5 Nachbarschaftskunde | Endkunde einer Partnerwerkstatt | Gutschein-Link | Gutschein einlösen |
| G6 Affiliate | Empfehlungsgeber | Affiliate-Einladung | Links, Provisionen |
| G7 Shopkunde | Privatkunde TEILEKLAR | Shop, Suche | Passendes Teil kaufen |
| G8 Pascal / Team | intern | Anmeldung → Workspace | Agentur führen |

**Grundsatz Konto:** ein Konto je Person, mehrere Rollen möglich (Kunde, Partner, Nachbarschaft, Affiliate, intern). Rollenwahl bei der Registrierung, weitere Rollen später hinzufügbar. B2B-Angebote (Agentur, API) nur für Unternehmer im Sinne § 14 BGB.

## 3. Informationsarchitektur (Sitemap SOLL)

```
Öffentlich · NeXify AI
├── Agentur-Website ............ NeXifyAI Cloud v10.dc.html
│   ├── Leistungen / Preise / Kontakt (Abschnitte)
│   ├── NeXify AI API .......... NeXify API.dc.html  (#start #preise #konsole #fragen)
│   │   └── API-Rechtliches .... API-Rechtliches.dc.html
│   ├── Wissenshub ............. NeXifyAI-Wissenshub-Artikel.dc.html
│   ├── Vor Ort (Local SEO) .... NeXifyAI-Local-SEO-Muster.dc.html
│   ├── Partner werden ......... Partner-werden.dc.html
│   └── Rechtliches ............ Impressum · Datenschutz · AGB · Barrierefreiheit (Fußzeile, jede Seite)
├── Companion (Chat-Widget) .... NeXify-AI-Companion.dc.html (eingebettet, keine eigene Seite)
└── Visitenkarte ............... Visitenkarte-Pascal-Courbois.dc.html (QR-Ziel)

Öffentlich · TEILEKLAR
├── Shop ....................... TEILEKLAR Shop.dc.html
│   ├── Fitment-Checker ........ Fitment-Checker.dc.html
│   ├── Reifenrechner .......... Reifenrechner.dc.html
│   └── Batterie-Berater ....... Batterie-Berater.dc.html
├── Werkstatt-Partnerseite ..... Werkstatt-Partnerseite.dc.html
└── Unterlagen ................. Partner-Broschüre · Partner-Präsentation · Investoren-Präsentation

Konto (gemeinsam)
├── Anmeldung .................. Anmeldung.dc.html
├── Kundenwege ................. Kundenwege.dc.html  (?weg=reg | ang | ob, ?rolle=…)
└── Mein Konto (TEILEKLAR) ..... Konto.dc.html

Portale (nach Anmeldung, je Rolle)
├── Kundenportal ............... Kundenportal.dc.html
├── Partnerportal .............. Partnerportal.dc.html
├── Nachbarschaftskunden ....... Nachbarschaftskunden-Portal.dc.html
├── Affiliate-Portal ........... Affiliate-Portal.dc.html
└── API-Konsole ................ NeXify API.dc.html#konsole

Intern (Rolle „intern“, 2. Faktor Pflicht)
├── Workspace (Startseite) ..... NeXify Workspace.dc.html
├── Posteingang ................ NeXify Posteingang.dc.html
├── Leitstand .................. NeXify Leitstand.dc.html
├── myADMIN .................... myADMIN v2.dc.html
├── Organisation ............... NeXify Organisation.dc.html
├── Zielverfolgung ............. Zielverfolgung.dc.html
├── Architektur ................ Architektur.dc.html
├── Geschäftsdokumente ......... Geschaeftsdokumente-Vorlagen.dc.html
└── Kundenbroschüre ............ Kundenbroschuere.dc.html

Projektdokumentation (kein Produkt) docs/projektseiten/ (Start, Architektur, Zielverfolgung, Organisation)
Bausteine (keine eigenen Seiten) NX-Header · NX-Footer · NX-Intern · Rechtliches.dc.html (Rechtsabschnitte)
```

**Entfernt (28.09.2026):** alle ersetzten Fassungen und Skizzen – siehe MANIFEST.md.

## 4. Seitenfolgen (User Journeys)

Jede Folge nennt Seite → Aktion → nächste Seite. **Jede Folge endet an einem klaren nächsten Schritt**, nie in einer Sackgasse.

### F1 Interessent → Anfrage → Angebot
1. Agentur-Website (oder Wissenshub/Local SEO → Website) · Kernnutzen, Leistungen, Preise
2. CTA „Erstgespräch anfragen“ → Kontaktformular (Website) · Pflicht: Name, geschäftliche E-Mail, Anliegen; freiwillig: Telefon, Firma
3. Bestätigungsschirm + E-Mail „Anfrage eingegangen, Antwort innerhalb der zugesicherten Frist“ (Frist aus `config/fakten.json`)
4. Intern: Posteingang → Karte → Workspace (S1-Orchestrator bereitet Angebot vor, Pascal gibt frei)
5. Angebot per E-Mail mit Einladungslink → **F2**

### F2 Angebot annehmen (Kundenwege `?weg=ang`)
1. Einladungslink → Kundenwege: Passwort setzen (Link beweist die Adresse, keine zweite Bestätigung)
2. Einwilligungen (Pflicht: AGB/Datenschutz; freiwillig nicht vorbelegt)
3. Angebot prüfen: Positionen, Summe netto/USt/brutto in Cent gerechnet, Gültigkeit, Version
4. Haken: Unternehmer · zeichnungsberechtigt · AGB-Fassung; optional Bestellnummer
5. „Zahlungspflichtig annehmen“ (Button-Lösung § 312j BGB sinngemäß) → idempotent, Ereignis `angebot.angenommen`
6. Danke-Schirm → **F3**
- Ablehnen: Grund optional → Status „abgelehnt“, Pascal wird benachrichtigt
- Abgelaufen/neue Version: kein Annehmen, Hinweis „neue Fassung anfordern“

### F3 Erstbesuch Kundenportal mit Onboarding (Kundenwege `?weg=ob`)
Schritte (Pflicht fett): Willkommen → **Rechnungsdaten** → Team einladen (nur Firmen-Admin) → **Kickoff-Termin** (frühestens morgen) → Sicherheit (2. Faktor) → Fertig → Kundenportal.
Pausieren jederzeit, Fortsetzen an gleicher Stelle; Bestandsdaten werden nicht erneut abgefragt.

### F4 Registrierung (Kundenwege `?weg=reg`)
1. **Schritt 1 von 3 – Rolle** (übersprungen bei `?rolle=…`, Zurück bleibt möglich)
2. **Schritt 2 von 3 – Zugangsdaten:** E-Mail (Tippfehler-Vorschlag, kein Bestätigungsfeld), Passwort ≥ 12 Zeichen (Anzeigen-Knopf, Einfügen erlaubt)
3. **Schritt 3 von 3 – Einwilligungen:** Pflicht AGB/Datenschutz, freiwillig Newsletter/Analyse, nichts vorbelegt
4. „Konto kostenlos anlegen“ → Bestätigen-Schirm; Link 24 h gültig; erneut senden frühestens nach 1 min, höchstens 5 je Stunde
5. Link → Konto aktiv → rollenabhängiges Onboarding bzw. Portal
- Bestehende Adresse: identische Antwort (kein Ausspähen), E-Mail „Sie haben bereits ein Konto“

### F5 API-Kunde (Prepaid)
1. API-Landingpage `#start` → „Konto kostenlos anlegen“ (`?weg=reg&rolle=kunde`) oder „Kosten vorab berechnen“ (`#preise`)
2. F4 Registrierung → F3 Onboarding (Rechnungsdaten mit USt-IdNr.-Prüfung)
3. Konsole `#konsole`: Guthaben aufladen (Revolut Business Pay oder Karte, Mindestbetrag laut `config/fakten.json`)
4. Webhook bestätigt Zahlung → Guthaben gutgeschrieben → Rechnung/Beleg (§ 14 UStG) als PDF
5. Schlüssel je Kostenstelle anlegen (einmal sichtbar), optional Monatsbudget
6. Nutzung: Reservierung Höchstkosten → Abbuchung Ist-Kosten → Journal
7. Unterschreitung Warnschwelle → E-Mail; optional Auto-Aufladung (nur mit hinterlegter Zahlart und Obergrenze)
8. Kündigung → Restguthaben-Erstattung laut API-Rechtliches

### F6 Werkstattpartner
Partner werden / Werkstatt-Partnerseite → F4 (`rolle=partner`) → Onboarding Partner (Stammdaten, Leistungen, Öffnungszeiten, Auszahlungskonto) → Partnerportal (Termine, Gutscheine, Abrechnung).

### F7 Nachbarschaftskunde
Gutschein-Link/QR → Nachbarschaftskunden-Portal → Gutschein prüfen → einlösen oder Termin bei Partnerwerkstatt → Bestätigung.

### F8 Affiliate
Einladung → F4 (`rolle=affiliate`) → Affiliate-Portal (Links, Klicks, Provisionen, Auszahlung). Keine Provision ohne nachvollziehbare Zuordnung.

### F9 Shopkunde TEILEKLAR
Shop → Fahrzeug wählen (HSN/TSN oder Modell) → Fitment-Checker bestätigt Passung → Warenkorb → Kasse (Button-Lösung, Widerrufsbelehrung B2C) → Bestellbestätigung → Konto (Bestellungen, Rücksendung). Reifenrechner und Batterie-Berater führen immer zurück in den Shop mit gefiltertem Ergebnis.

### F10 Intern – Agentur führen
Anmeldung (2. Faktor) → **Workspace** (Chat mit S1-Orchestrator, Ablauf je Antwort im Seitenfeld) → Posteingang (Anfragen, Support, Rechnungen) → Leitstand (Betrieb, Kennzahlen, Selbstheilung, Freigaben) → myADMIN (Einstellungen, Schlüssel, Rollen) → Organisation · Zielverfolgung · Architektur · Geschäftsdokumente.
Jede folgenreiche Aktion (Versand, Preis, Rechtstext, Deploy, Löschen) läuft über das Regelwerk und braucht Pascals Bestätigung.

## 5. Seitenkatalog – Pflichtinhalte je Seite

| Seite | Zweck | Pflicht-Elemente | Hauptaktion | Dienste |
|---|---|---|---|---|
| Agentur-Website | Positionierung, Anfrage | Hero mit Kernnutzen, Leistungen, Preise/Pakete, Ablauf, FAQ, Kontakt, Fußzeile Recht | Erstgespräch anfragen | Formular → Gateway → Posteingang |
| NeXify API | Produkt Prepaid-API | Hero, Ausgangslage, 3 Schritte, Kosten im Griff, Preise mit Rechner, Konsole, FAQ, Abschluss-CTA | Konto kostenlos anlegen | Kundenwege, Zahlung, Guthaben, Journal |
| API-Rechtliches | Nutzungs- und Prepaid-Bedingungen, AVV-Verweis, KI-Kennzeichnung | Fassung + Datum, Zurück zur API | – | Rechtstext-Register |
| Wissenshub | Fachartikel (SEO/GEO) | Autor, Datum, Quellen, CTA passend zum Thema | Erstgespräch / API | pSEO-Prüfung |
| Local SEO | Standortseite | echte lokale Angaben, kein reiner Städtetausch | Erstgespräch | pSEO-Prüfung (`lib/pseo.js`) |
| Partner werden | Werkstätten gewinnen | Nutzen, Konditionen, Ablauf | Partner-Konto anlegen | Kundenwege `rolle=partner` |
| Companion | Chat-Einstieg | KI-Kennzeichnung, Übergabe an Mensch | Frage stellen | Anfrage-Pipeline S1 |
| Anmeldung | Zugang | E-Mail, Passwort, 2. Faktor (intern Pflicht), Passwort vergessen, Registrieren | Anmelden | Auth |
| Kundenwege | Registrierung, Angebotsannahme, Onboarding | Fortschritt, Validierung inline, Zurück, Pausieren | je Weg | `lib/kundenwege.js` |
| Kundenportal | Kundenbereich | Angebote, Projekte, Abnahmen, Rechnungen, Team, Sicherheit | offene Aufgabe | Gateway |
| Partnerportal | Werkstattbereich | Termine, Gutscheine, Abrechnung | Termin bestätigen | Gateway |
| Nachbarschaftskunden | Gutschein | Code-Prüfung, Einlösen, Termin | Einlösen | Gateway |
| Affiliate-Portal | Empfehlungen | Links, Statistik, Provision, Auszahlung | Link kopieren | Gateway |
| Shop + Werkzeuge | Verkauf TEILEKLAR | Fahrzeugwahl, Passung, Preis inkl. USt, Versand, Kasse | In den Warenkorb | Katalog, Bestellung |
| Konto (TEILEKLAR) | Shopkonto | Bestellungen, Adressen, Rücksendung, Einwilligungen | – | Gateway |
| Workspace | interne Startseite | Chat S1, Seitenfeld (Ablauf, Quellen, Läufe), Modellwahl, Freigaben | Nachricht senden | Anfrage-Pipeline, Langfuse |
| Posteingang | Eingänge | Filter, Karten, Zuweisung, Antwortentwurf | Karte bearbeiten | Versand, Regelwerk |
| Leitstand | Betrieb | Kennzahlen, Selbstheilung, Nachtlauf, Runbooks, Freigaben | Freigabe erteilen | Betriebskennzahlen, Selbstheilung |
| myADMIN | Verwaltung | Rollen, Schlüssel (OpenBao), Integrationen, Einstellungen | Speichern | Einstellungen |
| Geschäftsdokumente · Kundenbroschüre | Vorlagen, Druck | Fassung, Datum | – | Dateiablage |

## 6. Navigation und Verlinkung (Regeln)

1. **Kopf** (NX-Header) auf jeder öffentlichen NeXify-Seite: Logo → Website · Leistungen · API · Wissenshub · Partner · Anmelden/Konto.
2. **Fuß** (NX-Footer) auf jeder Seite: Impressum · Datenschutz · AGB · Barrierefreiheit · Cookie-Einstellungen · Claim „Chat it. Automate it.“
3. **Intern:** Leiste `NX-Intern` mit Workspace · Posteingang · Leitstand · myADMIN · Geschäftsdokumente – auf jeder internen Seite identisch, aktive Seite markiert, Betriebsstatus, Abmelden. Unter 1200 px als Menü.
4. **Portale:** Rollenwechsler, wenn ein Konto mehrere Rollen hat.
5. **Keine Sackgasse:** jede Seite hat mindestens einen Weg zurück und einen nächsten Schritt.
6. **Keine verwaiste Seite:** jede Seite hat mindestens einen eingehenden Link aus der Navigation (Ausnahme: Einladungs-/QR-Ziele, dort dokumentiert).
7. **Tiefe Links** mit Parametern (`?weg=`, `?rolle=`, `#konsole`) sind stabil und in `tools/verweise.js` geprüft.
8. **Externe Links** mit `rel="noopener"`; Rechtsseiten ohne Tracking.

## 7. Querschnittliche Anforderungen

| Bereich | SOLL | Nachweis |
|---|---|---|
| Gestaltung NeXify | CD-2026, Dunkelgrund, Neon nur auf Dunkel oder als Fläche mit dunklem Text | Kontrastprüfung, Regelwerk |
| Abstände | 8-px-Raster (4/8/16/24/32/48/64), keine Überlappung | Normprüfung Layout |
| Barrierefreiheit | WCAG 2.2 AA / BITV 2.0 / EN 301 549; Kontrast ≥ 4,5:1; Ziele ≥ 44 × 44 px; Tastatur vollständig; Fokus sichtbar | Prüfplan Band 11 |
| Responsiv | ab 320 px ohne waagerechtes Scrollen | Prüfplan |
| Sprache | ausschließlich Deutsch, deutsches Zahlen-/Datumsformat | Inhaltsabgleich |
| Fakten | Zahlen/Preise/Fristen nur aus `config/fakten.json` | CI-Schranke Inhaltsabgleich |
| Ehrlichkeit | keine erfundenen Zahlen, Logos, Zitate, Zeitversprechen | Review, UWG § 5 |
| Datenschutz | DSGVO, TDDDG § 25; Einwilligungen getrennt, nicht vorbelegt, widerrufbar; Hosting Frankfurt | Regelwerk, Band 05 |
| KI | Kennzeichnung jeder KI-Antwort (EU AI Act Art. 50), Übergabe an Mensch | Pipeline |
| Mandanten | Zeilenebene (RLS), `tenant_id` Pflicht | `tools/mandanten-pruefung.js`, ADR-0008 |
| Geld | Beträge in Cent (Ganzzahl), USt ausgewiesen, Rechnung § 14 UStG | Kern-Prüffälle |
| Schreibende API | Idempotency-Key, Fehlerformat RFC 9457 | OpenAPI 1.1.0 |
| Beobachtbarkeit | Langfuse-Trace je Antwort, Ereignisse je Journey-Schritt | Band 05 |

## 8. Dienste und Schnittstellen hinter den Seiten

| Dienst | Aufgabe | Kern / Datei |
|---|---|---|
| Gateway (REST, `api/openapi.yaml`) | einzige Schnittstelle der Oberflächen | OpenAPI 1.1.0 |
| Auth | Konto, Sitzung, 2. Faktor | Supabase Auth |
| Kundenwege | Registrierung, Angebot, Onboarding | `lib/kundenwege.js` |
| Anfrage-Pipeline | Companion/Workspace → S1 → Antwort | `lib/anfrage-pipeline.js`, `lib/ki-muster.js`, `lib/prompt-cache.js` |
| Regelwerk | erlaubt/verbietet Aktionen, Freigaben | `lib/regelwerk.js`, `config/regelwerk.json` |
| Versand | E-Mail mit Zustellbarkeitsprüfung | `lib/versand.js` (Resend) |
| Zahlung | Revolut Business Pay, Karte; Webhooks | API-Kerne, Band Plattform |
| Guthaben/Journal | Reservierung, Abbuchung, Kontoauszug | API-Kerne |
| Wissen/RAG | Suche mit Quellen, pgvector 768 | Migration 005/006 |
| Beobachtung | Langfuse, Betriebskennzahlen | `lib/langfuse.js`, `lib/betriebskennzahlen.js` |
| Selbstheilung/Nachtlauf | Prüfen, Reparieren im erlaubten Rahmen, Berichten | `lib/selbstheilung.js`, `lib/nachtlauf.js` |
| Geheimnisse | OpenBao | `install.sh` |

## 9. Zustände, Fehler und Leerzustände (Pflicht je Seite)

Jede Seite deckt ab: **Laden** (Platzhalter in Endgröße) · **Leer** (erklärt, was hier erscheint, plus erste Aktion) · **Fehler** (verständliche Meldung, Code, Wiederholen, nie Formular leeren) · **Keine Berechtigung** (gleiche Antwort wie „nicht vorhanden“) · **Offline/Zeitüberschreitung** · **Erfolg** (Bestätigung + nächster Schritt).

## 10. Abnahme

Eine Seite ist abgenommen, wenn: (1) alle Pflicht-Elemente aus Abschnitt 5 vorhanden, (2) ihre Folgen aus Abschnitt 4 vollständig durchklickbar, (3) Querschnitt aus Abschnitt 7 erfüllt, (4) CI-Schranken grün (`verweise`, `inhaltsabgleich`, `mandanten-pruefung`, `code-regeln`, Kern-Prüffälle), (5) Prüfplan Band 11 für die Seite bestanden, (6) Pascal hat freigegeben. Live erst nach Freigabe-Gate (Vorschau, Health ≥ 60 s, Rollback geprüft).

## 11. Abweichungen IST → SOLL (Stand 28.09.2026, aus Linkanalyse)

| # | Abweichung | SOLL | Priorität |
|---|---|---|---|
| A1 | ~~Keine eingehenden Links: Wissenshub, Local SEO, Partner werden~~ | **erledigt 28.09.2026:** NX-Header (cloud) führt API, Wissenshub, Partner werden; NX-Footer verlinkt Wissenshub, Companion, API | – |
| A2 | ~~Interne Seiten ohne gemeinsame Seitenleiste~~ | **erledigt:** `NX-Intern.dc.html` oben auf allen 9 internen Seiten, aktive Seite markiert, Betriebsstatus, Abmelden; im Druck ausgeblendet | – |
| A3 | ~~Leitstand und myADMIN nur aus dem Workspace erreichbar~~ | **erledigt:** über NX-Intern | – |
| A4 | ~~Portale ohne Anmelden/Abmelden~~ | **erledigt:** NX-Header zeigt bei `angemeldet` Konto je Rolle + Abmelden; Kundenportal, Partnerportal, Nachbarschaft, Konto, Affiliate übergeben Rolle | – |
| A5 | ~~Affiliate/Nachbarschaft ohne Einstieg nach Registrierung~~ | **erledigt:** Kundenwege leitet nach Bestätigung je Rolle zu Kundencenter, Partnerportal, Gutschein oder Affiliate-Portal | – |
| A6 | Kontaktformular der Website (F1) nicht als eigener Kundenweg im Kern abgebildet | Weg `anfrage` in `lib/kundenwege.js` mit Prüffällen | mittel |
| A7 | Rechtsseiten fehlten; Fußzeilen-Links zeigten auf nicht vorhandene Anker | **teilweise erledigt:** `Rechtliches.dc.html` mit 8 Abschnitten (Impressum, Datenschutz, AGB, AGB Shop, Widerruf, Versand, Barrierefreiheit, Cookies), alle 11 Fuß-Links umgelenkt, keine toten Anker mehr. **Offen:** Wortlaut (E12) – Abschnitte sind sichtbar gesperrt, kein Platzhaltertext | hoch |
| A8 | Visitenkarte, Companion ohne dokumentierten Einstieg | als QR-/Einbettungsziel in Abschnitt 3 geführt – Ausnahme dokumentiert | niedrig |
| A9 | Rechtstexte API als Entwurf | anwaltliche Prüfung, Freigabe Pascal | hoch |
| A10 | Preise API als Beispielwerte | Freigabe echter Preise in `config/fakten.json` | hoch |

## 11a. Gesamtprüfung 28.09.2026
Verweisprüfung über alle 34 aktuellen Oberflächen: **0 tote Links** (Seiten, Bilder, Bausteine). Jede Seite ist über Kopf, Fuß, interne Leiste oder Übersicht erreichbar. Nicht geprüft: Anker innerhalb der Seiten, Darstellung nach dem Einbau der Leisten auf allen 12 geänderten Seiten (nur Workspace durch die Prüfinstanz).

## 12. Offene Entscheidungen (Pascal)

E1 Freigabe dieser SOLL-Beschreibung · E12 Wortlaut Rechtsseiten · E14 Betriebsstatus-Quelle für NX-Intern (Health-Endpunkt) · E2 Rechtstexte API · E3 Mindestaufladung 25 € oder 50 € · E4 Social Login (Google/Microsoft) · E5 echte API-Preise · E6 ADR 0005/0007/0008 · E7 Prompt S1 2.0.0.

---
*Pflege: Jede neue oder geänderte Seite aktualisiert Abschnitte 3–5 und 11 im selben Änderungsschritt. Verweise prüft `tools/verweise.js`.*

## 13. Gestaltungsschliff 28.09.2026 (systemweit)
- Karten: Radius 12, Rahmen #3E4240, Tiefe = Kantenlicht oben + weicher Schatten; Radien 14/17/5 px auf Skala (12/16/4) gebracht.
- Doppelte CSS-Deklarationen entfernt (Workspace, myADMIN).
- Website: Vertrauensleiste als Raster, Unterseiten-Köpfe ohne Doppelung (Brotkrumen + Titel), H1 der Unterseiten auf Skala, Preisraster dreispaltig, Companion-Hinweis erst nach 45 s und Scrollen, Claim einheitlich „Chat it. Automate it.“
- Kopfzeile: „Anmelden als“ nur abgemeldet; angemeldet Konto je Rolle + Abmelden.
- Prüfvermerke (Betreiberdoku) aus Kundenansichten genommen: Anmeldung, Konto, Kundenwege (`?pruefen=1` bzw. Prop `normhinweise`).

## 14. Normlauf 28.09.2026 (alle Seiten, vor und nach Anmeldung)
Prüfung statisch über alle 34 Seiten; Befunde und Behebung:

| Norm / Regel | Befund | Behebung |
|---|---|---|
| WCAG 2.2 3.1.1 Sprache | 16 Seiten ohne `lang` | `lang="de"` gesetzt |
| WCAG 2.4.1 Blöcke umgehen | 12 Seiten ohne Sprunglink/`main` | Sprunglink „Zum Inhalt springen“ + `id="inhalt"`; **zurückgenommen**: NX-Header liefert bereits systemweit „Direkt zum Inhalt“ → `#inhalt`; stattdessen fehlende Sprungziele `id="inhalt"` auf 7 Seiten gesetzt |
| WCAG 2.4.7 Fokus sichtbar | 153 Knöpfe/Links ohne Fokusstil | `style-focus` Lime 2 px systemweit |
| WCAG 1.4.3 Kontrast | 115 Stellen 11–12 px in #9AA2A6/#9CA29E (4,6:1, knapp) | auf #BCC1BD (7,4:1) |
| WCAG 2.5.8 / DIN EN ISO 9241-410 Zielgröße | 134 Knöpfe < 44 px (119 im Shop) | min. 44 × 44 px bei expliziter Höhe; Hero-Chips und Markenleiste nachgezogen (Prüfinstanz) |
| WCAG 1.3.1 / 4.1.2 Beschriftung | Eingaben ohne Label: Fitment-Checker HSN/Fahrzeug, Shop Kontakt, Workspace Baukasten | `aria-label` ergänzt; Rest lag bereits in `<label>` |
| WCAG 1.3.1 Überschriften | Fitment-Checker h1→h3 | erste h3 → h2 |
| DIN 5008 Währung/Prozent | „449€“, „19%“, „€ 12“ | geschütztes Leerzeichen, Zeichen nach Zahl |
| DIN 5008 Uhrzeit | „09.09.2026 14:30“ | „09.09.2026, 14:30 Uhr“ |
| Laufzeit | **Shop stürzte vor Datenladen ab** (Stadtliste leer → `c.name`), **Konto: Syntaxfehler** (`$1`-Rest einer Ersetzung) | behoben; neue CI-Prüfung `tools/render-smoke.js` (erstes Render aller Klassen) |

Nicht geändert, weil zulässig: Shop h2→h3 innerhalb Abschnitt; Prozent in JS-CSS-Werten; ISO-Zeitstempel in Logs (myADMIN, Kundenwege) sind Kennungen, keine Lesedaten.
Offen: Bis-Strich (–) statt Bindestrich in Zahlbereichen wurde nicht automatisch geändert (Verwechslungsgefahr mit Kennungen) – manuelle Durchsicht bei Redaktion der Rechtstexte (E12).

## 15. Standorte TEILEKLAR (28.09.2026)
Standorte sind **Metropolregionen über alle Märkte**, nicht Ortsnamen: 17 Standorte in 6 Ländern (Berlin, Hamburg, München, Köln, Frankfurt, Stuttgart · Wien, Graz · Zürich, Basel, Bern · Amsterdam, Utrecht, Rotterdam · Antwerpen, Brüssel · Luxemburg). Betriebe werden über Entfernung zum Stadtzentrum (Radius 30–45 km) zugeordnet, damit Vororte zählen. Die Standorte-Seite zeigt das ganze Netz nach Land; ein Klick auf einen Standort in einem anderen Land wechselt den Markt mit. Standorte ohne erfasste Betriebe (heute: Bern) erscheinen ehrlich als „im Aufbau“ – kein Ausblenden, keine erfundenen Zahlen. Fuß: die acht Hauptstandorte. Quelle: `assets/workshops.json`; Tabelle `STANDORTE` im Shop.
