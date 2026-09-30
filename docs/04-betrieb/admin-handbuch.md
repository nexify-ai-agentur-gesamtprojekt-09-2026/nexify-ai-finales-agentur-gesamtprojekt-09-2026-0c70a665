# TEILEKLAR — Admin-Handbuch

**Zielgruppe:** Projektverantwortliche, technische Administration
**Stand:** 31.08.2026 · Version 1.0

---

## 1. Zweck

Praktische Anleitung, um TEILEKLAR als Design-Component-Datei zu pflegen, zu erweitern und für den Produktivbetrieb vorzubereiten. Für die Gesamtarchitektur siehe [Backend und Datenbank](../03-backend/backend-und-datenbank.md), für Anforderungen mit Abnahmekriterien siehe [Pflichtenheft](../02-umsetzung/pflichtenheft-installation-betrieb.md).

## 2. Projektstruktur

Vollständiger Verzeichnisbaum in [`README.md`](../../README.md), Abschnitt 1. Die wichtigsten Arbeitsdateien:

| Datei/Ordner | Zweck | Wann bearbeiten |
|---|---|---|
| `TEILEKLAR Shop.dc.html` | der gesamte Shop, alle Ansichten und Marktversionen | bei jeder Funktions- oder Designänderung |
| `assets/legal/*.json` | Rechtstexte je Markt, strukturiert aus den Originaldokumenten | nur nach anwaltlicher Freigabe neuer Fassungen |
| `assets/workshops.json` | Werkstattverzeichnis (6.875 Betriebe) | bei Verzeichnis-Updates oder Partneraufnahme |
| `assets/brands/*` | Herstellerlogos | beim Hinzufügen/Ersetzen von Marken |
| `manifest.webmanifest`, `sw.js` | App-Installation, Offline-Cache | bei jedem Release — Cache-Version erhöhen (siehe 5.3) |
| `docs/` | gesamte Projektdokumentation | laufend, siehe Abschnitt 7 |

## 3. Marktversionen verwalten

Alle sieben Märkte (`de-DE`, `de-AT`, `de-CH`, `nl-NL`, `nl-BE`, `fr-BE`, `fr-LU`) sind in der Konstante `MARKETS` in `TEILEKLAR Shop.dc.html` definiert: Sprache, Währung, Steuersatz, Versandkosten, Lieferzeit, Zahlarten. Änderung an Preisen, Steuersätzen oder Lieferzeiten erfolgt **ausschließlich dort** — nie hartkodiert in Templates, damit alle Ansichten synchron bleiben.

Übersetzungsschlüssel liegen im Objekt `I18N` (drei Sprachblöcke `de`/`nl`/`fr`) und `CHAT` (Beratertexte). Neue Textstellen im Template als `{{ t.schlüssel }}` referenzieren, nie als festen String — sonst bricht die Lokalisierung.

## 4. Rechtstexte aktualisieren

1. Neue Fassung von der Rechtsprüfung freigeben lassen.
2. Quelldokumente (Markdown) durch das im [Rechtstexte-Auftrag](../06-auftraege/rechtstexte.md) beschriebene Zerlegungsschema wieder in `assets/legal/<markt>.json` überführen (Struktur: `{ dokumentschlüssel: { title, meta, blocks: [{h, paras, bullets}] } }`).
3. `LEGAL_META.stand` im Shop-Code auf das neue Datum setzen.
4. Prüfen: Footer-Links und Seitenleiste zeigen die neuen Titel in allen drei Sprachen (Testschritt: Land wechseln, Rechtsseite öffnen, Titel prüfen).

## 5. Release-Checkliste

### 5.1 Vor jeder Veröffentlichung
- [ ] `ready_for_verification`-Durchlauf ohne Konsolenfehler
- [ ] Alle drei Sprachversionen stichprobenhaft geöffnet (Startseite, Suche, Produktseite, Berater)
- [ ] Keine offenen `{{ }}`-Platzhalter im gerenderten Text
- [ ] Keine erfundenen Zahlen/Zusagen außerhalb der Demo-Kennzeichnung

### 5.2 Bilder und Logos
- Neue Herstellerlogos: Herkunft und Nutzungsrecht dokumentieren (siehe [Herstellerlogos-Auftrag](../06-auftraege/herstellerlogos.md)). Nie ungeprüfte Logos aus Bildersuchen einsetzen.
- Produktfotos nie über die Originalauflösung hinaus skalieren (Unschärfe). Mindestbreite für Vollflächen-Motive: 2400 px.

### 5.3 App-Cache
Nach jedem Release, das Assets ändert: Cache-Version in `sw.js` (`const CACHE = 'teileklar-vN'`) erhöhen. Ohne Versionssprung liefern installierte Apps veraltete Bilder/Dateien aus dem Offline-Cache aus.

## 6. Bekannte technische Abhängigkeiten (vor Produktivbetrieb zu klären)

| Bereich | Status | Nächster Schritt |
|---|---|---|
| Katalog-, Bestands-, Preisdaten | Demo-Werte | Lieferantenanbindung (siehe Gesamtprojektplan, Abschnitt „Nächster Auftrag") |
| Zahlung, Versand, Bestellverwaltung | spezifiziert, nicht angebunden | Payment-/Versanddienstleister je Markt beauftragen |
| Datenbank | 4 Migrationen vorbereitet, nicht produktiv | Hosting einrichten, Migrationen ausführen |
| Login/Konten | Oberfläche vorhanden, kein echtes Auth-Backend | Auth-Anbieter anbinden |

## 7. Dokumentation aktuell halten

Bei jeder strukturellen Änderung sofort nachziehen:
1. `README.md` — Verzeichnisbaum und Stand-der-Umsetzung-Tabelle
2. `github.md` — Dokumentenregister und Screen-Map
3. Betroffenes Fachdokument in `docs/`

Dokumentation und Code dürfen nie auseinanderlaufen — eine Änderung ohne Dokumentationsnachtrag gilt als unvollständig.

## 8. Support-Eskalation

Technische Fehler, die das Serviceteam meldet (siehe [Nutzerhandbuch](nutzerhandbuch.md), Abschnitt 7), hier aufnehmen, Ursache und Fix dokumentieren, Release-Checkliste (Abschnitt 5) vor erneuter Freigabe durchlaufen.
