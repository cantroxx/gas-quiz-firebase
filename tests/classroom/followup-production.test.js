'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./board-memory');
const source=fs.readFileSync(require.resolve('../../functions/index.js'),'utf8');
const extract=name=>{const start=source.indexOf('exports.'+name+' =');assert(start>=0);return source.slice(start,source.indexOf('\nexports.',start+10));};
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
(async()=>{
 const {db,data}=fixture();
 const context={exports:{},REGION:'test',onCall:(_,f)=>f,HttpsError:AppError,db,requireAuth:()=> 'uid-S1',normalizeId:v=>v,assertLinkedMemberAuth:async()=>({}),loadClassroomSettingsForTransaction:async()=>({settings:{}}),assertMemberCanEnterClassroom:()=>{},getAdminMemberForAuth:async()=>({memberUserId:'T'}),assertAdminCanManageClassroom:()=>{},getKstMonthKey:()=> '2026-10',rewardLogId:parts=>parts.join('__')};
 vm.runInNewContext(extract('exchangeClassroomCurrency'),context);
 data.set('classrooms/demo/continuityControl/exchange',{point:true,djCoin:true});
 for(const direction of ['pointToCoin','coinToPoint'])await assert.rejects(context.exports.exchangeClassroomCurrency({data:{classId:'demo',memberUserId:'S1',direction,amount:1}}),e=>e.code==='failed-precondition'&&e.message.includes('수수료'));
 vm.runInNewContext(extract('claimClassroomJobSalary'),context);
 data.set('classrooms/demo/jobAssignments/S1',{status:'active',memberUserId:'S1',jobId:'job',weeklyPayPoint:100});data.set('rewardLogs/classroom_job_salary__demo__2026-10__S1__job',{source:'classroom-followup'});
 const paid=await context.exports.claimClassroomJobSalary({data:{classId:'demo',assignmentId:'S1'}});assert.equal(paid.duplicate,true);assert.equal(data.get('classrooms/demo/studentWallets/S1').point,100.25);
 const html=fs.readFileSync('public/index.html','utf8'),a=html.indexOf('function classroomBoardDependencies('),b=html.indexOf('async function completeClassroomCheckQuest',a),refresh=[];
 const browser={normalizeDisplayImageUrl:v=>v,resetUserEconomyCache:()=>refresh.push('global'),resetClassroomDataCaches:()=>refresh.push('classroom'),renderClassroomPrototype:()=>refresh.push('render')};vm.runInNewContext(html.slice(a,b),browser);browser.classroomBoardDependencies({classId:'demo'}).onClosed();assert.deepEqual(refresh,['global','classroom','render']);
 console.log('PASS production adapters: original exchange cannot bypass activated fee policy; original payroll cannot repay new payroll.');
})().catch(e=>{console.error(e);process.exitCode=1;});
