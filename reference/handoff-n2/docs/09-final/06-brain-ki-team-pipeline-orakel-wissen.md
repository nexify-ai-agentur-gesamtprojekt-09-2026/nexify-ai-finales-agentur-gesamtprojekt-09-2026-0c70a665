# 06 · Brain: KI-Team, Pipeline, Tool-Orakel, Wissenspflege

**Status:** Soll-Spezifikation. Real vorhanden laut Bestand: 9Router, Langfuse, OpenBao, MCP-Server, Wächter, LightRAG (derzeit mit Rückstau, NX-GR-019), LoRA ≤ 14 Mrd. (ADR-0005). Was hier „neu“ heißt, ist Bauauftrag – nicht behaupten, bis live.

## 1. Bausteine
```
Anfrage ──► Gateway ──► Router ──► Agent (Rolle) ──► Werkzeuge (MCP) ──► Ergebnis
              │            │            │                 │
           Budget/       Stufe 0/1/2   Gedächtnis      Tool-Register
           Rechte        (Konfidenz)   (4 Arten)       + Tool-Orakel
              └──────────── Journal · Langfuse-Trace · Wächter ────────────┘
Wissen: Quellen ─► Ingest-Pipeline ─► Wissensspeicher (RAG) ◄─ Wissenspflege (Nachtlauf)
```

## 2. Das KI-Team (Rollen, `config/brain/agents.json`)
| Agent | Aufgabe | Werkzeuge | Modellstufe | Grenze |
|---|---|---|---|---|
| **NeXify AI (Companion)** | Website/Portal/Shop-Dialog, Erstberatung, Übergabe | Wissen (lesend), Preisliste, Kalender-Slots | 1 (→ 2 bei Unsicherheit) | kein Festpreis, keine Rechtsberatung, kennzeichnet sich |
| **Baumeister (one+)** | baut Seiten/Shops/Agenten, schreibt Code | Dateien, Git, Browser, Test-Runner | 2 | Rückfrage vor Dateiänderung; Hartsperren |
| **Prüfer (Support)** | Code-Review, Prüfkatalog, Norm-Lauf, Barrierefreiheit | Linter, Kontrast-Check, Test-Runner, Screenshot | 2 | ändert nichts, meldet Befunde |
| **Recherche (Research)** | Quellen finden, Belege prüfen, Marktdaten | Websuche, Web-Lesen, Wissensspeicher | 1–2 | jede Aussage mit Quelle+Datum |
| **Triage** | Postfach sortieren, Entwürfe | Mail (lesend), Tags | 0–1 | sendet nichts ohne Freigabe |
| **Angebots-Agent** | Angebot aus Gespräch (DIN 5008) | Preisliste, Rechenkern (Cent), PDF | 1 | Preise nur aus Katalog |
| **Wissens-Agent** | Antworten aus Kundendokumenten | RAG mit Fundstelle | 1 | „weiß ich nicht“ statt erfinden |
| **Orchestrator** | zerlegt Aufträge, verteilt, sammelt, bricht ab | Aufgabenwarteschlange, Journal | 2 | kennt Budgets, Zeitlimits, Hartsperren |
| **Wächter** | Überwachung, Gegentest, Alarm | Metriken, Health, Zustellung | 0 | schweigt nur bei „neu = nichts“; jede Meldung wird als zugestellt bestätigt |
Gemeinsame Regeln R-01…R-21 (Regelverzeichnis `docs/generiert/regelverzeichnis.md`) liegen als Schranke im Gateway, nicht nur im Prompt.

## 3. Modell-Routing (`config/brain/pipeline.json`)
Start auf der niedrigsten geeigneten Stufe. Aufstieg um eine Stufe, wenn (a) Konfidenz < Schwelle, (b) Schema-Prüfung fehlschlägt, (c) Aufgabe als „prüfungsrelevant“ markiert (fest Stufe 2). Stufe 0 = lokales Modell (7–8 B, quantisiert, LoRA auf freigegebenen, pseudonymisierten NeXify-Daten). Fällt ein Modell aus → Ersatzmodell; berechnet wird das tatsächlich genutzte. Kosten je Anfrage: Preisversion + EK + VK im `usage_log`.

## 4. Gedächtnis (ADR-0004, vier Arten)
Arbeitsgedächtnis (Sitzung) · Episodisch (Läufe, Journal) · Semantisch (Wissensspeicher) · Prozedural (Regeln, Vorlagen, Prüfkataloge). Kundendaten nie in gemeinsames Training; Datenschutz-Schalter je Kostenstelle: nur Zähldaten.

## 5. Tool-Orakel – Werkzeuge erzeugen lassen
**Ziel:** Fehlt einem Agenten ein Werkzeug, entsteht es kontrolliert – nicht frei laufend.
```
1 Bedarf erkannt (Agent meldet: „brauche X“)  
2 Orakel-Entwurf: Zweck, Ein-/Ausgabe (JSON-Schema), Berechtigungen, Risiko-Klasse
3 Code-Erzeugung (Baumeister) in Sandbox-Ordner + Tests zuerst (rot → grün)
4 Prüfung (Prüfer): Rechte minimal? Netzwerk? Geheimnisse? Eingabe validiert? Idempotent?
5 Simulation: 20 Prüffälle + 3 Gegenfälle (Negativ, Grenzwert, Missbrauch)
6 Freigabe: Risiko A (lesend) automatisch · B (schreibend intern) 1 Mensch · C (extern/Geld/Löschen) Mensch + 2. Faktor
7 Registrierung im Tool-Register (Version, Hash, Besitzer, Ablaufdatum) → MCP-Server
8 Betrieb: Aufruf-Limit, Journal, Wächter; Rückzug per Schalter, automatisch bei Fehlerrate
```
**Nie ohne Mensch:** Reboot, DNS, Firewall, Zahlungen, Löschen, Nachrichten an Dritte. Orakel darf Entwürfe liefern, nicht sich selbst freigeben. Register: `config/brain/tools.json`.

## 6. Wissensaufbau (Ingest-Pipeline, `config/brain/knowledge.json`)
Quellen: Leistungskatalog, Preise (`fakten.json`), Prüfkataloge, Rechtstexte, Runbooks, Kundendokumente (mandantengetrennt), Wissenshub-Artikel, ADRs.
Pipeline: **Erfassen** (Quelle, Version, Datum, Rechte) → **Bereinigen** (Text, Tabellen, keine Geheimnisse, PII-Filter) → **Segmentieren** (semantisch, 300–800 Token, Überschriften-Pfad) → **Anreichern** (Titel, Quelle, Gültig-ab, Sprache, Markt, Vertrauensstufe) → **Einbetten** (versioniertes Embedding) → **Speichern** (Vektor + Volltext) → **Prüfen** (20 Testfragen je Quelle, Fundstellen-Treffer ≥ 90 %) → **Freigeben**.
Antwortregel: Antwort nur mit Fundstelle; ohne Treffer → „weiß ich nicht“ + Übergabe.

## 7. Wissenspflege (Nachtlauf)
- Täglich 03:00: neue/geänderte Quellen einlesen, veraltete (Gültig-bis) sperren, Widersprüche melden (z. B. zwei Preise für dieselbe Leistung).
- Wöchentlich: Regressionstest (feste Fragenliste) gegen neue Wissensstände; Abfall > 2 Punkte → Rollback auf letzten Stand.
- Monatlich: Trainingsvorschlag (LoRA) nur aus freigegebenen Daten; Übernahme nur bei mindestens gleicher Testgüte; Adapter versioniert.
- Quellen-Verfall: Rechts- und Preistexte mit Ablaufdatum; abgelaufen = nicht mehr zitierbar.
- Wächter (drei Fragen): schlägt er an (Gegentest)? schweigt er nur, wenn nichts Neues ist? empfängt jemand die Meldung (Zustellung bestätigt)?

## 8. Betrieb und Beobachtung
Langfuse-Trace je Lauf; Kennzahlen: Eskalationsquote, „weiß ich nicht“-Quote, Fundstellen-Treffer, Kosten je Auftrag, Freigabe-Rate, Tool-Fehlerrate. Alarm über bestehende Kette an Pascal. Journal unveränderlich.

## 9. Was noch nicht existiert (ehrlich)
Tool-Orakel und automatischer LoRA-Lauf sind Bauauftrag; LightRAG-Rückstau (NX-GR-019) muss vor Wissenspflege behoben sein; Modellname „jev ai“ aus der Vorgabe ist nicht auffindbar – bestätigen.
