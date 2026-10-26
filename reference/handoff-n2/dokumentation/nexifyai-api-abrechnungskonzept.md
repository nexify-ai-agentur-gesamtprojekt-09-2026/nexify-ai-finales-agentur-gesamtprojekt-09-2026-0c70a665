# NeXify AI API · Abrechnungs- und Produktkonzept

**Fassung 0.9 · 27.09.2026 · Entwurf zur Freigabe durch Pascal Courbois**

> **Hinweis 28.09.2026:** Für Prepaid gelten die Abschnitte 3, 7 und 8 in der Fassung von `api-prepaid-umsetzung.md` und `api-prepaid-betrieb.md`. Werte wie Mindestaufladung und Formel stehen verbindlich nur in `config/api-prepaid.json` und `config/fakten.json`.
Grundlage: AgentMemory (Finale Gesamtlösung A–Z, Gesamtprojekt-Register NX-GR-009/010/011/014, Blocker-Matrix, Core-OpenAPI `/v1/ledger`, `/v1/revolut`, `scripts/nexifyai-margin-prepaid.py`, Business-Portal DUS) und Ihre Vorgabe vom 27.09.2026.

---

## 0. Zuerst entscheiden: Welche 45 %?

Ihre heutige Vorgabe und der Stand im Wissensspeicher unterscheiden sich um fast das Doppelte.

| | Formel | EK 100,00 € → Netto-VK | Rohertrag | Marge am VK |
|---|---|---|---|---|
| **A · Aufschlag auf EK** (Vorgabe 27.09.) | VK = EK × 1,45 | **145,00 €** | 45,00 € | 31,0 % |
| **B · Marge auf Endpreis** (AgentMemory 24.09., im Skript umgesetzt) | VK = EK ÷ 0,55 | **181,82 €** | 81,82 € | 45,0 % |

Das Konzept rechnet mit **A**, weil es Ihre jüngste Aussage ist. Das Skript `nexifyai-margin-prepaid.py` und das Business-Portal rechnen derzeit **B**. Eine der beiden Stellen muss angepasst werden, sonst weichen Angebot und Rechnung voneinander ab. → **Entscheidung E1**.

---

## 1. Das Produkt in einem Satz

**Ein Schlüssel, ein Guthaben, eine Rechnung.** Der Kunde bekommt einen NeXify-AI-Schlüssel, ruft darüber alle freigegebenen KI-Modelle auf (über den eigenen 9Router, EU-Hosting Frankfurt) und sieht in einer einzigen Zahl, was er verbraucht hat und wie lange sein Guthaben reicht.

### Drei Arten, es zu nutzen

| Weg | Für wen | Beispiel |
|---|---|---|
| **API** (OpenAI-kompatibel, `/v1/chat/completions`, `/v1/messages`, `/v1/embeddings`) | Kunden mit eigener Entwicklung | Studienkolleg-IT bindet Prüfungsauswertung an |
| **Fertige Agenten** (Chat, E-Mail, Wissenssuche) | Kunden ohne Entwickler | Lern-Chatbot auf der Website |
| **Eingebaut in NeXify-Projekte** | alle Projektkunden | KI-Funktion im gebauten Kundenportal |

Alle drei laufen über denselben Zähler und dieselbe Abrechnung.

---

## 2. Preisbildung

### 2.1 Formel je Anfrage

```text
EK_Anfrage   = Input-Token × EK_in + Output-Token × EK_out  (+ Cache-/Bild-/Audio-Anteile)
EK_EUR       = EK_USD × EZB-Referenzkurs (fest je Kalendermonat, Kurs vom 1. Arbeitstag)
VK_netto     = EK_EUR × 1,45                                (Variante A, siehe E1)
Steuer       = nach Kundensitz (Abschnitt 4)
```

- **Preistabelle versioniert**: jede Modellpreis-Änderung des Anbieters erzeugt eine neue Version mit Gültig-ab-Datum. Die Anfrage speichert die Version, die galt. Rechnungen sind damit jederzeit nachrechenbar (GoBD).
- **Rundung**: intern auf 6 Nachkommastellen je Anfrage, auf der Rechnung je Position auf Cent. Keine Rundung je Anfrage auf Cent — sonst wird jede Kleinstanfrage 0,01 €.
- **Kein Mindestumsatz, keine Grundgebühr** für die API. Einnahmen entstehen ausschließlich am Verbrauch (klar kommunizierbar).
- **Ersparnis weitergeben**: Wo der Anbieter Cache-Rabatt gewährt, sinkt der EK — und damit der VK automatisch mit. Das ist ehrlich und ein Verkaufsargument.

### 2.2 Rechenbeispiel (Beispielwerte, keine echten Modellpreise)

| | Wert |
|---|---|
| Anfrage | 2.000 Input-, 500 Output-Token |
| EK angenommen | 3,00 US-$ / 15,00 US-$ je Mio. Token |
| EK_USD | 0,0060 + 0,0075 = 0,0135 US-$ |
| Kurs angenommen | 1 US-$ = 0,92 € → EK 0,01242 € |
| VK netto (A) | **0,01801 €** je Anfrage |
| 10.000 Anfragen/Monat | **180,09 € netto** |

---

## 3. Bezahlarten — der Kunde wählt eine, wechseln geht jederzeit

| | **Prepaid** (Standard) | **Monatsrechnung** | **Prepaid + Auto-Aufladung** |
|---|---|---|---|
| Für | Neukunden, Kleinbetriebe | Institutionen, Behörden, Schulen (z. B. Studienkolleg) | Dauernutzer ohne Verwaltungsaufwand |
| Ablauf | Guthaben per Revolut aufladen, Verbrauch wird abgezogen | Verbrauch des Monats wird am 1. abgerechnet, Zahlungsziel 14 Tage | Fällt das Guthaben unter X €, wird Y € automatisch nachgeladen |
| Sicherheit für NeXify | voll (keine Leistung ohne Guthaben) | **Kreditrahmen** je Kunde (z. B. 1.000 €), darüber Sperre | voll |
| Rechnung | je Aufladung eine Rechnung über das Guthaben + monatlicher Verbrauchsnachweis | eine Rechnung pro Monat mit Kostenstellen | wie Prepaid |
| Voraussetzung | – | Vertrag, geprüfte USt-IdNr./Behördennachweis, Freigabe durch Pascal | hinterlegtes Zahlungsmittel |

**Steuerlicher Hinweis zu Prepaid** (vor Livegang mit Steuerberatung klären, E4): Ob die Rechnung bei der Aufladung (Anzahlung) oder erst bei Verbrauch entsteht, entscheidet die Steuerberatung. Das Konzept sieht vor: Aufladung = Anzahlungsrechnung, monatlicher Verbrauchsnachweis = Schlussrechnung mit Verrechnung. Das ist der vorsichtige Weg.

### Schwellen und Sperren (für alle Arten gleich)

| Stand | Was passiert |
|---|---|
| 50 % des Budgets / Guthabens verbraucht | E-Mail „Hälfte erreicht“ |
| 80 % | E-Mail + Banner im Portal |
| 100 % | **Weich-Stopp** (Standard): Nur noch als „kritisch“ markierte Schlüssel laufen weiter, z. B. laufende Prüfung. **Hart-Stopp** wählbar. |
| Kreditrahmen erreicht | Sperre, sofortige E-Mail an Kunde und Pascal |

Ein laufender Prüfungsvorgang wird **nie mitten in der Antwort abgebrochen** — Sperren greifen erst bei der nächsten Anfrage.

---

## 4. Steuer (BTW / USt) — NeXify AI sitzt in Venlo (NL)

| Kunde | Behandlung | Rechnungsvermerk |
|---|---|---|
| Unternehmen in NL | 21 % BTW | – |
| Unternehmen in DE/AT/BE/LU u. a. EU mit gültiger USt-IdNr. (VIES geprüft) | 0 %, Steuerschuldnerschaft des Leistungsempfängers | „BTW verlegd / Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL)“ |
| CH und Drittland | nicht steuerbar in NL | „Nicht im Inland steuerbar“ |
| **Studienkolleg / öffentliche Einrichtung in DE** | abhängig davon, ob die Einrichtung eine USt-IdNr. hat und als Unternehmer für diese Leistung gilt | **vor Vertragsschluss durch Steuerberatung klären (E4)** |

Die VIES-Prüfung läuft automatisch beim Anlegen und vor jeder Monatsrechnung; das Ergebnis wird mit Zeitstempel gespeichert.

---

## 5. Kostenstellen — so wird es für Institutionen einfach

Der Kunde legt **Kostenstellen** an (z. B. „Prüfungen“, „Lern-Chat“, „Verwaltungsbot“). Jede Kostenstelle bekommt einen eigenen Schlüssel und ein eigenes Monatsbudget.

**Beispiel Studienkolleg Aachen** (Struktur, Werte frei gewählt):

| Kostenstelle | Schlüssel | Budget/Monat | Weich-Stopp | Kritisch |
|---|---|---|---|---|
| Prüfungsauswertung | `nx_live_pruefung…` | 400 € | ja | **ja** (läuft weiter) |
| Lern-Chat Studierende | `nx_live_chat…` | 250 € | ja | nein |
| Verwaltungsbot | `nx_live_verw…` | 80 € | ja | nein |

Die Monatsrechnung zeigt **eine Zeile je Kostenstelle** mit Anfragen, Token und Betrag — genau das, was Haushalt und Kämmerei brauchen. Auf Wunsch zusätzlich je Kurs oder Semester (optionaler Parameter `tag` in der Anfrage).

### Kostenstellen-Rechnung (Aufbau)

```text
Pos. Kostenstelle          Anfragen   Token (Mio.)   Netto
1    Prüfungsauswertung      3.214       9,84       312,40 €
2    Lern-Chat              18.902      21,10       198,77 €
3    Verwaltungsbot            611       0,93        11,92 €
     Summe netto                                    523,09 €
     USt/BTW (siehe Abschnitt 4)
```

---

## 6. Clevere Zusatzlösungen

| Lösung | Nutzen | Aufwand |
|---|---|---|
| **Preis vor der Anfrage** (`/v1/estimate`) | Zeigt vor einer großen Auswertung, was sie ungefähr kostet | klein |
| **Pauschale je Vorgang** | „1 Prüfung = 0,40 €“ statt Token. Berechnet aus dem Durchschnitt der letzten 30 Tage + Puffer; monatlich nachjustiert. Ideal für Haushaltsplanung | mittel |
| **Modell-Routing** | Einfache Fragen gehen automatisch an ein günstigeres Modell. Der Kunde sieht die Ersparnis im Portal | mittel |
| **Budget je Person** | z. B. 2 € Lern-Chat pro Studierendem und Monat, ohne dass einzelne das Budget aufbrauchen | mittel |
| **Reichweite in Tagen** | Portal zeigt nicht nur „82,14 €“, sondern „reicht bei aktuellem Verbrauch noch ca. 19 Tage“ | klein |
| **Partner-Weiterverkauf** | Agenturen/Partner verkaufen NeXify AI unter eigenem Namen mit eigenem Aufschlag; NeXify rechnet mit dem Partner ab (Partnerportal) | groß |
| **Semester-/Jahres-Guthaben** | Schulen buchen Guthaben zum Haushaltsjahr; Rest verfällt nicht, sondern wird übertragen (Kundenfreundlichkeit, E5) | klein |
| **Datenschutz-Schalter** | je Kostenstelle: Inhalte werden nicht gespeichert, nur Zähldaten. Für Prüfungsdaten Standard | klein |

---

## 7. Bedienung — drei Bildschirme, mehr nicht

Für den Kunden gibt es im Kundenportal genau drei Ansichten:

1. **Guthaben** — eine große Zahl, darunter „reicht ca. X Tage“, ein Knopf „Aufladen“ (Beträge 50 / 200 / 500 € / frei).
2. **Verbrauch** — Balken je Tag, Liste je Kostenstelle, Download CSV/PDF.
3. **Schlüssel** — Kostenstelle anlegen, Budget setzen, Schlüssel kopieren oder sperren.

Keine Token-Fachsprache auf der ersten Ebene. Token und Modelle stehen erst in der Detailansicht.

---

## 8. Technik (Kurzfassung, baut auf Vorhandenem auf)

```text
Kunde ─► api.nexifyai.cloud (Gateway) ─► 9Router :20128 ─► Modellanbieter
             │ Schlüssel prüfen, Budget prüfen (vor der Anfrage)
             │ Anfrage streamen
             └► usage_logs (Anfrage-ID, Kostenstelle, Modell, Token, Preisversion, EK, VK)
                    └► Ledger (/v1/ledger): Abbuchung, doppelte Buchführung, unveränderlich
                           ├► Prepaid: Saldo, Schwellen, Auto-Aufladung (/v1/revolut)
                           └► Monatslauf 1. des Monats 03:00: Rechnung, VIES, PDF, E-Mail, GoBD-Archiv
```

- **Budgetprüfung vor der Anfrage** mit geschätzten Kosten, **Buchung nach der Anfrage** mit echten Token.
- **Ausfall**: fällt ein Modell aus, Wechsel auf das hinterlegte Ersatzmodell; der Kunde zahlt den Preis des tatsächlich genutzten Modells.
- **Keine Doppelbuchung**: jede Anfrage-ID wird genau einmal gebucht (Idempotenz).
- **Kontrolle**: täglicher Abgleich Summe `usage_logs` ↔ Anbieterrechnung. Abweichung > 2 % → Alarm an Pascal.

Bestehende Bausteine: 9Router, Core-OpenAPI `/v1/ledger` + `/v1/revolut`, Prepaid-Helfer mit Sperrschwelle, Business-Portal mit Preisrechner. Neu zu bauen: Gateway-Zählung, Kostenstellen, Monatslauf, Portal-Ansichten.

---

## 9. Recht und Vertrag

- **AGB-Ergänzung „NeXify AI API“**: Preisformel offenlegen (EK-Basis + Aufschlag), Preisänderung bei Anbieteränderung mit 30 Tagen Vorlauf, Sperrregeln, Kreditrahmen.
- **AVV**: Anbieter als Unterauftragsverarbeiter benennen; Datenschutz-Schalter dokumentieren.
- **KI-VO**: Chatbots für Studierende kennzeichnen (Art. 50). **Prüfungsauswertung durch KI kann „Hochrisiko“ sein (Anhang III Nr. 3, Bildung: Bewertung von Lernergebnissen)** — vor Einsatz beim Studienkolleg rechtlich prüfen lassen (E6). Menschliche Letztentscheidung über Noten ist Pflicht im Konzept.
- **GoBD**: unveränderliche Buchungen, Rechnungsarchiv 7 Jahre (NL) / 10 Jahre (DE-Pflichten des Kunden beachten).

---

## 10. Einführung in drei Schritten

| Schritt | Inhalt | Abnahme |
|---|---|---|
| 1 | Zählung + Kostenstellen + Prepaid (ohne Monatsrechnung) für NeXify selbst | 7 Tage Abgleich usage_logs ↔ Anbieter < 2 % |
| 2 | Pilotkunde (Studienkolleg) auf Monatsrechnung mit Kreditrahmen | erste Monatsrechnung von Kunde abgenommen |
| 3 | Portal-Ansichten für alle, Auto-Aufladung, Pauschale je Vorgang | L1/L2/L3 je Baustein |

---

## 10a. Rechenkern (getestet)

`tools/nexify-preis.js` enthält Preisformel (Varianten A und B), Token-Kosten, Cent-Rundung je Position, Steuersatz und Rechnungsvermerk nach Kundensitz, Schwellen 50/80/100 %, Sperrlogik (weich/hart, kritische Schlüssel, Kreditrahmen) und doppelbuchungsfreie Buchung. Nach TDD entstanden: `tools/nexify-preis.test.js` wurde zuerst geschrieben und schlug fehl, danach Umsetzung, **19/19 Tests grün** (27.09.2026). Grundlage für Gateway, Ledger und Monatslauf; Preistabelle und EZB-Kurs kommen dort hinzu.

## 10b. Eigene und lokale Modelle (Kostenstufe 0)

**Ziel:** Einfache, wiederkehrende Aufgaben laufen auf eigenen, auf NeXify-Wissen angepassten Modellen — lokal auf den VPS (Frankfurt/Düsseldorf) statt beim Anbieter. Die Modelle werden über den **bestehenden 9Router** eingebunden; für den Kunden ändert sich nichts (gleicher Schlüssel, gleiche Abrechnung).

| Stufe | Modell | Einsatz | EK je Anfrage |
|---|---|---|---|
| 0 · lokal | offenes Modell (z. B. 7–8B, quantisiert), per LoRA auf NeXify-Daten angepasst | Einordnen, Sortieren, FAQ, Zusammenfassen | keine Tokenkosten; **Strom, Hardware, Betrieb** werden als Pauschale je 1.000 Anfragen umgelegt (NX-GR-014) |
| 1 · günstig | günstiges Anbieter-Modell im 9Router | Standard-Antworten | niedrig |
| 2 · stark | Spitzenmodell | Prüfungsauswertung, komplexe Texte | hoch |

**Routing:** Jede Anfrage startet auf der niedrigsten geeigneten Stufe. Unsichere Antworten (Konfidenz unter Schwelle, Schema-Prüfung fehlgeschlagen) gehen automatisch eine Stufe höher. Prüfungsbezogene Kostenstellen sind fest auf Stufe 2.

**Internes Lernen (Transformers/PEFT, Hugging Face):** Nur freigegebene, pseudonymisierte Daten (keine Prüfungsinhalte ohne Einwilligung und AVV). Monatlicher Trainingslauf auf den eigenen Servern, Versionierung der Adapter, Regressionstest gegen feste Testfragen vor jedem Wechsel. Übernahme nur, wenn die neue Version im Test mindestens gleich gut ist.

**Wächter (Skill `waechter-bauen`):**
1. *Schlägt an:* Gegentest mit künstlich verschlechtertem Adapter muss Alarm auslösen.
2. *Schweigt:* Meldung nur bei neuer Abweichung (Qualität < Vormonat, Eskalationsquote > Schwelle).
3. *Empfängt jemand:* Alarm über die bestehende Kette an Pascal, Zustellung wird bestätigt; jeder Lauf schreibt eine Zeile mit Trefferzahl.

**Ehrlich:** „kostenfrei“ gilt nur für Tokenkosten. Rechenzeit auf den VPS belastet andere Dienste (bekannte Host-Drosselung). Vor Einführung Lastmessung auf DUS/FRA; bei Engpass eigener GPU-Server oder Beibehaltung Stufe 1. Die Bezeichnung „jev ai“ aus der Vorgabe ist im Wissensspeicher nicht auffindbar — Modellname und 9Router-Eintrag bitte bestätigen.

## 11. Entscheidungen, die nur Pascal treffen kann

| Nr. | Frage |
|---|---|
| **E1** | 45 % als **Aufschlag auf EK** (×1,45) oder als **Marge am Endpreis** (÷0,55)? |
| E2 | Kreditrahmen für Monatsrechnung: Standardhöhe? |
| E3 | Aufladebeträge und Mindestaufladung (Vorschlag 50 €) |
| E4 | Steuerberatung: Anzahlungsrechnung bei Prepaid? Behandlung Studienkolleg? |
| E5 | Verfällt Guthaben? (Vorschlag: nein, Rückzahlung auf Antrag) |
| E6 | Prüfungsauswertung beim Studienkolleg: rechtliche Prüfung KI-VO Hochrisiko beauftragen? |
| E7 | Wird der EK dem Kunden offengelegt (volle Transparenz) oder nur der VK? |
