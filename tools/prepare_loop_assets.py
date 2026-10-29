"""Prepare identity-true cut-outs from the user's new photos (29.10.) for the home loop videos.

No generative AI: pixels are copied 1:1, only the background is removed (rembg) or alpha is taken from
the user's own RGBA concept files. Outputs go to .local/home-loops/figures/ with a SHA256 manifest.
"""
import hashlib, json, pathlib
from PIL import Image
from rembg import remove, new_session

SRC = pathlib.Path('/app/.local/user-assets-2026-10-29')
OUT = pathlib.Path('/app/.local/home-loops/figures')
OUT.mkdir(parents=True, exist_ok=True)
ZIEL = pathlib.Path('/app/apps/web/public/media/presenters')

session = new_session('isnet-general-use')
manifest = {'method': 'rembg isnet-general-use alpha matting / user RGBA alpha, no generative edit', 'figures': {}}


def cut(name, image, matting=True):
    out = remove(image, session=session, alpha_matting=matting, alpha_matting_foreground_threshold=240,
                 alpha_matting_background_threshold=12, alpha_matting_erode_size=8, post_process_mask=True)
    box = out.getbbox()
    if box:
        out = out.crop(box)
    path = OUT / f'{name}.png'
    out.save(path, optimize=True)
    manifest['figures'][name] = {'file': path.name, 'size': out.size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    print(name, out.size, flush=True)
    return out


def crop_alpha(name, image, box):
    part = image.crop(box)
    bbox = part.getbbox()
    if bbox:
        part = part.crop(bbox)
    path = OUT / f'{name}.png'
    part.save(path, optimize=True)
    manifest['figures'][name] = {'file': path.name, 'size': part.size, 'crop_box': box, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    print(name, part.size, flush=True)
    return part


# Real photos of Pascal (grey studio background) -> alpha cut-outs
cut('pascal-standing-pockets', Image.open(SRC / 'pascal-standing-hands-pockets.jpg').convert('RGB'))
cut('pascal-sitting-chair', Image.open(SRC / 'pascal-sitting.jpg').convert('RGB'))
cut('pascal-walking-front', Image.open(SRC / 'pascal-walking-a.jpg').convert('RGB'))

# User RGBA concept: Pascal walking (centre) – alpha already present, just crop the figure
walk = Image.open(SRC / 'trio-walk-cutout.png').convert('RGBA')
crop_alpha('pascal-walk-concept', walk, (560, 60, 1010, 1020))
# NeX from the same concept (small front-left) – kept as alternative, Zielbild NeX stays primary
crop_alpha('nex-concept-side', walk, (280, 700, 560, 1020))

# User RGBA concept: trio with table model – remove the fluffy AIFly region later in compositing (smooth AIFly per Charakterbibel)
table = Image.open(SRC / 'trio-table-model.png').convert('RGBA')
crop_alpha('trio-table-model', table, (0, 0, table.width, table.height))

# Reference copies of approved Zielbild figures (smooth AIFly)
for src in ('zielbild-nex-walk.png', 'zielbild-aifly-float.png', 'zielbild-pascal-walk.png'):
    data = (ZIEL / src).read_bytes()
    (OUT / src).write_bytes(data)
    manifest['figures'][src[:-4]] = {'file': src, 'size': Image.open(ZIEL / src).size, 'sha256': hashlib.sha256(data).hexdigest(), 'origin': 'approved Zielbild v2'}

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
print('done')
