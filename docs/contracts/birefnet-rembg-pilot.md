# BiRefNet-General-ONNX-Pilot (separater Vertrag)

`birefnet-rembg-general-epoch244-pilot-v1` bezeichnet den lokalen synthetischen
Pilot in `tools/birefnet_rembg_pilot.py`. Der separat auswählbare Batchadapter
heißt `birefnet-rembg-general-epoch244-cpu-v1`; der bisherige gepinnte Adapter
`birefnet-default-onnx-1024-logits-v1` bleibt bestehen. Es gibt keinen Fallback
zwischen beiden. Der Pilot ist keine Veröffentlichungsschnittstelle.

Der Modellurheber stellt [BiRefNet-general-epoch_244.onnx](https://github.com/ZhengPeng7/BiRefNet/releases/tag/v1)
als eigenen ONNX-Export bereit. Das BiRefNet-Projekt erklärt MIT und die offizielle
Modellkarte nennt MIT; der MIT-Text ist in `docs/licenses/birefnet-MIT.txt`
aufbewahrt. [rembg](https://github.com/danielgatis/rembg/blob/c5b48b0417a0254df7d461efa14573597f369a83/rembg/sessions/birefnet_general.py)
referenziert denselben benannten Export und MD5 `7a35a0141cbbc80de11d9c9a28f52697`.
Der Originaldownload war 972666916 Bytes groß, sein MD5 stimmte überein und
sein SHA256 lautet `58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c`.
Der lokale SHA256 bindet diese konkret heruntergeladenen Bytes; ein vom Urheber
signierter SHA256 wurde nicht behauptet. Das Artefakt liegt außerhalb des Repos.

Beobachteter Graph: ONNX IR 8, Opset 17, 21968 Knoten ausschließlich in der
Standarddomain, keine externen Tensoren einschließlich Tensorattributen, keine
verschachtelten Graphen, Sparse-Initializer, Trainingsgraphen oder lokalen Funktionen. Eingang
`input_image` float32 `[1,3,1024,1024]`, Ausgang `output_image` float32
`[1,1,1024,1024]`. Der Pilot prüft Hash, Größe, CPU-Provider und Session-I/O.
Er ist keine generische Prüfung beliebiger oder ausgetauschter ONNX-Graphen.

Die Verarbeitung folgt der referenzierten rembg-Variante: RGB, Lanczos auf
1024×1024, Division durch den größten Pixelwert des Bildes, ImageNet-Mittelwerte
und Standardabweichungen, NCHW-float32; Sigmoid, bildweise Min-Max-Normierung,
8-Bit-Maske und Lanczos zurück auf die Originalgröße. Der Pilot verwendet eine
numerisch stabile Sigmoidform. RGB des synthetischen Originals bleibt unverändert.
Ein leerer oder gleichförmiger Output wird zurückgewiesen. Diese Verarbeitung
unterscheidet sich absichtlich von der des anderen Adapters.

Die CPU-Probe ist kein Eignungsnachweis für Vercel Functions, kein Vergleich mit
den anderen gepinnten Modellgewichten und keine Produktqualitätsabnahme. Es
fehlen noch ein betrieblich zugelassener Worker sowie Sichtprüfung realer
Produktbilder und deren Kanten und Beschriftung. Der Batch verlangt weiterhin
die bestehende Rechte- und Zuordnungsbindung und erzeugt nur lokale Entwürfe.

## Explizite Batchauswahl

```json
{
  "adapter": "birefnet-rembg-general-epoch244-cpu-v1",
  "artifact_root": "<lokales-artefaktverzeichnis>",
  "max_session_working_bytes": 12884901888,
  "max_tensor_working_bytes": 134217728,
  "max_input_pixels": 1000000,
  "max_inference_seconds": 180
}
```

Der Modellname und SHA256 sind fest eingebunden. Der lokale Prozess prüft die
reguläre Datei mit sicherem Dateideskriptor, Größe und Hash vor Sessionaufbau;
die ONNX-Runtime erhält die unveränderlichen, geprüften Modellbytes. Der Batch richtet
EXIF vor Inferenz aus, erhält Originalbytes und Produkt-RGB, vermehrt vorhandenes
Alpha nicht und verwahrt jede Ausgabe als `review_required` ohne Veröffentlichung.
Transparente Eingaben verwenden weiterhin den bisherigen Alpha-Pfad.

Jeder Modellversuch läuft in einem separaten CPU-Prozess, mit lokaler
nicht-blockierender Einzelplatzsperre und `RLIMIT_AS` von 9 bis höchstens 12 GiB.
Das Timeout beendet den Prozess, auch wenn ein nativer Kernel noch läuft; ein
belegter Worker meldet `worker_busy`. Es gibt keinen automatischen Retry. Die
Batch- und Storegrenzen gelten zusätzlich. Die Sperre gilt nur für Prozesse mit
demselben `/tmp`-Dateisystem, nicht für getrennte Container oder Hosts. Ein
Fünf-Minuten-Request oder Vercel Function wird daraus
nicht abgeleitet; für den Betrieb ist ein isolierter Worker erforderlich.

Die [native Batchprobe](../../tests/native_rembg_batch_probe.py) nutzt ausschließlich
das eigene synthetische Fixture. Sie prüft Originalerhalt, erzeugte RGBA-Datei,
einen Modellaufruf und bytegleiche Wiederaufnahme aus dem lokalen Store.
Der echte Lauf mit unveränderlichen Modellbytes dauerte 49,788 Sekunden, lieferte `review_required` und
`publishable=false`; Replay und Originalbytes waren identisch. Eine parallele
Anfrage wurde mit `worker_busy` und null Modellaufrufen abgelehnt. Ein Modell
falscher Größe, ein gleich großes Modell mit falschem Hash und ein Timeout wurden
ohne Modellaufruf zurückgewiesen. Messwerte stehen im
[Batchbeleg](../../evidence/birefnet-onnx-2026-10-27/rembg-general-synthetic/batch-result.json).

## Beobachteter Pilot

Die [synthetischen Bilder und das Ergebnis](../../evidence/birefnet-onnx-2026-10-27/rembg-general-synthetic/)
sind klein und versioniert. Zwei CPU-Läufe desselben Bildes lieferten denselben
Masken-SHA256 `14c3e6c5867339970a151a69db8bdebff927f9e66b2a0d55ed756c43e7104a58`.
Der zweite Lauf maß 16,427 s bis Sessionbereitschaft inklusive Dateihash und
34,399 s für Vorbereitung und Inferenz, bei 7664376 KiB Peak-RSS. Die Laufzeit
war auf 240 s und der virtuelle Adressraum auf 12 GiB begrenzt. Eine direkte
Umsetzung der referenzierten rembg-Nachbearbeitung ergab für dieselben Logits
keine abweichenden Maskenpixel; das ist kein eigenständig ausgeführtes rembg.
Die Maske umschließt bei Sichtprüfung der einfachen synthetischen Flasche auch
den Deckel; das beweist keine verlässliche Behandlung realer Produktdetails.

```sh
ulimit -v 12582912
PYTHONPATH=<isolierter-runtime-pfad>:. timeout 240s \
  python3 tools/birefnet_rembg_pilot.py <verifiziertes-modell.onnx> <ausgabeordner>
python3 -m unittest discover -s tests -p 'test_birefnet_rembg_pilot.py'
```
