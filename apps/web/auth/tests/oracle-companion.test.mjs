import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {translations} from '../../lib/i18n.ts';

test('chat original is byte-identical to the confirmed user image, not a generated substitute',async()=>{
 const bytes=await readFile(new URL('../../public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'9f705e5b1d1ef8b1024175617c5a18a63fd907eeef6049f9a328a073330f2f66');
 assert.equal(bytes.length,217874);assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),512);
 for(const locale of ['de','nl','fr'])assert.equal(translations[locale].assistant,'AIFly ORACLE');
});
