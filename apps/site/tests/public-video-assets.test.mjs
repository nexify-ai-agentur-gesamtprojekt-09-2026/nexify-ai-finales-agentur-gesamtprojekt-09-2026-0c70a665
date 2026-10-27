import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareVideoAssets, videoAssetBinding} from '../scripts/public-video-assets.mjs';

const repository = path.resolve(import.meta.dirname, '../../..');
const registryTemplate = JSON.parse(await readFile(path.join(repository, 'config/page-media-registry.json'), 'utf8'));
const sitemap = JSON.parse(await readFile(path.join(repository, 'config/site-map.json'), 'utf8'));
const explainerPages = JSON.parse(await readFile(path.join(repository, 'config/page-explainers.json'), 'utf8')).pages;
const digest = raw => createHash('sha256').update(raw).digest('hex');
const cloned = value => structuredClone(value);
const syntheticPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tKEAAAAASUVORK5CYII=', 'base64');

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'nexify-video-fixture-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const publicRoot = path.join(root, 'public');
  await mkdir(path.join(publicRoot, 'media'), {recursive: true});
  await mkdir(path.join(root, '.private'), {recursive: true});
  const registry = cloned(registryTemplate);
  // Explicit numeric allowances belong only to these isolated synthetic tests.
  registry.budgets = {max_assets: 8, max_file_bytes: 1024 ** 2, max_total_bytes: 8 * 1024 ** 2,
    max_receipt_bytes: 8192, max_transcript_bytes: 8192, max_duration_seconds: 30, max_dimension: 1024};
  const input = {publicRoot, repositoryRoot: root, explainerPages: cloned(explainerPages)};
  const execute = () => prepareVideoAssets(registry, sitemap, input);
  async function publicFile(name, raw, mime, locale = 'de') {
    const src = '/media/' + name;
    await writeFile(path.join(publicRoot, src.slice(1)), raw);
    return {src, sha256: digest(raw), bytes: raw.length, mime, locale};
  }
  async function privateFile(id, filename, raw) {
    const file = '.private/' + filename;
    await writeFile(path.join(root, file), raw);
    return {id, version: 1, path: file, sha256: digest(raw), bytes: raw.length};
  }
  async function approve(asset) {
    const receipt = {schema_version: 1, asset_id: asset.id, asset_version: asset.version,
      page_id: asset.page_id, context_id: asset.context_id, locale: asset.locale,
      binding_sha256: videoAssetBinding(asset), audience: 'public', operator_id: 'SYNTHETIC_OPERATOR_NOT_AUTHENTICATED',
      character_approval: 'approved', voice_approval: 'approved', content_approval: 'approved',
      rights_approval: 'approved', audio_visual_approval: 'approved', publication_approval: 'approved'};
    const raw = Buffer.from(JSON.stringify(receipt));
    await writeFile(path.join(root, asset.approval.path), raw);
    asset.approval.sha256 = digest(raw);
    return receipt;
  }
  async function addApproved() {
    registry.state = 'partial'; registry.source_bundle.integrity_gaps = [];
    const page = registry.pages.find(p => p.page_id === 'home');
    const video = Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.from('SYNTHETIC_CONTAINER_FIXTURE_NOT_A_PLAYABLE_PRODUCT_FILM')]);
    const asset = {id: 'synthetic-home-de', version: 1, page_id: 'home', context_id: page.context_id,
      locale: 'de', title: 'Synthetischer Testfilm', status: 'published', film_id: page.film_id,
      scene_ids: cloned(page.scene_ids), source: await privateFile('synthetic-source', 'source.webm', video),
      voices: ['pascal', 'nex', 'aifly'].map(role => ({role, provider: 'synthetic-provider', voice_id: 'SYNTHETIC_VOICE_' + role, version: 1})),
      characters: await Promise.all(['pascal', 'nex', 'aifly'].map(role => privateFile(role, role + '.png', syntheticPng))),
      video: await publicFile('synthetic-home-de.webm', video, 'video/webm'),
      captions: await publicFile('synthetic-home-de.vtt', Buffer.from('WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetischer Test.\n'), 'text/vtt'),
      transcript: await publicFile('synthetic-home-de.txt', Buffer.from('Synthetischer Test. Kein real erzeugter Film.'), 'text/plain'),
      poster: await publicFile('synthetic-home-de.png', syntheticPng, 'image/png'),
      width: 16, height: 9, durationSeconds: 1,
      approval: {path: '.private/approval.json', sha256: '0'.repeat(64)}};
    page.assets.de = asset.id; page.status = 'partial';
    registry.assets = [asset]; await approve(asset);
    return asset;
  }
  return {root, publicRoot, registry, input, execute, addApproved, approve, publicFile};
}

test('actual registry covers 46 routes and projects only 36 empty public entries', async () => {
  const output = await prepareVideoAssets(registryTemplate, sitemap, {publicRoot: path.join(repository, 'apps/web/public'), repositoryRoot: repository, explainerPages});
  assert.equal(registryTemplate.pages.length, 46);
  assert.equal(registryTemplate.films.length, 7);
  assert.equal(registryTemplate.films.filter(f => f.bound_page_id !== null).length, 6);
  assert.equal(registryTemplate.films.find(f => f.scope === 'internal').bound_page_id, null);
  assert.equal(Object.keys(output.byPage).length, 36);
  assert.equal(registryTemplate.modules.length, 49);
  assert.equal(Object.values(output.byModule).reduce((sum, modules) => sum + Object.keys(modules).length, 0), 49);
  assert.ok(registryTemplate.modules.every(m => m.film_id === null && m.scene_ids.length === 0));
  assert.ok(Object.values(output.byPage).every(value => Object.keys(value).length === 0));
  assert.deepEqual(output.coverage, {publicPageCount: 36, publishedLocaleCount: 0, pendingLocaleCount: 108,
    fullyVideoCovered: false, publicModuleCount: 49, publishedModuleLocaleCount: 0,
    pendingModuleLocaleCount: 147, completed: false, unresolvedSourceIntegrityGaps: 2});
  const raw = JSON.stringify(output);
  for (const page of sitemap.pages.filter(p => p.access.visibility !== 'public')) {
    assert.equal(raw.includes(page.path), false); assert.equal(Object.hasOwn(output.byPage, page.id), false); assert.equal(Object.hasOwn(output.byModule, page.id), false);
  }
  for (const marker of ['voice_id', 'approval', 'provider', 'operator_id', 'libfile_', '76969135']) assert.equal(raw.includes(marker), false);
});

test('synthetic byte and scoped-receipt fixture produces exactly the safe PublicVideo shape', async t => {
  const f = await fixture(t); await f.addApproved();
  const before = JSON.stringify(f.registry);
  const output = await f.execute(); const video = output.byPage.home.de;
  assert.equal(JSON.stringify(f.registry), before);
  assert.deepEqual(Object.keys(video).sort(), ['id', 'version', 'locale', 'src', 'mime', 'captionsSrc', 'transcript', 'title', 'poster', 'width', 'height', 'durationSeconds'].sort());
  assert.equal(video.version, 1); assert.equal(video.locale, 'de');
  assert.equal(video.transcript, 'Synthetischer Test. Kein real erzeugter Film.');
  assert.equal(output.byPage.home.nl, undefined); assert.equal(output.byPage.home.fr, undefined);
  assert.equal(output.coverage.publishedLocaleCount, 1);
  assert.equal(JSON.stringify(output).includes('SYNTHETIC_VOICE'), false);
  assert.equal(JSON.stringify(output).includes('SYNTHETIC_OPERATOR'), false);
  assert.equal(JSON.stringify(output).includes('.private'), false);
});

test('published status alone and unresolved source-manifest differences never authorize projection', async t => {
  const f = await fixture(t); const a = await f.addApproved();
  f.registry.source_bundle.integrity_gaps = ['unresolved casting manifest mismatch'];
  await assert.rejects(f.execute(), /unresolved_source_integrity_gap/);
  f.registry.source_bundle.integrity_gaps = [];
  a.approval.sha256 = '0'.repeat(64);
  await assert.rejects(f.execute(), /approval_hash_or_budget_mismatch/);
});

test('source, asset, version, voice, characters and script changes invalidate the receipt', async t => {
  for (const change of [a => a.version++, a => a.voices[0].voice_id = 'OTHER_UNAPPROVED_VOICE',
    a => a.characters[0].version++, a => a.title = 'Changed claim']) {
    const f = await fixture(t); const a = await f.addApproved(); change(a);
    await assert.rejects(f.execute(), /approval_scope_or_decision_mismatch/);
  }
  const f = await fixture(t); const a = await f.addApproved(); a.scene_ids = [];
  await assert.rejects(f.execute(), /asset_script_binding/);
  a.scene_ids = cloned(f.registry.pages.find(p => p.page_id === 'home').scene_ids);
  a.voices.pop(); a.characters.pop();
  await assert.rejects(f.execute(), /film_voice_role_binding/);
});

test('receipt decisions and exact page locale context binding must all agree', async t => {
  for (const field of ['page_id', 'locale', 'context_id', 'voice_approval', 'rights_approval', 'audio_visual_approval', 'publication_approval']) {
    const f = await fixture(t); const a = await f.addApproved(); const receipt = await f.approve(a);
    receipt[field] = 'not-approved'; const bytes = Buffer.from(JSON.stringify(receipt));
    await writeFile(path.join(f.root, a.approval.path), bytes); a.approval.sha256 = digest(bytes);
    await assert.rejects(f.execute(), /approval_scope_or_decision_mismatch/);
  }
});

test('private and internal route references and assets cannot enter a public projection', async t => {
  for (const id of ['customer-portal', 'internal-workspace']) {
    const f = await fixture(t); const a = await f.addApproved();
    const page = f.registry.pages.find(p => p.page_id === id);
    page.assets.de = a.id; page.status = 'partial';
    await assert.rejects(f.execute(), /private_media_requires_separate_authenticated_delivery/);
  }
});

test('all media paths and private approval paths reject remote, traversal and public receipts', async t => {
  for (const src of ['https://invalid.example/video.webm', '/media/../private.webm', '/media/%2e%2e/video.webm', '/media/video.webm?token=x', '/media/x\\video.webm']) {
    const f = await fixture(t); const a = await f.addApproved(); a.video.src = src;
    await assert.rejects(f.execute(), /unsafe_public_media_path/);
  }
  const f = await fixture(t); const a = await f.addApproved();
  a.approval.path = 'public/media/approval.json';
  await assert.rejects(f.execute(), /approval_receipt_must_remain_private/);
});

test('actual files, byte sizes, hashes, VTT, transcript and MIME are checked', async t => {
  for (const mutation of ['hash', 'size', 'vtt', 'transcript', 'mime', 'missing']) {
    const f = await fixture(t); const a = await f.addApproved();
    if (mutation === 'hash') a.video.sha256 = 'a'.repeat(64);
    if (mutation === 'size') a.video.bytes++;
    if (mutation === 'vtt') a.captions = await f.publicFile('synthetic-home-de.vtt', Buffer.from('not WEBVTT\n'), 'text/vtt');
    if (mutation === 'transcript') a.transcript = await f.publicFile('synthetic-home-de.txt', Buffer.from('<script>not plain</script>'), 'text/plain');
    if (mutation === 'mime') a.video.mime = 'image/png';
    if (mutation === 'missing') await rm(path.join(f.publicRoot, a.video.src.slice(1)));
    await assert.rejects(f.execute());
  }
});

test('file and parent symlinks and hardlinks fail without reading or altering external files', async t => {
  for (const kind of ['file-link', 'parent-link', 'hardlink']) {
    const f = await fixture(t); const a = await f.addApproved();
    const source = path.join(f.publicRoot, a.video.src.slice(1));
    const outside = path.join(f.root, 'outside'); await mkdir(outside);
    const bytes = await readFile(source); const external = path.join(outside, path.basename(source));
    await writeFile(external, bytes);
    if (kind === 'parent-link') {
      await rm(path.join(f.publicRoot, 'media'), {recursive: true});
      await symlink(outside, path.join(f.publicRoot, 'media'));
    } else {
      await rm(source);
      if (kind === 'file-link') await symlink(external, source); else await link(external, source);
    }
    await assert.rejects(f.execute());
    assert.deepEqual(await readFile(external), bytes);
  }
});

test('known rejected hero bytes cannot be reinstated as source character or poster', async t => {
  for (const field of ['source', 'character', 'poster']) {
    const f = await fixture(t); const a = await f.addApproved();
    const target = field === 'character' ? a.characters[0] : a[field];
    target.sha256 = '76969135f5eee86871a7da2ea09829786f9366ce34cd8bdac9432b6e0c4a9bc4';
    await f.approve(a);
    await assert.rejects(f.execute(), /file_hash_bytes_or_rejected_visual/);
  }
  const f = await fixture(t); f.registry.rejected_visual_references = [];
  await assert.rejects(f.execute(), /rejected_character_reference_missing/);
});

test('missing or nonpositive budgets and nonstring fields fail closed', async t => {
  const f = await fixture(t);
  const original = cloned(f.registry.budgets);
  for (const key of Object.keys(original)) for (const value of [0, false, null, '100', -1]) {
    f.registry.budgets = {...original, [key]: value}; await assert.rejects(f.execute(), /invalid_budget/);
  }
  f.registry.budgets = {...original}; delete f.registry.budgets.max_total_bytes;
  await assert.rejects(f.execute(), /explicit_budgets_required/);
  f.registry.budgets = original;
  const a = await f.addApproved(); a.title = 42;
  await assert.rejects(f.execute(), /asset_identity_locale_or_status/);
});

test('route omissions duplicates wrong context and invented bindings are rejected', async t => {
  const f = await fixture(t);
  const before = cloned(f.registry.pages);
  f.registry.pages.pop(); await assert.rejects(f.execute(), /route_coverage_incomplete/);
  f.registry.pages = cloned(before); f.registry.pages[1] = cloned(f.registry.pages[0]);
  await assert.rejects(f.execute(), /page_route_context_binding/);
  f.registry.pages = cloned(before); f.registry.pages[0].path = '/invented';
  await assert.rejects(f.execute(), /page_route_context_binding/);
  f.registry.pages = cloned(before); f.registry.pages[0].assets.de = 'not-existing'; f.registry.pages[0].status = 'partial'; f.registry.state = 'partial';
  await assert.rejects(f.execute(), /missing_bound_asset/);
});

test('locale mismatch, missing character and receipt duplicate keys are rejected', async t => {
  const f = await fixture(t); const a = await f.addApproved(); a.captions.locale = 'nl';
  await assert.rejects(f.execute(), /file_locale_or_mime/);
  a.captions.locale = 'de'; a.characters = [];
  await assert.rejects(f.execute(), /voice_character_bindings_required/);
  const g = await fixture(t); const b = await g.addApproved();
  const raw = await readFile(path.join(g.root, b.approval.path));
  const duplicate = Buffer.from(raw.toString().replace('{', '{"asset_id":"hidden",'));
  await writeFile(path.join(g.root, b.approval.path), duplicate); b.approval.sha256 = digest(duplicate);
  await assert.rejects(g.execute(), /receipt_duplicate_key/);
});


test('explicit file total receipt transcript dimension and duration budgets constrain approved fixtures', async t => {
  for (const field of ['max_file_bytes', 'max_total_bytes', 'max_receipt_bytes', 'max_transcript_bytes', 'max_dimension']) {
    const f = await fixture(t); await f.addApproved(); f.registry.budgets[field] = 1;
    await assert.rejects(f.execute());
  }
  const f = await fixture(t); const asset = await f.addApproved(); asset.durationSeconds = 301;
  await assert.rejects(f.execute(), /asset_dimensions_or_duration/);
  asset.durationSeconds = 1; f.registry.state = 'ready';
  await assert.rejects(f.execute(), /registry_readiness_state/);
});


test('undeclared budgets permit pending route inventory but never approved asset publication', async t => {
  assert.equal(registryTemplate.budgets, null);
  const f = await fixture(t); f.registry.budgets = null;
  assert.equal((await f.execute()).coverage.publishedLocaleCount, 0);
  await f.addApproved();
  await assert.rejects(f.execute(), /explicit_budgets_required/);
});


test('relabelling and an all-pass synthetic receipt cannot publish the known review clip', async t => {
  const reviewHash = 'b2082a9f55167ddf1b8789a185135ad28968d170bd8b41f689a67d12d5c254a7';
  assert.equal(registryTemplate.review_only_references[0].sha256, reviewHash);
  assert.equal(registryTemplate.review_only_references[0].status, 'review_only_not_approved');
  for (const field of ['source', 'video']) {
    const f = await fixture(t); const asset = await f.addApproved();
    // Hash seam only: synthetic fixture bytes remain unchanged; no real review
    // clip is copied into a public directory or asserted as a final film.
    asset.status = 'published'; asset[field].sha256 = reviewHash;
    await f.approve(asset); // Even a fresh synthetic all-pass receipt is insufficient.
    await assert.rejects(f.execute(), /file_hash_bytes_or_rejected_visual/);
  }
  const f = await fixture(t); const asset = await f.addApproved();
  f.registry.review_only_references[0].status = 'approved'; await f.approve(asset);
  await assert.rejects(f.execute(), /review_clip_reference_missing/);
  f.registry.review_only_references = [];
  await assert.rejects(f.execute(), /review_clip_reference_missing/);
});

async function bindApprovedToModule(f, asset, moduleId = 'home-explain-1') {
  const page = f.registry.pages.find(p => p.page_id === asset.page_id);
  page.assets[asset.locale] = null; page.status = 'partial';
  const module = f.registry.modules.find(m => m.module_id === moduleId);
  module.assets[asset.locale] = asset.id; module.status = 'partial';
  asset.context_id = module.context_id; asset.film_id = null; asset.scene_ids = [];
  await f.approve(asset);
  return module;
}

test('approved module clip projects only to its exact module without route or sibling fallback', async t => {
  const f = await fixture(t); const a = await f.addApproved();
  const module = await bindApprovedToModule(f, a);
  const out = await f.execute();
  assert.deepEqual(out.byPage.home, {});
  assert.equal(out.byModule.home[module.module_id].de.id, a.id);
  assert.deepEqual(out.byModule.home['home-explain-2'], {});
  assert.equal(out.coverage.publishedLocaleCount, 1); // One module is enough for route/locale coverage.
  assert.equal(out.coverage.publishedModuleLocaleCount, 1);
  assert.equal(out.coverage.pendingModuleLocaleCount, 146);
  assert.equal(out.coverage.completed, false);
});

test('missing foreign private duplicate reassigned and wrong-context module records fail closed', async t => {
  for (const mutate of [
    r => r.modules.pop(),
    r => { r.modules[0].module_id = 'foreign-module'; },
    r => { r.modules[0].page_id = 'internal-workspace'; },
    r => { r.modules[1] = cloned(r.modules[0]); },
    r => { r.modules[0].page_id = 'contact'; },
    r => { r.modules[0].context_id = 'module-home-explain-2'; },
    r => { r.modules[0].context_title = 'Unrelated explanation'; },
    r => { r.modules[0].film_id = 'NXV-DE-00'; r.modules[0].scene_ids = cloned(r.films[0].scene_ids); }
  ]) {
    const f = await fixture(t); mutate(f.registry);
    await assert.rejects(f.execute(), /module_coverage_incomplete|module_context_binding|module_route_film_reuse_forbidden/);
  }
});

test('actual explainer source inventory is required and cannot hide omit or add private modules', async t => {
  const f = await fixture(t);
  delete f.input.explainerPages;
  await assert.rejects(f.execute(), /explainer_pages_required/);
  f.input.explainerPages = cloned(explainerPages); f.input.explainerPages[0].page_id = 'internal-workspace';
  await assert.rejects(f.execute(), /explainer_public_page_binding/);
  f.input.explainerPages = cloned(explainerPages); f.input.explainerPages[0].modules.pop();
  await assert.rejects(f.execute(), /page_module_inventory_mismatch/);
  f.input.explainerPages = cloned(explainerPages); f.registry.pages.find(p => p.page_id === 'home').script_module_ids.pop();
  await assert.rejects(f.execute(), /page_module_inventory_mismatch/);
});

test('module status or a different module receipt cannot authorize its own slot', async t => {
  const f = await fixture(t); const a = await f.addApproved();
  const module = await bindApprovedToModule(f, a);
  a.approval.sha256 = '0'.repeat(64);
  await assert.rejects(f.execute(), /approval_hash_or_budget_mismatch/);
  await f.approve(a);
  module.assets.de = null; module.status = 'pending';
  const other = f.registry.modules.find(m => m.module_id === 'home-explain-2');
  other.assets.de = a.id; other.status = 'partial'; a.context_id = other.context_id;
  // The pre-existing receipt still binds the first module context and bytes.
  await assert.rejects(f.execute(), /approval_scope_or_decision_mismatch/);
});

test('complete route-intro locale coverage does not complete outstanding module slots', async t => {
  const f = await fixture(t); const a = await f.addApproved();
  const sourceHome = sitemap.pages.find(p => p.id === 'home');
  const page = f.registry.pages.find(p => p.page_id === 'home');
  f.registry.pages = [page]; f.registry.modules = f.registry.modules.filter(m => m.page_id === 'home');
  f.registry.films = f.registry.films.filter(film => film.bound_page_id === 'home' || film.bound_page_id === null);
  const smallSitemap = {...sitemap, pages: [sourceHome], public_allowlist: ['home']};
  const input = {...f.input, explainerPages: cloned(explainerPages.filter(p => p.page_id === 'home'))};
  for (const locale of ['nl', 'fr']) {
    const copy = cloned(a); copy.id = 'synthetic-home-' + locale; copy.locale = locale;
    for (const field of ['video', 'captions', 'transcript', 'poster']) copy[field].locale = locale;
    copy.approval.path = '.private/approval-' + locale + '.json';
    page.assets[locale] = copy.id; f.registry.assets.push(copy); await f.approve(copy);
  }
  page.status = 'ready'; f.registry.state = 'partial';
  const out = await prepareVideoAssets(f.registry, smallSitemap, input);
  assert.equal(out.coverage.publicPageCount, 1);
  assert.equal(out.coverage.publishedLocaleCount, 3);
  assert.equal(out.coverage.fullyVideoCovered, true);
  assert.equal(out.coverage.pendingModuleLocaleCount, 6);
  assert.equal(out.coverage.completed, false);
});

test('one generic page clip cannot fill an individual module by aliasing identical bytes', async t => {
  const f = await fixture(t); const intro = await f.addApproved();
  const module = f.registry.modules.find(m => m.module_id === 'home-explain-1');
  const copy = cloned(intro); copy.id = 'synthetic-module-alias'; copy.context_id = module.context_id;
  copy.film_id = null; copy.scene_ids = []; copy.approval.path = '.private/module-alias-approval.json';
  module.assets.de = copy.id; module.status = 'partial'; f.registry.assets.push(copy); await f.approve(copy);
  await assert.rejects(f.execute(), /identical_video_reused_across_contexts/);
});
