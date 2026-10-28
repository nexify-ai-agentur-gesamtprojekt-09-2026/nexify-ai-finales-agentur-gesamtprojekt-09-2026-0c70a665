import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {lintProject} from '../../../tools/lint.mjs';

test('compiler lint rejects actual control-flow defects in isolated TS sources',async()=>{
 const root=await mkdtemp(join(tmpdir(),'nexify-compiler-lint-'));
 try{
  const config=join(root,'tsconfig.json');await writeFile(config,JSON.stringify({compilerOptions:{types:[],skipLibCheck:true},files:['input.ts']}));
  for(const [text,code]of [['export function f(x:number){switch(x){case 1:x++;case 2:return x;}}',7029],['export function f(){return 1;return 2;}',7027],['unused: while(false) {}',7028]]){
   await writeFile(join(root,'input.ts'),text);assert.ok(lintProject(config).diagnostics.some(d=>d.code===code));
  }
  await writeFile(join(root,'input.ts'),'export function f(){return 1;}');assert.equal(lintProject(config).diagnostics.length,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('public build includes API typecheck and root uses existing NodeNext contract',async()=>{
 const root=new URL('../../../',import.meta.url);
 const pkg=JSON.parse(await readFile(new URL('apps/site/package.json',root),'utf8'));
 assert.ok(pkg.scripts.build.indexOf('tsc --noEmit -p ../../tsconfig.api.json')<pkg.scripts.build.indexOf('vite build'));
 assert.ok(pkg.scripts.build.includes('tsc --noEmit -p ../../tsconfig.api.json'));
 assert.equal(JSON.parse(await readFile(new URL('tsconfig.json',root),'utf8')).extends,'./tsconfig.api.json');
 const result=lintProject(new URL('../../../tsconfig.json',import.meta.url).pathname);
 assert.equal(result.diagnostics.length,0);assert.ok(result.files>0);
});
