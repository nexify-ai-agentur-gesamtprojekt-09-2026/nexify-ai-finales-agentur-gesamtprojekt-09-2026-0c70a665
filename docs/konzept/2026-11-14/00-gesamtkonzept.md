# 00 · Gesamtkonzept NeXify AI FACTORY — Marke, Geschäft, System und Agentenkern aus einem Guss

Stand: 14.11.2026 · Zusammenführung der vier Bestandsaufnahmen (nur gelesen, nichts im Repository geändert, kein Build, kein Commit).
Für: Pascal Courbois (Inhaber) · Erstellt im Auftrag der Projektleitung.

**Quellen**

| Kürzel | Quelle |
|---|---|
| B01 | `konzept/01-marke-marketing.md` (Marke, Naming, Marketing) |
| B02 | `konzept/02-shop-werkstatt.md` (TEILEKLAR, Werkstatt, Partner) |
| B03 | `konzept/03-suite-saas.md` (Suite, Abo, Mandanten) |
| B04 | `konzept/04-agenten-wissen.md` (Agentenkern, Wissen, Cognee) |
| Repo | `/home/user/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` – nachgeschlagen: `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`, `config/fakten.json`, `config/llm-policy.json`, `git branch` |

**Kennzeichnung – jede Aussage trägt eine dieser Marken**

| Marke | Bedeutung |
|---|---|
| **IST** | belegt; Verweis auf Bericht/Abschnitt oder Datei:Zeile. „Belegt" heißt Code/Datei/Abruf vorhanden – nicht „läuft in Produktion", außer es steht dabei. |
| **SOLL** | Vorgabe des Inhabers (Auftrag 14.11.2026 oder ältere dokumentierte Inhaberentscheidung). |
| **PL** | Entscheidung der Projektleitung vom 14.11.2026 – umkehrbar, vom Inhaber jederzeit änderbar. |
| **LÜCKE** | fehlt oder ist nicht belegt. |
| **ANNAHME** | Vorschlag/Schlussfolgerung, nicht belegt, vor Verwendung zu bestätigen. |

Es wurden keine Preise, Zahlen, Kunden, Anbieterverträge oder Leistungsversprechen neu gesetzt. Beträge erscheinen nur als Zitat einer Quelle und sind dort als nicht freigegeben markiert.
Empfehlungen in Abschnitt 6, die nicht in der Liste „Entscheidungen der Projektleitung" (2.0) stehen, sind Vorschläge dieser Zusammenführung und von der Projektleitung zu bestätigen, bevor sie dem Inhaber als deren Empfehlung vorgelegt werden.

**Feste Grenzen des Inhabers (gelten unverändert, SOLL):** keine eigenmächtigen Käufe, Abos oder Anbieterkonten · keine rechtsbindenden Zusagen · nichts unwiderruflich löschen · strikte Mandantentrennung (DSGVO) · Secrets nie im Klartext · keine Sicherheitslockerungen. Projektregel: gemanagte LLM-Aufrufe nur DeepSeek laut `config/llm-policy.json` (`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`, kein stiller Ersatz).

---

## 1. Kurzfassung für den Inhaber

**Wo wir wirklich stehen**
1. Viel Code, viel Konzept, aber kein einziger durchgängig laufender Kundenweg. Die Shop- und Konten-Schnittstelle antwortet live mit 503 (B02 §1.2, Abruf 14.11.); damit funktionieren weder Shop noch Werkstattsuche, Partneranfrage, Registrierung oder Anmeldung.
2. Suite: Registrierung → Abo → Bezahlung → Freischaltung → Chat existiert nur als unverbundene Einzelteile; für Abos gibt es keinen Zahlungscode und kein freigegebenes Preismodell (B03 §7).
3. Agentenkern: Im Repository läuft kein Agent mit Gedächtnis; „unsere Python-Agenten-Lösung" ist dort nicht auffindbar; Brain und Rollen sind Entwürfe (B04 §0).
4. Texte sind in vier Sprachen formal vollständig, inhaltlich aber überwiegend Vorbehalt und Jargon; kein freigegebener Preis, keine Rechtstexte, der bindende Name steht an keiner Stelle (B01 §6).

**Zielbild**
5. Ein Dach (NeXify AI FACTORY, Claim „Chat it. Automate it."), vier Bereiche (Agentur, Suite, TEILEKLAR, API), ein Agentenkern in Python auf Skill-Basis mit einem zentralen Wissensspeicher (Cognee hinter eigenem Adapter), ein Mandantenmodell mit Trennung in der Datenbank, ein Designsystem (dunkel, Liquid Glass, Tokens) als gemeinsame Klammer.

**Die fünf größten Lücken**
6. Produktionsfundament: 503, mehrere widersprüchliche Stände im Netz, Zugänge und Prüfkette offen.
7. Betreiber und Recht: Eenmanszaak oder B.V. ungeklärt; Datenschutz, AGB, AVV, Partnervereinbarung fehlen – das blockiert Impressum, Indexierung und jeden Verkauf.
8. Geschäftsmodell: keine freigegebenen Preise, drei widersprüchliche Abo-Entwürfe, „kostenfrei für Werkstätten" und „Direktpartner" nicht definiert, kein Zahlungsanbieter für Abos.
9. Mandantentrennung ist heute Beschriftung, keine Technik: NeXify und TEILEKLAR teilen Adresse, Cookie, Datenbank und Anfragetabelle; Wissensdienste und Chatdaten tragen keinen Mandanten.
10. Agenten und Wissen: Altbestand (rund 10.000 Einträge laut Notion) liegt auf Servern, von denen einer ausläuft – ungesichert; Widersprüche zur Modellregel (Anthropic, „Jeff AI") sind offen.

**Was bereits läuft**
11. Bereinigung Chat/Startseite (Branch `claude/atelier-fehlerbehebung`) · Suite-Fundament hinter Schaltern (Branch `claude/epic-hopper-7d3duf`: Besitzprüfung, Mandantenmodell mit RLS, Abrechnungskern gegen Attrappe, E-Mail-Bestätigung, BYO-Sicherheitsgerüst) · danach zweiter Design-Durchgang · danach Textumsetzung.
12. Der Claude-Nachtlauf „Regelkreis" ist pausiert (Kosten ohne Wirkung laut Befund 13.11.), wiedereinschaltbar.
13. 23 weitere Pakete sind ohne Ihre Entscheidung baubar (Abschnitt 5, Welle 1) – alles hinter Schaltern, nichts mit Geld, Vertrag oder Anbieter.

**Was wir von Ihnen brauchen – in dieser Reihenfolge**
14. Sofort: `teileklar.shop` zeigt öffentlich und indexierbar einen Altstand mit nicht freigegebenen Konditionen („0 €", „19,90 €") – sperren oder umleiten (EV-01).
15. Sofort: Welcher Server läuft wann aus, und Lesezugang für Inventar und Sicherung (EV-02); alte Notizen mit Klartext-Zugangsdaten prüfen und Zugänge drehen (EV-03).
16. Diese Woche: Endform des Namens und Kürzungsregel (EV-04) · Rechtsträger (EV-05) · Laufzeit-Zugänge und Adresse der Produktion (EV-06) · Auftrag an Anwalt/Steuerberatung (EV-07).
17. Danach: Kundenkreis, Abo-Stufen und Preise, Zahlungsanbieter (EV-10 bis EV-12) · „kostenfrei"/Direktpartner (EV-13) · NeXify AI Intelligence/Jeff (EV-14) · Anthropic-Variante bestätigen (EV-15) · Ort der Python-Lösung (EV-16).
18. Ohne diese Entscheidungen bleibt sichtbar: kein Preis, keine Kostenaussage, kein Abo-Kauf, kein Chat-Gedächtnis, keine Werbeaussage zur KI-Leistung.

---

## 2. Zielbild aus einem Guss

### 2.0 Entscheidungsstand der Projektleitung (PL, umkehrbar)

| Nr. | Entscheidung | Grundlage / offene Bestätigung |
|---|---|---|
| PL-1 | Name (Arbeitsfassung): **„AIFly ORACLE with NeXify AI Intelligence by NeXify"**; Firma **„NeXify AI FACTORY"**; Claim **„Chat it. Automate it."**; Kontakt `mail@nexifyai.cloud` | Antworten des Inhabers „im richtigen Englisch", „Immer der volle Name". Endform vom Inhaber zu bestätigen (EV-04). IST: 0 Treffer im Repo (B01 §1.1). |
| PL-2 | Anrede durchgehend **„Sie"** | deckt sich mit `config/site-map.json:15` (B01 §3.6). Filmtexte und Charakterbibel duzen noch → umzuschreiben. |
| PL-3 | Startseiten-Fassung **„Ein Gespräch. Ein Projekt, das passt."** ist Basis für alle vier Sprachen | löst den Widerspruch dreier Fassungen (B01 §2.2); NL/FR/EN tragen noch die alte. |
| PL-4 | Interner Jargon („ohne Live-KI", „Entwicklungsvorschau", „Zielbild") verschwindet von sichtbaren Seiten | Fundstellen B01 §2.3. |
| PL-5 | Chat-Hinweis „an OpenAI übermittelt" wird auf den tatsächlichen Datenweg korrigiert und zur rechtlichen Prüfung markiert | IST: `config/assistant-interface-copy.json:62` (B01 §2.3) gegen Router/DeepSeek-Weg (D-010). |
| PL-6 | Design: dunkle CI-Fassung Standard, helle nur per Schalter; Liquid Glass; Chat als Glasfront; Struktur der Startseite vom Inhaber abgenommen; Veredelung und Token-System laufen | passt zu `DECISIONS.md` USER-LUXURY-20261101. |
| PL-7 | Anthropic: **Arbeitsvariante A** – Skills als Format und Arbeitsweise, Modell im Produkt bleibt DeepSeek; Claude nur als Werkzeug beim Aufbau | Wechsel nur mit ausdrücklicher Inhaberentscheidung (Kosten, Vertrag, Datenfluss) – EV-15. |
| PL-8 | Cognee: Selbstbetrieb; Modellaufrufe nur über den eigenen Router; Einbettungen lokal; Mandant als Pflichtfeld im Adapter; Altbestand (AgentMemory) wird gesichert und archiviert, nicht gelöscht | Host offen (EV-02). |
| PL-9 | Claude-Nachtlauf „Regelkreis" ab sofort pausiert, wiedereinschaltbar | Befund 13.11.: Lauf 87 s, 1,28 USD, „nichts gebaut" (B04 §1.2). Hinweis: B04 §7 (B2) vermerkt, dass das Pausieren am 13.11. zweimal abgelehnt wurde – Nachweis, dass die Pause wirksam ist, steht aus (Abschnitt 8). |
| PL-10 | Umsetzungsstränge a–d laufen (Welle 0, Abschnitt 5) | IST: beide Branches existieren lokal (`git branch`, 14.11.). |

### 2.1 Markenarchitektur

```
Unternehmen   NeXify AI FACTORY                       [PL-1 · Rechtsträger offen → EV-05]
Dachmarke     NeXify AI            Claim „Chat it. Automate it."
│
├─ Agentur    Leistungsfelder: Marke & Web · Systeme & KI · Wachstum & Kampagnen      [IST B01 §3.2]
│             Projektpakete: Markenstart · KI im Betrieb · Wachstum · Option NeXify Care
│
├─ Produkte   NeX2fly Suite            Arbeitsbereich für Kunden (Editionen offen → EV-10/EV-20)
│             NeX Agentic AI           ausführende Agenten (Schreibweise ↔ „NeX Agentic AIFly" offen → EV-20)
│             AIFly ORACLE with NeXify AI Intelligence by NeXify   ordnendes KI-System und Figur [PL-1]
│             NeXify API               Schnittstelle (Faktenquelle nennt „NeXify AI API")
│             [NeX & AIFly ORACLE Suite]  vom Inhaber genannt, Stellung zur NeX2fly Suite offen → EV-20
│
├─ Eigene     TEILEKLAR                Shop- und Werkstattmarke, eigener Mandant, eigene Rechtstexte
│  Marke
├─ Figuren    Pascal (Mensch, unverfremdet) · NeX (Tukan) · AIFly ORACLE (glatt, Hut/Monokel, ohne Fell) [IST AGENTS.md]
│
└─ Technik    NeXify AI Intelligence (Bedeutung offen → EV-14) · Brain · Skills · MCP · Cognee · Jeff-Gate
              – intern, nicht in Kundentexten
```

**Namensregel (ANNAHME aus B01 §1.3, bis EV-04/EV-20 als Arbeitsregel)**

| Name | So schreiben | Nicht schreiben | Wo |
|---|---|---|---|
| NeXify AI FACTORY | genau so, ohne Rechtsformzusatz | „B.V." in Überschriften, Chat, Metadaten, solange nicht bestätigt; „Factory" | Unternehmen, Fußzeile, Angebote, Signatur |
| NeXify AI | mit Leerzeichen | „NeXifyAI", „Nexify", „NEXIFY" in sichtbarem Text | Kopfzeile, Metatitel, Kurzform |
| AIFly ORACLE with NeXify AI Intelligence by NeXify | voller Name (SOLL „Immer der volle Name") | „Oracle", „AI Fly Oracle", „AIFly", „Orakel", „ORACEL" allein | überall; Kürzung nur nach EV-04 |
| NeX | als Figur allein | – | Figur |
| NeX Agentic AI | als Produkt | „NeX Agentic AIFly" (Mischform), bis EV-20 | Produktseiten |
| NeX2fly Suite | immer mit „Suite" | „NeX2Fly", „NEX2FLY" | Produktseiten, Registrierung |
| TEILEKLAR | Versalien (Regel belegt: `docs/01-konzept/NeXifyAI-CI-Schema.md:27`) | „Teileklar", „TeileKlar" | eigener Auftritt; im NeXify-Auftritt als „eigene Marke" |
| Technikbegriffe | intern | Brain, Jeff, Gate, Tenant, Lease, „Zielbild", „Freischaltung", „Betriebsstand" in Kundentexten; Lieferantenname „BigBuy" sichtbar (offen, B01 §4.1 Nr. 13) | nur intern; „Skills/MCP" sichtbar nur mit einem erklärenden Satz |

IST dazu: mindestens sieben Schreibweisen für AIFly ORACLE, zwei Anbieternamen gleichzeitig sichtbar, „Orakel" bezeichnet zusätzlich das interne Prüf-Gate „Jeff" (B01 §1.2). `DECISIONS.md` D-010 („Die Namen ‚AIFly ORACLE' und ‚NeX Agentic AI' bleiben") ist durch die Weisung vom 14.11. überholt und muss nachgetragen werden (Paket W1-01).
LÜCKE: Ausspracheblatt, Glossar DE/NL/FR/EN, Markenrecherche (EV-19).

### 2.2 Angebots- und Geschäftsmodell je Bereich (nur Belegtes)

| Bereich | Was verkauft wird (IST) | Wie abgerechnet wird (IST) | Was nicht freigegeben/belegt ist (LÜCKE) |
|---|---|---|---|
| **Agentur** | Drei Leistungsfelder, drei Projektpakete, NeXify Care als separate Betreuung; persönliche Begleitung durch Pascal Courbois (B01 §3.2, §3.4) | Kostenarten getrennt: Umsetzung, Betreuung, Fremdkosten (Seite `pricing`). Tagessatz steht in `config/fakten.json` (`projekt.tagessatz_eur`), ist aber für die neue Preisseite nicht freigegeben (B01 §2.2) | Kein sichtbarer Preis; keine Referenzen, Kennzahlen, Kundenstimmen; Angebotsversand und Terminbuchung nicht verbunden (B01 §3.7) |
| **Suite (NeX2fly Suite)** | Eigenständiges Produkt: Arbeitsbereich für Gespräche, Aufgaben, Dokumente, Wissen; SOLL 14.11.: nach Bezahlung Zugriff auf Chat, Composio-MCP-Anbindungen und Dashboard; eigenes LLM oder NeXify AI Intelligence | Vorgabe: einmaliger 24-Stunden-Test, bewusst gestartet, keine automatische Abbuchung, Modellnutzung getrennt (`config/selfservice-policy.json`, B03 §3.2) | Kein freigegebenes Abo-Modell: drei widersprüchliche Entwürfe (Code `nexify_api.py:28`, `config/api-prepaid.json`, Policy „kein Preis") (B03 §1.3); kein Zahlungsanbieter für Abos; kein nutzbarer Funktionsumfang benannt |
| **TEILEKLAR Shop** | Autoteile; TEILEKLAR ist Verkäufer, nicht Vermittler (Inhaberentscheidung 31.08.2026, B02 R-9); Lieferant BigBuy; Lieferländer DE, AT, NL, BE, LU (`config/fakten.json`) | Einmalzahlung über Revolut Merchant (D-008); ein Steuersatz für alle Länder (B02 §1.5) | Katalog leer (Lieferantenzugang zuletzt abgelehnt, D-008); API 503; Rechtstexte nur AGB/Widerruf als Prototyp-Übernahme; kein Geschäftskundenablauf |
| **TEILEKLAR Werkstatt** | Werkstattsuche (Verzeichnis, 579 Einträge in der Datei – keine Partner), Anfrage an Betrieb, Seite „Partner werden" (B02 §1.2, §1.4) | SOLL 14.11.: Werkstattbetreiber erkennen sofort, dass der Service kostenfrei ist | „Kostenfrei" nirgends freigegeben belegt; alte Prototypen koppeln es an eine Erfolgsgebühr, der Masterplan erklärt diese Werte für historisch (B02 §3); „Direktpartner" kommt in keiner Quelle vor (B02 §4.1); kein Partnerstatus, keine Rolle, kein Portal |
| **API (NeXify API)** | Einbindung von NeXify-Funktionen in eigene Anwendungen (Zielbild) | Prepaid-Entwurf `config/api-prepaid.json`; Mindestaufladung laut `DECISIONS.md` D-003 (Inhabervorgabe 29.09.2026) | Aufschlag offen (E1), Steuerfrage offen (E4), kein Kaufweg, keine Entwicklerdokumentation (B01 §3.7) |

### 2.3 Kundenwege Ende-zu-Ende

Statusmarken: ✔ Code vorhanden und nach Fundamentklärung nutzbar · ◐ Code vorhanden, nicht verbunden oder live 503 · ✖ fehlt · ⛔ braucht Inhaberentscheidung.

**A · Agentur (Quelle B01 §3.7)**
1. Besuch der Website (◐ drei Stände im Netz, Indexierung aus)
2. Gespräch mit dem KI-System im Chat, Briefing entsteht (◐ Code vorhanden, Livebetrieb nicht nachgewiesen)
3. Übergabe an Pascal Courbois per Anfrage (◐ Formular hängt an der 503-API) oder Terminwunsch (✖ kein Kalender verbunden)
4. Persönliches Gespräch
5. Angebot (◐ Angebotsweg nur als API; ⛔ keine freigegebenen Preise)
6. Auftrag → Umsetzung → Abnahme
7. Übergabe und NeXify Care (⛔ Umfang und Preis nicht freigegeben)

**B · Suite (Quelle B03 §1, §2.5; SOLL 14.11.)**
1. Registrierung mit E-Mail und Passwort (◐; Firmenangaben fehlen)
2. E-Mail-Bestätigung (läuft in Welle 0b)
3. Zustimmung zu AGB/AVV mit Fassung und Zeit (✖ Texte fehlen → EV-07)
4. Arbeitsbereich/Mandant wird angelegt (läuft in Welle 0b: Mandantenmodell mit RLS)
5. Tarif wählen (⛔ EV-11) → Checkout beim Zahlungsanbieter (⛔ EV-12)
6. Signierter Webhook → Rücklesen → Abo und Berechtigung in einer Transaktion (Kern läuft in Welle 0b gegen Attrappe)
7. Freischaltung: Dashboard, Chat, Verbindungen (◐ Oberfläche/API vorhanden, auf Vercel nicht eingebunden)
8. LLM-Wahl: eigenes LLM (Schlüssel im Tresor, ✖) oder NeXify AI Intelligence (◐ ein Modell über Router)
9. Werkzeuge über MCP-Vermittler je Mandant (✖; Composio ⛔ EV-17)
10. Rechnung je Zeitraum (✖; ⛔ Steuer/Rechtsform)
11. Kündigung: Zugang bis Laufzeitende, danach Lesen/Export, Sperre statt Löschung (✖)

**C · TEILEKLAR Autofahrer (Quelle B02 §1.5)**
1. Fahrzeug wählen → Teil finden → Passung prüfen (◐ Oberfläche da, Katalog leer)
2. Warenkorb → Kasse → Bedingungen akzeptieren (◐; ⛔ Betreiberangaben und Rechtstexte)
3. Zahlung (Revolut) → signierter Webhook → Bestätigungsmail → Weitergabe an Lieferant (◐)
4. Optional: Einbau bei einer Werkstatt anfragen, verknüpft mit Bestellung und Teil (✖ Verknüpfung fehlt)

**D · TEILEKLAR Werkstatt/Partner (Quelle B02 §4.3; Zustände nach Masterplan §12.5)**
1. Einstieg über Suche, Verzeichniseintrag oder Seite „Partner werden" (◐ Seite `noindex`)
2. Nutzen, Ablauf, Kostenaussage, FAQ (◐ ohne Kostenaussage; ⛔ EV-13)
3. Anfrage absenden (◐ live 503) → Eingangsbestätigung per Mail (✖)
4. Abgleich mit dem Verzeichnis, Prüfung des Betriebs (✖; ⛔ Kriterien)
5. Annahme der geltenden Konditionsfassung und des AVV (✖; ⛔ Text)
6. Freischaltung `approved`: Partnerkonto mit Rolle, gebunden an genau einen Betrieb (✖)
7. Profil pflegen → Vorschau → Freigabe durch den Partner → `published`, erst dann Partnerkennzeichen (✖)
8. Kundenanfrage wird zugestellt, Partner nimmt an oder lehnt ab, Termin (✖ – heute erreicht die Anfrage den Betrieb nicht, B02 R-3)
9. Abrechnung nur, falls es eine Gebühr gibt (⛔ EV-13)

**E · API**
1. Bedarf klären → 2. Zugang und Schlüssel (◐ Schlüsselverwaltung im Portal-Code) → 3. Guthaben aufladen (✖; ⛔ E1/E4) → 4. Nutzung mit Verbrauchszählung (✖)

### 2.4 Systemarchitektur (Zielbild = ANNAHME aus B03 §2 und B04 §3.6/§4.3; IST-Abweichungen darunter)

```
 Besucher / Kunde                                   Werkstatt / Autofahrer            Inhaber (Betreiber)
       |                                                     |                               |
       v                                                     v                               v
+---------------------------- Web-App apps/web (Next.js, Vercel fra1) ---------------------------------+
|  NeXify-Seiten · Chat als Glasfront · /registrieren /anmelden      TEILEKLAR-Seiten /teileklar/*     |
|  Geschützt: /portal/* (Dashboard, Chat, LLM-Wahl, Verbindungen, Abo, Rechnungen)   /intern/*         |
|  Gemeinsam: Designsystem (Tokens, Komponenten) – getrennt: Sitzung, Daten, Rechtstexte je Marke      |
+--------+--------------------------------+------------------------------+-----------------------------+
         | öffentlicher Chat              | Cookie-Sitzung NeXify        | Cookie-Sitzung TEILEKLAR
         v                                v                              v
+----------------+   +--------------------------------------------+   +-------------------------------+
| Chat-Route     |   | Suite-Backend (ein Dienst)                 |   | Shop-/Werkstatt-Dienst        |
| Leitplanken,   |   | Konten · Mandant/Mitgliedschaft/Rolle      |   | Katalog · Warenkorb · Kasse   |
| Ausgabeprüfung |   | Berechtigung (einzige Quelle „darf was")   |   | Werkstätten · Partnerantrag   |
| Ablage         |   | Abrechnung: Checkout, Webhook, Journal,    |   | eigener Mandant, eigene       |
+-------+--------+   |   Abgleichlauf                             |   | Vorgangsnummern, eigene Mails |
        |            | Kunden-Chat · Verbrauch je Mandant         |   +---------------+---------------+
        |            | MCP-Vermittler: Werkzeuge je Mandant       |                   |
        |            | Audit ohne Inhalte und ohne Geheimnisse    |                   |
        |            +----+----------+----------+---------+-------+                   |
        |                 |          |          |         |                           |
        v                 v          v          v         v                           v
+--------------------------------------------------+   Tresor            Zahlungs-    Datenhaltung Shop
| Agentenkern (Python, dauerhafter Host – offen)   |   (BYO-Schlüssel,   anbieter*    (heute MongoDB)
|  HTTP: /agent/runs · Freigabe · Abbruch · Skills |    Webhook-         (Abo) ·
|  NeX Agentic AI  = ausführende Fachagenten       |    Geheimnisse)     Revolut
|  AIFly ORACLE …  = ordnet, koordiniert, berät    |                     (Shop)
|  Skill-Register (Hash) · Laufjournal · Schritt-, |
|  Zeit-, Geldgrenze · Freigabepunkte A/B/C        |
+------------+-------------------------+-----------+
             |                         |
             v                         v
+---------------------------+   +-----------------------------------------------+
| Wissensport (Adapter)     |   | Router (9router, nur Server)                  |
| Mandant Pflicht · Schreib-|   |  (a) NeXify AI Intelligence → Policy-Modell   |
| kette mit Rücklesen ·     |   |      DeepSeek, Reasoning high, kein Ersatz    |
| Treffer = Daten, nie      |   |  (b) eigenes LLM des Kunden → Anbieter des    |
| Anweisung                 |   |      Kunden, kein Rückfall auf NeXify         |
+------------+--------------+   +-----------------------------------------------+
             v
+---------------------------+      Quelle der Wahrheit bleibt die Datenbank (PostgreSQL, EU, RLS FORCE);
| Cognee (Selbstbetrieb)    |      Cognee ist abgeleitet und jederzeit neu aufbaubar.
| Datensatz je Mandant und  |      Einbettungen lokal · Modellaufrufe nur über den eigenen Router ·
| Wissensklasse · Zugriffs- |      Altbestand AgentMemory/LightRAG: gesichert, archiviert, nicht gelöscht.
| kontrolle erzwungen       |
+---------------------------+
 * = Entscheidung des Inhabers offen     Mail (Resend) · Fehler (Sentry) · Protokolle ohne Inhalte/Geheimnisse
```

**Mandantengrenzen (Regeln; Quelle B03 §2.2, B04 §3.4, §6)**

| Ebene | Regel | Marke |
|---|---|---|
| Datenbank | jede Suite-Tabelle mit `mandant_id`, `ENABLE` + `FORCE ROW LEVEL SECURITY`, `USING` und `WITH CHECK` (Muster `db/foundation/001_foundation.sql`) | IST als Fundament, nicht angeschlossen; läuft in Welle 0b |
| Anfrage | Mandant kommt aus Sitzung und Mitgliedschaft, nie aus einem Feld der Anfrage oder aus dem Browser | SOLL/Regel aus `config/mandanten.json` |
| NeXify ↔ TEILEKLAR | getrennte Sitzung, getrennte Datenhaltung oder mindestens getrenntes Mandantenfeld, getrennte Vorgangsnummern, Absender und Rechtstexte; gemeinsame Komponenten und Tokens erlaubt | SOLL 14.11.; IST: keine Trennung (B02 §1.7) |
| Wissen | ein technischer Cognee-Benutzer und eigene Datensätze je Mandant (`t-<mandant_id>--wissen/verlauf/ablauf`); gemeinsames Agenturwissen nur ohne Personenbezug; kein gemeinsamer Index über private Kundendaten | PL-8 + ANNAHME B04 §3.4 |
| Agenten | Sub-Agent nie mehr Rechte als Auftraggeber; Werkzeugrechte nie aus Inhalten; Serverprüfung in jedem Werkzeug | ANNAHME B04 §4.2, §6 |
| Betreiberzugriff | nur über eigene Endpunkte, mit Grund und Audit | ANNAHME B03 §2.2 |
| Nachweis | Negativtest mit mindestens drei Mandanten in der Prüfkette („A liest und schreibt B nicht") | Regel aus `config/mandanten.json` |
| Löschen | Sperren und Kennzeichnen statt Löschen; endgültig nur auf Inhaberanweisung | SOLL (Inhabergrenze) |

**Wo Schlüssel liegen (Quelle B03 §2.3)**

| Geheimnis | Ablage | Regel |
|---|---|---|
| BYO-Schlüssel des Kunden | Tresor; in der Datenbank nur Verweis `vaultref:…` (Muster `apps/selfservice/domain.py:73–77`) | einmal annehmen, nie wieder ausgeben; kein Klartext in Protokoll, URL, Antwort, Trace, Sicherung; Widerruf sofort; kein Rückfall auf NeXify-Kontingent. LÜCKE: kein Tresor angebunden, Wahl offen |
| Router-Schlüssel | Umgebungsvariable des Dienstes, nur Server | Ausgabenlimit am Schlüssel; eine Variablenfamilie statt zwei (`ROUTER_*` und `NINEROUTER_*`, B03 §1.7) |
| Zahlungsanbieter, Webhook-Geheimnisse | Umgebungsvariable bzw. Tresor | Test und Live getrennt; Wechsel nur durch den Inhaber |
| MCP-/Composio-Zugang | Plattformschlüssel beim Dienst; Kundenverbindungen beim Anbieter, adressiert über Kennung je Mandant | Zuordnung serverseitig |
| Sitzungstoken, API-Schlüssel der Kunden | nur als Hash | IST bereits so (`accounts_api.py:36`, `nexify_api.py:342`) |
| Cognee-Zugang | Geheimnisspeicher | IST-Gegenbeispiel: `tools/cognee.mjs:16–26` liest ein Passwort per `docker inspect` – nicht übernehmen (B04 §2.3) |

**IST-Abweichungen vom Bild:** Konten und Shop in einer MongoDB mit einem Cookie `tk_session` für alles (B02 §1.7) · Portal-API auf Vercel nicht geladen und nicht geroutet (B03 §1.6) · drei Mandantenansätze nebeneinander (B03 §1.11) · Agentenkern existiert nur als TypeScript-Gerüst, standardmäßig aus (B04 §1.1) · Wissensdienste liegen auf VPS ohne Mandantenfeld, LightRAG laut Notion ohne Anmeldung (B04 §2.3, §6) · der Router führt das Modell als `openrouter/deepseek-v4.1-flash` und lehnt die Policy-Kennung ab (`apps/web/lib/chat-llm.ts:20–23`; laut Codekommentar vom Inhaber am 13.11. freigegeben) – die Zuordnung muss an einer Stelle festgeschrieben werden.

### 2.5 Designsystem als gemeinsame Klammer

| Baustein | Festlegung | Marke |
|---|---|---|
| Grundfassung | dunkle CI-Fassung ist Standard, helle nur per Schalter | PL-6 |
| Material | Liquid Glass; edle Metalle, gezieltes Glas, mehr Raum, zurückhaltendes Lime | PL-6; SOLL `DECISIONS.md` USER-LUXURY-20261101 |
| Chat | Glasfront; voller Name neben der Figur | PL-6; SOLL „Immer der volle Name" |
| Startseite | Struktur abgenommen; Hero liefert die vorgegebene Videoaufnahme, darunter drei Glasbilder | PL-6; SOLL `AGENTS.md` (04.11.) |
| Figuren | Pascal unverfremdet, NeX als Tukan, ORACLE glatt mit Hut/Monokel | SOLL `AGENTS.md` |
| Werte | Designwerte nur aus `config/design-tokens.json`; Token-System in Arbeit | SOLL `AGENTS.md:239`; PL-6 |
| Geltung | dieselben Tokens und Komponenten für NeXify-Seiten, Chat, Dashboard, Portal **und** TEILEKLAR (eigene Markenfarbe/Wortmarke zulässig) – Daten und Sitzungen bleiben getrennt | SOLL 14.11. (gemeinsame Komponenten erlaubt, B02 §1.7) |
| Prüfung | `node tools/ds-audit-cli.js`; Sichtprüfung 390 px und 1440 px; Tastaturbedienung, 48-px-Ziele; vier Sprachen | IST Werkzeug vorhanden (B03 §6, P4) |
| LÜCKE | Länge des vollen Namens (50 Zeichen) ist in Chat-Kopf und Metatiteln nicht vorgesehen (B01 §1.3) → Layout muss darauf ausgelegt werden oder Kürzungsregel (EV-04) | LÜCKE |

---

## 3. IST gegen SOLL je Bereich

„Wer entscheidet": **I** = Inhaber · **PL** = Projektleitung (umkehrbar) · **FB** = Fachberatung (Anwalt/Steuer) im Auftrag des Inhabers · **T** = technisch, ohne Entscheidung baubar.

### 3.1 Marke und Marketing

| Baustein | IST | SOLL | Lücke | Abhängigkeit | Wer |
|---|---|---|---|---|---|
| Bindender Name | 0 Treffer im Repo; sieben Schreibweisen (B01 §1.1–1.2) | voller Name überall | überall neu setzen; Kürzungsregel fehlt | EV-04, EV-19 | I |
| Namens-/Schreibregel, Glossar | verteilt auf CI-Schema, Charakterbibel, DECISIONS | eine verbindliche Datei, vier Sprachen | fehlt | – | T (W1-02) |
| Startseite | drei konkurrierende Fassungen; NL/FR/EN alt (B01 §2.2) | eine Fassung, vier Sprachen (PL-3) | Übertragung NL/FR/EN; Claim fehlt sichtbar | Welle 0a → 0d | PL |
| Anrede | Seiten/Chat Sie, Filme/Charakterbibel Du (B01 §3.6) | durchgehend Sie (PL-2) | Filmtexte umschreiben | – | PL |
| Produkt-/TEILEKLAR-Seiten | überwiegend Vorbehalt und Jargon (B01 §2.2–2.3) | „Das bekommen Sie / So starten Sie" | je Produkt verbindliche Liste, was heute nutzbar ist | EV-06, EV-11 | I + T |
| Preise | kein freigegebener Preis sichtbar (B01 §2.2) | Abo-Preismodell (Auftrag 14.11.) | Freigabe | EV-11 | I |
| Belege | keine Referenzen, Zahlen, Kundenstimmen; Altzahlen unbelegt (B01 §3.5, §5 Nr. 15) | „durchdacht, premium" | Botschaft auf Vorgehen, Person, Umfang stützen; Belege nur mit Nachweis | EV-18 | I |
| Rechtsseiten NeXify | Datenschutz, Vertragsgrundlagen, Cookies ohne Inhalt; KI-Hinweise überholt (B01 §2.2) | veröffentlichbar | Texte | EV-05, EV-07 | I + FB |
| Kanäle Social/E-Mail | keine Texte, kein Redaktionsplan, zwei Absenderadressen (B01 §3.8) | Marketing-Gesamtkonzept | Profiltexte, Serien, Signatur | PL-1 (Kontakt), EV-05 | I |
| Messung | Analyse standardmäßig aus, keine Ausgangswerte (B01 §3.8) | – | Messplan | Einwilligung/Datenschutz | I |

### 3.2 TEILEKLAR, Werkstatt, Partner

| Baustein | IST | SOLL | Lücke | Abhängigkeit | Wer |
|---|---|---|---|---|---|
| Shop-API live | 503 `runtime_binding_unavailable`; feste Projekt-ID in `vercel_app.py:23` passt vermutlich nicht zum Produktionsprojekt (ANNAHME B02 §1.2) | erreichbar | Bindung konfigurierbar; Zugänge | EV-06 | T + I |
| Altstand `teileklar.shop` | öffentlich, indexierbar, Stand 14.10., mit „0 €"/„19,90 €" (B02 §1.6) | keine nicht freigegebenen Konditionen öffentlich | sperren/umleiten | EV-01 | I |
| „Kostenfrei" | nur Prototypen, dort mit Erfolgsgebühr; kein Fakt in `config/fakten.json` (B02 §3) | Werkstatt erkennt Kostenfreiheit sofort | Definition, Fakt, Konditionsfassung, Rechtstext | EV-13, EV-07 | I + FB |
| Direktpartner | Begriff existiert nicht (B02 §4.1) | Direktpartner-Logik | Definition, Statusmodell, Rolle, Bindung | EV-13 | I, Technik T |
| Partnerseite „Standard-Landingpage" | nur Prototyp; zwei Bedeutungen in den Quellen (B02 §2.1) | Landingpages für Werkstätten | Vorlage, Profil, Freigabe, Veröffentlichung | W1-12/13 | T, Inhalte I |
| Werkstattanfrage | wird gespeichert, erreicht den Betrieb nicht; Kunde liest das Gegenteil (B02 R-3) | wahre Aussage, Bearbeitung | interne Benachrichtigung, Admin-Liste, Text | – | T (W1-09); Grundsatz I |
| Verzeichnisbetriebe | 579 Einträge mit Kontaktdaten, „anfragbar", Sperrliste fehlt im Code (B02 R-4) | DSGVO-konform | Sperrliste, Zweckbindung | EV-07 | I + FB |
| Mandantengrenze | eine Adresse, ein Cookie, eine DB, eine Anfragetabelle (B02 §1.7) | sichere Trennung (DSGVO) | Sitzung, Daten, Vorgänge, Absender | W1-06, W1-11; Domain EV-06 | T + I |
| Betreiber/Verkäufer | `fakten.json`: Eenmanszaak, KvK 90483944; Rechtstexte: „TEILEKLAR …, mail@teileklar.shop"; site-map: „not_verified_for_BV" | eindeutig | Festlegung | EV-05 | I |
| Shop-Recht | ein Ablauf für B2C/B2B, ein Steuersatz für fünf Länder, AGB nennen Schweiz (B02 R-5 bis R-7) | verkaufsfähig | Rechts- und Steuerprüfung | EV-07 | FB |
| Katalog/Lieferant | leer; BigBuy „401 Invalid Token" (D-008) | Onlineshop | Zugang | EV-06 | I |

### 3.3 Suite

| Baustein | IST | SOLL | Lücke | Abhängigkeit | Wer |
|---|---|---|---|---|---|
| Registrierung | Code vollständig; ohne E-Mail-Bestätigung (B03 §1.1) | „normale Registrierung" | Bestätigung (0b), Firmenangaben, Zustimmungsnachweis | EV-07 (Texte) | T |
| Abo/Preismodell | drei widersprüchliche Entwürfe; Beträge hart im Code (Verstoß gegen D-002) (B03 §1.3) | Abo-Preismodell | Freigabe; Beträge aus dem Code nehmen | EV-11 | I; Bereinigung T (W1-05) |
| Bezahlung | nur Revolut-Einmalzahlung im Shop (B03 §1.4) | Bezahlung im Ablauf | Anbieter, Adapter, Checkout | EV-12 | I |
| Freischaltung | kein Weg „bezahlt → berechtigt"; Domänenmodell lokal getestet, nicht angeschlossen (B03 §1.5) | Freischaltung nach Zahlung | Berechtigungstabelle aus Zahlungsereignis | Welle 0b | T |
| Dashboard | Oberfläche und API da; auf Vercel nicht eingebunden; Reiter Abo/LLM/Verbindungen/Chat fehlen (B03 §1.6) | Dashboard | Anschluss, Reiter im Markendesign | W1-05, W1-08 | T |
| Kunden-Chat | öffentlicher Chat ohne Konto-/Mandantenbezug; Portal-Chat nicht geladen, Verlauf ohne Besitzprüfung abrufbar (B03 §1.7) | Chat nach Login | mandantengebundener Chat mit Verbrauchszählung | 0b (Besitzprüfung), W1-07 | T |
| Composio-MCP | nur Konfigurationseinträge; US-Anbieter, AVV/SCC „false", E-B offen (B03 §1.8) | Zugriff auf Composio-MCP-Anbindungen | Konto, Nutzungsrecht, AVV, Vermittler | EV-17 | I + FB; Vermittler T (W1-23) |
| Eigenes LLM | Policy sauber, 0 Adapter, kein Tresor (B03 §1.9) | eigenes LLM anbinden | Tresor, Adapter, Oberfläche | 0b (Gerüst), Tresor-Wahl | T + I |
| NeXify AI Intelligence | ein Modell über einen Router; keine Kette, kein Fine-Tuning (B03 §1.10) | „feinabgestimmte, kosteneffiziente Kette (DeepSeek, Jeff AI, stützende Modelle)" | Definition; weitere Modelle bräuchten Policy-Erweiterung | EV-14 | I |
| Mandantentrennung | drei Modelle, keines deckt die Suite in Produktion (B03 §1.11) | strikt | ein Modell mit DB-Durchsetzung | Welle 0b; Produktionsdatenbank | T + I |
| Rechnungen | manuell, HTML; kein Reverse-Charge, kein Archiv (B03 §1.12) | Belege je Zeitraum | Modell, PDF, Archiv | EV-05, Steuer (E4) | FB + T |
| Kündigung/Support | nur Statusvermerk; Tickets am nicht verbundenen Portal (B03 §1.13–1.14) | geschlossene Lösung | Wirkungstermin, Export, Sperre statt Löschung | EV-11 | I + T |

### 3.4 Agentenkern und Wissen

| Baustein | IST | SOLL | Lücke | Abhängigkeit | Wer |
|---|---|---|---|---|---|
| Python-Agenten-Lösung | im Repo nicht auffindbar; drei Kandidaten außerhalb, keiner einsehbar (B04 §1.3) | Vollmigration der Python-Agenten | Quellort, Stand, Ablöseliste | EV-16 | I |
| Laufzeit | TypeScript-Gerüst, ein lesendes Werkzeug, max. 2 Schritte, aus (B04 §1.1) | Agenten auf Skill-Basis mit Sub-Agenten | Laufzeitkern, Grenzen, Freigabepunkte | – | T (W1-17/18) |
| NeX Agentic / AIFly ORACLE | Namen und Zielbilder; ORACLE-Koordination läuft außerhalb in ChatGPT, unbelegt (B04 §1.2) | Agentic Core aus beiden | Rollenfestlegung im Code | EV-14, EV-16 | I + T |
| Skills | 5 eigene Skills hash-gebunden; 44 Small-Business-Skills (Apache-2.0) eingebunden, nie ausgeführt, mit DeepSeek nicht erprobt; Quelle eine Fassung weiter (B04 §4.1, §5.1) | Anthropic Small-Business-Skills | Eignungstest je Skill (Budget), Aktualisierung | EV-15 (bestätigen), Budget | I; Hash-Vergleich T |
| Zentrales Wissen | AgentMemory (VPS, 13 Skripte, kein Mandant), LightRAG, alter Cognee-Container „prüfen" (B04 §2) | Cognee statt Agent Memory; NeX speichert zentral, auch aus Chats | Adapter, Probebetrieb, Migration ohne Verlust | EV-02 (Host), Zugang | PL-8 + I |
| Chats im Wissen | Chatdaten ohne Mandant, ohne Löschfrist, Datenschutzseite nicht angepasst (B04 §2.4) | Chats zentral speichern | Rechtsgrundlage, Einwilligung, Fristen, Löschkette | EV-09, EV-07 | I + FB |
| Suite-Agenten „über das Brain" | Brain = Entwürfe; „kein gemeinsamer privater Kundenindex" (B04 §2.2) | Suite-Agenten über das Brain verbunden | gleiche Schnittstelle, getrennte Daten | W1-16 bis W1-18 | T |
| Task-Erzeugung | AgentMemory führt laut Notion auch Actions/Leases; Regel „kein zweites Register" | Task-Erzeugung (optional) | Entwurf im führenden Register, Freigabe | EV-16 | I + T |
| Geldgrenzen | überall `null` (B04 §4.2) | kosteneffizient | Beträge je Lauf, Mandant, Tag | EV-16 | I |
| Betriebsort | Vercel für Dauerläufe ungeeignet; VPS belastet, einer läuft aus (B04 §4.4) | – | dauerhafter Host | EV-02 | I |
| Claude-Aufgaben | „Regelkreis" lief mit Kosten ohne Wirkung; Tagesbericht ohne Repository-Zugriff (B04 §1.2) | – | pausiert (PL-9); Neufassung offen | Welle 3 | PL/I |

---

## 4. Widersprüche und Risiken, die gelöst werden müssen

| Nr. | Thema | Befund (Quelle) | Risiko | Lösungsweg | Entscheidung |
|---|---|---|---|---|---|
| R-01 | **Rechtsform** Eenmanszaak ↔ B.V. | `config/fakten.json`: Eenmanszaak, KvK 90483944. „NeXify AI FACTORY B.V." in Überschriften, Metadaten, strukturierten Daten, `apps/cloud`-Impressum. `site-map.json:24`: `not_verified_for_BV`. `AGENTS.md` (13.11.): Impressum ohne bestätigte Anbieterangaben (B01 §5 Nr. 1) | falsche Anbieterkennzeichnung; blockiert Impressum, Rechnung, Verträge, Indexierung, TEILEKLAR-Verkäufer | bis zum Nachweis nur den belegten Rechtsträger führen; „B.V." aus sichtbaren Stellen | EV-05 |
| R-02 | **Preise** | kein Preis sichtbar; Abo-Entwürfe widersprechen sich; Beträge hart im Code (`nexify_api.py:28`) entgegen D-002; „5 EUR Testguthaben" auf `/registrieren` ohne belegte Freigabe (B01 §2.2, B03 §1.3) | Preisangabe ohne Freigabe; verkaufsunfähig | Beträge aus dem Code (W1-05); ein Modell festlegen; nur `config/fakten.json`/`config/api-prepaid.json` als Quelle | EV-11 |
| R-03 | **„Kostenfrei"** | Auftrag 14.11. deutlicher als jede Quelle; Prototypen: kostenfrei + Erfolgsgebühr; Masterplan §12.5: historisch, nicht bindend; Prototypen widersprechen sich untereinander (B02 §3.3) | Werbeaussage ohne Vertrag dahinter | Definition → Fakt → Konditionsfassung → Seite | EV-13 |
| R-04 | **Jeff / JavAI / Jev** | Jeff = internes Entscheidungs-Orakel (`typesafe/jev-1.13`, „Kein Chat"); „JavAI" ungebunden (`OM-JAVAI`); Auftrag nennt „Jeff AI" als Kettenbaustein und ORACLE-Basis (B03 §0, B04 §5.4) | zweiter Policy-Widerspruch; falsche Produktaussage | Identität klären; bis dahin Jeff nur internes Gate | EV-14 |
| R-05 | **Anthropic ↔ DeepSeek-Policy** | Policy gilt ausdrücklich für `internal_agent_orchestration` und `managed_customer_suite`; `claude_ai_target: false` (`config/llm-policy.json`); Auftrag: „Anthropic-Orchestrierung" (B04 §5.2) | Policy-Bruch, neue Kosten, Datenfluss an Anthropic | Arbeitsvariante A (PL-7); Skills je Stück mit Policy-Modell erproben | EV-15 |
| R-06 | **Mandantentrennung NeXify ↔ TEILEKLAR** | ein Cookie `tk_session` öffnet Kundenkonto, Partnerportal und `/intern/*`-Hüllen; gemeinsame Sammlung `requests`; ein Absender (B02 §1.7) | Verstoß gegen Inhabergrenze und `AGENTS.md:174` | W1-06, W1-11; eigene Domain/Projekt nach EV-06 | I (Domain), sonst T |
| R-07 | **Altstand `teileklar.shop`** | öffentlich, `index, follow`, Stand 14.10., Partnerkonditionen im Klartext (B02 §1.6, R-1) | Bindungswirkung, Irreführung, zwei Auftritte einer Marke | sperren oder auf neutrale Seite leiten; Altdateien sichern | EV-01 – **sofort** |
| R-08 | **Klartext-Zugangsdaten** | zwei Mem-Notizen (03/2026) deuten laut Titel/Vorschau auf Zugangsdaten im Klartext (B03, Nebenbefund); offengelegte Slack-Webhook-Adresse (Mem 09.11., B04 §6); Alt-Skripte lesen Schlüssel aus Container-Umgebung bzw. `/opt/ai-stack/stack/.env` | Verstoß gegen „Secrets nie im Klartext"; Missbrauch | Inhaber prüft Gültigkeit, dreht Zugänge, Ablage im Tresor; Notizen nicht geöffnet | EV-03 – **sofort** |
| R-09 | **Auslaufender Server** | Mem 09.11.: großer Server nicht verlängert; unklar, ob AgentMemory, LightRAG oder Cognee dort liegen; Lesezugang am 01.11. abgelehnt (B04 §1.4) | Datenverlust des Altbestands | Inventar (nur lesen) → Sicherung mit Wiederherstellungsprobe, vor Ablauf | EV-02 – **sofort** |
| R-10 | **KI-Kennzeichnung** | D-010 (13.11.): sichtbare Kennzeichnung im öffentlichen Chat entfernt, Risiko Art. 50 KI-VO benannt und vom Inhaber getragen; `AGENTS.md:198` und `config/llm-verbindungen.json` verlangen sie weiter; voller Name mit „AI Intelligence" ändert die Erkennbarkeit (B01 §5 Nr. 5) | ungelöster Regelwiderspruch; je neuem Kanal erneut | einmal abschließend je Kanal festlegen, Regelwerk nachziehen, rechtlich prüfen | EV-08 |
| R-11 | **Falsche Sachaussagen zum Chat** | „ohne Live-KI-Modell" auf `/ki-hinweise` und `/produkte/aifly-oracle`; „an OpenAI übermittelt" im Assistenten-Text (B01 §2.3) | irreführende Empfängerangabe; fehlende Datenschutzinformation | PL-4, PL-5 (Welle 0a/0d); Datenschutztext | EV-07, EV-09 |
| R-12 | **Fehlende Rechtstexte** | NeXify: Datenschutz, AGB, Cookies, AVV, zulässige Nutzung fehlen; TEILEKLAR: nur AGB/Widerruf als Prototyp-Übernahme, nennt Schweiz; Partnervereinbarung/AVV fehlen; E12 (Anwalt) offen (B01 §5, B02 R-7, B03 §4) | kein Livebetrieb zulässig | Beauftragung; technisch nur Platzhalter und Fassungsprotokoll | EV-07 |
| R-13 | **Unbelegte Werbeaussagen** | „meisterhaft feinabgestimmt", „extrem kosteneffizient", „überragende Ergebnisse", „absolute Flexibilität", „geschlossen": im Repo kein Beleg; eigene Regeln L1/L2 verlangen datierte Vergleiche (B03 §5); Superlativ „Höchste Qualität …" in `home-concept-copy.json:85` | Irreführung (§ 5 UWG wird im Repo selbst genannt) | nur Tatsächliches beschreiben; Messaufbau (W1-21) | EV-18 |
| R-14 | **Werkstattanfrage ins Leere** | B02 R-3 | Irreführung; personenbezogene Daten ohne Bearbeitung | W1-09 | T; Grundsatz EV-13 |
| R-15 | **Chatdaten** | keine Mandantenspalte, keine Löschfrist, Schreiben per Dienstrolle (B04 §2.4) | DSGVO (Speicherbegrenzung, Auskunft, Löschung) | W1-19 (Entwurf), Einspielen nach EV-09 | I + FB |
| R-16 | **Modellkennung** | Policy verlangt exakt `…-1017`; Router bedient `openrouter/deepseek-v4.1-flash` (laut Codekommentar am 13.11. vom Inhaber freigegeben); Portal-Chat sendet die abgelehnte Kennung (B03 §1.7, §1.10) | Policy auf der Leitung nicht wörtlich erfüllt; Portal-Chat würde scheitern (ANNAHME) | Zuordnung an einer Stelle festschreiben und in `DECISIONS.md` belegen | I bestätigt, T setzt um |
| R-17 | **Drittland/Datenweg** | Route Kunde → Router → OpenRouter → Modellanbieter; Verarbeitungsort „route_specific_not_inferred"; Composio US ohne AVV/SCC (B03 §3.4) | Übermittlung ohne belegte Grundlage | Route, Speicherort, AVV-Liste belegen | EV-07, EV-17 |
| R-18 | **Ungeschützte Dienste** | `docs/EXPOSITION.md:33`: Docker umging Firewall-Regeln u. a. für LightRAG und Cognee (Stand der Datei, nicht neu gemessen) | Zugriff von außen | messen und schließen – keine Lockerung | Zugang über EV-02 |
| R-19 | **Fremde Abhängigkeit Anmeldung** | Google-Anmeldung über Hosts von `emergentagent.com` (B03 §1.1) | Abhängigkeit für einen zahlenden Dienst | klären oder abschaltbar machen | I |
| R-20 | **Markenrecht** | „ORACLE" ist auch ein bekannter fremder Unternehmensname; keine Recherche belegt (B01 §5 Nr. 17) | Umbenennung nach Festschreiben | Recherche vor Endform | EV-19 |
| R-21 | **Stände im Netz** | `AGENTS.md` (13.11.): `.de`/`.cloud` zeigen nicht auf Vercel; B02-Abruf 14.11.: `www.nexifyai.de/teileklar/partner-werden` antwortet mit Vercel-Kennung; `.cloud` 404; wer umgestellt hat, ist nicht belegt | widersprüchliche Auftritte | Soll-Adresse festlegen, messen, dokumentieren | EV-06 |
| R-22 | **Live-Zahlung ohne Testmodus** | D-008: Revolut „live" im Preview (B02 R-10) | Betriebsrisiko beim Einschalten der API | vor Einschalten erneut entscheiden | EV-06 |

---

## 5. Umsetzungsplan in Wellen

### 5.0 Schreiber-Spuren – ein Schreiber je Scope (ANNAHME, von der Projektleitung zu bestätigen)

| Spur | Scope (nur dieser Schreiber ändert hier) | Trägt |
|---|---|---|
| **A · Web & Design** | `apps/web/app` (öffentliche Seiten), `apps/web/components` außer `components/shop/*`, `apps/web/lib/chat-*.ts`, `static-orientation.ts`, `packages/agent-runtime/public-orientation.ts`, `config/design-tokens.json`, `packages/tokens`, CSS | Welle 0a, 0c, W1-08 |
| **X · Texte** | `config/site-map.json`, `config/*-copy.json`, `config/page-explainers.json`, `config/home-film-scripts.json`, `config/i18n.json` | Welle 0d; vorher nur Entwürfe außerhalb dieser Dateien (W1-03) |
| **S · Suite-Backend** | `apps/shop-api/shop/accounts_api.py`, `auth.py`, `nexify_api.py`, `apps/shop-api/vercel_app.py`, Root-`vercel.json`, `db/`, `apps/selfservice/`, `apps/web/proxy.ts`, `apps/web/auth/`, `apps/web/components/shop/AuthForms.tsx`, neue Routen `apps/web/app/api/suite/*` | Welle 0b, W1-04 bis W1-07, W1-13, W1-22, W1-23 |
| **T · TEILEKLAR** | `apps/shop-api/shop/workshops_api.py`, `requests_api.py`, `admin_api.py`, neu `partners_api.py` und `mail_templates_teileklar.py`, `apps/web/components/shop/*` (ohne `AuthForms.tsx`), `apps/web/app/teileklar/*`, `config/teileklar-legal.json` | W1-09 bis W1-12, W1-14, W1-15 |
| **K · Agentenkern & Wissen** | neue Python-Pakete (`packages/knowledge/`, Laufzeitpaket), deren `tests/`, `tools/automation/` | W1-16 bis W1-18, W1-20, W1-21 |
| **M · Chat-Daten** | nur neue Dateien unter `apps/web/supabase/migrations/` | W1-19 |
| **R · Regeln** | `DECISIONS.md`, `docs/adr/`, neu `config/brand-names.json`; `config/fakten.json`, `config/llm-policy.json`, `AGENTS.md` nur nach Inhaberfreigabe | W1-01, W1-02 |

Geteilte Dateien: `shop/mail_templates.py` gehört Spur S; Spur T legt eigene Vorlagen in einer neuen Datei an. `components/PortalWorkspace.tsx` gehört Spur A; S und T liefern Anforderungen. `config/site-map.json` ändert nur Spur X. Der Marken-Filter in `nexify_api.py` (für W1-11) wird von Spur S zugearbeitet.

### 5.1 Welle 0 – läuft (PL-10)

| ID | Strang | Branch / Spur | Inhalt | Status |
|---|---|---|---|---|
| W0-a | Technische Bereinigung Chat/Startseite | `claude/atelier-fehlerbehebung` · A | Chat-Ladeweg, Startseite; Jargon aus Chat-Zuständen (PL-4); Korrektur des OpenAI-Hinweises (PL-5) | läuft; HEAD am 14.11. `161d27b` |
| W0-b | Suite-Fundament hinter Schaltern | `claude/epic-hopper-7d3duf` · S | Besitzprüfung, Mandantenmodell mit RLS, anbieterneutraler Abrechnungs-/Freischaltungskern gegen Attrappe, E-Mail-Bestätigung, BYO-Sicherheitsgerüst (entspricht B03 P2, P3-Teil, P5-Teil, P7, P10-Teil) | läuft |
| W0-c | Zweiter Design-Veredelungsdurchgang, Token-System | A | nach W0-a | folgt |
| W0-d | Textumsetzung | X | nach W0-c; Basis PL-1 bis PL-5 und Vorlage aus W1-03 | folgt |
| W0-e | Nachtlauf „Regelkreis" pausiert | außerhalb des Repos | PL-9 | pausiert; Nachweis offen |

### 5.2 Welle 1 – sofort baubar ohne Inhaberentscheidung

Regeln für alle Pakete: hinter Schalter (Vorgabe aus), keine Beträge, keine Zugangsdaten, keine Aktivierung in Produktion, kein neuer Anbieter, nichts löschen. Herkunft in Klammern (Paketnummern der Berichte); Dubletten sind zusammengeführt.

| ID | Ziel | Bereich / Dateien | Schreiber-Scope | Test | Rückweg |
|---|---|---|---|---|---|
| **W1-01** Entscheidungen nachtragen | PL-1 bis PL-9 als umkehrbare Einträge festhalten; D-010-Namensklausel als überholt markieren; neue Architekturentscheidung „Cognee als zentraler Speicher" (ersetzt die Vorschläge ADR-0004/0006) im Status „vorgeschlagen" (B04 §8 Nr. 12) | `DECISIONS.md`, `docs/adr/` | R | Lesen durch Projektleitung; jede Zeile mit Herkunft und Rückweg | Revert |
| **W1-02** Namensregel, Glossar, Prüfer | eine verbindliche Namens- und Schreibregel mit Glossar DE/NL/FR/EN (Arbeitsfassung, Endform markiert); Prüfskript, das Abweichungen nur meldet (B01 §4.2 Nr. 1, 19; B03 P1) | neu `config/brand-names.json`, neu Prüfskript unter `tools/` | R (nur neue Dateien) | Skript listet jede abweichende Schreibweise mit Datei:Zeile; ändert nichts | Dateien entfernen |
| **W1-03** Textvorlage in vier Sprachen | Startseite auf Basis PL-3 nach NL/FR/EN; Kurzbeschreibungen je Leistung/Produkt in drei Längen; Chat-Texte (Begrüßung, Zustände, Fehler, Rückfall, Übergabe) jargonfrei mit vollem Namen; ein Wortlaut je Handlungsaufruf (heute 57 Varianten); TEILEKLAR-Seiten positiv formuliert; Filmtexte in Sie-Form – ohne Preis, Rechtsform, Verfügbarkeit, Referenz (B01 §4.3, §4.4) | nur neue Dateien unter `docs/texte/` | X-Entwurf (keine Änderung an `config/*.json`; Einbau in W0-d) | jede Zahl hat einen Fakt in `config/fakten.json` oder fehlt; Sie-Form; Liste verbotener Jargonwörter leer; vier Sprachen vollständig | Entwürfe verwerfen |
| **W1-04** Shop-API: Bindung und Variablenliste | Projektbindung konfigurierbar statt fester ID; Liste der fehlenden Laufzeitvariablen (nur Namen) (B02 W-02 Teil, B03 P0 Diagnose) | `apps/shop-api/vercel_app.py`, `apps/shop-api/tests/test_vercel_adapter.py` | S | Adaptertest: passende/abweichende Bindung; ohne Zugänge weiter geschlossen (503) | Commit zurücknehmen |
| **W1-05** Portal-API anschließen und härten – ohne Aktivierung | Module und Pfade aufnehmen; Beträge aus `PLANS` entfernen bzw. aus Konfiguration lesen; eine Variablenfamilie für den Router; Modellname am Router an einer Stelle (B03 P5 Rest, B04 A2 Zuordnung) | `vercel_app.py`, Root-`vercel.json`, `nexify_api.py` | S, nach W0-b und W1-04 | Portal ohne Anmeldung → 401; fremde Sitzungskennung → 404; kein Betrag in irgendeiner Antwort | Rewrites und Modul entfernen |
| **W1-06** Sitzungsgrenze NeXify ↔ TEILEKLAR, Stufe 1 | getrennte Sitzung je Marke; Portal-Hülle nach Marke getrennt (B02 W-09 Teil) | `accounts_api.py` (Cookie), `apps/web/app/[...slug]/page.tsx` (Zuarbeit an A), `apps/web/proxy.ts` | S, nach W0-b | TEILEKLAR-Sitzung öffnet keine NeXify- oder internen Bereiche und umgekehrt; bestehende Anmeldung bleibt nutzbar | Cookie-Einstellung zurück |
| **W1-07** Kunden-Chat der Suite gegen Stellvertreter | Chat hinter Anmeldung und Berechtigung: Bindung an Konto/Mandant, Verbrauchszählung und Limit je Mandant, Ablage mit `mandant_id` (B03 P6) | neue Route `apps/web/app/api/suite/chat/*` (bestehende `chat-*.ts` nur lesen) | S, nach W0-b und W1-05 | ohne Berechtigung 403; Verlauf mandantengetrennt; kein Ersatzmodell bei Fehler | Schalter aus; öffentlicher Chat unberührt |
| **W1-08** Dashboard-Gerüst im Markendesign | Reiter Abo, Verbrauch, LLM-Einstellung, Verbindungen, Chat mit ehrlichen Leerzuständen; vier Sprachen; Tastatur, 48-px-Ziele (B03 P4) | `apps/web/components/PortalWorkspace.tsx` + CSS | A, nach W0-c | `node tools/ds-audit-cli.js`; 390/1440 px; kein Betrag im HTML | Schalter aus |
| **W1-09** Werkstattanfrage ehrlich machen | interne Benachrichtigung, Admin-Liste, wahrer Bestätigungstext (B02 W-03) | `workshops_api.py`, `admin_api.py`, `components/shop/WorkshopDetail.tsx`, neu `mail_templates_teileklar.py` | T | Anfrage erzeugt internen Mail-Auftrag und erscheint in der Admin-Liste; Text nennt keinen nicht vorhandenen Schritt | Commit zurücknehmen |
| **W1-10** Partner-Landingpage ohne Kostenaussage | Nutzen, Ablauf in vier Schritten, FAQ, Felder Leistungen/Ort/Einzugsgebiet; Kostenzeile erscheint nur, wenn ein Fakt in `config/fakten.json` existiert (B02 W-04) | `components/shop/PartnerJourney.tsx`, `ContactRequestForm.tsx`, `requests_api.py`; Seitentext über Spur X | T, nach W1-09 | ohne Fakt keine Kostenzeile, mit Fakt genau der Faktentext; Formularprüfung | Commit zurücknehmen |
| **W1-11** Anfragen nach Marke trennen | Pflichtfeld Marke/Mandant, eigene Vorgangsnummer und Mail-Marke für TEILEKLAR, Filter in der Pipeline (B02 W-05) | `requests_api.py`, `mail_templates_teileklar.py`; Filter in `nexify_api.py` durch S | T, nach W1-10 | Partneranfrage erscheint nicht in der NeXify-Ansicht und umgekehrt | Feld ignorieren; Daten bleiben |
| **W1-12** Partnerantrag, Statusmodell, Annahmeprotokoll | Zustände `submitted → in_review → approved/abgelehnt`, Abgleich mit Verzeichnis-ID, Prüfprotokoll; Technik für versionierte Konditionsfassung und Annahme (Fassung, Zeit, Person) ohne Text (B02 W-06, W-07 Technik) | neu `shop/partners_api.py`, `shop/db.py` (Indizes), `admin_api.py`, `components/shop/AdminShop.tsx` | T, nach W1-11 | erlaubte/verbotene Zustandswechsel, Doppelantrag, fremder Betrieb; Annahme nur der gültigen Fassung | Sammlung ungenutzt; Commit zurück |
| **W1-13** Partnerrolle und Betriebsbindung | Rolle `partner`, Nutzer gehört zu genau einem Betrieb, Zugriff nur auf eigene Daten (B02 W-08) | `accounts_api.py`, `auth.py`, `apps/web/proxy.ts`, `apps/web/auth/policy.ts` | S, nach W1-06 und W1-12 | Partner A liest B nicht; Kunde ohne Partnerzugriff; abgelaufene Sitzung | Rolle entziehen; Commit zurück |
| **W1-14** Standard-Partnerseite: Vorlage und Zustände | Seite je Partner aus dem Profil, Vorschau, Freigabe durch den Partner, Veröffentlichung getrennt; Kennzeichen nur bei `published` (B02 W-10) | `components/shop/WorkshopDetail.tsx`, `workshops_api.py`, neue Profilfelder | T, nach W1-12/W1-13 | Nichtpartner ohne Kennzeichen; zurückgezogenes Profil verschwindet; Vorschau nur für den Partner | Status zurück; Commit zurück |
| **W1-15** Partnerportal Stufe 1 und Kauf ↔ Einbauanfrage | Partner sieht eigene Anfragen, nimmt an/lehnt ab; Anfrage trägt Bestellung, Teil, Fahrzeug (B02 W-11, W-12) | `workshops_api.py`, `components/shop/OrderConfirmation.tsx`; Portalansicht über A | T, nach W1-13/W1-14 | Zustellstatus getrennt von Speicherung; keine Doppelmail; nur eigene Bestellung verknüpfbar | Ansicht ausblenden; Feld optional |
| **W1-16** Wissensport | Python-Paket mit `merken/abrufen/vergessen/exportieren/zustand`, Arbeitsspeicher-Implementierung, Vertragstests (B04 W3) | neu `packages/knowledge/` + Tests | K | Mandant Pflicht; A sieht B nicht; Idempotenz; Rücklesen mit Inhaltsvergleich | Paket entfernen |
| **W1-17** Agenten-Laufzeitkern ohne Modell | Skill-Register mit Hash-Prüfung, stufenweises Laden, Laufzustand, Journal, Schritt- und Zeitgrenze, Idempotenz; Freigabepunkte A/B/C, Fehlerliste, Geldgrenze als Mechanik ohne Beträge (B04 A1, A3) | neues Python-Paket + Tests | K, nach W1-16 | Hash-Abweichung sperrt; Grenze stoppt; Wiederholung liefert gleiches Ergebnis; Lauf hält an C-Aktion | Paket entfernen |
| **W1-18** Policy-Prüfer und Schnittstellenvertrag | Prüfung der fertigen Modellanfrage gegen `config/llm-policy.json` in Python; HTTP-Vertrag `/agent/runs …` mit Tests, Mandant nur aus Sitzung (B04 A2 Prüfer, A4 Vertrag) | Laufzeitpaket + Tests | K, nach W1-17 | Attrappe: falsches Modell, fehlende Denkstufe, Zusatzkopf → Abbruch; fremde Lauf-ID → 404 | Paket entfernen |
| **W1-19** Chat-Daten: Migrationsentwurf | Mandantenspalte, Einwilligungsstand, Löschlauf mit Protokoll, Export je Person – als Entwurf, nicht eingespielt (B04 W6) | neue Datei unter `apps/web/supabase/migrations/` | M; Mandanten-ID-Format aus W0-b | Migration gegen Testdatenbank; Löschlauf mit Protokoll | Datei entfernen; Altdaten unberührt |
| **W1-20** Skill-Bestand prüfen | Hash-Vergleich Small-Business 1.35.1 ↔ 1.35.2 als Bericht (keine Pin-Änderung); Abgleich der eigenen Skill-Köpfe mit dem offenen Standard (B04 A5 Sofort-Teil, §4.1) | `tools/automation/` (nur Bericht), `docs/automation/` | K | Bericht nennt geänderte Dateien; Register unverändert | – |
| **W1-21** Messaufbau für Werbeaussagen | Aufgabensatz, Bewertungsregeln, Auswerteskript, Vorlage Preisvergleich – ohne bezahlte Aufrufe (B03 P15 Sofort-Teil) | `config/fragensatz.json` (Vorschlag als neue Datei daneben), neues Auswerteskript | K | Trockenlauf mit Attrappe liefert datierte, reproduzierbare Tabelle | Dateien entfernen |
| **W1-22** Beleg- und Rechnungsmodell als Entwurf | Datenmodell, Nummernkreis-Logik, PDF mit Kennzeichnung „Entwurf", Storno als Gegenbeleg (B03 P9 Sofort-Teil) | neue Tabellen neben dem Abrechnungskern, `apps/web/lib/invoice.ts` (Zuarbeit) | S, nach W0-b | Summen in Cent; fortlaufende Nummern bei Wiederholung; Storno löscht nichts | Entwürfe verwerfen |
| **W1-23** MCP-Vermittler gegen Attrappe | Vermittler-Schnittstelle, Freigabeliste je Mandant, Bestätigung vor schreibenden Aktionen, Aufrufprotokoll – ohne Composio-Konto (B03 P12 Sofort-Teil) | neuer Baustein im Suite-Backend | S, nach W1-07 | Mandant A kann Verbindung von B nicht nutzen; nicht freigegebenes Werkzeug abgelehnt; Zeitüberschreitung ohne automatische Wiederholung | Schalter aus |

### 5.3 Welle 2 – nach Entscheidung

| Auslöser | Danach baubar | Quelle |
|---|---|---|
| EV-01 Altstand `teileklar.shop` | Sperre/Umleitung des Altstands (außerhalb des Repos) | B02 W-01 |
| EV-02 Server, Zugang, Host | Inventar der Altsysteme (nur lesen) → Sicherung mit Wiederherstellungsprobe → Cognee-Probebetrieb getrennt vom alten Container → `CogneeAdapter` → Schattenbetrieb → Umstellung der 13 Aufrufstellen → Altbestand schreibgeschützt archivieren; Betrieb des Python-Kerns | B04 W1, W2, W4, W5, W8, W9, L1, A4 Betrieb, B1 |
| EV-04 Name, EV-20 Produktnamen | Umbenennung in allen sichtbaren Texten und im Code; Layout Chat-Kopf/Metatitel | B01 §4.1 A1, B03 P1 |
| EV-05 Rechtsträger, EV-07 Rechtstexte | Impressum, Datenschutz, AGB/AVV, Cookies, KI-Hinweise; TEILEKLAR-Rechtstexte, Betreiberangaben, Steuersatz je Land; Indexierung einschalten; Zustimmungsnachweis mit echter Fassung | B03 P14, B02 W-15 |
| EV-06 Zugänge, Adresse | Shop-API live; Registrierung/Anmeldung in Produktion; Portal aktivieren; eigene Adresse für TEILEKLAR (Sitzungsgrenze Stufe 2) | B03 P0, B02 W-02, W-09 Rest |
| EV-08 KI-Kennzeichnung, EV-09 Chat-Speicherung | Einspielen der Chat-Migration; Aufnahme von Chats ins Wissen nur mit Einwilligung, zuerst Mandant „eigene Agentur" | B04 W6 Rest, W7 |
| EV-10 Kundenkreis, EV-11 Abo/Preise, EV-12 Zahlungsanbieter | Tarifseite, Anbieter-Adapter und Checkout, echte Rechnungen, Kündigung/Sperre/Export | B03 P8, P9 Rest, P13 |
| EV-13 kostenfrei/Direktpartner | Fakt in `config/fakten.json`, Kostenzeile und FAQ, Konditionsfassung mit Text, Prüfkriterien; Termin und – falls gewollt – Abrechnung; Stadtseiten nach bestätigten Partnern | B02 W-07 Text, W-13, W-14 |
| EV-14 NeXify AI Intelligence/Jeff | Auswahl „NeXify"/„eigenes LLM" je Mandant im Produkt; Beschreibung der Leistung; gegebenenfalls Policy-Erweiterung je Anwendungsfall | B03 P11 |
| EV-15 Anthropic-Variante, Budget | Eignungstest der 44 Skills mit dem Policy-Modell; Sub-Agenten-Probe (Koordinator + zwei Fachagenten); Aufgabenvorschläge im führenden Register; erster Suite-Agent im Probebetrieb | B04 A5, A6, A7, A8 |
| Tresor-Wahl (Teil von EV-16/EV-02) | BYO vollständig: Tresor-Adapter, Schlüsselannahme, Anbieter-Adapter | B03 P10 Rest |
| EV-17 Composio | Anbindung je Mandant über den Vermittler | B03 P12 Rest |
| EV-18 Messbudget | bezahlte Messläufe, datierter Preisvergleich; erst danach Leistungsaussagen | B03 P15 Rest |

### 5.4 Welle 3 – Betrieb

| Baustein | Inhalt | Quelle / Marke |
|---|---|---|
| Monitoring | Fehler und Antwortzeiten (Sentry ist eingebunden); fachlich: Registrierungen, Checkouts, unverarbeitete Abrechnungsereignisse (Ziel 0), Abweichungen im Abgleichlauf; Sicherheit: Zugriffe über Mandantengrenzen (müssen 0 sein); KI: Aufrufe und Kosten je Mandant und Tag aus gemessenem Verbrauch | ANNAHME B03 §2.7; Alarmwege und Empfänger legt der Inhaber fest |
| Backup/Restore | Sicherung über die Sicherungsschnittstellen der Dienste (nicht laufende Dateien kopieren), Wiederherstellungsprobe an zweitem Ort mit Hash-Vergleich; Cognee ist abgeleitet und neu aufbaubar | B04 §3.7 |
| Kostenkontrolle | Ausgabenlimit am Router-Schlüssel; Schritt-, Zeit- und Geldgrenze je Lauf und je Mandant/Tag; Kostenbremse beim Einlesen in Cognee; Claude-Aufgaben nur mit begrenztem Auftrag | B04 §4.2; Beträge = Inhaberentscheidung |
| Tagesbericht | ein Bericht mit echtem Inhalt (Stand je Paket, Messwerte, Kosten des Vortags, offene Entscheidungen) statt des Nachtlaufs ohne Wirkung; Wiedereinschalten des „Regelkreis" erst mit begrenztem Auftrag und Repository-Zugriff | PL-9; B04 §1.2 |
| Betriebsanleitung | Störungstabelle, Wiederanlauf, Erweiterung `GO-LIVE.md` | B03 P14 |

### 5.5 Abhängigkeitsgraph

- W0-a → W0-c → W0-d · W1-03 → W0-d · W1-02 → W0-d
- W0-c → W1-08
- W0-b → W1-05 → W1-07 → W1-23 · W0-b → W1-06 → W1-13 · W0-b → W1-22 · W0-b → W1-19 (ID-Format)
- W1-04 → W1-05 → [EV-06] → Shop-API und Portal live
- W1-09 → W1-10 → W1-11 → W1-12 → W1-13 → W1-14 → W1-15
- W1-16 → W1-17 → W1-18 → [EV-02 Host] → Betrieb der Laufzeit → [EV-15, Budget] → Skill-Eignung → Sub-Agenten → erster Suite-Agent
- [EV-02] → Inventar → Sicherung → Cognee-Probebetrieb → `CogneeAdapter` (braucht W1-16) → Schattenbetrieb → Umstellung → Archiv
- W1-19 → [EV-09, EV-07] → Einspielen → Chats ins Wissen
- [EV-05] → Impressum → Indexierung · [EV-05] + [EV-07] → jeder Vertragsschluss
- [EV-10] → [EV-11] → [EV-12] → Checkout → Rechnungen → Kündigung
- [EV-13] → Fakt → Kostenzeile (W1-10 ist vorbereitet) → Konditionsfassung (W1-12 ist vorbereitet)
- [EV-04] + [EV-19] → endgültige Umbenennung

---

## 6. Entscheidungsvorlagen für den Inhaber (priorisiert)

Form je Vorlage: **Frage · Warum jetzt · Optionen mit Folgen · Empfehlung · Blockiert bis dahin.** Keine Vorlage enthält neue Preise.

### Sofort

**EV-01 · Altstand auf `teileklar.shop`**
- Frage: Was geschieht mit dem öffentlich erreichbaren Prototyp-Stand vom 14.10.2026?
- Warum jetzt: Dort stehen nicht freigegebene Partnerkonditionen im Klartext, indexierbar (B02 §1.6).
- Optionen: (a) auf neutrale Hinweisseite umleiten und Indexierung sperren – reversibel, Domain bleibt aktiv; (b) nur `noindex` – Texte bleiben lesbar; (c) abschalten – Domain zeigt ins Leere.
- Empfehlung: (a). Begründung: beendet die Aussage sofort, ist in Minuten rückholbar; die Altdateien werden gesichert, nicht gelöscht.
- Blockiert: nichts technisch – aber jede Kostenaussage an Werkstätten bleibt angreifbar, solange der Altstand steht.

**EV-02 · Auslaufender Server, Sicherung des Altbestands, Host für Cognee und Agentenkern**
- Frage: Welcher Server läuft wann aus, liegen dort AgentMemory, LightRAG oder Cognee – und wo sollen Cognee und der Python-Kern dauerhaft laufen?
- Warum jetzt: Datenverlustrisiko (B04 §1.4); ohne Host kein Cognee-Probebetrieb und kein Agentenbetrieb.
- Optionen Host: (a) vorhandener VPS – keine neuen Kosten, aber Kapazität unbelegt und Last gemeldet (`AGENTS.md`); (b) Container-Dienst mit EU-Region – neuer Vertrag, neue laufende Kosten, neuer Datenverarbeiter; (c) Cognee Cloud – nach heutigem Stand nicht policy-konform, Datenstandort nicht dokumentiert (B04 §3.2).
- Empfehlung: zuerst Lesezugang für Inventar und Sicherung mit Wiederherstellungsprobe freigeben; Host erst nach Kapazitätsprüfung entscheiden (`tools/capacity_planner.py`), bevorzugt (a), sofern die Prüfung trägt. Selbstbetrieb ist gesetzt (PL-8). Begründung: einzige Variante ohne neue Verträge; Entscheidung auf Messung statt Vermutung.
- Blockiert: Inventar, Sicherung, Cognee-Probebetrieb, Schattenbetrieb, Umstellung, Betrieb des Agentenkerns.

**EV-03 · Zugangsdaten in alten Notizen**
- Frage: Sind die in zwei Mem-Notizen (03/2026) vermuteten Zugangsdaten und die offengelegte Slack-Webhook-Adresse noch gültig?
- Warum jetzt: Inhabergrenze „Secrets nie im Klartext" (B03 Nebenbefund, B04 §6).
- Optionen: (a) prüfen, drehen, Notizen bereinigen, Ablage im Tresor; (b) belassen – Risiko bleibt.
- Empfehlung: (a). Nur der Inhaber kann das; die Notizen wurden nicht geöffnet.
- Blockiert: nichts – Sicherheitsrisiko bis zur Erledigung.

### Diese Woche

**EV-04 · Endform des Namens und Kürzungsregel**
- Frage: Gilt „AIFly ORACLE with NeXify AI Intelligence by NeXify" als Endform – und darf an längenbegrenzten Stellen gekürzt werden?
- Warum jetzt: Der Name steht an keiner Stelle; jede Textarbeit setzt ihn neu (B01 §1.1). 50 Zeichen passen heute nicht in Chat-Kopf und Metatitel.
- Optionen: (a) überall ausnahmslos der volle Name – Layout wird darauf ausgelegt, Metatitel werden in Suchergebnissen abgeschnitten; (b) voller Name überall im sichtbaren Text, eine einzige festgelegte Zweitform nur für Metatitel, Schaltflächen, Alt-Texte; (c) voller Name bei Erstnennung je Seite, danach Zweitform.
- Empfehlung: Endform bestätigen; Regel (b). Begründung: erfüllt „Immer der volle Name" überall, wo Menschen lesen, und vermeidet abgeschnittene Titel. Bis zur Entscheidung gilt (a), wo es technisch passt.
- Blockiert: endgültige Umbenennung, Chat-Kopf-Layout, Metadaten, Glossar-Freigabe.

**EV-05 · Rechtsträger und Anbieterangaben**
- Frage: Wer ist Anbieter und Vertragspartner – die Eenmanszaak (KvK 90483944) oder eine B.V.? Gilt das auch für TEILEKLAR?
- Warum jetzt: Widerspruch in sichtbaren Stellen; `AGENTS.md` führt das Impressum als unbestätigt (R-01).
- Optionen: (a) Eenmanszaak bleibt Rechtsträger, „NeXify AI FACTORY" ist Anzeigename ohne Rechtsformzusatz; (b) B.V. besteht oder wird gegründet – dann Registernachweis, neue Pflichtangaben, Vertrags- und Steuerfolgen; (c) getrennter Rechtsträger für TEILEKLAR.
- Empfehlung: bis zum Registernachweis (a) und „B.V." aus allen sichtbaren Stellen nehmen. Begründung: einzige belegte Angabe steht in `config/fakten.json`; `site-map.json` selbst sagt `not_verified_for_BV`. Kontaktadresse einheitlich `mail@nexifyai.cloud` (PL-1).
- Blockiert: Impressum, Indexierung, Angebote, Rechnungen, AGB/AVV, TEILEKLAR-Verkäuferangabe, Partnervereinbarung.

**EV-06 · Produktionsfundament: Zugänge, Adresse, Zahlungsmodus, Prüfkette**
- Frage: Welche Adresse ist Produktion für NeXify und für TEILEKLAR; werden die Laufzeit-Zugänge der Shop-/Konten-API gesetzt; läuft die Zahlung zuerst im Testmodus?
- Warum jetzt: Live antwortet die API mit 503; ohne sie gibt es keinen einzigen Kundenweg (B02 §0, B03 §1.15). Die Stände im Netz widersprechen sich (R-21).
- Optionen: (a) Zugänge im Vercel-Projekt setzen, eine Adresse je Marke festlegen (`teileklar.shop` für den neuen Stand), Zahlung zunächst Testmodus; (b) wie (a), Zahlung sofort live (D-008 bisher); (c) Fundament ruht, nur Agenturseiten.
- Empfehlung: (a). Begründung: Trennung der Marken verlangt eigene Adresse; Testmodus senkt das Betriebsrisiko beim ersten Einschalten (B02 R-10). Zugänge setzt nur der Inhaber; Werte erscheinen nie im Chat oder im Repository.
- Blockiert: Shop, Werkstattsuche, Partnerformular, Registrierung, Anmeldung, Portal – also alles Verkaufende.

**EV-07 · Rechtstexte, Anwalt, Steuerberatung**
- Frage: Wird die anwaltliche und steuerliche Prüfung jetzt beauftragt (im Repo als Pflicht vor Livebetrieb geführt, E12, E4)?
- Warum jetzt: Datenschutz, AGB, AVV, Cookies, Partnervereinbarung, Shop-Texte und Steuerbehandlung fehlen oder sind Prototyp-Übernahmen (R-12).
- Optionen: (a) Gesamtauftrag (NeXify, Suite, TEILEKLAR, Partner) in einem Zug; (b) gestaffelt: zuerst Impressum/Datenschutz/KI-Hinweise für die Agenturseiten, dann Suite, dann TEILEKLAR; (c) später – Livebetrieb bleibt gesperrt.
- Empfehlung: (b). Begründung: die Agenturseiten werden am schnellsten veröffentlichbar; die übrigen Texte hängen an EV-10, EV-11, EV-13. Kosten und Auswahl der Kanzlei sind Inhabersache.
- Blockiert: Veröffentlichung, Indexierung, Zustimmungsnachweis mit echter Fassung, jeder Vertragsschluss.

**EV-08 · KI-Kennzeichnung und Datenweg-Hinweis im Chat**
- Frage: Bleibt es je Kanal (öffentlicher Chat, Kunden-Chat der Suite, weitere Agenten) bei der Entscheidung vom 13.11., und wird das Regelwerk angepasst?
- Warum jetzt: D-010 und `AGENTS.md:198` widersprechen sich; der volle Name enthält nun „AI Intelligence"; der Datenweg-Hinweis wird ohnehin korrigiert (PL-5).
- Optionen: (a) Name als Kennzeichnung plus Seite `/ki-hinweise`, Regelwerk entsprechend ändern; (b) ein knapper sichtbarer Hinweis im Chat-Kopf; (c) je Kanal unterschiedlich.
- Empfehlung: Entscheidung nach rechtlicher Prüfung in EV-07; bis dahin im Kunden-Chat der Suite (b) vorsehen, weil dort Vertragskunden arbeiten und der Hinweis nichts kostet. Der öffentliche Chat bleibt wie am 13.11. entschieden.
- Blockiert: Kunden-Chat-Oberfläche (Text), Abgleich `AGENTS.md`.

### Vor dem Verkauf

**EV-09 · Speicherung von Chats im zentralen Wissen**
- Frage: Auf welcher Rechtsgrundlage, mit welchem Einwilligungstext und welchen Löschfristen dürfen Chat-Inhalte dauerhaft gespeichert werden?
- Warum jetzt: Auftrag „NeX speichert alle Informationen zentral (auch aus den Chats)"; heute ohne Mandant, Frist und Datenschutztext (B04 §2.4, §3.5).
- Optionen: (a) nur mit ausdrücklicher Einwilligung je Gespräch, zuerst nur Mandant „eigene Agentur"; (b) Speicherung für die Dauer des Gesprächs, keine Übernahme ins Langzeitwissen; (c) andere Grundlage je Zweck nach Rechtsprüfung. Mandantenübergreifende Auswertung im Zweifel gar nicht.
- Empfehlung: (a) als Ziel, bis zur Rechtsprüfung (b). Begründung: Supabase bleibt Quelle der Wahrheit, Cognee abgeleitet; Widerruf löst die Löschkette aus. Fristen je Datenklasse legt der Inhaber fest.
- Blockiert: Einspielen der Chat-Migration, Aufnahme ins Wissen.

**EV-10 · Kundenkreis der Suite**
- Frage: Nur Unternehmen oder auch Verbraucher (Edition „Privat")?
- Warum jetzt: bestimmt Rechtstexte, Checkout, Preisangaben (B03 §3.2 Nr. 9).
- Optionen: (a) nur Unternehmen, Abfrage und Beleg bei der Registrierung; (b) auch Verbraucher – dann Widerruf, Button-Lösung, Kündigungsbutton, Endpreise.
- Empfehlung: Start mit (a), „Privat" später. Begründung: gesamte Ansprache und Abrechnung sind auf Unternehmen ausgelegt (B01 §3.3); weniger Rechtstexte für den ersten Verkauf.
- Blockiert: AGB, Checkout, Preisseite.

**EV-11 · Abo-Stufen, Preise und was öffentlich stehen darf**
- Frage: Welche Stufen mit welchem Inhalt und Preis gelten; ist die KI-Nutzung enthalten oder getrennt; bleibt der 24-Stunden-Test; welche Agenturpreise dürfen sichtbar sein?
- Warum jetzt: drei widersprüchliche Entwürfe; „Preise & Ablauf" ohne Preis (R-02).
- Optionen: (a) einen der drei Entwürfe bestätigen; (b) neues Modell; (c) vorerst ohne Selbstbedienungs-Abo, Abschluss per Angebot.
- Empfehlung: ein Modell schriftlich festlegen und die anderen ausdrücklich aufheben; KI-Verbrauch getrennt ausweisen, wie die bestehende Suite-Vorgabe es vorsieht. Zu Beträgen keine Empfehlung – sie legt nur der Inhaber fest. Bis dahin zeigt keine Oberfläche einen Betrag.
- Blockiert: Tarifseite, Checkout, Rechnungen, Kündigungsregeln, jede Preisbotschaft.

**EV-12 · Zahlungsanbieter für Abos**
- Frage: Welcher Anbieter, welche Zahlarten, wer eröffnet das Konto, bleibt NeXify Rechnungssteller?
- Warum jetzt: Für Abos existiert kein Zahlungscode (B03 §1.4).
- Optionen (Eigenschaften sind ANNAHME aus B03 §3.1, vor Entscheidung mit datierten Anbieterseiten zu belegen): Revolut (vorhanden, Abo-Logik Eigenbau) · Mollie · Stripe Billing · Wiederverkäufer-Modell (Paddle o. Ä., dann ist NeXify nicht Rechnungssteller) · GoCardless · manuelle Rechnung als Übergang.
- Empfehlung: keine Anbieterwahl ohne datierten Vergleich; der Abrechnungskern wird anbieterneutral gebaut (W0-b), sodass die Wahl nichts verbaut. Als Übergang ist die manuelle Rechnung möglich, ohne neues Konto.
- Blockiert: Checkout, wiederkehrender Einzug.

**EV-13 · „Kostenfrei", Direktpartner, Freischaltung**
- Frage: Was genau ist für Werkstätten kostenfrei (welcher Leistungsumfang, vollständig oder nur Einstieg, mit oder ohne Erfolgsgebühr, wer zahlt dann); was ist ein Direktpartner; nach welchen Kriterien wird freigeschaltet und von wem; dürfen Kunden Nichtpartner anfragen?
- Warum jetzt: Auftrag verlangt sofortige Erkennbarkeit; keine Quelle trägt die Aussage (B02 §3, §4).
- Optionen Direktpartner: (A) Werkstatt mit bestätigter Vereinbarung, im Unterschied zum Verzeichnisbetrieb; (B) direkt gewonnener Partner im Unterschied zu einem über Dritte zugeführten; (C) Werkstatt, die zugleich Agenturkunde wird.
- Empfehlung: Lesart (A), (B) als Zusatzfeld „Herkunft". „Kostenfrei" erst nach Eintrag als Fakt in `config/fakten.json` und in einer Konditionsfassung sichtbar machen – die Seite ist dafür vorbereitet (W1-10). Anfragen an Nichtpartner bis zur Entscheidung intern prüfen statt direkt zustellen.
- Blockiert: Kostenaussage, FAQ, Partnervereinbarung, Abrechnung, Stadtseiten, Partnerzahlen.

**EV-14 · NeXify AI Intelligence, „Jeff AI", Kette**
- Frage: Was bezeichnet „NeXify AI Intelligence" in einem Satz; was ist „Jeff AI" (Anbieter, Modell) im Verhältnis zu Jev/JavAI; soll es neben dem Policy-Modell weitere Modelle geben?
- Warum jetzt: Der Begriff steht im bindenden Namen; heute ist es ein einzelnes Modell über den Router (B03 §1.10).
- Optionen: (a) NeXify AI Intelligence = Name der verwalteten KI-Leistung (Router, Policy-Modell, Leitplanken, Wissen); Jeff bleibt internes Prüf-Gate; (b) echte Kette mit weiteren Modellen – braucht Policy-Erweiterung je Anwendungsfall (wie D-009), Datenweg- und Kostennachweis.
- Empfehlung: (a) jetzt; (b) nur als ausdrückliche spätere Erweiterung. Begründung: entspricht dem Ist-Zustand, hält die Policy unverändert und verspricht nichts, was nicht existiert.
- Blockiert: Produkttext, Auswahl im Dashboard, AVV-Liste der Unterauftragsverarbeiter.

**EV-15 · Anthropic-Variante**
- Frage: Bestätigen Sie Arbeitsvariante A?
- Warum jetzt: Auftrag nennt „Anthropic-Orchestrierung"; Policy schließt Claude im Produkt aus (R-05).
- Optionen (B04 §5.3): A Skills als Format, Modell DeepSeek · B wie A, Claude nur intern für den Aufbau · C Claude im Produkt – Policy-Änderung, Anthropic-Vertrag, API-Kosten, Kundendaten an Anthropic · D Mischbetrieb mit benannten Ausnahmen.
- Empfehlung: A (PL-7), mit Eignungstest je Skill, weil die Skills für Claude geschrieben und mit DeepSeek nicht erprobt sind. Wechsel zu C/D nur mit ausdrücklicher Entscheidung zu Kosten, Vertrag und Datenfluss.
- Blockiert: Skill-Eignungstest (zusätzlich Budget), Sub-Agenten-Probe, erster Suite-Agent.

**EV-16 · Python-Agenten-Lösung: Ort, Umfang der Vollmigration, Aufgabenregister, Geldgrenzen**
- Frage: Wo liegt „unsere Python-Agenten-Lösung" (Server, Pfad, Stand); was wird abgelöst; wohin gehen Aufgaben/Leases aus AgentMemory; welche Geldgrenzen gelten je Lauf, Mandant, Tag?
- Warum jetzt: Im Repository nicht auffindbar; ohne Quellort kein Migrationsplan (B04 §1.3, §4.5).
- Optionen Quelle: VPS-Orchestrator (`cto.py`, `owner.py`) · Hermes · DeepSeek Harness · etwas anderes.
- Empfehlung: Quellort benennen und Lesezugang geben; bis dahin wird der neue Kern unabhängig gebaut (W1-16 bis W1-18), sodass die Migration später eine Übernahme von Skills und Abläufen ist. Aufgaben in das führende Register, kein zweites.
- Blockiert: Ablöseliste, Migration, Stilllegung des Altbestands.

**EV-17 · Composio**
- Frage: Auf wen läuft das Konto, welcher Tarif, dürfen die Anbindungen eigenen zahlenden Kunden bereitgestellt werden, gibt es AVV/SCC?
- Warum jetzt: Auftrag nennt Composio als Teil der Freischaltung; im Repo US-Anbieter, AVV/SCC „false", E-B offen (B03 §3.3).
- Optionen: (a) Composio für Kunden nach geklärtem Nutzungsrecht und AVV; (b) eigener MCP-Server (als Ziel beschrieben, `config/mcp-server.json`); (c) beides.
- Empfehlung: Vermittler anbieterneutral bauen (W1-23); Kundenbetrieb erst nach AVV/SCC und geklärtem Nutzungsrecht; bis dahin keine personenbezogenen Kundendaten über Composio. Tarifabschluss nur durch den Inhaber.
- Blockiert: Verbindungen im Dashboard.

**EV-18 · Werbeaussagen und Messbudget**
- Frage: Sollen Aussagen wie „extrem kosteneffizient", „überragende Ergebnisse", „feinabgestimmt" verwendet werden – und gibt es Budget für die Messung?
- Warum jetzt: kein Beleg im Repo; eigene Regeln verlangen datierte Vergleiche (B03 §5).
- Optionen: (a) bis zum Beleg nur beschreiben, was nachweislich vorhanden ist; (b) Messung beauftragen (bezahlte Modellaufrufe), danach belegte Aussagen; (c) Aussagen ohne Beleg – rechtliches Risiko.
- Empfehlung: (a) sofort, (b) sobald der Kunden-Chat steht. Der Messaufbau wird ohne Kosten vorbereitet (W1-21).
- Blockiert: Leistungs- und Preisvergleichsaussagen.

**EV-19 · Markenrecherche**
- Frage: Wird vor dem Festschreiben des Namens eine Markenrecherche beauftragt?
- Warum jetzt: „ORACLE" ist auch ein bekannter fremder Unternehmensname; keine Recherche belegt (R-20).
- Optionen: (a) Recherche durch Fachberatung vor EV-04-Endform; (b) Name ohne Recherche festschreiben – Umbenennungsrisiko.
- Empfehlung: (a), zusammen mit EV-07 beauftragen.
- Blockiert: endgültige Namensfreigabe (die Arbeitsfassung bleibt bis dahin nutzbar).

**EV-20 · Produktnamen und Sprachen**
- Frage: „NeX Agentic AI" oder „NeX Agentic AIFly"? Ist die „NeX & AIFly ORACLE Suite" dasselbe wie die „NeX2fly Suite"? Was wird aus one/one+ und `/produkte/one`? Ist EN Pflichtsprache? TEILEKLAR-Slogan und Sichtbarkeit des Lieferantennamens?
- Warum jetzt: Jede Textumsetzung braucht eine Antwort (B01 §4.1 Nr. 9, 13, 15).
- Empfehlung: „NeX Agentic AI"; ein Suite-Produkt mit einem Namen; Altpfad `/produkte/one` per Weiterleitung auflösen; EN als vierte Pflichtsprache bestätigen, da vollständig vorhanden; Lieferantenname nicht sichtbar. Begründung: jeweils die Variante mit den wenigsten Namen und ohne neue Zusage.
- Blockiert: Glossar-Freigabe, Produktseiten.

---

## 7. Betrieb und Führung

### 7.1 Auftragsregister (Sicht auf das führende Register)

`AGENTS.md` verbietet eine zweite Aufgabenverwaltung; führend ist `requirements_reconciliation` in `config/acceptance-coverage.json` (P01–P26). Die folgende Tabelle ist eine Sicht für die Geschäftsführung und wird dort nachgeführt (Zuordnung u. a. P12/P13/P14, G21, OF-08 für TEILEKLAR; MASTER-04, MASTER-12, MASTER-17 für Suite). Owner sind Rollen; Personen bzw. Agenten benennt die Projektleitung.

| ID | Ziel | Owner | Scope | Test | Rückweg | Nachweis |
|---|---|---|---|---|---|---|
| W0-a | Chat/Startseite bereinigt | Schreiber Spur A | Branch `claude/atelier-fehlerbehebung` | Projektprüfungen, Sichtprüfung 390/1440 px | Revert | Commit, Bildvergleich, Prüflauf |
| W0-b | Suite-Fundament hinter Schaltern | Schreiber Spur S | Branch `claude/epic-hopper-7d3duf` | Isolationstest mit drei Mandanten; doppelter Webhook → eine Wirkung; Bestätigungslink abgelaufen/benutzt | Schalter aus; Migration nicht angewendet | Testprotokoll |
| W0-c | Design-Veredelung, Tokens | Schreiber Spur A | Tokens, CSS | `tools/ds-audit-cli.js`, Abnahme Inhaber | Revert | Auditbericht, Bildschirmfotos |
| W0-d | Textumsetzung vier Sprachen | Schreiber Spur X | `config/*.json` (Texte) | Namensprüfer (W1-02), Faktenabgleich, Parität | Revert | Prüflauf, Abnahme Inhaber |
| W0-e | „Regelkreis" pausiert | Projektleitung | geplante Aufgabe außerhalb des Repos | kein Lauf im Zeitfenster | wieder einschalten | Ansicht der geplanten Aufgaben |
| W1-01 … W1-23 | siehe 5.2 | je Spur | je Zeile 5.2 | je Zeile 5.2 | je Zeile 5.2 | Commit, Testprotokoll, Eintrag im führenden Register |
| EV-01 … EV-20 | Entscheidung | Inhaber | – | – | Entscheidung änderbar | Eintrag in `DECISIONS.md` mit Datum und Herkunft |

### 7.2 Qualitäts- und Abnahmeregeln

1. **Ein Schreiber je Scope** (5.0). Wer außerhalb seines Scopes etwas braucht, liefert eine Anforderung an den zuständigen Schreiber.
2. **Alles Neue hinter einem Schalter**, Vorgabe aus. Kein Gate wird abgeschaltet, keine Sicherheitsregel gelockert.
3. **Quellen statt Erinnerung:** Preise und Zahlen nur aus `config/fakten.json`/`config/api-prepaid.json`; Designwerte nur aus `config/design-tokens.json`; Modellaufrufe nur gemäß `config/llm-policy.json`.
4. **Mandant ist Pflicht:** kein Datenzugriff, kein Wissensaufruf, kein Agentenlauf ohne serverseitig geprüften Mandanten; Negativtest in der Prüfkette.
5. **Geld- und Außenwirkung idempotent:** Schlüssel je Buchung/Aktion; bei unklarem Ausgang erst abgleichen, nicht blind wiederholen.
6. **Nichts löschen:** sperren, kennzeichnen, archivieren; Rückweg je Paket benannt.
7. **Keine Geheimnisse** in Code, Protokoll, Chat, Ticket oder Wissen; Protokolle ohne Nachrichteninhalte.
8. **Sichtbare Texte:** Sie-Form, voller Name nach Regel, kein Jargon, kein Superlativ ohne Beleg, keine Referenz ohne Nachweis, vier Sprachen.
9. **Vor jeder Meldung** die Projektprüfungen aus `AGENTS.md` ausführen (`python3 tools/project_skills.py verify`, passende Skill-Datei, `tools/context_executor.py`) und den tatsächlichen Zustand messen.
10. **Rechtstexte** sind bis zur Freigabe durch Fachberatung Entwurf und werden nicht als Rechtsberatung ausgegeben.

### 7.3 Was „fertig" heißt

| Stufe | Bedingung |
|---|---|
| **Gebaut** | Code im Scope, Tests grün, Schalter aus, Rückweg geprüft, Eintrag im führenden Register. |
| **Abgenommen (Projektleitung)** | Nachweis liegt vor (Testprotokoll, Bildvergleich, Messwert mit Datum); keine offene Abweichung zu Namen, Fakten, Policy. |
| **Freigegeben (Inhaber)** | zugehörige Entscheidung EV-xx getroffen und in `DECISIONS.md` belegt; Rechtstext, falls nötig, geprüft. |
| **Live** | Schalter an in Produktion durch den Inhaber bzw. mit dessen ausdrücklicher Freigabe; Live-Messung nach dem Einschalten; Überwachung und Rückweg aktiv. |

„Fertig" ohne Zusatz heißt **Live**. Ein Paket, das gebaut, aber nicht eingeschaltet ist, wird als „gebaut" gemeldet – nicht als erledigt.

---

## 8. Offene Punkte, Unbekanntes und was niemand geprüft hat

| Thema | Stand |
|---|---|
| Stand der Berichte | B02–B04 lasen Kopf `a4d927e`; am 14.11. steht `claude/atelier-fehlerbehebung` auf `161d27b`. Befunde zu Chat und Startseite können bereits überholt sein. Arbeitsbaum war während der Analyse in Bewegung. |
| Live-Zustand | Nur lesende Abrufe einzelner Seiten (B02). Nicht geprüft: ob der Chat live mit einem Modell antwortet, Router, Supabase, Inhalt der Datenbanken, Vercel-Variablen, DNS. Ursache des 503 ist eine Annahme. |
| Widerspruch Domain | `AGENTS.md` (13.11.): `.de` zeigt nicht auf Vercel; Abruf 14.11.: `www.nexifyai.de` antwortet mit Vercel-Kennung. Wer umgestellt hat, ist nicht belegt. |
| Wirksamkeit der Pause | Ob der „Regelkreis" tatsächlich pausiert ist, wurde in dieser Zusammenführung nicht gemessen (B04 vermerkt zwei abgelehnte Versuche am 13.11.). Die zweite geplante Aufgabe „Regelbetrieb und Tagesbericht" ist in der Entscheidung nicht genannt. |
| Server und Altdienste | Kein Zugang zu VPS: Ort, Version, Datenmenge und Sicherung von AgentMemory, LightRAG, Cognee-Container, Orchestrator, Hermes, DeepSeek Harness unbekannt. Angaben stammen aus Repo-Dokumenten, Notion (09.10./09.11.) und Mem (07.–09.11.). |
| Python-Agenten-Lösung | Quellort unbekannt. |
| Jeff / JavAI / Jev | Identität unbekannt; keine Zuordnung erfunden. |
| Tests | Keiner der vier Berichte hat `make check`, `make test` oder die Shop-Tests ausgeführt (Auftrag: nur lesen). B01 hat auch die Projektwerkzeuge nicht ausgeführt. |
| Welche Startseiten-Fassung gerendert wird | nicht bis zur Ausgabe nachverfolgt (B01 §7). |
| Sprachqualität NL/FR/EN | nur Vollständigkeit und Stichproben. |
| Nicht vollständig gelesen | `PROGRESS.md`, Masterplan (nur Kopf, §2, §15 und Suche), `config/operating-model.json`, `config/acceptance-coverage.json`, `evidence/`, `reference/`, Prototypen im Volltext, `config/page-explainers.json`, Git-Historie, offene Pull Requests. |
| Anbieter-Tatsachen | Gebühren und Bedingungen der Zahlungsanbieter, Composio-Nutzungsrecht, Datenverarbeitungsorte von Router, OpenRouter, DeepSeek, Anthropic-Handelsbedingungen im Wortlaut: nicht geprüft. Cognee- und Composio-Angaben sind Web-Abrufe vom 14.11. ohne Vertragsprüfung. |
| Cognee technisch | ob die Denkstufe an den Modellendpunkt weitergegeben wird, Ressourcenbedarf, Güte der lokalen Extraktion für Deutsch, strukturierte JSON-Ausgabe des Policy-Modells: ungeprüft. |
| Skills mit DeepSeek | Die 44 Small-Business-Skills wurden nie ausgeführt; Eignung mit dem Policy-Modell unbekannt. |
| Rechtliche Bewertung | keine. Alle Rechtspunkte sind benannt, nicht geprüft; Markenrecht ungeprüft. |
| CRM und Kanäle | ob HubSpot, Linear, Slack, Gmail oder Drive für Vorgänge genutzt werden, wurde nicht durchsucht; welche Social-Profile existieren, ist nicht belegt. |
| Mem/Notion | nur in Auszügen gelesen; ältere Notizen (03/2026) nur über Titel. Zwei Notizen mit mutmaßlichen Zugangsdaten nicht geöffnet. |
| Bestätigte Partner, Kunden, Referenzen | im Repository nicht belegt. Zahlen 579/598/6.875/7.120 sind Verzeichnis- oder Zielwerte, keine Partner. |
| Schreiber-Spuren und Empfehlungen | Abschnitt 5.0 und die Empfehlungen in Abschnitt 6 (außer PL-1 bis PL-10) sind Vorschläge dieser Zusammenführung und noch nicht von der Projektleitung bestätigt. |
