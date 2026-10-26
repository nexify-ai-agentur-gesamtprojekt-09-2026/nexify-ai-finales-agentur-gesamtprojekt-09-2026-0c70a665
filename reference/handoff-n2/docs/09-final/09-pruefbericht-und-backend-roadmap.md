# 09 · Prüfbericht, Lücken, Backend-Roadmap

## 1. Durchgeführte Prüfungen
| Prüfung | Ergebnis |
|---|---|
| Laden ohne Konsolenfehler: Start v12, one, Shop (nach Korrekturen) | ok |
| Logik-Syntaxprüfung `NeXify AI one` (1 Klammerfehler gefunden, behoben) | ok |
| Header-Verweise (CLOUD-Konstante zeigte auf v10, CTA-Anker `#beratung` fehlte in v12) | behoben |
| Logo-Rahmen bei Hover/Fokus (Kundenwunsch) | entfernt, Fokus als Unterstreichung |
| Kopfzeile: Buttons lagen oben/unten an | 9 px Luft, Pillen-Gruppen |
| Rechtstexte: Register war gesperrt/leer | Entwurf 0.9 eingefügt, Fehlerhinweis geändert |
| Aussage „Tagessatz = Dauerpreis“ (Kundenkritik) | überall auf „einmaliger Aufbau, Betrieb optional“ umgeschrieben |
| Kontrast (Stichprobe): Text `#9CA29E` auf `#242826` 5,9:1; Lime-Text `#111312` auf `#D7FA50` 15,2:1 | ok |
| Inhalts-Abgleich Preise gegen `fakten.json` | **noch durchzuführen** (Skript im Ordner `tools/` nutzen) |

## 2. Gefundene Probleme (Auswahl) und Behandlung
Doppelter Klammerabschluss (behoben) · Verlust des Signets beim Bearbeiten (sofort restauriert) · abstrakte, „billige“ Grafiken (ersetzt durch Szenen mit echtem Inhalt) · unklare Kennzahl-Sprache (neu geschrieben, eigener Abschnitt „Die Zahl“) · Footer flach (Verläufe, Radien, Schatten vereinheitlicht).

## 3. Verbleibende Einschränkungen
- Prototyp ohne Backend: Formulare, Chat, Demos, Shop-Kasse laufen mit Mock-Daten.
- Nicht in dieser Runde visuell geprüft: Kundenportal, Anmeldung, API-Konsole (Stil vor der Überarbeitung, vor Live angleichen); Übersetzungen NL/FR (Rahmen vorhanden).
- Screenshot-Prüfung auf 320/768/1440 px steht für Shop und one-Seite aus.
- Preise one/one+ und Aufschlag-Variante nicht freigegeben; Rechtstexte ohne anwaltliche Prüfung.
- LightRAG-Rückstau (NX-GR-019), Tool-Orakel und LoRA-Lauf sind Bauaufträge.

## 4. Backend-Roadmap (konzeptionell, Reihenfolge)
| Phase | Baustein | Abnahme |
|---|---|---|
| B1 | Gateway `POST /v1/requests`, Auth (Einmallink + 2FA), Rollen/RLS, Journal | Prüffall Rolle A/B |
| B2 | Ledger + Revolut (Order, Webhook, Signatur), Rechenkern (Cent), Preistabelle versioniert | 7 Tage Abgleich usage ↔ Anbieter < 2 % |
| B3 | KI-Router (Stufe 0/1/2), Werkzeug-Register (MCP), Budget/Kostenstellen | Sperrlogik-Tests grün |
| B4 | Shop-Modul (Katalog, Bestellung, OSS-Steuer, E-Mails) generisch | Muster-Shop auf echter Logik |
| B5 | Wissens-Pipeline + Nachtlauf + Regressionstest | Fundstellen-Treffer ≥ 90 % |
| B6 | Angebots-/Portal-Module (Annahme, Abnahme L1–L3, Rechnungen PDF/XRechnung) | E2E-Journey J6 |
| B7 | Tool-Orakel, LoRA-Vorschlag, Statusseite, GoBD-Archiv | Freigabe-Gate |
Nicht implementieren, bevor E1/E3/E4 entschieden sind: Abrechnung, Rechnungslauf, Auto-Aufladung.

## 5. Nächster Schritt
Freigaben E1/E3/E4/E12 einholen → B1/B2 → Startseite/one/Shop im Zielsystem nachbauen (Design-Referenzen) → Normlauf und Screenshot-Prüfung 320/768/1440 → Freigabe-Gate.
