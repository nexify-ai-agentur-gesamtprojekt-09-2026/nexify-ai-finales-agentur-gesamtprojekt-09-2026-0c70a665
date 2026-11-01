"""Opt-in real-model batch probe on the repository's synthetic fixture."""
import json
import sys
import time
from pathlib import Path
from tools import product_image_batch as batch


def main():
    artifact_root, store = sys.argv[1:]
    raw = Path('evidence/birefnet-onnx-2026-10-27/rembg-general-synthetic/before.png').read_bytes()
    segmenter = {'adapter': 'birefnet-rembg-general-epoch244-cpu-v1', 'artifact_root': artifact_root,
                 'max_session_working_bytes': 12 * 1024**3, 'max_tensor_working_bytes': 128 * 1024**2,
                 'max_input_pixels': 1000000, 'max_inference_seconds': 180}
    policy = {'tenant': 'synthetic', 'project': 'synthetic', 'max_images': 1,
              'max_input_bytes': 1000000, 'max_total_input_bytes': 1000000,
              'max_pixels': 1000000, 'max_total_pixels': 1000000, 'max_artifact_bytes': 1000000,
              'max_total_artifact_bytes': 4000000, 'max_working_bytes': 128 * 1024**2,
              'max_store_bytes': 16000000, 'max_wall_seconds': 200, 'external_budget_minor': 0,
              'segmenter': segmenter, 'ci_colors': ['#1250a0'], 'allowed_ci_colors': ['#1250a0']}
    approval = {'tenant': 'synthetic', 'project': 'synthetic', 'product_id': 'synthetic-bottle',
                'slot_id': 'synthetic', 'source_reference_sha256': batch.sha(raw),
                'original_sha256': batch.sha(raw), 'association': 'approved',
                'association_evidence': 'self-generated-synthetic', 'license': 'approved',
                'license_evidence': 'self-generated-synthetic', 'color_space': 'srgb'}
    item = {'id': 'synthetic-bottle', 'original': raw, 'approval': approval}
    started = time.monotonic()
    result = batch.run_batch([item], policy=policy, store=store, expected_current=None)
    elapsed = round(time.monotonic() - started, 3)
    replay = batch.run_batch([item], policy=policy, store=store, expected_current=None)
    stage = Path(store) / 'stages' / result['stages'][0]['stage_key']
    print(json.dumps({'status': result['status'], 'publishable': result['publishable'],
                      'model_calls': result['model_calls'], 'network_calls': result['network_calls'],
                      'replay_equal': result == replay, 'original_preserved': (stage / 'original.bin').read_bytes() == raw,
                      'rgba_sha256': batch.sha((stage / 'rgba.png').read_bytes()) if (stage / 'rgba.png').exists() else None,
                      'elapsed_seconds': elapsed}, sort_keys=True))
    if result['status'] != 'review_required' or result['model_calls'] != 1 or replay != result:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
