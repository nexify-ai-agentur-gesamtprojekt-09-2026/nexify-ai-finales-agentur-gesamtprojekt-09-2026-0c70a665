import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {translations} from '../../web/lib/i18n.ts';

test('UI exports the canonical JSON dictionary with all existing locales and string fields',async()=>{
 const canonical=JSON.parse(await readFile(new URL('../../../config/assistant-interface-copy.json',import.meta.url),'utf8'));
 assert.deepEqual(translations,canonical);
 assert.deepEqual(Object.keys(translations).sort(),['de','en','fr','nl']);
 const keys=Object.keys(translations.de).sort();
 for(const dictionary of Object.values(translations)){
  assert.deepEqual(Object.keys(dictionary).sort(),keys);
  for(const text of Object.values(dictionary))assert.equal(typeof text==='string'&&text.trim().length>0,true);
 }
});
