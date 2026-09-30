# NeXify AI · Organisations- und Betriebshandbuch

**Fassung 1.0 · 27.09.2026 · Status: Entwurf zur Endabnahme durch Pascal Courbois.**
Führt alle bisherigen Dokumente unter `docs/` zusammen und ist ab jetzt die oberste Ordnung für Abteilungen, Rollen, Abläufe und Normbezug. Detailregeln bleiben in den verlinkten Fachdokumenten.

Leitsatz: **Ein Mensch entscheidet, Agenten arbeiten, der Director hält den Zustand, jeder Schritt hinterlässt einen Nachweis.**

---

## 1 · Aufbau: eine Person, zehn Bereiche, viele Agenten

NeXify AI ist ein Einzelunternehmen (Venlo, Inhaber Pascal Courbois). „Abteilung“ heißt hier: klar abgegrenzter Verantwortungsbereich mit eigenem Ablauf, eigenen Agenten und eigener Kennzahl. Pascal ist in jedem Bereich die entscheidende Stelle. Agenten bereiten vor und führen aus, sie entscheiden nie über Geld, Recht, Freigabe oder Außenwirkung.

| # | Bereich | Verantwortet | Agenten | Kennzahl | Norm-/Rechtsbezug |
|---|---|---|---|---|---|
| A1 | Leitung & Strategie | Ziele, Preise, Freigaben, Managementbewertung | Director, Berater (KI-Council) | Deckungsbeitrag je Monat | ISO 9001:2026 Kap. 5, 9.3 |
| A2 | Vertrieb | Anfrage bis Auftrag | Eingang, Angebot | Anfrage→Auftrag-Quote, Reaktionszeit | UWG, BGB §§ 145 ff. |
| A3 | Marketing & Inhalte | Website, Texte, Kampagnen, Bilder | Texter, Designer, SEO | qualifizierte Anfragen je Monat | UWG § 5, KI-VO Art. 50 |
| A4 | Projektleitung | Auftrag bis Abnahme, Termine, Tagesbericht | Director, Planer | Termintreue, Tagesbericht bis 20:00 | ISO 9001 Kap. 8.1–8.5 |
| A5 | Entwicklung & Design | Umsetzung, Code, UI | Umsetzer, Designer | E3-Quote, Nacharbeit | ISO 9241-110/-210, WCAG 2.2 AA |
| A6 | Qualität & Prüfung | Review, Tests, Gate, Gutachten | Prüfer, Gate, Gutachten-Kette | Befunde nach Abnahme | ISO 9001 Kap. 8.6, 8.7, 10 |
| A7 | Betrieb & IT | Hosting, Überwachung, Sicherung, Vorfälle | Wächter | Verfügbarkeit, Wiederherstellungstest | ISO/IEC 27001, BSI IT-Grundschutz |
| A8 | Kundenservice & Partner | Kunden, Werkstätten, Nachbarschaftskunden, Affiliates | Support Kunde, Support Werkstatt | Lösungszeit, Zufriedenheit | DSGVO Art. 12–22 |
| A9 | Finanzen & Buchhaltung | Rechnung, Mahnung, Journal, Steuern | Abrechnung | offene Posten, DSO | GoBD, UStG, NL-BTW |
| A10 | Recht, Datenschutz & KI-Governance | Rechtstexte, AVV, Löschung, KI-Aufsicht | – (nur Prüfhilfe) | offene Datenschutzanfragen = 0 | DSGVO, KI-VO, ISO/IEC 42001 |

Vertretung: keine zweite Person vorhanden → Notfallregel (Abschnitt 8). Ergänzung durch externe Fachkräfte (Steuerberatung, Anwalt, Datenschutzbeauftragter nach Bedarf) mit AVV bzw. Mandat.

---

## 2 · Prozesslandkarte (ISO 9001 Prozessansatz)

**Führungsprozesse:** P1 Strategie & Ziele · P2 Managementbewertung (quartalsweise) · P3 Risiken & Chancen · P4 Interne Audits (halbjährlich).

**Kernprozesse (Kundenwert):**
K1 Anfrage → K2 Erstgespräch (30 Min., kostenlos) → K3 Anforderungsprofil → K4 Angebot → K5 Auftrag → K6 Umsetzung (Tagessatz, Tagesbericht) → K7 Prüfung & Gate → K8 Abnahme → K9 Betrieb & Pflege → K10 Weiterentwicklung.

**Unterstützungsprozesse:** U1 Abrechnung · U2 Einkauf & Lieferanten (Hosting, Modelle, Lizenzen) · U3 Wissen & Skills · U4 IT-Betrieb · U5 Datenschutz · U6 Dokumentenlenkung · U7 Kompetenz (Pascal + Agenten-Skills).

Jeder Prozess hat Eigentümer (Pascal), Eingang, Ergebnis, Kennzahl, Nachweis und einen Tag (siehe `docs/01-konzept/myadmin-gesamtplan.md` § 6).

---

## 3 · Kundenreise im Detail (K1–K10)

| Schritt | Kunde sieht | Intern passiert | Mensch | Nachweis | Frist |
|---|---|---|---|---|---|
| K1 Anfrage | Formular / Berater / Mail, Eingangsbestätigung | Eingang-Agent ordnet ein, `#anfrage`, CRM-Eintrag | – | Vorgangsnummer | sofort |
| K2 Erstgespräch | Termin wählen, Video-Call | Vorbereitung: Firmenrecherche, Fragenliste | Pascal führt | Gesprächsnotiz | ≤ 2 Werktage |
| K3 Anforderungsprofil | Profil zur Bestätigung | Langlauf: Sammler, Rechercheur, Analyst, Architekt | Pascal prüft | Profil v1 (Vorlage) | ≤ 2 Werktage |
| K4 Angebot | Angebot im Portal, Preis klar, Tage klar | Angebot-Agent, Preis Rechenkern | Pascal gibt frei | Angebot mit Nummer | ≤ 1 Werktag |
| K5 Auftrag | Annehmen per Klick, AVV mit | Auftrag aus Vorlage, Termine, Kostenstelle | – | Auftragsbestätigung | sofort |
| K6 Umsetzung | Tagesbericht bis 20:00, Vorschau-Link | Director verteilt, Umsetzer, Prüfer getrennt | Stichprobe | Tagesbericht, Commits | täglich |
| K7 Prüfung | „In Prüfung“ | Review, E3-Test, Nutzertest (ISO 9241-210), WCAG 2.2 AA, Gate Stufen 1–4 | – | Freigabe-Nachweis | vor Abnahme |
| K8 Abnahme | Abnahme im Portal, Restpunkte | Gutachten, Endabnahme | Pascal + Kunde | Abnahmeprotokoll | ≤ 5 Werktage |
| K9 Betrieb | Status, Verbrauch, Support | Wächter, Sicherung, Updates | bei Vorfall | Monatsbericht | laufend |
| K10 Weiterentwicklung | Vorschläge mit Kennzahl | Optimierer, Auswertung | Pascal | Maßnahmenliste | quartalsweise |

Kündigung und Übergabe: Code, Daten und Zugänge gehen an den Kunden (Eigentum), Export ≤ 10 Werktage, Löschung nach Frist mit Nachweis.

---

## 4 · Partner-, Nachbarschafts- und Affiliate-Abläufe

**Werkstatt (Partner):** Registrierung → Prüfung (Gewerbenachweis, Adresse, Kontakt, Kriterien offen: E-Offen-1) → Freischaltung durch Pascal → Profil + Partnerseite → Termine & Gutscheine → monatliche Abrechnung.
**Nachbarschaftskunde:** Buchung → Bestätigung → Erinnerung (24 h) → Termin → Bewertung → Gutschein (einmalig, 90 Tage).
**Affiliate:** Anmeldung → Link → Zuordnung letzter Klick 30 Tage → Provision nach Zahlungseingang + Stornofrist → Auszahlung durch Pascal. Werbekennzeichnung Pflicht (UWG § 5a Abs. 4), Provisionssatz offen (E-Offen-2).

---

## 5 · Führung mit Agenten

- **Director** besitzt Zustand und Plan, Modell ist austauschbar (`docs/03-backend/langlauf-orchestrierung.md`).
- **Trennung:** Umsetzer ≠ Prüfer. Prüfer darf nicht vom Umsetzer beauftragt werden.
- **Budgets:** je Agent € pro Tag, harter Stopp, Pausieren über `#stopp`.
- **Stufen:** 0 lokal → 1 günstig → 2 stark, Hochstufung nur bei Unsicherheit (`docs/03-backend/ml-betrieb-eigene-modelle.md`).
- **Selbstverbesserung:** nur mit Fragensatz-Test, nie an Preisen, Rechten, Recht, Sperren.
- **Kennzeichnung:** jede KI-Antwort nach außen als KI erkennbar (KI-VO Art. 50).
- **Aufsicht (ISO/IEC 42001 als Rahmen):** KI-Register (Agent, Zweck, Modell, Daten, Risiko), Protokoll je Aktion, halbjährliche Bewertung.

---

## 6 · Normen- und Rechtsregister

Verifiziert am 27.09.2026, Einzelheiten, Quellen und Zusammenhänge in `docs/01-konzept/normenregister-verifiziert.md`.

| Regelwerk | Gültige Fassung | Wofür |
|---|---|---|
| ISO 9001:2026 | 6. Ausgabe, 16.09.2026 | QM-Rahmen |
| ISO/IEC 27001:2022 + Amd 1:2024 | inkl. Klimawandel-Frage | Informationssicherheit |
| ISO/IEC 42001:2023 | 1. Ausgabe, kein Nachfolger | KI-Management (keine Vermutungswirkung KI-VO) |
| ISO 9241-110:2020 · 9241-210:2019 | DIN EN 2020 | Dialog, menschzentrierte Gestaltung |
| WCAG 2.2 AA · EN 301 549 | V4.1.1 veröffentlicht 02.09.2026, rechtlich V3.2.1 bis Amtsblatt | Barrierefreiheit |
| KI-VO Art. 50 | gilt seit 02.08.2026; Art. 50(2) Bestand ab 02.12.2026 | Transparenz – **einzige bereits geltende harte Pflicht** |
| BFSG, DSGVO/UAVG, GoBD/UStG/BTW | geltend | Recht/Steuern, extern prüfen |

Integriertes Managementsystem: ein Handbuch, ein Risikoregister, ein Auditplan für Qualität, Sicherheit und KI.

## 7 · Qualitätssystem

- **Qualitätspolitik:** „Kennzahl statt Versprechen. Wenn sich ein Projekt nicht lohnt, sagen wir es.“
- **Qualitätsziele 2026/27:** Tagesbericht 100 % bis 20:00 · 0 kritische Befunde nach Abnahme · Reaktion auf Anfragen ≤ 4 Werktagsstunden · Wiederherstellungstest wöchentlich bestanden.
- **Dokumentenlenkung:** Ordner `docs/`, Fassung + Datum in jedem Kopf, Änderungen über GitLab-Merge-Request, alte Fassungen bleiben (Versionen-Ordner).
- **Nichtkonformität:** Befund → Ursache (5-Warum) → Maßnahme → Wirksamkeitsprüfung → Lessons Learned in `learning-captures/`.
- **Interne Audits:** halbjährlich, Gutachten-Kette als Prüfwerkzeug, Selbstprüfung ausdrücklich so benannt.
- **Managementbewertung:** quartalsweise, Vorlage in myADMIN → Cockpit.

---

## 8 · Betrieb, Notfall, Vertretung

| Fall | Regel |
|---|---|
| Pascal nicht erreichbar ≤ 3 Tage | Agenten arbeiten nur Lesend/Vorbereitend, keine Freigaben, Kunden erhalten automatische Abwesenheit mit Rückrufzeit |
| > 3 Tage | Notfallkontakt (festzulegen: E-Offen-3) erhält versiegelten Zugang zu Kundenliste und Übergabeanleitung |
| Vorfall hoch | eine Meldestelle, Kunde binnen 4 h informiert, Nachbericht ≤ 5 Werktage |
| Datenpanne | Art. 33 DSGVO: Behörde ≤ 72 h, Vorlage in `docs/04-betrieb/` |
| Hartsperren | Reboot, Live-DNS, Firewall nur mit Einzelfreigabe im Chat |

---

## 9 · Umsetzungsplan (Arbeitspakete)

| AP | Inhalt | Abhängig | Nachweis | Priorität |
|---|---|---|---|---|
| AP-01 | Vorschau-Stufe einrichten | Einzelfreigabe DNS | Health 60 s | P0 |
| AP-02 | GitLab-Repo, Rechenkern + Langlauf + Tests | – | CI grün | P0 |
| AP-03 | Auth, Rollen, RLS (6 Gruppen) | AP-02 | Negativtest fremde Zeilen | P0 |
| AP-04 | 9router anbinden, Stufen 0–2 | AP-02, Werte Pascal | Rückfall ausgelöst | P1 |
| AP-05 | CRM + Kundenportal K1–K8 | AP-03 | E2E Anfrage→Abnahme | P1 |
| AP-06 | Abrechnung, Rechnung, Mahnung | AP-03 | Storno als Gegenbuchung | P1 |
| AP-07 | Partner- und Affiliate-Abläufe | AP-03, E-Offen-1/2 | E2E Termin, Gutschein, Provision | P2 |
| AP-08 | Wächter, Sicherung, Vorfall | AP-01 | Wiederherstellung ausgeführt | P1 |
| AP-09 | KI-Register, Kennzeichnung überall (KI-VO Art. 50 gilt bereits) | – | Stichprobe je Portal | P0 |
| AP-10 | Rechtstexte je Land prüfen lassen | extern | Anwaltsfreigabe | P1 |
| AP-11 | Normenregister vervollständigen | – | Status je Zeile CURRENT_VERIFIED | P2 |
| AP-12 | Erstes internes Audit + Managementbewertung | AP-01–09 | Auditbericht | P2 |

Reihenfolge: P0 zuerst, jedes AP mit Freigabe-Nachweis. Kein AP gilt ohne E3 als erledigt.

---

## 10 · Offene Entscheidungen (nur Pascal)

- E-Offen-1 Kriterien Werkstatt-Freischaltung
- E-Offen-2 Affiliate-Provision (Satz, Laufzeit, Storno)
- E-Offen-3 Notfallkontakt und Übergaberegel
- E-Offen-4 Tagesbudget je Agent und gesamt
- E-Offen-5 Welche Kundendaten ins Training dürfen
- E-Offen-6 Zertifizierungsziel (ISO 9001 ja/nein, Zeitpunkt)
- sowie E1–E5 aus dem Go-Live-Test und die 9router-Werte

## Verweise

`docs/01-konzept/myadmin-gesamtplan.md` · `docs/03-backend/nexifyai-api-abrechnungskonzept.md` · `docs/03-backend/langlauf-orchestrierung.md` · `docs/03-backend/ml-betrieb-eigene-modelle.md` · `docs/04-betrieb/go-live-abschlusstest-2026-09-27.md` · `docs/04-betrieb/autopilot/` · `docs/01-konzept/anforderungsprofil-vorlage.md` · `AGENT.md`
