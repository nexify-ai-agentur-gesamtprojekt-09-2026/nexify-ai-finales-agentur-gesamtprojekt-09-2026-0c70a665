"""Explicit native runtime probe using a synthetic graph, not BiRefNet weights.

Run with the contract versions of onnx, onnxruntime, numpy and Pillow installed.
This tests actual CPU graph/session/tensor plumbing, not segmentation quality.
"""
import json
import resource
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageDraw
from tools import birefnet_onnx as adapter


def main():
    np, onnx, ort = adapter._runtime()
    ort.disable_telemetry_events()
    helper = onnx.helper
    graph = helper.make_graph(
        [helper.make_node('ReduceMean', [adapter.INPUT_NAME], [adapter.OUTPUT_NAME],
                          axes=[1], keepdims=1)], 'synthetic-only',
        [helper.make_tensor_value_info(adapter.INPUT_NAME, onnx.TensorProto.FLOAT, adapter.INPUT_SHAPE)],
        [helper.make_tensor_value_info(adapter.OUTPUT_NAME, onnx.TensorProto.FLOAT, adapter.OUTPUT_SHAPE)])
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 17)], ir_version=8)
    raw = model.SerializeToString()
    config = {'adapter': adapter.ADAPTER, 'artifact_root': '/tmp/synthetic-only',
              'manifest_file': 'birefnet-export.json', 'manifest_sha256': '0' * 64,
              'expected_model_sha256': adapter.sha(raw), **adapter.CAPS}
    start = time.monotonic()
    adapter._inspect_graph(onnx, raw, config)
    runner = adapter.BiRefNetOnnx.__new__(adapter.BiRefNetOnnx)
    runner.config, runner.np, runner.local_model_calls = config, np, 0
    runner.session = adapter._create_session(ort, raw)
    image = Image.new('RGB', (128, 96), (245, 245, 245))
    ImageDraw.Draw(image).rectangle((38, 17, 90, 82), fill=(40, 80, 125))
    result, metadata = runner.apply(image)
    assert result.size == image.size and result.mode == 'RGBA'
    assert result.convert('RGB').tobytes() == image.tobytes()
    assert result.getchannel('A').getextrema()[0] < result.getchannel('A').getextrema()[1]
    assert runner.local_model_calls == 1
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix='nexify-synthetic-'))
    target.mkdir(parents=True, exist_ok=True)
    image.save(target / 'synthetic-before.png')
    result.save(target / 'synthetic-after.png')
    print(json.dumps({'kind': 'synthetic_graph_not_birefnet', 'provider': runner.session.get_providers(),
                      'input_shape': adapter.INPUT_SHAPE, 'output_shape': adapter.OUTPUT_SHAPE,
                      'synthetic_graph_sha256': adapter.sha(raw), 'local_model_calls': runner.local_model_calls,
                      'alpha_extrema': result.getchannel('A').getextrema(), 'rgb_unchanged': True,
                      'elapsed_seconds': round(time.monotonic()-start, 3), 'output': str(target),
                      'peak_rss_kib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
                      'mask_sha256': metadata['mask_sha256']}, sort_keys=True))


if __name__ == '__main__':
    main()
