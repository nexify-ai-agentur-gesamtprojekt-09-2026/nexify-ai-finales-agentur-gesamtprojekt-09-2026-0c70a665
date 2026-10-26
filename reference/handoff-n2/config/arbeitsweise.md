# Arbeitsweise (verbindlich, systemweit)

**Jede Chat-Nachricht (Auftrag/Anfrage/Frage) wird sofort an NeXify übergeben.**
Der Agent erhält ab da seine Aufträge und arbeitet sie bis zur Fertigstellung ab.
Schreibt der Nutzer **„Starte"**, startet sofort das Auftragsladen (Orchestrierung).

## Verarbeitungs-Standard (jede gesendete Nachricht)

Der Agent überdenkt, erweitert und formuliert die Eingabe richtig und korrekt, ergänzt:
- technische Spezifikationen,
- Messungen, Analysen, vorausschauende Planung (Berechnungen, Tests),
- tagesaktuelle Recherchen + Best-Practice-Lösungen,
- **Nachweis- und Quelllink-Kontrolle** (jede Aussage belegt).

## Daueraufgaben

- tiefgehende Internetrecherche zu allen relevanten Themen: Leistungen, Lücken,
  SEO, Lead-Gewinnung (auch via Mail, nach dokumentierten Ideen), Support.
- ständiges Lernen (Lernschleife), Selbstoptimierung, Vollintegration.

## Technik

- Hook `UserPromptSubmit` → NeXify (nx-jeff) → Auftrag → Orchestrierung.
- Trigger „Starte" → sofortiges Auftragsladen.
