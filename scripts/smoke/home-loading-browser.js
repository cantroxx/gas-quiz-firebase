const fs=require('fs'),assert=require('assert/strict');
const {performance}=require('perf_hooks');
const {chromium}=require(process.cwd()+'/node_modules/playwright-core');
const home=require(process.cwd()+'/public/js/application/home-usecases.js');
(async()=>{
 const reads={};let paintedAt=null;const start=performance.now();
 const read=(key,delay)=>()=>{reads[key]=(reads[key]||0)+1;return new Promise(resolve=>setTimeout(()=>resolve(null),delay));};
 const deps={initializeAuthUser:async()=>{},loadFeatureFlags:async()=>({}),homeRepository:{getUserEconomyForRender:read('economy',30),getUserTitleSummary:read('titleSummary',30),getUserLevelSummary:read('levelSummary',30),getUserTitles:read('titles',30),getUserBadges:read('badges',30),getDailyRewardStatus:read('rewardStatus',600)},buildHomeMemberModel:()=>({profile:{},titleCards:[],badgeCards:[]})};
 const options={memberUserId:'synthetic',deferRewardStatus:true};
 await home.renderHomeMemberData({}, {loadHomeMemberData:()=>home.loadHomeMemberData(options,deps),renderProfileCard:()=>paintedAt=Math.round(performance.now()-start),buildTitleCardsForRender:x=>x,getDefaultTitleCards:()=>[],getDefaultBadgeCards:()=>[]});
 await Promise.all([home.loadHomeMemberData(options,deps),home.loadHomeMemberData(options,deps)]);
 assert(paintedAt<590);assert.equal(reads.rewardStatus,3);
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage();await page.setContent('<div id="profile-card-root"></div>');await page.addScriptTag({path:'public/js/features/home-render.js'});
 const render=await page.evaluate(()=>{const model={nickname:'테스트',avatar:'🐰',levelSummary:{level:1,xp:0,nextLevelXp:50,totalXp:0}};const times=[];for(let i=0;i<30;i++){const start=performance.now();DJ48HomeRender.renderProfileCard('profile-card-root',model);document.getElementById('profile-card-root').offsetHeight;times.push(performance.now()-start);}document.querySelector('[data-profile-detail-toggle=nickname]').setAttribute('aria-expanded','true');document.querySelector('[data-profile-detail-panel=nickname]').classList.add('is-active');const input=document.getElementById('profile-nickname-input');input.focus();input.value='작성 중';DJ48HomeRender.renderProfileCard('profile-card-root',model);times.sort((a,b)=>a-b);return{medianMs:times[15],maxMs:times.at(-1),draftSurvives:document.getElementById('profile-nickname-input').value==='작성 중'};});
 assert.equal(render.draftSurvives,true, 'Open nickname draft must survive refresh');
 console.log(JSON.stringify({fixture:'synthetic, not production latency',dataReadDelayMs:30,rewardDelayMs:600,profilePaintAtMs:paintedAt,readsForThreeLoads:reads,unthrottledDesktopRender:render},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
