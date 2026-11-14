import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { INTERNAL_WORKSPACE_SWITCH, internalWorkspaceSurfacesOn } from '../internal-workspace.ts';

// /intern/workspace liefert ohne prüfbare Sitzung keine der drei internen Arbeitsflächen
// (docs/04-betrieb/intern-workspace-schliessen-2026-11-14.md).
const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const pageSource = readFileSync(new URL('../../app/intern/workspace/page.tsx', import.meta.url), 'utf8');

// Je Fläche ein Kennzeichen aus dem Wurzelelement des Bausteins. Die Positivprobe unten belegt, dass die Kennzeichen
// die Flächen wirklich treffen; erst dadurch sagt ihr Fehlen in der Negativprobe etwas aus.
const SURFACES = {
  WorkspaceStatusPanel: 'class="workspace-status public-page"',
  MailWorkspacePanel: 'class="mail-workspace public-page"',
  ProjectFilesPanel: 'data-testid="project-files"',
};
const SHELL = 'data-testid="portal-access-state"';

test('Der Schalter ist standardmäßig aus und nur mit dem genauen Wert an', () => {
  assert.equal(INTERNAL_WORKSPACE_SWITCH, 'NEXIFY_INTERN_WORKSPACE_FLAECHEN');
  assert.equal(internalWorkspaceSurfacesOn({}), false);
  for (const value of ['', '1', 'true', 'on', 'Enabled', 'ENABLED', ' enabled', 'enabled ', 'disabled']) {
    assert.equal(internalWorkspaceSurfacesOn({ [INTERNAL_WORKSPACE_SWITCH]: value }), false, JSON.stringify(value));
  }
  assert.equal(internalWorkspaceSurfacesOn({ [INTERNAL_WORKSPACE_SWITCH]: 'enabled' }), true);
  assert.equal(internalWorkspaceSurfacesOn({ [INTERNAL_WORKSPACE_SWITCH]: 'enabled', VERCEL_ENV: 'preview' }), true);
});

test('In der Vercel-Produktion bleibt der Schalter wirkungslos', () => {
  assert.equal(internalWorkspaceSurfacesOn({ [INTERNAL_WORKSPACE_SWITCH]: 'enabled', VERCEL_ENV: 'production' }), false);
});

test('Die Seite liefert die Flächen nur hinter dem Schalter und sonst die Hülle der geschützten Seiten', () => {
  // Genau eine Stelle rendert die Flächen, und sie steht hinter dem Schalter mit der Laufzeitumgebung.
  assert.match(pageSource, /if\(internalWorkspaceSurfacesOn\(process\.env\)\)return <><WorkspaceStatusPanel\/><MailWorkspacePanel\/><ProjectFilesPanel\/><\/>;/);
  for (const name of Object.keys(SURFACES)) assert.equal(pageSource.split('<' + name).length - 1, 1, name);
  // Kein Cookie, keine Kopfzeile und kein Parameter entscheidet über die Flächen.
  const gate = pageSource.slice(0, pageSource.indexOf('<WorkspaceStatusPanel'));
  assert.doesNotMatch(gate.slice(gate.indexOf('export default')), /cookies|headers|searchParams\)/);
  // Titel, Sperre für Suchmaschinen und Hülle wie in app/[...slug]/page.tsx.
  assert.match(pageSource, /export const metadata=\{title:'Geschützter Bereich',robots:\{index:false,follow:false\}\};/);
  assert.match(pageSource, /export const dynamic='force-dynamic';/);
  assert.match(pageSource, /return <PortalWorkspace sessionPresent=\{\(await cookies\(\)\)\.has\('tk_session'\)\} path="\/intern\/workspace"/);
});

// Probe am gebauten Stand: derselbe Build, drei Starts mit unterschiedlicher Umgebung.
async function withServer(extraEnv, run) {
  const allocator = createServer(); allocator.listen(0, '127.0.0.1'); await once(allocator, 'listening');
  const port = allocator.address().port; await new Promise(resolve => allocator.close(resolve));
  const env = { ...process.env, NODE_ENV: 'production', ...extraEnv };
  for (const key of [INTERNAL_WORKSPACE_SWITCH, 'VERCEL_ENV']) if (!(key in extraEnv)) delete env[key];
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: webRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', chunk => { log += chunk; }); child.stderr.on('data', chunk => { log += chunk; });
  const origin = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; ; attempt++) {
      try { await fetch(origin + '/intern/posteingang'); break; } catch { /* Server startet noch */ }
      if (attempt === 150 || child.exitCode !== null) throw new Error('Next startet nicht: ' + log.slice(-800));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await run(path => fetch(origin + path, { redirect: 'manual' }));
  } finally {
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  }
}
const built = existsSync(webRoot + '.next/BUILD_ID');
const skip = built ? false : 'kein Build unter apps/web/.next; erst `pnpm --filter @nexify/web build`, dann erneut. Ohne diesen Lauf ist die Auslieferung nicht belegt.';
const shown = html => Object.entries(SURFACES).filter(([, marker]) => html.includes(marker)).map(([name]) => name);

test('Auslieferung ohne Anmeldung: keine der drei Flächen, dafür Hülle, Titel, no-store und noindex wie /intern/posteingang', { skip }, async () => {
  await withServer({}, async get => {
    const [workspace, inbox] = await Promise.all([get('/intern/workspace'), get('/intern/posteingang')]);
    const html = await workspace.text(), inboxHtml = await inbox.text();
    assert.deepEqual(shown(html), []);
    assert.equal(workspace.status, inbox.status);
    assert.equal(workspace.status, 200);
    for (const header of ['cache-control', 'x-robots-tag']) assert.equal(workspace.headers.get(header), inbox.headers.get(header), header);
    assert.match(workspace.headers.get('cache-control') || '', /private, no-store/);
    assert.match(workspace.headers.get('x-robots-tag') || '', /noindex/);
    for (const page of [html, inboxHtml]) {
      assert.ok(page.includes(SHELL), 'Hülle');
      assert.ok(page.includes('<title>Geschützter Bereich</title>'), 'Titel');
      assert.match(page, /<meta name="robots" content="noindex, nofollow"\/>/);
    }
    // Auch mit einem beliebigen Cookie dieses Namens und mit Parametern kommt keine Fläche: Der Name allein öffnet nichts.
    for (const response of [await fetch(workspace.url, { headers: { cookie: 'tk_session=irgendetwas' } }), await get('/intern/workspace?ansicht=requests&lang=nl')]) {
      assert.equal(response.status, 200);
      assert.deepEqual(shown(await response.text()), []);
    }
  });
});

test('Positivprobe: mit Schalter liefert derselbe Build alle drei Flächen, die Kennzeichen treffen also', { skip }, async () => {
  await withServer({ [INTERNAL_WORKSPACE_SWITCH]: 'enabled' }, async get => {
    const response = await get('/intern/workspace'), html = await response.text();
    assert.equal(response.status, 200);
    assert.deepEqual(shown(html), Object.keys(SURFACES));
    assert.equal(html.includes(SHELL), false);
    assert.match(response.headers.get('cache-control') || '', /private, no-store/);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  });
});

test('Mit Schalter und VERCEL_ENV=production bleibt es bei der Hülle', { skip }, async () => {
  await withServer({ [INTERNAL_WORKSPACE_SWITCH]: 'enabled', VERCEL_ENV: 'production' }, async get => {
    const html = await (await get('/intern/workspace')).text();
    assert.deepEqual(shown(html), []);
    assert.ok(html.includes(SHELL));
  });
});
