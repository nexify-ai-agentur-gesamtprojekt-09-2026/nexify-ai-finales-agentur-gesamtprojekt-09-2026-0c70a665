# TEILEKLAR — Nutzerhandbuch (Service- und Beratungsteam)

**Zielgruppe:** Kundenservice, Beratungsteam, Werkstatt-Partnerbetreuung
**Stand:** 31.08.2026 · Version 1.0

---

## 1. Was dieses Handbuch ist

Eine Arbeitsanleitung für Menschen, die TEILEKLAR im Alltag bedienen — nicht für Entwickler. Für technische Architektur siehe [Backend und Datenbank](../03-backend/backend-und-datenbank.md), für Statusautomaten und Rollen siehe [Betriebslogik und Prozesse](betriebslogik-und-prozesse.md).

## 2. Der Shop in Kürze

TEILEKLAR verkauft Kfz-Ersatzteile mit **belegter Passung**: Zu jedem Artikel steht, ob er zum gewählten Auto passt, warum, und woher die Angabe stammt. Ohne gewähltes Auto wird nie eine Passung behauptet. Grundsatz für jede Kundenantwort: **lieber fragen als raten.**

Der Shop läuft in sieben Marktversionen (DE, AT, CH, NL, BE-NL, BE-FR, LU) — Sprache und Konditionen wechseln automatisch mit der Länderauswahl oben rechts.

## 3. Der KI-Berater (NeXify AI) — was er kann und was nicht

NeXify AI führt Kunden durch Diagnose, Teilesuche, Zubehörprüfung und die Bestellstrecke im Chat.

**NeXify AI kann:**
- anhand von Symptomen ein passendes Teil vorschlagen
- Passung gegen das gewählte Fahrzeug prüfen und Quelle/Stand nennen
- notwendiges Zubehör (Halter, Schrauben, Sensoren) erklären und mit Begründung vormerken
- durch die Bestellstrecke bis zur Bestellnummer begleiten
- eine Werkstatt für den Einbau vorschlagen

**NeXify AI kann nicht und darf nicht:**
- eine Passung ohne Fahrzeugkontext bestätigen
- bei offener Prüffrage (Status „Eine Frage offen") zum Kauf raten — sie klärt stattdessen die fehlende Angabe
- rechtliche oder sicherheitskritische Zusagen treffen, die über die hinterlegten Prüfpunkte hinausgehen

**Wann ein Mensch übernehmen sollte:** wenn ein Kunde nach mehrfacher Klärung frustriert wirkt, wenn es um eine Reklamation oder einen Sicherheitsvorfall geht, oder wenn NeXify AI selbst auf ein Thema außerhalb ihres Wissens trifft (Rückfallantwort „Das ordne ich noch nicht sicher zu").

## 4. Typische Serviceanfragen — so beantwortest du sie

**„Passt Teil X an mein Auto?"**
→ Frage nach HSN/TSN oder Modell/Motor/Baujahr, wenn nicht schon bekannt. Nenne den Prüfstatus wie im Shop angezeigt (Passt / Eine Frage offen), nie eine eigene Einschätzung ohne Fahrzeugdaten.

**„Wo ist meine Bestellung?"**
→ Im Demo-Stand gibt es keine echte Sendungsverfolgung. Sag das offen: „Sendungsverfolgung ist im Demo-Shop noch nicht aktiv." Für den späteren Echtbetrieb: Bestellnummer im Format `TK-XXXXX` nachschlagen, sobald das Bestellsystem angebunden ist.

**„Ich will etwas zurückgeben."**
→ Zusage im Shop: 14 Tage Rückgabe, bei Fehlpassung trotz Prüfung kostenfreie Rücknahme ohne Diskussion über die Schuldfrage. Bei Batterien gilt zusätzlich die Pfand- und Rücknahmeregel.

**„Welcher Halter/welche Schraube gehört noch dazu?"**
→ Die Produktseite und NeXify AI zeigen Zubehör mit Begründung, unterteilt in „Notwendig" und „Optional". Erkläre den technischen Grund, nicht nur, dass etwas fehlt.

**„Ich möchte eine Werkstatt für den Einbau."**
→ Werkstattbereich nutzen: Ortsfilter, Entfernung, Kontaktdaten. Wichtig kommunizieren: Leistungen, Stundensätze und Terminverfügbarkeit sind noch nicht erfasst (siehe Abschnitt 6) — das Verzeichnis liefert Kontaktdaten, keine Buchung.

## 5. Sprache und Tonfall

- Fachbegriffe immer erklären, nie voraussetzen (z. B. „HSN/TSN" → „die Schlüsselnummern aus deinem Fahrzeugschein").
- Ehrlich über Demo-Grenzen: lieber sagen „das ist im Demo-Shop noch nicht aktiv" als eine Funktion zu behaupten, die nicht existiert.
- Kein Verkauf auf Verdacht — bei offener Frage klären, nicht zureden.

## 6. Bekannte Grenzen des aktuellen Stands (Stand 31.08.2026)

| Bereich | Stand | Konsequenz für den Service |
|---|---|---|
| Katalog-, Bestands- und Preisdaten | Demo-Werte | Keine verbindlichen Zusagen zu Preis oder Lagerbestand geben |
| Bezahlen, Versand, Sendungsverfolgung | nicht aktiv | Kunden auf den kommenden Echtbetrieb verweisen |
| Werkstatt-Leistungen, Preise, Terminbuchung | nicht erfasst | Verzeichnis liefert nur Kontaktdaten, keine Verfügbarkeit |
| Kundenkonten, Login | vorbereitet, nicht produktiv | Keine echten Zugangsdaten anlegen |

## 7. Eskalationswege

1. **Fachliche Rückfrage zu einem Teil:** an das Produktteam (Ansprechpartner siehe internes Verzeichnis).
2. **Reklamation / Sicherheitsvorfall:** sofort an die Geschäftsleitung, nicht durch NeXify AI abschließend behandeln lassen.
3. **Rechtliche Frage (Widerruf, AGB, Datenschutz):** auf die Rechtsseiten im Footer verweisen, im Zweifel an die Rechtsabteilung/Anwaltskontakt weiterleiten — siehe [Rechtstexte-Auftrag](../06-auftraege/rechtstexte.md).
4. **Technischer Fehler im Shop:** an das Administrationsteam, siehe [Admin-Handbuch](admin-handbuch.md).
