# 07 · Betriebs- und Nutzerhandbuch

## A. Für Kundinnen und Kunden (Kundenportal)
1. **Anmelden:** E-Mail + Einmallink (oder Passwort + 2. Faktor bei Schreibrechten). Rollenwechsel oben rechts.
2. **Angebot annehmen:** Portal → Angebote → ansehen → „Zahlungspflichtig annehmen“ (Haken „Ich handle als Unternehmer“ nicht vorbelegt). Fassung und Zeitstempel werden gespeichert.
3. **Projekt verfolgen:** Phase, Tagesbericht bis 20:00 Uhr (Ziel, Prüffälle, Entscheidungen, Kosten). Offene Fragen mit Vorschlag per Klick beantworten.
4. **Abnahme:** L1 (Funktion) · L2 (Test/Gegentest) · L3 (Betrieb) je Baustein; Rüge innerhalb 14 Tagen mit Begründung.
5. **Guthaben (one/one+/API):** aufladen 50–5.000 €, Verbrauch, „reicht ca. X Tage“, Schlüssel je Kostenstelle, Budget, Warnung 50/80 %, Stopp weich/hart.
6. **Rechnungen und Daten:** Rechnungen herunterladen, AVV abschließen, Daten exportieren/löschen, Einwilligungen ändern.
7. **Hilfe:** Ticket eröffnen (SLA sichtbar), NeXify AI fragen, Pascal anrufen (Kontakt im Fuß).

## B. Für das NeXify-Team (Betrieb)
### Tagesablauf
| Zeit | Aufgabe | Nachweis |
|---|---|---|
| 07:30 | Posteingang, Ausnahmen der Nacht, Wächter-Meldungen | Journal |
| tagsüber | Entwicklungstage: Ziel morgens, Rückfragen, Vorschau | Tagesbericht |
| 20:00 | Tagesbericht freigeben und versenden | Berichts-Eintrag |
| 03:00 | Nachtlauf: Wissenspflege, Backups, Selbstheilung | Lauf-Zeile mit Zählern |

### Freigabe-Gate (jede Änderung mit Kundenbetrieb)
Vorschau grün → Health ≥ 60 s stabil → E3-Gegentests → Rollback-Plan → PASS mit Zeitstempel im Log → Endabnahme. Ohne Nachweis: verweigern.

### Störungen (Runbooks-Kurzform)
| Symptom | Erste Prüfung | Maßnahme | Eskalation |
|---|---|---|---|
| Website 502 | Health, Proxy-Log | Dienst neu starten (nur mit Freigabe für Host-Reboot: nie) | Pascal |
| API „DB unavailable“ | Verbindungen, Speicher | Pool zurücksetzen, Lesemodus | Pascal |
| Zahlung „hängt“ | Webhook-Eingang, Signatur | `GET /orders/{id}` nachziehen, nie ohne completed gutschreiben | Buchhaltung |
| Modell fällt aus | Router-Status | Ersatzstufe aktiv, Kunde zahlt genutztes Modell | Info an Kunden |
| Wissens-Antworten schlechter | Regressionstest | Rollback auf letzten Stand | Wissensverantwortliche |
| Alarm ohne Zustellung | Wächter-Zustellprotokoll | Kanal wechseln, Gegentest wiederholen | Pascal |

### Rollen
Kunde · Shop-Kunde · API · Partner · Affiliate · Team (Agentur) · Admin. Rechte additiv, Mandantentrennung per RLS. Prüffall: Rolle A sieht nichts von B.

## C. Katalogpflege Muster-Shop / Kundenshop
CSV-Import (Spalten: sku, name, marke, kategorie, unterkategorie, preis_brutto_cent, ust_klasse, lieferzeit, bestand, attribute, pflichtangaben). Vor Veröffentlichung: Pflichtangaben je Kategorie vollständig (ElektroG, BattG, VerpackG, LMIV, Textilkennzeichnung, Grundpreis), Bild mit Alternativtext. Fehlende Pflichtangabe = Artikel bleibt unveröffentlicht.

## D. Datensicherung und Wiederanlauf
Tägliche Sicherung (DB, Objektspeicher, Konfiguration ohne Geheimnisse), wöchentlicher Restore-Test mit Protokoll; Ziel RTO/RPO je Dienst in `docs/04-betrieb/Betriebsbuch.md` festlegen (offen: Werte).
