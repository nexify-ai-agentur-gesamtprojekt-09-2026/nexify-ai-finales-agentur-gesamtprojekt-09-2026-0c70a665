// The shop hero only shows real catalogue packshots; otherwise the approved film stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=new URL('../../web/components/shop/',import.meta.url);
function load(name,modules){
 const out=ts.transpileModule(readFileSync(new URL(name,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};vm.runInNewContext(out,{module:mod,exports:mod.exports,require(n){if(!(n in modules))throw new Error('Unmocked import '+n);return modules[n];},URL,Number,Array},{filename:name});return mod.exports;
}
const api=load('api.ts',{});
const showcase=load('ProductShowcase.tsx',{react:{useEffect(){},useState:v=>[v,()=>{}]},'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null,Fragment:'f'},'../Router':{SiteLink:()=>null},'./api':api,'./ProductCard':{ProductImage:()=>null,useShopCopy:()=>({t:k=>k})},'./ProductShowcase.css':{}});
const img=n=>'https://cdnbigbuy.com/images/'+n+'.jpg';
const item=(id,extra={})=>({id,name:'Artikel '+id,image:img(id),in_stock:true,...extra});

test('showcase is limited to the TEILEKLAR catalogue pages',()=>{
 for(const id of ['tk-home','tk-shop','tk-categories','tk-category','tk-search'])assert.equal(showcase.hasProductShowcase(id),true,id);
 for(const id of ['tk-cart','tk-checkout','home','tk-workshop'])assert.equal(showcase.hasProductShowcase(id),false,id);
});

test('only available products with a safe supplier image are shown, three to four of them',()=>{
 assert.deepEqual(showcase.selectShowcaseItems([item('a'),item('b'),item('c'),item('d'),item('e')]).map(p=>p.id),['a','b','c','d']);
 const mixed=[item('a'),item('x',{image:null}),item('y',{image:'https://evil.example/x.jpg'}),item('z',{in_stock:false}),item('b'),item('c')];
 assert.deepEqual(showcase.selectShowcaseItems(mixed).map(p=>p.id),['a','b','c']);
});

test('fewer than three real packshots keep the approved fallback instead of a sparse stage',()=>{
 assert.equal(showcase.selectShowcaseItems([item('a'),item('b')]).length,0);
 assert.equal(showcase.selectShowcaseItems(undefined).length,0);
 assert.equal(showcase.selectShowcaseItems([null,{id:'',name:'x',image:img('q')},item('a')]).length,0);
});
