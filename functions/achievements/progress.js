'use strict';
const C=require('./catalog');
// Called only after the quiz service has validated ownership, sequence and answer.
// Return a write closure so all transaction reads finish before reward writes.
async function prepare(tx,db,{memberId,area,mode,correct,run,time}){
 if(mode==='ranking'&&!C.subjects[area])return ()=>{};
 if(!C.areas.some(x=>x.id===area))throw Error('Unknown achievement area');
 if(run.achievementVersion!==C.VERSION){run.achievementVersion=C.VERSION;run.achievementStreak=0;run.achievementPerfect=false;}
 let perfect=false;
 if(mode==='ranking'&&C.subjects[area]){
  run.achievementStreak=correct?(run.achievementStreak||0)+1:0;
  perfect=run.achievementStreak>=20&&!run.achievementPerfect;
  if(perfect)run.achievementPerfect=true;
 }
 if(mode!=='practice'&&!perfect)return ()=>{};
 const ref=db.collection('achievementProgress').doc(memberId),snap=await tx.get(ref);
 const current=snap.data();const data=current?.version===C.VERSION?current:{version:C.VERSION,areas:{}};
 const row={answered:0,perfectRuns:0,...data.areas[area]};
 if(mode==='practice')row.answered++;
 if(perfect)row.perfectRuns++;
 data.areas[area]=row;data.updatedAt=time;
 return ()=>tx.set(ref,data);
}
module.exports={prepare};
