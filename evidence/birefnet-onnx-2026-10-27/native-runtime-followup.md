# Produktbild-Runtime und Exportrecherche, 31.10.2026

Diese Belege betreffen ausschließlich synthetische Daten. Sie belegen keinen
vollständigen BiRefNet-Export, keine echte Produktfreistellung und keine Freigabe.

## REA-MCP

REA `rea-agents@6.8.0` wurde isoliert aus npm installiert; Paketintegrität laut
Registry `sha512-9QDeRnGqEDzABZyr04eLnBXBv/c6I9/TWu/6M0MD4pEfkySI/BIgwTODIbAReX3C1x6hjw9+Jlx4A2yUSPZ9ww==`.
Über den bestehenden STDIO-Probeclient: MCP-Protokoll `2025-11-25`, 229 Tools
vollständig gelistet, `binary_session` erfolgreich, statisches eigenes JS-Fixture
analysiert, vollständiges Evidence-Bundle in derselben Sitzung identisch
zurückgelesen, Serverexit 0. Der Bericht hatte SHA256
`32156f8ccdd2164bca0759d77eb018dd6d261cd7da5cf0e4b0497e25a57b97fb`;
Sessionreadback SHA256 `d9427f4fa0d391b3b7b83bc15ad3df6b64e8b1b81f58edb119309eacdedd5ed5`.
Der Bericht enthält lokale Pfade und wird deshalb hier nicht eingebracht. Dies
ist keine REA-Analyse der Python-Bildpipeline oder ONNX-Inferenz.

## Native CPU-Probe

`tests/native_image_runtime_probe.py` erzeugt einen Graphen mit ONNX `ReduceMean`
und ein Rechteckbild. Mit NumPy 2.3.5, ONNX 1.23.2, ONNX Runtime 1.31.1 und
Pillow 12.3.0: CPUExecutionProvider, ein Lauf, Input `[1,3,1024,1024]`, Output
`[1,1,1024,1024]`, RGB unverändert. Graph-SHA256
`1b21212f7c737d520a732c5c94655d8c2cf66af8e1e1002c43faeaefba998935`,
Masken-SHA256 `ffba8fcedd26b06a4c08ea4b4542d45d418de60c5a90f178040f485e0268ede2`.
Ein beobachteter Lauf dauerte 0,159 s und verbrauchte 119300 KiB Peak-RSS;
ein zweiter 0,092 s und 119896 KiB. Die Alpha-Extrema 86/233 zeigen, dass
diese Demo-Maske keine brauchbare Freistellung ist. Diese Werte sind keine
BiRefNet-Ressourcenmessung.

```sh
PYTHONPATH=<isolierter-runtime-pfad>:. timeout 60s python3 tests/native_image_runtime_probe.py <synthetischer-ausgabeordner>
python3 -m unittest discover -s tests -p 'test_birefnet_onnx.py'
python3 -m unittest discover -s tests -p 'test_product_image_batch.py'
python3 -m unittest discover -s tests -p 'test_birefnet_parity.py'
```

## Exportquellen und Parität

Der [offizielle Modellcode](https://huggingface.co/ZhengPeng7/BiRefNet/blob/e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4/birefnet.py)
hat SHA256 `208771ae626f653d64128fbf2d6ac9f8e645c5cc5e286258a73ec3322bbfe5ef`.
Seine Default-Konfiguration wählt `ASPPDeformable`; `BasicDecBlk` verwendet es,
und dessen DeformableConv2d ruft torchvision `deform_conv2d` mit Offset und
Modulationsmaske auf. Das [offizielle Notebook](https://github.com/ZhengPeng7/BiRefNet/blob/f7079632d681ecf12161fcea8905682934e59e51/tutorials/BiRefNet_pth2onnx.ipynb)
verwendet eine andere Gewichtsvariante, lädt einen ungepinnten Konverter und
verändert dessen `get_tensor_dim_size`: bei fehlenden Dimensionen leitet es
Größen aus Tensorstrides ab. Diese Ableitung und ihre Gültigkeit müssen für den
konkreten Graphen überprüft werden.

Der untersuchte [Konverterstand](https://github.com/masamitsu-murase/deform_conv2d_onnx_exporter/tree/ed84d9114b4ab17c5e0a5dc8a412c0d57743a402)
hat Commit `ed84d9114b4ab17c5e0a5dc8a412c0d57743a402`; die einzelne
Python-Datei hat SHA256 `4856926c0d55ecd1185e21f8056f76670c25603e71f96b98c6b12d263de721ba`.
`setup.py` nennt MIT; im Repository ist kein separater Lizenztext enthalten.
Der Konverter bildet Sampling-Koordinaten, Interpolation, Gather, Maske und
Faltung mit ONNX-Operatoren nach. Die selektive Quellsichtung ist kein
unabhängiges Code- oder Lizenzreview und keine numerische Funktionsprüfung.
Der Konverter wurde nicht ausgeführt.

Der [rembg-General-Adapter](https://github.com/danielgatis/rembg/blob/c5b48b0417a0254df7d461efa14573597f369a83/rembg/sessions/birefnet_general.py)
verweist auf `BiRefNet-general-epoch_244.onnx` (972666916 Bytes, MD5
`7a35a0141cbbc80de11d9c9a28f52697`). Dessen Code-SHA256 ist
`e985eeb1ec72df63be6992aa3104255b225fa736d601b5bcc77cc6316c810698`.
Die Quelle belegt keine Identität mit den festgelegten HF-Gewichten oder deren
Export; der Adapter verwendet zudem Min-Max-Normalisierung und Lanczos statt
unserer bisherigen Maskennachbearbeitung. Das Modell wurde nicht heruntergeladen
oder mit dem bestehenden Vertrag gleichgesetzt.

`tools/birefnet_parity.py` vergleicht zwei vorhandene float32-Logitarrays der
festen Form mit vorläufig `atol=rtol=0,0001`, meldet Hashes und die Zahl der
Abweichungen und lehnt nichtendliche Werte ab. Der Vergleich prüft weder die
Herkunft der Arrays noch die Identität ihres Eingabebildes; diese Bindungen
müssen ein gesonderter Export-/Referenzbeleg liefern. Seine Tests verwenden
ausschließlich synthetische Arrays. Eine tatsächliche Modellparität ist offen.
