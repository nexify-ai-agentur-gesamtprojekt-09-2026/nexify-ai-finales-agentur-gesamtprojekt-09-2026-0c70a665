# 01 · Marke, Naming und Marketing – Bestandsaufnahme und Konzeptvorschlag

Stand: 14.11.2026 · Nur gelesen, nichts im Repo geändert, kein Build, kein Commit.
Repo: `/home/user/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` (Arbeitsverzeichnis, Stand 14.11.2026).

**Kennzeichnung in diesem Dokument**

- **IST belegt** – steht so im Repo (Datei:Zeile).
- **SOLL laut Inhaber** – Weisung von Pascal Courbois (Auftragstext 14.11.2026 oder im Repo dokumentierte Entscheidung).
- **Lücke** – fehlt oder ist nicht belegt.
- **Annahme** – mein Vorschlag, nicht belegt, braucht Entscheidung.

**Zur Zählung:** Trefferzahlen stammen aus einer Volltextsuche (Groß-/Kleinschreibung beachtet) über alle Textdateien des Repos ohne `node_modules`, `.git`, `pnpm-lock.yaml` und Binärdateien. Enthalten sind also auch Doku, Nachweise (`evidence/`), Prototypen und Build-Reste (`apps/web/.next`). Die Zahlen zeigen Größenordnungen, nicht die Zahl sichtbarer Stellen.

---

## 1. Namensmatrix

### 1.1 Der bindende Name – Stand der Klärung

| Fassung | Status | Quelle |
|---|---|---|
| „AIFly ORACEL white NeXify AI Intelligenz by NeXify" | **SOLL laut Inhaber, wörtlich** – Schreibweise in Klärung | Auftragstext 14.11.2026 |
| „AIFly ORACLE with NeXify AI Intelligence by NeXify" | **SOLL laut Inhaber (vom Koordinator aus seiner Antwort abgeleitet, Bestätigung der Endform ausstehend)**. Grundlage: Antworten „Nein, natürlich im richtigen englisch" und „Immer der volle Name". | Mitteilung des Koordinators, 14.11.2026 |
| „Oracle AIFly by NeXify" | **vom Inhaber ausdrücklich verworfen** | Auftragstext 14.11.2026 |

**IST im Repo:** Keine dieser drei Fassungen kommt vor. „ORACEL" 0 Treffer, „NeXify AI Intelligenz" 0, „NeXify AI Intelligence" 0, „AIFly ORACLE with" 0, „Oracle AIFly" 0. Der Name muss also überall neu gesetzt werden; es gibt keine Stelle, die schon stimmt.

**Folge von „Immer der volle Name":** Heute steht im Chat neben der Figur „AIFly ORACLE" (`config/assistant-interface-copy.json:3`) bzw. nur „Oracle" (`apps/web/components/PublicOrientationChat.tsx`, Schlüssel `assistant` und `thinking`: „Oracle antwortet …"). Beides widerspricht der Weisung.

### 1.2 Alle Namen und Schreibweisen

| Name (Zielform) | Bezeichnet | Schreibweisen im Repo (Treffer / Dateien) | Wichtigste Fundstellen | Widerspruch / Befund |
|---|---|---|---|---|
| **NeXify AI FACTORY** | Unternehmensauftritt (Anzeigename) | „NeXify AI FACTORY" 183 / 39 · „NeXify AI Factory" 3 / 3 · „NeXify AI FACTORY B.V." u. a. in `packages/agent-runtime/public-orientation.ts:84`, `apps/site/src/seo-state.mjs:11,32`, `apps/cloud/app/impressum/page.tsx:13` | `config/site-map.json:19` (`display_name`), `docs/design/factory-brand-revision-2026-11-02.md:3` | Rechtsform ungeklärt: Markenentscheidung nennt „B.V." (02.11.), `site-map.json:24` sagt `not_verified_for_BV`, das Impressum nennt eine Eenmanszaak (`site-map.json:3710,3726`). Siehe Abschnitt 5. |
| **NeXify AI** | Dachmarke / Kurzform | „NeXify AI" 3065 / 508 · „NeXifyAI" 1346 / 246 · „Nexify" 32 / 14 · „NEXIFY" 226 / 124 (meist technische Kennungen) | Label des Seitenkontexts `site-map.json` (`site_contexts.nexify.label`), Metatitel Start „… \| NeXify AI" | „NeXifyAI" (zusammen) ist die alte Schreibweise aus Prototypen und Doku; sichtbar neu ist „NeXify AI". Regel fehlt. |
| **NeXify AI by NeXify** | bisherige Anbieterbezeichnung | „NeXify AI by NeXify" ca. 85 Treffer in Varianten, „NeXifyAI by NeXify" 9 | Impressum `site-map.json:3710`, `config/fakten.json:157` (`teileklar.verkaeufer`) | Steht neben „NeXify AI FACTORY" – zwei Anbieternamen gleichzeitig sichtbar (Impressum-Titel „NeXify AI by NeXify", Metatitel „NeXify AI FACTORY – Unternehmensangaben"). |
| **AIFly ORACLE with NeXify AI Intelligence by NeXify** (Arbeitsfassung, Endform offen) | Produkt/KI-System **und** Figur | „AIFly ORACLE" 187 / 37 · „AIFly Oracle" 4 / 4 · „AIfly ORACLE" 1 (`AGENTS.md:69`) · „AI Fly Oracle"/„AI Fly" 137 / 33 · „AiFly" 2 · „AI-Fly" 1 · „AIFLY" 14 · nur „Oracle" 492 / 126 · nur „ORACLE" 236 / 48 · „Orakel"/„ORAKEL" 171 / 73 · „AIFly" allein 621 / 118 | Charakterbibel: „AI Fly Oracle" (`docs/masterplan/NeXify-Charakterbibel-2026-10-29.md:2,14`); Filmtext „Und ich bin AI Fly Oracle" (`config/home-film-scripts.json:9`); Produktseite „AIFly ORACLE. Einordnen, bevor gehandelt wird." (`site-map.json`, Seite `aifly-oracle`); Chat-Identität (`apps/web/lib/chat-guidance.ts:309`); Sprecherrolle „AIFly" (`docs/strategy/page-communication.md:17`) | Mindestens sieben Schreibweisen. „Orakel" bezeichnet zusätzlich das interne Prüf-Gate „Jeff" (`QUELLE.md:62`) – Verwechslungsgefahr. `DECISIONS.md:49` (13.11.) hält fest: „Die Namen ‚AIFly ORACLE' und ‚NeX Agentic AI' bleiben" – das ist durch die neue Weisung überholt. |
| **NeXify AI Intelligence** (abgeleitet, Endform offen) | laut Namen die KI-Grundlage hinter AIFly ORACLE | 0 Treffer | – | **Lücke:** Im Repo gibt es keinen Begriff für diese Ebene. Was genau sie bezeichnet (Modell-/Wissensschicht? Brain? Marke der KI-Leistung?), ist nicht belegt. Entscheidung nötig. |
| **NeX** | Figur (Tukan) und Agentenrolle | „NeX" als Einzelwort sehr häufig; als Figur in Charakterbibel §3, `AGENTS.md:38` | `site-map.json` Start: „NeX und AIFly ORACLE gehören zum KI-Konzept der Factory" | Figur und Produkt (NeX Agentic AI) tragen denselben Kurznamen; Masterplan verlangt Trennung von „Grafikfigur, Fachrolle und realer Laufzeitinstanz" (`NeXify-Masterplan-v2-2026-10-29.md:146`). |
| **NeX Agentic AI** | Produkt (Hauptagent) | „NeX Agentic AI" 135 / 41, davon „NeX Agentic AIFly" 59 / 23 · „NeX Agentic AIFly by NeXify" 2 | Fußzeile „NeX Agentic AI" (`config/public-interface-copy.json`, `footerLinks.de.one`); Seitentitel „NeX Agentic AIFly. Aufgaben gezielt vorbereiten." (Seite `nex-agentic`); `AGENTS.md:174` „native NeX Agentic AIFly-Seitenleiste" | Zwei Produktnamen für dasselbe (mit/ohne „AIFly"). Zusätzlich heißt die Seite `/produkte/one` „NeX & Oracle. Agentische KI als Baustein." |
| **NeX & AIFly ORACLE Suite** (vom Inhaber genannt) | unklar: Bündel aus NeX und AIFly ORACLE? | 0 Treffer als Name; inhaltlich nah: „NeX enthält AIFly" (`Masterplan:21`) | – | **Lücke:** Verhältnis zur „NeX2fly Suite" ungeklärt (derselbe Gegenstand mit neuem Namen oder ein zweites Bündel?). |
| **NeX2fly Suite** | Selfservice-Produkt / Arbeitsbereich | „NeX2fly" 328 / 57 · „NeX2fly Suite" 115 / 24 · „NeX2Fly" 2 · „NEX2FLY" 49 / 2 · technisch „nex2fly" 614 | Seite `/produkte/nex2fly` „NeX2fly. Ihre eigene Arbeitsumgebung."; `/registrieren` „NeX2fly Suite. Ihr eigener Einstieg."; `config/home-concept-copy.json:120` | Mal mit, mal ohne „Suite". Editionen „Privat und Business" (`Masterplan:21`) stehen in `home-concept-copy.json` („Privat & Business kennenlernen"), auf der Produktseite aber nicht. |
| **AIFly by NeXify** (vom Inhaber genannt) | unklar: Kurzform oder eigene Produktzeile? | 4 Treffer / 3 Dateien, u. a. `apps/web/components/PublicOrientationChat.tsx:279`, `apps/web/components/Workspace.tsx:465` | – | Widerspricht „Immer der volle Name", falls als Kurzform gemeint. Entscheidung nötig. |
| **one / one+** | historische Ausbaustufen | „one+" in `config/i18n.json` (4), `docs/09-final/*`, Prototypen | `docs/09-final/01-produkt-und-marke.md:5`; `Masterplan:145`: Zuordnung zum NeX-Produkt „noch explizit zu binden" | URL `/produkte/one` lebt weiter, Inhalt heißt „NeX & Oracle". Altname ohne Entscheidung. |
| **NeXify AI API / NeXify API** | Produkt (Schnittstelle) | „NeXify AI API" 127 / 47; sichtbar „NeXify API" | `config/fakten.json` (`api.name` = „NeXify AI API"); Seite `api`: „NeXify API. Integration nach Maß." | Faktenquelle und sichtbarer Titel weichen ab. |
| **NeXify Care** | Betreuungsleistung | durchgängig „NeXify Care" | `site-map.json:4011`, `public-interface-copy.json` (`home.de.steps[3]`) | einheitlich. |
| **TEILEKLAR** | eigene Shop- und Werkstattmarke | „TEILEKLAR" 2569 / 402 · „Teileklar" 25 / 20 · „TeileKlar" 2 · „TEILEKLAR.shop" im Fließtext | Regel „TEILEKLAR (Versalien)" in `docs/01-konzept/NeXifyAI-CI-Schema.md:27`; Slogan „TEILEKLAR — Na KLAR!" (`Masterplan:149`) | Schreibregel existiert und wird weitgehend eingehalten. Der Slogan steht in keiner sichtbaren Textdatei. Zuordnung zum Anbieter widersprüchlich (Abschnitt 5). |
| **„Chat it. Automate it."** | Claim | 111 Treffer / 64 Dateien | `Masterplan:122`, `config/assistant-interface-copy.json:47` (Chat-Fuß), `apps/web/lib/chat-guidance.ts:148` | Sichtbar nur im Chat-Fuß. Auf Startseite, Kopf und Fußzeile steht er nicht. Älterer Dachsatz „Ihr Unternehmen. Auf Autopilot." (`docs/01-konzept/NeXify-Marketingkonzept.md:22`) widerspricht `Masterplan:144` („kein ‚Autopilot'"). |
| **Brain** | Technik: Wissens- und Auftragsbasis | „Brain" 239 / 86; „NeXify Brain"/„NeX Brain" 0 | `Masterplan` §16, `config/brain/*.json` | Rein intern. In sichtbaren Texten nicht verwendet – so sollte es bleiben, solange kein Produkt daraus wird. |
| **Skills / MCP** | Technikbegriffe, öffentlich als Produktseite | Seite `/produkte/skills-mcp` | `site-map.json`, Seite `skills-mcp` | Fachjargon als Seitentitel; für Geschäftsführung ohne Erklärung schwer lesbar. |
| **Jeff / Orakel** | internes Prüf-Gate | `QUELLE.md:62-66`, `docs/JEFF-INTEGRATION.md` | – | Darf nie sichtbar werden; kollidiert sprachlich mit ORACLE. |
| **Pascal / Pascal Courbois** | Inhaber, Gastgeber-Figur | „Pascal Courbois" 432 / 177 | Charakterbibel §2 | einheitlich. |
| **Companion, Signalfeld** | ältere Bezeichnungen für die KI-Figur | „Companion" 607 / 186; „Signalfeld (Seed 4492)" in `docs/09-final/01-produkt-und-marke.md:43` | – | Altkonzept („Kein Bot mit Gesicht") widerspricht den heutigen Figuren. |

### 1.3 Vorgeschlagene Markenarchitektur (Annahme – braucht Bestätigung)

```
Unternehmen     NeXify AI FACTORY            (Rechtsträger: offen, siehe 5)
Dachmarke       NeXify AI                    Claim: „Chat it. Automate it."
│
├─ Agentur      Leistungsfelder: Marke & Web · Systeme & KI · Wachstum & Kampagnen
│               Projektpakete: Markenstart · KI im Betrieb · Wachstum · Option: NeXify Care
│
├─ Produkte     NeX2fly Suite                (Arbeitsbereich; Editionen Privat / Business)
│               NeX Agentic AI               (Hauptagent)
│               AIFly ORACLE with NeXify AI Intelligence by NeXify   (voller Name, Endform offen)
│               NeXify API
│               [NeX & AIFly ORACLE Suite]   (Stellung offen)
│
├─ Eigene Marke TEILEKLAR                    (eigener Handels- und Werkstattkontext)
│
├─ Figuren      Pascal (Mensch) · NeX (Tukan) · AIFly ORACLE (schwebend, glatt, Hut/Monokel)
│
└─ Technik      NeXify AI Intelligence (Bedeutung offen) · Brain · Skills · MCP · Jeff/Orakel-Gate
```

**Vorgeschlagene Regeln, wo welcher Name erscheinen darf**

| Ebene | Darf erscheinen | Darf nicht erscheinen |
|---|---|---|
| Unternehmen „NeXify AI FACTORY" | Seite Unternehmen, Fußzeile, Angebote, E-Mail-Signatur. Mit Rechtsform nur, wenn der Rechtsträger bestätigt ist. | „B.V." in Überschriften, Chattexten, Metadaten, solange nicht bestätigt. |
| Dachmarke „NeXify AI" | Kopfzeile, Metatitel, Fließtext als Kurzform. Immer mit Leerzeichen. | „NeXifyAI", „Nexify", „NEXIFY" in sichtbarem Text. |
| AIFly ORACLE (voller Name) | Laut Weisung überall, auch im Chat neben der Figur. | „Oracle", „AI Fly Oracle", „AIFly", „Orakel" allein. |
| NeX | Als Figur allein („NeX"). Als Produkt immer „NeX Agentic AI". | „NeX Agentic AIFly" (Mischform) – es sei denn, der Inhaber will genau das. |
| TEILEKLAR | Immer in Versalien; im NeXify-Auftritt als „eigene Marke" bezeichnet. | „Teileklar", „TeileKlar"; TEILEKLAR als NeXify-Produkt mit gemeinsamem Konto. |
| Technikbegriffe | Brain, Jeff, Gate, Tenant, Lease usw. nur intern. Skills/MCP sichtbar nur mit einem Satz Erklärung. | Interne Begriffe in Kundentexten. |

**Offene Punkte zur Architektur (Inhaber):** (a) Endform des vollen Namens. (b) Gilt „immer der volle Name" auch in Fließtext-Wiederholungen, Metatiteln (Längengrenze), Schaltflächen und Alt-Texten – oder dort eine festgelegte Zweitnennung? Der volle Name hat 50 Zeichen; der Chat-Kopf und Metatitel sind dafür heute nicht ausgelegt. (c) Was ist „NeXify AI Intelligence"? (d) „NeX & AIFly ORACLE Suite" gegenüber „NeX2fly Suite". (e) Bleibt „NeX Agentic AI" oder „NeX Agentic AIFly"? (f) Was wird aus one/one+ und der URL `/produkte/one`? (g) Aussprache (Charakterbibel §7 verlangt ein Ausspracheblatt; noch nicht vorhanden).

---

## 2. Inventar der sichtbaren Texte

### 2.1 Wo die Texte liegen

| Quelle | Inhalt | Sprachen | Befund |
|---|---|---|---|
| `config/site-map.json` (53 Seiten, davon 43 öffentlich) | Titel, Zusammenfassung, 1–4 Abschnitte, Metadaten, Handlungsaufrufe je Seite | DE/NL/FR/EN, keine leeren Felder | Status der Datei: `curated_architecture_target_not_production_release`. 51 von 53 Seiten `implementation_status: planned`. |
| `config/public-interface-copy.json` | Startseite (zweite Fassung), Hero, Pakete, Seitennavigation, Fußzeilenlinks | 4 Sprachen, 154 DE-Texte, Parität vollständig | Enthält eine eigene Startseiten-Fassung („Ein Anspruch. Ein zusammenhängender Auftritt."). |
| `config/home-concept-copy.json` | Startseite (dritte Fassung): „Wo hakt es gerade?" | 4 Sprachen, je 116 Schlüssel | Konkurriert mit den beiden anderen Startseiten-Fassungen. |
| `config/assistant-interface-copy.json` | Chat-/Assistenten-Oberfläche (Angebot, Termin, Marketing) | 4 Sprachen, je 61 Schlüssel | Enthält internen Jargon und einen sachlich fraglichen ChatGPT/OpenAI-Hinweis. |
| `apps/web/components/PublicOrientationChat.tsx` (fest im Code) | Öffentlicher Chat: Begrüßung, Zustände, Fehlertexte, TEILEKLAR-Variante | 4 Sprachen | Texte liegen im Code statt in der Konfiguration; DE weicht bei TEILEKLAR von NL/FR/EN ab. |
| `apps/web/lib/static-orientation.ts`, `packages/agent-runtime/public-orientation.ts` | Rückfalltexte des Chats ohne Modell | 4 Sprachen | Jargon „ohne Live-KI", „Textgeführte Orientierung"; „B.V." in der Überschrift. |
| `config/shop-interface-copy.json` | TEILEKLAR-Shop-Oberfläche | 4 Sprachen, je 66 Schlüssel | Nennt den Lieferanten „BigBuy" sichtbar (`supplierDate`). |
| `config/page-explainers.json` | Erklärmodule je Seite (Sprechertexte) | 4 Sprachen | Status Entwurf; Medien fehlen (`asset_pending` laut `docs/strategy/page-communication.md:32`). |
| `config/home-film-scripts.json` | Sprechertexte der Startseitenfilme | **nur DE** | Durchgehend Du-Form; Status `production_scripts_not_release`. |
| `config/teileklar-legal.json` | AGB, Widerruf usw. für TEILEKLAR | **nur DE** geprüft | Aus dem Prototyp übernommen; Hinweis „weil der Verkauf aktiv ist". |
| `apps/shop-api/shop/mail_templates.py` | Transaktionsmails Shop | DE gesehen | Sie-Form („Guten Tag …, wir haben Ihre Zahlung erhalten"). Andere Sprachen nicht geprüft. |

### 2.2 Seite für Seite (aus `config/site-map.json`, DE gelesen)

Legende: **vorh.** = ausformulierter Text vorhanden · **Vorbehalt** = Text besteht überwiegend aus Einschränkungen („wird geklärt", „vorgesehen") · **widerspr.** = widerspricht anderer Quelle · **Jargon** = interner Begriff sichtbar · **Platzh.** = Platzhalter/Statustext.

| Seite | Pfad | Befund DE | Anmerkung |
|---|---|---|---|
| Start | `/` | vorh., **widerspr.** | Drei konkurrierende Fassungen (site-map „Ein Gespräch. Ein Projekt, das passt." · public-interface-copy „Ein Anspruch. Ein zusammenhängender Auftritt." · home-concept-copy „Wo hakt es gerade?"). Metatitel und -beschreibung nur in DE neu geschrieben („… in Venlo, Limburg und NRW"); NL/FR/EN tragen die alte Fassung. Claim fehlt. |
| Leistungen | `/leistungen` | vorh. | „Leistungshaus der Factory" ist Eigenbegriff; drei Leistungsfelder klar. |
| Websites | `/leistungen/websites` | vorh. | Gut lesbar. |
| KI im Betrieb | `/leistungen/agenten-automatisierung` | vorh. | Gut lesbar; kein Nutzenbeleg. |
| Apps & Portale | `/leistungen/apps-portale` | vorh. | Gut lesbar. |
| Leistungsumfang | `/leistungsumfang` | vorh. | Pakete ohne Preisangabe (gewollt, Preise nicht freigegeben). |
| Wachstum & Kampagnen | `/loesungen` | vorh. | Pfad „loesungen" und Titel „Wachstum & Kampagnen" passen nicht zusammen; Fußzeile nennt die Seite „Landingpages & Kampagnen". |
| Preise & Ablauf | `/preise-ablauf` | vorh., **Lücke** | Kein einziger Preis. Tagessatz 449 € steht in `config/fakten.json:125`, ist aber nicht für die neue Seite freigegeben. |
| Wissen | `/wissen` | vorh. | Titel „Die Arbeitsweise hinter dem Auftritt" – kein Wissensangebot, nur Arbeitsweise. Artikel fehlen. |
| Projekt vorbereiten | `/wissen/projekt-vorbereiten` | vorh. | Brauchbar. |
| Unternehmen | `/unternehmen` | vorh., **widerspr.** | „NeX und Oracle beschreiben Rollen im KI-Konzept" (Kurzname). Keine Angaben zu Gründung, Standort, Person – nicht belegt, daher Lücke. |
| Kontakt | `/kontakt` | vorh. | Brauchbar. |
| NeX2fly | `/produkte/nex2fly` | **Vorbehalt** | Fast jeder Satz ist eine Einschränkung („ist vorgesehen", „wird bei der Freischaltung geklärt"). 24-Stunden-Test genannt (`site-map.json:2493`). `noindex`. |
| NeX & Oracle | `/produkte/one` | **Vorbehalt**, **widerspr.** | Altpfad „one", Titel „NeX & Oracle". |
| NeXify API | `/produkte/api` | **Vorbehalt** | Kein Leistungsversprechen, nur Klärungsbedarf. |
| AIFly ORACLE | `/produkte/aifly-oracle` | **Vorbehalt**, **Jargon**, **widerspr.** | „Er arbeitet derzeit ohne Live-KI-Modell" (`site-map.json:3061`) – widerspricht `DECISIONS.md:45-49` (Chat KI-geführt). Name nicht in der Sollform. |
| NeX Agentic AIFly | `/produkte/nex-agentic-aifly` | **Vorbehalt** | Abschnitt „Verfügbarkeit" sagt nicht, was verfügbar ist. |
| Skills und MCP | `/produkte/skills-mcp` | **Vorbehalt**, **Jargon** | „Das beschriebene zentrale Zugangsmodell ist ein Zielbild." |
| Portale | `/portale` | **Vorbehalt** | Dreimal dieselbe Aussage („hängt von der Freischaltung ab"). |
| Impressum | `/impressum` | vorh., **widerspr.** | Eenmanszaak, KvK 90483944, `hello@nexifyai.cloud` (`site-map.json:3710-3749`). Andere Stellen: FACTORY B.V., `mail@nexifyai.cloud`. `AGENTS.md` (13.11.): „Impressum hat keine bestätigten Anbieterangaben". |
| Datenschutz | `/datenschutz` | **Platzh.** | „Die vollständige Datenschutzerklärung ist noch in Prüfung." Keine Erklärung vorhanden. |
| Vertragsgrundlagen | `/vertragsgrundlagen` | **Platzh.** | „bleiben bis zur gesonderten Endprüfung Entwürfe". Keine AGB vorhanden. |
| KI-Hinweise | `/ki-hinweise` | vorh., **Jargon**, **widerspr.** | „ohne Live-KI-Modell" (`site-map.json:4114`), siehe oben. |
| Barrierefreiheit | `/barrierefreiheit` | vorh. | Keine Konformitätserklärung (ausdrücklich nicht behauptet). |
| Cookies | `/cookies` | **Platzh.** | „Die vollständige rechtliche Beschreibung wird noch geprüft." |
| Anmelden | `/anmelden` | vorh., **Jargon** | „diese Vorschau erteilt keine zusätzlichen Berechtigungen". |
| Registrieren | `/registrieren` | vorh. | Nennt „einmalig 5 EUR bezahltes Testguthaben" (`site-map.json:4667`) – einziger Betrag auf den NeXify-Seiten; Freigabe nicht belegt. |
| TEILEKLAR Start | `/teileklar` | **Vorbehalt** | Kein Slogan, kein Angebot; beschreibt nur den Anfrageweg. |
| TEILEKLAR Suche, Kategorien, Kategorie, Produkt, Warenkorb, Kasse, Passung, Termine, Gutscheine, Shop, Reifenrechner, Batterie-Berater (12 Seiten) | `/teileklar/…` | **Vorbehalt** | Durchgehend Verneinungen („belegt weder Verfügbarkeit noch Liefertermin", „stellt keinen Gutschein aus"). Fachlich korrekt, verkäuferisch leer. |
| Partner werden | `/teileklar/partner-werden` | **Vorbehalt**, **Lücke** | Kein Nutzen für die Werkstatt benannt, nur Abgrenzungen. |
| Werkstatt | `/teileklar/werkstatt` | **Vorbehalt** | Richtet sich an Autofahrer, nicht an Werkstätten. |
| TEILEKLAR Rechtliches | `/teileklar/rechtliches` | **Platzh.**, **widerspr.** | „Deren vollständige Freigabe steht aus" – `config/teileklar-legal.json:5` sagt dagegen „weil der Verkauf aktiv ist". |
| Geschützte Bereiche (10 Seiten: Kunden-, API-, Partnerbereich, TEILEKLAR-Konto usw.) | `/portal/…`, `/intern/…` | kurz, vorh. | Vier interne Seiten tragen denselben Statustext („Eine öffentliche Statusseite ist keine Freischaltung") – **Jargon**. |

**Handlungsaufrufe:** 156 Einträge, 57 verschiedene DE-Beschriftungen. Häufigste: „Ihr Anliegen mit TEILEKLAR klären" (14), „Vorhaben schildern" (12), „Ein Projektpaket anfragen" (12), „Mit NeXify Kontakt aufnehmen" (10), „Einen Terminwunsch mitteilen" (10). Für denselben Schritt (Kontakt aufnehmen) gibt es mindestens acht Formulierungen – keine feste Regel.

### 2.3 Interner Jargon in sichtbaren Texten (belegt)

| Text | Fundstelle |
|---|---|
| „Orientierung anhand der Website · ohne Live-KI" | `apps/web/components/PublicOrientationChat.tsx:105` |
| „NeXify AI FACTORY · Website-Beratung ohne Live-KI." | `apps/web/lib/static-orientation.ts:6` |
| „NeXify AI FACTORY B.V. · Textgeführte Orientierung ohne Live-KI." | `packages/agent-runtime/public-orientation.ts:84` |
| „Entwürfe und Anfragen werden gespeichert. Versand, Live-KI und externer Kalender sind noch nicht verbunden." | `config/assistant-interface-copy.json:43` |
| „Entwicklungsvorschau", „Lokale Vorplanung · persönliche Bestätigung steht aus", „Angebotsentwurf · Preisfreigabe steht aus" | `config/assistant-interface-copy.json` (Schlüssel `preview`, `planning`, `draft`) |
| „Diese Einordnung entsteht lokal aus den öffentlichen Inhalten dieser Website." | `apps/web/lib/static-orientation.ts:6` (`limits`) |
| „Es wurde keine Aktion ausgeführt." | `packages/agent-runtime/public-orientation.ts` (`ending`) |
| „Mit ChatGPT antworten" / „Ihre Nachricht wird an OpenAI übermittelt." | `config/assistant-interface-copy.json:62` – steht neben der Modellvorgabe DeepSeek über OpenRouter (`AGENTS.md`, Abschnitt „Unverlierbare Modellvorgabe"). Welcher Anbieter tatsächlich Daten erhält, ist damit unklar. |
| „Lieferant BigBuy, Stand {date}" | `config/shop-interface-copy.json` (`supplierDate`) |
| „Zielbild", „Freischaltung", „Betriebsstand", „Mandantenrechte" | `config/site-map.json`, Produkt- und Portalseiten |

### 2.4 Sprachen DE / NL / FR / EN

| Bereich | DE | NL | FR | EN |
|---|---|---|---|---|
| `site-map.json` Seitentexte | vollständig | vollständig | vollständig | vollständig |
| Start: Zusammenfassung, Metatitel, Metabeschreibung | neue Fassung | **alte Fassung** (inhaltlich abweichend) | **alte Fassung** | **alte Fassung** |
| Oberflächentexte (4 Copy-Dateien) | vollständig | vollständig | vollständig | vollständig |
| Chat TEILEKLAR-Begrüßung | **ohne** den Satz „Online-Bestellung derzeit nicht möglich" | mit | mit | mit |
| Filmtexte (`home-film-scripts.json`) | vorhanden | **fehlt** | **fehlt** | **fehlt** |
| TEILEKLAR-Rechtstexte (`teileklar-legal.json`) | vorhanden (Entwurf) | **fehlt** | **fehlt** | **fehlt** |
| Rechtstexte NeXify (Datenschutz, AGB, Cookies) | **fehlen** (nur Hinweis „in Prüfung") | fehlen | fehlen | fehlen |
| EN allgemein | – | – | – | `AGENTS.md` nennt als Pflichtsprachen nur de/nl/fr; EN ist nachträglich dazugekommen (`i18n-staging/en`). Status von EN (Pflicht oder Zugabe) ist nicht entschieden. |

Nicht geprüft: sprachliche Qualität von NL/FR/EN (nur Vollständigkeit und Abweichungen an Stichproben).

---

## 3. Marketing-Gesamtkonzept (Vorschlag, nur aus Belegtem abgeleitet)

### 3.1 Ausgangslage: zwei Konzeptstände, die sich widersprechen

| Thema | Stand September (`docs/01-konzept/NeXify-Marketingkonzept.md`, 25.09.2026; `docs/09-final/01-produkt-und-marke.md`) | Stand Oktober/November (`Masterplan v2.1`, 29.10.; `factory-brand-revision`, 02.11.; `site-map.json`) |
|---|---|---|
| Was NeXify ist | „Ein-Personen-Agentur mit KI-gestützter Fertigung", Schwerpunkt Automatisierung | „NeXify AI FACTORY": Marke & Web, Systeme & KI, Wachstum & Kampagnen |
| Kernversprechen | „Kennzahl statt Versprechen", „Ihr Unternehmen. Auf Autopilot." | „Ein Gespräch. Ein Projekt, das passt."; kein „Autopilot" (`Masterplan:144`) |
| Preis | 449 € netto je Tag, offen genannt | keine Preise sichtbar; Vorschlagspreise im Masterplan §2.6 ausdrücklich nicht freigegeben |
| Beweis | „TEILEKLAR live", anonymisierte Fälle, Erfahrungszahlen (80+ Websites usw.) | keine Referenzen, keine Zahlen; TEILEKLAR nicht verkaufsbereit (Katalog leer, `DECISIONS.md:34`; H1-Platzhalter auf `teileklar.shop`, `docs/04-betrieb/befund-2026-11-13.md:69`) |
| Anrede | „NeXify AI siezt, TEILEKLAR duzt" (`Marketingkonzept:81`) | alles Sie (`site-map.json:15`), Filme und Charakterbibel Du |

Der Vorschlag unten folgt dem neueren Stand und übernimmt aus dem älteren nur, was nicht widersprochen ist.

### 3.2 Positionierung

- **IST belegt:** Arbeitspositionierung „NeXify verbindet verständliche digitale Oberflächen mit nachvollziehbaren Abläufen in deinen vorhandenen Systemen." (`Masterplan:3274`). Drei Leistungsfelder (`factory-brand-revision-2026-11-02.md:3`). Persönliche Begleitung durch Pascal Courbois (`site-map.json`, Seite `company`). Zielmarkt 90 % Deutschland als Ziel, nicht gemessen (`site-map.json:11-15`). Regionale Nennung „Venlo, Limburg und NRW" (Start-Metabeschreibung DE).
- **Vorschlag (Annahme):** „NeXify AI FACTORY plant und baut für Unternehmen den Auftritt, die Abläufe dahinter und die Kampagne dazu – aus einem Konzept, mit einem Ansprechpartner und einem vor dem Start vereinbarten Umfang."
- **Lücke:** Kein belegter Unterschied zum Wettbewerb. Die alten Unterscheidungsmerkmale (fester Tagessatz, Kennzahl, Eigentum am Code beim Kunden) stehen in keinem aktuellen sichtbaren Text. Ob sie noch gelten, muss der Inhaber sagen.

### 3.3 Zielgruppen

| Zielgruppe | Beleg | Lücke |
|---|---|---|
| Inhaber/Geschäftsführung kleiner und mittlerer Betriebe (DE, NL, Grenzregion) | `01-produkt-und-marke.md:13`; `Marketingkonzept:15` („5–80 Mitarbeitende") | Größenangabe stammt aus dem alten Konzept; nicht bestätigt. |
| Branchenbilder Marke & Dienstleistung, Fertigung & Handwerk, Automotive & Logistik | `home-concept-copy.json` (`galleryContexts`) | Keine Branchenseiten. |
| Nutzer der NeX2fly Suite (Privat und Business) | `Masterplan:21` | „Privat" bedeutet Verbraucher – die gesamte Ansprache und die Preisangaben sind auf Unternehmen ausgelegt. |
| Entwickler/Technik (API) | `01-produkt-und-marke.md:15` | Kein Text, der Entwickler anspricht (keine Dokumentation verlinkt). |
| Agenturen/Partner (White Label) | `Masterplan:207`, `Marketingkonzept:38` | Keine öffentliche Partnerseite für NeXify. |
| TEILEKLAR: Autofahrer | `Marketingkonzept:39` | Verbraucherrecht und Preisangaben ungeklärt. |
| TEILEKLAR: Werkstätten | `Marketingkonzept:40`, Seite `tk-partner` | Nutzen für Werkstätten nicht ausformuliert. |

### 3.4 Nutzenversprechen je Produkt

| Produkt | Belegter Nutzen (aus dem Repo) | Status der Aussage |
|---|---|---|
| Agentur: Marke & Web | Auftritt, der das Angebot verständlich zeigt und den Weg zur Anfrage öffnet (`home-concept-copy.json`, `galleryBodies[0]`) | belegt als Text; kein Ergebnisnachweis |
| Agentur: Systeme & KI | Ein wiederkehrender Ablauf wird verstanden, verbunden, geprüft; „Wir beginnen bewusst mit einem Ablauf" (`offers[1]`) | belegt als Text |
| Agentur: Wachstum & Kampagnen | Kampagne, Werbemittel und Zielseite aus einem Plan; „ein bestimmter Erfolg wird nicht zugesagt" (Seite `solutions`) | belegt als Text |
| NeXify Care | Betreuung nach Übergabe, separat vereinbart | belegt; Umfang und Preis nicht freigegeben |
| NeX2fly Suite | Eigener Arbeitsbereich für Gespräche, Aufgaben, Dokumente, Wissen; 24 Stunden Test | Zielbild; „Welche Funktionen verfügbar sind, wird bei der Freischaltung geklärt" – **Lücke: kein verfügbarer Funktionsumfang benannt** |
| NeX Agentic AI | Assistenz für klar umrissene Aufgaben mit freigegebenen Werkzeugen | Zielbild |
| AIFly ORACLE (voller Name offen) | Ordnet Aufgaben, Zuständigkeiten, Abhängigkeiten; auf der Website: Orientierung und Briefing im Chat | Chat-Funktion im Code vorhanden; Livebetrieb nicht nachgewiesen (`befund-2026-11-13.md:80`: Chat-Backend nicht geprüft) |
| NeXify API | Einbindung von NeXify-Funktionen in eigene Anwendungen | Zielbild; Preise offen (E1, `fakten.json:234`) |
| TEILEKLAR | Vom Fahrzeug zum passenden Teil und zur Werkstatt | Zielbild; Katalog leer, Verkauf nicht nachgewiesen |

**Lücke insgesamt:** Für kein Produkt gibt es einen freigegebenen, öffentlich nennbaren Leistungsumfang mit Preis. Das ist das größte Hindernis für jede Verkaufsbotschaft.

### 3.5 Botschaftshierarchie (Vorschlag)

**Kernsatz (Annahme, aus Belegtem gebaut):**
„Ein Gespräch. Ein Konzept. Ein Auftritt, der arbeitet." – Unterzeile: „Chat it. Automate it."

**Drei Stützsätze und ihre Belege**

| Stützsatz | Beleg im Repo | Was noch fehlt |
|---|---|---|
| 1. **Aus einem Konzept.** Marke, Website, Abläufe und Kampagne werden zusammen geplant. | Drei Leistungsfelder und drei Projektpakete (`factory-brand-revision:3`, Seite `scope`) | Ein gezeigtes Beispiel (eigener Auftritt oder freigegebener Fall). |
| 2. **Mit einem Ansprechpartner.** Pascal Courbois begleitet vom ersten Gespräch bis zur Übergabe. | Seite `company`, `home-concept-copy.json` (`processBody`) | Foto/Porträt mit Freigabe; Angaben zur Person. |
| 3. **Mit klarem Umfang.** Vor dem Start steht fest, was enthalten ist; Umsetzung, Betreuung und Fremdkosten sind getrennt ausgewiesen. | Seite `pricing`, `home-concept-copy.json` (`costs`) | Mindestens eine freigegebene Preisangabe oder Preisspanne. |

**Belege, die heute nutzbar sind:** die offene Trennung der Kostenarten; das Rechenbeispiel (ausdrücklich „kein NeXify-Tarif", `fakten.json:167-180`); die eigenen Produkte als Arbeitsprobe – aber erst, wenn sie tatsächlich erreichbar sind.
**Belege, die es nicht gibt:** Kundenstimmen, Referenzen, Kennzahlen, Auszeichnungen. `AGENTS.md` („Ehrlich bleiben") verbietet, sie zu erfinden. Die Erfahrungszahlen aus `01-produkt-und-marke.md:39` („80+ Websites …") sind nicht belegt und sollten nicht verwendet werden, bis der Inhaber sie nachweist.

### 3.6 Tonalität

**Belegt – das Repo schwankt:**

| Quelle | Anrede | Fundstelle |
|---|---|---|
| Seitenarchitektur | Sie / u / vous, verbindlich | `config/site-map.json:15` („formal_Sie_u_vous", Nutzerweisung 26.10.2026) |
| Produkt und Marke | „Siezen" verbindlich | `docs/09-final/01-produkt-und-marke.md:30` |
| Chat-Vorgabe | „in der Sie-Form" | `apps/web/lib/chat-guidance.ts:125` |
| Seitenkommunikation | „Die deutsche Ansprache bleibt Sie." | `docs/strategy/page-communication.md:9` |
| Altes Marketingkonzept | „NeXify AI siezt, TEILEKLAR duzt." | `docs/01-konzept/NeXify-Marketingkonzept.md:81` |
| Filmtexte Startseite | durchgehend Du (25 Du-Formen, 0 Sie) | `config/home-film-scripts.json:7-22` |
| Charakterbibel | Beispielsätze in Du | `docs/masterplan/NeXify-Charakterbibel-2026-10-29.md:48,78,133-139` |
| Masterplan | Arbeitspositionierung in Du („in deinen vorhandenen Systemen") | `Masterplan:3274` |
| TEILEKLAR sichtbar | Sie | Seiten `tk-*`, `mail_templates.py:67` |
| Build-Rest | „Du kannst den Text anpassen." | `apps/web/.next/…/_0chhvrs94p9rr._.js` (Quelle im Code nicht gesucht) |

**Vorschlag (Annahme):** Sie-Form in allen geschriebenen Texten beider Marken. Für die Filme muss der Inhaber entscheiden, ob Pascal dort bewusst duzt (dann als Ausnahme festschreiben) oder ob die Filmtexte auf Sie umgeschrieben werden. Ein Besucher, den der Film duzt und der Chat siezt, erlebt einen Bruch.

**Stilregeln, die belegt sind und beibehalten werden sollten** (`01-produkt-und-marke.md:30-32`): kurze Hauptsätze; Zahl statt Adjektiv; kein Superlativ ohne Beleg; Einwand zuerst nennen; keine Angst-Rhetorik; keine erfundenen Referenzen.

**Stilproblem des heutigen Bestands (Befund):** Die Texte sind überwiegend im Vorbehalt geschrieben. Sätze wie „Eine Produktbeschreibung ersetzt keine bestätigte Freischaltung oder technische Prüfung" schützen vor Fehlbehauptungen, sagen dem Leser aber nicht, was er bekommt. Premium-Niveau heißt hier: einmal klar sagen, was es gibt, einmal klar sagen, was noch nicht – und den Rest streichen.

### 3.7 Kundenweg je Produkt

| Produkt | Weg (belegt) | Was davon heute nachweislich funktioniert | Lücke |
|---|---|---|---|
| Agentur | Besuch → Chat/Briefing oder Kontaktformular → Gespräch mit Pascal → Angebot → Auftrag → Umsetzung → Abnahme → Care (`Masterplan:141`, §15.4; Seite `contact`) | Chat und Briefing-Übergabe im Code vorhanden. Formularversand und Chat-Backend live „nicht geprüft" (`befund-2026-11-13.md:80`). | Terminbuchung nicht verbunden („Zurzeit sind keine Terminvorschläge eingerichtet", `assistant-interface-copy.json`). Angebotsversand „Versandverbindung steht aus". Kein Angebotsmuster mit freigegebenen Preisen. |
| NeX2fly Suite | Registrierung → E-Mail-Bestätigung → eigener Arbeitsbereich → bewusster Teststart (24 Stunden) → Nutzungsplan (`Masterplan` §15.4) | Anmelden/Registrieren `implemented` (`site-map.json`) | Tarife, Preise, Vertragsbedingungen, Verbraucherinformationen fehlen. Seite `noindex`. |
| NeXify API | Bedarf klären → Zugang → Guthaben → Nutzung | nicht nachgewiesen | Aufschlag 38 % oder 45 % offen (`fakten.json:234`); Steuerfrage offen (E4). |
| AIFly ORACLE | In NeX enthalten; zusätzlich eigenständig per API (`Masterplan:146`) | Öffentlicher Chat | Kein eigener Kaufweg beschrieben. |
| TEILEKLAR Autofahrer | Fahrzeug → Teil → Passung → Warenkorb → Kasse → Bestellung → Lieferung | Shop-API im Code; Katalog leer (`DECISIONS.md:34`); Vercel-Shop-API antwortet 503 (`AGENTS.md`, 13.11.) | Anbieter, AGB, Widerruf nicht freigegeben. |
| TEILEKLAR Werkstatt | Betrieb vorstellen → Gespräch → Partnervereinbarung → Profil → Anfragen | nicht nachgewiesen | Partnerbedingungen, Konditionen, Nutzenargument fehlen. |

### 3.8 Kanäle

| Kanal | Belegt | Lücke |
|---|---|---|
| **Web** | Hauptkanal. 43 öffentliche Seiten in 4 Sprachen. SEO-/GEO-/Lokal-Bausteine als Leistung beschrieben (`home-concept-copy.json`, `visibility`). | Indexierung aus; `.de` und `.cloud` zeigen nicht auf den führenden Stand (`AGENTS.md`, 13.11.; `befund-2026-11-13.md:57-69`). Drei Stände im Netz. Keine Stadt-/Branchenseiten, keine Wissensartikel. |
| **Social** | Altkonzept: LinkedIn persönlich, 2 Beiträge je Woche (`Marketingkonzept:63`). Freigabe, Akquise und Inhalte parallel zu starten (`AGENTS.md`, Führungsentscheidung 10.11.). | Kein Redaktionsplan, keine Profiltexte, keine Beitragsvorlagen, keine Bildvorlagen im Repo. Welche Kanäle existieren, ist nicht belegt. |
| **E-Mail** | Transaktionsmails für den Shop (`apps/shop-api/shop/mail_templates.py`), Bestätigungsmail im Chat (`assistant-interface-copy.json`, `mailSent`). Werbeversand nur mit Rechtsgrundlage, Abmeldung, Sperrliste (`AGENTS.md`, 10.11.; `Masterplan` §15.3). | Kein Newsletter, keine Begrüßungs- oder Nachfassserie, keine Signatur mit Pflichtangaben. Newsletter-Entscheidung seit 25.09. offen (`Marketingkonzept:122`). Zwei Absenderadressen (`mail@` und `hello@nexifyai.cloud`). |
| **Chat** | Öffentlicher Chat als Einstieg und Briefing-Hilfe. | Name, Kennzeichnung und Rückfalltexte nicht final (Abschnitte 1, 2.3, 5). |
| **Film/Figuren** | Drehbücher und Charakterbibel vorhanden. | Sprecherfilm nicht produziert (`factory-brand-revision:13`); nur DE; Du/Sie ungeklärt. |
| **Messung** | Kennzahlen definiert (`Masterplan` §15.4, `Marketingkonzept` §10). | Kein Messwerkzeug freigegeben; Analyse standardmäßig aus (`site-map.json`, `shared_interaction.privacy`). Keine Ausgangswerte. |

---

## 4. Fehlende Bausteine, offene Entscheidungen, Musterbeispiele

### 4.1 Entscheidungen für den Inhaber (priorisiert)

**A – blockiert Veröffentlichung und jede Textfinalisierung**

1. **Endform des vollen Namens** bestätigen: „AIFly ORACLE with NeXify AI Intelligence by NeXify"? Dazu: Wo darf gekürzt werden (Metatitel, Schaltflächen, Chat-Kopf), wenn überhaupt?
2. **Rechtsträger und Impressum:** Eenmanszaak (KvK 90483944) oder B.V.? Davon hängen Impressum, Fußzeile, Angebote, Datenschutz, TEILEKLAR-Verkäufer und alle „B.V."-Stellen ab.
3. **KI-Kennzeichnung im Chat:** Die Entscheidung vom 13.11. (`DECISIONS.md:45`) entfernt sichtbare Hinweise; `AGENTS.md:198` und das alte Konzept verlangen sie. Mit dem vollen Namen („… AI Intelligence …") ändert sich die Lage erneut. Bitte einmal abschließend festlegen.
4. **Ist der Chat live KI-geführt?** Wenn ja, sind die Sätze „ohne Live-KI-Modell" auf `/ki-hinweise` und `/produkte/aifly-oracle` falsch und der Datenschutztext muss die Verarbeitung abdecken. Wenn nein, darf der Name nicht mehr versprechen als der Chat kann.
5. **Welcher Anbieter erhält Chat-Nachrichten?** Sichtbar steht „OpenAI"; die Projektvorgabe nennt DeepSeek über OpenRouter.
6. **Eine Startseiten-Fassung** bestimmen (drei liegen vor).
7. **Anrede:** Sie überall – auch in den Filmen? TEILEKLAR Sie oder Du?

**B – nötig für ein verkaufsfähiges Konzept**

8. **Preise:** Was darf öffentlich stehen? (Tagessatz 449 €, Vorschlagspreise aus Masterplan §2.6, Care, 5 EUR Testguthaben, 19,90 EUR Premium-Skill.) Ohne mindestens eine Angabe bleibt „Preise & Ablauf" ohne Preis.
9. **Produktnamen:** „NeX Agentic AI" oder „NeX Agentic AIFly"? „NeX2fly Suite" und „NeX & AIFly ORACLE Suite" – ein Produkt oder zwei? Was wird aus one/one+?
10. **Bedeutung von „NeXify AI Intelligence"** (ein Satz genügt).
11. **Was ist heute tatsächlich nutzbar?** Je Produkt eine verbindliche Liste. Nur damit lassen sich die Vorbehaltstexte durch klare Aussagen ersetzen.
12. **Belege:** Gibt es freigegebene Referenzen, Zahlen, ein Porträtfoto, Angaben zur Person und zum Unternehmen (Gründung, Standort, Erfahrung)?
13. **TEILEKLAR:** Verkauf aktiv oder nicht? Lieferländer (mit oder ohne Schweiz)? Slogan „TEILEKLAR — Na KLAR!" verwenden? Darf der Lieferant „BigBuy" sichtbar genannt werden?
14. **Kontaktadresse:** `mail@` oder `hello@nexifyai.cloud`?
15. **Sprachen:** Ist EN Pflicht? Werden Filme und Rechtstexte in NL/FR/EN gebraucht?

**C – Ausbau**

16. Kanäle: Welche Social-Profile gibt es, wer bespielt sie? Newsletter ja/nein?
17. Regionale Ausrichtung: „Venlo, Limburg und NRW" als festes Merkmal?
18. Claim: „Chat it. Automate it." auch auf Startseite, Kopf, Fuß?
19. Aussprache der Namen (Ausspracheblatt).

### 4.2 Fehlende Bausteine (Inventar)

| Nr. | Baustein | Status |
|---|---|---|
| 1 | Namens- und Schreibregel als eine verbindliche Datei (heute verteilt auf CI-Schema, Charakterbibel, DECISIONS) | fehlt |
| 2 | Markenkern: Positionierungssatz, Kernsatz, Stützsätze, freigegeben | fehlt (nur Arbeitsfassung im Masterplan) |
| 3 | Kurzbeschreibungen je Produkt in drei Längen (ein Satz, 50 Wörter, 150 Wörter) | fehlt |
| 4 | Unternehmensprofil (Boilerplate), Inhaberprofil | fehlt |
| 5 | Eine Startseite mit Claim, Kernsatz, Beleg | drei Fassungen, keine final |
| 6 | Produktseiten mit „Das bekommen Sie / Das kostet es / So starten Sie" | fehlt (nur Vorbehalte) |
| 7 | Preisseite mit Zahlen | fehlt |
| 8 | Häufige Fragen je Leistung und Produkt | fehlt in den Copy-Dateien |
| 9 | Chat: Begrüßung, Vorstellung mit vollem Namen, Rückfall-, Fehler-, Übergabetexte in einer Datei | verstreut, mit Jargon |
| 10 | Rechtstexte NeXify: Impressum (bestätigt), Datenschutz, AGB/Vertragsgrundlagen, Cookies, KI-Hinweise (aktuell) | fehlen bzw. Entwurf |
| 11 | Rechtstexte TEILEKLAR in geprüfter Fassung und in den Verkaufssprachen | Entwurf, nur DE |
| 12 | Werkstatt-Nutzenargument und Partnerbedingungen (TEILEKLAR) | fehlt |
| 13 | E-Mail-Texte: Eingangsbestätigung, Angebot, Nachfassen, Begrüßung Suite, Signatur | nur Shop-Mails belegt |
| 14 | Social: Profiltexte, Beitragsformate, Redaktionsplan | fehlt |
| 15 | Wissensartikel, Stadt- und Branchenseiten | fehlen |
| 16 | Filmtexte in Sie-Form bzw. in NL/FR/EN | fehlt |
| 17 | Einheitliche Handlungsaufrufe (ein Wortlaut je Schritt) | fehlt (57 Varianten) |
| 18 | Metatitel und -beschreibungen je Seite, eigenständig formuliert (heute meist Kopie von Titel/Zusammenfassung; Start in NL/FR/EN veraltet) | unvollständig |
| 19 | Glossar DE/NL/FR/EN für Produkt- und Paketnamen | fehlt (`Masterplan` §15.2 verlangt es) |
| 20 | Messplan mit Ausgangswerten | fehlt |

### 4.3 Was sofort premium ausformuliert werden kann, ohne etwas zu erfinden

- Startseite (eine Fassung aus den drei vorhandenen), Leistungsseiten, Leistungsumfang, Kontakt, Unternehmen (ohne neue Fakten).
- Kurzbeschreibungen der drei Leistungsfelder und drei Projektpakete.
- Chat-Texte: Begrüßung, Zustände, Fehler, Rückfall, Übergabe an Pascal – jargonfrei.
- Einheitliche Handlungsaufrufe.
- TEILEKLAR-Seiten: dieselben Fakten, aber positiv formuliert (was der Kunde tun kann) mit genau einem klaren Hinweis auf den Stand.
- Glossar und Schreibregel.

**Nicht ohne Entscheidung möglich:** alles mit Preis, Rechtsform, Verfügbarkeit, Referenz oder Rechtstext; alle Stellen mit dem vollen Namen, bis die Endform bestätigt ist.

### 4.4 Fünf Musterbeispiele (DE) – Qualitätsprobe

Alle Aussagen stammen aus den genannten Quellen. Wo der volle Name steht, ist die **Arbeitsfassung** eingesetzt und als solche markiert `[Name: Endform offen]`.

**1. Startseiten-Kernaussage**
Quelle: `site-map.json` Seite `home`; `home-concept-copy.json` (`introBody`, `processBody`, `budgetTitle`); Claim `Masterplan:122`.

> **Ein Gespräch. Ein Konzept. Ein Auftritt, der arbeitet.**
> Sie zeigen uns die Stelle, an der es hakt: eine Website, die Ihr Angebot nicht erklärt, oder ein Vorgang, der jeden Tag Zeit kostet. Wir entwickeln daraus Marke, Website und die Abläufe dahinter – aus einem Konzept. Pascal Courbois begleitet Ihr Projekt vom ersten Gespräch bis zur Übergabe, und Sie wissen vor dem Start, was enthalten ist.
> *Chat it. Automate it.*
> [Projekt beschreiben] · [Leistungen ansehen]

**2. Suite-Kurzbeschreibung**
Quelle: Seiten `nex2fly`, `signup` (`site-map.json:2493,4641,4667`); `home-concept-copy.json` (`products[0]`). Betrag „5 EUR" bewusst weggelassen, weil die Freigabe nicht belegt ist.

> **NeX2fly Suite – Ihr eigener Arbeitsbereich.**
> Gespräche, Aufgaben, Dokumente und Projektwissen an einem Ort. Die Suite ist ein eigenständiges Produkt und unabhängig von einem Agenturauftrag. Sie lernen sie in einem einmaligen Test über 24 Stunden kennen; er beginnt erst, wenn Sie ihn selbst starten, und endet ohne automatische Abbuchung. Die Nutzung von KI-Modellen wird getrennt abgerechnet. Welche Funktionen und Verbindungen für Ihren Zugang bereitstehen, sehen Sie bei der Aktivierung.

**3. Werkstatt-Nutzen in einem Absatz (TEILEKLAR)**
Quelle: Seiten `tk-partner`, `tk-appointments`, `tk-workshop`; Auslöser „Kunde bringt falsches Teil" und Antwort „Auftrag mit Fahrzeug- und Teiledaten" aus `Marketingkonzept:40`. Kein Versprechen zu Auftragszahlen, Konditionen oder Provision – dazu ist nichts belegt.

> **Für Werkstätten: Anfragen, mit denen Sie arbeiten können.**
> Bei TEILEKLAR beginnt jede Anfrage beim konkreten Fahrzeug. Kundinnen und Kunden nennen Fahrzeug, gesuchtes Teil und gewünschte Arbeit, bevor sie sich an einen Betrieb wenden. Sie erhalten damit eine Anfrage mit Fahrzeug- und Teileangaben statt einer offenen Frage am Telefon. Umfang, Preis und Termin bestätigen weiterhin allein Sie. Stellen Sie uns Ihren Betrieb mit Leistungen, Standort und Ansprechpartner vor; Anfragewege, Konditionen und Abrechnung vereinbaren wir, bevor die Zusammenarbeit beginnt.

**4. Chat-Begrüßung**
Quelle: `PublicOrientationChat.tsx` (`copy.de.intro`, `privacy`); `chat-guidance.ts:309` (Identität); Weisung „Immer der volle Name". Die Selbstbezeichnung als KI-System steht bereits im Code; ob sie in der Begrüßung sichtbar sein soll, ist Entscheidung A3.

> **AIFly ORACLE with NeXify AI Intelligence by NeXify** `[Name: Endform offen]`
> Guten Tag. Ich bin das KI-System von NeXify AI. Erzählen Sie mir von Ihrem Unternehmen und Ihrem Vorhaben. Ich helfe Ihnen, die passende Leistung zu finden, und fasse Ihr Anliegen als Briefing für Ihr Gespräch mit Pascal Courbois zusammen.
> Bitte geben Sie keine Passwörter oder Zahlungsdaten ein.

**5. Rückfall-Hinweis im Chat** (ersetzt „Orientierung anhand der Website · ohne Live-KI")
Quelle: `PublicOrientationChat.tsx:105` und `stateCopy.de.unavailable`; `static-orientation.ts:6` (`limits`). Inhalt unverändert: Antwort kommt aus den Seiteninhalten, nichts wird gesendet oder gebucht, Eingabe bleibt erhalten.

> **Ich antworte gerade aus den Inhalten dieser Website.**
> Die ausführliche Beratung ist im Moment nicht erreichbar. Ich zeige Ihnen die Seiten, die zu Ihrer Frage passen. Ihre Nachricht bleibt erhalten; gesendet oder gebucht wird dabei nichts. Wenn Sie möchten, geben Sie Ihr Anliegen direkt an Pascal Courbois weiter.
> [Mit dieser Nachricht anfragen] · [Erneut versuchen]

---

## 5. Rechtliche und faktische Stolpersteine in Texten

Nur benannt. Keine Rechtsberatung; anwaltliche Prüfung ist im Repo selbst als Pflicht vor Livebetrieb festgehalten (`docs/09-final/08-recht-und-compliance.md:3`, offener Punkt E12).

| Nr. | Stolperstein | Fundstelle | Warum heikel |
|---|---|---|---|
| 1 | **Rechtsform/Anbieter widersprüchlich:** Eenmanszaak im Impressum, „NeXify AI FACTORY B.V." in Überschriften, Metadaten, strukturierten Daten und im Impressum von `apps/cloud` | `site-map.json:3710-3749`; `public-orientation.ts:84`; `apps/site/src/seo-state.mjs:11,32`; `apps/cloud/app/impressum/page.tsx:13`; `site-map.json:24` („not_verified_for_BV") | Anbieterkennzeichnung muss stimmen; eine nicht bestehende Rechtsform zu führen ist irreführend. Ausgeliefert wird laut Befund ein Impressum, das sich selbst „nicht abschließend freigegeben" nennt (`befund-2026-11-13.md:64`). |
| 2 | **Superlativ:** „Höchste Qualität zu einem fairen Preis" | `config/home-concept-copy.json:85` | Eigene Regel „kein Superlativ ohne Beleg" (`01-produkt-und-marke.md:30`); Irreführungsrisiko (§ 5 UWG wird im Repo selbst genannt). |
| 3 | **Alte Garantie- und Kostenfrei-Aussagen im Altkonzept:** „kostenfreie Rücknahme bei Fehlpassung", „Kein Festpreis ohne Audit – und der hält", „EU-Hosting, AVV", „um ein Vielfaches günstiger" | `Marketingkonzept:36,39`; `01-produkt-und-marke.md:31`; `08-recht-und-compliance.md:31` | Nicht in aktuellen sichtbaren Texten gefunden, aber in Quellen, aus denen Texte abgeleitet werden. Nicht übernehmen ohne Nachweis. |
| 4 | **„Kein kostenloses Modellguthaben" / „einmalig 5 EUR bezahltes Testguthaben" / „keine automatische Abbuchung"** | `site-map.json:4667` | Preis- und Vertragsaussage ohne belegte Preisfreigabe; bei Edition „Privat" Verbraucherpreisangaben nötig (`Masterplan` §2.6). |
| 5 | **KI-Kennzeichnung:** sichtbare Hinweise im Chat entfernt; Risiko im Repo dokumentiert (Art. 50 KI-VO), Regel in `AGENTS.md:198` unverändert | `DECISIONS.md:45-73` | Offener Widerspruch zwischen Entscheidung und Regelwerk. Der volle Name mit „AI Intelligence" verändert die Erkennbarkeit – neu zu bewerten. |
| 6 | **Sachlich veraltete Aussage „ohne Live-KI-Modell"** | `site-map.json:3061,4114` | Falsch, sobald der Chat KI-geführt läuft; dann fehlt zugleich die Datenschutzinformation zur Verarbeitung (`DECISIONS.md:74-78`). |
| 7 | **„Ihre Nachricht wird an OpenAI übermittelt"** neben der Vorgabe DeepSeek/OpenRouter | `assistant-interface-copy.json:62`; `AGENTS.md` | Empfängerangabe muss der tatsächlichen Verarbeitung entsprechen. |
| 8 | **Datenschutz, Vertragsgrundlagen, Cookies ohne Inhalt** („in Prüfung", „Entwürfe") | Seiten `privacy`, `terms`, `cookies` | Pflichtinformationen fehlen bei Veröffentlichung. |
| 9 | **TEILEKLAR-Rechtstexte:** aus dem Prototyp übernommen, „weil der Verkauf aktiv ist"; nennt Schweiz als Markt | `config/teileklar-legal.json:5,14,26` | Widerspricht `fakten.json:162-163` (Lieferländer ohne Schweiz) und der Seite `tk-legal` („Freigabe steht aus"). Verbraucherrecht (Widerruf, Button-Lösung, Preisangaben) ungeprüft. |
| 10 | **TEILEKLAR-Verkäufer:** „NeXify AI (by NeXify) … Eenmanszaak" gegenüber „Historische Einzelunternehmensdaten werden nicht auf NeXify AI FACTORY übertragen" | `fakten.json:157-158`; Seite `tk-legal` | Vertragspartner beim Kauf muss eindeutig sein. |
| 11 | **Preisangaben netto / für Unternehmer** fehlen als fester Hinweis; Rechenbeispiel auf der Startseite | `home-concept-copy.json` (`exampleNote`), `fakten.json:167-180` | Beispiel ist sauber als Beispiel gekennzeichnet; sobald echte Preise kommen, braucht jede Angabe den Hinweis (und für „Privat" Endpreise). |
| 12 | **Marktvergleich** („Veröffentlichte Einstiegspreise dienen nur zur Einordnung") | `home-concept-copy.json` (`benchmarkBody`, `benchmarkDate`) | Vergleichende Werbung nur mit datiertem Beleg; die Quellen selbst habe ich nicht geprüft. |
| 13 | **Regionale Aussage** „für Unternehmen in Venlo, Limburg und NRW" | Start-Metabeschreibung DE | Unkritisch, aber nur in DE gesetzt und nirgends als Entscheidung belegt. |
| 14 | **Zwei Kontaktadressen** (`mail@`, `hello@`) und eine Mobilnummer im Impressum | `site-map.json:3746`; `assistant-interface-copy.json:54` | Erreichbarkeit der Pflichtangaben muss stimmen. |
| 15 | **Altzahlen ohne Beleg** („80+ Websites, 15+ Shops …", „23 % unbeantwortete Anrufe", „26 Std. → 4 Min.") | `01-produkt-und-marke.md:37-39` | Nicht in aktuellen Seiten; nicht verwenden ohne Nachweis und Kennzeichnung. |
| 16 | **KI-erzeugte Bilder/Filme mit realer Person** | Seite `ai-notice` („Bildwelt enthält KI-gestützte Bearbeitungen"); Charakterbibel §7 (Stimmkopie nur mit Freigabe) | Kennzeichnung ist vorhanden; Personen- und Stimmrechte brauchen je Medium eine Freigabe. |
| 17 | **Markenrecht der Namen** („ORACLE" ist auch ein bekannter fremder Unternehmensname; „AIFly", „NeX2fly", „TEILEKLAR") | – | Im Repo kein Hinweis auf Markenrecherche oder Anmeldung. Nicht geprüft; vor Festschreiben des bindenden Namens klären lassen. |
| 18 | **Werbeversand** | `AGENTS.md` (10.11.), `Marketingkonzept:91` | Regeln sind benannt (Einwilligung, Abmeldung, Sperrliste); Umsetzung nicht belegt. |

---

## 6. Zusammenfassung für die Geschäftsführung

1. Der bindende Name steht nirgends im Repo. Arbeitsfassung laut Koordinator: „AIFly ORACLE with NeXify AI Intelligence by NeXify" – Endform bitte bestätigen.
2. Heute gibt es dafür mindestens sieben Schreibweisen (AIFly ORACLE, AI Fly Oracle, Oracle, AIFly, Orakel …); im Chat steht neben der Figur nur „Oracle".
3. Auch die übrigen Namen sind uneinheitlich: NeX Agentic AI / NeX Agentic AIFly, NeX2fly mit und ohne Suite, one/one+ als Altlast; „NeXify AI Intelligence" und „NeX & AIFly ORACLE Suite" sind noch nicht definiert.
4. Wer Anbieter ist, widerspricht sich: Impressum nennt eine Eenmanszaak, andere Stellen „NeXify AI FACTORY B.V.". Das blockiert Impressum, Angebote und Verkauf.
5. Texte sind formal vollständig: 53 Seiten und vier Oberflächendateien in DE/NL/FR/EN ohne leere Felder.
6. Inhaltlich sind sie nicht final: Für die Startseite liegen drei konkurrierende Fassungen vor; NL/FR/EN tragen dort noch die alte.
7. Produkt- und TEILEKLAR-Seiten bestehen überwiegend aus Vorbehalten; sie sagen, was nicht zugesagt wird, aber kaum, was der Kunde bekommt.
8. Interner Jargon ist sichtbar („ohne Live-KI", „Entwicklungsvorschau", „Zielbild"); zwei Seiten behaupten, der Chat laufe ohne KI-Modell – das widerspricht der Entscheidung vom 13.11.
9. Anrede schwankt: Seiten und Chat siezen, Filmtexte und Charakterbibel duzen.
10. Kein einziger freigegebener Preis steht auf den NeXify-Seiten; Datenschutz, Vertragsgrundlagen und Cookies haben keinen Inhalt.
11. Es gibt keine Referenzen, Zahlen oder Kundenstimmen – und sie dürfen nicht erfunden werden. Die Botschaft muss sich auf Vorgehen, Person und klaren Umfang stützen.
12. Vorschlag: Dach NeXify AI (Unternehmen NeXify AI FACTORY), darunter Agentur, vier Produkte, TEILEKLAR als eigene Marke; Kernsatz „Ein Gespräch. Ein Konzept. Ein Auftritt, der arbeitet." mit Claim „Chat it. Automate it."
13. Kanäle: Web ist ausgearbeitet, aber nicht einheitlich ausgeliefert und nicht indexiert; für Social und E-Mail-Marketing gibt es keine Texte.
14. Sofort ausformulierbar ohne neue Fakten: Start-, Leistungs-, Kontaktseiten, Chat-Texte, Handlungsaufrufe, Glossar. Fünf Muster liegen in Abschnitt 4.4.
15. Nötig sind 19 Entscheidungen des Inhabers (Abschnitt 4.1); die sieben der Gruppe A blockieren jede Finalisierung.

## 7. Was ich nicht prüfen konnte

- **Ausgelieferte Seiten im Netz:** nichts abgerufen; Aussagen dazu stammen aus `docs/04-betrieb/befund-2026-11-13.md` und `AGENTS.md`.
- **Ob der Chat live mit einem Modell antwortet:** nur Code und Doku gelesen, kein Server gestartet.
- **Welche der drei Startseiten-Fassungen tatsächlich gerendert wird:** Komponenten nicht bis zur Ausgabe nachverfolgt.
- **Sprachliche Qualität von NL/FR/EN:** nur Vollständigkeit und Stichproben.
- **`config/page-explainers.json` (Erklärmodule) und die 39 Prototypen** (`prototypen/*.dc.html`): nicht im Wortlaut gelesen; Prototypen gelten laut `AGENTS.md` als Referenz, nicht als Text.
- **Masterplan v2.1:** von 4516 Zeilen wurden Kopf, §2 und §15 gelesen, der Rest nur über Suche.
- **Trefferzahlen** schließen Doku, Nachweise und Build-Reste ein; sie sind keine Zählung sichtbarer Stellen.
- **Projektwerkzeuge** `tools/project_skills.py verify` und `tools/context_executor.py` wurden nicht ausgeführt (Auftrag: nur lesen, nichts starten); die Skill-Dateien unter `skills/` wurden nicht gelesen.
- **Mem (durchsucht 14.11.2026):** erreichbar. Treffer zu NeXify vorhanden (u. a. „NeXify AI FACTORY — Steuerungswiki & Umsetzungsplan", geändert 09.11.2026; ältere Notizen vom März 2026). Keine Notiz zu Naming oder Marketing in den ersten zehn Treffern; das Steuerungswiki wurde nicht im Volltext gelesen.
- **Notion (durchsucht 14.11.2026):** erreichbar. Zwei Treffer („Agentur-Wissensmanagement — Bestandsaufnahme und Betriebsstruktur", 09.11.2026; „Projects & Tasks"); keine Seite zu Naming oder Marketing gefunden, Inhalte nicht gelesen.
- **Markenrecht, Rechtsform, Registerdaten, Preise:** nicht prüfbar; nur der Inhaber bzw. Fachberatung kann sie bestätigen.
- **`.env` und Zugangsdaten:** auftragsgemäß nicht geöffnet.
