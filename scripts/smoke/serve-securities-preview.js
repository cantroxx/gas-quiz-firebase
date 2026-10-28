#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const ROOT=path.resolve(__dirname,'../..'), PUBLIC=path.join(ROOT,'public');
function previewHtml() {
  const scripts=['domain/securities-domain.js','features/securities-state.js','features/securities-render.js','features/securities-controller.js',
    'features/classroom-state.js','features/classroom-form.js','features/classroom-workspace.js','features/classroom-controller.js'];
  return fs.readFileSync(path.join(PUBLIC,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace('</body>',scripts.map(f=>`<script src="/js/${f}"></script>`).join('\n')+'<script src="/__securities-preview.js"></script></body>');
}
function response(url) {
  const pathname=new URL(url,'http://localhost').pathname;
  if(pathname==='/securities-preview.html')return {body:previewHtml(),type:'text/html'};
  if(pathname==='/__securities-preview.js')return {body:fs.readFileSync(path.join(ROOT,'tests/securities/preview-bootstrap.js')),type:'text/javascript'};
  const file=path.resolve(PUBLIC,`.${decodeURIComponent(pathname)}`);
  if(!file.startsWith(PUBLIC+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return {status:404,body:'Not found'};
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  return {body:fs.readFileSync(file),type:types[path.extname(file)]||'application/octet-stream'};
}
if(require.main===module)http.createServer((req,res)=>{
  try {const r=response(req.url);res.writeHead(r.status||200,{'Content-Type':r.type||'text/plain','Cache-Control':'no-store'});res.end(r.body);}
  catch {res.writeHead(400);res.end('Invalid request');}
}).listen(4177,'127.0.0.1',()=>console.log('Local synthetic preview: http://127.0.0.1:4177/securities-preview.html?securitiesPreview=1'));
module.exports={previewHtml,response};
