"""Fixed local CPU BiRefNet export contract. No downloader or remote-code loader.

Native ONNX/ORT and model artifacts are optional and must already be present.
Tests may patch the private runtime seam; that never proves native inference.
"""
import hashlib
import importlib
import json
import math
import os
import stat
import time
from pathlib import Path
from tools.project_skills import directory_fd

ADAPTER = 'birefnet-default-onnx-1024-logits-v1'
MODEL_ID = 'ZhengPeng7/BiRefNet'
MODEL_REVISION = 'e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4'
SOURCE_WEIGHTS_SHA256 = '9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154'
SOURCE_WEIGHTS_BYTES = 444473596
SOURCE_CODE_SHA256 = '208771ae626f653d64128fbf2d6ac9f8e645c5cc5e286258a73ec3322bbfe5ef'
SOURCE_CONFIG_SHA256 = 'e7b8c2a74f6cea6a59553d517f71d47f2c1d90e670a13416af17c25fe2f3dc52'
SOURCE_CARD_SHA256 = 'ceac4a1bb69b807eac5510bff80ff5599f606ef7458bee3b54b68d866e868532'
LICENSE_SHA256 = '92a7089e0915fc32bc40067560b398f1e6a7a5958abd7d04eda393629a5acefb'
EXPORT_FILE = 'birefnet-e2bf8e4-fp32-opset17-lastlogits-1024.onnx'
EXPORT_PROFILE = 'nexify-birefnet-single-last-logits-fp32-opset17-v1'
INPUT_NAME, OUTPUT_NAME = 'input_image', 'mask_logits'
INPUT_SHAPE, OUTPUT_SHAPE = [1, 3, 1024, 1024], [1, 1, 1024, 1024]
RUNTIME = {'numpy': '2.3.5', 'onnx': '1.23.2', 'onnxruntime': '1.31.1'}
CAPS = {'max_model_bytes': 1024**3, 'max_session_working_bytes': 8*1024**3,
        'max_tensor_working_bytes': 512*1024**2, 'max_graph_nodes': 200000,
        'max_input_pixels': 20000000, 'max_inference_seconds': 3600}
TENSOR_RESERVE = 64*1024**2  # admission estimate, never a measured peak-RSS claim


class SegmentationRejected(ValueError):
    pass


def require(value, code):
    if not value: raise SegmentationRejected(code)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def _hex(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def validate_config(config):
    require(isinstance(config, dict) and set(config) == set(CAPS) | {
        'adapter','artifact_root','manifest_file','manifest_sha256','expected_model_sha256'},
        'segmenter_config_fields')
    require(config['adapter'] == ADAPTER and config['manifest_file'] == 'birefnet-export.json',
            'unsupported_segmenter_contract')
    require(isinstance(config['artifact_root'], str) and config['artifact_root']
            and '\\' not in config['artifact_root'] and '://' not in config['artifact_root']
            and '..' not in Path(config['artifact_root']).parts, 'invalid_model_artifact_root')
    require(_hex(config['manifest_sha256']) and _hex(config['expected_model_sha256']), 'model_hash_binding_required')
    for key, cap in CAPS.items():
        require(type(config[key]) is int and 0 < config[key] <= cap, 'invalid_segmenter_'+key)
    require(config['max_tensor_working_bytes'] >= TENSOR_RESERVE, 'tensor_memory_admission_limit')
    return json.loads(json.dumps(config))


def binding(config):
    config = validate_config(config)
    return {'adapter': ADAPTER, 'model_sha256': config['expected_model_sha256'],
            'manifest_sha256': config['manifest_sha256'], 'runtime_contract': RUNTIME.copy()}


def _read(fd, name, limit):
    require('/' not in name and name not in ('', '.', '..'), 'invalid_model_artifact_name')
    try:
        file_fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(file_fd, 'rb') as stream:
            info = os.fstat(stream.fileno())
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size <= limit,
                    'model_artifact_link_type_or_byte_limit')
            raw = stream.read(limit+1)
            require(len(raw) <= limit, 'model_artifact_byte_limit')
            return raw
    except OSError:
        raise SegmentationRejected('model_artifact_missing_or_unsafe') from None


def _manifest(raw, config):
    require(sha(raw) == config['manifest_sha256'], 'model_manifest_hash_mismatch')
    def pairs(items):
        out = {}
        for key, value in items:
            require(key not in out, 'duplicate_model_manifest_key');out[key] = value
        return out
    try: value = json.loads(raw, object_pairs_hook=pairs)
    except (ValueError, UnicodeError): raise SegmentationRejected('invalid_model_manifest') from None
    fixed = {'schema_version': 1, 'adapter': ADAPTER, 'model_id': MODEL_ID,
        'model_revision': MODEL_REVISION, 'source_weights_sha256': SOURCE_WEIGHTS_SHA256,
        'source_weights_bytes': SOURCE_WEIGHTS_BYTES, 'source_code_sha256': SOURCE_CODE_SHA256,
        'source_config_sha256': SOURCE_CONFIG_SHA256, 'source_card_sha256': SOURCE_CARD_SHA256,
        'license_id': 'MIT', 'license_text_sha256': LICENSE_SHA256,
        'export_file': EXPORT_FILE, 'export_sha256': config['expected_model_sha256'],
        'export_profile': EXPORT_PROFILE, 'opset': 17, 'dtype': 'float32',
        'input_name': INPUT_NAME, 'input_shape': INPUT_SHAPE,
        'output_name': OUTPUT_NAME, 'output_shape': OUTPUT_SHAPE,
        'external_data': False, 'runtime_contract': RUNTIME}
    require(isinstance(value, dict) and set(value) == set(fixed) | {
        'export_bytes','exporter_sha256','export_evidence'}, 'model_manifest_fields')
    require(all(type(value[k]) is type(v) and value[k] == v for k,v in fixed.items()),
            'model_source_license_or_export_contract_mismatch')
    require(all(type(d) is int for key in ('input_shape','output_shape') for d in value[key]), 'model_shape_integer_required')
    require(type(value['export_bytes']) is int and 0 < value['export_bytes'] <= config['max_model_bytes']
            and 4*value['export_bytes'] + TENSOR_RESERVE <= config['max_session_working_bytes'],
            'model_session_memory_admission_limit')
    require(_hex(value['exporter_sha256']) and isinstance(value['export_evidence'], str)
            and 0 < len(value['export_evidence'].strip()) <= 1024, 'verified_export_evidence_required')
    return value


def _runtime():
    modules = {}
    # ORT first: absence must be explicit, without downloading or fallback.
    for name in ('onnxruntime', 'onnx', 'numpy'):
        try: modules[name] = importlib.import_module(name)
        except ImportError: raise SegmentationRejected(name+'_not_installed') from None
        require(getattr(modules[name], '__version__', None) == RUNTIME[name], name+'_version_not_verified')
    return modules['numpy'], modules['onnx'], modules['onnxruntime']


def _inspect_graph(onnx, raw, config):
    try:
        model = onnx.load_model_from_string(raw)
        require(model.ir_version == 8 and not model.functions and not model.training_info,
                'unsupported_onnx_ir_functions_or_training')
        require([(o.domain,o.version) for o in model.opset_import] == [('',17)], 'unsupported_onnx_opset')
        graph = model.graph
        require(0 < len(graph.node) <= config['max_graph_nodes'] and not graph.sparse_initializer,
                'onnx_graph_budget_or_sparse_data')
        def tensor(t):
            require(not t.external_data and t.data_location == 0, 'external_tensor_data_forbidden')
            require(t.data_type in (1,2,3,4,5,6,7,9,12,13), 'non_fp32_or_string_weights_forbidden')
        for value in graph.initializer: tensor(value)
        for node in graph.node:
            require(node.domain in ('','ai.onnx') and node.op_type not in ('If','Loop','Scan','Dropout','Multinomial')
                    and not node.op_type.startswith('Random'), 'custom_or_nondeterministic_onnx_operator')
            for attribute in node.attribute:
                require(attribute.type not in (5,10,11,12), 'nested_graph_or_sparse_attribute_forbidden')
                if attribute.type == 4: tensor(attribute.t)
                if attribute.type == 9:
                    for value in attribute.tensors: tensor(value)
        def io(value, name, shape):
            require(value.name == name and value.type.tensor_type.elem_type == onnx.TensorProto.FLOAT,
                    'onnx_io_name_or_type')
            dims = value.type.tensor_type.shape.dim
            require(len(dims) == len(shape) and not any(d.dim_param for d in dims)
                    and [d.dim_value for d in dims] == shape, 'onnx_static_shape_required')
        require(len(graph.input) == len(graph.output) == 1, 'onnx_single_io_required')
        io(graph.input[0], INPUT_NAME, INPUT_SHAPE);io(graph.output[0], OUTPUT_NAME, OUTPUT_SHAPE)
        onnx.checker.check_model(model, full_check=True)
    except SegmentationRejected: raise
    except Exception: raise SegmentationRejected('onnx_graph_validation_failed') from None


def _create_session(ort, raw):
    require('CPUExecutionProvider' in ort.get_available_providers(), 'onnx_cpu_provider_unavailable')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1;options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    options.enable_mem_pattern = False;options.enable_cpu_mem_arena = False;options.enable_profiling = False
    try:
        session = ort.InferenceSession(raw, sess_options=options, providers=['CPUExecutionProvider'])
        session.disable_fallback()
        require(session.get_providers() == ['CPUExecutionProvider'], 'unexpected_onnx_provider')
        for values, name, shape in [(session.get_inputs(),INPUT_NAME,INPUT_SHAPE),
                                     (session.get_outputs(),OUTPUT_NAME,OUTPUT_SHAPE)]:
            require(len(values) == 1 and values[0].name == name and values[0].type == 'tensor(float)'
                    and values[0].shape == shape, 'session_io_contract_mismatch')
        return session
    except SegmentationRejected: raise
    except Exception: raise SegmentationRejected('onnx_session_creation_failed') from None


class BiRefNetOnnx:
    def __init__(self, config):
        began = time.monotonic();self.config = validate_config(config);self.local_model_calls = 0
        try: fd = directory_fd(config['artifact_root'])
        except OSError: raise SegmentationRejected('model_artifact_directory_missing_or_unsafe') from None
        try:
            manifest = _manifest(_read(fd, config['manifest_file'], 65536), config)
            require(sha(_read(fd,'LICENSE.MIT',4096)) == LICENSE_SHA256, 'model_license_text_hash_mismatch')
            np, onnx, ort = _runtime()
            raw = _read(fd, EXPORT_FILE, min(config['max_model_bytes'], manifest['export_bytes']))
            require(len(raw) == manifest['export_bytes'] and sha(raw) == config['expected_model_sha256'], 'onnx_model_hash_mismatch')
        finally: os.close(fd)
        _inspect_graph(onnx,raw,config)
        self.session = _create_session(ort,raw);self.np = np
        require(time.monotonic()-began <= config['max_inference_seconds'], 'onnx_session_load_deadline')

    def apply(self, image):
        from PIL import Image, __version__ as pillow_version
        require(pillow_version == '12.3.0', 'pillow_version_not_verified')
        np = self.np;began = time.monotonic()
        require(isinstance(image, Image.Image) and image.mode in ('RGB','RGBA'), 'segmenter_rgb_or_rgba_required')
        require(not image.info.get('icc_profile') and 'gamma' not in image.info
                and 'chromaticity' not in image.info, 'segmenter_color_encoding_unverified')
        require(image.getexif().get(274,1) == 1, 'segmenter_orientation_must_be_applied')
        pixels = image.width*image.height
        require(0 < pixels <= self.config['max_input_pixels']
                and TENSOR_RESERVE+pixels*32 <= self.config['max_tensor_working_bytes'], 'segmenter_tensor_memory_admission_limit')
        rgba = image.convert('RGBA');rgb = rgba.convert('RGB');rgb_hash = sha(rgb.tobytes())
        old_alpha = np.asarray(rgba.getchannel('A'), dtype=np.uint8)
        resized = rgb.resize((1024,1024),resample=Image.Resampling.BILINEAR)
        tensor = np.asarray(resized,dtype=np.float32)/np.float32(255)
        tensor = (tensor-np.array([0.485,0.456,0.406],dtype=np.float32))/np.array([0.229,0.224,0.225],dtype=np.float32)
        tensor = np.ascontiguousarray(tensor.transpose(2,0,1)[None,...], dtype=np.float32)
        require(list(tensor.shape) == INPUT_SHAPE and np.isfinite(tensor).all(), 'invalid_segmenter_input_tensor')
        require(time.monotonic()-began <= self.config['max_inference_seconds'], 'segmenter_inference_deadline')
        self.local_model_calls += 1
        try: outputs = self.session.run([OUTPUT_NAME], {INPUT_NAME:tensor})
        except Exception: raise SegmentationRejected('onnx_inference_failed') from None
        require(time.monotonic()-began <= self.config['max_inference_seconds'], 'segmenter_inference_deadline')
        require(isinstance(outputs,list) and len(outputs) == 1, 'invalid_segmenter_output_count')
        logits = outputs[0]
        require(type(logits) is np.ndarray and logits.dtype == np.float32
                and list(logits.shape) == OUTPUT_SHAPE and np.isfinite(logits).all(), 'invalid_segmenter_output_tensor')
        x = logits[0,0];z = np.exp(-np.abs(x))
        probability = np.where(x>=0,np.float32(1)/(np.float32(1)+z),z/(np.float32(1)+z))
        mask = Image.fromarray((probability*np.float32(255)).astype(np.uint8)).resize(rgba.size,resample=Image.Resampling.BICUBIC)
        mask_array = np.asarray(mask,dtype=np.uint8)
        require(int(mask_array.max()) > int(mask_array.min()), 'degenerate_segmentation_mask')
        alpha = ((old_alpha.astype(np.uint16)*mask_array.astype(np.uint16))//255).astype(np.uint8)
        require(alpha.max()>0 and np.all(alpha <= old_alpha), 'invalid_combined_alpha')
        rgba.putalpha(Image.fromarray(alpha))
        require(sha(rgba.convert('RGB').tobytes()) == rgb_hash, 'segmenter_changed_product_rgb')
        require(time.monotonic()-began <= self.config['max_inference_seconds'], 'segmenter_postprocess_deadline')
        metadata = {**binding(self.config),'input_shape':INPUT_SHAPE.copy(),'output_shape':OUTPUT_SHAPE.copy(),
                    'input_name':INPUT_NAME,'output_name':OUTPUT_NAME,'mask_sha256':sha(mask.tobytes()),
                    'input_rgb_sha256':rgb_hash,'input_alpha_sha256':sha(old_alpha.tobytes()),
                    'output_alpha_sha256':sha(alpha.tobytes()),'local_model_calls':1}
        return rgba,metadata
