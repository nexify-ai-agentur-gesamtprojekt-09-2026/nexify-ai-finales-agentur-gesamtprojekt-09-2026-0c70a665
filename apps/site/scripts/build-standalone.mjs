import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=resolve(root,'dist');
function ownedPath(url){const path=resolve(dist,url.replace(/^\//,''));const rel=relative(dist,path);if(rel==='..'||rel.startsWith('..'+sep))throw new Error('Artifact escapes dist');return path;}
const javascript=(await readdir(resolve(dist,'assets'))).filter(name=>name.endsWith('.js'));
if(!javascript.length)throw new Error('Standalone JavaScript entry missing');
let html=await readFile(resolve(dist,'index.html'),'utf8');
const entry=/<script\b(?=[^>]*type="module")(?=[^>]*src="([^"]+)")[^>]*><\/script>/;
const script=entry.exec(html);if(!script)throw new Error('Missing build entry');
let js=await readFile(ownedPath(script[1]),'utf8');
const stylesheet=/<link\b(?=[^>]*rel="stylesheet")(?=[^>]*href="([^"]+)")[^>]*>/;
const style=stylesheet.exec(html);if(!style)throw new Error('Missing stylesheet');
let css=await readFile(ownedPath(style[1]),'utf8');
for(const [file,mime]of[['portrait.png','image/png'],['signet.svg','image/svg+xml'],['fonts/geist-latin.woff2','font/woff2'],['fonts/geist-mono-latin.woff2','font/woff2']]){
 const data=`data:${mime};base64,${(await readFile(resolve(dist,file))).toString('base64')}`;
 js=js.replaceAll('/'+file,data);css=css.replaceAll('/'+file,data);
}
html=html.replace(style[0],()=>`<style>${css.replace(/<\/style/gi,'\\3c /style')}</style>`);
html=html.replace(script[0],()=>`<script>window.__NEXIFY_STANDALONE_PREVIEW__=true;</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'">');
const target=resolve(root,'standalone');await mkdir(target,{recursive:true});await writeFile(resolve(target,'nexify-preview.html'),html);
console.log(`Standalone preview: ${Buffer.byteLength(html)} bytes; local hash navigation; API disabled`);
