# Lokaler Produktbild-Batch

Stand 27.10.2026. `tools/product_image_batch.py` ist ein tatsächlich ausführbarer,
rein lokaler Artefaktschritt. Er verändert keine Shoproute, veröffentlicht nichts,
lädt keine Bildreferenz und ruft keinen externen Modellprovider auf. Version 2
verdrahtet zusätzlich den festen lokalen CPU-BiRefNet-Adapter. Bestehender Controller bleibt
zuständig; es gibt keine zweite Queue oder Datenbank. Alle Ergebnisse sind
`review_required` oder `quarantined`, immer `publishable=false`.

## Aktuell ausführbarer Bildpfad

Eingang sind bereits rechtmäßig vorliegende Originalbytes und eine ausdrückliche
Zuordnung zu Tenant, Projekt, Produkt und Bildslot. `approval` enthält exakt:

```json
{
  "tenant": "synthetic-tenant",
  "project": "isolated-tests",
  "product_id": "SYNTHETIC-1",
  "slot_id": "synthetic-slot-1",
  "source_reference_sha256": "<SHA256 der exakten Lieferanten-Bildreferenz>",
  "original_sha256": "<SHA256 der vollständigen Originalbytes>",
  "association": "approved",
  "association_evidence": "<prüfbarer Zuordnungsbeleg>",
  "license": "approved",
  "license_evidence": "<prüfbarer Nutzungsrechtebeleg>",
  "color_space": "srgb"
}
```

Das Beispiel enthält ausschließlich Platzhalter. Caller muss die Belege prüfen;
`approved` allein ist kein Lieferantenvertrag oder Lizenznachweis. Quelllabel,
ähnliche SKU/EAN, Dateiname und öffentlich abrufbare URL beweisen weder
Bildzuordnung noch kommerzielle Nutzungsrechte. Ungeklärte Variantenbilder,
fehlende Belege, falscher Scope oder falscher Bytehash erzeugen Quarantäne und
keine Derivate. Dieser Layer prüft die konkrete Bindung und Beleganwesenheit,
keine externe Rechteakte. Geheimnisse und personenbezogene Daten gehören nicht
in diese nachweisbaren lokalen Manifeste.

Für PNG/JPEG/WEBP wird das Original byteidentisch als `original.bin` archiviert.
Aus einem **bereits vorhandenen** nichtleeren Alphakanal entstehen `rgba.png`,
`white.png` und `ci-<rrggbb>.png`; dieser Pfad führt auch bei konfiguriertem
BiRefNet **keine Inferenz** aus. Ein einzelner transparenter Pixel beweist keinen
korrekten Freisteller und benötigt dieselbe manuelle QA.

Opaque RGB und vollständig opakes RGBA benötigen ein explizites gültiges
`segmenter`-Konfigurationsobjekt. Ohne Adapter bleiben sie mit
`opaque_source_requires_verified_segmentation_adapter` in Quarantäne. Mit
Konfiguration wird ausschließlich für bereits genehmigte, zulässige opake
Quellen einmal pro Batch lazy eine feste CPU-Session aufgebaut und für weitere
opake Bilder wiederverwendet. Modell-/Runtime-/Manifestfehler werden als
konkrete Quarantänegründe erhalten; kein Fallback und kein impliziter Download.
Ein fest verdrahteter Adapteraufruf ist implementiert, ein echter Lauf mit
verifiziertem ONNX-Artefakt und realem Produkt wurde hier nicht nachgewiesen.

Originalauflösung und RGB-Produktpixel bleiben im RGBA-Derivat einschließlich
RGB-Werten transparenter Pixel erhalten. Der Segmentierungsadapter darf nur Alpha
ändern; neue Alpha darf vorhandene Alpha niemals erhöhen. Die RGB-Werte werden
vor/nach Inferenz und beim Artefakt-Readback mit dem Original verglichen. Keine
Produktskalierung, kein Beschnitt, keine Schärfung, Farberfindung,
Labelretusche, Hintergrundrekonstruktion oder künstlicher Schatten. EXIF-
Orientierung 1–8 wird einmal angewendet; abgeleitete EXIF-Daten werden entfernt,
das Original bleibt vollständig. ICC-Profile sowie eingebettetes gAMA/cHRM ohne
geprüfte Konvertierung blockieren. Caller muss sRGB bestätigen; es gibt keine
stille CMYK-/Profilkonvertierung. Palette/Graustufen werden verlustfrei in die
entsprechenden RGBA-Farbwerte expandiert. Weiß/CI sind Pillow-Kompositionen der
kodierten sRGB-Werte mit dem vorhandenen Alpha; keine behauptete photometrisch
lineare Rekonstruktion. CI-Farben sind ausschließlich konkrete `#rrggbb`-Werte
aus Caller-`allowed_ci_colors`; kein Themegenerator.

Automatische QA prüft Format, Dimensionen, Einzelbild statt Animation, vorhandene
nichtleere Transparenz, exakten RGBA-Pixel-Readback und Artefakthashes. Freigabe
benötigt weiterhin Originalvergleich für Produktidentität, Farben, Schrift/
Etiketten, Lieferumfang, Löcher/Kanten, Hintergrundreste und Schatten. Weder
Alphaextrema noch Hashes beweisen diese fachliche Qualität. Keine echte SKU wurde
hier freigestellt. Die Fixtures in `tests/test_product_image_batch.py` sind
isolierte synthetische Testbilder; ihre künstlichen Alpha-Pixel sind ausschließlich
Codec-/Pipelinebelege.

## Explizite Budgets und lokale Ressourcen

Jede Policy muss **alle** folgenden Felder setzen. Werte sind Callerbudgets,
keine Servermessungen. Die Implementierung erzwingt zusätzlich feste Obergrenzen:

| Feld | Höchstens |
| --- | ---: |
| `max_images` | 100 |
| `max_input_bytes` | 64 MiB je Original |
| `max_total_input_bytes` | 256 MiB |
| `max_pixels` | 20 Millionen je Bild |
| `max_total_pixels` | 100 Millionen Headerpixel, einschließlich opaker Bilder |
| `max_artifact_bytes` | 128 MiB je Artefakt |
| `max_total_artifact_bytes` | 1 GiB inklusive Originalen |
| `max_working_bytes` | 1 GiB konservative Arbeitsprognose |
| `max_store_bytes` | 2 GiB logische Storebytes |
| `max_wall_seconds` | 3600 Sekunden |

Zusätzlich exakt `tenant`, `project`, `ci_colors`, `allowed_ci_colors`,
`external_budget_minor=0` und `segmenter` als `"none_verified"` oder als exakt
begrenztes lokales Konfigurationsobjekt (unten). Keine impliziten Budgetdefaults. Positive Integer, keine Booleans; CI-Auswahl und Allowlist jeweils
1–4 eindeutige Farben. Anzahl, Eingangsbytes, Headerpixel und größte
Arbeitsprognose werden vor dem ersten Decode/Storewrite geprüft. PNG-Ausgaben
werden bereits beim Schreiben des Encoderbuffers begrenzt. Summe der Artefakte
wird vor Stagecommit und über alle Stage-Replays geprüft. Der Store zählt auch
Quarantäne, Originale, alte Batches, Manifeste und Crashreste; temporäre
Ersetzungsbytes werden vor Schreibbeginn reserviert. Zusätzlich höchstens 10000
Storedateien; keine unbegrenzte automatische Aufbewahrung oder Löschung.

Arbeitsprognose: `größte_Bildpixel * 128 + gesamte_Inputbytes`. Der Faktor ist
bewusste konservative Planung für Pillow-Konvertierung, Komposition, Readback,
Encoderbuffer und Pythonkopien, keine gemessene RSS-Garantie. Einzelbilder werden
nacheinander verarbeitet. Der vorhandene Alphapfad benötigt weder NumPy noch
GPU-/Modell-RAM. Die optionale Segmentierung benötigt **zusätzlich** ihre
expliziten `max_session_working_bytes` und `max_tensor_working_bytes`; diese sind
keine im Pixelbudget bereits eingerechneten Speicherfreigaben. Die tatsächliche
Hostplanung muss Pixelarbeit, Modell-/Session-/Tensorressourcen und Reserve
zusammen berücksichtigen. 1200 × 1200 entsprechen 184320000 Bytes Pixelprognose
plus Batchinput. Walltime wird an
Stufengrenzen und vor Commit geprüft; ein laufender nativer Decoder kann dadurch
nicht präemptiv unterbrochen werden. Harte CPU-/RSS-/Zeit-/Filesystemquoten und
Hostreserve muss ein autorisierter Runner separat setzen. Das Skript verändert
keine Systemlimits, Threads, Server, laufende Jobs oder Scheduler. Die Storegrenze
zählt logische Dateibytes, keine Dateisystemblöcke; feindliche gleichzeitige
Filesystemänderungen durch andere Unixnutzer sind nicht das Bedrohungsmodell.
Privates, nur diesem Runner zugängliches Storeverzeichnis vorausgesetzt.

## API und CLI

Python: `run_batch(items, policy=policy, store=directory,
expected_current=token)`. `items` sind exakt `{id, original: bytes, approval}`;
keine Eingangs-URL und kein auszuführender Befehl. ID ist ein begrenztes
ASCII-Label; daraus werden keine Pfade erzeugt. Die API hält alle Originalbytes
bereits im Callerspeicher. `current_token(store)` liefert den Vergleichswert
oder `None` bei noch leerer lokaler Auswahl. `expected_current=None` erlaubt nur
einen initialen Commit; eine andere bestehende Auswahl verlangt ihren exakten
Token. Identische aktuelle Batchwiederholung ist ohne neuen Token idempotent.

Die CLI nimmt ein lokales JSON-Manifest mit exakt `schema_version:1`, `policy`
und `items`. Ein Item enthält exakt `id`, `relative_path`, `approval`.
`relative_path` wird ausschließlich unter dem expliziten `--input-root` gelesen;
absolute Pfade, `..`, Backslashes sowie Symlinks/Hardlinks werden abgewiesen. Keine Remote-
Bildreferenz wird aufgelöst. Vor einem realen Lauf muss das Manifest echte
Originaldateien und geprüfte Bindungen enthalten.

```sh
python3 -m tools.product_image_batch current --store .local/image-batch/review
python3 -m tools.product_image_batch run --store .local/image-batch/review \
  --manifest .local/image-batch/input.json --input-root .local/image-batch/originals
# Bei bereits bestehender Auswahl zusätzlich: --expected-current <current_token>
python3 -m tools.product_image_batch rollback --store .local/image-batch/review \
  --expected-current <current_token>
python3 -m unittest discover -s tests -p test_product_image_batch.py -v
```

Runtime: Python≥3.10 auf POSIX/Linux mit `fcntl`, exakt `Pillow==12.3.0`.
Lokal wurden Pillow 12.3.0, Metadaten `License-Expression:MIT-CMU` und
`Requires-Python:>=3.10` geprüft. Vorhandene Alpha nutzt ausschließlich Pillow.
Für echte lokale Segmentierung verlangt der feste Adapter zusätzlich exakt
NumPy 2.3.5, ONNX 1.23.2 und ONNXRuntime 1.31.1. NumPy 2.3.5 ist vorhanden,
ONNX/ONNXRuntime und Modellgewichte sind in der hier geprüften Umgebung nicht
installiert. Kein Paket wird von diesem Skript installiert; keine native
Inferenz wird durch Testdoubles belegt.
Ohne die optionale Bildabhängigkeit blockiert der konkrete Aufruf; Bildtests
überspringen fehlendes Pillow ausdrücklich nicht. Bestehende andere Tools
importieren Pillow durch dieses Modul nicht vorzeitig.

## Commit, Wiederaufnahme und Rückweg

`stage_key` bindet Originalhash, ID, gesamte Approvalbindung, gesamte Policy und
Engineversion. Version 2 schreibt Stage-/Resultatschema2 und bindet zusätzlich
`engine.segmenter` an deklarierte Adapter-ID, Modell-SHA256, Manifest-SHA256 und
festen Runtimevertrag; dies ist keine Behauptung tatsächlich geladener Runtime.
Engine enthält außerdem Transformversion, Pillow-, Python- und zlib-Laufzeitversion. `batch_key` bindet die sortierte Eingangsmenge und dieselbe
Konfiguration. Neue Eingangsbytes, Zuordnung, Lizenzbelege, Farben, Budget- oder
Engineversion ergeben neue Stages; unveränderte Stages werden exakt rückgelesen.
Keine Wiederverwendung anhand eines URL- oder Inventarhashs ohne Originalbytes.

Der private Store enthält nur:

```text
.lock
stages/<stage_key>/{original.bin,rgba.png,white.png,ci-*.png,manifest.json}
stages/.pending-<stage_key>/...          # unvollständiger Crashstand
batches/<batch_key>/{checkpoint.json,result.json}
current.json                            # ausschließlich lokale Draftauswahl
```

Ein nichtblockierender prozessübergreifender Storelock serialisiert Commit und
Rollback; ein zweiter Prozess bekommt `store_busy`. Alle regulären Dateien
werden per begrenzter, mit `O_EXCL` neu erzeugter `.write`-Datei, fsync und
atomarer Ersetzung geschrieben. `fstat` prüft reguläre Dateien und Linkzahl 1
vor Schreibzugriff; auch Lock und Lesezugriffe verweigern Hardlinks.
Eine vollständige Stage wird durch Verzeichnisrename atomar sichtbar. Beim
Restart werden jedes Original/Derivat, Bytezahl, Hash, unveränderlicher
Originalhashanker, Manifest-/Scopebindung, feste Status-/Wirkungsflags,
Original-RGB/Alpha, Derivatpixel und Hintergrundkomposition sowie vorhandener
Checkpoint geprüft. Ein Replay führt keine erneute Inferenz aus. Selbst konsistent neu gehashte Metadaten
dürfen keine Publikations-, Netzwerk- oder manuelle QA-Freigabe erteilen.
Lokale Modellzähler und Segmentierungsmetadaten müssen zur gebundenen Stage
passen; korrupte fertige Stages werden blockiert und nicht überschrieben. Verwaiste `.pending`-/`.write`-Dateien bleiben zunächst sichtbar. Beim erneuten
Schreibversuch wird nur der feste sichere `.write`-Temporärname nach Prüfung
entfernt und exklusiv neu angelegt; Originaldateien werden dabei nicht gelöscht. Schon
vorliegende Pendingoriginale müssen byteidentisch sein. Kein rekursives Cleanup.

`local_model_calls` je Stage ist das strikte 0/1-Delta der vor jedem tatsächlichen
`session.run` erhöhten Adapterproperty. Auch ein Runtime-/Output-/Deadlinefehler
nach begonnenem Run bleibt als 1 gezählt, ohne `segmentation_performed=true` zu
behaupten. Constructorfehler und Fehler vor Run sind 0; Constructorfehler werden
für diesen Batch einmal festgestellt. `result.model_calls` summiert diese
provenienzgebundenen lokalen Runversuche der Stages, einschließlich aus Cache
übernommener Stages; es ist kein externer LLM-Aufrufzähler und keine Abrechnung.
`network_calls=0` und `external_spend_minor=0` bleiben fest. QA-Erfolg vor späterem
PNG-Fehler kann als `segmentation_performed=true` mit Quarantäne erhalten bleiben;
das ist keine veröffentlichbare Stage.

`successful_alpha_pixels` zählt in Schema 2 nur erfolgreiche Derivatstages;
quarantinierte Originale gehen ausschließlich in `header_pixels` ein. Der
Legacyreader erhält die bereits gespeicherten Schema 1-Zähler unverändert.

Fertig quarantinierte Stages bleiben ebenfalls unveränderlich. Eine reparierte
Umgebung bewirkt kein stilles Unquarantinieren unter identischem Key. Für einen
bewussten neuen Versuch nach Behebung muss die gültige Bindung/Version oder ein
explizites Callerbudget neu gebunden werden; alte Belege bleiben erhalten.

Erst nach allen Stages entsteht das finale Resultat; zuletzt setzt ein
Vergleich-und-Tausch die lokale `current.json`. Absturz oder Stufenfehler erhält
die vorherige Auswahl. Ein OS-/Stromausfall nach atomarem Rename kann dem Caller
einen unklaren Ausgang hinterlassen: `current` rücklesen, denselben Batch
wiederholen. Pointer und Directory-fsync ermöglichen lokalen Wiederanlauf;
verteilte Stores, Netzdateisystem-Semantik und feindliche Dateimanipulation sind
nicht zugesagt. Der Checkpoint ist ein begrenztes Artefaktverzeichnis des
bestehenden Controllers, keine Scheduler-/Leasingalternative.

Vorhandene v1-Stages/Resultate bleiben streng lesbar und rollbackfähig, mit
`segmenter="none_verified"`, Segmentierungsflag false und Modellzähler 0. Neue
Ausführung erzeugt Version 2 und einen neuen Key; der Wechsel benötigt den
bestehenden CAS-Token. Alte Artefakte werden nicht in neue Erfolge umgedeutet.

`rollback(..., expected_current=token)` prüft Auswahl und Artefakte, stellt die
vorherige lokale Auswahl wieder her oder entfernt ausschließlich den initialen
Pointer. Originale, Stages und Resultate werden nie gelöscht. Ein veralteter
Token blockiert. Rückweg hat keine externe Shop-/Bestell-/Publikationswirkung,
denn dieser Batch integriert noch keinen Auslieferungsadapter. Ein späterer
Adapter muss fertigen Manifesthash, Scope, Modell-/QA-/Lizenzfreigabe und den
Nachweis `SupplierFact → Originalhash → Derivathash → tatsächlich dargestellte
SKU/Slot` binden. Zwei reale SKU-Durchläufe sind offen.

## Fester lokaler Segmentierungsadapter und fehlende Artefakte

Die einzige zusätzliche Adapter-ID lautet
`birefnet-default-onnx-1024-logits-v1` und wird ausschließlich auf
[tools/birefnet_onnx.py](../../tools/birefnet_onnx.py) abgebildet. Caller kann keine
Module, Callables, Befehle, anderen Modellnamen oder Remotequellen auswählen.
Das lokale Konfigurationsobjekt muss exakt diese Felder enthalten:

```json
{
  "adapter": "birefnet-default-onnx-1024-logits-v1",
  "artifact_root": "<genehmigtes lokales Artefaktverzeichnis>",
  "manifest_file": "birefnet-export.json",
  "manifest_sha256": "<geprüfter tatsächlicher Manifest-SHA256>",
  "expected_model_sha256": "<geprüfter tatsächlicher ONNX-SHA256>",
  "max_model_bytes": 1073741824,
  "max_session_working_bytes": 4294967296,
  "max_tensor_working_bytes": 268435456,
  "max_graph_nodes": 200000,
  "max_input_pixels": 2000000,
  "max_inference_seconds": 120
}
```

Dies sind Platzhalter und Beispielbudgets, kein vorhandenes Modellpaket,
Benchmark oder Hardwarevorschlag. Alle Budgets sind explizite positive Integer;
Hashwerte müssen wirkliche 64stellige SHA256 sein. Dateinamen sind fest:
`birefnet-export.json`, `LICENSE.MIT` und
`birefnet-e2bf8e4-fp32-opset17-lastlogits-1024.onnx`. Keine beliebigen Input-
oder Dateipfadapter. Der Worker speichert keine Modellbytes in seinem
Original-/Derivatstore und startet keine Installation oder Downloads.

Vertrag: CPU, FP32, Opset17, statischer Eingang
`input_image[1,3,1024,1024]`, Ausgang `mask_logits[1,1,1024,1024]`. Der Adapter
verwendet ausschließlich letzte rohe Logits, Sigmoid, 8bit-Maskenquantisierung,
BICUBIC-Rückführung der Maske auf Originalauflösung und Multiplikation mit
vorhandener Alpha. Die auf 1024×1024 skalierte Eingabe ist nur der interne
Modelltensor; das Original und Derivat werden nicht auf 1024 verkleinert.
Modell-/Export-/Lizenzhashes, fester Graph und tatsächliche Runtime werden vor
Sessionaufbau geprüft. Keine Customops, Fremdprovider oder stillen Fallbacks.
Inferenz und tatsächlicher Gewichts-/Qualitäts-/Kapazitätsnachweis sind damit
weiterhin getrennte Abnahmeschritte.

`qa.segmenter` enthält bei Erfolg exakt Adapter/Modell-/Manifesthash,
Runtimevertrag, Input-/Outputnamen und Shapes, Maskenhash, Input-RGB-/Input-Alpha-/
Output-Alphahash sowie `local_model_calls=1`. Bei typisiertem Fehler enthält es
nur `{status:"failed",reason,local_model_calls:0|1}`. Es gibt keine
`runtime_loaded`- oder Selbstfreigabe durch eine Deklaration. Vorhandene Alpha
bekommt kein `qa.segmenter` und konstruiert keine Modellsession.

Die 43 fokussierten Workerregressionen verwenden ausschließlich synthetische
Originale und kontrollierte Sessiondoubles; sie prüfen Wiring, Laufzählung,
Quarantäne, Pixelintegrität und Legacy-Rollback. Sie sind keine echte
BiRefNet-Inferenz oder reale Produktbildabnahme.

Direkt gelesene Primärquellen am 27.10.2026:

- [rembg-Sessionfactory](https://raw.githubusercontent.com/danielgatis/rembg/main/rembg/session_factory.py)
  setzt aktuell `bria-rmbg` als Default.
  [rembg-Dokumentation](https://github.com/danielgatis/rembg) beschreibt automatische
  Gewichtsdownloads und separate Gewichtslizenzen. Deshalb wird rembg nicht
  blind verwendet; die MIT-Code-Lizenz autorisiert kein beliebiges Gewicht.
- [BRIA RMBG2.0](https://huggingface.co/briaai/RMBG-2.0) verlangt für kommerzielle
  Verwendung eine gesonderte Vereinbarung. Es ist kein kostenloser kommerzieller
  Default dieses Projekts.
- [BiRefNet-Code-Lizenz](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE)
  und [Originalmodellkarte](https://huggingface.co/ZhengPeng7/BiRefNet) nennen MIT.
  Das macht BiRefNet zum prüfbaren Kandidaten, bestätigt aber keine beliebige
  ONNX-Konvertierung, deren Herkunft, tatsächliche Hashidentität, Trainingrechte
  oder Produktbildqualität. Die verlinkten dynamischen Seiten sind ein
  Quellenhinweis, keine gepinnte Gewichtsfreigabe.

Vor dem ersten freigegebenen echten Segmentierungslauf ist konkret zu liefern:

| Beleg | Aktueller Stand / erforderlicher Nachweis |
| --- | --- |
| Modell | Fester Kandidat ZhengPeng7/BiRefNet, Revision `e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4`; keine lokal vorhandenen freigegebenen ONNX-Bytes |
| Code und Lizenz | Fester lokaler Inferenzadapter implementiert; gepinnte Source-/Lizenzbindungen werden dort geprüft, konkrete Exporterdatei und Exporter-SHA256 fehlen |
| Originalgewichte | Erwarteter Quellhash `9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154`, 444473596 Bytes, aus gepinntem Root-Quellenvertrag; kein lokales Download-/Lade-/kommerziales Abnahmeereignis |
| ONNX | keine verifizierte lokale Datei; eigener Export oder verifizierter Konverter mit Commit/Hash, Opset, statischen Shapes und Exportparametern nötig |
| Graph | ONNX-/externe-Tensor-SHA256, keine dynamischen Plugins/Customops/externen Datenpfade; festes Input-/Outputschema |
| Runtime | Exakter Vertrag NumPy 2.3.5 / ONNX 1.23.2 / ONNXRuntime 1.31.1 implementiert; native lokale Session und reale Graphoperatoren ohne Exportartefakt noch nicht nachgewiesen |
| Ressourcen | reale Gewichtbytes, Peak-RSS, Laufzeit pro Pixelklasse, temporäre Diskbytes und CPUkosten auf Zielhost fehlen; vorab Concurrency 1 / Threads 1 als Pilotannahme getrennt messen |
| QA | autorisierte reale Produktoriginale mit Zuordnung/Lizenz und manueller Alpha-/Farb-/Label-/Lieferumfangabnahme; zwei SKU-End-to-Endbelege fehlen |

Owner für reale Zuordnungen/Rechte und Modell-/Hostfreigabe bleibt die
Rootintegration mit dem autorisierten Datenverantwortlichen; nächster Schritt
ist das konkrete Hash-/Lizenz-/Ressourcenpaket vor dem ersten Segmentierungslauf.
Keine Gewichtsgröße, Hash, CPUzeit oder kommerzielle Freigabe wird erfunden.
Der implementierte feste Adapter benötigt vor realer Freistellung weiterhin
unabhängiges Code-Review und tatsächliches Hash-/Lizenz-/Ressourcenpaket. Die
Quarantänegates, Originalauflösung und Versionsinvalidierung bleiben verbindlich.
Synthetische Masken dürfen nur in isolierten Tests stehen.
