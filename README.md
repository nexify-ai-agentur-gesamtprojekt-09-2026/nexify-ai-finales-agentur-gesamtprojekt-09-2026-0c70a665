> Projektgrenze (Nutzerkorrektur 26.10.2026): Affilinet Portal Aachen ist ein
> gesondertes, pausiertes Kundenprojekt und gehört nicht zur Agentur oder TEILEKLAR.
> Es ist keine Anwendung oder Lieferabhängigkeit dieses Repositories.
> Fertige Komponenten werden gezielt mit Herkunft, Anpassung und Tests übernommen.
> [Quellen- und Projektgrenzen](docs/architecture/0011-source-and-customer-boundaries.md).

> Aktuelle Cloud-Implementierung: Die vom Nutzer freigegebene Gesamtfertigstellung
> wird auf `factory/foundation-2026-10-25` bearbeitet. Das lokale, neu implementierte
> Datenfundament und sichere Pruefwerkzeuge sind keine bereits produktiv betriebene
> Gesamtplattform. Siehe [Sprint-Contract](docs/plans/2026-10-25-factory-fundament.md),
> [Vorschau](docs/04-betrieb/static-preview.md),
> [Monitortests](docs/04-betrieb/gesundheit-selbsttest.md) und
> [PostgreSQL-Fundament](docs/04-betrieb/factory-postgres-foundation.md).
> Der [API-/Auth-Zielvertrag](docs/contracts/README.md) leitet Funktionen und Rechte
> aus allen erfassten Referenzseiten ab und berücksichtigt Runway sowie ElevenLabs
> für die beauftragten Hero-Medien. Er ist getrennt von der noch ausstehenden Runtime.
>
> Die folgenden Produkt-/Handoffangaben sind historische Quellen; Preis-, Rechts-
> und Gesellschaftsentscheidungen bleiben an ihre bestaetigten Versionen gebunden.

# Handoff: NeXify AI Gesamtlösung 2026 (Website · one/one+ · Muster-Shop · Brain)

**Stand 29.09.2026 · Fassung 1.0 · Entwurf zur Freigabe durch Pascal Courbois**

## Overview
Design und Spezifikation der Gesamtlösung von NeXify AI: eine Unternehmens-KI („Chat it. Automate it.“) in zwei Stufen (**one**, **one+**) mit Web-, API- und Terminal-Zugang, die Agentur-Website mit Kennzahl-Konzept, der **NeXify Shop** als Muster-Shop der Onlineshop-Fertiglösung, gemeinsame Bausteine (Kopf, Fuß), Rechtstexte und das „Brain“ (KI-Team, Pipeline, Tool-Orakel, Wissenspflege).

## About the Design Files
Die Dateien in `prototypen/` sind **Design-Referenzen in HTML** – Prototypen mit Mock-Logik, die Aussehen und Verhalten zeigen, **kein Produktionscode zum Kopieren**. Aufgabe: die Oberflächen in der Zielumgebung nachbauen (Empfehlung: Next.js/React + TypeScript, Tokens aus `dokumentation/03-designsystem.md`), mit den dort etablierten Mustern und Bibliotheken. Die `.dc.html`-Dateien laufen im Browser über `support.js`; sie sind Werkzeug der Designphase, nicht Teil des Produkts.

## Fidelity
**High-fidelity**: endgültige Farben, Typografie, Abstände, Radien, Schatten, Texte und Interaktionen. Pixelnah nachbauen; Werte stehen in Dokument 03 und 04. Ausnahmen (bewusst Platzhalter): Produktfotos (gekennzeichnete Bildplätze), Tarife one/one+ (Struktur „zur Freigabe“), Kennzahl-Beispiele (als „Beispiel“ gekennzeichnet).

## Reihenfolge zum Einstieg
1. `dokumentation/00-INDEX.md` lesen.
2. `01` Produkt/Marke → `03` Designsystem → `04` Frontend → `05` Technik → `06` Brain.
3. Prototypen im Browser öffnen: `NeXifyAI Cloud v12.dc.html` (Start), `NeXify AI one.dc.html`, `NeXify Shop.dc.html`, `Rechtliches.dc.html`.
4. Offene Entscheidungen in `dokumentation/08-recht-und-compliance.md` (E1, E3, E4, E5, E6, E12) **vor** Abrechnung/Rechnungslauf klären.

## Screens / Views
Ausführlich in `dokumentation/04-frontend-spezifikation.md` (Abschnitte, Komponenten, Zustände, Logik). Kurzfassung:
- **Start:** Hero (Signalfeld-Canvas, Neigung mit Maus), Laufband, Zusagen, „Die Zahl“ (Balken 26 Std. vs. 4 Min. + Regler), 4-Stationen-Weg, Demo-Fenster (D1 Anfrage→Antwort, D2 Landingpage), Zwei Wege, Baukasten (8 Mini-Oberflächen), Entwicklungstag, Companion-Chat, Preise + Rechner + BAFA-Beispiel, Ablauf, FAQ, Kontaktformular, schwebende CTA.
- **one/one+:** Terminal-Hero, Arbeitsplatz (4 Aufträge × 3 Modi, Rückfrage „Erlauben?“), Vergleich, Zugänge, Prepaid-Rechner, Grenzen, FAQ, Rechtliches.
- **Muster-Shop:** Home, Kategorie/Suche/Merkliste, Produkt, Warenkorb, Kasse (4 Schritte), Bestätigung, Rechtliches, Berater-Panel.
- **Rechtliches:** 11 Abschnitte, Entwurf 0.9.

## Interactions & Behavior
Siehe Dokument 04. Wichtig: Bewegung nur als Zustand (Reduced-Motion → aus); Rückfragen vor jeder Dateiänderung im Arbeitsplatz; Formular-Validierung inline mit `role=alert`; Button-Lösung „Zahlungspflichtig bestellen“; AGB-Haken nicht vorbelegt.

## State Management
Jede Fläche: kleiner lokaler Zustand (Tab/Schritt/Filter/Formular). Geschäftsdaten (Katalog, Preise, Chat-Regeln, Rechtstexte) gehören in Datenmodule bzw. das Backend – siehe Dokument 05. Backend-Stellen im Code: `TODO(BACKEND)`, `data-api-endpoint`.

## Design Tokens
Vollständig in `dokumentation/03-designsystem.md`. Kern: Graphit `#242826` (Grund), `#2A2E2C`, Lime `#D7FA50`, Türkis `#6FE3CF`, Amber `#FFC24A`, Rot `#FF8A7A`; Geist + Geist Mono; Radien 8/10/12/16/20/999; Karten-Schatten `0 28px 56px -32px rgba(0,0,0,.85)`; Primärbutton-Verlauf `#EEFF9A → #D7FA50 → #BFE83C`.

## Assets
Signet `prototypen/assets/nexify-ai/nexify-ai-signet.svg` (Marke, unverändert übernehmen). Schriften: Geist und Geist Mono (Google Fonts). Keine Stock-Fotos; Produktbilder = Bildplätze.

## Brain und Konfiguration
`konfiguration/brain/agents.json`, `tools.json`, `pipeline.json`, `knowledge.json` sind Sollwerte (null = Pascal legt fest). `konfiguration/fakten.json` und `api-prepaid.json` sind die Quelle für Zahlen. Das Tool-Orakel, der LoRA-Lauf und die Wissenspflege sind **Bauaufträge**, nicht vorhanden.

## Nicht Teil dieser Phase
Produktives Backend, echte Zahlung, echte Modellaufrufe in den Demos, anwaltliche Endprüfung, NL/FR-Fassungen, Screenshot-Prüfung auf 320/768/1440 px für Shop und one-Seite.

## Files
```
prototypen/            *.dc.html + support.js + assets/nexify-ai/
dokumentation/         00-INDEX … 10 · Gesamtkonzepte · ADRs · Abrechnungskonzept · Signalfeld
konfiguration/         fakten.json · api-prepaid.json · brain/*.json
HANDOFF.md → diese Datei (README.md im Paketordner)
```


## Stand 2026-09-29 · Nachträge
- **Fidelity:** High-fidelity. Die `.dc.html`-Dateien sind Design-Referenzen in HTML, kein Produktionscode – in Next.js/React (Zielstack laut `AGENTS.md`) nachbauen, Werte aus `config/design-tokens.json` übernehmen.
- **i18n:** Kopf, Fuß und Seite teilen eine Markt-/Sprachwahl (Ereignis `nx:markt`, Speicher `nx-market`, `<html lang>` folgt). Seitentexte: `prototypen/lib/seiten-i18n.js` + `prototypen/i18n/cloud-v12.json` (DE→NL/FR, Startseite, statische Texte). Produktiv durch Übersetzungsschlüssel (z. B. next-intl) ersetzen; JS-erzeugte Inhalte der Startseite und alle übrigen Seiten sind noch nur DE.
- **Workspace:** Seitenfeld und Chat-Leiste liegen unter dem gemeinsamen Kopf (Bezugsrahmen = Arbeitsfläche). Angebotslogik rechnet Reverse Charge (EU-B2B) statt 19 % DE-USt.
- **Kopf-Kontexte:** Jede Seite trägt ihren echten Namen im Kopf; Aktiv-Markierung nur auf echten Menüpunkten.
- **Nicht enthalten:** Vorgängerstände Cloud v10/v11 und „NX 2026 Website“ (archiviert).
- **Offen:** Rendern bei 320/768/1440 px je Seite prüfen; Übersetzungen muttersprachlich gegenlesen; Rechtstexte je Markt freigeben (E12); Entscheidungen E1, E3–E6.
