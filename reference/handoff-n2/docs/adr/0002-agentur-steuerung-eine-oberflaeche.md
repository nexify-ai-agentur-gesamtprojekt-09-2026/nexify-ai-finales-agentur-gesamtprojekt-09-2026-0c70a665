# ADR-0002 · Agentur-Steuerung: eine Oberfläche mit Entscheidungs-Postfach

**Status:** angenommen (Ansatz und Startansicht) · **Datum:** 28.09.2026 · **Entscheider:** Pascal Courbois · **Umkehrbarkeit:** hoch (Oberflächenaufbau, keine Datenmigration)

## 1 · Kontext
Workspace und myADMIN beanspruchen beide, die Zentrale zu sein. „Wartet auf Pascal“ entsteht an fünf Stellen (Regelwerk `mensch`, Langlauf `wartet`, Posteingang-Entwürfe, Selbstheilung, Lernkandidaten) und landet an keiner. Anforderungen: alles aus der Web-UI führen, Freigaben nachvollziehbar und angemeldet, keine Freigabemüdigkeit.

## 2 · Optionen
| | A · eine Hülle: Chat + Befehlsleiste + Postfach | B · Leitstand zuerst, Chat als Seitenfeld | C · nur Chat |
|---|---|---|---|
| Pro | ein Ort, eine Navigation, alle Freigaben gebündelt | guter Zahlenüberblick | am wenigsten Oberfläche |
| Contra | größter Umbau des Workspace | zwei Welten bleiben | Entscheidungen gehen im Verlauf unter, schlecht prüfbar |

## 3 · Entscheidung
**A**, Startansicht **Entscheidungen** (beides von Pascal am 28.09.2026 gewählt). Risikostufen 0–3, Sammelfreigabe nur in Stufe 2. Details: `docs/plans/2026-09-28-agentur-steuerung-design.md`.

## 4 · Folgen
Neue Kerne `lib/entscheidungen.js`, `lib/selbstheilung.js` (noch nicht gebaut; Abschnitte 3–5 des Designs in Abstimmung). myADMIN v2 und Leitstand werden Bereiche der Hülle.
