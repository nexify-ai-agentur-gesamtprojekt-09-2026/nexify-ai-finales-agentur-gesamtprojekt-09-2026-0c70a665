# Band 08 · Spezifikation Workspace-Startansicht

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

## 1 Zweck
Eine Oberfläche für Pascal und Team (ADR-0002): Chat mit Agenten, Entscheidungs-Postfach, Ablauf je Antwort.

## 2 Startansicht (Soll)
| Bereich | Inhalt | Quelle |
|---|---|---|
| Kopf | Signet, Suche, Arbeitsweise (gewählt oder erkannt), `#stopp` sichtbar | `lib/modi.js`, `lib/tagrouter.js` |
| Links | Chats, temporärer Chat, Ordner | `NeXify Workspace.dc.html` |
| Mitte | Begrüßung ohne Karten-Raster; Eingabe mit Kürzeln; zuletzt offene Entscheidungen (max. 3) | `lib/entscheidungen.js` |
| Rechts (Seitenfeld) | Reiter Quellen · Ablauf (Langfuse-Spur) · Einstellungen | `lib/langfuse.js`, `lib/einstellungen.js` |
| Unter jeder Antwort | KI-Hinweis, ▲/▼, ≋ Ablauf, Quellen nur wenn belegt | `lib/anfrage-pipeline.js` (`art`) |

## 3 Zustände
`antwort` · `keine_info` · `verworfen` · `ausfall` · `abgewiesen` (siehe `docs/handoffs/anfrage-pipeline/api-uebergabe.md`). Laden: „Agent denkt …“; Streaming folgt.

## 4 Offen
Arbeitsweise im Kopf anzeigen/wählen; neue `#tags` im Tag-Router; Hell/Dunkel/System-Umschalter (Band 09).


## Navigation systemweit (Stand 28.09.2026)
| Baustein | Datei | Wo | Inhalt |
|---|---|---|---|
| Kopfzeile öffentlich | `NX-Header.dc.html` | alle öffentlichen NeXify- und TEILEKLAR-Seiten, Portale, Kundenwege | Marke, Markt/Sprache, Hauptnavigation je `nav` (cloud, shop, werkzeug, portal, partner, intern), Konto je Rolle, Abmelden, Aktion |
| Fußzeile | `NX-Footer.dc.html` | alle Seiten | Spalten NeXify/TEILEKLAR/Portale, Rechtslinks → `Rechtliches.dc.html#…`, Cookie-Einstellungen, Claim |
| Interne Leiste | `NX-Intern.dc.html` | Workspace, Posteingang, Leitstand, myADMIN, Organisation, Zielverfolgung, Architektur, Geschäftsdokumente, Kundenbroschüre | 9 Einträge, aktive Seite, Betriebsstatus (Prop `status`), Abmelden |

**Regeln:** Neue Seite → Eintrag in genau einem Baustein, nie eigene Kopfzeile. Rechtslinks nur auf `Rechtliches.dc.html`. Betriebsstatus der Leiste kommt später vom Health-Endpunkt (E14); bis dahin „Vorschau“.
