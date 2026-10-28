'use strict';
// Isolated workers load each callable from that callable's own production-based candidate.
const fs=require('node:fs'),path=require('node:path'),{fork}=require('node:child_process'),Module=require('node:module');
const stage='/tmp/admin-refresh-deploy-20261021',root=path.resolve(__dirname,'../..');
if(process.argv[2]==='--worker'){
 const name=process.argv[3],handler=require(path.join(stage,name,'release/functions/index.js'))[name];
 process.on('message',async({id,request})=>{try{process.send({id,value:await handler.run(request)});}catch(e){process.send({id,error:{message:e.message,code:e.code}});}});
}else{
 const targets=new Set(JSON.parse(fs.readFileSync(stage+'/scope.json')).targets),workers=new Map();let sequence=0;
 const local=require('../../functions/index');
 const handlers=new Proxy(local,{get:(obj,name)=>{
  if(!targets.has(name))return obj[name];
  return {run:request=>new Promise((resolve,reject)=>{
   let worker=workers.get(name);
   if(!worker){worker=fork(__filename,['--worker',name],{stdio:['ignore','inherit','inherit','ipc']});worker.pending=new Map();
    worker.on('message',msg=>{const task=worker.pending.get(msg.id);if(!task)return;worker.pending.delete(msg.id);if(msg.error)task.reject(Object.assign(new Error(msg.error.message),{code:msg.error.code}));else task.resolve(msg.value);});
    worker.on('exit',()=>{for(const task of worker.pending.values())task.reject(new Error('Candidate worker exited'));});workers.set(name,worker);
   }
   const id=++sequence;worker.pending.set(id,{resolve,reject});worker.send({id,request});
  })};
 }});
 global.adminCandidateHandlers=handlers;global.closeAdminCandidates=()=>{for(const worker of workers.values())worker.kill();};
 const test=path.resolve(root,process.argv[2]||'tests/admin/refresh-online.test.js');
 let source=fs.readFileSync(test,'utf8').replace("require('../../functions/index')",'global.adminCandidateHandlers');
 source=source.replace('await Promise.all(getApps().map(deleteApp));','await Promise.all(getApps().map(deleteApp));global.closeAdminCandidates();');
 const testModule=new Module(test,module);testModule.filename=test;testModule.paths=Module._nodeModulePaths(path.dirname(test));testModule._compile(source,test);
}
