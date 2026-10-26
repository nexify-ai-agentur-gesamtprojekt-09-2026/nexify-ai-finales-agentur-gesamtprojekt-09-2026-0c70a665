# Band 11 · Prüfplan für alle Logiken und Seiten

> Stand 28.09.2026 · verbindlich für jede Änderung · Abweichung = Fehler, nicht Ermessen.

## 1 Wann dieser Plan läuft
| Anlass | Umfang |
|---|---|
| Jeder Merge Request | geänderte Kerne und Seiten vollständig, alle übrigen Kerne P1 |
| Vor jeder Inbetriebnahme-Stufe (Band 13) | **alles** |
| Nach jeder Bestandsübernahme (Band 12) | übernommener Teil + alle Kerne, die er berührt |
| Wöchentlich (Nachtlauf Sonntag) | alles; Ergebnis als QA-Protokoll |

## 2 Logik – 24 Kerne, 398 Prüffälle (Stand Browser 28.09.2026: alle grün)
Zusätzlich **P5 Verweise:** `node tools/verweise.js` – jede Seite, jeder Link und jeder Anker hat ein Ziel; Anker auf Website und Shop nur, wenn die Zielseite sie in `const ANSICHT`/`const RECHT` führt; keine Links auf ersetzte Fassungen.

Zusätzlich **P4 Inhalt:** `node tools/inhaltsabgleich.js` – jeder Fakt aus `config/fakten.json` steht auf allen Seiten und in allen Dokumenten gleich (0 Befunde).

Spalten: **P1** Prüffälle grün unter Node (`npx vitest run`) · **P2** Statik (`node tools/abhaengigkeiten.js`, `tools/code-regeln.js`, `tools/mandanten-pruefung.js`) · **P3** jeder im Lauf gefundene Fehler hat einen neuen Prüffall.

| Kern | Fälle | Quelle | P1 | P2 | P3 |
|---|---|---|---|---|---|
| `lib/anfrage-pipeline.js` | 11 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/betriebskennzahlen.js` | 12 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/einstellungen.js` | 15 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/entscheidungen.js` | 22 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/gedaechtnis.js` | 17 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/ki-muster.js` | 25 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/kundenwege.js` | 24 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/langfuse.js` | 9 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/langlauf.js` | 32 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/lernschleife.js` | 20 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/modi.js` | 10 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/nachtlauf.js` | 6 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/normpruefung.js` | 10 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/posteingang.js` | 20 | `tests/posteingang.test.js` | ☐ | ☐ | ☐ |
| `lib/prepaid.js` | 24 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/prompt-cache.js` | 13 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/pseo.js` | 8 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/rag.js` | 14 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/rechenkern.js` | 18 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/regelwerk.js` | 38 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/selbstheilung.js` | 11 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/tagrouter.js` | 13 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/inhaltsabgleich.js` | 12 | `FAELLE` im Modul | ☐ | ☐ | ☐ |
| `lib/versand.js` | 14 | `FAELLE` im Modul | ☐ | ☐ | ☐ |

**Regeln:** Summen neu zählen, nie fortschreiben · roter Lauf vor grünem · ein Kern ohne Verbraucher ist ein Befund (`tools/abhaengigkeiten.js`) · Zeit (`jetzt`) wird immer übergeben.

## 3 Seiten – 35 aktuelle Flächen
Spalten: **N** Normprüfung 1440/1024/390 px ohne Befund (`lib/normpruefung.js`, kein Querscrollen) · **L** interne Links auf vorhandene Dateien · **A** jeder `data-api-endpoint` steht in `api/openapi.yaml` · **Z** alle Zustände sichtbar (leer, laden, Fehler, Erfolg) · **B** Tastatur, Fokus, Kontrast ≥ 4,5 : 1, Ziele ≥ 44 px · **K** 0 Konsolenfehler.

| Nr. | Seite | N | L | A | Z | B | K |
|---|---|---|---|---|---|---|---|
| S-01 | `API-Rechtliches.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-02 | `Affiliate-Portal.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-03 | `Anmeldung.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-04 | `Architektur.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-05 | `Batterie-Berater.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-06 | `Fitment-Checker.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-07 | `Geschaeftsdokumente-Vorlagen.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-08 | `Investoren-PowerPoint.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-09 | `Konto.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-10 | `Kundenbroschuere.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-11 | `Kundenportal.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-12 | `Kundenwege.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-13 | `NX-Footer.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-14 | `NX-Header.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-15 | `Nachbarschaftskunden-Portal.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-16 | `NeXify API.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-17 | `NeXify Leitstand.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-18 | `NeXify Organisation.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-19 | `NeXify Posteingang.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-20 | `NeXify Workspace.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-21 | `NeXify-AI-Companion.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-22 | `NeXifyAI Cloud v10.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-23 | `NeXifyAI-Local-SEO-Muster.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-24 | `NeXifyAI-Wissenshub-Artikel.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-25 | `Partner-Broschuere.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-26 | `Partner-PowerPoint Werkstatt.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-27 | `Partner-werden.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-28 | `Partnerportal.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-29 | `Reifenrechner.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-30 | `Start.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-31 | `TEILEKLAR Shop.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-32 | `Visitenkarte-Pascal-Courbois.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-33 | `Werkstatt-Partnerseite.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-34 | `Zielverfolgung.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| S-35 | `myADMIN v2.dc.html` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

Nicht im Prüfumfang (ersetzt, nur Vergleich, nach Freigabe nach `versions/`): `Canvas.dc.html`, `NeXifyAI Cloud v3.dc.html`, `NeXifyAI Cloud v4.dc.html`, `NeXifyAI Cloud v5.dc.html`, `NeXifyAI Cloud v6.dc.html`, `NeXifyAI Cloud v7.dc.html`, `NeXifyAI Cloud v8.dc.html`, `NeXifyAI Cloud v9.dc.html`, `NeXifyAI Cloud.dc.html`, `Workspace Wireframes.dc.html`, `myADMIN.dc.html`.

## 4 Durchgängige Abläufe (Ende-zu-Ende)
| Nr. | Ablauf | Seiten → Kerne → Endpunkte | Abnahme |
|---|---|---|---|
| E1 | Registrierung, Bestätigung, Erstbesuch | Kundenwege → `kundenwege` → `/auth/register`, `/auth/verify`, `/onboarding` | keine Kontoaufzählung, Onboarding bis Firma |
| E2 | Angebot annehmen | Kundenportal → Kundenwege → `kundenwege` → `/offers/{id}/accept` | Doppelklick = 1 Auftrag, Fassungs-Hash geprüft |
| E3 | API Prepaid | NeXify API → `prepaid` → `/credit/topups`, Webhook | Gutschrift nur bei `completed` + Betragsabgleich; doppeltes Ereignis wirkungslos |
| E4 | Modellanfrage | Workspace → `anfrage-pipeline` → `/requests` | Belegprüfung, Ablauf-Spur, Kosten, Arbeitsweise |
| E5 | Posteingang | NeXify Posteingang → `posteingang`, `versand` → `/inbox` | Zuordnung, KI-Hinweis, Versand mit Sperrliste |
| E6 | Entscheidung | Leitstand/Workspace → `entscheidungen` → `/decisions` | Aktion nur mit gleichem Freigabe-Hash |
| E7 | Nacht und Selbstheilung | Worker → `nachtlauf`, `selbstheilung`, `prepaid.kontoPruefen` | Bericht, Karten, keine Hartsperre |

## 5 Protokoll
Je Lauf ein QA-Dokument `docs/04-betrieb/QA-JJJJ-MM-TT-NN.md` mit ausgefüllten Tabellen 2–4, Befunden (Critical/Important/Minor mit Datei:Zeile) und Urteil. Vorlage: `pruefprotokoll-code-review-2026-09-28.md`.
