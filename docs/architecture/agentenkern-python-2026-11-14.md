# Architektur-Notiz · Python-Agentenkern und Wissensport · 14.11.2026

**Status:** Entwurf zur Prüfung, umkehrbar (zwei neue Pakete, nichts hängt daran).
**Was es ist:** zwei Python-Bausteine mit Tests. **Was es nicht ist:** ein laufender Agent, ein Dienst,
eine Modell- oder Cognee-Anbindung. Nichts wurde ausgeliefert, gestartet oder mit einem Dienst verbunden.

Quellen: Auftrag des Inhabers vom 14.11.2026 (Konzeptpakete W1-16 bis W1-18, W1-20), `AGENTS.md`,
`config/llm-policy.json`, `config/brain/*.json`, `config/project-skills.json`, `docs/adr/0004`, `0006`,
`docs/architecture/0019-staged-ai-migration.md`. Die ADRs 0004 und 0006 haben den Status „vorgeschlagen";
diese Notiz ersetzt sie nicht (siehe Entscheidung E-8).

## 1 · Überblick

```
 Web-App / Suite / Chat (TypeScript, bleibt)          Mensch mit Freigaberolle
        │  serverseitig, Mandant aus Sitzung                    │
        ▼                                                       ▼
 ┌──────────────────── HTTP-Fassade (FEHLT – nur Vertrag) ─────────────────────┐
 │  docs/contracts/agent-runs.openapi.json: anlegen · Status · Freigabe · Abbruch │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                 ▼
 ┌──────────────── packages/agent_core (vorhanden, getestet) ───────────────────┐
 │ Laufzeit: Lauf(Mandant, Auftrag, Grenzen, Rechte) · Journal · Idempotenz ·    │
 │ Wiederholung · Fehlerablage · FREIGABEPUNKTE · Unterläufe · Aufgabenentwürfe  │
 │ Skill-Register (Hash-Bindung) · Policy-Prüfer                                │
 └──────┬───────────────────────┬──────────────────────────┬────────────────────┘
        │ ModellPort            │ WerkzeugPort             │ Mandant-Typ
        ▼ (FEHLT: Router-Port)  ▼ (FEHLT: jedes Werkzeug)  ▼
   eigener Router          z. B. „wissen.lesen"     packages/knowledge (vorhanden, getestet)
   → Policy-Modell              │                   WissensPort: speichern · abrufen ·
                                └──────────────────▶ loeschen · exportieren · zustand
                                                     ├ ArbeitsspeicherWissen (Tests)
                                                     └ CogneeAdapter (GERÜST, Transport FEHLT)
```

Abhängigkeitsrichtung: `config/` → `packages/knowledge` → `packages/agent_core` → (später) Fassade/Apps.
`agent_core` nutzt aus `knowledge` nur den Typ `Mandant`; `knowledge` kennt den Kern nicht.
Beide Pakete: nur Standardbibliothek, lauffähig ab Python 3.12 (`.python-version`), Tests mit `unittest`
wie im Repo üblich (`make test` findet sie unter `tests/`).

## 2 · Schnittstellen

### 2.1 Wissensport (`packages/knowledge/nexify_knowledge`)

| Operation | Zweck | Garantie |
|---|---|---|
| `speichern(mandant, eintrag)` | Inhalt mit Pflicht-Metadaten ablegen | Schreiben → Rücklesen → Inhaltsvergleich; gleicher Eintrag zweimal = ein Eintrag |
| `abrufen(mandant, frage, limit=, art=)` | Suche | nur im Bestand dieses Mandanten; abgelaufene Inhalte nie; Treffer = `Dateninhalt` + Herkunft |
| `loeschen(mandant, auswahl)` | Lösch- und Widerrufsansprüche | Auswahl Eintrag, Gespräch, Person, abgelaufen, Mandant; Gegenprobe im Beleg |
| `exportieren(mandant, betroffene_person=)` | Auskunft, Übertragbarkeit | nur dieser Mandant; serialisierbar |
| `zustand()` | Betriebszustand | ohne Inhalte, ohne Geheimnisse |

Pflicht-Metadaten: Herkunft (Quelle, Zeitpunkt mit Zeitzone, Art Dokument/Chat/Notiz). Für **Chat**:
Rechtsgrundlagen-Kennzeichen und Löschfrist, bei Einwilligung zusätzlich der Verweis darauf.
Die Kennzeichen sind Metadaten, keine Rechtsprüfung.

### 2.2 Laufzeitkern (`packages/agent_core/nexify_agent_core`)

| Operation der `Laufzeit` | Zweck |
|---|---|
| `anlegen(mandant, auftrag, grenzen=, rechte=, idempotenzschluessel=)` | Lauf anlegen, nicht ausführen; gleicher Schlüssel = derselbe Lauf |
| `fortsetzen(mandant, lauf)` | bis Ende, Freigabepunkt oder Grenze treiben |
| `status(mandant, lauf)` | unveränderliche Momentaufnahme |
| `freigabe_erteilen(mandant, lauf, anfrage, freigeber=, bestaetigter_hash=)` / `freigabe_ablehnen(…, grund=)` | menschliche Entscheidung über genau eine Aktion |
| `abbrechen(mandant, lauf, akteur=)` | Lauf samt Unterläufen beenden |
| `journal(mandant, lauf=)`, `fehlerablage(mandant)` | Nachweise je Mandant |

Ports, die injiziert werden: `ModellPort` (nur nach `ModellPolicy.zulassen`), `WerkzeugPort` (Name,
Aktionsklasse, wiederholbar), `Ergebnisspeicher` (Idempotenz), `SkillRegister`. Mitgeliefert sind nur
`SkriptModell` und `StellvertreterWerkzeug` für Tests.

### 2.3 HTTP-Vertrag (`docs/contracts/agent-runs.openapi.json`)

`POST /agent/runs` · `GET /agent/runs/{lauf}` · `POST /agent/runs/{lauf}/freigabe` ·
`POST /agent/runs/{lauf}/abbruch`. Nur Vertrag; ein Test hält Aufzählungen und Muster mit dem Kern
synchron. `GET /agent/skills` und ein Ereignisstrom aus dem Konzept sind bewusst noch nicht enthalten.

## 3 · Grenzen, die im Code fest sind

| Grenze | Umsetzung | Nachweis (Test) |
|---|---|---|
| Kein Netz, kein Modellaufruf, keine Prozess- oder Skriptausführung in beiden Paketen | keine entsprechenden Importe; Quelltextprüfung | `test_paket_hat_keine_netz_…`, `test_paket_kennt_keinen_weg_code_zu_starten_…` |
| Skills nur aus einer erlaubten Wurzel, nur mit passendem SHA-256, Prüfung bei jedem Laden | `skills.SkillRegister` | `test_hash_abweichung_sperrt_…`, `test_nur_aus_der_erlaubten_wurzel` |
| Schritt-, Kosten-, Tiefen- und Wiederholungsgrenze sind Pflicht, ohne Standardwerte | `lauf.Grenzen` | `test_grenzen_sind_pflicht_ohne_standardwerte`, `test_schrittgrenze_…`, `test_kostengrenze_…` |
| Unbekannte Kosten gelten nie als null | Lauf endet geschlossen | `test_unbekannte_kosten_beenden_den_lauf_geschlossen` |
| Journal ohne Geheimnisse und ohne personenbezogene Rohdaten | nur Kennungen, feste Codes, Zahlen, gesalzene Hashes; Freitext wird technisch abgelehnt | `test_jeder_schritt_hat_zeit_und_hashes_aber_keine_inhalte`, `test_journal_nimmt_technisch_keinen_freitext_an` |
| Modell nur laut Policy, kein stiller Ersatz | `policy.ModellPolicy`, versiegelter Port | `tests/test_agent_core_policy.py` |
| Wiederholung nur ohne Außenwirkung; unbekannter Ausgang nie blind | `laufzeit.__werkzeug` | `test_ohne_ausweis_als_wiederholbar_…`, `test_modellaufrufe_werden_nie_wiederholt` |
| Keine Schreibwirkung in fremde Systeme durch den Kern selbst | Aufgaben nur als Ergebnisobjekt | `test_aufgaben_sind_entwuerfe_im_ergebnis_…` |

## 4 · Freigabepunkte

- Aktionsklassen: `lesen`, `schreiben_intern` (ohne Halt) · `zahlung`, `vertrag`, `loeschung`,
  `rechteaenderung`, `versand_nach_aussen` (**Halt**). Die Pflicht ist eine Eigenschaft der Klasse im
  Code. Es gibt keinen Parameter, keine Konfigurationsdatei und kein Feld im HTTP-Vertrag, das sie
  abschaltet; eine künftig ergänzte Klasse ist von selbst freigabepflichtig.
- Die Klasse legt das **Werkzeug** bei der Anmeldung fest, nicht das Modell; eine spätere
  Selbst-Herabstufung des Werkzeugs wirkt nicht.
- Ablauf: Lauf hält an → `Freigabeanfrage` mit Werkzeug, Klasse, Argumenten und deren SHA-256 →
  ein `Mensch` bestätigt genau diesen Hash → genau dieser eine Aufruf wird ausgeführt. Eine zweite
  gleiche Aktion braucht eine neue Freigabe. Ablehnung übergibt dem Lauf nur einen festen Grundcode.
- In Unterläufen hält die ganze Kette an; freigegeben wird über den Hauptlauf.
- Verhältnis zu `config/brain/tools.json` (Entwurf, Risikoklassen A/B/C): A ≙ `lesen`,
  C ≙ die fünf freigabepflichtigen Klassen. Für B („schreibend intern: 1 Mensch") verlangt der Kern
  **keinen** Halt – das ist eine bewusste Abweichung vom Entwurf und steht als Entscheidung E-5 an.
  Der „zweite Faktor" aus Klasse C ist Sache der Sitzungsschicht und hier nicht umgesetzt.

**Was der Kern nicht leisten kann:** beweisen, dass hinter `Mensch` ein Mensch steht (das muss die
Sitzungsschicht tun), und erkennen, dass ein Werkzeug seine Klasse falsch angibt (das gehört in die
Abnahme jedes Werkzeugs).

## 5 · Mandantenregel

1. Der Mandant ist ein eigener Typ (`nexify_knowledge.Mandant`), kein Text. Er entsteht serverseitig
   aus Sitzung und Mitgliedschaft und ist erstes Pflichtargument jeder Operation beider Pakete.
2. Es gibt keine Operation über Mandanten hinweg – keinen Platzhalter, keine Liste, kein „alle".
3. Verteidigung in der Tiefe: Liefert eine Speicher-Implementierung fremde Sätze, bricht die
   Basisklasse des Ports ab (`Mandantenverletzung`); die öffentlichen Methoden sind nicht überschreibbar.
4. Im Kern: Ein Lauf gehört genau einem Mandanten; Werkzeuge erhalten ihn vom Lauf (ein Feld
   „mandant" in Modellargumenten ändert nichts); Unterläufe erben ihn ohne Wahlmöglichkeit; Läufe,
   Journal und Fehlerablage eines anderen Mandanten sind „unbekannt".
5. Gespeicherte Inhalte sind Daten: Rückgabe nur als `Dateninhalt` mit Hülle für den Prompt; im Lauf
   tragen Werkzeug- und Unterlauf-Ergebnisse die Rolle `daten`. Rechte entstehen nie aus Inhalten.
6. Nachweis: Vertragstests mit drei Mandanten (Suche, Export, Löschung), je Implementierung.

Nicht enthalten: gemeinsames Agenturwissen über Mandanten hinweg (im Konzept als eigener Datensatz ohne
Personenbezug angedacht). Das wäre eine neue, eigens zu entscheidende Operation.

## 6 · Wie Suite, Chat und NeX später andocken

| Wer | Andockpunkt | Was dafür noch gebaut werden muss |
|---|---|---|
| **Suite (Kunden-Agenten)** | HTTP-Fassade nach `agent-runs.openapi.json`; jeder Suite-Agent = Skill-Satz + Werkzeugsatz + Grenzen des Mandanten | Fassade mit Sitzungsprüfung; Grenzen und Rechte je Mandant aus der Suite-Datenbank; Freigabe-Oberfläche, die Argumente und Hash zeigt |
| **Website-Chat** | bleibt zunächst unverändert (`apps/web/app/api/chat`). Später: Chat-Route ruft serverseitig `POST /agent/runs` und übersetzt das Ergebnis in ihr eigenes SSE-Format | Übersetzung in der Fassade; Gesprächsführung und Ausgabeprüfung der heutigen Route dürfen nicht verloren gehen |
| **Chats ins Wissen** | `WissensPort.speichern` mit Art `chat` | zuerst Mandantenspalte, Einwilligungsstand, Löschlauf in der Chat-Datenbank (Konzeptpaket W1-19), Rechtstext; die Datenbank bleibt Quelle der Wahrheit, der Wissensspeicher ist abgeleitet |
| **NeX Agentic AI / AIFly ORACLE** | Rollen von Läufen: Koordinator = Hauptlauf, Fachagenten = Unterläufe mit engeren Rechten | Modell-Port, Werkzeuge, Skill-Auswahl; Klärung, was ORACLE fachlich ist (E-4) |
| **Wissen im Lauf** | ein lesendes Werkzeug, das `abrufen` mit dem Mandanten des Laufs ruft (Muster im Test `MitWissensport`) | als geprüftes Werkzeug ausformulieren; Schwärzung vor dem Speichern |
| **Bestehendes TypeScript-Gerüst** `packages/agent-runtime` | bleibt unberührt und parallel | Ablösung nur stufenweise nach `0019-staged-ai-migration.md` |

## 7 · Was bewusst fehlt

| Fehlt | Warum | Voraussetzung |
|---|---|---|
| **Host** für eine dauerhafte Python-Laufzeit | Vercel-Funktionen sind kurzlebig; Serverlage ungeklärt | E-1 |
| **HTTP-Server/Fassade** | ohne Host und Sitzungsvertrag nicht sinnvoll | E-1, Suite-Sitzung |
| **Dauerhafte Ablage** für Läufe, Journal, Fehlerablage, Idempotenz | alles liegt im Arbeitsspeicher eines Prozesses und ist nach Neustart weg; nur der `Ergebnisspeicher` ist bereits als Port austauschbar | Datenbank mit Mandantentrennung |
| **Echter Cognee-Betrieb** | Der Adapter ist ein Gerüst; die Naht `CogneeTransport` ist von NeXify definiert und bildet keine belegte Cognee-Schnittstelle ab. Der vorhandene Container ist unvermessen | E-1, E-2, Probebetrieb getrennt vom Altbestand |
| **Modellanbindung** | kein Port zum Router mitgeliefert; kein Aufruf, keine Kosten | E-3, E-6, Routerzugang |
| **Werkzeuge** | der Kern bringt keines mit | je Werkzeug Abnahme und Aktionsklasse |
| **Migration des Altbestands** (AgentMemory, LightRAG, alter Cognee-Container, VPS-Skripte) | kein Zugang, kein Inventar. Der Altbestand wird **gesichert und schreibgeschützt archiviert, nie gelöscht**; Aufgaben und Leases aus AgentMemory wandern nicht in den Wissensspeicher | Lesezugang, Sicherung mit Wiederherstellungsprobe, E-9 |
| Zeitgrenze, parallele Unterläufe, Ereignisstrom, `GET /agent/skills` | nicht beauftragt bzw. erst mit Host sinnvoll | – |
| Schwärzung von Geheimnissen und unnötigen Personenangaben vor dem Speichern | gehört vor den Port; Vorbild `tools/brain_ingestion.py` | eigener Schritt vor `speichern` |
| Eignung der Small-Business-Skills mit dem Policy-Modell | braucht Modellzugang; siehe `docs/automation/small-business-skills-gegen-laufzeitkern-2026-11-14.md` | Budget |

## 8 · Entscheidungen, die der Inhaber treffen muss

| Nr. | Entscheidung | Warum sie nötig ist | Bis dahin gilt |
|---|---|---|---|
| E-1 | **Betriebsort** der Python-Laufzeit und des Wissensspeichers (eigener Server, anderer EU-Host, Mischform) | ohne Host kein Betrieb; neue laufende Kosten nur mit Freigabe | Kern bleibt Bibliothek mit Tests |
| E-2 | **Cognee:** Selbstbetrieb bestätigen; Speicherwahl; lokales Einbettungsmodell bestätigen (Vorschlag ADR-0006); mit oder ohne Sprachmodell beim Einlesen | der Adapter verweigert ohne diese Angaben; Einbettungen brauchen laut Repo einen eigenen bestätigten Vertrag | Arbeitsspeicher-Implementierung nur für Tests |
| E-3 | **Modellname am Router:** Laut Konzept führt der Router das Modell unter einem anderen Namen als die Policy. Soll die Zuordnung an einer Stelle festgeschrieben werden, und wo? Dazu: verbindliche Draht-Form der Anfrage | der Prüfer lässt nur die exakte Policy-Kennung zu und normalisiert nichts; er erfindet keine Zuordnung | jeder abweichende Name wird verweigert |
| E-4 | **„Anthropic-Orchestrierung":** Dieser Kern setzt die Lesart „Skills als Format, Modell laut Policy" um. Bestätigen oder ändern (wäre Policy-Änderung, Vertrag, Datenfluss). Dazu: Was ist ORACLE fachlich, und was ist „Jeff AI"? | Widerspruch im Konzept offen benannt | Format ja, Modellbindung nein |
| E-5 | **Freigabeumfang:** Reichen die fünf Klassen, oder soll auch „schreibend intern" einen Menschen verlangen (Entwurf `config/brain/tools.json`, Klasse B)? Zweiter Faktor für Klasse C? Wer darf freigeben (Rollen)? | der Kern kann nur verschärft, nie gelockert werden | fünf Klassen halten, intern Schreiben läuft durch |
| E-6 | **Geldgrenzen:** Einheit und Beträge je Lauf, je Mandant und Tag; Budget für Eignungstests | `max_kosten` ist Pflicht, aber ohne Betrag des Inhabers nur eine Zahl | keine Beträge im Code |
| E-7 | **Chats im Wissen:** Rechtsgrundlage, Einwilligungstext, Löschfristen je Datenklasse, Anpassung der Datenschutzerklärung | Pflichtfelder sind da, ihre Werte sind eine Rechts- und Inhaberentscheidung | keine Chat-Aufnahme |
| E-8 | **Architekturentscheidung festhalten:** „Cognee als zentraler Speicher hinter dem Wissensport" als neue ADR, die ADR-0004/0006 ablöst oder ergänzt | beide alten ADRs sind nur „vorgeschlagen" und sehen Cognee anders vor | diese Notiz ist kein ADR |
| E-9 | **Altbestand:** Welcher Server läuft aus, was liegt dort; wohin gehen Aufgaben und Leases aus AgentMemory | Datenverlustrisiko vor jeder Umstellung | nichts wird angefasst oder gelöscht |

## 9 · Entwurfsentscheidungen, bei denen Unsicherheit besteht

1. **Löschfrist als Zeitpunkt:** Die Löschfrist ist ein Zeitpunkt (`loeschen_ab`), nicht
   „Tage"; `config/gedaechtnis.json` spricht von `loeschfristTage`. Die Umrechnung liegt beim Aufrufer.
2. **Datensatzname im Cognee-Gerüst** ist `t-<mandant>--<art>` (Dokument/Chat/Notiz), nicht die im Konzept
   genannten Klassen wissen/verlauf/ablauf. Beides ist unbelegt; die Zuordnung ist eine Zeile.
3. **Der Sprachmodell-Aufrufer** wird im Cognee-Gerüst nur geprüft, nicht benutzt: Bei Selbstbetrieb ruft
   Cognee sein Modell serverseitig; ob das über einen injizierten Aufrufer führbar ist, zeigt erst der
   Probebetrieb.
4. **Ein fehlgeschlagener Schritt beendet den Lauf** (geschlossen) statt dem Modell einen zweiten Weg zu
   lassen. Das ist streng und kann sich im Betrieb als zu hart erweisen.
5. **Budget 0 gibt es nicht** (`max_kosten ≥ 1`); die Kostengrenze kann um höchstens einen Schritt
   überschritten werden, weil Kosten erst nach dem Schritt bekannt sind.
6. **Antwort muss das bedienende Modell melden** (`Modellantwort.bedient_von`), sonst gilt der Schritt als
   Policy-Verletzung. Ob der Router diese Angabe verlässlich liefert, ist nicht belegt.
7. **`pruefe_anfrage`** orientiert sich an der Prüfung im TypeScript-Gerüst (Form mit `reasoning.effort`
   und `provider.allow_fallbacks`). Für den eigenen Router ist die Form nicht belegt.
8. **Der Kopfleser für Skills** nimmt nur eine kleine YAML-Teilmenge an und sperrt alles andere. Die
   fünf eigenen Skills bestehen; die 44 Small-Business-Skills sind ungeprüft (Quelle fehlt hier).
9. **Akteure im Journal** stehen nur als gesalzener Hash. Für eine Revision reicht das nur zusammen mit
   den Freigabe-Objekten des Laufs, die heute nicht dauerhaft gespeichert werden.

## 10 · Prüfstand dieser Notiz

Ausgeführt am 14.11.2026 in der Arbeitsumgebung: die neuen Tests (`tests/test_knowledge_port.py`,
`tests/test_agent_core_*.py`, `tests/test_agent_runs_contract.py`). Nicht ausgeführt und nicht behauptet:
jeder Betrieb, jeder Modell- oder Dienstaufruf, jede Messung an Cognee, Router oder Servern.
