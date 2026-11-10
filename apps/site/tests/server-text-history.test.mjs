import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const server=await createServer({root,configFile:false,server:{middlewareMode:true},appType:'custom'});
const {serverTextHistory}=await server.ssrLoadModule('/apps/web/components/PublicOrientationChat.tsx');
test.after(async()=>{await server.close();});
const text=(id,role,value)=>({id,role,parts:[{type:'text',text:value}]});

test('only user/assistant text with valid unique IDs crosses the client boundary',()=>{
 const input=[
  {id:'system',role:'system',parts:[{type:'text',text:'untrusted system'}]},
  {id:'tool',role:'tool',parts:[{type:'text',text:'untrusted tool'}]},
  {id:'bad id',role:'user',parts:[{type:'text',text:'invalid id'}]},
  text('dup','user','old duplicate'),text('dup','assistant','new duplicate'),
  {id:'a2',role:'assistant',metadata:{secret:'fixture'},parts:[{type:'data-page',data:{secret:'fixture'}},
   {type:'tool-call',input:{secret:'fixture'}},{type:'text',text:'Antwort',state:'done',providerMetadata:{secret:'fixture'}}]},
  {id:'u2',role:'user',metadata:{secret:'fixture'},parts:[{type:'text',text:'Neu 🚲',state:'done'},{type:'data-extra',data:'fixture'}]},
 ];
 const out=serverTextHistory(input);
 assert.ok(!JSON.stringify(out).includes('fixture'));
 assert.ok(!out.some(message=>message.id==='bad id'||message.role==='system'||message.role==='tool'));
 assert.equal(out.filter(message=>message.id==='dup').length,0); // leading assistants are removed
 assert.deepEqual(out,[{id:'u2',role:'user',parts:[{type:'text',text:'Neu 🚲'}]}]);
 assert.ok(out.every(message=>Object.keys(message).sort().join(',')==='id,parts,role'));
});

test('invalid last messages and invalid text are rejected without modifying the question',()=>{
 for(const messages of [[],[text('ok','assistant','no question')],
  [text('bad id','user','question')],[{role:'user',parts:[{type:'text',text:'question'}]}],
  [text('ok','user','hello\u0001world')],[{id:'ok',role:'user',parts:[{type:'text',text:7}]}],
  [{id:'ok',role:'user',parts:[{type:'data-page',data:{}}]}]]){
  assert.throws(()=>serverTextHistory(messages));
 }
 const result=serverTextHistory([text('bad','assistant','old\u0001text'),text('last','user','Guten Tag 🚲\nzweite Zeile')]);
 assert.equal(result.at(-1).parts[0].text,'Guten Tag 🚲\nzweite Zeile');
});

test('bounded suffix is UTF-16 counted, starts with user and keeps the last turn exact',()=>{
 const many=Array.from({length:17},(_,i)=>text(`m${i}`,i%2?'assistant':'user',`turn ${i}`));
 const result=serverTextHistory(many);assert.equal(result.length,11);assert.equal(result[0].role,'user');
 assert.equal(result.at(-1).parts[0].text,'turn 16');assert.ok(result.length<=12);
 const long='🚲'.repeat(499)+'!';
 const bounded=serverTextHistory([text('u1','user',long),text('a1','assistant',long),text('u2','user',long),text('a2','assistant',long),text('u3','user',long)]);
 assert.ok(bounded.flatMap(message=>message.parts).reduce((n,part)=>n+part.text.length,0)<=3000);
 assert.equal(bounded.at(-1).parts[0].text,long);assert.equal(bounded[0].role,'user');
 assert.throws(()=>serverTextHistory([text('u','user','🚲'.repeat(1501))]),/latest_message_too_long/);
});
