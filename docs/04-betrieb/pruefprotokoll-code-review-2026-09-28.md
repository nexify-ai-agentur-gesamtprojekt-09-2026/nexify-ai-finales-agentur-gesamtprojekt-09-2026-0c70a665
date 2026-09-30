# Prüfungsprotokoll – systemweites Code-Review

**Dokument:** QA-2026-09-28-01 · **Datum:** 28.09.2026 · **Prüfer:** Claude (Orchestrator) · **Freigabe:** Pascal Courbois (offen)
**Methode:** Skill `code-review-anfordern-subagent` mit Prüfkatalog `code-review-pruefkatalog`.

## 0. Einschränkungen der Prüfung (vorab, ehrlich)
| Vorgabe des Skills | Umsetzung hier | Folge |
|---|---|---|
| Dedizierter Reviewer-Subagent mit frischem Kontext | **Nicht verfügbar** in dieser Umgebung. Review im selben Kontext, nach fester Vorlage, gestützt auf maschinelle Prüfungen | Blinde Flecken der eigenen Arbeit möglich – ein zweites Review durch einen echten Subagenten oder Menschen im GitLab-MR bleibt Pflicht |
| `BASE_SHA` / `HEAD_SHA` | **Kein Git** im Projekt. Prüfumfang = Gesamtbestand, Stand 28.09.2026 | Erst nach Übernahme ins GitLab-Repo per `git diff` nachvollziehbar |
| Tests grün | Alle Kerne **im Browser** ausgeführt, echte Module, Abhängigkeiten aufgelöst | Nicht unter Node/Vitest, nicht gegen echte Dienste |

## 1. Kontext
- **{WHAT_WAS_IMPLEMENTED}:** 23 Fachkerne (`lib/`), 44 Oberflächen, API-Vertrag 1.2.0, Migrationen 001–008, CI-Werkzeuge, Installationsskript.
- **{PLAN_OR_REQUIREMENTS}:** `AGENT.md`, Regelwerk R-01…R-21, `docs/08-gesamtloesung/`, ADR 0001–0008, Spezifikationsprüfung Kundenwege, Prepaid-Umsetzung.
- **{DESCRIPTION}:** Gesamtlösung NeXify AI inkl. Kundenwege und API Prepaid mit Revolut.

## 2. Maschinelle Prüfungen

| # | Prüfung | Ergebnis |
|---|---|---|
| M1 | Alle Prüffälle aller Kerne (inkl. `tests/posteingang.test.js`) | **380/380 grün** (vor Fix 378/378; +2 neue Gegentests) |
| M2 | Importauflösung aller Kerne | 0 Zyklen, 0 fehlende Importe |
| M3 | Ein-/Ausgabe in Kernen (fetch, Storage, env, DOM) | 0 im Code (1 Treffer war Kommentar in `einstellungen.js`) |
| M4 | Geheimnisse im Code | 0 |
| M5 | `eval`, `innerHTML` | 0 |
| M6 | Uhrzeit/Zufall im Kern statt Parameter | 4 Fallbacks `?? Date.now()` (siehe Minor N2) |
| M7 | API-Vertrag: doppelte Pfade | 0 von 44 Pfaden / 47 Operationen |
| M8 | Schreibende Operationen ohne `Idempotency-Key` | 0 (Ausnahmen begründet: login, verify, webhook, events, rules/check, estimate) |
| M9 | Schreibende Operationen ohne Fehlerantwort | 4 → **behoben** |
| M10 | Listen ohne Pagination | 3 → **behoben** (`/keys`, `/cost-centers`, `/inbox` mit `cursor`) |
| M11 | Oberflächen-Aufrufe ohne Vertragspfad | 0 |
| M12 | Mandantentabellen: Registrierung, RLS erzwungen, USING + WITH CHECK, GRANT an `nx_app` | 0 Befunde (`tools/mandanten-pruefung.js`-Logik) |

## 3. Befunde

### Stärken
- Kerne ohne Ein-/Ausgabe, alle deterministisch prüfbar; Fehler als Codes (`E_…`), Beträge in Cent bzw. Mikrocent.
- Jede Geldbewegung idempotent (Journal-ID je Anfrage/Order), Gutschrift erst nach Order-Abruf mit Betragsabgleich.
- Mandantentrennung doppelt: RLS in der Datenbank und Besitzprüfung im Kern.
- Negativ-, Grenzwert- und Rollbackfälle in jedem Kern; Aufzählungsschutz bei Registrierung.

### Critical
**C1 · `lib/kundenwege.js` `angebotAnnehmen` – Idempotenz-Schlüssel nicht an Angebot gebunden.**
Was: `frueher[antrag.schluessel]` lieferte das gespeicherte Ergebnis für jeden Aufruf mit demselben Schlüssel – auch für ein **anderes Angebot oder eine andere Firma**. Warum: Ein wiederverwendeter Schlüssel (Client-Fehler, Proxy-Retry) hätte ein fremdes Annahmeergebnis zurückgegeben und das eigentliche Angebot nicht angenommen. Behebung: Schlüssel `firma:angebot:person:schlüssel` (`idemSchluessel`), Oberfläche angepasst, Gegentest **KW24**. ✅ behoben.

### Important
**I1 · `lib/prepaid.js` `preis` – fehlender Einkaufspreis ergibt `NaN`.** `config/api-prepaid.json` führt EK-Werte bewusst als `null` bis zur Freigabe; `null × Token` = 0 bzw. NaN → kostenlose oder fehlerhafte Buchung. Behebung: Prüfung auf ganze Zahl ≥ 0, sonst `E_PREIS_FEHLT`; Gegentest **PP19**. ✅
**I2 · `lib/prepaid.js` `webhookEcht` – Signaturvergleich mit `===`.** Zeitmessungsangriff theoretisch möglich. Behebung: Vergleich in konstanter Zeit; Gateway muss zusätzlich `crypto.timingSafeEqual` nutzen. ✅
**I3 · `api/openapi.yaml` – 4 schreibende Operationen ohne Fehlerantwort** (`/account/data-rights`, `/estimate`, `/runs`, `/rules/check`). Behebung: `422` mit einheitlichem Fehlerformat. ✅
**I4 · `api/openapi.yaml` – Listen ohne Pagination.** Behebung: `cursor` (+ `limit` ≤ 100). ✅
**I5 · Zählstand in `MANIFEST.md`/`UEBERGABE.md` falsch** (389 statt tatsächlich 378). Ursache: Summe aus Einzelmeldungen fortgeschrieben statt neu gezählt. Behebung: neu gezählt, jetzt 380. ✅

### Minor (notiert, nicht behoben)
**N1 · ✅ geschlossen 28.09. (`schaetzung`, PP20/PP21)** · `lib/prepaid.js` `abrechnen`: Ist-Kosten über der Reservierung trägt NeXify. Gateway muss `max_tokens` so setzen, dass die Reservierung die Obergrenze ist.
**N2 · Uhrzeit-Fallbacks** in `regelwerk.js:103`, `betriebskennzahlen.js:48`, `posteingang.js:117/119`: nicht deterministisch, wenn `jetzt` fehlt. Gateway übergibt `jetzt` immer.
**N3 · `NeXify API.dc.html`:** Checkout und Webhook sind simuliert (klar gekennzeichnet); keine Signaturprüfung im Prototyp.
**N4 · 81 überlange Zeilen** laut Grundlinie `tools/code-regeln.grundlinie.json`; Abbau schrittweise.
**N5 · `lib/normpruefung.js` `pruefeLayout`** 51 Zeilen (Grenze 50).

## 4. Anforderungen
| Anforderung | Stand |
|---|---|
| Kundenwege: 9 Befunde der Spezifikationsprüfung | umgesetzt, KW01–KW24 |
| API Prepaid: Preis, Reservierung, Revolut, Nachweis, Rückzahlung, Trennung | umgesetzt, PP01–PP19 |
| Rechtsseiten | Entwurf, anwaltliche Prüfung offen |
| Breaking Changes im Vertrag | 1.1.0 → 1.2.0 dokumentiert; `/auth/register` 409 → 202 und neue Pflichtfelder bei `/offers/{id}/accept` sind **Breaking** – vor Livegang ohnehin kein Client |

## 5. Produktionsreife
| Punkt | Stand |
|---|---|
| Migrationsstrategie | 001–008 wiederholbar (`if not exists`, `drop … if exists`) – nicht gegen echte DB gelaufen |
| Rückwärtskompatibilität | kein Bestand-Client |
| Dokumentation | Übergaben, ADR, Bände 00/01/04/05 |
| Offensichtliche Bugs | keine bekannt nach Behebung C1, I1–I5 |

## 6. Urteil
**Ready to merge: Mit Fixes – erfüllt.** Alle Critical- und Important-Befunde sind behoben und durch Gegentests abgesichert.
**Ready for production: Nein.** Gateway/Worker fehlen, kein Lauf unter Node, gegen Postgres, Revolut-Sandbox oder Server; Rechtstexte und Preise ohne Freigabe.

## 7. Nächste Prüfschritte
1. Übernahme ins GitLab-Repo, dann Review durch echten Subagenten mit `BASE_SHA`/`HEAD_SHA` (`glab mr diff`), Ergebnis als MR-Kommentar.
2. `npx vitest run`, `node tools/*.js`, `npx @stoplight/spectral-cli lint api/openapi.yaml`.
3. Migrationen 001–008 gegen leere Postgres 16, Prüffall Mandant A ↛ B.
4. Revolut-Sandbox: Order anlegen, Webhook mit echter Signatur, doppeltes und ungeordnetes Ereignis.

## Anhang A · Grundursachenanalyse: Zeitüberschreitung der Link- und Vertragsprüfung

**Symptom:** Die Prüfung aller 44 Seiten brach zweimal nach 30 s ab (vorher gelaufen).
**Phase 1 – Messen statt raten:** Lesezeit je Datei gemessen: 200–870 ms bei kleinen Seiten, 1,4–1,7 s bei den Cloud-Fassungen v3–v10, **5,2 s bei `TEILEKLAR Shop.dc.html`**. Die Regex-Auswertung braucht je Datei < 1 ms.
**Phase 2 – Vergleich:** Früher lief der Scan mit weniger bzw. kleineren Dateien durch; hinzugekommen sind zwei neue Seiten, dazu kommen acht ersetzte Cloud-Fassungen mit je ~150 KB.
**Phase 3 – Hypothesen:** H1 „Regex läuft aus dem Ruder“ – **widerlegt** (0 ms). H2 „paralleles Lesen löst es“ – **widerlegt** (Lesen wird serialisiert, ebenfalls > 30 s). H3 „Lesezeit wächst mit Dateigröße, ersetzte Fassungen sprengen das Zeitbudget“ – **bestätigt**: nur die 35 aktuellen Seiten in zwei Läufen = 5,7 s + 13,1 s.
**Phase 4 – Behebung an der Ursache:** Prüfumfang = nur Dateien, die laut `MANIFEST.md` aktuell sind; im Browser in Teilläufen. Maßgeblich bleibt die CI unter Node (ohne dieses Zeitlimit).
**Ergebnis:** 35 aktuelle Seiten · 68 interne Links, 0 tot · 28 API-Aufrufe, 0 ohne Vertrag.
**Vorbeugung:** Ersetzte Fassungen gehören nicht in den Prüfumfang; sie werden bei Übernahme ins Repository nach `versions/` verschoben (R-13: erst nach deiner Bestätigung).

## Anhang B · Finaler Fehlererkennungslauf 28.09.2026

| # | Prüfung | Ergebnis |
|---|---|---|
| F1 | Alle Kerne mit aufgelösten Abhängigkeiten | **360/360** (+ 20 in `tests/posteingang.test.js` = 380) |
| F2 | 22 JSON-Dateien (config, Laufakte, Manifest) | alle gültig |
| F3 | 10 Kernseiten: Löcher mit Ausdrücken, unausgeglichene Tags, Löcher ohne Wert, Buttons ohne `type` im Formular | 0 |
| F4 | Kundenportal → „Prüfen und annehmen“ → Kundenwege | Link `?weg=ang` greift, 44 px |
| F5 | Kundenwege: Haken setzen, **Doppelklick** auf „Kostenpflichtig beauftragen“ | ein Auftrag, ein Ereignis ✔ |
| F6 | API-Konsole: Aufladen 100 € → Revolut-Dialog → Bezahlen → Testanfrage | Gutschrift und Abbuchung korrekt |

**Gefundene Fehler (behoben):**
- **B1 · `NeXify API.dc.html`:** Die erste Anzahlungsrechnung hieß `…-00002`. Ursache: Nummer wurde nach dem Hochzählen gelesen (Zustand im Rückruf). Fix: Nummer vor dem Hochzählen festhalten.
- **B2 · Datenwiderspruch:** Angebot A-2026-00302 zeigte im Kundenportal 1.347,00 €/Monat, in den Kundenwegen zusätzlich 490 € Einrichtung (2.186,03 € brutto). Fix: gleiche Positionen auf beiden Seiten.

**Keine weiteren Befunde.** Grenzen dieses Laufs wie in § 0 (Browser, kein Node, keine echten Dienste).

## Anhang C · Abweichungs- und Vollständigkeitslauf 28.09.2026

Umfang: 35 aktuelle Seiten (Vorlagen, Links, Anker, Kontaktdaten, Titel, Übersicht, Rechtslinks); Einsprünge im Browser nachgeprüft.

| # | Befund | Schwere | Behebung |
|---|---|---|---|
| A1 | **Anker wirkungslos:** Website und Shop werteten `#…` nicht aus. Alle Fußzeilen- und Kopfzeilen-Sprünge (Rechtstexte Shop, Bereiche Website) landeten auf der Startansicht | Critical | Einsprung per `hashchange` in beiden Seiten (`const ANSICHT`, `const RECHT`); geprüft `#impressum`, `#faq`, `#batterie`, `#garage` |
| A2 | **Fehlende Rechtsseite:** „Altteile & Batterien“ → `#altteile` existiert nicht; Inhalt liegt unter `batterie` | Important | Ziel `#batterie` |
| A3 | **Rechtstexte NeXify AI nicht erreichbar:** Fußzeile führte nur Shop-Rechtstexte | Important | Impressum, Datenschutz, AGB NeXify AI und API-Bedingungen ergänzt (DE/NL/FR) |
| A4 | **Übersicht unvollständig:** `Start.dc.html` zeigte 12 aktuelle Seiten nicht | Important | ergänzt |
| A5 | **Link auf ersetzte Fassung:** Workspace → `myADMIN.dc.html`; Leitstand prüfte die alte Fassung | Important | auf `myADMIN v2` umgestellt; Normprüfung um 3 neue Seiten erweitert |
| A6 | **API-Einstieg unlogisch:** „Konto anlegen und aufladen“ sprang ohne Registrierung in die Konsole | Important | „Konto anlegen“ → Kundenwege `?weg=reg`, „Zur Konsole“ getrennt, Logo → Website |
| A7 | 13 Seiten ohne `<title>` | Minor | ergänzt |

**Technische Lösung:** `tools/verweise.js` (CI-Schritt `verweise`) prüft jede Seite, jeden Link, jeden Anker gegen vorhandene Dateien und die Einsprunglisten der Zielseite; Links auf ersetzte Fassungen sind Befunde. Browserlauf nach Behebung: 0 Befunde.

**Zur Entscheidung, nicht geändert:**
- **Zwei NL-Rufnummern:** +31 6 133 188 56 steht als Telefon im Shop-Impressum und auf der Website, in der Fußzeile nur als WhatsApp; +31 6 38 12 71 86 steht in Fußzeile und Visitenkarte als Telefon.
- `TODO(BACKEND)` in drei Portalen sind gewollte Übergabemarken.
