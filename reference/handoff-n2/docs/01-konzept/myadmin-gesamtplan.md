# myADMIN · Gesamtplan · Pascals Workspace

**Stand 27.09.2026 · Plan, nicht umgesetzt.** Gilt für NeXify AI, TEILEKLAR, Partner (Werkstätten), Nachbarschaftskunden, Affiliates, API-Kunden. Grundlage: bestehende Dokumente unter `docs/`, Rechenkern `lib/rechenkern.js`, Backend-Architektur `docs/03-backend/backend-architektur.md`, alle an dieses Projekt angehängten Skills.

Leitsatz: **Der Director besitzt den Zustand, das Modell ist ein austauschbarer Arbeiter.** Wissen, Regeln und Kontext liegen einmal aufbereitet vor, damit eine Anfrage nur das Nötige neu kostet.

---

## 0 · Grenzen, die dieser Plan nicht verschiebt

| Grenze | Wirkung |
|---|---|
| Endabnahme durch Pascal | nicht delegierbar, auch nicht an Autopilot |
| Hartsperren | Server-Reboot, Live-DNS, vollständige Firewall-Änderung nur mit Einzelfreigabe im Chat |
| Freigabe-Gate 5 Stufen | Vorschau → 60 s Health → E3 → Rollback → Gutachten + Endabnahme |
| KI-VO Art. 50 | KI-Antworten sind als KI erkennbar |
| DSGVO | EU-Hosting, AVV, Löschfristen, Betroffenenrechte |
| Geld | nur über Rechenkern, idempotent, Storno als Gegenbuchung |
| Selbstverbesserung | ändert nie Regeln, Preise, Rechte, Rechtstexte ohne Freigabe |

„Ein paar Cent“ ist Ziel, nicht Zusage. Messgröße: Kosten je erledigtem Vorgang, täglich im Cockpit.

---

## 1 · Bereiche von myADMIN

| # | Bereich | Zweck | Heute |
|---|---|---|---|
| 1 | Cockpit | Lage, Gate, Entscheidungen, Kosten heute, Alarme | Oberfläche |
| 2 | Aufträge | Auftragssystem mit Vorlagen, Status, Nachweisen | Oberfläche |
| 3 | Agenten | Anlegen, Rollen, Rechte, Budgets, Zustand, Pausieren | Plan |
| 4 | Skills | Bestand, Version, Herkunft, Zertifizierung, Auslöser | Plan |
| 5 | Prompts & Kontext | Bausteine, Versionen, Cache-Schichten, Tests | Plan |
| 6 | Trigger & Tags | Ereignis → Agent/Skill, überall gleich | Plan |
| 7 | Optimierung | Auswertung, Vorschläge, A/B, Übernahme nur mit Test | Plan |
| 8 | Betrieb | Wächter, Vorfälle, Sicherungen, Wartungsfenster | Plan |
| 9 | Kunden | NeXify-Kunden, API-Kunden, Verträge, Guthaben | Plan |
| 10 | Partner | Werkstätten, Profile, Termine, Gutscheine, Abrechnung | Plan |
| 11 | Nachbarschaftskunden | Termine, Gutscheine, Datenrechte | Plan |
| 12 | Affiliates | Links, Zuordnung, Provision, Auszahlung | Plan |
| 13 | API-Abrechnung | Preise, Kostenstellen, Journal, Rechnungen | Rechenkern fertig |
| 14 | Tests & Nachweise | Suiten, Evidenzklasse, Freigabe-Nachweise | Rechenkern 18/18 |
| 15 | Bestand | Seiten, Portale, Druck, Versionen | Oberfläche |
| 16 | Backends | Endpunkte, Verträge, Status | Oberfläche |
| 17 | Dokumente | Handbuch, Konzepte, Gutachten | Oberfläche |
| 18 | Recht & Datenschutz | Rechtstexte-Stand, AVV, Löschläufe, Anfragen | Plan |
| 19 | Einstellungen | Modus, Rollen, Schlüssel (nur Referenz auf OpenBao) | Plan |

---

## 2 · Betriebsabläufe

Jeder Ablauf: Auslöser → Schritte (checkpointbar) → Prüfung → Übergabe → Protokoll. Schreibende Schritte mit Idempotenz-Schlüssel, externe Aufrufe mit Timeout und Backoff.

| Ablauf | Auslöser | Schritte | Mensch |
|---|---|---|---|
| Anfrage → Angebot | Formular, Mail, Berater | Einordnen → Bedarf klären → Angebot aus Vorlage → Preis Rechenkern | Pascal gibt Angebot frei |
| Angebot → Auftrag | Annahme im Kundenportal | Auftrag anlegen → Vorlage → Termine | – |
| Auftrag → Lieferung | Status „In Arbeit“ | Umsetzung → Tests → Vorschau → Gate | Endabnahme |
| Tagesbericht | 19:30 täglich | Zeiten, Ergebnisse, offene Punkte → Kunde bis 20:00 | Stichprobe |
| Rechnung | Monatsschnitt / Tagessatz | Rechenkern → Steuer → PDF → Versand | Freigabe bei Abweichung |
| Mahnung | Fälligkeit + 14 Tage | Erinnerung → 2. Stufe → Übergabe | Pascal ab Stufe 2 |
| Werkstatt-Onboarding | Registrierung Partner | Prüfung Gewerbe → Profil → Partnerseite → Gutscheine | Freischaltung |
| Termin Nachbarschaftskunde | Buchung | Slot sperren → Bestätigung → Erinnerung → Durchführung → Bestätigung | Werkstatt |
| Gutschein | Bestellung Partner / Einlösung | Code erzeugen → Druck → Einlösung einmalig, 90 Tage | – |
| Affiliate-Provision | Zahlung eingegangen | Zuordnung (letzter Klick, 30 Tage) → Storno-Frist → Gutschrift | Auszahlung Pascal |
| Datenrechte | Anfrage Art. 15–21 | Identität → Export/Löschung → Nachweis | Pascal bei Löschung |
| Vorfall | Wächter-Alarm | Einstufen → eine Meldestelle → Behebung → Nachbericht | ab Stufe hoch |
| Sicherung | täglich | Sicherung → wöchentlich Wiederherstellungstest | – |
| Modell-Update | monatlich | Training → Fragentest ≥ alt → Übernahme | Freigabe |

---

## 3 · Agentenverwaltung

**Rollen (je ein Agent, eine Aufgabe):** Director (Plan, Zustand, Verteilung) · Eingang (Einordnen) · Angebot · Umsetzung · Prüfer (unabhängig vom Umsetzer) · Abrechnung · Support Kunden · Support Werkstatt · Wächter · Optimierer.

| Feld | Bedeutung |
|---|---|
| Rolle, Ziel, Grenzen | was er darf und was nicht |
| Werkzeuge | Liste, sonst nichts |
| Skills | zugewiesene Skill-Versionen |
| Budget | € pro Tag und pro Vorgang, harter Stopp |
| Modellstufe | 0 lokal · 1 günstig · 2 stark, Hochstufung nur bei Unsicherheit |
| Modus | Autopilot + Eingriff · Supervised · Manuell |
| Zustand | läuft · wartet · pausiert · Fehler |
| Protokoll | jede Aktion mit Korrelations-ID |

Muster: Orchestrator-Worker. Prüfer ist nie derselbe Agent wie Umsetzer. Jeder Agent hat eine Abschaltung in myADMIN.

---

## 4 · Skill-Verwaltung

| Feld | Inhalt |
|---|---|
| Name, Version, Herkunft, Lizenz | Pflicht nach Skill-Vorlage |
| Zweck, wann, wann nicht | aus dem Skill |
| Auslöser (Tags) | z. B. `#go-live` → freigabe-gate-live-betrieb |
| Zertifizierung | geprüft · ungeprüft · veraltet (G5-Datum) |
| Nutzung | Aufrufe, Erfolg, Kosten |
| Abhängigkeiten | Hilfsdateien, Werkzeuge |

Regeln: Skill vor Aufgabe prüfen (skill-aufruf-disziplin). Veraltete Skills (Aktualitätsvorbehalt überschritten) werden markiert, nicht still genutzt. Neue Skills nur über Vorlage + Testfälle (skill-erstellung-und-evaluation).

---

## 5 · Prompt- und Kontextverarbeitung (Kostenmodell)

**Schichten, von stabil nach flüchtig:**

| Schicht | Inhalt | Änderung | Cache |
|---|---|---|---|
| S1 System | Rolle, Grenzen, Hartsperren | selten | Prompt-Cache |
| S2 Regeln | CD, Design-Norm, Recht, Preise | Freigabe | Prompt-Cache |
| S3 Skills | nur die per Tag ausgewählten | Version | Prompt-Cache |
| S4 Wissen | LightRAG-Treffer mit Fundstelle | je Anfrage | Abfrage-Cache |
| S5 Vorgang | Auftrag, Verlauf (zusammengefasst) | je Schritt | – |
| S6 Eingabe | aktuelle Nachricht | immer | – |

Kostenhebel: stabile Schichten vorne und unverändert (Cache-Treffer) · Wissen nur als Fundstellen, nicht als Volltext · Verlauf zusammenfassen · Modellstufe 0/1 zuerst · feste Ausgabeschemata (kurze Antworten) · Pauschale je Vorgang, wo möglich.

Messung je Vorgang: Tokens neu, Tokens Cache, Stufe, € — im Cockpit und je Kostenstelle.

---

## 6 · Trigger & Tags (überall gleich)

Format: `#tag` in Auftrag, Mail-Betreff, Ticket, Commit, Chat.

| Tag | Wirkung |
|---|---|
| `#anfrage` | Eingang-Agent, Angebotsvorlage |
| `#auftrag` | Auftrag anlegen aus Vorlage |
| `#go-live` | Freigabe-Gate, Nachweis-Zeile |
| `#review` | Code-Review-Prüfkatalog |
| `#gutachten` | Gutachtenkette (Autopilot) |
| `#rechnung` | Abrechnung über Rechenkern |
| `#werkstatt` | Partner-Ablauf |
| `#affiliate` | Provisionsablauf |
| `#dsgvo` | Datenrechte-Ablauf |
| `#vorfall` | Vorfall-Ablauf, Meldestelle |
| `#optimieren` | Optimierer mit Messziel |
| `#stopp` | alle Agenten des Vorgangs pausieren |

Zeitauslöser: 19:30 Tagesbericht · 02:00 Sicherung · stündlich Außenwächter · monatlich Modell-Update und Skill-Aktualität.

---

## 7 · Selbstverbesserung (Auto-Optimierung)

Kreislauf: **messen → Hypothese mit Widerlegung → Variante → Test gegen festen Fragensatz → nur bei gleich gut oder besser übernehmen → protokollieren.**

| Darf automatisch | Nur mit Freigabe | Nie |
|---|---|---|
| Kontextauswahl, Reihenfolge der Schichten | neue Skills, Modellwechsel | Preise, Rechte, Rechtstexte |
| Zusammenfassungslänge | neue Werkzeuge | Hartsperren, Gate-Stufen |
| Modellstufe je Vorgangsart | Prompt-Regeln S1/S2 | Kundendaten ohne Einwilligung ins Training |

Wächter prüft: schlechter gewordene Variante muss erkannt werden (Gegentest mit absichtlich schlechter Variante).

---

## 8 · Rollen und Portale

| Gruppe | Portal | Sieht | Kann |
|---|---|---|---|
| Pascal | myADMIN | alles | alles, Freigaben |
| NeXify-Kunde | Kundenportal | eigene Aufträge, Angebote, Rechnungen, Tagesberichte, API-Verbrauch | annehmen, zahlen, Schlüssel, Kostenstellen |
| API-Kunde | Kundenportal (API) | Guthaben, Verbrauch, Schlüssel | aufladen, Budgets |
| Werkstatt | Partnerportal | Termine, Gutscheine, Profil, Rechnungen | bestätigen, bestellen, pflegen |
| Nachbarschaftskunde | Nachbarschaftsportal | Termine, Gutscheine, Daten | buchen, einlösen, Datenrechte |
| Affiliate | Affiliate-Bereich (neu) | Klicks, Abschlüsse, Provision | Links, Auszahlungsdaten |

Mandantentrennung per RLS, jede Gruppe nur eigene Zeilen.

---

## 9 · Gegenprüfung (Lücken)

| Prüffrage | Ergebnis |
|---|---|
| Jeder Ablauf hat Mensch an der Stelle mit Außenwirkung? | ja (Spalte „Mensch“) |
| Geld überall über Rechenkern + Idempotenz? | ja, Plan; umgesetzt nur Rechenkern |
| Affiliate-Bereich vorhanden? | **fehlt als Oberfläche** |
| Affiliate-Regeln rechtlich geprüft (Kennzeichnung Werbung)? | **offen** |
| Werkstatt-Gewerbeprüfung definiert? | **Kriterien offen** |
| KI-Kennzeichnung in allen Portalen? | **E3 offen** |
| Prüfer unabhängig vom Umsetzer? | ja, Regel |
| Vorschau-Stufe vorhanden? | **nein, Hartsperre DNS** |
| Kosten je Vorgang messbar? | **erst mit Backend** |
| Selbstverbesserung kann Regeln ändern? | nein, gesperrt |
| Löschfristen je Datenart festgelegt? | **offen** |

---

## 10 · Umsetzungsreihenfolge

1. Entscheidungen E1–E5, Einzelfreigabe Vorschau-Stufe.
2. GitLab-Repository, Rechenkern + Tests übernehmen.
3. Auth + RLS + Rollen (Abschnitt 8).
4. Buchungskern, Abrechnung, Rechnung.
5. Director + Agenten-Register + Skill-Register + Tag-Router.
6. Kontextschichten + Kostenmessung.
7. Portale anbinden (18 Endpunkte), Affiliate-Bereich.
8. Wächter, Vorfall, Sicherung.
9. Optimierer — erst wenn 1–8 Messdaten liefern.

Jeder Schritt mit Freigabe-Nachweis.

## 11 · Offen für Pascal

- Affiliate-Provision (Satz, Laufzeit, Storno-Frist).
- Kriterien Werkstatt-Freischaltung.
- Tagesbudget je Agent und Gesamt.
- Welche Kundendaten dürfen ins Training.
- Löschfristen je Datenart (mit Recht).
