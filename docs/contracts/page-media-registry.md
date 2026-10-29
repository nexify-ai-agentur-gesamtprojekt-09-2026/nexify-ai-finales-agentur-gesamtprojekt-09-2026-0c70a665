# Seitenbezogenes Medienregister

`config/page-media-registry.json` erfasst alle 46 Routen der aktuellen Sitemap:
36 öffentlich, 6 privat und 4 intern. Der aktuelle Stand ist vollständig pending:
`assets:[]`, sämtliche de/nl/fr-Assetreferenzen null. Zusätzlich besitzt jedes der
49 öffentlichen Explainer-Module einen eigenen Kontextdatensatz und drei leere
Localeslots. Es werden keine erfundenen
Videopfade an Browser ausgegeben. Die technischen Textmodule bleiben erhalten;
fehlende Medien werden nicht als fertige Filme bezeichnet.

## Tatsächliche Quellen und Ablehnungen

Das vorhandene Vorproduktionspaket ist Libraryobjekt
`libfile_4c255bb88af48191a025daecac648997`, Archiv-SHA256
Version1, Archiv-SHA256
`34cc18cacddb4e5d952dcd6b07b187d700e999b2acd00c5a41a2a4d212b23377`. Historische Version0 bleibt erhalten.
Die vom Root bereits materialisierte und gehashte Skriptquelle unter
`.local/media-coverage/production-plan/nexify-product-video-scripts.de.json`
bindet7 deutsche Planfilme/21Szenen. Sie enthält keine erzeugten Audio-/Videobytes.
Der gespeicherte Planhash dient der Provenienz; der Projektor behauptet keinen
erneuten Librarydownload oder unabhängigen Archiv-/Providerabgleich.

| Plan | Kontextbindung | Aktuelle tatsächliche Medien |
| --- | --- | --- |
| NXV-DE-00 | home `/` | keine freigegebene Version |
| NXV-DE-01 | scope `/leistungsumfang` | keine freigegebene Version |
| NXV-DE-02 | nex2fly `/produkte/nex2fly` | keine freigegebene Version |
| NXV-DE-03 | api `/produkte/api` | keine freigegebene Version |
| NXV-DE-04 | tk-home `/teileklar` | keine freigegebene Version |
| NXV-DE-05 | apps-portals `/leistungen/apps-portale` | öffentliche Erklärung, kein internes Portalvideo |
| NXV-DE-06 | intern, ausdrücklich ungebunden | keine behauptete Arbeitsplatz-Auslieferung |

Je Plan sind die drei vorhandenen Szenen und Sprecherrollen Pascal/NeX/AIFly
geführt. Die übrigen Seiten behalten ihre eigenen 49 Textmodulreferenzen und
konkreten Kontextlücken; derselbe Film wird nicht pauschal allen Routen
zugewiesen. Private/interne Routen besitzen keine öffentlichen Filmzuordnungen.
Deutschsprachige Skripte beweisen weder Übersetzung noch fertige Sprachfassungen.

Die zwei veralteten inneren Castinghash-/Größenangaben sind in Libraryversion1
gegen tatsächliche Bytes und bereits korrektes äußeres Liefermanifest abgeglichen.
Nur Innenmanifest und dessen Außenmanifest-Verweis ändern sich;33Inhaltsdateien
bleiben bytegleich. Beide Manifestketten sind korrekt (33/34Einträge). Der
historische Version0-Befund bleibt gespeichert; der Delta-/Reviewbeleg steht in
`evidence/page-videos-2026-10-27/manifest-reconciliation.json`. Die technische
Integritätslücke ist geschlossen, Casting/Produktionsfreigaben bleiben offen.
Der Projektor sperrt weiterhin jede zukünftige Quellintegritätslücke und sämtliche
Assets ohne passende Belege/Budgets.

Das bestehende `hero-trio.png`, SHA256
`76969135f5eee86871a7da2ea09829786f9366ce34cd8bdac9432b6e0c4a9bc4`,
ist wegen der abgelehnten AIFly-Orb-/Augen-/Ringdarstellung
`rejected_visual_reference`. Diese Bytes können weder Quelle, Charakterbeleg
noch Poster einer freigegebenen Fassung legitimieren. Der Projektor sperrt den
Hash zusätzlich fest im Code, auch wenn jemand die Liste entfernen möchte.
Er verändert das Bild nicht und erfindet keinen Ersatzcharakter.

Der 13-Sekunden-Reviewclip, Library
`libfile_dea4df8814b08191a738c8d6f727ae32`, SHA256
`b2082a9f55167ddf1b8789a185135ad28968d170bd8b41f689a67d12d5c254a7`,
ist separat `review_only_not_approved`. Sein bekannter Bytehash ist zusätzlich
fest für veröffentlichte Renditions und Quellen gesperrt. Umbenennen,
Statuswechsel oder eine neu geschriebene all-pass-JSON-Receipt können ihn nicht
zum finalen Film machen. Ein legitimer neuer Promotionsvertrag wäre eine
separat zu prüfende und versionierte Änderung; es gibt keinen Daten-Override.
Die Negativregression verwendet ausschließlich einen Hash-Seam mit synthetischen
Dateien und kopiert keine echten Reviewclipbytes in die öffentliche Ablage.
Auch Pascal-/NeX-Referenzbilder sind kein freigegebener Film.
Stimmenwahl und 540-Credit-TTS-Vorschlag bleiben unfreigegeben.

## API und öffentliche Projektion

```js
await prepareVideoAssets(registry, fullSiteMap, {
  publicRoot, repositoryRoot, explainerPages // tatsächliche page-explainers.pages
})
// {byPage: {publicPageId: {de?: PublicVideo, nl?: PublicVideo, fr?: PublicVideo}},
//  byModule: {publicPageId: {moduleId: {de?: PublicVideo, nl?: PublicVideo, fr?: PublicVideo}}},
//  coverage: technische öffentliche Zählwerte}
```

Master 1.3, RQ-038/TST24 und `current_target_contract.video` verlangen die konkrete
49-Modulbindung, nicht bloß einen allgemeinen Film pro Route. Direkt gelesene
lokale Quelle `.local/master-v1.3/execution-register.json`, SHA256
`6ba953fc6154f1a5176b9c680aad46fc11597e1871d230578b5342409d6674fe`.
Die sieben Vorproduktionsfilme sind ausdrücklich kein Vollständigkeitsnachweis.

`registry.modules` enthält exakt einen Datensatz je tatsächlichem öffentlichem
Modul: page_id, module_id, context_id, eigener context_title, film_id,
scene_ids, assets(de/nl/fr), status, voice_status, approval_status, gaps und owner.
Modul-ID, Seite, Titel und Sprecher werden gegen den echten Explainerbestand
gebunden; `context_id` ist eindeutig `module-<module_id>`. Fehlende, fremde,
private, doppelte oder auf andere Seiten verschobene Module blockieren. Auch die
Routenliste `script_module_ids` muss exakt mit diesem Quelleninventar übereinstimmen.

Alle 49 Moduldatensätze führen aktuell `film_id:null`, `scene_ids:[]` und ausschließlich
null-Assetreferenzen. Die sieben vorhandenen Routefilmpläne werden nicht blind
in diese Slots übernommen. Ein optionaler Routeintrofilm erscheint ausschließlich
in `byPage`; ein Modulfilm ausschließlich an seinem konkreten `byModule`-Ziel.
Es gibt weder ersten-Modul-Fallback noch eine automatische Headerfilmübernahme.
Die Asset-/Receiptform bleibt gleich: eindeutiger Kontext und Seite/Locale
bestimmen das Ziel, ohne zusätzliche Producer- oder Operatorrechte.

Modul: `apps/site/scripts/public-video-assets.mjs`. Keine Generierung, Downloads,
Uploads, Installation, Modellaufrufe oder Provideraktionen. `publicRoot` muss
innerhalb des expliziten Repositoryroots liegen. Jede Sitemaproute muss genau
einmal mit identischem Pfad, Anwendungskontext und Sichtbarkeit vertreten sein;
Kontextkennungen sind eindeutig. Ein unbekannter/privater Pfad wird nicht durch
das Medienregister öffentlich.

`byPage` enthält ausschließlich public-allowlist-Seiten mit visibility public
und `auth_required:false`. Aktuell sind das 36 leere Routeobjekte und 49 leere Modulobjekte, verteilt auf die
36 öffentlichen Seiten. Private 10 Seiten
bleiben ausgeschlossen und müssen hier null-Assetreferenzen behalten. Für ihre
spätere Auslieferung ist eine eigene authentifizierte Mediennaht erforderlich;
der öffentliche Projektor ersetzt keine Rollen-/Tenant-/Mitgliedschaftsprüfung.
Auch interne Texte, Provider-, Voice-, Operator- oder Approvalreferenzen werden
nicht projiziert. `coverage` enthält ausschließlich öffentliche Counts und die
Anzahl offener Quellintegritätslücken, keine privaten Routen oder Belegpfade.

Die bisherigen Routenmetriken bleiben 36 Seiten/108 Localeslots. Ein solcher Slot
zählt als belegt, wenn ein geprüfter Routeintro **oder irgendein** geprüfter
Modulclip dieser Seite/Locale existiert; das bedeutet nicht, dass alle Module
fertig sind. `publishedLocaleCount`, `pendingLocaleCount` und das bisherige
`fullyVideoCovered` beziehen sich ausschließlich darauf. Zusätzlich gelten
`publicModuleCount:49`, `publishedModuleLocaleCount` und
`pendingModuleLocaleCount:147` im aktuellen Pendingstand. `completed` kann erst
true werden, wenn alle einzelnen Modul-Localeslots nachgewiesen und damit auch
alle Routen-Localeslots belegt sind. Route-/Registry-Statusfelder allein ergeben
keinen Erfolg. Dies ist technische Assetabdeckung; native Wiedergabe am Zielbuild
und die unten beschriebene Operator-Vertrauensgrenze bleiben eigenständige Belege.

Ein später freigegebenes `PublicVideo` enthält exakt:

```text
id, version, locale, src, mime, captionsSrc, transcript, title,
poster, width, height, durationSeconds
```

Version/Breite/Höhe sind positive Integer; Dauer ist eine endliche positive
Sekundenzahl innerhalb des expliziten Budgets. `mime` ist video/mp4 oder
video/webm. `title` ist ein String der konkreten Locale, `transcript` der
wirkliche UTF8-Plaintext aus der gehashten Textdatei. Das Register verlangt für
freigegebene Fassungen ein geprüftes Poster; die öffentliche Player-API darf
`poster` weiterhin optional behandeln. Sprache wird nie automatisch ersetzt:
fehlendes NL/FR ergibt keine DE-Datei unter falscher Sprachkennung.

Aktuell werden keine `PublicVideo`-Objekte ausgegeben. Erst Root/Renderer bindet
die geprüfte Projektion ein; Legacy-`media.src` oder `published` sind keine
zusätzliche Freigabequelle.

## Spätere Asset-/Datei-/Receiptbindung

Das geschlossene Assetschema enthält ID, Version, Seite, Kontext, Locale,
Titel, Status, Planfilm/Szenen, Quelle, Voice-/Charakterbindungen, Video,
Captions, Transkript, Poster, Dimensionen, Dauer und Approvalreferenz.
Assetreferenzen sind genau einer Seite/Locale zugeordnet; ungebundene oder
doppelte Assets blockieren. Dieselben Videobytes werden nicht über verschiedene
Route- oder Modulkontexte wiederholt, auch nicht innerhalb derselben Seite. Mehrere ausdrücklich geprüfte Sprachfassungen einer
Seite dürfen gemeinsame Video-Basisbytes verwenden, benötigen aber jeweils ihre
eigene Locale-/Text-/Voice-/Receiptbindung.

Quellen und Charaktere haben exakt `{id,version,path,sha256,bytes}` unter dem
Repositoryroot. Charakter-IDs müssen den vorhandenen Voice-Rollen entsprechen;
bei einem Planfilm sind dessen vollständige Sprecherrollen erforderlich. Ein
Modulasset muss mindestens die tatsächliche Sprecherrolle seines individuellen
Quellmoduls binden.
Voiceeinträge haben exakt `{role,provider,voice_id,version}`. Diese Werte bleiben
privat. Eine Stimm-ID allein beweist weder Eignung noch Nutzungsrechte.

Die vier öffentlichen Dateideskriptoren Video/Captions/Transkript/Poster haben
exakt `{src,sha256,bytes,locale,mime}`. Erlaubt sind ausschließlich kanonische
eigene `/media/`-Pfade mit mp4/webm, vtt, txt bzw. png/jpg/jpeg/webp. Keine URLs,
Escapes, Queries, Traversal oder beliebigen Dateipfadapter. MIME und Endung
müssen übereinstimmen; jede Deskriptorlocale muss der Assetlocale entsprechen.

Reads laufen auf dem Linux-Buildrunner FD-verankert über `/proc/self/fd`:
jede Verzeichniskomponente und Zieldatei NOFOLLOW, Ziel regulär und Linkzahl 1.
Symlinks/Hardlinks/FIFOs werden abgewiesen. Tatsächliche Bytes, Länge, SHA256
und stabile Datei-Metadaten vor/nach Read werden geprüft. Video-/Poster-
Containerkennungen, UTF8, WEBVTT-Header und Plaintext werden zusätzlich geprüft.
Diese Prüfung decodiert keine Codecs, misst keine echte Dauer und erkennt keine
Figuren oder Aussprache. Vollständige technische Wiedergabe-/Codec-/Alpha-/
Sprech-/Sichtprüfung bleibt der getrennte QA-Nachweis; die synthetischen
Testcontainer sind ausdrücklich kein Beleg abspielbarer Produktfilme.

Die private Approvalreferenz ist exakt `{path,sha256}`. Ihr Pfad muss außerhalb
des Publicroots liegen; die tatsächliche begrenzte JSON-Datei wird mit denselben
Link-/Bytegrenzen gelesen und gegen ihren Rawhash geprüft. Receipt ist ein
flaches geschlossenes Schema, auch doppelte JSON-Keys werden verweigert:

```text
schema_version:1, asset_id, asset_version, page_id, context_id, locale,
binding_sha256, audience:"public", operator_id,
character_approval:"approved", voice_approval:"approved",
content_approval:"approved", rights_approval:"approved",
audio_visual_approval:"approved", publication_approval:"approved"
```

`binding_sha256` ist SHA256 über das kanonisch rekursiv nach Keys sortierte
Assetobjekt ohne dessen `approval`-Feld (`videoAssetBinding(asset)`). Damit sind
Quelle, Dateien, Version, Sprache, Voice/Charakter, Inhalt und Metadaten exakt
gebunden. Änderungen daran verlangen eine neue passende Receipt. Jeder der
sechs Freigabebereiche muss zur selben Fassung ausdrücklich approved sein;
`status:published` allein reicht niemals.

**Vertrauensgrenze:** Der Receiver kann Scope und Hashidentität einer gelieferten
Operatorreceipt prüfen. Er kann aus frei geschriebenem JSON weder die echte
Identität/Berechtigung des Operators noch die Wahrheit seiner Begutachtung
beweisen. Der autorisierte private Review-/Publicationcontroller muss diese
Herkunft vor Registerübernahme sichern. Es gibt keinen Login, keine neue Rolle,
keine Signaturbehauptung oder automatisch erzeugte Freigabe in diesem Modul.

## Explizite lokale Budgets und Tests

Der reale Pendingstand führt `budgets:null`: operative Ressourcen-/Ausgabe-
budgets sind noch **undeclared**, keine Zahlen sind als Produktgrenze oder
freigegebenes Produktionsbudget behauptet. Die 46 Routevalidierung und rein leere
öffentliche Projektion bleiben damit ausführbar. Sobald auch nur ein Asset
vorliegt, blockiert ein fehlendes/null-Budget vor Dateiprüfung/Publikation.

Für einen später autorisierten Lauf sind alle sieben Werte ausdrücklich als
positive Integer zu deklarieren: max_assets, max_file_bytes, max_total_bytes,
max_receipt_bytes, max_transcript_bytes, max_duration_seconds, max_dimension.
Boolean/String/0 oder Überschreitung blockiert. Die numerischen Obergrenzen im
Modul sind ausschließlich absolute Engineeringguards und erteilen selbst keine
Ressourcenfreigabe. Numerische Beispielbudgets stehen nur in isolierten Tests;
sie sind keine Preis-/Produkt-SLA und kein Nachweis tatsächlicher Serverkapazität.

Der Gesamtbytezähler berücksichtigt tatsächlich gelesene eindeutige Dateien
und Receipts; alle Medien werden sequentiell geprüft. Das ist kein harter
RSS-/CPU-Limitnachweis und keine vollständige Dateisystemtransaktion über eine
spätere Veröffentlichung hinweg.

```sh
node --test apps/site/tests/public-video-assets.test.mjs
```

22 gezielte Tests: tatsächliche 46/36 Pendingabdeckung, synthetische Positivbytes
mit Operator-Testreceipt, private Ausschlüsse, Status-/Hash-/Version-/Voice-/
Charakter-/Szenen-/Locale-/Freigabefehler, Pfad-/Link-/Typgrenzen, verworfener
Hero, offene Sourcegaps, Byte-/Dimension-/Dauerbudgets und reine öffentliche
Projektion. Hinzu kommen vollständige individuelle Modulbindung, fehlende/fremde/
private/doppelte Modulkontexte, falsche Seite/Receipt, Routeintro gegenüber
Modulvollständigkeit und gesperrte Wiederholung identischer Bytes in mehreren
Kontexten. Tests erzeugen keine echten Filme oder Operatorrechte.
