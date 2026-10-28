'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),C=require('../../functions/achievements/catalog');
(async()=>{
 const out=path.resolve('docs/product/achievements-2026-10-19');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://achievement.test/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><body style="padding:16px;background:#f7f2e7"><h1>나의 성장 기록</h1><div id="name" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"></div><h2>새 타이틀</h2><div id="titles" class="collection-grid"></div><h2>연습기록</h2><div id="practice"></div><script src="/js/features/ranking-render.js"></script><script src="/js/features/home-render.js"></script></body></html>'});
  const file=path.join(process.env.ACHIEVEMENTS_PUBLIC_ROOT||path.join(process.cwd(),'public'),url.pathname);return route.fulfill({path:file});
 });
 await page.goto('https://achievement.test/');
 await page.evaluate(async()=>{await document.fonts.load('13px Jua','국어 초보');await document.fonts.ready;if(!document.fonts.check('13px Jua','국어 초보'))throw Error('Jua font not loaded');});
 const sample=[...C.titles.filter(t=>t.area==='korean'),C.titles.find(t=>t.area==='pokemon-gen3'),...['math','social','science','flag-country','idol','anime','tiniping'].map(area=>C.titles.find(t=>t.area===area))];
 await page.evaluate(titles=>{
  DJ48RankingRender.appendRankingDisplayName(document.querySelector('#name'),{nickname:'새싹친구',gameHonors:{stars:12,hearts:3}});
  document.querySelector('#name').prepend(DJ48RankingRender.createRankingTitleChip({selectedTitleId:titles[0].titleId,selectedTitleName:titles[0].titleName}));
  DJ48HomeRender.renderCollectionCards('titles',[{titleId:'old_title',legacy:true,name:'구 타이틀'},...titles.map(t=>({titleId:t.titleId,name:t.titleName,desc:t.conditionText,imageUrl:t.imageUrl,actionLabel:'대표로 선택'}))],'title-card');
  DJ48HomeRender.renderBadgeProgressGroups('practice',[{name:'국어',icon:'📚',group:'korean',desc:'누적 321번 답하기 · 완주 3회 · 다음 완주 21/100',starCount:3,progressPercent:21}]);
 },sample);
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.locator('img').evaluateAll(async images=>Promise.all(images.map(i=>i.decode())));assert(await page.locator('.game-honor-stars').isVisible());assert.equal(await page.locator('#titles .ranking-title-chip').count(),15);assert.equal(await page.locator('img').count(),0);assert.equal(await page.locator('#titles .quiz-title-chip').count(),14);assert.equal(await page.locator('#titles .quiz-title-chip').evaluateAll(chips=>new Set(chips.map(chip=>getComputedStyle(chip).color)).size),9);assert((await page.locator('#name .ranking-title-chip').boundingBox()).height<30);assert.equal(await page.getByText('구 타이틀',{exact:true}).count(),1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,`titles-${width}.png`),fullPage:true});}

 const legacy=page.locator('#titles details.legacy-title-group');
 assert.equal(await legacy.getAttribute('open'),null);
 assert.equal(await legacy.locator('article').first().isVisible(),false);
 await legacy.locator('summary').click();assert.equal(await legacy.locator('article').first().isVisible(),true);
 await legacy.locator('summary').press('Enter');assert.equal(await legacy.locator('article').first().isVisible(),false);
 const html=fs.readFileSync(path.join(process.env.ACHIEVEMENTS_PUBLIC_ROOT||path.join(process.cwd(),'public'),'index.html'),'utf8');
 if(html.includes('class="title-sync-control"')) {
  const section=html.match(/<section class="collection-panel home-detail-panel" data-home-detail-panel="titles"[\s\S]*?<\/section>/)[0];
  const fn=html.match(/    async function syncCurrentMemberTitlesFromHome\([^]*?\n    \}/)[0];
  await page.evaluate(({section,fn})=>{
   const root=document.createElement('div');root.innerHTML=section;root.querySelector('section').classList.add('is-active');document.body.append(root);
   window.DJ48AccountState={getCurrentMemberUserId:()=> 'test-member'};
   window.getProfileRepository=()=>({syncMemberTitlesForMember:async()=>({awardedTitles:[]})});
   window.renderHomeMemberDataFromFirestore=async()=>{};
   (0,eval)(fn+'\nwindow.checkTitleSync=syncCurrentMemberTitlesFromHome;');
   document.querySelector('#title-sync-button').addEventListener('click',event=>window.checkTitleSync(event.currentTarget));
  },{section,fn});
  assert.equal(await page.locator('#title-sync-status').isVisible(),false);
  await page.evaluate(()=>window.checkTitleSync());
  assert.equal(await page.locator('#title-sync-status').isVisible(),false);
  await page.locator('#title-sync-button').click();
  await page.waitForFunction(()=>document.querySelector('#title-sync-status').textContent==='새로 받을 타이틀은 없습니다.');
  assert.equal(await page.locator('.title-sync-control #title-sync-status').isVisible(),true);
  assert.equal(await page.locator('#title-sync-button').isEnabled(),true);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert((await page.locator('#title-list-heading').boundingBox()).height<36);if(width===390)await page.locator('[data-home-detail-panel="titles"]').screenshot({path:path.join(out,'title-panel-390.png')});}

 }
 const catalogCode=['getTitleCatalogGroupLabel','getTitleCatalogGroupOrder','renderTitleCatalogPanel'].map(name=>html.match(new RegExp('    function '+name+'\\([^]*?\\n    \\}'))[0]).join('\n');
 await page.evaluate(code=>{
  for(const id of ['modal-icon','modal-kicker','modal-title','modal-desc','modal-summary','modal-features']){const el=document.createElement('div');el.id=id;el.hidden=true;document.body.append(el);}
  window.renderPanelActions=()=>{};
  (0,eval)(code+'\nwindow.checkTitleCatalog=renderTitleCatalogPanel;');
  window.checkTitleCatalog([{titleId:'old_title',titleName:'예전 전용 칭호'},{titleId:'a26_math_practice_100',titleName:'수학 초보',subjectGroup:'math'}]);
 },catalogCode);
 assert.equal(await page.locator('#modal-features .title-catalog-item').count(),1);
 assert.equal(await page.locator('#modal-features').textContent().then(t=>t.includes('예전 전용 칭호')),false);
 await page.evaluate(titles=>{
  const preview=document.createElement('section');preview.id='theme-preview';preview.style.cssText='padding:24px;background:#fffdf5;width:680px;display:grid;gap:12px';
  const heading=document.createElement('h2');heading.textContent='퀴즈별 타이틀';preview.append(heading);
  for(const area of [...new Set(titles.map(t=>t.area))]){
   if(area.startsWith('pokemon-gen')&&area!=='pokemon-gen1')continue;
   const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
   for(const t of titles.filter(t=>t.area===area))row.append(DJ48RankingRender.createRankingTitleChip({selectedTitleId:t.titleId,selectedTitleName:t.titleName}));
   preview.append(row);
  }
  document.body.prepend(preview);
 },C.titles);
 await page.locator('#theme-preview').screenshot({path:path.join(out,'title-themes.png')});
 assert.deepEqual(errors,[]);console.log('PASS mobile/desktop achievement cards, simple text chips without nameplate images, honors, no overflow');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
