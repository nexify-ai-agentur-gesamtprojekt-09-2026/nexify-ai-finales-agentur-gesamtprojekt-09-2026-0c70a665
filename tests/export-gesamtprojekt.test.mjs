import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);
const target = 'appgprj_6af2144e2af881918282f28c4b57411a';
const other = 'appgprj_6ae7ad63df2081918a843f996caf9422';
const script = new URL('../scripts/export-gesamtprojekt.mjs', import.meta.url);

async function fixture(manifest) {
  const root = await mkdtemp(join(tmpdir(), 'nexify-target-guard-'));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, '.openai'));
  await copyFile(script, join(root, 'scripts/export-gesamtprojekt.mjs'));
  await writeFile(join(root, 'scripts/sites-output.mjs'), "import {writeFile} from 'node:fs/promises'; await writeFile(new URL('../copied-marker',import.meta.url),'copied');\n");
  if (manifest !== null) await writeFile(join(root, '.openai/hosting.json'), manifest);
  return root;
}
const json = project_id => JSON.stringify({project_id, static:{directory:'dist'}});
for (const [name, manifest, accepted] of [
  ['exact target', json(target), true],
  ['other project', json(other), false],
  ['missing project', JSON.stringify({static:{directory:'dist'}}), false],
  ['wrong output directory', JSON.stringify({project_id:target, static:{directory:'build'}}), false],
  ['malformed manifest', '{', false],
  ['absent manifest', null, false],
]) {
  test(name, async () => {
    const root = await fixture(manifest);
    let ok = true;
    try { await run(process.execPath, [join(root, 'scripts/export-gesamtprojekt.mjs')]); }
    catch (error) { ok = false; assert.match(error.stderr, /Target export refused/); }
    assert.equal(ok, accepted);
    if (accepted) assert.equal(await readFile(join(root, 'copied-marker'), 'utf8'), 'copied');
    else await assert.rejects(access(join(root, 'copied-marker')), {code:'ENOENT'});
  });
}
