/** Local preparation only. No account, tenant, upload or malware clearance is inferred. */
export const FILE_LIMITS = Object.freeze({ count: 10, perFile: 10 * 1024 * 1024, total: 25 * 1024 * 1024 });
const formats = {
    png: { type: 'image/png', kind: 'image' }, jpg: { type: 'image/jpeg', kind: 'image' }, jpeg: { type: 'image/jpeg', kind: 'image' },
    webp: { type: 'image/webp', kind: 'image' }, pdf: { type: 'application/pdf', kind: 'document' },
    txt: { type: 'text/plain', kind: 'text' }, md: { type: 'text/markdown', kind: 'text' }, json: { type: 'application/json', kind: 'text' },
};
export const FILE_ACCEPT = Object.keys(formats).map(extension => `.${extension}`).join(',');
export function validProjectLabel(value) {
    return value.trim().length > 0 && value.trim().length <= 120 && !/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function validName(value) {
    return value.length > 0 && value.length <= 180 && value.trim() === value && !/[\\/\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function signature(bytes, extension) {
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    if (extension === 'png')
        return bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) && ascii(12, 16) === 'IHDR';
    if (extension === 'jpg' || extension === 'jpeg')
        return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (extension === 'webp')
        return bytes.length >= 16 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    if (extension === 'pdf')
        return ascii(0, 5) === '%PDF-';
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(text))
            return false;
        if (extension === 'json')
            JSON.parse(text);
        return true;
    }
    catch {
        return false;
    }
}
/** All limits are checked before reading; an oversized selection never allocates its payload. */
export async function inspectFiles(selection, existing = [], signal) {
    const abort = () => { if (signal?.aborted)
        throw new DOMException('Aborted', 'AbortError'); };
    abort();
    if (selection.length + existing.length > FILE_LIMITS.count)
        throw new Error('count_limit');
    if (selection.some(file => !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > FILE_LIMITS.perFile))
        throw new Error('file_size_limit');
    if (selection.reduce((sum, file) => sum + file.size, existing.reduce((sum, file) => sum + file.bytes, 0)) > FILE_LIMITS.total)
        throw new Error('total_size_limit');
    const files = [], rejected = [];
    for (const file of selection) {
        abort();
        const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
        const format = Object.hasOwn(formats, extension) ? formats[extension] : undefined;
        if (!validName(file.name) || !format) {
            rejected.push({ name: file.name, reason: 'format_or_name' });
            continue;
        }
        // Some native pickers omit text MIME or report Markdown as text/plain.
        if (file.type && file.type !== format.type && !(extension === 'md' && file.type === 'text/plain')) {
            rejected.push({ name: file.name, reason: 'media_type' });
            continue;
        }
        const payload = await file.arrayBuffer();
        abort();
        if (payload.byteLength !== file.size || !signature(new Uint8Array(payload), extension)) {
            rejected.push({ name: file.name, reason: 'content_format' });
            continue;
        }
        const hash = await crypto.subtle.digest('SHA-256', payload);
        abort();
        const sha256 = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
        const known = [...existing, ...files];
        if (known.some(item => item.sha256 === sha256)) {
            rejected.push({ name: file.name, reason: 'duplicate' });
            continue;
        }
        const versionOf = known.filter(item => item.name.normalize('NFC').toLocaleLowerCase('en') === file.name.normalize('NFC').toLocaleLowerCase('en')).map(item => item.sha256);
        files.push({ name: file.name, bytes: file.size, sha256, kind: format.kind, mediaType: format.type, state: versionOf.length ? 'version_conflict' : 'prepared', ...(versionOf.length ? { versionOf } : {}) });
    }
    return { files, rejected };
}
export function preparationManifest(project, purpose, files) {
    if (!validProjectLabel(project) || !['briefing', 'specification', 'images'].includes(purpose) || !files.length || files.some(file => file.state !== 'prepared'))
        throw new Error('preparation_incomplete');
    return { schema_version: 1, kind: 'local_project_file_preparation', project_label: project.trim(), purpose,
        files: files.map(({ name, bytes, sha256, kind, mediaType, versionOf }) => ({ name, bytes, sha256, kind, media_type: mediaType, ...(versionOf ? { additional_version_of: versionOf } : {}) })),
        transfer: 'not_started', project_authorization: 'not_verified', content_included: false,
        brain: { write: 'not_started', index: 'not_started', exact_readback: 'not_started', content_compare: 'not_started' } };
}
