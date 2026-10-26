# Spezifikationsprüfung und Go-Live-Abschlusstest: Kundenwege

Rolle: **Entwickler** (prüft die vorhandene Spezifikation vor der Umsetzung) · Stand 28.09.2026
Geprüft: `Anmeldung.dc.html` (Registrierung), `Kundenportal.dc.html` (Angebote), `api/openapi.yaml` (`/auth/register`, `/offers/{id}/accept`). Onboarding war nirgends beschrieben.

## Urteil vor dem Einbau: ❌ Ablehnung – 2 Blocker, 5 Major

### Blocker
1. `[API][DATA]` **Wenn der Kunde „Annehmen“ doppelt klickt oder die Verbindung nach dem Klick abreißt**, ist undefiniert, ob ein zweiter Auftrag entsteht. `Kundenportal` setzt nur lokal `status: angenommen`; die Spezifikation verlangt zwar einen Idempotenz-Schlüssel, sagt aber nicht, was eine Wiederholung zurückgibt. → Auftrag und Rechnung wären doppelt, nicht wiederherstellbar.
2. `[UI][POLICY]` **Wenn der Kunde das Kundencenter zum ersten Mal öffnet**, ist der gesamte Ablauf unbeschrieben: welche Daten Pflicht sind, bevor das Projekt startet, und was bei Abbruch passiert.

### Major
3. `[API]` **Wenn NeXify ein Angebot ändert, während der Kunde es geöffnet hat**, ist undefiniert, welche Fassung er annimmt.
4. `[POLICY]` **Wenn ein Mitarbeiter ohne Zeichnungsbefugnis annimmt**, gibt es weder Bestätigung noch einen Weg „an die berechtigte Person weiterleiten“.
5. `[UI]` **Wenn ein Angebot nach Ablauf geöffnet wird**, zeigt das Portal weiter „Annehmen“ (kein Zustand „abgelaufen“).
6. `[API]` **Wenn sich jemand mit einer Adresse registriert, die schon ein Konto hat**, liefert `/auth/register` 409 – das verrät, dass es das Konto gibt (Widerspruch zu `Anmeldung.dc.html`, wo „Passwort vergessen“ genau das verhindert).
7. `[DATA]` **Wenn ein Bestandskunde mit vollständigen Daten zum ersten Mal nach dem Rollout kommt**, ist undefiniert, ob er das Onboarding erneut durchläuft.

### Minor
8. `[UI]` „Link erneut senden“ ohne Bremse und ohne Obergrenze.
9. `[POLICY]` Verbraucher sind nicht ausgeschlossen, obwohl NeXify nur B2B beauftragt (§ 14 BGB) – sonst gälte das Widerrufsrecht mit Button-Pflicht nach § 312j BGB.

### Silence-Check
Geprüft und **nicht** gemeldet, weil schon abgedeckt: Passwortregeln (12 Zeichen, Einfügen erlaubt), getrennte Einwilligungen ohne Vorbelegung, Sperre nach Fehlversuchen, Einladung aus dem Angebot, KI-Kennzeichnung.

### Pre-Mortem
Nach dem Go-Live kämen am ehesten Tickets „Ich habe zwei Rechnungen bekommen“ (1), „Ich wurde beim Einloggen wieder durch die Einrichtung geschickt“ (7) und „Mein Kollege hat beauftragt, das durfte er nicht“ (4).

## Umsetzung

| Befund | Gelöst in | Prüffall |
|---|---|---|
| 1 Doppelauftrag | `angebotAnnehmen` gibt bei gleichem Schlüssel dasselbe Ergebnis zurück; neuer Schlüssel auf angenommenes Angebot → `E_SCHON_ANGENOMMEN` | KW10, KW11 |
| 2 Onboarding | fünf Schritte, Pflicht: Rechnungsdaten und Kickoff; pausierbar, Stand serialisierbar | KW18, KW20, KW23 |
| 3 Fassung | Annahme nur mit angezeigter `version`, sonst `E_VERSION` | KW13 |
| 4 Berechtigung | Pflichthaken + Knopf „An berechtigte Person weiterleiten“ | KW15 |
| 5 Ablauf | `angebotAnsehen` setzt `abgelaufen`, `annehmbar: false` | KW12, KW16 |
| 6 Aufzählung | Antwort immer „bestätigen“; Unterschied nur in der versendeten Mail | KW02 |
| 7 Bestand | `onboardingStart(konto, bestand)` markiert Vorhandenes als erledigt | KW17 |
| 8 Erneut senden | 1 min Abstand, 5 pro Stunde | KW07 |
| 9 Unternehmer | Pflichthaken § 14 BGB, sonst `E_UNTERNEHMER` | – (in UI) |

Kern `lib/kundenwege.js`: **23/23** Prüffälle (Browser). Oberfläche: `Kundenwege.dc.html` mit Szenario-Schaltern für jeden Fehlerfall.

**Vertragsänderungen, die freigegeben werden müssen** (nicht eigenmächtig in `api/openapi.yaml` geändert):
- `/auth/register`: 409 entfernen, immer 202.
- `/offers/{id}/accept`: Pflichtfelder `version`, `unternehmer`, `zeichnungsberechtigt`, `agbFassung`; Fehler `409 VERSION`, `409 SCHON_ANGENOMMEN`, `410 ABGELAUFEN`; Wiederholung mit gleichem Schlüssel → 200 mit gleichem Körper.
- Neu: `GET/PUT /onboarding` (Stand), `POST /onboarding/{schritt}`.

## Urteil nach dem Einbau: ⚠️ Bedingt – 0 Blocker, 1 Major offen
Offen (Major): **Wenn ein Angebot mehrere Positionen mit unterschiedlichen USt-Sätzen hat**, rechnet `summe()` mit einem Satz. Für NeXify-Leistungen heute zutreffend (alles 19 %), aber nicht für Mischangebote. Vorschlag für die Spezifikation: „USt je Position; Rundung je Satz auf ganze Cent (§ 14 Abs. 4 Nr. 8 UStG).“

---

## Go-Live-Abschlusstest (Stand heute)

Legende: ✅ belegt · ⚠️ teilweise · ❌ offen · — nicht anwendbar

| # | Bereich | Punkt | Stand | Beleg / was fehlt |
|---|---|---|---|---|
| 1 | Fachliche Abnahme | Anforderung ↔ Testfall 1:1 | ✅ | Tabelle oben, KW01–KW23 |
| 1 | | Negativ-/Randfälle | ✅ | 14 Negativ, 4 Grenzwert, 1 Rollback |
| 1 | | Stakeholder-Sign-off | ❌ | Freigabe Pascal fehlt |
| 2 | Technik | Getrennte Produktivumgebung | ❌ | Gateway nicht gebaut (B6) |
| 2 | | Mails mit echten Zugangsdaten | ❌ | Resend-DNS offen (Hartsperre) |
| 2 | | Backup + Restore geübt | ❌ | Band 05, noch nicht auf Server |
| 2 | | Monitoring | ⚠️ | Langfuse geplant, nicht installiert |
| 3 | Nicht-funktional | Lasttest | ❌ | – |
| 3 | | Sicherheit: Autorisierung, Aufzählungsschutz | ⚠️ | im Kern geprüft (KW02, KW14), nicht gegen echte API |
| 3 | | Barrierefreiheit | ⚠️ | Rollen, `aria-current`, Fokusringe, 44 px; Normprüfung noch nicht gelaufen |
| 4 | Content | Musterdaten entfernt | ❌ | Prototyp nutzt Musterfirma, gekennzeichnet |
| 5 | Recht | AGB, Datenschutz, Widerruf | ❌ | Rechtstexte bei Pascal (`docs/06-auftraege/rechtstexte.md`) |
| 5 | | Einwilligung protokolliert | ✅ | Zeit, Fassung (KW01) |
| 5 | | B2B-Ausschluss Verbraucher | ✅ | Pflichthaken § 14 BGB |
| 6 | Rollback | Plan mit Auslöser | ❌ | nach Gateway |
| 7 | Hypercare | Eskalation | ⚠️ | Runbooks vorhanden, keines für Kundenwege |
| 9 | Doku | Testprotokoll archiviert | ⚠️ | diese Datei; QA-Nummer fehlt |

**Ergebnis: nicht Go-Live-fähig.** Fachlogik und Oberfläche sind abnahmereif zur Prüfung; alles unter 2, 3, 5 und 6 hängt am Gateway, an den Rechtstexten und an deiner Freigabe.
