# 08 · Recht und Compliance

**Alle Texte sind Entwürfe (Fassung 0.9, 29.09.2026). Anwaltliche Endprüfung vor Live-Betrieb ist Pflicht.**

## Textmatrix
| Fläche | Dokumente | Ort im Prototyp |
|---|---|---|
| Agentur-Website | Impressum, Datenschutz, AGB (B2B), KI-Hinweise, Barrierefreiheit, Cookies | `Rechtliches.dc.html` |
| one/one+/API/Terminal | Nutzungsbedingungen (Prepaid), AVV/TOM/UAV-Liste, Zulässige Nutzung, Lizenz Terminal | `NeXify AI one.dc.html` (Rechtliches), `Rechtliches.dc.html#nutzung-one` |
| Muster-Shop | AGB B2C/B2B, Widerruf + Muster-Formular, Versand & Zahlung, Datenschutz, Impressum, Barrierefreiheit | `NeXify Shop.dc.html` (Rechtliches) |
| E-Mails | Pflichtangaben im Fuß, KI-Kennzeichnung, Abmeldung nur bei Marketing | Vorlagen (Dokument 10) |
| Dokumente | Angebot (DIN 5008), Rechnung § 14 UStG, Gutschrift, Lieferschein | Vorlagen |

## Pflichtangaben (Anbieter)
NeXify AI, Inhaber Pascal Courbois (Eenmanszaak), Graaf van Loonstraat 1E, 5921 JA Venlo, NL · KvK 90483944 · USt-IdNr. NL865786276B01 · mail@nexifyai.cloud (Quelle: `docs/06-auftraege/rechtstexte.md`; bitte bestätigen).

## Rechtsrahmen (Auswahl, zu belegen im Quellenregister)
DSGVO Art. 6, 13, 14, 28, 30, 33; TDDDG § 25; KI-VO (EU) 2024/1689 Art. 4, 5, 50; § 312j BGB (Button-Lösung); § 355 BGB Widerruf; PAngV; ElektroG; BattG; VerpackG; LMIV; VO (EU) 1007/2011 Textilkennzeichnung; BFSG/EN 301 549 (B2C-Onlinehandel seit 28.06.2025); GoBD; § 14 UStG; MwStSystRL Art. 196; § 5 UWG (Irreführung); Geoblocking-VO (EU) 2018/302.

## Offene Punkte (blockierend vor Live)
| ID | Punkt | Wer |
|---|---|---|
| E1 | Aufschlag: „auf EK“ ×1,45 oder „÷0,55“; 38 % vs. 45 % KI-Aufschlag | Pascal |
| E3 | Mindestaufladung (Vorschlag 50 €) | Pascal |
| E4 | Steuer Prepaid (Anzahlungsrechnung?), Behandlung öffentlicher Einrichtungen | Steuerberatung |
| E5 | Guthaben-Verfall (Vorschlag: nie), Rückzahlung | Pascal + Recht |
| E6 | Hochrisiko-Prüfung bei Einsatz für Prüfungsauswertung | Recht |
| E12 | Anwaltliche Prüfung aller Texte | Recht |
| L14 | Anschrift/Register aus dem Bestand bestätigen | Pascal |
| L10 | GoBD-Archiv-Werkzeug | Betrieb |
| L1 | „Um ein Vielfaches günstiger“ nur mit datiertem Preisvergleich; bis dahin Prepaid-Argument | Marketing |
| L2 | „trainiert“ erst nach Live-Gang der Feinabstimmung; bis dahin „eingerichtet auf“ | Marketing |
| — | Newsletter nur mit Double-Opt-in nach Entscheidung | Pascal |
| — | Kennzahl-Beispiel 26 Std. → 4 Min. bleibt „Beispiel“ bis zum ersten Messwert (GL-06) | Vertrieb |

## Risiken je Text (drei größte)
- **Website/Preise:** Tagessatz falsch als Dauerpreis verstanden (Abmahnrisiko Preisklarheit) → jede Fläche „nur Aufbau, Betrieb optional“. Erfundene Referenzen (§ 5 UWG) → keine. KI nicht gekennzeichnet (Art. 50) → immer.
- **Shop:** Button-Lösung falsch beschriftet, Widerrufsbelehrung fehlt/veraltet, Pflichtangaben je Warengruppe fehlen (BFSG zusätzlich).
- **one/API:** Prepaid-Steuerbehandlung ungeklärt, Preisänderung ohne Vorlauf, Hochrisiko-Einsatz ohne Vertrag.
