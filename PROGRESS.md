# Isolierte Integration · 27.10.2026

Current State: eigener lokaler Checkout `/workspace/nexify-integration`, Zweig
`integration/consolidated-2026-10-27`, Ausgangscommit
`a19cd5035d3809dedda94050486026ac0186662e`. Keine Remotes im Clone;
ursprüngliche Checkouts unverändert. Keine Pushes, Merges oder Deployments.

PR35-Reviewfälle lokal reproduziert und korrigiert: Kauf-/Reservierungsbindung
an Händler, Route und Bedingungen; atomare Aktualitätsprüfung paralleler
Keywordimporte. Additive Migration sperrt Altreservierungen ohne Snapshot nur
für neue Ausführung; Storno und Reconciliation bleiben erhalten.
WorkflowRecord ergänzt vorhandene Governance/Queue, keine zweite Datenbank:
10 Aufgaben, Quellenhashes, Owner, Abhängigkeiten, getrennte Evidenzstufen und
Rollback; neue Prüfregeln ARCH-015 bis ARCH-018. F-007 bleibt einziges aktives
Feature, keine Änderung auf passing und keine Runtimefreigabe.

Unabhängige Unteragentenprüfung fand zusätzlich einen reproduzierten Race beim
parallelen Start alter Selfservice-Datenbanken. Separat korrigiert: Schema-Read
und ALTERs nach executescript unter BEGIN IMMEDIATE; neuer Parallelstarttest
vorher rot, danach grün. Fachliche Bindungsregeln und SEO-Fix unverändert.
Die erneute unabhängige Gegenprüfung schloss den P2-Befund; auch acht parallele
Legacy-Starts bestanden. Beleg: evidence/integration-2026-10-27/independent-review.md.
Governance, PR36 und Produktionsadapter waren nicht Gegenstand dieses Reviews.

Prüfstatus: make check (0 Fehler/0 Warnungen), make test (291 Pythonfälle),
make e2e (291 Pythonfälle und Manifest/Config-Integrität) und make check-arch
bestanden. Belege unter `evidence/integration-2026-10-27/`. E2E ist hier die
bestehende lokale Repositoryprüfkette, kein externer End-to-End-/Produktionslauf.
Keine UI-Änderung oder neue Browserprüfung. Kein universeller Fehlerfreiheitsnachweis.

Next Steps: unabhängige Gegenprüfung des lokalen Diffs; Parent-Masterauftrag
als geprüfte Projektquelle ergänzen. Danach konkreten autorisierten Betriebs-
anschluss getrennt behandeln. Brain-Ziel/Tenant und WRITE→INDEX→EXACT READ-BACK
→CONTENT COMPARE fehlen; Mirror-Richtung extern ungeprüft; Small-Business
verify blockiert mit `Source unavailable: LICENSE` (0 Aktionen, keine bestätigte
installierte Skillzahl). Produktions-Restore, Liveabläufe und Abnahme offen.
Keine laufenden Dienste einschließlich Slack und keine externen Kosten verändert.

Zusätzlicher Abnahmescope: PR36 mit 16 gemeldeten offenen Reviews sowie
Backupfehler nexifyai-dify-sicherung auf srv1941843 um 03:40:36 UTC.
Beides nur als Parentmeldung dokumentiert, nicht selbst reproduziert.
Branch-Owner-Abgleich beziehungsweise Backup-/Exit-/Restorebeleg erforderlich;
keine PR36- oder Serveränderung ausgeführt. Details und Zuständigkeiten:
`docs/contracts/additional-acceptance-scope.md`.

---

# Gemeinsame KI-Governance und Kapazitätsplanung · 26.10.2026

Arbeitszweig: `factory/source-faithful-rebuild-2026-10-26`, Basis6bb8b4c.
Neueste Nutzerpriorität: bestehende Modelle/CLI-/Kundenarbeit erhalten; Ersatz
parallel bauen und prüfen, pro Laufzeit mit Canary/Übergabe/Rollback umstellen.
Keine aktive Migration, Produktionsbelegung oder globale Modellsperre durchgeführt.
17 zwischenzeitlich neue Legacy-Einschränkungen vor Veröffentlichung zurückgenommen;
Altpfade sind ausdrücklich unmigriert/audit, nicht fälschlich abgesichert.

52 KI-bezogene Quellen registriert; aktueller begrenzter Scan168Dateien/30Kandidaten.
Auditmodus meldet Lücken/Drift, stoppt keine laufende Arbeit. Neue interne
Modell-/CI-Adapter prüfen exaktDeepSeekV4.1Flash1017/high und finale Requests.
Hostmodelle von ChatGPT/Codex/Claude werden dadurch nicht umgeschaltet.
AGENTS/CLAUDE/Copilot weisen auf gemeinsame Regeln und relevante eigene Skills.
Fünf eigene Skillkopien projektlokal installiert und exakt rückgelesen:
Delivery1.0.2,Integration1.0.1,übrige1.0.0; keine globale Pluginregistrierung.

Kontextauswahl führt sechs Kernquellen einschließlich Wirkungsprüfung immer mit.
232Projekt-Markdown-Dateien lokal mit Originalhashen rückgelesen.
Der Markdown-Stager trennt Herkunft/Mandant/Fassungen/Chunks/Readback;
FIFO/Hardlink/Secret-/Versions-/Löschungsgegenproben nach Review behoben.
LightRAG/ca9000MD/vierServer nicht verifiziert oder eingespielt.
Behebungsqueue tatsächlich15Aufträge:8lokal aktuell geprüft abgeschlossen,
7externe/Migrationsvoraussetzungen zugewiesen; kein Worker/Scheduler aktiviert.

Offlinekapazitätsplaner rechnet gemessene CPU/RAM/Storage/IO/Netzprofile,
Lastbereiche und externe Tokenkosten; unbekannte Profile/Raten bleiben unbekannt.
14Fälle plus unabhängige Gegenrechnung grün. Lokaler Ressourcenprobe beschreibt
nur diese Codex-Cloudumgebung, keine VPS; Produktionshostinventar weiterhin leer.
Keine produktive Last, kein Serverlimit oder Loadbalancer geändert.

SEO-Katalog tatsächlich136883GeoNames-Orts-/Ortsteil-Kandidaten(DE/AT/CH/NL/BE)
in lokaler SQLite aufgenommen, sämtliche Entwürfe/noindex/Abdeckung unbestätigt.
Kein amtliches Vollständigkeitsversprechen, keine Keywordmessung, keine Ortsseite
veröffentlicht. Lizenz/Quellhashes: config/research/local-place-import-evidence.json.

AI7/React4-Streamingorientierung im Vercel-Frontend samt realen Browsergegenproben
und passender Next-Referenz gebaut. Explizit textgeführter Zwischenmodus, noch
kein Live-LLM-Chat. Internes ToolLoopAgent-Prototyping verwendet echte SDK-Mocks;
keine Modellkosten ausgelöst. Readonly-Creditsprobe nur für diesen Vercel-
Previewzweig konfiguriert, Ergebnis nach Deployment rücklesen.

Lokaler Gesamtstand:281Pythonfälle,26SDK- und18Site-Tests grün;
Site/Standalone/Nextbuilds, API-/App-Typechecks, Audit, E2E und14Architekturregeln
bestanden. Sauberzustandsprüfung bestanden; neues Vercel-Deployment folgt.
Browser:36öffentliche/10privateRouten,49Erklärmodule,SDK404Fallback/Streams/
Negativkontext/Sprachen/Mobilfokus,Offline/Hashrouting; kein Produktionsnachweis.
Bundle561KB/gzip158KB bleibt Leistungsfinding, keine Normzertifizierung.

Nächster Betriebsanschluss: autorisierte tatsächliche Server-/Brain-Messung und
Wissensadapter, gebundene Workloadprofile/Lastszenarien, finanzierter und
authentifizierter Livechat, reale Auth/Suite/Mail/Kalender/Shop/Medienadapter;
danach einzelne geprüfte Cutovers. Marketing/Mailings/Social erst bei Bereitschaft,
GEO nach SEO-Grundlage. F-007 bleibt aktiv; .cloud/Affilinet/Main unverändert.

---

# Ausarbeitung des angenommenen Grundentwurfs · 26.10.2026

Der Nutzer akzeptiert den vorherigen Stand ausschließlich als Anfang und
beauftragt die weitere Ausarbeitung. Vercel ist ausdrücklich die verbindliche
Live-Vorschau; ChatGPT-Bilddarstellung/Backupsync blockieren diese nicht.

Umgesetzt: ungecroppte Herofiguren (auch bei2464/2560/3440px), vier direkte
Bereichseinstiege, native Produktnavigation und geordneter Footer. Acht passende
Folgeseitentypen mit echten Breadcrumbs, Abschnittsnavigation und Folgeaktionen.
Eigene NeX2fly-Produktseite, 21 zusätzliche originalbasierte Abschnitte auf sieben
Leistungs-/Entscheidungsseiten. Jetzt46Routen/36öffentlich/10geschützt und49
vollständig erhaltene Erklärmodule. Keine veröffentlichten Presenter-Videos.

Agentenbereich: aktuelle öffentliche Seite und tatsächliche Angebotsvorschau/
Detailansicht; Verfügbarkeit aus streng geprüften Serverflags. Lokaler Gateway
liefert Capabilityvertrag und bindet Chatkontext vor dem Idempotenzhash an die
öffentliche Allowlist. Keine Rechte aus Clientkontext, keine Liveproviderbehauptung.

Unabhängige Prüfung fand einen Hashrouter-Skiplinkfehler; korrigiert und per
Tastatur nachgeprüft. Zentrale Sichtprüfung fand veraltete CSS-Selektoren für
Folgeseiten-Erklärmodule; korrigiert, Desktop-/Mobilgutter nachgemessen.

Prüfungen:152Pythonfälle,18Site-Contracts, React-/Standalone- und Next-Build,
Typen, Audit, Architektur und E2E grün. Browser:36öffentlicheRouten mit gesamtem
Textbestand,10privategesperrt,49Textmodule,PDF/Entwurfsansichten,Pendingoutbox,
Marketingvorlage,öffentlicherChatkontext,Menü/Footer,DE/NL/FR,Mobil/Offline,
Sprunglink/Abschnittsfokus und fünf Desktopbreiten. Keine Gesamt-, Produktiv-
oder Normzertifizierung. Bundle559,62KB/gzip157,15KB bleibt Leistungsfinding.

Quellen: docs/architecture/nex2fly-page-source.md und service-content-source.md.
Prüfumfang: docs/design/detail-expansion-contract.md; unabhängiger Bericht:
docs/quality/detail-expansion-review.md. F007 bleibt aktiv; bestehende
Main-/Releasegates bleiben unverändert. .cloud/Affilinet unverändert.

Nächste Arbeiten: weitere Originalinhalte und fehlende produktive Auth-/Suite-/
Provider-/Versand-/Kalender-/Medien-/Shopanbindungen mit getrennten Rechten und
Betriebsnachweisen umsetzen; Performancebudget auflösen. Marketing/Mailings/
Social erst nach Systemfertigstellung; GEO nach SEO-Grundlage und Vermarktung.

---

# Rekonstruktion nach verworfener Vorschau · 26.10.2026

Aktiver Zweig: `factory/source-faithful-rebuild-2026-10-26`. Der vorherige
Oberflächenstand ist ausdrücklich vom Nutzer verworfen; historische grüne
Technikprüfungen weiter unten sind keine Designabnahme. Archivzweig und Bundle
bewahren ihn. Änderungen von `origin/main` bis 07833fb sind integriert.

Die neuere Nutzergrafik ist eine Gestaltungsreferenz ohne vorhandenen Codeexport.
Neue React-Startseite mit offener Bühne, transparentem Figurenentwurf und
redaktionellen Folgeabschnitten gebaut. Große leere Videokästen entfernt;
Erklärtexte, Folgeaktionen und Rundgänge erhalten. Agentenwege sind offline
anschaubar; Schreibaktionen bleiben an den lokalen Gatewaystatus gebunden.
Keine vorgetäuschten Versand-/Kalender-/CRM-/Modellzustände.

Neue Unterlagen: Quellenrekonstruktion (93 Original-/Referenz-HTML-Dateien plus
1 verworfener Implementierungseintrag), Standards-Anforderungsmatrix,
Gesamtbetriebsmodell und Selfservice-Policy. Das Betriebsmodell ordnet
12 Abteilungen und 15 Workflowketten zu; es behauptet keinen laufenden
24/7-Agentenbetrieb. Siehe `docs/operating-model/NEXIFY-GESAMTSYSTEM.md`.

Öffentliche Registrierung als Produktregel korrigiert: 24h Suite, BYOK oder
bestätigtes 500-Cent-Testguthaben, keine geschenkten LLM-Credits und
bestandserhaltende Konvertierung. Reguläres Prepaid-Minimum unverändert.
Privater SQLite-Domainkern mit 13 gezielten Tests; unabhängige Prüfung fand
zwei Fehler, beide behoben und erneut geprüft. Echte Clerk-/Vault-/Payment-/
Provideradapter und serverberechnete Payload-/Kostenbindung bleiben offen.
Kein produktiver Login, keine Zahlung und kein kostenpflichtiger Modellaufruf.

Die .de ist weiterhin dem vorherigen Entwicklungszweig zugeordnet; keine
neue Designabnahme oder Domainumstellung erfolgt. .cloud unverändert.
Affilinet Portal Aachen bleibt unangetastetes, separates Kundenprojekt.

Prüf- und Abnahmekriterien: `docs/design/rebuild-acceptance.md`;
unabhängiges Review: `docs/quality/rebuild-independent-review.md`.
F007 und bestehende Main-/Releasegates bleiben unverändert.

Aktuelle Nutzerpriorität: erst Gesamtsystem fertigstellen; Marketing/Mailings und
alle eigenen Social-Kanäle danach aktivieren. Vollständige SEO-Basis bleibt offen;
GEO erst auf geprüfter SEO-Basis und laufender Vermarktung. Als geordneter Backlog
in `config/operating-model.json` erfasst, keine aktuelle Kampagnenaktivierung.

Geprüft: 146 Pythonfälle, 16 Site-Contracts, Site-Build/Standalone, Next-Typecheck,
make check/test/e2e/check-arch/clean-check. Lokaler Browser: 35 öffentliche Routen,
47 erhaltene Erklärmodule, 10 private Ansichten gesperrt, PDF/Outboxpending/
Marketingvorlage, DE/NL/FR, mobile Dialogführung und Offlinevorschau.
Keine gestalterische Nutzerabnahme oder Produktiv-/DIN-/ISO-Zertifizierung.

---

# Live-Vorschau bestätigt · 26.10.2026

https://nexifyai.de ist als Alias des READY-Previewdeployments
 dpl_5YEzN7oMMpBFjNUWvBrLmQgdxeLm für409db50durchauthentifizierteAPI+CLIbestätigt.
VercelAusgabepfadfehlerundAutorblockadesindfürkanonischesProjektbehoben;
GitHubautorjetztnexifyai-dev,5eigeneCIjobsauchauf409db50grün.
KeineeigeneMain-/Produktivpromotion,.cloudChatGPTseiteunangetastet.
ZusätzlicheVercelAppsite(selbesRepo,nurvercel.app)hatteparallelRoot/outputFehler;
Konfigurationistkonsistentkorrigiert,Read-backvorhanden;keineLöschungoderDomainübernahme.
ExternCloudflareWorkernamelängeweiterseparatoffen.

---

# Vercel-Projekt eingerichtet, React-Clerk und ENV abgeglichen · 26.10.2026

CLI65.2.0OAuthalsnex2fly-nexifyai-nexifyerfolgreich,Projektprj_Po7jlB7srMP6sxyMvf5zIwzXzNyh
gezieltverknüpft. AuthentifizierterRead-backzeigtefalschPython/Node24; aufVite,
Node22.x,Reporoot,pnpm12workspacebuild,Outputapps/site/distkorrigiertundzurückgelesen.
Nexifyai.deistverifiziertundandenvorhandenenEntwicklungszweiggebunden; .cloud
bleibtunangetastet. HauptbranchwurdevomNutzeraußerhalbdieserSitzungviaPR34auf
ccbe092gemergt;keineeigeneMainpromotion/Jeffgateerfunden.

Zukunftscommitsnutzennutzerbestätigtemail@nexifyai.cloud;GitHubordneteCommitd1539de
nexifyai-devzu,vorherigeCommitsschonendunverändertNeXify-Automate. KeinTeamgatebypass.
EigenefünfRemoteCIjobsnach339af39grün. ZusätzlicheCloudflareWorkersIntegration
scheitertunverändertanNamelänge,keineheimlicheProvideränderung.

EchteReact-ClerkUI6.18.1jetztwiederhergestellt;lazySDK,explizitesVITEFlag+validPK,
Datei/Standaloneimmeraus,fixerRedirect/,keineAdmin-/Tenantautofreigabe.
VITE_CLERK_PUBLISHABLE_KEYundVITE_CLERK_ENABLEDfalsefüralle3Umgebungenhinzugefügt
undbeideWerteperAPIbooleschverglichen. ClerkDomainnochNXDOMAINdeshalbnichtaktiviert.
VorhandeneClerkserverSecrets/Auth0/DB/Providerwerteunverändert,keineSecretwertegelesen.
42ENV-Vertragsnamen/24RemoteNamen/38Metadatensätzegeordnet,nichtalleDiensteVercel.

16SiteTests,133PythonTests,E2E/Architektur/Clean/Browser35public+47Module+Guide/Offlinegrün.
GlobalePlugininstallationundMCPregistrierungandenphysischschreibgeschützten
Client/Homebereichenblockiert;offizielle9StandaloneSkillsprojektbezogeninstalliert
undlistverifiziert,skills-lock.jsonerhalten. CLIbleibtauthentifiziertnutzbar.
NochkeineVercelDeployReady/LiveLogin/produktiveVisitorAPI/ChatGPTBackupsyncAbnahme.

---

# Durchgängige Seitenbegleitung · 26.10.2026

React-Begleitung nun9geführteNutzerwege+47Erklärmoduleauf35öffentlichenSeiten,
inklusiveShop/Werkstatt;12Kernseitenlinks/rechtsmitunterschiedlichenSprechern.
Alle9Journeys+NeuladepräferenzimBrowserlokalgeprüft;keineAutonavigation/Mikrofon/
Tonaufnahme. SessionpräferenzgewährtkeineRechte;10privateAnsichtenbleibenunverfügbar.
AlleVideoassetspending,0veröffentlichteClips;keineFakePlaybuttons.
VorhandeneInhalteunverändert,93Originalquellenweitererhalten69Backlogoffen.
AktuelleinteraktiveDatei /workspace/preview/nexify-preview.html.

YAOTI-Konzeptuseruploadgelesen/gehasht,keineAutoplay-Beispielinstruktionübernommen.
REA6.8wirklichperSTDIO:229Tools,HomepageGuideSnapshot,DriverMITQuellepartiell
analysiert;404KBBundle15sTimeoutundöffentlicheREAInspektionverweigertoffengehalten.
7Lösungsoptionen/8Paketarchiveoffiziellrecherchiert;nativeBegleitungbevorzugt,
Driver/Joyrideoptional,LiveanbieterkeinZwang. Researchunabhängiggeprüft22Hashes.
Plan docs/strategy/presenter-implementation-plan.md;Produkt-/Finanzmatrixund
Wissenszugriffsmatrixergänzt. KeinAllchatsAPI/Chatlogimport/Kundenvermischung.

React12Tests,neuerBuild/Standalone/Nextreferenzbuildgrün;Browsertests35Seiten,
47Module,9Journeys,PDFentwurf/Outboxpending/Marketingdraft,DE/NL/FR,mobilgrün.
E2E-/Architektur-/CleanAbschlusslog .onboarding/react-preview/presenters-final-*.
Quellehashgateconfig/presenter-sources.json11Quellenfixiert;unbekanntevorLesen
abgewiesen. KeineProduktivabnahme,F007bleibtaktiv. RemoteDeploymentlesenGH403;
keineautomatischeVercel-/ChatGPTLiveSynchronitätbehaupten.

---

# Portable React-Vorschau, DNS und MCP-Abgrenzung · 26.10.2026

Aktiver Hauptfrontendbuild: apps/site React19.3.1/Vite8.3.5; vorhandene UI,
Texte und Tokens geteilt, Next-/Clerk-Referenz unter apps/web erhalten.
Vercel-Rootconfig und CI für portablen Reactbuild vorbereitet; keinRemoteDeploy.
Live lokal3004+VisitorAPI3003; keine öffentlichePortfreigabe/Vercelverbindung.
ÖffnungsfähigeStandaloneHTML unter /workspace/preview/nexify-preview.html.
Browsernachweise:35öffentlicheRouten,10privateAnsichtenunverfügbar,
ChatentwurfbleibtbeimNavigieren, echterEntwurfsPDFdownload,Outboxpendingnichtgesendet,
Marketingvorlagenichtveröffentlicht,DE/NL/FR,mobil,Standalonebilder+Hashnavigation.
Siehe .onboarding/react-preview/browser-results.json außerhalbdesRepos.
React7Tests,Auth6Tests,Python133Tests,Typecheck/Reactbuild/Nextreferenzbuild,
Designaudit0/0,Architektur,E2EundCleanState bestanden.

93/93Prototypquellenhasheserhalten,24direktreferenziert69expliziterBacklog;
keinevollständigeInhalts-/Backendabnahme. docs/architecture/0012-preview-coverage.md.
DNS:alle5benutzerdefiniertenClerkCNAMEsfehlen,keinefalschenZielebeobachtet,
bestehendesDMARCp=noneerhalten. KeinDNSwrite/Serversecret/Useranlage.
MCP:ComposioresourcezeigtComposioissuer,keineeigeneKontrolle/Serverquellenvorhanden;
ClerkSollconfignichtveröffentlicht,keineLiveOAuth-/Tooltestsbehauptet.
BackupChatGPTDeployschnittstelleweiteroffen;ArchivintegritätistkeineLiveSynchronität.
F007bleibtaktiv,keineMain-/Produktivfreigabe;AffilinetbleibtseparaterKunde.

---

# Domainklärung · 26.10.2026

Nutzer bestätigt Vercel als Hosting, nexifyai.cloud als spätere Hauptdomain und
nexifyai.de als Vorschau. Bestehende ChatGPT-Seite auf.cloud bis Fertigstellung
bewahren, kein vorzeitiger DNS-Wechsel. Clerk authorizedParties exakt auf beide
HTTPS-Origins begrenzt. Gelieferter öffentlicher RSA2048-PEM gespeichert/geprüft,
Issuer/JWKS-Bindung noch offen und nicht als statischerJWTkey aktiviert.
RemoteDomainbindung, Primary/Satellite, Secret, CNAMEs und LiveAuth bleiben offen.

---

# Clerk-Produktionsvorbereitung · 26.10.2026

Aktiver Zweig: `factory/agency-separated-2026-10-26`. Lokale Implementierung,
keine Produktionsfreigabe. Geprüft:124Python-,5Auth-Tests,Typecheck/Build,
Designaudit0Fehler/0Warnungen,Architektur und Clean-State grün; unabhängige
Auth-Gegenprüfung inklusive fehlerhafterPublicKeys abgeschlossen. Clerk SDK7.9.20, deutsche UI4.24.1, Anmelden und
Registrieren, geschlossene Schutzschicht ohne automatische Geschäftsrechte.
45 Routen:35öffentlich/10geschützt. PublicKey lokal ignoriert und im Cloud-Draft10;
Serversecret nur angefordert, nicht gebunden. Domain/Hosting und genaue Clerk-CNAMEs
bleiben offen; DNS-SichtungNXDOMAIN für clerk.nexifyai.de. Keine Benutzer-/DNS-/
Deploymentmutation. Vollständiger Stand: docs/deployment/clerk-setup.md und
config/clerk-production.json. F007 bleibt aktiv; Affilinet bleibt separates
pausiertes Kundenprojekt. Frühere Fortschrittsabschnitte sind historische Nachweise.

---

# Korrigierte Projektgrenze · 26.10.2026

- Nutzerklärung: Affilinet Aachen ist ein gesondertes, pausiertes Kundenprojekt. Der frühere Import und die Einordnung als Agenturmodul waren falsch und sind verworfen.
- Aktueller Entwicklungszweig: `factory/agency-separated-2026-10-26`, von vor dem Kundenimport abgezweigt. Kundenbaum `apps/portal` und bekannte Kunden-Commitköpfe sind ausgeschlossen; acht offene Agenturdateien wurden unverändert erhalten. Der alte Importzweig bleibt ausschließlich lokal gesichert, nicht veröffentlichen oder zurückmergen.
- Die historische N2-Designreferenz bleibt unter `reference/handoff-n2` getrennt gekennzeichnet. Sie aktiviert keine Anwendung oder alte Pipeline. Original-Kundenrepository unverändert und pausiert.
- Quellenklassifikation und selektive Wiederverwendung: `config/source-boundaries.json`. Keine Kunden-/Agentur-SSO, Datenmigration oder Produktabhängigkeit ableiten. Kundenprojekttests zählen nicht als Agenturabnahme.

## Next Steps

1. Nur die eigenen Agentur-/TEILEKLAR-/Web-/Gateway-Aufgaben fortführen. Keine Affilinet-Übernahme oder automatische Kundenprojekt-Einrichtung.
2. Brauchbare Komponenten aus allen autorisierten Quellen gezielt bewerten und mit Quelle/Commit, Zweck, Anpassung und Tests übernehmen.
3. Offene CI-/Frontend-/Integrationsprüfungen des Agentursystems fortsetzen; technische Erreichbarkeit, Live-Anbindung und Gesamtfertigstellung weiterhin getrennt ausweisen.

---

## Überholter Integrationsplan (durch diese Projektgrenze korrigiert)

# Aktueller Integrationsauftrag · 26.10.2026

F-007 ist aktiv: kanonisches gemeinsames Repository, Next.js/TypeScript-Webshell mit nativer AIFly-Seitenleiste, vollständige DE-/TEILEKLAR-Seitenarchitektur, isolierte REA-Instanz, Small-Business-Bibliothek und GitHub/GitLab-Automatisierung. Der nächste lokale Zwischencommit sichert die geprüfte Implementierung vor dem herkunftsgebundenen Import der anderen beiden Quellstände. Keine Main-/Produktivfreigabe und noch kein gesamthaft fertiges Unternehmen.

- Offizieller OpenRouter-Katalog bestätigt `deepseek/deepseek-v4.1-flash-1017`, reasoning high. Adapter erzwingt Modell-/SHA-/Schema-/Budgetbindung; kein Paidcall ohne echte Credentialbindung, keine Ausführung von Modelltext. Legacy-Merge-vor-Review-CLIs sind hart stillgelegt.
- Zusätzliche REA6.8.0-Installation unter `.onboarding/rea-mcp`, gewünschter Alias `rea-mcp`:229Tools/6Prompts erfasst. Eigener Rechenkern statisch analysiert und buche-Trace/Evidence-Readback geprüft. Hostregistrierung und VPS-Verbindung getrennt behandeln.
- Small Business offiziell gepinnt installiert:44Skills/35deklarierteMCPRegistrierungen/216Hashdateien. Lesender Loader und nativeFunktionsmatrix, kein Cowork-/Connector-/Scheduler-Go.
- Neue IA:44Routen,34öffentlich/10geschützt; NeXify/TEILEKLAR/Portale/Intern getrennt, Deutschland90Prozent als Ziel. NextBuild mit dieser IA bestanden; abschließender neuer Browserlauf nach Import noch ausstehend.
- Native Besucherverläufe lokal echt geprüft:PDFdraft, idempotente Outbox `pending_provider`, lokale Terminanfrage, Marketingstrukturvorlage. Kein behaupteter Versand, Livekalender oder freier Modellchat.16HTTP-/Storagegegenproben; frühereBrowserprobe mit15altenReferenzrouten ist kein aktueller34Routenbeleg.
- Aktuelle erforderliche Checkpointprüfung `make check && make test && make clean-check` grün; formale neueGitHubWorkflows mit gepinntemActionlint1.7.7 geprüft. A1-CI getrennt mit76Backendtests/0Skips+4DOM/CIbuild lokal verifiziert und als Importquelle gesichert.

## Next Steps

1. Portalquelle inklusive Historie nach `apps/portal`, zweitenHandoff nach `reference/handoff-n2` übernehmen; Originalrepos und vollständigeBundles bewahren. Quellenverträge auf Monorepopfade umstellen und Herkunftsbelege prüfen.
2. PNPMWorkspace frisch/frozen installieren und Next-Typecheck/Build + abschließendeBrowserjourneys über34öffentlicheRouten ausführen.
3. LokaleGitLab-CI-Containerausführung, AI-/MCP-/Mirror-/Legacy-/Skillgegenproben und formalesWorkflowlint abschließen. Jeff-/Produktivgates erhalten, konkreteRemoteGitHubrechte prüfen.
4. GetrennteBackend-/UI-/Integrationsgegenprüfung abschließen. ExterneProvider, VPS/Composio/Paperclip/Brain/Runway/ElevenLabs-Verbindungen erst nach echtemProtokoll- und Readbacknachweis als verbunden melden.

---

## Vorheriger API/Auth-Checkpoint

# Aktueller Vertragsschnitt · 26.10.2026

- Nutzerentscheidung: API/Auth aus den vollständigen Repository-Prototypen und Seitenbestimmungen ableiten; die frühere Suite-Quellenrückfrage ist erledigt.
- F-006: vorgeschlagener Vertrag in `docs/contracts/`, 93 HTML-Seiten (47 N1, 46 N2), 63 abgeleitete Capabilities, 97 Pfade/102 Operationen/107 Schemas. Keine aktive API-/Auth-Runtime daraus ableiten.
- Stimmen exakt gebunden: NeX `Lbm7qDmJUxIxpWx9qhZO`; AIFly und Nutzer beide `feTHtWuEJFLTOWyoreyy`. Runway als Videoquelle, Erstellung fehlender Clips beauftragt; ElevenLabs via Composio für Sprachfunktionen. Drei Skript-/Szenenentwürfe, null Providerjobs.
- Quellen-/Policyvalidator und 17 Vertragsprüfungen einschließlich unabhängiger Gegenproben; formale OpenAPI-3.1-Prüfung erfolgreich. F-006 nach allen drei Harness-Layern passing; `make check && make test`, E2E/Architektur und Clean-Check erfolgreich. 42 Python- und zehn Node-Tests; formale OpenAPI-Prüfung grün. Details im Vertragsprüfvermerk.
- Gegenprüfung getrennt von Autoren: Auth/Pool-/Scope-/Gastgrenzen sowie Medien-/Browserpfadnormalisierung geprüft; Findings korrigiert. Prototypen und Manifest unverändert.
- Noch offene Launchblocker: native Gateway-/Auth-/Shared-Pool-Runtime, öffentlicher Companion-BFF, kontofreier verifizierter Gastretouren-/Widerrufsweg, reale Runway-/ElevenLabs-Toolbindung und Medienassets. Die Anbieter sind in dieser Sitzung weder per Tool noch CLI oder erwarteter Credentialbindung exponiert; die Nutzerangabe zur externen Verfügbarkeit bleibt erhalten.

## Next Steps

1. Den geprüften Zielvertrag in einem eigenen nativen Gateway-/Auth-Inkrement implementieren; Rollen, Session/Issuer und DB-Principal-Bridge mit echten HTTP-/DB-Negativtests verbinden.
2. Die tatsächliche Runway-/Composio-/ElevenLabs-Anbindung lesen, Bestand abgleichen, dann fehlende Clips im bereits autorisierten Umfang erzeugen; keine pauschale Erstellungsrückfrage wiederholen.
3. Vor Gastverkauf den dokumentierten kontofreien Retouren-/Widerrufsweg und vor öffentlicher Live-KI den engen BFF-Vertrag liefern.
4. Gesamtauftrag, Prüfnachweise und Checkpoints unter `/workspace/.onboarding/FACTORY-*` fortschreiben; kein Main-Merge oder Produktiv-Go aus diesem Vertrag ableiten.

---

## Vorheriger Fundament-Checkpoint

# Aktueller Factory-Auftrag · 25.10.2026

- Nutzer hat die sofortige Umsetzung der Gesamtfertigstellung freigegeben; Ziel bleibt aktiv.
- Entwicklungsbranch: `factory/foundation-2026-10-25`. Kein Merge oder Commit auf `main`.
- Nachgewiesen: Audit wieder ESM-kompatibel (0 Fehler/0 Warnungen), Originalblob der geschuetzten Prototyp-Uebersicht restauriert, Manifest unveraendert. Navigation bleibt separat erhalten.
- Lokale Gesundheitspruefung verwendet denselben Kern wie der Live-Runner, ohne Produktions-DNS/Hostaktionen; zehn Tests inkl. Negativfaellen bestanden. DNS-Diagnose im Live-Runner ist nun ausschliesslich lesend, Befunde statt automatischer Reparatur.
- Vorschau gehaertet (Loopback, Freigabeliste, kodierte Pfade und Symlinkziele); sieben HTTP-Regressionstests bestanden und unabhaengig geprueft.
- `make check`, `make test`, `make check-arch`, `make clean-check` bestanden nach den Baseline-Reparaturen; abschliessende Protokolle liegen unter `/workspace/.onboarding/N1-*.log`.
- F-005 wurde ausschliesslich ueber `make verify-feature F=F-005` nach 36 echten PostgreSQL-Pruefaussagen technisch auf passing gesetzt. Drei Mandanten/DB-Principals, RLS, Kontextwechsel und Rollback bestanden; keine Gateway-/Shared-Pool-/Produktivabnahme und keine Wiederherstellung fehlender historischer Migrationen.
- Parallel im separaten Affilinet-Repository: Frontend gebaut/lokal geprueft; offizieller Stripe-Adapter, strikte Webhooksignaturen und Backend/Auth-E2E lokal geprueft. Transaktionale Abschluss-/Replayabsicherung, Wallet-/Retentionsgrenzen und Checkout-Identitaet wurden umgesetzt und getrennt geprueft; aktuelle Zahlen im Umsetzungsstand.
- Gesamtplanung, Auftragszustand und aktuelles vollstaendiges Quelleninventar: `/workspace/.onboarding/FACTORY-*`.

## Next Steps

1. DB-Gegenproben wurden ausgefuehrt und unabhaengig geprueft; als naechsten Schnitt die Gateway-Identitaet und den Shared-Pool-Vertrag festlegen, bevor eine Anbindung als fertig gilt.
2. Tests, Setup-/Startanweisungen und Wiederaufnahmezustand auf den tatsaechlichen neuen Stand bringen.
3. Lokale Checkpoints auf Entwicklungsbranches sichern; vorgesehenes Live-Reviewergate und Produktivabnahme nicht vortaeuschen.
4. Detailvertraege fuer Gateway/Auth/Queue/Brain ausarbeiten und innerhalb freigegebener Grenzen implementieren.

## Offene Voraussetzungen der Gesamtlieferung

B.V.-Identitaet/Vertretung und Vertragszuordnung, kommerzielle/steuerliche Widersprueche, finaler Brain-/Bestandsintegrationsvertrag sowie externe Betreiber-/Reviewerzugriffe sind weiterhin nicht belegt. Keine Preise/Rechtstexte oder produktiven Rechte aus dem lokalen Fortschritt ableiten.

---

## Historischer Stand (vor aktueller Cloud-Einrichtung)

# PROGRESS — NeXify AI Gesamtlösung (Design-Handoff)

## Current State
- Last commit: `11994bf` (branch `main`).
- Verification: `make check` (ds-audit) **0 Fehler/0 Warnungen**, `make test` (Audit + 10 Python-Tests + Manifest/Config) **OK**, `make check-arch` OK, `make clean-check` OK.
- Harness: `make audit` (Ziel 73/73). VCR: `make vcr`.

## In Progress
- Agent-Harness nachgezogen: AGENTS.md-Router (Verification/Constraints/State/Zustandsmaschine/DoD/Arch-Grenzen/Observability/Clock-in-out), feature_list.json, PROGRESS.md, DECISIONS.md, init.sh, Makefile, .harness/, .claude/, scripts/, templates/, docs/quality-document.md, prototypen/lib/ARCHITECTURE.md, requirements.txt.

## Offene Punkte (bekannt, bewertet)
- `tools/inhaltsabgleich.js` (Fakten-Konsistenz) erwartet das Herkunfts-Layout (api/openapi.yaml, lib/, Prototypen im Root) und ist in diesem Repo **nicht lauffähig**; der Absturz wurde entschärft (fehlende Quelle = Befund statt Crash). Bewusst **nicht** in `make check` verdrahtet. Vor Reaktivierung: Layout angleichen oder Tool entfernen (mit Freigabe).
- `config/fakten.json` referenziert teils ältere Prototyp-Namen (z. B. `NeXifyAI Cloud v10.dc.html`; vorhanden ist v12) → 18 DATEI-Befunde. Inhaltsprüfung/Freigabe offen.
- Behoben: Widerspruch Mindestaufladung — `docs/03-backend/api-prepaid-umsetzung.md` nannte 50 €, die Inhabervorgabe (29.09.2026) ist 10 € (`config/api-prepaid.json`); Doku angeglichen, E3 als entschieden markiert.
- Behoben (2026-10-11): `nexify-watcher.service` löste einen **selbstauslösenden Endlos-Loop** aus — `tools/watcher.mjs` überwacht `config/`, `prototypen/`, `docs/`, die ausgelöste Pipeline (`docs-aktualisieren.mjs`/`wissen-speisen.mjs`) schreibt in genau diese Bäume → Dauer-Regeneration (~0.9 Orakel-Aufrufe/s, 4h28m CPU, Tree dauerhaft schmutzig). Fix: Self-Write-Guard in `tools/watcher.mjs` (ignoriert `docs/STAND.md`, `docs/generiert/**`, `prototypen/MANIFEST.sha256`); `make check` rc0. Commit `11994bf`.

## Offene Punkte (bekannt, bewertet)
- **Netz-Exposition — BEHOBEN (2026-10-05):** 19 veröffentlichte Container-Ports waren über `0.0.0.0`
  erreichbar, weil Docker die ufw-Regeln über die Kette `DOCKER-USER` umgeht. Fix umgesetzt:
  `iptables`/`ip6tables -I DOCKER-USER -i eth0 -j DROP`, persistent über
  `docker-user-hardening.service` (idempotent, enabled). `node tools/exposure-check.mjs` **PASS**
  (ungeschützt 0); öffentliche Traefik-Endpunkte und lokale Zugriffe unverändert. Details/Rollback:
  `docs/EXPOSITION.md`.

## Next Steps
- Fakten-Referenzen in `config/fakten.json` auf die real vorhandenen Prototyp-Dateien (v12) prüfen und nachziehen; danach `tools/inhaltsabgleich.js` wieder verdrahten.
- Freigabe-Entscheidungen E1/E4/E5/E6/E12 einholen (siehe `docs/09-final/08-recht-und-compliance.md`) und in DECISIONS.md nachtragen.
- `prototypen/lib/ARCHITECTURE.md` und `docs/quality-document.md` fortschreiben.

## Blockers
- Freigaben des Inhabers (Preise/Recht) stehen aus; keine Änderung an Preisen/Rechtstexten ohne Freigabe.

## Externes Review und Wiederaufnahme

Das aktuelle `tools/jeff-gate.py` wurde ohne externe Aktion geprueft: Exit 3,
`NX_ORAKEL_ENDPOINT/NX_ORAKEL_KEY fehlt`. Dies ist kein go und keine automatische
Freigabe. Code kann auf Entwicklungsbranches geprueft/gesichert werden, main
bleibt vom vorgesehenen Gate abhaengig. Die NeX2Fly-Suite liefert aktuell einen
Proxy-CONNECT-403; gezielte Domainfreigabe ist im Umgebungsentwurf gespeichert,
kein Umgehen der Netzrichtlinie und keine bestaetigte Suite-API-Verbindung.

Der Gesamtauftrag bleibt aktiv. Ein gespeicherter Auftrag garantiert keinen
unbegrenzten Hintergrundlauf; bei Wiederaufnahme zuerst die aktuellen
`FACTORY-AUFTRAG.json` und `FACTORY-UMSETZUNGSSTAND.md` lesen und fortsetzen.
