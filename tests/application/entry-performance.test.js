'use strict';
// No Firebase connection: actual handlers/modules, gated in-memory dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const {test} = require('node:test');
const {createAdminRepository} = require('../../public/js/infrastructure/admin-repository');
const classroom = require('../../public/js/application/classroom-usecases');
const {createService} = require('../../functions/coordi-shop/commerce');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => resolve=r); return {promise,resolve}; }
function state() { const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../../public/js/features/admin-state.js'),'utf8'),{window,Date});return window.DJ48AdminState; }
test('admin cache shares pending calls, expires, retries errors, invalidates on mutation and account changes',async()=>{
  const s=state();let owner='A',calls=0,gate=deferred(),fail=false;
  const repo=createAdminRepository({getReadOwner:()=>owner,readValue:s.readAdminValue,invalidateReads:s.invalidateAdminReads,
    getFirebaseFunctions:()=>({httpsCallable:name=>async()=>{calls++;await gate.promise;if(fail)throw Error('unavailable');return {data:{success:true,name}};}})});
  const a=repo.loadAdminDashboard(),b=repo.loadAdminDashboard();await tick();assert.equal(calls,1);gate.resolve();await Promise.all([a,b]);await repo.loadAdminDashboard();assert.equal(calls,1);
  await repo.loadAdminDashboard({forceRefresh:true});assert.equal(calls,2);
  await repo.runAdminMemberAction('deactivate','synthetic');await repo.loadAdminDashboard();assert.equal(calls,4);
  fail=true;await assert.rejects(repo.loadAdminDashboard({forceRefresh:true}),/unavailable/);fail=false;await repo.loadAdminDashboard();assert.equal(calls,6);
  gate=deferred();const old=repo.loadAdminDashboard({forceRefresh:true});await tick();owner='B';s.resetAdminState();gate.resolve();await assert.rejects(old,/session-changed|invalidated/);await repo.loadAdminDashboard();assert.equal(calls,8);
  const race=repo.loadAdminDashboard();owner='C';await assert.rejects(race,/session-changed/);
  const original=Date.now;try{Date.now=()=>original()+16000;await repo.loadAdminDashboard();assert.equal(calls,9);}finally{Date.now=original;}
});
test('today does not start economy/roster; market only waits for wallet and authorized economy',async()=>{
  for(const teacher of [false,true]) {
    let calls=[];const deps={loadClassroomSettings:async()=>{calls.push('settings');return{};},isCurrentClassroomTeacher:()=>teacher};
    for(const [name,key,value] of [['QuestProgress','progress',{}],['Wallet','wallet',{point:7}],['HomeData','home',[{djCoin:9}]],['StudentCards','students',[]],['ReviewItems','review',[]],['EconomyBoard','economy',{}],['GemProgress','gems',[]]])deps['loadClassroom'+name]=async()=>{calls.push(key);return value;};
    const home=await classroom.getClassroomPrototypeViewData({activeTab:'today'},deps);assert.deepEqual(calls,['settings','progress','wallet','home']);assert.equal(home.economyBoard.myDjCoin,9);
    calls=[];await classroom.getClassroomPrototypeViewData({activeTab:'market'},deps);assert.deepEqual(calls,['settings','wallet','economy']);
    calls=[];await classroom.getClassroomPrototypeViewData({activeTab:'today'}, {...deps,isCurrent:()=>false});assert.deepEqual(calls,['settings']);
  }
});
function dashboardFixture({file=require.resolve('../../functions/index.js'),superAdmin=false,authorize=Promise.resolve(),read=async()=>{},fail=''}={}) {
  const text=fs.readFileSync(file,'utf8'),start=text.indexOf('exports.adminGetDashboard =');
  const source=text.slice(start,text.indexOf('\nfunction normalizeAuditRankingCategoryKey',start));
  const calls=[];const rows={users:[{userId:'A',grade:'4'},{userId:'B',grade:'5'}],achievementProgress:[{userId:'A',version:require('../../functions/achievements/catalog').VERSION},{userId:'B',version:require('../../functions/achievements/catalog').VERSION}],rewardLogs:[{userId:'A'},{userId:'B'}],adminLogs:[{action:'fixture'}]};
  const snapshot=(name)=>({size:(rows[name]||[]).length,docs:(rows[name]||[]).map((data,i)=>({id:data.userId||String(i),data:()=>data}))});
  function query(parts) {return {limit:n=>query([...parts,['limit',n]]),where:(...a)=>query([...parts,['where',...a]]),orderBy:(...a)=>query([...parts,['orderBy',...a]]),doc:id=>({id,path:parts[0][1]+'/'+id}),get:async()=>{calls.push(parts);await read();const name=parts[0][1];if(fail===name)throw Error('failed-read');return snapshot(name);}};}
  const context={require:name=>require('../../functions/'+name),exports:{},REGION:'fixture',onCall:(_,handler)=>handler,requireAuth:r=>{if(!r.auth)throw Error('unauthenticated');return r.auth.uid;},getAdminMemberForAuth:async()=>{await authorize;return {isSuperAdmin:superAdmin};},
    db:{collection:name=>query([['collection',name]]),getAll:async(...refs)=>{calls.push(refs);await read();return refs.map(ref=>({id:ref.id}));}},Timestamp:{fromDate:()=>({toMillis:()=>0})},getKstDayStartDate:()=>0,
    publicAdminMemberRow:doc=>doc.data(),publicAdminCredentialState:s=>s.id,publicAdminLogRow:d=>d.data(),isMemberInAdminScope:(_,row)=>row.grade==='4',buildAdminDashboardSummary:input=>input,console:{warn:()=>{}}};
  vm.runInNewContext(source,context);return {calls,run:()=>context.exports.adminGetDashboard({auth:{uid:'synthetic'}})};
}
test('dashboard starts independent queries after permission, keeps member credentials scoped',async()=>{
  const auth=deferred(),gate=deferred();const f=dashboardFixture({authorize:auth.promise,read:()=>gate.promise});const job=f.run();await tick();assert.equal(f.calls.length,0);auth.resolve();await tick();assert.equal(f.calls.length,3);gate.resolve();const r=await job;assert.deepEqual(JSON.parse(JSON.stringify(r.dashboard.credentialStates)),['A']);assert.equal(r.dashboard.todayPracticeCount,1);assert.equal(r.dashboard.todayRewardCount,1);
  const bad=dashboardFixture({authorize:Promise.reject(Error('forbidden'))});await assert.rejects(bad.run());assert.equal(bad.calls.length,0);
  const failed=await dashboardFixture({fail:'achievementProgress'}).run();assert.equal(failed.dashboard.todayPracticeCount,null);assert.equal(failed.dashboard.readStatus.activity,'failed');
});
test('preview authorization rechecks link/member/shop each time without wallet, profile or writes',async()=>{
  let linked=true,active=true,role='student',open=true;const reads=[];
  const snap=value=>({data:()=>value});const ref=path=>({path});
  const tx={get:async r=>{reads.push(r.path);return snap(r.path.startsWith('authLinks/')?(linked?{memberUserId:'S'}:null):{shopEnabled:open});},set:()=>assert.fail('No writes'),create:()=>assert.fail('No writes')};
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),doc:ref,runTransaction:run=>run(tx)};
  class ServiceError extends Error {constructor(code,message){super(code+':'+message);}}
  const svc=createService({db,ErrorType:ServiceError,authorize:async(_,id,uid)=>{reads.push('users/'+id);assert.equal(uid,'uid');if(!active)throw Error('inactive');return {role};}});
  await svc.authorizePreview('uid');assert.deepEqual(reads,['authLinks/uid','users/S','appSettings/featureFlags']);
  active=false;await assert.rejects(svc.authorizePreview('uid'),/inactive/);active=true;open=false;await assert.rejects(svc.authorizePreview('uid'),/failed-precondition/);role='admin';await svc.authorizePreview('uid');linked=false;await assert.rejects(svc.authorizePreview('uid'),/permission-denied/);await assert.rejects(svc.authorizePreview(''),/unauthenticated/);
});
if(process.env.ENTRY_BEFORE_FUNCTIONS) test('before/after dashboard scope and statistics equivalent, timings measured separately',async()=>{
  const runs=[];
  for(const superAdmin of [false,true])for(let sample=1;sample<=3;sample++){
    const options={superAdmin,read:()=>new Promise(r=>setTimeout(r,40))};
    const before=dashboardFixture({...options,file:process.env.ENTRY_BEFORE_FUNCTIONS}),after=dashboardFixture(options);
    const t=performance.now(),a=await before.run(),m=performance.now(),b=await after.run(),e=performance.now();
    assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
    runs.push({superAdmin,sample,beforeMs:m-t,afterMs:e-m,readsBefore:before.calls.length,readsAfter:after.calls.length});
  }
  fs.writeFileSync(process.env.ENTRY_SERVER_OUTPUT,JSON.stringify({scope:'Synthetic 40ms per db call; not production',runs},null,2));
});
module.exports={dashboardFixture};
function studentCardsFixture({teacher=false,denied=false,failLevels=false}={}) {
  const text=fs.readFileSync(require.resolve('../../functions/index.js'),'utf8'),start=text.indexOf('exports.getClassroomStudentCards =');
  const source=text.slice(start,text.indexOf('\n});',start)+4),reads=[];
  const docs=[['own',{}],['hidden',{hidden:true}],['other',{grade:'5'}],['inactive',{active:false}]].map(([id,extra])=>({id,data:()=>({role:'student',status:'active',active:true,grade:'4',classNumber:'8',...extra})}));
  function ref(path) {return {path,id:path.split('/').pop(),collection:n=>ref(path+'/'+n),doc:id=>ref(path+'/'+id),where:()=>ref(path),limit:()=>ref(path),get:async()=>{reads.push(path);return {docs:path==='users'?docs:[]};}};}
  const context={console:{warn(){}},exports:{},REGION:'fixture',onCall:(_,handler)=>handler,normalizeId:x=>x,requireAuth:()=> 'auth',db:{collection:ref,runTransaction:fn=>fn({}),getAll:async(...refs)=>{reads.push(refs.map(r=>r.path));if(failLevels&&refs[0]?.path.startsWith('userLevelSummary/'))throw Error('optional-level-failure');return refs.map(r=>({id:r.id,exists:true,data:()=>r.path.startsWith('userLevelSummary/')?{totalXp:65,secret:'not-public'}:{point:7,djCoin:9}}));}},
    assertLinkedMemberAuth:async(_,id)=>{if(denied||id!=='own')throw Error('denied');return docs[0].data();},loadClassroomSettingsForTransaction:async()=>({settings:{grade:'4',classNumber:'8'}}),assertMemberCanEnterClassroom:()=>{},canViewHiddenClassroomStudents:()=>teacher,isClassroomStudentCardVisible:(_,data)=>!data.hidden,DEFAULT_CLASSROOM_GEMS:[],
    publicClassroomStudentCard:(doc,wallet,profile,title,economy)=>({memberUserId:doc.id,point:wallet.point,djCoin:economy.djCoin})};
  vm.runInNewContext(source,context);return {reads,run:data=>context.exports.getClassroomStudentCards({data:{classId:'fixture',memberUserId:'own',...data}})};
}
test('compact home reads only authorized member; roster level batching preserves visible classroom scope',async()=>{
  const own=studentCardsFixture();const home=await own.run({memberOnly:true});assert.equal(home.students.length,1);assert.equal(home.students[0].memberUserId,'own');assert.equal(home.students[0].levelSummary.level,2);assert.equal(home.students[0].levelSummary.secret,undefined);assert.equal(own.reads.length,1);assert.equal(own.reads[0].length,5);assert(own.reads[0].every(path=>path.endsWith('/own')));
  for(const teacher of [false,true]) {const f=studentCardsFixture({teacher});const roster=await f.run({});assert.deepEqual(Array.from(roster.students,s=>s.memberUserId),teacher?['hidden','own']:['own']);assert.equal(roster.levelSummariesIncluded,true);assert.equal(roster.students[0].levelSummary.level,2);assert.equal(roster.students[0].levelSummary.secret,undefined);assert.equal(f.reads.flat().filter(x=>x.startsWith('userLevelSummary/')).length,teacher?2:1);}
  const degraded=await studentCardsFixture({failLevels:true}).run({});assert.equal(degraded.students.length,1);assert.equal(degraded.students[0].levelSummary,null);
  const denied=studentCardsFixture({denied:true});await assert.rejects(denied.run({memberOnly:true}),/denied/);assert.equal(denied.reads.length,0);
  const mismatched=studentCardsFixture();await assert.rejects(mismatched.run({memberOnly:true,memberUserId:'other'}),/denied/);assert.equal(mismatched.reads.length,0);
});
test('batched level capability avoids browser N+1, old server remains compatible',async()=>{
  const {createClassroomRepository}=require('../../public/js/infrastructure/classroom-repository');let levelReads=0,modern=true;
  const repo=createClassroomRepository({getFirebaseFunctions:()=>({httpsCallable:()=>async()=>({data:{success:true,levelSummariesIncluded:modern,students:[{memberUserId:'own',levelSummary:{level:2}}]}})}),getFirestoreDb:()=>({collection:()=>({doc:()=>({get:async()=>{levelReads++;return {exists:false};}})})})});
  await repo.loadClassroomStudentCards({memberUserId:'own',settings:{classId:'fixture'}});assert.equal(levelReads,0);modern=false;await repo.loadClassroomStudentCards({memberUserId:'own',settings:{classId:'fixture'}});assert.equal(levelReads,1);
});
function shopEntryFixture() {
  const html=fs.readFileSync(require.resolve('../../public/index.html'),'utf8'),start=html.indexOf('    async function showShopView()');
  const source=html.slice(start,html.indexOf('    async function showEventView()',start));
  const nodes={};for(const id of ['shop-view','shop-avatar-market','shop-entry-status'])nodes[id]={hidden:true,setAttribute(){}};
  let owner='A',rendered=0,admin=false,gate=deferred();
  const context={window:{DJ48AccountState:{getCurrentMemberUserId:()=>owner}},document:{getElementById:id=>nodes[id]},console:{warn(){}},enterAppView:()=>{nodes['shop-view'].hidden=false;},loadFeatureFlags:()=>gate.promise,isCurrentAdminMember:()=>admin,renderAvatarMarket:()=>rendered++};
  vm.runInNewContext(source,context);
  return {nodes,run:()=>context.showShopView(),release:value=>gate.resolve(value),setOwner:v=>owner=v,rendered:()=>rendered,setAdmin:()=>admin=true};
}
test('shop paints loading shell before flags, rejects stale navigation/account results and closed store',async()=>{
  const f=shopEntryFixture();const job=f.run();assert.equal(f.nodes['shop-view'].hidden,false);assert.match(f.nodes['shop-entry-status'].textContent,/확인/);assert.equal(f.nodes['shop-avatar-market'].inert,true);assert.equal(f.rendered(),0);f.release({shopEnabled:true});await job;assert.equal(f.rendered(),1);assert.equal(f.nodes['shop-avatar-market'].inert,false);
  for(const change of ['account','leave','closed']){const f=shopEntryFixture();const p=f.run();if(change==='account')f.setOwner('B');if(change==='leave')f.nodes['shop-view'].hidden=true;f.release({shopEnabled:change!=='closed'});await p;assert.equal(f.rendered(),0);assert.equal(f.nodes['shop-avatar-market'].inert,true);}
  const admin=shopEntryFixture();admin.setAdmin();const p=admin.run();admin.release({shopEnabled:false});await p;assert.equal(admin.rendered(),1);
});
test('missing compact home from an older server is an error, never a fabricated zero balance',async()=>{
  const {createClassroomRepository}=require('../../public/js/infrastructure/classroom-repository');const errors=[];
  const repo=createClassroomRepository({getFirebaseFunctions:()=>({httpsCallable:()=>async()=>({data:{success:true,students:[]}})}),reportLoadStatus:(key,error)=>{if(error)errors.push(key);}});
  const value=await repo.loadClassroomHomeData({memberUserId:'own',settings:{classId:'fixture'}});assert.equal(value.length,0);assert.deepEqual(errors,['home']);
});
test('account reset discards the previous shop iframe but ordinary entry still reuses it',()=>{
  const html=fs.readFileSync(require.resolve('../../public/index.html'),'utf8'),a=html.indexOf('    function resetUserScopedRuntimeData()');
  const source=html.slice(a,html.indexOf('    function handleResolvedUserChange',a));let discarded=0,invalidated=0;const shop={shopEntryRequest:{}};
  const context={window:{DJ48AdminState:{resetAdminState:()=>invalidated++}},document:{getElementById:id=>id==='shop-view'?shop:{replaceChildren:()=>{if(id==='shop-avatar-market')discarded++;}}},resetShopRuntimeData(){},resetRoomSettingsCache(){},resetClassroomRuntimeData(){},userDataMigrationPromise:null};vm.runInNewContext(source,context);context.resetUserScopedRuntimeData();assert.equal(discarded,1);assert.equal(invalidated,1);assert.equal(shop.shopEntryRequest,null);
});
test('public smoke fixture blocks every backend/external request and supplies local files only',async()=>{
  const fixture=require('../../scripts/smoke/public-shell-fixture');let handler;await fixture.install({route:async(_,fn)=>handler=fn});
  async function request(url,method='GET'){let result;await handler({request:()=>({url:()=>url,method:()=>method}),abort:async code=>result={abort:code},fulfill:async value=>result=value,continue:()=>assert.fail('No actual network allowed')});return result;}
  for(const url of ['https://identitytoolkit.googleapis.com/v1/accounts:signUp','https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel','https://asia-northeast3-dj48-quiztown-firebase.cloudfunctions.net/adminGetDashboard','https://dj48-quiztown-firebase.web.app/'])assert.equal((await request(url)).abort,'blockedbyclient');
  assert.equal((await request(fixture.ORIGIN+'/','POST')).abort,'blockedbyclient');assert.match((await request(fixture.ORIGIN+'/')).path,/public\/index.html$/);assert.match((await request(fixture.ORIGIN+'/__/firebase/init.js')).body,/demo-dj48-rules/);
});
