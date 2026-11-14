# Small-Business-Skills (Fassung 1.35.1) gegen den Python-Laufzeitkern · Bericht 14.11.2026

**Art:** Bewertung, keine Änderung. Die Pins in `config/integrations/small-business.json` und
`config/project-skills.json` sind unverändert. Keine Netzabfrage, kein Modellaufruf, kein Skill ausgeführt.

## 1 · Worauf dieser Bericht beruht – und worauf nicht

| | Stand |
|---|---|
| Gelesen | `config/integrations/small-business.json` (gepinnter Commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`, Plugin-Fassung 1.35.1, 44 Abläufe, 216 Dateien mit Hash, 35 MCP-Registrierungen), `tools/automation/small_business.py`, `docs/automation/small-business.md` |
| **Nicht gelesen** | Die 44 `SKILL.md`-Dateien selbst und ihre 152 Referenzdateien. Die Quellbibliothek liegt außerhalb des Repos in einem Arbeitsverzeichnis-Cache (`.onboarding/small-business/upstream/…`); der ist in dieser Umgebung nicht vorhanden. `python3 tools/automation/small_business.py verify` meldet deshalb `{"status": "blocked", "error": "Source unavailable: LICENSE"}`. Eine Wiederherstellung (`install`) wäre ein Netzabruf und wurde auftragsgemäß nicht ausgeführt |
| Folge | Alle Aussagen über Inhalt und Voraussetzungen stammen aus den im Register festgehaltenen Feldern (`connectors`, `ordered_headings`, `local_reference_paths`, `default_mode`, `native_mapping`). Der Kopf (Frontmatter) der Skill-Dateien ist **nicht** geprüft |
| Gegenprüfung im Kern | `nexify_agent_core.bindungen_aus_small_business()` liest das Register und erzeugt 44 Hash-Bindungen mit zusammen 763 gebundenen Beilagen (Referenzen + 14 gemeinsame Regeln). Test: `tests/test_agent_core_skills.py::test_small_business_register_ergibt_44_bindungen_ohne_etwas_zu_laden` |

## 2 · Kurzbefund

1. **Ladbar ohne Anpassung – auf Ebene Format und Hash-Bindung: alle 44.** Jeder Ablauf hat die Form
   `small-business/skills/<id>/SKILL.md`, die Kennung passt zum Namensmuster des Registers
   (Kleinbuchstaben, Ziffern, Bindestriche, höchstens 64 Zeichen; längste Kennung 21 Zeichen), und der
   Hash ist doppelt gebunden (Ablauf und Dateiinventar stimmen überein). Der Kern kann sie mit der
   Wurzel `<Cache>/small-business` registrieren, ohne das Register oder die Quelldateien zu ändern.
2. **Tatsächlich geladen ist keiner.** Ohne die Quelldateien meldet das Register alle 44 als gesperrt
   (`quelle_fehlt`) – so ist es gewollt: nichts gilt als geladen, was nicht Byte für Byte geprüft wurde.
   Ob jeder Kopf vom engen Kopfleser des Kerns angenommen wird (Name = Ordnername, Beschreibung
   vorhanden und höchstens 1024 Zeichen), ist erst mit vorhandener Quelle prüfbar. Hinweis: Das längste
   im Register festgehaltene Auslöserfeld hat 947 Zeichen; ob es dem Beschreibungsfeld entspricht, ist
   nicht belegt.
3. **Ausführbar ist im Laufzeitkern heute keiner.** Der Kern liefert bewusst kein einziges Werkzeug mit.
   Ein geladener Skill ist Text im Verlauf eines Laufs; jede Wirkung braucht ein angemeldetes Werkzeug
   mit Aktionsklasse. Alle 44 Abläufe tragen im Register `default_mode: approval`, und alle 186
   zugeordneten nativen Operationen stehen auf `proposed_not_implemented`.
4. **34 von 44 setzen für ihren Hauptweg benannte Fremddienste voraus**, die hier nicht verbunden sind
   (alle 35 MCP-Registrierungen: `upstream_declaration_not_connection`). 10 kommen laut Quelle ohne
   Dienst aus.
5. **Skripte enthält die gepinnte Bibliothek nicht:** 212 Markdown-Dateien, 2 JSON-Dateien, 1 HTML-Beispiel,
   1 Lizenzdatei. Das Verbot des Kerns, Skill-Skripte zu binden oder zu starten, trifft hier auf nichts.

## 3 · Was die Skills voraussetzen und der Kern nicht hat

| Voraussetzung laut Register | Betroffen | Im Laufzeitkern |
|---|---|---|
| Verbundene Fremddienste (Buchhaltung, Zahlungsanbieter, CRM, Mail, Kalender, Ablage, Shop, Anzeigen, Lohn) | 34 Abläufe (Spalte „D") | Kein Werkzeug, keine Verbindung, keine Zugangsdaten. Jeder Dienst wäre ein eigenes Werkzeug mit Mandantenbindung, Aktionsklasse und – bei Versand, Zahlung, Vertrag, Löschung, Rechteänderung – Freigabepunkt; dazu je Dienst ein Vertrag und ein Datenfluss, den der Inhaber entscheiden muss |
| Datei-Eingang (CSV, XLSX, PDF, Foto, eingefügter Text) als Weg ohne Dienst | 25 Abläufe (Zusatz „U") | Kein Datei- oder Upload-Werkzeug. Der Weg „ohne Dienst" ist damit ebenfalls nicht nutzbar, solange ein lesendes Dateiwerkzeug fehlt |
| Webzugriff (Abruf, Recherche, Crawl) | 7 Abläufe (Zusatz „W") | Kein Netzwerkzeug; der Kern macht keine Netzaufrufe. Ein Web-Werkzeug wäre Klasse „lesen", bringt aber fremde Inhalte als Daten in den Lauf |
| Dokumente erzeugen (DOCX/PDF, Berichte, gestaltete Ausgaben; gemeinsame Regeln `shared/artifact-style.md`, `shared/document-format.md`) | u. a. `proposal-builder`, `report-builder`, `report-pack`, `monday-brief` | Kein Erzeuger. Ausgabe wäre ein Werkzeug „schreiben intern"; die Gestaltung folgt dem eigenen Designsystem, nicht der Beispielpalette der Quelle (`docs/automation/small-business.md`) |
| Wiederkehrende Ausführung (Kadenz) | `build-agent`, Ketten mit „cadence"-Schritt (`marketing-monday`, `monday-brief`, `report-pack`, `restock`) | Kein Zeitplaner. Die Quelle selbst enthält keinen (`shared/chain-seams.md` laut `small-business.md`) |
| Verbindungen bauen (Zapier, Emergent) | `build-connector` und alle, die darauf verweisen | Nicht vorgesehen; neue Verbindungen sind hier eigene geprüfte Adapter, kein Ergebnis eines Skill-Laufs |
| Verkettung mehrerer Skills | 11 Ketten | Strukturell abbildbar: ein Lauf mit mehreren Skill-Rechten oder Unterläufe je Teil-Skill. Voraussetzung ist, dass die verketteten Einzel-Skills selbst nutzbar sind |
| Steuerrechnung nur für US-Unternehmen | `tax-prep`, `tax-season-organizer` (Zusatz „US") | Für die niederländische B.V. fachlich nicht anwendbar; nicht umetikettieren (`small-business.md`, Abschnitt „Übernommene Grenzen") |
| Für ein anderes Modell geschrieben | alle 44 | Die Skills sind für Claude verfasst. Mit dem Modell aus `config/llm-policy.json` ist keiner erprobt; ein Eignungstest je Skill braucht Modellzugang und Budget und steht aus |

Im Register genannte Dienste (35 MCP-Registrierungen, keine verbunden): `airwallex-agentos`, `apollo-io`,
`atlassian-rovo`, `canva`, `clay`, `docusign`, `emergent`, `expensify`, `gmail`, `google-calendar`,
`google-drive`, `gusto`, `hubspot`, `intuit-mailchimp`, `intuit-quickbooks`, `monday-com`, `myob`, `notion`,
`paypal`, `ramp`, `ringex-chat`, `shopify`, `slack`, `square`, `stripe`, `tiktok`, `trello`, `wix`, `xero`,
`zapier`, `zoho-books`, `zoho-crm`, `zoho-desk`, `zoho-projects`, `zoom`.

## 4 · Einstufung je Skill

Mechanisch aus den Registerfeldern abgeleitet (Felder `required_category_or_source` bzw.
`command_gate_to_start`, `zero_connector_fallback`, `optional_sources`, Überschriften). Die englischen
Angaben sind wörtlich aus dem Register übernommen.

- **O** = laut Quelle ohne Fremddienst nutzbar · **D** = Hauptweg setzt benannte Dienste oder eine Datenquelle voraus
- **W** = Webzugriff erwähnt · **U** = Datei-/Text-Eingang als Weg genannt · **US** = Steuerrechnung nur USA
- **Art:** Einzel-Skill, Kette (ruft andere Skills der Bibliothek in fester Folge) oder Einstieg (Router)

| Skill | Gruppe | Art | Einstufung | Vorausgesetzt laut Register | Weg ohne Dienst laut Register | Beilagen |
|---|---|---|---|---|---|---|
| `business-pulse` | briefings | Einzel | O · U | none | builds from whatever exists, or pasted data | 5 |
| `monday-brief` | briefings | Kette | O | none — degrades gracefully | – | 0 |
| `contract-review` | customers | Einzel | O · U | none (file upload) | file upload is the primary mode | 5 |
| `grant-rfp-writer` | customers | Einzel | D · W U | Drive or M365 | document upload + web search | 5 |
| `proposal-builder` | customers | Einzel | D · U | Drive or M365 | uploads in, DOCX/PDF out | 5 |
| `ticket-deflector` | customers | Einzel | D · U | a payments connector (PayPal, Square, or Stripe), a CRM, or Mail | pasted text | 3 |
| `ap-processor` | finance | Einzel | D · U | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) + Mail (Gmail or M365) | PDF/photo bill upload, entries exported | 5 |
| `cash-flow-snapshot` | finance | Einzel | D · U | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) or a payments connector (PayPal, Square, or Stripe) | CSV upload | 3 |
| `close-month` | finance | Kette | D | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) | – | 0 |
| `invoice-chase` | finance | Einzel | D · U | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) | AR CSV in, drafted reminders out | 5 |
| `month-end-prep` | finance | Einzel | D · U | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) | statement/CSV uploads | 8 |
| `pay-the-bills` | finance | Kette | D | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) + Mail (Gmail or M365) | – | 0 |
| `payroll-prep` | finance | Einzel | D · U | Gusto or QuickBooks Payroll | timesheet upload → validated run sheet | 5 |
| `plan-payroll` | finance | Kette | D | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books); Gusto or QuickBooks Payroll for the timesheet leg | – | 0 |
| `report-builder` | finance | Einzel | D · U | any one data source | CSV/XLSX upload — fully functional | 5 |
| `report-pack` | finance | Kette | D · U | any one data connector, or CSV | – | 0 |
| `tax-prep` | finance | Kette | D · US | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books); the tax math runs only for a US business | – | 0 |
| `tax-season-organizer` | finance | Einzel | D · U US | a ledger (MYOB, NetSuite, QuickBooks, Xero, or Zoho Books) | CSV/document upload; the tax math is US-only ('../../../shared/currency-and-locale.md') | 6 |
| `ad-manager` | marketing | Einzel | D · U | TikTok Ads (native); other ad platforms via a 'build-connector' Zapier connection | CSV performance exports — the common path today | 5 |
| `canva-creator` | marketing | Einzel | D | Canva, HubSpot | brief in; calendar, copy, and asset briefs out for manual design and posting | 4 |
| `content-strategy` | marketing | Einzel | D · U | QuickBooks or PayPal | sales CSV | 2 |
| `growth-pulse` | marketing | Einzel | D · U | HubSpot + one revenue source | CSV exports | 4 |
| `marketing-monday` | marketing | Kette | D · W | any one of PayPal / Shopify / HubSpot; TikTok Ads adds the paid-spend layer | – | 0 |
| `review-reputation` | marketing | Einzel | D · W U | a CRM, a payments connector (PayPal, Square, or Stripe), or a storefront (Shopify or Square) | pasted/exported reviews + web | 5 |
| `seo-ai-visibility` | marketing | Einzel | O · W | none (web-native) | crawls any public site | 5 |
| `social-content-engine` | marketing | Einzel | D | Canva | calendar + copy + briefs for manual posting | 6 |
| `hiring-screener` | operations | Einzel | D · U | Mail (Gmail or M365) + Calendar | resume uploads, drafts for manual send | 5 |
| `inbox-manager` | operations | Einzel | D · U | Gmail or M365 | pasted/forwarded email text | 5 |
| `inventory-planner` | operations | Einzel | D · U | Shopify or Square | sales + stock CSV | 5 |
| `job-post-builder` | operations | Einzel | O | none | fully standalone | 8 |
| `restock` | operations | Kette | D · U | Shopify, Square, or CSV | – | 0 |
| `call-list` | sales | Kette | D | HubSpot; Mail (Gmail or M365) adds email context, Google Calendar adds the blocks, Apollo or Clay adds company fit (metered, asked once) | – | 0 |
| `crm-autopilot` | sales | Einzel | D | a CRM (HubSpot, Monday.com, Salesforce, or Zoho CRM) | built-in spreadsheet CRM | 6 |
| `grow-pipeline` | sales | Kette | D · W | Apollo or Clay, + HubSpot | – | 0 |
| `lead-finder` | sales | Einzel | D · W U | Apollo or Clay | web research + customer CSV | 5 |
| `lead-triage` | sales | Einzel | D · U | HubSpot | pasted/uploaded lead list | 3 |
| `outreach-composer` | sales | Einzel | D · U | Gmail or M365 | draft-only, paste anywhere | 4 |
| `reactivate` | sales | Kette | D | a CRM, a payments connector (PayPal, Square, or Stripe), or a storefront (Shopify or Square); a ledger and a support desk add invoice and service history | – | 0 |
| `speed-to-lead` | sales | Einzel | D · U | HubSpot + Mail (Gmail or M365) | forwarded/pasted inquiries | 4 |
| `brand-style` | setup | Einzel | O · W | none | plain-words brand description; house default on skip | 0 |
| `build-agent` | setup | Einzel | O | none | native | 3 |
| `build-connector` | setup | Einzel | O | none | it builds the fallback | 4 |
| `smb-onboard` | setup | Einzel | O | none | interview-based, recommends what to connect | 3 |
| `smb-router` | setup | Einstieg | O | – | – | 1 |

Summen: 34 × D, 10 × O · 32 Einzel-Skills, 11 Ketten, 1 Einstieg · 25 × U, 7 × W, 2 × US.

Anmerkungen zu Grenzfällen der mechanischen Einstufung:

- `report-builder`, `report-pack`, `restock`: als D geführt, weil eine Datenquelle Pflicht ist; laut
  Register genügt dafür eine CSV-Datei.
- `brand-style`: Webabruf ist dort nur eine optionale Quelle.
- `build-agent`, `build-connector`, `smb-onboard`: laut Register ohne Dienst, ihr Zweck (Zeitplan
  einrichten, Verbindung bauen, Onboarding-Interview) ist im Laufzeitkern aber nicht vorgesehen bzw. für
  NeXify ausdrücklich nicht gewünscht (kein erneutes Onboarding, `AGENTS.md`).
- `smb-router`: reiner Wegweiser auf 32 andere Skills; für den Kern ersetzt ihn das Skill-Verzeichnis
  (Stufe 1 des Registers) nicht automatisch, weil die Auswahl ein Modell trifft.

## 5 · Was daraus folgt (Vorschlag, keine Entscheidung)

| Stufe | Skills | Was fehlt bis zur Nutzung |
|---|---|---|
| 1 · Zuerst erprobbar | `job-post-builder`, `contract-review`, `business-pulse` (mit eingefügten Daten), `brand-style` (ohne Web) | Quelle installieren und Hash prüfen; Modellanbindung über den eigenen Router; Eignungstest mit dem Policy-Modell; für `contract-review` ein lesendes Dateiwerkzeug. Ausgabe bleibt Entwurf |
| 2 · Mit Dateiwerkzeug | die 25 mit „U", auf dem Weg ohne Dienst | lesendes Dateiwerkzeug je Mandant; Prüfung, dass fehlende Daten nicht als null gelten (`shared/absent-is-not-zero.md`) |
| 3 · Mit je einem Dienst | die 34 mit „D" | je Dienst: Entscheidung des Inhabers (Vertrag, Kosten, Datenfluss, Verarbeitungsort), geprüfter Adapter als Werkzeug, Freigabepunkte für alles, was nach außen wirkt |
| Nicht vorgesehen | `tax-prep`, `tax-season-organizer` (US-Steuerpfad), `build-connector` (fremder Verbindungsweg), `smb-onboard` | – |

## 6 · Offene Punkte

| Punkt | Zuständig | Nächste Aktion |
|---|---|---|
| Quellbibliothek ist in dieser Umgebung nicht vorhanden; Kopfformat der 44 Skills ungeprüft | Projektleitung | `small_business.py install` in einer Umgebung mit erlaubtem Abruf, danach `verify` und Register-Ladeprobe aller 44 mit dem Kern |
| Fassung 1.35.2 der Quelle ist laut Konzept erschienen; Pin bleibt auf 1.35.1 | Inhaber / Projektleitung | bewusster Hash-Vergleich und Pin-Entscheidung; nicht Teil dieses Berichts |
| Eignung mit dem Policy-Modell | Inhaber (Budget) | fester Prüffall je Skill, Ergebnis bestanden/ungeeignet |
| Dienste aus Abschnitt 3 | Inhaber | je Dienst entscheiden; bis dahin bleibt nur der Weg ohne Dienst |
