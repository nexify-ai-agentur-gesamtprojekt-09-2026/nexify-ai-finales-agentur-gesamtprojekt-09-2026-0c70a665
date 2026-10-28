// Regression for @vercel/node 27.0.0's legacy compiler host (CLI 65.1.0).
// It lacks realpath, unlike tsc. Type-check source only: never initialize Sentry.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const sourcePath=resolve(root,'packages/observability/sentry-server.ts');
const source=readFileSync(sourcePath,'utf8');
const directCore=resolve(root,'node_modules/@sentry/core');

function diagnostics(code,{hideDirectCore=false}={}){
 const configPath=resolve(root,'api/tsconfig.json');
 const input=ts.readConfigFile(configPath,ts.sys.readFile);assert.equal(input.error,undefined);
 const config=ts.parseJsonConfigFileContent(input.config,ts.sys,resolve(root,'api'),{noEmit:false,sourceMap:true},configPath);
 assert.deepEqual(config.errors,[]);
 const hidden=path=>hideDirectCore&&(path===directCore||path.startsWith(directCore+'/'));
 const read=path=>hidden(path)?undefined:path===sourcePath?code:ts.sys.readFile(path);
 const host={
  getScriptFileNames:()=>config.fileNames,
  getScriptVersion:()=> '1',
  getScriptSnapshot:path=>{const text=read(path);return text===undefined?undefined:ts.ScriptSnapshot.fromString(text);},
  readFile:read,
  fileExists:path=>!hidden(path)&&ts.sys.fileExists(path),
  directoryExists:path=>!hidden(path)&&ts.sys.directoryExists(path),
  readDirectory:ts.sys.readDirectory,
  getDirectories:ts.sys.getDirectories,
  getCurrentDirectory:()=>root,
  getCompilationSettings:()=>config.options,
  getDefaultLibFileName:options=>ts.getDefaultLibFilePath(options),
  getNewLine:()=>ts.sys.newLine,
  useCaseSensitiveFileNames:()=>ts.sys.useCaseSensitiveFileNames,
  // Deliberately no realpath: reproduce the deployed builder's default host.
 };
 const service=ts.createLanguageService(host);
 try{return service.getSemanticDiagnostics(sourcePath).concat(service.getSyntacticDiagnostics(sourcePath));}
 finally{service.dispose();}
}

test('default function compiler resolves the explicitly pinned Core types',()=>{
 const manifest=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
 assert.equal(manifest.dependencies['@sentry/core'],manifest.dependencies['@sentry/node']);
 assert.equal(manifest.dependencies['@sentry/core'],'11.9.0');
 assert.deepEqual(diagnostics(source).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')})),[]);
});

test('missing direct Core reproduces the previous dsn diagnostic',()=>{
 const previous=source.replace("import type { ErrorEvent } from '@sentry/core';\n",'').replace('event: ErrorEvent','event');
 const result=diagnostics(previous,{hideDirectCore:true});
 assert.ok(result.some(d=>d.code===2353&&ts.flattenDiagnosticMessageText(d.messageText,' ').includes("'dsn'")));
});

test('function compiler still rejects malformed SDK options',()=>{
 const wrongDsn=source.replace('      dsn,','      dsn: 42,');assert.notEqual(wrongDsn,source);
 assert.ok(diagnostics(wrongDsn).some(d=>d.code===2322));
 const unknown=source.replace('      dsn,','      unknownOption: dsn,');
 assert.ok(diagnostics(unknown).some(d=>d.code===2353));
});

test('type dependency repair preserves the emitted server behavior',()=>{
 // TypeScript 5.9.3 output of main 1ca8eb8f's source, independently checked.
 // Pin bytes instead of requiring that commit object in shallow CI checkouts.
 const previousSha256='fac50e8c454c55fc4615e911f48d8ee884949f396da7969ce63af5a47e852a61';
 const emit=code=>ts.transpileModule(code,{fileName:sourcePath,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 assert.equal(createHash('sha256').update(emit(source)).digest('hex'),previousSha256);
});
