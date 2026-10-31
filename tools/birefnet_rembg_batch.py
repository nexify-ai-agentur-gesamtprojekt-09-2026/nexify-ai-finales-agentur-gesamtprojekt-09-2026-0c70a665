"""Explicit local General-export adapter. Each inference runs in a bounded child."""
import base64
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import resource
import stat
import subprocess
import sys

from tools import birefnet_rembg_pilot as pilot
from tools.project_skills import directory_fd

ADAPTER = 'birefnet-rembg-general-epoch244-cpu-v1'
MODEL_NAME = 'BiRefNet-general-epoch_244.onnx'
CONTRACT_SHA = hashlib.sha256(ADAPTER.encode()).hexdigest()
RUNTIME = {'numpy': '2.3.5', 'onnx': '1.23.2', 'onnxruntime': '1.31.1'}
FIELDS = {'adapter', 'artifact_root', 'max_session_working_bytes', 'max_tensor_working_bytes',
          'max_input_pixels', 'max_inference_seconds'}
LOCK_PATH = '/tmp/nexify-birefnet-general-cpu-v1.lock'


class SegmentationRejected(ValueError):
    pass


def require(value, code):
    if not value:
        raise SegmentationRejected(code)


def validate_config(config):
    require(isinstance(config, dict) and set(config) == FIELDS and config['adapter'] == ADAPTER,
            'segmenter_config_fields')
    path = config['artifact_root']
    require(isinstance(path, str) and bool(path) and '\\' not in path and '://' not in path
            and '..' not in Path(path).parts, 'invalid_model_artifact_root')
    for key, low, high in [('max_session_working_bytes', 9 * 1024**3, 12 * 1024**3),
                           ('max_tensor_working_bytes', 64 * 1024**2, 512 * 1024**2),
                           ('max_input_pixels', 1, 20_000_000), ('max_inference_seconds', 1, 3600)]:
        require(type(config[key]) is int and low <= config[key] <= high, 'invalid_segmenter_' + key)
    return dict(config)


def binding(config):
    validate_config(config)
    return {'adapter': ADAPTER, 'model_sha256': pilot.MODEL_SHA256,
            'manifest_sha256': CONTRACT_SHA, 'runtime_contract': RUNTIME.copy()}


def _child(config, started_fd):
    import numpy as np
    import onnx
    import onnxruntime as ort
    from PIL import Image, __version__ as pillow_version
    require(np.__version__ == RUNTIME['numpy'] and onnx.__version__ == RUNTIME['onnx']
            and ort.__version__ == RUNTIME['onnxruntime'] and pillow_version == '12.3.0',
            'runtime_version_not_verified')
    resource.setrlimit(resource.RLIMIT_AS, (config['max_session_working_bytes'], config['max_session_working_bytes']))
    lock = os.open(LOCK_PATH, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(lock)
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == os.getuid()
                and not (info.st_mode & 0o077), 'worker_lock_unsafe')
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise SegmentationRejected('worker_busy') from None
        image = Image.open(io.BytesIO(sys.stdin.buffer.read(32 * 1024**2 + 1)))
        image.load()
        require(image.mode == 'RGBA' and image.width * image.height <= config['max_input_pixels'], 'invalid_worker_input')
        directory = directory_fd(config['artifact_root'])
        try:
            fd = os.open(MODEL_NAME, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        finally: os.close(directory)
        try:
            info = os.fstat(fd)
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size == pilot.MODEL_BYTES,
                    'model_artifact_unsafe_or_wrong_size')
            with os.fdopen(os.dup(fd), 'rb') as source:
                raw_model = source.read(pilot.MODEL_BYTES + 1)
            require(len(raw_model) == pilot.MODEL_BYTES
                    and hashlib.sha256(raw_model).hexdigest() == pilot.MODEL_SHA256, 'model_hash_mismatch')
            options = ort.SessionOptions()
            options.intra_op_num_threads = 2; options.inter_op_num_threads = 1
            options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
            options.enable_mem_pattern = False; options.enable_cpu_mem_arena = False
            ort.disable_telemetry_events()
            session = ort.InferenceSession(raw_model, sess_options=options,
                                           providers=['CPUExecutionProvider'])
            del raw_model
            session.disable_fallback()
            inputs, outputs = session.get_inputs(), session.get_outputs()
            require(session.get_providers() == ['CPUExecutionProvider'] and len(inputs) == len(outputs) == 1
                    and inputs[0].name == 'input_image' and inputs[0].type == 'tensor(float)'
                    and inputs[0].shape == [1, 3, 1024, 1024] and outputs[0].name == 'output_image'
                    and outputs[0].type == 'tensor(float)' and outputs[0].shape == [1, 1, 1024, 1024],
                    'model_session_contract_mismatch')
            tensor = pilot.normalize(image)
            os.write(started_fd, b'1')
            logits = session.run(['output_image'], {'input_image': tensor})[0]
            mask = pilot.mask_from_logits(logits, image.size)
            old_alpha = np.asarray(image.getchannel('A'), dtype=np.uint8)
            alpha = (old_alpha.astype(np.uint16) * np.asarray(mask, dtype=np.uint8).astype(np.uint16) // 255).astype(np.uint8)
            require(alpha.max() > 0, 'empty_alpha_foreground')
            original_rgb = image.convert('RGB').tobytes()
            image.putalpha(Image.fromarray(alpha))
            output = io.BytesIO(); image.save(output, format='PNG')
            metadata = {**binding(config), 'input_shape': [1, 3, 1024, 1024], 'output_shape': [1, 1, 1024, 1024],
                        'input_name': 'input_image', 'output_name': 'output_image',
                        'mask_sha256': hashlib.sha256(mask.tobytes()).hexdigest(),
                        'input_rgb_sha256': hashlib.sha256(original_rgb).hexdigest(),
                        'input_alpha_sha256': hashlib.sha256(old_alpha.tobytes()).hexdigest(),
                        'output_alpha_sha256': hashlib.sha256(alpha.tobytes()).hexdigest(), 'local_model_calls': 1}
            print(json.dumps({'png': base64.b64encode(output.getvalue()).decode('ascii'), 'metadata': metadata}))
        finally: os.close(fd)
    finally: os.close(lock)


class BiRefNetOnnx:
    def __init__(self, config):
        self.config = validate_config(config)
        self.local_model_calls = 0

    def apply(self, image):
        from PIL import Image
        require(isinstance(image, Image.Image) and image.mode == 'RGBA', 'segmenter_rgba_required')
        require(not image.info.get('icc_profile') and 'gamma' not in image.info
                and 'chromaticity' not in image.info, 'segmenter_color_encoding_unverified')
        require(image.getexif().get(274, 1) == 1, 'segmenter_orientation_must_be_applied')
        pixels = image.width * image.height
        require(0 < pixels <= self.config['max_input_pixels'] and 64 * 1024**2 + pixels * 32
                <= self.config['max_tensor_working_bytes'], 'segmenter_tensor_memory_admission_limit')
        buf = io.BytesIO(); image.save(buf, 'PNG')
        require(buf.tell() <= 32 * 1024**2, 'segmenter_encoded_input_byte_limit')
        env = {k: os.environ[k] for k in ('PATH', 'PYTHONPATH', 'LANG', 'LC_ALL') if k in os.environ}
        read_fd, write_fd = os.pipe()
        process = None
        try:
            try:
                process = subprocess.Popen([sys.executable, '-m', 'tools.birefnet_rembg_batch',
                                            json.dumps(self.config), str(write_fd)], stdin=subprocess.PIPE,
                                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env,
                                           pass_fds=(write_fd,))
            except OSError:
                raise SegmentationRejected('worker_start_failed') from None
            os.close(write_fd); write_fd = -1
            try:
                stdout, _ = process.communicate(buf.getvalue(), timeout=self.config['max_inference_seconds'])
            except subprocess.TimeoutExpired:
                process.kill(); process.communicate()
                raise SegmentationRejected('segmenter_inference_deadline') from None
        finally:
            if write_fd != -1: os.close(write_fd)
            self.local_model_calls += len(os.read(read_fd, 1))
            os.close(read_fd)
        if process.returncode != 0:
            try: reason = json.loads(stdout)['error']
            except (ValueError, KeyError, TypeError): reason = 'worker_failed'
            raise SegmentationRejected(reason)
        try:
            value = json.loads(stdout)
            raw = base64.b64decode(value['png'], validate=True)
            with Image.open(io.BytesIO(raw)) as output:
                output.load(); output = output.copy()
            return output, value['metadata']
        except Exception:
            raise SegmentationRejected('worker_output_invalid') from None


if __name__ == '__main__':
    try:
        _child(validate_config(json.loads(sys.argv[1])), int(sys.argv[2]))
    except Exception as exc:
        reason = str(exc) if isinstance(exc, SegmentationRejected) else 'worker_failed'
        print(json.dumps({'error': reason}))
        raise SystemExit(2)
