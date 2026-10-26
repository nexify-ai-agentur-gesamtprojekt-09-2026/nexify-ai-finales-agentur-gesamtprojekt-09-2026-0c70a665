# Vollständiger statischer Seiten- und Funktionskatalog

Stand: 2026-10-26T06:22:28.558416+00:00. Datenquelle: `prototype-pages.json`. Status: abgeleiteter Zielvertrag mit wortgetreuen statischen Quellenbelegen; keine Live- oder Produktabnahme.

## Umfang

| Repository | HTML vollständig erfasst | Markdown-Dateien gelesen |
|---|---:|---:|
| N1 | 47 | 218 |
| N2 | 46 | 195 |

Insgesamt 93 HTML-Dateien; alle vollständig gelesen und geparst, auch außerhalb von prototypen/. Keine Archivextraktion und keine JavaScript-Ausführung. Vollständige Pfade, SHA256, Titel, Zweck, Formulare, Steuerelemente, Aktionen, Links, Authsignale und direkte lokale Skriptquellen stehen je Seite im JSON. Ressourcen-/Navigationsverweise werden lokal auf Existenz geprüft, ohne externe Seiten aufzurufen.

`observed` bedeutet hier ausschließlich statisch im Quelltext vorhanden. `derived` enthält vorgeschlagene Domains, Fähigkeiten, API-Pfade/Methoden und Auth-Anforderungen. Formularattribute, noindex, loggedIn-Variablen und clientseitiger SessionStorage beweisen keine serverseitige Autorisierung. HTML-Inputwerte werden nicht ausgegeben; Kontaktziele und sensible URL-Parameter sind redigiert. Ausführbare Scriptkörper werden nicht kopiert.

## Alle Seiten

| Page-ID | Titel / Bestimmung | Abgeleitete Rolle | Domains | Aktionen / Formulare / API-Marker |
|---|---|---|---|
| `N1:apps-index.html` | NeXify — finale Gesamtlösung | reference_navigation | content, operations | 0 / 0 / 0 |
| `N1:docs/projektseiten/Architektur.dc.html` | Systemarchitektur – NeXify AI | internal_architecture_reference | operations, integrations, administration | 0 / 0 / 0 |
| `N1:docs/projektseiten/NeXify Organisation.dc.html` | Organisation – NeXify AI | internal_administration | identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | 1 / 0 / 0 |
| `N1:docs/projektseiten/Start.dc.html` | NeXify AI × TEILEKLAR – Übersicht aller Oberflächen | reference_navigation | content, operations | 1 / 0 / 0 |
| `N1:docs/projektseiten/Zielverfolgung.dc.html` | Zielverfolgung – NeXify AI | internal_goal_tracking | projects, administration, operations | 2 / 0 / 0 |
| `N1:packages/ui/index.html` | NeXify UI — Kernbausteine | design_reference | content | 2 / 0 / 0 |
| `N1:preview-prototypes.html` | NeXify AI — Prototypenübersicht | reference_navigation | content, operations | 0 / 0 / 0 |
| `N1:prototypen/API-Rechtliches.dc.html` | NeXify AI API – Nutzungs- und Prepaid-Bedingungen | legal_reference | content, consent, data-rights | 0 / 0 / 0 |
| `N1:prototypen/Affiliate-Portal.dc.html` | Affiliate-Portal – NeXify AI | affiliate_portal | identity, affiliates, billing | 8 / 1 / 0 |
| `N1:prototypen/Anmeldung.dc.html` | Anmelden – NeXify AI | authentication | identity, tenants, consent | 12 / 0 / 0 |
| `N1:prototypen/Batterie-Berater.dc.html` | Batterie-Berater – TEILEKLAR | public_tool | fitment, content | 2 / 0 / 0 |
| `N1:prototypen/E-Mail-Marketing-Newsletter.html` | NeXify AI — Neuigkeiten | email_template | content, documents, consent | 0 / 0 / 0 |
| `N1:prototypen/E-Mail-Transaktional-Angebot.html` | Ihr Angebot von NeXify AI | email_template | content, documents, offers | 0 / 0 / 0 |
| `N1:prototypen/Fitment-Checker.dc.html` | Passt das Teil? Fitment-Checker – TEILEKLAR | public_tool | fitment, content | 6 / 0 / 0 |
| `N1:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | Geschäftsdokumente – Vorlagen – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N1:prototypen/Investoren-PowerPoint.dc.html` | Investoren-Präsentation – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N1:prototypen/Konto.dc.html` | Mein Konto – TEILEKLAR | account_portal | identity, tenants, appointments, vouchers, commerce, consent, data-rights, fitment | 9 / 0 / 0 |
| `N1:prototypen/Kundenbroschuere.dc.html` | Kundenbroschüre – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N1:prototypen/Kundenportal.dc.html` | Kundenportal – NeXify AI | customer_portal | identity, tenants, offers, projects, acceptance, documents, billing, api-access, support, commerce | 16 / 2 / 9 |
| `N1:prototypen/Kundenwege.dc.html` | Kundenwege – NeXify AI | customer_portal | identity, tenants, offers, projects, acceptance, documents, billing, api-access, support | 36 / 2 / 0 |
| `N1:prototypen/NX-Footer.dc.html` | {{ tMarkets }} | shared_component | content, identity, consent | 12 / 0 / 0 |
| `N1:prototypen/NX-Header.dc.html` | NX-Header.dc.html | shared_component | content, identity, consent | 2 / 0 / 0 |
| `N1:prototypen/NX-Intern.dc.html` | NX-Intern.dc.html | internal_navigation | identity, content, administration, operations | 1 / 0 / 0 |
| `N1:prototypen/Nachbarschaftskunden-Portal.dc.html` | Gutschein einlösen – TEILEKLAR | neighbourhood_portal | identity, appointments, vouchers, partners, documents, commerce, data-rights | 26 / 3 / 13 |
| `N1:prototypen/NeXify AI one.dc.html` | NeXify AI one und one+ – Unternehmens-KI per Web, API und Terminal | public_ai_product | content, identity, api-access, billing, model-inference, workspace | 16 / 1 / 0 |
| `N1:prototypen/NeXify API.dc.html` | NeXify AI API – Prepaid, EU-Hosting, eine Rechnung | public_ai_product | content, identity, api-access, billing, model-inference, workspace | 16 / 0 / 0 |
| `N1:prototypen/NeXify Designsystem.dc.html` | NeXify Designsystem · Graphit & Lime · Fassung 2.0 | design_reference | content | 5 / 0 / 0 |
| `N1:prototypen/NeXify Leitstand.dc.html` | Leitstand – NeXify AI | internal_control | identity, operations, decisions, projects, learning | 15 / 0 / 0 |
| `N1:prototypen/NeXify Posteingang.dc.html` | Posteingang – NeXify AI | internal_inbox | identity, inbox, inquiries, offers, decisions, documents | 7 / 0 / 0 |
| `N1:prototypen/NeXify Shop.dc.html` | NeXify Shop – Muster-Shop der Onlineshop-Fertiglösung | demo_commerce_reference | commerce, fitment, vouchers, identity, consent, billing, model-inference | 63 / 3 / 0 |
| `N1:prototypen/NeXify Systemkarte.dc.html` | NeXify Systemkarte · Gesamtsystem | internal_architecture_reference | operations, integrations, administration | 2 / 0 / 0 |
| `N1:prototypen/NeXify Workspace.dc.html` | Workspace – NeXify AI | internal_workspace | identity, workspace, projects, decisions, model-inference, knowledge | 77 / 1 / 0 |
| `N1:prototypen/NeXify-AI-Companion.dc.html` | NeXify AI Companion – Zustände | public_ai_assistant | model-inference, knowledge, inquiries, content | 2 / 0 / 0 |
| `N1:prototypen/NeXifyAI Cloud v12.dc.html` | NeXify AI – KI-Agenten für Betriebe: Aufbau einmalig, Betrieb optional | public_agency_site | content, inquiries, model-inference, knowledge, media | 25 / 3 / 1 |
| `N1:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | KI-Automatisierung vor Ort – NeXify AI | public_content | content, knowledge, inquiries | 0 / 0 / 0 |
| `N1:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | Wissenshub – NeXify AI | public_content | content, knowledge, inquiries | 0 / 0 / 0 |
| `N1:prototypen/Partner-Broschuere.dc.html` | Partner-Broschüre – TEILEKLAR | print_document_reference | content, documents | 0 / 0 / 0 |
| `N1:prototypen/Partner-PowerPoint Werkstatt.dc.html` | Werkstatt-Präsentation – TEILEKLAR | print_document_reference | content, documents | 0 / 0 / 0 |
| `N1:prototypen/Partner-werden.dc.html` | Partner werden – NeXify AI | public_partner_content | content, partners, appointments, inquiries | 0 / 0 / 0 |
| `N1:prototypen/Partnerportal.dc.html` | Partnerportal – TEILEKLAR | partner_portal | identity, partners, appointments, vouchers, billing, documents, commerce | 28 / 4 / 11 |
| `N1:prototypen/Rechtliches.dc.html` | Rechtliches – NeXify AI × TEILEKLAR | legal_reference | content, consent, data-rights | 0 / 0 / 0 |
| `N1:prototypen/Reifenrechner.dc.html` | Reifenrechner – TEILEKLAR | public_tool | fitment, content | 7 / 0 / 0 |
| `N1:prototypen/TEILEKLAR Shop.dc.html` | Autoteile online kaufen – passgenau für dein Fahrzeug / TEILEKLAR | production_commerce_reference | commerce, fitment, vouchers, identity, consent, billing, model-inference | 220 / 4 / 0 |
| `N1:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | Pascal Courbois – Visitenkarte – NeXify AI | print_document_reference | content, documents | 1 / 0 / 0 |
| `N1:prototypen/Werkstatt-Partnerseite.dc.html` | Werkstatt-Partner – TEILEKLAR | public_partner_content | content, partners, appointments, inquiries | 7 / 0 / 0 |
| `N1:prototypen/index.html` | NeXify AI — Start | reference_navigation | content, operations | 0 / 0 / 0 |
| `N1:prototypen/myADMIN v2.dc.html` | myADMIN · Pascals Workspace · NeXify AI | internal_administration | identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | 90 / 6 / 0 |
| `N2:apps-index.html` | NeXify — finale Gesamtlösung | reference_navigation | content, operations | 0 / 0 / 0 |
| `N2:docs/projektseiten/Architektur.dc.html` | Systemarchitektur – NeXify AI | internal_architecture_reference | operations, integrations, administration | 0 / 0 / 0 |
| `N2:docs/projektseiten/NeXify Organisation.dc.html` | Organisation – NeXify AI | internal_administration | identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | 1 / 0 / 0 |
| `N2:docs/projektseiten/Start.dc.html` | NeXify AI × TEILEKLAR – Übersicht aller Oberflächen | reference_navigation | content, operations | 1 / 0 / 0 |
| `N2:docs/projektseiten/Zielverfolgung.dc.html` | Zielverfolgung – NeXify AI | internal_goal_tracking | projects, administration, operations | 2 / 0 / 0 |
| `N2:packages/ui/index.html` | NeXify UI — Kernbausteine | design_reference | content | 2 / 0 / 0 |
| `N2:prototypen/API-Rechtliches.dc.html` | NeXify AI API – Nutzungs- und Prepaid-Bedingungen | legal_reference | content, consent, data-rights | 0 / 0 / 0 |
| `N2:prototypen/Affiliate-Portal.dc.html` | Affiliate-Portal – NeXify AI | affiliate_portal | identity, affiliates, billing | 8 / 1 / 0 |
| `N2:prototypen/Anmeldung.dc.html` | Anmelden – NeXify AI | authentication | identity, tenants, consent | 12 / 0 / 0 |
| `N2:prototypen/Batterie-Berater.dc.html` | Batterie-Berater – TEILEKLAR | public_tool | fitment, content | 2 / 0 / 0 |
| `N2:prototypen/E-Mail-Marketing-Newsletter.html` | NeXify AI — Neuigkeiten | email_template | content, documents, consent | 0 / 0 / 0 |
| `N2:prototypen/E-Mail-Transaktional-Angebot.html` | Ihr Angebot von NeXify AI | email_template | content, documents, offers | 0 / 0 / 0 |
| `N2:prototypen/Fitment-Checker.dc.html` | Passt das Teil? Fitment-Checker – TEILEKLAR | public_tool | fitment, content | 6 / 0 / 0 |
| `N2:prototypen/Geschaeftsdokumente-Vorlagen.dc.html` | Geschäftsdokumente – Vorlagen – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N2:prototypen/Investoren-PowerPoint.dc.html` | Investoren-Präsentation – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N2:prototypen/Konto.dc.html` | Mein Konto – TEILEKLAR | account_portal | identity, tenants, appointments, vouchers, commerce, consent, data-rights, fitment | 9 / 0 / 0 |
| `N2:prototypen/Kundenbroschuere.dc.html` | Kundenbroschüre – NeXify AI | print_document_reference | content, documents | 0 / 0 / 0 |
| `N2:prototypen/Kundenportal.dc.html` | Kundenportal – NeXify AI | customer_portal | identity, tenants, offers, projects, acceptance, documents, billing, api-access, support, commerce | 16 / 2 / 9 |
| `N2:prototypen/Kundenwege.dc.html` | Kundenwege – NeXify AI | customer_portal | identity, tenants, offers, projects, acceptance, documents, billing, api-access, support | 36 / 2 / 0 |
| `N2:prototypen/NX-Footer.dc.html` | {{ tMarkets }} | shared_component | content, identity, consent | 12 / 0 / 0 |
| `N2:prototypen/NX-Header.dc.html` | NX-Header.dc.html | shared_component | content, identity, consent | 2 / 0 / 0 |
| `N2:prototypen/NX-Intern.dc.html` | NX-Intern.dc.html | internal_navigation | identity, content, administration, operations | 1 / 0 / 0 |
| `N2:prototypen/Nachbarschaftskunden-Portal.dc.html` | Gutschein einlösen – TEILEKLAR | neighbourhood_portal | identity, appointments, vouchers, partners, documents, commerce, data-rights | 26 / 3 / 13 |
| `N2:prototypen/NeXify AI one.dc.html` | NeXify AI one und one+ – Unternehmens-KI per Web, API und Terminal | public_ai_product | content, identity, api-access, billing, model-inference, workspace | 16 / 1 / 0 |
| `N2:prototypen/NeXify API.dc.html` | NeXify AI API – Prepaid, EU-Hosting, eine Rechnung | public_ai_product | content, identity, api-access, billing, model-inference, workspace | 16 / 0 / 0 |
| `N2:prototypen/NeXify Designsystem.dc.html` | NeXify Designsystem · Graphit & Lime · Fassung 2.0 | design_reference | content | 5 / 0 / 0 |
| `N2:prototypen/NeXify Leitstand.dc.html` | Leitstand – NeXify AI | internal_control | identity, operations, decisions, projects, learning | 15 / 0 / 0 |
| `N2:prototypen/NeXify Posteingang.dc.html` | Posteingang – NeXify AI | internal_inbox | identity, inbox, inquiries, offers, decisions, documents | 7 / 0 / 0 |
| `N2:prototypen/NeXify Shop.dc.html` | NeXify Shop – Muster-Shop der Onlineshop-Fertiglösung | demo_commerce_reference | commerce, fitment, vouchers, identity, consent, billing, model-inference | 63 / 3 / 0 |
| `N2:prototypen/NeXify Systemkarte.dc.html` | NeXify Systemkarte · Gesamtsystem | internal_architecture_reference | operations, integrations, administration | 2 / 0 / 0 |
| `N2:prototypen/NeXify Workspace.dc.html` | Workspace – NeXify AI | internal_workspace | identity, workspace, projects, decisions, model-inference, knowledge | 77 / 1 / 0 |
| `N2:prototypen/NeXify-AI-Companion.dc.html` | NeXify AI Companion – Zustände | public_ai_assistant | model-inference, knowledge, inquiries, content | 2 / 0 / 0 |
| `N2:prototypen/NeXifyAI Cloud v12.dc.html` | NeXify AI – KI-Agenten für Betriebe: Aufbau einmalig, Betrieb optional | public_agency_site | content, inquiries, model-inference, knowledge, media | 25 / 3 / 1 |
| `N2:prototypen/NeXifyAI-Local-SEO-Muster.dc.html` | KI-Automatisierung vor Ort – NeXify AI | public_content | content, knowledge, inquiries | 0 / 0 / 0 |
| `N2:prototypen/NeXifyAI-Wissenshub-Artikel.dc.html` | Wissenshub – NeXify AI | public_content | content, knowledge, inquiries | 0 / 0 / 0 |
| `N2:prototypen/Partner-Broschuere.dc.html` | Partner-Broschüre – TEILEKLAR | print_document_reference | content, documents | 0 / 0 / 0 |
| `N2:prototypen/Partner-PowerPoint Werkstatt.dc.html` | Werkstatt-Präsentation – TEILEKLAR | print_document_reference | content, documents | 0 / 0 / 0 |
| `N2:prototypen/Partner-werden.dc.html` | Partner werden – NeXify AI | public_partner_content | content, partners, appointments, inquiries | 0 / 0 / 0 |
| `N2:prototypen/Partnerportal.dc.html` | Partnerportal – TEILEKLAR | partner_portal | identity, partners, appointments, vouchers, billing, documents, commerce | 28 / 4 / 11 |
| `N2:prototypen/Rechtliches.dc.html` | Rechtliches – NeXify AI × TEILEKLAR | legal_reference | content, consent, data-rights | 0 / 0 / 0 |
| `N2:prototypen/Reifenrechner.dc.html` | Reifenrechner – TEILEKLAR | public_tool | fitment, content | 7 / 0 / 0 |
| `N2:prototypen/TEILEKLAR Shop.dc.html` | Autoteile online kaufen – passgenau für dein Fahrzeug / TEILEKLAR | production_commerce_reference | commerce, fitment, vouchers, identity, consent, billing, model-inference | 220 / 4 / 0 |
| `N2:prototypen/Visitenkarte-Pascal-Courbois.dc.html` | Pascal Courbois – Visitenkarte – NeXify AI | print_document_reference | content, documents | 1 / 0 / 0 |
| `N2:prototypen/Werkstatt-Partnerseite.dc.html` | Werkstatt-Partner – TEILEKLAR | public_partner_content | content, partners, appointments, inquiries | 7 / 0 / 0 |
| `N2:prototypen/index.html` | NeXify AI — Start | reference_navigation | content, operations | 0 / 0 / 0 |
| `N2:prototypen/myADMIN v2.dc.html` | myADMIN · Pascals Workspace · NeXify AI | internal_administration | identity, tenants, administration, projects, billing, affiliates, partners, inbox, decisions, integrations, operations, knowledge, learning | 90 / 6 / 0 |

## Gruppierung und Dubletten

8 Gruppen mit exakt gleichem SHA256. Gleichnamige Dateien bilden zusätzlich Familien; unterschiedliche Hashes bleiben getrennte Versionen. Es wird keine kanonische Quelle allein aus dem Dateinamen oder dem größeren Repository abgeleitet.

## API-/Auth-Ableitung

- Stabile Seiten-ID: `N1:<relativer-Pfad>` bzw. `N2:<relativer-Pfad>`. Die Contractdateien können diese IDs als Herkunft referenzieren.
- `proposed_required_operations` enthält vorgeschlagene Capability-Strings, keine zugesicherten API-operationIds oder MCP-Toolnamen.
- `data-api-endpoint` wird exakt inventarisiert; ein daraus ergänztes `/v1/` oder HTTP-Verfahren ist ausdrücklich abgeleitet.
- Ziel-Auth folgt Seitenzweck und technischem Soll: öffentliche Inhalte/Anfragen, Konto-/Mandantenkontext für private Portale, zusätzliche Rollen/MFA/Freigaben für interne und folgenreiche Aktionen. Konkrete Durchsetzung und Scopeprüfung gehören in den separat geprüften API-/Auth-Vertrag.
- NeXify-Factory-Zielvertrag `/v1` und Affilinet-Ist-API `/api` bleiben getrennt. Kein Nachweis, dass eine Affilinet-Route die NeXify-Referenz bereits implementiert.

## Quelldefizite und Grenzen

- Die HTMLs sind Design-/Verhaltensreferenzen. Einige Aktionen sind lokale Zustandswechsel oder Download-Muster; Backend-TODOs sind keine vorhandenen Funktionen.
- Dynamisch erzeugtes DOM und transitiv importierte Modulabläufe sind ohne isolierten Runtime-Test nicht vollständig bewiesen; alle HTML-Dateien sind dennoch vollständig im Katalog enthalten.
- Historische Dokumentverweise enthalten teils nicht mehr gültige Preise, Pfade und Freigabestände. Sie werden mit Quellenort geführt und nicht automatisch produktiv übernommen.
- Relative Rootpfade können für den geplanten Webserver sinnvoll sein, obwohl keine gleichnamige Datei im Checkout existiert. Solche Fälle sind als unresolved_local_references sichtbar, keine pauschale Behauptung eines Live-Linkfehlers.
- Kein wiederhergestellter historischer OpenAPI-Vertrag, keine technische Auth-Abnahme, keine verifizierte Gesellschafts-/Provideridentität.
- Medien/HeroVideo ist user_reported: Runway-Videos mit gemeldeter fehlender create-Aktion; Nex/AIFly/eigene Stimme; ElevenLabs über Composio. Dieser Katalog verifiziert weder die Assets noch die Tool-Exposition. Maßgeblicher ergänzender Kontext: hero-media.json des Koordinators; keine Action-/Toolnamen erfinden.

## Wiederholbarkeit

Generator: `python3 tools/catalog_factory_pages.py --repo-n2 <Pfad-zum-N2-Checkout>`. Standard N1 ist das Repository des Generators; N2 ist standardmäßig der gleichnamige Nachbarcheckout. `--repo-n1` und `--output-dir` erlauben andere Checkouts/Artefaktverzeichnisse. Dokumentationshashes sind historische Scanbelege; Änderungen von PROGRESS.md lösen allein keinen notwendigen Neuscan aus. Neue oder geänderte HTML-Dateien ändern Katalogeinträge/Hashes. Alle Quellen unverändert lassen; Katalog und Vertrag müssen nach Quellenänderungen erneut abgeglichen werden.

## Beobachtete widersprüchliche Endpoint-Schreibweisen

| Seite | DOM-Marker | Benachbarter Backend-TODO | Status |
|---|---|---|---|
| `N1:prototypen/Partnerportal.dc.html` | `partner/vouchers/orders` | `POST partner/vouchers/order` | Getrennt beobachtet; Zielvertrag entscheidet explizit. |
| `N2:prototypen/Partnerportal.dc.html` | `partner/vouchers/orders` | `POST partner/vouchers/order` | Getrennt beobachtet; Zielvertrag entscheidet explizit. |
