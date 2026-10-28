#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{fixture}=require('../../tests/classroom/board-memory');
const ROOT=path.resolve(__dirname,'../..'),PUBLIC=path.join(ROOT,'public');
(async()=>{
 const store=fixture();for(let i=1;i<=17;i++)await store.act('uid-T',{classId:'demo',memberUserId:'T',action:'complete',questId:'reading',targetMemberUserId:'S'+i,dateKey:'2026-10-21'});
 await store.act('uid-S18',{classId:'demo',memberUserId:'S18',action:'submit',questId:'reading',dateKey:'2026-10-21',submission:{text:'비공개 제출 내용 <img src=x onerror=alert(1)>'}});
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Keep the browser's date aligned with board-memory's fixed service clock.
  await page.clock.setFixedTime(new Date('2026-10-21T10:00:00+09:00'));
  let fail=false;await page.exposeFunction('boardTransport',async p=>{try{if(fail)throw Error('검사용 연결 실패');return {data:await store.act('uid-'+p.memberUserId,p)};}catch(e){return {error:{message:e.message,code:e.code}};}});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='https://board.test')return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><body></body></html>'});const f=path.resolve(PUBLIC,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(PUBLIC+'/')||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f});});
  await page.goto('https://board.test/index.html',{waitUntil:'domcontentloaded'});
  // Isolated local HTML to prevent any production initialization; all backend requests use the production service with synthetic memory.
  await page.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="https://board.test/styles.css"></head><body><button id="open">수업 보드</button></body></html>');
  for(const f of ['domain/classroom-board-domain.js','features/classroom-board.js'])await page.addScriptTag({path:path.join(PUBLIC,'js',f)});
  await page.evaluate(()=>{window.boardMember='T';window.boardDeps={classId:'demo',getMemberUserId:()=>boardMember,getAuthUid:()=> 'uid-'+boardMember,normalizeDisplayImageUrl:v=>v,call:async p=>{const r=await boardTransport(p);if(r.error){const e=Error(r.error.message);e.code=r.error.code;throw e;}return r.data;}};document.querySelector('#open').onclick=()=>DJ48ClassroomBoard.open(boardDeps);});
  await page.click('#open');const d=page.locator('.classroom-board-dialog');await page.waitForFunction(()=>document.querySelectorAll('.board-student').length===22);
  assert.equal(await d.locator('.board-student.is-complete').count(),17);assert.equal(await d.locator('.board-batch').isVisible(),false);assert(!((await d.innerText()).includes('비공개 제출 내용')));
  assert.equal(await d.locator('.board-students').evaluate(n=>n.lastElementChild.getBoundingClientRect().bottom<=innerHeight),true,'22 public cards fit at 1920x1080');
  const out=process.env.CLASSROOM_BOARD_SCREENSHOT_DIR||'/tmp/classroom-board-screenshots';fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'board-1920.png')});
  await d.locator('[data-lock]').click();await page.locator('.board-prompt input').fill('test1234');await page.locator('.board-prompt button').filter({hasText:'확인'}).click();await d.locator('.board-batch').waitFor({state:'visible'});
  assert.equal(await d.locator('.board-students').evaluate(n=>n.lastElementChild.getBoundingClientRect().bottom<=innerHeight),true,'22 teacher cards fit at 1920x1080');
  await page.screenshot({path:path.join(out,'board-teacher-1920.png')});
  await d.locator('[data-student="S18"] button').filter({hasText:'상세 보기'}).click();assert((await d.locator('.board-detail').innerText()).includes('비공개 제출 내용'));assert.equal(await d.locator('.board-detail img').count(),0,'Submission text cannot become HTML');
  await d.locator('.board-detail button').filter({hasText:'상세 닫기'}).click();await d.locator('[data-student="S18"] input').check();await d.locator('[data-student="S19"] input').check();await d.locator('[data-complete]').click();assert((await page.locator('.board-prompt').innerText()).includes('2명'));await page.locator('.board-prompt button').filter({hasText:'처리하기'}).click();await page.waitForFunction(()=>document.querySelectorAll('.board-student.is-complete').length===19);
  await d.locator('[data-student="S19"] button').filter({hasText:'상세 보기'}).click();await d.locator('.board-detail button').filter({hasText:'완료 취소'}).click();await page.locator('.board-prompt input').fill('검증 취소');await page.locator('.board-prompt button').filter({hasText:'확인'}).click();await page.waitForFunction(()=>document.querySelectorAll('.board-student.is-complete').length===18);
  assert.equal(store.data.get('classrooms/demo/studentWallets/S19').point,100.25);
  await d.locator('[data-list]').click();assert.equal(await d.locator('.board-list').count(),1);await d.locator('[data-cards]').click();
  await d.locator('[data-lock]').click();assert.equal(await d.locator('.board-batch').isVisible(),false);
  fail=true;await d.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-connection]').textContent.includes('연결 실패'));fail=false;
  await d.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-connection]').textContent.includes('갱신'));
  for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:900});assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+2),`No horizontal overflow ${width}`);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(out,`board-${width}.png`),animations:'disabled'});}
  await d.locator('[data-close]').click();await page.setViewportSize({width:800,height:900});
  for(const [qid,type]of [['photo','image'],['reading','text'],['list','checklist'],['rating','rating'],['desk','complete']]){
   await page.evaluate(({qid,quests})=>{boardMember='S22';DJ48ClassroomBoard.submit(boardDeps,quests.find(q=>q.id===qid));},{qid,quests:store.quests});
   const form=page.locator('.board-submit');await page.waitForFunction(()=>!document.querySelector('.board-submit .board-primary').disabled);if(type==='image'){await form.locator('input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#22aa66';ctx.fillRect(0,0,100,100);return c.toDataURL('image/png').split(',')[1];}),'base64')});await page.waitForFunction(()=>document.querySelector('.board-submit [role=status]').textContent.includes('준비했습니다'));}if(type==='text')await form.locator('textarea').fill('학생 독서록');if(type==='checklist')await form.locator('input').first().check();if(type==='rating')await form.locator('select').selectOption('high');await form.locator('button').filter({hasText:'제출하기'}).click();await page.waitForFunction(()=>document.querySelector('.board-submit [role=status]').textContent.includes('제출했어요'));await form.locator('button').filter({hasText:'닫기'}).click();
  }
  store.data.set('users/S23',{role:'student',active:true,status:'active',grade:'4',classNumber:'8',studentNumber:23,nickname:'추가 학생'});
  await page.evaluate(()=>{boardMember='T';document.querySelector('#open').click();});
  await page.waitForFunction(()=>document.querySelectorAll('.board-student').length===23);
  await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('.classroom-board-dialog').contains(document.activeElement)),'Keyboard stays within board');
  await page.locator('[data-sidebar]').click();assert.equal(await page.locator('[data-sidebar]').getAttribute('aria-expanded'),'false');
  await page.locator('[data-sidebar]').click();
  for(let i=1;i<=23;i++)store.data.get('users/S'+i).active=false;
  await page.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelectorAll('.board-student').length===0);assert((await page.locator('.board-students').innerText()).includes('대상 학생이 없습니다'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('.classroom-board-dialog').count(),0);
  const config=await browser.newPage();await config.setContent('<input id="classroom-quest-gem-name-input"><div id="classroom-quest-gem-picker"></div>');
  for(const f of ['features/classroom-form.js','features/classroom-render.js'])await config.addScriptTag({path:path.join(PUBLIC,'js',f)});
  await config.evaluate(()=>DJ48ClassroomRender.renderClassroomQuestPickers({economyBoard:{classroomGems:[{gemId:'Gem-A',gemName:'독서젬'},{gemId:'Gem-B',gemName:'독서젬'}]}}));
  await config.locator('input[value="Gem-B"]').check();
  const picked=await config.evaluate(()=>DJ48ClassroomForm.getClassroomQuestFormValues());assert.deepEqual(picked.linkedGemIds,['Gem-B']);
  await config.evaluate(()=>{const n=document.querySelector('#classroom-quest-gem-name-input');n.dataset.gemIds='';n.value='독서젬';DJ48ClassroomRender.renderClassroomQuestPickers({economyBoard:{classroomGems:[{gemId:'Gem-A',gemName:'독서젬'},{gemId:'Gem-B',gemName:'독서젬'}]}});});
  assert.equal(await config.evaluate(()=>DJ48ClassroomForm.getClassroomQuestFormValues().gemSelectionInvalid),true);await config.close();
  assert.deepEqual(errors,[]);console.log('PASS board browser: 22 cards, protected public view, private details, XSS text, batch approval, cancel, lock, refresh recovery, desktop/mobile layouts and student submissions. Screenshots: '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
