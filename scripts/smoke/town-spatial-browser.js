'use strict';
// Synthetic account/UI data only; production requests are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright-core');
const ORIGIN = 'https://spatial.test';
const OUT = path.resolve(process.env.TOWN_UI_REVIEW_DIR || 'docs/product/town-spatial-review-2026-10-18');
const candidate = require('./town-ui-candidate-fixture');
const prices = require('../../functions/coordi-shop/catalog.json');
const savedHair = 'hair-71530';
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    let purchases = 0;
    await page.route('**/*',async route=>{
      const url = new URL(route.request().url());
      if(url.origin !== ORIGIN) return route.abort();
      if(['/player-status/','/player-status/index.html'].includes(url.pathname)) return route.fulfill({contentType:'text/html',body:'<h1>합성 계정 내 상태</h1>'});
      if(url.pathname==='/fixture/call') {
        const {name,p}=route.request().postDataJSON();
        if(p.action==='purchase') purchases++;
        const data = name==='renderCoordiShopPreview' ? {success:true,imageUrl:'data:image/png;base64,'+fs.readFileSync('docs/product/town-avatar-mail-review-2026-10-18/hair-only.png').toString('base64')} : {success:true,balance:1000,profile:{owned:[savedHair],prisms:{},look:{gender:'female',equipped:{hair:savedHair}}},prices,version:'fixture',purchaseCoupons:20};
        return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});
      }
      const file = await candidate.file(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
      if(!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      if(url.pathname==='/') return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
      return route.fulfill({path:file});
    });
    await page.goto(ORIGIN);
    await page.addScriptTag({url:ORIGIN+'/js/app.bundle.js'});
    await page.addScriptTag({url:ORIGIN+'/js/battle-hub.js'});
    await page.evaluate(()=>{
      window.DJ48AccountState={getCurrentMemberUserId:()=> 'fixture',getFirebaseAuthUser:()=>({uid:'fixture-auth'})};
      window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async p=>(await fetch('/fixture/call',{method:'POST',body:JSON.stringify({name,p})})).json()})};
      window.spatialVisits=[];window.logoutCalls=0;document.querySelector('[data-member-unlink]').addEventListener('click',()=>logoutCalls++);
      window.spatialDetails=[];window.spatialClaims=[];
      window.uploadedProfileFile=null;window.selectedLegacyTitle=null;
      DJ48HomeController.bindProfileHomeEvents({loadHomeDetail:key=>spatialDetails.push(key),handleProfileImageUploadFile:async file=>{uploadedProfileFile=file.name;},selectTitle:async id=>{selectedLegacyTitle=id;}});
      DJ48EventController.bindEventPlazaEvents({claimEventQuestReward:id=>spatialClaims.push(id)});
      DJ48HomeRender.renderProfileCard('profile-card-root',{nickname:'새싹친구',avatar:'🐰',coinText:'0 DJ코인',titleName:'아직 없어요',badgeName:'아직 없어요',school:'4학년 8반',levelSummary:{level:1,xp:0,nextLevelXp:50,totalXp:0}});
      DJ48HomeRender.renderOwnedItems?.('owned-item-grid',[]);
      DJ48RankingRender.renderRankingCards(['랭킹전','게임','학습'].map((category,i)=>({category,nickname:['새싹친구','도토리','햇살'][i],icon:'🏆',rank:'1위',title:'도전의 기록'})));
      DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards:[{id:'quizKing',label:'랭킹전',title:'랭킹전 기록',rows:['새싹친구','이름이아주긴마을친구입니다','도토리'].map((nickname,i)=>({nickname,score:100-i*10}))}]});
      DJ48EventRender.renderEventSections({quests:[{questId:'ready',title:'새로운 배움에 도전하기',icon:'🌱',current:3,target:3,reward:'10 DJ코인',claimable:true},{questId:'progress',title:'차곡차곡 실력 쌓기',icon:'📚',current:0,target:5,reward:'20 DJ코인',claimable:false}],seasonEvents:[]});
      DJ48EventRender.renderEventStatus('',false,()=>{});
      DJ48QuizRender.renderSchoolQuizCards({subjectCatalog:DJ48QuizCatalog.SUBJECT_CATALOG,quizCatalog:DJ48QuizCatalog.QUIZ_CATALOG,featureFlags:{},firebasePlayableQuizIds:new Set(Object.keys(DJ48QuizCatalog.QUIZ_CATALOG)),normalizeFirebaseQuizId:id=>id,isQuizEnabledByFlags:()=>true,getRankingModeOptionsForQuiz:()=>[]});
      window.showSpatialView=id=>document.querySelectorAll('.app-view').forEach(node=>node.hidden=node.id!==id);
      document.addEventListener('click',event=>{
        const button=event.target.closest('[data-place]');
        if(button) { spatialVisits.push(button.dataset.place); showSpatialView(button.dataset.place+'-view'); }
        if(event.target.closest('[data-back-to-town]')) showSpatialView('town-view');
      });
    });
    await page.addScriptTag({url:ORIGIN+'/js/town-avatar.js'});
    await page.addScriptTag({url:ORIGIN+'/js/town-spatial.js'});
    await page.addScriptTag({url:ORIGIN+'/js/player-status-shortcut.js'});
    await page.evaluate(()=>{document.getElementById('town-friends-button').hidden=false;document.getElementById('town-friends-count').textContent='3';});
    const show=id=>page.evaluate(id=>showSpatialView(id),id);
    const shellSource=fs.readFileSync(await candidate.file('index.html'),'utf8');
    const sourceBetween=(start,end)=>shellSource.slice(shellSource.indexOf(start),shellSource.indexOf(end,shellSource.indexOf(start)));
    await page.addScriptTag({content:sourceBetween('    function bindInquiryUi()', '    // ---- 홈타운 소통:')+sourceBetween('    function setGlobalRefreshNeedsAttention','    function clearRuntimeDataCaches')+sourceBetween('    async function refreshCurrentAppData','    function openPlaceModal')+sourceBetween('    function updateTownSocialButton','    async function townSocialHeartbeat')});
    await page.evaluate(()=>{
      window.newsSeen=0;window.friendsOpened=0;
      window.clearRuntimeDataCaches=()=>{};window.loadFeatureFlags=window.loadNoticeBoardFromFirestore=window.loadExternalQuizzes=async()=>({});
      window.loadServerFreshnessSignature=async()=>'fixture-new';window.storeServerFreshnessSignature=()=>{};
      window.openPlaceModal=()=>newsSeen++;
      document.getElementById('global-refresh-button').onclick=refreshCurrentAppData;
      document.getElementById('town-friends-button').onclick=()=>friendsOpened++;
      updateTownSocialButton(4,2);
    });
    await show('town-view');
    await page.locator('#town-friends-button').click();assert.equal(await page.evaluate(()=>friendsOpened),1);
    assert.match(await page.locator('#town-friends-button').getAttribute('aria-label'),/4명.*2개/);
    assert(await page.locator('#btn-open-friends').isHidden(),'Duplicate friends button hidden when map people control is available');
    await page.evaluate(()=>setGlobalRefreshNeedsAttention(true));
    assert(await page.locator('#global-refresh-button').evaluate(el=>el.classList.contains('needs-refresh')));
    await page.locator('#global-refresh-button').click();await page.waitForFunction(()=>newsSeen===1);
    assert.equal(await page.locator('#global-refresh-button img').count(),1,'Refresh preserves icon');
    assert(!(await page.locator('#global-refresh-button').evaluate(el=>el.classList.contains('needs-refresh'))));
    const statusHost=page.locator('#dj48-player-status-shortcut');
    await statusHost.getByRole('button',{name:'내 상태',exact:true}).click();
    assert(await statusHost.getByRole('dialog').isVisible());
    assert.match(await statusHost.locator('iframe').getAttribute('src'),/player-status/);
    await page.keyboard.press('Escape');
    assert(await statusHost.getByRole('button',{name:'내 상태',exact:true}).evaluate(el=>el===el.getRootNode().activeElement));
    await page.evaluate(()=>{window.savedAvatarState=DJ48TownAvatar.getState;DJ48TownAvatar.getState=()=>({status:'empty',message:'아직 장착한 코디가 없어 위치 표시로 보여요.'});});
    await statusHost.getByRole('button',{name:'내 상태',exact:true}).click();
    assert(await statusHost.getByText('아직 장착한 코디가 없어 위치 표시로 보여요.').isVisible());
    await statusHost.getByRole('button',{name:'코디 상점 열기',exact:true}).click();
    assert(await page.locator('#shop-view').isVisible());
    assert(await statusHost.getByRole('dialog').isHidden());
    await page.evaluate(()=>{DJ48TownAvatar.getState=window.savedAvatarState;spatialVisits.length=0;});await show('town-view');
    assert.equal(await page.locator('#town-view .town-info-shortcuts').count(),0);
    assert.equal(await page.locator('#town-view .spatial-nav-label').count(),0);

    const capture=async(name,width)=>{
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>{window.scrollTo(0,0);document.documentElement.style.scrollBehavior='auto';});
      await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.waitForFunction(()=>[...document.querySelectorAll('.app-view:not([hidden]) .spatial-scene-art')].every(img=>img.complete&&img.naturalWidth>0));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow '+width);
      const height=await page.evaluate(()=>Math.max(1000,document.documentElement.scrollHeight));
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(OUT,`${name}-${width}.png`),animations:'disabled'});
    };
    for(const width of [1440,390,320]) {
      await show('login-view');await capture('login',width);
      assert(await page.locator('#member-link-submit-button').isVisible());
      await show('town-view');await page.evaluate(()=>setGlobalRefreshNeedsAttention(true));await page.waitForFunction(()=>document.querySelector('#town-view .spatial-guide').dataset.avatarState==='ready');await capture('town',width);
      const bounds=await page.locator('#town-view .town-map-frame').boundingBox();
      for(const el of [page.locator('#town-friends-button'),page.locator('#global-refresh-button'),statusHost.getByRole('button',{name:'내 상태',exact:true}),page.locator('#btn-open-inquiry')]) {
        const b=await el.boundingBox();assert(b.x>=bounds.x&&b.x+b.width<=bounds.x+bounds.width&&b.y>=bounds.y&&b.y+b.height<=bounds.y+bounds.height,'HUD inside map');
      }
      const mailbox=page.locator('.town-map-tools-bottom-left #btn-open-inquiry');
      const mb=await mailbox.boundingBox();assert(mb.width>=44&&mb.height>=44);
      assert(mb.x < bounds.x+bounds.width/2 && mb.y > bounds.y+bounds.height/2,'Mailbox bottom left');
      assert.equal(await page.locator('#btn-open-inquiry').count(),1);
      const mobileNav=page.locator('#town-view .map-buttons [data-place]');
      assert.equal(await mobileNav.count(),5);
      for(const button of await mobileNav.all())assert.equal(await button.isVisible(),width<=560,'Mobile destinations preserved');
      await mailbox.click();assert(await page.locator('#inquiry-modal').isVisible());
      await page.locator('#inquiry-modal button[data-close-inquiry]').click();
      assert(await page.locator('#inquiry-modal').isHidden());
      assert(await statusHost.locator('.town-status-art').isVisible());
      await statusHost.getByRole('button',{name:'내 상태',exact:true}).click();
      const dialogBox=await statusHost.getByRole('dialog').boundingBox();assert(dialogBox.x>=0&&dialogBox.x+dialogBox.width<=width);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({width:1440,height:1000});
    await show('town-view');
    await page.locator('.town-map [data-place="home"]').click();
    await page.waitForFunction(()=>spatialVisits.length===1);
    assert.deepEqual(await page.evaluate(()=>spatialVisits),['home']);
    await show('town-view');
    await page.locator('.town-map [data-place="shop"]').click();
    await page.locator('.town-map [data-place="school"]').click();
    await page.waitForFunction(()=>spatialVisits.length===2);
    assert.deepEqual(await page.evaluate(()=>spatialVisits),['home','school']);
    await show('town-view');
    await page.locator('.town-map [data-place="event"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>spatialVisits.at(-1)),'event');
    await page.emulateMedia({reducedMotion:'reduce'});await show('town-view');
    await page.locator('.town-map [data-place="ranking"]').click();
    assert.equal(await page.evaluate(()=>spatialVisits.at(-1)),'ranking');
    await show('town-view');
    await page.locator('.town-map [data-place="shop"]').click();
    assert.equal(await page.evaluate(()=>spatialVisits.at(-1)),'shop');
    if(process.argv.includes('--entry')) {console.log('PASS spatial entry');return;}
    for(const view of ['home','shop','event','ranking','school']) {
      await show(view+'-view');
      for(const width of [1440,390,320]) {
        await capture(view,width);
        assert.equal(await statusHost.locator('nav button').getAttribute('aria-label'),'내 상태');
        assert(await statusHost.evaluate(el=>!!el.closest('.place-map-frame')),'Status remains inside every place');
        const frameBounds=await page.locator('#'+view+'-view .place-map-frame').boundingBox();
        for(const control of [page.locator('#'+view+'-view .place-map-frame [data-back-to-town]'),statusHost.locator('nav button')]) {
          const b=await control.boundingBox();assert(b.width>=44&&b.height>=44&&b.x>=frameBounds.x&&b.y>=frameBounds.y&&b.x+b.width<=frameBounds.x+frameBounds.width&&b.y+b.height<=frameBounds.y+frameBounds.height,'Place controls inside map');
        }
      }
    }
    await show('home-view');
    await page.getByRole('button',{name:'로그아웃',exact:true}).click();
    assert(await page.getByText('로그아웃하시겠습니까?',{exact:true}).isVisible());
    await page.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await page.evaluate(()=>logoutCalls),0);
    await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.locator('.spatial-logout-dialog').getByRole('button',{name:'로그아웃',exact:true}).click();assert.equal(await page.evaluate(()=>logoutCalls),1);
    assert.equal(await page.locator('#profile-image-search-input,#profile-image-search-button').count(),0);

    assert.equal(await page.locator('#school-view .spatial-quick button').count(),5);
    assert.equal(await page.locator('#school-quiz-grid [data-popular-usage-notice]').count(),0,'No duplicate access notice below popular quiz');
    await show('town-view');
    await page.setViewportSize({width:320,height:900});
    assert(await page.locator('.town-map').evaluate(node=>node.clientWidth<=innerWidth));
    await page.locator('#town-view .spatial-zoom').click();
    await page.waitForFunction(()=>document.querySelector('.town-map').clientWidth>innerWidth);
    await page.locator('#town-view .spatial-zoom').click();
    // Touch has the same destination behavior, with the full map available at once.
    await show('home-view');
    assert(await page.locator('#home-view .spatial-scene').evaluate(node=>node.clientWidth<=innerWidth));
    await show('town-view');
    await page.locator('.town-map [data-place="home"]').tap();
    assert(await page.locator('#home-view').isVisible());
    await page.setViewportSize({width:1440,height:1000});
    const action=(view,key)=>page.locator(`#${view}-view .spatial-hotspot[data-spatial-action="${key}"]`);
    const close=async()=>{await page.locator('.spatial-panel[open] .spatial-close').click();};
    await show('home-view');
    await action('home','profile').click();
    assert(await page.locator('#profile-card-root').isVisible());
    await page.locator('[data-profile-detail-toggle="nickname"]').click();
    await page.locator('#profile-nickname-input').fill('입력 보존 확인');
    await page.keyboard.press('Escape');
    assert(await action('home','profile').evaluate(node=>node===document.activeElement));
    await action('home','profile').click();
    assert.equal(await page.locator('#profile-nickname-input').inputValue(),'입력 보존 확인');
    await page.locator('[data-profile-detail-toggle="image"]').click();
    await page.locator('#profile-image-upload-input').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:fs.readFileSync('docs/product/town-avatar-mail-review-2026-10-18/hair-only.png')});
    await page.waitForFunction(()=>uploadedProfileFile==='profile.png');
    await page.evaluate(()=>{const root=document.createElement('div');root.id='legacy-title-test';document.body.append(root);DJ48HomeRender.renderCollectionCards(root.id,[{titleId:'old-selected',name:'기존 수학왕',legacy:true,selected:true,actionLabel:'선택 중'},{titleId:'old-other',name:'기존 국어왕',legacy:true,actionLabel:'선택'},{titleId:'new',name:'새 칭호'}],'title-card');});
    assert.equal(await page.locator('#legacy-title-test .legacy-title-group > h4').innerText(),'(구)타이틀');
    assert.equal(await page.locator('#legacy-title-test .legacy-title-grid .title-card').count(),2);
    assert.equal(await page.locator('#legacy-title-test .is-selected h4').innerText(),'기존 수학왕');
    assert.equal(await page.locator('#legacy-title-test [data-select-title-id="old-other"]').count(),1);
    await page.evaluate(()=>document.getElementById('legacy-title-test').remove());
    // Legacy custom overlay must not remain trapped behind a native dialog.
    await page.evaluate(()=>document.getElementById('profile-image-editor-modal').hidden=false);
    await page.waitForFunction(()=>!document.getElementById('spatial-panel-profile').open);
    assert(await page.locator('#profile-image-editor-modal').isVisible());
    await page.evaluate(()=>document.getElementById('profile-image-editor-modal').hidden=true);
    await page.waitForFunction(()=>document.getElementById('spatial-panel-profile').open);
    await capture('profile-panel',390);await close();
    for(const [key,tab] of [['records','ranking'],['collection','titles']]) {
      await action('home',key).click();
      assert(await page.locator(`[data-home-detail-panel="${tab}"]`).isVisible());await close();
    }
    await page.evaluate(()=>document.querySelector('[data-home-detail-toggle="badges"]').click());
    await page.locator('#spatial-panel-collection[open]').waitFor();
    assert(await page.locator('[data-home-detail-panel="badges"]').isVisible());await close();
    assert.deepEqual(await page.evaluate(()=>spatialDetails),['ranking','titles','badges']);
    assert.equal(await page.locator('#home-view [data-spatial-action="housing"],#home-view [data-spatial-action="items"]').count(),0);
    assert.equal(await page.locator('#home-view [data-home-detail-toggle="items"]').count(),0);
    await show('event-view');await action('event','quests').click();
    assert.equal(await page.locator('#event-quest-toggle').count(),0);
    assert.equal(await page.locator('#spatial-panel-quests .event-card-icon:visible').count(),0);
    await page.locator('[data-quest-claim-id="ready"]').click();
    assert.deepEqual(await page.evaluate(()=>spatialClaims),['ready']);
    assert(await page.locator('[data-quest-claim-id="progress"]').isDisabled());
    assert(await page.locator('#season-event-grid').isHidden());
    for(const width of [1440,390,320]) await capture('quest-panel',width);
    await close();assert.equal(await action('event','rewards').count(),0);
    assert(await page.locator('#event-unclaimed-button').isHidden());
    await page.evaluate(()=>{DJ48EventRender.renderEventSections({quests:[],legacyQuests:[{questId:'past',title:'지난 배움의 선물',claimable:true,current:3,target:3,reward:'10 DJ코인'}]});});
    if(await page.locator('#event-unclaimed-button').isVisible()) {
      await page.locator('#event-unclaimed-button').click();
      for(const width of [1440,390,320]) await capture('reward-dropdown',width);
      await page.keyboard.press('Escape');
      assert(await page.locator('#event-unclaimed-button').evaluate(node=>node===document.activeElement));
    }
    await show('ranking-view');await action('ranking','ranking').click();
    for(const width of [1440,390,320]) await capture('ranking-panel',width);
    await close();await action('ranking','hall').click();assert(await page.locator('#ranking-card-grid').isVisible());
    assert.equal(await page.locator('#ranking-card-grid details').count(),0);
    assert.equal(await page.locator('#ranking-card-grid .ranking-card:visible').count(),3);
    for(const width of [1440,390,320]) await capture('hall-panel',width);
    assert.equal(await page.locator('a[href="/housing/?hall=1"]').count(),0);
    await show('town-view');await page.waitForFunction(()=>!document.querySelector('.spatial-panel[open]'));
    await page.waitForFunction(()=>!document.body.classList.contains('spatial-modal-open'));
    await show('shop-view');
    // Open the free mirror before the iframe is ready: delayed load must honor the requested mode.
    await action('shop','fitting').click();
    await page.evaluate(()=>DJ48ShopRender.renderAvatarMarket());
    const frame=page.frameLocator('#shop-avatar-market iframe');
    await frame.locator('body[data-coordi-mode="dressroom"]').waitFor();
    if(await frame.locator('[data-set-gender="female"]').isVisible()) await frame.locator('[data-set-gender="female"]').click();
    await frame.locator('#coordi-wallet').filter({hasText:'개 보유'}).waitFor();
    await frame.locator('#item-grid button:not([data-item="'+savedHair+'"])').first().click();
    assert(await frame.locator('#coordi-buy').isHidden());assert.equal(purchases,0);
    const count=await page.locator('#shop-avatar-market iframe').count();
    await close();await action('shop','shop').click();
    await frame.locator('body[data-coordi-mode="shop"]').waitFor();
    assert.equal(await page.locator('#shop-avatar-market iframe').count(),count);
    assert(await frame.locator('#outfit-total').innerText()!=='0 DJ코인');
    for(const width of [1440,390,320]) {await capture('shop-panel',width);assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'iframe overflow');}
    await close();
    await page.evaluate(()=>{document.getElementById('shop-avatar-market').inert=true;document.getElementById('shop-entry-status').textContent='상점 이용 설정을 확인하고 있어요…';});
    await action('shop','shop').click();
    assert.equal(await page.locator('#spatial-panel-shop[open]').count(),0);
    assert.match(await page.locator('#shop-view .spatial-scene-hint').innerText(),/설정/);
    await page.evaluate(()=>document.getElementById('shop-avatar-market').inert=false);
    await show('event-view');
    await page.evaluate(()=>DJ48EventRender.renderEventSections({quests:[],seasonEvents:[]}));
    await action('event','quests').click();
    assert(await page.getByText('지금 표시할 퀘스트가 없어요. 다음 도전을 기다려 주세요.').isVisible());
    await capture('quest-empty',390);await close();
    await show('ranking-view');
    await page.evaluate(()=>DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards:[{id:'quizKing',label:'랭킹전',title:'랭킹전 기록',rows:[]}]}));
    await action('ranking','ranking').click();await capture('ranking-empty',390);await close();
    assert.deepEqual(errors,[]);
    console.log('PASS map cleanup: HUD placement/presence counter/news glow-refresh/status dialog and outfit guidance; no duplicate quest toggle/decoration/hall heading/items/housing; five routes; movement cancellation; keyboard/reduced motion; 7 scenes at 1440/390/320; home tabs/profile draft/legacy overlay; real quest claims; ranking boards; delayed real shop iframe free mode and retained preview; panel focus/ESC/view cleanup.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
