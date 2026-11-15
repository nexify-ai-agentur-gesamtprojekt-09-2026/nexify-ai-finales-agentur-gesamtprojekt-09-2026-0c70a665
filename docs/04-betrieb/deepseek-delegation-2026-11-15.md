# DeepSeek als Delegationsarbeiter für Claude-Sitzungen · 15.11.2026

Auftrag des Inhabers vom 15.11.2026 (über die koordinierende Sitzung): delegierbare Arbeit
soll an das günstigere Modell gehen, „einmal über OpenRouter, und DeepSeek direkt als
Fallback, über 9Router integriert“. Durch diese Arbeit wurde nichts eingeschaltet: kein
Modellaufruf, kein Schlüssel angelegt oder gelesen, keine Änderung am Router, am Server
oder an der Claude-Umgebung, keine Kosten.

## 1. Kurzfassung

- **Gebaut:** `tools/deepseek_arbeiter.py` (ein Befehl), `config/deepseek-delegation.json`
  (Wege, Limits, Hosts), Skill `.claude/skills/nexify-deepseek-delegation/SKILL.md`,
  26 Tests gegen einen nachgebauten Router (`tests/test_deepseek_arbeiter.py`).
- **Zustand:** ausgeschaltet. Ohne `DEEPSEEK_ARBEITER=ein`, `ROUTER_URL` und `ROUTER_KEY`
  endet jeder Aufruf mit „nicht eingerichtet“ (Exit 3) und sendet nichts.
- **Modellbindung:** Reasoning `high` wird gesendet; die Antwort muss den Stand
  `…deepseek-v4.1-flash-1017` nennen, sonst wird sie verworfen (Exit 5). Ein Rückfall auf
  ein anderes Modell ist damit ein Fehler, kein Ergebnis.
- **Wichtigster Befund:** Im öffentlichen OpenRouter-Katalog sind `deepseek/deepseek-v4.1-flash`
  und `deepseek/deepseek-v4.1-flash-1017` zwei verschiedene Einträge mit verschiedenen Preisen
  (Abschnitt 2.4). Der Name, unter dem der 9Router das Modell laut `apps/web/lib/chat-llm.ts`
  führt (`openrouter/deepseek-v4.1-flash`), ist undatiert. Ob der Router damit den Stand 1017
  erreicht, ist nicht belegt und nach dem Katalog eher nicht zu erwarten. Das betrifft auch
  den öffentlichen Chat und braucht eine Entscheidung (Abschnitt 8, Punkt 1).
- **Was der Inhaber tun muss:** Einschaltliste in Abschnitt 6. Die vier Angaben für das
  Schlüsselformular stehen in Abschnitt 6.1.

## 2. Belegter IST-Stand

### 2.1 Router

| Aussage | Beleg | Stand |
|---|---|---|
| `https://ai-router.nexifyai.cloud/` antwortet mit 307 auf `/dashboard`, hinter Cloudflare | eigener Abruf ohne Schlüssel, 15.11.2026 11:44 UTC | IST |
| `GET /v1/models` und `POST /v1/chat/completions` antworten ohne Schlüssel mit 401 und `{"error":"API key required for remote API access"}` | eigener Abruf, 15.11.2026 12:30 UTC | IST |
| Das Verhalten passt zum quelloffenen 9router (Oberfläche unter `/dashboard`, OpenAI-kompatible Schnittstelle unter `/v1`) | Projektseite `github.com/decolua/9router`, README, gelesen 15.11.2026 | IST für die Software; dass hinter der Adresse genau diese Software läuft, ist ANNAHME |
| Auf srv1941843 läuft ein Container `9router` im Compose-Projekt `stack`, laut Compose-Kommentar „abgelöst 03.10.“ | `docs/04-betrieb/aufraeumplan-2026-11-14.md:169` | Bericht vom 14.11., hier nicht nachgemessen |
| Der öffentliche Chat ruft den Router mit `Authorization: Bearer <ROUTER_KEY>` und dem Modellnamen `openrouter/deepseek-v4.1-flash` auf; die Policy-Kennung lehnt der Router mit 400 ab | `apps/web/lib/chat-llm.ts` (dort: gemessen 13.11.2026) | Bericht, hier nicht nachgemessen |
| Rückfallketten heißen im 9router „Combos“ und wechseln, „when quota runs out or errors occur“ | README des 9router | IST für die Software |
| Welche Anbieter, Modelle und Combos im eigenen Router eingetragen sind | ohne Schlüssel gibt der Router keine Modellkennung preis: `GET /v1/models` und `GET /api/v1/models` antworten mit 401 (eigener Abruf 15.11.2026) | OFFEN |
| Ob die Antwort des Routers im Feld `model` den Namen des Routers oder die Kennung des Anbieters trägt | README: keine Aussage | OFFEN, klärt der Probelauf |
| Anthropic-kompatible Schnittstelle (`/v1/messages`) | README nennt Formatübersetzung „OpenAI ↔ Claude“, aber im gelesenen Teil keinen Endpunkt | OFFEN |
| Ausgabenlimit je Router-Schlüssel | README: keine Aussage | OFFEN |

### 2.2 Schlüssel und Variablen

- In der Claude-Umgebung dieser Sitzungen ist für 9Router, OpenRouter oder DeepSeek nichts
  hinterlegt (Bericht der koordinierenden Sitzung vom 15.11.2026, 12:10 UTC; hier nicht selbst
  gelesen). Im Container dieser Sitzung sind `ROUTER_URL` und `ROUTER_KEY` nicht gesetzt
  (`python3 tools/deepseek_arbeiter.py --status`, 15.11.2026).
- `ROUTER_URL`/`ROUTER_KEY` liegen laut `config/loesungsregister.json` (Eintrag `9router`)
  als Vercel-Projektvariablen vor. Werte wurden nicht gelesen.
- Kein Schlüsselwert wurde gesucht, gelesen oder kopiert.

### 2.3 Vorhandene Adapter im Repository (nicht geändert)

| Datei | Weg | Bemerkung |
|---|---|---|
| `apps/web/lib/chat-llm.ts` | 9Router, `ROUTER_URL`/`ROUTER_KEY` | öffentlicher Chat; sendet den undatierten Router-Namen |
| `packages/agent-runtime/managed-live-chat.ts`, `nine-router-model.ts` | 9Router, `NINEROUTER_URL`/`ROUTER_KEY` | geschlossen ausgeliefert |
| `tools/automation/ai_review.py` | direkt OpenRouter, `OPENROUTER_API_KEY` | CI-Review, eigenes Kostenlimit je Lauf |
| `ops/hermes/` | direkt OpenRouter | Hermes-Konfiguration (D-019), ohne Rückfallanbieter |
| `ops/hermes/gateway/modell_waechter.py` | – | nur auf dem Zweig `claude/hermes-arbeitsbereich` (PR 193), hier nicht geprüft |

Der neue Arbeiter ist in Python geschrieben, weil er als Befehl in jeder Sitzung ohne
Installation laufen muss; die TypeScript-Bausteine gehören zur Website. Er übernimmt deren
Regeln (kein Rückfall auf ein anderes Modell, keine Weiterleitung, Schlüssel nur serverseitig).

### 2.4 Preise (öffentlicher OpenRouter-Katalog, `https://openrouter.ai/api/v1/models`, ohne Schlüssel gelesen 15.11.2026 12:30 UTC)

| Katalogeintrag | Eingabe je 1 Mio. Token | Ausgabe je 1 Mio. Token |
|---|---|---|
| `deepseek/deepseek-v4.1-flash-1017` | 0,15 USD; werktags 01–04 und 06–10 UTC 0,30 USD | 0,60 USD; in denselben Zeitfenstern 1,20 USD |
| `deepseek/deepseek-v4.1-flash` (undatiert, anderer Eintrag) | 0,0507 USD | 0,2028 USD |

Beide Einträge führen `reasoning` und `reasoning_effort` als unterstützte Parameter.
Preis des direkten DeepSeek-Zugangs: nicht belegt (nicht nachgelesen). Aufschläge des
Routers: laut README erhebt 9router selbst keine Gebühren.

## 3. Architektur: drei Wege, „hier in Claude“

In der Cloud-Umgebung von Claude Code lässt sich das Modell der Sitzung und ihrer
Unteragenten nicht auf einen fremden Anbieter umstellen; Variablen, die Laufzeit, Zugangsdaten
oder Proxy steuern, nimmt die Umgebung nicht an. „DeepSeek in Claude“ heißt deshalb:
Die Claude-Sitzung bleibt Auftraggeber und Prüfer und gibt Arbeit über ein Werkzeug ab.

| Weg | Was | Bewertung | Braucht |
|---|---|---|---|
| **a) Arbeiter-Werkzeug** (gebaut) | Ein Befehl schickt eine Textaufgabe ohne Werkzeugzugriff an das Modell und schreibt das Ergebnis in eine Datei | sofort nutzbar nach dem Einschalten; kleinste Angriffsfläche, weil das Modell nichts ausführen kann | Schlüssel und drei Variablen (Abschnitt 6) |
| **b) Agenten-Arbeiter im Container** (nicht gebaut) | Ein kopfloser Agentenlauf mit dem Router als Modellquelle, mit Datei- und Befehlszugriff | derzeit nicht vertretbar: (1) die Anthropic-Schnittstelle des Routers ist nicht belegt; (2) ein Agentenwerkzeug, das Claude-Modellnamen sendet, bekäme vom Router ein anderes Modell untergeschoben, ohne dass die Antwort geprüft wird, also genau der stille Ersatz, den die Modellregel verbietet; (3) ein Fremdmodell mit Shell im Container, in dem auch die Zugänge der Sitzung wirken, braucht eigene Rechtegrenzen. Kein Umgehen von Schutzmechanismen nötig, aber ohne Wächter vor der Leitung nicht regelkonform | Wächter, der Modell und Reasoning der serialisierten Anfrage prüft, und eine abgegrenzte Laufumgebung |
| **c) Hermes als Ausführer** (D-019) | Mehrstufige Aufgaben laufen auf dem eigenen Server in Hermes mit DeepSeek; Claude stößt an und prüft | der richtige Ort für Arbeit mit Werkzeugen; setzt den Funktionsnachweis von Hermes voraus (Schlüssel, Web-Oberfläche vom Netz, Docker-Socket; `ops/hermes/README.md`, „Offen“) und eine Schnittstelle zum Anstoßen | Serverarbeit, Entscheidung zur Zielroute 9router für Hermes |

**Empfohlene Reihenfolge:** a) einschalten und mit dem Probelauf belegen → c) nach dem
Funktionsnachweis von Hermes → b) nur, falls c) nicht reicht, und dann hinter einem Wächter.

### Ablauf im Arbeiter (Weg a)

1. Einrichtung prüfen (Schalter, Adresse, Schlüssel), sonst „nicht eingerichtet“.
2. Auftrag lesen: Kopf mit `aufgabe`, `datenklasse`, `art`; Größe prüfen.
3. Eingangsfilter: Geheimnisse, als Kundendaten markierte Inhalte, E-Mail, IBAN, Telefonnummer → Abweisung, bevor irgendetwas gesendet wird.
4. Limits prüfen und Reserve buchen (Auftrags- und Tageslimit).
5. **Weg 1** `router-openrouter`: ein Aufruf an den Router mit dem für OpenRouter eingetragenen Modellnamen.
6. Nur bei eindeutig gescheitertem Versuch (Verbindung kam nicht zustande, HTTP 400/404/429/503, Fehlerrumpf ohne Antwort) **Weg 2** `router-deepseek-direkt`. Bei unklarem Ausgang (Zeitüberschreitung, 500, 502, 504, Weiterleitung) kein zweiter Aufruf; die Reserve bleibt gebucht (`config/llm-policy.json`: `blind_retry_after_unknown_outcome_allowed: false`).
7. Antwort prüfen: Feld `model` muss auf `deepseek-v4.1-flash-1017` enden (Anbieterpräfix davor erlaubt). Sonst Abbruch ohne Rückfall.
8. Protokollzeile schreiben, Ergebnis mit Herkunftskopf in die Ausgabedatei.

Der Adapter wählt den Weg selbst, statt eine Combo des Routers zu verwenden. Nur so steht
sicher im Protokoll, welcher Weg geantwortet hat; bei einer Combo entscheidet der Router,
und ob die Antwort den Anbieter nennt, ist nicht belegt. Beide Wege laufen über den Router
(`gateway: 9router_only`, `direct_provider_bypass_allowed: false`).

**Protokoll** (`protokoll.jsonl` im Zustandsordner, Standard `~/.local/state/nexify/deepseek-arbeiter/`):
Zeit, Kurzbezeichnung, Art, Datenklasse, Weg, Versuch, HTTP-Status, Modell und Anbieter laut
Antwort, Token (Eingabe, Ausgabe, gesamt, Reasoning), Kosten falls geliefert, Dauer,
Eingabegröße, Umleitung. Keine Inhalte, keine Schlüssel.

**Grenzen des Nachweises:** Dass Reasoning `high` beim Anbieter ankommt, zeigt die Antwort
nicht verlässlich; geliefert werden höchstens Reasoning-Token. Der Zustandsordner liegt im
Container der Sitzung: Tageslimit und Protokoll beginnen in einem neuen Container bei null.
Die verbindliche Ausgabenbremse ist deshalb das Limit am Schlüssel beim Anbieter.

## 4. Delegationsregeln

| Arbeitsart | Delegieren | Prüfpflicht |
|---|---|---|
| Texte entwerfen, Gliederungen, Varianten (`entwurf`) | erlaubt | Aussagen gegen die Quelle; keine unbelegte Zahl, kein erfundener Name |
| Zusammenfassen (`zusammenfassung`) | erlaubt, wenn die Quelle selbst delegierbar ist | Stichprobe gegen die Quelle |
| Klassifizieren, Listen und Tabellen aufbereiten (`klassifikation`, `aufbereitung`) | erlaubt | Zeilenzahl, Stichproben, Ausgabe parsen |
| Übersetzen (`uebersetzung`) | erlaubt | Schlüsselsatz, Platzhalter; Seitentexte nach `nexify-seitentexte` |
| Code-Vorschlag ohne Werkzeugzugriff (`code-vorschlag`) | erlaubt, ohne Geheimnisse und ohne Kundencode | lesen, ausführen, Gates |
| Rechts- und Preistexte (`rechtstext-entwurf`, `preistext-entwurf`) | nur als Entwurf | Prüfung durch die Sitzung **und** Abnahme durch den Inhaber (D-017) |
| Personenbezogene Daten | **verboten** | – |
| Unterlagen, Daten, Code, Befunde aus Kundenprojekten; alles unter Mandantenschutz | **verboten** | – |
| Zugangsdaten, Schlüssel, Konfiguration mit Werten | **verboten** | – |
| Vertragsinhalte, vertrauliche Geschäftsunterlagen | **verboten** | – |
| Entscheidungen, Freigaben, Abnahmen, Sicherheits- und Merge-Urteile | **verboten** | – |
| Aufgaben, die Werkzeuge oder Kenntnis des Repositorys über den Auftrag hinaus brauchen | nicht über Weg a | – |

Jede Ausgabe prüft die beauftragende Sitzung, bevor sie verwendet wird; die Ausgabedatei
trägt den Vermerk „Ungeprüfte Ausgabe“. Der Eingangsfilter ist eine Schranke gegen Versehen,
kein Nachweis der Unbedenklichkeit.

**Datenschutz (keine Rechtsberatung):** Aufträge verlassen die EU oder können sie verlassen:
OpenRouter leitet an wechselnde Anbieter weiter, der direkte DeepSeek-Zugang liegt bei einem
Anbieter in China; der Verarbeitungsort ist je Weg nicht belegt. Welche Datenklasse über
welchen Weg gehen darf, ist eine offene Entscheidung des Inhabers. Bis dahin lässt der
Arbeiter nur `oeffentlich` und `intern-ohne-personenbezug` zu.

## 5. Kostenabschätzung

Gerechnet mit den Katalogpreisen aus 2.4 für den Stand 1017 über OpenRouter. Für den
direkten DeepSeek-Weg: nicht belegt.

| Größe | Wert | Rechnung |
|---|---|---|
| teuerster einzelner Auftrag im Auslieferungszustand | etwa 0,013 USD | 26 000 Eingabe-Token × 0,30 USD/Mio. + 4 000 Ausgabe-Token × 1,20 USD/Mio. (Hochpreisfenster) |
| lokales Tageslimit Token (150 000) | höchstens etwa 0,18 USD | alles als Ausgabe im Hochpreisfenster gerechnet |
| lokales Tageslimit Betrag | 5,00 USD | Deckel laut Entscheidung E10; greift nur, wenn der Router Kosten in `usage.cost` liefert (nicht belegt) |
| feste Obergrenze im Code | 5,00 USD am Tag | höher lässt sich die Konfiguration nicht stellen |

**Begründung des Deckels:** 5 USD am Tag ist der Wert der Entscheidung E10 (Vollmacht des
Inhabers vom 15.11.2026, mitgeteilt von der koordinierenden Sitzung am 15.11.2026; ein
Eintrag in `DECISIONS.md` steht aus). Er ist als `tageslimit_betrag_usd` eingetragen und
zugleich die feste Obergrenze im Code. Wirksam begrenzt im Auslieferungszustand zuerst das
Token-Limit: 150 000 Token am Tag kosten auch im teuersten Preisfenster unter 0,20 USD. Wer
den Deckel von 5 USD ausschöpfen will, hebt `tageslimit_token` bewusst an (Abschnitt 6.4);
bei 1,20 USD je 1 Mio. Ausgabe-Token entsprechen 5 USD rund 4,1 Mio. Token. Weil der
Betrag nur zählt, wenn der Router Kosten meldet, gehört derselbe Deckel als Ausgabenlimit an
den OpenRouter-Schlüssel (Abschnitt 6.2).
Ersparnis gegenüber der Arbeit in der Claude-Sitzung: nicht belegt, weil der Verbrauch der
Sitzungen je Aufgabe nicht gemessen ist.

## 6. Einschaltliste für den Inhaber

### 6.1 Angaben für das Schlüsselformular

| Frage | Antwort |
|---|---|
| (1) Hostname des 9Router | `ai-router.nexifyai.cloud` |
| (2) Kopfzeile und Präfix | `Authorization`, Präfix `Bearer` (so ruft der öffentliche Chat den Router auf: `apps/web/lib/chat-llm.ts`; ohne Schlüssel meldet der Router „API key required“) |
| (3) Variable, unter der der Arbeiter den Schlüssel erwartet | `ROUTER_KEY` (Adresse: `ROUTER_URL`, Schalter: `DEEPSEEK_ARBEITER`) |
| (4) Wo der Name bereits als Platzhalter steht (nur Namen, keine Werte) | `apps/web/.env.example` (`ROUTER_URL=`, `ROUTER_KEY=`), `config/llm-verbindungen.json` (`${ROUTER_URL}`, `${ROUTER_KEY}`), `config/llm-policy.json` (`base_url_env`, `api_key_env` des Anwendungsfalls `product_enrichment`), `packages/agent-runtime/managed-live-chat.ts` (`ROUTER_KEY`; die Adresse heißt dort `NINEROUTER_URL`), `apps/web/lib/chat-llm.ts`, `GO-LIVE.md`, `config/loesungsregister.json` (Eintrag `9router`: Vercel-Projektvariablen), `config/deepseek-delegation.json` |

### 6.2 Im Router (`https://ai-router.nexifyai.cloud/dashboard`)

Die Namen der Menüpunkte sind am eigenen Router nicht nachgesehen; die Schritte folgen der
README des 9router.

1. **Anbieter OpenRouter:** eigenen OpenRouter-Schlüssel für diesen Zweck erzeugen unter
   `https://openrouter.ai/settings/keys`, **mit Ausgabenlimit** (Vorschlag: 5 USD, täglich
   zurücksetzend, falls angeboten; sonst 5 USD gesamt und bewusst nachfüllen). Im Router beim
   Anbieter OpenRouter eintragen.
2. **Modell für Weg 1:** das Modell `deepseek/deepseek-v4.1-flash-1017` beim Anbieter
   OpenRouter verfügbar machen (falls der Router nur eine feste Liste kennt: als eigenes Modell
   anlegen). Den Namen notieren, unter dem der Router es führt. Erwartet wird
   `openrouter/deepseek/deepseek-v4.1-flash-1017`; weicht er ab, in
   `config/deepseek-delegation.json` unter `wege[0].router_modellname` eintragen (PR).
3. **Anbieter DeepSeek direkt (Rückfall):** Schlüssel erzeugen unter
   `https://platform.deepseek.com/api_keys`; ein Ausgabenlimit je Schlüssel ist dort nicht
   belegt, deshalb nur ein kleines Guthaben aufladen. Im Router als Anbieter eintragen.
   Voraussetzung laut `config/llm-policy.json`: Der dort erreichbare Modellname muss dem Stand
   `DeepSeek-V4.1-Flash-1017` entsprechen; der Alias `deepseek-flash` ist als „nicht
   Laufzeitbindung“ vermerkt. Den Router-Namen des Modells in `wege[1].router_modellname`
   eintragen (PR). Solange dort `null` steht, gibt es keinen Rückfall.
4. **Keine Combo** für diesen Zweck anlegen; die Wegfolge steuert der Arbeiter.

   **Was am Router fehlt, wenn er keinen datierten Stand anbietet:** ein Modelleintrag beim
   Anbieter OpenRouter mit der Kennung `deepseek/deepseek-v4.1-flash-1017` (Nr. 2) und ein
   Modelleintrag beim Anbieter DeepSeek, der dem Stand `DeepSeek-V4.1-Flash-1017` entspricht
   (Nr. 3). Laut `apps/web/lib/chat-llm.ts` bot der Router am 13.11.2026 nur den undatierten
   Namen an. Beide Einträge setzt der Inhaber in der Router-Oberfläche; eine Sitzung hat dort
   keinen Zugang. Bis dahin endet der Arbeiter mit Exit 6 (Name unbekannt) oder Exit 5
   (anderer Stand in der Antwort). Der Adapter wird dafür nicht gelockert.
5. **Router-Schlüssel:** der vorhandene Standard-Schlüssel genügt. Empfohlen ist ein eigener
   Schlüssel für Claude-Sitzungen, damit er getrennt gesperrt werden kann.

Schritte 1 und 3 sind kostenpflichtige Vorgänge (Guthaben) und bleiben beim Inhaber.

### 6.3 In der Claude-Umgebung

Umgebungsmenü in der Titelzeile der Sitzung › **Bearbeiten** (Umgebung „Team NeXify Agentur
Repo“ laut Bericht der koordinierenden Sitzung).

| Wo | Eintrag | Wert |
|---|---|---|
| Netzwerk-Geheimnisse (empfohlen) | Host `ai-router.nexifyai.cloud`, Kopfzeile `Authorization`, Präfix `Bearer` | der Router-Schlüssel, im sicheren Formular |
| Umgebungsvariable | `ROUTER_URL` | `https://ai-router.nexifyai.cloud/v1` |
| Umgebungsvariable | `ROUTER_KEY` | bei Netzwerk-Geheimnis ein Platzhalter ohne Geheimniswert, zum Beispiel `ueber-netzwerk-geheimnis`; der Proxy der Umgebung ersetzt die Kopfzeile. Ohne Netzwerk-Geheimnis: der Schlüssel selbst (dann liegt er im Klartext in der Umgebung, nicht empfohlen) |
| Umgebungsvariable | `DEEPSEEK_ARBEITER` | `ein` |

Variablen gelten ab der nächsten Sitzung.

**Läuft der Arbeiter mit Netzwerk-Geheimnis und Platzhalter?** Ja, nach Bauart: Er verlangt
nur, dass `ROUTER_KEY` nicht leer ist, und sendet den Wert unverändert als
`Authorization: Bearer <Wert>` an genau diesen Host; er prüft den Wert nicht auf eine Form.
Gemessen am 15.11.2026, 12:40 UTC: Mit dem Platzhalter und ohne hinterlegtes Geheimnis
erreicht die Anfrage des Arbeiters den Router durch den Proxy der Sitzung und wird mit 401
abgelehnt (Leitung und TLS funktionieren, kein Modellaufruf). Nicht gemessen ist, dass der
Proxy die Kopfzeile ersetzt, weil noch kein Geheimnis hinterlegt ist; das zeigt der
Probelauf (401 `schluessel_abgelehnt` = nicht ersetzt).

### 6.4 Limit anheben (optional)

`config/deepseek-delegation.json`, `limits.tageslimit_token` (ausgeliefert 150 000) und bei
Bedarf `tageslimit_aufrufe` (40); als PR, die Tests laufen mit. `tageslimit_betrag_usd`
steht bereits auf dem Deckel `"5.00"` und lässt sich nicht höher stellen.

### 6.5 Probelauf (kostet wenige Zehntel Cent)

```bash
python3 tools/deepseek_arbeiter.py --status          # erwartet: "eingerichtet": true
printf -- '---\naufgabe: probelauf\ndatenklasse: oeffentlich\nart: zusammenfassung\n---\nFasse in einem Satz zusammen: Wasser siedet auf Meereshöhe bei 100 Grad Celsius.\n' > /tmp/probe.md
python3 tools/deepseek_arbeiter.py --aufgabe /tmp/probe.md --ausgabe /tmp/probe-ergebnis.md --max-ausgabe-token 1500
tail -n 1 ~/.local/state/nexify/deepseek-arbeiter/protokoll.jsonl
```

| Ergebnis | Bedeutung | Nächster Schritt |
|---|---|---|
| Exit 0, `weg: router-openrouter`, Modell endet auf 1017 | Weg 1 belegt | Rückfall prüfen: im Router den Anbieter OpenRouter kurz abschalten, erneut laufen lassen, erwartet `weg: router-deepseek-direkt`, danach wieder einschalten |
| Exit 5 `anderes_modell_in_antwort` | der Router liefert einen anderen Stand oder nennt nur seinen eigenen Namen | Protokollzeile lesen (`modell_laut_antwort`), Schritt 6.2 Nr. 2 prüfen; nicht den Filter lockern |
| Exit 6 `alle_wege_gescheitert` mit Status 400/404 | der Modellname ist dem Router unbekannt | Namen aus dem Router eintragen (6.2 Nr. 2) |
| Exit 6 `schluessel_abgelehnt` | Schlüssel fehlt oder wird nicht ersetzt | 6.3 prüfen |

Nach dem Probelauf: Verbrauch im Router und bei OpenRouter mit der Protokollzeile vergleichen
und den Zustand im Lösungsregister (`deepseek-arbeiter`) auf „läuft belegt“ stellen.

### 6.6 Rückweg

`DEEPSEEK_ARBEITER` in der Umgebung entfernen oder auf einen anderen Wert setzen: ab der
nächsten Sitzung sendet der Arbeiter nichts mehr. Härter: Netzwerk-Geheimnis entfernen oder
den Router-Schlüssel im Router sperren. Im Repository muss dafür nichts geändert werden;
gelöscht wird nichts.

## 7. Prüfung

Tests (`python3 -m unittest tests.test_deepseek_arbeiter`, 26 Tests, lokaler Test-Server,
kein Netz, kein Schlüssel):

| Fall | Erwartet | Test |
|---|---|---|
| OpenRouter antwortet | Weg 1 im Protokoll | `test_openrouter_antwortet_weg_eins_wird_protokolliert` |
| OpenRouter fällt aus (503, 429) | Weg 2 im Protokoll, Umleitung vermerkt | `test_openrouter_faellt_aus_weg_zwei_wird_protokolliert` |
| Router liefert ein anderes Modell | Abbruch ohne Rückfall | `test_anderes_modell_in_der_antwort_bricht_ab_ohne_rueckfall` |
| Limit überschritten | Abbruch vor dem Aufruf | `test_tageslimit_token_bricht_vor_dem_aufruf_ab` und drei weitere |
| Geheimnis im Auftrag | Abweisung, nichts gesendet, nichts protokolliert | `test_geheimnis_im_auftrag_wird_abgewiesen` |
| ohne Schlüssel | „nicht eingerichtet“ | `test_ohne_schluessel_nicht_eingerichtet` |
| unklarer Ausgang (500, 502, 504, Weiterleitung, tröpfelnde Antwort über das Zeitlimit) | kein zweiter Aufruf, Reserve bleibt gebucht | `test_unklarer_ausgang_loest_keinen_zweiten_aufruf_aus` |
| Schlüssel nur an eingetragene Hosts, nie im Protokoll | Abbruch bei fremdem Host | `test_schluessel_geht_nur_an_eingetragene_hosts_und_nie_ins_protokoll` |

Die Tests belegen das Verhalten des Adapters gegen eine Attrappe, nicht das Verhalten des
echten Routers.

## 8. Offene Entscheidungen des Inhabers

1. **Undatierter Modellname im Router.** Soll der Router das Modell `…-1017` führen (dann
   gilt die Modellregel wörtlich, auch für den öffentlichen Chat), oder gilt die am 13.11.2026
   für den Chat gegebene Freigabe des undatierten Namens weiter? Der Arbeiter folgt der
   wörtlichen Regel und verwirft undatierte Antworten.
2. **Einschalten** (Abschnitt 6) und, falls der Deckel von 5 USD ausgeschöpft werden soll, Anhebung des Token-Limits.
3. **Datenklassen und Verarbeitungsort:** Welche Inhalte dürfen über OpenRouter, welche über
   den direkten DeepSeek-Zugang gehen? Soll der direkte Weg überhaupt eingetragen werden?
4. **Eigener Router-Schlüssel** für Claude-Sitzungen statt des Standard-Schlüssels.
5. **9Router als Modellweg:** Das Lösungsregister führt den Router als „unklar“ (Compose-Kommentar
   „abgelöst“, Modellregel „Ziel“). Der Auftrag vom 15.11.2026 spricht für „Ziel“; ein
   D-Eintrag dazu steht aus. Vorschlag für den Wortlaut: „Delegierbare Textarbeit der
   Claude-Sitzungen geht über `tools/deepseek_arbeiter.py` an das Policy-Modell, über den
   9Router mit OpenRouter zuerst und DeepSeek direkt als Rückfall; ausgeschaltet, bis der
   Probelauf belegt ist.“
6. **Weg c:** Hermes über den Router statt direkt an OpenRouter (`ops/hermes/README.md`, „Offen“ Nr. 2).

## 9. Nicht belegt

- Kein echter Aufruf; Modellname, Antwortfeld `model`, Kostenmeldung und Reasoning am echten Router.
- Dass hinter `ai-router.nexifyai.cloud` der Container `9router` von srv1941843 steht.
- Inhalt der Umgebung (nur Bericht), Zustand der Zweige `claude/hermes-arbeitsbereich` und
  `claude/prozess-automatisierung` über die Dateiliste hinaus.
- Preise des direkten DeepSeek-Zugangs; Ersparnis gegenüber Claude-Sitzungen.
