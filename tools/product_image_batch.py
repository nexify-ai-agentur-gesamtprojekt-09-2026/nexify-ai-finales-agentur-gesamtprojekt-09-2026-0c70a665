"""Offline, bounded product-image artifacts. No fetch, model, queue or publication.

Pillow is optional for other repository tools, mandatory for this executable.
Only approved existing alpha images can produce derivatives in this version.
"""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import time
import warnings
import zlib

VERSION = 'product-image-batch/1'
HEX = re.compile(r'^[0-9a-f]{64}$')
ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$')
COLOR = re.compile(r'^#[0-9a-f]{6}$')
MANUAL_REVIEWS = [
    'product_identity_color_label_and_complete_contents',
    'alpha_edges_shadows_holes_and_background_contamination',
]
LIMITS = {
    'max_images': 100, 'max_input_bytes': 64 * 1024**2,
    'max_total_input_bytes': 256 * 1024**2, 'max_pixels': 20_000_000,
    'max_total_pixels': 100_000_000, 'max_artifact_bytes': 128 * 1024**2,
    'max_total_artifact_bytes': 1024**3, 'max_working_bytes': 1024**3,
    'max_store_bytes': 2 * 1024**3, 'max_wall_seconds': 3600,
}


class ImageBatchRejected(ValueError):
    """Stable reason code, without untrusted image or path contents."""


def require(ok, reason):
    if not ok:
        raise ImageBatchRejected(reason)


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=True,
                      separators=(',', ':'), allow_nan=False).encode('ascii')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(value):
    return sha(canonical(value))


def _json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'duplicate_json_key')
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=pairs,
                          parse_constant=lambda _: require(False, 'nonfinite_json'))
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise ImageBatchRejected('invalid_json') from exc


def _pillow():
    try:
        from PIL import Image, ImageOps, __version__
    except ImportError as exc:
        raise ImageBatchRejected('pillow_12_3_0_required') from exc
    require(__version__ == '12.3.0', 'unverified_pillow_version')
    return Image, ImageOps, __version__


def validate_policy(policy):
    require(isinstance(policy, dict) and set(policy) == set(LIMITS) | {
        'tenant', 'project', 'ci_colors', 'allowed_ci_colors', 'external_budget_minor',
        'segmenter'}, 'explicit_policy_fields_required')
    for name, cap in LIMITS.items():
        require(type(policy[name]) is int and 0 < policy[name] <= cap, 'invalid_' + name)
    for name in ('tenant', 'project'):
        require(isinstance(policy[name], str) and ID.fullmatch(policy[name]), 'scope_required')
    require(type(policy['external_budget_minor']) is int and policy['external_budget_minor'] == 0,
            'offline_zero_external_budget_required')
    # No arbitrary command, module, model path or URL may become an adapter.
    require(policy['segmenter'] == 'none_verified', 'no_verified_segmentation_adapter')
    for name in ('ci_colors', 'allowed_ci_colors'):
        values = policy[name]
        require(isinstance(values, list) and 1 <= len(values) <= 4
                and all(isinstance(v, str) and COLOR.fullmatch(v) for v in values)
                and len(set(values)) == len(values), 'explicit_ci_color_set_required')
    require(set(policy['ci_colors']) <= set(policy['allowed_ci_colors']), 'ci_color_not_allowed')
    # Color order has no visual meaning, but binding is deterministic.
    return {**policy, 'ci_colors': sorted(policy['ci_colors']),
            'allowed_ci_colors': sorted(policy['allowed_ci_colors'])}


def _binding_issues(item, original_sha256):
    approval = item.get('approval')
    if not isinstance(approval, dict):
        return ['source_binding_missing']
    expected = {'tenant', 'project', 'product_id', 'slot_id', 'source_reference_sha256',
                'original_sha256', 'association', 'association_evidence', 'license',
                'license_evidence', 'color_space'}
    if set(approval) != expected:
        return ['source_binding_fields_required']
    reasons = []
    for name in ('product_id', 'slot_id', 'association_evidence', 'license_evidence'):
        if not isinstance(approval[name], str) or not 0 < len(approval[name]) <= 256:
            reasons.append('invalid_' + name)
    if not isinstance(approval['source_reference_sha256'], str) or not HEX.fullmatch(approval['source_reference_sha256']):
        reasons.append('source_reference_hash_required')
    if approval['original_sha256'] != original_sha256:
        reasons.append('source_byte_binding_mismatch')
    if approval['association'] != 'approved':
        reasons.append('product_image_association_not_approved')
    if approval['license'] != 'approved':
        reasons.append('source_license_not_approved')
    if approval['color_space'] != 'srgb':
        reasons.append('declared_srgb_required')
    return reasons


def _decode(original, policy):
    Image, ImageOps, _ = _pillow()
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(original)) as source:
                require(source.format in ('PNG', 'JPEG', 'WEBP'), 'unsupported_image_format')
                width, height = source.size
                require(width > 0 and height > 0 and width * height <= policy['max_pixels'], 'pixel_limit')
                require(width * height * 128 + len(original) <= policy['max_working_bytes'], 'working_memory_estimate_limit')
                require(getattr(source, 'n_frames', 1) == 1, 'animated_image_not_supported')
                # Unknown profiles cannot silently recolor labels/products or CI backgrounds.
                require(not source.info.get('icc_profile'), 'icc_conversion_not_verified')
                require('gamma' not in source.info and 'chromaticity' not in source.info,
                        'embedded_color_encoding_not_verified')
                orientation = source.getexif().get(274, 1)
                require(type(orientation) is int and 1 <= orientation <= 8, 'invalid_exif_orientation')
                require(source.mode in ('RGB', 'RGBA', 'P', 'LA', 'L'), 'unsupported_color_mode')
                source.load()
                oriented = ImageOps.exif_transpose(source)
                rgba = oriented.convert('RGBA')
                metadata = {'input_format': source.format, 'input_mode': source.mode,
                            'input_size': [width, height], 'output_size': list(rgba.size),
                            'exif_orientation_applied': orientation,
                            'derived_metadata': 'exif_and_icc_removed_declared_srgb',
                            'pixel_transform': 'exif_orientation_only_no_resize_or_crop'}
                alpha = rgba.getchannel('A')
                low, high = alpha.getextrema()
                require(high > 0, 'empty_alpha_foreground')
                require(low < 255, 'opaque_source_requires_verified_segmentation_adapter')
                require(alpha.getbbox() is not None, 'empty_alpha_foreground')
                metadata['alpha_extrema'] = [low, high]
                metadata['foreground_bbox'] = list(alpha.getbbox())
                return rgba, metadata
    except ImageBatchRejected:
        raise
    except (Exception,) as exc:
        # Codec errors, truncated payloads and decompression bombs quarantine.
        # Process exits/interrupts are not swallowed.
        raise ImageBatchRejected('image_decode_failed') from exc


class _BoundedBuffer(io.BytesIO):
    def __init__(self, limit):
        super().__init__()
        self.limit = limit

    def write(self, data):
        require(self.tell() + len(data) <= self.limit, 'artifact_byte_limit')
        return super().write(data)


def _png(image, limit):
    output = _BoundedBuffer(limit)
    image.save(output, format='PNG', compress_level=9, optimize=False)
    raw = output.getvalue()
    require(len(raw) <= limit, 'artifact_byte_limit')
    return raw


def _render(item, policy):
    original = item['original']
    artifacts = {'original.bin': original}
    reasons = _binding_issues(item, sha(original))
    approval = item.get('approval', {})
    if isinstance(approval, dict):
        if approval.get('tenant') != policy['tenant'] or approval.get('project') != policy['project']:
            reasons.append('approval_scope_mismatch')
    metadata = {}
    if not reasons:
        try:
            rgba, metadata = _decode(original, policy)
            Image, _, _ = _pillow()
            limit = policy['max_artifact_bytes']
            artifacts['rgba.png'] = _png(rgba, limit)
            for color in ['#ffffff', *policy['ci_colors']]:
                name = 'white.png' if color == '#ffffff' else 'ci-' + color[1:] + '.png'
                background = Image.new('RGBA', rgba.size, color)
                flat = Image.alpha_composite(background, rgba).convert('RGB')
                artifacts[name] = _png(flat, limit)
            # Read-back proves encodability and exact foreground samples for alpha derivative.
            with Image.open(io.BytesIO(artifacts['rgba.png'])) as check:
                require(check.mode == 'RGBA' and check.size == rgba.size
                        and check.tobytes() == rgba.tobytes(), 'rgba_readback_mismatch')
            metadata['rgba_pixels_sha256'] = sha(rgba.tobytes())
        except ImageBatchRejected as exc:
            reasons.append(str(exc))
            artifacts = {'original.bin': original}
    return artifacts, {'id': item['id'], 'binding': approval,
                       'status': 'quarantined' if reasons else 'review_required',
                       'blocking_reasons': sorted(set(reasons)), 'qa': metadata,
                       'segmentation_performed': False, 'generative_changes': False,
                       'publishable': False, 'manual_review_required': MANUAL_REVIEWS.copy()}


def _safe_directory(path, *, create=False):
    path = Path(os.path.abspath(path))
    # No symlink in any existing ancestor, including a symlinked store itself.
    for parent in [*reversed(path.parents), path]:
        require(not parent.is_symlink(), 'symlink_not_allowed')
    if create:
        path.mkdir(parents=True, exist_ok=True)
    require(path.is_dir(), 'directory_required')
    return path


def _store_size(root):
    size, count = 0, 0
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in dirs + files:
            path = Path(base) / name
            require(not path.is_symlink(), 'symlink_not_allowed')
        for name in files:
            info = (Path(base) / name).stat()
            require(stat.S_ISREG(info.st_mode), 'nonregular_store_file')
            require(info.st_nlink == 1, 'hardlink_not_allowed')
            size += info.st_size
            count += 1
            require(count <= 10000, 'store_file_count_limit')
    return size


def _fsync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


@contextmanager
def _locked(root):
    root = _safe_directory(root, create=True)
    fd = os.open(root / '.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode), 'nonregular_store_file')
        require(info.st_nlink == 1, 'hardlink_not_allowed')
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ImageBatchRejected('store_busy') from exc
        yield root
    finally:
        os.close(fd)


def _read(path, limit):
    require(not path.is_symlink() and path.is_file(), 'artifact_missing_or_unsafe')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode), 'nonregular_store_file')
        require(info.st_nlink == 1, 'hardlink_not_allowed')
        raw = stream.read(limit + 1)
    require(len(raw) <= limit, 'artifact_read_limit')
    return raw


def _write(root, path, raw, store_limit):
    require(not path.is_symlink(), 'symlink_not_allowed')
    tmp = path.with_name(path.name + '.write')
    require(not tmp.is_symlink(), 'symlink_not_allowed')
    transient = tmp.stat().st_size if tmp.exists() else 0
    # Reserve both old and newly written bytes until atomic replacement.
    require(_store_size(root) - transient + len(raw) <= store_limit, 'store_byte_limit')
    if tmp.exists():
        info = tmp.stat()
        require(stat.S_ISREG(info.st_mode), 'nonregular_store_file')
        require(info.st_nlink == 1, 'hardlink_not_allowed')
        # Only this fixed temporary name may be discarded on restart.
        tmp.unlink()
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, 'wb') as stream:
            info = os.fstat(stream.fileno())
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'unsafe_write_file')
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
        _fsync_dir(path.parent)
    except BaseException:
        # Deliberately retain .write files for crash evidence; restart can replace them.
        raise


def _verify_stage(root, key, policy):
    require(isinstance(key, str) and HEX.fullmatch(key), 'invalid_stage_key')
    directory = _safe_directory(root / 'stages' / key)
    raw = _read(directory / 'manifest.json', 256 * 1024)
    record = _json(raw)
    require(isinstance(record, dict) and record.get('stage_key') == key
            and raw == canonical(record), 'stage_manifest_invalid')
    require(set(record) == {'schema_version', 'stage_key', 'input', 'policy', 'engine',
            'id', 'binding', 'status', 'blocking_reasons', 'qa', 'segmentation_performed',
            'generative_changes', 'publishable', 'manual_review_required', 'artifacts'}
            and type(record['schema_version']) is int and record['schema_version'] == 1,
            'stage_schema_invalid')
    require(record['publishable'] is False and record['segmentation_performed'] is False
            and record['generative_changes'] is False
            and record['manual_review_required'] == MANUAL_REVIEWS, 'stage_effect_flags_invalid')
    source = record['input']
    require(isinstance(source, dict) and set(source) == {'id', 'original_sha256', 'approval'}
            and isinstance(source['id'], str) and ID.fullmatch(source['id'])
            and isinstance(source['original_sha256'], str) and HEX.fullmatch(source['original_sha256'])
            and record['id'] == source['id'] and record['binding'] == source['approval']
            and record['policy'] == policy, 'stage_input_binding_invalid')
    reasons = record['blocking_reasons']
    require(isinstance(reasons, list) and len(reasons) <= 64
            and all(isinstance(v, str) and 0 < len(v) <= 128 for v in reasons)
            and reasons == sorted(set(reasons)), 'stage_reasons_invalid')
    require(isinstance(record['qa'], dict), 'stage_qa_invalid')
    artifacts = record.get('artifacts')
    require(record.get('stage_key') == digest({'input': record.get('input'),
            'policy': record.get('policy'), 'engine': record.get('engine')}), 'stage_key_mismatch')
    require(isinstance(artifacts, dict) and 'original.bin' in artifacts
            and set(artifacts) <= {'original.bin', 'rgba.png', 'white.png',
                                  *('ci-' + c[1:] + '.png' for c in policy['ci_colors'])},
            'stage_artifact_set_invalid')
    if record['status'] == 'quarantined':
        require(bool(reasons) and set(artifacts) == {'original.bin'}, 'stage_quarantine_invalid')
    else:
        expected_artifacts = {'original.bin', 'rgba.png', 'white.png', *(
            'ci-' + c[1:] + '.png' for c in policy['ci_colors'] if c != '#ffffff')}
        require(record['status'] == 'review_required' and not reasons
                and set(artifacts) == expected_artifacts, 'stage_review_invalid')
        qa = record['qa']
        require(set(qa) == {'input_format', 'input_mode', 'input_size', 'output_size',
                'exif_orientation_applied', 'derived_metadata', 'pixel_transform',
                'alpha_extrema', 'foreground_bbox', 'rgba_pixels_sha256'}
                and qa['derived_metadata'] == 'exif_and_icc_removed_declared_srgb'
                and qa['pixel_transform'] == 'exif_orientation_only_no_resize_or_crop'
                and isinstance(qa['rgba_pixels_sha256'], str)
                and HEX.fullmatch(qa['rgba_pixels_sha256']), 'stage_qa_invalid')
        require(not _binding_issues({'approval': source['approval']}, source['original_sha256'])
                and source['approval']['tenant'] == policy['tenant']
                and source['approval']['project'] == policy['project'], 'stage_approval_invalid')
    require(isinstance(artifacts['original.bin'], dict)
            and artifacts['original.bin'].get('sha256') == source['original_sha256'], 'original_anchor_mismatch')
    require({p.name for p in directory.iterdir()} == set(artifacts) | {'manifest.json'},
            'stage_directory_changed')
    for name, facts in artifacts.items():
        require(isinstance(facts, dict) and set(facts) == {'sha256', 'bytes'}
                and type(facts['bytes']) is int and 0 < facts['bytes'] <= policy['max_artifact_bytes']
                and isinstance(facts['sha256'], str) and HEX.fullmatch(facts['sha256']), 'artifact_record_invalid')
        raw = _read(directory / name, policy['max_artifact_bytes'])
        require(sha(raw) == facts['sha256'] and len(raw) == facts['bytes'], 'artifact_hash_mismatch')
    return record


def _current(root):
    path = root / 'current.json'
    if not path.exists() and not path.is_symlink():
        return None
    raw = _read(path, 256 * 1024)
    value = _json(raw)
    require(isinstance(value, dict) and set(value) == {'batch_key', 'result_sha256', 'previous'}
            and isinstance(value['batch_key'], str) and HEX.fullmatch(value['batch_key'])
            and isinstance(value['result_sha256'], str) and HEX.fullmatch(value['result_sha256'])
            and raw == canonical(value), 'current_pointer_invalid')
    return value


def current_token(store):
    """Read-only CAS token for run/rollback; None means no local selection."""
    with _locked(store) as root:
        current = _current(root)
        return digest(current) if current is not None else None


def _verify_result(root, key, policy):
    directory = _safe_directory(root / 'batches' / key)
    raw = _read(directory / 'result.json', 1024 * 1024)
    result = _json(raw)
    require(isinstance(result, dict) and result.get('batch_key') == key
            and result.get('policy') == policy and canonical(result) == raw, 'result_binding_mismatch')
    require(set(result) == {'schema_version', 'batch_key', 'policy', 'engine', 'stages',
            'status', 'publishable', 'network_calls', 'model_calls', 'external_spend_minor',
            'artifact_bytes', 'successful_alpha_pixels', 'header_pixels'}
            and type(result['schema_version']) is int and result['schema_version'] == 1,
            'result_schema_invalid')
    require(result['publishable'] is False
            and all(type(result[k]) is int and result[k] == 0
                    for k in ('network_calls', 'model_calls', 'external_spend_minor')),
            'result_effect_flags_invalid')
    require(isinstance(result['stages'], list) and 0 < len(result['stages']) <= policy['max_images'],
            'result_stage_set_invalid')
    inputs, artifact_bytes, alpha_pixels = [], 0, 0
    for entry in result['stages']:
        require(isinstance(entry, dict) and set(entry) == {'id', 'stage_key', 'manifest_sha256', 'status'},
                'result_entry_invalid')
        record = _verify_stage(root, entry['stage_key'], policy)
        require(digest(record) == entry['manifest_sha256'], 'stage_manifest_hash_mismatch')
        require(record['id'] == entry['id'] and record['status'] == entry['status']
                and record['engine'] == result['engine'], 'result_stage_binding_invalid')
        inputs.append(record['input'])
        artifact_bytes += sum(v['bytes'] for v in record['artifacts'].values())
        size = record.get('qa', {}).get('input_size', [0, 0])
        require(isinstance(size, list) and len(size) == 2
                and all(type(v) is int and v >= 0 for v in size), 'stage_qa_size_invalid')
        alpha_pixels += size[0] * size[1]
    require(inputs == sorted(inputs, key=lambda v: v['id'])
            and len({v['id'] for v in inputs}) == len(inputs)
            and digest({'inputs': inputs, 'policy': policy, 'engine': result['engine']}) == key,
            'result_input_set_invalid')
    status = 'quarantined' if any(e['status'] == 'quarantined' for e in result['stages']) else 'review_required'
    require(result['status'] == status, 'result_status_invalid')
    require(type(result['artifact_bytes']) is int and result['artifact_bytes'] == artifact_bytes
            and artifact_bytes <= policy['max_total_artifact_bytes']
            and type(result['successful_alpha_pixels']) is int
            and result['successful_alpha_pixels'] == alpha_pixels
            and type(result['header_pixels']) is int
            and alpha_pixels <= result['header_pixels'] <= policy['max_total_pixels'],
            'result_resource_counts_invalid')
    return result, sha(raw)


def run_batch(items, *, policy, store, expected_current):
    """Create immutable local drafts and CAS-select the completed batch.

    Inputs are bytes (never URLs). Approval is caller evidence, not verified
    here against a supplier license registry. All outputs still require review.
    """
    started = time.monotonic()
    policy = validate_policy(policy)
    _, _, pillow_version = _pillow()
    require(isinstance(items, list) and 0 < len(items) <= policy['max_images'], 'image_count_limit')
    require(expected_current is None or isinstance(expected_current, str)
            and HEX.fullmatch(expected_current), 'invalid_current_token')
    descriptors, indexed, total_input = [], {}, 0
    header_pixels, largest_pixels = 0, 0
    for item in items:
        require(isinstance(item, dict) and set(item) == {'id', 'original', 'approval'}
                and isinstance(item['id'], str) and ID.fullmatch(item['id'])
                and isinstance(item['original'], bytes), 'invalid_image_input')
        require(item['id'] not in indexed, 'duplicate_image_id')
        require(0 < len(item['original']) <= min(policy['max_input_bytes'], policy['max_artifact_bytes']),
                'input_byte_limit')
        # Bound untrusted binding metadata before persisting it.
        try:
            approval_raw = canonical(item['approval'])
        except (ValueError, TypeError, RecursionError) as exc:
            raise ImageBatchRejected('invalid_approval_json') from exc
        require(len(approval_raw) <= 8192, 'approval_byte_limit')
        indexed[item['id']] = item
        total_input += len(item['original'])
        # Header-only preflight accounts for opaque/quarantined images too.
        Image, _, _ = _pillow()
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(item['original'])) as header:
                    pixels = header.width * header.height
                    require(0 < pixels <= policy['max_pixels'], 'pixel_limit')
                    header_pixels += pixels
                    largest_pixels = max(largest_pixels, pixels)
        except ImageBatchRejected:
            raise
        except Exception:
            pass  # Bad codecs/headers become quarantined artifacts, never derivatives.
        descriptors.append({'id': item['id'], 'original_sha256': sha(item['original']),
                            'approval': item['approval']})
    require(total_input <= policy['max_total_input_bytes'], 'total_input_byte_limit')
    require(header_pixels <= policy['max_total_pixels'], 'total_pixel_limit')
    require(largest_pixels * 128 + total_input <= policy['max_working_bytes'], 'working_memory_estimate_limit')
    engine = {'version': VERSION, 'pillow': pillow_version, 'zlib': zlib.ZLIB_RUNTIME_VERSION,
              'python': '.'.join(map(str, sys.version_info[:3]))}
    config = {'policy': policy, 'engine': engine}
    descriptors.sort(key=lambda row: row['id'])
    key = digest({'inputs': descriptors, **config})

    def deadline():
        require(time.monotonic() - started <= policy['max_wall_seconds'], 'wall_time_budget_exceeded')

    with _locked(store) as root:
        require(_store_size(root) <= policy['max_store_bytes'], 'store_byte_limit')
        for subdir in ('stages', 'batches'):
            _safe_directory(root / subdir, create=True)
        current = _current(root)
        if current is not None and current['batch_key'] == key:
            result, result_hash = _verify_result(root, key, policy)
            require(result_hash == current['result_sha256'], 'current_result_hash_mismatch')
            return {**result, 'current_token': digest(current)}
        require((digest(current) if current is not None else None) == expected_current, 'current_conflict')
        batch_dir = _safe_directory(root / 'batches' / key, create=True)
        entries, total_artifact, total_pixels = [], 0, 0
        checkpoint_path = batch_dir / 'checkpoint.json'
        completed = []
        if checkpoint_path.exists() or checkpoint_path.is_symlink():
            checkpoint = _json(_read(checkpoint_path, 1024 * 1024))
            require(isinstance(checkpoint, dict) and checkpoint.get('batch_key') == key
                    and isinstance(checkpoint.get('completed'), list)
                    and len(checkpoint['completed']) <= len(descriptors), 'checkpoint_invalid')
            completed = checkpoint['completed']
        for descriptor in descriptors:
            deadline()
            stage_key = digest({'input': descriptor, **config})
            committed = root / 'stages' / stage_key
            if committed.exists() or committed.is_symlink():
                record = _verify_stage(root, stage_key, policy)
            else:
                item = indexed[descriptor['id']]
                artifacts, report = _render(item, policy)
                deadline()
                pending = _safe_directory(root / 'stages' / ('.pending-' + stage_key), create=True)
                record = {'schema_version': 1, 'stage_key': stage_key, 'input': descriptor,
                          **config, **report, 'artifacts': {
                              name: {'sha256': sha(raw), 'bytes': len(raw)}
                              for name, raw in sorted(artifacts.items())}}
                stage_bytes = sum(v['bytes'] for v in record['artifacts'].values())
                require(total_artifact + stage_bytes <= policy['max_total_artifact_bytes'], 'total_artifact_byte_limit')
                for name, raw in artifacts.items():
                    # Existing pending original is never silently overwritten with different bytes.
                    path = pending / name
                    if name == 'original.bin' and path.exists():
                        require(_read(path, policy['max_input_bytes']) == raw, 'pending_original_changed')
                    _write(root, path, raw, policy['max_store_bytes'])
                _write(root, pending / 'manifest.json', canonical(record), policy['max_store_bytes'])
                deadline()
                os.rename(pending, committed)
                _fsync_dir(committed.parent)
                record = _verify_stage(root, stage_key, policy)
            require(record.get('input') == descriptor and record.get('policy') == policy
                    and record.get('engine') == engine, 'stage_binding_mismatch')
            total_artifact += sum(v['bytes'] for v in record['artifacts'].values())
            size = record.get('qa', {}).get('input_size', [0, 0])
            total_pixels += size[0] * size[1]
            require(total_artifact <= policy['max_total_artifact_bytes'], 'total_artifact_byte_limit')
            require(total_pixels <= policy['max_total_pixels'], 'total_pixel_limit')
            entry = {'id': descriptor['id'], 'stage_key': stage_key,
                     'manifest_sha256': digest(record), 'status': record['status']}
            if len(entries) < len(completed):
                require(completed[len(entries)] == entry, 'checkpoint_stage_mismatch')
            entries.append(entry)
            _write(root, batch_dir / 'checkpoint.json', canonical({
                'schema_version': 1, 'batch_key': key, 'completed': entries,
                'checkpoint_is_not_publication': True}), policy['max_store_bytes'])
        result = {'schema_version': 1, 'batch_key': key, **config, 'stages': entries,
                  'status': 'quarantined' if any(e['status'] == 'quarantined' for e in entries) else 'review_required',
                  'publishable': False, 'network_calls': 0, 'model_calls': 0,
                  'external_spend_minor': 0, 'artifact_bytes': total_artifact,
                  'successful_alpha_pixels': total_pixels, 'header_pixels': header_pixels}
        raw = canonical(result)
        deadline()
        if (batch_dir / 'result.json').exists():
            require(_read(batch_dir / 'result.json', 1024 * 1024) == raw, 'result_replay_mismatch')
        else:
            _write(root, batch_dir / 'result.json', raw, policy['max_store_bytes'])
        pointer = {'batch_key': key, 'result_sha256': sha(raw), 'previous': current}
        require(len(canonical(pointer)) <= 256 * 1024, 'rollback_history_limit')
        deadline()
        _write(root, root / 'current.json', canonical(pointer), policy['max_store_bytes'])
        return {**result, 'current_token': digest(pointer)}


def rollback(store, *, expected_current):
    """CAS-restore the previous local draft selection; never delete originals."""
    require(isinstance(expected_current, str) and HEX.fullmatch(expected_current), 'invalid_current_token')
    with _locked(store) as root:
        current = _current(root)
        require(current is not None and digest(current) == expected_current, 'current_conflict')
        result_path = root / 'batches' / current['batch_key'] / 'result.json'
        result = _json(_read(result_path, 1024 * 1024))
        require(isinstance(result, dict) and 'policy' in result, 'rollback_result_invalid')
        policy = validate_policy(result['policy'])
        _, result_hash = _verify_result(root, current['batch_key'], policy)
        require(result_hash == current['result_sha256'], 'current_result_hash_mismatch')
        previous = current['previous']
        if previous is not None:
            require(isinstance(previous, dict) and isinstance(previous.get('batch_key'), str)
                    and HEX.fullmatch(previous['batch_key']), 'rollback_pointer_invalid')
            old = _json(_read(root / 'batches' / previous['batch_key'] / 'result.json', 1024 * 1024))
            require(isinstance(old, dict) and 'policy' in old, 'rollback_result_invalid')
            _, old_hash = _verify_result(root, previous['batch_key'], validate_policy(old['policy']))
            require(old_hash == previous['result_sha256'], 'rollback_result_hash_mismatch')
            _write(root, root / 'current.json', canonical(previous), policy['max_store_bytes'])
        else:
            (root / 'current.json').unlink()
            _fsync_dir(root)
        return {'status': 'rolled_back_local_selection', 'restored_batch_key':
                previous['batch_key'] if previous else None, 'originals_deleted': False,
                'current_token': digest(previous) if previous else None}


def _cli_inputs(manifest, input_root, policy):
    require(isinstance(manifest, dict) and set(manifest) == {'schema_version', 'policy', 'items'}
            and manifest['schema_version'] == 1, 'invalid_input_manifest')
    require(isinstance(manifest['items'], list) and 0 < len(manifest['items']) <= policy['max_images'], 'image_count_limit')
    root = _safe_directory(input_root)
    items, total = [], 0
    for entry in manifest['items']:
        require(isinstance(entry, dict) and set(entry) == {'id', 'relative_path', 'approval'}, 'invalid_input_entry')
        relative = entry['relative_path']
        require(isinstance(relative, str) and 0 < len(relative) <= 1024
                and '\\' not in relative and not Path(relative).is_absolute()
                and all(part not in ('', '.', '..') for part in relative.split('/')), 'unsafe_input_path')
        path = root / relative
        _safe_directory(path.parent)
        raw = _read(path, policy['max_input_bytes'])
        total += len(raw)
        require(total <= policy['max_total_input_bytes'], 'total_input_byte_limit')
        items.append({'id': entry['id'], 'original': raw, 'approval': entry['approval']})
    return items


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('run', 'rollback', 'current'))
    parser.add_argument('--store', required=True)
    parser.add_argument('--manifest')
    parser.add_argument('--input-root')
    parser.add_argument('--expected-current')
    args = parser.parse_args(argv)
    try:
        if args.action == 'current':
            output = {'current_token': current_token(args.store)}
        elif args.action == 'rollback':
            output = rollback(args.store, expected_current=args.expected_current)
        else:
            require(args.manifest is not None and args.input_root is not None, 'manifest_and_input_root_required')
            manifest = _json(_read(Path(args.manifest), 1024 * 1024))
            require(isinstance(manifest, dict), 'invalid_input_manifest')
            policy = validate_policy(manifest.get('policy'))
            output = run_batch(_cli_inputs(manifest, args.input_root, policy), policy=policy,
                               store=args.store, expected_current=args.expected_current)
        print(canonical(output).decode())
        return 0
    except (ImageBatchRejected, OSError) as exc:
        print(canonical({'status': 'blocked', 'reason': str(exc) if isinstance(exc, ImageBatchRejected)
                         else 'local_io_failure'}).decode(), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
