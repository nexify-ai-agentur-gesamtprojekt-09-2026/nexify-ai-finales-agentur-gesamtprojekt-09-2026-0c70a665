import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import config from '../../next.config.ts';

test('Next preview build uses scoped Next output and no public app settings',async()=>{
  const target=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8'));
  assert.equal(target.framework,'nextjs');
  assert.equal(target.buildCommand,'pnpm --filter @nexify/web build');
  assert.equal(target.outputDirectory,'.next');
  assert.match(target.installCommand,/--frozen-lockfile --ignore-scripts/);
  assert.equal(target.rewrites,undefined);
  assert.equal(target.env,undefined);
  assert.equal(target.buildMachine,undefined);
});

test('production and test never forward business API requests to executor loopback',async()=>{
  const old=process.env.NODE_ENV;
  try{
    for(const mode of ['production','test',undefined]){
      if(mode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=mode;
      assert.deepEqual(await config.rewrites(),[]);
    }
    process.env.NODE_ENV='development';
    assert.deepEqual(await config.rewrites(),[{source:'/api/:path*',destination:'http://127.0.0.1:3003/api/:path*'}]);
  }finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});
