#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{fixture}=require('../../tests/classroom/board-memory');
const {createService}=require('../../functions/classroom/followup');
const ROOT=path.resolve(__dirname,'../..'),PUBLIC=path.join(ROOT,'public');
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
(async()=>{
 const store=fixture();let time=Date.now();store.data.set('userEconomy/S1',{djCoin:100});store.data.set('classrooms/demo/continuityFund/balance',{point:0,djCoin:50});
 const service=createService({db:store.db,now:()=>time,ErrorType:AppError,authorize:async(tx,id,uid,cid)=>{if(uid!=='uid-'+id||cid!=='demo')throw new AppError('permission-denied','scope');return {settings:store.settings,isTeacher:id==='T'};}});
 let seq=0;const t=p=>service('uid-T',{classId:'demo',memberUserId:'T',targetMemberUserId:'S1',requestId:'seed-'+ ++seq,...p});
 for(const config of [{id:'seed',title:'완두 씨앗',kind:'seed',price:2,growHours:1,harvestCoin:3},{id:'skin',title:'노을 농장',kind:'skin',price:5,theme:'sunset'},{id:'coupon',title:'자리 선택권',kind:'coupon',price:5}])await t({action:'configure',kind:'item',config});
 await t({action:'configure',kind:'routine',config:{id:'daily',title:'매일 독서',policy:'daily',startDate:'2026-10-01',reward:2,items:['책 읽기','정리']}});
 await t({action:'openLottery',roundId:'smoke-round',title:'행운 번호 복권',ticketPrice:1,jackpot:5,maxTickets:100,closesAt:time+86400000});
 await t({action:'saveObservation',text:'교사 비공개 <img onerror=alert(1)>',dateKey:'2026-10-21'});
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let lost=false;await page.exposeFunction('followupTransport',async p=>{try{const data=await service('uid-'+p.memberUserId,p);if(lost&&p.action==='buyItem'){lost=false;return {error:{code:'unavailable',message:'network response lost'}};}return {data};}catch(e){return {error:{message:e.message,code:e.code}};}});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='https://followup.test')return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><body></body></html>'});const f=path.resolve(PUBLIC,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(PUBLIC+'/')||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f});});
  await page.goto('https://followup.test/index.html');await page.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://followup.test/styles.css"></head><body><button id="open">교실 생활 열기</button></body></html>');
  await page.addScriptTag({path:path.join(PUBLIC,'js/features/classroom-followup.js')});
  await page.evaluate(()=>{window.member='S1';window.deps={classId:'demo',getMemberUserId:()=>member,getAuthUid:()=> 'uid-'+member,call:async p=>{const r=await followupTransport(p);if(r.error){const e=Error(r.error.message);e.code=r.error.code;throw e;}return r.data;}};document.querySelector('#open').onclick=()=>DJ48ClassroomFollowup.open(deps);});
  await page.click('#open');const d=page.locator('.classroom-followup-dialog');await d.getByText('완두 씨앗 · 2 DJ코인',{exact:false}).waitFor();assert.equal(await d.getByRole('button',{name:'교사 설정·관찰',exact:true}).count(),0);assert(!(await d.innerText()).includes('교사 비공개'));
  const confirm=async()=>{await page.locator('.followup-confirm').getByRole('button',{name:'확인',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.classroom-followup-dialog header button').disabled);};
  lost=true;await d.getByRole('button',{name:'1개 구입',exact:true}).first().click();await confirm();await d.getByRole('button',{name:'응답 없는 요청 다시 확인'}).click();await confirm();assert.equal(store.data.get('userEconomy/S1').djCoin,98,'lost response retry does not buy twice');
  await d.getByRole('button',{name:'심기',exact:true}).first().click();await confirm();assert((await d.innerText()).includes('수확'));time+=3600001;await page.evaluate(t=>{const old=Date.now;Date.now=()=>t;},time);await d.getByRole('button',{name:'새로고침',exact:true}).click();await d.getByRole('button',{name:'수확',exact:true}).click();await confirm();assert.equal(store.data.get('userEconomy/S1').djCoin,101);
  await d.getByRole('button',{name:'루틴',exact:true}).click();await d.getByLabel('책 읽기',{exact:true}).check();await d.getByLabel('정리',{exact:true}).check();await d.getByRole('button',{name:'오늘의 기록 저장'}).click();await confirm();assert.equal(store.data.get('classrooms/demo/studentWallets/S1').point,102.25);
  await d.getByRole('button',{name:'포인트 신청',exact:true}).click();await d.getByLabel('신청 사유').fill('<img src=x onerror=alert(1)> 도움');await d.getByRole('button',{name:'신청',exact:true}).click();await confirm();assert.equal(await d.locator('img').count(),0);
  await d.getByRole('button',{name:'복권',exact:true}).click();await d.getByLabel('행운 번호 (1~100)').fill('42');await d.getByRole('button',{name:'복권 1장 구입'}).click();await confirm();assert((await d.innerText()).includes('내 번호: 42'));assert.equal(await d.getByRole('button',{name:'복권 1장 구입'}).count(),0);
  await d.getByRole('button',{name:'내역·원본 기록',exact:true}).click();await d.getByLabel('기록 종류',{exact:true}).selectOption('tickets');await d.getByRole('button',{name:'기록 조회',exact:true}).click();await d.getByText('조회한 기록',{exact:true}).waitFor();await d.locator('details').first().locator('summary').click();assert((await d.innerText()).includes('선택 번호'));
  await d.getByRole('button',{name:'닫기',exact:true}).click();await page.evaluate(()=>{member='T';document.querySelector('#open').click();});await d.getByRole('button',{name:'교사 설정·관찰'}).click();await d.getByText('교사 비공개 <img onerror=alert(1)>',{exact:false}).waitFor();assert.equal(await d.locator('img').count(),0);
  for(const name of ['농장·상점','루틴','직업·월급','예금·환전','포인트 신청','복권','내역·원본 기록','교사 설정·관찰']){await d.getByRole('button',{name,exact:true}).click();assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'desktop overflow '+name);}
  const out=process.env.CLASSROOM_FOLLOWUP_SCREENSHOT_DIR||'/tmp/classroom-followup-screenshots';fs.mkdirSync(out,{recursive:true});await d.getByRole('button',{name:'농장·상점',exact:true}).click();await page.screenshot({path:path.join(out,'farm-1920.png')});
  for(const width of [960,390]){await page.setViewportSize({width,height:900});for(const name of ['농장·상점','교사 설정·관찰']){await d.getByRole('button',{name,exact:true}).click();assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'mobile overflow '+name);}await page.screenshot({path:path.join(out,'settings-'+width+'.png')});}
  await page.keyboard.press('Escape');assert.equal(await d.count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'open');
  await page.click('#open');await d.waitFor();await page.evaluate(()=>member='S2');await d.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);console.log('PASS followup Chrome: real service purchase/retry/plant/harvest/routine/request, private teacher notes, XSS, eight tabs, 1920/960/390 layout, keyboard focus and account-switch close. Screenshots '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
