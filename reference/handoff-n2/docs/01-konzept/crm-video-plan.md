# CRM · Video · Arbeit im Call · Plan

Stand 27.09.2026 · Plan, Oberfläche in `myADMIN v2` (Bereiche **CRM** und **Call-Raum**). Eigenbau auf offenen Bausteinen, keine SaaS-Abhängigkeit, Betrieb in Frankfurt.

## Was heute läuft (im Browser, ohne Server)
- CRM-Pipeline mit fünf Phasen, Kontakte verschieben, Aktivitäten erfassen (localStorage).
- Call-Raum: eigene Kamera und eigenes Mikrofon (getUserMedia), Stumm/Kamera aus, Dauer, Notizen, Aufgaben, Vertragsvorlage als Vorschau. „Beenden“ schreibt den Call in den CRM-Verlauf.
- Die Gegenseite ist **nicht** verbunden — dafür braucht es den Medienserver (AP-16).

## Architektur

| Baustein | Wahl | Lizenz | Warum |
|---|---|---|---|
| CRM-Daten | eigenes Schema in Postgres (Supabase Frankfurt) | – | ein Datenbestand mit Aufträgen und Abrechnung, RLS |
| Video/Audio | LiveKit Server (SFU) selbst gehostet | Apache-2.0 | WebRTC, Räume, Token je Teilnehmer, Aufzeichnung optional |
| NAT/Firewall | coturn (TURN) | BSD | Verbindung auch hinter Firmennetzen |
| Transkript | Whisper lokal (Stufe 0) | MIT | keine Audiodaten an Dritte |
| Zusammenfassung | eigenes Modell Stufe 0/1 über Director | – | Aufgaben und Notizen aus Transkript |
| Dateien | S3-kompatibel in Frankfurt, signierte URLs | – | Ablage je Kontakt/Auftrag, Virenscan vor Freigabe |
| Verträge | Vorlagen → PDF (Druck-Engine vorhanden) → einfache elektronische Signatur | – | QES nur über zugelassenen Anbieter, falls nötig |
| Kalender | CalDAV-Export, Buchungslink | – | Termine aus CRM und Berater |

## Datenmodell (Kern)
`kontakt(id, firma, person, phase, wert_cent, quelle, eigentuemer, erstellt)` · `aktivitaet(id, kontakt_id, art, text, zeit, autor)` · `call(id, kontakt_id, raum, beginn, ende, aufzeichnung_einwilligung, transkript_ref)` · `aufgabe(id, quelle_call, kontakt_id, text, faellig, status)` · `vertrag(id, kontakt_id, vorlage, version, status, pdf_ref, signiert_am)` · `datei(id, kontakt_id, name, mime, groesse, sha256, scan_status, ref)`.

## Regeln
- **Aufzeichnung nur mit dokumentierter Einwilligung aller Teilnehmer** (Standard aus). Hinweis im Raum sichtbar.
- Transkript und Zusammenfassung sind als KI erzeugt gekennzeichnet (Art. 50 KI-VO).
- Aufbewahrung: Aufzeichnungen 30 Tage, Transkripte bis Vertragsende + gesetzliche Frist — **von Pascal festzulegen**.
- Vertragsversand und Signatur nur nach Freigabe durch Pascal.
- Dateien erst nach Virenscan abrufbar.

## Monitoring
LiveKit-Metriken (Teilnehmer, Paketverlust, Bitrate) · TURN-Auslastung · Fehlerrate Token-Ausgabe · Speicherbelegung Dateien · Wächter mit Außensicht auf Raum-Endpunkt. Alarm über bestehende Meldestelle.

## Arbeitspakete (Fortsetzung von AP-14)

| ID | Inhalt | abhängig | Abnahme |
|---|---|---|---|
| AP-15 | CRM-Schema + RLS + Migration der Beispiel-Pipeline | AP-04 | fremder Mandant 403, 5 Phasen |
| AP-16 | LiveKit + coturn in Frankfurt, Token-Endpunkt | AP-03 | zwei Browser verbunden, 60 s stabil |
| AP-17 | Call-Raum mit Gegenseite, Einladungslink | AP-16 | Link öffnet Raum ohne Konto, läuft ab |
| AP-18 | Verträge: Vorlage → PDF → Signatur → Ablage | AP-15 | Version unveränderlich, Hash gespeichert |
| AP-19 | Dateien: Upload, Scan, signierte URLs | AP-15 | infizierte Testdatei bleibt gesperrt |
| AP-20 | Transkript + Aufgaben aus Call (lokal) | AP-16 | Aufgaben erscheinen im CRM, KI-Hinweis sichtbar |
| AP-21 | Monitoring Video/Dateien | AP-16, AP-19 | abgeschalteter TURN wird gemeldet |

## Abteilungen, Kreativ-Studio, Buchhaltung (myADMIN v2)

- **Abteilungen:** Führung, Vertrieb, Marketing, Kreativ, Produkt & Entwicklung, Betrieb, Buchhaltung, Recht & Datenschutz. Jede mit Agent und Skill. Ideen laufen Idee → Bewertet → Freigegeben → In Arbeit → Live.
- **Kreativ-Studio:** Texte (LinkedIn, Newsletter, Angebot, Anzeige) und Briefings (Bild, Grafik) in NeXify-Stimme, mit festen Regeln im Auftrag. Keine Bildgenerierung: Bilder entstehen aus Briefing durch Gestalter oder echte Fotos.
- **Buchhaltung:** Belege, Monatsübersicht, Steuer-Zahllast, CSV-Export. Hilfsrechnung, keine ordnungsgemäße Buchführung.

| ID | Inhalt | abhängig | Abnahme |
|---|---|---|---|
| AP-22 | Buchhaltung: Belegbilder, Bankabgleich, Export an Steuerberatung, Aufbewahrung | AP-05, AP-19 | Summen = Journal, Export von Steuerberatung akzeptiert |
| AP-23 | Studio serverseitig: Stimmprofil, Freigabe-Schritt, Veröffentlichungsplan | AP-08, AP-09 | kein Text geht ohne Freigabe raus |
| AP-24 | Ideen → Auftrag automatisch ab „In Arbeit“ | AP-06 | Idee erzeugt genau einen Auftrag |

## Offen für Pascal
Aufbewahrungsfristen · ob QES gebraucht wird · Einwilligungstext für Aufzeichnung.
