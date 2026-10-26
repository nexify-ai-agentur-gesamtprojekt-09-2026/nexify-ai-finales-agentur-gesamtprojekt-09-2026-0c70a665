# 0012 – Live-Vorschau: vollständiges Quellenregister und offene Inhaltsabdeckung

Stand: 2026-10-26T09:26:17.059072+00:00. Maschinenlesbarer Abgleich: [`config/preview-coverage.json`](../../config/preview-coverage.json).

**93 erhaltene HTML-Quellen sind keine 93 vollständig umgesetzten Live-Seiten.** Die aktuelle IA besitzt **45 Zielrouten: 35 öffentlich, 10 geschützt**. **24 eindeutige Quellen-IDs** werden direkt referenziert; **69 Quellen** besitzen noch keine direkte Routenzuordnung. Auch eine direkte Referenz bestätigt weder die Übernahme aller Abschnitte noch funktionierende Formulare, Zustände oder Backendaktionen. Eine vollständige Inhaltsabnahme ist durch diesen Abgleich für keine Quelle belegt.

Alle **47 N1- und 46 N2-Dateien** wurden vollständig auf Byte-Hash-Übereinstimmung mit dem Katalog geprüft: **93/93 identisch**. N1 liegt an den ursprünglichen relativen Pfaden; N2 bleibt unter `reference/handoff-n2/` erhalten. Die Originale wurden nicht verändert. Acht exakte Dublettengruppen mit 16 Quellen bleiben separat markiert; die 93 Quellen haben 85 unterschiedliche SHA-256. Gleiche Dateinamen mit unterschiedlichen Hashes sind historische Varianten, keine automatisch erledigten Dubletten.

## Was die Vorschau strukturell zeigt

| Kontext | Zielstruktur | Aktuelle Grenze |
|---|---|---|
| NeXify öffentlich | Leistungen → Websites / Agenten und Automatisierung / Apps und Portale → Leistungsumfang → Kontakt; Lösungen → one / API; Preise und Ablauf; Wissen; Unternehmen; direkte Rechts-/Datenschutzseiten | Kuratierte Zielinhalte, keine vollständige Reproduktion aller Prototypabschnitte; keine erfundenen Preise, Referenzen oder Rechtstexte |
| Zugang | Anmelden und Registrieren | Identität und geschützte Site-/Mandanten-/Rollenrechte getrennt nachweisen; kein automatischer Adminzugang |
| TEILEKLAR öffentlich | Fahrzeug/Passung → Suche → Kategorien → Produkt → Warenkorb → Kassenstatus; Partner → Werkstatt → Termin; Gutscheine → Rechtliches | Vorbereitung ohne behauptete reale Artikel, Passung, Lager, Zahlung, Buchung oder Einlösung |
| Geschützte Zielbereiche | Kunde, API, Affiliate; TEILEKLAR-Konto, Partner, Nachbarschaft; intern Workspace, Posteingang, Leitstand, Verwaltung | Generische Zugangsgrenze statt Veröffentlichung privater Daten; keine vollständige Portal-/Betriebsimplementierung belegt |

Das Backend besitzt bislang das Visitor-Fundament. Die Abdeckung fachlicher Shop-, Portal-, Ledger-, Partner- und interner Vorgänge folgt daraus nicht. Der gemeinsame Chat ersetzt weder Seiteninhalte noch diese Fachfunktionen. Dieser Abgleich startet keine Browser- oder Backendtests.

## Konkrete Nutzerwege aus der aktuellen IA

| Journey | Zielpfade in Reihenfolge | Vorgesehenes Ergebnis / Grenze |
|---|---|---|
| `business-website` | `/` → `/leistungen` → `/leistungen/websites` → `/leistungsumfang` → `/kontakt` | `draft_or_request_not_contract` |
| `business-automation` | `/` → `/leistungen` → `/leistungen/agenten-automatisierung` → `/leistungsumfang` → `/kontakt` | `structured_draft` |
| `business-apps` | `/` → `/leistungen` → `/leistungen/apps-portale` → `/leistungsumfang` → `/kontakt` | `scope_and_request_draft` |
| `business-api` | `/loesungen` → `/produkte/one` → `/produkte/api` → `/kontakt` | `access_request_not_activated_key` |
| `knowledge-to-project` | `/wissen` → `/wissen/projekt-vorbereiten` → `/leistungsumfang` → `/kontakt` | `source_based_scope_draft` |
| `teileklar-selection` | `/teileklar` → `/teileklar/fahrzeug-und-passung` → `/teileklar/suche` → `/teileklar/kategorien` → `/teileklar/kategorie` → `/teileklar/produkt` → `/teileklar/warenkorb` → `/teileklar/kasse` → `/teileklar/rechtliches` | `preparation_only_no_real_order_or_payment` |
| `teileklar-workshop` | `/teileklar` → `/teileklar/partner-werden` → `/teileklar/werkstatt` → `/teileklar/termine` | `request_draft_not_confirmed_partner_or_appointment` |
| `teileklar-vouchers` | `/teileklar` → `/teileklar/gutscheine` → `/teileklar/rechtliches` | `information_not_redeemed_credit` |
| `existing-client` | `/` → `/anmelden` → `/kontakt` | `safe_status_and_contact_not_fake_login` |

Diese registrierten Wege zeigen die Struktur, nicht die vollständige Funktionsabnahme der ursprünglichen Nutzerstrecken. Chat-Ausgänge bleiben typisiert als Angebotsentwurf, Terminanfrage oder Marketingentwurf. Ein vorhandener Zugriffseinstieg beweist keine Berechtigung für private Inhalte.

## Backlog ohne stillschweigende Auslassungen

Jede der 69 nicht zugeordneten Quellen bleibt als eigener Backlogeintrag mit Original-ID, Hash, Zweck, Domain, Rolle und beobachteten Signalzahlen erhalten. Die folgende Gruppierung stammt aus dem vorhandenen Quellenkatalog; sie weist keine neuen Seitenziele zu. N2-Varianten werden nicht automatisch dem gleichnamigen N1-Ziel zugerechnet.

| Quellenrolle | Noch ohne direkte Zuordnung |
|---|---:|
| `account_portal` | 1 |
| `affiliate_portal` | 1 |
| `authentication` | 1 |
| `customer_portal` | 2 |
| `demo_commerce_reference` | 1 |
| `design_reference` | 4 |
| `email_template` | 4 |
| `internal_administration` | 3 |
| `internal_architecture_reference` | 4 |
| `internal_control` | 1 |
| `internal_goal_tracking` | 2 |
| `internal_inbox` | 1 |
| `internal_navigation` | 2 |
| `internal_workspace` | 1 |
| `legal_reference` | 2 |
| `neighbourhood_portal` | 1 |
| `partner_portal` | 1 |
| `print_document_reference` | 12 |
| `production_commerce_reference` | 1 |
| `public_agency_site` | 1 |
| `public_ai_assistant` | 2 |
| `public_ai_product` | 2 |
| `public_content` | 3 |
| `public_partner_content` | 2 |
| `public_tool` | 3 |
| `reference_navigation` | 7 |
| `shared_component` | 4 |

Insbesondere E-Mail-Vorlagen, Druck-/Geschäftsdokumente, Broschüren, Präsentationen, Komponenten, Designreferenzen, System-/Organisationsseiten, Companion und Local-SEO-Muster brauchen eine ausdrückliche Inhalts-, Komponenten- oder Dokumententscheidung. Sie dürfen weder als erledigt verschwinden noch pauschal zu öffentlichen Seiten werden. Bei gleicher Funktion müssen die tatsächlichen Variantenunterschiede geprüft werden.

## Alle 93 Quellen: Zuordnung und offene Abnahme

Die SHA-256 stehen vollständig im JSON; die Tabelle bleibt über die unveränderte Quellen-ID eindeutig. **Referenziert** bedeutet ausschließlich eine direkte ID in der IA. **Backlog** bedeutet keine direkte ID-Zuordnung. Bei beiden bleibt die vollständige Inhaltsabnahme offen.

| Quellen-ID | Rolle / Domains | Direkte Zielrouten | Referenz-/Backlogstatus | Historische / exakte Dublette |
|---|---|---|---|---|
| `N1:apps-index.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | — |
| `N1:docs/projektseiten/Architektur.dc.html` | `internal_architecture_reference` / operations, integrations, administration | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:docs/projektseiten/NeXify Organisation.dc.html` | `internal_administration` / identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:docs/projektseiten/Start.dc.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:docs/projektseiten/Zielverfolgung.dc.html` | `internal_goal_tracking` / projects, administration, operations | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:packages/ui/index.html` | `design_reference` / content | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:preview-prototypes.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | — |
| `N1:prototypen/API-Rechtliches.dc.html` | `legal_reference` / content, consent, data-rights | `api` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Affiliate-Portal.dc.html` | `affiliate_portal` / identity, affiliates, billing | `affiliate-portal` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Anmeldung.dc.html` | `authentication` / identity, tenants, consent | `login`, `signup` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Batterie-Berater.dc.html` | `public_tool` / fitment, content | `tk-fitment` | Referenziert; Inhalt offen | — |
| `N1:prototypen/E-Mail-Marketing-Newsletter.html` | `email_template` / content, documents, consent | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:prototypen/E-Mail-Transaktional-Angebot.html` | `email_template` / content, documents, offers | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:prototypen/Fitment-Checker.dc.html` | `public_tool` / fitment, content | `tk-product`, `tk-fitment` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Investoren-PowerPoint.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Konto.dc.html` | `account_portal` / identity, tenants, appointments, vouchers, commerce, consent, data-rights, fitment | `tk-account` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Kundenbroschuere.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Kundenportal.dc.html` | `customer_portal` / identity, tenants, offers, projects, acceptance, documents, billing, api-access, support, commerce | `apps-portals`, `scope`, `login`, `signup`, `customer-portal` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Kundenwege.dc.html` | `customer_portal` / identity, tenants, offers, projects, acceptance, documents, billing, api-access, support | `scope`, `knowledge-start` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NX-Footer.dc.html` | `shared_component` / content, identity, consent | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NX-Header.dc.html` | `shared_component` / content, identity, consent | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NX-Intern.dc.html` | `internal_navigation` / identity, content, administration, operations | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Nachbarschaftskunden-Portal.dc.html` | `neighbourhood_portal` / identity, appointments, vouchers, partners, documents, commerce, data-rights | `tk-appointments`, `tk-vouchers`, `tk-neighbourhood` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify AI one.dc.html` | `public_ai_product` / content, identity, api-access, billing, model-inference, workspace | `automation`, `solutions`, `one` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify API.dc.html` | `public_ai_product` / content, identity, api-access, billing, model-inference, workspace | `pricing`, `api`, `api-console` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify Designsystem.dc.html` | `design_reference` / content | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NeXify Leitstand.dc.html` | `internal_control` / identity, operations, decisions, projects, learning | `internal-control` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify Posteingang.dc.html` | `internal_inbox` / identity, inbox, inquiries, offers, decisions, documents | `internal-inbox` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify Shop.dc.html` | `demo_commerce_reference` / commerce, fitment, vouchers, identity, consent, billing, model-inference | `tk-checkout` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify Systemkarte.dc.html` | `internal_architecture_reference` / operations, integrations, administration | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NeXify Workspace.dc.html` | `internal_workspace` / identity, workspace, projects, decisions, model-inference, knowledge | `automation`, `internal-workspace` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXify-AI-Companion.dc.html` | `public_ai_assistant` / model-inference, knowledge, inquiries, content | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NeXifyAI Cloud v12.dc.html` | `public_agency_site` / content, inquiries, model-inference, knowledge, media | `home`, `services`, `websites`, `solutions`, `pricing`, `company`, `contact` | Referenziert; Inhalt offen | — |
| `N1:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | `public_content` / content, knowledge, inquiries | — | Backlog; Inhalt offen | — |
| `N1:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | `public_content` / content, knowledge, inquiries | `knowledge`, `knowledge-start` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Partner-Broschuere.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Partner-PowerPoint Werkstatt.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Partner-werden.dc.html` | `public_partner_content` / content, partners, appointments, inquiries | `tk-partner` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Partnerportal.dc.html` | `partner_portal` / identity, partners, appointments, vouchers, billing, documents, commerce | `apps-portals`, `tk-vouchers`, `tk-partner`, `tk-partner-portal` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Rechtliches.dc.html` | `legal_reference` / content, consent, data-rights | `imprint`, `privacy`, `terms`, `ai-notice`, `accessibility`, `cookies`, `tk-legal` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Reifenrechner.dc.html` | `public_tool` / fitment, content | `tk-fitment` | Referenziert; Inhalt offen | — |
| `N1:prototypen/TEILEKLAR Shop.dc.html` | `production_commerce_reference` / commerce, fitment, vouchers, identity, consent, billing, model-inference | `solutions`, `tk-home`, `tk-search`, `tk-categories`, `tk-category`, `tk-product`, `tk-cart`, `tk-checkout`, `tk-legal` | Referenziert; Inhalt offen | — |
| `N1:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | — |
| `N1:prototypen/Werkstatt-Partnerseite.dc.html` | `public_partner_content` / content, partners, appointments, inquiries | `tk-appointments`, `tk-workshop` | Referenziert; Inhalt offen | — |
| `N1:prototypen/index.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | exakt gleiche Quellbytes; einzeln erhalten |
| `N1:prototypen/myADMIN v2.dc.html` | `internal_administration` / identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | `apps-portals`, `internal-admin` | Referenziert; Inhalt offen | — |
| `N2:apps-index.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | N2-Historie |
| `N2:docs/projektseiten/Architektur.dc.html` | `internal_architecture_reference` / operations, integrations, administration | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:docs/projektseiten/NeXify Organisation.dc.html` | `internal_administration` / identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:docs/projektseiten/Start.dc.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:docs/projektseiten/Zielverfolgung.dc.html` | `internal_goal_tracking` / projects, administration, operations | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:packages/ui/index.html` | `design_reference` / content | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:prototypen/API-Rechtliches.dc.html` | `legal_reference` / content, consent, data-rights | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Affiliate-Portal.dc.html` | `affiliate_portal` / identity, affiliates, billing | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Anmeldung.dc.html` | `authentication` / identity, tenants, consent | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Batterie-Berater.dc.html` | `public_tool` / fitment, content | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/E-Mail-Marketing-Newsletter.html` | `email_template` / content, documents, consent | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:prototypen/E-Mail-Transaktional-Angebot.html` | `email_template` / content, documents, offers | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:prototypen/Fitment-Checker.dc.html` | `public_tool` / fitment, content | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Investoren-PowerPoint.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Konto.dc.html` | `account_portal` / identity, tenants, appointments, vouchers, commerce, consent, data-rights, fitment | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Kundenbroschuere.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Kundenportal.dc.html` | `customer_portal` / identity, tenants, offers, projects, acceptance, documents, billing, api-access, support, commerce | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Kundenwege.dc.html` | `customer_portal` / identity, tenants, offers, projects, acceptance, documents, billing, api-access, support | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NX-Footer.dc.html` | `shared_component` / content, identity, consent | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NX-Header.dc.html` | `shared_component` / content, identity, consent | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NX-Intern.dc.html` | `internal_navigation` / identity, content, administration, operations | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Nachbarschaftskunden-Portal.dc.html` | `neighbourhood_portal` / identity, appointments, vouchers, partners, documents, commerce, data-rights | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify AI one.dc.html` | `public_ai_product` / content, identity, api-access, billing, model-inference, workspace | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify API.dc.html` | `public_ai_product` / content, identity, api-access, billing, model-inference, workspace | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Designsystem.dc.html` | `design_reference` / content | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Leitstand.dc.html` | `internal_control` / identity, operations, decisions, projects, learning | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Posteingang.dc.html` | `internal_inbox` / identity, inbox, inquiries, offers, decisions, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Shop.dc.html` | `demo_commerce_reference` / commerce, fitment, vouchers, identity, consent, billing, model-inference | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Systemkarte.dc.html` | `internal_architecture_reference` / operations, integrations, administration | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify Workspace.dc.html` | `internal_workspace` / identity, workspace, projects, decisions, model-inference, knowledge | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXify-AI-Companion.dc.html` | `public_ai_assistant` / model-inference, knowledge, inquiries, content | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXifyAI Cloud v12.dc.html` | `public_agency_site` / content, inquiries, model-inference, knowledge, media | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | `public_content` / content, knowledge, inquiries | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | `public_content` / content, knowledge, inquiries | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Partner-Broschuere.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Partner-PowerPoint Werkstatt.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Partner-werden.dc.html` | `public_partner_content` / content, partners, appointments, inquiries | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Partnerportal.dc.html` | `partner_portal` / identity, partners, appointments, vouchers, billing, documents, commerce | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Rechtliches.dc.html` | `legal_reference` / content, consent, data-rights | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Reifenrechner.dc.html` | `public_tool` / fitment, content | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/TEILEKLAR Shop.dc.html` | `production_commerce_reference` / commerce, fitment, vouchers, identity, consent, billing, model-inference | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | `print_document_reference` / content, documents | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/Werkstatt-Partnerseite.dc.html` | `public_partner_content` / content, partners, appointments, inquiries | — | Backlog; Inhalt offen | N2-Historie |
| `N2:prototypen/index.html` | `reference_navigation` / content, operations | — | Backlog; Inhalt offen | N2-Historie; exakt gleiche Quellbytes; einzeln erhalten |
| `N2:prototypen/myADMIN v2.dc.html` | `internal_administration` / identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | — | Backlog; Inhalt offen | N2-Historie |

## Nachweis und Weiterarbeit

Prüfbasis sind ausschließlich `docs/contracts/prototype-pages.json` und `config/site-map.json`; deren Snapshot-Hashes stehen im JSON. Die 93 Originaldatei-Hashes wurden gegen ihre kanonisch erhaltenen Dateien geprüft. Der Abgleich prüft Mengen, eindeutige IDs, ausschließlich bekannte Routenzuordnungen und Erhaltung aller Quellen. Keine neuen Zielmappings wurden erfunden, keine Originale bearbeitet und keine Funktion als abgeschlossen markiert.

Für die eigentliche Vollständigkeit müssen je Quelle alle Abschnitte, Bedienelemente, Formulare, Zustände und Folgeseiten explizit übernommen oder fachlich begründet aufgelöst werden. Erst passende Inhalts-, Darstellungs-, Interaktions-, Sprach-, Barrierefreiheits- und serverseitige Berechtigungsnachweise erlauben die Abnahme. Dieser Status muss sichtbar bleiben, während die Live-Vorschau schrittweise ergänzt wird.
