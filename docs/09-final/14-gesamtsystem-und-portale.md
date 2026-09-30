# 14 · Gesamtsystem, Portale und Betriebslogik

**Ziel:** Alle Seiten, Unterlagen, Broschüren, E-Mails und Dokumente sind **ein System** mit einem Designsystem (`11`), einer Datenquelle für Zahlen (`config/fakten.json`) und einem Regelwerk für Prüfung (`config/design-rules.json`). Dieses Dokument beschreibt die Zuordnung und die fachlichen Abläufe, die Codex nachbauen muss.

## 1 · Systemkarte
| Schicht | Bestandteile | Quelle der Wahrheit |
|---|---|---|
| Marke & Design | Kopf `NX-Header`, Fuß `NX-Footer`, Designsystem | `config/design-tokens.json`, `11-designsystem-definition.md` |
| Öffentlich (indexierbar) | Start `NeXifyAI Cloud v12`, `NeXify AI one`, `NeXify API` (Produkt, Dokumentation, Preise), `NeXify Shop` (Muster), Wissenshub, Local-SEO-Muster, Rechtliches, API-Rechtliches, Partner-werden, Werkstatt-Partnerseite, Tools (Fitment, Batterie, Reifen), TEILEKLAR Shop | `config/fakten.json` |
| Portale (noindex) | Kundenportal, Konto, Partnerportal, Nachbarschaftskunden-Portal, Affiliate-Portal, Anmeldung, Kundenwege | Kontomodell `05-technische-spezifikation.md` |
| Intern (noindex) | NeXify Workspace, myADMIN, Leitstand, Posteingang | Regelverzeichnis, `06-brain…` |
| Unterlagen | Kundenbroschüre, Partner-Broschüre, Partner-Folien, Investoren-Folien, Geschäftsdokumente, Visitenkarte, E-Mails (Angebot, Newsletter) | Papier-Variante `11 §7` |
| Betrieb | Brain, Pipeline, Wissen | `config/brain/*.json` |

## 2 · Portal-Funktionsmatrix
| Funktion | Kundenportal | Konto (Autofahrer) | Partnerportal | Nachbarschaftskunden | Shop |
|---|---|---|---|---|---|
| Angebot ansehen / PDF | ✓ | – | – | – | – |
| Angebot annehmen (Button-Lösung) | ✓ → `Kundenwege` | – | – | – | – |
| Angebot ablehnen (Grund optional) | ✓ | – | – | – | – |
| Anpassung anfragen (Pflichttext) | ✓ | – | – | – | – |
| Rechnung ansehen / PDF | ✓ | ✓ | ✓ (Abrechnung) | Belege | Bestellbestätigung |
| Rechnung bezahlen | ✓ (Revolut, Prototyp) | – | offen | – | Kasse |
| Gutschrift | – | – | ✓ Dokument | – | Retoure |
| Guthaben (API) | ✓ Konsole | – | – | – | – |
| Termine | – | ✓ | ✓ | ✓ | – |
| Gutschein | – | – | ✓ Bestellung | ✓ Einlösen | ✓ Code |
Alle Downloads sind im Prototyp als „Musterdokument“ gekennzeichnet (HTML). Produktiv: PDF/A-3 mit XRechnung/ZUGFeRD, Erzeugung serverseitig (`GET /v1/documents/{id}/pdf`).

## 3 · Zustandsautomaten
**Angebot:** `entwurf → versendet → (angenommen | abgelehnt | anpassung)`; `anpassung → neue Fassung (versendet, Nr. …-v2)`; `versendet → abgelaufen` nach 30 Tagen. Annahme speichert Fassung, Zeitstempel, Rolle; Button-Text „Zahlungspflichtig annehmen“ nur bei Zahlungspflicht. Ablehnung erzeugt keine Folgemail außer Bestätigung; Anpassung benachrichtigt Pascal im Posteingang.
**Rechnung:** `offen → bezahlt` | `offen → überfällig (Fälligkeit + 1 Tag) → Mahnung 1 (+7) → Mahnung 2 (+14)`; Gutschrift referenziert Ursprungsrechnung, negative Position, gleicher Nummernkreis-Typ `GS`.
**Bestellung (Shop):** `warenkorb → kasse(1-4) → bestellt → zahlung_ok | zahlung_abgelehnt → versendet → zugestellt → (retoure)`; Bestand wird bei „bestellt“ reserviert, bei „zahlung_ok“ gebucht.
**API-Guthaben:** `aufladung angelegt → zahlung completed → gutschrift` (nur bei passender Referenz und Betrag); Verbrauch reserviert Höchstkosten vor Ausführung; Idempotenz über `Idempotency-Key`.
**Konto/Rollen:** Ein Konto, additive Rollen (Unternehmen, Autofahrer, Werkstatt, Nachbarschaftskunde, API, Partner, Affiliate, intern).

## 4 · Support-Chat und Service
NeXify AI antwortet regelbasiert (Prototyp: Regeln in `NeXifyAI Cloud v12`, Berater im Shop), kennzeichnet jede Antwort als KI, nennt nie Festpreise und übergibt bei Unsicherheit an Pascal (Werktage, Antwort meist am selben Tag). Produktiv: Gateway `nexify-auto`, Wissen mit Fundstelle (`06`), Eskalationsquote als Kennzahl.

## 5 · Öffentliche und interne Dokumentation
| Zielgruppe | Dokument |
|---|---|
| Entwicklung extern | API-Seite → Reiter „Dokumentation“ (Datenblatt, Endpunkte, Fehlercodes) |
| Kunden | Portal-Hilfe (offen: Handbuch je Portal), FAQ auf Start/one/API |
| Intern | `docs/09-final/00…15`, `docs/adr`, Betriebsbuch `07`, Regelverzeichnis |

## 6 · Konsistenz der Zahlen (gescannt)
Preise erscheinen konsistent: Tagessatz 449 € · Pilot 2.245 € · Care ab 249 € · Portal/Shop 2.694–3.592 € · Prepaid 50–5.000 €. **Gefunden und korrigiert:** Kundenportal zeigte „NeXify Care 1.347 €/Monat“ (= 3 Entwicklungstage) – jetzt „249,00 € netto/Monat“ (Care ab 249 €). Nicht geprüft: Zahlenbeispiele in E-Mails und Geschäftsdokumenten außerhalb der Preisliste.

## 8 · Nachträge (Prüfung Workspace, Rechtsseiten, Links)
- **Workspace:** Orchestrator-Beschreibung „ohne Rückfragen“ widersprach den Hartsperren (Rückfrage vor Dateiänderung, Zahlung, Nachricht an Dritte) → korrigiert. Angebots-Antwort rechnete USt 19 % DE, obwohl NeXify AI in NL sitzt → jetzt Reverse Charge (EU-B2B) laut `05 §4`; Beispiel-JSON `ust: reverse_charge`.
- **Rechtsseiten:** Ergänzt um AVV, Partnerprogramm (Werkstätten), Gutscheine (Nachbarschaftskunden), Affiliate – alle Entwurf 0.9, Freigabe E12.
- **E-Mails:** Fuß mit vollständiger Anbieterkennzeichnung; Schreibweise „NeXify AI“.
- **Links:** Alle internen Ziele und Anker geprüft (ohne TEILEKLAR-Shop); ein fehlender Anker (`one#zugaenge`) ergänzt.
- **Systemkarte:** nur intern (Sitzungssperre, noindex, ohne öffentlichen Fuß).

Gemeinsamer Block `#nx-mobil` in allen Seiten (Abschnitt 13). App-Shells: Workspace und myADMIN öffnen die Seitenleiste auf ≤ 820 px als Overlay (Workspace startet mobil geschlossen, myADMIN ist standardmäßig zu). Leitstand und Posteingang nutzen die Overlay-Regel noch nicht.
