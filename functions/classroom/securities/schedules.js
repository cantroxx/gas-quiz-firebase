'use strict';
// No production scheduler is registered in stage B. G3 supplies an approved market list.
function createJobs({engine,targets}){
 if(!Array.isArray(targets)||targets.length>100)throw Error('A bounded explicit market list is required');
 return {
  publishNews:()=>engine.runSchedule(targets,'news'),
  generatePrices:()=>engine.runSchedule(targets,'prices'),
  options:{schedule:'every 1 minutes',timeZone:'Asia/Seoul',retryCount:3}
 };
}
module.exports={createJobs};
