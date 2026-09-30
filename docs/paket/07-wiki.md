# Band 07 · KI-Wiki: Aufbau und Pflege

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

## 1 Aufbau
| Schicht | Inhalt | Ort |
|---|---|---|
| Regeln | R-01…R-21 | `docs/generiert/regelverzeichnis.md` (erzeugt) |
| Entscheidungen | ADR 0001–0008 | `docs/adr/` |
| Fakten mit Stand | Fragensatz, Wiedervorlagen | `config/fragensatz.json` |
| Handbücher | Bände 00–10 | `docs/paket/` |
| Lehren | je Sitzung | `learning-captures/` |
| Übergaben | je Sitzung und Feature | `docs/handoffs/` |

## 2 Pflege
1. **Erzeugt, nicht getippt:** Verzeichnisse unter `docs/generiert/` nur aus `config/` (CI).
2. **Stand und Quelle:** jede Tatsache mit Datum und Primärquelle; ungeprüft = als `ungeprueft` markiert.
3. **Wiedervorlage:** 02.12.2026 (KI-VO Kennzeichnung), 01.01.2027 (Basiszins, E-Rechnung), jährlich (Kleinunternehmer).
4. **Einbettung:** Nachtlauf gleicht geänderte Dokumente ab (`lib/nachtlauf.js`); ohne Einbettungsmodell Abbruch statt Teilabgleich.
5. **Suche:** Stichwort + Bedeutung, verschmolzen (RRF), zweistufig (`lib/rag.js`).
