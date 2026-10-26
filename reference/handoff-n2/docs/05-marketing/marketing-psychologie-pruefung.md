# Marketing-Psychologie, KI-Produkt und Positionierung · Prüfung Agentur-Seite v10

**Stand 26.09.2026** · Grundlage: Skills `marketing-psychologie`, `ki-produktentwicklung`, `ki-wrapper-geschaeftsstrategie`.
Regel: Jedes Prinzip nur mit wahrer Tatsachengrundlage (§ 5 UWG, Omnibus-RL 2019/2161). Keine erfundene Knappheit, keine erfundenen Kundenzahlen, keine Countdowns.

## 1. Eingesetzte Prinzipien

| Prinzip (Beleglage) | Wo auf der Seite | Tatsachengrundlage |
|---|---|---|
| Reziprozität (stark) | Kostenloses Erstgespräch, Kosten- und ROI-Rechner, Checkliste, KI-Berater ohne Anmeldung | Leistungen existieren und sind kostenlos |
| Commitment & Konsistenz (stark) | Kleines erstes Ja: „30 Minuten · kostenlos · ohne Verpflichtung“ unter dem Einstieg **(neu)**; Tagesabrechnung, täglich pausierbar | AGB: Tagessatz, kein Mindestzeitraum |
| Ankereffekt (stark) | Preis-Karte: offengelegtes Rechenbeispiel 1 h/Tag × 45 € × 22 Tage ≈ 990 € im Monat neben 449 € pro Tag **(neu)** | Rechnung vollständig sichtbar, als Beispiel gekennzeichnet |
| Autorität (stark) | Vertrauensleiste: Frankfurt-Hosting, AVV Art. 28, KI-Kennzeichnung Art. 50, Eigentum an Code und Daten | Alle Punkte in AGB/AVV/Datenschutz belegt |
| Framing (stark) | „Kennzahl statt Versprechen“, Messung vor und nach Go-Live | Arbeitsweise laut Angebot |
| Hick'sches Gesetz (mittel–stark) | Je Abschnitt eine Hauptaktion, Zweitaktion als Rahmen-Schaltfläche | Gestaltungsregel Design-Norm |
| Mere Exposure (stark) | Gleiches Signet, gleiche Farben auf Seite, Portalen, Dokumenten, Visitenkarte | CI-Schema |
| Social Proof (stark) | Referenzen mit Status und Kennzahlen | **Nur echte Projekte.** Kundennennung braucht Freigabe (AGB § 11) |

## 2. Bewusst nicht eingesetzt

- Knappheit („nur noch 2 Plätze“): keine belegte Grundlage → wäre irreführend (§ 5 UWG).
- Countdown, künstliche Frist, Decoy-Preisstufe: Dark Patterns.
- Pratfall-, Lindy-, Mimetic-Argumente: nicht robust belegt.
- Charm Pricing (449 € ist bereits so gesetzt; keine weitere Absenkung auf 9er-Enden bei B2B-Tagessätzen).

## 3. Gekennzeichnete Beispielwerte (Risiko)

Die Karte im Einstieg zeigt „4 Min., vorher 26 Std.“ und ist jetzt als **Beispiel** betitelt. Empfehlung: durch einen gemessenen Wert aus einem echten Projekt ersetzen, sobald vorhanden. Bis dahin nicht in Anzeigen, Social Media oder Angeboten verwenden.

## 4. KI-Berater · Produktreife (Checkliste `ki-produktentwicklung`)

| Punkt | Stand Oberfläche | Offen für die Umsetzung |
|---|---|---|
| Kennzeichnung als KI | ✓ vor und im Gespräch | |
| Keine erfundenen Preise/Fakten | ✓ Berater nennt keine Preise, verweist auf Preisseite | Regressions-Test der Prompts in GitLab |
| Übergabe an Mensch | ✓ „übergibt an Pascal, sobald ein Angebot ansteht“ | Übergabe-Ereignis protokollieren |
| Strukturierte Ausgabe | – | Antworten gegen Schema prüfen (Zod), sonst Fallback-Text |
| Prompt-Injection | – | Nutzereingabe strikt von Systemanweisung trennen, Ausgabe filtern |
| Ausfallsicherheit | – | Retry mit Backoff, Ersatzantwort „Schreiben Sie an mail@nexifyai.cloud“ |
| Streaming | – | Antwort gestreamt anzeigen |
| Kosten je Gespräch | – | Token-Kosten pro Gespräch loggen (Supabase `usage_logs`) |
| Wissensquelle | – | Vorhandene LightRAG-Instanz nutzen, keine neue aufsetzen |

## 5. Positionierung (`ki-wrapper-geschaeftsstrategie`)

NeXify AI ist **kein** Abo-Wrapper um ein fremdes Modell. Die Verteidigungsfähigkeit liegt in:
1. **Workflow-Integration und Betrieb** (stark): Agenten sitzen in den Systemen des Kunden, NeXify betreibt und überwacht sie.
2. **Eigentum beim Kunden**: Code, Daten und Zugänge gehören dem Kunden; das Modell ist austauschbar. Neu in der Vertrauensleiste: „KI-Modell austauschbar, kein Abo-Zwang“.
3. **Proprietäres Wissen je Kunde** über die Wissenssuche mit Fundstelle.

Folge für Preise: Tagessatz für Aufbau, NeXify Care für Betrieb. Laufende Modellkosten (COGS) wachsen linear mit dem Volumen und gehören transparent in das Angebot, nicht versteckt in den Tagessatz. Formel: (Input-Token × Preis) + (Output-Token × Preis) je Anfrage × Anfragen im Monat.
