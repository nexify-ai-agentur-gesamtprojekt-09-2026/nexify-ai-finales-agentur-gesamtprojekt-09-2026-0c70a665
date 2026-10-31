"""Compare two independently generated fixed-shape BiRefNet logit arrays.

This compares bytes supplied by the operator; it does not establish model
provenance, common input, or the validity of the reference implementation.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

SHAPE = (1, 1, 1024, 1024)
MAX_FILE_BYTES = 5 * 1024 * 1024
ATOL = 1e-4
RTOL = 1e-4


def compare(reference, candidate):
    for array in (reference, candidate):
        if not isinstance(array, np.ndarray) or array.shape != SHAPE or array.dtype != np.float32:
            raise ValueError('float32_logit_shape_required')
        if not np.isfinite(array).all():
            raise ValueError('finite_logits_required')
    ref = reference.astype(np.float64)
    diff = np.abs(candidate.astype(np.float64) - ref)
    allowed = ATOL + RTOL * np.abs(ref)
    return {'passed': bool(np.all(diff <= allowed)), 'atol': ATOL, 'rtol': RTOL,
            'max_abs_error': float(np.max(diff)),
            'mean_abs_error': float(np.mean(diff)),
            'outside_tolerance': int(np.count_nonzero(diff > allowed)),
            'elements': int(reference.size)}


def read_array(path):
    with Path(path).open('rb') as stream:
        raw = stream.read(MAX_FILE_BYTES + 1)
    if not 0 < len(raw) <= MAX_FILE_BYTES:
        raise ValueError('logit_file_size_limit')
    import io
    array = np.load(io.BytesIO(raw), allow_pickle=False)
    if not isinstance(array, np.ndarray):
        array.close()
        raise ValueError('npy_array_required')
    return array, hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference_npy')
    parser.add_argument('candidate_npy')
    args = parser.parse_args()
    try:
        reference, ref_hash = read_array(args.reference_npy)
        candidate, candidate_hash = read_array(args.candidate_npy)
        result = compare(reference, candidate)
        result.update({'reference_npy_sha256': ref_hash, 'candidate_npy_sha256': candidate_hash,
                       'provenance_and_common_input_verified': False})
        print(json.dumps(result, sort_keys=True, allow_nan=False))
        return 0 if result['passed'] else 1
    except (OSError, ValueError) as exc:
        print(json.dumps({'passed': False, 'error': str(exc)}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
