'use strict';
const assert=require('node:assert/strict'),D=require('../../functions/classroom/board-domain');
assert.equal(D.dateKey(Date.parse('2026-10-20T15:00Z')),'2026-10-21');
assert.equal(D.period({repeatRule:'weekly'},'2026-10-25'),'week-2026-10-19');
assert.equal(D.period({repeatRule:'weekly'},'2026-10-26'),'week-2026-10-26');
assert.equal(D.validDate('2026-02-30'),false);
assert.equal(D.recordDay({createdAt:{seconds:Date.parse('2026-10-20T15:00Z')/1000}}),'2026-10-21');
assert.equal(D.recordId('s',{id:'q',repeatRule:'once'},'2026-10-21'),'s__q');
assert.equal(D.totalPoints([{point:10.25},{berry:1.1},{point:0,berry:99}]),11.35);
assert.equal(D.activeStudent('teacher',{role:'admin',active:true,status:'active',grade:4,classNumber:8},{grade:4,classNumber:8}),false);
for(const type of ['complete','rating','text','checklist','image']){
 const q={submissionType:type,checklistItems:['읽기','쓰기']};
 const raw={rating:'high',text:'독서록',checked:[1],imageData:'data:image/png;base64,iVBORw0KGgo='};assert.equal(D.validateSubmission(q,raw).type,type);
}
assert.throws(()=>D.validateSubmission({submissionType:'image'},{imageData:'https://evil.example/track'}));
assert.throws(()=>D.validateSubmission({submissionType:'checklist',checklistItems:['x']},{checked:[9]}));
const input={version:1,source:'grownd',asOf:'2026-10-21',students:[{sourceId:'g1',point:1.25,heartberry:9.5}],maps:{students:{g1:'s1'},quests:{q1:'q'},gems:{gem1:'gem'}},records:[{sourceId:'r1',studentId:'g1',questId:'q1',dateKey:'2026-10-20',status:'completed',rewardPaid:true,gemIds:['gem1']}]};
const catalog={students:[{memberUserId:'s1'}],quests:[{id:'q',repeatRule:'daily'}],gems:[{gemId:'gem'}]};
assert.equal(D.previewImport(input,catalog).ready,true);
let bad=structuredClone(input);bad.students[0].point=1.234;assert.equal(D.previewImport(bad,catalog).ready,false);
bad=structuredClone(input);bad.records.push(bad.records[0]);assert.equal(D.previewImport(bad,catalog).ready,false);
bad=structuredClone(input);bad.maps.gems={};assert.equal(D.previewImport(bad,catalog).ready,false);
assert.equal(D.previewImport(input,{...catalog,students:[...catalog.students,{memberUserId:'unmatched'}]}).ready,false);
assert.equal(D.previewImport(input,{...catalog,shopItems:[{itemId:'no-price'}]}).ready,false);
const extra={...catalog,students:[...catalog.students,{memberUserId:'unmatched'}]};
assert.equal(D.previewImport({...input,excludedTargetStudents:[{memberUserId:'unmatched',reason:'기존 학생: 이번 이전에 원본 없음'}]},extra).ready,true);
assert.equal(D.previewImport({...input,excludedTargetStudents:[{memberUserId:'s1',reason:'매핑과 충돌'}]},catalog).ready,false);
console.log('PASS board domain: KST periods, decimals, exclusions, five submission types, unsafe images, explicit ID mappings, missing prices and duplicate imports.');
