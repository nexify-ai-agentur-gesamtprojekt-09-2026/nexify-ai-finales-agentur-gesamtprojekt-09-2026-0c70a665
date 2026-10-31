"""One bounded ORT profile measurement on the existing synthetic fixture.

The caller must impose an external process deadline and address-space limit.
This standalone probe uses a model path (not the batch worker's immutable
in-memory snapshot); it does not certify a production deployment.
"""
import fcntl
import hashlib
import json
import os
import resource
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image
from tools import birefnet_rembg_pilot as pilot

PROFILES = {
    'basic-no-arena': (False, False),
    'basic-arena-pattern': (True, True),
}


def main():
    profile, model_name = sys.argv[1:]
    arena, pattern = PROFILES[profile]
    started = time.monotonic()
    model = Path(model_name)
    digest = hashlib.sha256()
    count = 0
    with model.open('rb') as source:
        while chunk := source.read(1024 * 1024):
            count += len(chunk)
            if count > pilot.MODEL_BYTES: raise ValueError('model_size_mismatch')
            digest.update(chunk)
    if count != pilot.MODEL_BYTES or digest.hexdigest() != pilot.MODEL_SHA256:
        raise ValueError('model_hash_mismatch')
    evidence = Path('evidence/birefnet-onnx-2026-10-27/rembg-general-synthetic')
    with Image.open(evidence / 'before.png') as image:
        source = image.convert('RGB')
    with Image.open(evidence / 'mask.png') as image:
        reference_mask = np.asarray(image.convert('L'), dtype=np.int16)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2; opts.inter_op_num_threads = 1
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    opts.enable_cpu_mem_arena = arena; opts.enable_mem_pattern = pattern
    ort.disable_telemetry_events()
    lock = os.open('/tmp/nexify-birefnet-general-cpu-v1.lock', os.O_RDWR | os.O_NOFOLLOW)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        session = ort.InferenceSession(str(model), sess_options=opts, providers=['CPUExecutionProvider'])
        session.disable_fallback()
        if session.get_providers() != ['CPUExecutionProvider']:
            raise ValueError('unexpected_execution_provider')
        load_seconds = time.monotonic() - started
        begin = time.monotonic()
        logits = session.run(['output_image'], {'input_image': pilot.normalize(source)})[0]
        inference_seconds = time.monotonic() - begin
        mask = pilot.mask_from_logits(logits, source.size)
        result = source.convert('RGBA'); result.putalpha(mask)
        delta = np.abs(np.asarray(mask, dtype=np.int16) - reference_mask)
        print(json.dumps({'profile': profile, 'model_sha256': digest.hexdigest(),
                          'graph_optimization': 'ORT_ENABLE_BASIC', 'cpu_arena': arena,
                          'memory_pattern': pattern, 'threads': 2, 'execution': 'sequential',
                          'provider': session.get_providers(), 'model_loading': 'verified_path',
                          'load_seconds': round(load_seconds, 3),
                          'inference_seconds': round(inference_seconds, 3),
                          'elapsed_seconds': round(time.monotonic() - started, 3),
                          'peak_rss_kib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
                          'alpha_max_abs_delta': int(delta.max()),
                          'alpha_different_pixels': int(np.count_nonzero(delta)),
                          'mask_sha256': hashlib.sha256(mask.tobytes()).hexdigest(),
                          'rgb_unchanged': result.convert('RGB').tobytes() == source.tobytes()}, sort_keys=True))
    finally:
        os.close(lock)


if __name__ == '__main__':
    main()
