// Local static server for dist/ that mirrors the CloudFront routing: extensionless paths serve index.html.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
const root=new URL('../dist/',import.meta.url).pathname,port=Number(process.env.PORT)||4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
createServer(async(req,res)=>{
 const path=normalize(decodeURIComponent(new URL(req.url,'http://x').pathname)).replace(/^(\.\.[/\\])+/,'');
 const file=extname(path)?join(root,path):join(root,'index.html');
 try{const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-cache'});res.end(body);}
 catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Serving dist/ on http://127.0.0.1:${port}`));
