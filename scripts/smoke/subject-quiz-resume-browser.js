#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),C=require('../../functions/subject-quiz/curriculum'),G=require('../../functions/subject-quiz/generator');
const publicRoot=process.env.SUBJECT_PUBLIC_DIR||path.join(__dirname,'../../public');
const question=G.publicQuestion(G.generate('korean:4-1:1','exit',1));
const url='https://exit.invalid/subject-quiz/?subject=korean&group=4-1';
const endpoint='https://asia-northeast3-demo-subject.cloudfunctions.net/subjectQuizAction';
const poll=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,30));}assert.ok(fn(),'Expected lifecycle request');};
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{for(const width of [1440,390,320]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],calls=[];
 let active=null,next=0,race=false,failFinish=false,loseStart=false,dropExit=false;const byRequest=new Map();
 const make=(id='abandoned',unitId='korean:4-1:1',mode='practice')=>({runId:id,unitId,mode,status:'playing',seq:1,correct:1,answered:1,hearts:3,totalScore:59,question,deadline:Date.now()+300000});active=make();
 async function act(p,exit=false){calls.push({...p,exit});
  if(p.action==='profile')return{subjects:C.subjects,units:C.units,totals:{korean:59},progress:{},activeRunId:active?.status==='playing'?active.runId:null};
  if(p.action==='start'){
   if(byRequest.has(p.requestId))return structuredClone(byRequest.get(p.requestId));
   if(race){race=false;active=make('other-tab');}
   if(active?.status==='playing')throw Object.assign(Error('진행 중인 퀴즈를 이어 하거나 먼저 종료해 주세요.'),{code:'functions/failed-precondition'});
   active={...make('new-'+(++next),p.unitId,p.mode),seq:0,correct:0,answered:0};byRequest.set(p.requestId,active);
   if(loseStart){loseStart=false;throw Error('응답 유실');}
  }
  if(p.action==='finish'){
   if(failFinish){failFinish=false;throw Error('종료 연결 끊김');}
   if(p.runId!==active?.runId)throw Error('Wrong run closed');active.status='finished';active.reason='quit';
  }
  return structuredClone({...active,serverNow:Date.now()});
 }
 page.on('pageerror',e=>errors.push(e.message));
 await context.exposeFunction('fixtureCall',async p=>{try{return {data:await act(p)};}catch(e){return {error:{message:e.message,code:e.code}};}});
 // Exercise the actual authenticated keepalive transport with an isolated SDK stub.
 await context.addInitScript(()=>{
  const user={getIdToken:async()=> 'fixture-token'},auth={currentUser:user,onAuthStateChanged(fn){queueMicrotask(()=>fn(user));return()=>{};},onIdTokenChanged(fn){queueMicrotask(()=>fn(user));return()=>{};}};
  const app={options:{projectId:'demo-subject'},functions:()=>({httpsCallable:()=>async p=>{const v=await window.fixtureCall(p);if(v.error)throw Object.assign(Error(v.error.message),{code:v.error.code});return v;}})};
  window.firebase={auth:()=>auth,app:()=>app};
 });
 await context.route(endpoint,async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'https://exit.invalid','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST'}});
  assert.equal(route.request().headers().authorization,'Bearer fixture-token');
  const p=route.request().postDataJSON().data;
  if(dropExit){calls.push({...p,exit:true,dropped:true});return route.abort();}
  const data=await act(p,true);await route.fulfill({json:{data},headers:{'Access-Control-Allow-Origin':'https://exit.invalid'}});
 });
 await context.route('https://exit.invalid/**',route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/__/'))return route.fulfill({contentType:'application/javascript',body:''});if(u.pathname==='/')return route.fulfill({body:'<h1>퀴즈타운</h1>'});return route.fulfill({path:path.join(publicRoot,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname)});});
 const start=async(n=0,mode='연습전')=>{await page.locator('.unit').nth(n).getByRole('button',{name:mode,exact:true}).click();};
 const ready=()=>page.locator('.unit').first().waitFor(),playing=()=>page.locator('.question').waitFor();
 await page.goto(url);await ready();assert.equal(active.status,'finished');assert.equal(await page.locator('.active-run,dialog').count(),0);assert.match(await page.locator('main').innerText(),/누적 59점/);
 await start();await playing();assert.match(await page.locator('.question').innerText(),/1번째 문제/);assert.equal(active.totalScore,59);
 const first=active.runId;await page.reload();await ready();assert.equal(active.status,'finished');await start();await playing();assert.notEqual(active.runId,first);
 // Dropped close request is repaired on the next entry without a session prompt.
 dropExit=true;await page.reload();await ready();dropExit=false;assert.equal(active.status,'finished');assert.equal(await page.locator('.active-run,dialog').count(),0);
 race=true;await start(1,'랭킹전');await playing();assert.equal(active.unitId,'korean:4-1:2');assert.equal(active.mode,'ranking');assert.ok(calls.some(x=>x.action==='finish'&&x.runId==='other-tab'));assert.equal(await page.locator('#notice').isVisible(),false);
 // Merely switching visibility must not terminate a run.
 const count=calls.filter(x=>x.action==='finish').length;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForTimeout(100);assert.equal(calls.filter(x=>x.action==='finish').length,count);
 // In-app exit waits for finish; error can be retried without losing score.
 failFinish=true;await page.locator('.topbar a').click();await page.locator('#notice').waitFor();assert.equal(new URL(page.url()).pathname,'/subject-quiz/');await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.waitForURL('https://exit.invalid/?subjectQuizReturn=korean');assert.equal(active.status,'finished');assert.equal(active.totalScore,59);
 await page.goto(url);await ready();loseStart=true;await start();await page.locator('#notice').waitFor();const lost=active.runId;await page.getByRole('button',{name:'다시 시도',exact:true}).click();await playing();assert.equal(active.runId,lost);assert.equal(active.status,'playing');
 // Verify the pagehide handler's real authenticated keepalive request before unloading.
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await poll(()=>calls.some(x=>x.action==='finish'&&x.runId===lost&&x.exit));assert.equal(active.status,'finished');
 // A back-forward-cache restoration also discards the previous play screen.
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await ready();assert.equal(active.status,'finished');
 await start();await playing();await page.getByRole('button',{name:'그만 풀기',exact:true}).click();await page.locator('.result').waitFor();assert.equal(active.status,'finished');await page.getByRole('button',{name:'단원으로 돌아가기',exact:true}).click();await ready();assert.equal(await page.locator('.active-run,dialog').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await start();await playing();await page.close();const reopened=await context.newPage();await reopened.goto(url);await reopened.locator('.unit').first().waitFor();assert.equal(active.status,'finished');assert.equal(await reopened.locator('.active-run,dialog').count(),0);await context.close();
}}finally{await browser.close();}console.log('PASS subject auto-close: no resume UI, fresh starts, authenticated pagehide keepalive, reload/closed-tab recovery, dropped exit cleanup, cross-tab race, finish/start retry, BFCache, unchanged scores, 1440/390/320px.');})().catch(e=>{console.error(e);process.exitCode=1;});
