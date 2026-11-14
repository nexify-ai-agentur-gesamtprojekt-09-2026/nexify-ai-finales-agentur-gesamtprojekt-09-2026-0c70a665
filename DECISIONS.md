# DECISIONS — NeXify AI Gesamtlösung

## D-001 — Prototypen sind Referenz, nicht Produktionscode
- **Entscheidung:** `prototypen/*.dc.html` werden nachgebaut, nicht kopiert; das Manifest (`sha256sum -c`) bleibt unverändert.
- **Grund:** Design/Verhalten als Vorlage, aber kein Produktionscode (Auftrag in `AGENTS.md`).

## D-002 — Werte nur aus der Konfiguration
- **Entscheidung:** Designwerte aus `config/design-tokens.json`, Zahlen mit Preisbezug aus `config/fakten.json`/`config/api-prepaid.json`.
- **Grund:** Eine Quelle der Wahrheit; erfundene Zahlen/Preise sind unzulässig.

## D-003 — Mindestaufladung 10 € (Inhabervorgabe 29.09.2026)
- **Entscheidung:** `config/api-prepaid.json` `aufladung.minCent = 1000` ist maßgeblich; die Doku wurde angeglichen, E3 gilt als entschieden.
- **Grund:** Widerspruch zwischen Doku (50 €) und Inhabervorgabe (10 €) wurde durch den Faktenabgleich aufgedeckt.

## D-004 — Faktenabgleich nur mit passendem Layout
- **Entscheidung:** `tools/inhaltsabgleich.js` wird erst wieder in `make check` verdrahtet, wenn das erwartete Layout (api/, lib/, Prototypen im Root) hergestellt oder das Tool entfernt ist.
- **Grund:** Ein Prüfwerkzeug, das im Repo nicht laufen kann, darf keinen grünen Schein erzeugen; fehlende Quellen werden als Befund ausgegeben statt zu crashen.

## D-005 — Shop-API als eigener FastAPI-Dienst (`apps/shop-api`)
- **Entscheidung:** Katalog, Warenkorb, Checkout, Werkstätten, Admin und Konten laufen in `apps/shop-api` (FastAPI, async, OpenAPI unter `/api/openapi.json`); `backend/server.py` und `frontend/` sind nur dünne Supervisor-Hüllen, die echte Oberfläche bleibt `apps/web`.
- **Grund:** Der bestehende stdlib-Gateway (`apps/agent-gateway`) ist bewusst auf lokale Origins beschränkt; ein separater Dienst hält diese Grenze intakt und liefert Validierung/OpenAPI.

## D-006 — MongoDB als Shop-Speicher
- **Entscheidung:** Produkte, Preise, Warenkörbe, Bestellungen, Zahlungsereignisse, Werkstätten, Nutzer und Sitzungen liegen in MongoDB (`MONGO_URL`/`DB_NAME` aus der Umgebung). Preise/Summen werden ausschließlich serverseitig berechnet.
- **Grund:** Vorgegebene Laufzeitumgebung; Clientpreise werden ignoriert.

## D-007 — Clerk ersetzt durch eigene Konten + Emergent Google Auth
- **Entscheidung:** Eigene Konten (bcrypt, serverseitige Sitzung im httpOnly-/Secure-Cookie `tk_session`, Registrierung, Login, Logout, Reset per Resend, Sperre nach 5 Fehlversuchen in 15 Minuten, Fehlertext „E-Mail oder Passwort ist falsch“) plus „Mit Google anmelden“ über Emergent-managed Google Auth, per E-Mail mit demselben Nutzer verknüpft. Rollen (`customer`, `admin`) stehen im eigenen Nutzerdatensatz; Gast-Warenkorb wird beim Login zusammengeführt. `@clerk/*` ist aus `apps/web` und `apps/site` entfernt; `LocaleAwareClerk.tsx` und `auth/public-provider.ts` bleiben nur als SDK-freie Hüllen für bestehende Inventare. `PREVIEW_TEST_AUTH` entfällt.
- **Grund:** Inhabervorgabe 31.10.2026; Clerk-Secret war nicht verfügbar, Clerk-Schlüssel dürfen nicht mehr erforderlich sein.
- **Folge:** Gespeicherte Browser-Nachweise, die an Clerk-/UI-Quellhashes gebunden sind, sind absichtlich ungültig (fail-closed) und müssen neu erzeugt werden.

## D-008 — Revolut live im Preview, BigBuy-Import blockiert
- **Entscheidung:** `REVOLUT_MODE=live` (Inhabervorgabe; kein Sandbox-Schlüssel). Webhook-Signatur und Idempotenz werden mit Test-Signaturmaterial und gemocktem Status-Readback getestet; es gibt keine Fake-Zahlung. Umschalten: `REVOLUT_MODE=sandbox` + `REVOLUT_MERCHANT_SECRET_KEY_SANDBOX`.
- **Grund/Blocker:** BigBuy-Produktion antwortet trotz freigegebener IP `34.170.12.145` mit `401 Invalid Token`; Sandbox-Host aus dem Pod nicht erreichbar. Der Katalog bleibt leer, bis ein gültiger Schlüssel vorliegt; der Import ist fertig verdrahtet (Admin → Import).

## D-009 — Produktaufbereitung (F-22, Umsetzung Phase 2): eigener Anwendungsfall `product_enrichment`
- **Entscheidung (Nutzeranweisung 31.10.2026):** Produkttexte werden über den eigenen Router (`9router`, `ROUTER_URL`/`ROUTER_KEY`, OpenAI-kompatibel) mit `ds/deepseek-v4-pro` bei `reasoning_effort: high` aufbereitet. Das ersetzt für diesen Anwendungsfall die allgemeine Vorgabe `deepseek/deepseek-v4.1-flash-1017`, die für alle übrigen Bereiche unverändert gilt. Es gibt keinen stillen Fallback: Ist das Modell nicht verfügbar, schlägt der Lauf mit Fehler fehl. Festgehalten in `config/llm-policy.json#use_cases.product_enrichment` und `config/llm-verbindungen.json#anwendungsfaelle.product_enrichment` und geprüft durch `tools/check_llm_policy.py`.
- **Bilder:** Keine generative Bearbeitung, weil Produkt und Lieferumfang unverändert bleiben müssen. Die Aufbereitung ist deterministisch (Pillow: Format, Weißraum, Schärfe, WebP; wo nötig lokale Freistellung). Das Original bleibt erhalten, und die aufbereitete Version wird mit Herkunft im Objektspeicher abgelegt, nicht als Base64 in Mongo.


## USER-LUXURY-20261101 · Material- und Medienrichtung

Pascal verlangt eine weniger militaristische, luxuriöse Gestaltung mit edlen Metallen und gezieltem Glas. Gemeinsame visuelle Schicht für Vite und Next, mehr Raum, zurückhaltendes Lime, Kontohinweis im Inhaltsraster und optionales Assistenzdock. Drei fachlich zugeordnete Editorial-Stills ersetzen keinen Katalog-/Funktionalitätsbeleg. Home veröffentlicht keine ungeprüften Review-/Ambientperformances mehr; Originaldateien bleiben erhalten. Reale Lippen-/Gestenfilme benötigen echte passende Quellen und separate Abnahme. REA6.8.0 lokal isoliert wiederhergestellt und MCP-discovered, Analyse jedoch an Host-Prozessprüfung blockiert; keine globale Registrierung/HTTP-Exposition oder Rechteänderung. Kein Gesamtfreigabeentscheid.

## D-010 — Öffentlicher Chat: KI-geführt, sichtbare KI-Kennzeichnung im Chat entfernt (13.11.2026)

- **Nachtrag 14.11.2026 – in einem Punkt überholt:** Der Satz „Die Namen ‚AIFly ORACLE‘ und
  ‚NeX Agentic AI‘ bleiben“ ist durch D-011 überholt. Alle übrigen Aussagen dieses Eintrags gelten
  unverändert; der Eintrag wird nicht gelöscht.
- **Entscheidung (Inhaber Pascal Courbois, 13.11.2026):** Der öffentliche Chat wird KI-geführt statt
  modellfrei betrieben. Sichtbare KI-Kennzeichnungen werden aus der Chat-Oberfläche entfernt
  (Entscheidung „A und B“). Die Namen „AIFly ORACLE“ und „NeX Agentic AI“ bleiben.
- **Herkunft des Belegs:** Die Entscheidung wurde dieser Arbeitssitzung über die koordinierende Sitzung
  übermittelt. In diesem Repository liegt kein weiterer Beleg vor. Der Merge des zugehörigen Pull Requests
  durch den Inhaber gilt als Bestätigung; bis dahin ist die Entfernung nicht wirksam.
- **Benanntes Risiko (keine Rechtsberatung):** Art. 50 Abs. 1 der EU-KI-Verordnung (VO (EU) 2024/1689,
  anwendbar seit 02.08.2026) verlangt, dass Personen, die direkt mit einem KI-System interagieren, darüber
  informiert werden, sofern das nicht aus den Umständen offensichtlich ist. Ohne sichtbare Kennzeichnung im
  Chat stützt sich die Erkennbarkeit auf den Produktnamen und die Seite `/ki-hinweise`. Ob das genügt, ist
  rechtlich nicht geprüft. Der Inhaber hat die Entscheidung nach ausdrücklichem Hinweis auf dieses Risiko
  getroffen und trägt es.
- **Umfang der Entfernung:** In `apps/web/components/PublicOrientationChat.tsx` entfällt die Zeile
  „NeX Agentic AIFly kann Fehler machen.“ (de/nl/fr/en). An ihrer Stelle steht ein sachlicher Eingabehinweis
  mit Verweis auf die Datenschutzseite. Außerdem sendet `/api/chat` die Modellkennung nicht mehr an den
  Browser (bisher im `start`-Ereignis und in der JSON-Antwort); in der Ablage der Nachricht bleibt sie.
  Sonst wurde nichts entfernt.
- **Was bewusst bleibt:** (1) Der Assistent gibt sich nicht als Mensch aus: Die Vorgabe verlangt auf Nachfrage
  eine wahrheitsgemäße Antwort, und eine Aussage, ein Mensch zu sein, wird serverseitig durch die wahre Angabe
  ersetzt (`apps/web/lib/chat-guidance.ts`, Tests in `apps/web/auth/tests/chat-guidance.test.mjs`).
  (2) Datenschutz- und Rechtsseiten einschließlich `/ki-hinweise` sind unverändert. (3) Der Hinweis
  „ohne Live-KI“ erscheint weiter, wenn der Chat ohne Modellanbindung auf die Orientierung anhand der Website
  zurückfällt; er beschreibt dann den tatsächlichen Zustand.
- **Offener Abgleich:** `AGENTS.md` (Abschnitt „Verbindliche Regeln“) und `config/llm-verbindungen.json`
  (`kennzeichnung`) nennen die KI-Kennzeichnung nach Art. 50 weiterhin als Vorgabe. Diese Entscheidung ändert
  sie nicht; der Inhaber entscheidet, ob sie angepasst werden. Außerhalb des Chats (z. B. „KI-Assistent“ in
  `ExplainerSections.tsx`, verborgener Statustext in `Workspace.tsx`) wurde nichts geändert.
- **Folgen für andere Texte:** Mit dem KI-geführten Chat werden Besuchernachrichten an den Router und das
  Modell übermittelt und, falls Supabase eingerichtet ist, gespeichert. Die Aussage „arbeitet derzeit ohne Live-KI-Modell“
  auf `/ki-hinweise` und `/produkte/aifly-oracle` (`config/site-map.json`) trifft dann nicht mehr zu, und
  `/datenschutz` muss die Verarbeitung der Chatnachrichten abdecken. Beides ist vor dem Livegang vom Inhaber
  zu prüfen und anzupassen; diese Seiten wurden hier nicht verändert.
- **Rückweg:** Revert des Commits „chat: sichtbare KI-Kennzeichnung im Chat entfernen“ stellt die Zeile
  wieder her; die übrigen Chat-Pakete sind davon unabhängig.


## Entscheidungen der Projektleitung vom 14.11.2026 (D-011 bis D-018)

Gemeinsame Angaben für D-011 bis D-018:

- **Herkunft:** Entscheidungen der Projektleitung vom 14.11.2026 auf Grundlage des Auftrags und der
  Antworten des Inhabers vom selben Tag. Arbeitsgrundlage: `docs/konzept/2026-11-14/00-gesamtkonzept.md`,
  Abschnitt 2.0 (PL-1 bis PL-9). In diesem Repository liegt kein weiterer Beleg vor.
- **Status jeder Entscheidung:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Umkehrbarkeit:** Jede Entscheidung ist umkehrbar und vom Inhaber jederzeit änderbar. Sie hebt kein
  Sicherheits-, Preis-, Zahlungs-, Vertrags-, Datenschutz- oder Releasegate auf.
- **Wirkung dieses Nachtrags:** Er hält die Entscheidungen fest. Er ändert weder `AGENTS.md` noch
  `config/fakten.json`, `config/llm-policy.json`, sichtbare Texte oder Code.

## D-011 — Namen: voller Name des KI-Systems, Firma, Claim, Produktnamen (14.11.2026)

- **Entscheidung:** Es gelten diese Schreibweisen.
  - Figur und KI-System: „AIFly ORACLE with NeXify AI Intelligence by NeXify“. Immer der volle Name;
    es gibt keine Kurzform.
  - Unternehmen: „NeXify AI FACTORY“, ohne Rechtsformzusatz.
  - Claim: „Chat it. Automate it.“
  - Agent: „NeX Agentic“.
  - Suite: „NeX & AIFly ORACLE Suite“.
  - Eigene KI-Kette als Produktbegriff: „NeXify AI Intelligence“.
  - Shop-Marke: „TEILEKLAR“, eigenständig, in Versalien.
  - Kontakt: `mail@nexifyai.cloud`.
  - Nicht verwendet werden: „Oracle AIFly by NeXify“, „ORACEL“, „Orakel“ sowie die übrigen alten
    Schreibweisen aus `config/brand-names.json`.
- **Grund:** Antworten des Inhabers vom 14.11.2026: „im richtigen Englisch“ und „Immer der volle Name“.
  Im Repository standen mindestens sieben Schreibweisen für dasselbe System und zwei Anbieternamen
  nebeneinander (`docs/konzept/2026-11-14/01-marke-marketing.md`, Abschnitt 1.2).
- **Überholt:** die Namensklausel in D-010 („Die Namen ‚AIFly ORACLE‘ und ‚NeX Agentic AI‘ bleiben“).
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen. Die Endform des vollen Namens
  ist eine Entscheidung der Projektleitung vom 14.11.2026, vom Inhaber zu bestätigen.
- **Offen:** (1) Kürzungsregel für Seitentitel, Schaltflächen und Alt-Texte (EV-04) – bis zur
  Entscheidung wird nicht gekürzt. (2) Markenrecherche vor dem Festschreiben (EV-19).
  (3) Bedeutung von „NeXify AI Intelligence“ in einem Satz (EV-14). (4) Verhältnis der
  „NeX & AIFly ORACLE Suite“ zur bisherigen „NeX2fly Suite“ und Verbleib von one/one+ (EV-20).
  (5) Rechtsform des Unternehmens (EV-05) – bis dahin erscheint keine.
- **Umsetzung:** Maschinenlesbare Regel `config/brand-names.json`; `tools/check_brand_names.py` meldet
  Abweichungen mit Datei und Zeile und ändert nichts. Die Umbenennung in sichtbaren Texten und im Code
  ist nicht Teil dieses Eintrags.
- **Rückweg:** Eintrag als überholt kennzeichnen, `config/brand-names.json` anpassen; es wurde kein
  bestehender Text verändert.

## D-012 — Anrede: durchgehend „Sie“ (14.11.2026)

- **Entscheidung:** Alle Kundentexte beider Marken verwenden die förmliche Anrede: Deutsch „Sie“,
  Niederländisch „u“, Französisch „vous“; Englisch neutral und professionell. Das gilt auch für
  Filmtexte und Figurenstimmen.
- **Grund:** Deckt sich mit `config/site-map.json` („formal_Sie_u_vous“, Nutzerweisung 26.10.2026).
  Filmtexte (`config/home-film-scripts.json`) und Charakterbibel duzen noch; ein Besucher, den der Film
  duzt und der Chat siezt, erlebt einen Bruch.
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Umsetzung:** Filmtexte in Sie-Form liegen als Vorlage unter `docs/texte/2026-11-14/`. Die
  bestehenden Konfigurationsdateien sind unverändert.
- **Rückweg:** Eintrag als überholt kennzeichnen; die bisherigen Du-Fassungen bleiben in der Historie.

## D-013 — Startseite: eine Basisfassung für alle vier Sprachen (14.11.2026)

- **Entscheidung:** Basis der Startseite ist die ausgelieferte Fassung „Ein Gespräch. Ein Projekt, das
  passt.“ mit der Unterzeile „Websites, Apps, Shops und KI – aus dem, was Ihr Unternehmen wirklich
  braucht.“ Sie gilt für Deutsch, Niederländisch, Französisch und Englisch. Kernaussage des Inhabers:
  Luxus und höchste Qualität zum fairen Preis, persönlich begleitet von Pascal.
- **Grund:** Für die Startseite lagen drei konkurrierende Fassungen vor (`config/site-map.json`,
  `config/public-interface-copy.json`, `config/home-concept-copy.json`); NL/FR/EN trugen bei
  Zusammenfassung und Metadaten noch eine ältere.
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Offen:** Die Formulierung „höchste Qualität“ ist ein Superlativ ohne Beleg im Repository
  (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, R-13). Sie ist als Anspruch des Inhabers festgehalten,
  nicht als geprüfte Vergleichsaussage; die Verwendung in geschriebenen Texten entscheidet der Inhaber (EV-18).
- **Rückweg:** Eintrag als überholt kennzeichnen; die beiden anderen Fassungen sind nicht gelöscht.

## D-014 — Kein interner Jargon in Kundentexten (14.11.2026)

- **Entscheidung:** Interne Arbeitsbegriffe erscheinen nicht in Kundentexten. Dazu zählen „ohne
  Live-KI“, „Entwicklungsvorschau“, „Zielbild“, „Gate“, „Mandant“, „Freischaltung“, „Betriebsstand“,
  „Tenant“, „Lease“, „Brain“ und der Name des internen Prüfwerkzeugs. Fällt das Gespräch im Chat aus,
  steht dort eine ruhige Aussage mit einer klaren Handlung zum Kontakt.
- **Grund:** Fundstellen in sichtbaren Texten (`docs/konzept/2026-11-14/01-marke-marketing.md`,
  Abschnitt 2.3). Die Begriffe schützen vor Fehlbehauptungen, sagen dem Leser aber nicht, was er bekommt.
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Abgrenzung:** Der sachliche Zustand wird weiter wahr beschrieben. Eine Aussage, die nicht zutrifft,
  wird nicht durch eine gefälligere ersetzt. Der Hinweis zum Datenempfänger im Chat ist rechtlich zu
  prüfen und in den Vorlagen als Platzhalter geführt.
- **Rückweg:** Eintrag als überholt kennzeichnen.

## D-015 — Gestaltung: dunkle Fassung Standard, helle nur per Schalter (14.11.2026)

- **Entscheidung:** Die dunkle Fassung der Gestaltung ist Standard. Die helle Fassung erscheint nur,
  wenn der Besucher sie über den Schalter wählt. Glasflächen und der Chat als Glasfront bleiben; die
  Struktur der Startseite ist vom Inhaber abgenommen, Veredelung und Token-System laufen.
- **Grund:** Schließt an `USER-LUXURY-20261101` an (edle Metalle, gezieltes Glas, zurückhaltendes Lime).
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Grenze:** Farb- und Flächenwerte kommen weiter nur aus `config/design-tokens.json` (D-002). Dieser
  Eintrag setzt keinen Wert und ist keine Abnahme eines Bildschirms.
- **Rückweg:** Voreinstellung des Schalters umkehren; Eintrag als überholt kennzeichnen.

## D-016 — Arbeitsvariante: Anthropic-Skills als Format, Modell bleibt gemäß Policy (14.11.2026)

- **Entscheidung:** Skills werden als Format und Arbeitsweise übernommen. Das Modell im Produkt bleibt
  gemäß `config/llm-policy.json`; es gibt keinen stillen Ersatz. Claude dient beim Aufbau als Werkzeug
  und ist kein Bestandteil des Produkts.
- **Grund:** Der Auftrag nennt eine „Anthropic-Orchestrierung“; die Policy bindet alle verwalteten
  Aufrufe an das dort festgelegte Modell (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, R-05, EV-15).
  Die Arbeitsvariante hält die Policy unverändert und verursacht keinen neuen Vertrag.
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Grenze:** Ein Wechsel zu einem anderen Modell im Produkt braucht eine ausdrückliche Entscheidung
  des Inhabers zu Kosten, Vertrag und Datenfluss. Die Eignung der Skills mit dem Policy-Modell ist
  nicht erprobt und wird je Skill geprüft.
- **Rückweg:** Eintrag als überholt kennzeichnen; `config/llm-policy.json` wurde nicht berührt.

## D-017 — Cognee als zentraler Wissensspeicher im Selbstbetrieb hinter eigenem Adapter (14.11.2026)

- **Entscheidung:** Cognee wird als zentraler Wissensspeicher vorgesehen: im Selbstbetrieb, hinter
  einem eigenen Adapter, mit dem Mandanten als Pflichtfeld. Modellaufrufe laufen nur über den eigenen
  Router; Einbettungen werden lokal gerechnet. Der Altbestand wird gesichert und archiviert, nicht
  gelöscht. Einzelheiten: `docs/adr/0007-cognee-zentraler-wissensspeicher.md`.
- **Grund:** Vorgabe des Inhabers, Wissen zentral zu führen; der Selbstbetrieb ist die einzige Variante
  ohne neuen Vertrag (`docs/konzept/2026-11-14/04-agenten-wissen.md`, Abschnitt 3.2).
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen. Die Architekturentscheidung
  trägt den Status „vorgeschlagen“, weil der Host offen ist (EV-02).
- **Grenze:** Kein Betrieb, kein Einlesen und keine Umstellung bestehender Aufrufstellen durch diesen
  Eintrag. Chat-Inhalte gelangen erst nach geklärter Rechtsgrundlage ins Wissen (EV-09).
- **Rückweg:** ADR-0007 zurückziehen; ADR-0004 und ADR-0006 bleiben als Abwägung erhalten.

## D-018 — Geplanter Nachtlauf „Regelkreis“ pausiert (14.11.2026)

- **Entscheidung:** Der geplante nächtliche Lauf „Regelkreis“ ist pausiert und kann wieder
  eingeschaltet werden.
- **Grund:** Befund vom 13.11.2026: Der Lauf verursachte Kosten und baute nichts
  (`docs/konzept/2026-11-14/04-agenten-wissen.md`, Abschnitt 1.2).
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Offen:** Der Nachweis, dass die Pause wirksam ist, steht aus. Der Lauf liegt außerhalb dieses
  Repositorys; dieser Eintrag schaltet nichts. Wiedereinschalten erst mit begrenztem Auftrag und
  Zugriff auf das Repository.
- **Rückweg:** Lauf wieder einschalten; Eintrag als überholt kennzeichnen.

## D-019 — Ein führendes Konzept: `docs/konzept/FUEHRENDES-KONZEPT.md` (14.11.2026)

- **Entscheidung:** `docs/konzept/FUEHRENDES-KONZEPT.md` ist das eine führende Konzeptdokument. Es
  führt den Konzeptstand vom 14.11.2026 (`docs/konzept/2026-11-14/`), den Migrationsabgleich
  TEILEKLAR, das Shopkonzept aus PR 67 und die Aufzeichnungen der letzten 14 Tage zusammen.
  Die Arbeitspakete stehen in `docs/konzept/MIGRATIONSPLAN.md`.
- **Grund:** Auftrag des Inhabers vom 14.11.2026, alle Konzepte „zusammen in eins“ zu führen.
  Mindestens zwölf Dokumente nannten sich führend oder verbindlich.
- **Status:** Entscheidung Projektleitung, Bestätigung Inhaber offen.
- **Grenze:** Das Dokument ist kein Aufgabenregister; führend für Aufgaben bleibt
  `config/acceptance-coverage.json` (P01–P26). Es gibt keine Preise, Konditionen, Texte oder
  Rechtsangaben frei und ändert weder `AGENTS.md` noch `config/fakten.json` oder
  `config/llm-policy.json`. Im Rang steht es unter `AGENTS.md`, `DECISIONS.md` und der Konfiguration.
- **Umsetzung:** Fünf überholte Dokumente tragen die Kopfzeile „HISTORIE – abgelöst durch …“
  (Liste im Dokument, Abschnitt 11.3). Hash-gebundene Dateien wurden nicht angefasst und stehen dort
  als „Kopfzeile ausstehend“ (Abschnitt 11.4). Nichts wurde gelöscht oder umbenannt.
- **Rückweg:** Eintrag als überholt kennzeichnen und die fünf Kopfzeilen entfernen; der Konzeptstand
  vom 14.11.2026 ist unverändert.

## D-020 — REA: Einführung vom Inhaber freigegeben (14.11.2026)

- **Entscheidung:** Der Inhaber hat am 14.11.2026 die Einführung von REA freigegeben. Wortlaut (von der
  Projektleitung wiedergegeben): „okay. freigabe. ich kaufe jetzt den premium.“ Im führenden Konzept ist
  Entscheidung Nr. 35 damit entschieden (`docs/konzept/FUEHRENDES-KONZEPT.md`, Abschnitt 10; Abschnitt 3.5).
  Nr. 36 (Kauf von Hopper) und Nr. 37 (erlaubte Ziele) bleiben offen.
- **OFFEN 1 — welches „Premium“:** In den REA-Unterlagen ist kein Premium-Tarif belegt. Kostenpflichtig
  ist dort nur Hopper (kommerzieller Provider; `FUEHRENDES-KONZEPT.md` Abschnitt 3.5, Stand der
  Projektleitung vom 14.11.2026, README nur teilweise gelesen). Ob „Premium“ Hopper, ein anderes Produkt
  oder ein Tarif eines anderen Anbieters meint, ist nicht geklärt. Es wird nichts gekauft und kein Konto
  angelegt, bevor der Inhaber das benennt (Anbieter, Produkt, Betrag, Zahlungsweg).
- **OFFEN 2 — erlaubte Ziele:** Bis zur Klärung dürfen nur **eigene Systeme** untersucht werden. Fremde
  Software und Mitschnitte mit Kundendaten sind ausgeschlossen (`AGENTS.md` Z. 184: nur autorisierte Quell-
  und Zielbereiche).
- **Status:** Entscheidung Inhaber. Auslegung der Freigabe und die beiden offenen Punkte: Projektleitung
  fragt nach.
- **Grenze:** Dieser Eintrag installiert, kauft und konfiguriert nichts. REA-02 (Probeinstallation in
  abgeschotteter Umgebung, Sicherung der Agenten-Konfiguration vorher) und REA-01 folgen dem
  Migrationsplan (`docs/konzept/MIGRATIONSPLAN.md`, Abschnitt 2.4). Statische Analyse ist kein
  Laufzeitbeleg; Katalog und Annotationen sind Hinweise, keine Rechte. Zugangsdaten gehören nicht in
  Dateien.
- **Rückweg:** Eintrag als überholt kennzeichnen; bei bereits erfolgter Probeinstallation `rea uninstall`
  und Sicherung der Konfiguration zurückspielen.
