// Local adapter for the exact Vercel Web-standard handler. No provider credentials.
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import handler from '../api/agent-chat.ts';
import statusHandler from '../api/agent-runtime-status.ts';

const publicOrigin='http://127.0.0.1:3004';
const server=createServer(async(incoming,outgoing)=>{
 const abort=new AbortController();outgoing.on('close',()=>{if(!outgoing.writableFinished)abort.abort();});
 try{
  if(!['/api/agent-chat','/api/agent-runtime-status'].includes(incoming.url?.split('?')[0])){outgoing.writeHead(404);outgoing.end();return;}
  const headers=new Headers();for(const[key,value]of Object.entries(incoming.headers)){if(Array.isArray(value))for(const item of value)headers.append(key,item);else if(value!==undefined)headers.set(key,value);}
  const init={method:incoming.method,headers,signal:abort.signal};
  if(incoming.method!=='GET'&&incoming.method!=='HEAD'){init.body=Readable.toWeb(incoming);init.duplex='half';}
  const request=new Request(new URL(incoming.url||'/',publicOrigin),init);
  const result=await (request.url.endsWith("/api/agent-runtime-status")?statusHandler:handler).fetch(request);
  outgoing.writeHead(result.status,Object.fromEntries(result.headers));
  if(result.body)await pipeline(Readable.fromWeb(result.body),outgoing);else outgoing.end();
 }catch{
  if(!outgoing.headersSent)outgoing.writeHead(500,{'content-type':'application/json','cache-control':'no-store'});
  outgoing.end('{"error":"preview_unavailable"}');
 }
});
server.listen(3005,'127.0.0.1',()=>console.log('Vercel SDK preview handler on loopback 3005; no LLM or external actions'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
