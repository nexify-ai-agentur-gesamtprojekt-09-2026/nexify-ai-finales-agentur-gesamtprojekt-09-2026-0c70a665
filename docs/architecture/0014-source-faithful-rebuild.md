# 0014 – Quelltreuer Neuaufbau des Gesamtsystems

Status: Architektur-/Quellenvertrag vom 26.10.2026, **keine implementierte oder abgenommene Gesamtportierung**. Maschinenlesbare Herkunft und jede einzelne Einheit: [`config/rebuild-source-map.json`](../../config/rebuild-source-map.json). Diese Aufgabe verändert keine Originaldatei, Oberfläche, Preisregel, Rechtstext oder Abnahmestatus.

## 1. Verbindlicher Ausgangspunkt

Der Nutzer hat die neue Oberfläche zurückgewiesen. Die bisherige Aufteilung in einfache Textkarten ist kein akzeptierter Ersatz für die Originalgestaltung, deren vollständige Inhalte oder die fachlichen Abläufe. Bereits vorhandene Routen sind als Verweisstruktur inventarisiert; ihre Existenz ist kein Nachweis einer vollständigen Portierung.

Maßgeblich ist die aktuelle Screenshotvorgabe: Hero **„Mehr Zeit für Kunden“**, Pascal als ganze Person, NeX als Orb, AIFly als Vogel, Graphit/Lime und die Headerpunkte **Produkte, Leistungen, Ressourcen, Unternehmen, Preise**. Die Screenshotbeschreibung wurde vom Root-Agenten als ausdrückliche Nutzeranforderung übergeben; in diesem Teilauftrag wurden die Bildbytes nicht unabhängig untersucht. Daraus wird kein erfundener Screenshot-Dateipfad oder visueller Abnahmebeleg abgeleitet.

Die eigenen Originale bleiben die weiteren Design-/Verhaltensquellen: insbesondere `NeXifyAI Cloud v12.dc.html`, Header, Footer, Designsystem, Portale, Shop- und Werkzeugprototypen sowie die zugehörigen CSS-/Script-/Assetreferenzen. Neuere explizite Nutzerentscheidungen haben bei echten Widersprüchen Vorrang; Abweichungen werden sichtbar erfasst, nicht durch stilles Weglassen beseitigt.

## 2. Vollständigkeit und Herkunft

Der aktuelle Katalog und `git ls-files` enthalten **94 HTML-Dateien**: 48 aus N1, 46 aus N2. Das sind **93 erhaltene Original-/Referenzquellen plus `N1:apps/site/index.html` als aktueller Implementierungseinstieg**. Letzterer ist keine akzeptierte neue Designautorität. Die Katalogpfade decken die getrackten HTML-Dateien exakt ab. Alle 94 Arbeitsdateien und alle 94 entsprechenden HTML-Objekte von `origin/main` stimmen mit den Kataloghashes überein. `origin/main` wurde hier als `07833fb3f8166a3f8534f52bb1c1843c49f40919` gelesen; HEAD und Eingabehashes stehen im JSON.

N2 liegt kanonisch unter `reference/handoff-n2/`. Acht exakte Quell-Dublettengruppen bleiben einzeln erhalten; gleiche Dateinamen mit abweichenden Bytes bleiben historische Varianten. Das pausierte externe A1-Kundenprojekt wird nicht zum Agentursystem oder zu dessen Lieferabhängigkeit gemacht.

Inventarisiert sind **28,498 statisch adressierbare Einheiten**. Die Mengen dienen der Nachvollziehbarkeit, nicht als Prozentwert fertiger Funktion:

| Einheit | Anzahl |
|---|---:|
| `resource_reference` | 213 |
| `script_source_block_integrity` | 249 |
| `heading` | 717 |
| `navigation_link` | 604 |
| `script_contract_candidate` | 247 |
| `css_style_block` | 219 |
| `structural_section` | 675 |
| `conditional_or_state_markup` | 1672 |
| `dynamic_binding_symbol` | 8090 |
| `inline_style_declaration` | 13484 |
| `function_action` | 1434 |
| `auth_state_signal` | 438 |
| `control` | 308 |
| `form` | 60 |
| `api_marker` | 68 |
| `backend_requirement_note` | 20 |

Die Grenzen bleiben ausdrücklich: Custom-DSL, wiederholte/dynamisch erzeugte Inhalte und JavaScript-Zustandswechsel benötigen eine weitere AST-/Laufzeitprüfung. Ein Bindungssymbol ist keine ausgeführte Funktion. Die Inventarisierung darf deshalb nicht als bereits vollständiger Laufzeit-Zustandsautomat bezeichnet werden. Die Originalbytes bleiben für jeden weiteren Abgleich erhalten.

## 3. Abschnitt → Funktion/Zustand → Ziel → Backend → Status

Jede Quelle behält Original-ID, Pfad, SHA-256, Zweck, Rolle, Domain und vollständige Liste ihrer Einheiten. Jede Einheit besitzt eine stabile ID, einen Quellbezug beziehungsweise Katalogpointer, ihre Beobachtung und einen offenen Status. `source_id` verweist auf die Quelle; `target_profile_id` auf ein normalisiertes Zielprofil; `backend_dependency_set_id` auf die fachliche Abhängigkeitsmenge. Die Normalisierung entfernt nur wiederholte Metadaten, keine Einheiten.

Die Zielprofile enthalten vorgeschlagene Komponentenfamilien und passende vorhandene Routenkandidaten. Dies sind **quellenrollenbasierte Vorschläge**, keine bestätigte 1:1-Abschnittszuordnung oder bereits existierende Komponente. Fehlende Kandidaten bleiben leer sichtbar. Auch eine direkte bisherige IA-Referenz beweist keine Abschnittsübernahme. Erst die konkrete Abschnitts-/Variantenprüfung darf das Ziel verbindlich machen.

Backendanforderungen sind pro Quelle aus den dokumentierten Domains und vorgeschlagenen Fähigkeiten übernommen. Ein konkreter Button wird dadurch noch keiner erfundenen API zugeordnet. Für die einzelne Aktion bleibt die Endpunkt-/Eigentums-/Tenant-/Idempotenzbindung offen. Keine der Einheiten erhält durch dieses Dokument Inhalts-, visuelle oder Laufzeitabnahme.

CSS bleibt Teil der Quelle: Erfasst werden Styleblockhashes, Selektoren, Media Queries, Keyframes, Tokenreferenzen sowie jede Inline-Stilposition mit Hash und Eigenschaftsnamen. Dies erhält die Prüfung von Komposition, Abständen, responsivem Verhalten, Bewegungs-/Fokuszuständen und ihren Originalstellen. Es legitimiert keine pauschale Übernahme ungeprüfter Inlinewerte an der Tokenregel vorbei.

## 4. Gesamtsystem und funktionale Verantwortungen

| Bereich | Quelltreuer Zielumfang | Direkte und indirekte Abhängigkeiten |
|---|---|---|
| Öffentlicher Agenturauftritt | Screenshot-Hero, Originalsektionen, Leistungen, Produkte, Ressourcen, Unternehmen, Preise, Kontakt, Header/Footer | Originaldesign/Tokens/Assets, redaktionell geprüfte Aussagen, Sprachen, Datenschutz, direkte rechtliche Zugänge |
| Suite / one / API | Offene Registrierung, Trial, Modellauswahl, BYOK, Nutzungsstatus und Konvertierung ohne Einstellungsverlust | Identität, Mitgliedschaft, serverseitige Berechtigungen, Entitlement-/Trial-Uhr, Modellkatalog, Credential-Vault, Usage/Limits, Wallet/Ledger und Payment-Webhooks |
| NeX und AIFly | Quellzustände, Orientierung, strukturierte Angebote/Termine/Marketing und echte ausgewiesene Ausführungszustände | Quellen-/Toolrechte, Providervertrag, Freigaben, Besitzprüfung, Dokumentgenerierung, Mail/Kalender, tatsächliche Ausführungsbelege |
| TEILEKLAR | Fahrzeug/Passung, Suche, Kategorien, Produkt, Warenkorb, Checkout, Gutscheine und Werkstattpfade | Verifizierter Teilekatalog/Lieferanten, Fahrzeugzuordnung, Bestand/Preise/Versand, Consumerpflichten, Zahlung/Retouren, Kalender, Gutschein- und Partnerledger |
| Kunden-/Partner-/Affiliatebereiche | Originalansichten und Bearbeitungsabläufe, nicht bloß öffentliche Statuskarten | Tenant-/Site-/Rollenbindung, Eigentum, Projekte, Rechnungen, Dokumente, Provisionen, Partnerfreigaben und prüfbare Datenquellen |
| Intern | Workspace, Posteingang, Leitstand, Verwaltung, Organisation, Ziele und Systemarchitektur | Interne Identität/MFA, getrennte Schreibfreigaben, Provider-Ingestion, Audit/Monitoring, Knowledge/Memory und kontrollierte Änderungen |
| E-Mail / Druck / Geschäftsdokumente | Originalvorlagen, Broschüren, Präsentationen und Visitenkarte als eigener Ausgabekontext | Geprüfte Unternehmensdaten, freigegebene Inhalte/Preise, Dokumentrenderer, Empfänger-/Versandfreigabe; keine automatische Veröffentlichung |

Das bestehende Visitor-Fundament belegt nicht sämtliche oben genannten Backendfunktionen. Statisches Frontendhosting stellt weder die Python-/Datenbankdienste noch Billing, Providerzugriff oder Mandantenrechte automatisch bereit. Bestehende Tests einzelner Fundamente sind keine pauschale Produktionsabnahme des Gesamtsystems.

## 5. Neue Selfservice-Vorgabe

Als ausdrückliche neue Nutzerentscheidung sind festgehalten: offene Registrierung, **24 Stunden freie Suite**, gewünschte **70+ BYOK-Modelloptionen** oder eine **5-EUR-Testaufladung** über NeX mit dem gewünschten DeepSeek-Modell und dem vorläufigen Namen **JavAI**. Dies sind gewünschte Produktregeln, keine Behauptung bereits verfügbarer Modelle, eines aktiven Gratisbetriebs oder eines freigegebenen Zahlungsprozesses.

Die verifizierte bestehende DeepSeek-Kennung aus dem eigenen Automationsvertrag ist `deepseek/deepseek-v4.1-flash-1017`. Deren bisheriger Revieweinsatz beweist noch keine freigegebene Suite-Inferenz. Für JavAI wird **keine Backend-/Modell-ID erfunden**; sie bleibt `null`. Ebenso wird keine Liste von 70 angeblich funktionierenden BYOK-Modellen erzeugt. Der tatsächliche Katalog, Fähigkeiten, Providerbedingungen und Verfügbarkeit müssen nachgewiesen werden.

Die Trialdauer ist vorgegeben; der auslösende Startzeitpunkt ist hier nicht festgelegt. Benötigt werden eine nachvollziehbare serverseitige Entitlement-Uhr, verständliche Grenzen/Fehlerzustände, Usage- und Kostenkontrolle, tatsächlicher BYOK-Vault und ein idempotenter Zahlungs-/Guthabenfluss. BYOK-Secrets gehören nicht in öffentliche ENV, Browserpersistenz oder frei lesbare Kontoeinstellungen. Eigene Providerkosten werden nicht stillschweigend als kostenlos behauptet.

Bei der Konvertierung müssen Kontoidentität, freigegebene Arbeitsumgebung und gewählte Einstellungen erhalten bleiben. Modell-/Providerwahl und bestehende autorisierte Credentialbindungen dürfen nicht durch einen Neuaccount, stillen Reset oder unbegründete erneute Eingabe verloren gehen. Kontoregistrierung allein erteilt weiterhin keine Admin- oder fremden Mandantenrechte.

## 6. Konkrete Zieljourneys und Folgeseiten

| Journey | Schritte | Wahrer Endstatus |
|---|---|---|
| Agenturprojekt | Originaler Hero → passende Leistung → Originalerklärung/Beispiele → konkreter Umfang → Entwurf/PDF oder Gesprächsanfrage | Entwurf bleibt Entwurf, Versand/Buchung erst nach realem Beleg |
| Suite selbst starten | Offene Registrierung → Identitätsprüfung → Trial/BYOK/Testguthaben wählen → Modell-/Werkzeugkonfiguration → Suite verwenden | Registrierung, Berechtigung und Providerbereitschaft getrennt nachweisen |
| Suite konvertieren | Trial/BYOK/Testverbrauch → passenden Übergang wählen → tatsächliche Zahlungs-/Entitlementbestätigung → gleiche Arbeitsumgebung weiterverwenden | Einstellungen und Eigentum bleiben erhalten; kein fingierter Geldeingang |
| TEILEKLAR kaufen | Fahrzeug → belegte Passung → echte Suche/Kategorie → Produkt → Warenkorb → geprüfter Consumer-Checkout → Zahlung/Bestellung | Ohne angeschlossene echte Daten und Bestellfunktion bleibt der Schritt offen, nicht fake-erfolgreich |
| Werkstatt/Partner | Betrieb/Anliegen → geprüfte Profilangaben bzw. Partnerprüfung → Terminwunsch → externer Kalender-/Betriebsbeleg | Anfrage ist weder bestätigte Partnerschaft noch bestätigter Termin |
| Kunden/Partner intern weiterarbeiten | Echte Anmeldung → serverseitige Site-/Tenant-/Rollenprüfung → passende originale Portalansicht → autorisierte Aktion → Auditbeleg | Keine Daten-/Schlüssel-/Abrechnungsfreigabe durch bloßen Clientzustand |

Die bisherigen 45 Routen und neun registrierten Journeys bleiben als Herkunft dokumentiert. Neue Suite-Innenansichten, Model Catalog, BYOK Settings, Trial/Wallet und Conversion benötigen bewusste Route-/Komponentenentscheidungen; dieses Dokument erfindet dafür keine bereits funktionierenden URLs.

## 7. Echte Inhaltswidersprüche

| Konflikt | Befund | Umgang |
|---|---|---|
| `hero_authority` | Screenshot requests Mehr Zeit für Kunden and Pascal/orb/bird; original v12 H1 says Routine erledigt ein Agent.Sie entscheiden. and uses a different dynamic hero flow. | Current explicit screenshot composition/headline governs the new hero; preserve the original sections/functions as reviewable content, do not claim identical old markup. |
| `test_topup_minimum` | New requested 500-cent test topup differs from existing 1000-cent minimum and older legal draft proposing 50 EUR. | Record new user instruction; update its scoped commercial/ledger/legal implementation deliberately. This task does not modify price configs or pretend payment is enabled. |
| `suite_selfservice_vs_agency_project_entry` | Earlier curated IA centers agency inquiry/scope; this does not implement open trial entitlements, BYOK, model selection or settings-preserving conversion. | Treat suite onboarding and entitlement as distinct missing functionality, not a substitute contact/chat card. |
| `legacy_claims_not_operational_evidence` | Original marketing/prototypes contain example metrics, hosting/ownership/price/automation claims and old identity details; these cannot be promoted to verified current operational facts. | Preserve and flag claim-bearing source units for factual/legal review; no invented results or copying historical identity into current B.V. data. |
| `historical_variants` | Same N1/N2 filename can contain different content; matching filename is not equivalent behavior. | Keep all historical identities and hash differences until explicit reviewed reconciliation. |

Insbesondere wird die neue 5-EUR-Testentscheidung nicht heimlich durch die bestehende Mindestaufladung von 10 EUR ersetzt; umgekehrt werden Preis-/Ledger-/Rechtstexte hier nicht ungeprüft umgestellt. Die ältere rechtliche Vorschlagszahl von 50 EUR ist ebenfalls als historische Abweichung sichtbar. Alte Unternehmensangaben, Beispielkennzahlen und Hosting-/Leistungsversprechen aus Prototypen sind keine bestätigten aktuellen B.V.- oder Betriebsfakten.

## 8. Grenzen externer Quellen

Die ChatGPT-Suite-URL wurde laut übergebenem HTTP-Befund mit **403** beantwortet, `https://nexifyai.cloud/` mit **404**. Diese Befunde wurden in diesem Teilauftrag nicht neu angefragt. Es wird weder ein Zugriff umgangen noch Zugriff auf den Anwendungscode dieser Dienste behauptet. Originaldateien und aktuelle Screenshot-/Produktvorgaben bleiben die belastbare Arbeitsgrundlage.

## 9. Vollständiges Quellenregister

Alle aufgeführten Quellen besitzen im JSON ihre vollständigen Unit-IDs und individuellen Status. Die Routenkandidaten sind Vorschläge und dürfen nicht als akzeptierte Portierung gelesen werden.

| Quellen-ID | Rolle | Statische Einheiten | Bestehende direkte IA-Referenzen | Status |
|---|---|---:|---|---|
| `N1:apps/site/index.html` | `reference_navigation` | 2 | — | Implementierungseintrag; keine Designautorität |
| `N1:apps-index.html` | `reference_navigation` | 14 | — | Wiederaufbau / Abnahme offen |
| `N1:docs/projektseiten/Architektur.dc.html` | `internal_architecture_reference` | 183 | — | Wiederaufbau / Abnahme offen |
| `N1:docs/projektseiten/NeXify Organisation.dc.html` | `internal_administration` | 131 | — | Wiederaufbau / Abnahme offen |
| `N1:docs/projektseiten/Start.dc.html` | `reference_navigation` | 114 | — | Wiederaufbau / Abnahme offen |
| `N1:docs/projektseiten/Zielverfolgung.dc.html` | `internal_goal_tracking` | 87 | — | Wiederaufbau / Abnahme offen |
| `N1:packages/ui/index.html` | `design_reference` | 6 | — | Wiederaufbau / Abnahme offen |
| `N1:preview-prototypes.html` | `reference_navigation` | 32 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/API-Rechtliches.dc.html` | `legal_reference` | 59 | `api` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Affiliate-Portal.dc.html` | `affiliate_portal` | 167 | `affiliate-portal` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Anmeldung.dc.html` | `authentication` | 332 | `login`, `signup` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Batterie-Berater.dc.html` | `public_tool` | 154 | `tk-fitment` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/E-Mail-Marketing-Newsletter.html` | `email_template` | 48 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/E-Mail-Transaktional-Angebot.html` | `email_template` | 36 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Fitment-Checker.dc.html` | `public_tool` | 131 | `tk-product`, `tk-fitment` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | `print_document_reference` | 219 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Investoren-PowerPoint.dc.html` | `print_document_reference` | 152 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Konto.dc.html` | `account_portal` | 244 | `tk-account` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Kundenbroschuere.dc.html` | `print_document_reference` | 150 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Kundenportal.dc.html` | `customer_portal` | 287 | `apps-portals`, `scope`, `login`, `signup`, `customer-portal` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Kundenwege.dc.html` | `customer_portal` | 402 | `scope`, `knowledge-start` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NX-Footer.dc.html` | `shared_component` | 186 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NX-Header.dc.html` | `shared_component` | 154 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NX-Intern.dc.html` | `internal_navigation` | 62 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Nachbarschaftskunden-Portal.dc.html` | `neighbourhood_portal` | 357 | `tk-appointments`, `tk-vouchers`, `tk-neighbourhood` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify AI one.dc.html` | `public_ai_product` | 465 | `automation`, `solutions`, `one` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify API.dc.html` | `public_ai_product` | 477 | `pricing`, `api`, `api-console` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Designsystem.dc.html` | `design_reference` | 313 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Leitstand.dc.html` | `internal_control` | 370 | `internal-control` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Posteingang.dc.html` | `internal_inbox` | 215 | `internal-inbox` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Shop.dc.html` | `demo_commerce_reference` | 674 | `tk-checkout` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Systemkarte.dc.html` | `internal_architecture_reference` | 65 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify Workspace.dc.html` | `internal_workspace` | 1044 | `automation`, `internal-workspace` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXify-AI-Companion.dc.html` | `public_ai_assistant` | 127 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXifyAI Cloud v12.dc.html` | `public_agency_site` | 715 | `home`, `services`, `websites`, `solutions`, `pricing`, `company`, `contact` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | `public_content` | 63 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | `public_content` | 62 | `knowledge`, `knowledge-start` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Partner-Broschuere.dc.html` | `print_document_reference` | 102 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Partner-PowerPoint Werkstatt.dc.html` | `print_document_reference` | 141 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Partner-werden.dc.html` | `public_partner_content` | 150 | `tk-partner` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Partnerportal.dc.html` | `partner_portal` | 464 | `apps-portals`, `tk-vouchers`, `tk-partner`, `tk-partner-portal` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Rechtliches.dc.html` | `legal_reference` | 59 | `imprint`, `privacy`, `terms`, `ai-notice`, `accessibility`, `cookies`, `tk-legal` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Reifenrechner.dc.html` | `public_tool` | 214 | `tk-fitment` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/TEILEKLAR Shop.dc.html` | `production_commerce_reference` | 3390 | `solutions`, `tk-home`, `tk-search`, `tk-categories`, `tk-category`, `tk-product`, `tk-cart`, `tk-checkout`, `tk-legal` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | `print_document_reference` | 90 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/Werkstatt-Partnerseite.dc.html` | `public_partner_content` | 190 | `tk-appointments`, `tk-workshop` | Wiederaufbau / Abnahme offen |
| `N1:prototypen/index.html` | `reference_navigation` | 2 | — | Wiederaufbau / Abnahme offen |
| `N1:prototypen/myADMIN v2.dc.html` | `internal_administration` | 1256 | `apps-portals`, `internal-admin` | Wiederaufbau / Abnahme offen |
| `N2:apps-index.html` | `reference_navigation` | 14 | — | Wiederaufbau / Abnahme offen |
| `N2:docs/projektseiten/Architektur.dc.html` | `internal_architecture_reference` | 183 | — | Wiederaufbau / Abnahme offen |
| `N2:docs/projektseiten/NeXify Organisation.dc.html` | `internal_administration` | 131 | — | Wiederaufbau / Abnahme offen |
| `N2:docs/projektseiten/Start.dc.html` | `reference_navigation` | 114 | — | Wiederaufbau / Abnahme offen |
| `N2:docs/projektseiten/Zielverfolgung.dc.html` | `internal_goal_tracking` | 87 | — | Wiederaufbau / Abnahme offen |
| `N2:packages/ui/index.html` | `design_reference` | 6 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/API-Rechtliches.dc.html` | `legal_reference` | 54 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Affiliate-Portal.dc.html` | `affiliate_portal` | 162 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Anmeldung.dc.html` | `authentication` | 327 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Batterie-Berater.dc.html` | `public_tool` | 149 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/E-Mail-Marketing-Newsletter.html` | `email_template` | 48 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/E-Mail-Transaktional-Angebot.html` | `email_template` | 36 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Fitment-Checker.dc.html` | `public_tool` | 126 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | `print_document_reference` | 214 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Investoren-PowerPoint.dc.html` | `print_document_reference` | 147 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Konto.dc.html` | `account_portal` | 239 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Kundenbroschuere.dc.html` | `print_document_reference` | 145 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Kundenportal.dc.html` | `customer_portal` | 282 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Kundenwege.dc.html` | `customer_portal` | 397 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NX-Footer.dc.html` | `shared_component` | 181 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NX-Header.dc.html` | `shared_component` | 149 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NX-Intern.dc.html` | `internal_navigation` | 57 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Nachbarschaftskunden-Portal.dc.html` | `neighbourhood_portal` | 352 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify AI one.dc.html` | `public_ai_product` | 460 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify API.dc.html` | `public_ai_product` | 472 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Designsystem.dc.html` | `design_reference` | 308 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Leitstand.dc.html` | `internal_control` | 365 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Posteingang.dc.html` | `internal_inbox` | 210 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Shop.dc.html` | `demo_commerce_reference` | 669 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Systemkarte.dc.html` | `internal_architecture_reference` | 60 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify Workspace.dc.html` | `internal_workspace` | 1039 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXify-AI-Companion.dc.html` | `public_ai_assistant` | 122 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXifyAI Cloud v12.dc.html` | `public_agency_site` | 712 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | `public_content` | 58 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | `public_content` | 57 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Partner-Broschuere.dc.html` | `print_document_reference` | 97 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Partner-PowerPoint Werkstatt.dc.html` | `print_document_reference` | 136 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Partner-werden.dc.html` | `public_partner_content` | 145 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Partnerportal.dc.html` | `partner_portal` | 459 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Rechtliches.dc.html` | `legal_reference` | 54 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Reifenrechner.dc.html` | `public_tool` | 209 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/TEILEKLAR Shop.dc.html` | `production_commerce_reference` | 3387 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | `print_document_reference` | 84 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/Werkstatt-Partnerseite.dc.html` | `public_partner_content` | 185 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/index.html` | `reference_navigation` | 2 | — | Wiederaufbau / Abnahme offen |
| `N2:prototypen/myADMIN v2.dc.html` | `internal_administration` | 1251 | — | Wiederaufbau / Abnahme offen |

## 10. Überprüfbare Abnahme statt stiller Kürzung

Erst eine ausdrückliche Zuordnung oder fachlich begründete Auflösung jeder Quelleinheit erlaubt Fortschritt. Dazu gehören Darstellung gegen Screenshot und Originale auf mehreren Viewports, echte Funktions-/Zustandswechsel, zulässige Backendaktionen und Einstellungen nach Konvertierung. Sprachen, Tastatur/Fokus/Reduced Motion sowie Untertitel/Transkripte sind gesondert zu prüfen. Keine Textkarte, künstliche Modellantwort, generische Zugangssperre oder Testzahlung ohne Beleg ersetzt die jeweilige Originalfunktion.

Gezielt prüfbar sind in diesem Arbeitspaket: vollständige HTML-Pfadmengen, Originalhashes, jede Unit-ID und ihre gültigen Quellen-/Zielprofil-/Backendreferenzen, Beobachtungsanzahlen gegen den vorhandenen Katalog und einheitlich offene Abnahmestände. Es wurde kein breiter Testlauf gestartet und keine Oberfläche verändert.
