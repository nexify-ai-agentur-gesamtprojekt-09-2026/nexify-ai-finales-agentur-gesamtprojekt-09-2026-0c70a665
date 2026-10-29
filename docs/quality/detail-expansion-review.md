# Unabhängige Gegenprüfung des Seiten- und Kontextausbaus

Stand: 26.10.2026. Von der Umsetzung getrennte Reviewerrolle; keine Änderungen
an Implementierungsdateien durch diesen Review. Geltung: die unten gehashten
Quellstände. Keine Gesamt-, Produktiv-, Liveprovider- oder WCAG-Abnahme.

## Ergebnis und korrigierter Befund

Kein verbleibender materieller Befund im geprüften Ausbau nach der gezielten
Skiplink-Korrektur. Die zentrale vollständige Browsermatrix und responsive
Bildprüfung werden hier nicht als eigene Prüfung ausgegeben.

Ein **P2-Tastaturbefund** wurde tatsächlich reproduziert: Im Standalone unter
`http://127.0.0.1:3018/nexify-preview.html#/produkte/nex2fly` änderte Enter auf
„Zum Inhalt“ die URL zu `#page-content`; dadurch erschien statt der NeX2fly-Seite
die Startseite. Die zentrale Umsetzung hat den Klick auf `preventDefault` plus
Scroll/Fokus umgestellt und `main` mit `tabIndex=-1` fokussierbar gemacht.
Gezielte Nachprobe am aktuellen Vite-Quellstand auf
`http://127.0.0.1:3004/#/produkte/nex2fly`, mit gesetztem Standalone-Schalter vor
Appstart: URL unverändert, H1 weiterhin „NeX2fly Suite: dein Einstieg“, aktives
Element `page-content`. Der Befund ist damit am Quellstand geschlossen; ein
neuer Standalone-Export muss diese Korrektur enthalten.

## Ergänzende P2-Korrektur: Seitenabstand der Erklärmodule

Die zentrale visuelle Prüfung fand anschließend obsolete Supplementselektoren
`.presenter-guide` und `.explainer-sections`. Die tatsächlichen Renderer verwenden
`.editorial-guide` und `.editorial-explainers`; dadurch fehlte den ergänzenden
Texten der vorgesehene seitliche Abstand. Die Umsetzung korrigierte ausschließlich
diese beiden Selektoren. Inhalte, Aktionen und Capability-/Authverträge wurden
nicht geändert.

Unabhängige DOM- und Screenshot-Nachprüfung des tatsächlichen Vite-Quellstands
auf Port 3004, jeweils `/produkte/nex2fly` und `/impressum`: Bei 1440 Pixel
Viewportbreite betragen beide Supplementabstände **72 px**, bei 390 Pixel
**24 px**. Guide-Text und Modultext beginnen in allen vier Fällen auf derselben
X-Koordinate wie der Hero-Text. Die rechte Textkante hält denselben Seitenabstand;
kein horizontaler Dokumentüberlauf wurde gemessen. Die Desktop-NeX2fly- und
Mobil-Impressum-Screenshots wurden zusätzlich visuell geprüft. API-Anfragen wurden
für diese reine Layoutnachprobe im Browser abgefangen; keine Schreibaktionen.

Messdaten und vier Screenshots:
`/workspace/.onboarding/detail-expansion-review/gutter-check.json` sowie die
benachbarten PNG-Dateien. Der zusätzliche P2-Befund ist am geprüften Quellstand
geschlossen. Von den **18** bisherigen Snapshotzeilen hat ausschließlich
`PublicContentLayout.css` einen neuen Hash; die übrigen **17** stimmen unverändert.
Nur dieser CSS-Hash wurde nach der Nachprüfung aktualisiert.

## Eigene Nachweise

- **24** lokale HTTP-/SQLite-Gatewaytests bestanden, einschließlich öffentlicher
  Allowlist, privater Kontextabwehr, CSRF, ownergebundener Replays und atomarer
  History-/Receiptpersistenz. `page_path` wird vor dem Payloadhash kanonisiert;
  Clienttitel, URL-/Privatpfade und zusätzliche Metadaten werden nicht akzeptiert.
- **Zwei** Capability-Vertragstests bestanden. Fehlende/falsch typisierte
  Boolwerte schließen die UI-Verfügbarkeit; unbekannte Rollen-/Tenantfelder
  werden entfernt. Diese Angaben beschreiben lokale Operationen und stellen
  keine Authentifizierung oder Berechtigungsvergabe dar.
- Eigene schmale Standalone-Browserprobe auf der NeX2fly-Unterseite:
  Abschnittsbutton erhält die Hashroute und fokussiert
  `content-nex2fly-ueberblick-0`. Der Angebotsintent ist offline sichtbar,
  während der mutierende Submit deaktiviert bleibt. Es wurde dabei keine
  `/api/`-Anfrage beobachtet. Keine Konten, Zahlungen oder externen Provider.
- Die Produktseite rendert `layout-product`; beide zugeordneten N2-Originale
  one/API existieren genau einmal im Quellenkatalog. `derivation_kind` und
  Quellendokument unterscheiden fachliche Ableitung und aktuelle Nutzerentscheidung
  von einer nicht nachgewiesenen ursprünglichen NeX2fly-HTML-Seite.
- Aktueller Umfang: **46** Seiten, davon **36** öffentlich und **10** geschützt;
  **49** Erklärmodule, sämtlich `asset_pending`. Alle **13** genehmigten
  Presenter-Quellenhashes stimmen. Kein veröffentlichter Player wird aus
  fehlenden Videos erzeugt, private Quellenpfade bleiben aus dem Publicpayload.
- Die sieben erweiterten Leistungs-/Entscheidungsseiten behalten ihre bisherigen
  Abschnitts-IDs und haben jeweils vier statt eines Abschnitts: **21** Ergänzungen.
  Die Quellenmatrix benennt die Originale und übernimmt keine historischen
  Tarife oder unbewiesenen Betreiber-/Laufzeitversprechen.

## Geprüfte Grenzen

Navigation, Breadcrumbs, Gruppenkarten und Footer verwenden die öffentlichen
Seitenobjekte. Die NeX2fly-Produktableitung ist in den Produkttyp aufgenommen;
Abschnittswechsel mutieren den Hashrouter nicht. Die Headerdisclosures werden
bei Routenwechsel geschlossen. Guidepräferenzen sind weiterhin reine UI-Daten.

Workspace verwendet Session-CSRF und die jeweilige lokale Capability sowohl
für Buttons als auch für Submitguards. Der zusätzliche `act`-Guard sperrt ohne
bereite Session. Die Angebotsvorschau rendert tatsächlichen Titel/Inhalt und
Referenz eines eigenen Gatewayentwurfs; es gibt keine erfundenen Dokumente,
Mailzustellungen oder Kalenderbestätigungen. Clerk-Login und Visitorcookie
werden nicht als Mandanten-/Rollen- oder SSO-Brücke gekoppelt.

Die neue NeX2fly-Seite kennzeichnet Registrierung und LLM-Zugang als noch nicht
aktiv. Die 24-Stunden-Suitephase, separat finanzierte LLM-Nutzung und einmalige
500-Cent-Ausnahme stammen aus der aktuellen Nutzerpolicy; bestehende reguläre
Prepaidgrenzen werden dadurch nicht geändert. Keine neue pauschale Rückfrage
für bereits autorisierten Quellenausbau oder gezielte Codewiederverwendung.

## Verbleibende Prüfgrenzen

Der bekannte Bundlehinweis von ungefähr **559 KB** bleibt offen; Grenzwerte
wurden für diesen Review nicht gelockert. Keine Core-Web-Vitals-, vollständige
Screenreader-, Produktionsauth-, Gateway-, Video- oder Drittanbieterabnahme.
Die einmaligen lokalen Tests und Quellhashes beweisen keinen Dauerbetrieb.

## Quellensnapshot SHA256

| Datei | SHA256 |
| --- | --- |
| `apps/agent-gateway/server.py` | `6b9d7d36e15b558688824a28d2f3cd596c340207d7a0e60cb4bb6f2cd5b92c61` |
| `tests/test_native_chat.py` | `1ccff46d5168ca80791b4f851f50c1f78c1f444fbad7ef740bdb2656e3e88ab0` |
| `apps/web/components/Workspace.tsx` | `eec628fa35cc940ab33e97def2f0d326f7e2f115e01c35426588968e3f7c89ba` |
| `apps/web/components/WorkspaceCapabilities.ts` | `7137ab6e62c3d2566d6fd247ce70bc76cc7d1ad5cabbbcfd6e60c1e61562a9e2` |
| `apps/web/components/SiteNavigation.tsx` | `458a89b42dff96b84a2177ea70b09e97eb1bb7b5c0e7e2354ca3bc277024112f` |
| `apps/web/components/SiteFooter.tsx` | `7fc20d094fb4e4f4f4090ece24224a3599dbfd06d1a4e4fc34c1a25aa5932de8` |
| `apps/web/components/PublicContent.tsx` | `cef8e0c3084a582868f4b82128cc96eae7df9d68571c7c2efc469c1d97fb7d08` |
| `apps/web/components/PublicContentLayout.css` | `ff74a7129d2cbc9117c24b289efb752d705fabd35015d271500f409ddf867557` |
| `apps/web/components/WorkspaceRebuild.css` | `87074666f4b4ad6e0a0815f32822cebc243c6ddc31fc182c100b3bca295a0584` |
| `apps/web/components/HomeContent.tsx` | `eeb1fe649097390680011b7147ab5411249b724ea979b75266c36ac1b32eeb61` |
| `apps/web/components/HomeRebuild.css` | `3020ffd4093dfd26f4b788fddbe3b3bc5ee148c5c1861dad6a78df67c858c386` |
| `apps/site/src/main.tsx` | `8c2534de574520cdb9baebf6888a8b4ca9e94874027bf07d2d1ee374de8d942a` |
| `apps/site/scripts/generate-public-data.mjs` | `242666869fc488daf2ec5f1cbfddf4a0b4af7d33bedfd9f63976d00cfc4e0a6b` |
| `config/site-map.json` | `9e6642a39a61cf2cdbbf02d13cc217ac7e84e5530ebc6c34208754cb949185af` |
| `config/page-explainers.json` | `fda351339aa3ca5f55ecd76c8443189a5d023f83aef64167d3b8af0a5e6adc2c` |
| `config/presenter-sources.json` | `2d02d84054f54dad9136d463bcbeaaab37cd5de970f7724e83c5ff8dc4ee144f` |
| `docs/architecture/nex2fly-page-source.md` | `aec8ca6e9df0821d3b583490022ced048a6de5477258bde78b187c640b6c657c` |
| `docs/architecture/service-content-source.md` | `4b8835b29e2cf8ca77f66a03b9bb991fc9a46f3598678ed65cd3e401285329a9` |
