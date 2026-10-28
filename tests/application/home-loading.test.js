const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm');
const home=require('../../public/js/application/home-usecases.js');
(async()=>{
 let resolveReward;const reward=new Promise(resolve=>resolveReward=resolve);let painted=0,rewards=0,current=true;
 const model=await home.loadHomeMemberData({memberUserId:'a',deferRewardStatus:true},{homeRepository:{getUserEconomyForRender:async()=>null,getUserTitleSummary:async()=>null,getUserTitles:async()=>null,getUserBadges:async()=>null,getDailyRewardStatus:()=>reward},buildHomeMemberModel:data=>({profile:{dailyRewardStatus:data.rewardStatus},titleCards:[],badgeCards:[]})});
 await home.renderHomeMemberData({}, {loadHomeMemberData:async()=>model,isCurrent:()=>current,renderProfileCard:()=>painted++,renderRewardProfile:()=>rewards++,buildTitleCardsForRender:x=>x,getDefaultTitleCards:()=>[],getDefaultBadgeCards:()=>[]});
 assert.equal(painted,1);assert.equal(rewards,0);current=false;resolveReward({coin:{remaining:1}});await model.rewardProfilePromise;await new Promise(setImmediate);assert.equal(rewards,0,'stale reward must not render');
 await home.renderHomeMemberData({}, {loadHomeMemberData:async()=>model,isCurrent:()=>false,renderProfileCard:()=>{throw Error('stale profile rendered')}});
 const html=fs.readFileSync('public/index.html','utf8');const section=html.slice(html.indexOf('    let homeLoadEpoch ='),html.indexOf('    function renderHomeView()'));
 let count=0,member='a',finish;const ctx={Map,Date,console,getFirebaseAuthUser:()=>({uid:'auth'}),window:{DJ48AccountState:{getCurrentMemberUserId:()=>member}},loadHomeMemberDataFromFirestore:()=>{count++;return new Promise(resolve=>finish=resolve)}};vm.createContext(ctx);vm.runInContext(section,ctx);
 const first=ctx.loadHomeMemberDataCached(),second=ctx.loadHomeMemberDataCached();assert.equal(first,second);assert.equal(count,1);finish(model);await first;
 assert.equal(ctx.loadHomeMemberDataCached(),first);member='b';const third=ctx.loadHomeMemberDataCached();assert.equal(count,2);finish(model);await third;
 ctx.invalidateHomeLoading();const fourth=ctx.loadHomeMemberDataCached();assert.equal(count,3);finish(model);await fourth;
 let detail=0,finishDetail;ctx.renderProfileRankingRecordsFromFirestore=()=>{detail++;return new Promise(resolve=>finishDetail=resolve)};
 assert.equal(detail,0);const d1=ctx.loadHomeDetail('ranking'),d2=ctx.loadHomeDetail('ranking');assert.equal(d1,d2);assert.equal(detail,1);finishDetail();await d1;await ctx.loadHomeDetail('ranking');assert.equal(detail,1);
 console.log('PASS home deferred rewards, stale guards, account cache, invalidation and lazy detail coalescing');
})().catch(error=>{console.error(error);process.exitCode=1});
