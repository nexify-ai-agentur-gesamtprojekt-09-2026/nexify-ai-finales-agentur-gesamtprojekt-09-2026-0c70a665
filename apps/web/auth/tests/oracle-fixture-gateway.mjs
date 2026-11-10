// Synthetic loopback-only stand-in for Supabase's /rest/v1 gateway prefix.
import http from 'node:http';
const server=http.createServer((req,res)=>{
 if(req.method==='GET' && req.url==='/_fixture/ready') {res.writeHead(204);res.end();return;}
 if(req.method!=='POST'||!/^\/rest\/v1\/rpc\/(create_owned_conversation|read_owned_conversation)$/.test(req.url||'')) {res.writeHead(404);res.end();return;}
 const upstream=http.request({hostname:'127.0.0.1',port:35432,method:'POST',path:req.url.slice('/rest/v1'.length),headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
 req.on('aborted',()=>upstream.destroy());
 req.pipe(upstream);
});
server.listen(35431,'127.0.0.1');
