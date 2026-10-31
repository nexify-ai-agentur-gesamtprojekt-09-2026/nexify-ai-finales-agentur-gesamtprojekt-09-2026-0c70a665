# Fester lokaler BiRefNet-ONNX-Adapter

Implementiert ist `tools/birefnet_onnx.py`, ID
`birefnet-default-onnx-1024-logits-v1`. Er enthält tatsächliche Tensoraufbereitung,
ONNX-Graphprüfung, CPU-Sessionerzeugung und den benannten
`session.run(["mask_logits"], {"input_image": tensor})`-Aufruf. Kein Download,
keine Installation, kein Torch-/Transformers-/Remote-Code-Lader. Optionale
Runtime wird erst beim konkreten Adapteraufbau geladen. Fehlendes
`onnxruntime` meldet `onnxruntime_not_installed`; keine Ersatzruntime.

## Offiziell belegte Quelle und präziser Exportvertrag

Gewählt ist ausschließlich das Default-/General-Modell
`ZhengPeng7/BiRefNet`, HuggingFace-Revision
`e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4`.
Offizielle LFS-Metadaten nennen `model.safetensors`,444473596Bytes,
SHA256 `9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154`.
Die Bytes wurden nicht heruntergeladen oder lokal geprüft. Die Modellkarte nennt
MIT; der Copyright-/MIT-Text des offiziellen Code-Repo ist unter
`docs/licenses/birefnet-MIT.txt` mit Ursprung/Hash im versionierten Vertrag
gebunden. Das sind dokumentierte kommerzielle Nutzungsbedingungen des gewählten
Modells, keine Freigabe fremder Produktbilder oder ungeprüfter Konvertierungen.

[Modellkarte](https://huggingface.co/ZhengPeng7/BiRefNet/blob/e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4/README.md)
und [Modellcode](https://huggingface.co/ZhengPeng7/BiRefNet/blob/e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4/birefnet.py)
belegen1024×1024, RGB/255, Mittelwert[0.485,0.456,0.406],
Standardabweichung[0.229,0.224,0.225], letzte Logitvorhersage und Sigmoid.
Das offizielle [Exportnotebook](https://github.com/ZhengPeng7/BiRefNet/blob/f7079632d681ecf12161fcea8905682934e59e51/tutorials/BiRefNet_pth2onnx.ipynb)
belegt Opset17 und einen CPU-ONNX-Aufruf. Es exportiert jedoch ein anderes
Dynamic-Gewicht und lädt einen ungepinnten Drittanbieter-DeformConv-Konverter.
Es wird hier weder ausgeführt noch als kompatibles fertiges Artefakt ausgegeben.

Der akzeptierte **eigene Export** heißt exakt
`birefnet-e2bf8e4-fp32-opset17-lastlogits-1024.onnx`. Er muss den eval()/FP32-
Default-General-Forward mit einem festen Wrapper `return model(x)[-1]`
abbilden. Genau ein Eingang `input_image`:float32[1,3,1024,1024], ein Ausgang
`mask_logits`:float32[1,1,1024,1024], rohe Logits, Opset17/IR8,
keine dynamischen Achsen, externen Tensor-Dateien, lokalen Funktionen, Customops,
Controlflow oder Zufallsoperatoren. Standard-ONNX-DeformConv-Lowering muss
geprüft und der Exporter per Codehash/Beleg gebunden sein. Eingaben mit anderen
Varianten, FP16, mehreren Outputs oder bereits sigmoidierten Masken passen
nicht zu diesem Vertrag und dürfen nicht umetikettiert werden.

Diese ONNX-Datei existiert hier **nicht**. Exporthash/Bytezahl/Converterhash sind
im Vertrag null. Keine CPU-Kompatibilität oder numerische Parität wird aus dem
Notebook behauptet. Das konkrete Export-/Paritypaket ist der verbleibende
Pilot-Eingang, nicht eine neue Modellwahlfrage.

## Artefakt- und Runtimegates

Caller liefert einen festen Config-Dict mit Adapter-ID, privatem artifact_root,
`manifest_file="birefnet-export.json"`, Manifest-SHA, erwartetem ONNX-SHA und
allen Ressourcenbudgets. Das Manifest muss die fest gepinnte Quellen-/Lizenz-/
I/O-/Export-/Runtimeidentität wiederholen und Exportbytezahl, Exportercodehash
und Exportbeleg enthalten. Hashes sind serverseitige Deploymentbindung, keine
vom Produkttext erteilte Freigabe. `LICENSE.MIT` wird bytegenau gegengeprüft.
Das Modell wird nur als Bytes über sichere, begrenzte NOFOLLOW-FDs gelesen;
keine Symlink-/Hardlink-/FIFO-/Parentpfadumgehung. Hash und Größe müssen stimmen,
bevor ein Modell in eine Session gelangt.

Optional sind exakt NumPy2.3.5, onnx1.23.2 und onnxruntime1.31.1 vorgesehen;
Versionen wurden anhand offizieller PyPI-Metadaten ausgewählt, nicht installiert.
Hier ist nur NumPy2.3.5 bereits vorhanden; ONNX/ORT fehlen. `requirements-image`
bindet zusätzlich das NumPy-Wheel für bestehende kontrollierte Tensor-Tests;
keine native ONNX-Runtime wird dadurch automatisch installiert. Für den nativen
Pilot ist die vollständige geprüfte Dependency-/Wheelhashclosure noch nötig.

Der tatsächliche Graph wird mit `onnx.load_model_from_string` und
`onnx.checker.check_model(..., full_check=True)` geprüft, einschließlich fester
I/O, Opset/IR, Nodebudget und eingebetteter Tensoren. Erst dann entsteht eine
`InferenceSession` mit ausschließlich CPUExecutionProvider, einem Thread je
Pool, sequentieller Ausführung, deaktivierter Optimierung/CPU-Arena/MemPattern
und explizit ausgeschaltetem Providerfallback. Session-I/O und Provider werden
nochmals rückgelesen. Keine GPU-/Cloud-/Shell-/Modellfallbacks oder Customop-DLLs.

## Masken und Produktintegrität

Der Worker wendet zuerst seine bisherigen Original-/Zuordnungs-/Rechte-/ICC-/
EXIF-/Budgetgates an. Modellverarbeitung betrifft nur opake freigegebene Bilder;
bereits vorhandenes geeignetes Alpha bleibt im bisherigen Pfad unverändert.
Eine Session wird je Batch erst bei Bedarf aufgebaut und danach wiederverwendet.

Der Adapter erstellt bilinear aus dem RGB eine1024erAnsicht, normalisiert in
float32 und legt einen zusammenhängenden NCHW-Tensor an. Output muss genau ein
endlicher float32-Logittensor sein. Stabiler Sigmoid, Abrundung auf8Bit und
BICUBIC-Rückskalierung entsprechen dem gewählten HF-PIL-Maskenpfad. Für direkte
RGBA-Aufrufe gilt `source_alpha * predicted_alpha //255`: vorhandene Transparenz
wird nie aufgehoben. RGB des originalaufgelösten Produkts bleibt byteidentisch;
keine Foreground-Farbkorrektur, Schärfung, Retusche, Generierung oder Beschneidung.
Gleichförmige, leere, nichtendliche oder falsch dimensionierte Masken blockieren.
Hashes für ursprüngliches RGB/Alpha und Ergebnisalpha/Maske werden erfasst.

Ein erfolgreicher Sessiondouble ist kein nachgewiesener Freisteller. Manuelle
QA, Bildzuordnung, Nutzungsrechte und `publishable=false` bleiben erhalten.
`local_model_calls` zählt vor jedem einzelnen run()-Versuch, auch bei anschließend
verworfenem Output; es gibt keine automatische Wiederholung. Batchmodellzähler
sind lokale CPU-Versuche, keine kostenpflichtigen LLM-/Providerrechte.

## Ressourcen und verbleibender nativer Pilot

Alle Grenzen sind explizite Callerbudgets mit endlichen Codeobergrenzen.
Vor Modellread/Sessionaufbau gilt zusätzlich `4*export_bytes +64MiB` als
konservative Loader-/Sessionaufnahmeprognose; vor Tensoraufbereitung
`64MiB +32*Originalpixel`. Diese Zahlen sind **keine gemessenen Peak-RSS-Werte**.
Session-/Tensorbudgets kommen zur bisherigen Pixel-/Artefaktprognose hinzu;
Hostplanung muss die gleichzeitig gehaltenen Daten berücksichtigen.

Sessionaufbau, Aufbereitung, run() und Nachverarbeitung haben Fristprüfungen.
Ein laufender nativer Kernel/DNS-/Modellparser wird nicht präemptiv beendet;
ein isolierter zugelassener Runner mit harten CPU-/RAM-/Zeitgrenzen und Reserve
ist Voraussetzung für den echten Pilot. Keine Serverlimits werden hier geändert.

Nächste Eingänge: geprüfter self-contained General-Export mit Dateihash und
Converter-/Paritybeleg; vollständige native Runtimeclosure; gemessene CPUzeit,
Peak-RSS und temporäre Diskbytes auf freigegebenem Ziel; dann zwei tatsächlich
zugeordnete/rechtmäßig nutzbare Originale für Masken-/Label-/Farb-/Lieferumfang-
QA und anschließenden Derivat→Anzeige-Nachweis. Modellgewichte oder Runtime
werden in diesem Schritt nicht beschafft. Die echte Inferenz bleibt blockiert.

## Prüfung und Rückweg

`python3 -m unittest discover -s tests -p test_birefnet_onnx.py`
führt ausschließlich kontrollierte Graph-/Sessiondoubles mit echten NumPy-/PIL-
Tensor-/Maskenoperationen aus. Geprüft werden Sessionaufruf/Normalisierung,
Alpha-/RGBintegrität, Version/Quelle/Lizenz/Hash, Shapes, Provider, externe Daten,
Budgets, Deadline und Fehlerzähler. Kein Torch/ONNX/ORT oder Modell wurde geladen.
Batchtests prüfen Wiring, Sessionreuse, Quarantäne, Replay und Legacy-Rollback.

Rückweg: `segmenter="none_verified"` verwendet weiterhin nur vorhandene
Alphabilder; opakes RGB bleibt quarantiniert. Alte v1-Artefakte werden nur nach
ihrem unveränderten Vertrag gelesen. Keine neue Publikation oder Löschung.

## Anschluss an den bestehenden Vercel-Auftritt

Die vorhandene Vercel-Konfiguration baut `apps/site` als statische Vite-Ausgabe;
sie richtet keinen Bildworker ein. Ein möglicher nächster Schritt ist ein separat
betriebener, ressourcenbegrenzt isolierter CPU-Worker, der ausschließlich belegbar
freigegebene Originale verarbeitet und Entwürfe zur Sichtprüfung ablegt. Erst
nach nachgewiesener Prüfung können Derivate über einen gesondert implementierten
Katalog-/Auslieferungsvertrag referenziert werden. Die Anwendung darf keine
lokalen Worker-Pfade oder ungeprüfte Entwürfe als öffentliche Bild-URLs ausgeben.

Dies ist ein Integrationsvorschlag, kein vorhandener Dienst oder Deployment.
Ein eigener Worker, dauerhafter Speicher, Rechteprüfung, Rücklese- und
Veröffentlichungsvertrag sowie dessen Kosten und Betrieb sind noch zu klären.
Ohne gemessene Laufzeit und Speichergrenzen wird die schwere Inferenz keiner
Vercel Function zugewiesen. Bestehende Konfiguration bleibt unverändert.
