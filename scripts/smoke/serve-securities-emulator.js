#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {guard,authorizeFor,seedMembers}=require('../../tests/securities/emulator-support');
const {createService}=require('../../functions/classroom/securities/service');
const {createEngine}=require('../../functions/classroom/securities/market-engine');
const K=require('../../functions/classroom/securities/calendar');
const {response}=require('./serve-securities-preview');
const ROOT=path.resolve(__dirname,'../..');
function html(classId,assetsRoot,production){
 const scripts=['domain/securities-domain.js','infrastructure/securities-repository.js','features/securities-render.js','features/securities-server-controller.js','features/classroom-state.js','features/classroom-form.js','features/classroom-workspace.js','features/classroom-controller.js'];
 return fs.readFileSync(path.join(assetsRoot||path.join(ROOT,'public'),'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',scripts.map(f=>`<script src="/js/${f}"></script>`).join('\n')+`<script>window.SECURITIES_DEMO_CLASS=${JSON.stringify(classId)};window.SECURITIES_DEMO_PRODUCTION=${!!production}</script><script src="/__securities-server-preview.js"></script></body>`);
}
async function createPreview({port=4178,classId='SECURITIES-PREVIEW',reset=false,mode='practice',assetsRoot=null,production=false}={}){
 const {projectId}=guard();const app=initializeApp({projectId},`securities-preview-${crypto.randomUUID()}`),db=getFirestore(app);
 console.log('Securities preview: prepare synthetic data');
 if(reset)await db.recursiveDelete(db.doc(`classrooms/${classId}`));
 console.log('Securities preview: seed members');
 const people=await seedMembers(db,classId),marketId=mode==='coin'?'coin-v1':'practice-v1',target={classId,marketId};
 let stamp=K.at('2026-10-16',600);
 const service=createService({db,authorize:authorizeFor(db),now:()=>stamp,onError:e=>console.error('Securities preview service:',e.stack)}),engine=createEngine({db,now:()=>stamp,seed:()=> 'preview-private-seed'});
 console.log('Securities preview: initialize market');
 await engine.initialize({...target,startDate:'2026-10-16',mode});
 if(mode==='coin')for(const id of [people.student,people.other])await db.doc(`userEconomy/${id}`).set({djCoin:200,coin:200});
 if(mode==='coin')await db.doc(`classrooms/${classId}/securitiesMarkets/${marketId}`).update({studentAccess:true});
 const marketRef=db.doc(`classrooms/${classId}/securitiesMarkets/${marketId}`),market=(await marketRef.get()).data();
 if(market.lifecycle==='disabled')await service.admin(`uid-${people.teacher}`,{...target,memberUserId:people.teacher,action:'resume',reason:'합성 시범 시작',requestId:crypto.randomUUID(),expectedRevision:market.configVersion});
 await engine.generateDailyPrices({...target,date:'2026-10-16'});
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1'),send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
   if(url.pathname==='/api/securities'){
    if(req.method!=='POST'||req.headers['x-securities-demo']!=='1')return send(403,{error:{code:'permission-denied',message:'로컬 합성 검토 전용입니다.',details:{retryable:false}}});
    const origin=req.headers.origin;if(origin&&!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))return send(403,{error:{code:'permission-denied',message:'로컬 요청만 허용합니다.',details:{retryable:false}}});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)return send(413,{error:{code:'invalid-argument',message:'요청이 너무 큽니다.'}});}
    const {method,payload}=JSON.parse(body),member=req.headers['x-securities-member'];
    if(!['query','action','admin'].includes(method)||![people.student,people.other,people.teacher].includes(member)||payload.classId!==classId||payload.marketId!==marketId)return send(403,{error:{code:'permission-denied',message:'합성 계정 범위를 확인해 주세요.',details:{retryable:false}}});
    try{return send(200,{result:await service[method](`uid-${member}`,payload)});}catch(e){return send(400,{error:{code:e.code||'internal',message:e.message,details:e.details||{retryable:true}}});}
   }
   if(url.pathname==='/securities-server.html'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html(classId,assetsRoot,production));return;}
   if(url.pathname==='/__securities-server-preview.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(fs.readFileSync(path.join(ROOT,'tests/securities/server-preview-bootstrap.js')));return;}
   if(assetsRoot){const file=path.resolve(assetsRoot,'.'+url.pathname);if(file.startsWith(path.resolve(assetsRoot)+'/')&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':'application/octet-stream'});res.end(fs.readFileSync(file));return;}}
   const r=response(req.url);res.writeHead(r.status||200,{'Content-Type':r.type||'text/plain','Cache-Control':'no-store'});res.end(r.body);
  }catch(e){res.writeHead(500);res.end('Local preview error');}
 });
 console.log('Securities preview: start loopback HTTP server');
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}/securities-server.html?${production?'candidate=1':`securitiesServer=1${mode==='coin'?'&securitiesCoin=1':''}`}`,db,people,service,engine,setTime:value=>{stamp=value;},close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await deleteApp(app);}};
}
if(require.main===module)createPreview().then(p=>{console.log(`Emulator-only securities preview: ${p.url}`);process.on('SIGTERM',()=>p.close().then(()=>process.exit()));process.on('SIGINT',()=>p.close().then(()=>process.exit()));}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={createPreview};
