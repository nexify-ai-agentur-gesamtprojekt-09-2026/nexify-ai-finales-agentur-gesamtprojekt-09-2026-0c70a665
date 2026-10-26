# Band 10 · Prüf- und Abnahmeplan

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

## 1 Stufen
| Stufe | Was | Werkzeug | Abnahme |
|---|---|---|---|
| P1 Kerne | alle Prüffälle | Leitstand → Kerne; `npx vitest run` | 100 % grün (Stand Browser: 398/398) |
| P2 Statik | Abhängigkeiten, Code-Regeln, Mandanten, Regelwerk | `node tools/*.js` in CI | 0 neue Befunde |
| P2a Inhalt | Fakten gleich auf allen Seiten und Dokumenten | `node tools/inhaltsabgleich.js` | 0 Befunde |
| P3 Vertrag | OpenAPI | `spectral lint` | 0 Fehler |
| P4 Datenbank | Migrationen 001–008, Mandant A ↛ B | leere Postgres 16 | 3 Mandanten, Lesen/Schreiben fremd = 0 Zeilen |
| P5 Oberflächen | Normprüfung 1440/1024/390 px | `lib/normpruefung.js` | 0 Befunde |
| P6 Integration | Revolut-Sandbox, Resend, 9router | Worker gegen Sandbox | doppelte/ungeordnete Ereignisse ohne Doppelbuchung |
| P7 Installation | `install.sh --nur-pruefen`, dann `--parallel` | Server | Health 13/13 in 60 s |
| P8 Abnahme | Go-Live-Abschlusstest | `docs/handoffs/kundenwege/spezifikationspruefung.md` Teil 2 | Sign-off Pascal |

## 2 Regeln
Roter Lauf vor grünem; jeder Fehler wird Prüffall (L4); Summen neu zählen, nie fortschreiben; Review je MR durch zweiten Prüfer (`docs/04-betrieb/pruefprotokoll-code-review-2026-09-28.md` § 7).

## 3 Protokolle
QA-Dokumente in `docs/04-betrieb/`, Nummer `QA-JJJJ-MM-TT-NN`.
