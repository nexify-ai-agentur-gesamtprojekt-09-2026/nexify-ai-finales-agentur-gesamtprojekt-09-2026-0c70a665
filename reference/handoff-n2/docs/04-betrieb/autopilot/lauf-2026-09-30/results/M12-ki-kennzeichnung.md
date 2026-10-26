# M-12 · KI-Kennzeichnung (Art. 50 KI-VO) · Nachweis

**Zeit:** 2026-09-30T10:40:00Z · **Umgebung:** DUS, nexify-neu

## Ergebnis

| Prüfung | Wert |
|---|---|
| Regel `R-05` (KI-Kennzeichnung Art. 50) | vorhanden in `lib/regelwerk.js` |
| `KI_HINWEIS` an jede KI-Antwort | `lib/anfrage-pipeline.js` (abgewiesen/keine_info/ausfall/verworfen) |
| Posteingang validiert Hinweis | `lib/posteingang.js` (KI ohne Hinweis → Befund) |
| Test `anfrage-pipeline.test.js` | 11/11 (AP01 „Belegte Antwort mit KI-Hinweis und Quelle“) |

## Kernaussage

Jede ausgelieferte KI-Antwort trägt den festen Hinweissatz; KI-Mails ohne
Kennzeichnung werden durch `R-05` gesperrt. Art.-50-Anforderung ist technisch erzwungen.
