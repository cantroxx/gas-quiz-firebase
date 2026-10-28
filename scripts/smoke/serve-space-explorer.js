'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {createService}=require('../../functions/space-assessment/service');
function serve(port=5328){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8181')throw Error('This preview requires the local Firestore emulator on 127.0.0.1:8181.');
 const app=initializeApp({projectId:'demo-dj48-rules'},'space-preview-'+port),service=createService({db:getFirestore(app),authorize:async uid=>({isSuperAdmin:uid==='local-preview-admin'})});
 const adminService=require('../../functions/space-assessment/admin').createAdminService({db:getFirestore(app),authorize:async uid=>({isSuperAdmin:uid==='local-preview-admin',memberUserId:'local-preview-admin'})});
 const root=path.resolve(__dirname,'../../public');
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/__space/action'){
   if(req.method!=='POST'||!req.headers['content-type']?.startsWith('application/json')||(req.headers.origin&&!['http://127.0.0.1:'+server.address().port,'http://localhost:'+server.address().port].includes(req.headers.origin))){res.writeHead(403).end();return;}
   let body='';try{for await(const chunk of req){body+=chunk;if(body.length>15000)throw Error('Request too large');}const data=JSON.parse(body);const result=String(data.action).startsWith('admin')?await adminService.act('local-preview-admin',data):await service.act(data,data.action==='create'?'local-preview-admin':undefined);res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));}catch(e){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({message:e.message,code:e.code||'invalid-argument'}));}return;
  }
  let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.md':'text/plain; charset=utf-8'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
 });return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
module.exports={serve};if(require.main===module)serve().then(()=>console.log('Local demo classes: http://127.0.0.1:5328/space-explorer/'));
