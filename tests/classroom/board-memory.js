'use strict';
const {createService}=require('../../functions/classroom/board');
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
function fixture(){
 const data=new Map();let chain=Promise.resolve();
 const doc=path=>({path,id:path.split('/').pop(),kind:'doc',collection:name=>collection(path+'/'+name)});
 const query=(path,filters=[],max=Infinity,after='',ordered='',direction='asc')=>({path,kind:'query',filters,max,after,ordered,direction,orderBy:(field,dir='asc')=>query(path,filters,max,after,field,dir),startAfter:v=>query(path,filters,max,v,ordered,direction),limit:n=>query(path,filters,n,after,ordered,direction),where:(key,op,value)=>query(path,[...filters,[key,value,op]]),select:()=>query(path,filters)});
 const collection=path=>({...query(path),doc:id=>doc(path+'/'+id)});
 const snapshot=path=>({id:path.split('/').pop(),exists:data.has(path),data:()=>structuredClone(data.get(path))});
 const db={doc,collection,runTransaction:fn=>{const job=chain.then(async()=>{const writes=[];const r=await fn({get:async ref=>{if(writes.length)throw Error('read-after-write');if(ref.kind==='query')return {docs:[...data.keys()].sort((a,b)=>ref.ordered==='__name__'?a.localeCompare(b):ref.ordered?((data.get(a)[ref.ordered]||0)-(data.get(b)[ref.ordered]||0))*(ref.direction==='desc'?-1:1):0).filter(p=>(!ref.after||p.split('/').pop()>ref.after)&&p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1&&ref.filters.every(([k,v,op])=>op==='in'?v.includes(data.get(p)[k]):data.get(p)[k]===v)).slice(0,ref.max).map(snapshot)};return snapshot(ref.path);},set:(ref,value,options)=>writes.push([ref.path,options?.merge?{...data.get(ref.path),...structuredClone(value)}:structuredClone(value)])});writes.forEach(([p,v])=>data.set(p,v));return r;});chain=job.catch(()=>{});return job;}};
 const quest={id:'reading',title:'오늘의 독서록',desc:'책을 읽고 느낌을 나누어요',rewardCoin:10,rewardMode:'teacherReview',repeatRule:'daily',submissionType:'text',active:true,saveEnabled:true,category:'독서',linkedGemIds:[]};
 const quests=[quest,{...quest,id:'desk',title:'책상 정리',submissionType:'complete',category:'생활'},{...quest,id:'photo',title:'만들기 사진',submissionType:'image',category:'미술'},{...quest,id:'list',title:'준비물 확인',submissionType:'checklist',checklistItems:['책','필통']},{...quest,id:'rating',title:'오늘의 노력',submissionType:'rating'},{...quest,id:'expired',title:'지난 활동',endDate:'2026-09-30'}];
 const settings={grade:'4',classNumber:'8',quests};data.set('classrooms/demo',settings);
 for(let i=1;i<=22;i++){const id='S'+i;data.set('users/'+id,{role:'student',active:true,status:'active',grade:'4',classNumber:'8',studentNumber:i,nickname:i===22?'아주 긴 이름을 가진 친구':'친구 '+i,profileImageUrl:'/images/classroom/reading-sprout-320.webp'});data.set('classrooms/demo/studentWallets/'+id,{point:100.25});}
 data.set('users/T',{role:'admin',grade:'4',classNumber:'8'});
 const act=createService({db,ErrorType:AppError,now:()=>Date.parse('2026-10-21T10:00:00+09:00'),portrait:member=>({profileImageUrl:member.profileImageUrl}),authorize:async(tx,id,uid,classId)=>{if(!data.has('users/'+id)||uid!=='uid-'+id||classId!=='demo')throw new AppError('permission-denied','scope');return {settings,isTeacher:id==='T'};}});
 return {act,data,quests,db,settings};
}
module.exports={fixture};
