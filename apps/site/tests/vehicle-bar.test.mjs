// Offline render check for the persistent TEILEKLAR vehicle bar: it reads/writes the per-viewer vehicle,
// shows the current selection, and emits the vehicle event without ever calling a fitment catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const componentRoot=new URL('../../web/components/shop/',import.meta.url);
const copy=JSON.parse(readFileSync(new URL('../../../config/shop-interface-copy.json',import.meta.url),'utf8'));
const jsx=(type,props)=>({type,props:props||{}});
const source=name=>readFileSync(new URL(name,componentRoot),'utf8');
function compile(name,modules,globals={}){
 const out=ts.transpileModule(source(name),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(out,{module:mod,exports:mod.exports,require(n){if(!(n in modules))throw new Error('Unmocked import '+n);return modules[n];},Intl,URL,Date,Number,Math,...globals},{filename:name});
 return mod.exports;
}
function hooks(){
 const state=[],effects=[];let cursor=0;
 const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},
  useEffect(effect,deps){const i=cursor++,old=effects[i];if(!old||!deps||deps.some((x,k)=>x!==old.deps[k]))effects[i]={effect,deps,pending:true};}};
 return {react,reset(){cursor=0;},flush(){effects.forEach(e=>{if(e&&e.pending){e.pending=false;e.effect();}});}};
}
function deep(node){if(node==null||typeof node!=='object')return node;if(Array.isArray(node))return node.map(deep);if(typeof node.type==='function')return deep(node.type(node.props));return {type:node.type,props:{...node.props,children:deep(node.props?.children)}};}
function nodes(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.props?.children);}
const byTestId=(tree,id)=>nodes(tree).find(n=>n.props?.['data-testid']===id);

function store(){
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
function env(){
 const events=[];
 const localStorage=store();
 const windowObj={dispatchEvent:e=>{events.push(e);return true;}};
 const CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail;}};
 return {events,localStorage,windowObj,CustomEvent};
}

function mod(h,e,locale='de'){
 const card=compile('ProductCard.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../Router':{SiteLink:'link'},'../Workspace':{useUI:()=>({locale})},'../../../../config/shop-interface-copy.json':copy,'./api':{},'./shop.css':{}},{});
 return compile('VehicleBar.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'./ProductCard':card,'./shop.css':{}},{localStorage:e.localStorage,window:e.windowObj,CustomEvent:e.CustomEvent});
}

// Render once (mount effect runs), then render again so the tree reflects the effect's state. Cursor
// is reset before each render so the stable hook order maps to the same state slots every time.
const render=(h,VehicleBar)=>{h.reset();deep(jsx(VehicleBar,{}));h.flush();h.reset();return deep(jsx(VehicleBar,{}));};

test('opens the form when no vehicle is stored and shows the empty-state label',()=>{
 const h=hooks(),e=env();const VehicleBar=mod(h,e).default;
 const tree=render(h,VehicleBar);
 assert.equal(text(byTestId(tree,'vehicle-current')),copy.de.vehicleNone);
 assert.ok(byTestId(tree,'vehicle-form'),'form open without a stored vehicle');
});

test('saving HSN/TSN stores the vehicle, emits the event and shows it',()=>{
 const h=hooks(),e=env();const VehicleBar=mod(h,e).default;
 let tree=render(h,VehicleBar);
 byTestId(tree,'vehicle-hsn').props.onChange({target:{value:'0603a'}});
 h.reset();tree=deep(jsx(VehicleBar,{}));
 byTestId(tree,'vehicle-tsn').props.onChange({target:{value:'bgu!'}});
 h.reset();tree=deep(jsx(VehicleBar,{}));
 byTestId(tree,'vehicle-form').props.onSubmit({preventDefault(){}});
 assert.equal(JSON.parse(e.localStorage.getItem('tk.vehicle')).hsn,'0603');
 assert.equal(e.events.at(-1).type,'tk:vehicle');
 assert.equal(e.events.at(-1).detail.tsn,'BGU');
 h.reset();tree=deep(jsx(VehicleBar,{}));
 assert.equal(text(byTestId(tree,'vehicle-current')),'0603 · BGU');
});

test('reset clears the stored vehicle and re-opens the form',()=>{
 const h=hooks(),e=env();e.localStorage.setItem('tk.vehicle',JSON.stringify({manual:'VW Golf VII'}));
 const VehicleBar=mod(h,e).default;
 let tree=render(h,VehicleBar);
 byTestId(tree,'vehicle-toggle').props.onClick();
 h.reset();tree=deep(jsx(VehicleBar,{}));
 byTestId(tree,'vehicle-clear').props.onClick();
 assert.equal(e.localStorage.getItem('tk.vehicle'),null);
 assert.equal(e.events.at(-1).detail,null);
});
