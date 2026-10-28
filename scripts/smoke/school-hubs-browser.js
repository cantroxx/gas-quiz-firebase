const path=require('path');const publicRoot=process.env.SCHOOL_PUBLIC_DIR||'public';const asset=file=>fs.existsSync(path.join(publicRoot,file))?path.join(publicRoot,file):path.join('public',file);
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const {chromium}=require(process.cwd()+'/node_modules/playwright-core');
const source=fs.readFileSync('functions/index.js','utf8');const fn=source.slice(source.indexOf('function publicExternalQuizzes'),source.indexOf('function isIsoMonthKey'));const context={MAX_EXTERNAL_QUIZ_ITEMS:20,normalizeExternalQuizUrl:v=>v};vm.createContext(context);vm.runInContext(fn,context);const normalized=context.publicExternalQuizzes({items:[{title:'old',url:'https://example.org'}],concept:{month:9,theme:'경제'}});assert.equal(normalized.items[0].group,'learning');assert.equal(normalized.concept.theme,'경제');assert.equal(context.publicExternalQuizzes({concept:{month:90}}).concept.month,12);
context.beforeExternal=normalized;
const toggleStart=source.indexOf('const nextExternal = publicExternalQuizzes');
const toggleEnd=source.indexOf('    const changed',toggleStart);
vm.runInContext(source.slice(toggleStart,toggleEnd)+'; globalThis.toggled=nextExternal;',context);
assert.equal(context.toggled.concept.theme,'경제');assert.equal(context.toggled.items[0].active,false);
(async () => {
 const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1050}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='http://127.0.0.1:5328')return route.fulfill({body:''});
   if(url.pathname==='/subject-quiz/')return route.fulfill({contentType:'text/html',body:'<p>Same-tab subject destination</p>'});
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(asset('index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
   return fs.existsSync(asset(url.pathname))?route.fulfill({path:asset(url.pathname)}):route.fulfill({status:404,body:''});
  });
  await page.goto('http://127.0.0.1:5328/');
  for(const file of ['app.bundle.js','battle-hub.js','school-rooms.js','town-spatial.js'])await page.addScriptTag({path:asset('js/'+file)});
  await page.evaluate(()=>{
   const catalog=DJ48QuizCatalog;
   window.member='fixture-a';window.flags={externalQuizzesEnabled:true,rankingEnabled:true}; window.popularAllowed=true; window.visits=[];window.configReads=0;window.configFail=false;
   window.config={items:[
    {title:'분수 탐험',description:'조각을 움직이며 분수의 크기를 비교해요.',url:'https://example.org/fraction',active:true},
    {title:'우리 동네 경제',description:'가게를 운영하며 돈의 흐름을 알아봐요.',url:'https://example.org/economy',group:'learning',active:true},
    {title:'경제 퀴즈',description:'물건의 가격과 현명한 소비를 생각해요.',url:'https://example.org/concept',group:'concept',active:true},
    {title:'숨김',url:'https://example.org/hidden',group:'learning',active:false},
    {title:'위험한 링크',url:'javascript:alert(1)',group:'learning'}],concept:{month:9,theme:'경제'}};
   window.enter=({viewId})=>document.querySelectorAll('.app-view').forEach(view=>view.hidden=view.id!==viewId);
   window.renderDeps={subjectCatalog:catalog.SUBJECT_CATALOG,quizCatalog:catalog.QUIZ_CATALOG,featureFlags:flags,firebasePlayableQuizIds:new Set(Object.keys(catalog.QUIZ_CATALOG)),normalizeFirebaseQuizId:id=>id,isQuizEnabledByFlags:id=>id!=='science-general',getRankingModeOptionsForQuiz:id=>id==='spelling'?[{label:'일반',value:'normal'},{label:'원코',value:'onechance'},{label:'스피드',value:'speed'}]:[{label:'일반',value:'normal'}]};
   DJ48QuizRender.renderSchoolQuizCards(renderDeps);
   DJ48SchoolHubs.configure({
    loadConfig:async()=>{configReads++;if(configFail)throw Error('fixture offline');return config;}, loadFlags:async()=>flags,isAdmin:()=>false,
    subjectCatalog:catalog.SUBJECT_CATALOG,getRenderDeps:()=>renderDeps,memberId:()=>member,
    showSchoolView:()=>enter({viewId:'school-view'}),enterView:enter,ensurePopularSubjectAccess:async()=>popularAllowed,
    showQuizSelectView:id=>{visits.push(['select',id]);enter({viewId:'quiz-select-view'});},
    startQuiz:async(...args)=>{visits.push(['start',...args]);enter({viewId:'quiz-play-view'});},
    setSubject:id=>{window.subject=id;},setLastQuiz:id=>{window.lastQuiz=id;},
    refreshPopularUsageNotices:()=>document.querySelectorAll('[data-popular-usage-notice]').forEach(node=>{node.textContent='오늘 이용 가능 시간 10분';})
   });enter({viewId:'school-view'});
  });
  const room=page.locator('#school-room-view');
  await page.locator('#school-view [data-battle-hub] button').click();
  assert.equal(await room.getAttribute('data-room'),'games');
  await room.getByRole('button',{name:'← 학교로 돌아가기',exact:true}).click();
  await page.locator('[data-school-hub="subjects"]').focus();await page.keyboard.press('Enter');
  await room.locator('.room-card').first().waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await room.locator('.room-nav-button').count(),4);
  const spelling=room.locator('.room-card').filter({has:page.getByRole('heading',{name:'맞춤법',exact:true})});
  assert.equal(await spelling.getByRole('link').getAttribute('href'),'/subject-quiz/?subject=korean&group=spelling');
  assert.equal(await room.locator('a[href^="/subject-quiz/"][target="_blank"]').count(),0);
  assert.equal(await room.locator('.room-ranking-modes').count(),0);
  await page.evaluate(()=>DJ48SchoolHubs.open('subjects',{subject:'math'}));assert.equal(await room.getByRole('button',{name:'수학',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await room.locator('a[href="/pizza-assessment/"]').count(),0);
  await page.evaluate(()=>{flags.rankingEnabled=false;return DJ48SchoolHubs.open('subjects',{subject:'korean'});});assert.equal(await room.locator('.room-ranking-modes').count(),0);
  await page.evaluate(()=>{flags.rankingEnabled=true;popularAllowed=false;});
  await page.evaluate(()=>DJ48SchoolHubs.open('learning'));assert.equal(await room.locator('.room-card').count(),2);assert.equal(await room.locator('a[target="_blank"][rel="noopener noreferrer"]').count(),2);
  const before=await page.evaluate(()=>configReads);await page.evaluate(()=>DJ48SchoolHubs.open('concept'));assert.equal(await room.getAttribute('data-room'),'learning');assert.equal(await room.locator('a[href="https://example.org/concept"]').count(),0);assert.equal(await page.locator('[data-school-hub="concept"]').count(),0);assert.equal(await page.evaluate(()=>configReads),before);
  await page.evaluate(()=>{flags.externalQuizzesEnabled=false;return DJ48SchoolHubs.open('learning');});assert.match(await room.innerText(),/점검 중/);assert.equal(await room.locator('a').count(),0);
  await page.evaluate(()=>{flags.externalQuizzesEnabled=true;});
  await page.evaluate(()=>{configFail=true;return DJ48SchoolHubs.open('learning',{refresh:true});});await room.getByRole('button',{name:'다시 불러오기'}).waitFor();
  await page.evaluate(()=>{configFail=false;});await room.getByRole('button',{name:'다시 불러오기'}).click();await room.locator('.room-card').first().waitFor();
  await page.evaluate(()=>DJ48SchoolHubs.open('games'));assert.equal(await room.locator('.room-card').count(),9);await room.getByRole('button',{name:'함께 하기',exact:true}).click();assert.equal(await room.locator('.room-card').count(),5);
  await room.getByRole('button',{name:'← 학교로 돌아가기',exact:true}).click();await page.locator('[data-battle-hub] button').click();assert.equal(await room.getAttribute('data-room'),'games');assert.equal(await room.getByRole('button',{name:'함께 하기',exact:true}).getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>{member='fixture-b';return DJ48SchoolHubs.open('subjects');});assert.equal(await room.locator('.room-recent').count(),0);
  await page.evaluate(()=>{config.concept.theme='경제';DJ48AdminRender.renderAdminExternalQuizRows(config,{normalizeExternalQuizzes:x=>x,maxRows:5});});const saved=await page.evaluate(()=>DJ48AdminForm.getAdminExternalQuizzesFormValues());assert.equal(saved.items[0].group,'learning');assert.equal(saved.concept.theme,'경제');
  const out=process.env.SCHOOL_SCREENSHOT_DIR||'docs/product/school-rooms-review';fs.mkdirSync(out,{recursive:true});
  for(const hub of ['subjects','learning','games']){
   await page.evaluate(hub=>DJ48SchoolHubs.open(hub,{refresh:true}),hub);await page.waitForTimeout(60);await room.screenshot({path:`${out}/${hub}-desktop.png`});
  }
  await page.setViewportSize({width:390,height:844});
  for(const hub of ['subjects','games']){await page.evaluate(hub=>DJ48SchoolHubs.open(hub),hub);await page.waitForTimeout(60);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await room.screenshot({path:`${out}/${hub}-mobile.png`});}
  await page.evaluate(()=>DJ48SchoolHubs.open('subjects',{subject:'korean'}));
  const pagesBefore=browser.contexts()[0].pages().length;
  await room.locator('a[href^="/subject-quiz/"]').first().click();await page.waitForURL('**/subject-quiz/**');
  assert.equal(browser.contexts()[0].pages().length,pagesBefore,'subject entry must stay in the same tab');
  const direct=await browser.newPage();await direct.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:new URL(route.request().url()).pathname==='/popular-quiz/'?'<h1>사진 퀴즈 클럽 도착</h1>':'<div id="school-quiz-grid"><button data-school-hub="popular">인기 퀴즈</button></div><div id="school-room-view"></div>'}));
  for(const via of ['door','navigation']){await direct.goto('http://127.0.0.1:5328/');await direct.addScriptTag({path:asset('js/school-rooms.js')});await direct.evaluate(()=>DJ48SchoolHubs.configure({memberId:()=>'',enterView:()=>{throw Error('Intermediate room must not render');}}));if(via==='door')await direct.getByRole('button',{name:'인기 퀴즈',exact:true}).click();else await direct.evaluate(()=>DJ48SchoolHubs.open('popular'));await direct.waitForURL('**/popular-quiz/');await direct.getByRole('heading',{name:'사진 퀴즈 클럽 도착'}).waitFor();}await direct.close();
  assert.deepEqual(errors,[]);console.log('PASS school interiors: four rooms + classroom, subject filters, direct practice/ranking, mode support, feature/access guards, external links/cache/retry, game filters, recent account scope, admin config, mobile/keyboard. Screenshots use synthetic external activities.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
