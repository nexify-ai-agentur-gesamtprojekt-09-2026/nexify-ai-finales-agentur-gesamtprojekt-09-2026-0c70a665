"""Bounded local pilot for the separately identified upstream General export.

Only a self-created synthetic fixture is processed. This is not the existing
BiRefNet adapter or a production image pipeline integration.
"""
import hashlib
import json
import resource
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

MODEL_BYTES = 972666916
MODEL_SHA256 = '58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c'


def normalize(image):
    image = image.convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS)
    pixels = np.array(image)
    pixels = pixels / max(np.max(pixels), 1e-6)
    result = np.zeros(pixels.shape)
    for c, (mean, std) in enumerate(zip((.485, .456, .406), (.229, .224, .225))):
        result[:, :, c] = (pixels[:, :, c] - mean) / std
    return np.expand_dims(result.transpose((2, 0, 1)), 0).astype(np.float32)


def mask_from_logits(logits, size):
    if logits.shape != (1, 1, 1024, 1024) or logits.dtype != np.float32 or not np.isfinite(logits).all():
        raise ValueError('invalid_model_output')
    x = logits[:, 0, :, :]
    # Stable sigmoid gives the same mathematical result without overflow.
    z = np.exp(-np.abs(x))
    pred = np.where(x >= 0, 1 / (1 + z), z / (1 + z))
    low, high = np.min(pred), np.max(pred)
    if not np.isfinite(low) or high <= low:
        raise ValueError('degenerate_model_output')
    pred = np.squeeze((pred - low) / (high - low))
    return Image.fromarray((pred * 255).astype('uint8')).resize(size, Image.Resampling.LANCZOS)


def main():
    import onnxruntime as ort
    if len(sys.argv) != 3:
        raise SystemExit('usage: birefnet_rembg_pilot.py MODEL OUTPUT_DIRECTORY')
    path, output = Path(sys.argv[1]), Path(sys.argv[2])
    started = time.monotonic()
    h = hashlib.sha256()
    with path.open('rb') as stream:
        size = 0
        while chunk := stream.read(1024 * 1024):
            size += len(chunk)
            if size > MODEL_BYTES:
                raise ValueError('model_size_mismatch')
            h.update(chunk)
    if size != MODEL_BYTES or h.hexdigest() != MODEL_SHA256:
        raise ValueError('model_identity_mismatch')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    options.enable_mem_pattern = False
    options.enable_cpu_mem_arena = False
    ort.disable_telemetry_events()
    session = ort.InferenceSession(str(path), sess_options=options, providers=['CPUExecutionProvider'])
    session.disable_fallback()
    inputs, outputs = session.get_inputs(), session.get_outputs()
    if (session.get_providers() != ['CPUExecutionProvider'] or len(inputs) != 1 or len(outputs) != 1
        or inputs[0].name != 'input_image' or inputs[0].shape != [1, 3, 1024, 1024]
        or inputs[0].type != 'tensor(float)' or outputs[0].name != 'output_image'
        or outputs[0].shape != [1, 1, 1024, 1024] or outputs[0].type != 'tensor(float)'):
        raise ValueError('model_session_contract_mismatch')
    load_seconds = time.monotonic() - started
    image = Image.new('RGB', (256, 256), (238, 238, 238))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((62, 55, 194, 216), radius=20, fill=(32, 83, 140), outline=(17, 48, 87), width=3)
    draw.rectangle((91, 39, 165, 58), fill=(40, 40, 40))
    draw.rectangle((83, 98, 173, 157), fill=(220, 229, 230))
    infer_start = time.monotonic()
    logits = session.run(['output_image'], {'input_image': normalize(image)})[0]
    infer_seconds = time.monotonic() - infer_start
    mask = mask_from_logits(logits, image.size)
    # Independent direct transcription of the pinned rembg postprocessing.
    with np.errstate(over='ignore'):
        official_pred = 1 / (1 + np.exp(-logits[:, 0, :, :]))
    official_pred = (official_pred - np.min(official_pred)) / (np.max(official_pred) - np.min(official_pred))
    official_mask = Image.fromarray((np.squeeze(official_pred) * 255).astype('uint8')).resize(image.size, Image.Resampling.LANCZOS)
    delta = np.abs(np.asarray(mask, dtype=np.int16) - np.asarray(official_mask, dtype=np.int16))
    rgba = image.convert('RGBA')
    rgba.putalpha(mask)
    output.mkdir(parents=True, exist_ok=True)
    image.save(output / 'before.png')
    rgba.save(output / 'after.png')
    mask.save(output / 'mask.png')
    print(json.dumps({'adapter': 'birefnet-rembg-general-epoch244-pilot-v1',
        'model_sha256': MODEL_SHA256, 'input_shape': inputs[0].shape, 'output_shape': outputs[0].shape,
        'provider': session.get_providers(), 'load_seconds': round(load_seconds, 3),
        'inference_seconds': round(infer_seconds, 3), 'peak_rss_kib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        'alpha_extrema': list(mask.getextrema()), 'mask_sha256': hashlib.sha256(mask.tobytes()).hexdigest(),
        'rembg_reference_max_alpha_delta': int(delta.max()),
        'rembg_reference_different_pixels': int(np.count_nonzero(delta)),
        'rgb_unchanged': rgba.convert('RGB').tobytes() == image.tobytes(), 'fixture': 'synthetic-only'}, sort_keys=True))


if __name__ == '__main__':
    main()
