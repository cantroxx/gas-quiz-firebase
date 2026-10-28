'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const origin='https://admin-refresh.test';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   const relative=url.pathname==='/'?'index.html':url.pathname;
   const candidate=process.env.ADMIN_PUBLIC_ROOT&&path.join(process.env.ADMIN_PUBLIC_ROOT,relative);
   const file=candidate&&fs.existsSync(candidate)?candidate:path.join(process.cwd(),'public',relative);
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
   return route.fulfill({path:file});
  });
  await page.goto(origin);
  for(const file of ['features/admin-render.js','features/admin-controller.js'])await page.addScriptTag({url:origin+'/js/'+file});
  await page.evaluate(()=>{
   window.DJ48AccountState={getCurrentMemberUserId:()=> 'synthetic-admin'};
   window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:()=>async()=>({data:{checkedAt:Date.now(),historyStatus:'complete',items:[{id:'synthetic-reward',title:'함께 책상 정리',active:true,mode:'cooperative',target:10,rewardCoin:5,xpReward:10,participants:8,claimed:4,paidCoin:20,paidXp:35,statsStatus:'complete',createdBy:'합성 교사',createdAt:Date.now()}]}})})};
   document.querySelectorAll('.app-view').forEach(el=>{el.hidden=el.id!=='admin-view';el.classList.toggle('is-active',el.id==='admin-view');});
   window.selectSection=id=>document.querySelectorAll('.admin-section').forEach(el=>el.classList.toggle('is-active',el.id==='admin-section-'+id));
   DJ48AdminController.bindAdminEvents({setActiveAdminSection:selectSection});
   DJ48AdminRender.renderAdminDashboard({adminLevel:'superAdmin',checkedAt:Date.now(),readStatus:{members:'complete',activity:'failed',rewards:'partial'},todayPracticeCount:null,todayRewardCount:1000,activityLabel:'오늘 학습 진행도 갱신 학생',activityNote:'합성 데이터'},DJ48AdminRender);
  });
  await page.addScriptTag({url:origin+'/js/special-rewards.js'});
  assert.equal(await page.locator('.admin-nav-group').count(),5);
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});
   await page.evaluate(()=>selectSection('dashboard'));
   assert((await page.locator('#admin-dashboard-grid').innerText()).includes('조회 실패'));
   await page.locator('.admin-quick-actions [data-admin-special-shortcut]').click();
   await page.getByText('함께 책상 정리',{exact:true}).waitFor();
   assert((await page.locator('#admin-special-rewards').innerText()).includes('실제 지급 20코인 / 35 XP'));
   await page.locator('#admin-special-rewards > summary').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#admin-special-rewards').evaluate(el=>el.open),false);
   await page.keyboard.press('Enter');
   await page.evaluate(()=>selectSection('features'));
   assert((await page.locator('#admin-section-features').innerText()).includes('인기퀴즈는 지급하지'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page overflow '+width);
   await page.evaluate(()=>{
    DJ48AdminRender.renderAdminMemberDetail({profile:{nickname:'합성 학생',grade:4,classNumber:8},memberUserId:'synthetic',purchaseCoupons:7,gameHonors:{stars:3,hearts:4},achievements:{version:'synthetic',records:[{label:'수학',answered:101,perfectRuns:11,subject:true,nextPractice:{titleName:'수학 중수',threshold:300},nextRanking:{titleName:'수학 마스터',threshold:20}}]},titles:[{titleId:'a26_math_practice_100',titleName:'수학 초보'},{titleId:'old',titleName:'과거 타이틀'}]});
    document.getElementById('admin-member-detail-modal').hidden=false;
   });
   const detail=await page.locator('#admin-member-detail-content').innerText();assert(detail.includes('199번'));assert(detail.includes('9판'));assert(!detail.includes('증권'));assert(!detail.includes('과거 타이틀'));
   await page.locator('#admin-member-detail-content details summary').focus();await page.keyboard.press('Enter');
   assert((await page.locator('#admin-member-detail-content').innerText()).includes('과거 타이틀'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'detail overflow '+width);
   await page.evaluate(()=>document.getElementById('admin-member-detail-modal').hidden=true);
   fs.mkdirSync('/tmp/admin-refresh-review',{recursive:true});await page.screenshot({path:`/tmp/admin-refresh-review/admin-${width}.png`,fullPage:true});
  }
  await page.evaluate(()=>{document.querySelectorAll('[data-super-admin-only]').forEach(el=>el.hidden=true);selectSection('dashboard');});
  assert.equal(await page.locator('[data-admin-section-target="permissions"]').first().isVisible(),false);
  assert.equal(await page.locator('.admin-section-tabs [data-admin-section-target="members"]').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('PASS admin browser: 5 groups, shortcuts, keyboard, detail/archive, failed vs zero, special totals, role visibility, 320/390/1440px');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
