'use strict';
// Offline browser adapter; exercises the production diary service without network.
const {createService}=require('../../functions/classroom/diary');
class AppError extends Error {constructor(code,message){super(message);this.code=code;}}
function fixture(){
  const data=new Map();let chain=Promise.resolve();
  const doc=path=>({path,id:path.split('/').pop(),collection:name=>collection(`${path}/${name}`)});
  const collection=path=>({path,doc:id=>doc(`${path}/${id}`),where:(key,op,value)=>query(path,[[key,value]]),limit:n=>query(path,[],n)});
  const query=(path,filters,limit=100)=>({path,filters,limitCount:limit,where:(key,op,value)=>query(path,[...filters,[key,value]],limit),limit:n=>query(path,filters,n)});
  const snapshot=path=>({id:path.split('/').pop(),exists:data.has(path),data:()=>structuredClone(data.get(path))});
  const db={collection,doc,runTransaction:fn=>{
    const job=chain.then(async()=>{const writes=[];const result=await fn({
      get:async ref=>{
        if(writes.length)throw Error('read-after-write');
        if(ref.filters){const docs=[...data.keys()].filter(p=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1)
          .filter(p=>ref.filters.every(([key,value])=>data.get(p)[key]===value)).sort().slice(0,ref.limitCount).map(snapshot);return {docs,size:docs.length};}
        return snapshot(ref.path);
      },set:(ref,value)=>writes.push([ref.path,structuredClone(value)]),update:(ref,patch)=>writes.push([ref.path,{...data.get(ref.path),...structuredClone(patch)}])
    });for(const [path,value]of writes)data.set(path,value);return result;});chain=job.catch(()=>{});return job;
  }};
  const people={S1:{nickname:'별이',portraitSource:'avatar',profileImageUrl:'/coordi-shop/verified/female-1032038.png'},S2:{nickname:'민준',portraitSource:'photo',profileImageUrl:'/images/classroom/reading-sprout-320.webp'},T1:{nickname:'선생님'}};
  let time=1000;
  const act=createService({db,ErrorType:AppError,today:()=> '2026-10-17',now:()=>++time,
    authorize:async(tx,member,uid,classId)=>{if(!people[member]||uid!==`uid-${member}`||classId!=='demo')throw new AppError('permission-denied','scope');return {isTeacher:member==='T1'};},
    authorFor:async(tx,member)=>people[member]?{...people[member],memberUserId:member,studentNumber:member==='S1'?14:15}:null});
  return {act,data};
}
module.exports={fixture};
