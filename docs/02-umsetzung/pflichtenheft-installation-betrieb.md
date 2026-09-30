# TEILEKLAR — Pflichtenheft Installation und Betrieb

**Auftraggeber:** TEILEKLAR — Geschäftsbereich von NeXify AI by NeXify, Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande · KvK 90483944 · NL865786276B01
**Dokument:** Pflichtenheft (Umsetzungsspezifikation) zur Installation, Inbetriebnahme und zum laufenden Betrieb
**Version:** 1.0 · **Stand:** 31.08.2026
**Grundlage:** Gesamtprojektplan v1.0, Betriebslogik-Dokumentation, Rechtstextpaket 1.0.0, Shop-Artefakt `TEILEKLAR Shop.dc.html`

> Rechtliche Arbeitsstände und Prüfvermerke gehören in dieses Dokument und in den Gesamtprojektplan — nicht in die Kundenoberfläche. Der Shop zeigt nur belegte Aussagen; alles Vorläufige wird hier geführt.

---

## 1. Zweck und Abgrenzung

Dieses Pflichtenheft beschreibt, **was gebaut, installiert und betrieben werden muss**, damit TEILEKLAR aus dem heutigen Demonstrationsstand in den Verkauf gehen kann. Es ist die verbindliche Umsetzungsspezifikation für Dienstleister und beschreibt je Baustein: Ziel, Anforderungen, Schnittstellen, Abnahmekriterien, Verantwortlichkeit.

**Nicht Gegenstand:** Marketingstrategie, Sortimentsauswahl, Preisstrategie, Vertragsverhandlung mit Lieferanten. Diese sind im Gesamtprojektplan geführt.

## 2. Systemübersicht

| Baustein | Aufgabe | Stand |
|---|---|---|
| Frontend (PWA) | Shop, Beratung, Bestellstrecke, Rechtsansicht, 7 Marktversionen | gebaut (Demonstrationsstand) |
| PIM | Artikelstamm, Maße, Freigaben, Medien, Kategorien | offen |
| Fitment-Datenbank | Fahrzeug-zu-Teil-Zuordnung mit Quelle und Stand | offen |
| ERP/OMS | Aufträge, Rechnungen, Retouren, Bestände | offen |
| Beschaffungsadapter | Bestand, Preis, Bestellung, Tracking je Lieferant | offen |
| Zahlungsanbindung | Marktbezogene Zahlarten, SCA, Rückzahlungen | offen |
| Versandanbindung | Labels, Tracking, Speditionsware, Gefahrgut | offen |
| Kontosystem | Login, Rollen, B2B-Prüfung, Consent-Protokoll | offen |
| KI-Berater (KLARA) | Beratung, Zubehörregeln, Eskalation an Menschen | Regelwerk gebaut, Anbindung offen |
| Werkstattvermittlung | Partnerverzeichnis, Auftragsübergabe, Termine | Datengrundlage vorhanden |
| Monitoring | Verfügbarkeit, Fehler, Datenaktualität, Alarme | offen |

## 3. Installationsanforderungen

### 3.1 Umgebungen

Drei getrennte Umgebungen mit identischer Konfiguration und unterschiedlichen Daten: **Entwicklung**, **Abnahme (Staging)**, **Produktion**. Kein Zugriff der Abnahme auf Produktionsdaten außer anonymisiert. Trennung über eigene Datenbanken, eigene Zugangsdaten, eigene Zahlungs-Sandbox.

### 3.2 Hosting und Betrieb

1. Standort der Datenverarbeitung: EU/EWR. Auftragsverarbeiter mit AVV nach Art. 28 DSGVO.
2. Verschlüsselung: TLS 1.3 nach außen, Verschlüsselung ruhender Daten für personenbezogene Felder.
3. Sicherung: täglich vollständig, stündlich inkrementell, 30 Tage Aufbewahrung, vierteljährlicher Rücksicherungstest mit Protokoll.
4. Wiederherstellungsziele: RPO ≤ 1 Stunde, RTO ≤ 4 Stunden im Verkaufszeitraum.
5. Skalierung: Lastspitzen zum Reifenwechsel (Oktober/November, März/April) mit Faktor 5 gegenüber Normalbetrieb.
6. Protokollierung: Zugriffs-, Fehler- und Änderungsprotokolle 90 Tage, revisionssicher für steuerrelevante Vorgänge nach nationalen Fristen.

### 3.3 Domains und Marktversionen

| Markt | Pfad | Sprache | Währung |
|---|---|---|---|
| Deutschland | /de/ | de | EUR |
| Österreich | /at/ | de | EUR |
| Schweiz | /ch/ | de | CHF |
| Niederlande | /nl/ | nl | EUR |
| Belgien (NL) | /be-nl/ | nl | EUR |
| Belgien (FR) | /be-fr/ | fr | EUR |
| Luxemburg | /lu/ | fr | EUR |

Anforderungen: hreflang-Verknüpfung aller sieben Versionen gegenseitig, x-default auf /de/, kanonische URL je Marktversion, keine automatische Weiterleitung nach IP ohne Wechselmöglichkeit, Marktwechsel behält den aufgerufenen Inhalt.

### 3.4 Progressive Web App

1. Manifest mit Name, Kurzname, Symbolen (192, 512, maskable), Startpfad, Anzeigemodus standalone, Themenfarbe.
2. Service Worker: Kernbestand vorab im Zwischenspeicher; Bilder und Daten nach dem Muster „aus dem Zwischenspeicher anzeigen, im Hintergrund erneuern"; Dokumente „Netz zuerst".
3. Zwischenspeicher-Version bei jeder Auslieferung erhöhen; alte Versionen beim Aktivieren löschen.
4. Offline: Startseite, letzte Produktseiten, Rechtsseiten und Warenkorb müssen ohne Netz lesbar bleiben; Bestellabschluss ohne Netz wird verweigert und erklärt.
5. Installationsknopf nur anzeigen, wenn das Installationsereignis vorliegt; Ersatzhinweis für iOS und Desktop.

## 4. Fachliche Anforderungen (Auszug mit Abnahmekriterien)

### 4.1 Passung und Fahrzeugkontext

| Nr. | Anforderung | Abnahmekriterium |
|---|---|---|
| P-01 | Ohne gewähltes Fahrzeug wird keine Passung behauptet | Alle Statusanzeigen zeigen „Kein Auto gewählt" |
| P-02 | Fahrzeugwahl über Schlüsselnummern und Fahrgestellnummer | Beide Wege führen zur identischen Variante |
| P-03 | Jede Passungsaussage trägt Quelle und Stand | Kein Artikel ohne Quellenzeile veröffentlichbar |
| P-04 | Unklare Datenlage sperrt den Kauf | Artikel im Status „Prüfung erforderlich" nicht bestellbar |
| P-05 | Zubehörregeln mit Begründung | Jede Zusatzposition zeigt technischen Grund |

### 4.2 Bestellstrecke

| Nr. | Anforderung | Abnahmekriterium |
|---|---|---|
| B-01 | Fünf Schritte: Adresse, Versand, Zahlung, Prüfen, Bestätigung | Schrittanzeige zeigt Fortschritt, Rücksprung möglich |
| B-02 | Kundentyp Privat/Gewerbe mit getrennter Preis- und Rechtslogik | Netto erst nach Prüfung von Firma und USt-IdNr. |
| B-03 | Pflichtfeldprüfung vor Schrittwechsel | Fehlende Felder werden benannt, kein Weiterspringen |
| B-04 | Bestätigung der Vertragsgrundlagen vor Bestellung | Ohne Häkchen kein Bestellabschluss |
| B-05 | Schaltfläche trägt Zahlungspflicht im Text | Wortlaut je Markt geprüft |
| B-06 | Endsumme vor Abschluss vollständig | Versand, Pfand, Zusatzteile enthalten |
| B-07 | Bestellnummer und Bestätigungstext nach Abschluss | Nummer eindeutig, Text ohne Vertragsversprechen vor Annahme |

### 4.3 Einwilligung und Datenrechte

| Nr. | Anforderung | Abnahmekriterium |
|---|---|---|
| E-01 | Keine nicht erforderliche Speicherung vor Einwilligung | Netzwerkmitschnitt zeigt vor Klick nur notwendige Speicherung |
| E-02 | Drei Kategorien: Notwendig, Statistik, Komfort | Notwendig nicht abwählbar, andere frei schaltbar |
| E-03 | Ablehnen ist so leicht erreichbar wie Zustimmen | Beide Knöpfe in erster Ebene, gleiche Gewichtung |
| E-04 | Einwilligung jederzeit änderbar | Fußzeilenlink öffnet Einstellungen |
| E-05 | Einwilligungsnachweis mit Zeitstempel und Version | Protokoll je Nutzer abrufbar |
| E-06 | Datenexport | Datei mit allen gespeicherten Daten, maschinenlesbar |
| E-07 | Löschung | Alle eigenen Speicherungen entfernt, Bestätigung sichtbar |
| E-08 | Auskunft, Berichtigung, Widerspruch | Je eigener Weg, Frist einen Monat, Eingang bestätigt |

### 4.4 KI-Berater

| Nr. | Anforderung | Abnahmekriterium |
|---|---|---|
| K-01 | Hinweis auf KI vor der ersten Antwort | Sichtbar ohne Scrollen |
| K-02 | Übergabe an Menschen jederzeit erreichbar | Knopf im Chatkopf, führt zum Kontaktweg |
| K-03 | Keine autonome Sicherheitsfreigabe | Sicherheitsrelevante Freigaben nur mit Fachprüfung |
| K-04 | Ehrliche Rückfallantwort statt Vermutung | Bei Unklarheit Rückfrage oder Einstiegsangebot |
| K-05 | Beratungsverlauf nur mit Einwilligung über den Besuch hinaus | Ohne Komfort-Einwilligung kein Verlaufsspeicher |

### 4.5 Produktsicherheit und Stoffrecht

| Nr. | Anforderung | Abnahmekriterium |
|---|---|---|
| S-01 | Verantwortliche Person in der EU je Artikel | Kein Artikel ohne Angabe veröffentlichbar |
| S-02 | Warnhinweise und Genehmigungsnummern | Bremsteile mit Prüfzeichen, Öle mit Sicherheitsdatenblatt |
| S-03 | Pfand und Rücknahme bei Batterien | Pfand im Warenkorb sichtbar, Rücknahmeweg beschrieben |
| S-04 | Altölrücknahme in gleicher Menge | Hinweis auf Produktseite und in der Bestätigung |
| S-05 | Rückrufweg und Meldestelle | Eigener Meldeweg, Bearbeitung mit Vorrang |

## 5. Datenmodell (Mindestfelder)

**Artikel:** Artikelnummer, Hersteller, Herstellernummer, Barcode, Bezeichnung, Kategorie, Einbauort, Maße, technische Merkmale, Lieferumfang, Ausschlüsse, Zustand, Verpackungseinheit, Gewicht, Gefahrgutklasse, Pfandart, verantwortliche Person, Warnhinweise, Genehmigungsnummer, Medien, Quelle, Stand, Status.

**Fitment:** Artikel, Fahrzeugvariante (Schlüsselnummern, Motorcode, Bauzeitraum), Einbauposition, Bedingungen, Ausschlüsse, Quelle, Stand, Prüfer.

**Zubehörregel:** Hauptartikel, Zusatzartikel, Notwendigkeit (erforderlich/optional), Begründung, Bedingung (z. B. nur bei Start-Stopp).

**Bestellung:** Nummer, Kundentyp, Adresse, Positionen, Versandart, Zahlart, Steuersatz, Summen, Status, Belege, Sendungsnummern, Retouren.

**Einwilligung:** Zeitstempel, Version des Hinweistexts, Kategorien, Widerrufszeitpunkt.

## 6. Schnittstellen

| Schnittstelle | Richtung | Inhalt | Frequenz |
|---|---|---|---|
| Lieferant → PIM | ein | Artikelstamm, Medien, Fitment | täglich |
| Lieferant → Shop | ein | Bestand, Einkaufspreis | ≤ 15 Minuten |
| Shop → Lieferant | aus | Bestellung, Stornierung | sofort |
| Lieferant → Shop | ein | Versandbestätigung, Sendungsnummer | ereignisbasiert |
| Shop → Zahlung | aus | Autorisierung, Einzug, Rückzahlung | sofort |
| Shop → Versand | aus | Label, Abholauftrag | ereignisbasiert |
| Shop → Preisportale | aus | Artikeldatenfeed je Markt | täglich |
| Shop → Werkstatt | aus | Auftrag mit Fahrzeug, Prüfergebnis, Teiledaten | ereignisbasiert |
| Shop → Buchhaltung | aus | Rechnungen, Erstattungen, Steuersätze | täglich |

Für jede Schnittstelle sind zu liefern: Feldbeschreibung, Beispielnachricht, Fehlerbehandlung, Wiederholungsverhalten, Testfall.

## 7. Abnahme

**Abnahmeverfahren:** Jede Anforderung erhält einen Testfall mit Vorbedingung, Schritten, erwartetem Ergebnis. Abnahme erfolgt in der Abnahmeumgebung mit Produktionskonfiguration und Testdaten. Protokoll mit Datum, Prüfer, Ergebnis, Nachweis.

**Abnahmestufen:**

1. **Technische Abnahme** — Installation, Umgebungen, Sicherung, Wiederherstellung, Überwachung.
2. **Fachliche Abnahme** — Passungslogik, Zubehörregeln, Bestellstrecke, Retouren, Beratung.
3. **Rechtliche Abnahme** — Pflichtangaben je Markt, Einwilligung, Widerruf, Preisangaben, Produktsicherheit.
4. **Betriebsabnahme** — Rollen, Reaktionszeiten, Eskalation, Runbooks, Schulung.

**Sperrende Kriterien (kein Verkaufsstart):** fehlende Pflichtangaben in einem aktiven Markt; nicht erforderliche Speicherung vor Einwilligung; Bestellabschluss ohne Bestätigung der Vertragsgrundlagen; Artikel ohne Quelle und Stand; Bestellung eines gesperrten Artikels möglich; Zahlungsabgleich fehlerhaft; keine erfolgreiche Rücksicherung.

## 8. Betrieb

**Rollen:** Betrieb/Technik, Katalogpflege, Beratung/Support, Rechnungswesen, Datenschutz, Produktsicherheit, Partnerbetreuung. Für jede Rolle: Vertretung, Erreichbarkeit, Reaktionsziel.

**Reaktionsziele:** Totalausfall 30 Minuten · Bestellstrecke gestört 1 Stunde · Falsche Preis- oder Passungsangabe 2 Stunden · Sicherheitsmeldung 4 Stunden · Datenschutzanfrage 3 Werktage bis Eingangsbestätigung.

**Routinen:** täglich Fehlerprotokoll, Bestandsalter, offene Bestellungen, Beratungsabbrüche; wöchentlich Datenqualität, Retourengründe, Lieferzeittreue; monatlich Rechtsstand je Markt, Einwilligungsquote, Partnerzufriedenheit, Kennzahlenbericht.

**Runbooks (zu erstellen):** Lieferant nicht erreichbar · Bestand veraltet · Zahlungsdienst gestört · Preisfehler im Feed · Rückruf eines Artikels · Datenschutzvorfall · Fehlversand · Sicherheitslücke.

## 9. Schulung und Übergabe

1. Administrationshandbuch: Installation, Konfiguration, Auslieferung, Rechteverwaltung, Sicherung.
2. Redaktionshandbuch: Artikelanlage, Statuswechsel, Quellenpflicht, Medien, Freigaben.
3. Supporthandbuch: Beratung, Eskalation, Retouren, Rechtsanfragen, Sicherheitsmeldungen.
4. Partnerhandbuch: Auftragsannahme, Terminvergabe, Rückfragen, Abrechnung.
5. Schulungen: je Rolle eine Sitzung mit Aufzeichnung und Prüfliste.

## 10. Offene Entscheidungen des Auftraggebers

1. Verkäufer oder Vermittlungsplattform — bestimmt Vertragslogik und Zahlungsfluss.
2. B2C, B2B oder beide — im Rechtstextpaket auf **beide mit getrennten Flows** ausgelegt, Bestätigung fehlt.
3. Startmarkt und Reihenfolge der Markteröffnungen.
4. Fulfillment-Modus für den Pilot.
5. Commerce-Kern (Kaufsystem) und Betreiber der Infrastruktur.
6. Zahlungs- und Versandpartner je Markt.
7. Ausgeschlossene Teilearten zum Start.
