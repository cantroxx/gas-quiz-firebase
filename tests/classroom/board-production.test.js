'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../../functions/index.js'),'utf8'),D=require('../../functions/classroom/board-domain');
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
let stored=null;
const context={exports:{},REGION:'test',onCall:(_,f)=>f,HttpsError:AppError,crypto:require('node:crypto'),require:name=>{assert.equal(name,'./classroom/board-domain');return D;},isIsoDateKey:D.validDate,normalizeId:v=>v,requireAuth:()=> 'uid-teacher',getAdminMemberForAuth:async()=>({memberUserId:'teacher'}),assertAdminCanManageClassroom:()=>{},FieldValue:{serverTimestamp:()=>0},db:{runTransaction:fn=>fn({set:(ref,value)=>{stored=value;}})},loadClassroomSettingsForTransaction:async()=>({ref:'class',settings:{grade:'4',classNumber:'8',quests:[]}})};
vm.runInNewContext(source.slice(source.indexOf('function slugifyClassroomGemId'),source.indexOf('async function applyClassroomGemProgress')),context);
const start=source.indexOf('exports.saveClassroomQuest =');vm.runInNewContext(source.slice(start,source.indexOf('\nexports.',start+10)),context);
(async()=>{
 const quest={id:'check',title:'읽기',rewardCoin:5,rewardMode:'teacherReview',submissionType:'checklist',checklistItems:['책 읽기','이야기하기'],linkedGemNames:['독서젬','독서젬'],linkedGemIds:['Gem-A','Gem-B'],repeatRule:'weekly'};
 await context.exports.saveClassroomQuest({data:{classId:'class',quest}});
 assert.deepEqual(Array.from(stored.quests[0].linkedGemIds),['Gem-A','Gem-B']);assert.equal(stored.quests[0].submissionType,'checklist');assert.deepEqual(Array.from(stored.quests[0].checklistItems),quest.checklistItems);
 await assert.rejects(context.exports.saveClassroomQuest({data:{classId:'class',quest:{...quest,checklistItems:[]}}}),e=>e.code==='invalid-argument');
 const a=source.indexOf('exports.completeClassroomAutoQuest =');let forwarded;context.classroomBoardService=async(uid,p)=>{forwarded={uid,p};return {ok:true};};vm.runInNewContext(source.slice(a,source.indexOf('\nexports.',a+10)),context);await context.exports.completeClassroomAutoQuest({data:{classId:'class',memberUserId:'s',questId:'check'}});assert.equal(forwarded.p.action,'submit');assert.equal(forwarded.uid,'uid-teacher');
 const missionStart=source.indexOf('function publicClassroomMission('),missionEnd=source.indexOf('function normalizeClassroomGroupPurchase',missionStart);context.normalizeClassroomMission=v=>v;context.roundClassroomPoint=D.money;vm.runInNewContext(source.slice(missionStart,missionEnd),context);assert.equal(context.publicClassroomMission({thresholds:[]},215.75).totalPoint,215.75);
 console.log('PASS board production adapters: checklist validation/persistence, same-name gem IDs and shared auto completion endpoint.');
})().catch(e=>{console.error(e);process.exitCode=1;});
