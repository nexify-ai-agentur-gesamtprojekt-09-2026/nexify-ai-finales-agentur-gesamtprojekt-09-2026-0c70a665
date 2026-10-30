// Single byte-range support for static preview adapters. No media bytes are changed.
// Multi-range or unknown units are ignored (full response); unsatisfiable ranges return 416.
export function mediaByteRange(header, size) {
  if (!header || !header.startsWith('bytes=') || header.includes(',')) return {status: 200, start: 0, end: size - 1};
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return {status: 416};
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] && match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return {status: 416};
  end = Math.min(end, size - 1);
  return {status: 206, start, end};
}
