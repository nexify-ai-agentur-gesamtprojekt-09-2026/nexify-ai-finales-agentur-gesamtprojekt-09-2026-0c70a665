"""Compose the 1920x1080 start/loop frames for the NeXify home loop videos on the brand stage.

Stage = graphite (#080A0F -> #0F131A), lime/cyan light ribbons, reflective floor – matching the tokens
used by TrioScene.css, so the video blends into the page without a frame. Figures are identity-true
cut-outs (see tools/prepare_loop_assets.py). Smooth AIFly from the approved Zielbild replaces the fluffy
variant (Charakterbibel §4: no fur). No generative edits happen here.
"""
import hashlib, json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

FIG = pathlib.Path('/app/.local/home-loops/figures')
OUT = pathlib.Path('/app/.local/home-loops/frames')
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
FLOOR_Y = 950  # contact line of feet
GRAPHIT_800 = (8, 10, 15)
GRAPHIT_850 = (15, 19, 26)
LIME = (192, 238, 56)
CYAN = (56, 189, 248)


def stage(seed=0):
    ys = np.linspace(0, 1, H)[:, None]
    base = np.zeros((H, W, 3), dtype=float)
    for c in range(3):
        base[..., c] = GRAPHIT_800[c] + (GRAPHIT_850[c] - GRAPHIT_800[c]) * ys
    floor = np.clip((ys - FLOOR_Y / H) / (1 - FLOOR_Y / H), 0, 1)
    base[..., 0] += 5 * floor; base[..., 1] += 8 * floor; base[..., 2] += 9 * floor
    bg = Image.fromarray(np.clip(base, 0, 255).astype('uint8'))
    # Light ribbons (lime + soft cyan), gentle arcs sweeping from lower left to upper right
    arcs = Image.new('RGB', (W, H), (0, 0, 0)); ad = ImageDraw.Draw(arcs)
    for box, width, col in [((-500, 150, W + 420, H + 1000), 9, (120, 160, 36)), ((-200, 320, W + 760, H + 1200), 6, (90, 130, 30)),
                            ((200, 480, W + 1000, H + 1400), 4, (40, 120, 150))]:
        ad.arc(box, start=196, end=338, fill=col, width=width)
    arcs = arcs.filter(ImageFilter.GaussianBlur(10))
    glow = Image.new('RGB', (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((W * 0.25, H * 0.80, W * 0.95, H * 1.12), fill=(18, 30, 10))
    gd.ellipse((W * 0.62, -H * 0.10, W * 1.15, H * 0.45), fill=(8, 20, 9))
    gd.ellipse((W * 0.80, H * 0.62, W * 1.12, H * 0.98), fill=(4, 18, 26))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    merged = np.clip(np.asarray(bg).astype(int) + np.asarray(arcs).astype(int) * 0.34 + np.asarray(glow).astype(int), 0, 255).astype('uint8')
    out = Image.fromarray(merged).convert('RGBA')
    # faint floor edge highlight
    line = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(line)
    ld.line((W * 0.10, FLOOR_Y + 2, W * 0.92, FLOOR_Y + 2), fill=(*LIME, 46), width=2)
    out.alpha_composite(line.filter(ImageFilter.GaussianBlur(2)))
    return out


def fig(name):
    return Image.open(FIG / f'{name}.png').convert('RGBA')


def fit_h(image, height):
    return ImageOps.contain(image, (10000, height), Image.Resampling.LANCZOS)


def place(canvas, image, x, feet_y, reflection=True, contact=True, floating=False):
    """x = left edge, feet_y = bottom edge (contact line). Adds contact shadow + floor reflection."""
    y = feet_y - image.height
    if contact and not floating:
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
        sd.ellipse((x + image.width * 0.08, feet_y - 16, x + image.width * 0.92, feet_y + 14), fill=(0, 0, 0, 200))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    if floating:
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
        sd.ellipse((x + image.width * 0.2, FLOOR_Y - 10, x + image.width * 0.8, FLOOR_Y + 10), fill=(0, 0, 0, 70))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    if reflection:
        refl = ImageOps.flip(image).filter(ImageFilter.GaussianBlur(2.2))
        mask = Image.linear_gradient('L').resize((refl.width, refl.height))  # 0 (top) -> 255 (bottom)
        mask = ImageOps.invert(mask).point(lambda v: int(v * (0.16 if floating else 0.40)))
        a = ImageOps.multiply(refl.getchannel('A'), mask) if hasattr(ImageOps, 'multiply') else Image.fromarray((np.asarray(refl.getchannel('A')) * (np.asarray(mask) / 255.0)).astype('uint8'))
        refl.putalpha(a)
        ry = FLOOR_Y + (FLOOR_Y - feet_y) if not floating else FLOOR_Y + int((FLOOR_Y - feet_y) * 0.35)
        canvas.alpha_composite(refl, (x, ry))
    canvas.alpha_composite(image, (x, y))


def save(name, canvas):
    path = OUT / f'{name}.png'
    canvas.convert('RGB').save(path, optimize=True)
    print(name, path, flush=True)
    return path


def welcome_loop():
    c = stage()
    nex = fit_h(fig('zielbild-nex-walk'), 470)
    pascal = fit_h(fig('pascal-standing-pockets'), 820)
    oracle = fit_h(fig('zielbild-aifly-float'), 300)
    place(c, nex, 330, FLOOR_Y)
    place(c, pascal, 790, FLOOR_Y)
    place(c, oracle, 1270, 640, floating=True)
    return save('welcome-loop', c)


def welcome_start():
    """Trio slightly further back (smaller, feet higher on the floor) and in stride – the intro clip walks them into the loop pose."""
    c = stage()
    nex = fit_h(fig('zielbild-nex-walk'), 410)
    pascal = fit_h(fig('pascal-walk-concept'), 720)
    oracle = fit_h(fig('zielbild-aifly-float'), 260)
    place(c, nex, 420, FLOOR_Y - 60)
    place(c, pascal, 840, FLOOR_Y - 60)
    place(c, oracle, 1230, 600, floating=True)
    return save('welcome-start', c)


def project_loop():
    c = stage()
    table = fig('trio-table-model')
    # Remove fluffy AIFly (right side) – Charakterbibel: smooth material only
    arr = np.asarray(table).copy()
    x0, y0, x1, y1 = 1030, 395, 1470, 820
    reg = arr[y0:y1, x0:x1]
    r, g, b, a = reg[..., 0].astype(int), reg[..., 1].astype(int), reg[..., 2].astype(int), reg[..., 3]
    lime = (g > 140) & (b < 130) & (g > r + 10)
    hat = (np.maximum(np.maximum(r, g), b) < 70) & (b <= r + 12) & (np.arange(y0, y1)[:, None] < 580) & (np.arange(x0, x1)[None, :] > 1085)
    halo = (g > r) & (g > b + 20) & (a < 200)
    kill = lime | hat | halo
    reg[..., 3] = np.where(kill, 0, a)
    arr[y0:y1, x0:x1] = reg
    table = Image.fromarray(arr)
    table = fit_h(table, 900)
    scale = 900 / 992
    tx = (W - table.width) // 2 + 40
    place(c, table, tx, FLOOR_Y + 8, reflection=True, contact=False)
    # Smooth AIFly over the cleared area, floating just above the platform
    oracle = fit_h(fig('zielbild-aifly-float'), int(430 * scale))
    ox = tx + int(1015 * scale); oy = int(395 * scale) + (FLOOR_Y + 8 - table.height)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((ox + 60, oy + oracle.height - 20, ox + oracle.width - 60, oy + oracle.height + 30), fill=(0, 0, 0, 90))
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    c.alpha_composite(oracle, (ox, oy))
    return save('project-loop', c)


def choice_loop():
    c = stage()
    nex = fit_h(fig('zielbild-nex-walk'), 440)
    pascal = fit_h(fig('pascal-sitting-chair'), 760)
    oracle = fit_h(fig('zielbild-aifly-float'), 290)
    place(c, pascal, 700, FLOOR_Y)
    place(c, nex, 290, FLOOR_Y)
    place(c, oracle, 1300, 600, floating=True)
    return save('choice-loop', c)


if __name__ == '__main__':
    paths = [welcome_start(), welcome_loop(), project_loop(), choice_loop()]
    manifest = {p.stem: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'size': [W, H]} for p in paths}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('done')
