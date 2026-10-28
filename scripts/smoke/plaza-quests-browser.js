'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),Q=require('../../functions/growth/quests');
const origin='https://plaza.test',out=path.resolve(process.env.PLAZA_REVIEW_DIR||'docs/product/plaza-quests-2026-10-19');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   const relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
   const candidate=process.env.PLAZA_PUBLIC_ROOT&&path.join(process.env.PLAZA_PUBLIC_ROOT,relative);
   const file=candidate&&fs.existsSync(candidate)?candidate:path.join(process.cwd(),'public',relative);
   if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
   return route.fulfill({path:file});
  });
  await page.goto(origin);await page.addScriptTag({url:origin+'/js/app.bundle.js'});
  const quests=Q.rows({counts:{practiceCorrect:10,rankingScore:20,towerClear:10,survivorScore:1000,bombWin:1}},{counts:{practiceCorrect:40,rankingDays:3,towerDays:3,survivorScore:10000,bombWin:3},days:['2026-10-19','2026-10-20','2026-10-21']});
  await page.evaluate(quests=>{
   window.showView=id=>document.querySelectorAll('.app-view').forEach(v=>v.hidden=v.id!==id);
   window.showEventView=async()=>showView('event-view');
   window.DJ48AccountState={getCurrentMemberUserId:()=> 'fixture',getFirebaseAuthUser:()=>({uid:'fixture-auth'})};
   window.mission={id:'fixture-reward',title:'함께 책상 정리',instruction:'책상을 정리하고 확인해요.',mode:'individual',target:1,rewardCoin:5,xpReward:10,current:0,participated:false,claimed:false};
   window.calls=[];
   window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async p=>{
    calls.push({name,p});if(name==='specialRewardAction'){if(p.action==='participate')mission.participated=true;if(p.action==='claim')mission.claimed=true;return {data:{items:[mission]}};}
    if(name==='adminSpecialRewardAction')return {data:{items:[]}};return {data:{}};
   }})};
   window.claims=[];DJ48EventController.bindEventPlazaEvents({claimEventQuestReward:id=>claims.push(id)});
   DJ48EventRender.renderEventSections({quests});
   DJ48RankingRender.renderRankingCards([{icon:'🏆',category:'국어왕',nickname:'합성 친구',title:'20점',rank:'1위'}]);
   DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards:[{id:'quizKing',label:'퀴즈왕',rows:[{nickname:'합성 친구',totalScore:100}]}]});
   DJ48QuizRender.renderSchoolQuizCards({subjectCatalog:DJ48QuizCatalog.SUBJECT_CATALOG,quizCatalog:DJ48QuizCatalog.QUIZ_CATALOG,featureFlags:{},firebasePlayableQuizIds:new Set(),normalizeFirebaseQuizId:id=>id,isQuizEnabledByFlags:()=>true,getRankingModeOptionsForQuiz:()=>[]});
  },quests);
  await page.addScriptTag({url:origin+'/js/town-spatial.js'});await page.addScriptTag({url:origin+'/js/special-rewards.js'});
  const show=id=>page.evaluate(id=>showView(id),id);
  page.on('dialog',d=>d.accept());
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await show('event-view');
   await page.locator('#event-view .spatial-quick-actions [data-spatial-action="quests"], #event-view .spatial-room-actions [data-spatial-action="quests"]').first().count();
   await page.locator('#event-view [data-spatial-action="quests"]').first().click();
   assert.equal(await page.locator('#quest-card-grid .quest-card').count(),5);
   await page.getByRole('button',{name:'주간퀘스트',exact:true}).click();
   assert.equal(await page.locator('#quest-card-grid .quest-card').count(),7);
   assert.equal(await page.locator('#quest-card-grid .ranking-mode-filter-box').count(),0);
   await page.screenshot({path:path.join(out,'weekly-'+width+'.png')});
   await page.getByRole('button',{name:'일일퀘스트',exact:true}).click();
   await page.locator('[data-quest-claim-id="v2_daily_practice"]').click();
   await page.screenshot({path:path.join(out,'daily-'+width+'.png')});
   await page.keyboard.press('Escape');
   await page.locator('#event-view [data-spatial-action="special-rewards"]').first().click();
   await page.getByText('함께 책상 정리',{exact:true}).waitFor();
   await page.screenshot({path:path.join(out,'special-'+width+'.png')});await page.keyboard.press('Escape');
  }
  assert.equal(await page.evaluate(()=>claims.length),2);
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});await show('ranking-view');
   assert.equal(await page.locator('#ranking-view .spatial-quick-actions').count(),0);
   assert.equal(await page.locator('#ranking-view button').filter({hasText:'특별한 보상'}).count(),0);
   const shortcut=page.locator('#ranking-view .spatial-scene .ranking-map-quest');
   await shortcut.scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,'ranking-quest-map-'+width+'.png')});
   await shortcut.click();
   assert(await page.locator('#spatial-panel-quests').isVisible());
   await page.keyboard.press('Escape');
  }
  await page.locator('#event-view [data-spatial-action="special-rewards"]').first().click();
  await page.getByRole('button',{name:'미션을 했어요',exact:true}).click();
  await page.getByRole('button',{name:'보상 받기',exact:true}).click();
  await page.getByRole('button',{name:'수령 완료',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>calls.filter(c=>c.p.action==='claim').length),1);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{
    window.DJ48SubjectQuiz={};
    const rows=['korean','math','social','science'].map((subject,i)=>({subject,cumulative:true,nickname:'합성 친구 '+(i+1),score:30-i}));
    const boards=DJ48RankingData.getRankingBoardModels([],rows,[],{});
    DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards});
    DJ48RankingRender.renderRankingCards(['국어','사회','수학','과학','포켓몬','티니핑','국기'].map((name,i)=>({category:name+'왕',rank:'1위',icon:'🏆',nickname:'합성 친구 '+(i+1),title:'오늘의 기록'})));
  });
  await page.addScriptTag({url:origin+'/js/ranking-visibility.js'});
  await page.addScriptTag({url:origin+'/js/hideout-ranking-plaza.js'});
  await show('ranking-view');
  await page.locator('#ranking-view [data-spatial-action="ranking"]').first().click();
  assert.equal(await page.locator('[data-ranking-board-id="popular"]').count(),0);
  assert.equal(await page.locator('.ranking-mode-filter-box').count(),0);
  assert.equal(await page.locator('[data-ranking-board-id="hideout"]').count(),1);
  assert(await page.locator('#spatial-panel-ranking .plaza-header-refresh').isVisible());
  await page.screenshot({path:path.join(out,'ranking-390.png')});await page.keyboard.press('Escape');
  await page.locator('#ranking-view [data-spatial-action="hall"]').first().click();
  await page.waitForFunction(()=>document.querySelectorAll('.ranking-hall-grid .ranking-card').length===8);
  await page.screenshot({path:path.join(out,'hall-390.png')});
  assert.deepEqual(errors,[]);console.log('PASS daily/weekly tabs, claims, special mission participation and claim, ranking shortcuts, mobile/desktop screenshots');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
