'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const candidate=require('./town-ui-candidate-fixture');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.pathname.startsWith('/__/firebase/')) return route.fulfill({contentType:'application/javascript',body:''});
 if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"></head><body><button>Game control</button><script defer src="/js/player-status-shortcut.js"></script></body></html>'});
 const relative=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
 const p=process.env.TOWN_UI_STAGE && relative!=='/missing-profile.png' ? await candidate.file(relative) : path.resolve(process.env.STATUS_PUBLIC_DIR||'public','.'+relative);
 if((!process.env.TOWN_UI_STAGE&&!p.startsWith(path.resolve(process.env.STATUS_PUBLIC_DIR||'public')+'/'))||!fs.existsSync(p))return route.fulfill({status:404,body:''});
 if(process.env.STATUS_LEGACY_HTML && p.endsWith('/player-status/index.html')) {
   const old=fs.readFileSync(p,'utf8').replace(/<details id="quest-fold"[^>]*><summary>[\s\S]*?<\/summary>/,'').replace('</section></details><details class="status-help">','</section><details class="status-help">');
   return route.fulfill({contentType:'text/html; charset=utf-8',body:old});
 }
 return route.fulfill({path:p,contentType:p.endsWith('.js')?'application/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});
 });
 await context.addInitScript(()=>{
 let uid='test-a';window.testFail=false;window.questClaimed=false;window.claimCalls=0;window.testHold=location.pathname==='/fixture';window.pendingExtras=[];window.authSubscriptions=0;window.authCleanups=0;
 const doc=value=>({id:uid,exists:true,data:()=>value});
 window.DJ48AccountState={getCurrentMemberUserId:()=>uid};
 window.firebase={apps:[{}],auth:()=>({onAuthStateChanged:cb=>{window.authSubscriptions++;window.changeUser=next=>{uid=next;cb(next?{uid:next}:null);};queueMicrotask(()=>cb({uid}));return ()=>{window.authCleanups++;};}}),firestore:()=>({collection:name=>({where:()=>({limit:()=>({get:async()=>({size:1,docs:[{id:uid,data:()=>({nickname:uid,avatar:'🐱',rankingMessage:'함께 도전해요',profileImageUrl:'/missing-profile.png'})}]})})}),doc:()=>({get:async()=>doc(name==='users'?{authUid:uid,nickname:uid,avatar:'🐱',rankingMessage:'함께 도전해요'}:name==='userEconomy'?{djCoin:123}:{level:3,totalXp:115,xp:15,nextLevelXp:50})})})}),app:()=>({functions:()=>({httpsCallable:name=>async()=>{if(window.testHold)await new Promise(resolve=>window.pendingExtras.push(resolve));if(name==='claimEventQuestReward'){window.questClaimed=true;window.claimCalls++;return {data:{success:true}};}if(window.testFail&&name==='getEventProgress')throw Error('offline');return {data:name==='getDailyRewardStatus'?{coin:{used:7,limit:50},todayQuizXp:{used:4,limit:20},weeklyXp:{used:22,limit:500}}:{seasonClaimLimit:8,seasonKey:'2026-09',seasonEvents:[{title:'지정 시즌 테스트',desc:'관리자 지정 내용',period:'2026년 9월',quizIds:['reading']}],quests:[{questId:'v2_daily_practice',title:'테스트 정답 10개',scope:'daily',current:10,target:10,xpReward:15,rewardCoin:10,claimable:!window.questClaimed,claimed:window.questClaimed,status:window.questClaimed?'수령 완료':'보상 받기'},{title:'주간 전용',scope:'weekly',current:0,target:20},{title:'월간 온라인 테스트',scope:'season',current:10,target:100,xpReward:50,rewardCoin:40}]}};}})})};
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>console.error('PAGE',e.message));await page.goto('https://status.test/fixture');
 assert.equal(await page.locator('iframe').count(),0);
 await page.getByRole('button',{name:'내 상태'}).click();
 const frame=page.frameLocator('iframe');await frame.getByText('보유 DJ코인 123',{exact:true}).waitFor();
 assert.equal(await frame.locator('#quests article').count(),0,'Basic profile must render before slow quest/reward responses');
 assert.equal(await page.evaluate(()=>window.authSubscriptions),1,'Embedded status reuses parent auth');
 await page.evaluate(()=>{window.testHold=false;window.pendingExtras.splice(0).forEach(resolve=>resolve());});await frame.getByText('테스트 정답 10개',{exact:true}).waitFor({state:'attached'});
 assert.equal(await frame.getByText('테스트 정답 10개',{exact:true}).count(),1);assert.equal(await frame.getByText('주간 전용',{exact:true}).count(),1);assert.equal(await frame.getByText('월간 온라인 테스트',{exact:true}).count(),0);assert.equal(await frame.locator('[data-scope=season]').count(),0);assert.equal(await frame.getByText('오늘의 퀴즈 XP',{exact:false}).count(),0);await frame.getByText('함께 도전해요',{exact:true}).waitFor();assert.equal(await frame.locator('#earnings details').getAttribute('open'),null);
 await frame.locator('#quest-fold > summary').click();await frame.getByRole('button',{name:'보상 받기',exact:true}).click();await frame.locator('.quest-headline').getByText('수령 완료',{exact:true}).waitFor();assert.equal(await frame.getByRole('button',{name:'보상 받기',exact:true}).count(),0);
 await page.getByRole('button',{name:'개인 상태 닫기'}).click();await page.locator('iframe').waitFor({state:'detached'});assert.equal(await page.locator('iframe').count(),0);await page.waitForFunction(()=>window.authCleanups===1);assert.equal(await page.getByRole('button',{name:'내 상태'}).getAttribute('aria-expanded'),'false');
 assert.equal(await page.getByRole('button',{name:'🎯 퀘스트',exact:true}).count(),0);await page.getByRole('button',{name:'내 상태',exact:true}).click();await frame.getByRole('heading',{name:'내 상태',exact:true}).waitFor();
 await frame.locator('#quest-fold > summary').click();await frame.getByRole('button',{name:'이번 주',exact:true}).click();assert(await frame.getByText('주간 전용',{exact:true}).isVisible());assert.equal(await frame.getByText('테스트 정답 10개',{exact:true}).isVisible(),false);assert.equal(await frame.getByText('✨ 지정 시즌 테스트',{exact:true}).count(),0);
 await frame.getByText('지금 수령 가능한 기본 보상 · DJ코인 0 / XP 0',{exact:true}).waitFor();
 await page.getByRole('button',{name:'개인 상태 닫기'}).click();
 await page.goto('https://status.test/player-status/');await page.getByText('보유 DJ코인 123',{exact:true}).waitFor();
 await page.evaluate(()=>{window.testFail=true});await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByText('일부 기록을 가져오지 못했어요. 새로고침으로 다시 확인해 주세요.',{exact:true}).waitFor();assert.equal(await page.getByText('보유 DJ코인 123',{exact:true}).count(),1);
 await page.evaluate(()=>window.changeUser(null));await page.getByText('퀴즈타운에 로그인하면 내 기록을 볼 수 있어요.',{exact:true}).waitFor();assert.equal(await page.locator('#profile').innerText(),'');assert.equal(await page.locator('#quests').innerText(),'');
 await page.evaluate(()=>{window.testFail=false;window.changeUser('test-b');});await page.getByRole('heading',{name:'test-b',exact:true}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#earnings summary').click();await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByText('보유 DJ코인 123',{exact:true}).waitFor();await page.locator('#earnings details').waitFor();assert(await page.locator('#earnings details').evaluate(n=>n.open));
 await page.screenshot({path:'/tmp/player-status-mobile.png',fullPage:true});
 await page.evaluate(()=>{window.testHold=true;});await page.getByRole('button',{name:'새로고침',exact:true}).click();
 await page.getByText('보유 DJ코인 123',{exact:true}).waitFor();
 await page.getByText('일부 기록을 가져오지 못했어요. 새로고침으로 다시 확인해 주세요.',{exact:true}).waitFor({timeout:16000});
 assert(await page.getByText('보유 DJ코인 123',{exact:true}).isVisible(),'Timed-out optional calls must retain basics');
 assert.equal(await page.getByRole('button',{name:'새로고침',exact:true}).isDisabled(),false);

 await context.close();console.log('PASS lazy panel, close/unload, actual field mapping, daily/weekly quests and claim refresh, partial failure, logout clearing, account switch, mobile width');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
