'use strict';
const {register:callables}=require('./callables');
const {createEngine,reference}=require('./market-engine');
const K=require('./calendar');
const TARGET={classId:'G4-C8',marketId:'coin-v1'};
function register({onCall,onSchedule,region,db,ErrorType,...helpers}){
 const scopedCall=(options,handler)=>onCall(options,request=>{
  if(!request.auth?.uid)throw new ErrorType('unauthenticated','로그인이 필요해요.');
  if(request.data?.classId!==TARGET.classId||request.data?.marketId!==TARGET.marketId)throw new ErrorType('permission-denied','시범 학급에서만 이용할 수 있어요.');
  return handler(request);
 });
 const engine=createEngine({db});
 return {...callables({onCall:scopedCall,region,db,ErrorType,...helpers}),
  classroomSecuritiesTick:onSchedule({region,schedule:'every 1 minutes',timeZone:'Asia/Seoul',retryCount:3,maxInstances:1,timeoutSeconds:120},async()=>{
   const m=(await reference(db,TARGET.classId,TARGET.marketId).get()).data(),clock=K.clock(Date.now());
   if(!m||m.startDate>clock.date||!K.business(clock.date,m.holidayDates)||clock.minute<m.sessionSchedule.newsMinute)return;
   const news=await engine.runSchedule([TARGET],'news'),prices=await engine.runSchedule([TARGET],'prices');
   const errors=[...news,...prices].filter(r=>r.error);if(errors.length){console.error('securities-generation-failed',JSON.stringify(errors));throw Error('Securities generation requires retry or missing-date recovery');}
   const report=await engine.closeReport(TARGET);if(report.recorded)console.info('securities-daily-report',JSON.stringify({...TARGET,date:clock.date}));
  })};
}
module.exports={register,TARGET};
