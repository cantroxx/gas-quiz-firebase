const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../../public/js/infrastructure/securities-repository');
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const identity={classId:'demo',marketId:'practice',memberUserId:'student'};
test('lost response, reload, and same intent preserve request UUID; account keys isolated',async()=>{
 const s=storage(),seen=[],payload={action:'buy',quantity:1};let fail=true;
 const call=async(method,p)=>{seen.push(p);if(fail)throw new Error('network');return {success:true};};
 const first=create({identity,storage:s,call,uuid:()=> 'stable-id'});
 await assert.rejects(first.mutate('action',payload));assert.equal(first.pending().requestId,'stable-id');
 const reloaded=create({identity,storage:s,call});assert.equal(reloaded.pending().requestId,'stable-id');
 assert.equal(create({identity:{...identity,memberUserId:'other'},storage:s,call}).pending(),null);
 await assert.rejects(reloaded.mutate('action',{...payload,quantity:2}),e=>e.code==='pending-operation');
 fail=false;await reloaded.retryPending();assert.equal(reloaded.pending(),null);assert.deepEqual(seen.map(p=>p.requestId),['stable-id','stable-id']);
});
test('definitive rejection clears pending intent; concurrent sends reuse one request',async()=>{
 const s=storage();let calls=0,release;
 const repo=create({identity,storage:s,uuid:()=> 'stable-id',call:async()=>{calls++;await new Promise(r=>release=r);return {success:true};}});
 const a=repo.mutate('action',{action:'openAccount'}),b=repo.mutate('action',{action:'openAccount'});release();await Promise.all([a,b]);assert.equal(calls,1);
 const rejecting=create({identity,storage:s,call:async()=>{throw Object.assign(new Error('closed'),{code:'failed-precondition'});}});
 await assert.rejects(rejecting.mutate('action',{action:'buy'}));assert.equal(rejecting.pending(),null);
});
