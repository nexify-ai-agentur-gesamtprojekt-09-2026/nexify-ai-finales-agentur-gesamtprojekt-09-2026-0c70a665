# Technisches Gutachten – NeXify-Gesamtlösung, Stand 28.09.2026

**Lauf:** a9666976-c613-40a3-92aa-f1d182032925 · **Fall:** NXAI-GESAMT-2026-09-28 · **Stichtag:** 2026-09-28T19:59:35.873Z · **Scope-Hash:** sha256:766db4a17574eab5da73c50f526f4e37acb10808e8dcff20af0ef01af91f6b16 (70 Dateien) · **Rolle:** Agent 1 (technisches-gutachten-de) · **Modus:** PHASENEMULATION · **Auftragsnummer:** UNVERIFIED (keine Registry bestätigt)
**Erstellt:** 2026-09-28T20:05:17.394Z · Dokumentnummer nach NEXIFYAI-CD-2026 (Typcode ZG) nicht vergeben – Registry nicht erreichbar.

## 1. Auftrag, Zweck, Grenzen
Prüfgegenstand ist der Projektstand im Arbeitsbereich (Prototyp-Oberflächen, Fachkerne, Datenbankmigrationen, API-Vertrag, Installationsskript, CI-Definitionen, Dokumentation). Zweck: belastbare Aussage, was nachweislich funktioniert, was nur behauptet ist und was fehlt – als Grundlage für Umsetzungsplan (Agent 2) und Zertifizierungsreife (Agent 3). Adressat: Pascal Courbois (Inhaber) und das umsetzende Backend-Team.
**Nicht Gegenstand:** Produktivsysteme (kein Zugriff), Rechtsbewertung (nur Hinweise auf Prüfbedarf), Normvolltexte (nicht lizenziert eingesehen – Normbezüge sind Bezeichnungen, keine Abschnittszitate).

## 2. Quellenlage
| Quelle | Status | Erhebung |
|---|---|---|
| 33 `*.dc.html`, 24 `lib/*.js`, 9 `db/migrations/*.sql`, `api/openapi.yaml`, `install.sh`, `deploy/compose.yml`, `.gitlab-ci.yml` | CURRENT_VERIFIED (Hash oben) | 28.09.2026 19:59 UTC, lesend |
| `MANIFEST.md`, `docs/SOLL-Beschreibung.md` § 1–14, `UEBERGABE.md` | CURRENT_VERIFIED | dito |
| Prüfläufe der 21 Testdateien | CURRENT_VERIFIED, Umgebung eingeschränkt (Browser, vitest-Ersatz) | `pruefflauf-2026-09-28.json` |
| Laufakte Vorlauf 26./27.09. (`laufakte.json`, `zertifizierungsreife-2026-09-27.md`) | HISTORICAL, nur Widerspruchserkennung | – |
| Produktivserver, DNS, Supabase, Revolut, Resend, Langfuse | BLOCKED (kein Zugriff) | – |
| DIN 5008, DIN EN ISO 9241-410, WCAG 2.2, UWG, Omnibus-RL | UNVERIFIED (Volltext nicht vorliegend; WCAG 2.2 öffentlich, aber nicht abschnittsweise geprüft) | – |

## 3. Befunde (Beobachtung → Schluss → Risiko)
| ID | Beobachtung (belegt) | Schlussfolgerung | Risiko | Evidenz |
|---|---|---|---|---|
| B-01 | 21 Testdateien, **349/349** Fälle bestanden – aber nur im Browser mit einem minimalen vitest-Ersatz (describe/it/expect), nicht unter Node/vitest | Fachlogik der Kerne ist konsistent; die CI-Behauptung „grün“ ist **nicht** belegt, weil kein Node-Lauf existiert | mittel: CI könnte an Import-/Umgebungsdetails scheitern | pruefflauf-2026-09-28.json |
| B-02 | `MANIFEST.md` nennt „398/398“, Lauf ergibt 349 | Zahl im Manifest veraltet oder zählt anders | niedrig, aber Glaubwürdigkeit der Doku | MANIFEST.md Z. 45 |
| B-03 | Beim ersten Render stürzten **Shop** (leere Stadtliste vor Datenladen) und **Konto** (`$1`-Rest einer Ersetzung, Syntaxfehler) ab; am 28.09. behoben, Schranke `tools/render-smoke.js` angelegt, **nicht unter Node gelaufen** | Textersetzungen über viele Dateien erzeugen stille Regressionen; Schranke existiert nur als Datei | hoch bis zum ersten CI-Lauf | SOLL § 14, tools/render-smoke.js |
| B-04 | 9 Migrationen (001–008, 004b), Mandanten-Prüfung meldet 0 Befunde – **nie gegen eine Datenbank ausgeführt** | Schema-Konsistenz plausibel, Ausführbarkeit unbelegt (Reihenfolge 004b, RLS-Policies) | hoch | MANIFEST.md, tools/mandanten-pruefung.js |
| B-05 | OpenAPI 1.1.0, 44 Pfade; schreibende Auth-Endpunkte ohne Idempotency-Key; Spectral-Lauf offen | Vertrag vollständig beschrieben, aber ungeprüft | mittel | api/openapi.yaml |
| B-06 | `install.sh`, Playbook, Compose: nie auf einem Server gelaufen; OpenBao-Einrichtung nur Skripttext | Installationsversprechen „ein Befehl“ ist unbelegt | hoch | install.sh, deploy/ |
| B-07 | Rechtstexte (Impressum, Datenschutz, AGB, Widerruf, API-Recht) sind gesperrte Abschnitte bzw. Entwurf | Veröffentlichung wäre rechtswidrig (§ 5 DDG, Art. 13 DSGVO – **juristische Prüfung erforderlich**) | kritisch für Go-Live, unkritisch für Prototyp | Rechtliches.dc.html, API-Rechtliches.dc.html |
| B-08 | Preise API und Website: durchgängig als „Beispielwerte“ gekennzeichnet | Kennzeichnung schützt vor Irreführung; ohne echte Preise kein Vertragsschluss möglich | mittel | NeXify API.dc.html, config/fakten.json |
| B-09 | Marketingflächen: **keine** Knappheits-, Countdown-, Druck- oder erfundenen Social-Proof-Muster gefunden; Shop kündigt „Sterne erst mit Kaufnachweis“ an; Affiliate-Portal verweist auf UWG § 5a Abs. 4 | Gestaltung ist mit UWG §§ 4a, 5 und Omnibus-RL vereinbar, soweit statisch prüfbar | niedrig | Muster-Scan 28.09. (8 Flächen) |
| B-10 | Barrierefreiheit: Sprache, Sprunglinks, Fokusstil, Kontrast, Zielgrößen 44 px systemweit nachgezogen (statisch), Shop im Live-DOM 0 Elemente < 44 px; **keine Prüfung mit Screenreader, keine Tastatur-Durchgänge** | Formale Kriterien erfüllt, Nutzbarkeit mit assistiver Technik unbelegt | mittel | SOLL § 14 |
| B-11 | Lizenzen der Kernbibliotheken dokumentiert, SBOM fehlt; keine Schwachstellenprüfung | Lieferkette unbewertet | mittel | – |
| B-12 | Sicherung/Wiederherstellung, RTO/RPO: nur als Runbook-Text (`config/runbooks.json`), nie geübt | BCP unbelegt | hoch für Betrieb | docs/paket/05-betrieb.md |
| B-13 | KI-Betrieb: Regelwerk (38 Fälle), Prompt-Versionierung, Qualitätsdrift-Nachtlauf definiert; **kein Lauf gegen ein echtes Modell** | Human Oversight ist konzipiert, Wirksamkeit unbelegt | mittel | lib/regelwerk.js, config/prompts.json |
| B-14 | Laufakte 26.09. endete PARTIAL_BLOCKED mit „Agent 1 und 2 teilen ein Artefakt“ | Vorlauf war methodisch unsauber; dieser Lauf trennt die Artefakte | – | laufakte.json |

## 4. Widersprüche
| ID | Widerspruch | Auflösung |
|---|---|---|
| W-04 | MANIFEST „398/398“ vs. Lauf 349/349 | Manifest korrigieren, Zählweise dokumentieren (Agent 2: M-02) |
| W-05 | UEBERGABE nennt CI-Schranken als „vorhanden“, Doku liest sich als „grün“ | Sprachregelung: „definiert, nicht gelaufen“ bis erster Pipeline-Lauf |
| W-01/W-03 (Vorlauf) | Margenformel, KI-Kennzeichnung | W-01 offen (E5), W-03 gelöst durch Kennzeichnung „KI-erzeugt“ im Workspace – im Companion nicht gegengeprüft |

## 5. Bewusst nicht geprüft (mit Begründung)
- Lasttest, Leistungskennzahlen: kein lauffähiges Backend.
- Penetrationstest: kein System.
- Normabschnitte: keine lizenzierten Volltexte; keine Abschnittsinhalte erfunden.
- Rechtswirksamkeit der Texte: keine Rechtsberatung, nur Prüfbedarf gekennzeichnet.
- Design-System-Kompilat (`_ds_bundle.js`): wird vom Werkzeug erzeugt, nicht Prüfgegenstand.

## 6. Ergebnis
Status **PARTIAL**: Die Lösung ist als Spezifikations- und Prototyp-Stand konsistent und intern widerspruchsarm; **jede Aussage über Betrieb, Installation, Datenbank und CI ist unbelegt**, weil nichts außerhalb des Browsers gelaufen ist. Auswirkung auf Plan: Maßnahmen müssen zuerst Nachweise erzeugen (Node-Lauf, DB-Lauf, Serverlauf), bevor fachliche Erweiterungen sinnvoll sind. Auswirkung auf Zertifizierung: kein Schema kann vor B-03/B-04/B-06/B-07/B-12 ein Urteil über NOT_READY hinaus erhalten.
