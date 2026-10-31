# Zwei ORT-Sessionprofile, 31.10.2026

Ziel: ausschließlich Optionen der CPU-Session vergleichen; keine andere
Modellversion, Quantisierung, Bildverkleinerung oder externe Verarbeitung.
Das Modell `BiRefNet-general-epoch_244.onnx` hat 972666916 Bytes und SHA256
`58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c`.
Die Eingabe war das bereits versionierte synthetische Flaschenfixture. Alle drei
Läufe verwenden ONNX Runtime 1.31.1, CPUExecutionProvider, sequentielle
Ausführung und zwei Intra-Op-Threads. Jeder neue Lauf war auf 180 Sekunden und
12 GiB virtuellen Adressraum begrenzt; es gab genau zwei neue Messläufe.

| Profil | Graphoptimierung | Arena / Memory Pattern | Laden inkl. Hash | Vorverarbeitung + Inferenz | Peak-RSS |
| --- | --- | --- | ---: | ---: | ---: |
| bisherige Referenz | aus | aus / aus | 16,427 s | 34,399 s | 7,309 GiB |
| basic-no-arena | Basic | aus / aus | 8,356 s | 41,691 s | 7,796 GiB |
| basic-arena-pattern | Basic | an / an | 6,586 s | 34,116 s | 8,981 GiB |

Das Referenzergebnis stammt aus dem zuvor dokumentierten echten Modellpilot;
die beiden neuen vollständigen Messwerte stehen als JSON in diesem Verzeichnis.
Beide neuen Läufe lieferten unveränderte RGB-Bytes und null abweichende Alpha-
Pixel gegenüber der Referenz; Masken-SHA256 jeweils
`14c3e6c5867339970a151a69db8bdebff927f9e66b2a0d55ed756c43e7104a58`.
Dieser Vergleich belegt nur das einzelne synthetische Bild und keine generelle
numerische Gleichheit oder Produktqualität. Jeder Wert ist eine Einzelmessung.

Die Benchmarks laden die zuvor hashgeprüfte Datei direkt per Pfad, wie die
Referenzprobe. Der Batchworker lädt dagegen eine unveränderliche Kopie der
Modellbytes zur Hashbindung; dieser zusätzliche Speicherbedarf ist hier nicht
als Worker-RSS gemessen. Das Profil mit Arena war in dieser Einzelmessung
schneller, verbrauchte jedoch erheblich mehr Speicher. Da keines der Profile das
Speicherziel verbessert, werden die Adapteroptionen nicht umgestellt. Der
isolierte Worker bleibt erforderlich.

Die [ORT-Dokumentation zu Graphoptimierungen](https://onnxruntime.ai/docs/performance/model-optimizations/graph-optimizations.html)
beschreibt Basic als eigene Optimierungsstufe; die
[SessionOptions-Dokumentation](https://onnxruntime.ai/docs/api/csharp/api/Microsoft.ML.OnnxRuntime.SessionOptions.html)
beschreibt sequentielle Ausführung und die Threadoptionen. Die aktuelle
[Vercel-Functions-Grenze](https://vercel.com/docs/functions/limitations) nennt
maximal 2 GB für Hobby und 4 GB für Pro/Enterprise. Die drei beobachteten
RSS-Werte liegen darüber. Das Modell allein übersteigt zudem die reguläre
unkomprimierte Python-Function-Bundlegrenze von 500 MB; laut derselben Quelle
existiert eine gesonderte Large-Functions-Beta. Ein anderes Bundleverfahren oder
das Unterschreiten einer einzelnen Grenze würde die Integration nicht beweisen.
Es wurde kein Vercel-Dienst, Tarif oder Deployment geändert.

Wiederholung je Profil nach Bereitstellung der gepinnten Runtime und des Modells:

```sh
ulimit -v 12582912
PYTHONPATH=<isolierte-runtime>:. timeout 180s python3 tests/ort_session_profile_probe.py basic-no-arena <model.onnx>
PYTHONPATH=<isolierte-runtime>:. timeout 180s python3 tests/ort_session_profile_probe.py basic-arena-pattern <model.onnx>
```
