'use strict';
const P=require('./pool'),G=require('./generator'),L=require('./learning');
function next(unitId,previous={},seed='',options={}){
 const pool=P.get(unitId),ids=P.ids(pool),history={...previous},cycle=Number.isSafeInteger(previous.cycle)?previous.cycle:0,mode=options.mode||'ranking';
 let used;
 if(pool.math){
  const bits=P.numericCompatible(unitId,previous.mathVersion)?Buffer.from(previous.bits||'','base64'):Buffer.alloc(0);
  used=new Set(ids.slice(0,pool.numericSize).filter((_,i)=>bits[i>>3]&(1<<(i%8))));
  for(const id of previous.seenExtras||[])if(pool.byId.has(id))used.add(id);
 }else used=new Set((previous.seenIds||[]).filter(id=>pool.byId.has(id)));
 history.cycle=cycle;history.seed=previous.seed||P.hash(seed+':'+unitId);history.revision=pool.revision;
 if(used.size===ids.length){used.clear();history.cycle++;history.seed=P.hash(history.seed+':'+history.cycle);}
 const order=G.context(history.seed+':'+pool.revision).shuffle(ids),recent=new Set(previous.lastSources||[]);
 const counts=new Map(),families=new Map();
 for(const id of used){const q=pool.metadata.get(id);for(const s of q.sourceIds)counts.set(s,(counts.get(s)||0)+1);families.set(q.family,(families.get(q.family)||0)+1);}
 const pending=mode==='practice'?(history.learning?.reviews||[]):[];
 const due=pending.filter(x=>x.due<=(history.learning?.answered||0)||(Number.isFinite(x.dueAt)&&x.dueAt<=(options.now??Date.now())));
 const available=order.filter(id=>!used.has(id)&&id!==previous.lastId);
 const review=due.find(entry=>available.some(id=>pool.metadata.get(id).objective===entry.objective&&id!==entry.lastQuestion));
 const target=L.target(history,mode);
 let chosen,best=Infinity;
 const deferred=new Set(pending.map(x=>x.objective));
 const canInterleave=available.some(id=>!deferred.has(pool.metadata.get(id).objective));
 for(const id of available){const q=pool.metadata.get(id);
  if(review&&(q.objective!==review.objective||id===review.lastQuestion))continue;
  // Do not consume the only alternative examples before a review is due.
  if(!review&&canInterleave&&deferred.has(q.objective))continue;
  const exposure=Math.max(0,...q.sourceIds.map(s=>counts.get(s)||0));
  const sourcePenalty=review&&q.sourceIds.some(s=>(review.lastSources||[]).includes(s))?1e7:0;
  const score=sourcePenalty+Math.abs(q.difficulty-target)*1e6+(families.get(q.family)||0)*1000+exposure*10+(q.sourceIds.some(s=>recent.has(s))?5:0);
  if(score<best){best=score;chosen=id;}
 }
 chosen=chosen||available[0]||order.find(id=>!used.has(id));
 if(!chosen)throw Error('No unissued question');
 const q=P.question(unitId,chosen,history.seed+':'+chosen);if(review)q.reviewFor=review.objective;
 used.add(chosen);history.lastId=chosen;history.lastSources=q.sourceIds;history.issued=used.size;history.poolSize=pool.size;history.totalIssued=(previous.totalIssued||0)+1;if(mode==='ranking')history.rankingIssued=(previous.rankingIssued||0)+1;
 if(pool.math){const bits=Buffer.alloc(Math.ceil(pool.numericSize/8));for(let i=0;i<pool.numericSize;i++)if(used.has(ids[i]))bits[i>>3]|=1<<(i%8);history.bits=bits.toString('base64');history.seenExtras=[...used].filter(id=>id.startsWith('extra-'));history.mathVersion=P.NUMERIC_VERSION;delete history.seenIds;}
 else {history.seenIds=[...used];delete history.bits;delete history.mathVersion;}
 return {question:q,history};
}
module.exports={next};
