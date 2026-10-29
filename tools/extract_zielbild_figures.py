"""Extract Pascal (walking), NeX and AIFly from the user's approved Zielbild as alpha cutouts.

No generative AI is used: pixels are copied 1:1 from the reference, only the background is removed.
Output: apps/web/public/media/presenters/zielbild-*.png + manifest with sha256.
"""
import hashlib, json, pathlib, sys
from PIL import Image
from rembg import remove, new_session

SRC = pathlib.Path('/app/.local/hero-production/user-reference.png')
OUT = pathlib.Path('/app/apps/web/public/media/presenters')
OUT.mkdir(parents=True, exist_ok=True)

# Crop boxes (x0,y0,x1,y1) measured on the 1586x992 reference; generous margins.
BOXES = {
 'pascal-walk': (400, 300, 760, 930),
 'nex-walk': (130, 515, 450, 900),
 'aifly-float': (690, 330, 920, 540),
}

session = new_session('isnet-general-use')
im = Image.open(SRC).convert('RGB')
manifest = {'source': str(SRC), 'source_sha256': hashlib.sha256(SRC.read_bytes()).hexdigest(), 'method': 'rembg isnet-general-use alpha matting, no generative edit', 'figures': {}}
for name, box in BOXES.items():
    crop = im.crop(box)
    cut = remove(crop, session=session, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=12, alpha_matting_erode_size=8, post_process_mask=True)
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    path = OUT / f'zielbild-{name}.png'
    cut.save(path, optimize=True)
    manifest['figures'][name] = {'file': path.name, 'size': cut.size, 'crop_box': box, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    print(name, cut.size)
(OUT / 'zielbild-figures.manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
print('done')
