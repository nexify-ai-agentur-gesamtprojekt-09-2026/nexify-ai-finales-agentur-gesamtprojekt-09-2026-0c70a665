"""Opt-in single-image CC0 batch probe; inputs are hash-pinned public files."""
import hashlib
import io
import json
import sys
import time
from pathlib import Path
from PIL import Image, ImageCms
from tools import product_image_batch as batch

SOURCES = {
    'hammer': ('0769ffc127d72aa4edb82d69e6ba715f3b7642f0018e636c0d01deb15a2b645f',
               'https://commons.wikimedia.org/wiki/File:Hammer-1629587.jpg'),
    'glass': ('306f9d3a9b15df0099305c85ab5d2995022dc1b4f5db0ea8e16d5e3ed2c904f2',
              'https://commons.wikimedia.org/wiki/File:Glass_bottle.jpg'),
}


def main():
    kind, source_path, model_root, store, preview_dir = sys.argv[1:]
    expected, source_url = SOURCES[kind]
    raw_source = Path(source_path).read_bytes()
    if hashlib.sha256(raw_source).hexdigest() != expected:
        raise ValueError('source_hash_mismatch')
    with Image.open(io.BytesIO(raw_source)) as image:
        image.load()
        if kind == 'glass':
            profile = image.info.get('icc_profile', b'')
            if hashlib.sha256(profile).hexdigest() != 'f1932003689e9412798ea432ad57c04da8b4cf235f9d132f56089fb509651e0c':
                raise ValueError('source_icc_mismatch')
            converted = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                                                  ImageCms.createProfile('sRGB'), outputMode='RGB')
            converted.info.clear()
            output = io.BytesIO(); converted.save(output, format='PNG')
            working = output.getvalue()
        else:
            if image.info.get('icc_profile') or image.getexif().get(274, 1) != 1:
                raise ValueError('unexpected_source_color_or_orientation')
            working = raw_source
    segmenter = {'adapter': 'birefnet-rembg-general-epoch244-cpu-v1', 'artifact_root': model_root,
                 'max_session_working_bytes': 12 * 1024**3, 'max_tensor_working_bytes': 512 * 1024**2,
                 'max_input_pixels': 10000000, 'max_inference_seconds': 180}
    policy = {'tenant': 'cc0-public-test', 'project': 'cc0-public-test', 'max_images': 1,
              'max_input_bytes': 64 * 1024**2, 'max_total_input_bytes': 64 * 1024**2,
              'max_pixels': 10000000, 'max_total_pixels': 10000000, 'max_artifact_bytes': 128 * 1024**2,
              'max_total_artifact_bytes': 768 * 1024**2, 'max_working_bytes': 1024**3,
              'max_store_bytes': 1024**3, 'max_wall_seconds': 240, 'external_budget_minor': 0,
              'segmenter': segmenter, 'ci_colors': ['#000000'], 'allowed_ci_colors': ['#000000']}
    approval = {'tenant': 'cc0-public-test', 'project': 'cc0-public-test', 'product_id': kind,
                'slot_id': 'pilot', 'source_reference_sha256': expected,
                'original_sha256': batch.sha(working), 'association': 'approved',
                'association_evidence': 'CC0 public test; not a catalog product',
                'license': 'approved', 'license_evidence': source_url, 'color_space': 'srgb'}
    started = time.monotonic()
    result = batch.run_batch([{'id': kind, 'original': working, 'approval': approval}],
                             policy=policy, store=store, expected_current=None)
    elapsed = round(time.monotonic() - started, 3)
    stage = Path(store) / 'stages' / result['stages'][0]['stage_key']
    record = json.loads((stage / 'manifest.json').read_text())
    summary = {'kind': kind, 'source_sha256': expected, 'working_sha256': batch.sha(working),
               'source_url': source_url, 'source_preserved': hashlib.sha256(Path(source_path).read_bytes()).hexdigest() == expected,
               'batch_input_preserved': (stage / 'original.bin').read_bytes() == working,
               'color_transform': 'embedded ICC to sRGB via Pillow ImageCms' if kind == 'glass' else 'none',
               'status': result['status'], 'blocking_reasons': record['blocking_reasons'],
               'publishable': result['publishable'], 'model_calls': result['model_calls'],
               'elapsed_seconds': elapsed, 'quality': 'manual_review_required'}
    if result['status'] == 'review_required':
        target = Path(preview_dir); target.mkdir(parents=True, exist_ok=True)
        with Image.open(stage / 'rgba.png') as rgba:
            rgba.load(); alpha = rgba.getchannel('A')
            summary.update({'size': list(rgba.size), 'alpha_extrema': list(alpha.getextrema()),
                            'rgba_sha256': batch.sha((stage / 'rgba.png').read_bytes()),
                            'alpha_bbox': list(alpha.getbbox())})
            alpha.thumbnail((720, 720)); alpha.save(target / (kind + '-mask.png'))
        for name, suffix in [('original.bin', 'before'), ('white.png', 'white'), ('ci-000000.png', 'black')]:
            with Image.open(stage / name) as image:
                image = image.convert('RGB'); image.thumbnail((720, 720)); image.save(target / (kind + '-' + suffix + '.jpg'), quality=88)
    print(json.dumps(summary, sort_keys=True))
    if result['status'] != 'review_required': raise SystemExit(1)


if __name__ == '__main__':
    main()
