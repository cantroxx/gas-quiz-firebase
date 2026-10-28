#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {fixture}=require('../../tests/classroom/diary-memory');
const ROOT=path.resolve(__dirname,'../..'),PUBLIC=path.resolve(process.env.CLASSROOM_PUBLIC_DIR || path.join(ROOT,'public'));
(async()=>{
  const store=fixture();
  const base={classId:'demo',dateKey:'2026-10-17',memberUserId:'S2',action:'save',text:'오늘 친구들과 책을 읽었어요.',mood:'happy',visibility:'class',revision:0};
  await store.act('uid-S2',base);
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let failNext=false,dropCommentReply=false;
    await page.exposeFunction('diaryTransport',async payload=>{
      try{
        if(failNext){failNext=false;throw Error('검사용 연결 실패');}
        const data=await store.act(`uid-${payload.memberUserId}`,payload);
        if(dropCommentReply&&payload.action==='comment'){dropCommentReply=false;throw Error('댓글 응답 유실');}
        return {data};
      }catch(e){return {error:{message:e.message,code:e.code}};}
    });
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());if(url.origin!=='https://diary.test')return route.abort();
      const file=path.resolve(PUBLIC,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
      if(!file.startsWith(PUBLIC+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
      if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
      return route.fulfill({path:file});
    });
    await page.goto('https://diary.test/');
    for(const file of ['domain/classroom-domain.js','application/classroom-usecases.js','features/classroom-state.js','features/classroom-form.js','features/classroom-portrait.js','features/classroom-card-home.js','features/classroom-diary.js', 'features/classroom-shop-art.js','features/classroom-render.js','features/classroom-controller.js'])await page.addScriptTag({path:path.join(PUBLIC,'js',file)});
    await page.evaluate(()=>{
      window.diaryMember='S1';
      window.openTestDiary=options=>DJ48ClassroomDiary.open({classId:'demo',getMemberUserId:()=>diaryMember,getAuthUid:()=>`uid-${diaryMember}`,today:()=> '2026-10-17',normalizeDisplayImageUrl:x=>x,
        call:async payload=>{const r=await diaryTransport(payload);if(r.error){const e=Error(r.error.message);e.code=r.error.code;throw e;}return r.data;}},options);
      document.querySelectorAll('.app-view').forEach(v=>v.hidden=v.id!=='classroom-view');DJ48ClassroomForm.setClassroomUnlocked(true);
      const settings=DJ48ClassroomDomain.normalizeClassroomSettings({classId:'demo',quests:[{id:'read',title:'책 10분 읽기',active:true,rewardMode:'auto',rewardCoin:5}]});
      DJ48ClassroomRender.renderClassroomSections({settings,wallet:{point:35.5},home:[{memberUserId:'S1',nickname:'별이',studentNumber:14,level:4,djCoin:120,portraitSource:'avatar',profileImageUrl:'/coordi-shop/verified/female-1032038.png'}],studentCards:[{memberUserId:'S1',nickname:'별이',studentNumber:14,level:4,djCoin:120,portraitSource:'avatar',profileImageUrl:'/coordi-shop/verified/female-1032038.png'}],economyBoard:{myDjCoin:120}},
        {activeTab:'today',currentMemberUserId:'S1',isCurrentClassroomTeacher:()=>false,normalizeDisplayImageUrl:x=>x,getTodayDateKey:()=> '2026-10-17'});
      DJ48ClassroomRender.renderClassroomLoadState('ready');
      DJ48ClassroomController.bindClassroomEvents({openClassroomDiary:openTestDiary});
    });
    const output=process.env.CLASSROOM_DIARY_SCREENSHOT_DIR;
    const shot=async name=>{if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png'),fullPage:!(await page.locator('.classroom-diary-dialog').count()),animations:'disabled'});}};
    await page.waitForFunction(()=>document.querySelector('.classroom-home-avatar img')?.src.startsWith('data:image/png'));
    assert(await page.locator('.classroom-home-avatar img').evaluate(n=>n.naturalWidth < 220),'Transparent sprite padding is removed for display');
    await shot('student-home-1440');
    for(const width of [768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Student home overflows at ${width}`);
      assert(await page.locator('.classroom-personal-card').evaluate(n=>n.getBoundingClientRect().top<600),'Student card appears first on mobile');
      if(width===390)await shot('student-home-390');
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('.classroom-card-shortcuts [data-classroom-diary="mine"]').click();
    const d=page.locator('.classroom-diary-dialog'),text=d.locator('#classroom-diary-text'),status=d.locator('[role="status"]');
    await text.waitFor();await page.waitForFunction(()=>!document.querySelector('#classroom-diary-text').disabled);
    assert.equal(await d.locator('[value="private"]').isChecked(),true);
    assert.equal(await d.locator('.diary-author-face').evaluate(n=>n.classList.contains('is-avatar')),true);
    await d.locator('[data-mood="happy"]').click();await text.fill('오늘 친구들과 함께 책을 읽었다.');
    await d.locator('[data-save]').click();await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('저장했어요'));
    assert.equal(await d.locator('#classroom-diary-comment').isDisabled(),true);
    await d.locator('[value="class"]').check();await d.locator('[data-save]').click();
    await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('저장했어요'));
    await store.act('uid-S2',{classId:'demo',memberUserId:'S2',ownerId:'S1',dateKey:'2026-10-17',action:'comment',commentId:'friend-comment',text:'나도 재미있었어! <img src=x onerror=alert(1)>'});
    await d.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-comment-count]').textContent==='1');
    assert.equal(await d.locator('.diary-comment-copy img').count(),0,'Comment text must never become HTML');
    assert.match(await d.locator('.diary-comment-copy').innerText(),/<img/);
    await store.act('uid-S2',{classId:'demo',memberUserId:'S2',ownerId:'S1',dateKey:'2026-10-17',action:'editComment',commentId:'friend-comment',revision:1,text:'나도 재미있었어! 내일도 같이 읽자.'});
    await d.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('.diary-comment-copy p')?.textContent.includes('내일도 같이'));
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+1),`Diary overflows at ${width}`);
      if(width!==320)await shot('diary-comments-'+width);
      if(width===390){await d.locator('.diary-comments').scrollIntoViewIfNeeded();await shot('diary-comments-390-bottom');await d.evaluate(n=>n.scrollTop=0);}
    }
    await page.setViewportSize({width:1440,height:1000});
    await text.fill('미저장 일기');await d.locator('[data-friends]').click();assert(await d.locator('.diary-discard').isVisible());
    await d.locator('[data-keep]').click();assert.equal(await text.inputValue(),'미저장 일기');
    failNext=true;await d.locator('[data-save]').click();await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('연결 실패'));
    assert.equal(await text.inputValue(),'미저장 일기','A failed save must preserve draft');
    await d.locator('[data-friends]').click();await d.locator('[data-discard]').click();
    await d.locator('.diary-friend-entry').filter({hasText:'민준'}).click();await page.waitForFunction(()=>document.querySelector('#classroom-diary-heading').textContent.includes('민준'));
    assert(await d.locator('[data-save]').isHidden());assert(await text.isDisabled());
    const comment=d.locator('#classroom-diary-comment');await comment.fill('정말 재미있겠다!');dropCommentReply=true;
    assert(await d.locator('[data-mine]').isEnabled(),'Draft navigation remains available with discard confirmation');
    await d.locator('.diary-comment-form button').click();await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('응답 유실'));
    assert.equal(await comment.inputValue(),'정말 재미있겠다!');await d.locator('.diary-comment-form button').click();
    await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('등록했어요'));
    assert.equal(await d.locator('.diary-comment').count(),1,'Retry must show only one comment');
    await d.locator('.diary-comment-actions button').filter({hasText:'수정'}).click();
    assert(await comment.isDisabled(),'An inline edit cannot be overwritten by a new comment');
    await d.locator('[aria-label="댓글 수정"]').fill('내일 같이 읽자!');await d.getByRole('button',{name:'수정 저장',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('수정했어요'));assert.match(await d.locator('.diary-comment-copy').innerText(),/내일 같이/);
    assert(await comment.isEnabled(),'Finishing the inline edit restores comment entry');
    await d.locator('.diary-comment-actions button').filter({hasText:'삭제'}).click();await d.locator('[data-discard]').click();
    await page.waitForFunction(()=>document.querySelector('[data-comment-count]').textContent==='0');
    await d.locator('[data-mine]').click();await page.waitForFunction(()=>!document.querySelector('#classroom-diary-text').disabled);
    await text.fill('닫기 전에 확인');await page.keyboard.press('Escape');assert(await d.locator('.diary-discard').isVisible());await d.locator('[data-discard]').click();assert.equal(await d.count(),0);
    // Teacher can moderate shared entries but cannot see private entries.
    await page.evaluate(()=>{diaryMember='T1';openTestDiary({mode:'friends'});});
    await d.locator('.diary-friend-entry').filter({hasText:'민준'}).click();await page.waitForFunction(()=>!document.querySelector('[data-moderate]').hidden);
    await d.locator('[data-moderate]').click();await page.waitForFunction(()=>document.querySelector('.diary-status').textContent.includes('변경했어요'));
    assert.match(await d.locator('.diary-sharing-help').innerText(),/숨긴/);
    await d.locator('[data-close]').click();
    await page.evaluate(()=>{diaryMember='S1';openTestDiary({mode:'friends'});});
    await page.waitForFunction(()=>!document.querySelector('[data-friends]').disabled);
    assert.equal(await d.locator('.diary-friend-entry').filter({hasText:'민준'}).count(),0);
    await page.evaluate(()=>{diaryMember='S2';DJ48ClassroomState.resetClassroomRuntimeData();});assert.equal(await d.count(),0,'Logout/account change must remove diary DOM');
    if(output){
      await page.setViewportSize({width:1440,height:1000});
      await page.evaluate(()=>DJ48ClassroomPortrait.open({classId:'demo',getMemberUserId:()=> 'S1',getAuthUid:()=> 'uid-S1',getFunctions:()=>({httpsCallable:()=>async()=>({data:{success:true,portraitSource:'avatar',photoUrl:'/images/classroom/reading-sprout-320.webp',avatarUrl:'/coordi-shop/verified/female-1032038.png',savedLook:{itemCode:{skin:12000,hair:31000,face:21000}}}})})}));
      await page.waitForFunction(()=>!document.querySelector('[data-portrait-save]').disabled);
      await page.waitForFunction(()=>document.querySelector('[data-preview="avatar"] img')?.src.startsWith('data:image/png'));
      await page.screenshot({path:path.join(output,'portrait-choice-1440.png'),animations:'disabled'});
      await page.locator('.classroom-portrait-heading button').click();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS diary browser: real service with offline adapter, card entry, selected avatar, private/public saves, XSS text, comments/retry/edit/delete, dirty close/navigation, error drafts, moderation, account cleanup, 320–1440px layout.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
