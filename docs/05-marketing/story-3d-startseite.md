# Startseite v11 · 3D-Story „Signal → Agent → Ergebnis“ · Drehbuch

**Stand 27.09.2026 · Entwurf** · Entscheidungen Pascal: alle Grafiken, durchgehende 3D-Story, sechs Kundenprobleme, Auftragssystem als Dokument + Oberfläche.

## Dramaturgie (Scroll-Story, 6 Akte)

| Akt | Problem (Kunde) | 3D-Szene | Wow-Moment | Lösung / Beleg |
|---|---|---|---|---|
| 1 Signal | Anfragen bleiben liegen | Dunkler Raum, einzelne Lichtpunkte (Anfragen) fallen ungeordnet, einige verglimmen | Das Signet zündet: sechs Lichtbahnen fangen die Punkte | E-Mail-Agent, Antwort in Minuten (Messwert offen, GL-06) |
| 2 Übergaben | Zu viele manuelle Übergaben | Punkte springen zwischen vier schwebenden Werkzeug-Kacheln hin und her | Kacheln verschmelzen zu einer Bahn | Ein Vorgang, ein Ort (Kundenportal) |
| 3 Angebot | Angebote dauern zu lange | Gespräch als Wellenform formt sich zu einem Dokument | Dokument klappt auf, Status „angenommen“ | Angebots-Automatisierung |
| 4 Wissen | Wissen steckt in Köpfen | Nebel aus Dokumenten, Frage als Lichtstrahl | Strahl trifft genau eine Seite, Fundstelle leuchtet | Wissenssuche mit Fundstelle |
| 5 Termine | Telefonschleife | Kalenderraster in 3D, Anrufe als rote Schleifen | Schleifen lösen sich, ein Feld rastet in Lime ein | Terminbuchung |
| 6 Eigentum | Teure Lizenzen, kein Eigentum | Stapel aus Abo-Karten wächst | Stapel fällt, übrig bleibt ein Schlüssel „gehört Ihnen“ | Code, Daten, Zugänge gehören Ihnen; Tagessatz |

Abschluss: alle Bahnen laufen im Signet zusammen → Erstgespräch.

## Technik

- three.js-Szene als eine fixe Bühne hinter dem Inhalt, gesteuert über Scroll-Fortschritt (0–1 je Akt); Inhalt bleibt Text im Template (bearbeitbar, lesbar ohne 3D).
- Leistungsbudget: < 60k Dreiecke, eine Lichtquelle + Bloom, 60 fps Desktop, reduzierte Fassung mobil; `prefers-reduced-motion` → statische Standbilder je Akt.
- Farben nach CD-Beschluss 26.09.; keine Aussage ohne Beleg (Werte aus Projekten, sonst als Beispiel gekennzeichnet).

## Recherche · Stand 27.09.2026 (erste Runde)

| Problem | Belegte Zahl | Quelle | Einsatz in der Story |
|---|---|---|---|
| Anfragen bleiben liegen | Mittelstand DE: rund 6 % der Unternehmen reagieren mindestens 7 Tage nicht; 23 % der Anrufe werden nicht angenommen (Matelso, 2024) | ldb.de/reaktionszeiten-auf-kundenanfragen-noch-immer-unzureichend | Akt 1 + 5, mit Quelle im Kleingedruckten |
| Anfragen bleiben liegen | Kunden erwarten Antwort nach 1 Stunde; Versicherer brauchen im Schnitt rund 29 Stunden (2018) | ap-verlag.de | Akt 1, als „Erwartung vs. Realität“ |
| Zu viele Übergaben | Beschäftigte nutzen im Schnitt 18 Anwendungen täglich (Hubstaff, Jan. 2026, > 140.000 Beschäftigte) | ad-hoc-news.de, unternehmer.de | Akt 2 |
| Zu viele Übergaben | bis zu 1.200 App-Wechsel pro Tag, rund 9 % der Arbeitszeit (HBR, zitiert) | ad-hoc-news.de, speakwiseapp.com | Akt 2 — **Sekundärquelle, HBR-Original vor Einsatz prüfen** |
| Wissen steckt in Köpfen | 25 % verlieren wöchentlich einen ganzen Arbeitstag mit der Suche in Dokumenten (ABBYY/Sapio, 2021, 5.025 Befragte, u. a. DE) | der-prozessmanager.de | Akt 4 |
| Angebote dauern zu lange | offen | – | Recherche Runde 2 |
| Teure Lizenzen | offen (SaaS-Kosten je Mitarbeiter) | – | Recherche Runde 2 |

Regel: Nur Zahlen mit Quelle, Jahr und Link. Veraltete Studien (vor 2018) nicht verwenden. Sekundärzitate vor Veröffentlichung am Original prüfen.

## Recherche (nächster Schritt)

Öffentliche Quellen zu den sechs Problemen (Antwortzeiten im Mittelstand, Zeitverlust durch Tool-Wechsel, Angebotsdauer, Wissensverlust, Terminorganisation, SaaS-Kosten), je Problem 1–2 Primärquellen mit Zahl, Datum, Link. Nur belegte Zahlen gehen in die Story.

## Auftragssystem (Task-Automate)

- **Dokument:** `docs/03-backend/auftragssystem.md` — Auftragsvorlagen je Baustein, Pflichtfelder, Regeln, Verbote (Hartsperren G1/G2), Direktlinks zu API-Dokumentationen (9Router, Revolut Business, VIES, Supabase, LightRAG, AgentMemory).
- **Oberfläche:** Team-Bereich „Auftrag anlegen“ → Vorlage wählen → Felder, Links, Prüfkriterien.
