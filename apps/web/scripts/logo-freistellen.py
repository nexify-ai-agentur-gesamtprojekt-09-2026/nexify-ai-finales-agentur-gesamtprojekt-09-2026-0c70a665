"""Freistellung der Logo-Figur (nur Pillow/numpy).
Koerper: ueber Farbe (Lime) mit weicher Kante und Entfaerbung des dunklen Saums.
Hut: schwarzer Hut auf dunklem Grund laesst sich nicht ueber Farbe trennen -> geometrische Maske
(Kuppel + Krempe als gedrehte Ellipsen), mit Kantenglaettung gezeichnet.
Aufruf: python3 frei2.py <quelle.webp> <ziel.png> [pruef]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src = Image.open(sys.argv[1]).convert("RGB")
BOX = (60, 380, 300, 620)          # 240 x 240 um die Figur
S = 6                              # Arbeitsmassstab
crop = src.crop(BOX)
W = crop.width * S
big = crop.resize((W, W), Image.BICUBIC)
a = np.asarray(big).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# --- Koerper: Lime = g deutlich ueber b -------------------------------------------------
lime = g - b
alpha_body = np.clip((lime - 22) / 40, 0, 1)
mb = Image.fromarray((alpha_body * 255).astype(np.uint8))
# Innenloecher (Augen, Monokel, Glanz) schliessen: Flutfuellung von aussen
hard = np.asarray(mb) > 110
h, w = hard.shape
outside = np.zeros_like(hard)
stack = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
while stack:
    y, x = stack.pop()
    if y < 0 or x < 0 or y >= h or x >= w or outside[y, x] or hard[y, x]:
        continue
    outside[y, x] = True
    stack.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
solid = (~outside).astype(np.uint8) * 255
# Kontur glaetten: weichzeichnen, neu schwellen (entfernt Treppen der Vergroesserung), leicht einziehen, weiche Kante
glatt = Image.fromarray(solid).filter(ImageFilter.GaussianBlur(S * 1.1)).point(lambda v: 255 if v > 140 else 0)
kern = np.asarray(glatt.filter(ImageFilter.MinFilter(2 * S + 1))) > 127      # sicher innen liegende Punkte
body = glatt.filter(ImageFilter.GaussianBlur(S * 0.4))

# --- Hut: Geometrie in Koordinaten des 240er-Ausschnitts ---------------------------------
def ellipse(cx, cy, rx, ry, rot, y_max=None):
    ss = 2
    im = Image.new("L", (W * ss, W * ss), 0)
    d = ImageDraw.Draw(im)
    k = S * ss
    d.ellipse(((cx - rx) * k, (cy - ry) * k, (cx + rx) * k, (cy + ry) * k), fill=255)
    if y_max is not None:
        d.rectangle((0, y_max * k, W * ss, W * ss), fill=0)
    im = im.rotate(-rot, resample=Image.BICUBIC, center=(cx * k, cy * k))
    return im.resize((W, W), Image.LANCZOS)

HUT = dict(
    kuppel=(95.5, 43.0, 42.5, 28.5, 5.0, None),   # cx, cy, rx, ry, Drehung, Schnitt
    krempe=(92.5, 54.5, 57.5, 9.2, 8.0, None),
)
hut = Image.new("L", (W, W), 0)
for p in HUT.values():
    hut = Image.fromarray(np.maximum(np.asarray(hut), np.asarray(ellipse(*p))))
# Kuppel nur oberhalb der Krempenunterkante: unter der Krempe gehoert alles dem Koerper
unter = ellipse(92.5, 54.5 + 30, 80, 30.6, 8.0)
hut = Image.fromarray((np.asarray(hut) * (1 - np.asarray(unter) / 255.0 * (1 - np.asarray(ellipse(*HUT["krempe"])) / 255.0))).astype(np.uint8))
hut = hut.filter(ImageFilter.GaussianBlur(S * 0.25))

# Schattenzone unter der Krempe gehoert zum Koerper (dort ist das Lime zu dunkel fuer die Farbmaske)
bruecke = ellipse(96.0, 62.0, 47.0, 10.0, 8.0).filter(ImageFilter.GaussianBlur(S * 0.4))
body = Image.fromarray(np.maximum(np.asarray(body), np.asarray(bruecke)))
alpha = np.maximum(np.asarray(body), np.asarray(hut)).astype(np.float32) / 255.0

# --- Saum entfaerben: Hintergrundanteil (dunkel ~25) aus den Kantenpunkten herausrechnen ---
BG = 25.0
# Kantenfarbe = nach aussen getragene Innenfarbe (kein dunkler oder heller Saum)
kf = kern.astype(np.float32)
num = np.dstack([np.asarray(Image.fromarray((a[..., i] * kf).astype(np.uint8)).filter(ImageFilter.GaussianBlur(S * 1.6))).astype(np.float32) for i in range(3)])
den = np.asarray(Image.fromarray((kf * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(S * 1.6))).astype(np.float32)[..., None] / 255.0
trag = num / np.clip(den, 0.02, 1)
rgb = np.where(kf[..., None] > 0.5, a, trag)
# nur am Koerperrand anwenden; im Hut bleibt das Schwarz unveraendert
kb = (np.asarray(body).astype(np.float32) / 255.0)[..., None]
kh = (np.asarray(hut).astype(np.float32) / 255.0)[..., None]
use = np.clip(kb - kh, 0, 1)
rgb = rgb * use + a * (1 - use)
# Hut: Reste des Grundverlaufs an der Kante auf Hutschwarz ziehen
rand_h = np.clip(kh * (1 - kh) * 4, 0, 1) * (1 - kb)
rgb = rgb * (1 - rand_h) + np.array([17.0, 18.0, 17.0]) * rand_h
rgb = np.clip(rgb, 0, 255)

out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
im = Image.fromarray(out, "RGBA")
bbox = Image.fromarray((alpha * 255).astype(np.uint8)).point(lambda v: 255 if v > 6 else 0).getbbox()
im = im.crop(bbox)
# feste Box 1:1 mit Rand, damit die Datei spaeter nur getauscht wird
side = max(im.size)
pad = int(side * 0.04)
sq = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
sq.alpha_composite(im, ((sq.width - im.width) // 2, (sq.height - im.height) // 2))
sq = sq.resize((768, 768), Image.LANCZOS)
sq.save(sys.argv[2])
print("groesse", sq.size)

if len(sys.argv) > 3:
    base = sys.argv[2].rsplit(".", 1)[0]
    tafel = Image.new("RGB", (3 * 520, 520 + 140), (27, 30, 29))
    for i, col in enumerate(((27, 30, 29), (232, 235, 234), (140, 150, 150))):
        f = Image.new("RGBA", (520, 660), col + (255,))
        f.alpha_composite(sq.resize((440, 440), Image.LANCZOS), (40, 30))
        for j, px in enumerate((96, 56, 40, 28)):
            f.alpha_composite(sq.resize((px, px), Image.LANCZOS), (40 + j * 120, 520 + (100 - px) // 2))
        tafel.paste(f.convert("RGB"), (i * 520, 0))
    tafel.save(base + "-pruef.png")
