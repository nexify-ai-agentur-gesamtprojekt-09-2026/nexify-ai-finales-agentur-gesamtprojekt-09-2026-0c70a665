// Existing TypeScript compiler lint rules; no additional framework or auto-fix.
import ts from 'typescript';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function lintProject(path){
 const source=ts.readConfigFile(path,ts.sys.readFile);
 if(source.error)return {files:0,diagnostics:[source.error]};
 const parsed=ts.parseJsonConfigFileContent(source.config,ts.sys,resolve(path,'..'),{
  noEmit:true,allowUnreachableCode:false,allowUnusedLabels:false,noFallthroughCasesInSwitch:true,
 },path);
 if(parsed.errors.length)return {files:0,diagnostics:parsed.errors};
 if(!parsed.fileNames.length)throw new Error('Lint project contains no source files');
 const program=ts.createProgram(parsed.fileNames,parsed.options);
 return {files:parsed.fileNames.length,diagnostics:ts.getPreEmitDiagnostics(program)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 let failed=false;
 for(const project of ['tsconfig.json','apps/site/tsconfig.json','apps/web/tsconfig.json']){
  const result=lintProject(resolve(project));
  console.log(`${project}: ${result.files} files, ${result.diagnostics.length} diagnostics`);
  if(result.diagnostics.length){failed=true;console.error(ts.formatDiagnosticsWithColorAndContext(result.diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>process.cwd(),getNewLine:()=>"\n"}));}
 }
 process.exitCode=failed?1:0;
}
