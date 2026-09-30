# NeXify AI API Prepaid – Betriebsablauf

Stand 28.09.2026 · Kern `lib/prepaid.js` (24/24) · Runbooks RB-11, RB-12, RB-13, RB-14 in `config/runbooks.json`.

## Je Anfrage (Gateway)
1. `max_tokens` Pflicht → `schaetzung()` = exakte Obergrenze → `reservieren(…, zeit)`. Ohne `max_tokens`: 422 `E_MAX_TOKEN`.
2. Modell → `abrechnen()` mit Ist. NeXify trägt keine Differenz mehr (Prüfprotokoll N1 geschlossen).

## Alle 5 Minuten (Worker)
| Aufgabe | Kern | Runbook |
|---|---|---|
| Verwaiste Reservierungen > 15 min freigeben; späte Antworten trotzdem abrechnen | `verwaisteFreigeben` | RB-11 |
| Aufladungen „angelegt“ > 10 min ohne Ereignis: Order bei Revolut abfragen | `zahlungVerbuchen` | RB-12 |
| Auto-Aufladung fällig? höchstens 2 je Tag | `autoFaellig` | – |

## Nachts 03:00 (Nachtlauf)
| Aufgabe | Kern | Bei Befund |
|---|---|---|
| Invarianten je Konto (Reservierungssumme, doppelte Buchung, Saldo) | `kontoPruefen` | Karte an Pascal (RB-13), keine Autokorrektur |
| Verbrauch gegen Anbieterrechnung (> 2 % Abweichung) | Abrechnungskonzept § 8 | Alarm |
| Offene Aufladungen > 24 h → `abgebrochen` | Worker | – |

## Monatlich (1., 03:00)
Verbrauchsnachweis je Kostenstelle (`monatsnachweis`), Beleg `verbrauchsnachweis`, Versand über `lib/versand.js`, Archiv.

## Nie automatisch
Korrekturbuchungen, Rückzahlungen, Gutschrift bei Betrags- oder Referenzabweichung (RB-14) – immer Karte an Pascal.
