/** Execute emitted JavaScript over real HTTP, with no TypeScript fallback files. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { mkdtemp, writeFile, readFile, symlink, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from 'ai';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
let output, origin, server, chat, status, compilerOptions;
const originalProbeFlag = process.env.NEXIFY_AI_GATEWAY_CREDITS_PROBE;

before(async () => {
  output = await mkdtemp(join(tmpdir(), 'nexify-emitted-api-'));
  const config = ts.readConfigFile(join(ROOT, 'api/tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, join(ROOT, 'api'));
  compilerOptions = { ...parsed.options, noEmit: false, rootDir: ROOT, outDir: output };
  const program = ts.createProgram(parsed.fileNames, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => ROOT, getCanonicalFileName: value => value, getNewLine: () => '\n',
  }));
  assert.equal(program.emit().emitSkipped, false);
  await writeFile(join(output, 'package.json'), '{"type":"module"}');
  await symlink(join(ROOT, 'node_modules'), join(output, 'node_modules'), 'dir');
  // Disabled local metadata path only. This test never authenticates to Gateway.
  process.env.NEXIFY_AI_GATEWAY_CREDITS_PROBE = 'false';
  chat = (await import(pathToFileURL(join(output, 'api/agent-chat.js')).href)).default;
  status = (await import(pathToFileURL(join(output, 'api/agent-runtime-status.js')).href)).default;
  server = createServer(async (incoming, outgoing) => {
    const abort = new AbortController();
    incoming.on('aborted', () => abort.abort());
    outgoing.on('close', () => { if (!outgoing.writableFinished) abort.abort(); });
    try {
      const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
        method: incoming.method, headers: incoming.headers, signal: abort.signal,
        ...(incoming.method === 'GET' || incoming.method === 'HEAD' ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }),
      });
      const handler = incoming.url.startsWith('/api/agent-runtime-status') ? status : chat;
      const response = await handler.fetch(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), outgoing);
      else outgoing.end();
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(500);
      outgoing.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (output) await rm(output, { recursive: true, force: true });
  if (originalProbeFlag === undefined) delete process.env.NEXIFY_AI_GATEWAY_CREDITS_PROBE;
  else process.env.NEXIFY_AI_GATEWAY_CREDITS_PROBE = originalProbeFlag;
});

const post = (path, body, headers = {}) => fetch(origin + path, { method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const question = i => ({ id: 'client-' + i, trigger: 'submit-message', page_path: '/', locale: 'de',
  messages: [{ id: 'message-' + i, role: 'user', parts: [{ type: 'text', text: 'Welche Leistungen passen zu Websites?' }] }] });

test('Vercel-discovered API tsconfig emits resolvable .js imports and imports without any .ts files', async () => {
  assert.equal(compilerOptions.rewriteRelativeImportExtensions, true);
  for (const entry of ['agent-chat', 'agent-runtime-status']) {
    const emitted = await readFile(join(output, 'api', entry + '.js'), 'utf8');
    assert.doesNotMatch(emitted, /from\s+['"][^'"]+\.ts['"]/);
    assert.match(emitted, /from\s+['"][^'"]+\.js['"]/);
  }
  const sources = [...await readdir(join(output, 'api'), { recursive: true }),
    ...await readdir(join(output, 'packages/agent-runtime'), { recursive: true })];
  assert.equal(sources.some(path => path.endsWith('.ts')), false);
  assert.equal(typeof chat.fetch, 'function'); assert.equal(typeof status.fetch, 'function');
});

test('emitted handlers survive repeated and concurrent real HTTP requests with SDK-valid SSE', async () => {
  for (let i = 0; i < 3; i++) {
    const response = await post('/api/agent-runtime-status', {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.funding_checked, false); assert.equal(body.live_model_enabled, false);
  }
  await Promise.all(Array.from({ length: 12 }, async (_, i) => {
    const response = await post('/api/agent-chat', question(i));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-nexify-agent-mode'), 'public_guided_preview');
    const chunks = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema }).pipeThrough(new TransformStream({
      transform(part, controller) { assert.equal(part.success, true); controller.enqueue(part.value); },
    }));
    let final;
    for await (const message of readUIMessageStream({ stream: chunks, terminateOnError: true })) final = message;
    assert.match(final.parts.find(part => part.type === 'text').text, /ohne Live-KI/);
    assert.deepEqual(final.parts.find(part => part.type === 'data-page').data, { page_id: 'home', path: '/' });
  }));
});

test('emitted HTTP path retains same-origin, empty-body, private-context and byte-limit guards', async () => {
  assert.equal((await post('/api/agent-runtime-status', {}, { Origin: 'https://foreign.invalid' })).status, 403);
  assert.equal((await post('/api/agent-runtime-status', { model: 'override' })).status, 422);
  assert.equal((await post('/api/agent-chat', { ...question('private'), page_path: '/portal/kunde' })).status, 422);
  assert.equal((await post('/api/agent-chat', { ...question('large'), extra: 'x'.repeat(17000) })).status, 413);
});
