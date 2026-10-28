(function(root){
 'use strict';
 function create({call,identity,storage,uuid=()=>crypto.randomUUID()}){
  const key=`dj48-securities-pending:${identity.classId}:${identity.marketId}:${identity.memberUserId}`;
  const pending=()=>{const raw=storage.getItem(key);return raw?JSON.parse(raw):null;};
  let inFlight=null;
  async function send(operation){
   if(inFlight)return inFlight;
   const task=(async()=>{try{const result=await call(operation.method,{...identity,...operation.payload,requestId:operation.requestId});storage.removeItem(key);return result;}catch(e){if(e.details?.retryable===false||['invalid-argument','permission-denied','failed-precondition','already-exists','aborted'].includes(e.code))storage.removeItem(key);throw e;}})();
   inFlight=task;try{return await task;}finally{inFlight=null;}
  }
  async function mutate(method,payload){
   const old=pending();
   if(old&&(old.method!==method||JSON.stringify(old.payload)!==JSON.stringify(payload))){const e=new Error('이전 요청의 결과부터 다시 확인해 주세요.');e.code='pending-operation';throw e;}
   const operation=old||{method,payload,requestId:uuid()};
   storage.setItem(key,JSON.stringify(operation));
   return send(operation);
  }
  return {query:payload=>call('query',{...identity,...payload}),mutate,pending,retryPending:()=>{const p=pending();if(!p)throw Error('다시 확인할 요청이 없어요.');return send(p);}};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DJ48SecuritiesRepository=api;
})(typeof window==='undefined'?globalThis:window);
