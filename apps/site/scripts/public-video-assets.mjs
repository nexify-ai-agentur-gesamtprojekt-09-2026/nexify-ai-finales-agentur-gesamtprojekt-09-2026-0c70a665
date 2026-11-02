import {resolveExplainerReferences} from "./public-explainers.mjs";
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const locales = ['de', 'nl', 'fr'];
const rejectedHero = '76969135f5eee86871a7da2ea09829786f9366ce34cd8bdac9432b6e0c4a9bc4';
const reviewClip = 'b2082a9f55167ddf1b8789a185135ad28968d170bd8b41f689a67d12d5c254a7';
const shaPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const roles = ['pascal', 'nex', 'aifly'];
const approvalKeys = ['character_approval', 'voice_approval', 'content_approval', 'rights_approval', 'audio_visual_approval', 'publication_approval'];
const caps = {max_assets: 200, max_file_bytes: 64 * 1024 ** 2, max_total_bytes: 512 * 1024 ** 2,
  max_receipt_bytes: 65536, max_transcript_bytes: 65536, max_duration_seconds: 1800, max_dimension: 7680};
const fail = code => { throw new Error(`VideoAssets: ${code}`); };
const need = (ok, code) => { if (!ok) fail(code); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys, code) => need(object(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|'), code);
const text = (value, limit = 1024) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const token = value => typeof value === 'string' && idPattern.test(value);
const hash = raw => createHash('sha256').update(raw).digest('hex');
const canonical = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(canonical(v))) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(canonical(value[k]))])) : value);
export const videoAssetBinding = asset => hash(Buffer.from(canonical(Object.fromEntries(Object.entries(asset).filter(([key]) => key !== 'approval')))));

function relative(value) {
  need(typeof value === 'string' && value.length > 0 && value.length <= 1024 && !/[\\\s\x00-\x1f\x7f:]/.test(value) && !value.startsWith('/'), 'unsafe_relative_path');
  const parts = value.split('/');
  need(parts.every(p => !['', '.', '..', '.git', '.ssh', '.aws', '.codex', '.agents'].includes(p) && !/^(?:\.env|credentials|secrets)/i.test(p)), 'unsafe_relative_path');
  return parts;
}
function owned(value, extensions) {
  need(typeof value === 'string' && new RegExp(`^/media/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\\.(?:${extensions})$`).test(value), 'unsafe_public_media_path');
  return value.slice(1);
}
async function regularBytes(root, relativePath, limit) {
  // Linux build runner: each user-controlled directory is opened NOFOLLOW,
  // anchored at a held FD; a renamed/symlinked parent cannot redirect the read.
  const absolute = path.resolve(root);
  let directory = await open('/', constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    for (const part of [...absolute.split('/').filter(Boolean), ...relative(relativePath).slice(0, -1)]) {
      const child = await open(`/proc/self/fd/${directory.fd}/${part}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      await directory.close(); directory = child;
    }
    const parts = relative(relativePath);
    const file = await open(`/proc/self/fd/${directory.fd}/${parts.at(-1)}`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const before = await file.stat({bigint: true});
      need(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(limit), 'file_type_link_or_byte_limit');
      const chunks = []; let total = 0;
      while (true) {
        const buffer = Buffer.alloc(Math.min(65536, limit + 1 - total));
        const {bytesRead} = await file.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        chunks.push(buffer.subarray(0, bytesRead)); total += bytesRead;
        need(total <= limit, 'file_byte_limit');
      }
      const after = await file.stat({bigint: true});
      need(['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs', 'nlink'].every(k => before[k] === after[k]) && BigInt(total) === before.size, 'file_changed_during_read');
      return Buffer.concat(chunks);
    } finally { await file.close(); }
  } finally { await directory.close(); }
}
function utf8(raw, code) {
  let value;
  try { value = new TextDecoder('utf-8', {fatal: true}).decode(raw); } catch { fail(code); }
  need(text(value, raw.length + 1), code);
  return value;
}
function receipt(raw) {
  const source = utf8(raw, 'receipt_utf8'); let value;
  try { value = JSON.parse(source); } catch { fail('receipt_json'); }
  // Receipts are deliberately flat scalars. Decoded key comparison also catches
  // escaped duplicate keys; nested records are not part of this small contract.
  const keys = [...source.matchAll(/"((?:\\.|[^"\\])*)"\s*:/g)].map(match => JSON.parse('"' + match[1] + '"'));
  need(new Set(keys).size === keys.length, 'receipt_duplicate_key');
  exact(value, ['schema_version', 'asset_id', 'asset_version', 'page_id', 'context_id', 'locale', 'binding_sha256', 'audience', 'operator_id', ...approvalKeys], 'receipt_fields');
  return value;
}
function validateBudgets(value) {
  exact(value, Object.keys(caps), 'explicit_budgets_required');
  for (const [key, ceiling] of Object.entries(caps)) need(Number.isSafeInteger(value[key]) && value[key] > 0 && value[key] <= ceiling, 'invalid_budget_' + key);
}
function metadata(asset, page, budgets) {
  exact(asset, ['id', 'version', 'page_id', 'context_id', 'locale', 'title', 'status', 'film_id', 'scene_ids', 'source', 'voices', 'characters', 'video', 'captions', 'transcript', 'poster', 'width', 'height', 'durationSeconds', 'approval'], 'asset_fields');
  need(token(asset.id) && Number.isSafeInteger(asset.version) && asset.version > 0 && asset.page_id === page.page_id
    && asset.context_id === page.context_id && locales.includes(asset.locale) && text(asset.title, 200)
    && asset.status === 'published', 'asset_identity_locale_or_status');
  need(asset.film_id === page.film_id && Array.isArray(asset.scene_ids) && JSON.stringify(asset.scene_ids) === JSON.stringify(page.scene_ids), 'asset_script_binding');
  need(Number.isSafeInteger(asset.width) && asset.width > 0 && asset.width <= budgets.max_dimension
    && Number.isSafeInteger(asset.height) && asset.height > 0 && asset.height <= budgets.max_dimension
    && typeof asset.durationSeconds === 'number' && Number.isFinite(asset.durationSeconds)
    && asset.durationSeconds > 0 && asset.durationSeconds <= budgets.max_duration_seconds, 'asset_dimensions_or_duration');
  need(Array.isArray(asset.voices) && asset.voices.length > 0 && asset.voices.length <= 3
    && Array.isArray(asset.characters) && asset.characters.length === asset.voices.length, 'voice_character_bindings_required');
  const seen = new Set();
  for (const voice of asset.voices) {
    exact(voice, ['role', 'provider', 'voice_id', 'version'], 'voice_fields');
    need(roles.includes(voice.role) && !seen.has(voice.role) && token(voice.provider) && text(voice.voice_id, 128)
      && Number.isSafeInteger(voice.version) && voice.version > 0, 'voice_binding_invalid');
    seen.add(voice.role);
  }
  need(new Set(asset.characters.map(c => c?.id)).size === asset.characters.length
    && asset.characters.every(c => seen.has(c?.id)), 'character_role_binding');
}

export async function prepareVideoAssets(registry, fullSiteMap, {publicRoot, repositoryRoot, explainerPages}) {
  need(typeof publicRoot === 'string' && typeof repositoryRoot === 'string'
    && path.resolve(publicRoot).startsWith(path.resolve(repositoryRoot) + path.sep), 'public_root_must_belong_to_repository');
  exact(registry, ['schema_version', 'state', 'owner', 'source_bundle', 'rejected_visual_references', 'review_only_references', 'budgets', 'films', 'pages', 'modules', 'assets'], 'registry_fields');
  need(registry.schema_version === 1 && ['pending', 'partial', 'ready'].includes(registry.state) && text(registry.owner, 128), 'registry_version_state_or_owner');
  const budgets = registry.budgets;
  if (budgets === null) need(Array.isArray(registry.assets) && registry.assets.length === 0, 'explicit_budgets_required');
  else validateBudgets(budgets);
  need(object(fullSiteMap) && Array.isArray(fullSiteMap.pages) && Array.isArray(fullSiteMap.public_allowlist)
    && fullSiteMap.pages.length > 0 && fullSiteMap.pages.length <= 100, 'full_sitemap_required');
  need(Array.isArray(registry.pages) && registry.pages.length === fullSiteMap.pages.length, 'route_coverage_incomplete');
  need(Array.isArray(registry.assets) && registry.assets.length <= (budgets?.max_assets ?? caps.max_assets), 'asset_count_limit');
  need(Array.isArray(registry.rejected_visual_references) && registry.rejected_visual_references.some(r => r?.sha256 === rejectedHero && r?.status === 'rejected_visual_reference'), 'rejected_character_reference_missing');
  const rejected = new Set([rejectedHero, reviewClip]);
  need(Array.isArray(registry.review_only_references) && registry.review_only_references.some(r => r?.sha256 === reviewClip
    && r?.status === 'review_only_not_approved' && r?.library_file_id === 'libfile_dea4df8814b08191a738c8d6f727ae32'), 'review_clip_reference_missing');
  for (const reference of registry.review_only_references) {
    exact(reference, ['id', 'library_file_id', 'sha256', 'status', 'reason'], 'review_reference_fields');
    need(token(reference.id) && text(reference.library_file_id, 128) && typeof reference.sha256 === 'string'
      && shaPattern.test(reference.sha256) && reference.status === 'review_only_not_approved'
      && text(reference.reason), 'review_reference_invalid');
    rejected.add(reference.sha256);
  }
  for (const reference of registry.rejected_visual_references) {
    exact(reference, ['id', 'path', 'sha256', 'status', 'reason'], 'rejected_reference_fields');
    need(token(reference.id) && typeof reference.sha256 === 'string' && shaPattern.test(reference.sha256)
      && reference.status === 'rejected_visual_reference' && text(reference.reason), 'rejected_reference_invalid');
    relative(reference.path); rejected.add(reference.sha256);
  }
  exact(registry.source_bundle, ['library_file_id', 'archive_sha256', 'plan_sha256', 'status', 'integrity_gaps'], 'source_bundle_fields');
  need(text(registry.source_bundle.library_file_id, 128) && shaPattern.test(registry.source_bundle.archive_sha256)
    && shaPattern.test(registry.source_bundle.plan_sha256) && registry.source_bundle.status === 'preproduction_only'
    && Array.isArray(registry.source_bundle.integrity_gaps) && registry.source_bundle.integrity_gaps.every(v => text(v)), 'source_bundle_invalid');
  need(Array.isArray(registry.films) && registry.films.length > 0 && registry.films.length <= 100, 'film_inventory_required');
  need(fullSiteMap.pages.every(p => object(p) && token(p.id) && typeof p.path === 'string'), 'sitemap_page_shape');
  const sourcePages = new Map(fullSiteMap.pages.map(p => [p.id, p]));
  need(sourcePages.size === fullSiteMap.pages.length, 'sitemap_duplicate');
  const filmIds = new Set(); const films = new Map();
  for (const film of registry.films) {
    exact(film, ['id', 'title', 'locale', 'scope', 'bound_page_id', 'scene_ids', 'speaker_roles', 'status'], 'film_fields');
    need(token(film.id) && !filmIds.has(film.id) && text(film.title, 200) && locales.includes(film.locale)
      && ['public', 'internal'].includes(film.scope) && film.status === 'script_only_no_media'
      && Array.isArray(film.scene_ids) && film.scene_ids.length > 0 && film.scene_ids.every(token)
      && new Set(film.scene_ids).size === film.scene_ids.length
      && Array.isArray(film.speaker_roles) && film.speaker_roles.length > 0
      && film.speaker_roles.every(role => roles.includes(role))
      && new Set(film.speaker_roles).size === film.speaker_roles.length, 'film_inventory_invalid');
    if (film.bound_page_id !== null) need(sourcePages.has(film.bound_page_id)
      && sourcePages.get(film.bound_page_id).access?.visibility === film.scope, 'film_scope_binding');
    filmIds.add(film.id); films.set(film.id, film);
  }
  const allowed = new Set(fullSiteMap.public_allowlist); const seen = new Set(); const contexts = new Set(); const byPage = {}; const byModule = {};
  const publicPages = new Map(); const references = new Map();
  for (const page of registry.pages) {
    exact(page, ['page_id', 'path', 'site_context', 'visibility', 'context_id', 'context_title', 'film_id', 'scene_ids', 'script_module_ids', 'assets', 'status', 'voice_status', 'approval_status', 'gaps', 'owner'], 'page_fields');
    const source = sourcePages.get(page.page_id);
    need(source && !seen.has(page.page_id) && page.path === source.path && page.site_context === source.site_context
      && page.visibility === source.access?.visibility && token(page.context_id) && text(page.context_title, 200)
      && text(page.owner, 128) && !contexts.has(page.context_id), 'page_route_context_binding');
    seen.add(page.page_id); contexts.add(page.context_id);
    need(Array.isArray(page.script_module_ids) && page.script_module_ids.every(token)
      && Array.isArray(page.scene_ids) && page.scene_ids.every(token), 'page_script_fields');
    const film = films.get(page.film_id);
    need(page.film_id === null ? page.scene_ids.length === 0 : film && film.bound_page_id === page.page_id
      && JSON.stringify(film.scene_ids) === JSON.stringify(page.scene_ids), 'page_film_binding');
    exact(page.assets, locales, 'page_locale_set');
    need(Array.isArray(page.gaps) && page.gaps.every(g => text(g)) && text(page.voice_status, 128) && text(page.approval_status, 128), 'page_gap_state');
    const bound = locales.filter(locale => page.assets[locale] !== null);
    need(['pending', 'partial', 'ready'].includes(page.status), 'page_readiness_state');
    const isPublic = page.visibility === 'public' && source.access?.auth_required === false && allowed.has(page.page_id);
    if (isPublic) { byPage[page.page_id] = {}; byModule[page.page_id] = {}; publicPages.set(page.page_id, page); }
    else need(bound.length === 0, 'private_media_requires_separate_authenticated_delivery');
    for (const locale of bound) {
      need(token(page.assets[locale]) && !references.has(page.assets[locale]), 'duplicate_or_invalid_asset_reference');
      references.set(page.assets[locale], {page, locale, kind: 'page'});
    }
  }
  need(Array.isArray(explainerPages) && explainerPages.length === publicPages.size, 'explainer_pages_required');
  explainerPages=resolveExplainerReferences({pages:explainerPages},fullSiteMap.pages).pages;
  const sourceModules = new Map(); const sourceModuleIds = new Set(); const sourcePageIds = new Set();
  for (const page of explainerPages) {
    need(object(page) && publicPages.has(page.page_id) && !sourcePageIds.has(page.page_id)
      && Array.isArray(page.modules) && page.modules.length > 0 && page.modules.length <= 3, 'explainer_public_page_binding');
    sourcePageIds.add(page.page_id);
    for (const module of page.modules) {
      need(object(module) && token(module.id) && !sourceModuleIds.has(module.id)
        && roles.includes(module.speaker) && object(module.title) && locales.every(l => text(module.title[l], 200)), 'explainer_module_source_invalid');
      sourceModuleIds.add(module.id); sourceModules.set(page.page_id + ':' + module.id, module);
    }
    need(JSON.stringify(publicPages.get(page.page_id).script_module_ids) === JSON.stringify(page.modules.map(m => m.id)), 'page_module_inventory_mismatch');
  }
  need(Array.isArray(registry.modules) && registry.modules.length === sourceModules.size, 'module_coverage_incomplete');
  const moduleSeen = new Set(); let moduleReferenceCount = 0;
  for (const module of registry.modules) {
    exact(module, ['page_id', 'module_id', 'context_id', 'context_title', 'film_id', 'scene_ids', 'assets',
      'status', 'voice_status', 'approval_status', 'gaps', 'owner'], 'module_fields');
    const key = module.page_id + ':' + module.module_id;
    const source = sourceModules.get(key);
    need(source && publicPages.has(module.page_id) && !moduleSeen.has(key) && token(module.context_id)
      && module.context_id === 'module-' + module.module_id && !contexts.has(module.context_id) && module.context_title === source.title.de && text(module.owner, 128), 'module_context_binding');
    // The seven route-level draft films are not module-specific productions.
    need(module.film_id === null && Array.isArray(module.scene_ids) && module.scene_ids.length === 0, 'module_route_film_reuse_forbidden');
    exact(module.assets, locales, 'module_locale_set');
    need(Array.isArray(module.gaps) && module.gaps.every(g => text(g)) && text(module.voice_status, 128)
      && text(module.approval_status, 128), 'module_gap_state');
    const bound = locales.filter(locale => module.assets[locale] !== null);
    need(module.status === (bound.length === 0 ? 'pending' : bound.length === 3 ? 'ready' : 'partial'), 'module_readiness_state');
    for (const locale of bound) {
      need(token(module.assets[locale]) && !references.has(module.assets[locale]), 'duplicate_or_invalid_asset_reference');
      references.set(module.assets[locale], {page: module, locale, kind: 'module', speaker: source.speaker});
      moduleReferenceCount++;
    }
    contexts.add(module.context_id); moduleSeen.add(key);
    byModule[module.page_id][module.module_id] = {};
  }
  let declaredRouteLocales = 0;
  for (const page of registry.pages) {
    const modules = registry.modules.filter(module => module.page_id === page.page_id);
    const count = locales.filter(l => page.assets[l] !== null || modules.some(module => module.assets[l] !== null)).length;
    need(page.status === (count === 0 ? 'pending' : count === 3 ? 'ready' : 'partial'), 'page_readiness_state');
    if (publicPages.has(page.page_id)) declaredRouteLocales += count;
  }
  const declaredComplete = moduleReferenceCount === sourceModules.size * locales.length
    && declaredRouteLocales === publicPages.size * locales.length;
  const readiness = references.size === 0 ? 'pending' : declaredComplete ? 'ready' : 'partial';
  need(registry.state === readiness, 'registry_readiness_state');
  const cache = new Map(); let totalBytes = 0;
  async function checked(root, file, limit, isPublic, extensions) {
    exact(file, isPublic ? ['src', 'sha256', 'bytes', 'locale', 'mime'] : ['id', 'version', 'path', 'sha256', 'bytes'], 'file_descriptor_fields');
    need(typeof file.sha256 === 'string' && shaPattern.test(file.sha256) && !rejected.has(file.sha256)
      && Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= limit, 'file_hash_bytes_or_rejected_visual');
    const name = isPublic ? owned(file.src, extensions) : relative(file.path).join('/');
    if (!isPublic) need(token(file.id) && Number.isSafeInteger(file.version) && file.version > 0, 'source_version_required');
    const key = path.resolve(root, name);
    if (!cache.has(key)) {
      need(totalBytes + file.bytes <= budgets.max_total_bytes, 'total_byte_limit');
      const bytes = await regularBytes(root, name, limit);
      need(bytes.length === file.bytes && hash(bytes) === file.sha256, 'actual_file_hash_or_size_mismatch');
      totalBytes += bytes.length; cache.set(key, bytes);
    }
    const bytes = cache.get(key);
    need(bytes.length === file.bytes && hash(bytes) === file.sha256, 'reused_descriptor_mismatch');
    return bytes;
  }
  need(registry.assets.length === 0 || registry.source_bundle.integrity_gaps.length === 0, 'unresolved_source_integrity_gap');
  const assets = new Set(); const publishedHashes = new Map();
  for (const asset of registry.assets) {
    const reference = references.get(asset?.id);
    need(reference && !assets.has(asset.id) && publicPages.has(reference.page.page_id), 'unbound_duplicate_or_private_asset');
    const {page, locale, kind} = reference;
    metadata(asset, page, budgets); need(asset.locale === locale, 'asset_locale_reference_mismatch');
    if (kind === 'module') need(asset.voices.some(voice => voice.role === reference.speaker), 'module_voice_role_binding');
    if (page.film_id !== null) need([...asset.voices.map(v => v.role)].sort().join('|')
      === [...films.get(page.film_id).speaker_roles].sort().join('|'), 'film_voice_role_binding');
    await checked(repositoryRoot, asset.source, budgets.max_file_bytes, false);
    for (const character of asset.characters) await checked(repositoryRoot, character, budgets.max_file_bytes, false);
    for (const [field, extension, mime] of [['video', 'mp4|webm', null], ['captions', 'vtt', 'text/vtt'], ['transcript', 'txt', 'text/plain'], ['poster', 'png|jpg|jpeg|webp', null]]) {
      need(asset[field]?.locale === locale && text(asset[field]?.mime, 64) && (mime === null || asset[field].mime === mime), 'file_locale_or_mime');
      owned(asset[field].src, extension);
    }
    need(asset.video.mime === (asset.video.src.endsWith('.webm') ? 'video/webm' : 'video/mp4'), 'video_mime_mismatch');
    need(asset.poster.mime === (asset.poster.src.endsWith('.png') ? 'image/png' : asset.poster.src.endsWith('.webp') ? 'image/webp' : 'image/jpeg'), 'poster_mime_mismatch');
    const video = await checked(publicRoot, asset.video, budgets.max_file_bytes, true, 'mp4|webm');
    need(asset.video.mime === 'video/webm' ? video.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'))
      : video.length >= 12 && video.toString('ascii', 4, 8) === 'ftyp', 'video_container_signature');
    need(!publishedHashes.has(asset.video.sha256) || publishedHashes.get(asset.video.sha256) === page.context_id, 'identical_video_reused_across_contexts');
    publishedHashes.set(asset.video.sha256, page.context_id);
    const captions = await checked(publicRoot, asset.captions, budgets.max_transcript_bytes, true, 'vtt');
    need(/^WEBVTT(?:[ \t].*)?\r?\n/.test(utf8(captions, 'captions_utf8')), 'captions_webvtt_header');
    const transcriptRaw = await checked(publicRoot, asset.transcript, budgets.max_transcript_bytes, true, 'txt');
    const transcript = utf8(transcriptRaw, 'plain_transcript_required');
    need(!/[<>]/.test(transcript), 'plain_transcript_required');
    const poster = await checked(publicRoot, asset.poster, budgets.max_file_bytes, true, 'png|jpg|jpeg|webp');
    need(asset.poster.mime === 'image/png' ? poster.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : asset.poster.mime === 'image/jpeg' ? poster[0] === 255 && poster[1] === 216
        : poster.toString('ascii', 0, 4) === 'RIFF' && poster.toString('ascii', 8, 12) === 'WEBP', 'poster_container_signature');
    exact(asset.approval, ['path', 'sha256'], 'approval_reference_fields');
    need(typeof asset.approval.sha256 === 'string' && shaPattern.test(asset.approval.sha256), 'approval_hash_required');
    const approvalPath = relative(asset.approval.path).join('/');
    const actualApproval = path.resolve(repositoryRoot, approvalPath), publicDirectory = path.resolve(publicRoot);
    need(actualApproval !== publicDirectory && !actualApproval.startsWith(publicDirectory + path.sep), 'approval_receipt_must_remain_private');
    const approvalBytes = await regularBytes(repositoryRoot, approvalPath, budgets.max_receipt_bytes);
    need(totalBytes + approvalBytes.length <= budgets.max_total_bytes && hash(approvalBytes) === asset.approval.sha256, 'approval_hash_or_budget_mismatch');
    totalBytes += approvalBytes.length;
    const approved = receipt(approvalBytes);
    need(approved.schema_version === 1 && approved.asset_id === asset.id && approved.asset_version === asset.version
      && approved.page_id === page.page_id && approved.context_id === page.context_id && approved.locale === locale
      && approved.binding_sha256 === videoAssetBinding(asset) && approved.audience === 'public'
      && token(approved.operator_id) && approvalKeys.every(key => approved[key] === 'approved'), 'approval_scope_or_decision_mismatch');
    const destination = kind === 'module' ? byModule[page.page_id][page.module_id] : byPage[page.page_id];
    destination[locale] = {id: asset.id, version: asset.version, locale, src: asset.video.src, mime: asset.video.mime,
      captionsSrc: asset.captions.src, transcript, title: asset.title, poster: asset.poster.src,
      width: asset.width, height: asset.height, durationSeconds: asset.durationSeconds};
    assets.add(asset.id);
  }
  need(assets.size === references.size, 'missing_bound_asset');
  let routePublished = 0, modulePublished = 0;
  for (const pageId of publicPages.keys()) {
    const modules = Object.values(byModule[pageId]);
    routePublished += locales.filter(locale => byPage[pageId][locale] || modules.some(module => module[locale])).length;
    modulePublished += modules.reduce((sum, module) => sum + Object.keys(module).length, 0);
  }
  const routesComplete = routePublished === publicPages.size * locales.length;
  const modulesComplete = modulePublished === sourceModules.size * locales.length;
  return {byPage, byModule, coverage: {publicPageCount: publicPages.size, publishedLocaleCount: routePublished,
    pendingLocaleCount: publicPages.size * locales.length - routePublished, fullyVideoCovered: routesComplete,
    publicModuleCount: sourceModules.size, publishedModuleLocaleCount: modulePublished,
    pendingModuleLocaleCount: sourceModules.size * locales.length - modulePublished,
    completed: routesComplete && modulesComplete, unresolvedSourceIntegrityGaps: registry.source_bundle.integrity_gaps.length}};
}
