'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
const source=process.env.EVENT_PUBLIC_DIR||'public';
const publicFile=file=>fs.existsSync(source+'/'+file)?source+'/'+file:'public/'+file;
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://event.local')return route.fulfill({body:''});if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(publicFile('index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});const file=publicFile(url.pathname.slice(1));return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});});
 await page.goto('http://event.local/');
 await page.evaluate(()=>document.querySelectorAll('.app-view').forEach(el=>el.hidden=el.id!=='event-view'));
 for(const file of ['js/domain/event-domain.js','js/features/event-render.js','js/features/event-controller.js'])await page.addScriptTag({path:publicFile(file)});
 await page.evaluate(()=>{
   window.claimed=[]; window.refreshes=0;
   DJ48EventController.bindEventPlazaEvents({claimEventQuestReward:id=>claimed.push(id)});
   const q={questId:'season3_test_studyCorrect',title:'스터디 타운 정답',scope:'season',current:10,target:10,progress:'10/10',reward:'XP +50 · DJ코인 +40',claimable:true,status:'보상 받기'};
   window.sample={dateKey:'2026-10-17',quests:[{questId:'v2_daily_study',title:'일일 퀘스트',scope:'daily',current:1,target:8,reward:'5 DJ코인',status:'진행 중'},q],legacySeasonKey:'2026-09',legacyQuests:[
     {...q,questId:'v2_season_study',title:'이전 월간 학습'},
     {...q,questId:'v2_season_done',title:'이미 받은 보상',claimed:true,claimable:false},
     {...q,questId:'v2_season_incomplete',title:'미완료 퀘스트',current:1,claimable:false}
   ],seasonEvents:[{key:'test',title:'관리자 독서 시즌',period:'2026년 10월',desc:'지정 시즌',quizIds:['reading'],quests:[q],rankingRule:'달성 조건 수',leaderboard:[{nickname:'학생',completedGoals:1}]}]};
   DJ48EventRender.renderEventSections(sample);
   DJ48EventRender.renderEventStatus('',false,()=>refreshes++);
 });
 assert.equal(await page.locator('#event-cycle-guide').count(),0);
 const toggle=page.locator('#event-quest-toggle'),daily=page.locator('#quest-card-grid');
 const seasonToggle=page.locator('#event-season-toggle'),seasons=page.locator('#season-event-grid');
 assert(await seasons.isHidden(),'Only daily quests are open initially');
 assert.equal(await toggle.count(),0,'Duplicate quest collapse toggle is removed');
 assert(await daily.isVisible());
 await page.evaluate(()=>DJ48EventRender.renderEventSections({...sample,dateKey:'2026-10-18'}));assert(await daily.isVisible(),'Refresh keeps quests visible');
 assert.equal(await daily.locator('[data-quest-id="season3_test_studyCorrect"]').count(),0);
 assert.equal(await seasonToggle.count(),0,'Retired season entry is absent');assert(await seasons.isHidden());assert.equal(await page.locator('a[href="#season-event-heading"]').count(),0);
 const opener=page.locator('#event-unclaimed-button'),dialog=page.locator('#event-unclaimed-dialog');
 assert.equal(await opener.innerText(),'미수령 보상 (1) ▾');assert(await dialog.isHidden());
 assert.equal(await page.locator('#season-event-grid #legacy-season-quest-grid').count(),0);
 await page.locator('#event-refresh-button').click();assert.equal(await page.evaluate(()=>refreshes),1);
 await opener.click();assert(await dialog.isVisible());assert.equal(await dialog.locator('.quest-card').count(),1);
 assert(await dialog.getByText('이전 월간 학습',{exact:true}).isVisible());
 await page.keyboard.press('Escape');assert(await dialog.isHidden());assert(await opener.evaluate(el=>el===document.activeElement));
 await opener.click();await dialog.getByRole('button',{name:'보상 받기'}).click();assert.deepEqual(await page.evaluate(()=>claimed),['v2_season_study']);
 await page.evaluate(()=>{sample.legacyQuests[0].claimed=true;sample.legacyQuests[0].claimable=false;DJ48EventRender.renderEventSections(sample);DJ48EventRender.renderEventStatus('',false,()=>refreshes++);});
 assert(await dialog.isHidden(),'Last claim closes dropdown');assert(await opener.isHidden());
 assert(await page.locator('#event-refresh-button').evaluate(el=>el===document.activeElement));
 await page.evaluate(()=>{sample.legacyQuests[0].claimed=false;sample.legacyQuests[0].claimable=true;DJ48EventRender.renderEventSections(sample);});
 for(const width of [1440,390,320]) {
   await page.setViewportSize({width,height:900});
   await page.locator('.event-section').screenshot({path:`/tmp/event-sections-${width}.png`});
   await opener.click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));
   const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width);
   await page.screenshot({path:`/tmp/event-rewards-${width}.png`,fullPage:true});
   await dialog.getByRole('button',{name:'닫기'}).click();
 }
 await opener.click();await page.evaluate(()=>document.getElementById('event-view').hidden=true);await dialog.waitFor({state:'hidden'});
 await page.evaluate(()=>{document.getElementById('event-view').hidden=false;DJ48EventRender.renderEventSections({quests:[]});DJ48EventRender.renderEventStatus('',true);});
 assert(await opener.isDisabled());assert.equal(await dialog.locator('.quest-card').count(),0,'New account/loading clears old rewards');
 await page.evaluate(()=>DJ48EventRender.renderEventStatus('',false));assert(await opener.isHidden());assert(await dialog.isHidden());
 assert.deepEqual(errors,[]);
 await page.addScriptTag({path:publicFile('js/features/ranking-data.js')});await page.addScriptTag({path:publicFile('js/features/ranking-render.js')});
 await page.evaluate(()=>{const root=document.createElement('div');root.id='integrated-ranking';document.body.append(root);const groups=DJ48RankingData.buildSeasonRankingGroups([],[{eventId:'mixed',active:true,title:'통합 시즌',quizIds:[],goals:[{},{}],leaderboard:[{nickname:'가',completedGoals:2},{nickname:'나',completedGoals:2},{nickname:'다',completedGoals:1}]}]);DJ48RankingRender.renderRankingBoardPanel(root,{id:'season',groups});});assert.equal(await page.locator('#integrated-ranking .ranking-medal-badge').filter({hasText:'1위'}).count(),2);assert.equal(await page.locator('#integrated-ranking .ranking-card-score').filter({hasText:'2/2개 달성'}).count(),2);
 console.log('PASS event cleanup: no duplicate quest toggle, immediately visible cards, conditional reward dropdown/count/empty state, claim delegation and refresh, focus restoration, account reset, view exit, mobile, retired season entry hidden, preserved historical data renderer.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
