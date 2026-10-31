/* Local official-builder integration test. No deploy, auth, DB or provider calls. */
const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const tooling=process.env.VERCEL_TOOLING_ROOT;
if(!tooling)throw new Error('Set VERCEL_TOOLING_ROOT to an isolated vercel@65.2.0 install; this script never installs or authenticates.');
const {glob,FileBlob}=require(path.join(tooling,'node_modules/@vercel/build-utils'));
const python=require(path.join(tooling,'node_modules/@vercel/python'));
const versions={cli:require(path.join(tooling,'node_modules/vercel/package.json')).version,python:require(path.join(tooling,'node_modules/@vercel/python/package.json')).version};
if(versions.cli!=='65.2.0'||versions.python!=='28.0.1')throw new Error('Reviewed CLI/builder version mismatch');
(async()=>{
 const root=path.resolve(__dirname,'../../..'); process.chdir(root);
 const artifacts=path.join(root,'.local/vercel-bundle-check'); await fs.mkdir(artifacts,{recursive:true,mode:0o700});
 const stage=await fs.mkdtemp(path.join(artifacts,'source-')),work=path.join(stage,'apps/shop-api');
 const rels=cp.execFileSync('git',['ls-files','apps/shop-api'],{encoding:'utf8'}).trim().split('\n').concat(['apps/shop-api/.python-version','apps/shop-api/prepare_vercel.py','apps/shop-api/.gitignore','apps/agent-gateway/bigbuy_get.py']);
 for(const rel of rels){const target=path.join(stage,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(root,rel),target)}
 const cfg=JSON.parse(await fs.readFile('vercel.json','utf8')).services.shop;
 const refs=await glob('**',{cwd:work,ignore:['**/__pycache__/**']}); const files={}; for(const [k,v] of Object.entries(refs))files[k]=new FileBlob({data:await fs.readFile(v.fsPath)});
 const result=await python.build({files,workPath:work,repoRootPath:stage,entrypoint:'vercel_app.py',config:{framework:'fastapi',handlerFunction:'app',functions:cfg.functions,buildCommand:cfg.buildCommand},meta:{isDev:false},service:{name:'shop',type:'web'}});
 const output=result.result.output['_svc/shop/index']; const keys=Object.keys(output.files||{}); const helper='vercel_support/bigbuy_get.py';
 if(keys.some(k=>k.startsWith('/')||k.split('/').includes('..')))throw new Error('Unsafe archive path');
 const report={tool_versions:versions,runtime:output.runtime,handler:output.handler,file_count:keys.length,helper_key:keys.find(k=>k.endsWith('bigbuy_get.py')),required_sources:['vercel_app.py','shop/checkout_api.py','shop/mailer.py','shop/accounts_api.py'].map(k=>({path:k,present:keys.includes(k)})),parent_paths:keys.filter(k=>k.split('/').includes('..')),routes:result.routes};
 if(output.files[helper]){const ref=output.files[helper];report.helper_fs_sha256=crypto.createHash('sha256').update(await fs.readFile(ref.fsPath)).digest('hex')}
 for(const item of report.required_sources)if(!item.present)throw new Error('Required source missing: '+item.path);
 if(report.helper_key!==helper)throw new Error('Canonical helper missing');
 report.source_sha256={};
 for(const [archive,source] of [[helper,'apps/agent-gateway/bigbuy_get.py'],['vercel_app.py','apps/shop-api/vercel_app.py'],['shop/checkout_api.py','apps/shop-api/shop/checkout_api.py'],['shop/mailer.py','apps/shop-api/shop/mailer.py']]){
  const bundled=await fs.readFile(output.files[archive].fsPath); const original=await fs.readFile(path.join(root,source));
  if(!bundled.equals(original))throw new Error('Source bytes differ: '+archive);
  report.source_sha256[archive]=crypto.createHash('sha256').update(bundled).digest('hex');
 }
 await fs.writeFile(path.join(artifacts,'report.json'),JSON.stringify(report,null,2));
 await fs.writeFile(path.join(artifacts,'files.json'),JSON.stringify(keys,null,2));
 await fs.writeFile(path.join(artifacts,'function.zip'),await output.createZip()); console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
