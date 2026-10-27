# Lokaler Produktbild-Batch

Stand 27.10.2026. `tools/product_image_batch.py` ist ein tatsächlich ausführbarer,
rein lokaler Artefaktschritt. Er verändert keine Shoproute, veröffentlicht nichts,
lädt keine Bildreferenz und führt kein Modell aus. Bestehender Controller bleibt
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
`white.png` und `ci-<rrggbb>.png`. Opaque RGB und auch vollständig opakes RGBA
blockieren mit `opaque_source_requires_verified_segmentation_adapter`. Das ist
keine automatische Hintergrundentfernung; es wird kein neuer Segmentierungs-
oder Maskenqualitätsnachweis behauptet. Ein einzelner transparenter Pixel ist
kein Beweis eines korrekten Freistellers und benötigt dieselbe manuelle QA.

Produktpixel bleiben im RGBA-Derivat einschließlich RGB-Werten transparenter
Pixel erhalten. Keine Skalierung, kein Beschnitt, keine Schärfung, Farberfindung,
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
`external_budget_minor=0` und `segmenter="none_verified"`. Keine impliziten
Budgetdefaults. Positive Integer, keine Booleans; CI-Auswahl und Allowlist jeweils
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
nacheinander verarbeitet. Kein NumPy und kein GPU-/Modell-RAM erforderlich.
1200 × 1200 entsprechen 184320000 Bytes Prognose plus Batchinput. Walltime wird an
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
`Requires-Python:>=3.10` geprüft. NumPy 2.3.5 ist vorhanden, wird nicht benutzt;
rembg und onnxruntime fehlen. Kein Paket wird von diesem Skript installiert.
Ohne die optionale Bildabhängigkeit blockiert der konkrete Aufruf; Bildtests
überspringen fehlendes Pillow ausdrücklich nicht. Bestehende andere Tools
importieren Pillow durch dieses Modul nicht vorzeitig.

## Commit, Wiederaufnahme und Rückweg

`stage_key` bindet Originalhash, ID, gesamte Approvalbindung, gesamte Policy und
Engineversion. Engine enthält Transformversion, Pillow-, Python- und
zlib-Laufzeitversion. `batch_key` bindet die sortierte Eingangsmenge und dieselbe
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
Originalhashanker, Manifest-/Scopebindung, feste Status-/Wirkungsflags und
vorhandener Checkpoint geprüft. Selbst konsistent neu gehashte Metadaten
dürfen keine Publikations-, Modell-, Netzwerk- oder QA-Freigabe erteilen; korrupte fertige Stages werden blockiert und
nicht überschrieben. Verwaiste `.pending`-/`.write`-Dateien bleiben zunächst sichtbar. Beim erneuten
Schreibversuch wird nur der feste sichere `.write`-Temporärname nach Prüfung
entfernt und exklusiv neu angelegt; Originaldateien werden dabei nicht gelöscht. Schon
vorliegende Pendingoriginale müssen byteidentisch sein. Kein rekursives Cleanup.

Erst nach allen Stages entsteht das finale Resultat; zuletzt setzt ein
Vergleich-und-Tausch die lokale `current.json`. Absturz oder Stufenfehler erhält
die vorherige Auswahl. Ein OS-/Stromausfall nach atomarem Rename kann dem Caller
einen unklaren Ausgang hinterlassen: `current` rücklesen, denselben Batch
wiederholen. Pointer und Directory-fsync ermöglichen lokalen Wiederanlauf;
verteilte Stores, Netzdateisystem-Semantik und feindliche Dateimanipulation sind
nicht zugesagt. Der Checkpoint ist ein begrenztes Artefaktverzeichnis des
bestehenden Controllers, keine Scheduler-/Leasingalternative.

`rollback(..., expected_current=token)` prüft Auswahl und Artefakte, stellt die
vorherige lokale Auswahl wieder her oder entfernt ausschließlich den initialen
Pointer. Originale, Stages und Resultate werden nie gelöscht. Ein veralteter
Token blockiert. Rückweg hat keine externe Shop-/Bestell-/Publikationswirkung,
denn dieser Batch integriert noch keinen Auslieferungsadapter. Ein späterer
Adapter muss fertigen Manifesthash, Scope, Modell-/QA-/Lizenzfreigabe und den
Nachweis `SupplierFact → Originalhash → Derivathash → tatsächlich dargestellte
SKU/Slot` binden. Zwei reale SKU-Durchläufe sind offen.

## Fehlende Segmentierungsgewichte: gesperrter Adaptervertrag

Einziger derzeit zugelassener Adapterwert ist `none_verified`. Jeder andere
Name, Modellpfad, Befehl, URL oder Adapterobjekt blockiert. Es gibt keinen
Callable-/Shelladapter, keinen dynamischen Import, keinen Modelldownload,
kein `trust_remote_code` und keine Installation durch Modelltext.

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

Vor neuer Adapterimplementierung ist konkret zu liefern:

| Beleg | Aktueller Stand / erforderlicher Nachweis |
| --- | --- |
| Modell | BiRefNet nur Kandidat; exakter Variantenname und unveränderliche Upstreamrevision fehlen |
| Code und Lizenz | vollständiger geprüfter Inferenz-/Pre-/Postprocessingcode samt Commit, SHA256 und Lizenztext-SHA256 |
| Originalgewichte | echte Datei, Bytezahl, SHA256, Bezugspfad und zu diesen Bytes gültiger kommerzieller Lizenzbeleg fehlen |
| ONNX | keine verifizierte lokale Datei; eigener Export oder verifizierter Konverter mit Commit/Hash, Opset, statischen Shapes und Exportparametern nötig |
| Graph | ONNX-/externe-Tensor-SHA256, keine dynamischen Plugins/Customops/externen Datenpfade; festes Input-/Outputschema |
| Runtime | exakte CPU-Runtimeversion/Lock und tatsächlich unterstützte Operatoren fehlen; kein stiller Runtime-/Modellfallback |
| Ressourcen | reale Gewichtbytes, Peak-RSS, Laufzeit pro Pixelklasse, temporäre Diskbytes und CPUkosten auf Zielhost fehlen; vorab Concurrency 1 / Threads 1 als Pilotannahme getrennt messen |
| QA | autorisierte reale Produktoriginale mit Zuordnung/Lizenz und manueller Alpha-/Farb-/Label-/Lieferumfangabnahme; zwei SKU-End-to-Endbelege fehlen |

Owner für reale Zuordnungen/Rechte und Modell-/Hostfreigabe bleibt die
Rootintegration mit dem autorisierten Datenverantwortlichen; nächster Schritt
ist das konkrete Hash-/Lizenz-/Ressourcenpaket vor dem ersten Segmentierungslauf.
Keine Gewichtsgröße, Hash, CPUzeit oder kommerzielle Freigabe wird erfunden.
Ein neuer fester Adapter benötigt anschließend Code-Review, deterministische
Originalauflösungsmaske ohne Produktretusche, die gleichen Quarantänegates und
Versionsinvalidierung. Synthetische Masken dürfen nur in isolierten Tests stehen.
