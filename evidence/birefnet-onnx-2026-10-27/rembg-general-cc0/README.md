# Zwei öffentliche CC0-Bildproben, 31.10.2026

Beide Bilder dienen ausschließlich als öffentliche technische Testdaten, nicht
als Nachweis eines echten Katalogprodukts. Die kleinen Ansichten sind verkleinerte
Prüfkopien; die gemessenen Batchausgaben behielten Originalpixelmaße. Die
unveränderten Quelldateien und großen RGBA-Ergebnisse liegen außerhalb von Git.
Bei diesen Testfällen wurde der Hash der Originalbildbytes als unveränderliche
Bildreferenz verwendet; dies ist keine Lieferanten-/Produktzuordnung für einen Shop.

- [Hammer mit Nägeln](https://commons.wikimedia.org/wiki/File:Hammer-1629587.jpg),
  Grieslightnin, CC0; Commons dokumentiert die Quellenprüfung vom 19.02.2020.
  SHA256 `0769ffc127d72aa4edb82d69e6ba715f3b7642f0018e636c0d01deb15a2b645f`,
  3264×2448, 2895983 Bytes. Ziel war der Hammer ohne Nägel. In den angesehenen
  Ansichten auf Weiß und Schwarz waren die Nägel entfernt; die Kante ist nur
  eine menschliche Einschätzung der Vorschau. Der Griff ist bereits im Original
  am unteren Bildrand angeschnitten. Batch: 70,176 s, ein Modellaufruf,
  Originalbytes erhalten, Alpha 0–255, `review_required`, `publishable=false`.
- [Trinkglas](https://commons.wikimedia.org/wiki/File:Glass_bottle.jpg),
  Yesseruser, eigenes Werk, CC0. Trotz Dateiname zeigt das Foto ein Trinkglas.
  SHA256 `306f9d3a9b15df0099305c85ab5d2995022dc1b4f5db0ea8e16d5e3ed2c904f2`,
  1627×2090, 1696779 Bytes. Das Original enthält ein sRGB-ICC-Profil mit SHA256
  `f1932003689e9412798ea432ad57c04da8b4cf235f9d132f56089fb509651e0c`.
  Das Original blieb unverändert; eine mit Pillow ImageCms nach sRGB konvertierte
  PNG-Arbeitskopie wurde explizit als Batcheingabe verwendet und ihr Hash im
  Ergebnis protokolliert. Batch: 70,725 s, ein Modellaufruf, Alpha 0–255,
  `review_required`, `publishable=false`. Das Tischdeckenmuster bleibt in der
  weitgehend opaken Glasfläche sichtbar. **Qualitätsflag: nicht als freigestelltes
  transparentes Glas zur Veröffentlichung geeignet.**

Die Ergebnisse enthalten keine generierten Produktdetails. RGB-Integrität wurde
vom Batch gegenüber der jeweiligen Batcheingabe überprüft; beim Glas ist das
die farbkonvertierte Arbeitskopie, nicht ein bytegleicher JPEG-Pixelvergleich.
Die Ergebnisse belegen weder Freigabe noch allgemeine Qualität für Produktfotos.
